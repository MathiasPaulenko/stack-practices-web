---





contentType: guides
slug: complete-guide-prometheus-grafana
title: "Prometheus and Grafana: Metrics, Dashboards, Alerting"
description: "Master Prometheus metrics collection and Grafana dashboards. Covers metric types, PromQL, service instrumentation, alerting rules, and production deployment patterns."
metaDescription: "Master Prometheus and Grafana: metric types, PromQL queries, service instrumentation, alerting rules, dashboards, and production deployment patterns for monitoring."
difficulty: advanced
topics:
  - observability
tags:
  - guide
  - prometheus
  - grafana
  - metrics
  - monitoring
  - alerting
  - observability
relatedResources:
  - /guides/complete-guide-distributed-tracing
  - /guides/complete-guide-structured-logging
  - /patterns/circuit-breaker-with-monitoring-pattern
  - /guides/complete-guide-sentry-error-tracking
  - /recipes/real-user-monitoring
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 22
seo:
  metaDescription: "Master Prometheus and Grafana: metric types, PromQL queries, service instrumentation, alerting rules, dashboards, and production deployment patterns for monitoring."
  keywords:
    - prometheus
    - grafana
    - promql
    - metrics monitoring
    - alerting rules
    - observability
    - dashboards





---

## Introduction

Prometheus is a time-series database that scrapes metrics from instrumented services. Grafana is a visualization platform that queries Prometheus to build dashboards and alerts. Together they form the most widely adopted open-source monitoring stack. Prometheus handles metric collection, storage, and alerting rules. Grafana handles visualization, dashboarding, and alert delivery. Below is a practical guide to metric types, PromQL, service instrumentation in Python/Node.js/Java, alerting rules, and production deployment.

## Prometheus Metric Types

```
Counter:      Monotonically increasing (total requests, total errors)
              Use case: "How many orders have been placed?"
              Query: rate(orders_total[5m]) → orders per second

Gauge:        Can go up or down (queue depth, memory usage, active connections)
              Use case: "How many users are currently online?"
              Query: active_users → current value

Histogram:    Distribution of values in buckets (request latency, response size)
              Use case: "What is the 99th percentile latency?"
              Query: histogram_quantile(0.99, http_request_duration_seconds_bucket)

Summary:      Pre-computed quantiles on the client side (deprecated in favor of Histograms)
              Use case: "What is the median request duration?"
              Note: Use Histograms instead — they allow server-side aggregation.
```

## Service Instrumentation

### Python: prometheus_client

```python
# metrics.py — Prometheus instrumentation for Python
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
import time

# Define metrics
ORDERS_TOTAL = Counter(
    "orders_total",
    "Total number of orders created",
    ["status", "payment_method"],
)

ORDER_DURATION = Histogram(
    "order_creation_duration_seconds",
    "Time spent creating orders",
    ["endpoint"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

ACTIVE_USERS = Gauge(
    "active_users",
    "Number of currently active users",
)

QUEUE_DEPTH = Gauge(
    "message_queue_depth",
    "Number of messages in the queue",
    ["queue_name"],
)

# Usage in service code
class OrderService:
    def create_order(self, user_id: int, items: list[dict]) -> dict:
        start = time.time()
        try:
            order = self._process_order(user_id, items)
            ORDERS_TOTAL.labels(status="success", payment_method=order["payment_method"]).inc()
            return order
        except PaymentError:
            ORDERS_TOTAL.labels(status="payment_failed", payment_method="unknown").inc()
            raise
        except Exception:
            ORDERS_TOTAL.labels(status="error", payment_method="unknown").inc()
            raise
        finally:
            ORDER_DURATION.labels(endpoint="/api/orders").observe(time.time() - start)

# Metrics endpoint
from flask import Flask, Response

app = Flask(__name__)

@app.route("/metrics")
def metrics():
    return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)
```

### Node.js: prom-client

```typescript
// metrics.ts — Prometheus instrumentation for Node.js
import { Counter, Histogram, Gauge, register } from "prom-client";

// Define metrics
const ordersTotal = new Counter({
  name: "orders_total",
  help: "Total number of orders created",
  labelNames: ["status", "paymentMethod"] as const,
});

const orderDuration = new Histogram({
  name: "order_creation_duration_seconds",
  help: "Time spent creating orders",
  labelNames: ["endpoint"] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
});

const activeUsers = new Gauge({
  name: "active_users",
  help: "Number of currently active users",
});

const queueDepth = new Gauge({
  name: "message_queue_depth",
  help: "Number of messages in the queue",
  labelNames: ["queueName"] as const,
});

// Usage in service code
class OrderService {
  async createOrder(userId: string, items: OrderItem[]): Promise<Order> {
    const start = Date.now();
    try {
      const order = await this.processOrder(userId, items);
      ordersTotal.inc({ status: "success", paymentMethod: order.paymentMethod });
      return order;
    } catch (error) {
      ordersTotal.inc({ status: "error", paymentMethod: "unknown" });
      throw error;
    } finally {
      orderDuration.observe({ endpoint: "/api/orders" }, (Date.now() - start) / 1000);
    }
  }
}

// Metrics endpoint (Express)
import express from "express";
const app = express();

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
```

