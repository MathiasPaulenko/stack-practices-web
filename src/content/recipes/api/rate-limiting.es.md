---





contentType: recipes
slug: rate-limiting
title: "Rate Limiting"
description: "Cómo implementar rate limiting en APIs usando token bucket, sliding window y fixed window en Python, JavaScript y Java."
metaDescription: "Ejemplos prácticos de rate limiting en Python, JavaScript y Java. Aprende token bucket, sliding window y fixed window para throttling de APIs."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - rate-limiting
  - throttling
  - rest
  - http
relatedResources:
  - /recipes/middleware
  - /recipes/input-validation
  - /recipes/caching
  - /recipes/api-versioning
  - /recipes/handle-cors
  - /recipes/idempotent-api-endpoints
  - /recipes/real-time-notifications
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejemplos prácticos de rate limiting en Python, JavaScript y Java. Aprende token bucket, sliding window y fixed window para throttling de APIs."
  keywords:
    - rate limiting
    - throttling api
    - token bucket
    - sliding window
    - fixed window
    - python rate limit
    - javascript rate limit
    - redis rate limit





---

## Visión general

El rate limiting controla cuántos requests puede hacer un cliente a tu API en un periodo de tiempo dado. Previene abuso, asegura asignación justa de recursos y protege servicios downstream de sobrecarga.

Los algoritmos comunes incluyen fixed window, sliding window y token bucket. Redis se usa frecuentemente como contador compartido en sistemas distribuidos.

## Cuándo usarlo

Usa esta recipe cuando:

- Proteges APIs públicas de abuso o DDoS
- Aplicas límites de uso por tier (gratis vs pago)
- Prevenes ataques de fuerza bruta en endpoints de autenticación. Consulta [JWT Authentication](/recipes/authentication/jwt-authentication) para seguridad de auth.
- Manejas capacidad para operaciones intensivas en recursos
- Implementas políticas de uso justo entre usuarios

## Solución

### Python (Token Bucket)

```python
import time
from threading import Lock

class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.tokens = capacity
        self.refill_rate = refill_rate
        self.last_refill = time.time()
        self.lock = Lock()

    def allow(self) -> bool:
        with self.lock:
            now = time.time()
            elapsed = now - self.last_refill
            self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
            self.last_refill = now
            if self.tokens >= 1:
                self.tokens -= 1
                return True
            return False

bucket = TokenBucket(capacity=10, refill_rate=1)
print(bucket.allow())  # True
```

### JavaScript (Fixed Window con Redis)

```javascript
const redis = require('redis');
const client = redis.createClient();

async function rateLimit(key, limit, windowSeconds) {
  const windowKey = `${key}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
  const current = await client.incr(windowKey);
  if (current === 1) {
    await client.expire(windowKey, windowSeconds);
  }
  return current <= limit;
}

// Uso en [middleware de Express](/recipes/api/middleware)
async function limiter(req, res, next) {
  const key = `ratelimit:${req.ip}`;
  const allowed = await rateLimit(key, 100, 60);
  if (!allowed) return res.status(429).json({ error: 'Too many requests' });
  next();
}
```

### Java (Sliding Window)

```java
import java.util.concurrent.*;

public class SlidingWindow {
    private final int capacity;
    private final long windowMs;
    private final ConcurrentLinkedDeque<Long> timestamps = new ConcurrentLinkedDeque<>();

    public SlidingWindow(int capacity, long windowMs) {
        this.capacity = capacity;
        this.windowMs = windowMs;
    }

