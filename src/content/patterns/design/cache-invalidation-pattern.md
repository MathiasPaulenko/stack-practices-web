---
contentType: patterns
slug: cache-invalidation-pattern
title: "Cache Invalidation Pattern"
description: "Strategies for keeping cached data fresh: TTL expiration, explicit invalidation, write-through, and event-driven cache eviction."
metaDescription: "Cache invalidation pattern: keep cached data fresh with TTL, explicit eviction, event-driven invalidation. Implement with Redis pub/sub and Python, TypeScript."
difficulty: intermediate
topics:
  - caching
  - design
tags:
  - caching
  - invalidation
  - pattern
  - redis
  - ttl
  - eviction
  - pub-sub
  - python
  - typescript
relatedResources:
  - /patterns/design/cache-aside-pattern
  - /patterns/design/write-through-cache-pattern
  - /patterns/design/read-through-cache-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Cache invalidation pattern: keep cached data fresh with TTL, explicit eviction, event-driven invalidation. Implement with Redis pub/sub and Python, TypeScript."
  keywords:
    - cache invalidation
    - cache eviction strategies
    - ttl cache
    - redis pub/sub invalidation
    - event-driven cache
    - cache consistency
---

# Cache Invalidation Pattern

## Overview

Cache invalidation removes or updates stale entries so subsequent reads fetch fresh data. Without invalidation, the cache serves outdated data indefinitely. The challenge is knowing when data changes and acting on it quickly without adding excessive overhead.

There are four main invalidation strategies: TTL-based expiration, explicit invalidation on write, event-driven invalidation via pub/sub, and versioned keys. Each has different consistency guarantees and complexity levels.

## When to Use

- Cached data changes in the database and stale reads cause correctness issues
- You need to invalidate specific keys, not the entire cache
- Multiple application instances must stay in sync when one instance modifies data
- TTL alone is insufficient because the staleness window is too long
- You want to minimize cache misses while keeping data fresh

## Solution

### Strategy 1: TTL-Based Expiration

The simplest approach. Set a TTL on every cache entry. The cache automatically evicts expired entries. The next read misses and reloads fresh data.

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379)

def get_user(user_id: str) -> dict:
    key = f"user:{user_id}"
    cached = r.get(key)
    if cached:
        return json.loads(cached)

    user = db.query_one("SELECT * FROM users WHERE id = %s", [user_id])
    r.setex(key, 300, json.dumps(user))  # 5-minute TTL
    return user
```

### Strategy 2: Explicit Invalidation on Write

After updating the database, delete the corresponding cache key. The next read misses and reloads.

```python
def update_user(user_id: str, name: str, email: str):
    db.execute(
        "UPDATE users SET name = %s, email = %s WHERE id = %s",
        [name, email, user_id]
    )
    # Invalidate the cache entry
    r.delete(f"user:{user_id}")
    # Also invalidate any derived caches
    r.delete(f"user:{user_id}:profile")
    r.delete(f"users:list")
```

### Strategy 3: Event-Driven Invalidation with Redis Pub/Sub

When one instance updates data, it publishes an invalidation event. All instances subscribe and clear their local caches.

```python
import redis
import json
import threading

class CacheInvalidator:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.pubsub = redis_client.pubsub()
        self.pubsub.subscribe("cache:invalidate")
        self._listener = threading.Thread(target=self._listen, daemon=True)
        self._listener.start()

    def invalidate(self, key: str):
        self.redis.delete(key)
        self.redis.publish("cache:invalidate", json.dumps({"key": key}))

    def invalidate_pattern(self, pattern: str):
        for key in self.redis.scan_iter(pattern):
            self.redis.delete(key)
        self.redis.publish("cache:invalidate", json.dumps({"pattern": pattern}))

    def _listen(self):
        for message in self.pubsub.listen():
            if message["type"] != "message":
                continue
            data = json.loads(message["data"])
            if "key" in data:
                self.redis.delete(data["key"])
            elif "pattern" in data:
                for key in self.redis.scan_iter(data["pattern"]):
                    self.redis.delete(key)


invalidator = CacheInvalidator(redis.Redis(host='localhost', port=6379))

def update_user(user_id: str, name: str, email: str):
    db.execute(
        "UPDATE users SET name = %s, email = %s WHERE id = %s",
        [name, email, user_id]
    )
    invalidator.invalidate(f"user:{user_id}")
```

### TypeScript with Redis Pub/Sub

```typescript
import { createClient } from 'redis';

class CacheInvalidator {
  private publisher: ReturnType<typeof createClient>;
  private subscriber: ReturnType<typeof createClient>;

  constructor(publisher: ReturnType<typeof createClient>, subscriber: ReturnType<typeof createClient>) {
    this.publisher = publisher;
    this.subscriber = subscriber;
    this.subscriber.subscribe('cache:invalidate', (message) => {
      const data = JSON.parse(message);
      if (data.key) {
        this.publisher.del(data.key);
      } else if (data.pattern) {
        // Delete all matching keys
        this.publisher.keys(data.pattern).then((keys) => {
          if (keys.length > 0) this.publisher.del(keys);
        });
      }
    });
  }

