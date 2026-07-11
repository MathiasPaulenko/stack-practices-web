---
contentType: docs
slug: api-monitoring-alerting-template
title: "API Monitoring & Alerting Template"
description: "A template for defining API SLA thresholds, error rate alerts, and monitoring dashboards."
metaDescription: "Use this API monitoring template to set up SLA thresholds, error rate alerts, latency dashboards, and on-call runbooks for production APIs."
difficulty: intermediate
topics:
  - architecture
tags:
  - architecture
  - api
  - monitoring
  - alerting
  - sla
  - template
relatedResources:
  - /docs/api-lifecycle-management-template
  - /docs/microservice-contract-template
  - /docs/service-dependency-map-template
  - /docs/system-diagram-template
  - /docs/technical-spec-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this API monitoring template to set up SLA thresholds, error rate alerts, latency dashboards, and on-call runbooks for production APIs."
  keywords:
    - architecture
    - api
    - monitoring
    - alerting
    - sla
    - template
---
## Overview

APIs fail silently. A service returning 200 OK can still be broken for consumers if latency spikes or error rates creep upward. This template defines SLIs (Service Level Indicators), SLOs (Objectives), and alert thresholds so teams detect degradation before consumers notice.

## When to Use

Use this resource when:
- Launching a new API or version that needs uptime guarantees
- Auditing existing monitoring coverage after an incident
- Defining on-call alert rules and escalation policies

## Solution

```markdown
# API Monitoring & Alerting: `<API Name>`

## 1. Service Metadata

| Field | Value |
|-------|-------|
| API Name | `name` |
| Owner Team | `@team-name` |
| Tier | `P0 (critical) / P1 (important) / P2 (standard)` |
| Consumer Count | Internal: X, External: Y |

## 2. SLIs (Indicators We Measure)

| SLI | Metric | Data Source |
|-----|--------|-------------|
| Availability | `% of requests returning 2xx/3xx` | Load balancer or gateway logs |
| Latency | `p95, p99 response time` | APM (Datadog, New Relic) |
| Error Rate | `% of 5xx responses / total` | Application logs |
| Throughput | `Requests per minute` | Metrics server (Prometheus) |
| Saturation | `CPU / Memory / DB connections` | Infrastructure metrics |

## 3. SLOs (Targets We Promise)

| SLO | Target | Measurement Window | Burn Rate Alert |
|-----|--------|--------------------|-----------------|
| Availability | 99.9% | 30 days | 2% budget in 1 hour |
| Latency p95 | < 200ms | 7 days | 5x normal in 1 hour |
| Error Rate | < 0.1% | 30 days | 10% budget in 1 day |

## 4. Alert Definitions

### 4.1. Page Alerts (Wake Someone Up)

| Condition | Threshold | Duration | Severity |
|-----------|-----------|----------|----------|
| Error rate > 1% | > 1% | 2 minutes | P1 |
| Latency p95 > 1s | > 1000ms | 3 minutes | P1 |
| Availability < 99% | < 99% | 1 minute | P0 |

### 4.2. Warning Alerts (Ticket / Slack)

| Condition | Threshold | Duration | Action |
|-----------|-----------|----------|--------|
| Error rate > 0.1% | > 0.1% | 10 minutes | Create Jira ticket |
| Latency p95 > 300ms | > 300ms | 15 minutes | Notify Slack channel |
| Traffic drop > 50% | < 50% baseline | 5 minutes | Page on-call (possible outage) |

### 4.3. Informational Alerts (Dashboard Only)

| Condition | Purpose |
|-----------|---------|
| Throughput > 10x baseline | Detect viral traffic or DDoS |
| 4xx rate > 5% | Detect client misconfiguration |

## 5. Dashboard Layout

**Row 1: Health Overview**
- Availability gauge (last 1h, 24h, 7d)
- Latency heatmap by endpoint
- Error rate timeline

**Row 2: Endpoint Breakdown**
- Top 10 endpoints by latency
- Top 10 endpoints by error rate
- Slowest traces (linked to APM)

**Row 3: Infrastructure**
- Pod/container CPU and memory
- Database connection pool
- Queue depth (if async)

## 6. Runbook Links

| Alert | Runbook |
|-------|---------|
| Error rate spike | `/runbooks/api-error-spike` |
| Latency degradation | `/runbooks/api-latency-spike` |
| Traffic drop | `/runbooks/api-traffic-drop` |
```

## Explanation

SLIs are **what** you measure, SLOs are **how good** it must be, and alerts are **when** to act. The template separates page alerts (requires human intervention) from warnings (can wait for business hours). Burn rate alerts catch SLO violations early by tracking how fast your error budget is consumed. Dashboard rows group related metrics so on-call engineers can triage in under 30 seconds.

## Prometheus Alert Rules

Define alerts as code so they are version-controlled and reviewable:

```yaml
groups:
  - name: api_slo_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.01
        for: 2m
        labels:
          severity: P1
          team: platform
        annotations:
          summary: "Error rate above 1% for 2 minutes"
          runbook: "/runbooks/api-error-spike"

      - alert: HighLatencyP95
        expr: |
          histogram_quantile(0.95, rate(
            http_request_duration_seconds_bucket[5m]
          )) > 1.0
        for: 3m
        labels:
          severity: P1
          team: platform
        annotations:
          summary: "p95 latency above 1s for 3 minutes"
          runbook: "/runbooks/api-latency-spike"

      - alert: SLOBurnRateFast
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[1h]))
            /
            sum(rate(http_requests_total[1h]))
          ) > 0.002
        for: 5m
        labels:
          severity: P1
          team: platform
        annotations:
          summary: "SLO burn rate exceeds 2% budget in 1 hour"
          runbook: "/runbooks/slo-burn-rate"

      - alert: TrafficDrop
        expr: |
          sum(rate(http_requests_total[5m]))
          <
          sum(rate(http_requests_total[5m] offset 1h)) * 0.5
        for: 5m
        labels:
          severity: P1
          team: platform
        annotations:
          summary: "Traffic dropped 50% compared to 1 hour ago"
          runbook: "/runbooks/api-traffic-drop"
```

