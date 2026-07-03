---
contentType: recipes
slug: api-rate-limiting
title: "Rate Limiting de APIs"
description: "Protege las APIs de abuso y asegura uso justo de recursos con token bucket, sliding window y leaky bucket."
metaDescription: "Estrategias de rate limiting para APIs: algoritmos token bucket, sliding window, leaky bucket, rate limiters basados en Redis y rate limiting distribuido."
difficulty: intermediate
topics:
  - api
tags:
  - rate-limiting
  - api
  - redis
  - security
  - token-bucket
  - sliding-window
relatedResources:
  - /recipes/api-rate-limiting-redis
  - /guides/security/api-security-checklist-guide
  - /recipes/caching/redis-rate-limiting-token-bucket
lastUpdated: "2026-07-03"
author: "StackPractices"
seo:
  metaDescription: "Estrategias de rate limiting para APIs: algoritmos token bucket, sliding window, leaky bucket, rate limiters basados en Redis y rate limiting distribuido."
  keywords:
    - rate-limiting
    - api
    - redis
    - security
---
## Visión General

El rate limiting protege las APIs de abuso y asegura distribución justa de recursos entre clientes. Tres algoritmos cubren la mayoría de los casos: token bucket permite bursts, sliding window impone límites estrictos y leaky bucket suaviza el tráfico.

## Cuándo Usar

Usa este recurso cuando:
- APIs públicas necesitan protección contra brute force y scraping
- Diferentes tiers de usuarios requieren diferentes rate limits
- Múltiples nodos de API deben compartir estado de rate limit consistentemente

## Solución

### Python (Token Bucket con Redis)

```python
import time
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

def token_bucket(key, capacity=10, refill_rate=1.0):
    """Algoritmo token bucket usando Redis INCR con expiración."""
    now = time.time()
    bucket_key = f"rate_limit:{key}"
    tokens = r.hgetall(bucket_key)

    if not tokens:
        r.hset(bucket_key, mapping={"tokens": capacity - 1, "last_refill": now})
        r.expire(bucket_key, int(capacity / refill_rate) + 1)
        return True

    current_tokens = float(tokens.get(b"tokens", 0))
    last_refill = float(tokens.get(b"last_refill", now))
    elapsed = now - last_refill
    current_tokens = min(capacity, current_tokens + elapsed * refill_rate)

    if current_tokens < 1:
        r.hset(bucket_key, mapping={"tokens": current_tokens, "last_refill": now})
        return False

    r.hset(bucket_key, mapping={"tokens": current_tokens - 1, "last_refill": now})
    return True
```

### JavaScript (Sliding Window con Redis)

```javascript
import { createClient } from 'redis';

const client = createClient({ url: 'redis://localhost:6379' });
await client.connect();

async function slidingWindow(key, limit = 100, windowSec = 60) {
  const now = Date.now();
  const windowStart = now - windowSec * 1000;
  const sortedSetKey = `rate_limit:${key}`;

  // Eliminar entradas fuera de la ventana
  await client.zRemRangeByScore(sortedSetKey, 0, windowStart);

  // Contar entradas actuales
  const count = await client.zCard(sortedSetKey);

  if (count >= limit) {
    return { allowed: false, retryAfter: windowSec };
  }

  // Agregar petición actual
  await client.zAdd(sortedSetKey, [{ score: now, value: `${now}` }]);
  await client.expire(sortedSetKey, windowSec);

  return { allowed: true, remaining: limit - count - 1 };
}
```

### Java (Leaky Bucket)

```java
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class LeakyBucket {
    private static final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    static class Bucket {
        final int capacity;
        final double leakRatePerSec;
        double water;
        long lastLeak;

        Bucket(int capacity, double leakRatePerSec) {
            this.capacity = capacity;
            this.leakRatePerSec = leakRatePerSec;
            this.water = 0;
            this.lastLeak = System.currentTimeMillis();
        }

        synchronized boolean allow() {
            long now = System.currentTimeMillis();
            double elapsed = (now - lastLeak) / 1000.0;
            water = Math.max(0, water - elapsed * leakRatePerSec);
            lastLeak = now;
            if (water < capacity) {
                water += 1;
                return true;
            }
            return false;
        }
    }

    public static boolean allowRequest(String clientId, int capacity, double leakRate) {
        return buckets.computeIfAbsent(clientId, k -> new Bucket(capacity, leakRate)).allow();
    }
}
```

## Explicación

**Token bucket** mantiene un pool de tokens que se rellena a una tasa fija. Cada petición consume un token. Si no hay tokens disponibles, la petición se rechaza. Permite bursts cortos hasta la capacidad del bucket manteniendo una tasa promedio.

**Sliding window** rastrea peticiones dentro de una ventana temporal y rechaza nuevas peticiones cuando se alcanza el límite. A diferencia de las ventanas fijas, evita picos en los límites usando una ventana deslizante.

**Leaky bucket** procesa peticiones a una tasa fija sin importar el patrón de llegada. Las peticiones entrantes se acumulan y "gotean" a una tasa constante, suavizando el tráfico bursty.

## Variantes

| Algoritmo | Manejo de Bursts | Memoria | Ideal Para |
|-----------|-----------------|---------|------------|
| Token bucket | Permite bursts hasta capacidad | Baja | APIs con tráfico bursty |
| Sliding window | Límite estricto por ventana | Media | APIs de pagos, endpoints sensibles |
| Leaky bucket | Suaviza a tasa constante | Baja | Protección de servicios downstream |

## Lo que funciona

1. Usa token bucket para bursts controlados y sliding window para límites estrictos
2. Retorna headers `Retry-After` con respuestas 429 para que los clientes sepan cuándo reintentar
3. Rate limita por ID de usuario, no solo por IP, para evitar bloquear usuarios legítimos detrás de NAT
4. Loguea violaciones de rate limit para monitoreo de seguridad y detección de abuso
5. Implementa circuit breaker alrededor de Redis para fail open si el cache cae

## Errores Comunes

1. Rate limitar solo por IP, bloqueando usuarios legítimos detrás de NAT
2. No manejar fallos de Redis gracefulmente, causando outages de API
3. Retornar 429 sin headers `Retry-After`, dejando clientes adivinando
4. Usar el mismo rate limit para todos los endpoints sin importar costo o sensibilidad
5. Ignorar violaciones de rate limit en lugar de loguearlas para análisis de seguridad

## Preguntas Frecuentes

### ¿Debo fail open o closed cuando Redis cae?

Fail open para rate limiting. Rechazar todas las peticiones porque el rate limiter no está disponible causa peores outages que permitir tráfico temporalmente. Loguea el fallo y alerta sobre él.

### ¿Cómo manejo rate limiting distribuido entre múltiples nodos?

Usa un store compartido como Redis. Cada nodo verifica e incrementa el contador en Redis. Para menor latencia, usa token buckets locales con sincronización periódica con Redis, aceptando límites ligeramente menos precisos.

### ¿Con qué valores de rate limit debo empezar?

Empieza con 100 peticiones por minuto para usuarios autenticados y 10 por minuto para anónimos. Monitorea patrones de uso y ajusta. Endpoints costosos (exports, reports) deben tener límites separados más bajos.
