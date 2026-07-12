---


contentType: docs
slug: cache-eviction-policy-template
templateType: guideline
title: "Cache Eviction Policy Template"
description: "Template for documenting cache eviction rules per cache layer: LRU, LFU, TTL, FIFO, random eviction. Includes policy selection matrix, per-layer configuration, memory limits, and monitoring rules with code examples."
metaDescription: "Template for cache eviction policies: LRU, LFU, TTL, FIFO, random. Selection matrix, per-layer configuration, memory limits, monitoring rules, code examples."
difficulty: intermediate
topics:
  - caching
tags:
  - caching
  - eviction-policy
  - lru
  - redis
  - memory-management
  - configuration
relatedResources:
  - /docs/cache-strategy-decision-template
  - /docs/cache-warmup-runbook
  - /docs/cdn-cache-rules-template
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Template for cache eviction policies: LRU, LFU, TTL, FIFO, random. Selection matrix, per-layer configuration, memory limits, monitoring rules, code examples."
  keywords:
    - cache eviction
    - lru cache
    - lfu cache
    - cache ttl
    - redis eviction
    - memory management
    - cache configuration


---

## Overview

This template defines eviction policies for each cache layer in your infrastructure. Eviction policies determine which entries are removed when the cache reaches its memory limit. The wrong policy causes cache churn, low hit ratios, and degraded performance.

---

## 1. Eviction Policy Comparison

### 1.1 Policy Matrix

```text
Policy  | Evicts                | Best for              | Memory overhead | Complexity
────────┼───────────────────────┼───────────────────────┼─────────────────┼───────────
LRU     | Least recently used   | General purpose       | Low (linked list)| Low
LFU     | Least frequently used | Stable hot/cold sets  | Medium (counters)| Medium
TTL     | Expired entries       | Time-sensitive data   | None            | None
FIFO    | First inserted        | Simple queues         | Low             | Low
Random  | Random entry          | Uniform access        | None            | None
TTL+LRU | Expired or least used | Mixed workloads       | Low             | Medium
```

### 1.2 Selection Guide

```text
1. Does data have a natural expiration?
   YES → TTL (with LRU as secondary)
   NO  → Continue.

2. Is access pattern uniform (no hot keys)?
   YES → Random
   NO  → Continue.

3. Are hot keys stable (same keys always hot)?
   YES → LFU
   NO  → Continue.

4. Default choice:
   → LRU (best general-purpose policy)
```

---

## 2. Per-Layer Configuration

### 2.1 Layer Overview

```text
Layer              | Technology      | Eviction policy | Max memory
───────────────────┼─────────────────┼─────────────────┼──────────────
L1 (in-process)    | LRU map         | LRU             | 256 MB
L2 (local Redis)   | Redis           | allkeys-lru     | 4 GB
L3 (shared Redis)  | Redis cluster   | volatile-ttl    | 32 GB
CDN                | Cloudflare      | LRU + TTL       | Unlimited
Browser            | HTTP cache      | TTL             | User-controlled
```

### 2.2 L1: In-Process Cache

```python
from functools import lru_cache
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.cache = OrderedDict()
        self.capacity = capacity
    
    def get(self, key: str):
        if key not in self.cache:
            return None
        self.cache.move_to_end(key)
        return self.cache[key]
    
    def put(self, key: str, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)  # Remove oldest (LRU)

# Usage
l1_cache = LRUCache(capacity=10000)
```

### 2.3 L2: Local Redis

```bash
# redis.conf — local Redis instance
maxmemory 4gb
maxmemory-policy allkeys-lru
maxmemory-samples 10
```

```python
# Application-level configuration
import redis

local_redis = redis.Redis(
    host='localhost',
    port=6379,
    db=0,
    socket_timeout=2,
    retry_on_timeout=True,
)

# Set with explicit TTL (secondary eviction)
local_redis.setex("user:123", 3600, user_data)
```

### 2.4 L3: Shared Redis Cluster

```bash
# redis-cluster.conf — shared Redis cluster
maxmemory 32gb
maxmemory-policy volatile-ttl
maxmemory-samples 20

# volatile-ttl evicts keys with the shortest TTL first
# Keys without TTL are never evicted (unless allkeys-* policy)
```