## Grafana Dashboard JSON

A minimal dashboard panel for error rate tracking:

```json
{
  "dashboard": {
    "title": "API Monitoring Overview",
    "panels": [
      {
        "title": "Error Rate (5xx)",
        "type": "stat",
        "gridPos": { "h": 4, "w": 6, "x": 0, "y": 0 },
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100",
            "legendFormat": "Error %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                { "value": null, "color": "green" },
                { "value": 0.1, "color": "yellow" },
                { "value": 1, "color": "red" }
              ]
            }
          }
        }
      },
      {
        "title": "p95 Latency by Endpoint",
        "type": "heatmap",
        "gridPos": { "h": 8, "w": 12, "x": 6, "y": 0 },
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum by (endpoint, le) (rate(http_request_duration_seconds_bucket[5m]))) * 1000",
            "legendFormat": "{{endpoint}}"
          }
        ],
        "fieldConfig": {
          "defaults": { "unit": "ms" }
        }
      }
    ]
  }
}
```

## Runbook Template

Each alert must link to a runbook. Here is a minimal template:

```markdown
# Runbook: API Error Spike

## Alert Condition
Error rate > 1% for 2+ minutes (P1)

## Quick Triage (under 60 seconds)
1. Check the dashboard: which endpoints are returning 5xx?
2. Check recent deployments: was there a release in the last 30 minutes?
3. Check dependency health: are any upstream services down?

## Mitigation Steps
1. If a bad deployment caused the spike, roll back to the previous version
2. If a dependency is down, enable circuit breaker fallback
3. If traffic is abnormal, enable rate limiting at the gateway

## Post-Incident
1. File an incident report within 24 hours
2. Add the root cause to the known issues list
3. Update this runbook with any new mitigation steps
```

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Internal microservices | Lower SLOs, simpler alerts | 99% availability, Slack-only alerts |
| Public SaaS API | Strict SLOs, multi-channel paging | 99.99% availability, PagerDuty + SMS |
| Serverless / Lambda | Focus on cold start and concurrency | Alert on throttling, not CPU |
| Event-driven | Alert on lag and DLQ depth | Consumer lag is the equivalent of latency |

## What Works

1. Alert on symptoms (latency, errors) not causes (disk full) to reduce noise
2. Set every alert threshold based on SLO burn rate, not arbitrary percentages
3. Include runbook links directly in alert messages
4. Review and tune alert thresholds monthly; false positives erode trust
5. Use different channels for page vs warning so on-call knows urgency immediately
6. Track alert volume per week to identify noisy alerts that need tuning
7. Add a "test alert" button in your alerting tool to verify paging works end-to-end

## Common Mistakes

1. Alerting on CPU > 80% without linking it to user-facing symptoms
2. Setting the same SLO for all APIs regardless of business criticality
3. Using mean latency instead of percentiles (means hide outliers)
4. Alerting on single errors without a duration or rate threshold
5. Forgetting to alert on traffic drops (absence of errors can mean total failure)
6. Not testing alert delivery (PagerDuty rotation, Slack webhook) before an incident
7. Creating alerts without runbooks, leaving on-call engineers to guess mitigation steps

## Frequently Asked Questions

### What is an error budget and how do I calculate it?

Error budget = 100% - SLO target. For 99.9% availability, your budget is 0.1% downtime per month (~43 minutes). If you burn that in one day, the SLO alert fires.

### Should I alert on 4xx errors?

Generally no for page alerts. 4xx indicates client mistakes, not server problems. Alert if 4xx rate spikes above a threshold that suggests a client-breaking change (e.g., mobile app with hardcoded endpoint).

### How do I avoid alert fatigue?

Tune thresholds so each alert fires < 3 times per week. If an alert fires daily and is always benign, raise the threshold or convert it to a dashboard-only metric. Every alert must have a documented runbook.

### What is the difference between SLI, SLO, and SLA?

SLI is the metric you measure (e.g., p95 latency). SLO is the target you set for that metric (e.g., p95 < 200ms). SLA is the formal agreement with consumers that includes consequences for missing the SLO (e.g., service credits).

### How do I set up burn rate alerts?

A burn rate alert fires when you are consuming your error budget too fast. For a 30-day SLO of 99.9%, a 1-hour burn rate of 14.4x means you will exhaust the entire monthly budget in 2 hours. Set fast burn alerts (1h window, 14.4x threshold) for page alerts and slow burn alerts (6h window, 6x threshold) for warnings.

### Should I monitor individual endpoints or aggregate?

Both. Aggregate monitoring tells you if the API is healthy overall. Per-endpoint monitoring tells you which endpoint is causing the problem. Set SLOs at the endpoint level for critical paths and at the aggregate level for overall health.

### What tools should I use for API monitoring?

Prometheus for metrics, Grafana for dashboards, PagerDuty or Opsgenie for paging, and an APM tool (Datadog, New Relic, Honeycomb) for distributed tracing. Use OpenTelemetry for vendor-neutral instrumentation.
