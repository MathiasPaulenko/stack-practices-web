---




contentType: guides
slug: metrics-and-dashboards-guide
title: "Metrics and Dashboards"
description: "A practical guide to metrics and dashboards: instrumenting applications, choosing metric types, building useful dashboards, and creating alerting pipelines with Prometheus, Grafana, and Datadog."
metaDescription: "Learn metrics and dashboards: instrument applications, choose metric types, build useful dashboards, and create alerting pipelines with Prometheus and Grafana."
difficulty: intermediate
topics:
  - observability
  - devops
  - performance
tags:
  - metrics
  - dashboards
  - prometheus
  - grafana
  - datadog
  - instrumentation
  - guide
relatedResources:
  - /guides/distributed-tracing-guide
  - /guides/log-aggregation-guide
  - /guides/alert-management-guide
  - /guides/observability-guide
  - /guides/sre-practices-guide
  - /guides/connection-pooling-deep-dive-guide
  - /guides/etl-pipeline-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn metrics and dashboards: instrument applications, choose metric types, build useful dashboards, and create alerting pipelines with Prometheus and Grafana."
  keywords:
    - metrics
    - dashboards
    - prometheus
    - grafana
    - datadog
    - instrumentation
    - guide




---

## Overview

Metrics are numerical measurements collected over time that tell you how your systems behave. Dashboards visualize those metrics to make patterns visible. Together, they form the foundation of operational awareness, enabling teams to spot trends, detect anomalies, and make data-driven decisions.

The following guide covers metric types, instrumentation patterns, dashboard design, and alert creation.

## When to Use


- For alternatives, see [Observability — Metrics, Logs, and Traces Complete Guide](/guides/observability-guide/).

- You need to monitor system health and performance over time
- You want to detect trends before they become incidents
- Your team needs a shared operational picture
- You are establishing SLOs and need to measure compliance
- You want to reduce MTTR with visual, queryable data

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Counter** | A cumulative metric that only increases (requests served, errors) |
| **Gauge** | A metric that can go up or down (temperature, queue depth, CPU) |
| **Histogram** | Samples observations into configurable buckets (request duration) |
| **Summary** | Similar to histogram but calculates percentiles client-side |
| **Cardinality** | Number of unique time series (high cardinality = expensive) |
| **SLI / SLO / SLA** | Service Level Indicator, Objective, and Agreement |

## Metric Types and When to Use Them

| Type | Use Case | Example | Do Not Use For |
|------|----------|---------|----------------|
| **Counter** | Counting events | `http_requests_total` | Values that decrease |
| **Gauge** | Point-in-time values | `memory_usage_bytes`, `queue_size` | Rates or cumulative counts |
| **Histogram** | Distribution of values | `request_duration_seconds` | Exact percentile calculation (use summary) |
| **Summary** | Pre-computed percentiles | `request_latency_quantile` | When you need histogram heatmaps |

## Step-by-Step Metrics and Dashboards

### 1. Instrument Your Applications

Expose metrics in a format your collector understands:

```python
# Example: Python application metrics with Prometheus client
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time

# Define metrics
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'status', 'path']
)

request_duration_seconds = Histogram(
    'request_duration_seconds',
    'HTTP request duration',
    ['method', 'path'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 5.0]
)

active_connections = Gauge(
    'active_connections',
    'Number of active connections'
)

# Instrument your code
@app.route("/api/orders/<order_id>")
def get_order(order_id):
    start = time.time()
    active_connections.inc()
    
    try:
        order = fetch_order(order_id)
        http_requests_total.labels(method='GET', status='200', path='/api/orders').inc()
        return jsonify(order)
    except OrderNotFound:
        http_requests_total.labels(method='GET', status='404', path='/api/orders').inc()
        return jsonify({"error": "Not found"}), 404
    finally:
        request_duration_seconds.labels(method='GET', path='/api/orders').observe(time.time() - start)
        active_connections.dec()

# Expose metrics endpoint
start_http_server(8000)
```

