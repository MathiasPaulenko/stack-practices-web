---



contentType: guides
slug: complete-guide-monitoring-and-alerting
title: "Referencia Detallada de Monitoring y Alerting"
description: "Construir un production monitoring stack. Cubre Prometheus, Grafana, AlertManager, metrics instrumentation, alert rules, runbooks, SLI/SLO/SLA, distributed tracing con Jaeger, log aggregation y on-call best practices con ejemplos practicos de configuracion."
metaDescription: "Build monitoring stack. Covers Prometheus, Grafana, AlertManager, metrics, alert rules, runbooks, SLI/SLO/SLA, Jaeger tracing, log aggregation."
difficulty: advanced
topics:
  - devops
  - observability
  - infrastructure
tags:
  - monitoring
  - alerting
  - devops
  - guia
  - prometheus
  - grafana
  - alertmanager
  - runbooks
  - sli-slo-sla
relatedResources:
  - /guides/complete-guide-kubernetes-networking
  - /guides/complete-guide-gitops-production
  - /guides/complete-guide-docker-production
  - /guides/complete-guide-sentry-error-tracking
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build monitoring stack. Covers Prometheus, Grafana, AlertManager, metrics, alert rules, runbooks, SLI/SLO/SLA, Jaeger tracing, log aggregation."
  keywords:
    - monitoring and alerting
    - prometheus
    - grafana
    - alertmanager
    - sli slo sla
    - distributed tracing
    - runbooks
    - log aggregation



---

## Introducción

Monitoring te dice que esta happening en tu system. Alerting te dice cuando algo necesita attention. Juntos son el foundation de observability. Esta guia recorre Prometheus, Grafana, AlertManager, metrics instrumentation, alert rules, runbooks, SLI/SLO/SLA, distributed tracing, log aggregation, y on-call practices.

## Prometheus Setup

### Installation

```yaml
# prometheus-values.yaml (Helm)
server:
  persistentVolume:
    enabled: true
    size: 50Gi
    storageClass: gp3
  
  retention: 30d
  retentionSize: 45GB
  
  resources:
    limits:
      cpu: 2
      memory: 4Gi
    requests:
      cpu: 1
      memory: 2Gi

alertmanager:
  enabled: true
  persistentVolume:
    enabled: true
    size: 5Gi

nodeExporter:
  enabled: true

kubeStateMetrics:
  enabled: true

extraScrapeConfigs: |
  - job_name: 'api-service'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: (.+)
        replacement: $1
```

```bash
# Install Prometheus con Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/prometheus \
  -n monitoring --create-namespace \
  -f prometheus-values.yaml
```

### Metrics Instrumentation

```python
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import FastAPI, Request, Response
import time

app = FastAPI()

# Metrics definitions
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint'],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

ACTIVE_CONNECTIONS = Gauge(
    'active_connections',
    'Active connections'
)

DB_POOL_SIZE = Gauge(
    'db_pool_size',
    'Database connection pool size',
    ['pool_name']
)

DB_POOL_USED = Gauge(
    'db_pool_used',
    'Database connections in use',
    ['pool_name']
)

BUSINESS_METRIC = Counter(
    'api_requests_total',
    'Total API requests by plan',
    ['plan', 'endpoint']
)

# Middleware para automatic metrics
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = time.time()
    
    ACTIVE_CONNECTIONS.inc()
    
    try:
        response = await call_next(request)
        
        duration = time.time() - start
        endpoint = request.url.path
        method = request.method
        status = response.status_code
        
        REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status).inc()
        REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(duration)
        
        return response
    finally:
        ACTIVE_CONNECTIONS.dec()

# Metrics endpoint
@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

# Business metrics en endpoints
@app.get("/api/users")
async def list_users(request: Request):
    plan = request.headers.get("x-plan", "free")
    BUSINESS_METRIC.labels(plan=plan, endpoint="/api/users").inc()
    # ... handler logic
    return {"users": []}

# Update gauges periodicamente
import asyncio

async def update_db_pool_metrics():
    while True:
        for pool_name, pool in db.pools.items():
            DB_POOL_SIZE.labels(pool_name=pool_name).set(pool.size())
            DB_POOL_USED.labels(pool_name=pool_name).set(pool.used())
        await asyncio.sleep(15)

@app.on_event("startup")
async def start_metrics_updater():
    asyncio.create_task(update_db_pool_metrics())
```

## Grafana Dashboards

### Dashboard as Code

