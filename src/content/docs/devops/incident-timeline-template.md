---
contentType: docs
slug: incident-timeline-template
title: "Incident Timeline Template"
description: "A template for reconstructing the exact sequence of events during incident investigations to identify detection gaps and response delays."
metaDescription: "Reconstruct incident events accurately with this timeline template. Track detection, response, and resolution timestamps to identify gaps and improve MTTR."
difficulty: beginner
topics:
  - devops
  - infrastructure
tags:
  - incident-management
  - timeline
  - postmortem
  - root-cause-analysis
  - template
  - sre
relatedResources:
  - /docs/devops/incident-communication-template
  - /docs/devops/postmortem-incident-review-template
  - /docs/devops/escalation-policy-template
  - /docs/devops/on-call-handoff-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Reconstruct incident events accurately with this timeline template. Track detection, response, and resolution timestamps to identify gaps and improve MTTR."
  keywords:
    - incident timeline
    - postmortem template
    - root cause analysis
    - incident reconstruction
    - timeline template
---

## Overview

Most incident postmortems fail to identify the real problems because they lack an accurate timeline. Teams remember the big events but forget the 15-minute delay in escalation, the 30 minutes spent looking at the wrong logs, or the gap between the first alert and human acknowledgment. This template structures incident reconstruction around five-minute granularity, exposing the delays that actually drive MTTR.

## When to Use

Use this template when:
- Conducting a postmortem after any P1 or P2 incident
- An incident took significantly longer to resolve than expected
- You need to identify whether alerting, tooling, or process gaps contributed to delays
- Building a case for infrastructure or monitoring improvements

## Prerequisites

Before reconstructing the timeline:
- [ ] Gather logs from all affected systems (application, infrastructure, network)
- [ ] Collect alert timestamps from your monitoring system
- [ ] Review Slack/Teams incident channel history
- [ ] Interview each responder who participated in the incident
- [ ] Pull deployment logs and configuration changes for the preceding 24 hours

## Solution

```markdown
# Incident Timeline: `<Incident Title>`

## Metadata

| Field | Value |
|-------|-------|
| Incident ID | ______ |
| Severity | P1 / P2 / P3 / P4 |
| Date | ______ |
| Service(s) Affected | ______ |
| Incident Commander | ______ |
| Timeline Author | ______ |

---

## Summary

| Metric | Value |
|--------|-------|
| Time to Detect (TTD) | ______ |
| Time to Acknowledge (TTA) | ______ |
| Time to Mitigate (TTM) | ______ |
| Time to Resolve (TTR) | ______ |
| Total Customer Impact Duration | ______ |

---

## Detailed Timeline

| Time (UTC) | Event | Source | Actor | Notes |
|------------|-------|--------|-------|-------|
| T-2:00:00 | Last known healthy state | Monitoring dashboard | System | Baseline metrics normal |
| T-1:30:00 | Configuration change deployed | CI/CD logs | deploy-bot | [link to change] |
| T-0:45:00 | Latency begins increasing | APM metrics | System | p95 rises from 200ms to 500ms |
| T-0:15:00 | First error rate spike | Error tracking | System | 0.1% → 2% error rate |
| T+0:00:00 | **Alert fires: High error rate** | PagerDuty | System | Threshold: >1% for 5 min |
| T+0:05:00 | On-call engineer paged | PagerDuty | System | |
| T+0:12:00 | On-call engineer acknowledges | PagerDuty | [Engineer Name] | Delay: 7 min (investigating other alert) |
| T+0:15:00 | Incident declared in Slack | Slack | [Engineer Name] | Channel: #incident-xxx |
| T+0:18:00 | Initial log investigation begins | Shell | [Engineer Name] | Checked application logs first |
| T+0:25:00 | Identified correlation with deployment | Git history | [Engineer Name] | Found config change at T-1:30:00 |
| T+0:30:00 | Attempted rollback | CI/CD | [Engineer Name] | Rollback failed: new migration blocking |
| T+0:35:00 | Escalated to platform team | Slack | [Engineer Name] | Platform engineer joins at T+0:40 |
| T+0:45:00 | Platform team identifies DB connection pool exhaustion | DB metrics | [Platform Eng] | Connection pool maxed at 100 |
| T+0:50:00 | Applied emergency connection pool increase | Config change | [Platform Eng] | Temporarily raised to 200 |
| T+0:55:00 | Error rate begins dropping | Monitoring | System | Down to 0.5% |
| T+1:00:00 | Service declared mitigated | Incident channel | [Engineer Name] | Customer impact reduced |
| T+1:30:00 | Root cause confirmed: config change leaked connections | Code review | [Platform Eng] | Connection not closed in new path |
| T+2:00:00 | Permanent fix deployed | CI/CD | [Engineer Name] | Proper connection cleanup added |
| T+2:15:00 | Monitoring confirms stability | Dashboards | System | Metrics at baseline for 15 min |
| T+2:15:00 | **Incident resolved** | Incident channel | [Engineer Name] | |

---

## Delay Analysis

| Gap | Duration | Root Cause | Action Item |
|-----|----------|------------|-------------|
| Alert to Acknowledge | 7 min | Engineer investigating lower-priority alert | IMPROVE-1: Separate alert routing for P1 vs P2 |
| Acknowledge to Incident Declaration | 3 min | Engineer attempted solo troubleshooting first | IMPROVE-2: Require incident declaration within 5 min of P1 alert |
| Rollback Failure | 5 min | Migration conflict not documented in runbook | IMPROVE-3: Update rollback runbook with migration handling |
| Escalation Delay | 10 min | Platform team not auto-included for DB issues | IMPROVE-4: Add DB alerts to platform team routing |
| Detection Gap | 15 min | Latency increase did not trigger alert | IMPROVE-5: Add latency alert at p95 >400ms |

---

## What Went Well

1. [Positive observation about response]
2. [Positive observation about communication]
3. [Positive observation about tooling]

## What Went Poorly

1. [Negative observation about detection/alerting]
2. [Negative observation about response process]
3. [Negative observation about documentation/runbooks]

## Action Items

| ID | Action | Owner | Due Date | Priority |
|----|--------|-------|----------|----------|
| IMPROVE-1 | ______ | ______ | ______ | High |
| IMPROVE-2 | ______ | ______ | ______ | High |
| IMPROVE-3 | ______ | ______ | ______ | Medium |
| IMPROVE-4 | ______ | ______ | ______ | Medium |
| IMPROVE-5 | ______ | ______ | ______ | High |
```

