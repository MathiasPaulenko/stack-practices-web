---
contentType: recipes
slug: python-redis-cache-decorator
title: "Cache Function Results with Redis and TTL in Python"
description: "Build a Python decorator that caches function return values in Redis with configurable TTL, key generation, and cache invalidation"
metaDescription: "Cache Python function results in Redis with a TTL decorator. Auto-generate cache keys, handle serialization, and invalidate stale entries."
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
  metaDescription: "Cache Python function results in Redis with a TTL decorator. Auto-generate cache keys, handle serialization, and invalidate stale entries."
  keywords:
    - python redis cache
    - python cache decorator
    - redis ttl
    - python caching
    - redis cache invalidation
---

# Cache Function Results with Redis and TTL in Python

Caching expensive function results in Redis reduces latency and database load. A decorator approach lets you add caching to any function with a single `@cached` annotation, keeping business logic clean. This recipe builds a Redis-backed cache decorator with automatic key generation, JSON serialization, configurable TTL, and manual invalidation.

## When to Use This

- Functions that return the same result for the same arguments (pure or near-pure functions)
- Database queries, API calls, or computations that are expensive but rarely change
- Results that are safe to serve stale for the TTL duration

## Prerequisites

- Python 3.10+
- `redis` package (`pip install redis`)
- A running Redis instance

## Solution

### 1. Install Dependencies

```bash
pip install redis
```

### 2. Build the Cache Decorator

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

### 3. Use the Decorator

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

# First call — hits the database, caches result
user = get_user("123", include_posts=True)

# Second call — returns from cache
user = get_user("123", include_posts=True)

# Invalidate the cache for specific arguments
get_user.cache_invalidate("123", include_posts=True)
```

### 4. Async Version

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

# Usage
r = AsyncRedis(host="localhost", port=6379, decode_responses=True)

@async_cached(r, ttl=120, prefix="api")
async def fetch_weather(city: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"https://api.weather.example/{city}")
        return resp.json()
```

## How It Works

1. **Key generation** uses the function's module, name, and a SHA-256 hash of its arguments to create a deterministic, collision-resistant key.
2. **`skip_args`** excludes arguments like `self` or request objects from the key, so instance methods work correctly.
3. **`setex`** sets the value with an expiration in one atomic Redis command, so the cache entry auto-expires after the TTL.
4. **`cache_invalidate`** is attached to the wrapper function, letting callers delete a specific cache entry by passing the same arguments.
5. **Graceful degradation** — if Redis is down, the function still runs; the decorator logs the error and returns the uncached result.

## Variants

### Cache-Aside with Manual Refresh

```python
@cached(r, ttl=300, prefix="product")
def get_product(product_id: str) -> dict:
    return db.products.find_by_id(product_id)

def refresh_product(product_id: str) -> dict:
    get_product.cache_invalidate(product_id)
    return get_product(product_id)
```

### Tag-Based Invalidation

Invalidate all cache entries for a tag (e.g., all user-related caches):

```python
def invalidate_tag(redis_client: Redis, tag: str) -> int:
    keys = redis_client.smembers(f"tag:{tag}")
    if keys:
        redis_client.delete(*keys)
        redis_client.delete(f"tag:{tag}")
    return len(keys)

# When caching, add key to a tag set
redis_client.sadd("tag:users", key)
```

### Compression for Large Values

```python
import zlib

@cached(r, ttl=600, prefix="report")
def generate_report(date: str) -> dict:
    data = heavy_computation(date)
    return data  # Could be large

# In the decorator, compress before storing:
redis_client.setex(key, ttl, zlib.compress(json.dumps(result).encode()))
```

## Best Practices

- **Use short TTLs for frequently changing data** — 30-60 seconds for user feeds, 5-10 minutes for reference data
- **Cache only serializable results** — the decorator uses `json.dumps`; objects with custom types need a `default` serializer
- **Handle Redis failures gracefully** — the cache is an optimization, not a source of truth; the function should still work without it
- **Invalidate on writes** — call `cache_invalidate` after any mutation that would change the cached result

## Common Mistakes

- **Caching functions with side effects** — if the function writes to the database, caching skips the write on cache hits
- **Using mutable default arguments** — the key hash changes if a default list or dict is modified between calls
- **Not setting a TTL** — without `setex`, entries persist indefinitely and consume Redis memory
- **Including `self` in the key** — the object's `id()` changes between requests, causing cache misses

## FAQ

**Q: Should I use Redis or in-memory caching?**
A: Use Redis when multiple processes or servers need to share the cache. Use in-memory (`functools.lru_cache`) for single-process, short-lived caches.

**Q: How do I handle non-serializable return values?**
A: Pass a `default` function to `json.dumps` that converts custom types to dicts, or use `pickle` (with security caveats).

**Q: What TTL should I use?**
A: Start with 300 seconds (5 minutes) and adjust based on staleness tolerance and write frequency. Shorter TTLs reduce staleness but increase cache misses.

**Q: Can I cache functions that return None?**
A: Yes, but distinguish between "cached None" and "cache miss" by checking for key existence with `redis_client.exists(key)` instead of `redis_client.get(key)`.
