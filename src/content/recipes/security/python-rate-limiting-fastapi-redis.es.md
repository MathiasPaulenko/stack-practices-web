---
contentType: recipes
slug: python-rate-limiting-fastapi-redis
title: "Rate limiting distribuido con FastAPI y Redis"
description: "Implementa rate limiting distribuido en FastAPI usando algoritmos de sliding window y token bucket con Redis para límites por usuario, IP y endpoint."
metaDescription: "Implementa rate limiting distribuido en FastAPI con Redis. Usa algoritmos sliding window y token bucket para límites por usuario, IP y endpoint."
difficulty: intermediate
topics:
  - security
  - performance
tags:
  - python
  - fastapi
  - redis
  - rate-limiting
  - middleware
relatedResources:
  - /recipes/python-jwt-refresh-token-rotation
  - /recipes/redis-rate-limiting-token-bucket
  - /recipes/python-sql-injection-sqlalchemy
  - /recipes/python-async-gather-concurrent-requests
  - /recipes/python-secrets-management-vault
  - /recipes/request-signing-hmac
lastUpdated: "2026-08-22"
publishedAt: "2026-07-03"
author: Mathias Paulenko
seo:
  metaDescription: "Implementa rate limiting distribuido en FastAPI con Redis. Usa algoritmos sliding window y token bucket para límites por usuario, IP y endpoint."
  keywords:
    - rate limiting fastapi
    - redis rate limit
    - distributed rate limiting
    - sliding window
    - token bucket python
---

El rate limiting evita que una API sea abusada, saturada o agotada por demasiadas peticiones. Si ejecutás varias
instancias de servidor detras de un load balancer, un rate limiter en memoria no sirve porque cada instancia tiene su
propio contador. Redis lo soluciona dándole a todas las instancias un contador compartido y atomico. Esta receta cubre
rate limiting con sliding window y token bucket en FastAPI usando Redis.

## Cuándo Usar

Usá esta configuración cuando tu API corra en varias instancias de servidor detras de un load balancer, cuando
necesites límites por usuario o por IP en endpoints públicos, o cuando distintos endpoints necesiten distintos
límites (por ejemplo, `auth: 5/min` y `search: 100/min`).

## Requisitos Previos

Necesitás Python 3.10 o superior, los paquetes `fastapi` y `redis` instalados, y un servidor Redis corriendo.

## Solucion

### 1. Instalar dependencias

```bash
pip install fastapi redis
```

### 2. Rate limiter sliding window

```python
import time
import redis
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI()
redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

class SlidingWindowRateLimiter:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def is_allowed(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
    ) -> tuple[bool, dict]:
        """Check if a request is allowed using sliding window algorithm.

        Args:
            key: Unique identifier (user_id, IP, etc.).
            max_requests: Maximum requests in the window.
            window_seconds: Window size in seconds.

        Returns:
            Tuple of (allowed, info_dict with remaining, reset_at).
        """
        now = time.time()
        window_start = now - window_seconds

        pipe = self.redis.pipeline()
        # Remover entradas viejas fuera de la ventana
        pipe.zremrangebyscore(key, 0, window_start)
        # Contar entradas actuales en la ventana
        pipe.zcard(key)
        # Agregar peticion actual
        pipe.zadd(key, {str(now): now})
        # Establecer TTL en la key
        pipe.expire(key, window_seconds)
        results = pipe.execute()

        current_count = results[1]
        allowed = current_count < max_requests
        remaining = max(0, max_requests - current_count - 1)

        return allowed, {
            "limit": max_requests,
            "remaining": remaining,
            "reset_at": int(now + window_seconds),
        }

rate_limiter = SlidingWindowRateLimiter(redis_client)
```

### 3. Middleware de FastAPI

```python
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        rate_limiter: SlidingWindowRateLimiter,
        max_requests: int = 100,
        window_seconds: int = 60,
    ):
        super().__init__(app)
        self.rate_limiter = rate_limiter
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    async def dispatch(self, request: Request, call_next: Callable):
        # Obtener identificador — IP o user ID del token
        client_ip = request.client.host if request.client else "unknown"
        key = f"rate_limit:{client_ip}"

        allowed, info = self.rate_limiter.is_allowed(
            key, self.max_requests, self.window_seconds
        )

        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "limit": info["limit"],
                    "remaining": info["remaining"],
                    "reset_at": info["reset_at"],
                },
                headers={
                    "Retry-After": str(self.window_seconds),
                    "X-RateLimit-Limit": str(info["limit"]),
                    "X-RateLimit-Remaining": str(info["remaining"]),
                    "X-RateLimit-Reset": str(info["reset_at"]),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(info["limit"])
        response.headers["X-RateLimit-Remaining"] = str(info["remaining"])
        response.headers["X-RateLimit-Reset"] = str(info["reset_at"])
        return response

app.add_middleware(
    RateLimitMiddleware,
    rate_limiter=rate_limiter,
    max_requests=100,
    window_seconds=60,
)
```

