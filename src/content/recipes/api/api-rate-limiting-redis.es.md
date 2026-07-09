---
contentType: recipes
slug: api-rate-limiting-redis
title: "Implementar Rate Limiting de APIs con Redis"
description: "Protege APIs de abuso usando algoritmos de token bucket y ventana deslizante con Redis, incluyendo manejo de bursts, coordinacion distribuida y headers custom para feedback al cliente"
metaDescription: "Implementa rate limiting de APIs con Redis. Usa token bucket y sliding window con manejo de bursts, coordinacion distribuida y headers de feedback al cliente."
difficulty: intermediate
topics:
  - api
  - security
tags:
  - throttling
  - redis
  - api
  - rate-limiting
  - rest
relatedResources:
  - /recipes/api/go-rest-api-gin
  - /recipes/api/api-documentation-openapi
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa rate limiting de APIs con Redis. Usa token bucket y sliding window con manejo de bursts, coordinacion distribuida y headers de feedback al cliente."
  keywords:
    - rate limiting
    - token bucket
    - sliding window
    - redis
    - api protection
---

# Implementar Rate Limiting de APIs con Redis

Previene abuso de APIs y asegura distribucion justa de recursos usando rate limiters respaldados por Redis. Consulta [Guía de Seguridad](/guides/security/security-best-practices-guide) para estrategias generales de protección de APIs. Esta recipe implementa algoritmos de token bucket y ventana deslizante con coordinacion distribuida, headers custom de rate limit y configuracion por endpoint para APIs de produccion.

## Cuando Usar Esto

- APIs publicas necesitan proteccion contra brute force y scraping
- Diferentes tiers de usuarios requieren diferentes rate limits (free vs paid)
- Multiples nodos de API deben compartir estado de rate limit consistentemente

## Solucion

### 1. Algoritmo de Token Bucket

```typescript
// rate-limiter/TokenBucket.ts
import { Redis } from 'ioredis';

class TokenBucketLimiter {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async check(key: string, capacity: number, refillRate: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const bucketKey = `ratelimit:token:${key}`;

    const luaScript = `
      local bucket = redis.call('HMGET', KEYS[1], 'tokens', 'lastRefill')
      local tokens = tonumber(bucket[1]) or ARGV[1]
      local lastRefill = tonumber(bucket[2]) or ARGV[3]
      local now = tonumber(ARGV[3])
      local capacity = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2])
      local interval = tonumber(ARGV[4])

      local elapsed = now - lastRefill
      local refill = math.floor(elapsed / interval) * refillRate
      tokens = math.min(capacity, tokens + refill)

      if tokens >= 1 then
        tokens = tokens - 1
        redis.call('HMSET', KEYS[1], 'tokens', tokens, 'lastRefill', now)
        redis.call('EXPIRE', KEYS[1], 3600)
        return {1, tokens, now + interval}
      else
        redis.call('HMSET', KEYS[1], 'tokens', tokens, 'lastRefill', lastRefill)
        redis.call('EXPIRE', KEYS[1], 3600)
        return {0, tokens, lastRefill + interval}
      end
    `;

    const result = await this.redis.eval(luaScript, 1, bucketKey, capacity, refillRate, now, 1000);
    const [allowed, remaining, resetTime] = result as [number, number, number];

    return {
      allowed: allowed === 1,
      remaining,
      resetTime,
    };
  }
}
```

### 2. Contador de Ventana Deslizante

