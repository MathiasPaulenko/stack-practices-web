---



contentType: recipes
slug: connect-to-redis
title: "Connect to Redis"
description: "How to connect to Redis and perform basic operations in Python, JavaScript, and Java."
metaDescription: "Learn how to connect to Redis using Python redis-py, Node.js ioredis, and Java Jedis with practical code examples for caching and sessions."
difficulty: beginner
topics:
  - databases
tags:
  - databases
  - redis
  - cache
  - python
  - javascript
  - java
relatedResources:
  - /recipes/connect-to-mysql
  - /recipes/connect-to-postgresql
  - /patterns/cache-aside-pattern
  - /recipes/redis-cache-patterns
  - /patterns/abstract-factory-pattern
  - /recipes/execute-raw-sql
  - /recipes/use-orm-crud
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Learn how to connect to Redis using Python redis-py, Node.js ioredis, and Java Jedis with practical code examples for caching and sessions."
  keywords:
    - databases
    - redis
    - cache
    - python
    - javascript
    - java



---
## Overview

Redis is an in-memory data structure store used for caching, session management, real-time analytics, and message brokering. Connecting to Redis and using its core data types efficiently is a foundational backend skill. The following demonstrates how to basic operations in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Implementing caching layers to reduce database load
- Building session stores for stateless web applications
- Creating real-time leaderboards, rate limiters, or message queues

## Solution

### Python

```python
import redis

r = redis.Redis(
    host='localhost',
    port=6379,
    db=0,
    decode_responses=True
)

# Strings
r.set('user:1:name', 'Alice', ex=3600)
name = r.get('user:1:name')

# Lists
r.lpush('queue:tasks', 'task_1')
task = r.brpop('queue:tasks', timeout=5)

# Hashes
r.hset('user:1', mapping={'email': 'alice@example.com', 'role': 'admin'})
user = r.hgetall('user:1')
```

### JavaScript

```javascript
const Redis = require('ioredis');

const redis = new Redis({
    host: 'localhost',
    port: 6379,
    db: 0
});

// Strings
await redis.set('user:1:name', 'Alice', 'EX', 3600);
const name = await redis.get('user:1:name');

// Lists
await redis.lpush('queue:tasks', 'task_1');
const task = await redis.brpop('queue:tasks', 5);

// Hashes
await redis.hset('user:1', 'email', 'alice@example.com', 'role', 'admin');
const user = await redis.hgetall('user:1');
```

### Java

```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;

public class RedisExample {
    private final JedisPool pool = new JedisPool("localhost", 6379);

    public void stringOps() {
        try (Jedis jedis = pool.getResource()) {
            jedis.setex("user:1:name", 3600, "Alice");
            String name = jedis.get("user:1:name");
        }
    }

    public void listOps() {
        try (Jedis jedis = pool.getResource()) {
            jedis.lpush("queue:tasks", "task_1");
            var task = jedis.brpop(5, "queue:tasks");
        }
    }

    public void hashOps() {
        try (Jedis jedis = pool.getResource()) {
            jedis.hset("user:1", "email", "alice@example.com");
            jedis.hset("user:1", "role", "admin");
            Map<String, String> user = jedis.hgetAll("user:1");
        }
    }
}
```

## Explanation

Redis stores data **in memory**, making reads and writes extremely fast (sub-millisecond). **Strings** are the simplest type, often used for caching serialized objects. **Lists** implement queues (`LPUSH` + `BRPOP` for blocking consumption). **Hashes** store objects with multiple fields compactly. All three examples use solid connection management: Python `redis.Redis` handles reconnections, JavaScript `ioredis` supports clustering and pub/sub, and Java `JedisPool` reuses connections via pooling.

## Variants

| Technology | Approach | Notes |
|------------|----------|-------|
| Python | `redis-py` | Official client, supports async via `aredis` |
| JavaScript | `node-redis` | Alternative to ioredis, native Promise support |
| Java | `Lettuce` | Reactive, async Redis client for Spring |

## What Works

