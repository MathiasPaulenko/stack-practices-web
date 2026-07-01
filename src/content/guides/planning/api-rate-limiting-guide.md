---
contentType: guides
slug: api-rate-limiting-guide
title: "API Rate Limiting — Design Fair and Useful Throttling"
description: "A practical guide to API rate limiting: token bucket, leaky bucket, sliding window algorithms, choosing limits, and implementing resilient throttling for APIs."
metaDescription: "Learn API rate limiting design: token bucket, leaky bucket, sliding window, and choosing fair limits for resilient APIs."
difficulty: intermediate
topics:
  - api
  - performance
  - devops
tags:
  - rate-limiting
  - throttling
  - api-gateway
  - token-bucket
  - sliding-window
  - leaky-bucket
  - resilience
  - guide
relatedResources:
  - /guides/api/rest-api-design-guide
  - /guides/architecture/api-gateway-design-guide
  - /guides/security/api-security-checklist-guide
  - /guides/performance/performance-optimization-guide
  - /guides/devops/sre-practices-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn API rate limiting design: token bucket, leaky bucket, sliding window, and choosing fair limits for resilient APIs."
  keywords:
    - rate-limiting
    - throttling
    - api-gateway
    - token-bucket
    - sliding-window
    - leaky-bucket
    - resilience
    - guide
---

## Overview

Rate limiting controls the number of API requests a client can make in a given time period. It protects your backend from overload, ensures fair resource sharing, and prevents abuse. Well-designed rate limits balance user experience with system protection.

This guide covers rate limiting algorithms, implementation strategies, and choosing appropriate limits.

## When to Use

- Your API is public-facing and could be abused by malicious actors
- You have limited backend capacity and need to prevent overload
- You offer tiered service levels (free, pro, enterprise)
- You want to prevent cascading failures during traffic spikes
- You need to comply with partner API consumption agreements

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Rate Limit** | Maximum requests allowed per time window |
| **Quota** | Total allowance over a longer period (e.g., monthly API calls) |
| **Throttling** | Delaying or rejecting requests that exceed limits |
| **Burst** | Short-term allowance above steady-state rate |
| **Window** | Time period over which limits are enforced |
| **Client Identity** | How callers are identified (IP, API key, user ID, org ID) |

## Rate Limiting Algorithms

### Token Bucket

Allows bursts up to bucket capacity while maintaining average rate:

```python
import time
from threading import Lock

class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity      # Maximum burst size
        self.tokens = capacity        # Current tokens available
        self.refill_rate = refill_rate  # Tokens added per second
        self.last_refill = time.time()
        self.lock = Lock()

    def allow_request(self, tokens: int = 1) -> bool:
        with self.lock:
            now = time.time()
            elapsed = now - self.last_refill
            self.tokens = min(
                self.capacity,
                self.tokens + elapsed * self.refill_rate
            )
            self.last_refill = now

            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False

# Example: 10 requests/second with burst of 20
bucket = TokenBucket(capacity=20, refill_rate=10)
```

**Best for:** APIs that need burst tolerance (e.g., user-facing APIs with sporadic traffic).

### Leaky Bucket

Smooths out bursts into a steady flow rate:

```python
import time
from collections import deque
from threading import Lock

class LeakyBucket:
    def __init__(self, capacity: int, leak_rate: float):
        self.capacity = capacity    # Maximum queue size
        self.leak_rate = leak_rate  # Requests processed per second
        self.queue = deque()
        self.last_leak = time.time()
        self.lock = Lock()

    def allow_request(self) -> bool:
        with self.lock:
            now = time.time()
            elapsed = now - self.last_leak
            # Remove processed requests from queue
            to_leak = int(elapsed * self.leak_rate)
            for _ in range(min(to_leak, len(self.queue))):
                self.queue.popleft()
            self.last_leak = now

            if len(self.queue) < self.capacity:
                self.queue.append(now)
                return True
            return False
```

