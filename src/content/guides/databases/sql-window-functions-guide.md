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

Window functions in SQL compute a value across a set of rows related to the current row — without collapsing the result set into groups like `GROUP BY`. They enable capable analytical queries: running totals, rankings, moving averages, and row-to-row comparisons. Available in PostgreSQL, SQL Server, MySQL 8+, Oracle, and SQLite 3.25+, they are essential for anyone writing analytical SQL.

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

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Detailed Scenario: Sales Analysis with Window Functions

```sql
-- Table: orders(id, customer_id, order_date, product_category, amount)
-- Volume: 10M orders over 2 years

-- 1. Top 3 products by revenue in each category, each month
WITH monthly_category_sales AS (
    SELECT
        DATE_TRUNC('month', order_date) AS month,
        product_category,
        product_id,
        SUM(amount) AS total_revenue,
        RANK() OVER (
            PARTITION BY DATE_TRUNC('month', order_date), product_category
            ORDER BY SUM(amount) DESC
        ) AS rank_in_category
    FROM orders
    WHERE order_date >= '2026-01-01'
    GROUP BY DATE_TRUNC('month', order_date), product_category, product_id
)
SELECT month, product_category, product_id, total_revenue, rank_in_category
FROM monthly_category_sales
WHERE rank_in_category <= 3
ORDER BY month DESC, product_category, rank_in_category;

-- 2. Month-over-month growth by category
WITH monthly_totals AS (
    SELECT
        DATE_TRUNC('month', order_date) AS month,
        product_category,
        SUM(amount) AS revenue
    FROM orders
    GROUP BY DATE_TRUNC('month', order_date), product_category
)
SELECT
    month,
    product_category,
    revenue,
    LAG(revenue) OVER (PARTITION BY product_category ORDER BY month) AS prev_month,
    revenue - LAG(revenue) OVER (PARTITION BY product_category ORDER BY month) AS abs_change,
    ROUND((
        (revenue - LAG(revenue) OVER (PARTITION BY product_category ORDER BY month))
        / NULLIF(LAG(revenue) OVER (PARTITION BY product_category ORDER BY month), 0)
    ) * 100, 2) AS pct_change
FROM monthly_totals
ORDER BY product_category, month;

-- 3. Running total and percentage of annual total
WITH monthly_totals AS (
    SELECT
        DATE_TRUNC('month', order_date) AS month,
        SUM(amount) AS revenue
    FROM orders
    WHERE order_date >= '2026-01-01'
    GROUP BY DATE_TRUNC('month', order_date)
)
SELECT
    month,
    revenue,
    SUM(revenue) OVER (ORDER BY month) AS running_total,
    ROUND(
        revenue / NULLIF(SUM(revenue) OVER (), 0) * 100, 2
    ) AS pct_of_year,
    ROUND(
        AVG(revenue) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW),
        2
    ) AS three_month_avg
FROM monthly_totals
ORDER BY month;

-- 4. Identify VIP customers by spending quartile
WITH customer_totals AS (
    SELECT
        customer_id,
        SUM(amount) AS lifetime_value,
        COUNT(*) AS order_count,
        NTILE(4) OVER (ORDER BY SUM(amount) DESC) AS spending_quartile,
        PERCENT_RANK() OVER (ORDER BY SUM(amount) ASC) AS percentile
    FROM orders
    WHERE order_date >= '2026-01-01'
    GROUP BY customer_id
)
SELECT
    customer_id,
    lifetime_value,
    order_count,
    spending_quartile,
    ROUND(percentile * 100, 1) AS percentile_pct
FROM customer_totals
WHERE spending_quartile = 1  -- Top 25%
ORDER BY lifetime_value DESC;
```

### How do I optimize window functions on large tables?

Create composite indexes that match PARTITION BY + ORDER BY. For example, if you use `PARTITION BY category ORDER BY revenue DESC`, create an index on `(category, revenue DESC)`. For LAG/LEAD over time series, an index on `(entity_id, date DESC)` speeds things up considerably. Consider partitioning the table by date if queries always filter by time range. In PostgreSQL, parallelism helps with large tables: configure `max_parallel_workers_per_gather`.





















End of document. Review and update quarterly.