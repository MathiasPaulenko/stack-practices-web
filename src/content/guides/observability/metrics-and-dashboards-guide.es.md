---
contentType: guides
slug: metrics-and-dashboards-guide
title: "Métricas y Dashboards — De Datos Brutos a Insights Accionables"
description: "Guía práctica sobre métricas y dashboards: instrumentación de aplicaciones, elección de tipos de métricas, construcción de dashboards efectivos y creación de pipelines de alertas con Prometheus, Grafana y Datadog."
metaDescription: "Aprende métricas y dashboards: instrumenta aplicaciones, elige tipos de métricas, construye dashboards efectivos y crea pipelines de alertas con Prometheus y Grafana."
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
  - /guides/observability/distributed-tracing-guide
  - /guides/observability/log-aggregation-guide
  - /guides/observability/alert-management-guide
  - /guides/devops/observability-guide
  - /guides/devops/sre-practices-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende métricas y dashboards: instrumenta aplicaciones, elige tipos de métricas, construye dashboards efectivos y crea pipelines de alertas con Prometheus y Grafana."
  keywords:
    - metrics
    - dashboards
    - prometheus
    - grafana
    - datadog
    - instrumentation
    - guide
---

## Descripción General

Las métricas son mediciones numéricas recolectadas a lo largo del tiempo que te indican cómo se comportan tus sistemas. Los dashboards visualizan esas métricas para hacer visibles los patrones. Juntas, forman la base de la conciencia operativa, permitiendo a los equipos detectar tendencias, identificar anomalías y tomar decisiones basadas en datos.

Esta guía cubre tipos de métricas, patrones de instrumentación, diseño de dashboards y creación de alertas.

## Cuándo Usar

- Necesitas monitorear salud y rendimiento del sistema a lo largo del tiempo
- Quieres detectar tendencias antes de que se conviertan en incidentes
- Tu equipo necesita una imagen operativa compartida
- Estás estableciendo SLOs y necesitas medir cumplimiento
- Quieres reducir MTTR con datos visuales y consultables

## Conceptos Clave

| Concepto | Descripción |
|---------|-------------|
| **Counter** | Métrica acumulativa que solo aumenta (peticiones servidas, errores) |
| **Gauge** | Métrica que puede subir o bajar (temperatura, profundidad de cola, CPU) |
| **Histogram** | Muestrea observaciones en buckets configurables (duración de petición) |
| **Summary** | Similar a histogram pero calcula percentiles del lado del cliente |
| **Cardinalidad** | Número de series temporales únicas (alta cardinalidad = costoso) |
| **SLI / SLO / SLA** | Indicador, Objetivo y Acuerdo de Nivel de Servicio |

## Tipos de Métricas y Cuándo Usarlas

| Tipo | Caso de Uso | Ejemplo | No Usar Para |
|------|-------------|---------|--------------|
| **Counter** | Contar eventos | `http_requests_total` | Valores que disminuyen |
| **Gauge** | Valores en un punto del tiempo | `memory_usage_bytes`, `queue_size` | Tasas o conteos acumulados |
| **Histogram** | Distribución de valores | `request_duration_seconds` | Cálculo exacto de percentiles (usa summary) |
| **Summary** | Percentiles precomputados | `request_latency_quantile` | Cuando necesitas heatmaps de histograma |

## Métricas y Dashboards Paso a Paso

### 1. Instrumenta Tus Aplicaciones

Expone métricas en un formato que tu colector entienda:

```python
# Ejemplo: Métricas de aplicación Python con cliente Prometheus
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time

# Definir métricas
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

# Instrumentar tu código
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

# Exponer endpoint de métricas
start_http_server(8000)
```

```java
// Ejemplo: Spring Boot con Micrometer
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

**Checklist de instrumentación:**
- Instrumenta las cuatro señales doradas: latencia, tráfico, errores, saturación
- Añade labels para dimensiones por las que filtrarás (servicio, entorno, endpoint)
- Usa nombres consistentes: sufijo `unit`, `total` para contadores, `seconds` para duración
- Evita labels de alta cardinalidad (IDs de usuario, IDs de sesión, IDs de petición)
- Mide métricas de negocio (pedidos realizados, pagos procesados) junto con métricas técnicas

### 2. Recolecta y Almacena Métricas

Configura un pipeline de métricas:

```yaml
# Ejemplo: Configuración de scrape de Prometheus
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

**Mejores prácticas de recolección:**
- Scrapea cada 10-30 segundos (más rápido para cambios de alta frecuencia)
- Usa descubrimiento de servicios (Kubernetes, Consul, DNS) en lugar de targets estáticos
- Ejecuta colectores en cada región/zona para minimizar latencia
- Usa remote write para almacenamiento a largo plazo (Thanos, Cortex, VictoriaMetrics)
- Federación para agregación jerárquica (edge → regional → global)

### 3. Construye Dashboards Efectivos

Diseña dashboards que cuenten una historia:

| Tipo de Dashboard | Propósito | Paneles Clave |
|-------------------|-----------|---------------|
| **Resumen de servicio** | Salud de un servicio individual | Tasa de error, latencia p95, throughput, uso de recursos |
| **Señales doradas** | Salud entre servicios | Métricas RED (Rate, Errors, Duration) por servicio |
| **KPI de negocio** | Impacto en ingresos/uso | Conversiones, usuarios activos, volumen de transacciones |
| **Infraestructura** | Salud de cluster/nodo | CPU, memoria, disco, red en todos los nodos |
| **Respuesta a incidentes** | Profundización durante incidentes | Latencia detallada por endpoint, desglose de errores, logs |

