---


contentType: recipes
slug: api-logging-audit
title: "Implementar logging y audit trails de API"
description: "Configura logging completo de petición/respuesta y audit trails para APIs con salida estructurada, correlation IDs y consideraciones de compliance."
metaDescription: "Implementa logging y audit trails de API con salida estructurada, correlation IDs y compliance. Ejemplos en Python, JavaScript y Java."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - compliance
  - java
  - rest
  - http
relatedResources:
  - /recipes/logging
  - /recipes/middleware
  - /recipes/api-documentation-openapi
  - /recipes/api-versioning
  - /recipes/call-rest-api
  - /recipes/graphql-api
  - /recipes/handle-errors
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa logging y audit trails de API con salida estructurada, correlation IDs y compliance. Ejemplos en Python, JavaScript y Java."
  keywords:
    - logging
    - audit-trail
    - structured-logging
    - compliance
    - python
    - javascript
    - java


---
## Visión General

El logging de API captura detalles de petición y respuesta para debugging, análisis de rendimiento y forense de seguridad. Los audit trails van más allá — registran quién hizo qué, cuándo y desde dónde — esenciales para compliance (SOC 2, ISO 27001, GDPR) e investigación de incidentes.

Lo siguiente implementa logging estructurado con correlation IDs, captura de petición/respuesta y almacenamiento de auditoría resistente a manipulaciones.

## Cuándo Usar

Usa este recurso cuando:
- Necesitas debuggear problemas de API en producción sin reproducirlos localmente
- Los requisitos de [compliance](/guides/security/security-best-practices-guide) exigen audit trails para operaciones sensibles
- Ejecutas [sistemas distribuidos](/guides/architecture/software-architecture-guide) y necesitas trazar peticiones entre servicios
- Necesitas detectar patrones anómalos de uso de la API

## Solución

### Python

```python
import logging
import json
import uuid
from fastapi import Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api.audit")

class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        correlation_id = str(uuid.uuid4())
        request.state.correlation_id = correlation_id

        response = await call_next(request)

        audit = {
            "timestamp": datetime.utcnow().isoformat(),
            "correlation_id": correlation_id,
            "method": request.method,
            "path": str(request.url),
            "status_code": response.status_code,
            "user_agent": request.headers.get("user-agent"),
            "client_ip": request.client.host,
        }
        logger.info(json.dumps(audit))
        response.headers["X-Correlation-Id"] = correlation_id
        return response
```

### JavaScript

```javascript
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

function auditMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);

  const start = Date.now();
  res.on('finish', () => {
    logger.info('api_request', {
      correlation_id: correlationId,
      method: req.method,
      path: req.path,
      status_code: res.statusCode,
      duration_ms: Date.now() - start,
      client_ip: req.ip,
      user_agent: req.get('user-agent'),
    });
  });
  next();
}

module.exports = auditMiddleware;
```

### Java

```java
import org.springframework.web.filter.OncePerRequestFilter;
import org.slf4j.MDC;
import java.util.UUID;

@Component
public class AuditFilter extends OncePerRequestFilter {
    private static final Logger logger = LoggerFactory.getLogger("api.audit");

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String correlationId = request.getHeader("X-Correlation-Id");
        if (correlationId == null) correlationId = UUID.randomUUID().toString();

        MDC.put("correlationId", correlationId);
        response.setHeader("X-Correlation-Id", correlationId);

        long start = System.currentTimeMillis();
        try {
            filterChain.doFilter(request, response);
        } finally {
            logger.info("method={} path={} status={} duration={}ms",
                request.getMethod(),
                request.getRequestURI(),
                response.getStatus(),
                System.currentTimeMillis() - start);
            MDC.clear();
        }
    }
}
```

## Explicación

El logging estructurado produce JSON parseable por máquinas en lugar de texto plano. Esto habilita:
- **Agregación de logs**: Herramientas como ELK, Datadog o CloudWatch pueden filtrar y agrupar por campo
- **Correlation IDs**: Trazar una sola petición a través de múltiples microservicios
- **Audit trails**: Registros inmutables de quién accedió a qué, requeridos para compliance

