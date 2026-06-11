---
contentType: guides
slug: logging-monitoring-observability-guide
title: "Logging, Monitoring & Observability Guide"
description: "A guide to building observable systems with structured logging, metrics, and distributed tracing."
metaDescription: "Learn observability practices: structured logging, metrics collection, alerting, and distributed tracing for production systems."
difficulty: intermediate
topics:
  - devops
  - performance
tags:
  - observability
  - logging
  - monitoring
  - metrics
  - tracing
  - alerting
  - devops
  - sre
relatedResources:
  - /docs/runbook-template
  - /guides/cicd-pipeline-guide
  - /recipes/logging
lastUpdated: "2026-06-11"
author: "StackPractices"
seo:
  metaDescription: "Learn observability practices: structured logging, metrics collection, alerting, and distributed tracing for production systems."
  keywords:
    - observability
    - structured logging
    - monitoring
    - metrics
    - distributed tracing
    - alerting
---

## Introduction

Observability is the ability to understand a system's internal state by examining its outputs. The three pillars — logs, metrics, and traces — provide different perspectives on system behavior.

## The Three Pillars

| Pillar | Question | Granularity | Retention |
|--------|----------|-------------|-----------|
| **Logs** | What happened? | High (individual events) | Days to weeks |
| **Metrics** | How is it trending? | Low (aggregated) | Months to years |
| **Traces** | Where did time go? | Medium (request paths) | Days to weeks |

## Structured Logging

Replace free-form text with machine-parseable JSON.

### Format

```json
{
  "timestamp": "2026-06-11T14:32:01Z",
  "level": "ERROR",
  "message": "Payment failed",
  "service": "billing-api",
  "trace_id": "abc123",
  "user_id": "user_456",
  "amount": 99.99,
  "error": "Card declined",
  "duration_ms": 245
}
```

### Implementation (Python)

```python
import structlog
import logging

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()
logger.info("payment_processed", user_id="123", amount=49.99)
```

### Log Levels

| Level | Use Case | Example |
|-------|----------|---------|
| **DEBUG** | Development detail | Variable values, loop iterations |
| **INFO** | Normal operations | Request completed, job started |
| **WARN** | Unexpected but handled | Retry attempted, deprecated API used |
| **ERROR** | Failed operation | Request failed, exception caught |
| **FATAL** | System unavailability | Database connection lost |

## Metrics

Metrics are numeric data points collected over time.

### Metric Types

| Type | Description | Example |
|------|-------------|---------|
| **Counter** | Only increases | Requests served, errors occurred |
| **Gauge** | Can go up or down | Current queue size, memory usage |
| **Histogram** | Distribution of values | Request duration, payload size |
| **Summary** | Calculated percentiles | p95 latency, p99 latency |

### Implementation (Prometheus)

```python
from prometheus_client import Counter, Histogram, start_http_server

requests_total = Counter('http_requests_total', 'Total requests', ['method', 'status'])
request_duration = Histogram('http_request_duration_seconds', 'Request duration')

@request_duration.time()
def handle_request():
    requests_total.labels(method='GET', status='200').inc()
    # ... process request

start_http_server(8000)  # Exposes /metrics
```

## Distributed Tracing

Traces follow a request across multiple services.

```
Trace ID: abc123
├── Service A: 5ms  (HTTP request received)
├── Service B: 12ms (Auth check)
├── Service C: 45ms (Database query)
│   ├── Connection acquire: 2ms
│   ├── Query execution: 30ms
│   └── Result mapping: 13ms
└── Service D: 8ms  (Response formatting)
```

### Implementation (OpenTelemetry)

```python
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer(__name__)

span_processor = BatchSpanProcessor(OTLPSpanExporter())
trace.get_tracer_provider().add_span_processor(span_processor)

with tracer.start_as_current_span("process_payment") as span:
    span.set_attribute("payment.amount", 99.99)
    span.set_attribute("payment.currency", "USD")
    # ... business logic
```

## Alerting

Alert on symptoms, not causes.

### Alerting Rules

```yaml
# Prometheus alerting rule
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on {{ $labels.service }}"
```

### Alert Severity Levels

| Severity | Response Time | Example |
|----------|---------------|---------|
| **Critical** | Immediate | Service down, data loss risk |
| **Warning** | Within 1 hour | Elevated error rate, high latency |
| **Info** | Next business day | Capacity approaching limit |

## Best Practices

- **Use correlation IDs**: Pass `trace_id` through every service call
- **Log at boundaries**: Entry/exit of requests, jobs, and transactions
- **Avoid logging sensitive data**: No passwords, tokens, or PII
- **Set SLOs and error budgets**: Define what "good" means and measure against it
- **Alert fatigue is real**: Page only for actionable, critical issues

## Common Mistakes

- Logging everything at INFO level
- Metrics without labels (no dimensions to slice by)
- Alerting on CPU usage instead of user-facing symptoms
- Storing logs indefinitely without a retention policy
