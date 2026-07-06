---
contentType: guides
slug: complete-guide-postgresql-tuning
title: "Complete Guide to PostgreSQL Tuning"
description: "Optimize PostgreSQL for high throughput. Covers configuration tuning, indexing strategies, query optimization, connection pooling, partitioning, and vacuum management."
metaDescription: "Complete guide to PostgreSQL tuning. Optimize config, indexing, query plans, connection pooling, partitioning, and vacuum for high throughput workloads."
difficulty: advanced
topics:
  - databases
  - performance
tags:
  - postgresql
  - database-tuning
  - indexing
  - performance
  - partitioning
  - connection-pooling
  - guide
  - databases
relatedResources:
  - /guides/databases/database-denormalization-guide
  - /guides/performance/sql-cte-guide
  - /guides/data/data-migration-guide
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Complete guide to PostgreSQL tuning. Optimize config, indexing, query plans, connection pooling, partitioning, and vacuum for high throughput workloads."
  keywords:
    - postgresql tuning
    - postgresql performance
    - postgresql indexing
    - postgresql configuration
    - query optimization
    - connection pooling
    - postgresql partitioning
    - vacuum postgresql
---

# Complete Guide to PostgreSQL Tuning

## Introduction

PostgreSQL is capable but default settings are conservative — designed to run on a machine with 256MB of RAM. Production workloads need tuned configuration, proper indexes, optimized queries, and strategic data partitioning. Here is a hands-on guide to configuration tuning, indexing strategies, query optimization, connection pooling, partitioning, and vacuum management.

## Configuration Tuning

### Memory settings

```ini
# postgresql.conf

# Shared buffers — 25% of total RAM
shared_buffers = 2GB

# Effective cache size — 75% of total RAM (hint to planner)
effective_cache_size = 6GB

# Work mem — per-sort/hash memory (total = work_mem * max_connections * sorts)
work_mem = 64MB

# Maintenance work mem — for VACUUM, CREATE INDEX, ALTER TABLE
maintenance_work_mem = 512MB

# WAL buffers — 1/32 of shared_buffers, min 64KB
wal_buffers = 16MB
```

### Checkpoint tuning

```ini
# Increase checkpoint timeout for less I/O spikes
checkpoint_timeout = 15min
max_wal_size = 4GB
min_wal_size = 1GB
checkpoint_completion_target = 0.9

# WAL level for replication
wal_level = replica
```

### Parallel queries

```ini
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4
parallel_setup_cost = 100
parallel_tuple_cost = 0.1
```

### Autovacuum tuning

```ini
autovacuum = on
autovacuum_max_workers = 6
autovacuum_naptime = 30s
autovacuum_vacuum_threshold = 50
autovacuum_vacuum_scale_factor = 0.05
autovacuum_analyze_threshold = 50
autovacuum_analyze_scale_factor = 0.02
```

## Indexing Strategies

### B-tree (default)

```sql
-- Single column index
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- Composite index (column order matters — most selective first)
CREATE INDEX idx_orders_status_created ON orders(status, created_at);

-- Partial index — index only relevant rows
CREATE INDEX idx_orders_pending ON orders(customer_id)
    WHERE status = 'pending';
```

### Covering index (INCLUDE)

```sql
-- Index includes extra columns to avoid heap lookups
CREATE INDEX idx_orders_covering ON orders(customer_id, status)
    INCLUDE (total, created_at);

-- Now this query is index-only:
SELECT total, created_at FROM orders
    WHERE customer_id = 42 AND status = 'pending';
```

### Expression index

```sql
-- Index on a function result
CREATE INDEX idx_orders_lower_email ON orders(LOWER(email));

-- Query must match the expression exactly
SELECT * FROM orders WHERE LOWER(email) = 'alice@example.com';
```

### GIN index (for JSONB and arrays)

```sql
-- JSONB containment queries
CREATE INDEX idx_events_data ON events USING GIN (data);

-- Array containment
CREATE INDEX idx_tags ON articles USING GIN (tags);

-- Full-text search
CREATE INDEX idx_articles_search ON articles USING GIN (to_tsvector('english', body));
```

