---


contentType: recipes
slug: schema-evolution
title: "Database Schema Evolution"
description: "Evolve database schemas safely with backward-compatible changes, versioned migrations, and online DDL operations in production environments."
metaDescription: "Database schema evolution: backward-compatible changes, versioned migrations, online DDL, expand-contract pattern, and safe schema changes in production."
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
  - /recipes/caching-redis
  - /recipes/database-migrations
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Database schema evolution: backward-compatible changes, versioned migrations, online DDL, expand-contract pattern, and safe schema changes in production."
  keywords:
    - schema-evolution
    - databases
    - devops
    - migrations


---
## Overview

Database schemas must evolve as applications grow, but schema changes are a leading cause of [production outages](/guides/devops/on-call-incident-response-guide). The expand-contract pattern, online DDL, and backward-compatible migrations allow teams to add capabilities without downtime. This resource covers practical techniques for evolving schemas in PostgreSQL, MySQL, and distributed databases while maintaining data integrity and application availability.

## When to Use

Use this resource when:
- Adding columns, indexes, or constraints to tables with millions of rows
- You need to rename columns or split tables without breaking running applications
- Running migrations in a [CI/CD pipeline](/guides/devops/cicd-pipeline-guide) that deploys multiple times daily
- Working with [distributed databases](/recipes/databases/database-replication) where schema changes propagate asynchronously

## Solution

### Expand-Contract Pattern (PostgreSQL)

```sql
-- PHASE 1: EXPAND - Add new column without breaking existing code
ALTER TABLE users ADD COLUMN email_normalized VARCHAR(255);
CREATE INDEX CONCURRENTLY idx_users_email_normalized ON users(email_normalized);

-- Backfill in batches to avoid locking
UPDATE users 
SET email_normalized = LOWER(email)
WHERE id BETWEEN 1 AND 10000;

-- PHASE 2: DUAL WRITE - Application writes to both columns
-- (Deploy code that writes to email and email_normalized)

-- PHASE 3: CONTRACT - Remove old column after verification
ALTER TABLE users DROP COLUMN email;
ALTER TABLE users RENAME COLUMN email_normalized TO email;
```

### Online DDL with pt-online-schema-change (MySQL)

```bash
# Add an index without locking the table
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

## Explanation

**The expand-contract pattern**:
1. **Expand**: Add new schema elements (columns, tables) without removing old ones
2. **Migrate**: Backfill data; run dual-write during transition
3. **Verify**: Ensure new and old paths produce identical results
4. **Contract**: Remove deprecated elements once all code uses the new schema

**Online vs. offline DDL**:

| Database | Online DDL | Lock Level |
|----------|------------|------------|
| PostgreSQL | `CREATE INDEX CONCURRENTLY` | None |
| MySQL | `ALGORITHM=INPLACE` | Brief metadata |
| MySQL (large tables) | `pt-online-schema-change` | Row-level copy |
| SQL Server | `ONLINE=ON` | Schema stability |

## Variants

| Approach | Best For | Tooling |
|----------|----------|---------|
| Expand-contract | Zero-downtime renames | Manual + application changes |
| Online DDL | Large table index changes | pt-online-schema-change, gh-ost |
| Blue-green schema | Major restructuring | Two databases + dual-write |
| Logical replication | Cross-version migration | pglogical, Debezium |

## What Works

- **Never drop before adding**: Always add the replacement before removing the original
- **Use `IF EXISTS` and `IF NOT EXISTS`**: Prevents migration failures on partial runs
- **Batch backfills**: Update 1,000-10,000 rows per transaction to avoid long locks
- **Test migrations on production-sized data**: `pg_dump` + restore to staging isn't enough
- **Version your migrations**: Flyway, Liquibase, or Atlas for tracking and rollback

## Common Mistakes

1. **Big-bang migrations**: Running `ALTER TABLE` on a 100M-row table without `CONCURRENTLY`
2. **Not testing rollback**: If the deploy fails, can you revert the schema change? Test [deployment strategies](/guides/devops/deployment-strategies-guide).
3. **Missing application compatibility**: New schema breaks old code during rolling deployments
4. **Ignoring lock timeouts**: PostgreSQL `statement_timeout` aborts long migrations unpredictably. See [connection pooling](/recipes/performance/connection-pooling).
5. **No dry runs**: Running migrations directly in production without `EXPLAIN` or staging validation

## Frequently Asked Questions

**Q: How do I rename a column without downtime?**
A: Add new column → dual write → migrate data → update readers → drop old column. Never rename in place.

**Q: Can I use transactions for schema changes?**
A: PostgreSQL supports transactional DDL. MySQL commits implicitly after each DDL statement.

**Q: How do I handle schema changes in microservices?**
A: Each service owns its schema. Use schema-per-service. [Shared databases](/guides/databases/database-design-guide) create coupling that makes schema changes dangerous.

### Liquibase Migration (XML)

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

### gh-ost for MySQL online schema changes

```bash
# Add a column without locking the table using GitHub's gh-ost
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

