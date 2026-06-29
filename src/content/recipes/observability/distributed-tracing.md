---
contentType: recipes
slug: distributed-tracing
title: "Distributed Tracing"
description: "Trace requests across distributed microservices with OpenTelemetry, Jaeger, and Zipkin for latency debugging and performance optimization."
metaDescription: "Distributed tracing with OpenTelemetry, Jaeger, and Zipkin: trace requests across microservices, identify latency bottlenecks, and optimize performance."
difficulty: intermediate
topics:
  - observability
tags:
  - distributed-tracing
  - observability
  - microservices
relatedResources:
  - /recipes/grafana-dashboards-observability
  - /recipes/prometheus-monitoring-alerts
  - /recipes/prometheus-api-monitoring
  - /recipes/structured-logging
  - /guides/microservices-architecture-guide
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Distributed tracing with OpenTelemetry, Jaeger, and Zipkin: trace requests across microservices, identify latency bottlenecks, and optimize performance."
  keywords:
    - distributed-tracing
    - observability
    - opentelemetry
    - microservices
---
## Overview

Distributed tracing follows a single request as it travels through microservices, databases, message queues, and third-party APIs. Unlike logs (discrete events) or metrics (aggregated numbers), traces reveal the full journey — showing exactly where time is spent and which service causes delays. OpenTelemetry has become the industry standard for instrumenting applications and exporting traces to Jaeger, Zipkin, or cloud providers.

## When to Use

Use this resource when:
- Debugging latency in microservices architectures
- Understanding call graphs across 10+ services
- Optimizing critical user journeys (checkout, login, search)
- Identifying cascading failures and retry storms

## Solution

### OpenTelemetry Auto-Instrumentation (Node.js)

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: 'http://jaeger:14268/api/traces'
  }),
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();
```

### Custom Span Creation (Go)

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

func processOrder(ctx context.Context, orderID string) error {
    tracer := otel.Tracer("order-service")
    
    ctx, span := tracer.Start(ctx, "processOrder",
        trace.WithAttributes(attribute.String("order.id", orderID)))
    defer span.End()
    
    // Child span for database call
    ctx, dbSpan := tracer.Start(ctx, "validateInventory")
    err := db.CheckStock(orderID)
    dbSpan.End()
    
    if err != nil {
        span.RecordError(err)
        return err
    }
    
    span.SetStatus(codes.Ok, "order processed")
    return nil
}
```

### Propagation via HTTP Headers

```python
from opentelemetry import trace
from opentelemetry.propagate import extract, inject
import requests

tracer = trace.get_tracer(__name__)

def handle_request(headers):
    # Extract parent context from incoming request
    context = extract(headers)
    
    with tracer.start_as_current_span("process-payment", context=context):
        # Outgoing request carries trace context
        outgoing_headers = {}
        inject(outgoing_headers)
        
        response = requests.post(
            "https://payment-api.example.com/charge",
            headers=outgoing_headers
        )
        return response.json()
```

## Explanation

**Trace anatomy**:
- **Trace**: A complete user request (e.g., "add to cart")
- **Span**: A single operation within the trace (e.g., "query database")
- **Span context**: Trace ID + Span ID + flags, propagated across service boundaries
- **Baggage**: Key-value pairs shared across the entire trace

**W3C Trace Context standard**:
- `traceparent`: 00-traceid-spanid-flags
- `tracestate`: Vendor-specific extensions

**Sampling strategies**:
- **Head-based**: Decide at the edge (simple; consistent)
- **Tail-based**: Decide after completion (catches rare errors; expensive)
- **Probability**: Random percentage (cheap; may miss edge cases)

## Variants

| Backend | Best For | Notable Capabilities |
|---------|----------|------------------|
| Jaeger | Open source, self-hosted | Native OpenTelemetry; good UI |
| Zipkin | Simple setups | Minimal resource footprint |
| AWS X-Ray | AWS-native apps | Service map; integration with ALB/Lambda |
| Datadog | Enterprise SaaS | APM + traces + logs unified |
| Grafana Tempo | Grafana stack | Cost-effective at scale |

## What Works

- **Instrument at framework level**: Auto-instrument HTTP, [gRPC](/recipes/api/grpc-api), [database](/guides/databases/database-design-guide), and message queue clients
- **Add business attributes**: user_id, order_id, tenant_id make traces useful
- **Keep cardinality low**: Don't put unique IDs in span names (use attributes instead)
- **Sample aggressively in production**: 1-5% is usually sufficient for debugging
- **Link traces to logs**: Include trace_id in [log entries](/recipes/observability/structured-logging) for cross-referencing

## Common Mistakes

1. **Missing context propagation**: Spans break across [service boundaries](/guides/architecture/microservices-architecture-guide) if headers aren't forwarded
2. **Span explosion**: Creating spans for every loop iteration creates unreadable traces
3. **High-cardinality tags**: User IDs or session IDs as span names crash storage
4. **Not sampling in dev**: Full tracing in development makes it easy to verify instrumentation
5. **Ignoring async flows**: Background jobs, callbacks, and timers need manual span parenting

## Frequently Asked Questions

**Q: Do I need to change my code for every function?**
A: No. Auto-instrumentation covers HTTP, DB, and queue clients. Only add manual spans for critical business operations.

**Q: What's the performance overhead?**
A: Typically <1% CPU and memory when sampling 1-5%. Head-based sampling is cheaper than tail-based.

**Q: Can I trace frontend JavaScript too?**
A: Yes. OpenTelemetry JS instruments browser apps, connecting user clicks to backend traces end-to-end.
