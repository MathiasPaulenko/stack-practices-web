---




contentType: recipes
slug: database-migrations
title: "Manage Database Migrations Safely"
description: "How to version, apply, and rollback database schema changes using migration tools like Flyway, Alembic, and Liquibase in production environments."
metaDescription: "Learn database migrations with Flyway, Alembic, and Liquibase. Version, apply, and rollback schema changes safely in production environments."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - ci-cd
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
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Learn database migrations with Flyway, Alembic, and Liquibase. Version, apply, and rollback schema changes safely in production environments."
  keywords:
    - database migrations
    - schema versioning
    - flyway
    - alembic
    - liquibase
    - sql migrations
    - database deployment




---

## Overview

Database migrations track, version, and apply schema changes over time. Without a migration system, schema changes are applied manually through ad-hoc SQL scripts, SSH sessions, and prayer. This leads to environments that diverge, deployment failures, and production outages caused by forgotten indexes or missing columns.

A migration tool turns schema changes into versioned, repeatable, and reversible scripts. Each migration is numbered or timestamped, tracked in a dedicated history table, and applied automatically during deployment. Rollbacks are scripted and tested, not improvised. Here is how to the three most widely adopted tools: Flyway (JVM), Alembic (Python), and Liquibase (multi-language).

## When to Use

Use this recipe when:

- Managing schema evolution across development, staging, and production databases. See [Safe Migrations](/recipes/databases/database-migrations-safely) for zero-downtime strategies.
- Adding tables, columns, indexes, or constraints as part of a feature release. See [Database Transactions](/recipes/databases/database-transactions) for consistency during deploys.
- Coordinating schema changes with application code deployments. See [Clean Code Guide](/guides/design/clean-code-principles-guide) for maintainable patterns.
- Rolling back schema changes after failed deployments. See [Retry Logic](/recipes/architecture/retry-backoff) for recovery strategies.
- Auditing who changed what in the database and when

## Solution

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

## Explanation

- **Versioned scripts**: Each migration file has a unique identifier. Tools record applied migrations in a history table (`flyway_schema_history`, `alembic_version`, `databasechangelog`), preventing duplicate execution.
- **Forward migrations (up)**: Schema changes that move the database forward — creating tables, adding columns, creating indexes. These run automatically during deployment.
- **Rollback migrations (down)**: Reverse operations that undo forward migrations — dropping columns, removing indexes, deleting tables. Test these on staging before production emergencies.
- **Baseline and repair**: When introducing migrations to an existing database, tools can baseline current schema state without attempting to recreate existing tables.

## Variants

| Tool | Format | Language | Best For |
|------|--------|----------|----------|
| Flyway | Plain SQL | JVM-first | Teams that prefer raw SQL |
| Alembic | Python code | Python/SQLAlchemy | Python ecosystems |
| Liquibase | XML/YAML/JSON | Multi-language | Enterprise, multi-DB support |
| Sequelize CLI | JS code | Node.js | Express/NestJS projects |

## What Works

- **Never modify an already-applied migration**: once a migration runs in any shared environment, treat it as immutable. Create a new migration to fix mistakes.
- **Make migrations idempotent when possible**: `CREATE TABLE IF NOT EXISTS` and `DROP INDEX IF EXISTS` prevent failures during repeated execution.
- **Separate DDL and DML**: schema changes (CREATE, ALTER) and data changes (INSERT, UPDATE) should be in different migrations. DDL often locks tables; DML can be batched.
- **Test rollbacks on every change**: a migration without a tested rollback is a one-way door. Practice downgrades in staging to confirm they work.
- **Run migrations before application startup**: deploy the schema change, then deploy the code that depends on it. Never assume the column exists before the migration runs.

## Common Mistakes

- **Adding non-nullable columns without defaults**: existing rows will cause the migration to fail. Add the column as nullable, backfill data, then add the `NOT NULL` constraint in a follow-up migration. See [Safe Migrations](/recipes/databases/database-migrations-safely) for the expand-contract pattern.
- **Deleting data without backups**: dropping a column destroys data permanently. Always back up or copy data before destructive changes.
- **Locking tables during peak hours**: adding an index or altering a large table can lock for minutes. Schedule heavy migrations during maintenance windows or use online schema change tools.
- **Forgetting about replicas**: migrations applied to a primary database may not replicate correctly if they contain non-deterministic functions or temporary tables.

## FAQ

**Q: Should migrations be in the same repository as application code?**
A: Yes. Keeping migrations and code together ensures every branch contains the schema it needs, and CI can validate both simultaneously.