### Java: Micrometer

```java
// MetricsConfig.java — Micrometer with Prometheus
import io.micrometer.core.instrument.*;
import io.micrometer.prometheus.PrometheusMeterRegistry;
import io.micrometer.core.instrument.binder.jvm.JvmMemoryMetrics;
import io.micrometer.core.instrument.binder.system.ProcessorMetrics;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MetricsConfig {

    @Bean
    public PrometheusMeterRegistry prometheusRegistry() {
        PrometheusMeterRegistry registry = new PrometheusMeterRegistry(key -> null);

        // Bind JVM and system metrics
        new JvmMemoryMetrics().bindTo(registry);
        new ProcessorMetrics().bindTo(registry);

        return registry;
    }
}

// Service code using Micrometer
@Service
public class OrderService {

    private final Counter ordersCounter;
    private final Timer orderDurationTimer;
    private final Gauge activeUsersGauge;

    public OrderService(MeterRegistry registry) {
        this.ordersCounter = Counter.builder("orders_total")
            .description("Total number of orders created")
            .tags("status", "success")
            .register(registry);

        this.orderDurationTimer = Timer.builder("order_creation_duration")
            .description("Time spent creating orders")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);

        this.activeUsersGauge = Gauge.builder("active_users", this, OrderService::getActiveUserCount)
            .description("Number of currently active users")
            .register(registry);
    }

    public Order createOrder(Long userId, List<OrderItem> items) {
        return orderDurationTimer.record(() -> {
            Order order = processOrder(userId, items);
            ordersCounter.increment();
            return order;
        });
    }

    private int getActiveUserCount() {
        return userSessionManager.getActiveCount();
    }
}

// Metrics endpoint
@RestController
public class MetricsController {

    private final PrometheusMeterRegistry registry;

    public MetricsController(PrometheusMeterRegistry registry) {
        this.registry = registry;
    }

    @GetMapping("/metrics")
    public String metrics() {
        return registry.scrape();
    }
}
```

## PromQL Queries

### Basic queries

```promql
# Current value of a gauge
active_users

# Rate of a counter over 5 minutes
rate(orders_total[5m])

# Total increase over 1 hour
increase(orders_total[1h])

# Average over 5 minutes
avg_over_time(memory_usage_bytes[5m])

# Max over 10 minutes
max_over_time(queue_depth[10m])
```

### Label filtering

```promql
# Filter by status label
orders_total{status="error"}

# Filter by multiple labels
http_requests_total{method="POST", status=~"5.."}

# Regex matching (5xx errors)
http_requests_total{status=~"5.."}

# Negative regex (exclude health checks)
http_requests_total{path!="/health"}
```

### Aggregations

```promql
# Sum by service
sum by (service) (rate(http_requests_total[5m]))

# Average by endpoint
avg by (endpoint) (rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m]))

# Top 5 endpoints by error rate
topk(5, sum by (endpoint) (rate(http_requests_total{status=~"5.."}[5m])))

# 99th percentile latency
histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))
```

### Arithmetic and comparisons

```promql
# Error rate as percentage
100 * sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# Memory usage as percentage of limit
100 * (memory_usage_bytes / on() memory_limit_bytes)

# CPU usage above 80%
(100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)) > 80
```

## Alerting Rules

```yaml
# alerting_rules.yml — Prometheus alerting rules
groups:
  - name: service-alerts
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          100 * sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
          / sum(rate(http_requests_total[5m])) by (service) > 5
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "High error rate on {{ $labels.service }}"
          description: "{{ $labels.service }} has {{ $value }}% error rate for the last 5 minutes."

      # High latency (P99 > 2s)
      - alert: HighLatencyP99
        expr: |
          histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m]))) > 2
        for: 10m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "High P99 latency on {{ $labels.service }}"
          description: "P99 latency is {{ $value }}s for the last 10 minutes."

      # Service down
      - alert: ServiceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
          team: oncall
        annotations:
          summary: "Service {{ $labels.instance }} is down"
          description: "{{ $labels.instance }} has been down for more than 2 minutes."

      # High memory usage
      - alert: HighMemoryUsage
        expr: |
          100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 85
        for: 10m
        labels:
          severity: warning
          team: infra
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value }}% for the last 10 minutes."

      # Queue depth growing
      - alert: QueueDepthGrowing
        expr: |
          avg_over_time(message_queue_depth[10m]) > avg_over_time(message_queue_depth[1h]) * 2
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Queue {{ $labels.queue_name }} depth is growing"
          description: "Queue depth is 2x higher than the 1h average."
```

## Grafana Dashboards

### Provisioning dashboards

