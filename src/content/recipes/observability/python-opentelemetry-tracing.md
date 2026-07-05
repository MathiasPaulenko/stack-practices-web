---
contentType: recipes
slug: python-opentelemetry-tracing
title: "Distributed Tracing with OpenTelemetry"
description: "How to implement distributed tracing in Python with OpenTelemetry SDK, including spans, context propagation, auto-instrumentation, and Jaeger export."
metaDescription: "Implement distributed tracing in Python with OpenTelemetry SDK. Create spans, propagate context across services, auto-instrument Flask and requests."
difficulty: advanced
topics:
  - observability
tags:
  - observability
  - python
  - opentelemetry
  - tracing
  - distributed
  - jaeger
  - recipe
relatedResources:
  - /recipes/observability/python-structured-logging-json
  - /recipes/observability/python-prometheus-custom-metrics
  - /recipes/observability/java-micrometer-prometheus
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement distributed tracing in Python with OpenTelemetry SDK. Create spans, propagate context across services, auto-instrument Flask and requests."
  keywords:
    - observability
    - python
    - opentelemetry
    - tracing
    - distributed
    - jaeger
    - recipe
---

## Overview

OpenTelemetry is the CNCF standard for distributed tracing. It provides a SDK to create spans (units of work) and traces (a tree of spans across services). When a request flows through multiple microservices, OpenTelemetry propagates the trace context via headers, so you can see the full path in a UI like Jaeger or Zipkin.

## When to Use

- Microservices where you need to trace a request across service boundaries
- Identifying latency bottlenecks in a distributed system (which service is slow?)
- Debugging errors that span multiple services (where did the request fail?)
- Measuring the time spent in each part of a request (database, external API, queue)
- Correlating logs across services via trace IDs

## When NOT to Use

- Monolithic applications — use a profiler (py-spy, cProfile) instead
- Simple scripts or CLI tools — tracing adds overhead and configuration
- Applications without a trace backend (Jaeger, Zipkin, Tempo) — spans are useless without visualization

## Solution

### Setup

```bash
pip install opentelemetry-api opentelemetry-sdk
pip install opentelemetry-exporter-jaeger
pip install opentelemetry-instrumentation-flask
pip install opentelemetry-instrumentation-requests
```

### Basic span creation

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.resources import Resource

# Configure tracer
resource = Resource.create({"service.name": "user-service"})
provider = TracerProvider(resource=resource)
jaeger_exporter = JaegerExporter(
    agent_host_name="localhost",
    agent_port=6831,
)
provider.add_span_processor(BatchSpanProcessor(jaeger_exporter))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)

# Create spans
with tracer.start_as_current_span("process_order") as span:
    span.set_attribute("order.id", "ord-123")
    span.set_attribute("order.total", 99.99)

    with tracer.start_as_current_span("validate_payment"):
        span.set_attribute("payment.method", "credit_card")
        # ... validation logic ...

    with tracer.start_as_current_span("save_to_database"):
        span.set_attribute("db.operation", "INSERT")
        # ... database save ...
```

### Auto-instrumentation for Flask

```python
from flask import Flask
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()

@app.route("/api/users/<user_id>")
def get_user(user_id):
    # Flask auto-instrumentation creates a span for this request
    # with method, path, status code, and duration
    response = requests.get(f"https://api.example.com/users/{user_id}")
    # requests auto-instrumentation creates a child span for the HTTP call
    return response.json()
```

### Manual context propagation across services

```python
import requests
from opentelemetry import trace, propagate

tracer = trace.get_tracer(__name__)

def call_external_service(url: str, data: dict):
    with tracer.start_as_current_span("call_external") as span:
        headers = {"Content-Type": "application/json"}

        # Inject trace context into headers
        propagate.inject(headers)

        span.set_attribute("http.url", url)
        response = requests.post(url, json=data, headers=headers)
        span.set_attribute("http.status_code", response.status_code)

        return response.json()
```

The receiving service extracts the context:

```python
from flask import Flask, request
from opentelemetry import propagate, trace

app = Flask(__name__)

@app.before_request
def extract_context():
    ctx = propagate.extract(dict(request.headers))
    token = trace.set_span_in_context(trace.get_tracer(__name__).start_span("handle_request"))
    # Context is now linked to the incoming trace
```

### Adding span events and exceptions

```python
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

tracer = trace.get_tracer(__name__)

def process_payment(order_id: str):
    with tracer.start_as_current_span("process_payment") as span:
        span.set_attribute("order.id", order_id)

        try:
            result = charge_card(order_id)
            span.add_event("payment_succeeded", {"amount": result.amount})
            return result
        except PaymentError as e:
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
            raise
```

### Custom span attributes and resources

```python
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION

