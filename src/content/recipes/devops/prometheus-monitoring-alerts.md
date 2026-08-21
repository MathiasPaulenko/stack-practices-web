---
contentType: recipes
slug: prometheus-monitoring-alerts
title: "Metrics Collection and Alerting with Prometheus"
description: "Instrument applications and infrastructure with Prometheus metrics, configure alerting rules, and set up recording rules for efficient monitoring."
metaDescription: "Instrument applications with Prometheus metrics. Configure alerting rules, recording rules, and Alertmanager routing for service health monitoring."
difficulty: intermediate
topics:
  - devops
  - observability
tags:
  - prometheus
  - monitoring
  - devops
  - observability
  - ci-cd
relatedResources:
  - /recipes/python-prometheus-metrics-exporter
  - /recipes/prometheus-api-monitoring
  - /recipes/grafana-dashboards-observability
  - /recipes/structured-logging
  - /recipes/log-aggregation
  - /recipes/helm-chart-deployment
lastUpdated: "2026-08-19"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Instrument applications with Prometheus metrics. Configure alerting rules, recording rules, and Alertmanager routing for service health monitoring."
  keywords:
    - prometheus
    - metrics
    - alerting
    - monitoring
    - service health
    - promql
---

## Overview

Prometheus collects time-series metrics by scraping HTTP endpoints that expose data in
its text format. You instrument your services with counters, gauges, histograms, and
summaries, then query the data with PromQL and set up alerting rules to notify you when
something breaks.

This recipe covers instrumentation, scrape config, recording rules, alerting rules, and
Alertmanager routing.

## When to Use

- You need numeric, time-stamped data about application and infrastructure behavior.
- You want alerts based on symptoms (error rate, latency) rather than raw causes.
- You need precomputed queries for dashboards or fast alerting.
- You want to route alerts by severity or team.

## When NOT to Use

- For deep debugging of individual events: use logs or traces instead.
- For long-term storage without planning: Prometheus keeps data locally by default.
- When you need a push model for metrics: use the Pushgateway only for short-lived
  jobs.

## Solution

### Instrument application metrics

```typescript
// metrics/server.ts
import prometheus from 'prom-client';

const register = new prometheus.Registry();
prometheus.collectDefaultMetrics({ register });

const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

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

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Scrape configuration

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
```

### Alerting rules

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

### Recording rules

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

### Alertmanager routing

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

  - name: 'pagerduty'
    pagerduty_configs:
      - routing_key: 'your-routing-key'

  - name: 'slack-warnings'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/...'
        channel: '#warnings'

  - name: 'db-team'
    email_configs:
      - to: 'db-team@example.com'
```

### Custom Python exporter

```python
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time
import random

REQUESTS = Counter('app_requests_total', 'Total requests', ['endpoint', 'method'])
LATENCY = Histogram('app_request_duration_seconds', 'Request latency', ['endpoint'])
ACTIVE_CONNECTIONS = Gauge('app_active_connections', 'Active connections')

def handle_request(endpoint, method):
    start = time.time()
    REQUESTS.labels(endpoint=endpoint, method=method).inc()
    time.sleep(random.uniform(0.01, 0.5))
    LATENCY.labels(endpoint=endpoint).observe(time.time() - start)

if __name__ == '__main__':
    start_http_server(9090)
    while True:
        handle_request('/api/users', 'GET')
        ACTIVE_CONNECTIONS.set(random.randint(1, 100))
        time.sleep(0.1)
```

## Explanation

- **Counter**: only goes up. Use it for requests, errors, or completed tasks.
- **Gauge**: goes up and down. Use it for memory, connections, or queue depth.
- **Histogram**: counts observations into buckets. Use it for latency or response size.
- **Summary**: like a histogram, but it computes quantiles on the client side.
- **Recording rules**: precompute expensive PromQL queries so dashboards load faster.
- **Alerting rules**: evaluate PromQL expressions and send firing alerts to
  Alertmanager.
- **Alertmanager**: groups, silences, and routes alerts to the right receiver.

## Variants

|Exporter type|When to use|
|-------------|-----------|
|In-app library|Full control over labels and business metrics|
|Node exporter|Hardware and OS metrics for Linux/Unix|
|Blackbox exporter|Probe endpoints from the outside|
|Pushgateway|Short-lived batch jobs that can't be scraped|

## Best Practices

- Alert on symptoms (high error rate, latency) rather than causes (CPU usage).
- Keep label cardinality low; unbounded values like user IDs explode storage.
- Set a `for` duration that avoids flapping but still matters.
- Use recording rules for queries that run often in dashboards.
- Route critical alerts to paging and warnings to chat.
- Keep Prometheus data retention short; use Thanos or Cortex for long-term storage.
- Scrape only what you need; `scrape_interval` can be 15s or several minutes.

## Common Mistakes

- Using high-cardinality labels such as user IDs or session IDs.
- Alerting on causes instead of symptoms.
- Not grouping alerts, which floods the on-call channel.
- Forgetting to set `for`, so every blip pages the team.
- Retrying sensitive alert routing without a `repeat_interval`.
- Querying raw metrics in dashboards instead of using recording rules.

## FAQ

### How are metrics different from logs?

Metrics are numeric aggregates over time, ideal for trends and thresholds. Logs are
discrete events, better for debugging specific incidents.

### Can I use Prometheus without Kubernetes?

Yes. Prometheus runs as a standalone binary and can scrape any HTTP endpoint that
exposes metrics.

### What is the difference between a histogram and a summary?

A histogram buckets observations on the server and is aggregatable across instances. A
summary computes quantiles on the client and can't be averaged across instances.

### When should I use the Pushgateway?

Only for short-lived batch jobs that finish before Prometheus can scrape them. Don't
use it for long-running services.

### How do I choose the `for` duration?

Set it long enough to avoid noise but short enough to matter. Two to five minutes is a
common starting point.

### What status codes should trigger alerts?

Alert on sustained high error rates (5xx) or latency, not on a single failed request.
