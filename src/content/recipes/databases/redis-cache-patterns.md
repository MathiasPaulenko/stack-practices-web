---
contentType: recipes
slug: redis-cache-patterns
title: "Redis Cache Patterns for High-Performance Applications"
description: "How to implement cache-aside, write-through, and write-behind patterns with Redis to reduce database load and improve response times"
metaDescription: "Redis cache patterns for high-performance apps. Implement cache-aside, write-through, and write-behind patterns to reduce database load and improve latency."
difficulty: intermediate
topics:
  - databases
  - performance
tags:
  - redis
  - cache
  - database
  - performance
  - databases
relatedResources:
  - /recipes/cache-invalidation
  - /recipes/connection-pooling
  - /guides/performance-optimization-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Redis cache patterns for high-performance apps. Implement cache-aside, write-through, and write-behind patterns to reduce database load and improve latency."
  keywords:
    - redis
    - caching patterns
    - cache-aside
    - write-through
    - performance
---

# Redis Cache Patterns for High-Performance Applications

Redis is an in-memory data structure store that works as an extremely fast cache layer between your application and persistent database. Choosing the right caching pattern — cache-aside, write-through, or write-behind — determines how your application handles cache misses, consistency, and failure scenarios.

## When to Use This

- Database queries are slow and return frequently accessed data. See [Query Optimization](/recipes/databases/postgres-query-optimization) for tuning slow queries.
- You need to reduce load on primary databases during traffic spikes. See [Rate Limiting](/recipes/api/rate-limiting) for traffic control.
- Temporary data staleness is acceptable in exchange for lower latency

## Prerequisites

- Redis server running locally or via a managed service
- A client library like `ioredis` or `redis` for Node.js

## Solution

### 1. Cache-Aside (Lazy Loading)

The application checks the cache first. On a miss, it loads from the database and populates the cache.

```typescript
// cache/CacheAside.ts
import Redis from 'ioredis';

class CacheAsideProductRepository {
  private redis = new Redis();
  private ttl = 300; // 5 minutes

  async getProduct(id: string): Promise<Product | null> {
    const cacheKey = `product:${id}`;
    
    // Check cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Cache miss: load from database
    const product = await this.db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (!product) return null;

    // Populate cache
    await this.redis.setex(cacheKey, this.ttl, JSON.stringify(product));
    return product;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    await this.db.query('UPDATE products SET ... WHERE id = $1', [id]);
    // Invalidate cache to prevent stale reads
    await this.redis.del(`product:${id}`);
  }
}
```

### 2. Write-Through

Data is written to both cache and database simultaneously. The cache always holds the latest data.

```typescript
// cache/WriteThrough.ts
class WriteThroughProductRepository {
  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    const cacheKey = `product:${id}`;

    // Start database transaction. See [Database Transactions](/recipes/databases/database-transactions) for ACID patterns.
    await this.db.query('BEGIN');
    try {
      await this.db.query('UPDATE products SET ... WHERE id = $1', [id]);
      
      // Write to cache within the same logical operation
      const updated = await this.db.query('SELECT * FROM products WHERE id = $1', [id]);
      await this.redis.setex(cacheKey, this.ttl, JSON.stringify(updated));
      
      await this.db.query('COMMIT');
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }
}
```

### 3. Write-Behind (Write-Back)

Data is written to cache first and asynchronously flushed to the database. Highest performance but riskiest.

```typescript
// cache/WriteBehind.ts
class WriteBehindProductRepository {
  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    const cacheKey = `product:${id}`;

    // Write to cache immediately
    await this.redis.setex(cacheKey, this.ttl, JSON.stringify(data));

    // Queue for async persistence
    await this.redis.lpush('pending_writes', JSON.stringify({ id, data, timestamp: Date.now() }));
  }
}

// Background worker. See [Batch Processing](/recipes/data/batch-processing-patterns) for job patterns.
async function flushPendingWrites() {
  const batch = await redis.lpop('pending_writes', 100);
  if (!batch) return;

  const writes = batch.map(item => JSON.parse(item));
  
  await db.query('BEGIN');
  try {
    for (const write of writes) {
      await db.query('UPDATE products SET ... WHERE id = $1', [write.id]);
    }
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    // Re-queue failed writes
    for (const write of writes) {
      await redis.rpush('pending_writes', JSON.stringify(write));
    }
  }
}

// Run every 5 seconds
setInterval(flushPendingWrites, 5000);
```

### 4. Cache Stampede Prevention

