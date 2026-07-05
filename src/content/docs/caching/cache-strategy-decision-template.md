---
contentType: docs
slug: cache-strategy-decision-template
templateType: guideline
title: "Cache Strategy Decision Template"
description: "Decision template for choosing cache strategies per use case: no-cache, cache-aside, read-through, write-through, write-back, and refresh-ahead. Includes decision matrix, TTL guidelines, invalidation rules, and code examples."
metaDescription: "Cache strategy decision template: no-cache, cache-aside, read-through, write-through, write-back, refresh-ahead with decision matrix and TTL rules."
difficulty: intermediate
topics:
  - caching
tags:
  - caching
  - cache-strategy
  - redis
  - decision-matrix
  - ttl
  - invalidation
relatedResources:
  - /docs/caching/cache-warmup-runbook
  - /docs/caching/cache-eviction-policy-template
  - /docs/caching/cdn-cache-rules-template
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Cache strategy decision template: no-cache, cache-aside, read-through, write-through, write-back, refresh-ahead with decision matrix and TTL rules."
  keywords:
    - cache strategy
    - cache-aside
    - read-through cache
    - write-through cache
    - write-back cache
    - cache TTL
    - cache invalidation
---

## Overview

This template helps teams choose the right caching strategy for each use case. Cache strategy decisions affect consistency, performance, and complexity. Pick the simplest strategy that meets your requirements.

---

## 1. Strategy Decision Matrix

### 1.1 Strategy Comparison

```text
Strategy       | Read perf | Write perf | Consistency | Complexity | Use when
───────────────┼───────────┼────────────┼─────────────┼────────────┼──────────────────
No-cache       | Baseline  | Baseline   | Strong      | None       | Data changes fast
Cache-aside    | Fast      | Baseline   | Eventual    | Low        | General purpose
Read-through   | Fast      | Baseline   | Eventual    | Medium     | Read-heavy
Write-through  | Fast      | Slower     | Strong      | Medium     | Read + write parity
Write-back     | Fastest   | Fast       | Weak        | High       | Write-heavy, tolerate loss
Refresh-ahead  | Fast      | Baseline   | Eventual    | High       | Predictable access
```

### 1.2 Decision Tree

```text
1. Does data change faster than cache fills?
   YES → No-cache. Stop here.
   NO  → Continue.

2. Is the data write-heavy (>70% writes)?
   YES → Can you tolerate data loss on crash?
         YES → Write-back
         NO  → Write-through
   NO  → Continue.

3. Is access pattern predictable (hot keys known)?
   YES → Refresh-ahead
   NO  → Continue.

4. Do you need strong consistency on writes?
   YES → Write-through
   NO  → Continue.

5. Default choice:
   → Cache-aside (simplest, most flexible)
```

---

## 2. Strategy Details

### 2.1 No-Cache

Use when data changes so frequently that caching provides no benefit or when consistency is critical and staleness is unacceptable.

```python
# No caching — every request hits the database
def get_user(user_id: str) -> dict:
    return db.query("SELECT * FROM users WHERE id = %s", user_id)
```

### 2.2 Cache-Aside (Lazy Loading)

Application manages the cache explicitly. On read: check cache, if miss, fetch from DB and populate cache. On write: update DB, invalidate cache entry.

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, db=0)

def get_user(user_id: str) -> dict:
    cache_key = f"user:{user_id}"
    
    # Check cache first
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Cache miss — fetch from database
    user = db.query("SELECT * FROM users WHERE id = %s", user_id)
    
    # Populate cache with TTL
    r.setex(cache_key, 3600, json.dumps(user))
    return user

def update_user(user_id: str, data: dict) -> dict:
    # Update database first
    user = db.update("users", user_id, data)
    
    # Invalidate cache (not update — avoid race conditions)
    r.delete(f"user:{user_id}")
    return user
```

**Pros**: Simple, only caches what is requested, resilient to cache failures.
**Cons**: Cache miss is slow (2x latency), stale data possible if DB updates without cache invalidation.

### 2.3 Read-Through

The cache library manages DB reads transparently. Application always reads from cache. On miss, the cache fetches from DB automatically.

```python
def read_through_get(key: str, loader: callable, ttl: int = 3600) -> dict:
    cached = r.get(key)
    if cached:
        return json.loads(cached)
    
    # Cache miss — load from database
    data = loader(key)
    if data:
        r.setex(key, ttl, json.dumps(data))
    return data

