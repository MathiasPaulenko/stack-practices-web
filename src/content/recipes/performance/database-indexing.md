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
  - optimization
  - profiling
relatedResources:
  - /recipes/sql-joins
  - /recipes/database-views-materialized
  - /recipes/connection-pooling
lastUpdated: "2026-07-09"
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

## What Works

- **Index the columns in your WHERE clause**: if a query filters on `user_id` and `status`, an index on `(user_id, status)` is the first thing to try.
- **Put equality columns before range columns**: in `(a, b)` where `a = 1` and `b > 100`, the index on `(a, b)` is far more useful than `(b, a)`.
- **Avoid indexing low-cardinality columns alone**: a `status` column with only 3 values (active, pending, archived) does not benefit from a standalone index. Combine it with a high-cardinality column.
- **Remove unused indexes**: every index slows down writes. Monitor index usage statistics and drop indexes that are never scanned.
- **Index foreign key columns**: databases do not always auto-index foreign keys. Missing indexes on `JOIN` columns cause expensive nested loop scans. See [database design](/guides/databases/database-design-guide). See [SQL Joins](/recipes/databases/sql-joins) for join optimization.

## Common Mistakes

- **Indexing every column**: this wastes disk space, slows writes dramatically, and confuses the query optimizer with too many choices.
- **Wrong column order in composite indexes**: an index on `(created_at, user_id)` cannot help a query that filters only on `user_id`.
- **Indexing columns that are never queried**: check your query logs before creating indexes.
- **Ignoring index maintenance**: fragmented indexes on high-churn tables degrade over time. See [SQL performance tuning](/guides/databases/sql-performance-tuning-guide). Schedule `REINDEX` or `OPTIMIZE TABLE` periodically.
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

### How do I identify missing indexes in production?

Enable slow query logging: in PostgreSQL set `log_min_duration_statement = 100` to log queries slower than 100ms. In MySQL set `long_query_time = 0.1` and enable `slow_query_log`. Use `pg_stat_statements` in PostgreSQL to track query frequency and average execution time: `SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 20`. Look for queries with high `seq_scan` count on large tables in `pg_stat_user_tables`. Run `EXPLAIN (ANALYZE, BUFFERS)` on slow queries to confirm sequential scans. Tools like `pgBadger` analyze PostgreSQL logs and generate reports with top slow queries and their execution plans.

### How do I choose between B-tree, Hash, GIN, and BRIN indexes?

B-tree is the default and handles equality (`=`), range (`<`, `>`, `BETWEEN`), and sorting (`ORDER BY`). Use B-tree for most columns. Hash indexes only support equality checks and are faster than B-tree for `=` but cannot handle range queries or sorting — use them for lookup tables. GIN (Generalized Inverted Index) is for composite values like arrays, JSONB, and full-text search — use GIN for `@>` (contains) queries on JSONB. BRIN (Block Range Index) is for naturally ordered data like time-series — it stores min/max per block range, making it tiny (kilobytes vs gigabytes for B-tree). Use BRIN on timestamp columns in append-only tables. GiST is for geometric data and nearest-neighbor searches.

### How do partial indexes work and when should I use them?

Partial indexes index only rows matching a `WHERE` clause: `CREATE INDEX idx_active_users ON users(email) WHERE active = true`. They are smaller and faster to maintain than full indexes. Use them when queries always filter on a specific condition: soft-deleted records (`WHERE deleted_at IS NULL`), active subscriptions (`WHERE status = 'active'`), or recent data (`WHERE created_at > '2025-01-01'`). The query planner uses a partial index only when the query's `WHERE` clause matches the index's predicate. If the query filters on `active = true` but the index predicate is `active = true AND deleted_at IS NULL`, the planner may not use it — the predicates must match exactly or be implied.

### How do I monitor index usage and remove unused indexes?

Query `pg_stat_user_indexes` in PostgreSQL: `SELECT schemaname, indexname, idx_scan FROM pg_stat_user_indexes WHERE idx_scan = 0 ORDER BY indexname`. An `idx_scan` of 0 means the index has never been used since the last statistics reset. Compare index size with `pg_size_pretty(pg_relation_size('index_name'))`. Drop unused indexes: `DROP INDEX CONCURRENTLY idx_name`. Use `CONCURRENTLY` to avoid locking the table during the drop. In MySQL, query `sys.schema_unused_indexes` or check `INFORMATION_SCHEMA.STATISTICS` combined with performance schema data. Schedule monthly index audits — indexes that were unused for 30+ days are candidates for removal. Be cautious with indexes used by infrequent batch jobs or quarterly reports.

### How do I handle index fragmentation and bloat?

