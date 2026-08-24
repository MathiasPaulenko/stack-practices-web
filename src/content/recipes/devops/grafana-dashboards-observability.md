---
contentType: recipes
slug: grafana-dashboards-observability
title: "Grafana Dashboards for Observability with Prometheus"
description: "Build Grafana dashboards that visualize Prometheus metrics. Use panels, template variables, provisioning, and alerts for team-wide observability."
metaDescription: "Build Grafana dashboards for Prometheus metrics. Create interactive visualizations with panels, variables, and alerts for thorough service observability."
difficulty: beginner
topics:
  - devops
  - observability
tags:
  - grafana
  - prometheus
  - dashboards
  - monitoring
  - observability
  - devops
relatedResources:
  - /recipes/prometheus-monitoring-alerts
  - /recipes/metrics-collection
  - /recipes/prometheus-api-monitoring
  - /recipes/log-aggregation
  - /recipes/structured-logging
  - /recipes/distributed-tracing
lastUpdated: "2026-08-23"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Build Grafana dashboards for Prometheus metrics. Create interactive visualizations with panels, variables, and alerts for thorough service observability."
  keywords:
    - grafana
    - dashboards
    - observability
    - prometheus
    - monitoring
---

## Overview

A Grafana dashboard turns a heap of Prometheus metrics into a live, readable view
of your services. This recipe walks through wiring a data source, building a
dashboard with panels and variables, provisioning it from disk, and adding alerts.
Examples mix YAML, JSON, PromQL, and Terraform snippets you can drop into your own
stack.

## When to Use

This is useful when your team wants one screen for request rate, latency, and
error rate across the fleet, with on-call engineers spotting failing services
quickly and non-technical stakeholders getting uptime visibility without writing
PromQL. It also works when you want dashboards stored as code and rolled out
through Git.

## Solution

### 1. Provision the Prometheus data source

```yaml
# provisioning/datasources/prometheus.yml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

### 2. Build the dashboard JSON

```json
{
  "dashboard": {
    "title": "API Service Overview",
    "tags": ["api", "production"],
    "timezone": "utc",
    "panels": [
      {
        "title": "Request Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (route)",
            "legendFormat": "{{ route }}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "reqps",
            "min": 0
          }
        },
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 }
      },
      {
        "title": "P95 Latency",
        "type": "timeseries",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))",
            "legendFormat": "{{ route }}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "custom": {
              "drawStyle": "line",
              "lineWidth": 2
            }
          }
        },
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 }
      },
      {
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100",
            "legendFormat": "Error %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                { "color": "green", "value": 0 },
                { "color": "yellow", "value": 1 },
                { "color": "red", "value": 5 }
              ]
            }
          }
        },
        "gridPos": { "h": 4, "w": 6, "x": 0, "y": 8 }
      }
    ]
  }
}
```

### 3. Add template variables

```json
{
  "templating": {
    "list": [
      {
        "name": "service",
        "type": "query",
        "query": "label_values(http_requests_total, job)",
        "multi": true,
        "includeAll": true
      },
      {
        "name": "route",
        "type": "query",
        "query": "label_values(http_requests_total{job=~\"$service\"}, route)",
        "multi": true,
        "includeAll": true
      },
      {
        "name": "interval",
        "type": "interval",
        "options": [
          { "text": "1m", "value": "1m" },
          { "text": "5m", "value": "5m" },
          { "text": "1h", "value": "1h" }
        ],
        "current": { "text": "5m", "value": "5m" }
      }
    ]
  }
}
```

### 4. Provision dashboards from disk

```yaml
# provisioning/dashboards/dashboards.yml
apiVersion: 1
providers:
  - name: default
    orgId: 1
    folder: Services
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: true
```

### 5. Manage dashboards as code with Terraform

```hcl
# terraform/grafana.tf
resource "grafana_dashboard" "api" {
  config_json = jsonencode({
    title = "API Overview"
    panels = [
      {
        title = "Request Rate"
        type  = "timeseries"
        targets = [{
          expr = "sum(rate(http_requests_total[5m]))"
        }]
      }
    ]
  })
}
```

### 6. Add Grafana alerts

```yaml
# provisioning/alerting/alerts.yml
apiVersion: 1
groups:
  - orgId: 1
    name: API Health
    interval: 30s
    rules:
      - uid: api-error-rate
        title: API Error Rate > 5%
        condition: A
        data:
          - refId: A
            relativeTimeRange:
              from: 300
            datasourceUid: prometheus
            model:
              expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
              instant: true
        noDataState: NoData
        execErrState: Error
        for: 5m
        annotations:
          summary: "Error rate above 5%"
        labels:
          severity: critical
        notification_settings:
          group_by: ['alertname']
          group_wait: 10s
