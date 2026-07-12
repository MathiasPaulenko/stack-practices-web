---



contentType: docs
slug: backup-and-restore-template
title: "Backup & Restore Verification Template"
description: "A template for documenting database and file backup verification procedures."
metaDescription: "Use this backup and restore template to verify database backups, file snapshots, and disaster recovery procedures across environments."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - backup
  - restore
  - database
  - disaster-recovery
  - template
relatedResources:
  - /docs/auto-scaling-policy-template
  - /docs/deployment-checklist-template
  - /docs/api-status-page-template
  - /docs/bug-report-template
  - /docs/capacity-planning-template
  - /docs/network-security-template
  - /recipes/bash-backup-rotation
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this backup and restore template to verify database backups, file snapshots, and disaster recovery procedures across environments."
  keywords:
    - devops
    - backup
    - restore
    - database
    - disaster-recovery
    - template



---
## Overview

Backups are worthless if you cannot restore from them. Many teams discover this too late: after a ransomware attack, database corruption, or accidental deletion. This template ensures your backup procedures are documented, tested, and verifiable before disaster strikes.

## When to Use


- For alternatives, see [Cross-Region Failover Test Template](/docs/cross-region-failover-template/).

Use this resource when:
- Setting up backup policies for a new database or file store
- Auditing existing backup procedures after an incident or compliance review
- Preparing for a disaster recovery drill or SOC 2 audit

## Solution

```markdown
# Backup & Restore Verification: `<Service Name>`

## 1. Service Metadata

| Field | Value |
|-------|-------|
| Service | `name` |
| Data Type | `Database / Files / Object Storage / VM Disk` |
| Criticality | `P0 (critical) / P1 (important) / P2 (standard)` |
| Owner Team | `@team-name` |
| Last Tested | `YYYY-MM-DD` |

## 2. Backup Policy

### 2.1. Schedule

| Tier | Frequency | Retention | Window | Storage |
|------|-----------|-----------|--------|---------|
| Full | Weekly | 4 weeks | Sunday 02:00 UTC | Cold storage |
| Incremental | Daily | 7 days | 02:00 UTC | Warm storage |
| Transaction log | Every 15 min | 24 hours | Continuous | Hot storage |
| Snapshot | On-demand | 30 days | Pre-deployment | Regional |

### 2.2. Verification

- [ ] Backup completes within the defined window without errors
- [ ] Backup size is within 10% of expected baseline
- [ ] Backup checksum / hash matches source after creation
- [ ] Backup metadata (timestamp, source, size) is logged to central system
- [ ] Alert fires if backup job fails or exceeds duration threshold

## 3. Restore Testing

### 3.1. Test Scenarios

| Scenario | Frequency | Target RTO | Target RPO | Last Run |
|----------|-----------|------------|------------|----------|
| Full database restore | Monthly | 4 hours | 15 min | `YYYY-MM-DD` |
| Point-in-time recovery | Quarterly | 1 hour | 15 min | `YYYY-MM-DD` |
| File-level recovery | Quarterly | 30 min | 24 hours | `YYYY-MM-DD` |
| Cross-region restore | Semi-annually | 8 hours | 1 hour | `YYYY-MM-DD` |

### 3.2. Restore Checklist

- [ ] Identify the correct backup version (not always the latest)
- [ ] Provision restore environment (isolated from production)
- [ ] Execute restore procedure following documented steps
- [ ] Verify data integrity: row counts, checksums, sample queries
- [ ] Verify application connectivity and query performance
- [ ] Document actual RTO and RPO achieved
- [ ] Clean up restore environment to avoid resource leakage

## 4. Disaster Recovery Playbook

| Step | Action | Owner | Time Limit |
|------|--------|-------|------------|
| 1 | Acknowledge incident and declare data loss | On-call | 5 min |
| 2 | Identify last known good backup | DBA / SRE | 15 min |
| 3 | Provision recovery infrastructure | SRE | 30 min |
| 4 | Execute restore procedure | DBA | Per RTO target |
| 5 | Verify data integrity | QA / DBA | 30 min |
| 6 | Redirect traffic to recovered environment | SRE | 10 min |
| 7 | Document incident timeline and root cause | Incident Commander | 24 hours |

## 5. Compliance & Audit

| Requirement | Evidence | Frequency |
|-------------|----------|-----------|
| Backup exists | Automated report of backup jobs | Daily |
| Restore tested | Test execution log with signatures | Monthly |
| RTO/RPO met | Documented test results | Quarterly |
| Encryption at rest | KMS key usage logs | Continuous |
```

