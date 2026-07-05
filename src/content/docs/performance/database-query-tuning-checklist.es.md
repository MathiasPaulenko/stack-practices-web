---
contentType: docs
slug: database-query-tuning-checklist
templateType: guideline
title: "Checklist de Database Query Tuning"
description: "Checklist para optimizacion sistematica de SQL queries: EXPLAIN plan analysis, index strategy, N+1 query detection, join optimization, pagination patterns, connection pooling, query caching y slow query log triage con ejemplos para PostgreSQL y MySQL."
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

Este checklist guia optimizacion sistematica de SQL queries. Cubre EXPLAIN plan analysis, index strategy, N+1 query detection, join optimization, pagination patterns, connection pooling, query caching y slow query log triage. Usa este checklist cuando diagnoses slow database performance o antes de optimizear un critical query path.

---

## 1. EXPLAIN Plan Analysis

### 1.1 PostgreSQL EXPLAIN

```sql
-- Basic EXPLAIN
EXPLAIN SELECT * FROM orders WHERE customer_id = 123;

-- EXPLAIN con execution stats (corre el query)
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE customer_id = 123;

-- EXPLAIN con detailed timing
EXPLAIN (ANALYZE, BUFFERS, TIMING, FORMAT JSON)
SELECT * FROM orders WHERE customer_id = 123;
```

### 1.2 MySQL EXPLAIN

```sql
-- Basic EXPLAIN
EXPLAIN SELECT * FROM orders WHERE customer_id = 123;

-- EXPLAIN ANALYZE (MySQL 8.0+)
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 123;

-- Show warnings despues de EXPLAIN (reveals rewritten query)
EXPLAIN SELECT * FROM orders WHERE customer_id = 123;
SHOW WARNINGS;
```

### 1.3 Red Flags en EXPLAIN Output

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

### 1.4 Key Metrics para Checkear

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
- [ ] Checkea existing indexes en el table
  - PostgreSQL: \d table_name  o  SELECT * FROM pg_indexes WHERE tablename = 'orders';
  - MySQL: SHOW INDEX FROM orders;

- [ ] Verifica que el query usa un index
  - Corre EXPLAIN — busca Index Scan, no Seq Scan
  - Checkea index en WHERE clause columns
  - Checkea index en JOIN columns
  - Checkea index en ORDER BY columns

- [ ] Addea missing indexes
  - Single-column index para simple equality: CREATE INDEX idx_orders_customer ON orders(customer_id);
  - Composite index para multi-column filters: CREATE INDEX idx_orders_status_date ON orders(status, created_at);
  - Partial index para common filter: CREATE INDEX idx_orders_active ON orders(customer_id) WHERE status = 'active';
  - Covering index (PostgreSQL): CREATE INDEX idx_orders_cover ON orders(customer_id) INCLUDE (total, status);

- [ ] Removee unused indexes
  - PostgreSQL: SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;
  - MySQL: SELECT * FROM sys.schema_unused_indexes;
  - Unused indexes slown down writes y wastean space

- [ ] Checkea index selectivity
  - High selectivity: many distinct values (good para indexing)
  - Low selectivity: few distinct values (boolean, enum — skip index)
  - Formula: SELECT COUNT(DISTINCT column) / COUNT(*) FROM table;
  - Selectivity > 0.3 = good index candidate
```

### 2.2 Index Creation Examples

```sql
-- PostgreSQL: Composite index con WHERE clause order
-- Column order matters: equality first, then range
CREATE INDEX idx_orders_customer_status_date
  ON orders(customer_id, status, created_at);

-- PostgreSQL: Partial index para active orders only
CREATE INDEX idx_orders_active_customer
  ON orders(customer_id)
  WHERE status = 'active';

-- PostgreSQL: Covering index (INCLUDE para non-filter columns)
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
  1 query para fetchear 100 orders
  100 queries para fetchear cada customer's name
  Total: 101 queries

