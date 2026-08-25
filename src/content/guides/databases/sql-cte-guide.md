---
contentType: guides
slug: sql-cte-guide
title: "SQL CTEs: Common Table Expressions Explained"
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
lastUpdated: "2026-08-22"
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

A Common Table Expression (CTE) gives a temporary result set a name, and you can use it only for the
query it's defined in. Introduced in SQL:1999, CTEs let you split a complicated query into named
blocks, reference the same intermediate result more than once, and express recursion for trees and
graphs. PostgreSQL, SQL Server, MySQL 8+, Oracle, and SQLite 3.8.3+ all support them.

## When to Use

- A query has several nested subqueries and you keep losing track of parentheses.
- The same intermediate result is needed in more than one place.
- You're walking a hierarchy such as an org chart, a bill of materials, or threaded comments.
- You want the query to read like a sequence of named steps.
- You'd like to build and test one piece of the query at a time.

## When NOT to Use

- A plain `SELECT` or a single inline subquery is already fast and clear.
- Your database engine doesn't support CTEs and you can't upgrade.
- You assume a CTE will automatically run faster. It usually doesn't.

## Basic Syntax

```sql
WITH cte_name AS (
    SELECT ...
)
SELECT * FROM cte_name;
```

The `WITH` clause declares one or more CTEs. The final `SELECT` treats them like regular tables in
scope.

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

The first CTE aggregates orders by month. The second CTE computes the average. The final query joins
the two without repeating any aggregation.

## Multiple CTEs

You can declare several CTEs and chain them.

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

`user_orders` depends on `active_users`. Writing the query this way makes the dependency explicit.

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

To climb from an employee up to the CEO, reverse the join:

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

By default, PostgreSQL may inline a CTE. Add `MATERIALIZED` to force the engine to compute it once
and store the result.

```sql
WITH regional_sales AS MATERIALIZED (
    SELECT region, SUM(total) AS total_sales
    FROM orders
    GROUP BY region
    HAVING SUM(total) > 1000000
)
SELECT * FROM regional_sales;
```

Use this when the CTE is expensive and referenced several times, or when `EXPLAIN` shows the planner
picking a bad plan. SQL Server and MySQL handle materialization differently and usually don't
expose the keyword.

## CTE vs Subquery

| Aspect | CTE | Subquery |
| --- | --- | --- |
| Readability | Named, reusable | Inline, anonymous |
| Reusability | Can reference more than once | Must duplicate if used again |
| Recursion | Supported | Not supported |
| Materialization | Optional in PostgreSQL | Evaluated each time by default |

## Best Practices

- Give each CTE a name that describes the result, not `step1` or `step2`.
- Keep one logical step per CTE; don't pack two different ideas into one.
- Always add a `WHERE depth < N` guard to a recursive CTE.
- Use `MATERIALIZED` in PostgreSQL only after checking the query plan.
- Test a CTE in isolation by selecting from it directly before adding the final query.

## Common Mistakes

- **Infinite recursion**: forgetting the termination guard or having a cycle in the hierarchy data.
- **Treating CTEs as temp tables**: they live only for the query. For persistence, use `CREATE TEMP
    TABLE` or a real table.
- **Performance assumptions**: some engines inline CTEs, others materialize. Always measure.
- **Over-nesting CTEs**: ten chained CTEs can be harder to read than the original subqueries.
- **Mutual recursion**: two CTEs referencing each other isn't supported in most engines.

## FAQ

### Do CTEs improve performance?

Not by themselves. Their main benefit is readability and maintainability. In PostgreSQL,
`MATERIALIZED` CTEs can help when the same result is used several times. In SQL Server, CTEs are
usually inlined, so they're mostly a readability feature.

### Can I use CTEs in UPDATE or DELETE?

Yes. In PostgreSQL and SQL Server you can write:

```sql
WITH expired AS (
    SELECT id FROM orders WHERE status = 'expired'
)
DELETE FROM order_items
WHERE order_id IN (SELECT id FROM expired);
```

### Are CTEs available in MySQL?

Yes, since MySQL 8.0. Non-recursive and recursive CTEs both work with `WITH` and `WITH RECURSIVE`.

### How do I optimize a recursive CTE on a large hierarchy?

- Add a depth limit.
- Index the join column such as `manager_id` or `product_id`.
- Consider `MATERIALIZED` in PostgreSQL if the recursive set is reused.
- For very deep hierarchies, a materialized path column is usually faster than recursion.

### When should I choose a CTE over a subquery?

Use a CTE when the same subquery is referenced more than once, when the query has several nested
levels, or when you need recursion. For a one-off simple subquery that appears once, an inline
subquery is fine.
