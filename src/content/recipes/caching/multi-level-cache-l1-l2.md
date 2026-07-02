---
contentType: recipes
slug: multi-level-cache-l1-l2
title: "Multi-Level Cache with In-Memory L1 and Redis L2"
description: "Implement a two-level cache combining in-memory L1 and Redis L2 for low-latency reads with cross-instance consistency"
metaDescription: "Build a multi-level cache with in-memory L1 and Redis L2. Get sub-millisecond reads from L1, cross-instance consistency from L2, and pub/sub invalidation."
difficulty: advanced
topics:
  - caching
  - performance
tags:
  - caching
  - multi-level cache
  - redis
  - in-memory cache
  - performance
relatedResources:
  - /recipes/caching/nodejs-in-memory-cache-lru
  - /recipes/caching/redis-cache-aside-pattern
  - /recipes/caching/redis-pubsub-messaging
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build a multi-level cache with in-memory L1 and Redis L2. Get sub-millisecond reads from L1, cross-instance consistency from L2, and pub/sub invalidation."
  keywords:
    - multi-level cache
    - l1 l2 cache
    - in-memory redis cache
    - two-level cache
    - cache invalidation
---

# Multi-Level Cache with In-Memory L1 and Redis L2

A single cache layer is rarely optimal. In-memory caches offer sub-millisecond reads but are per-instance. Redis offers cross-instance consistency but adds network latency. A two-level cache combines both: L1 (in-memory) for hot data with zero network overhead, and L2 (Redis) for shared state across instances. This recipe implements an L1+L2 cache with pub/sub-based invalidation.

## When to Use This

- High-traffic APIs where Redis round-trip latency is a bottleneck
- Multiple server instances that need to share cached data
- Read-heavy workloads where the same data is accessed repeatedly within a single instance

## Prerequisites

- Node.js 18+
- `redis` package (`npm install redis`)
- `lru-cache` package (`npm install lru-cache`)

## Solution

### 1. Install Dependencies

```bash
npm install redis lru-cache
```

### 2. Implement the Multi-Level Cache

```typescript
// multi-level-cache.ts
import { LRUCache } from 'lru-cache';
import { createClient, RedisClientType } from 'redis';
import { EventEmitter } from 'events';

export class MultiLevelCache {
  private l1: LRUCache<string, any>;
  private l2: RedisClientType;
  private pubsub: RedisClientType;
  private invalidationChannel: string;
  private ready: boolean = false;

  constructor(
    redisUrl: string = 'redis://localhost:6379',
    options: {
      l1MaxSize?: number;
      l1Ttl?: number;
      l2Ttl?: number;
      invalidationChannel?: string;
    } = {},
  ) {
    this.l1 = new LRUCache<string, any>({
      max: options.l1MaxSize ?? 1000,
      ttl: options.l1Ttl ?? 60_000,
      updateAgeOnGet: true,
    });

    this.l2 = createClient({ url: redisUrl });
    this.pubsub = createClient({ url: redisUrl });
    this.invalidationChannel = options.invalidationChannel ?? 'cache:invalidate';
  }

  async connect(): Promise<void> {
    await this.l2.connect();
    await this.pubsub.connect();
    await this.pubsub.subscribe(this.invalidationChannel, (message) => {
      const { key } = JSON.parse(message);
      this.l1.delete(key);
    });
    this.ready = true;
  }

  async disconnect(): Promise<void> {
    await this.pubsub.unsubscribe(this.invalidationChannel);
    await this.pubsub.quit();
    await this.l2.quit();
    this.l1.clear();
    this.ready = false;
  }

  async get<T>(key: string): Promise<T | undefined> {
    // L1 — in-memory
    const l1Value = this.l1.get(key);
    if (l1Value !== undefined) {
      return l1Value as T;
    }

    // L2 — Redis
    const l2Value = await this.l2.get(key);
    if (l2Value !== null) {
      const parsed = JSON.parse(l2Value) as T;
      this.l1.set(key, parsed);
      return parsed;
    }

    return undefined;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);

    // Write to both levels
    this.l1.set(key, value, { ttl: ttl ?? 60_000 });
    await this.l2.set(key, serialized, { EX: Math.floor((ttl ?? 300_000) / 1000) });
  }

  async getOrLoad<T>(
    key: string,
    loader: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await loader();
    await this.set(key, value, ttl);
    return value;
  }

  async invalidate(key: string): Promise<void> {
    this.l1.delete(key);
    await this.l2.del(key);
    // Notify other instances to invalidate their L1
    await this.l2.publish(
      this.invalidationChannel,
      JSON.stringify({ key }),
    );
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // Clear L1 entries matching pattern
    for (const key of this.l1.keys()) {
      if (this._matchPattern(key, pattern)) {
        this.l1.delete(key);
      }
    }

    // Clear L2 entries matching pattern
    const keys = [];
    for await (const key of this.l2.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      keys.push(key);
    }
    if (keys.length > 0) {
      await this.l2.del(keys);
    }

    // Notify other instances
    await this.l2.publish(
      this.invalidationChannel,
      JSON.stringify({ pattern }),
    );
  }

  private _matchPattern(key: string, pattern: string): boolean {
    const regex = pattern.replace(/\*/g, '.*');
    return new RegExp(`^${regex}$`).test(key);
  }

  get stats() {
    return {
      l1Size: this.l1.size,
      l1MaxSize: this.l1.max,
      ready: this.ready,
    };
  }
}
```

