---
contentType: docs
slug: service-level-objective-slo-template
title: "Service Level Objective (SLO) Template"
description: "A template for defining reliability targets, error budgets, and measurement methods for services and systems."
metaDescription: "Define SLOs with this template. Covers reliability targets, SLIs, error budgets, measurement windows, and review processes."
difficulty: intermediate
topics:
  - observability
  - devops
tags:
  - slo
  - reliability
  - observability
  - error-budget
  - monitoring
relatedResources:
  - /docs/devops/monitoring-alerting-policy-template
  - /docs/devops/escalation-policy-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Define SLOs with this template. Covers reliability targets, SLIs, error budgets, measurement windows, and review processes."
  keywords:
    - SLO template
    - service level objective
    - reliability target
    - error budget
    - SLI
---

## Overview

A Service Level Objective (SLO) defines a reliability target for a service. It translates user expectations into measurable goals that guide engineering priorities, trade-offs, and investment. This template helps teams define Service Level Indicators (SLIs), set targets, manage error budgets, and review performance over time.

## When to Use

- Launching a new service or product.
- Setting reliability expectations with stakeholders or customers.
- Introducing error budgets to balance velocity and stability.
- Negotiating an internal or external Service Level Agreement (SLA).
- Reviewing service health quarterly or after major incidents.

## Prerequisites

- A clear understanding of user-facing functionality and critical user journeys.
- Instrumentation that produces the metrics needed for SLIs.
- A monitoring or observability platform that can calculate reliability over time.
- Agreement on priorities between product, engineering, and operations.
- Historical data or estimates to set realistic targets.

## Solution

### Template

#### 1. SLO Definition

| Field | Description | Example |
|-------|-------------|---------|
| Service name | The service or system covered | `Checkout API` |
| SLO name | Short name for the objective | `Checkout availability` |
| SLI | Quantitative measure of service level | `Ratio of successful HTTP requests` |
| Target | Desired reliability level | `99.9%` |
| Measurement window | Time period for evaluation | `30 days` |
| Owner | Team accountable | `Checkout team` |
| Stakeholders | Users of the SLO | `Product, support, platform` |

#### 2. Common SLI Types

| SLI Type | What It Measures | Typical SLI Formula |
|----------|------------------|---------------------|
| Availability | Is the service responding? | `successful requests / total requests` |
| Latency | How fast is the service? | `percentage of requests below threshold` |
| Quality | Is the output correct? | `valid responses / total responses` |
| Error rate | How often does it fail? | `1 - (successful requests / total requests)` |
| Throughput | Can it handle the load? | `requests per second` |
| Freshness | Is data up to date? | `percentage of data updated within threshold` |
| Durability | Is data preserved? | `percentage of objects successfully stored over time` |

#### 3. SLO Examples

| Service | SLI | Target | Window | Rationale |
|---------|-----|--------|--------|-----------|
| Checkout API | Availability | 99.95% | 30 days | Revenue-critical endpoint |
| Checkout API | Latency p99 | < 500ms | 30 days | User experience threshold |
| Search service | Availability | 99.9% | 30 days | Important but not revenue-critical |
| Search service | Latency p95 | < 200ms | 30 days | Fast user feedback |
| Data pipeline | Freshness | 99.5% | 24 hours | Analytics need recent data |
| Object storage | Durability | 99.999999999% | 1 year | Data loss protection |

#### 4. Error Budget Policy

| Target | Error Budget | Burn Rate (Daily) | Action When Budget Exhausted |
|--------|--------------|-------------------|------------------------------|
| 99.9% | 0.1% | ~0.003% | Review release policy and freeze non-critical changes |
| 99.95% | 0.05% | ~0.0017% | Tighten rollout and require incident review |
| 99.99% | 0.01% | ~0.0003% | Halt feature releases and prioritize reliability work |

Guidelines:
- An error budget measures how much unreliability is acceptable in a window.
- Burn rate tracks how fast the budget is being consumed.
- When a budget is exhausted or projected to exhaust, reduce risky changes.
- Excessive budget remaining can indicate overly conservative targets.

#### 5. Measurement and Alerting

