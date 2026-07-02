---
contentType: guides
slug: complete-guide-observability-grafana-stack
title: "Complete Guide to Observability with the Grafana Stack"
description: "Set up metrics, logs, and traces with Grafana, Prometheus, Loki, and Tempo. Covers instrumentation, dashboards, alerting, and distributed tracing for production systems."
metaDescription: "Complete guide to observability with Grafana stack. Set up metrics, logs, traces with Prometheus, Loki, Tempo. Covers dashboards, alerting and distributed tracing."
difficulty: advanced
topics:
  - observability
  - devops
  - infrastructure
tags:
  - grafana
  - prometheus
  - loki
  - tempo
  - observability
  - monitoring
  - tracing
  - guide
  - observability
relatedResources:
  - /guides/observability/distributed-tracing-guide
  - /guides/devops/complete-guide-ci-cd-github-actions
  - /guides/architecture/complete-guide-microservices-communication
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Complete guide to observability with Grafana stack. Set up metrics, logs, traces with Prometheus, Loki, Tempo. Covers dashboards, alerting and distributed tracing."
  keywords:
    - grafana observability
    - prometheus metrics
    - loki logs
    - tempo traces
    - grafana stack
    - distributed tracing
    - alerting
    - monitoring
---

# Complete Guide to Observability with the Grafana Stack

## Introduction

Observability means understanding your system's internal state from its external outputs — metrics, logs, and traces. The Grafana stack (Prometheus for metrics, Loki for logs, Tempo for traces, Grafana for visualization) provides a complete open-source observability platform. This guide covers instrumentation, configuration, dashboards, alerting, and distributed tracing.

## The Three Pillars

| Pillar | Tool | What It Answers |
|--------|------|----------------|
| Metrics | Prometheus | How many? How fast? How long? |
| Logs | Loki | What happened? Why? |
| Traces | Tempo | Where did time go? What called what? |

## Prometheus (Metrics)

### Installation with Docker

```yaml
# docker-compose.yml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus

volumes:
  prometheus-data:
```

### Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ["alertmanager:9093"]

scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: "node-exporter"
    static_configs:
      - targets: ["node-exporter:9100"]

  - job_name: "app"
    static_configs:
      - targets: ["app:8080"]
    metrics_path: /metrics
```

### Instrumenting applications

#### Python

```python
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from flask import Flask, request

app = Flask(__name__)

REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"]
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency",
    ["method", "endpoint"]
)

@app.before_request
def before_request():
    request.start_time = time.time()

@app.after_request
def after_request(response):
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.endpoint,
        status=response.status_code
    ).inc()
    REQUEST_LATENCY.labels(
        method=request.method,
        endpoint=request.endpoint
    ).observe(time.time() - request.start_time)
    return response

@app.route("/metrics")
def metrics():
    return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}
```

#### Node.js

```javascript
const promClient = require("prom-client");

const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ register: promClient.register });

const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration",
  labelNames: ["method", "route", "status"],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe((Date.now() - start) / 1000);
  });
  next();
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

### PromQL queries

```promql
# Request rate (requests per second)
rate(http_requests_total[5m])

# 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) /
sum(rate(http_requests_total[5m]))

# CPU usage per pod
sum(rate(container_cpu_usage_seconds_total[5m])) by (pod)

# Memory usage
container_memory_working_set_bytes{container!=""}

# Average latency by endpoint
avg by (endpoint) (rate(http_request_duration_seconds_sum[5m]) /
rate(http_request_duration_seconds_count[5m]))
```

## Loki (Logs)

### Installation

```yaml
# docker-compose.yml
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - loki-data:/loki

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log
      - ./promtail.yml:/etc/promtail/promtail.yml
    command: -config.file=/etc/promtail/promtail.yml

volumes:
  loki-data:
```

### Promtail configuration

```yaml
# promtail.yml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: app-logs
    static_configs:
      - targets: [localhost]
        labels:
          job: app
          environment: production
          __path__: /var/log/app/*.log

  - job_name: docker-logs
    docker_sd_configs:
      - name: docker
        filters:
          - name: label
            values: ["logging=promtail"]
    relabel_configs:
      - source_labels: ["__meta_docker_container_name"]
        target_label: container
```

### LogQL queries

```logql
# All logs from app job
{job="app"}

# Error logs with regex filter
{job="app"} |= "error" | json | line_format "{{.msg}}"

# Rate of error logs per minute
sum(rate({job="app"} |= "error" [1m])) by (level)

# Logs with label filter
{job="app", environment="production"} |= "timeout" | json | level="error"
```

## Tempo (Traces)

### Installation

```yaml
# docker-compose.yml
services:
  tempo:
    image: grafana/tempo:latest
    command: ["-config.file=/etc/tempo.yaml"]
    volumes:
      - ./tempo.yaml:/etc/tempo.yaml
      - tempo-data:/var/tempo
    ports:
      - "14268:14268"  # Jaeger ingest
      - "3200:3200"    # Tempo query
```

### Configuration

```yaml
# tempo.yaml
server:
  http_listen_port: 3200

distributor:
  receivers:
    jaeger:
      protocols:
        thrift_http:
    otlp:
      protocols:
        grpc:
        http:

storage:
  trace:
    backend: local
    local:
      path: /var/tempo/traces
    wal:
      path: /var/tempo/wal
```

