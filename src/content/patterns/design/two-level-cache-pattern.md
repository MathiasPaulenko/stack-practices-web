---



contentType: patterns
slug: two-level-cache-pattern
title: "Two-Level Cache Pattern"
description: "Combine an L1 in-memory cache with an L2 distributed cache to reduce latency for hot keys while maintaining cache consistency across instances."
metaDescription: "Two-level cache pattern: L1 in-memory plus L2 Redis for low-latency hot keys with distributed consistency. Implement with Python, Java, and TypeScript."
difficulty: advanced
topics:
  - caching
  - design
tags:
  - caching
  - two-level-cache
  - l1-l2
  - pattern
  - redis
  - in-memory
  - performance
  - python
  - java
relatedResources:
  - /patterns/read-through-cache-pattern
  - /patterns/cache-invalidation-pattern
  - /patterns/cache-aside-pattern
  - /patterns/cache-stampede-prevention-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Two-level cache pattern: L1 in-memory plus L2 Redis for low-latency hot keys with distributed consistency. Implement with Python, Java, and TypeScript."
  keywords:
    - two-level cache
    - l1 l2 cache
    - in-memory plus redis
    - multi-level caching
    - cache hierarchy
    - distributed cache pattern



---

# Two-Level Cache Pattern

## Overview

A two-level cache combines an L1 in-memory cache (fast, local, limited size) with an L2 distributed cache (slower, shared, larger capacity). L1 serves hot keys at memory speed with zero network overhead. L2 provides shared cache state across application instances and handles the full dataset.

Reads check L1 first. On a miss, they check L2. On an L2 miss, they fetch from the database and populate both levels. Writes update both levels and invalidate L1 on other instances via pub/sub or TTL.

## When to Use

- Hot keys are read frequently and network latency to Redis is noticeable
- Multiple application instances share cached data
- You need sub-millisecond read latency for specific keys
- L1 miss rate is low enough that the extra complexity is justified
- You want to reduce load on the distributed cache (Redis)

## Solution

### Python with LRU L1 and Redis L2

```python
import redis
import json
import time
from functools import lru_cache
from collections import OrderedDict

class TwoLevelCache:
    def __init__(self, redis_client: redis.Redis, l1_max_size: int = 1000, l1_ttl: float = 60.0, l2_ttl: int = 3600):
        self.redis = redis_client
        self.l1_max_size = l1_max_size
        self.l1_ttl = l1_ttl
        self.l2_ttl = l2_ttl
        self._l1 = OrderedDict()  # key -> (value, expiry_timestamp)

    def get(self, key: str, loader: callable) -> any:
        # L1 check
        if key in self._l1:
            value, expiry = self._l1[key]
            if time.time() < expiry:
                self._l1.move_to_end(key)
                return value
            del self._l1[key]

        # L2 check
        cached = self.redis.get(key)
        if cached is not None:
            value = json.loads(cached)
            self._populate_l1(key, value)
            return value

        # Cache miss — load from database
        value = loader()
        self._populate_l1(key, value)
        self.redis.setex(key, self.l2_ttl, json.dumps(value))
        return value

    def _populate_l1(self, key: str, value: any):
        if len(self._l1) >= self.l1_max_size:
            self._l1.popitem(last=False)  # Evict LRU
        self._l1[key] = (value, time.time() + self.l1_ttl)

    def invalidate(self, key: str):
        self._l1.pop(key, None)
        self.redis.delete(key)

    def invalidate_all(self):
        self._l1.clear()


cache = TwoLevelCache(redis.Redis(host='localhost', port=6379))

def get_user(user_id: str) -> dict:
    return cache.get(
        f"user:{user_id}",
        lambda: db.query_one("SELECT * FROM users WHERE id = %s", [user_id])
    )

def update_user(user_id: str, name: str, email: str):
    db.execute("UPDATE users SET name=%s, email=%s WHERE id=%s", [name, email, user_id])
    cache.invalidate(f"user:{user_id}")
```

