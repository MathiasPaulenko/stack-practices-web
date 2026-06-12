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
  - sql
  - performance
  - indexing
  - query-optimization
  - explain-plan
  - database
  - guide
relatedResources:
  - /guides/databases/database-design-guide
  - /guides/performance/performance-optimization-guide
  - /recipes/api/pagination
lastUpdated: "2026-06-12"
author: "StackPractices"
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

Slow queries are one of the most common causes of application performance problems. This guide covers practical techniques to identify, diagnose, and fix SQL performance issues across PostgreSQL, MySQL, and SQL Server.

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
| **N+1 Queries** | One query per row | Use JOIN or `WHERE IN` |
| **Missing LIMIT** | Fetching millions of rows | Add `LIMIT` and pagination |
| **Implicit conversions** | Function on column prevents index use | Cast the constant, not the column |
| `SELECT DISTINCT` to fix duplicates | Hides a join problem | Fix the join or schema |
| **Counting all rows** | `SELECT COUNT(*)` on huge tables | Use approximate counts or triggers |
| **No connection pooling** | Connection overhead dominates | Use pgBouncer, HikariCP, etc. |

## Best Practices

- **Index foreign keys** automatically — joins depend on them
- **Monitor slow query logs** weekly and address the top offenders
- **Analyze tables regularly** — `ANALYZE` updates statistics for the query planner
- **Avoid over-indexing** — each index slows writes and consumes space
- **Use appropriate data types** — `INTEGER` is faster than `VARCHAR` for IDs
- **Partition large tables** by date or range when they exceed 10M rows

## Frequently Asked Questions

**Q: How many indexes is too many?**
A: There is no fixed number, but each index slows INSERT/UPDATE/DELETE. Audit indexes quarterly and drop unused ones. PostgreSQL's `pg_stat_user_indexes` shows index usage.

**Q: Should I index every column used in WHERE?**
A: No. Composite indexes often serve multiple queries. Also, the query planner may choose a sequential scan if the table is small or the query returns most rows.

**Q: Why does my query use a sequential scan when I have an index?**
A: The planner estimates that reading the whole table is faster than reading the index plus random table lookups. This is often correct for queries returning >5-10% of rows.
