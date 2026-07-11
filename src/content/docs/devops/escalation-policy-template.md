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

## PagerDuty Escalation Policy Configuration

```yaml
escalation_policy:
  name: "Platform Team - SEV1"
  num_loops: 2
  rules:
    - escalation_delay_in_minutes: 5
      targets:
        - type: user
          id: "L1-primary"
    - escalation_delay_in_minutes: 10
      targets:
        - type: user
          id: "L1-backup"
    - escalation_delay_in_minutes: 15
      targets:
        - type: user
          id: "L2-team-lead"
    - escalation_delay_in_minutes: 30
      targets:
        - type: user
          id: "L3-engineering-manager"
  on_call_handoff_time: "08:00:00"
  on_call_handoff_timezone: "UTC"
```

## Incident Communication Templates

### Initial Customer Notice (SEV 1)

```text
[INCIDENT] We are investigating an issue affecting <service>.
Impact: <description of user-facing impact>
Started: <timestamp UTC>
Status: Investigating
Next update: Within 15 minutes
```

### Resolution Notice

```text
[RESOLVED] <service> is operating normally.
Duration: <total time>
Root cause: <brief summary>
Affected users: <approximate count or percentage>
Preventive action: <what we are doing to prevent recurrence>
```

## Post-Incident Review Template

```markdown
# Post-Incident Review: <Incident Title>

## Summary
- Date: YYYY-MM-DD
- Duration: X hours Y minutes
- Severity: SEV X
- Impact: <users affected, revenue impact, downtime>

## Timeline
| Time (UTC) | Event |
|------------|-------|
| 00:00 | Alert fired |
| 00:05 | On-call acknowledged |
| 00:15 | Root cause identified |
| 00:45 | Fix deployed |
| 01:00 | Confirmed resolved |

## Root Cause
<What caused the incident>

## Contributing Factors
<What made it worse or harder to detect>

## What Went Well
- <Things that worked>

## What Went Wrong
- <Things that did not work>

## Action Items
| Action | Owner | Due Date | Priority |
|--------|-------|----------|----------|
| <action> | @name | YYYY-MM-DD | P1 |
```

## Variants

| Organization Size | Escalation Depth | Key Difference |
|-------------------|------------------|----------------|
| Startup (< 20 engineers) | L1 → L2 (founder/CTO) | Flat; CTO is often L2 |
| Mid-size (20–100) | L1 → L2 → L3 | Team leads are the critical layer |
| Enterprise (100+) | L1 → L2 → L3 → L4 | VP/CTO only for multi-hour SEV 1 |
| 24/7 SaaS | Add L0 — NOC / SRE on-call | NOC triages before engineering pages |
| Follow-the-sun | Regional L1 handoffs | APAC → EMEA → AMER rotation |
| Regulated industry | Add compliance officer escalation | Notify DPO or compliance lead for data breaches |
| Multi-tenant SaaS | Add customer success escalation | Notify CSM for accounts > $100k ARR |

## What works

1. Print the escalation matrix and post it in the on-call Slack channel topic
2. Use the same severity criteria across all teams; inconsistent definitions cause confusion
3. Test the escalation path quarterly with a synthetic page; phone numbers go stale
4. Define "no meaningful progress" explicitly (e.g., "no root-cause hypothesis within 10 minutes")
5. Document out-of-hours contact methods separately; do not rely on Slack DMs at 3 a.m.
6. Automate escalation in your paging tool; manual escalation fails under stress
7. Include a "cooling off" period after on-call rotation to prevent burnout

## Common Mistakes

1. Making escalation optional or culturally discouraged ("don't wake the manager")
2. Not defining backup contacts; the primary on-call may be asleep, sick, or on a plane
3. Using severity as a measure of effort instead of impact
4. Skipping the status page update because "it will be fixed soon"
5. Not reviewing escalation decisions after incidents; patterns reveal training gaps
6. Escalating to individuals instead of roles; people leave, roles persist
7. Not updating contact info after team changes; stale phone numbers cause critical delays

## Frequently Asked Questions

### What if the on-call engineer cannot classify severity immediately?

Start with the highest reasonable severity. It is always easier to downgrade than to upgrade. If you are unsure between SEV 1 and SEV 2, treat it as SEV 1 for the first 15 minutes. Re-classify once you have enough data. Document the re-classification and rationale in the incident thread.

