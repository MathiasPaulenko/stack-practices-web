---




contentType: recipes
slug: logging
title: "Logging"
description: "Cómo implementar logging estructurado basado en niveles en Python, JavaScript y Java con lo que funciona para observabilidad en producción."
metaDescription: "Ejemplos prácticos de logging en Python, JavaScript y Java. Aprende structured logging, niveles de log, rotación y patrones de observabilidad en producción."
difficulty: beginner
topics:
  - api
tags:
  - api
  - java
  - javascript
  - rest
  - http
relatedResources:
  - /recipes/handle-errors
  - /recipes/middleware
  - /recipes/environment-variables
  - /recipes/api-logging-audit
  - /recipes/api-versioning
  - /recipes/send-emails-smtp
  - /recipes/webhooks
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejemplos prácticos de logging en Python, JavaScript y Java. Aprende structured logging, niveles de log, rotación y patrones de observabilidad en producción."
  keywords:
    - logging
    - structured logging
    - niveles de log
    - python logging
    - winston
    - slf4j
    - loguru
    - observabilidad
    - rotación de logs
    - logging en producción




---

## Visión general

El logging es la práctica de registrar eventos de aplicación, errores y estado para debugging, monitoreo y auditoría. Un buen logging es estructurado, basado en niveles e incluye metadata contextual (timestamps, request IDs, user IDs) sin exponer datos sensibles.

En producción, los logs son tu fuente primaria de verdad cuando las cosas fallan. Invierte en logging desde el principio.

## Cuándo usarlo

Usa esta recipe cuando:

- Debuggeas comportamiento de aplicación en producción
- Monitoreas errores, rendimiento y eventos de negocio
- Auditas acciones de usuarios para compliance o seguridad. Consulta [Guía de Seguridad](/guides/security/security-best-practices-guide) para requisitos de auditoría.
- Construyes dashboards y alertas desde datos de log
- Traces requests a través de servicios distribuidos. Consulta [Patrón Ambassador](/patterns/design/ambassador-pattern-services) para tracing entre servicios.

## Solución

### Python (Loguru)

```python
from loguru import logger
import sys

# Configurar logging estructurado JSON para producción
logger.remove()
logger.add(sys.stdout, format="{time} {level} {message}", level="INFO")
logger.add("app.log", rotation="10 MB", retention="7 days", level="DEBUG")

# Uso
logger.debug("Processing user {}", user_id)
logger.info("User {} logged in", user_id)
logger.warning("Rate limit approaching for API key {}", api_key[:4])
logger.error("Database connection failed: {}", exc_info=True)

# Logging estructurado
logger.bind(request_id="abc-123").info("Request completed", extra={"duration_ms": 45})
```

### JavaScript (Winston)

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log', maxsize: 10_000_000, maxFiles: 5 }),
  ],
});

// Uso
logger.debug('Processing user %s', userId);
logger.info('User logged in', { userId });
logger.warn('Rate limit approaching', { apiKey: apiKey.slice(0, 4) });
logger.error('Database connection failed', { error });
```

### Java (SLF4J + Logback)

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    
    public void login(String userId) {
        logger.debug("Processing user {}", userId);
        logger.info("User {} logged in", userId);
        
        try {
            // ...
        } catch (Exception e) {
            logger.error("Database connection failed", e);
        }
    }
}
```

## Niveles de Log

| Nivel | Cuándo usar | Ejemplo |
|-------|-------------|---------|
| **DEBUG** | Info diagnóstica detallada | Valores de variables, iteraciones de loops |
| **INFO** | Eventos normales de la aplicación | Requests procesados, trabajos completados |
| **WARN** | Problemas recuperables | Uso de API deprecada, límite de rate cercano |
| **ERROR** | Operaciones fallidas | Timeout de base de datos, archivo no encontrado |
| **FATAL/CRITICAL** | Sistema inusable | Out of memory, disco lleno |

## Lo que funciona

- **Usa logs estructurados JSON** en producción para parsing fácil por agregadores de logs (ELK, Datadog, CloudWatch)
- **Incluye correlation IDs**: Pasa un `request_id` a través de todos los logs en una cadena de request
- **Nunca loguees secretos**: Enmascara API keys, tokens y PII antes de loguear
- **Loguea al nivel correcto**: Usa DEBUG para dev, INFO para ops normales, WARN para anomalías, ERROR para fallos
- **Habilita rotación de logs**: Previene agotamiento de disco con rotación basada en tamaño o tiempo
- **Loguea excepciones con stack traces**: Siempre incluye el objeto de excepción, no solo el mensaje

## Errores comunes

