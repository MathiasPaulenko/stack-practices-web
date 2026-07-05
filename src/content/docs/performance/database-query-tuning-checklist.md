---
contentType: docs
slug: database-query-tuning-checklist
templateType: guideline
title: "Database Query Tuning Checklist"
description: "Checklist for systematic SQL query optimization: EXPLAIN plan analysis, index strategy, N+1 query detection, join optimization, pagination patterns, connection pooling, query caching, and slow query log triage with examples for PostgreSQL and MySQL."
metaDescription: "Database query tuning checklist: EXPLAIN analysis, index strategy, N+1 detection, join optimization, pagination, connection pooling, slow query log, PostgreSQL MySQL."
difficulty: intermediate
topics:
  - performance
  - databases
tags:
  - sql
  - query-optimization
  - indexing
  - postgresql
  - mysql
  - database-performance
  - explain-plan
relatedResources:
  - /docs/performance/performance-budget-template
  - /docs/performance/load-test-plan-template
  - /docs/devops/kubernetes-resource-quotas-template
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Database query tuning checklist: EXPLAIN analysis, index strategy, N+1 detection, join optimization, pagination, connection pooling, slow query log, PostgreSQL MySQL."
  keywords:
    - database query tuning
    - sql optimization
    - explain plan
    - index strategy
    - n+1 queries
    - slow query log
---

## Overview

This checklist guides systematic SQL query optimization. It covers EXPLAIN plan analysis, index strategy, N+1 query detection, join optimization, pagination patterns, connection pooling, query caching, and slow query log triage. Use this checklist when diagnosing slow database performance or before optimizing a critical query path.

---

## 1. EXPLAIN Plan Analysis

### 1.1 PostgreSQL EXPLAIN

```sql
-- Basic EXPLAIN
EXPLAIN SELECT * FROM orders WHERE customer_id = 123;

-- EXPLAIN with execution stats (actually runs the query)
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE customer_id = 123;

-- EXPLAIN with detailed timing
EXPLAIN (ANALYZE, BUFFERS, TIMING, FORMAT JSON)
SELECT * FROM orders WHERE customer_id = 123;
```

### 1.2 MySQL EXPLAIN

```sql
-- Basic EXPLAIN
EXPLAIN SELECT * FROM orders WHERE customer_id = 123;

-- EXPLAIN ANALYZE (MySQL 8.0+)
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 123;

-- Show warnings after EXPLAIN (reveals rewritten query)
EXPLAIN SELECT * FROM orders WHERE customer_id = 123;
SHOW WARNINGS;
```

### 1.3 Red Flags in EXPLAIN Output

```text
Scan type           | Meaning                          | Fix
────────────────────┼──────────────────────────────────┼──────────────────────────
Seq Scan (Postgres) | Full table scan, no index used   | Add index on filter column
ALL (MySQL)         | Full table scan                  | Add index on filter column
Filesort            | Extra sort step after retrieval  | Add index on ORDER BY columns
Temporary           | Temporary table created          | Optimize GROUP BY or add index
Nested Loop         | O(n*m) join, slow on large tables| Add index on join column
Rows examined high  | Many rows checked, few returned  | Add selective index
Filter ratio > 90%  | Scanning many rows, returning few| Improve index selectivity
```

### 1.4 Key Metrics to Check

```text
Metric (PostgreSQL)     | Good          | Warning        | Bad
────────────────────────┼───────────────┼────────────────┼──────────
Seq Scan rows           | < 100         | 100 - 10000    | > 10000
Index Scan rows         | Any (index)   | -              | -
Sort rows               | < 1000        | 1000 - 50000   | > 50000
Hash Build rows         | < 10000       | 10000 - 100000 | > 100000
Buffers shared hit      | > 90% hit     | 50-90% hit     | < 50% hit
Execution time          | < 10ms        | 10-100ms       | > 100ms
```

---

## 2. Index Strategy

### 2.1 Index Checklist

