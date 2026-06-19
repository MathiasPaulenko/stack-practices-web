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

Los schemas de base de datos deben evolucionar a medida que las aplicaciones crecen, pero los cambios de schema son una causa principal de outages en producción. El patrón expand-contract, online DDL y migraciones backward-compatible permiten a los equipos agregar features sin downtime. Este recurso cubre técnicas prácticas para evolucionar schemas en PostgreSQL, MySQL y bases de datos distribuidas manteniendo la integridad de datos y disponibilidad de aplicaciones.

## Cuándo Usar

Usa este recurso cuando:
- Agregas columnas, índices o constraints a tablas con millones de filas
- Necesitas renombrar columnas o separar tablas sin romper aplicaciones en ejecución
- Ejecutas migraciones en un pipeline CI/CD que despliega múltiples veces al día
- Trabajas con bases de datos distribuidas donde los cambios de schema se propagan asíncronamente

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

## Mejores Prácticas

- **Nunca dropees antes de agregar**: Siempre agrega el reemplazo antes de remover el original
- **Usa `IF EXISTS` y `IF NOT EXISTS`**: Previene fallas de migración en runs parciales
- **Batch backfills**: Update 1,000-10,000 filas por transacción para evitar locks largos
- **Testea migraciones en datos de tamaño producción**: `pg_dump` + restore a staging no es suficiente
- **Versiona tus migraciones**: Flyway, Liquibase o Atlas para tracking y rollback

## Errores Comunes

1. **Migraciones big-bang**: Ejecutar `ALTER TABLE` en una tabla de 100M filas sin `CONCURRENTLY`
2. **Sin testear rollback**: Si el deploy falla, ¿puedes revertir el cambio de schema?
3. **Falta de compatibilidad de aplicación**: Nuevo schema rompe código viejo durante rolling deployments
4. **Ignorar timeouts de lock**: `statement_timeout` de PostgreSQL aborta migraciones largas impredeciblemente
5. **Sin dry runs**: Ejecutar migraciones directamente en producción sin `EXPLAIN` o validación de staging

## Preguntas Frecuentes

**P: ¿Cómo renombro una columna sin downtime?**
R: Agregar nueva columna → dual write → migrar datos → update readers → drop columna vieja. Nunca renombres in-place.

**P: ¿Puedo usar transacciones para cambios de schema?**
R: PostgreSQL soporta DDL transaccional. MySQL commitea implícitamente después de cada statement DDL.

**P: ¿Cómo manejo cambios de schema en microservicios?**
R: Cada servicio es dueño de su schema. Usa schema-per-service. Bases de datos compartidas crean acoplamiento que hace los cambios de schema peligrosos.
