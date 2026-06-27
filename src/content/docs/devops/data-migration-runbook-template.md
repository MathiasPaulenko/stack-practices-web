---
contentType: docs
slug: data-migration-runbook-template
title: "Data Migration Runbook Template"
description: "A runbook template for safely migrating data between systems including pre-migration checks, rollback procedures, and post-migration validation."
metaDescription: "Migrate data safely with this runbook template. Covers pre-migration checks, execution steps, rollback procedures, and post-migration validation."
difficulty: advanced
topics:
  - devops
  - databases
  - data
tags:
  - runbook
  - data-migration
  - database
  - etl
  - rollback
  - validation
relatedResources:
  - /docs/devops/runbook-database-failover
  - /docs/devops/deployment-rollback-runbook
  - /docs/devops/disaster-recovery-test-plan
  - /docs/feature-specification-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Migrate data safely with this runbook template. Covers pre-migration checks, execution steps, rollback procedures, and post-migration validation."
  keywords:
    - data migration
    - database migration
    - migration runbook
    - data validation
    - etl runbook
---

## Overview

Data migrations are among the riskiest operations in software engineering. Unlike code deployments, data migrations cannot be rolled back with a simple `kubectl rollout undo`. A failed migration can corrupt production data, violate compliance requirements, and cause extended outages. This runbook template structures the migration into verifiable phases: preparation, dry run, execution, validation, and rollback.

## When to Use

Use this resource when:
- Moving data between database versions or engines (MySQL 5.7 to 8.0, PostgreSQL to Aurora)
- Migrating from monolith to microservices (database per service)
- Consolidating multiple data sources into a data warehouse
- Executing large-scale schema changes that require data transformation
- Migrating between cloud providers (AWS RDS to GCP Cloud SQL)

## Prerequisites

Before starting:
- [ ] Full backup of source and target systems completed and verified
- [ ] Migration script tested on a dataset with production-like volume
- [ ] Downtime window approved by stakeholders (if applicable)
- [ ] Rollback plan documented and tested
- [ ] Monitoring and alerting configured for both source and target

## Solution

```markdown
# Data Migration Runbook: `<Migration Name>`

## 1. Pre-Migration Checklist

### Source System
```bash
# Verify backup integrity
pg_dump -h source.db.internal -U admin mydb | gzip > /backups/pre-migration.sql.gz
gunzip -t /backups/pre-migration.sql.gz

# Record baseline metrics
psql -h source.db.internal -c "SELECT pg_size_pretty(pg_database_size('mydb'));"
psql -h source.db.internal -c "SELECT COUNT(*) FROM orders;"
psql -h source.db.internal -c "SELECT MAX(updated_at) FROM orders;"
```

| Metric | Value | Notes |
|--------|-------|-------|
| Database size | ______ | |
| Table row counts | ______ | |
| Latest update timestamp | ______ | |
| Active connections | ______ | |
| Replication lag | ______ | |

### Target System
- [ ] Target schema created and matches source structure
- [ ] Target indexes built and validated
- [ ] Target storage capacity > 2x expected data size
- [ ] Network connectivity verified between source and target
- [ ] Target performance baseline established

### Application
- [ ] Feature flags configured for dual-write or read-after-write
- [ ] Application code deployed that supports both old and new systems
- [ ] Monitoring dashboards updated with target system metrics

## 2. Migration Strategy Selection

| Strategy | Downtime | Complexity | Use Case |
|----------|----------|------------|----------|
| Big Bang | Minutes to hours | Low | Small datasets (< 100GB), simple schema |
| Incremental / Batch | Near-zero | Medium | Large datasets, can tolerate eventual consistency |
| Dual Write | Zero | High | Live systems requiring 100% availability |
| CDC (Change Data Capture) | Near-zero | High | Continuous replication, minimal downtime |

### Decision Record
**Selected strategy:** ______

**Justification:** ______

## 3. Dry Run Execution

```bash
# Run migration on a copy of production data
# Do NOT connect to production systems

cp /backups/pre-migration.sql.gz /tmp/dry-run.sql.gz
gunzip /tmp/dry-run.sql.gz

# Execute migration script
psql -h target-staging.db.internal -f /tmp/dry-run.sql

# Validate dry run
./scripts/validate-migration.sh \
  --source source-staging.db.internal \
  --target target-staging.db.internal
```

| Dry Run Result | Status |
|--------------|--------|
| Duration | ______ |
| Rows migrated | ______ |
| Errors encountered | ______ |
| Validation passed | [ ] |

**Decision Gate:** Only proceed to production if dry run completed without errors and validation passed.

## 4. Production Migration Execution

### Step 4a: Final Backup
```bash
# Create point-in-time backup immediately before migration
aws rds create-db-snapshot \
  --db-instance-identifier source-db \
  --db-snapshot-identifier pre-migration-$(date +%Y%m%d-%H%M%S)
```

### Step 4b: Stop Writes (if using Big Bang)
```bash
# Set application to read-only
curl -X POST http://app.internal/admin/maintenance-mode

# Verify no active writes
psql -h source.db.internal -c "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';"
```

### Step 4c: Execute Migration
```bash
# Log migration start time
MIGRATION_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "Migration started: $MIGRATION_START"

# Execute migration
psql -h target.db.internal -f migration-script.sql 2>&1 | tee migration.log

# Log migration end time
MIGRATION_END=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "Migration ended: $MIGRATION_END"
```

### Step 4d: Resume Writes (if applicable)
```bash
# Verify target is healthy before switching writes
curl -X POST http://app.internal/admin/target-health-check

