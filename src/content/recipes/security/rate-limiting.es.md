---
contentType: recipes
slug: rate-limiting-security
title: "Implementar Rate Limiting para APIs y Aplicaciones Web"
description: "Cómo proteger APIs y endpoints web del abuso usando estrategias de rate limiting token bucket, sliding window y fixed window con implementaciones en Redis y memoria."
metaDescription: "Aprende estrategias de rate limiting para APIs. Protege endpoints del abuso usando token bucket, sliding window y fixed window con Redis y memoria."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - rate-limiting
  - api-gateway
  - vulnerabilities
  - encryption
relatedResources:
  - /recipes/api-security-headers
  - /recipes/csrf-protection
  - /recipes/api-contract-testing
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende estrategias de rate limiting para APIs. Protege endpoints del abuso usando token bucket, sliding window y fixed window con Redis y memoria."
  keywords:
    - rate limiting
    - api throttling
    - token bucket
    - sliding window
    - redis rate limit
---

## Visión general

El rate limiting es una técnica defensiva que controla cuántas peticiones puede realizar un cliente a una API o endpoint web dentro de una ventana de tiempo determinada. Sin rate limiting, un solo cliente que se comporta mal — ya sea malicioso o accidentalmente con bugs — puede agotar recursos del backend, privar a usuarios legítimos y desencadenar [fallos en cascada](/patterns/design/circuit-breaker-pattern) a través de sistemas distribuidos.

El rate limiting útil se implementa en múltiples capas: [API gateway](/recipes/api/nginx-reverse-proxy) (edge), middleware de aplicación (servicio) y base de datos (throttling de queries). Cada capa usa diferentes algoritmos adecuados a diferentes trade-offs. Token bucket permite ráfagas, sliding window proporciona precisión, y fixed window es simple pero vulnerable a avalanchas en los límites de la ventana. Aqui se explica como implementaciones desde in-memory de nodo único hasta limitación distribuida respaldada por Redis.

## Cuándo usarlo

Usa esta receta cuando:

- Protegiendo APIs públicas del abuso, scraping o ataques de fuerza bruta
- Limitando operaciones costosas para prevenir sobrecarga del backend
- Haciendo cumplir límites de uso por tier para usuarios gratuitos vs pagados
- Previniendo fallos en cascada durante picos de tráfico o eventos DDoS
- Cumpliendo con requisitos de SLA para asignación justa de recursos

## Solución

### Token Bucket (Python / Redis)

```python
import time
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

def is_allowed(key: str, capacity: int, refill_rate: float) -> bool:
    now = time.time()
    pipe = r.pipeline()
    pipe.hmget(key, ['tokens', 'last_refill'])
    pipe.expire(key, 60)
    result = pipe.execute()

    tokens = float(result[0][0]) if result[0][0] else capacity
    last_refill = float(result[0][1]) if result[0][1] else now

    elapsed = now - last_refill
    tokens = min(capacity, tokens + elapsed * refill_rate)

    if tokens >= 1:
        tokens -= 1
        r.hmset(key, {'tokens': tokens, 'last_refill': now})
        r.expire(key, 60)
        return True
    else:
        r.hmset(key, {'tokens': tokens, 'last_refill': last_refill})
        r.expire(key, 60)
        return False

# Uso
if not is_allowed('user:123', capacity=10, refill_rate=1):
    return Response(status=429, body=b"Rate limit exceeded")
```

### Sliding Window Log (Node.js / En memoria)

```javascript
const requests = new Map(); // userId -> [timestamps]

function isAllowed(key, limit, windowMs) {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!requests.has(key)) {
    requests.set(key, [now]);
    return true;
  }

  const timestamps = requests.get(key).filter(t => t > windowStart);
  timestamps.push(now);
  requests.set(key, timestamps);

  return timestamps.length <= limit;
}

// Middleware Express
function rateLimitMiddleware(req, res, next) {
  const key = req.ip;
  if (!isAllowed(key, 100, 60000)) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
}
```

### Fixed Window (Nginx)

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

