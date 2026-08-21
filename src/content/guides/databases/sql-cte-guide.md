---
contentType: guides
slug: sql-cte-guide
title: "SQL CTEs — Common Table Expressions Explained"
description: "A practical guide to SQL CTEs: non-recursive and recursive expressions, readability, performance, and when to use them over subqueries."
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
  - databases
  - performance
  - readability
relatedResources:
  - /guides/sql-window-functions-guide
  - /guides/sql-performance-tuning-guide
  - /guides/sql-joins-guide
  - /recipes/sql-find-duplicate-rows
  - /recipes/sql-recursive-cte-query
  - /guides/complete-guide-postgresql-tuning
lastUpdated: "2026-08-19"
publishedAt: "2026-06-25"
author: Mathias Paulenko
seo:
  metaDescription: "Learn SQL CTEs: non-recursive and recursive expressions, readability, performance tips. Complete guide with examples for PostgreSQL, SQL Server, and MySQL."
  keywords:
    - sql
    - cte
    - common-table-expression
    - recursive-cte
    - readability
    - query-organization
    - performance
---

## Overview

A Common Table Expression (CTE) is a named temporary result set that exists for the
duration of a single query. Introduced in SQL:1999, CTEs help break complex queries into
readable blocks, let you reference the same subquery more than once, and enable recursion
for hierarchical data. They're supported by PostgreSQL, SQL Server, MySQL 8+, Oracle, and
SQLite 3.8.3+.

## When to Use

- A query has several nested subquery levels.
- You need to reference the same subquery several times.
- You're traversing hierarchical data, such as org charts, bills of materials, or
  threaded comments.
- Query logic needs to be self-documenting and modular.
- You want to build complex queries incrementally and test each part.

## When NOT to Use

- A simple query is faster and clearer as a single `SELECT` or inline subquery.
- Your database engine doesn't support CTEs and you can't upgrade.
- You expect a CTE to always improve performance; it doesn't by default.

## Basic Syntax

```sql
WITH cte_name AS (
    SELECT ...
)
SELECT * FROM cte_name;
```

The `WITH` clause defines one or more CTEs. The final `SELECT` can use them like regular
 tables.

## Non-Recursive CTE Example

```sql
WITH monthly_sales AS (
    SELECT
        DATE_TRUNC('month', order_date) AS month,
        SUM(total) AS revenue,
        COUNT(*) AS order_count
    FROM orders
    WHERE order_date >= '2024-01-01'
    GROUP BY DATE_TRUNC('month', order_date)
),
avg_sales AS (
    SELECT AVG(revenue) AS avg_revenue FROM monthly_sales
)
SELECT
    ms.month,
    ms.revenue,
    ms.order_count,
    a.avg_revenue,
    ms.revenue - a.avg_revenue AS variance
FROM monthly_sales ms
CROSS JOIN avg_sales a
ORDER BY ms.month;
```

## Multiple CTEs

You can define several CTEs in one query and chain them.

```sql
WITH
    active_users AS (
        SELECT user_id, last_login
        FROM users
        WHERE last_login >= CURRENT_DATE - INTERVAL '30 days'
    ),
    user_orders AS (
        SELECT user_id,
               COUNT(*) AS order_count,
               SUM(total) AS lifetime_value
        FROM orders
        WHERE user_id IN (SELECT user_id FROM active_users)
        GROUP BY user_id
    )
SELECT
    u.user_id,
    u.last_login,
    COALESCE(o.order_count, 0) AS order_count,
    COALESCE(o.lifetime_value, 0) AS lifetime_value
FROM active_users u
LEFT JOIN user_orders o ON u.user_id = o.user_id;
```

## Recursive CTE for Hierarchies

A recursive CTE has an anchor member and a recursive member joined by `UNION ALL`.

