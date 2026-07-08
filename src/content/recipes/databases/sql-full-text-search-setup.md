---
contentType: recipes
slug: sql-full-text-search-setup
title: "Set Up Full-Text Search Indexes"
description: "Configure full-text search indexes in PostgreSQL to query large text columns with ranking, stemming, and highlighting."
metaDescription: "Set up full-text search in PostgreSQL. Learn to create GIN indexes, query tsvector columns, rank results, and highlight matching search terms."
difficulty: intermediate
topics:
  - databases
tags:
  - sql
  - postgresql
  - full-text-search
  - gin
  - tsvector
relatedResources:
  - /guides/full-text-search-guide
  - /recipes/sql-find-duplicate-rows
  - /recipes/sql-index-optimization-analysis
  - /recipes/sql-migration-zero-downtime
  - /recipes/sql-partitioning-strategies
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Set up full-text search in PostgreSQL. Learn to create GIN indexes, query tsvector columns, rank results, and highlight matching search terms."
  keywords:
    - databases
    - sql
    - postgresql
    - full-text-search
    - gin
    - tsvector
---


## Overview

Pattern matching with `LIKE '%word%'` is slow and cannot rank results by relevance. Full-text search transforms text into searchable tokens, indexes them, and lets you query by meaning rather than exact substring. PostgreSQL has a mature full-text search engine built in, so you can add capable search without external services like Elasticsearch for many use cases.

## When to Use

Use this resource when:
- Users need to search long text columns such as articles, tickets, or product descriptions.
- `LIKE` queries are too slow or return too many irrelevant matches.
- You want to rank results by relevance and highlight matching terms.
- You need stemming, stop-word handling, and language-specific dictionaries.

## Solution

### Full-text search in PostgreSQL

```sql
-- Add a generated tsvector column
ALTER TABLE articles
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || body)) STORED;

-- Create a GIN index for fast search
CREATE INDEX idx_articles_search
ON articles USING GIN (search_vector);

-- Search and rank results
SELECT id, title, ts_rank_cd(search_vector, query) AS rank
FROM articles, plainto_tsquery('english', 'database indexing') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

### Search with highlighting and snippets

```sql
-- Return highlighted snippets of matching text
SELECT
  id,
  title,
  ts_headline('english', body, query, 'MaxWords=35, MinWords=15') AS snippet,
  ts_rank_cd(search_vector, query) AS rank
FROM articles, plainto_tsquery('english', 'database indexing') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;
```

### Weighted search across multiple columns

```sql
-- Weight title matches higher than body matches
ALTER TABLE articles
ADD COLUMN search_vector_weighted tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(body, '')), 'B')
) STORED;

CREATE INDEX idx_articles_search_weighted
ON articles USING GIN (search_vector_weighted);

-- Title matches rank higher than body matches
SELECT id, title,
  ts_rank_cd(search_vector_weighted, query) AS rank
FROM articles, plainto_tsquery('english', 'database indexing') query
WHERE search_vector_weighted @@ query
ORDER BY rank DESC;
```

### Phrase and proximity search

```sql
-- Exact phrase match
SELECT id, title
FROM articles, phraseto_tsquery('english', 'database indexing') query
WHERE search_vector @@ query;

-- Proximity: words within 3 positions of each other
SELECT id, title
FROM articles, to_tsquery('english', 'database <-> indexing') query
WHERE search_vector @@ query;

-- Words within N positions: <N> operator
SELECT id, title
FROM articles, to_tsquery('english', 'database <3> indexing') query
WHERE search_vector @@ query;
```

### Fuzzy search with trigrams

```sql
-- Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a trigram index for fuzzy matching
CREATE INDEX idx_articles_title_trgm
ON articles USING GIN (title gin_trgm_ops);

-- Fuzzy search: finds titles similar to 'databse indexing'
SELECT id, title, similarity(title, 'databse indexing') AS sim
FROM articles
WHERE title % 'databse indexing'
ORDER BY sim DESC
LIMIT 10;
```

### Combined full-text and trigram search

```sql
-- Full-text for meaning + trigram for typos
SELECT a.id, a.title,
  ts_rank_cd(a.search_vector, ftq) AS text_rank,
  similarity(a.title, 'databse indexing') AS trigram_rank
FROM articles a,
  plainto_tsquery('english', 'database indexing') ftq
WHERE a.search_vector @@ ftq
   OR a.title % 'databse indexing'
ORDER BY (text_rank + trigram_rank) DESC
LIMIT 20;
```

### Multi-language search

```sql
-- Create tsvector with language from a column
ALTER TABLE articles
ADD COLUMN search_vector_multi tsvector
GENERATED ALWAYS AS (
  to_tsvector(coalesce(language, 'english'), title || ' ' || body)
) STORED;

