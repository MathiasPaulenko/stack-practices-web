---
contentType: guides
slug: complete-guide-sql-query-optimization
title: "Guía Completa de SQL Query Optimization"
description: "Optimizar SQL queries. Cubre EXPLAIN plan analysis, index strategies, join optimization, N+1 query detection, query rewriting, materialized views, partitioning, connection pooling y query caching con ejemplos practicos de PostgreSQL y MySQL."
metaDescription: "Optimize SQL queries. Covers EXPLAIN plans, index strategies, join optimization, N+1 detection, materialized views, partitioning, caching."
difficulty: advanced
topics:
  - databases
  - performance
  - data
tags:
  - sql
  - databases
  - guia
  - query-optimization
  - indexing
  - explain-plan
  - n-plus-1
  - performance
relatedResources:
  - /guides/databases/complete-guide-postgresql-replication
  - /guides/databases/complete-guide-mongodb-indexing
  - /guides/databases/complete-guide-database-sharding
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Optimize SQL queries. Covers EXPLAIN plans, index strategies, join optimization, N+1 detection, materialized views, partitioning, caching."
  keywords:
    - sql query optimization
    - explain plan
    - index optimization
    - join optimization
    - n+1 query
    - materialized view
    - query caching
    - postgresql optimization
---

## Introducción

Slow queries son el most common database performance problem. Esta guia cubre EXPLAIN plan analysis, index strategies, join optimization, N+1 query detection, query rewriting, materialized views, partitioning, y query caching con practical examples para PostgreSQL y MySQL.

## EXPLAIN Plan Analysis

### PostgreSQL EXPLAIN

```sql
-- Basic EXPLAIN (shows plan sin executing)
EXPLAIN SELECT * FROM users WHERE email = 'alice@example.com';

-- EXPLAIN ANALYZE (ejecuta el query y shows actual timing)
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'alice@example.com';

-- Con buffers (shows I/O stats)
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users WHERE email = 'alice@example.com';

-- Con verbose output
EXPLAIN (ANALYZE, BUFFERS, VERBOSE) SELECT * FROM users WHERE email = 'alice@example.com';
```

```text
Key nodes en EXPLAIN output:

  Seq Scan          — Full table scan (slow para large tables, puede ser fine para small)
  Index Scan        — Lee index, luego fetchea rows desde table
  Index Only Scan   — Lee solo el index (fastest, necesita all columns en index)
  Bitmap Scan       — Bitmap de matching rows, luego fetch desde table
  Nested Loop       — Para cada row en outer table, scannea inner table
  Hash Join         — Build hash table en smaller side, probe con larger
  Merge Join        — Ambos inputs sorted, merge en join key
  Sort              — In-memory o disk sort
  HashAggregate     — Grouping por hash table
  Limit             — Stops despues de N rows
```

```sql
-- Leyendo un plan: outermost node es el first operation

EXPLAIN ANALYZE
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active'
GROUP BY u.id, u.name
ORDER BY order_count DESC
LIMIT 10;

-- Plan (bottom-up execution):
-- Limit (cost=1234.56..1234.66 rows=10)
--   Sort (cost=1234.56..1235.00 rows=200)
--     HashAggregate (cost=1200.00..1230.00 rows=200)
--       Hash Join (cost=800.00..1100.00 rows=5000)
--         Seq Scan on users u (cost=0.00..100.00 rows=500)
--           Filter: (status = 'active')
--         Hash (cost=500.00..500.00 rows=10000)
--           Seq Scan on orders o (cost=0.00..500.00 rows=10000)

-- Problems:
-- 1. Seq Scan on users — no index en status
-- 2. Seq Scan on orders — no index en user_id
-- 3. Sort before Limit — podria usar index para ordering
```

### MySQL EXPLAIN

```sql
-- MySQL EXPLAIN
EXPLAIN SELECT * FROM users WHERE email = 'alice@example.com';

-- EXPLAIN ANALYZE (MySQL 8.0+)
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'alice@example.com';

-- EXPLAIN FORMAT=JSON (detailed)
EXPLAIN FORMAT=JSON SELECT * FROM users WHERE email = 'alice@example.com';
```