```sql
-- Org chart: find all reports under the CEO
WITH RECURSIVE org_tree AS (
    -- Anchor
    SELECT id, name, manager_id, 1 AS depth
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Recursive step
    SELECT e.id, e.name, e.manager_id, ot.depth + 1
    FROM employees e
    INNER JOIN org_tree ot ON e.manager_id = ot.id
    WHERE ot.depth < 10
)
SELECT id, name, depth
FROM org_tree
ORDER BY depth, name;
```

To find the chain of command from an employee to the CEO, reverse the join:

```sql
WITH RECURSIVE chain_of_command AS (
    SELECT id, name, manager_id, 1 AS steps_to_ceo
    FROM employees
    WHERE id = 42

    UNION ALL

    SELECT e.id, e.name, e.manager_id, coc.steps_to_ceo + 1
    FROM employees e
    INNER JOIN chain_of_command coc ON e.id = coc.manager_id
)
SELECT name, steps_to_ceo
FROM chain_of_command
ORDER BY steps_to_ceo;
```

## Materialized CTEs in PostgreSQL

By default, PostgreSQL inlines CTEs. Add `MATERIALIZED` to force the engine to compute the
CTE once and store the result.

```sql
WITH regional_sales AS MATERIALIZED (
    SELECT region, SUM(total) AS total_sales
    FROM orders
    GROUP BY region
    HAVING SUM(total) > 1000000
)
SELECT * FROM regional_sales;
```

Use this when the CTE is expensive and referenced more than once, or when the optimizer
chooses a bad plan. In SQL Server and MySQL, the behavior is engine-specific and usually
not controlled with a keyword.

## CTE vs Subquery

|Aspect|CTE|Subquery|
|------|---|--------|
|Readability|Named, reusable|Inline, anonymous|
|Reusability|Can reference more than once|Must duplicate if used again|
|Recursion|Supported|Not supported|
|Materialization|Optional in PostgreSQL|Evaluated each time by default|

## Best Practices

- Name CTEs by what they represent, not by step numbers.
- Keep each CTE focused on a single logical step.
- Add a `WHERE depth < N` guard to every recursive CTE.
- Use `MATERIALIZED` in PostgreSQL only when the query plan shows the CTE being inlined
  inefficiently.
- Test each CTE independently by replacing the final `SELECT` with a quick query of that
  CTE.

## Common Mistakes

- **Infinite recursion** — forgetting the termination guard or a data cycle in the
  hierarchy.
- **Treating CTEs as temp tables** — they live only for the query; for persistence use
  `CREATE TEMP TABLE` or a real table.
- **Performance assumptions** — some engines inline CTEs, others materialize; always
  profile.
- **Over-nesting CTEs** — ten chained CTEs can become harder to read than the original
  subqueries.
- **Mutual recursion** — two CTEs referencing each other isn't supported in most
  engines.

## FAQ

### Do CTEs improve performance?

Not inherently. They improve readability and maintainability. In PostgreSQL,
`MATERIALIZED` CTEs can help when the same result is used several times. In SQL Server,
CTEs are usually inlined.

### Can I use CTEs in UPDATE or DELETE?

Yes. In PostgreSQL and SQL Server:

```sql
WITH expired AS (
    SELECT id FROM orders WHERE status = 'expired'
)
DELETE FROM order_items
WHERE order_id IN (SELECT id FROM expired);
```

### Are CTEs available in MySQL?

Yes, since MySQL 8.0. Non-recursive and recursive CTEs both work with `WITH` and
`WITH RECURSIVE`.

### How do I optimize a recursive CTE on a large hierarchy?

- Add a depth limit.
- Index the join column (`manager_id`, `product_id`, etc.).
- Consider `MATERIALIZED` in PostgreSQL if the recursive set is reused.
- For very deep hierarchies, store a materialized path in a column and query that
  instead.

### When should I choose a CTE over a subquery?

Use a CTE when the same subquery is referenced more than once, when the query has
several nested levels, or when you need recursion. For a one-off simple subquery that
appears once, an inline subquery is fine.
