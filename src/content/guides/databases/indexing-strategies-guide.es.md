---


contentType: guides
slug: indexing-strategies-guide
title: "Estrategias de Indexación — Desde B-Trees hasta BRIN"
description: "Guía práctica de índices de bases de datos: B-Trees, Hash, GIN, GiST, BRIN e índices parciales. Aprende cuándo usar cada uno y cómo evitar errores comunes de indexación."
metaDescription: "Aprende estrategias de indexación: B-Tree, Hash, GIN, GiST, BRIN, índices parciales y compuestos. Optimiza consultas y evita errores comunes de indexación."
difficulty: intermediate
topics:
  - databases
  - performance
tags:
  - indexacion-base-datos
  - b-tree
  - indice-hash
  - indice-gin
  - indice-compuesto
  - indice-parcial
  - optimizacion-consultas
  - guia
relatedResources:
  - /guides/database-normalization-guide
  - /guides/sql-joins-guide
  - /guides/database-replication-guide
  - /recipes/connect-to-postgresql
  - /recipes/connect-to-mysql
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Aprende estrategias de indexación: B-Tree, Hash, GIN, GiST, BRIN, índices parciales y compuestos. Optimiza consultas y evita errores comunes de indexación."
  keywords:
    - indexacion-base-datos
    - b-tree
    - indice-hash
    - indice-gin
    - indice-compuesto
    - optimizacion-consultas
    - guia


---

## Overview

Los índices son el mecanismo principal para acelerar consultas de bases de datos. Son estructuras de datos que permiten a la base de datos localizar filas sin escanear cada registro. Pero los índices no son gratis — consumen almacenamiento, ralentizan escrituras y pueden perjudicar el rendimiento si se usan incorrectamente. Entender los diferentes tipos de índice y cuándo aplicarlos es una de las habilidades de mayor valor en bases de datos.

## When to Use


- For alternatives, see [Complete Guide to SQL Query Optimization](/es/guides/complete-guide-sql-query-optimization/).

- Consultas filtrando en columnas específicas (WHERE, JOIN)
- Ordenar grandes conjuntos de resultados (ORDER BY)
- Aplicar restricciones de unicidad
- Acelerar búsqueda full-text y consultas geoespaciales

## Índices B-Tree

El tipo de índice por defecto en la mayoría de bases de datos relacionales. Los B-Trees mantienen datos ordenados que permiten búsquedas O(log n), scans de rango y recorrido ordenado.

```sql
CREATE INDEX idx_users_email ON users(email);

-- Usa índice: coincidencia exacta
SELECT * FROM users WHERE email = 'alice@example.com';

-- Usa índice: scan de rango
SELECT * FROM users WHERE email BETWEEN 'a' AND 'c';

-- Usa índice: ORDER BY
SELECT * FROM users ORDER BY email LIMIT 10;
```

### Índices B-Tree Compuestos

El orden de columnas importa. Un índice compuesto en `(a, b, c)` soporta consultas en `a`, `(a, b)` y `(a, b, c)`.

```sql
CREATE INDEX idx_orders_customer_date ON orders(customer_id, created_at);

-- Usa índice: coincide columna inicial
SELECT * FROM orders WHERE customer_id = 42;

-- Usa índice: coincide columnas iniciales
SELECT * FROM orders WHERE customer_id = 42 AND created_at > '2024-01-01';

-- NO usa índice: salta columna inicial
SELECT * FROM orders WHERE created_at > '2024-01-01';
```

## Índices Hash

Optimizados para comparaciones de igualdad únicamente. Más pequeños y rápidos que B-Trees para coincidencias exactas, pero no soportan consultas de rango ni ordenamiento.

```sql
CREATE INDEX idx_sessions_token ON sessions USING HASH(token);

-- Rápido: igualdad
SELECT * FROM sessions WHERE token = 'abc123';

-- No puede usar índice hash: rango
SELECT * FROM sessions WHERE token > 'abc';
```

## Índices GIN (Generalized Inverted Index)

Diseñados para columnas multi-valor y búsqueda full-text. Eficientes para arrays, JSONB y tsvector.

