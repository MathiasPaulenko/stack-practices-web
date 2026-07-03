---
contentType: recipes
slug: redis-rate-limiting-token-bucket
title: "Rate Limiting with Redis Token Bucket Algorithm"
description: "Implement a distributed token bucket rate limiter using Redis atomic operations for API throttling across multiple server instances"
metaDescription: "Build a distributed rate limiter with Redis token bucket. Use Lua scripts for atomic check-and-decrement across multiple server instances."
difficulty: advanced
topics:
  - caching
  - security
tags:
  - redis
  - rate limiting
  - token bucket
  - api
  - security
relatedResources:
  - /recipes/caching/redis-cache-aside-pattern
  - /recipes/caching/redis-sorted-set-leaderboard
  - /patterns/caching/api-rate-limiting
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build a distributed rate limiter with Redis token bucket. Use Lua scripts for atomic check-and-decrement across multiple server instances."
  keywords:
    - redis rate limiting
    - token bucket algorithm
    - api rate limiter
    - distributed rate limiting
    - redis lua script
---

# Rate Limiting with Redis Token Bucket Algorithm

Rate limiting protects APIs from abuse and ensures fair resource allocation. The token bucket algorithm allows bursts up to a configured capacity while maintaining a steady refill rate. Using Redis with a Lua script makes the check-and-decrement atomic, so the limiter works correctly across multiple server instances.

## When to Use This

- Public APIs that need per-client or per-IP rate limiting
- Login or password reset endpoints that need brute-force protection
- Any service where requests must be throttled across multiple instances

## Prerequisites

- Python 3.10+
- `redis` package (`pip install redis`)

## Solution

### 1. Install Dependencies

```bash
pip install redis
```

### 2. Implement the Token Bucket with Lua

```python
import time
from redis import Redis

TOKEN_BUCKET_LUA = """
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1]) or capacity
local last_refill = tonumber(bucket[2]) or now

-- Refill tokens based on elapsed time
local elapsed = math.max(0, now - last_refill)
local refilled = elapsed * refill_rate
tokens = math.min(capacity, tokens + refilled)

if tokens < requested then
    -- Not enough tokens — reject
    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
    redis.call('EXPIRE', key, 3600)
    return 0
end

-- Consume tokens
tokens = tokens - requested
redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
redis.call('EXPIRE', key, 3600)
return 1
"""


class TokenBucketRateLimiter:
    def __init__(
        self,
        redis_client: Redis,
        capacity: int = 100,
        refill_rate: float = 10.0,
    ):
        self.redis = redis_client
        self.capacity = capacity
        self.refill_rate = refill_rate
        self._script = self.redis.register_script(TOKEN_BUCKET_LUA)

    def allow_request(
        self,
        identifier: str,
        requested: int = 1,
    ) -> bool:
        """Check if a request is allowed under the rate limit.

        Args:
            identifier: Unique key (e.g., IP address, user ID, API key).
            requested: Number of tokens to consume.

        Returns:
            True if allowed, False if rate limited.
        """
        key = f"ratelimit:{identifier}"
        now = time.time()
        result = self._script(
            keys=[key],
            args=[self.capacity, self.refill_rate, now, requested],
        )
        return bool(result)
```

### 3. Use as Middleware (FastAPI)

```python
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI()
limiter = TokenBucketRateLimiter(
    redis_client=redis.Redis(host="localhost", port=6379),
    capacity=100,
    refill_rate=10.0,  # 10 tokens per second
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host
    if not limiter.allow_request(f"ip:{client_ip}"):
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded", "retryAfter": 10},
            headers={"Retry-After": "10"},
        )
    return await call_next(request)


@app.get("/api/data")
async def get_data():
    return {"data": "success"}
```

### 4. Per-User Rate Limiting

```python
@app.get("/api/profile")
async def get_profile(request: Request):
    user_id = request.headers.get("X-User-ID", "anonymous")

    if not limiter.allow_request(f"user:{user_id}"):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded",
            headers={"Retry-After": "10"},
        )

    return {"profile": fetch_profile(user_id)}
```

### 5. Tiered Rate Limits

Different API tiers with different limits:

```python
class TieredRateLimiter:
    TIERS = {
        "free": {"capacity": 60, "refill_rate": 1.0},      # 60/min
        "pro": {"capacity": 600, "refill_rate": 10.0},     # 600/min
        "enterprise": {"capacity": 6000, "refill_rate": 100.0},  # 6000/min
    }

    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self._limiters = {
            tier: TokenBucketRateLimiter(redis_client, **config)
            for tier, config in self.TIERS.items()
        }

    def allow_request(self, identifier: str, tier: str = "free") -> bool:
        limiter = self._limiters.get(tier, self._limiters["free"])
        return limiter.allow_request(f"{tier}:{identifier}")


# Usage
tiered = TieredRateLimiter(redis_client)

@app.get("/api/search")
async def search(request: Request):
    user_id = request.headers["X-User-ID"]
    user_tier = get_user_tier(user_id)  # "free", "pro", or "enterprise"

    if not tiered.allow_request(user_id, tier=user_tier):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    return search_results(query=request.query_params.get("q", ""))
```

## How It Works

1. **Token bucket** starts full with `capacity` tokens. Each request consumes one or more tokens.
2. **Refill** happens continuously: `elapsed_time * refill_rate` tokens are added, up to `capacity`. This allows bursts up to `capacity` while maintaining an average rate of `refill_rate` tokens/second.
3. **Lua script** makes the check-and-decrement atomic — no race condition between reading the token count and consuming a token, even with multiple server instances.
4. **`EXPIRE`** sets a TTL on the bucket key so inactive identifiers are cleaned up automatically.
5. **Identifier-based keys** (`ratelimit:ip:192.168.1.1`, `ratelimit:user:123`) allow independent limits per client, user, or API key.

## Variants

### Sliding Window Rate Limiter

An alternative that counts requests in a sliding time window:

```python
SLIDING_WINDOW_LUA = """
local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- Remove old entries outside the window
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

local count = redis.call('ZCARD', key)
if count >= limit then
    return 0
end

redis.call('ZADD', key, now, now .. ':' .. math.random())
redis.call('EXPIRE', key, window / 1000 + 1)
return 1
"""


class SlidingWindowRateLimiter:
    def __init__(self, redis_client: Redis, window_ms: int = 60000, limit: int = 100):
        self.redis = redis_client
        self.window = window_ms
        self.limit = limit
        self._script = redis_client.register_script(SLIDING_WINDOW_LUA)

    def allow_request(self, identifier: str) -> bool:
        key = f"ratelimit:sw:{identifier}"
        now = int(time.time() * 1000)
        return bool(self._script(
            keys=[key],
            args=[self.window, self.limit, now],
        ))
```

### Fixed Window Rate Limiter

Simpler but less accurate — resets at fixed intervals:

```python
class FixedWindowRateLimiter:
    def __init__(self, redis_client: Redis, window_seconds: int = 60, limit: int = 100):
        self.redis = redis_client
        self.window = window_seconds
        self.limit = limit

    def allow_request(self, identifier: str) -> bool:
        window_key = int(time.time()) // self.window
        key = f"ratelimit:fw:{identifier}:{window_key}"

        pipe = self.redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, self.window)
        count, _ = pipe.execute()

        return count <= self.limit
```

## Best Practices

- **Use Lua scripts for atomicity** — without it, concurrent requests can consume more tokens than allowed
- **Set TTLs on bucket keys** — prevents memory growth from inactive identifiers
- **Return `Retry-After` header** — tells clients when to retry, improving UX
- **Monitor rate limit hits** — a sudden spike in 429s may indicate a misconfigured client or an attack

## Common Mistakes

- **Using `INCR` without atomicity** — reading the count and then deciding to allow/deny creates a race condition
- **Not setting a TTL** — bucket keys for every IP/user accumulate without cleanup
- **Using the same bucket for all clients** — one slow client depletes the bucket for everyone
- **Forgetting to refill** — without the refill calculation, the bucket never recovers after depletion

## FAQ

**Q: Token bucket vs. sliding window — which should I use?**
A: Token bucket allows bursts up to capacity and is memory-efficient. Sliding window is more precise but uses more memory (one entry per request).

**Q: How do I handle rate limits for authenticated vs. unauthenticated requests?**
A: Use different identifier prefixes: `ratelimit:ip:<ip>` for unauthenticated, `ratelimit:user:<id>` for authenticated, with different capacities.

**Q: What happens if Redis is down?**
A: The rate limiter fails. Decide on a fail-open (allow all) or fail-closed (deny all) strategy based on your security requirements.

**Q: Can I use this with Redis Cluster?**
A: Yes. The Lua script operates on a single key, so it works within a single shard. Use hash tags (`ratelimit:{user_id}`) to ensure keys for the same user land on the same shard.
