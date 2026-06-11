---
contentType: recipes
slug: database-migrations-safely
title: "Database Migrations Safely"
description: "How to run database schema migrations without downtime or data loss."
metaDescription: "Learn safe database migration strategies for PostgreSQL, MySQL, and SQLite. Covers zero-downtime deploys, backward-compatible changes, and rollback plans."
difficulty: intermediate
topics:
  - databases
tags:
  - migrations
  - database
  - schema
  - deploy
  - zero-downtime
  - alembic
  - flyway
  - python
  - javascript
  - java
relatedResources:
  - /recipes/database-transactions
  - /recipes/full-text-search
  - /recipes/soft-deletes
  - /recipes/input-validation
  - /recipes/uuid-generation
lastUpdated: "2026-06-11"
author: "StackPractices"
seo:
  metaDescription: "Learn safe database migration strategies for PostgreSQL, MySQL, and SQLite. Covers zero-downtime deploys, backward-compatible changes, and rollback plans."
  keywords:
    - migrations
    - database
    - schema
    - deploy
    - zero-downtime
    - alembic
    - flyway
    - python
    - javascript
    - java
---
## Overview

Database migrations evolve your schema as your application changes. Unsafe migrations — like adding a non-nullable column to a large table or dropping a column still referenced by old code — can cause downtime, data loss, or deployment failures. This recipe covers safe migration patterns using Alembic (Python), Knex.js (JavaScript), and Flyway (Java), plus zero-downtime deployment strategies.

## When to Use

Use this resource when:
- You're deploying schema changes to a production database with live traffic
- You need to add, rename, or remove columns without breaking running applications
- You're migrating data between tables or formats
- You want to establish a rollback plan before running any migration

## Solution

### Python (Alembic)

```python
# migration: add new nullable column, backfill, then make non-nullable
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column

revision = "abc123"
down_revision = "xyz789"

def upgrade():
    # Step 1: Add as nullable so existing rows don't fail
    op.add_column("users", sa.Column("display_name", sa.String(255), nullable=True))

    # Step 2: Backfill with default value
    users = table("users", column("display_name"))
    op.execute(users.update().values(display_name="Unnamed User"))

    # Step 3: Now safe to make non-nullable
    op.alter_column("users", "display_name", nullable=False)

def downgrade():
    op.drop_column("users", "display_name")
```

### JavaScript (Knex.js)

```javascript
// migration: safe column rename using views or dual writes
exports.up = async function(knex) {
  // Phase 1: Add new column, keep old column
  await knex.schema.table("users", (table) => {
    table.string("full_name", 255).nullable();
  });

  // Phase 2: Backfill from old column
  await knex("users").whereNull("full_name").update({
    full_name: knex.ref("name"),
  });

  // Phase 3: Make non-nullable in a later deploy after all code writes new column
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
-- Add enum column as text first, migrate data, then add CHECK constraint in V3
ALTER TABLE users ADD COLUMN status VARCHAR(20) NULL;

UPDATE users SET status = 'active' WHERE status IS NULL;

-- V3__enforce_user_status.sql (deployed in next release)
-- ALTER TABLE users ALTER COLUMN status SET NOT NULL;
-- ALTER TABLE users ADD CONSTRAINT chk_status CHECK (status IN ('active', 'inactive', 'banned'));
```

## Explanation

Safe migrations follow the **expand-contract** pattern for any breaking change:

1. **Expand**: Add the new schema element (column, table, index) alongside the old one. Keep it optional.
2. **Migrate**: Deploy application code that writes to both old and new structures (dual-write).
3. **Contract**: Once all old code paths are gone, make the new structure required and remove the old one.

This pattern guarantees that any running instance of your app (including during rolling deploys) can read and write without errors.

## Variants

| Strategy | When to Use | Example |
|----------|-------------|---------|
| Expand-Contract | Renaming columns, changing types | Add `full_name`, dual-write, drop `name` |
| Online DDL (pt-online-schema-change) | MySQL large tables | Alter 100M+ row tables without locks |
| Concurrent index creation | PostgreSQL indexes | `CREATE INDEX CONCURRENTLY` to avoid table locks |
| Backfill in batches | Large table migrations | Update 10k rows per transaction to avoid long locks |
| Blue/Green deploy | Critical systems | Run new schema on green, switch traffic, then drop old |

## Best Practices

- **Always make new columns nullable first**: Existing rows must not fail during the migration.
- **Backfill before making non-nullable**: Update existing rows with sensible defaults before adding `NOT NULL`.
- **Add indexes concurrently**: On PostgreSQL, use `CREATE INDEX CONCURRENTLY`; on MySQL, use `pt-online-schema-change` or `ALGORITHM=INPLACE`.
- **Keep migrations idempotent**: Running the same migration twice should be safe.
- **Version your migrations and test on a copy**: Restore a production backup to a staging environment and run the full migration suite before production.

## Common Mistakes

- **Adding a non-nullable column without a default**: Locks the table while populating every row, potentially for hours.
- **Dropping a column still read by old code**: Rolling deployments run old and new code simultaneously; the old code will crash.
- **Running heavy migrations during peak traffic**: Schedule schema changes during maintenance windows or use online DDL tools.
- **No rollback plan**: Every migration should have a tested `downgrade` or revert script.
- **Ignoring lock timeouts**: Long-running migrations can exceed statement timeouts and leave the database in a half-migrated state.

## Frequently Asked Questions

### How do I rename a column without downtime?

Use the expand-contract pattern: (1) Add the new column, (2) Update app code to write to both columns, (3) Backfill old data to the new column, (4) Switch reads to the new column, (5) Remove the old column. This spans multiple deploys but is the only safe way in production.

### Can I run migrations automatically on app startup?

Only for non-breaking, fast migrations (adding a nullable column, creating an index concurrently). For destructive or slow migrations (dropping columns, changing types, backfilling data), run them manually during a maintenance window or via a CI/CD pipeline with approval gates. Never auto-run risky migrations.

### How do I handle migrations on large tables (100M+ rows)?

- Use **online DDL tools** (`pt-online-schema-change` for MySQL, `pg_repack` for PostgreSQL)
- **Batch backfills** in chunks of 1,000-10,000 rows with `COMMIT` between batches
- **Add indexes concurrently** to avoid locking
- **Run during low-traffic windows** even with online tools
- **Monitor replication lag** if you're running against a primary with replicas
