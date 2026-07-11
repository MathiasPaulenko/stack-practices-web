---
contentType: docs
slug: postmortem-incident-review-template
title: "Postmortem Incident Review Template"
description: "A blameless postmortem template for analyzing incidents, identifying root causes, and documenting lessons to prevent recurrence."
metaDescription: "Run blameless incident reviews with this postmortem template. Covers timeline reconstruction, root cause analysis, action items, and lessons learned."
difficulty: intermediate
topics:
  - devops
  - observability
tags:
  - postmortem
  - incident-review
  - root-cause
  - sre
  - reliability
relatedResources:
  - /docs/devops/incident-communication-template
  - /docs/devops/incident-timeline-template
  - /docs/devops/monitoring-alerting-policy-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Run blameless incident reviews with this postmortem template. Covers timeline reconstruction, root cause analysis, action items, and lessons learned."
  keywords:
    - postmortem template
    - incident review
    - blameless postmortem
    - root cause analysis
    - sre practices
---

## Overview

Every outage is a lesson that someone will repeat unless it is written down. Postmortems are not about blame — they are about understanding how a system with good people and good intentions still failed. A well-run postmortem reconstructs what happened, identifies the chain of events that led to failure, and produces concrete actions that make the next incident less likely or less severe.

## When to Use

Use this template when:
- A service-impacting incident has been resolved
- An incident exceeded a severity threshold (e.g., SEV-2 or higher)
- An incident caused data loss, security exposure, or compliance impact
- A near-miss revealed a major risk that did not materialize
- A recurring issue suggests a deeper systemic problem

## Prerequisites

Before running a postmortem:
- [ ] The incident is fully resolved and systems are stable
- [ ] A timeline of events has been collected (see incident timeline template)
- [ ] Key participants are available: responders, engineers involved, and observers
- [ ] Leadership supports a blameless process
- [ ] There is a decision on whether the postmortem is internal-only or customer-facing

## Solution

```markdown
# Postmortem: `<Incident Title>`

> Incident ID: ______ | Date: ______ | Severity: ______
> Lead responder: ______ | Postmortem owner: ______
> Review date: ______ | Status: Draft / Reviewed / Approved

## 1. Executive Summary

- **What happened:** ______
- **Impact:** ______
- **Duration:** ______
- **Root cause (one sentence):** ______
- **Status:** ______

## 2. Impact Assessment

| Metric | Value |
|--------|-------|
| Services affected | ______ |
| Users affected | ______ |
| Error rate increase | ______ |
| Revenue / transaction impact | ______ |
| Data affected | ______ |
| SLA / SLO impact | ______ |

## 3. Timeline

| Time (UTC) | Event | Source |
|------------|-------|--------|
| ______ | ______ | ______ |
| ______ | ______ | ______ |
| ______ | ______ | ______ |

## 4. Root Cause Analysis

### What was the trigger?

______

### What was the contributing factor?

______

### Why did detection take longer than expected?

______

### Why did recovery take longer than expected?

______

### What defenses failed or were missing?

______

## 5. Lessons Learned

### What went well

- ______
- ______

### What went wrong

- ______
- ______

### Where we got lucky

- ______
- ______

## 6. Action Items

| Action | Owner | Due Date | Priority | Status |
|--------|-------|----------|----------|--------|
| ______ | ______ | ______ | P0 / P1 / P2 | ______ |

## 7. Communication

- [ ] Internal stakeholders notified
- [ ] Customer-facing post published (if applicable)
- [ ] Support team briefed
- [ ] Status page updated with resolution

## 8. Appendix

- Links to dashboards: ______
- Links to logs: ______
- Links to incident channels: ______
- Related tickets: ______
```

## Explanation

The template separates the **story** (timeline, what happened) from the **analysis** (why it happened) from the **action** (what we will do). The **root cause analysis** section uses a chain of questions that expose not just the trigger but the conditions that allowed the trigger to cause an outage. The **"where we got lucky"** section is critical: it identifies near-misses and hidden risks that did not materialize this time but may next time.

## Real Postmortem Example

```markdown
# Postmortem: INC-2026-07-11-001 — Login Failures in EU

## Summary
On July 11, 2026, the authentication service experienced a 15%
error rate for login attempts in the EU region for 30 minutes.
The root cause was a configuration change that altered the JWT
secret rotation interval, causing token validation to fail for
active sessions.

## Impact
- Duration: 30 minutes (10:55 - 11:25 UTC)
- Users affected: ~15,000 (15% of login attempts)
- Region: eu-west-1
- Revenue lost: estimated $2,500
- Support tickets: 47

## Timeline
- 10:42  DB CPU begins rising
- 10:55  PagerDuty alerts fire
- 11:00  SEV1 declared
- 11:03  Config change identified as cause
- 11:05  Rollback initiated
- 11:08  Rollback deployed
- 11:12  Error rate at 0%
- 11:25  Incident resolved

## Root Cause Analysis
1. Why did token validation fail?
   The JWT secret rotated before existing tokens expired.
2. Why did the secret rotate?
   The config change reduced the rotation interval from 24h to 1h.
3. Why did the change pass tests?
   Config tests did not validate secret rotation behavior.
4. Why was there no alert before impact?
   The latency alert threshold was set too high.

## What went well
- Fast detection and response (3 min from detection to declaration)
- Clear communication to stakeholders and support
- Quick and effective rollback

## What went wrong
- Config change without security review
- Insufficient config tests
- Alert thresholds too high

## Action Items
| Action | Owner | Due Date | Priority |
|--------|-------|----------|----------|
| Add secret rotation test | alice | 2026-07-18 | P0 |
| Review latency alert thresholds | bob | 2026-07-15 | P1 |
| Add security review for config changes | platform | 2026-07-25 | P1 |
```


