---


contentType: guides
slug: indexing-strategies-guide
title: "Database Indexing Strategies — From B-Trees to BRIN"
description: "A practical guide to database indexes: B-Trees, Hash, GIN, GiST, BRIN, and partial indexes. Learn when to use each and how to avoid common indexing mistakes."
metaDescription: "Learn database indexing strategies: B-Tree, Hash, GIN, GiST, BRIN, partial and composite indexes. Optimize queries and avoid common indexing mistakes."
difficulty: intermediate
topics:
  - databases
  - performance
tags:
  - database-indexing
  - b-tree
  - hash-index
  - gin-index
  - composite-index
  - partial-index
  - query-optimization
  - guide
relatedResources:
  - /guides/database-normalization-guide
  - /guides/sql-joins-guide
  - /guides/database-replication-guide
  - /recipes/connect-to-postgresql
  - /recipes/connect-to-mysql
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Learn database indexing strategies: B-Tree, Hash, GIN, GiST, BRIN, partial and composite indexes. Optimize queries and avoid common indexing mistakes."
  keywords:
    - database-indexing
    - b-tree
    - hash-index
    - gin-index
    - composite-index
    - query-optimization
    - guide


---

## Overview

Indexes are the primary mechanism for speeding up database queries. They are data structures that allow the database to locate rows without scanning every record. But indexes are not free — they consume storage, slow down writes, and can hurt performance if used incorrectly. Understanding the different index types and when to apply them is one of the highest-value database skills.

## When to Use


- For alternatives, see [Complete Guide to SQL Query Optimization](/guides/complete-guide-sql-query-optimization/).

- Queries filtering on specific columns (WHERE, JOIN)
- Sorting large result sets (ORDER BY)
- Enforcing uniqueness constraints
- Accelerating full-text search and geospatial queries

## B-Tree Indexes

The default index type in most relational databases. B-Trees maintain sorted data that allows O(log n) lookups, range scans, and ordered traversal.

```sql
CREATE INDEX idx_users_email ON users(email);

-- Uses index: exact match
SELECT * FROM users WHERE email = 'alice@example.com';

-- Uses index: range scan
SELECT * FROM users WHERE email BETWEEN 'a' AND 'c';

-- Uses index: ORDER BY
SELECT * FROM users ORDER BY email LIMIT 10;
```

### Composite B-Tree Indexes

Column order matters. A composite index on `(a, b, c)` supports queries on `a`, `(a, b)`, and `(a, b, c)`.

```sql
CREATE INDEX idx_orders_customer_date ON orders(customer_id, created_at);

-- Uses index: matches leading column
SELECT * FROM orders WHERE customer_id = 42;

-- Uses index: matches leading columns
SELECT * FROM orders WHERE customer_id = 42 AND created_at > '2024-01-01';

-- Does NOT use index: skips leading column
SELECT * FROM orders WHERE created_at > '2024-01-01';
```

## Hash Indexes

Optimized for equality comparisons only. Smaller and faster than B-Trees for exact matches, but cannot support range queries or sorting.

```sql
CREATE INDEX idx_sessions_token ON sessions USING HASH(token);

-- Fast: equality
SELECT * FROM sessions WHERE token = 'abc123';

-- Cannot use hash index: range
SELECT * FROM sessions WHERE token > 'abc';
```

## GIN Indexes (Generalized Inverted Index)

Designed for multi-value columns and full-text search. Efficient for arrays, JSONB, and tsvector.

```sql
-- Array containment
CREATE INDEX idx_products_tags ON products USING GIN(tags);
SELECT * FROM products WHERE tags @> ARRAY['electronics', 'wireless'];

-- JSONB search
CREATE INDEX idx_events_data ON events USING GIN(data jsonb_path_ops);
SELECT * FROM events WHERE data @> '{"status": "error"}';

-- Full-text search (PostgreSQL)
CREATE INDEX idx_articles_search ON articles USING GIN(to_tsvector('english', content));
SELECT * FROM articles WHERE to_tsvector('english', content) @@ to_tsquery('database & indexing');
```

## GiST Indexes (Generalized Search Tree)

A framework for building indexes on complex data types: geometric, range, and nearest-neighbor queries.

```sql
-- Geospatial (PostGIS)
CREATE INDEX idx_locations_geom ON locations USING GIST(geom);
SELECT * FROM locations WHERE ST_DWithin(geom, ST_Point(0,0)::geography, 1000);

-- Range queries
CREATE INDEX idx_reservations_period ON reservations USING GIST(period);
SELECT * FROM reservations WHERE period && daterange('2024-01-01', '2024-01-10');
```

## BRIN Indexes (Block Range Indexes)

Compact indexes for very large, naturally ordered tables. Store min/max values per block instead of per row.

```sql
-- Time-series data: logs, events, metrics
CREATE INDEX idx_logs_created ON logs USING BRIN(created_at);

-- Size: ~1% of B-Tree, but only useful for ordered data
-- Best for: billions of rows, time-series, append-only workloads
```

## Partial Indexes

Index only a subset of rows, reducing size and improving write performance.

```sql
-- Only index active users (80% of queries filter on active)
CREATE INDEX idx_users_active_email ON users(email) WHERE active = true;

-- Only index unpaid orders for aging reports
CREATE INDEX idx_orders_unpaid ON orders(created_at) WHERE status = 'unpaid';
```

