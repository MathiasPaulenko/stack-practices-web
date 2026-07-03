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

Esta receta implementa logging estructurado con correlation IDs, captura de petición/respuesta y almacenamiento de auditoría resistente a manipulaciones.

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

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
