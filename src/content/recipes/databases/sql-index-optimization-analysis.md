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
  - /recipes/sql-full-text-search-setup
  - /recipes/sql-migration-zero-downtime
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Optimize SQL indexes using EXPLAIN and execution plans. Learn to identify missing indexes, slow sequential scans, and query bottlenecks."
  keywords:
    - sql index optimization
    - explain analyze
    - postgresql indexes
    - query performance
    - index maintenance



---


## Overview

Indexes are the primary tool for making SQL queries fast, but adding them blindly can waste space, slow writes, and even make queries slower. The right approach is to start with the execution plan. `EXPLAIN` and `EXPLAIN ANALYZE` reveal whether the database is scanning the whole table or using an index, and they estimate the cost of each step so you can target the biggest bottlenecks first.

## When to Use


- For alternatives, see [Database Replication](/recipes/database-replication/).

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

### Find unused and duplicate indexes

```sql
-- PostgreSQL: find indexes that have never been used since last reset
SELECT schemaname, relname, indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Reset statistics to get fresh data
SELECT pg_stat_reset();

-- Find duplicate indexes (same columns, different names)
SELECT pg_size_pretty(pg_relation_size(indexrelid)) AS size,
       relname AS table,
       indexrelname AS index,
       string_agg(attname, ', ' ORDER BY array_position(ix.indkey, attnum)) AS columns
FROM pg_index ix
JOIN pg_class c ON c.oid = ix.indrelid
JOIN pg_class ci ON ci.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(ix.indkey)
GROUP BY relname, indexrelname, ix.indkey
HAVING count(*) > 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Create a partial index for active records

```sql
-- Index only non-deleted rows: saves space when most rows are deleted
CREATE INDEX idx_orders_active_customer
ON orders (customer_id)
WHERE deleted_at IS NULL;

-- Verify the partial index is used
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE customer_id = 1234 AND deleted_at IS NULL;
```

### Create a covering index for index-only scans

```sql
-- Include columns in the index to avoid heap lookups
CREATE INDEX idx_orders_covering
ON orders (customer_id, created_at DESC)
INCLUDE (total_amount, status);

-- This query can now use an Index Only Scan
EXPLAIN (ANALYZE, BUFFERS)
SELECT customer_id, created_at, total_amount, status
FROM orders
WHERE customer_id = 1234
ORDER BY created_at DESC
LIMIT 50;
```

### Create an expression index for computed queries

```sql
-- Index a lower-case email for case-insensitive lookups
CREATE INDEX idx_users_email_lower
ON users (LOWER(email));

-- The query must match the expression exactly
EXPLAIN ANALYZE
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';

-- Index a date extraction for monthly reports
CREATE INDEX idx_orders_month
ON orders (DATE_TRUNC('month', created_at));
```

### Drop unused indexes safely

```sql
-- Step 1: Monitor for at least one week to capture weekly query patterns
-- Step 2: Check index size before dropping
SELECT pg_size_pretty(pg_relation_size('idx_orders_old_status'));

-- Step 3: Drop the index
DROP INDEX CONCURRENTLY idx_orders_old_status;
-- CONCURRENTLY prevents locking the table during the drop
```

## Explanation

`EXPLAIN (ANALYZE, BUFFERS)` runs the query and reports actual execution time plus I/O statistics. Look for `Seq Scan` on large tables, which means the database is reading every row. If the filter is selective, a composite index on `(customer_id, created_at)` lets the database jump to the relevant rows and return them in sorted order. The index order should match the query's equality columns first, then range columns, then sort columns.

Key metrics to read from the output:

| Metric | Meaning | Red flag |
|--------|---------|----------|
| `Seq Scan` | Full table scan | On tables with >10k rows |
| `cost=0.00..5234.12` | Estimated cost units | Compare before/after |
| `rows=1000000` | Estimated rows | Way off from actual = stale stats |
| `actual time=234.5..567.8` | Real milliseconds | Compare to baseline |
| `Buffers: shared hit=1234 read=5678` | Cache hits vs disk reads | High read = I/O bottleneck |

## Index Maintenance

### Rebuild fragmented indexes

```sql
-- Check index bloat
SELECT schemaname, relname, indexrelname,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size,
       idx_scan AS scans
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- Rebuild index without locking the table
REINDEX INDEX CONCURRENTLY idx_orders_customer_created;

-- Rebuild all indexes on a table
REINDEX TABLE CONCURRENTLY orders;
```

### Update statistics after bulk loads

```sql
-- After importing large datasets, update planner statistics
ANALYZE orders;