```sql
-- Contención de arrays
CREATE INDEX idx_products_tags ON products USING GIN(tags);
SELECT * FROM products WHERE tags @> ARRAY['electronics', 'wireless'];

-- Búsqueda JSONB
CREATE INDEX idx_events_data ON events USING GIN(data jsonb_path_ops);
SELECT * FROM events WHERE data @> '{"status": "error"}';

-- Full-text search (PostgreSQL)
CREATE INDEX idx_articles_search ON articles USING GIN(to_tsvector('english', content));
SELECT * FROM articles WHERE to_tsvector('english', content) @@ to_tsquery('database & indexing');
```

## Índices GiST (Generalized Search Tree)

Un framework para construir índices sobre tipos de datos complejos: geométricos, rangos y consultas de vecinos más cercanos.

```sql
-- Geoespacial (PostGIS)
CREATE INDEX idx_locations_geom ON locations USING GIST(geom);
SELECT * FROM locations WHERE ST_DWithin(geom, ST_Point(0,0)::geography, 1000);

-- Consultas de rango
CREATE INDEX idx_reservations_period ON reservations USING GIST(period);
SELECT * FROM reservations WHERE period && daterange('2024-01-01', '2024-01-10');
```

## Índices BRIN (Block Range Index)

Índices compactos para tablas muy grandes y naturalmente ordenadas. Almacenan min/max por bloque en lugar de por fila.

```sql
-- Datos de series temporales: logs, eventos, métricas
CREATE INDEX idx_logs_created ON logs USING BRIN(created_at);

-- Tamaño: ~1% de B-Tree, pero solo útil para datos ordenados
-- Mejor para: miles de millones de filas, series temporales, workloads append-only
```

## Índices Parciales

Indexa solo un subconjunto de filas, reduciendo tamaño y mejorando rendimiento de escritura.

```sql
-- Solo indexa usuarios activos (80% de consultas filtran por activo)
CREATE INDEX idx_users_active_email ON users(email) WHERE active = true;

-- Solo indexa órdenes impagas para reportes de aging
CREATE INDEX idx_orders_unpaid ON orders(created_at) WHERE status = 'unpaid';
```

## Índices de Cobertura (Index-Only Scans)

Incluye columnas adicionales para que la base de datos pueda responder consultas sin tocar el heap.

```sql
-- PostgreSQL: INCLUDE agrega columnas a la hoja del índice
CREATE INDEX idx_orders_customer_total ON orders(customer_id) INCLUDE(total, status);

-- La consulta usa solo el índice — sin acceso al heap
SELECT total, status FROM orders WHERE customer_id = 42;

-- MySQL: índice compuesto cubre naturalmente
CREATE INDEX idx_orders_customer_total ON orders(customer_id, total, status);
```

## Matriz de Selección de Índices

| Tipo de Índice | Mejor Para | Evitar Cuando |
|----------------|------------|---------------|
| B-Tree | Igualdad, rango, ordenamiento | Búsqueda de texto de alta cardinalidad |
| Hash | Coincidencia exacta en texto largo | Consultas de rango necesarias |
| GIN | Arrays, JSONB, full-text | Columnas escalares simples |
| GiST | Geoespacial, rangos | Lookups escalares estándar |
| BRIN | Grandes datasets ordenados | Patrones de acceso aleatorio |
| Parcial | Subconjuntos frecuentemente filtrados | Consultas escanean todas las filas |

## Errores Comunes

- **Indexar cada columna** — ralentiza escrituras drásticamente; los índices tienen costo de mantenimiento
- **Orden incorrecto de columnas en compuestos** — la columna inicial debe ser la más selectiva
- **Indexar columnas de baja cardinalidad** — género, flags booleanos; los índices bitmap manejan estos mejor
- **Ignorar índices parciales** — indexar 100% de filas cuando las consultas siempre filtran
- **No actualizar estadísticas** — estadísticas obsoletas llevan a malas elecciones de índice por el query planner

## Monitoreo de Uso de Índices

```sql
-- PostgreSQL: encuentra índices no usados
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelname NOT LIKE 'pg_toast%'
ORDER BY schemaname, tablename, indexname;

-- MySQL: uso de índices vía performance_schema
SELECT object_schema, object_name, index_name, count_read
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE index_name IS NOT NULL
ORDER BY count_read DESC;
```

