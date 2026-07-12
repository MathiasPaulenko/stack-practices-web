---

contentType: patterns
slug: distributed-tracing-pattern
title: "Patrón Distributed Tracing"
description: "Cómo propagar trace context a través de service boundaries con OpenTelemetry. Cubre span creation, context propagation, sampling, y trace analysis."
metaDescription: "Propaga trace context across microservices con OpenTelemetry. Aprende span creation, W3C trace context, sampling strategies, y trace analysis."
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
  metaDescription: "Propaga trace context across microservices con OpenTelemetry. Aprende span creation, W3C trace context, sampling strategies, y trace analysis."
  keywords:
    - observability
    - distributed-tracing
    - opentelemetry
    - jaeger
    - zipkin
    - pattern

---

## Overview

El distributed tracing sigue un single request mientras fluye through múltiples services, creando un tree de spans donde cada span representa una unit de work. A diferencia de los correlation IDs (que solo taggean logs), el distributed tracing captura timing, causality, y context para cada step. OpenTelemetry es la standard implementation, usando W3C trace context headers (`traceparent`/`tracestate`) para propagar trace IDs across HTTP, gRPC, y message queue boundaries. El resultado es un visual timeline mostrando exactamente dónde se gasta tiempo y dónde ocurren errors across el entire request path.

## When to Use

- Arquitecturas de microservices donde los requests span múltiples services
- Performance debugging — identificar qué service en un chain es slow
- Error investigation — tracear el exact path de un failed request
- Service dependency mapping — entender qué services llaman a qué
- Latency optimization — encontrar el critical path y longest spans

## When NOT to Use

- Aplicaciones monolíticas — un single process no tiene distributed boundary
- Scripts simples o batch jobs sin inter-service calls
- Aplicaciones con muy bajo tráfico donde sampling provee insufficient data
- Cuando los correlation IDs en logs son sufficient para tus debugging needs

## Solution

### OpenTelemetry setup (Python)

```python
# Python — OpenTelemetry setup con OTLP exporter
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
# Python — automatic instrumentation para FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.asyncpg import AsyncPGInstrumentor
from fastapi import FastAPI

app = FastAPI()

# Auto-instrument HTTP server, HTTP client, y database
FastAPIInstrumentor.instrument_app(app)
HTTPXClientInstrumentor().instrument()
AsyncPGInstrumentor().instrument()

# Todos los HTTP requests, downstream calls, y DB queries se tracean automáticamente
@app.post("/api/orders")
async def create_order(request: OrderRequest):
    # Esto crea un span para el HTTP request
    # Downstream HTTP calls crean child spans
    # DB queries crean child spans
    order = await order_service.create(request)
    return order
```

### HTTP context propagation

```python
# Python — propagar trace context en HTTP headers
import httpx
from opentelemetry import trace, propagate
from opentelemetry.propagators.textmap import default_setter

async def call_payment_service(order_data: dict):
    headers = {}

    # Inject current trace context en headers
    propagate.inject(headers)

    # headers ahora contiene:
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

### Extract context en receiving side

```python
# Python — extract trace context del incoming request
from opentelemetry import trace, propagate
from fastapi import Request, FastAPI

app = FastAPI()

@app.middleware("http")
async def tracing_middleware(request: Request, call_next):
    # Extract trace context del incoming headers
    ctx = propagate.extract(request.headers)

    # Start un new span linked al parent del caller
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

### Node.js con OpenTelemetry

```javascript
// JavaScript — OpenTelemetry setup para Node.js
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
# Python — propagar trace context through RabbitMQ
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
        # Extract trace context del message headers
        ctx = propagate.extract(properties.headers or {})

        tracer = trace.get_tracer(__name__)
        with tracer.start_as_current_span("process_order_event", context=ctx) as span:
            order_data = json.loads(body)
            span.set_attribute("order.id", order_data['order_id'])
            span.set_attribute("event.type", "order.created")

            # Process el event — child spans se linked al original trace
            process_order(order_data)

    channel.basic_consume(queue='orders', on_message_callback=callback)
    channel.start_consuming()
```

### Span events y links

