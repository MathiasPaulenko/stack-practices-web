---


contentType: guides
slug: complete-guide-cache-invalidation
title: "Complete Guide to Cache Invalidation"
description: "Master cache invalidation strategies: TTL expiration, event-driven invalidation, versioned keys, tag-based purging, and write-through invalidation. Covers multi-tier invalidation, race conditions, and consistency patterns."
metaDescription: "Master cache invalidation: TTL, event-driven, versioned keys, tag-based purging, write-through. Covers multi-tier invalidation, race conditions, and consistency."
difficulty: advanced
topics:
  - caching
  - performance
  - architecture
tags:
  - caching
  - invalidation
  - guide
  - ttl
  - event-driven
  - versioned-keys
  - tag-based
  - consistency
relatedResources:
  - /guides/complete-guide-redis-caching-strategies
  - /guides/complete-guide-application-level-caching
  - /guides/complete-guide-cdn-caching-strategy
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Master cache invalidation: TTL, event-driven, versioned keys, tag-based purging, write-through. Covers multi-tier invalidation, race conditions, and consistency."
  keywords:
    - cache invalidation
    - ttl expiration
    - event-driven invalidation
    - versioned cache keys
    - tag-based purging
    - cache consistency
    - multi-tier invalidation


---

## Introduction

Cache invalidation is the hardest problem in caching. Phil Karlton famously said, "There are only two hard things in Computer Science: cache invalidation and naming things." Getting invalidation wrong means serving stale data to users, losing updates, or causing thundering herds. This guide walks through every major invalidation strategy, from simple TTL expiration to complex event-driven tag-based purging, with code examples and tradeoffs for each.

## Why Cache Invalidation Is Hard

```text
Write Flow:     App → Database → ??? → Cache
                              ↑
                    When do we invalidate?
                    How do we handle failures?
                    What about concurrent reads?
```

The fundamental tension: you want to serve data from cache (fast) but you need data to be fresh (correct). Every invalidation strategy is a different point on the spectrum between freshness and performance.

## Invalidation Strategies Overview

| Strategy | Freshness | Complexity | Origin Load | Best For |
|----------|-----------|------------|-------------|----------|
| TTL expiration | Eventual | Low | Medium | Data that tolerates staleness |
| Event-driven | Strong | Medium | Low | Data that must be fresh after writes |
| Versioned keys | Strong | Medium | Low | Immutable data, cache busting |
| Tag-based | Strong | High | Low | Complex dependency graphs |
| Write-through | Strong | Medium | Low | Write-heavy with consistency needs |
| Purge-all | N/A | Low | High | Emergency invalidation |

## TTL-Based Expiration

Set a time-to-live on every cache entry. After the TTL expires, the next read fetches fresh data from the origin. This is the simplest invalidation strategy.

### Basic TTL

```python
import redis
import json

r = redis.Redis(host="localhost", port=6379, db=0)

def get_user(user_id: int) -> dict | None:
    cache_key = f"user:{user_id}"
    cached = r.get(cache_key)
    
    if cached:
        return json.loads(cached)
    
    user = db.users.find_by_id(user_id)
    if user:
        r.setex(cache_key, 3600, json.dumps(user))  # TTL: 1 hour
    return user
```

### TTL with Jitter

When many keys expire at the same time, a cache stampede occurs. Add random jitter to spread expirations.

```python
import random

def set_with_jitter(key: str, value: str, base_ttl: int = 3600, jitter_pct: int = 20):
    jitter = int(base_ttl * jitter_pct / 100)
    actual_ttl = base_ttl + random.randint(0, jitter)
    r.setex(key, actual_ttl, value)
```

### Choosing TTL Values

```python
TTL_CONFIG = {
    "user_profile": 300,        # 5 minutes — users tolerate slight staleness
    "product_catalog": 3600,    # 1 hour — changes infrequently
    "app_config": 86400,        # 24 hours — rarely changes
    "search_results": 60,       # 1 minute — changes frequently
    "real_time_stats": 0,       # No cache — must be real-time
}

def get_with_ttl(key: str, loader: callable, data_type: str) -> object:
    ttl = TTL_CONFIG.get(data_type, 300)
    if ttl == 0:
        return loader()
    
    cached = r.get(key)
    if cached:
        return json.loads(cached)
    
    value = loader()
    if value:
        set_with_jitter(key, json.dumps(value), base_ttl=ttl)
    return value
```

