---





contentType: docs
slug: sla-definition-template
title: "SLA Definition Template"
description: "A template for defining and documenting Service Level Agreements including uptime targets, response times, error budgets, and escalation procedures."
metaDescription: "Define Service Level Agreements with this SLA template. Covers uptime targets, response times, error budgets, and escalation procedures."
difficulty: intermediate
topics:
  - api
  - architecture
  - devops
tags:
  - sla
  - service-level-agreement
  - uptime
  - availability
  - sre
  - template
relatedResources:
  - /docs/escalation-policy-template
  - /docs/performance-regression-template
  - /docs/auto-scaling-policy-template
  - /docs/downtime-communication-template
  - /docs/api-changelog-template
  - /docs/api-deprecation-notice-template
  - /docs/api-status-page-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Define Service Level Agreements with this SLA template. Covers uptime targets, response times, error budgets, and escalation procedures."
  keywords:
    - sla
    - service level agreement
    - uptime target
    - availability
    - error budget
    - sre





---

## Overview

An SLA without an error budget is just a promise you will eventually break. Engineering teams need concrete, measurable targets that balance reliability with velocity. This template defines uptime, latency, and error rate commitments — plus the error budgets that let teams ship changes while respecting those commitments.

## When to Use


- For alternatives, see [API Status Page Template](/docs/api-status-page-template/).

Use this resource when:
- Launching a production service that external consumers depend on
- Negotiating contractual guarantees with enterprise clients
- Defining internal reliability targets for platform teams
- Setting up SRE practices and on-call rotations

## Solution

```markdown
# Service Level Agreement: `<Service Name>`

**Effective Date:** `2026-07-01`
**Review Cycle:** `Quarterly`
**Owning Team:** `@platform-team`

## 1. Service Level Objectives (SLOs)

| Metric | Target | Measurement Window | Data Source |
|--------|--------|--------------------|-------------|
| Availability | 99.9% | Rolling 30 days | Load balancer health checks |
| Latency p95 | < 200ms | Per minute | Application metrics (Prometheus) |
| Latency p99 | < 500ms | Per minute | Application metrics (Prometheus) |
| Error Rate | < 0.1% | Rolling 7 days | Application logs + APM |
| Throughput | > 1,000 req/s | Per minute | Load balancer metrics |

## 2. Service Level Indicators (SLIs)

| SLI | Good Events | Valid Events | Calculation |
|-----|-------------|--------------|-------------|
| Availability | Successful health checks | All health checks | Good / Valid |
| Latency p95 | Requests < 200ms | All requests | Percentile of valid |
| Error Rate | Responses with status < 500 | All responses | 1 - (errors / total) |

## 3. Error Budget

| SLO | Target | Error Budget (30 days) | Burn Rate Alert |
|-----|--------|------------------------|-----------------|
| 99.9% availability | 43.8 minutes downtime | 2% budget in 1 day = critical |
| < 0.1% error rate | 0.43% error rate allowed | 10% budget in 1 day = warning |

### Burn Rate Alerts

| Burn Rate | Budget Consumed | Action |
|-----------|-----------------|--------|
| 1x | Normal | Monitor |
| 2x | 2x faster than expected | Page on-call (warning) |
| 10x | 10x faster than expected | Page on-call + freeze deploys (critical) |

## 4. Response & Resolution Times

| Severity | Definition | Response Time | Resolution Target | Escalation |
|----------|------------|---------------|-------------------|------------|
| P1 (Critical) | Complete service outage | 15 minutes | 2 hours | VP Engineering |
| P2 (High) | Degraded performance, workaround exists | 1 hour | 8 hours | Engineering Manager |
| P3 (Medium) | Partial feature failure | 4 hours | 3 business days | Team Lead |
| P4 (Low) | Cosmetic issue, no business impact | 1 business day | Next sprint | Ticket queue |

## 5. Exclusions

The following are excluded from SLA calculations:
- **Scheduled maintenance:** Up to 4 hours/month with 7 days notice
- **Third-party outages:** Dependencies outside our control (cloud provider, payment gateway)
- **Force majeure:** Natural disasters, acts of war, internet backbone failures
- **Client-side issues:** Consumer bugs, rate limit violations, invalid requests

## 6. Penalties & Credits

| Monthly Uptime | Service Credit | Trigger |
|----------------|----------------|---------|
| 99.0% - 99.9% | 10% monthly fee | Automatic, no request required |
| 95.0% - 99.0% | 25% monthly fee | Automatic |
| < 95.0% | 50% monthly fee | Automatic + mandatory postmortem |

## 7. Communication Plan

| Event | Audience | Channel | Timing |
|-------|----------|---------|--------|
| Degradation detected | Internal teams | PagerDuty + Slack | Immediate |
| P1 outage starts | Customers | Status page + email | Within 30 minutes |
| P1 resolved | Customers | Status page update | Within 15 minutes of resolution |
| Monthly SLA report | Customers | Email | Within 5 business days of month end |

## 8. Review & Revision

- **Quarterly review:** Engineering + Product + Customer Success
- **Trigger review:** Any P1 incident or SLA miss triggers an ad-hoc review
- **Revision process:** Proposed changes require 14 days notice to affected customers
```

