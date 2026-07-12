---
contentType: docs
slug: monitoring-alerting-policy-template
title: "Monitoring and Alerting Policy Template"
description: "A policy template that defines how alerts are configured, routed, escalated, and reviewed across services and infrastructure."
metaDescription: "Define monitoring and alerting policies with this template. Covers alert thresholds, routing, escalation, severity levels, and review cadence."
difficulty: beginner
topics:
  - observability
  - devops
tags:
  - monitoring
  - alerting
  - incident-response
  - observability
  - policy
relatedResources:
  - /docs/devops/logging-standards-document
  - /docs/devops/escalation-policy-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Define monitoring and alerting policies with this template. Covers alert thresholds, routing, escalation, severity levels, and review cadence."
  keywords:
    - monitoring and alerting policy
    - alert thresholds
    - alert escalation
    - observability policy
    - alert routing
---

## Overview

A Monitoring and Alerting Policy defines how an organization detects problems, notifies the right people, and escalates when issues are not resolved quickly. Without a clear policy, teams suffer from alert fatigue, missed incidents, or inconsistent response times. This template provides a structured framework for alert thresholds, severity levels, routing rules, escalation paths, and regular review.

## When to Use

- Setting up a new observability platform or monitoring stack.
- Onboarding a new service or team into the alerting system.
- Reviewing alert quality after a period of noise or missed incidents.
- Defining on-call responsibilities and escalation paths.
- Preparing for an audit of operational maturity or incident response.

## Prerequisites

- A monitoring and observability platform such as Prometheus, Datadog, Grafana, New Relic, or PagerDuty.
- A list of critical services and infrastructure components.
- Defined on-call rotations and escalation contacts.
- A communication channel for alerts, such as Slack, Microsoft Teams, or email.
- An incident response process that alerts will trigger.

## Solution

### Policy Template

#### 1. Alert Severity Levels

| Severity | Response Time | Example | Notification Channel |
|----------|---------------|---------|----------------------|
| P1 - Critical | Immediate (5 min) | Service down, data loss, revenue impact | Page on-call + executive notification |
| P2 - High | 15 minutes | Degraded performance, failed backups | Page on-call + Slack alert |
| P3 - Medium | 1 hour | High error rate, resource pressure | Slack or email to owning team |
| P4 - Low | Next business day | Capacity warning, non-urgent drift | Email or dashboard notice |
| P5 - Informational | None | Usage metrics, trend data | Dashboard only |

#### 2. Alert Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| Availability | Detect service unreachability | HTTP 5xx, connection timeout, health check failure |
| Performance | Detect latency and throughput issues | p99 latency > 500ms, queue depth high |
| Capacity | Detect resource exhaustion | CPU > 85%, disk > 80%, memory pressure |
| Error rate | Detect unusual failure rates | Error rate > 1% for 5 minutes |
| Security | Detect suspicious activity | Failed logins, rate limit hits, blocked traffic |
| Business | Detect revenue or workflow impact | Failed payments, order drop, signup failure |
| Data health | Detect pipeline or data quality issues | Stale data, missing partitions, sync lag |

#### 3. Alert Routing Matrix

| Team | Primary Hours | On-Call Hours | Channels | Escalation Path |
|------|---------------|---------------|----------|-----------------|
| Platform team | 08:00 - 18:00 UTC | 24/7 | PagerDuty, #platform-alerts | Manager, then VP Engineering |
| Application team | 08:00 - 18:00 UTC | 24/7 | PagerDuty, #app-alerts | Team lead, then Engineering manager |
| Security team | 24/7 | 24/7 | PagerDuty, #security-alerts | Security lead, then CISO |
| Database team | 08:00 - 18:00 UTC | 24/7 | PagerDuty, #db-alerts | DBA lead, then Platform manager |
| Business operations | Business hours | None | Email, Slack | Operations manager |

#### 4. Alert Threshold Guidelines

| Signal | Warning Threshold | Critical Threshold | Evaluation Window |
|--------|-------------------|--------------------|-------------------|
| HTTP error rate | > 1% for 5 min | > 5% for 2 min | Rolling 5 min |
| Response latency p99 | > 500ms for 10 min | > 1s for 5 min | Rolling 10 min |
| CPU utilization | > 70% for 10 min | > 90% for 5 min | Rolling 5 min |
| Disk utilization | > 75% for 1 hour | > 90% for 15 min | Rolling 15 min |
| Memory utilization | > 80% for 10 min | > 95% for 5 min | Rolling 5 min |
| Queue depth | > 1000 for 10 min | > 5000 for 5 min | Rolling 5 min |
| Failed backup | N/A | Any failed backup | Per job run |
| SSL certificate expiry | < 30 days | < 7 days | Daily check |