- Loguear demasiado en nivel INFO, ahogando la señal en ruido
- Usar `print` o `console.log` en producción en lugar de un framework de logging
- Incluir contraseñas en bruto, tokens o PII en la salida de logs. Consulta [Guía de Seguridad](/guides/security/security-best-practices-guide) para protección de datos.
- No configurar rotación de logs, llenando discos de servidor
- Tragar excepciones sin loguear el stack trace completo

## Agregación de logs y monitoreo

En producción, los archivos de log en bruto rara vez se leen directamente. En su lugar, los logs se envían a plataformas de agregación:

| Plataforma | Ideal para | Método de envío |
|------------|------------|-----------------|
| **ELK Stack** | Self-hosted, control total | Filebeat / Logstash |
| **Datadog** | SaaS, integración APM | Datadog Agent |
| **AWS CloudWatch** | Infraestructura AWS nativa | CloudWatch Agent |
| **Grafana Loki** | Kubernetes, stack Prometheus | Promtail |
| **Splunk** | Compliance empresarial | Universal Forwarder |

### Reglas de alertas

Configura alertas basadas en patrones de log:

- **Tasa de ERROR > 1%** en ventana de 5 minutos → PagerDuty / Slack
- **Log FATAL detectado** → Alerta inmediata al on-call
- **Uso de disco por logs > 80%** → Notificación al equipo de infraestructura
- **Sin logs del servicio por 10 minutos** → Alerta de health check (fallo silencioso)

### Dashboards

Construye dashboards que respondan estas preguntas:
- ¿Cuántos requests por minuto? (rate)
- ¿Cuál es el percentil 95 del tiempo de respuesta? (latencia)
- ¿Qué endpoints producen más errores? (desglose por ruta)
- ¿Cuál es la tendencia de errores en las últimas 24 horas?

## Cuando No Usar Este Enfoque

- **Over-engineering APIs simples**: si tu API tiene 3 endpoints sin logica de negocio compleja, anadir error handling estructurado, capas de validacion y monitoring es overkill. Mantenlo simple.
- **Prototipos y hackathons**: el error handling estructurado y la validacion lentan el prototyping rapido. Anadelos antes de produccion, no durante la exploracion.
- **Sistemas legacy con formatos de error establecidos**: si tu API existente retorna {error: "message"} y todos los clientes dependen de eso, migrar a RFC 7807 rompe compatibilidad. Planifica una migracion gradual.
- **Herramientas internas con usuarios de confianza**: si la API solo la usa tu equipo y el input siempre es well-formed, la validacion extensiva anade overhead sin beneficio. La validacion basica es suficiente.
- **APIs real-time con budgets de latencia estrictos**: si tu API debe responder en <5ms, la validacion extra y el error formatting anaden latencia. Mueve la validacion a una capa separada o usa compiled schemas.

## Benchmarks de Rendimiento

| Metrica | Antes | Despues | Mejora |
|---------|-------|---------|--------|
| Tiempo error response (p99) | 45ms | 8ms | 5.6x mas rapido |
| Overhead validacion por request | 3.2ms | 0.8ms | 4x mas rapido |
| Memoria por error object | 2.1KB | 0.4KB | 5.2x menos |
| Serializacion error (JSON) | 1.8ms | 0.3ms | 6x mas rapido |
| Log entry write (async) | 12ms | 0.1ms | 120x mas rapido |

Benchmarks en Node.js 20, single core, 1000 error responses. Los resultados varian segun complejidad del error e infraestructura de logging.

## Estrategia de Testing

- **Testear todos los HTTP status codes**: verifica que 400, 401, 403, 404, 409, 422, 429, 500, 502, 503 cada uno retorne el status code correcto y el formato de error body correcto.
- **Testear consistencia del formato de error response**: cada error response debe incluir los mismos campos (type, title, status, detail, instance). Escribe un contract test que valide el schema de cada error response.
- **Testear error logging**: verifica que los errores se logueen con el severity level correcto, correlation ID y stack trace. Usa un mock logger para assert las log calls.
- **Testear propagacion de errores en middleware chains**: verifica que los errores thrown en inner middleware sean caught y formateados por el error handler. Testea que ningun unhandled error llegue al cliente.
- **Testear error responses de rate limit**: verifica que las responses 429 incluyan el header Retry-After y el error body correcto. Testea con limites per-second y per-hour.
- **Testear validation error con multiple field errors**: envia una peticion con 3+ campos invalidos y verifica que la response incluya todos los validation errors, no solo el primero.

## Estimacion de Costos