```yaml
# grafana/provisioning/dashboards/dashboards.yml
apiVersion: 1
providers:
  - name: 'default'
    orgId: 1
    folder: 'Services'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    options:
      path: /var/lib/grafana/dashboards
```

### Dashboard JSON (key panels)

```json
{
  "dashboard": {
    "title": "Order Service Overview",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (endpoint)",
            "legendFormat": "{{endpoint}}"
          }
        ]
      },
      {
        "title": "Error Rate %",
        "type": "stat",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "100 * sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))"
          }
        ],
        "thresholds": [
          { "color": "green", "value": 0 },
          { "color": "yellow", "value": 1 },
          { "color": "red", "value": 5 }
        ]
      },
      {
        "title": "P99 Latency",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))",
            "legendFormat": "P99"
          },
          {
            "expr": "histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))",
            "legendFormat": "P95"
          }
        ]
      }
    ]
  }
}
```

## Production Deployment

```yaml
# docker-compose.yml — Full Prometheus + Grafana stack
version: "3.8"
services:
  prometheus:
    image: prom/prometheus:v2.52.0
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alerting_rules.yml:/etc/prometheus/alerting_rules.yml
      - prometheus-data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.retention.time=30d"
      - "--web.enable-lifecycle"

  grafana:
    image: grafana/grafana:10.4.0
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    depends_on:
      - prometheus

  alertmanager:
    image: prom/alertmanager:v0.27.0
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml

  node-exporter:
    image: prom/node-exporter:v1.8.0
    ports:
      - "9100:9100"
    pid: host

volumes:
  prometheus-data:
  grafana-data:
```

```yaml
# prometheus.yml — Prometheus configuration
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - alerting_rules.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: "node"
    static_configs:
      - targets: ["node-exporter:9100"]

  - job_name: "order-service"
    static_configs:
      - targets: ["order-service:8080"]
    metrics_path: /metrics
    scrape_interval: 10s

  - job_name: "api-gateway"
    static_configs:
      - targets: ["api-gateway:8080"]
    metrics_path: /metrics
```

```yaml
# alertmanager.yml — Alert routing
route:
  receiver: "default"
  group_by: ["alertname", "service"]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: "default"
    slack_configs:
      - api_url: "https://hooks.slack.com/services/..."
        channel: "#alerts"
        send_resolved: true
        title: '{{ .CommonLabels.alertname }}'
        text: '{{ .CommonAnnotations.summary }}'

  - name: "oncall"
    pagerduty_configs:
      - service_key: "your-pagerduty-key"
```

## Best Practices


- For a deeper guide, see [Complete Guide to Observability with the Grafana Stack](/guides/complete-guide-observability-grafana-stack/).

- Use Histograms over Summaries — Histograms allow server-side aggregation across instances
- Use consistent naming — `unit_suffix` convention: `_seconds`, `_bytes`, `_total`
- Label cardinality matters — avoid high-cardinality labels like `user_id` or `request_id`
- Set retention wisely — 15s scrape at 30 days is ~1GB per 100k series
- Use `rate()` not `irate()` for alerts — `irate` is for ad-hoc queries, not alerting
- Alert on symptoms, not causes — "error rate > 5%" not "CPU > 80%"
- Use `for` clause in alerts — avoid flapping alerts from momentary spikes
- Scrape interval of 10-15s — balance between resolution and storage cost
- Use recording rules for expensive queries — pre-compute and store the result
- Monitor the monitor — track Prometheus's own health, storage, and scrape failures

## Common Mistakes

- **High cardinality labels**: labeling metrics with `user_id` or `session_id` creates millions of series. Use logs for high-cardinality data.
- **Using Summaries**: Summaries can't be aggregated across instances. Use Histograms with buckets.
- **No `for` clause**: alerts fire on momentary spikes and immediately resolve. Add `for: 5m`.
- **Scraping too frequently**: 1s scrape interval creates massive storage. Use 10-15s.
- **Not using recording rules**: expensive PromQL queries on every dashboard refresh. Pre-compute with recording rules.

## FAQ

### What is Prometheus?

A time-series database and monitoring system that scrapes metrics from instrumented services via HTTP. It stores metrics locally, evaluates alerting rules, and sends alerts to Alertmanager.

### What is PromQL?

Prometheus Query Language. A functional query language for selecting, aggregating, and computing over time-series data. Used in Grafana dashboards and alerting rules.

### Pull vs. push monitoring?

Prometheus pulls metrics from services by scraping `/metrics` endpoints. This is simpler than push-based systems — services don't need to know the monitoring server address, and Prometheus controls the scrape rate.

### How long should I retain metrics?

15-30 days for most use cases. Longer retention requires more storage. Use remote storage (Thanos, Cortex) for long-term retention beyond 30 days.

### What is a recording rule?

A pre-computed PromQL expression stored as a new time series. Recording rules speed up dashboard queries and reduce Prometheus CPU load by computing expensive aggregations ahead of time.
