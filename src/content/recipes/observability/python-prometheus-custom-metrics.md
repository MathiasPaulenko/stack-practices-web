---
contentType: recipes
slug: python-prometheus-custom-metrics
title: "Expose Business Metrics with Prometheus"
description: "How to expose custom business metrics in Python using prometheus_client, including counters, gauges, histograms, summaries, and Flask integration."
metaDescription: "Expose custom business metrics in Python with prometheus_client. Track counters, gauges, histograms, summaries, and integrate with Flask or FastAPI."
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
  metaDescription: "Expose custom business metrics in Python with prometheus_client. Track counters, gauges, histograms, summaries, and integrate with Flask or FastAPI."
  keywords:
    - observability
    - python
    - prometheus
    - metrics
    - flask
    - recipe
---

## Overview

`prometheus_client` is the official Python library for exposing Prometheus metrics. It maintains metric values in memory and exposes them via an HTTP endpoint in Prometheus text format. A Prometheus server scrapes this endpoint at regular intervals and stores the time series data for querying with PromQL and visualizing in Grafana.

## When to Use

- Tracking business metrics (orders placed, active users, revenue)
- Measuring operation latency (API response times, database query durations)
- Monitoring resource pools (connection count, queue depth, cache hit rate)
- Setting up alerts in Prometheus/Grafana based on application metrics
- Building dashboards for SLO tracking (error rate, p99 latency)

## When NOT to Use

- Simple scripts — metrics add overhead and a scrape endpoint
- Applications without a Prometheus server — metrics are useless without a scraper
- High-cardinality data — Prometheus handles low-cardinality labels well, but thousands of label values cause memory issues

## Solution

### Setup

```bash
pip install prometheus_client
```

### Counter — count events

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

# Increment
orders_created.labels(type="standard", status="success").inc()
orders_created.labels(type="standard", status="success").inc(5)  # +5
orders_failed.labels(reason="payment_declined").inc()
```

### Gauge — track current value

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

# Set value
active_connections.labels(pool="primary").set(15)
active_connections.labels(pool="primary").inc()
active_connections.labels(pool="primary").dec()

queue_depth.labels(queue_name="order-processing").set(42)
```

### Histogram — track distribution of values

```python
from prometheus_client import Histogram

request_duration = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

# Observe a value
request_duration.labels(method="GET", endpoint="/api/users").observe(0.045)
request_duration.labels(method="POST", endpoint="/api/orders").observe(0.120)
```

### Summary — track quantiles

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

### Using decorators

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

### Context manager for timing

```python
from prometheus_client import Histogram

DB_QUERY_DURATION = Histogram(
    "db_query_duration_seconds",
    "Database query duration",
    ["operation"],
)

def find_users():
    with DB_QUERY_DURATION.labels(operation="find_users").time():
        # ... execute query ...
        return results
```

### Flask integration

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

### FastAPI integration

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

### Starting a metrics server on a separate port

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

### Custom collector

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

### Using `prometheus_client` with Django

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

### Using with Celery

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
        # ... process ...
        TASK_COUNT.labels(task_name="process_order", status="success").inc()
    except Exception:
        TASK_COUNT.labels(task_name="process_order", status="failed").inc()
        raise
```

## Best Practices

- Use `_total` suffix for counters — Prometheus convention
- Use `_seconds` suffix for time-based metrics
- Keep label cardinality low — avoid user IDs, request IDs, or other high-cardinality values
- Use histograms for latency — they allow computing p50, p95, p99 in PromQL
- Use summaries only when you need client-side quantiles — histograms are more flexible
- Expose `/metrics` on a separate port in production — don't expose it on the app port
- Use decorators or middleware for automatic request metrics — don't instrument every handler manually

## Common Mistakes

- **High-cardinality labels**: labeling with `user_id` or `request_id` creates a new time series per value. Prometheus memory explodes.
- **Not using `_total` suffix for counters**: Prometheus expects counters to end in `_total`. Without it, PromQL `rate()` doesn't work correctly.
- **Creating metrics in hot paths**: defining `Counter(...)` inside a request handler creates a new metric each time. Define once at module level.
- **Using gauges for counts**: gauges can go down. Use counters for monotonically increasing values.
- **Not exposing the `/metrics` endpoint**: without the endpoint, Prometheus can't scrape. Always add the route.

## FAQ

### What is the difference between a histogram and a summary?

Histograms bucket values and let you compute quantiles server-side with `histogram_quantile()`. Summaries compute quantiles client-side. Histograms are preferred because you can aggregate across instances.

### How do I scrape metrics with Prometheus?

Add a scrape config in `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: "python-app"
    static_configs:
      - targets: ["localhost:9090"]
```

### How do I compute error rate in PromQL?

```promql
rate(api_requests_total{status="500"}[5m]) / rate(api_requests_total[5m])
```

### Can I use prometheus_client with async frameworks?

Yes. The library is thread-safe and works with asyncio. For async timing, use `time.monotonic()` manually:

```python
start = time.monotonic()
await do_work()
DURATION.observe(time.monotonic() - start)
```

### How do I reset metrics for testing?

Use `prometheus_client.REGISTRY` to unregister collectors:

```python
from prometheus_client import REGISTRY
for collector in list(REGISTRY._collector_to_names.keys()):
    REGISTRY.unregister(collector)
```
