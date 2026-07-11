---
contentType: docs
slug: change-management-template
title: "Change Management Template"
description: "A template for documenting CAB reviews and rollback criteria for production changes."
metaDescription: "Use this change management template to document CAB reviews, approval workflows, and rollback criteria for production changes."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - change-management
  - cab
  - rollback
  - operations
  - template
relatedResources:
  - /docs/bug-triage-template
  - /docs/runbook-template
  - /docs/auto-scaling-policy-template
  - /docs/backup-and-restore-template
  - /docs/cloud-cost-allocation-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this change management template to document CAB reviews, approval workflows, and rollback criteria for production changes."
  keywords:
    - devops
    - change-management
    - cab
    - rollback
    - operations
    - template
---
## Overview

Production changes are risky. A database migration, a configuration update, or a feature flag flip can cascade into an outage. Change management is not bureaucracy—it is a structured way to reduce surprise. This template documents the review, approval, and rollback workflow for any change that touches production, ensuring the right people have reviewed the risk and the rollback path is ready before you start.

## When to Use

Use this resource when:
- Introducing a change to production infrastructure, databases, or configuration
- Your compliance framework (SOC 2, ISO 27001) requires documented change approval
- A recent outage was caused by an unreviewed or untested change

## Solution

```markdown
# Change Request: `<Title>`

## 1. Change Summary

| Field | Value |
|-------|-------|
| Change ID | `CHG-YYYY-NNNN` |
| Title | `description` |
| Requester | `@name` |
| Team | `team` |
| Environment | `staging / production` |
| Scheduled Date / Time | `YYYY-MM-DD HH:MM UTC` |
| Duration (expected) | `X minutes / hours` |
| Risk Level | `Low / Medium / High / Critical` |

## 2. Change Description

**What is changing?**
[Describe the technical change in one paragraph.]

**Why is it needed?**
[Link to ticket, incident, or business justification.]

**What are the expected results?**
[Measurable outcome: latency reduced by X%, feature enabled for Y% of users.]

## 3. Impact Analysis

| System / Service | Impact | Validation Method |
|------------------|--------|-------------------|
| | | |

### Dependencies
- [ ] No dependent services affected
- [ ] Dependent services notified: `list`
- [ ] External partners / customers notified: `list`

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| | | | |

## 4. Rollback Plan

| Condition | Rollback Action | Time to Complete | Owner |
|-----------|----------------|-------------------|-------|
| Change fails during deployment | `git revert` / `terraform destroy -target` / config rollback | 10 min | `@name` |
| Performance degradation > 20% | Rollback to previous image / revert migration | 15 min | `@name` |
| Data inconsistency detected | Restore from pre-change snapshot | 30 min | `@name` |
| Unknown failure mode | Page on-call; execute emergency rollback runbook | 5 min | `@on-call` |

- [ ] Rollback has been tested in staging
- [ ] Rollback command is documented in runbook
- [ ] Database snapshot / backup taken before change
- [ ] Feature flag kill switch is ready (if applicable)

## 5. Approval

| Role | Name | Approved | Date |
|------|------|----------|------|
| Requester | | | |
| Technical Reviewer | | | |
| Product Owner (if user-facing) | | | |
| Security (if data / access change) | | | |
| CAB / Manager (High+ risk) | | | |

## 6. Execution Log

| Time (UTC) | Step | Result | Notes |
|------------|------|--------|-------|
| | | | |

## 7. Post-Change Review

- [ ] Change completed as planned
- [ ] Monitoring shows no anomalies for 1 hour post-change
- [ ] Rollback plan archived / updated based on lessons
- [ ] Ticket closed with outcome summary
```

## Explanation

The template enforces **three gates** before any production change: a description that justifies the change, an impact analysis that surfaces hidden dependencies, and a rollback plan that is ready before the change starts. The risk level determines who must approve: low-risk changes may only need a peer review, while high-risk changes require a Change Advisory Board (CAB) and explicit sign-off from security. The execution log creates an audit trail that is invaluable during post-mortems and compliance audits.

