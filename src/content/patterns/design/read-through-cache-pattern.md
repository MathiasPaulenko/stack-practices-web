---
contentType: patterns
slug: read-through-cache-pattern
title: "Read-Through Cache Pattern"
description: "A transparent cache layer that intercepts read requests, fetches from the data source on miss, and populates the cache automatically."
metaDescription: "Read-through cache pattern: a transparent cache that loads data on miss without application logic. Implement with Redis and Python, Java, and TypeScript examples."
difficulty: intermediate
topics:
  - caching
  - design
tags:
  - caching
  - read-through
  - pattern
  - redis
  - cache-miss
  - performance
  - python
  - java
  - typescript
relatedResources:
  - /patterns/design/cache-aside-pattern
  - /patterns/design/write-through-cache-pattern
  - /recipes/caching/python-redis-cache-decorator
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Read-through cache pattern: a transparent cache that loads data on miss without application logic. Implement with Redis and Python, Java, and TypeScript examples."
  keywords:
    - read-through cache
    - cache pattern
    - redis caching
    - transparent cache
    - cache miss handling
    - python cache
    - java cache
---

# Read-Through Cache Pattern

## Overview

In a read-through cache, the application talks only to the cache layer. On a cache hit, the cache returns data directly. On a cache miss, the cache fetches data from the backing store, stores it, and returns it to the application. The application never interacts with the database directly for reads.

This differs from cache-aside, where the application manages cache population. Read-through moves that responsibility into the cache layer or a cache library, simplifying application code and ensuring consistent cache behavior across all read paths.

## When to Use

- Multiple read paths access the same data and you want consistent caching behavior
- You want to decouple application code from cache management logic
- Your cache layer supports a read-through callback (Redis with Lua, memcached with callbacks)
- You need predictable cache behavior without relying on every developer calling cache correctly
- Read latency is more critical than write latency

## Solution

### Python with Redis

```python
import redis
import json
import pickle
from typing import Callable, TypeVar, Optional

T = TypeVar('T')

class ReadThroughCache:
    def __init__(self, redis_client: redis.Redis, ttl: int = 3600):
        self.redis = redis_client
        self.ttl = ttl

    def get_or_load(self, key: str, loader: Callable[[], T], ttl: Optional[int] = None) -> T:
        cached = self.redis.get(key)
        if cached is not None:
            return pickle.loads(cached)

        value = loader()
        self.redis.setex(key, ttl or self.ttl, pickle.dumps(value))
        return value

    def get_or_load_json(self, key: str, loader: Callable[[], dict], ttl: Optional[int] = None) -> dict:
        cached = self.redis.get(key)
        if cached is not None:
            return json.loads(cached)

        value = loader()
        self.redis.setex(key, ttl or self.ttl, json.dumps(value))
        return value


cache = ReadThroughCache(redis.Redis(host='localhost', port=6379))

def get_user(user_id: str) -> dict:
    return cache.get_or_load_json(
        f"user:{user_id}",
        lambda: db.query_one("SELECT id, name, email FROM users WHERE id = %s", [user_id]),
        ttl=1800
    )
```

### TypeScript with Redis

```typescript
import { createClient } from 'redis';

class ReadThroughCache {
  private client: ReturnType<typeof createClient>;
  private defaultTtl: number;

  constructor(client: ReturnType<typeof createClient>, ttl = 3600) {
    this.client = client;
    this.defaultTtl = ttl;
  }

  async getOrLoad<T>(key: string, loader: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.client.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }

    const value = await loader();
    await this.client.set(key, JSON.stringify(value), { EX: ttl ?? this.defaultTtl });
    return value;
  }

  async invalidate(key: string): Promise<void> {
    await this.client.del(key);
  }
}

// Usage
const redisClient = createClient({ url: 'redis://localhost:6379' });
await redisClient.connect();
const cache = new ReadThroughCache(redisClient);

async function getUser(userId: string): Promise<User> {
  return cache.getOrLoad(
    `user:${userId}`,
    () => db.query('SELECT id, name, email FROM users WHERE id = $1', [userId]),
    1800
  );
}
```

### Java with Caffeine