## Explanation

The template separates **backup** (creating copies) from **restore testing** (proving they work). A backup without a tested restore is just hope. The **RTO** (Recovery Time Objective) is how fast you must be back online; the **RPO** (Recovery Point Objective) is how much data loss is acceptable. The restore scenarios ensure you test the full spectrum: from a single deleted file to a cross-region disaster.

## PostgreSQL Restore Verification Script

```bash
#!/bin/bash
set -euo pipefail

BACKUP_FILE=$1
RESTORE_DB="restore_test_$(date +%s)"
PG_HOST="localhost"
PG_USER="postgres"

echo "Creating test database: $RESTORE_DB"
createdb -h "$PG_HOST" -U "$PG_USER" "$RESTORE_DB"

echo "Restoring from: $BACKUP_FILE"
pg_restore -h "$PG_HOST" -U "$PG_USER" -d "$RESTORE_DB" -v "$BACKUP_FILE"

echo "Verifying row counts..."
TABLES=$(psql -h "$PG_HOST" -U "$PG_USER" -d "$RESTORE_DB" -t -c \
  "SELECT tablename FROM pg_tables WHERE schemaname='public';")

for table in $TABLES; do
  count=$(psql -h "$PG_HOST" -U "$PG_USER" -d "$RESTORE_DB" -t -c \
    "SELECT COUNT(*) FROM $table;")
  echo "  $table: $count rows"
done

echo "Verifying checksums..."
psql -h "$PG_HOST" -U "$PG_USER" -d "$RESTORE_DB" -c \
  "SELECT 'users' as table, COUNT(*) as rows, MD5(string_agg(id::text, ',' ORDER BY id)) as checksum FROM users;"

echo "Cleaning up test database..."
dropdb -h "$PG_HOST" -U "$PG_USER" "$RESTORE_DB"
echo "Restore verification complete."
```

## AWS Backup Vault Lock Configuration

For immutable backups that survive ransomware attacks:

```json
{
  "BackupVaultName": "production-backups",
  "BackupVaultLockSettings": {
    "MinRetentionDays": 30,
    "MaxRetentionDays": 365,
    "ChangeableForDays": 3
  }
}
```

Once the lock is active, no user (including root) can delete backups before the minimum retention period expires. The `ChangeableForDays` parameter gives a cooling-off window to fix misconfigurations.

## RTO and RPO Calculation Worksheet

```text
Service: Order Processing API
Criticality: P0

RPO Calculation:
  - Transaction log frequency: Every 15 minutes
  - Maximum acceptable data loss: 15 minutes of orders
  - RPO target: 15 minutes

RTO Calculation:
  - Detection time: 5 minutes (automated alert)
  - Acknowledgment time: 5 minutes (on-call SLA)
  - Provision restore environment: 10 minutes
  - Execute restore: 45 minutes (50GB database)
  - Verify data integrity: 15 minutes
  - Redirect traffic: 5 minutes
  - Total RTO: 85 minutes (target: 4 hours) PASS
```

## Automated Backup Monitoring with Prometheus

