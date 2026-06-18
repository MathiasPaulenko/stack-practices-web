---
contentType: recipes
slug: prometheus-monitoring-alerts
title: "Metricas y Alertas con Prometheus"
description: "Instrumenta aplicaciones e infraestructura con metricas Prometheus, configura reglas de alerting y recording rules para monitoreo eficiente de salud de servicios"
metaDescription: "Instrumenta aplicaciones con metricas Prometheus. Configura reglas de alerting y recording rules para monitoreo eficiente de salud de servicios e infraestructura."
difficulty: intermediate
topics:
  - devops
  - observability
tags:
  - prometheus
  - monitoring
  - devops
  - observability
relatedResources:
  - /recipes/devops/helm-chart-deployment
  - /patterns/design/ambassador-pattern-services
  - /guides/logging-monitoring-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Instrumenta aplicaciones con metricas Prometheus. Configura reglas de alerting y recording rules para monitoreo eficiente de salud de servicios e infraestructura."
  keywords:
    - prometheus
    - metrics
    - alerting
    - monitoring
    - service health
---

# Metricas y Alertas con Prometheus

Instrumenta servicios e infraestructura con metricas Prometheus para obtener visibilidad en tiempo real de rendimiento y salud. Esta recipe cubre metricas counter, gauge, histogram y summary, queries PromQL, reglas de alerting y recording rules para monitoreo de produccion.

## Cuando Usar Esto

- Necesitas datos cuantitativos sobre comportamiento de aplicacion e infraestructura
- El alerting deberia dispararse en sintomas, no solo en fallos de infraestructura
- Se requieren metricas historicas para capacity planning y debugging

## Solucion

### 1. Instrumentar Metricas de Aplicacion

```typescript
// metrics/server.ts
import prometheus from 'prom-client';

const register = new prometheus.Registry();
prometheus.collectDefaultMetrics({ register });

// Counter: solo incrementa (requests, errores)
const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Gauge: sube y baja (memoria, conexiones)
const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

// Histogram: buckets de duracion de requests
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// Middleware para registrar metricas
function metricsMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || 'unknown',
      status_code: res.statusCode,
    });
    httpRequestDuration.observe(
      { method: req.method, route: req.route?.path || 'unknown' },
      duration
    );
  });
  next();
}

// Exponer endpoint de metricas
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 2. Configuracion de Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'api'
    static_configs:
      - targets: ['api:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

### 3. Reglas de Alerting

```yaml
# rules/alerts.yml
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status_code=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on {{ $labels.route }}"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: SlowRequests
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route)
          ) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow requests on {{ $labels.route }}"
```

### 4. Recording Rules para Eficiencia

```yaml
# rules/records.yml
groups:
  - name: api_records
    rules:
      - record: job:http_requests_total:rate5m
        expr: sum(rate(http_requests_total[5m])) by (job)

      - record: job:http_request_duration:p95
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (job, le)
          )
```

### 5. Configuracion de Alertmanager

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alerts@example.com'

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'

receivers:
  - name: 'default'
    email_configs:
      - to: 'oncall@example.com'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/...'
        channel: '#alerts'
```

## Como Funciona

- **Counters** trackean eventos acumulativos como requests y errores
- **Gauges** trackean valores que fluctuan como memoria y queue depth
- **Histograms** bucketizan observaciones para distribuciones de latencia y tamano
- **Recording rules** precomputan queries caras para dashboards mas rapidos
- **Alerting rules** evaluan expresiones y disparan alerts a Alertmanager

## Consideraciones de Produccion

- Usa remote storage (Thanos, Cortex) para retencion a largo plazo y HA
- Manten cardinalidad baja limitando valores de labels; cardinalidad alta degrada rendimiento
- Setea duraciones `for` apropiadas para prevenir alerts flapping

## Errores Comunes

- Usar labels con valores unbounded como user IDs o session IDs
- Alertar en causas (CPU usage) en lugar de sintomas (requests lentos)
- No agrupar alerts, causando alert fatigue por fallos individuales

## FAQ

**P: En que se diferencia de logs?**
R: Las metricas son agregados numericos sobre tiempo, ideales para tendencias y thresholds. Los logs son eventos discretos, mejores para debugging de incidentes especificos.

**P: Puedo usar Prometheus sin Kubernetes?**
R: Si. Prometheus corre como binario standalone y puede scrapear cualquier endpoint HTTP que exponga metricas.