```java
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.util.concurrent.TimeUnit;

public class ReadThroughCacheManager {

    private final Cache<String, Object> cache;

    public ReadThroughCacheManager() {
        this.cache = Caffeine.newBuilder()
            .expireAfterWrite(30, TimeUnit.MINUTES)
            .maximumSize(10_000)
            .build();
    }

    @SuppressWarnings("unchecked")
    public <T> T getOrLoad(String key, java.util.function.Function<String, T> loader) {
        return (T) cache.get(key, k -> loader.apply(k));
    }

    public void invalidate(String key) {
        cache.invalidate(key);
    }
}

// Usage
ReadThroughCacheManager cache = new ReadThroughCacheManager();

User user = cache.getOrLoad("user:" + userId, k -> {
    return userRepository.findById(Long.parseLong(k.split(":")[1]))
        .orElseThrow(() -> new NotFoundException("User not found"));
});
```

### Redis with Lua Script (Server-Side Read-Through)

```lua
-- read_through.lua
-- KEYS[1]: cache key
-- ARGV[1]: TTL in seconds
-- ARGV[2]: loader command (e.g., "GET user:123:db")

local cached = redis.call('GET', KEYS[1])
if cached then
  return cached
end

-- In production, use a more sophisticated loader mechanism
-- This is a simplified example
local value = redis.call('GET', ARGV[2])
if value then
  redis.call('SETEX', KEYS[1], ARGV[1], value)
  return value
end
return nil
```

```python
# Using the Lua script
script = r.register_script(lua_script)
result = script(keys=["user:123"], args=[3600, "user:123:db"])
```

## Explanation

The read-through pattern shifts cache management from the application to the cache layer:

1. **Cache hit** — the cache has the data and returns it immediately. No database call is made.
2. **Cache miss** — the cache calls a loader function (or callback) that knows how to fetch the data from the backing store. The fetched data is stored in the cache with a TTL and returned to the caller.
3. **Subsequent reads** — the same key hits the cache until the TTL expires or the entry is invalidated.

The key difference from cache-aside is transparency. With cache-aside, the application checks the cache, misses, fetches from the database, and populates the cache. With read-through, the application calls `cache.get(key)` and the cache handles the rest. This means every read path gets caching automatically without each developer writing cache logic.

## Variants

| Approach | Layer | Best For |
|----------|-------|----------|
| Application-level library | Python/TS/Java cache wrapper | Most use cases, full control |
| Redis Lua script | Redis server | Atomic read-through without round trips |
| CDN read-through | CDN edge | Static and semi-static content |
| Database proxy cache | Proxy layer | Transparent caching without code changes |
| ORM second-level cache | ORM layer | Java/Hibernate, automatic entity caching |

## Best Practices

- **Set a TTL on every entry** — without a TTL, stale data persists indefinitely. Choose TTLs based on data change frequency.
- **Use consistent key naming** — `entity:id` format (e.g. `user:123`, `product:456`) makes debugging and invalidation predictable.
- **Handle loader failures gracefully** — if the database is down, return stale cached data if available instead of failing the entire request.
- **Serialize efficiently** — use JSON for simple objects, MessagePack or Protobuf for complex ones. Avoid large payloads that consume cache memory.
- **Monitor cache hit ratio** — a hit ratio below 80% means the cache is not effective. Check TTLs, key patterns, and cache size.

## Common Mistakes

- **No TTL on cache entries** — data stays in cache forever, becoming stale. Always set a TTL, even if it is long (24h).
- **Caching too aggressively** — caching everything leads to memory pressure and stale data. Cache hot keys and expensive queries, not every read.
- **Not invalidating after writes** — after updating a user, the cached version is stale. Call `cache.invalidate(key)` or use a write-through pattern.
- **Large objects in cache** — caching a 10MB object consumes cache memory and increases serialization overhead. Cache projections, not full entities.
- **Ignoring cache stampede** — when a popular key expires, many requests miss simultaneously and flood the database. Use a lock or single-flight pattern.

## Frequently Asked Questions

### What is the difference between read-through and cache-aside?

In cache-aside, the application manages cache population: check cache, miss, fetch from DB, populate cache. In read-through, the cache layer handles population via a loader callback. Read-through centralizes cache logic; cache-aside gives the application more control.

### When should I use read-through over cache-aside?

Use read-through when you want consistent caching across all read paths without relying on each developer implementing cache logic correctly. Use cache-aside when you need fine-grained control over when and how to populate the cache.

### How do I handle cache stampede in read-through?

Use a lock or single-flight mechanism: when a cache miss occurs, only one request fetches from the database while others wait. Redis distributed locks or language-level single-flight libraries work well.

### Can I use read-through with a distributed cache?

Yes. Redis and Memcached both support read-through patterns. For Redis, use a Lua script for server-side read-through. For application-level, use a cache wrapper library that handles the loader callback.
