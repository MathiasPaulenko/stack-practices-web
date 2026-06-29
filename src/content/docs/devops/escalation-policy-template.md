---
contentType: docs
slug: escalation-policy-template
title: "Escalation Policy Template"
description: "A template for defining incident severity levels and on-call escalation paths."
metaDescription: "Use this escalation policy template to define incident severity levels, on-call escalation paths, and response SLAs for your engineering team."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - escalation
  - policy
  - on-call
  - operations
  - template
relatedResources:
  - /docs/auto-scaling-policy-template
  - /docs/bug-triage-template
  - /docs/change-management-template
  - /docs/runbook-template
  - /docs/backup-and-restore-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this escalation policy template to define incident severity levels, on-call escalation paths, and response SLAs for your engineering team."
  keywords:
    - devops
    - escalation
    - policy
    - on-call
    - operations
    - template
---
## Overview

When a critical incident strikes at 3 a.m., an on-call engineer must know in 30 seconds whether to wake up the CTO or handle it alone. Most teams assume escalation is "common sense"—until a low-priority ticket wakes the CEO or a data-loss incident sits unresolved for hours because no one knew who to call. This template defines clear severity levels, response times, and escalation paths so your team responds with confidence, not panic.

## When to Use

Use this resource when:
- You are building or revising an on-call rotation and need explicit escalation rules
- A recent incident was mishandled because the on-call engineer did not know who to escalate to
- Your compliance framework (SOC 2, ISO 27001) requires documented incident response SLAs

## Solution

```markdown
# Escalation Policy: `<Team / Service>`

## 1. Severity Levels

| Level | Name | Criteria | Response Time | Resolution Target |
|-------|------|----------|---------------|-------------------|
| SEV 1 | Critical | Service down; data loss; security breach; revenue impact | 5 min | 4 hours |
| SEV 2 | Major | Major capability broken; major performance degradation | 15 min | 8 hours |
| SEV 3 | Minor | Feature degraded; partial outage affecting subset of users | 1 hour | 24 hours |
| SEV 4 | Low | Cosmetic issue; documentation error; non-urgent question | 4 hours | Next business day |

## 2. On-Call Roster

| Role | Primary | Backup | Contact Method | Response SLA |
|------|---------|--------|----------------|--------------|
| L1 — On-Call Engineer | `@name` | `@name` | Pager / SMS | 5 min (SEV 1), 15 min (SEV 2) |
| L2 — Team Lead | `@name` | `@name` | Phone / Slack | 15 min (SEV 1), 30 min (SEV 2) |
| L3 — Engineering Manager | `@name` | `@name` | Phone | 30 min (SEV 1), 1 hour (SEV 2) |
| L4 — VP Engineering / CTO | `@name` | `@name` | Phone | 1 hour (SEV 1 only) |

## 3. Escalation Paths

### SEV 1 — Critical

| Time Elapsed | Action | Escalate To |
|--------------|--------|-------------|
| 0 min | Acknowledge page; begin response | L1 |
| 10 min | No meaningful progress; page backup | L2 |
| 20 min | No resolution path identified; page manager | L3 |
| 45 min | No resolution; executive awareness required | L4 |
| 2 hours | Open war room; notify customer-facing teams | L3 + Comms |

### SEV 2 — Major

| Time Elapsed | Action | Escalate To |
|--------------|--------|-------------|
| 0 min | Acknowledge; assess scope | L1 |
| 30 min | No clear fix; engage team lead | L2 |
| 1 hour | No resolution; manager awareness | L3 |
| 3 hours | Open bridge; customer communication if user-facing | L3 + Comms |

### SEV 3 / SEV 4

| Time Elapsed | Action | Escalate To |
|--------------|--------|-------------|
| 0 min | Acknowledge; triage | L1 |
| 4 hours (SEV 3) | No progress; team lead notification | L2 |
| Next business day (SEV 4) | Standard backlog assignment | L2 |

## 4. Communication Channels

| Severity | Initial Alert | Updates | Status Page | Customer Comms |
|----------|---------------|---------|-------------|----------------|
| SEV 1 | Page + Slack #incidents | Every 15 min | Yes, immediately | Yes, within 30 min |
| SEV 2 | Page + Slack #incidents | Every 30 min | Yes, within 30 min | Yes, if user-facing |
| SEV 3 | Slack #incidents | Every 1 hour | No | No |
| SEV 4 | JIRA / Linear ticket | Daily standup | No | No |

## 5. Response Runbook Checklist

- [ ] Acknowledge alert within SLA
- [ ] Classify severity using criteria above
- [ ] If SEV 1 or SEV 2: create Slack #incidents thread
- [ ] If SEV 1: open war room bridge immediately
- [ ] Document timeline in incident tracking tool
- [ ] Update status page for SEV 1–2 within SLA
- [ ] Notify customer-facing teams if user impact > 5%
- [ ] Post initial assessment in incident thread within 15 minutes
- [ ] Update incident thread every 15–30 minutes until resolved
```