resource = Resource.create({
    SERVICE_NAME: "order-service",
    SERVICE_VERSION: "1.2.0",
    "deployment.environment": "production",
    "host.name": "order-api-01",
})

provider = TracerProvider(resource=resource)
trace.set_tracer_provider(provider)

# Every span from this service includes these resource attributes
with tracer.start_as_current_span("create_order") as span:
    span.set_attribute("order.customer_id", 42)
    span.set_attribute("order.items", 3)
    span.set_attribute("order.total", 149.98)
```

### Using OTLP exporter instead of Jaeger

```python
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

otlp_exporter = OTLPSpanExporter(
    endpoint="http://localhost:4317",
    insecure=True,
)
provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
```

### Instrumenting SQLAlchemy queries

```python
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from sqlalchemy import create_engine

engine = create_engine("postgresql://user:pass@localhost/mydb")
SQLAlchemyInstrumentor().instrument(engine=engine)

# Every query now creates a span with the SQL statement and duration
```

### Instrumenting Redis

```python
from opentelemetry.instrumentation.redis import RedisInstrumentor
import redis

RedisInstrumentor().instrument()
client = redis.Redis(host="localhost", port=6379)

# Every Redis command creates a span
client.set("key", "value")
value = client.get("key")
```

## Variants

### Using OpenTelemetry with FastAPI

```python
from fastapi import FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

app = FastAPI()
FastAPIInstrumentor.instrument_app(app)

@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    return {"id": user_id, "name": "Alice"}
```

### Using OpenTelemetry with Celery

```python
from opentelemetry.instrumentation.celery import CeleryInstrumentor
from celery import Celery

CeleryInstrumentor().instrument()

app = Celery("tasks", broker="redis://localhost:6379")

@app.task
def process_order(order_id: str):
    # Each task execution creates a span
    with tracer.start_as_current_span("process_order_task"):
        # ... process ...
        pass
```

### Sampling configuration

```python
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased

# Sample 10% of traces in production
sampler = TraceIdRatioBased(0.1)
provider = TracerProvider(resource=resource, sampler=sampler)
```

## Best Practices

- Use auto-instrumentation first — it covers Flask, requests, SQLAlchemy, Redis without code changes
- Add manual spans for business logic that auto-instrumentation can't see (e.g., "validate_order", "calculate_pricing")
- Set `service.name` in the resource — it identifies your service in Jaeger
- Use `span.record_exception()` and `span.set_status(ERROR)` in catch blocks — errors appear in the trace UI
- Keep span attributes low-cardinality — don't use user IDs or request IDs as attributes
- Use `BatchSpanProcessor` in production — it batches and sends spans asynchronously
- Use `TraceIdRatioBased(0.1)` sampling in high-traffic production — 100% sampling is for development

## Common Mistakes

- **Not propagating context**: if you don't inject/extract trace headers, spans from different services won't link into a single trace.
- **Creating too many spans**: a span per loop iteration creates thousands of spans. Wrap the loop, not each iteration.
- **Not setting error status**: catching an exception without `span.set_status(ERROR)` hides failures in the trace UI.
- **Using AlwaysOn sampler in production**: 100% sampling at high traffic overwhelms the trace backend. Use ratio-based sampling.
- **Forgetting to instrument outgoing HTTP calls**: without `RequestsInstrumentor`, calls to other services don't create child spans.

## FAQ

### What is the difference between a span and a trace?

A span is a single unit of work (e.g., "database_query"). A trace is a tree of spans that represents a full request path across services. A trace has a unique trace ID; each span has its own span ID and a parent span ID.

### How do I view traces?

Run Jaeger locally:

```bash
docker run -d -p 16686:16686 -p 6831:6831/udp jaegertracing/all-in-one:1.55
```

Open `http://localhost:16686` and search for traces by service name.

### What is OTLP vs Jaeger exporter?

OTLP is the OpenTelemetry Protocol — a vendor-neutral format. Jaeger exporter sends directly to Jaeger. OTLP is recommended for new setups because it works with any OTLP-compatible backend (Tempo, Honeycomb, Datadog).

### Can I use OpenTelemetry with Django?

Yes. Use `opentelemetry-instrumentation-django`:

```python
from opentelemetry.instrumentation.django import DjangoInstrumentor
DjangoInstrumentor().instrument()
```

Add this to your `wsgi.py` or `manage.py` before Django processes requests.

### How do I correlate traces with logs?

Extract the trace ID and inject it into your log context:

```python
from opentelemetry import trace

span = trace.get_current_span()
trace_id = format(span.get_span_context().trace_id, "032x")
span_id = format(span.get_span_context().span_id, "016x")

logger.info("processing_order", trace_id=trace_id, span_id=span_id, order_id="ord-123")
```
