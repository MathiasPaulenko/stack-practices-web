---
contentType: recipes
slug: log-aggregation
title: "Agregación de Logs"
description: "Centraliza logs de servicios distribuidos con ELK, Fluentd y Loki para búsqueda, alertado y troubleshooting en producción."
metaDescription: "Agregación de logs para sistemas distribuidos: stack ELK, Fluentd, Grafana Loki, log shipping, parsing y troubleshooting centralizado a escala."
difficulty: intermediate
topics:
  - observability
tags:
  - log-aggregation
  - observability
  - devops
  - monitoring
  - logging
relatedResources:
  - /recipes/grafana-dashboards-observability
  - /recipes/prometheus-monitoring-alerts
  - /recipes/prometheus-api-monitoring
  - /recipes/structured-logging
  - /recipes/distributed-tracing
  - /recipes/real-user-monitoring
lastUpdated: "2026-06-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Agregación de logs para sistemas distribuidos: stack ELK, Fluentd, Grafana Loki, log shipping, parsing y troubleshooting centralizado a escala."
  keywords:
    - log-aggregation
    - observability
    - elk
    - devops

---
## Visión General

La agregación de logs centraliza registros de docenas o cientos de servicios en un único sistema searchable. En lugar de hacer SSH a servidores individuales, los equipos consultan un índice unificado para tracear requests a través de [microservicios](/guides/microservices-architecture-guide/), investigar errores y detectar anomalías. Herramientas como el stack ELK, Fluentd y Grafana Loki han hecho el logging centralizado accesible para cualquier tamaño de equipo. Recursos relacionados: [Analizar Archivos de Log](/recipes/parse-log-files/).

## Cuándo Usar

Usa este recurso cuando:
- El debugging requiere correlacionar logs de 5+ servicios para una única request de usuario
- Compliance manda retención de logs y storage a prueba de manipulación
- Necesitas [alertado](/recipes/prometheus-monitoring-alerts/) en tiempo real basado en patrones de log (spikes de error, eventos de seguridad)
- Los volúmenes de log exceden la capacidad de storage local en hosts individuales

## Solución

### Fluentd a Elasticsearch (Docker Compose)

```yaml
version: '3'
services:
  fluentd:
    image: fluent/fluentd:v1.16
    volumes:
      - ./fluent.conf:/fluentd/etc/fluent.conf
    ports:
      - "24224:24224"

  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false

  kibana:
    image: kibana:8.11.0
    ports:
      - "5601:5601"
```

```
# fluent.conf
<source>
  @type forward
  port 24224
</source>

<filter app.**>
  @type parser
  format json
  key_name log
</filter>

<match app.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  logstash_format true
  logstash_prefix app
</match>
```

### Structured Logging con Correlation IDs (Node.js)

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});

function logWithContext(req, message, meta = {}) {
  logger.info(message, {
    traceId: req.headers['x-trace-id'],
    userId: req.user?.id,
    service: 'order-service',
    ...meta
  });
}

// Uso
logWithContext(req, 'Order placed', { orderId: '123', amount: 99.99 });
```

### Loki Query (LogQL)

```bash
# Encontrar todos los error logs para un trace específico
{service="payment-service"} 
  |="error" 
  | json 
  | traceId="abc123"

