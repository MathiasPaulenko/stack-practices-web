---
contentType: patterns
slug: rate-limiter-token-bucket-pattern
title: "Patrón Token Bucket Rate Limiter"
description: "Cómo implementar token bucket rate limiting para API protection. Cubre bucket refill, burst handling, per-key buckets, distributed rate limiting con Redis, y sliding windows."
metaDescription: "Implementá token bucket rate limiting para API protection. Bucket refill, burst handling, per-key buckets, distributed rate limiting con Redis y sliding windows."
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
  metaDescription: "Implementá token bucket rate limiting para API protection. Bucket refill, burst handling, per-key buckets, distributed rate limiting con Redis y sliding windows."
  keywords:
    - architecture
    - resilience
    - rate-limiting
    - token-bucket
    - pattern
---

## Overview

El token bucket rate limiter controla request rate maintainiendo un bucket de tokens. Cada request consume un token. Los tokens se refilléan a un fixed rate. Si el bucket está empty, el request es rejected o delayed. El bucket tiene un capacity, alloweando bursts hasta el capacity mientras maintainéa un average rate igual al refill rate. A diferencia de fixed-window limiters, token buckets allowéan bursts sin resetear en window boundaries. Esto los hace ideal para API rate limiting donde clients occasionally necesitan burstear pero deberían maintainar un average rate.

## When to Use

- API rate limiting per client o per API key
- Protecteando downstream services de traffic spikes
- Controlando outbound call rate a external APIs
- Multi-tenant systems donde cada tenant tiene un rate quota
- Scenarios donde bursts deberían ser allowed pero average rate controlled

## When NOT to Use

- Strict per-second limits sin burst tolerance (usá fixed window)
- Cuando necesitás exact counts per time period (usá sliding window)
- Simple internal throttling donde precision no importa

## Solution

### Basic token bucket (Python)

```python
# rate_limiter/token_bucket.py — In-memory token bucket rate limiter
import time
import threading
from collections import defaultdict

class TokenBucket:
    """Single token bucket con configurable rate y capacity."""

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
        """Try consumir tokens. Returnéa True si allowed, False si rejected."""
        with self._lock:
            self._refill()
            if self._tokens >= tokens:
                self._tokens -= tokens
                return True
            return False

    def consume(self, tokens=1, timeout=None):
        """Consumí tokens, blockeando hasta available o timeout."""
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
    """Manageéa per-key token buckets.
    Cada API key, user, o IP obtiene su propio bucket."""

    def __init__(self, default_rate=10, default_capacity=20):
        self.default_rate = default_rate
        self.default_capacity = default_capacity
        self._buckets = {}
        self._lock = threading.Lock()

    def configure(self, key, rate, capacity):
        """Configurá un custom rate para un specific key."""
        with self._lock:
            self._buckets[key] = TokenBucket(rate, capacity)

    def allow(self, key, tokens=1):
        """Checkeá si el request es allowed para el given key."""
        with self._lock:
            if key not in self._buckets:
                self._buckets[key] = TokenBucket(
                    self.default_rate, self.default_capacity
                )
            bucket = self._buckets[key]

        return bucket.try_consume(tokens)

    def get_info(self, key):
        """Obtené bucket info para un key."""
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

# Custom rate para premium API key
limiter.configure("premium-key", rate=100, capacity=200)

def api_request(api_key):
    if not limiter.allow(api_key):
        return {"error": "Rate limit exceeded"}, 429
    return {"data": "success"}, 200
```

### Distributed token bucket con Redis (Python)

