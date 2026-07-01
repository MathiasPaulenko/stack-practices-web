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
relatedResources:
  - /recipes/cursor-pagination-postgresql
  - /recipes/uuid-generation-strategies
  - /recipes/database-connection-pooling
  - /recipes/database-replication
  - /recipes/postgres-query-optimization
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
