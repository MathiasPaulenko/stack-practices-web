---
contentType: patterns
slug: write-through-cache-pattern
title: "Write-Through Cache Pattern"
description: "Synchronously write to both cache and backing store so the cache always has the latest data without TTL-based invalidation."
metaDescription: "Write-through cache pattern: synchronously write to cache and database so data stays consistent. Implement with Redis and Python, Java, and TypeScript examples."
difficulty: intermediate
topics:
  - caching
  - design
tags:
  - caching
  - write-through
  - pattern
  - redis
  - cache-consistency
  - performance
  - python
  - java
  - typescript
relatedResources:
  - /patterns/design/cache-aside-pattern
  - /patterns/design/read-through-cache-pattern
  - /recipes/caching/nodejs-redis-cache-invalidation
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Write-through cache pattern: synchronously write to cache and database so data stays consistent. Implement with Redis and Python, Java, and TypeScript examples."
  keywords:
    - write-through cache
    - cache pattern
    - cache consistency
    - redis caching
    - synchronous write cache
    - python cache
    - java cache
---

# Write-Through Cache Pattern

## Overview

In a write-through cache, every write operation goes to both the cache and the backing store synchronously. The application writes to the cache, the cache writes to the database, and both succeed before the operation returns. This guarantees the cache always reflects the latest data.

The trade-off is write latency: each write incurs the cost of updating both cache and database. Reads remain fast because the cache is always up to date. This pattern suits read-heavy workloads where data consistency between cache and database is critical.

## When to Use

- Read-heavy workloads where reads far outnumber writes
- You need strong consistency between cache and database
- Stale cache data causes correctness issues (financial systems, inventory)
- You want to eliminate cache invalidation logic by keeping cache always fresh
- Write latency is acceptable in exchange for read performance and consistency

## Solution

### Python with Redis

```python
import redis
import json
from typing import Any

class WriteThroughCache:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def write(self, key: str, value: Any, db_writer: callable, ttl: int = 3600) -> Any:
        serialized = json.dumps(value)

        # Write to database first (source of truth)
        db_writer(value)

        # Then write to cache
        self.redis.setex(key, ttl, serialized)

        return value

    def write_transaction(self, key: str, value: Any, db_writer: callable, ttl: int = 3600) -> Any:
        pipe = self.redis.pipeline()
        try:
            # Write to database
            db_writer(value)

            # Queue cache write
            pipe.setex(key, ttl, json.dumps(value))
            pipe.execute()

            return value
        except Exception as e:
            # If DB write succeeds but cache write fails, invalidate cache
            # to prevent stale data on next read
            self.redis.delete(key)
            raise


cache = WriteThroughCache(redis.Redis(host='localhost', port=6379))

def update_user(user_id: str, name: str, email: str) -> dict:
    user = {"id": user_id, "name": name, "email": email}
    return cache.write(
        f"user:{user_id}",
        user,
        lambda u: db.execute(
            "UPDATE users SET name = %s, email = %s WHERE id = %s",
            [u["name"], u["email"], u["id"]]
        ),
        ttl=1800
    )
```

### TypeScript with Redis

```typescript
import { createClient } from 'redis';

class WriteThroughCache {
  private client: ReturnType<typeof createClient>;

  constructor(client: ReturnType<typeof createClient>) {
    this.client = client;
  }

  async write<T>(
    key: string,
    value: T,
    dbWriter: (value: T) => Promise<void>,
    ttl = 3600
  ): Promise<T> {
    try {
      // Write to database first
      await dbWriter(value);

      // Then update cache
      await this.client.set(key, JSON.stringify(value), { EX: ttl });

      return value;
    } catch (error) {
      // If DB write fails, do not update cache
      // If cache write fails, invalidate to prevent stale reads
      await this.client.del(key).catch(() => {});
      throw error;
    }
  }

  async delete(key: string, dbDeleter: () => Promise<void>): Promise<void> {
    await dbDeleter();
    await this.client.del(key);
  }
}

// Usage
const redisClient = createClient({ url: 'redis://localhost:6379' });
await redisClient.connect();
const cache = new WriteThroughCache(redisClient);

async function updateUser(userId: string, name: string, email: string): Promise<User> {
  const user = { id: userId, name, email };
  return cache.write(
    `user:${userId}`,
    user,
    async (u) => {
      await db.query(
        'UPDATE users SET name = $1, email = $2 WHERE id = $3',
        [u.name, u.email, u.id]
      );
    },
    1800
  );
}
```

### Java with Spring Cache

