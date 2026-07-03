---
contentType: guides
slug: disaster-recovery-guide
title: "Disaster Recovery: RTO, RPO, and Resilient Recovery Runbooks"
description: "A practical guide to disaster recovery planning: defining RTO and RPO, backup strategies, multi-region failover, and building recovery runbooks that minimize downtime."
metaDescription: "Learn disaster recovery planning: RTO, RPO, backup strategies, runbooks, and multi-region failover for resilient infrastructure."
difficulty: advanced
topics:
  - devops
  - infrastructure
  - security
tags:
  - disaster-recovery
  - rto
  - rpo
  - backup
  - failover
  - multi-region
  - runbook
  - resilience
  - guide
relatedResources:
  - /guides/devops/sre-practices-guide
  - /guides/devops/chaos-engineering-guide
  - /guides/devops/multi-cloud-guide
  - /guides/security/zero-trust-architecture-guide
  - /guides/planning/capacity-planning-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn disaster recovery planning: RTO, RPO, backup strategies, runbooks, and multi-region failover for resilient infrastructure."
  keywords:
    - disaster-recovery
    - rto
    - rpo
    - backup
    - failover
    - multi-region
    - runbook
    - resilience
    - guide
---

## Overview

Disaster recovery (DR) is the set of policies, tools, and procedures that enable the recovery or continuation of vital technology infrastructure and systems following a natural or human-induced disaster. It protects against data loss and minimizes downtime when the unexpected happens.

This guide covers defining recovery objectives, backup strategies, multi-region architectures, and useful runbooks.

## When to Use

- You operate a business-critical service where downtime is unacceptable
- You need to comply with regulatory requirements for data protection
- You want to protect against cloud provider outages, region failures, or data corruption
- You are designing or reviewing your backup and recovery strategy
- You need to define RTO and RPO targets for your organization

## Core Concepts

| Concept | Description | Typical Values |
|---------|-------------|----------------|
| **RTO (Recovery Time Objective)** | Maximum acceptable downtime after a disaster | Minutes to 24 hours |
| **RPO (Recovery Point Objective)** | Maximum acceptable data loss (time since last backup) | Zero to 24 hours |
| **MTTR (Mean Time to Recovery)** | Average time to restore service after failure | Measured in minutes/hours |
| **MTBF (Mean Time Between Failures)** | Average time between system failures | Measured in days/months |
| **Failover** | Switching to a standby system when primary fails | Automatic or manual |
| **Failback** | Returning to the primary system after recovery | Planned and tested |

## Disaster Recovery Strategies

| Strategy | RTO | RPO | Cost | Description |
|----------|-----|-----|------|-------------|
| **Backup and Restore** | Hours to days | Hours to days | Low | Periodic backups restored to new infrastructure |
| **Pilot Light** | 10-60 minutes | Minutes | Medium | Core systems always running; scale up on demand |
| **Warm Standby** | Minutes | Near-zero | Medium-High | Scaled-down replica ready to scale up |
| **Hot Standby / Active-Active** | Near-zero | Near-zero | High | Full replica actively serving traffic |
| **Multi-Region Active-Active** | Near-zero | Zero | Very High | All regions serve traffic simultaneously |

## Step-by-Step DR Planning

### 1. Define Recovery Objectives

Set RTO and RPO for each critical system:

```yaml
# Example: Recovery objectives by service tier
tiers:
  - name: tier_1_critical
    examples: [payment-processing, user-authentication]
    rto: "5 minutes"
    rpo: "0 minutes"
    strategy: "active-active"
  - name: tier_2_important
    examples: [reporting, analytics]
    rto: "4 hours"
    rpo: "1 hour"
    strategy: "warm-standby"
  - name: tier_3_standard
    examples: [internal-tools, staging]
    rto: "24 hours"
    rpo: "24 hours"
    strategy: "backup-restore"
```

### 2. Map Dependencies and Critical Paths

Understand what must recover in what order:

```bash
# Example: Service dependency graph for recovery ordering
# Recovery must happen in dependency order:
# 1. DNS / CDN
# 2. Load balancers / API gateways
# 3. Databases (primary first)
# 4. Caching layers
# 5. Application services
# 6. Background workers
# 7. Analytics / batch jobs
```

#### Dependency Mapping Checklist

- Identify single points of failure
- Map database replication topologies
- Document external API dependencies
- Note critical third-party services
- Verify backup systems are independent of primary

### 3. Design Backup Strategy

Match backup frequency and retention to RPO requirements:

| Data Type | Backup Frequency | Retention | Storage |
|-----------|------------------|-----------|---------|
| Transactional database | Continuous or hourly | 30 days + annual | Cross-region + cold storage |
| File/object storage | Daily sync | 90 days | Cross-region |
| Configuration/IaC | Every change (Git) | Forever | Git + artifact store |
| Logs | Real-time streaming | 30-90 days | Hot + cold tiers |

