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
  - indexing
  - base-de-datos
  - performance
  - query-optimization
  - sql
  - postgresql
  - mysql
relatedResources:
  - /recipes/sql-joins
  - /recipes/database-views-materialized
  - /recipes/connection-pooling
lastUpdated: "2026-06-13"
author: "StackPractices"
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

## Mejores prácticas

- **Indexa las columnas de tu cláusula WHERE**: si un query filtra por `user_id` y `status`, un índice en `(user_id, status)` es lo primero que probar.
- **Pon columnas de igualdad antes que columnas de rango**: en `(a, b)` donde `a = 1` y `b > 100`, el índice en `(a, b)` es mucho más efectivo que `(b, a)`.
- **Evita indexar columnas de baja cardinalidad solas**: una columna `status` con solo 3 valores (active, pending, archived) no se beneficia de un índice standalone. Combínala con una columna de alta cardinalidad.
- **Elimina índices no usados**: cada índice ralentiza escrituras. Monitorea estadísticas de uso de índices y elimina índices que nunca se escanean.
- **Indexa columnas de foreign key**: las bases de datos no siempre indexan automáticamente foreign keys. Índices faltantes en columnas `JOIN` causan escaneos costosos de nested loop.

## Errores comunes

- **Indexar cada columna**: esto desperdicia espacio en disco, ralentiza dramáticamente escrituras, y confunde al optimizador de queries con demasiadas opciones.
- **Orden incorrecto de columnas en índices compuestos**: un índice en `(created_at, user_id)` no puede ayudar a un query que filtra solo por `user_id`.
- **Indexar columnas que nunca se consultan**: revisa tus logs de queries antes de crear índices.
- **Ignorar el mantenimiento de índices**: los índices fragmentados en tablas de alta rotación se degradan con el tiempo. Programa `REINDEX` o `OPTIMIZE TABLE` periódicamente.
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

