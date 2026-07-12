---





contentType: guides
slug: complete-guide-sql-query-optimization
title: "Complete Guide to SQL Query Optimization"
description: "Optimize SQL queries. Covers EXPLAIN plan analysis, index strategies, join optimization, N+1 query detection, query rewriting, materialized views, partitioning, connection pooling, and query caching with practical PostgreSQL and MySQL examples."
metaDescription: "Optimize SQL queries. Covers EXPLAIN plans, index strategies, join optimization, N+1 detection, materialized views, partitioning, caching."
difficulty: advanced
topics:
  - databases
  - performance
  - data
tags:
  - sql
  - databases
  - guide
  - query-optimization
  - indexing
  - explain-plan
  - n-plus-1
  - performance
relatedResources:
  - /guides/complete-guide-postgresql-replication
  - /guides/complete-guide-mongodb-indexing
  - /guides/complete-guide-database-sharding
  - /guides/complete-guide-postgresql-tuning
  - /recipes/elasticsearch-aggregations
  - /recipes/schema-evolution
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

## Introduction

Slow queries are the most common database performance problem. The following walks through EXPLAIN plan analysis, index strategies, join optimization, N+1 query detection, query rewriting, materialized views, partitioning, and query caching with practical examples for PostgreSQL and MySQL.

## EXPLAIN Plan Analysis

### PostgreSQL EXPLAIN

```sql
-- Basic EXPLAIN (shows plan without executing)
EXPLAIN SELECT * FROM users WHERE email = 'alice@example.com';

-- EXPLAIN ANALYZE (executes the query and shows actual timing)
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'alice@example.com';

-- With buffers (shows I/O stats)
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users WHERE email = 'alice@example.com';

-- With verbose output
EXPLAIN (ANALYZE, BUFFERS, VERBOSE) SELECT * FROM users WHERE email = 'alice@example.com';
```

```text
Key nodes in EXPLAIN output:

  Seq Scan          — Full table scan (slow for large tables, may be fine for small)
  Index Scan        — Reads index, then fetches rows from table
  Index Only Scan   — Reads only the index (fastest, needs all columns in index)
  Bitmap Scan       — Bitmap of matching rows, then fetch from table
  Nested Loop       — For each row in outer table, scan inner table
  Hash Join         — Build hash table on smaller side, probe with larger
  Merge Join        — Both inputs sorted, merge on join key
  Sort              — In-memory or disk sort
  HashAggregate     — Grouping by hash table
  Limit             — Stops after N rows
```

```sql
-- Reading a plan: outermost node is the first operation

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
-- 1. Seq Scan on users — no index on status
-- 2. Seq Scan on orders — no index on user_id
-- 3. Sort before Limit — could use index for ordering
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
Key columns in MySQL EXPLAIN:

  type:
    const    — Single row match (primary key / unique index)
    eq_ref   — One row per combination (primary key / unique join)
    ref      — Non-unique index lookup
    range    — Index range scan
    index    — Full index scan
    ALL      — Full table scan (bad — needs index)

  Extra:
    Using index        — Covering index (no table fetch)
    Using where        — Filter after fetch
    Using temporary    — Temporary table created (can be slow)
    Using filesort     — In-memory or disk sort (can be slow)
    Using join buffer  — Block nested loop (no index on join column)
```

## Index Strategies

### Covering Indexes

```sql
-- A covering index includes all columns needed by the query
-- PostgreSQL: INCLUDE clause for non-key columns
CREATE INDEX idx_users_email_name ON users (email) INCLUDE (name, id);

-- Now this query uses Index Only Scan (no table fetch)
SELECT id, name FROM users WHERE email = 'alice@example.com';

-- MySQL: include columns in the index directly
CREATE INDEX idx_users_email_name ON users (email, name, id);

-- Covering index for a join query
CREATE INDEX idx_orders_user_status ON orders (user_id, status) INCLUDE (id, total);

SELECT id, total FROM orders WHERE user_id = 123 AND status = 'shipped';
-- Uses Index Only Scan
```

### Partial Indexes

```sql
-- PostgreSQL: index only active users
CREATE INDEX idx_active_users_email ON users (email) WHERE status = 'active';

-- Smaller index, faster lookups for active users
SELECT * FROM users WHERE status = 'active' AND email = 'alice@example.com';

-- MySQL: use functional index or generated column
ALTER TABLE users ADD COLUMN is_active TINYINT GENERATED ALWAYS AS (IF(status='active',1,NULL)) STORED;
CREATE INDEX idx_active_users ON users (is_active, email);
```

### Composite Index Order

