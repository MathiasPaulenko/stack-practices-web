---
contentType: recipes
slug: database-views-materialized
title: "Create and Use Database Views and Materialized Views"
description: "How to create and use database views and materialized views to simplify queries and improve read performance."
metaDescription: "Create database views and materialized views to simplify queries and boost read performance. PostgreSQL, MySQL, and SQL Server examples."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - sql
  - postgresql
  - mysql
  - views
  - materialized-views
relatedResources:
  - /guides/sql-performance-tuning-guide
  - /recipes/database-deadlocks-retries
  - /recipes/database-read-replicas
  - /recipes/sql-joins
  - /guides/database-design-guide
  - /recipes/optimistic-locking
lastUpdated: "2026-08-19"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Create database views and materialized views to simplify queries and boost read performance. PostgreSQL, MySQL, and SQL Server examples."
  keywords:
    - database-views
    - materialized-views
    - postgresql
    - mysql
    - sql-server
    - performance
    - sql
---

## Overview

A database view is a stored query that behaves like a table. It simplifies complex
joins, limits column exposure for access control, and keeps business logic in the
schema. A materialized view stores the query result on disk, giving up some freshness
and space for much faster reads.

This recipe covers how to create, refresh, and index both kinds in PostgreSQL, MySQL,
and SQL Server.

## When to Use

- You run the same complex aggregation repeatedly and it's slow.
- You want to expose only selected columns for least-privilege access.
- You need precomputed joins or aggregations for dashboards.
- You want to abstract schema changes from downstream consumers.

## When NOT to Use

- For real-time transactional data where stale results are unacceptable.
- When the base tables change constantly and refresh cost is too high.
- As a replacement for missing indexes on base tables.

## Solution

### PostgreSQL view and materialized view

```sql
-- Regular view: always fresh, runs the query each time
CREATE OR REPLACE VIEW monthly_revenue AS
SELECT
    date_trunc('month', created_at) AS month,
    SUM(amount) AS total
FROM orders
WHERE status = 'completed'
GROUP BY 1;

-- Materialized view: stored on disk, must be refreshed
CREATE MATERIALIZED VIEW monthly_revenue_mat AS
SELECT
    date_trunc('month', created_at) AS month,
    SUM(amount) AS total
FROM orders
WHERE status = 'completed'
GROUP BY 1;

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_monthly_revenue_mat_month
ON monthly_revenue_mat (month);

-- Blocking refresh
REFRESH MATERIALIZED VIEW monthly_revenue_mat;

-- Non-blocking refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue_mat;
```

### SQL Server indexed view

```sql
-- Create the view with SCHEMABINDING
CREATE VIEW dbo.OrderTotals
WITH SCHEMABINDING
AS
SELECT
    o.customer_id,
    COUNT_BIG(*) AS order_count,
    SUM(o.total) AS total_spent
FROM dbo.orders o
WHERE o.status = 'completed'
GROUP BY o.customer_id;
GO

-- Clustered index materializes the view
CREATE UNIQUE CLUSTERED INDEX IX_OrderTotals_Customer
ON dbo.OrderTotals (customer_id);
GO

-- Query the materialized data
SELECT * FROM dbo.OrderTotals WITH (NOEXPAND)
WHERE total_spent > 1000;
```

### MySQL simulated materialized view

MySQL has no native materialized views. Use a table and triggers to keep it up to date:

```sql
CREATE TABLE mv_daily_signups (
    day DATE PRIMARY KEY,
    signups INT NOT NULL DEFAULT 0
);

DELIMITER //

CREATE TRIGGER trg_user_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO mv_daily_signups (day, signups)
    VALUES (DATE(NEW.created_at), 1)
    ON DUPLICATE KEY UPDATE signups = signups + 1;
END //

CREATE TRIGGER trg_user_delete
AFTER DELETE ON users
FOR EACH ROW
BEGIN
    UPDATE mv_daily_signups
    SET signups = signups - 1
    WHERE day = DATE(OLD.created_at);
END //

DELIMITER ;
```

### Refresh schedule with pg_cron

```sql
-- PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'refresh_monthly_revenue',
    '0 2 * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue_mat'
);
```

## Explanation

A **view** is just a stored query. Every read re-runs it, so the data is always fresh
but performance depends on the base tables and indexes.

A **materialized view** stores the result physically. Reads are fast, but the data is
stale until refreshed. It's best for expensive aggregations used by dashboards or
reports.

**Trade-offs:**

|View|Materialized view|
|----|-----------------|
|Always fresh|Stale until refresh|
|No extra storage|Uses disk space|
|Query cost depends on base tables|Read cost is like a table|

## Variants

|Database|Native view|Materialized view|
|--------|-----------|-----------------|
|PostgreSQL|Yes|Yes, with `REFRESH MATERIALIZED VIEW`|
|SQL Server|Yes|Indexed views (`SCHEMABINDING` + clustered index)|
|MySQL|Yes|Simulate with tables + triggers|
|Oracle|Yes|Yes, with `ON COMMIT` or `ON DEMAND`|
|SQLite|Yes|Not supported|

## Best Practices

- Create a unique index before using `REFRESH ... CONCURRENTLY` in PostgreSQL.
- Use `SCHEMABINDING` in SQL Server so the base table can't break the indexed view.
- Refresh after ETL or during low-traffic windows, not during peak reads.
- Use `CONCURRENTLY` or `WITH (NOEXPAND)` to avoid locking readers.
- Keep an eye on disk usage; materialized views can grow quickly.
- Run `ANALYZE` on the view after refresh so the planner uses fresh statistics.

## Common Mistakes

- **Forgetting to refresh**: users see stale data until you run `REFRESH`.
- **No unique index**: `REFRESH CONCURRENTLY` fails without one.
- **Writing to materialized views**: they're read-only; update the base tables.
- **High-cardinality grouping**: views with too many unique groups can bloat storage.
- **Skipping base-table indexes**: a view doesn't fix missing indexes on source tables.

## FAQ

### Can I update data through a view?

Sometimes. Simple single-table views are often updatable. Multi-table joins,
aggregations, or `DISTINCT` make a view read-only. PostgreSQL supports `INSTEAD OF`
triggers for complex cases.

### How often should I refresh a materialized view?

It depends on your tolerance for stale data. Dashboards may refresh hourly; a search
index may refresh every five minutes. Use `CONCURRENTLY` to avoid read locks.

### What is the difference between a view and a CTE?

A CTE (`WITH` clause) exists only for one query. A view is a persistent schema object
that any query can reference. Use CTEs for one-off organization; use views for reusable
abstractions.

### Do materialized views replace indexes?

No. They help with expensive aggregations and joins, but they don't fix missing indexes
on the underlying tables.