### 4. Limites por endpoint con decorador

```python
from functools import wraps
from fastapi import Depends, HTTPException, Request

def rate_limit(max_requests: int, window_seconds: int, key_func=None):
    """Decorator for per-endpoint rate limiting.

    Args:
        max_requests: Maximum requests in the window.
        window_seconds: Window size in seconds.
        key_func: Function to extract the rate limit key from the request.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = kwargs.get("request")
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

            if key_func:
                key = key_func(request)
            else:
                key = f"rate_limit:{request.url.path}:{request.client.host}"

            allowed, info = rate_limiter.is_allowed(
                key, max_requests, window_seconds
            )

            if not allowed:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "Rate limit exceeded",
                        "limit": info["limit"],
                        "remaining": info["remaining"],
                        "reset_at": info["reset_at"],
                    },
                    headers={
                        "Retry-After": str(window_seconds),
                        "X-RateLimit-Limit": str(info["limit"]),
                        "X-RateLimit-Remaining": str(info["remaining"]),
                    },
                )

            return await func(*args, **kwargs)
        return wrapper
    return decorator

@app.post("/auth/login")
@rate_limit(max_requests=5, window_seconds=60)
async def login(request: Request):
    return {"message": "Login endpoint with strict rate limit"}

@app.get("/search")
@rate_limit(max_requests=100, window_seconds=60)
async def search(request: Request):
    return {"message": "Search endpoint with standard rate limit"}
```

### 5. Rate limiting por usuario

```python
def get_user_key(request: Request) -> str:
    """Extract user ID from JWT for per-user rate limiting."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        # Decodificar JWT para obtener user_id (simplificado)
        import jwt
        token = auth.split(" ")[1]
        try:
            payload = jwt.decode(token, "secret", algorithms=["HS256"])
            return f"rate_limit:user:{payload['sub']}"
        except jwt.InvalidTokenError:
            pass
    return f"rate_limit:ip:{request.client.host}"

@app.get("/api/data")
@rate_limit(max_requests=200, window_seconds=60, key_func=get_user_key)
async def get_data(request: Request):
    return {"data": "Per-user rate limited endpoint"}
```

## Explicación

El enfoque de sliding window guarda cada petición como miembro de un sorted set de Redis (`ZSET`), usando el timestamp
de la petición como score. Antes de permitir una petición, elimina las entradas más viejas que la ventana actual,
cuenta las restantes y agrega la nueva.

El pipeline de Redis ejecuta todos esos comandos en un solo round-trip, así el conteo y la adición son atómicos y
evitan race conditions. Un TTL en la key hace que expire automáticamente después de la ventana, así no hay que hacer
limpieza manual.

Los límites por endpoint funcionan usando distintos prefijos de key, como `rate_limit:/auth/login:...` y
`rate_limit:/search:...`, lo que mantiene el contador de cada endpoint independiente.

Los headers `X-RateLimit-Limit`, `X-RateLimit-Remaining` y `X-RateLimit-Reset` siguen el estándar draft de la IETF, así
los clientes pueden leerlos y hacer back off antes de alcanzar el límite.

## Variantes

### Algoritmo token bucket

```python
class TokenBucketRateLimiter:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def is_allowed(
        self,
        key: str,
        capacity: int,
        refill_rate: float,
    ) -> tuple[bool, dict]:
        """Token bucket algorithm — allows bursts up to capacity.

        Args:
            key: Unique identifier.
            capacity: Maximum tokens in the bucket.
            refill_rate: Tokens added per second.

        Returns:
            Tuple of (allowed, info_dict).
        """
        now = time.time()
        bucket_key = f"token_bucket:{key}"

        # Script Lua para check-and-decrement atomico
        lua_script = """
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])

        local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
        local tokens = tonumber(bucket[1]) or capacity
        local last_refill = tonumber(bucket[2]) or now

        -- Rellenar tokens
        local elapsed = math.max(0, now - last_refill)
        tokens = math.min(capacity, tokens + elapsed * refill_rate)

        local allowed = 0
        if tokens >= 1 then
            tokens = tokens - 1
            allowed = 1
        end

        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
        redis.call('EXPIRE', key, math.ceil(capacity / refill_rate))

        return {allowed, math.floor(tokens)}
        """

        result = self.redis.eval(
            lua_script, 1, bucket_key,
            capacity, refill_rate, now,
        )

        return bool(result[0]), {
            "limit": capacity,
            "remaining": int(result[1]),
        }

token_limiter = TokenBucketRateLimiter(redis_client)
```