### Advantages

- Simple to implement
- No coordination needed between write and cache
- Self-healing: stale data expires automatically

### Disadvantages

- Serves stale data between write and TTL expiration
- Origin load spikes when many TTLs expire simultaneously
- Cannot guarantee freshness

## Event-Driven Invalidation

When data changes in the database, explicitly invalidate the corresponding cache entry. This provides strong freshness guarantees.

### Write-Then-Delete Pattern

```python
def update_user(user_id: int, data: dict) -> dict:
    # 1. Write to database
    user = db.users.update(user_id, data)
    
    # 2. Invalidate cache
    r.delete(f"user:{user_id}")
    
    return user
```

### Pub/Sub for Multi-Instance Invalidation

When running multiple application instances, each has its own in-memory cache. Use Redis pub/sub to notify all instances to invalidate their local caches.

```python
import threading

# Publisher: called when data changes
def invalidate_cache(key: str):
    r.delete(key)  # Invalidate Redis cache
    r.publish("cache-invalidation", key)  # Notify all instances

# Subscriber: runs in each instance
def invalidation_subscriber():
    pubsub = r.pubsub()
    pubsub.subscribe("cache-invalidation")
    
    for message in pubsub.listen():
        if message["type"] == "message":
            key = message["data"].decode()
            local_cache.delete(key)  # Invalidate local in-memory cache

threading.Thread(target=invalidation_subscriber, daemon=True).start()
```

### Database Triggers for Invalidation

Use database triggers or change data capture (CDC) to invalidate cache when data changes, even if the change does not go through your application.

```python
# Using PostgreSQL LISTEN/NOTIFY
def setup_db_invalidation():
    conn = db.get_raw_connection()
    conn.execute("""
        CREATE OR REPLACE FUNCTION notify_cache_invalidation()
        RETURNS TRIGGER AS $$
        BEGIN
            PERFORM pg_notify('cache_invalidation', 
                json_build_object('table', TG_TABLE_NAME, 'id', NEW.id)::text);
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        CREATE TRIGGER user_cache_invalidation
        AFTER UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION notify_cache_invalidation();
    """)
```

### Advantages

- Strong freshness: cache is invalidated immediately after write
- Low origin load: no unnecessary revalidations
- Precise: only affected entries are invalidated

### Disadvantages

- Requires coordination between write path and cache
- If invalidation fails, stale data persists until TTL expires
- More complex to implement and debug

## Versioned Cache Keys

Include a version number in the cache key. When data changes, increment the version. Old cache entries expire naturally via TTL.

### Versioned Keys Pattern

```python
def get_user(user_id: int) -> dict | None:
    version = r.get(f"user_version:{user_id}") or "1"
    cache_key = f"user:{user_id}:v{version}"
    
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
    
    user = db.users.find_by_id(user_id)
    if user:
        r.setex(cache_key, 3600, json.dumps(user))
    return user

def update_user(user_id: int, data: dict) -> dict:
    user = db.users.update(user_id, data)
    # Increment version — old cache entries become unreachable
    r.incr(f"user_version:{user_id}")
    return user
```

### Cache Busting with Versioned Keys

This pattern is similar to cache busting for static assets: `style.v123.css` instead of `style.css`. When the version changes, the URL changes, and the CDN fetches the new version.

### Advantages

- No explicit invalidation needed: old entries are unreachable
- No race conditions: readers always get the latest version
- Works well with CDN caching

### Disadvantages

- Old entries consume memory until TTL expires
- Requires tracking version numbers
- More complex cache key structure

## Tag-Based Invalidation

Tag cache entries with related entity identifiers. When an entity changes, purge all entries tagged with that entity.

### Setting Tags

```python
def get_product_with_tags(product_id: int) -> dict | None:
    cache_key = f"product:{product_id}"
    cached = r.get(cache_key)
    
    if cached:
        return json.loads(cached)
    
    product = db.products.find_by_id(product_id)
    if product:
        r.setex(cache_key, 3600, json.dumps(product))
        
        # Tag this cache entry with related entities
        r.sadd(f"tag:product:{product_id}", cache_key)
        r.sadd(f"tag:category:{product.category_id}", cache_key)
        r.expire(f"tag:product:{product_id}", 3600)
        r.expire(f"tag:category:{product.category_id}", 3600)
    
    return product
```