PostgreSQL indexes accumulate dead tuples after `UPDATE` and `DELETE` operations. Check bloat with `pgstattuple` extension: `SELECT * FROM pgstattuple('index_name')`. Rebuild bloated indexes with `REINDEX INDEX CONCURRENTLY idx_name` — the `CONCURRENTLY` option avoids blocking writes. For B-tree indexes, consider `pg_repack` or `pg_squeeze` for online rebuilds without exclusive locks. In MySQL, run `ANALYZE TABLE` to update statistics and `OPTIMIZE TABLE` to rebuild the table and indexes. Schedule reindexing during low-traffic windows. Monitor the `n_dead_tup` column in `pg_stat_user_tables` to determine when reindexing is needed — a dead-to-live ratio above 20% is a good threshold.

### How do composite indexes affect query performance?

Column order in composite indexes matters: the index is usable only when the query filters on the leftmost columns. `CREATE INDEX idx_a_b_c ON orders(user_id, status, created_at)` supports `WHERE user_id = 1`, `WHERE user_id = 1 AND status = 'paid'`, and `WHERE user_id = 1 AND status = 'paid' ORDER BY created_at`. It does NOT support `WHERE status = 'paid'` alone — `user_id` must come first. Place equality columns before range columns: `(status, created_at)` for `WHERE status = 'active' AND created_at > '2025-01-01'`. For `ORDER BY` optimization, match the index order to the sort order. Limit composite indexes to 3-4 columns — wider indexes consume more disk and memory with diminishing returns.

### How do I index for LIKE queries and full-text search?

B-tree indexes do not support `LIKE '%pattern%'` (leading wildcard). For suffix matching, use a trigram index in PostgreSQL: `CREATE EXTENSION pg_trgm; CREATE INDEX idx_name_trgm ON users USING gin (name gin_trgm_ops)`. Query with `WHERE name % 'john'` or `WHERE name ILIKE '%john%'`. For full-text search, create a GIN index on a `tsvector` column: `CREATE INDEX idx_search ON articles USING gin(to_tsvector('english', title || ' ' || body))`. Query with `WHERE to_tsvector('english', title || ' ' || body) @@ plainto_tsquery('english', 'search term')`. In MySQL, use full-text indexes: `CREATE FULLTEXT INDEX idx_search ON articles(title, body)` and query with `MATCH(title, body) AGAINST('search term' IN NATURAL LANGUAGE MODE)`.

### How do indexes affect write performance?

Each index adds overhead to `INSERT`, `UPDATE`, and `DELETE` operations — the database must update every index on the table. A table with 10 indexes makes writes ~10x slower than a heap-only write. Measure write impact with benchmark scripts: insert 10K rows with and without indexes and compare throughput. For write-heavy tables (logs, events, metrics), minimize indexes — consider writing to an unindexed staging table and batch-merging into the indexed table. Use `COPY` in PostgreSQL instead of individual `INSERT`s for bulk loads. Consider deferring index creation until after bulk data loads: drop indexes, load data, recreate indexes. Monitor write latency with `pg_stat_user_tables` — compare `n_tup_ins`, `n_tup_upd`, and `n_tup_del` against table size.

### How do I use covering indexes (INCLUDE clause) for query optimization?

Covering indexes include additional columns in the index without making them part of the search key. In PostgreSQL: `CREATE INDEX idx_orders_covering ON orders(user_id, status) INCLUDE (total_amount, created_at)`. The query `SELECT total_amount, created_at FROM orders WHERE user_id = 1 AND status = 'paid'` can be served entirely from the index (Index-Only Scan) without touching the heap. The `INCLUDE` columns are not part of the B-tree sort key, so they do not affect index ordering — they only store values in the leaf pages. This reduces I/O for queries that select a small number of columns. In MySQL, use a composite index that includes all selected columns: `CREATE INDEX idx_covering ON orders(user_id, status, total_amount, created_at)`. MySQL's InnoDB stores secondary indexes with the primary key value, so if the PK is `id`, a covering index on `(user_id, status)` already includes `id` in the leaf pages. Monitor Index-Only Scan usage in `EXPLAIN (ANALYZE, BUFFERS)` — look for `Heap Fetches: 0` which means all data came from the index.

### How do I handle indexing for multi-tenant databases?

For schema-per-tenant isolation, each tenant has its own schema with identical indexes — no special handling needed. For shared-schema multi-tenancy with a `tenant_id` column, prefix all composite indexes with `tenant_id`: `CREATE INDEX idx_orders_tenant ON orders(tenant_id, user_id, status)`. This ensures the planner can filter by tenant first, reducing the index scan range. For RLS (Row-Level Security) in PostgreSQL, the planner adds the tenant filter automatically — ensure `tenant_id` is the leading column of all indexes on multi-tenant tables. Consider partial indexes per tenant for high-volume tenants: `CREATE INDEX idx_tenant_a_orders ON orders(user_id) WHERE tenant_id = 'tenant_a'`. This keeps the index small for the specific tenant. Monitor index size per tenant with `pg_stat_user_indexes` and consider table partitioning by `tenant_id` when a single tenant's data exceeds 20% of the table.

