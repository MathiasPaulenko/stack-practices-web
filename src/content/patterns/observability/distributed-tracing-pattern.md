---
contentType: patterns
slug: distributed-tracing-pattern
title: "Distributed Tracing: Propagate Trace Context Across Services"
description: "How to propagate trace context across service boundaries with OpenTelemetry. Covers span creation, context propagation, sampling, and trace analysis."
metaDescription: "Propagate trace context across microservices with OpenTelemetry. Learn span creation, W3C trace context, sampling strategies, and trace analysis."
difficulty: advanced
topics:
  - observability
tags:
  - observability
  - distributed-tracing
  - opentelemetry
  - jaeger
  - zipkin
  - pattern
category: architectural
relatedResources:
  - /patterns/correlation-id-pattern
  - /patterns/structured-logging-pattern
  - /patterns/metrics-aggregation-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Propagate trace context across microservices with OpenTelemetry. Learn span creation, W3C trace context, sampling strategies, and trace analysis."
  keywords:
    - observability
    - distributed-tracing
    - opentelemetry
    - jaeger
    - zipkin
    - pattern
---

## Overview

Distributed tracing follows a single request as it flows through multiple services, creating a tree of spans where each span represents a unit of work. Unlike correlation IDs (which only tag logs), distributed tracing captures timing, causality, and context for every step. OpenTelemetry is the standard implementation, using W3C trace context headers (`traceparent`/`tracestate`) to propagate trace IDs across HTTP, gRPC, and message queue boundaries. The result is a visual timeline showing exactly where time is spent and where errors occur across the entire request path.

## When to Use

- Microservice architectures where requests span multiple services
- Performance debugging — identifying which service in a chain is slow
- Error investigation — tracing the exact path of a failed request
- Service dependency mapping — understanding which services call which
- Latency optimization — finding the critical path and longest spans

## When NOT to Use

- Monolithic applications — a single process has no distributed boundary
- Simple scripts or batch jobs with no inter-service calls
- Applications with very low traffic where sampling provides insufficient data
- When correlation IDs in logs are sufficient for your debugging needs

## Solution

### OpenTelemetry setup (Python)

```python
# Python — OpenTelemetry setup with OTLP exporter
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Configure tracer
resource = Resource.create({
    "service.name": "order-service",
    "service.version": "1.0.0",
    "deployment.environment": "production",
})

provider = TracerProvider(resource=resource)
exporter = OTLPSpanExporter(endpoint="http://otel-collector:4317")
processor = BatchSpanProcessor(exporter)
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("order-service")
```

### Manual span creation

```python
# Python — manual span creation
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

def process_order(order_id, customer_id):
    with tracer.start_as_current_span("process_order") as span:
        span.set_attribute("order.id", order_id)
        span.set_attribute("customer.id", customer_id)
        span.set_attribute("order.status", "processing")

        # Child span: validate order
        validate_order(order_id)

        # Child span: charge payment
        payment_result = charge_payment(order_id)

        # Child span: update inventory
        update_inventory(order_id)

        span.set_attribute("order.status", "completed")
        span.set_attribute("payment.status", payment_result.status)

        return payment_result

def validate_order(order_id):
    with tracer.start_as_current_span("validate_order") as span:
        span.set_attribute("order.id", order_id)
        # Validation logic
        order = fetch_order(order_id)
        if not order:
            span.set_status(trace.Status(trace.StatusCode.ERROR, "Order not found"))
            raise ValueError("Order not found")
        span.set_attribute("order.items_count", len(order.items))

def charge_payment(order_id):
    with tracer.start_as_current_span("charge_payment") as span:
        span.set_attribute("order.id", order_id)
        # Payment logic
        result = payment_gateway.charge(order_id)
        span.set_attribute("payment.amount", result.amount)
        span.set_attribute("payment.status", result.status)
        return result
```

### Automatic instrumentation (FastAPI)

```python
# Python — automatic instrumentation for FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.asyncpg import AsyncPGInstrumentor
from fastapi import FastAPI

app = FastAPI()

# Auto-instrument HTTP server, HTTP client, and database
FastAPIInstrumentor.instrument_app(app)
HTTPXClientInstrumentor().instrument()
AsyncPGInstrumentor().instrument()

# All HTTP requests, downstream calls, and DB queries are automatically traced
@app.post("/api/orders")
async def create_order(request: OrderRequest):
    # This creates a span for the HTTP request
    # Downstream HTTP calls create child spans
    # DB queries create child spans
    order = await order_service.create(request)
    return order
```

### HTTP context propagation