### 3. Use the Cache

```typescript
// usage.ts
import { MultiLevelCache } from './multi-level-cache';

const cache = new MultiLevelCache('redis://localhost:6379', {
  l1MaxSize: 500,
  l1Ttl: 30_000,   // 30 seconds in L1
  l2Ttl: 300_000,  // 5 minutes in L2
});

await cache.connect();

// Get or load from database
const user = await cache.getOrLoad(
  `user:123`,
  () => db.users.findById(123),
  120_000, // 2 minutes TTL
);

// Invalidate after update
async function updateUser(id: string, data: dict) {
  const user = await db.users.update(id, data);
  await cache.invalidate(`user:${id}`);
  return user;
}
```

### 4. Cache Hit Rate Monitoring

```typescript
export class InstrumentedMultiLevelCache extends MultiLevelCache {
  private hits = { l1: 0, l2: 0, miss: 0 };

  async get<T>(key: string): Promise<T | undefined> {
    const l1Value = this.l1.get(key);
    if (l1Value !== undefined) {
      this.hits.l1++;
      return l1Value as T;
    }

    const l2Value = await this.l2.get(key);
    if (l2Value !== null) {
      this.hits.l2++;
      const parsed = JSON.parse(l2Value) as T;
      this.l1.set(key, parsed);
      return parsed;
    }

    this.hits.miss++;
    return undefined;
  }

  getHitRates() {
    const total = this.hits.l1 + this.hits.l2 + this.hits.miss;
    if (total === 0) return { l1: 0, l2: 0, miss: 0, total: 0 };
    return {
      l1: (this.hits.l1 / total * 100).toFixed(1) + '%',
      l2: (this.hits.l2 / total * 100).toFixed(1) + '%',
      miss: (this.hits.miss / total * 100).toFixed(1) + '%',
      total,
    };
  }

  resetStats() {
    this.hits = { l1: 0, l2: 0, miss: 0 };
  }
}
```

## How It Works

1. **L1 read** — checks the in-memory LRU cache first. If found, returns immediately with zero network overhead (sub-millisecond).
2. **L2 read** — on L1 miss, checks Redis. If found, populates L1 and returns. This adds ~1ms network latency but hits the shared cache.
3. **Cache miss** — if both L1 and L2 miss, the `loader` function fetches from the database. The result is written to both L1 and L2.
4. **Invalidation** — `invalidate` deletes from L1, L2, and publishes a pub/sub message. Other instances subscribe and delete their L1 entry, ensuring cross-instance consistency.
5. **Different TTLs** — L1 has a shorter TTL (30s) than L2 (300s). This allows L1 to refresh from L2 periodically, catching updates from other instances even without pub/sub.

