---
contentType: recipes
slug: grafana-dashboards-observability
title: "Dashboards de Grafana para Observabilidad con Prometheus"
description: "Construye dashboards de Grafana que visualizan métricas de Prometheus. Usá paneles, variables de template, provisioning y alertas para observabilidad del equipo."
metaDescription: "Construye dashboards Grafana para métricas Prometheus. Crea visualizaciones interactivas con paneles, variables y alertas para observabilidad completa del servicio."
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
  metaDescription: "Construye dashboards Grafana para métricas Prometheus. Crea visualizaciones interactivas con paneles, variables y alertas para observabilidad completa del servicio."
  keywords:
    - grafana
    - dashboards
    - observabilidad
    - prometheus
    - monitoreo
---

## Descripción General

Los dashboards de Grafana transforman métricas crudas de Prometheus en una vista
en vivo de la salud de los servicios. Esta receta muestra cómo conectar un data
source, construir un dashboard con paneles y variables, provisionarlo desde
disco y agregar alertas. Los ejemplos usan snippets de YAML, JSON, PromQL y
Terraform que podés adaptar a tu propio stack.

## Cuándo Usar Esto

Usá este enfoque cuando tu equipo necesite un único lugar para ver request rate,
latencia y error rate a través de los servicios. Ayuda a los ingenieros on-call a
identificar rápido servicios que fallan y da visibilidad de uptime a
stakeholders sin técnicos sin que escriban PromQL. También sirve cuando querés
que los dashboards estén versionados como código para poder revisarlos en Git y
desplegarlos automáticamente.

## Solución

### 1. Provisionar el data source de Prometheus

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

### 2. Construir el JSON del dashboard

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

### 3. Agregar variables de template

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

### 4. Provisionar dashboards desde disco

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

### 5. Manejar dashboards como código con Terraform

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

### 6. Agregar alertas de Grafana

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

### 7. Incluir paneles de logs con Loki

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
# Logs de error para un servicio específico
{service="api"} |= "error" | json | line_format "{{.msg}}"

# Requests lentos (>1s)
{service="api"} |= "duration" | json | duration > 1000
```

## Explicación

- Los **paneles** renderizan queries de PromQL como tablas, gráficos, gauges o
  tiles de stat.
- Las **variables** permiten filtrar por servicio, ruta o intervalo sin editar el
  query.
- Las **rows** agrupan paneles en secciones colapsables.
- El **provisioning** carga dashboards desde disco cuando Grafana arranca, así
  viven en Git.
- **Terraform** convierte al dashboard en infraestructura real, como el resto del
  stack.
- Las **alertas** evalúan expresiones de PromQL y enrutan notificaciones a través
  de Grafana o Alertmanager.
- **Loki** agrega contexto de logs junto a las métricas, así podés saltar de un
  pico a las líneas que lo causaron.

## Variantes

### Dashboard de sistema con Node Exporter

```promql
# CPU usage
100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes

# Disk I/O
rate(node_disk_io_time_seconds_total[5m])
```

### Recording rules para queries caros

```yaml
- record: job:http_p99:5m
  expr: histogram_quantile(0.99, sum by(job, le)(rate(http_request_duration_seconds_bucket[5m])))
```

## Mejores Prácticas

- Guardá los dashboards en Git y provisionarlos al inicio. Esto te da revisiones
  por pull request y rollback.
- Seteá intervalos de refresh según el caso de uso: 5s para troubleshooting en
  vivo, 30s–1m para dashboards de overview.
- Limitá variables y cardinalidad de labels. Una variable que lista cada pod en
  un cluster grande puede volver lentas las queries.
- Usá recording rules para PromQL caro que aparece en muchos dashboards.
- Preferí `$__rate_interval` en lugar de un rango hardcodeado para que el query
  se adapte cuando el usuario hace zoom.
- Limitá `maxLines` de Loki a unos pocos cientos para evitar traer grandes
  volúmenes de logs al navegador.

## Errores Comunes

- Sobrecargar un solo dashboard con 50+ paneles. Se vuelve lento y difícil de
  leer.
- Copiar un dashboard por servicio en lugar de usar variables. La mantenibilidad
  explota.
- Olvidar thresholds en paneles stat y gauge. Sin ellos, valores sanos y fallidos
  se ven iguales.
- Consultar meses de datos en un dashboard de overview. Seteá un rango de tiempo
  razonable por defecto.
- Dejar dashboards editables en la UI después de provisionarlos. Los cambios se
  pierden en el próximo reinicio.

## Preguntas Frecuentes

### ¿Cómo se compara Grafana con la UI built-in de Prometheus?

Grafana es una plataforma dedicada de visualización con ricos tipos de paneles,
variables y layouts. La UI de Prometheus sirve para queries ad-hoc, pero no
compone dashboards.

### ¿Puedo usar Grafana con otros data sources?

Sí. Grafana soporta nativamente Elasticsearch, InfluxDB, CloudWatch, Loki,
Jaeger y muchos otros.

### ¿Debería usar alertas de Grafana o Prometheus Alertmanager?

Ambas funcionan. Las alertas de Grafana mantienen la configuración de
notificaciones junto al dashboard. Alertmanager la mantiene junto al pipeline de
métricas. Elegí según dónde tu equipo ya gestione el enrutamiento de alertas.

### ¿Cómo mantengo los dashboards rápidos?

Usá recording rules, seteá rangos de tiempo por defecto, limitá variables y
limitá `maxLines` de Loki. Evitá agrupar por labels de alta cardinalidad en
paneles de overview.
