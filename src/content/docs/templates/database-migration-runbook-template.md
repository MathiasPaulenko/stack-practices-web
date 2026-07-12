---





contentType: docs
slug: database-migration-runbook-template
templateType: database-migration-runbook
title: "Database Migration Runbook Template"
description: "A database migration runbook template for executing schema changes safely with rollback procedures, verification steps, and communication plans."
metaDescription: "Database migration runbook template: execute schema changes safely with rollback procedures, verification steps, and communication plans."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - rollback
  - runbook
  - template
  - databases
relatedResources:
  - /guides/sql-performance-tuning-guide
  - /guides/database-sharding-partitioning-guide
  - /docs/disaster-recovery-plan-template
  - /recipes/database-deadlocks-retries
  - /recipes/database-read-replicas
  - /recipes/event-sourcing-relational
  - /docs/database-schema-documentation-template
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Database migration runbook template: execute schema changes safely with rollback procedures, verification steps, and communication plans."
  keywords:
    - database migration runbook
    - schema change template
    - database deployment checklist
    - safe migration procedures
    - rollback database migration





---

# Database Migration Runbook Template

Use this template to execute database schema changes without downtime or data loss.

## Template

```markdown
# Database Migration Runbook: [Migration Name]

## Overview
| Field | Value |
|-------|-------|
| **Migration ID** | [timestamp or sequential number] |
| **Author** | [name] |
| **Reviewed by** | [name] |
| **Databases affected** | [list] |
| **Estimated duration** | [minutes / hours] |
| **Risk level** | [Low / Medium / High] |

## Pre-Migration Checklist

- [ ] Schema change reviewed by senior engineer
- [ ] Migration script tested on copy of production data
- [ ] Rollback script tested and timed
- [ ] Backups verified (last successful backup < 24 hours)
- [ ] Maintenance window scheduled (if needed)
- [ ] On-call notified
- [ ] Monitoring dashboards bookmarked

## Migration Steps

### Step 1: [Action]
```sql
-- Example: add nullable column
ALTER TABLE orders ADD COLUMN tracking_url VARCHAR(500) NULL;
```

### Step 2: [Action]
```sql
-- Example: create index concurrently
CREATE INDEX CONCURRENTLY idx_orders_tracking ON orders(tracking_url);
```

### Step 3: [Action]
```sql
-- Example: backfill data
UPDATE orders SET tracking_url = 'https://...' WHERE shipped_at IS NOT NULL;
```

## Verification

| Check | Query | Expected Result |
|-------|-------|-----------------|
| Schema applied | `\d orders` | Column `tracking_url` exists |
| Index created | `\di idx_orders_tracking` | Index is valid |
| No locks held | `pg_locks` | No long-running locks |
| App health | Dashboard | Error rate < baseline |

## Rollback Procedure

```sql
-- Step 1: drop index
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_tracking;

-- Step 2: drop column
ALTER TABLE orders DROP COLUMN IF EXISTS tracking_url;
```

| Rollback Step | Time to Complete | Verification |
|---------------|-----------------|-------------|
| Drop index | < 1 minute | Query plan reverts |
| Drop column | < 1 minute | Schema matches pre-migration |

## Post-Migration

- [ ] Application error rate normal
- [ ] Latency within baseline
- [ ] Replication lag acceptable
- [ ] On-call handoff notes updated
- [ ] Runbook archived with actual duration

## Communication

| Audience | Timing | Message |
|----------|--------|---------|
| Engineering | Before | Maintenance window announced |
| On-call | During | Real-time status updates |
| Stakeholders | After | All-clear + any issues encountered |
```

## Migration Safety Rules

| Rule | Why | Exception |
|------|-----|-----------|
| **Add columns as nullable** | Existing rows need a value | Supply default in same transaction |
| **Create indexes concurrently** | Avoids table locks | Not available on all databases |
| **Backfill in batches** | Prevents lock escalation | Small tables (< 1M rows) |
| **Test rollback first** | Rollback you have never practiced is a guess | None |
| **Run during low traffic** | Reduces blast radius | Emergency fixes |

## What works

- **Use expand-contract for breaking changes** — add new schema, deploy code, remove old schema in separate migrations
- **Batch large updates** — `UPDATE ... WHERE id BETWEEN 1 AND 10000` in a loop, with sleeps
- **Monitor replication lag** — large DDL can block replication; pause if lag exceeds thresholds. See [SQL Performance Tuning Guide](/guides/databases/sql-performance-tuning-guide) for monitoring strategies.
- **Keep migrations idempotent** — `IF NOT EXISTS` and `IF EXISTS` let you re-run safely
- **Document actual duration** — future estimates improve when you track reality

## Common Mistakes

