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
  - databases
relatedResources:
  - /recipes/databases/acid-transactions-postgres
  - /recipes/databases/redis-cache-patterns
  - /patterns/design/repository-pattern
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Optimiza queries PostgreSQL con EXPLAIN, estrategias de indexing, partial indexes y reescritura de queries para reducir tiempo de ejecucion de segundos a milisegundos."
  keywords:
    - postgresql optimization
    - query performance
    - indexing strategies
    - explain analyze
    - database tuning
---

# Optimizacion de Queries e Indexing en PostgreSQL

Identifica y corrige queries lentas en PostgreSQL usando analisis de planes de ejecucion, indexing estrategico y reestructuracion de queries. Esta recipe cubre EXPLAIN ANALYZE, indexes B-tree y partial, covering indexes y anti-patterns comunes que degradan rendimiento.

## Cuando Usar Esto

- Las queries tardan mas de 100ms y se ejecutan frecuentemente
- Aparecen sequential scans en planes de queries donde deberian usarse index scans
- CPU o I/O de la base de datos estan saturados bajo carga normal

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

- Corre `ANALYZE` despues de bulk loads o cambios significativos de datos para actualizar estadisticas
- Usa `pg_stat_statements` para identificar las queries mas lentas por tiempo total
- Monitorea bloat de indexes con `pgstattuple` y rebuild con `REINDEX`

## Errores Comunes

- Agregar indexes en cada columna sin considerar patrones de query
- Usar `SELECT *` cuando solo se necesitan pocas columnas
- No actualizar estadisticas de tabla despues de migraciones grandes de datos

## FAQ

**P: Cuantos indexes son demasiados?**
R: Mas de 5-7 indexes por tabla ralentiza writes. Cada index agrega overhead a INSERT, UPDATE y DELETE.

**P: Cuando deberia usar BRIN en lugar de B-tree?**
R: Los BRIN indexes son ideales para tablas muy grandes y naturalmente ordenadas (time-series, datos de log) donde un B-tree completo seria demasiado grande.