#### 5. Escalation Rules

| Severity | Initial Alert | No Acknowledgment | Still Unresolved | Final Escalation |
|----------|---------------|-------------------|------------------|------------------|
| P1 | Page on-call immediately | 5 min | 15 min | Executive notification + war room |
| P2 | Page on-call | 15 min | 30 min | Manager page |
| P3 | Slack to owning team | 1 hour | 4 hours | Manager notification |
| P4 | Email or dashboard | Next business day | N/A | Weekly review |

#### 6. Alert Review and Maintenance

| Activity | Frequency | Owner | Output |
|----------|-----------|-------|--------|
| Alert quality review | Weekly | On-call engineer | Top noisy alerts, tuning actions |
| Alert runbook review | Monthly | SRE team | Updated runbooks for each alert |
| Threshold calibration | Quarterly | Observability team | Threshold adjustments with evidence |
| On-call retro | After major incident | Incident commander | Alert improvements, follow-up tasks |
| Policy review | Annually | Engineering leadership | Updated policy document |

## Explanation

This policy turns raw monitoring signals into useful alerts. By assigning severity, routing, and escalation rules, the organization ensures that critical problems get fast attention while low-priority warnings do not disrupt on-call engineers. The review and maintenance section prevents alert fatigue by continuously tuning thresholds and removing noisy alerts.


## Prometheus Alert Rules Example

```yaml
groups:
  - name: api_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
          / sum(rate(http_requests_total[5m])) by (service) > 0.05
        for: 2m
        labels:
          severity: P1
          team: platform
        annotations:
          summary: "{{ $labels.service }} error rate > 5%"
          description: "{{ $labels.service }} has {{ $value | humanizePercentage }} error rate for 2 minutes"
          runbook: "https://runbooks.example.com/high-error-rate"

      - alert: HighLatencyP99
        expr: |
          histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[10m])) by (le, service)) > 1
        for: 5m
        labels:
          severity: P2
          team: platform
        annotations:
          summary: "{{ $labels.service }} p99 latency > 1s"
          runbook: "https://runbooks.example.com/high-latency"

      - alert: DiskSpaceLow
        expr: |
          (node_filesystem_avail_bytes{mountpoint="/"}
          / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 10
        for: 15m
        labels:
          severity: P2
          team: infrastructure
        annotations:
          summary: "Disk space < 10% on {{ $labels.instance }}"
          runbook: "https://runbooks.example.com/disk-space"
```

## Alertmanager Routing Configuration

```yaml
route:
  receiver: default
  group_by: ["alertname", "service", "severity"]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - matchers:
        - severity = "P1"
      receiver: pagerduty-critical
      group_wait: 0s
      repeat_interval: 30m
    - matchers:
        - severity = "P2"
      receiver: pagerduty-warning
      group_wait: 30s
      repeat_interval: 2h
    - matchers:
        - severity = "P3"
      receiver: slack-alerts
      group_wait: 5m
    - matchers:
        - severity = "P4"
      receiver: email-alerts
      group_wait: 1h

receivers:
  - name: pagerduty-critical
    pagerduty_configs:
      - service_key: "P1_KEY"
  - name: pagerduty-warning
    pagerduty_configs:
      - service_key: "P2_KEY"
  - name: slack-alerts
    slack_configs:
      - channel: "#alerts"
        api_url: "SLACK_WEBHOOK_URL"
  - name: email-alerts
    email_configs:
      - to: "team@example.com"
  - name: default
    slack_configs:
      - channel: "#alerts"
```

## Alert Quality Scorecard

Review each alert quarterly using this scorecard:

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Actionable: Does the alert trigger a clear response? | | |
| Accuracy: Is the false-positive rate below 5%? | | |
| Timely: Does the alert fire before user impact? | | |
| Routed: Does it reach the team that can fix it? | | |
| Documented: Is there a runbook linked? | | |
| Unique: Is this alert redundant with another? | | |

Total score below 18 means the alert needs tuning or removal.

## Variants

