---
contentType: recipes
slug: prometheus-api-monitoring
title: "Prometheus API Monitoring"
description: "Monitor API performance and health with Prometheus metrics, custom collectors, and alerting rules."
metaDescription: "Set up Prometheus monitoring for REST and gRPC APIs with custom metrics, collectors, alerting rules, and Grafana dashboards for production observability."
difficulty: intermediate
topics:
  - observability
  - api
tags:
  - prometheus
  - observability
  - api
  - devops
  - monitoring
  - metrics
relatedResources:
  - /recipes/prometheus-monitoring-alerts
  - /recipes/grafana-dashboards-observability
  - /docs/api-status-page-template
  - /guides/logging-monitoring-observability-guide
  - /guides/monitoring-alerting-guide
  - /recipes/distributed-tracing
lastUpdated: "2026-08-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Set up Prometheus monitoring for REST and gRPC APIs with custom metrics, collectors, alerting rules, and Grafana dashboards for production observability."
  keywords:
    - prometheus
    - observability
    - api-monitoring
    - metrics
    - alerting
    - devops
---

## Overview

If you're running containers or Kubernetes, Prometheus is the metrics tool most
teams reach for first. Instrument your API with counters, histograms, and gauges
to see request latency, error rates, throughput, and business-level metrics in
real time.

## When to Use

- Setting up monitoring for REST or gRPC APIs.
- Defining SLOs and SLIs for microservices.
- Creating [Grafana dashboards](/recipes/grafana-dashboards-observability/) for API health.
- Alerting on p99 latency or error rate spikes.
- Tracking business metrics like signups or revenue per endpoint.

### When to avoid

- You already use a managed APM that covers your needs without extra setup.
- The API traffic is so low that metric cardinality isn't worth the overhead.
- You need distributed tracing first. Start with [distributed tracing](/recipes/distributed-tracing/) instead.

## Solution

### Prometheus client instrumentation (Node.js)

```javascript
const client = require('prom-client');

// Counter: total requests
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Histogram: request duration
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// Gauge: active connections
const activeConnections = new client.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections'
});

// Middleware
app.use((req, res, next) => {
  activeConnections.inc();
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || 'unknown' });
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || 'unknown',
      status_code: res.statusCode
    });
    activeConnections.dec();
  });

  next();
});
```

### Alerting rules

```yaml
# prometheus-alerts.yml
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"

      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
```

### PromQL queries for dashboards

```text
# Requests per second
rate(http_requests_total[5m])

# p99 latency
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{status_code=~"5.."}[5m])
```

## Explanation

Prometheus follows a pull model. Your application exposes a `/metrics` endpoint;
the Prometheus server scrapes it on a schedule (default 15 seconds). The
scraped time series are stored locally and queried with PromQL. Alertmanager
routes firing alerts to Slack, PagerDuty, or email.

**Metric types**:

| Type | Use for | Example |
| --- | --- | --- |
| **Counter** | Monotonically increasing values | `http_requests_total` |
| **Histogram** | Bucketed observations, sum, count | `http_request_duration_seconds` |
| **Gauge** | Values that go up or down | `http_active_connections` |
| **Summary** | Pre-calculated quantiles | Use histograms instead for aggregation |

Histograms are usually better than summaries because you can aggregate them
across instances. Summaries cannot be aggregated.

## Variants

| Language | Library | Notes |
| --- | --- | --- |
| Node.js | prom-client | Built-in registry; works with Express, Fastify |
| Go | prometheus/client_golang | Official client; best performance |
| Python | prometheus_client | Flask/Django middleware available |
| Java | Micrometer | Spring Boot integration |
| Rust | prometheus | Async-compatible |

## Best Practices

- Use labels sparingly. High cardinality degrades Prometheus performance.
- Prefer histograms over summaries for latency.
- Name metrics with units: `_seconds`, `_bytes`, `_total`.
- Instrument failures, not just successes.
- Keep histogram buckets focused. A handful of buckets is enough.
- Scrape `/metrics` over a separate port or internal route when possible.
- Start with the default 15-day retention, then adjust it once you know your
  actual storage needs.

## Common Mistakes

- High-cardinality labels like user IDs or session IDs.
- Missing unit suffixes in metric names.
- Not tracking failed requests.
- Too many histogram buckets.
- Ignoring scrape errors on the `/metrics` endpoint.
- Mixing business and infrastructure metrics in the same instance without
  planning for different retention.

## FAQ

### How much memory does Prometheus need?

Roughly 1–3 KB per active time series. An API with 100 endpoints and a few
labels often fits in 2–4 GB of RAM.

### Can Prometheus handle logs and traces?

No. Use Prometheus for metrics, Loki for logs, and Jaeger for traces. Grafana
can unify all three in one dashboard.

### What is the difference between histogram and summary?

Histograms bucket data and allow aggregation across instances. Summaries
pre-calculate quantiles but can't be aggregated.

### How do I reduce Prometheus storage costs?

Use 15–30 day retention for local Prometheus, recording rules for frequent
queries, and Thanos or Cortex for long-term storage. Limit high-cardinality
labels and remove unused metrics.

### Can I use Prometheus for business metrics?

Yes, but put business metrics in a separate instance or namespace. They often
have higher cardinality and different retention needs.

### How do I test alert rules before deploying?

Use `promtool test rules` with a test file that defines input series and the
expected alerts. This catches broken PromQL and thresholds without waiting for
a production incident.
