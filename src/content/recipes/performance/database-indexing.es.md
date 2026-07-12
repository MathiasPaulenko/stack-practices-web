---


contentType: recipes
slug: database-indexing
title: "Optimizar Queries con Indexación de Bases de Datos"
description: "Cómo crear, analizar y mantener índices para acelerar queries de base de datos y evitar errores comunes de indexación."
metaDescription: "Aprende estrategias de indexación de bases de datos. Crea índices B-tree y compuestos, analiza planes de ejecución y optimiza SELECT en PostgreSQL y MySQL."
difficulty: intermediate
topics:
  - performance
tags:
  - performance
  - base-de-datos
  - indexing
  - optimization
  - profiling
relatedResources:
  - /recipes/sql-joins
  - /recipes/database-views-materialized
  - /recipes/connection-pooling
  - /recipes/cache-invalidation
  - /recipes/query-optimization
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende estrategias de indexación de bases de datos. Crea índices B-tree y compuestos, analiza planes de ejecución y optimiza SELECT en PostgreSQL y MySQL."
  keywords:
    - indexación base de datos
    - optimización queries
    - índice btree
    - índice compuesto
    - explain analyze
    - rendimiento sql
    - indexación postgresql
    - indexación mysql


---

## Visión general

Los índices de bases de datos son estructuras de datos que aceleran operaciones de lectura proporcionando rutas rápidas a las filas sin escanear tablas enteras. Sin índices apropiados, incluso cláusulas `WHERE` simples fuerzan a la base de datos a examinar cada fila secuencialmente — un full table scan que se vuelve insoportablemente lento a medida que los datos crecen.

Sin embargo, los índices no son gratuitos. Cada escritura (`INSERT`, `UPDATE`, `DELETE`) debe actualizar todos los índices relevantes, y cada índice consume espacio en disco y memoria. El objetivo es crear los índices correctos para tus patrones de lectura mientras se minimiza el overhead en escrituras.

## Cuándo usarlo

Usa esta receta cuando:

- Los queries se ralentizan a medida que el tamaño de la tabla crece
- El análisis de logs de queries lentos o planes de ejecución revela escaneos secuenciales
- Agregas paginación o filtros de búsqueda a una tabla existente
- Diseñas un nuevo schema y predices patrones de acceso
- Troubleshooteas contención de locks causada por lecturas de larga duración

## Solución

### Índice básico (columna única)

```sql
-- Crear un índice en la columna email
CREATE INDEX idx_users_email ON users(email);

-- El query ahora usa el índice en lugar de escanear toda la tabla
SELECT * FROM users WHERE email = 'alice@example.com';
```

### Índice compuesto (múltiples columnas)

```sql
-- El orden de columnas importa: filtros de igualdad primero, filtros de rango segundo
CREATE INDEX idx_orders_user_created
ON orders(user_id, created_at DESC);

-- Soporta:
-- WHERE user_id = 1
-- WHERE user_id = 1 AND created_at > '2025-01-01'
-- ORDER BY user_id, created_at DESC
```

### Índice parcial

```sql
-- Solo indexa usuarios activos — más pequeño y rápido para este query específico
CREATE INDEX idx_active_users_email
ON users(email)
WHERE active = true;
```

### Analizando planes de ejecución

```sql
-- PostgreSQL
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE user_id = 42
ORDER BY created_at DESC
LIMIT 10;
```

Busca:
- `Seq Scan` = escaneo secuencial de tabla (lento en tablas grandes, necesita un índice)
- `Index Scan` o `Index Only Scan` = usando un índice (rápido)
- `Bitmap Heap Scan` = usando múltiples índices o un match parcial

## Explicación

- **Índices B-tree**: El tipo de índice por defecto. Excelente para queries de igualdad y rango (`=`, `<`, `>`, `BETWEEN`). La mayoría de bases de datos usan B-tree para claves primarias automáticamente.
- **Índices compuestos**: La base de datos puede usar el índice para cualquier prefijo de la lista de columnas. Un índice en `(a, b, c)` soporta queries en `(a)`, `(a, b)`, y `(a, b, c)`, pero no `(b)` o `(c)` solos.
- **Índices covering**: Si todas las columnas que un query necesita están en el índice, la base de datos puede responder el query sin tocar la tabla. Esto se llama "index-only scan" y es dramáticamente más rápido.
- **Índices parciales**: Índices más pequeños que solo cubren un subconjunto de filas. Útiles para tablas donde la mayoría de queries filtran por una condición específica (ej. `active = true`).

## Variantes

| Tipo de índice | Mejor para | Trade-off |
|----------------|------------|-----------|
| B-tree | Igualdad, rango, ordenamiento | Propósito general, mayor costo de escritura |
| Hash | Igualdad exacta solamente | Lookups más rápidos, sin soporte de rango |
| GiST / GIN | Full-text search, JSON, arrays | Más grandes, más lentos de construir |
| BRIN | Tablas muy grandes, naturalmente ordenadas | Tamaño mínimo, resultados aproximados |

## Lo que funciona

- **Indexa las columnas de tu cláusula WHERE**: si un query filtra por `user_id` y `status`, un índice en `(user_id, status)` es lo primero que probar.
- **Pon columnas de igualdad antes que columnas de rango**: en `(a, b)` donde `a = 1` y `b > 100`, el índice en `(a, b)` es mucho más útil que `(b, a)`.
- **Evita indexar columnas de baja cardinalidad solas**: una columna `status` con solo 3 valores (active, pending, archived) no se beneficia de un índice standalone. Combínala con una columna de alta cardinalidad.
- **Elimina índices no usados**: cada índice ralentiza escrituras. Monitorea estadísticas de uso de índices y elimina índices que nunca se escanean.
- **Indexa columnas de foreign key**: las bases de datos no siempre indexan automáticamente foreign keys. Índices faltantes en columnas `JOIN` causan escaneos costosos de nested loop. Consulta [diseño de bases de datos](/guides/databases/database-design-guide). Consulta [SQL Joins](/recipes/databases/sql-joins) para optimización de joins.

## Errores comunes

