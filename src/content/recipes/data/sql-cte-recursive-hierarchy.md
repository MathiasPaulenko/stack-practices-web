---


contentType: recipes
slug: sql-cte-recursive-hierarchy
title: "Recursive CTEs for Hierarchical Data Queries"
description: "How to query hierarchical data with recursive Common Table Expressions in SQL, covering tree traversal, org charts, category trees, and cycle detection."
metaDescription: "Query hierarchical data with recursive CTEs in SQL. Traverse trees, build org charts, category trees, detect cycles, and compute depth with Common Table Expressions."
difficulty: advanced
topics:
  - data
tags:
  - data
  - sql
  - cte
  - hierarchy
  - recipe
relatedResources:
  - /recipes/python-pandas-etl-pipeline
  - /recipes/python-dbt-model-transformations
  - /recipes/python-spark-groupby-aggregation
  - /recipes/parse-csv-python-pandas
  - /recipes/batch-processing-patterns
  - /recipes/python-polars-fast-dataframe
lastUpdated: "2026-08-22"
publishedAt: "2026-07-05"
author: Mathias Paulenko
seo:
  metaDescription: "Query hierarchical data with recursive CTEs in SQL. Traverse trees, build org charts, category trees, detect cycles, and compute depth with Common Table Expressions."
  keywords:
    - data
    - sql
    - cte
    - recursive
    - hierarchy
    - recipe


---

## Overview

A recursive Common Table Expression (CTE) lets a query reference itself, so you can walk through hierarchical
data stored in a single table. It's got two moving parts: an anchor member that picks the starting rows, and a
recursive member that joins those rows back to the source table. That combination handles org charts, category
trees, file systems, threaded comments, and any parent-child relationship tied together with a self-referencing
foreign key.

## When to Use

Use a recursive CTE when you need to walk a hierarchy from a known starting point. Common cases include
finding every direct and indirect report under a manager, listing all subcategories under a parent category,
traversing a directory tree, fetching a comment and all its replies, exploding a bill of materials into
components, or following transitive dependencies.

## When NOT to Use

Skip the recursive CTE for flat queries that don't traverse hierarchy; a regular CTE or a subquery is simpler.
It also isn't the right tool for very deep hierarchies (some databases hit recursion limits), graph traversal
with cycles (recursive CTEs don't handle cycles natively), or shortest-path problems (use a graph database or
algorithm for those).

## Solution

### Basic recursive CTE structure

```sql
WITH RECURSIVE hierarchy AS (
    -- Anchor member: starting point
    SELECT
        id,
        parent_id,
        name,
        1 AS depth
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive member: join back to the CTE
    SELECT
        c.id,
        c.parent_id,
        c.name,
        h.depth + 1 AS depth
    FROM categories c
    INNER JOIN hierarchy h ON c.parent_id = h.id
)
SELECT * FROM hierarchy ORDER BY depth, name;
```

### Org chart: all reports of a specific manager

```sql
WITH RECURSIVE reports AS (
    -- Anchor: direct reports of manager 5
    SELECT
        employee_id,
        manager_id,
        employee_name,
        1 AS depth,
        CAST(manager_id AS VARCHAR(1000)) AS path
    FROM employees
    WHERE manager_id = 5

    UNION ALL

    -- Recursive: reports of reports
    SELECT
        e.employee_id,
        e.manager_id,
        e.employee_name,
        r.depth + 1,
        r.path || ' -> ' || CAST(e.manager_id AS VARCHAR)
    FROM employees e
    INNER JOIN reports r ON e.manager_id = r.employee_id
)
SELECT
    employee_id,
    employee_name,
    depth,
    path
FROM reports
ORDER BY depth, employee_name;
```

### Category tree with full path

```sql
WITH RECURSIVE category_tree AS (
    SELECT
        id,
        parent_id,
        name,
        CAST(name AS VARCHAR(1000)) AS full_path,
        1 AS depth
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    SELECT
        c.id,
        c.parent_id,
        c.name,
        ct.full_path || ' / ' || c.name,
        ct.depth + 1
    FROM categories c
    INNER JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT
    id,
    name,
    full_path,
    depth
FROM category_tree
ORDER BY full_path;
```

### Find all ancestors (bottom-up traversal)

