---
contentType: recipes
slug: rate-limiting-security
title: "Implement Rate Limiting for APIs and Web Applications"
description: "How to protect APIs and web endpoints from abuse using token bucket, sliding window, and fixed window rate limiting strategies with Redis and in-memory implementations."
metaDescription: "Learn API rate limiting strategies. Protect endpoints from abuse using token bucket, sliding window, and fixed window with Redis and in-memory implementations."
difficulty: intermediate
topics:
  - security
tags:
  - rate-limiting
  - api-gateway
  - redis
  - token-bucket
  - sliding-window
  - throttling
  - ddos-protection
  - security
relatedResources:
  - /recipes/api-security-headers
  - /recipes/csrf-protection
  - /recipes/api-contract-testing
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn API rate limiting strategies. Protect endpoints from abuse using token bucket, sliding window, and fixed window with Redis and in-memory implementations."
  keywords:
    - rate limiting
    - api throttling
    - token bucket
    - sliding window
    - redis rate limit
---

## Overview

Rate limiting is a defensive technique that controls how many requests a client can make to an API or web endpoint within a given time window. Without rate limiting, a single misbehaving client — whether malicious or accidentally buggy — can exhaust backend resources, starve legitimate users, and trigger cascading failures across distributed systems.

Effective rate limiting is implemented at multiple layers: API gateway (edge), application middleware (service), and database (query throttling). Each layer uses different algorithms suited to different trade-offs. Token bucket allows bursts, sliding window provides precision, and fixed window is simple but vulnerable to stampede at window boundaries. This recipe covers implementations from in-memory single-node to distributed Redis-backed limiting.

## When to use it

Use this recipe when:

- Protecting public APIs from abuse, scraping, or brute-force attacks
- Throttling expensive operations to prevent backend overload
- Enforcing tiered usage limits for free vs paid API consumers
- Preventing cascading failures during traffic spikes or DDoS events
- Complying with SLA requirements for fair resource allocation

## Solution

### Token Bucket (Python / Redis)

```python
import time
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

def is_allowed(key: str, capacity: int, refill_rate: float) -> bool:
    now = time.time()
    pipe = r.pipeline()
    pipe.hmget(key, ['tokens', 'last_refill'])
    pipe.expire(key, 60)
    result = pipe.execute()

    tokens = float(result[0][0]) if result[0][0] else capacity
    last_refill = float(result[0][1]) if result[0][1] else now

    elapsed = now - last_refill
    tokens = min(capacity, tokens + elapsed * refill_rate)

    if tokens >= 1:
        tokens -= 1
        r.hmset(key, {'tokens': tokens, 'last_refill': now})
        r.expire(key, 60)
        return True
    else:
        r.hmset(key, {'tokens': tokens, 'last_refill': last_refill})
        r.expire(key, 60)
        return False

# Usage
if not is_allowed('user:123', capacity=10, refill_rate=1):
    return Response(status=429, body=b"Rate limit exceeded")
```

### Sliding Window Log (Node.js / In-Memory)

```javascript
const requests = new Map(); // userId -> [timestamps]

function isAllowed(key, limit, windowMs) {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!requests.has(key)) {
    requests.set(key, [now]);
    return true;
  }

  const timestamps = requests.get(key).filter(t => t > windowStart);
  timestamps.push(now);
  requests.set(key, timestamps);

  return timestamps.length <= limit;
}

// Express middleware
function rateLimitMiddleware(req, res, next) {
  const key = req.ip;
  if (!isAllowed(key, 100, 60000)) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
}
```

### Fixed Window (Nginx)

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

server {
  location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://backend;
  }
}
```

## Explanation

- **Token bucket**: a bucket holds a fixed number of tokens. Each request consumes one token. Tokens refill at a constant rate. This allows controlled bursts while enforcing an average rate over time. Ideal for APIs that tolerate short spikes.
- **Sliding window log**: stores a log of request timestamps per client. On each request, prune entries outside the current window and count the remainder. Most accurate but memory-intensive at high scale.
- **Fixed window**: divides time into discrete windows (e.g., 1-minute buckets). A counter increments per window. Simple and memory-efficient, but a burst at the window boundary counts twice (once at the end of one window, once at the start of the next).
- **Distributed limiting**: in-memory counters are fast but fail across multiple server instances. Redis provides a shared state with atomic operations (`INCR`, `EXPIRE`, Lua scripts) for distributed rate limiting.

## Variants

| Algorithm | Burst tolerance | Memory use | Distributed | Best for |
|-----------|----------------|------------|-------------|----------|
| Token bucket | Yes | Low | Redis | APIs with burst tolerance |
| Sliding window | No | High | Redis | Strict per-second limits |
| Fixed window | No | Very low | Redis | Simple rate ceilings |
| Leaky bucket | Yes (smoothed) | Low | Hard | Traffic shaping |

## Best practices

- **Return 429 with `Retry-After`**: when a client hits a limit, respond with HTTP 429 and include a `Retry-After` header indicating when they can retry. This helps well-behaved clients back off automatically.
- **Use different limits per endpoint**: authentication endpoints should be stricter (5 attempts/minute) than read-only data endpoints (100 requests/minute). Tailor limits to the cost and sensitivity of each operation.
- **Identify clients correctly**: rate limit by authenticated user ID when available, not just IP address. Shared NATs and VPNs can cause false positives when limiting by IP alone.
- **Implement tiered limits**: free users get 100 requests/hour, paid users get 10,000. Store tier configuration alongside user profiles and apply dynamically in middleware.
- **Monitor rejected requests**: a sudden spike in 429 responses may indicate an attack or a client bug. Alert on rate-limiting events via your monitoring stack.

## Common mistakes

- **Not handling clock skew**: distributed systems with clock drift may miscalculate window boundaries. Use monotonic clocks where available and tolerate small offsets.
- **Rate limiting only at the edge**: edge gateways catch most abuse, but a compromised internal service can still overwhelm downstream databases. Apply limits at multiple layers.
- **Blocking legitimate users after one burst**: a user who legitimately triggers a burst (e.g., paginating through results) should not be permanently blocked. Use token bucket or sliding window, not hard cutoffs.
- **Forgetting to clean up Redis keys**: in sliding window implementations, old timestamps accumulate indefinitely. Set TTLs on Redis keys to auto-expire stale data.

## FAQ

**Q: What is the difference between rate limiting and throttling?**
A: Rate limiting rejects requests that exceed a threshold (HTTP 429). Throttling slows down request processing instead of rejecting it. Both control traffic but with different user experiences.

**Q: How do I rate limit across multiple servers?**
A: Use a shared data store like Redis with atomic increment operations. Avoid in-memory counters in multi-node deployments because each node maintains its own independent count.

**Q: Can rate limiting prevent DDoS attacks?**
A: Basic rate limiting helps against application-layer (L7) DDoS but cannot stop volumetric network floods (L3/L4). Combine rate limiting with CDN DDoS protection and WAF rules.

**Q: Should I rate limit authenticated and unauthenticated users differently?**
A: Yes. Authenticated users should be limited by user ID and given higher quotas. Unauthenticated users should be limited by IP with stricter thresholds to prevent anonymous abuse.

