---
contentType: guides
slug: monitoring-alerting-guide
title: "Monitoreo y Alertas — Métricas, Logs y Dashboards"
description: "Guía práctica de observabilidad: los tres pilares (métricas, logs, traces), métodos RED y USE, diseño de alertas, y dashboards que realmente ayudan."
metaDescription: "Guía de monitoreo y alertas: métodos RED/USE, métricas, logs, traces, diseño de alertas. Construye sistemas de observabilidad que reducen MTTR y previenen fatiga."
difficulty: intermediate
topics:
  - devops
tags:
  - alertas
  - devops
  - guia
  - logs
  - metricas
  - monitoreo
  - observabilidad
  - traces
relatedResources:
  - /guides/devops/on-call-incident-response-guide
  - /guides/devops/docker-for-developers-guide
  - /guides/devops/cicd-pipeline-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Guía de monitoreo y alertas: métodos RED/USE, métricas, logs, traces, diseño de alertas. Construye sistemas de observabilidad que reducen MTTR y previenen fatiga."
  keywords:
    - monitoreo y alertas
    - observabilidad metricas logs traces
    - metodo red use
    - diseno alertas lo que funciona
    - reducir fatiga alertas
---

# Monitoreo y Alertas — Métricas, Logs y Dashboards

## Introducción

No puedes mejorar lo que no puedes medir. El monitoreo te dice cuándo los sistemas están enfermos; las alertas te despiertan cuando la acción es necesaria. Pero alertas mal diseñadas crean fatiga, burnout y páginas ignoradas. Esta guía cubre los tres pilares de observabilidad, cómo diseñar alertas útiles y cómo construir dashboards que ayudan durante incidentes.

## Los Tres Pilares de la Observabilidad

| Pilar | Qué Responde | Herramientas Ejemplo |
|-------|-------------|---------------------|
| **Métricas** | ¿Qué está haciendo el sistema en el tiempo? | Prometheus, Datadog, CloudWatch |
| **Logs** | ¿Qué pasó en detalle? | ELK, Loki, Splunk |
| **Traces** | ¿A dónde fue la solicitud y cuánto duró cada paso? | Jaeger, Zipkin, OpenTelemetry |

### Métricas

Datos de series de tiempo sobre salud del sistema. Baratos de almacenar, rápidos de consultar.

```python
from prometheus_client import Counter, Histogram

request_count = Counter('http_requests_total', 'Total requests', ['method', 'endpoint'])
request_latency = Histogram('http_request_duration_seconds', 'Request latency', ['endpoint'])
```

### Logs

Registros de eventos discretos.

```json
{
  "timestamp": "2024-06-12T10:23:45Z",
  "level": "error",
  "service": "payment-api",
  "trace_id": "abc-123",
  "message": "Payment processor returned 503"
}
```

**Regla:** Usa logs estructurados (JSON) en producción. Son parseables, buscables y se correlacionan con traces.

### Traces

Sigue una solicitud individual a través de servicios. Consulta [Distributed Tracing](/recipes/observability/distributed-tracing) para implementación.

```
[Gateway] 2ms → [Auth] 15ms → [Orders] 45ms → [DB] 30ms → [Payment] 120ms
```

## Método RED (para Servicios)

| Métrica | Pregunta | Umbral Ejemplo |
|---------|----------|---------------|
| **Rate** | ¿Cuántos requests por segundo? | Línea base: 1000 req/s |
| **Errors** | ¿Qué porcentaje de requests falla? | Alertar si > 0.1% por 2 minutos |
| **Duration** | ¿Cuánto tardan los requests? | Alertar si p99 > 500ms por 5 minutos |

## Método USE (para Recursos)

| Métrica | Pregunta | Umbral Ejemplo |
|---------|----------|---------------|
| **Utilization** | ¿Qué tan ocupado está el recurso? | CPU > 80% |
| **Saturation** | ¿Cuánto trabajo está encolado? | Profundidad de cola de disco > 10 |
| **Errors** | ¿Cuántos errores ocurrieron? | Drops de paquetes de red > 0.1% |

## Diseño de Alertas

### Buenas Alertas Son Útiles

Responden tres preguntas:
1. **¿Qué está mal?** — nombre claro de métrica y umbral violado
2. **¿Dónde está mal?** — nombre de servicio, región, ambiente
3. **¿Qué debería hacer?** — link a [runbook](/guides/devops/technical-documentation-strategy-guide) o acción sugerida

### Severidad de Alertas

| Severidad | Tiempo de Respuesta | Acción |
|-----------|-------------------|--------|
| **Page** (Crítica) | 5 minutos | Despertar a alguien |
| **Ticket** (Advertencia) | 4 horas | Crear ticket para horario laboral |
| **Log** (Info) | Ninguno | Registrar para dashboards y análisis |

**Regla:** Si una alerta suena y nadie toma acción, degrádala a ticket o log.

## Diseño de Dashboards

### La Regla de 5 Segundos

Un dashboard debería decirte si el sistema está saludable en 5 segundos.

| Fila | Propósito | Paneles Ejemplo |
|-----|-----------|----------------|
| **Fila 1: Salud** | ¿El sistema está arriba? | Tasa de error, SLA de disponibilidad, throughput |
| **Fila 2: Latencia** | ¿Somos suficientemente rápidos? | p50, p95, p99 latencia por endpoint |
| **Fila 3: Recursos** | ¿Nos estamos quedando sin capacidad? | CPU, memoria, disco, red |
| **Fila 4: Negocio** | ¿Los usuarios están felices? | Registros, checkouts, sesiones activas |

