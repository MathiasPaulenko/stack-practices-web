---
contentType: guides
slug: complete-guide-postgresql-tuning
title: "Guía Completa de PostgreSQL Tuning"
description: "Optimiza PostgreSQL para alto throughput. Cubre tuning de configuración, estrategias de indexación, optimización de queries, connection pooling, particionado y vacuum."
metaDescription: "Guía completa de PostgreSQL tuning. Optimiza config, indexación, query plans, connection pooling, particionado y vacuum para workloads de alto throughput."
difficulty: advanced
topics:
  - databases
  - performance
tags:
  - postgresql
  - database-tuning
  - indexing
  - performance
  - partitioning
  - connection-pooling
  - guide
  - databases
relatedResources:
  - /guides/databases/database-indexing-guide
  - /guides/performance/sql-query-optimization-guide
  - /guides/data/data-migration-guide
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Guía completa de PostgreSQL tuning. Optimiza config, indexación, query plans, connection pooling, particionado y vacuum para workloads de alto throughput."
  keywords:
    - postgresql tuning
    - postgresql performance
    - postgresql indexing
    - postgresql configuration
    - query optimization
    - connection pooling
    - postgresql partitioning
    - vacuum postgresql
---

# Guía Completa de PostgreSQL Tuning

## Introducción

PostgreSQL es poderoso pero los settings default son conservadores — diseñados para correr en una máquina con 256MB de RAM. Workloads de producción necesitan configuración tuneada, indexes apropiados, queries optimizadas y particionado estratégico de datos. Esta guía cubre tuning de configuración, estrategias de indexación, optimización de queries, connection pooling, particionado y vacuum management.

## Tuning de Configuración

### Settings de memoria

```ini
# postgresql.conf

# Shared buffers — 25% de RAM total
shared_buffers = 2GB

# Effective cache size — 75% de RAM total (hint al planner)
effective_cache_size = 6GB

# Work mem — memoria por sort/hash (total = work_mem * max_connections * sorts)
work_mem = 64MB

# Maintenance work mem — para VACUUM, CREATE INDEX, ALTER TABLE
maintenance_work_mem = 512MB

# WAL buffers — 1/32 de shared_buffers, min 64KB
wal_buffers = 16MB
```

### Tuning de checkpoint

```ini
# Aumentar checkpoint timeout para menos I/O spikes
checkpoint_timeout = 15min
max_wal_size = 4GB
min_wal_size = 1GB
checkpoint_completion_target = 0.9

# WAL level para replicación
wal_level = replica
```

### Queries paralelas

```ini
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4
parallel_setup_cost = 100
parallel_tuple_cost = 0.1
```

### Tuning de autovacuum

```ini
autovacuum = on
autovacuum_max_workers = 6
autovacuum_naptime = 30s
autovacuum_vacuum_threshold = 50
autovacuum_vacuum_scale_factor = 0.05
autovacuum_analyze_threshold = 50
autovacuum_analyze_scale_factor = 0.02
```

## Estrategias de Indexación

### B-tree (default)

```sql
-- Index de columna única
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- Index compuesto (el orden de columnas importa — más selectivo primero)
CREATE INDEX idx_orders_status_created ON orders(status, created_at);

-- Partial index — indexar solo rows relevantes
CREATE INDEX idx_orders_pending ON orders(customer_id)
    WHERE status = 'pending';
```

### Covering index (INCLUDE)

```sql
-- El index incluye columnas extra para evitar heap lookups
CREATE INDEX idx_orders_covering ON orders(customer_id, status)
    INCLUDE (total, created_at);

-- Ahora esta query es index-only:
SELECT total, created_at FROM orders
    WHERE customer_id = 42 AND status = 'pending';
```

### Expression index

```sql
-- Index sobre el resultado de una función
CREATE INDEX idx_orders_lower_email ON orders(LOWER(email));

-- La query debe matchear la expresión exactamente
SELECT * FROM orders WHERE LOWER(email) = 'alice@example.com';
```

### GIN index (para JSONB y arrays)

```sql
-- Queries de containment en JSONB
CREATE INDEX idx_events_data ON events USING GIN (data);

-- Containment de arrays
CREATE INDEX idx_tags ON articles USING GIN (tags);

-- Full-text search
CREATE INDEX idx_articles_search ON articles USING GIN (to_tsvector('english', body));
```

### BRIN index (para tablas grandes ordenadas)