- Running untested migrations in production — test on a copy with realistic data size. Document your schema with the [Database Schema Documentation Template](/docs/templates/database-schema-documentation-template).
- Forgetting to use `CONCURRENTLY` — locks the table for writes, causing outages
- Large transactions without batching — a single `UPDATE` on 100M rows will lock and rollback slowly
- No rollback plan — "we will figure it out" is not a plan
- Migrating during peak traffic — even safe migrations add load; schedule off-peak

## Frequently Asked Questions

### Should I use a migration tool or raw SQL?

Use a tool (Flyway, Liquibase, Django migrations, Rails migrations). See [SQL Performance Tuning Guide](/guides/databases/sql-performance-tuning-guide) and [Database Sharding Guide](/guides/databases/database-sharding-partitioning-guide) for related database guidelines. Tools track applied migrations, enforce ordering, and provide rollback hooks. Raw SQL scripts require manual tracking and are error-prone.

### How do I handle a failed migration in production?

Stop immediately. Do not apply subsequent migrations. Assess whether to rollback or fix forward. Rollback if data integrity is at risk. Fix forward if the fix is a small, well-understood script. Always have the rollback script ready before you start. For broader disaster planning, see the [Disaster Recovery Plan Template](/docs/templates/disaster-recovery-plan-template).

### Can I run migrations in a transaction?

Yes, for DDL-safe databases (PostgreSQL). For MySQL, DDL is implicitly committed, so transactions do not protect you. Know your database's behavior before you plan the migration strategy.


## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Schema migration | Expand/contract pattern | Zero downtime; compatible with old and new versions |
| Data migration | Backfill + verification | May take hours; run in background |
| Engine migration | Blue-green with replication | Switch from MySQL to PostgreSQL for example |
| Zero-downtime migration | Expand -> migrate -> contract | 3 phases; each deploy is independent |

## Migration Example: Add NOT NULL Column

```text
=== Migration: Add email_verified column (NOT NULL) ===

Service: user-service
Database: PostgreSQL (users table)
Risk: Medium (requires 3 deploys)
Estimated duration: 2 days

Phase 1: Expand (Deploy 1)
  - Add column as nullable:
    ALTER TABLE users ADD COLUMN email_verified BOOLEAN;
  - Deploy code that writes to new column:
    - On each login, set email_verified = true if email verified
    - On each signup, set email_verified = false
  - Backfill existing data:
    UPDATE users SET email_verified = true WHERE email IN (SELECT email FROM verified_emails);
    -- Run in batches of 1000 to avoid locking
  - Verify: SELECT count(*) FROM users WHERE email_verified IS NULL;
    -- Must be 0 after backfill

Phase 2: Migrate (Deploy 2)
  - Verify no NULLs remain:
    SELECT count(*) FROM users WHERE email_verified IS NULL; -- must be 0
  - Add NOT NULL constraint:
    ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;
  - Add default:
    ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT false;
  - Verify: try inserting without email_verified -> should use default

Phase 3: Contract (Deploy 3)
  - Remove code that handles NULL case (no longer possible)
  - Remove backfill code
  - Verify app works correctly
  - Monitor errors for 24 hours

Rollback:
  - Phase 1: ALTER TABLE users DROP COLUMN email_verified;
  - Phase 2: ALTER TABLE users ALTER COLUMN email_verified DROP NOT NULL;
  - Phase 3: Cannot easily revert; keep defensive code

Post-Migration Verification:
  - All users have email_verified non-NULL
  - New signups have email_verified = false
  - Logins verify email correctly
  - No errors in logs related to the column
```

### How do we handle database migrations with zero downtime?

Use the expand-contract pattern: Phase 1 (Expand) adds the new structure without breaking the old — both old and new app versions work. Phase 2 (Migrate) moves data and applies constraints when safe. Phase 3 (Contract) removes the old structure. Each phase is an independent deploy. Never run an ALTER that locks the table in production — use tools like pt-online-schema-change (MySQL) or CREATE INDEX CONCURRENTLY (PostgreSQL). For NOT NULL columns: add as nullable first, backfill, then add the constraint. For column renames: add the new one, write to both, migrate reads, then remove the old one.

### What do we do if a migration fails mid-way?

If a migration fails: assess the current database state. If the migration did not start: do nothing, fix the script and retry. If the migration started but did not complete: determine if it is safe to resume or if you need to roll back. For migrations with transactions: rollback is automatic. For non-transactional migrations (DDL in MySQL): roll back manually with a prepared rollback script. If data was modified: use the backup to compare and restore if needed. Document the failure and the cause. Never force a failed migration — investigate the root cause first. Communicate to the team if the migration affects availability.

### How do we test migrations before production?

Test migrations in an environment that replicates production: use a production dump (sanitized if needed) in staging. Run the migration and measure time. Verify the app works with the new schema. Test the rollback — it must work and restore the previous state. Test with large data volumes — a migration that takes 1 second with 100 rows may take hours with 10 million. Run the migration with the app under load to detect locks. Use a post-migration verification checklist. If the migration has multiple phases: test each phase independently and the full sequence.





































































End of document. Review and update quarterly.