### BRIN index (for large ordered tables)

```sql
-- Block Range INdex — tiny size, great for time-series
CREATE INDEX idx_logs_brin ON logs USING BRIN (created_at);
```

### When NOT to index

- Small tables (under ~1000 rows) — sequential scan is faster
- Columns rarely used in WHERE clauses
- High-write, low-read columns — every index slows writes
- Columns with low cardinality (boolean, gender) — use partial index instead

## Query Optimization

### EXPLAIN ANALYZE

```sql
-- Always check the query plan
EXPLAIN (ANALYZE, BUFFERS) 
SELECT o.id, o.total, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'pending'
ORDER BY o.created_at DESC
LIMIT 20;

-- Look for:
-- Seq Scan on large tables → missing index
-- Hash Join with huge rows → missing index on join column
-- Sort with high cost → missing index on ORDER BY column
-- Nested Loop with huge rows → missing index on inner table
```

### Common query anti-patterns

```sql
-- BAD: OR prevents index usage
SELECT * FROM orders WHERE customer_id = 1 OR status = 'pending';
-- GOOD: UNION ALL with indexes
SELECT * FROM orders WHERE customer_id = 1
UNION ALL
SELECT * FROM orders WHERE status = 'pending' AND customer_id != 1;

-- BAD: Leading wildcard prevents index usage
SELECT * FROM customers WHERE name LIKE '%alice%';
-- GOOD: Use trigram index (pg_trgm extension)
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_customers_name_trgm ON customers USING GIN (name gin_trgm_ops);
SELECT * FROM customers WHERE name ILIKE '%alice%';

-- BAD: Function on indexed column prevents index usage
SELECT * FROM orders WHERE EXTRACT(YEAR FROM created_at) = 2024;
-- GOOD: Range query uses index
SELECT * FROM orders 
    WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';

-- BAD: SELECT * fetches unnecessary columns
SELECT * FROM orders WHERE customer_id = 42;
-- GOOD: Select only needed columns
SELECT id, total, status FROM orders WHERE customer_id = 42;
```

## Connection Pooling

### PgBouncer

```ini
# pgbouncer.ini
[databases]
mydb = host=127.0.0.1 port=5432 dbname=mydb

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3
server_idle_timeout = 300
```

### Pool mode comparison

| Mode | Description | Best For |
|------|-------------|----------|
| session | One server per client | Long-lived connections, prepared statements |
| transaction | Server per transaction | Most apps — best utilization |
| statement | Server per statement | Simple queries, no transactions |

## Partitioning

### Range partitioning (time-series)

```sql
CREATE TABLE events (
    id BIGSERIAL,
    created_at TIMESTAMPTZ NOT NULL,
    data JSONB
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE events_2024_01 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE events_2024_02 PARTITION OF events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Default partition for out-of-range data
CREATE TABLE events_default PARTITION OF events DEFAULT;

-- Automatic partition creation with pg_partman
CREATE EXTENSION pg_partman;
SELECT partman.create_parent('public.events', 'created_at', 'native', 'monthly');
```

### List partitioning (by category)

```sql
CREATE TABLE orders_by_region (
    id BIGSERIAL,
    region TEXT NOT NULL,
    total NUMERIC
) PARTITION BY LIST (region);

CREATE TABLE orders_us PARTITION OF orders_by_region
    FOR VALUES IN ('US');
CREATE TABLE orders_eu PARTITION OF orders_by_region
    FOR VALUES IN ('EU', 'UK');
CREATE TABLE orders_other PARTITION OF orders_by_region DEFAULT;
```

### Hash partitioning (even distribution)

```sql
CREATE TABLE users_hashed (
    id BIGSERIAL,
    email TEXT,
    data JSONB
) PARTITION BY HASH (id);

CREATE TABLE users_hash_0 PARTITION OF users_hashed
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE users_hash_1 PARTITION OF users_hashed
    FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE users_hash_2 PARTITION OF users_hashed
    FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE users_hash_3 PARTITION OF users_hashed
    FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

## Vacuum Management

```sql
-- Check table bloat
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size,
    n_live_tup,
    n_dead_tup,
    ROUND(n_dead_tup::FLOAT / NULLIF(n_live_tup, 0) * 100, 2) AS dead_pct
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 20;

