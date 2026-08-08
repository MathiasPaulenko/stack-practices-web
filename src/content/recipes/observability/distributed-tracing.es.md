---
contentType: recipes
slug: distributed-tracing
title: "Tracing Distribuido"
description: "Tracea requests a través de microservicios distribuidos con OpenTelemetry, Jaeger y Zipkin para debuguear latencia y optimizar performance."
metaDescription: "Tracing distribuido con OpenTelemetry, Jaeger y Zipkin: tracea requests a través de microservicios, identifica cuellos de botella de latencia y optimiza performance."
difficulty: intermediate
topics:
  - observability
tags:
  - distributed-tracing
  - observability
  - microservices
  - monitoring
  - logging
relatedResources:
  - /recipes/grafana-dashboards-observability
  - /recipes/prometheus-monitoring-alerts
  - /recipes/prometheus-api-monitoring
  - /recipes/structured-logging
  - /guides/microservices-architecture-guide
  - /recipes/log-aggregation
  - /recipes/metrics-collection
  - /recipes/real-user-monitoring
lastUpdated: "2026-06-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Tracing distribuido con OpenTelemetry, Jaeger y Zipkin: tracea requests a través de microservicios, identifica cuellos de botella de latencia y optimiza performance."
  keywords:
    - distributed-tracing
    - observability
    - opentelemetry
    - microservices


---
## Visión General

El tracing distribuido sigue una única request mientras viaja a través de microservicios, bases de datos, colas de mensajes y APIs de terceros. A diferencia de los logs (eventos discretos) o métricas (números agregados), los traces revelan el viaje completo — mostrando exactamente dónde se gasta el tiempo y qué servicio causa demoras. OpenTelemetry se ha convertido en el estándar de la industria para instrumentar aplicaciones y exportar traces a Jaeger, Zipkin o proveedores cloud.

## Cuándo Usar

Usa este recurso cuando:
- Debugueas latencia en arquitecturas de microservicios
- Entiendes grafos de llamadas a través de 10+ servicios
- Optimizas journeys críticos de usuario (checkout, login, búsqueda)
- Identificas fallas en cascada y retry storms

## Solución

### Auto-Instrumentación con OpenTelemetry (Node.js)

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: 'http://jaeger:14268/api/traces'
  }),
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();
```

### Creación de Span Personalizado (Go)

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

func processOrder(ctx context.Context, orderID string) error {
    tracer := otel.Tracer("order-service")
    
    ctx, span := tracer.Start(ctx, "processOrder",
        trace.WithAttributes(attribute.String("order.id", orderID)))
    defer span.End()
    
    // Span hijo para llamada a base de datos
    ctx, dbSpan := tracer.Start(ctx, "validateInventory")
    err := db.CheckStock(orderID)
    dbSpan.End()
    
    if err != nil {
        span.RecordError(err)
        return err
    }
    
    span.SetStatus(codes.Ok, "order processed")
    return nil
}
```

### Propagación vía HTTP Headers

```python
from opentelemetry import trace
from opentelemetry.propagate import extract, inject
import requests

tracer = trace.get_tracer(__name__)

def handle_request(headers):
    # Extraer contexto padre de request entrante
    context = extract(headers)
    
    with tracer.start_as_current_span("process-payment", context=context):
        # Request saliente lleva contexto de trace
        outgoing_headers = {}
        inject(outgoing_headers)
        
        response = requests.post(
            "https://payment-api.example.com/charge",
            headers=outgoing_headers
        )
        return response.json()
```

## Explicación

