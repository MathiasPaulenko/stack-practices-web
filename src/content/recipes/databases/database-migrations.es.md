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
  - databases
  - sql
  - postgresql
relatedResources:
  - /recipes/database-indexing
  - /recipes/query-optimization
  - /recipes/connection-pooling
  - /recipes/optimistic-locking
  - /recipes/schema-evolution
  - /recipes/sql-full-text-search-setup
  - /recipes/sql-window-functions-ranking
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

Una herramienta de migración convierte los cambios de schema en scripts versionados, repetibles y reversibles. Cada migración está numerada o timestamped, trackeada en una tabla de historial dedicada, y aplicada automáticamente durante el deployment. Los rollbacks están scripteados y testeados, no improvisados. La solucion a continuacion cubre las tres herramientas más ampliamente adoptadas: Flyway (JVM), Alembic (Python) y Liquibase (multi-lenguaje).

## Cuándo usarlo

Usa esta receta cuando:

- Gestionando la evolución de schema a través de bases de datos de desarrollo, staging y producción. Consulta [Safe Migrations](/recipes/databases/database-migrations-safely) para estrategias sin downtime.
- Agregando tablas, columnas, índices o constraints como parte de un release de feature. Consulta [Database Transactions](/recipes/databases/database-transactions) para consistencia durante despliegues.
- Coordinando cambios de schema con deployments de código de aplicación. Consulta [Clean Code Guide](/guides/design/clean-code-principles-guide) para patrones mantenibles.
- Haciendo rollback de cambios de schema después de deployments fallidos. Consulta [Retry Logic](/recipes/architecture/retry-backoff) para estrategias de recuperación.
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

## Lo que funciona

- **Nunca modifiques una migración ya aplicada**: una vez que una migración corre en cualquier entorno compartido, trátala como inmutable. Crea una nueva migración para corregir errores.
- **Haz migraciones idempotentes cuando sea posible**: `CREATE TABLE IF NOT EXISTS` y `DROP INDEX IF EXISTS` previenen fallas durante ejecución repetida.
- **Separa DDL y DML**: los cambios de schema (CREATE, ALTER) y los cambios de datos (INSERT, UPDATE) deberían estar en migraciones diferentes. DDL frecuentemente bloquea tablas; DML puede batcherse.
- **Testea rollbacks en cada cambio**: una migración sin rollback testeado es una puerta de un solo sentido. Practica downgrades en staging para confirmar que funcionan.
- **Corre migraciones antes del inicio de la aplicación**: deploy el cambio de schema, luego deploy el código que depende de él. Nunca asumas que la columna existe antes de que la migración corra.

## Errores comunes

- **Agregar columnas non-nullable sin defaults**: las filas existentes causarán que la migración falle. Agrega la columna como nullable, backfillea datos, luego agrega el constraint `NOT NULL` en una migración follow-up. Consulta [Safe Migrations](/recipes/databases/database-migrations-safely) para el patrón expand-contract.
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


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Patrón Expand-Contract para Migraciones Sin Downtime

El patrón expand-contract divide los cambios de schema en múltiples despliegues, evitando downtime en tablas grandes:

```sql
-- Fase 1: Expand (compatible hacia atrás)
-- Añadir columna nullable, crear nueva tabla, añadir índice
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT NULL;
CREATE INDEX CONCURRENTLY idx_users_email_verified ON users(email_verified);

-- Fase 2: Migrar datos (backfill en lotes)
UPDATE users SET email_verified = false WHERE email_verified IS NULL AND id <= 10000;
UPDATE users SET email_verified = false WHERE email_verified IS NULL AND id <= 20000;
-- Continuar en lotes hasta que todas las filas estén listas

-- Fase 3: Contract (después de que todas las instancias usen el nuevo schema)
ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT false;
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;
DROP INDEX IF EXISTS idx_users_old_email;
```

### Cambios de Schema Online con `pg_repack`

```bash
# Reconstruir una tabla sin mantener un lock exclusivo
pg_repack -d mydb -t users -j 2

# Reconstruir índices concurrentemente
pg_repack -d mydb -t users --index idx_users_email
```

`pg_repack` crea una tabla sombra, copia los datos, intercambia tablas usando un lock breve y sincroniza cambios via triggers. Úsalo como alternativa a `VACUUM FULL` en tablas de producción.

### Alembic Autogenerate y Revisión Manual

