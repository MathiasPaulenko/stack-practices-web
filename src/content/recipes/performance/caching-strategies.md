---
contentType: recipes
slug: caching-strategies
title: "Caching Strategies"
description: "Implement effective caching strategies for databases, APIs, and frontends using Redis, CDNs, and browser caches."
metaDescription: "Caching strategies for web applications: Redis, CDN, browser cache, cache invalidation, stale-while-revalidate, and cache stampede prevention."
difficulty: intermediate
topics:
  - performance
tags:
  - caching
  - performance
  - redis
  - cdn
relatedResources:
  - /guides/performance-optimization-guide
  - /patterns/proxy-pattern-caching
  - /recipes/redis-cache-patterns
  - /recipes/cache-invalidation
  - /recipes/cdn-edge-caching
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Caching strategies for web applications: Redis, CDN, browser cache, cache invalidation, stale-while-revalidate, and cache stampede prevention."
  keywords:
    - caching
    - performance
    - redis
    - cdn
---
## Overview

Caching is the single most effective technique for improving application performance. By storing frequently accessed data closer to consumers — in browser memory, CDN edges, or in-memory stores — you reduce latency, decrease database load, and improve user experience. Choosing the right caching strategy depends on data freshness requirements and read/write patterns.

## When to Use

Use this resource when:
- [Database queries](/recipes/performance/query-optimization) are becoming a bottleneck under load
- [API response times](/recipes/api/call-rest-api) exceed 200ms for read-heavy endpoints
- Serving static assets (images, JS, CSS) to global users via [CDN](/recipes/data/caching)
- Building high-traffic applications where stale data is acceptable

## Solution

### Redis Cache-Aside (Node.js)

```javascript
const redis = require('redis');
const client = redis.createClient();

async function getUser(userId) {
  const cacheKey = `user:${userId}`;
  
  // Try cache first
  const cached = await client.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Cache miss: query database
  const user = await db.users.findById(userId);
  if (user) {
    await client.setEx(cacheKey, 3600, JSON.stringify(user)); // TTL 1 hour
  }
  return user;
}
```

### Stale-While-Revalidate (HTTP)

```javascript
// Express middleware
app.get('/api/products', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  // Clients can use cached data for 5 minutes while revalidating in background
  res.json(products);
});
```

### CDN Edge Caching (CloudFront/Vercel)

```json
{
  "routes": [
    {
      "src": "/api/public/.*",
      "headers": {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400"
      }
    }
  ]
}
```

## Explanation

| Strategy | Pattern | Best For |
|----------|---------|----------|
| Cache-Aside | Application checks cache, falls back to DB | Read-heavy; simple to implement |
| Read-Through | Cache proxies DB transparently | Read-heavy; library handles logic |
| Write-Through | Writes update cache and DB simultaneously | Data consistency critical |
| Write-Behind | Writes update cache; async DB flush | Write-heavy; eventual consistency |
| Refresh-Ahead | Background refresh before expiry | Predictable access patterns |

**Cache invalidation approaches**:
- **Time-based (TTL)**: Simple but can serve stale data
- **Key-based**: Include version or hash in cache key
- **Event-based**: Invalidate on data change via message bus. See [cache invalidation](/recipes/performance/cache-invalidation).

## Variants

| Layer | Technology | Latency | Use Case |
|-------|------------|---------|----------|
| Browser | LocalStorage, IndexedDB | ~1ms | Offline-first apps |
| CDN | CloudFront, Cloudflare, Fastly | ~10-50ms | Static assets, API edge caching |
| Application | Redis, Memcached | ~1ms | Session store, hot data |
| Database | Query cache, materialized views | ~1-10ms | Repeated complex queries |
| Disk | Page cache, OS buffers | ~0.1ms | File system reads |

## Best Practices

- **Set TTLs based on data volatility**: User profiles (1h), product catalogs (24h), stock prices (10s)
- **Cache at multiple layers**: Browser + CDN + Redis + DB query cache
- **Use cache stampsede protection**: Lock during cache miss to prevent thundering herd
- **Monitor hit rates**: Below 80% signals misconfiguration or too-short TTL
- **Version your cache keys**: Include app version to invalidate on deploy

## Common Mistakes

1. **Caching everything**: Static data yes; user-specific or rapidly changing data no
2. **No invalidation strategy**: Stale data persists indefinitely without TTL or events
3. **Thundering herd**: 1000 requests hit a cold cache simultaneously; use locking
4. **Cache poisoning**: Unvalidated user input stored in shared cache affects all users
5. **Ignoring cache warming**: Production deploys start with empty caches and high latency

## Frequently Asked Questions

**Q: How do I prevent cache stampedes?**
A: Use a mutex or Redis SET NX (lock) so only one request rebuilds the cache while others wait.

**Q: Should I cache GraphQL responses?**
A: Yes, but cache by query hash + variables. [Apollo Server](/recipes/api/call-rest-api) has built-in response caching.

**Q: What is the difference between Redis and Memcached?**
A: Redis supports data structures (lists, sets, sorted sets) and persistence. Memcached is simpler and slightly faster for plain key-value caching.
