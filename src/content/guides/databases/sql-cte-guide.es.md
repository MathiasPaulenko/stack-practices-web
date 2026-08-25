---
contentType: guides
slug: sql-cte-guide
title: "CTEs en SQL: Expresiones de Tablas Comunes Explicadas"
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
lastUpdated: "2026-08-22"
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

Una Common Table Expression (CTE) le da nombre a un conjunto de resultados temporal que solo existe
durante la consulta en la que se define. Introducidas en SQL:1999, las CTEs permiten dividir una
consulta compleja en bloques con nombre, referenciar el mismo resultado intermedio más de una vez y
expresar recursión para árboles y grafos. PostgreSQL, SQL Server, MySQL 8+, Oracle y SQLite 3.8.3+
las soportan.

## Cuándo Usarlas

- Una consulta tiene varias subconsultas anidadas y perdés la cuenta de los paréntesis.
- Necesitás el mismo resultado intermedio en más de un lugar.
- Estás recorriendo una jerarquía como un organigrama, una lista de materiales o comentarios
    anidados.
- Querés que la consulta se lea como una secuencia de pasos con nombre.
- Te gustaría construir y probar una parte de la consulta a la vez.

## Cuándo NO Usarlas

- Un `SELECT` simple o una subconsulta inline ya es rápido y claro.
- Tu motor de base de datos no soporta CTEs y no podés actualizarlo.
- Asumís que una CTE va a correr más rápido automáticamente. Por lo general no es así.

## Sintaxis Básica

```sql
WITH cte_name AS (
    SELECT ...
)
SELECT * FROM cte_name;
```

La cláusula `WITH` declara una o más CTEs. El `SELECT` final las trata como tablas regulares dentro
de su alcance.

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

La primera CTE agrupa órdenes por mes. La segunda calcula el promedio. La consulta final une ambas
sin repetir agregaciones.

## Múltiples CTEs

Podés declarar varias CTEs y encadenarlas.

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

`user_orders` depende de `active_users`. Escribir la consulta así hace explícita la dependencia.

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

Para subir desde un empleado hasta el CEO, invertí el join:

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

## CTEs MATERIALIZED en PostgreSQL

Por defecto, PostgreSQL puede inlinear una CTE. Agregá `MATERIALIZED` para forzar al motor a
calcularla una vez y guardar el resultado.

```sql
WITH regional_sales AS MATERIALIZED (
    SELECT region, SUM(total) AS total_sales
    FROM orders
    GROUP BY region
    HAVING SUM(total) > 1000000
)
SELECT * FROM regional_sales;
```

Usalo cuando la CTE sea costosa y se referencie varias veces, o cuando `EXPLAIN` muestre que el
planificador elige un mal plan. SQL Server y MySQL manejan la materialización de otra forma y
normalmente no exponen la palabra clave.

## CTE vs Subconsulta

| Aspecto | CTE | Subconsulta |
| --- | --- | --- |
| Legibilidad | Nombrada, reutilizable | Inline, anónima |
| Reutilización | Se puede referenciar varias veces | Hay que duplicarla si se usa otra vez |
| Recursión | Soportada | No soportada |
| Materialización | Opcional en PostgreSQL | Evaluada cada vez por defecto |

## Buenas Prácticas

- Dale a cada CTE un nombre que describa el resultado, no `paso1` o `paso2`.
- Mantené un solo paso lógico por CTE; no metas dos ideas distintas en una.
- Siempre agregá un guarda `WHERE depth < N` en una CTE recursiva.
- Usá `MATERIALIZED` en PostgreSQL solo después de revisar el plan de consulta.
- Testeá una CTE en aislamiento seleccionando directamente de ella antes de agregar la consulta
    final.

## Errores Comunes

- **Recursión infinita**: olvidar el guarda de terminación o tener un ciclo en los datos de la
    jerarquía.
- **Tratar CTEs como tablas temporales**: solo viven durante la consulta. Para persistencia usá
    `CREATE TEMP TABLE` o una tabla real.
- **Suposiciones de rendimiento**: algunos motores inlinean CTEs, otros materializan. Siempre medí.
- **Exceso de CTEs anidadas**: diez CTEs encadenadas pueden ser más difíciles de leer que las
    subconsultas originales.
- **Recursión mutua**: dos CTEs que se referencian entre sí no está soportado en la mayoría de
    motores.

## Preguntas Frecuentes

### ¿Las CTEs mejoran el rendimiento?

No por sí solas. Su principal beneficio es la legibilidad y mantenibilidad. En PostgreSQL, las CTEs
`MATERIALIZED` pueden ayudar cuando se usa el mismo resultado varias veces. En SQL Server, las CTEs
suelen inlinearse, así que son principalmente una herramienta de legibilidad.

### ¿Puedo usar CTEs en UPDATE o DELETE?

Sí. En PostgreSQL y SQL Server podés escribir:

```sql
WITH expired AS (
    SELECT id FROM orders WHERE status = 'expired'
)
DELETE FROM order_items
WHERE order_id IN (SELECT id FROM expired);
```

### ¿MySQL soporta CTEs?

Sí, desde MySQL 8.0. Las CTEs recursivas y no recursivas funcionan con `WITH` y `WITH RECURSIVE`.

### ¿Cómo optimizo una CTE recursiva sobre una jerarquía grande?

- Agregá un límite de profundidad.
- Indexá la columna de join como `manager_id` o `product_id`.
- Considerá `MATERIALIZED` en PostgreSQL si el conjunto recursivo se reutiliza.
- Para jerarquías muy profundas, una columna con path materializado suele ser más rápida que la
    recursión.

### ¿Cuándo elijo una CTE en vez de una subconsulta?

Usá una CTE cuando la misma subconsulta se referencia más de una vez, cuando la consulta tiene
varios niveles anidados, o cuando necesitás recursión. Para una subconsulta simple que aparece una
sola vez, una subconsulta inline está bien.
