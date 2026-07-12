---




contentType: patterns
slug: refresh-ahead-cache-pattern
title: "Refresh-Ahead Cache Pattern"
description: "Proactively refresh cache entries before they expire to eliminate cache misses on hot keys and maintain consistent read latency."
metaDescription: "Refresh-ahead cache pattern: proactively refresh entries before TTL expires. Eliminate cache misses on hot keys with Python, Java, and TypeScript examples."
difficulty: advanced
topics:
  - caching
  - design
tags:
  - caching
  - refresh-ahead
  - pattern
  - redis
  - proactive-refresh
  - performance
  - python
  - java
  - typescript
relatedResources:
  - /patterns/read-through-cache-pattern
  - /patterns/cache-stampede-prevention-pattern
  - /patterns/cache-invalidation-pattern
  - /patterns/write-behind-cache-pattern
  - /patterns/write-through-cache-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Refresh-ahead cache pattern: proactively refresh entries before TTL expires. Eliminate cache misses on hot keys with Python, Java, and TypeScript examples."
  keywords:
    - refresh-ahead cache
    - proactive cache refresh
    - cache preloading
    - background cache refresh
    - redis cache refresh
    - cache miss elimination




---

# Refresh-Ahead Cache Pattern

## Overview

Refresh-ahead proactively reloads cache entries before they expire. A background process monitors entries approaching their TTL deadline and refreshes them from the database. The cache always has fresh data, and reads never miss on hot keys.

This pattern eliminates the latency spike that occurs when a popular key expires. Instead of a request waiting for a cache miss + database reload, the data is already refreshed. The trade-off is background work: the system reloads data even if no one reads it.

## When to Use

- Hot keys must always be served from cache with zero miss latency
- Cache misses on popular keys cause noticeable latency spikes for users
- The database can handle the background refresh load
- You can predict which keys are hot enough to warrant proactive refresh
- Read consistency matters more than write consistency

## Solution

### Python with Background Refresh Thread

```python
import redis
import json
import threading
import time

class RefreshAheadCache:
    def __init__(self, redis_client: redis.Redis, ttl: int = 3600, refresh_threshold: float = 0.8):
        self.redis = redis_client
        self.ttl = ttl
        self.refresh_threshold = refresh_threshold  # Refresh when 80% of TTL elapsed
        self._refresh_callbacks = {}
        self._running = True
        self._refresh_thread = threading.Thread(target=self._refresh_loop, daemon=True)
        self._refresh_thread.start()

    def register(self, key: str, loader: callable, ttl: int = None):
        self._refresh_callbacks[key] = {
            "loader": loader,
            "ttl": ttl or self.ttl
        }
        # Initial population
        self._refresh_key(key)

    def get(self, key: str) -> any:
        cached = self.redis.get(key)
        if cached is not None:
            return json.loads(cached)
        # Fallback: load synchronously if not pre-registered or refresh failed
        if key in self._refresh_callbacks:
            return self._refresh_key(key)
        return None

    def _refresh_loop(self):
        while self._running:
            time.sleep(10)  # Check every 10 seconds
            for key, config in list(self._refresh_callbacks.items()):
                ttl_remaining = self.redis.ttl(key)
                # Refresh if TTL is below threshold or key is missing
                if ttl_remaining < 0 or ttl_remaining < config["ttl"] * (1 - self.refresh_threshold):
                    try:
                        self._refresh_key(key)
                    except Exception as e:
                        # Log error, keep stale data, retry next cycle
                        print(f"Refresh failed for {key}: {e}")

    def _refresh_key(self, key: str) -> any:
        config = self._refresh_callbacks[key]
        value = config["loader"]()
        self.redis.setex(key, config["ttl"], json.dumps(value))
        return value

    def shutdown(self):
        self._running = False
        self._refresh_thread.join(timeout=10)


cache = RefreshAheadCache(
    redis.Redis(host='localhost', port=6379),
    ttl=300,
    refresh_threshold=0.8
)

# Register hot keys for proactive refresh
cache.register(
    "product:featured",
    lambda: db.query_all("SELECT * FROM products WHERE featured = TRUE LIMIT 10"),
    ttl=300
)

cache.register(
    "config:app_settings",
    lambda: db.query_all("SELECT key, value FROM app_settings"),
    ttl=600
)

# Reads always hit cache
featured_products = cache.get("product:featured")
```

