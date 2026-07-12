---





contentType: patterns
slug: cache-aside-pattern
title: "Cache-Aside Pattern"
description: "Load data into the cache on demand from the backing store. A caching pattern that gives the application full control over what and when to cache."
metaDescription: "Learn the Cache-Aside Pattern in Python, Java, and JavaScript. Caching pattern for read-through data with application-managed cache logic."
difficulty: beginner
topics:
  - design
tags:
  - cache-aside
  - pattern
  - design-pattern
  - caching
  - performance
  - redis
  - python
  - javascript
  - java
relatedResources:
  - /patterns/retry-pattern
  - /patterns/circuit-breaker-pattern
  - /patterns/singleton-pattern
  - /patterns/cache-invalidation-pattern
  - /patterns/cqrs-pattern
  - /patterns/read-through-cache-pattern
  - /patterns/two-level-cache-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Cache-Aside Pattern in Python, Java, and JavaScript. Caching pattern for read-through data with application-managed cache logic."
  keywords:
    - cache aside pattern
    - design pattern
    - caching pattern
    - read-through caching
    - redis caching
    - python cache
    - java cache
    - javascript cache





---

# Cache-Aside Pattern

## Overview

The Cache-Aside Pattern is a caching strategy where the application is responsible for loading data into the cache from the backing store on demand. The application checks the cache first; if the data is not present (cache miss), it fetches from the database, populates the cache, and returns the result. This gives the application full control over cache logic, invalidation, and consistency.

## When to Use

Use the Cache-Aside Pattern when:
- You need read-heavy workloads where the same data is requested frequently
- The application should control what gets cached and for how long
- Cache invalidation can be handled explicitly by the application layer
- You want a simple, portable caching strategy that works with any cache provider (Redis, Memcached, in-memory)
- Examples: user profiles, product catalogs, [configuration data](/recipes/data/parse-json), reference data

## Solution

### Python

```python
import time
from typing import Optional, Callable

class CacheAside:
    def __init__(self, cache: dict, ttl_seconds: float = 60):
        self.cache = cache
        self.ttl = ttl_seconds
        self.timestamps = {}

    def get(self, key: str, loader: Callable[[], any]) -> any:
        now = time.time()
        if key in self.cache:
            if now - self.timestamps.get(key, 0) < self.ttl:
                print(f"Cache hit: {key}")
                return self.cache[key]
            else:
                del self.cache[key]

        print(f"Cache miss: {key}")
        value = loader()
        self.cache[key] = value
        self.timestamps[key] = now
        return value

    def invalidate(self, key: str):
        self.cache.pop(key, None)
        self.timestamps.pop(key, None)

# Usage
cache = {}
store = CacheAside(cache)

def load_user(user_id: int) -> dict:
    # Simulate DB call
    return {"id": user_id, "name": f"User {user_id}"}

user = store.get("user:1", lambda: load_user(1))
user = store.get("user:1", lambda: load_user(1))  # Cache hit
store.invalidate("user:1")
```

### JavaScript

```javascript
class CacheAside {
  constructor(cache, ttlMs = 60000) {
    this.cache = cache;
    this.ttl = ttlMs;
    this.timestamps = new Map();
  }

  get(key, loader) {
    const now = Date.now();
    if (this.cache.has(key)) {
      if (now - (this.timestamps.get(key) || 0) < this.ttl) {
        console.log(`Cache hit: ${key}`);
        return this.cache.get(key);
      }
      this.cache.delete(key);
    }

    console.log(`Cache miss: ${key}`);
    const value = loader();
    this.cache.set(key, value);
    this.timestamps.set(key, now);
    return value;
  }

  invalidate(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }
}

// Usage
const cache = new Map();
const store = new CacheAside(cache);

function loadUser(userId) {
  return { id: userId, name: `User ${userId}` };
}

let user = store.get("user:1", () => loadUser(1));
user = store.get("user:1", () => loadUser(1)); // Cache hit
store.invalidate("user:1");
```

### Java

```java
import java.util.*;
import java.util.function.Supplier;

public class CacheAside<K, V> {
    private final Map<K, V> cache;
    private final Map<K, Long> timestamps;
    private final long ttlMs;

    public CacheAside(Map<K, V> cache, long ttlMs) {
        this.cache = cache;
        this.timestamps = new HashMap<>();
        this.ttlMs = ttlMs;
    }

    public V get(K key, Supplier<V> loader) {
        long now = System.currentTimeMillis();
        if (cache.containsKey(key)) {
            if (now - timestamps.getOrDefault(key, 0L) < ttlMs) {
                System.out.println("Cache hit: " + key);
                return cache.get(key);
            }
            cache.remove(key);
        }

        System.out.println("Cache miss: " + key);
        V value = loader.get();
        cache.put(key, value);
        timestamps.put(key, now);
        return value;
    }

    public void invalidate(K key) {
        cache.remove(key);
        timestamps.remove(key);
    }
}

// Usage
CacheAside<String, Map<String, Object>> store =
    new CacheAside<>(new HashMap<>(), 60000);

Map<String, Object> user = store.get("user:1", () ->
    Map.of("id", 1, "name", "User 1")
);
```

