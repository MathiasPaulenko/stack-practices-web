---


contentType: recipes
slug: caching-redis
title: "Caching with Redis"
description: "How to implement application caching using Redis for performance and scalability."
metaDescription: "Learn to implement Redis caching in Python, JavaScript, and Java. Covers cache-aside, TTL, cache invalidation, and serialization."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - cache
  - cache-aside
  - databases
  - sql
relatedResources:
  - /recipes/caching
  - /recipes/database-migrations-safely
  - /recipes/database-transactions
  - /recipes/full-text-search
  - /recipes/soft-deletes
  - /recipes/event-sourcing-relational
  - /recipes/schema-evolution
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn to implement Redis caching in Python, JavaScript, and Java. Covers cache-aside, TTL, cache invalidation, and serialization."
  keywords:
    - redis
    - caching
    - cache
    - cache-aside
    - ttl
    - performance
    - python
    - javascript
    - java


---
## Overview

Caching is the single most useful way to speed up read-heavy applications. Redis is an in-memory data structure store that works as a high-performance cache, reducing database load and cutting response times from hundreds of milliseconds to microseconds. Here is how to the cache-aside pattern, TTL management, serialization, and invalidation strategies in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- [Database queries](/recipes/databases/postgres-query-optimization) are slow and return the same results frequently
- You need to reduce load on downstream [APIs](/recipes/api/call-rest-api) or databases
- Session data, user profiles, or configuration needs fast read access
- Real-time leaderboards, [rate limiting](/recipes/api/rate-limiting), or temporary locks are required

## Solution

### Python (redis-py)

```python
import json
import redis
from functools import wraps

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Cache-aside helper
def cached(key_prefix, ttl=300):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = f"{key_prefix}:{args}:{kwargs}"
            cached = r.get(cache_key)
            if cached:
                return json.loads(cached)
            result = func(*args, **kwargs)
            r.setex(cache_key, ttl, json.dumps(result))
            return result
        return wrapper
    return decorator

@cached("user_profile", ttl=600)
def get_user(user_id):
    # Expensive DB query
    return {"id": user_id, "name": "Alice", "orders": 42}

# Manual cache invalidation
r.delete("user_profile:(1,):{}")

# Redis as session store
r.setex("session:abc123", 3600, json.dumps({"user_id": 1, "role": "admin"}))
```

### JavaScript (ioredis)

```javascript
const Redis = require("ioredis");
const redis = new Redis({ host: "localhost", port: 6379 });

async function getCached(key, fetcher, ttl = 300) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const data = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

async function getUser(userId) {
  return getCached(`user:${userId}`, async () => {
    // Expensive DB query
    return { id: userId, name: "Alice", orders: 42 };
  }, 600);
}

// Invalidate cache
async function invalidateUser(userId) {
  await redis.del(`user:${userId}`);
}

// Redis as rate limiter
async function rateLimit(key, maxRequests = 100, window = 60) {
  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, window);
  return current <= maxRequests;
}
```

### Java (Jedis + Spring Cache)

```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    // Spring declarative caching
    @Cacheable(value = "users", key = "#userId")
    public User getUser(Long userId) {
        // Expensive DB query
        return new User(userId, "Alice", 42);
    }

    @CacheEvict(value = "users", key = "#userId")
    public void updateUser(Long userId, User user) {
        // Update DB
    }
}

// Manual Jedis caching
public class CacheClient {
    private final JedisPool pool = new JedisPool("localhost", 6379);

    public String get(String key) {
        try (Jedis jedis = pool.getResource()) {
            return jedis.get(key);
        }
    }

    public void setex(String key, int seconds, String value) {
        try (Jedis jedis = pool.getResource()) {
            jedis.setex(key, seconds, value);
        }
    }
}
```

## Explanation

The **cache-aside** (or lazy-loading) pattern is the most common caching strategy:

1. **Read**: Check cache first. If hit, return immediately. If miss, fetch from DB, store in cache, then return.
2. **Write**: Update the database, then invalidate or update the cache.
3. **TTL**: Every cached entry has a Time-To-Live. When TTL expires, the entry is evicted and the next read fetches fresh data.

This pattern is simple, works with any database, and handles cache failures gracefully: if Redis is down, the app falls back to the database (cache degradation, not outage).

## Variants

| Strategy | When to Use | Trade-off |
|----------|-------------|-----------|
| Cache-Aside | Most read-heavy apps | Simple, but cache and DB can drift |
| Write-Through | Strong consistency required | Slower writes, cache always fresh |
| Write-Behind | High write throughput | Risk of data loss if cache crashes before flush |
| Read-Through | Complex invalidation logic | Cache library handles fetching |
| Redis Pub/Sub | Cache invalidation across instances | Real-time sync, but adds complexity |

