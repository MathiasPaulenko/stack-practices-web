---





contentType: guides
slug: sql-performance-tuning-guide
title: "SQL Performance Tuning — Indexes, Queries, and Explain Plans"
description: "A practical guide to optimizing SQL queries: indexing strategies, query rewriting, EXPLAIN plan analysis, and common anti-patterns to avoid."
metaDescription: "SQL performance tuning guide: indexing strategies, query rewriting, EXPLAIN plans, and anti-patterns. Optimize slow queries for PostgreSQL, MySQL, and SQL Server."
difficulty: intermediate
topics:
  - databases
  - performance
tags:
  - database
  - guide
  - indexing
  - performance
  - sql
relatedResources:
  - /guides/database-design-guide
  - /guides/performance-optimization-guide
  - /recipes/pagination
  - /recipes/database-replication
  - /recipes/database-views-materialized
  - /recipes/optimistic-locking
  - /recipes/sql-index-optimization-analysis
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "SQL performance tuning guide: indexing strategies, query rewriting, EXPLAIN plans, and anti-patterns. Optimize slow queries for PostgreSQL, MySQL, and SQL Server."
  keywords:
    - sql performance tuning
    - query optimization
    - database indexing
    - explain plan
    - slow query fix
    - sql anti-patterns





---

# SQL Performance Tuning

## Introduction

Slow queries are one of the most common causes of application performance problems. This guide walks through practical techniques to identify, diagnose, and fix SQL performance issues across PostgreSQL, MySQL, and SQL Server.

## Finding Slow Queries

### PostgreSQL

```sql
-- pg_stat_statements extension
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Active slow queries
SELECT pid, query, now() - query_start AS duration
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '1 second'
ORDER BY duration DESC;
```

### MySQL

```sql
-- Slow query log (enable in my.cnf)
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;

-- Performance Schema
SELECT sql_text, COUNT_STAR, AVG_TIMER_WAIT/1000000000 AS avg_sec
FROM performance_schema.events_statements_summary_by_digest
ORDER BY AVG_TIMER_WAIT DESC
LIMIT 10;
```

## Understanding EXPLAIN Plans

The EXPLAIN plan reveals how the database executes your query.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name
ORDER BY order_count DESC
LIMIT 10;
```

### Key Plan Operations

| Operation | Meaning | Performance Impact |
|-----------|---------|-------------------|
| **Seq Scan** | Table scan (reads every row) | Slow on large tables; needs index |
| **Index Scan** | Reads index, then fetches matching rows | Fast for selective queries |
| **Index Only Scan** | Reads only the index, no table access | Fastest; requires covering index |
| **Bitmap Heap Scan** | Builds bitmap from index, then fetches rows in batches | Good for moderate selectivity |
| **Nested Loop** | For each row in outer table, scan inner table | Fine for small outer sets |
| **Hash Join** | Builds hash table of inner table, probes with outer | Good for large joins |
| **Merge Join** | Sorts both inputs, merges them | Good for pre-sorted data |

## Indexing Strategies

### B-Tree Indexes (Default)

Best for equality and range queries:

```sql
-- Single column index
CREATE INDEX idx_users_email ON users(email);

-- Composite index (column order matters!)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- Good for: WHERE user_id = ? AND status = ?
-- Bad for:  WHERE status = ? (user_id not leading)
```

### Index Column Order

Place columns in this priority:
1. Equality filters (`=`)
2. Range filters (`>`, `<`, `BETWEEN`, `LIKE 'prefix%'`)
3. Columns used in ORDER BY
4. Columns used in SELECT (for covering indexes)

### Covering Indexes

An index that contains all columns needed for the query, avoiding table lookups:

```sql
CREATE INDEX idx_orders_covering
ON orders(user_id, status, created_at, total)
INCLUDE (id);

-- Query can be satisfied entirely from the index
SELECT id, created_at, total
FROM orders
WHERE user_id = 123 AND status = 'shipped';
```

### Partial Indexes

Index only a subset of rows, reducing size and maintenance cost:

```sql
-- Only index active users
CREATE INDEX idx_users_active_email
ON users(email)
WHERE is_active = true;
```

## Query Rewriting Techniques

### 1. Avoid SELECT *

```sql
-- Bad
SELECT * FROM orders WHERE user_id = 123;

-- Good: fetch only needed columns
SELECT id, status, total FROM orders WHERE user_id = 123;
```

### 2. Use EXISTS Instead of IN for Subqueries

```sql
-- Bad: materializes full subquery result
SELECT * FROM customers
WHERE id IN (SELECT customer_id FROM orders WHERE amount > 1000);

-- Good: stops at first match
SELECT * FROM customers c
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.customer_id = c.id AND o.amount > 1000
);
```

### 3. Avoid Functions on Indexed Columns

```sql
-- Bad: function prevents index usage
SELECT * FROM orders WHERE DATE(created_at) = '2024-01-15';

-- Good: range query uses index
SELECT * FROM orders
WHERE created_at >= '2024-01-15'
  AND created_at < '2024-01-16';
```

### 4. Prefer JOINs Over Correlated Subqueries

```sql
-- Bad: correlated subquery runs once per row
SELECT name,
    (SELECT COUNT(*) FROM orders WHERE user_id = users.id) AS order_count
FROM users;

-- Good: JOIN is more efficient
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

### 5. Batch Updates Instead of One-by-One

