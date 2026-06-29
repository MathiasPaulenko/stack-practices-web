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
  - /recipes/databases/connect-to-postgresql
  - /recipes/databases/connect-to-mysql
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