## What Works

- **Set TTLs on everything**: Without TTL, your cache grows forever and stale data lives indefinitely. Use 5-15 minutes for volatile data, hours for stable reference data.
- **Use cache key versioning**: `user:v2:123` lets you invalidate an entire schema by changing the version prefix.
- **Serialize to JSON or MessagePack**: JSON is human-readable; MessagePack is smaller and faster. Avoid Python `pickle` or Java native serialization for security.
- **Handle cache misses gracefully**: Cache failures should degrade to the database, never crash the app. Use [circuit breakers](/patterns/design/circuit-breaker-pattern) for Redis connections.
- **Monitor hit rates**: A cache hit rate below 80% usually means your TTL is too short or you're caching the wrong data.

## Common Mistakes

- **Cache stampede**: When TTL expires, hundreds of requests simultaneously hit the database. Use probabilistic early expiration or locks to prevent this.
- **Caching without TTL**: Unlimited cache growth eventually exhausts memory. Redis will evict keys, possibly dropping important data.
- **Storing large objects**: Serializing a 10MB JSON blob into Redis is slow and blocks the connection. Cache smaller, denormalized fragments instead.
- **Not invalidating on writes**: Updating a user's email but not clearing the cached profile means stale data for minutes or hours.
- **Using Redis as a primary database**: Redis is an in-memory store. If the server restarts without persistence (AOF/RDB), data is lost. Always keep the primary source in a real database.

## Frequently Asked Questions

### How do I prevent cache stampede?

**Probabilistic early expiration**: Refresh the cache a few seconds before TTL expires, but only on a fraction of requests. Alternatively, use a **lease lock**: the first request that gets a cache miss acquires a lock, fetches from DB, and updates the cache. Other requests wait or serve slightly stale data.

### What should I cache and what should I not cache?

**Cache**: User profiles, product catalogs, configuration, reference data, computed aggregates, and frequently-read query results.

**Don't cache**: Rapidly changing data (stock prices, real-time analytics), large blobs (videos, images), or data where consistency is critical and the DB can handle the load.

### How do I invalidate caches across multiple app instances?

Use **Redis Pub/Sub** or a **cache versioning prefix**. When data changes, publish an invalidation message to a Redis channel. All app instances subscribe to the channel and clear their local or remote caches. Alternatively, change a version prefix (`v1` → `v2`) in your cache keys to silently invalidate old entries without explicit messaging.

### Write-Through Cache Pattern

```python
import json
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def write_through_user(user_id: int, data: dict, db_update_fn):
    """Write to cache and database atomically."""
    cache_key = f"user:{user_id}"

    # Update database first
    db_update_fn(user_id, data)

    # Then update cache
    r.setex(cache_key, 600, json.dumps(data))

# Usage
def db_update_user(user_id, data):
    # Execute SQL UPDATE
    pass

write_through_user(42, {"id": 42, "name": "Alice", "email": "alice@new.com"}, db_update_user)
```

```javascript
async function writeThroughProduct(productId, data, dbUpdateFn) {
  const cacheKey = `product:${productId}`;

  // Update database
  await dbUpdateFn(productId, data);

  // Update cache
  await redis.setex(cacheKey, 300, JSON.stringify(data));
}
```

### Write-Behind (Write-Back) Pattern

```python
import json
import redis
import threading

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def write_behind_update(entity_type: str, entity_id: int, data: dict):
    """Write to cache immediately, queue for async DB write."""
    cache_key = f"{entity_type}:{entity_id}"

    # Write to cache
    r.setex(cache_key, 300, json.dumps(data))

    # Queue for async persistence
    r.lpush("pending_writes", json.dumps({
        "type": entity_type,
        "id": entity_id,
        "data": data,
        "timestamp": int(time.time())
    }))

# Background worker that flushes pending writes
def flush_pending_writes(db_write_fn, batch_size=100):
    while True:
        items = r.rpop("pending_writes", batch_size)
        if not items:
            threading.Event().wait(1)
            continue

        for item in items:
            entry = json.loads(item)
            try:
                db_write_fn(entry["type"], entry["id"], entry["data"])
            except Exception as e:
                # Re-queue failed writes
                r.lpush("pending_writes", json.dumps(entry))
                print(f"Write failed: {e}")
```

### Cache Stampede Prevention with Locks