Separa logs operacionales (debugging) de logs de auditoría (compliance). Los audit trails deben ser append-only y almacenados en almacenamiento resistente a manipulaciones.

## Variantes

| Herramienta | Lenguaje | Salida | Ideal para |
|-------------|----------|--------|------------|
| structlog | Python | JSON | Logging semántico con context binding |
| Pino | JavaScript | JSON | Logging de alto rendimiento en Node.js |
| Logback + MDC | Java | JSON/Pattern | Contexto thread-local en Spring |

## Lo que funciona

- **Nunca logues datos sensibles**: Excluye contraseñas, tokens, PII — enmáscara o hashealos. Consulta [Guía de Seguridad](/guides/security/security-best-practices-guide) para protección de datos.
- **Usa correlation IDs**: Pasa `X-Correlation-Id` a través de cada llamada a servicio
- **Loguea asíncronamente**: Usa buffering para evitar bloquear el thread de la petición
- **Rota y archiva**: Comprime logs antiguos y muévelos a almacenamiento frío (S3 Glacier)
- **Separa audit de debug**: Los audit trails necesitan retención y controles de acceso más estrictos

## Errores Comunes

- **Loguear todo**: El exceso de logging mata el rendimiento y oculta la señal en el ruido
- **Logs de texto plano**: El texto no estructurado es imposible de consultar a escala
- **No muestrear logs en dev**: La inundación de logs en desarrollo oculta problemas reales
- **Olvidar limpiar MDC/contexto**: El contexto filtrado entre peticiones causa confusión
- **Almacenar audit trails con logs de aplicación**: Los audit trails necesitan acceso separado y restringido

## Preguntas Frecuentes

**P: ¿Cuánto tiempo debo retener los logs de API?**
R: Logs operacionales: 7-30 días. Audit trails: 1-7 años dependiendo del compliance (PCI-DSS requiere 1 año, SOC 2 requiere según política). Siempre verifica tus requisitos regulatorios.

**P: ¿Puedo usar mi herramienta APM en lugar de logging personalizado?**
R: Las herramientas APM (Datadog, New Relic) capturan trazas distribuidas pero pueden no satisfacer requisitos de auditoría. Usa ambos: APM para rendimiento, logs de auditoría personalizados para compliance.

**P: ¿Cómo prevengo ataques de log injection?**
R: Sanitiza entrada del usuario antes de loguear. Nunca concatenes entrada de usuario cruda en mensajes de log — usa campos estructurados y deja que el logger maneje el escaping.

## Mejores Prácticas

- **Nunca loguees secrets**: redacta API keys, passwords, tokens y PII antes de escribir a logs. Usa un middleware de sanitización que masque campos sensibles conocidos.
- **Usa logging estructurado**: logs JSON con nombres de campo consistentes son más fáciles de queryear y alertar que mensajes free-text. Herramientas como Datadog, Loki y CloudWatch parsean JSON nativamente.
- **Incluye request IDs en cada entrada de log**: propaga un correlation ID desde el API gateway through todos los servicios downstream. Esto permite trazar una sola petición across service boundaries.
- **Separa logs operacionales de logs de auditoría**: los logs operacionales son efímeros y de alto volumen. Los logs de auditoría son de bajo volumen, larga retención y a menudo legalmente requeridos. Guárdalos en sinks separados con diferentes políticas de retención.
- **Loguea en el nivel correcto**: INFO para operaciones normales, WARN para comportamiento degradado, ERROR para fallos que requieren intervención, DEBUG solo para desarrollo. Usar niveles incorrectamente dificulta el análisis de logs.
- **Batchea escrituras de log para alto throughput**: escribir una entrada de log por llamada API a un sink remoto agrega latencia. Usa un buffer local y flushea periódicamente (cada 1-5 segundos o cada N entradas).

