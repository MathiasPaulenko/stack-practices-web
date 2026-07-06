---
contentType: recipes
slug: sql-index-optimization-analysis
title: "Analizar y optimizar índices SQL con EXPLAIN"
description: "Identifica índices faltantes, sin uso e ineficientes leyendo planes de ejecución y midiendo el costo de las consultas con EXPLAIN."
metaDescription: "Optimiza índices SQL usando EXPLAIN y planes de ejecución. Detecta índices faltantes, escaneos secuenciales y cuellos de botella."
difficulty: intermediate
topics:
  - databases
tags:
  - sql
  - postgresql
  - indexes
  - explain
  - performance
relatedResources:
  - /guides/read-replica-guide
  - /guides/sql-performance-tuning-guide
  - /recipes/postgres-query-optimization
  - /recipes/sql-find-duplicate-rows
  - /recipes/sql-recursive-cte-query
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Optimiza índices SQL usando EXPLAIN y planes de ejecución. Detecta índices faltantes, escaneos secuenciales y cuellos de botella."
  keywords:
    - sql
    - postgresql
    - índices
    - explain
    - rendimiento
---


## Visión General

Los índices son la herramienta principal para hacer que las consultas SQL sean rápidas, pero agregarlos a ciegas puede desperdiciar espacio, ralentizar escrituras e incluso hacer consultas más lentas. El enfoque correcto es comenzar con el plan de ejecución. `EXPLAIN` y `EXPLAIN ANALYZE` revelan si la base de datos está escaneando toda la tabla o usando un índice, y estiman el costo de cada paso para que puedas apuntar a los cuellos de botella más grandes primero.

## Cuándo Usar

Usa este recurso cuando:
- Una consulta sea más lenta de lo esperado y sospeches un índice faltante.
- Quieras verificar que un índice recién creado se está usando.
- Estés revisando logs de consultas lentas o dashboards de rendimiento.
- Necesites decidir entre un índice B-tree, GIN o parcial.

## Solución

### Analizar una consulta con EXPLAIN ANALYZE

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM orders
WHERE customer_id = 1234
  AND created_at > '2024-01-01'
ORDER BY created_at DESC
LIMIT 100;

-- Crear un índice compuesto si el plan muestra un escaneo secuencial
CREATE INDEX idx_orders_customer_created
ON orders (customer_id, created_at DESC);
```

### Encontrar índices no usados y duplicados

```sql
-- PostgreSQL: encontrar índices que nunca se han usado desde el último reset
SELECT schemaname, relname, indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Resetear estadísticas para obtener datos frescos
SELECT pg_stat_reset();

-- Encontrar índices duplicados (mismas columnas, diferentes nombres)
SELECT pg_size_pretty(pg_relation_size(indexrelid)) AS size,
       relname AS table,
       indexrelname AS index,
       string_agg(attname, ', ' ORDER BY array_position(ix.indkey, attnum)) AS columns
FROM pg_index ix
JOIN pg_class c ON c.oid = ix.indrelid
JOIN pg_class ci ON ci.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(ix.indkey)
GROUP BY relname, indexrelname, ix.indkey
HAVING count(*) > 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Crear un índice parcial para registros activos

```sql
-- Indexar solo filas no eliminadas: ahorra espacio cuando la mayoría están eliminadas
CREATE INDEX idx_orders_active_customer
ON orders (customer_id)
WHERE deleted_at IS NULL;

-- Verificar que el índice parcial se usa
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE customer_id = 1234 AND deleted_at IS NULL;
```

### Crear un índice de cobertura para index-only scans

```sql
-- Incluir columnas en el índice para evitar heap lookups
CREATE INDEX idx_orders_covering
ON orders (customer_id, created_at DESC)
INCLUDE (total_amount, status);

-- Esta consulta puede ahora usar un Index Only Scan
EXPLAIN (ANALYZE, BUFFERS)
SELECT customer_id, created_at, total_amount, status
FROM orders
WHERE customer_id = 1234
ORDER BY created_at DESC
LIMIT 50;
```

### Crear un índice de expresión para consultas calculadas

```sql
-- Indexar email en minúsculas para búsquedas case-insensitive
CREATE INDEX idx_users_email_lower
ON users (LOWER(email));

-- La consulta debe coincidir con la expresión exactamente
EXPLAIN ANALYZE
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';

-- Indexar extracción de fecha para reportes mensuales
CREATE INDEX idx_orders_month
ON orders (DATE_TRUNC('month', created_at));
```

### Eliminar índices no usados de forma segura