- **Indexar cada columna**: esto desperdicia espacio en disco, ralentiza dramáticamente escrituras, y confunde al optimizador de queries con demasiadas opciones.
- **Orden incorrecto de columnas en índices compuestos**: un índice en `(created_at, user_id)` no puede ayudar a un query que filtra solo por `user_id`.
- **Indexar columnas que nunca se consultan**: revisa tus logs de queries antes de crear índices.
- **Ignorar el mantenimiento de índices**: los índices fragmentados en tablas de alta rotación se degradan con el tiempo. Consulta [tuning SQL](/guides/databases/sql-performance-tuning-guide). Programa `REINDEX` o `OPTIMIZE TABLE` periódicamente.
- **Usar índices en tablas pequeñas**: tablas con menos de unos miles de filas a menudo son más rápidas con escaneos secuenciales porque leer el índice y luego la tabla es más overhead que un escaneo completo.

## Preguntas frecuentes

**P: ¿Cuántos índices debería tener una tabla?**
R: No hay regla universal, pero una buena heurística es 3-5 índices para tablas bajo 1 millón de filas, y 5-10 para tablas más grandes. Más que eso usualmente indica índices redundantes o no usados.

**P: ¿Los índices ralentizan INSERT y UPDATE?**
R: Sí. Cada índice en una tabla agrega overhead de escritura porque la base de datos debe actualizar el árbol del índice. Mide el throughput de escritura antes y después de agregar índices en tablas write-heavy.

**P: ¿Puedo indexar columnas JSON o arrays?**
R: Sí. PostgreSQL soporta índices GIN para arrays JSONB y full-text search. MySQL 8+ soporta índices multi-valuados para arrays JSON. Estos son especializados y deben usarse solo cuando se necesitan.

**P: ¿Debería usar un índice UNIQUE o un índice regular?**
R: Usa `UNIQUE` cuando la combinación de columnas debe ser única (como `email`). Es tanto una constraint como un índice. No agregues un índice regular encima de uno unique — es redundante.

### ¿Cómo identifico índices faltantes en producción?

Habilita slow query logging: en PostgreSQL setea `log_min_duration_statement = 100` para loguear queries más lentas que 100ms. En MySQL setea `long_query_time = 0.1` y habilita `slow_query_log`. Usa `pg_stat_statements` en PostgreSQL para trackear frecuencia de queries y tiempo promedio de ejecución: `SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 20`. Busca queries con `seq_scan` alto en tablas grandes en `pg_stat_user_tables`. Ejecuta `EXPLAIN (ANALYZE, BUFFERS)` en queries lentas para confirmar sequential scans. Herramientas como `pgBadger` analizan logs de PostgreSQL y generan reportes con las queries más lentas y sus planes de ejecución.

### ¿Cómo elijo entre índices B-tree, Hash, GIN y BRIN?

B-tree es el default y maneja igualdad (`=`), rango (`<`, `>`, `BETWEEN`) y sorting (`ORDER BY`). Usa B-tree para la mayoría de columnas. Hash indexes solo soportan igualdad y son más rápidos que B-tree para `=` pero no pueden manejar range queries o sorting — úsalos para lookup tables. GIN (Generalized Inverted Index) es para valores compuestos como arrays, JSONB y full-text search — usa GIN para queries `@>` (contains) en JSONB. BRIN (Block Range Index) es para datos naturalmente ordenados como time-series — almacena min/max por block range, haciéndolo tiny (kilobytes vs gigabytes para B-tree). Usa BRIN en columnas timestamp en tablas append-only. GiST es para datos geométricos y nearest-neighbor searches.

### ¿Cómo funcionan los partial indexes y cuándo debería usarlos?

Los partial indexes indexan solo rows que matchean un `WHERE` clause: `CREATE INDEX idx_active_users ON users(email) WHERE active = true`. Son más pequeños y más rápidos de mantener que full indexes. Úsalos cuando las queries siempre filtran por una condición específica: registros soft-deleted (`WHERE deleted_at IS NULL`), suscripciones activas (`WHERE status = 'active'`), o datos recientes (`WHERE created_at > '2025-01-01'`). El query planner usa un partial index solo cuando el `WHERE` clause de la query matchea el predicado del índice. Si la query filtra por `active = true` pero el predicado del índice es `active = true AND deleted_at IS NULL`, el planner puede no usarlo — los predicados deben matchear exactamente o ser implícitos.

### ¿Cómo monitoreo el uso de índices y elimino índices no usados?

Query `pg_stat_user_indexes` en PostgreSQL: `SELECT schemaname, indexname, idx_scan FROM pg_stat_user_indexes WHERE idx_scan = 0 ORDER BY indexname`. Un `idx_scan` de 0 significa que el índice nunca se usó desde el último reset de estadísticas. Compara el tamaño del índice con `pg_size_pretty(pg_relation_size('index_name'))`. Elimina índices no usados: `DROP INDEX CONCURRENTLY idx_name`. Usa `CONCURRENTLY` para evitar lockear la tabla durante el drop. En MySQL, query `sys.schema_unused_indexes` o revisa `INFORMATION_SCHEMA.STATISTICS` combinado con data del performance schema. Programa auditorías mensuales de índices — índices no usados por 30+ días son candidatos para eliminación. Ten cuidado con índices usados por batch jobs infrecuentes o reportes trimestrales.

### ¿Cómo manejo fragmentación y bloat de índices?

Los índices de PostgreSQL acumulan dead tuples después de operaciones `UPDATE` y `DELETE`. Verifica bloat con la extensión `pgstattuple`: `SELECT * FROM pgstattuple('index_name')`. Rebuilda índices con bloat con `REINDEX INDEX CONCURRENTLY idx_name` — la opción `CONCURRENTLY` evita bloquear writes. Para índices B-tree, considera `pg_repack` o `pg_squeeze` para rebuilds online sin locks exclusivos. En MySQL, ejecuta `ANALYZE TABLE` para actualizar estadísticas y `OPTIMIZE TABLE` para rebuildar la tabla e índices. Programa reindexing durante ventanas de bajo tráfico. Monitorea la columna `n_dead_tup` en `pg_stat_user_tables` para determinar cuándo se necesita reindexing — un ratio dead-to-live arriba del 20% es un buen threshold.

### ¿Cómo afectan los composite indexes al rendimiento de queries?

