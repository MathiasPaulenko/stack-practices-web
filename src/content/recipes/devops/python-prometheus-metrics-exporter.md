---
contentType: recipes
slug: python-prometheus-metrics-exporter
title: "Expose Custom Application Metrics with Python and Prometheus"
description: "Build a custom Prometheus metrics exporter in Python using prometheus_client for counters, gauges, histograms, and summaries."
metaDescription: "Build a custom Prometheus exporter in Python with prometheus_client. Expose counters, gauges, histograms, summaries, and custom metrics endpoints."
difficulty: intermediate
topics:
  - devops
  - observability
tags:
  - python
  - prometheus
  - metrics
  - observability
  - monitoring
  - prometheus-client
relatedResources:
  - /recipes/devops/docker-logging-fluentd
  - /recipes/devops/docker-health-check-configuration
  - /guides/observability-guide
  - /guides/structured-logging-guide
  - /patterns/health-check-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Build a custom Prometheus exporter in Python with prometheus_client. Expose counters, gauges, histograms, summaries, and custom metrics endpoints."
  keywords:
    - python prometheus exporter
    - prometheus_client python
    - custom metrics prometheus
    - python monitoring metrics
    - prometheus counter gauge histogram
    - application metrics python
---

## Overview

Prometheus is a pull-based monitoring system. Your application exposes a `/metrics` endpoint, and Prometheus scrapes it at regular intervals. The `prometheus_client` Python library provides built-in metric types (counter, gauge, histogram, summary) and an HTTP server to expose them. This recipe shows how to instrument a Python app with custom metrics.

## When to Use

- You need application-level metrics (request count, latency, queue depth)
- You use Prometheus or Grafana for monitoring and alerting
- You want to track custom business metrics (active users, orders processed)
- You need to expose metrics from a Python service for scraping

## Solution

### Basic metrics endpoint

```python
from prometheus_client import start_http_server, Counter, Gauge, Histogram
import time
import random

# Define metrics
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"]
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

ACTIVE_CONNECTIONS = Gauge(
    "active_connections",
    "Number of active connections"
)

QUEUE_DEPTH = Gauge(
    "queue_depth",
    "Number of items in the processing queue",
    ["queue_name"]
)

def handle_request(method: str, endpoint: str):
    start = time.time()
    status = 200

    try:
        time.sleep(random.uniform(0.01, 0.3))
        if random.random() < 0.05:
            status = 500
    except Exception:
        status = 500

    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=str(status)).inc()
    REQUEST_LATENCY.labels(endpoint=endpoint).observe(time.time() - start)

if __name__ == "__main__":
    start_http_server(8000)  # Metrics on port 8000
    print("Metrics server on http://localhost:8000/metrics")

    while True:
        handle_request("GET", "/api/users")
        handle_request("POST", "/api/orders")
        ACTIVE_CONNECTIONS.set(random.randint(1, 50))
        QUEUE_DEPTH.labels(queue_name="email").set(random.randint(0, 100))
        time.sleep(0.1)
```

### Integrating with Flask

```python
from flask import Flask, request
from prometheus_client import Counter, Histogram, make_wsgi_app
from werkzeug.middleware.dispatcher import DispatcherMiddleware
import time

app = Flask(__name__)

REQUEST_COUNT = Counter(
    "flask_requests_total",
    "Total Flask requests",
    ["method", "endpoint", "status"]
)

REQUEST_LATENCY = Histogram(
    "flask_request_duration_seconds",
    "Flask request latency",
    ["endpoint"]
)

@app.before_request
def before_request():
    request.start_time = time.time()

@app.after_request
def after_request(response):
    endpoint = request.path
    method = request.method
    status = response.status_code

    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=str(status)).inc()
    REQUEST_LATENCY.labels(endpoint=endpoint).observe(time.time() - request.start_time)

    return response

@app.route("/health")
def health():
    return {"status": "healthy"}, 200

@app.route("/api/users")
def get_users():
    return {"users": []}, 200

# Mount Prometheus metrics endpoint
app.wsgi_app = DispatcherMiddleware(app.wsgi_app, {
    "/metrics": make_wsgi_app()
})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

### Integrating with FastAPI

```python
from fastapi import FastAPI, Request
from prometheus_client import Counter, Histogram, make_asgi_app
import time

app = FastAPI()

REQUEST_COUNT = Counter(
    "fastapi_requests_total",
    "Total FastAPI requests",
    ["method", "endpoint", "status"]
)

REQUEST_LATENCY = Histogram(
    "fastapi_request_duration_seconds",
    "FastAPI request latency",
    ["endpoint"]
)

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status=str(response.status_code)
    ).inc()
    REQUEST_LATENCY.labels(endpoint=request.url.path).observe(duration)

    return response

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/api/users")
async def get_users():
    return {"users": []}

# Mount Prometheus metrics
app.mount("/metrics", make_asgi_app())
```

### Custom collector for external data

```python
from prometheus_client import CollectorRegistry, Gauge, generate_latest
import requests

class DatabaseCollector:
    """Custom collector that scrapes database stats."""

    def __init__(self, db_url: str):
        self.db_url = db_url
        self.registry = CollectorRegistry()

        self.active_queries = Gauge(
            "db_active_queries",
            "Number of active database queries",
            registry=self.registry
        )
        self.connection_pool = Gauge(
            "db_connection_pool_size",
            "Database connection pool size",
            ["state"],
            registry=self.registry
        )

    def collect(self):
        # Fetch stats from database
        stats = requests.get(f"{self.db_url}/stats").json()

        self.active_queries.set(stats["active_queries"])
        self.connection_pool.labels(state="idle").set(stats["pool"]["idle"])
        self.connection_pool.labels(state="active").set(stats["pool"]["active"])
        self.connection_pool.labels(state="waiting").set(stats["pool"]["waiting"])

        yield from self.registry.collect()

