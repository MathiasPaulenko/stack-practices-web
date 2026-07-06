---
contentType: guides
slug: complete-guide-distributed-tracing
title: "Guía Completa de Distributed Tracing: OpenTelemetry, Jaeger, Zipkin"
description: "Dominá distributed tracing con OpenTelemetry, Jaeger y Zipkin. Trace propagation entre servicios, span context, sampling strategies y debugging en producción."
metaDescription: "Dominá distributed tracing con OpenTelemetry, Jaeger y Zipkin. Trace propagation, span context, sampling strategies y debugging en producción entre servicios."
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
  metaDescription: "Dominá distributed tracing con OpenTelemetry, Jaeger y Zipkin. Trace propagation, span context, sampling strategies y debugging en producción entre servicios."
  keywords:
    - distributed tracing
    - opentelemetry
    - jaeger
    - zipkin
    - trace propagation
    - span context
    - observability
---

## Introducción

Distributed tracing trackea un solo request mientras fluye a través de múltiples servicios, databases y message queues. En una arquitectura de microservices, un solo user request puede hit 10+ servicios antes de devolver una response. Cuando hay latency spikes o errors, los logs solos no pueden decirte qué servicio causó el problema. Distributed tracing te da un timeline visual del path completo del request, con timing breakdowns para cada hop. Esta guía cubre OpenTelemetry instrumentation, Jaeger y Zipkin backends, trace propagation, sampling strategies y patrones de production debugging.

## Conceptos Core

### Trace, span y context

```
Trace: El journey entero de un solo request a través de todos los servicios
  ├── Span A (Service: API Gateway)         [0ms - 150ms]
  │   ├── Span B (Service: Auth Service)    [5ms - 20ms]
  │   ├── Span C (Service: Order Service)   [20ms - 140ms]
  │   │   ├── Span D (Service: Database)    [25ms - 50ms]
  │   │   ├── Span E (Service: Inventory)   [55ms - 90ms]
  │   │   └── Span F (Service: Payment)     [95ms - 135ms]
  │   └── Span G (Service: Response)        [140ms - 150ms]

Span: Una sola unidad de trabajo (una service call, una DB query)
  - Tiene un trace_id, span_id, parent_span_id
  - Tiene start time, duration y status
  - Tiene attributes (key-value metadata)
  - Tiene events (timestamped logs dentro del span)

Context: El trace_id y span_id propagados a través de service boundaries
  - Pasado via HTTP headers, gRPC metadata, o message headers
  - W3C Trace Context es el format standard
```

## OpenTelemetry Instrumentation

### Python: Auto-instrumentation

```python
# instrumentation.py — OpenTelemetry auto-instrumentation para Python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Configurá el tracer
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

# Auto-instrumentation para libraries comunes
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
// tracing.ts — OpenTelemetry para Node.js
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
// TracingConfig.java — OpenTelemetry para Spring Boot
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

// Manual spans en service code
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

# Python: Propagá context a través de HTTP calls
import requests
from opentelemetry import trace, propagate

def call_downstream_service(url: str, data: dict) -> dict:
    headers = {"Content-Type": "application/json"}

    # Inyectá trace context en headers
    current_span = trace.get_current_span()
    propagate.inject(headers)

    response = requests.post(url, json=data, headers=headers)
    return response.json()
```

```typescript
// TypeScript: Propagá context a través de fetch calls
import { propagation, context } from "@opentelemetry/api";
import { W3CTraceContextPropagator } from "@opentelemetry/core";

async function callDownstream(url: string, data: any): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  // Inyectá trace context
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
# Kafka: Propagá trace context a través de message headers
from kafka import KafkaProducer, KafkaConsumer
from opentelemetry import trace, propagate

producer = KafkaProducer(bootstrap_servers=["localhost:9092"])

def send_event(topic: str, event: dict):
    headers = {}
    propagate.inject(headers)

    kafka_headers = [(k, v.encode("utf-8")) for k, v in headers.items()]
    producer.send(topic, value=json.dumps(event).encode("utf-8"), headers=kafka_headers)
    producer.flush()

consumer = KafkaConsumer("orders", bootstrap_servers=["localhost:9092"])

def consume_events():
    for message in consumer:
        # Extraé trace context de message headers
        headers = {k: v.decode("utf-8") for k, v in message.headers}
        context = propagate.extract(headers)

        with tracer.start_as_current_span("process_event", context=context):
            event = json.loads(message.value)
            process_order_event(event)
```

## Sampling Strategies

### Head-based sampling (probabilistic)

