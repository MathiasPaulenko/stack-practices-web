---
contentType: recipes
slug: grafana-dashboards-observability
title: "Dashboards de Observabilidad con Grafana y Prometheus"
description: "Construye dashboards interactivos en Grafana que visualizan metricas Prometheus con paneles, variables y alerts para observabilidad completa de servicios"
metaDescription: "Construye dashboards Grafana para metricas Prometheus. Crea visualizaciones interactivas con paneles, variables y alerts para observabilidad completa."
difficulty: beginner
topics:
  - devops
  - observability
tags:
  - monitoring
  - observability
  - devops
relatedResources:
  - /recipes/devops/prometheus-monitoring-alerts
  - /recipes/devops/helm-chart-deployment
  - /guides/logging-monitoring-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye dashboards Grafana para metricas Prometheus. Crea visualizaciones interactivas con paneles, variables y alerts para observabilidad completa."
  keywords:
    - grafana
    - dashboards
    - observability
    - prometheus
    - visualization
---

# Dashboards de Observabilidad con Grafana y Prometheus

Crea dashboards ricos e interactivos en Grafana para visualizar metricas Prometheus y entender el comportamiento de servicios de un vistazo. Esta recipe cubre tipos de paneles, variables de template, organizacion en rows y practicas dashboard-as-code para observabilidad consistente entre equipos.

## Cuando Usar Esto

- Los equipos necesitan una vista centralizada de salud y rendimiento de servicios
- Ingenieros on-call deben identificar rapidamente que servicio esta fallando
- Stakeholders de negocio quieren visibilidad de uptime y latencia sin queryar metricas directamente

## Solucion

### 1. Provisionar Data Sources

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

### 2. Modelo JSON de Dashboard

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

### 3. Variables de Template para Filtrado Dinamico

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

### 5. Dashboard as Code con Terraform

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

## Como Funciona

- **Panels** despliegan queries en formatos de tabla, graficos, gauges y stat
- **Variables** permiten filtrar por servicio, region o ruta dinamicamente
- **Rows** organizan paneles en secciones colapsables para vistas enfocadas
- **Alerts** pueden configurarse directamente en Grafana o via Prometheus Alertmanager

## Variacion: Dashboard de Sistema Node Exporter

```promql
# CPU usage
100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes

# Disk I/O
rate(node_disk_io_time_seconds_total[5m])
```

## Consideraciones de Produccion

- Usa dashboard provisioning para version control de dashboards en Git
- Setea intervalos de refresh apropiados; 5s para real-time, 30s-1m para overview
- Limita variables de dashboard para prevenir queries caras en labels grandes

## Errores Comunes

- Sobrecargar un solo dashboard con 50+ paneles, haciendolo lento de cargar
- No usar variables, llevando a dashboards duplicados por servicio
- Olvidar setear thresholds min/max en paneles stat para evaluacion rapida de salud

## FAQ

**P: Como se compara Grafana con la UI built-in de Prometheus?**
R: Grafana es una plataforma dedicada de visualizacion con ricos tipos de paneles, variables y opciones de layout. La UI de Prometheus es util para queries ad-hoc pero carece de features de composicion de dashboards.

**P: Puedo usar Grafana con otros data sources?**
R: Si. Grafana soporta Elasticsearch, InfluxDB, CloudWatch, Loki, Jaeger y muchos otros nativamente.
