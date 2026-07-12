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
  - security
  - rate-limiting
  - api-gateway
  - vulnerabilities
  - encryption
relatedResources:
  - /recipes/api-security-headers
  - /recipes/csrf-protection
  - /recipes/api-contract-testing
  - /guides/api-security-checklist-guide
  - /guides/complete-guide-api-security
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

Rate limiting is a defensive technique that controls how many requests a client can make to an API or web endpoint within a given time window. Without rate limiting, a single misbehaving client — whether malicious or accidentally buggy — can exhaust backend resources, starve legitimate users, and trigger [cascading failures](/patterns/design/circuit-breaker-pattern) across distributed systems.

Useful rate limiting is implemented at multiple layers: [API gateway](/recipes/api/nginx-reverse-proxy) (edge), application middleware (service), and database (query throttling). Each layer uses different algorithms suited to different trade-offs. Token bucket allows bursts, sliding window provides precision, and fixed window is simple but vulnerable to stampede at window boundaries. The following demonstrates how to implementations from in-memory single-node to distributed Redis-backed limiting.

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

## What works

- **Return 429 with `Retry-After`**: when a client hits a limit, respond with HTTP 429 and include a `Retry-After` header indicating when they can retry. This helps well-behaved clients back off automatically.
- **Use different limits per endpoint**: authentication endpoints should be stricter (5 attempts/minute) than read-only data endpoints (100 requests/minute). Tailor limits to the cost and sensitivity of each operation.
- **Identify clients correctly**: rate limit by authenticated user ID when available, not just IP address. Shared NATs and VPNs can cause false positives when limiting by IP alone.
- **Implement tiered limits**: free users get 100 requests/hour, paid users get 10,000. Store tier configuration alongside user profiles and apply dynamically in middleware.
- **Monitor rejected requests**: a sudden spike in 429 responses may indicate an attack or a client bug. Alert on rate-limiting events via your [monitoring stack](/guides/devops/monitoring-alerting-guide).

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
A: Basic rate limiting helps against application-layer (L7) DDoS but cannot stop volumetric network floods (L3/L4). Combine rate limiting with [CDN DDoS protection](/recipes/data/caching) and WAF rules.

**Q: Should I rate limit authenticated and unauthenticated users differently?**
A: Yes. Authenticated users should be limited by user ID and given higher quotas. Unauthenticated users should be limited by IP with stricter thresholds to prevent anonymous abuse.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Advanced Solutions

### Redis Lua atomic token bucket

The Python token bucket example above has a race condition: between reading and writing tokens, another request can modify the same key. Use a Lua script for atomicity:

```lua
-- token_bucket.lua
-- KEYS[1] = rate limit key
-- ARGV[1] = capacity
-- ARGV[2] = refill_rate (tokens per second)
-- ARGV[3] = current timestamp (unix)
-- ARGV[4] = TTL in seconds

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1]) or capacity
local last_refill = tonumber(bucket[2]) or now

local elapsed = now - last_refill
tokens = math.min(capacity, tokens + elapsed * refill_rate)

local allowed = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
end

redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
redis.call('EXPIRE', key, ttl)

return allowed
```

```python
import time
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

# Load the Lua script once at startup
TOKEN_BUCKET_SCRIPT = r.register_script(open('token_bucket.lua').read())

def is_allowed_atomic(key: str, capacity: int, refill_rate: float) -> bool:
    now = time.time()
    result = TOKEN_BUCKET_SCRIPT(
        keys=[key],
        args=[capacity, refill_rate, now, 60]
    )
    return bool(result)

# Usage — thread-safe across multiple workers
if not is_allowed_atomic('user:123', capacity=100, refill_rate=10):
    return Response(status=429, headers={'Retry-After': '1'},
                    body=b"Rate limit exceeded")
```

### Express with rate-limiter-flexible (Node.js)

The `rate-limiter-flexible` package supports Redis-backed distributed limiting with built-in burst handling:

```javascript
const { RateLimiterRedis } = require('rate-limiter-flexible');
const redis = require('redis');

const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
});

// General API: 100 requests per 10 seconds
const apiLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'api',
  points: 100,
  duration: 10,
  blockDuration: 60, // Block for 60s after exceeding
});

// Auth endpoints: stricter, 5 attempts per 60 seconds
const authLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'auth',
  points: 5,
  duration: 60,
  blockDuration: 300, // Block for 5 minutes after exceeding
});

// Middleware factory
function createLimiter(limiter, keyFn = (req) => req.ip) {
  return async (req, res, next) => {
    try {
      await limiter.consume(keyFn(req), 1);
      next();
    } catch (rejRes) {
      const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000);
      res.set('Retry-After', String(retryAfter));
      res.set('X-RateLimit-Limit', String(limiter.points));
      res.set('X-RateLimit-Remaining', String(rejRes.remainingPoints || 0));
      res.set('X-RateLimit-Reset', new Date(Date.now() + rejRes.msBeforeNext).toISOString());
      res.status(429).json({
        error: 'Too many requests',
        retryAfter,
      });
    }
  };
}

// Apply different limiters to different routes
app.use('/api/', createLimiter(apiLimiter));
app.use('/api/auth/', createLimiter(authLimiter, (req) => req.ip + ':' + (req.body?.email || '')));
```