```typescript
// rate-limiter/SlidingWindow.ts
class SlidingWindowLimiter {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async check(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowKey = `ratelimit:window:${key}`;
    const windowStart = now - windowMs;

    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(windowKey, 0, windowStart);
    pipeline.zcard(windowKey);
    pipeline.zadd(windowKey, now, `${now}-${Math.random()}`);
    pipeline.pexpire(windowKey, windowMs);

    const [, [currentCount], ,] = await pipeline.exec() as [unknown, [number], unknown, unknown];

    if (currentCount < limit) {
      return {
        allowed: true,
        remaining: limit - currentCount - 1,
        resetTime: now + windowMs,
      };
    }

    await this.redis.zremrangebyrank(windowKey, -1, -1);
    const oldest = await this.redis.zrange(windowKey, 0, 0, 'WITHSCORES');
    const resetTime = oldest.length > 0 ? Number(oldest[1]) + windowMs : now + windowMs;

    return {
      allowed: false,
      remaining: 0,
      resetTime,
    };
  }
}
```

### 3. Middleware de Express con Headers

```typescript
// middleware/rateLimit.ts
import { Request, Response, NextFunction } from 'express';

function rateLimit(limiter: TokenBucketLimiter, options: { capacity: number; refillRate: number }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.route?.path || req.path}`;
    const result = await limiter.check(key, options.capacity, options.refillRate);

    res.setHeader('X-RateLimit-Limit', String(options.capacity));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, result.remaining)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));

    if (!result.allowed) {
      res.status(429).json({
        error: 'Too Many Requests',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      });
      return;
    }

    next();
  };
}

app.use('/api/public', rateLimit(limiter, { capacity: 100, refillRate: 10 }));
app.use('/api/premium', rateLimit(limiter, { capacity: 1000, refillRate: 100 }));
```

### 4. Configuracion por Tier de Usuario

```typescript
// rate-limiter/TierConfig.ts
interface RateLimitConfig {
  capacity: number;
  refillRate: number;
}

const tierLimits: Record<string, RateLimitConfig> = {
  free: { capacity: 100, refillRate: 10 },
  pro: { capacity: 1000, refillRate: 100 },
  enterprise: { capacity: 10000, refillRate: 1000 },
};

