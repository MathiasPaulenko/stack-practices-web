---
contentType: recipes
slug: caching
title: "Caching & Memoization"
description: "How to cache expensive computations and API responses using in-memory, LRU, and distributed caches across Python, JavaScript, and Java."
metaDescription: "Practical caching and memoization examples in Python, JavaScript, and Java. Covers LRU, TTL, Redis, and cache invalidation strategies."
difficulty: intermediate
topics:
  - data
tags:
  - data
  - caching
  - java
relatedResources:
  - /recipes/call-rest-api
  - /recipes/pagination
  - /patterns/design/singleton-pattern
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
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
    - performance optimization
---

## Overview

Caching stores the result of expensive computations so that subsequent requests for the same data can be served faster. Memoization is a specific form of caching where function return values are cached based on their arguments.

Caching is one of the most useful performance optimizations, but it introduces complexity: stale data, cache invalidation, and distributed consistency.

## When to Use

Use this recipe when:

- Calling expensive database queries or [API endpoints](/recipes/api/call-rest-api) repeatedly
- Computing complex mathematical or statistical results
- Serving static or slowly-changing configuration data
- Reducing latency in high-traffic read-heavy systems. See [Pagination](/recipes/api/pagination) for managing large result sets.
- Offloading load from downstream services

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
    this.cache.set(key, value); // Move to end (most recent)
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

### Java

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

## Cache Invalidation Strategies

| Strategy | When to Use | Trade-off |
|----------|-------------|-----------|
| **TTL (Time To Live)** | Data changes predictably | May serve stale data briefly |
| **Write-through** | Consistency is critical | Slower writes, simpler reads |
| **Write-behind** | High write throughput | Risk of data loss on crash |
| **Cache-aside** | Flexibility, read-heavy | Application manages cache logic |
| **Eviction (LRU/LFU)** | Memory constraints | May evict hot data prematurely |

## What Works

- **Cache at the right level**: Don't cache everything. Cache the most expensive and most frequently accessed data.
- **Set TTLs thoughtfully**: Too short = useless. Too long = stale data.
- **Monitor hit rates**: A cache with <80% hit rate is usually not worth the complexity. See [Logging](/recipes/api/logging) for cache metrics.
- **Handle cache failures gracefully**: If Redis is down, fall back to the database. Don't fail the request.
- **Version cache keys**: Include the data version or app version in the key to prevent stale data after deployments.
- **Invalidate proactively**: Clear cache entries when underlying data changes, not just when TTL expires.

## Common Mistakes

- Caching data that changes too frequently or is rarely requested
- Not handling cache stampede (thundering herd) when TTL expires
- Storing unbounded caches that grow until out-of-memory
- Ignoring cache consistency in distributed systems
- Forgetting to invalidate cache after mutations

## Frequently Asked Questions

**Q: What is cache stampede and how do I prevent it?**
A: Cache stampede happens when many requests simultaneously hit a missing cache key. Use locking, per-key semaphores, or probabilistic early expiration.

**Q: When should I use Redis instead of in-memory caching?**
A: Use Redis when you need shared cache across multiple application instances, persistence, or advanced data structures. See [Connection Pooling](/recipes/performance/connection-pooling) for managing Redis connections.

**Q: Should I cache API responses?**
A: Yes, if the data is cacheable and the endpoint is read-heavy. Use the Cache-Control header to communicate cacheability to clients and CDNs.
