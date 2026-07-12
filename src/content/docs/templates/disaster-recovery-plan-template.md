---





contentType: docs
slug: disaster-recovery-plan-template
templateType: disaster-recovery
title: "Disaster Recovery Plan Template"
description: "A disaster recovery plan template for documenting RTO/RPO targets, failover procedures, and recovery runbooks that minimize downtime during catastrophic failures."
metaDescription: "Disaster recovery plan template: define RTO/RPO targets, failover procedures, and recovery runbooks to minimize downtime during catastrophic failures."
difficulty: advanced
topics:
  - devops
tags:
  - devops
  - template
  - ci-cd
  - automation
  - deployment
relatedResources:
  - /guides/infrastructure-as-code-guide
  - /docs/runbook-template
  - /guides/monitoring-alerting-guide
  - /docs/environment-setup-guide-template
  - /docs/slo-document-template
  - /recipes/pre-commit-hooks
  - /docs/backup-verification-test-template
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Disaster recovery plan template: define RTO/RPO targets, failover procedures, and recovery runbooks to minimize downtime during catastrophic failures."
  keywords:
    - disaster recovery plan template
    - rto rpo template
    - failover procedures template
    - business continuity plan
    - dr runbook





---

# Disaster Recovery Plan Template

Use this template to prepare for catastrophic failures and minimize recovery time. Complement it with the [Runbook Template](/docs/templates/runbook-template) for operational procedures.

## Template

```markdown
# Disaster Recovery Plan: [Service / System Name]

## Overview
| Field | Value |
|-------|-------|
| **Plan owner** | [team or individual] |
| **Last tested** | [date] |
| **RTO** | [hours — max acceptable downtime] |
| **RPO** | [minutes — max acceptable data loss] |

## Risk Scenarios

| Scenario | Likelihood | Impact | Mitigation |
|----------|-----------|--------|------------|
| Region outage | Medium | Critical | Multi-region deployment |
| Database corruption | Low | Critical | Point-in-time restore |
| Credential compromise | Medium | High | Token rotation + IAM lockdown |
| Third-party outage | High | Medium | Circuit breakers + fallback |

## Failover Procedures

### Scenario: Primary Region Unavailable

1. **Detect** — monitoring alert confirms regional health check failure
2. **Decide** — incident commander confirms failover (not flapping)
3. **Route** — update DNS / load balancer to secondary region
4. **Verify** — smoke tests pass in secondary region
5. **Communicate** — update status page and internal channels

### Scenario: Database Corruption

1. **Stop writes** — set database to read-only
2. **Identify** — determine corruption scope and time of event
3. **Restore** — restore from latest clean backup to new instance
4. **Replay** — apply WAL / binlog up to just before corruption
5. **Validate** — run data integrity checks
6. **Switch** — promote restored instance to primary

## Recovery Runbook

```bash
# 1. Verify secondary region health
kubectl --context=dr get nodes

# 2. Promote read replicas
gcloud sql instances promote-replica dr-replica

# 3. Update DNS
aws route53 change-resource-record-sets --hosted-zone-id Z123 \
  --change-batch file://failover.json

# 4. Verify
./smoke-tests.sh --env=dr
```

## Dependencies and Their DR Status

| Dependency | Their RTO | Our Fallback |
|------------|-----------|-------------|
| Payment processor | 4 hours | Queue transactions, retry later |
| Identity provider | 1 hour | Cached JWT validation + degraded login |
| CDN | 0 minutes | Multi-CDN switch |

## Testing Schedule

| Test Type | Frequency | Last Completed | Result |
|-----------|-----------|----------------|--------|
| Tabletop exercise | Quarterly | [date] | [pass / gaps found] |
| Failover drill | Bi-annually | [date] | [pass / gaps found] |
| Backup restore test | Monthly | [date] | [pass / gaps found] |
| Chaos engineering | Monthly | [date] | [pass / gaps found] |

## Communication Plan

| Audience | Trigger | Message | Channel |
|----------|---------|---------|---------|
| Engineering | Any DR event | Incident channel | Slack #incidents |
| Leadership | RTO > 50% | Status update | Email + call |
| Customers | RTO > 75% | Status page + tweet | Status page |
```

## RTO and RPO Explained

| Metric | Definition | Example |
|--------|-----------|---------|
| **RTO** (Recovery Time Objective) | How long you can be down | 4 hours |
| **RPO** (Recovery Point Objective) | How much data you can lose | 15 minutes |

If your database backups run every hour and your RPO is 15 minutes, your backup strategy does not meet the objective.

## What Works

- **Test recovery quarterly** — an untested plan is a fantasy. See [Infrastructure as Code Guide](/guides/devops/infrastructure-as-code-guide) for automated environment provisioning.
- **Automate failover where possible** — human-driven failover takes 10x longer
- **Document decisions, not just steps** — why you chose this RTO helps future reviewers
- **Keep the plan accessible offline** — during a disaster, your internal wiki may be down. Reference [Monitoring and Alerting Guide](/guides/devops/monitoring-alerting-guide) for detection triggers.
- **Include third-party dependencies** — your DR is only as strong as your weakest vendor

