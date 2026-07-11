---
contentType: patterns
slug: rate-limiter-token-bucket-pattern
title: "Token Bucket Rate Limiter: Smooth Traffic with Token Buckets"
description: "How to implement token bucket rate limiting for API protection. Covers bucket refill, burst handling, per-key buckets, distributed rate limiting with Redis, and sliding windows."
metaDescription: "Implement token bucket rate limiting for API protection. Learn bucket refill, burst handling, per-key buckets, distributed rate limiting with Redis, and sliding windows."
difficulty: intermediate
topics:
  - architecture
  - api
tags:
  - architecture
  - resilience
  - rate-limiting
  - token-bucket
  - pattern
category: behavioral
relatedResources:
  - /patterns/bulkhead-pattern
  - /patterns/retry-with-jitter-pattern
  - /patterns/circuit-breaker-half-open-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement token bucket rate limiting for API protection. Learn bucket refill, burst handling, per-key buckets, distributed rate limiting with Redis, and sliding windows."
  keywords:
    - architecture
    - resilience
    - rate-limiting
    - token-bucket
    - pattern
---

## Overview

The token bucket rate limiter controls request rate by maintaining a bucket of tokens. Each request consumes one token. Tokens are refilled at a fixed rate. If the bucket is empty, the request is rejected or delayed. The bucket has a capacity, allowing bursts up to the capacity while maintaining an average rate equal to the refill rate. Unlike fixed-window limiters, token buckets allow bursts without resetting at window boundaries. This makes them ideal for API rate limiting where clients occasionally need to burst but should maintain an average rate.

## When to Use

- API rate limiting per client or per API key
- Protecting downstream services from traffic spikes
- Controlling outbound call rate to external APIs
- Multi-tenant systems where each tenant has a rate quota
- Scenarios where bursts should be allowed but average rate controlled

## When NOT to Use

- Strict per-second limits with no burst tolerance (use fixed window)
- When you need exact counts per time period (use sliding window)
- Simple internal throttling where precision doesn't matter

## Solution

### Basic token bucket (Python)

```python
# rate_limiter/token_bucket.py — In-memory token bucket rate limiter
import time
import threading
from collections import defaultdict

class TokenBucket:
    """Single token bucket with configurable rate and capacity."""

    def __init__(self, rate, capacity):
        """
        Args:
            rate: tokens per second (refill rate)
            capacity: max tokens in bucket (burst size)
        """
        self.rate = rate
        self.capacity = capacity
        self._tokens = capacity
        self._last_refill = time.monotonic()
        self._lock = threading.Lock()

    def _refill(self):
        now = time.monotonic()
        elapsed = now - self._last_refill
        new_tokens = elapsed * self.rate
        self._tokens = min(self.capacity, self._tokens + new_tokens)
        self._last_refill = now

    def try_consume(self, tokens=1):
        """Try to consume tokens. Returns True if allowed, False if rejected."""
        with self._lock:
            self._refill()
            if self._tokens >= tokens:
                self._tokens -= tokens
                return True
            return False

    def consume(self, tokens=1, timeout=None):
        """Consume tokens, blocking until available or timeout."""
        while True:
            with self._lock:
                self._refill()
                if self._tokens >= tokens:
                    self._tokens -= tokens
                    return True

            if timeout is not None:
                wait_time = (tokens - self._tokens) / self.rate
                if wait_time > timeout:
                    return False
                timeout -= wait_time
                time.sleep(wait_time)
            else:
                time.sleep(tokens / self.rate)

    @property
    def available_tokens(self):
        with self._lock:
            self._refill()
            return self._tokens


class RateLimiter:
    """Manages per-key token buckets.
    Each API key, user, or IP gets its own bucket."""

    def __init__(self, default_rate=10, default_capacity=20):
        self.default_rate = default_rate
        self.default_capacity = default_capacity
        self._buckets = {}
        self._lock = threading.Lock()

    def configure(self, key, rate, capacity):
        """Configure a custom rate for a specific key."""
        with self._lock:
            self._buckets[key] = TokenBucket(rate, capacity)

    def allow(self, key, tokens=1):
        """Check if request is allowed for the given key."""
        with self._lock:
            if key not in self._buckets:
                self._buckets[key] = TokenBucket(
                    self.default_rate, self.default_capacity
                )
            bucket = self._buckets[key]

        return bucket.try_consume(tokens)

    def get_info(self, key):
        """Get bucket info for a key."""
        with self._lock:
            if key not in self._buckets:
                return None
            bucket = self._buckets[key]

        return {
            "available": bucket.available_tokens,
            "rate": bucket.rate,
            "capacity": bucket.capacity
        }


# Usage
limiter = RateLimiter(default_rate=10, default_capacity=20)

# Custom rate for premium API key
limiter.configure("premium-key", rate=100, capacity=200)

def api_request(api_key):
    if not limiter.allow(api_key):
        return {"error": "Rate limit exceeded"}, 429
    return {"data": "success"}, 200
```

