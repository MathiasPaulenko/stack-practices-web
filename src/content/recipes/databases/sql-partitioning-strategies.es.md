---
contentType: recipes
slug: sql-partitioning-strategies
title: "Particionar tablas grandes por fecha o rango"
description: "Divide tablas SQL enormes en particiones más pequeñas por fecha, rango o lista para mejorar el rendimiento y el mantenimiento."
metaDescription: "Particiona tablas SQL grandes por fecha, rango o lista. Mejora el rendimiento, poda particiones y simplifica el mantenimiento."
difficulty: advanced
topics:
  - databases
tags:
  - sql
  - postgresql
  - partitioning
  - performance
  - maintenance
relatedResources:
  - /recipes/sql-index-optimization-analysis
  - /guides/read-replica-guide
  - /guides/sql-performance-tuning-guide
  - /recipes/postgres-query-optimization
  - /recipes/sql-find-duplicate-rows
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Particiona tablas SQL grandes por fecha, rango o lista. Mejora el rendimiento, poda particiones y simplifica el mantenimiento."
  keywords:
    - sql
    - postgresql
    - particionamiento
    - rendimiento
    - mantenimiento
---


## Visión General

Cuando una tabla crece más allá de cientos de millones de filas, cada consulta se convierte en una batalla contra el tamaño del índice y el tiempo de mantenimiento. La partición divide la tabla en pedazos más pequeños y manejables manteniendo la tabla completa consultable como una sola. La base de datos poda particiones que no coinciden con la consulta, por lo que los escaneos son más pequeños y el mantenimiento de índices es más barato.

## Cuándo Usar

Usa este recurso cuando:
- Una tabla crece más rápido que tu presupuesto de hardware.
- Las consultas filtran principalmente por un rango natural como fecha o región.
- Las ventanas de mantenimiento son demasiado cortas para vacuum o reindexar toda la tabla.
- Necesitas archivar o eliminar datos antiguos eficientemente.

## Solución

### Particionar orders por mes en PostgreSQL

```sql
-- Crear una tabla particionada
CREATE TABLE orders (
  id BIGSERIAL,
  customer_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  amount NUMERIC(10,2),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Crear particiones mensuales
CREATE TABLE orders_2024_01 PARTITION OF orders
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE orders_2024_02 PARTITION OF orders
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Crear particiones futuras automáticamente con un script o extensión
```

## Explicación

El particionamiento declarativo en PostgreSQL permite definir una tabla particionada y adjuntar tablas hijas que contienen rangos específicos. La clave de partición debe ser parte de la clave primaria. Cuando una consulta filtra por `created_at`, el planificador solo escanea las particiones que pueden contener filas coincidentes, un proceso llamado poda de particiones. Eliminar datos antiguos se convierte en `DROP TABLE orders_2024_01`, mucho más rápido y recupera espacio inmediatamente comparado con borrar millones de filas.

## Variantes

| Estrategia | Clave | Mejor para |
|------------|-------|------------|
| Rango | Fecha, rango numérico | Series temporales, logs |
| Lista | Región, status | Categorías discretas |
| Hash | Hash de clave | Distribución pareja, sin rango natural |
| Compuesto | Rango + Lista | Tablas multi-tenant grandes |

## Mejores Prácticas

1. **Elige la clave de partición según patrones de consulta.** Particionar por una columna que nunca filtras es overhead desperdiciado.
2. **Crea particiones futuras antes de que lleguen datos.** Usa un cron job o extensión como `pg_partman` para automatizar.
3. **Mantén índices en cada partición.** Los índices locales son más baratos de reconstruir que un índice global gigante.
4. **Archiva particiones viejas en lugar de borrar filas.** `DROP TABLE` o `DETACH PARTITION` es rápido y recupera espacio.
5. **Prueba la poda de particiones con EXPLAIN.** Confirma que el planificador salta particiones irrelevantes.

## Errores Comunes

1. **Particionar demasiado pronto.** Tablas con pocos millones de filas raramente se benefician del particionamiento.
2. **Clave de partición incorrecta.** Una clave con baja cardinalidad o distribución desigual crea particiones calientes.
3. **Olvidar la clave de partición en la clave primaria.** PostgreSQL la requiere para particionamiento por rango y lista.
4. **Demasiadas particiones.** Cientos de particiones pueden ralentizar la planificación y aumentar el bloat del catálogo.
5. **Actualizaciones entre particiones.** Actualizar la clave de partición mueve una fila entre particiones y puede ser lento o bloqueante.

## Preguntas Frecuentes

**P: ¿Necesito cambiar las consultas de la aplicación?**
R: No. Las tablas particionadas parecen tablas normales para las aplicaciones. El planificador maneja la poda automáticamente.

**P: ¿Cómo agrego una partición para un mes nuevo?**
R: Usa `CREATE TABLE ... PARTITION OF ... FOR VALUES FROM ... TO ...`. Automatiza esto con un job programado o pg_partman.

**P: ¿Puedo particionar una tabla existente?**
R: Sí, pero generalmente requiere crear una nueva tabla particionada, migrar datos y renombrar. PostgreSQL no soporta convertir una tabla regular en el lugar.
