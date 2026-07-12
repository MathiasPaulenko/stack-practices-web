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
  - /recipes/redis-cache-patterns
  - /recipes/caching-strategies
  - /recipes/lazy-loading
  - /patterns/flyweight-pattern-text
lastUpdated: "2026-07-09"
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

### Write-Behind (Write-Back) Cache

```python
import threading

write_queue = []
write_lock = threading.Lock()

def write_behind_update(user_id, data):
    # Write to cache immediately
    r.setex(f"user:{user_id}", 300, json.dumps(data))
    # Queue for async database write
    with write_lock:
        write_queue.append((user_id, data))

def flush_writes():
    while True:
        time.sleep(1)  # Flush every second
        with write_lock:
            if not write_queue:
                continue
            batch = write_queue[:100]
            write_queue = write_queue[100:]
        for user_id, data in batch:
            db.execute(
                "UPDATE users SET name = %s WHERE id = %s",
                (data['name'], user_id)
            )
```

### Cache Stampede Protection

```python
import time
import random

def get_with_stampede_protection(key, ttl, loader):
    cached = r.get(key)
    if cached:
        return json.loads(cached)

    # Probabilistic early expiration: 5% chance to refresh early
    remaining_ttl = r.ttl(key)
    if remaining_ttl and remaining_ttl < ttl * 0.1:
        if random.random() < 0.05:
            # This request refreshes the cache
            value = loader()
            r.setex(key, ttl, json.dumps(value))
            return value

    # Distributed lock to prevent stampede
    lock_key = f"lock:{key}"
    acquired = r.set(lock_key, "1", nx=True, ex=10)
    if acquired:
        try:
            value = loader()
            r.setex(key, ttl, json.dumps(value))
            return value
        finally:
            r.delete(lock_key)
    else:
        # Another process is refreshing; wait briefly and retry
        time.sleep(0.1)
        return get_with_stampede_protection(key, ttl, loader)
```

### Multi-Level Cache Invalidation

```python
# L1: In-process (LRU cache)
# L2: Redis (shared cache)
# L3: Database (source of truth)

def get_user_multi_level(user_id):
    # Check L1 first
    if user_id in l1_cache:
        return l1_cache[user_id]

    # Check L2
    cached = r.get(f"user:{user_id}")
    if cached:
        user = json.loads(cached)
        l1_cache[user_id] = user  # Populate L1
        return user

    # Load from L3 (database)
    user = db.query("SELECT * FROM users WHERE id = %s", (user_id,))
    r.setex(f"user:{user_id}", 300, json.dumps(user))
    l1_cache[user_id] = user
    return user

def invalidate_user(user_id):
    # Invalidate all levels
    l1_cache.pop(user_id, None)  # Clear L1
    r.delete(f"user:{user_id}")   # Clear L2
    # L3 is the source — no invalidation needed
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
| Cache-aside | Eventual | Low | Low | General-purpose reads |
| Refresh-ahead | Strong | Low | Medium | Predictable access patterns |

## Advanced: Cache Key Design

Good key design prevents collisions and enables targeted invalidation:

```python
# Bad: ambiguous key
r.set("user:42", data)

# Good: namespace + entity + id + version
r.set("app:v2:user:42", data)

# For collections, include query parameters in the key
r.set("app:v2:users:role=admin:active=true", data)

# For invalidation, use key patterns
r.delete("app:v2:user:42")
# Or scan and delete matching keys
for key in r.scan_iter("app:v2:users:*"):
    r.delete(key)
```

## Advanced: CDN Cache Invalidation

CDN caching adds another layer. Invalidating CDN caches requires API calls:

```bash
# Cloudflare purge by URL
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone}/purge_cache" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"files": ["https://example.com/users/42"]}'

# AWS CloudFront invalidation
aws cloudfront create-invalidation \
  --distribution-id {dist_id} \
  --paths "/*"
```

CDN invalidation is slow (seconds to minutes). Use versioned URLs (`/v2/users/42`) or cache-busting query parameters (`?v=123`) for instant updates.

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

### How do I prevent cache stampedes?

Use a distributed lock so only one process repopulates the cache after expiration. See [rate limiting](/recipes/security/rate-limiting) for distributed locking patterns. Alternatively, use probabilistic early expiration where each request has a small chance of refreshing the cache before TTL hits zero.

### Should I cache writes as well as reads?

Only in specific high-write scenarios. Write caching (write-behind) introduces complexity and durability risks. Most applications benefit from read caching alone. If you need write-behind, ensure you have a durable write queue and crash recovery.

### Can I use database triggers to invalidate caches?

Yes, but carefully. Database triggers can publish events to Redis or a message queue when rows change. However, triggers add database load and can be hard to debug. Prefer application-level invalidation in most cases.

### What is the difference between eviction and invalidation?

Eviction happens when the cache removes entries due to memory pressure (LRU, LFU policies). Invalidation is deliberate removal because the underlying data changed. Eviction is automatic; invalidation is explicit.

### How do I handle cache invalidation in microservices?

Use event-driven invalidation. Each service publishes a domain event (e.g., `UserUpdated`) to a message broker. Cache listeners subscribe to these events and delete affected keys. This decouples services and ensures all caches are invalidated. See [event-driven microservices](/recipes/messaging/event-driven-microservices) for patterns.

### What TTL should I use?

It depends on the data. User profiles can tolerate 10-30 minutes of staleness. Product inventory needs near-real-time consistency (TTL of seconds or no cache at all). Configuration data can be cached for hours. Base TTL on business requirements, not on a default value.

### How do I test cache invalidation?

Write integration tests that verify: (1) cached data is returned on repeated reads, (2) cache is cleared after a write, (3) stale data is not served after TTL expires. Use a real Redis instance in tests, not a mock. Test concurrent reads and writes to verify stampede protection.

### What is cache-aside vs read-through?

In cache-aside, the application checks the cache, falls back to the database, and populates the cache. In read-through, the cache library transparently fetches from the database on a miss. Cache-aside gives more control; read-through simplifies application code.

### How do I monitor cache health?

Track cache hit rate (target >80%), memory usage, eviction count, and latency. Redis INFO command provides these metrics. Set up alerts for hit rate drops, memory pressure, and connection failures. See [observability guide](/guides/devops/logging-monitoring-observability-guide) for monitoring patterns.

### Should I use Redis or Memcached?

Redis for most cases: supports data structures, persistence, pub/sub, and Lua scripting. Memcached for simple key-value caching with multi-threaded performance. Redis is the default choice for new projects.

### How do I handle cache during deployments?

Version your cache keys (`app:v2:user:42`). When deploying a new schema, the version bump naturally invalidates old entries. Alternatively, flush the cache during deployment (causes a temporary spike in database load). Warm the cache by pre-loading hot keys after deployment.

### What is cache warming?

Cache warming pre-loads frequently accessed data into the cache before users request it. Run a warming script after deployments or during off-peak hours. This prevents cache stampedes on first access after a flush.
