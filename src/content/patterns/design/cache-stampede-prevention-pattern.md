---



contentType: patterns
slug: cache-stampede-prevention-pattern
title: "Cache Stampede Prevention Pattern"
description: "Prevent thundering herd cache misses with locks, single-flight, and early refresh strategies to protect the database from concurrent reloads."
metaDescription: "Cache stampede prevention: stop thundering herd misses with locks and single-flight. Protect databases from concurrent reloads in Python and TypeScript."
difficulty: advanced
topics:
  - caching
  - design
tags:
  - caching
  - stampede
  - thundering-herd
  - pattern
  - single-flight
  - distributed-lock
  - redis
  - python
  - typescript
relatedResources:
  - /patterns/read-through-cache-pattern
  - /patterns/cache-invalidation-pattern
  - /patterns/two-level-cache-pattern
  - /patterns/refresh-ahead-cache-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Cache stampede prevention: stop thundering herd misses with locks and single-flight. Protect databases from concurrent reloads in Python and TypeScript."
  keywords:
    - cache stampede
    - thundering herd cache
    - single-flight cache
    - cache lock pattern
    - redis distributed lock cache
    - cache miss prevention



---

# Cache Stampede Prevention Pattern

## Overview

A cache stampede (also called thundering herd or dogpile) occurs when a popular cache key expires and many concurrent requests miss simultaneously. All miss requests flood the database with the same query, causing a spike in database load that can cascade into timeouts and outages.

The stampede prevention pattern ensures only one request reloads the data after a cache miss. Other concurrent requests wait for the first request to finish and then read the freshly cached value. This reduces database load from N concurrent queries to 1.

## When to Use

- A cache key with high read concurrency expires and causes database spikes
- You see periodic latency spikes correlated with cache TTL expiration
- Database load spikes when popular entries are evicted or invalidated
- Multiple application instances share a cache and all miss at the same time
- You want to protect the database from burst load during cache misses

## Solution

### Strategy 1: Single-Flight with In-Memory Lock (Single Instance)

```python
import threading
import time
import redis
import json

class SingleFlightCache:
    def __init__(self, redis_client: redis.Redis, ttl: int = 3600):
        self.redis = redis_client
        self.ttl = ttl
        self._locks = {}
        self._lock_guard = threading.Lock()

    def get_or_load(self, key: str, loader: callable) -> any:
        cached = self.redis.get(key)
        if cached is not None:
            return json.loads(cached)

        # Single-flight: only one thread loads, others wait
        with self._lock_guard:
            if key in self._locks:
                event = self._locks[key]
            else:
                event = threading.Event()
                self._locks[key] = event
                event = None  # This thread will load

        if event is not None:
            # Wait for the loading thread to finish
            event.wait(timeout=30)
            # Try reading from cache again
            cached = self.redis.get(key)
            if cached is not None:
                return json.loads(cached)
            # If still not cached, load ourselves (timeout or loader failure)
            return self._load_and_cache(key, loader)

        # This thread is the loader
        try:
            return self._load_and_cache(key, loader)
        finally:
            with self._lock_guard:
                evt = self._locks.pop(key, None)
            if evt:
                evt.set()  # Notify waiting threads

    def _load_and_cache(self, key: str, loader: callable) -> any:
        value = loader()
        self.redis.setex(key, self.ttl, json.dumps(value))
        return value


cache = SingleFlightCache(redis.Redis(host='localhost', port=6379))

def get_user(user_id: str) -> dict:
    return cache.get_or_load(
        f"user:{user_id}",
        lambda: db.query_one("SELECT * FROM users WHERE id = %s", [user_id])
    )
```

### Strategy 2: Distributed Lock with Redis (Multi-Instance)