1. Use connection pooling in all languages to avoid connection exhaustion
2. Set explicit expiration (`EX`, `PX`, `EXAT`) on cache keys to prevent unbounded memory growth
3. Use `decode_responses=True` in Python to get strings instead of bytes
4. Prefer `BRPOP` / `BLPOP` for queue consumption to avoid busy-waiting
5. Use Redis pipelines (`.pipeline()` / `.multi()`) to batch multiple commands and reduce RTT

## Common Mistakes

1. Storing large objects (>1 MB) in single keys, causing latency spikes
2. Not handling connection failures, causing cascading app errors when Redis is unavailable
3. Using Redis as a primary database instead of a cache or transient store
4. Forgetting to set TTLs, leading to memory exhaustion and OOM kills
5. Using `KEYS` command in production, which blocks the entire Redis instance

## Frequently Asked Questions

### Should I use Redis as my primary database?

No. Redis is an in-memory store best suited for caching, sessions, queues, and real-time data. Use it alongside a persistent database like PostgreSQL or MySQL.

### How do I handle Redis cluster mode?

Use cluster-aware clients: `redis-py-cluster` (Python), `ioredis` with `new Redis.Cluster()` (JS), or `JedisCluster` / `Lettuce` (Java).

### What is the difference between `EX` and `PX` in Redis?

`EX` sets expiration in seconds. `PX` sets expiration in milliseconds. Both achieve the same goal; use whichever fits your precision requirements.

### Python with pipelines and transactions

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Pipeline: batch multiple commands to reduce RTT
pipe = r.pipeline()
pipe.set('user:1:name', 'Alice', ex=3600)
pipe.set('user:1:email', 'alice@example.com', ex=3600)
pipe.hset('user:1', mapping={'name': 'Alice', 'email': 'alice@example.com'})
results = pipe.execute()
print(results)  # [True, True, 1]

# Transaction with MULTI/EXEC
pipe = r.pipeline(transaction=True)
pipe.multi()
pipe.set('counter', 0)
pipe.incr('counter')
pipe.incr('counter')
results = pipe.execute()
print(results)  # [True, 1, 2]
```

### JavaScript with sorted sets and pub/sub

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: 'localhost', port: 6379 });

// Sorted sets: leaderboards
await redis.zadd('leaderboard', 100, 'alice', 85, 'bob', 120, 'charlie');
const topPlayers = await redis.zrevrange('leaderboard', 0, 9, 'WITHSCORES');
// ['charlie', '120', 'alice', '100', 'bob', '85']

// Pub/Sub
const subscriber = new Redis({ host: 'localhost', port: 6379 });
const publisher = new Redis({ host: 'localhost', port: 6379 });

await subscriber.subscribe('notifications');
subscriber.on('message', (channel, message) => {
    console.log(`Received on ${channel}: ${message}`);
});

await publisher.publish('notifications', JSON.stringify({ event: 'user_joined', userId: 42 }));
```

### Java with JedisPool and Lua scripting

```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import java.util.List;

public class RedisAdvanced {
    private final JedisPool pool;

    public RedisAdvanced(String host, int port) {
        this.pool = new JedisPool(host, port);
    }

    public void rateLimit(String userId, int maxRequests, int windowSeconds) {
        try (Jedis jedis = pool.getResource()) {
            String key = "rate:" + userId;
            String luaScript =
                "local current = redis.call('INCR', KEYS[1]) " +
                "if current == 1 then " +
                "  redis.call('EXPIRE', KEYS[1], ARGV[2]) " +
                "end " +
                "return tonumber(current) <= tonumber(ARGV[1])";

            Object allowed = jedis.eval(
                luaScript, 1, key,
                String.valueOf(maxRequests), String.valueOf(windowSeconds)
            );
            System.out.println("Request allowed: " + allowed);
        }
    }

    public void pipelineExample() {
        try (Jedis jedis = pool.getResource()) {
            var pipe = jedis.pipelined();
            pipe.set("key1", "value1");
            pipe.set("key2", "value2");
            pipe.sync();
        }
    }
}
```

### Python async with redis-py

```python
import asyncio
import redis.asyncio as aioredis

async def main():
    r = aioredis.Redis(host='localhost', port=6379, decode_responses=True)

    # Async string operations
    await r.set('async:key', 'value', ex=60)
    value = await r.get('async:key')

    # Async pipeline
    pipe = r.pipeline()
    pipe.set('a', 1)
    pipe.set('b', 2)
    pipe.get('a')
    results = await pipe.execute()
    print(results)  # [True, True, b'1']

    await r.close()

asyncio.run(main())
```