```text
Key columns en MySQL EXPLAIN:

  type:
    const    — Single row match (primary key / unique index)
    eq_ref   — One row per combination (primary key / unique join)
    ref      — Non-unique index lookup
    range    — Index range scan
    index    — Full index scan
    ALL      — Full table scan (bad — necesita index)

  Extra:
    Using index        — Covering index (no table fetch)
    Using where        — Filter despues de fetch
    Using temporary    — Temporary table created (puede ser slow)
    Using filesort     — In-memory o disk sort (puede ser slow)
    Using join buffer  — Block nested loop (no index en join column)
```

## Index Strategies

### Covering Indexes

```sql
-- Un covering index incluye all columns needed por el query
-- PostgreSQL: INCLUDE clause para non-key columns
CREATE INDEX idx_users_email_name ON users (email) INCLUDE (name, id);

-- Ahora este query usa Index Only Scan (no table fetch)
SELECT id, name FROM users WHERE email = 'alice@example.com';

-- MySQL: include columns en el index directly
CREATE INDEX idx_users_email_name ON users (email, name, id);

-- Covering index para un join query
CREATE INDEX idx_orders_user_status ON orders (user_id, status) INCLUDE (id, total);

SELECT id, total FROM orders WHERE user_id = 123 AND status = 'shipped';
-- Usa Index Only Scan
```

### Partial Indexes

```sql
-- PostgreSQL: indexar solo active users
CREATE INDEX idx_active_users_email ON users (email) WHERE status = 'active';

-- Smaller index, faster lookups para active users
SELECT * FROM users WHERE status = 'active' AND email = 'alice@example.com';

-- MySQL: usa functional index o generated column
ALTER TABLE users ADD COLUMN is_active TINYINT GENERATED ALWAYS AS (IF(status='active',1,NULL)) STORED;
CREATE INDEX idx_active_users ON users (is_active, email);
```

### Composite Index Order

```sql
-- Order matters: equality columns first, luego range, luego sort

-- Query: WHERE status = 'active' AND age > 18 ORDER BY created_at DESC
-- Bad: index en (age, status, created_at)
-- Good: index en (status, created_at, age)

CREATE INDEX idx_users_status_created_age ON users (status, created_at DESC, age);

-- Este index soporta:
-- WHERE status = 'active'                                    ✓
-- WHERE status = 'active' AND age > 18                       ✓
-- WHERE status = 'active' ORDER BY created_at DESC           ✓ (no sort needed)
-- WHERE status = 'active' AND age > 18 ORDER BY created_at   ✓ (no sort needed)
```

## Join Optimization

```sql
-- Bad: joineando sin indexes en join columns
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active';

-- Fix: addear indexes en join columns
CREATE INDEX idx_orders_user_id ON orders (user_id);
CREATE INDEX idx_users_status ON users (status) INCLUDE (name);

-- Bad: joineando large tables sin filtering
SELECT c.name, p.title, a.content
FROM comments c
JOIN posts p ON c.post_id = p.id
JOIN authors a ON p.author_id = a.id
WHERE c.created_at > '2026-01-01';

-- Fix: filter early, addear indexes en filter + join columns
CREATE INDEX idx_comments_created_post ON comments (created_at, post_id);
CREATE INDEX idx_posts_author ON posts (id, author_id) INCLUDE (title);
CREATE INDEX idx_authors_id ON authors (id) INCLUDE (name);
```

```sql
-- PostgreSQL: force join method (para testing)
SET enable_nestloop = off;
SET enable_hashjoin = on;
SET enable_mergejoin = on;

-- Hash join es efficient para large unsorted inputs
-- Merge join es efficient cuando ambos inputs son sorted en join key
-- Nested loop es efficient cuando un side es small (few rows)

-- Check si el planner eligio el right join
EXPLAIN ANALYZE
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active';
```

## N+1 Query Detection

