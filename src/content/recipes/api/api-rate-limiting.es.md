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
  - /guides/api-security-checklist-guide
  - /recipes/redis-rate-limiting-token-bucket
  - /recipes/python-api-rate-limiting
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

## Mejores Prácticas


- For a deeper guide, see [API Rate Limiting — Design Fair and Useful Throttling](/es/guides/api-rate-limiting-guide/).

- **Usa sliding window sobre fixed window**: sliding window provee rate limiting más suave sin burst spikes en los boundaries del window. Redis sorted sets hacen sliding windows eficientes.
- **Diferencia límites por costo de endpoint**: un GET `/users` es barato; un POST `/reports/export` es costoso. Setea límites más bajos en endpoints costosos para proteger recursos del backend.
- **Retorna respuestas 429 meaningful**: incluye header `Retry-After`, límite actual, quota restante y timestamp de reset en headers de respuesta. Los clientes pueden usar esto para implementar backoff correctamente.
- **Exime llamadas internas service-to-service**: rate limiting tráfico inter-servicios puede cascadear fallos. Usa mTLS o network policies para auth interno en lugar de rate limits.
- **Almacena contadores de rate limit en Redis, no en memoria**: los contadores in-memory no funcionan across múltiples instancias. Redis provee INCR atómico con TTL, ideal para rate limiting distribuido.
- **Monitorea hit rates de rate limit**: si >5% de las peticiones son rate-limited, o tus límites son muy bajos o un cliente está mal comportándose. Alerta sobre spikes repentinos en respuestas 429.

## Checklist de Producción

