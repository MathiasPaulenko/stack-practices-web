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