## Lo que funciona

- Instrumenta antes de necesitarlo — agregar métricas durante un [incidente](/guides/devops/on-call-incident-response-guide) es demasiado tarde
- Usa percentiles, no promedios — los promedios ocultan outliers; p95 y p99 cuentan la historia real
- IDs de correlación en todas partes — vincula logs, métricas y traces a un request ID único
- Alerta sobre síntomas, no causas — "usuarios no pueden hacer checkout" es mejor que "CPU está alta"
- Revisa alertas trimestralmente — elimina ruido, ajusta umbrales, consolida duplicados

## Errores Comunes

- Alertar sobre cada posible modo de fallo — la fatiga de alertas mata la calidad de [respuesta](/guides/devops/on-call-incident-response-guide)
- No tener una métrica "canary" — despliega un cambio y observa una sola métrica dorada
- Ignorar cambios de línea base — si p99 se desplaza de 100ms a 300ms en un mes, investiga
- Dashboards sin dueños — alguien debe poseer y mantener cada dashboard

## Preguntas Frecuentes

### ¿Debería construir mi propio monitoreo o comprar SaaS?

Compra hasta que sea un diferenciador estratégico. Prometheus + Grafana es gratis pero requiere expertise. Datadog/New Relic cuestan dinero pero funcionan inmediatamente.

### ¿Cuál es la diferencia entre monitoreo y observabilidad?

El monitoreo hace preguntas conocidas ("¿CPU está alta?"). La observabilidad permite hacer preguntas desconocidas ("¿Por qué este usuario experimenta 5 segundos de latencia?"). El monitoreo es un subconjunto de la observabilidad.

### ¿Cuántas alertas debería tener un servicio?

3-5 alertas críticas (pages), 5-10 advertencias (tickets), información ilimitada (logs/dashboards). Más de 10 alertas críticas significa que estás alertando sobre síntomas, no impacto al usuario.


## Temas Avanzados

### Escenario: Sistema de Alertas para E-commerce

```yaml
# Prometheus alerting rules
groups:
  - name: payment-service
    rules:
      # SLO: tasa de error > 1% durante 5 min
      - alert: PaymentErrorRateHigh
        expr: |
          sum(rate(http_requests_total{job="payment",status=~"5.."}[5m]))
          / sum(rate(http_requests_total{job="payment"}[5m]))
          > 0.01
        for: 5m
        labels:
          severity: page
          team: payments
        annotations:
          summary: "Payment error rate > 1%"
          description: "Error rate is {{ $value | humanizePercentage }}"
          runbook: "https://wiki/runbooks/payment-errors"

      # SLO: latencia p99 > 500ms durante 10 min
      - alert: PaymentLatencyHigh
        expr: |
          histogram_quantile(0.99,
            rate(http_duration_bucket{job="payment"}[10m]))
          > 0.5
        for: 10m
        labels:
          severity: page
          team: payments
        annotations:
          summary: "Payment p99 latency > 500ms"
          runbook: "https://wiki/runbooks/payment-latency"

      # SLO burn rate: 14x en 1h
      - alert: PaymentSLOBurnRate
        expr: |
          (
            sum(rate(http_requests_total{job="payment",status=~"5.."}[1h]))
            / sum(rate(http_requests_total{job="payment"}[1h]))
          ) > 14 * 0.001
        for: 5m
        labels:
          severity: page
        annotations:
          summary: "Payment SLO burn rate > 14x"

      # Warning: throughput anormal
      - alert: PaymentThroughputAnomaly
        expr: |
          rate(http_requests_total{job="payment"}[5m])
          < 100
        for: 10m
        labels:
          severity: ticket
        annotations:
          summary: "Payment throughput < 100 req/s"

  - name: infrastructure
    rules:
      # Disco: > 85% en 30 min
      - alert: DiskSpaceLow
        expr: |
          (1 - node_filesystem_avail_bytes
           / node_filesystem_size_bytes) > 0.85
        for: 30m
        labels:
          severity: ticket
        annotations:
          summary: "Disk > 85% on {{ $labels.instance }}"

      # Memoria: OOM inminente
      - alert: MemoryExhausted
        expr: |
          (1 - node_memory_MemAvailable_bytes
           / node_memory_MemTotal_bytes) > 0.95
        for: 5m
        labels:
          severity: page
        annotations:
          summary: "Memory > 95% on {{ $labels.instance }}"

# Alertmanager routing
route:
  receiver: default
  group_by: [alertname, team]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - matchers: [severity="page"]
      receiver: pagerduty
      group_wait: 0s
    - matchers: [severity="ticket"]
      receiver: jira
      group_wait: 10m

receivers:
  - name: pagerduty
    pagerduty_configs:
      - service_key: $PAGERDUTY_KEY
  - name: jira
    webhook_configs:
      - url: "https://jira.example.com/alerts"
  - name: default
    slack_configs:
      - channel: "#alerts"
```

### Como elimino alert fatigue?

1. Audita alertas cada trimestre: elimina las que nunca disparan o siempre disparan. 2. Usa severity levels: page solo para impacto en usuarios. 3. Agrupa alertas relacionadas (Alertmanager group_by). 4. Configura repeat_interval para no re-notificar. 5. Cada alerta debe tener un runbook. 6. Mide el numero de alertas por on-call shift: > 5/noche es excesivo.
























End of document. Review and update quarterly.