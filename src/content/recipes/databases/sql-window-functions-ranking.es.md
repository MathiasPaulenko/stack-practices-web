---



contentType: recipes
slug: sql-window-functions-ranking
title: "Clasificar filas y calcular totales acumulados con"
description: "Usa funciones de ventana SQL para clasificar filas, calcular totales acumulados y comparar valores dentro de particiones sin self-joins."
metaDescription: "Clasifica filas y calcula totales acumulados en SQL con funciones de ventana. Usa ROW_NUMBER, RANK, SUM OVER y LAG en consultas analíticas."
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
  - /recipes/database-migrations
  - /recipes/database-replication
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Clasifica filas y calcula totales acumulados en SQL con funciones de ventana. Usa ROW_NUMBER, RANK, SUM OVER y LAG en consultas analíticas."
  keywords:
    - sql
    - funciones de ventana
    - postgresql
    - ranking
    - análisis



---


## Visión General

Las funciones de ventana son una de las capacidades más potentes de SQL. Permiten calcular valores a través de un conjunto de filas relacionadas con la fila actual sin colapsar el resultado como `GROUP BY`. El ranking, totales acumulados y promedios móviles se vuelven directos, y a menudo reemplazan self-joins lentos o loops en la capa de aplicación.

## Cuándo Usar


- For alternatives, see [SQL Window Functions — Complete Guide](/es/guides/sql-window-functions-guide/).

Usa este recurso cuando:
- Necesites clasificar filas dentro de grupos (top-N por categoría).
- Quieras totales acumulados o promedios móviles sin subconsultas.
- Estés construyendo tablas de clasificación, reportes de ventas o paginación con empates.
- Necesites comparar cada fila con la anterior o siguiente.

## Solución

### Ranking y totales acumulados

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

### Top-N filas por categoría

```sql
-- Top 3 empleados mejor pagados por departamento
WITH ranked AS (
  SELECT
    department,
    employee,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn
  FROM employees
)
SELECT department, employee, salary
FROM ranked
WHERE rn <= 3
ORDER BY department, salary DESC;
```

### Promedio móvil con marco de ventana explícito

```sql
-- Promedio móvil de 7 días de ingresos diarios
SELECT
  date,
  revenue,
  AVG(revenue) OVER (
    ORDER BY date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) AS moving_avg_7d,
  SUM(revenue) OVER (
    ORDER BY date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS cumulative_revenue
FROM daily_revenue
ORDER BY date;
```

### Crecimiento interanual con LAG

```sql
-- Comparar ingresos de cada mes con el mismo mes del año anterior
SELECT
  month,
  revenue,
  LAG(revenue, 12) OVER (ORDER BY month) AS revenue_last_year,
  revenue - LAG(revenue, 12) OVER (ORDER BY month) AS yoy_delta,
  ROUND(
    (revenue - LAG(revenue, 12) OVER (ORDER BY month)) /
     NULLIF(LAG(revenue, 12) OVER (ORDER BY month), 0) * 100, 2
  ) AS yoy_pct_change
FROM monthly_revenue
ORDER BY month;
```

### Ranking de percentiles con NTILE y PERCENT_RANK

```sql
-- Dividir clientes en 4 cuartiles por gasto total
SELECT
  customer_id,
  total_spend,
  NTILE(4) OVER (ORDER BY total_spend DESC) AS quartile,
  PERCENT_RANK() OVER (ORDER BY total_spend DESC) AS pct_rank,
  CUME_DIST() OVER (ORDER BY total_spend DESC) AS cumulative_dist
FROM customer_totals;
```

### Primer y último valor por partición

```sql
-- Salario más alto y más bajo por departamento en cada fila
SELECT
  department,
  employee,
  salary,
  FIRST_VALUE(salary) OVER (
    PARTITION BY department ORDER BY salary DESC
  ) AS highest_in_dept,
  LAST_VALUE(salary) OVER (
    PARTITION BY department ORDER BY salary DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS lowest_in_dept
FROM employees;
```

### Desduplicar filas con ROW_NUMBER

```sql
-- Mantener solo el registro más reciente por usuario
WITH deduped AS (
  SELECT
    user_id,
    email,
    updated_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) AS rn
  FROM user_records
)
SELECT user_id, email, updated_at
FROM deduped
WHERE rn = 1;
```