```json
{
  "dashboard": {
    "title": "API Service Overview",
    "tags": ["api", "production"],
    "timezone": "browser",
    "panels": [
      {
        "title": "Request Rate (req/s)",
        "type": "graph",
        "datasource": "Prometheus",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (endpoint)",
            "legendFormat": "{{endpoint}}"
          }
        ]
      },
      {
        "title": "P99 Latency",
        "type": "graph",
        "datasource": "Prometheus",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
        "targets": [
          {
            "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint))",
            "legendFormat": "p99 {{endpoint}}"
          }
        ]
      },
      {
        "title": "Error Rate (%)",
        "type": "stat",
        "datasource": "Prometheus",
        "gridPos": {"h": 4, "w": 6, "x": 0, "y": 8},
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 1},
                {"color": "red", "value": 5}
              ]
            }
          }
        }
      },
      {
        "title": "Active Connections",
        "type": "stat",
        "datasource": "Prometheus",
        "gridPos": {"h": 4, "w": 6, "x": 6, "y": 8},
        "targets": [
          {"expr": "active_connections"}
        ]
      }
    ],
    "templating": {
      "list": [
        {
          "name": "datasource",
          "type": "datasource",
          "query": "prometheus"
        }
      ]
    },
    "time": {"from": "now-1h", "to": "now"},
    "refresh": "30s"
  }
}
```

### Grafana en Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
        - name: grafana
          image: grafana/grafana:11.0.0
          ports:
            - containerPort: 3000
          env:
            - name: GF_SECURITY_ADMIN_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: grafana-secrets
                  key: admin-password
            - name: GF_INSTALL_PLUGINS
              value: "grafana-piechart-panel"
          volumeMounts:
            - name: grafana-storage
              mountPath: /var/lib/grafana
            - name: dashboards
              mountPath: /var/lib/grafana/dashboards
            - name: datasource
              mountPath: /etc/grafana/provisioning/datasources
      volumes:
        - name: grafana-storage
          persistentVolumeClaim:
            claimName: grafana-pvc
        - name: dashboards
          configMap:
            name: grafana-dashboards
        - name: datasource
          configMap:
            name: grafana-datasource
```

## AlertManager

### Alert Rules

```yaml
# alerting-rules.yaml
groups:
  - name: api-service
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) by (endpoint)
          /
          sum(rate(http_requests_total[5m])) by (endpoint)
          > 0.05
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "High error rate on {{ $labels.endpoint }}"
          description: "Error rate is {{ $value | humanizePercentage }} for the last 5 minutes"
          runbook: "https://runbooks.stackpractices.com/high-error-rate"
      
      - alert: HighLatency
        expr: |
          histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint))
          > 2
        for: 10m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "High P99 latency on {{ $labels.endpoint }}"
          description: "P99 latency is {{ $value }}s for the last 10 minutes"
          runbook: "https://runbooks.stackpractices.com/high-latency"
      
      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[5m]) > 0
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Pod {{ $labels.pod }} is crash looping"
          description: "Container {{ $labels.container }} in pod {{ $labels.pod }} has restarted {{ $value }} times in the last 5 minutes"
          runbook: "https://runbooks.stackpractices.com/crash-loop"
      
      - alert: DiskSpaceLow
        expr: |
          (node_filesystem_avail_bytes{mountpoint="/"}
          /
          node_filesystem_size_bytes{mountpoint="/"}) * 100 < 10
        for: 5m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Low disk space on {{ $labels.instance }}"
          description: "Only {{ $value }}% disk space remaining on {{ $labels.instance }}"
          runbook: "https://runbooks.stackpractices.com/low-disk-space"
      
      - alert: DatabaseConnectionsExhausted
        expr: |
          db_pool_used / db_pool_size > 0.8
        for: 5m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "Pool {{ $labels.pool_name }} is at {{ $value | humanizePercentage }} capacity"
          runbook: "https://runbooks.stackpractices.com/db-pool-exhausted"
```

### AlertManager Configuration

```yaml
# alertmanager.yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'
  
  routes:
    - matchers:
        - severity = "critical"
      receiver: 'critical-pagerduty'
      group_wait: 10s
      repeat_interval: 1h
    
    - matchers:
        - severity = "warning"
      receiver: 'warning-slack'
      repeat_interval: 4h
    
    - matchers:
        - team = "frontend"
      receiver: 'frontend-slack'

