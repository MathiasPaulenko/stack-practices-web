---
contentType: recipes
slug: python-api-rate-limiting
title: "Rate Limiting de API en Python con Token Bucket"
description: "Implementa token bucket rate limiting en Flask y FastAPI con soporte Redis."
metaDescription: "Implementa token bucket rate limiting en Python Flask y FastAPI. Incluye l\u00edmites distribuidos con Redis, sliding window y patrones de middleware."
difficulty: intermediate
topics:
  - api
tags:
  - python
  - flask
  - fastapi
  - rate-limiting
  - token-bucket
  - redis
  - middleware
relatedResources:
  - /recipes/api-rate-limiting
  - /recipes/api-rate-limiting-redis
  - /recipes/nodejs-caching-redis
  - /docs/endpoint-security-checklist-template
  - /guides/rest-api-design-guide
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Implementa token bucket rate limiting en Python Flask y FastAPI. Incluye l\u00edmites distribuidos con Redis, sliding window y patrones de middleware."
  keywords:
    - python rate limiting flask
    - fastapi rate limit
    - token bucket python
    - redis rate limiter python
    - sliding window python
    - api throttling flask
---

## Visión General

Rate limiting protege las APIs de abuso, previene ataques DoS y asegura una asignación justa de recursos. El algoritmo token bucket es uno de los enfoques más comunes: permite ráfagas de tráfico manteniendo una tasa promedio estable. Esta recipe cubre implementar token bucket rate limiting en Flask y FastAPI, con variantes in-memory y distribuidas con Redis.

## Cuándo Usar

- Estás construyendo una API pública y necesitas prevenir abuso
- Tienes diferentes tiers de pricing con diferentes rate limits
- Necesitas rate limiting distribuido across múltiples instancias de servidor
- Quieres throttlear endpoints específicos de forma diferente

## Solución

### Token bucket con Flask (in-memory)

```python
import time
from collections import defaultdict
from functools import wraps
from flask import Flask, request, jsonify

app = Flask(__name__)

class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = capacity
        self.last_refill = time.monotonic()

    def consume(self, tokens: int = 1) -> bool:
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False


buckets: dict[str, TokenBucket] = defaultdict(lambda: TokenBucket(capacity=10, refill_rate=1.0))

def rate_limit(capacity: int = 10, refill_rate: float = 1.0):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            client_ip = request.remote_addr
            bucket = buckets[client_ip]

            if not bucket.consume():
                return jsonify({
                    "error": "Rate limit exceeded",
                    "retry_after": round(bucket.capacity / bucket.refill_rate, 1)
                }), 429

            return func(*args, **kwargs)
        return wrapper
    return decorator

@app.route("/api/data")
@rate_limit(capacity=10, refill_rate=1.0)
def get_data():
    return jsonify({"data": "success"})

if __name__ == "__main__":
    app.run(debug=True)
```

### Token bucket con FastAPI (in-memory)

```python
import time
from collections import defaultdict
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI()

class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = capacity
        self.last_refill = time.monotonic()

    def consume(self, tokens: int = 1) -> bool:
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False


buckets: dict[str, TokenBucket] = {}

def get_bucket(key: str, capacity: int, refill_rate: float) -> TokenBucket:
    if key not in buckets:
        buckets[key] = TokenBucket(capacity, refill_rate)
    return buckets[key]

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        client_ip = request.client.host
        bucket = get_bucket(client_ip, capacity=100, refill_rate=10.0)

        if not bucket.consume():
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "retry_after": round(bucket.capacity / bucket.refill_rate, 1)
                }
            )

    return await call_next(request)

@app.get("/api/data")
async def get_data():
    return {"data": "success"}
```

### Rate limiting distribuido con Redis