# Usage
user = read_through_get(
    f"user:{user_id}",
    loader=lambda k: db.query("SELECT * FROM users WHERE id = %s", k.split(":")[1]),
    ttl=3600
)
```

**Pros**: Application code is cleaner (no cache logic), consistent cache behavior.
**Cons**: Requires cache library support, first request always slow.

### 2.4 Write-Through

Every write goes to cache and database simultaneously. Reads always hit cache. Strong consistency between cache and DB.

```python
def write_through_update(user_id: str, data: dict) -> dict:
    cache_key = f"user:{user_id}"
    
    # Write to database
    user = db.update("users", user_id, data)
    
    # Write to cache synchronously
    r.setex(cache_key, 3600, json.dumps(user))
    
    return user

def get_user(user_id: str) -> dict:
    # Always read from cache — write-through guarantees cache is populated
    cached = r.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)
    
    # Fallback on cache miss (e.g., cache restart)
    user = db.query("SELECT * FROM users WHERE id = %s", user_id)
    r.setex(f"user:{user_id}", 3600, json.dumps(user))
    return user
```

**Pros**: Strong consistency, no stale data, cache always warm.
**Cons**: Write latency increases (2x writes), cache must be available for writes.

### 2.5 Write-Back (Write-Behind)

Writes go to cache only. Cache asynchronously flushes to database. Fastest writes but risk of data loss.

```python
import threading
import time

write_queue = []

def write_back_update(user_id: str, data: dict) -> dict:
    cache_key = f"user:{user_id}"
    
    # Write to cache immediately
    user = {**data, "id": user_id, "dirty": True}
    r.setex(cache_key, 3600, json.dumps(user))
    
    # Queue for async DB write
    write_queue.append((cache_key, user))
    return user

def flush_writes():
    while True:
        if write_queue:
            key, data = write_queue.pop(0)
            db.update("users", data["id"], {k: v for k, v in data.items() if k != "dirty"})
        time.sleep(0.1)

# Start flush thread
threading.Thread(target=flush_writes, daemon=True).start()
```

**Pros**: Fastest writes, absorbs write spikes, batch DB writes possible.
**Cons**: Data loss risk on cache crash, complex recovery, eventual consistency.

### 2.6 Refresh-Ahead

Cache proactively refreshes entries before they expire. Eliminates cache misses for hot keys.

```python
def refresh_ahead_get(key: str, loader: callable, ttl: int = 3600) -> dict:
    cached = r.get(key)
    remaining_ttl = r.ttl(key)
    
    # If TTL is below threshold, refresh in background
    if cached and remaining_ttl and remaining_ttl < ttl * 0.2:
        threading.Thread(
            target=lambda: r.setex(key, ttl, json.dumps(loader(key))),
            daemon=True
        ).start()
    
    if cached:
        return json.loads(cached)
    
    # Cold cache — load synchronously
    data = loader(key)
    if data:
        r.setex(key, ttl, json.dumps(data))
    return data
```

**Pros**: No cache misses for hot keys, smooth performance.
**Cons**: Overhead of background refreshes, complex to implement, wasted refreshes for cold keys.

---

## 3. TTL Guidelines

### 3.1 TTL Selection Matrix

```text
Data type              | TTL         | Reasoning
───────────────────────┼─────────────┼──────────────────────────────
User profile           | 30-60 min   | Changes infrequently
Product catalog        | 5-15 min    | Changes occasionally
Search results         | 1-5 min     | New content appears
Session data           | 15-30 min   | Security timeout
Rate limit counters    | 1-60 sec    | Real-time accuracy
Configuration          | 1-5 min     | Quick rollout of changes
Computed aggregations  | 5-60 min    | Depends on update frequency
Reference data         | 24 hours    | Rarely changes
```

### 3.2 TTL Rules

- Never set TTL to infinity (no TTL) unless you have explicit invalidation
- Set TTL to 2x the expected update frequency
- Use jitter (random +/- 10%) to prevent cache stampede
- Shorter TTL for data that changes often
- Longer TTL for data with explicit invalidation

```python
import random

