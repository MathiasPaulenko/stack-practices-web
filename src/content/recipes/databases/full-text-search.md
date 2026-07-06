---
contentType: recipes
slug: full-text-search
title: "Full-Text Search"
description: "How to implement full-text search with Elasticsearch, Meilisearch, and PostgreSQL."
metaDescription: "Learn to implement full-text search in Python, JavaScript, and Java. Covers Elasticsearch, Meilisearch, and PostgreSQL tsvector."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - elasticsearch
  - databases
  - sql
  - postgresql
relatedResources:
  - /recipes/database-transactions
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
  - /patterns/builder-pattern
  - /patterns/command-pattern
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn to implement full-text search in Python, JavaScript, and Java. Covers Elasticsearch, Meilisearch, and PostgreSQL tsvector."
  keywords:
    - full-text-search
    - elasticsearch
    - meilisearch
    - postgresql
    - search
    - python
    - javascript
    - java
---
## Overview

Full-text search lets users find documents by relevance rather than exact substring matching. Unlike `LIKE '%query%'`, which scans entire tables, full-text indexes tokenize content and rank results. The solution below covers PostgreSQL `tsvector`, Elasticsearch, and Meilisearch implementations in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Users need to search articles, products, or documents with typo tolerance. See [Parse JSON](/recipes/data/parse-json) for document indexing.
- Your app requires ranked results, faceted search, or highlighting
- `LIKE` queries are too slow on tables with >100k rows. See [Query Optimization](/recipes/databases/postgres-query-optimization) for index tuning.
- You want search-as-you-type (autocomplete) behavior. See [Input Validation](/recipes/api/input-validation) for query sanitization.

## Solution

### Python (PostgreSQL + SQLAlchemy)

```python
from sqlalchemy import create_engine, Column, Integer, String, Text, func
from sqlalchemy.orm import declarative_base, Session

Base = declarative_base()

class Article(Base):
    __tablename__ = "articles"
    id = Column(Integer, primary_key=True)
    title = Column(String)
    content = Column(Text)

engine = create_engine("postgresql://user:pass@localhost/db")

# Create GIN index for tsvector
with engine.connect() as conn:
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_articles_search
        ON articles USING GIN (to_tsvector('english', title || ' ' || content));
    """)

def search(query: str):
    with Session(engine) as session:
        tsquery = func.plainto_tsquery("english", query)
        return session.query(Article).filter(
            func.to_tsvector("english", Article.title + " " + Article.content)
            .op("@@")(tsquery)
        ).all()
```

### JavaScript (Meilisearch)

```javascript
const { MeiliSearch } = require("meilisearch");

const client = new MeiliSearch({ host: "http://localhost:7700", apiKey: "masterKey" });
const index = client.index("articles");

async function setup() {
  await index.updateSettings({
    searchableAttributes: ["title", "content"],
    rankingRules: [
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness",
    ],
  });
}

async function search(query) {
  return await index.search(query, {
    attributesToHighlight: ["title", "content"],
    limit: 20,
  });
}

setup();
search("distributed systems").then(console.log);
```

### Java (Elasticsearch + RestHighLevelClient)

```java
import org.elasticsearch.action.search.SearchRequest;
import org.elasticsearch.action.search.SearchResponse;
import org.elasticsearch.client.RequestOptions;
import org.elasticsearch.client.RestHighLevelClient;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.search.builder.SearchSourceBuilder;

import java.io.IOException;

public class ArticleSearch {
    private final RestHighLevelClient client;

    public ArticleSearch(RestHighLevelClient client) {
        this.client = client;
    }

    public SearchResponse search(String query) throws IOException {
        SearchSourceBuilder source = SearchSourceBuilder.searchSource()
            .query(QueryBuilders.multiMatchQuery(query, "title", "content"))
            .size(20);

        SearchRequest request = new SearchRequest("articles").source(source);
        return client.search(request, RequestOptions.DEFAULT);
    }
}
```

## Explanation

Full-text search works in three stages:

1. **Tokenization**: Text is split into words, normalized (lowercased, stemmed), and stop words ("the", "and") are removed.
2. **Indexing**: Tokens are stored in an inverted index mapping each term to the documents containing it.
3. **Querying**: The search query is tokenized the same way, and the index is queried for matching documents, ranked by relevance algorithms.

PostgreSQL `tsvector` is great for simple use cases with no extra infrastructure. Meilisearch offers typo tolerance, faceting, and synonyms out of the box. Elasticsearch is the most capable but also the most complex to operate.

## Variants

| Engine | Best For | Setup Complexity | Typo Tolerance |
|--------|----------|------------------|----------------|
| PostgreSQL `tsvector` | Simple search on existing PG data | Low | No |
| Meilisearch | Fast setup, modern API | Low | Yes |
| Elasticsearch | Scale, complex aggregations | High | Yes (fuzzy) |
| SQLite FTS5 | Embedded/mobile apps | None | Limited |
| Typesense | Instant search, typo tolerance | Low | Yes |

