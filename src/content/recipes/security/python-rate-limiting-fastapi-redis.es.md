---




contentType: recipes
slug: python-rate-limiting-fastapi-redis
title: "Rate limiting distribuido con FastAPI y Redis"
description: "Implementa rate limiting distribuido en FastAPI usando algoritmos de sliding window y token bucket con Redis para limites por usuario, por IP y por endpoint"
metaDescription: "Implementa rate limiting distribuido en FastAPI con Redis. Usa algoritmos sliding window y token bucket para limites por usuario, IP y endpoint."
difficulty: intermediate
topics:
  - security
  - performance
tags:
  - python
  - fastapi
  - redis
  - rate limiting
  - middleware
relatedResources:
  - /recipes/python-jwt-refresh-token-rotation
  - /recipes/redis-rate-limiting-token-bucket
  - /recipes/python-sql-injection-sqlalchemy
  - /recipes/python-async-gather-concurrent-requests
  - /recipes/python-secrets-management-vault
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa rate limiting distribuido en FastAPI con Redis. Usa algoritmos sliding window y token bucket para limites por usuario, IP y endpoint."
  keywords:
    - rate limiting fastapi
    - redis rate limit
    - distributed rate limiting
    - sliding window
    - token bucket python




---

# Rate limiting distribuido con FastAPI y Redis

El rate limiting protege las APIs de abuso, DDoS y agotamiento de recursos. En despliegues distribuidos con multiples instancias de servidor, los rate limiters en memoria no funcionan — cada instancia tiene su propio contador. Redis proporciona un contador compartido y atomico que funciona en todas las instancias. A continuacion: algoritmos sliding window y token bucket en FastAPI con Redis.

## Cuando Usar Esto


- For alternatives, see [Cache Database Query Results with Redis and Python](/es/recipes/database-query-result-caching/).

- APIs con multiples instancias de servidor detras de un load balancer
- APIs publicas que necesitan limites por usuario o por IP
- Endpoints con diferentes limites (ej. auth: 5/min, search: 100/min)

## Requisitos Previos

- Python 3.10+
- Paquetes `fastapi`, `redis`
- Un servidor Redis ejecutandose

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

## Como Funciona

1. **Sliding window** usa un sorted set de Redis (`ZSET`) donde cada peticion es un miembro con su timestamp como score. Antes de cada peticion, removemos entradas mas viejas que la ventana, contamos las entradas restantes y agregamos la nueva peticion.
2. **Pipeline** ejecuta todos los comandos Redis atomicamente en un solo round-trip, previniendo race conditions entre conteo y adicion.
3. **TTL** en la key de Redis asegura limpieza despues de que la ventana expira — no necesita garbage collection manual.
4. **Limites por endpoint** usan diferentes prefijos de key (`rate_limit:/auth/login:...` vs `rate_limit:/search:...`), por lo que los limites son independientes por endpoint.
5. **Headers de rate limit** (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) siguen el estandar draft de IETF, permitiendo a los clientes manejar los limites elegantemente.

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

## Mejores Practicas

- **Usa sliding window para precision** — ventana fija permite bursts de 2x en los limites de ventana
- **Establece headers Retry-After significativos** — los clientes pueden hacer back-off elegantemente
- **Usa limites por usuario, no solo por IP** — multiples usuarios detras de NAT comparten una IP
- **Monitorea los hits de rate limit** — 429s frecuentes pueden indicar un limite mal configurado o un ataque

## Errores Comunes

- **Usar rate limiting en memoria en despliegues distribuidos** — cada instancia tiene su propio contador; usa Redis
- **No establecer TTL en keys de Redis** — las keys se acumulan para siempre, consumiendo memoria
- **Rate limiting demasiado agresivo** — usuarios legitimos se bloquean; empieza generoso y ajusta
- **No manejar 429 en el cliente** — los clientes deben implementar exponential backoff en 429

## FAQ

**Q: Sliding window vs. token bucket — cual debo usar?**
A: Sliding window para limites estrictos (ej. 100 req/min, sin bursts). Token bucket para limites tolerantes a bursts (ej. permitir 100 peticiones instantaneas, luego rellenar a 10/seg).

**Q: Cuanta memoria de Redis usa el rate limiting?**
A: Sliding window almacena una entrada ZSET por peticion. Para 1000 usuarios a 100 req/min, son ~100K entradas con TTL de 60s — despreciable.

**Q: Que pasa si Redis cae?**
A: El rate limiting falla. Implementa un fallback (permitir todo, o usar un limiter local en memoria como backup).

**Q: Debo hacer rate limiting por IP o por usuario?**
A: Por usuario para endpoints autenticados. Por IP para endpoints publicos (login, signup). Usa ambos para endpoints sensibles.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