```python
# Detectar automáticamente cambios de schema entre modelos y base de datos
alembic revision --autogenerate -m "add_user_preferences"

# La migración generada puede necesitar revisión manual:
# - El orden de columnas puede diferir
# - Los defaults del servidor pueden faltar
# - Las restricciones pueden necesitar ajuste manual

# Revisión manual para cambios complejos
alembic revision -m "add_user_preferences"

# En el archivo generado:
def upgrade():
    # Añadir columna como nullable primero
    op.add_column('users', sa.Column('preferences', sa.JSON(), nullable=True))

    # Backfill de valores por defecto en lotes
    connection = op.get_bind()
    batch_size = 1000
    offset = 0
    while True:
        result = connection.execute(text(
            "UPDATE users SET preferences = '{}' "
            "WHERE preferences IS NULL AND id > :offset AND id <= :limit"
        ), {"offset": offset, "limit": offset + batch_size})
        if result.rowcount == 0:
            break
        offset += batch_size

    # Establecer NOT NULL después del backfill
    op.alter_column('users', 'preferences', nullable=False)

def downgrade():
    op.drop_column('users', 'preferences')
```

### Flyway Baseline para Bases de Datos Existentes

```bash
# Hacer baseline de una base de datos existente en versión 5
flyway -url=jdbc:postgresql://db:5432/app -baselineVersion=5 -baselineDescription="Existing schema" baseline

# Ahora solo las migraciones V6+ se ejecutarán
flyway -url=jdbc:postgresql://db:5432/app migrate
```

### Liquibase Labels y Contexts

```xml
<changeSet id="3" author="developer" labels="v2.0,production" context="production">
    <addColumn tableName="orders">
        <column name="shipping_address" type="varchar(500)"/>
    </addColumn>
</changeSet>
```

```bash
# Ejecutar solo changesets con label de producción
liquibase --changeLogFile=db.changelog.xml --labels=production update

# Rollback por tag
liquibase --changeLogFile=db.changelog.xml rollback v2.0
```

### Migraciones con Sequelize CLI (Node.js)

```javascript
// migrations/20250613-add-user-status.js
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'status', {
      type: Sequelize.STRING(20),
      defaultValue: 'active',
      allowNull: true,
    });

    // Backfill en lotes
    const [results] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE status IS NULL"
    );

    for (const row of results) {
      await queryInterface.sequelize.query(
        "UPDATE users SET status = 'active' WHERE id = :id",
        { replacements: { id: row.id } }
      );
    }

    await queryInterface.changeColumn('users', 'status', {
      type: Sequelize.STRING(20),
      allowNull: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'status');
  },
};
```

```bash
npx sequelize-cli migration:generate --name add-user-status
npx sequelize-cli db:migrate
npx sequelize-cli db:migrate:undo
```

## Mejores Prácticas Adicionales

6. **Usa `CREATE INDEX CONCURRENTLY` en PostgreSQL.** Esto evita bloquear escrituras durante la creación de índices:

```sql
CREATE INDEX CONCURRENTLY idx_users_email_lower ON users (lower(email));
```

7. **Divide migraciones grandes en pasos pequeños.** Una migración que añade una columna, hace backfill de 10M de filas y añade una restricción en una transacción mantendrá locks demasiado tiempo. Divídela en 3 migraciones separadas.

8. **Usa restricciones `CHECK` con `NOT VALID` primero.** Añade la restricción sin validar filas existentes, luego valida por separado:

```sql
ALTER TABLE users ADD CONSTRAINT chk_email_format CHECK (email ~ '@' ) NOT VALID;
ALTER TABLE users VALIDATE CONSTRAINT chk_email_format;
```

9. **Prueba migraciones con una copia de datos de producción.** Usa `pg_dump` para crear una copia de staging y ejecuta las migraciones contra ella:

```bash
pg_dump --format=custom --file=prod_dump.pgdump mydb
pg_restore --dbname=staging_db --jobs=4 prod_dump.pgdump
alembic upgrade head
```

10. **Fija la versión de la herramienta de migración en CI.** Diferentes versiones de Flyway o Alembic pueden comportarse distinto. Bloquea la versión en tu pipeline de CI:

```yaml
# .github/workflows/migrate.yml
- name: Run Flyway
  run: |
    docker run --rm \
      -v $(pwd)/db/migration:/flyway/sql \
      flyway/flyway:10.12.0 \
      -url=jdbc:postgresql://$DB_HOST:5432/$DB_NAME \
      -user=$DB_USER -password=$DB_PASS \
      migrate
```

## Errores Comunes Adicionales

5. **Ejecutar migraciones durante el despliegue sin un lock.** Dos pods iniciando simultáneamente pueden intentar ejecutar migraciones al mismo tiempo. Usa un advisory lock o un job de migración dedicado:

