---
contentType: recipes
slug: sql-migration-zero-downtime
title: "Migración de columnas sin downtime"
description: "Renombra columnas o cambia tipos de datos sin bloquear tablas usando vistas, triggers y estrategias de relleno incremental."
metaDescription: "Renombra columnas y cambia tipos de datos en SQL sin detener la aplicación. Usa expand-contract, triggers y relleno por lotes."
difficulty: advanced
topics:
  - databases
tags:
  - sql
  - postgresql
  - migration
  - schema
  - zero-downtime
relatedResources:
  - /docs/database-schema-documentation-template
  - /recipes/sql-find-duplicate-rows
  - /recipes/sql-index-optimization-analysis
  - /recipes/sql-partitioning-strategies
  - /recipes/sql-recursive-cte-query
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Renombra columnas y cambia tipos de datos en SQL sin detener la aplicación. Usa expand-contract, triggers y relleno por lotes."
  keywords:
    - sql
    - postgresql
    - migración
    - esquema
    - zero-downtime
---


## Visión General

Renombrar una columna o cambiar su tipo en una tabla ocupada es riesgoso porque `ALTER TABLE` puede adquirir un bloqueo exclusivo y bloquear lecturas y escrituras por minutos u horas. Las migraciones sin downtime evitan esto agregando una nueva columna, rellenando datos incrementalmente, sincronizando escrituras con triggers o vistas, y luego cambiando una vez que los valores antiguos y nuevos coinciden.

## Cuándo Usar

Usa este recurso cuando:
- Necesites renombrar una columna en una tabla de producción sin downtime.
- Estés cambiando un tipo de datos y no puedas permitir un bloqueo largo.
- Estés migrando una columna legada a un nuevo formato.
- Tu aplicación no tolere una ventana de mantenimiento.

## Solución

### Renombrar una columna sin downtime

```sql
-- Paso 1: agregar la nueva columna
ALTER TABLE customers ADD COLUMN email_address VARCHAR(255);

-- Paso 2: crear un trigger para mantener ambas columnas sincronizadas
CREATE OR REPLACE FUNCTION sync_email() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_address IS DISTINCT FROM OLD.email_address THEN
    NEW.email := NEW.email_address;
  ELSIF NEW.email IS DISTINCT FROM OLD.email THEN
    NEW.email_address := NEW.email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_sync_email
BEFORE INSERT OR UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION sync_email();

-- Paso 3: rellenar en lotes
UPDATE customers
SET email_address = email
WHERE id BETWEEN 1 AND 1000
  AND email_address IS NULL;

-- Paso 4: verificar que todas las filas coinciden, luego eliminar la columna vieja y renombrar
```

### Cambiar un tipo de datos sin downtime

```sql
-- Paso 1: agregar la nueva columna con el tipo objetivo
ALTER TABLE orders ADD COLUMN total_cents INTEGER;

-- Paso 2: trigger para sincronizar ambas columnas
CREATE OR REPLACE FUNCTION sync_total() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_cents IS DISTINCT FROM OLD.total_cents THEN
    NEW.total := NEW.total_cents / 100.0;
  ELSIF NEW.total IS DISTINCT FROM OLD.total THEN
    NEW.total_cents := (NEW.total * 100)::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_sync_total
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION sync_total();

-- Paso 3: rellenar en lotes con conversión
UPDATE orders
SET total_cents = (total * 100)::INTEGER
WHERE id BETWEEN 1 AND 5000
  AND total_cents IS NULL;

-- Paso 4: verificar
SELECT COUNT(*) FROM orders WHERE total_cents IS NULL;
SELECT COUNT(*) FROM orders WHERE total_cents != (total * 100)::INTEGER;

-- Paso 5: cambiar lecturas de app, agregar NOT NULL, agregar check constraint
ALTER TABLE orders ADD CONSTRAINT chk_total_cents CHECK (total_cents >= 0);

-- Paso 6: eliminar columna vieja
ALTER TABLE orders DROP COLUMN total;
ALTER TABLE orders RENAME COLUMN total_cents TO total;
DROP TRIGGER orders_sync_total ON orders;
DROP FUNCTION sync_total();
```

### Script de backfill con bucle por lotes

```sql
DO $$
DECLARE
  batch_count INTEGER := 0;
  rows_updated INTEGER;
BEGIN
  LOOP
    UPDATE customers
    SET email_address = email
    WHERE id IN (
      SELECT id FROM customers
      WHERE email_address IS NULL
      LIMIT 1000
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;
    batch_count := batch_count + 1;
    RAISE NOTICE 'Lote %: actualizadas % filas', batch_count, rows_updated;
    PERFORM pg_sleep(0.1);
  END LOOP;
  RAISE NOTICE 'Backfill completo: % lotes', batch_count;
END $$;
```