### Distributed token bucket with Redis (Python)

```python
# rate_limiter/redis_token_bucket.py — Distributed rate limiter using Redis
import redis
import time

class RedisTokenBucket:
    """Distributed token bucket using Redis.
    Works across multiple server instances."""

    def __init__(self, redis_url="redis://localhost:6379"):
        self._redis = redis.from_url(redis_url)

    def allow(self, key, rate, capacity, tokens=1):
        """Atomically consume tokens using Redis Lua script.
        Returns (allowed, remaining_tokens, retry_after_seconds)."""
        script = """
        local key = KEYS[1]
        local rate = tonumber(ARGV[1])
        local capacity = tonumber(ARGV[2])
        local tokens_requested = tonumber(ARGV[3])
        local now = tonumber(ARGV[4])
        local ttl = math.ceil(capacity / rate * 2)

        -- Get current bucket state
        local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
        local current_tokens = tonumber(bucket[1]) or capacity
        local last_refill = tonumber(bucket[2]) or now

        -- Refill tokens
        local elapsed = math.max(0, now - last_refill)
        local new_tokens = elapsed * rate
        current_tokens = math.min(capacity, current_tokens + new_tokens)

        -- Try to consume
        local allowed = 0
        if current_tokens >= tokens_requested then
            current_tokens = current_tokens - tokens_requested
            allowed = 1
        end

        -- Save state
        redis.call('HMSET', key, 'tokens', current_tokens, 'last_refill', now)
        redis.call('EXPIRE', key, ttl)

        local retry_after = 0
        if allowed == 0 then
            retry_after = math.ceil((tokens_requested - current_tokens) / rate)
        end

        return {allowed, math.floor(current_tokens), retry_after}
        """

        now = time.time()
        result = self._redis.eval(
            script, 1, f"ratelimit:{key}",
            rate, capacity, tokens, now
        )

        allowed = bool(result[0])
        remaining = int(result[1])
        retry_after = int(result[2])

        return allowed, remaining, retry_after


# Usage — shared across multiple server instances
limiter = RedisTokenBucket("redis://redis:6379")

def handle_request(api_key):
    allowed, remaining, retry_after = limiter.allow(
        api_key, rate=10, capacity=20
    )
    if not allowed:
        return {"error": "Rate limit exceeded",
                "retry_after": retry_after}, 429
    return {"data": "ok", "remaining": remaining}, 200
```

### Java token bucket with Guava