### Should the same person be on-call for multiple services?

Avoid it if possible. Context switching between unrelated services during an outage reduces effectiveness. If unavoidable due to team size, ensure the runbook for each service is extremely detailed and that the paging system includes the service name in the alert. The escalation policy should still apply per-service, not per-person.

### How do I handle an on-call engineer who is unresponsive?

The policy must specify an unresponsive timeout (e.g., 5 minutes for SEV 1, 10 minutes for SEV 2). After the timeout, the paging system automatically escalates to the backup on-call, then to the team lead. Do not let "maybe they are in the shower" become a 30-minute delay. Automate this in PagerDuty, Opsgenie, or your paging tool.

### How long should an on-call shift be?

One week is the standard. Shorter shifts (3-4 days) reduce fatigue but increase handoff overhead. Longer shifts (2 weeks) cause burnout and reduce alertness. Never schedule someone for more than 2 weeks consecutively. Include a cooling-off period of at least one week off after each rotation.

### What is the difference between an escalation policy and an incident response plan?

An escalation policy defines who to contact and when. An incident response plan defines what to do once contacted: triage, mitigate, communicate, resolve, and review. The escalation policy is a component of the broader incident response plan.

### Should we use a single escalation policy across all teams?

Use a shared template but allow per-team customization. The severity levels and communication standards should be organization-wide. The contact roster, escalation depth, and paging rules should be team-specific. This balances consistency with practical flexibility.

### How do we measure escalation policy effectiveness?

Track these metrics monthly: mean time to acknowledge (MTTA), mean time to resolve (MTTR), percentage of incidents escalated, false escalation rate, and on-call satisfaction score. If MTTA is consistently above SLA, the policy or paging tool needs adjustment.


### Should we notify customers during SEV 2 incidents?

If the incident affects users, yes. Send an initial notice within 30 minutes and updates every 30 minutes until resolved. Even if impact is minor, transparency builds trust. Use the SEV 1 customer notice template but adjust the tone to reflect lower severity.

### How do we prevent on-call burnout?

Rotate weekly, limit to 2 consecutive weeks max, include a cooling-off week after each rotation, and compensate with time off or extra pay. Monitor page count per shift. If an engineer receives more than 5 pages in a shift, reassign services or tune alert thresholds.

### What if the on-call engineer is sick or unavailable?

The policy must define a swap procedure: the engineer notifies the backup and team lead as early as possible. The backup assumes on-call immediately. If both primary and backup are unavailable, the team lead (L2) takes over temporarily while a replacement is found. Document the swap in the on-call Slack channel.

### Should we have a NOC (L0) before the engineering team?

For 24/7 services with high alert volume, yes. A NOC or SRE on-call (L0) filters repeated alerts, executes known runbooks, and only escalates to engineering when service-specific expertise is needed. This reduces engineering pages by 40-60%. For small teams, L1 does this filtering.

### How do we handle cross-team escalations during an incident?

Designate an Incident Commander (IC) who coordinates across teams. The IC does not fix the problem directly but facilitates communication, assigns actions, and maintains the timeline. If the incident involves 3 or more teams, the IC should be someone outside the affected teams to maintain objectivity. The IC reports to L3/L4 with a summary every 30 minutes.

### What tools do we recommend for automating escalation?

PagerDuty, Opsgenie, and Grafana Oncall are the most common options. All support: automatic rotations, time-based escalation, routing rules by severity, and integrations with Slack/Teams. Choose based on your existing stack: PagerDuty for broad ecosystem, Opsgenie if you use Atlassian, Grafana Oncall if you already have Grafana.

### How do we track escalation policy compliance?

Review monthly: percentage of incidents acknowledged within SLA, percentage of escalations that were justified, average time to escalation, and number of incidents that required L3 or L4 involvement. Share these metrics with engineering leadership quarterly. If SLA compliance drops below 90%, schedule a policy review.

### Should we integrate the escalation policy with our ticketing system?

Yes. Configure PagerDuty or Opsgenie to create a ticket automatically when an incident is resolved, ensuring post-incident action items are tracked. Link the incident to the ticket for traceability. Review open action items monthly to prevent accumulation.