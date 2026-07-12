---


contentType: docs
slug: cache-strategy-decision-template
templateType: guideline
title: "Plantilla de Decision de Estrategia de Cache"
description: "Plantilla de decision para elegir estrategias de cache por use case: no-cache, cache-aside, read-through, write-through, write-back y refresh-ahead. Incluye decision matrix, TTL guidelines y ejemplos de codigo."
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
  - /docs/cache-warmup-runbook
  - /docs/cache-eviction-policy-template
  - /docs/cdn-cache-rules-template
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

Esta plantilla ayuda a teams a elegir el right caching strategy para cada use case. Cache strategy decisions affectean consistency, performance y complexity. Pickea el simplest strategy que meets tus requirements.

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

Usa cuando data cambia tan frequentemente que caching no provee benefit o cuando consistency es critical y staleness es unacceptable.

```python
# No caching — every request hittea el database
def get_user(user_id: str) -> dict:
    return db.query("SELECT * FROM users WHERE id = %s", user_id)
```

### 2.2 Cache-Aside (Lazy Loading)

Application maneja el cache explicitly. On read: checkea cache, si miss, fetchea de DB y populatea cache. On write: updateea DB, invalidatea cache entry.

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, db=0)

def get_user(user_id: str) -> dict:
    cache_key = f"user:{user_id}"
    
    # Checkea cache first
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Cache miss — fetchea de database
    user = db.query("SELECT * FROM users WHERE id = %s", user_id)
    
    # Populatea cache con TTL
    r.setex(cache_key, 3600, json.dumps(user))
    return user

def update_user(user_id: str, data: dict) -> dict:
    # Updateea database first
    user = db.update("users", user_id, data)
    
    # Invalidatea cache (no update — avoid race conditions)
    r.delete(f"user:{user_id}")
    return user
```

**Pros**: Simple, solo cachea lo que es requested, resilient a cache failures.
**Cons**: Cache miss es slow (2x latency), stale data possible si DB updates sin cache invalidation.

### 2.3 Read-Through

El cache library maneja DB reads transparently. Application siempre lee del cache. On miss, el cache fetchea de DB automaticamente.

```python
def read_through_get(key: str, loader: callable, ttl: int = 3600) -> dict:
    cached = r.get(key)
    if cached:
        return json.loads(cached)
    
    # Cache miss — loadea de database
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

**Pros**: Application code es cleaner (no cache logic), consistent cache behavior.
**Cons**: Requiere cache library support, first request siempre slow.

### 2.4 Write-Through

Every write va a cache y database simultaneamente. Reads siempre hittean cache. Strong consistency entre cache y DB.

```python
def write_through_update(user_id: str, data: dict) -> dict:
    cache_key = f"user:{user_id}"
    
    # Write a database
    user = db.update("users", user_id, data)
    
    # Write a cache synchronously
    r.setex(cache_key, 3600, json.dumps(user))
    
    return user

def get_user(user_id: str) -> dict:
    # Siempre lee de cache — write-through garantiza cache populated
    cached = r.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)
    
    # Fallback on cache miss (e.g., cache restart)
    user = db.query("SELECT * FROM users WHERE id = %s", user_id)
    r.setex(f"user:{user_id}", 3600, json.dumps(user))
    return user
```

**Pros**: Strong consistency, no stale data, cache siempre warm.
**Cons**: Write latency aumenta (2x writes), cache debe estar available para writes.

### 2.5 Write-Back (Write-Behind)

Writes van a cache solo. Cache asincronamente flushea a database. Fastest writes pero risk de data loss.

```python
import threading
import time

write_queue = []

def write_back_update(user_id: str, data: dict) -> dict:
    cache_key = f"user:{user_id}"
    
    # Write a cache immediately
    user = {**data, "id": user_id, "dirty": True}
    r.setex(cache_key, 3600, json.dumps(user))
    
    # Queuea para async DB write
    write_queue.append((cache_key, user))
    return user

def flush_writes():
    while True:
        if write_queue:
            key, data = write_queue.pop(0)
            db.update("users", data["id"], {k: v for k, v in data.items() if k != "dirty"})
        time.sleep(0.1)

# Startea flush thread
threading.Thread(target=flush_writes, daemon=True).start()
```

**Pros**: Fastest writes, absorbe write spikes, batch DB writes possible.
**Cons**: Data loss risk on cache crash, complex recovery, eventual consistency.

### 2.6 Refresh-Ahead

Cache proactivamente refreshea entries antes de que expiren. Elimina cache misses para hot keys.