```python
# Cluster client configuration
from redis.cluster import RedisCluster

cluster = RedisCluster(
    startup_nodes=[{"host": "redis-1.internal", "port": 6379}],
    max_connections=100,
    retry_on_timeout=True,
    socket_timeout=5,
)

# All keys MUST have TTL — volatile-ttl only evicts keys with TTL
cluster.setex("product:456", 7200, product_data)
```

---

## 3. Memory Limits

### 3.1 Memory Allocation Rules

```text
Rule 1: Never allocate more than 75% of available RAM to cache
Rule 2: Reserve 15% for OS and background processes
Rule 3: Reserve 10% for connection buffers and overhead
Rule 4: Monitor actual usage — adjust if eviction rate is high
Rule 5: Set maxmemory to prevent OOM kills
```

### 3.2 Memory Calculation

```text
Available server RAM: 16 GB
OS + processes:       2.4 GB (15%)
Connection overhead:  1.6 GB (10%)
Cache maxmemory:      12 GB (75%)

Per-key memory estimate:
  String value (1KB):  ~1.2 KB (including Redis overhead)
  Hash (10 fields):    ~2.5 KB
  Set (100 members):   ~4.5 KB

Estimated key capacity at 12 GB:
  String keys:  ~10 million
  Hash keys:    ~4.8 million
  Set keys:     ~2.7 million
```

### 3.3 Memory Monitoring

```python
def check_cache_memory(r: redis.Redis) -> dict:
    info = r.info()
    
    used = info['used_memory']
    max_mem = info.get('maxmemory', 0)
    evicted = info.get('evicted_keys', 0)
    hit_rate = info.get('keyspace_hits', 0) / max(
        info.get('keyspace_hits', 0) + info.get('keyspace_misses', 0), 1
    ) * 100
    
    return {
        'used_memory_mb': used / 1024 / 1024,
        'max_memory_mb': max_mem / 1024 / 1024,
        'memory_usage_pct': (used / max_mem * 100) if max_mem else 0,
        'evicted_keys': evicted,
        'hit_rate_pct': hit_rate,
        'policy': info.get('maxmemory_policy', 'unknown'),
    }
```

---

## 4. Eviction Monitoring

### 4.1 Key Metrics

```text
Metric                  | Alert threshold        | Action
────────────────────────┼────────────────────────┼──────────────────────
evicted_keys            | > 1000/min             | Increase maxmemory
memory_usage_pct        | > 90%                  | Scale up or reduce TTL
hit_rate                | < 80%                  | Review eviction policy
miss_rate               | > 20%                  | Check key expiration
connected_clients       | > max_connections * 0.8| Increase connection pool
used_memory_dataset     | Growing without bound  | Check for keys without TTL
```

### 4.2 Monitoring Script

```python
import redis
import time

def monitor_eviction(r: redis.Redis, interval: int = 60):
    prev_evicted = 0
    
    while True:
        info = r.info()
        current_evicted = info.get('evicted_keys', 0)
        eviction_rate = (current_evicted - prev_evicted) / interval
        
        used_mb = info['used_memory'] / 1024 / 1024
        max_mb = info.get('maxmemory', 0) / 1024 / 1024
        usage_pct = (used_mb / max_mb * 100) if max_mb else 0
        
        print(f"[{time.strftime('%H:%M:%S')}] "
              f"Memory: {used_mb:.0f}/{max_mb:.0f} MB ({usage_pct:.1f}%) | "
              f"Evictions: {current_evicted} ({eviction_rate:.1f}/s) | "
              f"Policy: {info.get('maxmemory_policy', 'n/a')}")
        
        if eviction_rate > 100:
            print("ALERT: High eviction rate — consider increasing maxmemory")
        
        if usage_pct > 90:
            print("ALERT: Memory usage above 90%")
        
        prev_evicted = current_evicted
        time.sleep(interval)
```

---

## 5. Eviction Policy Tuning

### 5.1 maxmemory-samples

Redis uses sampling to approximate eviction. Higher samples = more accurate but slower eviction.

```bash
# Default: 5 samples (fast, less accurate)
maxmemory-samples 5

# High-accuracy: 10 samples (slower eviction, better choices)
maxmemory-samples 10

# Maximum accuracy: 20 samples (use for large caches with hot keys)
maxmemory-samples 20
```