```sql
-- Order matters: equality columns first, then range, then sort

-- Query: WHERE status = 'active' AND age > 18 ORDER BY created_at DESC
-- Bad: index on (age, status, created_at)
-- Good: index on (status, created_at, age)

CREATE INDEX idx_users_status_created_age ON users (status, created_at DESC, age);

-- This index supports:
-- WHERE status = 'active'                                    ✓
-- WHERE status = 'active' AND age > 18                       ✓
-- WHERE status = 'active' ORDER BY created_at DESC           ✓ (no sort needed)
-- WHERE status = 'active' AND age > 18 ORDER BY created_at   ✓ (no sort needed)
```

## Join Optimization

```sql
-- Bad: joining without indexes on join columns
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active';

-- Fix: add indexes on join columns
CREATE INDEX idx_orders_user_id ON orders (user_id);
CREATE INDEX idx_users_status ON users (status) INCLUDE (name);

-- Bad: joining large tables without filtering
SELECT c.name, p.title, a.content
FROM comments c
JOIN posts p ON c.post_id = p.id
JOIN authors a ON p.author_id = a.id
WHERE c.created_at > '2026-01-01';

-- Fix: filter early, add indexes on filter + join columns
CREATE INDEX idx_comments_created_post ON comments (created_at, post_id);
CREATE INDEX idx_posts_author ON posts (id, author_id) INCLUDE (title);
CREATE INDEX idx_authors_id ON authors (id) INCLUDE (name);
```

```sql
-- PostgreSQL: force join method (for testing)
SET enable_nestloop = off;
SET enable_hashjoin = on;
SET enable_mergejoin = on;

-- Hash join is efficient for large unsorted inputs
-- Merge join is efficient when both inputs are sorted on join key
-- Nested loop is efficient when one side is small (few rows)

-- Check if the planner chose the right join
EXPLAIN ANALYZE
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active';
```

## N+1 Query Detection

```python
# Bad: N+1 queries — 1 query for users, N queries for orders
import sqlite3

conn = sqlite3.connect("app.db")
users = conn.execute("SELECT id, name FROM users").fetchall()

for user in users:
    orders = conn.execute(
        "SELECT * FROM orders WHERE user_id = ?", (user[0],)
    ).fetchall()
    print(f"{user[1]}: {len(orders)} orders")

# 1 + N queries (1 for users, N for each user's orders)
# With 1000 users: 1001 queries

# Good: single query with JOIN
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
# N+1 in ORM (SQLAlchemy)
from sqlalchemy.orm import Session

# Bad: lazy loading causes N+1
with Session(engine) as session:
    users = session.query(User).all()
    for user in users:
        print(f"{user.name}: {len(user.orders)} orders")
        # Each access to user.orders triggers a separate query

# Good: eager loading with joinedload
from sqlalchemy.orm import joinedload

with Session(engine) as session:
    users = session.query(User).options(
        joinedload(User.orders)
    ).all()
    for user in users:
        print(f"{user.name}: {len(user.orders)} orders")
    # Single query with LEFT JOIN

# Good: selectinload (separate query, but batched)
from sqlalchemy.orm import selectinload

with Session(engine) as session:
    users = session.query(User).options(
        selectinload(User.orders)
    ).all()
    # 2 queries: one for users, one for all orders of those users
```

## Query Rewriting

```sql
-- Bad: SELECT * when you only need specific columns
SELECT * FROM users WHERE status = 'active';
-- Fetches all columns, more I/O, cannot use covering index

-- Good: select only needed columns
SELECT id, name, email FROM users WHERE status = 'active';
-- Can use covering index, less I/O

-- Bad: function on indexed column prevents index usage
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';
-- Index on email is NOT used because of LOWER()

-- Good: use a functional index or match without function
CREATE INDEX idx_users_email_lower ON users (LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';
-- Now uses the functional index

-- Bad: implicit type conversion prevents index usage
SELECT * FROM orders WHERE order_number = 12345;
-- If order_number is VARCHAR, this prevents index usage

-- Good: match the column type
SELECT * FROM orders WHERE order_number = '12345';

-- Bad: OR condition that cannot use a single index
SELECT * FROM users WHERE email = 'alice@example.com' OR phone = '555-1234';
-- May cause full table scan

-- Good: UNION ALL with separate indexes
SELECT * FROM users WHERE email = 'alice@example.com'
UNION ALL
SELECT * FROM users WHERE phone = '555-1234' AND email != 'alice@example.com';
-- Each query uses its own index

-- Bad: leading wildcard prevents index usage
SELECT * FROM products WHERE name LIKE '%laptop%';
-- Full table scan

-- Good: use full-text search or trigram index
-- PostgreSQL: pg_trgm extension
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
SELECT * FROM products WHERE name LIKE '%laptop%';
-- Uses the GIN trigram index
```

## Materialized Views

```sql
-- PostgreSQL: materialized view for expensive aggregations
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

-- Create index on materialized view
CREATE INDEX idx_order_summary_user_id ON order_summary (user_id);
CREATE INDEX idx_order_summary_total_spent ON order_summary (total_spent DESC);

-- Query the materialized view (fast — pre-computed)
SELECT * FROM order_summary ORDER BY total_spent DESC LIMIT 10;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW order_summary;

-- Refresh concurrently (does not block reads)
REFRESH MATERIALIZED VIEW CONCURRENTLY order_summary;
-- Requires a unique index on the materialized view
```

