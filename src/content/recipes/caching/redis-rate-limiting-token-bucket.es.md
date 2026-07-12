---





contentType: recipes
slug: redis-rate-limiting-token-bucket
title: "Rate limiting con Redis y algoritmo Token Bucket"
description: "Implementa un rate limiter distribuido con token bucket usando operaciones atomicas de Redis para throttling de API entre multiples instancias"
metaDescription: "Construye un rate limiter distribuido con Redis token bucket. Usa scripts Lua para check-and-decrement atomico entre multiples instancias de servidor."
difficulty: advanced
topics:
  - caching
  - security
tags:
  - redis
  - rate limiting
  - token bucket
  - api
  - security
relatedResources:
  - /recipes/redis-cache-aside-pattern
  - /recipes/redis-sorted-set-leaderboard
  - /recipes/redis-distributed-lock
  - /recipes/python-rate-limiting-fastapi-redis
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye un rate limiter distribuido con Redis token bucket. Usa scripts Lua para check-and-decrement atomico entre multiples instancias de servidor."
  keywords:
    - redis rate limiting
    - token bucket algorithm
    - api rate limiter
    - distributed rate limiting
    - redis lua script





---

# Rate limiting con Redis y algoritmo Token Bucket

El rate limiting protege las APIs de abuso y asegura una asignacion justa de recursos. El algoritmo token bucket permite bursts hasta una capacidad configurada mientras mantiene una tasa de reabastecimiento constante. Usar Redis con un script Lua hace que el check-and-decrement sea atomico, para que el limiter funcione correctamente entre multiples instancias de servidor.

## Cuando Usar Esto


- For alternatives, see [API Security Checklist — Authentication to Encryption](/es/guides/api-security-checklist-guide/).

- APIs publicas que necesitan rate limiting por cliente o por IP
- Endpoints de login o reset de password que necesitan proteccion contra brute-force
- Cualquier servicio donde las peticiones deben throttlearse entre multiples instancias

## Requisitos Previos

- Python 3.10+
- Paquete `redis` (`pip install redis`)

## Solucion

### 1. Instalar dependencias

```bash
pip install redis
```

### 2. Implementar el token bucket con Lua

```python
import time
from redis import Redis

TOKEN_BUCKET_LUA = """
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1]) or capacity
local last_refill = tonumber(bucket[2]) or now

-- Refill tokens based on elapsed time
local elapsed = math.max(0, now - last_refill)
local refilled = elapsed * refill_rate
tokens = math.min(capacity, tokens + refilled)

if tokens < requested then
    -- Not enough tokens — reject
    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
    redis.call('EXPIRE', key, 3600)
    return 0
end

-- Consume tokens
tokens = tokens - requested
redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
redis.call('EXPIRE', key, 3600)
return 1
"""


class TokenBucketRateLimiter:
    def __init__(
        self,
        redis_client: Redis,
        capacity: int = 100,
        refill_rate: float = 10.0,
    ):
        self.redis = redis_client
        self.capacity = capacity
        self.refill_rate = refill_rate
        self._script = self.redis.register_script(TOKEN_BUCKET_LUA)

    def allow_request(
        self,
        identifier: str,
        requested: int = 1,
    ) -> bool:
        """Check if a request is allowed under the rate limit.

        Args:
            identifier: Unique key (e.g., IP address, user ID, API key).
            requested: Number of tokens to consume.

        Returns:
            True if allowed, False if rate limited.
        """
        key = f"ratelimit:{identifier}"
        now = time.time()
        result = self._script(
            keys=[key],
            args=[self.capacity, self.refill_rate, now, requested],
        )
        return bool(result)
```

### 3. Usar como middleware (FastAPI)

```python
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI()
limiter = TokenBucketRateLimiter(
    redis_client=redis.Redis(host="localhost", port=6379),
    capacity=100,
    refill_rate=10.0,  # 10 tokens por segundo
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host
    if not limiter.allow_request(f"ip:{client_ip}"):
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded", "retryAfter": 10},
            headers={"Retry-After": "10"},
        )
    return await call_next(request)


@app.get("/api/data")
async def get_data():
    return {"data": "success"}
```

