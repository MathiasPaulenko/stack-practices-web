---
contentType: recipes
slug: database-migrations-safely
title: "Migraciones de Base de Datos de Forma Segura"
description: "Cómo ejecutar migraciones de esquema de base de datos sin downtime ni pérdida de datos."
metaDescription: "Aprende migraciones seguras de base de datos para PostgreSQL, MySQL y SQLite. Cubre deploys sin downtime y planes de rollback."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - schema
relatedResources:
  - /recipes/database-transactions
  - /recipes/full-text-search
  - /recipes/soft-deletes
  - /recipes/input-validation
  - /recipes/uuid-generation
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende migraciones seguras de base de datos para PostgreSQL, MySQL y SQLite. Cubre deploys sin downtime y planes de rollback."
  keywords:
    - migraciones base de datos seguras
    - alembic migraciones
    - flyway java
    - knex migrations
    - zero downtime deploy sql
---
## Visión General

Las migraciones de base de datos evolucionan el esquema a medida que tu aplicación cambia. Migraciones inseguras — como agregar una columna no-nula a una tabla grande o eliminar una columna aún referenciada por código viejo — pueden causar downtime, pérdida de datos o fallos de despliegue. Esta receta cubre patrones de migración segura usando Alembic (Python), Knex.js (JavaScript) y Flyway (Java), más estrategias de despliegue sin downtime.

## Cuándo Usar

Usa este recurso cuando:
- Despliegues cambios de esquema a una base de datos productiva con tráfico en vivo. Consulta [Database Migrations](/recipes/databases/database-migrations) para panorama de herramientas.
- Necesites agregar, renombrar o remover columnas sin romper aplicaciones en ejecución. Consulta [Input Validation](/recipes/api/input-validation) para seguridad de schema.
- Migres datos entre tablas o formatos. Consulta [Data Validation](/recipes/data/data-validation) para verificación de integridad.
- Quieras establecer un plan de rollback antes de ejecutar cualquier migración. Consulta [Retry Logic](/recipes/architecture/retry-backoff) para patrones de recuperación.

## Solución

### Python (Alembic)

```python
# migración: agregar columna nullable, backfill, luego hacer non-nullable
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column

revision = "abc123"
down_revision = "xyz789"

def upgrade():
    # Paso 1: Agregar como nullable para que filas existentes no fallen
    op.add_column("users", sa.Column("display_name", sa.String(255), nullable=True))

    # Paso 2: Backfill con valor por defecto
    users = table("users", column("display_name"))
    op.execute(users.update().values(display_name="Usuario sin nombre"))

    # Paso 3: Ahora seguro hacer non-nullable
    op.alter_column("users", "display_name", nullable=False)

def downgrade():
    op.drop_column("users", "display_name")
```

### JavaScript (Knex.js)

```javascript
// migración: renombrado seguro de columna usando vistas o dual writes
exports.up = async function(knex) {
  // Fase 1: Agregar nueva columna, mantener columna vieja
  await knex.schema.table("users", (table) => {
    table.string("full_name", 255).nullable();
  });

  // Fase 2: Backfill desde columna vieja
  await knex("users").whereNull("full_name").update({
    full_name: knex.ref("name"),
  });

  // Fase 3: Hacer non-nullable en deploy posterior después de que todo el código escriba la nueva columna
  // await knex.schema.table("users", (table) => { table.string("full_name").notNullable().alter(); });
};

exports.down = async function(knex) {
  await knex.schema.table("users", (table) => {
    table.dropColumn("full_name");
  });
};
```

### Java (Flyway)

```java
// V2__add_user_status.sql
-- Agregar columna enum como text primero, migrar datos, luego agregar CHECK constraint en V3
ALTER TABLE users ADD COLUMN status VARCHAR(20) NULL;

UPDATE users SET status = 'active' WHERE status IS NULL;

-- V3__enforce_user_status.sql (desplegado en siguiente release)
-- ALTER TABLE users ALTER COLUMN status SET NOT NULL;
-- ALTER TABLE users ADD CONSTRAINT chk_status CHECK (status IN ('active', 'inactive', 'banned'));
```

## Explicación

Las migraciones seguras siguen el patrón **expand-contract** para cualquier cambio breaking:

