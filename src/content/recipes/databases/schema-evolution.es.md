---
contentType: recipes
slug: schema-evolution
title: "Evolución de Schema de Base de Datos"
description: "Evoluciona schemas de base de datos de forma segura con cambios backward-compatible, migraciones versionadas y operaciones DDL online en ambientes de producción."
metaDescription: "Evolución de schema de base de datos: cambios backward-compatible, migraciones versionadas, DDL online, patrón expand-contract y cambios seguros en producción."
difficulty: advanced
topics:
  - databases
tags:
  - schema-evolution
  - databases
  - devops
  - migrations
  - sql
relatedResources:
  - /recipes/cursor-pagination-postgresql
  - /recipes/uuid-generation-strategies
  - /recipes/database-connection-pooling
  - /recipes/database-replication
  - /recipes/postgres-query-optimization
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Evolución de schema de base de datos: cambios backward-compatible, migraciones versionadas, DDL online, patrón expand-contract y cambios seguros en producción."
  keywords:
    - schema-evolution
    - databases
    - devops
    - migrations
---
## Visión General

Los schemas de base de datos deben evolucionar a medida que las aplicaciones crecen, pero los cambios de schema son una causa principal de [outages en producción](/guides/devops/on-call-incident-response-guide). El patrón expand-contract, online DDL y migraciones backward-compatible permiten a los equipos agregar capacidades sin downtime. Este recurso cubre técnicas prácticas para evolucionar schemas en PostgreSQL, MySQL y bases de datos distribuidas manteniendo la integridad de datos y disponibilidad de aplicaciones.

## Cuándo Usar

Usa este recurso cuando:
- Agregas columnas, índices o constraints a tablas con millones de filas
- Necesitas renombrar columnas o separar tablas sin romper aplicaciones en ejecución
- Ejecutas migraciones en un [pipeline CI/CD](/guides/devops/cicd-pipeline-guide) que despliega múltiples veces al día
- Trabajas con [bases de datos distribuidas](/recipes/databases/database-replication) donde los cambios de schema se propagan asíncronamente

## Solución

### Expand-Contract Pattern (PostgreSQL)

```sql
-- FASE 1: EXPAND - Agregar nueva columna sin romper código existente
ALTER TABLE users ADD COLUMN email_normalized VARCHAR(255);
CREATE INDEX CONCURRENTLY idx_users_email_normalized ON users(email_normalized);

-- Backfill en batches para evitar locking
UPDATE users 
SET email_normalized = LOWER(email)
WHERE id BETWEEN 1 AND 10000;

-- FASE 2: DUAL WRITE - Aplicación escribe a ambas columnas
-- (Desplegar código que escribe a email y email_normalized)

-- FASE 3: CONTRACT - Remover columna vieja después de verificación
ALTER TABLE users DROP COLUMN email;
ALTER TABLE users RENAME COLUMN email_normalized TO email;
```

### Online DDL con pt-online-schema-change (MySQL)

```bash
# Agregar un índice sin lockear la tabla
pt-online-schema-change \
  --alter "ADD INDEX idx_created_at (created_at)" \
  --execute \
  --max-load Threads_running=25 \
  --critical-load Threads_running=50 \
  D=mydb,t=orders
```

### Flyway Migration (Java/Spring)

```java
// V1.2__Add_user_preferences.sql
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    theme VARCHAR(20) DEFAULT 'light',
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_theme ON user_preferences(theme);
```

## Explicación

**El patrón expand-contract**:
1. **Expand**: Agregar nuevos elementos de schema (columnas, tablas) sin remover los viejos
2. **Migrate**: Backfill de datos; correr dual-write durante la transición
3. **Verify**: Asegurar que paths nuevos y viejos producen resultados idénticos
4. **Contract**: Remover elementos deprecados una vez que todo el código usa el nuevo schema

**Online vs. offline DDL**:

| Base de Datos | Online DDL | Nivel de Lock |
|---------------|------------|---------------|
| PostgreSQL | `CREATE INDEX CONCURRENTLY` | Ninguno |
| MySQL | `ALGORITHM=INPLACE` | Breve metadata |
| MySQL (tablas grandes) | `pt-online-schema-change` | Copy a nivel de fila |
| SQL Server | `ONLINE=ON` | Schema stability |

## Variantes

| Enfoque | Ideal Para | Tooling |
|---------|------------|---------|
| Expand-contract | Renames zero-downtime | Manual + cambios de aplicación |
| Online DDL | Cambios de índice en tablas grandes | pt-online-schema-change, gh-ost |
| Blue-green schema | Reestructuración mayor | Dos bases de datos + dual-write |
| Logical replication | Migración cross-version | pglogical, Debezium |