**Q: How do I handle migrations in a CI/CD pipeline?**
A: Run migrations as a dedicated deployment step before starting the new application version. Use a locking mechanism to prevent concurrent migration runs.

**Q: Can I automate rollback on deployment failure?**
A: Some teams automatically downgrade after a failed health check, but be cautious — rollbacks can also fail. Test rollback procedures thoroughly.

**Q: What is the difference between migrations and seeds?**
A: Migrations change schema structure. Seeds insert reference data (roles, countries, settings). Keep them separate so migrations remain reversible.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### Expand-Contract Pattern for Zero-Downtime Migrations

The expand-contract pattern splits schema changes into multiple deployments, avoiding downtime on large tables:

```sql
-- Phase 1: Expand (backward-compatible)
-- Add nullable column, create new table, add index
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT NULL;
CREATE INDEX CONCURRENTLY idx_users_email_verified ON users(email_verified);

-- Phase 2: Migrate data (batch backfill)
UPDATE users SET email_verified = false WHERE email_verified IS NULL AND id <= 10000;
UPDATE users SET email_verified = false WHERE email_verified IS NULL AND id <= 20000;
-- Continue in batches until all rows are set

-- Phase 3: Contract (after all application instances use new schema)
ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT false;
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;
DROP INDEX IF EXISTS idx_users_old_email;
```

### Online Schema Changes with `pg_repack`

```bash
# Rebuild a table without holding an exclusive lock
pg_repack -d mydb -t users -j 2

# Rebuild indexes concurrently
pg_repack -d mydb -t users --index idx_users_email
```

`pg_repack` creates a shadow table, copies data, swaps tables using a brief lock, and syncs changes via triggers. Use it for `VACUUM FULL` alternatives on production tables.

### Alembic Autogenerate and Manual Revision

```python
# Auto-detect schema changes between models and database
alembic revision --autogenerate -m "add_user_preferences"

# The generated migration may need manual review:
# - Column order may differ
# - Server defaults may be missing
# - Constraints may need manual adjustment

# Manual revision for complex changes
alembic revision -m "add_user_preferences"

# In the generated file:
def upgrade():
    # Add column as nullable first
    op.add_column('users', sa.Column('preferences', sa.JSON(), nullable=True))

    # Backfill default values in batches
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

    # Set NOT NULL after backfill
    op.alter_column('users', 'preferences', nullable=False)

def downgrade():
    op.drop_column('users', 'preferences')
```

### Flyway Baseline for Existing Databases

```bash
# Baseline an existing database at version 5
flyway -url=jdbc:postgresql://db:5432/app -baselineVersion=5 -baselineDescription="Existing schema" baseline

# Now only migrations V6+ will run
flyway -url=jdbc:postgresql://db:5432/app migrate
```

### Liquibase Labels and Contexts

```xml
<changeSet id="3" author="developer" labels="v2.0,production" context="production">
    <addColumn tableName="orders">
        <column name="shipping_address" type="varchar(500)"/>
    </addColumn>
</changeSet>
```

```bash
# Run only production-labeled changesets
liquibase --changeLogFile=db.changelog.xml --labels=production update

# Rollback by tag
liquibase --changeLogFile=db.changelog.xml rollback v2.0
```

### Sequelize CLI Migrations (Node.js)

```javascript
// migrations/20250613-add-user-status.js
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'status', {
      type: Sequelize.STRING(20),
      defaultValue: 'active',
      allowNull: true,
    });

    // Backfill in batches
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




## Performance Tips

1. **Use `SET statement_timeout` for migrations.** Prevent a migration from running indefinitely:

```sql
SET statement_timeout = '300s';
-- Run migration
SET statement_timeout = '0'; -- Reset to default
```

2. **Batch large data backfills.** Update 1,000-10,000 rows per batch to avoid long transactions:

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
        PERFORM pg_sleep(0.1); -- Brief pause to reduce load
    END LOOP;
END $$;
```

3. **Use `ALTER TABLE ... SET TABLESPACE` for large tables.** Move tables to faster storage during maintenance windows:

```sql
ALTER TABLE large_table SET TABLESPACE fast_ssd;
```

4. **Monitor migration progress with `pg_stat_progress_create_index`.** Track index creation progress in PostgreSQL 12+:

```sql
SELECT phase, blocks_done, blocks_total,
       ROUND(blocks_done::numeric / NULLIF(blocks_total, 0) * 100, 2) AS pct
FROM pg_stat_progress_create_index;
```

5. **Use `CONCURRENTLY` for all index operations in production.** `CREATE INDEX CONCURRENTLY`, `DROP INDEX CONCURRENTLY`, and `REINDEX CONCURRENTLY` avoid blocking writes.
