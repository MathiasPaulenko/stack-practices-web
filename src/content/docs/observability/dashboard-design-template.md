---
contentType: docs
slug: dashboard-design-template
title: "Dashboard Design Template"
description: "A template for designing observability dashboards with SLOs, error budgets, service health, and contextual information for on-call teams."
metaDescription: "Use this dashboard design template to create observability dashboards with SLOs, error budgets, service health panels, and contextual on-call information."
difficulty: intermediate
topics:
  - testing
tags:
  - observability
  - dashboard
  - template
  - grafana
  - slo
  - error-budget
  - monitoring
relatedResources:
  - /docs/observability/observability-maturity-assessment-template
  - /docs/observability/alert-runbook-template
  - /docs/observability/incident-postmortem-template
  - /guides/observability/complete-guide-structured-logging
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use this dashboard design template to create observability dashboards with SLOs, error budgets, service health panels, and contextual on-call information."
  keywords:
    - dashboard design
    - observability dashboard
    - grafana template
    - slo dashboard
    - error budget
    - monitoring
    - template
---

## Overview

A dashboard is a visual interface that answers questions about system health. Good dashboards reduce time-to-diagnosis during incidents. Bad dashboards add noise and confusion. This template defines the structure for service dashboards that on-call engineers can rely on at 3 AM.

## When to Use

- Creating a new service dashboard
- Redesigning an existing dashboard that nobody uses
- Standardizing dashboard layout across teams
- Setting up SLO and error budget tracking
- Preparing dashboards for on-call handoff

## Solution

```markdown
# Dashboard Design: `<Service Name>`

## Dashboard Metadata

| Field | Value |
|-------|-------|
| Dashboard Title | Payment Service Health |
| Dashboard URL | https://grafana.example.com/d/payment-service |
| Owner | Payment Team |
| Last Reviewed | 2026-07-05 |
| Audience | On-call engineers, developers, SRE |
| Refresh Interval | 30 seconds |
| Time Range Default | Last 1 hour |

## 1. Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ROW 1: Service Status Banner                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Health      │  │ SLO Status  │  │ Error Budget│         │
│  │ OK/WARN/ERR │  │ 99.9%       │  │ 72% remain  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ROW 2: RED Metrics (Rate, Errors, Duration)                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Request Rate│  │ Error Rate  │  │ p95 Latency │         │
│  │ (req/s)     │  │ (% of total)│  │ (ms)        │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ROW 3: Traffic and Status Codes                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │ Requests by endpoint    │  │ Status code distribution│  │
│  │ (stacked area)          │  │ (pie chart)             │  │
│  └─────────────────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ROW 4: Infrastructure Health                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ CPU Usage   │  │ Memory      │  │ DB Conns    │         │
│  │ (%)         │  │ (MB)        │  │ (active/idle)│        │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ROW 5: Business Metrics                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Orders/min  │  │ Revenue/min │  │ Success Rate│         │
│  │             │  │ ($)         │  │ (%)         │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ROW 6: Context and Links                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Runbook | Logs | Traces | Alerts | Deploy Info     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 2. Panel Specifications

### Row 1: Service Status Banner

| Panel | Type | Query | Thresholds | Purpose |
|-------|------|-------|------------|---------|
| Health | Stat | `up{service="payment"}` | OK: 1, WARN: 0.5, ERR: 0 | Quick health check |
| SLO Status | Stat | `payment_slo_availability_ratio` | OK: > 0.999, WARN: > 0.99, ERR: < 0.99 | SLO compliance at a glance |
| Error Budget | Gauge | `payment_error_budget_remaining_pct` | OK: > 30%, WARN: > 10%, ERR: < 10% | How much error budget is left |

### Row 2: RED Metrics

| Panel | Type | Query | Thresholds | Purpose |
|-------|------|-------|------------|---------|
| Request Rate | Time series | `rate(http_requests_total{service="payment"}[5m])` | — | Traffic volume |
| Error Rate | Time series | `rate(http_requests_total{service="payment",status=~"5.."}[5m]) / rate(http_requests_total{service="payment"}[5m])` | WARN: > 1%, ERR: > 5% | Error percentage |
| p95 Latency | Time series | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service="payment"}[5m]))` | WARN: > 500ms, ERR: > 1s | Response time |