## Common Mistakes

- Untested backups — a backup you have never restored is Schrödinger's backup
- Single region everything — AWS regions fail; multi-region is not optional for critical services
- No rollback from failover — failing back to primary is harder than failing over
- Ignoring data consistency during failover — split-brain writes corrupt data
- RTO/RPO set by managers without engineering input — if the target is physically impossible, the plan is theater

## Frequently Asked Questions

### How often should I test disaster recovery?

Tabletop exercises quarterly, actual failover drills twice a year, backup restore tests monthly. For monitoring setup, see [Monitoring and Alerting Guide](/guides/devops/monitoring-alerting-guide). If you have never done a drill, start with a tabletop this week.

### What is the difference between backup and disaster recovery?

Backups are a component of DR. DR includes the people, processes, and tooling to recover operations. Backups without a tested recovery procedure are just compressed files.

### Should I automate failover or use human approval?

Automate detection and preparation (pre-stage secondary region), but require human approval for the actual traffic switch. False positives are expensive; automated failover to a broken region is worse than brief downtime.


## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Startup | Simplified DR: backup + restore | RTO 8h, RPO 24h acceptable |
| Enterprise | Multi-region active-active DR | RTO 15min, RPO 0 |
| E-commerce | DR with priority on catalog and checkout | Restore in revenue-impact order |
| Fintech | DR with priority on transaction integrity | Zero data loss tolerable |

## DR Plan Example: Primary Region Failure

```text
=== DR Plan: us-east-1 Region Failure ===

Scenario: us-east-1 region unavailable
RTO Target: 1 hour
RPO Target: 15 minutes

Initial Triage (0-5 min):
  1. Confirm us-east-1 is down (not a false positive)
     - Check AWS Health Dashboard
     - Check status.aws.amazon.com
  2. Declare DR-SEV1 incident
  3. Notify leadership and stakeholders
  4. Activate DR channel (#dr-incident)

Failover Execution (5-45 min):
  Step 1: Promote secondary region (eu-west-1) to primary
    - Update DNS (Route 53) to point to eu-west-1
    - Verify health checks pass in eu-west-1
    - Estimated time: 5-10 min

  Step 2: Scale resources in eu-west-1
    - Increase replicas to handle full traffic
    - kubectl scale deployment app -n production --replicas=20
    - Estimated time: 5-10 min

  Step 3: Restore data from backup
    - Last RDS backup: 12 min ago (within RPO)
    - Restore snapshot to new instance in eu-west-1
    - Estimated time: 15-20 min

  Step 4: Verify services
    - Health checks on all endpoints
    - Smoke tests on critical flows (login, payment, checkout)
    - Verify no data loss (compare record counts)
    - Estimated time: 5-10 min

Communication (parallel to execution):
  - Status page: "Investigating us-east-1 outage"
  - At 15 min: "Failover to eu-west-1 in progress"
  - At 45 min: "Services restored in eu-west-1"
  - At 60 min: "Incident resolved; investigating root cause"

Rollback (if failover fails):
  - If eu-west-1 cannot handle load: degrade to read-only mode
  - If data cannot be restored: use last valid backup (higher RPO)
  - If all fails: activate prolonged outage communication plan

Post-Recovery:
  - Monitor stability in eu-west-1 for 24 hours
  - Investigate root cause of us-east-1 failure
  - Conduct postmortem within 48 hours
  - Update DR plan with learnings
  - Plan migration back to us-east-1 (or new region)
```

### How often should we test the DR plan?

Test the DR plan at least annually for enterprises, quarterly for critical services. Test types: table-top walkthrough (paper exercise, 2 hours), partial simulation (failover one non-critical service, 4 hours), and full failover (migrate all traffic, 8 hours). Document each test: what worked, what failed, actual time vs RTO/RPO. A DR test that finds no failures is not a real test — look for failure points in a controlled environment. Involve people who are not the plan authors — if only the author can execute it, the plan is not resilient.

### What is the difference between RTO and RPO?

RTO (Recovery Time Objective) is how long it takes to restore service — the time from outage to users being able to use the system again. RPO (Recovery Point Objective) is how much data you can lose — the time between the last valid backup and the outage. An RTO of 1 hour means the service must be back within 1 hour. An RPO of 15 minutes means you can lose up to 15 minutes of data. RTO measures recovery time; RPO measures data loss. Both are objectives, not guarantees — measure actual time during DR tests.

### How do we calculate the cost of a DR plan?

DR cost includes: backup infrastructure (secondary region, instances, storage), replication costs (data transfer between regions), backup costs (snapshots, storage), testing costs (engineering hours for game days), and tooling costs (DR orchestration, monitoring). Compare DR cost to downtime cost: if one hour of downtime costs $100K and DR costs $50K/year, DR pays for itself in 30 minutes of avoided downtime. For non-critical services: a lightweight DR (backup + manual restore) may be sufficient. For critical services: active-active DR is necessary despite the cost.































































End of document. Review and update quarterly.