| Metric | Source | Aggregation | Alert Threshold |
|--------|--------|-------------|-----------------|
| Availability | Load balancer or application logs | 5-minute window | SLO target - 1% for 10 minutes |
| Latency p99 | Application metrics | 1-hour window | Target latency + 20% for 15 minutes |
| Error rate | Application logs | 5-minute window | > 0.5% for 5 minutes |
| Error budget | SLO calculation | 30-day rolling | 80% consumed in 50% of window |
| Burn rate | SLO calculation | 1-hour window | High burn rate for 2 consecutive hours |

#### 6. Review and Improvement Cycle

| Activity | Frequency | Owner | Output |
|----------|-----------|-------|--------|
| SLO dashboard review | Weekly | SRE team | Current status and trends |
| Error budget review | Monthly | Service owner | Release decisions and follow-up actions |
| SLO target review | Quarterly | Product + engineering | Adjusted targets with rationale |
| Post-incident review | After each incident | Incident commander | SLO impact and improvement actions |
| SLO communication | Quarterly | Engineering leadership | Stakeholder report on reliability |

## Explanation

SLOs give teams a shared language for reliability. By defining SLIs, targets, and error budgets, an organization can decide when to prioritize new capabilities versus stability work. SLOs also reduce alert fatigue by focusing monitoring on user-impacting reliability rather than every internal metric.

## SLO Definition in Prometheus (Sloth)

```yaml
version: "prometheus/v1"
service: "api-gateway"
slos:
  - name: "availability"
    objective: 99.9
    description: "Successful HTTP responses for the API gateway"
    sli:
      events:
        error_query: sum(rate(http_requests_total{job="api-gateway",status=~"5.."}[{{.window}}]))
        total_query: sum(rate(http_requests_total{job="api-gateway"}[{{.window}}]))
    alerting:
      name: ApiGatewayAvailability
      page_alert:
        disable: false
        labels:
          severity: page
          team: platform
      ticket_alert:
        disable: false
        labels:
          severity: ticket
          team: platform

  - name: "latency-p99"
    objective: 99
    description: "P99 latency below 500ms for API gateway"
    sli:
      events:
        error_query: |
          sum(rate(http_request_duration_seconds_bucket{job="api-gateway",le="0.5"}[{{.window}}]))
          /
          sum(rate(http_request_duration_seconds_count{job="api-gateway"}[{{.window}}]))
        total_query: "1"
    alerting:
      name: ApiGatewayLatency
      page_alert:
        disable: false
      ticket_alert:
        disable: false
```

## Error Budget Calculation Worksheet

```text
=== Error Budget Calculation ===

SLO Target: 99.9% availability
Period: 30 days (43,200 minutes)

Total allowed downtime (error budget):
  43,200 * (1 - 0.999) = 43.2 minutes per month

Budget consumed this period:
  - Incident 1 (2026-06-05): 12 min downtime -> 12 min consumed
  - Incident 2 (2026-06-12): 8 min downtime -> 8 min consumed
  - Incident 3 (2026-06-20): 5 min downtime -> 5 min consumed
  Total consumed: 25 minutes

Remaining budget: 43.2 - 25 = 18.2 minutes (42% of budget remaining)

Burn rate:
  - Fast burn (1h window): 2x normal -> alert if > 6x
  - Slow burn (6h window): 1x normal -> alert if > 3x

Decision: 42% budget remaining at day 20 of 30.
  - Green (>50%): Continue normal releases
  - Yellow (20-50%: Reduce release frequency, prioritize stability
  - Red (<20%): Freeze non-critical releases, focus on reliability
```

## SLO Review Meeting Agenda

```text
=== Monthly SLO Review ===

1. SLO Compliance Report (10 min)
   - Did we meet each SLO target?
   - Error budget status: consumed vs remaining
   - Trend: improving, stable, or degrading?

2. Incident Review (15 min)
   - Incidents that consumed budget
   - Root cause patterns
   - Action items from post-incident reviews

3. SLO Target Discussion (10 min)
   - Should any targets be adjusted?
   - Are SLIs still measuring the right thing?
   - New services needing SLOs?

4. Release Planning (10 min)
   - Error budget guidance for next month
   - Planned risky changes
   - Stability work priorities

5. Action Items (5 min)
   - Owner and deadline for each action
   - Next review date
```


