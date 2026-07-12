---






contentType: docs
slug: api-rate-limiting-policy-template
title: "API Rate Limiting Policy Template"
description: "A template for defining API rate limits per consumer tier, including burst allowances, quota periods, and escalation paths."
metaDescription: "Define API rate limits per tier with this template. Covers burst limits, quota windows, headers, and escalation for consumers."
difficulty: intermediate
topics:
  - api
  - architecture
  - performance
tags:
  - api
  - rate-limiting
  - throttling
  - policy
  - template
  - performance
relatedResources:
  - /docs/api-performance-budget-template
  - /docs/escalation-policy-template
  - /docs/api-security-review-template
  - /guides/api-rate-limiting-guide
  - /docs/api-changelog-template
  - /patterns/throttling-pattern
  - /guides/graphql-vs-rest-guide
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Define API rate limits per tier with this template. Covers burst limits, quota windows, headers, and escalation for consumers."
  keywords:
    - rate limiting
    - api throttling
    - quota policy
    - burst limits
    - api tiers
    - rate limit headers






---

## Overview

Unlimited API access is a recipe for abuse, accidental DDoS, and unpredictable costs. Rate limiting protects your infrastructure while giving consumers predictable access. Without a documented policy, consumers discover limits only when their requests start failing with `429 Too Many Requests`. This template defines rate limits per tier, communicates them transparently, and provides an escalation path for consumers who need more.

## When to Use


- For alternatives, see [Throttling Pattern](/patterns/throttling-pattern/).

Use this resource when:
- Launching a public or partner API
- Defining pricing tiers for API access
- Experiencing traffic spikes that degrade service for others
- Negotiating SLAs with enterprise clients who need higher limits

## Solution

```markdown
# API Rate Limiting Policy

## Tiers & Limits

| Tier | Requests / Minute | Requests / Hour | Burst | Cost |
|------|-------------------|-------------------|-------|------|
| Free | 60 | 1,000 | 10 | $0 |
| Starter | 300 | 10,000 | 50 | $49/mo |
| Pro | 1,000 | 100,000 | 200 | $199/mo |
| Enterprise | 10,000 | 1,000,000 | 2,000 | Custom |

## Limit Scope

Limits are applied per **API key** at the following scopes:
- **Global:** All endpoints combined count toward the same limit
- **Endpoint-specific:** `POST /orders` has its own limit separate from `GET /products`
- **IP-based (Free tier only):** Fallback enforcement when API key is absent

## Quota Periods

- **Per-minute limit:** Resets at the top of each minute (UTC)
- **Per-hour limit:** Resets at the top of each hour (UTC)
- **Rolling window:** A 60-second sliding window (more precise but computationally expensive)

## Response Headers

Every API response includes the following headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1719398400
X-RateLimit-Policy: pro;w=3600
```

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed in the current window |
| `X-RateLimit-Remaining` | Requests remaining in the current window |
| `X-RateLimit-Reset` | Unix timestamp when the current window resets |
| `X-RateLimit-Policy` | Tier and window size identifier |

## Exceeded Limit Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded your rate limit. Please retry after 2026-06-26T11:00:00Z.",
    "retryAfter": 3600,
    "documentationUrl": "https://docs.example.com/rate-limits"
  }
}
```

HTTP Status: `429 Too Many Requests`
Required Header: `Retry-After: 3600`

## Burst Behavior

Burst limits allow short spikes above the sustained rate:
- **Pro tier:** 200 requests in 1 second, then throttled to 1,000/hour average
- **Algorithm:** Token bucket with refill rate = sustained limit / window size
- **Penalty:** No penalty for burst usage within configured limits

## Increasing Limits

1. **Upgrade tier:** Change your plan in the developer dashboard
2. **Request exception:** Contact api-support@example.com with:
   - Current usage patterns (requests per endpoint, peak hours)
   - Business justification (product launch, integration partner)
   - Expected timeline and volume
3. **Enterprise negotiation:** Dedicated capacity, custom SLA, private endpoints

## Monitoring & Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| Approaching Limit | 80% of hourly quota consumed | Email notification to admin |
| Limit Exceeded | 429 responses > 1% of traffic | PagerDuty alert to on-call |
| Abuse Pattern | 10x normal volume from single key | Auto-throttle + manual review |

## Fair Use Policy

- **No automated evasion:** Using multiple API keys to circumvent limits violates terms
- **Cache aggressively:** Responses marked `Cache-Control: public` should be cached
- **Batch operations:** Use bulk endpoints instead of individual calls
- **Webhook preference:** Subscribe to webhooks instead of polling for state changes
```

