---
contentType: recipes
slug: metrics-collection
title: "Recoleccion de metricas"
description: "Recolecta, agrega y expone métricas de aplicación e infraestructura con Prometheus, StatsD y OpenTelemetry para monitoreo y alertado."
metaDescription: "Recolección de métricas para aplicaciones e infraestructura: Prometheus, StatsD, OpenTelemetry, métricas custom, histograms, counters y dashboards de Grafana."
difficulty: intermediate
topics:
  - observability
tags:
  - metrics
  - observability
  - prometheus
  - monitoring
  - logging
relatedResources:
  - /recipes/prometheus-monitoring-alerts
  - /recipes/prometheus-api-monitoring
  - /recipes/grafana-dashboards-observability
  - /recipes/distributed-tracing
  - /recipes/structured-logging
  - /recipes/real-user-monitoring
lastUpdated: "2026-06-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Recolección de métricas para aplicaciones e infraestructura: Prometheus, StatsD, OpenTelemetry, métricas custom, histograms, counters y dashboards de Grafana."
  keywords:
    - metrics-collection
    - observability
    - prometheus
    - grafana

---
## Visión General

La recolección de métricas transforma el comportamiento crudo del sistema en datos de series temporales que revelan tendencias de performance, límites de capacidad y anomalías. A diferencia de [logs](/recipes/structured-logging/) (eventos discretos) o [traces](/recipes/distributed-tracing/) (journeys de requests), las métricas son mediciones numéricas agregadas a través del tiempo — tasas de request, porcentajes de error, profundidades de cola y uso de memoria. Un pipeline de métricas bien diseñado habilita alertado proactivo antes de que los usuarios noten degradación.

## Cuándo Usar

Usa este recurso cuando:
- Necesitas SLIs cuantitativos para error budgets y dashboards de SLO
- El alertado debe dispararse antes de que logs se agreguen (detección sub-minuto)
- El [capacity planning](/guides/infrastructure-as-code-guide/) requiere tendencias históricas de throughput y uso de recursos
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

## Lo que funciona

- **Usa histograms para latencia**: Counters y gauges pierden la forma de la distribución
- **Agrega buckets `le` para SLOs**: `histogram_quantile(0.
- **Nombra consistentemente**: `subsystem_metric_unit` (ej.
- **Alerta en rates, no totales**: `rate(errors[5m]) > 0.
- **Separa métrica de lógica de negocio**: Mantén instrumentación ligera; nunca bloquees en emisión de métrica

## Errores Comunes

1. **Labels de alta cardinalidad**: User IDs como labels saturan storage de Prometheus
2. **Unidades faltantes**: `request_duration` sin `_seconds` o `_milliseconds` crea confusión
3. **Alertar en gauges**: Queue depth solo no indica falla; combina con processing rate
4. **Sin política de retención**: Mantener resolución de 1 segundo por 5 años desperdicia storage; implementa una [política de retención de datos](/guides/database-design-guide/).
5. **Olvidar instrumentar fallas**: Solo medir el éxito oculta outages parciales

## Manejo de Errores y Recuperacion

- **Fallos de metric scraping**: cuando Prometheus no puede scrapear un target, metrics faltan.   Setea scrape timeout a 10 segundos.
- **High cardinality metrics**: demasiadas label combinations causan explosion de storage.   Limita labels a low-cardinality values.   Setea series limit por metric.
- **Errores de metric export**: cuando aplicaciones fallan en exponer metrics, monitoring gaps ocurren.
- **Issues de storage backend**: time-series databases pueden quedarse sin storage.   Setea retention period basado en data volume.
- **Fallos de alert rule evaluation**: cuando alert rules fallan en evaluar, incidents se miss.   Valida alert rules antes de deployment.

## Performance y Escalabilidad

- **Tuning de scrape interval**: Usa 30-second intervals para standard services.   Tunea scrape concurrency.
- **Optimizacion de queries**: slow queries impactan dashboard performance.   Limita query time range.
- **Scaling de federation**: Federa critical metrics desde leaf Prometheus instances.
- **Recording rules**: pre-computa frequent queries como recording rules.   Reduce query load en Prometheus.   Setea evaluation interval a 30 segundos.
## Consideraciones de Seguridad

- **Access control para observability data**: restringe access a traces, logs y metrics.   Separa permisos de read y write.   Audita access a observability data.   Rota API keys y tokens.
- **Encriptacion de data**: encripta observability data in transit y at rest.   Usa encryption at rest para storage.   Rota encryption keys.
- **PII en observability data**: traces y logs pueden contener PII.   Maskear sensitive fields automaticamente.
- **Network security**: secura comunicacion entre agents y collectors.   Usa private networks para monitoring traffic.   Firewallea monitoring endpoints.

## Deployment y CI/CD