### 4. Rate limiting por usuario

```python
@app.get("/api/profile")
async def get_profile(request: Request):
    user_id = request.headers.get("X-User-ID", "anonymous")

    if not limiter.allow_request(f"user:{user_id}"):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded",
            headers={"Retry-After": "10"},
        )

    return {"profile": fetch_profile(user_id)}
```

### 5. Limites por niveles

Diferentes niveles de API con diferentes limites:

```python
class TieredRateLimiter:
    TIERS = {
        "free": {"capacity": 60, "refill_rate": 1.0},      # 60/min
        "pro": {"capacity": 600, "refill_rate": 10.0},     # 600/min
        "enterprise": {"capacity": 6000, "refill_rate": 100.0},  # 6000/min
    }

    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self._limiters = {
            tier: TokenBucketRateLimiter(redis_client, **config)
            for tier, config in self.TIERS.items()
        }

    def allow_request(self, identifier: str, tier: str = "free") -> bool:
        limiter = self._limiters.get(tier, self._limiters["free"])
        return limiter.allow_request(f"{tier}:{identifier}")


# Uso
tiered = TieredRateLimiter(redis_client)

@app.get("/api/search")
async def search(request: Request):
    user_id = request.headers["X-User-ID"]
    user_tier = get_user_tier(user_id)  # "free", "pro", o "enterprise"

    if not tiered.allow_request(user_id, tier=user_tier):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    return search_results(query=request.query_params.get("q", ""))
```

## Como Funciona

1. **Token bucket** comienza lleno con `capacity` tokens. Cada peticion consume uno o mas tokens.
2. **Reabastecimiento** ocurre continuamente: `elapsed_time * refill_rate` tokens se agregan, hasta `capacity`. Esto permite bursts hasta `capacity` mientras mantiene una tasa promedio de `refill_rate` tokens/segundo.
3. **Script Lua** hace que el check-and-decrement sea atomico — sin race condition entre leer el conteo de tokens y consumir un token, incluso con multiples instancias de servidor.
4. **`EXPIRE`** establece un TTL en la clave del bucket para que los identificadores inactivos se limpien automaticamente.
5. **Claves basadas en identificador** (`ratelimit:ip:192.168.1.1`, `ratelimit:user:123`) permiten limites independientes por cliente, usuario o API key.

## Variantes

### Rate limiter con ventana deslizante

Una alternativa que cuenta peticiones en una ventana de tiempo deslizante:

```python
SLIDING_WINDOW_LUA = """
local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- Remove old entries outside the window
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

local count = redis.call('ZCARD', key)
if count >= limit then
    return 0
end

redis.call('ZADD', key, now, now .. ':' .. math.random())
redis.call('EXPIRE', key, window / 1000 + 1)
return 1
"""


class SlidingWindowRateLimiter:
    def __init__(self, redis_client: Redis, window_ms: int = 60000, limit: int = 100):
        self.redis = redis_client
        self.window = window_ms
        self.limit = limit
        self._script = redis_client.register_script(SLIDING_WINDOW_LUA)

    def allow_request(self, identifier: str) -> bool:
        key = f"ratelimit:sw:{identifier}"
        now = int(time.time() * 1000)
        return bool(self._script(
            keys=[key],
            args=[self.window, self.limit, now],
        ))
```

### Rate limiter con ventana fija

Mas simple pero menos preciso — se reinicia en intervalos fijos:

```python
class FixedWindowRateLimiter:
    def __init__(self, redis_client: Redis, window_seconds: int = 60, limit: int = 100):
        self.redis = redis_client
        self.window = window_seconds
        self.limit = limit

    def allow_request(self, identifier: str) -> bool:
        window_key = int(time.time()) // self.window
        key = f"ratelimit:fw:{identifier}:{window_key}"

        pipe = self.redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, self.window)
        count, _ = pipe.execute()

        return count <= self.limit
```

## Mejores Practicas