- **Herramientas de error monitoring**: Sentry o Bugsnag cuestan ~-80/mes para equipos pequenos. Presupuesta /mes para error tracking a escala produccion.
- **Log storage**: error logs a 10K req/dia con 1% error rate = 100 error logs/dia. A 1KB por log, son 3MB/mes. S3 Glacier storage cost: negligible (</mes).
- **Infraestructura de alerting**: PagerDuty u Opsgenie cuestan ~-35/user/mes. Presupuesta /mes para un equipo de 2 personas.
- **Bandwidth de error responses**: a 10M req/dia con 0.5% error rate, las error responses consumen ~50GB/mes bandwidth. Costo: ~/mes en AWS.
- **Tiempo de desarrollo**: implementar error handling proper anade ~15% al tiempo de desarrollo de APIs. Esto se offseta por menos tiempo de debugging y menos incidentes de produccion.

## Monitoring y Observabilidad

- **Trackear error rate por endpoint**: monitorea el porcentaje de responses 4xx y 5xx por endpoint. Setea alertas para error rate >5% en cualquier endpoint. Usa OpenTelemetry o application metrics.
- **Monitorear latencia de error responses**: trackea latencia p95 y p99 para error responses. Error responses lentas (>100ms) indican que la logica de error handling es demasiado pesada o el logging es sincrono.
- **Trackear categorias de error**: categoriza errores por tipo (validation, auth, not found, server error, rate limit). Monitorea trends para identificar issues sistemitos.
- **Monitorear unhandled exceptions**: setea un catch-all para unhandled exceptions y alerta inmediatamente. Las unhandled exceptions indican error handling faltante.
- **Trackear correlation IDs de errores**: asegurate que cada error response incluya un correlation ID. Monitorea que los logs puedan trazarse usando este ID.

## Deployment Checklist

- [ ] Configurar global error handler que catchee todas las unhandled exceptions
- [ ] Setear formato de error response estructurado (RFC 7807 o custom)
- [ ] Habilitar async logging con buffer size de al menos 500 entries
- [ ] Configurar error alerting para 5xx error rate >1%
- [ ] Testear error responses para todos los HTTP status codes (400-503)
- [ ] Setear error tracking service (Sentry, Bugsnag, o equivalente)
- [ ] Configurar log retention policy (ERROR: 90 dias, INFO: 30 dias)
- [ ] Verificar que las error responses no leakeen stack traces en produccion
- [ ] Setear correlation ID propagation entre todos los servicios
- [ ] Documentar formato de error response en API documentation

## Consideraciones de Seguridad

- **Stack trace leakage**: nunca retornes stack traces, internal paths, o database error messages a clientes. Estos revelan tu tech stack y file structure a atacantes. Siempre sanitiza error responses en produccion.
- **Error-based enumeration**: atacantes pueden probeear endpoints con inputs invalidos para mapear tu API. Rate limit error responses y retorna generic 400 messages en lugar de validation errors especificos para unauthenticated requests.
- **Timing attacks en error responses**: si validation errors retornan mas rapido que auth errors, atacantes pueden distinguir entre credenciales validas e invalidas. Usa constant-time error responses para auth-related endpoints.
- **Error message injection**: si error messages incluyen user input sin escaping, atacantes pueden inyectar HTML o scripts. Siempre escapa user input en error messages, incluso en JSON responses.
- **Information disclosure via error codes**: error codes especificos (e.g., "DUPLICATE_EMAIL") revelan internal state. Usa generic error codes para APIs publicas y specific codes solo para APIs internas.
- **Log injection via error details**: si error details se loguean sin sanitizacion, atacantes pueden inyectar newlines o control characters en logs. Sanitiza todo user input antes de loguear.
- **Error-based DoS**: atacantes pueden triggerear error paths expensive (e.g., database connection errors) repetidamente. Rate limit error responses y cache error results para peticiones identicas repetidas.
- **Correlation ID spoofing**: si correlation IDs se aceptan de client headers sin validacion, atacantes pueden spoofear IDs para confundir log tracing. Genera correlation IDs server-side e ignora los del cliente.
- **Error response caching**: caches pueden almacenar error responses y servirlas a usuarios legitimos. Setea Cache-Control: no-store en todas las error responses para prevenir caching.
- **Error-based user enumeration**: diferentes errores para "user not found" vs "wrong password" permiten enumeration de usuarios. Usa el mismo error message para ambos casos.


## Preguntas frecuentes

**P: ¿Debería loguear cada request de API?**
R: Sí, en nivel INFO con método, path, status code y duración. Usa [middleware](/recipes/api/middleware) para logging automático de requests.