- **Observability as code**: define dashboards, alerts y rules en version control.   Usa CI/CD para observability updates.   Roll back failed deployments.
- **Progressive rollout para instrumentation**: deploya instrumentation changes gradualmente.   Roll back si overhead es muy alto.
- **Version compatibility**: Planifica upgrades cuidadosamente.
- **Configuration management**: gestiona observability configuration centralmente.   Versiona configuration changes.
## Testing y Quality Assurance

- **Integration testing para observability**: testea que traces, logs y metrics se produzcan correctamente.   Verifica trace context propagation a traves de servicios.   Valida metric labels y values.
- **Load testing de observability infrastructure**: testea collectors y storage bajo peak load.   Verifica ingestion rate handling.   Testea scaling behavior.   Verifica alert evaluation bajo load.
- **Chaos testing para observability**: inyecta failures en observability pipeline.   Killea collectors randomicamente.   Simula network partitions.   Verifica que el sistema continue operando.   Mejora resilience basado en findings.
- **Verificacion end-to-end de traces**: verifica complete traces de start a end.   Valida span attributes.   Verifica trace export a backend.
- **Alert testing**: Verifica alert delivery a notifications.   Valida alert severity levels.
- **Dashboard testing**: verifica que dashboard queries returnen correct data.   Valida dashboard filters.

## Pitfalls Comunes y Anti-Patrones

- **Over-instrumentation**: agregar demasiados spans o metrics crea noise y overhead.   Focate en critical paths.   Limita spans por request a 10-20.
- **Ignorar cardinality**: high-cardinality labels causan storage explosion.   Nunca uses user IDs o request IDs como metric labels.   Setea cardinality limits.
- **No retention strategy**: sin retention policies, storage crece indefinidamente.   Setea retention por data type.   Traces: 7-30 dias.   Logs: 30-90 dias.   Metrics: 90-365 dias.
- **Alert fatigue**: demasiados alerts causan que teams los ignoren.   Combina related alerts.   Setea appropriate thresholds.   Targetea < 5 alerts por incident.
- **No SLO monitoring**: sin SLOs, observability lacks focus.   Define SLOs para critical services.
- **Siloed observability tools**: usar tools separados para traces, logs y metrics sin integration.   Correlaciona traces con logs usando trace IDs.   Linkea metrics a traces.
## Herramientas y Plataformas

- **OpenTelemetry**: framework de observability vendor-neutral.   Soporta traces, metrics y logs.   Auto-instrumentation para lenguajes populares.   Collector para processing y export.   Export a multiples backends.   Ecosistema growing.
- **Jaeger**: distributed tracing backend por CNCF.   UI para trace exploration.   Storage backends: Elasticsearch, Cassandra, Badger.   Adaptive sampling.   Soporte para OpenTelemetry traces.   Query por service, operation, tags.   Bueno para microservice tracing.
- **Grafana**: plataforma de visualization para observability.   Soporta Prometheus, Loki, Tempo, Elasticsearch.   Crea dashboards con panels.   Alerting integration.   Templating para reusable dashboards.   Plugin ecosystem.
- **Elasticsearch (ELK)**: log aggregation y search.   Full-text search capabilities.   Kibana para visualization.   Logstash para ingestion.   Beats para lightweight agents.   Soporte para structured logs.   Bueno para log-heavy environments.
- **Datadog**: plataforma commercial de observability.   Unified metrics, traces y logs.   APM para application monitoring.   Synthetic monitoring.   RUM para frontend.   Alerting y dashboards.   Bueno para teams que quieren managed solution.
- **New Relic**: plataforma commercial de observability.   APM, infrastructure monitoring.   Distributed tracing.   Log management.   Alerting.   Bueno para teams que quieren managed solution.

## Resumen de Best Practices

- **Usa OpenTelemetry para instrumentation**: vendor-neutral, adaptable.   Auto-instrumentation donde posible.   Manual para custom spans.   Export a multiples backends.
- **Define SLOs y error budgets**: setea SLOs para critical services.
- **Correlaciona traces, logs y metrics**: Usa service labels para linkear metrics.   Crea unified dashboards.
- **Monitorea el monitoring system**: setea meta-monitoring.   Monitorea storage usage.
- **Reviews regulares de observability**: revisa dashboards mensualmente.   Revisa retention policies trimestralmente.   Programa reviews regulares.
## Optimizacion de Costos

- **Right-sizing de observability infrastructure**: dimensiona collectors y storage basado en data volume.   Empieza small y scalea basado en metrics.
- **Optimizacion de data retention**: setea retention basado en business needs.   Traces: 7-30 dias.   Logs: 30-90 dias.   Metrics: 90-365 dias.   Archiva a cold storage.
- **Sampling para cost reduction**: Head-based sampling para consistent traces.   Tail-based sampling para error-focused traces.   Setea sample rate basado en traffic.   Empieza a 10% para high traffic.   Ajusta basado en error rates.
- **Storage tiering**: Hot: fast SSD para recent data.   Warm: standard disk para 7-30 day data.   Cold: object storage para archived data.

