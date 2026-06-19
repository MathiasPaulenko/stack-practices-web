---
contentType: recipes
slug: metrics-collection
title: "Metrics Collection"
description: "Recolecta, agrega y expone métricas de aplicación e infraestructura con Prometheus, StatsD y OpenTelemetry para monitoreo y alertado."
metaDescription: "Recolección de métricas para aplicaciones e infraestructura: Prometheus, StatsD, OpenTelemetry, métricas custom, histograms, counters y dashboards de Grafana."
difficulty: intermediate
topics:
  - observability
tags:
  - metrics-collection
  - observability
  - prometheus
  - grafana
relatedResources:
  - /recipes/prometheus-monitoring-alerts
  - /recipes/prometheus-api-monitoring
  - /recipes/grafana-dashboards-observability
  - /recipes/distributed-tracing
  - /recipes/structured-logging
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Recolección de métricas para aplicaciones e infraestructura: Prometheus, StatsD, OpenTelemetry, métricas custom, histograms, counters y dashboards de Grafana."
  keywords:
    - metrics-collection
    - observability
    - prometheus
    - grafana
---
## Visión General

La recolección de métricas transforma el comportamiento crudo del sistema en datos de series temporales que revelan tendencias de performance, límites de capacidad y anomalías. A diferencia de logs (eventos discretos) o traces (journeys de requests), las métricas son mediciones numéricas agregadas a través del tiempo — tasas de request, porcentajes de error, profundidades de cola y uso de memoria. Un pipeline de métricas bien diseñado habilita alertado proactivo antes de que los usuarios noten degradación.

## Cuándo Usar

Usa este recurso cuando:
- Necesitas SLIs cuantitativos para error budgets y dashboards de SLO
- El alertado debe dispararse antes de que logs se agreguen (detección sub-minuto)
- El capacity planning requiere tendencias históricas de throughput y uso de recursos
- El debugging requiere correlacionar métricas a través de servicios (spike de CPU + aumento de latencia)

## Solución

### Prometheus Metrics en Go

```go
import "github.com/prometheus/client_golang/prometheus"

var (
    requestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request latency",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "status"},
    )
    activeConnections = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "active_connections",
            Help: "Number of active connections",
        },
    )
)

func init() {
    prometheus.MustRegister(requestDuration, activeConnections)
}

func handleRequest(w http.ResponseWriter, r *http.Request) {
    activeConnections.Inc()
    defer activeConnections.Dec()

    start := time.Now()
    defer func() {
        requestDuration.WithLabelValues(
            r.Method,
            strconv.Itoa(w.Status()),
        ).Observe(time.Since(start).Seconds())
    }()

    // Lógica del handler...
}
```

### StatsD Metrics (Node.js)

```javascript
const StatsD = require('node-statsd');
const client = new StatsD({ host: 'localhost', port: 8125 });

function processPayment(orderId, amount) {
  const start = Date.now();
  
  try {
    const result = paymentGateway.charge(amount);
    client.increment('payment.success');
    client.gauge('payment.amount', amount);
    return result;
  } catch (err) {
    client.increment('payment.error', 1, ['gateway:stripe', 'error:declined']);
    throw err;
  } finally {
    client.timing('payment.duration', Date.now() - start);
  }
}
```

### OpenTelemetry Metrics (Python)

```python
from opentelemetry import metrics
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry.sdk.metrics import MeterProvider

reader = PrometheusMetricReader()
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter(__name__)

counter = meter.create_counter("orders.created", description="Orders created")
histogram = meter.create_histogram("order.value", description="Order value in USD")

def create_order(items, total):
    counter.add(1, {"region": "us-east"})
    histogram.record(total, {"region": "us-east"})
    return Order(items=items, total=total)
```

## Explicación

**Tipos de métricas**:

| Tipo | Caso de Uso | Ejemplo |
|------|-------------|---------|
| Counter | Incremento monotónico | Total requests, errores |
| Gauge | Valor sube y baja | Conexiones activas, profundidad de cola |
| Histogram | Distribución de valores | Latencia de request, tamaño de payload |
| Summary | Cuantiles (client-side) | Percentil 99 de latencia |

**Peligro de cardinalidad**:
- Buenas labels: `method=GET`, `status=200`, `region=us-east`
- Malas labels: `user_id=12345`, `session_id=abc` — causa explosión de métricas
- Regla general: Mantener combinaciones únicas de labels bajo 10,000

## Variantes

| Backend | Colección | Ideal Para |
|---------|-----------|------------|
| Prometheus | Pull (scrape) | Kubernetes; queries PromQL |
| StatsD | Push (UDP) | Apps legacy; counters simples |
| InfluxDB | Push (HTTP) | Alta cardinalidad; tags |
| Datadog | Agent push | SaaS; dashboards out-of-box |
| CloudWatch | AWS integration | Apps AWS-native |

## Mejores Prácticas

- **Usa histograms para latencia**: Counters y gauges pierden la forma de la distribución
- **Agrega buckets `le` para SLOs**: `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))`
- **Nombra consistentemente**: `subsystem_metric_unit` (ej. `http_requests_total`)
- **Alerta en rates, no totales**: `rate(errors[5m]) > 0.01` no `errors > 1000`
- **Separa métrica de lógica de negocio**: Mantén instrumentación ligera; nunca bloquees en emisión de métrica

## Errores Comunes

1. **Labels de alta cardinalidad**: User IDs como labels saturan storage de Prometheus
2. **Unidades faltantes**: `request_duration` sin `_seconds` o `_milliseconds` crea confusión
3. **Alertar en gauges**: Queue depth solo no indica falla; combina con processing rate
4. **Sin política de retención**: Mantener resolución de 1 segundo por 5 años desperdicia storage; downsampléa
5. **Olvidar instrumentar fallas**: Solo medir el éxito oculta outages parciales

## Preguntas Frecuentes

**P: ¿Cómo elijo entre Prometheus y StatsD?**
R: Usa Prometheus para apps cloud-native nuevas. Usa StatsD para apps legacy donde agregar un endpoint HTTP es difícil.

**P: ¿Cuál es el overhead de performance de recolectar métricas?**
R: Despreciable para counters y gauges (<1%). Los histograms con muchos buckets agregan un poco más; usa buckets predefinidos.

**P: ¿Debería recolectar métricas desde el cliente (browser)?**
R: Sí. Core Web Vitals, tasas de error de API y navigation timing de usuarios reales son SLIs esenciales.
