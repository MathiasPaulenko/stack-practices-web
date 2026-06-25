---
contentType: guides
slug: incident-response-guide
title: "Incident Response — Structured Handling for Production Outages"
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

This guide covers incident declaration, roles, communication, and resolution workflows.

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

**Declaration principles:**
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

**Role best practices:**
- IC does not investigate directly; they coordinate
- Only the IC speaks for the incident team to stakeholders
- Rotate IC if the current person has been on for >2 hours
- Scribe timestamps every major action and decision

### 3. Communicate Effectively

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

**Communication principles:**
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

**Mitigation strategies:**
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

**Resolution principles:**
- Do not close until you have monitoring confirmation
- Keep the incident channel open for 24 hours for follow-up questions
- Schedule postmortem before memory fades
- Track MTTR and incident frequency as operational metrics

## Best Practices

- **Practice before you need it.** Run game days and chaos engineering exercises.
- **Start with mitigation, not root cause.** Fix the user impact first; investigate after.
- **One incident commander.** Decision authority must be clear and singular.
- **Communicate early and often.** Silence during an incident creates panic.
- **Document everything.** The scribe's notes are the foundation of the postmortem.
- **Learn from every incident.** If you are having the same incident twice, your process is broken.

## Common Mistakes

- **No clear IC.** Multiple people giving orders creates confusion and delay.
- **Skipping communication.** Stakeholders make their own (often wrong) assumptions.
- **Chasing root cause before mitigating.** Users do not care why it broke; they care that it works.
- **Forgetting to verify.** Marking resolved too early leads to re-opened incidents.
- **No follow-up.** Incidents without postmortems are wasted learning opportunities.

## Variants

- **Automated incident response:** Auto-remediation runbooks triggered by alerts
- **Follow-the-sun response:** Regional teams hand off incidents across time zones
- **External dependency incidents:** Pre-defined escalation to third-party vendors
- **Security incident response:** Separate playbook for breaches and data exposure

## FAQ

**Q: When should I declare an incident vs. handle as a normal alert?**
Declare when user-impacting symptoms are confirmed and the standard alert response is insufficient. When in doubt, declare.

**Q: Who should be Incident Commander?**
The most available senior engineer who is not actively debugging. IC coordinates; they do not investigate.

**Q: How do I run an effective postmortem?**
Schedule within 48 hours, focus on process and system improvements, not blame. See the [Postmortem Guide](/guides/observability/postmortem-guide).

**Q: What if we cannot find the root cause?**
That is okay. Document what you know, what you tried, and what you will monitor. Some incidents remain partially unexplained.

## Conclusion

Incident response is a team sport with clear rules. By declaring early, assigning roles, communicating relentlessly, and focusing on mitigation before investigation, you turn chaotic outages into structured, learnable events.

## Related Resources

- [Alert Management](/guides/observability/alert-management-guide)
- [Postmortems](/guides/observability/postmortem-guide)
- [SRE Practices](/guides/devops/sre-practices-guide)
- [Chaos Engineering](/guides/devops/chaos-engineering-guide)
- [Disaster Recovery](/guides/planning/disaster-recovery-guide)
