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

## Variants

| Architecture | Approach | Notes |
|--------------|----------|-------|
| Active-passive | Secondary is cold; promote on failure | Lower cost, higher RTO |
| Active-active | Both regions serve traffic; shift on failure | Higher cost, near-zero RTO |
| Blue-green | Secondary region is a mirror; switch DNS | Good for databases with streaming replication |
| Cell-based | Users assigned to a cell; move cells | Used by Netflix, requires stateless design |

## Best Practices

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