```text
- [ ] Check existing indexes on the table
  - PostgreSQL: \d table_name  or  SELECT * FROM pg_indexes WHERE tablename = 'orders';
  - MySQL: SHOW INDEX FROM orders;

- [ ] Verify query uses an index
  - Run EXPLAIN — look for Index Scan, not Seq Scan
  - Check for index on WHERE clause columns
  - Check for index on JOIN columns
  - Check for index on ORDER BY columns

- [ ] Add missing indexes
  - Single-column index for simple equality: CREATE INDEX idx_orders_customer ON orders(customer_id);
  - Composite index for multi-column filters: CREATE INDEX idx_orders_status_date ON orders(status, created_at);
  - Partial index for common filter: CREATE INDEX idx_orders_active ON orders(customer_id) WHERE status = 'active';
  - Covering index (PostgreSQL): CREATE INDEX idx_orders_cover ON orders(customer_id) INCLUDE (total, status);

- [ ] Remove unused indexes
  - PostgreSQL: SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;
  - MySQL: SELECT * FROM sys.schema_unused_indexes;
  - Unused indexes slow down writes and waste space

- [ ] Check index selectivity
  - High selectivity: many distinct values (good for indexing)
  - Low selectivity: few distinct values (boolean, enum — skip index)
  - Formula: SELECT COUNT(DISTINCT column) / COUNT(*) FROM table;
  - Selectivity > 0.3 = good index candidate
```

### 2.2 Index Creation Examples

```sql
-- PostgreSQL: Composite index with WHERE clause order
-- Column order matters: equality first, then range
CREATE INDEX idx_orders_customer_status_date
  ON orders(customer_id, status, created_at);

-- PostgreSQL: Partial index for active orders only
CREATE INDEX idx_orders_active_customer
  ON orders(customer_id)
  WHERE status = 'active';

-- PostgreSQL: Covering index (INCLUDE for non-filter columns)
CREATE INDEX idx_orders_customer_cover
  ON orders(customer_id)
  INCLUDE (total, status, created_at);

-- MySQL: Composite index
CREATE INDEX idx_orders_customer_status_date
  ON orders(customer_id, status, created_at);

-- MySQL: Functional index (MySQL 8.0+)
CREATE INDEX idx_orders_lower_email
  ON orders((LOWER(email)));

-- PostgreSQL: Expression index
CREATE INDEX idx_orders_lower_email
  ON orders(LOWER(email));
```

---

## 3. N+1 Query Detection

### 3.1 N+1 Pattern

```text
Problem:
  1 query to fetch 100 orders
  100 queries to fetch each customer's name
  Total: 101 queries

Solution:
  1 query with JOIN to fetch orders + customer names
  Total: 1 query
```

### 3.2 Detection Methods

```sql
-- PostgreSQL: Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 0;
SELECT pg_reload_conf();

-- MySQL: Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 0;

-- Look for repeated identical queries in the log
-- If you see the same query 100+ times with different parameters, it's likely N+1
```

### 3.3 Fixing N+1 Queries

```sql
-- Before: N+1 (ORM-generated)
-- Query 1: SELECT * FROM orders WHERE status = 'active';  -- returns 100 rows
-- Query 2-101: SELECT * FROM customers WHERE id = ?;  -- one per order

-- After: Single JOIN query
SELECT
  o.id,
  o.total,
  o.created_at,
  c.name AS customer_name,
  c.email AS customer_email
FROM orders o
INNER JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'active';

-- Batch loading (when JOIN is not feasible)
-- Step 1: Fetch orders
SELECT id, customer_id, total FROM orders WHERE status = 'active';
-- Step 2: Fetch all customers in one query
SELECT id, name, email FROM customers WHERE id IN (1, 2, 3, 4, 5, ...100);
```

### 3.4 ORM-Specific Fixes

```python
# Django: select_related (JOIN) for FK, prefetch_related (separate query) for M2M
# Before (N+1):
orders = Order.objects.filter(status='active')
for order in orders:
    print(order.customer.name)  # N+1 query per order

# After (single query with JOIN):
orders = Order.objects.filter(status='active').select_related('customer')
for order in orders:
    print(order.customer.name)  # No extra queries

# After (batch with prefetch_related for reverse FK):
customers = Customer.objects.prefetch_related('order_set').all()
for customer in customers:
    for order in customer.order_set.all():  # No extra queries
        print(order.total)
```

