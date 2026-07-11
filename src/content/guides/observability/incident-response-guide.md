---
contentType: guides
slug: incident-response-guide
title: "Incident Response: Structured Handling for Production Outages"
description: "A practical guide to incident response: declaring incidents, building an incident command structure, communication protocols, and reducing mean time to resolution with structured processes."
metaDescription: "Learn incident response: declaring incidents, command structure, communication protocols, and reducing MTTR with structured processes."
difficulty: intermediate
topics:
  - observability
  - devops
  - security
tags:
  - incident-response
  - outage
  - mttr
  - communication
  - runbook
  - guide
relatedResources:
  - /guides/observability/alert-management-guide
  - /guides/observability/postmortem-guide
  - /guides/devops/sre-practices-guide
  - /guides/devops/chaos-engineering-guide
  - /guides/planning/disaster-recovery-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn incident response: declaring incidents, command structure, communication protocols, and reducing MTTR with structured processes."
  keywords:
    - incident-response
    - outage
    - mttr
    - communication
    - runbook
    - guide
---

## Overview

Incident response is the structured process of reacting to unplanned service disruptions. Without structure, incidents devolve into chaos: too many people talking, no clear decision-maker, and unclear communication to stakeholders. A defined response process reduces mean time to resolution (MTTR), minimizes customer impact, and reduces stress on responders.

The following walks through incident declaration, roles, communication, and resolution workflows.

## When to Use

- You experience production outages that lack clear ownership
- Multiple engineers jump into incidents without coordination
- Communication to stakeholders during outages is inconsistent or missing
- Your MTTR is trending upward or exceeds your SLO
- You want to practice and improve response capabilities proactively

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Incident** | An unplanned disruption or degradation of service |
| **Incident Commander (IC)** | Single decision-maker who coordinates response |
| **Severity** | Impact classification (Sev1 = critical, Sev4 = minor) |
| **MTTR** | Mean Time To Resolution — average time to fix |
| **Communication Lead** | Person responsible for stakeholder updates |
| **Postmortem** | Blameless review after incident resolution |

## Incident Severity Classification

| Severity | Criteria | Response | Communication |
|----------|----------|----------|---------------|
| **Sev1** | Complete outage, revenue stopped, data loss | All hands, war room | Executive notification, status page, customer comms |
| **Sev2** | Major degradation, core feature broken | On-call team + backup | Status page, internal channels |
| **Sev3** | Partial impact, workaround available | Primary on-call | Internal ticket, no external comms |
| **Sev4** | Minor issue, minimal user impact | Best effort | Track in ticket, no urgency |

## Step-by-Step Incident Response

### 1. Detect and Declare

Recognize when an alert becomes an incident:

```markdown
## Incident Declaration Checklist

- [ ] Alert received and acknowledged
- [ ] Initial triage confirms user impact
- [ ] Severity assessed (Sev1-4)
- [ ] Incident Commander assigned
- [ ] Incident channel created (e.g., #incident-2024-001)
- [ ] Status page updated (Sev1/Sev2)
- [ ] Stakeholders notified (Sev1)
```

#### Declaration Principles

- When in doubt, declare. Downgrading is easier than catching up.
- Sev1 incidents get an Incident Commander immediately.
- Create a dedicated channel for every Sev1/Sev2 incident.
- Log start time, trigger, and initial assessment.

### 2. Assign Roles

Clear roles prevent chaos:

| Role | Responsibilities | Required For |
|------|------------------|--------------|
| **Incident Commander** | Makes all decisions, assigns tasks, controls scope | Sev1, Sev2 |
| **Technical Lead** | Investigates root cause, proposes fixes | Sev1, Sev2 |
| **Communication Lead** | Writes status updates, manages stakeholder comms | Sev1 |
| **Scribe** | Documents timeline, actions, and decisions | Sev1 |
| **Responder** | Executes tasks assigned by IC | All |

```markdown
## Incident Command Structure

                  Incident Commander
                         │
         ┌──────────────┼──────────────┐
         │              │              │
    Technical      Communication    Scribe
       Lead           Lead
         │
    Responders
```

#### What Works for Roles

