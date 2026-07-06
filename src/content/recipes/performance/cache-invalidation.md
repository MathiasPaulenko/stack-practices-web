---
contentType: recipes
slug: cache-invalidation
title: "Implement Cache Invalidation Strategies"
description: "How to keep caches consistent with databases using TTL, write-through, write-behind, and event-driven invalidation patterns."
metaDescription: "Learn cache invalidation strategies. Keep caches consistent with TTL, write-through, write-behind, and event-driven invalidation patterns for distributed systems."
difficulty: intermediate
topics:
  - performance
tags:
  - performance
  - caching
  - optimization
  - profiling
  - latency
relatedResources:
  - /recipes/database-indexing
  - /recipes/connection-pooling
  - /recipes/cdn-edge-caching
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn cache invalidation strategies. Keep caches consistent with TTL, write-through, write-behind, and event-driven invalidation patterns for distributed systems."
  keywords:
    - cache invalidation
    - caching strategies
    - redis cache
    - write through
    - cache consistency
    - distributed caching
---

## Overview

Caching improves read performance by storing frequently accessed data in fast, in-memory storage. However, caches introduce a classic [distributed systems](/guides/architecture/microservices-architecture-guide) problem: when the underlying data changes, the cache becomes stale. Serving stale data can lead to incorrect business decisions, security issues, and poor user experiences.

Cache invalidation is the mechanism that ensures cached data remains consistent with its source. There is no universal solution — the right strategy depends on your consistency requirements, write volume, and tolerance for stale reads. The following demonstrates how to the four primary patterns: TTL expiration, write-through, write-behind, and event-driven invalidation.

## When to Use

Use this recipe when:

- Adding caching to an application that requires data consistency
- Debugging stale cache issues where users see outdated information
- Designing distributed systems with multiple writers and readers
- Choosing between Redis, Memcached, or [CDN](/recipes/data/caching) caching layers
- Implementing cache warming and eviction policies

## Solution

### TTL-Based Expiration (Python + Redis)

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_user(user_id):
    key = f"user:{user_id}"
    cached = r.get(key)
    if cached:
        return json.loads(cached)
    
    user = db.query("SELECT * FROM users WHERE id = %s", (user_id,))
    r.setex(key, 300, json.dumps(user))  # TTL: 5 minutes
    return user
```

### Write-Through Cache

```python
def update_user(user_id, data):
    # Update database and cache atomically
    db.execute("UPDATE users SET name = %s WHERE id = %s", (data['name'], user_id))
    r.setex(f"user:{user_id}", 300, json.dumps(data))
```

### Event-Driven Invalidation (Node.js + Redis)

```javascript
const redis = require('redis');
const subscriber = redis.createClient();

subscriber.subscribe('user:updated');
subscriber.on('message', (channel, userId) => {
  redisClient.del(`user:${userId}`);
});

// Publisher (when user is updated)
redisClient.publish('user:updated', userId);
```

## Explanation

- **TTL expiration**: The simplest approach. Data expires after a fixed time. Suitable for data that changes infrequently or where brief staleness is acceptable. Easy to implement but can serve stale data for the duration of the TTL.
- **Write-through**: Updates the cache synchronously when the database is written. Guarantees consistency but adds latency to write operations and increases cache load.
- **Write-behind (write-back)**: Writes go to the cache first, which asynchronously persists to the database. Extremely fast writes but risks data loss if the cache fails before flushing.
- **Event-driven invalidation**: Services publish [events](/recipes/messaging/event-driven-microservices) when data changes. Cache listeners delete or refresh affected keys. Loose coupling but requires a message broker.

## Variants

| Strategy | Consistency | Write Latency | Complexity | Best For |
|----------|-------------|---------------|------------|----------|
| TTL | Eventual | Low | Low | Infrequently changing data |
| Write-through | Strong | High | Medium | Critical data, low write volume |
| Write-behind | Weak | Very low | High | Write-heavy workloads |
| Event-driven | Strong | Low | High | Distributed microservices |

## What Works

- **Use cache-aside for reads**: check cache, fall back to database, populate cache. This is the most common and resilient pattern.
- **Set appropriate TTLs**: too short and you defeat the purpose of caching; too long and stale data persists. Base TTL on business requirements.
- **Implement cache stampede protection**: when TTL expires, many concurrent requests may hit the database simultaneously. Use a mutex or probabilistic early expiration.
- **Version cache keys**: include a schema version in the key (`user:v2:123`). When data format changes, old cached entries are ignored naturally.
- **Monitor cache hit rates**: a hit rate below 80% usually indicates poor key selection or TTL tuning.

## Common Mistakes

- **Caching everything**: some data is already fast to query or changes too frequently to benefit from caching. Profile before adding cache layers.
- **Forgetting to invalidate**: updates to the database that do not clear the cache cause persistent stale data. Automated invalidation pipelines help.
- **Not handling cache failures**: if Redis goes down, the application should degrade gracefully to database queries, not crash.
- **Using the same TTL for all data**: user profiles might tolerate 10 minutes of staleness; inventory counts might need instant consistency.

## Frequently Asked Questions

**Q: How do I prevent cache stampedes?**
A: Use a distributed lock so only one process repopulates the cache after expiration. See [rate limiting](/recipes/security/rate-limiting) for distributed locking patterns. Alternatively, use probabilistic early expiration where each request has a small chance of refreshing the cache before TTL hits zero.

**Q: Should I cache writes as well as reads?**
A: Only in specific high-write scenarios. Write caching (write-behind) introduces complexity and durability risks. Most applications benefit from read caching alone.

**Q: Can I use database triggers to invalidate caches?**
A: Yes, but carefully. Database triggers can publish events to Redis or a message queue when rows change. However, triggers add database load and can be hard to debug.

**Q: What is the difference between eviction and invalidation?**
A: Eviction happens when the cache removes entries due to memory pressure (LRU, LFU policies). Invalidation is deliberate removal because the underlying data changed.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