### 5.2 Tuning Checklist

- [ ] Monitor eviction rate for 24 hours after policy change
- [ ] Compare hit ratio before and after policy change
- [ ] Verify no keys without TTL when using volatile-* policy
- [ ] Check memory fragmentation ratio (info: mem_fragmentation_ratio)
- [ ] Adjust maxmemory-samples if eviction choices are poor
- [ ] Document policy choice and reasoning per cache layer

---

## 6. Common Issues

### 6.1 Keys Without TTL Under volatile-* Policy

```python
# Problem: volatile-ttl only evicts keys with TTL.
# Keys without TTL accumulate and cause OOM.

# Fix: Find and fix keys without TTL
def find_keys_without_ttl(r: redis.Redis, pattern: str = "*") -> list:
    no_ttl_keys = []
    for key in r.scan_iter(match=pattern, count=1000):
        if r.ttl(key) == -1:  # -1 means no expiry
            no_ttl_keys.append(key)
    return no_ttl_keys

# Fix: Set TTL on all keys
for key in find_keys_without_ttl(r):
    r.expire(key, 3600)  # Default 1 hour TTL
```

### 6.2 Cache Churn (High Eviction, Low Hit Rate)

When the cache is too small for the working set, entries are evicted before they are reused.

```text
Diagnosis:
  - evicted_keys > 5000/min
  - hit_rate < 50%
  - memory_usage > 95%

Solutions:
  1. Increase maxmemory (scale up)
  2. Reduce TTL (let entries expire naturally)
  3. Switch to LFU (better for stable hot keys)
  4. Reduce key set (cache only hot keys)
  5. Add another cache layer (L1 in-process)
```

## FAQ

### When should I use volatile-ttl vs allkeys-lru?

Use `volatile-ttl` when all keys have TTL and you want to evict the ones closest to expiration first. This is ideal for time-sensitive data where expired data is less valuable. Use `allkeys-lru` when some keys may not have TTL and you want to evict the least recently used regardless of TTL. `allkeys-lru` is the safer default because it handles keys without TTL gracefully.

### How do I choose between LRU and LFU?

Use LRU when access patterns change over time (what was hot yesterday may not be hot today). LRU adapts quickly to changing patterns. Use LFU when the hot key set is stable (the same keys are always hot). LFU tracks access frequency, so a key accessed 1000 times stays in cache longer than one accessed 10 times, even if the 10-access key was used more recently. Most applications benefit from LRU. Switch to LFU only if you observe that LRU is evicting frequently-accessed keys.

### What is memory fragmentation and how do I fix it?

Memory fragmentation occurs when Redis allocates memory blocks but cannot reuse freed blocks efficiently. Check `mem_fragmentation_ratio` in Redis INFO. A ratio above 1.5 means 50% of allocated memory is fragmented. Fix by running `MEMORY PURGE` (Redis 4.0+) or restarting Redis during a maintenance window. Use `activedefrag yes` in Redis 6.0+ for automatic defragmentation.

### Should I use different eviction policies for different Redis databases?

Yes. Use different Redis databases (db 0, db 1, etc.) or separate instances for different data types with different eviction needs. For example: db 0 for user sessions (volatile-ttl, 15 min TTL), db 1 for product catalog (allkeys-lru, 1 hour TTL), db 2 for rate limiting (volatile-ttl, 60 sec TTL). This prevents one data type from evicting another when memory is constrained.

### How do I estimate the right cache size?

Measure your working set — the keys that are accessed within a typical time window. Start with a cache size that fits 120% of the working set. Monitor eviction rate and hit ratio for one week. If hit ratio is below 90% and evictions are high, increase the size. If hit ratio is above 95% and memory usage is below 60%, decrease the size to save costs. Use Redis MEMORY USAGE on sampled keys to estimate average key size.

## See Also

- [Complete Guide to Application-Level Caching](/guides/complete-guide-application-level-caching/)
- [Complete Guide to Redis Caching Strategies](/guides/complete-guide-redis-caching-strategies/)
- [Complete Guide to Redis in Production](/guides/complete-guide-redis-production/)
- [Cache Invalidation Pattern](/patterns/cache-invalidation-pattern/)
- [Cache Stampede Prevention Pattern](/patterns/cache-stampede-prevention-pattern/)

