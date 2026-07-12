---



contentType: docs
slug: cross-region-failover-template
title: "Cross-Region Failover Test Template"
description: "A template for documenting multi-region disaster recovery test procedures."
metaDescription: "Use this cross-region failover template to plan and execute disaster recovery tests across multiple AWS, GCP, or Azure regions."
difficulty: advanced
topics:
  - devops
tags:
  - devops
  - disaster-recovery
  - failover
  - multi-region
  - availability
  - template
relatedResources:
  - /docs/backup-and-restore-template
  - /docs/auto-scaling-policy-template
  - /docs/cloud-cost-allocation-template
  - /docs/deployment-checklist-template
  - /docs/api-status-page-template
  - /docs/bug-triage-template
  - /docs/network-security-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this cross-region failover template to plan and execute disaster recovery tests across multiple AWS, GCP, or Azure regions."
  keywords:
    - devops
    - disaster-recovery
    - failover
    - multi-region
    - availability
    - template



---
## Overview

Disasters do not respect your office hours. Regional outages, fiber cuts, and weather events can make an entire cloud region unavailable. A cross-region failover plan that exists only on paper will fail when you need it most. This template structures a realistic, testable DR procedure that your team can execute under pressure.

## When to Use


- For alternatives, see [Disaster Recovery: RTO, RPO, and Resilient Recovery Runbooks](/guides/disaster-recovery-guide/).

Use this resource when:
- Your SLA requires > 99.9% availability and a single region is a single point of failure
- Compliance or insurance requires documented disaster recovery procedures
- You are launching a service in a second region and need a runbook for failover

## Solution

```markdown
# Cross-Region Failover Test: `<Service>`

## 1. Service Metadata

| Field | Value |
|-------|-------|
| Service | `name` |
| Primary Region | `us-east-1` |
| Secondary Region | `us-west-2` |
| RTO Target | `15 minutes` |
| RPO Target | `5 minutes` |
| Data Replication | `Async / Sync` |
| Last Test Date | `YYYY-MM-DD` |
| Test Owner | `@team` |

## 2. Pre-Test Checklist

- [ ] Notify stakeholders of the planned test window
- [ ] Verify secondary region resources are provisioned and healthy
- [ ] Confirm data replication lag is within RPO target
- [ ] Confirm DNS TTL is set low enough for quick cutover (≤ 60s recommended)
- [ ] Disable automated alerts that will fire during the test
- [ ] Open a bridge / war room for real-time coordination

## 3. Failover Procedure

### 3.1. Detect Primary Region Failure

| Step | Action | Verification | Time |
|------|--------|--------------|------|
| 1 | Confirm health checks failing in primary region | Load balancer / synthetic probe | 1 min |
| 2 | Escalate to incident commander | Page + bridge | 2 min |
| 3 | Verify the failure is regional, not application | Regional status dashboard | 3 min |

### 3.2. Promote Secondary Region

| Step | Action | Verification | Time |
|------|--------|--------------|------|
| 4 | Promote database replica to primary | `promote-replica` command + connectivity test | 5 min |
| 5 | Scale secondary compute to production capacity | Autoscaling group / desired count | 5 min |
| 6 | Redirect DNS / CDN to secondary region | `dig`, `curl` from external host | 2 min |
| 7 | Verify traffic flowing to secondary | ALB logs, synthetic transactions | 2 min |
| 8 | Notify stakeholders of active failover | Status page update + Slack | 1 min |

### 3.3. Post-Failover Verification

| Check | Method | Acceptable Result |
|-------|--------|-------------------|
| Synthetic transactions | Probe every 30s | 100% success for 5 min |
| Error rate | Dashboard | < 0.1% for 10 min |
| Latency | APM / synthetic | P95 < 2x baseline |
| Replication status | Database admin console | N/A (now primary) |
| Data integrity | Spot-check key records | No anomalies |

## 4. Failback Procedure

| Step | Action | Verification |
|------|--------|--------------|
| 1 | Confirm primary region is fully operational | Regional status dashboard |
| 2 | Re-establish replication from secondary to primary | Replication lag < 5s |
| 3 | Schedule maintenance window for failback | Stakeholder approval |
| 4 | Demote secondary to replica status | Database console confirms |
| 5 | Redirect DNS back to primary | External probe confirms |
| 6 | Scale secondary to standby capacity | Resource count |
| 7 | Verify full round-trip replication health | Lag + checksum |

## 5. Test Scenarios

| Scenario | Trigger | Expected Result |
|----------|---------|-----------------|
| Simulated region failure | Blackhole primary ALB | Failover completes within RTO |
| Database replica lag | Pause replication | Failover blocked until lag < RPO |
| DNS propagation delay | High TTL | Document actual propagation time |
| Partial degradation | Throttle primary region | Decision: failover or wait |
| Data inconsistency | Inject 1-minute data gap | Verify detection + reconciliation plan |

## 6. Post-Test Report

| Metric | Target | Actual | Pass / Fail |
|--------|--------|--------|-------------|
| Detection time | < 2 min | `X min` | |
| Failover time | < 15 min | `X min` | |
| Failback time | < 30 min | `X min` | |
| Data loss | < 5 min | `X min` | |
| Error rate during switch | < 0.5% | `X%` | |
| Observations | | | |
| Action items | | | |
```