## Covering Indexes (Index-Only Scans)

Include additional columns so the database can answer queries without touching the heap.

```sql
-- PostgreSQL: INCLUDE adds columns to the index leaf
CREATE INDEX idx_orders_customer_total ON orders(customer_id) INCLUDE(total, status);

-- Query uses index only — no heap access
SELECT total, status FROM orders WHERE customer_id = 42;

-- MySQL: composite index naturally covers
CREATE INDEX idx_orders_customer_total ON orders(customer_id, total, status);
```

## Index Selection Matrix

| Index Type | Best For | Avoid When |
|------------|----------|------------|
| B-Tree | Equality, range, sorting | High-cardinality text search |
| Hash | Exact match on large text | Range queries needed |
| GIN | Arrays, JSONB, full-text | Simple scalar columns |
| GiST | Geospatial, ranges | Standard scalar lookups |
| BRIN | Large ordered datasets | Random access patterns |
| Partial | Frequently filtered subsets | Queries scan all rows |

## Common Mistakes

- **Indexing every column** — slows writes dramatically; indexes have maintenance cost
- **Wrong column order in composites** — the leading column must be the most selective
- **Indexing low-cardinality columns** — gender, boolean flags; bitmap indexes handle these better
- **Ignoring partial indexes** — indexing 100% of rows when queries always filter
- **Not updating statistics** — stale stats lead to bad index choices by the query planner

## Monitoring Index Usage

```sql
-- PostgreSQL: find unused indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelname NOT LIKE 'pg_toast%'
ORDER BY schemaname, tablename, indexname;

-- MySQL: index usage via performance_schema
SELECT object_schema, object_name, index_name, count_read
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE index_name IS NOT NULL
ORDER BY count_read DESC;
```

## FAQ

**How many indexes is too many?**
There is no fixed number, but each index adds write overhead. Audit unused indexes quarterly.

**Should I index foreign keys?**
Yes. The referencing side (many side) of a foreign key should almost always be indexed for JOIN performance.

**Do indexes slow down INSERT?**
Yes. Every index on a table adds write amplification. Batch inserts and consider dropping indexes during bulk loads.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Scenario: Query Optimization for E-commerce

```sql
-- Table: orders (50M rows, 500K/day)
-- Problem: Dashboard queries take 30+ seconds

-- Query 1: Orders by customer in date range
-- Before: seq scan, 12 seconds
EXPLAIN ANALYZE SELECT * FROM orders
WHERE customer_id = 42 AND created_at >= '2026-01-01';

-- Solution: composite index
CREATE INDEX idx_orders_customer_date ON orders(customer_id, created_at DESC);
-- After: index scan, 2ms

-- Query 2: Orders by status and date (dashboard)
-- Before: seq scan + sort, 28 seconds
EXPLAIN ANALYZE SELECT * FROM orders
WHERE status = 'pending' AND created_at >= '2026-01-01'
ORDER BY created_at DESC LIMIT 50;

-- Solution: partial composite index
CREATE INDEX idx_orders_pending_date ON orders(created_at DESC)
WHERE status = 'pending';
-- Only indexes pending orders (~5% of total)
-- After: index scan, 5ms

-- Query 3: Full-text search on products
-- Before: ILIKE, 15 seconds
EXPLAIN ANALYZE SELECT * FROM products
WHERE name ILIKE '%laptop%' OR description ILIKE '%laptop%';

-- Solution: GIN index with tsvector
CREATE INDEX idx_products_fts ON products
USING GIN(to_tsvector('english', name || ' ' || description));

SELECT * FROM products
WHERE to_tsvector('english', name || ' ' || description)
  @@ to_tsquery('english', 'laptop');
-- After: 50ms

-- Query 4: Daily order count (report)
-- Before: seq scan + aggregate, 45 seconds
EXPLAIN ANALYZE SELECT DATE(created_at), count(*)
FROM orders WHERE created_at >= '2026-01-01'
GROUP BY DATE(created_at) ORDER BY 1;

-- Solution: BRIN index (data ordered by date)
CREATE INDEX idx_orders_created_brin ON orders USING BRIN(created_at);
-- Only 1% of B-Tree size
-- After: 8 seconds (acceptable for reports)

-- Query 5: JSONB on order metadata
EXPLAIN ANALYZE SELECT * FROM orders
WHERE metadata @> '{"channel": "mobile"}';

CREATE INDEX idx_orders_metadata ON orders USING GIN(metadata jsonb_path_ops);
-- After: 15ms

-- Unused index audit (quarterly):
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelname NOT LIKE 'pg_toast%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Result: 3 unused indexes totaling 2GB -> DROP
-- Impact: 15% less write overhead

Lessons:
  - Column order in composites matters enormously
  - Partial indexes reduce size and improve writes
  - BRIN is ideal for time-series with billions of rows
  - GIN solves full-text search and JSONB
  - Audit unused indexes quarterly
```

### How do I choose between B-Tree and BRIN?

Use B-Tree for random access data with equality or range queries. Use BRIN for very large tables (billions of rows) where data is naturally ordered (time-series, append-only logs). BRIN is ~1% of B-Tree size but only useful when queries filter on the ordered column range.