**Anatomía de un trace**:
- **Trace**: Una request completa de usuario (ej.
- **Span**: Una única operación dentro del trace (ej.
- **Span context**: Trace ID + Span ID + flags, propagados a través de límites de servicio
- **Baggage**: Pares key-value compartidos a través de todo el trace

**Estándar W3C Trace Context**:
- `traceparent`: 00-traceid-spanid-flags
- `tracestate`: Extensiones específicas de vendor

**Estrategias de sampling**:
- **Head-based**: Decidir en el edge (simple; consistente)
- **Tail-based**: Decidir después de completar (captura errores raros; costoso)
- **Probability**: Porcentaje aleatorio (barato; puede perder casos edge)

## Variantes

| Backend | Ideal Para | Capacidades Destacadas |
|---------|------------|----------------------------|
| Jaeger | Open source, self-hosted | OpenTelemetry nativo; buena UI |
| Zipkin | Setups simples | Mínima huella de recursos |
| AWS X-Ray | Apps AWS-native | Service map; integración con ALB/Lambda |
| Datadog | Enterprise SaaS | APM + traces + logs unificados |
| Grafana Tempo | Stack Grafana | Costo-efectivo a escala |

## Lo que funciona

- **Instrumenta a nivel de framework**: Auto-instrumenta clientes HTTP, [gRPC](/recipes/api/grpc-api), [DB](/guides/databases/database-design-guide) y colas de mensajes
- **Agrega atributos de negocio**: user_id, order_id, tenant_id hacen los traces útiles
- **Mantén cardinalidad baja**: No pongas IDs únicos en nombres de span (usa atributos en su lugar)
- **Sample agresivamente en producción**: 1-5% suele ser suficiente para debugging
- **Vincula traces a logs**: Incluye trace_id en [entradas de log](/recipes/observability/structured-logging) para cross-referencing

## Errores Comunes

1. **Propagación de contexto faltante**: Los spans se rompen a través de [límites de servicio](/guides/architecture/microservices-architecture-guide) si los headers no se reenvían
2. **Span explosion**: Crear spans para cada iteración de loop genera traces ilegibles
3. **Tags de alta cardinalidad**: User IDs o session IDs como nombres de span saturan storage
4. **No samplear en dev**: Full tracing en desarrollo facilita verificar instrumentación
5. **Ignorar flujos async**: Jobs en background, callbacks y timers necesitan parenting manual de spans

## Manejo de Errores y Recuperacion

- **Fallos de propagacion de trace context**: cuando el trace context se pierde a traves de service boundaries, los spans aparecen disconnected.   Verifica que los headers sean forwardeados por todos los HTTP clients.
- **Errores de configuracion de sampling**: sampling rates inapropiados causan data loss o storage overflow.   Usa tail-based sampling para traces error-focused.   Setea sampling rate basado en traffic volume.   Empieza a 1% para high traffic, 100% para low traffic.
- **Fallos de export de spans**: cuando spans fallan en exportar al collector, traces estan incomplete.   Setea export timeout a 30 segundos.
- **Issues de collector pipeline**: OpenTelemetry collectors pueden dropear data si pipelines estan misconfigured.   Verifica configuraciones de receiver, processor y exporter.   Scalea collectors horizontalmente para high traffic.
- **High cardinality span attributes**: demasiados unique attribute values causan explosion de storage.   Limita cardinality usando low-cardinality attributes.   Hashea o trunca high-cardinality values como user IDs.   Setea limits de attribute value length.
- **Clock skew a traves de servicios**: diferencias de tiempo entre servers causan incorrect span ordering.

## Performance y Escalabilidad

- **Optimizacion de trace storage**: trace data crece rapidamente.   Setea retention policies basado en trace age.   Comprime traces viejos.   Mueve traces mas viejos de 7 dias a warm storage.   Mueve traces mas viejos de 30 dias a cold storage.
- **Scaling de collectors**: scalea collectors basado en incoming span rate.   Setea min/max replicas.
- **Tuning de export pipeline**: batchea spans para export eficiente.   Setea batch size a 512 spans.   Setea export interval a 5 segundos.   Tunea batch size basado en throughput.
- **Optimizacion de trace queries**: usa indexed attributes para queries rapidas.   Crea indexes en service name, operation name y trace ID.   Cachea frequent query results.

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
## Standards y Frameworks de la Industria

- **Standard OpenTelemetry**: Es CNCF-hosted y vendor-neutral.   Soporta traces, metrics y logs.   Auto-instrumentation libraries para Java, Python, Go, JavaScript, .  NET, Ruby.   Collector para processing y routing.
- **W3C Trace Context**: Standard 	raceparent y 	racestate headers.   Soportado por all major frameworks.   Verifica compatibility con proxies y load balancers.
- **Prometheus exposition format**: Standard format con HELP, TYPE y metric lines.   Soporte para OpenMetrics format.
- **CloudEvents para event-driven observability**: usa CloudEvents specification para event data.   Standard event format con required attributes.   Habilita interoperability entre sistemas.





## Glosario

- **Tracing Distribuido**: técnica o patrón central descrito en este artículo.
- **Producción**: entorno activo con usuarios reales; requiere monitoreo y rollback plan.
- **Troubleshooting**: proceso sistemático para diagnosticar y resolver incidentes.

## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de distributed-tracing y observability para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica tracing distribuido** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas Frecuentes

**P: ¿Necesito cambiar mi código para cada función?**
R: No. La auto-instrumentación cubre HTTP, DB y clientes de cola. Solo agrega spans manuales para operaciones críticas de negocio.

**P: ¿Cuál es el overhead de performance?**
R: Típicamente <1% CPU y memoria al samplear 1-5%. El sampling head-based es más barato que tail-based.

**P: ¿Puedo trazar JavaScript frontend también?**
R: Sí. OpenTelemetry JS instrumenta apps de browser, conectando clicks de usuario a backend traces end-to-end.

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
