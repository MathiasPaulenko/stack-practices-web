---
contentType: recipes
slug: sql-cte-recursive-hierarchy
title: "CTEs Recursivas para Consultas de Datos Jerárquicos"
description: "Cómo consultar datos jerárquicos con Common Table Expressions recursivas en SQL, cubriendo tree traversal, org charts, árboles de categorías y detección de ciclos."
metaDescription: "Consulta datos jerárquicos con CTEs recursivas en SQL. Recorre árboles, construye org charts, árboles de categorías, detecta ciclos y calcula profundidad con CTEs."
difficulty: advanced
topics:
  - data
tags:
  - data
  - sql
  - cte
  - recursive
  - hierarchy
  - recipe
relatedResources:
  - /recipes/data/python-pandas-etl-pipeline
  - /recipes/data/python-dbt-model-transformations
  - /recipes/data/python-spark-groupby-aggregation
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Consulta datos jerárquicos con CTEs recursivas en SQL. Recorre árboles, construye org charts, árboles de categorías, detecta ciclos y calcula profundidad con CTEs."
  keywords:
    - data
    - sql
    - cte
    - recursive
    - hierarchy
    - recipe
---

## Overview

Las Common Table Expressions (CTEs) recursivas permiten que una query se referencie a sí misma, habilitando el traversal de datos jerárquicos almacenados en una sola tabla. Una CTE recursiva tiene dos partes: un caso base (anchor member) que selecciona las rows iniciales, y un recursive member que joinea esas rows de vuelta a la tabla source. Este patrón funciona para org charts, árboles de categorías, file systems, comentarios anidados y cualquier relación parent-child almacenada con una self-referencing foreign key.

## When to Use

- Org charts: encontrar todos los reports de un manager (directos e indirectos)
- Árboles de categorías: obtener todas las subcategorías bajo un parent
- File systems: listar todos los archivos en un directory tree
- Comentarios anidados: fetchear un comentario y todas sus respuestas
- Bill of materials: explotar un assembly en sus component parts
- Grafos de dependencias: encontrar todas las dependencias transitivas

## When NOT to Use

- Queries planas sin jerarquía — una CTE regular o subquery es más simple
- Jerarquías muy profundas (1000+ niveles) — algunas bases de datos hit recursion limits
- Graph traversal con ciclos — las CTEs recursivas no manejan ciclos nativamente
- Cuando necesitas shortest path — usa graph databases (Neo4j) o graph algorithms

## Solution

### Estructura básica de CTE recursiva