## Variants

- **Customer-facing SLO**: Used to support external SLAs and customer communications.
- **Internal platform SLO**: Tracks reliability of internal services consumed by other teams.
- **Batch workload SLO**: Focuses on throughput, freshness, and completion windows instead of availability.
- **Mobile or client SLO**: Includes crash rates, app startup time, and API response latency.
- **Data platform SLO**: Emphasizes freshness, completeness, and query performance.

## What works

- Start with a few critical user journeys rather than measuring everything.
- Set targets based on user expectations and business needs, not ideal infrastructure.
- Use error budgets to guide release decisions rather than as punishment.
- Keep SLOs simple and understandable for non-technical stakeholders.
- Review targets quarterly and adjust as services evolve.
- Alert on fast budget burn, not just target misses.
- Document SLIs in a way that is reproducible across tools.
- Align SLOs with incident response priorities.

## Common Mistakes

- Setting SLOs at 100% without considering cost and complexity.
- Choosing SLIs that do not reflect actual user experience.
- Defining too many SLOs and losing focus.
- Not using error budgets to influence release decisions.
- Ignoring SLOs after they are defined.
- Setting targets based on current performance without improvement goals.
- Confusing internal SLOs with external SLAs.

## FAQs

### What is the difference between SLI, SLO, and SLA?

An SLI (Service Level Indicator) is a metric. An SLO (Service Level Objective) is the target for that metric. An SLA (Service Level Agreement) is a contractual commitment, often based on SLOs, with consequences for missing targets.

### How do we choose the right SLO target?

Start with historical data, consider user pain points, and balance reliability against cost and feature velocity. Common starting points are 99.9% for important services and 99.95% or higher for critical ones.

### What happens when an error budget is exhausted?

The team should reduce risky changes, prioritize reliability improvements, and review recent incidents. It is a signal to invest in stability rather than a reason to blame individuals.


### How do we calculate error budget burn rate?

Burn rate measures how fast you are consuming your error budget. A burn rate of 1 means you are consuming budget at the normal rate (will exhaust exactly at period end). Burn rate of 2 means you will exhaust in half the period. Alert on multi-window burn: page if 1-hour burn rate exceeds 14.4x (exhausts in 2 hours) and ticket if 6-hour burn rate exceeds 6x (exhausts in 1 day). This catches both acute outages and slow degradations.

### What is a multi-window multi-burn-rate alert?

Multi-window multi-burn-rate alerts evaluate the burn rate over two time windows simultaneously. For example: alert if the 1-hour burn rate is above 14.4x AND the 5-minute burn rate is also above 14.4x. The short window prevents false positives from transient spikes, while the long window ensures the issue is sustained. This is the recommended approach from the Google SRE workbook.

### How do we set SLOs for batch processing jobs?

For batch jobs, use completion SLOs instead of availability. Define SLIs as: percentage of jobs completed within the deadline window (e.g., 95% of daily ETL jobs complete within 4 hours). Track freshness: percentage of data that is less than X hours old. Track throughput: jobs per hour vs expected. Set error budget as: allowed late jobs per period (e.g., 1 late job per week for 99% SLO).

### Should we have different SLOs for different user tiers?

Yes for business reasons, but be careful with implementation. You can define tier-specific SLOs (e.g., 99.99% for enterprise, 99.9% for free tier) by tagging requests with user tier and calculating SLIs per tier. This requires more complex monitoring but allows differentiated service. Ensure the infrastructure can actually deliver different reliability levels, otherwise you are just measuring the same thing.

### How do we handle SLOs during incidents?

During an incident, the SLO is already being missed (budget is being consumed). Focus on resolution, not measurement. After resolution, calculate the budget consumed and update the error budget dashboard. Use the incident as input for the next SLO review: was the SLO target appropriate? Did the alerting catch it early enough? Should the runbook be updated?


Review SLO targets after major architecture changes, new feature launches, or significant traffic pattern shifts. Document all target changes with rationale and date.

Track SLO compliance trends over 6-month windows to identify degrading services before they miss targets.