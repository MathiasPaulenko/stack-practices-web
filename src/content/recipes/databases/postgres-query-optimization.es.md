---





contentType: recipes
slug: postgres-query-optimization
title: "Optimizacion de Queries e Indexing en PostgreSQL"
description: "Analiza y optimiza queries lentas en PostgreSQL usando EXPLAIN, indexing apropiado, partial indexes y reescritura de queries para reducir tiempo de ejecucion"
metaDescription: "Optimiza queries PostgreSQL con EXPLAIN, estrategias de indexing, partial indexes y reescritura de queries para reducir tiempo de ejecucion de segundos a milisegundos."
difficulty: intermediate
topics:
  - databases
  - performance
tags:
  - postgres
  - sql
  - performance
  - database
  - postgresql
relatedResources:
  - /recipes/acid-transactions-postgres
  - /recipes/redis-cache-patterns
  - /patterns/repository-pattern
  - /recipes/uuid-generation-strategies
  - /recipes/database-connection-pooling
  - /recipes/database-replication
  - /recipes/deadlock-prevention-sql
  - /recipes/schema-evolution
  - /recipes/sql-index-optimization-analysis
  - /recipes/sql-partitioning-strategies
  - /recipes/graphql-n-1-query-detection
lastUpdated: "2026-06-18"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Optimiza queries PostgreSQL con EXPLAIN, estrategias de indexing, partial indexes y reescritura de queries para reducir tiempo de ejecucion de segundos a milisegundos."
  keywords:
    - postgresql optimization
    - query performance
    - indexing strategies
    - explain analyze
    - database tuning





---

Identifica y corrige queries lentas en PostgreSQL usando analisis de planes de ejecucion, indexing estrategico y reestructuracion de queries. Esta recipe cubre EXPLAIN ANALYZE, indexes B-tree y partial, covering indexes y anti-patterns comunes que degradan rendimiento.

## Cuando Usar Esto

- Las queries tardan mas de 100ms y se ejecutan frecuentemente. Consulta [Database Views](/recipes/databases/database-views-materialized) para resultados precomputados.
- Aparecen sequential scans en planes de queries donde deberian usarse index scans. Consulta [SQL Joins](/recipes/databases/sql-joins) para optimización de joins.
- CPU o I/O de la base de datos estan saturados bajo carga normal. Consulta [Redis Caching](/recipes/databases/redis-cache-patterns) para reducir carga.

## Solucion

### 1. Analizar Planes con EXPLAIN

```sql
-- Plan basico
EXPLAIN ANALYZE
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.name
ORDER BY order_count DESC
LIMIT 10;
```

Busca:
- `Seq Scan` en tablas grandes → falta index
- `Hash Join` con alto uso de memoria → considerar nested loop con index
- `Sort` con alto costo → agregar index en columnas de sort

### 2. Crear Indexes Estrategicos

```sql
-- Index compuesto para queries de rango + igualdad
CREATE INDEX idx_orders_user_created
ON orders(user_id, created_at);

-- Index partial para registros activos solamente
CREATE INDEX idx_orders_pending
ON orders(created_at)
WHERE status = 'pending';

-- Covering index para evitar heap lookups
CREATE INDEX idx_orders_covering
ON orders(user_id, status, total)
INCLUDE (created_at);
```

### 3. Reescribir Queries para Usar Indexes

```sql
-- Antes: funcion en columna previene uso de index
SELECT * FROM orders WHERE EXTRACT(YEAR FROM created_at) = 2024;

-- Despues: condicion de rango permite index scan
SELECT * FROM orders
WHERE created_at >= '2024-01-01'
  AND created_at < '2025-01-01';
```

### 4. Optimizar Joins

```sql
-- Antes: cross join implicito
SELECT * FROM users, orders WHERE users.id = orders.user_id;

-- Despues: JOIN explicito con condiciones apropiadas
SELECT u.name, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'
  AND o.created_at > NOW() - INTERVAL '30 days';
```

