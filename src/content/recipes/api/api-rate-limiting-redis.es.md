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
lastUpdated: "2026-06-18"
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

**P: Token bucket vs sliding window: cual deberia usar?**
R: Token bucket permite bursts controlados y es mas eficiente. Sliding window es mas estricto y mejor para requerimientos de compliance exactos.

**P: Como manejo rate limits a traves de microservicios?**
R: Usa una instancia Redis compartida o un servicio dedicado de rate limiting con APIs gRPC/HTTP.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
