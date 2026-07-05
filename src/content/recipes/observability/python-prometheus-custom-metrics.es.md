---
contentType: recipes
slug: python-prometheus-custom-metrics
title: "Exponer Métricas de Negocio con Prometheus"
description: "Cómo exponer métricas de negocio personalizadas en Python usando prometheus_client, incluyendo counters, gauges, histograms, summaries e integración con Flask."
metaDescription: "Expon métricas de negocio personalizadas en Python con prometheus_client. Trackea counters, gauges, histograms, summaries e integra con Flask o FastAPI."
difficulty: intermediate
topics:
  - observability
tags:
  - observability
  - python
  - prometheus
  - metrics
  - flask
  - recipe
relatedResources:
  - /recipes/observability/java-micrometer-prometheus
  - /recipes/observability/python-structured-logging-json
  - /recipes/observability/python-opentelemetry-tracing
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Expon métricas de negocio personalizadas en Python con prometheus_client. Trackea counters, gauges, histograms, summaries e integra con Flask o FastAPI."
  keywords:
    - observability
    - python
    - prometheus
    - metrics
    - flask
    - recipe
---

## Overview

`prometheus_client` es la librería oficial de Python para exponer métricas de Prometheus. Mantiene valores de métricas en memoria y las expone via un endpoint HTTP en formato de texto Prometheus. Un servidor Prometheus scrapear este endpoint a intervalos regulares y almacena las time series data para consultar con PromQL y visualizar en Grafana.

## When to Use

- Trackear métricas de negocio (órdenes creadas, usuarios activos, revenue)
- Medir latencia de operaciones (API response times, database query durations)
- Monitorear pools de recursos (connection count, queue depth, cache hit rate)
- Setear alerts en Prometheus/Grafana basadas en métricas de aplicación
- Construir dashboards para SLO tracking (error rate, p99 latency)

## When NOT to Use

- Scripts simples — las métricas añaden overhead y un endpoint de scrape
- Aplicaciones sin un servidor Prometheus — las métricas son inútiles sin un scraper
- Datos de cardinalidad alta — Prometheus maneja bien labels de baja cardinalidad, pero miles de valores de label causan problemas de memoria

## Solution

### Setup

```bash
pip install prometheus_client
```

### Counter — contar eventos

```python
from prometheus_client import Counter

orders_created = Counter(
    "orders_created_total",
    "Total orders created",
    ["type", "status"],
)

orders_failed = Counter(
    "orders_failed_total",
    "Total orders that failed processing",
    ["reason"],
)

# Incrementar
orders_created.labels(type="standard", status="success").inc()
orders_created.labels(type="standard", status="success").inc(5)  # +5
orders_failed.labels(reason="payment_declined").inc()
```

### Gauge — trackear valor actual

```python
from prometheus_client import Gauge

active_connections = Gauge(
    "db_active_connections",
    "Current active database connections",
    ["pool"],
)

queue_depth = Gauge(
    "queue_depth",
    "Current queue depth",
    ["queue_name"],
)

# Setear valor
active_connections.labels(pool="primary").set(15)
active_connections.labels(pool="primary").inc()
active_connections.labels(pool="primary").dec()

queue_depth.labels(queue_name="order-processing").set(42)
```

### Histogram — trackear distribución de valores

```python
from prometheus_client import Histogram

request_duration = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

# Observar un valor
request_duration.labels(method="GET", endpoint="/api/users").observe(0.045)
request_duration.labels(method="POST", endpoint="/api/orders").observe(0.120)
```

### Summary — trackear quantiles

```python
from prometheus_client import Summary

payment_processing_time = Summary(
    "payment_processing_seconds",
    "Time spent processing payments",
    ["provider"],
)

payment_processing_time.labels(provider="stripe").observe(0.350)
payment_processing_time.labels(provider="paypal").observe(0.500)
```

### Usar decoradores

```python
from prometheus_client import Counter, Histogram, Summary

REQUEST_COUNT = Counter(
    "api_requests_total",
    "Total API requests",
    ["method", "endpoint", "status"],
)

REQUEST_DURATION = Histogram(
    "api_request_duration_seconds",
    "API request duration",
    ["method", "endpoint"],
)

@REQUEST_DURATION.labels(method="GET", endpoint="/api/users")
@REQUEST_COUNT.labels(method="GET", endpoint="/api/users", status="200")
def get_users():
    # ... fetch users ...
    return users
```

### Context manager para timing

```python
from prometheus_client import Histogram

DB_QUERY_DURATION = Histogram(
    "db_query_duration_seconds",
    "Database query duration",
    ["operation"],
)

def find_users():
    with DB_QUERY_DURATION.labels(operation="find_users").time():
        # ... ejecutar query ...
        return results
```

### Integración con Flask

```python
from flask import Flask, request, Response
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
import time

app = Flask(__name__)

REQUEST_COUNT = Counter(
    "api_requests_total",
    "Total API requests",
    ["method", "endpoint", "status"],
)

REQUEST_DURATION = Histogram(
    "api_request_duration_seconds",
    "API request duration",
    ["method", "endpoint"],
)

@app.before_request
def before_request():
    request.start_time = time.time()

@app.after_request
def after_request(response):
    duration = time.time() - request.start_time
    endpoint = request.endpoint or "unknown"
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=endpoint,
        status=response.status_code,
    ).inc()
    REQUEST_DURATION.labels(
        method=request.method,
        endpoint=endpoint,
    ).observe(duration)
    return response

@app.route("/metrics")
def metrics():
    return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)

@app.route("/api/users/<user_id>")
def get_user(user_id):
    return {"id": user_id, "name": "Alice"}
```