```sql
WITH RECURSIVE ancestors AS (
    -- Anchor: starting node
    SELECT
        id,
        parent_id,
        name,
        1 AS depth
    FROM categories
    WHERE id = 42  -- Start from a specific node

    UNION ALL

    -- Recursive: go up to parent
    SELECT
        c.id,
        c.parent_id,
        c.name,
        a.depth + 1
    FROM categories c
    INNER JOIN ancestors a ON c.id = a.parent_id
)
SELECT * FROM ancestors ORDER BY depth DESC;
```

### Aggregating across hierarchy

```sql
WITH RECURSIVE category_tree AS (
    SELECT id, parent_id, name, 1 AS depth
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    SELECT c.id, c.parent_id, c.name, ct.depth + 1
    FROM categories c
    INNER JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT
    ct.id,
    ct.name,
    ct.depth,
    COUNT(p.id) AS product_count,
    COALESCE(SUM(p.price), 0) AS total_value
FROM category_tree ct
LEFT JOIN products p ON p.category_id = ct.id
GROUP BY ct.id, ct.name, ct.depth
ORDER BY ct.depth, ct.name;
```

### Roll-up: sum child values to all ancestors

```sql
WITH RECURSIVE descendants AS (
    SELECT id, parent_id, name, amount, 1 AS depth
    FROM nodes
    WHERE id = 1  -- Root node

    UNION ALL

    SELECT
        n.id,
        n.parent_id,
        n.name,
        n.amount,
        d.depth + 1
    FROM nodes n
    INNER JOIN descendants d ON n.parent_id = d.id
),
rollup AS (
    SELECT
        d.id,
        d.name,
        SUM(child.amount) AS total_descendant_amount
    FROM descendants d
    INNER JOIN descendants child
        ON child.id = d.id OR child.depth > d.depth
    -- This approach is simplified; a more accurate rollup
    -- requires building the path and checking containment
    GROUP BY d.id, d.name
)
SELECT * FROM rollup ORDER BY total_descendant_amount DESC;
```

### Cycle detection

```sql
WITH RECURSIVE traversal AS (
    SELECT
        id,
        parent_id,
        CAST(id AS VARCHAR(1000)) AS path,
        1 AS depth,
        false AS has_cycle
    FROM nodes
    WHERE id = 1

    UNION ALL

    SELECT
        n.id,
        n.parent_id,
        t.path || ' -> ' || CAST(n.id AS VARCHAR),
        t.depth + 1,
        POSITION(CAST(n.id AS VARCHAR) IN t.path) > 0 AS has_cycle
    FROM nodes n
    INNER JOIN traversal t ON n.parent_id = t.id
    WHERE t.has_cycle = false
    AND t.depth < 100  -- Safety limit
)
SELECT * FROM traversal WHERE has_cycle = true;
```

### Limiting recursion depth

```sql
WITH RECURSIVE limited_tree AS (
    SELECT id, parent_id, name, 1 AS depth
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    SELECT c.id, c.parent_id, c.name, lt.depth + 1
    FROM categories c
    INNER JOIN limited_tree lt ON c.parent_id = lt.id
    WHERE lt.depth < 5  -- Only 5 levels deep
)
SELECT * FROM limited_tree ORDER BY depth, name;
```

### Bill of materials explosion

```sql
WITH RECURSIVE bom AS (
    -- Anchor: top-level assembly
    SELECT
        component_id,
        assembly_id,
        quantity,
        1 AS level,
        CAST(component_id AS VARCHAR(1000)) AS component_path
    FROM bill_of_materials
    WHERE assembly_id = 'PRODUCT-001'

    UNION ALL

    -- Recursive: components of components
    SELECT
        b.component_id,
        b.assembly_id,
        b.quantity * bom.quantity AS total_quantity,
        bom.level + 1,
        bom.component_path || ' -> ' || CAST(b.component_id AS VARCHAR)
    FROM bill_of_materials b
    INNER JOIN bom ON b.assembly_id = bom.component_id
)
SELECT
    component_id,
    level,
    total_quantity,
    component_path
FROM bom
ORDER BY level, component_id;
```

## Variants

### PostgreSQL: using ARRAY for path

```sql
WITH RECURSIVE category_tree AS (
    SELECT
        id,
        parent_id,
        name,
        ARRAY[id] AS path,
        1 AS depth
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    SELECT
        c.id,
        c.parent_id,
        c.name,
        ct.path || c.id,
        ct.depth + 1
    FROM categories c
    INNER JOIN category_tree ct ON c.parent_id = ct.id
    WHERE c.id != ALL(ct.path)  -- Cycle prevention
)
SELECT id, name, path, depth FROM category_tree ORDER BY path;
```