# Switch application to target
curl -X POST http://app.internal/admin/switch-datastore \
  -H "Content-Type: application/json" \
  -d '{"target": "new-database"}'

# Resume normal operations
curl -X POST http://app.internal/admin/normal-mode
```

## 5. Post-Migration Validation

### Row Count Verification
```sql
-- Compare row counts for all major tables
SELECT 'source_orders' as table_name, COUNT(*) as row_count FROM source.orders
UNION ALL
SELECT 'target_orders', COUNT(*) FROM target.orders
UNION ALL
SELECT 'source_users', COUNT(*) FROM source.users
UNION ALL
SELECT 'target_users', COUNT(*) FROM target.users;
```

### Data Integrity Checks
```sql
-- Checksum comparison for critical tables
SELECT 'source', SUM(CHECKSUM(id, amount, created_at)) FROM source.payments
UNION ALL
SELECT 'target', SUM(CHECKSUM(id, amount, created_at)) FROM target.payments;

-- Verify no NULL values in required columns
SELECT COUNT(*) FROM target.orders WHERE customer_id IS NULL;
SELECT COUNT(*) FROM target.orders WHERE created_at IS NULL;
```

### Application Smoke Tests
```bash
# Critical user flows
./scripts/smoke-test.sh --environment=production

# Performance baseline comparison
./scripts/performance-test.sh --target=new-db --baseline=old-db
```

| Validation Check | Source | Target | Match | Time |
|------------------|--------|--------|-------|------|
| Total row count | ______ | ______ | [ ] | ______ |
| Table-level counts | ______ | ______ | [ ] | ______ |
| Checksum for payments | ______ | ______ | [ ] | ______ |
| NULL constraint checks | N/A | ______ | [ ] | ______ |
| Smoke tests pass | N/A | ______ | [ ] | ______ |
| Performance within 10% | ______ | ______ | [ ] | ______ |

## 6. Rollback Procedure

### Trigger Conditions
Rollback if ANY of the following occur:
- Error rate > 1% after migration
- Data integrity check fails
- Performance degradation > 50%
- Customer-facing feature broken

### Rollback Steps
```bash
# 1. Stop writes to target immediately
curl -X POST http://app.internal/admin/maintenance-mode

# 2. Switch application back to source
curl -X POST http://app.internal/admin/switch-datastore \
  -d '{"target": "source-database"}'

# 3. Resume operations on source
curl -X POST http://app.internal/admin/normal-mode

# 4. DO NOT DELETE target data until root cause is resolved
# 5. Document all findings for postmortem
```

| Rollback Step | Status | Time |
|--------------|--------|------|
| Maintenance mode activated | [ ] | ______ |
| Source restored as primary | [ ] | ______ |
| Application switched | [ ] | ______ |
| Smoke tests passed on source | [ ] | ______ |
| Target data preserved | [ ] | ______ |

## 7. Post-Migration Actions

- [ ] Monitor target system for 24 hours minimum
- [ ] Compare error rates between pre and post migration
- [ ] Validate backup of target system
- [ ] Update runbook with actual duration and issues encountered
- [ ] Schedule cleanup of source data (after 30-day retention)
- [ ] Document lessons learned
- [ ] Close incident channel when stable
```

## Explanation

The runbook separates **preparation** (backups, dry runs) from **execution** (the actual migration) and **validation** (data integrity checks). The critical insight is the **decision gate** after the dry run — never run an untested migration in production. The rollback procedure is designed to be fast (minutes, not hours) because data issues compound over time.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Database version upgrade | `pg_dumpall` / `pg_upgrade` | Test on identical OS and PostgreSQL versions |
| Cloud provider migration | AWS DMS / GCP Database Migration Service | Built-in validation, but monitor replication lag |
| Microservices extraction | Dual-write pattern | Complex, but zero downtime; requires application changes |
| Data warehouse ETL | Batch loads with Airflow | Schedule during low-traffic windows |
| NoSQL to SQL | Custom transformation scripts | Schema design is the hardest part; test queries thoroughly |

## Best Practices

1. **Always run a dry run** on production-scale data in an isolated environment
2. **Never modify the source** during migration — read-only access prevents accidental corruption
3. **Validate incrementally** — check row counts per table, not just totals
4. **Preserve both systems** until validation is complete and stable
5. **Document actual vs. estimated duration** — improves future planning

## Common Mistakes

1. **Not testing with production data volume** — small datasets hide performance issues
2. **Modifying source data during migration** — creates inconsistency that cannot be reconciled
3. **Skipping rollback rehearsal** — discovers rollback doesn't work when it's needed most
4. **Deleting source data too early** — validation may reveal issues hours after migration
5. **Not monitoring application behavior** — database migration success != application success

## Frequently Asked Questions

### How do I handle very large migrations (TB+)?

Use an incremental approach: migrate historical data in batches during low-traffic periods, then use CDC for the final delta. Tools like AWS DMS, Debezium, or custom batch scripts work well. Plan for days or weeks, not hours.

### What if source and target schemas differ?

Document the transformation in the migration script and validate every transformed field. Common issues: timezone conversions, character encodings, enum values, and nullable columns. Test edge cases in the dry run.

### How long should I keep source data after migration?

Minimum 30 days for most systems. For compliance-regulated data, follow your retention policy (often 90 days or longer). Keep until you're confident the migration is stable and all downstream consumers have verified their integrations.
