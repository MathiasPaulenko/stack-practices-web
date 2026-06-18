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
  - full-text-search
  - java
  - javascript
  - meilisearch
  - postgresql
  - python
  - search
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

Full-text search lets users find documents by relevance rather than exact substring matching. Unlike `LIKE '%query%'`, which scans entire tables, full-text indexes tokenize content and rank results. This recipe covers PostgreSQL `tsvector`, Elasticsearch, and Meilisearch implementations in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Users need to search articles, products, or documents with typo tolerance
- Your app requires ranked results, faceted search, or highlighting
- `LIKE` queries are too slow on tables with >100k rows
- You want search-as-you-type (autocomplete) behavior

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

PostgreSQL `tsvector` is great for simple use cases with no extra infrastructure. Meilisearch offers typo tolerance, faceting, and synonyms out of the box. Elasticsearch is the most powerful but also the most complex to operate.

## Variants

| Engine | Best For | Setup Complexity | Typo Tolerance |
|--------|----------|------------------|----------------|
| PostgreSQL `tsvector` | Simple search on existing PG data | Low | No |
| Meilisearch | Fast setup, modern API | Low | Yes |
| Elasticsearch | Scale, complex aggregations | High | Yes (fuzzy) |
| SQLite FTS5 | Embedded/mobile apps | None | Limited |
| Typesense | Instant search, typo tolerance | Low | Yes |

## Best Practices

- **Use GIN indexes on PostgreSQL**: `to_tsvector` queries without an index are full table scans.
- **Limit searchable fields**: Indexing every column wastes space and degrades relevance.
- **Stem words before indexing**: "running" and "run" should match the same document.
- **Highlight matching terms**: Users need visual confirmation of why a result matched.
- **Monitor index size**: Full-text indexes can grow 2-5x the source data size.

## Common Mistakes

- **Using `LIKE '%term%'` on large tables**: Sequential scans kill performance past 100k rows.
- **Not configuring stop words**: "The" should not influence ranking.
- **Ignoring index refresh latency**: Elasticsearch is near-real-time, not instant.
- **Storing all data in the search engine**: Use search IDs to fetch full records from the database.
- **No query timeout**: A malformed query can hang for minutes on unoptimized indexes.

## Frequently Asked Questions

### Should I use PostgreSQL full-text search or a dedicated engine?

Use PostgreSQL if your data lives in PG, search is secondary, and you don't need typo tolerance or faceting. Use Meilisearch or Elasticsearch for primary search features, high traffic, or complex filtering.

### How do I handle synonyms (e.g., "laptop" = "notebook")?

Meilisearch and Elasticsearch support synonym dictionaries. In PostgreSQL, you can expand queries manually with a synonyms table or use `synonym` dictionaries via `CREATE TEXT SEARCH DICTIONARY`.

### Why are my search results not updating immediately after insertion?

Elasticsearch refreshes indices on a schedule (default 1s). Meilisearch is near-instant. PostgreSQL `tsvector` updates only when you reindex or use a trigger. For real-time, use a `BEFORE INSERT OR UPDATE` trigger that regenerates the `tsvector` column.