### How do I use expression indexes for computed columns?

Expression indexes index the result of an expression instead of a column directly. In PostgreSQL: `CREATE INDEX idx_lower_email ON users(LOWER(email))`. Queries using `WHERE LOWER(email) = 'john@example.com'` will use the index. Without the expression index, `LOWER(email)` requires a full scan. Use expression indexes for case-insensitive lookups, computed dates (`DATE(created_at)`), or JSONB extraction (`((data->>'status')::text)`). The expression in the query must match the index expression exactly. In MySQL, use generated columns: `ALTER TABLE users ADD COLUMN email_lower VARCHAR(255) GENERATED ALWAYS AS (LOWER(email)) STORED; CREATE INDEX idx_email_lower ON users(email_lower)`. Query with `WHERE email_lower = 'john@example.com'`. Expression indexes increase write overhead proportionally to the expression's compute cost — benchmark before deploying.

### How do I tune PostgreSQL autovacuum for index maintenance?

Autovacuum reclaims dead tuples left by `UPDATE` and `DELETE` operations, which affects index performance. Tune `autovacuum_vacuum_scale_factor` per table: `ALTER TABLE orders SET (autovacuum_vacuum_scale_factor = 0.05)` to trigger vacuum when 5% of rows are dead (default is 20%). For write-heavy tables, set a lower threshold: `autovacuum_vacuum_scale_factor = 0.02`. Increase `autovacuum_max_workers` for tables with many indexes (each vacuum can run in parallel). Set `autovacuum_vacuum_cost_limit` higher (e.g., 2000) to allow autovacuum to work faster, and `autovacuum_vacuum_cost_delay` lower (e.g., 1ms) to reduce throttling. Monitor dead tuple accumulation with `pg_stat_user_tables.n_dead_tup`. If autovacuum cannot keep up, schedule manual `VACUUM (ANALYZE)` during low-traffic windows. For very large tables, consider partitioning to reduce vacuum scope per run.

### How do I use EXPLAIN ANALYZE to verify index usage?

Run `EXPLAIN (ANALYZE, BUFFERS) SELECT ...` to see the execution plan with actual timing and I/O. Look for `Seq Scan` (bad — full table scan) vs `Index Scan` (good — uses index) vs `Index Only Scan` (best — all data from index, no heap access). Check `Heap Fetches` — if 0, the covering index is working. Look at `Rows Removed by Filter` — if high, the index is not selective enough. Compare `Planning Time` vs `Execution Time` — high planning time may indicate statistics are stale; run `ANALYZE table_name`. Check `Buffers: shared hit=N read=N` — high `read` means disk I/O, high `hit` means cache hits. For complex queries, use `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)` to see actual row counts per node. In MySQL, use `EXPLAIN ANALYZE` (MySQL 8.0.18+) or `EXPLAIN FORMAT=JSON` for detailed plan analysis. Look for `type: ref` or `type: range` (index used) vs `type: ALL` (full scan).

### How do I handle index conflicts during concurrent deployments?

Use `CREATE INDEX CONCURRENTLY` in PostgreSQL to avoid blocking writes during index creation: `CREATE INDEX CONCURRENTLY idx_name ON table_name(column)`. This takes longer than a regular `CREATE INDEX` but allows the table to remain writable. If the index creation fails (e.g., due to a unique violation), it leaves an invalid index — drop it with `DROP INDEX idx_name` and retry. In MySQL, use `ALTER TABLE ... ADD INDEX` with `ALGORITHM=INPLACE, LOCK=NONE` for online index creation: `ALTER TABLE users ADD INDEX idx_email (email), ALGORITHM=INPLACE, LOCK=NONE`. For large tables, build the index in a staging environment and swap. Use `pt-online-schema-change` (Percona Toolkit) for MySQL to create indexes online with minimal impact. Always test index creation on a replica or staging first to estimate duration.

### How do I use table partitioning with indexes?

Partitioning splits a large table into smaller physical pieces. In PostgreSQL, use declarative partitioning: `CREATE TABLE orders (id serial, created_at timestamp, ...) PARTITION BY RANGE (created_at)`. Create partitions per month: `CREATE TABLE orders_2025_01 PARTITION OF orders FOR VALUES FROM ('2025-01-01') TO ('2025-02-01')`. Each partition has its own indexes — create indexes on the parent and PostgreSQL propagates them to all partitions. The planner uses partition pruning to skip irrelevant partitions: a query `WHERE created_at >= '2025-01-01'` only scans `orders_2025_01`. For indexes on partitioned tables, use `CREATE INDEX ON orders(user_id)` — PostgreSQL creates a child index on each partition automatically. For hash partitioning, use `PARTITION BY HASH (user_id)` to distribute rows evenly across partitions. Choose the partition key based on query patterns — if most queries filter by date, partition by date; if by tenant, partition by `tenant_id`.