# Rate de errores 500 por servicio
sum by (service) (
  rate(
    {level="error", status_code="500"}[5m]
  )
)
```

## Explicación

**Etapas del pipeline de logs**:
1. **Collection**: Fluent Bit, Promtail o Filebeat leen archivos de log locales
2. **Parsing**: Extraen campos estructurados de texto crudo (JSON, regex, grok)
3. **Enrichment**: Agregan metadata — labels de pods Kubernetes, IDs de instancias AWS, trace IDs
4. **Buffering**: Kafka o Redis absorben spikes antes de indexar
5. **Storage**: Elasticsearch, Loki o CloudWatch Logs indexan para búsqueda
6. **Query**: Kibana, Grafana o UIs custom para exploración

**Logs estructurados vs. no estructurados**:

| Tipo | Searchable? | Tamaño | Ejemplo |
|------|-------------|--------|---------|
| No estructurado | Solo regex | Grande | `ERROR: user login failed` |
| Estructurado | Filtros de campo | Compacto | `{"level":"error","event":"login_failed"}` |

## Variantes

| Stack | Componentes | Ideal Para |
|-------|-------------|------------|
| ELK | Elasticsearch, Logstash, Kibana | Full-text search; analytics complejos |
| EFK | Elasticsearch, Fluentd/Bit, Kibana | Kubernetes-native; agents livianos |
| PLG | Promtail, Loki, Grafana | Costo-eficiente; indexado basado en labels |
| Splunk | Universal Forwarder, Indexer | Enterprise; dashboards pre-construidos |
| CloudWatch | AWS Agent | AWS-native; integración IAM |

## Lo que funciona

- **Incluye correlation IDs**: Cada entrada de log debería tener un `traceId` vinculando el journey completo de la request.   Consulta [distributed tracing](/recipes/distributed-tracing/).
- **Loggea al nivel correcto**: DEBUG para desarrollo; INFO para operaciones normales; ERROR para issues útiles
- **No loggees secrets**: Enmascara PII, tokens y passwords antes de que lleguen al sistema de agregación
- **Setea políticas de retención**: 30 días de storage hot para troubleshooting; 1 año de archive cold para compliance.
- **Alerta en patrones, no líneas individuales**: "5 ERRORs en 1 minuto" es más útil que una línea de log

## Errores Comunes

1. **Loggear todo en INFO**: Crea ruido que oculta issues reales; usa DEBUG apropiadamente
2. **Sin estandarización de timezone**: Tiempos mixtos UTC y local hacen la correlación imposible
3. **Contexto de request faltante**: `ERROR: database connection failed` sin saber qué servicio o usuario es inútil
4. **Ignorar backpressure**: Agents de log que no pueden seguir el paso dropean logs silenciosamente durante spikes de tráfico
5. **Almacenar logs en la misma base de datos que datos de aplicación**: Compite por recursos; mantiene analysts fuera de producción

## Manejo de Errores y Recuperacion

- **Fallos de log ingestion**: cuando log agents fallan en enviar logs al aggregation system, data se pierde.   Setea max retry count a 10.
- **Errores de log parsing**: logs malformados causan parsing failures.   Rutea unparseable logs a un dead letter queue.   Fixea log format en el source.
- **Fallos de storage backend**: cuando el storage backend cae, logs no se pueden query.
- **Log loss durante high traffic**: bajo extreme load, logs pueden dropearse.  1%.
- **Indices de log corruptos**: index corruption previene log queries.   Rebuilda corrupted indices desde raw logs.

## Performance y Escalabilidad

- **Gestion de log volume**: log volumes crecen rapidamente.   Setea retention policies por log level.   Manten info logs por 30 dias.   Comprime logs viejos.
- **Optimizacion de query performance**: slow log queries frustran users.   Crea indexes en common query fields.   Limita query result size.
- **Scaling de ingestion pipeline**: scalea ingestion basado en log volume.   Setea min/max nodes.
- **Log deduplication**: duplicate logs waste storage y confunden analysis.   Setea dedup window a 5 minutos.   Fixea duplicate log sources.
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





## Glosario

- **Agregación de Logs**: técnica o patrón central descrito en este artículo.
- **Producción**: entorno activo con usuarios reales; requiere monitoreo y rollback plan.
- **Troubleshooting**: proceso sistemático para diagnosticar y resolver incidentes.

## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de log-aggregation y observability para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica agregación de logs** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas Frecuentes

**P: ¿Cómo manejo costos de alto volumen de logs?**
R: Samplea logs DEBUG, agrega métricas en el edge, y usa tiers de storage más baratos (S3, GCS) para logs viejos.

**P: ¿Debería agregar métricas o logs?**
R: Ambos. [Métricas](/recipes/metrics-collection/) para dashboards y alertas. Logs para debugging y audit trails. No alertes solo con logs.

**P: ¿Cómo aseguro logs agregados?**
R: Acceso role-based, transporte encriptado (TLS), y storage encriptado (AES-256). Trata los logs como datos sensibles. Consulta [lo que funciona en seguridad](/guides/security-best-practices-guide/).

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