-- Set statistics target for more accurate estimates
ALTER TABLE orders ALTER COLUMN customer_id SET STATISTICS 1000;
ANALYZE orders;
```

## Variants

| Index type | Best for | Example |
|------------|----------|---------|
| B-tree | Equality and range | `WHERE id = 5` or `WHERE date > '2024-01-01'` |
| GIN | Array, JSONB, full-text | `WHERE tags @> ARRAY['x']` |
| BRIN | Very large, naturally ordered tables | Time-series data |
| Partial | Subset of rows | `WHERE deleted_at IS NULL` |
| Covering | Index-only scans | `INCLUDE (col1, col2)` |
| Expression | Computed columns | `LOWER(email)` |

```sql
-- GIN index for JSONB queries
CREATE INDEX idx_events_metadata ON events USING GIN (metadata);
SELECT * FROM events WHERE metadata @> '{"type": "click"}';

-- BRIN index for time-series (small footprint, fast for ordered data)
CREATE INDEX idx_metrics_time_brin ON metrics USING BRIN (recorded_at);
```

## What Works

1. **Always measure before and after.** `EXPLAIN ANALYZE` gives concrete proof of improvement.
2. **Index equality columns first.** They are more selective than range columns.
3. **Keep indexes narrow.** Include only columns the query actually needs.
4. **Drop unused indexes.** They consume disk space and slow down writes.
5. **Monitor write performance.** Each index adds cost to `INSERT`, `UPDATE`, and `DELETE`.
6. **Use CONCURRENTLY for production.** Creating or dropping indexes without `CONCURRENTLY` locks the table.
7. **Run ANALYZE after bulk loads.** Stale statistics cause the planner to choose bad execution paths.

## Common Mistakes

1. **Adding an index for every slow query.** Too many indexes hurt write throughput and maintenance.
2. **Wrong column order in composite indexes.** The leading column must be the one used in equality filters.
3. **Indexing low-cardinality columns alone.** An index on `status` with only three values is rarely useful.
4. **Forgetting to update statistics.** Run `ANALYZE` after bulk loads so the planner has accurate row counts.
5. **Assuming the planner will use the index.** Always confirm with `EXPLAIN`; hints are a last resort.
6. **Creating indexes without CONCURRENTLY in production.** This locks the table and causes downtime.
7. **Ignoring index bloat.** Fragmented indexes grow larger than needed and slow down scans. Run `REINDEX CONCURRENTLY` periodically.

## Frequently Asked Questions

**Q: What is the difference between EXPLAIN and EXPLAIN ANALYZE?**
A: EXPLAIN shows the planned execution. EXPLAIN ANALYZE actually runs the query and reports real timing and rows processed.

**Q: How do I know if an index is being used?**
A: Look for `Index Scan` or `Index Only Scan` in the plan. `Seq Scan` on a large table usually means the index is not being used. You can also check `pg_stat_user_indexes.idx_scan` to see cumulative usage.

**Q: Should I add an index to every foreign key column?**
A: Usually yes, especially if the column is used in JOINs, WHERE clauses, or child lookups. But verify usage with `EXPLAIN`.

**Q: How many indexes is too many?**
A: There is no fixed number. Monitor write performance as you add indexes. If `INSERT` or `UPDATE` latency grows beyond your SLA, you have too many. A rule of thumb: 5-10 indexes per table for OLTP, more for read-heavy reporting tables.

**Q: What is the cost of a missing index?**
A: A `Seq Scan` on a 10M row table can take seconds. The same query with an index takes milliseconds. The cost is not just latency but also CPU and I/O pressure that affects other queries.

**Q: When should I use a covering index vs a composite index?**
A: Use a covering index (`INCLUDE`) when you want an Index Only Scan and the extra columns are not part of the filter or sort. Use a composite index when all columns are part of the filter or sort condition.

**Q: How do I test index performance in staging without production data?**
A: Generate synthetic data with realistic cardinality. Use `generate_series` in PostgreSQL to create test rows. Compare `EXPLAIN ANALYZE` output before and after adding the index.

**Q: Can indexes hurt SELECT performance?**
A: Yes. If the planner chooses an index scan when a sequential scan would be faster (e.g., the index matches few rows but the table is small), or if the index is bloated and requires more I/O than a direct scan. The planner usually gets it right, but stale statistics can cause bad choices.

**Q: How do I handle indexes during a migration?**
A: Create indexes with `CREATE INDEX CONCURRENTLY` after the data migration, not before. Pre-creating indexes on an empty table and then loading data is slower than loading first and indexing second. For large tables, consider creating the index in a background session.

**Q: What is the difference between CLUSTER and REINDEX?**
A: `REINDEX` rebuilds the index data structure. `CLUSTER` physically reorders table rows to match an index. `CLUSTER` is a one-time operation (PostgreSQL does not maintain the order), while `REINDEX` addresses index bloat that accumulates over time.

## Performance Comparison

| Scenario | Without index | With composite index | Improvement |
|----------|--------------|---------------------|-------------|
| 1M rows, equality filter | 340ms (Seq Scan) | 0.8ms (Index Scan) | 425x |
| 1M rows, range + sort | 520ms (Seq Scan + Sort) | 1.2ms (Index Scan) | 433x |
| 10M rows, count by FK | 4.2s (Seq Scan) | 15ms (Index Only Scan) | 280x |
| 500K rows, JSONB filter | 890ms (Seq Scan) | 3ms (GIN Scan) | 296x |

## Monitoring Checklist

Run these queries weekly to maintain index health:

```sql
-- 1. Top 10 largest indexes (candidates for review)
SELECT relname, indexrelname,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;

