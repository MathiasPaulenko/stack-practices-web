---
contentType: recipes
slug: query-optimization
title: "Optimize Slow Database Queries"
description: "How to identify, analyze, and fix slow SQL queries using EXPLAIN, query refactoring, and database-specific optimization techniques."
metaDescription: "Learn database query optimization. Use EXPLAIN, refactor queries, and apply database-specific techniques to fix slow SQL and improve application performance."
difficulty: intermediate
topics:
  - performance
tags:
  - performance
  - database
  - optimization
  - profiling
  - latency
relatedResources:
  - /recipes/database-indexing
  - /recipes/sql-joins
  - /recipes/connection-pooling
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn database query optimization. Use EXPLAIN, refactor queries, and apply database-specific techniques to fix slow SQL and improve application performance."
  keywords:
    - query optimization
    - slow queries
    - sql performance
    - explain analyze
    - database profiling
    - query refactoring
---

## Overview

Slow database queries are one of the most common causes of application performance degradation. A single unoptimized query can consume 100% of a CPU core, hold locks for seconds, or scan millions of rows unnecessarily. The good news is that most slow queries can be dramatically improved with systematic analysis and targeted refactoring.

Query optimization is a three-step process: identify slow queries through logging and monitoring, understand their execution plan with `EXPLAIN`, and apply targeted fixes like indexing, rewriting, or schema changes. This recipe walks through each step with concrete examples.

## When to Use

Use this recipe when:

- Application response times degrade as data volume grows
- Database CPU or I/O usage is consistently high. Check [monitoring and observability](/guides/devops/logging-monitoring-observability-guide).
- [Monitoring tools](/guides/devops/logging-monitoring-observability-guide) flag specific queries as slow query log entries
- Adding pagination, search, or reporting capabilities to existing tables
- Migrating legacy SQL to a new database engine

## Solution

### Identify Slow Queries (PostgreSQL)

```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = '1000ms';
SELECT pg_reload_conf();

-- Query pg_stat_statements for worst offenders
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Analyze with EXPLAIN

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT o.id, o.total, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.created_at > '2025-01-01'
ORDER BY o.total DESC
LIMIT 100;
```

### Refactor N+1 Queries

```python
# BEFORE: N+1 queries (inefficient)
for order in orders:
    customer = db.query("SELECT name FROM customers WHERE id = %s", (order.customer_id,))

# AFTER: Single JOIN query
customers = db.query("""
    SELECT o.id, o.total, c.name
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ANY(%s)
""", ([o.id for o in orders],))
```

### Add Covering Indexes

```sql
-- Without covering index: table lookup for each row
SELECT id, email, name FROM users WHERE active = true;

-- Add covering index (all columns in the query)
CREATE INDEX idx_users_active_covering
ON users (active)
INCLUDE (email, name);

-- Now the query uses Index Only Scan — no table access
```

### Optimize Pagination

```sql
-- SLOW: OFFSET scans all skipped rows
SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 10000;

-- FAST: Keyset pagination using the last seen value
SELECT * FROM orders
WHERE created_at < '2025-06-15 10:30:00'
ORDER BY created_at DESC
LIMIT 20;
```

Keyset (cursor) pagination is O(1) regardless of page depth. OFFSET pagination is O(n) — page 10000 is 500x slower than page 1.

## Explanation

- **EXPLAIN ANALYZE**: Executes the query and shows the actual execution plan, including row counts, filter conditions, and I/O operations. Look for sequential scans, nested loops with high row counts, and sort operations without indexes.
- **N+1 queries**: Occur when code loops over a result set and executes an additional query per iteration. A single well-crafted JOIN or `IN` clause replaces hundreds of individual queries.
- **Covering indexes**: When all columns a query needs are in the index, the database can answer the query without touching the table. This is called an "index-only scan" and can be 10x faster.
- **Query rewriting**: Sometimes the query itself is the problem. Converting `NOT IN` to `NOT EXISTS`, using `UNION ALL` instead of `UNION`, or filtering early with subqueries can dramatically improve performance.

