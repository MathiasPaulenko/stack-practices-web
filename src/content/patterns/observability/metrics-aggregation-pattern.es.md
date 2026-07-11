---
contentType: patterns
slug: metrics-aggregation-pattern
title: "Patrón Metrics Aggregation"
description: "Cómo collect, tag, y aggregate business metrics para observability. Cubre Prometheus, OpenTelemetry, custom metrics, histograms, y dashboarding."
metaDescription: "Collect, tag y aggregate business metrics con Prometheus y OpenTelemetry. Aprende counters, gauges, histograms, custom metrics y dashboarding."
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
  metaDescription: "Collect, tag y aggregate business metrics con Prometheus y OpenTelemetry. Aprende counters, gauges, histograms, custom metrics y dashboarding."
  keywords:
    - observability
    - metrics
    - prometheus
    - opentelemetry
    - dashboards
    - pattern
---

## Overview

Metrics aggregation es la práctica de collectar numeric measurements desde tu aplicación, taggearlos con contextual labels, y agregarlos para querying y alerting. A diferencia de los logs (que registran individual events), las metrics son pre-aggregated numbers — request count, error rate, latency percentile, active connections. Esto las hace cheap de store y fast de query. El patrón cubre cuatro metric types: counters (monotonically increasing), gauges (pueden subir o bajar), histograms (distribution de values), y summaries (quantiles de values).

## When to Use

- Cualquier aplicación de producción que necesita observability más allá de logs
- Alerting en SLOs (error rate, latency percentiles, throughput)
- Capacity planning (trackear resource usage trends)
- Business dashboards (orders per minute, active users, revenue)
- Performance monitoring (request latency, queue depth, cache hit rate)

## When NOT to Use

- Individual event tracking — usá logs o event streams en su lugar
- Debuggear specific issues — logs y traces son más útiles
- Aplicaciones con muy bajo tráfico donde las metrics no son statistically meaningful
- Cuando el overhead de un metrics backend no está justificado

## Solution

### Prometheus client (Python)

```python
# Python — prometheus_client para metrics
from prometheus_client import Counter, Gauge, Histogram, Summary, start_http_server
import time
import random

# Counter — monotonically increasing (request count, error count)
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status'],
)

# Gauge — puede subir o bajar (active connections, queue depth)
ACTIVE_CONNECTIONS = Gauge(
    'active_connections',
    'Currently active connections',
)

QUEUE_DEPTH = Gauge(
    'message_queue_depth',
    'Messages waiting in queue',
    ['queue_name'],
)

# Histogram — distribution de values (request latency)
REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)

# Summary — quantiles de values
RESPONSE_SIZE = Summary(
    'http_response_size_bytes',
    'HTTP response size in bytes',
    ['endpoint'],
)

# Usage
def handle_request(method, endpoint):
    start_time = time.time()

    # Simular processing
    time.sleep(random.uniform(0.01, 0.2))
    status = random.choice([200, 200, 200, 200, 404, 500])

    # Record metrics
    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=str(status)).inc()
    REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(time.time() - start_time)
    RESPONSE_SIZE.labels(endpoint=endpoint).observe(random.randint(100, 5000))

    return status

# Start metrics server en port 9090
start_http_server(9090)

# Update gauges
ACTIVE_CONNECTIONS.set(42)
QUEUE_DEPTH.labels(queue_name='orders').set(150)
```

### FastAPI middleware con metrics

```python
# Python — FastAPI middleware para automatic request metrics
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

### Node.js con prom-client

```javascript
// JavaScript — prom-client para Prometheus metrics
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

### Business metrics con tagging

```python
# Python — business metrics con dimensional tags
from prometheus_client import Counter, Gauge, Histogram

# Order metrics con rich tags
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

    ORDERS_PROCESSED.labels(
        product_category=order.category,
        payment_method=order.payment_method,
        region=order.region,
        status='success' if order.success else 'failed',
    ).inc()
```

### Java con Micrometer

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

// Timer (equivalente a histogram para duration)
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

// Distribution summary (histogram para arbitrary values)
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
# PromQL queries para common dashboards

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

### Push-based metrics con StatsD

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

- Usá el right metric type — counters para totals, gauges para current state, histograms para distributions
- Taggeá con dimensions — endpoint, method, status, region. Los tags enable slicing y dicing en queries.
- Mantené cardinality bounded — evitá taggear con user IDs o request IDs (unlimited values)
- Usá standard buckets para histograms — Prometheus default buckets cubren most latency ranges
- Exponé un /metrics endpoint — dejá que Prometheus lo scrapee en vez de pushear
- Trackeá business metrics, no solo technical — orders, revenue, conversion, no solo CPU y memory
- Seteá alerting en SLOs — error rate, latency percentiles, no solo "is it up"
- Usá histograms sobre summaries para aggregatable percentiles — los histograms se pueden aggregate across instances

## Common Mistakes

- **Unbounded cardinality**: taggear con user IDs o request IDs crea una time series por value. Esto causa memory explosion en Prometheus.
- **Usar gauges para counters**: los gauges pueden bajar, así que `rate()` no funciona. Usá counters para monotonically increasing values.
- **No taggear**: un single `http_requests_total` sin method/endpoint tags no se puede slice. Siempre incluí relevant dimensions.
- **Demasiados buckets**: 50 histogram buckets wastes memory. 10-15 well-chosen buckets son sufficient.
- **No manejar counter resets**: cuando un proceso restartea, counters resetean a 0. Usá `rate()` o `increase()` que manejan resets.

## FAQ

### ¿Cuáles son los cuatro metric types?

Counters (monotonically increasing, como request count), gauges (pueden subir o bajar, como active connections), histograms (distribution de values, como request latency), y summaries (pre-computed quantiles, como 95th percentile).

### ¿Debería usar histograms o summaries?

Usá histograms para latency — se pueden aggregate across instances y permiten calcular cualquier percentile at query time. Usá summaries solo cuando necesitás pre-computed quantiles y no necesitás aggregate across instances.

### ¿Qué es cardinality y por qué importa?

Cardinality es el número de unique label combinations. High cardinality (taggear con user IDs) crea demasiadas time series, causando memory y performance issues en Prometheus. Mantené cardinality bounded.

### ¿Con qué frecuencia debería updatear metrics?

Counters y histograms se updatean cuando events pasan. Gauges deberían updatearse cuando el value cambia. Prometheus scrapea cada 15 segundos por default, así que no pushees — dejalo pull.

### ¿Cuál es la diferencia entre push y pull metrics?

Pull (Prometheus): el metrics system scrapeea tu /metrics endpoint. Push (StatsD, InfluxDB): tu aplicación manda metrics a un collector. Pull es más simple y más common en cloud-native environments.
