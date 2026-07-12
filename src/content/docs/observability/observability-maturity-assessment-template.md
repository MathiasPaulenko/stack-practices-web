---


contentType: docs
slug: observability-maturity-assessment-template
title: "Observability Maturity Assessment Template"
description: "A template for assessing logging, metrics, and tracing maturity across teams with scoring, gap analysis, and improvement roadmap."
metaDescription: "Use this observability maturity assessment template to score logging, metrics, tracing maturity, identify gaps, and build an improvement roadmap."
difficulty: intermediate
topics:
  - testing
tags:
  - observability
  - assessment
  - template
  - logging
  - metrics
  - tracing
  - maturity-model
relatedResources:
  - /docs/alert-runbook-template
  - /docs/dashboard-design-template
  - /docs/incident-postmortem-template
  - /guides/complete-guide-structured-logging
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use this observability maturity assessment template to score logging, metrics, tracing maturity, identify gaps, and build an improvement roadmap."
  keywords:
    - observability maturity
    - assessment template
    - logging
    - metrics
    - tracing
    - maturity model
    - gap analysis


---

## Overview

Observability maturity describes how well a team can answer questions about their system without deploying new code. The spectrum runs from "we check logs when something breaks" to "we proactively detect anomalies before users notice." This template provides a structured assessment across logging, metrics, tracing, alerting, and culture.

## When to Use


- For alternatives, see [Alert Runbook Template](/docs/alert-runbook-template/).

- Quarterly reliability reviews
- Onboarding a new team to observability standards
- Preparing for SRE engagement or platform migration
- Justifying observability tooling investment to stakeholders
- Establishing a baseline before improvement initiatives

## Solution

