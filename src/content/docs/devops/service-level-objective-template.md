---



contentType: docs
slug: service-level-objective-template
title: "Service Level Objective Template"
description: "A template for defining SLOs, SLIs, and error budgets for reliable service management."
metaDescription: "Use this SLO template to define service level objectives, indicators, error budgets, and tracking dashboards for your engineering team."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - slo
  - sli
  - error-budget
  - reliability
  - operations
  - template
relatedResources:
  - /docs/bug-triage-template
  - /docs/change-management-template
  - /docs/escalation-policy-template
  - /docs/on-call-runbook-template
  - /docs/patch-management-template
  - /docs/slo-document-template
  - /guides/sre-practices-guide
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this SLO template to define service level objectives, indicators, error budgets, and tracking dashboards for your engineering team."
  keywords:
    - devops
    - slo
    - sli
    - error-budget
    - reliability
    - operations
    - template



---
## Overview

SLOs separate "uptime theater" from real reliability. A dashboard showing 99.9% uptime means nothing if your users experienced 500 errors during checkout because the metric averaged away a 10-minute outage. Defining clear Service Level Objectives (SLOs), Service Level Indicators (SLIs), and error budgets forces engineering to be honest about what "reliable" means and how much unreliability is acceptable before halting feature work.

## When to Use

Use this resource when:
- You are setting reliability targets for a new service or API
- Your team spends every sprint firefighting instead of shipping improvements
- You need to negotiate SLAs with customers and want an internal buffer

## Solution

```markdown
# SLO Definition: `<Service / API>`

## 1. Service Overview

| Field | Value |
|-------|-------|
| Service | `name` |
| Critical User Journeys | `list` |
| Stakeholders | `team, dependent services, customers` |
| Review Date | `YYYY-MM-DD` |

## 2. Service Level Indicators (SLIs)

| SLI Name | Metric | Good Events | Bad Events | Measurement Window |
|----------|--------|-------------|------------|-------------------|
| Availability | `successful requests / total requests` | HTTP 2xx/3xx | HTTP 5xx, timeouts | Rolling 30 days |
| Latency | `request duration` | P99 < 200ms | P99 >= 200ms | Rolling 30 days |
| Error Rate | `failed requests / total requests` | < 0.1% | >= 0.1% | Rolling 30 days |
| Saturation | `resource utilization` | CPU < 70% | CPU >= 70% | Rolling 7 days |

## 3. Service Level Objectives (SLOs)

| SLI | Target | Rationale | Alert Threshold |
|-----|--------|-----------|----------------|
| Availability | 99.9% | 3 nines = 43.8 min downtime/month | Page at 99.8% |
| Latency P99 | < 200ms | User-perceived responsiveness | Page at 250ms |
| Error Rate | < 0.1% | Industry standard for APIs | Page at 0.2% |
| Saturation | < 70% | Headroom for traffic spikes | Warn at 65% |

## 4. Error Budget

| SLO Target | Error Budget (30 days) | Burn Rate | Current Status |
|------------|------------------------|-----------|----------------|
| 99.9% availability | 43.8 minutes | `Xx` | Healthy / At Risk / Exhausted |

### Error Budget Policy

- **Healthy (< 50% burned):** Normal feature development
- **At Risk (50–80% burned):** No non-critical deploys; reliability work prioritized
- **Exhausted (> 80% burned):** Feature freeze; all engineering focused on reliability
- **Exhausted (> 100% burned):** Incident declared; executive notification required

## 5. Alerting Rules

| Condition | Severity | Action | Recipient |
|-----------|----------|--------|-----------|
| SLO threshold breached for > 5 min | P2 | Page on-call engineer | PagerDuty |
| Error budget > 50% in 1 day | P1 | Page team lead | PagerDuty + Slack |
| Error budget > 100% in 7 days | P0 | Page manager + exec summary | PagerDuty + Email |

## 6. Dashboard & Reporting

- Primary dashboard: `link`
- Error budget burn chart: `link`
- Monthly SLO review: `calendar link`
- Post-incident SLO impact assessment: required for SEV 1–2
```

## Explanation

The template forces a **quantified reliability contract** between engineering and users. SLIs are the raw metrics; SLOs are the targets; the error budget is the amount of "unreliability" you are allowed to spend before stopping feature work. Without an error budget policy, teams either panic at every blip or ignore degradation until customers churn. The policy gives explicit permission to slow down when reliability is at risk.

## Variants

| Context | Key SLIs | Differentiator |
|---------|----------|----------------|
| Web / API | Availability, latency P99, error rate | User-facing percentiles matter most |
| Batch / ETL | Completion rate, freshness, correctness | On-time delivery, not speed |
| Streaming / Kafka | Consumer lag, throughput, partition health | Lag matters more than latency |
| Mobile backend | API latency, push delivery rate, payload size | Battery and data cost awareness |
| ML inference | Prediction latency, throughput, model drift | Accuracy degradation is an SLO too |

## What works

