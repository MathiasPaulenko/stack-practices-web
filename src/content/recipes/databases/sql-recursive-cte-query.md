---
contentType: recipes
slug: sql-recursive-cte-query
title: "Traverse Hierarchical Data with Recursive CTEs"
description: "Query tree-like or graph-like structures in SQL using recursive common table expressions to walk parent-child relationships."
metaDescription: "Traverse hierarchical data in SQL with recursive CTEs. Learn how to query parent-child relationships, org charts, and tree structures safely."
difficulty: intermediate
topics:
  - databases
tags:
  - sql
  - recursive-cte
  - postgresql
  - hierarchy
  - trees
relatedResources:
  - /guides/sql-cte-guide
  - /recipes/sql-find-duplicate-rows
  - /docs/database-schema-documentation-template
  - /guides/full-text-search-guide
  - /guides/read-replica-guide
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Traverse hierarchical data in SQL with recursive CTEs. Learn how to query parent-child relationships, org charts, and tree structures safely."
  keywords:
    - databases
    - sql
    - recursive-cte
    - postgresql
    - hierarchy
    - trees
---


## Overview

Relational databases are great at tables, but many real-world problems are trees: org charts, comment threads, bill-of-materials, and file systems. Recursive common table expressions let SQL walk these hierarchies by starting at the root and repeatedly joining children until no more rows are found. The result is a flat table with a depth column that shows how far each node is from the starting point.

## When to Use

Use this resource when:
- You need to query parent-child relationships stored in the same table.
- You want to list all descendants or ancestors of a node.
- A nested-set or closure-table model is too complex for your current schema.
- You are building org charts, threaded comments, or category trees.

## Solution

### Recursive CTE for an org chart

```sql
WITH RECURSIVE org_tree AS (
  -- Anchor: start at the CEO
  SELECT id, name, manager_id, 0 AS depth
  FROM employees
  WHERE manager_id IS NULL

  UNION ALL

  -- Recursive: add direct reports
  SELECT e.id, e.name, e.manager_id, ot.depth + 1
  FROM employees e
  INNER JOIN org_tree ot ON e.manager_id = ot.id
)
SELECT * FROM org_tree
ORDER BY depth, name;
```

## Explanation

The recursive CTE has two parts. The anchor member selects the top-level nodes, typically where the parent reference is `NULL`. The recursive member joins the employees table to the CTE itself, finding rows whose `manager_id` matches an `id` already in the result set. `UNION ALL` combines both parts, and the database repeats the recursive step until no new rows are produced. The `depth` column increments each level so you can visualize the hierarchy or limit recursion with `WHERE depth < N`.

## Variants

| Use case | Anchor | Recursive join |
|----------|--------|----------------|
| Org chart | `manager_id IS NULL` | `manager_id = id` |
| Comment thread | `parent_id IS NULL` | `parent_id = id` |
| Bill of materials | `parent_part_id IS NULL` | `parent_part_id = id` |
| Path to root | `id = ?` | `id = parent_id` |

## What Works

1. **Always include a cycle guard.** Add a `path` array or a `visited` check to prevent infinite recursion when data contains cycles.
2. **Index the parent/child columns.** An index on `manager_id` makes the recursive join much faster.
3. **Limit recursion depth when possible.** Use `WHERE depth < 10` to avoid runaway queries on bad data.
4. **Materialize small trees if read often.** A recursive CTE on every request can be expensive; cache or precompute for static hierarchies.
5. **Prefer adjacency lists for simple trees.** Recursive CTEs work best with simple parent-child columns.

## Common Mistakes

1. **Forgetting `UNION ALL` vs `UNION`.** Recursive CTEs require `UNION ALL` because duplicates are intentional.
2. **No cycle protection.** A row pointing to itself causes a stack overflow or query cancellation.
3. **Missing anchor condition.** Without a clear starting point, the CTE returns nothing or everything.
4. **Recursive step joining the wrong direction.** Confusing `parent_id = id` and `id = parent_id` produces ancestors instead of descendants.
5. **Running recursive CTEs on huge graphs.** Deep recursion can exhaust work memory or hit database limits.

## Frequently Asked Questions

**Q: Can recursive CTEs handle cycles?**
A: Yes, but you must track visited nodes. PostgreSQL can also use `CYCLE` detection syntax in newer versions.

**Q: Are recursive CTEs supported in all databases?**
A: Most modern databases support them, but MySQL 8.0+, PostgreSQL, SQL Server, and SQLite 3.8.3+ do. Oracle uses `CONNECT BY` as an alternative.

**Q: How do I build a path string in a recursive CTE?**
A: Add a column like `path || '/' || name` and pass it through each recursion level to show the full breadcrumb.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