```markdown
# Observability Maturity Assessment — `<Team / Service>`

## Assessment Information

| Field | Value |
|-------|-------|
| Assessed By | <Name> |
| Date | 2026-07-05 |
| Team / Service | Payments Team |
| Current Score | 2.4 / 5.0 |
| Target Score | 4.0 / 5.0 |
| Target Date | 2026-10-05 |

## Maturity Levels

| Level | Name | Description |
|-------|------|-------------|
| 1 | Reactive | Logs exist but unstructured. No metrics or traces. Debugging is manual. |
| 2 | Basic | Structured logs. Key metrics collected. No tracing. Alerts are noisy. |
| 3 | Proactive | Structured logs + dashboards + distributed tracing. SLOs defined. Alerts are actionable. |
| 4 | Predictive | Anomaly detection. SLO-based alerting. Error budgets tracked. Runbooks for all alerts. |
| 5 | Autonomous | Automated remediation. Continuous profiling. Self-healing systems. Observability as code. |

## 1. Logging Assessment

| Criterion | Level | Score | Evidence | Gap |
|-----------|-------|-------|----------|-----|
| Log structure | Structured JSON | 3 | All services use `pino` with JSON output | — |
| Log levels | Used correctly | 2 | Debug logs left in production, noisy | Add log level policies |
| Correlation IDs | Present on all requests | 3 | `X-Request-ID` propagated via middleware | — |
| Log retention | 30 days hot, 90 cold | 3 | ELK stack with ILM policies | — |
| Log searchability | Queryable by field | 3 | Elasticsearch with structured fields | — |
| Sensitive data | Scrubbed before logging | 2 | Some endpoints log full request bodies | Add PII redaction filter |
| **Logging Average** | | **2.7** | | |

### Logging Gaps

| Gap | Current | Target | Action | Effort |
|-----|---------|--------|--------|--------|
| Debug logs in production | Level 2 | Level 3 | Set production log level to `info`, remove debug statements | 1 day |
| PII in request logs | Level 2 | Level 4 | Add redaction filter for email, phone, SSN fields | 2 days |
| No log-based alerts | Level 2 | Level 3 | Create alerts for error log spikes per service | 1 day |

## 2. Metrics Assessment

| Criterion | Level | Score | Evidence | Gap |
|-----------|-------|-------|----------|-----|
| RED metrics (Rate, Errors, Duration) | Collected for all services | 3 | Prometheus + custom exporters | Add duration histograms for 2 services |
| USE metrics (Utilization, Saturation, Errors) | Collected for infrastructure | 3 | Node exporter, cAdvisor | — |
| Business metrics | Order count, revenue, conversion | 2 | Some metrics in Mixpanel, not in Prometheus | Expose business metrics from app |
| Metric cardinality | Controlled | 2 | Some high-cardinality labels (user_id) | Remove user_id labels, use exemplars |
| Dashboards | Per-service dashboards | 3 | Grafana dashboards for each service | Add business metrics dashboard |
| SLO dashboards | Defined and tracked | 1 | No SLOs defined | Define SLOs for payment service |
| **Metrics Average** | | **2.3** | | |

### Metrics Gaps

| Gap | Current | Target | Action | Effort |
|-----|---------|--------|--------|--------|
| No SLOs | Level 1 | Level 4 | Define SLOs: 99.9% availability, p95 < 500ms | 3 days |
| High cardinality labels | Level 2 | Level 3 | Remove user_id from metrics, use traces for per-user analysis | 1 day |
| Missing business metrics | Level 2 | Level 3 | Expose order_count, revenue_total, conversion_rate from app | 2 days |
| No latency histograms | Level 2 | Level 3 | Replace counter-based duration with Prometheus histograms | 1 day |

## 3. Tracing Assessment

| Criterion | Level | Score | Evidence | Gap |
|-----------|-------|-------|----------|-----|
| Distributed tracing | Implemented | 2 | OpenTelemetry SDK in 3 of 8 services | Instrument remaining services |
| Trace propagation | W3C trace context | 3 | `traceparent` header propagated | — |
| Span attributes | Standardized | 2 | Some services have rich spans, others minimal | Add span attributes for DB queries |
| Trace sampling | Head-based + tail-based | 2 | Head-based at 10%, no tail-based | Add tail-based sampling for errors |
| Trace correlation | Linked to logs and metrics | 2 | trace_id in logs, but not in metrics | Add exemplars linking traces to metrics |
| Service maps | Auto-generated | 3 | Service mesh generates dependency map | — |
| **Tracing Average** | | **2.3** | | |

### Tracing Gaps

| Gap | Current | Target | Action | Effort |
|-----|---------|--------|--------|--------|
| 5 services not instrumented | Level 2 | Level 4 | Add OpenTelemetry SDK to remaining 5 services | 5 days |
| No tail-based sampling | Level 2 | Level 4 | Deploy OpenTelemetry Collector with tail-based sampling | 2 days |
| Missing DB span attributes | Level 2 | Level 3 | Add db.system, db.statement, db.operation attributes | 1 day |
| No trace-to-metric exemplars | Level 2 | Level 4 | Configure Prometheus exemplars linking to trace IDs | 2 days |

## 4. Alerting Assessment

| Criterion | Level | Score | Evidence | Gap |
|-----------|-------|-------|----------|-----|
| Alert noise | Low false positive rate | 2 | ~40% of alerts are actionable | Tune alert thresholds, remove noisy alerts |
| Alert routing | Routed to correct team | 3 | Alertmanager routes by service label | — |
| Runbooks | Linked to alerts | 1 | Most alerts have no runbook | Create runbooks for top 20 alerts |
| SLO-based alerting | Multi-window burn rate | 1 | No SLO-based alerts | Implement SLO-based alerting once SLOs defined |
| Alert escalation | Defined escalation policy | 3 | PagerDuty with 3-level escalation | — |
| Alert context | Includes dashboard links, logs | 2 | Some alerts include Grafana links | Add runbook and log links to all alerts |
| **Alerting Average** | | **2.0** | | |

### Alerting Gaps

| Gap | Current | Target | Action | Effort |
|-----|---------|--------|--------|--------|
| No runbooks | Level 1 | Level 4 | Write runbooks for top 20 alerts | 5 days |
| 60% false positives | Level 2 | Level 4 | Audit all alerts, tune or remove noisy ones | 3 days |
| No SLO-based alerting | Level 1 | Level 4 | Implement multi-window burn rate alerts | 3 days |
| Missing alert context | Level 2 | Level 3 | Add runbook URL, dashboard URL, log query to alert annotations | 1 day |

## 5. Culture and Process Assessment

| Criterion | Level | Score | Evidence | Gap |
|-----------|-------|-------|----------|-----|
| Observability ownership | Each team owns their dashboards | 3 | Teams create and maintain their own dashboards | — |
| Incident review | Postmortems for all incidents | 3 | Blameless postmortems within 48 hours | — |
| Action item tracking | Tracked to completion | 2 | Action items created but ~40% overdue | Add monthly action item review |
| On-call culture | Sustainable rotation | 3 | 1-week rotation, 3 engineers, follow-the-sun | — |
| Observability training | New hires trained | 1 | No formal onboarding for observability tools | Create observability onboarding guide |
| **Culture Average** | | **2.4** | | |

### Culture Gaps

| Gap | Current | Target | Action | Effort |
|-----|---------|--------|--------|--------|
| No observability onboarding | Level 1 | Level 3 | Create onboarding guide for logging, metrics, tracing tools | 2 days |
| Action items overdue | Level 2 | Level 4 | Monthly review of postmortem action items, assign owners | 0.5 days |

## 6. Overall Score

| Dimension | Score | Target | Gap |
|-----------|-------|--------|-----|
| Logging | 2.7 | 4.0 | 1.3 |
| Metrics | 2.3 | 4.0 | 1.7 |
| Tracing | 2.3 | 4.0 | 1.7 |
| Alerting | 2.0 | 4.0 | 2.0 |
| Culture | 2.4 | 4.0 | 1.6 |
| **Overall** | **2.3** | **4.0** | **1.7** |

## 7. Improvement Roadmap

| Quarter | Initiative | Dimension | Target Level | Effort | Owner |
|---------|-----------|-----------|-------------|--------|-------|
| Q3 2026 | Define SLOs for all critical services | Metrics | 3→4 | 3 days | SRE |
| Q3 2026 | Instrument remaining 5 services with OTel | Tracing | 2→4 | 5 days | Platform |
| Q3 2026 | Write runbooks for top 20 alerts | Alerting | 1→4 | 5 days | Each team |
| Q3 2026 | Audit and tune noisy alerts | Alerting | 2→4 | 3 days | SRE |
| Q4 2026 | Implement tail-based sampling | Tracing | 2→4 | 2 days | Platform |
| Q4 2026 | Add PII redaction to logs | Logging | 2→4 | 2 days | Platform |
| Q4 2026 | Create observability onboarding guide | Culture | 1→3 | 2 days | SRE |
| Q4 2026 | Implement SLO-based alerting | Alerting | 1→4 | 3 days | SRE |
| Q1 2027 | Add business metrics to Prometheus | Metrics | 2→3 | 2 days | Backend |
| Q1 2027 | Monthly action item review process | Culture | 2→4 | 0.5 days | Eng Manager |
```