### TypeScript with Background Refresh

```typescript
import { createClient } from 'redis';

interface RefreshConfig {
  loader: () => Promise<any>;
  ttl: number;
}

class RefreshAheadCache {
  private redis: ReturnType<typeof createClient>;
  private refreshCallbacks: Map<string, RefreshConfig> = new Map();
  private refreshThreshold: number;
  private refreshTimer: NodeJS.Timeout | null = null;
  private running: boolean = true;

  constructor(redisClient: ReturnType<typeof createClient>, refreshThreshold = 0.8) {
    this.redis = redisClient;
    this.refreshThreshold = refreshThreshold;
    this.startRefreshLoop();
  }

  async register(key: string, loader: () => Promise<any>, ttl: number): Promise<void> {
    this.refreshCallbacks.set(key, { loader, ttl });
    await this.refreshKey(key);
  }

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }
    const config = this.refreshCallbacks.get(key);
    if (config) {
      return await this.refreshKey(key) as T;
    }
    return null;
  }

  private startRefreshLoop(): void {
    this.refreshTimer = setInterval(() => this.checkAndRefresh(), 10000);
  }

  private async checkAndRefresh(): Promise<void> {
    for (const [key, config] of this.refreshCallbacks) {
      const ttlRemaining = await this.redis.ttl(key);
      if (ttlRemaining < 0 || ttlRemaining < config.ttl * (1 - this.refreshThreshold)) {
        try {
          await this.refreshKey(key);
        } catch (error) {
          console.error(`Refresh failed for ${key}:`, error);
        }
      }
    }
  }

  private async refreshKey(key: string): Promise<any> {
    const config = this.refreshCallbacks.get(key)!;
    const value = await config.loader();
    await this.redis.set(key, JSON.stringify(value), { EX: config.ttl });
    return value;
  }

  async shutdown(): Promise<void> {
    this.running = false;
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }
}
```

### Java with Scheduled Executor

```java
import redis.clients.jedis.Jedis;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.concurrent.*;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class RefreshAheadCacheManager {

    private final Jedis redis;
    private final ObjectMapper mapper = new ObjectMapper();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);
    private final Map<String, RefreshConfig> refreshConfigs = new ConcurrentHashMap<>();
    private final double refreshThreshold;

    private record RefreshConfig(Callable<Object> loader, int ttl) {}

    public RefreshAheadCacheManager(Jedis jedis, double refreshThreshold) {
        this.redis = jedis;
        this.refreshThreshold = refreshThreshold;
        scheduler.scheduleAtFixedRate(this::checkAndRefresh, 10, 10, TimeUnit.SECONDS);
    }

    public void register(String key, Callable<Object> loader, int ttl) {
        refreshConfigs.put(key, new RefreshConfig(loader, ttl));
        refreshKey(key);
    }

    public <T> T get(String key, Class<T> type) {
        String cached = redis.get(key);
        if (cached != null) {
            try {
                return mapper.readValue(cached, type);
            } catch (Exception e) {
                // Fall through to refresh
            }
        }
        RefreshConfig config = refreshConfigs.get(key);
        if (config != null) {
            return refreshKey(key, type);
        }
        return null;
    }

    private void checkAndRefresh() {
        for (var entry : refreshConfigs.entrySet()) {
            String key = entry.getKey();
            RefreshConfig config = entry.getValue();
            long ttlRemaining = redis.ttl(key);
            if (ttlRemaining < 0 || ttlRemaining < config.ttl() * (1 - refreshThreshold)) {
                try {
                    refreshKey(key);
                } catch (Exception e) {
                    // Keep stale data, retry next cycle
                }
            }
        }
    }

    private void refreshKey(String key) {
        RefreshConfig config = refreshConfigs.get(key);
        if (config == null) return;
        try {
            Object value = config.loader().call();
            redis.setex(key, config.ttl(), mapper.writeValueAsString(value));
        } catch (Exception e) {
            throw new RuntimeException("Refresh failed for " + key, e);
        }
    }

    @SuppressWarnings("unchecked")
    private <T> T refreshKey(String key, Class<T> type) {
        refreshKey(key);
        String cached = redis.get(key);
        try {
            return mapper.readValue(cached, type);
        } catch (Exception e) {
            throw new RuntimeException("Deserialization failed for " + key, e);
        }
    }

    public void shutdown() {
        scheduler.shutdown();
    }
}
```

