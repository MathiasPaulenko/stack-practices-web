---
contentType: patterns
slug: throttling-pattern
title: "Throttling Pattern"
description: "Limit the rate at which a system processes requests or consumes resources to prevent overload, ensure fair usage, and maintain predictable performance under varying load."
metaDescription: "Learn the Throttling Pattern for rate limiting resource consumption. Examples in Python, Java, and JavaScript with token bucket, leaky bucket, and fixed windows."
difficulty: intermediate
topics:
  - design
  - architecture
  - performance
tags:
  - throttling
  - pattern
  - design-pattern
  - rate-limiting
  - performance
  - token-bucket
  - leaky-bucket
  - scalability
relatedResources:
  - /patterns/design/priority-queue-pattern
  - /patterns/design/queue-based-load-leveling-pattern
  - /patterns/design/circuit-breaker-pattern
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Learn the Throttling Pattern for rate limiting resource consumption. Examples in Python, Java, and JavaScript with token bucket, leaky bucket, and fixed windows."
  keywords:
    - throttling
    - design pattern
    - rate limiting
    - performance
    - token bucket
    - leaky bucket
    - scalability
---

# Throttling Pattern

## Overview

The Throttling Pattern controls the rate at which a system processes requests or consumes resources to prevent overload and ensure fair resource allocation. Instead of accepting all incoming requests immediately, the system limits the rate based on capacity, user tiers, or resource availability.

Throttling prevents cascading failures by ensuring downstream services and shared resources are not overwhelmed. It is commonly used in APIs, message consumers, database connections, and third-party integrations where unbounded throughput could cause service degradation or cost explosion.

## When to Use

- Protecting downstream services from traffic spikes
- Enforcing API rate limits for consumers
- Controlling database connection pool exhaustion
- Managing costs with metered third-party APIs
- Ensuring fair resource allocation in multi-tenant systems
- Preventing DDoS or accidental abuse

## When to Avoid

- Internal services within the same trust boundary with predictable load
- Systems where any request rejection violates business requirements
- When the bottleneck is not request rate but data size or complexity
- Latency-sensitive paths where throttling adds unacceptable delay

## Solution

### Python (Token Bucket)

```python
import time
import threading
from dataclasses import dataclass

@dataclass
class TokenBucket:
    capacity: int
    refill_rate: float
    tokens: float = 0
    last_refill: float = 0
    lock: threading.Lock = None

    def __post_init__(self):
        self.tokens = self.capacity
        self.last_refill = time.time()
        self.lock = threading.Lock()

    def acquire(self, tokens: int = 1) -> bool:
        with self.lock:
            now = time.time()
            elapsed = now - self.last_refill
            self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
            self.last_refill = now

            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False

class ThrottledAPI:
    def __init__(self):
        self.bucket = TokenBucket(capacity=10, refill_rate=2)

    def call(self, endpoint: str, data: dict) -> dict:
        if not self.bucket.acquire():
            raise RateLimitExceeded("Rate limit exceeded. Try again later.")

        # Process request
        return {"status": "success", "endpoint": endpoint}

class RateLimitExceeded(Exception):
    pass
```

### Java (Guava RateLimiter)

```java
import com.google.common.util.concurrent.RateLimiter;
import org.springframework.stereotype.Service;

@Service
public class ThrottledService {
    private final RateLimiter limiter = RateLimiter.create(10.0); // 10 permits/second

    public String processRequest(String request) {
        limiter.acquire(); // Blocks until permit available
        return "Processed: " + request;
    }
}
```

### JavaScript (Sliding Window Log)

```javascript
class SlidingWindowThrottle {
    constructor(windowMs, maxRequests) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
        this.requests = new Map();
    }

    isAllowed(clientId) {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        if (!this.requests.has(clientId)) {
            this.requests.set(clientId, []);
        }

        const clientRequests = this.requests.get(clientId);
        const recent = clientRequests.filter(t => t > windowStart);

        if (recent.length < this.maxRequests) {
            recent.push(now);
            this.requests.set(clientId, recent);
            return true;
        }

        this.requests.set(clientId, recent);
        return false;
    }
}
```