## Variants

| Technique | Impact | Effort | Best For |
|-----------|--------|--------|----------|
| Add [index](/recipes/performance/database-indexing) | High | Low | Missing index on WHERE/JOIN columns |
| Rewrite query | High | Medium | Inefficient joins, subqueries |
| Partition table | Very high | High | Tables > 10M rows with time-based queries |
| Materialized view | High | Medium | Complex aggregations queried frequently |
| Denormalize | Medium | Medium | Read-heavy, few writers |
| Read replica | Medium | High | Read scaling, reporting |

## Advanced: Reading EXPLAIN Output

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT o.id, o.total, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.created_at > '2025-01-01'
ORDER BY o.total DESC
LIMIT 100;
```

Key things to look for in the output:

- **Seq Scan**: Full table scan. Usually bad for large tables. Add an index.
- **Index Scan**: Good — using an index to find rows.
- **Index Only Scan**: Best — all data from the index, no table access.
- **Hash Join**: Good for large joins. Builds a hash table on the smaller relation.
- **Nested Loop**: Good for small result sets. Bad for large ones (O(n*m)).
- **Sort**: Expensive for large result sets. Add an index on the sort column.
- **Buffers: shared hit=X read=Y**: `hit` = cache, `read` = disk. High `read` means disk I/O.
- **Rows removed by filter**: If this is much higher than rows returned, the index is not selective enough.

## Advanced: Query Plan Caching

Most databases cache query plans. Parameterized queries reuse cached plans:

```python
# Good: parameterized — plan is cached
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))

# Bad: string concatenation — new plan each time
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
```

This also prevents SQL injection. See [SQL injection prevention](/recipes/security/sql-injection-prevention) for details.

## Advanced: Batch Operations

```sql
-- SLOW: 1000 individual INSERTs
INSERT INTO logs (message) VALUES ('msg1');
INSERT INTO logs (message) VALUES ('msg2');
-- ... 998 more

-- FAST: single batch INSERT
INSERT INTO logs (message) VALUES
('msg1'), ('msg2'), /* ... */ ('msg1000');

-- Even faster: COPY (PostgreSQL)
COPY logs FROM '/path/to/file.csv' WITH (FORMAT csv);
```

Batch operations reduce network round-trips and transaction overhead. A 1000-row batch INSERT is typically 10-50x faster than 1000 individual INSERTs.

## Advanced: Connection Pooling Impact on Queries

Each query acquires a connection from the pool. If the pool is too small, queries queue waiting for a free connection. This shows up as increased latency without any database-side bottleneck.

```python
# Bad: pool size 5 for a high-traffic service
pool = psycopg2.pool.SimpleConnectionPool(5, 5, dsn=DATABASE_URL)

# Good: pool size based on (core_count * 2) + effective_spikes
pool = psycopg2.pool.ThreadedConnectionPool(
    minconn=10,
    maxconn=50,
    dsn=DATABASE_URL
)
```

Monitor pool wait time separately from query execution time. If pool wait > 10% of total latency, increase pool size or reduce query duration.

## Advanced: Using pg_stat_statements

```sql
-- Enable the extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find the top 10 slowest queries by total time
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Find queries with high variance (unstable performance)
SELECT
    query,
    calls,
    mean_exec_time,
    stddev_exec_time,
    stddev_exec_time / mean_exec_time AS coefficient_of_variation
