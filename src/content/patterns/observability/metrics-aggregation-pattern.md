---
contentType: patterns
slug: metrics-aggregation-pattern
title: "Metrics Aggregation Pattern: Collect, Tag, and Aggregate Business Metrics"
description: "How to collect, tag, and aggregate business metrics for observability. Covers Prometheus, OpenTelemetry, custom metrics, histograms, and dashboarding."
metaDescription: "Collect, tag, and aggregate business metrics with Prometheus and OpenTelemetry. Learn counters, gauges, histograms, custom metrics, and dashboarding."
difficulty: intermediate
topics:
  - observability
tags:
  - observability
  - metrics
  - prometheus
  - opentelemetry
  - dashboards
  - pattern
category: architectural
relatedResources:
  - /patterns/structured-logging-pattern
  - /patterns/distributed-tracing-pattern
  - /patterns/health-check-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Collect, tag, and aggregate business metrics with Prometheus and OpenTelemetry. Learn counters, gauges, histograms, custom metrics, and dashboarding."
  keywords:
    - observability
    - metrics
    - prometheus
    - opentelemetry
    - dashboards
    - pattern
---

## Overview

Metrics aggregation is the practice of collecting numeric measurements from your application, tagging them with contextual labels, and aggregating them for querying and alerting. Unlike logs (which record individual events), metrics are pre-aggregated numbers — request count, error rate, latency percentile, active connections. This makes them cheap to store and fast to query. The pattern covers four metric types: counters (monotonically increasing), gauges (can go up or down), histograms (distribution of values), and summaries (quantiles of values).

## When to Use

- Any production application that needs observability beyond logs
- Alerting on SLOs (error rate, latency percentiles, throughput)
- Capacity planning (tracking resource usage trends)
- Business dashboards (orders per minute, active users, revenue)
- Performance monitoring (request latency, queue depth, cache hit rate)

## When NOT to Use

- Individual event tracking — use logs or event streams instead
- Debugging specific issues — logs and traces are more useful
- Applications with very low traffic where metrics are not statistically meaningful
- When the overhead of a metrics backend is not justified

## Solution

### Prometheus client (Python)

```python
# Python — prometheus_client for metrics
from prometheus_client import Counter, Gauge, Histogram, Summary, start_http_server
import time
import random

# Counter — monotonically increasing (request count, error count)
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status'],
)

# Gauge — can go up or down (active connections, queue depth)
ACTIVE_CONNECTIONS = Gauge(
    'active_connections',
    'Currently active connections',
)

QUEUE_DEPTH = Gauge(
    'message_queue_depth',
    'Messages waiting in queue',
    ['queue_name'],
)

# Histogram — distribution of values (request latency)
REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)

# Summary — quantiles of values
RESPONSE_SIZE = Summary(
    'http_response_size_bytes',
    'HTTP response size in bytes',
    ['endpoint'],
)

# Usage
def handle_request(method, endpoint):
    start_time = time.time()

    # Simulate processing
    time.sleep(random.uniform(0.01, 0.2))
    status = random.choice([200, 200, 200, 200, 404, 500])

    # Record metrics
    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=str(status)).inc()
    REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(time.time() - start_time)
    RESPONSE_SIZE.labels(endpoint=endpoint).observe(random.randint(100, 5000))

    return status

# Start metrics server on port 9090
start_http_server(9090)

# Update gauges
ACTIVE_CONNECTIONS.set(42)
QUEUE_DEPTH.labels(queue_name='orders').set(150)
```

### FastAPI middleware with metrics

```python
# Python — FastAPI middleware for automatic request metrics
from fastapi import FastAPI, Request
from prometheus_client import Counter, Histogram, start_http_server
import time

app = FastAPI()

REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status'],
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint'],
)

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)

    duration = time.time() - start_time
    endpoint = request.url.path
    method = request.method
    status = str(response.status_code)

    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status).inc()
    REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(duration)

    return response

# Start metrics server
start_http_server(9090)
```

### OpenTelemetry metrics (Python)

```python
# Python — OpenTelemetry metrics API
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry.sdk.resources import Resource

# Setup
resource = Resource.create({"service.name": "order-service"})
reader = PrometheusMetricReader()
provider = MeterProvider(resource=resource, metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("order-service")

# Create instruments
request_counter = meter.create_counter(
    "http_requests_total",
    description="Total HTTP requests",
    unit="1",
)

request_duration = meter.create_histogram(
    "http_request_duration_seconds",
    description="HTTP request duration",
    unit="s",
)

active_connections = meter.create_up_down_counter(
    "active_connections",
    description="Active connections",
    unit="1",
)

# Usage
def handle_order(order_id):
    attrs = {"endpoint": "/api/orders", "method": "POST"}
    request_counter.add(1, attrs)
    active_connections.add(1, attrs)

    start = time.time()
    # Process order
    duration = time.time() - start
    request_duration.record(duration, attrs)

    active_connections.add(-1, attrs)
```