server {
  location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://backend;
  }
}
```

## Explicación

- **Token bucket**: un bucket contiene un número fijo de tokens. Cada petición consume un token. Los tokens se recargan a tasa constante. Esto permite ráfagas controladas mientras se hace cumplir una tasa promedio a lo largo del tiempo. Ideal para APIs que toleran picos cortos.
- **Sliding window log**: almacena un log de timestamps de peticiones por cliente. En cada petición, poda entradas fuera de la ventana actual y cuenta el restante. El más preciso pero intensivo en memoria a gran escala.
- **Fixed window**: divide el tiempo en ventanas discretas (por ejemplo, buckets de 1 minuto). Un contador se incrementa por ventana. Simple y eficiente en memoria, pero una ráfaga en el límite de la ventana cuenta dos veces.
- **Limitación distribuida**: los contadores en memoria son rápidos pero fallan entre múltiples instancias de servidor. Redis proporciona estado compartido con operaciones atómicas (`INCR`, `EXPIRE`, scripts Lua) para rate limiting distribuido.

## Variantes

| Algoritmo | Tolerancia a ráfagas | Uso de memoria | Distribuido | Mejor para |
|-----------|---------------------|----------------|-------------|------------|
| Token bucket | Sí | Bajo | Redis | APIs con tolerancia a ráfagas |
| Sliding window | No | Alto | Redis | Límites estrictos por segundo |
| Fixed window | No | Muy bajo | Redis | Techos de tasa simples |
| Leaky bucket | Sí (suavizado) | Bajo | Difícil | Shaping de tráfico |

## Lo que funciona

- **Retorna 429 con `Retry-After`**: cuando un cliente alcanza un límite, responde con HTTP 429 e incluye un header `Retry-After` indicando cuándo puede reintentar. Esto ayuda a clientes bien comportados a retroceder automáticamente.
- **Usa diferentes límites por endpoint**: los endpoints de autenticación deberían ser más estrictos (5 intentos/minuto) que los endpoints de datos de solo lectura (100 peticiones/minuto). Adapta los límites al costo y sensibilidad de cada operación.
- **Identifica clientes correctamente**: limita por ID de usuario autenticado cuando esté disponible, no solo por dirección IP. Los NATs compartidos y VPNs pueden causar falsos positivos al limitar solo por IP.
- **Implementa límites por tier**: los usuarios gratuitos obtienen 100 peticiones/hora, los pagados 10,000. Almacena la configuración de tier junto a los perfiles de usuario y aplícala dinámicamente en middleware.
- **Monitorea peticiones rechazadas**: un pico repentino en respuestas 429 puede indicar un ataque o un bug de cliente. Alerta sobre eventos de rate limiting vía tu [stack de monitoreo](/guides/devops/monitoring-alerting-guide).

## Errores comunes

- **No manejar skew de reloj**: los sistemas distribuidos con desviación de reloj pueden calcular mal los límites de ventana. Usa relojes monotónicos cuando estén disponibles y tolera pequeños offsets.
- **Rate limiting solo en el edge**: los gateways edge capturan la mayoría de abusos, pero un servicio interno comprometido puede aún saturar bases de datos downstream. Aplica límites en múltiples capas.
- **Bloquear usuarios legítimos después de una ráfaga**: un usuario que legítimamente dispara una ráfaga (por ejemplo, paginando resultados) no debería ser bloqueado permanentemente. Usa token bucket o sliding window, no cortes duros.
- **Olvidar limpiar claves Redis**: en implementaciones de sliding window, los timestamps antiguos se acumulan indefinidamente. Establece TTLs en claves Redis para auto-expirar datos obsoletos.

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre rate limiting y throttling?**
R: El rate limiting rechaza peticiones que exceden un umbral (HTTP 429). El throttling ralentiza el procesamiento de peticiones en lugar de rechazarlas. Ambos controlan el tráfico pero con diferentes experiencias de usuario.

**P: ¿Cómo hago rate limiting entre múltiples servidores?**
R: Usa un almacén de datos compartido como Redis con operaciones de incremento atómico. Evita contadores en memoria en despliegues multi-nodo porque cada nodo mantiene su propio conteo independiente.

**P: ¿Puede el rate limiting prevenir ataques DDoS?**
R: El rate limiting básico ayuda contra DDoS de capa de aplicación (L7) pero no puede detener inundaciones de red volumétricas (L3/L4). Combina rate limiting con [protección DDoS de CDN](/recipes/data/caching) y reglas de WAF.

**P: ¿Debería limitar usuarios autenticados y no autenticados de forma diferente?**
R: Sí. Los usuarios autenticados deberían ser limitados por ID de usuario con cuotas más altas. Los usuarios no autenticados deberían ser limitados por IP con umbrales más estrictos para prevenir abuso anónimo.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Soluciones Avanzadas

### Token bucket atómico con Redis Lua

El ejemplo de token bucket en Python de arriba tiene una race condition: entre la lectura y escritura de tokens, otra petición puede modificar la misma clave. Usa un script Lua para atomicidad:

```lua
-- token_bucket.lua
-- KEYS[1] = rate limit key
-- ARGV[1] = capacity
-- ARGV[2] = refill_rate (tokens per second)
-- ARGV[3] = current timestamp (unix)
-- ARGV[4] = TTL in seconds

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1]) or capacity
local last_refill = tonumber(bucket[2]) or now

