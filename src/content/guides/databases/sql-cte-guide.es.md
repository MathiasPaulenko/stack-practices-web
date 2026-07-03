---
contentType: guides
slug: sql-cte-guide
title: "CTEs en SQL — Expresiones de Tablas Comunes Explicadas"
description: "Guia practica de CTEs en SQL: expresiones no recursivas y recursivas, legibilidad, rendimiento y cuando usarlas sobre subconsultas."
metaDescription: "Aprende CTEs SQL: expresiones recursivas y no recursivas, legibilidad, tips de rendimiento. Guia completa con ejemplos para PostgreSQL, SQL Server y MySQL."
difficulty: intermediate
topics:
  - databases
  - data
tags:
  - sql
  - cte
  - expresion-tabla-comun
  - cte-recursiva
  - legibilidad
  - organizacion-consultas
  - guia
relatedResources:
  - /guides/sql-window-functions-guide
  - /guides/sql-performance-tuning-guide
  - /guides/sql-joins-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende CTEs SQL: expresiones recursivas y no recursivas, legibilidad, tips de rendimiento. Guia completa con ejemplos para PostgreSQL, SQL Server y MySQL."
  keywords:
    - sql
    - cte
    - expresion-tabla-comun
    - cte-recursiva
    - legibilidad
    - organizacion-consultas
    - guia
---

## Overview

Las Expresiones de Tablas Comunes (CTEs), introducidas en SQL:1999, proporcionan un conjunto de resultados temporal con nombre que existe durante la ejecucion de una sola consulta. Mejoran la legibilidad al dividir consultas complejas en bloques nombrados, habilitan recursion para datos jerarquicos y pueden materializarse para rendimiento. Soportadas por PostgreSQL, SQL Server, MySQL 8+, Oracle y SQLite 3.8.3+.

## When to Use

- Una consulta tiene multiples niveles de subconsultas anidadas
- Necesitas referenciar la misma subconsulta multiples veces
- Debes recorrer datos jerarquicos (organigramas, listas de materiales, comentarios anidados)
- La logica de consulta debe ser auto-documentada y modular
- Quieres construir consultas complejas incrementalmente y probar cada parte

## Sintaxis Basica de CTE

```sql
WITH nombre_cte AS (
    SELECT ...
)
SELECT * FROM nombre_cte;
```

## Ejemplo de CTE No Recursiva

```sql
WITH monthly_sales AS (
    SELECT
        DATE_TRUNC('month', order_date) as month,
        SUM(total) as revenue,
        COUNT(*) as order_count
    FROM orders
    WHERE order_date >= '2024-01-01'
    GROUP BY DATE_TRUNC('month', order_date)
),
avg_sales AS (
    SELECT AVG(revenue) as avg_revenue FROM monthly_sales
)
SELECT
    ms.month,
    ms.revenue,
    ms.order_count,
    a.avg_revenue,
    ms.revenue - a.avg_revenue as variance
FROM monthly_sales ms
CROSS JOIN avg_sales a
ORDER BY ms.month;
```

## CTE Recursiva para Jerarquias

```sql
-- Organigrama: encontrar todos los reportes bajo un manager
WITH RECURSIVE org_tree AS (
    -- Ancla: empezar con el manager
    SELECT id, name, manager_id, 1 as depth
    FROM employees
    WHERE id = 1  -- CEO

    UNION ALL

    -- Recursivo: encontrar reportes directos
    SELECT e.id, e.name, e.manager_id, ot.depth + 1
    FROM employees e
    INNER JOIN org_tree ot ON e.manager_id = ot.id
)
SELECT id, name, depth FROM org_tree ORDER BY depth, name;
```

## CTE vs Subconsulta

| Aspecto | CTE | Subconsulta |
|---------|-----|-------------|
| **Legibilidad** | Nombrada, reutilizable | Inline, anonima |
| **Reutilizacion** | Puede referenciarse multiples veces | Debe duplicarse si se usa de nuevo |
| **Recursion** | Soportada | No soportada |
| **Materializacion** | Puede materializarse (PostgreSQL) | Se evalua cada vez |

## Multiples CTEs

```sql
WITH
    active_users AS (
        SELECT user_id, last_login
        FROM users
        WHERE last_login >= CURRENT_DATE - INTERVAL '30 days'
    ),
    user_orders AS (
        SELECT user_id, COUNT(*) as order_count, SUM(total) as lifetime_value
        FROM orders
        WHERE user_id IN (SELECT user_id FROM active_users)
        GROUP BY user_id
    )
SELECT
    u.user_id,
    u.last_login,
    COALESCE(o.order_count, 0) as order_count,
    COALESCE(o.lifetime_value, 0) as lifetime_value
FROM active_users u
LEFT JOIN user_orders o ON u.user_id = o.user_id;
```

## CTEs Materializadas (PostgreSQL)

```sql
WITH regional_sales AS MATERIALIZED (
    SELECT region, SUM(total) as total_sales
    FROM orders
    GROUP BY region
    HAVING SUM(total) > 1000000
)
SELECT * FROM regional_sales;
```

## Common Mistakes

- **Recursion infinita** — CTEs recursivas sin condicion de terminacion apropiada generaran error o bucle infinito
- **Tratar CTEs como tablas temporales** — son de alcance de consulta; para tablas temporales usar `CREATE TEMP TABLE`
- **Suposiciones de rendimiento** — en algunos motores, las CTEs se inlinean; en otros, se materializan. Perfilizar la consulta.
- **CTE excesivamente anidadas** — CTEs profundamente anidadas pueden ser mas dificiles de leer que la sopa de subconsultas original
- **Recursion mutua** — no soportada en la mayoria de bases de datos; usar enfoques iterativos en su lugar

## FAQ

**Los CTEs mejoran el rendimiento?**
No inherentemente. Mejoran la legibilidad y mantenibilidad. En PostgreSQL, los CTEs `MATERIALIZED` pueden mejorar rendimiento al evaluar una vez. En SQL Server, los CTEs usualmente se inlinean.

**Puedo usar CTEs en UPDATE o DELETE?**
Si, en PostgreSQL y SQL Server: `WITH cte AS (...) UPDATE table SET ... FROM cte WHERE ...`.

**Los CTEs estan disponibles en MySQL?**
Si, CTEs no recursivas en MySQL 8.0+, recursivas en MySQL 8.0+ con `WITH RECURSIVE`.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.