```python
import redis
import json
import time
import uuid

class StampedeSafeCache:
    def __init__(self, redis_client: redis.Redis, ttl: int = 3600, lock_timeout: int = 30):
        self.redis = redis_client
        self.ttl = ttl
        self.lock_timeout = lock_timeout

    def get_or_load(self, key: str, loader: callable) -> any:
        cached = self.redis.get(key)
        if cached is not None:
            return json.loads(cached)

        lock_key = f"lock:{key}"
        lock_value = str(uuid.uuid4())

        # Try to acquire lock
        acquired = self.redis.set(lock_key, lock_value, nx=True, ex=self.lock_timeout)
        if not acquired:
            # Another instance is loading — wait and retry
            return self._wait_and_read(key, loader)

        try:
            # Double-check cache after acquiring lock
            cached = self.redis.get(key)
            if cached is not None:
                return json.loads(cached)

            value = loader()
            self.redis.setex(key, self.ttl, json.dumps(value))
            return value
        finally:
            # Release lock only if we still own it
            self._release_lock(lock_key, lock_value)

    def _wait_and_read(self, key: str, loader: callable) -> any:
        for _ in range(10):
            time.sleep(0.5)
            cached = self.redis.get(key)
            if cached is not None:
                return json.loads(cached)

        # Timeout waiting — load directly (fallback)
        value = loader()
        self.redis.setex(key, self.ttl, json.dumps(value))
        return value

    def _release_lock(self, lock_key: str, lock_value: str):
        # Lua script for atomic check-and-delete
        script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """
        self.redis.eval(script, 1, lock_key, lock_value)


cache = StampedeSafeCache(redis.Redis(host='localhost', port=6379))
```

### TypeScript with Redis Distributed Lock

```typescript
import { createClient } from 'redis';
import { randomUUID } from 'crypto';

class StampedeSafeCache {
  private redis: ReturnType<typeof createClient>;
  private ttl: number;
  private lockTimeout: number;

  constructor(redisClient: ReturnType<typeof createClient>, ttl = 3600, lockTimeout = 30) {
    this.redis = redisClient;
    this.ttl = ttl;
    this.lockTimeout = lockTimeout;
  }

  async getOrLoad<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }

    const lockKey = `lock:${key}`;
    const lockValue = randomUUID();

    const acquired = await this.redis.set(lockKey, lockValue, { NX: true, EX: this.lockTimeout });
    if (!acquired) {
      return this.waitAndRead(key, loader);
    }

    try {
      // Double-check after acquiring lock
      const doubleCheck = await this.redis.get(key);
      if (doubleCheck !== null) {
        return JSON.parse(doubleCheck) as T;
      }

      const value = await loader();
      await this.redis.set(key, JSON.stringify(value), { EX: this.ttl });
      return value;
    } finally {
      await this.releaseLock(lockKey, lockValue);
    }
  }

  private async waitAndRead<T>(key: string, loader: () => Promise<T>): Promise<T> {
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const cached = await this.redis.get(key);
      if (cached !== null) {
        return JSON.parse(cached) as T;
      }
    }
    // Timeout — load directly as fallback
    const value = await loader();
    await this.redis.set(key, JSON.stringify(value), { EX: this.ttl });
    return value;
  }

  private async releaseLock(lockKey: string, lockValue: string): Promise<void> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.redis.eval(script, { keys: [lockKey], arguments: [lockValue] });
  }
}
```

### Strategy 3: Early Refresh (Probabilistic TTL)

Instead of waiting for expiration, randomly refresh entries before they expire. This spreads reloads over time, avoiding a synchronized miss.

```python
import random
import time

def get_or_load_probabilistic(key: str, loader: callable, ttl: int = 3600, early_refresh_window: int = 300) -> any:
    cached = r.get(key)
    if cached is not None:
        data = json.loads(cached)
        ttl_remaining = r.ttl(key)

        # Probabilistic early refresh: with increasing probability as TTL approaches 0
        if ttl_remaining < early_refresh_window:
            refresh_probability = 1 - (ttl_remaining / early_refresh_window)
            if random.random() < refresh_probability:
                # This request triggers a refresh; others still get cached data
                try:
                    value = loader()
                    r.setex(key, ttl, json.dumps(value))
                    return value
                except Exception:
                    pass  # Return stale data on refresh failure

        return data

    # Full miss — load and cache
    value = loader()
    r.setex(key, ttl, json.dumps(value))
    return value
```