```python
# Bad: N+1 queries — 1 query para users, N queries para orders
import sqlite3

conn = sqlite3.connect("app.db")
users = conn.execute("SELECT id, name FROM users").fetchall()

for user in users:
    orders = conn.execute(
        "SELECT * FROM orders WHERE user_id = ?", (user[0],)
    ).fetchall()
    print(f"{user[1]}: {len(orders)} orders")

# 1 + N queries (1 para users, N para cada user's orders)
# Con 1000 users: 1001 queries

# Good: single query con JOIN
results = conn.execute("""
    SELECT u.id, u.name, COUNT(o.id) as order_count
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    GROUP BY u.id, u.name
""").fetchall()

for row in results:
    print(f"{row[1]}: {row[2]} orders")

# 1 query total
```

```python
# N+1 en ORM (SQLAlchemy)
from sqlalchemy.orm import Session

# Bad: lazy loading causa N+1
with Session(engine) as session:
    users = session.query(User).all()
    for user in users:
        print(f"{user.name}: {len(user.orders)} orders")
        # Cada access a user.orders triggerea un separate query

# Good: eager loading con joinedload
from sqlalchemy.orm import joinedload

with Session(engine) as session:
    users = session.query(User).options(
        joinedload(User.orders)
    ).all()
    for user in users:
        print(f"{user.name}: {len(user.orders)} orders")
    # Single query con LEFT JOIN

# Good: selectinload (separate query, pero batched)
from sqlalchemy.orm import selectinload

with Session(engine) as session:
    users = session.query(User).options(
        selectinload(User.orders)
    ).all()
    # 2 queries: one para users, one para all orders de esos users
```

## Query Rewriting

```sql
-- Bad: SELECT * cuando solo necesitas specific columns
SELECT * FROM users WHERE status = 'active';
-- Fetchea all columns, mas I/O, no puede usar covering index

-- Good: selectar solo needed columns
SELECT id, name, email FROM users WHERE status = 'active';
-- Puede usar covering index, less I/O

-- Bad: function en indexed column preventa index usage
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';
-- Index en email NO es used por LOWER()

-- Good: usa un functional index o matchea sin function
CREATE INDEX idx_users_email_lower ON users (LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';
-- Ahora usa el functional index

-- Bad: implicit type conversion preventa index usage
SELECT * FROM orders WHERE order_number = 12345;
-- Si order_number es VARCHAR, esto preventa index usage

-- Good: matchea el column type
SELECT * FROM orders WHERE order_number = '12345';

-- Bad: OR condition que no puede usar un single index
SELECT * FROM users WHERE email = 'alice@example.com' OR phone = '555-1234';
-- Puede causar full table scan

-- Good: UNION ALL con separate indexes
SELECT * FROM users WHERE email = 'alice@example.com'
UNION ALL
SELECT * FROM users WHERE phone = '555-1234' AND email != 'alice@example.com';
-- Cada query usa su own index

-- Bad: leading wildcard preventa index usage
SELECT * FROM products WHERE name LIKE '%laptop%';
-- Full table scan

-- Good: usa full-text search o trigram index
-- PostgreSQL: pg_trgm extension
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
SELECT * FROM products WHERE name LIKE '%laptop%';
-- Usa el GIN trigram index
```

## Materialized Views

```sql
-- PostgreSQL: materialized view para expensive aggregations
CREATE MATERIALIZED VIEW order_summary AS
SELECT
  u.id as user_id,
  u.name,
  COUNT(o.id) as total_orders,
  SUM(o.total) as total_spent,
  MAX(o.created_at) as last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;

-- Crear index en materialized view
CREATE INDEX idx_order_summary_user_id ON order_summary (user_id);
CREATE INDEX idx_order_summary_total_spent ON order_summary (total_spent DESC);

-- Query el materialized view (fast — pre-computed)
SELECT * FROM order_summary ORDER BY total_spent DESC LIMIT 10;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW order_summary;

-- Refresh concurrently (no bloquea reads)
REFRESH MATERIALIZED VIEW CONCURRENTLY order_summary;
-- Requiere un unique index en el materialized view
```