- IC does not investigate directly; they coordinate
- Only the IC speaks for the incident team to stakeholders
- Rotate IC if the current person has been on for >2 hours
- Scribe timestamps every major action and decision

### 3. Communicate Well

Communication is as important as technical response:

| Audience | Channel | Frequency | Content |
|----------|---------|-----------|---------|
| **Response team** | Incident channel | Continuous | Status, hypotheses, actions |
| **Internal stakeholders** | #incidents or Slack | Every 15-30 min (Sev1) | Impact, ETA, what we know |
| **Executives** | Email/Slack DM | Every 30-60 min (Sev1) | Business impact, recovery plan |
| **Customers** | Status page | Every 15-30 min (Sev1/2) | What is affected, ETA, workarounds |

```markdown
## Status Update Template

**Incident:** #incident-2024-001
**Severity:** Sev1
**Started:** 14:30 UTC
**Status:** [Investigating / Identified / Monitoring / Resolved]

**Impact:** [What is broken and who is affected]
**What we know:** [Current understanding of root cause]
**What we are doing:** [Active remediation steps]
**ETA:** [Estimated time to resolution or next update]
**Workaround:** [Any available workaround for users]

Next update: 15:00 UTC
```

#### Communication Principles

- Under-promise and over-deliver on ETAs
- Do not speculate on root cause until confident
- Update even if nothing has changed ("still investigating")
- Close the loop: notify when resolved, then follow up with postmortem timeline

### 4. Investigate and Mitigate

Structured technical response:

```markdown
## Investigation Steps

1. **Confirm scope:** What is broken? For whom? Since when?
2. **Identify changes:** What deployed recently? Any config changes?
3. **Check dependencies:** Are downstream services healthy?
4. **Review logs and metrics:** Find the first error, the spike, the divergence
5. **Form hypothesis:** What is the most likely cause?
6. **Test hypothesis:** Can you reproduce or validate the theory?
7. **Implement fix:** Rollback, config change, scale up, patch
8. **Verify recovery:** Confirm metrics return to normal, user reports resolved
```

#### Mitigation Strategies

| Strategy | When to Use | Risk |
|----------|-------------|------|
| **Rollback** | Recent deployment caused issue | Low, if tested |
| **Feature flag disable** | Specific feature is broken | Very low |
| **Scale up** | Capacity exhaustion | Low, but may mask root cause |
| **Circuit breaker** | Dependency is failing | Low, degrades functionality |
| **Traffic shift** | Regional or deployment issue | Medium, requires prep |
| **Manual intervention** | Data corruption, complex state | High, requires expertise |

### 5. Resolve and Close

Formalize the end of an incident:

```markdown
## Resolution Checklist

- [ ] Service fully restored and verified
- [ ] Monitoring shows green for 15+ minutes
- [ ] Status page updated to "Resolved"
- [ ] Final communication sent to stakeholders
- [ ] Scribe has complete timeline documented
- [ ] Postmortem scheduled within 48 hours
- [ ] Incident formally closed in tracking system
```

#### Resolution Principles

- Do not close until you have monitoring confirmation
- Keep the incident channel open for 24 hours for follow-up questions
- Schedule postmortem before memory fades
- Track MTTR and incident frequency as operational metrics

## What Works

- Practice before you need it. Run game days and chaos engineering exercises.
- Start with mitigation, not root cause. Fix the user impact first; investigate after.
- One incident commander. Decision authority must be clear and singular.
- Communicate early and often. Silence during an incident creates panic.
- Document everything. The scribe's notes are the foundation of the postmortem.
- Learn from every incident. If you are having the same incident twice, your process is broken.

## Common Mistakes

- No clear IC. Multiple people giving orders creates confusion and delay.
- Skipping communication. Stakeholders make their own (often wrong) assumptions.
- Chasing root cause before mitigating. Users do not care why it broke; they care that it works.
- Forgetting to verify. Marking resolved too early leads to re-opened incidents.
- No follow-up. Incidents without postmortems are wasted learning opportunities.

## Variants