```python
# Python — propagate trace context in HTTP headers
import httpx
from opentelemetry import trace, propagate
from opentelemetry.propagators.textmap import default_setter

async def call_payment_service(order_data: dict):
    headers = {}

    # Inject current trace context into headers
    propagate.inject(headers)

    # headers now contains:
    # traceparent: 00-<trace-id>-<span-id>-<flags>
    # tracestate: ...

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://payment-service/api/charge",
            json=order_data,
            headers=headers,
        )
        return response.json()
```

### Extract context on receiving side

```python
# Python — extract trace context from incoming request
from opentelemetry import trace, propagate
from fastapi import Request, FastAPI

app = FastAPI()

@app.middleware("http")
async def tracing_middleware(request: Request, call_next):
    # Extract trace context from incoming headers
    ctx = propagate.extract(request.headers)

    # Start a new span linked to the parent from the caller
    tracer = trace.get_tracer(__name__)
    with tracer.start_as_current_span(
        f"{request.method} {request.url.path}",
        context=ctx,
    ) as span:
        span.set_attribute("http.method", request.method)
        span.set_attribute("http.url", str(request.url))
        span.set_attribute("http.scheme", request.url.scheme)
        span.set_attribute("http.host", request.url.host)

        response = await call_next(request)

        span.set_attribute("http.status_code", response.status_code)
        if response.status_code >= 400:
            span.set_status(trace.Status(trace.StatusCode.ERROR))

        return response
```

### Node.js with OpenTelemetry

```javascript
// JavaScript — OpenTelemetry setup for Node.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { PgInstrumentation } = require('@opentelemetry/instrumentation-pg');
const { resourceFromAttributes } = require('@opentelemetry/resources');

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    'service.name': 'order-service',
    'service.version': '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4317',
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new PgInstrumentation(),
  ],
});

sdk.start();

// Manual spans
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('order-service');

async function processOrder(orderId) {
  return tracer.startActiveSpan('process_order', async (span) => {
    span.setAttribute('order.id', orderId);

    try {
      const validated = await validateOrder(orderId);
      const payment = await chargePayment(orderId);
      span.setAttribute('payment.status', payment.status);
      span.setAttribute('order.status', 'completed');
      return payment;
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: 2, message: err.message });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

### Message queue context propagation

```python
# Python — propagate trace context through RabbitMQ
import pika
import json
from opentelemetry import trace, propagate

def publish_order_event(order_data):
    connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
    channel = connection.channel()

    headers = {}
    propagate.inject(headers)

    channel.basic_publish(
        exchange='orders',
        routing_key='order.created',
        body=json.dumps(order_data),
        properties=pika.BasicProperties(
            headers=headers,
            content_type='application/json',
        ),
    )
    connection.close()

# Consumer side
def consume_order_events():
    def callback(ch, method, properties, body):
        # Extract trace context from message headers
        ctx = propagate.extract(properties.headers or {})

        tracer = trace.get_tracer(__name__)
        with tracer.start_as_current_span("process_order_event", context=ctx) as span:
            order_data = json.loads(body)
            span.set_attribute("order.id", order_data['order_id'])
            span.set_attribute("event.type", "order.created")

            # Process the event — child spans are linked to the original trace
            process_order(order_data)

    channel.basic_consume(queue='orders', on_message_callback=callback)
    channel.start_consuming()
```

### Span events and links

```python
# Python — span events for logging within spans
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

def process_refund(order_id, reason):
    with tracer.start_as_current_span("process_refund") as span:
        span.set_attribute("order.id", order_id)
        span.set_attribute("refund.reason", reason)

        # Add events (like structured log entries within a span)
        span.add_event("refund_initiated", {
            "order.id": order_id,
            "amount": 99.99,
        })

        try:
            result = refund_processor.process(order_id)
            span.add_event("refund_completed", {"status": result.status})
            return result
        except Exception as e:
            span.add_event("refund_failed", {"error": str(e)})
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            raise
```

### Sampling strategies

```python
# Python — configure sampling
from opentelemetry.sdk.trace.sampling import (
    TraceIdRatioBased,
    ParentBased,
    ALWAYS_ON,
)

# Head-based sampling — sample at trace start
sampler = ParentBased(
    root=TraceIdRatioBased(rate=0.1),  # Sample 10% of new traces
)

provider = TracerProvider(resource=resource, sampler=sampler)

# Tail-based sampling — sample after trace completion
# Configured in OTel Collector, not in application code
# Allows sampling based on trace characteristics (errors, slow traces)
```

```yaml
# OTel Collector — tail-based sampling
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling]
      exporters: [jaeger]