## Explanation

The policy separates **sustained limits** (average over time) from **burst limits** (short-term spikes). The token bucket algorithm is the industry standard because it allows bursts while enforcing long-term averages. Response headers give consumers real-time feedback so they can back off before hitting limits. The escalation path prevents support tickets from consumers who simply need a higher tier.

## Token Bucket Implementation

The token bucket algorithm is the most common approach for rate limiting. Here is a Redis-based implementation:

### Redis Token Bucket in Node.js

```javascript
const redis = require("redis");

async function rateLimit(redisClient, key, options) {
  const { capacity, refillRate, refillIntervalSec } = options;
  const now = Date.now();
  const bucketKey = `ratelimit:${key}`;

  const result = await redisClient
    .multi()
    .hGetAll(bucketKey)
    .hSet(bucketKey, {
      tokens: capacity,
      lastRefill: now,
    })
    .expire(bucketKey, refillIntervalSec * 2)
    .exec();

  const bucket = result[0];
  let tokens = parseFloat(bucket.tokens) || capacity;
  let lastRefill = parseInt(bucket.lastRefill) || now;

  const elapsed = (now - lastRefill) / 1000;
  const refillAmount = elapsed * (capacity / refillIntervalSec);
  tokens = Math.min(capacity, tokens + refillAmount);

  if (tokens >= 1) {
    tokens -= 1;
    await redisClient.hSet(bucketKey, {
      tokens: tokens.toString(),
      lastRefill: now.toString(),
    });
    return { allowed: true, remaining: Math.floor(tokens) };
  } else {
    const retryAfter = Math.ceil((1 - tokens) / (capacity / refillIntervalSec));
    await redisClient.hSet(bucketKey, {
      tokens: tokens.toString(),
      lastRefill: now.toString(),
    });
    return { allowed: false, remaining: 0, retryAfter };
  }
}
```

### Express.js Middleware

```javascript
const TIERS = {
  free: { capacity: 10, refillRate: 60, refillIntervalSec: 60 },
  starter: { capacity: 50, refillRate: 300, refillIntervalSec: 60 },
  pro: { capacity: 200, refillRate: 1000, refillIntervalSec: 60 },
  enterprise: { capacity: 2000, refillRate: 10000, refillIntervalSec: 60 },
};

async function rateLimitMiddleware(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  const tier = await getTierForApiKey(apiKey);
  const options = TIERS[tier] || TIERS.free;

  const result = await rateLimit(redisClient, apiKey, options);

  res.setHeader("X-RateLimit-Limit", options.refillRate);
  res.setHeader("X-RateLimit-Remaining", result.remaining);
  res.setHeader("X-RateLimit-Policy", `${tier};w=${options.refillIntervalSec}`);

  if (!result.allowed) {
    res.setHeader("Retry-After", result.retryAfter);
    return res.status(429).json({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Rate limit exceeded. Retry after the specified delay.",
        retryAfter: result.retryAfter,
      },
    });
  }

  next();
}
```

### Python Implementation with Redis

```python
import time
import redis

def rate_limit(redis_client, key, capacity, refill_rate, interval_sec):
    bucket_key = f"ratelimit:{key}"
    now = time.time()

    pipe = redis_client.pipeline()
    pipe.hgetall(bucketKey)
    pipe.hset(bucketKey, tokens=capacity, lastRefill=now)
    pipe.expire(bucketKey, interval_sec * 2)
    results = pipe.execute()

    bucket = results[0]
    tokens = float(bucket.get(b"tokens", capacity))
    last_refill = float(bucket.get(b"lastRefill", now))

    elapsed = now - last_refill
    refill_amount = elapsed * (capacity / interval_sec)
    tokens = min(capacity, tokens + refill_amount)

    if tokens >= 1:
        tokens -= 1
        redis_client.hset(bucketKey, tokens=tokens, lastRefill=now)
        return {"allowed": True, "remaining": int(tokens)}
    else:
        retry_after = int((1 - tokens) / (capacity / interval_sec)) + 1
        redis_client.hset(bucketKey, tokens=tokens, lastRefill=now)
        return {"allowed": False, "remaining": 0, "retryAfter": retry_after}
```

