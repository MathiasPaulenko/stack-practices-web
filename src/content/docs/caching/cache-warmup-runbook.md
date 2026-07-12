---


contentType: docs
slug: cache-warmup-runbook
templateType: runbook
title: "Cache Warmup Runbook"
description: "Runbook for warming caches after deployment, restart, or incident: identify hot keys, preload strategies, progressive warmup, health checks, and rollback procedures with code examples and automation scripts."
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

This runbook covers cache warmup procedures for after deployments, cache restarts, failovers, and incidents. Cold caches cause latency spikes, thundering herds, and degraded user experience. Warmup prevents these issues by preloading hot data before traffic resumes.

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
  - Traffic is low (< 100 req/s)
  - Cache hit ratio recovers within 5 minutes
  - No user-facing latency requirements

Warm up when:
  - Traffic is high (> 500 req/s)
  - Cold cache causes > 500ms p95 latency
  - SLA requires < 200ms response time
  - After cache failover in production
  - Before opening traffic to a new region
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
            # Parse cache key from structured log
            entry = json.loads(line)
            if entry.get('cache_key'):
                key_counter[entry['cache_key']] += 1
    
    return [key for key, _ in key_counter.most_common(top_n)]

def get_hot_keys_from_redis(top_n: int = 100) -> list:
    # Use Redis MEMORY USAGE on sampled keys
    keys = r.scan_iter(count=10000)
    key_sizes = []
    
    for key in keys:
        try:
            size = r.memory_usage(key)
            if size:
                key_sizes.append((key, size))
        except:
            continue
    
    # Sort by memory usage (proxy for importance)
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
        # Skip if key already exists
        if r.exists(key):
            return True
        
        # Load data from database
        data = loader(key)
        if data is None:
            return False
        
        # Set in cache with TTL
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

Warm up in waves to avoid overwhelming the database.

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
        
        # Adjust concurrency per priority
        workers = {
            "critical": 20,
            "high": 15,
            "medium": 10,
            "low": 5,
        }[priority]
        
        # Warm in chunks
        chunk_size = 100
        for i in range(0, len(keys), chunk_size):
            chunk = keys[i:i + chunk_size]
            warmup_batch(chunk, loader, ttl, workers)
            
            # Brief pause between chunks
            time.sleep(0.5)
        
        print(f"  {priority} warmup complete")
```

### 3.3 Warmup with Health Checks

```python
def warmup_with_health_check(keys: list, loader: callable, ttl: int = 3600):
    # Check cache health before starting
    try:
        r.ping()
        info = r.info()
        print(f"Redis status: {info['status']}, memory: {info['used_memory_human']}")
    except Exception as e:
        print(f"Redis not healthy: {e}")
        return False
    
    # Warmup
    warmed, failed = warmup_batch(keys, loader, ttl)
    
    # Verify warmup
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
# Run this BEFORE switching traffic to new deployment

REDIS_HOST="localhost"
REDIS_PORT=6379
WARMUP_SCRIPT="/opt/scripts/cache-warmup.py"

echo "=== Pre-Deployment Cache Warmup ==="

# 1. Export hot keys from current production
echo "Extracting hot keys from production logs..."
python /opt/scripts/extract-hot-keys.py --output /tmp/hot-keys.json

# 2. Warm new cache cluster
echo "Warming cache cluster..."
python $WARMUP_SCRIPT --keys /tmp/hot-keys.json --redis $REDIS_HOST:$REDIS_PORT

# 3. Verify cache health
echo "Verifying cache health..."
redis-cli -h $REDIS_HOST -p $REDIS_PORT info | grep used_memory_human
redis-cli -h $REDIS_HOST -p $REDIS_PORT dbsize

echo "=== Warmup complete. Ready for deployment. ==="
```

### 4.2 Post-Deployment Verification

```python
def post_deploy_verification(warmup_keys: list):
    """Verify cache is serving after deployment."""
    import random
    
    # Sample 50 random keys from warmup set
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
    """Warm up cache immediately after Redis failover."""
    r = redis.Redis(host=new_redis_host, port=6379)
    
    # 1. Verify new Redis is accepting connections
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
    
    # 2. Load hot keys
    with open(hot_keys_file) as f:
        key_groups = json.load(f)
    
    # 3. Fast warmup — critical keys only first
    critical_keys = key_groups.get("critical", [])
    print(f"Fast warming {len(critical_keys)} critical keys...")
    warmup_batch(critical_keys, loader, ttl=900, workers=20)
    
    # 4. Then high priority
    high_keys = key_groups.get("high", [])
    print(f"Warming {len(high_keys)} high-priority keys...")
    warmup_batch(high_keys, loader, ttl=3600, workers=15)
    
    print("Critical and high-priority warmup complete.")
    print("Medium and low-priority keys will fill naturally.")
    return True
```

### 5.2 Incident Warmup Checklist

- [ ] Confirm new cache instance is healthy and accepting connections
- [ ] Verify network connectivity between application and cache
- [ ] Load hot keys from pre-saved file or analytics
- [ ] Warm critical keys first (sessions, config)
- [ ] Warm high-priority keys second (user profiles, catalog)
- [ ] Monitor database load during warmup
- [ ] Verify cache hit ratio after warmup
- [ ] Resume normal traffic gradually (canary 10% → 50% → 100%)

---

## 6. Automation

### 6.1 Scheduled Warmup Script

```python
#!/usr/bin/env python3
"""Scheduled cache warmup — run via cron or task scheduler."""

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
# Cron: warm cache every 30 minutes
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

## FAQ

### How long should cache warmup take?

For most applications, 1-5 minutes is sufficient. Critical keys (sessions, config) should be warmed in under 30 seconds. The total warmup time depends on the number of keys, database query speed, and concurrency. If warmup takes more than 10 minutes, reduce the key set to critical-only and let the rest fill naturally.

### Should I warm up all keys or just hot keys?

Warm up only hot keys — the top 1-5% of keys that receive 80-90% of traffic. Warming all keys wastes database resources and fills cache with data that may never be accessed. Identify hot keys from access logs, Redis MEMORY USAGE, or analytics. Focus on keys with high request frequency and high compute cost to regenerate.

### What happens if warmup fails?

If warmup fails, the cache will fill naturally as traffic arrives. This causes higher latency for the first requests after deployment. If latency is unacceptable, delay the deployment or traffic switch until warmup succeeds. Keep the old cache running during warmup so you can roll back if needed. Monitor database load during natural fill — if the database is overwhelmed, enable request queuing or rate limiting.

### How do I warm up a Redis cluster with multiple shards?

Connect to each shard directly and warm keys based on their hash slot. Use `redis-cli -c` (cluster mode) to automatically route keys to the correct shard. Alternatively, use a Redis cluster client library that handles routing. Warm each shard in parallel to reduce total warmup time. Monitor per-shard memory to avoid overfilling one shard.

### Can I warm up cache without downtime?

Yes. Warm the new cache while the old cache is still serving traffic. Once warmup is complete, switch the application to use the new cache. Keep the old cache available for 5-10 minutes as a fallback. This zero-downtime approach requires two cache instances but eliminates cold-start latency entirely.

## See Also

- [Complete Guide to Redis Caching Strategies](/guides/complete-guide-redis-caching-strategies/)
- [Complete Guide to Redis in Production](/guides/complete-guide-redis-production/)
- [Cache Invalidation Pattern](/patterns/cache-invalidation-pattern/)
- [Cache Stampede Prevention Pattern](/patterns/cache-stampede-prevention-pattern/)
- [Read-Through Cache Pattern](/patterns/read-through-cache-pattern/)