El orden de columnas en composite indexes importa: el índice es usable solo cuando la query filtra en las columnas más a la izquierda. `CREATE INDEX idx_a_b_c ON orders(user_id, status, created_at)` soporta `WHERE user_id = 1`, `WHERE user_id = 1 AND status = 'paid'`, y `WHERE user_id = 1 AND status = 'paid' ORDER BY created_at`. NO soporta `WHERE status = 'paid'` solo — `user_id` debe ir primero. Pon columnas de igualdad antes de columnas de rango: `(status, created_at)` para `WHERE status = 'active' AND created_at > '2025-01-01'`. Para optimización de `ORDER BY`, matchea el orden del índice al orden del sort. Limita composite indexes a 3-4 columnas — índices más anchos consumen más disco y memoria con returns decrecientes.

### ¿Cómo indexo para queries LIKE y full-text search?

Los B-tree indexes no soportan `LIKE '%pattern%'` (wildcard inicial). Para suffix matching, usa un trigram index en PostgreSQL: `CREATE EXTENSION pg_trgm; CREATE INDEX idx_name_trgm ON users USING gin (name gin_trgm_ops)`. Query con `WHERE name % 'john'` o `WHERE name ILIKE '%john%'`. Para full-text search, crea un GIN index en una columna `tsvector`: `CREATE INDEX idx_search ON articles USING gin(to_tsvector('english', title || ' ' || body))`. Query con `WHERE to_tsvector('english', title || ' ' || body) @@ plainto_tsquery('english', 'search term')`. En MySQL, usa full-text indexes: `CREATE FULLTEXT INDEX idx_search ON articles(title, body)` y query con `MATCH(title, body) AGAINST('search term' IN NATURAL LANGUAGE MODE)`.

### ¿Cómo afectan los índices al rendimiento de escritura?

Cada índice agrega overhead a operaciones `INSERT`, `UPDATE` y `DELETE` — la base de datos debe actualizar cada índice en la tabla. Una tabla con 10 índices hace writes ~10x más lentos que un write solo heap. Mide el impacto en writes con scripts de benchmark: inserta 10K rows con y sin índices y compara throughput. Para tablas write-heavy (logs, events, metrics), minimiza índices — considera escribir a una tabla staging sin índices y batch-mergear a la tabla indexada. Usa `COPY` en PostgreSQL en lugar de `INSERT`s individuales para bulk loads. Considera diferir la creación de índices hasta después de bulk data loads: drop índices, load data, recreate índices. Monitorea write latency con `pg_stat_user_tables` — compara `n_tup_ins`, `n_tup_upd` y `n_tup_del` contra el tamaño de la tabla.

### ¿Cómo uso covering indexes (cláusula INCLUDE) para optimización de queries?

Los covering indexes incluyen columnas adicionales en el índice sin hacerlas parte de la search key. En PostgreSQL: `CREATE INDEX idx_orders_covering ON orders(user_id, status) INCLUDE (total_amount, created_at)`. La query `SELECT total_amount, created_at FROM orders WHERE user_id = 1 AND status = 'paid'` puede servirse enteramente desde el índice (Index-Only Scan) sin tocar el heap. Las columnas `INCLUDE` no son parte de la B-tree sort key, así que no afectan el ordenamiento del índice — solo almacenan valores en las leaf pages. Esto reduce I/O para queries que seleccionan pocas columnas. En MySQL, usa un composite index que incluya todas las columnas seleccionadas: `CREATE INDEX idx_covering ON orders(user_id, status, total_amount, created_at)`. El InnoDB de MySQL almacena secondary indexes con el valor del primary key, así que si el PK es `id`, un covering index en `(user_id, status)` ya incluye `id` en las leaf pages. Monitorea el uso de Index-Only Scan en `EXPLAIN (ANALYZE, BUFFERS)` — busca `Heap Fetches: 0` que significa que todos los datos vinieron del índice.

### ¿Cómo manejo indexación para bases de datos multi-tenant?

Para aislamiento schema-per-tenant, cada tenant tiene su propio schema con índices idénticos — no se necesita manejo especial. Para multi-tenancy shared-schema con una columna `tenant_id`, prefija todos los composite indexes con `tenant_id`: `CREATE INDEX idx_orders_tenant ON orders(tenant_id, user_id, status)`. Esto asegura que el planner pueda filtrar por tenant primero, reduciendo el rango del index scan. Para RLS (Row-Level Security) en PostgreSQL, el planner agrega el filtro de tenant automáticamente — asegúrate de que `tenant_id` sea la columna inicial de todos los índices en tablas multi-tenant. Considera partial indexes por tenant para tenants de alto volumen: `CREATE INDEX idx_tenant_a_orders ON orders(user_id) WHERE tenant_id = 'tenant_a'`. Esto mantiene el índice pequeño para el tenant específico. Monitorea el tamaño del índice por tenant con `pg_stat_user_indexes` y considera particionar la tabla por `tenant_id` cuando los datos de un solo tenant excedan el 20% de la tabla.

### ¿Cómo uso expression indexes para columnas computadas?

Los expression indexes indexan el resultado de una expresión en lugar de una columna directamente. En PostgreSQL: `CREATE INDEX idx_lower_email ON users(LOWER(email))`. Las queries que usan `WHERE LOWER(email) = 'john@example.com'` usarán el índice. Sin el expression index, `LOWER(email)` requiere un full scan. Usa expression indexes para lookups case-insensitive, fechas computadas (`DATE(created_at)`), o extracción JSONB (`((data->>'status')::text)`). La expresión en la query debe matchear la expresión del índice exactamente. En MySQL, usa generated columns: `ALTER TABLE users ADD COLUMN email_lower VARCHAR(255) GENERATED ALWAYS AS (LOWER(email)) STORED; CREATE INDEX idx_email_lower ON users(email_lower)`. Query con `WHERE email_lower = 'john@example.com'`. Los expression indexes aumentan el overhead de writes proporcionalmente al coste de cómputo de la expresión — haz benchmark antes de desplegar.

### ¿Cómo ajusto autovacuum de PostgreSQL para mantenimiento de índices?

