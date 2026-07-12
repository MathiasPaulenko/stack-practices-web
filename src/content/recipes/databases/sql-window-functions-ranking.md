---



contentType: recipes
slug: sql-window-functions-ranking
title: "Rank Rows and Calculate Running Totals with Window Functions"
description: "Use SQL window functions to rank rows, compute running totals, and compare values within partitions without self-joins."
metaDescription: "Rank rows and calculate running totals in SQL with window functions. Learn ROW_NUMBER, RANK, SUM OVER, LAG, and practical analytics use cases."
difficulty: intermediate
topics:
  - databases
tags:
  - sql
  - window-functions
  - postgresql
  - analytics
  - ranking
relatedResources:
  - /guides/sql-window-functions-guide
  - /recipes/sql-find-duplicate-rows
  - /recipes/sql-recursive-cte-query
  - /docs/database-schema-documentation-template
  - /guides/full-text-search-guide
  - /recipes/database-migrations
  - /recipes/database-replication
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Rank rows and calculate running totals in SQL with window functions. Learn ROW_NUMBER, RANK, SUM OVER, LAG, and practical analytics use cases."
  keywords:
    - sql window functions
    - row_number rank dense_rank
    - running totals sql
    - lag lead sql
    - sql analytics queries



---


## Overview

Window functions are one of the most capable capabilities in SQL. They let you compute values across a set of rows related to the current row without collapsing the result set like `GROUP BY`. Ranking, running totals, and moving averages become straightforward, and they often replace slow self-joins or application-layer loops.

## When to Use


- For alternatives, see [SQL Window Functions — Complete Guide](/guides/sql-window-functions-guide/).

Use this resource when:
- You need to rank rows within groups (top-N per category).
- You want running totals or moving averages without subqueries.
- You are building leaderboards, sales reports, or pagination with ties.
- You need to compare each row to the previous or next row.

## Solution

### Ranking and running totals

```sql
SELECT
  department,
  employee,
  salary,
  ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS row_num,
  RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rank_num,
  SUM(salary) OVER (PARTITION BY department ORDER BY salary DESC) AS running_total,
  LAG(salary) OVER (PARTITION BY department ORDER BY salary DESC) AS prev_salary
FROM employees;
```

### Top-N rows per category

```sql
-- Top 3 highest-paid employees per department
WITH ranked AS (
  SELECT
    department,
    employee,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn
  FROM employees
)
SELECT department, employee, salary
FROM ranked
WHERE rn <= 3
ORDER BY department, salary DESC;
```

### Moving average with explicit window frame

```sql
-- 7-day moving average of daily revenue
SELECT
  date,
  revenue,
  AVG(revenue) OVER (
    ORDER BY date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) AS moving_avg_7d,
  SUM(revenue) OVER (
    ORDER BY date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS cumulative_revenue
FROM daily_revenue
ORDER BY date;
```

### Year-over-year growth with LAG

```sql
-- Compare each month's revenue to the same month last year
SELECT
  month,
  revenue,
  LAG(revenue, 12) OVER (ORDER BY month) AS revenue_last_year,
  revenue - LAG(revenue, 12) OVER (ORDER BY month) AS yoy_delta,
  ROUND(
    (revenue - LAG(revenue, 12) OVER (ORDER BY month)) /
     NULLIF(LAG(revenue, 12) OVER (ORDER BY month), 0) * 100, 2
  ) AS yoy_pct_change
FROM monthly_revenue
ORDER BY month;
```

### Percentile ranking with NTILE and PERCENT_RANK

```sql
-- Divide customers into 4 quartiles by total spend
SELECT
  customer_id,
  total_spend,
  NTILE(4) OVER (ORDER BY total_spend DESC) AS quartile,
  PERCENT_RANK() OVER (ORDER BY total_spend DESC) AS pct_rank,
  CUME_DIST() OVER (ORDER BY total_spend DESC) AS cumulative_dist
FROM customer_totals;
```

### First and last values per partition

```sql
-- Highest and lowest salary per department on each row
SELECT
  department,
  employee,
  salary,
  FIRST_VALUE(salary) OVER (
    PARTITION BY department ORDER BY salary DESC
  ) AS highest_in_dept,
  LAST_VALUE(salary) OVER (
    PARTITION BY department ORDER BY salary DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS lowest_in_dept
FROM employees;
```

### Deduplicate rows with ROW_NUMBER

```sql
-- Keep only the latest record per user
WITH deduped AS (
  SELECT
    user_id,
    email,
    updated_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) AS rn
  FROM user_records
)
SELECT user_id, email, updated_at
FROM deduped
WHERE rn = 1;
```

## Explanation

`ROW_NUMBER()` assigns a unique number to each row in the partition. `RANK()` gives the same rank to ties, leaving gaps. `SUM() OVER` computes a running total because the window frame defaults to rows from the start of the partition up to the current row. `LAG()` returns the value from the previous row, useful for deltas. The `PARTITION BY` clause restarts calculations for each department, and `ORDER BY` controls the sequence within the partition.

### Window frame syntax

The full window frame syntax gives precise control over which rows are included:

```sql
-- Frame syntax: ROWS BETWEEN <start> AND <end>
-- Start options: UNBOUNDED PRECEDING | N PRECEDING | CURRENT ROW
-- End options: CURRENT ROW | N FOLLOWING | UNBOUNDED FOLLOWING

-- Running total: start to current row
SUM(amount) OVER (ORDER BY date
  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)

-- Trailing 3-row average
AVG(amount) OVER (ORDER BY date
  ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)

-- Centered 5-row average
AVG(amount) OVER (ORDER BY date
  ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING)

-- Entire partition total
SUM(amount) OVER (PARTITION BY category
  ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
```

## Variants