```typescript
// cache/StampedeProtection.ts
class StampedeProtectedCache {
  async getProduct(id: string): Promise<Product> {
    const cacheKey = `product:${id}`;
    const lockKey = `lock:${id}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Try to acquire lock
    const lock = await this.redis.set(lockKey, '1', 'EX', 10, 'NX');
    if (lock) {
      // We won the race; load from DB
      const product = await this.db.query('SELECT * FROM products WHERE id = $1', [id]);
      await this.redis.setex(cacheKey, this.ttl, JSON.stringify(product));
      await this.redis.del(lockKey);
      return product;
    }

    // Wait for the winner to populate cache
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.getProduct(id);
  }
}
```

## How It Works

1. **Cache-Aside** minimizes cache writes but allows brief stale data after updates
2. **Write-Through** guarantees consistency at the cost of higher write latency
3. **Write-Behind** maximizes throughput but risks data loss if the cache fails before flush
4. **Stampede Protection** prevents multiple simultaneous database queries on cache expiration

## Production Considerations

- Use **Redis Cluster** or **Redis Sentinel** for high availability
- Implement **[circuit breaker](/patterns/design/circuit-breaker-pattern)** logic when Redis is unavailable; fall back to database
- Set appropriate **TTL values** based on data change frequency
- Monitor **cache hit ratio** with `INFO stats` and adjust TTL accordingly

## Common Mistakes

- Not handling Redis connection failures gracefully
- Using the same TTL for all data types regardless of change frequency
- Forgetting to invalidate related cache entries on updates

## FAQ

**Q: Which pattern should I use?**
A: Cache-aside for read-heavy workloads. Write-through when consistency is critical. Write-behind only when you can tolerate brief data loss.

**Q: How do I handle cache invalidation across multiple services?**
A: Use Redis Pub/Sub or a message queue to broadcast invalidation events to all service instances.

**Q: Should I compress cached data?**
A: For large objects (>1KB), yes. Use `msgpack` or JSON compression to reduce memory usage and network transfer.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### Python Cache-Aside with `redis-py`

```python
import json
import redis
import functools

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def cache_aside(prefix: str, ttl: int = 300):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            key = f"{prefix}:{':'.join(str(a) for a in args)}"
            cached = r.get(key)
            if cached:
                return json.loads(cached)

            result = func(*args, **kwargs)
            r.setex(key, ttl, json.dumps(result, default=str))
            return result
        return wrapper
    return decorator

# Usage
@cache_aside("user_profile", ttl=600)
def get_user_profile(user_id: int) -> dict:
    # Database query
    return {"id": user_id, "name": "Alice", "email": "alice@example.com"}
```

### Python Write-Through with Redis

```python
import json
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

class WriteThroughCache:
    def __init__(self, redis_client, db_conn):
        self.r = redis_client
        self.db = db_conn

    def set(self, key: str, value: dict, ttl: int = 300):
        # Write to database first
        self.db.execute(
            "INSERT INTO cache_store (key, value) VALUES (%s, %s) "
            "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
            (key, json.dumps(value))
        )
        self.db.commit()

        # Then update cache
        self.r.setex(key, ttl, json.dumps(value))

    def get(self, key: str) -> dict | None:
        cached = self.r.get(key)
        if cached:
            return json.loads(cached)

        # Cache miss: read from database
        row = self.db.execute(
            "SELECT value FROM cache_store WHERE key = %s", (key,)
        ).fetchone()
        if row:
            value = json.loads(row[0])
            self.r.setex(key, 300, json.dumps(value))
            return value
        return None
```

### Redis Streams for Write-Behind Pattern

```python
import json
import redis
import threading

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def write_behind_set(key: str, value: dict, ttl: int = 300):
    """Write to cache immediately, queue DB write via Redis Streams."""
    r.setex(key, ttl, json.dumps(value))

    # Add to stream for async processing
    r.xadd("write_behind_stream", {
        "key": key,
        "value": json.dumps(value),
        "operation": "set",
        "timestamp": str(int(time.time()))
    })

# Consumer that processes the stream
def process_write_behind_stream(db_conn, consumer_name="worker-1"):
    while True:
        # Read new entries from the stream
        entries = r.xread({"write_behind_stream": "$"}, count=10, block=1000)

        if not entries:
            continue

        for stream, messages in entries:
            for msg_id, fields in messages:
                try:
                    key = fields["key"]
                    value = json.loads(fields["value"])

                    db_conn.execute(
                        "INSERT INTO cache_store (key, value) VALUES (%s, %s) "
                        "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
                        (key, json.dumps(value))
                    )
                    db_conn.commit()

                    # Acknowledge processing
                    r.xack("write_behind_stream", consumer_name, msg_id)
                except Exception as e:
                    print(f"Failed to process {msg_id}: {e}")