Autovacuum reclama dead tuples dejados por operaciones `UPDATE` y `DELETE`, lo que afecta el rendimiento de índices. Ajusta `autovacuum_vacuum_scale_factor` por tabla: `ALTER TABLE orders SET (autovacuum_vacuum_scale_factor = 0.05)` para disparar vacuum cuando el 5% de los rows estén dead (default es 20%). Para tablas write-heavy, setea un threshold más bajo: `autovacuum_vacuum_scale_factor = 0.02`. Aumenta `autovacuum_max_workers` para tablas con muchos índices (cada vacuum puede correr en paralelo). Setea `autovacuum_vacuum_cost_limit` más alto (ej., 2000) para permitir que autovacuum trabaje más rápido, y `autovacuum_vacuum_cost_delay` más bajo (ej., 1ms) para reducir throttling. Monitorea la acumulación de dead tuples con `pg_stat_user_tables.n_dead_tup`. Si autovacuum no puede mantenerse, programa `VACUUM (ANALYZE)` manual durante ventanas de bajo tráfico. Para tablas muy grandes, considera particionar para reducir el scope del vacuum por run.

### ¿Cómo uso EXPLAIN ANALYZE para verificar el uso de índices?

Ejecuta `EXPLAIN (ANALYZE, BUFFERS) SELECT ...` para ver el plan de ejecución con timing real e I/O. Busca `Seq Scan` (malo — full table scan) vs `Index Scan` (bueno — usa índice) vs `Index Only Scan` (mejor — todos los datos del índice, sin acceso al heap). Verifica `Heap Fetches` — si es 0, el covering index está funcionando. Revisa `Rows Removed by Filter` — si es alto, el índice no es suficientemente selectivo. Compara `Planning Time` vs `Execution Time` — planning time alto puede indicar estadísticas stale; ejecuta `ANALYZE table_name`. Revisa `Buffers: shared hit=N read=N` — `read` alto significa disk I/O, `hit` alto significa cache hits. Para queries complejas, usa `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)` para ver row counts reales por nodo. En MySQL, usa `EXPLAIN ANALYZE` (MySQL 8.0.18+) o `EXPLAIN FORMAT=JSON` para análisis detallado del plan. Busca `type: ref` o `type: range` (índice usado) vs `type: ALL` (full scan).

### ¿Cómo manejo conflictos de índices durante deployments concurrentes?

Usa `CREATE INDEX CONCURRENTLY` en PostgreSQL para evitar bloquear writes durante la creación del índice: `CREATE INDEX CONCURRENTLY idx_name ON table_name(column)`. Esto toma más tiempo que un `CREATE INDEX` regular pero permite que la tabla permanezca escribible. Si la creación del índice falla (ej., por una violación unique), deja un índice inválido — dropéalo con `DROP INDEX idx_name` y reintenta. En MySQL, usa `ALTER TABLE ... ADD INDEX` con `ALGORITHM=INPLACE, LOCK=NONE` para creación online de índices: `ALTER TABLE users ADD INDEX idx_email (email), ALGORITHM=INPLACE, LOCK=NONE`. Para tablas grandes, builda el índice en un entorno staging y swap. Usa `pt-online-schema-change` (Percona Toolkit) para MySQL para crear índices online con impacto mínimo. Siempre testea la creación de índices en una réplica o staging primero para estimar la duración.

### ¿Cómo uso table partitioning con índices?

El partitioning divide una tabla grande en piezas físicas más pequeñas. En PostgreSQL, usa declarative partitioning: `CREATE TABLE orders (id serial, created_at timestamp, ...) PARTITION BY RANGE (created_at)`. Crea particiones por mes: `CREATE TABLE orders_2025_01 PARTITION OF orders FOR VALUES FROM ('2025-01-01') TO ('2025-02-01')`. Cada partición tiene sus propios índices — crea índices en el parent y PostgreSQL los propaga a todas las particiones. El planner usa partition pruning para saltar particiones irrelevantes: una query `WHERE created_at >= '2025-01-01'` solo escanea `orders_2025_01`. Para índices en tablas particionadas, usa `CREATE INDEX ON orders(user_id)` — PostgreSQL crea un child index en cada partición automáticamente. Para hash partitioning, usa `PARTITION BY HASH (user_id)` para distribuir rows uniformemente across particiones. Elige la partition key basándote en los patrones de query — si la mayoría de queries filtran por fecha, particiona por fecha; si por tenant, particiona por `tenant_id`.

### ¿Cómo manejo index-only scans y visibility maps?

Los index-only scans retornan datos directamente del índice sin acceder al heap. PostgreSQL requiere que todas las columnas referenciadas estén en el índice y que el visibility map marque las páginas como all-visible. El visibility map trackea qué páginas contienen solo tuples visibles para todas las transacciones. Ejecuta `VACUUM` para actualizar el visibility map: `VACUUM (ANALYZE) orders`. Verifica la cobertura del visibility map con la extensión `pg_visibility`: `SELECT * FROM pg_visibility('orders')`. Si `all_visible` es bajo, los index-only scans harán fallback a heap fetches. Setea `ALTER TABLE orders SET (autovacuum_vacuum_scale_factor = 0.05)` para vacuumear más frecuentemente y mantener el visibility map actualizado. En MySQL, los secondary indexes de InnoDB siempre almacenan el primary key, así que los covering indexes funcionan sin un equivalente del visibility map. Monitorea la efectividad del index-only scan en `EXPLAIN (ANALYZE, BUFFERS)` — `Heap Fetches: 0` significa index-only scan puro.

### ¿Cómo hago benchmark de rendimiento de índices antes de desplegar a producción?

Crea una base de datos staging con volumen de data similar a producción. Usa `pg_dump` para exportar una muestra representativa: `pg_dump --table=orders --data-only prod_db | psql staging_db`. Ejecuta queries representativas con `EXPLAIN (ANALYZE, BUFFERS)` antes y después de agregar índices. Mide la latencia de queries con `pgbench`: escribe un script file custom con tus queries y ejecuta `pgbench -c 10 -j 4 -T 60 -f script.sql`. Compara p99 latency, throughput (TPS) y buffer hit ratio. Testea el impacto en writes: ejecuta `pgbench` con workload de writes (`pgbench -i -c 10 -T 60`) con y sin los nuevos índices. Monitorea el tamaño del índice: `SELECT pg_size_pretty(pg_relation_size('idx_name'))`. Para tablas grandes, estima el tiempo de build del índice en un subset primero: `CREATE INDEX ON orders_subset(column)` y extrapola. Documenta los resultados del benchmark en tu deployment runbook.