```sql
-- Bad: N+1 updates
UPDATE orders SET status = 'shipped' WHERE id = 1;
UPDATE orders SET status = 'shipped' WHERE id = 2;
...

-- Good: single UPDATE with WHERE IN or JOIN
UPDATE orders
SET status = 'shipped'
WHERE id IN (1, 2, 3, ...);
```

## Common Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| **N+1 Queries** | One query per row | Use JOIN or `WHERE IN`. See [database indexing](/recipes/performance/database-indexing). |
| **Missing LIMIT** | Fetching millions of rows | Add `LIMIT` and pagination |
| **Implicit conversions** | Function on column prevents index use | Cast the constant, not the column |
| `SELECT DISTINCT` to fix duplicates | Hides a join problem | Fix the join or schema |
| **Counting all rows** | `SELECT COUNT(*)` on huge tables | Use approximate counts or triggers |
| **No connection pooling** | Connection overhead dominates | Use [connection pooling](/recipes/performance/connection-pooling). |

## What Works

- **Index foreign keys** automatically — joins depend on them
- **Monitor slow query logs** weekly and address the top offenders
- **Analyze tables regularly** — `ANALYZE` updates statistics for the query planner
- **Avoid over-indexing** — each index slows writes and consumes space
- **Use appropriate data types** — `INTEGER` is faster than `VARCHAR` for IDs
- **[Partition large tables](/guides/databases/database-sharding-partitioning-guide)** by date or range when they exceed 10M rows

## Frequently Asked Questions

**Q: How many indexes is too many?**
A: There is no fixed number, but each index slows INSERT/UPDATE/DELETE. Audit indexes quarterly and drop unused ones. PostgreSQL's `pg_stat_user_indexes` shows index usage.

**Q: Should I index every column used in WHERE?**
A: No. Composite indexes often serve multiple queries. Also, the query planner may choose a sequential scan if the table is small or the query returns most rows.

**Q: Why does my query use a sequential scan when I have an index?**
A: The planner estimates that reading the whole table is faster than reading the index plus random table lookups. This is often correct for queries returning >5-10% of rows.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Scenario: Optimizing a Slow E-commerce Dashboard

```sql
-- Problem: Sales dashboard query takes 45 seconds
-- Table: orders (50M rows), order_items (200M rows)

-- Original query:
EXPLAIN ANALYZE
SELECT c.name, SUM(oi.line_total) AS revenue,
       COUNT(DISTINCT o.id) AS orders
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_items oi ON o.id = oi.order_id
WHERE o.created_at >= '2026-01-01'
  AND o.status = 'completed'
GROUP BY c.name
ORDER BY revenue DESC LIMIT 20;

-- Plan: 2 seq scans + hash joins + sort, 45s

-- Fix 1: Add composite indexes
CREATE INDEX idx_orders_date_status ON orders(created_at, status)
  WHERE status = 'completed';
CREATE INDEX idx_order_items_order ON order_items(order_id);
-- Plan: 2 index scans + merge join, 8s

-- Fix 2: Materialized view for pre-aggregation
CREATE MATERIALIZED VIEW mv_daily_sales AS
SELECT DATE(o.created_at) AS sale_date,
       c.name AS customer,
       SUM(oi.line_total) AS revenue,
       COUNT(DISTINCT o.id) AS orders
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_items oi ON o.id = oi.order_id
WHERE o.status = 'completed'
GROUP BY DATE(o.created_at), c.name;

CREATE UNIQUE INDEX idx_mv_daily ON mv_daily_sales(sale_date, customer);
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales;

-- Dashboard query now hits MV:
SELECT customer, SUM(revenue) AS total, SUM(orders) AS order_count
FROM mv_daily_sales
WHERE sale_date >= '2026-01-01'
GROUP BY customer
ORDER BY total DESC LIMIT 20;
-- Plan: seq scan on MV (1M rows) + aggregate, 200ms

-- Fix 3: Connection pooling (PgBouncer)
  [databases]
  production = host=10.0.0.1 port=5432 dbname=app
  [pgbouncer]
  pool_mode = transaction
  max_client_conn = 1000
  default_pool_size = 25
  -- Reduces connection overhead from 50ms to 2ms

-- Fix 4: Partition orders by month
CREATE TABLE orders (
    id BIGSERIAL, customer_id BIGINT, status VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL, total DECIMAL(10,2)
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2026_01 PARTITION OF orders
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
-- Query only scans January partition, not 50M rows

Results:
  | Optimization | Before | After |
  |---------------|--------|-------|
  | No optimization | 45s | - |
  | + Indexes | 45s | 8s |
  | + Materialized view | 8s | 200ms |
  | + Connection pool | 200ms + 50ms conn | 200ms + 2ms |
  | + Partitioning | MV refresh 60s | MV refresh 15s |

Lessons:
  - Indexes alone rarely solve complex analytics queries
  - Materialized views pre-compute expensive aggregations
  - Connection pooling eliminates per-request overhead
  - Partitioning reduces scan scope for time-based queries
  - Always measure with EXPLAIN ANALYZE before and after
```

### When should I use query hints?

Avoid query hints in PostgreSQL (they do not exist). In MySQL, USE INDEX or FORCE INDEX can help when the planner chooses wrong. But hints are band-aids: the real fix is updating statistics (ANALYZE), adding better indexes, or restructuring the query. Hints become stale as data changes and are hard to maintain.
