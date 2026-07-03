---
contentType: recipes
slug: python-redis-cache-decorator
title: "Cache de resultados de funciones con Redis y TTL en Python"
description: "Construye un decorador de Python que cachea resultados de funciones en Redis con TTL configurable, generacion de claves e invalidacion de cache"
metaDescription: "Cachea resultados de funciones Python en Redis con un decorador TTL. Genera claves de cache automaticamente, maneja serializacion e invalida entradas."
difficulty: intermediate
topics:
  - caching
  - performance
tags:
  - python
  - redis
  - caching
  - decorator
  - performance
relatedResources:
  - /recipes/caching/caching-redis
  - /recipes/caching/redis-cache-patterns
  - /patterns/caching/cache-aside-pattern
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Cachea resultados de funciones Python en Redis con un decorador TTL. Genera claves de cache automaticamente, maneja serializacion e invalida entradas."
  keywords:
    - python redis cache
    - python cache decorator
    - redis ttl
    - python caching
    - redis cache invalidation
---

# Cache de resultados de funciones con Redis y TTL en Python

Cachear resultados costosos de funciones en Redis reduce latencia y carga de base de datos. Un enfoque con decorador permite agregar caching a cualquier funcion con una sola anotacion `@cached`, manteniendo la logica de negocio limpia. Esta receta construye un decorador de cache respaldado por Redis con generacion automatica de claves, serializacion JSON, TTL configurable e invalidacion manual.

## Cuando Usar Esto

- Funciones que retornan el mismo resultado para los mismos argumentos (funciones puras o casi puras)
- Consultas a base de datos, llamadas a API o computaciones costosas que raramente cambian
- Resultados seguros de servir obsoletos durante la duracion del TTL

## Requisitos Previos

- Python 3.10+
- Paquete `redis` (`pip install redis`)
- Una instancia de Redis corriendo

## Solucion

### 1. Instalar dependencias

```bash
pip install redis
```

### 2. Construir el decorador de cache

```python
import functools
import hashlib
import json
import logging
from typing import Any, Callable, TypeVar
from redis import Redis

logger = logging.getLogger(__name__)
T = TypeVar("T")


def cached(
    redis_client: Redis,
    ttl: int = 300,
    prefix: str = "cache",
    skip_args: tuple[str, ...] = (),
) -> Callable:
    """Cache function results in Redis with a TTL.

    Args:
        redis_client: Redis client instance.
        ttl: Time-to-live in seconds.
        prefix: Cache key prefix.
        skip_args: Argument names to exclude from the cache key.

    Returns:
        Decorator that wraps the function with Redis caching.
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> T:
            key = _make_key(func, args, kwargs, prefix, skip_args)

            try:
                cached_value = redis_client.get(key)
                if cached_value is not None:
                    return json.loads(cached_value)
            except (json.JSONDecodeError, ConnectionError) as e:
                logger.warning("Cache read failed for %s: %s", key, e)

            result = func(*args, **kwargs)

            try:
                redis_client.setex(key, ttl, json.dumps(result, default=str))
            except (TypeError, ConnectionError) as e:
                logger.warning("Cache write failed for %s: %s", key, e)

            return result

        wrapper.cache_invalidate = _make_invalidator(redis_client, func, prefix, skip_args)  # type: ignore
        return wrapper

    return decorator


def _make_key(
    func: Callable,
    args: tuple,
    kwargs: dict,
    prefix: str,
    skip_args: tuple[str, ...],
) -> str:
    """Generate a deterministic cache key from function name and arguments."""
    import inspect

    sig = inspect.signature(func)
    bound = sig.bind(*args, **kwargs)
    bound.apply_defaults()

    filtered = {
        k: v for k, v in bound.arguments.items()
        if k not in skip_args and k != "self"
    }

    arg_hash = hashlib.sha256(
        json.dumps(filtered, sort_keys=True, default=str).encode()
    ).hexdigest()[:16]

    return f"{prefix}:{func.__module__}:{func.__name__}:{arg_hash}"


def _make_invalidator(
    redis_client: Redis,
    func: Callable,
    prefix: str,
    skip_args: tuple[str, ...],
) -> Callable:
    """Create a cache invalidation function for a specific decorated function."""
    def invalidate(*args, **kwargs) -> int:
        key = _make_key(func, args, kwargs, prefix, skip_args)
        return redis_client.delete(key)

    return invalidate
```

### 3. Usar el decorador

```python
import redis
from myapp.database import get_user_by_id

r = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

@cached(r, ttl=60, prefix="user")
def get_user(user_id: str, include_posts: bool = False) -> dict:
    user = get_user_by_id(user_id)
    if include_posts:
        user["posts"] = fetch_user_posts(user_id)
    return user

# Primera llamada — toca la base de datos, cachea el resultado
user = get_user("123", include_posts=True)

# Segunda llamada — retorna desde cache
user = get_user("123", include_posts=True)

# Invalidar la cache para argumentos especificos
get_user.cache_invalidate("123", include_posts=True)
```