### ¿Cómo manejo índices en columnas de foreign keys?

Las columnas de foreign keys a menudo necesitan índices para rendimiento de joins y para prevenir lock escalation. PostgreSQL no indexa automáticamente las columnas de foreign keys. Sin un índice en la columna FK, eliminar un row parent requiere un full table scan en la tabla child para verificar que no existen referencias — esto puede causar lock contention en tablas grandes. Siempre indexa las columnas FK: `CREATE INDEX idx_orders_user_id ON orders(user_id)`. Para foreign keys compuestos, crea un composite index que matchee las columnas FK: `CREATE INDEX idx_order_items_order_id_product_id ON order_items(order_id, product_id)`. En MySQL, InnoDB crea automáticamente un índice en la columna del foreign key. En PostgreSQL, verifica FK indexes faltantes con: `SELECT conrelid::regclass AS table, conname AS constraint FROM pg_constraint WHERE contype = 'f' AND NOT EXISTS (SELECT 1 FROM pg_index WHERE indrelid = conrelid AND conkey @> indkey)`.

### ¿Cómo manejo bloat de índices en tablas con muchos updates?

Las tablas con operaciones `UPDATE` frecuentes acumulan dead tuples rápidamente. En PostgreSQL, cada `UPDATE` crea una nueva versión del row y marca la vieja como dead — el índice debe apuntar a la nueva versión. Usa HOT (Heap-Only Tuple) updates para evitar updates de índices cuando las columnas actualizadas no están indexadas: `ALTER TABLE orders SET (fillfactor = 80)` deja 20% de espacio libre en cada página para updates in-place. Los HOT updates skipan updates de índices cuando el nuevo row cabe en la misma página. Monitorea el ratio de HOT updates: `SELECT n_tup_hot_upd::float / NULLIF(n_tup_upd, 0) AS hot_ratio FROM pg_stat_user_tables WHERE relname = 'orders'`. Un ratio cerca de 1.0 significa que la mayoría de updates son HOT. Para columnas que cambian frecuentemente (ej., `last_seen`, `status`), considera si el índice es necesario — removerlo habilita más HOT updates. Programa `VACUUM` regular o usa `pg_repack` para reclamar espacio sin locks exclusivos.

### ¿Cómo uso hypothetical indexes para testear sin buildarlos?

La extensión `hypopg` de PostgreSQL crea hypothetical indexes en memoria sin consumir disco ni bloquear writes: `CREATE EXTENSION hypopg; SELECT * FROM hypopg_create_index('CREATE INDEX idx_test ON orders(user_id, status)')`. Ejecuta `EXPLAIN` en tu query — el planner considera el hypothetical index. Esto te permite testear si un índice sería usado antes de gastar tiempo buildándolo en una tabla grande. Remueve el hypothetical index con `SELECT * FROM hypopg_drop_index(idx_oid)` o `SELECT hypopg_reset()`. El hypothetical index existe solo en tu sesión — otras conexiones no lo ven. Úsalo para iteración de diseño de índices: crea hypothetical indexes para diferentes combinaciones de columnas, verifica cuáles usa el planner, y builda solo los efectivos. Esto es especialmente útil para tablas con billions de rows donde la creación de índices toma horas.

### ¿Cómo manejo estadísticas de índices y estimación de costos del planner?

El query planner usa estadísticas para estimar row counts y elegir planes de ejecución. Ejecuta `ANALYZE table_name` después de bulk loads o cambios de schema para actualizar estadísticas. Verifica estadísticas con `SELECT * FROM pg_stats WHERE tablename = 'orders'` — revisa `most_common_vals` y `most_common_freqs` para la distribución de valores de columnas. Aumenta el statistics target para columnas con distribuciones skewed: `ALTER TABLE orders ALTER COLUMN status SET STATISTICS 1000` (default es 100). Un statistics target más alto mejora la precisión del plan pero aumenta el tiempo de `ANALYZE`. Si el planner elige malos planes a pesar de estadísticas correctas, ajusta parámetros de costo: `SET random_page_cost = 1.1` (default 4.0) para almacenamiento SSD donde random reads son baratos. Setea `effective_cache_size = '8GB'` para decirle al planner cuánta memoria está disponible para caching. Monitorea cambios de plan con la extensión `auto_explain`: `LOAD 'auto_explain'; SET auto_explain.log_min_duration = 100` para loguear planes de queries lentas automáticamente.

### ¿Cómo manejo índices a través de migraciones de base de datos?

Trackea cambios de índices en migration files junto con cambios de schema. Usa una migration tool como `flyway`, `liquibase` o `sqitch` para version-control la creación y drop de índices. Cada migration file debería incluir scripts `UP` (create index) y `DOWN` (drop index). Para deployments zero-downtime, usa `CREATE INDEX CONCURRENTLY` en migraciones — nota que esto no puede correr dentro de un transaction block, así que configura tu migration tool para deshabilitar transaction wrapping para estos statements. En Flyway, setea `executeInTransaction: false` para la migración. Testea migraciones en una réplica staging con volumen de data de producción para estimar el tiempo de ejecución. Incluye estimaciones de tamaño de índice en PRs de migración: `SELECT pg_size_pretty(pg_relation_size('table_name')) * 0.15` como estimación rough de tamaño de índice (15% del tamaño de tabla para un B-tree single-column). Documenta procedimientos de rollback — dropar un índice `CONCURRENTLY` es safe y non-blocking.

### ¿Cómo optimizo índices para queries ORDER BY y paginación?

Para queries `ORDER BY created_at DESC LIMIT 20`, crea un índice que matchee el sort order: `CREATE INDEX idx_orders_created_desc ON orders(created_at DESC)`. El planner puede usar un backward index scan para retornar los primeros 20 rows sin sortear. Para keyset pagination (cursor-based), indexa las columnas de paginación: `CREATE INDEX idx_orders_cursor ON orders(created_at DESC, id DESC)`. Query con `WHERE (created_at, id) < ('2025-01-15', 12345) ORDER BY created_at DESC, id DESC LIMIT 20`. Esto evita `OFFSET` que degrada el rendimiento en páginas profundas. Para `ORDER BY` con filtros `WHERE`, pon columnas de filtro primero en el índice: `CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC)` para `WHERE status = 'active' ORDER BY created_at DESC`. Monitorea operaciones de sort en `EXPLAIN (ANALYZE, BUFFERS)` — busca nodos `Sort` con `Sort Space Used` alto que indican sort indexes faltantes.

