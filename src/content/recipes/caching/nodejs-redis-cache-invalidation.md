---
contentType: recipes
slug: nodejs-redis-cache-invalidation
title: "Implement Redis Cache Invalidation in Node.js"
description: "Invalidate Redis cache entries in Node.js with TTL expiry, explicit deletion, pattern-based clearing, and pub/sub-based distributed invalidation."
metaDescription: "Invalidate Redis cache in Node.js with TTL, explicit delete, pattern-based SCAN+DEL, and pub/sub distributed cache invalidation strategies."
difficulty: intermediate
topics:
  - caching
  - performance
  - api
tags:
  - nodejs
  - redis
  - cache-invalidation
  - pub-sub
  - caching
relatedResources:
  - /recipes/caching/python-redis-cache-decorator
  - /recipes/caching/nginx-reverse-proxy-cache
  - /guides/complete-guide-api-versioning-strategies
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Invalidate Redis cache in Node.js with TTL, explicit delete, pattern-based SCAN+DEL, and pub/sub distributed cache invalidation strategies."
  keywords:
    - nodejs redis cache invalidation
    - redis cache delete
    - cache invalidation strategies
    - redis pub/sub invalidation
    - redis scan pattern
---

## Overview

Cache invalidation is the hard part of caching. Redis offers several strategies: TTL-based expiry (automatic), explicit deletion (manual), pattern-based clearing (SCAN + DEL), and pub/sub-based distributed invalidation (notify other instances). Below: implementing each strategy in Node.js with `ioredis`, handling edge cases, and choosing the right approach per use case.

## When to Use This

- Any Node.js application using Redis as a cache layer
- When cached data changes and stale reads must be prevented
- Multi-instance deployments where one instance's cache invalidation must propagate to others
- Pattern-based cache clearing after bulk data updates

## Prerequisites

- Node.js 18+
- Redis 6+
- `ioredis` package

## Solution

### 1. Install ioredis

```bash
npm install ioredis
```

### 2. TTL-Based Invalidation (Automatic)

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: 'localhost', port: 6379 });

// Set with TTL — Redis auto-expires the key
async function cacheProduct(product) {
  await redis.set(
    `product:${product.id}`,
    JSON.stringify(product),
    'EX', 300 // 5 minutes
  );
}

async function getProduct(id) {
  const data = await redis.get(`product:${id}`);
  return data ? JSON.parse(data) : null;
}

// Redis automatically removes the key after 300 seconds.
// No manual invalidation needed — but stale data exists until expiry.
```

### 3. Explicit Deletion (Manual)

```javascript
// Delete a single key after data changes
async function updateProduct(productId, updates) {
  const product = await db.product.update(productId, updates);

  // Invalidate cache
  await redis.del(`product:${productId}`);

  // Optionally re-populate cache with fresh data
  await redis.set(`product:${productId}`, JSON.stringify(product), 'EX', 300);

  return product;
}

// Delete multiple keys at once
async function deleteProducts(productIds) {
  const keys = productIds.map(id => `product:${id}`);
  const deleted = await redis.del(...keys);
  console.log(`Deleted ${deleted} cache entries`);
}
```

### 4. Pattern-Based Invalidation (SCAN + DEL)

When you need to clear all keys matching a pattern (e.g., all product cache entries):

```javascript
async function invalidatePattern(pattern) {
  const stream = redis.scanStream({
    match: pattern,
    count: 100, // Scan 100 keys per batch
  });

  const pipeline = redis.pipeline();
  let deletedCount = 0;

  for await (const keys of stream) {
    if (keys.length > 0) {
      pipeline.del(...keys);
      deletedCount += keys.length;
    }
  }

  await pipeline.exec();
  console.log(`Deleted ${deletedCount} keys matching ${pattern}`);
}

// Usage: clear all product cache entries
await invalidatePattern('product:*');

