---
contentType: recipes
slug: nodejs-caching-redis
title: "Node.js Caching with Redis: Cache-Aside and TTL Patterns"
description: "Cache API responses in Node.js with Redis using cache-aside and TTL patterns"
metaDescription: "Cache API responses in Node.js with Redis. Implement cache-aside, TTL expiration, cache invalidation, and tag-based batch invalidation with ioredis."
difficulty: intermediate
topics:
  - caching
tags:
  - nodejs
  - redis
  - caching
  - ioredis
  - cache-aside
  - ttl
  - performance
relatedResources:
  - /recipes/caching-redis
  - /recipes/python-api-rate-limiting
  - /recipes/api-rate-limiting-redis
  - /guides/caching-strategies
  - /patterns/cache-aside-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Cache API responses in Node.js with Redis. Implement cache-aside, TTL expiration, cache invalidation, and tag-based batch invalidation with ioredis."
  keywords:
    - nodejs redis cache
    - cache-aside nodejs
    - redis ttl
    - ioredis caching
    - cache invalidation
    - api response caching
---

## Overview

Caching API responses with Redis reduces database load, improves response times, and scales applications efficiently. This recipe covers cache-aside, TTL-based expiration, tag-based batch invalidation, and middleware patterns using ioredis in Node.js Express applications.

## When to Use

- You have API endpoints that return the same data repeatedly
- Database queries are slow and the data changes infrequently
- You need to reduce load on downstream services or databases
- You want to cache at the application layer rather than CDN level

## Solution

### Basic cache-aside with ioredis

```javascript
const express = require("express");
const Redis = require("ioredis");

const app = express();
const redis = new Redis({ host: "localhost", port: 6379 });

app.get("/api/users/:id", async (req, res) => {
    const userId = req.params.id;
    const cacheKey = `user:${userId}`;

    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            return res.json({
                data: JSON.parse(cached),
                source: "cache"
            });
        }

        // Simulate database fetch
        const user = await fetchUserFromDatabase(userId);

        await redis.setex(cacheKey, 300, JSON.stringify(user));

        res.json({ data: user, source: "database" });
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

async function fetchUserFromDatabase(id) {
    // Replace with actual database query
    return { id: parseInt(id), name: "John Doe", email: "john@example.com" };
}

app.listen(3000, () => console.log("Server running on port 3000"));
```

### Express caching middleware

```javascript
const express = require("express");
const Redis = require("ioredis");

const app = express();
const redis = new Redis({ host: "localhost", port: 6379 });

function cacheMiddleware(ttl = 300) {
    return async (req, res, next) => {
        const cacheKey = `api:${req.originalUrl}`;

        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                const data = JSON.parse(cached);
                res.setHeader("X-Cache", "HIT");
                res.setHeader("X-Cache-TTL", await redis.ttl(cacheKey));
                return res.json(data);
            }

            // Override res.json to intercept and cache the response
            const originalJson = res.json.bind(res);
            res.json = async function (data) {
                if (res.statusCode === 200 && data) {
                    try {
                        await redis.setex(cacheKey, ttl, JSON.stringify(data));
                    } catch (cacheErr) {
                        console.error("Cache write failed:", cacheErr.message);
                    }
                }
                res.setHeader("X-Cache", "MISS");
                return originalJson(data);
            };

            next();
        } catch (err) {
            console.error("Cache read failed:", err.message);
            next();
        }
    };
}

app.get("/api/products", cacheMiddleware(600), async (req, res) => {
    const products = await fetchProducts();
    res.json(products);
});

app.get("/api/products/:id", cacheMiddleware(300), async (req, res) => {
    const product = await fetchProduct(req.params.id);
    res.json(product);
});

async function fetchProducts() {
    return [
        { id: 1, name: "Widget", price: 9.99 },
        { id: 2, name: "Gadget", price: 19.99 }
    ];
}

async function fetchProduct(id) {
    return { id: parseInt(id), name: "Widget", price: 9.99 };
}

app.listen(3000);
```

### Tag-based cache invalidation