local elapsed = now - last_refill
tokens = math.min(capacity, tokens + elapsed * refill_rate)

local allowed = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
end

redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
redis.call('EXPIRE', key, ttl)

return allowed
```

```python
import time
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

# Cargar el script Lua una vez al inicio
TOKEN_BUCKET_SCRIPT = r.register_script(open('token_bucket.lua').read())

def is_allowed_atomic(key: str, capacity: int, refill_rate: float) -> bool:
    now = time.time()
    result = TOKEN_BUCKET_SCRIPT(
        keys=[key],
        args=[capacity, refill_rate, now, 60]
    )
    return bool(result)

# Uso — thread-safe a través de múltiples workers
if not is_allowed_atomic('user:123', capacity=100, refill_rate=10):
    return Response(status=429, headers={'Retry-After': '1'},
                    body=b"Rate limit exceeded")
```

### Express con rate-limiter-flexible (Node.js)

El paquete `rate-limiter-flexible` soporta limitación distribuida respaldada por Redis con manejo de bursts integrado:

```javascript
const { RateLimiterRedis } = require('rate-limiter-flexible');
const redis = require('redis');

const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
});

// API general: 100 peticiones por 10 segundos
const apiLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'api',
  points: 100,
  duration: 10,
  blockDuration: 60, // Bloquear por 60s después de exceder
});

// Endpoints de auth: más estricto, 5 intentos por 60 segundos
const authLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'auth',
  points: 5,
  duration: 60,
  blockDuration: 300, // Bloquear por 5 minutos después de exceder
});

// Factory de middleware
function createLimiter(limiter, keyFn = (req) => req.ip) {
  return async (req, res, next) => {
    try {
      await limiter.consume(keyFn(req), 1);
      next();
    } catch (rejRes) {
      const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000);
      res.set('Retry-After', String(retryAfter));
      res.set('X-RateLimit-Limit', String(limiter.points));
      res.set('X-RateLimit-Remaining', String(rejRes.remainingPoints || 0));
      res.set('X-RateLimit-Reset', new Date(Date.now() + rejRes.msBeforeNext).toISOString());
      res.status(429).json({
        error: 'Too many requests',
        retryAfter,
      });
    }
  };
}

// Aplicar diferentes limiters a diferentes rutas
app.use('/api/', createLimiter(apiLimiter));
app.use('/api/auth/', createLimiter(authLimiter, (req) => req.ip + ':' + (req.body?.email || '')));
```

### Rate limiting en Spring Boot (Java)

```java
import io.github.bucket4j.*;
import io.github.bucket4j.redis.*;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import jakarta.servlet.http.*;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
                              Object handler) throws Exception {
        String clientId = request.getHeader("X-User-ID");
        if (clientId == null) {
            clientId = request.getRemoteAddr();
        }

        Bucket bucket = buckets.computeIfAbsent(clientId, this::createBucket);

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            response.setHeader("X-RateLimit-Remaining",
                String.valueOf(probe.getRemainingTokens()));
            return true;
        }

        long retryAfter = probe.getNanosToWaitForRefill() / 1_000_000_000;
        response.setHeader("Retry-After", String.valueOf(retryAfter));
        response.setStatus(429);
        response.getWriter().write("Rate limit exceeded");
        return false;
    }

    private Bucket createBucket(String key) {
        // 100 peticiones por minuto con burst de 20
        Bandwidth limit = Bandwidth.builder()
            .capacity(100)
            .refillIntervally(100, Duration.ofMinutes(1))
            .build();

        return Bucket.builder()
            .addLimit(limit)
            .build();
    }
}
```

### Rate limiting por tiers en Nginx

```nginx
# Definir zones para diferentes tiers
limit_req_zone $binary_remote_addr zone=free:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=paid:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;

