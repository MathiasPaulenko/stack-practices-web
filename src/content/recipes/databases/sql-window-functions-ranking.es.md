---
contentType: recipes
slug: sql-window-functions-ranking
title: "Clasificar filas y calcular totales acumulados con funciones de ventana"
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

## Explicación

`ROW_NUMBER()` asigna un número único a cada fila de la partición. `RANK()` da el mismo ranking a empates, dejando huecos. `SUM() OVER` calcula un total acumulado porque el marco de ventana por defecto abarca filas desde el inicio de la partición hasta la fila actual. `LAG()` devuelve el valor de la fila anterior, útil para deltas. La cláusula `PARTITION BY` reinicia cálculos por departamento, y `ORDER BY` controla la secuencia dentro de la partición.

## Variantes

| Función | Caso de uso | Comportamiento |
|---------|-------------|----------------|
| ROW_NUMBER | Ranking único | Sin huecos, sin empates |
| RANK | Ranking con empates | Huecos tras empates |
| DENSE_RANK | Ranking con empates | Sin huecos |
| SUM OVER | Totales acumulados | Acumulativo dentro de partición |
| LAG/LEAD | Comparar filas adyacentes | Offset de N filas |

## Lo que funciona

1. **Indexa columnas de partición y orden.** La base de datos aún necesita ordenar; los índices ayudan.
2. **Usa ROW_NUMBER para top-N cuando los empates no importan.** Usa RANK o DENSE_RANK cuando los empates importan.
3. **Los marcos de ventana importan.** Agrega `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` explícitamente para claridad.
4. **Evita anidar funciones de ventana.** Algunas bases de datos no permiten `SUM() OVER (ORDER BY ROW_NUMBER() OVER...)`.
5. **Materializa reportes complejos.** Para dashboards, pre-agrega resultados de ventana en una tabla resumen.

## Errores Comunes

1. **Olvidar PARTITION BY.** Sin ella, la ventana cubre toda la tabla, mezclando departamentos.
2. **Confundir RANK y ROW_NUMBER.** Los empates pueden producir resultados inesperados si eliges la función incorrecta.
3. **Usar funciones de ventana en WHERE.** La mayoría de bases de datos requieren una subconsulta porque las ventanas se ejecutan después del filtrado.
4. **Dirección de ORDER BY incorrecta.** El orden descendente es común para rankings; ascendente para totales acumulados.
5. **Ignorar NULLs en el ordenamiento.** Los NULLs se ordenan primero o último según la base de datos; sé explícito con `NULLS FIRST`/`NULLS LAST`.

## Preguntas Frecuentes

**P: ¿Cuál es la diferencia entre RANK y DENSE_RANK?**
R: RANK deja huecos tras empates (1, 1, 3). DENSE_RANK no (1, 1, 2).

**P: ¿Puedo usar funciones de ventana con GROUP BY?**
R: Las ventanas se ejecutan después de GROUP BY, así que puedes combinarlas, pero debes agregar antes de aplicar la ventana.

**P: ¿Cómo obtengo las top 3 filas por grupo?**
R: Usa `ROW_NUMBER() OVER (PARTITION BY group ORDER BY value DESC)` y filtra `WHERE row_num <= 3` en una consulta externa.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
