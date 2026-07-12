---


contentType: docs
slug: cache-eviction-policy-template
templateType: guideline
title: "Plantilla de Politica de Eviction de Cache"
description: "Plantilla para documentar eviction rules por cache layer: LRU, LFU, TTL, FIFO, random eviction. Incluye policy selection matrix, per-layer configuration, memory limits y monitoring rules con ejemplos de codigo."
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

Esta plantilla define eviction policies para cada cache layer en tu infrastructure. Eviction policies determinan que entries se remueven cuando el cache reacha su memory limit. El wrong policy causa cache churn, low hit ratios y degraded performance.

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

# Setea con explicit TTL (secondary eviction)
local_redis.setex("user:123", 3600, user_data)
```

### 2.4 L3: Shared Redis Cluster

```bash
# redis-cluster.conf — shared Redis cluster
maxmemory 32gb
maxmemory-policy volatile-ttl
maxmemory-samples 20

# volatile-ttl evictea keys con el shortest TTL first
# Keys sin TTL nunca se evict (a menos que allkeys-* policy)
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

# All keys DEBEN tener TTL — volatile-ttl solo evictea keys con TTL
cluster.setex("product:456", 7200, product_data)
```

---

## 3. Memory Limits

### 3.1 Memory Allocation Rules

```text
Rule 1: Nunca allocates mas de 75% de available RAM a cache
Rule 2: Reserva 15% para OS y background processes
Rule 3: Reserva 10% para connection buffers y overhead
Rule 4: Monitora actual usage — adjusta si eviction rate es high
Rule 5: Setea maxmemory para prevenir OOM kills
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

Redis usa sampling para approximate eviction. Higher samples = mas accurate pero slower eviction.

```bash
# Default: 5 samples (fast, less accurate)
maxmemory-samples 5

# High-accuracy: 10 samples (slower eviction, better choices)
maxmemory-samples 10

# Maximum accuracy: 20 samples (use para large caches con hot keys)
maxmemory-samples 20
```

### 5.2 Tuning Checklist

- [ ] Monitora eviction rate por 24 hours despues de policy change
- [ ] Compara hit ratio before y despues de policy change
- [ ] Verifica no keys sin TTL cuando uses volatile-* policy
- [ ] Checkea memory fragmentation ratio (info: mem_fragmentation_ratio)
- [ ] Adjusta maxmemory-samples si eviction choices son poor
- [ ] Documenta policy choice y reasoning per cache layer

---

## 6. Common Issues

### 6.1 Keys Without TTL Under volatile-* Policy

```python
# Problem: volatile-ttl solo evictea keys con TTL.
# Keys sin TTL accumulate y causan OOM.

# Fix: Find y fixea keys sin TTL
def find_keys_without_ttl(r: redis.Redis, pattern: str = "*") -> list:
    no_ttl_keys = []
    for key in r.scan_iter(match=pattern, count=1000):
        if r.ttl(key) == -1:  # -1 means no expiry
            no_ttl_keys.append(key)
    return no_ttl_keys

# Fix: Setea TTL en all keys
for key in find_keys_without_ttl(r):
    r.expire(key, 3600)  # Default 1 hour TTL
```

### 6.2 Cache Churn (High Eviction, Low Hit Rate)

Cuando el cache es too small para el working set, entries se evictan antes de que se reuseen.

```text
Diagnosis:
  - evicted_keys > 5000/min
  - hit_rate < 50%
  - memory_usage > 95%

Solutions:
  1. Increase maxmemory (scale up)
  2. Reduce TTL (let entries expire naturally)
  3. Switchea a LFU (better para stable hot keys)
  4. Reduce key set (cachea solo hot keys)
  5. Addea otro cache layer (L1 in-process)
```

## Preguntas Frecuentes

### ¿Cuándo deberia usar volatile-ttl vs allkeys-lru?

Usa `volatile-ttl` cuando all keys tienen TTL y queres evictear los closest a expiration first. Esto es ideal para time-sensitive data donde expired data es less valuable. Usa `allkeys-lru` cuando some keys pueden no tener TTL y queres evictear el least recently used regardless de TTL. `allkeys-lru` es el safer default porque handlea keys sin TTL gracefully.

### ¿Cómo elijo entre LRU y LFU?

Usa LRU cuando access patterns cambian over time (lo que fue hot yesterday puede no ser hot today). LRU adaptea quickly a changing patterns. Usa LFU cuando el hot key set es stable (los same keys son siempre hot). LFU trackea access frequency, asi que un key accessed 1000 times se queda en cache longer que uno accessed 10 times, incluso si el 10-access key fue usado mas recently. Most applications benefician de LRU. Switchea a LFU solo si observas que LRU esta evicteando frequently-accessed keys.

### ¿Qué es memory fragmentation y cómo lo fixeo?

Memory fragmentation ocurre cuando Redis allocatea memory blocks pero no puede reusear freed blocks efficiently. Checkea `mem_fragmentation_ratio` en Redis INFO. Un ratio above 1.5 means 50% de allocated memory es fragmented. Fixea corriendo `MEMORY PURGE` (Redis 4.0+) o restarteando Redis durante un maintenance window. Usa `activedefrag yes` en Redis 6.0+ para automatic defragmentation.

### ¿Deberia usar different eviction policies para different Redis databases?

Si. Usa different Redis databases (db 0, db 1, etc.) o separate instances para different data types con different eviction needs. Por ejemplo: db 0 para user sessions (volatile-ttl, 15 min TTL), db 1 para product catalog (allkeys-lru, 1 hour TTL), db 2 para rate limiting (volatile-ttl, 60 sec TTL). Esto previene que un data type evictee otro cuando memory esta constrained.

### ¿Cómo estimo el right cache size?

Measurea tu working set — los keys que son accessed dentro de un typical time window. Empeza con un cache size que fittee 120% del working set. Monitora eviction rate y hit ratio por one week. Si hit ratio es below 90% y evictions son high, increase el size. Si hit ratio es above 95% y memory usage es below 60%, decrease el size para save costs. Usa Redis MEMORY USAGE en sampled keys para estimate average key size.

## See Also

- [Complete Guide to Application-Level Caching](/es/guides/complete-guide-application-level-caching/)
- [Complete Guide to Redis Caching Strategies](/es/guides/complete-guide-redis-caching-strategies/)
- [Complete Guide to Redis in Production](/es/guides/complete-guide-redis-production/)
- [Cache Invalidation Pattern](/es/patterns/cache-invalidation-pattern/)
- [Cache Stampede Prevention Pattern](/es/patterns/cache-stampede-prevention-pattern/)