server {
  # Endpoints de auth — más estricto
  location /api/auth/ {
    limit_req zone=auth burst=3 nodelay;
    limit_req_status 429;
    limit_req_log_level warn;
    proxy_pass http://backend;
  }

  # Tier gratuito — identificado por API key header
  location /api/free/ {
    limit_req zone=free burst=20 nodelay;
    limit_req_status 429;
    add_header X-RateLimit-Tier "free" always;
    proxy_pass http://backend;
  }

  # Tier pagado — límites más altos
  location /api/paid/ {
    limit_req zone=paid burst=50 nodelay;
    limit_req_status 429;
    add_header X-RateLimit-Tier "paid" always;
    proxy_pass http://backend;
  }

  # Retornar Retry-After en 429
  error_page 429 = @ratelimited;
  location @ratelimited {
    add_header Retry-After "60" always;
    return 429 '{"error": "Too many requests", "retryAfter": 60}';
  }
}
```

## Mejores Prácticas Adicionales

1. **Retorna headers de rate limit en cada respuesta.** Incluye `X-RateLimit-Limit`, `X-RateLimit-Remaining` y `X-RateLimit-Reset` para que los clientes puedan auto-regularse:

```javascript
function setRateLimitHeaders(res, limiter, remaining) {
  res.set('X-RateLimit-Limit', String(limiter.points));
  res.set('X-RateLimit-Remaining', String(remaining));
  res.set('X-RateLimit-Reset',
    new Date(Date.now() + limiter.duration * 1000).toISOString());
}
```

2. **Usa exponential backoff para clientes bloqueados.** En lugar de una duración de bloqueo fija, incrementa el tiempo de bloqueo para infractores reincidentes:

```python
def get_block_duration(key: str, base_block: int = 60) -> int:
    """Incrementar exponencialmente el tiempo de bloqueo para infractores reincidentes."""
    violations = r.incr(f'violations:{key}')
    r.expire(f'violations:{key}', 3600)  # Resetear después de 1 hora
    return min(base_block * (2 ** (violations - 1)), 3600)  # Cap a 1 hora
```

## Errores Comunes Adicionales

1. **Usar `Date.now()` en sistemas distribuidos sin NTP sync.** El skew de reloj entre servidores causa cálculos incorrectos de ventanas. Asegúrate de que todos los servidores usen NTP, y pasa timestamps desde una autoridad central cuando sea posible:

```javascript
// Usar Redis TIME para timestamps consistentes entre nodos
const redisTime = await redisClient.time();
const now = Number(redisTime[0]) + Number(redisTime[1]) / 1e6;
```

2. **Rate limiting en webhooks y callbacks.** Los webhooks entrantes de servicios confiables (Stripe, GitHub) deberían estar exentos de rate limiting o tener límites mucho más altos. De lo contrario, puedes perder eventos críticos:

```javascript
// Exentar fuentes de webhooks confiables
const TRUSTED_WEBHOOK_IPS = new Set([
  '3.18.12.63',  // Stripe
  '192.30.252.0/22',  // GitHub
]);

function shouldRateLimit(req) {
  const ip = req.ip;
  if (TRUSTED_WEBHOOK_IPS.has(ip)) return false;
  if (req.path.startsWith('/webhooks/')) return false;
  return true;
}
```

## Preguntas Frecuentes Adicionales

### ¿Qué es el algoritmo leaky bucket?

Leaky bucket es similar a token bucket pero procesa peticiones a una tasa fija independientemente de la tasa de llegada. Las peticiones entran en una cola (el bucket) y salen a una tasa constante. Si la cola se desborda, las nuevas peticiones se rechazan. Es ideal para traffic shaping donde quieres suavizar ráfagas en lugar de permitirles.

### ¿Cómo pruebo el rate limiting localmente?

Usa un loop simple o una herramienta como `hey` o `wrk` para enviar muchas peticiones rápidamente:

```bash
# Enviar 1000 peticiones con 50 concurrencia
hey -n 1000 -c 50 https://example.com/api/health

# Verificar que algunas obtienen 429
hey -n 1000 -c 50 https://example.com/api/health 2>&1 | grep "429"
```

### ¿Debería usar rate limiting para endpoints de login?

Sí, y con los límites más estrictos. Los endpoints de login son objetivos principales para credential stuffing. Limita por IP (5-10 intentos por minuto) y por username (3-5 intentos por minuto). Después de fallos repetidos, implementa CAPTCHA o bloqueo temporal de cuenta.
