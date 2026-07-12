---


contentType: docs
slug: cache-warmup-runbook
templateType: runbook
title: "Runbook de Cache Warmup"
description: "Runbook para warmear caches despues de deployment, restart o incident: identificar hot keys, preload strategies, progressive warmup, health checks y rollback procedures con ejemplos de codigo y automation scripts."
metaDescription: "Runbook for cache warmup after deployment, restart, or incident: hot keys, preload strategies, progressive warmup, health checks, rollback procedures, automation scripts."
difficulty: intermediate
topics:
  - caching
tags:
  - caching
  - cache-warmup
  - runbook
  - redis
  - deployment
  - incident-response
relatedResources:
  - /docs/cache-strategy-decision-template
  - /docs/cache-eviction-policy-template
  - /docs/cdn-cache-rules-template
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Runbook for cache warmup after deployment, restart, or incident: hot keys, preload strategies, progressive warmup, health checks, rollback procedures, automation scripts."
  keywords:
    - cache warmup
    - cache preloading
    - redis warmup
    - cache cold start
    - cache thundering herd
    - deployment runbook
    - cache initialization


---

## Overview

Este runbook cubre cache warmup procedures para despues de deployments, cache restarts, failovers y incidents. Cold caches causan latency spikes, thundering herds y degraded user experience. Warmup previene estos issues preloadando hot data antes de que traffic resume.

---

## 1. When to Warm Up

### 1.1 Triggers

```text
Trigger                    | Severity    | Warmup time
───────────────────────────┼─────────────┼──────────────
Planned deployment         | Low         | 2-5 min
Cache restart (Redis)      | Medium      | 1-3 min
Cache failover (sentinel)  | High        | 30 sec - 2 min
Post-incident recovery     | High        | 1-5 min
New cache cluster          | Medium      | 5-10 min
Cache flush (debug/test)   | Low         | 1-3 min
```

### 1.2 Decision: Warm Up or Let It Fill Naturally?

```text
Let it fill naturally when:
  - Traffic es low (< 100 req/s)
  - Cache hit ratio recovers dentro de 5 minutes
  - No user-facing latency requirements

Warm up when:
  - Traffic es high (> 500 req/s)
  - Cold cache causa > 500ms p95 latency
  - SLA requiere < 200ms response time
  - Despues de cache failover en production
  - Antes de abrir traffic a un new region
```

---

## 2. Pre-Warmup: Identify Hot Keys

### 2.1 Extract Hot Keys from Analytics

```python
import redis
import json
from collections import Counter

r = redis.Redis(host='localhost', port=6379, db=0)

def get_hot_keys_from_logs(log_path: str, top_n: int = 1000) -> list:
    key_counter = Counter()
    
    with open(log_path) as f:
        for line in f:
            # Parsea cache key de structured log
            entry = json.loads(line)
            if entry.get('cache_key'):
                key_counter[entry['cache_key']] += 1
    
    return [key for key, _ in key_counter.most_common(top_n)]

def get_hot_keys_from_redis(top_n: int = 100) -> list:
    # Usa Redis MEMORY USAGE en sampled keys
    keys = r.scan_iter(count=10000)
    key_sizes = []
    
    for key in keys:
        try:
            size = r.memory_usage(key)
            if size:
                key_sizes.append((key, size))
        except:
            continue
    
    # Sortea por memory usage (proxy para importance)
    key_sizes.sort(key=lambda x: x[1], reverse=True)
    return [key for key, _ in key_sizes[:top_n]]
```

### 2.2 Hot Key Categories

```text
Category              | Key pattern              | Priority
──────────────────────┼──────────────────────────┼──────────
User sessions         | session:{user_id}        | Critical
User profiles         | user:{user_id}           | High
Product catalog       | product:{product_id}     | High
Configuration         | config:{service}         | High
Rate limit counters   | ratelimit:{user_id}      | Medium
Search results        | search:{query_hash}      | Low
Computed aggregations | stats:{metric}:{period}  | Medium
```

---

## 3. Warmup Procedures

### 3.1 Basic Warmup Script

```python
import redis
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

r = redis.Redis(host='localhost', port=6379, db=0)

def warmup_key(key: str, loader: callable, ttl: int = 3600) -> bool:
    try:
        # Skipea si key ya existe
        if r.exists(key):
            return True
        
        # Loadea data de database
        data = loader(key)
        if data is None:
            return False
        
        # Setea en cache con TTL
        r.setex(key, ttl, json.dumps(data))
        return True
    except Exception as e:
        print(f"Failed to warm {key}: {e}")
        return False

def warmup_batch(keys: list, loader: callable, ttl: int = 3600, workers: int = 10):
    warmed = 0
    failed = 0
    
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(warmup_key, key, loader, ttl): key
            for key in keys
        }
        
        for future in as_completed(futures):
            if future.result():
                warmed += 1
            else:
                failed += 1
    
    print(f"Warmup complete: {warmed} warmed, {failed} failed")
    return warmed, failed
```

