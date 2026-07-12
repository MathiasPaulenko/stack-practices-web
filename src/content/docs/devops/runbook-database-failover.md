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
  - /docs/disaster-recovery-test-plan
  - /docs/deployment-rollback-runbook
  - /docs/data-migration-runbook-template
  - /docs/escalation-policy-template
  - /docs/downtime-communication-template
  - /recipes/sql-find-duplicate-rows
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

## What Works

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

## Advanced Solutions

### Automated failover script with pre-flight checks

Combine all runbook steps into a single executable script with safety gates:

```bash
#!/bin/bash
# failover.sh - Automated database failover with pre-flight checks
# Usage: ./failover.sh [--force] [--dry-run]

set -euo pipefail

FORCE=false
DRY_RUN=false

for arg in "$@"; do
  case $arg in
    --force) FORCE=true ;;
    --dry-run) DRY_RUN=true ;;
  esac
done

PRIMARY_HOST="primary.db.internal"
REPLICA_HOST="replica.db.internal"
DB_USER="monitor"
MAX_LAG_SECONDS=5

log() { echo "[$(date -u +%H:%M:%S)] $1"; }

# Step 1: Pre-flight checks
log "Running pre-flight checks..."

# Check primary is actually down
if ping -c 1 -W 2 "$PRIMARY_HOST" &>/dev/null && ! $FORCE; then
  log "ERROR: Primary is reachable. Use --force to override."
  exit 1
fi

# Check replica lag
log "Checking replica lag..."
PG_LAG=$(psql -h "$REPLICA_HOST" -U "$DB_USER" -t -c \
  "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));" 2>/dev/null | xargs)

if (( $(echo "$PG_LAG > $MAX_LAG_SECONDS" | bc -l) )) && ! $FORCE; then
  log "ERROR: Replica lag is ${PG_LAG}s (max: ${MAX_LAG_SECONDS}s). Use --force to override."
  exit 1
fi

log "Pre-flight checks passed. Replica lag: ${PG_LAG}s"

if $DRY_RUN; then
  log "DRY RUN: Would proceed with failover."
  exit 0
fi

# Step 2: Enable read-only mode
log "Enabling read-only mode..."
curl -sS -X POST http://app.internal/admin/read-only || log "WARN: Could not enable read-only mode"

# Step 3: Promote replica
log "Promoting replica to primary..."
sudo -u postgres pg_ctl promote -D /var/lib/postgresql/data

# Verify promotion
IS_RECOVERY=$(psql -h "$REPLICA_HOST" -U "$DB_USER" -t -c "SELECT pg_is_in_recovery();" | xargs)
if [ "$IS_RECOVERY" != "f" ]; then
  log "ERROR: Promotion failed. pg_is_in_recovery returned: $IS_RECOVERY"
  exit 1
fi
log "Promotion successful."

# Step 4: Update application config
log "Updating application configuration..."
kubectl set env deployment/app DB_HOST="$REPLICA_HOST"
kubectl rollout status deployment/app --timeout=120s

# Step 5: Verify
log "Running post-failover verification..."
sleep 5
HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" http://app.internal/health)
if [ "$HTTP_CODE" != "200" ]; then
  log "ERROR: Health check failed with HTTP $HTTP_CODE"
  exit 1
fi

WRITE_RESULT=$(curl -sS -X POST http://app.internal/api/test \
  -H "Content-Type: application/json" \
  -d "{\"test\": \"failover-$(date +%s)\"}" -w "\n%{http_code}")

WRITE_CODE=$(echo "$WRITE_RESULT" | tail -1)
if [ "$WRITE_CODE" != "200" ] && [ "$WRITE_CODE" != "201" ]; then
  log "ERROR: Write test failed with HTTP $WRITE_CODE"
  exit 1
fi

log "Failover complete. All verifications passed."
log "Next steps:"
log "  1. Establish new replication (Step 7 of runbook)"
log "  2. Update incident timeline"
log "  3. Schedule postmortem"
```

### Patroni automated failover configuration

For PostgreSQL, Patroni provides automated failover with health checks and cluster management:

```yaml
# patroni.yml
name: postgres-cluster
scope: pgsql
restapi:
  listen: 0.0.0.0:8008
  connect_address: $(HOSTIP):8008

etcd:
  hosts: etcd1.internal:2379,etcd2.internal:2379,etcd3.internal:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 20
    maximum_lag_on_failover: 1048576  # 1MB
    maximum_lag_on_syncnode: 1048576
    synchronous_mode: true
    synchronous_mode_strict: false
    postgresql:
      use_pg_rewind: true
      use_slots: true
      parameters:
        wal_level: replica
        hot_standby: "on"
        max_wal_senders: 10
        max_replication_slots: 10
        wal_keep_segments: 8
        archive_mode: "on"
        archive_timeout: 1800s
      recovery_conf:
        restore_command: "wal-g wal-fetch %f %p"

postgresql:
  listen: 0.0.0.0:5432
  connect_address: $(HOSTIP):5432
  data_dir: /var/lib/postgresql/data
  bin_dir: /usr/lib/postgresql/bin
  pg_hba:
    - "replication replicator 0.0.0.0/0 md5"
    - "host all all 0.0.0.0/0 md5"
  replication:
    username: replicator
    password: "${REPLICATION_PASSWORD}"
    network: 0.0.0.0/0
  superuser:
    username: postgres
    password: "${POSTGRES_PASSWORD}"

tags:
  nofailover: false
  noloadbalance: false
  clonefrom: false
  nosync: false
```

### Post-failover data consistency verification

Verify data integrity after failover by comparing transaction logs:

```python
import psycopg2
from dataclasses import dataclass
from typing import Optional
from datetime import datetime

@dataclass
class FailoverVerification:
    promoted_node: str
    old_primary_lsn: str  # Log sequence number at failure
    new_primary_lsn: str  # LSN at promotion
    transactions_lost: int
    consistency_ok: bool

def verify_failover_consistency(
    new_primary_host: str,
    old_primary_lsn: str,
    db_user: str = "monitor",
) -> FailoverVerification:
    """Verify data consistency after a database failover."""
    conn = psycopg2.connect(host=new_primary_host, user=db_user, dbname="postgres")
    cur = conn.cursor()

    # Get current LSN on new primary
    cur.execute("SELECT pg_current_wal_lsn();")
    new_lsn = cur.fetchone()[0]

    # Count transactions since promotion point
    cur.execute("""
        SELECT count(*) FROM pg_stat_activity
        WHERE state = 'active' AND xact_start > now() - interval '5 minutes';
    """)
    active_txns = cur.fetchone()[0]

    # Check for replication slot health
    cur.execute("""
        SELECT slot_name, active, restart_lsn
        FROM pg_replication_slots;
    """)
    slots = cur.fetchall()

    # Verify all slots are active
    all_active = all(slot[1] for slot in slots) if slots else True

    # Estimate lost transactions (simplified)
    lost = 0 if old_primary_lsn == "unknown" else estimate_lost(old_primary_lsn, new_lsn)

    result = FailoverVerification(
        promoted_node=new_primary_host,
        old_primary_lsn=old_primary_lsn,
        new_primary_lsn=new_lsn,
        transactions_lost=lost,
        consistency_ok=all_active,
    )

    cur.close()
    conn.close()
    return result

def estimate_lost(old_lsn: str, new_lsn: str) -> int:
    """Estimate lost transactions between two LSNs."""
    # Parse LSN format (e.g., '0/17000058')
    try:
        old_parts = [int(x, 16) for x in old_lsn.split("/")]
        new_parts = [int(x, 16) for x in new_lsn.split("/")]
        old_bytes = old_parts[0] * 0x100000000 + old_parts[1]
        new_bytes = new_parts[0] * 0x100000000 + new_parts[1]
        diff = new_bytes - old_bytes
        # Rough estimate: 1 transaction ~ 200 bytes average
        return max(0, diff // 200)
    except (ValueError, IndexError):
        return 0

# Example usage
result = verify_failover_consistency(
    new_primary_host="replica.db.internal",
    old_primary_lsn="0/17000058",
)
print(f"Promoted node: {result.promoted_node}")
print(f"Transactions lost (est.): {result.transactions_lost}")
print(f"Replication slots healthy: {result.consistency_ok}")
```

## Additional Best Practices


- For a deeper guide, see [Complete Guide to PostgreSQL Replication](/guides/complete-guide-postgresql-replication/).

1. **Use connection poolers to minimize failover impact.** PgBouncer or ProxySQL can point to a virtual IP that you update during failover, avoiding application restarts:

```ini
# pgbouncer.ini
[databases]
appdb = host=primary.db.internal port=5432 dbname=appdb

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
pool_mode = transaction
max_client_conn = 200
default_pool_size = 20
```

During failover, update only the PgBouncer config and reload:

```bash
# Update pgbouncer to point to new primary
sed -i 's/primary.db.internal/replica.db.internal/' /etc/pgbouncer/pgbouncer.ini
kill -HUP $(cat /var/run/pgbouncer/pgbouncer.pid)
```

2. **Maintain a failover decision tree for complex scenarios.** Not every failover is straightforward. Document decision points:

```markdown
## Failover Decision Tree

1. Is primary down?
   - Yes → Go to step 2
   - No but degraded → Can you fix without failover? (restart, kill long queries)
     - Yes → Fix and monitor
     - No → Go to step 2

2. Is replica lag < 5s?
   - Yes → Proceed with failover
   - No → Can you wait 60s for lag to decrease?
     - Yes → Wait and recheck
     - No → Failover with data loss (document lost transactions)

3. Is this a planned failover?
   - Yes → Enable maintenance mode first
   - No → Open incident channel, notify stakeholders
```

## Additional Common Mistakes

1. **Not testing failover in production-like conditions.** Testing in staging with low traffic does not reveal connection pool exhaustion or DNS caching issues. Run failover drills during low-traffic production windows quarterly. Document what broke and fix it before the real failure.

2. **Forgetting to update monitoring after failover.** Your monitoring system still tracks the old primary. After failover, update dashboards, alerting rules, and health checks to point to the new primary. Otherwise you get false alerts or miss real issues:

```bash
# Update Prometheus targets after failover
kubectl patch servicemonitor postgres-exporter \
  -p '{"spec":{"endpoints":[{"port":"http-metrics","path":"/metrics","targetPort":9187}]}}'

# Update Grafana datasource if using direct connection
curl -X PATCH http://grafana.internal/api/datasources/1 \
  -H "Content-Type: application/json" \
  -d '{"url":"http://new-primary.db.internal:5432"}'
```

## Additional Frequently Asked Questions

### What is the difference between synchronous and asynchronous replication for failover?

Synchronous replication guarantees that a transaction is written to the replica before the primary confirms commit to the client. This means zero data loss on failover but adds latency to every write. Asynchronous replication confirms commit to the client immediately and replicates in the background, which is faster but can lose the last few transactions on failover. Use synchronous for financial or critical data, asynchronous for high-throughput workloads where small data loss is acceptable.

### How do we handle failover for sharded databases?

Each shard fails over independently. Maintain a shard map that tracks which shard is primary and which is replica. During failover, update the shard map and route traffic accordingly. Tools like Vitess (MySQL) or Citus (PostgreSQL) handle this automatically. If managing manually, ensure your routing layer reads the shard map dynamically rather than caching it.