1. Start with 2–3 SLIs; more metrics dilute focus and create alert fatigue
2. Base SLOs on current performance, not aspirational targets; unrealistic SLOs exhaust budgets instantly
3. Review SLOs quarterly; traffic patterns change and so should targets
4. Align SLOs with user pain, not internal metrics; users care about checkout errors, not CPU usage
5. Document the business impact of each SLO so executives understand why a feature freeze matters

## Common Mistakes

1. Setting SLOs at 100%; perfection is impossible and paralyzes engineering
2. Using averages instead of percentiles; averages hide tail latency that users actually feel
3. Alerting on SLI raw values instead of SLO breach; this creates noise without action
4. Not defining an error budget policy; SLOs without consequences are just dashboards
5. Separating SLO review from incident review; every SEV 1 should trigger an SLO impact assessment

## Frequently Asked Questions

### How many nines should my SLO target?

99.9% (three nines) is a common starting point for most SaaS APIs. 99.99% (four nines) is expensive and should only be pursued if downtime directly causes revenue loss. 99.999% (five nines) is typically reserved for critical infrastructure like payment processing or healthcare systems. Each additional nine roughly doubles the engineering cost. Start conservative and tighten as your observability and automation mature.

### Should SLOs be the same as customer-facing SLAs?

No. SLOs are internal targets; SLAs are external contracts. Set your SLOs stricter than your SLAs to create a buffer. For example, if your SLA promises 99.9% availability, set your internal SLO at 99.95%. This buffer absorbs minor breaches without violating contracts and gives you negotiation room when customers demand tighter SLAs.

### What happens when we exhaust the error budget?

The error budget policy should trigger a feature freeze and redirect all engineering effort to reliability work. This is not a punishment; it is a safety mechanism. If the team consistently exhausts budgets, the SLO targets are probably unrealistic and should be revised downward. If budgets are never touched, the targets are too loose and you may be over-investing in reliability at the cost of feature velocity.

## Advanced Solutions

### SLO monitoring with Prometheus and Grafana

Implement SLO tracking with Prometheus recording rules and Grafana dashboards:

```yaml
# prometheus-slo-rules.yaml
groups:
  - name: slo_availability
    interval: 30s
    rules:
      - record: job:slo_availability:ratio_rate5m
        expr: |
          sum(rate(http_requests_total{status!~"5.."}[5m])) by (job)
          /
          sum(rate(http_requests_total[5m])) by (job)

      - record: job:slo_availability:ratio_rate1h
        expr: |
          sum(rate(http_requests_total{status!~"5.."}[1h])) by (job)
          /
          sum(rate(http_requests_total[1h])) by (job)

      - record: job:slo_availability:ratio_rate30d
        expr: |
          sum(rate(http_requests_total{status!~"5.."}[30d])) by (job)
          /
          sum(rate(http_requests_total[30d])) by (job)

      - alert: SLOAvailabilityBurnRateHigh
        expr: |
          (
            job:slo_availability:ratio_rate1h < 0.999
            and
            job:slo_availability:ratio_rate5m < 0.999
          )
        for: 2m
        labels:
          severity: page
        annotations:
          summary: "SLO availability burn rate is high for {{ $labels.job }}"

  - name: slo_latency
    interval: 30s
    rules:
      - record: job:slo_latency_p99:histogram_quantile
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, job)
          )

      - alert: SLOLatencyP99Breach
        expr: job:slo_latency_p99:histogram_quantile > 0.2
        for: 5m
        labels:
          severity: page
        annotations:
          summary: "P99 latency exceeds 200ms SLO for {{ $labels.job }}"
```

### Error budget calculation script

Calculate error budget burn rate and remaining budget programmatically:

```python
import datetime
from dataclasses import dataclass

@dataclass
class ErrorBudget:
    slo_target: float          # e.g., 0.999 for 99.9%
    window_days: int           # e.g., 30
    total_requests: int
    failed_requests: int

    @property
    def error_budget_total(self) -> float:
        """Total allowed errors in the window."""
        return self.total_requests * (1 - self.slo_target)

    @property
    def error_budget_consumed(self) -> float:
        """Errors consumed so far."""
        return self.failed_requests

    @property
    def error_budget_remaining(self) -> float:
        """Errors remaining in the budget."""
        return self.error_budget_total - self.error_budget_consumed

    @property
    def burn_rate(self) -> float:
        """How fast we are consuming the budget (1.0 = on pace)."""
        if self.error_budget_total == 0:
            return 0
        return self.error_budget_consumed / self.error_budget_total

    @property
    def status(self) -> str:
        rate = self.burn_rate
        if rate > 1.0:
            return "EXHAUSTED"
        elif rate > 0.8:
            return "CRITICAL"
        elif rate > 0.5:
            return "AT RISK"
        else:
            return "HEALTHY"

    def report(self) -> str:
        return (
            f"SLO Target: {self.slo_target*100}%\n"
            f"Window: {self.window_days} days\n"
            f"Total Requests: {self.total_requests:,}\n"
            f"Failed Requests: {self.failed_requests:,}\n"
            f"Budget Total: {self.error_budget_total:.0f}\n"
            f"Budget Consumed: {self.error_budget_consumed:.0f}\n"
            f"Budget Remaining: {self.error_budget_remaining:.0f}\n"
            f"Burn Rate: {self.burn_rate:.2%}\n"
            f"Status: {self.status}"
        )

# Example usage
budget = ErrorBudget(
    slo_target=0.999,
    window_days=30,
    total_requests=10_000_000,
    failed_requests=15_000
)
print(budget.report())
```