// Clear all products in a specific category
await invalidatePattern('product:category:electronics:*');
```

### 5. Pipeline-Based Bulk Deletion

For large-scale invalidation, batch DEL commands in a pipeline:

```javascript
async function bulkInvalidate(prefix, batchSize = 1000) {
  let cursor = '0';
  let totalDeleted = 0;

  do {
    // SCAN returns [cursor, keys[]]
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH', `${prefix}*`,
      'COUNT', batchSize
    );

    if (keys.length > 0) {
      await redis.del(...keys);
      totalDeleted += keys.length;
    }

    cursor = nextCursor;
  } while (cursor !== '0');

  console.log(`Bulk invalidation: deleted ${totalDeleted} keys with prefix ${prefix}`);
  return totalDeleted;
}
```

### 6. Pub/Sub-Based Distributed Invalidation

When running multiple Node.js instances, one instance's `redis.del()` doesn't notify others. Use pub/sub to broadcast invalidation events:

```javascript
// Cache invalidation publisher (on the instance that made the change)
const invalidationChannel = 'cache:invalidate';

async function updateProductAndNotify(productId, updates) {
  const product = await db.product.update(productId, updates);

  // Delete local cache entry
  await redis.del(`product:${productId}`);

  // Notify all other instances to invalidate
  await redis.publish(invalidationChannel, JSON.stringify({
    type: 'delete',
    keys: [`product:${productId}`],
    timestamp: Date.now(),
  }));

  return product;
}

// Cache invalidation subscriber (on every instance)
const subscriber = new Redis({ host: 'localhost', port: 6379 });

subscriber.subscribe(invalidationChannel);

subscriber.on('message', (channel, message) => {
  if (channel !== invalidationChannel) return;

  const event = JSON.parse(message);

  switch (event.type) {
    case 'delete':
      event.keys.forEach(key => {
        localCache.delete(key); // Clear in-memory L1 cache
      });
      break;

    case 'pattern':
      // Clear all matching keys from local cache
      for (const key of localCache.keys()) {
        if (key.startsWith(event.prefix)) {
          localCache.delete(key);
        }
      }
      break;

    case 'flush':
      localCache.clear();
      break;
  }
});
```

### 7. Write-Through Invalidation

Update cache immediately on write — no stale window:

```javascript
async function writeThroughUpdate(productId, updates) {
  // Update database
  const product = await db.product.update(productId, updates);

  // Overwrite cache with fresh data
  await redis.set(`product:${productId}`, JSON.stringify(product), 'EX', 300);

  return product;
}

async function writeThroughDelete(productId) {
  await db.product.delete(productId);
  await redis.del(`product:${productId}`);
}
```

### 8. Cache-Aside with Lock (Prevent Stampede)

When a cache entry expires, prevent multiple requests from hitting the database simultaneously:

```javascript
async function getProductWithLock(productId) {
  const cacheKey = `product:${productId}`;
  const lockKey = `lock:${cacheKey}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Try to acquire lock
  const lockAcquired = await redis.set(lockKey, '1', 'NX', 'EX', 10);
  if (lockAcquired) {
    try {
      // This instance fetches from DB and populates cache
      const product = await db.product.findById(productId);
      if (product) {
        await redis.set(cacheKey, JSON.stringify(product), 'EX', 300);
      }
      return product;
    } finally {
      await redis.del(lockKey);
    }
  } else {
    // Another instance is fetching — wait and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    return getProductWithLock(productId);
  }
}
```

## How It Works

1. **TTL expiry**: Redis attaches a timestamp to each key with `EX` flag. A background process checks expired keys and removes them. The key may persist briefly after expiry until Redis's active expiry cycle finds it.
2. **DEL command**: `redis.del(key)` removes keys immediately. Multiple keys can be passed to a single DEL call for efficiency.
3. **SCAN-based pattern deletion**: `SCAN` iterates the keyspace in batches without blocking Redis (unlike `KEYS *`). Each batch returns a cursor for the next iteration. Combine with `DEL` in a pipeline for bulk deletion.
4. **Pub/sub invalidation**: One instance publishes an invalidation event. All subscribers receive it and clear their local L1 cache. Redis pub/sub is fire-and-forget — no persistence, no acknowledgment.
5. **Cache stampede prevention**: A Redis lock (`SET key NX EX timeout`) ensures only one instance fetches from the database on cache miss. Others wait and retry.

## Variants

### Lazy Invalidation (Soft Delete)

Mark cache entries as stale instead of deleting them:

```javascript
async function softInvalidate(productId) {
  // Set a flag that the next read should refresh
  await redis.set(`stale:product:${productId}`, '1', 'EX', 60);
}

async function getProduct(productId) {
  const isStale = await redis.exists(`stale:product:${productId}`);
  if (isStale) {
    // Force refresh from DB
    const product = await db.product.findById(productId);
    await redis.set(`product:${productId}`, JSON.stringify(product), 'EX', 300);
    await redis.del(`stale:product:${productId}`);
    return product;
  }
  // Normal cache read
  const cached = await redis.get(`product:${productId}`);
  return cached ? JSON.parse(cached) : null;
}
```

### Versioned Cache Keys

Bump a version number to invalidate all entries in a namespace:

```javascript
async function getProduct(productId) {
  const version = await redis.get('product_cache_version') || '1';
  const key = `product:v${version}:${productId}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const product = await db.product.findById(productId);
  await redis.set(key, JSON.stringify(product), 'EX', 300);
  return product;
}

