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
  - /recipes/sql-index-optimization-analysis
  - /recipes/sql-migration-zero-downtime
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


- For alternatives, see [SQL CTEs — Common Table Expressions Explained](/guides/sql-cte-guide/).

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

### Build a path string with breadcrumbs

```sql
WITH RECURSIVE category_tree AS (
  -- Anchor: root categories
  SELECT id, name, parent_id, 0 AS depth, name::TEXT AS path
  FROM categories
  WHERE parent_id IS NULL

  UNION ALL

  -- Recursive: append child name to path
  SELECT c.id, c.name, c.parent_id, ct.depth + 1,
         ct.path || ' > ' || c.name
  FROM categories c
  INNER JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT id, name, depth, path
FROM category_tree
ORDER BY path;
```

### Find all descendants of a specific node

```sql
WITH RECURSIVE descendants AS (
  -- Anchor: start from a specific node
  SELECT id, name, parent_id, 0 AS depth
  FROM categories
  WHERE id = 42  -- starting node

  UNION ALL

  -- Recursive: find children
  SELECT c.id, c.name, c.parent_id, d.depth + 1
  FROM categories c
  INNER JOIN descendants d ON c.parent_id = d.id
)
SELECT * FROM descendants
ORDER BY depth, name;
```

### Find all ancestors of a node (path to root)

```sql
WITH RECURSIVE ancestors AS (
  -- Anchor: start from a specific node
  SELECT id, name, parent_id, 0 AS depth
  FROM categories
  WHERE id = 99  -- starting node

  UNION ALL

  -- Recursive: find parent
  SELECT c.id, c.name, c.parent_id, a.depth + 1
  FROM categories c
  INNER JOIN ancestors a ON a.parent_id = c.id
)
SELECT * FROM ancestors
ORDER BY depth DESC;
```

### Cycle detection with a path array

```sql
WITH RECURSIVE safe_tree AS (
  -- Anchor
  SELECT id, name, manager_id, 0 AS depth,
         ARRAY[id] AS visited
  FROM employees
  WHERE manager_id IS NULL

  UNION ALL

  -- Recursive: only add nodes not already visited
  SELECT e.id, e.name, e.manager_id, st.depth + 1,
         st.visited || e.id
  FROM employees e
  INNER JOIN safe_tree st ON e.manager_id = st.id
  WHERE NOT e.id = ANY(st.visited)
)
SELECT id, name, depth, visited
FROM safe_tree
ORDER BY depth, name;
```

### Bill of materials explosion

```sql
WITH RECURSIVE bom_explosion AS (
  -- Anchor: top-level assembly
  SELECT
    part_id, part_name, 1 AS quantity,
    0 AS depth, ARRAY[part_id] AS path
  FROM parts
  WHERE parent_part_id IS NULL
    AND part_id = 'BICYCLE-001'

  UNION ALL

  -- Recursive: explode sub-components
  SELECT
    p.part_id, p.part_name,
    p.quantity * be.quantity AS total_quantity,
    be.depth + 1,
    be.path || p.part_id
  FROM parts p
  INNER JOIN bom_explosion be ON p.parent_part_id = be.part_id
)
SELECT
  part_id, part_name, total_quantity, depth,
  array_to_string(path, ' -> ') AS assembly_path
FROM bom_explosion
ORDER BY depth, part_name;
```

### Limit recursion depth

```sql
WITH RECURSIVE limited_tree AS (
  SELECT id, name, manager_id, 0 AS depth
  FROM employees
  WHERE manager_id IS NULL

  UNION ALL

  SELECT e.id, e.name, e.manager_id, lt.depth + 1
  FROM employees e
  INNER JOIN limited_tree lt ON e.manager_id = lt.id
  WHERE lt.depth < 5  -- stop at 5 levels
)
SELECT * FROM limited_tree
ORDER BY depth, name;
```

## Explanation

The recursive CTE has two parts. The anchor member selects the top-level nodes, typically where the parent reference is `NULL`. The recursive member joins the employees table to the CTE itself, finding rows whose `manager_id` matches an `id` already in the result set. `UNION ALL` combines both parts, and the database repeats the recursive step until no new rows are produced. The `depth` column increments each level so you can visualize the hierarchy or limit recursion with `WHERE depth < N`.

### How the database executes recursive CTEs

1. Evaluate the anchor member and store results in a working table
2. Evaluate the recursive member using the working table as input
3. Replace the working table with the new results
4. Repeat steps 2-3 until the working table is empty
5. Combine all results with `UNION ALL`

### Cycle safety

Without cycle detection, a row that references itself (directly or transitively) causes infinite recursion. The `visited` array approach tracks which nodes have been seen. PostgreSQL 14+ also supports the `CYCLE` clause:

```sql
WITH RECURSIVE org_tree AS (
  SELECT id, name, manager_id FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, e.manager_id FROM employees e
  JOIN org_tree ot ON e.manager_id = ot.id
)
CYCLE id SET is_cycle TO true DEFAULT false USING cycle_path
SELECT * FROM org_tree WHERE NOT is_cycle;
```