### How do I handle index-only scans and visibility maps?

Index-only scans return data directly from the index without accessing the heap. PostgreSQL requires all referenced columns to be in the index and the visibility map to mark pages as all-visible. The visibility map tracks which pages contain only tuples visible to all transactions. Run `VACUUM` to update the visibility map: `VACUUM (ANALYZE) orders`. Check visibility map coverage with `pg_visibility` extension: `SELECT * FROM pg_visibility('orders')`. If `all_visible` is low, index-only scans will fall back to heap fetches. Set `ALTER TABLE orders SET (autovacuum_vacuum_scale_factor = 0.05)` to vacuum more frequently and keep the visibility map current. In MySQL, InnoDB secondary indexes always store the primary key, so covering indexes work without a visibility map equivalent. Monitor index-only scan effectiveness in `EXPLAIN (ANALYZE, BUFFERS)` — `Heap Fetches: 0` means pure index-only scan.

### How do I benchmark index performance before production deployment?

Create a staging database with production-like data volume. Use `pg_dump` to export a representative sample: `pg_dump --table=orders --data-only prod_db | psql staging_db`. Run representative queries with `EXPLAIN (ANALYZE, BUFFERS)` before and after adding indexes. Measure query latency with `pgbench`: write a custom script file with your queries and run `pgbench -c 10 -j 4 -T 60 -f script.sql`. Compare p99 latency, throughput (TPS), and buffer hit ratio. Test write impact: run `pgbench` with write workload (`pgbench -i -c 10 -T 60`) with and without the new indexes. Monitor index size: `SELECT pg_size_pretty(pg_relation_size('idx_name'))`. For large tables, estimate index build time on a subset first: `CREATE INDEX ON orders_subset(column)` and extrapolate. Document the benchmark results in your deployment runbook.

### How do I handle indexes on foreign key columns?

Foreign key columns often need indexes for join performance and to prevent lock escalation. PostgreSQL does not automatically index foreign key columns. Without an index on the FK column, deleting a parent row requires a full table scan on the child table to verify no references exist — this can cause lock contention on large tables. Always index FK columns: `CREATE INDEX idx_orders_user_id ON orders(user_id)`. For composite foreign keys, create a composite index matching the FK columns: `CREATE INDEX idx_order_items_order_id_product_id ON order_items(order_id, product_id)`. In MySQL, InnoDB automatically creates an index on the foreign key column. In PostgreSQL, check for missing FK indexes with: `SELECT conrelid::regclass AS table, conname AS constraint FROM pg_constraint WHERE contype = 'f' AND NOT EXISTS (SELECT 1 FROM pg_index WHERE indrelid = conrelid AND conkey @> indkey)`.

### How do I deal with index bloat on high-update tables?

Tables with frequent `UPDATE` operations accumulate dead tuples rapidly. In PostgreSQL, each `UPDATE` creates a new row version and marks the old one as dead — the index must point to the new version. Use HOT (Heap-Only Tuple) updates to avoid index updates when the updated columns are not indexed: `ALTER TABLE orders SET (fillfactor = 80)` leaves 20% free space in each page for in-place updates. HOT updates skip index updates when the new row fits in the same page. Monitor HOT update ratio: `SELECT n_tup_hot_upd::float / NULLIF(n_tup_upd, 0) AS hot_ratio FROM pg_stat_user_tables WHERE relname = 'orders'`. A ratio near 1.0 means most updates are HOT. For columns that change frequently (e.g., `last_seen`, `status`), consider whether the index is necessary — removing it enables more HOT updates. Schedule regular `VACUUM` or use `pg_repack` to reclaim space without exclusive locks.

### How do I use hypothetical indexes for testing without building them?

PostgreSQL extension `hypopg` creates hypothetical indexes in memory without consuming disk or blocking writes: `CREATE EXTENSION hypopg; SELECT * FROM hypopg_create_index('CREATE INDEX idx_test ON orders(user_id, status)')`. Run `EXPLAIN` on your query — the planner considers the hypothetical index. This lets you test whether an index would be used before spending time building it on a large table. Remove the hypothetical index with `SELECT * FROM hypopg_drop_index(idx_oid)` or `SELECT hypopg_reset()`. The hypothetical index exists only in your session — other connections do not see it. Use this for index design iteration: create hypothetical indexes for different column combinations, check which ones the planner uses, then build only the effective ones. This is especially useful for tables with billions of rows where index creation takes hours.