```javascript
const Redis = require("ioredis");

const redis = new Redis({ host: "localhost", port: 6379 });

async function cacheWithTags(key, data, tags, ttl = 300) {
    const pipeline = redis.pipeline();

    pipeline.setex(key, ttl, JSON.stringify(data));

    for (const tag of tags) {
        pipeline.sadd(`tag:${tag}`, key);
        pipeline.expire(`tag:${tag}`, ttl + 60);
    }

    await pipeline.exec();
}

async function invalidateByTag(tag) {
    const tagKey = `tag:${tag}`;
    const keys = await redis.smembers(tagKey);

    if (keys.length === 0) return;

    const pipeline = redis.pipeline();

    for (const key of keys) {
        pipeline.del(key);
    }
    pipeline.del(tagKey);

    await pipeline.exec();
}

// Usage: cache a user and tag it
await cacheWithTags(
    "user:123",
    { id: 123, name: "John", department: "engineering" },
    ["users", "department:engineering"],
    300
);

// Usage: invalidate all engineering-related caches
await invalidateByTag("department:engineering");

// Usage: invalidate all user caches
await invalidateByTag("users");
```

### Cache with stale-while-revalidate

```javascript
const Redis = require("ioredis");

const redis = new Redis({ host: "localhost", port: 6379 });

async function cacheSWR(key, fetchFn, ttl = 300, staleTtl = 600) {
    const cached = await redis.get(key);

    if (cached) {
        const data = JSON.parse(cached);
        const remainingTTL = await redis.ttl(key);

        if (remainingTTL > 0) {
            return { data, source: "cache-fresh" };
        }

        // TTL expired but stale data exists — return stale, revalidate in background
        setImmediate(async () => {
            try {
                const fresh = await fetchFn();
                await redis.setex(key, ttl, JSON.stringify(fresh));
            } catch (err) {
                console.error("Background revalidation failed:", err.message);
            }
        });

        return { data, source: "cache-stale" };
    }

    const fresh = await fetchFn();
    await redis.setex(key, ttl, JSON.stringify(fresh));

    return { data: fresh, source: "database" };
}

// Usage in Express
app.get("/api/dashboard", async (req, res) => {
    const result = await cacheSWR(
        "dashboard:summary",
        async () => {
            return await fetchDashboardData();
        },
        60,    // fresh for 60 seconds
        300    // stale for up to 5 minutes
    );

    res.json(result);
});
```

### Redis pub/sub for cache invalidation across instances

```javascript
const Redis = require("ioredis");

const redis = new Redis({ host: "localhost", port: 6379 });
const subscriber = new Redis({ host: "localhost", port: 6379 });

const localCache = new Map();

subscriber.subscribe("cache:invalidate");
subscriber.on("message", (channel, message) => {
    if (channel === "cache:invalidate") {
        const { key, tag } = JSON.parse(message);
        if (key) localCache.delete(key);
        if (tag) {
            for (const [k] of localCache.entries()) {
                if (k.includes(tag)) localCache.delete(k);
            }
        }
    }
});

async function cachedFetch(key, fetchFn, ttl = 300) {
    if (localCache.has(key)) {
        return localCache.get(key);
    }

    const redisData = await redis.get(key);
    if (redisData) {
        const data = JSON.parse(redisData);
        localCache.set(key, data);
        return data;
    }

    const fresh = await fetchFn();
    await redis.setex(key, ttl, JSON.stringify(fresh));
    localCache.set(key, fresh);

    return fresh;
}

async function invalidateCache(key) {
    localCache.delete(key);
    await redis.del(key);
    await redis.publish("cache:invalidate", JSON.stringify({ key }));
}
```

### Complete caching wrapper

```javascript
const Redis = require("ioredis");

class CacheManager {
    constructor(redisOptions = { host: "localhost", port: 6379 }) {
        this.redis = new Redis(redisOptions);
        this.defaultTTL = 300;
    }

    async get(key) {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
    }

    async set(key, value, ttl = this.defaultTTL, tags = []) {
        const pipeline = this.redis.pipeline();
        pipeline.setex(key, ttl, JSON.stringify(value));

        for (const tag of tags) {
            pipeline.sadd(`tag:${tag}`, key);
            pipeline.expire(`tag:${tag}`, ttl + 60);
        }

        await pipeline.exec();
    }

    async delete(key) {
        await this.redis.del(key);
    }

    async invalidateTag(tag) {
        const keys = await this.redis.smembers(`tag:${tag}`);
        if (keys.length === 0) return;

        const pipeline = this.redis.pipeline();
        for (const key of keys) {
            pipeline.del(key);
        }
        pipeline.del(`tag:${tag}`);
        await pipeline.exec();
    }

    async getOrSet(key, fetchFn, ttl = this.defaultTTL, tags = []) {
        const cached = await this.get(key);
        if (cached) return { data: cached, source: "cache" };

        const fresh = await fetchFn();
        await this.set(key, fresh, ttl, tags);
        return { data: fresh, source: "database" };
    }

    async flush() {
        await this.redis.flushdb();
    }
}

// Usage
const cache = new CacheManager();

app.get("/api/articles/:id", async (req, res) => {
    const result = await cache.getOrSet(
        `article:${req.params.id}`,
        () => fetchArticle(req.params.id),
        600,
        ["articles"]
    );
    res.json(result);
});

app.put("/api/articles/:id", async (req, res) => {
    await cache.invalidateTag("articles");
    res.json({ message: "Cache invalidated" });
});
```