```python
# Python — span events para logging within spans
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

def process_refund(order_id, reason):
    with tracer.start_as_current_span("process_refund") as span:
        span.set_attribute("order.id", order_id)
        span.set_attribute("refund.reason", reason)

        # Add events (como structured log entries within un span)
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

# Head-based sampling — samplea al trace start
sampler = ParentBased(
    root=TraceIdRatioBased(rate=0.1),  # Samplear 10% de new traces
)

provider = TracerProvider(resource=resource, sampler=sampler)

# Tail-based sampling — samplea después de trace completion
# Configurado en OTel Collector, no en application code
# Permite sampling basado en trace characteristics (errors, slow traces)
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
      # Samplear todos los error traces
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      # Samplear 10% de successful traces
      - name: baseline
        type: probabilistic
        probabilistic:
          sampling_percentage: 10
      # Samplear todos los traces más lentos que 2 seconds
      - name: slow
        type: latency
        latency:
          threshold_ms: 2000
```

### Java Spring Boot instrumentation

```java
// Java — OpenTelemetry agent para automatic instrumentation
// Run con: java -javaagent:opentelemetry-javaagent.jar -jar app.jar

// Manual spans con OpenTelemetry API
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

### Trace context con gRPC

```python
# Python — gRPC interceptors para trace propagation
from opentelemetry.instrumentation.grpc import GrpcInstrumentorServer, GrpcInstrumentorClient

# Auto-instrument gRPC server y client
GrpcInstrumentorServer().instrument()
GrpcInstrumentorClient().instrument()

# Todos los gRPC calls propagan automáticamente trace context
# via grpc metadata: traceparent-bin, tracestate-bin
```

### Custom span attributes para business context

```python
# Python — enrich spans con business attributes
def process_order(order):
    with tracer.start_as_current_span("process_order") as span:
        # Technical attributes
        span.set_attribute("order.id", order.id)

        # Business attributes — queryable en Jaeger/Tempo
        span.set_attribute("order.product_category", order.category)
        span.set_attribute("order.region", order.region)
        span.set_attribute("order.payment_method", order.payment_method)
        span.set_attribute("order.item_count", len(order.items))
        span.set_attribute("order.total_usd", order.total)

        # Estos attributes se pueden usar para filtering en trace analysis
        # e.g., "show all traces where order.region = us-east AND order.total > 100"
```

## Best Practices


- For a deeper guide, see [Distributed Tracing: OpenTelemetry, Jaeger, Zipkin](/es/guides/complete-guide-distributed-tracing/).

- Usá automatic instrumentation first — cubre HTTP, DB, y messaging sin code changes
- Agregá manual spans para business logic — automatic instrumentation no sabe sobre tu domain
- Seteá meaningful span names — `process_order` no `span_123` o `function_1`
- Agregá business attributes — product category, region, payment method. Estos son queryable en trace analysis.
- Propagá context en todos lados — HTTP, gRPC, message queues. Missing propagation rompe el trace tree.
- Usá tail-based sampling — keepá todos los errors y slow traces, sampleá el resto
- Mantené spans short-lived — spans largos consumen memory. Breakelos en child spans.
- Recordá exceptions — usá `span.record_exception()` y `span.set_status(ERROR)` para failures

## Common Mistakes

- **No propagar context**: olvidar inject/extract trace context en service boundaries. El trace tree se rompe, mostrando disconnected spans.
- **Span names demasiado generic**: `handle_request` para cada endpoint. Usá specific names como `create_order`, `process_payment`.
- **Demasiados spans**: crear un span para cada function call. Esto crea noise y overhead. Focate en meaningful operations.
- **No record errors**: las exceptions se catchean pero no se recordan en el span. Usá `record_exception()` para capturar stack traces.
- **100% sampling en production**: tracear cada request crea enormous volume. Usá 1-10% sampling con tail-based selection de errors.

## FAQ

### ¿Qué es un span?

Un span representa una single operation dentro de un trace. Tiene un start time, duration, name, attributes, y parent span. Un trace es un tree de spans mostrando el full path de un request.

### ¿En qué se diferencia distributed tracing de correlation IDs?

Los correlation IDs taggean logs con un request ID. El distributed tracing captura timing, parent-child relationships, y attributes para cada operation. Tracing te muestra el timeline y causality, no solo qué logs belong together.

### ¿Qué es OpenTelemetry?

OpenTelemetry es el CNCF standard para telemetry (traces, metrics, logs). Provee APIs, SDKs, y auto-instrumentation para 12+ languages. Reemplazó OpenTracing y OpenCensus.

### ¿Qué sampling rate debería usar?

Para production: 1-10% head-based sampling, o tail-based sampling que keepá todos los errors y slow traces mientras samplea el resto. Para development: 100% sampling.

### ¿Qué es el W3C trace context?

El standard para propagar trace context across service boundaries usando `traceparent` y `tracestate` HTTP headers. OpenTelemetry usa esto por default para HTTP y gRPC.
