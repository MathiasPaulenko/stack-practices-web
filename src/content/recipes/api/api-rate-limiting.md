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

## Best Practices

- **Use sliding window over fixed window**: sliding window provides smoother rate limiting without burst spikes at window boundaries. Redis sorted sets make sliding windows efficient.
- **Differentiate limits by endpoint cost**: a GET `/users` is cheap; a POST `/reports/export` is expensive. Set lower limits on costly endpoints to protect backend resources.
- **Return meaningful 429 responses**: include `Retry-After` header, current limit, remaining quota, and reset timestamp in response headers. Clients can use this to implement backoff correctly.
- **Exempt internal service-to-service calls**: rate limiting inter-service traffic can cascade failures. Use mTLS or network policies for internal auth instead of rate limits.
- **Store rate limit counters in Redis, not memory**: in-memory counters don't work across multiple instances. Redis provides atomic INCR with TTL, ideal for distributed rate limiting.
- **Monitor rate limit hit rates**: if >5% of requests are rate-limited, either your limits are too low or a client is misbehaving. Alert on sudden spikes in 429 responses.

## Production Checklist

- [ ] Rate limits are enforced before request processing, not after
- [ ] 429 responses include `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining` headers
- [ ] Redis connection has a fallback (fail open) with alerting on failures
- [ ] Rate limit counters are scoped per API key or user, not per IP only
- [ ] Expensive endpoints have separate, lower rate limits
- [ ] Internal service-to-service traffic is exempt or has higher limits
- [ ] Rate limit configuration is externalized (env vars, config service) for hot-reload
- [ ] 429 response rate is monitored and alerted on (>5% threshold)
- [ ] Rate limit tests cover concurrent requests to verify atomicity
- [ ] Documentation describes rate limits and headers for API consumers

## Scaling Considerations

- **Redis throughput at scale**: a single Redis instance handles ~100K operations/second. For 1M requests/second, you need Redis Cluster with sharding by API key. Each rate limit check requires 2 Redis operations (INCR + EXPIRE), so plan for 2M ops/second at peak.
- **Latency impact**: each rate limit check adds 1-3ms (Redis round-trip). For APIs with sub-10ms latency budgets, use local token buckets with periodic Redis sync (every 100ms). This trades precision for speed — limits may be off by ~10% under contention.
- **Multi-region deployments**: if your API runs in multiple regions, Redis must be co-located with each region's API instances. Cross-region Redis calls add 50-200ms latency. Use regional Redis clusters and accept slightly different limits per region.
- **Cold start protection**: serverless functions (Lambda, Cloud Run) may scale from 0 to 1000 instances in seconds. Each new instance starts with an empty local bucket. Use Redis-backed limits to avoid burst traffic overwhelming backend services during cold start waves.

## Cost Estimation

| Component | Cost | Notes |
|-----------|------|-------|
| Redis (single, 1GB) | $10-$25/month | AWS ElastiCache, GCP Memorystore |
| Redis Cluster (3 shards) | $75-$200/month | For >100K ops/second |
| Redis (self-hosted on EC2) | $5-$15/month | t3.small, 1GB RAM |
| Cloudflare Rate Limiting | $5-$25/month | Edge-level, no Redis needed |
| AWS API Gateway throttling | $0 | Built-in, per-stage limits |

For 10K requests/second: Redis Cluster ($150/month) handles 200K ops/second with headroom. Cloudflare edge rate limiting ($25/month) offloads 90% of traffic before it hits your origin, reducing Redis load proportionally.

## When Not to Use This Approach

- **Internal microservices with trusted callers**: rate limiting inter-service traffic adds latency and complexity. Use circuit breakers and bulkheads instead to protect downstream services.
- **Webhook receivers with signature verification**: if you verify HMAC signatures on every request, invalid requests are rejected before hitting rate limits. Rate limiting adds no security value here.
- **Batch processing APIs**: APIs designed for bulk data transfer (ETL pipelines, batch exports) should use queue-based throttling, not per-request rate limits. A batch job sending 10K requests in 10 seconds is expected behavior, not abuse.

## Performance Benchmarks

| Strategy | Overhead per request | Max throughput | Memory per key |
|----------|---------------------|---------------|---------------|
| In-memory token bucket | 0.01ms | 500K req/s | 64 bytes |
| Redis fixed window | 1-2ms | 50K req/s | 72 bytes |
| Redis sliding window | 2-3ms | 30K req/s | 128 bytes |
| Redis token bucket | 1-2ms | 50K req/s | 64 bytes |
| Cloudflare edge | 0ms (at origin) | Unlimited | 0 bytes |

In-memory rate limiting is 100x faster than Redis but doesn't work across instances. For single-instance deployments, use in-memory. For multi-instance, Redis is the standard. Cloudflare edge rate limiting is free at the origin level but costs $5-$25/month for custom rules.

## Testing Strategy

- **Test rate limit enforcement**: send N+1 requests rapidly and verify the (N+1)th returns 429 with correct headers (`Retry-After`, `X-RateLimit-Remaining`). Test with different client IDs to verify per-client isolation.
- **Test window reset behavior**: send requests up to the limit, wait for the window to reset, and verify requests succeed again. Test edge cases at window boundaries (e.g., request at 59.9s and 60.1s).
- **Test Redis failover**: simulate Redis connection loss and verify the rate limiter fails open (allows requests) or fails closed (blocks all) according to your policy. Document the chosen behavior for the operations team.
- **Test distributed consistency**: run multiple instances simultaneously and verify that the aggregate rate limit is enforced correctly across all instances. Use a load tester to generate traffic from multiple sources.