```python
import json
import redis
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def get_with_stampede_protection(cache_key: str, fetcher, ttl: int = 300):
    """Prevent cache stampede using a Redis lock."""
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    lock_key = f"lock:{cache_key}"
    # Try to acquire lock with NX + expiry
    acquired = r.set(lock_key, "1", ex=10, nx=True)

    if acquired:
        try:
            result = fetcher()
            r.setex(cache_key, ttl, json.dumps(result))
            return result
        finally:
            r.delete(lock_key)
    else:
        # Wait briefly and retry
        time.sleep(0.1)
        return get_with_stampede_protection(cache_key, fetcher, ttl)

# Probabilistic early expiration (reduces stampede without locks)
def get_with_early_refresh(cache_key: str, fetcher, ttl: int = 300, early_refresh_pct: float = 0.1):
    cached = r.get(cache_key)
    if cached:
        ttl_remaining = r.ttl(cache_key)
        # Refresh early with small probability
        if ttl_remaining < ttl * early_refresh_pct and random.random() < 0.1:
            try:
                result = fetcher()
                r.setex(cache_key, ttl, json.dumps(result))
                return result
            except Exception:
                pass  # Serve stale on refresh failure
        return json.loads(cached)

    # Cache miss
    result = fetcher()
    r.setex(cache_key, ttl, json.dumps(result))
    return result
```

### Redis Pub/Sub for Cross-Instance Invalidation

```javascript
const Redis = require("ioredis");
const pub = new Redis();
const sub = new Redis();

// Subscribe to invalidation channel
sub.subscribe("cache:invalidate");
sub.on("message", (channel, message) => {
  const { key } = JSON.parse(message);
  redis.del(key);
  console.log(`Invalidated: ${key}`);
});

// Publish invalidation on data update
async function updateUser(userId, data) {
  await db.query("UPDATE users SET ... WHERE id = ?", [userId]);
  const cacheKey = `user:${userId}`;
  await redis.del(cacheKey);
  await pub.publish("cache:invalidate", JSON.stringify({ key: cacheKey }));
}
```

```python
import redis
import json

r = redis.Redis(host="localhost", port=6379, decode_responses=True)
pubsub = r.pubsub()

# Subscriber
pubsub.subscribe("cache:invalidate")
for message in pubsub.listen():
    if message["type"] == "message":
        data = json.loads(message["data"])
        r.delete(data["key"])

# Publisher
def invalidate_cache(key: str):
    r.delete(key)
    r.publish("cache:invalidate", json.dumps({"key": key}))
```

### Redis Lua Script for Atomic Operations

```python
import redis

r = redis.Redis(host="localhost", port=6379)

# Atomic rate limiter using Lua
RATE_LIMIT_SCRIPT = """
local current = redis.call('INCR', KEYS[1])
if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
"""

rate_limiter = r.register_script(RATE_LIMIT_SCRIPT)

def is_rate_limited(key: str, max_requests: int, window: int) -> bool:
    current = rate_limiter(keys=[key], args=[window])
    return current > max_requests

# Atomic compare-and-swap for cache
CAS_SCRIPT = """
local cached = redis.call('GET', KEYS[1])
if cached == ARGV[1] then
    redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
    return 1
end
return 0
"""

cas = r.register_script(CAS_SCRIPT)
```

### Redis Sentinel for High Availability

```python
from redis.sentinel import Sentinel

sentinel = Sentinel([
    ("sentinel1", 26379),
    ("sentinel2", 26379),
    ("sentinel3", 26379),
])

# Get master connection
master = sentinel.master_for("mymaster", socket_timeout=0.5)

# Get replica connection for reads
replica = sentinel.slave_for("mymaster", socket_timeout=0.5)

# Writes go to master
master.set("key", "value")

# Reads can go to replica
value = replica.get("key")
```

```javascript
const Redis = require("ioredis");

// Sentinel-aware client
const redis = new Redis({
  sentinels: [
    { host: "sentinel1", port: 26379 },
    { host: "sentinel2", port: 26379 },
  ],
  name: "mymaster",
  role: "master",
});
```

## Additional Best Practices

6. **Use `SCAN` instead of `KEYS` in production.** `KEYS *` blocks Redis while scanning all keys. `SCAN` is cursor-based and non-blocking:

```python
# Bad: blocks Redis
keys = r.keys("user:*")

# Good: non-blocking cursor-based scan
cursor = 0
while True:
    cursor, keys = r.scan(cursor, match="user:*", count=100)
    for key in keys:
        r.delete(key)
    if cursor == 0:
        break
```

7. **Set `maxmemory` and eviction policy.** Configure Redis to use a bounded amount of memory:

```bash
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

8. **Use Redis pipelining for batch operations.** Pipelining sends multiple commands in a single network round-trip:

```python
# Without pipeline: 100 round-trips
for i in range(100):
    r.set(f"key:{i}", f"value:{i}")

