---
contentType: recipes
slug: prometheus-monitoring-alerts
title: "Métricas y Alertas con Prometheus"
description: "Instrumenta aplicaciones e infraestructura con métricas de Prometheus, configura reglas de alertas y recording rules para monitoreo eficiente."
metaDescription: "Instrumenta aplicaciones con métricas de Prometheus. Configura reglas de alertas, recording rules y enrutamiento de Alertmanager para monitorear servicios."
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
  - /recipes/python-prometheus-metrics-exporter
  - /recipes/prometheus-api-monitoring
  - /recipes/grafana-dashboards-observability
  - /recipes/structured-logging
  - /recipes/log-aggregation
  - /recipes/helm-chart-deployment
lastUpdated: "2026-08-19"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Instrumenta aplicaciones con métricas de Prometheus. Configura reglas de alertas, recording rules y enrutamiento de Alertmanager para monitorear servicios."
  keywords:
    - prometheus
    - metricas
    - alerting
    - monitoreo
    - salud servicios
    - promql
---

## Resumen

Prometheus recolecta métricas en series temporales haciendo scraping a endpoints HTTP
que exponen datos en su formato de texto. Instrumentás tus servicios con counters,
gauges, histograms y summaries, luego usás PromQL para consultar los datos y reglas de
alertas para notificar cuando algo se rompe.

Esta receta cubre instrumentación, configuración de scraping, recording rules, reglas
de alertas y enrutamiento de Alertmanager.

## Cuándo Usar

- Necesitás datos numéricos con timestamp sobre el comportamiento de la aplicación e
  infraestructura.
- Querés alertas basadas en síntomas (tasa de errores, latencia) en lugar de causas
  crudas.
- Necesitás queries precomputadas para dashboards o alertas rápidas.
- Querés enrutar alertas por severidad o equipo.

## Cuándo NO Usar

- Para debugging profundo de eventos individuales: usá logs o traces en su lugar.
- Para almacenamiento a largo plazo sin planificar: Prometheus guarda datos localmente
  por default.
- Cuando necesitás un modelo push de métricas: usá Pushgateway solo para jobs de corta
  duración.

## Solución

### Instrumentar métricas de aplicación

```typescript
// metrics/server.ts
import prometheus from 'prom-client';

const register = new prometheus.Registry();
prometheus.collectDefaultMetrics({ register });

const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

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

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Configuración de scraping

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
```

### Reglas de alertas

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

### Recording rules

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

### Enrutamiento de Alertmanager

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

  - name: 'pagerduty'
    pagerduty_configs:
      - routing_key: 'your-routing-key'

  - name: 'slack-warnings'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/...'
        channel: '#warnings'

  - name: 'db-team'
    email_configs:
      - to: 'db-team@example.com'
```

### Exporter personalizado en Python

```python
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time
import random

REQUESTS = Counter('app_requests_total', 'Total requests', ['endpoint', 'method'])
LATENCY = Histogram('app_request_duration_seconds', 'Request latency', ['endpoint'])
ACTIVE_CONNECTIONS = Gauge('app_active_connections', 'Active connections')

def handle_request(endpoint, method):
    start = time.time()
    REQUESTS.labels(endpoint=endpoint, method=method).inc()
    time.sleep(random.uniform(0.01, 0.5))
    LATENCY.labels(endpoint=endpoint).observe(time.time() - start)

if __name__ == '__main__':
    start_http_server(9090)
    while True:
        handle_request('/api/users', 'GET')
        ACTIVE_CONNECTIONS.set(random.randint(1, 100))
        time.sleep(0.1)
```

## Explicación

- **Counter**: solo aumenta. Usalo para requests, errores o tareas completadas.
- **Gauge**: sube y baja. Usalo para memoria, conexiones o profundidad de cola.
- **Histogram**: agrupa observaciones en buckets. Usalo para latencia o tamaño de
  respuesta.
- **Summary**: similar a un histogram, pero calcula quantiles del lado del cliente.
- **Recording rules**: precomputan queries caras de PromQL para que los dashboards
  carguen más rápido.
- **Alerting rules**: evalúan expresiones de PromQL y envían alertas a Alertmanager.
- **Alertmanager**: agrupa, silencia y enruta alertas al receptor correcto.

## Variantes

|Tipo de exporter|Cuándo usarlo|
|----------------|-------------|
|Librería in-app|Control total de labels y métricas de negocio|
|Node exporter|Métricas de hardware y SO para Linux/Unix|
|Blackbox exporter|Sondear endpoints desde afuera|
|Pushgateway|Jobs por lotes de corta duración que no pueden ser scrapeados|

## Buenas Prácticas

- Alertá por síntomas (alta tasa de errores, latencia) en lugar de causas (uso de CPU).
- Mantené la cardinalidad de labels baja; valores ilimitados como user IDs explotan el
  almacenamiento.
- Seteá una duración `for` apropiada para evitar alertas intermitentes.
- Usá recording rules para queries que corren frecuentemente en dashboards.
- Enrutá alertas críticas a paging y las de warning a chat.
- Mantené corta la retención local; usá Thanos o Cortex para almacenamiento a largo
  plazo.
- Scrapeá solo lo que necesitás; `scrape_interval` puede variar de 15s a varios
  minutos.

## Errores Comunes

- Usar labels de alta cardinalidad como user IDs o session IDs.
- Alertar por causas en lugar de síntomas.
- No agrupar alertas, lo que inunda al canal de on-call.
- Olvidar setear `for`, así cada parpadeo despierta al equipo.
- Repetir alertas sensibles sin un `repeat_interval`.
- Consultar métricas crudas en dashboards en lugar de recording rules.

## Preguntas Frecuentes

### ¿En qué se diferencian las métricas de los logs?

Las métricas son agregados numéricos en el tiempo, ideales para tendencias y
umbrales. Los logs son eventos discretos, mejores para debuggear incidentes
específicos.

### ¿Puedo usar Prometheus sin Kubernetes?

Sí. Prometheus corre como un binario standalone y puede hacer scraping a cualquier
endpoint HTTP que exponga métricas.

### ¿Cuál es la diferencia entre histogram y summary?

Un histogram agrupa observaciones en buckets en el servidor y se puede agregar entre
instancias. Un summary calcula quantiles del lado del cliente y no se puede promediar
entre instancias.

### ¿Cuándo debería usar Pushgateway?

Solo para jobs por lotes de corta duración que terminan antes de que Prometheus pueda
hacer scraping. No lo uses para servicios de larga duración.

### ¿Cómo elijo la duración del `for`?

Setealo lo suficientemente largo para evitar ruido, pero lo suficientemente corto para
que importe. Dos a cinco minutos es un punto de partida común.

### ¿Qué códigos de estado deberían disparar alertas?

Alertá por tasas sostenidas de errores (5xx) o latencia, no por un solo request
fallido.