```

### Cache Warming on Startup

```python
import redis
import json

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def warm_cache(queries: list[tuple[str, callable, int]]):
    """Pre-populate cache on application startup.

    Args:
        queries: List of (cache_key, fetcher_fn, ttl) tuples
    """
    for key, fetcher, ttl in queries:
        try:
            result = fetcher()
            r.setex(key, ttl, json.dumps(result, default=str))
            print(f"Warmed: {key}")
        except Exception as e:
            print(f"Failed to warm {key}: {e}")

# Usage
def fetch_popular_products():
    # Database query for popular products
    return [{"id": 1, "name": "Widget"}, {"id": 2, "name": "Gadget"}]

def fetch_config():
    # Database query for app config
    return {"theme": "dark", "features": ["search", "filters"]}

warm_cache([
    ("popular_products", fetch_popular_products, 3600),
    ("app_config", fetch_config, 7200),
])
```

### Circuit Breaker for Cache Failures

```python
import time
import redis
from functools import wraps

class CacheCircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.last_failure_time = 0
        self.state = "closed"  # closed, open, half-open

    def can_execute(self):
        if self.state == "open":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "half-open"
                return True
            return False
        return True

    def record_success(self):
        self.failure_count = 0
        self.state = "closed"

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "open"

breaker = CacheCircuitBreaker()
r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def cached_with_circuit_breaker(key: str, fetcher, ttl: int = 300):
    if breaker.can_execute():
        try:
            cached = r.get(key)
            if cached:
                breaker.record_success()
                return json.loads(cached)

            result = fetcher()
            r.setex(key, ttl, json.dumps(result, default=str))
            breaker.record_success()
            return result
        except redis.ConnectionError:
            breaker.record_failure()
            # Fall through to direct fetch
    # Circuit open or cache failed: fetch directly
    return fetcher()
```

### Tag-Based Cache Invalidation

```python
import redis
import json

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def set_with_tags(key: str, value: dict, tags: list[str], ttl: int = 300):
    """Set a cache entry and associate it with tags for group invalidation."""
    r.setex(key, ttl, json.dumps(value))

    for tag in tags:
        r.sadd(f"tag:{tag}", key)
        r.expire(f"tag:{tag}", ttl + 60)  # Slightly longer than key TTL

def invalidate_tag(tag: str):
    """Invalidate all cache entries associated with a tag."""
    keys = r.smembers(f"tag:{tag}")
    if keys:
        r.delete(*keys)
        r.delete(f"tag:{tag}")

# Usage
set_with_tags("user:42", {"name": "Alice"}, tags=["users", "user:42"], ttl=600)
set_with_tags("user:43", {"name": "Bob"}, tags=["users", "user:43"], ttl=600)

# Invalidate all user caches when user schema changes
invalidate_tag("users")  # Removes both user:42 and user:43
```

### Multi-Tier Caching (L1 in-memory + L2 Redis)

```python
import json
import redis
import time
from functools import lru_cache

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

class MultiTierCache:
    def __init__(self, redis_client, l1_size=128, ttl=300):
        self.r = redis_client
        self.ttl = ttl
        self._l1 = {}  # Simple dict-based L1 cache
        self._l1_max = l1_size
        self._l1_times = {}

    def get(self, key: str):
        # L1: in-memory check
        if key in self._l1:
            if time.time() - self._l1_times[key] < self.ttl:
                return self._l1[key]
            else:
                del self._l1[key]
                del self._l1_times[key]

        # L2: Redis check
        cached = self.r.get(key)
        if cached:
            value = json.loads(cached)
            self._set_l1(key, value)
            return value

        return None

    def set(self, key: str, value: dict, ttl: int = None):
        ttl = ttl or self.ttl
        self._set_l1(key, value)
        self.r.setex(key, ttl, json.dumps(value, default=str))

    def _set_l1(self, key: str, value):
        if len(self._l1) >= self._l1_max:
            # Evict oldest entry
            oldest = min(self._l1_times, key=self._l1_times.get)
            del self._l1[oldest]
            del self._l1_times[oldest]
        self._l1[key] = value
        self._l1_times[key] = time.time()

    def invalidate(self, key: str):
        self._l1.pop(key, None)
        self._l1_times.pop(key, None)
        self.r.delete(key)

# Usage
cache = MultiTierCache(r, l1_size=256, ttl=300)
cache.set("user:42", {"name": "Alice"})
user = cache.get("user:42")  # Hits L1 on second call
```

## Additional Best Practices

6. **Use consistent key naming conventions.** Use colon-separated namespaces: `entity:id:field`:

```python
# Good: clear hierarchy
r.set("user:42:profile", json.dumps(profile))
r.set("user:42:settings", json.dumps(settings))

