---
contentType: recipes
slug: database-indexing
title: "Optimize Queries with Database Indexing"
description: "How to create, analyze, and maintain indexes to speed up database queries and avoid common indexing mistakes."
metaDescription: "Learn database indexing strategies. Create B-tree and composite indexes, analyze query plans, and optimize SELECT performance in PostgreSQL, MySQL, and SQL Server."
difficulty: intermediate
topics:
  - performance
tags:
  - performance
  - database
  - indexing
relatedResources:
  - /recipes/sql-joins
  - /recipes/database-views-materialized
  - /recipes/connection-pooling
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn database indexing strategies. Create B-tree and composite indexes, analyze query plans, and optimize SELECT performance in PostgreSQL, MySQL, and SQL Server."
  keywords:
    - database indexing
    - query optimization
    - btree index
    - composite index
    - explain analyze
    - sql performance
    - postgresql indexing
    - mysql indexing
---

## Overview

Database indexes are data structures that speed up read operations by providing fast pathways to rows without scanning entire tables. Without proper indexes, even simple `WHERE` clauses force the database to examine every row sequentially — a full table scan that becomes unbearably slow as data grows.

However, indexes are not free. Every write (`INSERT`, `UPDATE`, `DELETE`) must update all relevant indexes, and each index consumes disk space and memory. The goal is to create the right indexes for your read patterns while minimizing overhead on writes.

## When to Use

Use this recipe when:

- Queries are slowing down as table size grows
- Analyzing slow query logs or execution plans reveals sequential scans
- Adding pagination or search filters to an existing table
- Designing a new schema and predicting access patterns
- Troubleshooting lock contention caused by long-running reads

## Solution

### Basic Index (Single Column)

```sql
-- Create an index on the email column
CREATE INDEX idx_users_email ON users(email);

-- Query now uses the index instead of scanning the entire table
SELECT * FROM users WHERE email = 'alice@example.com';
```

### Composite Index (Multiple Columns)

```sql
-- Column order matters: equality filters first, range filters second
CREATE INDEX idx_orders_user_created
ON orders(user_id, created_at DESC);

-- Supports:
-- WHERE user_id = 1
-- WHERE user_id = 1 AND created_at > '2025-01-01'
-- ORDER BY user_id, created_at DESC
```

### Partial Index

```sql
-- Only index active users — smaller and faster for this specific query
CREATE INDEX idx_active_users_email
ON users(email)
WHERE active = true;
```

### Analyzing Query Plans

```sql
-- PostgreSQL
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE user_id = 42
ORDER BY created_at DESC
LIMIT 10;
```

Look for:
- `Seq Scan` = sequential table scan (slow on large tables, needs an index)
- `Index Scan` or `Index Only Scan` = using an index (fast)
- `Bitmap Heap Scan` = using multiple indexes or a partial match

## Explanation

- **B-tree indexes**: The default index type. Excellent for equality and range queries (`=`, `<`, `>`, `BETWEEN`). Most databases use B-tree for primary keys automatically.
- **Composite indexes**: The database can use the index for any prefix of the column list. An index on `(a, b, c)` supports queries on `(a)`, `(a, b)`, and `(a, b, c)`, but not `(b)` or `(c)` alone.
- **Covering indexes**: If all columns a query needs are in the index, the database can answer the query without touching the table. This is called an "index-only scan" and is dramatically faster.
- **Partial indexes**: Smaller indexes that only cover a subset of rows. Useful for tables where most queries filter on a specific condition (e.g., `active = true`).

## Variants

| Index Type | Best For | Trade-off |
|------------|----------|-----------|
| B-tree | Equality, range, ordering | General purpose, higher write cost |
| Hash | Exact equality only | Faster lookups, no range support |
| GiST / GIN | Full-text search, JSON, arrays | Larger, slower to build |
| BRIN | Very large, naturally ordered tables | Tiny size, approximate results |

## Best Practices

- **Index the columns in your WHERE clause**: if a query filters on `user_id` and `status`, an index on `(user_id, status)` is the first thing to try.
- **Put equality columns before range columns**: in `(a, b)` where `a = 1` and `b > 100`, the index on `(a, b)` is far more effective than `(b, a)`.
- **Avoid indexing low-cardinality columns alone**: a `status` column with only 3 values (active, pending, archived) does not benefit from a standalone index. Combine it with a high-cardinality column.
- **Remove unused indexes**: every index slows down writes. Monitor index usage statistics and drop indexes that are never scanned.
- **Index foreign key columns**: databases do not always auto-index foreign keys. Missing indexes on `JOIN` columns cause expensive nested loop scans.

## Common Mistakes

- **Indexing every column**: this wastes disk space, slows writes dramatically, and confuses the query optimizer with too many choices.
- **Wrong column order in composite indexes**: an index on `(created_at, user_id)` cannot help a query that filters only on `user_id`.
- **Indexing columns that are never queried**: check your query logs before creating indexes.
- **Ignoring index maintenance**: fragmented indexes on high-churn tables degrade over time. Schedule `REINDEX` or `OPTIMIZE TABLE` periodically.
- **Using indexes on tiny tables**: tables with fewer than a few thousand rows are often faster with sequential scans because reading the index and then the table is more overhead than a full scan.

## Frequently Asked Questions

**Q: How many indexes should a table have?**
A: There is no universal rule, but a good heuristic is 3-5 indexes for tables under 1 million rows, and 5-10 for larger tables. More than that usually indicates redundant or unused indexes.

**Q: Do indexes slow down INSERT and UPDATE?**
A: Yes. Every index on a table adds write overhead because the database must update the index tree. Measure write throughput before and after adding indexes on write-heavy tables.

**Q: Can I index JSON or array columns?**
A: Yes. PostgreSQL supports GIN indexes for JSONB arrays and full-text search. MySQL 8+ supports multi-valued indexes for JSON arrays. These are specialized and should be used only when needed.

**Q: Should I use a UNIQUE index or a regular index?**
A: Use `UNIQUE` when the column combination must be unique (like `email`). It is both a constraint and an index. Do not add a regular index on top of a unique one — it is redundant.

