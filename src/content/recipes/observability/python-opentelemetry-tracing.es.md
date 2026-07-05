---
contentType: recipes
slug: python-opentelemetry-tracing
title: "Distributed Tracing con OpenTelemetry"
description: "Cómo implementar distributed tracing en Python con OpenTelemetry SDK, incluyendo spans, propagación de context, auto-instrumentación y export a Jaeger."
metaDescription: "Implementa distributed tracing en Python con OpenTelemetry SDK. Crea spans, propaga context entre servicios, auto-instrumenta Flask y requests."
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
  metaDescription: "Implementa distributed tracing en Python con OpenTelemetry SDK. Crea spans, propaga context entre servicios, auto-instrumenta Flask y requests."
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

OpenTelemetry es el estándar CNCF para distributed tracing. Proporciona un SDK para crear spans (unidades de trabajo) y traces (un árbol de spans a través de servicios). Cuando un request fluye a través de múltiples microservicios, OpenTelemetry propaga el trace context via headers, para que puedas ver el path completo en un UI como Jaeger o Zipkin.

## When to Use

- Microservicios donde necesitas trazar un request a través de boundaries de servicio
- Identificar bottlenecks de latencia en un sistema distribuido (¿qué servicio es lento?)
- Debuggear errores que span múltiples servicios (¿dónde falló el request?)
- Medir el tiempo gastado en cada parte de un request (base de datos, API externa, queue)
- Correlacionar logs a través de servicios via trace IDs

## When NOT to Use

- Aplicaciones monolíticas — usa un profiler (py-spy, cProfile) en su lugar
- Scripts simples o CLI tools — tracing añade overhead y configuración
- Aplicaciones sin un trace backend (Jaeger, Zipkin, Tempo) — los spans son inútiles sin visualización

## Solution

### Setup

```bash
pip install opentelemetry-api opentelemetry-sdk
pip install opentelemetry-exporter-jaeger
pip install opentelemetry-instrumentation-flask
pip install opentelemetry-instrumentation-requests
```

### Creación básica de span

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.resources import Resource

# Configurar tracer
resource = Resource.create({"service.name": "user-service"})
provider = TracerProvider(resource=resource)
jaeger_exporter = JaegerExporter(
    agent_host_name="localhost",
    agent_port=6831,
)
provider.add_span_processor(BatchSpanProcessor(jaeger_exporter))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)

# Crear spans
with tracer.start_as_current_span("process_order") as span:
    span.set_attribute("order.id", "ord-123")
    span.set_attribute("order.total", 99.99)

    with tracer.start_as_current_span("validate_payment"):
        span.set_attribute("payment.method", "credit_card")
        # ... lógica de validación ...

    with tracer.start_as_current_span("save_to_database"):
        span.set_attribute("db.operation", "INSERT")
        # ... guardado en DB ...
```

### Auto-instrumentación para Flask

```python
from flask import Flask
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()

@app.route("/api/users/<user_id>")
def get_user(user_id):
    # La auto-instrumentación de Flask crea un span para este request
    # con method, path, status code y duration
    response = requests.get(f"https://api.example.com/users/{user_id}")
    # La auto-instrumentación de requests crea un child span para la llamada HTTP
    return response.json()
```

### Propagación manual de context entre servicios

```python
import requests
from opentelemetry import trace, propagate

tracer = trace.get_tracer(__name__)

def call_external_service(url: str, data: dict):
    with tracer.start_as_current_span("call_external") as span:
        headers = {"Content-Type": "application/json"}

        # Injectar trace context en headers
        propagate.inject(headers)

        span.set_attribute("http.url", url)
        response = requests.post(url, json=data, headers=headers)
        span.set_attribute("http.status_code", response.status_code)

        return response.json()
```

El servicio receptor extrae el context:

```python
from flask import Flask, request
from opentelemetry import propagate, trace

app = Flask(__name__)

@app.before_request
def extract_context():
    ctx = propagate.extract(dict(request.headers))
    token = trace.set_span_in_context(trace.get_tracer(__name__).start_span("handle_request"))
    # El context ahora está vinculado al trace entrante
```

### Agregar eventos y excepciones a spans

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

### Attributes y resources personalizados

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

# Cada span de este servicio incluye estos resource attributes
with tracer.start_as_current_span("create_order") as span:
    span.set_attribute("order.customer_id", 42)
    span.set_attribute("order.items", 3)
    span.set_attribute("order.total", 149.98)
```

### Usar OTLP exporter en lugar de Jaeger