## Change Risk Assessment Matrix

```text
=== Change Risk Assessment ===

Risk Level Criteria:

CRITICAL:
  - Changes to authentication or authorization
  - Database schema changes affecting production data
  - Network infrastructure changes (VPC, firewall, DNS)
  - Changes during freeze periods (Black Friday, product launch)
  - Changes affecting > 50% of user traffic
  Approval: CAB + Security + Engineering Director

HIGH:
  - Changes to production configuration
  - API contract changes affecting external consumers
  - Infrastructure scaling changes
  - Database index additions/removals
  - Changes affecting 10-50% of user traffic
  Approval: CAB + Team Lead

MEDIUM:
  - Feature flag toggles in production
  - Non-breaking API additions
  - Configuration parameter updates
  - Dependency version bumps
  Approval: Team Lead + Peer Review

LOW:
  - CSS/styling changes
  - Copy/text updates
  - Documentation updates
  - Non-production environment changes
  Approval: Peer Review
```

## Change Calendar and Collision Detection

```text
=== Change Calendar (Week of 2026-07-08) ===

Monday    2026-07-08
  10:00  [MEDIUM] Deploy API v2.3.1 (team-a)     Status: Approved
  14:00  [LOW]     Update docs site (team-b)      Status: Approved

Tuesday   2026-07-09
  09:00  [HIGH]    DB migration: add index (dba)  Status: Pending CAB
  15:00  [MEDIUM]  Feature flag: checkout-v2 (team-c)  Status: Approved

Wednesday 2026-07-10
  --     FREEZE DAY (product launch)              No changes allowed

Thursday  2026-07-11
  10:00  [CRITICAL] Auth service upgrade (sec)    Status: Pending CAB
  11:00  [MEDIUM]  Deploy frontend v3.1 (team-d)  Status: Pending
  COLLISION DETECTED: Auth upgrade + frontend deploy at same time
  RESOLUTION: Move frontend deploy to 14:00

Friday    2026-07-12
  09:00  [LOW]     Cleanup unused S3 buckets (platform)  Status: Approved
  --     No HIGH/CRITICAL changes after 12:00 (weekend safety)
```

## Post-Change Review Template

```text
=== Post-Change Review ===

Change ID: CHG-2026-07-11-001
Title: Deploy API v2.3.1
Risk Level: MEDIUM
Change Owner: alice@example.com
Reviewer: bob@example.com

Execution Summary:
  Planned start:  10:00 UTC
  Actual start:   10:02 UTC
  Planned end:    10:30 UTC
  Actual end:     10:35 UTC
  Duration variance: +5 minutes

Outcome:
  [x] Change completed as planned
  [x] All deployment steps succeeded
  [x] Smoke tests passed
  [x] Monitoring shows no anomalies (1h post-change)
  [x] No rollback needed
  [x] Ticket closed with outcome summary

Issues Encountered:
  - Migration took 3 min longer than expected due to table size
  - No user impact

Lessons Learned:
  - Update migration time estimate for tables > 10M rows
  - Consider pre-warming cache after migration

Follow-up Actions:
  - Update runbook with new migration time estimate (alice, by 2026-07-18)
  - Add cache warming step to deployment script (platform, by 2026-07-25)
```


## Variants

| Context | Approval Gate | Focus |
|---------|---------------|-------|
| Startup / small team | Peer review + team lead | Speed; lightweight documentation |
| Enterprise / regulated | CAB + security + compliance | Full audit trail; formal sign-off |
| Infrastructure (Terraform) | IaC review + plan diff | Verify no destructive changes |
| Database migration | DBA review + rollback script | Data integrity is the priority |
| Feature flag rollout | Product + engineering | Gradual exposure; instant rollback via flag |
| Emergency change | Post-hoc approval within 24 hours | Fix first, document second—but document |