### Node.js with prom-client

```javascript
// JavaScript — prom-client for Prometheus metrics
const promClient = require('prom-client');

// Create a Registry
const register = new promClient.Registry();

// Default metrics (CPU, memory, GC)
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'endpoint', 'status'],
  registers: [register],
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'endpoint'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
  registers: [register],
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Currently active connections',
  registers: [register],
});

const queueDepth = new promClient.Gauge({
  name: 'message_queue_depth',
  help: 'Messages waiting in queue',
  labelNames: ['queue_name'],
  registers: [register],
});

// Express middleware
const express = require('express');
const app = express();

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestTotal.labels(req.method, req.path, String(res.statusCode)).inc();
    httpRequestDuration.labels(req.method, req.path).observe(duration);
  });
  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Update gauges
activeConnections.set(42);
queueDepth.labels({ queue_name: 'orders' }).set(150);
```

### Business metrics with tagging

```python
# Python — business metrics with dimensional tags
from prometheus_client import Counter, Gauge, Histogram

# Order metrics with rich tags
ORDERS_PROCESSED = Counter(
    'orders_processed_total',
    'Total orders processed',
    ['product_category', 'payment_method', 'region', 'status'],
)

ORDER_VALUE = Histogram(
    'order_value_usd',
    'Order value in USD',
    ['product_category', 'region'],
    buckets=[1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000],
)

ACTIVE_SUBSCRIPTIONS = Gauge(
    'active_subscriptions',
    'Currently active subscriptions',
    ['plan', 'region'],
)

# Usage
def process_order(order):
    ORDER_VALUE.labels(
        product_category=order.category,
        region=order.region,
    ).observe(order.total)

    ORDER_COUNT.labels(
        product_category=order.category,
        payment_method=order.payment_method,
        region=order.region,
        status='success' if order.success else 'failed',
    ).inc()
```

### Java with Micrometer

```java
// Java — Micrometer metrics
import io.micrometer.core.instrument.*;
import io.micrometer.prometheus.PrometheusConfig;
import io.micrometer.prometheus.PrometheusMeterRegistry;

PrometheusMeterRegistry registry = new PrometheusMeterRegistry(PrometheusConfig.DEFAULT);

// Counter
Counter orderCounter = Counter.builder("orders_processed")
    .description("Total orders processed")
    .tag("product_category", "electronics")
    .tag("region", "us-east")
    .register(registry);

orderCounter.increment();

// Timer (equivalent to histogram for duration)
Timer orderTimer = Timer.builder("order_processing_duration")
    .description("Order processing duration")
    .tag("endpoint", "/api/orders")
    .publishPercentiles(0.5, 0.95, 0.99)
    .register(registry);

orderTimer.record(() -> processOrder(order));

// Gauge
Gauge activeConnections = Gauge.builder("active_connections",
        () -> getActiveConnectionCount())
    .description("Currently active connections")
    .register(registry);

// Distribution summary (histogram for arbitrary values)
DistributionSummary orderValue = DistributionSummary.builder("order_value_usd")
    .description("Order value in USD")
    .tag("region", "us-east")
    .register(registry);

orderValue.record(order.getTotal());

// Expose metrics endpoint
// Spring Boot auto-configures /actuator/prometheus
```

### Prometheus scrape configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'order-service'
    metrics_path: /metrics
    static_configs:
      - targets: ['order-service:9090']
        labels:
          service: 'order-service'
          env: 'production'

  - job_name: 'payment-service'
    metrics_path: /metrics
    static_configs:
      - targets: ['payment-service:9090']
        labels:
          service: 'payment-service'
          env: 'production'

  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

### Grafana dashboard queries

```promql
# PromQL queries for common dashboards

# Request rate (requests per second)
rate(http_requests_total[5m])

# Error rate (percentage of 5xx responses)
sum(rate(http_requests_total{status=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m])) * 100

# 95th percentile latency
histogram_quantile(0.95,
  rate(http_request_duration_seconds_bucket[5m]))

# Average latency by endpoint
rate(http_request_duration_seconds_sum[5m])
  / rate(http_request_duration_seconds_count[5m])

# Active connections over time
active_connections

# Orders per minute by category
sum(rate(orders_processed_total[1m])) by (product_category)

# Top 5 slowest endpoints
topk(5,
  histogram_quantile(0.95,
    rate(http_request_duration_seconds_bucket[5m])) by (endpoint))
```