### Contador de ventana fija

```python
class FixedWindowRateLimiter:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def is_allowed(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
    ) -> tuple[bool, dict]:
        """Fixed window — simpler but allows bursts at window boundary."""
        now = int(time.time())
        window = now - (now % window_seconds)
        window_key = f"fixed_window:{key}:{window}"

        pipe = self.redis.pipeline()
        pipe.incr(window_key)
        pipe.expire(window_key, window_seconds)
        results = pipe.execute()

        count = results[0]
        allowed = count <= max_requests
        remaining = max(0, max_requests - count)

        return allowed, {
            "limit": max_requests,
            "remaining": remaining,
            "reset_at": window + window_seconds,
        }
```

### Limites por niveles

```python
def tiered_rate_limit(user_tier: str = "free"):
    """Apply different rate limits based on user tier."""
    limits = {
        "free": (100, 60),      # 100 req/min
        "pro": (1000, 60),      # 1000 req/min
        "enterprise": (10000, 60),  # 10000 req/min
    }
    max_requests, window = limits.get(user_tier, limits["free"])
    return rate_limit(max_requests=max_requests, window_seconds=window)

@app.get("/api/expensive")
@tiered_rate_limit(user_tier="pro")
async def expensive_operation(request: Request):
    return {"data": "Tiered rate limited endpoint"}
```

## Buenas Prácticas

Usá sliding window cuando la precisión importe, porque la ventana fija puede permitir bursts dobles justo en los
límites de la ventana. Establecé un header `Retry-After` con sentido para que los clientes sepan cuánto esperar.

Limitá por usuario cuando lo conozcas, no solo por IP. Varios usuarios detras de un NAT o proxy pueden compartir la
misma IP. Monitoreá con qué frecuencia tus endpoints retornan `429`; un pico repentino puede significar un límite mal
configurado o un ataque.

Para una guía más profunda, consultá [Cache Database Query Results with Redis and Python](/es/recipes/database-query-result-caching/).

## Errores Comunes

Usar rate limiters en memoria en despliegues distribuidos es un error común porque cada instancia termina con su
propio contador. Usá Redis en su lugar. Olvidar el TTL en las keys de Redis es otro error; sin TTL, las keys se
acumulan indefinidamente y consumen memoria.

Poner límites demasiado agresivos puede bloquear usuarios legítimos, así que empezá generoso y ajustá con datos reales.
Finalmente, no manejar respuestas `429` en los clientes hace que pierdas la oportunidad de hacer back off con lógica de
reintento exponencial.

## Preguntas Frecuentes

### ¿Sliding window o token bucket?

Usá sliding window para límites estrictos, como `100 req/min` sin bursts. Usá token bucket cuando querés permitir un
burst corto y luego rellenar de forma constante, como `100` peticiones instantáneas y después `10` por segundo.

### ¿Cuánta memoria de Redis usa el rate limiting?

Sliding window guarda una entrada ZSET por petición. Para `1000` usuarios a `100` req/min, son unas `100 000` entradas
con TTL de `60` segundos — despreciable.

### ¿Qué pasa si Redis cae?

El rate limiting deja de funcionar. Decidí de antemano si fallar abierto (permitir todo) o cerrado (rechazar todo). Un
limiter local en memoria puede servir como respaldo temporal.

### ¿Debería limitar por IP o por usuario?

Usá el ID de usuario para endpoints autenticados. Usá IP para endpoints públicos como login o signup. Para endpoints
sensibles, combiná ambos.

### ¿Esta solución está lista para producción?

Los ejemplos están probados y funcionan, pero deberías adaptar el manejo de errores, la configuración y el fallback a tu
entorno antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende del volumen de peticiones y la infraestructura. Los ejemplos priorizan claridad. Para alto
throughput, agregá connection pooling, pipelining en Redis y caching donde tenga sentido.

### ¿Cómo depuro problemas con este enfoque?

Empezá con el ejemplo mínimo y agregá logging en cada paso. Probá con pocas peticiones primero, luego escalá. Usá el
debugger de tu lenguaje para recorrer los edge cases.
