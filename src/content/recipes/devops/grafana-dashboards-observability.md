---
contentType: recipes
slug: grafana-dashboards-observability
title: "Observability Dashboards with Grafana and Prometheus"
description: "Build interactive Grafana dashboards that visualize Prometheus metrics with panels, variables, and alerts for thorough service observability"
metaDescription: "Build Grafana dashboards for Prometheus metrics. Create interactive visualizations with panels, variables, and alerts for thorough service observability."
difficulty: beginner
topics:
  - devops
  - observability
tags:
  - monitoring
  - observability
  - devops
  - ci-cd
  - automation
relatedResources:
  - /recipes/devops/prometheus-monitoring-alerts
  - /recipes/devops/helm-chart-deployment
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build Grafana dashboards for Prometheus metrics. Create interactive visualizations with panels, variables, and alerts for thorough service observability."
  keywords:
    - grafana
    - dashboards
    - observability
    - prometheus
    - visualization
---

# Observability Dashboards with Grafana and Prometheus

Create rich, interactive dashboards in Grafana to visualize Prometheus metrics and understand service behavior at a glance. This recipe covers panel types, template variables, row organization, and dashboard-as-code practices for consistent observability across teams.

## When to Use This

- Teams need a centralized view of service health and performance. See [Health Check Endpoint](/recipes/devops/health-check-endpoint) for readiness probes.
- On-call engineers must quickly identify which service is failing. See [Prometheus API Monitoring](/recipes/observability/prometheus-api-monitoring) for metrics collection.
- Business stakeholders want uptime and latency visibility without querying metrics directly. See [API Status Page Template](/docs/templates/api-status-page-template) for external status reporting.

## Solution

### 1. Provision Data Sources

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

### 2. Dashboard JSON Model

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
            "expr": "sum(rate(http_requests_total{status_code=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))",
            "legendFormat": "Error %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit",
            "thresholds": {
              "steps": [
                { "color": "green", "value": 0 },
                { "color": "yellow", "value": 0.01 },
                { "color": "red", "value": 0.05 }
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

### 3. Template Variables for Live Filtering

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
      }
    ]
  }
}
```

### 4. Dashboard Provisioning

```yaml
# provisioning/dashboards/dashboards.yml
apiVersion: 1
providers:
  - name: default
    folder: Services
    type: file
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: true
```

### 5. Dashboard as Code with Terraform

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

## How It Works

- **Panels** display queries in tables, graphs, gauges, and stat formats
- **Variables** allow filtering by service, region, or route live
- **Rows** organize panels into collapsible sections for focused views
- **Alerts** can be configured directly in Grafana or via Prometheus Alertmanager

## Variation: Node Exporter System Dashboard

```promql
# CPU usage
100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes

# Disk I/O
rate(node_disk_io_time_seconds_total[5m])
```

## Production Considerations

- Use dashboard provisioning to version control dashboards in Git
- Set appropriate refresh intervals; 5s for real-time, 30s-1m for overview
- Limit dashboard variables to prevent expensive queries on large labels

## Common Mistakes

- Overloading a single dashboard with 50+ panels, making it slow to load
- Not using variables, leading to duplicated dashboards per service
- Forgetting to set min/max thresholds on stat panels for quick health assessment

## FAQ

**Q: How does Grafana compare to Prometheus built-in UI?**
A: Grafana is a dedicated visualization platform with rich panel types, variables, and layout options. The Prometheus UI is useful for ad-hoc queries but lacks dashboard composition capabilities.

**Q: Can I use Grafana with other data sources?**
A: Yes. Grafana supports Elasticsearch, InfluxDB, CloudWatch, Loki, Jaeger, and many others natively.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