### TypeScript with Map L1 and Redis L2

```typescript
import { createClient } from 'redis';

class TwoLevelCache {
  private l1: Map<string, { value: any; expiry: number }> = new Map();
  private l1MaxSize: number;
  private l1TtlMs: number;
  private l2Ttl: number;
  private redis: ReturnType<typeof createClient>;

  constructor(
    redisClient: ReturnType<typeof createClient>,
    l1MaxSize = 1000,
    l1TtlMs = 60000,
    l2Ttl = 3600
  ) {
    this.redis = redisClient;
    this.l1MaxSize = l1MaxSize;
    this.l1TtlMs = l1TtlMs;
    this.l2Ttl = l2Ttl;
  }

  async get<T>(key: string, loader: () => Promise<T>): Promise<T> {
    // L1 check
    const l1Entry = this.l1.get(key);
    if (l1Entry && Date.now() < l1Entry.expiry) {
      // Refresh LRU position
      this.l1.delete(key);
      this.l1.set(key, l1Entry);
      return l1Entry.value as T;
    }
    this.l1.delete(key);

    // L2 check
    const l2Cached = await this.redis.get(key);
    if (l2Cached !== null) {
      const value = JSON.parse(l2Cached) as T;
      this.populateL1(key, value);
      return value;
    }

    // Cache miss — load from database
    const value = await loader();
    this.populateL1(key, value);
    await this.redis.set(key, JSON.stringify(value), { EX: this.l2Ttl });
    return value;
  }

  private populateL1(key: string, value: any): void {
    if (this.l1.size >= this.l1MaxSize) {
      // Evict oldest entry (first in Map)
      const oldestKey = this.l1.keys().next().value;
      if (oldestKey) this.l1.delete(oldestKey);
    }
    this.l1.set(key, { value, expiry: Date.now() + this.l1TtlMs });
  }

  invalidate(key: string): void {
    this.l1.delete(key);
    this.redis.del(key);
  }

  invalidateAll(): void {
    this.l1.clear();
  }
}

// Usage
const redisClient = createClient({ url: 'redis://localhost:6379' });
await redisClient.connect();
const cache = new TwoLevelCache(redisClient);

const user = await cache.get(`user:${userId}`, () =>
  db.query('SELECT * FROM users WHERE id = $1', [userId])
);
```

### Java with Caffeine L1 and Redis L2

```java
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import redis.clients.jedis.Jedis;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.concurrent.TimeUnit;

public class TwoLevelCacheManager {

    private final Cache<String, Object> l1;
    private final Jedis l2;
    private final ObjectMapper mapper = new ObjectMapper();
    private final int l2Ttl;

    public TwoLevelCacheManager(Jedis jedis, int l1MaxSize, int l1TtlMinutes, int l2TtlSeconds) {
        this.l2 = jedis;
        this.l2Ttl = l2TtlSeconds;
        this.l1 = Caffeine.newBuilder()
            .maximumSize(l1MaxSize)
            .expireAfterWrite(l1TtlMinutes, TimeUnit.MINUTES)
            .build();
    }

    @SuppressWarnings("unchecked")
    public <T> T getOrLoad(String key, java.util.function.Function<String, T> loader, Class<T> type) {
        // L1 check
        T l1Value = (T) l1.getIfPresent(key);
        if (l1Value != null) {
            return l1Value;
        }

        // L2 check
        String l2Cached = l2.get(key);
        if (l2Cached != null) {
            try {
                T value = mapper.readValue(l2Cached, type);
                l1.put(key, value);
                return value;
            } catch (Exception e) {
                // Deserialization failed, treat as miss
            }
        }

        // Cache miss — load from database
        T value = loader.apply(key);
        try {
            l2.setex(key, l2Ttl, mapper.writeValueAsString(value));
        } catch (Exception e) {
            // Serialization failed, skip L2
        }
        l1.put(key, value);
        return value;
    }

    public void invalidate(String key) {
        l1.invalidate(key);
        l2.del(key);
    }
}
```

