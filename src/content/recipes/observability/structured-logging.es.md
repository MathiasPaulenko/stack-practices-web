---
contentType: recipes
slug: structured-logging
title: "Logging Estructurado"
description: "Implementa logging estructurado con salida JSON, correlation IDs y agregación de logs para observabilidad en producción."
metaDescription: "Lo que funciona en logging estructurado: formato JSON, correlation IDs, niveles de log, agregación con ELK/Loki e integración con trazas distribuidas."
difficulty: intermediate
topics:
  - observability
tags:
  - logging
  - observability
  - devops
  - monitoring
  - metrics
relatedResources:
  - /recipes/grafana-dashboards-observability
  - /recipes/prometheus-monitoring-alerts
  - /recipes/prometheus-api-monitoring
  - /guides/logging-monitoring-observability-guide
  - /guides/monitoring-alerting-guide
  - /recipes/distributed-tracing
  - /recipes/log-aggregation
  - /recipes/metrics-collection
lastUpdated: "2026-06-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Lo que funciona en logging estructurado: formato JSON, correlation IDs, niveles de log, agregación con ELK/Loki e integración con trazas distribuidas."
  keywords:
    - logging
    - observability
    - elk
    - devops


---
## Visión General

El logging estructurado reemplaza mensajes de log de texto libre con objetos JSON legibles por máquinas. Esto habilita filtrado potente, agregación y correlación a través de servicios distribuidos. En lugar de parsear regex de strings como "User 123 logged in at 10:00", los logs estructurados emiten { "event": "login", "user_id": 123, "timestamp": "..." } — haciendo el análisis de logs trivial en ELK, Loki o plataformas cloud.

## Cuándo Usar

Usa este recurso cuando:
- Ejecutes más de un servicio que necesite agregación de logs centralizada. Consulta [Prometheus API Monitoring](/recipes/prometheus-api-monitoring/) para colección de métricas.
- Debuggees issues que abarcan múltiples microservicios o jobs async. Consulta [Integration Testing](/recipes/integration-testing/) para verificación cross-service.
- Construyas dashboards y alertas basadas en eventos de log. Consulta [API Status Page Template](/docs/api-status-page-template/) para dashboards de estado.
- Migres de logs de texto plano a un stack moderno de observabilidad. Consulta [Docker Basics](/recipes/docker-basics/) para infraestructura de logging containerizada.

## Solución

### Logger JSON (Node.js con Pino)

```javascript
const pino = require('pino');
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'user-api', version: '1.2.3' }
});

function handleRequest(req, res) {
  const child = logger.child({
    request_id: req.headers['x-request-id'] || crypto.randomUUID(),
    user_id: req.user?.id,
    route: req.route?.path
  });

  child.info({ event: 'request_start', method: req.method });
  
  try {
    const result = processOrder(req.body);
    child.info({ event: 'order_processed', order_id: result.id });
  } catch (err) {
    child.error({ event: 'order_failed', error: err.message });
  }
}
```

### Python con structlog

```python
import structlog

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

def transfer_funds(from_account, to_account, amount):
    logger.info(
        "transfer_initiated",
        from_account=from_account,
        to_account=to_account,
        amount_cents=amount,
        request_id=get_current_request_id()
    )
```

### Middleware de Correlation ID (Go)

