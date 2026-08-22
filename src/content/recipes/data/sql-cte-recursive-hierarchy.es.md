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
  metaDescription: "Consulta datos jerárquicos con CTEs recursivas en SQL. Recorre árboles, construye org charts, árboles de categorías, detecta ciclos y calcula profundidad con CTEs."
  keywords:
    - data
    - sql
    - cte
    - recursive
    - hierarchy
    - recipe


---

## Visión General

Una Common Table Expression (CTE) recursiva permite que una query se referencie a sí misma, así podés recorrer
datos jerárquicos almacenados en una sola tabla. Tiene dos partes: un anchor member que selecciona las filas
iniciales, y un recursive member que joinea esas filas de vuelta a la tabla fuente. Esa combinación sirve para
org charts, árboles de categorías, file systems, comentarios anidados y cualquier relación parent-child ligada
con una self-referencing foreign key.

## Cuándo Usarlo

Usá una CTE recursiva cuando necesitás recorrer una jerarquía desde un punto de partida conocido. Los casos
comunes incluyen encontrar todos los reports directos e indirectos de un manager, listar todas las
subcategorías bajo una categoría padre, recorrer un directory tree, fetchear un comentario y todas sus
respuestas, explotar un bill of materials en componentes, o seguir dependencias transitivas.

## Cuándo NO Usarlo

Evitá la CTE recursiva para queries planas que no recorran una jerarquía; una CTE regular o un subquery es más
simple. Tampoco es la herramienta correcta para jerarquías muy profundas (algunas bases de datos alcanzan
límites de recursión), graph traversal con ciclos (las CTEs recursivas no manejan ciclos de forma nativa) o
problemas de shortest path (para eso usá una graph database o un algoritmo especializado).

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

## Buenas Prácticas

- Siempre incluí una columna `depth` o `level`. Ayuda a debuggear y te da una forma fácil de limitar la recursión.
- Agregá un safety limit como `WHERE depth < N` para prevenir recursión infinita en datos cíclicos.
- Usá `UNION ALL` en lugar de `UNION`; `UNION` deduplica, lo cual agrega overhead que usualmente no necesitás.
- Construí una columna path para debugging, así podés ver la ruta exacta de recorrido.
- Testeá primero con datasets pequeños, porque las CTEs recursivas pueden ser lentas en tablas grandes.
- Indexá `parent_id` e `id`; el join recursivo golpea esas columnas repetidamente.
- En SQL Server, usá `OPTION (MAXRECURSION N)` para anular el límite default de 100.

Para una guía más profunda, consultá [Transform Data in the Warehouse with dbt](/es/recipes/python-dbt-model-transformations/).

## Errores Comunes

- Olvidar el anchor member. Sin un punto de partida la CTE no retorna nada; el anchor tiene que seleccionar filas
  que no dependan de la CTE.
- Usar `UNION` en lugar de `UNION ALL`. `UNION` deduplica resultados y agrega overhead, así que usá `UNION ALL` a
  menos que realmente necesites deduplicación.
- Saltearse la detección de ciclos. Los datos cíclicos causan recursión infinita, así que agregá una columna path
  y verificá repeticiones, o poné un límite de profundidad.
- No indexar `parent_id`. El join recursivo hace `JOIN c ON c.parent_id = h.id`; sin índice en `parent_id`, cada
  nivel se convierte en un full table scan.
- Esperar orden breadth-first. Las CTEs recursivas retornan depth-first por default. Usá `ORDER BY depth` si querés
  output breadth-first.

## Preguntas Frecuentes

### ¿Qué es una CTE recursiva?

Es una CTE que se referencia a sí misma. Tiene un anchor member (el caso base) y un recursive member (la parte
que joinea de vuelta a la CTE). La base de datos evalúa el anchor primero y sigue aplicando el recursive member
hasta que deja de generar filas nuevas.

### ¿Qué bases de datos soportan CTEs recursivas?

PostgreSQL, MySQL 8.0+, SQLite 3.8.4+, SQL Server (2008+), Oracle (11gR2+), Snowflake, BigQuery y DuckDB las
soportan. La sintaxis es similar en todos; algunos requieren el keyword `RECURSIVE`, y otros no (por ejemplo SQL
Server).

### ¿Cómo prevengo recursión infinita?

Agregá un depth limit como `WHERE depth < 100`, o trackeá los nodos visitados en un array o string de path y
verificá repeticiones. En SQL Server, usá `OPTION (MAXRECURSION N)`.

### ¿Cuál es la diferencia entre CTE recursiva y CONNECT BY?

`CONNECT BY` es la sintaxis propietaria de Oracle, también soportada por Snowflake. Las CTEs recursivas son el
estándar SQL. `CONNECT BY` es más conciso pero menos flexible, así que usá CTEs recursivas cuando te importe la
portabilidad.

### ¿Puedo usar CTEs recursivas para graph traversal?

Para árboles simples sin ciclos, sí. Para grafos con ciclos o problemas de shortest path, usá una graph database
o un algoritmo especializado. Las CTEs recursivas no soportan detección de ciclos de forma nativa, así que tenés
que construirla a mano.