```java
// RateLimiterConfig.java — Java rate limiting with Guava RateLimiter
import com.google.common.util.concurrent.RateLimiter;
import java.util.concurrent.ConcurrentHashMap;

public class ApiRateLimiter {

    private final ConcurrentHashMap<String, RateLimiter> limiters = new ConcurrentHashMap<>();
    private final double defaultRate;

    public ApiRateLimiter(double defaultRate) {
        this.defaultRate = defaultRate;
    }

    public boolean allow(String key) {
        RateLimiter limiter = limiters.computeIfAbsent(
            key, k -> RateLimiter.create(defaultRate)
        );
        return limiter.tryAcquire();
    }

    public boolean allow(String key, int permits) {
        RateLimiter limiter = limiters.computeIfAbsent(
            key, k -> RateLimiter.create(defaultRate)
        );
        return limiter.tryAcquire(permits);
    }

    public void configure(String key, double rate) {
        limiters.put(key, RateLimiter.create(rate));
    }

    public void acquire(String key) {
        RateLimiter limiter = limiters.computeIfAbsent(
            key, k -> RateLimiter.create(defaultRate)
        );
        limiter.acquire(); // Blocks until permit available
    }
}
```

### Express middleware (JavaScript)

```javascript
// rate_limiter/express-middleware.js — Token bucket middleware for Express
const express = require("express");

class TokenBucket {
    constructor(rate, capacity) {
        this.rate = rate;
        this.capacity = capacity;
        this.tokens = capacity;
        this.lastRefill = Date.now();
    }

    tryConsume(tokens = 1) {
        this._refill();
        if (this.tokens >= tokens) {
            this.tokens -= tokens;
            return true;
        }
        return false;
    }

    _refill() {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000;
        this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.rate);
        this.lastRefill = now;
    }

    get available() {
        this._refill();
        return Math.floor(this.tokens);
    }
}

class RateLimiterMiddleware {
    constructor(defaultRate = 10, defaultCapacity = 20) {
        this.defaultRate = defaultRate;
        this.defaultCapacity = defaultCapacity;
        this.buckets = new Map();
    }

    middleware() {
        return (req, res, next) => {
            const key = req.headers["x-api-key"] || req.ip;
            let bucket = this.buckets.get(key);

            if (!bucket) {
                bucket = new TokenBucket(this.defaultRate, this.defaultCapacity);
                this.buckets.set(key, bucket);
            }

            if (bucket.tryConsume(1)) {
                res.setHeader("X-RateLimit-Remaining", bucket.available);
                res.setHeader("X-RateLimit-Limit", this.defaultCapacity);
                next();
            } else {
                res.setHeader("X-RateLimit-Remaining", 0);
                res.setHeader("X-RateLimit-Limit", this.defaultCapacity);
                res.setHeader("Retry-After", 1);
                res.status(429).json({
                    error: "Rate limit exceeded",
                    retryAfter: 1
                });
            }
        };
    }
}

// Usage
const app = express();
const limiter = new RateLimiterMiddleware(10, 20);
app.use("/api/", limiter.middleware());
```

### Sliding window counter (Python)

```python
# rate_limiter/sliding_window.py — Sliding window rate limiter
import time
from collections import defaultdict

class SlidingWindowRateLimiter:
    """Sliding window counter: combines current and previous window.
    More accurate than fixed window, less memory than sliding log."""

    def __init__(self, window_size=60, max_requests=100):
        self.window_size = window_size
        self.max_requests = max_requests
        self._current = defaultdict(int)
        self._previous = defaultdict(int)
        self._window_start = time.time()
        self._lock = threading.Lock()

    def allow(self, key):
        with self._lock:
            now = time.time()
            elapsed = now - self._window_start

            # Rotate windows if needed
            if elapsed >= self.window_size:
                self._previous = self._current.copy()
                self._current = defaultdict(int)
                self._window_start = now
                elapsed = 0

            # Weighted count: current window + weighted previous window
            weight = 1 - (elapsed / self.window_size)
            count = self._current[key] + self._previous[key] * weight

            if count >= self.max_requests:
                return False

            self._current[key] += 1
            return True
```

## Variants

### Per-tier rate limiting