```python
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

otlp_exporter = OTLPSpanExporter(
    endpoint="http://localhost:4317",
    insecure=True,
)
provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
```

### Instrumentar queries de SQLAlchemy

```python
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from sqlalchemy import create_engine

engine = create_engine("postgresql://user:pass@localhost/mydb")
SQLAlchemyInstrumentor().instrument(engine=engine)

# Cada query ahora crea un span con el SQL statement y duration
```

### Instrumentar Redis

```python
from opentelemetry.instrumentation.redis import RedisInstrumentor
import redis

RedisInstrumentor().instrument()
client = redis.Redis(host="localhost", port=6379)

# Cada comando de Redis crea un span
client.set("key", "value")
value = client.get("key")
```

## Variants

### Usar OpenTelemetry con FastAPI

```python
from fastapi import FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

app = FastAPI()
FastAPIInstrumentor.instrument_app(app)

@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    return {"id": user_id, "name": "Alice"}
```

### Usar OpenTelemetry con Celery

```python
from opentelemetry.instrumentation.celery import CeleryInstrumentor
from celery import Celery

CeleryInstrumentor().instrument()

app = Celery("tasks", broker="redis://localhost:6379")

@app.task
def process_order(order_id: str):
    # Cada ejecución de task crea un span
    with tracer.start_as_current_span("process_order_task"):
        # ... procesar ...
        pass
```

### Configuración de sampling

```python
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased

# Samplear 10% de traces en producción
sampler = TraceIdRatioBased(0.1)
provider = TracerProvider(resource=resource, sampler=sampler)
```

## Best Practices

- Usa auto-instrumentación primero — cubre Flask, requests, SQLAlchemy, Redis sin cambios de código
- Agrega spans manuales para lógica de negocio que la auto-instrumentación no puede ver (e.g., "validate_order", "calculate_pricing")
- Setea `service.name` en el resource — identifica tu servicio en Jaeger
- Usa `span.record_exception()` y `span.set_status(ERROR)` en catch blocks — los errores aparecen en el trace UI
- Mantén los span attributes de baja cardinalidad — no uses user IDs o request IDs como attributes
- Usa `BatchSpanProcessor` en producción — batchea y envía spans async
- Usa `TraceIdRatioBased(0.1)` sampling en producción de alto tráfico — 100% sampling es para desarrollo

## Common Mistakes

- **No propagar context**: si no injectas/extraes los trace headers, los spans de diferentes servicios no se vincularán en un solo trace.
- **Crear demasiados spans**: un span por iteración de loop crea miles de spans. Envuelve el loop, no cada iteración.
- **No setear status de error**: catchear una excepción sin `span.set_status(ERROR)` oculta fallos en el trace UI.
- **Usar AlwaysOn sampler en producción**: 100% sampling a alto tráfico abruma el trace backend. Usa sampling basado en ratio.
- **Olvidar instrumentar llamadas HTTP salientes**: sin `RequestsInstrumentor`, las llamadas a otros servicios no crean child spans.

## FAQ

### ¿Cuál es la diferencia entre un span y un trace?

Un span es una unidad de trabajo (e.g., "database_query"). Un trace es un árbol de spans que representa un path completo de request a través de servicios. Un trace tiene un trace ID único; cada span tiene su propio span ID y un parent span ID.

### ¿Cómo veo traces?

Corre Jaeger localmente:

```bash
docker run -d -p 16686:16686 -p 6831:6831/udp jaegertracing/all-in-one:1.55
```

Abre `http://localhost:16686` y busca traces por service name.

### ¿Qué es OTLP vs Jaeger exporter?

OTLP es el OpenTelemetry Protocol — un formato vendor-neutral. El Jaeger exporter envía directamente a Jaeger. OTLP es recomendado para nuevos setups porque funciona con cualquier backend compatible con OTLP (Tempo, Honeycomb, Datadog).

### ¿Puedo usar OpenTelemetry con Django?

Sí. Usa `opentelemetry-instrumentation-django`:

```python
from opentelemetry.instrumentation.django import DjangoInstrumentor
DjangoInstrumentor().instrument()
```

Agrega esto a tu `wsgi.py` o `manage.py` antes de que Django procese requests.

### ¿Cómo correlaciono traces con logs?

Extrae el trace ID e inyéctalo en tu log context:

```python
from opentelemetry import trace

span = trace.get_current_span()
trace_id = format(span.get_span_context().trace_id, "032x")
span_id = format(span.get_span_context().span_id, "016x")

logger.info("processing_order", trace_id=trace_id, span_id=span_id, order_id="ord-123")
```