## What Works

- **Use GIN indexes on PostgreSQL**: `to_tsvector` queries without an index are full table scans. See [Query Optimization](/recipes/databases/postgres-query-optimization) for indexing.
- **Limit searchable fields**: Indexing every column wastes space and degrades relevance.
- **Stem words before indexing**: "running" and "run" should match the same document.
- **Highlight matching terms**: Users need visual confirmation of why a result matched.
- **Monitor index size**: Full-text indexes can grow 2-5x the source data size.

## Common Mistakes

- **Using `LIKE '%term%'` on large tables**: Sequential scans kill performance past 100k rows.
- **Not configuring stop words**: "The" should not influence ranking.
- **Ignoring index refresh latency**: Elasticsearch is near-real-time, not instant.
- **Storing all data in the search engine**: Use search IDs to fetch full records from the database. See [Data Validation](/recipes/data/data-validation) for data integrity.
- **No query timeout**: A malformed query can hang for minutes on unoptimized indexes.

## Frequently Asked Questions

### Should I use PostgreSQL full-text search or a dedicated engine?

Use PostgreSQL if your data lives in PG, search is secondary, and you don't need typo tolerance or faceting. Use Meilisearch or Elasticsearch for primary search capabilities, high traffic, or complex filtering.

### How do I handle synonyms (e.g., "laptop" = "notebook")?

Meilisearch and Elasticsearch support synonym dictionaries. In PostgreSQL, you can expand queries manually with a synonyms table or use `synonym` dictionaries via `CREATE TEXT SEARCH DICTIONARY`.

### Why are my search results not updating immediately after insertion?

Elasticsearch refreshes indices on a schedule (default 1s). Meilisearch is near-instant. PostgreSQL `tsvector` updates only when you reindex or use a trigger. For real-time, use a `BEFORE INSERT OR UPDATE` trigger that regenerates the `tsvector` column.

### PostgreSQL Ranking with `ts_rank` and `ts_rank_cd`

```sql
SELECT
    title,
    ts_rank_cd(
        to_tsvector('english', title || ' ' || content),
        plainto_tsquery('english', 'database optimization')
    ) AS rank
FROM articles
WHERE to_tsvector('english', title || ' ' || content)
      @@ plainto_tsquery('english', 'database optimization')
ORDER BY rank DESC
LIMIT 20;
```

`ts_rank` calculates relevance based on term frequency. `ts_rank_cd` uses cover density, which measures how close matching terms are to each other. Cover density is usually better for short documents.

### Trigram Search for Typo Tolerance in PostgreSQL

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index for fast trigram similarity
CREATE INDEX idx_articles_title_trgm
ON articles USING GIN (title gin_trgm_ops);

-- Fuzzy match with similarity threshold
SELECT title, similarity(title, 'datbase optimiztion') AS sim
FROM articles
WHERE title % 'datbase optimiztion'
ORDER BY sim DESC
LIMIT 10;

-- Set similarity threshold (0.0 to 1.0)
SET pg_trgm.similarity_threshold = 0.3;
```

### Elasticsearch Fuzzy and Bool Queries

```json
GET /articles/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "database optimization",
            "fields": ["title^2", "content"],
            "fuzziness": "AUTO",
            "prefix_length": 2
          }
        }
      ],
      "filter": [
        { "term": { "status": "published" } },
        { "range": { "published_at": { "gte": "2024-01-01" } } }
      ]
    }
  },
  "highlight": {
    "fields": {
      "title": { "number_of_fragments": 0 },
      "content": { "fragment_size": 150, "number_of_fragments": 3 }
    }
  }
}
```

### PostgreSQL Search Trigger for Real-Time Updates

```sql
-- Add a generated tsvector column
ALTER TABLE articles
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || content)) STORED;

-- GIN index on the generated column
CREATE INDEX idx_articles_search_vector
ON articles USING GIN (search_vector);

-- Query using the generated column
SELECT title, ts_rank(search_vector, query) AS rank
FROM articles, plainto_tsquery('english', 'postgres indexing') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

### Meilisearch Faceted Search

```javascript
async function searchWithFacets(query, filters = {}) {
  return await index.search(query, {
    attributesToHighlight: ['title', 'content'],
    attributesToCrop: ['content'],
    cropLength: 50,
    limit: 20,
    filter: `status = "published" AND category = "${filters.category || ''}"`,
    facets: ['category', 'author', 'tags'],
  });
}
```

### Synonym Configuration