```sql
-- Block Range INdex — tamaño tiny, genial para time-series
CREATE INDEX idx_logs_brin ON logs USING BRIN (created_at);
```

### Cuándo NO indexar

- Tablas pequeñas (menos de ~1000 rows) — sequential scan es más rápido
- Columnas raramente usadas en WHERE clauses
- Columnas de alta escritura, baja lectura — cada index ralentiza writes
- Columnas de baja cardinalidad (boolean, gender) — usar partial index en su lugar

## Optimización de Queries

### EXPLAIN ANALYZE

```sql
-- Siempre chequear el query plan
EXPLAIN (ANALYZE, BUFFERS) 
SELECT o.id, o.total, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'pending'
ORDER BY o.created_at DESC
LIMIT 20;

-- Buscar:
-- Seq Scan en tablas grandes → index faltante
-- Hash Join con rows enormes → index faltante en join column
-- Sort con costo alto → index faltante en columna ORDER BY
-- Nested Loop con rows enormes → index faltante en inner table
```

### Anti-patrones comunes de queries

```sql
-- MAL: OR previene uso de index
SELECT * FROM orders WHERE customer_id = 1 OR status = 'pending';
-- BIEN: UNION ALL con indexes
SELECT * FROM orders WHERE customer_id = 1
UNION ALL
SELECT * FROM orders WHERE status = 'pending' AND customer_id != 1;

-- MAL: Wildcard inicial previene uso de index
SELECT * FROM customers WHERE name LIKE '%alice%';
-- BIEN: Usar trigram index (extensión pg_trgm)
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_customers_name_trgm ON customers USING GIN (name gin_trgm_ops);
SELECT * FROM customers WHERE name ILIKE '%alice%';

-- MAL: Función en columna indexada previene uso de index
SELECT * FROM orders WHERE EXTRACT(YEAR FROM created_at) = 2024;
-- BIEN: Range query usa index
SELECT * FROM orders 
    WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';

-- MAL: SELECT * trae columnas innecesarias
SELECT * FROM orders WHERE customer_id = 42;
-- BIEN: Seleccionar solo columnas necesarias
SELECT id, total, status FROM orders WHERE customer_id = 42;
```

## Connection Pooling

### PgBouncer

```ini
# pgbouncer.ini
[databases]
mydb = host=127.0.0.1 port=5432 dbname=mydb

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3
server_idle_timeout = 300
```

### Comparación de pool mode

| Mode | Descripción | Mejor Para |
|------|-------------|----------|
| session | Un server por client | Conexiones long-lived, prepared statements |
| transaction | Server por transacción | La mayoría de apps — mejor utilización |
| statement | Server por statement | Queries simples, sin transacciones |

## Particionado

### Range partitioning (time-series)

```sql
CREATE TABLE events (
    id BIGSERIAL,
    created_at TIMESTAMPTZ NOT NULL,
    data JSONB
) PARTITION BY RANGE (created_at);

-- Particiones mensuales
CREATE TABLE events_2024_01 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE events_2024_02 PARTITION OF events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Partición default para datos fuera de rango
CREATE TABLE events_default PARTITION OF events DEFAULT;

-- Creación automática con pg_partman
CREATE EXTENSION pg_partman;
SELECT partman.create_parent('public.events', 'created_at', 'native', 'monthly');
```

### List partitioning (por categoría)

```sql
CREATE TABLE orders_by_region (
    id BIGSERIAL,
    region TEXT NOT NULL,
    total NUMERIC
) PARTITION BY LIST (region);

CREATE TABLE orders_us PARTITION OF orders_by_region
    FOR VALUES IN ('US');
CREATE TABLE orders_eu PARTITION OF orders_by_region
    FOR VALUES IN ('EU', 'UK');
CREATE TABLE orders_other PARTITION OF orders_by_region DEFAULT;
```

### Hash partitioning (distribución uniforme)

```sql
CREATE TABLE users_hashed (
    id BIGSERIAL,
    email TEXT,
    data JSONB
) PARTITION BY HASH (id);

CREATE TABLE users_hash_0 PARTITION OF users_hashed
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE users_hash_1 PARTITION OF users_hashed
    FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE users_hash_2 PARTITION OF users_hashed
    FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE users_hash_3 PARTITION OF users_hashed
    FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

## Vacuum Management

```sql
-- Chequear bloat de tabla
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size,
    n_live_tup,
    n_dead_tup,
    ROUND(n_dead_tup::FLOAT / NULLIF(n_live_tup, 0) * 100, 2) AS dead_pct
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 20;