## Explanation

The cache-aside pattern works by checking the cache before hitting the database. If the data is in the cache, return it. If not, fetch from the database, store in cache with a TTL, and return. This is the most common caching pattern because it is simple and handles cache misses gracefully.

Key concepts:

- **TTL (Time to Live)**: Every cached key has an expiration. After TTL seconds, the key is automatically removed by Redis. This prevents stale data from persisting indefinitely.
- **Tag-based invalidation**: When data changes, you need to invalidate related cache entries. Tags group cache keys so you can invalidate them in bulk. For example, tag all user-related caches with `users` and invalidate them all at once.
- **Stale-while-revalidate**: Serve stale data immediately while fetching fresh data in the background. This keeps response times fast even when the cache expires.
- **Pipeline**: Redis pipelines batch multiple commands into a single round-trip, reducing latency.
- **Pub/sub invalidation**: In multi-instance deployments, each instance may have a local in-memory cache. Redis pub/sub broadcasts invalidation events so all instances stay consistent.

## Variants

| Pattern | Strategy | Use When |
|---------|----------|----------|
| Cache-aside | Check cache, then DB | General purpose, most common |
| Write-through | Write to cache and DB simultaneously | Data must always be consistent |
| Write-behind | Write to cache, async to DB | High write throughput, tolerate slight delay |
| Stale-while-revalidate | Serve stale, refresh in background | Low latency, tolerate some staleness |
| Multi-level | L1 memory + L2 Redis | Maximum performance, distributed |

## Guidelines

- Set TTLs that match how often the underlying data changes. User profiles: 5 minutes. Product catalogs: 1 hour. Static config: 24 hours.
- Use pipelines for bulk operations to reduce round-trips.
- Tag related cache entries for efficient batch invalidation.
- Always handle cache failures gracefully. If Redis is down, fall back to the database.
- Monitor cache hit rate. Below 80% means your TTL may be too short or your cache keys too granular.
- Use consistent key naming: `entity:id` or `api:path`.
- Avoid caching personalized data without including the user ID in the cache key.

## Common Mistakes

- Not setting a TTL. Cached data lives forever and becomes stale.
- Using the same cache key for different users. User A sees User B's data.
- Not handling Redis connection failures. The app crashes when Redis is down.
- Caching too aggressively. Frequently changing data gets stale before it expires.
- Not invalidating cache on writes. Users see old data after updating.
- Storing large objects in cache. Redis is in-memory. Large values consume RAM quickly.

## Frequently Asked Questions

### How do I choose the right TTL?

Match TTL to data change frequency. If data changes every 5 minutes, set TTL to 300 seconds. If it changes hourly, set TTL to 3600. For stale-while-revalidate, set a short fresh TTL (60s) and a longer stale TTL (300s).

### Should I cache at the application layer or use a CDN?

CDNs cache static assets and responses at edge locations. Application caching with Redis caches computed data and database results. Use both: CDN for static content, Redis for dynamic API responses.

### How do I prevent cache stampede (thundering herd)?

When a popular cache key expires, many requests hit the database simultaneously. Use a lock to allow only one request to fetch:

```javascript
async function getOrSetWithLock(key, fetchFn, ttl) {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);

    const lockKey = `lock:${key}`;
    const acquired = await redis.set(lockKey, "1", "EX", 10, "NX");

    if (!acquired) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return getOrSetWithLock(key, fetchFn, ttl);
    }

    try {
        const fresh = await fetchFn();
        await redis.setex(key, ttl, JSON.stringify(fresh));
        return fresh;
    } finally {
        await redis.del(lockKey);
    }
}
```

### How do I measure cache hit rate?

Track hits and misses in your application:

```javascript
let cacheHits = 0;
let cacheMisses = 0;

async function getOrSet(key, fetchFn, ttl) {
    const cached = await redis.get(key);
    if (cached) {
        cacheHits++;
        return JSON.parse(cached);
    }
    cacheMisses++;
    const fresh = await fetchFn();
    await redis.setex(key, ttl, JSON.stringify(fresh));
    return fresh;
}

function getHitRate() {
    const total = cacheHits + cacheMisses;
    return total > 0 ? (cacheHits / total * 100).toFixed(1) + "%" : "N/A";
}
```