## Explanation

The template forces you to **test the entire loop**: detect → failover → verify → failback. Many teams test failover but never test failback, discovering too late that they cannot return to the primary region without data loss. The **RPO** determines how much data you can afford to lose (based on replication lag), while the **RTO** determines how long the service can be down. DNS TTL is a common gotcha: if your TTL is 1 hour, failover will take an hour regardless of how fast your infrastructure reacts.

## Failover Execution Script

```bash
#!/bin/bash
# Cross-region failover execution
set -euo pipefail

PRIMARY_REGION="us-east-1"
SECONDARY_REGION="eu-west-1"
SERVICE="api-gateway"
DNS_FAILOVER_RECORD="api.example.com"

echo "=== Cross-Region Failover Execution ==="
echo "Primary: $PRIMARY_REGION"
echo "Secondary: $SECONDARY_REGION"
echo "Service: $SERVICE"
echo "Time: $(date -u)"
echo ""

# Step 1: Verify secondary region health
echo "[1/6] Verifying secondary region health..."
SECONDARY_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "https://$SECONDARY_REGION.$SERVICE.internal/health")
if [ "$SECONDARY_HEALTH" != "200" ]; then
  echo "FAIL: Secondary region unhealthy (HTTP $SECONDARY_HEALTH)"
  exit 1
fi
echo "  Secondary region: HEALTHY"

# Step 2: Check replication lag
echo "[2/6] Checking database replication lag..."
LAG_SECONDS=$(aws rds describe-db-clusters --region $SECONDARY_REGION --query 'DBClusters[0].ReadReplicaIdentifiers[0]' --output text 2>/dev/null | xargs -I{} aws rds describe-db-clusters --region $SECONDARY_REGION --db-cluster-identifier {} --query 'DBClusters[0].Status' --output text)
echo "  Replication status: $LAG_SECONDS"

# Step 3: Promote secondary database
echo "[3/6] Promoting secondary database..."
aws rds promote-read-replica-db-cluster --region $SECONDARY_REGION --db-cluster-identifier "api-secondary"
echo "  Database promoted"

# Step 4: Update DNS to point to secondary
echo "[4/6] Updating DNS failover record..."
aws route53 change-resource-record-sets --hosted-zone-id $ZONE_ID --change-batch '{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"'$DNS_FAILOVER_RECORD'","Type":"CNAME","TTL":60,"ResourceRecords":[{"Value":"'$SECONDARY_REGION'.$SERVICE.internal"}]}}]}'
echo "  DNS updated to secondary region"

# Step 5: Scale up secondary region
echo "[5/6] Scaling up secondary region..."
aws autoscaling update-auto-scaling-group --region $SECONDARY_REGION --auto-scaling-group-name "api-asg" --min-size 5 --max-size 20 --desired-capacity 10
echo "  Secondary scaled to 10 instances"

# Step 6: Verify traffic routing
echo "[6/6] Verifying traffic routing..."
sleep 30
TRAFFIC_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "https://$DNS_FAILOVER_RECORD/health")
if [ "$TRAFFIC_CHECK" == "200" ]; then
  echo "  Traffic routing to secondary: SUCCESS"
else
  echo "  Traffic routing: FAIL (HTTP $TRAFFIC_CHECK)"
fi

echo ""
echo "=== Failover Complete ==="
echo "Monitor for 30 minutes before declaring stable."
```

## Failover Test Checklist