  async invalidate(key: string): Promise<void> {
    await this.publisher.del(key);
    await this.publisher.publish('cache:invalidate', JSON.stringify({ key }));
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.publisher.keys(pattern);
    if (keys.length > 0) await this.publisher.del(keys);
    await this.publisher.publish('cache:invalidate', JSON.stringify({ pattern }));
  }
}
```

### Strategy 4: Versioned Keys

Instead of invalidating, change the key name. The old key expires naturally via TTL. This avoids race conditions between invalidation and concurrent reads.

```python
def get_user_version(user_id: str) -> str:
    version = r.get(f"user:{user_id}:version")
    if version is None:
        version = "1"
        r.set(f"user:{user_id}:version", version)
    return version

def get_user(user_id: str) -> dict:
    version = get_user_version(user_id)
    key = f"user:{user_id}:v{version}"

    cached = r.get(key)
    if cached:
        return json.loads(cached)

    user = db.query_one("SELECT * FROM users WHERE id = %s", [user_id])
    r.setex(key, 300, json.dumps(user))
    return user

def update_user(user_id: str, name: str, email: str):
    db.execute(
        "UPDATE users SET name = %s, email = %s WHERE id = %s",
        [name, email, user_id]
    )
    # Bump version — old key becomes orphaned and expires via TTL
    r.incr(f"user:{user_id}:version")
```

## Explanation

Each strategy trades complexity for consistency:

- **TTL** — the cache entry expires after a fixed duration. Simple, but data can be stale for up to the TTL duration. Good for data that changes infrequently or where staleness is acceptable.

- **Explicit invalidation** — the write path deletes the cache key after updating the database. The staleness window is near-zero. The risk is forgetting to invalidate a key after a write, leaving stale data until TTL expires.

- **Event-driven** — when multiple instances share a cache, one instance's invalidation must propagate to all others. Redis pub/sub broadcasts the invalidation event. All subscribers delete the key. This ensures cluster-wide consistency.

- **Versioned keys** — instead of deleting a key, the write path increments a version counter. The next read uses a new key (with the new version). The old key is orphaned and expires via TTL. This avoids race conditions where a read loads stale data between the database write and the cache delete.

## Variants

| Strategy | Consistency | Complexity | Best For |
|----------|-------------|------------|----------|
| TTL expiration | Eventual (within TTL) | Low | Infrequently changing data |
| Explicit invalidation | Strong (on next read) | Medium | Most use cases |
| Event-driven (pub/sub) | Strong (cluster-wide) | High | Multi-instance deployments |
| Versioned keys | Strong (no race) | Medium | High-concurrency reads |
| Tag-based invalidation | Strong (grouped) | High | Related cache entries |

## Best Practices

- **Always set a TTL as a safety net** — even with explicit invalidation, a TTL catches missed invalidations. Set it to the maximum acceptable staleness duration.
- **Invalidate derived caches** — if you cache `user:123` and also `user:123:profile`, invalidate both. Track dependencies or use tag-based invalidation.
- **Invalidate after the database write** — delete the cache key after the DB update succeeds. If you delete before and the DB write fails, the next read reloads stale data.
- **Use pub/sub for multi-instance** — if multiple application instances share a Redis cache, pub/sub ensures all instances invalidate consistently.
- **Monitor invalidation rate** — if you invalidate more than you cache, the cache is not effective. Consider longer TTLs or write-through caching.

## Common Mistakes

- **Forgetting to invalidate** — the most common cache bug. Every write path must invalidate corresponding cache keys. Use a wrapper or ORM hook to automate this.
- **Invalidating before the DB write** — if the DB write fails, the cache was cleared for nothing. The next read reloads the old data. Always invalidate after the write succeeds.
- **Not invalidating list caches** — updating a single user invalidates `user:123`, but `users:list` still contains the old user. Invalidate list and aggregate caches too.
- **Relying only on TTL** — a 5-minute TTL means data can be stale for 5 minutes. If the data changes, users see old data until the TTL expires. Add explicit invalidation for time-sensitive data.
- **Race condition on invalidate** — thread A reads from DB, thread B writes to DB and deletes cache key, thread A writes stale data to cache. Use versioned keys or locks to prevent this.

## Frequently Asked Questions

### What is the best cache invalidation strategy?

There is no single best strategy. Use TTL as a baseline safety net. Add explicit invalidation for data that changes and needs to be fresh immediately. Use event-driven invalidation for multi-instance deployments. Use versioned keys for high-concurrency scenarios where race conditions are a concern.

### What is the cache stampede problem?

When a popular cache key expires, many concurrent requests miss simultaneously and flood the database. This is not an invalidation problem but a TTL expiration problem. Use the cache-stampede-prevention pattern (locks, single-flight) to solve it.

### How does tag-based invalidation work?

Each cache entry is associated with tags (e.g. `user:123` has tags `["user", "user:123"]`). When a user is updated, you invalidate all entries with the `user:123` tag. This handles derived caches automatically. Redis does not support tags natively, but libraries like `redis-tag-cache` add this layer.

### Should I invalidate or update the cache on write?

Invalidating (delete) is simpler and safer. The next read reloads fresh data. Updating the cache on write (write-through) is faster for the next read but risks writing stale data if the DB write and cache update are not atomic. Prefer invalidation unless write-through is explicitly needed.
