---
contentType: guides
slug: opentelemetry-guide
title: "OpenTelemetry — Implementation Guide for Metrics, Logs"
description: "A practical guide to OpenTelemetry: instrumentation, collectors, exporters, and wiring OTLP to backends like Jaeger, Prometheus, and Grafana."
metaDescription: "Learn OpenTelemetry: instrumentation, collectors, OTLP exporters. Wire traces, metrics, and logs to Jaeger, Prometheus, and Grafana."
difficulty: intermediate
topics:
  - devops
  - observability
tags:
  - opentelemetry
  - otel
  - tracing
  - metrics
  - logs
  - collector
  - instrumentation
  - guide
relatedResources:
  - /guides/observability-guide
  - /guides/service-mesh-guide
  - /guides/sre-practices-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn OpenTelemetry: instrumentation, collectors, OTLP exporters. Wire traces, metrics, and logs to Jaeger, Prometheus, and Grafana."
  keywords:
    - opentelemetry
    - otel
    - tracing
    - metrics
    - collector
    - instrumentation
    - guide
---

## Overview

OpenTelemetry (OTel) is a vendor-neutral observability framework for instrumenting, generating, collecting, and exporting telemetry data (traces, metrics, and logs). Maintained by the CNCF, it unifies what was previously fragmented across OpenTracing, OpenCensus, and vendor-specific agents. With OpenTelemetry, you instrument your application once and send data to any backend: Jaeger, Zipkin, Prometheus, Grafana, Datadog, New Relic, or cloud-native solutions.

## When to Use

- You want vendor-neutral instrumentation that outlives your current observability backend
- You need traces, metrics, and logs from the same application
- You are migrating between observability vendors and want to avoid re-instrumentation
- You operate polyglot environments (Go, Java, Python, Node.js, .NET)
- You need to collect telemetry from services you cannot modify (via the Collector)

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Application │───→│  Collector  │───→│  Backend    │
│  (SDK)      │ OTLP│  (Agent/GW) │ OTLP│ (Jaeger/    │
└─────────────┘    └─────────────┘    │ Prometheus) │
```

| Component | Role |
|-----------|------|
| **SDK** | In-app library that auto/manual instruments |
| **Collector** | Receives, processes, and exports telemetry |
| **Exporter** | Sends data to a specific backend |
| **OTLP** | OpenTelemetry Protocol (gRPC/HTTP) |

## Auto-Instrumentation (Python)

```bash
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install
```

```bash
# Run your app with auto-instrumentation
OTEL_SERVICE_NAME=my-service \
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317 \
OTEL_TRACES_EXPORTER=otlp \
OTEL_METRICS_EXPORTER=otlp \
OTEL_LOGS_EXPORTER=otlp \
opentelemetry-instrument python myapp.py
```

## Manual Instrumentation

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Trace setup
trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer(__name__)
span_exporter = OTLPSpanExporter(endpoint="collector:4317")

# Metric setup
metrics.set_meter_provider(MeterProvider())
meter = metrics.get_meter(__name__)
request_counter = meter.create_counter("http_requests_total")

# Use in code
with tracer.start_as_current_span("handle_request") as span:
    span.set_attribute("http.method", "GET")
    span.set_attribute("http.route", "/api/users")
    request_counter.add(1, {"method": "GET", "route": "/api/users"})
    # ... business logic
```

## Collector Configuration

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

## Context Propagation

OpenTelemetry propagates trace context across service boundaries using W3C Trace Context headers:

```
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
tracestate: vendor=value
```

This ensures a request traced in a frontend JavaScript app continues through Node.js, Python, and Go backends as a single trace.

## Common Mistakes

- **Forgetting to flush on shutdown** — unflushed spans/metrics are lost when a pod terminates
- **Exporting everything synchronously** — always use batch processors to avoid blocking application threads
- **No resource attributes** — set `service.name`, `service.version`, `deployment.environment` on every signal
- **Collector as a single point of failure** — run Collectors as a DaemonSet or HA deployment
- **Ignoring sampling configuration** — default sampling may be too aggressive or too lenient; tune for your scale

## FAQ

**Is OpenTelemetry production-ready?**
Yes. Traces are stable across all languages. Metrics are stable in most. Logs are stable in several and improving rapidly.

**What is the difference between the Agent and Gateway Collector?**
Agent runs on each host (DaemonSet) for local collection. Gateway is a central collector (Deployment) for aggregation, filtering, and routing.

**Can I use OpenTelemetry with AWS/GCP/Azure?**
Yes. All major cloud providers have OTLP endpoints or OpenTelemetry collector exporters for their native observability services.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Scenario: OTel Instrumentation for E-commerce API

```typescript
// Automatic instrumentation (Node.js)
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

// Manual instrumentation: custom spans
const { trace } = require("@opentelemetry/api");
const tracer = trace.getTracer("ecommerce-api");

async function checkout(cart) {
  return tracer.startActiveSpan("checkout", async (span) => {
    span.setAttribute("cart.items", cart.items.length);
    span.setAttribute("cart.total", cart.total);

    try {
      // Sub-span: validation
      const validation = await tracer.startActiveSpan("validate_cart",
        async (childSpan) => {
          childSpan.setAttribute("items.count", cart.items.length);
          const result = validateCart(cart);
          childSpan.setAttribute("valid", result.valid);
          childSpan.end();
          return result;
        });

      // Sub-span: payment
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

// Custom metrics
const { metrics } = require("@opentelemetry/api");
const meter = metrics.getMeter("ecommerce-api");

const checkoutCounter = meter.createCounter("checkouts.total", {
  description: "Total checkouts processed"
});
const checkoutDuration = meter.createHistogram("checkout.duration", {
  description: "Checkout duration in ms",
  unit: "ms"
});

// Usage:
checkoutCounter.add(1, { status: "success", method: "stripe" });
checkoutDuration.record(450, { status: "success" });

// Collector pipeline:
// App -> OTLP -> Collector -> Jaeger (traces)
//                          -> Prometheus (metrics)
//                          -> Loki (logs)
```

### How do I migrate from Jaeger client to OpenTelemetry?

Replace the Jaeger SDK with the OpenTelemetry SDK. OTel exporters can send to Jaeger via OTLP. OTel auto-instrumentation replaces Jaeger manual instrumentation. Traces look identical in Jaeger UI. Migration is gradual: instrument new services with OTel first, migrate existing ones later.












End of document. Review and update quarterly.