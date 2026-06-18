---
contentType: recipes
slug: prometheus-monitoring-alerts
title: "Metrics Collection and Alerting with Prometheus"
description: "Instrument applications and infrastructure with Prometheus metrics, configure alerting rules, and set up recording rules for efficient monitoring of service health"
metaDescription: "Instrument applications with Prometheus metrics. Configure alerting rules and recording rules for efficient monitoring of service health and infrastructure."
difficulty: intermediate
topics:
  - devops
  - observability
tags:
  - prometheus
  - monitoring
  - devops
  - observability
relatedResources:
  - /recipes/devops/helm-chart-deployment
  - /patterns/design/ambassador-pattern-services
  - /guides/logging-monitoring-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Instrument applications with Prometheus metrics. Configure alerting rules and recording rules for efficient monitoring of service health and infrastructure."
  keywords:
    - prometheus
    - metrics
    - alerting
    - monitoring
    - service health
---

# Metrics Collection and Alerting with Prometheus

Instrument services and infrastructure with Prometheus metrics to gain real-time visibility into performance and health. This recipe covers counter, gauge, histogram, and summary metrics, PromQL queries, alerting rules, and recording rules for production monitoring.

## When to Use This

- You need quantitative data about application and infrastructure behavior
- Alerting should trigger on symptoms, not just infrastructure failures
- Historical metrics are required for capacity planning and debugging

## Solution

### 1. Instrument Application Metrics

```typescript
// metrics/server.ts
import prometheus from 'prom-client';

const register = new prometheus.Registry();
prometheus.collectDefaultMetrics({ register });

// Counter: only increases (requests, errors)
const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Gauge: goes up and down (memory, connections)
const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

// Histogram: request duration buckets
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// Middleware to record metrics
function metricsMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || 'unknown',
      status_code: res.statusCode,
    });
    httpRequestDuration.observe(
      { method: req.method, route: req.route?.path || 'unknown' },
      duration
    );
  });
  next();
}

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 2. Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'api'
    static_configs:
      - targets: ['api:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

### 3. Alerting Rules

```yaml
# rules/alerts.yml
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status_code=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on {{ $labels.route }}"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: SlowRequests
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route)
          ) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow requests on {{ $labels.route }}"
```

### 4. Recording Rules for Efficiency

```yaml
# rules/records.yml
groups:
  - name: api_records
    rules:
      - record: job:http_requests_total:rate5m
        expr: sum(rate(http_requests_total[5m])) by (job)

      - record: job:http_request_duration:p95
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (job, le)
          )
```

### 5. Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alerts@example.com'

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'

receivers:
  - name: 'default'
    email_configs:
      - to: 'oncall@example.com'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/...'
        channel: '#alerts'
```

## How It Works

- **Counters** track cumulative events like requests and errors
- **Gauges** track values that fluctuate like memory and queue depth
- **Histograms** bucket observations for latency and size distributions
- **Recording rules** precompute expensive queries for faster dashboards
- **Alerting rules** evaluate expressions and fire alerts to Alertmanager

## Production Considerations

- Use remote storage (Thanos, Cortex) for long-term retention and HA
- Keep cardinality low by limiting label values; high cardinality degrades performance
- Set appropriate `for` durations to prevent flapping alerts

## Common Mistakes

- Using labels with unbounded values like user IDs or session IDs
- Alerting on causes (CPU usage) instead of symptoms (slow requests)
- Not grouping alerts, causing alert fatigue from individual failures

## FAQ

**Q: How is this different from logs?**
A: Metrics are numeric aggregates over time, ideal for trends and thresholds. Logs are discrete events, better for debugging specific incidents.

**Q: Can I use Prometheus without Kubernetes?**
A: Yes. Prometheus runs as a standalone binary and can scrape any HTTP endpoint that exposes metrics.
