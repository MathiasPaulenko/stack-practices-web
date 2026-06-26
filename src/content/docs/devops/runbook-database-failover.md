---
contentType: docs
slug: runbook-database-failover
title: "Database Failover Runbook"
description: "A step-by-step runbook for executing database failover procedures safely with minimal downtime and data loss."
metaDescription: "Execute database failovers safely with this runbook. Covers promotion, DNS cutover, replication verification, and rollback procedures."
difficulty: intermediate
topics:
  - devops
  - databases
  - infrastructure
tags:
  - runbook
  - database
  - failover
  - postgres
  - mysql
  - replication
  - disaster-recovery
relatedResources:
  - /docs/devops/disaster-recovery-test-plan
  - /docs/devops/deployment-rollback-runbook
  - /docs/devops/data-migration-runbook-template
  - /docs/devops/escalation-policy-template
  - /docs/devops/downtime-communication-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Execute database failovers safely with this runbook. Covers promotion, DNS cutover, replication verification, and rollback procedures."
  keywords:
    - database failover
    - runbook
    - postgres failover
    - mysql failover
    - replication
    - disaster recovery
---

## Overview

Database failovers are high-stakes events where minutes of delay mean lost revenue and eroded trust. A manual runbook reduces panic-driven mistakes by providing exact steps, verification commands, and rollback procedures. This runbook covers primary-to-replica promotion, application reconfiguration, and post-failover validation.

## When to Use

Use this runbook when:
- The primary database is unresponsive or severely degraded
- A planned maintenance requires switching to a replica
- The primary data center is experiencing an outage
- Automated failover has failed and manual intervention is required

## Prerequisites

Before starting:
- [ ] Access to database monitoring dashboards (lag, connections, replication status)
- [ ] Access to application configuration management (env vars, config files, service mesh)
- [ ] Access to DNS or load balancer management console
- [ ] On-call team notified and incident channel opened
- [ ] Read-replica confirmed healthy and lag < 5 seconds

## Solution

```markdown
# Database Failover Runbook: `<Service Name>`

## 1. Verify the Failure (2 minutes)

### Check Primary Health
```bash
# PostgreSQL
psql -h primary.db.internal -U monitor -c "SELECT pg_is_in_recovery();"

# MySQL
mysql -h primary.db.internal -u monitor -e "SHOW STATUS LIKE 'Threads_connected';"
```

| Check | Expected | Action if Failed |
|-------|----------|----------------|
| Ping primary | < 10ms response | Proceed to failover |
| Connection count | < max_connections | Check for connection storm |
| Replication lag | N/A (primary) | Confirm primary is source |
| Disk space | > 10% free | If full, failover is only option |

### Confirm Replica is Ready
```bash
# PostgreSQL
psql -h replica.db.internal -U monitor -c "SELECT pg_last_xact_replay_timestamp();"

# MySQL
mysql -h replica.db.internal -u monitor -e "SHOW SLAVE STATUS\G" | grep Seconds_Behind_Master
```

**Decision Gate:** Only proceed if replica lag < 5 seconds and replica disk is healthy.

## 2. Stop Writes to Primary (1 minute)

```bash
# Set application to read-only mode (if available)
curl -X POST http://app.internal/admin/read-only

# Or block at load balancer
# Block port 5432/3306 at primary security group
```

## 3. Promote Replica to Primary (3 minutes)

### PostgreSQL
```bash
# On the replica
sudo -u postgres pg_ctl promote -D /var/lib/postgresql/data

# Verify promotion
psql -h replica.db.internal -U monitor -c "SELECT pg_is_in_recovery();"  # Should return false
```

### MySQL
```bash
# On the replica
mysql -u root -e "STOP SLAVE; RESET SLAVE ALL;"

# Verify
mysql -u root -e "SHOW SLAVE STATUS\G"  # Should return Empty set
mysql -u root -e "SHOW MASTER STATUS;"   # Should show binary log position
```

### AWS RDS
```bash
aws rds promote-read-replica \
  --db-instance-identifier replica-01 \
  --region us-east-1
```

## 4. Update Application Configuration (2 minutes)

```bash
# Update environment variable or config map
export DB_HOST=replica.db.internal

# Reload application (zero-downtime if using connection pool)
sudo systemctl reload app