### 3.2 Progressive Warmup

Warmea en waves para avoid overwhelming el database.

```python
def progressive_warmup(key_groups: dict, loader: callable, ttl: int = 3600):
    """
    key_groups: {
        "critical": ["session:1", "session:2", ...],
        "high": ["user:1", "user:2", ...],
        "medium": ["product:1", "product:2", ...],
        "low": ["search:abc", "search:def", ...],
    }
    """
    for priority in ["critical", "high", "medium", "low"]:
        keys = key_groups.get(priority, [])
        if not keys:
            continue
        
        print(f"\nWarming {priority} keys ({len(keys)} keys)...")
        
        # Adjusta concurrency per priority
        workers = {
            "critical": 20,
            "high": 15,
            "medium": 10,
            "low": 5,
        }[priority]
        
        # Warmea en chunks
        chunk_size = 100
        for i in range(0, len(keys), chunk_size):
            chunk = keys[i:i + chunk_size]
            warmup_batch(chunk, loader, ttl, workers)
            
            # Brief pause entre chunks
            time.sleep(0.5)
        
        print(f"  {priority} warmup complete")
```

### 3.3 Warmup with Health Checks

```python
def warmup_with_health_check(keys: list, loader: callable, ttl: int = 3600):
    # Checkea cache health antes de starting
    try:
        r.ping()
        info = r.info()
        print(f"Redis status: {info['status']}, memory: {info['used_memory_human']}")
    except Exception as e:
        print(f"Redis not healthy: {e}")
        return False
    
    # Warmup
    warmed, failed = warmup_batch(keys, loader, ttl)
    
    # Verifica warmup
    total_keys = len(keys)
    hit_ratio = warmed / total_keys * 100
    
    print(f"\nWarmup verification:")
    print(f"  Total keys: {total_keys}")
    print(f"  Warmed: {warmed} ({hit_ratio:.1f}%)")
    print(f"  Failed: {failed}")
    
    if hit_ratio < 80:
        print("WARNING: Warmup hit ratio below 80%. Investigate failures.")
        return False
    
    return True
```

---

## 4. Deployment Warmup

### 4.1 Pre-Deployment Warmup

```bash
#!/bin/bash
# warmup-before-deploy.sh
# Corre esto ANTES de switchear traffic a new deployment

REDIS_HOST="localhost"
REDIS_PORT=6379
WARMUP_SCRIPT="/opt/scripts/cache-warmup.py"

echo "=== Pre-Deployment Cache Warmup ==="

# 1. Exporta hot keys de current production
echo "Extracting hot keys from production logs..."
python /opt/scripts/extract-hot-keys.py --output /tmp/hot-keys.json

# 2. Warmea new cache cluster
echo "Warming cache cluster..."
python $WARMUP_SCRIPT --keys /tmp/hot-keys.json --redis $REDIS_HOST:$REDIS_PORT

# 3. Verifica cache health
echo "Verifying cache health..."
redis-cli -h $REDIS_HOST -p $REDIS_PORT info | grep used_memory_human
redis-cli -h $REDIS_HOST -p $REDIS_PORT dbsize

echo "=== Warmup complete. Ready for deployment. ==="
```

### 4.2 Post-Deployment Verification

```python
def post_deploy_verification(warmup_keys: list):
    """Verifica cache esta serving despues de deployment."""
    import random
    
    # Samplea 50 random keys del warmup set
    sample = random.sample(warmup_keys, min(50, len(warmup_keys)))
    
    hits = 0
    misses = 0
    
    for key in sample:
        if r.exists(key):
            hits += 1
        else:
            misses += 1
    
    hit_ratio = hits / len(sample) * 100
    print(f"Post-deploy cache check: {hits}/{len(sample)} hits ({hit_ratio:.1f}%)")
    
    if hit_ratio < 90:
        print("ALERT: Cache hit ratio below 90% after deployment")
        return False
    
    return True
```

---

## 5. Incident Warmup

### 5.1 Cache Failover Warmup

```python
def warmup_after_failover(new_redis_host: str, hot_keys_file: str):
    """Warmea cache immediately despues de Redis failover."""
    r = redis.Redis(host=new_redis_host, port=6379)
    
    # 1. Verifica new Redis esta accepting connections
    for attempt in range(10):
        try:
            r.ping()
            break
        except:
            print(f"Waiting for Redis... attempt {attempt + 1}")
            time.sleep(1)
    else:
        print("ERROR: Redis not available after 10 seconds")
        return False
    
    # 2. Loadea hot keys
    with open(hot_keys_file) as f:
        key_groups = json.load(f)
    
    # 3. Fast warmup — critical keys solo first
    critical_keys = key_groups.get("critical", [])
    print(f"Fast warming {len(critical_keys)} critical keys...")
    warmup_batch(critical_keys, loader, ttl=900, workers=20)
    
    # 4. Despues high priority
    high_keys = key_groups.get("high", [])
    print(f"Warming {len(high_keys)} high-priority keys...")
    warmup_batch(high_keys, loader, ttl=3600, workers=15)
    
    print("Critical and high-priority warmup complete.")
    print("Medium and low-priority keys will fill naturally.")
    return True
```