- [ ] Rate limits se enforcement antes del request processing, no después
- [ ] Respuestas 429 incluyen headers `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- [ ] Conexión Redis tiene fallback (fail open) con alerting en fallos
- [ ] Contadores de rate limit están scoped por API key o usuario, no solo por IP
- [ ] Endpoints costosos tienen rate limits separados más bajos
- [ ] Tráfico interno service-to-service está exento o tiene límites más altos
- [ ] Configuración de rate limit está externalizada (env vars, config service) para hot-reload
- [ ] Rate de respuestas 429 está monitoreado y alertado (threshold >5%)
- [ ] Tests de rate limit cubren peticiones concurrentes para verificar atomicidad
- [ ] Documentación describe rate limits y headers para consumidores de API

## Consideraciones de Escalado

- **Throughput de Redis a escala**: una instancia Redis simple maneja ~100K operaciones/segundo. Para 1M peticiones/segundo, necesitas Redis Cluster con sharding por API key. Cada check de rate limit requiere 2 operaciones Redis (INCR + EXPIRE), así que planea 2M ops/second en peak.
- **Impacto de latencia**: cada check de rate limit agrega 1-3ms (Redis round-trip). Para APIs con presupuesto de latencia sub-10ms, usa token buckets locales con sync periódico a Redis (cada 100ms). Esto tradea precisión por velocidad — los límites pueden variar ~10% bajo contención.
- **Despliegues multi-región**: si tu API corre en múltiples regiones, Redis debe estar co-located con las instancias de API de cada región. Llamadas Redis cross-region agregan 50-200ms de latencia. Usa clusters Redis regionales y acepta límites ligeramente diferentes por región.
- **Protección contra cold starts**: funciones serverless (Lambda, Cloud Run) pueden escalar de 0 a 1000 instancias en segundos. Cada nueva instancia empieza con un bucket local vacío. Usa límites backed por Redis para evitar que burst traffic overwhelme servicios backend durante olas de cold start.

## Estimación de Costos

| Componente | Costo | Notas |
|-----------|------|-------|
| Redis (single, 1GB) | $10-$25/mes | AWS ElastiCache, GCP Memorystore |
| Redis Cluster (3 shards) | $75-$200/mes | Para >100K ops/second |
| Redis (self-hosted en EC2) | $5-$15/mes | t3.small, 1GB RAM |
| Cloudflare Rate Limiting | $5-$25/mes | Edge-level, sin Redis |
| AWS API Gateway throttling | $0 | Built-in, per-stage limits |

Para 10K peticiones/segundo: Redis Cluster ($150/mes) maneja 200K ops/second con headroom. Cloudflare edge rate limiting ($25/mes) offloadea 90% del tráfico antes de que hittee tu origin, reduciendo la carga de Redis proporcionalmente.

## Cuándo No Usar Este Enfoque

- **Microservicios internos con callers trusted**: rate limiting tráfico inter-servicios agrega latencia y complejidad. Usa circuit breakers y bulkheads en su lugar para proteger servicios downstream.
- **Receptores de webhooks con verificación de firma**: si verificas HMAC signatures en cada petición, las peticiones inválidas se rechazan antes de hitting rate limits. Rate limiting no agrega valor de seguridad aquí.
- **APIs de batch processing**: APIs diseñadas para transferencia masiva de data (ETL pipelines, batch exports) deberían usar queue-based throttling, no rate limits por-petición. Un batch job enviando 10K peticiones en 10 segundos es comportamiento esperado, no abuso.

## Benchmarks de Rendimiento

| Estrategia | Overhead por petición | Max throughput | Memoria por key |
|----------|---------------------|---------------|---------------|
| In-memory token bucket | 0.01ms | 500K req/s | 64 bytes |
| Redis fixed window | 1-2ms | 50K req/s | 72 bytes |
| Redis sliding window | 2-3ms | 30K req/s | 128 bytes |
| Redis token bucket | 1-2ms | 50K req/s | 64 bytes |
| Cloudflare edge | 0ms (en origin) | Unlimited | 0 bytes |

Rate limiting in-memory es 100x más rápido que Redis pero no funciona across instancias. Para despliegues single-instance, usa in-memory. Para multi-instancia, Redis es el standard. Cloudflare edge rate limiting es free a nivel origin pero cuesta $5-$25/mes para custom rules.

## Estrategia de Testing

- **Testea enforcement de rate limit**: envía N+1 peticiones rápidamente y verifica que la (N+1) retorna 429 con headers correctos (`Retry-After`, `X-RateLimit-Remaining`). Testea con diferentes client IDs para verificar per-client isolation.
- **Testea comportamiento de window reset**: envía peticiones hasta el límite, espera a que la window se resetee y verifica que las peticiones funcionan de nuevo. Testea edge cases en los boundaries de la window (e.g., petición a 59.9s y 60.1s).
- **Testea Redis failover**: simula pérdida de conexión a Redis y verifica que el rate limiter fails open (permite peticiones) o fails closed (bloquea todas) según tu policy. Documenta el comportamiento elegido para el equipo de operaciones.
- **Testea consistencia distribuida**: corre múltiples instancias simultáneamente y verifica que el rate limit aggregate se enforcement correctamente across todas las instancias. Usa un load tester para generar tráfico desde múltiples sources.

## Errores Comunes

- **Usar fixed windows sin jitter**: fixed window rate limiting causa thundering herd en los boundaries de la window. Todos los clientes retryean simultáneamente al inicio de cada window. Agrega jitter (random delay 0-500ms) a la retry logic.
- **Olvidar rate limit por IP detrás de un proxy**: si tu API está detrás de un load balancer, `req.ip` retorna la IP del proxy, no la del cliente. Configura `trust proxy` y usa `X-Forwarded-For` para identificar clientes reales.
- **Redis rate limiter failing closed**: si Redis se cae y el rate limiter bloquea todas las peticiones, tu API se queda offline. Configura fail-open behavior (permite peticiones cuando Redis es unreachable) para endpoints non-critical.
- **No diferenciar límites authenticated vs anonymous**: usuarios anonymous deberían tener límites más bajos que usuarios authenticated. Usa un approach tiered: 10 req/min para anonymous, 100 req/min para authenticated, 1000 req/min para premium API keys.

## Monitoring y Observabilidad

- **Trackea 429 response rate**: monitorea el porcentaje de peticiones retornando 429. Un aumento súbito puede indicar un límite mal configurado o un cliente abusivo. Alerta si el 429 rate excede 5% del tráfico total.
- **Monitorea Redis latency para rate limit checks**: trackea el tiempo tomado para comandos Redis `INCR` y `EXPIRE`. Si p95 excede 5ms, considera switchear a in-memory rate limiting para endpoints non-critical o agregar Redis replicas.
- **Trackea rate limit key count**: monitorea el número de unique rate limit keys en Redis. Si el key count crece unboundedly, los clientes pueden estar generando unique IDs para bypassar límites. Setea un max key count y evicta old keys con `EXPIRE`.
- **Alerta en rate limiter failures**: si el rate limiter crashea o Redis se vuelve unreachable, alerta al on-call engineer inmediatamente. Un rate limiter failed ya sea bloquea todo el tráfico (fail-closed) o permite tráfico ilimitado (fail-open), ambos requiriendo atención inmediata.

## Checklist de Despliegue

- [ ] Elegir strategy de rate limit (fixed window, sliding window, token bucket)
- [ ] Configurar límites por endpoint y por user tier (anonymous, authenticated, premium)
- [ ] Setear Redis para distributed rate limiting si corres múltiples instancias
- [ ] Configurar `trust proxy` y usar `X-Forwarded-For` para client IP identification
- [ ] Agregar jitter a retry logic para prevenir thundering herd en window boundaries
- [ ] Setear fail-open behavior para endpoints non-critical cuando Redis es unreachable
- [ ] Configurar headers `Retry-After` y `X-RateLimit-*` en responses 429
- [ ] Testear rate limiting en staging con traffic patterns realistas
- [ ] Setear monitoring para 429 response rate y Redis latency
- [ ] Documentar rate limits en API documentation y developer portal

## Consideraciones de Seguridad

- **Rate limit key spoofing**: si los clientes pueden manipular su IP o user ID, pueden bypassar rate limits. Siempre valida el header `X-Forwarded-For` contra trusted proxy IPs. Usa authenticated user IDs como rate limit key para usuarios logged-in.
- **Distributed denial-of-service via rate limit exhaustion**: atacantes pueden enviar tráfico just-under-limit desde muchas IPs para exhaustar server resources sin triggerear 429. Combina rate limiting con connection limits y request body size limits.
- **Redis como single point of failure**: si Redis se cae, el rate limiter ya sea bloquea todo el tráfico o permite tráfico ilimitado. Corre Redis en sentinel o cluster mode para high availability.
- **Timing attacks en rate limit checks**: si las decisiones de rate limit toman tiempo diferente para peticiones allowed vs denied, los atacantes pueden inferir el rate limit state. Usa constant-time comparisons para rate limit checks para prevenir timing-based side channels.
- **Rate limit header information leakage**: los headers `X-RateLimit-Remaining` y `X-RateLimit-Limit` revelan tu configuración de rate limit a atacantes. Considera omitir estos headers para unauthenticated requests o retornar approximate values.
- **Shared IP rate limiting para NAT**: usuarios detrás de un corporate NAT comparten la misma IP. Límites agresivos per-IP pueden bloquear usuarios legítimos. Usa una combinación de IP y authenticated user ID para rate limit keys, y setea límites más altos para shared IPs.
- **Rate limit bypass via HTTP method switching**: si los rate limits se aplican solo a GET requests, los atacantes pueden switchear a POST o PUT para bypassarlos. Aplica rate limits a todos los HTTP methods, incluyendo OPTIONS y HEAD.
- **Race conditions en distributed rate limiting**: peticiones concurrentes pueden leer el mismo counter value antes de que cualquiera lo incremente, permitiendo más peticiones que el límite. Usa Redis atomic operations (`INCR` con `EXPIRE`) o Lua scripts para asegurar atomicity.
- **Rate limit evasion via path variation**: los atacantes pueden variar el URL path (e.g., `/api/users?x=1` vs `/api/users?x=2`) para bypassar per-endpoint rate limits. Normaliza URLs antes de aplicar rate limit keys y rate limit por API endpoint pattern, no full URL.
- **Token bucket overflow en burst scenarios**: token bucket algorithms permiten bursts hasta el bucket capacity. Si el bucket es demasiado grande, un solo cliente puede overwhelm el server en un burst. Setea bucket capacity a 2x el refill rate para balancear bursts y sustained traffic.
- **Rate limit key expiration sin cleanup**: si los rate limit keys en Redis no se cleanupean después de la expiración, el memory usage crece unboundedly. Usa `EXPIRE` en every key y setea un max TTL de 24 horas para asegurar automatic cleanup.
- **Client-side rate limit caching**: los clientes pueden cachear rate limit responses localmente y reusarlos para evitar hittear el server. Incluye un `Date` o `ETag` header en rate limit responses para prevenir stale caching.