### Alerting rules

```yaml
# Prometheus alerting rules
groups:
  - name: order-service
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
            / sum(rate(http_requests_total[5m])) > 0.05
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Error rate above 5% for 10 minutes"
          description: "Current error rate: {{ $value }}"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95,
            rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "95th percentile latency above 2 seconds"

      - alert: ServiceDown
        expr: up{job="order-service"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Order service is down"
```

## Variants

### Push-based metrics with StatsD

```python
# Python — StatsD push-based metrics
import statsd

client = statsd.StatsClient('localhost', 8125, prefix='order-service')

# Counter
client.incr('orders.created')
client.incr('orders.failed', count=1)

# Timing
with client.timer('order_processing_duration'):
    process_order(order)

# Gauge
client.gauge('active_connections', 42)

# Sets (unique count)
client.set('unique_users', user_id)
```

### Custom business metrics dashboard

```javascript
// JavaScript — custom business metrics
const businessMetrics = {
  // Revenue tracking
  revenueToday: new promClient.Gauge({
    name: 'revenue_today_usd',
    help: 'Total revenue today in USD',
    registers: [register],
  }),

  // Conversion funnel
  funnelStage: new promClient.Counter({
    name: 'funnel_stage_total',
    help: 'Users reaching each funnel stage',
    labelNames: ['stage'],
    registers: [register],
  }),

  // Feature usage
  featureUsage: new promClient.Counter({
    name: 'feature_usage_total',
    help: 'Feature usage count',
    labelNames: ['feature', 'user_tier'],
    registers: [register],
  }),
};

// Track funnel stages
function trackFunnel(userId, stage) {
  businessMetrics.funnelStage.labels({ stage }).inc();
}

trackFunnel(userId, 'page_view');
trackFunnel(userId, 'add_to_cart');
trackFunnel(userId, 'checkout');
trackFunnel(userId, 'purchase');
```

## Best Practices

- Use the right metric type — counters for totals, gauges for current state, histograms for distributions
- Tag with dimensions — endpoint, method, status, region. Tags enable slicing and dicing in queries.
- Keep cardinality bounded — avoid tagging with user IDs or request IDs (unlimited values)
- Use standard buckets for histograms — Prometheus default buckets cover most latency ranges
- Expose a /metrics endpoint — let Prometheus scrape it rather than pushing
- Track business metrics, not just technical — orders, revenue, conversion, not just CPU and memory
- Set up alerting on SLOs — error rate, latency percentiles, not just "is it up"
- Use histograms over summaries for aggregatable percentiles — histograms can be aggregated across instances

## Common Mistakes

- **Unbounded cardinality**: tagging with user IDs or request IDs creates one time series per value. This causes memory explosion in Prometheus.
- **Using gauges for counters**: gauges can go down, so `rate()` doesn't work. Use counters for monotonically increasing values.
- **Not tagging**: a single `http_requests_total` without method/endpoint tags can't be sliced. Always include relevant dimensions.
- **Too many buckets**: 50 histogram buckets wastes memory. 10-15 well-chosen buckets are sufficient.
- **Not handling counter resets**: when a process restarts, counters reset to 0. Use `rate()` or `increase()` which handle resets.

## FAQ

### What are the four metric types?

Counters (monotonically increasing, like request count), gauges (can go up or down, like active connections), histograms (distribution of values, like request latency), and summaries (pre-computed quantiles, like 95th percentile).

### Should I use histograms or summaries?

Use histograms for latency — they can be aggregated across instances and allow calculating any percentile at query time. Use summaries only when you need pre-computed quantiles and don't need to aggregate across instances.

### What is cardinality and why does it matter?

Cardinality is the number of unique label combinations. High cardinality (tagging with user IDs) creates too many time series, causing memory and performance issues in Prometheus. Keep cardinality bounded.

### How often should I update metrics?

Counters and histograms are updated when events happen. Gauges should be updated when the value changes. Prometheus scrapes every 15 seconds by default, so don't push — let it pull.

### What is the difference between push and pull metrics?

Pull (Prometheus): the metrics system scrapes your /metrics endpoint. Push (StatsD, InfluxDB): your application sends metrics to a collector. Pull is simpler and more common in cloud-native environments.