### 5.2 Incident Warmup Checklist

- [ ] Confirma new cache instance esta healthy y accepting connections
- [ ] Verifica network connectivity entre application y cache
- [ ] Loadea hot keys de pre-saved file o analytics
- [ ] Warmea critical keys first (sessions, config)
- [ ] Warmea high-priority keys second (user profiles, catalog)
- [ ] Monitora database load durante warmup
- [ ] Verifica cache hit ratio despues de warmup
- [ ] Resume normal traffic gradually (canary 10% → 50% → 100%)

---

## 6. Automation

### 6.1 Scheduled Warmup Script

```python
#!/usr/bin/env python3
"""Scheduled cache warmup — corre via cron o task scheduler."""

import redis
import json
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cache-warmup")

def main():
    config = load_config("/etc/cache-warmup/config.json")
    r = redis.Redis(**config["redis"])
    
    start = datetime.now()
    logger.info(f"Starting scheduled warmup at {start}")
    
    for source in config["warmup_sources"]:
        keys = load_keys(source["keys_file"])
        loader = get_loader(source["loader"])
        
        warmed, failed = warmup_batch(
            keys, loader, 
            ttl=source.get("ttl", 3600),
            workers=source.get("workers", 10)
        )
        
        logger.info(f"{source['name']}: {warmed} warmed, {failed} failed")
    
    duration = (datetime.now() - start).total_seconds()
    logger.info(f"Warmup completed in {duration:.1f}s")

if __name__ == "__main__":
    main()
```

```bash
# Cron: warmea cache cada 30 minutes
*/30 * * * * /usr/bin/python3 /opt/scripts/scheduled-warmup.py >> /var/log/cache-warmup.log 2>&1
```

### 6.2 Kubernetes Warmup Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: cache-warmup
spec:
  ttlSecondsAfterFinished: 60
  template:
    spec:
      containers:
      - name: warmup
        image: registry.internal/cache-warmup:latest
        command: ["python3", "/app/warmup.py"]
        env:
        - name: REDIS_HOST
          value: "redis-cluster.internal"
        - name: REDIS_PORT
          value: "6379"
        - name: HOT_KEYS_FILE
          value: "/config/hot-keys.json"
        volumeMounts:
        - name: config
          mountPath: /config
      volumes:
      - name: config
        configMap:
          name: cache-warmup-config
      restartPolicy: OnFailure
```

## Preguntas Frecuentes

### ¿Cuánto deberia tomar cache warmup?

Para most applications, 1-5 minutes es sufficient. Critical keys (sessions, config) deberian ser warmed en under 30 seconds. El total warmup time depende del number de keys, database query speed, y concurrency. Si warmup toma mas de 10 minutes, reduce el key set a critical-only y deja el rest fill naturally.

### ¿Deberia warmear all keys o solo hot keys?

Warmea solo hot keys — el top 1-5% de keys que reciben 80-90% de traffic. Warmear all keys wasta database resources y fillea cache con data que puede nunca ser accessed. Identifica hot keys de access logs, Redis MEMORY USAGE, o analytics. Focate en keys con high request frequency y high compute cost para regenerate.

### ¿Qué pasa si warmup failea?

Si warmup failea, el cache fillleara naturally mientras traffic arrivea. Esto causa higher latency para los first requests despues de deployment. Si latency es unacceptable, delayea el deployment o traffic switch hasta que warmup succeda. Keepea el old cache running durante warmup para poder roll back si needed. Monitora database load durante natural fill — si el database es overwhelmed, enablea request queuing o rate limiting.

### ¿Cómo warmeo un Redis cluster con multiple shards?

Connecta a cada shard directly y warmea keys basado en su hash slot. Usa `redis-cli -c` (cluster mode) para automaticamente routear keys al correct shard. Alternativamente, usa un Redis cluster client library que handlea routing. Warmea cada shard en parallel para reducir total warmup time. Monitora per-shard memory para avoid overfilling un shard.

### ¿Puedo warmear cache sin downtime?

Si. Warmea el new cache mientras el old cache esta still serving traffic. Una vez warmup complete, switchea el application para usar el new cache. Keepea el old cache available por 5-10 minutes como fallback. Este zero-downtime approach requiere dos cache instances pero elimina cold-start latency entirely.

## See Also

- [Complete Guide to Redis Caching Strategies](/es/guides/complete-guide-redis-caching-strategies/)
- [Complete Guide to Redis in Production](/es/guides/complete-guide-redis-production/)
- [Cache Invalidation Pattern](/es/patterns/cache-invalidation-pattern/)
- [Cache Stampede Prevention Pattern](/es/patterns/cache-stampede-prevention-pattern/)
- [Read-Through Cache Pattern](/es/patterns/read-through-cache-pattern/)