| Function | Use case | Behavior |
|----------|----------|----------|
| ROW_NUMBER | Unique ranking | No gaps, no ties |
| RANK | Tied ranking | Gaps after ties |
| DENSE_RANK | Tied ranking | No gaps |
| SUM OVER | Running totals | Cumulative within partition |
| AVG OVER | Moving averages | Configurable window frame |
| LAG/LEAD | Compare adjacent rows | Offset by N rows |
| FIRST_VALUE/LAST_VALUE | Extremes per partition | First or last in frame |
| NTILE | Bucketing | Divides rows into N buckets |
| PERCENT_RANK | Percentile ranking | 0.0 to 1.0 relative rank |
| CUME_DIST | Cumulative distribution | Fraction of rows at or below |

## What Works

1. **Index partition and order columns.** The database still needs to sort; indexes help.
2. **Use ROW_NUMBER for top-N when ties do not matter.** Use RANK or DENSE_RANK when ties matter.
3. **Frame clauses matter.** Add `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` explicitly for clarity.
4. **Avoid nesting window functions.** Some databases do not allow `SUM() OVER (ORDER BY ROW_NUMBER() OVER...)`.
5. **Materialize complex reports.** For dashboards, pre-aggregate window results in a summary table.
6. **Use CTEs for filtering window results.** Wrap the query and filter in an outer query since window functions cannot appear in WHERE.
7. **Specify NULLS FIRST or NULLS LAST.** Different databases sort NULLs differently; be explicit.

## Common Mistakes

1. **Forgetting PARTITION BY.** Without it, the window covers the whole table, mixing departments.
2. **Confusing RANK and ROW_NUMBER.** Ties can produce unexpected results if you pick the wrong function.
3. **Using window functions in WHERE clauses.** Most databases require a subquery because window functions run after filtering.
4. **Wrong ORDER BY direction.** Descending order is common for rankings; ascending for running totals.
5. **Ignoring NULLs in ordering.** NULLs sort first or last depending on the database; be explicit with `NULLS FIRST`/`NULLS LAST`.
6. **LAST_VALUE without full frame.** `LAST_VALUE` defaults to the current row, not the last row of the partition. Always specify `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`.
7. **Using RANGE instead of ROWS unintentionally.** `RANGE` includes peers (rows with the same order value), which can produce unexpected results in running totals.

## Frequently Asked Questions

**Q: What is the difference between RANK and DENSE_RANK?**
A: RANK leaves gaps after ties (1, 1, 3). DENSE_RANK does not (1, 1, 2).

**Q: Can I use window functions with GROUP BY?**
A: Window functions execute after GROUP BY, so you can combine them, but you need to aggregate before applying the window.

**Q: How do I get the top 3 rows per group?**
A: Use `ROW_NUMBER() OVER (PARTITION BY group ORDER BY value DESC)` and filter `WHERE row_num <= 3` in an outer query.

**Q: What is the difference between ROWS and RANGE in window frames?**
A: `ROWS` counts physical rows. `RANGE` includes all rows with the same order value as peers. For running totals with unique sort keys, they are equivalent. With duplicate sort keys, `RANGE` includes all peers, which may not be what you want.

**Q: Are window functions supported in MySQL?**
A: MySQL 8.0+ supports window functions. MySQL 5.7 does not. PostgreSQL, SQL Server, Oracle, and SQLite 3.25+ all support them.

**Q: How do window functions affect performance?**
A: Window functions require sorting, which is O(n log n). With proper indexes on partition and order columns, the sort can be avoided. For large datasets, consider materializing results in a summary table.

**Q: Can I use multiple window functions in one query?**
A: Yes. Each window function can have its own `OVER()` clause with different partitions and orderings. The database optimizes by sharing sorts when multiple functions use the same partition and order.

**Q: How do I calculate a percentage of total per row?**
A: Divide each row's value by the partition total: `SUM(value) OVER () AS grand_total, value / SUM(value) OVER () * 100 AS pct_of_total`.

## Ranking Function Comparison

| Scenario | ROW_NUMBER | RANK | DENSE_RANK |
|----------|-----------|------|------------|
| Salaries: 100, 90, 90, 80 | 1, 2, 3, 4 | 1, 2, 2, 4 | 1, 2, 2, 3 |
| Ties get same number | No | Yes | Yes |
| Gaps after ties | No gaps | Gaps | No gaps |
| Best for | Deduplication, top-N | Competitive ranking | Dense ranking |

```sql
-- See all three side by side
SELECT
  employee,
  salary,
  ROW_NUMBER() OVER (ORDER BY salary DESC) AS rn,
  RANK() OVER (ORDER BY salary DESC) AS rnk,
  DENSE_RANK() OVER (ORDER BY salary DESC) AS dense_rnk
FROM employees
ORDER BY salary DESC;
```

## Performance Tips

1. **Add indexes on PARTITION BY + ORDER BY columns.** A composite index on `(department, salary DESC)` lets PostgreSQL avoid sorting for the window function.

2. **Use EXPLAIN to verify sort avoidance.** Look for `WindowAgg` with no preceding `Sort` node when indexes are available.

```sql
-- Check if the sort is avoided with an index
EXPLAIN ANALYZE
SELECT
  department,
  employee,
  salary,
  ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn
FROM employees;
```

3. **Limit partitions for large tables.** If you only need top-N for a few departments, filter first in a subquery to reduce the sort volume.

4. **Consider materialized views for dashboards.** Window function results are expensive to recompute on every page load. Store them in a materialized view and refresh periodically.

```sql
CREATE MATERIALIZED VIEW dept_ranking AS
SELECT
  department,
  employee,
  salary,
  ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn
FROM employees;

-- Refresh weekly
REFRESH MATERIALIZED VIEW CONCURRENTLY dept_ranking;
```