receivers:
  - name: 'default'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/xxx'
        channel: '#alerts'
        send_resolved: true
  
  - name: 'critical-pagerduty'
    pagerduty_configs:
      - routing_key: 'your-pagerduty-routing-key'
        severity: critical
        send_resolved: true
  
  - name: 'warning-slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/xxx'
        channel: '#alerts-warnings'
        send_resolved: true
  
  - name: 'frontend-slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/xxx'
        channel: '#frontend-alerts'

inhibit_rules:
  - source_matchers:
      - severity = "critical"
    target_matchers:
      - severity = "warning"
    equal: ['alertname', 'cluster']
```

## SLI, SLO, SLA

```yaml
# SLI/SLO definitions como Prometheus rules
groups:
  - name: slo-tracking
    interval: 30s
    rules:
      # SLI: Request success rate
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
      
      # SLI: Latency (P99 < 500ms)
      - record: job:slo_latency:ratio_rate5m
        expr: |
          sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) by (job)
          /
          sum(rate(http_request_duration_seconds_count[5m])) by (job)
      
      # Error budget burn rate
      - record: job:error_budget_burn:ratio_rate1h
        expr: |
          (1 - job:slo_availability:ratio_rate1h) / (1 - 0.999)
      
      # Alert: Error budget burning too fast
      - alert: ErrorBudgetBurn
        expr: job:error_budget_burn:ratio_rate1h > 14.4
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error budget burning too fast for {{ $labels.job }}"
          description: "Burning 1h of error budget every 5 minutes. SLO is at risk."
```

```text
SLI/SLO/SLA Definitions:

SLI (Service Level Indicator):
  - Un measured metric: request success rate, latency P99, uptime
  - Example: 99.9% de requests succeed (status < 500)

SLO (Service Level Objective):
  - Target para tu SLI over un time window
  - Example: 99.9% availability over 30 days
  - Error budget: 0.1% de 30 days = 43.2 minutes de allowed downtime

SLA (Service Level Agreement):
  - Contract con customers, includes consequences por missing SLO
  - Example: 99.5% uptime o refund 10% del monthly fee

Error Budget:
  - El allowed amount de unreliability
  - 99.9% SLO = 43.2 min downtime per 30 days
  - Si budget es spent, freeze new features y focus en reliability
  - Si budget es healthy, take risks (deploy more, experiment)
```

## Distributed Tracing

```python
# OpenTelemetry tracing setup
from opentelemetry import trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

def setup_tracing(app, service_name: str, jaeger_host: str = "jaeger"):
    provider = TracerProvider()
    
    jaeger_exporter = JaegerExporter(
        agent_host_name=jaeger_host,
        agent_port=6831,
    )
    
    provider.add_span_processor(
        BatchSpanProcessor(jaeger_exporter)
    )
    
    trace.set_tracer_provider(provider)
    
    # Auto-instrument FastAPI
    FastAPIInstrumentor.instrument_app(app)
    
    # Auto-instrument SQLAlchemy
    SQLAlchemyInstrumentor().instrument(engine=db.engine)
    
    # Auto-instrument HTTPX
    HTTPXClientInstrumentor().instrument()

# Manual tracing
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

@app.get("/api/users/{user_id}")
async def get_user(user_id: int):
    with tracer.start_as_current_span("get_user") as span:
        span.set_attribute("user.id", user_id)
        
        with tracer.start_as_current_span("db_query"):
            user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            span.set_attribute("user.found", False)
            raise HTTPException(404, "User not found")
        
        span.set_attribute("user.found", True)
        return {"id": user.id, "name": user.username}
```

## Log Aggregation

```yaml
# Loki + Promtail para log aggregation
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: promtail
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: promtail
  template:
    metadata:
      labels:
        app: promtail
    spec:
      containers:
        - name: promtail
          image: grafana/promtail:3.0.0
          args:
            - -config.file=/etc/promtail/promtail.yaml
          volumeMounts:
            - name: promtail-config
              mountPath: /etc/promtail
            - name: varlog
              mountPath: /var/log
            - name: varlibdockercontainers
              mountPath: /var/lib/docker/containers
              readOnly: true
      volumes:
        - name: promtail-config
          configMap:
            name: promtail-config
        - name: varlog
          hostPath:
            path: /var/log
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers
```

```yaml
# promtail-config.yaml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_node_name]
        target_label: node
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
      - source_labels: [__meta_kubernetes_pod_container_name]
        target_label: container
    pipeline_stages:
      - json:
          expressions:
            level: level
            message: message
            request_id: request_id
      - labels:
          level:
          request_id:
```

## Runbooks

```markdown
# Runbook: High Error Rate

## Alert: HighErrorRate
- **Severity**: Critical
- **Condition**: Error rate > 5% for 5 minutes
- **Impact**: Users seeing 500 errors

## Quick Triage (5 minutes)
1. Check Grafana dashboard: "API Service Overview"
2. Identify which endpoints have high error rates
3. Check recent deployments: `kubectl rollout history deployment/api -n production`
4. Check pod logs: `kubectl logs -l app=api -n production --tail=100`

## Resolution Steps

### If caused by recent deployment
1. Rollback: `kubectl rollout undo deployment/api -n production`
2. Verify error rate drops: check Grafana
3. Create incident report

### If caused by database issues
1. Check database connections: `kubectl exec -it <db-pod> -- psql -c "SELECT count(*) FROM pg_stat_activity"`
2. Check for long queries: `SELECT pid, now() - query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC LIMIT 10`
3. Kill long queries if needed: `SELECT pg_terminate_backend(pid)`

### If caused by external API failure
1. Check external API status page
2. Enable circuit breaker fallback
3. Increase timeout if temporary

## Post-Incident
1. Create postmortem within 48 hours
2. Add alert for earlier detection if possible
3. Update this runbook with new findings
```

## Preguntas Frecuentes

### ¿Qué metrics deberia monitorear?

Monitorea four golden signals: latency (request duration histograms), traffic (request rate), errors (error rate by status code), y saturation (CPU, memory, disk, connection pool usage). Add business metrics specific a tu application (active users, API calls by plan, revenue). Usa el USE method para resources (Utilization, Saturation, Errors) y el RED method para services (Rate, Errors, Duration).

### ¿Cómo seteo SLOs?

Empieza con user-facing metrics. Define que "good" significa desde el user's perspective — e.g., "request completes en under 500ms con status < 500". Setea SLO basado en historical performance, no aspiration. Un 99.9% SLO significa 43.2 minutes de allowed downtime per 30 days. Trackea error budget burn rate y alerta cuando burning too fast. Review SLOs quarterly y adjust basado en user feedback y business needs.

### ¿Cuál es la diferencia entre metrics, logs, y traces?

Metrics son aggregated, numeric time-series data (request count, CPU usage). Son cheap de storear y good para alerting. Logs son discrete events con context (error message, request details). Son expensive de storear pero essential para debugging. Traces siguen un single request across service boundaries. Muestran causality y timing entre services. Usa los tres: metrics para alerting, logs para debugging, traces para understanding distributed behavior.

### ¿Cómo prevengo alert fatigue?

Setea alert thresholds basado en user impact, no infrastructure metrics. Alerta en symptoms (high error rate, high latency) no causes (CPU > 80%). Usa severity levels: critical pages on-call, warning manda Slack. Suppress alerts durante known incidents con inhibit rules. Routea alerts al right team. Review alert noise monthly y tunea thresholds. Every alert deberia tener un runbook. Si un alert fires y no action es needed, deletealo.

### ¿Debería usar PagerDuty o Slack para alerts?

Usa PagerDuty (o Opsgenie) para critical alerts que requieren immediate human action — ensures que alguien sea paged y acknowledges. Usa Slack para warning-level alerts y informational notifications. Nunca mandes critical alerts solo a Slack — people puede no verlos por hours. AlertManager puede route a ambos: PagerDuty para critical, Slack para warnings. Configura escalation policies en PagerDuty (primary, secondary, manager).

### ¿Cómo instrumento code para observability?

Usa standard libraries: Prometheus client para metrics, OpenTelemetry SDK para traces, structured JSON logging. Instrumenta at framework level (middleware) para que every request get metrics automaticamente. Add business-specific metrics en handlers. Usa trace spans para database queries, external API calls, y expensive computations. Setea span attributes con relevant context (user ID, request ID, endpoint). Loggea structured events con correlation IDs que link a traces.

## See Also

- [Complete Guide to Observability with the Grafana Stack](/es/guides/complete-guide-observability-grafana-stack/)
- [Alert Management: On-Call Alerting That Works](/es/guides/alert-management-guide/)
- [Log Aggregation — Centralize, Search](/es/guides/log-aggregation-guide/)
- [Observability — Metrics, Logs, and Traces Complete Guide](/es/guides/observability-guide/)
- [Metrics and Dashboards](/es/guides/metrics-and-dashboards-guide/)