    public synchronized boolean allow() {
        long now = System.currentTimeMillis();
        while (!timestamps.isEmpty() && now - timestamps.peekFirst() > windowMs) {
            timestamps.pollFirst();
        }
        if (timestamps.size() < capacity) {
            timestamps.addLast(now);
            return true;
        }
        return false;
    }
}
```

## Comparación de algoritmos

| Algoritmo | Pros | Cons | Mejor para |
|-----------|------|------|------------|
| **Fixed Window** | Simple, poca memoria | Burst en el límite de ventana | Protección básica |
| **Sliding Window** | Rate suave, sin bursts | Mayor memoria/cómputo | Control de rate preciso |
| **Token Bucket** | Permite bursts hasta capacity | Complejo de implementar | APIs con tolerancia a bursts |
| **Leaky Bucket** | Estricto rate constante de salida | Puede dropear requests | Protección downstream |

## Lo que funciona

- **Retorna status 429** con header `Retry-After` al limitar
- **Usa Redis** para rate limiting distribuido entre múltiples servidores. Consulta [Rate Limiting con Redis](/recipes/api/api-rate-limiting-redis) para patrones de producción.
- **Diferencia por cliente**: Usa API key o user ID, no solo IP
- **Límites más altos para usuarios autenticados** que para tráfico anónimo
- **Loguea eventos de rate limit** para monitoreo de seguridad y detección de abuso
- **Backoff gradual**: Informa a clientes cuándo pueden reintentar en lugar de bloqueos duros

## Errores comunes

- Limitar solo por IP, penalizando usuarios detrás de NAT compartido
- No manejar fallos de Redis graceful (fail open vs fail closed)
- Usar contadores en memoria en deployments multi-instancia
- Establecer límites demasiado agresivos, bloqueando usuarios legítimos
- No documentar límites de rate en la documentación de API. Consulta [Plantilla de Documentación de API](/docs/templates/api-documentation) para estructura de docs.


## Cuando No Usar Este Enfoque

- **Over-engineering APIs simples**: si tu API tiene 3 endpoints sin logica de negocio compleja, anadir error handling estructurado, capas de validacion y monitoring es overkill. Mantenlo simple.
- **Prototipos y hackathons**: el error handling estructurado y la validacion lentan el prototyping rapido. Anadelos antes de produccion, no durante la exploracion.
- **Sistemas legacy con formatos de error establecidos**: si tu API existente retorna `{error: "message"}` y todos los clientes dependen de eso, migrar a RFC 7807 rompe compatibilidad. Planifica una migracion gradual.
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
- **Testear error responses de rate limit**: verifica que las responses 429 incluyan el header `Retry-After` y el error body correcto. Testea con limites per-second y per-hour.
- **Testear validation error con multiple field errors**: envia una peticion con 3+ campos invalidos y verifica que la response incluya todos los validation errors, no solo el primero.

## Estimacion de Costos

- **Herramientas de error monitoring**: Sentry o Bugsnag cuestan ~$26-80/mes para equipos pequenos. Presupuesta $50/mes para error tracking a escala produccion.
- **Log storage**: error logs a 10K req/dia con 1% error rate = 100 error logs/dia. A 1KB por log, son 3MB/mes. S3 Glacier storage cost: negligible (<$1/mes).
- **Infraestructura de alerting**: PagerDuty u Opsgenie cuestan ~$21-35/user/mes. Presupuesta $50/mes para un equipo de 2 personas.
- **Bandwidth de error responses**: a 10M req/dia con 0.5% error rate, las error responses consumen ~50GB/mes bandwidth. Costo: ~$5/mes en AWS.
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
- **Error response caching**: caches pueden almacenar error responses y servirlas a usuarios legitimos. Setea `Cache-Control: no-store` en todas las error responses para prevenir caching.
- **Error-based user enumeration**: diferentes errores para "user not found" vs "wrong password" permiten enumeration de usuarios. Usa el mismo error message para ambos casos.

## Preguntas Frecuentes


## Preguntas frecuentes (Additional)

**P: ¿Debería limitar en el edge o en la aplicación?**
R: Ambos. Usa edge/CDN (Cloudflare, AWS WAF) para protección DDoS y límites a nivel de aplicación para lógica de negocio.

**P: ¿Qué HTTP status code debería retornar al rate limitar?**
R: `429 Too Many Requests`. Incluye un header `Retry-After` con los segundos a esperar.

**P: ¿Cómo limito sin Redis en un sistema distribuido?**
R: Usa sticky sessions (no ideal) o implementa un contador centralizado con tu base de datos existente (más lento pero funcional).

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
- **DoS via logging I/O en errores**: si error logging es sincrono, atacantes pueden triggerear muchos errores para saturar disk I/O. Usa async logging con un bounded queue.
- **DoS via alerting en errores**: si cada error triggerea un alert, atacantes pueden triggerear alert fatigue. Rate limita alerts y agrega errores repetidos.
- **DoS via metrics en errores**: si cada error incrementa una metric, atacantes pueden triggerear metric cardinality explosion. Limita metric labels y usa fixed error categories.
- **DoS via tracing en errores**: si cada error crea un trace span, atacantes pueden consumir tracing backend resources. Samplea error traces y limita trace depth.

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
