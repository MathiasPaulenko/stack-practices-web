---
contentType: recipes
slug: caching
title: "Caching & Memoization in Python, JavaScript, and Java"
description: "How to cache expensive computations and API responses using in-memory LRU, TTL, and distributed caches across Python, JavaScript, and Java."
metaDescription: "Practical caching and memoization examples in Python, JavaScript, and Java. Covers LRU, TTL, Redis, and cache invalidation strategies."
difficulty: intermediate
topics:
  - data
  - performance
tags:
  - caching
  - memoization
  - lru
  - ttl
  - redis
  - performance
  - python
  - javascript
  - java
relatedResources:
  - /recipes/redis-cache-aside-pattern
  - /recipes/nodejs-in-memory-cache-lru
  - /recipes/java-caffeine-cache-configuration
  - /recipes/python-redis-cache-decorator
  - /recipes/multi-level-cache-l1-l2
  - /recipes/redis-distributed-lock
lastUpdated: "2026-08-22"
publishedAt: "2026-06-10"
author: Mathias Paulenko
seo:
  metaDescription: "Practical caching and memoization examples in Python, JavaScript, and Java. Covers LRU, TTL, Redis, and cache invalidation strategies."
  keywords:
    - caching
    - memoization
    - lru cache
    - redis cache
    - cache invalidation
    - python caching
    - javascript caching
    - java caching
    - performance
---

Caching is one of the cheapest ways to speed up repeated work. You compute something once, store the
result, and serve the next request without doing the work again. Memoization is just caching for
function return values, keyed by the arguments you passed in. The trade-off is added complexity:
stale data, invalidation, and consistency headaches, especially in distributed systems.

## When to Use

- An expensive database query or API call is hit again and again.
- A function performs heavy mathematical or statistical computation.
- The data changes slowly, such as configuration or reference data.
- Latency matters in a read-heavy, high-traffic system.
- You want to take load off a downstream service. See also [Deep Clone Objects in JavaScript: Beyond JSON.parse](/recipes/deep-clone-structured).

## When NOT to Use

- The underlying data changes faster than you can invalidate the cache.
- Strong consistency is required and even a short stale read is unacceptable.
- The working set is larger than the available cache memory with no eviction policy in place.
- You haven't measured the bottleneck. Cache only after profiling.

## Solution

### Python

```python
from functools import lru_cache
from cachetools import TTLCache

# Built-in LRU memoization
@lru_cache(maxsize=128)
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(100))  # Instant, cached

# TTL cache with expiration
api_cache = TTLCache(maxsize=100, ttl=300)  # 5 minutes

def fetch_user(user_id):
    if user_id in api_cache:
        return api_cache[user_id]
    user = db.query("SELECT * FROM users WHERE id = %s", user_id)
    api_cache[user_id] = user
    return user
```

### JavaScript

```javascript
// Simple memoization
function memoize(fn) {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

const fib = memoize((n) => (n < 2 ? n : fib(n - 1) + fib(n - 2)));
console.log(fib(100)); // Instant

// LRU cache with size limit
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }
  get(key) {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }
  set(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.capacity) {
      const first = this.cache.keys().next().value;
      this.cache.delete(first);
    }
    this.cache.set(key, value);
  }
}
```

### Java with Caffeine

```java
import com.github.benmanes.caffeine.cache.*;

Cache<String, User> userCache = Caffeine.newBuilder()
    .maximumSize(100)
    .expireAfterWrite(Duration.ofMinutes(5))
    .build();

// Get or compute
User user = userCache.get(userId, id -> db.findById(id));

// Manual put
userCache.put(userId, updatedUser);

// Invalidate
userCache.invalidate(userId);
```

### Redis cache-aside

```python
import redis
import json

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def get_user(user_id):
    cached = r.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)
    user = db.find(user_id)
    r.setex(f"user:{user_id}", 300, json.dumps(user))
    return user
```

## Explanation

A cache sits between the caller and the expensive data source. On a hit, it returns the stored
value. On a miss, it fetches, stores, and returns the value. TTL limits staleness, maximum size
triggers eviction, and invalidation removes entries when the underlying data changes.

## Variants

| Strategy | When to use | Trade-off |
| --- | --- | --- |
| TTL | Data changes predictably | May serve stale data briefly |
| Write-through | Consistency is critical | Slower writes, simpler reads |
| Write-behind | High write throughput | Risk of data loss on crash |
| Cache-aside | Flexibility, read-heavy | Application manages cache logic |
| Eviction (LRU/LFU) | Memory constraints | May evict hot data prematurely |

## Best Practices

- Cache the most expensive and most frequently accessed data, not every value in sight.
- Set TTLs carefully. Too short makes the cache useless; too long serves stale data.
- Monitor hit rates. A cache below 80% is usually not worth the trouble.
- Handle cache failures gracefully. If Redis goes down, fall back to the database.
- Version cache keys or include the app version to avoid stale data after deployments.
- Invalidate proactively when the source data changes, instead of waiting for TTL.

## Common Mistakes

- Caching data that changes too frequently or is rarely requested.
- Not handling cache stampede when a popular key expires.
- Storing unbounded caches that grow until they run out of memory.
- Ignoring cache consistency in distributed systems.
- Forgetting to invalidate the cache after writes.

## FAQ

### What is cache stampede and how do I prevent it?

A cache stampede happens when many requests hit a missing cache key at the same time. Use locking,
per-key semaphores, or probabilistic early expiration to reduce the load on the source.

### When should I use Redis instead of an in-memory cache?

Use Redis when you need a shared cache across several instances, persistence, or advanced data
structures. In-memory caches are faster, but they're local to a single process.

### Should I cache API responses?

Yes, if the data is cacheable and the endpoint is read-heavy. Use the `Cache-Control` header to tell
clients and CDNs that the response can be cached.

### How do I choose between LRU and LFU eviction?

LRU removes the least recently used entry and works well when access patterns have temporal
locality. LFU removes the least frequently used entry and works better when a small set of keys is
accessed heavily over time.

### How do I keep a cache consistent across services?

Use short TTLs, pub/sub invalidation, or write-through patterns. If you need strong consistency,
caching may not be the right tool at all.