## Explanation

The timeline exposes **gaps** — the periods where nothing useful happened. Most MTTR improvement comes from eliminating these gaps, not from making active work faster. The template forces you to document the source of each timestamp (log line, Slack message, monitoring system) so the timeline is verifiable, not based on memory. The delay analysis converts the timeline into actionable improvements rather than just a historical record.

## Variants

| Context | Focus | Notes |
|---------|-------|-------|
| Blameless postmortem | Process and system gaps | Avoid naming individuals; focus on system failures |
| Executive summary | Business impact timeline | Compress to 5-10 key events with customer impact |
| Security incident | Attack vector timeline | Include attacker actions and defensive responses |
| Performance degradation | Metric correlation | Focus on metric changes and their cascading effects |

## Best Practices

1. **Build the timeline during the incident, not after** — assign a scribe to capture timestamps in real time
2. **Include "negative" events** — note when expected alerts did NOT fire
3. **Cross-reference multiple sources** — do not rely on a single log source; memory is unreliable
4. **Quantify every gap** — "we spent some time" is useless; "12 minutes" drives improvement
5. **Review timelines monthly** — look for patterns across incidents rather than treating each as unique

## Common Mistakes

1. **Building the timeline from memory** — humans compress time and omit uncomfortable delays
2. **Only including successful actions** — the failed rollback that wasted 10 minutes is more valuable than the eventual fix
3. **Using imprecise timestamps** — "around 2:30" is not good enough; use exact UTC timestamps
4. **Forgetting the detection gap** — the time between when the problem started and when the alert fired is often the largest gap
5. **Not connecting timeline to action items** — a timeline without follow-up actions is just a story

## Frequently Asked Questions

### How do we reconstruct a timeline if we did not capture timestamps during the incident?

Use log aggregation (Splunk, Datadog, CloudWatch) to find exact timestamps of error spikes, deployments, and system events. Cross-reference with Slack history, PagerDuty logs, and CI/CD pipeline timestamps. Interview responders with specific questions: "What did you check first? What did you see?" rather than "What happened?"

### Should we include responder names in the timeline?

In blameless postmortems, focus on roles ("on-call engineer", "platform engineer") rather than names. The goal is to improve systems, not evaluate individuals. Names may be relevant in security incidents or for follow-up interviews, but keep them out of the published timeline.

### How detailed should the timeline be?

Aim for events every 5-10 minutes during active response. You do not need to document every Slack message, but you should capture every meaningful action, decision, and escalation. If a 30-minute period has no entries, that is a gap worth investigating.
