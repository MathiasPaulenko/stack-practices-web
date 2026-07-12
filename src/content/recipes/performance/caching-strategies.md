---


contentType: recipes
slug: caching-strategies
title: "Caching Strategies"
description: "Implement useful caching strategies for databases, APIs, and frontends using Redis, CDNs, and browser caches."
metaDescription: "Caching strategies for web applications: Redis, CDN, browser cache, cache invalidation, stale-while-revalidate, and cache stampede prevention."
difficulty: intermediate
topics:
  - performance
tags:
  - caching
  - performance
  - redis
  - cdn
  - optimization
relatedResources:
  - /guides/performance-optimization-guide
  - /patterns/proxy-pattern-caching
  - /recipes/redis-cache-patterns
  - /recipes/cache-invalidation
  - /recipes/cdn-edge-caching
  - /guides/complete-guide-redis-caching-strategies
  - /guides/caching-strategies-guide
lastUpdated: "2026-07-09"
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

Caching is the single most useful technique for improving application performance. By storing frequently accessed data closer to consumers — in browser memory, CDN edges, or in-memory stores — you reduce latency, decrease database load, and improve user experience. Choosing the right caching strategy depends on data freshness requirements and read/write patterns.

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

## What Works

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

## Advanced: Cache Stampede Protection

```javascript
const redis = require('redis');
const client = redis.createClient();

async function getWithLock(key, ttl, builder) {
  const cached = await client.get(key);
  if (cached) return JSON.parse(cached);

  const lockKey = `${key}:lock`;
  const acquired = await client.set(lockKey, '1', { NX: true, EX: 10 });

  if (!acquired) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return getWithLock(key, ttl, builder);
  }

  try {
    const value = await builder();
    await client.setEx(key, ttl, JSON.stringify(value));
    return value;
  } finally {
    await client.del(lockKey);
  }
}
```

This pattern uses Redis `SET NX` to acquire a lock. Only one request fetches data from the database while others poll until the cache is populated. The lock expires after 10 seconds to prevent deadlocks if the builder crashes.

## Advanced: Multi-Level Caching

```python
import redis
import hashlib
import json

r = redis.Redis()

def get_user(user_id):
    # L1: Local in-memory cache (process-level)
    if hasattr(get_user, '_cache') and user_id in get_user._cache:
        return get_user._cache[user_id]

    # L2: Redis shared cache
    key = f'user:{user_id}'
    cached = r.get(key)
    if cached:
        user = json.loads(cached)
        if not hasattr(get_user, '_cache'):
            get_user._cache = {}
        get_user._cache[user_id] = user
        return user

    # L3: Database
    user = db.users.find_by_id(user_id)
    if user:
        r.setex(key, 3600, json.dumps(user))
        if not hasattr(get_user, '_cache'):
            get_user._cache = {}
        get_user._cache[user_id] = user
    return user
```

Multi-level caching combines L1 (in-process), L2 (Redis), and L3 (database). L1 handles hot keys with sub-millisecond latency. L2 shares cached data across instances. L3 is the source of truth. Invalidate L1 on deploy by restarting the process or using a version prefix in keys.

## Advanced: Cache Key Design

```python
def make_cache_key(resource, params, version='v1'):
    param_hash = hashlib.md5(
        json.dumps(params, sort_keys=True).encode()
    ).hexdigest()[:12]
    return f'{version}:{resource}:{param_hash}'
```

Good cache keys are deterministic, versioned, and namespace-prefixed. Include a version segment to invalidate all keys on deploy. Hash parameter combinations to keep keys short and collision-resistant. Avoid embedding user IDs in shared cache keys — use a separate namespace for per-user data.

## Advanced: CDN Invalidation

```bash
# CloudFront invalidation via AWS CLI
aws cloudfront create-invalidation \
  --distribution-id E123ABC \
  --paths "/*"

# Cloudflare purge via API
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything": false, "files": ["https://example.com/api/products"]}'
```

CDN invalidation removes cached responses from edge locations. Purge specific URLs when possible — full purges are expensive and rate-limited. For predictable content changes, use versioned URLs (`/api/v2/products`) instead of invalidating old paths. Set `s-maxage` appropriately so edges self-expire without explicit invalidation.

## When to Avoid

- **Real-time data**: Stock trading, live sports scores, auction prices — staleness causes financial impact
- **Compliance-sensitive data**: HIPAA, GDPR contexts where cached copies may violate data handling agreements
- **Write-heavy workloads**: Cache hit rate stays low because data changes before it expires
- **Small datasets**: If the entire dataset fits in memory, caching adds complexity without benefit

## Advanced: Stale-While-Revalidate Implementation

```javascript
async function swr(key, ttl, builder) {
  const cached = await client.get(key);
  const staleFlag = await client.get(`${key}:stale`);

  if (cached) {
    // Return cached data immediately
    const data = JSON.parse(cached);

    // If stale, trigger background refresh
    if (staleFlag === '1') {
      builder().then(value => {
        client.setEx(key, ttl, JSON.stringify(value));
        client.del(`${key}:stale`);
      }).catch(err => console.error('SWR refresh failed:', err));
    }
    return data;
  }

  // Cold cache — fetch and cache
  const value = await builder();
  await client.setEx(key, ttl, JSON.stringify(value));
  return value;
}
```

Stale-While-Revalidate serves cached data even after it becomes stale, then refreshes in the background. Set a stale flag at 80% of TTL. When a request sees the stale flag, it gets the cached data immediately and triggers an async refresh. This eliminates cache stampedes because no request waits for a rebuild.

## Advanced: Cache Warming on Deploy

```python
import redis
import asyncio

r = redis.Redis()

async def warm_cache(keys, builder):
    tasks = []
    for key in keys:
        tasks.append(warm_single(key, builder))
    await asyncio.gather(*tasks)

async def warm_single(key, builder):
    value = await builder(key)
    r.setex(key, 3600, json.dumps(value))
```

Cache warming pre-populates Redis before traffic arrives. Run this as a post-deploy step in CI/CD. Identify hot keys from analytics or `redis-cli --hotkeys`. Warm the top 100-500 keys to cover 80% of traffic. This prevents cold-cache latency spikes after deploys.

## Frequently Asked Questions

### How do I prevent cache stampedes?

Use a mutex or Redis `SET NX` (lock) so only one request rebuilds the cache while others wait. Alternative: use early refresh with jitter so cached values refresh before expiry, distributing load.

### Should I cache GraphQL responses?

Yes, but cache by query hash + variables. [Apollo Server](/recipes/api/call-rest-api) has built-in response caching with `cacheControl` directives. For persisted queries, cache by query ID.

### What is the difference between Redis and Memcached?

Redis supports data structures (lists, sets, sorted sets) and persistence. Memcached is simpler and slightly faster for plain key-value caching. Choose Redis when you need atomic operations, pub/sub, or persistence. Choose Memcached for raw speed with simple key-value pairs.

### When should I avoid caching?

Avoid caching when data changes frequently and staleness is unacceptable (e.g., banking balances, inventory during flash sales). Also avoid for low-traffic endpoints where the cache hit rate stays below 20% — the overhead of cache management outweighs the benefit.

### How do I measure cache effectiveness?

Track hit rate, miss rate, eviction rate, and average latency. Redis `INFO stats` provides `keyspace_hits` and `keyspace_misses`. Aim for 80%+ hit rate on hot keys. Use `redis-cli --bigkeys` to identify keys consuming disproportionate memory.