async function tieredRateLimit(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string;
  const tier = userId ? await getUserTier(userId) : 'free';
  const config = tierLimits[tier] || tierLimits.free;

  const key = `${tier}:${userId || req.ip}`;
  const result = await limiter.check(key, config.capacity, config.refillRate);

  if (!result.allowed) {
    res.status(429).json({ error: 'Rate limit exceeded', tier });
    return;
  }

  next();
}
```

## Como Funciona

- **Token bucket** permite bursts hasta la capacidad mientras mantiene tasa promedio
- **Sliding window** provee limites mas estrictos trackeando timestamps exactos de requests
- **Scripts Lua de Redis** garantizan operaciones atomicas a traves de nodos distribuidos
- **Headers de respuesta** informan a clientes de cuota restante y tiempo de reset

## Consideraciones de Produccion

- Usa Redis Cluster para estado de rate limit de alta disponibilidad
- Implementa [circuit breaker](/patterns/design/circuit-breaker-pattern) alrededor de Redis para fail open si el cache cae
- Logea violaciones de rate limit para monitoreo de seguridad y deteccion de abuso

## Errores Comunes

- Rate limitar solo por IP, bloqueando usuarios legitimos detras de NAT
- No manejar fallos de Redis gracefulmente, causando outages de API
- Retornar 429 sin headers Retry-After, dejando clientes adivinando
- **Middleware de Express**: Para patrones específicos de Express, consulta [Patrones de Middleware de Express](/recipes/api/express-middleware-patterns).

## FAQ

### Token bucket vs sliding window: ¿cuál debería usar?

Token bucket permite bursts controlados y es más eficiente con operaciones de Redis (una call de Lua script por request). Sliding window es más estricto y mejor para requerimientos de compliance exacto (ej., APIs financieras que deben enforcear conteos exactos de requests por minuto). Token bucket recarga a una tasa fija, así que un cliente que espera puede acumular tokens para un burst. Sliding window cuenta requests en una ventana de tiempo rolling, previniendo bursts enteramente. Para la mayoría de las APIs, token bucket con un burst size razonable (2x la tasa steady-state) es suficiente.

### ¿Cómo manejo rate limits a través de microservicios?

Usa una instancia Redis compartida o un servicio dedicado de rate limiting con APIs gRPC/HTTP. Cada servicio llama al rate limiter antes de procesar el request. Para deployments distribuidos, usa Redis Cluster para evitar un single point of failure. Alternativamente, deploya un API gateway (Kong, Envoy) que maneje rate limiting centralmente. Para calls service-to-service, implementa un token-bucket por par de servicios en lugar de por cliente para prevenir que un servicio downstream agote el quota de otro.

### ¿Cómo manejo fallos de Redis sin bloquear todo el tráfico?

Implementa un circuit breaker alrededor de las calls a Redis. Si Redis no está disponible, fail open (permite el request) y logea un warning. Fail closed (bloquear todo el tráfico) causa outages en cascada. Usa un fallback in-memory local (ej., un counter simple con `lru-cache`) para outages cortos de Redis. Setea un timeout en los comandos de Redis (ej., 50ms) para que un Redis lento no bloquee el procesamiento de requests. Monitorea la salud de Redis y alerta cuando el circuit breaker está open.

### ¿Cómo seteo rate limits por tier (free, pro, enterprise)?

Almacena el tier en la API key o JWT claims. Busca la configuración de rate limit del tier desde una base de datos o archivo de config. Usa prefijos de Redis key diferentes por tier: `rate:free:{key}`, `rate:pro:{key}`, `rate:enterprise:{key}`. Aplica diferentes bucket sizes y refill rates por tier. Retorna el tier en headers de respuesta (`X-RateLimit-Tier: pro`) para que los clientes puedan debuggear sus límites. Actualiza la configuración de tier sin redeployar leyendo desde un config service o base de datos.

### ¿Cómo testeo lógica de rate limiting?

Escribe unit tests para el Lua script usando `redis-cli --eval` con mock keys. Testea boundary conditions: exactamente en el límite, uno sobre el límite, refill después de esperar. Para tests de integración, usa `ioredis-mock` o una instancia Redis real en un Docker container. Simula requests concurrentes con `Promise.all` para verificar atomicidad. Testea escenarios de fallo de Redis matando el proceso de Redis mid-test y verificando que el circuit breaker abra. Load testea con `k6` o `artillery` para verificar que el rate limiter maneje el throughput esperado.

### ¿Cómo rate limito conexiones WebSocket?

Rate limita por connection ID, no solo IP. Trackea conexiones activas por usuario en Redis con un sorted set (`ZADD ws:connections timestamp connectionId`). Enforcea un límite de conexiones máximas por usuario. Para message rate, cuenta mensajes por conexión con un token bucket: `rate:ws:{connectionId}`. Desconecta clientes que excedan el message rate con un close code 1008 (policy violation). Limpia entries de conexión al desconectar con `ZREMRANGEBYSCORE`.

### ¿Cómo manejo headers de rate limit en un gateway?

Setea headers estándar: `X-RateLimit-Limit` (máx requests por ventana), `X-RateLimit-Remaining` (requests restantes), `X-RateLimit-Reset` (Unix timestamp cuando la ventana resetea), y `Retry-After` (segundos a esperar, solo en respuestas 429). Usa el prefijo de header `RateLimit-*` del draft IETF (ej., `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`) para clientes modernos. No expongas configuración interna de rate limit (bucket size, refill rate) — solo los límites efectivos que el cliente ve.

### ¿Cómo implemento rate limiting distribuido sin Redis?

Para entornos sin Redis, usa un token bucket en una base de datos compartida (PostgreSQL `SELECT FOR UPDATE`, DynamoDB conditional writes). El downside es mayor latencia — cada check de rate limit requiere un database round trip. Para eventual consistency, usa un token bucket local por instancia y sin croniza periódicamente con un store central. Esto permite bursts cortos sobre el límite pero converge a la tasa correcta over time. Para rate limiting a nivel CDN, usa las rate limiting rules de Cloudflare o AWS WAF rate-based rules — estas bloquean requests antes de que lleguen a tu servidor.

### ¿Cómo manejo rate limiting para requests autenticados vs no autenticados?

Usa diferentes rate limit keys: `rate:ip:{ip}` para no autenticados y `rate:user:{userId}` para autenticados. Aplica diferentes límites: no autenticados gets 10 req/min, autenticados gets 100 req/min. Chequea autenticación primero — si el usuario está autenticado, skipea el limiter basado en IP. Para APIs con tiers free y paid, usa `rate:free:{userId}` y `rate:pro:{userId}` con diferentes bucket sizes. Retorna el status de autenticación en headers (`X-RateLimit-Authenticated: true`) para que los clientes puedan debuggear por qué hits a diferentes límites.

### ¿Cómo implemento un algoritmo sliding window log en Redis?

Usa un sorted set por cliente: `ZADD rate:log:{key} timestamp request_id`. Remueve entries fuera de la ventana: `ZREMRANGEBYSCORE rate:log:{key} 0 (now - window)`. Cuenta entries restantes: `ZCARD rate:log:{key}`. Si el count excede el límite, rechaza el request. Este approach usa más memoria que token bucket pero provee conteos exactos de requests en cualquier ventana de tiempo. Agrega un TTL en la key para auto-expirar clientes inactivos. Para APIs de alto tráfico, prefiere token bucket — sliding window log almacena cada request ID, lo que puede consumir significant Redis memory.

### ¿Cómo implemento un algoritmo fixed window counter en Redis?

Usa `INCR` con una key que incluya el timestamp de la ventana: `key = rate:fixed:{clientId}:{floor(now / window)}`. Incrementa con `INCR key` y setea expiry con `EXPIRE key windowSeconds`. Si el count excede el límite, rechaza. Este es el algoritmo más simple pero tiene boundary issues: un cliente puede enviar 2x el límite en el boundary de la ventana (N requests a los 59 segundos, N más a los 60 segundos). Úsalo para requerimientos de baja precisión donde la simplicidad importa más que la exactitud. Para APIs de producción, prefiere token bucket o sliding window.

### ¿Cómo manejo rate limiting para APIs GraphQL?

Rate limita por query cost, no por request count. Asigna complexity scores a cada campo y calcula el total query cost antes de la ejecución. Usa el package `graphql-cost-analysis` para enforcear límites de cost por query. Almacena el cost acumulado en Redis: `INCRBY rate:gql:{userId} cost`. Una sola GraphQL query puede ser tan cara como 100 REST requests, así que el limiting basado en request count es insuficiente. Para persisted queries, cachea el cálculo de cost. Retorna headers `X-RateLimit-Cost` para que los clientes entiendan su query cost.

### ¿Cómo monitoreo y alerto sobre rate limiting?

Trackea métricas: total requests, requests rate-limited (429s), top clientes rate-limited, y latencia de Redis. Usa Prometheus o CloudWatch para colectar métricas. Setea alertas cuando el rate de 429 exceda 5% del total de requests — esto puede indicar que los límites son muy agresivos o que un cliente está mal comportándose. Monitorea la latencia de comandos de Redis: si `EVALSHA` toma más de 10ms, investiga la performance de Redis. Logea requests rate-limited con client ID, endpoint, y límite para debugging. Dashboardea los top 10 clientes rate-limited para identificar patrones abusivos. Alerta cuando el circuit breaker está open (Redis no disponible) — esto significa que el rate limiting está deshabilitado.

### ¿Cómo implemento un algoritmo sliding window counter (hybrid) en Redis?

Combina fixed window y sliding window: usa dos counters por cliente — ventana actual y ventana previa. Calcula el weighted count: `count = current + previous * (1 - (now - windowStart) / window)`. Almacena counters con `INCR` y `EXPIRE` como en el approach de fixed window. Esto aproxima el sliding window sin almacenar cada request ID, usando O(1) memoria por cliente. La aproximación es precisa dentro de un pequeño margen y suitable para la mayoría de las APIs. Úsalo cuando necesites mejor exactitud que fixed window pero menor memoria que sliding window log.

### ¿Cómo manejo rate limiting con API keys y aislamiento multi-tenant?

Usa el API key como identificador de rate limit: `rate:apikey:{apiKeyHash}`. Hashea el API key con SHA-256 antes de usarlo como Redis key para evitar almacenar keys crudas en Redis. Para aislamiento multi-tenant, namespacea keys por tenant: `rate:tenant:{tenantId}:apikey:{apiKeyHash}`. Aplica límites por tenant para que un tenant no pueda agotar el rate limit global. Almacena configuraciones de tenant en un Redis hash separado: `HSET tenant:config:{tenantId} rateLimit 100 window 60`. En cada request, lookup la config del tenant y aplica los límites apropiados. Rota API keys creando una key nueva, migrando tráfico, y luego revocando la key vieja.

### ¿Cómo manejo rate limiting con websockets y conexiones long-lived?

Rate limita conexiones websocket por message count, no por connection count. Trackea mensajes por segundo por conexión en Redis: `INCR rate:ws:{connectionId}:{windowKey}`. Aplica un límite por conexión (ej., 10 mensajes/segundo) y un límite por usuario across todas las conexiones (ej., 50 mensajes/segundo). Al conectar, registra la conexión en un Redis set: `SADD rate:ws:user:{userId} {connectionId}`. Al desconectar, remuévela: `SREM rate:ws:user:{userId} {connectionId}`. Para mensajes broadcast, usa un counter separado para limitar total broadcasts por segundo. Cierra conexiones que excedan el límite con un close code 1008 policy violation.

### ¿Cómo manejo rate limiting con webhooks y callbacks entrantes?

Rate limita webhooks entrantes por source IP y por evento: `rate:webhook:{sourceIp}:{event}:{windowKey}`. Los webhooks pueden tener bursts grandes cuando un sistema externo envía notificaciones en lote. Aplica límites más altos para webhooks que para requests de usuarios (ej., 1000/minuto por source IP). Valida la firma del webhook antes de aplicar el rate limit para evitar que attackers consuman el rate limit con requests inválidos. Usa una cola separada para procesar webhooks: el endpoint acepta el request rápidamente (200 OK) y lo encola para procesamiento async. Si la cola se llena, retorna 429 con un `Retry-After` header. Monitorea el lag entre recepción del webhook y procesamiento.

### ¿Cómo implemento rate limiting con Redis Cluster y sharding?

En Redis Cluster, las keys se distribuyen across slots usando hash tags. Para rate limiting, usa hash tags para asegurar que todas las keys relacionadas con un cliente estén en el mismo slot: `rate:{tenantId}:apikey:{apiKeyHash}`. El `{tenantId}` entre llaves asegura que Redis Cluster rutear la key al mismo slot. Si necesitas operaciones atómicas across múltiples keys del mismo cliente, todas deben compartir el hash tag. Para clientes distribuidos globalmente, considera Redis instances regionales con sync via Redis Geo-Distribution. Monitorea la distribución de keys across slots con `CLUSTER SLOTS` y rebalancea si un slot tiene hotspots.

### ¿Cómo testeo rate limiting en integración?

Usa un test que haga N requests rápidos y verifique que el response N+1 retorne 429. En JavaScript, usa `supertest` con Express: `await request(app).get('/api').expect(200)` para los primeros N requests, luego `await request(app).get('/api').expect(429)`. En Python, usa `pytest` con `httpx.Client`. Mockea Redis con `ioredis-mock` o `fakeredis` para tests unitarios. Para tests de integración, usa un Redis real via `testcontainers`. Verifica que el header `Retry-After` esté presente en responses 429. Testea el circuit breaker: apaga Redis y verifica que los requests pasen sin rate limiting.