### How do I handle index statistics and planner cost estimation?

The query planner uses statistics to estimate row counts and choose execution plans. Run `ANALYZE table_name` after bulk loads or schema changes to update statistics. Check statistics with `SELECT * FROM pg_stats WHERE tablename = 'orders'` — look at `most_common_vals` and `most_common_freqs` for column value distribution. Increase statistics target for columns with skewed distributions: `ALTER TABLE orders ALTER COLUMN status SET STATISTICS 1000` (default is 100). Higher statistics target improves plan accuracy but increases `ANALYZE` time. If the planner chooses bad plans despite correct statistics, adjust cost parameters: `SET random_page_cost = 1.1` (default 4.0) for SSD storage where random reads are cheap. Set `effective_cache_size = '8GB'` to tell the planner how much memory is available for caching. Monitor plan changes with `auto_explain` extension: `LOAD 'auto_explain'; SET auto_explain.log_min_duration = 100` to log plans for slow queries automatically.

### How do I manage indexes across database migrations?

Track index changes in migration files alongside schema changes. Use a migration tool like `flyway`, `liquibase`, or `sqitch` to version-control index creation and drops. Each migration file should include both `UP` (create index) and `DOWN` (drop index) scripts. For zero-downtime deployments, use `CREATE INDEX CONCURRENTLY` in migrations — note that this cannot run inside a transaction block, so configure your migration tool to disable transaction wrapping for these statements. In Flyway, set `executeInTransaction: false` for the migration. Test migrations on a staging replica with production data volume to estimate execution time. Include index size estimates in migration PRs: `SELECT pg_size_pretty(pg_relation_size('table_name')) * 0.15` as a rough index size estimate (15% of table size for a single-column B-tree). Document rollback procedures — dropping a `CONCURRENTLY` index is safe and non-blocking.

### How do I optimize indexes for ORDER BY and pagination queries?

For `ORDER BY created_at DESC LIMIT 20` queries, create an index matching the sort order: `CREATE INDEX idx_orders_created_desc ON orders(created_at DESC)`. The planner can use a backward index scan to return the first 20 rows without sorting. For keyset pagination (cursor-based), index the pagination columns: `CREATE INDEX idx_orders_cursor ON orders(created_at DESC, id DESC)`. Query with `WHERE (created_at, id) < ('2025-01-15', 12345) ORDER BY created_at DESC, id DESC LIMIT 20`. This avoids `OFFSET` which degrades performance on deep pages. For `ORDER BY` with `WHERE` filters, put filter columns first in the index: `CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC)` for `WHERE status = 'active' ORDER BY created_at DESC`. Monitor sort operations in `EXPLAIN (ANALYZE, BUFFERS)` — look for `Sort` nodes with high `Sort Space Used` which indicate missing sort indexes.

### How do I handle index corruption and repair strategies?

Index corruption can occur after hardware failures, power outages, or filesystem issues. Symptoms include queries returning incorrect results, `ERROR: invalid memory alloc request size` or `ERROR: index "idx_name" contains unexpected page`. Detect corruption with `amcheck` extension in PostgreSQL: `CREATE EXTENSION amcheck; SELECT bt_index_check('idx_name')`. For deeper checks, use `bt_index_parent_check` which verifies the index against the heap. To repair, drop and recreate the index: `DROP INDEX idx_name; CREATE INDEX idx_name ON table_name(column)`. Use `REINDEX INDEX idx_name` as an alternative — it rebuilds the index in place. For corruption on a primary key, use `REINDEX TABLE table_name` to rebuild all indexes. If corruption affects the heap (not just indexes), restore from a backup or use `pg_resetwal` as a last resort. Always investigate the root cause — repeated corruption indicates hardware or filesystem problems. Monitor filesystem health with `smartctl` and PostgreSQL logs for `PANIC` or `FATAL` messages.

### How do I use conditional indexes for soft-delete patterns?

Soft-deleted records use a `deleted_at` timestamp column. Queries typically filter `WHERE deleted_at IS NULL` to exclude deleted rows. Create a partial index: `CREATE INDEX idx_active_orders ON orders(user_id) WHERE deleted_at IS NULL`. This index is smaller than a full index because it excludes deleted rows. The planner uses this index only when the query includes `WHERE deleted_at IS NULL`. If some queries forget the filter, the planner falls back to a full scan — enforce the filter at the application level or via a view: `CREATE VIEW active_orders AS SELECT * FROM orders WHERE deleted_at IS NULL`. For tables with a `status` column instead of `deleted_at`, use `WHERE status != 'deleted'`. Monitor partial index usage with `pg_stat_user_indexes` — if `idx_scan` is low, check whether queries include the matching predicate. For mixed workloads (some queries need deleted records), create a separate full index on `deleted_at` for admin queries: `CREATE INDEX idx_orders_deleted_at ON orders(deleted_at) WHERE deleted_at IS NOT NULL`.