## Common Pitfalls

- **Using fixed windows without jitter**: fixed window rate limiting causes thundering herd at window boundaries. All clients retry simultaneously at the start of each window. Add jitter (random delay 0-500ms) to retry logic.
- **Forgetting to rate limit by IP behind a proxy**: if your API sits behind a load balancer, `req.ip` returns the proxy IP, not the client IP. Configure `trust proxy` and use `X-Forwarded-For` to identify real clients.
- **Redis rate limiter failing closed**: if Redis goes down and the rate limiter blocks all requests, your API goes offline. Configure fail-open behavior (allow requests when Redis is unreachable) for non-critical endpoints.
- **Not differentiating authenticated vs anonymous limits**: anonymous users should have lower limits than authenticated users. Use a tiered approach: 10 req/min for anonymous, 100 req/min for authenticated, 1000 req/min for premium API keys.

## Monitoring and Observability

- **Track 429 response rate**: monitor the percentage of requests returning 429. A sudden increase may indicate a misconfigured limit or an abusive client. Alert if 429 rate exceeds 5% of total traffic.
- **Monitor Redis latency for rate limit checks**: track the time taken for Redis `INCR` and `EXPIRE` commands. If p95 exceeds 5ms, consider switching to in-memory rate limiting for non-critical endpoints or adding Redis replicas.
- **Track rate limit key count**: monitor the number of unique rate limit keys in Redis. If key count grows unboundedly, clients may be generating unique IDs to bypass limits. Set a max key count and evict old keys with `EXPIRE`.
- **Alert on rate limiter failures**: if the rate limiter crashes or Redis becomes unreachable, alert the on-call engineer immediately. A failed rate limiter either blocks all traffic (fail-closed) or allows unlimited traffic (fail-open), both requiring immediate attention.

## Deployment Checklist

- [ ] Choose rate limit strategy (fixed window, sliding window, token bucket)
- [ ] Configure limits per endpoint and per user tier (anonymous, authenticated, premium)
- [ ] Set up Redis for distributed rate limiting if running multiple instances
- [ ] Configure `trust proxy` and use `X-Forwarded-For` for client IP identification
- [ ] Add jitter to retry logic to prevent thundering herd at window boundaries
- [ ] Set up fail-open behavior for non-critical endpoints when Redis is unreachable
- [ ] Configure `Retry-After` and `X-RateLimit-*` headers in 429 responses
- [ ] Test rate limiting in staging with realistic traffic patterns
- [ ] Set up monitoring for 429 response rate and Redis latency
- [ ] Document rate limits in API documentation and developer portal

## Security Considerations

- **Rate limit key spoofing**: if clients can manipulate their IP or user ID, they can bypass rate limits. Always validate the `X-Forwarded-For` header against trusted proxy IPs. Use authenticated user IDs as the rate limit key for logged-in users.
- **Distributed denial-of-service via rate limit exhaustion**: attackers can send just-under-limit traffic from many IPs to exhaust server resources without triggering 429. Combine rate limiting with connection limits and request body size limits.
- **Redis as a single point of failure**: if Redis goes down, the rate limiter either blocks all traffic or allows unlimited traffic. Run Redis in sentinel or cluster mode for high availability.
- **Timing attacks on rate limit checks**: if rate limit decisions take different time for allowed vs denied requests, attackers can infer the rate limit state. Use constant-time comparisons for rate limit checks to prevent timing-based side channels.
- **Rate limit header information leakage**: `X-RateLimit-Remaining` and `X-RateLimit-Limit` headers reveal your rate limit configuration to attackers. Consider omitting these headers for unauthenticated requests or returning approximate values.
- **Shared IP rate limiting for NAT**: users behind a corporate NAT share the same IP. Aggressive per-IP limits can block legitimate users. Use a combination of IP and authenticated user ID for rate limit keys, and set higher limits for shared IPs.
- **Rate limit bypass via HTTP method switching**: if rate limits are applied only to GET requests, attackers can switch to POST or PUT to bypass them. Apply rate limits to all HTTP methods, including OPTIONS and HEAD.
- **Race conditions in distributed rate limiting**: concurrent requests may read the same counter value before any of them increments it, allowing more requests than the limit. Use Redis atomic operations (`INCR` with `EXPIRE`) or Lua scripts to ensure atomicity.
- **Rate limit evasion via path variation**: attackers can vary the URL path (e.g., `/api/users?x=1` vs `/api/users?x=2`) to bypass per-endpoint rate limits. Normalize URLs before applying rate limit keys and rate limit by API endpoint pattern, not full URL.
- **Token bucket overflow in burst scenarios**: token bucket algorithms allow bursts up to the bucket capacity. If the bucket is too large, a single client can overwhelm the server in a burst. Set bucket capacity to 2x the refill rate to balance bursts and sustained traffic.
- **Rate limit key expiration without cleanup**: if rate limit keys in Redis are not cleaned up after expiration, memory usage grows unboundedly. Use `EXPIRE` on every key and set a max TTL of 24 hours to ensure automatic cleanup.
- **Client-side rate limit caching**: clients may cache rate limit responses locally and reuse them to avoid hitting the server. Include a `Date` or `ETag` header in rate limit responses to prevent stale caching.