```ruby
# Rails: includes / preload / eager_load
# Before (N+1):
orders = Order.where(status: 'active')
orders.each { |o| puts o.customer.name }  # N+1

# After:
orders = Order.includes(:customer).where(status: 'active')
orders.each { |o| puts o.customer.name }  # No extra queries
```

---

## 4. Join Optimization

### 4.1 Join Checklist

```text
- [ ] Verify join columns are indexed
  - Both sides of the JOIN should have an index on the join column
  - Foreign keys should be indexed (PostgreSQL does not auto-index FKs)

- [ ] Use the correct join type
  - INNER JOIN: only matching rows (default, fastest)
  - LEFT JOIN: all left rows + matching right (slower if right table is large)
  - CROSS JOIN: cartesian product (avoid unless intentional)

- [ ] Filter early
  - Add WHERE conditions to reduce rows before JOIN
  - Use subqueries to pre-filter large tables
  - Push filters into CTEs for readability

- [ ] Avoid joining unnecessary columns
  - SELECT only needed columns, not SELECT *
  - Use covering indexes to avoid table lookups

- [ ] Check join order
  - Start with the smallest table
  - Filter the most selective condition first
  - Let the query optimizer handle order (usually correct)
```

### 4.2 Join Optimization Examples

```sql
-- Before: Slow — joins all orders before filtering
SELECT c.name, o.total
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE o.status = 'active' AND o.created_at > '2026-01-01';

-- After: Filter orders first with subquery
SELECT c.name, active_orders.total
FROM customers c
INNER JOIN (
  SELECT customer_id, total
  FROM orders
  WHERE status = 'active' AND created_at > '2026-01-01'
) active_orders ON c.id = active_orders.customer_id;

-- Use CTE for readability
WITH active_orders AS (
  SELECT customer_id, total
  FROM orders
  WHERE status = 'active' AND created_at > '2026-01-01'
)
SELECT c.name, ao.total
FROM customers c
INNER JOIN active_orders ao ON c.id = ao.customer_id;
```

---

## 5. Pagination Patterns

### 5.1 Avoid OFFSET Pagination

```sql
-- Problem: OFFSET scans and discards rows (gets slower with deeper pages)
SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 10000;
-- Scans 10020 rows, returns 20 — wastes 10000 rows of work

-- Solution: Keyset (cursor) pagination using WHERE + index
SELECT * FROM orders
WHERE created_at < '2026-06-15 10:30:00'
ORDER BY created_at DESC
LIMIT 20;
-- Uses index on created_at, only reads 20 rows
```

### 5.2 Keyset Pagination Implementation

```sql
-- Page 1: First page
SELECT id, created_at, total
FROM orders
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Page 2: Use last row's values as cursor
SELECT id, created_at, total
FROM orders
WHERE (created_at, id) < ('2026-06-15 10:30:00', 5000)
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Index for keyset pagination
CREATE INDEX idx_orders_created_id
  ON orders(created_at DESC, id DESC);
```

---

## 6. Connection Pooling

### 6.1 Pool Configuration

```text
Setting              | Recommended | Description
─────────────────────┼─────────────┼──────────────────────────────────
Pool size            | (core_count * 2) + effective_spindle_count
Min idle             | Pool size   | Keep connections warm
Max lifetime         | 30 min      | Prevent stale connections
Connection timeout   | 30s         | Fail fast if pool exhausted
Idle timeout         | 10 min      | Close idle connections
Validation query     | SELECT 1    | Health check before use
```

### 6.2 PostgreSQL: PgBouncer

```ini
# pgBouncer configuration
[databases]
mydb = host=127.0.0.1 port=5432 dbname=mydb

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
pool_mode = transaction
max_client_conn = 200
default_pool_size = 20
min_pool_size = 5
server_idle_timeout = 600
server_lifetime = 3600
```

### 6.3 Application-Level Pooling

```python
# Python: SQLAlchemy pool configuration
engine = create_engine(
    'postgresql://user:pass@localhost/mydb',
    pool_size=20,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True,
)
```

---

## 7. Query Caching

### 7.1 Caching Strategy