### Adding a NOT NULL constraint safely

```sql
-- Step 1: Add column as nullable
ALTER TABLE products ADD COLUMN sku VARCHAR(50);

-- Step 2: Backfill all rows
UPDATE products SET sku = CONCAT('SKU-', id) WHERE sku IS NULL;

-- Step 3: Add NOT NULL constraint (fast once all rows are populated)
ALTER TABLE products ALTER COLUMN sku SET NOT NULL;

-- Step 4: Add unique index concurrently
CREATE UNIQUE INDEX CONCURRENTLY idx_products_sku ON products(sku);
```

### Splitting a column into two

```sql
-- Expand: add new columns
ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN last_name VARCHAR(100);

-- Dual-write trigger
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

## Additional Best Practices

6. **Use `CREATE INDEX CONCURRENTLY` in PostgreSQL.** This avoids blocking writes but cannot run inside a transaction. Plan your migration scripts accordingly.
7. **Set `lock_timeout` for DDL operations.** This prevents a migration from waiting indefinitely for a lock:

```sql
SET lock_timeout = '5s';
ALTER TABLE users ADD COLUMN status VARCHAR(20);
```

8. **Use `NOT VALID` for check constraints.** Add constraints as `NOT VALID` to skip scanning existing rows, then validate in a separate step:

```sql
ALTER TABLE orders ADD CONSTRAINT chk_amount CHECK (amount > 0) NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT chk_amount;
```

9. **Document each migration.** Include the reason, expected duration, rollback plan, and verification steps in your migration tool's comments or changelog.

10. **Run migrations in staging first.** Measure timing, lock behavior, and resource usage. Use production-sized data for accurate estimates.

## Additional Common Mistakes

6. **Adding a column with a volatile default.** In PostgreSQL versions before 11, `ADD COLUMN ... DEFAULT random()` rewrites the entire table. Use a nullable column and backfill instead.
7. **Not handling NULL values during type changes.** When changing from `VARCHAR` to `INTEGER`, NULLs and non-numeric strings will cause errors. Clean the data first.
8. **Forgetting to update statistics.** After large backfills, run `ANALYZE` so the query planner has accurate statistics:

```sql
ANALYZE users;
```

9. **Running migrations during peak traffic.** Even zero-downtime migrations add load. Schedule backfills during off-peak hours to minimize impact.
10. **Not having a rollback plan for each migration.** Every migration should have a documented rollback procedure. Test it in staging before deploying.

## Additional FAQ

**Q: How do I add a foreign key without locking?**
A: In PostgreSQL, add the constraint as `NOT VALID` first, then validate it separately:

```sql
-- Add without scanning existing rows (fast)
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_user
  FOREIGN KEY (user_id) REFERENCES users(id)
  NOT VALID;

-- Validate in a separate step (scans rows but doesn't block writes)
ALTER TABLE orders VALIDATE CONSTRAINT fk_orders_user;
```

**Q: What is the difference between `gh-ost` and `pt-online-schema-change`?**
A: Both perform online schema changes for MySQL by creating a shadow table. `gh-ost` (GitHub's tool) uses binlog for synchronization and has no triggers. `pt-online-schema-change` uses triggers. `gh-ost` is generally preferred for high-write environments because it avoids trigger overhead.

**Q: How do I handle schema changes in a blue-green deployment?**
A: Both blue and green environments must work with both the old and new schema. Use the expand-contract pattern: deploy the expanded schema first, then deploy the new code, then contract the old schema after switching traffic.

## Performance Tips

1. **Batch backfills with `LIMIT` and `sleep`.** Process 1,000-10,000 rows per batch with a short pause to minimize replication lag and lock contention.

2. **Use `CREATE INDEX CONCURRENTLY` for all production indexes.** This takes longer but does not block writes. Monitor progress via `pg_stat_progress_create_index`.

3. **Run `ANALYZE` after large data changes.** The query planner needs up-to-date statistics to choose optimal plans:

```sql
ANALYZE VERBOSE users;
```

4. **Set `statement_timeout` for migration sessions.** Prevent runaway DDL from blocking the database:

```sql
SET statement_timeout = '60s';
```

5. **Monitor replication lag during backfills.** Pause backfilling if replica lag exceeds your threshold:

```sql
SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;
```