- Automated incident response: Auto-remediation runbooks triggered by alerts
- Follow-the-sun response: Regional teams hand off incidents across time zones
- External dependency incidents: Pre-defined escalation to third-party vendors
- Security incident response: Separate playbook for breaches and data exposure

## FAQ

### When should I declare an incident vs. handle as a normal alert?

Declare when user-impacting symptoms are confirmed and the standard alert response is insufficient. When in doubt, declare.

### Who should be Incident Commander?

The most available senior engineer who is not actively debugging. IC coordinates; they do not investigate.

### How do I run an useful postmortem?

Schedule within 48 hours, focus on process and system improvements, not blame. See the [Postmortem Guide](/guides/observability/postmortem-guide).

### What if we cannot find the root cause?

That is okay. Document what you know, what you tried, and what you will monitor. Some incidents remain partially unexplained.

## Conclusion

Incident response is a team sport with clear rules. By declaring early, assigning roles, communicating relentlessly, and focusing on mitigation before investigation, you turn chaotic outages into structured, learnable events.


## Advanced Topics

### Scenario: Sev-1 Incident Response in SaaS Platform

```text
Incident: API down, 100% requests failing
Severity: Sev-1 (critical)
Start: 03:15 UTC
On-call: Ana (primary), Luis (secondary)

Response timeline:
  03:15 - Alert fires: APIErrorRate 100% on api-gateway
  03:16 - Ana receives page (PagerDuty)
  03:17 - Ana opens Slack #incident-sev1
  03:18 - Verifies: 503 on all endpoints
  03:19 - Declares Sev-1, opens bridge (Zoom)
  03:20 - Invites Luis, team lead, DBA, infra
  03:22 - Ana investigates: recent deploy?
         kubectl rollout history deploy/api-gateway
         -> Deploy v3.2 12 min ago
  03:25 - Luis checks DB: connection pool saturated
         -> 1000 active connections (max 200)
  03:28 - Ana decides rollback to v3.1
  03:30 - Rollback executed: kubectl rollout undo
  03:33 - API restored, errors at 0%
  03:38 - Ana confirms stability for 5 min
  03:42 - Closes bridge, declares resolved
  03:43 - Creates ticket for post-mortem (48h)

Roles during incident:
  | Role | Person | Responsibility |
  |------|--------|----------------|
  | Incident Commander | Ana | Coordinate, decide |
  | Communications | Luis | Update stakeholders |
  | SME DB | Carlos (DBA) | Investigate database |
  | SME Infra | Pedro | Verify infrastructure |
  | Scribe | Bot | Timeline in Slack |

Communications:
  03:19 - #status: "Investigating Sev1 API down"
  03:25 - #status: "Root cause identified: deploy v3.2"
  03:28 - #status: "Executing rollback"
  03:33 - #status: "API restored, monitoring"
  03:42 - #status: "Incident resolved. Post-mortem in 48h"

Post-mortem (48h):
  - Summary: API down 18 min due to defective deploy
  - Impact: 50K users affected, $15K revenue lost
  - Root cause: Migration introduced query without LIMIT
    that opened unlimited connections to the pool
  - 5 Whys:
    1. Why did it go down? Connection pool exhausted
    2. Why exhausted? Query without LIMIT opened 1000 connections
    3. Why not detected? Tests did not cover load
    4. Why no load test? CI did not include performance tests
    5. Why? No budget for load testing in CI
  - Actions:
    1. Require LIMIT in queries (owner: team, 1 week)
    2. Add load test in CI with k6 (owner: platform, 2 weeks)
    3. Lower max pool connections to 100 (owner: SRE, 3 days)
    4. Add pool saturation alert (owner: SRE, 3 days)
    5. Code review checklist for migrations (owner: team lead, 1 week)

Lessons:
  - The Incident Commander coordinates, does not investigate
  - Communicate early and often
  - Rollback is the first option, not the last
  - Blameless post-mortem: fix the system, not the blame
  - Every action item has an owner and date
```

### How do I prepare a new team for on-call?

Start with shadowing: the new engineer shadows the on-call for 2 weeks without responding to pages. Then they respond to low-severity pages with the senior as backup. After 1 month, they take full rotations. Provide a runbook per service. Run game days in staging to practice incident response.