## Explanation

The assessment uses a 5-level maturity model across five dimensions: logging, metrics, tracing, alerting, and culture. Each dimension is scored independently, then averaged for an overall score. The scoring is evidence-based: every score must include concrete evidence (tools used, policies in place, metrics collected).

The gap analysis is the actionable output. For each criterion below target, the template identifies what's missing, what needs to happen, and the estimated effort. This feeds directly into the improvement roadmap.

The roadmap sequences improvements by quarter, balancing quick wins (tuning alerts, adding log levels) with larger initiatives (SLO definition, full tracing instrumentation). Each item has an owner and effort estimate, making it actionable for sprint planning.

## Maturity Level Definitions

```text
=== Level 1: Ad Hoc ===
  Logging:    Unstructured, ad-hoc, no centralization
  Metrics:    Basic infrastructure metrics (CPU, memory, disk)
  Tracing:    None or log-based correlation
  Alerting:   Threshold-based, high false positive rate
  Culture:    Reactive, no postmortems, no SLOs

=== Level 2: Basic ===
  Logging:    Centralized but unstructured (ELK, CloudWatch)
  Metrics:    RED metrics for some services, Grafana dashboards
  Tracing:    Some services instrumented, basic trace propagation
  Alerting:   Threshold-based, some runbooks, PagerDuty routing
  Culture:    Postmortems for major incidents, basic on-call

=== Level 3: Structured ===
  Logging:    Structured JSON, centralized, correlation IDs
  Metrics:    RED metrics for all services, SLOs defined
  Tracing:    OpenTelemetry in all services, trace propagation
  Alerting:   SLO-based alerting, runbooks for all alerts
  Culture:    Blameless postmortems, action item tracking, on-call training

=== Level 4: Proactive ===
  Logging:    Structured, PII-redacted, log-based alerts
  Metrics:    USE + RED + business metrics, SLO-based alerting
  Tracing:    Tail-based sampling, trace-to-metric exemplars
  Alerting:   Multi-window burn rate, anomaly detection
  Culture:    Proactive improvement, observability onboarding, quarterly reviews

=== Level 5: Autonomous ===
  Logging:    Automated log analysis, pattern detection
  Metrics:    Predictive alerting, capacity forecasting
  Tracing:    Automated root cause analysis from traces
  Alerting:   Self-healing, automated remediation
  Culture:    Continuous optimization, observability as code
```


## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Small team (< 10) | Simplify to 3 dimensions: logs, metrics, alerts | Skip tracing if single service |
| Enterprise | Assess per team, aggregate for org | Compare teams to identify shared gaps |
| Startup | Focus on basics: structured logs + key metrics | Target Level 2 first |
| Regulated industry | Add audit trail and compliance dimension | FDA, SOX, GDPR requirements |
| Microservices | Emphasize tracing and service maps | Distributed systems need distributed tracing |

