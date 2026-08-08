---
contentType: recipes
slug: real-user-monitoring
title: "Monitoreo de Usuarios Reales (RUM)"
description: "Monitorea experiencias reales de usuarios con Core Web Vitals, session replay y análisis de performance para identificar cuellos de botella del mundo real."
metaDescription: "Monitoreo de usuarios reales RUM: Core Web Vitals, session replay, análisis de performance, tracking de errores JavaScript y optimización de experiencia de usuario."
difficulty: intermediate
topics:
  - observability
tags:
  - monitoring
  - observability
  - performance
  - frontend
relatedResources:
  - /recipes/grafana-dashboards-observability
  - /recipes/prometheus-monitoring-alerts
  - /recipes/distributed-tracing
  - /recipes/log-aggregation
  - /recipes/metrics-collection
  - /guides/complete-guide-distributed-tracing
  - /guides/complete-guide-prometheus-grafana
  - /guides/complete-guide-sentry-error-tracking
lastUpdated: "2026-06-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Monitoreo de usuarios reales RUM: Core Web Vitals, session replay, análisis de performance, tracking de errores JavaScript y optimización de experiencia de usuario."
  keywords:
    - real-user-monitoring
    - observability
    - performance
    - frontend


---
## Visión General

Real User Monitoring (RUM) captura datos de performance de sesiones reales de browser — no tests sintéticos ni métricas server-side. Revela cómo [Core Web Vitals](/recipes/performance/web-performance), errores JavaScript y latencias de API varían a través de dispositivos, redes y geografías. A diferencia de tests de lab que corren en condiciones ideales, RUM expone la experiencia de usuarios en redes 3G, dispositivos de gama baja y browsers antiguos.

## Cuándo Usar

Usa este recurso cuando:
- Los scores de Lighthouse basados en lab no coinciden con [quejas de performance](/recipes/performance/web-performance) del mundo real
- Necesitas correlacionar métricas de negocio (conversión, bounce rate) con velocidad de página
- Debuggeas issues de performance que solo afectan browsers o regiones específicas
- Priorizas esfuerzos de optimización basados en impacto de usuario real, no suposiciones

## Solución

### Web Vitals Library (JavaScript)

```javascript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    rating: metric.rating, // 'good', 'needs-improvement', 'poor'
    delta: metric.delta,
    navigationType: metric.navigationType,
    page: window.location.pathname
  });

  // Usar navigator.sendBeacon para confiabilidad durante unload de página
  (navigator.sendBeacon && navigator.sendBeacon('/analytics/vitals', body)) ||
    fetch('/analytics/vitals', { body, method: 'POST', keepalive: true });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### Session Replay Integration (Sentry)

```javascript
import * as Sentry from '@sentry/browser';
import { Replay } from '@sentry/replay';

Sentry.init({
  dsn: 'https://abc@sentry.io/1',
  integrations: [
    new Replay({
      maskAllText: true,      // Mask text sensible
      blockAllMedia: true,    // Bloquear imágenes/videos
    })
  ],
  tracesSampleRate: 0.1,    // 10% de transacciones
  replaysSessionSampleRate: 0.01, // 1% de sesiones
  replaysOnErrorSampleRate: 1.0   // 100% de sesiones con error
});
```

### Custom Performance Observer

```javascript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'navigation') {
      console.log('TTFB:', entry.responseStart);
      console.log('FCP:', entry.responseEnd);
      console.log('DOM Ready:', entry.domContentLoadedEventEnd);
    }
    
    if (entry.entryType === 'resource') {
      if (entry.duration > 1000) {
        console.warn('Recurso lento:', entry.name, entry.duration);
      }
    }
  }
});