```python
def refresh_ahead_get(key: str, loader: callable, ttl: int = 3600) -> dict:
    cached = r.get(key)
    remaining_ttl = r.ttl(key)
    
    # Si TTL esta below threshold, refreshea en background
    if cached and remaining_ttl and remaining_ttl < ttl * 0.2:
        threading.Thread(
            target=lambda: r.setex(key, ttl, json.dumps(loader(key))),
            daemon=True
        ).start()
    
    if cached:
        return json.loads(cached)
    
    # Cold cache — loadea synchronously
    data = loader(key)
    if data:
        r.setex(key, ttl, json.dumps(data))
    return data
```

**Pros**: No cache misses para hot keys, smooth performance.
**Cons**: Overhead de background refreshes, complex de implementar, wasted refreshes para cold keys.

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

- Nunca setees TTL a infinity (no TTL) a menos que tengas explicit invalidation
- Setea TTL a 2x el expected update frequency
- Usa jitter (random +/- 10%) para prevenir cache stampede
- Shorter TTL para data que cambia often
- Longer TTL para data con explicit invalidation

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
invalidate_tag("team:5")  # Invalidatea all team-5 related cache entries
```

---

## 5. Common Pitfalls

### 5.1 Cache Stampede

Cuando un popular cache entry expira y many requests simultaneamente tratan de reloadearlo.

```python
# Fix: Usa un lock para prevenir stampede
def get_with_lock(key: str, loader: callable, ttl: int = 3600) -> dict:
    cached = r.get(key)
    if cached:
        return json.loads(cached)
    
    # Acquire lock — solo un request reloads
    lock_key = f"lock:{key}"
    if r.set(lock_key, "1", nx=True, ex=30):
        try:
            data = loader(key)
            r.setex(key, ttl, json.dumps(data))
            return data
        finally:
            r.delete(lock_key)
    else:
        # Wait y retry
        time.sleep(0.1)
        return get_with_lock(key, loader, ttl)
```

### 5.2 Thundering Herd

Cuando cache restartea y all entries se pierden. Fix: warmea cache on startup (ver cache-warmup-runbook).

### 5.3 Stale Data After DB Update

Cuando DB es updated outside del application (e.g., migration, admin tool) y cache no es invalidated. Fix: usa database triggers o CDC (change data capture) para invalidatear cache.

## Preguntas Frecuentes

### ¿Cuándo deberia usar write-back en vez de write-through?

Usa write-back solo cuando write throughput es el bottleneck y podes tolerar data loss on cache failure. Examples: analytics event logging, view counters, non-critical telemetry. Nunca uses write-back para financial transactions, user data, o nada que deba survive un crash. El complexity de recovery y risk de data loss hace write-back unsuitable para most applications.

### ¿Cómo handleo cache invalidation cuando multiple services updatean el same data?

Usa pub/sub invalidation. All services subscriben a un cache invalidation channel. Cuando cualquier service updateea el database, publica un invalidation message. All instances reciben el message y deletean sus local cache entries. Esto asegura consistency across multiple cache instances sin direct coupling entre services.

### ¿Qué TTL deberia usar para frequently changing data?

Setea TTL a 2x el expected update frequency. Si data updates cada 5 minutes, setea TTL a 10 minutes. Addea jitter (random +/- 10%) para prevenir cache stampede cuando multiple entries expiran simultaneamente. Para data que cambia unpredictably, usa shorter TTLs (30-60 seconds) y relyea en explicit invalidation para immediate consistency.

### ¿Deberia cachear a nivel application o usar un CDN?

Cachea a ambos levels. CDN cachea HTTP responses al edge para public, cacheable content. Application cache (Redis, Memcached) cachea computed data, database results, y session state. CDN reduce load en tus servers. Application cache reduce load en tu database. Sirven different layers y se complementan.

### ¿Cómo mido cache effectiveness?

Trackea cache hit ratio (hits / total requests), cache miss rate, eviction rate, y average latency. Un healthy cache tiene > 90% hit ratio para hot keys. Monitora memory usage y eviction policy. Si hit ratio es low, o el TTL es too short, o el cache es too small, o el access pattern no es cacheable. Usa Redis INFO o Memcached stats para collect metrics.

## See Also

- [Cache Invalidation Pattern](/es/patterns/cache-invalidation-pattern/)
- [Complete Guide to Cache Invalidation](/es/guides/complete-guide-cache-invalidation/)
- [Complete Guide to Redis Caching Strategies](/es/guides/complete-guide-redis-caching-strategies/)
- [Node.js Caching with Redis: Cache-Aside and TTL Patterns](/es/recipes/nodejs-caching-redis/)
- [Complete Guide to Application-Level Caching](/es/guides/complete-guide-application-level-caching/)