## What Works

1. Classify risk objectively; if the change touches billing, authentication, or data, it is at least Medium
2. Never approve your own change; require at least one independent reviewer
3. Test the rollback in staging, not just the forward change
4. Schedule high-risk changes during low-traffic windows with full team availability
5. Keep a change calendar visible to all teams to avoid collision (two risky changes at once)

## Common Mistakes

1. Treating "simple" changes as low-risk without impact analysis
2. Not notifying downstream teams who depend on the changed service
3. Skipping rollback testing because "it will probably work"
4. Approving changes via Slack DM instead of a documented record
5. Not reviewing the change after execution; lessons are lost if you do not close the loop

## Frequently Asked Questions

### When does a change need CAB approval?

High and Critical risk changes should go through a Change Advisory Board or equivalent senior review. Criteria include: changes to production databases, modifications to authentication/authorization, infrastructure that affects > 50% of traffic, or changes during a known sensitive period (e.g., Black Friday). Medium risk changes may only need team-lead approval. Low risk changes (e.g., CSS fixes, copy updates) can use peer review.

### How do I handle emergency changes that cannot wait for full approval?

Document an emergency change process: the on-call engineer executes the fix, then creates a retroactive change request within 24 hours with the full template filled in. The emergency path should require verbal approval from a manager or team lead, recorded in Slack or a bridge. Do not let "emergency" become an excuse for skipping process every week.

### Should infrastructure-as-code changes use this template?

Yes, but integrate with your IaC review process. The change request should reference the pull request and the `terraform plan` diff. The risk assessment focuses on whether the plan shows destructive changes (resource replacement) or just additive changes. The rollback plan for IaC is often a `git revert` + re-apply, but verify that the state file will remain consistent.


### How do we implement change freezes?

Define freeze periods based on business events: product launches, holidays, sales events (Black Friday), regulatory deadlines. During a freeze, only emergency changes are allowed with VP-level approval. Communicate freeze dates at least 2 weeks in advance. Block deployments via CI/CD during freezes with an override process for emergencies. Document the freeze in the change calendar. Resume normal changes after the freeze period ends with a debrief on any emergency changes made during the freeze.

### What is a Change Advisory Board (CAB)?

A CAB is a group of stakeholders who review and approve high-risk changes. Typical members: engineering manager, security representative, operations lead, and product owner. The CAB meets on a regular schedule (weekly or twice weekly) to review upcoming changes. Emergency CAB meetings can be called for urgent changes. The CAB reviews the change description, impact analysis, rollback plan, and risk assessment. Document CAB decisions in the change management system for audit trails.

### How do we track change success rate?

Track metrics: total changes per month, percentage of changes that caused incidents, percentage of changes that required rollback, average time to complete a change, and percentage of changes with complete documentation. Target: < 5% incident rate, < 10% rollback rate. Review metrics monthly. Identify patterns in failed changes (specific services, specific change types, specific times). Use these patterns to improve the change process and provide targeted training.

### How do we handle rollback when the change cannot be reversed?

Some changes are irreversible (database migrations that drop columns, data deletions, schema changes). For these, create a forward-fix plan instead of a rollback plan. The forward-fix plan documents how to restore functionality if the change causes issues, even if the original state cannot be restored. Test the forward-fix in staging. Have a communication plan ready for stakeholders. Consider doing irreversible changes in phases: first deprecate, then remove in a later change after a verification period.

### How do we integrate change management with GitOps?

In a GitOps workflow, the pull request IS the change request. Link the PR to the change management system. Use PR labels for risk classification (low, medium, high, critical). Require approvals based on risk level: low = 1 reviewer, medium = 2 reviewers, high = CAB approval. The merge commit is the execution. Use tools like Argo CD or Flux to track deployment status. The PR description should include the impact analysis and rollback plan. Close the change ticket automatically when the deployment succeeds.