Solution:
  1 query con JOIN para fetchear orders + customer names
  Total: 1 query
```

### 3.2 Detection Methods

```sql
-- PostgreSQL: Enablea query logging
ALTER SYSTEM SET log_min_duration_statement = 0;
SELECT pg_reload_conf();

-- MySQL: Enablea slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 0;

-- Busca repeated identical queries en el log
-- Si ves el same query 100+ times con different parameters, es likely N+1
```

### 3.3 Fixeando N+1 Queries

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

-- Batch loading (cuando JOIN no es feasible)
-- Step 1: Fetchea orders
SELECT id, customer_id, total FROM orders WHERE status = 'active';
-- Step 2: Fetchea all customers en un query
SELECT id, name, email FROM customers WHERE id IN (1, 2, 3, 4, 5, ...100);
```

### 3.4 ORM-Specific Fixes

```python
# Django: select_related (JOIN) para FK, prefetch_related (separate query) para M2M
# Before (N+1):
orders = Order.objects.filter(status='active')
for order in orders:
    print(order.customer.name)  # N+1 query per order

# After (single query con JOIN):
orders = Order.objects.filter(status='active').select_related('customer')
for order in orders:
    print(order.customer.name)  # No extra queries

# After (batch con prefetch_related para reverse FK):
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
- [ ] Verifica que join columns estan indexed
  - Both sides del JOIN deberian tener un index en el join column
  - Foreign keys deberian estar indexed (PostgreSQL no auto-indexea FKs)

- [ ] Usa el correct join type
  - INNER JOIN: solo matching rows (default, fastest)
  - LEFT JOIN: all left rows + matching right (slower si right table es large)
  - CROSS JOIN: cartesian product (evita a menos que intentional)

- [ ] Filtra early
  - Addea WHERE conditions para reducear rows antes de JOIN
  - Usa subqueries para pre-filtear large tables
  - Pushea filters into CTEs para readability

- [ ] Evita joinear unnecessary columns
  - SELECT solo needed columns, no SELECT *
  - Usa covering indexes para evitar table lookups

- [ ] Checkea join order
  - Empieza con el smallest table
  - Filtra el most selective condition first
  - Deja que el query optimizer handlee el order (usualmente correct)
```

### 4.2 Join Optimization Examples

```sql
-- Before: Slow — joinea all orders antes de filterear
SELECT c.name, o.total
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE o.status = 'active' AND o.created_at > '2026-01-01';

-- After: Filtra orders first con subquery
SELECT c.name, active_orders.total
FROM customers c
INNER JOIN (
  SELECT customer_id, total
  FROM orders
  WHERE status = 'active' AND created_at > '2026-01-01'
) active_orders ON c.id = active_orders.customer_id;

-- Usa CTE para readability
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

### 5.1 Evita OFFSET Pagination

```sql
-- Problem: OFFSET scannea y descarta rows (gets slower con deeper pages)
SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 10000;
-- Scannea 10020 rows, returns 20 — wastea 10000 rows de work

-- Solution: Keyset (cursor) pagination usando WHERE + index
SELECT * FROM orders
WHERE created_at < '2026-06-15 10:30:00'
ORDER BY created_at DESC
LIMIT 20;
-- Usa index en created_at, solo lee 20 rows
```

### 5.2 Keyset Pagination Implementation

```sql
-- Page 1: First page
SELECT id, created_at, total
FROM orders
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Page 2: Usa last row's values como cursor
SELECT id, created_at, total
FROM orders
WHERE (created_at, id) < ('2026-06-15 10:30:00', 5000)
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Index para keyset pagination
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
Connection timeout   | 30s         | Fail fast si pool exhausted
Idle timeout         | 10 min      | Close idle connections
Validation query     | SELECT 1    | Health check antes de use
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
-- Crea materialized view para expensive aggregation
CREATE MATERIALIZED VIEW order_summary AS
SELECT
  customer_id,
  COUNT(*) AS total_orders,
  SUM(total) AS total_spent,
  MAX(created_at) AS last_order_date