```python
# Siempre sampleá un percentage de traces en el entry point
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased, ALWAYS_ON

# Sampleá 10% de traces
sampler = TraceIdRatioBased(0.1)

# O siempre sampleá (para development)
sampler = ALWAYS_ON

provider = TracerProvider(resource=resource, sampler=sampler)
```

### Tail-based sampling (conditional)

```yaml
# otel-collector-config.yaml — Tail-based sampling en collector
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
      # Sampleá todos los errors
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]

      # Sampleá traces lentos (>2s)
      - name: slow
        type: latency
        latency:
          threshold_ms: 2000

      # Sampleá 10% de todo lo demás
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

## Jaeger y Zipkin Backends

### Jaeger deployment

```yaml
# docker-compose.yml — Jaeger all-in-one para development
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

  # Para production, usá Jaeger con Elasticsearch storage
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
# docker-compose.yml — Zipkin para development
version: "3.8"
services:
  zipkin:
    image: openzipkin/zipkin:3.4
    ports:
      - "9411:9411"   # Zipkin UI y API
    environment:
      - STORAGE_TYPE=mem  # Usá elasticsearch para production
```

### Querying traces

```bash
# Jaeger API: Encontrá traces para un service
curl "http://localhost:16686/api/traces?service=order-service&limit=20"

# Jaeger API: Encontrá traces con errors
curl "http://localhost:16686/api/traces?service=order-service&tags=error%3Dtrue"

# Zipkin API: Encontrá traces por span name
curl "http://localhost:9411/api/v2/traces?spanName=create_order&limit=20"
```

## OTel Collector

```yaml
# otel-collector-config.yaml — Config de collector para production
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
        # Dropéa health check spans
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

## Patrones de Production Debugging

### Encontrando slow requests

```python
# Agregá custom attributes para identificar slow operations
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

### Trackeando errors a través de servicios

```python
# Agregá error details a spans para cross-service debugging
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

### Business context en traces

```python
# Agregá business-relevant attributes para filtrar en Jaeger/Zipkin
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

- Usá auto-instrumentation primero — cubre HTTP, database y cache calls automáticamente
- Agregá manual spans para business logic — auto-instrumentation no puede ver tu domain logic
- Usá semantic conventions — standard attribute names como `http.method`, `db.system`
- Seteá `service.name` y `service.version` en resource attributes — identifica el service en UI
- Usá tail-based sampling en production — capturá todos los errors y slow traces, sampleá el resto
- Agregá business context attributes — filtrá traces por user ID, order ID, o feature flag
- Mantené span attributes chicas — evitá poner payloads grandes en span attributes
- Usá span events para timed logs dentro de un span — más útil que separate log entries
- Propagá context a través de message queues — no breakes el trace en async boundaries
- Filtrá health check spans — poluyen trace data con noise

## Common Mistakes

- **No propagar context**: downstream service calls no carry el trace context, breakendo el trace. Siempre injectá/extraé context en service boundaries.
- **Demasiados spans**: crear un span para cada function call crea noise. Spanneá en service boundaries y significantes business operations.
- **Missing error recording**: exceptions son caught pero no recorded en el span. Usá `span.record_exception(e)` y seteá error status.
- **Usar solo head-based sampling**: te perdés todos los errors porque la sampling decision se hace antes de que el error ocurra. Usá tail-based sampling.
- **No resource attributes**: los spans aparecen como "unknown_service" en Jaeger. Siempre seteá `service.name`.

## FAQ

### ¿Qué es distributed tracing?

Un método de trackear un solo request mientras fluye a través de múltiples servicios. Cada service agrega un span al trace, creando un tree de spans que muestra el path completo del request con timing y status information.

### ¿Qué es OpenTelemetry?

Un CNCF project que provee vendor-neutral APIs, SDKs y collectors para distributed tracing, metrics y logs. Reemplaza proprietary instrumentation de Jaeger, Zipkin y otros tracing systems.

### ¿Head-based vs. tail-based sampling?

Head-based sampling decide al trace start si samplear — rápido pero no puede considerar errors. Tail-based sampling decide después de que el trace complete — puede samplear todos los errors y slow traces, pero requiere buffering traces en el collector.

### ¿Qué es un trace context?

El trace ID, span ID y trace flags propagados a través de service boundaries. W3C Trace Context es el format standard, pasado via `traceparent` y `tracestate` HTTP headers.

### ¿Cuánto overhead agrega tracing?

Con batch span processing y 10% sampling, el overhead es típicamente <1% CPU y <5MB memory por service. El OTel Collector agrega minimal latency (<1ms por span). Usá `memory_limiter` processor para prevenir OOM.