```python
import time
import redis
from functools import wraps
from flask import Flask, request, jsonify

app = Flask(__name__)
r = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

def redis_token_bucket(key: str, capacity: int, refill_rate: float) -> bool:
    lua_script = """
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        local requested = tonumber(ARGV[4])

        local bucket = redis.call("HMGET", key, "tokens", "last_refill")
        local tokens = tonumber(bucket[1])
        local last_refill = tonumber(bucket[2])

        if tokens == nil then
            tokens = capacity
            last_refill = now
        end

        local elapsed = now - last_refill
        tokens = math.min(capacity, tokens + elapsed * refill_rate)

        if tokens >= requested then
            tokens = tokens - requested
            redis.call("HMSET", key, "tokens", tokens, "last_refill", now)
            redis.call("EXPIRE", key, math.ceil(capacity / refill_rate))
            return 1
        else
            redis.call("HMSET", key, "tokens", tokens, "last_refill", now)
            redis.call("EXPIRE", key, math.ceil(capacity / refill_rate))
            return 0
        end
    """

    now = time.time()
    result = r.eval(lua_script, 1, key, capacity, refill_rate, now, 1)
    return bool(result)

def rate_limit(capacity: int = 10, refill_rate: float = 1.0):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            client_ip = request.remote_addr
            key = f"rate_limit:{func.__name__}:{client_ip}"

            if not redis_token_bucket(key, capacity, refill_rate):
                return jsonify({
                    "error": "Rate limit exceeded",
                    "retry_after": round(capacity / refill_rate, 1)
                }), 429

            return func(*args, **kwargs)
        return wrapper
    return decorator

@app.route("/api/expensive")
@rate_limit(capacity=5, refill_rate=0.5)
def expensive_operation():
    return jsonify({"result": "computed"})
```

### Sliding window rate limiter con FastAPI

```python
import time
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import redis

app = FastAPI()
r = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

def sliding_window_limit(key: str, limit: int, window: int) -> bool:
    lua_script = """
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])

        redis.call("ZREMRANGEBYSCORE", key, 0, now - window)
        local count = redis.call("ZCARD", key)

        if count < limit then
            redis.call("ZADD", key, now, now .. "-" .. math.random())
            redis.call("EXPIRE", key, window)
            return 1
        else
            return 0
        end
    """

    now = time.time()
    result = r.eval(lua_script, 1, key, limit, window, now)
    return bool(result)

@app.middleware("http")
async def sliding_window_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        client_ip = request.client.host
        key = f"sliding_window:{client_ip}"

        if not sliding_window_limit(key, limit=60, window=60):
            return JSONResponse(
                status_code=429,
                content={"error": "Too many requests", "window": "60 seconds", "limit": 60}
            )

    return await call_next(request)
```

### Rate limits por endpoint con dependencia de FastAPI

```python
from fastapi import FastAPI, Depends, HTTPException, Request
import time

app = FastAPI()

class RateLimiter:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self._buckets: dict[str, tuple[float, float]] = {}

    def check(self, key: str) -> None:
        now = time.monotonic()
        if key in self._buckets:
            tokens, last_refill = self._buckets[key]
            elapsed = now - last_refill
            tokens = min(self.capacity, tokens + elapsed * self.refill_rate)
        else:
            tokens = self.capacity

        if tokens < 1:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Capacity: {self.capacity}, refill: {self.refill_rate}/s"
            )

        self._buckets[key] = (tokens - 1, now)

def create_limiter(capacity: int, refill_rate: float):
    limiter = RateLimiter(capacity, refill_rate)
    def dependency(request: Request):
        limiter.check(request.client.host)
    return Depends(dependency)

@app.get("/api/free")
async def free_endpoint():
    return {"message": "no rate limit"}

@app.get("/api/limited", dependencies=[create_limiter(capacity=10, refill_rate=1.0)])
async def limited_endpoint():
    return {"message": "rate limited"}

@app.get("/api/strict", dependencies=[create_limiter(capacity=3, refill_rate=0.5)])
async def strict_endpoint():
    return {"message": "strictly limited"}
```

