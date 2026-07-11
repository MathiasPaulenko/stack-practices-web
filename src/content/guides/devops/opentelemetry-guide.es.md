---
contentType: guides
slug: opentelemetry-guide
title: "OpenTelemetry — Guia de Implementacion para Metricas, Logs y Traces"
description: "Guia practica de OpenTelemetry: instrumentacion, collectors, exporters, y conectar OTLP a backends como Jaeger, Prometheus y Grafana."
metaDescription: "Aprende OpenTelemetry: instrumentacion, collectors, exporters OTLP. Conecta traces, metricas y logs a Jaeger, Prometheus y Grafana."
difficulty: intermediate
topics:
  - devops
  - observability
tags:
  - opentelemetry
  - otel
  - tracing
  - metricas
  - logs
  - collector
  - instrumentacion
  - guia
relatedResources:
  - /guides/observability-guide
  - /guides/service-mesh-guide
  - /guides/sre-practices-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende OpenTelemetry: instrumentacion, collectors, exporters OTLP. Conecta traces, metricas y logs a Jaeger, Prometheus y Grafana."
  keywords:
    - opentelemetry
    - otel
    - tracing
    - metricas
    - collector
    - instrumentacion
    - guia
---

## Overview

OpenTelemetry (OTel) es un framework de observabilidad vendor-neutral para instrumentar, generar, recolectar y exportar datos de telemetria (traces, metricas y logs). Mantenido por la CNCF, unifica lo que anteriormente estaba fragmentado entre OpenTracing, OpenCensus y agentes vendor-specific. Con OpenTelemetry, instrumentas tu aplicacion una vez y envias datos a cualquier backend: Jaeger, Zipkin, Prometheus, Grafana, Datadog, New Relic o soluciones nativas en la nube.

## When to Use

- Quieres instrumentacion vendor-neutral que sobreviva a tu backend de observabilidad actual
- Necesitas traces, metricas y logs de la misma aplicacion
- Estas migrando entre vendors de observabilidad y quieres evitar re-instrumentacion
- Operas entornos polyglot (Go, Java, Python, Node.js, .NET)
- Necesitas recolectar telemetria de servicios que no puedes modificar (via el Collector)

## Arquitectura

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Aplicacion  │───→│  Collector  │───→│  Backend    │
│  (SDK)      │ OTLP│  (Agent/GW) │ OTLP│ (Jaeger/    │
└─────────────┘    └─────────────┘    │ Prometheus) │
```

| Componente | Rol |
|-----------|------|
| **SDK** | Libreria en-app que instrumenta auto/manualmente |
| **Collector** | Recibe, procesa y exporta telemetria |
| **Exporter** | Envia datos a un backend especifico |
| **OTLP** | Protocolo OpenTelemetry (gRPC/HTTP) |

## Auto-Instrumentacion (Python)

```bash
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install
```

```bash
# Ejecutar tu app con auto-instrumentacion
OTEL_SERVICE_NAME=my-service \
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317 \
OTEL_TRACES_EXPORTER=otlp \
OTEL_METRICS_EXPORTER=otlp \
OTEL_LOGS_EXPORTER=otlp \
opentelemetry-instrument python myapp.py
```

## Instrumentacion Manual

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Setup de traces
trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer(__name__)
span_exporter = OTLPSpanExporter(endpoint="collector:4317")

# Setup de metricas
metrics.set_meter_provider(MeterProvider())
meter = metrics.get_meter(__name__)
request_counter = meter.create_counter("http_requests_total")

# Uso en codigo
with tracer.start_as_current_span("handle_request") as span:
    span.set_attribute("http.method", "GET")
    span.set_attribute("http.route", "/api/users")
    request_counter.add(1, {"method": "GET", "route": "/api/users"})
    # ... logica de negocio
```

## Configuracion del Collector

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024

exporters:
  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true
  loki:
    endpoint: http://loki:3100/loki/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/jaeger]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheusremotewrite]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [loki]