```sql
-- Paso 1: Monitorear al menos una semana para capturar patrones semanales
-- Paso 2: Verificar el tamaño del índice antes de eliminar
SELECT pg_size_pretty(pg_relation_size('idx_orders_old_status'));

-- Paso 3: Eliminar el índice
DROP INDEX CONCURRENTLY idx_orders_old_status;
-- CONCURRENTLY previene el bloqueo de la tabla durante la eliminación
```

## Explicación

`EXPLAIN (ANALYZE, BUFFERS)` ejecuta la consulta y reporta tiempo real de ejecución más estadísticas de I/O. Busca `Seq Scan` en tablas grandes, lo que significa que la base de datos lee cada fila. Si el filtro es selectivo, un índice compuesto en `(customer_id, created_at)` permite a la base de datos saltar a las filas relevantes y devolverlas en orden. El orden del índice debe coincidir con columnas de igualdad primero, luego rangos, y finalmente ordenamiento.

Métricas clave a leer del output:

| Métrica | Significado | Alerta |
|---------|-------------|--------|
| `Seq Scan` | Escaneo completo de tabla | En tablas con >10k filas |
| `cost=0.00..5234.12` | Unidades de costo estimado | Comparar antes/después |
| `rows=1000000` | Filas estimadas | Muy diferente de real = stats desactualizadas |
| `actual time=234.5..567.8` | Milisegundos reales | Comparar con baseline |
| `Buffers: shared hit=1234 read=5678` | Cache hits vs disk reads | Alto read = I/O bottleneck |

## Mantenimiento de Índices

### Reconstruir índices fragmentados

```sql
-- Verificar bloat de índices
SELECT schemaname, relname, indexrelname,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size,
       idx_scan AS scans
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- Reconstruir índice sin bloquear la tabla
REINDEX INDEX CONCURRENTLY idx_orders_customer_created;

-- Reconstruir todos los índices de una tabla
REINDEX TABLE CONCURRENTLY orders;
```

### Actualizar estadísticas después de cargas masivas

```sql
-- Después de importar grandes datasets, actualizar estadísticas del planificador
ANALYZE orders;

-- Establecer target de estadísticas para estimaciones más precisas
ALTER TABLE orders ALTER COLUMN customer_id SET STATISTICS 1000;
ANALYZE orders;
```

## Variantes

| Tipo de índice | Mejor para | Ejemplo |
|----------------|------------|---------|
| B-tree | Igualdad y rango | `WHERE id = 5` o `WHERE date > '2024-01-01'` |
| GIN | Array, JSONB, full-text | `WHERE tags @> ARRAY['x']` |
| BRIN | Tablas muy grandes, naturalmente ordenadas | Datos de series temporales |
| Parcial | Subconjunto de filas | `WHERE deleted_at IS NULL` |
| Cobertura | Index-only scans | `INCLUDE (col1, col2)` |
| Expresión | Columnas calculadas | `LOWER(email)` |

```sql
-- Índice GIN para consultas JSONB
CREATE INDEX idx_events_metadata ON events USING GIN (metadata);
SELECT * FROM events WHERE metadata @> '{"type": "click"}';

-- Índice BRIN para time-series (footprint pequeño, rápido para datos ordenados)
CREATE INDEX idx_metrics_time_brin ON metrics USING BRIN (recorded_at);
```

## Lo que funciona

1. **Mide siempre antes y después.** `EXPLAIN ANALYZE` da prueba concreta de mejora.
2. **Indexa columnas de igualdad primero.** Son más selectivas que las de rango.
3. **Mantén índices estrechos.** Incluye solo columnas que la consulta necesita.
4. **Elimina índices no usados.** Consumen espacio en disco y ralentizan escrituras.
5. **Monitorea rendimiento de escritura.** Cada índice agrega costo a `INSERT`, `UPDATE` y `DELETE`.
6. **Usa CONCURRENTLY en producción.** Crear o eliminar índices sin `CONCURRENTLY` bloquea la tabla.
7. **Ejecuta ANALYZE después de cargas masivas.** Estadísticas desactualizadas causan malas decisiones del planificador.

## Errores Comunes

1. **Agregar un índice para cada consulta lenta.** Demasiados índices dañan throughput de escritura y mantenimiento.
2. **Orden incorrecto de columnas en índices compuestos.** La columna principal debe ser la usada en filtros de igualdad.
3. **Indexar columnas de baja cardinalidad solas.** Un índice en `status` con solo tres valores raramente es útil.
4. **Olvidar actualizar estadísticas.** Ejecuta `ANALYZE` después de cargas masivas para que el planificador tenga conteos precisos.
5. **Asumir que el planificador usará el índice.** Confirma siempre con `EXPLAIN`; los hints son último recurso.
6. **Crear índices sin CONCURRENTLY en producción.** Esto bloquea la tabla y causa downtime.
7. **Ignorar el bloat de índices.** Índices fragmentados crecen más de lo necesario y ralentizan scans. Ejecuta `REINDEX CONCURRENTLY` periódicamente.