## Explanation

The template separates **severity classification** from **escalation timing**. Many teams conflate the two: they assume a critical alert automatically pages the CTO. In practice, escalation should be **time-based**, not just severity-based. A SEV 1 that resolves in 10 minutes never needs executive involvement. The escalation paths force structured decisions at fixed intervals, preventing both premature panic and dangerous delay.

## Variants

| Organization Size | Escalation Depth | Key Difference |
|-------------------|------------------|----------------|
| Startup (< 20 engineers) | L1 → L2 (founder/CTO) | Flat; CTO is often L2 |
| Mid-size (20–100) | L1 → L2 → L3 | Team leads are the critical layer |
| Enterprise (100+) | L1 → L2 → L3 → L4 | VP/CTO only for multi-hour SEV 1 |
| 24/7 SaaS | Add L0 — NOC / SRE on-call | NOC triages before engineering pages |
| Follow-the-sun | Regional L1 handoffs | APAC → EMEA → AMER rotation |

## What works

1. Print the escalation matrix and post it in the on-call Slack channel topic
2. Use the same severity criteria across all teams; inconsistent definitions cause confusion
3. Test the escalation path quarterly with a synthetic page; phone numbers go stale
4. Define "no meaningful progress" explicitly (e.g., "no root-cause hypothesis within 10 minutes")
5. Document out-of-hours contact methods separately; do not rely on Slack DMs at 3 a.m.

## Common Mistakes

1. Making escalation optional or culturally discouraged ("don't wake the manager")
2. Not defining backup contacts; the primary on-call may be asleep, sick, or on a plane
3. Using severity as a measure of effort instead of impact
4. Skipping the status page update because "it will be fixed soon"
5. Not reviewing escalation decisions after incidents; patterns reveal training gaps

## Frequently Asked Questions

### What if the on-call engineer cannot classify severity immediately?

Start with the highest reasonable severity. It is always easier to downgrade than to upgrade. If you are unsure between SEV 1 and SEV 2, treat it as SEV 1 for the first 15 minutes. Re-classify once you have enough data. Document the re-classification and rationale in the incident thread.

### Should the same person be on-call for multiple services?

Avoid it if possible. Context switching between unrelated services during an outage reduces effectiveness. If unavoidable due to team size, ensure the runbook for each service is extremely detailed and that the paging system includes the service name in the alert. The escalation policy should still apply per-service, not per-person.

### How do I handle an on-call engineer who is unresponsive?

The policy must specify an unresponsive timeout (e.g., 5 minutes for SEV 1, 10 minutes for SEV 2). After the timeout, the paging system automatically escalates to the backup on-call, then to the team lead. Do not let "maybe they are in the shower" become a 30-minute delay. Automate this in PagerDuty, Opsgenie, or your paging tool.