### ¿Cómo manejo corrupción de índices y estrategias de reparación?

La corrupción de índices puede ocurrir después de fallos de hardware, cortes de energía o problemas de filesystem. Los síntomas incluyen queries que retornan resultados incorrectos, `ERROR: invalid memory alloc request size` o `ERROR: index "idx_name" contains unexpected page`. Detecta corrupción con la extensión `amcheck` en PostgreSQL: `CREATE EXTENSION amcheck; SELECT bt_index_check('idx_name')`. Para checks más profundos, usa `bt_index_parent_check` que verifica el índice contra el heap. Para reparar, drop y recreate el índice: `DROP INDEX idx_name; CREATE INDEX idx_name ON table_name(column)`. Usa `REINDEX INDEX idx_name` como alternativa — rebuilda el índice in place. Para corrupción en un primary key, usa `REINDEX TABLE table_name` para rebuildar todos los índices. Si la corrupción afecta el heap (no solo índices), restablece desde un backup o usa `pg_resetwal` como último recurso. Siempre investiga la causa raíz — corrupción repetida indica problemas de hardware o filesystem. Monitorea la salud del filesystem con `smartctl` y los logs de PostgreSQL para mensajes `PANIC` o `FATAL`.

### ¿Cómo uso conditional indexes para patrones de soft-delete?

Los registros soft-deleted usan una columna timestamp `deleted_at`. Las queries típicamente filtran `WHERE deleted_at IS NULL` para excluir rows eliminados. Crea un partial index: `CREATE INDEX idx_active_orders ON orders(user_id) WHERE deleted_at IS NULL`. Este índice es más pequeño que un full index porque excluye rows eliminados. El planner usa este índice solo cuando la query incluye `WHERE deleted_at IS NULL`. Si algunas queries olvidan el filtro, el planner hace fallback a un full scan — aplica el filtro a nivel de aplicación o via una view: `CREATE VIEW active_orders AS SELECT * FROM orders WHERE deleted_at IS NULL`. Para tablas con una columna `status` en lugar de `deleted_at`, usa `WHERE status != 'deleted'`. Monitorea el uso del partial index con `pg_stat_user_indexes` — si `idx_scan` es bajo, verifica si las queries incluyen el predicado que matchea. Para workloads mixtos (algunas queries necesitan registros eliminados), crea un full index separado en `deleted_at` para queries admin: `CREATE INDEX idx_orders_deleted_at ON orders(deleted_at) WHERE deleted_at IS NOT NULL`.

### ¿Cómo manejo el uso de memoria de índices en shared_buffers?

PostgreSQL cachea index pages en `shared_buffers`. Monitorea el uso del cache de índices con la extensión `pg_buffercache`: `CREATE EXTENSION pg_buffercache; SELECT c.relname, count(*) AS pages FROM pg_buffercache b JOIN pg_class c ON c.oid = b.relfilenode WHERE c.relkind = 'i' GROUP BY c.relname ORDER BY pages DESC`. Si un solo índice consume demasiadas buffer pages, considera si el índice es demasiado ancho o si la tabla necesita particionarse. Setea `shared_buffers` al 25% de la RAM disponible como punto de partida. Para workloads index-heavy, aumenta a 30-40%. Usa `pg_prewarm` para cargar índices en cache después de restarts: `SELECT pg_prewarm('idx_name')`. Monitorea el cache hit ratio por índice: `SELECT schemaname, indexname, idx_blks_hit::float / NULLIF(idx_blks_hit + idx_blks_read, 0) AS hit_ratio FROM pg_statio_user_indexes`. Un hit ratio abajo del 90% indica que el índice no cabe en memoria — considera agregar RAM, reducir el tamaño del índice, o particionar la tabla.

### ¿Cómo manejo índices en read replicas y replication lag?

Las read replicas sirven workloads read-heavy pero introducen replication lag. Los índices en el primary se crean automáticamente en las replicas via WAL replication. Sin embargo, `CREATE INDEX CONCURRENTLY` en el primary genera más tráfico WAL, aumentando el lag temporalmente. Monitorea el replication lag con `pg_stat_replication` en el primary: `SELECT application_name, write_lag, flush_lag, replay_lag FROM pg_stat_replication`. En la replica, revisa `pg_stat_wal_receiver` para métricas de lag. Si el lag excede tu SLA, considera crear índices directamente en la replica con `CREATE INDEX` (non-concurrent) durante ventanas de bajo tráfico — esto no afecta al primary pero el índice será sobreescrito por el próximo WAL replay. Para logical replication, los índices deben crearse independientemente en cada subscriber. Usa `pg_stat_progress_create_index` para monitorear el progreso de build del índice en tablas grandes. Para synchronous replication, la creación de índices en el primary bloquea hasta que la replica confirma — usa asynchronous replication para ventanas de mantenimiento de índices.

### ¿Cómo uso índices para queries GROUP BY y aggregates?

Las queries `GROUP BY` se benefician de índices que matchean las columnas de grouping. `CREATE INDEX idx_orders_status ON orders(status)` optimiza `SELECT status, COUNT(*) FROM orders GROUP BY status`. El planner usa un Index-Only Scan para contar rows por group sin sortear. Para `GROUP BY user_id, status`, crea un composite index: `CREATE INDEX idx_orders_user_status ON orders(user_id, status)`. Para aggregates como `MAX(created_at) WHERE user_id = 1`, el planner puede usar un backward index scan en `CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC)` para encontrar el máximo en O(1). Para queries `COUNT(*)`, PostgreSQL no usa índices para full table counts — escanea el heap. Usa counts aproximados con `pg_class.reltuples` o mantén una counter table para counts exactos. Para queries `DISTINCT`, `SELECT DISTINCT status FROM orders` usa un Index-Only Scan en `idx_orders_status` para retornar valores únicos sin sortear.

### ¿Cómo manejo índices para UUID primary keys?

