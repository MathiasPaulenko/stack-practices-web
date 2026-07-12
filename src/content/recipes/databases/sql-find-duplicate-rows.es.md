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
  - /recipes/sql-full-text-search-setup
  - /recipes/sql-index-optimization-analysis
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


- For alternatives, see [Set Up Database Read Replicas for Scaling](/es/recipes/database-read-replicas/).

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

### Encontrar duplicados en múltiples columnas

```sql
-- Encontrar registros duplicados basados en first_name + last_name + birth_date
SELECT first_name, last_name, birth_date, COUNT(*) AS dup_count
FROM users
GROUP BY first_name, last_name, birth_date
HAVING COUNT(*) > 1
ORDER BY dup_count DESC;
```

### Previsualizar duplicados antes de borrar

```sql
-- Ver qué se conservará y qué se eliminará
WITH duplicates AS (
  SELECT id, email, created_at,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) AS rn
  FROM users
)
SELECT
  id,
  email,
  created_at,
  CASE WHEN rn = 1 THEN 'KEEP' ELSE 'DELETE' END AS action
FROM duplicates
ORDER BY email, rn;
```

### Borrado seguro en una transacción

```sql
BEGIN;

-- Crear backup de los duplicados
CREATE TEMP TABLE dup_backup AS
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) AS rn
  FROM users
)
SELECT u.* FROM users u
JOIN duplicates d ON u.id = d.id
WHERE d.rn > 1;

-- Borrar duplicados
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) AS rn
  FROM users
)
DELETE FROM users
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Verificar conteo
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;

-- Commit solo si no quedan duplicados
COMMIT;
-- Si quedan duplicados, ROLLBACK;
```

### Borrado por lotes para tablas grandes

```sql
-- Borrar en lotes de 1000 para evitar bloqueos
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  LOOP
    WITH duplicates AS (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) AS rn
      FROM users
      LIMIT 5000
    )
    DELETE FROM users
    WHERE id IN (SELECT id FROM duplicates WHERE rn > 1 LIMIT 1000);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    EXIT WHEN deleted_count = 0;

    RAISE NOTICE 'Borradas % filas', deleted_count;
    PERFORM pg_sleep(0.1);  -- throttle
  END LOOP;
END $$;
```

### Deduplicación en MySQL 5.7 (sin window functions)

```sql
-- Encontrar duplicados
SELECT email, COUNT(*) AS dup_count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Borrar duplicados conservando la fila con MIN(id)
DELETE u1 FROM users u1
INNER JOIN users u2
  ON u1.email = u2.email
  AND u1.id > u2.id;
```

### Agregar restricción única después de la limpieza

```sql
-- Después de verificar que no quedan duplicados
ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE (email);

-- O crear un índice único (permite remoción más fácil)
CREATE UNIQUE INDEX idx_users_unique_email ON users (email);
```

## Explicación

La primera consulta agrupa filas por la columna que debería ser única y usa `HAVING COUNT(*) > 1` para devolver solo duplicados. La segunda consulta usa una CTE con `ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at)`. Cada grupo de duplicados se numera desde 1, y eliminamos todas las filas excepto la primera. La cláusula `ORDER BY` determina qué fila se conserva; aquí conservamos el registro más antiguo. Siempre ejecuta la versión `SELECT` de la CTE antes de `DELETE` para confirmar qué se eliminará.

### Cómo funcionan las particiones de ROW_NUMBER

`PARTITION BY email` agrupa filas por email. Dentro de cada grupo, `ORDER BY created_at` asigna números de fila desde 1. La fila con `rn = 1` es la fila canónica (la más antigua en este caso). Todas las filas con `rn > 1` son duplicados a borrar.

### Elegir la fila canónica

| Estrategia | ORDER BY | Conserva |
|------------|----------|----------|
| Registro más antiguo | `created_at ASC` | Primer insertado |
| Registro más reciente | `created_at DESC` | Último insertado |
| Más completo | `updated_at DESC` | Último actualizado |
| ID más alto | `id DESC` | Último asignado |

## Variantes

| Base de datos | Técnica | Notas |
|---------------|---------|-------|
| PostgreSQL | `ROW_NUMBER() OVER` | Flexible y segura |
| MySQL 8+ | `ROW_NUMBER() OVER` | Misma sintaxis que PostgreSQL |
| MySQL 5.7 | Self-join | Usa `MIN(id)` para conservar una fila |
| SQLite | `DELETE` con subconsulta `IN` | Funciona con window functions en 3.25+ |
| SQL Server | `ROW_NUMBER() OVER` | Misma sintaxis, usar CTE |

## Lo que funciona

