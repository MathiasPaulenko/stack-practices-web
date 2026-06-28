---
contentType: guides
slug: alert-management-guide
title: "Alert Management: On-Call Alerting That Works"
description: "A practical guide to alert management: reducing alert fatigue, defining severity levels, escalation policies, on-call rotation design, and building a sustainable alerting culture."
metaDescription: "Learn alert management: reduce alert fatigue, define severity levels, design escalation policies, on-call rotations, and build sustainable alerting."
difficulty: intermediate
topics:
  - observability
  - devops
  - infrastructure
tags:
  - alert-management
  - on-call
  - escalation
  - alert-fatigue
  - pagerduty
  - opsgenie
  - guide
relatedResources:
  - /guides/observability/metrics-and-dashboards-guide
  - /guides/observability/incident-response-guide
  - /guides/observability/postmortem-guide
  - /guides/devops/sre-practices-guide
  - /guides/devops/observability-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn alert management: reduce alert fatigue, define severity levels, design escalation policies, on-call rotations, and build sustainable alerting."
  keywords:
    - alert-management
    - on-call
    - escalation
    - alert-fatigue
    - pagerduty
    - opsgenie
    - guide
---

## Overview

Alerting is how your systems tell you something needs attention. Done poorly, it creates noise, burnout, and slower incident response. Done well, it gives the right person the right information at the right time so they can act decisively.

This guide covers alert design, severity classification, on-call structures, escalation policies, and sustainable operational practices.

## When to Use

- Your team receives more than 5 alerts per person per week
- Alerts are frequently ignored or treated as noise
- Critical alerts are missed due to volume
- You are establishing or redesigning an on-call rotation
- Alert fatigue is causing burnout or attrition

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Alert Fatigue** | Desensitization caused by too many low-value alerts |
| **Severity** | Classification of alert urgency (critical, warning, info) |
| **Escalation** | Automatically routing unacknowledged alerts to the next responder |
| **On-Call Rotation** | Scheduled responsibility for incident response |
| **Alert Budget** | Maximum acceptable alert volume per time period |
| **Runbook** | Step-by-step guide for responding to a specific alert |

## Severity Levels

Define clear severity levels:

| Level | Name | Response Time | Channel | Example |
|-------|------|---------------|---------|---------|
| **P1** | Critical | 5 minutes | Page/SMS | Service down, revenue impact, data loss |
| **P2** | High | 30 minutes | Page/Slack | Degraded performance, partial outage |
| **P3** | Medium | 4 hours | Slack/Email | Capacity threshold, non-urgent anomaly |
| **P4** | Low | 1-2 business days | Ticket | Cleanup needed, non-urgent optimization |
| **P5** | Info | None | Dashboard only | Metrics for context, not action required |

**Severity design principles:**
- P1 means drop everything and respond immediately
- P2 means respond within the current working period
- P3 and below do not page; they create tickets or Slack messages
- If everything is P1, nothing is P1
- Review severity distribution monthly; aim for <10% P1

## Step-by-Step Alert Management

### 1. Design Alerts That Matter

Every alert must be something you can act on and user-impacting:

```yaml
# Example: Prometheus alert rules with severity

groups:
  - name: service_alerts
    rules:
      # P1: User-facing service is down
      - alert: ServiceDown
        expr: up{job=~"api|web|payment"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "{{ $labels.job }} is down"
          runbook_url: "https://wiki/runbooks/service-down"

      # P2: Elevated error rate but service still responding
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.05
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "High error rate in {{ $labels.service }}"

      # P3: Capacity warning — no immediate action needed
      - alert: DiskSpaceWarning
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.15
        for: 10m
        labels:
          severity: medium
        annotations:
          summary: "Disk space low on {{ $labels.instance }}"

      # P4: Informational — track but do not page
      - alert: HighMemoryUsage
        expr: (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) < 0.1
        for: 30m
        labels:
          severity: low
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
```

**Alert design checklist:**
- Alert on symptoms users feel (errors, latency), not causes (disk full)
- Every P1/P2 alert must have a runbook link
- Use `for:` duration to prevent flapping (require sustained failure)
- Include `summary` and `description` that tell the responder what to check
- Add labels for service, environment, team, and severity

### 2. Build On-Call Rotations

Design rotations that are fair and sustainable:

| Rotation Type | Best For | Structure |
|---------------|----------|-----------|
| **Primary/Secondary** | Small teams (3-6) | One primary, one backup |
| **Follow-the-sun** | Global teams | 8-hour shifts across time zones |
| **Weekly rotation** | Medium teams (6-12) | One week on, 3-5 weeks off |
| **Daily rotation** | Large teams (12+) | One day on, rest of week off |

```yaml
# Example: PagerDuty rotation configuration
# Primary: Weekly rotation, 6 engineers
# Secondary: Next person in rotation
# Escalation: Manager after 15 minutes
```

**Rotation guidelines:**
- Limit on-call frequency to no more than 1 week in 4
- Ensure handoff between shifts includes active incidents
- Compensate for on-call time (pay or time off)
- Allow opt-out for personal events with coverage
- Track and review incident frequency per rotation

### 3. Define Escalation Policies