```sql
SELECT pg_advisory_lock(99999);
-- Ejecutar migraciones
SELECT pg_advisory_unlock(99999);
```

6. **No probar rollbacks en CI.** Aplica migraciones, luego haz rollback, luego aplica de nuevo. Si cualquier paso falla, CI debería detectarlo antes de producción.

7. **Usar `DROP TABLE` en una migración que puede tener vistas dependientes.** PostgreSQL lo previene, pero MySQL con `RESTRICT` puede fallar silenciosamente. Verifica dependencias primero:

```sql
SELECT dependee.relname AS dependent_object
FROM pg_depend JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class AS dependee ON pg_depend.refobjid = dependee.oid
JOIN pg_class AS dependency ON pg_depend.classid = dependency.oid
WHERE dependency.relname = 'users';
```

8. **Ignorar el tiempo de ejecución de migraciones en CI.** Una migración que tarda 30 segundos localmente puede tardar 10 minutos en una tabla de tamaño de producción. Configura timeouts y monitorea el tiempo de ejecución.

## FAQ Adicional

**P: ¿Cómo manejo migraciones en una arquitectura de microservicios?**

Cada servicio debe ser dueño de su base de datos y migraciones. Nunca compartas una migración entre servicios. Usa un servicio runner de migraciones compartido o incluye migraciones en el pipeline de despliegue de cada servicio. Coordina cambios de schema entre servicios mediante contratos de API, no tablas compartidas.

**P: ¿Qué pasa si una migración falla a mitad de camino en producción?**

La mayoría de herramientas lo manejan: Flyway marca la migración como fallida en `flyway_schema_history`, Alembic deja la base de datos en el estado en que la transacción fallida la dejó. Corrige el script de migración, repara la tabla de historial (`flyway repair`) y vuelve a ejecutar. Siempre ten un runbook para migraciones fallidas.

**P: ¿Debo usar migraciones SQL o migraciones basadas en código?**

Las migraciones SQL son transparentes y nativas de base de datos. Las migraciones basadas en código (Alembic, Sequelize) ofrecen control programático para backfills de datos y lógica condicional. Usa SQL para DDL simple, código para migraciones de datos complejas. Ambas pueden coexistir en el mismo proyecto.

**P: ¿Cómo versiono archivos de migración entre equipos?**

Usa versionado basado en timestamps (`20250613_120000_add_user_status`) en lugar de números secuenciales. Esto previene conflictos de merge cuando múltiples desarrolladores crean migraciones simultáneamente. Flyway, Alembic y Sequelize soportan ordenamiento por timestamp.

## Tips de Rendimiento

1. **Usa `SET statement_timeout` para migraciones.** Evita que una migración se ejecute indefinidamente:

```sql
SET statement_timeout = '300s';
-- Ejecutar migración
SET statement_timeout = '0'; -- Reset al default
```

2. **Haz backfill de datos grandes en lotes.** Actualiza 1.000-10.000 filas por lote para evitar transacciones largas:

```sql
DO $$
DECLARE
    batch_size INT := 5000;
    offset_val INT := 0;
    rows_affected INT;
BEGIN
    LOOP
        UPDATE users SET status = 'active'
        WHERE id > offset_val AND id <= offset_val + batch_size AND status IS NULL;
        GET DIAGNOSTICS rows_affected = ROW_COUNT;
        EXIT WHEN rows_affected = 0;
        offset_val := offset_val + batch_size;
        PERFORM pg_sleep(0.1); -- Pausa breve para reducir carga
    END LOOP;
END $$;
```

3. **Usa `ALTER TABLE ... SET TABLESPACE` para tablas grandes.** Mueve tablas a almacenamiento más rápido durante ventanas de mantenimiento:

```sql
ALTER TABLE large_table SET TABLESPACE fast_ssd;
```

4. **Monitorea el progreso de migraciones con `pg_stat_progress_create_index`.** Rastrea el progreso de creación de índices en PostgreSQL 12+:

```sql
SELECT phase, blocks_done, blocks_total,
       ROUND(blocks_done::numeric / NULLIF(blocks_total, 0) * 100, 2) AS pct
FROM pg_stat_progress_create_index;
```

5. **Usa `CONCURRENTLY` para todas las operaciones de índice en producción.** `CREATE INDEX CONCURRENTLY`, `DROP INDEX CONCURRENTLY` y `REINDEX CONCURRENTLY` evitan bloquear escrituras.