## Variants

| Use case | Anchor | Recursive join |
|----------|--------|----------------|
| Org chart (top-down) | `manager_id IS NULL` | `manager_id = id` |
| Path to root (bottom-up) | `id = ?` | `id = parent_id` |
| Comment thread | `parent_id IS NULL` | `parent_id = id` |
| Bill of materials | `parent_part_id IS NULL` | `parent_part_id = id` |
| File system | `parent_dir_id IS NULL` | `parent_dir_id = id` |
| Category tree | `parent_id IS NULL` | `parent_id = id` |

## What Works

1. **Always include a cycle guard.** Add a `path` array or a `visited` check to prevent infinite recursion when data contains cycles.
2. **Index the parent/child columns.** An index on `manager_id` makes the recursive join much faster.
3. **Limit recursion depth when possible.** Use `WHERE depth < 10` to avoid runaway queries on bad data.
4. **Materialize small trees if read often.** A recursive CTE on every request can be expensive; cache or precompute for static hierarchies.
5. **Prefer adjacency lists for simple trees.** Recursive CTEs work best with simple parent-child columns.
6. **Use `ARRAY` for path tracking.** Arrays are efficient for cycle detection and can be rendered as breadcrumbs.
7. **Test with small datasets first.** Recursive CTEs can be hard to debug; start with 10-20 rows and verify depth and path columns.

## Common Mistakes

1. **Forgetting `UNION ALL` vs `UNION`.** Recursive CTEs require `UNION ALL` because duplicates are intentional. `UNION` removes duplicates and can hide data.
2. **No cycle protection.** A row pointing to itself causes a stack overflow or query cancellation.
3. **Missing anchor condition.** Without a clear starting point, the CTE returns nothing or everything.
4. **Recursive step joining the wrong direction.** Confusing `parent_id = id` and `id = parent_id` produces ancestors instead of descendants.
5. **Running recursive CTEs on huge graphs.** Deep recursion can exhaust work memory or hit database limits.
6. **Not indexing the join column.** The recursive member joins on `manager_id`; without an index, each iteration scans the full table.
7. **Using depth limit without understanding data.** A `WHERE depth < 5` may silently truncate legitimate deep hierarchies.

## Frequently Asked Questions

**Q: Can recursive CTEs handle cycles?**
A: Yes, but you must track visited nodes with an array or use PostgreSQL's `CYCLE` clause (14+). Without protection, cycles cause infinite recursion.

**Q: Are recursive CTEs supported in all databases?**
A: Most modern databases support them: MySQL 8.0+, PostgreSQL, SQL Server, SQLite 3.8.3+. Oracle uses `CONNECT BY` as an alternative.

**Q: How do I build a path string in a recursive CTE?**
A: Add a column like `path || '/' || name` and pass it through each recursion level to show the full breadcrumb.

**Q: What is the performance impact of recursive CTEs?**
A: Each iteration of the recursive member runs a join. With an index on the join column, each iteration is an index lookup. Without an index, each iteration scans the full table, making the CTE O(n * depth).

**Q: Can I use recursive CTEs for graph traversal?**
A: Yes, but only for trees (each node has one parent). For general graphs with multiple paths to the same node, use cycle detection and consider specialized graph databases.

**Q: How do I limit the number of rows returned?**
A: Use `LIMIT N` in the outer query. The database still computes all recursive results, but only returns N rows. For true early termination, use `FETCH FIRST N ROWS ONLY` in the recursive member.

**Q: Can I aggregate data at each level of the hierarchy?**
A: Yes. Use a recursive CTE to generate the tree, then join back to aggregate. For example, sum all sales for each manager including their sub-managers' sales.

**Q: How do I debug a recursive CTE that returns no rows?**
A: Run the anchor member alone first. If it returns rows, add the recursive member with `LIMIT 1` iteration. Check the join condition direction and verify the anchor condition matches your data.

## Performance Tips

1. **Index the join column.** The recursive member joins on `manager_id` or `parent_id`. Without an index, each iteration scans the full table.

```sql
CREATE INDEX idx_employees_manager_id ON employees (manager_id);
CREATE INDEX idx_categories_parent_id ON categories (parent_id);
```

2. **Use `MATERIALIZED` for large CTEs.** In PostgreSQL 12+, CTEs are inlined by default. For recursive CTEs that are referenced multiple times, use `MATERIALIZED` to compute once:

```sql
WITH RECURSIVE org_tree AS MATERIALIZED (
  SELECT id, name, manager_id, 0 AS depth FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, e.manager_id, ot.depth + 1 FROM employees e JOIN org_tree ot ON e.manager_id = ot.id
)
SELECT * FROM org_tree;
```

3. **Set `work_mem` higher for deep trees.** Recursive CTEs build up intermediate results in memory. Increase `work_mem` for the session if you hit disk spills.

4. **Use `EXPLAIN ANALYZE` to verify iteration count.** The plan shows how many iterations the recursive member ran. If it runs hundreds of times, check for missing indexes or cycles.
