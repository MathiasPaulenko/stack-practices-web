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
  - database
  - schema
  - databases
  - sql
  - postgresql
relatedResources:
  - /recipes/database-transactions
  - /recipes/full-text-search
  - /recipes/soft-deletes
  - /recipes/input-validation
  - /recipes/uuid-generation
  - /recipes/event-sourcing-relational
  - /recipes/optimistic-locking
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
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

Database migrations evolve your schema as your application changes. Unsafe migrations — like adding a non-nullable column to a large table or dropping a column still referenced by old code — can cause downtime, data loss, or deployment failures. The solution below covers safe migration patterns using Alembic (Python), Knex.js (JavaScript), and Flyway (Java), plus zero-downtime deployment strategies.

## When to Use

Use this resource when:
- You're deploying schema changes to a production database with live traffic. See [Database Migrations](/recipes/databases/database-migrations) for tooling overview.
- You need to add, rename, or remove columns without breaking running applications. See [Input Validation](/recipes/api/input-validation) for schema safety.
- You're migrating data between tables or formats. See [Data Validation](/recipes/data/data-validation) for integrity checks.
- You want to establish a rollback plan before running any migration. See [Retry Logic](/recipes/architecture/retry-backoff) for recovery patterns.

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

## What Works

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
- **Monitor replication lag** if you're running against a primary with replicas. See [Read Replicas](/recipes/databases/database-read-replicas) for replication management.

### Batch backfill with Alembic

```python
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column

def upgrade():
    op.add_column("orders", sa.Column("status", sa.String(20), nullable=True))

    # Batch backfill in chunks of 5000
    conn = op.get_bind()
    while True:
        result = conn.execute(sa.text("""
            UPDATE orders
            SET status = 'completed'
            WHERE id IN (
                SELECT id FROM orders
                WHERE status IS NULL
                LIMIT 5000
            )
            RETURNING id
        """))
        if result.rowcount == 0:
            break
        print(f"Backfilled {result.rowcount} rows")

    # Add check constraint
    op.create_check_constraint(
        "chk_order_status",
        "orders",
        "status IN ('pending', 'processing', 'completed', 'cancelled')"
    )

def downgrade():
    op.drop_constraint("chk_order_status", "orders")
    op.drop_column("orders", "status")
```

### Rollback strategy with Knex.js

```javascript
exports.up = async function(knex) {
    await knex.schema.createTable('feature_flags', (table) => {
        table.increments('id');
        table.string('name', 100).notNullable().unique();
        table.boolean('enabled').defaultTo(false);
        table.timestamp('created_at').defaultTo(knex.fn.now());
    });

    // Seed initial flags
    await knex('feature_flags').insert([
        { name: 'new_checkout', enabled: false },
        { name: 'dark_mode', enabled: true }
    ]);
};

exports.down = async function(knex) {
    // Safe rollback: drop table only if it exists
    await knex.schema.dropTableIfExists('feature_flags');
};
```

### Testing migrations with Flyway

```java
// V4__add_indexes.sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
ON users (email);

// V5__add_foreign_key.sql
-- Add FK as NOT VALID first (fast, no table scan)
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_user_id
  FOREIGN KEY (user_id) REFERENCES users(id)
  NOT VALID;

-- Validate in a separate step (scans but doesn't block writes)
ALTER TABLE orders VALIDATE CONSTRAINT fk_orders_user_id;
```

```bash
# Test migrations on a copy of production data
flyway -url=jdbc:postgresql://staging:5432/mydb \
  -user=migration_user \
  -password=$STAGING_DB_PASS \
  -locations=filesystem:db/migrations \
  -cleanDisabled=false \
  migrate

# Verify with dry run
flyway -url=jdbc:postgresql://staging:5432/mydb \
  -user=migration_user \
  -password=$STAGING_DB_PASS \
  -locations=filesystem:db/migrations \
  info
```

## Additional Best Practices

6. **Set `lock_timeout` before DDL.** Prevents migrations from waiting indefinitely for locks:

```sql
SET lock_timeout = '10s';
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
```

7. **Use `statement_timeout` for batch operations.** Aborts backfills that run too long:

```sql
SET statement_timeout = '60s';
```

8. **Run `ANALYZE` after large backfills.** Updates planner statistics so queries choose optimal plans:

```sql
ANALYZE users;
```

9. **Create indexes concurrently.** `CREATE INDEX CONCURRENTLY` in PostgreSQL avoids blocking writes but cannot run inside a transaction.

10. **Use feature flags for schema-dependent code.** Decouple code deploys from schema changes:

```python
if feature_flags.is_enabled("use_full_name"):
    display = user.full_name
else:
    display = user.name
```

## Additional Common Mistakes

6. **Adding a column with a volatile default.** `ADD COLUMN ... DEFAULT random()` rewrites the entire table in PostgreSQL < 11. Use nullable + backfill instead.
7. **Not testing rollback scripts.** A rollback that fails is worse than no rollback. Test `downgrade()` on a staging copy.
8. **Running migrations inside application startup for large changes.** Use a separate migration step in CI/CD with approval gates.
9. **Forgetting to update statistics.** After large data changes, `ANALYZE` is needed for the query planner to pick correct plans.
10. **Dropping a column before all code stops reading it.** During rolling deploys, old instances may still reference the dropped column.

## Additional FAQ

### How do I add a foreign key without locking?

In PostgreSQL, add the constraint as `NOT VALID` first, then validate separately:

```sql
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_user_id
  FOREIGN KEY (user_id) REFERENCES users(id)
  NOT VALID;

ALTER TABLE orders VALIDATE CONSTRAINT fk_orders_user_id;
```

### What is the difference between `gh-ost` and `pt-online-schema-change`?

Both perform online schema changes for MySQL. `gh-ost` (GitHub) uses binlog for sync and avoids triggers. `pt-online-schema-change` uses triggers. `gh-ost` is preferred for high-write environments.

### How do I handle migrations in a blue-green deployment?

Deploy schema changes to the green environment first. Both blue and green must work with the new schema. Use expand-contract: expand schema, deploy new code, switch traffic, then contract old schema.

## Performance Tips

1. **Batch backfills with `LIMIT` and `sleep`.** Process 1,000-10,000 rows per batch with short pauses to minimize replication lag and lock contention.

2. **Use `CREATE INDEX CONCURRENTLY` for all production indexes.** Takes longer but doesn't block writes. Monitor progress via `pg_stat_progress_create_index`.

3. **Configure `work_mem` for migration sessions.** Increase it for large batch operations:

```sql
SET work_mem = '256MB';
```

4. **Monitor `pg_stat_activity` during migrations.** Watch for long-running queries and lock waits:

```sql
SELECT pid, state, wait_event_type, wait_event,
       now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;
```

5. **Use `pg_repack` for table bloat.** After large backfills, tables and indexes can become bloated. `pg_repack` rebuilds tables without exclusive locks.