```

### 7. Include Loki log panels

```yaml
# provisioning/datasources/loki.yml
apiVersion: 1
datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: false
    jsonData:
      maxLines: 500
```

```logql
# Error logs for a specific service
{service="api"} |= "error" | json | line_format "{{.msg}}"

# Slow requests (>1s)
{service="api"} |= "duration" | json | duration > 1000
```

## Explanation

Each piece of the dashboard has a specific job. **Panels** turn PromQL queries
into tables, graphs, gauges, or stat tiles. **Variables** let people filter by
service, route, or interval without touching the query text. **Rows** group
related panels into collapsible sections and keep the layout tidy.

**Provisioning** pulls dashboards from disk whenever Grafana starts, so they live
in Git and rollbacks stay simple. **Terraform** manages the dashboard as real
infrastructure, just like the rest of your stack. **Alerts** run PromQL
expressions and send notifications through Grafana or Alertmanager. **Loki** adds
log context next to the metrics, so a spike on a graph leads straight to the lines
that caused it.

## Variants

### Node Exporter system dashboard

```promql
# CPU usage
100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes

# Disk I/O
rate(node_disk_io_time_seconds_total[5m])
```

### Recording rules for expensive queries

```yaml
- record: job:http_p99:5m
  expr: histogram_quantile(0.99, sum by(job, le)(rate(http_request_duration_seconds_bucket[5m])))
```

## Best Practices

Store dashboards in Git and provision them at startup, so you get pull-request
reviews and an easy rollback path. Match the refresh interval to the use case:
five seconds when you're live-debugging, thirty seconds to one minute for
overviews.

Limit variables and label cardinality. A variable that lists every pod in a large
cluster can drag query performance down. Recording rules pay for themselves when
the same expensive PromQL shows up on several dashboards. Use `$__rate_interval`
rather than a fixed window so the query tracks the zoom. Cap Loki `maxLines`
at a few hundred to avoid dumping huge result sets into the browser.

## Common Mistakes

Fifty panels on one dashboard is too many, and the page gets sluggish and
unreadable. Copying a dashboard per service instead of using variables makes
maintenance explode. Forgetting thresholds on stat and gauge panels leaves healthy
and failing values looking the same. Querying months of data on an overview
dashboard is wasteful, so set a sensible default range. If you leave dashboards
editable in the UI after they're provisioned, any change disappears on the next
restart.

## FAQ

### How does Grafana compare to the Prometheus built-in UI?

Grafana is purpose-built for visualization, with dozens of panel types, variables,
and layouts. The Prometheus UI is good for ad-hoc queries, but it doesn't build
full dashboards.

### Can I use Grafana with other data sources?

Yes. Grafana connects natively to Elasticsearch, InfluxDB, CloudWatch, Loki,
Jaeger, and plenty of others.

### Should I use Grafana alerts or Prometheus Alertmanager?

Both work. Grafana alerts keep the notification config with the dashboard, while
Alertmanager keeps the routing with the metric pipeline. Pick the one that matches
where your team already handles alert routing.

### How do I keep dashboards fast?

Keep them fast with recording rules, a sensible default range, limited variables,
and a low `maxLines` cap for Loki. Avoid grouping by high-cardinality labels in
overview panels.
