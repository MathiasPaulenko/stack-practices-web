---
contentType: recipes
slug: prometheus-api-monitoring
title: "Monitoreo de APIs con Prometheus"
description: "Monitorea rendimiento y salud de APIs con métricas Prometheus, collectors personalizados y reglas de alertamiento."
metaDescription: "Configura monitoreo Prometheus para APIs REST y gRPC con métricas personalizadas, collectors, reglas de alertamiento y dashboards de Grafana."
difficulty: intermediate
topics:
  - observability
  - api
tags:
  - prometheus
  - observability
  - api
  - devops
  - monitoring
  - metrics
relatedResources:
  - /recipes/prometheus-monitoring-alerts
  - /recipes/grafana-dashboards-observability
  - /docs/api-status-page-template
  - /guides/logging-monitoring-observability-guide
  - /guides/monitoring-alerting-guide
  - /recipes/distributed-tracing
lastUpdated: "2026-08-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Configura monitoreo Prometheus para APIs REST y gRPC con métricas personalizadas, collectors, reglas de alertamiento y dashboards de Grafana."
  keywords:
    - prometheus
    - observability
    - api-monitoring
    - metrics
    - alerting
    - devops
---

## Visión General

Si estás corriendo contenedores o Kubernetes, Prometheus es la herramienta de
métricas a la que la mayoría de los equipos recurre primero. Instrumentá tu API
con contadores, histogramas y gauges para ver latencia, tasas de error,
throughput y métricas de negocio en tiempo real.

## Cuándo Usar

- Configurás monitoreo para APIs REST o gRPC.
- Definís SLOs y SLIs para microservicios.
- Creás dashboards de [Grafana](/recipes/grafana-dashboards-observability/) para salud de API.
- Alertás sobre picos de latencia p99 o tasas de error.
- Trackeás métricas de negocio como registros o revenue por endpoint.

### Cuándo evitarlo

- Ya usás un APM administrado que cubre tus necesidades sin setup extra.
- El tráfico es tan bajo que la cardinalidad de métricas no justifica el
  overhead.
- Necesitás trazas distribuidas primero. Empezá con [distributed
  tracing](/recipes/distributed-tracing/) en ese caso.

## Solución

### Instrumentación con cliente Prometheus (Node.js)

```javascript
const client = require('prom-client');

// Counter: requests totales
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Número total de requests HTTP',
  labelNames: ['method', 'route', 'status_code']
});

// Histogram: duración de requests
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de requests HTTP en segundos',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// Gauge: conexiones activas
const activeConnections = new client.Gauge({
  name: 'http_active_connections',
  help: 'Número de conexiones HTTP activas'
});

// Middleware
app.use((req, res, next) => {
  activeConnections.inc();
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || 'unknown' });
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || 'unknown',
      status_code: res.statusCode
    });
    activeConnections.dec();
  });

  next();
});
```

### Reglas de alertamiento

```yaml
# prometheus-alerts.yml
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Tasa de error alta detectada"

      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
```

### Queries PromQL para dashboards

```text
# Requests por segundo
rate(http_requests_total[5m])

# Latencia p99
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Tasa de error
rate(http_requests_total{status_code=~"5.."}[5m])
```

## Explicación

Prometheus sigue un modelo de pull. Tu aplicación expone un endpoint
`/metrics`; el servidor de Prometheus hace scraping periódicamente (default 15
segundos). Las series temporales se almacenan localmente y se consultan con
PromQL. Alertmanager enruta las alertas activas a Slack, PagerDuty o email.

**Tipos de métricas**:

| Tipo | Uso | Ejemplo |
| --- | --- | --- |
| **Counter** | Valores que crecen monotónicamente | `http_requests_total` |
| **Histogram** | Observaciones en buckets, suma y conteo | `http_request_duration_seconds` |
| **Gauge** | Valores que suben o bajan | `http_active_connections` |
| **Summary** | Cuantiles pre-calculados | Preferí histograms para agregación |

Los histogramas suelen ser mejores que los summaries porque podés agregarlos
entre instancias. Los summaries no se pueden agregar.

## Variantes

| Lenguaje | Librería | Notas |
| --- | --- | --- |
| Node.js | prom-client | Registro built-in; funciona con Express, Fastify |
| Go | prometheus/client_golang | Cliente oficial; mejor performance |
| Python | prometheus_client | Middleware para Flask/Django disponible |
| Java | Micrometer | Integración con Spring Boot |
| Rust | prometheus | Compatible con async |

## Mejores Prácticas

- Usá labels con moderación. La alta cardinalidad degrada el performance de
  Prometheus.
- Preferí histograms sobre summaries para latencia.
- Nombrá métricas con unidades: `_seconds`, `_bytes`, `_total`.
- Instrumentá fallos, no solo éxitos.
- Mantené los buckets del histogram enfocados. Pocos buckets son suficientes.
- Hacé scraping de `/metrics` por un puerto o ruta interna separada cuando sea
  posible.
- Empezá con la retención default de 15 días y ajustala cuando conozcas tus
  necesidades reales de storage.

## Errores Comunes

- Labels de alta cardinalidad como IDs de usuario o sesión.
- Faltar sufijos de unidad en los nombres de métricas.
- No trackear requests fallidos.
- Demasiados buckets en el histogram.
- Ignorar errores de scraping en el endpoint `/metrics`.
- Mezclar métricas de negocio e infraestructura en la misma instancia sin
  planificar retenciones distintas.

## FAQ

### ¿Cuánta memoria necesita Prometheus?

Aproximadamente 1–3 KB por serie temporal activa. Una API con 100 endpoints y
pocos labels suele entrar en 2–4 GB de RAM.

### ¿Puede Prometheus manejar logs y trazas?

No. Usá Prometheus para métricas, Loki para logs y Jaeger para trazas. Grafana
puede unificar los tres en un solo dashboard.

### ¿Cuál es la diferencia entre histogram y summary?

Los histograms agrupan datos y permiten agregación entre instancias. Los
summaries precalculan cuantiles pero no se pueden agregar.

### ¿Cómo reduzco los costos de storage de Prometheus?

Usá retención de 15–30 días para Prometheus local, recording rules para
consultas frecuentes, y Thanos o Cortex para almacenamiento a largo plazo.
Limitá labels de alta cardinalidad y remové métricas no usadas.

### ¿Puedo usar Prometheus para métricas de negocio?

Sí, pero poné esas métricas en una instancia o namespace separado. Suelen tener
más cardinalidad y distintas necesidades de retención.

### ¿Cómo pruebo reglas de alerta antes de desplegar?

Usá `promtool test rules` con un archivo de test que defina series de entrada y
las alertas esperadas. Así detectás PromQL roto y umbrales incorrectos sin
esperar un incidente en producción.