### Instrumenting with OpenTelemetry

#### Python

```python
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.flask import FlaskInstrumentor

trace.set_tracer_provider(TracerProvider())
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://tempo:4318/v1/traces"))
)

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)

tracer = trace.get_tracer(__name__)

@app.route("/users/<user_id>")
def get_user(user_id):
    with tracer.start_as_current_span("get_user") as span:
        span.set_attribute("user.id", user_id)
        user = fetch_user(user_id)
        span.set_attribute("user.name", user.name)
        return user
```

#### Node.js

```javascript
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { ExpressInstrumentation } = require("@opentelemetry/instrumentation-express");
const { HttpInstrumentation } = require("@opentelemetry/instrumentation-http");

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: "http://tempo:4318/v1/traces",
  }),
  instrumentations: [new ExpressInstrumentation(), new HttpInstrumentation()],
});

sdk.start();
```

## Grafana (Visualization)

### Data sources

```yaml
# provisioning/datasources/datasources.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100

  - name: Tempo
    type: tempo
    access: proxy
    url: http://tempo:3200
    jsonData:
      tracesToLogs:
        datasourceUid: loki
        tags: ["job", "instance", "pod"]
```

### Dashboard provisioning

```yaml
# provisioning/dashboards/dashboards.yml
apiVersion: 1

providers:
  - name: Default
    folder: ""
    type: file
    options:
      path: /var/lib/grafana/dashboards
```

### Example dashboard JSON (RED metrics)

```json
{
  "dashboard": {
    "title": "Service RED Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "stat",
        "targets": [
          { "expr": "sum(rate(http_requests_total[5m]))" }
        ]
      },
      {
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          { "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))" }
        ]
      },
      {
        "title": "P95 Latency",
        "type": "stat",
        "targets": [
          { "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))" }
        ]
      },
      {
        "title": "Latency Over Time",
        "type": "timeseries",
        "targets": [
          { "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) by (endpoint)" }
        ]
      }
    ]
  }
}
```

## Alerting

### Prometheus alert rules

```yaml
# alert_rules.yml
groups:
  - name: app-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) /
          sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on {{ $labels.job }}"
          description: "Error rate is {{ $value | humanizePercentage }} for the last 5 minutes"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High P95 latency on {{ $labels.job }}"
          description: "P95 latency is {{ $value }}s for the last 10 minutes"

      - alert: PodDown
        expr: up{job="app"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Pod {{ $labels.instance }} is down"
```

### Alertmanager configuration

```yaml
# alertmanager.yml
route:
  receiver: slack
  group_by: ["alertname", "severity"]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: slack
    slack_configs:
      - api_url: "https://hooks.slack.com/services/XXX"
        channel: "#alerts"
        send_resolved: true
```

## Best Practices

- **Use the RED method** — Rate, Errors, Duration for every service
- **Use the USE method** — Utilization, Saturation, Errors for resources
- **Label consistently** — service, environment, version on all metrics
- **Set retention wisely** — 15s scrape for 15 days, then downsample
- **Use structured logging** — JSON logs with trace IDs for Loki correlation
- **Inject trace IDs in logs** — enables jumping from traces to logs in Grafana
- **Use OpenTelemetry** — vendor-neutral instrumentation standard
- **Provision dashboards as code** — version control your dashboards
- **Alert on symptoms, not causes** — alert on user-visible degradation
- **Set SLO-based alerts** — burn rate alerts catch sustained degradation
- **Use Grafana templates** — one dashboard for all services with variables
- **Keep cardinality low** — avoid high-cardinality labels (user IDs, request IDs)

## Common Mistakes

- Using high-cardinality labels — explodes Prometheus memory usage
- Not setting retention limits — Prometheus disk fills up
- Alerting on every spike — alert fatigue kills signal quality
- Not correlating traces with logs — manual log searching wastes time
- Storing all logs at the same retention — expensive and unnecessary
- Not instrumenting downstream calls — blind spots in trace graphs
- Using counters without rate() — raw counters are meaningless
- Not versioning dashboards — ad-hoc changes break shared views
- Ignoring USE metrics for infrastructure — CPU and disk saturation missed
- Not testing alert rules — alerts fire incorrectly or not at all

## Frequently Asked Questions

### What is the difference between metrics, logs, and traces?

Metrics are numeric measurements aggregated over time (CPU usage, request count). Logs are discrete events with timestamps and context (error messages, audit trails). Traces follow a single request across service boundaries, showing the causal chain and timing of each step. All three are needed for full observability.

### How do I correlate traces with logs in Grafana?

Configure Tempo's `tracesToLogs` in the datasource config to link to Loki. When viewing a trace, Grafana shows a "Logs" tab that queries Loki for logs matching the trace's service, span, and time range. Ensure your application logs include the trace ID as a field.

### Should I use Grafana Cloud or self-host?

Grafana Cloud is managed and scales automatically — good for teams without ops capacity. Self-hosting gives full control and avoids per-metric pricing but requires maintenance capacity. For small teams, Grafana Cloud's free tier covers up to 10k active metrics and 50GB logs.