## Explanation

The template separates **objectives** (what you promise) from **indicators** (how you measure) and **error budgets** (how much failure is acceptable). Without error budgets, teams either over-engineer for perfection or ship recklessly. The burn rate alerts translate abstract percentages into concrete actions: at 10x burn rate, stop deploying and fix the issue.

## Error Budget Calculation Examples

Understanding error budgets requires concrete numbers. Here are calculations for common SLO targets:

### Availability Budgets

| SLO Target | Error Budget | Downtime / 30 days | Downtime / 90 days |
|------------|-------------|---------------------|---------------------|
| 99.0% | 1.0% | 432 minutes (7.2 hours) | 1,296 minutes (21.6 hours) |
| 99.5% | 0.5% | 216 minutes (3.6 hours) | 648 minutes (10.8 hours) |
| 99.9% | 0.1% | 43.2 minutes | 129.6 minutes |
| 99.95% | 0.05% | 21.6 minutes | 64.8 minutes |
| 99.99% | 0.01% | 4.32 minutes | 12.96 minutes |

### Calculating Burn Rate

Burn rate measures how fast you consume your error budget relative to the expected pace:

```python
def calculate_burn_rate(
    errors_minutes: float,
    total_minutes: float,
    slo_target: float,
    window_days: int,
) -> float:
    error_budget = 1.0 - slo_target
    actual_error_rate = errors_minutes / total_minutes
    expected_error_rate = error_budget
    burn_rate = actual_error_rate / expected_error_rate
    return burn_rate

# Example: 20 minutes of downtime in 1 day with 99.9% SLO
burn = calculate_burn_rate(
    errors_minutes=20,
    total_minutes=1440,
    slo_target=0.999,
    window_days=1,
)
print(f"Burn rate: {burn:.1f}x")
# Output: Burn rate: 13.9x (critical - freeze deploys)
```

### Error Budget Policy

| Budget Remaining | Action |
|------------------|--------|
| > 50% | Normal operations, ship freely |
| 25% - 50% | Proceed with caution, review risk of changes |
| 10% - 25% | Freeze non-critical deploys, prioritize reliability |
| < 10% | Freeze all deploys except reliability fixes |
| < 0% | Mandatory incident, postmortem required before resume |

## Monitoring SLOs with Prometheus

Use Prometheus and Grafana to track SLO compliance and error budget burn rate.

### Prometheus Recording Rules

```yaml
groups:
  - name: slo_rules
    interval: 1m
    rules:
      - record: request_total:rate5m
        expr: sum(rate(http_requests_total[5m]))

      - record: request_errors:rate5m
        expr: sum(rate(http_requests_total{status=~"5.."}[5m]))

      - record: slo:availability:rate5m
        expr: 1 - (request_errors:rate5m / request_total:rate5m)

      - record: slo:error_budget:remaining
        expr: |
          1 - (
            sum(rate(http_requests_total{status=~"5.."}[30d]))
            /
            sum(rate(http_requests_total[30d]))
          ) / (1 - 0.999)

      - record: slo:burn_rate:1h
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[1h]))
            /
            sum(rate(http_requests_total[1h]))
          ) / (1 - 0.999)

      - record: slo:burn_rate:5m
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) / (1 - 0.999)
```

### Prometheus Alert Rules

```yaml
groups:
  - name: slo_alerts
    rules:
      - alert: SLOBurnRateCritical
        expr: slo:burn_rate:5m > 10 and slo:burn_rate:1h > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Error budget burning 10x faster than expected"
          description: "Freeze non-critical deploys and investigate."

      - alert: SLOBurnRateWarning
        expr: slo:burn_rate:1h > 2
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Error budget burning 2x faster than expected"
          description: "Monitor closely and review recent changes."

      - alert: SLOErrorBudgetExhausted
        expr: slo:error_budget:remaining < 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error budget exhausted"
          description: "All deploys frozen until budget recovers."
```

