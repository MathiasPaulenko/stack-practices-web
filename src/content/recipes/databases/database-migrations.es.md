---
contentType: recipes
slug: database-migrations
title: "Gestionar Migraciones de Base de Datos de Forma Segura"
description: "Cómo versionar, aplicar y hacer rollback de cambios de schema de base de datos usando herramientas como Flyway, Alembic y Liquibase en entornos de producción."
metaDescription: "Aprende migraciones de base de datos con Flyway, Alembic y Liquibase. Versiona, aplica y haz rollback de cambios de schema de forma segura en producción."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - ci-cd
relatedResources:
  - /recipes/database-indexing
  - /recipes/query-optimization
  - /recipes/connection-pooling
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende migraciones de base de datos con Flyway, Alembic y Liquibase. Versiona, aplica y haz rollback de cambios de schema de forma segura en producción."
  keywords:
    - database migrations
    - schema versioning
    - flyway
    - alembic
    - liquibase
    - sql migrations
    - database deployment
---

## Visión general

Las migraciones de base de datos rastrean, versionan y aplican cambios de schema a lo largo del tiempo. Sin un sistema de migración, los cambios de schema se aplican manualmente a través de scripts SQL ad-hoc, sesiones SSH y oración. Esto lleva a entornos que divergen, fallas de deployment y outages en producción causados por índices olvidados o columnas faltantes.

Una herramienta de migración convierte los cambios de schema en scripts versionados, repetibles y reversibles. Cada migración está numerada o timestamped, trackeada en una tabla de historial dedicada, y aplicada automáticamente durante el deployment. Los rollbacks están scripteados y testeados, no improvisados. Esta receta cubre las tres herramientas más ampliamente adoptadas: Flyway (JVM), Alembic (Python) y Liquibase (multi-lenguaje).

## Cuándo usarlo

Usa esta receta cuando:

- Gestionando la evolución de schema a través de bases de datos de desarrollo, staging y producción
- Agregando tablas, columnas, índices o constraints como parte de un release de feature
- Coordinando cambios de schema con deployments de código de aplicación
- Haciendo rollback de cambios de schema después de deployments fallidos
- Auditando quién cambió qué en la base de datos y cuándo

## Solución

### Flyway (JVM/SQL)

```sql
-- V1__create_users_table.sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- V2__add_user_status.sql
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';

-- V3__create_user_index.sql
CREATE INDEX idx_users_email ON users(email);
```

```bash
flyway -url=jdbc:postgresql://db:5432/app -locations=filesystem:db/migration migrate
```

### Alembic (Python/SQLAlchemy)

```python
# alembic/versions/20250613_add_user_status.py
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4'
down_revision = '9f8e7d6c'

def upgrade():
    op.add_column('users', sa.Column('status', sa.String(20), nullable=True))
    op.execute("UPDATE users SET status = 'active' WHERE status IS NULL")
    op.alter_column('users', 'status', nullable=False)

def downgrade():
    op.drop_column('users', 'status')
```

```bash
alembic upgrade head
alembic downgrade -1
```

### Liquibase (XML/YAML/JSON)

```xml
<databaseChangeLog>
    <changeSet id="1" author="developer">
        <createTable tableName="users">
            <column name="id" type="int" autoIncrement="true">
                <constraints primaryKey="true"/>
            </column>
            <column name="email" type="varchar(255)">
                <constraints nullable="false" unique="true"/>
            </column>
        </createTable>
    </changeSet>
    <changeSet id="2" author="developer">
        <addColumn tableName="users">
            <column name="status" type="varchar(20)" defaultValue="active"/>
        </addColumn>
    </changeSet>
</databaseChangeLog>
```

```bash
liquibase --changeLogFile=db.changelog.xml update
```

## Explicación