### Purging by Tag

```python
def invalidate_tag(tag: str):
    # Get all cache keys tagged with this tag
    keys = r.smembers(f"tag:{tag}")
    
    if keys:
        # Delete all tagged entries
        r.delete(*keys)
    
    # Delete the tag set itself
    r.delete(f"tag:{tag}")

def update_product(product_id: int, data: dict) -> dict:
    product = db.products.update(product_id, data)
    
    # Invalidate all caches related to this product
    invalidate_tag(f"product:{product_id}")
    
    # Also invalidate the category cache if category changed
    if "category_id" in data:
        invalidate_tag(f"category:{data['category_id']}")
    
    return product
```

### Advantages

- Precise invalidation of related entries
- Handles complex dependency graphs
- One purge call invalidates many entries

### Disadvantages

- High memory overhead for tag tracking
- Complex to implement correctly
- Tag sets must be cleaned up to avoid memory leaks

## Write-Through Invalidation

In write-through caching, writes go to the cache first (or simultaneously), so the cache always has the latest data. Invalidation is implicit: the write itself updates the cache.

```python
def update_user_write_through(user_id: int, data: dict) -> dict:
    # Write to database
    user = db.users.update(user_id, data)
    
    # Update cache with new data
    r.setex(f"user:{user_id}", 3600, json.dumps(user))
    
    return user
```

### Advantages

- Cache is always fresh after writes
- No separate invalidation step needed
- No stale data window

### Disadvantages

- Write latency increases (database write + cache write)
- If cache write fails, cache is stale until TTL expires
- Not suitable for write-heavy workloads

## Multi-Tier Invalidation

When using multiple cache tiers (L1 in-memory, L2 Redis), invalidation must propagate through all tiers.

```python
class MultiTierInvalidation:
    def __init__(self, redis_client, local_cache):
        self.redis = redis_client
        self.local = local_cache
        self._setup_subscriber()
    
    def invalidate(self, key: str):
        # Invalidate L2 (Redis)
        self.redis.delete(key)
        
        # Invalidate L1 (local)
        self.local.delete(key)
        
        # Notify other instances to invalidate their L1
        self.redis.publish("cache-invalidation", key)
    
    def _setup_subscriber(self):
        pubsub = self.redis.pubsub()
        pubsub.subscribe("cache-invalidation")
        
        def listen():
            for message in pubsub.listen():
                if message["type"] == "message":
                    key = message["data"].decode()
                    self.local.delete(key)
        
        threading.Thread(target=listen, daemon=True).start()
```

## Race Conditions

### Read-Then-Write Race

```text
Thread A: Read cache (miss) → Read DB → Write cache
Thread B: Write DB → Invalidate cache
Result: Thread A writes stale data to cache after Thread B invalidated it
```

### Solution: Lock or Version Check

```python
def get_user_safe(user_id: int) -> dict | None:
    cache_key = f"user:{user_id}"
    lock_key = f"lock:{cache_key}"
    
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Acquire lock
    acquired = r.set(lock_key, "1", nx=True, ex=10)
    if acquired:
        try:
            # Double-check cache
            cached = r.get(cache_key)
            if cached:
                return json.loads(cached)
            
            user = db.users.find_by_id(user_id)
            if user:
                r.setex(cache_key, 3600, json.dumps(user))
            return user
        finally:
            r.delete(lock_key)
    else:
        # Wait and retry
        time.sleep(0.05)
        return get_user_safe(user_id)
```

### Delayed Double-Delete

To handle the race where a read is in progress when invalidation happens, use delayed double-delete:

```python
def update_user_safe(user_id: int, data: dict) -> dict:
    # 1. Delete cache
    r.delete(f"user:{user_id}")
    
    # 2. Write to database
    user = db.users.update(user_id, data)
    
    # 3. Delete cache again (after a short delay)
    threading.Timer(0.5, lambda: r.delete(f"user:{user_id}")).start()
    
    return user
```

The second delete handles the case where a concurrent read repopulated the cache with stale data between step 1 and step 2.

## Consistency Models

### Strong Consistency