## Explicación

`ROW_NUMBER()` asigna un número único a cada fila de la partición. `RANK()` da el mismo ranking a empates, dejando huecos. `SUM() OVER` calcula un total acumulado porque el marco de ventana por defecto abarca filas desde el inicio de la partición hasta la fila actual. `LAG()` devuelve el valor de la fila anterior, útil para deltas. La cláusula `PARTITION BY` reinicia cálculos por departamento, y `ORDER BY` controla la secuencia dentro de la partición.

### Sintaxis de marco de ventana

La sintaxis completa de marco de ventana da control preciso sobre qué filas se incluyen:

```sql
-- Sintaxis: ROWS BETWEEN <inicio> AND <fin>
-- Inicio: UNBOUNDED PRECEDING | N PRECEDING | CURRENT ROW
-- Fin: CURRENT ROW | N FOLLOWING | UNBOUNDED FOLLOWING

-- Total acumulado: inicio hasta fila actual
SUM(amount) OVER (ORDER BY date
  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)

-- Promedio de 3 filas anteriores
AVG(amount) OVER (ORDER BY date
  ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)

-- Promedio centrado de 5 filas
AVG(amount) OVER (ORDER BY date
  ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING)

-- Total de toda la partición
SUM(amount) OVER (PARTITION BY category
  ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
```

## Variantes

| Función | Caso de uso | Comportamiento |
|---------|-------------|----------------|
| ROW_NUMBER | Ranking único | Sin huecos, sin empates |
| RANK | Ranking con empates | Huecos tras empates |
| DENSE_RANK | Ranking con empates | Sin huecos |
| SUM OVER | Totales acumulados | Acumulativo dentro de partición |
| AVG OVER | Promedios móviles | Marco configurable |
| LAG/LEAD | Comparar filas adyacentes | Offset de N filas |
| FIRST_VALUE/LAST_VALUE | Extremos por partición | Primero o último del marco |
| NTILE | Bucketing | Divide filas en N buckets |
| PERCENT_RANK | Ranking de percentil | Rank relativo 0.0 a 1.0 |
| CUME_DIST | Distribución acumulada | Fracción de filas en o por debajo |

## Lo que funciona

1. **Indexa columnas de partición y orden.** La base de datos aún necesita ordenar; los índices ayudan.
2. **Usa ROW_NUMBER para top-N cuando los empates no importan.** Usa RANK o DENSE_RANK cuando los empates importan.
3. **Los marcos de ventana importan.** Agrega `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` explícitamente para claridad.
4. **Evita anidar funciones de ventana.** Algunas bases de datos no permiten `SUM() OVER (ORDER BY ROW_NUMBER() OVER...)`.
5. **Materializa reportes complejos.** Para dashboards, pre-agrega resultados de ventana en una tabla resumen.
6. **Usa CTEs para filtrar resultados de ventana.** Envuelve la consulta y filtra en una consulta externa ya que las ventanas no pueden aparecer en WHERE.
7. **Especifica NULLS FIRST o NULLS LAST.** Diferentes bases de datos ordenan NULLs de forma distinta; sé explícito.

## Errores Comunes

1. **Olvidar PARTITION BY.** Sin ella, la ventana cubre toda la tabla, mezclando departamentos.
2. **Confundir RANK y ROW_NUMBER.** Los empates pueden producir resultados inesperados si eliges la función incorrecta.
3. **Usar funciones de ventana en WHERE.** La mayoría de bases de datos requieren una subconsulta porque las ventanas se ejecutan después del filtrado.
4. **Dirección de ORDER BY incorrecta.** El orden descendente es común para rankings; ascendente para totales acumulados.
5. **Ignorar NULLs en el ordenamiento.** Los NULLs se ordenan primero o último según la base de datos; sé explícito con `NULLS FIRST`/`NULLS LAST`.
6. **LAST_VALUE sin marco completo.** `LAST_VALUE` por defecto usa la fila actual, no la última de la partición. Siempre especifica `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`.
7. **Usar RANGE en vez de ROWS sin intención.** `RANGE` incluye pares (filas con el mismo valor de orden), lo que puede producir resultados inesperados en totales acumulados.