## Lo que funciona

- **Nunca dropees antes de agregar**: Siempre agrega el reemplazo antes de remover el original
- **Usa `IF EXISTS` y `IF NOT EXISTS`**: Previene fallas de migración en runs parciales
- **Batch backfills**: Update 1,000-10,000 filas por transacción para evitar locks largos
- **Testea migraciones en datos de tamaño producción**: `pg_dump` + restore a staging no es suficiente
- **Versiona tus migraciones**: Flyway, Liquibase o Atlas para tracking y rollback

## Errores Comunes

1. **Migraciones big-bang**: Ejecutar `ALTER TABLE` en una tabla de 100M filas sin `CONCURRENTLY`
2. **Sin testear rollback**: Si el deploy falla, ¿puedes revertir el cambio de schema? Testea [estrategias de despliegue](/guides/devops/deployment-strategies-guide).
3. **Falta de compatibilidad de aplicación**: Nuevo schema rompe código viejo durante rolling deployments
4. **Ignorar timeouts de lock**: `statement_timeout` de PostgreSQL aborta migraciones largas impredeciblemente. Consulta [connection pooling](/recipes/performance/connection-pooling).
5. **Sin dry runs**: Ejecutar migraciones directamente en producción sin `EXPLAIN` o validación de staging

## Preguntas Frecuentes

**P: ¿Cómo renombro una columna sin downtime?**
R: Agregar nueva columna → dual write → migrar datos → update readers → drop columna vieja. Nunca renombres in-place.

**P: ¿Puedo usar transacciones para cambios de schema?**
R: PostgreSQL soporta DDL transaccional. MySQL commitea implícitamente después de cada statement DDL.

**P: ¿Cómo manejo cambios de schema en microservicios?**
R: Cada servicio es dueño de su schema. Usa schema-per-service. [Bases de datos compartidas](/guides/databases/database-design-guide) crean acoplamiento que hace los cambios de schema peligrosos.

### Migración con Liquibase (XML)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-3.8.xsd">

    <changeSet id="add-phone-column" author="team">
        <addColumn tableName="users">
            <column name="phone" type="VARCHAR(20)" />
        </addColumn>
    </changeSet>

    <changeSet id="backfill-phone" author="team">
        <sql>
            UPDATE users SET phone = phone_number
            WHERE phone IS NULL AND phone_number IS NOT NULL
        </sql>
    </changeSet>

    <changeSet id="drop-old-phone" author="team">
        <dropColumn tableName="users" columnName="phone_number" />
    </changeSet>
</databaseChangeLog>
```

### gh-ost para cambios de schema online en MySQL

```bash
# Agregar una columna sin lockear la tabla usando gh-ost de GitHub
gh-ost \
  --host=localhost \
  --user=root \
  --password=pass \
  --database=mydb \
  --table=orders \
  --alter="ADD COLUMN priority INT DEFAULT 0" \
  --execute \
  --max-load=Threads_running=25 \
  --critical-load=Threads_running=50 \
  --chunk-size=1000
```

### Agregar un constraint NOT NULL de forma segura

```sql
-- Paso 1: Agregar columna como nullable
ALTER TABLE products ADD COLUMN sku VARCHAR(50);

-- Paso 2: Rellenar todas las filas
UPDATE products SET sku = CONCAT('SKU-', id) WHERE sku IS NULL;

-- Paso 3: Agregar constraint NOT NULL (rápido una vez que todas las filas están pobladas)
ALTER TABLE products ALTER COLUMN sku SET NOT NULL;

-- Paso 4: Agregar índice único concurrentemente
CREATE UNIQUE INDEX CONCURRENTLY idx_products_sku ON products(sku);
```

### Separar una columna en dos

```sql
-- Expand: agregar nuevas columnas
ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN last_name VARCHAR(100);

