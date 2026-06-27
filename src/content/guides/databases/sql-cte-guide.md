---
contentType: guides
slug: sql-cte-guide
title: "SQL CTEs — Common Table Expressions Explained"
description: "A practical guide to SQL Common Table Expressions (CTEs): non-recursive and recursive CTEs, readability, performance, and when to use them over subqueries."
metaDescription: "Learn SQL CTEs: non-recursive and recursive expressions, readability, performance tips. Complete guide with examples for PostgreSQL, SQL Server, and MySQL."
difficulty: intermediate
topics:
  - databases
  - data
tags:
  - sql
  - cte
  - common-table-expression
  - recursive-cte
  - readability
  - query-organization
  - guide
relatedResources:
  - /guides/sql-window-functions-guide
  - /guides/sql-performance-tuning-guide
  - /guides/sql-joins-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn SQL CTEs: non-recursive and recursive expressions, readability, performance tips. Complete guide with examples for PostgreSQL, SQL Server, and MySQL."
  keywords:
    - sql
    - cte
    - common-table-expression
    - recursive-cte
    - readability
    - query-organization
    - guide
---

## Overview

Common Table Expressions (CTEs), introduced in SQL:1999, provide a named temporary result set that exists for the duration of a single query. They improve readability by breaking complex queries into named blocks, enable recursion for hierarchical data, and can be materialized for performance. Supported by PostgreSQL, SQL Server, MySQL 8+, Oracle, and SQLite 3.8.3+.

## When to Use

- A query has multiple levels of nested subqueries
- You need to reference the same subquery multiple times
- Hierarchical data must be traversed (org charts, bill of materials, threaded comments)
- Query logic needs to be self-documenting and modular
- You want to build complex queries incrementally and test each part

## Basic CTE Syntax

```sql
WITH cte_name AS (
    SELECT ...
)
SELECT * FROM cte_name;
```

## Non-Recursive CTE Example

```sql
WITH monthly_sales AS (
    SELECT
        DATE_TRUNC('month', order_date) as month,
        SUM(total) as revenue,
        COUNT(*) as order_count
    FROM orders
    WHERE order_date >= '2024-01-01'
    GROUP BY DATE_TRUNC('month', order_date)
),
avg_sales AS (
    SELECT AVG(revenue) as avg_revenue FROM monthly_sales
)
SELECT
    ms.month,
    ms.revenue,
    ms.order_count,
    a.avg_revenue,
    ms.revenue - a.avg_revenue as variance
FROM monthly_sales ms
CROSS JOIN avg_sales a
ORDER BY ms.month;
```

## Recursive CTE for Hierarchies

```sql
-- Org chart: find all reports under a manager
WITH RECURSIVE org_tree AS (
    -- Anchor: start with the manager
    SELECT id, name, manager_id, 1 as depth
    FROM employees
    WHERE id = 1  -- CEO

    UNION ALL

    -- Recursive: find direct reports
    SELECT e.id, e.name, e.manager_id, ot.depth + 1
    FROM employees e
    INNER JOIN org_tree ot ON e.manager_id = ot.id
)
SELECT id, name, depth FROM org_tree ORDER BY depth, name;
```

## CTE vs Subquery

| Aspect | CTE | Subquery |
|--------|-----|----------|
| **Readability** | Named, reusable | Inline, anonymous |
| **Reusability** | Can reference multiple times | Must duplicate if used again |
| **Recursion** | Supported | Not supported |
| **Materialization** | Can be materialized (PostgreSQL) | Evaluated each time |

## Multiple CTEs

```sql
WITH
    active_users AS (
        SELECT user_id, last_login
        FROM users
        WHERE last_login >= CURRENT_DATE - INTERVAL '30 days'
    ),
    user_orders AS (
        SELECT user_id, COUNT(*) as order_count, SUM(total) as lifetime_value
        FROM orders
        WHERE user_id IN (SELECT user_id FROM active_users)
        GROUP BY user_id
    )
SELECT
    u.user_id,
    u.last_login,
    COALESCE(o.order_count, 0) as order_count,
    COALESCE(o.lifetime_value, 0) as lifetime_value
FROM active_users u
LEFT JOIN user_orders o ON u.user_id = o.user_id;
```

## Materialized CTEs (PostgreSQL)

```sql
WITH regional_sales AS MATERIALIZED (
    SELECT region, SUM(total) as total_sales
    FROM orders
    GROUP BY region
    HAVING SUM(total) > 1000000
)
SELECT * FROM regional_sales;
```

## Common Mistakes

- **Infinite recursion** — recursive CTEs without a proper termination condition will error or loop forever
- **Treating CTEs as temp tables** — they are query-scoped; for temp tables, use `CREATE TEMP TABLE`
- **Performance assumptions** — in some engines, CTEs are inlined; in others, they may materialize. Profile your query.
- **Over-nesting CTEs** — deeply nested CTEs can become harder to read than the original subquery soup
- **Mutual recursion** — not supported in most databases; use iterative approaches instead

## FAQ

**Do CTEs improve performance?**
Not inherently. They improve readability and maintainability. In PostgreSQL, `MATERIALIZED` CTEs can improve performance by evaluating once. In SQL Server, CTEs are usually inlined.

**Can I use CTEs in UPDATE or DELETE?**
Yes, in PostgreSQL and SQL Server: `WITH cte AS (...) UPDATE table SET ... FROM cte WHERE ...`.

**Are CTEs available in MySQL?**
Yes, non-recursive CTEs in MySQL 8.0+, recursive in MySQL 8.0+ with `WITH RECURSIVE`.