## Additional Best Practices


- For a deeper guide, see [Connect to MySQL](/recipes/connect-to-mysql/).

6. **Use `SCAN` instead of `KEYS` in production.** `KEYS` blocks the entire Redis instance. `SCAN` iterates in small batches:

```python
for key in r.scan_iter(match="user:*", count=100):
    print(key)
```

7. **Set `maxmemory` and `maxmemory-policy`.** Configure Redis to evict keys when memory is full:

```bash
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

8. **Use `EXPIRE` for session keys.** Always set a TTL on session data to prevent unbounded growth:

```python
r.setex('session:abc123', 3600, json.dumps(session_data))
```

9. **Monitor `INFO` stats.** Track memory usage, connected clients, and command stats:

```python
info = r.info()
print(f"Used memory: {info['used_memory_human']}")
print(f"Connected clients: {info['connected_clients']}")
print(f"Keyspace hits: {info['keyspace_hits']}")
print(f"Keyspace misses: {info['keyspace_misses']}")
```

10. **Use `SENTINEL` for high availability.** Redis Sentinel provides automatic failover when a master goes down. Use sentinel-aware clients in all languages.

## Additional Common Mistakes

6. **Storing serialized blobs > 1MB.** Large values cause latency spikes. Break large objects into smaller keys or use a separate store.

7. **Not handling Redis failover.** When Redis restarts, all in-memory data is lost (without persistence). Applications should gracefully degrade to the database.

8. **Using `FLUSHALL` or `FLUSHDB` in production.** These commands delete all keys instantly. Use `DEL` with specific keys or `UNLINK` for async deletion.

9. **Not using `PIPELINE` for bulk operations.** Sending 100 individual commands has 100x the RTT of a single pipeline.

10. **Ignoring `maxmemory-policy`.** Without a policy, Redis will OOM kill when memory is exhausted, taking down all services that depend on it.

## Additional FAQ

### How do I implement a rate limiter with Redis?

Use a sliding window counter with `INCR` and `EXPIRE`:

```python
def rate_limit(r, user_id, max_requests=100, window=60):
    key = f"rate:{user_id}"
    current = r.incr(key)
    if current == 1:
        r.expire(key, window)
    return current <= max_requests
```

### What is the difference between `MULTI/EXEC` and `PIPELINE`?

`MULTI/EXEC` is a transaction: commands are atomic, no other client can interleave. `PIPELINE` batches commands to reduce RTT but they are not atomic. Use `MULTI/EXEC` when you need atomicity, `PIPELINE` when you need throughput.

### How do I use Redis Streams for message queuing?

```python
# Producer
r.xadd('events', {'type': 'order_created', 'order_id': 123})

# Consumer
response = r.xread({'events': '0'}, block=5000, count=10)
for stream, messages in response:
    for msg_id, fields in messages:
        print(f"Event {msg_id}: {fields}")
```

## Performance Tips

1. **Use `PIPELINE` for bulk operations.** Reduces network round-trips by sending multiple commands in one batch.

2. **Use `MGET` / `MSET` for multiple key operations.** Faster than individual `GET`/`SET` calls:

```python
values = r.mget('key1', 'key2', 'key3')
r.mset({'key1': 'val1', 'key2': 'val2'})
```

3. **Use `HGETALL` sparingly on large hashes.** If a hash has many fields, use `HSCAN` to iterate:

```python
for field, value in r.hscan_iter('large_hash', count=100):
    print(field, value)
```

4. **Enable `lazyfree-lazy-eviction` in Redis 4.0+.** Async deletion prevents latency spikes during key eviction:

```bash
# redis.conf
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
lazyfree-lazy-server-del yes
```

5. **Use `OBJECT ENCODING` to inspect storage.** Redis uses compact encodings for small data structures. Check if your keys are using efficient encodings:

```python
encoding = r.object('encoding', 'mykey')
print(f"Encoding: {encoding}")  # e.g., ziplist, hashtable, int
```