### How do I manage index memory usage in shared_buffers?

PostgreSQL caches index pages in `shared_buffers`. Monitor index cache usage with `pg_buffercache` extension: `CREATE EXTENSION pg_buffercache; SELECT c.relname, count(*) AS pages FROM pg_buffercache b JOIN pg_class c ON c.oid = b.relfilenode WHERE c.relkind = 'i' GROUP BY c.relname ORDER BY pages DESC`. If a single index consumes too many buffer pages, consider whether the index is too wide or the table needs partitioning. Set `shared_buffers` to 25% of available RAM as a starting point. For index-heavy workloads, increase to 30-40%. Use `pg_prewarm` to load indexes into cache after restarts: `SELECT pg_prewarm('idx_name')`. Monitor cache hit ratio per index: `SELECT schemaname, indexname, idx_blks_hit::float / NULLIF(idx_blks_hit + idx_blks_read, 0) AS hit_ratio FROM pg_statio_user_indexes`. A hit ratio below 90% indicates the index does not fit in memory — consider adding RAM, reducing index size, or partitioning the table.

### How do I handle indexes in read replicas and replication lag?

Read replicas serve read-heavy workloads but introduce replication lag. Indexes on the primary are automatically created on replicas through WAL replication. However, `CREATE INDEX CONCURRENTLY` on the primary generates more WAL traffic, increasing lag temporarily. Monitor replication lag with `pg_stat_replication` on the primary: `SELECT application_name, write_lag, flush_lag, replay_lag FROM pg_stat_replication`. On the replica, check `pg_stat_wal_receiver` for lag metrics. If lag exceeds your SLA, consider creating indexes directly on the replica with `CREATE INDEX` (non-concurrent) during low-traffic windows — this does not affect the primary but the index will be overwritten by the next WAL replay. For logical replication, indexes must be created independently on each subscriber. Use `pg_stat_progress_create_index` to monitor index build progress on large tables. For synchronous replication, index creation on the primary blocks until the replica confirms — use asynchronous replication for index maintenance windows.

### How do I use indexes for GROUP BY and aggregate queries?

`GROUP BY` queries benefit from indexes matching the grouping columns. `CREATE INDEX idx_orders_status ON orders(status)` optimizes `SELECT status, COUNT(*) FROM orders GROUP BY status`. The planner uses an Index-Only Scan to count rows per group without sorting. For `GROUP BY user_id, status`, create a composite index: `CREATE INDEX idx_orders_user_status ON orders(user_id, status)`. For aggregates like `MAX(created_at) WHERE user_id = 1`, the planner can use a backward index scan on `CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC)` to find the maximum in O(1). For `COUNT(*)` queries, PostgreSQL does not use indexes for full table counts — it scans the heap. Use approximate counts with `pg_class.reltuples` or maintain a counter table for exact counts. For `DISTINCT` queries, `SELECT DISTINCT status FROM orders` uses an Index-Only Scan on `idx_orders_status` to return unique values without sorting.

### How do I handle indexes for UUID primary keys?

UUIDs as primary keys have implications for index performance. Random UUIDs (v4) cause B-tree index fragmentation because inserts are distributed randomly across the index, leading to poor cache locality and page splits. Use UUID v7 or ULID for time-ordered UUIDs — they are sortable and append to the end of the index, reducing fragmentation. In PostgreSQL, use the `uuid-ossp` extension: `CREATE EXTENSION "uuid-ossp"; SELECT uuid_generate_v7()` (available in PostgreSQL 18+). For older versions, use `gen_random_uuid()` for v4 or implement v7 in application code. Compare insert throughput: random UUIDs can be 20-30% slower than sequential IDs on high-volume tables. Monitor index fragmentation with `pgstattuple`: `SELECT * FROM pgstattuple('idx_pkey')` — high `free_percent` indicates page splits. Consider using `bigint` with `GENERATED ALWAYS AS IDENTITY` for high-volume tables where insert performance is critical. If UUIDs are required for distributed systems, use UUID v7 or combine a `bigint` sequence with a `tenant_id` prefix for composite primary keys.

### How do I use indexes for JSONB containment and existence queries?