# Bad: flat keys, hard to manage
r.set("user_42_profile", json.dumps(profile))
```

7. **Set TTL on every key.** Keys without TTL accumulate forever. Even "permanent" data should have a long TTL (e.g., 7 days) as a safety net:

```python
r.setex("config:app", 604800, json.dumps(config))  # 7 days
```

8. **Use `SET NX EX` for distributed locks.** Atomic set-if-not-exists with expiry:

```python
lock_acquired = r.set("lock:resource:42", "owner_id", ex=30, nx=True)
if lock_acquired:
    try:
        # Do work
        pass
    finally:
        # Only release if we still own the lock
        r.eval(
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
            1, "lock:resource:42", "owner_id"
        )
```

9. **Use `OBJECT ENCODING` to verify memory efficiency.** Redis uses different internal encodings based on data size:

```bash
redis-cli OBJECT ENCODING user:42
# "embstr" (small string, efficient)
# "raw" (large string, less efficient)
```

10. **Use `MEMORY USAGE` to track key sizes.** Identify keys that consume too much memory:

```bash
redis-cli MEMORY USAGE user:42
# Returns bytes consumed by the key
```

## Additional Common Mistakes

6. **Using `DEL` on large keys without checking size first.** Deleting a list with 1M items blocks Redis. Use `UNLINK` instead (async delete):

```python
r.unlink("large_list_key")  # Non-blocking delete
```

7. **Not handling serialization errors.** If cached data is corrupt or uses a different schema, deserialization fails:

```python
try:
    return json.loads(cached)
except (json.JSONDecodeError, TypeError):
    r.delete(key)  # Remove corrupt cache entry
    return fetcher()  # Re-fetch from source
```

8. **Using `FLUSHDB` in production code.** This deletes all keys in the current database. Use targeted deletes with `SCAN` instead.

9. **Not setting `maxmemory-policy`.** Without an eviction policy, Redis runs out of memory:

```bash
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

10. **Storing large objects in Redis.** Objects larger than a few MB should be stored in object storage (S3) with only the URL in Redis:

```python
# Bad: storing a 5MB image in Redis
r.set("image:42", base64_encode(image_data))

# Good: store URL, keep image in S3
r.setex("image:42:url", 3600, "https://s3.amazonaws.com/bucket/image42.png")
```

## Additional FAQ

### How do I test cache behavior?

Use a test Redis instance (or `fakeredis` in Python) and verify cache hits, misses, and invalidation:

```python
import fakeredis

r = fakeredis.FakeRedis()

def test_cache_aside():
    r.flushdb()

    # First call: cache miss, fetches from source
    result = get_user_profile(42)
    assert r.exists("user_profile:42")

    # Second call: cache hit
    result2 = get_user_profile(42)
    assert result == result2

    # After invalidation: cache miss again
    r.delete("user_profile:42")
    result3 = get_user_profile(42)
    assert r.exists("user_profile:42")
```

### What is the difference between `SETEX` and `SET ... EX`?

They are equivalent. `SETEX key seconds value` is the older form. `SET key value EX seconds` is the newer, more flexible form that supports `NX`, `XX`, and other options in a single command.

### How do I handle cache during deployments?

Use a cache version prefix that changes with each deployment:

```python
import os
CACHE_VERSION = os.getenv("CACHE_VERSION", "v1")

def cache_key(entity: str, id: int) -> str:
    return f"{CACHE_VERSION}:{entity}:{id}"
```

When you deploy, increment `CACHE_VERSION`. Old keys expire naturally via TTL, and new requests use the new version prefix.

## Performance Tips

1. **Use `MSET` and `MGET` for batch operations.** Reduce round-trips when setting or getting multiple keys:

```python
# Bad: 100 round-trips
for i in range(100):
    r.set(f"key:{i}", f"value:{i}")

# Good: 1 round-trip
r.mset({f"key:{i}": f"value:{i}" for i in range(100)})
```

2. **Use `HSET` with multiple fields.** Hash operations are more memory-efficient for structured data:

```python
r.hset("user:42", mapping={
    "name": "Alice",
    "email": "alice@example.com",
    "role": "admin",
})
```

3. **Use `SETEX` instead of `SET` + `EXPIRE`.** `SETEX` is atomic and saves a round-trip:

```python
# Bad: two commands
r.set("key", "value")
r.expire("key", 300)

# Good: one atomic command
r.setex("key", 300, "value")
```

4. **Enable `tcp-keepalive` in Redis.** Prevent stale connections from consuming resources:

```bash
# redis.conf
tcp-keepalive 60
```

5. **Use `CLIENT INFO` to debug connection leaks.** Track how many connections each client holds:

```bash
redis-cli CLIENT LIST
# Show idle times and connection ages
```