observer.observe({ entryTypes: ['navigation', 'resource', 'paint'] });
```

## Explicación

**RUM vs. monitoreo sintético**:

| Aspecto | RUM | Sintético |
|---------|-----|-----------|
| Fuente de datos | Usuarios reales | Bots programados |
| Red | Variable (3G a 5G) | Controlada (rápida) |
| Diversidad de dispositivo | Rango completo | Usualmente desktop |
| Geográfico | Ubicaciones reales de usuarios | Data center |
| Caso de uso | Entender la realidad | Detección de regresión baseline |

**Métricas clave**:
- **LCP**: Elemento visible más grande — hero image, heading
- **INP**: Latencia de interacción — click de botón a update visual
- **CLS**: Layout shifts — ads, imágenes, fonts causando saltos
- **TTFB**: Tiempo de respuesta del servidor — hosting + backend performance.   Consulta [server-side rendering](/recipes/performance/spa-code-splitting-lazy).
- **FCP**: First content paint — primer texto o imagen visible

## Variantes

| Herramienta | Tipo | Capacidades Destacadas |
|-------------|------|---------------------|
| Google CrUX | Solo Chrome | Dataset real-world más grande; field data |
| New Relic Browser | Comercial | Session traces; tracking de errores JS |
| Datadog RUM | Comercial | Correlación con APM; session replay |
| Sentry | Open source | Error + performance + replay combinados |
| SpeedCurve | Comercial | Benchmarking competitivo; filmstrips |
| web-vitals.js | Open source | Implementación de referencia de Google |

## Lo que funciona

- **Samplea inteligentemente**: 100% de sampling sobrecarga backends; 5-10% es usualmente suficiente
- **Captura contexto**: Tipo de dispositivo, velocidad de conexión y país explican variación
- **Alerta en percentiles, no promedios**: El performance P95 es lo que experimentan usuarios frustrados
- **Correlaciona con métricas de negocio**: Grafica tasa de conversión vs.   LCP para justificar budgets de optimización.   Consulta [recolección de métricas](/recipes/observability/metrics-collection).
- **Respeta privacidad**: Mask PII en session replay; cumple con GDPR/CCPA para telemetría

## Errores Comunes

1. **Solo monitorear homepage**: Las páginas de producto y checkout a menudo tienen peor performance
2. **Ignorar navegaciones SPA**: Las single-page apps necesitan medición custom de LCP/FID para cambios de ruta. Considera [server-side rendering](/recipes/performance/spa-code-splitting-lazy).
3. **Sin correlación con errores**: Una página lenta que también tira errores JS necesita priorización diferente. Consulta [manejo de errores](/recipes/api/handle-errors).
4. **Alertar en promedios**: Un LCP promedio de 2s oculta que 20% de usuarios ven cargas de 8s+
5. **Sin acción sobre datos**: Coleccionar RUM sin sprints de optimización desperdicia el esfuerzo de instrumentación

## Manejo de Errores y Recuperacion

- **Fallos de carga de RUM script**: cuando el RUM script falla en cargar, user data se pierde.
- **Fallos de Beacon API**: cuando sendBeacon falla, eventos se pierden durante page unload.   Queuea eventos en localStorage.   Retry en next page load.
- **Data loss en high traffic**: bajo extreme traffic, RUM events pueden dropearse.   Setea sample rate basado en traffic volume.
- **Fallos de session replay**: session replay puede fallar en complex SPAs.   Usa privacy-conscious replay settings.
- **Compliance de privacidad**: RUM collecta user data que puede requerir consent.   Anonimiza IP addresses.   Maskear sensitive form fields.   Comply con GDPR, CCPA.   Provee opt-out mechanism.

## Performance y Escalabilidad

- **Gestion de RUM data volume**: Setea retention period a 30 dias.   Comprime event payloads.   Planifica capacity basado en traffic.
- **Dashboard performance**: RUM dashboards pueden ser slow con large datasets.   Limita dashboard time range.   Usa real-time vs historical views.
- **Scaling de event pipeline**: scalea event ingestion basado en traffic.   Setea min/max nodes.   Usa autoscaling basado en traffic.
- **Impacto en client-side performance**: RUM scripts no deben impactar page performance.   Usa requestIdleCallback para non-critical events.
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
- **Guías relacionadas**: explora las guías de monitoring y observability para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica monitoreo de usuarios reales (rum)** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas Frecuentes

**P: ¿RUM ralentiza mi sitio?**
R: Negligiblemente. La librería web-vitals es <1KB. Los beacons se envían después de que la página es interactiva.

**P: ¿Debería usar RUM o monitoreo sintético?**
R: Ambos. Sintético para detección de regresión baseline. RUM para entender la [experiencia real de usuario](/recipes/performance/web-performance).

**P: ¿Cómo manejo ad blockers?**
R: Sirve RUM desde tu propio dominio (first-party), no de terceros. Los ad blockers targetean dominios de analytics conocidos.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### ¿Cómo elijo la herramienta de RUM correcta?

Considera data volume, budget y features. Datadog RUM para full-stack monitoring. Sentry para error-focused RUM. Google Analytics para marketing-focused data. Open-source options como OpenTelemetry Web para custom needs. Testea en staging primero. Compara data accuracy a traves de tools.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