### Row 3: Traffic and Status Codes

| Panel | Type | Query | Purpose |
|-------|------|-------|---------|
| Requests by endpoint | Stacked area | `sum(rate(http_requests_total{service="payment"}[5m])) by (endpoint)` | See traffic distribution |
| Status code distribution | Pie chart | `sum(rate(http_requests_total{service="payment"}[5m])) by (status)` | Spot error patterns |

### Row 4: Infrastructure Health

| Panel | Type | Query | Thresholds | Purpose |
|-------|------|-------|------------|---------|
| CPU Usage | Time series | `rate(container_cpu_usage_seconds_total{pod=~"payment.*"}[5m]) * 100` | WARN: > 70%, ERR: > 90% | Resource saturation |
| Memory | Time series | `container_memory_working_set_bytes{pod=~"payment.*"}` | WARN: > 80% limit, ERR: > 95% | Memory pressure |
| DB Connections | Time series | `payment_db_connections_active` / `payment_db_connections_max` | WARN: > 70%, ERR: > 90% | Pool exhaustion |

### Row 5: Business Metrics

| Panel | Type | Query | Thresholds | Purpose |
|-------|------|-------|------------|---------|
| Orders/min | Time series | `rate(payment_orders_total[5m]) * 60` | — | Business throughput |
| Revenue/min | Time series | `rate(payment_revenue_total[5m]) * 60` | — | Revenue tracking |
| Success Rate | Stat | `rate(payment_orders_total{status="success"}[5m]) / rate(payment_orders_total[5m])` | WARN: < 99%, ERR: < 95% | Business health |

### Row 6: Context and Links

| Link | URL | Purpose |
|------|-----|---------|
| Runbook | https://runbooks.example.com/payment-service | Incident response |
| Logs | https://kibana.example.com/app/discover#/?_a=(query:service:payment) | Log search |
| Traces | https://jaeger.example.com/search?service=payment | Distributed traces |
| Alerts | https://alertmanager.example.com/#/alerts?receiver=payment | Active alerts |
| Deploy Info | https://grafana.example.com/d/deployments?service=payment | Recent deployments |

## 3. SLO Configuration

### SLO Definition

| SLO | Target | Window | Error Budget | Measurement |
|-----|--------|--------|-------------|-------------|
| Availability | 99.9% | 30 days | 0.1% = 43.2 min | `1 - (failed_requests / total_requests)` |
| Latency p95 | < 500ms | 30 days | 0.1% = 43.2 min | `histogram_quantile(0.95, ...)` |
| Latency p99 | < 2s | 30 days | 0.1% = 43.2 min | `histogram_quantile(0.99, ...)` |

### Error Budget Tracking

| Metric | Query | Purpose |
|--------|-------|---------|
| Budget remaining | `1 - (rate(errors[30d]) / 0.001)` | How much budget is left |
| Burn rate (1h) | `rate(errors[1h]) / 0.001` | Fast burn detection |
| Burn rate (6h) | `rate(errors[6h]) / 0.001` | Sustained burn detection |
| Budget reset date | `30d - elapsed_in_window` | When budget resets |

### Alerting Rules

```yaml
# Fast burn: 2% of budget in 1 hour
- alert: PaymentSLOFastBurn
  expr: |
    (
      sum(rate(http_requests_total{service="payment",status=~"5.."}[1h]))
      /
      sum(rate(http_requests_total{service="payment"}[1h]))
    ) > 0.02
  for: 5m
  labels:
    severity: critical
    service: payment
  annotations:
    summary: "Payment SLO fast burn — 2% budget consumed in 1h"
    runbook: "https://runbooks.example.com/payment-slo-burn"

# Slow burn: 5% of budget in 6 hours
- alert: PaymentSLOSlowBurn
  expr: |
    (
      sum(rate(http_requests_total{service="payment",status=~"5.."}[6h]))
      /
      sum(rate(http_requests_total{service="payment"}[6h]))
    ) > 0.005
  for: 30m
  labels:
    severity: warning
    service: payment
  annotations:
    summary: "Payment SLO slow burn — 5% budget consumed in 6h"
    runbook: "https://runbooks.example.com/payment-slo-burn"
```

