---
contentType: guides
slug: complete-guide-distributed-tracing
title: "Complete Guide to Distributed Tracing: OpenTelemetry, Jaeger, Zipkin"
description: "Master distributed tracing with OpenTelemetry, Jaeger, and Zipkin. Trace propagation across services, span context, sampling strategies, and production debugging."
metaDescription: "Master distributed tracing with OpenTelemetry, Jaeger, and Zipkin. Trace propagation, span context, sampling strategies, and production debugging across services."
difficulty: advanced
topics:
  - observability
tags:
  - guide
  - distributed-tracing
  - opentelemetry
  - jaeger
  - zipkin
  - observability
  - monitoring
relatedResources:
  - /guides/observability/complete-guide-structured-logging
  - /guides/observability/complete-guide-prometheus-grafana
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 22
seo:
  metaDescription: "Master distributed tracing with OpenTelemetry, Jaeger, and Zipkin. Trace propagation, span context, sampling strategies, and production debugging across services."
  keywords:
    - distributed tracing
    - opentelemetry
    - jaeger
    - zipkin
    - trace propagation
    - span context
    - observability
---

## Introduction

Distributed tracing tracks a single request as it flows through multiple services, databases, and message queues. In a microservices architecture, a single user request might hit 10+ services before returning a response. When latency spikes or errors occur, logs alone can't tell you which service caused the problem. Distributed tracing gives you a visual timeline of the entire request path, with timing breakdowns for each hop. This guide covers OpenTelemetry instrumentation, Jaeger and Zipkin backends, trace propagation, sampling strategies, and production debugging patterns.

## Core Concepts

### Trace, span, and context

```
Trace: The entire journey of a single request across all services
  ├── Span A (Service: API Gateway)         [0ms - 150ms]
  │   ├── Span B (Service: Auth Service)    [5ms - 20ms]
  │   ├── Span C (Service: Order Service)   [20ms - 140ms]
  │   │   ├── Span D (Service: Database)    [25ms - 50ms]
  │   │   ├── Span E (Service: Inventory)   [55ms - 90ms]
  │   │   └── Span F (Service: Payment)     [95ms - 135ms]
  │   └── Span G (Service: Response)        [140ms - 150ms]

Span: A single unit of work (one service call, one DB query)
  - Has a trace_id, span_id, parent_span_id
  - Has start time, duration, and status
  - Has attributes (key-value metadata)
  - Has events (timestamped logs within the span)

Context: The trace_id and span_id propagated across service boundaries
  - Passed via HTTP headers, gRPC metadata, or message headers
  - W3C Trace Context is the standard format
```

## OpenTelemetry Instrumentation

### Python: Auto-instrumentation

```python
# instrumentation.py — OpenTelemetry auto-instrumentation for Python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Configure the tracer
resource = Resource.create({
    "service.name": "order-service",
    "service.version": "1.0.0",
    "deployment.environment": "production",
})

provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(
    OTLPSpanExporter(endpoint="http://otel-collector:4317")
)
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# Auto-instrumentation for common libraries
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor

FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()
SQLAlchemyInstrumentor().instrument(engine=db.engine)
RedisInstrumentor().instrument()
```

### Python: Manual spans

```python
# order_service.py — Manual span creation
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

tracer = trace.get_tracer(__name__)

class OrderService:
    def create_order(self, user_id: int, items: list[dict]) -> dict:
        with tracer.start_as_current_span("create_order") as span:
            span.set_attribute("user.id", user_id)
            span.set_attribute("items.count", len(items))

            try:
                # Validate user
                with tracer.start_as_current_span("validate_user") as child:
                    user = self.auth_client.get_user(user_id)
                    child.set_attribute("user.email", user["email"])
                    child.set_attribute("user.active", user["is_active"])

                # Check inventory
                with tracer.start_as_current_span("check_inventory") as child:
                    for item in items:
                        stock = self.inventory_client.get_stock(item["product_id"])
                        child.set_attribute(f"product.{item['product_id']}.stock", stock)
                        if stock < item["quantity"]:
                            raise ValueError(f"Insufficient stock for product {item['product_id']}")

                # Process payment
                with tracer.start_as_current_span("process_payment") as child:
                    payment = self.payment_client.charge(
                        user_id=user_id,
                        amount=sum(i["price"] * i["quantity"] for i in items),
                    )
                    child.set_attribute("payment.id", payment["id"])
                    child.set_attribute("payment.amount", payment["amount"])

                # Save order
                with tracer.start_as_current_span("save_order") as child:
                    order = self.order_repo.create(user_id=user_id, items=items, payment_id=payment["id"])
                    child.set_attribute("order.id", order["id"])

                span.set_attribute("order.id", order["id"])
                span.set_status(Status(StatusCode.OK))
                return order

            except Exception as e:
                span.record_exception(e)
                span.set_status(Status(StatusCode.ERROR, str(e)))
                raise
```

