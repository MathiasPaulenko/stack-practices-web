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
  - ci-cd
relatedResources:
  - /recipes/helm-chart-deployment
  - /patterns/ambassador-pattern-services
  - /guides/logging-monitoring-observability-guide
  - /recipes/python-prometheus-metrics-exporter
  - /recipes/grafana-dashboards-observability
  - /recipes/distributed-tracing
  - /recipes/log-aggregation
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

- Necesitas datos cuantitativos sobre comportamiento de aplicacion e infraestructura. Consulta [Structured Logging](/recipes/observability/structured-logging) para datos de eventos correlacionados.
- El alerting deberia dispararse en sintomas, no solo en fallos de infraestructura. Consulta [Health Check Endpoint](/recipes/devops/health-check-endpoint) para detección de síntomas.
- Se requieren metricas historicas para capacity planning y debugging. Consulta [Load Testing](/recipes/testing/load-testing) para medición de líneas base de capacidad.

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

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Recording Rules para Rendimiento

```yaml
# rules/recording_rules.yml
groups:
  - name: http_metrics
    interval: 30s
    rules:
      - record: job:http_request_rate:5m
        expr: sum by(job) (rate(http_requests_total[5m]))

      - record: job:http_error_rate:5m
        expr: sum by(job) (rate(http_requests_total{status=~"5.."}[5m]))

      - record: job:http_p99_latency:5m
        expr: histogram_quantile(0.99, sum by(job, le) (rate(http_request_duration_seconds_bucket[5m])))

      - record: instance:memory_usage:ratio
        expr: |
          (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
          / node_memory_MemTotal_bytes
```

### Alerting Rules con Severidad

```yaml
# rules/alerting_rules.yml
groups:
  - name: service_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          job:http_error_rate:5m / job:http_request_rate:5m > 0.05
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "High error rate on {{ $labels.job }}"
          description: "{{ $labels.job }} has 5%+ error rate for 5 minutes"

      - alert: HighLatency
        expr: job:http_p99_latency:5m > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "p99 latency above 2s on {{ $labels.job }}"

      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[5m]) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Pod {{ $labels.pod }} is crash-looping"

      - alert: DiskSpaceLow
        expr: |
          (node_filesystem_avail_bytes{mountpoint="/"}
            / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 10
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Disk space below 10% on {{ $labels.instance }}"
```

### Alertmanager Routing

```yaml
# alertmanager.yml
route:
  receiver: default
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - matchers:
        - severity="critical"
      receiver: pagerduty
      group_wait: 10s
      repeat_interval: 1h

    - matchers:
        - severity="warning"
      receiver: slack
      group_wait: 5m

    - matchers:
        - team="database"
      receiver: db-team

receivers:
  - name: default
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/...'
        channel: '#alerts'

  - name: pagerduty
    pagerduty_configs:
      - routing_key: 'your-routing-key'
        severity: critical

  - name: slack
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/...'
        channel: '#warnings'

  - name: db-team
    email_configs:
      - to: 'db-team@example.com'
```

### Exporter Custom (Python)

```python
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time
import random

# Definir métricas
REQUESTS = Counter('app_requests_total', 'Total requests', ['endpoint', 'method'])
LATENCY = Histogram('app_request_duration_seconds', 'Request latency', ['endpoint'])
ACTIVE_CONNECTIONS = Gauge('app_active_connections', 'Active connections')

def handle_request(endpoint, method):
    start = time.time()
    REQUESTS.labels(endpoint=endpoint, method=method).inc()
    # Simular trabajo
    time.sleep(random.uniform(0.01, 0.5))
    LATENCY.labels(endpoint=endpoint).observe(time.time() - start)

if __name__ == '__main__':
    start_http_server(9090)
    while True:
        handle_request('/api/users', 'GET')
        ACTIVE_CONNECTIONS.set(random.randint(1, 100))
        time.sleep(0.1)
```

## Mejores Prácticas Adicionales

1. **Usa recording rules para dashboards.** Precomputa queries caras para acelerar Grafana:

```yaml
# Precomputar en lugar de calcular en tiempo de query
- record: job:http_p99:5m
  expr: histogram_quantile(0.99, sum by(job, le)(rate(http_request_duration_seconds_bucket[5m])))
```

1. **Setea duraciones `for` sabiamente.** Muy corto causa flapping; muy largo retrasa alerts:

```yaml
# Critical: 2-5 minutos
for: 2m

# Warning: 10-15 minutos
for: 10m

# Info: 30+ minutos
for: 30m
```

1. **Usa `keep_firing_for` para prevenir gaps de alerts.** Mantiene alerts firing durante delays de evaluación:

```yaml
- alert: HighErrorRate
  expr: ...
  for: 5m
  keep_firing_for: 1m
```

## Errores Comunes Adicionales

1. **Usar `rate()` con ventana muy corta.** `rate(metric[30s])` es ruidoso; usa al menos 5 minutos:

```promql
# Mal: ruidoso, alta varianza
rate(http_requests_total[30s])

# Bien: estable, significativo
rate(http_requests_total[5m])
```

1. **No usar `histogram_quantile` correctamente.** Debe agregar por label `le`:

```promql
# Mal: falta agregación por le
histogram_quantile(0.99, rate(http_duration_bucket[5m]))

# Bien: agregar por le
histogram_quantile(0.99, sum by(le)(rate(http_duration_bucket[5m])))
```

## FAQ Adicional

### ¿Cómo reduzco el uso de storage de Prometheus?

1. Reducir período de retención (default 15 días)
2. Bajar frecuencia de scrape para servicios no críticos
3. Usar recording rules en lugar de queries complejas
4. Limitar cardinalidad de labels

```yaml
# prometheus.yml
storage:
  retention: 15d
  tsdb:
    max_block_duration: 2h
```

### ¿Cómo envío alerts a múltiples canales?

Configura Alertmanager con múltiples receivers y routes:

```yaml
route:
  routes:
    - matchers: ['severity="critical"']
      receiver: pagerduty
    - matchers: ['severity="warning"']
      receiver: slack
```

### ¿Cuál es la diferencia entre `rate` e `irate`?

`rate` computa el promedio por segundo de incremento en un rango. `irate` computa el incremento por segundo usando solo los últimos dos samples. Usa `irate` para métricas volátiles en dashboards; usa `rate` para alerting.

## Tips de Rendimiento

1. **Usa recording rules para queries frecuentes.** Precomputa una vez, consulta muchas veces:

```yaml
# Computar una vez cada 30s
- record: job:cpu_usage:5m
  expr: 100 - avg by(job)(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100
```

1. **Limita targets de scrape.** Demasiados targets ralentizan Prometheus:

```yaml
# Solo scrapear lo que necesitas
scrape_configs:
  - job_name: 'critical-services'
    scrape_interval: 15s
    static_configs:
      - targets: ['app1:9090', 'app2:9090']  # No cada pod
```

1. **Usa `scrape_interval` sabiamente.** 15s para críticos, 60s para no críticos:

```yaml
scrape_configs:
  - job_name: 'critical'
    scrape_interval: 15s
  - job_name: 'batch'
    scrape_interval: 60s
```

1. **Usa Thanos para storage a largo plazo.** No guardes todo en Prometheus local:

```yaml
# Config del sidecar de Thanos
--objstore.config-file=thanos-bucket.yaml
--tsdb.path=/prometheus/data
```