```text
Cache layer    | TTL      | When to use
───────────────┼──────────┼──────────────────────────────────
Application    | 5-60s    | Frequently read, rarely changed
Redis/Memcached| 1-60min  | Shared across instances, fast lookup
Database       | Session  | Materialized views, result cache
CDN            | 1-24h    | API responses, static-ish data
```

### 7.2 PostgreSQL Materialized Views

```sql
-- Create materialized view for expensive aggregation
CREATE MATERIALIZED VIEW order_summary AS
SELECT
  customer_id,
  COUNT(*) AS total_orders,
  SUM(total) AS total_spent,
  MAX(created_at) AS last_order_date
FROM orders
GROUP BY customer_id;

-- Create index on materialized view
CREATE INDEX idx_order_summary_customer
  ON order_summary(customer_id);

-- Refresh (non-concurrent blocks reads)
REFRESH MATERIALIZED VIEW order_summary;

-- Refresh concurrently (requires unique index, non-blocking)
REFRESH MATERIALIZED VIEW CONCURRENTLY order_summary;
```

## FAQ

### How do I know if a query needs an index?

Run `EXPLAIN (ANALYZE)` on the query. If you see `Seq Scan` (PostgreSQL) or `type: ALL` (MySQL), the database is scanning every row in the table. If the table has more than a few hundred rows, add an index on the columns used in the WHERE clause. Check the `rows` estimate — if the query examines many rows but returns few, the index is missing or not selective enough. Also check the `Buffers` section in PostgreSQL — if `shared read` is high and `shared hit` is low, the data is not in cache and disk I/O is happening. Add an index and re-run EXPLAIN to confirm it uses an Index Scan.

### When should I use a composite index vs a single-column index?

Use a composite index when you frequently filter on multiple columns together in the same query. For example, if you often query `WHERE customer_id = ? AND status = ?`, a composite index on `(customer_id, status)` is more efficient than two separate indexes. Column order matters: put equality columns first, then range columns. If you sometimes query only `customer_id`, the composite index `(customer_id, status)` still works for that query — the leftmost prefix rule applies. If you query only `status`, the composite index will not be used — you need a separate index on `status`. Limit composite indexes to 3-4 columns — wider indexes consume more space and are slower to update.

### What is the difference between EXPLAIN and EXPLAIN ANALYZE?

`EXPLAIN` shows the query plan without executing the query — it estimates costs, row counts, and scan types based on statistics. `EXPLAIN ANALYZE` actually executes the query and shows real execution times, row counts, and buffer usage. Use `EXPLAIN` for quick plan inspection without side effects. Use `EXPLAIN (ANALYZE, BUFFERS)` for detailed analysis — it shows how many blocks were read from cache vs disk. Be careful with `EXPLAIN ANALYZE` on INSERT/UPDATE/DELETE queries — it will modify data. Wrap in a transaction and rollback: `BEGIN; EXPLAIN ANALYZE UPDATE ...; ROLLBACK;`.

### How do I fix slow pagination?

Stop using `OFFSET` — it gets slower as you go deeper because the database scans and discards all previous rows. Use keyset (cursor) pagination instead: store the last row's sort values and use `WHERE created_at < ? ORDER BY created_at DESC LIMIT 20` for the next page. This uses the index efficiently and only reads the rows you need. For compound sort keys, use row-value comparison: `WHERE (created_at, id) < (?, ?)`. Create a composite index matching your sort order. If you need random access to pages (e.g., jump to page 50), consider pre-computing page offsets in a separate table or using a cached result set.

### How do I find slow queries in production?

Enable the slow query log. In PostgreSQL, set `log_min_duration_statement = 100` to log queries taking more than 100ms. In MySQL, set `long_query_time = 0.1` and enable `slow_query_log`. Use `pg_stat_statements` (PostgreSQL) or `performance_schema` (MySQL) to find queries with high total execution time, high mean execution time, or high call count. Focus on queries that are both slow individually and called frequently — a 50ms query called 1000 times per second is worse than a 500ms query called once per minute. Use an APM tool (Datadog, New Relic, Sentry) for application-level query tracking with trace context.