# Usage in a metrics endpoint
from flask import Flask, Response

app = Flask(__name__)
collector = DatabaseCollector("http://localhost:8080")

@app.route("/metrics")
def metrics():
    collector.collect()
    return Response(
        generate_latest(collector.registry),
        mimetype="text/plain; version=0.0.4; charset=utf-8"
    )
```

### Summary metric for percentiles

```python
from prometheus_client import Summary

REQUEST_SIZE = Summary(
    "request_size_bytes",
    "Request payload size in bytes",
    ["endpoint"]
)

# Summary provides _sum, _count, and quantiles (0.5, 0.9, 0.99 by default)
REQUEST_SIZE.labels(endpoint="/upload").observe(1024)
REQUEST_SIZE.labels(endpoint="/upload").observe(5120)
REQUEST_SIZE.labels(endpoint="/upload").observe(256)

# Access quantiles: p50, p90, p99
```

### Prometheus scrape configuration

```yaml
# prometheus.yml
scrape_configs:
    - job_name: "python-app"
      scrape_interval: 15s
      metrics_path: /metrics
      static_configs:
          - targets: ["localhost:8000"]

    - job_name: "flask-app"
      scrape_interval: 15s
      static_configs:
          - targets: ["localhost:5000"]
```

### Docker Compose with Prometheus + Grafana

```yaml
# docker-compose.yml
services:
    app:
        build: .
        ports:
            - "8000:8000"

    prometheus:
        image: prom/prometheus:v2.52.0
        ports:
            - "9090:9090"
        volumes:
            - ./prometheus.yml:/etc/prometheus/prometheus.yml

    grafana:
        image: grafana/grafana:11.0.0
        ports:
            - "3000:3000"
        environment:
            - GF_SECURITY_ADMIN_PASSWORD=admin
```

## Explanation

Prometheus metric types:

- **Counter**: Monotonically increasing value. Use for request counts, error counts, bytes sent. Never decreases. Use `.inc()` to add 1 or `.inc(value)` to add a specific amount.
- **Gauge**: Value that goes up and down. Use for active connections, queue depth, memory usage. Use `.set(value)` to set, `.inc()` / `.dec()` to change.
- **Histogram**: Groups observations into buckets. Use for latency distributions. Provides `_bucket`, `_sum`, and `_count` time series. Define custom buckets based on your SLOs.
- **Summary**: Similar to histogram but computes quantiles on the client side. Use when you need exact percentiles and have few instances.

Labels add dimensions to metrics. Each label combination creates a separate time series. Avoid high-cardinality labels (user IDs, request IDs) — they explode the number of time series.

The `prometheus_client` library exposes metrics in the Prometheus text exposition format at `/metrics`. Prometheus scrapes this endpoint at the configured `scrape_interval`.

## Variants

| Metric Type | Use Case | Example |
|------------|----------|---------|
| Counter | Cumulative counts | Total requests, errors sent |
| Gauge | Current state | Active connections, queue depth |
| Histogram | Distributions | Request latency, response size |
| Summary | Client-side quantiles | p99 latency per instance |

## Guidelines

- Use counters for monotonically increasing values (requests, errors, bytes).
- Use gauges for values that go up and down (connections, queue depth, memory).
- Use histograms for latency distributions. Define buckets that match your SLOs.
- Keep label cardinality low. Avoid user IDs, session IDs, or request IDs as labels.
- Use the default buckets or define custom ones. Default buckets are optimized for ~0.005s to ~10s.
- Expose metrics on a separate port or path from your application.
- Set `scrape_interval` to 15-60s. Higher intervals reduce storage but miss short spikes.
- Use middleware to instrument all requests automatically (Flask `before_request`, FastAPI middleware).
- Track business metrics alongside technical ones (orders processed, active users).
- Monitor your metrics endpoint health — if it goes down, Prometheus has no data.

## Common Mistakes

- Using high-cardinality labels. Each unique label combination creates a new time series. A label with 10K user IDs creates 10K series per metric.
- Using a gauge for counters. Counters should never decrease. Using a gauge loses the rate calculation capability.
- Not defining custom histogram buckets. Default buckets may not match your latency profile.
- Exposing metrics on the same port as the app without authentication. In production, protect the metrics endpoint.
- Forgetting to call `.inc()` or `.observe()`. Metrics that are never updated are useless.
- Using summaries instead of histograms. Summaries cannot be aggregated across instances. Use histograms for distributed systems.
- Not instrumenting error paths. If you only track successful requests, your error rate appears as zero.

## Frequently Asked Questions

### What is the difference between a histogram and a summary?

Histograms group observations into configurable buckets and let Prometheus compute quantiles server-side (aggregatable across instances). Summaries compute quantiles client-side (not aggregatable). Use histograms for latency in distributed systems. Use summaries only when you need exact per-instance percentiles.

### How do I choose histogram buckets?

Set buckets based on your SLOs. If your SLO is 99 percent of requests under 200ms, use buckets like `[0.01, 0.05, 0.1, 0.2, 0.5, 1.0]`. The `+Inf` bucket is added automatically.

### Can I use prometheus_client with Django?

Yes. Use `django-prometheus` package for Django-specific integration, or mount `make_wsgi_app()` in your URL configuration.

### How do I test my metrics locally?

Run `prometheus_client.start_http_server(8000)` and open `http://localhost:8000/metrics` in a browser. You should see the text exposition format with all your metrics.
