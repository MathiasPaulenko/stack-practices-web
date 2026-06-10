---
contentType: recipes
slug: rate-limiting
title: "Rate Limiting"
description: "How to implement API rate limiting using token bucket, sliding window, and fixed window algorithms across Python, JavaScript, and Java."
metaDescription: "Practical rate limiting examples in Python, JavaScript, and Java. Learn token bucket, sliding window, and fixed window algorithms for API throttling."
difficulty: intermediate
topics:
  - api
tags:
  - rate-limiting
  - throttling
  - token-bucket
  - api
  - python
  - javascript
  - java
  - redis
relatedResources:
  - /recipes/api/middleware
  - /recipes/api/input-validation
  - /recipes/caching
lastUpdated: "2026-06-10"
author: "StackPractices"
seo:
  metaDescription: "Practical rate limiting examples in Python, JavaScript, and Java. Learn token bucket, sliding window, and fixed window algorithms for API throttling."
  keywords:
    - rate limiting
    - api throttling
    - token bucket
    - sliding window
    - fixed window
    - python rate limit
    - javascript rate limit
    - redis rate limit
---

## Overview

Rate limiting controls how many requests a client can make to your API in a given time window. It prevents abuse, ensures fair resource allocation, and protects downstream services from overload.

Common algorithms include fixed window, sliding window, and token bucket. Redis is often used as the shared counter store in distributed systems.

## When to Use

Use this recipe when:

- Protecting public APIs from abuse or DDoS
- Enforcing tiered usage limits (free vs paid plans)
- Preventing brute-force attacks on authentication endpoints
- Managing capacity for resource-intensive operations
- Implementing fair-use policies across users

## Solution

### Python (Token Bucket)

```python
import time
from threading import Lock

class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.tokens = capacity
        self.refill_rate = refill_rate
        self.last_refill = time.time()
        self.lock = Lock()

    def allow(self) -> bool:
        with self.lock:
            now = time.time()
            elapsed = now - self.last_refill
            self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
            self.last_refill = now
            if self.tokens >= 1:
                self.tokens -= 1
                return True
            return False

bucket = TokenBucket(capacity=10, refill_rate=1)
print(bucket.allow())  # True
```

### JavaScript (Fixed Window with Redis)

```javascript
const redis = require('redis');
const client = redis.createClient();

async function rateLimit(key, limit, windowSeconds) {
  const windowKey = `${key}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
  const current = await client.incr(windowKey);
  if (current === 1) {
    await client.expire(windowKey, windowSeconds);
  }
  return current <= limit;
}

// Usage in Express middleware
async function limiter(req, res, next) {
  const key = `ratelimit:${req.ip}`;
  const allowed = await rateLimit(key, 100, 60);
  if (!allowed) return res.status(429).json({ error: 'Too many requests' });
  next();
}
```

### Java (Sliding Window)

```java
import java.util.concurrent.*;

public class SlidingWindow {
    private final int capacity;
    private final long windowMs;
    private final ConcurrentLinkedDeque<Long> timestamps = new ConcurrentLinkedDeque<>();

    public SlidingWindow(int capacity, long windowMs) {
        this.capacity = capacity;
        this.windowMs = windowMs;
    }

    public synchronized boolean allow() {
        long now = System.currentTimeMillis();
        while (!timestamps.isEmpty() && now - timestamps.peekFirst() > windowMs) {
            timestamps.pollFirst();
        }
        if (timestamps.size() < capacity) {
            timestamps.addLast(now);
            return true;
        }
        return false;
    }
}
```

## Algorithm Comparison

| Algorithm | Pros | Cons | Best For |
|-----------|------|------|----------|
| **Fixed Window** | Simple, low memory | Burst at window boundary | Basic protection |
| **Sliding Window** | Smooth rate, no bursts | Higher memory/compute | Precise rate control |
| **Token Bucket** | Allows bursts up to capacity | Complex to implement correctly | APIs with burst tolerance |
| **Leaky Bucket** | Strict constant output rate | Can drop requests | Downstream protection |

## Best Practices

- **Return 429 status** with `Retry-After` header when rate limited
- **Use Redis** for distributed rate limiting across multiple servers
- **Differentiate by client**: Use API key or user ID, not just IP
- **Set higher limits for authenticated users** than anonymous traffic
- **Log rate limit events** for security monitoring and abuse detection
- **Gradual backoff**: Inform clients when they can retry instead of hard blocks

## Common Mistakes

- Rate limiting by IP only, punishing shared NAT users
- Not handling Redis failures gracefully (fail open vs fail closed)
- Using in-memory counters in multi-instance deployments
- Setting limits too aggressively, blocking legitimate users
- Not documenting rate limits in API documentation

## Frequently Asked Questions

**Q: Should I rate limit at the edge or in the application?**
A: Both. Use edge/CDN (Cloudflare, AWS WAF) for DDoS protection and application-level limits for business logic.

**Q: What HTTP status code should I return when rate limited?**
A: `429 Too Many Requests`. Include a `Retry-After` header with the number of seconds to wait.

**Q: How do I rate limit without Redis in a distributed system?**
A: Use sticky sessions (not ideal), or implement a centralized counter with your existing database (slower but functional).
