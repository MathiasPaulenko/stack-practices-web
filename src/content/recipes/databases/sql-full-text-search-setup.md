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

## Explanation

The `to_tsvector` function parses text into a list of normalized tokens called lexemes, removing stop words and applying stemming. The `@@` operator checks whether the query matches the document. A GIN index on the `tsvector` column makes the search fast even on millions of rows. `ts_rank_cd` returns a relevance score that can be used for ordering. The generated column is automatically updated whenever the underlying text changes, so the index stays in sync without application logic.

## Variants

| Approach | Index | Use case |
|----------|-------|----------|
| Generated column + GIN | GIN | General purpose, auto-updated |
| Expression index on to_tsvector | GIN | No extra column, but larger index |
| Trigram index | GIN | Fuzzy search, `LIKE` patterns |
| External | Elasticsearch | Complex faceting, distributed search |

## What Works

1. **Use the right text search configuration.** PostgreSQL supports multiple dictionaries; choose one matching your content language.
2. **Index the tsvector, not the raw text.** GIN on `tsvector` is far more efficient than scanning text.
3. **Combine full-text search with filters.** Add `WHERE status = 'published'` to reduce the index scan scope.
4. **Limit ranking to top-N results.** Computing rank for every match is expensive; use pagination.
5. **Monitor index size.** GIN indexes can grow large; consider partial indexes for active data only.

## Common Mistakes

1. **Searching raw text with `LIKE` after adding full-text search.** Migrate queries to use `tsvector` and `@@`.
2. **Forgetting to update the tsvector column.** If you use a manual column, triggers or application logic must keep it current.
3. **Wrong language configuration.** English stemming will not work well for Spanish text and vice versa.
4. **Not handling typos or prefixes.** Standard full-text search does not match partial words; use trigrams for that.
5. **Overloading the database.** For very large or highly concurrent search, consider a dedicated search engine.

## Frequently Asked Questions

**Q: Can I search across multiple columns?**
A: Yes. Combine columns into a single `tsvector` with `to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))`.

**Q: How do I highlight matching terms in results?**
A: Use `ts_headline` to return snippets with matching terms highlighted.

**Q: Does full-text search support phrase matching?**
A: Yes. Use `phraseto_tsquery` or the `<->` follow-by operator in `to_tsquery` for exact phrase search.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
