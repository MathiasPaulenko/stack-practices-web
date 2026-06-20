---
contentType: guides
slug: monitoring-alerting-guide
title: "Monitoring and Alerting — Metrics, Logs, and Dashboards"
description: "A practical guide to observability: the three pillars (metrics, logs, traces), RED and USE methods, alert design, and building dashboards that actually help."
metaDescription: "Monitoring and alerting guide: RED/USE methods, metrics, logs, traces, alert design. Build observability systems that reduce MTTR and prevent alert fatigue."
difficulty: intermediate
topics:
  - devops
tags:
  - alerting
  - devops
  - guide
  - logs
  - metrics
  - monitoring
  - observability
  - traces
relatedResources:
  - /guides/devops/on-call-incident-response-guide
  - /guides/devops/docker-for-developers-guide
  - /guides/devops/cicd-pipeline-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Monitoring and alerting guide: RED/USE methods, metrics, logs, traces, alert design. Build observability systems that reduce MTTR and prevent alert fatigue."
  keywords:
    - monitoring and alerting
    - observability metrics logs traces
    - red use method
    - alert design best practices
    - reduce alert fatigue
---

# Monitoring and Alerting — Metrics, Logs, and Dashboards

## Introduction

You cannot improve what you cannot measure. Monitoring tells you when systems are unhealthy; alerting wakes you up when action is needed. But poorly designed alerting creates fatigue, burnout, and ignored pages. This guide covers the three pillars of observability, how to design actionable alerts, and how to build dashboards that help during incidents.

## The Three Pillars of Observability

| Pillar | What It Answers | Example Tools |
|--------|-----------------|---------------|
| **Metrics** | What is the system doing over time? | Prometheus, Datadog, CloudWatch |
| **Logs** | What happened in detail? | ELK, Loki, Splunk |
| **Traces** | Where did the request go and how long did each step take? | Jaeger, Zipkin, OpenTelemetry |

### Metrics

Time-series data about system health. Cheap to store, fast to query.

```python
# Application-level custom metric
from prometheus_client import Counter, Histogram

request_count = Counter('http_requests_total', 'Total requests', ['method', 'endpoint'])
request_latency = Histogram('http_request_duration_seconds', 'Request latency', ['endpoint'])

def handle_request(request):
    request_count.labels(method=request.method, endpoint=request.path).inc()
    with request_latency.labels(endpoint=request.path).time():
        return process(request)
```

**Key metric types:** Counters (always increase), Gauges (go up and down), Histograms (buckets of values).

### Logs

Structured or unstructured records of discrete events.

```json
{
  "timestamp": "2024-06-12T10:23:45Z",
  "level": "error",
  "service": "payment-api",
  "trace_id": "abc-123",
  "message": "Payment processor returned 503",
  "context": { "user_id": 456, "amount": 99.99 }
}
```

**Rule:** Use structured logs (JSON) in production. They are parseable, searchable, and correlate with traces.

### Traces

Follow a single request across services.

```
[Gateway] 2ms → [Auth] 15ms → [Orders] 45ms → [DB] 30ms → [Payment] 120ms
```

[Traces](/recipes/observability/distributed-tracing) reveal where latency actually lives. A p99 of 500ms might be 400ms in payment and 100ms everywhere else.

## The RED Method (for Services)

Monitor every service with these three metrics:

| Metric | Question | Example Threshold |
|--------|----------|-------------------|
| **Rate** | How many requests per second? | Baseline: 1000 req/s |
| **Errors** | What percentage of requests fail? | Alert if > 0.1% for 2 minutes |
| **Duration** | How long do requests take? | Alert if p99 > 500ms for 5 minutes |

## The USE Method (for Resources)

Monitor every resource (CPU, disk, network, memory) with these three:

| Metric | Question | Example Threshold |
|--------|----------|-------------------|
| **Utilization** | How busy is the resource? | CPU > 80% |
| **Saturation** | How much work is queued? | Disk queue depth > 10 |
| **Errors** | How many errors occurred? | Network packet drops > 0.1% |