async function invalidateAllProducts() {
  // Bump version — all old keys become invisible
  await redis.incr('product_cache_version');
}
```

### TTL Jitter

Prevent cache stampedes caused by synchronized expiry:

```javascript
async function cacheWithJitter(key, value, baseTTL = 300) {
  // Add random 0-60 seconds jitter
  const jitter = Math.floor(Math.random() * 60);
  await redis.set(key, JSON.stringify(value), 'EX', baseTTL + jitter);
}
```

## Best Practices

- **Use TTL as a safety net**: Even with explicit invalidation, always set a TTL. If you forget to invalidate, the cache self-heals.
- **Prefer explicit deletion over short TTLs**: Short TTLs cause unnecessary cache misses. Set longer TTLs and invalidate explicitly on data changes.
- **Use SCAN, not KEYS**: `KEYS *` blocks Redis for the entire scan duration. `SCAN` is non-blocking and safe for production.
- **Batch DEL in pipelines**: Deleting 10,000 keys one by one is slow. Use `redis.pipeline().del(...keys).exec()`.
- **Use pub/sub for multi-instance**: A single `redis.del()` doesn't clear other instances' L1 caches. Broadcast invalidation events.
- **Add TTL jitter**: Prevents synchronized expiry causing cache stampedes when many keys expire simultaneously.

## Common Mistakes

- **Using `KEYS *` in production**: Blocks Redis for seconds or minutes on large datasets. Use `SCAN` instead.
- **No TTL as fallback**: If explicit invalidation fails (bug, exception), stale data persists forever. Always set a TTL.
- **Invalidating too broadly**: `invalidatePattern('product:*')` clears all products when only one changed. Delete specific keys instead.
- **Not handling pub/sub disconnects**: If a subscriber loses connection, it misses invalidation events. Implement reconnection logic and periodic cache refreshes.
- **Race condition in cache-aside**: Between `get` (miss) and `set`, another request may have already fetched and cached. Use a lock to prevent stampedes.

## FAQ

**TTL vs explicit invalidation — which should I use?**

Both. Use TTL as a safety net (e.g., 5 minutes) and explicit deletion for immediate invalidation on data changes. TTL handles edge cases where explicit invalidation fails.

**How does Redis pub/sub differ from Redis Streams for cache invalidation?**

Pub/sub is fire-and-forget — if a subscriber is offline, it misses the event. Streams persist messages, so offline subscribers can catch up. Use pub/sub for simple invalidation, streams for guaranteed delivery.

**What is the difference between DEL and UNLINK?**

`DEL` is synchronous — Redis blocks while freeing memory. `UNLINK` removes the key from the keyspace immediately but frees memory asynchronously in a background thread. Use `UNLINK` for large values.

**How do I invalidate cache across multiple Redis instances?**

If using Redis Cluster, pub/sub broadcasts across all nodes. For separate Redis instances, each instance needs its own pub/sub channel, or use a dedicated message broker (RabbitMQ, Kafka) for cross-instance invalidation.

**Can I use Redis Lua scripts for atomic invalidation?**

Yes. A Lua script can check a condition and delete keys atomically. This is useful for compare-and-swap invalidation where you only delete if the cached value matches a specific version.