Los UUIDs como primary keys tienen implicaciones para el rendimiento de índices. Los UUIDs random (v4) causan fragmentación del B-tree index porque los inserts se distribuyen randomamente across el índice, llevando a poor cache locality y page splits. Usa UUID v7 o ULID para UUIDs time-ordered — son sortables y se appendan al final del índice, reduciendo fragmentación. En PostgreSQL, usa la extensión `uuid-ossp`: `CREATE EXTENSION "uuid-ossp"; SELECT uuid_generate_v7()` (disponible en PostgreSQL 18+). Para versiones más viejas, usa `gen_random_uuid()` para v4 o implementa v7 en código de aplicación. Compara insert throughput: random UUIDs pueden ser 20-30% más lentos que sequential IDs en tablas high-volume. Monitorea fragmentación del índice con `pgstattuple`: `SELECT * FROM pgstattuple('idx_pkey')` — `free_percent` alto indica page splits. Considera usar `bigint` con `GENERATED ALWAYS AS IDENTITY` para tablas high-volume donde el insert performance es crítico. Si los UUIDs son requeridos para sistemas distribuidos, usa UUID v7 o combina un `bigint` sequence con un prefijo `tenant_id` para composite primary keys.

### ¿Cómo uso índices para queries de contención y existencia JSONB?

Las columnas JSONB de PostgreSQL soportan indexación especializada para operadores de contención (`@>`) y existencia (`?`, `?|`, `?&`). Crea un GIN index: `CREATE INDEX idx_data_gin ON events USING gin(data)`. Query con `WHERE data @> '{"type": "click"}'` para encontrar rows donde `data` contiene el key-value pair. El GIN index soporta operadores `@>`, `?`, `?|` y `?&`. Para JSONB path queries específicas, usa expression indexes: `CREATE INDEX idx_data_type ON events(((data->>'type')::text))` para `WHERE data->>'type' = 'click'`. Para contención de arrays JSONB, `WHERE data->'tags' ? 'urgent'` verifica si el array `tags` contiene `'urgent'` — GIN indexes esto eficientemente. Usa `jsonb_path_ops` para GIN indexes más pequeños que solo soportan `@>` pero son más compactos: `CREATE INDEX idx_data_path ON events USING gin(data jsonb_path_ops)`. Monitorea el rendimiento del GIN index con `EXPLAIN (ANALYZE)` — los GIN indexes pueden ser lentos de actualizar, así que considera `fastupdate = on` (default) que batchea inserciones en una pending list antes de mergear a la estructura principal del índice.

### ¿Cómo manejo index-only scans con PostgreSQL hint bits?

Los hint bits son la optimización de PostgreSQL para evitar checks de transaction status durante index-only scans. Cada tuple tiene hint bits que indican si la transacción que lo insertó hizo commit o abort. Cuando los hint bits están seteados, el visibility check es rápido — no need de consultar `pg_clog`/`pg_xact`. Sin embargo, en tablas recién vacuumed o después de bulk loads, los hint bits pueden no estar seteados aún, causando que los index-only scans hagan fallback a heap fetches para visibility checks. Ejecuta `VACUUM (ANALYZE)` después de bulk loads para setear hint bits: `VACUUM (ANALYZE, FREEZE) orders`. La opción `FREEZE` marca tuples como permanentemente visibles, eliminando future visibility checks. Monitorea la efectividad de hint bits con `EXPLAIN (ANALYZE, BUFFERS)` — si `Heap Fetches` es alto a pesar de un covering index, los hint bits pueden estar unset. Usa `pg_visibility_map()` para verificar el status del visibility map por página. Para tablas con updates frecuentes, setea `ALTER TABLE orders SET (autovacuum_freeze_min_age = 50000)` para freezear tuples más temprano, mejorando la confiabilidad del index-only scan.

### ¿Cómo monitoreo y alerto sobre la salud de índices en producción?

Setea queries de monitoreo para trackear métricas de salud de índices. Verifica unused indexes semanalmente: `SELECT schemaname, relname, indexrelname, idx_scan FROM pg_stat_user_indexes WHERE idx_scan = 0 AND indexrelname NOT LIKE '%_pkey' ORDER BY pg_relation_size(indexrelid) DESC`. Alerta cuando el bloat del índice excede 30%: usa `pgstattuple` para medir `SELECT * FROM pgstattuple('idx_name')` y compara `free_percent`. Monitorea el index cache hit ratio: `SELECT indexname, idx_blks_hit::float / NULLIF(idx_blks_hit + idx_blks_read, 0) FROM pg_statio_user_indexes WHERE idx_blks_read > 0`. Setea alerts en Prometheus con `postgres_exporter` — trackea `pg_stat_user_indexes_idx_scan` para tendencias de uso. Para crecimiento de tamaño de índices, query `SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid)) FROM pg_indexes ORDER BY pg_relation_size(indexrelid) DESC LIMIT 20`. Programa jobs semanales de `REINDEX` para índices con alto bloat usando `pg_cron`: `SELECT cron.schedule('reindex_weekly', '0 3 * * 0', 'REINDEX INDEX CONCURRENTLY idx_name')`. Documenta baselines de salud de índices después de cada deployment para detectar regresiones.

### ¿Cómo manejo índices para queries geospatiales con PostGIS?

PostGIS provee GiST indexes para columnas geospatiales. Crea un GiST index en columnas geometry: `CREATE INDEX idx_locations_geom ON locations USING gist(geom)`. Query con `WHERE ST_DWithin(geom, ST_MakePoint(-73.9, 40.7)::geography, 1000)` para encontrar puntos dentro de 1km — el GiST index usa bounding box filtering para selección rápida de candidatos. Para nearest-neighbor queries, usa el operador `<->`: `SELECT * FROM locations ORDER BY geom <-> ST_MakePoint(-73.9, 40.7) LIMIT 10`. El GiST index soporta KNN searches eficientemente. Para columnas geography, cast a geography para cálculos de distancia: `CREATE INDEX idx_locations_geog ON locations USING gist(geog)`. Usa `ST_DWithin` para radius queries y `<->` para nearest-neighbor. Para datasets grandes, clusterea la tabla por el GiST index: `CLUSTER locations USING idx_locations_geom` para mejorar spatial locality. Monitorea la efectividad del índice con `EXPLAIN (ANALYZE)` — busca `Index Scan using idx_locations_geom` con `Rows Removed by Filter` bajo.

