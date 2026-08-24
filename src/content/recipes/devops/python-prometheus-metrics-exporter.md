---
contentType: recipes
slug: python-prometheus-metrics-exporter
title: "Expose Custom Application Metrics with Python and Prometheus"
description: "Build a custom Prometheus metrics exporter in Python using prometheus_client. Covers counters, gauges, histograms, summaries, and Flask/FastAPI integration."
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
relatedResources:
  - /recipes/docker-logging-fluentd
  - /recipes/docker-health-check-configuration
  - /guides/observability-guide
  - /guides/complete-guide-structured-logging
  - /recipes/prometheus-monitoring-alerts
  - /guides/complete-guide-observability-grafana-stack
lastUpdated: "2026-08-24"
publishedAt: "2026-07-02"
author: Mathias Paulenko
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

Prometheus pulls metrics from your app over HTTP. You expose a `/metrics`
endpoint, and Prometheus scrapes it on a schedule. The `prometheus_client`
library gives you four metric types and a quick HTTP server, so instrumenting a
Python app is straightforward.

## When to Use

Reach for this recipe when you need app-level numbers like request count,
latency, or queue depth. It also fits if you already use Prometheus or Grafana
for monitoring, or if you want to publish custom business metrics such as active
users or orders processed from a Python service.

It's not the best fit if you only need temporary debug output, or if your
monitoring stack already uses a push-based collector with a non-Prometheus
backend.

For alternatives, see [Complete Guide to Observability with the Grafana
Stack](/guides/complete-guide-observability-grafana-stack/).

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

Start by figuring out what the metric is supposed to measure.

If the question is "how many" and the answer can only go up, use a `Counter`.
Requests served, errors raised, bytes written — these all go in this bucket.
Increment it with `.inc()` for one event, or pass a batch count to `.inc(value)`.

If the value moves in both directions — active connections, queue depth, free
memory — a `Gauge` is the tool. Set it with `.set(value)` or bump it up and down
with `.inc()` and `.dec()`.

For timing or payload size, the choice is between a histogram and a summary. A
`Histogram` bins every observation into buckets and exposes `_bucket`, `_sum`, and
`_count`. Latency is the classic case, and you pick the bin edges yourself. A
`Summary` is the pickier cousin: it computes percentiles inside your app, so you
get exact numbers per instance, but you can't roll those percentiles across
replicas. Keep it for small, fixed deployments.

Labels are how you slice a metric by extra details. The catch is that every
unique combination of label values becomes its own time series, so
high-cardinality labels like user IDs or request IDs will blow up the series
count.

Under the hood, `prometheus_client` renders metrics in Prometheus text exposition
format at `/metrics`. Prometheus then scrapes that endpoint based on the
`scrape_interval` you configured.

## Best Practices

Counters are for anything that only grows: requests, errors, bytes. Gauges work
for values that fluctuate, like active connections or queue depth. Histograms are
for latency, and you should define buckets that match your SLOs.

Keep label cardinality low. Never use user IDs, session IDs, or request IDs as
labels. Decide whether the default histogram buckets make sense for your traffic
or define your own; the defaults span roughly 0.005s to 10s. Try to keep the
metrics endpoint on a separate port or path from your main application.

Set `scrape_interval` between 15 and 60 seconds. Longer intervals save storage
but can miss short spikes. Use middleware in Flask or FastAPI to instrument every
request automatically. Once the metrics are flowing, set up alerts with
[Prometheus Monitoring and Alerts](/recipes/prometheus-monitoring-alerts/). Don't
forget business metrics: orders processed, active users, completed checkouts.
They often tell you more than the technical ones. And monitor the health of your
metrics endpoint: if it fails, Prometheus stops getting data.

## Common Mistakes

The biggest trap is high-cardinality labels. Every unique combination creates a
new time series, so a label with 10,000 user IDs produces 10,000 series per
metric. Using a gauge when you need a counter is another mistake — counters should
never decrease, and a gauge can't be used for rate calculations.

Not defining custom histogram buckets is also frequent; the defaults may not
match your latency profile. Exposing `/metrics` on the same port as your app
without authentication is risky in production, so protect it. Forgetting to call
`.inc()` or `.observe()` leaves you with stale metrics. Summaries fall apart in
distributed systems because they don't aggregate across instances, so don't use
one where you need fleet-wide percentiles. And only instrumenting the happy path
hides errors — your error rate will look like zero.

## FAQ

### What is the difference between a histogram and a summary?

Both deal with distributions, but the math happens in different places. With a
histogram, Prometheus receives the raw buckets and calculates quantiles on the
server. That makes histograms aggregatable across instances. A summary calculates
quantiles inside your app, so each process reports its own percentile and you
can't roll them up. Use histograms for latency in distributed systems; reserve
summaries for exact per-instance percentiles.

### How do I choose histogram buckets?

Base them on your SLOs. If 99% of requests should finish under 200ms, use buckets
like `[0.01, 0.05, 0.1, 0.2, 0.5, 1.0]`. Prometheus adds the `+Inf` bucket
automatically.

### Can I use prometheus_client with Django?

Yes. Use `django-prometheus` for Django-specific helpers, or mount
`make_wsgi_app()` in your URL configuration.

### How do I test my metrics locally?

Run `prometheus_client.start_http_server(8000)` and open
`http://localhost:8000/metrics` in a browser. You'll see the text exposition
format listing all your metrics.
