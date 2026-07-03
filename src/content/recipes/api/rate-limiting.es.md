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
  - /recipes/api/middleware
  - /recipes/api/input-validation
  - /recipes/caching
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

## Preguntas frecuentes

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
