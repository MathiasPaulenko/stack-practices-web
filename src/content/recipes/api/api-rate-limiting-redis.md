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
  - rest
relatedResources:
  - /recipes/api/go-rest-api-gin
  - /recipes/api/api-documentation-openapi
lastUpdated: "2026-07-09"
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

Prevent API abuse and ensure fair resource distribution using Redis-backed rate limiters. See [Security Guide](/guides/security/security-best-practices-guide) for broader API protection strategies. Here is a working implementation of token bucket and sliding window algorithms with distributed coordination, custom rate limit headers, and per-endpoint configuration for production APIs.

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

### Token bucket vs sliding window: which should I use?

Token bucket allows controlled bursts and is more efficient with Redis operations (one Lua script call per request). Sliding window is stricter and better for exact compliance requirements (e.g., financial APIs that must enforce exact request counts per minute). Token bucket refills at a fixed rate, so a client that waits can accumulate tokens for a burst. Sliding window counts requests in a rolling time window, preventing bursts entirely. For most APIs, token bucket with a reasonable burst size (2x the steady-state rate) is sufficient.

### How do I handle rate limits across microservices?

Use a shared Redis instance or a dedicated rate limiting service with gRPC/HTTP APIs. Each service calls the rate limiter before processing the request. For distributed deployments, use Redis Cluster to avoid a single point of failure. Alternatively, deploy an API gateway (Kong, Envoy) that handles rate limiting centrally. For service-to-service calls, implement a token-bucket per service pair rather than per client to prevent one downstream service from exhausting another's quota.

### How do I handle Redis failures without blocking all traffic?

Implement a circuit breaker around Redis calls. If Redis is unavailable, fail open (allow the request) and log a warning. Failing closed (blocking all traffic) causes cascading outages. Use a local in-memory fallback (e.g., a simple counter with `lru-cache`) for short Redis outages. Set a timeout on Redis commands (e.g., 50ms) so a slow Redis does not block request processing. Monitor Redis health and alert when the circuit breaker is open.

### How do I set per-tier rate limits (free, pro, enterprise)?

Store the tier in the API key or JWT claims. Look up the tier's rate limit configuration from a database or config file. Use different Redis key prefixes per tier: `rate:free:{key}`, `rate:pro:{key}`, `rate:enterprise:{key}`. Apply different bucket sizes and refill rates per tier. Return the tier in response headers (`X-RateLimit-Tier: pro`) so clients can debug their limits. Update tier configuration without redeploying by reading from a config service or database.

### How do I test rate limiting logic?

Write unit tests for the Lua script using `redis-cli --eval` with mock keys. Test boundary conditions: exactly at the limit, one over the limit, refill after waiting. For integration tests, use `ioredis-mock` or a real Redis instance in a Docker container. Simulate concurrent requests with `Promise.all` to verify atomicity. Test Redis failure scenarios by killing the Redis process mid-test and verifying the circuit breaker opens. Load test with `k6` or `artillery` to verify the rate limiter handles expected throughput.

### How do I rate limit WebSocket connections?

Rate limit by connection ID, not just IP. Track active connections per user in Redis with a sorted set (`ZADD ws:connections timestamp connectionId`). Enforce a max connections limit per user. For message rate, count messages per connection with a token bucket: `rate:ws:{connectionId}`. Disconnect clients that exceed the message rate with a close code 1008 (policy violation). Clean up connection entries on disconnect with `ZREMRANGEBYSCORE`.

### How do I handle rate limit headers in a gateway?

Set standard headers: `X-RateLimit-Limit` (max requests per window), `X-RateLimit-Remaining` (requests left), `X-RateLimit-Reset` (Unix timestamp when the window resets), and `Retry-After` (seconds to wait, only on 429 responses). Use the `RateLimit-*` header prefix from the IETF draft (e.g., `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`) for modern clients. Do not expose internal rate limit configuration (bucket size, refill rate) — only the effective limits the client sees.

### How do I implement distributed rate limiting without Redis?

For environments without Redis, use a token bucket in a shared database (PostgreSQL `SELECT FOR UPDATE`, DynamoDB conditional writes). The downside is higher latency — each rate limit check requires a database round trip. For eventual consistency, use a local token bucket per instance and periodically sync with a central store. This allows short bursts above the limit but converges to the correct rate over time. For CDN-level rate limiting, use Cloudflare's rate limiting rules or AWS WAF rate-based rules — these block requests before they reach your server.

### How do I handle rate limiting for authenticated vs unauthenticated requests?

Use different rate limit keys: `rate:ip:{ip}` for unauthenticated and `rate:user:{userId}` for authenticated. Apply different limits: unauthenticated gets 10 req/min, authenticated gets 100 req/min. Check authentication first — if the user is authenticated, skip the IP-based limiter. For APIs with both free and paid tiers, use `rate:free:{userId}` and `rate:pro:{userId}` with different bucket sizes. Return the authentication status in headers (`X-RateLimit-Authenticated: true`) so clients can debug why they hit different limits.

### How do I implement a sliding window log algorithm in Redis?

Use a sorted set per client: `ZADD rate:log:{key} timestamp request_id`. Remove entries outside the window: `ZREMRANGEBYSCORE rate:log:{key} 0 (now - window)`. Count remaining entries: `ZCARD rate:log:{key}`. If count exceeds the limit, reject the request. This approach uses more memory than token bucket but provides exact request counts in any time window. Add a TTL on the key to auto-expire inactive clients. For high-traffic APIs, prefer token bucket — sliding window log stores every request ID, which can consume significant Redis memory.