## Variants

### Write-Through Cache

Write to both cache levels and the database in one operation:

```typescript
async setWithPersistence<T>(
  key: string,
  value: T,
  persist: (value: T) => Promise<void>,
  ttl?: number,
): Promise<void> {
  await persist(value);          // Database first
  await this.set(key, value, ttl); // Then both cache levels
}
```

### Read-Through with Background Refresh

Refresh L2 in the background when L1 is near expiry:

```typescript
async getOrRefresh<T>(
  key: string,
  loader: () => Promise<T>,
  ttl: number,
): Promise<T> {
  const l1Value = this.l1.get(key);
  if (l1Value !== undefined) {
    // Check if L1 entry is near expiry
    const remaining = this.l1.getRemainingTTL(key);
    if (remaining < ttl * 0.1) {
      // Refresh in background
      setImmediate(async () => {
        const fresh = await loader();
        await this.set(key, fresh, ttl);
      });
    }
    return l1Value as T;
  }
  return this.getOrLoad(key, loader, ttl);
}
```

### Python Implementation

```python
import json
import threading
from functools import lru_cache
from redis import Redis

class MultiLevelCache:
    def __init__(self, redis_client: Redis, l1_maxsize: int = 1000):
        self.l2 = redis_client
        self.pubsub = redis_client.pubsub()
        self._l1: dict[str, any] = {}
        self._l1_maxsize = l1_maxsize
        self._lock = threading.Lock()

    def get(self, key: str) -> any | None:
        with self._lock:
            if key in self._l1:
                return self._l1[key]

        l2_value = self.l2.get(key)
        if l2_value:
            value = json.loads(l2_value)
            with self._lock:
                self._l1[key] = value
                if len(self._l1) > self._l1_maxsize:
                    oldest = next(iter(self._l1))
                    del self._l1[oldest]
            return value

        return None

    def set(self, key: str, value: any, ttl: int = 300) -> None:
        with self._lock:
            self._l1[key] = value
        self.l2.setex(key, ttl, json.dumps(value, default=str))

    def invalidate(self, key: str) -> None:
        with self._lock:
            self._l1.pop(key, None)
        self.l2.delete(key)
        self.l2.publish("cache:invalidate", json.dumps({"key": key}))
```

## Best Practices

- **Set L1 TTL shorter than L2** — L1 refreshes from L2, catching updates from other instances
- **Use pub/sub for L1 invalidation** — without it, each instance serves stale L1 data until its TTL expires
- **Monitor hit rates per level** — a high L1 hit rate means the L1 size is well-tuned; a high L2 hit rate means L1 is too small
- **Handle Redis failures gracefully** — L1 should still serve cached data even if L2 is unreachable

## Common Mistakes

- **Setting the same TTL for L1 and L2** — L1 never refreshes from L2, so updates from other instances are invisible until full expiry
- **Not subscribing to invalidation** — each instance's L1 drifts independently, serving stale data
- **Making L1 too large** — consumes process memory; use a reasonable max size (500-5000 entries)
- **Invalidating L1 but not L2** — the next L1 miss re-populates from stale L2 data

## FAQ

**Q: What L1 size should I use?**
A: Start with 1000 entries. Monitor the L1 hit rate — if it is below 80%, increase the size. If memory usage is too high, decrease it.

**Q: What happens if Redis is down?**
A: L1 continues serving cached data. New cache misses bypass L2 and call the loader directly. When Redis recovers, L2 starts populating again.

**Q: Should I use LRU or LFU for L1?**
A: LRU is simpler and works well for most workloads. LFU (Least Frequently Used) is better when some keys are accessed much more often than others.

**Q: How do I test cross-instance invalidation?**
A: Start two instances, both connected to the same Redis. Set a key on instance A, invalidate it, and verify instance B's L1 no longer has the key.
