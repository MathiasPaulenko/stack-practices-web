---
contentType: guides
slug: sql-window-functions-guide
title: "Funciones de Ventana SQL — Guia Completa"
description: "Guia practica de funciones de ventana SQL: ROW_NUMBER, RANK, DENSE_RANK, LEAD, LAG, SUM, AVG sobre particiones y casos de uso de analitica real."
metaDescription: "Aprende funciones de ventana SQL: ROW_NUMBER, RANK, LEAD, LAG, SUM sobre particiones. Guia completa con ejemplos de analitica real."
difficulty: intermediate
topics:
  - databases
  - data
tags:
  - sql
  - funciones-ventana
  - row-number
  - rank
  - lead
  - lag
  - partition-by
  - analitica
  - guia
relatedResources:
  - /guides/sql-cte-guide
  - /guides/sql-performance-tuning-guide
  - /guides/sql-joins-guide
  - /recipes/databases/window-functions-ranking
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende funciones de ventana SQL: ROW_NUMBER, RANK, LEAD, LAG, SUM sobre particiones. Guia completa con ejemplos de analitica real."
  keywords:
    - sql
    - funciones-ventana
    - row-number
    - rank
    - lead
    - lag
    - partition-by
    - analitica
    - guia
---

## Overview

Las funciones de ventana en SQL calculan un valor sobre un conjunto de filas relacionadas con la fila actual — sin colapsar el resultado en grupos como `GROUP BY`. Desbloquean consultas analiticas potentes: totales acumulados, rankings, promedios moviles y comparaciones entre filas. Disponibles en PostgreSQL, SQL Server, MySQL 8+, Oracle y SQLite 3.25+, son esenciales para quienes escriben SQL analitico.

## When to Use

- Necesitas rankings dentro de grupos (top-N por categoria)
- Se requieren totales acumulados o promedios moviles
- Quieres comparar cada fila con la anterior o siguiente
- Los agregados deben mostrarse junto a detalles de filas individuales
- Self-joins para comparaciones entre filas son demasiado complejos o lentos

## Sintaxis

```sql
nombre_funcion(expresion) OVER (
    [PARTITION BY expresion_particion]
    [ORDER BY expresion_orden]
    [clausula_marco]
)
```

## Funciones de Ranking

| Funcion | Comportamiento | Manejo de Duplicados |
|---------|--------------|---------------------|
| `ROW_NUMBER()` | Entero secuencial | Sin empates; orden arbitrario para duplicados |
| `RANK()` | Rango con huecos | Mismo valor = mismo rango; siguiente rango salta |
| `DENSE_RANK()` | Rango sin huecos | Mismo valor = mismo rango; siguiente rango continua |

```sql
-- Top 3 productos por ingresos en cada categoria
WITH ranked AS (
    SELECT
        product_id,
        category,
        revenue,
        RANK() OVER (PARTITION BY category ORDER BY revenue DESC) as rank
    FROM product_revenue
)
SELECT * FROM ranked WHERE rank <= 3;
```

## Funciones de Desplazamiento

```sql
-- Comparar mes actual con mes anterior
SELECT
    month,
    revenue,
    LAG(revenue) OVER (ORDER BY month) as prev_month_revenue,
    revenue - LAG(revenue) OVER (ORDER BY month) as month_over_month_change,
    LEAD(revenue) OVER (ORDER BY month) as next_month_revenue
FROM monthly_revenue;
```

## Funciones de Ventana Agregadas

```sql
-- Total acumulado y promedio movil
SELECT
    order_id,
    order_date,
    amount,
    SUM(amount) OVER (ORDER BY order_date) as running_total,
    AVG(amount) OVER (
        ORDER BY order_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as seven_day_avg
FROM orders;
```

## Clausulas de Marco

| Marco | Significado |
|-------|-------------|
| `ROWS UNBOUNDED PRECEDING` | Todas las filas desde el inicio hasta la actual |
| `ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING` | Fila actual mas una a cada lado |
| `RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW` | Ventana basada en tiempo |

## Ejemplos del Mundo Real

### Deduplicacion

```sql
-- Mantener el registro mas reciente por cliente
WITH ranked AS (
    SELECT
        customer_id,
        email,
        updated_at,
        ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY updated_at DESC) as rn
    FROM customer_profiles
)
SELECT customer_id, email, updated_at FROM ranked WHERE rn = 1;
```

### Calculo de Percentil

```sql
SELECT
    employee_id,
    department,
    salary,
    NTILE(4) OVER (PARTITION BY department ORDER BY salary) as quartile,
    PERCENT_RANK() OVER (PARTITION BY department ORDER BY salary) as percentile
FROM employees;
```

## Common Mistakes

- **Olvidar `PARTITION BY`** — la ventana se aplica a todo el resultado en lugar de grupos
- **Usar `GROUP BY` con funciones de ventana** — operan en niveles conceptuales diferentes; combinar con CTEs
- **Confundir `RANK` y `ROW_NUMBER`** — usar `ROW_NUMBER` para deduplicacion, `RANK` para analisis por niveles
- **Marcos de ventana en datos desordenados** — siempre especificar `ORDER BY` dentro de `OVER()`
- **Rendimiento en grandes datasets** — asegurar que las columnas de `PARTITION BY` y `ORDER BY` esten indexadas

## FAQ

**Las funciones de ventana estan disponibles en MySQL?**
Si, a partir de MySQL 8.0. MariaDB 10.2+ tambien las soporta.

**Puedo usar multiples funciones de ventana en una consulta?**
Si. Tambien puedes definir una ventana nombrada para reutilizar: `WINDOW w AS (PARTITION BY dept ORDER BY salary)`.

**Funcionan con `DISTINCT`?**
`DISTINCT` se aplica despues de funciones de ventana. Usa una subconsulta o CTE si necesitas resultados distintos con calculos de ventana.