## Variants

| Context | Adjustments | Notes |
|---------|-------------|-------|
| Security incident | Add impact assessment section for data exposure, add legal review, and restrict distribution | Security postmortems may be confidential |
| Data loss incident | Add data recovery steps, backup verification, and customer notification timeline | Focus on what was lost and what was recovered |
| Performance degradation (not outage) | Add latency percentiles, throughput drop, and cascading slowdown effects | Degradation is harder to define than downtime |
| Third-party dependency failure | Add vendor communication timeline and alternative provider evaluation | You cannot fix the vendor, but you can reduce dependence |
| Recurring incident | Add a comparison to previous similar incidents and a deeper systemic analysis | Patterns matter more than individual events |

## What works

1. **Schedule within 48 hours** — memory fades and logs rotate; run the postmortem while details are fresh
2. **Invite observers, not just responders** — people not in the heat of the moment often see patterns responders miss
3. **Focus on systems, not people** — "the alert was missed" is a symptom; "the alert was drowned in noise" is a system problem
4. **Publish action items in the same week** — the value of a postmortem is proportional to how fast its actions are tracked
5. **Review old postmortems quarterly** — look for recurring themes and systemic gaps

## Common Mistakes

1. **Root cause = human error** — humans are the most variable component; the system should have made the error safe
2. **No executive summary** — without a one-paragraph summary, leadership will not read the rest
3. **Action items without owners or dates** — unassigned actions are forgotten actions
4. **Skipping "what went well"** — postmortems are not just complaints; they reinforce practices that worked
5. **No follow-up** — if nobody checks whether action items are done, the postmortem was a waste of time

## Frequently Asked Questions

### What if someone clearly made a mistake?

Ask: why was the mistake possible? Was the documentation unclear? Was the tool confusing? Was the person overloaded? Was there no safeguard? Blameless does not mean consequence-free — it means focusing on system improvements rather than punishment.

### Should postmortems be public?

Internal postmortems should be visible to all engineering teams. Customer-facing postmortems should be sanitized and published on a status page or blog. Transparency builds trust, but protect sensitive technical details that could aid attackers.

### How do we prevent "action item bankruptcy"?

Track postmortem action items in the same backlog as feature work. Review them in sprint planning. If an action item is repeatedly deprioritized, ask whether it is truly important — and if not, close it explicitly rather than letting it rot.


### How do we facilitate an effective postmortem session?

Assign a facilitator who was not an incident responder — they bring fresh perspective. Start with the timeline to establish facts. Then use the "5 whys" technique for root cause analysis. Encourage questions, not accusations. Limit the session to 60 minutes — if more time is needed, schedule a follow-up. Document everything in real-time in a shared document. Assign action items at the end with owners and due dates. Send the postmortem to all engineering teams within 48 hours.

### What is the "5 whys" technique and how do we apply it?

The "5 whys" is a root cause analysis method that asks "why" successively until reaching the fundamental cause. Example: "Why did login fail?" -> "Tokens were invalid." -> "Why were they invalid?" -> "The secret rotated." -> "Why did it rotate?" -> "The interval was changed." -> "Why was it changed?" -> "The config change was not reviewed." -> "Why was it not reviewed?" -> "No review process exists for config changes." The root cause is the missing process, not the change itself. Document the full chain in the postmortem.

### How do we handle postmortems for recurring incidents?

If an incident is similar to a previous one, reference the prior postmortem and compare. Ask: why did this happen again? Were the previous action items completed? Were they effective? Is there a deeper systemic cause? For incidents occurring 3+ times, escalate to leadership for an architecture review. Consider that the system may need a redesign, not just incremental fixes. Document the recurring pattern and actions taken at each iteration.

### How do we measure postmortem effectiveness?

Track: percentage of action items completed by due date (target: > 80%), average time to complete action items, number of recurring incidents (same type) after a postmortem, and time from incident to postmortem publication (target: < 72 hours). Review these metrics quarterly. If action items are not being completed, investigate why — are they too ambitious? Lack of resources? Not prioritized? Adjust the process based on findings.

### Who should approve the postmortem before publication?

The postmortem should be reviewed by: the incident commander (for factual accuracy), key responders (for technical accuracy), and the team lead or engineering manager (for action items and prioritization). For SEV1 incidents, the CTO or VP of engineering should review. For security incidents, legal and compliance teams must approve before any external publication. Document reviewers in the postmortem changelog. Never publish a postmortem without review — errors in a postmortem erode trust.




























End of document. Review and update quarterly.