processors:
  tail_sampling:
    decision_wait: 30s
    policies:
      # Sample all error traces
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      # Sample 10% of successful traces
      - name: baseline
        type: probabilistic
        probabilistic:
          sampling_percentage: 10
      # Sample all traces slower than 2 seconds
      - name: slow
        type: latency
        latency:
          threshold_ms: 2000
```

### Java Spring Boot instrumentation

```java
// Java — OpenTelemetry agent for automatic instrumentation
// Run with: java -javaagent:opentelemetry-javaagent.jar -jar app.jar

// Manual spans with OpenTelemetry API
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.GlobalOpenTelemetry;

@RestController
public class OrderController {

    private final Tracer tracer = GlobalOpenTelemetry.getTracer("order-service");

    @PostMapping("/api/orders")
    public Order createOrder(@RequestBody OrderRequest request) {
        Span span = tracer.spanBuilder("create_order").startSpan();
        try (var scope = span.makeCurrent()) {
            span.setAttribute("order.customer_id", request.getCustomerId());
            span.setAttribute("order.total", request.getTotal());

            Order order = orderService.create(request);
            span.setAttribute("order.id", order.getId());
            span.setAttribute("order.status", "created");

            return order;
        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }
}
```

### OTel Collector configuration

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
    timeout: 5s
    send_batch_size: 1000
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: upsert

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true
  zipkin:
    endpoint: http://zipkin:9411/api/v2/spans
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [jaeger]
```

## Variants

### Trace context with gRPC

```python
# Python — gRPC interceptors for trace propagation
from opentelemetry.instrumentation.grpc import GrpcInstrumentorServer, GrpcInstrumentorClient

# Auto-instrument gRPC server and client
GrpcInstrumentorServer().instrument()
GrpcInstrumentorClient().instrument()

# All gRPC calls automatically propagate trace context
# via grpc metadata: traceparent-bin, tracestate-bin
```

### Custom span attributes for business context

```python
# Python — enrich spans with business attributes
def process_order(order):
    with tracer.start_as_current_span("process_order") as span:
        # Technical attributes
        span.set_attribute("order.id", order.id)

        # Business attributes — queryable in Jaeger/Tempo
        span.set_attribute("order.product_category", order.category)
        span.set_attribute("order.region", order.region)
        span.set_attribute("order.payment_method", order.payment_method)
        span.set_attribute("order.item_count", len(order.items))
        span.set_attribute("order.total_usd", order.total)

        # These attributes can be used for filtering in trace analysis
        # e.g., "show all traces where order.region = us-east AND order.total > 100"
```

## Best Practices

- Use automatic instrumentation first — it covers HTTP, DB, and messaging without code changes
- Add manual spans for business logic — automatic instrumentation doesn't know about your domain
- Set meaningful span names — `process_order` not `span_123` or `function_1`
- Add business attributes — product category, region, payment method. These are queryable in trace analysis.
- Propagate context everywhere — HTTP, gRPC, message queues. Missing propagation breaks the trace tree.
- Use tail-based sampling — keep all errors and slow traces, sample the rest
- Keep spans short-lived — long spans consume memory. Break them into child spans.
- Record exceptions — use `span.record_exception()` and `span.set_status(ERROR)` for failures

## Common Mistakes

- **Not propagating context**: forgetting to inject/extract trace context at service boundaries. The trace tree breaks, showing disconnected spans.
- **Span names too generic**: `handle_request` for every endpoint. Use specific names like `create_order`, `process_payment`.
- **Too many spans**: creating a span for every function call. This creates noise and overhead. Focus on meaningful operations.
- **Not recording errors**: exceptions are caught but not recorded in the span. Use `record_exception()` to capture stack traces.
- **100% sampling in production**: tracing every request creates enormous volume. Use 1-10% sampling with tail-based selection of errors.

## FAQ

### What is a span?

A span represents a single operation within a trace. It has a start time, duration, name, attributes, and parent span. A trace is a tree of spans showing the full path of a request.

### How is distributed tracing different from correlation IDs?

Correlation IDs tag logs with a request ID. Distributed tracing captures timing, parent-child relationships, and attributes for every operation. Tracing shows you the timeline and causality, not just which logs belong together.

### What is OpenTelemetry?

OpenTelemetry is the CNCF standard for telemetry (traces, metrics, logs). It provides APIs, SDKs, and auto-instrumentation for 12+ languages. It replaced OpenTracing and OpenCensus.

### What sampling rate should I use?

For production: 1-10% head-based sampling, or tail-based sampling that keeps all errors and slow traces while sampling the rest. For development: 100% sampling.

### What is the W3C trace context?

The standard for propagating trace context across service boundaries using `traceparent` and `tracestate` HTTP headers. OpenTelemetry uses this by default for HTTP and gRPC.