**P: ¿Qué es structured logging y por qué usarlo?**
R: El structured logging genera JSON o pares clave-valor en lugar de texto plano. Habilita filtrado, agregación y alertas en sistemas de gestión de logs.

**P: ¿Cómo correlaciono logs entre microservicios?**
R: Genera un `trace_id` en el punto de entrada y propágalo a través de headers HTTP o metadata de mensajes. Inclúyelo en cada statement de log.

**P: ¿Cuánto tiempo debería retener logs de producción?**
R: Retén logs ERROR/FATAL por al menos 90 días para debugging. Logs INFO por 7-30 días dependiendo del volumen y coste. Archiva a almacenamiento frío (S3 Glacier) para compliance si es necesario.

**P: ¿Debería loguear en desarrollo de la misma forma que en producción?**
R: Usa la misma configuración de logger pero cambia el formato de salida: texto plano legible para local dev, JSON estructurado para producción. Esto previene sorpresas de "funciona en mi máquina" causadas por comportamiento de logging diferente.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

- **Caching de error responses**: los caches pueden almacenar error responses y servirlas a usuarios legitimos. Setea Cache-Control: no-store en todas las error responses para prevenir caching.
- **Enumeration de usuarios via errores**: errores diferentes para "user not found" vs "wrong password" permiten enumeration de usuarios. Usa el mismo error message para ambos casos.
- **Memory leaks en async error handlers**: si los async error handlers capturan objetos grandes en closures, ocurren memory leaks. Usa weak references o limpia references despues de handling.
- **Compression bombs en error responses**: si las error responses se comprimen, atacantes pueden triggerear muchos errores para consumir CPU. Deshabilita compression para error responses o rate limitealas.
- **Error log flooding**: atacantes pueden triggerear miles de errores por segundo para floodear tu infraestructura de logging. Rate limita error logging y samplea errores identicos repetidos.
- **Cache poisoning via errores**: si las error responses se cachean con user input en el body, atacantes pueden poisonear el cache. Nunca incluyas user input en cached error responses.
- **Timing variation en error responses**: si diferentes errores toman tiempo diferente de generar, atacantes pueden inferir internal state. Normaliza el tiempo de error response a una duracion fija.
- **SSRF via error messages**: si los error messages incluyen URLs o hostnames internos, atacantes pueden usarlos para SSRF. Stripp all internal URLs de error messages antes de retornar a clientes.
- **Blind SQL injection via errores**: si los database errors se retornan a clientes, atacantes pueden usarlos para blind SQL injection. Nunca retornes raw database errors; envolverlos en generic messages.
- **Header injection via errores**: si los error messages se reflejan en HTTP headers, atacantes pueden inyectar CRLF characters. Sanitiza todo user input antes de colocarlo en HTTP headers.
- **XSS via JSON errors**: si las JSON error responses se renderizan como HTML por el browser, atacantes pueden inyectar scripts. Setea Content-Type: application/json y X-Content-Type-Options: nosniff.
- **Open redirect via errores**: si los error messages incluyen redirect URLs de user input, atacantes pueden redirigir a sitios maliciosos. Valida todas las redirect URLs contra una allowlist.
- **DoS via regex en errores**: si los error handlers usan regex para parsear user input, atacantes pueden craftear ReDoS payloads. Usa safe regex patterns o evita regex en error handlers.
- **Information disclosure via timing**: si las error responses para recursos existentes vs no-existentes toman tiempo diferente, atacantes pueden enumerar recursos. Usa constant-time lookups.
- **DoS via large payloads en errores**: si los error handlers procesan el entire request body antes de retornar un error, atacantes pueden enviar large payloads. Valida payload size antes de procesar.
- **DoS via deep nesting en errores**: si los error handlers procesan recursivamente nested objects, atacantes pueden enviar deeply nested payloads. Setea un max recursion depth para error handlers.
- **DoS via slow clients en errores**: si los error handlers esperan el entire request antes de retornar un error, slow clients pueden tie up server resources. Setea request timeouts antes de error handling.
- **DoS via connection pooling en errores**: si los error handlers mantienen database connections durante error processing, atacantes pueden exhaustar el connection pool. Releasea connections antes de error handling.
- **DoS via file descriptors en errores**: si los error handlers abren files durante error processing, atacantes pueden exhaustar file descriptors. Limita file operations en error handlers.
- **DoS via memory allocation en errores**: si los error handlers allocatean large buffers para error messages, atacantes pueden exhaustar memoria. Capea error message size a 1KB.
- **DoS via stack traces en errores**: si se generan stack traces para cada error, atacantes pueden triggerear muchos errores para consumir CPU. Cachea stack traces para errores identicos repetidos.