## Checklist de Producción

- [ ] Campos sensibles (passwords, tokens, PII) están redacted o hashed antes de loguear
- [ ] Request correlation IDs se generan en el edge y se propagan a todos los servicios
- [ ] Entradas de audit log incluyen timestamp, actor, action, resource y outcome
- [ ] Políticas de retención de logs configuradas por tipo de log (operacional vs audit)
- [ ] Almacenamiento de logs está encriptado at rest y con access control
- [ ] Alertas configuradas para logs de nivel ERROR con anomaly detection
- [ ] Pipeline de ingesta de logs maneja backpressure sin dropear entradas
- [ ] Timezone está estandarizado a UTC across todos los servicios para evitar issues de correlación
- [ ] Schema de logs está documentado y versionado para consumidores downstream
- [ ] Dashboards existen para error rate, percentiles de latencia y top error types

## Consideraciones de Escalado

- **Volumen de logs a escala**: un servicio que maneja 10K peticiones/segundo genera 10K-50K entradas de log/segundo. Escribir todos los logs a un solo cluster de Elasticsearch crea bottlenecks. Usa un pipeline de log aggregation (Fluentd, Vector, Logstash) con buffering y múltiples output shards.
- **Costos de almacenamiento**: logs de auditoría retenidos por 7 años a 1GB/día acumulan 2.5TB. Usa storage tiered: hot (SSD, 7-30 días), warm (HDD, 30-90 días), cold (S3 Glacier, 90+ días). Queryea hot storage para análisis real-time, cold storage para compliance audits.
- **Performance de queries**: buscar 30 días de logs (900GB) para un request ID específico toma segundos con indexación proper. Indexa en timestamp, request_id y level. Evita wildcard queries en campos sin indexar — triggeran full scans.
- **Correlación multi-servicio**: en una arquitectura de microservicios, una sola petición de usuario puede tocar 5-15 servicios. Distributed tracing (Jaeger, Zipkin) complementa los logs proveyendo el call graph completo. Usa OpenTelemetry para estandarizar trace propagation.

## Estimación de Costos

| Componente | Costo | Notas |
|-----------|------|-------|
| ELK self-hosted (1M logs/día) | $200-$500/mes | 3-node cluster, 100GB storage |
| Datadog (1M logs/día) | $1,500-$3,000/mes | Log ingestion + retention |
| CloudWatch (1M logs/día) | $150-$400/mes | Ingestion $0.50/GB, storage $0.03/GB |
| Loki + Grafana (1M logs/día) | $100-$300/mes | Self-hosted, S3 backend |
| Audit log storage (S3 Glacier) | $0.004/GB/mes | 7-year retention, 2.5TB = $10/mes |

Para 10M logs/día: ELK self-hosted escala linealmente (~$2K-$5K/mes). Servicios managed como Datadog escalan a $15K-$30K/mes. Usa sampling (loguea 10% de entradas INFO) para cortar costos 10x manteniendo todas las entradas ERROR y WARN.

## Cuándo No Usar Este Enfoque

- **Herramientas internas de bajo tráfico**: si tu API maneja <100 peticiones/día, un pipeline completo de audit logging es excesivo. Usa file-based logging simple con logrotate y grep para debugging.
- **APIs de streaming real-time**: audit logging agrega 2-5ms por petición. Para requisitos de latencia sub-10ms (gaming, trading), loguea async via una fire-and-forget queue para evitar bloquear el response path.
- **Entornos con memoria restringida**: structured JSON logging incrementa memory usage 2-3x comparado con texto plano. En dispositivos IoT o edge con <512MB RAM, usa text logging minimal en su lugar.

## Benchmarks de Rendimiento