## Preguntas Frecuentes

**P: ¿Cuál es la diferencia entre EXPLAIN y EXPLAIN ANALYZE?**
R: EXPLAIN muestra el plan planificado. EXPLAIN ANALYZE ejecuta la consulta realmente y reporta tiempos y filas reales procesadas.

**P: ¿Cómo sé si un índice está siendo usado?**
R: Busca `Index Scan` o `Index Only Scan` en el plan. `Seq Scan` en una tabla grande generalmente significa que el índice no se usa. También puedes revisar `pg_stat_user_indexes.idx_scan` para ver uso acumulado.

**P: ¿Debería agregar un índice a cada columna de clave foránea?**
R: Generalmente sí, especialmente si la columna se usa en JOINs, WHERE o búsquedas de hijos. Pero verifica uso con `EXPLAIN`.

**P: ¿Cuántos índices son demasiados?**
R: No hay un número fijo. Monitorea el rendimiento de escritura al agregar índices. Si la latencia de `INSERT` o `UPDATE` crece más allá de tu SLA, tienes demasiados. Regla general: 5-10 índices por tabla para OLTP, más para tablas de reporte con mucha lectura.

**P: ¿Cuál es el costo de un índice faltante?**
R: Un `Seq Scan` en una tabla de 10M filas puede tardar segundos. La misma consulta con un índice tarda milisegundos. El costo no es solo latencia sino también presión de CPU e I/O que afecta otras consultas.

**P: ¿Cuándo usar un índice de cobertura vs un índice compuesto?**
R: Usa un índice de cobertura (`INCLUDE`) cuando quieres un Index Only Scan y las columnas extra no son parte del filtro u ordenamiento. Usa un índice compuesto cuando todas las columnas son parte del filtro u ordenamiento.

**P: ¿Cómo pruebo el rendimiento de índices en staging sin datos de producción?**
R: Genera datos sintéticos con cardinalidad realista. Usa `generate_series` en PostgreSQL para crear filas de prueba. Compara el output de `EXPLAIN ANALYZE` antes y después de agregar el índice.

**P: ¿Pueden los índices perjudicar el rendimiento de SELECT?**
R: Sí. Si el planificador elige un index scan cuando un sequential scan sería más rápido (ej: el índice coincide con pocas filas pero la tabla es pequeña), o si el índice está fragmentado y requiere más I/O que un scan directo. El planificador generalmente acierta, pero estadísticas desactualizadas pueden causar malas elecciones.

**P: ¿Cómo manejo índices durante una migración?**
R: Crea índices con `CREATE INDEX CONCURRENTLY` después de la migración de datos, no antes. Pre-crear índices en una tabla vacía y luego cargar datos es más lento que cargar primero e indexar después. Para tablas grandes, considera crear el índice en una sesión en background.

**P: ¿Cuál es la diferencia entre CLUSTER y REINDEX?**
R: `REINDEX` reconstruye la estructura de datos del índice. `CLUSTER` reordena físicamente las filas de la tabla para coincidir con un índice. `CLUSTER` es una operación única (PostgreSQL no mantiene el orden), mientras que `REINDEX` aborda el bloat que se acumula con el tiempo.

## Comparación de Rendimiento

| Escenario | Sin índice | Con índice compuesto | Mejora |
|-----------|-----------|---------------------|--------|
| 1M filas, filtro de igualdad | 340ms (Seq Scan) | 0.8ms (Index Scan) | 425x |
| 1M filas, rango + sort | 520ms (Seq Scan + Sort) | 1.2ms (Index Scan) | 433x |
| 10M filas, count por FK | 4.2s (Seq Scan) | 15ms (Index Only Scan) | 280x |
| 500K filas, filtro JSONB | 890ms (Seq Scan) | 3ms (GIN Scan) | 296x |

## Checklist de Monitoreo

Ejecuta estas consultas semanalmente para mantener la salud de los índices:

```sql
-- 1. Top 10 índices más grandes (candidatos para revisión)
SELECT relname, indexrelname,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;

-- 2. Índices con cero scans (no usados)
SELECT relname, indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- 3. Tablas con presión de sequential scan
SELECT relname, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > 100 AND seq_tup_read > idx_tup_fetch
ORDER BY seq_tup_read DESC;
```

Programa estos checks como un cron job semanal y registra los resultados para seguir las tendencias de salud de los índices a lo largo del tiempo.