## Explanation

The two-level cache exploits locality of reference. Hot keys are served from L1 (in-memory), which has sub-microsecond access time. Cold keys fall through to L2 (Redis), which has network latency but serves all instances.

The L1 cache is per-instance. Each application instance maintains its own L1. This means L1 can have stale data if another instance updates the database. To mitigate this, L1 has a short TTL (e.g. 60 seconds). The L2 cache is shared and has a longer TTL (e.g. 1 hour).

On a write, both L1 and L2 are invalidated. Other instances still have the old value in their L1 until their L1 TTL expires. For tighter consistency, use Redis pub/sub to broadcast invalidation events so all instances clear their L1 immediately.

## Variants

| Approach | L1 Implementation | L2 Implementation | Consistency |
|----------|-------------------|-------------------|-------------|
| LRU + Redis | OrderedDict / Map | Redis | Eventual (L1 TTL) |
| Caffeine + Redis | Caffeine | Redis | Eventual (L1 TTL) |
| Pub/sub invalidation | Any in-memory | Redis | Strong (on invalidate) |
| Write-through both | Any in-memory | Redis | Strong |
| L1-only (no L2) | LRU / Caffeine | None | Per-instance, no sharing |

## Best Practices


- For a deeper guide, see [Read-Through Cache Pattern](/patterns/read-through-cache-pattern/).

- **Keep L1 small** — L1 is per-instance and consumes application memory. 1000-5000 entries is typical. Use LRU eviction to bound size.
- **Set a short L1 TTL** — L1 should expire faster than L2 (e.g. 60s vs 1h). This limits staleness when other instances update data.
- **Use pub/sub for L1 invalidation** — when one instance invalidates a key, broadcast to all instances so they clear their L1. This reduces the staleness window from the L1 TTL to near-zero.
- **Monitor L1 hit ratio** — if L1 hit ratio is low, the extra complexity is not justified. L1 is only valuable for hot keys accessed many times per second.
- **Serialize consistently** — L1 stores objects in memory, L2 stores serialized JSON. Ensure the serialization round-trip preserves data types.

## Common Mistakes

- **L1 too large** — consuming too much application memory causes GC pressure or OOM. Cap L1 size and use LRU eviction.
- **L1 TTL same as L2 TTL** — if both expire at the same time, L1 does not reduce L2 load. Set L1 TTL shorter (e.g. 1/10 of L2 TTL).
- **No L1 invalidation across instances** — instance A updates data and clears its L1. Instance B still serves stale data from its L1. Use pub/sub or accept the TTL-based staleness.
- **Caching everything in L1** — L1 is for hot keys only. Caching cold keys in L1 wastes memory and evicts hot keys. Use access frequency to decide what enters L1.
- **Not handling L2 failures** — if Redis is down, L1 still works but L2 misses become database hits. Implement a circuit breaker or fallback to L1-only mode.

## Frequently Asked Questions

### What is the difference between L1 and L2 cache?

L1 is in-memory, per-instance, and fast (sub-microsecond). L2 is distributed (Redis), shared across instances, and slower (network round-trip). L1 serves hot keys; L2 serves all keys.

### How do I keep L1 consistent across instances?

Use Redis pub/sub to broadcast invalidation events. When instance A invalidates a key, it publishes a message. All instances subscribe and clear their L1. Without pub/sub, L1 is eventually consistent via its TTL.

### When is a two-level cache not worth it?

If your application has a single instance, L2 alone is sufficient. If access patterns are uniform (no hot keys), L1 does not improve hit ratio. If Redis latency is acceptable (< 1ms), L1 adds complexity without meaningful benefit.

### How do I size L1?

Monitor access frequency per key. The top 1% of keys typically account for 50-80% of reads. Size L1 to hold those hot keys. Start with 1000 entries and adjust based on hit ratio metrics.