### How do I implement a fixed window counter algorithm in Redis?

Use `INCR` with a key that includes the window timestamp: `key = rate:fixed:{clientId}:{floor(now / window)}`. Increment with `INCR key` and set expiry with `EXPIRE key windowSeconds`. If the count exceeds the limit, reject. This is the simplest algorithm but has boundary issues: a client can send 2x the limit at the window boundary (N requests at 59 seconds, N more at 60 seconds). Use this for low-precision requirements where simplicity matters more than accuracy. For production APIs, prefer token bucket or sliding window.

### How do I handle rate limiting for GraphQL APIs?

Rate limit by query cost, not by request count. Assign complexity scores to each field and calculate the total query cost before execution. Use `graphql-cost-analysis` package to enforce cost limits per query. Store the accumulated cost in Redis: `INCRBY rate:gql:{userId} cost`. A single GraphQL query can be as expensive as 100 REST requests, so request-count-based limiting is insufficient. For persisted queries, cache the cost calculation. Return `X-RateLimit-Cost` headers so clients understand their query cost.

### How do I monitor and alert on rate limiting?

Track metrics: total requests, rate-limited requests (429s), top rate-limited clients, and Redis latency. Use Prometheus or CloudWatch to collect metrics. Set alerts when the 429 rate exceeds 5% of total requests — this may indicate limits are too aggressive or a client is misbehaving. Monitor Redis command latency: if `EVALSHA` takes more than 10ms, investigate Redis performance. Log rate-limited requests with client ID, endpoint, and limit for debugging. Dashboard the top 10 rate-limited clients to identify abusive patterns. Alert when the circuit breaker is open (Redis unavailable) — this means rate limiting is disabled.

### How do I implement a sliding window counter (hybrid) algorithm in Redis?

Combine fixed window and sliding window: use two counters per client — current window and previous window. Calculate the weighted count: `count = current + previous * (1 - (now - windowStart) / window)`. Store counters with `INCR` and `EXPIRE` as in the fixed window approach. This approximates the sliding window without storing every request ID, using O(1) memory per client. The approximation is accurate within a small margin and suitable for most APIs. Use this when you need better accuracy than fixed window but lower memory than sliding window log.

### How do I handle rate limiting with API keys and multi-tenant isolation?

Use the API key as the rate limit identifier: `rate:apikey:{apiKeyHash}`. Hash the API key with SHA-256 before using it as a Redis key to avoid storing raw keys in Redis. For multi-tenant isolation, namespace keys by tenant: `rate:tenant:{tenantId}:apikey:{apiKeyHash}`. Apply per-tenant limits so one tenant cannot exhaust the global rate limit. Store tenant configurations in a separate Redis hash: `HSET tenant:config:{tenantId} rateLimit 100 window 60`. On each request, look up the tenant config and apply the appropriate limits. Rotate API keys by creating a new key, migrating traffic, then revoking the old key.

### How do I handle rate limiting with websockets and long-lived connections?

Rate limit websocket connections by message count, not connection count. Track messages per second per connection in Redis: `INCR rate:ws:{connectionId}:{windowKey}`. Apply a per-connection limit (e.g., 10 messages/second) and a per-user limit across all connections (e.g., 50 messages/second). On connect, register the connection in a Redis set: `SADD rate:ws:user:{userId} {connectionId}`. On disconnect, remove it: `SREM rate:ws:user:{userId} {connectionId}`. For broadcast messages, use a separate counter to limit total broadcasts per second. Close connections that exceed the limit with a 1008 policy violation close code.

### How do I handle rate limiting with incoming webhooks and callbacks?

Rate limit incoming webhooks by source IP and event type: `rate:webhook:{sourceIp}:{event}:{windowKey}`. Webhooks can have large bursts when an external system sends batch notifications. Apply higher limits for webhooks than for user requests (e.g., 1000/minute per source IP). Validate the webhook signature before applying the rate limit to prevent attackers from consuming the rate limit with invalid requests. Use a separate queue for webhook processing: the endpoint accepts the request quickly (200 OK) and enqueues it for async processing. If the queue is full, return 429 with a `Retry-After` header. Monitor the lag between webhook receipt and processing.

### How do I implement rate limiting with Redis Cluster and sharding?

In Redis Cluster, keys are distributed across slots using hash tags. For rate limiting, use hash tags to ensure all keys related to a client are on the same slot: `rate:{tenantId}:apikey:{apiKeyHash}`. The `{tenantId}` in braces ensures Redis Cluster routes the key to the same slot. If you need atomic operations across multiple keys for the same client, all must share the hash tag. For globally distributed clients, consider regional Redis instances with sync via Redis Geo-Distribution. Monitor key distribution across slots with `CLUSTER SLOTS` and rebalance if a slot has hotspots.

### How do I test rate limiting in integration?

Use a test that makes N rapid requests and verifies that the N+1 response returns 429. In JavaScript, use `supertest` with Express: `await request(app).get('/api').expect(200)` for the first N requests, then `await request(app).get('/api').expect(429)`. In Python, use `pytest` with `httpx.Client`. Mock Redis with `ioredis-mock` or `fakeredis` for unit tests. For integration tests, use a real Redis via `testcontainers`. Verify that the `Retry-After` header is present on 429 responses. Test the circuit breaker: stop Redis and verify that requests pass through without rate limiting.