### Grafana Dashboard JSON

```json
{
  "panels": [
    {
      "title": "Availability (30d)",
      "targets": [{"expr": "slo:availability:rate5m * 100", "legendFormat": "Availability %"}],
      "thresholds": [{"value": 99.9, "colorMode": "critical"}]
    },
    {
      "title": "Error Budget Remaining",
      "targets": [{"expr": "slo:error_budget:remaining * 100", "legendFormat": "Budget %"}],
      "thresholds": [{"value": 10, "colorMode": "warning"}, {"value": 0, "colorMode": "critical"}]
    },
    {
      "title": "Burn Rate (1h vs 5m)",
      "targets": [
        {"expr": "slo:burn_rate:1h", "legendFormat": "1h burn rate"},
        {"expr": "slo:burn_rate:5m", "legendFormat": "5m burn rate"}
      ]
    }
  ]
}
```

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Public SaaS | Strict SLA with automatic credits | Customer trust is a competitive advantage |
| Internal platform | Relaxed SLA, focus on SLOs | Internal teams need reliability, not legal contracts |
| Enterprise contract | Custom SLA per deal | Negotiated individually with legal approval |
| Multi-tenant SaaS | Tiered SLAs per plan | Higher tiers get tighter guarantees and faster response |

## What Works

1. **Start with internal SLOs before publishing SLAs** — an SLA is a promise, an SLO is a target
2. **Use percentiles, not averages** — p95 latency reveals what real users experience
3. **Measure from the consumer's perspective** — availability is not just "server up" but "request succeeds"
4. **Review quarterly** — services evolve, targets should evolve with them
5. **Publish real-time status** — a public status page builds trust during incidents
6. **Automate error budget tracking** — manual calculations drift and lose accuracy
7. **Tie error budget to deploy policy** — make the budget actionable, not just informational

## Common Mistakes

1. **Setting 100% availability as a target** — impossible and expensive, leads to burnout
2. **Measuring server uptime instead of request success rate** — the server can be up while the app is failing
3. **Ignoring latency in SLAs** — slow is the new down
4. **Not defining error budgets** — teams have no framework for balancing reliability and changes
5. **Making SLA reviews reactive only** — schedule quarterly reviews even when everything is green
6. **Setting the same SLO for all endpoints** — a health check endpoint needs higher availability than a reporting endpoint
7. **Not accounting for planned maintenance** — exclude it from calculations or consumers will see false violations
8. **Choosing 99.99% without infrastructure to support it** — each nine costs exponentially more

## Frequently Asked Questions

### What is the difference between SLA, SLO, and SLI?

- **SLI (Indicator):** The metric you measure (e.g., request success rate)
- **SLO (Objective):** The target for that metric (e.g., 99.9% success rate)
- **SLA (Agreement):** The contract with consequences (e.g., 99.9% or 10% credit)

### How do I calculate error budget?

Error budget = 100% - SLO target. For 99.9% availability, the error budget is 0.1% of the measurement window. Over 30 days, that is 43.8 minutes of acceptable downtime.

### Should I include latency in the SLA?

Yes, but be realistic. A p95 latency target of 200ms is achievable for most APIs. Targets below 50ms require major infrastructure investment and may not be cost-effective.

### What happens if we burn the entire error budget before the window ends?

Freeze non-critical deployments and prioritize reliability work until the budget recovers. This is the core SRE principle: error budget policies should drive engineering priorities.

### Should I use a rolling window or calendar window?

Rolling windows (e.g., last 30 days) are better for operational decisions because they reflect current state. Calendar windows (e.g., monthly) are better for SLA reporting and billing. Use both: rolling for internal SLOs, calendar for external SLA compliance.

### How do I handle dependencies in my SLO?

If your service depends on a third-party API, track the third-party's availability separately. Exclude third-party outages from your SLO if they are outside your control, but document this in the exclusions section of your SLA.

### Can I have different SLOs for different endpoints?

Yes. Critical endpoints (payment, auth) can have tighter SLOs than non-critical ones (reporting, analytics). Document each endpoint's SLO so consumers know what to expect.

### How often should I review SLO targets?

Quarterly for stable services. Monthly for new services or those undergoing significant changes. Any P1 incident should trigger an ad-hoc review to assess whether targets need adjustment.