```

## Propagacion de Contexto

OpenTelemetry propaga contexto de trace a traves de boundaries de servicio usando headers W3C Trace Context:

```
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
tracestate: vendor=value
```

Esto asegura que un request trackeado en una app frontend JavaScript continua a traves de Node.js, Python y Go backends como un solo trace.

## Common Mistakes

- **Olvidar flush al apagar** — spans/metricas no flusheados se pierden cuando un pod termina
- **Exportar todo sincronicamente** — siempre usar batch processors para evitar bloquear threads de aplicacion
- **Sin atributos de resource** — establecer `service.name`, `service.version`, `deployment.environment` en cada senal
- **Collector como punto unico de fallo** — ejecutar Collectors como DaemonSet o deployment HA
- **Ignorar configuracion de sampling** — el sampling por defecto puede ser demasiado agresivo o permisivo; ajustar para tu escala

## FAQ

**OpenTelemetry esta listo para produccion?**
Si. Los traces son estables en todos los lenguajes. Las metricas son estables en la mayoria. Los logs son estables en varios y mejorando rapidamente.

**Cual es la diferencia entre Agent y Gateway Collector?**
El Agent corre en cada host (DaemonSet) para coleccion local. El Gateway es un collector central (Deployment) para agregacion, filtrado y enrutamiento.

**Puedo usar OpenTelemetry con AWS/GCP/Azure?**
Si. Todos los proveedores cloud principales tienen endpoints OTLP o exporters de OpenTelemetry Collector para sus servicios nativos de observabilidad.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario: Instrumentacion OTel para API E-commerce

```typescript
// Instrumentacion automatica (Node.js)
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-grpc");
const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-grpc");
const { PrometheusExporter } = require("@opentelemetry/exporter-prometheus");

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: "http://otel-collector:4317"
  }),
  metricExporter: new PrometheusExporter({
    port: 9464
  }),
  instrumentations: [getNodeAutoInstrumentations({
    "@opentelemetry/instrumentation-fs": { enabled: false }
  })]
});
sdk.start();

// Instrumentacion manual: spans customizados
const { trace } = require("@opentelemetry/api");
const tracer = trace.getTracer("ecommerce-api");

async function checkout(cart) {
  return tracer.startActiveSpan("checkout", async (span) => {
    span.setAttribute("cart.items", cart.items.length);
    span.setAttribute("cart.total", cart.total);

    try {
      // Sub-span: validacion
      const validation = await tracer.startActiveSpan("validate_cart",
        async (childSpan) => {
          childSpan.setAttribute("items.count", cart.items.length);
          const result = validateCart(cart);
          childSpan.setAttribute("valid", result.valid);
          childSpan.end();
          return result;
        });

      // Sub-span: pago
      const payment = await tracer.startActiveSpan("process_payment",
        async (childSpan) => {
          childSpan.setAttribute("payment.method", cart.paymentMethod);
          const result = await processPayment(cart);
          childSpan.setAttribute("payment.status", result.status);
          childSpan.end();
          return result;
        });

      span.setAttribute("checkout.success", true);
      span.setStatus({ code: 1 });
      return { validation, payment };
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      span.setAttribute("checkout.success", false);
      throw error;
    } finally {
      span.end();
    }
  });
}

// Metricas customizadas
const { metrics } = require("@opentelemetry/api");
const meter = metrics.getMeter("ecommerce-api");

const checkoutCounter = meter.createCounter("checkouts.total", {
  description: "Total checkouts processed"
});
const checkoutDuration = meter.createHistogram("checkout.duration", {
  description: "Checkout duration in ms",
  unit: "ms"
});

// Uso:
checkoutCounter.add(1, { status: "success", method: "stripe" });
checkoutDuration.record(450, { status: "success" });

// Collector pipeline:
// App -> OTLP -> Collector -> Jaeger (traces)
//                          -> Prometheus (metrics)
//                          -> Loki (logs)
```

### Como migro de Jaeger client a OpenTelemetry?

Reemplaza el SDK de Jaeger con el SDK de OpenTelemetry. Los exporters de OTel pueden enviar a Jaeger via OTLP. La instrumentacion automatica de OTel reemplaza la manual de Jaeger. Los traces se ven identicos en Jaeger UI. La migracion es gradual: instrumenta nuevos servicios con OTel primero, migra existentes despues.












End of document. Review and update quarterly.