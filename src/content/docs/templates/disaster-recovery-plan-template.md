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
relatedResources:
  - /guides/devops/infrastructure-as-code-guide
  - /docs/templates/runbook-template
  - /guides/devops/monitoring-alerting-guide
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

## Best Practices

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