## Preguntas Frecuentes

**P: ¿Cuál es la diferencia entre RANK y DENSE_RANK?**
R: RANK deja huecos tras empates (1, 1, 3). DENSE_RANK no (1, 1, 2).

**P: ¿Puedo usar funciones de ventana con GROUP BY?**
R: Las ventanas se ejecutan después de GROUP BY, así que puedes combinarlas, pero debes agregar antes de aplicar la ventana.

**P: ¿Cómo obtengo las top 3 filas por grupo?**
R: Usa `ROW_NUMBER() OVER (PARTITION BY group ORDER BY value DESC)` y filtra `WHERE row_num <= 3` en una consulta externa.

**P: ¿Cuál es la diferencia entre ROWS y RANGE en marcos de ventana?**
R: `ROWS` cuenta filas físicas. `RANGE` incluye todas las filas con el mismo valor de orden como pares. Para totales acumulados con claves únicas, son equivalentes. Con claves duplicadas, `RANGE` incluye pares, lo que puede no ser lo que quieres.

**P: ¿Las funciones de ventana son compatibles con MySQL?**
R: MySQL 8.0+ soporta funciones de ventana. MySQL 5.7 no. PostgreSQL, SQL Server, Oracle y SQLite 3.25+ las soportan.

**P: ¿Cómo afectan las funciones de ventana al rendimiento?**
R: Las funciones de ventana requieren ordenamiento, que es O(n log n). Con índices adecuados en columnas de partición y orden, se puede evitar el sort. Para datasets grandes, considera materializar resultados en una tabla resumen.

**P: ¿Puedo usar múltiples funciones de ventana en una consulta?**
R: Sí. Cada función puede tener su propia cláusula `OVER()` con diferentes particiones y ordenamientos. La base de datos optimiza compartiendo sorts cuando múltiples funciones usan la misma partición y orden.

**P: ¿Cómo calculo el porcentaje del total por fila?**
R: Divide el valor de cada fila por el total de la partición: `SUM(value) OVER () AS grand_total, value / SUM(value) OVER () * 100 AS pct_of_total`.

## Comparación de Funciones de Ranking

| Escenario | ROW_NUMBER | RANK | DENSE_RANK |
|-----------|-----------|------|------------|
| Salarios: 100, 90, 90, 80 | 1, 2, 3, 4 | 1, 2, 2, 4 | 1, 2, 2, 3 |
| Empates mismo número | No | Sí | Sí |
| Huecos tras empates | Sin huecos | Huecos | Sin huecos |
| Mejor para | Desduplicación, top-N | Ranking competitivo | Ranking denso |

```sql
-- Ver las tres funciones lado a lado
SELECT
  employee,
  salary,
  ROW_NUMBER() OVER (ORDER BY salary DESC) AS rn,
  RANK() OVER (ORDER BY salary DESC) AS rnk,
  DENSE_RANK() OVER (ORDER BY salary DESC) AS dense_rnk
FROM employees
ORDER BY salary DESC;
```

## Tips de Rendimiento

1. **Agrega índices en columnas PARTITION BY + ORDER BY.** Un índice compuesto en `(department, salary DESC)` permite a PostgreSQL evitar el sort.

2. **Usa EXPLAIN para verificar avoidance de sort.** Busca `WindowAgg` sin un nodo `Sort` precedente cuando hay índices disponibles.

```sql
-- Verificar si se evita el sort con un índice
EXPLAIN ANALYZE
SELECT
  department,
  employee,
  salary,
  ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn
FROM employees;
```

3. **Limita particiones para tablas grandes.** Si solo necesitas top-N para unos pocos departamentos, filtra primero en una subconsulta para reducir el volumen de sort.

4. **Considera vistas materializadas para dashboards.** Los resultados de funciones de ventana son costosos de recomputar en cada page load. Almacénalos en una vista materializada y refresca periódicamente.

```sql
CREATE MATERIALIZED VIEW dept_ranking AS
SELECT
  department,
  employee,
  salary,
  ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn
FROM employees;

-- Refrescar semanalmente
REFRESH MATERIALIZED VIEW CONCURRENTLY dept_ranking;
```
