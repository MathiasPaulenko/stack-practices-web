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

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| PostgreSQL | pg_dump + WAL archiving | Use `pg_verifybackup` for integrity |
| MySQL | Percona XtraBackup | Non-blocking for InnoDB |
| MongoDB | mongodump + ops manager | Consider oplog replay for PITR |
| S3 / Object storage | Cross-region replication | Versioning + lifecycle policies |
| Kubernetes PVCs | Velero + CSI snapshots | Include cluster metadata in backup |

## Best Practices

1. Test restores to a different environment, not the source, to avoid accidentally overwriting production
2. Automate backup verification as much as possible; manual checks are forgotten during incidents
3. Store backups in a different region or cloud provider than the primary data
4. Encrypt backups at rest and in transit; rotate encryption keys independently
5. Document who can access backups; restrict to break-glass roles only

## Common Mistakes

1. Backing up without testing the restore path; most backup failures are discovered during the first real incident
2. Keeping backups only in the same region as the primary data
3. Ignoring backup size growth until storage costs explode or jobs start failing
4. Not including schema/migrations in database backups (data without schema is useless)
5. Allowing backup credentials to remain active for longer than necessary, creating a lateral movement risk

## Frequently Asked Questions

### How often should I test restores?

At minimum: full database restore monthly, point-in-time recovery quarterly, cross-region restore semi-annually. Increase frequency for P0 systems. The test is not complete until the application team verifies the data is usable.

### Should I encrypt backups?

Yes. Encrypt at rest with a key managed separately from the primary data. If ransomware encrypts your primary data, it may also encrypt backups accessible with the same credentials. Separate keys and immutable backups prevent this.

### What is the 3-2-1 backup rule?

3 copies of data, on 2 different media, with 1 copy offsite. For cloud-native systems: 3 copies (primary + backup + cross-region), 2 formats (snapshot + logical dump), 1 offsite (different region or provider). Immutable backups add an extra layer against deletion.