## Explanation

The stampede problem arises because all requests check the cache at the same time, find it expired, and independently reload. The three strategies solve this differently:

- **Single-flight** — the first request to miss acquires a lock or flag. Subsequent miss requests see the lock and wait. When the first request finishes, it populates the cache and releases the lock. Waiting requests then read the cached value.

- **Distributed lock** — for multi-instance deployments, an in-memory lock does not work because each instance has its own memory. A Redis distributed lock (`SET NX EX`) ensures only one instance reloads. Other instances poll the cache until it is populated.

- **Early refresh** — instead of preventing concurrent reloads, this strategy spreads them over time. As the TTL approaches expiration, each request has an increasing probability of triggering a refresh. This avoids a synchronized miss when the TTL expires.

## Variants

| Strategy | Scope | Complexity | Best For |
|----------|-------|------------|----------|
| Single-flight (in-memory) | Single instance | Low | Single-process applications |
| Distributed lock (Redis) | Multi-instance | Medium | Multi-instance deployments |
| Probabilistic early refresh | Any | Low | High-traffic keys with long TTLs |
| Lease with timeout | Multi-instance | Medium | Strict single-loader guarantee |
| Request coalescing | Single instance | Low | Batch-oriented workloads |

## Best Practices


- For a deeper guide, see [Cache Invalidation Pattern](/patterns/cache-invalidation-pattern/).

- **Set a lock timeout** — if the loader hangs or crashes, the lock must expire so other requests can proceed. Set it to the maximum acceptable wait time (e.g. 30 seconds).
- **Double-check after acquiring lock** — between the cache miss and lock acquisition, another request may have already populated the cache. Check again before loading.
- **Use probabilistic refresh for high-traffic keys** — it is simpler than locks and spreads load naturally. The early refresh window should be 5-10% of the TTL.
- **Fall back to stale data** — if the loader fails, return the last cached value (even if expired) instead of failing the request. This degrades gracefully.
- **Monitor lock contention** — if many requests are waiting for locks, the cache TTL may be too short or the loader too slow.

## Common Mistakes

- **No lock timeout** — if the loader crashes, the lock is held forever. All subsequent requests wait indefinitely. Always set a timeout.
- **Not double-checking after lock** — without a double-check, you may reload data that another request already cached. This wastes resources but does not cause correctness issues.
- **Using in-memory locks in multi-instance** — an in-memory lock only works within one process. In a multi-instance deployment, use a distributed lock (Redis).
- **Locking the entire cache** — locking per key, not globally. A global lock serializes all cache misses, creating a bottleneck.
- **Not handling lock acquisition failure** — if `SET NX` fails, the request must wait and retry, not proceed to load independently. This defeats the purpose of the lock.

## Frequently Asked Questions

### What is the difference between cache stampede and cache penetration?

Cache stampede occurs when a valid key expires and many requests miss simultaneously. Cache penetration occurs when requests query for keys that do not exist in the cache or database, causing every request to hit the database. Different problems, different solutions.

### Is single-flight enough for multi-instance deployments?

No. Single-flight uses in-memory locks that are per-process. In a multi-instance deployment, each instance has its own locks. Use a distributed lock (Redis `SET NX`) to coordinate across instances.

### How does probabilistic early refresh work?

As the TTL approaches zero, each request has an increasing probability of triggering a refresh. For example, with a 1-hour TTL and a 5-minute refresh window, a request at 4 minutes before expiration has a 20% chance of refreshing. This spreads reloads over time, preventing a synchronized miss.

### Should I return stale data while refreshing?

Yes. If the cache has a value (even expired), return it while one request refreshes in the background. This is called stale-while-revalidate. It keeps the application responsive while the cache is being updated.
