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

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Internal microservices | Lower SLOs, simpler alerts | 99% availability, Slack-only alerts |
| Public SaaS API | Strict SLOs, multi-channel paging | 99.99% availability, PagerDuty + SMS |
| Serverless / Lambda | Focus on cold start and concurrency | Alert on throttling, not CPU |

## Best Practices

1. Alert on symptoms (latency, errors) not causes (disk full) to reduce noise
2. Set every alert threshold based on SLO burn rate, not arbitrary percentages
3. Include runbook links directly in alert messages
4. Review and tune alert thresholds monthly; false positives erode trust
5. Use different channels for page vs warning so on-call knows urgency immediately

## Common Mistakes

1. Alerting on CPU > 80% without linking it to user-facing symptoms
2. Setting the same SLO for all APIs regardless of business criticality
3. Using mean latency instead of percentiles (means hide outliers)
4. Alerting on single errors without a duration or rate threshold
5. Forgetting to alert on traffic drops (absence of errors can mean total failure)

## Frequently Asked Questions

### What is an error budget and how do I calculate it?

Error budget = 100% - SLO target. For 99.9% availability, your budget is 0.1% downtime per month (~43 minutes). If you burn that in one day, the SLO alert fires.

### Should I alert on 4xx errors?

Generally no for page alerts. 4xx indicates client mistakes, not server problems. Alert if 4xx rate spikes above a threshold that suggests a client-breaking change (e.g., mobile app with hardcoded endpoint).

### How do I avoid alert fatigue?

Tune thresholds so each alert fires < 3 times per week. If an alert fires daily and is always benign, raise the threshold or convert it to a dashboard-only metric. Every alert must have a documented runbook.
