---
contentType: recipes
slug: redis-cache-aside-pattern
title: "Implement the Cache-Aside Pattern with Redis"
description: "Use the cache-aside pattern to read and write data through Redis, handling cache misses, stale reads, and write-through invalidation"
metaDescription: "Implement the cache-aside pattern with Redis. Handle cache misses, lazy loading, write-through invalidation, and thundering herd protection."
difficulty: intermediate
topics:
  - caching
  - performance
tags:
  - redis
  - cache-aside
  - caching pattern
  - performance
  - database
relatedResources:
  - /recipes/caching/caching-redis
  - /recipes/caching/python-redis-cache-decorator
  - /patterns/caching/cache-aside-pattern
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement the cache-aside pattern with Redis. Handle cache misses, lazy loading, write-through invalidation, and thundering herd protection."
  keywords:
    - cache aside pattern
    - redis cache aside
    - lazy loading cache
    - write through cache
    - redis caching pattern
---

# Implement the Cache-Aside Pattern with Redis

Cache-aside (also called lazy loading) is the most common caching pattern. The application checks the cache first; on a miss, it loads from the database, writes the result to the cache, and returns it. On writes, the application updates the database and invalidates the cache entry. This recipe implements cache-aside in Python with Redis, including thundering herd protection and write-through invalidation.

## When to Use This

- Read-heavy workloads where the same data is accessed repeatedly
- Data that changes infrequently but is expensive to fetch
- You want the cache to be optional — the system works without it

## Prerequisites

- Python 3.10+
- `redis` package (`pip install redis`)
- A database client (SQLAlchemy, Psycopg, or similar)

## Solution

### 1. Install Dependencies

```bash
pip install redis
```

### 2. Implement Cache-Aside Read

```python
import json
import logging
from redis import Redis

logger = logging.getLogger(__name__)


class CacheAside:
    def __init__(self, redis_client: Redis, default_ttl: int = 300):
        self.redis = redis_client
        self.default_ttl = default_ttl

    def get_or_load(
        self,
        key: str,
        loader: callable,
        ttl: int | None = None,
    ) -> dict | None:
        """Read from cache, or load from source and cache the result.

        Args:
            key: Cache key.
            loader: Function that loads data from the source on cache miss.
            ttl: Override default TTL in seconds.

        Returns:
            Cached or freshly loaded data.
        """
        try:
            cached = self.redis.get(key)
            if cached is not None:
                return json.loads(cached)
        except Exception as e:
            logger.warning("Cache read failed for %s: %s", key, e)

        result = loader()
        if result is None:
            return None

        try:
            self.redis.setex(key, ttl or self.default_ttl, json.dumps(result, default=str))
        except Exception as e:
            logger.warning("Cache write failed for %s: %s", key, e)

        return result

    def invalidate(self, key: str) -> None:
        """Remove a key from the cache."""
        try:
            self.redis.delete(key)
        except Exception as e:
            logger.warning("Cache invalidation failed for %s: %s", key, e)

    def invalidate_pattern(self, pattern: str) -> int:
        """Delete all keys matching a pattern (e.g., 'user:*')."""
        count = 0
        try:
            for key in self.redis.scan_iter(match=pattern, count=100):
                self.redis.delete(key)
                count += 1
        except Exception as e:
            logger.warning("Pattern invalidation failed for %s: %s", pattern, e)
        return count
```

### 3. Implement Write-Through Invalidation

```python
from myapp.database import db

cache = CacheAside(redis_client, default_ttl=300)

def get_user(user_id: str) -> dict | None:
    return cache.get_or_load(
        key=f"user:{user_id}",
        loader=lambda: db.users.find_by_id(user_id),
        ttl=120,
    )

def update_user(user_id: str, data: dict) -> dict:
    user = db.users.update(user_id, data)
    cache.invalidate(f"user:{user_id}")
    return user

def delete_user(user_id: str) -> None:
    db.users.delete(user_id)
    cache.invalidate(f"user:{user_id}")
    cache.invalidate_pattern(f"user_posts:{user_id}:*")
```

### 4. Thundering Herd Protection

When a cache entry expires, multiple requests may simultaneously trigger the loader, causing a database spike. A lock prevents this:

