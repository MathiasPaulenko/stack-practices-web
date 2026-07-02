---
contentType: guides
slug: complete-guide-observability-grafana-stack
title: "Guía Completa de Observabilidad con el Grafana Stack"
description: "Configura metrics, logs y traces con Grafana, Prometheus, Loki y Tempo. Cubre instrumentación, dashboards, alerting y distributed tracing para sistemas en producción."
metaDescription: "Guía completa de observabilidad con Grafana stack. Configura metrics, logs, traces con Prometheus, Loki, Tempo. Cubre dashboards, alerting y distributed tracing."
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
  metaDescription: "Guía completa de observabilidad con Grafana stack. Configura metrics, logs, traces con Prometheus, Loki, Tempo. Cubre dashboards, alerting y distributed tracing."
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

# Guía Completa de Observabilidad con el Grafana Stack

## Introducción

Observability significa entender el estado interno de tu sistema desde sus outputs externos — metrics, logs y traces. El Grafana stack (Prometheus para metrics, Loki para logs, Tempo para traces, Grafana para visualization) provee una plataforma de observabilidad open-source completa. Esta guía cubre instrumentación, configuración, dashboards, alerting y distributed tracing.

## Los Tres Pilares

| Pilar | Tool | Qué Responde |
|--------|------|----------------|
| Metrics | Prometheus | ¿Cuántos? ¿Qué tan rápido? ¿Cuánto tiempo? |
| Logs | Loki | ¿Qué pasó? ¿Por qué? |
| Traces | Tempo | ¿Dónde fue el tiempo? ¿Qué llamó a qué? |

## Prometheus (Metrics)

### Instalación con Docker

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

### Configuración

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

### Instrumentando aplicaciones

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

### Queries PromQL

```promql
# Request rate (requests por segundo)
rate(http_requests_total[5m])

# Percentil 95 de latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) /
sum(rate(http_requests_total[5m]))

# CPU usage por pod
sum(rate(container_cpu_usage_seconds_total[5m])) by (pod)

# Memory usage
container_memory_working_set_bytes{container!=""}

# Latency promedio por endpoint
avg by (endpoint) (rate(http_request_duration_seconds_sum[5m]) /
rate(http_request_duration_seconds_count[5m]))
```

## Loki (Logs)

### Instalación

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

### Configuración de Promtail

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

### Queries LogQL

```logql
# Todos los logs del job app
{job="app"}

# Error logs con regex filter
{job="app"} |= "error" | json | line_format "{{.msg}}"

# Rate de error logs por minuto
sum(rate({job="app"} |= "error" [1m])) by (level)

# Logs con label filter
{job="app", environment="production"} |= "timeout" | json | level="error"
```

## Tempo (Traces)

### Instalación

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

### Configuración

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

### Instrumentando con OpenTelemetry

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

## Pautas

- **Usar el método RED** — Rate, Errors, Duration para cada servicio
- **Usar el método USE** — Utilization, Saturation, Errors para resources
- **Labear consistentemente** — service, environment, version en todas las metrics
- **Setear retention sabiamente** — 15s scrape por 15 días, luego downsample
- **Usar structured logging** — JSON logs con trace IDs para correlation con Loki
- **Inyectar trace IDs en logs** — habilita saltar de traces a logs en Grafana
- **Usar OpenTelemetry** — standard de instrumentación vendor-neutral
- **Provisionar dashboards as code** — version control tus dashboards
- **Alertar en síntomas, no causas** — alertar en degradation visible para el usuario
- **Setear SLO-based alerts** — burn rate alerts capturan degradation sostenida
- **Usar templates de Grafana** — un dashboard para todos los servicios con variables
- **Mantener cardinality baja** — evitar labels de alta cardinality (user IDs, request IDs)

## Errores Comunes

- Usar labels de alta cardinality — explota el memory usage de Prometheus
- No setear retention limits — el disco de Prometheus se llena
- Alertar en cada spike — alert fatigue mata la calidad de signal
- No correlacionar traces con logs — buscar logs manualmente desperdicia tiempo
- Guardar todos los logs con la misma retention — caro e innecesario
- No instrumentar downstream calls — blind spots en trace graphs
- Usar counters sin rate() — counters raw son meaningless
- No versionar dashboards — cambios ad-hoc rompen views compartidas
- Ignorar USE metrics para infra — CPU y disk saturation se miss
- No testear alert rules — alerts fire incorrectamente o no fire

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre metrics, logs y traces?

Metrics son mediciones numéricas agregadas a lo largo del tiempo (CPU usage, request count). Logs son eventos discretos con timestamps y context (error messages, audit trails). Traces siguen un solo request across service boundaries, mostrando la causal chain y timing de cada step. Los tres son necesarios para full observability.

### ¿Cómo correlaciono traces con logs en Grafana?

Configurar `tracesToLogs` de Tempo en el datasource config para linkear a Loki. Al ver un trace, Grafana muestra un tab "Logs" que queriea Loki por logs matcheando el service, span y time range del trace. Asegurar que tu aplicación loguea el trace ID como field.

### ¿Debo usar Grafana Cloud o self-host?

Grafana Cloud es managed y escala automáticamente — bueno para equipos sin ops capacity. Self-hosting da control total y evita per-metric pricing pero requiere maintenance capacity. Para equipos pequeños, el free tier de Grafana Cloud cubre hasta 10k active metrics y 50GB logs.