## Explanation

The Cache-Aside Pattern follows this flow:

1. **Read**: Application checks cache → if hit, return; if miss, proceed to step 2
2. **Load**: Fetch from backing store (database, API)
3. **Store**: Write the result into cache with a TTL
4. **Invalidate**: On writes/updates, invalidate the cache entry so the next read refreshes it

The application is the **single point of control** — it decides when to read from cache, when to fall back to the store, and when to invalidate.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **[Lazy Loading](/recipes/performance/lazy-loading)** | Cache miss triggers load | Most common; prevents unnecessary cache fills |
| **[Write-Through](/recipes/performance/cache-invalidation)** | Writes update cache and DB simultaneously | Strong consistency required |
| **Refresh-Ahead** | Proactively refresh before TTL expires | Predictable access patterns |
| **Multi-Level** | L1 (in-memory) + L2 (Redis) + L3 (DB) | High-scale applications |

## What Works

- **Always set a TTL** — stale data is worse than a cache miss
- **Invalidate on writes** — delete the cache key after DB updates to maintain consistency
- **Use a [circuit breaker](/patterns/design/circuit-breaker-pattern)** around cache failures — if Redis is down, fall back directly to DB
- **Serialize complex objects** before storing (JSON, protobuf)
- **Monitor cache hit ratio** — aim for >90% on read-heavy workloads
- **Pre-warm cache** on startup for critical reference data

## Common Mistakes

- Forgetting to invalidate cache after DB writes, causing stale data
- Setting TTL too long, serving outdated information
- Not handling cache provider failures gracefully (e.g., Redis connection lost)
- Storing too much data in cache, causing memory pressure or eviction of hot keys
- Cache stampede: many requests hit a cold cache simultaneously, overloading the DB

## Frequently Asked Questions

**Q: What is the difference between Cache-Aside and Read-Through?**
A: In Cache-Aside, the application controls cache logic. In Read-Through, the cache provider (e.g., Redis with a cache loader) fetches from the DB transparently. Cache-Aside is more explicit and portable; Read-Through delegates control to the cache layer.

**Q: How do I prevent cache stampedes?**
A: Use a [mutex](/recipes/security/rate-limiting) or lock per key so only one request loads from DB while others wait. Alternatively, see [caching strategies](/recipes/performance/caching-strategies) for more patterns. Alternatively, use a probabilistic early expiration (e.g., refresh the key before TTL expires with some probability).

**Q: Should I cache writes (Write-Through) or invalidate (Cache-Aside)?**
A: Cache-Aside invalidation is simpler and safer. Write-Through adds complexity but guarantees consistency. Use Write-Through only when strong consistency is critical and worth the overhead.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.


## Advanced Topics

### Scenario: Cache-Aside for Product API

```typescript
// Cache-Aside: read from cache, on miss read from DB and fill cache
class ProductCache {
  constructor(private redis: RedisClient, private db: Pool, private ttlSec: number = 300) {}

  async getProduct(id: string): Promise<Product | null> {
    // 1. Try cache
    const cached = await this.redis.get(`product:${id}`);
    if (cached) return JSON.parse(cached);

    // 2. Cache miss: read from DB
    const res = await this.db.query("SELECT * FROM products WHERE id = $1", [id]);
    if (res.rows.length === 0) return null;
    const product = res.rows[0];

    // 3. Fill cache
    await this.redis.setex(`product:${id}`, this.ttlSec, JSON.stringify(product));
    return product;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    // 1. Update DB
    await this.db.query("UPDATE products SET name=$1, price=$2 WHERE id=$3", [data.name, data.price, id]);
    // 2. Invalidate cache
    await this.redis.del(`product:${id}`);
  }

  async deleteProduct(id: string): Promise<void> {
    await this.db.query("DELETE FROM products WHERE id = $1", [id]);
    await this.redis.del(`product:${id}`);
  }
}

// Invalidation strategies
  | Strategy | Description | Pros | Cons |
  |----------|-------------|------|------|
  | TTL | Expires after N seconds | Simple | Stale data until expiry |
  | Write-through | Write cache on DB write | Always consistent | Write latency |
  | Write-around | Write DB only, cache on read | Fast writes | First read slow |
  | Write-back | Write cache, async to DB | Fast writes | Risk of data loss |
  | Explicit | Invalidate on update/delete | Full control | Requires manual code |
```

Lessons:
  - Cache-Aside: the app manages cache explicitly
  - Read: cache -> miss -> DB -> fill cache
  - Write: DB -> invalidate cache (do not update cache)
  - TTL as safety net: if invalidation fails, TTL cleans up
  - Cache stampede: if N requests miss simultaneously, N DB queries
  - Solution: lock or single-flight: only 1 request goes to DB, others wait
```

### How do I prevent cache stampede?

Use a distributed lock (Redis SETNX): only the first request goes to DB, others wait. Alternative: probabilistic early expiration: refresh before TTL if there is traffic. Another option: single-flight in Go or Promise deduplication in JS: if a fetch is already in flight for that key, reuse the promise. This reduces N queries to 1 query during a massive cache miss.