-- Trigger de dual-write
CREATE OR REPLACE FUNCTION split_name() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.first_name IS DISTINCT FROM OLD.first_name
     OR NEW.last_name IS DISTINCT FROM OLD.last_name THEN
    NEW.full_name := NEW.first_name || ' ' || NEW.last_name;
  ELSIF NEW.full_name IS DISTINCT FROM OLD.full_name THEN
    NEW.first_name := split_part(NEW.full_name, ' ', 1);
    NEW.last_name := split_part(NEW.full_name, ' ', 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_split_name
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION split_name();

-- Backfill
UPDATE users
SET first_name = split_part(full_name, ' ', 1),
    last_name = split_part(full_name, ' ', 2)
WHERE first_name IS NULL AND full_name IS NOT NULL;
```

## Buenas prácticas adicionales

6. **Usa `CREATE INDEX CONCURRENTLY` en PostgreSQL.** Esto evita bloquear escrituras pero no puede ejecutarse dentro de una transacción. Planifica tus scripts de migración accordingly.
7. **Configura `lock_timeout` para operaciones DDL.** Esto previene que una migración espere indefinidamente por un lock:

```sql
SET lock_timeout = '5s';
ALTER TABLE users ADD COLUMN status VARCHAR(20);
```

8. **Usa `NOT VALID` para check constraints.** Agrega constraints como `NOT VALID` para saltarte el escaneo de filas existentes, luego valida en un paso separado:

```sql
ALTER TABLE orders ADD CONSTRAINT chk_amount CHECK (amount > 0) NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT chk_amount;
```

9. **Documenta cada migración.** Incluye la razón, duración esperada, plan de rollback y pasos de verificación en los comentarios o changelog de tu herramienta de migración.

10. **Ejecuta migraciones en staging primero.** Mide timing, comportamiento de locks y uso de recursos. Usa datos de tamaño producción para estimaciones precisas.

## Errores comunes adicionales

6. **Agregar una columna con un default volátil.** En PostgreSQL versiones anteriores a 11, `ADD COLUMN ... DEFAULT random()` reescribe la tabla completa. Usa una columna nullable y backfill en su lugar.
7. **No manejar valores NULL durante cambios de tipo.** Al cambiar de `VARCHAR` a `INTEGER`, NULLs y strings no numéricos causarán errores. Limpia los datos primero.
8. **Olvidar actualizar estadísticas.** Después de backfills grandes, ejecuta `ANALYZE` para que el query planner tenga estadísticas precisas:

```sql
ANALYZE users;
```

9. **Ejecutar migraciones durante tráfico pico.** Incluso migraciones zero-downtime añaden carga. Programa backfills durante horas valle para minimizar impacto.
10. **No tener un plan de rollback para cada migración.** Cada migración debe tener un procedimiento de rollback documentado. Pruébalo en staging antes de desplegar.

## Preguntas frecuentes adicionales

**P: ¿Cómo agrego una foreign key sin lockear?**
R: En PostgreSQL, agrega el constraint como `NOT VALID` primero, luego valida por separado:

```sql
-- Agregar sin escanear filas existentes (rápido)
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_user
  FOREIGN KEY (user_id) REFERENCES users(id)
  NOT VALID;

-- Validar en un paso separado (escanea filas pero no bloquea escrituras)
ALTER TABLE orders VALIDATE CONSTRAINT fk_orders_user;
```

**P: ¿Cuál es la diferencia entre `gh-ost` y `pt-online-schema-change`?**
R: Ambos realizan cambios de schema online para MySQL creando una tabla shadow. `gh-ost` (herramienta de GitHub) usa binlog para sincronización y no usa triggers. `pt-online-schema-change` usa triggers. `gh-ost` es generalmente preferido para entornos de alta escritura porque evita el overhead de triggers.

**P: ¿Cómo manejo cambios de schema en un despliegue blue-green?**
R: Ambos entornos blue y green deben funcionar con el schema viejo y el nuevo. Usa el patrón expand-contract: despliega el schema expandido primero, luego despliega el código nuevo, luego contrae el schema viejo después de cambiar el tráfico.

## Tips de Rendimiento

1. **Batch backfills con `LIMIT` y `sleep`.** Procesa 1,000-10,000 filas por lote con una pausa corta para minimizar lag de replicación y contención de locks.

2. **Usa `CREATE INDEX CONCURRENTLY` para todos los índices en producción.** Toma más tiempo pero no bloquea escrituras. Monitorea el progreso via `pg_stat_progress_create_index`.

3. **Ejecuta `ANALYZE` después de cambios grandes de datos.** El query planner necesita estadísticas actualizadas para elegir planes óptimos:

```sql
ANALYZE VERBOSE users;
```

4. **Configura `statement_timeout` para sesiones de migración.** Previene que DDL descontrolado bloquee la base de datos:

```sql
SET statement_timeout = '60s';
```

5. **Monitorea el lag de replicación durante backfills.** Pausa el backfill si el lag de réplica excede tu umbral:

```sql
SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;
```
