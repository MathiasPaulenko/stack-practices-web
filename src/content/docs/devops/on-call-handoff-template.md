---
contentType: docs
slug: on-call-handoff-template
title: "On-Call Handoff Template"
description: "A template for transferring operational context between on-call shifts including active incidents, ongoing alerts, and system health status."
metaDescription: "Transfer on-call context between shifts with this template. Covers active incidents, ongoing alerts, system health, and upcoming changes."
difficulty: beginner
topics:
  - devops
  - infrastructure
tags:
  - on-call
  - handoff
  - runbook
  - incident-management
  - sre
  - template
relatedResources:
  - /docs/devops/incident-communication-template
  - /docs/devops/incident-timeline-template
  - /docs/devops/escalation-policy-template
  - /docs/devops/downtime-communication-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Transfer on-call context between shifts with this template. Covers active incidents, ongoing alerts, system health, and upcoming changes."
  keywords:
    - on call handoff
    - shift handover
    - incident handoff
    - sre template
    - on call template
---

## Overview

Poor on-call handoffs are a leading cause of incident escalation. When context is lost between shifts, the incoming engineer wastes precious minutes re-discovering what the outgoing engineer already knew. This template standardizes the handoff process, ensuring critical information about active incidents, ongoing alerts, and system state is transferred completely and consistently.

## When to Use

Use this template when:
- Transferring on-call responsibility between shifts or team members
- Going on vacation or extended leave with on-call coverage
- Handing off during a prolonged incident that spans multiple shifts
- Rotating on-call responsibilities weekly or bi-weekly

## Prerequisites

Before the handoff:
- [ ] Outgoing engineer reviews all active alerts and incidents
- [ ] Runbooks for ongoing issues are updated with latest findings
- [ ] Incident channel history is summarized for context
- [ ] Upcoming scheduled changes or deployments are noted

## Solution

```markdown
# On-Call Handoff Report

## Handoff Metadata

| Field | Value |
|-------|-------|
| Outgoing engineer | ______ |
| Incoming engineer | ______ |
| Handoff date/time | ______ |
| Shift duration | ______ |

## 1. Active Incidents

### Incident #1: `<Title>`
| Field | Value |
|-------|-------|
| Status | Investigating / Mitigated / Resolved |
| Severity | P1 / P2 / P3 / P4 |
| Start time | ______ |
| Incident channel | ______ |
| Current owner | ______ |

**Summary:**
One-paragraph description of what happened, what has been tried, and current state.

**Next steps:**
- [ ] Action item 1 (owner: ______, deadline: ______)
- [ ] Action item 2 (owner: ______, deadline: ______)

**Runbook / Reference:**
Link to relevant runbook or troubleshooting guide.

---

### Incident #2: `<Title>`
(Same structure as above)

## 2. Ongoing Alerts & Warnings

| Alert | Status | First Seen | Notes |
|-------|--------|------------|-------|
| High latency on API | WARN | 2 hours ago | Correlates with traffic spike, not useful yet |
| Disk usage > 80% | WARN | 1 day ago | Cleanup scheduled for tonight |
| Replication lag > 5s | OK | Just resolved | Auto-resolved after index rebuild |

## 3. System Health Summary

| Component | Status | Notes |
|-----------|--------|-------|
| API latency p95 | Healthy / Degraded / Critical | Current value: ______ |
| Error rate | Healthy / Degraded / Critical | Current value: ______ |
| Database connections | Healthy / Degraded / Critical | Current value: ______ |
| Queue depth | Healthy / Degraded / Critical | Current value: ______ |
| Cache hit rate | Healthy / Degraded / Critical | Current value: ______ |
| Disk usage | Healthy / Degraded / Critical | Current value: ______ |

## 4. Changes & Deployments

### Completed This Shift
| Change | Time | Status | Impact |
|--------|------|--------|--------|
| Database index rebuild | 02:00 UTC | Success | Reduced query time by 40% |
| Config update for caching | 14:30 UTC | Success | No impact observed |

### Scheduled Next Shift
| Change | Time | Risk | Prepared? |
|--------|------|------|-----------|
| Kubernetes upgrade | 06:00 UTC | Medium | Rollback tested, on-call aware |
| SSL certificate renewal | 10:00 UTC | Low | Auto-renewal configured |

## 5. Known Issues & Workarounds

| Issue | Workaround | Ticket | Priority |
|-------|------------|--------|----------|
| Memory leak in worker process | Restart every 6 hours | INC-123 | Medium |
| Flaky test in CI pipeline | Retry failed job | DEV-456 | Low |

## 6. Escalation Paths

| Scenario | Escalate To | Contact |
|----------|-------------|---------|
| P1 incident > 30 min | Engineering Manager | Slack / Phone |
| Security incident | Security Team | PagerDuty |
| Infrastructure outage | Platform Team | Slack / Phone |
| Data integrity issue | DBA on-call | PagerDuty |

## 7. Notes & Context

**Unusual observations this shift:**
- Any anomalies that don't rise to alert level but could be precursors to issues

**Requests from other teams:**
- Any non-urgent asks that came in during the shift

**General reminders:**
- Any team-specific context the incoming engineer should know
```

## Explanation