### Multi-window multi-burn-rate alerting

Implement Google's recommended multi-window burn rate alerts to catch both fast-burning and slow-burning SLO violations:

```yaml
# Multi-window burn rate alerts
# Fast burn: 2% of budget in 1 hour
# Slow burn: 10% of budget in 3 days
groups:
  - name: slo_multi_window_alerts
    rules:
      # Fast burn - Page immediately
      - alert: SLOFastBurnRate
        expr: |
          (
            job:slo_availability:ratio_rate5m < 0.999
            and job:slo_availability:ratio_rate1h < 0.999
          )
        for: 2m
        labels:
          severity: page
          burn_type: fast
        annotations:
          summary: "Fast SLO burn: 2% budget in 1h for {{ $labels.job }}"

      # Slow burn - Warn for investigation
      - alert: SLOSlowBurnRate
        expr: |
          (
            job:slo_availability:ratio_rate1h < 0.999
            and job:slo_availability:ratio_rate6h < 0.999
          )
        for: 15m
        labels:
          severity: warn
          burn_type: slow
        annotations:
          summary: "Slow SLO burn: 10% budget in 3d for {{ $labels.job }}"

      # Critical burn - Executive notification
      - alert: SLOCriticalBurnRate
        expr: |
          (
            job:slo_availability:ratio_rate30m < 0.99
            and job:slo_availability:ratio_rate6h < 0.99
          )
        for: 10m
        labels:
          severity: critical
          burn_type: critical
        annotations:
          summary: "Critical SLO burn for {{ $labels.job }} - exec notification required"
```

## Additional Best Practices


- For a deeper guide, see [Site Reliability Engineering](/guides/sre-practices-guide/).

1. **Use SLI-based alerting instead of threshold-based alerting.** Instead of alerting when CPU > 80%, alert when the error budget burn rate exceeds 2x normal. This reduces false positives and ties alerts to user impact:

```promql
# Alert when 30-day error budget burns 2x faster than normal
(
  1 - job:slo_availability:ratio_rate1h
) > 2 * (1 - 0.999) / 30 / 24
```

2. **Track SLOs per user journey, not per service.** A service can be healthy while a critical user journey is broken. Define SLIs around the checkout flow, not just the payment API:

```yaml
# User journey SLI: Checkout completion
sli_checkout:
  good_events: "checkout_completed_total"
  bad_events: "checkout_failed_total + checkout_abandoned_total"
  metric: "rate(checkout_completed_total[5m]) / rate(checkout_started_total[5m])"
  target: 0.995
```

## Additional Common Mistakes

1. **Setting different SLOs for the same service across teams.** When multiple teams own parts of a service, inconsistent SLOs create blind spots. Use a unified SLO that covers the full user journey:

```bash
# Validate SLO consistency across teams
node -e "
const slos = require('./slo-definitions.json');
const services = {};
slos.forEach(s => {
  if (!services[s.service]) services[s.service] = [];
  services[s.service].push(s.target);
});
for (const [svc, targets] of Object.entries(services)) {
  const unique = [...new Set(targets)];
  if (unique.length > 1) {
    console.log('INCONSISTENT: ' + svc + ' has targets: ' + unique.join(', '));
  }
}
"
```

2. **Not accounting for planned maintenance in error budgets.** Scheduled deployments and maintenance consume error budget. Either exclude planned downtime from SLI calculations or allocate a separate maintenance budget:

```promql
# Exclude planned maintenance windows from SLI
sum(rate(http_requests_total{status!~"5..", maintenance!="true"}[30d]))
/
sum(rate(http_requests_total{maintenance!="true"}[30d]))
```

## Additional Frequently Asked Questions

### How do I calculate error budget in minutes?

For a 30-day window: `30 days * 24 hours * 60 minutes * (1 - SLO_target)`. At 99.9%: `43200 * 0.001 = 43.2 minutes` of allowed downtime per month. At 99.95%: `43200 * 0.0005 = 21.6 minutes`. At 99.99%: `43200 * 0.0001 = 4.32 minutes`.

### Should I use SLOs for internal-only services?

Yes. Internal services affect downstream user-facing services. A slow internal API increases latency for the user journey. Set SLOs on internal services with targets aligned to their downstream impact. An internal auth service that takes 500ms will breach the user-facing latency SLO even if the frontend is fast.
