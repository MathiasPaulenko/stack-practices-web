---
contentType: docs
slug: disaster-recovery-test-plan
title: "Disaster Recovery Test Plan"
description: "A template for planning and executing disaster recovery tests including failover validation, data integrity checks, and recovery time measurement."
metaDescription: "Plan and execute DR tests with this template. Covers failover validation, data integrity checks, RTO/RPO measurement, and post-test reporting."
difficulty: advanced
topics:
  - devops
  - infrastructure
  - security
tags:
  - disaster-recovery
  - test-plan
  - rto
  - rpo
  - failover
  - runbook
  - compliance
relatedResources:
  - /docs/devops/runbook-database-failover
  - /docs/devops/deployment-rollback-runbook
  - /docs/devops/data-migration-runbook-template
  - /docs/devops/incident-communication-template
  - /docs/data-breach-response-playbook
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Plan and execute DR tests with this template. Covers failover validation, data integrity checks, RTO/RPO measurement, and post-test reporting."
  keywords:
    - disaster recovery
    - dr test
    - rto rpo
    - failover test
    - business continuity
    - recovery plan
---

## Overview

Disaster recovery plans that have never been tested are merely wishful thinking. A real disaster exposes gaps in documentation, missing dependencies, and unrealistic assumptions about recovery times. This test plan provides a structured approach to validating your DR procedures through controlled failover exercises, data integrity verification, and RTO/RPO measurement.

## When to Use

Use this resource when:
- Annual compliance requirements mandate DR testing (SOC2, ISO 27001)
- You have recently changed infrastructure or disaster recovery procedures
- A previous incident revealed gaps in your DR capabilities
- You need to validate RTO and RPO commitments to stakeholders

## Prerequisites

Before starting:
- [ ] DR runbooks reviewed and updated within the last 90 days
- [ ] Test environment available (isolated from production)
- [ ] Backup snapshots confirmed restorable within the last 7 days
- [ ] Stakeholders notified of test window and expected impact
- [ ] Rollback plan documented in case the test goes wrong

## Solution

```markdown
# Disaster Recovery Test Plan: `<Service Name>`

## 1. Test Objectives

| Objective | Target | Measurement |
|-----------|--------|-------------|
| Recovery Time Objective (RTO) | < 4 hours | Time from disaster declaration to service availability |
| Recovery Point Objective (RPO) | < 15 minutes | Maximum acceptable data loss in recovery |
| Data Integrity | 100% | All transactions verified against source |
| Communication | < 30 minutes | All stakeholders notified of test start |

## 2. Scope & Assumptions

### In Scope
- Database failover and restoration from backup
- Application redeployment to DR region
- DNS cutover and traffic routing
- Smoke test validation of core user flows

### Out of Scope
- Third-party service dependencies (assumed available)
- Physical data center failures (cloud-based test)
- Complete network isolation scenarios

### Assumptions
- Latest backup snapshot is valid and complete
- DR region has sufficient capacity
- Network connectivity between regions is functional
- Team members are available during the test window

## 3. Test Scenarios

### Scenario A: Primary Region Complete Failure

**Trigger:** Simulated complete unavailability of the primary AWS region.

**Steps:**
1. **Declare disaster** (0:00) — Lead engineer announces DR test in incident channel
2. **Restore database** (0:30) — Restore from latest snapshot in DR region
3. **Deploy applications** (1:00) — Deploy application stack to DR Kubernetes cluster
4. **Update DNS** (1:30) — Cutover traffic to DR load balancer
5. **Validate** (2:00) — Run smoke tests and verify data integrity
6. **Measure RTO** — Record time from declaration to passing validation

### Scenario B: Database Corruption

**Trigger:** Primary database has corrupt data requiring point-in-time recovery.

**Steps:**
1. Identify corruption point from monitoring alerts
2. Restore database to 5 minutes before corruption timestamp
3. Verify transactional integrity with checksum queries
4. Promote restored instance to primary
5. Redirect application traffic

## 4. Test Execution

### Pre-Test Checklist

| Item | Status | Owner |
|------|--------|-------|
| Backup snapshot created | [ ] | DBA |
| DR environment provisioned | [ ] | Platform |
| Runbooks printed / accessible offline | [ ] | SRE |
| Stakeholders notified | [ ] | Incident Lead |
| Rollback plan confirmed | [ ] | SRE |
| Monitoring dashboards ready | [ ] | Observability |

### Execution Timeline

| Time | Activity | Expected Result |
|------|----------|-----------------|
| T+0:00 | Declare test start | Incident channel notified |
| T+0:05 | Initiate database restore | RDS restore job started |
| T+1:00 | Database available | Connection test passes |
| T+1:30 | Deploy application | All pods healthy |
| T+2:00 | DNS cutover | Traffic hitting DR region |
| T+2:30 | Smoke tests | 100% pass rate |
| T+3:00 | Data integrity check | Transaction count matches source |
| T+4:00 | RTO measurement | Record actual vs target |

### Rollback Procedure

If any critical step fails:
1. Pause test immediately
2. Revert DNS to primary region
3. Do NOT delete DR resources until post-test review
4. Escalate to engineering manager
5. Schedule follow-up test after fixes

## 5. Data Integrity Verification

```sql
-- Transaction count comparison
SELECT 'primary' as source, COUNT(*) as tx_count FROM orders
UNION ALL
SELECT 'dr', COUNT(*) FROM dr_orders;