```python
# rate_limiter/tiers.py — Different rates per subscription tier
class TieredRateLimiter:
    """Rate limits based on subscription tier.
    Free: 10 req/s, Pro: 100 req/s, Enterprise: 1000 req/s."""

    TIER_CONFIG = {
        "free": {"rate": 10, "capacity": 20},
        "pro": {"rate": 100, "capacity": 200},
        "enterprise": {"rate": 1000, "capacity": 2000},
    }

    def __init__(self):
        self._limiter = RateLimiter()

    def allow(self, api_key, tier="free"):
        config = self.TIER_CONFIG.get(tier, self.TIER_CONFIG["free"])
        # Configure on first use
        info = self._limiter.get_info(api_key)
        if info is None:
            self._limiter.configure(api_key, config["rate"], config["capacity"])
        return self._limiter.allow(api_key)
```

### Rate limiter with queue

```python
# rate_limiter/queued.py — Queue excess requests instead of rejecting
import queue
import threading

class QueuedRateLimiter:
    """Instead of rejecting, queues requests and processes at the configured rate."""

    def __init__(self, rate, capacity, max_queue=100):
        self._bucket = TokenBucket(rate, capacity)
        self._queue = queue.Queue(maxsize=max_queue)
        self._running = True

        self._worker = threading.Thread(target=self._process, daemon=True)
        self._worker.start()

    def _process(self):
        while self._running:
            item = self._queue.get()
            self._bucket.consume(1)
            item["callback"](item["request"])
            self._queue.task_done()

    def submit(self, request, callback):
        """Submit a request. Returns False if queue is full."""
        try:
            self._queue.put_nowait({"request": request, "callback": callback})
            return True
        except queue.Full:
            return False

    def stop(self):
        self._running = False
```

## Best Practices

- Set rate headers — `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` help clients self-regulate
- Use distributed rate limiting for multi-instance deployments — Redis-based, not in-memory
- Return 429 with Retry-After — standard HTTP status for rate limiting
- Allow bursts — token bucket's capacity handles legitimate bursts without rejecting
- Use per-key buckets — per API key, per user, per IP, not global
- Set bucket TTL — clean up inactive buckets to prevent memory growth
- Monitor rejection rate — high rejection rates indicate misconfigured limits
- Test under load — verify the limiter behaves correctly at the rate boundary

## Common Mistakes

- **Global rate limit**: all clients share one bucket. One noisy client exhausts the limit for everyone.
- **No Retry-After header**: clients don't know when to retry and poll aggressively.
- **In-memory only in multi-instance**: each instance has its own counter, allowing N× the rate.
- **Capacity equals rate**: no burst tolerance. Set capacity to 2-3× the rate for burst handling.
- **No cleanup of old buckets**: memory grows indefinitely. Set TTL on inactive buckets.

## FAQ

### What is the token bucket algorithm?

A rate limiting algorithm where a bucket holds tokens, refilled at a fixed rate. Each request consumes a token. If the bucket is empty, the request is rejected. The bucket capacity allows bursts up to the capacity while maintaining the average refill rate.

### How is token bucket different from fixed window?

Fixed window resets the counter at window boundaries (e.g., every minute). Token bucket continuously refills, allowing bursts at any time. Token bucket is smoother; fixed window has edge cases at boundaries where clients can burst 2× the rate.

### What should the bucket capacity be?

Set capacity to 2-3× the refill rate. This allows short bursts while maintaining the average rate. For example, rate=10/s, capacity=30 allows 30 requests instantly, then 10/s sustained.

### How do I do rate limiting across multiple server instances?

Use a shared store like Redis. The Redis Lua script atomically reads, refills, and updates the bucket. All instances share the same bucket state. In-memory buckets only work for single-instance deployments.

### Should I reject or queue rate-limited requests?

For APIs, reject with 429 + Retry-After. Queuing adds latency and complexity. For background jobs, queueing is appropriate — process at the configured rate without rejecting.