### Query de verificación antes del cutover

```sql
-- Verificar filas con mismatch
SELECT COUNT(*) AS mismatch_count
FROM customers
WHERE email_address IS DISTINCT FROM email;

-- Verificar NULLs en la nueva columna
SELECT COUNT(*) AS null_count
FROM customers
WHERE email_address IS NULL;

-- Mostrar filas con mismatch para inspección manual
SELECT id, email, email_address
FROM customers
WHERE email_address IS DISTINCT FROM email
LIMIT 10;
```

## Explicación

El enfoque se llama expand-contract. Primero expandes el esquema agregando la nueva columna manteniendo la vieja. Un trigger asegura que las escrituras actualicen ambas columnas durante la transición. Rellena la nueva columna en lotes pequeños para evitar bloqueos largos. Una vez que la nueva columna está completamente poblada y las aplicaciones se han cambiado a usarla, elimina la vieja y opcionalmente renombra la nueva. Esto permite que la aplicación cambie a su propio ritmo sin un cutover a nivel de base de datos.

### Las cuatro fases de expand-contract

1. **Expand**: Agregar nuevas columnas, índices o tablas sin remover las viejas. La aplicación continúa funcionando con el esquema antiguo.
2. **Migrate**: Rellenar datos en lotes. Un trigger o dual-write a nivel aplicación mantiene las columnas nuevas y viejas sincronizadas para escrituras concurrentes.
3. **Verify**: Ejecutar queries de validación para confirmar que cada fila tiene valores coincidentes en ambas columnas. Verificar NULLs, mismatch de tipos y violaciones de constraints.
4. **Contract**: Eliminar la columna vieja, remover el trigger y renombrar la nueva columna. Desplegar la versión final de la aplicación que solo referencia la nueva columna.

### Comportamiento de locks en operaciones DDL comunes

| Operación | PostgreSQL | MySQL |
|-----------|------------|-------|
| `ADD COLUMN` (nullable, sin default) | Lock de metadata breve | Lock de metadata breve |
| `ADD COLUMN` (con default) | Breve (PG 11+) | Reescritura completa (MySQL 5.6-) |
| `ALTER COLUMN TYPE` | Reescritura completa | Reescritura completa |
| `DROP COLUMN` | Lock de metadata breve | Lock de metadata breve |
| `CREATE INDEX` | `CONCURRENTLY` = sin lock | `INPLACE` = lock breve |
| `ADD CONSTRAINT` | `NOT VALID` + VALIDATE | Lock breve |

## Variantes

| Paso | Herramienta | Propósito |
|------|-------------|-----------|
| Agregar columna | `ALTER TABLE` | Expandir esquema |
| Sincronizar escrituras | Trigger o aplicación | Escritura dual |
| Rellenar | `UPDATE` por lotes | Migrar filas existentes |
| Validar | `COUNT(*)` con filtro de mismatch | Confirmar paridad |
| Cambiar | Desplegar nueva versión de app | Leer de nueva columna |
| Limpieza | `DROP COLUMN` + `DROP TRIGGER` | Contraer esquema |

## Lo que funciona

1. **Ejecuta migraciones en una transacción cuando sea posible.** Esto mantiene el esquema consistente.
2. **Rellena en lotes pequeños con pausas entre ellos.** Esto reduce contención de bloqueos y lag de replicación.
3. **Usa `IS DISTINCT FROM` para comparaciones seguras con NULL.** `NULL = NULL` es desconocido, así que usa el operador distinct.
4. **Agrega un feature flag para cambiar lecturas.** Cambia la aplicación a la nueva columna una vez completado el relleno.
5. **Monitorea el lag de replicación durante el relleno.** Grandes actualizaciones pueden saturar réplicas; pausa si el lag crece.
6. **Crea índices concurrentemente.** Usa `CREATE INDEX CONCURRENTLY` en PostgreSQL para evitar bloquear escrituras.
7. **Prueba la migración completa en una copia de staging.** Mide timing, comportamiento de locks y uso de recursos antes de ejecutar en producción.
8. **Mantén el trigger hasta después del cutover.** Removerlo demasiado pronto puede causar drift de datos si rutas de código viejas aún escriben a la columna antigua.

## Errores Comunes