### MySQL 8.0+: recursive CTE syntax

```sql
WITH RECURSIVE org_tree AS (
    SELECT employee_id, manager_id, employee_name, 1 AS level
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    SELECT e.employee_id, e.manager_id, e.employee_name, ot.level + 1
    FROM employees e
    JOIN org_tree ot ON e.manager_id = ot.employee_id
)
SELECT * FROM org_tree WHERE level <= 3 ORDER BY level;
```

### SQL Server: no RECURSIVE keyword needed

```sql
WITH org_tree AS (
    SELECT employee_id, manager_id, employee_name, 1 AS level
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    SELECT e.employee_id, e.manager_id, e.employee_name, ot.level + 1
    FROM employees e
    JOIN org_tree ot ON e.manager_id = ot.employee_id
)
SELECT * FROM org_tree OPTION (MAXRECURSION 100);
```

### Snowflake: using CONNECT BY (alternative)

```sql
SELECT
    employee_id,
    manager_id,
    employee_name,
    LEVEL AS depth,
    SYS_CONNECT_BY_PATH(employee_name, ' -> ') AS path
FROM employees
START WITH manager_id IS NULL
CONNECT BY PRIOR employee_id = manager_id
ORDER SIBLINGS BY employee_name;
```

## Best Practices

- Always include a `depth` or `level` column. It makes debugging easier and gives you a simple way to cap
  recursion.
- Add a safety limit such as `WHERE depth < N` to prevent infinite recursion on cyclic data.
- Use `UNION ALL` instead of `UNION`; `UNION` deduplicates, which adds overhead you usually don't need.
- Build a path column for debugging so you can see the exact traversal route.
- Test with small datasets first; recursive CTEs can be slow on large tables.
- Index `parent_id` and `id`; the recursive join hits those columns repeatedly.
- SQL Server users can override the default limit of 100 with `OPTION (MAXRECURSION N)`.

For a deeper guide, see [Transform Data in the Warehouse with dbt](/recipes/python-dbt-model-transformations/).

## Common Mistakes

- Forgetting the anchor member. Without a starting point the CTE returns nothing; the anchor has to select rows
  that don't depend on the CTE.
- Using `UNION` instead of `UNION ALL` for no reason. `UNION` deduplicates results and adds overhead, so use
  `UNION ALL` unless you actually need deduplication.
- Skipping cycle detection. Cyclic data causes infinite recursion, so add a path column and check for repeats, or
  add a depth limit.
- Not indexing `parent_id`. The recursive join does `JOIN c ON c.parent_id = h.id`; without an index on
  `parent_id`, each level becomes a full table scan.
- Expecting breadth-first order. Recursive CTEs return depth-first by default. Use `ORDER BY depth` if you want
  breadth-first output.

## FAQ

### What is a recursive CTE?

A recursive CTE is one that references itself. It's got an anchor member (the base case) and a recursive
member (the part that joins back to the CTE). The database evaluates the anchor first, then keeps applying the
recursive member until it stops producing new rows.

### Which databases support recursive CTEs?

Most modern SQL engines support them: PostgreSQL, MySQL 8.0+, SQLite 3.8.4+, SQL Server (2008+), Oracle
(11gR2+), Snowflake, BigQuery, and DuckDB. The syntax is similar across engines; some require the `RECURSIVE`
keyword, and some don't (SQL Server, for example).

### How do I prevent infinite recursion?

Add a depth limit such as `WHERE depth < 100`, or track visited nodes in a path array or string and check for
repeats. SQL Server also gives you `OPTION (MAXRECURSION N)` as a secondary guard.

### What is the difference between recursive CTE and CONNECT BY?

`CONNECT BY` is Oracle's proprietary syntax, also supported by Snowflake. Recursive CTEs, on the other hand, are
part of the SQL standard. `CONNECT BY` is more concise but less flexible, so use recursive CTEs when you care
about portability.

### Can I use recursive CTEs for graph traversal?

For simple trees without cycles, yes. Once cycles or shortest-path problems show up, a graph database or
graph algorithm is a better fit. Recursive CTEs don't support cycle detection natively, so you've got to build
that part yourself.