### 5. Particionar Tablas Grandes

```sql
-- Particion por rango por mes
CREATE TABLE events (
  id BIGSERIAL,
  event_type VARCHAR(50),
  created_at TIMESTAMP NOT NULL,
  payload JSONB
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2024_01 PARTITION OF events
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE events_2024_02 PARTITION OF events
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

## Como Funciona

- **EXPLAIN ANALYZE** muestra el plan de ejecucion actual y tiempos
- **B-tree indexes** aceleran lookups de igualdad y rango
- **Partial indexes** son mas pequenos y rapidos para subconjuntos filtrados
- **Covering indexes** incluyen todas las columnas necesarias, evitando acceso al heap
- **Partitioning** prunea datos irrelevantes, reduciendo el scope del scan

## Variacion: Encontrar Indexes Faltantes

```sql
-- Identificar tablas frecuentemente scaneadas
SELECT
  schemaname,
  tablename,
  seq_scan,
  idx_scan,
  seq_tup_read,
  idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > 1000
  AND idx_scan < seq_scan * 0.1
ORDER BY seq_scan DESC
LIMIT 20;
```

## Consideraciones de Produccion

- Corre `ANALYZE` despues de bulk loads o cambios importantes de datos para actualizar estadisticas
- Usa `pg_stat_statements` para identificar las queries mas lentas por tiempo total. Consulta [Logging](/recipes/api/logging) para observabilidad de queries.
- Monitorea bloat de indexes con `pgstattuple` y rebuild con `REINDEX`

## Errores Comunes

- Agregar indexes en cada columna sin considerar patrones de query
- Usar `SELECT *` cuando solo se necesitan pocas columnas
- No actualizar estadisticas de tabla despues de migraciones grandes de datos. Consulta [Database Migrations](/recipes/databases/database-migrations) para cambios de schema seguros.

## FAQ

**P: Cuantos indexes son demasiados?**
R: Mas de 5-7 indexes por tabla ralentiza writes. Cada index agrega overhead a INSERT, UPDATE y DELETE.

**P: Cuando deberia usar BRIN en lugar de B-tree?**
R: Los BRIN indexes son ideales para tablas muy grandes y naturalmente ordenadas (time-series, datos de log) donde un B-tree completo seria demasiado grande.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### BRIN Indexes para tablas time-series grandes

```sql
-- BRIN es 1000x más pequeño que B-tree para datos naturalmente ordenados
CREATE INDEX idx_events_created_brin
ON events USING BRIN (created_at)
WITH (pages_per_range = 32);
```

BRIN (Block Range Index) almacena información resumida para bloques de páginas. Ideal para tablas time-series o de log donde los datos están naturalmente ordenados por tiempo de inserción. Un BRIN index en 1TB de datos podría ser 10MB vs 10GB para un B-tree.

### GIN Indexes para JSONB y búsqueda full-text

```sql
-- Queries de contención JSONB
CREATE INDEX idx_events_payload ON events USING GIN (payload);

-- Query JSONB eficientemente
SELECT * FROM events WHERE payload @> '{"event_type": "click"}';

-- Búsqueda full-text
CREATE INDEX idx_articles_search ON articles USING GIN (to_tsvector('english', body));

SELECT * FROM articles
WHERE to_tsvector('english', body) @@ to_tsquery('postgres & optimization');
```

### Usar `pg_stat_statements` para encontrar queries lentas

```sql
-- Habilitar la extensión
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 queries por tiempo total de ejecución
SELECT
    query,
    calls,
    mean_exec_time,
    total_exec_time,
    rows,
    100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Resetear estadísticas después de cambios
SELECT pg_stat_statements_reset();
```

### Estrategia de VACUUM y ANALYZE

```sql
-- Analyze después de bulk loads para actualizar estadísticas del planner
ANALYZE users;

-- Vacuum para reclamar espacio de dead tuples
VACUUM (VERBOSE, ANALYZE) users;