```python
# rate_limiter/redis_token_bucket.py — Distributed rate limiter usando Redis
import redis
import time

class RedisTokenBucket:
    """Distributed token bucket usando Redis.
    Funciona across múltiples server instances."""

    def __init__(self, redis_url="redis://localhost:6379"):
        self._redis = redis.from_url(redis_url)

    def allow(self, key, rate, capacity, tokens=1):
        """Atómicamente consumí tokens usando Redis Lua script.
        Returnéa (allowed, remaining_tokens, retry_after_seconds)."""
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


# Usage — shared across múltiples server instances
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

### Java token bucket con Guava

```java
// RateLimiterConfig.java — Java rate limiting con Guava RateLimiter
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
        limiter.acquire(); // Blockea hasta permit available
    }
}
```

### Express middleware (JavaScript)

```javascript
// rate_limiter/express-middleware.js — Token bucket middleware para Express
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
    """Sliding window counter: combina current y previous window.
    Más accurate que fixed window, menos memory que sliding log."""

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

            # Rotateá windows si es needed
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
    """Rate limits basado en subscription tier.
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
        # Configurá en first use
        info = self._limiter.get_info(api_key)
        if info is None:
            self._limiter.configure(api_key, config["rate"], config["capacity"])
        return self._limiter.allow(api_key)
```

### Rate limiter con queue

```python
# rate_limiter/queued.py — Queueéa excess requests en vez de rejectear
import queue
import threading

class QueuedRateLimiter:
    """En vez de rejectear, queueéa requests y proceséa al configured rate."""

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
        """Submiteá un request. Returnéa False si queue está full."""
        try:
            self._queue.put_nowait({"request": request, "callback": callback})
            return True
        except queue.Full:
            return False

    def stop(self):
        self._running = False
```

## Best Practices

- Seteá rate headers — `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` helpéan a clients self-regulate
- Usá distributed rate limiting para multi-instance deployments — Redis-based, no in-memory
- Returneá 429 con Retry-After — standard HTTP status para rate limiting
- Allowéa bursts — token bucket's capacity handleéa legitimate bursts sin rejectear
- Usá per-key buckets — per API key, per user, per IP, no global
- Seteá bucket TTL — cleanupéa inactive buckets para prevenir memory growth
- Monitoreá rejection rate — high rejection rates indican misconfigured limits
- Testeá under load — verificá que el limiter behave correctamente en el rate boundary

## Common Mistakes

- **Global rate limit**: todos los clients shareéan un bucket. Un noisy client exhaustéa el limit para todos.
- **No Retry-After header**: clients no saben cuando retryear y pollean agresivamente.
- **In-memory only en multi-instance**: cada instance tiene su propio counter, alloweando N× el rate.
- **Capacity equals rate**: no burst tolerance. Seteá capacity a 2-3× el rate para burst handling.
- **No cleanup de old buckets**: memory crece indefinitely. Seteá TTL en inactive buckets.

## FAQ

### ¿Qué es el token bucket algorithm?

Un rate limiting algorithm donde un bucket holdéa tokens, refilléados a un fixed rate. Cada request consume un token. Si el bucket está empty, el request es rejected. El bucket capacity allowéa bursts hasta el capacity mientras maintainéa el average refill rate.

### ¿En qué se diferencia token bucket de fixed window?

Fixed window resetéa el counter en window boundaries (e.g., cada minuto). Token bucket continuamente refilléa, alloweando bursts en cualquier time. Token bucket es más smooth; fixed window tiene edge cases en boundaries donde clients pueden burstear 2× el rate.

### ¿Qué debería ser el bucket capacity?

Seteá capacity a 2-3× el refill rate. Esto allowéa short bursts mientras maintainéa el average rate. Por ejemplo, rate=10/s, capacity=30 allowéa 30 requests instantly, luego 10/s sustained.

### ¿Cómo hago rate limiting across múltiples server instances?

Usá un shared store como Redis. El Redis Lua script atómicamente reads, refills, y updates el bucket. Todas las instances shareéan el mismo bucket state. In-memory buckets solo funcionan para single-instance deployments.

### ¿Debería rejectear o queueear rate-limited requests?

Para APIs, rejecteá con 429 + Retry-After. Queueear agrega latency y complexity. Para background jobs, queueear es appropriate — proceséa al configured rate sin rejectear.