def set_cache_with_jitter(key: str, value: str, base_ttl: int):
    jitter = random.randint(-base_ttl // 10, base_ttl // 10)
    r.setex(key, base_ttl + jitter, value)
```

---

## 4. Invalidation Strategies

### 4.1 Invalidation Methods

```text
Method              | When to use                    | Complexity
────────────────────┼────────────────────────────────┼──────────
Explicit delete     | Write-through, cache-aside     | Low
TTL expiration      | All strategies                 | None
Tag-based           | Group invalidation             | Medium
Pub/sub invalidation| Multi-instance cache           | Medium
Version-based       | Schema or format changes       | Low
```

### 4.2 Tag-Based Invalidation

```python
def cache_with_tags(key: str, value: str, tags: list, ttl: int = 3600):
    r.setex(key, ttl, value)
    for tag in tags:
        r.sadd(f"tag:{tag}", key)

def invalidate_tag(tag: str):
    keys = r.smembers(f"tag:{tag}")
    if keys:
        r.delete(*keys)
    r.delete(f"tag:{tag}")

# Usage
cache_with_tags("user:123", user_data, tags=["users", "team:5"])
invalidate_tag("team:5")  # Invalidates all team-5 related cache entries
```

---

## 5. Common Pitfalls

### 5.1 Cache Stampede

When a popular cache entry expires and many requests simultaneously try to reload it.

```python
# Fix: Use a lock to prevent stampede
def get_with_lock(key: str, loader: callable, ttl: int = 3600) -> dict:
    cached = r.get(key)
    if cached:
        return json.loads(cached)
    
    # Acquire lock — only one request reloads
    lock_key = f"lock:{key}"
    if r.set(lock_key, "1", nx=True, ex=30):
        try:
            data = loader(key)
            r.setex(key, ttl, json.dumps(data))
            return data
        finally:
            r.delete(lock_key)
    else:
        # Wait and retry
        time.sleep(0.1)
        return get_with_lock(key, loader, ttl)
```

### 5.2 Thundering Herd

When cache restarts and all entries are lost. Fix: warm cache on startup (see cache-warmup-runbook).

### 5.3 Stale Data After DB Update

When DB is updated outside the application (e.g., migration, admin tool) and cache is not invalidated. Fix: use database triggers or CDC (change data capture) to invalidate cache.

## FAQ

### When should I use write-back instead of write-through?

Use write-back only when write throughput is the bottleneck and you can tolerate data loss on cache failure. Examples: analytics event logging, view counters, non-critical telemetry. Never use write-back for financial transactions, user data, or anything that must survive a crash. The complexity of recovery and risk of data loss makes write-back unsuitable for most applications.

### How do I handle cache invalidation when multiple services update the same data?

Use pub/sub invalidation. All services subscribe to a cache invalidation channel. When any service updates the database, it publishes an invalidation message. All instances receive the message and delete their local cache entries. This ensures consistency across multiple cache instances without direct coupling between services.

### What TTL should I use for frequently changing data?

Set TTL to 2x the expected update frequency. If data updates every 5 minutes, set TTL to 10 minutes. Add jitter (random +/- 10%) to prevent cache stampede when multiple entries expire simultaneously. For data that changes unpredictably, use shorter TTLs (30-60 seconds) and rely on explicit invalidation for immediate consistency.

### Should I cache at the application level or use a CDN?

Cache at both levels. CDN caches HTTP responses at the edge for public, cacheable content. Application cache (Redis, Memcached) caches computed data, database results, and session state. CDN reduces load on your servers. Application cache reduces load on your database. They serve different layers and complement each other.

### How do I measure cache effectiveness?

Track cache hit ratio (hits / total requests), cache miss rate, eviction rate, and average latency. A healthy cache has > 90% hit ratio for hot keys. Monitor memory usage and eviction policy. If hit ratio is low, either the TTL is too short, the cache is too small, or the access pattern is not cacheable. Use Redis INFO or Memcached stats to collect metrics.