FROM pg_stat_statements
WHERE calls > 10
ORDER BY coefficient_of_variation DESC
LIMIT 10;
```

Reset statistics after making changes to get clean measurements: `SELECT pg_stat_statements_reset();`.

## What works

- **Filter early**: apply `WHERE` conditions on indexed columns before joins and sorts. The fewer rows that flow through the query pipeline, the faster it runs.
- **Avoid `SELECT *`**: fetching unnecessary columns wastes I/O and memory. Select only the columns you need.
- **Use `EXISTS` instead of `IN` for large subqueries**: `EXISTS` short-circuits on the first match, while `IN` may build a complete intermediate result set.
- **Update table statistics**: the query optimizer relies on statistics to choose plans. Run `ANALYZE` after bulk loads or major data changes.
- **Monitor query plans over time**: execution plans can change as data distribution shifts. Set up alerts when a previously fast query suddenly slows down.

## Common Mistakes

- **Indexing without analyzing**: adding an index on a low-cardinality column (like a boolean) rarely helps and always slows writes.
- **Ignoring query planner hints**: sometimes the optimizer chooses a bad plan. Use hints (`USE INDEX`, `SET enable_seqscan = off`) judiciously when you know better.
- **Not testing with production data volume**: a query that runs in 10ms on a development database with 1,000 rows may take 10 seconds on production with 10 million rows.
- **Premature optimization**: profile first. Do not rewrite perfectly fast queries. Focus on the top 5 slowest queries by total execution time.

## Frequently Asked Questions

### How do I know if a query is using an index?

Check the `EXPLAIN` output. `Index Scan` or `Index Only Scan` means the query is using an index. `Seq Scan` means it is reading the entire table. Look for `Rows removed by filter` — if high, the index is not selective enough.

### Should I always avoid `SELECT *`?

For production queries, yes. Fetching unnecessary columns wastes I/O and memory, and prevents Index Only Scans. For ad-hoc exploration or very small tables, `SELECT *` is fine.

### What is the difference between `EXPLAIN` and `EXPLAIN ANALYZE`?

`EXPLAIN` shows the estimated plan without executing. `EXPLAIN ANALYZE` executes the query and shows actual timings and row counts. Always use `ANALYZE` when tuning — the planner's estimates can be wrong.

### Can ORMs generate efficient queries?

Usually, but not always. ORMs like SQLAlchemy and Hibernate can generate N+1 queries or inefficient joins. See [SQL injection prevention](/recipes/security/sql-injection-prevention) for secure query patterns. Profile the actual SQL they emit and optimize at the SQL level when needed.

### What is a covering index?

An index that includes all columns a query needs. The database can answer the query from the index alone without accessing the table. This is called an Index Only Scan and can be 10x faster. Use `INCLUDE` clause in PostgreSQL or composite indexes in MySQL.

### How do I optimize pagination?

Use keyset (cursor) pagination instead of OFFSET. Keyset pagination uses `WHERE created_at < last_value ORDER BY created_at DESC LIMIT 20` — it is O(1) regardless of page depth. OFFSET pagination scans all skipped rows and gets slower as you go deeper.

### What is the slow query log?

A database feature that logs queries exceeding a time threshold. In PostgreSQL: `log_min_duration_statement = '1000ms'`. In MySQL: `long_query_time = 1`. Use it to identify which queries need optimization. Combine with `pg_stat_statements` for aggregate statistics.

### How do I optimize JOINs?

Ensure join columns are indexed. Use `EXPLAIN` to verify the join strategy: Hash Join for large joins, Nested Loop for small ones. Filter early with WHERE before joining. Avoid joining unnecessary tables. Consider denormalizing if the same join is queried frequently.

### What is query plan caching?

The database caches the execution plan for a query so it does not reparse and reoptimize on each execution. Parameterized queries benefit from plan caching. String-concatenated queries do not — each generates a new plan.

### How do I handle slow queries in production?

Set up slow query logging. Use `pg_stat_statements` (PostgreSQL) or Performance Schema (MySQL) to find the top slowest queries by total time. Optimize the top 5 first — they usually account for 80% of the total time. Add indexes, rewrite queries, or cache results.

### When should I partition a table?

When a table has more than 10 million rows and queries filter on a time range. Partition by month or week. This turns a full table scan into a single partition scan. PostgreSQL supports declarative partitioning by RANGE, LIST, or HASH.

### What is a materialized view?

A precomputed result set stored as a table. Useful for complex aggregations that are queried frequently but change infrequently. Refresh periodically with `REFRESH MATERIALIZED VIEW`. The tradeoff: storage space and refresh time vs query speed.