## Client-Side Retry Pattern

Consumers should implement exponential backoff with jitter when receiving 429 responses:

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    const response = await fetch(url, options);

    if (response.status !== 429) {
      return response;
    }

    const retryAfter = parseInt(response.headers.get("Retry-After") || "1");
    const jitter = Math.random() * 0.5;
    const delay = (retryAfter + jitter) * 1000;

    console.warn(`Rate limited. Retrying in ${delay}ms (attempt ${attempt + 1})`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    attempt++;
  }

  throw new Error(`Max retries (${maxRetries}) exceeded`);
}
```

## Distributed Rate Limiting

For multi-instance deployments, use a shared store (Redis, Memcached) instead of in-memory counters:

| Approach | Pros | Cons |
|----------|------|------|
| In-memory | Fastest, no external dependency | Not shared across instances |
| Redis | Shared state, atomic operations | Network latency, Redis dependency |
| Memcached | Simple, fast | No persistence, less flexible |
| Database | Persistent, queryable | Slow, not suitable for high throughput |

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Public SaaS | Tiered pricing with free tier | Conversion-oriented, limits drive upgrades |
| Internal platform | Per-team quotas with shared pool | Prevents one team from starving others |
| Partner API | Negotiated limits per contract | Limits defined in legal agreements |
| GraphQL API | Query complexity-based limits | Cost = field count, depth, and resolver weight |

## What Works

1. **Return headers on every response** — not just when limits are close
2. **Use a standard algorithm** (token bucket or leaky bucket) — custom logic confuses consumers
3. **Document the reset behavior** — consumers need to know when to retry
4. **Provide bulk endpoints** — one `POST /orders/bulk` is better than 100 `POST /orders`
5. **Monitor 429 rates** — high 429 rates indicate poorly configured limits or consumer abuse
6. **Use Redis for distributed deployments** — in-memory limits are inaccurate with multiple instances
7. **Separate read and write limits** — writes are more expensive and should have tighter limits

## Common Mistakes

1. **Returning 403 instead of 429** — consumers cannot distinguish auth failure from rate limiting
2. **Not documenting the algorithm** — consumers cannot predict when they will be throttled
3. **Inconsistent limits across endpoints** — same key, different rules, consumer confusion
4. **No burst allowance** — legitimate traffic spikes get blocked
5. **Hard limits without escalation** — enterprise clients cannot negotiate higher capacity
6. **Using in-memory counters with multiple instances** — each instance tracks separately, allowing N x the limit
7. **Not returning Retry-After header** — consumers guess when to retry, causing thundering herd
8. **Rate limiting by IP only** — NAT and proxies make IP-based limits unreliable for paid tiers

## Frequently Asked Questions

### What happens if I exceed both per-minute and per-hour limits?

The most restrictive limit applies. If you exceed the per-minute limit, you receive 429 immediately even if hourly quota remains. If you exceed the hourly limit, all requests are blocked until the hour resets.

### Should rate limits be the same for read and write operations?

No. Write operations are more expensive and should have lower limits. Separate limits for `GET` (higher), `POST/PUT/PATCH` (medium), and `DELETE` (lowest) are standard practice.

### How do I test my integration without hitting limits?

Use a dedicated sandbox environment with higher or unlimited limits. Alternatively, mock the API responses in your test suite and verify that you parse the rate limit headers correctly.

### Should I use a fixed window or sliding window?

Fixed windows are simpler and cheaper to implement but allow 2x traffic at window boundaries (a burst at the end of one window plus a burst at the start of the next). Sliding windows are more accurate but require more memory. For most APIs, fixed windows with a burst allowance are sufficient.

### How do I handle rate limiting for GraphQL?

Use query complexity analysis instead of raw request count. Assign a cost to each field based on resolver complexity, then limit total cost per request. Tools like `graphql-cost-analysis` can enforce this.

### What is the difference between rate limiting and throttling?

Rate limiting enforces a maximum request count per time window. Throttling slows down or delays requests that exceed the limit (queueing them). Rate limiting rejects excess requests with 429; throttling makes them wait. Most APIs use rate limiting because it is simpler and gives consumers clear feedback.

### Should I rate limit authenticated and unauthenticated requests differently?

Yes. Unauthenticated requests should have lower limits (or be rejected entirely) to prevent abuse. Authenticated requests can be tied to the consumer's tier and billed accordingly.