### TypeScript: Node.js instrumentation

```typescript
// tracing.ts — OpenTelemetry for Node.js
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { RedisInstrumentation } from "@opentelemetry/instrumentation-redis-4";

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "api-gateway",
    [ATTR_SERVICE_VERSION]: "1.0.0",
  }),
  traceExporter: new OTLPTraceExporter({
    url: "http://otel-collector:4317",
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new PgInstrumentation(),
    new RedisInstrumentation(),
  ],
});

sdk.start();

// Manual spans
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("api-gateway");

async function handleRequest(req: Request, res: Response) {
  const span = tracer.startSpan("handle_request", {
    attributes: {
      "http.method": req.method,
      "http.url": req.url,
      "user.id": req.userId,
    },
  });

  try {
    using context = trace.setSpan(trace.activeSpan() ?? span, span);
    const authResult = await validateToken(req.headers.authorization);
    const userData = await fetchUserData(req.userId);
    const processedData = await processData(userData);

    span.setAttribute("response.size", JSON.stringify(processedData).length);
    span.setStatus({ code: SpanStatusCode.OK });
    res.json(processedData);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    res.status(500).json({ error: "Internal server error" });
  } finally {
    span.end();
  }
}
```

### Java: Spring Boot instrumentation

```java
// TracingConfig.java — OpenTelemetry for Spring Boot
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor;
import io.opentelemetry.exporter.otlp.trace.OtlpGrpcSpanExporter;
import io.opentelemetry.sdk.resources.Resource;

@Configuration
public class TracingConfig {

    @Bean
    public OpenTelemetry openTelemetry() {
        Resource resource = Resource.getDefault()
            .merge(Resource.create Attributes.of(
                ResourceAttributes.SERVICE_NAME, "order-service",
                ResourceAttributes.SERVICE_VERSION, "1.0.0",
                ResourceAttributes.DEPLOYMENT_ENVIRONMENT, "production"
            ));

        SdkTracerProvider tracerProvider = SdkTracerProvider.builder()
            .setResource(resource)
            .addSpanProcessor(BatchSpanProcessor.builder(
                OtlpGrpcSpanExporter.builder()
                    .setEndpoint("http://otel-collector:4317")
                    .build()
            ).build())
            .build();

        OpenTelemetrySdk sdk = OpenTelemetrySdk.builder()
            .setTracerProvider(tracerProvider)
            .build();

        GlobalOpenTelemetry.set(sdk);
        return sdk;
    }
}

// Manual spans in service code
@Service
public class OrderService {

    private final Tracer tracer;

    public OrderService(OpenTelemetry openTelemetry) {
        this.tracer = openTelemetry.getTracer("order-service");
    }

    public Order createOrder(Long userId, List<OrderItem> items) {
        Span span = tracer.spanBuilder("create_order")
            .setAttribute("user.id", userId)
            .setAttribute("items.count", items.size())
            .startSpan();

        try (Scope scope = span.makeCurrent()) {
            User user = authService.validateUser(userId);
            Span validateSpan = tracer.spanBuilder("validate_user")
                .setAttribute("user.email", user.getEmail())
                .startSpan();
            validateSpan.end();

            Payment payment = paymentService.charge(userId, calculateTotal(items));
            Order order = orderRepository.save(new Order(userId, items, payment.getId()));

            span.setAttribute("order.id", order.getId());
            span.setStatus(StatusCode.OK);
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

## Trace Propagation

### W3C Trace Context headers

```python
# W3C Trace Context format
# traceparent: 00-{trace-id}-{parent-span-id}-{trace-flags}
# Example: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01