```json
// Ejemplo: Fragmento JSON de dashboard Grafana (simplificado)
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

**Principios de diseño de dashboards:**
- Pon los paneles más importantes arriba a la izquierda
- Usa colores consistentes: verde = bien, amarillo = advertencia, rojo = crítico
- Añade links a dashboards relacionados, logs y trazas
- Mantén el número de paneles por dashboard bajo 20
- Usa variables de plantilla para servicio, entorno y rango de tiempo

### 4. Define SLIs y SLOs

Traduce métricas en objetivos de confiabilidad:

```promql
# Ejemplo: Consultas de SLI para objetivos comunes

# SLI de disponibilidad: % de peticiones exitosas
(
  sum(rate(http_requests_total{status!~"5.."}[5m]))
  /
  sum(rate(http_requests_total[5m]))
) * 100

# SLI de latencia: % de peticiones bajo umbral
(
  sum(rate(request_duration_seconds_bucket{le="0.5"}[5m]))
  /
  sum(rate(request_duration_seconds_bucket{le="+Inf"}[5m]))
) * 100

# Presupuesto de error: errores aceptables restantes
# SLO: 99.9% disponibilidad
# Presupuesto de error: 0.1% del total de peticiones por mes
0.001 * sum(increase(http_requests_total[30d]))
```

| Objetivo | SLI | SLO | Ventana de Medición |
|----------|-----|-----|---------------------|
| Disponibilidad | Peticiones exitosas / total de peticiones | 99.9% | 30 días |
| Latencia | Peticiones bajo 200ms / total de peticiones | 99% bajo 200ms | 7 días |
| Tasa de error | Respuestas de error / total de respuestas | < 0.1% | 1 hora |
| Throughput | Peticiones por segundo | > 1000 rps | 5 minutos |

### 5. Crea Alertas Significativas

Alerta sobre síntomas, no causas:

```yaml
# Ejemplo: Reglas de alerta de Prometheus
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

**Principios de diseño de alertas:**
- Alerta sobre síntomas que impactan usuarios (tasa de error, latencia), no causas (disco lleno)
- Usa `for:` para reducir ruido (requiere violación sostenida del umbral)
- Añade links a runbooks y dashboards en cada alerta
- Niveles de severidad: página para crítico (impacto usuario), ticket para advertencia (tendencia)
- Revisa frecuencia de alertas regularmente y ajusta umbrales

## Mejores Prácticas

- **Nombra métricas consistentemente.** Formato `service_unit`: `orders_service_requests_total`.
- **Documenta tus métricas.** Cada métrica necesita descripción y unidad.
- **Usa histogramas en lugar de promedios.** Los promedios ocultan outliers; los histogramas muestran distribución.
- **La cardinalidad es costo.** Cada combinación única de labels crea una nueva serie temporal.
- **Los dashboards son para exploración, no monitoreo.** Las alertas notifican; los dashboards investigan.
- **Prueba tus dashboards.** Recorre escenarios de incidentes para verificar que proporcionan respuestas.

## Errores Comunes

- **Métricas de alta cardinalidad.** Etiquetar por ID de usuario o ID de petición explota el almacenamiento.
- **Alertar sobre todo.** Demasiadas alertas crean ruido y reducen calidad de respuesta.
- **Faltan unidades.** Una métrica llamada `latency` es ambigua — `latency_seconds` es clara.
- **Promediar percentiles.** No puedes promediar p95s entre servicios. Usa histogramas.
- **Sin reglas de agregación.** Métricas de alta frecuencia en bruto abruman dashboards; agrega primero.

## Variantes

- **Pull-based:** Prometheus scrapea exporters (estándar para Kubernetes)
- **Push-based:** StatsD, Telegraf o aplicación empuja a colector (mejor para jobs de corta duración)
- **Nativo de nube:** AWS CloudWatch, Google Cloud Monitoring, Azure Monitor (gestionado, pero específico de proveedor)
- **Empresarial:** Datadog, New Relic, Dynatrace (características ricas, precio por host)

## FAQ

**P: ¿Cuántas métricas debería exponer mi aplicación?**
10-50 métricas bien elegidas superan a 1000 autogeneradas. Enfócate en las cuatro señales doradas y KPIs de negocio.

**P: ¿Qué intervalo de scrape debería usar?**
15 segundos es estándar. Usa 5 segundos para sistemas críticos, 60 segundos para infraestructura de cambio lento.

**P: ¿Cómo manejo la cardinalidad de métricas?**
Usa valores de label estáticos (clase de código de estado, no URL exacta). Elimina labels de alta cardinalidad al ingerir si es necesario.

**P: ¿Debería usar Prometheus o una solución SaaS?**
Prometheus es gratis pero requiere expertise operacional. Las soluciones SaaS reducen overhead pero aumentan costo a escala. Muchos equipos usan ambos: Prometheus para tiempo real, SaaS para largo plazo.

## Conclusión

Las métricas y dashboards transforman datos de sistema bruto en inteligencia operativa. Al instrumentar consistentemente, diseñar dashboards para toma de decisiones y alertar sobre síntomas en lugar de causas, construyes una práctica de observabilidad que reduce MTTR y mejora la confiabilidad del sistema.