## What Works

1. Require evidence for every score — "we have metrics" is not evidence; "Prometheus collects RED metrics for all 8 services" is
2. Score independently per dimension — a team can be Level 4 in logging but Level 1 in tracing
3. Involve the team in scoring — self-assessment surfaces issues outsiders miss
4. Reassess quarterly — track progress over time, not just once
5. Prioritize by gap size and effort — fix the biggest gaps with the least effort first
6. Assign owners to roadmap items — unowned improvements don't happen
7. Share results across teams — one team's gaps may be another team's strengths

## Common Mistakes

1. Scoring aspirationally — scoring where you want to be, not where you are
2. No evidence — scores without proof are meaningless
3. One-time assessment — without reassessment, you can't measure progress
4. Focusing only on tools — culture and process are equally important
5. Ignoring alerting quality — having alerts is not the same as having good alerts
6. No action items — assessment without improvement plan is wasted effort
7. Comparing teams publicly without context — different services have different needs

## Frequently Asked Questions

### How long does an assessment take?

A self-assessment with the team takes 2-4 hours. Gathering evidence (checking dashboards, alert configs, tracing setup) takes another 2-4 hours. Plan for a half-day per team. For a full organization, assess one team per day.

### What if we don't have tracing at all?

Score tracing as Level 1. The gap analysis will identify instrumenting services as the first action. Don't skip the dimension — a Level 1 score communicates the gap clearly to stakeholders.

### Should we aim for Level 5?

Not necessarily. Level 5 (autonomous remediation, self-healing) requires significant engineering investment and is only justified for large-scale systems. Most teams should target Level 3-4. Focus on the dimensions that matter most for your service.

### How do we justify the investment to stakeholders?

Translate gaps into business impact: "60% of alerts are false positives, costing 20 engineering hours per week in interruptions." "No SLOs means we can't measure reliability objectively." "5 services lack tracing, making incident diagnosis 3x slower." Use the roadmap to show ROI: "3 days of SLO definition enables objective reliability measurement."

### What tools do we need for each level?

Level 1-2: Structured logging (pino, Winston), Prometheus, Grafana. Level 3: Add OpenTelemetry, Jaeger/Tempo, Alertmanager. Level 4: Add SLO tooling (Sloth, Prometheus Operator), anomaly detection. Level 5: Add automated remediation (Kubernetes operators, policy engines).


### How do we get started if we are at Level 1?

Start with logging: centralize all logs in one place (ELK, CloudWatch, Loki). Add structured logging (JSON format with fields) to your most critical service. Then add basic metrics: CPU, memory, disk, and request rate for your top 3 services. Create a single Grafana dashboard with these metrics. Set up basic alerting: threshold-based alerts for CPU > 80%, error rate > 5%. Write runbooks for the top 5 alerts. This takes 1-2 weeks and moves you from Level 1 to Level 2. Do not try to implement everything at once — incremental progress is sustainable progress.

### How do we involve the whole team in the assessment?

Schedule a half-day workshop with the engineering team. Walk through each dimension together. For each criterion, ask the team: "What evidence do we have?" Let the team self-score — they know the reality better than an external assessor. Document disagreements — if one engineer scores Level 3 and another scores Level 1, that is a finding. Discuss the gaps and brainstorm actions. Assign owners and effort estimates for each action item. Share the results with leadership. Make the assessment a regular cadence — quarterly is ideal.

### What is the relationship between SLOs and observability maturity?

SLOs (Service Level Objectives) are a Level 3-4 practice. They require: defined service level indicators (metrics), error budget tracking, and SLO-based alerting. You cannot have meaningful SLOs without Level 2+ metrics. SLOs drive observability investment: if your SLO is 99.9% availability, you need monitoring that can detect 0.1% degradation. SLOs also prioritize alerting — burn rate alerts focus on what matters to users, not what matters to infrastructure. Start SLO implementation with your most critical service and expand from there.

### How do we measure the ROI of observability improvements?

Track these metrics before and after improvements: mean time to detection (MTTD) for incidents, mean time to resolution (MTTR), number of incidents detected by monitoring vs. reported by users, false positive alert rate, engineering hours spent on alerting, and on-call satisfaction score. Calculate the cost of incidents before and after. Example: "Before tracing, MTTR was 45 minutes. After tracing, MTTR is 15 minutes. At 4 incidents/month, this saves 20 engineering hours/month." Present ROI in terms of engineering hours saved, incidents prevented, and customer impact reduced.