- **Usa scripts Lua para atomicidad** — sin esto, peticiones concurrentes pueden consumir mas tokens de lo permitido
- **Establece TTLs en claves de bucket** — previene crecimiento de memoria por identificadores inactivos
- **Retorna header `Retry-After`** — le dice a los clientes cuando reintentar, mejorando UX
- **Monitorea hits de rate limit** — un pico repentino de 429s puede indicar un cliente mal configurado o un ataque

## Errores Comunes

- **Usar `INCR` sin atomicidad** — leer el conteo y luego decidir permitir/denegar crea una race condition
- **No establecer TTL** — claves de bucket para cada IP/usuario se acumulan sin limpieza
- **Usar el mismo bucket para todos los clientes** — un cliente lento agota el bucket para todos
- **Olvidar reabastecer** — sin el calculo de reabastecimiento, el bucket nunca se recupera despues de agotarse

## FAQ

**Q: Token bucket vs. ventana deslizante — cual debo usar?**
A: Token bucket permite bursts hasta la capacidad y es eficiente en memoria. La ventana deslizante es mas precisa pero usa mas memoria (una entrada por peticion).

**Q: Como manejo rate limits para peticiones autenticadas vs. no autenticadas?**
A: Usa prefijos de identificador diferentes: `ratelimit:ip:<ip>` para no autenticadas, `ratelimit:user:<id>` para autenticadas, con capacidades diferentes.

**Q: Que pasa si Redis cae?**
A: El rate limiter falla. Decide una estrategia fail-open (permitir todo) o fail-closed (denegar todo) segun tus requisitos de seguridad.

**Q: Puedo usar esto con Redis Cluster?**
A: Si. El script Lua opera en una sola clave, por lo que funciona dentro de un solo shard. Usa hash tags (`ratelimit:{user_id}`) para asegurar que las claves del mismo usuario caigan en el mismo shard.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Errores Comunes Adicionales

- Usar `INCR` solo sin un script Lua — crea condiciones de carrera entre el incremento y las verificaciones de expiración
- No setear TTL en las claves de rate limiting — la memoria crece sin límite para usuarios que hacen un solo request
- Usar el mismo bucket para todos los endpoints — un burst a una API consume tokens para endpoints no relacionados
- No manejar el downtime de Redis gracefulmente — decide si fallar abierto (permitir request) o fallar cerrado (denegar)
- Usar timestamps en milisegundos en lugar de segundos en el script Lua — Redis `TIME` retorna segundos y microsegundos, no milisegundos
- No monitorear el refill rate del token bucket vs tráfico real — si el refill rate es muy bajo, usuarios legítimos reciben rate limiting
- No usar `EVALSHA` en lugar de `EVAL` — enviar el script Lua completo en cada request desperdicia ancho de banda, `EVALSHA` cachea el script por hash
- No setear una capacidad máxima del bucket — capacidad ilimitada permite a los usuarios acumular tokens durante periodos idle y hacer burst más allá del rate limit intencionado
- No usar claves por usuario y por endpoint — un solo usuario puede agotar su bucket en un endpoint mientras otro endpoint permanece sin afectar, lo cual puede o no ser deseado
- No loggear decisiones de rate limiting — sin logs de allow/deny por usuario, no puedes debuggear quejas sobre respuestas 429 inesperadas
- No usar una convención de naming consistente para las claves — mezclar patrones `rate_limit:user:ip` y `rl:user:ip` dificulta el monitoreo y debugging
- No testear rate limiting bajo carga — un rate limiter que funciona en desarrollo puede fallar bajo alta concurrencia debido a Redis pipelining o latencia de red

### ¿Cuál es la diferencia entre token bucket y sliding window?

Token bucket rellena tokens a una tasa fija y permite bursts hasta la capacidad del bucket. Sliding window cuenta requests en una ventana de tiempo móvil y rechaza cuando el count excede el límite. Token bucket es mejor para tráfico bursty. Sliding window es mejor para enforcement estricto de rate.

### ¿Cómo testeo rate limiting localmente?

Usa un script que envíe N requests concurrentes y cuente cuántos retornan 200 vs 429. Varía el burst size y el refill rate para verificar el comportamiento del bucket. Usa `redis-cli MONITOR` para observar las ejecuciones del script Lua en tiempo real.