```sql
-- MySQL: usa un regular table con scheduled refresh
CREATE TABLE order_summary AS
SELECT
  u.id as user_id,
  u.name,
  COUNT(o.id) as total_orders,
  SUM(o.total) as total_spent,
  MAX(o.created_at) as last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;

-- Refresh via event scheduler
CREATE EVENT refresh_order_summary
ON SCHEDULE EVERY 1 HOUR
DO
  TRUNCATE TABLE order_summary;
  INSERT INTO order_summary
  SELECT u.id, u.name, COUNT(o.id), SUM(o.total), MAX(o.created_at)
  FROM users u
  LEFT JOIN orders o ON u.id = o.user_id
  GROUP BY u.id, u.name;
```

## Partitioning

```sql
-- PostgreSQL: range partitioning por date
CREATE TABLE orders (
  id BIGSERIAL,
  user_id BIGINT NOT NULL,
  total DECIMAL(10,2),
  status VARCHAR(20),
  created_at TIMESTAMP NOT NULL
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE orders_2026_01 PARTITION OF orders
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE orders_2026_02 PARTITION OF orders
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE orders_2026_03 PARTITION OF orders
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Query con partition pruning
SELECT * FROM orders WHERE created_at >= '2026-02-01' AND created_at < '2026-03-01';
-- Solo scannea orders_2026_02 partition

-- Index en cada partition
CREATE INDEX idx_orders_2026_01_user ON orders_2026_01 (user_id);
CREATE INDEX idx_orders_2026_02_user ON orders_2026_02 (user_id);
```

```sql
-- PostgreSQL: list partitioning por category
CREATE TABLE products (
  id BIGSERIAL,
  name VARCHAR(255),
  category VARCHAR(50) NOT NULL,
  price DECIMAL(10,2)
) PARTITION BY LIST (category);

CREATE TABLE products_electronics PARTITION OF products
  FOR VALUES IN ('electronics', 'computers');

CREATE TABLE products_clothing PARTITION OF products
  FOR VALUES IN ('clothing', 'accessories');

CREATE TABLE products_other PARTITION OF products
  DEFAULT;

-- Query con partition pruning
SELECT * FROM products WHERE category = 'electronics';
-- Solo scannea products_electronics
```

## Connection Pooling

```python
# Bad: abrir un new connection por query
import psycopg2

def get_user(user_id):
    conn = psycopg2.connect("dbname=app user=postgres")
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    return user
# Cada call abre y closea un connection — expensive

# Good: connection pool con psycopg2
from psycopg2 import pool

connection_pool = pool.ThreadedConnectionPool(
    minconn=5,
    maxconn=20,
    dbname="app",
    user="postgres",
    password="password",
    host="localhost",
)

def get_user(user_id):
    conn = connection_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        cur.close()
        return user
    finally:
        connection_pool.putconn(conn)
```

```python
# Good: asyncpg connection pool (async, high performance)
import asyncpg
import asyncio

async def main():
    pool = await asyncpg.create_pool(
        host="localhost",
        database="app",
        user="postgres",
        password="password",
        min_size=5,
        max_size=20,
    )
    
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT * FROM users WHERE id = $1", 123
        )
        print(user)
    
    await pool.close()

asyncio.run(main())
```

## Query Caching

```sql
-- PostgreSQL: usa pg_prewarm para cachear tables en memory
SELECT pg_prewarm('users');
SELECT pg_prewarm('orders', 'main');

-- Check cache hit ratio
SELECT
  schemaname,
  relname,
  heap_blks_read,
  heap_blks_hit,
  CASE WHEN (heap_blks_read + heap_blks_hit) > 0
    THEN heap_blks_hit::float / (heap_blks_read + heap_blks_hit)
    ELSE 0
  END as hit_ratio
FROM pg_statio_user_tables
ORDER BY hit_ratio ASC;
```