### ¿Cómo uso índices para exclusion constraints?

Los exclusion constraints previenen overlapping ranges en una tabla — útil para sistemas de reservas, scheduling y version ranges. Crea un exclusion constraint: `ALTER TABLE bookings ADD EXCLUDE USING gist (room_id WITH =, time_range WITH &&)`. Esto previene dos reservas para la misma sala con time ranges overlapping. El constraint usa un GiST index internamente — `CREATE EXTENSION btree_gist` es requerido para combinar scalar types (`room_id WITH =`) con range types (`time_range WITH &&`). Para columnas daterange: `ALTER TABLE pricing ADD EXCLUDE USING gist (product_id WITH =, valid_period WITH &&)`. Testea violaciones del constraint: `INSERT INTO bookings (room_id, time_range) VALUES (1, daterange('2025-01-10', '2025-01-15'))` — si existe una reserva conflictiva, PostgreSQL levanta `ERROR: conflicting key value violates exclusion constraint`. Monitorea el uso del índice del exclusion constraint con `pg_stat_user_indexes`. Para tablas grandes, asegura que el GiST index se mantenga con `VACUUM` regular para prevenir bloat de range updates.

### ¿Cómo manejo dependencias de índices y remoción segura?

Antes de dropar un índice, verifica las dependencias. PostgreSQL trackea el uso de índices en `pg_depend` — constraints y unique indexes tienen dependencias implícitas. Query: `SELECT conname, contype FROM pg_constraint WHERE conindid = 'idx_name'::regclass`. Si el índice respalda un unique o primary key constraint, drop el constraint en su lugar: `ALTER TABLE orders DROP CONSTRAINT orders_pkey`. Para foreign keys que referencian el índice, verifica: `SELECT conname FROM pg_constraint WHERE confrelid = 'orders'::regclass`. Verifica queries activas que usan el índice: `SELECT * FROM pg_stat_activity WHERE query LIKE '%orders%'`. Dropa índices durante ventanas de bajo tráfico: `DROP INDEX CONCURRENTLY idx_name` evita bloquear writes. Después de dropar, monitorea el rendimiento de queries por 24-48 horas — si las queries degradan, recrea el índice. Usa `pg_stat_statements` para comparar latencia de queries antes y después: `SELECT query, mean_exec_time, calls FROM pg_stat_statements WHERE query LIKE '%orders%' ORDER BY mean_exec_time DESC`.

### ¿Cómo uso índices para full-text search con tsvector?

PostgreSQL full-text search usa tipos `tsvector` y `tsquery` con GIN o GiST indexes. Crea una columna `tsvector`: `ALTER TABLE articles ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || body)) STORED`. Crea un GIN index: `CREATE INDEX idx_articles_search ON articles USING gin(search_vector)`. Query con: `SELECT * FROM articles WHERE search_vector @@ to_tsquery('english', 'postgres & index')`. Los GIN indexes son más rápidos para reads pero más lentos de actualizar. Los GiST indexes son más rápidos de actualizar pero menos precisos — pueden retornar false positives que necesitan re-check. Para ranking, usa `ts_rank`: `SELECT title, ts_rank(search_vector, query) AS rank FROM articles, to_tsquery('postgres & index') query WHERE search_vector @@ query ORDER BY rank DESC`. Para contenido multi-idioma, usa diferentes configuraciones: `to_tsvector('spanish', body)` con un GIN index separado. Usa `websearch_to_tsquery` para input en lenguaje natural: `WHERE search_vector @@ websearch_to_tsquery('english', 'postgres index performance')`.

### ¿Cómo manejo automatización de mantenimiento de índices?

Automatiza el mantenimiento de índices con jobs programados. Usa `pg_cron` para PostgreSQL: `CREATE EXTENSION pg_cron; SELECT cron.schedule('vacuum_analyze_weekly', '0 2 * * 0', 'VACUUM (ANALYZE) orders')`. Programa `REINDEX CONCURRENTLY` para índices con alto bloat mensualmente: `SELECT cron.schedule('reindex_monthly', '0 3 1 * *', 'REINDEX INDEX CONCURRENTLY idx_orders_user_id')`. Usa `pg_repack` para rebuilds online de índices sin locks: `pg_repack -t orders -i idx_orders_user_id -h localhost -U postgres`. Monitorea la ejecución de jobs en `cron.job_run_details`. Setea alerts para jobs fallidos. Para MySQL, usa `pt-index-usage` (Percona Toolkit) para identificar unused indexes: `pt-index-usage /var/log/mysql/slow.log --host=localhost`. Automatiza la detección de unused indexes con una query de reporte semanal guardada como view.

### ¿Cómo manejo índices para columnas enum y boolean?

Las columnas enum y boolean tienen cardinalidad baja, haciendo los B-tree indexes menos efectivos. Para columnas boolean (`is_active`, `is_deleted`), usa partial indexes: `CREATE INDEX idx_active_users ON users(id) WHERE is_active = true`. Esto indexa solo las rows activas, manteniendo el índice pequeño. Para columnas enum con distribuciones skewed, partial indexes en los valores más comunes: `CREATE INDEX idx_pending_orders ON orders(user_id) WHERE status = 'pending'`. Si el enum tiene distribución balanceada across 3-5 valores, un B-tree index regular puede bastar. Monitorea selectivity: `SELECT status, COUNT(*) FROM orders GROUP BY status` — si un valor domina (>80%), un partial index en los valores minoritarios es más eficiente. Para enum types de PostgreSQL, el índice almacena el internal sort order del enum, así que range queries en enums funcionan naturalmente. Para MySQL, las columnas enum se almacenan como integers internamente — los B-tree indexes en enums se comportan como integer indexes. Usa `SHOW INDEX FROM table_name` para verificar la cardinalidad del enum index en MySQL.

## Ver También

- [Patrones de Batch Processing](/recipes/performance/batch-processing-patterns) — optimización de operaciones bulk de datos
- [Rendimiento Web](/recipes/performance/web-performance) — técnicas de rendimiento frontend y backend
- [Load Testing](/recipes/performance/load-testing) — validación del rendimiento de bases de datos bajo carga