```java
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // @CachePut always writes to cache after method execution
    // The method writes to DB, Spring writes result to cache
    @CachePut(value = "users", key = "#user.id")
    public User saveUser(User user) {
        return userRepository.save(user);
    }

    @CachePut(value = "users", key = "#id")
    public User updateUser(Long id, String name, String email) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("User not found"));
        user.setName(name);
        user.setEmail(email);
        return userRepository.save(user);
    }

    @CacheEvict(value = "users", key = "#id")
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }
}
```

### Combining Read-Through and Write-Through

```python
class ReadWriteThroughCache:
    def __init__(self, redis_client: redis.Redis, ttl: int = 3600):
        self.redis = redis_client
        self.ttl = ttl

    def read(self, key: str, loader: callable) -> Any:
        cached = self.redis.get(key)
        if cached is not None:
            return json.loads(cached)

        value = loader()
        self.redis.setex(key, self.ttl, json.dumps(value))
        return value

    def write(self, key: str, value: Any, db_writer: callable, ttl: int = None) -> Any:
        db_writer(value)
        self.redis.setex(key, ttl or self.ttl, json.dumps(value))
        return value

    def delete(self, key: str, db_deleter: callable) -> None:
        db_deleter()
        self.redis.delete(key)


cache = ReadWriteThroughCache(redis.Redis(host='localhost', port=6379))

def get_user(user_id: str) -> dict:
    return cache.read(
        f"user:{user_id}",
        lambda: db.query_one("SELECT * FROM users WHERE id = %s", [user_id])
    )

def update_user(user_id: str, **fields) -> dict:
    user = {"id": user_id, **fields}
    return cache.write(
        f"user:{user_id}",
        user,
        lambda u: db.execute("UPDATE users SET name=%s WHERE id=%s", [u["name"], u["id"]])
    )
```

## Explanation

The write-through pattern ensures data consistency by writing to both cache and database in sequence:

1. **Write to database** — the database is the source of truth. Write here first so that if the cache write fails, the data is still persisted.
2. **Write to cache** — after the database write succeeds, update the cache with the new value.
3. **Error handling** — if the cache write fails after the database write succeeds, invalidate the cache entry. The next read will miss and reload from the database via read-through or cache-aside.

The order matters: database first, cache second. If you write to cache first and the database write fails, the cache has data that does not exist in the database. If you write to database first and the cache write fails, the cache has stale data, but the next read-through will fix it.

## Variants

| Approach | Write Order | Best For |
|----------|-------------|----------|
| DB first, then cache | DB then cache | Most use cases, safe default |
| Cache first, then DB | Cache then DB | Ultra-low write latency (risky) |
| Write-around | DB only, skip cache | Write-once, read-rarely data |
| Write-behind | Cache first, async DB | High-throughput writes (eventual consistency) |
| Transactional | Both in a transaction | Strong consistency requirements |

## Best Practices

- **Write to database first** — the database is the source of truth. If the cache write fails, the data is still persisted.
- **Invalidate on cache write failure** — if the cache write fails after the DB write, delete the key so the next read fetches fresh data.
- **Use a TTL as a safety net** — even with write-through, set a TTL. If a write is missed (network partition, bug), the cache self-heals on TTL expiry.
- **Keep write operations idempotent** — retrying a write-through operation should not cause duplicate data. Use upserts or idempotency keys.
- **Monitor write latency** — write-through adds cache write time to every write. If write latency is too high, consider write-behind for non-critical data.

## Common Mistakes

- **Writing to cache first** — if the DB write fails, the cache has data that does not exist. Always write to DB first.
- **Not handling cache write failure** — if the cache write fails silently, the cache serves stale data until TTL expires. Always invalidate on failure.
- **Using write-through for write-heavy workloads** — every write hits both cache and DB. For write-heavy workloads, use write-behind or write-around.
- **Not setting a TTL** — even with write-through, a TTL catches edge cases where a write is missed. Set a TTL as a safety net.
- **Caching too much** — write-through writes to cache on every update. Caching rarely-read data wastes memory and adds write latency for no benefit.

## Frequently Asked Questions

### What is the difference between write-through and write-behind?

Write-through writes to cache and database synchronously. The operation does not return until both succeed. Write-behind writes to cache first and asynchronously writes to the database. Write-through is consistent but slower; write-behind is faster but eventually consistent.

### When should I use write-through over cache-aside?

Use write-through when you need the cache to always have the latest data after a write. Cache-aside requires explicit invalidation after writes, which developers may forget. Write-through guarantees consistency.

### What happens if the database write fails?

The cache is not updated. The operation throws an error. The cache retains the previous value (or no value if the key is new). The application should handle the error and retry or notify the user.

### Can I combine read-through and write-through?

Yes. This is the most common combination. Reads go through the cache with a loader callback. Writes update both cache and database. The cache is always consistent for both reads and writes. This combination provides the best of both patterns.