CREATE INDEX idx_articles_search_multi
ON articles USING GIN (search_vector_multi);

-- Search in the appropriate language
SELECT id, title
FROM articles, plainto_tsquery('spanish', 'base de datos') query
WHERE search_vector_multi @@ query
ORDER BY ts_rank_cd(search_vector_multi, query) DESC;
```

## Explanation

The `to_tsvector` function parses text into a list of normalized tokens called lexemes, removing stop words and applying stemming. The `@@` operator checks whether the query matches the document. A GIN index on the `tsvector` column makes the search fast even on millions of rows. `ts_rank_cd` returns a relevance score that can be used for ordering. The generated column is automatically updated whenever the underlying text changes, so the index stays in sync without application logic.

### How ranking works

`ts_rank_cd` calculates cover density: how close the matching lexemes are to each other in the document. Higher density means a more relevant match. The `setweight` function assigns priority labels (A, B, C, D) to different parts of the document, so title matches outrank body matches.

### GIN vs GiST indexes

| Index type | Build speed | Search speed | Update speed | Use case |
|-----------|-------------|--------------|--------------|----------|
| GIN | Slow | Fast | Slow | Static or read-heavy data |
| GiST | Fast | Moderate | Fast | Frequently updated data |

## Variants

| Approach | Index | Use case |
|----------|-------|----------|
| Generated column + GIN | GIN | General purpose, auto-updated |
| Expression index on to_tsvector | GIN | No extra column, but larger index |
| Trigram index | GIN | Fuzzy search, `LIKE` patterns |
| Weighted columns | GIN | Title vs body relevance |
| External | Elasticsearch | Complex faceting, distributed search |

## What Works

1. **Use the right text search configuration.** PostgreSQL supports multiple dictionaries; choose one matching your content language.
2. **Index the tsvector, not the raw text.** GIN on `tsvector` is far more efficient than scanning text.
3. **Combine full-text search with filters.** Add `WHERE status = 'published'` to reduce the index scan scope.
4. **Limit ranking to top-N results.** Computing rank for every match is expensive; use pagination.
5. **Monitor index size.** GIN indexes can grow large; consider partial indexes for active data only.
6. **Use weighted columns for relevance.** Title matches should rank higher than body matches.
7. **Add trigram indexes for typo tolerance.** Full-text search does not handle misspellings; trigrams do.

## Common Mistakes

1. **Searching raw text with `LIKE` after adding full-text search.** Migrate queries to use `tsvector` and `@@`.
2. **Forgetting to update the tsvector column.** If you use a manual column, triggers or application logic must keep it current.
3. **Wrong language configuration.** English stemming will not work well for Spanish text and vice versa.
4. **Not handling typos or prefixes.** Standard full-text search does not match partial words; use trigrams for that.
5. **Overloading the database.** For very large or highly concurrent search, consider a dedicated search engine.
6. **Using `plainto_tsquery` for complex queries.** Use `to_tsquery` for boolean operators (`&`, `|`, `!`) and `phraseto_tsquery` for phrases.
7. **Ignoring `ts_headline` performance.** Generating snippets is expensive; only use it for the final paginated results, not for the full result set.

## Frequently Asked Questions

**Q: Can I search across multiple columns?**
A: Yes. Combine columns into a single `tsvector` with `to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))`.

**Q: How do I highlight matching terms in results?**
A: Use `ts_headline` to return snippets with matching terms highlighted. Use `MaxWords` and `MinWords` parameters to control snippet length.

**Q: Does full-text search support phrase matching?**
A: Yes. Use `phraseto_tsquery` or the `<->` follow-by operator in `to_tsquery` for exact phrase search. Use `<N>` for proximity within N positions.

**Q: How is full-text search different from LIKE?**
A: `LIKE '%word%'` scans every row and matches exact substrings. Full-text search tokenizes text, applies stemming, removes stop words, and uses an index for fast lookup. It also ranks results by relevance.

**Q: Can I use full-text search with JSONB columns?**
A: Yes. Extract text from JSONB and convert to tsvector: `to_tsvector('english', jsonb_path_query_first(data, '$.description')::text)`.

**Q: How do I handle search in multiple languages?**
A: Store the language per row and use it in `to_tsvector`: `to_tsvector(coalesce(language, 'english'), text)`. Each row gets stemmed with the appropriate dictionary.

**Q: What is the difference between ts_rank and ts_rank_cd?**
A: `ts_rank` uses match count and position. `ts_rank_cd` uses cover density, which measures how close matching terms are to each other. Cover density generally produces better relevance ordering.

**Q: How do I debug why a search query returns no results?**
A: Compare the tsvector and tsquery to see if lexemes match: `SELECT to_tsvector('english', 'your text'), plainto_tsquery('english', 'your query')`. If the lexemes do not overlap, there will be no match.

## Performance Tips

1. **Use `LIMIT` with ranking.** Computing `ts_rank_cd` for every match is expensive. Always paginate:

```sql
SELECT id, title, ts_rank_cd(search_vector, query) AS rank
FROM articles, plainto_tsquery('english', 'database indexing') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20 OFFSET 0;
```

2. **Combine with GIN fast update.** Enable `fastupdate` for frequently updated tables:

```sql
CREATE INDEX idx_articles_search
ON articles USING GIN (search_vector) WITH (fastupdate = true);
```

3. **Use partial indexes for published content only.** If you only search published articles:

```sql
CREATE INDEX idx_articles_published_search
ON articles USING GIN (search_vector)
WHERE status = 'published';
```

4. **Monitor index bloat.** GIN indexes can accumulate dead entries:

```sql
SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexname::regclass))
FROM pg_indexes
WHERE indexname LIKE '%search%';
```

5. **Consider `rum` index for faster ranking.** The RUM extension stores ranking information in the index itself, avoiding the need to fetch and rank documents separately:

```sql
CREATE EXTENSION rum;
CREATE INDEX idx_articles_rum
ON articles USING rum (search_vector);
```

6. **Benchmark with realistic data.** Full-text search performance depends heavily on document size, query complexity, and result set size. Test with production-like data volumes to get accurate performance numbers.

7. **Use connection pooling.** Full-text search queries can be CPU-intensive. Use PgBouncer or a similar pooler to manage connections and avoid exhausting database resources under high concurrency.

8. **Monitor slow queries.** Log queries that take longer than 100ms and analyze their execution plans. Common causes include missing indexes, overly broad queries, or `ts_headline` on large result sets.

9. **Use `pg_trgm` alongside full-text search.** Trigram indexes complement full-text search by handling typos and partial matches that `to_tsvector` cannot find. Combine both for maximum search coverage.

10. **Regularly `ANALYZE` the search table.** The query planner needs accurate statistics to choose between GIN index scans and sequential scans. Run `ANALYZE articles;` after bulk data loads or significant data changes.

## Advanced Techniques

### Custom text search configurations

Create a custom configuration for domain-specific terminology:

```sql
-- Create a custom configuration based on English
CREATE TEXT SEARCH CONFIGURATION my_config (COPY = english);