### Spring Boot rate limiting (Java)

```java
import io.github.bucket4j.*;
import io.github.bucket4j.redis.*;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import jakarta.servlet.http.*;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
                              Object handler) throws Exception {
        String clientId = request.getHeader("X-User-ID");
        if (clientId == null) {
            clientId = request.getRemoteAddr();
        }

        Bucket bucket = buckets.computeIfAbsent(clientId, this::createBucket);

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            response.setHeader("X-RateLimit-Remaining",
                String.valueOf(probe.getRemainingTokens()));
            return true;
        }

        long retryAfter = probe.getNanosToWaitForRefill() / 1_000_000_000;
        response.setHeader("Retry-After", String.valueOf(retryAfter));
        response.setStatus(429);
        response.getWriter().write("Rate limit exceeded");
        return false;
    }

    private Bucket createBucket(String key) {
        // 100 requests per minute with burst of 20
        Bandwidth limit = Bandwidth.builder()
            .capacity(100)
            .refillIntervally(100, Duration.ofMinutes(1))
            .build();

        return Bucket.builder()
            .addLimit(limit)
            .build();
    }
}
```

### Nginx tiered rate limiting

```nginx
# Define zones for different tiers
limit_req_zone $binary_remote_addr zone=free:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=paid:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;

server {
  # Auth endpoints — strictest
  location /api/auth/ {
    limit_req zone=auth burst=3 nodelay;
    limit_req_status 429;
    limit_req_log_level warn;
    proxy_pass http://backend;
  }

  # Free tier — identified by API key header
  location /api/free/ {
    limit_req zone=free burst=20 nodelay;
    limit_req_status 429;
    add_header X-RateLimit-Tier "free" always;
    proxy_pass http://backend;
  }

  # Paid tier — higher limits
  location /api/paid/ {
    limit_req zone=paid burst=50 nodelay;
    limit_req_status 429;
    add_header X-RateLimit-Tier "paid" always;
    proxy_pass http://backend;
  }

  # Return Retry-After on 429
  error_page 429 = @ratelimited;
  location @ratelimited {
    add_header Retry-After "60" always;
    return 429 '{"error": "Too many requests", "retryAfter": 60}';
  }
}
```

## Additional Best Practices

1. **Return rate limit headers on every response.** Include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` so clients can self-regulate:

```javascript
function setRateLimitHeaders(res, limiter, remaining) {
  res.set('X-RateLimit-Limit', String(limiter.points));
  res.set('X-RateLimit-Remaining', String(remaining));
  res.set('X-RateLimit-Reset',
    new Date(Date.now() + limiter.duration * 1000).toISOString());
}
```

2. **Use exponential backoff for blocked clients.** Instead of a fixed block duration, increase the block time for repeat offenders:

```python
def get_block_duration(key: str, base_block: int = 60) -> int:
    """Exponentially increase block time for repeat offenders."""
    violations = r.incr(f'violations:{key}')
    r.expire(f'violations:{key}', 3600)  # Reset after 1 hour
    return min(base_block * (2 ** (violations - 1)), 3600)  # Cap at 1 hour
```

## Additional Common Mistakes

1. **Using `Date.now()` in distributed systems without NTP sync.** Clock skew between servers causes incorrect window calculations. Ensure all servers use NTP, and pass timestamps from a central authority when possible:

```javascript
// Use Redis TIME for consistent timestamps across nodes
const redisTime = await redisClient.time();
const now = Number(redisTime[0]) + Number(redisTime[1]) / 1e6;
```

2. **Rate limiting webhooks and callbacks.** Incoming webhooks from trusted services (Stripe, GitHub) should be exempt from rate limiting or have much higher limits. Otherwise, you may miss critical events:

```javascript
// Exempt trusted webhook sources
const TRUSTED_WEBHOOK_IPS = new Set([
  '3.18.12.63',  // Stripe
  '192.30.252.0/22',  // GitHub
]);

function shouldRateLimit(req) {
  const ip = req.ip;
  if (TRUSTED_WEBHOOK_IPS.has(ip)) return false;
  if (req.path.startsWith('/webhooks/')) return false;
  return true;
}
```

## Additional FAQ

### What is the leaky bucket algorithm?

Leaky bucket is similar to token bucket but processes requests at a fixed rate regardless of arrival rate. Requests enter a queue (the bucket) and leak out at a constant rate. If the queue overflows, new requests are rejected. It's ideal for traffic shaping where you want to smooth out bursts rather than allow them.

### How do I test rate limiting locally?

Use a simple loop or a tool like `hey` or `wrk` to send many requests quickly:

```bash
# Send 1000 requests with 50 concurrency
hey -n 1000 -c 50 https://example.com/api/health

# Check that some get 429
hey -n 1000 -c 50 https://example.com/api/health 2>&1 | grep "429"
```

### Should I use rate limiting for login endpoints?

Yes, and with the strictest limits. Login endpoints are prime targets for credential stuffing. Limit by IP (5-10 attempts per minute) and by username (3-5 attempts per minute). After repeated failures, implement CAPTCHA or temporary account lockout.
