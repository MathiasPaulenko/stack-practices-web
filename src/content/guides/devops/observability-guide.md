---





contentType: guides
slug: observability-guide
title: "Observability — Metrics, Logs, and Traces Complete Guide"
description: "A practical guide to observability: the three pillars (metrics, logs, traces), implementing with Prometheus, Grafana, Loki, Tempo/Jaeger, and building SLO-driven alerting."
metaDescription: "Learn observability: metrics, logs, traces. Implement with Prometheus, Grafana, Loki, Jaeger. Build SLO-driven alerting for production systems."
difficulty: intermediate
topics:
  - devops
  - observability
  - performance
tags:
  - observability
  - metrics
  - logs
  - traces
  - prometheus
  - grafana
  - loki
  - jaeger
  - slo
  - guide
relatedResources:
  - /guides/opentelemetry-guide
  - /guides/sre-practices-guide
  - /guides/service-mesh-guide
  - /recipes/python-prometheus-metrics-exporter
  - /docs/load-test-execution-plan-template
  - /docs/service-level-objective-slo-template
  - /recipes/docker-logging-fluentd
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn observability: metrics, logs, traces. Implement with Prometheus, Grafana, Loki, Jaeger. Build SLO-driven alerting for production systems."
  keywords:
    - observability
    - metrics
    - logs
    - traces
    - prometheus
    - grafana
    - slo
    - guide





---

## Overview

Observability is the ability to understand the internal state of a system by examining its outputs. Unlike monitoring, which asks "Is the system up?", observability asks "Why is the system behaving this way?". The three pillars — metrics, logs, and traces — provide complementary views. Metrics show what is happening over time, logs show what individual components are saying, and traces show how requests flow through distributed systems. Together they enable debugging unknown-unknowns: problems you did not anticipate and therefore did not instrument for.

## When to Use


- For alternatives, see [Metrics and Dashboards](/guides/metrics-and-dashboards-guide/).

- You operate distributed systems where failure is normal and expected
- Debugging requires correlating behavior across multiple services
- You need to define and measure Service Level Objectives (SLOs)
- Mean Time To Recovery (MTTR) must be minimized
- You want to move from reactive firefighting to proactive capacity planning

## The Three Pillars

| Pillar | Question it answers | Example tool |
|--------|-------------------|--------------|
| **Metrics** | What is the system doing? | Prometheus, Datadog, CloudWatch |
| **Logs** | What did a specific component say? | Loki, ELK, Splunk, CloudWatch Logs |
| **Traces** | Where did a request go and how long? | Jaeger, Tempo, Zipkin, AWS X-Ray |

## Metrics with Prometheus

```yaml
# Prometheus scrape config
scrape_configs:
  - job_name: 'api'
    static_configs:
      - targets: ['api:8080']
    metrics_path: '/metrics'

  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

### Key Metric Types

| Type | Use case | Example |
|------|----------|---------|
| **Counter** | Events that only increase | `http_requests_total` |
| **Gauge** | Values that go up and down | `memory_usage_bytes` |
| **Histogram** | Distributions of values | `request_duration_seconds` |
| **Summary** | Pre-computed quantiles | `request_duration_seconds{quantile="0.99"}` |

## Distributed Tracing with OpenTelemetry

```python
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

tracer_provider = TracerProvider()
otlp_exporter = OTLPSpanExporter(endpoint="tempo:4317", insecure=True)
tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
trace.set_tracer_provider(tracer_provider)

tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("process_order") as span:
    span.set_attribute("order.id", order_id)
    process_payment()
    update_inventory()
