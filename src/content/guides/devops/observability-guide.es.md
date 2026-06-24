---
contentType: guides
slug: observability-guide
title: "Observabilidad — Guia Completa de Metricas, Logs y Traces"
description: "Guia practica de observabilidad: los tres pilares (metricas, logs, traces), implementacion con Prometheus, Grafana, Loki, Tempo/Jaeger, y construccion de alertas basadas en SLO."
metaDescription: "Aprende observabilidad: metricas, logs, traces. Implementa con Prometheus, Grafana, Loki, Jaeger. Construye alertas basadas en SLO para sistemas en produccion."
difficulty: intermediate
topics:
  - devops
  - observability
  - performance
tags:
  - observabilidad
  - metricas
  - logs
  - traces
  - prometheus
  - grafana
  - loki
  - jaeger
  - slo
  - guia
relatedResources:
  - /guides/opentelemetry-guide
  - /guides/sre-practices-guide
  - /guides/service-mesh-guide
  - /recipes/devops/setup-prometheus-grafana
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende observabilidad: metricas, logs, traces. Implementa con Prometheus, Grafana, Loki, Jaeger. Construye alertas basadas en SLO para sistemas en produccion."
  keywords:
    - observabilidad
    - metricas
    - logs
    - traces
    - prometheus
    - grafana
    - slo
    - guia
---

## Overview

La observabilidad es la capacidad de entender el estado interno de un sistema examinando sus salidas. A diferencia del monitoreo, que pregunta "El sistema esta arriba?", la observabilidad pregunta "Por que el sistema se esta comportando asi?". Los tres pilares — metricas, logs y traces — proporcionan vistas complementarias. Las metricas muestran que esta pasando en el tiempo, los logs muestran que dicen los componentes individuales, y los traces muestran como fluyen los requests a traves de sistemas distribuidos. Juntos permiten debuggear unknown-unknowns: problemas que no anticipaste y por los que no instrumentaste.

## When to Use

- Operas sistemas distribuidos donde los fallos son normales y esperados
- El debugging requiere correlacionar comportamiento a traves de multiples servicios
- Necesitas definir y medir Service Level Objectives (SLOs)
- El Mean Time To Recovery (MTTR) debe ser minimizado
- Quieres moverte de firefighting reactivo a planificacion proactiva de capacidad

## Los Tres Pilares

| Pilar | Pregunta que responde | Herramienta ejemplo |
|-------|----------------------|---------------------|
| **Metricas** | Que esta haciendo el sistema? | Prometheus, Datadog, CloudWatch |
| **Logs** | Que dijo un componente especifico? | Loki, ELK, Splunk, CloudWatch Logs |
| **Traces** | A donde fue un request y cuanto tardo? | Jaeger, Tempo, Zipkin, AWS X-Ray |

## Metricas con Prometheus

```yaml
# Config de scrape de Prometheus
scrape_configs:
  - job_name: 'api'
    static_configs:
      - targets: ['api:8080']
    metrics_path: '/metrics'

  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

### Tipos de Metricas Clave

| Tipo | Caso de uso | Ejemplo |
|------|-------------|---------|
| **Counter** | Eventos que solo aumentan | `http_requests_total` |
| **Gauge** | Valores que suben y bajan | `memory_usage_bytes` |
| **Histogram** | Distribuciones de valores | `request_duration_seconds` |
| **Summary** | Cuantiles pre-computados | `request_duration_seconds{quantile="0.99"}` |

## Tracing Distribuido con OpenTelemetry

```python
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

tracer_provider = TracerProvider()
otlp_exporter = OTLPSpanExporter(endpoint="tempo:4317", insecure=True)
tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
trace.set_tracer_provider(tracer_provider)

tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("process_order") as span:
    span.set_attribute("order.id", order_id)
    process_payment()
    update_inventory()
```

## Alertas Basadas en SLO

| Nivel | Definicion | Regla de alerta |
|-------|-----------|---------------|
| **SLI** | Service Level Indicator — que mides | `request_latency < 200ms` |
| **SLO** | Service Level Objective — target en el tiempo | `99.9% de requests < 200ms en 30 dias` |
| **SLA** | Service Level Agreement — contrato con usuarios | `99.9% uptime con penalidad financiera` |

```yaml
# Regla de alerta Prometheus
groups:
  - name: api_slo
    rules:
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.001
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Tasa de error excede 0.1%"
```

## Correlacionando Senales

Usa un `trace_id` compartido para vincular logs, metricas y traces:

```json
{
  "timestamp": "2026-06-25T10:00:00Z",
  "level": "ERROR",
  "message": "Fallo procesamiento de pago",
  "trace_id": "abc123",
  "span_id": "def456",
  "service": "payment-service"
}
```

En Grafana: buscar logs por `trace_id`, saltar al trace correspondiente en Tempo/Jaeger, luego ver el dashboard de metricas para los servicios involucrados.

## Common Mistakes

- **Alertar por sintomas en lugar de SLOs** — "CPU alto" no es actionable; "tasa de error excede SLO" si
- **Sin politica de sampling o retencion de logs** — los logs crecen infinitamente; definir tiers hot/warm/cold
- **Sampling de traces demasiado agresivo** — samplear 100% del trafico puede abrumar backends; usar head-based o tail-based
- **Dashboard sprawl** — demasiados dashboards = nadie los usa. Consolidar en golden signals por servicio.
- **Faltan correlation IDs** — sin trace IDs, debuggear fallos distribuidos es adivinar

## FAQ

**Cual es la diferencia entre monitoreo y observabilidad?**
El monitoreo pregunta cosas conocidas con dashboards predefinidos. La observabilidad permite hacer nuevas preguntas sobre problemas desconocidos explorando telemetria.

**Necesito los tres pilares?**
Comienza con metricas y logs. Agrega traces cuando tengas sistemas distribuidos donde el flujo de requests no es obvio.

**Puedo usar servicios gestionados en lugar de auto-gestionados?**
Si. Datadog, New Relic, Dynatrace y suites de observabilidad nativas de AWS/GCP/Azure son alternativas completamente gestionadas con setup mas rapido pero mayor costo.