-- Add a custom dictionary for technical terms
CREATE TEXT SEARCH DICTIONARY my_dict (
  TEMPLATE = simple,
  STOPWORDS = english
);

-- Add synonyms for technical terms
ALTER TEXT SEARCH CONFIGURATION my_config
  ALTER MAPPING FOR asciiword, asciihword
  WITH my_dict, english_stem;
```

### Search with faceting and filters

Combine full-text search with category filtering:

```sql
-- Search within specific categories
SELECT a.id, a.title, a.category,
  ts_rank_cd(a.search_vector, query) AS rank
FROM articles a,
  plainto_tsquery('english', 'database indexing') query
WHERE a.search_vector @@ query
  AND a.category IN ('engineering', 'data-science')
  AND a.status = 'published'
ORDER BY rank DESC
LIMIT 20;
```

### Incremental search updates with triggers

For tables that require immediate search index updates:

```sql
-- Create a function to update search_vector
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', NEW.title || ' ' || NEW.body);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updates
CREATE TRIGGER trigger_update_search_vector
BEFORE INSERT OR UPDATE ON articles
FOR EACH ROW
EXECUTE FUNCTION update_search_vector();
```

### Search with result aggregation

Group search results by category or other attributes:

```sql
-- Count matches per category
SELECT a.category, COUNT(*) AS match_count
FROM articles a,
  plainto_tsquery('english', 'database') query
WHERE a.search_vector @@ query
GROUP BY a.category
ORDER BY match_count DESC;
```

### Autocomplete and prefix search

Use trigram indexes for autocomplete functionality:

```sql
-- Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram index on title
CREATE INDEX idx_articles_title_autocomplete
ON articles USING GIN (title gin_trgm_ops);

-- Autocomplete query
SELECT title
FROM articles
WHERE title LIKE 'data%'
ORDER BY similarity(title, 'data') DESC
LIMIT 10;
```

### Search result caching

Cache frequent search queries to reduce load:

```sql
-- Create a materialized view for popular searches
CREATE MATERIALIZED VIEW popular_search_results AS
SELECT a.id, a.title,
  ts_rank_cd(a.search_vector, query) AS rank
FROM articles a,
  plainto_tsquery('english', 'database') query
WHERE a.search_vector @@ query
ORDER BY rank DESC
LIMIT 100;

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY popular_search_results;
```
