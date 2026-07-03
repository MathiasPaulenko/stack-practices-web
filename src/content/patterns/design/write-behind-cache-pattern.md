---
contentType: patterns
slug: write-behind-cache-pattern
title: "Write-Behind Cache Pattern"
description: "Write to cache synchronously and persist to the database asynchronously for high-throughput write workloads with eventual consistency."
metaDescription: "Write-behind cache pattern: write to cache synchronously, persist to DB asynchronously. High-throughput writes with eventual consistency in Redis and Python."
difficulty: advanced
topics:
  - caching
  - design
tags:
  - caching
  - write-behind
  - pattern
  - redis
  - eventual-consistency
  - performance
  - python
  - java
  - typescript
relatedResources:
  - /patterns/design/write-through-cache-pattern
  - /patterns/design/read-through-cache-pattern
  - /patterns/design/cache-aside-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Write-behind cache pattern: write to cache synchronously, persist to DB asynchronously. High-throughput writes with eventual consistency in Redis and Python."
  keywords:
    - write-behind cache
    - write-back cache
    - async cache write
    - eventual consistency cache
    - redis write-behind
    - high throughput caching
---

# Write-Behind Cache Pattern

## Overview

In a write-behind cache (also called write-back), writes go to the cache synchronously and to the database asynchronously. The application writes to the cache, gets an immediate acknowledgment, and a background process flushes the cached changes to the database in batches.

This decouples write latency from database performance. The cache (typically in-memory or Redis) absorbs writes at memory speed. The database receives batched writes at a controlled rate, reducing load and enabling higher throughput.

The trade-off is eventual consistency: the cache and database are not guaranteed to be in sync at any given moment. If the cache crashes before flushing, committed writes are lost.

## When to Use

- Write-heavy workloads where write latency must stay low
- The database cannot keep up with the write rate
- You can tolerate brief periods of inconsistency between cache and database
- Batched writes to the database are more efficient than individual writes
- You have mechanisms to recover from cache failures (WAL, replication)

## Solution

### Python with Redis and Background Flush

```python
import redis
import json
import threading
import time
from collections import defaultdict

class WriteBehindCache:
    def __init__(self, redis_client: redis.Redis, db_writer: callable, flush_interval: float = 5.0):
        self.redis = redis_client
        self.db_writer = db_writer
        self.flush_interval = flush_interval
        self._dirty_keys = set()
        self._lock = threading.Lock()
        self._running = True
        self._flush_thread = threading.Thread(target=self._flush_loop, daemon=True)
        self._flush_thread.start()

    def write(self, key: str, value: dict, ttl: int = 3600) -> dict:
        serialized = json.dumps(value)
        self.redis.setex(key, ttl, serialized)

        with self._lock:
            self._dirty_keys.add(key)

        return value

    def _flush_loop(self):
        while self._running:
            time.sleep(self.flush_interval)
            self._flush()

    def _flush(self):
        with self._lock:
            if not self._dirty_keys:
                return
            keys_to_flush = list(self._dirty_keys)
            self._dirty_keys.clear()

        batch = []
        for key in keys_to_flush:
            value = self.redis.get(key)
            if value is not None:
                batch.append(json.loads(value))

        if batch:
            try:
                self.db_writer(batch)
            except Exception as e:
                # Re-add keys to dirty set for retry on next flush
                with self._lock:
                    self._dirty_keys.update(keys_to_flush)
                raise

    def flush_now(self):
        self._flush()

    def shutdown(self):
        self._running = False
        self._flush_thread.join(timeout=10)
        self._flush()


def batch_update_users(users: list[dict]):
    if not users:
        return
    values = []
    for u in users:
        values.extend([u["name"], u["email"], u["id"]])
    placeholders = ",".join(f"(%s, %s, %s)" for _ in users)
    db.execute(
        f"UPDATE users SET name = %s, email = %s WHERE id = %s VALUES {placeholders}",
        values
    )


cache = WriteBehindCache(
    redis.Redis(host='localhost', port=6379),
    db_writer=batch_update_users,
    flush_interval=2.0
)

def update_user(user_id: str, name: str, email: str) -> dict:
    user = {"id": user_id, "name": name, "email": email}
    return cache.write(f"user:{user_id}", user, ttl=3600)
```

### TypeScript with Redis and Queue

```typescript
import { createClient } from 'redis';

class WriteBehindCache {
  private client: ReturnType<typeof createClient>;
  private dirtyKeys: Set<string> = new Set();
  private flushTimer: NodeJS.Timeout | null = null;
  private flushInterval: number;

  constructor(
    client: ReturnType<typeof createClient>,
    private dbWriter: (batch: Array<{ key: string; value: any }>) => Promise<void>,
    flushIntervalMs = 5000
  ) {
    this.client = client;
    this.flushInterval = flushIntervalMs;
    this.startFlushTimer();
  }

  async write<T>(key: string, value: T, ttl = 3600): Promise<T> {
    await this.client.set(key, JSON.stringify(value), { EX: ttl });
    this.dirtyKeys.add(key);
    return value;
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
  }

  async flush(): Promise<void> {
    if (this.dirtyKeys.size === 0) return;

    const keys = Array.from(this.dirtyKeys);
    this.dirtyKeys.clear();

    const batch: Array<{ key: string; value: any }> = [];
    for (const key of keys) {
      const raw = await this.client.get(key);
      if (raw !== null) {
        batch.push({ key, value: JSON.parse(raw) });
      }
    }

    if (batch.length > 0) {
      try {
        await this.dbWriter(batch);
      } catch (error) {
        // Re-queue failed keys for next flush
        for (const item of batch) {
          this.dirtyKeys.add(item.key);
        }
        throw error;
      }
    }
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer);
    await this.flush();
  }
}

// Usage
const redisClient = createClient({ url: 'redis://localhost:6379' });
await redisClient.connect();

const cache = new WriteBehindCache(
  redisClient,
  async (batch) => {
    const values = batch.flatMap(b => [b.value.name, b.value.email, b.value.id]);
    const placeholders = batch.map(() => '($1, $2, $3)').join(', ');
    await db.query(
      `UPDATE users SET name = $1, email = $2 WHERE id = $3 VALUES ${placeholders}`,
      values
    );
  },
  3000
);

await cache.write(`user:${userId}`, { id: userId, name, email });
```