1. **Expand**: Agrega el nuevo elemento de esquema (columna, tabla, índice) junto al viejo. Mantenlo opcional.
2. **Migrate**: Despliega código de aplicación que escriba en ambas estructuras vieja y nueva (dual-write).
3. **Contract**: Una vez que todos los paths de código viejo desaparecen, haz la nueva estructura requerida y remueve la vieja.

Este patrón garantiza que cualquier instancia en ejecución de tu app (incluyendo durante despliegues rolling) pueda leer y escribir sin errores.

## Variantes

| Estrategia | Cuándo Usar | Ejemplo |
|------------|-------------|---------|
| Expand-Contract | Renombrar columnas, cambiar tipos | Agregar `full_name`, dual-write, eliminar `name` |
| Online DDL (pt-online-schema-change) | Tablas MySQL grandes | Alter tablas de 100M+ filas sin locks |
| Creación de índices concurrente | Índices PostgreSQL | `CREATE INDEX CONCURRENTLY` para evitar locks de tabla |
| Backfill por lotes | Migraciones de tablas grandes | Actualizar 10k filas por transacción para evitar locks largos |
| Despliegue Blue/Green | Sistemas críticos | Ejecutar nuevo esquema en green, cambiar tráfico, luego eliminar viejo |

## Mejores Prácticas

- **Siempre haz nuevas columnas nullable primero**: Las filas existentes no deben fallar durante la migración.
- **Backfill antes de hacer non-nullable**: Actualiza filas existentes con valores sensatos antes de agregar `NOT NULL`.
- **Agrega índices concurrentemente**: En PostgreSQL, usa `CREATE INDEX CONCURRENTLY`; en MySQL, usa `pt-online-schema-change` o `ALGORITHM=INPLACE`.
- **Mantén migraciones idempotentes**: Ejecutar la misma migración dos veces debería ser seguro.
- **Versiona tus migraciones y prueba en copia**: Restaura un backup productivo a staging y ejecuta el suite completo de migraciones antes de producción.

## Errores Comunes

- **Agregar columna non-nullable sin default**: Bloquea la tabla mientras puebla cada fila, potencialmente por horas.
- **Eliminar columna aún leída por código viejo**: Los despliegues rolling ejecutan código viejo y nuevo simultáneamente; el código viejo fallará.
- **Ejecutar migraciones pesadas durante tráfico pico**: Programa cambios de esquema durante ventanas de mantenimiento o usa herramientas de online DDL.
- **Sin plan de rollback**: Cada migración debería tener un `downgrade` probado o script de revert.
- **Ignorar timeouts de lock**: Las migraciones de larga duración pueden exceder statement timeouts y dejar la base de datos en estado semi-migrado.

## Preguntas Frecuentes

### Cómo renombro una columna sin downtime?

Usa el patrón expand-contract: (1) Agrega la nueva columna, (2) Actualiza código de app para escribir en ambas columnas, (3) Backfill datos viejos a la nueva columna, (4) Cambia lecturas a la nueva columna, (5) Elimina la columna vieja. Esto abarca múltiples deploys pero es la única forma segura en producción.

### Puedo ejecutar migraciones automáticamente al iniciar la app?

Solo para migraciones no-breaking y rápidas (agregar columna nullable, crear índice concurrentemente). Para migraciones destructivas o lentas (eliminar columnas, cambiar tipos, backfill de datos), ejecútalas manualmente durante una ventana de mantenimiento o vía pipeline CI/CD con gates de aprobación. Nunca ejecutes migraciones riesgosas automáticamente.

### Cómo manejo migraciones en tablas grandes (100M+ filas)?

- Usa **herramientas de online DDL** (`pt-online-schema-change` para MySQL, `pg_repack` para PostgreSQL)
- **Backfill por lotes** en chunks de 1,000-10,000 filas con `COMMIT` entre lotes
- **Agrega índices concurrentemente** para evitar locking
- **Ejecuta durante ventanas de bajo tráfico** incluso con herramientas online
- **Monitorea lag de replicación** si corres contra un primary con réplicas. Consulta [Read Replicas](/recipes/databases/database-read-replicas) para gestión de replicación.