### Integración con FastAPI

```python
from fastapi import FastAPI, Request, Response
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
import time

app = FastAPI()

REQUEST_COUNT = Counter(
    "api_requests_total",
    "Total API requests",
    ["method", "endpoint", "status"],
)

REQUEST_DURATION = Histogram(
    "api_request_duration_seconds",
    "API request duration",
    ["method", "endpoint"],
)

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code,
    ).inc()
    REQUEST_DURATION.labels(
        method=request.method,
        endpoint=request.url.path,
    ).observe(duration)

    return response

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
```

### Arrancar un metrics server en un puerto separado

```python
from prometheus_client import start_http_server, Counter
import time

REQUESTS = Counter("api_requests_total", "Total API requests")

if __name__ == "__main__":
    start_http_server(9090)
    while True:
        REQUESTS.inc()
        time.sleep(1)
```

### Collector personalizado

```python
from prometheus_client.core import GaugeMetricFamily, CounterMetricFamily, REGISTRY

class CustomCollector:
    def collect(self):
        # Gauge
        g = GaugeMetricFamily(
            "queue_depth",
            "Current queue depth",
            labels=["queue_name"],
        )
        g.add_metric(["order-processing"], get_queue_depth("order-processing"))
        g.add_metric(["email-sending"], get_queue_depth("email-sending"))
        yield g

        # Counter
        c = CounterMetricFamily(
            "messages_processed_total",
            "Total messages processed",
            labels=["queue_name", "status"],
        )
        c.add_metric(["order-processing", "success"], get_processed_count("order-processing", "success"))
        yield c

REGISTRY.register(CustomCollector())
```

## Variants

### Usar `prometheus_client` con Django

```python
# metrics.py
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
from django.http import HttpResponse

REQUEST_COUNT = Counter("django_requests_total", "Total Django requests", ["method", "path"])

class MetricsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        REQUEST_COUNT.labels(method=request.method, path=request.path).inc()
        return response

def metrics_view(request):
    return HttpResponse(generate_latest(), content_type=CONTENT_TYPE_LATEST)
```

### Usar con Celery

```python
from prometheus_client import Counter, Histogram
from celery import Celery

app = Celery("tasks", broker="redis://localhost:6379")

TASK_COUNT = Counter("celery_tasks_total", "Total Celery tasks", ["task_name", "status"])
TASK_DURATION = Histogram("celery_task_duration_seconds", "Celery task duration", ["task_name"])

@app.task
@TASK_DURATION.labels(task_name="process_order").time()
def process_order(order_id):
    try:
        # ... procesar ...
        TASK_COUNT.labels(task_name="process_order", status="success").inc()
    except Exception:
        TASK_COUNT.labels(task_name="process_order", status="failed").inc()
        raise
```

## Best Practices

- Usa el sufijo `_total` para counters — convención de Prometheus
- Usa el sufijo `_seconds` para métricas basadas en tiempo
- Mantén la cardinalidad de labels baja — evita user IDs, request IDs u otros valores de alta cardinalidad
- Usa histograms para latencia — permiten computar p50, p95, p99 en PromQL
- Usa summaries solo cuando necesitas quantiles client-side — los histograms son más flexibles
- Expone `/metrics` en un puerto separado en producción — no lo expongas en el puerto de la app
- Usa decoradores o middleware para métricas automáticas de request — no instrumentes cada handler manualmente

## Common Mistakes

- **Labels de alta cardinalidad**: labelar con `user_id` o `request_id` crea una nueva time series por valor. La memoria de Prometheus explota.
- **No usar sufijo `_total` para counters**: Prometheus espera que los counters terminen en `_total`. Sin él, `rate()` de PromQL no funciona correctamente.
- **Crear métricas en hot paths**: definir `Counter(...)` dentro de un request handler crea una nueva métrica cada vez. Define una vez a nivel de módulo.
- **Usar gauges para counts**: los gauges pueden bajar. Usa counters para valores monotonically increasing.
- **No exponer el endpoint `/metrics`**: sin el endpoint, Prometheus no puede scrapear. Siempre agrega la ruta.

## FAQ

### ¿Cuál es la diferencia entre un histogram y un summary?

Los histograms bucketean valores y te permiten computar quantiles server-side con `histogram_quantile()`. Los summaries computan quantiles client-side. Los histograms son preferidos porque puedes agregar a través de instancias.

### ¿Cómo scrapeo métricas con Prometheus?

Agrega una config de scrape en `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: "python-app"
    static_configs:
      - targets: ["localhost:9090"]
```

### ¿Cómo computo error rate en PromQL?

```promql
rate(api_requests_total{status="500"}[5m]) / rate(api_requests_total[5m])
```

### ¿Puedo usar prometheus_client con frameworks async?

Sí. La librería es thread-safe y funciona con asyncio. Para timing async, usa `time.monotonic()` manualmente:

```python
start = time.monotonic()
await do_work()
DURATION.observe(time.monotonic() - start)
```

### ¿Cómo reseteo métricas para testing?

Usa `prometheus_client.REGISTRY` para desregistrar collectors:

```python
from prometheus_client import REGISTRY
for collector in list(REGISTRY._collector_to_names.keys()):
    REGISTRY.unregister(collector)
```
