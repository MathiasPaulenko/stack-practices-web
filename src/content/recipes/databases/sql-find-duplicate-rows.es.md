---
contentType: recipes
slug: sql-find-duplicate-rows
title: "Encontrar y eliminar filas duplicadas en SQL"
description: "Detecta y elimina registros duplicados en tablas SQL usando GROUP BY y HAVING, conservando la fila canónica de forma segura."
metaDescription: "Aprende a encontrar y eliminar filas duplicadas en SQL con GROUP BY, HAVING y CTEs. Limpia tablas y conserva registros canónicos."
difficulty: beginner
topics:
  - databases
tags:
  - sql
  - postgresql
  - mysql
  - deduplication
  - cte
relatedResources:
  - /guides/read-replica-guide
  - /guides/sql-cte-guide
  - /docs/runbook-database-failover
  - /docs/database-schema-documentation-template
  - /guides/full-text-search-guide
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Aprende a encontrar y eliminar filas duplicadas en SQL con GROUP BY, HAVING y CTEs. Limpia tablas y conserva registros canónicos."
  keywords:
    - sql
    - postgresql
    - mysql
    - deduplicación
    - cte
---


## Visión General

Las filas duplicadas se cuelan en las tablas por errores de aplicación, scripts de importación o condiciones de carrera. Desperdician espacio, distorsionan análisis y pueden romper restricciones únicas que pretendías aplicar. Encontrarlas requiere agrupar por las columnas que definen unicidad, y eliminarlas de forma segura significa conservar una fila canónica mientras se borran el resto sin perder datos relacionados.

## Cuándo Usar

Usa este recurso cuando:
- Necesites identificar registros duplicados en una tabla.
- Una violación de restricción única impide agregar un índice requerido.
- Estés limpiando datos después de una importación o migración.
- Quieras deduplicar antes de aplicar una nueva clave primaria o índice único.

## Solución

### Encontrar duplicados en PostgreSQL

```sql
-- Encontrar emails duplicados en la tabla users
SELECT email, COUNT(*)
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Conservar la fila más antigua y eliminar el resto
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) AS rn
  FROM users
)
DELETE FROM users
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
```

## Explicación

La primera consulta agrupa filas por la columna que debería ser única y usa `HAVING COUNT(*) > 1` para devolver solo duplicados. La segunda consulta usa una CTE con `ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at)`. Cada grupo de duplicados se numera desde 1, y eliminamos todas las filas excepto la primera. La cláusula `ORDER BY` determina qué fila se conserva; aquí conservamos el registro más antiguo. Siempre ejecuta la versión `SELECT` de la CTE antes de `DELETE` para confirmar qué se eliminará.

## Variantes

| Base de datos | Técnica | Notas |
|---------------|---------|-------|
| PostgreSQL | `ROW_NUMBER() OVER` | Flexible y segura |
| MySQL 8+ | `ROW_NUMBER() OVER` | Misma sintaxis que PostgreSQL |
| MySQL 5.7 | Self-join | Usa `MIN(id)` para conservar una fila |
| SQLite | `DELETE` con subconsulta `IN` | Funciona con window functions en 3.25+ |

## Lo que funciona

1. **Previsualiza siempre antes de borrar.** Ejecuta la CTE como `SELECT` primero para ver qué filas se conservarán.
2. **Haz backup de la tabla o usa una transacción.** Un mal `DELETE` puede eliminar miles de filas.
3. **Elige la fila canónica con lógica de negocio.** La más antigua, más reciente o más completa depende del caso de uso.
4. **Agrega una restricción única después de la limpieza.** Esto evita que los duplicados vuelvan.
5. **Considera claves foráneas.** Borrar una fila padre puede dejar huérfanas las filas hijas a menos que uses `ON DELETE CASCADE` o actualices referencias primero.

## Errores Comunes

1. **Borrar sin WHERE.** Un `WHERE` ausente convierte la consulta en un borrado total de tabla.
2. **Conservar la fila equivocada.** Si ordenas aleatoriamente, puedes descartar el duplicado más valioso.
3. **Ignorar valores NULL.** `NULL` no es igual a `NULL`, por lo que duplicados con claves NULL pueden no detectarse con `GROUP BY`.
4. **Ejecutar en producción durante tráfico alto.** El bloqueo de contención puede bloquear escrituras; usa un enfoque por lotes o ventana de bajo tráfico.
5. **Olvidar actualizar secuencias relacionadas.** Si borras el `id` más alto, puedes necesitar reiniciar una secuencia, aunque raramente es necesario.

## Preguntas Frecuentes

**P: ¿Qué pasa si los duplicados tienen diferentes valores en otras columnas?**
R: Elige la fila canónica por reglas de negocio, luego fusiona los datos o conserva la fila con los datos más completos o recientes.

**P: ¿Puedo borrar duplicados en lotes?**
R: Sí. Agrega `AND id IN (SELECT id FROM duplicates WHERE rn > 1 LIMIT 1000)` y ejecuta el borrado repetidamente hasta que no queden duplicados.

**P: ¿Cómo evito que los duplicados vuelvan?**
R: Agrega una restricción única o índice único en las columnas que definen unicidad, y maneja excepciones de clave duplicada en tu aplicación.