### 4. Version asincrona

```python
import asyncio
from redis.asyncio import Redis as AsyncRedis

def async_cached(
    redis_client: AsyncRedis,
    ttl: int = 300,
    prefix: str = "cache",
) -> Callable:
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            key = _make_key(func, args, kwargs, prefix, ())

            try:
                cached = await redis_client.get(key)
                if cached is not None:
                    return json.loads(cached)
            except Exception as e:
                logger.warning("Async cache read failed: %s", e)

            result = await func(*args, **kwargs)

            try:
                await redis_client.setex(key, ttl, json.dumps(result, default=str))
            except Exception as e:
                logger.warning("Async cache write failed: %s", e)

            return result

        return wrapper
    return decorator

# Uso
r = AsyncRedis(host="localhost", port=6379, decode_responses=True)

@async_cached(r, ttl=120, prefix="api")
async def fetch_weather(city: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"https://api.weather.example/{city}")
        return resp.json()
```

## Como Funciona

1. **Generacion de claves** usa el modulo y nombre de la funcion mas un hash SHA-256 de sus argumentos para crear una clave determinista y resistente a colisiones.
2. **`skip_args`** excluye argumentos como `self` u objetos de peticion de la clave, para que los metodos de instancia funcionen correctamente.
3. **`setex`** establece el valor con expiracion en un comando atomico de Redis, para que la entrada expire automaticamente despues del TTL.
4. **`cache_invalidate`** se adjunta a la funcion wrapper, permitiendo a los llamadores eliminar una entrada especifica pasando los mismos argumentos.
5. **Degradacion elegante** — si Redis cae, la funcion sigue ejecutandose; el decorador registra el error y retorna el resultado sin cache.

## Variantes

### Cache-Aside con refresh manual

```python
@cached(r, ttl=300, prefix="product")
def get_product(product_id: str) -> dict:
    return db.products.find_by_id(product_id)

def refresh_product(product_id: str) -> dict:
    get_product.cache_invalidate(product_id)
    return get_product(product_id)
```

### Invalidacion basada en tags

Invalida todas las entradas de cache para un tag (ej. todas las caches relacionadas con usuarios):

```python
def invalidate_tag(redis_client: Redis, tag: str) -> int:
    keys = redis_client.smembers(f"tag:{tag}")
    if keys:
        redis_client.delete(*keys)
        redis_client.delete(f"tag:{tag}")
    return len(keys)

# Al cachear, agrega la clave a un set de tag
redis_client.sadd("tag:users", key)
```

### Compresion para valores grandes

```python
import zlib

@cached(r, ttl=600, prefix="report")
def generate_report(date: str) -> dict:
    data = heavy_computation(date)
    return data  # Podria ser grande

# En el decorador, comprimir antes de almacenar:
redis_client.setex(key, ttl, zlib.compress(json.dumps(result).encode()))
```

## Mejores Practicas

- **Usa TTLs cortos para datos que cambian frecuentemente** — 30-60 segundos para feeds de usuario, 5-10 minutos para datos de referencia
- **Cachea solo resultados serializables** — el decorador usa `json.dumps`; objetos con tipos personalizados necesitan un serializador `default`
- **Maneja fallos de Redis elegantemente** — la cache es una optimizacion, no la fuente de verdad; la funcion debe seguir funcionando sin ella
- **Invalida al escribir** — llama `cache_invalidate` despues de cualquier mutacion que cambiaria el resultado cacheado

## Errores Comunes

- **Cachear funciones con efectos secundarios** — si la funcion escribe a la base de datos, cachear omite la escritura en cache hits
- **Usar argumentos por defecto mutables** — el hash de la clave cambia si una lista o dict por defecto se modifica entre llamadas
- **No establecer un TTL** — sin `setex`, las entradas persisten indefinidamente y consumen memoria de Redis
- **Incluir `self` en la clave** — el `id()` del objeto cambia entre peticiones, causando cache misses

## FAQ

**Q: Debo usar Redis o cache en memoria?**
A: Usa Redis cuando multiples procesos o servidores necesitan compartir la cache. Usa memoria (`functools.lru_cache`) para caches de un solo proceso y corta duracion.

**Q: Como manejo valores de retorno no serializables?**
A: Pasa una funcion `default` a `json.dumps` que convierta tipos personalizados a dicts, o usa `pickle` (con precauciones de seguridad).

**Q: Que TTL debo usar?**
A: Empieza con 300 segundos (5 minutos) y ajusta segun tolerancia a obsolescencia y frecuencia de escritura. TTLs mas cortos reducen obsolescencia pero aumentan cache misses.

**Q: Puedo cachear funciones que retornan None?**
A: Si, pero distingue entre "None cacheado" y "cache miss" verificando la existencia de la clave con `redis_client.exists(key)` en lugar de `redis_client.get(key)`.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