```python
# Application-level query caching con Redis
import redis
import json
import hashlib

r = redis.Redis(host="localhost", port=6379)

def cached_query(query: str, params: tuple, ttl: int = 300):
    cache_key = f"query:{hashlib.md5((query + str(params)).encode()).hexdigest()}"
    
    # Try cache first
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Execute query
    results = db.execute(query, params).fetchall()
    
    # Cache results
    r.setex(cache_key, ttl, json.dumps(results, default=str))
    
    return results

# Usage
users = cached_query(
    "SELECT id, name FROM users WHERE status = %s",
    ("active",),
    ttl=60  # Cache por 60 seconds
)
```

## Preguntas Frecuentes

### ¿Cómo leo un EXPLAIN plan?

Lee desde inside out y bottom up. Los innermost nodes ejecutan first. En PostgreSQL, busca `Seq Scan` (full table scan — usualmente necesita un index), `Index Scan` (good), y `Index Only Scan` (best). Checkea `cost` y `rows` estimates — si `rows` es much higher que actual, statistics pueden ser stale (corre `ANALYZE`). En MySQL, checkea el `type` column — `ALL` significa full table scan, `ref` o `eq_ref` significa index lookup. Checkea `Extra` para `Using filesort` o `Using temporary` que indican potential performance issues.

### ¿Qué es el N+1 query problem?

El N+1 problem occurre cuando ejecutas 1 query para fetchar un list de entities, luego N additional queries para fetchar related data para cada entity. Por ejemplo, fetcheando 100 users (1 query), luego fetcheando cada user's orders (100 queries) = 101 total queries. Fixealo usando un JOIN para fetchar all data en un query, o usa eager loading en tu ORM (`joinedload` en SQLAlchemy, `select_related` en Django, `includes` en Rails). El N+1 pattern es un common cause de slow pages en web applications.

### ¿Cuándo deberia usar un materialized view vs un regular view?

Usa un materialized view cuando el underlying query es expensive (aggregations, multi-table joins) y el data no necesita ser real-time. Materialized views storean el result physically — queries son fast porque el computation es done en refresh time. Usa un regular view cuando necesitas real-time data y el query no es expensive. Regular views son just saved SQL — ejecutan el query every time. Refresh materialized views en un schedule o despues de data changes con `REFRESH MATERIALIZED VIEW`.

### ¿Cómo se si mi index esta siendo used?

En PostgreSQL, queriea `pg_stat_user_indexes` para ver index usage statistics. El `idx_scan` column muestra cuantas veces el index ha sido used. Si `idx_scan` es 0, el index es unused y puede ser dropped. En MySQL, usa `SHOW INDEX FROM table` y checkea el `Cardinality` column. Tambien podes usar el `sys.schema_unused_indexes` view. Corre `EXPLAIN` en tus queries para verify que el index aparece en el plan. Recuerda que el planner puede choose no usar un index si el table es small o si most rows matchean.

### ¿Deberia usar connection pooling?

Si, siempre usa connection pooling en production. Abrir un new database connection es expensive — involvea TCP handshake, authentication, y memory allocation. Un connection pool reusa connections across requests, reduciendo latency y resource usage. Usa PgBouncer para PostgreSQL (external pooler, funciona con cualquier client), `asyncpg.create_pool` para async Python, o HikariCP para Java. Configura el pool size basado en tu database's `max_connections` y el number de application instances. Un common starting point es 5-20 connections por application instance.

### ¿Cómo optimizo un slow JOIN?

First, asegurate que ambos join columns tengan indexes. El join column en el inner (larger) table debe estar indexed — sin eso, el database hace un nested loop scan. Checkea el EXPLAIN plan para el join method: hash join es efficient para large unsorted inputs, merge join es efficient cuando ambos inputs son sorted, nested loop es efficient cuando un side es small. Filter early — addear WHERE conditions para reduce rows antes de joinear. Considera denormalizar si frecuentemente joineas los same tables. Usa covering indexes para avoid table fetches. Para complex multi-table joins, experimenta con join order hints.