```sql
-- PostgreSQL: create a synonym dictionary
CREATE TEXT SEARCH DICTIONARY my_syn (
    TEMPLATE = synonym,
    SYNONYMS = 'my_synonyms'
);

-- File: $SHAREDIR/tsearch_data/my_synonyms.syn
-- laptop notebook
-- mobile phone smartphone

-- Use in a text search configuration
ALTER TEXT SEARCH CONFIGURATION english
ALTER MAPPING FOR word WITH my_syn;
```

```javascript
// Meilisearch: configure synonyms
await index.updateSettings({
  synonyms: {
    laptop: ['notebook'],
    notebook: ['laptop'],
    mobile: ['phone', 'smartphone'],
  },
});
```

## Additional Best Practices

6. **Use `phrase` queries for exact matches.** In PostgreSQL, `phraseto_tsquery` enforces word order:

```sql
SELECT * FROM articles
WHERE to_tsvector('english', content) @@ phraseto_tsquery('english', 'database optimization');
```

7. **Set `max_parallel_workers_per_gather` for large indexes.** Parallel index scans speed up full-text queries on large tables:

```sql
SET max_parallel_workers_per_gather = 4;
```

8. **Use `copy_to` for bulk indexing in Elasticsearch.** Instead of individual document indexing, use the bulk API:

```json
POST /_bulk
{"index": {"_index": "articles", "_id": "1"}}
{"title": "PostgreSQL Guide", "content": "..."}
{"index": {"_index": "articles", "_id": "2"}}
{"title": "MySQL Tuning", "content": "..."}
```

9. **Configure `search_path` for PostgreSQL text search configs.** Use the correct language config for your content:

```sql
-- For Spanish content
SELECT * FROM articles
WHERE to_tsvector('spanish', content) @@ plainto_tsquery('spanish', 'base de datos');
```

10. **Monitor index memory usage.** Elasticsearch stores fielddata in memory. Monitor with `_stats/fielddata`:

```json
GET /_nodes/stats/indices/fielddata
```

## Additional Common Mistakes

6. **Not setting `analyzer` per field.** Using the standard analyzer for code snippets or URLs produces poor results. Configure custom analyzers with appropriate tokenizers.

7. **Indexing HTML without stripping tags.** Use `html_strip` mapping or strip tags before indexing:

```json
"content": {
  "type": "text",
  "analyzer": "standard",
  "fields": {
    "stripped": {
      "type": "text",
      "analyzer": "html_strip_analyzer"
    }
  }
}
```

8. **Not using `copy_to` for multi-field search.** Instead of querying each field separately, copy fields into a combined field:

```json
"mappings": {
  "properties": {
    "all_text": { "type": "text" },
    "title": { "type": "text", "copy_to": "all_text" },
    "content": { "type": "text", "copy_to": "all_text" }
  }
}
```

9. **Ignoring `search_analyzer` vs `index_analyzer`.** Use different analyzers for indexing (e.g., stemming) and searching (e.g., no stemming for exact prefix matches).

10. **Not benchmarking with production data.** Search performance on 1,000 documents differs from 1M documents. Always test with realistic data volumes.

## Additional FAQ

### How do I implement autocomplete/search-as-you-type?

In PostgreSQL, use trigram indexes with `LIKE` prefix matching:

```sql
SELECT title FROM articles
WHERE title LIKE 'postg%'
ORDER BY title
LIMIT 5;
```

In Elasticsearch, use the `search_as_you_type` field type or edge n-grams:

```json
"title_suggest": {
  "type": "search_as_you_type"
}
```

In Meilisearch, autocomplete is built-in — no configuration needed.

### How do I handle multi-language search?

PostgreSQL supports per-language configs: `to_tsvector('spanish', content)`. Elasticsearch supports multi-field analyzers with different language analyzers. Meilisearch detects language automatically. Store the language per document and use the appropriate analyzer at query time.

### What is the difference between `match` and `term` in Elasticsearch?

`match` analyzes the query string (tokenizes, lowercases) before searching. `term` searches for the exact value without analysis. Use `term` for `keyword` fields, enums, and IDs. Use `match` for full-text fields.

## Performance Tips

1. **Use `size: 0` when you only need aggregations.** This skips fetching document hits, reducing response size and memory usage.

2. **Set `timeout` on search queries.** Prevent long-running queries from blocking:

```json
GET /articles/_search
{
  "timeout": "5s",
  "query": { "match_all": {} }
}
```

3. **Use `preference` for consistent shard routing.** Route repeated queries from the same user to the same shards for better cache utilization:

```json
GET /articles/_search?preference=user_123
```

4. **Monitor `pg_stat_statements` for slow search queries.** Identify full-text queries that need optimization:

```sql
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%to_tsvector%'
ORDER BY mean_exec_time DESC;
```

5. **Use `index_options` to control posting list behavior.** For fields that need phrase queries, set `index_options: "positions"`:

```json
"content": {
  "type": "text",
  "index_options": "positions"
}
```