## 4. Dashboard Variables

| Variable | Type | Query | Default | Purpose |
|----------|------|-------|---------|---------|
| $datasource | Data source | — | Prometheus | Switch between environments |
| $environment | Query | `label_values(up, environment)` | production | Filter by environment |
| $instance | Query | `label_values(up{service="payment"}, instance)` | All | Filter by instance |
| $endpoint | Query | `label_values(http_requests_total{service="payment"}, endpoint)` | All | Filter by endpoint |
| $timeframe | Interval | — | 1h | Quick time range switch |

## 5. Annotation Layers

| Annotation | Query | Purpose |
|------------|-------|---------|
| Deployments | `deployments{service="payment"}` | Correlate changes with metric shifts |
| Incidents | `incidents{service="payment"}` | See incident impact on metrics |
| Maintenance | `maintenance{service="payment"}` | Expected dips during maintenance |
| Alerts | `alerts{service="payment"}` | When alerts fired relative to metrics |
```

## Explanation

Dashboard design follows a top-down structure: status first, then metrics, then context. The status banner (Row 1) answers "is everything OK?" in one glance. RED metrics (Row 2) answer "what's the rate, errors, and duration?" — the three signals that cover most service issues. Traffic breakdown (Row 3) helps identify which endpoints are problematic. Infrastructure health (Row 4) shows whether the service has resources to operate. Business metrics (Row 5) connect technical health to business impact. Context links (Row 6) provide quick access to logs, traces, and runbooks.

SLOs and error budgets are the quantitative backbone. The SLO defines what "healthy" means objectively. The error budget tracks how much room the team has for errors before breaching the SLO. Burn rate alerts catch both fast-burning incidents (2% budget in 1 hour) and slow-burning trends (5% budget in 6 hours).

Dashboard variables let engineers filter without writing queries. The `$endpoint` variable is especially useful: when an alert fires for a specific endpoint, the engineer can filter the dashboard to that endpoint in one click.

Annotation layers correlate deployments and incidents with metric changes. When latency spikes, seeing a deployment annotation at the same timestamp immediately points to the cause.

## Dashboard Review Checklist

```text
=== Quarterly Dashboard Review ===