```java
// Example: Spring Boot with Micrometer
@Configuration
public class MetricsConfig {
    
    @Bean
    public MeterRegistryCustomizer<MeterRegistry> metricsCommonTags() {
        return registry -> registry.config()
            .commonTags("application", "orders-service");
    }
}

@Service
public class OrderService {
    private final Counter orderCounter;
    private final Timer orderTimer;
    
    public OrderService(MeterRegistry registry) {
        this.orderCounter = Counter.builder("orders.processed")
            .description("Total orders processed")
            .register(registry);
        this.orderTimer = Timer.builder("orders.processing.time")
            .description("Order processing time")
            .register(registry);
    }
    
    public Order processOrder(OrderRequest request) {
        return orderTimer.recordCallable(() -> {
            Order result = doProcess(request);
            orderCounter.increment();
            return result;
        });
    }
}
```

**Instrumentation checklist:**
- Instrument the four golden signals: latency, traffic, errors, saturation
- Add labels for dimensions you will filter by (service, environment, endpoint)
- Use consistent naming: `unit` suffix, `total` for counters, `seconds` for duration
- Avoid high-cardinality labels (user IDs, session IDs, request IDs)
- Measure business metrics (orders placed, payments processed) alongside technical metrics

### 2. Collect and Store Metrics

Set up a metrics pipeline:

```yaml
# Example: Prometheus scrape configuration
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
```

**What works for collection:**
- Scrape every 10-30 seconds (faster for high-frequency changes)
- Use service discovery (Kubernetes, Consul, DNS) instead of static targets
- Run collectors in each region/zone to minimize latency
- Use remote write for long-term storage (Thanos, Cortex, VictoriaMetrics)
- Federation for hierarchical aggregation (edge → regional → global)

### 3. Build Useful Dashboards

Design dashboards that tell a story:

| Dashboard Type | Purpose | Key Panels |
|----------------|---------|------------|
| **Service overview** | Health of a single service | Error rate, latency p95, throughput, resource usage |
| **Golden signals** | Cross-service health | RED metrics (Rate, Errors, Duration) per service |
| **Business KPI** | Impact on revenue/usage | Conversions, active users, transaction volume |
| **Infrastructure** | Cluster/node health | CPU, memory, disk, network across all nodes |
| **Incident response** | Drill-down during incidents | Detailed per-endpoint latency, error breakdown, logs |

```json
// Example: Grafana dashboard JSON snippet (simplified)
{
  "dashboard": {
    "title": "Orders Service - Golden Signals",
    "panels": [
      {
        "title": "Request Rate",
        "type": "timeseries",
        "targets": [{
          "expr": "sum(rate(http_requests_total{service=\"orders\"}[5m])) by (status)"
        }]
      },
      {
        "title": "Error Rate",
        "type": "stat",
        "targets": [{
          "expr": "sum(rate(http_requests_total{service=\"orders\",status=~\"5..\"}[5m])) / sum(rate(http_requests_total{service=\"orders\"}[5m]))"
        }],
        "thresholds": [
          {"value": 0.001, "color": "green"},
          {"value": 0.01, "color": "yellow"},
          {"value": 0.05, "color": "red"}
        ]
      },
      {
        "title": "Latency p95",
        "type": "timeseries",
        "targets": [{
          "expr": "histogram_quantile(0.95, sum(rate(request_duration_seconds_bucket{service=\"orders\"}[5m])) by (le))"
        }]
      }
    ]
  }
}
```

**Dashboard design principles:**
- Put the most important panels at the top-left
- Use consistent colors: green = good, yellow = warning, red = critical
- Add links to related dashboards, logs, and traces
- Keep the number of panels per dashboard under 20
- Use template variables for service, environment, and time range

### 4. Define SLIs and SLOs

Translate metrics into reliability targets:

```promql
# Example: SLI queries for common objectives

# Availability SLI: % of successful requests
(
  sum(rate(http_requests_total{status!~"5.."}[5m]))
  /
  sum(rate(http_requests_total[5m]))
) * 100

# Latency SLI: % of requests under threshold
(
  sum(rate(request_duration_seconds_bucket{le="0.5"}[5m]))
  /
  sum(rate(request_duration_seconds_bucket{le="+Inf"}[5m]))
) * 100

# Error budget: remaining acceptable errors
# SLO: 99.9% availability
# Error budget: 0.1% of total requests per month
0.001 * sum(increase(http_requests_total[30d]))
```

| Objective | SLI | SLO | Measurement Window |
|-------------|-----|-----|-------------------|
| Availability | Successful requests / total requests | 99.9% | 30 days |
| Latency | Requests under 200ms / total requests | 99% under 200ms | 7 days |
| Error rate | Error responses / total responses | < 0.1% | 1 hour |
| Throughput | Requests per second | > 1000 rps | 5 minutes |

### 5. Create Meaningful Alerts

Alert on symptoms, not causes:

```yaml
# Example: Prometheus alerting rules
groups:
  - name: service_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate in {{ $labels.service }}"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: LatencyDegradation
        expr: |
          histogram_quantile(0.95,
            sum(rate(request_duration_seconds_bucket[5m])) by (le)
          ) > 1.0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Latency p95 above 1s"
```

**Alert design principles:**
- Alert on user-impacting symptoms (error rate, latency), not causes (disk full)
- Use `for:` duration to reduce noise (require sustained threshold breach)
- Add runbook links and dashboard links to every alert
- Severity levels: page for critical (user impact), ticket for warning (trending)
- Regularly review alert frequency and tune thresholds

## What Works

- **Name metrics consistently.** `service_unit` format: `orders_service_requests_total`.
- **Document your metrics.** Every metric needs a description and unit.
- **Use histograms over averages.** Averages hide outliers; histograms show distribution.
- **Cardinality is cost.** Every unique label combination creates a new time series.
- **Dashboards are for exploration, not monitoring.** Alerts notify; dashboards investigate.
- **Test your dashboards.** Walk through incident scenarios to verify they provide answers.

## Common Mistakes

- **High-cardinality metrics.** Labeling by user ID or request ID explodes storage.
- **Alerting on everything.** Too many alerts create noise and reduce response quality.
- **Missing units.** A metric named `latency` is ambiguous — `latency_seconds` is clear.
- **Averaging percentiles.** You cannot average p95s across services. Use histograms.
- **No aggregation rules.** Raw high-frequency metrics overwhelm dashboards; aggregate first.

## Variants

- **Pull-based:** Prometheus scrapes exporters (standard for Kubernetes)
- **Push-based:** StatsD, Telegraf, or application pushes to collector (better for short-lived jobs)
- **Cloud-native:** AWS CloudWatch, Google Cloud Monitoring, Azure Monitor (managed, but vendor-specific)
- **Enterprise:** Datadog, New Relic, Dynatrace (rich capabilities, per-host pricing)

## FAQ

**Q: How many metrics should my application expose?**
10-50 well-chosen metrics beats 1000 auto-generated ones. Focus on the four golden signals and business KPIs.

**Q: What scrape interval should I use?**
15 seconds is standard. Use 5 seconds for critical systems, 60 seconds for slow-changing infrastructure.

**Q: How do I handle metric cardinality?**
Use static label values (status code class, not exact URL). Drop high-cardinality labels at ingestion if necessary.

**Q: Should I use Prometheus or a SaaS solution?**
Prometheus is free but requires operational expertise. SaaS solutions reduce overhead but increase cost at scale. Many teams use both: Prometheus for real-time, SaaS for long-term.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.

## Conclusion

Metrics and dashboards transform raw system data into operational intelligence. By instrumenting consistently, designing dashboards for decision-making, and alerting on symptoms rather than causes, you build an observability practice that reduces MTTR and improves system reliability.
