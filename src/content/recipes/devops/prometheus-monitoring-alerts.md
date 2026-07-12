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
  - ci-cd
relatedResources:
  - /recipes/helm-chart-deployment
  - /patterns/ambassador-pattern-services
  - /guides/logging-monitoring-observability-guide
  - /recipes/python-prometheus-metrics-exporter
  - /recipes/grafana-dashboards-observability
  - /recipes/distributed-tracing
  - /recipes/log-aggregation
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

Instrument services and infrastructure with Prometheus metrics to gain real-time visibility into performance and health. The following demonstrates how to counter, gauge, histogram, and summary metrics, PromQL queries, alerting rules, and recording rules for production monitoring.

## When to Use This

- You need quantitative data about application and infrastructure behavior. See [Structured Logging](/recipes/observability/structured-logging) for correlated event data.
- Alerting should trigger on symptoms, not just infrastructure failures. See [Health Check Endpoint](/recipes/devops/health-check-endpoint) for symptom detection.
- Historical metrics are required for capacity planning and debugging. See [Load Testing](/recipes/testing/load-testing) for capacity baseline measurement.

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

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### Recording Rules for Performance

```yaml
# rules/recording_rules.yml
groups:
  - name: http_metrics
    interval: 30s
    rules:
      - record: job:http_request_rate:5m
        expr: sum by(job) (rate(http_requests_total[5m]))

      - record: job:http_error_rate:5m
        expr: sum by(job) (rate(http_requests_total{status=~"5.."}[5m]))

      - record: job:http_p99_latency:5m
        expr: histogram_quantile(0.99, sum by(job, le) (rate(http_request_duration_seconds_bucket[5m])))

      - record: instance:memory_usage:ratio
        expr: |
          (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
          / node_memory_MemTotal_bytes
```

### Alerting Rules with Severity

```yaml
# rules/alerting_rules.yml
groups:
  - name: service_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          job:http_error_rate:5m / job:http_request_rate:5m > 0.05
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "High error rate on {{ $labels.job }}"
          description: "{{ $labels.job }} has 5%+ error rate for 5 minutes"

      - alert: HighLatency
        expr: job:http_p99_latency:5m > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "p99 latency above 2s on {{ $labels.job }}"

      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[5m]) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Pod {{ $labels.pod }} is crash-looping"

      - alert: DiskSpaceLow
        expr: |
          (node_filesystem_avail_bytes{mountpoint="/"}
            / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 10
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Disk space below 10% on {{ $labels.instance }}"
```

### Alertmanager Routing

```yaml
# alertmanager.yml
route:
  receiver: default
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - matchers:
        - severity="critical"
      receiver: pagerduty
      group_wait: 10s
      repeat_interval: 1h

    - matchers:
        - severity="warning"
      receiver: slack
      group_wait: 5m

    - matchers:
        - team="database"
      receiver: db-team

receivers:
  - name: default
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/...'
        channel: '#alerts'

  - name: pagerduty
    pagerduty_configs:
      - routing_key: 'your-routing-key'
        severity: critical

  - name: slack
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/...'
        channel: '#warnings'

  - name: db-team
    email_configs:
      - to: 'db-team@example.com'
```

### Custom Exporter (Python)

```python
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time
import random

# Define metrics
REQUESTS = Counter('app_requests_total', 'Total requests', ['endpoint', 'method'])
LATENCY = Histogram('app_request_duration_seconds', 'Request latency', ['endpoint'])
ACTIVE_CONNECTIONS = Gauge('app_active_connections', 'Active connections')

def handle_request(endpoint, method):
    start = time.time()
    REQUESTS.labels(endpoint=endpoint, method=method).inc()
    # Simulate work
    time.sleep(random.uniform(0.01, 0.5))
    LATENCY.labels(endpoint=endpoint).observe(time.time() - start)

if __name__ == '__main__':
    start_http_server(9090)
    while True:
        handle_request('/api/users', 'GET')
        ACTIVE_CONNECTIONS.set(random.randint(1, 100))
        time.sleep(0.1)
```

## Additional Best Practices

1. **Use recording rules for dashboards.** Precompute expensive queries to speed up Grafana:

```yaml
# Precompute instead of calculating at query time
- record: job:http_p99:5m
  expr: histogram_quantile(0.99, sum by(job, le)(rate(http_request_duration_seconds_bucket[5m])))
```

1. **Set `for` durations wisely.** Too short causes flapping; too long delays alerts:

```yaml
# Critical: 2-5 minutes
for: 2m

# Warning: 10-15 minutes
for: 10m

# Info: 30+ minutes
for: 30m
```

1. **Use `keep_firing_for` to prevent alert gaps.** Keep alerts firing during evaluation delays:

```yaml
- alert: HighErrorRate
  expr: ...
  for: 5m
  keep_firing_for: 1m
```

## Additional Common Mistakes

1. **Using `rate()` with too short a window.** `rate(metric[30s])` is noisy; use at least 5 minutes:

```promql
# Bad: noisy, high variance
rate(http_requests_total[30s])

# Good: stable, meaningful
rate(http_requests_total[5m])
```

1. **Not using `histogram_quantile` correctly.** Must aggregate by `le` label:

```promql
# Bad: missing le aggregation
histogram_quantile(0.99, rate(http_duration_bucket[5m]))

# Good: aggregate by le
histogram_quantile(0.99, sum by(le)(rate(http_duration_bucket[5m])))
```

## Additional FAQ

### How do I reduce Prometheus storage usage?

1. Reduce retention period (default 15 days)
2. Lower scrape frequency for non-critical services
3. Use recording rules instead of complex queries
4. Limit label cardinality

```yaml
# prometheus.yml
storage:
  retention: 15d
  tsdb:
    max_block_duration: 2h
```

### How do I send alerts to multiple channels?

Configure Alertmanager with multiple receivers and routes:

```yaml
route:
  routes:
    - matchers: ['severity="critical"']
      receiver: pagerduty
    - matchers: ['severity="warning"']
      receiver: slack
```

### What is the difference between `rate` and `irate`?

`rate` computes the average per-second increase over a range. `irate` computes the per-second increase using only the last two samples. Use `irate` for volatile metrics on dashboards; use `rate` for alerting.

## Performance Tips

1. **Use recording rules for frequent queries.** Precompute once, query many times:

```yaml
# Compute once every 30s
- record: job:cpu_usage:5m
  expr: 100 - avg by(job)(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100
```

1. **Limit scrape targets.** Too many targets slow down Prometheus:

```yaml
# Only scrape what you need
scrape_configs:
  - job_name: 'critical-services'
    scrape_interval: 15s
    static_configs:
      - targets: ['app1:9090', 'app2:9090']  # Not every pod
```

1. **Use `scrape_interval` wisely.** 15s for critical, 60s for non-critical:

```yaml
scrape_configs:
  - job_name: 'critical'
    scrape_interval: 15s
  - job_name: 'batch'
    scrape_interval: 60s
```

1. **Use Thanos for long-term storage.** Don't keep everything in local Prometheus:

```yaml
# Thanos sidecar config
--objstore.config-file=thanos-bucket.yaml
--tsdb.path=/prometheus/data
```