# With pipeline: 1 round-trip
pipe = r.pipeline()
for i in range(100):
    pipe.set(f"key:{i}", f"value:{i}")
pipe.execute()
```

9. **Use `MGET` for batch reads.** Fetching multiple keys in one command is far faster than individual `GET` calls:

```python
# Bad: 100 round-trips
values = [r.get(f"key:{i}") for i in range(100)]

# Good: 1 round-trip
values = r.mget([f"key:{i}" for i in range(100)])
```

10. **Enable Redis persistence for critical caches.** If cache rebuilds are expensive, enable AOF (Append-Only File) persistence:

```bash
# redis.conf
appendonly yes
appendfsync everysec
```

## Additional Common Mistakes

6. **Using `KEYS *` in production.** This command blocks the entire Redis server. Use `SCAN` instead.

7. **Not setting `maxmemory`.** Without a memory limit, Redis will consume all available RAM and the OS will kill it with OOM.

8. **Storing sessions without TTL.** Session keys without TTL accumulate forever. Always set a TTL on session data:

```python
r.setex(f"session:{session_id}", 3600, json.dumps(session_data))
```

9. **Not handling Redis connection failures.** Cache failures should degrade to the database, not crash the application:

```python
try:
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
except redis.ConnectionError:
    pass  # Fall through to database

result = db_query()
try:
    r.setex(cache_key, 300, json.dumps(result))
except redis.ConnectionError:
    pass  # Cache is down, serve from DB
```

10. **Using `FLUSHALL` in scripts or CI.** This deletes all keys in all databases. Use `FLUSHDB` for a single database, or better, use key prefixes and delete by pattern with `SCAN`.

## Additional FAQ

### How do I monitor Redis cache performance?

Use `INFO stats` to check hit rates, memory usage, and connected clients:

```bash
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses|used_memory"
```

For continuous monitoring, use RedisInsight, Grafana with redis_exporter, or Datadog's Redis integration. Track these metrics:
- **Hit rate**: `keyspace_hits / (keyspace_hits + keyspace_misses)`
- **Memory usage**: `used_memory / maxmemory`
- **Evicted keys**: `evicted_keys` (high values mean your TTL is too short or memory is too small)
- **Connected clients**: `connected_clients` (spikes may indicate connection leaks)

### What is the difference between Redis Cluster and Sentinel?

**Redis Sentinel** provides high availability for a single Redis instance. It monitors a master and promotes a replica if the master fails. Good for small deployments.

**Redis Cluster** shards data across multiple Redis nodes using hash slots. It provides both horizontal scaling and high availability. Use it when a single Redis instance cannot handle your throughput or memory requirements.

### Should I use Redis JSON or plain string serialization?

Redis 7+ supports the RedisJSON module for native JSON operations. It allows partial updates without re-serializing the entire object:

```bash
# Store as JSON
JSON.SET user:42 $ '{"name":"Alice","orders":42}'

# Update a single field
JSON.SET user:42 $.name '"Bob"'

# Read a single field
JSON.GET user:42 $.name
```

For simpler setups, JSON string serialization with `GET`/`SET` is fine. Use RedisJSON when you need partial updates or JSON path queries.

## Performance Tips

1. **Use `PIPELINE` for batch writes.** Reduce network round-trips by 10-100x:

```python
pipe = r.pipeline(transaction=False)
for i in range(1000):
    pipe.setex(f"cache:{i}", 300, f"value:{i}")
pipe.execute()
```

2. **Use `HSET`/`HGETALL` for structured data.** Hashes are more memory-efficient than separate string keys for related fields:

```python
r.hset("user:42", mapping={"name": "Alice", "email": "alice@example.com", "role": "admin"})
user = r.hgetall("user:42")  # {'name': 'Alice', 'email': 'alice@example.com', 'role': 'admin'}
```

3. **Use `ZSET` for sorted data.** Sorted sets enable efficient leaderboard and ranking queries:

```python
r.zadd("leaderboard", {"alice": 1500, "bob": 1200, "carol": 2000})
top_10 = r.zrevrange("leaderboard", 0, 9, withscores=True)
```

4. **Enable `lazyfree-lazy-eviction` for large keys.** Deleting large keys synchronously blocks Redis. Enable lazy freeing:

```bash
# redis.conf
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
lazyfree-lazy-server-del yes
```

5. **Use `EXPIRE` with `NX` flag (Redis 7+).** Set expiry only if the key has no TTL:

```python
r.expire("user:42", 3600, nx=True)  # Only sets TTL if none exists
```