# Python: Propagate context across HTTP calls
import requests
from opentelemetry import trace, propagate

def call_downstream_service(url: str, data: dict) -> dict:
    headers = {"Content-Type": "application/json"}

    # Inject trace context into headers
    current_span = trace.get_current_span()
    propagate.inject(headers)

    response = requests.post(url, json=data, headers=headers)
    return response.json()
```

```typescript
// TypeScript: Propagate context across fetch calls
import { propagation, context } from "@opentelemetry/api";
import { W3CTraceContextPropagator } from "@opentelemetry/core";

async function callDownstream(url: string, data: any): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  // Inject trace context
  propagation.inject(context.active(), headers, {
    set: (carrier, key, value) => { carrier[key] = value; },
  });

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  return response.json();
}
```

### Message queue propagation

```python
# Kafka: Propagate trace context through message headers
from kafka import KafkaProducer, KafkaConsumer
from opentelemetry import trace, propagate

producer = KafkaProducer(bootstrap_servers=["localhost:9092"])

def send_event(topic: str, event: dict):
    headers = {}
    propagate.inject(headers)

    kafka_headers = [(k, v.encode("utf-8")) for k, v in headers.items()]
    producer.send(topic, value=json.dumps(event).encode("utf-8"), headers=k_headers)
    producer.flush()

consumer = KafkaConsumer("orders", bootstrap_servers=["localhost:9092"])

def consume_events():
    for message in consumer:
        # Extract trace context from message headers
        headers = {k: v.decode("utf-8") for k, v in message.headers}
        context = propagate.extract(headers)

        with tracer.start_as_current_span("process_event", context=context):
            event = json.loads(message.value)
            process_order_event(event)
```

## Sampling Strategies

### Head-based sampling (probabilistic)

```python
# Always sample a percentage of traces at the entry point
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased, ALWAYS_ON

# Sample 10% of traces
sampler = TraceIdRatioBased(0.1)

# Or always sample (for development)
sampler = ALWAYS_ON

provider = TracerProvider(resource=resource, sampler=sampler)
```

### Tail-based sampling (conditional)

```yaml
# otel-collector-config.yaml — Tail-based sampling in collector
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    policies:
      # Sample all errors
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]

      # Sample slow traces (>2s)
      - name: slow
        type: latency
        latency:
          threshold_ms: 2000

      # Sample 10% of everything else
      - name: baseline
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling]
      exporters: [jaeger]
```

## Jaeger and Zipkin Backends

### Jaeger deployment

```yaml
# docker-compose.yml — Jaeger all-in-one for development
version: "3.8"
services:
  jaeger:
    image: jaegertracing/all-in-one:1.57
    ports:
      - "16686:16686"   # Jaeger UI
      - "14250:14250"   # gRPC
      - "4317:4317"     # OTLP gRPC
      - "4318:4318"     # OTLP HTTP
    environment:
      - COLLECTOR_OTLP_ENABLED=true

  # For production, use Jaeger with Elasticsearch storage
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.13.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
```

### Zipkin deployment

```yaml
# docker-compose.yml — Zipkin for development
version: "3.8"
services:
  zipkin:
    image: openzipkin/zipkin:3.4
    ports:
      - "9411:9411"   # Zipkin UI and API
    environment:
      - STORAGE_TYPE=mem  # Use elasticsearch for production
```

### Querying traces

```bash
# Jaeger API: Find traces for a service
curl "http://localhost:16686/api/traces?service=order-service&limit=20"

# Jaeger API: Find traces with errors
curl "http://localhost:16686/api/traces?service=order-service&tags=error%3Dtrue"

# Zipkin API: Find traces by span name
curl "http://localhost:9411/api/v2/traces?spanName=create_order&limit=20"
```

## OTel Collector

```yaml
# otel-collector-config.yaml — Production collector config
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

  memory_limiter:
    check_interval: 2s
    limit_percentage: 80
    spike_limit_percentage: 25

  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: upsert

  filter:
    traces:
      deny:
        # Drop health check spans
        - attributes["http.route"] == "/health"

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true

  zipkin:
    endpoint: http://zipkin:9411/api/v2/spans

  logging:
    loglevel: warn

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, filter, resource, batch]
      exporters: [jaeger]