[ ] All panels still have valid data sources (no "No data" panels)
[ ] Thresholds reflect current SLOs and performance baselines
[ ] Variables return correct values (environments, instances, endpoints)
[ ] Annotation layers are still receiving events (deploys, incidents)
[ ] Links to runbooks, logs, and traces are not broken
[ ] No panel has more than 10 series (cardinality check)
[ ] Color coding is consistent (green/yellow/red across all panels)
[ ] Dashboard loads in under 3 seconds
[ ] Mobile view is readable (on-call engineers check from phones)
[ ] At least one other engineer can interpret the dashboard without explanation
[ ] SLO panels match current SLO definitions
[ ] Error budget panel is accurate and not showing stale data
[ ] Business metrics panels reflect current KPIs
[ ] Unused panels removed (check Grafana panel views metric)
[ ] Dashboard is tagged with service name and team owner
```


## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Database dashboard | Replace RED with USE (Utilization, Saturation, Errors) | Focus on resource metrics |
| Queue consumer | Add lag, throughput, and processing time | Consumer-specific metrics |
| Multi-service overview | Aggregate RED metrics across services | Use service map for dependencies |
| Business dashboard | Focus on business KPIs, not infrastructure | Revenue, conversion, churn |
| On-call handoff | Add shift notes, open incidents, action items | Context for incoming on-call |

## What Works

1. Put the most important information at the top — health status and SLO should be visible without scrolling
2. Use consistent color coding — green = OK, yellow = warning, red = error across all panels
3. Link to runbooks, logs, and traces — reduce navigation time during incidents
4. Use variables for filtering — let engineers drill down without writing queries
5. Add deployment annotations — correlate changes with metric shifts
6. Set realistic thresholds — base on historical data, not guesses
7. Review dashboards quarterly — remove panels nobody looks at, add missing metrics
8. Keep dashboards readable on a phone — on-call engineers check from mobile

## Common Mistakes

1. Too many panels — dashboards with 50 panels are walls of noise. Keep under 15 panels.
2. No status summary — forcing engineers to interpret 10 charts to know if things are OK
3. No thresholds — lines without thresholds require interpretation. Set visual thresholds.
4. No links to context — dashboards without links to logs, traces, and runbooks are dead ends
5. Stale dashboards — metrics change, services evolve. Review quarterly.
6. Mixing audiences — a dashboard for executives and a dashboard for on-call engineers are different things
7. No variables — forcing engineers to edit queries to filter by endpoint or instance
8. Too high cardinality — panels with 100 series are unreadable. Aggregate appropriately.

## Frequently Asked Questions

### How many panels should a dashboard have?

8-15 panels. More than that and the dashboard becomes a wall of noise. If you need more, split into multiple dashboards: one overview, one detailed. The overview should answer "is everything OK?" in 5 seconds.

### Should we use Grafana or build a custom dashboard?

Grafana for engineering dashboards. It integrates with Prometheus, has variables, annotations, and alerting. Custom dashboards for business-facing views where branding matters. Don't build custom dashboards for engineering use — Grafana is better and free.

### How do we choose SLO targets?

Base them on historical performance, not aspiration. If your service has been at 99.5% availability for 6 months, setting a 99.99% SLO is unrealistic. Start with current performance, then tighten over time. The SLO should be achievable but require effort to maintain.

### What is an error budget?

The error budget is the amount of unreliability you can afford while still meeting your SLO. For a 99.9% SLO over 30 days, the error budget is 43.2 minutes of downtime. When the budget is exhausted, the team should stop shipping features and focus on reliability.

### Should we have separate dashboards for each environment?

Yes. Production, staging, and development have different metrics, different traffic patterns, and different audiences. A production dashboard is for on-call engineers. A staging dashboard is for QA. Keep them separate to avoid confusion.


### How do we handle dashboard sprawl?

Dashboard sprawl happens when every engineer creates dashboards without governance. To manage: assign a dashboard owner for each dashboard. Tag dashboards with service name and team. Review dashboards quarterly — if a dashboard has not been viewed in 30 days, archive it. Use Grafana folders to organize by team or service. Create a "golden dashboards" set that is maintained and trusted. discourage personal dashboards in shared folders. Provide templates so engineers start from a consistent base. Track dashboard usage metrics to identify abandoned dashboards.

### What metrics should every service dashboard have?

Every service dashboard should include the RED metrics: Rate (requests per second), Errors (error rate percentage), and Duration (p95 and p99 latency). Additionally: CPU and memory utilization, database connection pool usage, and dependency health (upstream and downstream). For business-critical services, add business metrics (orders/min, revenue/min, conversion rate). For queue consumers, add lag, throughput, and processing time. The RED metrics cover 80% of service health — the rest is service-specific.

### How do we design dashboards for incident response?

During an incident, engineers need information fast. Design for incident response: put the status banner at the top (green/red indicator). Show the RED metrics next — these identify most issues. Use large panels with clear thresholds so they are readable from across the room. Add links to logs, traces, and runbooks directly in the dashboard. Use annotation layers for deployments so engineers can correlate changes. Avoid complex queries that load slowly — a dashboard that takes 10 seconds to load is useless during an incident. Test the dashboard during a tabletop exercise to verify it provides the right information.

### How do we share dashboards with non-technical stakeholders?

For executives and product managers: create a separate business-facing dashboard with KPIs (revenue, conversion, uptime percentage, active users). Avoid technical metrics (CPU, latency p99, connection pools). Use simple visualizations (stat panels, gauges, single numbers). Add a status banner that shows green/red. Schedule regular screenshots or PDF exports via Grafana reporting. Keep the dashboard simple — if a stakeholder asks "what does this mean?" the dashboard has failed. Update the dashboard when business priorities change.