-- Manual vacuum with analysis
VACUUM (ANALYZE, VERBOSE) orders;

-- Full vacuum — reclaims space to OS but locks table
VACUUM FULL orders;

-- Check autovacuum progress
SELECT pid, phase, heap_blks_total, heap_blks_scanned
FROM pg_stat_progress_vacuum;
```

## Monitoring

```sql
-- Slow queries (requires log_min_duration_statement in postgresql.conf)
-- Set: log_min_duration_statement = 100  -- log queries > 100ms

-- Active queries
SELECT pid, now() - query_start AS duration, query, state
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

-- Index usage stats
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC
LIMIT 20;

-- Table cache hit ratio
SELECT
    relname,
    heap_blks_read,
    heap_blks_hit,
    ROUND(heap_blks_hit::FLOAT / NULLIF(heap_blks_hit + heap_blks_read, 0) * 100, 2) AS hit_ratio
FROM pg_statio_user_tables
ORDER BY hit_ratio ASC
LIMIT 20;

-- Database-level cache hit ratio
SELECT
    datname,
    blks_read,
    blks_hit,
    ROUND(blks_hit::FLOAT / NULLIF(blks_hit + blks_read, 0) * 100, 2) AS cache_hit_ratio
FROM pg_stat_database;
```

## Best Practices

- **Set `shared_buffers` to 25% of RAM** — the single most impactful setting
- **Create indexes before loading data** — or use `CREATE INDEX CONCURRENTLY` on live tables
- **Use `ANALYZE` after bulk loads** — the planner needs fresh statistics
- **Use connection pooling** — PostgreSQL handles ~100 connections efficiently, not 1000
- **Monitor cache hit ratio** — aim for > 95%; if lower, add RAM or optimize queries
- **Partition large tables** — tables over 10M rows benefit from partitioning
- **Use `pg_stat_statements`** — track query performance over time
- **Tune autovacuum per table** — busy tables need more aggressive vacuuming
- **Use `EXPLAIN (ANALYZE, BUFFERS)`** — never guess what the planner is doing
- **Avoid `SELECT *`** — fetch only needed columns to use index-only scans
- **Use `LIMIT` with `ORDER BY`** — pair with an index for instant results

## Common Mistakes

- Leaving default config in production — `shared_buffers` of 128MB is too low
- Over-indexing — every index slows writes; remove unused indexes
- Not running `ANALYZE` after bulk loads — planner uses stale statistics
- Using `VACUUM FULL` during peak hours — it locks the table
- Not using connection pooling — 500+ connections cause context-switch overhead
- Indexing low-cardinality columns — a boolean index is almost useless
- Not monitoring slow queries — you cannot optimize what you cannot see
- Ignoring bloat — dead tuples accumulate and slow down sequential scans
- Using `SELECT *` with large tables — fetches unnecessary data, prevents index-only scans
- Not testing config changes — always benchmark before and after

## Frequently Asked Questions

### How much RAM should I allocate to PostgreSQL?

Allocate 25% of total RAM to `shared_buffers` and set `effective_cache_size` to 75% of total RAM. The remaining 50% is for OS page cache and work_mem per connection. For a 16GB server: `shared_buffers = 4GB`, `effective_cache_size = 12GB`, `work_mem = 64MB`.

### When should I use partitioning vs indexing?

Use indexing when queries filter on specific columns and return a small subset of rows. Use partitioning when tables exceed 10M rows and queries filter on a partition key (usually a date). Partitioning reduces scan size and enables partition pruning, while indexes speed up point lookups. They are complementary, not exclusive.

### How do I find unused indexes?

```sql
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_total_relation_size(schemaname || '.' || indexname) DESC;
```
Indexes with `idx_scan = 0` since the last stats reset are candidates for removal. Use `DROP INDEX CONCURRENTLY` to avoid locking.