## Guia de Troubleshooting

- **Traces missing**: Verifica que collector este running.   Verifica sampling rate.   Chequea service discovery.
- **Issues de high cardinality**: Setea cardinality limits.
- **Dashboards slow**: Limita time range.
- **Alert storms**: Setea appropriate thresholds.   Combina related alerts.
## Estrategias de Migracion

- **Migracion de monolith a observability**: empieza instrumentando el monolith.   Agrega OpenTelemetry SDK.   Exporta a un collector.   Luego extrae servicios uno por uno.   Cada nuevo servicio se instrumenta desde el start.   Verifica trace correlation entre monolith y nuevos servicios.
- **Migracion de vendor**: migra de una observability platform a otra.   Exporta a ambos backends simultaneamente.   Switchea dashboards uno por uno.   Verifica data parity.   Decomisiona old platform despues que todos los dashboards migren.
- **Legacy logging a structured logging**: migra de unstructured a structured logging incrementalmente.   Empieza con new services.   Luego migra critical existing services.   Convierte unstructured logs a JSON en ingestion.
- **Manual instrumentation a auto-instrumentation**: migra de manual a auto-instrumentation donde posible.   Empieza con new services usando auto-instrumentation.   Gradualmente reemplaza manual instrumentation en existing services.   Verifica trace coverage.

## Compliance y Governance

- **Compliance de data retention**: setea retention policies per regulatory requirements.   Financial: 7 aÃ±os.   Healthcare: 6 aÃ±os.   General: 30-90 dias.   Audita retention compliance trimestralmente.
- **Audit trail para observability data**: loguea all access a observability data.   Envia audit logs a immutable storage.   Reten per compliance requirements.   Soporta audit log export.
- **Data residency para observability**: algunas regulaciones requieren que data se quede dentro de boundaries geograficos.   Elije cloud regions cuidadosamente.
- **Access certification**: certifica access a observability data trimestralmente.   Ajusta permissions para role changes.
## Reporting y Comunicacion

- **Review semanal de observability metrics**: revisa trace coverage, log volume, metric completeness y alert effectiveness semanalmente.
- **Post-mortems de observability failures**: conduce post-mortems cuando observability gaps se encuentran durante incidents.   Updatea runbooks.   Mejora instrumentation basado en findings.
- **Scorecard mensual de observability**: crea un scorecard mensual con key metrics.   Trace coverage percentage.   Log format compliance.   Alert noise ratio.   Mean time to detection.   Dashboard usage.   SLO compliance.
- **Review trimestral de observability strategy**: Assess tool effectiveness.   Planifica improvements.   Updatea roadmap.   Involucra all stakeholders.

## Automatizacion y Tooling

- **Generacion automatizada de dashboards**: Version control dashboard definitions.   Auto-crea dashboards para new services.   Estandariza dashboard templates.
- **Generacion automatizada de alerts**: Version control alert rules.   Auto-crea alerts para new services.   Estandariza alert templates.
- **Health checks de observability**: Chequea storage health.   Chequea alert delivery.
## Consideraciones de Sostenibilidad

- **Observability energy-efficient**: Programa non-critical analysis durante off-peak hours.
- **Arquitectura de observability green**: prefiere managed services que sharean infraestructura a traves de tenants.   Elije cloud regions con renewable energy.   Archiva old data a cold storage para reducir active storage energy.
- **Reduccion de data volume para sustainability**: reduce data volume para bajar energy consumption.   Setea appropriate retention periods.   Comprime log data.
- **Patrones de query eficientes**: Limita query time range.

## Patrones Avanzados

- **Canary observability**: Auto-rollback en anomalies.
- **Chaos observability**: verifica observability durante chaos experiments.   Verifica que alerts fireen correctamente.   Testea chaos observability.   Mejora basado en findings.
- **Multi-cluster observability**: agrega observability data a traves de Kubernetes clusters.   Centraliza dashboards y alerts.   Per-cluster filtering y labeling.




## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de metrics y observability para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica metrics collection** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas Frecuentes

**P: ¿Cómo elijo entre Prometheus y StatsD?**
R: Usa Prometheus para apps cloud-native nuevas. Usa StatsD para apps legacy donde agregar un endpoint HTTP es difícil.

**P: ¿Cuál es el overhead de performance de recolectar métricas?**
R: Despreciable para counters y gauges (<1%). Los histograms con muchos buckets agregan un poco más; usa buckets predefinidos.

**P: ¿Debería recolectar métricas desde el cliente (browser)?**
R: Sí. [Core Web Vitals](/recipes/web-performance/), tasas de error de API y navigation timing de usuarios reales son SLIs esenciales.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