-- Vacuum manual con analysis
VACUUM (ANALYZE, VERBOSE) orders;

-- Full vacuum — reclama espacio al OS pero lockea la tabla
VACUUM FULL orders;

-- Chequear progreso de autovacuum
SELECT pid, phase, heap_blks_total, heap_blks_scanned
FROM pg_stat_progress_vacuum;
```

## Monitoreo

```sql
-- Slow queries (requiere log_min_duration_statement en postgresql.conf)
-- Setear: log_min_duration_statement = 100  -- loguear queries > 100ms

-- Queries activas
SELECT pid, now() - query_start AS duration, query, state
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

-- Stats de uso de index
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC
LIMIT 20;

-- Table cache hit ratio
SELECT
    relname,
    heap_blks_read,
    heap_blks_hit,
    ROUND(heap_blks_hit::FLOAT / NULLIF(heap_blks_hit + heap_blks_read, 0) * 100, 2) AS hit_ratio
FROM pg_statio_user_tables
ORDER BY hit_ratio ASC
LIMIT 20;

-- Cache hit ratio a nivel database
SELECT
    datname,
    blks_read,
    blks_hit,
    ROUND(blks_hit::FLOAT / NULLIF(blks_hit + blks_read, 0) * 100, 2) AS cache_hit_ratio
FROM pg_stat_database;
```

## Pautas

- **Setear `shared_buffers` a 25% de RAM** — el setting más impactante
- **Crear indexes antes de cargar datos** — o usar `CREATE INDEX CONCURRENTLY` en tablas live
- **Usar `ANALYZE` después de bulk loads** — el planner necesita estadísticas frescas
- **Usar connection pooling** — PostgreSQL maneja ~100 conexiones eficientemente, no 1000
- **Monitorear cache hit ratio** — apuntar a > 95%; si es menor, añadir RAM u optimizar queries
- **Particionar tablas grandes** — tablas de más de 10M rows se benefician del particionado
- **Usar `pg_stat_statements`** — trackear performance de queries a lo largo del tiempo
- **Tunear autovacuum por tabla** — tablas busy necesitan vacuuming más agresivo
- **Usar `EXPLAIN (ANALYZE, BUFFERS)`** — nunca adivinar qué está haciendo el planner
- **Evitar `SELECT *`** — fetchear solo columnas necesarias para usar index-only scans
- **Usar `LIMIT` con `ORDER BY`** — pairar con un index para resultados instantáneos

## Errores Comunes

- Dejar config default en producción — `shared_buffers` de 128MB es muy bajo
- Over-indexar — cada index ralentiza writes; remover indexes no usados
- No correr `ANALYZE` después de bulk loads — el planner usa estadísticas stale
- Usar `VACUUM FULL` durante horas pico — lockea la tabla
- No usar connection pooling — 500+ conexiones causan overhead de context-switch
- Indexar columnas de baja cardinalidad — un index boolean es casi inútil
- No monitorear slow queries — no puedes optimizar lo que no puedes ver
- Ignorar bloat — dead tuples se acumulan y ralentizan sequential scans
- Usar `SELECT *` con tablas grandes — trae data innecesaria, previene index-only scans
- No testear cambios de config — siempre benchmarkear antes y después

## Preguntas Frecuentes

### ¿Cuánta RAM debo asignar a PostgreSQL?

Asignar 25% de RAM total a `shared_buffers` y setear `effective_cache_size` a 75% de RAM total. El 50% restante es para OS page cache y work_mem por conexión. Para un servidor de 16GB: `shared_buffers = 4GB`, `effective_cache_size = 12GB`, `work_mem = 64MB`.

### ¿Cuándo debo usar particionado vs indexación?

Usar indexación cuando las queries filtran en columnas específicas y retornan un subset pequeño de rows. Usar particionado cuando las tablas exceden 10M rows y las queries filtran en una partition key (usualmente una fecha). El particionado reduce el tamaño del scan y habilita partition pruning, mientras que los indexes aceleran point lookups. Son complementarios, no excluyentes.

### ¿Cómo encuentro indexes no usados?

```sql
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_total_relation_size(schemaname || '.' || indexname) DESC;
```

Indexes con `idx_scan = 0` desde el último reset de stats son candidatos para remoción. Usar `DROP INDEX CONCURRENTLY` para evitar locking.
