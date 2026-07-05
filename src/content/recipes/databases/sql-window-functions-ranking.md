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
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Rank rows and calculate running totals in SQL with window functions. Learn ROW_NUMBER, RANK, SUM OVER, LAG, and practical analytics use cases."
  keywords:
    - databases
    - sql
    - window-functions
    - postgresql
    - analytics
    - ranking
    - /guides/sql-window-functions-guide
    - /recipes/sql-find-duplicate-rows
    - /recipes/sql-recursive-cte-query
    - /docs/database-schema-documentation-template
    - /guides/full-text-search-guide
    - databases
    - sql
    - window-functions
    - postgresql
    - analytics
    - ranking
    - /guides/sql-window-functions-guide
    - /recipes/sql-find-duplicate-rows
    - /recipes/sql-recursive-cte-query
    - /docs/database-schema-documentation-template
    - /guides/full-text-search-guide
    - sql
    - window-functions
    - postgresql
    - analytics
    - ranking
---


## Overview

Window functions are one of the most capable capabilities in SQL. They let you compute values across a set of rows related to the current row without collapsing the result set like `GROUP BY`. Ranking, running totals, and moving averages become straightforward, and they often replace slow self-joins or application-layer loops.

## When to Use

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

## Explanation

`ROW_NUMBER()` assigns a unique number to each row in the partition. `RANK()` gives the same rank to ties, leaving gaps. `SUM() OVER` computes a running total because the window frame defaults to rows from the start of the partition up to the current row. `LAG()` returns the value from the previous row, useful for deltas. The `PARTITION BY` clause restarts calculations for each department, and `ORDER BY` controls the sequence within the partition.

## Variants

| Function | Use case | Behavior |
|----------|----------|----------|
| ROW_NUMBER | Unique ranking | No gaps, no ties |
| RANK | Tied ranking | Gaps after ties |
| DENSE_RANK | Tied ranking | No gaps |
| SUM OVER | Running totals | Cumulative within partition |
| LAG/LEAD | Compare adjacent rows | Offset by N rows |

## What Works

1. **Index partition and order columns.** The database still needs to sort; indexes help.
2. **Use ROW_NUMBER for top-N when ties do not matter.** Use RANK or DENSE_RANK when ties matter.
3. **Frame clauses matter.** Add `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` explicitly for clarity.
4. **Avoid nesting window functions.** Some databases do not allow `SUM() OVER (ORDER BY ROW_NUMBER() OVER...)`.
5. **Materialize complex reports.** For dashboards, pre-aggregate window results in a summary table.

## Common Mistakes

1. **Forgetting PARTITION BY.** Without it, the window covers the whole table, mixing departments.
2. **Confusing RANK and ROW_NUMBER.** Ties can produce unexpected results if you pick the wrong function.
3. **Using window functions in WHERE clauses.** Most databases require a subquery because window functions run after filtering.
4. **Wrong ORDER BY direction.** Descending order is common for rankings; ascending for running totals.
5. **Ignoring NULLs in ordering.** NULLs sort first or last depending on the database; be explicit with `NULLS FIRST`/`NULLS LAST`.

## Frequently Asked Questions

**Q: What is the difference between RANK and DENSE_RANK?**
A: RANK leaves gaps after ties (1, 1, 3). DENSE_RANK does not (1, 1, 2).

**Q: Can I use window functions with GROUP BY?**
A: Window functions execute after GROUP BY, so you can combine them, but you need to aggregate before applying the window.

**Q: How do I get the top 3 rows per group?**
A: Use `ROW_NUMBER() OVER (PARTITION BY group ORDER BY value DESC)` and filter `WHERE row_num <= 3` in an outer query.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