-- Vacuum full reclama espacio al SO pero bloquea la tabla
-- Usa pg_repack en su lugar para reorganización online
VACUUM FULL users;

-- Verificar bloat de tabla
SELECT
    schemaname,
    tablename,
    n_live_tup,
    n_dead_tup,
    last_vacuum,
    last_autovacuum,
    autovacuum_count
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC;
```

### Index-only scans y visibility maps

```sql
-- Un covering index habilita index-only scans
CREATE INDEX idx_orders_user_status_total
ON orders (user_id, status)
INCLUDE (total);

-- La query siguiente puede servirse enteramente desde el index
SELECT user_id, status, total
FROM orders
WHERE user_id = 42 AND status = 'completed';

-- Verificar si el visibility map permite index-only scans
-- VACUUM actualiza el visibility map
VACUUM (VERBOSE) orders;
```

### Tuning a nivel conexión

```sql
-- Configurar work_mem por sesión para sorts grandes
SET work_mem = '256MB';

-- Configurar maintenance_work_mem para VACUUM y CREATE INDEX
SET maintenance_work_mem = '1GB';

-- Limitar tiempo de ejecución de queries
SET statement_timeout = '30s';

-- Limitar tiempo de espera de locks
SET lock_timeout = '5s';
```

## Buenas prácticas adicionales

6. **Usa `EXPLAIN (ANALYZE, BUFFERS)` para stats de I/O detalladas.** La opción `BUFFERS` muestra cuántos bloques fueron hit desde caché vs leídos desde disco:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE user_id = 42;
```

7. **Elimina indexes sin uso.** Los indexes ralentizan writes. Identifica y elimina indexes con cero scans:

```sql
SELECT
    schemaname,
    relname,
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

8. **Usa `CLUSTER` para ordenar físicamente los datos.** Para tablas frecuentemente consultadas por una columna específica, clustering mejora la localidad de caché:

```sql
CLUSTER orders USING idx_orders_user_id;
```

9. **Configura `effective_cache_size`.** Dile al planner cuánta memoria tiene el caché del SO. Esto afecta si el planner elige index scans vs seq scans:

```sql
ALTER SYSTEM SET effective_cache_size = '4GB';
```

10. **Usa `pg_prewarm` para cachear tablas críticas.** Pre-carga tablas frecuentemente accedidas en shared buffers después de reinicios:

```sql
CREATE EXTENSION IF NOT EXISTS pg_prewarm;
SELECT pg_prewarm('users');
SELECT pg_prewarm('orders', 'main', 'read');
```



## Tips de Rendimiento

1. **Usa `pg_stat_statements.track = all` para capturar queries anidadas.** Esto rastrea queries dentro de funciones y triggers, no solo queries top-level.

2. **Monitorea el buffer hit ratio.** Un ratio below 90% significa que la base de datos lee desde disco demasiado. Aumenta `shared_buffers` o añade RAM:

```sql
SELECT
    sum(blks_hit) AS hits,
    sum(blks_read) AS reads,
    100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0) AS hit_ratio
FROM pg_stat_database;
```

3. **Usa `pgbench` para load testing.** Benchmark cambios antes de desplegar:

```bash
pgbench -i -s 10 mydb  # Inicializar con scale factor 10
pgbench -c 20 -j 4 -T 60 mydb  # 20 clientes, 4 threads, 60 segundos
```

4. **Verifica bloat de indexes regularmente.** Usa `pgstattuple` para medir bloat:

```sql
CREATE EXTENSION IF NOT EXISTS pgstattuple;
SELECT * FROM pgstattuple('orders');
```

5. **Usa tuning de `parallel_setup_cost` y `parallel_tuple_cost`.** Para workloads analíticos, baja estos para favorecer planes de query paralelos:

```sql
SET parallel_setup_cost = 100;
SET parallel_tuple_cost = 0.03;
SET max_parallel_workers_per_gather = 4;
```