- **Scripts versionados**: Cada archivo de migración tiene un identificador único. Las herramientas registran las migraciones aplicadas en una tabla de historial (`flyway_schema_history`, `alembic_version`, `databasechangelog`), previniendo ejecución duplicada.
- **Migraciones forward (up)**: Cambios de schema que avanzan la base de datos — crear tablas, agregar columnas, crear índices. Estas corren automáticamente durante el deployment.
- **Migraciones rollback (down)**: Operaciones inversas que deshacen migraciones forward — eliminar columnas, remover índices, eliminar tablas. Testéalos en staging antes de emergencias en producción.
- **Baseline y repair**: Cuando introduces migraciones a una base de datos existente, las herramientas pueden hacer baseline del estado actual del schema sin intentar recrear tablas existentes.

## Variantes

| Herramienta | Formato | Lenguaje | Mejor para |
|-------------|---------|----------|------------|
| Flyway | SQL plano | JVM-first | Equipos que prefieren SQL crudo |
| Alembic | Código Python | Python/SQLAlchemy | Ecosistemas Python |
| Liquibase | XML/YAML/JSON | Multi-lenguaje | Enterprise, soporte multi-DB |
| Sequelize CLI | Código JS | Node.js | Proyectos Express/NestJS |

## Mejores prácticas

- **Nunca modifiques una migración ya aplicada**: una vez que una migración corre en cualquier entorno compartido, trátala como inmutable. Crea una nueva migración para corregir errores.
- **Haz migraciones idempotentes cuando sea posible**: `CREATE TABLE IF NOT EXISTS` y `DROP INDEX IF EXISTS` previenen fallas durante ejecución repetida.
- **Separa DDL y DML**: los cambios de schema (CREATE, ALTER) y los cambios de datos (INSERT, UPDATE) deberían estar en migraciones diferentes. DDL frecuentemente bloquea tablas; DML puede batcherse.
- **Testea rollbacks en cada cambio**: una migración sin rollback testeado es una puerta de un solo sentido. Practica downgrades en staging para confirmar que funcionan.
- **Corre migraciones antes del inicio de la aplicación**: deploy el cambio de schema, luego deploy el código que depende de él. Nunca asumas que la columna existe antes de que la migración corra.

## Errores comunes

- **Agregar columnas non-nullable sin defaults**: las filas existentes causarán que la migración falle. Agrega la columna como nullable, backfillea datos, luego agrega el constraint `NOT NULL` en una migración follow-up.
- **Eliminar datos sin backups**: eliminar una columna destruye datos permanentemente. Siempre haz backup o copia datos antes de cambios destructivos.
- **Bloquear tablas durante horas pico**: agregar un índice o alterar una tabla grande puede bloquear por minutos. Programa migraciones pesadas durante ventanas de mantenimiento o usa herramientas de schema change online.
- **Olvidar réplicas**: las migraciones aplicadas a una base de datos primaria pueden no replicarse correctamente si contienen funciones no determinísticas o tablas temporales.

## Preguntas frecuentes

**P: ¿Las migraciones deberían estar en el mismo repositorio que el código de aplicación?**
R: Sí. Mantener migraciones y código juntos asegura que cada branch contiene el schema que necesita, y CI puede validar ambos simultáneamente.

**P: ¿Cómo manejo migraciones en un pipeline CI/CD?**
R: Corre migraciones como un paso dedicado de deployment antes de iniciar la nueva versión de la aplicación. Usa un mecanismo de locking para prevenir ejecuciones concurrentes de migraciones.

**P: ¿Puedo automatizar rollback en falla de deployment?**
R: Algunos equipos hacen downgrade automáticamente después de un health check fallido, pero sé cauteloso — los rollbacks también pueden fallar. Testea procedimientos de rollback exhaustivamente.

**P: ¿Cuál es la diferencia entre migraciones y seeds?**
R: Las migraciones cambian la estructura del schema. Los seeds insertan datos de referencia (roles, países, settings). Mantenlos separados para que las migraciones permanezcan reversibles.