## Explanation

Throttling algorithms balance fairness and efficiency:

- **Token bucket:** Tokens are added at a fixed rate. Requests consume tokens. Allows short bursts while maintaining long-term average rate.
- **Leaky bucket:** Requests enter a fixed-size queue and leak out at a constant rate. Smooths traffic but drops overflow.
- **Fixed window:** Count requests in time windows. Simple but allows burst at window boundaries.
- **Sliding window:** More accurate by tracking exact timestamps within a rolling window.

## Variants

| Variant | Behavior | Best For |
|---------|----------|----------|
| Token bucket | Bursts allowed up to capacity | APIs needing burst tolerance |
| Leaky bucket | Constant outflow rate | Smoothing traffic to downstream |
| Fixed window | Reset counter per interval | Simple implementations |
| Sliding window | Rolling time window | Accurate per-client rate limits |

## What Works

- Return `429 Too Many Requests` with `Retry-After` header for HTTP APIs
- Differentiate between user tiers with different limits
- Monitor rejection rates as an early warning signal
- Implement backoff for clients that are throttled
- Consider distributed rate limiting for multi-instance deployments

## Common Mistakes

- Throttling without communicating limits to clients
- Using same limits for all users regardless of tier
- Not handling clock skew in distributed systems
- Forgetting to clean up expired entries in window-based algorithms

## Real-World Examples

### GitHub API

GitHub enforces rate limits per authenticated user (5000 requests/hour) and per IP (60 requests/hour). Exceeding limits returns `403` with `X-RateLimit-Reset` header.

### AWS API Gateway

API Gateway supports throttling at account, stage, and method levels using token bucket algorithms, with burst capacity for traffic spikes.

## Frequently Asked Questions

**Q: What is the difference between throttling and backpressure?**
A: Throttling rejects or delays requests at the entry point. Backpressure signals upstream to slow down production. They are often used together.

**Q: How do I throttle across multiple servers?**
A: Use a shared store (Redis) to maintain token counts or request logs across instances.

**Q: Should I queue or reject throttled requests?**
A: For user-facing APIs, reject with 429. For background processing, queue with visible delay.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.


## Advanced Topics

### Scenario: Throttling for Geolocation API

```typescript
// Throttling pattern: max 10 requests per second
class Throttle {
  private requests: number[] = [];
  constructor(private maxRequests: number, private windowMs: number) {}

  canProceed(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < this.windowMs);
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    return false;
  }
  timeUntilNextSlot(): number {
    if (this.requests.length < this.maxRequests) return 0;
    const oldest = this.requests[0];
    return this.windowMs - (Date.now() - oldest);
  }
}

// Usage: Google Maps API (limit 10 req/s)
const throttle = new Throttle(10, 1000);

async function geocode(address: string): Promise<LatLng> {
  if (!throttle.canProceed()) {
    const wait = throttle.timeUntilNextSlot();
    await new Promise(resolve => setTimeout(resolve, wait));
  }
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${address}`);
  return response.json();
}

// Comparison: Throttle vs Rate Limit vs Debounce
  | Pattern | Purpose | Example |
  |---------|---------|---------|
  | Throttle | Max N requests per window | 10 req/s |
  | Rate Limit | Reject if exceeded | 429 Too Many Requests |
  | Debounce | Wait for input to stop | Search autocomplete |
  | Token Bucket | Tokens refill over time | Burst + sustained |
  | Leaky Bucket | Queue with constant output | Smooth bursts |
```

Lessons:
  - Throttle limits request rate: does not reject, waits
  - Rate limit rejects: 429 with Retry-After header
  - Debounce groups calls: waits for inactivity
  - Token bucket allows burst: useful for APIs with quotas
  - Measure actual throughput: do not assume the limit is exact
```

### How do I choose between throttle and rate limit?

Use throttle when the client should wait (e.g: calling external API with limit). Use rate limit when the client should be rejected (e.g: protecting your API from abuse). Throttle is cooperative: the client self-limits. Rate limit is imposed: the server rejects. For public APIs, use rate limit (429 + Retry-After). For internal integrations, throttle is sufficient.














End of document. Review and update quarterly.