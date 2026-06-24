---
contentType: guides
slug: sql-window-functions-guide
title: "SQL Window Functions — Complete Guide"
description: "A practical guide to SQL window functions: ROW_NUMBER, RANK, DENSE_RANK, LEAD, LAG, SUM, AVG over partitions, and real-world analytics use cases."
metaDescription: "Learn SQL window functions: ROW_NUMBER, RANK, LEAD, LAG, SUM over partitions. Complete guide with real-world analytics examples."
difficulty: intermediate
topics:
  - databases
  - data
tags:
  - sql
  - window-functions
  - row-number
  - rank
  - lead
  - lag
  - partition-by
  - analytics
  - guide
relatedResources:
  - /guides/sql-cte-guide
  - /guides/sql-performance-tuning-guide
  - /guides/sql-joins-guide
  - /recipes/databases/window-functions-ranking
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn SQL window functions: ROW_NUMBER, RANK, LEAD, LAG, SUM over partitions. Complete guide with real-world analytics examples."
  keywords:
    - sql
    - window-functions
    - row-number
    - rank
    - lead
    - lag
    - partition-by
    - analytics
    - guide
---

## Overview

Window functions in SQL compute a value across a set of rows related to the current row — without collapsing the result set into groups like `GROUP BY`. They unlock powerful analytical queries: running totals, rankings, moving averages, and row-to-row comparisons. Available in PostgreSQL, SQL Server, MySQL 8+, Oracle, and SQLite 3.25+, they are essential for anyone writing analytical SQL.

## When to Use

- You need rankings within groups (top-N per category)
- Running totals or moving averages are required
- You want to compare each row to the previous or next row
- Aggregates must be shown alongside individual row details
- Self-joins for row-to-row comparisons are too complex or slow

## Syntax

```sql
function_name(expression) OVER (
    [PARTITION BY partition_expression]
    [ORDER BY sort_expression]
    [frame_clause]
)
```

## Ranking Functions

| Function | Behavior | Duplicate Handling |
|----------|----------|-------------------|
| `ROW_NUMBER()` | Sequential integer | No ties; arbitrary order for duplicates |
| `RANK()` | Rank with gaps | Same value gets same rank; next rank skips |
| `DENSE_RANK()` | Rank without gaps | Same value gets same rank; next rank continues |

```sql
-- Top 3 products by revenue in each category
WITH ranked AS (
    SELECT
        product_id,
        category,
        revenue,
        RANK() OVER (PARTITION BY category ORDER BY revenue DESC) as rank
    FROM product_revenue
)
SELECT * FROM ranked WHERE rank <= 3;
```

## Offset Functions

```sql
-- Compare current month to previous month
SELECT
    month,
    revenue,
    LAG(revenue) OVER (ORDER BY month) as prev_month_revenue,
    revenue - LAG(revenue) OVER (ORDER BY month) as month_over_month_change,
    LEAD(revenue) OVER (ORDER BY month) as next_month_revenue
FROM monthly_revenue;
```

## Aggregate Window Functions

```sql
-- Running total and moving average
SELECT
    order_id,
    order_date,
    amount,
    SUM(amount) OVER (ORDER BY order_date) as running_total,
    AVG(amount) OVER (
        ORDER BY order_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as seven_day_avg
FROM orders;
```

## Frame Clauses

| Frame | Meaning |
|-------|---------|
| `ROWS UNBOUNDED PRECEDING` | All rows from start to current |
| `ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING` | Current row plus one on each side |
| `RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW` | Time-based window |

## Real-World Examples

### Deduplication

```sql
-- Keep the most recent record per customer
WITH ranked AS (
    SELECT
        customer_id,
        email,
        updated_at,
        ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY updated_at DESC) as rn
    FROM customer_profiles
)
SELECT customer_id, email, updated_at FROM ranked WHERE rn = 1;
```

### Percentile Calculation

```sql
SELECT
    employee_id,
    department,
    salary,
    NTILE(4) OVER (PARTITION BY department ORDER BY salary) as quartile,
    PERCENT_RANK() OVER (PARTITION BY department ORDER BY salary) as percentile
FROM employees;
```

## Common Mistakes

- **Forgetting `PARTITION BY`** — window applies to entire result set instead of groups
- **Using `GROUP BY` with window functions** — they operate on different conceptual levels; combine with CTEs
- **Confusing `RANK` and `ROW_NUMBER`** — use `ROW_NUMBER` for deduplication, `RANK` for tiered analysis
- **Window frames on unordered data** — always specify `ORDER BY` inside `OVER()`
- **Performance on large datasets** — ensure the `PARTITION BY` and `ORDER BY` columns are indexed

## FAQ

**Are window functions available in MySQL?**
Yes, starting with MySQL 8.0. MariaDB 10.2+ also supports them.

**Can I use multiple window functions in one query?**
Yes. You can also define a named window to reuse: `WINDOW w AS (PARTITION BY dept ORDER BY salary)`.

**Do window functions work with `DISTINCT`?**
`DISTINCT` is applied after window functions. Use a subquery or CTE if you need distinct results with window calculations.
