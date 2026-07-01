---
contentType: recipes
slug: sql-index-optimization-analysis
title: "Analyze and Optimize SQL Indexes with EXPLAIN"
description: "Identify missing, unused, and inefficient indexes by reading execution plans and measuring query cost with EXPLAIN."
metaDescription: "Optimize SQL indexes using EXPLAIN and execution plans. Learn to identify missing indexes, slow sequential scans, and query bottlenecks."
difficulty: intermediate
topics:
  - databases
tags:
  - sql
  - postgresql
  - indexes
  - explain
  - performance
relatedResources:
  - /guides/read-replica-guide
  - /guides/sql-performance-tuning-guide
  - /recipes/postgres-query-optimization
  - /recipes/sql-find-duplicate-rows
  - /recipes/sql-recursive-cte-query
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Optimize SQL indexes using EXPLAIN and execution plans. Learn to identify missing indexes, slow sequential scans, and query bottlenecks."
  keywords:
    - databases
    - sql
    - postgresql
    - indexes
    - explain
    - performance
    - /guides/read-replica-guide
    - /guides/sql-performance-tuning-guide
    - /recipes/postgres-query-optimization
    - /recipes/sql-find-duplicate-rows
    - /recipes/sql-recursive-cte-query
    - databases
    - sql
    - postgresql
    - indexes
    - explain
    - performance
    - /guides/read-replica-guide
    - /guides/sql-performance-tuning-guide
    - /recipes/postgres-query-optimization
    - /recipes/sql-find-duplicate-rows
    - /recipes/sql-recursive-cte-query
    - sql
    - postgresql
    - indexes
    - explain
    - performance
---


## Overview

Indexes are the primary tool for making SQL queries fast, but adding them blindly can waste space, slow writes, and even make queries slower. The right approach is to start with the execution plan. `EXPLAIN` and `EXPLAIN ANALYZE` reveal whether the database is scanning the whole table or using an index, and they estimate the cost of each step so you can target the biggest bottlenecks first.

## When to Use

Use this resource when:
- A query is slower than expected and you suspect a missing index.
- You want to verify that a newly created index is being used.
- You are reviewing slow query logs or performance dashboards.
- You need to decide between a B-tree, GIN, or partial index.

## Solution

### Analyze a query with EXPLAIN ANALYZE

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM orders
WHERE customer_id = 1234
  AND created_at > '2024-01-01'
ORDER BY created_at DESC
LIMIT 100;

-- Create a composite index if the plan shows a sequential scan
CREATE INDEX idx_orders_customer_created
ON orders (customer_id, created_at DESC);
```

## Explanation

`EXPLAIN (ANALYZE, BUFFERS)` runs the query and reports actual execution time plus I/O statistics. Look for `Seq Scan` on large tables, which means the database is reading every row. If the filter is selective, a composite index on `(customer_id, created_at)` lets the database jump to the relevant rows and return them in sorted order. The index order should match the query's equality columns first, then range columns, then sort columns.

## Variants

| Index type | Best for | Example |
|------------|----------|---------|
| B-tree | Equality and range | `WHERE id = 5` or `WHERE date > '2024-01-01'` |
| GIN | Array, JSONB, full-text | `WHERE tags @> ARRAY['x']` |
| BRIN | Very large, naturally ordered tables | Time-series data |
| Partial | Subset of rows | `WHERE deleted_at IS NULL` |

## What Works

1. **Always measure before and after.** `EXPLAIN ANALYZE` gives concrete proof of improvement.
2. **Index equality columns first.** They are more selective than range columns.
3. **Keep indexes narrow.** Include only columns the query actually needs.
4. **Drop unused indexes.** They consume disk space and slow down writes.
5. **Monitor write performance.** Each index adds cost to `INSERT`, `UPDATE`, and `DELETE`.

## Common Mistakes

1. **Adding an index for every slow query.** Too many indexes hurt write throughput and maintenance.
2. **Wrong column order in composite indexes.** The leading column must be the one used in equality filters.
3. **Indexing low-cardinality columns alone.** An index on `status` with only three values is rarely useful.
4. **Forgetting to update statistics.** Run `ANALYZE` after bulk loads so the planner has accurate row counts.
5. **Assuming the planner will use the index.** Always confirm with `EXPLAIN`; hints are a last resort.

## Frequently Asked Questions

**Q: What is the difference between EXPLAIN and EXPLAIN ANALYZE?**
A: EXPLAIN shows the planned execution. EXPLAIN ANALYZE actually runs the query and reports real timing and rows processed.

**Q: How do I know if an index is being used?**
A: Look for `Index Scan` or `Index Only Scan` in the plan. `Seq Scan` on a large table usually means the index is not being used.

**Q: Should I add an index to every foreign key column?**
A: Usually yes, especially if the column is used in JOINs, WHERE clauses, or child lookups. But verify usage with `EXPLAIN`.