Ensure unacknowledged alerts reach a human:

```
Escalation Path Example:

Alert Fires
    → Primary on-call (page + SMS)
        → Acknowledged? (stop)
        → Not acknowledged in 5 min
            → Secondary on-call (page)
                → Acknowledged? (stop)
                → Not acknowledged in 10 min
                    → Engineering Manager (page)
                        → Not acknowledged in 15 min
                            → Director of Engineering (page)
```

**Escalation principles:**
- Escalate quickly for P1 (5-10 minute intervals)
- Escalate more slowly for P2 (30-60 minute intervals)
- Include the previous responder in the escalation chain
- Set up team-wide Slack channels for visibility
- Log all escalations for post-incident review

### 4. Create Runbooks for Every Alert

A runbook turns an alert into a solvable problem:

```markdown
# Runbook: ServiceDown

## Alert
ServiceDown: `{{ $labels.job }}` is down

## Impact
Users cannot access `{{ $labels.job }}`. Revenue impact if payment or API.

## Diagnosis Steps
1. Check service health endpoint: `curl http://{{ $labels.instance }}/health`
2. Check if pod is running: `kubectl get pods -l app={{ $labels.job }}`
3. Check recent deployments: `kubectl rollout history deployment/{{ $labels.job }}`
4. Check resource usage: `kubectl top pod -l app={{ $labels.job }}`
5. Check logs: `kubectl logs -l app={{ $labels.job }} --tail=100`

## Resolution Steps
1. If pod crashed: `kubectl rollout restart deployment/{{ $labels.job }}`
2. If resource exhausted: Scale deployment or node pool
3. If deployment caused issue: `kubectl rollout undo deployment/{{ $labels.job }}`
4. If dependency down: Check dependency status and escalate to owning team

## Escalation
If unresolved in 15 minutes, escalate to: platform-team@company.com
```

**Runbook guidelines:**
- One runbook per P1/P2 alert
- Include diagnosis, resolution, and escalation steps
- Link runbook directly in alert notification
- Review and update runbooks quarterly
- Measure how well runbooks work (time to resolve when followed)

### 5. Reduce Alert Fatigue

Actively measure and reduce alert volume:

| Metric | Target | Action if Exceeded |
|--------|--------|---------------------|
| Alerts per person per week | < 5 | Tune thresholds, remove noisy alerts |
| P1 alerts per month | < 2 | Fix root causes, not symptoms |
| Alert acknowledgment time | < 5 min for P1 | Improve runbooks, training |
| False positive rate | < 10% | Increase `for:` duration, add conditions |
| Alerts without runbooks | 0 | Create missing runbooks |

**Fatigue reduction tactics:**
- **Consolidate:** Group related alerts into one notification
- **Suppress:** Silence known maintenance windows
- **Deduplicate:** One alert per incident, not per affected host
- **Auto-remediate:** Auto-restart, auto-scale for known recoverable issues
- **Delete:** Remove alerts that fire more than once without action

## What works

- **Alert on symptoms, not causes.** Disk full is a cause; slow requests is the symptom.
- **Every alert must be something you can act on.** If the response is "wait and see," it should not page.
- **Use `for:` to prevent flapping.** Require sustained threshold breach before alerting.
- **Separate paging from logging.** Not everything that is interesting needs to wake someone up.
- **Review alerts monthly.** Track which alerts fire, which are acknowledged, and which are ignored.
- **Compensate on-call fairly.** On-call is work; treat it as such.

## Common Mistakes

- **Alerting on everything.** More alerts do not mean better coverage; they mean more noise.
- **No escalation path.** If the primary does not respond, the alert dies silently.
- **Missing runbooks.** An alert without a runbook forces the responder to guess.
- **Ignoring alert fatigue.** High alert volume leads to burnout and missed critical alerts.
- **Static thresholds on cyclical metrics.** CPU spikes during batch jobs are normal; alert on deviation from baseline instead.

## Variants

- **No-ops alerting:** Fully automated remediation without human involvement
- **Severity-based routing:** Different channels for different severities (Slack for P3, PagerDuty for P1)
- **Team-specific ownership:** Alerts route to the team that owns the service
- **AI-assisted alerting:** Anomaly detection that adjusts thresholds dynamically

## FAQ

**Q: How many alerts per week is too many?**
More than 5 alerts that demand action per person per week is excessive. If you are paging more than once per week, something is wrong with your system or your thresholds.

**Q: Should I alert on CPU and memory usage?**
Generally no, unless those metrics directly correlate with user-impacting symptoms. Alert on request latency, error rate, and throughput instead.

**Q: How do I handle noisy alerts I cannot fix immediately?**
Temporarily silence them with an expiration date, create a ticket to fix the root cause, and schedule the fix within the current sprint.

**Q: What is the difference between an alert and a dashboard?**
Alerts notify you of something that requires action. Dashboards help you understand what is happening. Use alerts for urgent issues; dashboards for investigation.

## Conclusion

Good alerting is a product you build for your on-call engineers. It should be precise, useful, and respectful of their time. By designing alerts around user impact, creating clear runbooks, and actively reducing noise, you build an operational culture that is sustainable and reliable.