## Explicación

El algoritmo token bucket funciona manteniendo un bucket de tokens que se rellena a una tasa constante. Cada petición consume un token. Si el bucket está vacío, la petición se rechaza.

Conceptos clave:

- **Capacity**: Tamaño máximo de ráfaga. Un bucket con capacity 10 permite 10 peticiones en sucesión rápida.
- **Refill rate**: Tokens agregados por segundo. Un refill rate de 1.0 significa 1 token por segundo.
- **Distributed**: Las implementaciones con Redis usan scripts Lua para atomicidad. El script lee, actualiza y escribe en una sola operación de Redis, previniendo race conditions.
- **Sliding window**: En vez de ventanas fijas, el sliding window trackea timestamps individuales de peticiones en un sorted set. Cuenta peticiones dentro de los últimos N segundos, proveyendo límites más suaves.

El script Lua en la variante de Redis es crucial: sin ejecución atómica, peticiones concurrentes podrían leer el mismo conteo de tokens y todas pasar el check de límite.

## Variantes

| Enfoque | Algoritmo | Storage | Usar Cuando |
|---------|-----------|---------|-------------|
| In-memory | Token bucket | Memoria del proceso | Instancia única, bajo tráfico |
| Redis | Token bucket | Redis | Múltiples instancias, distribuido |
| Redis | Sliding window | Redis sorted set | Límites estrictos por segundo |
| Redis | Fixed window | Redis INCR | Límites simples, aproximados |
| Database | Token bucket | SQL/Postgres | Cuando Redis no está disponible |

## Pautas

- Usa límites con Redis en producción. Los límites in-memory no funcionan across múltiples instancias.
- Retorna `429 Too Many Requests` con header `Retry-After`.
- Setea diferentes límites para diferentes endpoints según el costo.
- Usa API keys o user IDs como key del bucket, no solo IP addresses.
- Monitorea los hits de rate limit. Un pico repentino puede indicar un cliente mal configurado o un ataque.
- Setea `EXPIRE` en las keys de Redis para prevenir crecimiento de memoria por clientes inactivos.

## Errores Comunes

- Usar IP address como única key. Múltiples usuarios detrás de un NAT comparten una IP y alcanzan límites injustamente.
- No usar operaciones atómicas en Redis. Peticiones concurrentes pueden racear y bypassar el límite.
- Setear capacity muy bajo. Usuarios legítimos se bloquean durante ráfagas de uso normal.
- No retornar `Retry-After`. Los clientes no pueden implementar backoff sin él.
- Olvidar limpiar keys de Redis. Las keys de clientes inactivos se acumulan y consumen memoria.

## Preguntas Frecuentes

### ¿Cómo testeo rate limiting localmente?

Usa un loop con `curl` o `httpie`:

```bash
for i in $(seq 1 20); do
    curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/api/data
done
```

Deberías ver `200` para las primeras 10 peticiones y `429` después.

### ¿Debo usar middleware o decoradores para rate limiting?

Middleware aplica globalmente a todas las rutas. Decoradores (o dependencias de FastAPI) permiten configuración por endpoint. Usa middleware para un default global y decoradores para overrides específicos por endpoint.

### ¿Cómo manejo rate limits para usuarios autenticados vs anónimos?

Usa diferentes keys de bucket:

```python
def get_key(request):
    user_id = get_user_id(request)  # tu lógica de auth
    if user_id:
        return f"user:{user_id}"
    return f"ip:{request.remote_addr}"
```

Los usuarios autenticados obtienen límites más altos usando un parámetro de capacity diferente.

### ¿Cuál es la diferencia entre token bucket y leaky bucket?

Token bucket permite ráfagas hasta el capacity. Leaky bucket suaviza el tráfico procesando a una tasa fija independientemente del tamaño de la ráfaga entrante. Token bucket es más común para APIs porque maneja mejor las ráfagas legítimas.