```yaml
groups:
  - name: backup_alerts
    rules:
      - alert: BackupJobFailed
        expr: backup_last_success_timestamp > 0 and time() - backup_last_success_timestamp > 86400
        for: 1h
        labels:
          severity: P1
        annotations:
          summary: "Backup job has not succeeded in 24 hours"
          runbook: "/runbooks/backup-failure"

      - alert: BackupSizeAnomaly
        expr: |
          backup_size_bytes / backup_size_bytes offset 1d < 0.9
        for: 1h
        labels:
          severity: P2
        annotations:
          summary: "Backup size dropped > 10% compared to yesterday"
          runbook: "/runbooks/backup-size-anomaly"

      - alert: RestoreTestOverdue
        expr: time() - restore_test_last_run_timestamp > 2592000
        for: 1h
        labels:
          severity: P2
        annotations:
          summary: "Monthly restore test is overdue"
          runbook: "/runbooks/restore-test"
```

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| PostgreSQL | pg_dump + WAL archiving | Use `pg_verifybackup` for integrity |
| MySQL | Percona XtraBackup | Non-blocking for InnoDB |
| MongoDB | mongodump + ops manager | Consider oplog replay for PITR |
| S3 / Object storage | Cross-region replication | Versioning + lifecycle policies |
| Kubernetes PVCs | Velero + CSI snapshots | Include cluster metadata in backup |
| Redis | RDB snapshots + AOF | Test both RDB and AOF restore paths |
| Elasticsearch | Snapshot + restore API | Use repository plugins for cloud storage |
| Kafka | Tiered storage + mirror maker | Backup topic configs and consumer offsets separately |

## What Works

1. Test restores to a different environment, not the source, to avoid accidentally overwriting production
2. Automate backup verification as much as possible; manual checks are forgotten during incidents
3. Store backups in a different region or cloud provider than the primary data
4. Encrypt backups at rest and in transit; rotate encryption keys independently
5. Document who can access backups; restrict to break-glass roles only
6. Use immutable backups (AWS Vault Lock, GCP Bucket Lock) to protect against ransomware
7. Include database schema and migration files in backups; data without schema is useless
8. Tag backup resources with cost allocation tags to track backup spend

## Common Mistakes

1. Backing up without testing the restore path; most backup failures are discovered during the first real incident
2. Keeping backups only in the same region as the primary data
3. Ignoring backup size growth until storage costs explode or jobs start failing
4. Not including schema/migrations in database backups (data without schema is useless)
5. Allowing backup credentials to remain active for longer than necessary, creating a lateral movement risk
6. Not testing restores under time pressure; a restore that works in 4 hours during a drill may take 8 during an incident
7. Forgetting to backup configuration files, secrets, and IAM policies alongside data

## Frequently Asked Questions

### How often should I test restores?

At minimum: full database restore monthly, point-in-time recovery quarterly, cross-region restore semi-annually. Increase frequency for P0 systems. The test is not complete until the application team verifies the data is usable.

### Should I encrypt backups?

Yes. Encrypt at rest with a key managed separately from the primary data. If ransomware encrypts your primary data, it may also encrypt backups accessible with the same credentials. Separate keys and immutable backups prevent this.

### What is the 3-2-1 backup rule?

3 copies of data, on 2 different media, with 1 copy offsite. For cloud-native systems: 3 copies (primary + backup + cross-region), 2 formats (snapshot + logical dump), 1 offsite (different region or provider). Immutable backups add an extra layer against deletion.

### What is the difference between RTO and RPO?

RTO (Recovery Time Objective) is the maximum acceptable downtime: how long until you are back online. RPO (Recovery Point Objective) is the maximum acceptable data loss: how much data you can afford to lose. A 15-minute transaction log backup gives a 15-minute RPO. A 2-hour restore process gives a 2-hour RTO.

### How do I handle backups for stateful Kubernetes workloads?

Use Velero with CSI snapshots for persistent volumes. Include cluster metadata (ConfigMaps, Secrets, Deployments) in the backup scope. For databases running in Kubernetes, use the database native backup tool (pg_dump, mongodump) rather than volume snapshots, as volume snapshots may capture inconsistent state.

### Should I use cloud-native backup services or self-managed tools?

Start with cloud-native services (AWS Backup, GCP Backup) for simplicity and integration. Move to self-managed tools (pg_dump + custom scripts, Velero) when you need finer control over retention, encryption, or cross-cloud portability. The best approach is often a hybrid: cloud-native for snapshots, self-managed for logical dumps.

### How do I verify backup integrity without a full restore?

Use checksums: compute SHA-256 of the backup file after creation and compare on verification. For PostgreSQL, use `pg_verifybackup` to check manifest integrity. For file-level backups, compare file counts and total sizes against the source. A full restore test is still required periodically, but checksums catch corruption between tests.

For large databases (>1TB), consider incremental restore verification: restore only changed blocks and verify checksums on those blocks to reduce test time from hours to minutes.
