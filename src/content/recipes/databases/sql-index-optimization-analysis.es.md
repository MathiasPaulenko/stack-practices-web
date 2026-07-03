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

## Explicación

`EXPLAIN (ANALYZE, BUFFERS)` ejecuta la consulta y reporta tiempo real de ejecución más estadísticas de I/O. Busca `Seq Scan` en tablas grandes, lo que significa que la base de datos lee cada fila. Si el filtro es selectivo, un índice compuesto en `(customer_id, created_at)` permite a la base de datos saltar a las filas relevantes y devolverlas en orden. El orden del índice debe coincidir con columnas de igualdad primero, luego rangos, y finalmente ordenamiento.

## Variantes

| Tipo de índice | Mejor para | Ejemplo |
|----------------|------------|---------|
| B-tree | Igualdad y rango | `WHERE id = 5` o `WHERE date > '2024-01-01'` |
| GIN | Array, JSONB, full-text | `WHERE tags @> ARRAY['x']` |
| BRIN | Tablas muy grandes, naturalmente ordenadas | Datos de series temporales |
| Parcial | Subconjunto de filas | `WHERE deleted_at IS NULL` |

## Lo que funciona

1. **Mide siempre antes y después.** `EXPLAIN ANALYZE` da prueba concreta de mejora.
2. **Indexa columnas de igualdad primero.** Son más selectivas que las de rango.
3. **Mantén índices estrechos.** Incluye solo columnas que la consulta necesita.
4. **Elimina índices no usados.** Consumen espacio en disco y ralentizan escrituras.
5. **Monitorea rendimiento de escritura.** Cada índice agrega costo a `INSERT`, `UPDATE` y `DELETE`.

## Errores Comunes

1. **Agregar un índice para cada consulta lenta.** Demasiados índices dañan throughput de escritura y mantenimiento.
2. **Orden incorrecto de columnas en índices compuestos.** La columna principal debe ser la usada en filtros de igualdad.
3. **Indexar columnas de baja cardinalidad solas.** Un índice en `status` con solo tres valores raramente es útil.
4. **Olvidar actualizar estadísticas.** Ejecuta `ANALYZE` después de cargas masivas para que el planificador tenga conteos precisos.
5. **Asumir que el planificador usará el índice.** Confirma siempre con `EXPLAIN`; los hints son último recurso.

## Preguntas Frecuentes

**P: ¿Cuál es la diferencia entre EXPLAIN y EXPLAIN ANALYZE?**
R: EXPLAIN muestra el plan planificado. EXPLAIN ANALYZE ejecuta la consulta realmente y reporta tiempos y filas reales procesadas.

**P: ¿Cómo sé si un índice está siendo usado?**
R: Busca `Index Scan` o `Index Only Scan` en el plan. `Seq Scan` en una tabla grande generalmente significa que el índice no se usa.

**P: ¿Debería agregar un índice a cada columna de clave foránea?**
R: Generalmente sí, especialmente si la columna se usa en JOINs, WHERE o búsquedas de hijos. Pero verifica uso con `EXPLAIN`.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
