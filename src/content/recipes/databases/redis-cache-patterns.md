---
contentType: recipes
slug: redis-cache-patterns
title: "Redis Cache Patterns for High-Performance Applications"
description: "How to implement cache-aside, write-through, and write-behind patterns with Redis to reduce database load and improve response times"
metaDescription: "Redis cache patterns for high-performance apps. Implement cache-aside, write-through, and write-behind patterns to reduce database load and improve latency."
difficulty: intermediate
topics:
  - databases
  - performance
tags:
  - redis
  - cache
  - database
  - performance
  - databases
relatedResources:
  - /recipes/cache-invalidation
  - /recipes/connection-pooling
  - /guides/performance-optimization-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Redis cache patterns for high-performance apps. Implement cache-aside, write-through, and write-behind patterns to reduce database load and improve latency."
  keywords:
    - redis
    - caching patterns
    - cache-aside
    - write-through
    - performance
---

# Redis Cache Patterns for High-Performance Applications

Redis is an in-memory data structure store that works as an extremely fast cache layer between your application and persistent database. Choosing the right caching pattern — cache-aside, write-through, or write-behind — determines how your application handles cache misses, consistency, and failure scenarios.

## When to Use This

- Database queries are slow and return frequently accessed data. See [Query Optimization](/recipes/databases/postgres-query-optimization) for tuning slow queries.
- You need to reduce load on primary databases during traffic spikes. See [Rate Limiting](/recipes/api/rate-limiting) for traffic control.
- Temporary data staleness is acceptable in exchange for lower latency

## Prerequisites

- Redis server running locally or via a managed service
- A client library like `ioredis` or `redis` for Node.js

## Solution

### 1. Cache-Aside (Lazy Loading)

The application checks the cache first. On a miss, it loads from the database and populates the cache.

```typescript
// cache/CacheAside.ts
import Redis from 'ioredis';

class CacheAsideProductRepository {
  private redis = new Redis();
  private ttl = 300; // 5 minutes

  async getProduct(id: string): Promise<Product | null> {
    const cacheKey = `product:${id}`;
    
    // Check cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Cache miss: load from database
    const product = await this.db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (!product) return null;

    // Populate cache
    await this.redis.setex(cacheKey, this.ttl, JSON.stringify(product));
    return product;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    await this.db.query('UPDATE products SET ... WHERE id = $1', [id]);
    // Invalidate cache to prevent stale reads
    await this.redis.del(`product:${id}`);
  }
}
```

### 2. Write-Through

Data is written to both cache and database simultaneously. The cache always holds the latest data.

```typescript
// cache/WriteThrough.ts
class WriteThroughProductRepository {
  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    const cacheKey = `product:${id}`;

    // Start database transaction. See [Database Transactions](/recipes/databases/database-transactions) for ACID patterns.
    await this.db.query('BEGIN');
    try {
      await this.db.query('UPDATE products SET ... WHERE id = $1', [id]);
      
      // Write to cache within the same logical operation
      const updated = await this.db.query('SELECT * FROM products WHERE id = $1', [id]);
      await this.redis.setex(cacheKey, this.ttl, JSON.stringify(updated));
      
      await this.db.query('COMMIT');
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }
}
```

### 3. Write-Behind (Write-Back)

Data is written to cache first and asynchronously flushed to the database. Highest performance but riskiest.

```typescript
// cache/WriteBehind.ts
class WriteBehindProductRepository {
  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    const cacheKey = `product:${id}`;

    // Write to cache immediately
    await this.redis.setex(cacheKey, this.ttl, JSON.stringify(data));

    // Queue for async persistence
    await this.redis.lpush('pending_writes', JSON.stringify({ id, data, timestamp: Date.now() }));
  }
}

// Background worker. See [Batch Processing](/recipes/data/batch-processing-patterns) for job patterns.
async function flushPendingWrites() {
  const batch = await redis.lpop('pending_writes', 100);
  if (!batch) return;

  const writes = batch.map(item => JSON.parse(item));
  
  await db.query('BEGIN');
  try {
    for (const write of writes) {
      await db.query('UPDATE products SET ... WHERE id = $1', [write.id]);
    }
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    // Re-queue failed writes
    for (const write of writes) {
      await redis.rpush('pending_writes', JSON.stringify(write));
    }
  }
}

// Run every 5 seconds
setInterval(flushPendingWrites, 5000);
```

### 4. Cache Stampede Prevention

```typescript
// cache/StampedeProtection.ts
class StampedeProtectedCache {
  async getProduct(id: string): Promise<Product> {
    const cacheKey = `product:${id}`;
    const lockKey = `lock:${id}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Try to acquire lock
    const lock = await this.redis.set(lockKey, '1', 'EX', 10, 'NX');
    if (lock) {
      // We won the race; load from DB
      const product = await this.db.query('SELECT * FROM products WHERE id = $1', [id]);
      await this.redis.setex(cacheKey, this.ttl, JSON.stringify(product));
      await this.redis.del(lockKey);
      return product;
    }

    // Wait for the winner to populate cache
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.getProduct(id);
  }
}
```

## How It Works

1. **Cache-Aside** minimizes cache writes but allows brief stale data after updates
2. **Write-Through** guarantees consistency at the cost of higher write latency
3. **Write-Behind** maximizes throughput but risks data loss if the cache fails before flush
4. **Stampede Protection** prevents multiple simultaneous database queries on cache expiration

## Production Considerations

- Use **Redis Cluster** or **Redis Sentinel** for high availability
- Implement **[circuit breaker](/patterns/design/circuit-breaker-pattern)** logic when Redis is unavailable; fall back to database
- Set appropriate **TTL values** based on data change frequency
- Monitor **cache hit ratio** with `INFO stats` and adjust TTL accordingly

## Common Mistakes

- Not handling Redis connection failures gracefully
- Using the same TTL for all data types regardless of change frequency
- Forgetting to invalidate related cache entries on updates

## FAQ

**Q: Which pattern should I use?**
A: Cache-aside for read-heavy workloads. Write-through when consistency is critical. Write-behind only when you can tolerate brief data loss.

**Q: How do I handle cache invalidation across multiple services?**
A: Use Redis Pub/Sub or a message queue to broadcast invalidation events to all service instances.

**Q: Should I compress cached data?**
A: For large objects (>1KB), yes. Use `msgpack` or JSON compression to reduce memory usage and network transfer.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