Cache is always consistent with database. Requires write-through or synchronous invalidation. Higher latency but no stale reads.

### Eventual Consistency

Cache may be stale for a short period. TTL-based expiration provides eventual consistency. Lower latency but tolerates stale reads.

### Read-Your-Writes Consistency

After a user writes, their subsequent reads see the updated data. Achieve this by invalidating the cache after write and ensuring the user's next read goes to the database.

```python
def update_user_session(user_id: int, data: dict, session_id: str) -> dict:
    user = db.users.update(user_id, data)
    
    # Invalidate cache
    r.delete(f"user:{user_id}")
    
    # Mark this session as needing fresh read
    r.setex(f"bypass_cache:{session_id}", 10, "1")
    
    return user

def get_user_session(user_id: int, session_id: str) -> dict | None:
    # Check if this session should bypass cache
    if r.exists(f"bypass_cache:{session_id}"):
        return db.users.find_by_id(user_id)
    
    # Normal cache flow
    return get_user(user_id)
```

## Monitoring Invalidation

Track these metrics to ensure invalidation is working correctly:

- **Invalidation latency**: time from write to cache invalidation
- **Stale read rate**: percentage of reads that return stale data
- **Invalidation failures**: failed invalidation operations
- **Cache hit rate after invalidation**: should drop to 0 for invalidated keys, then recover

```python
import time

def invalidate_with_metrics(key: str):
    start = time.time()
    
    try:
        r.delete(key)
        r.publish("cache-invalidation", key)
        
        latency = (time.time() - start) * 1000
        metrics.histogram("cache.invalidation.latency", latency)
        metrics.increment("cache.invalidation.success")
    except Exception as e:
        metrics.increment("cache.invalidation.failure")
        raise
```

## Production Checklist

- [ ] TTL set on every cache entry
- [ ] TTL jitter to prevent stampedes
- [ ] Event-driven invalidation for write-heavy data
- [ ] Pub/sub for multi-instance L1 invalidation
- [ ] Race condition handling (locks or delayed double-delete)
- [ ] Versioned keys for CDN-friendly cache busting
- [ ] Tag-based invalidation for complex dependencies
- [ ] Invalidation failure monitoring and alerting
- [ ] Fallback to TTL if event-driven invalidation fails
- [ ] Stale read rate monitored
- [ ] Invalidation latency tracked

## FAQ

### What is the best cache invalidation strategy?

There is no single best strategy. Use TTL for data that tolerates staleness. Use event-driven for data that must be fresh after writes. Use versioned keys for CDN caching. Use tag-based for complex dependency graphs. Most systems use a combination: TTL as a safety net, event-driven for freshness, and versioned keys for specific cases.

### How do I handle invalidation failures?

Always have a TTL as a fallback. If event-driven invalidation fails, the TTL ensures stale data eventually expires. Log invalidation failures and alert on them. Consider retrying failed invalidations with a queue.

### What is the delayed double-delete pattern?

Delete the cache, write to the database, then delete the cache again after a short delay. The second delete handles the race condition where a concurrent read repopulated the cache with stale data between the first delete and the database write.

### How do I invalidate cache across multiple instances?

Use Redis pub/sub. When one instance invalidates a cache entry, it publishes a message. All other instances subscribe and invalidate their local in-memory caches. This ensures L1 caches are consistent across instances.

### Should I invalidate cache before or after writing to the database?

Invalidate after writing to the database. If you invalidate before, a concurrent read can repopulate the cache with stale data between the invalidation and the database write. Use delayed double-delete if this race is a concern.

### How do I test cache invalidation?

Write integration tests that verify: writes invalidate cache, subsequent reads fetch fresh data, concurrent reads during writes do not return stale data, invalidation failures fall back to TTL, and pub/sub notifications reach all instances.

## See Also

- [Complete Guide to Application-Level Caching](/guides/complete-guide-application-level-caching/)
- [Complete Guide to CDN Caching Strategy](/guides/complete-guide-cdn-caching-strategy/)
- [Complete Guide to Redis Caching Strategies](/guides/complete-guide-redis-caching-strategies/)
- [Complete Guide to LLM Cost Optimization](/guides/complete-guide-llm-cost-optimization/)
- [Complete Guide to GraphQL Caching](/guides/complete-guide-graphql-caching/)

