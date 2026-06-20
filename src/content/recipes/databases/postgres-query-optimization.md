---
contentType: recipes
slug: postgres-query-optimization
title: "PostgreSQL Query Optimization and Indexing Strategies"
description: "Analyze and optimize slow PostgreSQL queries using EXPLAIN, proper indexing, partial indexes, and query rewriting to reduce execution time from seconds to milliseconds"
metaDescription: "Optimize PostgreSQL queries with EXPLAIN, indexing strategies, partial indexes, and query rewriting to reduce execution time from seconds to milliseconds."
difficulty: intermediate
topics:
  - databases
  - performance
tags:
  - postgres
  - sql
  - performance
  - databases
relatedResources:
  - /recipes/databases/acid-transactions-postgres
  - /recipes/databases/redis-cache-patterns
  - /patterns/design/repository-pattern
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Optimize PostgreSQL queries with EXPLAIN, indexing strategies, partial indexes, and query rewriting to reduce execution time from seconds to milliseconds."
  keywords:
    - postgresql optimization
    - query performance
    - indexing strategies
    - explain analyze
    - database tuning
---

# PostgreSQL Query Optimization and Indexing Strategies

Identify and fix slow queries in PostgreSQL using execution plan analysis, strategic indexing, and query restructuring. This recipe covers EXPLAIN ANALYZE, B-tree and partial indexes, covering indexes, and common anti-patterns that degrade performance.

## When to Use This

- Queries take longer than 100ms and are executed frequently. See [Database Views](/recipes/databases/database-views-materialized) for precomputed results.
- Sequential scans appear in query plans where index scans should be used. See [SQL Joins](/recipes/databases/sql-joins) for join optimization.
- Database CPU or I/O is saturated under normal load. See [Redis Caching](/recipes/databases/redis-cache-patterns) for reducing load.

## Solution

### 1. Analyze Query Plans with EXPLAIN

```sql
-- Basic plan
EXPLAIN ANALYZE
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.name
ORDER BY order_count DESC
LIMIT 10;
```

Look for:
- `Seq Scan` on large tables → missing index
- `Hash Join` with high memory usage → consider nested loop with index
- `Sort` with high cost → add index on sort columns

### 2. Create Strategic Indexes

```sql
-- Composite index for range + equality queries
CREATE INDEX idx_orders_user_created
ON orders(user_id, created_at);

-- Partial index for active records only
CREATE INDEX idx_orders_pending
ON orders(created_at)
WHERE status = 'pending';

-- Covering index to avoid heap lookups
CREATE INDEX idx_orders_covering
ON orders(user_id, status, total)
INCLUDE (created_at);
```

### 3. Rewrite Queries to Use Indexes

```sql
-- Before: function on column prevents index use
SELECT * FROM orders WHERE EXTRACT(YEAR FROM created_at) = 2024;

-- After: range condition allows index scan
SELECT * FROM orders
WHERE created_at >= '2024-01-01'
  AND created_at < '2025-01-01';
```

### 4. Optimize Joins

```sql
-- Before: implicit cross join
SELECT * FROM users, orders WHERE users.id = orders.user_id;

-- After: explicit JOIN with proper conditions
SELECT u.name, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'
  AND o.created_at > NOW() - INTERVAL '30 days';
```

### 5. Partition Large Tables

```sql
-- Range partition by month
CREATE TABLE events (
  id BIGSERIAL,
  event_type VARCHAR(50),
  created_at TIMESTAMP NOT NULL,
  payload JSONB
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2024_01 PARTITION OF events
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE events_2024_02 PARTITION OF events
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

## How It Works

- **EXPLAIN ANALYZE** shows the actual execution plan and timings
- **B-tree indexes** accelerate equality and range lookups
- **Partial indexes** are smaller and faster for filtered subsets
- **Covering indexes** include all columns needed, avoiding heap access
- **Partitioning** prunes irrelevant data, reducing scan scope

## Variation: Find Missing Indexes

```sql
-- Identify frequently scanned tables
SELECT
  schemaname,
  tablename,
  seq_scan,
  idx_scan,
  seq_tup_read,
  idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > 1000
  AND idx_scan < seq_scan * 0.1
ORDER BY seq_scan DESC
LIMIT 20;
```

## Production Considerations

- Run `ANALYZE` after bulk loads or significant data changes to update statistics
- Use `pg_stat_statements` to identify the slowest queries by total time. See [Logging](/recipes/api/logging) for query observability.
- Monitor index bloat with `pgstattuple` and rebuild with `REINDEX`

## Common Mistakes

- Adding indexes on every column without considering query patterns
- Using `SELECT *` when only a few columns are needed
- Not updating table statistics after large data migrations. See [Database Migrations](/recipes/databases/database-migrations) for safe schema changes.

## FAQ

**Q: How many indexes is too many?**
A: More than 5-7 indexes per table slows down writes. Each index adds overhead to INSERT, UPDATE, and DELETE operations.

**Q: When should I use BRIN instead of B-tree?**
A: BRIN indexes are ideal for very large, naturally ordered tables (time-series, log data) where a full B-tree would be too large.
