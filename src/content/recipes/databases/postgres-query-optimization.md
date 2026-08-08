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
  - database
  - postgresql
relatedResources:
  - /recipes/acid-transactions-postgres
  - /recipes/redis-cache-patterns
  - /patterns/repository-pattern
  - /recipes/uuid-generation-strategies
  - /recipes/database-connection-pooling
  - /recipes/database-replication
  - /recipes/deadlock-prevention-sql
  - /recipes/schema-evolution
  - /recipes/sql-index-optimization-analysis
  - /recipes/sql-partitioning-strategies
  - /recipes/graphql-n-1-query-detection
lastUpdated: "2026-06-18"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Optimize PostgreSQL queries with EXPLAIN, indexing strategies, partial indexes, and query rewriting to reduce execution time from seconds to milliseconds."
  keywords:
    - postgresql optimization
    - query performance
    - indexing strategies
    - explain analyze
    - database tuning





---

Identify and fix slow queries in PostgreSQL using execution plan analysis, strategic indexing, and query restructuring. Below is a practical approach to EXPLAIN ANALYZE, B-tree and partial indexes, covering indexes, and common anti-patterns that degrade performance.

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

- Run `ANALYZE` after bulk loads or major data changes to update statistics
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

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### BRIN Indexes for Large Time-Series Tables

```sql
-- BRIN is 1000x smaller than B-tree for naturally ordered data
CREATE INDEX idx_events_created_brin
ON events USING BRIN (created_at)
WITH (pages_per_range = 32);
```

BRIN (Block Range Index) stores summary info for blocks of pages. Ideal for time-series or log tables where data is naturally ordered by insertion time. A BRIN index on 1TB of data might be 10MB vs 10GB for a B-tree.

### GIN Indexes for JSONB and Full-Text Search

```sql
-- JSONB containment queries
CREATE INDEX idx_events_payload ON events USING GIN (payload);

-- Query JSONB efficiently
SELECT * FROM events WHERE payload @> '{"event_type": "click"}';

-- Full-text search
CREATE INDEX idx_articles_search ON articles USING GIN (to_tsvector('english', body));

SELECT * FROM articles
WHERE to_tsvector('english', body) @@ to_tsquery('postgres & optimization');
```

### Using `pg_stat_statements` to Find Slow Queries

```sql
-- Enable the extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 queries by total execution time
SELECT
    query,
    calls,
    mean_exec_time,
    total_exec_time,
    rows,
    100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Reset statistics after making changes
SELECT pg_stat_statements_reset();
```

### VACUUM and ANALYZE Strategy

```sql
-- Analyze after bulk loads to update planner statistics
ANALYZE users;

-- Vacuum to reclaim space from dead tuples
VACUUM (VERBOSE, ANALYZE) users;

-- Vacuum full reclaims space to OS but locks the table
-- Use pg_repack instead for online table reorganization
VACUUM FULL users;

-- Check table bloat
SELECT
    schemaname,
    tablename,
    n_live_tup,
    n_dead_tup,
    last_vacuum,
    last_autovacuum,
    autovacuum_count
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC;
```

### Index-Only Scans and Visibility Maps

```sql
-- A covering index enables index-only scans
CREATE INDEX idx_orders_user_status_total
ON orders (user_id, status)
INCLUDE (total);

-- The query below can be served entirely from the index
SELECT user_id, status, total
FROM orders
WHERE user_id = 42 AND status = 'completed';

-- Check if visibility map allows index-only scans
-- VACUUM updates the visibility map
VACUUM (VERBOSE) orders;
```

### Connection-Level Tuning

```sql
-- Set work_mem per session for large sorts
SET work_mem = '256MB';

-- Set maintenance_work_mem for VACUUM and CREATE INDEX
SET maintenance_work_mem = '1GB';

-- Limit query execution time
SET statement_timeout = '30s';

-- Limit lock wait time
SET lock_timeout = '5s';
```


## Additional Common Mistakes

6. **Indexing on low-cardinality columns.** An index on a boolean column (`active`) is rarely used because the planner skips it when most rows match.

7. **Not running `ANALYZE` after data distribution changes.** The planner uses stale statistics and chooses bad plans. Run `ANALYZE` after bulk imports, deletes, or schema changes.

8. **Using `OFFSET` for pagination.** `OFFSET 100000` scans and discards 100,000 rows. Use keyset pagination instead:

```sql
-- Bad: OFFSET pagination
SELECT * FROM orders ORDER BY id OFFSET 100000 LIMIT 20;

-- Good: keyset pagination
SELECT * FROM orders WHERE id > 100000 ORDER BY id LIMIT 20;
```

9. **Ignoring `pg_stat_activity` for long-running queries.** Queries that run for minutes block vacuuming and cause bloat. Monitor and kill them:

```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '5 minutes';
```

10. **Over-indexing write-heavy tables.** Each index adds overhead to every INSERT, UPDATE, and DELETE. Benchmark write performance after adding indexes.


## Performance Tips

1. **Use `pg_stat_statements.track = all` to capture nested queries.** This tracks queries inside functions and triggers, not just top-level queries.

2. **Monitor buffer hit ratio.** A ratio below 90% means the database is reading from disk too often. Increase `shared_buffers` or add RAM:

```sql
SELECT
    sum(blks_hit) AS hits,
    sum(blks_read) AS reads,
    100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0) AS hit_ratio
FROM pg_stat_database;
```

3. **Use `pgbench` for load testing.** Benchmark changes before deploying:

```bash
pgbench -i -s 10 mydb  # Initialize with scale factor 10
pgbench -c 20 -j 4 -T 60 mydb  # 20 clients, 4 threads, 60 seconds
```

4. **Check for index bloat regularly.** Use `pgstattuple` to measure bloat:

```sql
CREATE EXTENSION IF NOT EXISTS pgstattuple;
SELECT * FROM pgstattuple('orders');
```

5. **Use `parallel_setup_cost` and `parallel_tuple_cost` tuning.** For analytical workloads, lower these to encourage parallel query plans:

```sql
SET parallel_setup_cost = 100;
SET parallel_tuple_cost = 0.03;
SET max_parallel_workers_per_gather = 4;
```