-- 2. Indexes with zero scans (unused)
SELECT relname, indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- 3. Tables with sequential scan pressure
SELECT relname, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > 100 AND seq_tup_read > idx_tup_fetch
ORDER BY seq_tup_read DESC;
```

Schedule these checks as a weekly cron job and log results to track index health trends over time.

## Advanced Techniques

### Index-only scan optimization

Maximize index-only scans by including frequently accessed columns:

```sql
-- Create a covering index for common query patterns
CREATE INDEX idx_orders_customer_covering
ON orders (customer_id, created_at DESC)
INCLUDE (total_amount, status, shipping_address);

-- Verify index-only scan in execution plan
EXPLAIN (ANALYZE, BUFFERS)
SELECT customer_id, created_at, total_amount, status
FROM orders
WHERE customer_id = 1234
ORDER BY created_at DESC
LIMIT 50;
```

### Hypothetical indexes for testing

Test index impact before creating them:

```sql
-- Enable hypopg extension for hypothetical indexes
CREATE EXTENSION IF NOT EXISTS hypopg;

-- Test a hypothetical index without creating it
SELECT * FROM hypopg_create_index('orders', 'customer_id, created_at');

-- Explain with the hypothetical index
EXPLAIN SELECT * FROM orders WHERE customer_id = 1234 AND created_at > '2024-01-01';

-- Clean up hypothetical indexes
SELECT hypopg_reset();
```

### Index usage statistics by query pattern

Track which queries use which indexes:

```sql
-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find queries that would benefit from specific indexes
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE query LIKE '%orders%'
ORDER BY total_time DESC
LIMIT 20;
```

### Parallel query execution with indexes

Use parallel workers for large scans:

```sql
-- Set parallel workers for large table scans
SET max_parallel_workers_per_gather = 4;
SET parallel_setup_cost = 100;
SET parallel_tuple_cost = 0.01;

-- Verify parallel execution in plan
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*) FROM orders WHERE status = 'completed';
```

### Index partitioning for large tables

Partition indexes alongside table partitioning:

```sql
-- Create partitioned table with local indexes
CREATE TABLE orders_partitioned (
  id BIGSERIAL,
  customer_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  status TEXT
) PARTITION BY RANGE (created_at);

-- Create partitions with local indexes
CREATE TABLE orders_2024_q1 PARTITION OF orders_partitioned
  FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE INDEX idx_orders_2024_q1_customer
  ON orders_2024_q1 (customer_id);

-- Query uses partition pruning + local index
EXPLAIN ANALYZE
SELECT * FROM orders_partitioned
WHERE customer_id = 1234
  AND created_at >= '2024-01-01';
```

### Hash indexes for equality comparisons

Use hash indexes for equality-only queries on large columns:

```sql
-- Hash index for exact equality on large text columns
CREATE INDEX idx_users_email_hash
ON users USING HASH (email);

-- Only works for equality, not range or pattern matching
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'alice@example.com';
```

### Bloom filters for multi-column filtering

Use bloom indexes for efficient multi-column filtering:

```sql
-- Enable bloom extension
CREATE EXTENSION IF NOT EXISTS bloom;

-- Create bloom index for multiple columns
CREATE INDEX idx_orders_bloom
ON orders USING bloom (customer_id, status, created_at);

-- Efficient multi-column lookup
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE customer_id = 1234
  AND status = 'pending'
  AND created_at > '2024-01-01';
```
