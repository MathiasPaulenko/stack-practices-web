---
contentType: guides
slug: sql-cte-guide
title: "CTEs en SQL — Expresiones de Tablas Comunes Explicadas"
description: "Guía práctica de CTEs en SQL: expresiones no recursivas y recursivas, legibilidad, rendimiento y cuándo usarlas sobre subconsultas."
metaDescription: "Aprendé CTEs SQL: expresiones recursivas y no recursivas, legibilidad, tips de rendimiento. Guía completa con ejemplos para PostgreSQL, SQL Server y MySQL."
difficulty: intermediate
topics:
  - databases
  - data
tags:
  - sql
  - cte
  - expresion-tabla-comun
  - cte-recursiva
  - bases-de-datos
  - rendimiento
  - legibilidad
relatedResources:
  - /guides/sql-window-functions-guide
  - /guides/sql-performance-tuning-guide
  - /guides/sql-joins-guide
  - /recipes/sql-find-duplicate-rows
  - /recipes/sql-recursive-cte-query
  - /guides/complete-guide-postgresql-tuning
lastUpdated: "2026-08-19"
publishedAt: "2026-06-25"
author: Mathias Paulenko
seo:
  metaDescription: "Aprendé CTEs SQL: expresiones recursivas y no recursivas, legibilidad, tips de rendimiento. Guía completa con ejemplos para PostgreSQL, SQL Server y MySQL."
  keywords:
    - sql
    - cte
    - expresion-tabla-comun
    - cte-recursiva
    - legibilidad
    - organizacion-consultas
    - rendimiento
---

## Resumen

Una Common Table Expression (CTE) es un conjunto de resultados temporal con nombre que
existe durante la ejecución de una consulta. Introducida en SQL:1999, las CTEs ayudan a
dividir consultas complejas en bloques legibles, permiten referenciar la misma
subconsulta varias veces y habilitan la recursión para datos jerárquicos. Son soportadas
por PostgreSQL, SQL Server, MySQL 8+, Oracle y SQLite 3.8.3+.

## Cuándo Usar

- Una consulta tiene varios niveles de subconsultas anidadas.
- Necesitás referenciar la misma subconsulta varias veces.
- Estás recorriendo datos jerárquicos: organigramas, listas de materiales, comentarios
  anidados.
- La lógica de la consulta necesita ser autodocumentada y modular.
- Querés construir consultas complejas de forma incremental y probar cada parte.

## Cuándo NO Usar

- Una consulta simple es más rápida y clara como un `SELECT` único o subconsulta inline.
- Tu motor de base de datos no soporta CTEs y no podés actualizarlo.
- Esperás que una CTE mejore el rendimiento siempre; por defecto no lo hace.

## Sintaxis Básica

```sql
WITH cte_name AS (
    SELECT ...
)
SELECT * FROM cte_name;
```

La cláusula `WITH` define una o más CTEs. El `SELECT` final puede usarlas como tablas
regulares.

## Ejemplo de CTE No Recursiva

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

## Múltiples CTEs

Podés definir varias CTEs en una consulta y encadenarlas.

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

## CTE Recursiva para Jerarquías

Una CTE recursiva tiene un miembro ancla y un miembro recursivo unidos con `UNION ALL`.

```sql
-- Organigrama: encontrar todos los reportes bajo el CEO
WITH RECURSIVE org_tree AS (
    -- Ancla
    SELECT id, name, manager_id, 1 AS depth
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Paso recursivo
    SELECT e.id, e.name, e.manager_id, ot.depth + 1
    FROM employees e
    INNER JOIN org_tree ot ON e.manager_id = ot.id
    WHERE ot.depth < 10
)
SELECT id, name, depth
FROM org_tree
ORDER BY depth, name;
```

Para encontrar la cadena de mando de un empleado al CEO, invertí el join:

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

## CTEs Materializadas en PostgreSQL

Por defecto, PostgreSQL inlinea las CTEs. Agregá `MATERIALIZED` para forzar que el motor
las compute una sola vez y almacene el resultado.

```sql
WITH regional_sales AS MATERIALIZED (
    SELECT region, SUM(total) AS total_sales
    FROM orders
    GROUP BY region
    HAVING SUM(total) > 1000000
)
SELECT * FROM regional_sales;
```

Usalo cuando la CTE es costosa y se referencia varias veces, o cuando el optimizador elige
un mal plan. En SQL Server y MySQL el comportamiento depende del motor y no se controla
con esa palabra clave.

## CTE vs Subconsulta

|Aspecto|CTE|Subconsulta|
|-------|---|-----------|
|Legibilidad|Nombrada, reutilizable|Inline, anónima|
|Reutilización|Se puede referenciar varias veces|Hay que duplicarla si se usa de nuevo|
|Recursión|Soportada|No soportada|
|Materialización|Opcional en PostgreSQL|Se evalúa cada vez por defecto|

## Buenas Prácticas

- Nombrá las CTEs por lo que representan, no por números de paso.
- Mantené cada CTE enfocada en un solo paso lógico.
- Agregá un guarda `WHERE depth < N` en toda CTE recursiva.
- Usá `MATERIALIZED` en PostgreSQL solo cuando el plan muestra que la inlineación es
  ineficiente.
- Probá cada CTE por separado reemplazando el `SELECT` final por una consulta rápida de
  esa CTE.

## Errores Comunes

- **Recursión infinita** — olvidar el guarda de terminación o tener un ciclo en los datos.
- **Tratar CTEs como tablas temporales** — viven solo durante la consulta; para
  persistencia usá `CREATE TEMP TABLE` o una tabla real.
- **Suposiciones de rendimiento** — algunos motores inlinean, otros materializan; siempre
  perfilá.
- **CTE anidadas en exceso** — diez CTEs encadenadas pueden ser más difíciles de leer que
  las subconsultas originales.
- **Recursión mutua** — dos CTEs referenciándose entre sí no está soportado en la mayoría
  de motores.

## Preguntas Frecuentes

### ¿Las CTEs mejoran el rendimiento?

No inherentemente. Mejoran la legibilidad y mantenibilidad. En PostgreSQL, las CTEs
`MATERIALIZED` pueden ayudar cuando se usa el mismo resultado varias veces. En SQL Server,
las CTEs suelen inlinearse.

### ¿Se pueden usar CTEs en UPDATE o DELETE?

Sí. En PostgreSQL y SQL Server:

```sql
WITH expired AS (
    SELECT id FROM orders WHERE status = 'expired'
)
DELETE FROM order_items
WHERE order_id IN (SELECT id FROM expired);
```

### ¿MySQL soporta CTEs?

Sí, desde MySQL 8.0. Las CTEs no recursivas y recursivas funcionan con `WITH` y
`WITH RECURSIVE`.

### ¿Cómo optimizo una CTE recursiva sobre una jerarquía grande?

- Agregá un límite de profundidad.
- Indexá la columna de join (`manager_id`, `product_id`, etc.).
- Considerá `MATERIALIZED` en PostgreSQL si el conjunto recursivo se reutiliza.
- Para jerarquías muy profundas, almacená un path materializado en una columna y consultá
  eso en vez de recorrer.

### ¿Cuándo elijo una CTE sobre una subconsulta?

Usá una CTE cuando la misma subconsulta se referencia más de una vez, cuando la consulta
tiene varios niveles anidados o cuando necesitás recursión. Para una subconsulta simple
que aparece una sola vez, una subconsulta inline está bien.
