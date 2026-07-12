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
  - ci-cd
  - automation
relatedResources:
  - /recipes/prometheus-monitoring-alerts
  - /recipes/helm-chart-deployment
  - /docs/service-level-objective-slo-template
  - /recipes/distributed-tracing
  - /recipes/log-aggregation
  - /recipes/metrics-collection
  - /recipes/prometheus-api-monitoring
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

- Los equipos necesitan una vista centralizada de salud y rendimiento de servicios. Consulta [Health Check Endpoint](/recipes/devops/health-check-endpoint) para probes de readiness.
- Ingenieros on-call deben identificar rapidamente que servicio esta fallando. Consulta [Prometheus API Monitoring](/recipes/observability/prometheus-api-monitoring) para recolección de métricas.
- Stakeholders de negocio quieren visibilidad de uptime y latencia sin queryar metricas directamente. Consulta [API Status Page Template](/docs/templates/api-status-page-template) para reportes de estado externos.

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

### 3. Variables de Template para Filtrado en Vivo

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
- **Variables** permiten filtrar por servicio, region o ruta en vivo
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
R: Grafana es una plataforma dedicada de visualizacion con ricos tipos de paneles, variables y opciones de layout. La UI de Prometheus es util para queries ad-hoc pero carece de capacidades de composicion de dashboards.

**P: Puedo usar Grafana con otros data sources?**
R: Si. Grafana soporta Elasticsearch, InfluxDB, CloudWatch, Loki, Jaeger y muchos otros nativamente.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Dashboard Provisioning (GitOps)

```yaml
# provisioning/dashboards/dashboards.yml
apiVersion: 1
providers:
  - name: 'Default'
    orgId: 1
    folder: 'Services'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
```

```json
// provisioning/dashboards/api-overview.json
{
  "dashboard": {
    "title": "API Overview",
    "tags": ["api", "production"],
    "timezone": "browser",
    "schemaVersion": 39,
    "panels": [
      {
        "title": "Request Rate",
        "type": "stat",
        "datasource": "Prometheus",
        "targets": [
          { "expr": "sum(rate(http_requests_total[5m]))", "refId": "A" }
        ],
        "gridPos": { "h": 4, "w": 6, "x": 0, "y": 0 }
      },
      {
        "title": "Error Rate",
        "type": "gauge",
        "datasource": "Prometheus",
        "targets": [
          { "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100", "refId": "A" }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 1 },
                { "color": "red", "value": 5 }
              ]
            }
          }
        },
        "gridPos": { "h": 4, "w": 6, "x": 6, "y": 0 }
      }
    ],
    "templating": {
      "list": [
        {
          "name": "service",
          "type": "query",
          "datasource": "Prometheus",
          "query": "label_values(http_requests_total, job)",
          "refresh": 1
        }
      ]
    }
  }
}
```

### Grafana Alerting

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

### Integración de Logs con Loki

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
      maxLines: 1000
```

```logql
# Queries de logs para paneles de dashboard
# Logs de error para servicio específico
{service="api"} |= "error" | json | line_format "{{.msg}}"

# Requests lentos (>1s)
{service="api"} |= "duration" | json | duration > 1000

# Contar errores por servicio a lo largo del tiempo
sum by (service) (count_over_time({service="api"} |= "error" [5m]))
```

### Variables de Dashboard para Filtrado Dinámico

```json
{
  "templating": {
    "list": [
      {
        "name": "environment",
        "type": "query",
        "datasource": "Prometheus",
        "query": "label_values(kube_pod_info, namespace)",
        "refresh": 1
      },
      {
        "name": "service",
        "type": "query",
        "datasource": "Prometheus",
        "query": "label_values(http_requests_total{namespace=\"$environment\"}, job)",
        "refresh": 1
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

## Mejores Prácticas Adicionales

1. **Usa carpetas de dashboards.** Organiza por equipo o servicio:

```yaml
# provisioning/dashboards/dashboards.yml
providers:
  - name: 'Platform Team'
    folder: 'Platform'
    options:
      path: /var/lib/grafana/dashboards/platform
  - name: 'Data Team'
    folder: 'Data'
    options:
      path: /var/lib/grafana/dashboards/data
```

1. **Setea refresh de dashboard según urgencia.** Dashboards real-time refrescan rápido, overview lento:

```json
{
  "refresh": "10s",  // Dashboard de ops real-time
  "time": { "from": "now-1h", "to": "now" }
}
```

1. **Usa anotaciones para deployments.** Marca tiempos de deploy en los gráficos:

```yaml
# provisioning/annotations/deployments.yml
apiVersion: 1
annotations:
  - name: Deployments
    datasource: Loki
    query: '{service="deploy"} |= "deployed"'
    iconColor: blue
```

## Errores Comunes Adicionales

1. **Usar `rate()` en Grafana sin time range.** Siempre usa `$__rate_interval`:

```promql
# Mal: interval hardcodeado
rate(http_requests_total[5m])

# Bien: se adapta al time range del dashboard
rate(http_requests_total[$__rate_interval])
```

1. **Demasiados paneles en un dashboard.** Mantén menos de 15 paneles por dashboard para rendimiento:

```json
// Dividir en múltiples dashboards
// 1. Overview (5 paneles)
// 2. Detalle de latencia (10 paneles)
// 3. Análisis de errores (10 paneles)
```

## FAQ Adicional

### ¿Cómo exporto un dashboard desde la UI de Grafana?

1. Abre el dashboard
2. Click en el ícono de engranaje > Share > Export
3. Guarda como JSON
4. Commit a `provisioning/dashboards/` para GitOps

### ¿Cómo creo un dashboard multi-panel programáticamente?

Usa el Grafana Terraform provider:

```hcl
resource "grafana_dashboard" "api_overview" {
  config_json = jsonencode({
    title = "API Overview"
    panels = [
      # Definiciones de paneles
    ]
  })
  folder = grafana_folder.services.id
}
```

### ¿Puedo usar Grafana para agregación de logs?

Sí. Con Loki como data source, Grafana puede buscar, filtrar y visualizar logs junto con métricas. Usa queries LogQL en paneles de log:

```logql
{app="myapp"} |= "ERROR" | json | line_format "{{.timestamp}} {{.level}} {{.message}}"
```

## Tips de Rendimiento

1. **Usa recording rules para queries de dashboard.** Precomputa PromQL caro:

```yaml
# En lugar de computar en Grafana, precomputa en Prometheus
- record: job:http_p99:5m
  expr: histogram_quantile(0.99, sum by(job, le)(rate(http_request_duration_seconds_bucket[5m])))
```

1. **Setea time ranges de dashboard.** No consultes 30 días de datos para un check rápido:

```json
{
  "time": { "from": "now-6h", "to": "now" }
}
```

1. **Usa `$__rate_interval` en lugar de ventanas hardcodeadas.** Se adapta al zoom del dashboard:

```promql
# Se adapta al time range
rate(http_requests_total[$__rate_interval])
```

1. **Limita queries de Loki.** Usa `max_lines` para prevenir fetches enormes de logs:

```yaml
datasources:
  - name: Loki
    jsonData:
      maxLines: 500  # Default 1000
```
