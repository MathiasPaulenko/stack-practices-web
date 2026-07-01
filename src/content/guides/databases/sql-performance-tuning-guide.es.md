---
contentType: guides
slug: sql-performance-tuning-guide
title: "Optimización de Rendimiento SQL"
description: "Una guía práctica para optimizar consultas SQL: estrategias de indexación, reescritura de queries, análisis de EXPLAIN plans y anti-patrones comunes a evitar."
metaDescription: "Guía de optimización SQL: estrategias de indexación, reescritura de queries, EXPLAIN plans y anti-patrones. Optimiza consultas lentas en PostgreSQL, MySQL y SQL Server."
difficulty: intermediate
topics:
  - databases
  - performance
tags:
  - base-de-datos
  - database
  - guia
  - indexacion
  - optimizacion-de-consultas
  - performance
  - rendimiento
  - sql
relatedResources:
  - /guides/databases/database-design-guide
  - /guides/performance/performance-optimization-guide
  - /recipes/pagination
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Guía de optimización SQL: estrategias de indexación, reescritura de queries, EXPLAIN plans y anti-patrones. Optimiza consultas lentas en PostgreSQL, MySQL y SQL Server."
  keywords:
    - optimizacion rendimiento sql
    - optimizacion de consultas
    - indexacion base de datos
    - explain plan
    - consulta lenta solucion
    - anti-patrones sql
---

# Optimización de Rendimiento SQL

## Introducción

Las consultas lentas son una de las causas más comunes de problemas de rendimiento en aplicaciones. Esta guía cubre técnicas prácticas para identificar, diagnosticar y corregir problemas de rendimiento SQL en PostgreSQL, MySQL y SQL Server.

## Encontrando Consultas Lentas

### PostgreSQL

```sql
-- Extensión pg_stat_statements
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Consultas lentas activas
SELECT pid, query, now() - query_start AS duration
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '1 second'
ORDER BY duration DESC;
```

### MySQL

```sql
-- Slow query log (habilitar en my.cnf)
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;

-- Performance Schema
SELECT sql_text, COUNT_STAR, AVG_TIMER_WAIT/1000000000 AS avg_sec
FROM performance_schema.events_statements_summary_by_digest
ORDER BY AVG_TIMER_WAIT DESC
LIMIT 10;
```

## Entendiendo los EXPLAIN Plans

El plan EXPLAIN revela cómo la base de datos ejecuta tu consulta.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name
ORDER BY order_count DESC
LIMIT 10;
```

### Operaciones Clave del Plan

| Operación | Significado | Impacto en Rendimiento |
|-----------|-------------|------------------------|
| **Seq Scan** | Escaneo de tabla (lee cada fila) | Lento en tablas grandes; necesita índice |
| **Index Scan** | Lee índice, luego busca filas coincidentes | Rápido para consultas selectivas |
| **Index Only Scan** | Lee solo el índice, sin acceso a tabla | El más rápido; requiere índice cubriente |
| **Bitmap Heap Scan** | Construye bitmap desde índice, busca filas en lotes | Bueno para selectividad moderada |
| **Nested Loop** | Para cada fila externa, escanea tabla interna | Bien para conjuntos externos pequeños |
| **Hash Join** | Construye tabla hash interna, sonda con externa | Bueno para joins grandes |
| **Merge Join** | Ordena ambas entradas, las mezcla | Bueno para datos pre-ordenados |

## Estrategias de Indexación

### Índices B-Tree (Por Defecto)

Mejores para igualdad y rangos:

```sql
-- Índice de columna simple
CREATE INDEX idx_users_email ON users(email);

-- Índice compuesto (el orden de columnas importa)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- Bueno para: WHERE user_id = ? AND status = ?
-- Malo para:  WHERE status = ? (user_id no es líder)
```

### Orden de Columnas en Índice

Coloca columnas en esta prioridad:
1. Filtros de igualdad (`=`)
2. Filtros de rango (`>`, `<`, `BETWEEN`, `LIKE 'prefijo%'`)
3. Columnas usadas en ORDER BY
4. Columnas usadas en SELECT (para índices cubrientes)

### Índices Cubrientes

Un índice que contiene todas las columnas necesarias para la consulta, evitando búsquedas en tabla:

```sql
CREATE INDEX idx_orders_covering
ON orders(user_id, status, created_at, total)
INCLUDE (id);