```sql
WITH RECURSIVE hierarchy AS (
    -- Anchor member: punto de partida
    SELECT
        id,
        parent_id,
        name,
        1 AS depth
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive member: join de vuelta a la CTE
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

### Org chart: todos los reports de un manager específico

```sql
WITH RECURSIVE reports AS (
    -- Anchor: reports directos del manager 5
    SELECT
        employee_id,
        manager_id,
        employee_name,
        1 AS depth,
        CAST(manager_id AS VARCHAR(1000)) AS path
    FROM employees
    WHERE manager_id = 5

    UNION ALL

    -- Recursive: reports de reports
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

### Árbol de categorías con path completo

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

### Encontrar todos los ancestors (traversal bottom-up)

```sql
WITH RECURSIVE ancestors AS (
    -- Anchor: nodo inicial
    SELECT
        id,
        parent_id,
        name,
        1 AS depth
    FROM categories
    WHERE id = 42  -- Empezar desde un nodo específico

    UNION ALL

    -- Recursive: subir al parent
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

### Agregar a través de la jerarquía

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

### Roll-up: sumar valores de hijos a todos los ancestors

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
    -- Este approach es simplificado; un rollup más preciso
    -- requiere construir el path y checkear containment
    GROUP BY d.id, d.name
)
SELECT * FROM rollup ORDER BY total_descendant_amount DESC;
```

### Detección de ciclos

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

### Limitar profundidad de recursión

```sql
WITH RECURSIVE limited_tree AS (
    SELECT id, parent_id, name, 1 AS depth
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    SELECT c.id, c.parent_id, c.name, lt.depth + 1
    FROM categories c
    INNER JOIN limited_tree lt ON c.parent_id = lt.id
    WHERE lt.depth < 5  -- Solo 5 niveles de profundidad
)
SELECT * FROM limited_tree ORDER BY depth, name;
```

### Explosión de bill of materials

```sql
WITH RECURSIVE bom AS (
    -- Anchor: assembly top-level
    SELECT
        component_id,
        assembly_id,
        quantity,
        1 AS level,
        CAST(component_id AS VARCHAR(1000)) AS component_path
    FROM bill_of_materials
    WHERE assembly_id = 'PRODUCT-001'

    UNION ALL

    -- Recursive: componentes de componentes
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

### PostgreSQL: usar ARRAY para path

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
    WHERE c.id != ALL(ct.path)  -- Prevención de ciclos
)
SELECT id, name, path, depth FROM category_tree ORDER BY path;
```

### MySQL 8.0+: sintaxis de CTE recursiva

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

### SQL Server: sin keyword RECURSIVE

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

### Snowflake: usar CONNECT BY (alternativa)

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

- Siempre incluye una columna depth/level — ayuda a debuggear y limitar la recursión
- Agrega un safety limit (`WHERE depth < N`) — previene recursión infinita en data cíclica
- Usa `UNION ALL` no `UNION` — `UNION` deduplica lo cual es expensive y usualmente innecesario
- Construye una columna path para debugging — muestra la ruta de traversal
- Testea con datasets pequeños primero — las CTEs recursivas pueden ser lentas en tablas grandes
- Agrega índices en parent_id e id — el recursive join hittea estas columnas repetidamente
- Usa `OPTION (MAXRECURSION N)` en SQL Server — el límite default es 100

## Common Mistakes

- **Olvidar el anchor member**: sin un punto de partida, la CTE no retorna nada. El anchor debe seleccionar rows que no dependan de la CTE.
- **Usar `UNION` en lugar de `UNION ALL`**: `UNION` deduplica resultados, agregando overhead. Usa `UNION ALL` a menos que específicamente necesites deduplicación.
- **Sin detección de ciclos**: data cíclica causa recursión infinita. Agrega una columna path y checkea repeats, o agrega un depth limit.
- **No indexar parent_id**: el recursive join hace `JOIN c ON c.parent_id = h.id` — sin índice en `parent_id`, esto es un full table scan por nivel de recursión.
- **Esperar orden breadth-first**: las CTEs recursivas retornan depth-first por default. Usa `ORDER BY depth` para output breadth-first.

## FAQ

### ¿Qué es una CTE recursiva?

Una CTE que se referencia a sí misma. Tiene un anchor member (caso base) y un recursive member (joinea de vuelta a la CTE). La base de datos evalúa el anchor primero, luego aplica repetidamente el recursive member hasta que no se generan nuevas rows.

### ¿Qué bases de datos soportan CTEs recursivas?

PostgreSQL, MySQL 8.0+, SQLite 3.8.4+, SQL Server (2008+), Oracle (11gR2+), Snowflake, BigQuery y DuckDB. La sintaxis es similar — algunas requieren el keyword `RECURSIVE`, otras no (SQL Server).

### ¿Cómo prevengo recursión infinita?

Agrega un depth limit (`WHERE depth < 100`) o trackea nodos visitados en un path array/string y checkea repeats. En SQL Server, usa `OPTION (MAXRECURSION N)`.

### ¿Cuál es la diferencia entre CTE recursiva y CONNECT BY?

`CONNECT BY` es la sintaxis propietaria de Oracle (también soportada por Snowflake). Las CTEs recursivas son el estándar SQL. `CONNECT BY` es más conciso pero menos flexible. Usa CTEs recursivas para portabilidad.

### ¿Puedo usar CTEs recursivas para graph traversal?

Para árboles simples (sin ciclos), sí. Para grafos con ciclos o cuando necesitas shortest path, usa una graph database (Neo4j) o graph algorithms. Las CTEs recursivas no soportan detección de ciclos nativamente — necesitas construirla manualmente.