- **Cloud-native alerting policy**: Uses Prometheus Alertmanager, Grafana Oncall, or PagerDuty for container and serverless environments.
- **Enterprise IT monitoring policy**: Focuses on infrastructure, network, and service desk integration.
- **Security alerting policy**: Emphasizes SIEM rules, threat detection, and incident response triggers.
- **Business operations alerting**: Tracks KPIs, revenue, and customer-facing metrics with business-hour notifications.
- **Developer self-service alerting**: Allows teams to define their own alert rules within guardrails.
- **Multi-cloud alerting policy**: Uses cloud-agnostic tools (Grafana, Datadog) to unify alerts across AWS, GCP, and Azure.
- **Cost alerting policy**: Monitors cloud spend with budget thresholds and anomaly detection on cost metrics.
- **Compliance alerting policy**: Tracks audit log gaps, failed access reviews, and policy violations for regulated environments.

## What Works

- Alert on symptoms that affect users, not just internal metrics.
- Use multi-window or multi-burn rate thresholds to reduce false positives.
- Require every alert to have an associated runbook or troubleshooting link.
- Route alerts to the team that can fix the problem, not a central queue.
- Keep alert messages concise and include context such as severity, service, and impact.
- Review noisy alerts weekly and tune or delete them.
- Test escalation paths during regular drills.
- Document alert thresholds and the rationale for changes.
- Use alert grouping to batch related alerts into a single notification during incidents.
- Implement alert suppression for known maintenance windows and deployments.

## Common Mistakes

- Alerting on every metric threshold without considering user impact.
- Sending all alerts to a single channel with no routing.
- Using the same severity for every alert.
- Not requiring acknowledgment or tracking resolution time.
- Ignoring alerts that fire repeatedly without action.
- Missing escalation paths for severe incidents.
- Failing to review and retire stale alerts after system changes.
- Setting thresholds based on gut feeling instead of historical data.
- Not including service name and environment in alert labels, making triage harder.
- Alerting on absolute values instead of rates or ratios, causing false positives during traffic spikes.

## FAQs

### What is alert fatigue and how do we avoid it?

Alert fatigue happens when on-call engineers receive too many low-value alerts. Avoid it by tuning thresholds, grouping related alerts, suppressing known issues, and regularly deleting alerts that do not lead to action.

### Should every alert page someone?

No. Only P1 and P2 alerts should page the on-call engineer. Lower-severity alerts should use Slack, email, or dashboard notifications to avoid disrupting response time for critical issues.

### How do we know if our thresholds are right?

Track the ratio of useful alerts to total alerts, measure mean time to acknowledge and resolve, and review false-positive rates. If an alert fires frequently without action, it is a candidate for tuning or removal.

### What is multi-window alerting and why should I use it?

Multi-window alerting evaluates a condition over both a short and long time window before firing. For example, error rate above 5% for both 1m and 5m windows. This prevents alerts from firing on transient spikes while still catching sustained issues. Prometheus supports this with the `for` clause and multiple expressions.

### How do we handle alerts during planned maintenance?

Use alert suppression or silencing in your alerting tool. In Alertmanager, create a silence rule with start/end times and matchers for the affected services. Document the maintenance window in an incident channel so on-call engineers know why alerts are suppressed. Never disable alerts globally; suppress only the specific rules affected.

### Should we use SLO-based alerting instead of threshold-based alerting?

SLO-based alerting (error budget burn rate) is more solid for user-facing services because it directly measures user impact. Threshold-based alerting is simpler and works well for infrastructure metrics (CPU, disk, memory). Use SLO-based alerting for critical user journeys and threshold-based for infrastructure health.

### How many alerts should an on-call engineer receive per shift?

A healthy on-call shift has 0-2 pages (P1/P2) and 5-15 Slack/email alerts (P3/P4). If an engineer receives more than 5 pages per shift, the alerting policy needs immediate tuning. Track alert volume per shift and review in weekly on-call retros.

Alerts scoring below 12 should be deleted immediately. Alerts scoring 12-17 should be put on a 30-day improvement plan with a named owner.

### How do we prevent alert fatigue during incidents?

During active incidents, suppress dependent alerts that fire as a direct consequence of the root cause. Use alert grouping in Alertmanager to bundle related alerts into a single notification. Designate an incident commander who triages incoming alerts and assigns ownership. After the incident, review all suppressed alerts to confirm they were correctly silenced. Add causal relationships between alerts to your runbook so on-call engineers know which alerts are downstream symptoms versus root causes.