1. **Previsualiza siempre antes de borrar.** Ejecuta la CTE como `SELECT` primero para ver qué filas se conservarán.
2. **Haz backup de la tabla o usa una transacción.** Un mal `DELETE` puede eliminar miles de filas.
3. **Elige la fila canónica con lógica de negocio.** La más antigua, más reciente o más completa depende del caso de uso.
4. **Agrega una restricción única después de la limpieza.** Esto evita que los duplicados vuelvan.
5. **Considera claves foráneas.** Borrar una fila padre puede dejar huérfanas las filas hijas a menos que uses `ON DELETE CASCADE` o actualices referencias primero.
6. **Usa borrado por lotes para tablas grandes.** Borrar millones de filas en una transacción puede bloquear la tabla y agotar memoria.
7. **Maneja valores NULL explícitamente.** `NULL` no es igual a `NULL` en `GROUP BY`; usa `COALESCE` o `IS NOT DISTINCT FROM` para detectar duplicados NULL.

## Errores Comunes

1. **Borrar sin WHERE.** Un `WHERE` ausente convierte la consulta en un borrado total de tabla.
2. **Conservar la fila equivocada.** Si ordenas aleatoriamente, puedes descartar el duplicado más valioso.
3. **Ignorar valores NULL.** `NULL` no es igual a `NULL`, por lo que duplicados con claves NULL pueden no detectarse con `GROUP BY`.
4. **Ejecutar en producción durante tráfico alto.** El bloqueo de contención puede bloquear escrituras; usa un enfoque por lotes o ventana de bajo tráfico.
5. **Olvidar actualizar secuencias relacionadas.** Si borras el `id` más alto, puedes necesitar reiniciar una secuencia, aunque raramente es necesario.
6. **No agregar restricción única después de la limpieza.** Sin ella, los duplicados reaparecerán.
7. **Usar `DELETE` en lugar de `TRUNCATE` para dedup total.** Si todas las filas son duplicados, exporta las filas canónicas, `TRUNCATE`, y re-importa.

## Preguntas Frecuentes

**P: ¿Qué pasa si los duplicados tienen diferentes valores en otras columnas?**
R: Elige la fila canónica por reglas de negocio, luego fusiona los datos o conserva la fila con los datos más completos o recientes. Puedes usar `COALESCE` para seleccionar valores no nulos de los duplicados.

**P: ¿Puedo borrar duplicados en lotes?**
R: Sí. Agrega `AND id IN (SELECT id FROM duplicates WHERE rn > 1 LIMIT 1000)` y ejecuta el borrado repetidamente hasta que no queden duplicados. Agrega un pequeño sleep entre lotes para reducir la contención de bloqueos.

**P: ¿Cómo evito que los duplicados vuelvan?**
R: Agrega una restricción única o índice único en las columnas que definen unicidad, y maneja excepciones de clave duplicada en tu aplicación con `ON CONFLICT DO NOTHING` (PostgreSQL) o `INSERT IGNORE` (MySQL).

**P: ¿Cómo encuentro duplicados en una columna JSONB?**
R: Convierte el JSONB a texto para comparar: `GROUP BY jsonb_column::text HAVING COUNT(*) > 1`. Para duplicados parciales, extrae claves específicas y compáralas.

**P: ¿Cuál es la diferencia entre DISTINCT y deduplicación?**
R: `SELECT DISTINCT` elimina duplicados de los resultados de consulta pero no modifica la tabla. La deduplicación borra filas reales de la tabla. Usa `DISTINCT` para consultas, deduplicación para limpieza de datos.

**P: ¿Puedo usar ON CONFLICT para manejar duplicados al insertar?**
R: Sí. PostgreSQL soporta `INSERT ... ON CONFLICT (email) DO NOTHING` para saltar duplicados, o `DO UPDATE SET ...` para fusionar. Esto evita duplicados sin un paso de limpieza separado.

**P: ¿Cómo encuentro duplicados aproximados (fuzzy matching)?**
R: Usa similitud de trigramas: `CREATE EXTENSION pg_trgm; SELECT a.id, b.id, similarity(a.email, b.email) FROM users a, users b WHERE a.id < b.id AND a.email % b.email;`

## Consejos de Rendimiento

1. **Indexa las columnas usadas para deduplicación.** Las columnas `PARTITION BY` y `ORDER BY` en la CTE necesitan índices para ordenamiento rápido:

```sql
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_email_created ON users (email, created_at);
```

2. **Usa `EXPLAIN ANALYZE` para verificar el plan.** La CTE debería usar el índice para el ordenamiento de la window function, no un escaneo completo de tabla:

```sql
EXPLAIN ANALYZE
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) AS rn
  FROM users
)
SELECT * FROM duplicates WHERE rn > 1;
```