```

## Production Debugging Patterns

### Finding slow requests

```python
# Add custom attributes to identify slow operations
with tracer.start_as_current_span("database_query") as span:
    start = time.time()
    result = db.execute(query)
    elapsed = time.time() - start

    span.set_attribute("db.duration_ms", elapsed * 1000)
    span.set_attribute("db.rows_returned", len(result))

    if elapsed > 1.0:
        span.set_attribute("db.slow_query", True)
        span.add_event("slow_query_detected", {
            "query": query[:200],
            "duration_ms": elapsed * 1000,
        })
```

### Tracking errors across services

```python
# Add error details to spans for cross-service debugging
try:
    result = downstream_service.call(payload)
except requests.HTTPError as e:
    span = trace.get_current_span()
    span.record_exception(e)
    span.set_attribute("error.type", "http_error")
    span.set_attribute("error.status_code", e.response.status_code)
    span.set_attribute("error.response_body", e.response.text[:500])
    span.set_status(Status(StatusCode.ERROR, str(e)))
    raise
```

### Business context in traces

```python
# Add business-relevant attributes for filtering in Jaeger/Zipkin
with tracer.start_as_current_span("process_checkout") as span:
    span.set_attribute("order.id", order.id)
    span.set_attribute("order.total", order.total)
    span.set_attribute("order.items_count", len(order.items))
    span.set_attribute("user.id", order.user_id)
    span.set_attribute("user.tier", user.tier)  # free, pro, enterprise
    span.set_attribute("payment.method", payment.method)
    span.set_attribute("checkout.flow", "standard")
```

## Best Practices

- Use auto-instrumentation first — covers HTTP, database, and cache calls automatically
- Add manual spans for business logic — auto-instrumentation can't see your domain logic
- Use semantic conventions — standard attribute names like `http.method`, `db.system`
- Set `service.name` and `service.version` in resource attributes — identifies the service in UI
- Use tail-based sampling in production — capture all errors and slow traces, sample the rest
- Add business context attributes — filter traces by user ID, order ID, or feature flag
- Keep span attributes small — avoid putting large payloads in span attributes
- Use span events for timed logs within a span — more useful than separate log entries
- Propagate context through message queues — don't break the trace at async boundaries
- Filter health check spans — they pollute trace data with noise

## Common Mistakes

- **Not propagating context**: downstream service calls don't carry the trace context, breaking the trace. Always inject/extract context at service boundaries.
- **Too many spans**: creating a span for every function call creates noise. Span at service boundaries and significant business operations.
- **Missing error recording**: exceptions are caught but not recorded in the span. Use `span.record_exception(e)` and set error status.
- **Using head-based sampling only**: you miss all errors because the sampling decision is made before the error occurs. Use tail-based sampling.
- **No resource attributes**: spans show up as "unknown_service" in Jaeger. Always set `service.name`.

## FAQ

### What is distributed tracing?

A method of tracking a single request as it flows through multiple services. Each service adds a span to the trace, creating a tree of spans that shows the full request path with timing and status information.

### What is OpenTelemetry?

A CNCF project providing vendor-neutral APIs, SDKs, and collectors for distributed tracing, metrics, and logs. It replaces proprietary instrumentation from Jaeger, Zipkin, and other tracing systems.

### Head-based vs. tail-based sampling?

Head-based sampling decides at trace start whether to sample — fast but can't consider errors. Tail-based sampling decides after the trace completes — can sample all errors and slow traces, but requires buffering traces in the collector.

### What is a trace context?

The trace ID, span ID, and trace flags propagated across service boundaries. W3C Trace Context is the standard format, passed via `traceparent` and `tracestate` HTTP headers.

### How much overhead does tracing add?

With batch span processing and 10% sampling, overhead is typically <1% CPU and <5MB memory per service. The OTel Collector adds minimal latency (<1ms per span). Use `memory_limiter` processor to prevent OOM.
