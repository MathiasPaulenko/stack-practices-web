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