3. **Procesa trabajos grandes de deduplicación por lotes.** Para tablas con millones de filas, borra en lotes de 1000-5000 filas para evitar transacciones largas y contención de bloqueos.

4. **Ejecuta durante ventanas de bajo tráfico.** Las consultas de deduplicación escanean y ordenan grandes porciones de la tabla. Prográmalas durante horas valle o ventanas de mantenimiento.

5. **Usa `ANALYZE` después de la limpieza.** Después de borrar un gran número de filas, actualiza las estadísticas de la tabla para que el planificador de consultas tenga información precisa:

```sql
ANALYZE users;
```

6. **Considera `REINDEX` después de borrados grandes.** Borrar muchas filas puede inflar los índices. Reconstrúyelos para recuperar espacio y mejorar el rendimiento:

```sql
REINDEX INDEX idx_users_email;
```

7. **Usa `VACUUM FULL` para bloat severo.** Después de una deduplicación masiva, la tabla puede tener espacio muerto significativo. `VACUUM FULL` reescribe la tabla y recupera espacio, pero bloquea la tabla exclusivamente. Ejecútalo durante una ventana de mantenimiento.

8. **Registra conteos de borrado para auditoría.** Rastrea cuántas filas se borraron en cada lote para cumplimiento y verificación de rollback. Almacena conteos en una tabla de auditoría dedicada o logs de aplicación.

9. **Prueba con una copia primero.** Antes de ejecutar deduplicación en datos de producción, prueba en una copia: `CREATE TABLE users_dedup_test AS SELECT * FROM users;`. Ejecuta la CTE contra la copia y verifica que los resultados coincidan con lo esperado.

10. **Documenta la estrategia de deduplicación.** Registra qué columnas definen unicidad, qué fila se conserva y cuándo se ejecutó la última limpieza. Esto ayuda al mantenimiento futuro y onboarding.

11. **Configura monitoreo para recurrencia de duplicados.** Crea un job programado que verifique duplicados semanalmente y alerte si los conteos aumentan, para detectar problemas de calidad de datos temprano.

12. **Establece un proceso de revisión periódica.** Programa auditorías trimestrales de calidad de datos para verificar que las restricciones únicas siguen vigentes y que no hay duplicados nuevos.

## Técnicas Avanzadas

### Deduplicación con coincidencia parcial de columnas

Cuando necesitas deduplicar basado en un subconjunto de columnas pero conservar todas las columnas:

```sql
-- Encontrar duplicados por email pero conservar la fila con actividad más reciente
WITH ranked AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY last_activity DESC) AS rn
  FROM users
)
DELETE FROM users
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
```

### Fusionar datos de duplicados antes del borrado

Cuando los duplicados contienen datos valiosos diferentes, fusiónalos primero:

```sql
-- Fusionar datos de duplicados en la fila canónica
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) AS rn
  FROM users
),
canonical AS (
  SELECT id FROM duplicates WHERE rn = 1
),
to_delete AS (
  SELECT id FROM duplicates WHERE rn > 1
)
UPDATE users u
SET last_name = COALESCE(
  (SELECT MAX(last_name) FROM users WHERE id IN (SELECT id FROM to_delete) AND email = u.email),
  u.last_name
)
WHERE id IN (SELECT id FROM canonical);

-- Luego borrar los duplicados
DELETE FROM users
WHERE id IN (SELECT id FROM to_delete);
```

### Manejar duplicados insensibles a mayúsculas

Las direcciones de email deben tratarse de forma insensible a mayúsculas:

```sql
-- Encontrar emails duplicados insensibles a mayúsculas
SELECT LOWER(email) as email_lower, COUNT(*)
FROM users
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;

-- Deduplicar conservando la primera ocurrencia
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY created_at) AS rn
  FROM users
)
DELETE FROM users
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
```

### Deduplicación a través de múltiples tablas

Cuando los duplicados existen en tablas relacionadas:

```sql
-- Encontrar duplicados a través de users y archived_users
SELECT email, COUNT(*)
FROM (
  SELECT email FROM users
  UNION ALL
  SELECT email FROM archived_users
) all_emails
GROUP BY email
HAVING COUNT(*) > 1;

-- Remover de archived si existe en active
DELETE FROM archived_users
WHERE email IN (SELECT email FROM users);
```

### Usar tablas temporales para deduplicación masiva segura

Para tablas muy grandes, usa un enfoque de tabla temporal:

```sql
-- Crear una copia limpia
CREATE TABLE users_clean AS
SELECT DISTINCT ON (email) *
FROM users
ORDER BY email, created_at;

-- Verificar que los conteos de filas coincidan con expectativas
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM users_clean;

-- Intercambiar tablas en una transacción
BEGIN;
DROP TABLE users;
ALTER TABLE users_clean RENAME TO users;
COMMIT;
```