**Best for:** Webhooks, processing pipelines, and situations requiring strict rate smoothing.

### Sliding Window Log

Most accurate but memory-intensive:

```python
import time
from collections import deque
from threading import Lock

class SlidingWindowLog:
    def __init__(self, window_size: int, max_requests: int):
        self.window_size = window_size  # Seconds
        self.max_requests = max_requests
        self.requests = deque()
        self.lock = Lock()

    def allow_request(self) -> bool:
        with self.lock:
            now = time.time()
            cutoff = now - self.window_size

            # Remove requests outside the window
            while self.requests and self.requests[0] < cutoff:
                self.requests.popleft()

            if len(self.requests) < self.max_requests:
                self.requests.append(now)
                return True
            return False
```

**Best for:** Strict compliance requirements where exact enforcement matters.

### Sliding Window Counter

Approximation with better memory efficiency:

```python
import math
import time
from threading import Lock

class SlidingWindowCounter:
    def __init__(self, window_size: int, max_requests: int):
        self.window_size = window_size
        self.max_requests = max_requests
        self.current_window = int(time.time() // window_size)
        self.current_count = 0
        self.previous_count = 0
        self.lock = Lock()

    def allow_request(self) -> bool:
        with self.lock:
            now = int(time.time())
            window = now // self.window_size

            if window != self.current_window:
                self.previous_count = self.current_count
                self.current_count = 0
                self.current_window = window

            # Estimate requests in sliding window
            elapsed = now % self.window_size
            weight = 1 - (elapsed / self.window_size)
            estimated = (self.previous_count * weight) + self.current_count

            if estimated < self.max_requests:
                self.current_count += 1
                return True
            return False
```

**Best for:** High-traffic APIs where memory efficiency is important.

## Choosing Rate Limits

### Factors to Consider

| Factor | Guideline |
|--------|-----------|
| **Endpoint cost** | Expensive endpoints (ML, reports) get lower limits |
| **User tier** | Free: 100/hr, Pro: 10,000/hr, Enterprise: custom |
| **Resource constraints** | Limit based on backend capacity, not arbitrary numbers |
| **Fairness** | Per-user limits prevent one client from starving others |
| **Business value** | Protect revenue-generating endpoints most strictly |

### Example Tiered Limits

```yaml
# Example: Tiered rate limits for a SaaS API
tiers:
  free:
    requests_per_minute: 60
    requests_per_hour: 1000
    requests_per_day: 10000
    burst: 10
  pro:
    requests_per_minute: 600
    requests_per_hour: 10000
    requests_per_day: 100000
    burst: 100
  enterprise:
    requests_per_minute: 6000
    requests_per_hour: 100000
    requests_per_day: 1000000
    burst: 1000
```

## Implementation Strategies

### Gateway-Level Rate Limiting

Enforce limits at the API gateway for centralized control:

```nginx
# Example: NGINX rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $api_key zone=pro:10m rate=100r/s;

server {
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://backend;
    }
}
```

### Application-Level Rate Limiting

Fine-grained control within your application:

```python
from fastapi import FastAPI, HTTPException, Request
from fastapi_limiter import FastAPILimiter
import redis.asyncio as redis

app = FastAPI()

@app.on_event("startup")
async def startup():
    app.state.redis = await redis.from_url("redis://localhost")
    await FastAPILimiter.init(app.state.redis)

@app.get("/api/data")
async def get_data(request: Request):
    # Rate limit: 100 requests per minute per API key
    key = request.headers.get("X-API-Key", request.client.host)
    if not await check_rate_limit(key, max_requests=100, window=60):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Try again later."
        )
    return {"data": "..."}
```

### Distributed Rate Limiting

Share state across multiple instances:

```python
# Redis-based distributed token bucket
import redis

class RedisTokenBucket:
    def __init__(self, redis_client: redis.Redis, key: str, capacity: int, refill_rate: float):
        self.redis = redis_client
        self.key = key
        self.capacity = capacity
        self.refill_rate = refill_rate

    def allow_request(self, tokens: int = 1) -> bool:
        lua_script = """
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local tokens_requested = tonumber(ARGV[3])
        local now = tonumber(ARGV[4])

        local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
        local current_tokens = tonumber(bucket[1]) or capacity
        local last_refill = tonumber(bucket[2]) or now

        local elapsed = now - last_refill
        local new_tokens = math.min(capacity, current_tokens + elapsed * refill_rate)

        if new_tokens >= tokens_requested then
            new_tokens = new_tokens - tokens_requested
            redis.call('HMSET', key, 'tokens', new_tokens, 'last_refill', now)
            redis.call('EXPIRE', key, 60)
            return 1
        else
            redis.call('HMSET', key, 'tokens', new_tokens, 'last_refill', now)
            redis.call('EXPIRE', key, 60)
            return 0
        end
        """
        return self.redis.eval(
            lua_script, 1, self.key,
            self.capacity, self.refill_rate, tokens, time.time()
        ) == 1
```

## HTTP Response Headers

Communicate limits clearly to clients:

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Maximum requests allowed | `100` |
| `X-RateLimit-Remaining` | Requests remaining in window | `42` |
| `X-RateLimit-Reset` | Unix timestamp when limit resets | `1704067200` |
| `Retry-After` | Seconds to wait before retrying | `60` |

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704067200
Retry-After: 60

{
  "error": "Rate limit exceeded",
  "message": "You have exceeded 100 requests per minute. Retry after 60 seconds.",
  "retry_after": 60
}
```

## What Works

- **Return informative error messages.** Tell clients exactly what limit they hit and when they can retry.
- **Use different limits per endpoint.** Search endpoints may tolerate higher limits than write endpoints.
- **Implement exponential backoff on clients.** 429 responses should trigger backoff, not immediate retries.
- **Monitor rate limit hits.** Sudden spikes in 429s may indicate attacks or integration issues.
- **Allow grace periods for new clients.** Start with generous limits and tighten based on usage patterns.
- **Document limits clearly.** Publish rate limits in your API documentation.

## Common Mistakes

- **Using IP addresses as the only identifier.** NAT and mobile networks share IPs; use API keys or user IDs.
- **Noisy neighbor problems.** One heavy user should not impact others; enforce per-client limits.
- **Ignoring burst traffic.** Legitimate users may burst during page loads; allow short bursts.
- **Inconsistent limits across services.** Standardize limits by tier and endpoint type.
- **Forgetting to handle edge cases.** What happens when the rate limit store (Redis) is down?

## Variants

- **Concurrency limiting:** Limit simultaneous in-flight requests rather than rate over time.
- **Adaptive rate limiting:** Dynamically adjust limits based on backend health (lower limits when overloaded).
- **Geographic rate limiting:** Apply different limits based on client location or regulatory requirements.
- **Cost-based throttling:** Limit expensive operations (ML inference, report generation) more strictly.

## FAQ

**Q: What is a good default rate limit for a public API?**
Start with 100 requests per minute per user, then adjust based on actual usage and backend capacity.

**Q: How do I handle rate limiting in a microservices architecture?**
Enforce at the API gateway for external traffic and use service mesh (Istio, Linkerd) for internal limits.

**Q: Should I rate limit authenticated and unauthenticated traffic differently?**
Yes. Authenticated users get higher, personalized limits. Unauthenticated traffic gets stricter, IP-based limits.

**Q: How do I prevent abuse while not impacting legitimate users?**
Use progressive penalties (warnings → temporary blocks → permanent bans) and allow appeal/review.

## Conclusion

Proper rate limiting protects your infrastructure, ensures fairness, and maintains API reliability. Choose the right algorithm, set sensible limits, communicate clearly with clients, and monitor continuously.
