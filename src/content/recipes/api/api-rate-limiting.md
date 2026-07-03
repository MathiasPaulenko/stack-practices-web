---
contentType: recipes
slug: api-rate-limiting
title: "API Rate Limiting"
description: "Protect APIs from abuse and ensure fair resource usage with token bucket, sliding window, and leaky bucket rate limiting."
metaDescription: "API rate limiting strategies: token bucket, sliding window, leaky bucket algorithms, Redis-based rate limiters, and distributed rate limiting."
difficulty: intermediate
topics:
  - api
tags:
  - rate-limiting
  - api
  - redis
  - security
  - token-bucket
  - sliding-window
relatedResources:
  - /recipes/api-rate-limiting-redis
  - /guides/security/api-security-checklist-guide
  - /recipes/caching/redis-rate-limiting-token-bucket
lastUpdated: "2026-07-03"
author: "StackPractices"
seo:
  metaDescription: "API rate limiting strategies: token bucket, sliding window, leaky bucket algorithms, Redis-based rate limiters, and distributed rate limiting."
  keywords:
    - rate-limiting
    - api
    - redis
    - security
---
## Overview

Rate limiting protects APIs from abuse and ensures fair resource distribution across clients. Three algorithms cover most use cases: token bucket allows bursts, sliding window enforces strict limits, and leaky bucket smooths traffic.

## When to Use

Use this resource when:
- Public APIs need protection against brute force and scraping
- Different user tiers require different rate limits
- Multiple API nodes must share rate limit state consistently

## Solution

### Python (Token Bucket with Redis)

```python
import time
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

def token_bucket(key, capacity=10, refill_rate=1.0):
    """Token bucket algorithm using Redis INCR with expiry."""
    now = time.time()
    bucket_key = f"rate_limit:{key}"
    tokens = r.hgetall(bucket_key)

    if not tokens:
        r.hset(bucket_key, mapping={"tokens": capacity - 1, "last_refill": now})
        r.expire(bucket_key, int(capacity / refill_rate) + 1)
        return True

    current_tokens = float(tokens.get(b"tokens", 0))
    last_refill = float(tokens.get(b"last_refill", now))
    elapsed = now - last_refill
    current_tokens = min(capacity, current_tokens + elapsed * refill_rate)

    if current_tokens < 1:
        r.hset(bucket_key, mapping={"tokens": current_tokens, "last_refill": now})
        return False

    r.hset(bucket_key, mapping={"tokens": current_tokens - 1, "last_refill": now})
    return True
```

### JavaScript (Sliding Window with Redis)

```javascript
import { createClient } from 'redis';

const client = createClient({ url: 'redis://localhost:6379' });
await client.connect();

async function slidingWindow(key, limit = 100, windowSec = 60) {
  const now = Date.now();
  const windowStart = now - windowSec * 1000;
  const sortedSetKey = `rate_limit:${key}`;

  // Remove entries outside the window
  await client.zRemRangeByScore(sortedSetKey, 0, windowStart);

  // Count current entries
  const count = await client.zCard(sortedSetKey);

  if (count >= limit) {
    return { allowed: false, retryAfter: windowSec };
  }

  // Add current request
  await client.zAdd(sortedSetKey, [{ score: now, value: `${now}` }]);
  await client.expire(sortedSetKey, windowSec);

  return { allowed: true, remaining: limit - count - 1 };
}
```

### Java (Leaky Bucket)

```java
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class LeakyBucket {
    private static final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    static class Bucket {
        final int capacity;
        final double leakRatePerSec;
        double water;
        long lastLeak;

        Bucket(int capacity, double leakRatePerSec) {
            this.capacity = capacity;
            this.leakRatePerSec = leakRatePerSec;
            this.water = 0;
            this.lastLeak = System.currentTimeMillis();
        }

        synchronized boolean allow() {
            long now = System.currentTimeMillis();
            double elapsed = (now - lastLeak) / 1000.0;
            water = Math.max(0, water - elapsed * leakRatePerSec);
            lastLeak = now;
            if (water < capacity) {
                water += 1;
                return true;
            }
            return false;
        }
    }

    public static boolean allowRequest(String clientId, int capacity, double leakRate) {
        return buckets.computeIfAbsent(clientId, k -> new Bucket(capacity, leakRate)).allow();
    }
}
```

## Explanation

**Token bucket** maintains a pool of tokens that refills at a fixed rate. Each request consumes one token. If no tokens are available, the request is rejected. This allows short bursts up to the bucket capacity while maintaining an average rate.

**Sliding window** tracks requests within a time window and rejects new requests once the limit is reached. Unlike fixed windows, it avoids boundary spikes by using a rolling window.

**Leaky bucket** processes requests at a fixed rate regardless of arrival pattern. Incoming requests queue up and "leak" out at a constant rate, smoothing bursty traffic.

## Variants

| Algorithm | Burst Handling | Memory | Best For |
|-----------|---------------|--------|----------|
| Token bucket | Allows bursts up to capacity | Low | APIs with bursty traffic |
| Sliding window | Strict per-window limit | Medium | Payment APIs, sensitive endpoints |
| Leaky bucket | Smooths to constant rate | Low | Downstream service protection |

## What Works

1. Use token bucket for controlled bursts and sliding window for strict limits
2. Return `Retry-After` headers with 429 responses so clients know when to retry
3. Rate limit by user ID, not just IP, to avoid blocking legitimate users behind NAT
4. Log rate limit violations for security monitoring and abuse detection
5. Implement a circuit breaker around Redis to fail open if the cache is down

## Common Mistakes

1. Rate limiting only by IP, which blocks legitimate users behind NAT
2. Not handling Redis failures gracefully, causing API outages
3. Returning 429 without `Retry-After` headers, leaving clients guessing
4. Using the same rate limit for all endpoints regardless of cost or sensitivity
5. Ignoring rate limit violations instead of logging them for security analysis

## Frequently Asked Questions

### Should I fail open or closed when Redis is down?

Fail open for rate limiting. Rejecting all requests because the rate limiter is unavailable causes worse outages than allowing traffic through temporarily. Log the failure and alert on it.

### How do I handle distributed rate limiting across multiple nodes?

Use a shared store like Redis. Each node checks and increments the counter in Redis. For lower latency, use local token buckets with periodic Redis synchronization, accepting slightly less precise limits.

### What rate limit values should I start with?

Start with 100 requests per minute for authenticated users and 10 per minute for anonymous. Monitor usage patterns and adjust. Expensive endpoints (exports, reports) should have separate, lower limits.
