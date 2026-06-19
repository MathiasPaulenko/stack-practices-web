---
contentType: recipes
slug: metrics-collection
title: "Metrics Collection"
description: "Collect, aggregate, and expose application and infrastructure metrics with Prometheus, StatsD, and OpenTelemetry for monitoring and alerting."
metaDescription: "Metrics collection for applications and infrastructure: Prometheus, StatsD, OpenTelemetry, custom metrics, histograms, counters, and Grafana dashboards."
difficulty: intermediate
topics:
  - observability
tags:
  - metrics-collection
  - observability
  - prometheus
relatedResources:
  - /recipes/prometheus-monitoring-alerts
  - /recipes/prometheus-api-monitoring
  - /recipes/grafana-dashboards-observability
  - /recipes/distributed-tracing
  - /recipes/structured-logging
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Metrics collection for applications and infrastructure: Prometheus, StatsD, OpenTelemetry, custom metrics, histograms, counters, and Grafana dashboards."
  keywords:
    - metrics-collection
    - observability
    - prometheus
    - grafana
---
## Overview

Metrics collection transforms raw system behavior into time-series data that reveals performance trends, capacity limits, and anomalies. Unlike logs (discrete events) or traces (request journeys), metrics are numerical measurements aggregated over time — request rates, error percentages, queue depths, and memory usage. A well-designed metrics pipeline enables proactive alerting before users notice degradation.

## When to Use

Use this resource when:
- You need quantitative SLIs for error budgets and SLO dashboards
- Alerting must fire before logs are aggregated (sub-minute detection)
- Capacity planning requires historical throughput and resource usage trends
- Debugging requires correlating metrics across services (CPU spike + latency increase)

## Solution

### Prometheus Metrics in Go

```go
import "github.com/prometheus/client_golang/prometheus"

var (
    requestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request latency",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "status"},
    )
    activeConnections = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "active_connections",
            Help: "Number of active connections",
        },
    )
)

func init() {
    prometheus.MustRegister(requestDuration, activeConnections)
}

func handleRequest(w http.ResponseWriter, r *http.Request) {
    activeConnections.Inc()
    defer activeConnections.Dec()

    start := time.Now()
    defer func() {
        requestDuration.WithLabelValues(
            r.Method,
            strconv.Itoa(w.Status()),
        ).Observe(time.Since(start).Seconds())
    }()

    // Handler logic...
}
```

### StatsD Metrics (Node.js)

```javascript
const StatsD = require('node-statsd');
const client = new StatsD({ host: 'localhost', port: 8125 });

function processPayment(orderId, amount) {
  const start = Date.now();
  
  try {
    const result = paymentGateway.charge(amount);
    client.increment('payment.success');
    client.gauge('payment.amount', amount);
    return result;
  } catch (err) {
    client.increment('payment.error', 1, ['gateway:stripe', 'error:declined']);
    throw err;
  } finally {
    client.timing('payment.duration', Date.now() - start);
  }
}
```

### OpenTelemetry Metrics (Python)

```python
from opentelemetry import metrics
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry.sdk.metrics import MeterProvider

reader = PrometheusMetricReader()
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter(__name__)

counter = meter.create_counter("orders.created", description="Orders created")
histogram = meter.create_histogram("order.value", description="Order value in USD")

def create_order(items, total):
    counter.add(1, {"region": "us-east"})
    histogram.record(total, {"region": "us-east"})
    return Order(items=items, total=total)
```

## Explanation

**Metric types**:

| Type | Use Case | Example |
|------|----------|---------|
| Counter | Monotonically increasing | Total requests, errors |
| Gauge | Value goes up and down | Active connections, queue depth |
| Histogram | Distribution of values | Request latency, payload size |
| Summary | Quantiles (client-side) | 99th percentile latency |

**Cardinality danger**:
- Good labels: `method=GET`, `status=200`, `region=us-east`
- Bad labels: `user_id=12345`, `session_id=abc` — causes metric explosion
- Rule of thumb: Keep unique label combinations under 10,000

## Variants

| Backend | Collection | Best For |
|---------|------------|----------|
| Prometheus | Pull (scrape) | Kubernetes; PromQL queries |
| StatsD | Push (UDP) | Legacy apps; simple counters |
| InfluxDB | Push (HTTP) | High cardinality; tags |
| Datadog | Agent push | SaaS; out-of-box dashboards |
| CloudWatch | AWS integration | AWS-native apps |

## Best Practices

- **Use histograms for latency**: Counters and gauges lose distribution shape
- **Add `le` buckets for SLOs**: `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))`
- **Name consistently**: `subsystem_metric_unit` (e.g., `http_requests_total`)
- **Alert on rates, not totals**: `rate(errors[5m]) > 0.01` not `errors > 1000`
- **Separate metric and business logic**: Keep instrumentation thin; never block on metric emission

## Common Mistakes

1. **High-cardinality labels**: User IDs as labels crash Prometheus storage
2. **Missing units**: `request_duration` without `_seconds` or `_milliseconds` creates confusion
3. **Alerting on gauges**: Queue depth alone doesn't indicate failure; combine with processing rate
4. **No retention policy**: Keeping 1-second resolution for 5 years wastes storage; downsample
5. **Forgetting to instrument failures**: Only measuring success hides partial outages

## Frequently Asked Questions

**Q: How do I choose between Prometheus and StatsD?**
A: Use Prometheus for new cloud-native apps. Use StatsD for legacy apps where adding an HTTP endpoint is hard.

**Q: What's the performance overhead of metrics collection?**
A: Negligible for counters and gauges (<1%). Histograms with many buckets add slightly more; use predefined buckets.

**Q: Should I collect metrics from the client (browser)?**
A: Yes. Core Web Vitals, API error rates, and navigation timing from real users are essential SLIs.