The template structures the handoff into **incidents** (what's broken), **alerts** (what might break), **health** (current state), and **changes** (what's coming). The escalation path section is critical for the incoming engineer who may not know who to call at 3 AM. The notes section captures the subtle context that doesn't fit into other categories but can prevent surprises.

## Handoff Checklist

```text
=== Pre-Handoff Checklist ===

[ ] All active incidents documented with current status and next steps
[ ] All alerts from this shift reviewed and disposition noted
[ ] System health dashboard screenshot or link included
[ ] Scheduled changes for next shift documented
[ ] Known issues and workarounds updated
[ ] Escalation paths verified (contacts still valid)
[ ] Unusual observations noted even if not alerting
[ ] Requests from other teams documented
[ ] PagerDuty schedule confirmed for incoming engineer
[ ] Incoming engineer has acknowledged receipt of handoff

=== Handoff Conversation Flow ===

1. Walk through active incidents first (5 min)
2. Review alerts that may escalate (3 min)
3. Check system health together (2 min)
4. Discuss scheduled changes (2 min)
5. Review known issues (2 min)
6. Share unusual observations (1 min)
7. Incoming engineer asks questions (5 min)
8. Both confirm handoff is complete
```


## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Daily shift handoff | Abbreviated version (15 min) | Focus on active incidents and alerts only |
| Weekly rotation | Full template with retrospective | Include incident count, MTTR trends |
| Vacation coverage | Extended version | Add project context, meeting schedules, stakeholder contacts |
| Incident mid-handoff | Incident-focused | Deep-dive on the active incident, de-prioritize routine items |

## What works

1. **Conduct handoffs synchronously** — async handoffs miss questions and nuance
2. **Update the template in real-time** — don't reconstruct it from memory at shift end
3. **Link, don't describe** — paste links to dashboards, not screenshots of metrics
4. **Include the "so what"** — explain why an alert matters, not just that it exists
5. **Verify incoming engineer acknowledgment** — confirm they have access and understand context

## Common Mistakes

1. **Only covering active incidents** — misses brewing issues that will become incidents
2. **Copy-pasting alert descriptions** — provides no context about what has been investigated
3. **Not mentioning scheduled changes** — incoming engineer is surprised by maintenance windows
4. **Skipping the escalation path** — wastes minutes finding who to call during a P1
5. **Handing off during an active incident** — context transfer while debugging is lossy; pause the investigation for 5 minutes to document

## Frequently Asked Questions

### How detailed should the incident summary be?

Aim for enough detail that the incoming engineer can answer "what happened so far?" and "what should I try next?" without reading the entire incident channel. Usually 2-3 sentences for each incident, plus specific next steps.

### What if there are no active incidents?

Still complete the handoff. Note any unusual patterns in metrics, upcoming changes, and known issues. A "quiet" handoff is valuable context — it establishes the baseline for what's normal.

### Should I include customer-impacting issues that haven't triggered alerts?

Yes. If support has reported customer issues or if you've noticed degraded behavior that hasn't crossed alert thresholds, document it in the notes section. These are often the first indicators of brewing problems.


### How do we handle handoffs across time zones?

For global teams: schedule a 15-minute overlap window for synchronous handoff. If no overlap exists, use an async handoff with a recorded video walkthrough (Loom) plus the written document. Set a deadline for the incoming engineer to acknowledge receipt. For critical handoffs, have a backup contact in the incoming engineer's region. Use a shared handoff document that persists across shifts (e.g., a wiki page or Slack thread) so context is not lost. Rotate handoff times periodically so the same person is not always doing handoffs at inconvenient hours.

### What tools should we use for on-call handoffs?

Use a combination of: a written handoff document (shared doc, wiki, or template in the incident management tool), a synchronous conversation (video call or Slack huddle), and the monitoring dashboard (shared link, not screenshot). PagerDuty or Opsgenie for schedule visibility. Slack or Teams for real-time communication. A shared runbook repository for escalation paths and known issues. Avoid email for handoffs — it is too slow and easily missed. The handoff document should be searchable for future reference.

### How do we train new engineers on the handoff process?

Pair the new engineer with an experienced on-call engineer for their first 2-3 shifts. Have them observe the handoff process, then co-write the handoff document, then lead the handoff with the experienced engineer reviewing. Provide a written guide that explains each section of the template and what information is expected. Conduct a mock handoff during onboarding training. Review the new engineer's first solo handoff and provide feedback. Include handoff training in the on-call readiness checklist.

### What if the incoming engineer is unavailable for handoff?

If the incoming engineer does not respond within 15 minutes of the scheduled handoff: call them directly (phone, not just Slack). If no response after 30 minutes: escalate to the on-call manager. If no response after 1 hour: contact the backup on-call engineer. Document the missed handoff in the shift report. The outgoing engineer should remain on-call until handoff is completed — never leave the system without an on-call engineer. Review repeated missed handoffs in the team retrospective and adjust the schedule or process.

### How do we improve handoff quality over time?

Review handoff documents weekly in the team meeting — highlight good handoffs and identify gaps. Track metrics: number of incidents missed after handoff, time to first response after shift change, and incoming engineer satisfaction with handoff quality. Survey incoming engineers monthly: "Did the handoff give you enough context to handle the shift?" Adjust the template based on feedback. Remove sections that are consistently empty. Add sections for recurring gaps. Share best practices across teams.





















































End of document. Review and update quarterly.