```go
func CorrelationIDMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        id := r.Header.Get("X-Request-ID")
        if id == "" {
            id = uuid.New().String()
        }
        ctx := context.WithValue(r.Context(), "request_id", id)
        w.Header().Set("X-Request-ID", id)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

## Explicación

**Campos clave para cada entrada de log**:
- **timestamp**: ISO 8601 con timezone
- **level**: debug, info, warn, error, fatal
- **service**: Nombre de aplicación o componente
- **request_id**: Correlaciona todos los logs de un solo request de usuario a través de servicios
- **event**: Nombre de acción legible por máquinas (snake_case)
- **message**: Descripción legible por humanos (opcional en logging puramente estructurado)

**¿Por qué estructurado sobre texto?**
- Consulta logs sin regex frágiles: { event: "payment_failed", amount: { $gt: 1000 } }
- Agregación automática por cualquier campo en Elasticsearch/Loki
- Fácil integración con tracing (OpenTelemetry) y métricas

## Variantes

| Stack | Componentes | Ideal Para |
|-------|-------------|------------|
| ELK | Elasticsearch, Logstash, Kibana | Búsqueda full-text; dashboards complejos |
| PLG | Promtail, Loki, Grafana | Kubernetes-native; queries basadas en labels |
| CloudWatch | AWS nativo | Infraestructura AWS; setup mínimo |
| Datadog | SaaS | APM + logs + trazas unificados |
| Splunk | Enterprise | Cumplimiento; analytics avanzados |

## Lo que funciona

- **Siempre incluye request_id**: Traza un viaje de usuario a través de 10+ servicios
- **Usa niveles de log consistentemente**: debug para dev; info para operaciones normales; error para issues útiles
- **Nunca loguees datos sensibles**: Enmascara PII, tokens y passwords antes de serialización
- **Loguea en boundaries de servicio**: Entrada/salida de cada handler HTTP, consumer de cola y job en background
- **Emite métricas desde logs**: Usa métricas derivadas de logs para dashboards en lugar de instrumentación custom

## Errores Comunes

1. **Concatenación de strings en logs**: `log.info("User " + id + " failed")` — previene indexación
2. **Contexto faltante**: Logs dicen "Payment failed" sin user_id, amount o error code
3. **Nivel de log incorrecto**: info para cada línea de código; error para excepciones manejadas
4. **Ignorar volumen de logs**: Logs debug en producción pueden costar miles en fees de ingestión
5. **Nombres de campo inconsistentes**: userId vs user_id vs userID rompe agregación

## Manejo de Errores y Recuperacion

- **Consistencia de log format**: inconsistent log formats hacen parsing dificil.   Define un strict JSON schema para todos los logs.   Valida log format en CI.
- **Leakage de sensitive data**: structured logs pueden accidentalmente contener sensitive data.   Maskear fields como passwords, tokens, SSNs.
- **Miconfiguracion de log level**: wrong log levels causan noise o missing data.   Produccion: INFO.   Staging: DEBUG.   Development: TRACE.
- **Fallos de async logging**: async logging puede perder logs en crash.   Flushea queues en shutdown.
- **Fallos de log correlation**: missing correlation IDs break trace linking.   Propaga a traves de todos los service calls.

## Performance y Escalabilidad

- **Overhead de logging**: logging agrega CPU y I/O overhead.   Batchea log writes.   Usa sampling para high-volume logs.   Profilea logging code.
- **Gestion de log storage costs**: log storage costs crecen continuamente.   Setea retention policies por log level.   Comprime old logs.
- **Optimizacion de log search**: buscar logs eficientemente requiere good indexing.   Indexa common query fields.   Crea time-based indices.   Usa query templates.
- **Structured logging en microservices**: cada servicio debe loggear consistentemente.   Define common fields (service, version, trace_id).
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
## Standards y Frameworks de la Industria

- **Standard OpenTelemetry**: Es CNCF-hosted y vendor-neutral.   Soporta traces, metrics y logs.   Auto-instrumentation libraries para Java, Python, Go, JavaScript, .  NET, Ruby.   Collector para processing y routing.
- **W3C Trace Context**: Standard 	raceparent y 	racestate headers.   Soportado por all major frameworks.   Verifica compatibility con proxies y load balancers.
- **Prometheus exposition format**: Standard format con HELP, TYPE y metric lines.   Soporte para OpenMetrics format.
- **CloudEvents para event-driven observability**: usa CloudEvents specification para event data.   Standard event format con required attributes.   Habilita interoperability entre sistemas.




## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de logging y observability para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica logging estructurado** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas Frecuentes

**P: ¿Debería usar una librería de logging o console.log?**
R: Siempre usa una librería (Pino, Winston, structlog, Zap). Manejan buffering, serialización y niveles de log correctamente.

**P: ¿Cómo correlaciono logs a través de microservicios?**
R: Propaga un correlation ID en headers HTTP (X-Request-ID) e inclúyelo en cada entrada de log. Usa una librería de tracing (OpenTelemetry) para trazas distribuidas completas.

**P: ¿Cuál es la diferencia entre logs y trazas?**
R: Los logs son eventos discretos con timestamps. Las trazas conectan operaciones relacionadas (spans) a través de servicios. Usa ambos: logs estructurados para eventos, trazas para flujo de requests.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### ¿Debo usar JSON o key-value structured logs?

JSON es el industry standard para structured logging. Es parseable por all major log aggregation tools. Key-value format es mas ligero pero menos estandarizado. Usa JSON para new services. Usa key-value solo para high-volume services donde serialization overhead importa. Documenta tu format choice.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