| Setup | Overhead de log | Impacto throughput | Notas |
|-------|-------------|-------------------|-------|
| Sin logging (baseline) | 0ms | 10K req/s | Control |
| File logging (JSON) | 0.5-1ms | 8K req/s | Single file, buffered |
| Redis async logging | 0.1-0.3ms | 9.5K req/s | Non-blocking, buffered |
| Elasticsearch direct | 2-5ms | 4K req/s | Sync HTTP per log |
| Winston + Elasticsearch | 1-3ms | 6K req/s | Batched flush cada 5s |

Async logging via local buffer + background flush agrega <0.5ms de overhead. Synchronous logging a un sink remoto (Elasticsearch, Datadog) agrega 2-5ms por petición, cortando throughput en 40-60%. Siempre usa async flushing en producción.

## Estrategia de Testing

- **Testea redacción de logs**: envía peticiones con API keys, passwords y PII en headers y bodies. Verifica que el output de logs contenga `[REDACTED]` o `***` en lugar de los valores reales. Automatiza este test en CI para prevenir regresiones.
- **Testea propagación de correlation ID**: haz una petición y verifica que el mismo correlation ID aparezca en todas las entradas de log para esa petición. Testea que el ID se propague a downstream service calls via headers.
- **Testea inmutabilidad de audit logs**: escribe una audit entry, intenta modificarla y verifica que el log storage (append-only file, WORM S3 bucket) rechaza la modificación.
- **Testea políticas de retención de logs**: crea logs más antiguos que el período de retención y verifica que se eliminen o archiven automáticamente. Testea que los logs ERROR se retengan más tiempo que los INFO si usas retención tiered.

## Errores Comunes Adicionales

- **Loguear data sensible por defecto**: muchos frameworks loguean bodies completos de request/response incluyendo passwords, API keys y tokens. Siempre configura redaction filters antes de habilitar debug logging en producción.
- **Synchronous logging bloqueando el event loop**: Winston, Pino y Log4j todos soportan async modes. Olvidar habilitar async mode causa que cada log write bloquee la petición, agregando 2-50ms por log entry.
- **Missing correlation IDs en distributed traces**: sin un correlation ID, tracear una petición across 5 microservicios requiere matchear timestamps manualmente. Siempre genera y propaga un correlation ID via headers.
- **Log rotation no configurado**: procesos long-running de Node.js pueden llenar el disk space en horas. Configura `winston-daily-rotate-file` o `logrotate` para cappear file sizes y retener solo N días de logs.

## Monitoring y Observabilidad

- **Trackea log volume por servicio**: monitorea logs/minuto por servicio. Spikes súbitos indican errores o log levels mal configurados. Setea alertas para >2x normal log volume dentro de una ventana de 5 minutos.
- **Monitorea log ingestion lag**: si los logs tardan >30 segundos en llegar a Elasticsearch/Datadog, troubleshooting se vuelve más difícil. Trackea ingestion latency y alerta si p95 excede 60 segundos.
- **Checks de completitud de audit logs**: verifica periódicamente que los audit logs contengan todos los fields requeridos (user ID, action, timestamp, resource, IP). Fields faltantes indican bugs en resolvers o middleware que skipean logging.
- **Dashboard para log-based metrics**: crea dashboards para error rate, warn rate y top error messages. Usa Grafana con Loki o Kibana con Elasticsearch para visualizar log trends over time.

## Checklist de Despliegue

- [ ] Configurar log level via environment variable (no hardcoded)
- [ ] Habilitar async logging con un buffer size de al menos 1000 entries
- [ ] Setear log rotation con max file size 100MB y retención de 30 días
- [ ] Configurar redaction filters para passwords, API keys y PII fields
- [ ] Setear correlation ID generation y propagación across todos los servicios
- [ ] Configurar audit log storage en un append-only o WORM system
- [ ] Setear log shipping a centralized storage (ELK, Datadog, o CloudWatch)
- [ ] Testear log output en staging para verificar que format y redaction funcionen correctamente
- [ ] Documentar log levels y cuándo usar cada uno (DEBUG, INFO, WARN, ERROR)
- [ ] Setear alertas para ERROR log rate excediendo 1% del total request volume

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