1. **Ejecutar un UPDATE masivo único.** Esto bloquea la tabla y puede revertirse en caso de fallo.
2. **Olvidar manejar escrituras nuevas durante el relleno.** Sin un trigger, las filas insertadas después de iniciar el relleno faltarán.
3. **Eliminar la columna vieja demasiado pronto.** Verifica que ambas columnas coinciden para cada fila antes de cambiar.
4. **No indexar la nueva columna.** Si la aplicación consulta la nueva columna, agrega los índices necesarios antes de cambiar.
5. **Ignorar referencias de claves foráneas.** Otras tablas o vistas pueden referenciar la columna vieja por nombre.
6. **No configurar `statement_timeout`.** Un DDL largo puede bloquear todas las queries. Configura un timeout para abortar migraciones que tomen demasiado tiempo.
7. **Eliminar el trigger antes de que todas las instancias de app estén actualizadas.** Durante un rolling deploy, instancias viejas pueden aún escribir a la columna antigua.

## Preguntas Frecuentes

**P: ¿Cuánto tiempo debe durar un relleno?**
R: Depende del tamaño de la tabla y la tasa de escritura. Estrategias típicas procesan unos pocos miles de filas por lote con pausas cortas entre lotes para evitar impacto en horas pico. Una tabla de 10M filas puede tomar 1-4 horas con lotes de 1000 filas y pausas de 100ms.

**P: ¿Puedo hacer esto sin triggers?**
R: Sí, puedes escribir dualmente desde la capa de aplicación. El trigger de base de datos es una red de seguridad en caso de que no todas las rutinas de código se actualicen. El dual-write a nivel aplicación te da más control pero requiere que cada ruta de escritura se actualice.

**P: ¿Qué pasa si la nueva columna tiene un tipo de datos diferente?**
R: Convierte valores durante el relleno y actualiza el trigger para manejar conversiones. Prueba la conversión en una muestra antes de ejecutarla en la tabla completa. Cuidado con pérdida de precisión al convertir entre NUMERIC e INTEGER.

**P: ¿Cómo manejo constraints NOT NULL?**
R: Agrega la columna como nullable primero. Después de completar y verificar el relleno, agrega el constraint NOT NULL: `ALTER TABLE customers ALTER COLUMN email_address SET NOT NULL;`. Esto requiere un lock breve pero es rápido una vez que todas las filas están pobladas.

**P: ¿Puedo hacer rollback después de eliminar la columna vieja?**
R: No. Una vez que eliminas la columna vieja, los datos se pierden. Mantén la columna vieja hasta que estés seguro de que la nueva funciona correctamente en producción. Considera archivar los datos de la columna vieja a una tabla de backup antes de eliminarla.

**P: ¿Cómo manejo índices en la nueva columna?**
R: Crea índices con `CREATE INDEX CONCURRENTLY` en PostgreSQL para evitar bloquear escrituras. En MySQL, usa `ALGORITHM=INPLACE` o `pt-online-schema-change` para tablas grandes. Crea índices antes de cambiar las lecturas de la aplicación a la nueva columna.

**P: ¿Qué pasa con las vistas que referencian la columna vieja?**
R: Las vistas en PostgreSQL almacenan la referencia a la columna por nombre, no por posición. Eliminar una columna que una vista referencia causará que la vista se rompa. Recrea las vistas para referenciar la nueva columna antes de eliminar la vieja.

## Tips de Rendimiento

1. **Configura `statement_timeout` antes de ejecutar DDL.** Esto previene que una migración bloquee la base de datos indefinidamente:

```sql
SET statement_timeout = '30s';
ALTER TABLE customers ADD COLUMN email_address VARCHAR(255);
SET statement_timeout = '0';  -- reset al default
```

2. **Usa `CREATE INDEX CONCURRENTLY` para nuevos índices.** Esto evita bloquear escrituras pero toma más tiempo que un `CREATE INDEX` regular. No puede ejecutarse dentro de una transacción.

3. **Monitorea `pg_stat_activity` durante el relleno.** Observa queries largas y esperas de lock:

```sql
SELECT pid, state, wait_event_type, wait_event,
       now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;
```

4. **Ajusta `work_mem` para batch updates grandes.** Incrementar `work_mem` para la sesión de migración puede acelerar los batch updates permitiendo sorts más grandes en memoria:

```sql
SET work_mem = '256MB';
```

5. **Usa `lock_timeout` para evitar esperar indefinidamente.** Si una migración no puede adquirir un lock, es mejor fallar rápido y reintentar:

```sql
SET lock_timeout = '5s';
ALTER TABLE customers ADD COLUMN email_address VARCHAR(255);
```

6. **Usa `pg_repack` para table bloat.** Después de backfills o updates grandes, las tablas e índices pueden sufrir bloat. `pg_repack` reconstruye tablas sin locks exclusivos:

```bash
pg_repack -d mydb -t customers -j 2
```

7. **Monitorea `pg_stat_progress_create_index`.** Rastrea el progreso de la creación de índices concurrentes para estimar el tiempo de finalización:

```sql
SELECT phase, blocks_done, blocks_total,
       tuples_done, tuples_total
FROM pg_stat_progress_create_index;
```