FROM orders
GROUP BY customer_id;

-- Crea index en materialized view
CREATE INDEX idx_order_summary_customer
  ON order_summary(customer_id);

-- Refresh (non-concurrent blockea reads)
REFRESH MATERIALIZED VIEW order_summary;

-- Refresh concurrently (requiree unique index, non-blocking)
REFRESH MATERIALIZED VIEW CONCURRENTLY order_summary;
```

## Preguntas Frecuentes

### ¿Cómo se si un query needea un index?

Corre `EXPLAIN (ANALYZE)` en el query. Si ves `Seq Scan` (PostgreSQL) o `type: ALL` (MySQL), el database esta scanneando every row en el table. Si el table tiene mas de few hundred rows, addea un index en el columns usados en el WHERE clause. Checkea el `rows` estimate — si el query examina many rows pero returns few, el index esta missing o no es selective enough. Tambien checkea el `Buffers` section en PostgreSQL — si `shared read` es high y `shared hit` es low, el data no esta en cache y disk I/O esta happening. Addea un index y re-corre EXPLAIN para confirmar que usa un Index Scan.

### ¿Cuándo deberia usar un composite index vs un single-column index?

Usa un composite index cuando frequentemente filteas en multiple columns together en el same query. Por ejemplo, si seguido queryeas `WHERE customer_id = ? AND status = ?`, un composite index en `(customer_id, status)` es mas efficient que two separate indexes. Column order matters: pon equality columns first, luego range columns. Si a veces queryeas solo `customer_id`, el composite index `(customer_id, status)` still funciona para ese query — el leftmost prefix rule aplica. Si queryeas solo `status`, el composite index no se usara — needeas un separate index en `status`. Limita composite indexes a 3-4 columns — wider indexes consumen mas space y son slower para update.

### ¿Cuál es la diferencia entre EXPLAIN y EXPLAIN ANALYZE?

`EXPLAIN` muestra el query plan sin executear el query — estima costs, row counts y scan types basado en statistics. `EXPLAIN ANALYZE` actually executea el query y muestra real execution times, row counts y buffer usage. Usa `EXPLAIN` para quick plan inspection sin side effects. Usa `EXPLAIN (ANALYZE, BUFFERS)` para detailed analysis — muestra cuantos blocks se leeyeron desde cache vs disk. Ten cuidado con `EXPLAIN ANALYZE` en INSERT/UPDATE/DELETE queries — modificara data. Wrapea en un transaction y rollbakea: `BEGIN; EXPLAIN ANALYZE UPDATE ...; ROLLBACK;`.

### ¿Cómo fixeo slow pagination?

Para de usar `OFFSET` — gets slower conforme vas deeper porque el database scannea y descarta all previous rows. Usa keyset (cursor) pagination en vez: storea el last row's sort values y usa `WHERE created_at < ? ORDER BY created_at DESC LIMIT 20` para el next page. Esto usa el index efficiently y solo lee el rows que needeas. Para compound sort keys, usa row-value comparison: `WHERE (created_at, id) < (?, ?)`. Crea un composite index matcheando tu sort order. Si needeas random access a pages (e.g., jump a page 50), considera pre-computear page offsets en un separate table o usar un cached result set.

### ¿Cómo encuentro slow queries en production?

Enablea el slow query log. En PostgreSQL, setea `log_min_duration_statement = 100` para loggear queries que toman mas de 100ms. En MySQL, setea `long_query_time = 0.1` y enablea `slow_query_log`. Usa `pg_stat_statements` (PostgreSQL) o `performance_schema` (MySQL) para encontrar queries con high total execution time, high mean execution time o high call count. Focate en queries que son both slow individualmente y called frequentemente — un 50ms query called 1000 times per second es worse que un 500ms query called once per minute. Usa un APM tool (Datadog, New Relic, Sentry) para application-level query tracking con trace context.