```text
=== Cross-Region Failover Test Checklist ===

Pre-Test:
  [ ] Notify stakeholders of test window
  [ ] Verify secondary region is provisioned and healthy
  [ ] Confirm replication lag is within RPO
  [ ] Document expected RTO and RPO targets
  [ ] Prepare rollback plan (failback procedure)
  [ ] Set up monitoring dashboard for both regions

During Test:
  [ ] T+0: Initiate failover (run script)
  [ ] T+1: Verify detection alert fired
  [ ] T+5: Verify DNS updated
  [ ] T+10: Verify traffic routing to secondary
  [ ] T+15: Verify application functional tests pass
  [ ] T+30: Verify data consistency (row counts, checksums)

Post-Test:
  [ ] Document actual RTO and RPO
  [ ] Verify no data loss beyond RPO
  [ ] Initiate failback procedure
  [ ] Verify failback completed successfully
  [ ] Document issues found and remediation
  [ ] Schedule next test date
```


## Variants

| Architecture | Approach | Notes |
|--------------|----------|-------|
| Active-passive | Secondary is cold; promote on failure | Lower cost, higher RTO |
| Active-active | Both regions serve traffic; shift on failure | Higher cost, near-zero RTO |
| Blue-green | Secondary region is a mirror; switch DNS | Good for databases with streaming replication |
| Cell-based | Users assigned to a cell; move cells | Used by Netflix, requires stateless design |

## What Works

1. Run failover tests quarterly in production, not just in staging
2. Document every command; do not rely on memory during an incident
3. Test failback as thoroughly as failover; the return path is where most plans break
4. Keep secondary region infrastructure provisioned but scaled down; launching from scratch is too slow
5. Monitor replication lag continuously; failover during high lag guarantees data loss

## Common Mistakes

1. Testing only in staging, where load and data volume do not match production
2. Forgetting to update DNS records or TTL before the test
3. Not testing the decision to failover versus wait during partial degradation
4. Overlooking that write-heavy workloads create larger replication lag than read-heavy ones
5. Failing to verify data integrity after failover; consistency matters more than speed

## Frequently Asked Questions

### How often should I run a cross-region failover test?

Quarterly at minimum. For critical financial or health services, monthly. The test must include production traffic or a realistic synthetic load. A cold test (no traffic) proves nothing.

### Should I automate failover or require human approval?

Automate detection and alerting, but require human approval for the actual failover unless your system is truly stateless and your RTO is under 2 minutes. False positives (failing over because of a monitoring blip) can cause more damage than the original issue.

### What if my database does not support cross-region replication?

Use a database that does (Amazon Aurora Global, CockroachDB, Spanner, YugabyteDB). If you cannot change databases, use application-level dual writes or a CDC pipeline (Debezium, AWS DMS) to replicate changes. Accept that your RPO will be higher.


### How do we handle DNS propagation during failover?

Use a low TTL (60 seconds or less) on the failover DNS record. Use Route53 health checks with DNS failover routing policy for automatic detection. For global audiences, consider using a latency-based routing or geolocation routing to direct users to the closest healthy region. Test DNS propagation from multiple geographic locations using tools like DNSChecker.org. Document the actual propagation time observed during tests, as it may differ from the TTL.

### What is split-brain and how do we prevent it?

Split-brain occurs when both primary and secondary regions accept writes simultaneously, causing data conflicts. Prevent it by: using a single-writer database architecture (only one region accepts writes at a time), fencing the primary region before promoting the secondary (shut down the primary database, block network access), and using distributed consensus (Raft, Paxos) for write coordination. If split-brain occurs, document the conflict resolution procedure and test it before the next failover.

### How do we test failback?

Failback is the process of returning traffic to the primary region after the issue is resolved. Test failback by: re-establishing replication from secondary back to primary, waiting for replication lag to reach zero, promoting the primary database, updating DNS back to primary, and verifying traffic. Test failback in every failover test — it is where most plans break. Document the failback procedure separately from the failover procedure.

### What monitoring do we need for cross-region replication?

Monitor: replication lag in seconds (alert if > RPO), replication status (connected, disconnected, error), secondary region health (endpoint availability, response time), data consistency (row count comparison, checksum comparison), and DNS resolution from multiple regions. Set up alerts for replication lag exceeding 50% of RPO. Test that alerts fire when replication is intentionally paused. Review replication metrics weekly during the ops review.

### How do we handle stateful services during failover?

Stateful services (databases, message queues, caches) are the hardest to failover. For databases, use cross-region replication (Aurora Global, CockroachDB, Spanner). For message queues, use cross-region replication (Amazon MQ, Kafka MirrorMaker). For caches, accept cache loss on failover and rebuild from the database. Document the failover procedure for each stateful service separately. Test that the application handles cache loss gracefully (cold start performance).



Review and update the failover procedure quarterly. Test in production with realistic load. Document every issue found and track remediation to completion.

End of document. Review quarterly.