```

## SLO-Driven Alerting

| Level | Definition | Alerting rule |
|-------|-----------|---------------|
| **SLI** | Service Level Indicator — what you measure | `request_latency < 200ms` |
| **SLO** | Service Level Objective — target over time | `99.9% of requests < 200ms over 30 days` |
| **SLA** | Service Level Agreement — contract with users | `99.9% uptime with financial penalty` |

```yaml
# Prometheus alerting rule
groups:
  - name: api_slo
    rules:
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.001
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error rate exceeds 0.1%"
```

## Correlating Signals

Use a shared `trace_id` to link logs, metrics, and traces:

```json
{
  "timestamp": "2026-06-25T10:00:00Z",
  "level": "ERROR",
  "message": "Payment processing failed",
  "trace_id": "abc123",
  "span_id": "def456",
  "service": "payment-service"
}
```

In Grafana: search logs by `trace_id`, jump to the corresponding trace in Tempo/Jaeger, then view the metrics dashboard for the involved services.

## Common Mistakes

- **Alerting on symptoms instead of SLOs** — "CPU is high" is not useful; "error rate exceeds SLO" is
- **No log sampling or retention policy** — logs grow infinitely; define hot/warm/cold storage tiers
- **Trace sampling too aggressive** — sampling 100% of traffic can overwhelm backends; use head-based or tail-based sampling
- **Dashboard sprawl** — too many dashboards = no one uses them. Consolidate into golden signals per service.
- **Missing correlation IDs** — without trace IDs, debugging distributed failures is guesswork

## FAQ

**What is the difference between monitoring and observability?**
Monitoring asks known questions with predefined dashboards. Observability enables asking new questions about unknown problems by exploring telemetry.

**Do I need all three pillars?**
Start with metrics and logs. Add traces when you have distributed systems where request flow is non-obvious.

**Can I use managed services instead of self-hosted?**
Yes. Datadog, New Relic, Dynatrace, and AWS/GCP/Azure observability suites are fully managed alternatives with faster setup but higher cost.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Scenario: Three Pillars for Microservices

```text
System: 12 microservices, 200K requests/min
Stack: OpenTelemetry -> Prometheus (metrics), Loki (logs), Jaeger (traces)
Dashboard: Unified Grafana

1. Metrics (Prometheus):
   # Four Golden Signals
   - Latency: histogram_quantile(0.99, http_duration_bucket)
   - Traffic: rate(http_requests_total[5m])
   - Errors: rate(http_requests_total{status=~"5.."}[5m])
   - Saturation: node_cpu_seconds_total / node_cpu_cores

   # SLO tracking
   - Availability: 1 - (errors / total) > 0.999
   - Latency p99 < 500ms
   - Burn rate: error_rate / error_budget < 14

2. Logs (Loki):
   # Structured JSON with mandatory fields
   {
     "ts": "2026-01-15T10:30:00Z",
     "level": "error",
     "service": "order-service",
     "traceId": "abc123",
     "msg": "Order processing failed",
     "orderId": "ord-789",
     "error": "PaymentTimeout",
     "stack": "..."
   }

   # LogQL queries
   {service="order-service"} |= "error" | json
   {service="payment-service", level="error"}
   count_over_time({service="order-service"}[5m]) > 100

3. Traces (Jaeger):
   # Span tree for a slow request
   POST /api/orders (2.5s total)
   ├── validate_order (5ms)
   ├── check_inventory (1.8s)  <-- bottleneck
   │   ├── redis_get (2ms)
   │   └── db_query (1.79s)   <-- slow query
   ├── process_payment (450ms)
   │   ├── stripe_api (420ms)
   │   └── db_save (30ms)
   └── send_notification (5ms)

   # Correlation: traceId in logs and metrics
   # Search traceId in Loki -> request logs
   # Search traceId in Jaeger -> full trace
   # Metric with traceId label -> context

Cross-pillar correlation:
   Alert: p99 latency > 1s on order-service
   -> Search Loki: {service="order-service"} | json
      | traceId!="": filter by alert time
   -> Take traceId from error log
   -> Search Jaeger: traceId=abc123
   -> View span tree, identify bottleneck
   -> db_query 1.79s -> check slow query log
   -> Fix: add missing index

Lessons:
  - The 3 pillars are complementary, not redundant
  - traceId is the key that connects everything
  - Metrics for alerting, logs for investigation, traces for perf
  - Grafana unifies visualization across all 3 pillars
  - OpenTelemetry is the standard that unifies instrumentation
```

### What is an error budget and how is it used?

The error budget is the failure allowance your SLO permits. If your SLO is 99.9% uptime, your error budget is 0.1% = 43.2 min/month of allowed downtime. If you spend the budget fast (high burn rate), you should freeze feature deploys and focus on reliability. If you spend little, you can move faster. It is the balance between innovation and stability.






































End of document. Review and update quarterly.