-- La consulta puede satisfacerse completamente desde el índice
SELECT id, created_at, total
FROM orders
WHERE user_id = 123 AND status = 'shipped';
```

### Índices Parciales

Indexa solo un subconjunto de filas, reduciendo tamaño y costo de mantenimiento:

```sql
-- Indexar solo usuarios activos
CREATE INDEX idx_users_active_email
ON users(email)
WHERE is_active = true;
```

## Técnicas de Reescritura de Consultas

### 1. Evita SELECT *

```sql
-- Malo
SELECT * FROM orders WHERE user_id = 123;

-- Bueno: obtén solo las columnas necesarias
SELECT id, status, total FROM orders WHERE user_id = 123;
```

### 2. Usa EXISTS en lugar de IN para Subconsultas

```sql
-- Malo: materializa resultado completo de subconsulta
SELECT * FROM customers
WHERE id IN (SELECT customer_id FROM orders WHERE amount > 1000);

-- Bueno: se detiene en la primera coincidencia
SELECT * FROM customers c
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.customer_id = c.id AND o.amount > 1000
);
```

### 3. Evita Funciones en Columnas Indexadas

```sql
-- Malo: la función impide uso del índice
SELECT * FROM orders WHERE DATE(created_at) = '2024-01-15';

-- Bueno: consulta de rango usa el índice
SELECT * FROM orders
WHERE created_at >= '2024-01-15'
  AND created_at < '2024-01-16';
```

### 4. Prefiere JOINs sobre Subconsultas Correlacionadas

```sql
-- Malo: subconsulta correlacionada se ejecuta una vez por fila
SELECT name,
    (SELECT COUNT(*) FROM orders WHERE user_id = users.id) AS order_count
FROM users;

-- Bueno: JOIN es más eficiente
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

### 5. Actualizaciones en Batch en lugar de Una por Una

```sql
-- Malo: N+1 actualizaciones
UPDATE orders SET status = 'shipped' WHERE id = 1;
UPDATE orders SET status = 'shipped' WHERE id = 2;
...

-- Bueno: UPDATE único con WHERE IN o JOIN
UPDATE orders
SET status = 'shipped'
WHERE id IN (1, 2, 3, ...);
```

## Anti-Patrones Comunes

| Anti-Patrón | Problema | Solución |
|-------------|----------|----------|
| **Consultas N+1** | Una consulta por fila | Usa JOIN o `WHERE IN`. Consulta [indexación de base de datos](/recipes/performance/database-indexing). |
| **Sin LIMIT** | Obtener millones de filas | Agrega `LIMIT` y paginación |
| **Conversiones implícitas** | Función en columna impide uso de índice | Castea la constante, no la columna |
| `SELECT DISTINCT` para arreglar duplicados | Oculta un problema de join | Arregla el join o el esquema |
| **Contar todas las filas** | `SELECT COUNT(*)` en tablas enormes | Usa conteos aproximados o triggers |
| **Sin pool de conexiones** | Sobrecarga de conexión domina | Usa [pool de conexiones](/recipes/performance/connection-pooling). |

## Lo que funciona

- **Indexa claves foráneas** automáticamente — los joins dependen de ellas
- **Monitorea logs de consultas lentas** semanalmente y atiende los principales ofensores
- **Analiza tablas regularmente** — `ANALYZE` actualiza estadísticas para el planificador
- **Evita sobre-indexación** — cada índice ralentiza escrituras y consume espacio
- **Usa tipos de datos apropiados** — `INTEGER` es más rápido que `VARCHAR` para IDs
- **[Particiona tablas grandes](/guides/databases/database-sharding-partitioning-guide)** por fecha o rango cuando exceden 10M filas

## Preguntas Frecuentes

**P: ¿Cuántos índices son demasiados?**
R: No hay un número fijo, pero cada índice ralentiza INSERT/UPDATE/DELETE. Audita índices trimestralmente y elimina los no usados. PostgreSQL's `pg_stat_user_indexes` muestra uso de índices.

**P: ¿Debería indexar cada columna usada en WHERE?**
R: No. Los índices compuestos a menudo sirven múltiples consultas. Además, el planificador puede elegir un escaneo secuencial si la tabla es pequeña o la consulta retorna la mayoría de las filas.

**P: ¿Por qué mi consulta usa un escaneo secuencial cuando tengo un índice?**
R: El planificador estima que leer toda la tabla es más rápido que leer el índice más búsquedas aleatorias en tabla. Esto suele ser correcto para consultas que retornan >5-10% de las filas.
