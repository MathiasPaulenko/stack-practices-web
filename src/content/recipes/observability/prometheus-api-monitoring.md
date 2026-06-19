---
contentType: recipes
slug: prometheus-api-monitoring
title: "Prometheus API Monitoring"
description: "Monitor API performance and health with Prometheus metrics, custom collectors, and alerting rules."
metaDescription: "Set up Prometheus monitoring for REST and gRPC APIs with custom metrics, collectors, alerting rules, and Grafana dashboards for production observability."
difficulty: intermediate
topics:
  - observability
tags:
  - prometheus
  - observability
  - api
  - devops
relatedResources:
  - /recipes/prometheus-monitoring-alerts
  - /recipes/grafana-dashboards-observability
  - /docs/api-status-page-template
  - /guides/logging-monitoring-observability-guide
  - /guides/monitoring-alerting-guide
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Set up Prometheus monitoring for REST and gRPC APIs with custom metrics, collectors, alerting rules, and Grafana dashboards for production observability."
  keywords:
    - prometheus
    - observability
    - api
    - devops
---
## Overview

Prometheus is the de facto standard for metrics collection in cloud-native environments. By instrumenting your API with custom counters, histograms, and gauges, you gain real-time visibility into request latency, error rates, throughput, and business-level metrics.

## When to Use

Use this resource when:
- Setting up monitoring for REST or gRPC APIs
- Defining SLOs and SLIs for microservices
- Creating Grafana dashboards for API health
- Alerting on p99 latency or error rate spikes

## Solution

### Prometheus Client Instrumentation (Node.js)

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

### Alerting Rules

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

## Explanation

Prometheus follows a pull model:

1. **Instrumentation**: Your application exposes a /metrics endpoint
2. **Scraping**: Prometheus server polls this endpoint periodically (default 15s)
3. **Storage**: Time-series data is stored locally with compression
4. **Querying**: PromQL queries aggregate metrics in real time
5. **Alerting**: Alertmanager routes alerts to Slack, PagerDuty, email

**Metric types**:
- **Counter**: Monotonically increasing (requests, errors)
- **Histogram**: Bucketed observations + sum + count (latency)
- **Gauge**: Can go up or down (connections, queue depth)
- **Summary**: Pre-calculated quantiles (use histograms instead when possible)

## Variants

| Language | Library | Notes |
|----------|---------|-------|
| Node.js | prom-client | Most popular; built-in registry |
| Go | prometheus/client_golang | Official; best performance |
| Python | prometheus_client | Flask/Django middleware available |
| Java | Micrometer | Spring Boot integration |
| Rust | prometheus | Async-compatible |

## Best Practices

- **Use labels sparingly**: High cardinality (unique label combinations) degrades performance
- **Prefer histograms over summaries**: Histograms allow aggregation across instances
- **Instrument business metrics**: Not just technical metrics (signups, revenue per endpoint)
- **Set retention wisely**: Default 15 days; increase for long-term trends
- **Run Prometheus in HA mode**: Use Thanos or Cortex for multi-cluster aggregation

## Common Mistakes

1. **High cardinality labels**: User IDs or session IDs as labels crash Prometheus
2. **Missing unit suffixes**: Use _seconds, _bytes, _total as per naming conventions
3. **Not instrumenting failures**: Only tracking success masks outage detection
4. **Too many buckets**: 100+ histogram buckets waste storage and CPU
5. **Ignoring scrape errors**: /metrics endpoint errors mean blind spots

## Frequently Asked Questions

**Q: How much memory does Prometheus need?**
A: ~1-3KB per time series. A typical API with 100 endpoints and 5 labels needs 2-4GB RAM.

**Q: Can Prometheus handle log data?**
A: No. Use Loki for logs, Jaeger for traces, and Prometheus for metrics. The Grafana stack unifies them.

**Q: What is the difference between histogram and summary?**
A: Histograms bucket data and allow aggregation. Summaries pre-compute quantiles but cannot be aggregated across instances.
