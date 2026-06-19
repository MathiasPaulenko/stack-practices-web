---
contentType: recipes
slug: query-optimization
title: "Optimizar Queries Lentas de Base de Datos"
description: "Cómo identificar, analizar y corregir queries SQL lentos usando EXPLAIN, refactoring de queries y técnicas de optimización específicas por base de datos."
metaDescription: "Aprende optimización de queries de base de datos. Usa EXPLAIN, refactoriza queries y aplica técnicas para corregir SQL lento y mejorar rendimiento."
difficulty: intermediate
topics:
  - performance
tags:
  - performance
  - database
relatedResources:
  - /recipes/database-indexing
  - /recipes/sql-joins
  - /recipes/connection-pooling
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende optimización de queries de base de datos. Usa EXPLAIN, refactoriza queries y aplica técnicas para corregir SQL lento y mejorar rendimiento."
  keywords:
    - query optimization
    - slow queries
    - sql performance
    - explain analyze
    - database profiling
    - query refactoring
---

## Visión general

Las queries lentas de base de datos son una de las causas más comunes de degradación de rendimiento de aplicaciones. Una sola query no optimizada puede consumir el 100% de un core de CPU, mantener locks por segundos, o escanear millones de filas innecesariamente. La buena noticia es que la mayoría de queries lentas pueden mejorarse dramáticamente con análisis sistemático y refactoring dirigido.

La optimización de queries es un proceso de tres pasos: identificar queries lentas a través de logging y monitoreo, entender su plan de ejecución con `EXPLAIN`, y aplicar fixes dirigidos como indexing, reescritura o cambios de schema. Esta receta recorre cada paso con ejemplos concretos.

## Cuándo usarlo

Usa esta receta cuando:

- Los tiempos de respuesta de la aplicación degradan a medida que crece el volumen de datos
- El uso de CPU o I/O de la base de datos es consistentemente alto
- Herramientas de monitoreo marcan queries específicas como entradas de slow query log
- Agregando paginación, búsqueda o features de reporting a tablas existentes
- Migrando SQL legacy a un nuevo motor de base de datos

## Solución

### Identificar Queries Lentas (PostgreSQL)

```sql
ALTER SYSTEM SET log_min_duration_statement = '1000ms';
SELECT pg_reload_conf();

SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Analizar con EXPLAIN

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT o.id, o.total, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.created_at > '2025-01-01'
ORDER BY o.total DESC
LIMIT 100;
```

### Refactorizar Queries N+1

```python
# ANTES: Queries N+1 (ineficiente)
for order in orders:
    customer = db.query("SELECT name FROM customers WHERE id = %s", (order.customer_id,))

# DESPUÉS: Single JOIN query
customers = db.query("""
    SELECT o.id, o.total, c.name
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ANY(%s)
""", ([o.id for o in orders],))
```

## Explicación

- **EXPLAIN ANALYZE**: Ejecuta la query y muestra el plan de ejecución actual, incluyendo conteos de filas, condiciones de filtro y operaciones de I/O. Busca sequential scans, nested loops con altos conteos de filas, y operaciones de sort sin índices.
- **Queries N+1**: Ocurren cuando el código itera sobre un result set y ejecuta una query adicional por iteración. Una sola JOIN o cláusula `IN` bien elaborada reemplaza cientos de queries individuales.
- **Índices covering**: Cuando todas las columnas que una query necesita están en el índice, la base de datos puede responder la query sin tocar la tabla. Esto se llama "index-only scan" y puede ser 10x más rápido.
- **Reescritura de queries**: A veces la query misma es el problema. Convertir `NOT IN` a `NOT EXISTS`, usar `UNION ALL` en lugar de `UNION`, o filtrar temprano con subqueries puede mejorar dramáticamente el rendimiento.

## Variantes

| Técnica | Impacto | Esfuerzo | Mejor para |
|---------|---------|----------|------------|
| Agregar índice | Alto | Bajo | Índice faltante en columnas WHERE/JOIN |
| Reescribir query | Alto | Medio | Joins ineficientes, subqueries |
| Particionar tabla | Muy alto | Alto | Tablas > 10M filas con queries basadas en tiempo |
| Vista materializada | Alto | Medio | Agregaciones complejas consultadas frecuentemente |

## Mejores prácticas

- **Filtra temprano**: aplica condiciones `WHERE` en columnas indexadas antes de joins y sorts. Cuantas menos filas fluyan a través del pipeline de la query, más rápido corre.
- **Evita `SELECT *`**: traer columnas innecesarias desperdicia I/O y memoria. Selecciona solo las columnas que necesitas.
- **Usa `EXISTS` en lugar de `IN` para subqueries grandes**: `EXISTS` hace short-circuit en el primer match, mientras que `IN` puede construir un result set intermedio completo.
- **Actualiza estadísticas de tabla**: el query optimizer depende de estadísticas para elegir planes. Corre `ANALYZE` después de bulk loads o cambios de datos significativos.
- **Monitorea planes de ejecución a lo largo del tiempo**: los planes pueden cambiar a medida que la distribución de datos se desplaza. Configura alertas cuando una query previamente rápida se vuelve lenta repentinamente.

## Errores comunes

- **Indexar sin analizar**: agregar un índice en una columna de baja cardinalidad (como un booleano) raramente ayuda y siempre ralentiza escrituras.
- **Ignorar hints del query planner**: a veces el optimizer elige un mal plan. Usa hints (`USE INDEX`, `SET enable_seqscan = off`) juiciosamente cuando sabes más.
- **No testear con volumen de datos de producción**: una query que corre en 10ms en una base de datos de desarrollo con 1,000 filas puede tardar 10 segundos en producción con 10 millones de filas.
- **Optimización prematura**: profile primero. No reescribas queries que ya son rápidas. Enfócate en las top 5 queries más lentas por tiempo total de ejecución.

## Preguntas frecuentes

**P: ¿Cómo sé si una query está usando un índice?**
R: Revisa el output de `EXPLAIN`. `Index Scan` o `Index Only Scan` significa que la query usa un índice. `Seq Scan` significa que está leyendo la tabla completa.

**P: ¿Debería siempre evitar `SELECT *`?**
R: Para queries de producción, sí. Pero para exploración ad-hoc o tablas muy pequeñas, `SELECT *` está bien. La clave es ser intencional sobre lo que traes.

**P: ¿Cuál es la diferencia entre `EXPLAIN` y `EXPLAIN ANALYZE`?**
R: `EXPLAIN` muestra el plan estimado sin ejecutar. `EXPLAIN ANALYZE` ejecuta la query y muestra timings y conteos de filas reales. Siempre usa `ANALYZE` cuando estás tuneando.

**P: ¿Los ORMs pueden generar queries eficientes?**
R: Usualmente, pero no siempre. ORMs como SQLAlchemy y Hibernate pueden generar queries N+1 o joins ineficientes. Profile el SQL actual que emiten y optimiza a nivel SQL cuando sea necesario.