## FAQ

**¿Cuántos índices es demasiado?**
No hay un número fijo, pero cada índice añade overhead de escritura. Audita índices no usados trimestralmente.

**¿Debería indexar foreign keys?**
Sí. El lado que referencia (lado "muchos") de una foreign key debería casi siempre estar indexado para rendimiento de JOIN.

**¿Los índices ralentizan INSERT?**
Sí. Cada índice en una tabla añade amplificación de escritura. Considera eliminar índices durante cargas masivas.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario: Optimizacion de Queries en E-commerce

```sql
-- Tabla: orders (50M filas, 500K/dia)
-- Problema: Queries de dashboard tardan 30+ segundos

-- Query 1: Ordenes por cliente en rango de fecha
-- Antes: seq scan, 12 segundos
EXPLAIN ANALYZE SELECT * FROM orders
WHERE customer_id = 42 AND created_at >= '2026-01-01';

-- Solucion: indice compuesto
CREATE INDEX idx_orders_customer_date ON orders(customer_id, created_at DESC);
-- Despues: index scan, 2ms

-- Query 2: Ordenes por estado y fecha (dashboard)
-- Antes: seq scan + sort, 28 segundos
EXPLAIN ANALYZE SELECT * FROM orders
WHERE status = 'pending' AND created_at >= '2026-01-01'
ORDER BY created_at DESC LIMIT 50;

-- Solucion: indice parcial compuesto
CREATE INDEX idx_orders_pending_date ON orders(created_at DESC)
WHERE status = 'pending';
-- Solo indexa ordenes pendientes (~5% de total)
-- Despues: index scan, 5ms

-- Query 3: Busqueda full-text en productos
-- Antes: ILIKE, 15 segundos
EXPLAIN ANALYZE SELECT * FROM products
WHERE name ILIKE '%laptop%' OR description ILIKE '%laptop%';

-- Solucion: GIN index con tsvector
CREATE INDEX idx_products_fts ON products
USING GIN(to_tsvector('spanish', name || ' ' || description));

SELECT * FROM products
WHERE to_tsvector('spanish', name || ' ' || description)
  @@ to_tsquery('spanish', 'laptop');
-- Despues: 50ms

-- Query 4: Conteo de ordenes por dia (reporte)
-- Antes: seq scan + aggregate, 45 segundos
EXPLAIN ANALYZE SELECT DATE(created_at), count(*)
FROM orders WHERE created_at >= '2026-01-01'
GROUP BY DATE(created_at) ORDER BY 1;

-- Solucion: BRIN index (datos ordenados por fecha)
CREATE INDEX idx_orders_created_brin ON orders USING BRIN(created_at);
-- Solo 1% del tamano de B-Tree
-- Despues: 8 segundos (aceptable para reportes)

-- Query 5: JSONB en metadata de ordenes
EXPLAIN ANALYZE SELECT * FROM orders
WHERE metadata @> '{"channel": "mobile"}';

CREATE INDEX idx_orders_metadata ON orders USING GIN(metadata jsonb_path_ops);
-- Despues: 15ms

-- Auditoria de indices no usados (trimestral):
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelname NOT LIKE 'pg_toast%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Resultado: 3 indices no usados de 2GB total -> DROP
-- Impacto: 15% menos de overhead en escrituras

Lecciones:
  - El orden de columnas en compuestos importa enormemente
  - Indices parciales reducen tamano y mejoran escrituras
  - BRIN es ideal para series temporales con billions de filas
  - GIN resuelve busqueda full-text y JSONB
  - Audita indices no usados trimestralmente
```

### Como decido entre B-Tree y BRIN?

Usa B-Tree para datos con acceso aleatorio y consultas de igualdad o rango. Usa BRIN para tablas muy grandes (billones de filas) donde los datos estan naturalmente ordenados (ej: series temporales, logs append-only). BRIN ocupa ~1% del tamano de un B-Tree pero solo es util cuando las consultas filtran por rango del campo ordenado.