```sql
-- MySQL: use a regular table with scheduled refresh
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
-- PostgreSQL: range partitioning by date
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

-- Query with partition pruning
SELECT * FROM orders WHERE created_at >= '2026-02-01' AND created_at < '2026-03-01';
-- Only scans orders_2026_02 partition

-- Index on each partition
CREATE INDEX idx_orders_2026_01_user ON orders_2026_01 (user_id);
CREATE INDEX idx_orders_2026_02_user ON orders_2026_02 (user_id);
```

```sql
-- PostgreSQL: list partitioning by category
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

-- Query with partition pruning
SELECT * FROM products WHERE category = 'electronics';
-- Only scans products_electronics
```

## Connection Pooling

```python
# Bad: opening a new connection per query
import psycopg2

def get_user(user_id):
    conn = psycopg2.connect("dbname=app user=postgres")
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    return user
# Each call opens and closes a connection — expensive

# Good: connection pool with psycopg2
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
-- PostgreSQL: use pg_prewarm to cache tables in memory
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
# Application-level query caching with Redis
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
    ttl=60  # Cache for 60 seconds
)
```

## FAQ

### How do I read an EXPLAIN plan?

Read from the inside out and bottom up. The innermost nodes execute first. In PostgreSQL, look for `Seq Scan` (full table scan — usually needs an index), `Index Scan` (good), and `Index Only Scan` (best). Check `cost` and `rows` estimates — if `rows` is much higher than actual, statistics may be stale (run `ANALYZE`). In MySQL, check the `type` column — `ALL` means full table scan, `ref` or `eq_ref` means index lookup. Check `Extra` for `Using filesort` or `Using temporary` which indicate potential performance issues.

### What is the N+1 query problem?

The N+1 problem occurs when you execute 1 query to fetch a list of entities, then N additional queries to fetch related data for each entity. For example, fetching 100 users (1 query), then fetching each user's orders (100 queries) = 101 total queries. Fix it by using a JOIN to fetch all data in one query, or use eager loading in your ORM (`joinedload` in SQLAlchemy, `select_related` in Django, `includes` in Rails). The N+1 pattern is a common cause of slow pages in web applications.

### When should I use a materialized view vs a regular view?

Use a materialized view when the underlying query is expensive (aggregations, multi-table joins) and the data does not need to be real-time. Materialized views store the result physically — queries are fast because the computation is done at refresh time. Use a regular view when you need real-time data and the query is not expensive. Regular views are just saved SQL — they execute the query every time. Refresh materialized views on a schedule or after data changes with `REFRESH MATERIALIZED VIEW`.

### How do I know if my index is being used?

In PostgreSQL, query `pg_stat_user_indexes` to see index usage statistics. The `idx_scan` column shows how many times the index has been used. If `idx_scan` is 0, the index is unused and can be dropped. In MySQL, use `SHOW INDEX FROM table` and check the `Cardinality` column. You can also use the `sys.schema_unused_indexes` view. Run `EXPLAIN` on your queries to verify the index appears in the plan. Remember that the planner may choose not to use an index if the table is small or if most rows match.

### Should I use connection pooling?

Yes, always use connection pooling in production. Opening a new database connection is expensive — it involves TCP handshake, authentication, and memory allocation. A connection pool reuses connections across requests, reducing latency and resource usage. Use PgBouncer for PostgreSQL (external pooler, works with any client), `asyncpg.create_pool` for async Python, or HikariCP for Java. Configure the pool size based on your database's `max_connections` and the number of application instances. A common starting point is 5-20 connections per application instance.

### How do I optimize a slow JOIN?

First, ensure both join columns have indexes. The join column on the inner (larger) table must be indexed — without it, the database does a nested loop scan. Check the EXPLAIN plan for the join method: hash join is efficient for large unsorted inputs, merge join is efficient when both inputs are sorted, nested loop is efficient when one side is small. Filter early — add WHERE conditions to reduce rows before joining. Consider denormalizing if you frequently join the same tables. Use covering indexes to avoid table fetches. For complex multi-table joins, experiment with join order hints.

## See Also

- [Full-Text Search — Implement Search That Actually Works](/guides/full-text-search-guide/)
- [Complete Guide to MongoDB Indexing](/guides/complete-guide-mongodb-indexing/)
- [Complete Guide to PostgreSQL Tuning](/guides/complete-guide-postgresql-tuning/)
- [SQL Performance Tuning — Indexes, Queries, and Explain Plans](/guides/sql-performance-tuning-guide/)
- [Database Query Tuning Checklist](/docs/database-query-tuning-checklist/)