```bash
# Example: PostgreSQL backup strategy
# Continuous archiving (WAL) for point-in-time recovery
cat <<EOF >> postgresql.conf
archive_mode = on
archive_command = 'aws s3 cp %p s3://my-backups/wal/%f'
wal_level = replica
EOF

# Daily base backup
pg_basebackup -D /backups/$(date +%Y%m%d) -Ft -z -P
```

### 4. Implement Multi-Region Architecture

Design for regional failure from the start:

```yaml
# Example: Multi-region active-passive Kubernetes
# Primary region: us-east-1
# Secondary region: us-west-2

apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  replicas: 3
  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: api-service
                topologyKey: topology.kubernetes.io/zone
```

#### Multi-Region Patterns

- Read replicas: Primary region writes; secondary regions read replicas
- Active-passive: Primary active; secondary on standby (pilot light or warm)
- Active-active: Both regions serve traffic (requires data synchronization)
- Cell-based: Sharded architecture with cells in multiple regions

### 5. Create Recovery Runbooks

Document step-by-step recovery procedures:

```markdown
# Runbook: Database Failover to Secondary Region

## Trigger
- Primary region database health check fails for >2 minutes
- Automatic alert fires: `database-primary-down`

## Steps

1. **Verify outage** (1 min)
   - Check monitoring dashboard
   - Confirm region-level issue (not isolated instance)

2. **Initiate failover** (2 min)
   - Run: `kubectl exec failover-script -- promote-replica`
   - Verify: new primary accepts writes

3. **Update DNS** (2 min)
   - Switch database CNAME to secondary region
   - TTL: 60 seconds (pre-configured)

4. **Verify application health** (3 min)
   - Check application error rates
   - Verify critical user flows

5. **Communicate** (5 min)
   - Update status page
   - Notify stakeholders

## Rollback
- When primary recovers, plan failback during maintenance window
- Validate data consistency before failback
```

### 6. Test Recovery Regularly

Untested DR plans are just wishful thinking:

| Test Type | Frequency | Scope |
|-----------|-----------|-------|
| **Tabletop exercise** | Quarterly | Walk through runbooks without executing |
| **Backup restore test** | Monthly | Restore database from backup to verify integrity |
| **Failover drill** | Quarterly | Promote replica, update DNS, verify service |
| **Chaos engineering** | Monthly | Inject failures (e.g., terminate primary database) |
| **Full DR simulation** | Annually | Simulate complete region failure and recovery |

```python
# Example: Automated backup integrity check
import subprocess

def test_backup_restore():
    latest_backup = get_latest_backup()
    temp_instance = create_temp_database()
    
    restore_result = subprocess.run([
        'pg_restore',
        '--dbname', temp_instance.connection_string,
        latest_backup.path
    ], capture_output=True)
    
    if restore_result.returncode != 0:
        alert_oncall("Backup restore test failed!")
        return False
    
    # Verify row counts match expected values
    rows = temp_instance.query("SELECT count(*) FROM critical_table")
    assert rows[0][0] > 0, "Restored database appears empty"
    
    cleanup(temp_instance)
    return True
```

## What Works

- Automate where possible. Manual failover at 3 AM is error-prone.
- Keep runbooks simple. One person should be able to execute them under pressure.
- Test backups by restoring. A backup you cannot restore is not a backup.
- Monitor replication lag. If lag exceeds RPO, alert immediately.
- Document assumptions. What if DNS is down? What if the runbook author is unavailable?
- Separate DR infrastructure. DR systems should not depend on primary region resources.

## Common Mistakes

- Untested backups. Many organizations discover corrupted backups only during a real disaster.
- Over-engineering for low-tier systems. Match DR strategy to business criticality.
- Forgetting about data consistency. Asynchronous replication can lose transactions during failover.
- Ignoring runbook maintenance. Stale runbooks with outdated commands cause confusion.
- No communication plan. During an outage, stakeholders need timely updates.

## Variants

- Cloud-native DR: Use managed services with built-in replication (RDS Multi-AZ, Azure Site Recovery, Cloud SQL replicas).
- On-premise DR: Focus on off-site tape backups, warm sites, and hardware procurement timelines.
- Hybrid DR: Cloud-based DR for on-premise workloads (reverse pilot light).

## FAQ

**Q: How do I choose between RTO/RPO targets?**
Balance cost against business impact. A trading platform needs seconds; an internal wiki can tolerate hours.

**Q: What is the minimum viable DR strategy?**
At minimum: automated daily backups, tested monthly restores, and a documented recovery procedure.

**Q: How do I handle database failback after recovery?**
Plan failback during low-traffic windows. Validate data consistency and replay any missed transactions.

**Q: Should I use the same cloud provider for DR?**
Multi-cloud DR provides the highest resilience but adds complexity. Start with multi-region, same provider.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.

## Conclusion

Disaster recovery is insurance for your infrastructure. Define clear objectives, design appropriate strategies, document runbooks, and test regularly. The time to discover a problem with your DR plan is during a drill, not during a real disaster.