```python
import time
import uuid

class CacheAsideWithLock(CacheAside):
    def get_or_load(
        self,
        key: str,
        loader: callable,
        ttl: int | None = None,
        lock_timeout: int = 10,
    ) -> dict | None:
        # Try cache first
        try:
            cached = self.redis.get(key)
            if cached is not None:
                return json.loads(cached)
        except Exception:
            pass

        # Acquire lock to prevent thundering herd
        lock_key = f"lock:{key}"
        lock_token = str(uuid.uuid4())

        acquired = self.redis.set(lock_key, lock_token, nx=True, ex=lock_timeout)
        if acquired:
            try:
                result = loader()
                if result is not None:
                    self.redis.setex(key, ttl or self.default_ttl, json.dumps(result, default=str))
                return result
            finally:
                # Release lock only if we still own it
                self._release_lock(lock_key, lock_token)
        else:
            # Wait and retry
            for _ in range(5):
                time.sleep(0.1)
                cached = self.redis.get(key)
                if cached is not None:
                    return json.loads(cached)
            # Lock timed out — load anyway as fallback
            return loader()

    def _release_lock(self, lock_key: str, token: str) -> None:
        """Release lock using Lua script to prevent releasing someone else's lock."""
        script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """
        self.redis.eval(script, 1, lock_key, token)
```

### 5. Cache Warming

Pre-populate the cache before traffic hits:

```python
def warm_user_cache(user_ids: list[str]) -> None:
    users = db.users.find_many({"id": {"in": user_ids}})
    for user in users:
        cache_key = f"user:{user['id']}"
        redis_client.setex(cache_key, 300, json.dumps(user, default=str))
    logger.info("Warmed cache for %d users", len(users))
```

## How It Works

1. **Cache read** — `get_or_load` checks Redis first. On a hit, it returns the cached value without touching the database.
2. **Cache miss** — the `loader` function fetches from the database. The result is written to Redis with a TTL so it auto-expires.
3. **Write-through invalidation** — after any database write, `invalidate` deletes the cache entry so the next read loads fresh data.
4. **Thundering herd lock** — on a cache miss, only one request acquires the lock and loads from the database. Others wait and retry the cache read.
5. **Pattern invalidation** — `invalidate_pattern` uses `SCAN` to find and delete keys matching a glob pattern, useful for invalidating all entries for a user.

## Variants

### Read-Through with Refresh-Ahead

Refresh the cache before it expires:

```python
def get_or_refresh(key: str, loader: callable, ttl: int = 300) -> dict | None:
    cached = redis_client.get(key)
    if cached:
        result = json.loads(cached)
        # Check if entry is near expiry (within 10% of TTL)
        ttl_remaining = redis_client.ttl(key)
        if ttl_remaining < ttl * 0.1:
            # Refresh in background
            threading.Thread(target=lambda: cache.get_or_load(key, loader, ttl), daemon=True).start()
        return result
    return cache.get_or_load(key, loader, ttl)
```

### Write-Behind (Write-Back)

Write to the cache first, then asynchronously persist to the database:

```python
def write_behind_update(user_id: str, data: dict) -> dict:
    cache_key = f"user:{user_id}"
    redis_client.setex(cache_key, 300, json.dumps(data, default=str))
    redis_client.lpush("write_queue:user", json.dumps({"id": user_id, "data": data}))
    return data

# Background worker processes the queue
def process_write_queue():
    while True:
        item = redis_client.brpop("write_queue:user", timeout=10)
        if item:
            payload = json.loads(item[1])
            db.users.update(payload["id"], payload["data"])
```

## Best Practices

- **Set a TTL on every cache entry** — prevents stale data from persisting indefinitely
- **Invalidate on writes** — update the database first, then delete the cache entry (not the other way around)
- **Handle Redis failures gracefully** — the cache is an optimization; the loader should still work without it
- **Use short TTLs for mutable data** — 30-120 seconds for user data, longer for reference data

## Common Mistakes

- **Updating cache before database** — if the database write fails, the cache has stale data
- **Not handling cache misses** — if the loader returns `None`, don't cache it (or cache it with a short TTL to prevent repeated misses)
- **Using `KEYS` instead of `SCAN`** — `KEYS` blocks Redis; `SCAN` is non-blocking and safe for production
- **Caching too much** — cache only hot data; cold data wastes memory and increases invalidation overhead

## FAQ

**Q: Cache-aside vs. read-through — what is the difference?**
A: In cache-aside, the application manages cache reads and writes. In read-through, a cache library handles it transparently. Cache-aside gives more control; read-through is simpler.

**Q: Should I update the cache or invalidate it on writes?**
A: Invalidate (delete). The next read will load fresh data. Updating the cache risks inconsistency if the database write fails.

**Q: How do I handle cache stampede?**
A: Use the lock pattern shown above, or request coalescing — only one request loads data while others wait.

**Q: What TTL should I use?**
A: Start with 300 seconds and adjust. Monitor cache hit rate — below 80% means the TTL is too short or the data changes too fast.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
