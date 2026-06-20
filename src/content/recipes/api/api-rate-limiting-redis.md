---
contentType: recipes
slug: api-rate-limiting-redis
title: "Implement API Rate Limiting with Redis"
description: "Protect APIs from abuse using token bucket and sliding window algorithms with Redis, including burst handling, distributed coordination, and custom headers for client feedback"
metaDescription: "Implement API rate limiting with Redis. Use token bucket and sliding window algorithms with burst handling, distributed coordination, and client feedback headers."
difficulty: intermediate
topics:
  - api
  - security
tags:
  - throttling
  - redis
  - api
  - rate-limiting
relatedResources:
  - /recipes/api/go-rest-api-gin
  - /patterns/design/circuit-breaker-resilience
  - /guides/security-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement API rate limiting with Redis. Use token bucket and sliding window algorithms with burst handling, distributed coordination, and client feedback headers."
  keywords:
    - rate limiting
    - token bucket
    - sliding window
    - redis
    - api protection
---

# Implement API Rate Limiting with Redis

Prevent API abuse and ensure fair resource distribution using Redis-backed rate limiters. See [Security Guide](/guides/security/security-best-practices-guide) for broader API protection strategies. This recipe implements token bucket and sliding window algorithms with distributed coordination, custom rate limit headers, and per-endpoint configuration for production APIs.

## When to Use This

- Public APIs need protection against brute force and scraping
- Different user tiers require different rate limits (free vs paid)
- Multiple API nodes must share rate limit state consistently

## Solution

### 1. Token Bucket Algorithm

```typescript
// rate-limiter/TokenBucket.ts
import { Redis } from 'ioredis';

class TokenBucketLimiter {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async check(key: string, capacity: number, refillRate: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const bucketKey = `ratelimit:token:${key}`;

    const luaScript = `
      local bucket = redis.call('HMGET', KEYS[1], 'tokens', 'lastRefill')
      local tokens = tonumber(bucket[1]) or ARGV[1]
      local lastRefill = tonumber(bucket[2]) or ARGV[3]
      local now = tonumber(ARGV[3])
      local capacity = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2])
      local interval = tonumber(ARGV[4])

      local elapsed = now - lastRefill
      local refill = math.floor(elapsed / interval) * refillRate
      tokens = math.min(capacity, tokens + refill)

      if tokens >= 1 then
        tokens = tokens - 1
        redis.call('HMSET', KEYS[1], 'tokens', tokens, 'lastRefill', now)
        redis.call('EXPIRE', KEYS[1], 3600)
        return {1, tokens, now + interval}
      else
        redis.call('HMSET', KEYS[1], 'tokens', tokens, 'lastRefill', lastRefill)
        redis.call('EXPIRE', KEYS[1], 3600)
        return {0, tokens, lastRefill + interval}
      end
    `;

    const result = await this.redis.eval(luaScript, 1, bucketKey, capacity, refillRate, now, 1000);
    const [allowed, remaining, resetTime] = result as [number, number, number];

    return {
      allowed: allowed === 1,
      remaining,
      resetTime,
    };
  }
}
```

### 2. Sliding Window Counter

```typescript
// rate-limiter/SlidingWindow.ts
class SlidingWindowLimiter {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async check(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowKey = `ratelimit:window:${key}`;
    const windowStart = now - windowMs;

    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(windowKey, 0, windowStart);
    pipeline.zcard(windowKey);
    pipeline.zadd(windowKey, now, `${now}-${Math.random()}`);
    pipeline.pexpire(windowKey, windowMs);

    const [, [currentCount], ,] = await pipeline.exec() as [unknown, [number], unknown, unknown];

    if (currentCount < limit) {
      return {
        allowed: true,
        remaining: limit - currentCount - 1,
        resetTime: now + windowMs,
      };
    }

    // Remove the request we just added
    await this.redis.zremrangebyrank(windowKey, -1, -1);

    const oldest = await this.redis.zrange(windowKey, 0, 0, 'WITHSCORES');
    const resetTime = oldest.length > 0 ? Number(oldest[1]) + windowMs : now + windowMs;

    return {
      allowed: false,
      remaining: 0,
      resetTime,
    };
  }
}
```

### 3. Express Middleware with Headers

```typescript
// middleware/rateLimit.ts
import { Request, Response, NextFunction } from 'express';

function rateLimit(limiter: TokenBucketLimiter, options: { capacity: number; refillRate: number }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.route?.path || req.path}`;
    const result = await limiter.check(key, options.capacity, options.refillRate);

    res.setHeader('X-RateLimit-Limit', String(options.capacity));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, result.remaining)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));

    if (!result.allowed) {
      res.status(429).json({
        error: 'Too Many Requests',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      });
      return;
    }

    next();
  };
}

// Usage
app.use('/api/public', rateLimit(limiter, { capacity: 100, refillRate: 10 }));
app.use('/api/premium', rateLimit(limiter, { capacity: 1000, refillRate: 100 }));
```

### 4. Per-User Tier Configuration

```typescript
// rate-limiter/TierConfig.ts
interface RateLimitConfig {
  capacity: number;
  refillRate: number;
}

const tierLimits: Record<string, RateLimitConfig> = {
  free: { capacity: 100, refillRate: 10 },
  pro: { capacity: 1000, refillRate: 100 },
  enterprise: { capacity: 10000, refillRate: 1000 },
};

async function getUserTier(userId: string): Promise<string> {
  // Fetch from database or cache
  return 'pro';
}

// Middleware with tier lookup
async function tieredRateLimit(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string;
  const tier = userId ? await getUserTier(userId) : 'free';
  const config = tierLimits[tier] || tierLimits.free;

  const key = `${tier}:${userId || req.ip}`;
  const result = await limiter.check(key, config.capacity, config.refillRate);

  if (!result.allowed) {
    res.status(429).json({ error: 'Rate limit exceeded', tier });
    return;
  }

  next();
}
```

## How It Works

- **Token bucket** allows bursts up to capacity while maintaining average rate
- **Sliding window** provides stricter limits by tracking exact request timestamps
- **Redis Lua scripts** guarantee atomic operations across distributed nodes
- **Response headers** inform clients of remaining quota and reset time

## Production Considerations

- Use Redis Cluster for high-availability rate limit state
- Implement [circuit breaker](/patterns/design/circuit-breaker-pattern) around Redis to fail open if cache is down
- Log rate limit violations for security monitoring and abuse detection

## Common Mistakes

- Rate limiting only by IP, which blocks legitimate users behind NAT
- Not handling Redis failures gracefully, causing API outages
- Returning 429 without Retry-After headers, leaving clients guessing
- **Express middleware**: For Express-specific patterns, see [Express Middleware Patterns](/recipes/api/express-middleware-patterns).

## FAQ

**Q: Token bucket vs sliding window: which should I use?**
A: Token bucket allows controlled bursts and is more efficient. Sliding window is stricter and better for exact compliance requirements.

**Q: How do I handle rate limits across microservices?**
A: Use a shared Redis instance or a dedicated rate limiting service with gRPC/HTTP APIs.