# Or for Kubernetes
kubectl set env deployment/app DB_HOST=replica.db.internal
kubectl rollout status deployment/app
```

## 5. DNS / Load Balancer Cutover (2 minutes)

| Method | Command | RTO |
|--------|---------|-----|
| DNS A record | Update to replica IP | 5-60 seconds (TTL dependent) |
| Load balancer | Swap target group | 10-30 seconds |
| Service mesh (Consul) | `consul catalog services` update | 5-10 seconds |
| Kubernetes Service | Update endpoint or service selector | Immediate |

```bash
# Example: AWS Route53
cd aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch file://failover-dns.json
```

## 6. Verify Application Functionality (3 minutes)

```bash
# Health check
curl -f http://app.internal/health

# Write test
curl -X POST http://app.internal/api/test \
  -H "Content-Type: application/json" \
  -d '{"test": "failover-write-2026-06-26"}'

# Read verification
curl http://app.internal/api/test/$(id_from_write)
```

| Verification | Status | Time |
|------------|--------|------|
| Health checks passing | [ ] | ___ |
| Write successful | [ ] | ___ |
| Read-back correct | [ ] | ___ |
| Replication lag (new replica) | < 1s | ___ |
| Error rate < 0.1% | [ ] | ___ |

## 7. Establish New Replication (5 minutes)

### Option A: Repair Old Primary (if recoverable)
```bash
# Reconfigure old primary as replica
# PostgreSQL
pg_basebackup -h new-primary.db.internal -D /var/lib/postgresql/data -Fp -Xs -P
# Edit recovery.conf or postgresql.auto.conf with primary_conninfo
sudo -u postgres pg_ctl start
```

### Option B: Spin Up New Replica
```bash
# From snapshot or base backup
aws rds create-db-instance-read-replica \
  --db-instance-identifier new-replica-01 \
  --source-db-instance-identifier new-primary-01
```

## 8. Post-Incident Actions

- [ ] Update incident timeline with exact times for each step
- [ ] Capture logs from old primary for root cause analysis
- [ ] Document data loss (if any) with exact transaction IDs
- [ ] Schedule postmortem within 24 hours
- [ ] Update this runbook with lessons learned
```

## Explanation

The runbook separates **verification** (confirm failure, confirm replica health) from **execution** (promotion, cutover) and **validation** (write/read tests). The decision gate at step 1 prevents failovers into an unhealthy replica. DNS cutover is preferred over application restarts because it minimizes RTO and avoids connection pool warm-up delays.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| PostgreSQL streaming replication | `pg_ctl promote` | Fastest, requires WAL streaming healthy |
| MySQL GTID | `STOP SLAVE; RESET SLAVE ALL;` | GTID simplifies finding correct position |
| AWS RDS Multi-AZ | Automatic failover | Only use this runbook for cross-region or manual promotion |
| Kubernetes StatefulSet | Patroni / Stolon orchestrator | Operator handles promotion; runbook for operator failure |

## Best Practices

1. **Test this runbook monthly** on a staging environment — not during the incident
2. **Automate health checks** in step 1 and step 6 with scripts, not manual queries
3. **Use connection pooling** (PgBouncer, ProxySQL) to avoid DNS TTL delays
4. **Monitor replication lag continuously** — lag > 30s should page on-call
5. **Document the exact transaction ID** at promotion for data loss calculation

## Common Mistakes

1. **Failing over to a lagging replica** — results in data loss and application errors
2. **Not stopping writes before promotion** — split-brain, diverging data sets
3. **Forgetting to update application config** — apps reconnect to old failed primary
4. **Not verifying writes post-failover** — silent failures go unnoticed for hours
5. **Skipping new replica setup** — running without redundancy after failover

## Frequently Asked Questions

### How do I know if the replica is caught up?

PostgreSQL: `pg_last_xact_replay_timestamp()` should be within 5 seconds of `now()`. MySQL: `Seconds_Behind_Master` should be 0. Always check before promoting.

### What if the old primary comes back online after failover?

Immediately shut it down or configure it as a replica. An old primary that accepts writes creates a split-brain scenario. The safest approach: power it off until you can reconfigure it.

### How do I minimize RTO during a failover?

Use a load balancer or service mesh instead of DNS. Pre-configure the replica endpoint in the application with a connection pooler. Automate the promotion step with a script that returns in under 10 seconds.
