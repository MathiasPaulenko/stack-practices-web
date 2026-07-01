---
contentType: docs
slug: incident-communication-template
title: "Incident Communication Template"
description: "A template for notifying stakeholders during production outages with pre-drafted messages for each incident severity level and audience type."
metaDescription: "Communicate clearly during outages with this template. Pre-drafted messages for customers, executives, support teams, and internal stakeholders by severity."
difficulty: beginner
topics:
  - devops
  - infrastructure
tags:
  - incident-management
  - communication
  - template
  - outage
  - stakeholder-management
  - sre
relatedResources:
  - /docs/devops/incident-timeline-template
  - /docs/devops/escalation-policy-template
  - /docs/devops/downtime-communication-template
  - /docs/devops/on-call-handoff-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Communicate clearly during outages with this template. Pre-drafted messages for customers, executives, support teams, and internal stakeholders by severity."
  keywords:
    - incident communication
    - outage notification template
    - stakeholder communication
    - incident update template
    - customer outage message
---

## Overview

Poor incident communication turns a technical problem into a trust problem. When customers do not know what is happening, they assume the worst. When executives are surprised, they demand explanations instead of offering support. This template provides pre-drafted messages for every audience and severity level, so your team communicates clearly, consistently, and quickly during outages.

## When to Use

Use this template when:
- A production outage impacts customers or internal users
- An incident crosses severity thresholds requiring stakeholder notification
- You need to provide status updates during a prolonged incident
- Post-incident, you need to draft the final communication to affected parties

## Prerequisites

Before sending communications:
- [ ] Confirm the scope of impact (which services, regions, user segments)
- [ ] Verify the severity level with the incident commander
- [ ] Identify the correct communication channels for each audience
- [ ] Review any regulatory or contractual notification requirements

## Solution

```markdown
# Incident Communication: `<Incident Title>`

## Metadata

| Field | Value |
|-------|-------|
| Incident ID | ______ |
| Severity | P1 / P2 / P3 / P4 |
| Start Time (UTC) | ______ |
| Status | Investigating / Identified / Monitoring / Resolved |
| Incident Commander | ______ |
| Communication Lead | ______ |

---

## Message 1: Initial Notification

### For Customers (Status Page / Email)

**Severity: P1 (Critical)**

> We are investigating reports of [service] being unavailable. We will provide an update within 30 minutes or as soon as we have more information.
>
> **Impacted services:** [List services]
> **Started at:** [Time UTC]
> **Next update by:** [Time UTC + 30 min]

**Severity: P2 (High)**

> We are investigating degraded performance on [service]. Some users may experience [specific symptom]. We will provide an update within 60 minutes.
>
> **Impacted services:** [List services]
> **Started at:** [Time UTC]
> **Next update by:** [Time UTC + 60 min]

**Severity: P3/P4 (Medium/Low)**

> We are aware of an issue affecting [service description]. Impact is limited to [scope]. A fix is in progress and we expect resolution within [timeframe].

---

### For Internal Stakeholders (Slack / Email)

**Severity: P1/P2**

> **INCIDENT ALERT** — [Service] — [Severity]
>
> An incident has been declared for [service]. Impact: [brief description]. Incident commander: [name]. Channel: [link].
>
> No action required from your team at this time. Updates will be posted in [channel].

**Severity: P3/P4**

> **Incident Notification** — [Service] — [Severity]
>
> An incident has been opened for [service]. Impact is limited to [scope]. No customer-facing impact expected. Tracking in [channel].

---

### For Executives (Email / Slack DM)

> **Incident Summary** — [Service] — [Severity]
>
> **Impact:** [number] customers / [percentage]% of traffic / [region]
> **Revenue Risk:** [High / Medium / Low / None]
> **Root Cause (preliminary):** [one sentence if known]
> **ETA to Resolution:** [time if known]
> **Actions Taken:** [what has been done so far]
>
> I will send an update within [timeframe].

---

## Message 2: Status Update

### For Customers

> **Update** — [Service] — [Time UTC]
>
> We have [identified the cause / implemented a mitigation / deployed a fix] for the [service] issue. [Brief description of what happened and what was done].
>
> **Status:** Monitoring / In Progress
> **Next update by:** [Time UTC]

---

### For Internal Stakeholders

> **Incident Update** — [INC-xxx] — [Time UTC]
>
> **Status:** [Investigating / Identified / Mitigated / Monitoring]
> **What we know:** [2-3 sentence summary]
> **What we are doing:** [current actions]
> **What we need:** [any help required from other teams]
> **Next update:** [Time UTC]

---

### For Executives

> **Incident Update** — [INC-xxx] — [Time UTC]
>
> **Current Status:** [Investigating / Mitigated / Monitoring]
> **Customer Impact:** [updated numbers if changed]
> **Root Cause:** [updated understanding]
> **ETA to Full Resolution:** [updated estimate]
> **Risk of Recurrence:** [High / Medium / Low]
> **Postmortem Scheduled:** [Date / TBD]

---

## Message 3: Resolution

### For Customers

> **Resolved** — [Service] — [Time UTC]
>
> The issue affecting [service] has been resolved. All systems are operating normally.
>
> **Duration:** [start time] to [end time] ([duration])
> **Impact:** [summary of what users experienced]
> **Root Cause:** [brief, non-technical description]
> **Preventive Actions:** [what we are doing to prevent recurrence]
>
> We apologize for any inconvenience. If you continue to experience issues, please contact [support channel].

---

### For Internal Stakeholders

> **INCIDENT RESOLVED** — [INC-xxx] — [Time UTC]
>
> The incident affecting [service] has been resolved.
>
> **Duration:** [duration]
> **Root Cause:** [technical description]
> **Resolution:** [what fixed it]
> **Postmortem:** [Date / TBD] — [Link when available]
> **Action Items:** [Link to tracking]

---

### For Executives

> **Incident Closed** — [INC-xxx] — [Time UTC]
>
> **Final Status:** Resolved
> **Total Duration:** [duration]
> **Customer Impact:** [final numbers]
> **Revenue Impact:** [if any]
> **Root Cause:** [one paragraph]
> **Preventive Actions:** [list]
> **Postmortem:** [Date] — [Link]
> **Follow-up Required:** [Yes / No — details if yes]

---

## Communication Rules

1. Be honest about what you know. Do not guess at root causes
2. Provide ETAs only if confident. Missed ETAs destroy trust faster than no ETA
3. Update on schedule even if no progress. Silence breeds anxiety
4. Use the same channel for updates. Do not make stakeholders hunt for information
5. Match technical depth to audience. Executives need impact, engineers need details

## Communication Frequency by Severity

| Severity | Initial Notification | Updates | Resolution |
|----------|---------------------|---------|------------|
| P1 | Immediate | Every 15-30 min | Within 15 min of resolution |
| P2 | Within 15 min | Every 30-60 min | Within 30 min of resolution |
| P3 | Within 30 min | Every 2-4 hours | Within 1 hour of resolution |
| P4 | Within 1 hour | Daily or on change | Within 1 hour of resolution |
```