-- Checksum comparison
SELECT 'primary', SUM(CHECKSUM(*)) FROM payments
UNION ALL
SELECT 'dr', SUM(CHECKSUM(*)) FROM dr_payments;

-- Latest transaction timestamp
SELECT MAX(created_at) FROM orders;
```

| Check | Primary | DR | Match |
|-------|---------|-----|-------|
| Transaction count | ______ | ______ | [ ] |
| Row-level checksum | ______ | ______ | [ ] |
| Latest timestamp | ______ | ______ | [ ] |

## 6. Post-Test Report

### Results Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| RTO | < 4 hours | ______ | Pass / Fail |
| RPO | < 15 minutes | ______ | Pass / Fail |
| Data integrity | 100% | ______ | Pass / Fail |
| Smoke tests | 100% | ______ | Pass / Fail |

### Issues Found

| Issue | Severity | Owner | Fix Deadline |
|-------|----------|-------|--------------|
| ______ | Critical / High / Medium / Low | ______ | ______ |

### Lessons Learned

- What worked well:
- What took longer than expected:
- What failed unexpectedly:
- What should be automated:

### Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Test Lead | ______ | ______ | ______ |
| Engineering Manager | ______ | ______ | ______ |
| Compliance (if required) | ______ | ______ | ______ |
```

## Explanation

The plan structures DR testing into **declared objectives** (RTO/RPO targets), **controlled scenarios** (specific failure modes), and **measurable results** (pass/fail criteria). The pre-test checklist prevents tests from failing due to missing prerequisites rather than actual DR gaps. The rollback procedure acknowledges that tests can fail and protects production from test-induced outages.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Annual compliance test | Full scenario with auditors | Document everything, maintain sign-offs |
| Quarterly internal drill | Abbreviated scenario, no auditor | Focus on team coordination and timing |
| After infrastructure change | Targeted scenario for changed component | Validate only what changed |
| Game day / chaos engineering | Unannounced test | Most realistic, requires mature automation |

## What Works

1. **Schedule tests during business hours** — the people who need to learn from them must participate
2. **Measure, don't estimate** — actual RTO is almost always longer than the documented estimate
3. **Test from backup, not from live replication** — validates your backup restoration, not just failover
4. **Document every deviation** — even minor timing differences indicate process gaps
5. **Automate smoke tests** — manual verification is too slow during a real disaster

## Common Mistakes

1. **Testing only failover, not restoration from backup** — replication may be healthy while backups are corrupt
2. **Not testing with realistic data volumes** — restoring 1TB takes longer than restoring 1GB
3. **Skipping the rollback procedure test** — getting back to normal is part of DR
4. **Testing during low-traffic periods only** — doesn't validate capacity assumptions
5. **Not updating runbooks after test findings** — the same gaps appear in next year's test

## Frequently Asked Questions

### How often should we run DR tests?

At minimum: annually for compliance, quarterly for internal validation. After every infrastructure change that affects recovery paths. Mature organizations test monthly with automated chaos engineering.

### What if the DR test fails catastrophically?

That's valuable information. The test has revealed that your DR plan doesn't work — better to discover this in a controlled test than during a real disaster. Pause the test, restore production, fix the issues, and reschedule.

### Do we need to notify customers about DR tests?

Only if the test impacts customer-facing services. Internal-only tests need no external notification. Customer-impacting tests should be scheduled during maintenance windows with advance notice.
