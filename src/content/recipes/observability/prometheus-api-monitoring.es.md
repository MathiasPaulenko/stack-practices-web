---
contentType: recipes
slug: prometheus-api-monitoring
title: "Monitoreo de APIs con Prometheus"
description: "Monitorea rendimiento y salud de APIs con métricas Prometheus, collectors personalizados y reglas de alertamiento."
metaDescription: "Configura monitoreo Prometheus para APIs REST y gRPC con métricas personalizadas, collectors, reglas de alertamiento y dashboards de Grafana."
difficulty: intermediate
topics:
  - observability
tags:
  - prometheus
  - observability
  - api
  - devops
relatedResources:
  - /recipes/prometheus-monitoring-alerts
  - /recipes/grafana-dashboards-observability
  - /docs/api-status-page-template
  - /guides/logging-monitoring-observability-guide
  - /guides/monitoring-alerting-guide
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Configura monitoreo Prometheus para APIs REST y gRPC con métricas personalizadas, collectors, reglas de alertamiento y dashboards de Grafana."
  keywords:
    - prometheus
    - observability
    - api
    - devops
---
## Visión General

Prometheus es el estándar de facto para recolección de métricas en entornos cloud-native. Al instrumentar tu API con contadores, histograms y gauges personalizados, ganas visibilidad en tiempo real sobre latencia de requests, tasas de error, throughput y métricas de nivel de negocio.

## Cuándo Usar

Usa este recurso cuando:
- Configuras monitoreo para APIs REST o gRPC
- Definies SLOs y SLIs para microservicios
- Creas dashboards de Grafana para salud de API
- Alertas sobre picos de latencia p99 o tasas de error

## Solución

### Instrumentación con Cliente Prometheus (Node.js)

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

### Reglas de Alertamiento

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

## Explicación

Prometheus sigue un modelo de pull:

1. **Instrumentación**: Tu aplicación expone un endpoint /metrics
2. **Scraping**: El servidor de Prometheus hace polling a este endpoint periódicamente (default 15s)
3. **Almacenamiento**: Los datos de series temporales se almacenan localmente con compresión
4. **Consulta**: Queries PromQL agregan métricas en tiempo real
5. **Alertamiento**: Alertmanager enruta alertas a Slack, PagerDuty, email

**Tipos de métricas**:
- **Counter**: Incrementa monotónicamente (requests, errores)
- **Histogram**: Observaciones en buckets + suma + conteo (latencia)
- **Gauge**: Puede subir o bajar (conexiones, profundidad de cola)
- **Summary**: Cuantiles pre-calculados (usa histograms en su lugar cuando sea posible)

## Variantes

| Lenguaje | Librería | Notas |
|----------|----------|-------|
| Node.js | prom-client | Más popular; registro built-in |
| Go | prometheus/client_golang | Oficial; mejor performance |
| Python | prometheus_client | Middleware Flask/Django disponible |
| Java | Micrometer | Integración Spring Boot |
| Rust | prometheus | Compatible con async |

## Mejores Prácticas

- **Usa labels con moderación**: Alta cardinalidad (combinaciones únicas de labels) degrada performance
- **Prefiere histograms sobre summaries**: Los histograms permiten agregación across instances
- **Instrumenta métricas de negocio**: No solo métricas técnicas (registros, revenue por endpoint)
- **Ajusta retención sabiamente**: Default 15 días; incrementa para tendencias a largo plazo
- **Ejecuta Prometheus en modo HA**: Usa Thanos o Cortex para agregación multi-cluster

## Errores Comunes

1. **Alta cardinalidad de labels**: IDs de usuario o sesión como labels crashean Prometheus
2. **Faltar sufijos de unidades**: Usa _seconds, _bytes, _total según convenciones de nombrado
3. **No instrumentar fallos**: Solo trackear éxitos enmascara detección de outage
4. **Demasiados buckets**: 100+ buckets de histogram desperdicia almacenamiento y CPU
5. **Ignorar errores de scraping**: Errores del endpoint /metrics significan puntos ciegos

## Preguntas Frecuentes

**P: ¿Cuánta memoria necesita Prometheus?**
R: ~1-3KB por serie temporal. Una API típica con 100 endpoints y 5 labels necesita 2-4GB RAM.

**P: ¿Puede Prometheus manejar datos de logs?**
R: No. Usa Loki para logs, Jaeger para trazas, y Prometheus para métricas. El stack de Grafana los unifica.

**P: ¿Cuál es la diferencia entre histogram y summary?**
R: Los histograms agrupan datos y permiten agregación. Los summaries precalculan cuantiles pero no pueden agregarse across instances.