PostgreSQL JSONB columns support specialized indexing for containment (`@>`) and existence (`?`, `?|`, `?&`) operators. Create a GIN index: `CREATE INDEX idx_data_gin ON events USING gin(data)`. Query with `WHERE data @> '{"type": "click"}'` to find rows where `data` contains the key-value pair. The GIN index supports `@>`, `?`, `?|`, and `?&` operators. For specific JSONB path queries, use expression indexes: `CREATE INDEX idx_data_type ON events(((data->>'type')::text))` for `WHERE data->>'type' = 'click'`. For JSONB array containment, `WHERE data->'tags' ? 'urgent'` checks if the `tags` array contains `'urgent'` — GIN indexes this efficiently. Use `jsonb_path_ops` for smaller GIN indexes that only support `@>` but are more compact: `CREATE INDEX idx_data_path ON events USING gin(data jsonb_path_ops)`. Monitor GIN index performance with `EXPLAIN (ANALYZE)` — GIN indexes can be slow to update, so consider `fastupdate = on` (default) which batches insertions into a pending list before merging into the main index structure.

### How do I handle index-only scans with PostgreSQL hint bits?

Hint bits are PostgreSQL's optimization for avoiding transaction status checks during index-only scans. Each tuple has hint bits that indicate whether the inserting transaction committed or aborted. When hint bits are set, the visibility check is fast — no need to consult `pg_clog`/`pg_xact`. However, on freshly vacuumed tables or after bulk loads, hint bits may not be set yet, causing index-only scans to fall back to heap fetches for visibility checks. Run `VACUUM (ANALYZE)` after bulk loads to set hint bits: `VACUUM (ANALYZE, FREEZE) orders`. The `FREEZE` option marks tuples as permanently visible, eliminating future visibility checks. Monitor hint bit effectiveness with `EXPLAIN (ANALYZE, BUFFERS)` — if `Heap Fetches` is high despite a covering index, hint bits may be unset. Use `pg_visibility_map()` to check visibility map status per page. For tables with frequent updates, set `ALTER TABLE orders SET (autovacuum_freeze_min_age = 50000)` to freeze tuples earlier, improving index-only scan reliability.

### How do I monitor and alert on index health in production?

Set up monitoring queries to track index health metrics. Check unused indexes weekly: `SELECT schemaname, relname, indexrelname, idx_scan FROM pg_stat_user_indexes WHERE idx_scan = 0 AND indexrelname NOT LIKE '%_pkey' ORDER BY pg_relation_size(indexrelid) DESC`. Alert when index bloat exceeds 30%: use `pgstattuple` to measure `SELECT * FROM pgstattuple('idx_name')` and compare `free_percent`. Monitor index cache hit ratio: `SELECT indexname, idx_blks_hit::float / NULLIF(idx_blks_hit + idx_blks_read, 0) FROM pg_statio_user_indexes WHERE idx_blks_read > 0`. Set up alerts in Prometheus with `postgres_exporter` — track `pg_stat_user_indexes_idx_scan` for usage trends. For index size growth, query `SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid)) FROM pg_indexes ORDER BY pg_relation_size(indexrelid) DESC LIMIT 20`. Schedule weekly `REINDEX` jobs for high-bloat indexes using `pg_cron`: `SELECT cron.schedule('reindex_weekly', '0 3 * * 0', 'REINDEX INDEX CONCURRENTLY idx_name')`. Document index health baselines after each deployment to detect regressions.

### How do I handle indexes for geospatial queries with PostGIS?

PostGIS provides GiST indexes for geospatial columns. Create a GiST index on geometry columns: `CREATE INDEX idx_locations_geom ON locations USING gist(geom)`. Query with `WHERE ST_DWithin(geom, ST_MakePoint(-73.9, 40.7)::geography, 1000)` to find points within 1km — the GiST index uses bounding box filtering for fast candidate selection. For nearest-neighbor queries, use `<->` operator: `SELECT * FROM locations ORDER BY geom <-> ST_MakePoint(-73.9, 40.7) LIMIT 10`. The GiST index supports KNN searches efficiently. For geography columns, cast to geography for distance calculations: `CREATE INDEX idx_locations_geog ON locations USING gist(geog)`. Use `ST_DWithin` for radius queries and `<->` for nearest-neighbor. For large datasets, cluster the table by the GiST index: `CLUSTER locations USING idx_locations_geom` to improve spatial locality. Monitor index effectiveness with `EXPLAIN (ANALYZE)` — look for `Index Scan using idx_locations_geom` with low `Rows Removed by Filter`.

### How do I use indexes for exclusion constraints?

Exclusion constraints prevent overlapping ranges in a table — useful for booking systems, scheduling, and version ranges. Create an exclusion constraint: `ALTER TABLE bookings ADD EXCLUDE USING gist (room_id WITH =, time_range WITH &&)`. This prevents two bookings for the same room with overlapping time ranges. The constraint uses a GiST index internally — `CREATE EXTENSION btree_gist` is required for combining scalar types (`room_id WITH =`) with range types (`time_range WITH &&`). For daterange columns: `ALTER TABLE pricing ADD EXCLUDE USING gist (product_id WITH =, valid_period WITH &&)`. Test constraint violations: `INSERT INTO bookings (room_id, time_range) VALUES (1, daterange('2025-01-10', '2025-01-15'))` — if a conflicting booking exists, PostgreSQL raises `ERROR: conflicting key value violates exclusion constraint`. Monitor exclusion constraint index usage with `pg_stat_user_indexes`. For large tables, ensure the GiST index is maintained with regular `VACUUM` to prevent bloat from range updates.