## Explanation

The template separates communications by **audience** (customers need reassurance and timelines, executives need business impact, internal teams need technical coordination) and **timing** (initial, update, resolution). The key principle is that every message answers three questions: what happened, what we are doing about it, and when we will update next. Without those three elements, communication creates more anxiety than it resolves.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Customer-facing SaaS | Status page + email | Automate via status page tool (Statuspage, Instatus) |
| Internal tools only | Slack + email | No external communication needed |
| Security incident | Legal + PR review first | Never communicate security incidents without legal clearance |
| Data breach | Regulatory notification | May require 72-hour notification under GDPR |
| Mobile app outage | In-app banner + social media | Users may not check email during app outage |

## What Works

1. Draft templates during calm periods. Create specific versions for your services before an incident happens
2. Assign a communication lead separate from the incident commander during P1s
3. Review messages for tone. Avoid jargon, blame, or over-technical explanations
4. Include a human signature. Signed messages feel more authentic than generic status updates
5. Track communication delays. If it takes 20 minutes to draft an update, your process is too slow

## Common Mistakes

1. Saying "we are investigating" for hours. Provide meaningful updates or admit you are stuck
2. Over-promising resolution times. Give ranges ("1-2 hours") instead of exact times
3. Using different terminology across channels. "degraded" on status page and "outage" in Slack creates confusion
4. Forgetting to notify internal teams. Customer communication is visible, but internal teams need coordination too
5. Sending resolution before verification. Confirming resolution prematurely leads to reopening

## Frequently Asked Questions

### How do we handle incidents where we do not know the root cause yet?

State what you know, what you have ruled out, and what you are checking next. Example: "We have identified that the issue is isolated to the API layer. Database and cache layers are operating normally. We are investigating configuration changes deployed in the last 24 hours."

### Should we apologize in incident communications?

Yes, but proportionally. A brief "we apologize for the inconvenience" is appropriate for customer-facing outages. Avoid excessive apology language that sounds insincere. Focus on facts and remediation.

### What if an incident spans multiple time zones?

Always use UTC for all timestamps. Include local time for the primary affected region if relevant. Ensure the handoff between shifts includes communication status so updates do not stop when teams go offline.
