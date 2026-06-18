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
  - alembic
  - ci-cd
relatedResources:
  - /recipes/database-indexing
  - /recipes/query-optimization
  - /recipes/connection-pooling
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
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

A migration tool turns schema changes into versioned, repeatable, and reversible scripts. Each migration is numbered or timestamped, tracked in a dedicated history table, and applied automatically during deployment. Rollbacks are scripted and tested, not improvised. This recipe covers the three most widely adopted tools: Flyway (JVM), Alembic (Python), and Liquibase (multi-language).

## When to Use

Use this recipe when:

- Managing schema evolution across development, staging, and production databases
- Adding tables, columns, indexes, or constraints as part of a feature release
- Coordinating schema changes with application code deployments
- Rolling back schema changes after failed deployments
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

## Best Practices

- **Never modify an already-applied migration**: once a migration runs in any shared environment, treat it as immutable. Create a new migration to fix mistakes.
- **Make migrations idempotent when possible**: `CREATE TABLE IF NOT EXISTS` and `DROP INDEX IF EXISTS` prevent failures during repeated execution.
- **Separate DDL and DML**: schema changes (CREATE, ALTER) and data changes (INSERT, UPDATE) should be in different migrations. DDL often locks tables; DML can be batched.
- **Test rollbacks on every change**: a migration without a tested rollback is a one-way door. Practice downgrades in staging to confirm they work.
- **Run migrations before application startup**: deploy the schema change, then deploy the code that depends on it. Never assume the column exists before the migration runs.

## Common Mistakes

- **Adding non-nullable columns without defaults**: existing rows will cause the migration to fail. Add the column as nullable, backfill data, then add the `NOT NULL` constraint in a follow-up migration.
- **Deleting data without backups**: dropping a column destroys data permanently. Always back up or copy data before destructive changes.
- **Locking tables during peak hours**: adding an index or altering a large table can lock for minutes. Schedule heavy migrations during maintenance windows or use online schema change tools.
- **Forgetting about replicas**: migrations applied to a primary database may not replicate correctly if they contain non-deterministic functions or temporary tables.

## Frequently Asked Questions

**Q: Should migrations be in the same repository as application code?**
A: Yes. Keeping migrations and code together ensures every branch contains the schema it needs, and CI can validate both simultaneously.

**Q: How do I handle migrations in a CI/CD pipeline?**
A: Run migrations as a dedicated deployment step before starting the new application version. Use a locking mechanism to prevent concurrent migration runs.

**Q: Can I automate rollback on deployment failure?**
A: Some teams automatically downgrade after a failed health check, but be cautious — rollbacks can also fail. Test rollback procedures thoroughly.

**Q: What is the difference between migrations and seeds?**
A: Migrations change schema structure. Seeds insert reference data (roles, countries, settings). Keep them separate so migrations remain reversible.

