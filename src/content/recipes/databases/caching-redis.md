---
contentType: recipes
slug: caching-redis
title: "Caching with Redis"
description: "How to implement application caching using Redis for performance and scalability."
metaDescription: "Learn to implement Redis caching in Python, JavaScript, and Java. Covers cache-aside, TTL, cache invalidation, and serialization."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - cache
  - cache-aside
  - databases
  - sql
relatedResources:
  - /recipes/caching
  - /recipes/database-migrations-safely
  - /recipes/database-transactions
  - /recipes/full-text-search
  - /recipes/soft-deletes
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn to implement Redis caching in Python, JavaScript, and Java. Covers cache-aside, TTL, cache invalidation, and serialization."
  keywords:
    - redis
    - caching
    - cache
    - cache-aside
    - ttl
    - performance
    - python
    - javascript
    - java
---
## Overview

Caching is the single most useful way to speed up read-heavy applications. Redis is an in-memory data structure store that works as a high-performance cache, reducing database load and cutting response times from hundreds of milliseconds to microseconds. This recipe covers the cache-aside pattern, TTL management, serialization, and invalidation strategies in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- [Database queries](/recipes/databases/postgres-query-optimization) are slow and return the same results frequently
- You need to reduce load on downstream [APIs](/recipes/api/call-rest-api) or databases
- Session data, user profiles, or configuration needs fast read access
- Real-time leaderboards, [rate limiting](/recipes/api/rate-limiting), or temporary locks are required

## Solution

### Python (redis-py)

```python
import json
import redis
from functools import wraps

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Cache-aside helper
def cached(key_prefix, ttl=300):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = f"{key_prefix}:{args}:{kwargs}"
            cached = r.get(cache_key)
            if cached:
                return json.loads(cached)
            result = func(*args, **kwargs)
            r.setex(cache_key, ttl, json.dumps(result))
            return result
        return wrapper
    return decorator

@cached("user_profile", ttl=600)
def get_user(user_id):
    # Expensive DB query
    return {"id": user_id, "name": "Alice", "orders": 42}

# Manual cache invalidation
r.delete("user_profile:(1,):{}")

# Redis as session store
r.setex("session:abc123", 3600, json.dumps({"user_id": 1, "role": "admin"}))
```

### JavaScript (ioredis)

```javascript
const Redis = require("ioredis");
const redis = new Redis({ host: "localhost", port: 6379 });

async function getCached(key, fetcher, ttl = 300) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const data = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

async function getUser(userId) {
  return getCached(`user:${userId}`, async () => {
    // Expensive DB query
    return { id: userId, name: "Alice", orders: 42 };
  }, 600);
}

// Invalidate cache
async function invalidateUser(userId) {
  await redis.del(`user:${userId}`);
}

// Redis as rate limiter
async function rateLimit(key, maxRequests = 100, window = 60) {
  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, window);
  return current <= maxRequests;
}
```

### Java (Jedis + Spring Cache)

```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    // Spring declarative caching
    @Cacheable(value = "users", key = "#userId")
    public User getUser(Long userId) {
        // Expensive DB query
        return new User(userId, "Alice", 42);
    }

    @CacheEvict(value = "users", key = "#userId")
    public void updateUser(Long userId, User user) {
        // Update DB
    }
}

// Manual Jedis caching
public class CacheClient {
    private final JedisPool pool = new JedisPool("localhost", 6379);

    public String get(String key) {
        try (Jedis jedis = pool.getResource()) {
            return jedis.get(key);
        }
    }

    public void setex(String key, int seconds, String value) {
        try (Jedis jedis = pool.getResource()) {
            jedis.setex(key, seconds, value);
        }
    }
}
```

## Explanation

The **cache-aside** (or lazy-loading) pattern is the most common caching strategy:

1. **Read**: Check cache first. If hit, return immediately. If miss, fetch from DB, store in cache, then return.
2. **Write**: Update the database, then invalidate or update the cache.
3. **TTL**: Every cached entry has a Time-To-Live. When TTL expires, the entry is evicted and the next read fetches fresh data.

This pattern is simple, works with any database, and handles cache failures gracefully: if Redis is down, the app falls back to the database (cache degradation, not outage).

## Variants

| Strategy | When to Use | Trade-off |
|----------|-------------|-----------|
| Cache-Aside | Most read-heavy apps | Simple, but cache and DB can drift |
| Write-Through | Strong consistency required | Slower writes, cache always fresh |
| Write-Behind | High write throughput | Risk of data loss if cache crashes before flush |
| Read-Through | Complex invalidation logic | Cache library handles fetching |
| Redis Pub/Sub | Cache invalidation across instances | Real-time sync, but adds complexity |

## What Works

- **Set TTLs on everything**: Without TTL, your cache grows forever and stale data lives indefinitely. Use 5-15 minutes for volatile data, hours for stable reference data.
- **Use cache key versioning**: `user:v2:123` lets you invalidate an entire schema by changing the version prefix.
- **Serialize to JSON or MessagePack**: JSON is human-readable; MessagePack is smaller and faster. Avoid Python `pickle` or Java native serialization for security.
- **Handle cache misses gracefully**: Cache failures should degrade to the database, never crash the app. Use [circuit breakers](/patterns/design/circuit-breaker-pattern) for Redis connections.
- **Monitor hit rates**: A cache hit rate below 80% usually means your TTL is too short or you're caching the wrong data.

## Common Mistakes

- **Cache stampede**: When TTL expires, hundreds of requests simultaneously hit the database. Use probabilistic early expiration or locks to prevent this.
- **Caching without TTL**: Unlimited cache growth eventually exhausts memory. Redis will evict keys, possibly dropping important data.
- **Storing large objects**: Serializing a 10MB JSON blob into Redis is slow and blocks the connection. Cache smaller, denormalized fragments instead.
- **Not invalidating on writes**: Updating a user's email but not clearing the cached profile means stale data for minutes or hours.
- **Using Redis as a primary database**: Redis is an in-memory store. If the server restarts without persistence (AOF/RDB), data is lost. Always keep the primary source in a real database.

## Frequently Asked Questions

### How do I prevent cache stampede?

**Probabilistic early expiration**: Refresh the cache a few seconds before TTL expires, but only on a fraction of requests. Alternatively, use a **lease lock**: the first request that gets a cache miss acquires a lock, fetches from DB, and updates the cache. Other requests wait or serve slightly stale data.

### What should I cache and what should I not cache?

**Cache**: User profiles, product catalogs, configuration, reference data, computed aggregates, and frequently-read query results.

**Don't cache**: Rapidly changing data (stock prices, real-time analytics), large blobs (videos, images), or data where consistency is critical and the DB can handle the load.

### How do I invalidate caches across multiple app instances?

Use **Redis Pub/Sub** or a **cache versioning prefix**. When data changes, publish an invalidation message to a Redis channel. All app instances subscribe to the channel and clear their local or remote caches. Alternatively, change a version prefix (`v1` → `v2`) in your cache keys to silently invalidate old entries without explicit messaging.