8. **Usa `temp_files` para detectar spill-to-disk.** Batch updates grandes que exceden `work_mem` hacen spill a disco, ralentizando la migración:

```sql
SELECT datname, temp_files, temp_bytes
FROM pg_stat_database
WHERE datname = 'mydb';
```

## Técnicas Avanzadas

### Migración con dual-write a nivel aplicación

Maneja migraciones completamente en la capa de aplicación sin triggers de base de datos:

```sql
-- Paso 1: agregar nueva columna (nullable)
ALTER TABLE customers ADD COLUMN email_address VARCHAR(255);

-- Paso 2: código de aplicación escribe a ambas columnas
-- (No se necesita trigger; la aplicación maneja la sincronización)

-- Paso 3: rellenar vía aplicación en lotes
-- La aplicación ejecuta: UPDATE customers SET email_address = email WHERE id BETWEEN ? AND ?

-- Paso 4: verificar paridad
SELECT COUNT(*) FROM customers WHERE email_address IS DISTINCT FROM email;

-- Paso 5: cambiar aplicación para leer de la nueva columna

-- Paso 6: eliminar columna vieja
ALTER TABLE customers DROP COLUMN email;
```

### Renombramiento seguro de columna usando migración de vista

Renombra una columna sin romper consultas existentes:

```sql
-- Paso 1: agregar nueva columna
ALTER TABLE customers ADD COLUMN email_new VARCHAR(255);

-- Paso 2: rellenar datos
UPDATE customers SET email_new = email WHERE email_new IS NULL;

-- Paso 3: crear vista con columna renombrada
CREATE OR REPLACE VIEW customers_v1 AS
SELECT id, name, email_new AS email, created_at
FROM customers;

-- Paso 4: migrar aplicación para usar la vista

-- Paso 5: eliminar columna vieja y renombrar la nueva
ALTER TABLE customers DROP COLUMN email;
ALTER TABLE customers RENAME COLUMN email_new TO email;

-- Paso 6: eliminar vista y usar tabla directamente
DROP VIEW customers_v1;
```

### Migración con check constraints para validación

Agrega constraints incrementalmente para validar datos durante la migración:

```sql
-- Paso 1: agregar nueva columna
ALTER TABLE orders ADD COLUMN total_cents INTEGER;

-- Paso 2: rellenar con validación
UPDATE orders SET total_cents = (total * 100)::INTEGER
WHERE total_cents IS NULL;

-- Paso 3: agregar constraint como NOT VALID (sin lock)
ALTER TABLE orders ADD CONSTRAINT chk_total_cents_positive
CHECK (total_cents >= 0) NOT VALID;

-- Paso 4: validar constraint después (lock breve)
ALTER TABLE orders VALIDATE CONSTRAINT chk_total_cents_positive;

-- Paso 5: si la validación pasa, proceder con cutover
```

### Manejo de migraciones de claves foráneas

Migra columnas de clave foránea sin romper integridad referencial:

```sql
-- Paso 1: agregar nueva columna FK (nullable)
ALTER TABLE orders ADD COLUMN customer_id_new INTEGER;

-- Paso 2: rellenar desde la FK vieja
UPDATE orders SET customer_id_new = customer_id WHERE customer_id_new IS NULL;

-- Paso 3: agregar constraint FK a la nueva columna
ALTER TABLE orders ADD CONSTRAINT fk_orders_customer_new
FOREIGN KEY (customer_id_new) REFERENCES customers(id);

-- Paso 4: cambiar aplicación para usar la nueva FK

-- Paso 5: eliminar FK vieja y columna
ALTER TABLE orders DROP CONSTRAINT fk_orders_customer;
ALTER TABLE orders DROP COLUMN customer_id;

-- Paso 6: renombrar nueva columna
ALTER TABLE orders RENAME COLUMN customer_id_new TO customer_id;
```

### Estrategia de rollback con columna shadow

Mantén una columna shadow para capacidad de rollback rápido:

```sql
-- Paso 1: agregar columna shadow (no usada por la app)
ALTER TABLE customers ADD COLUMN email_shadow VARCHAR(255);

-- Paso 2: rellenar columna shadow
UPDATE customers SET email_shadow = email WHERE email_shadow IS NULL;

-- Paso 3: proceder con migración principal
ALTER TABLE customers ADD COLUMN email_address VARCHAR(255);
-- ... rellenar email_address ...

-- Paso 4: si surgen problemas, rollback usando shadow
UPDATE customers SET email = email_shadow WHERE email IS NULL;

-- Paso 5: después de cutover exitoso, eliminar shadow
ALTER TABLE customers DROP COLUMN email_shadow;
```