### How do I handle index dependencies and safe removal?

Before dropping an index, check for dependencies. PostgreSQL tracks index usage in `pg_depend` — constraints and unique indexes have implicit dependencies. Query: `SELECT conname, contype FROM pg_constraint WHERE conindid = 'idx_name'::regclass`. If the index backs a unique or primary key constraint, drop the constraint instead: `ALTER TABLE orders DROP CONSTRAINT orders_pkey`. For foreign keys referencing the index, check: `SELECT conname FROM pg_constraint WHERE confrelid = 'orders'::regclass`. Check active queries using the index: `SELECT * FROM pg_stat_activity WHERE query LIKE '%orders%'`. Drop indexes during low-traffic windows: `DROP INDEX CONCURRENTLY idx_name` avoids blocking writes. After dropping, monitor query performance for 24-48 hours — if queries degrade, recreate the index. Use `pg_stat_statements` to compare query latency before and after: `SELECT query, mean_exec_time, calls FROM pg_stat_statements WHERE query LIKE '%orders%' ORDER BY mean_exec_time DESC`.

### How do I use indexes for tsvector full-text search?

PostgreSQL full-text search uses `tsvector` and `tsquery` types with GIN or GiST indexes. Create a `tsvector` column: `ALTER TABLE articles ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || body)) STORED`. Create a GIN index: `CREATE INDEX idx_articles_search ON articles USING gin(search_vector)`. Query with: `SELECT * FROM articles WHERE search_vector @@ to_tsquery('english', 'postgres & index')`. GIN indexes are faster for reads but slower to update. GiST indexes are faster to update but less precise — they may return false positives that need re-checking. For ranking, use `ts_rank`: `SELECT title, ts_rank(search_vector, query) AS rank FROM articles, to_tsquery('postgres & index') query WHERE search_vector @@ query ORDER BY rank DESC`. For multi-language content, use different configurations: `to_tsvector('spanish', body)` with a separate GIN index. Use `websearch_to_tsquery` for natural language input: `WHERE search_vector @@ websearch_to_tsquery('english', 'postgres index performance')`.

### How do I handle index maintenance automation?

Automate index maintenance with scheduled jobs. Use `pg_cron` for PostgreSQL: `CREATE EXTENSION pg_cron; SELECT cron.schedule('vacuum_analyze_weekly', '0 2 * * 0', 'VACUUM (ANALYZE) orders')`. Schedule `REINDEX CONCURRENTLY` for high-bloat indexes monthly: `SELECT cron.schedule('reindex_monthly', '0 3 1 * *', 'REINDEX INDEX CONCURRENTLY idx_orders_user_id')`. Use `pg_repack` for online index rebuilds without locks: `pg_repack -t orders -i idx_orders_user_id -h localhost -U postgres`. Monitor job execution in `cron.job_run_details`. Set up alerts for failed jobs. For MySQL, use `pt-index-usage` (Percona Toolkit) to identify unused indexes: `pt-index-usage /var/log/mysql/slow.log --host=localhost`. Automate unused index detection with a weekly report query stored as a view.

### How do I handle indexes for enum and boolean columns?

Enum and boolean columns have low cardinality, making B-tree indexes less effective. For boolean columns (`is_active`, `is_deleted`), use partial indexes: `CREATE INDEX idx_active_users ON users(id) WHERE is_active = true`. This indexes only the active rows, keeping the index small. For enum columns with skewed distributions, partial indexes on the most common values: `CREATE INDEX idx_pending_orders ON orders(user_id) WHERE status = 'pending'`. If the enum has balanced distribution across 3-5 values, a regular B-tree index may suffice. Monitor selectivity: `SELECT status, COUNT(*) FROM orders GROUP BY status` — if one value dominates (>80%), a partial index on the minority values is more efficient. For PostgreSQL enum types, the index stores the enum's internal sort order, so range queries on enums work naturally. For MySQL, enum columns are stored as integers internally — B-tree indexes on enums behave like integer indexes. Use `SHOW INDEX FROM table_name` to verify enum index cardinality in MySQL.

## See Also

- [Batch Processing Patterns](/recipes/performance/batch-processing-patterns) — optimizing bulk data operations
- [Web Performance](/recipes/performance/web-performance) — frontend and backend performance techniques
- [Load Testing](/recipes/performance/load-testing) — validating database performance under load