## Alert Design

### Good Alerts Are Actionable

A good alert answers three questions:
1. **What is wrong?** — clear metric name and threshold breached
2. **Where is it wrong?** — service name, region, environment
3. **What should I do?** — link to [runbook](/guides/devops/technical-documentation-strategy-guide) or suggested action

### Bad Alert Examples

| Bad Alert | Why It Is Bad |
|-----------|---------------|
| "CPU high" | On which server? For how long? What do I do? |
| "Disk usage > 90%" | Is this normal? Is it growing? Which service is affected? |
| "Log error rate increased" | By how much? Is it a spike or a trend? |

### Good Alert Example

```
[SEV-2] payment-api p99 latency > 500ms in us-east-1
- Current: 750ms (baseline: 200ms)
- Duration: 8 minutes
- Runbook: https://wiki/runbooks/payment-latency
- Suggested action: Check payment processor status page. See [incident response](/guides/devops/on-call-incident-response-guide).
```

### Alert Severity

| Severity | Response Time | Action |
|----------|---------------|--------|
| **Page** (Critical) | 5 minutes | Wake someone up |
| **Ticket** (Warning) | 4 hours | Create a ticket for business hours |
| **Log** (Info) | None | Record for dashboards and analysis |

**Rule:** If an alert fires and no one takes action, downgrade it to a ticket or log.

## Dashboard Design

### The 5-Second Rule

A dashboard should tell you if the system is healthy in 5 seconds.

| Row | Purpose | Example Panels |
|-----|---------|---------------|
| **Row 1: Health** | Is the system up? | Error rate, availability SLA, throughput |
| **Row 2: Latency** | Are we fast enough? | p50, p95, p99 latency by endpoint |
| **Row 3: Resources** | Are we running out of capacity? | CPU, memory, disk, network |
| **Row 4: Business** | Are users happy? | Sign-ups, checkouts, active sessions |

### Dashboard Anti-Patterns

- 50 panels on one screen — information overload
- Dashboards no one looks at — if it is not reviewed weekly, delete it
- Static thresholds that never change — tune alerts as baselines shift

## Best Practices

- **Instrument before you need it** — adding metrics during an [incident](/guides/devops/on-call-incident-response-guide) is too late
- **Use percentiles, not averages** — averages hide outliers; p95 and p99 tell the real story
- **Correlation IDs everywhere** — tie logs, metrics, and traces to a single request ID
- **Alert on symptoms, not causes** — "users cannot check out" is better than "CPU is high"
- **Review alerts quarterly** — remove noise, tune thresholds, consolidate duplicates
- **Test your [runbooks](/guides/devops/technical-documentation-strategy-guide)** — a runbook that has not been tested in 6 months is probably wrong

## Common Mistakes

- Alerting on every possible failure mode — alert fatigue kills response quality
- Not having a "canary" metric — deploy a change and watch a single golden metric
- Ignoring baseline shifts — if p99 drifts from 100ms to 300ms over a month, investigate before it becomes an incident
- Dashboards without owners — someone must own and maintain each dashboard
- No post-[incident](/guides/devops/on-call-incident-response-guide) metric review — after every incident, ask "what metric would have caught this earlier?"

## Frequently Asked Questions

### Should I build my own monitoring or buy a SaaS?

Buy until it is a strategic differentiator. Prometheus + Grafana is free but requires expertise. Datadog/New Relic cost money but work immediately. Start with SaaS; move to self-hosted only if costs justify the operational overhead.

### What is the difference between monitoring and observability?

Monitoring asks known questions ("is CPU high?"). Observability enables asking unknown questions ("why is this user experiencing 5-second latency?"). Monitoring is a subset of observability. You need both.

### How many alerts should a service have?

3-5 critical alerts (pages), 5-10 warnings (tickets), unlimited info (logs/dashboards). More than 10 critical alerts means you are alerting on symptoms, not user impact.