## Explanation

Refresh-ahead works by tracking the TTL of each registered key. A background process periodically checks if a key's remaining TTL has dropped below a threshold (e.g. 20% remaining). If so, it reloads the data from the database and resets the TTL.

The refresh threshold determines how aggressively entries are refreshed. A threshold of 0.8 means refresh when 80% of the TTL has elapsed (20% remaining). A higher threshold refreshes earlier, reducing the risk of a miss but increasing database load.

The key insight is that reads are always served from cache. The background refresh absorbs the database load. If a refresh fails, the stale cached data is still served until the next refresh cycle succeeds. This provides graceful degradation.

## Variants

| Approach | Trigger | Best For |
|----------|---------|----------|
| Time-based refresh | Check TTL every N seconds | Steady-state hot keys |
| Event-driven refresh | Refresh on database change event | Data that changes unpredictably |
| Probabilistic refresh | Random refresh near TTL expiry | High-traffic keys, spreads load |
| Hybrid refresh | Time + event combined | Mixed access patterns |
| Adaptive refresh | Adjust threshold based on access frequency | Variable traffic patterns |

## Best Practices


- For a deeper guide, see [Read-Through Cache Pattern](/patterns/read-through-cache-pattern/).

- **Only refresh hot keys** — refresh-ahead reloads data regardless of reads. Register only keys that are read frequently enough to justify the background work.
- **Set a refresh threshold** — refresh when 70-90% of the TTL has elapsed. Too early wastes database load; too late risks a miss if the refresh fails.
- **Keep stale data on refresh failure** — if the database is temporarily unavailable, serve the stale cached value. Log the failure and retry on the next cycle.
- **Monitor refresh success rate** — if refreshes frequently fail, the database may be overloaded. Increase the refresh interval or reduce the number of registered keys.
- **Use a separate thread or process** — refresh work must not block read requests. Use a daemon thread, scheduled executor, or separate worker process.

## Common Mistakes

- **Refreshing all keys** — refreshing every cached key defeats the purpose. Only hot keys benefit from refresh-ahead. Cold keys should rely on TTL expiration.
- **No failure handling** — if a refresh fails and the key expires, all reads miss. Always keep stale data and retry the refresh.
- **Blocking reads on refresh** — if the refresh runs in the read path, it adds latency. Run refreshes in a background thread, never in the request handler.
- **Threshold too low** — refreshing at 10% remaining TTL leaves almost no time to recover from a failed refresh. Set the threshold to at least 20% remaining.
- **Not monitoring database load** — refresh-ahead adds steady database load. If the database is already under pressure, the refreshes make it worse.

## Frequently Asked Questions

### How is refresh-ahead different from read-through?

Read-through refreshes on a cache miss: the request waits for the database load. Refresh-ahead refreshes before the miss: a background process reloads data while the cache still serves the old value. Read-through adds latency on miss; refresh-ahead eliminates miss latency.

### When should I use refresh-ahead over a longer TTL?

Use refresh-ahead when data changes frequently and a longer TTL would serve stale data for too long. Use a longer TTL when data changes infrequently and staleness is acceptable. Refresh-ahead keeps data fresher without adding miss latency.

### What happens if the database is down during a refresh?

The refresh fails. The cache continues serving the stale value until it expires. Once expired, reads miss and the loader attempts a direct database fetch. If that also fails, the application should handle the error (fallback, retry, or error response).

### Can I combine refresh-ahead with cache stampede prevention?

Yes. Refresh-ahead handles the common case (hot keys nearing expiration). Cache stampede prevention handles edge cases (refresh failure, unexpected traffic spikes). Together they provide both proactive and reactive protection.