### Java with Spring Cache and Async

```java
import org.springframework.cache.annotation.CachePut;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class WriteBehindCacheService {

    private final UserRepository userRepository;
    private final Map<String, User> dirtyEntries = new ConcurrentHashMap<>();

    public WriteBehindCacheService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @CachePut(value = "users", key = "#user.id")
    public User writeUser(User user) {
        dirtyEntries.put(user.getId().toString(), user);
        return user;
    }

    @Scheduled(fixedDelay = 5000)
    public void flushToDatabase() {
        if (dirtyEntries.isEmpty()) return;

        List<User> batch = new ArrayList<>(dirtyEntries.values());
        dirtyEntries.clear();

        try {
            userRepository.saveAll(batch);
        } catch (Exception e) {
            // Re-queue failed entries
            for (User u : batch) {
                dirtyEntries.put(u.getId().toString(), u);
            }
        }
    }
}
```

## Explanation

The write-behind pattern separates write acknowledgment from persistence:

1. **Cache write** — the application writes to the cache. The write is acknowledged immediately. The caller does not wait for the database.
2. **Dirty tracking** — the cache marks the written key as dirty, meaning the database has not yet been updated.
3. **Background flush** — a timer or event triggers a flush. The cache collects all dirty entries, sends them to the database in a batch, and clears the dirty set.
4. **Failure recovery** — if the database write fails, the dirty keys are re-queued for the next flush. This ensures eventual delivery.

The key insight is that reads always go to the cache, which has the latest data. The database lags behind but eventually catches up. This works when the application reads from the cache, not the database.

## Variants

| Approach | Flush Trigger | Best For |
|----------|---------------|----------|
| Time-based flush | Fixed interval (e.g. 5s) | Steady write workloads |
| Batch-size flush | When N dirty entries accumulate | High-volume writes |
| Hybrid flush | Time OR batch size, whichever first | Variable write rates |
| Event-driven flush | On specific events (e.g. shutdown) | Graceful degradation |
| WAL-based flush | Write-ahead log for durability | Crash recovery requirements |

## Best Practices

- **Use a durable cache** — if the cache crashes, unflushed writes are lost. Use Redis with persistence (AOF or RDB) to reduce data loss risk.
- **Batch database writes** — the main performance gain comes from batching. Group multiple writes into a single SQL statement or transaction.
- **Implement retry on flush failure** — if the database is temporarily unavailable, re-queue dirty keys. Use exponential backoff to avoid overwhelming a recovering database.
- **Flush on shutdown** — when the application stops, flush all dirty entries to avoid data loss. Register a shutdown hook.
- **Monitor dirty entry count** — if dirty entries grow unbounded, the flush rate is too slow. Increase flush frequency or batch size.

## Common Mistakes

- **No flush on shutdown** — if the process crashes, dirty entries are lost. Always flush on graceful shutdown and use a durable cache.
- **Flushing one entry at a time** — this defeats the purpose of write-behind. Batch writes to reduce database load.
- **No retry on failure** — if a flush fails and dirty keys are cleared, the data is lost. Always re-queue on failure.
- **Using write-behind for financial data** — eventual consistency means the database may not reflect the latest state. Use write-through for data that requires immediate persistence.
- **Not handling cache eviction** — if a dirty entry is evicted from the cache before flushing, the write is lost. Use a separate dirty set or write-ahead log.

## Frequently Asked Questions

### What is the difference between write-behind and write-through?

Write-through writes to cache and database synchronously. The caller waits for both. Write-behind writes to cache synchronously and database asynchronously. The caller waits only for the cache. Write-through is consistent; write-behind is eventually consistent.

### How do I prevent data loss if the cache crashes?

Use Redis with AOF (Append-Only File) persistence. AOF writes every operation to disk before acknowledging. If Redis crashes, it replays the AOF on restart. For stronger guarantees, use a write-ahead log (WAL) in the application before writing to the cache.

### When is write-behind better than write-through?

Write-behind is better when write throughput is more important than immediate consistency. Examples: view counters, analytics events, user preferences. Write-through is better when the database must reflect the latest state immediately: financial transactions, inventory updates.

### Can I combine write-behind with read-through?

Yes. Reads go through the cache with a loader callback. Writes go to the cache with async database persistence. The cache always has the latest data for reads, and the database eventually catches up. This combination handles both high read and high write workloads.
