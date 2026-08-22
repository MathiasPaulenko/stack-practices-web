---
contentType: recipes
slug: python-rate-limiting-fastapi-redis
title: "Distributed Rate Limiting with FastAPI and Redis"
description: "Implement distributed rate limiting in FastAPI using Redis sliding window and token bucket algorithms with per-user, per-IP, and per-endpoint limits."
metaDescription: "Implement distributed rate limiting in FastAPI with Redis. Use sliding window and token bucket algorithms for per-user, per-IP, and per-endpoint rate limits."
difficulty: intermediate
topics:
  - security
  - performance
tags:
  - python
  - fastapi
  - redis
  - rate-limiting
  - middleware
relatedResources:
  - /recipes/python-jwt-refresh-token-rotation
  - /recipes/redis-rate-limiting-token-bucket
  - /recipes/python-sql-injection-sqlalchemy
  - /recipes/python-async-gather-concurrent-requests
  - /recipes/python-secrets-management-vault
  - /recipes/request-signing-hmac
lastUpdated: "2026-08-22"
publishedAt: "2026-07-03"
author: Mathias Paulenko
seo:
  metaDescription: "Implement distributed rate limiting in FastAPI with Redis. Use sliding window and token bucket algorithms for per-user, per-IP, and per-endpoint rate limits."
  keywords:
    - rate limiting fastapi
    - redis rate limit
    - distributed rate limiting
    - sliding window
    - token bucket python
---

Rate limiting stops APIs from being abused, overloaded, or drained by too many requests. If you run several server
instances behind a load balancer, an in-memory rate limiter breaks down because each instance keeps its own counter.
Redis fixes that by giving every instance a shared, atomic counter. This recipe shows you how to implement sliding
window and token bucket rate limiting in FastAPI with Redis.

## When to Use

Use this setup when your API runs on several server instances behind a load balancer, when you need per-user or
per-IP limits on public endpoints, or when different endpoints need different limits (for example, `auth: 5/min` and
`search: 100/min`).

## Prerequisites

For this recipe you'll need Python 3.10 or newer, the `fastapi` and `redis` packages installed, and a Redis server
running.

## Solution

### 1. Install Dependencies

```bash
pip install fastapi redis
```

### 2. Sliding Window Rate Limiter

```python
import time
import redis
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI()
redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

class SlidingWindowRateLimiter:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def is_allowed(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
    ) -> tuple[bool, dict]:
        """Check if a request is allowed using sliding window algorithm.

        Args:
            key: Unique identifier (user_id, IP, etc.).
            max_requests: Maximum requests in the window.
            window_seconds: Window size in seconds.

        Returns:
            Tuple of (allowed, info_dict with remaining, reset_at).
        """
        now = time.time()
        window_start = now - window_seconds

        pipe = self.redis.pipeline()
        # Remove old entries outside the window
        pipe.zremrangebyscore(key, 0, window_start)
        # Count current entries in window
        pipe.zcard(key)
        # Add current request
        pipe.zadd(key, {str(now): now})
        # Set TTL on the key
        pipe.expire(key, window_seconds)
        results = pipe.execute()

        current_count = results[1]
        allowed = current_count < max_requests
        remaining = max(0, max_requests - current_count - 1)

        return allowed, {
            "limit": max_requests,
            "remaining": remaining,
            "reset_at": int(now + window_seconds),
        }

rate_limiter = SlidingWindowRateLimiter(redis_client)
```

### 3. FastAPI Middleware

```python
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        rate_limiter: SlidingWindowRateLimiter,
        max_requests: int = 100,
        window_seconds: int = 60,
    ):
        super().__init__(app)
        self.rate_limiter = rate_limiter
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    async def dispatch(self, request: Request, call_next: Callable):
        # Get identifier — IP address or user ID from token
        client_ip = request.client.host if request.client else "unknown"
        key = f"rate_limit:{client_ip}"

        allowed, info = self.rate_limiter.is_allowed(
            key, self.max_requests, self.window_seconds
        )

        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "limit": info["limit"],
                    "remaining": info["remaining"],
                    "reset_at": info["reset_at"],
                },
                headers={
                    "Retry-After": str(self.window_seconds),
                    "X-RateLimit-Limit": str(info["limit"]),
                    "X-RateLimit-Remaining": str(info["remaining"]),
                    "X-RateLimit-Reset": str(info["reset_at"]),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(info["limit"])
        response.headers["X-RateLimit-Remaining"] = str(info["remaining"])
        response.headers["X-RateLimit-Reset"] = str(info["reset_at"])
        return response

app.add_middleware(
    RateLimitMiddleware,
    rate_limiter=rate_limiter,
    max_requests=100,
    window_seconds=60,
)
```

### 4. Per-Endpoint Rate Limits with Decorator

```python
from functools import wraps
from fastapi import Depends, HTTPException, Request

def rate_limit(max_requests: int, window_seconds: int, key_func=None):
    """Decorator for per-endpoint rate limiting.

    Args:
        max_requests: Maximum requests in the window.
        window_seconds: Window size in seconds.
        key_func: Function to extract the rate limit key from the request.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = kwargs.get("request")
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

            if key_func:
                key = key_func(request)
            else:
                key = f"rate_limit:{request.url.path}:{request.client.host}"

            allowed, info = rate_limiter.is_allowed(
                key, max_requests, window_seconds
            )

            if not allowed:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "Rate limit exceeded",
                        "limit": info["limit"],
                        "remaining": info["remaining"],
                        "reset_at": info["reset_at"],
                    },
                    headers={
                        "Retry-After": str(window_seconds),
                        "X-RateLimit-Limit": str(info["limit"]),
                        "X-RateLimit-Remaining": str(info["remaining"]),
                    },
                )

            return await func(*args, **kwargs)
        return wrapper
    return decorator

@app.post("/auth/login")
@rate_limit(max_requests=5, window_seconds=60)
async def login(request: Request):
    return {"message": "Login endpoint with strict rate limit"}

@app.get("/search")
@rate_limit(max_requests=100, window_seconds=60)
async def search(request: Request):
    return {"message": "Search endpoint with standard rate limit"}
```

### 5. Per-User Rate Limiting

```python
def get_user_key(request: Request) -> str:
    """Extract user ID from JWT for per-user rate limiting."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        # Decode JWT to get user_id (simplified)
        import jwt
        token = auth.split(" ")[1]
        try:
            payload = jwt.decode(token, "secret", algorithms=["HS256"])
            return f"rate_limit:user:{payload['sub']}"
        except jwt.InvalidTokenError:
            pass
    return f"rate_limit:ip:{request.client.host}"

@app.get("/api/data")
@rate_limit(max_requests=200, window_seconds=60, key_func=get_user_key)
async def get_data(request: Request):
    return {"data": "Per-user rate limited endpoint"}
```

## Explanation

The sliding window approach stores each request as a member of a Redis sorted set (`ZSET`), using the request timestamp
as the score. Before allowing a request, it removes entries older than the current window, counts the remaining entries,
and adds the new one.

The Redis pipeline runs all of those commands in a single round-trip, so counting and adding happen atomically and avoid
race conditions. A TTL on the key lets it expire automatically after the window, which saves you from manual garbage
collection.

Per-endpoint limits keep each counter on its own by using different key prefixes, such as
`rate_limit:/auth/login:...` and `rate_limit:/search:...`.

The `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers follow the IETF draft standard, so
clients can read them and back off before hitting the limit.

## Variants

### Token Bucket Algorithm

```python
class TokenBucketRateLimiter:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def is_allowed(
        self,
        key: str,
        capacity: int,
        refill_rate: float,
    ) -> tuple[bool, dict]:
        """Token bucket algorithm — allows bursts up to capacity.

        Args:
            key: Unique identifier.
            capacity: Maximum tokens in the bucket.
            refill_rate: Tokens added per second.

        Returns:
            Tuple of (allowed, info_dict).
        """
        now = time.time()
        bucket_key = f"token_bucket:{key}"

        # Lua script for atomic check-and-decrement
        lua_script = """
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])

        local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
        local tokens = tonumber(bucket[1]) or capacity
        local last_refill = tonumber(bucket[2]) or now

        -- Refill tokens
        local elapsed = math.max(0, now - last_refill)
        tokens = math.min(capacity, tokens + elapsed * refill_rate)

        local allowed = 0
        if tokens >= 1 then
            tokens = tokens - 1
            allowed = 1
        end

        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
        redis.call('EXPIRE', key, math.ceil(capacity / refill_rate))

        return {allowed, math.floor(tokens)}
        """

        result = self.redis.eval(
            lua_script, 1, bucket_key,
            capacity, refill_rate, now,
        )

        return bool(result[0]), {
            "limit": capacity,
            "remaining": int(result[1]),
        }

token_limiter = TokenBucketRateLimiter(redis_client)
```

### Fixed Window Counter

```python
class FixedWindowRateLimiter:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def is_allowed(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
    ) -> tuple[bool, dict]:
        """Fixed window — simpler but allows bursts at window boundaries."""
        now = int(time.time())
        window = now - (now % window_seconds)
        window_key = f"fixed_window:{key}:{window}"

        pipe = self.redis.pipeline()
        pipe.incr(window_key)
        pipe.expire(window_key, window_seconds)
        results = pipe.execute()

        count = results[0]
        allowed = count <= max_requests
        remaining = max(0, max_requests - count)

        return allowed, {
            "limit": max_requests,
            "remaining": remaining,
            "reset_at": window + window_seconds,
        }
```

### Tiered Rate Limits

```python
def tiered_rate_limit(user_tier: str = "free"):
    """Apply different rate limits based on user tier."""
    limits = {
        "free": (100, 60),      # 100 req/min
        "pro": (1000, 60),      # 1000 req/min
        "enterprise": (10000, 60),  # 10000 req/min
    }
    max_requests, window = limits.get(user_tier, limits["free"])
    return rate_limit(max_requests=max_requests, window_seconds=window)

@app.get("/api/expensive")
@tiered_rate_limit(user_tier="pro")
async def expensive_operation(request: Request):
    return {"data": "Tiered rate limited endpoint"}
```

## Best Practices

Use sliding window when accuracy matters, because fixed window can allow bursts twice as big right at window
boundaries. Set a meaningful `Retry-After` header so clients know how long to wait.

Rate limit by user when the user is known, not just by IP. Several users behind a NAT or proxy can share the same IP
address. Monitor how often your endpoints return `429`; a sudden spike can mean a misconfigured limit or an ongoing
attack.

For a deeper guide, see [Cache Database Query Results with Redis and Python](/recipes/database-query-result-caching/).

## Common Mistakes

Using in-memory rate limiters in distributed deployments is a common mistake because each instance ends up with its own
counter. Fall back to Redis instead. Forgetting to set a TTL on Redis keys is another one; without it, the keys keep
piling up and waste memory.

Setting limits too aggressively can block legitimate users, so start generous and tighten once you've got data. Finally,
not handling `429` responses in clients means missing the chance to back off and retry with exponential delay.

## FAQ

### Sliding window vs. token bucket — which should I use?

Use sliding window for strict limits, such as `100 req/min` with no bursts. Use token bucket when you want to allow a
short burst and then refill steadily, such as `100` requests instantly and then `10` per second.

### How much Redis memory does rate limiting use?

Sliding window stores one ZSET entry per request. For `1000` users making `100` requests per minute, that's about
`100 000` entries with a `60` second TTL — negligible.

### What happens if Redis is down?

Rate limiting stops working. Decide up front whether to fail open (allow all requests) or fail closed (reject
requests). A local in-memory limiter is fine as a temporary backup.

### Should I rate limit by IP or by user?

For authenticated endpoints, rate limit by user ID. For public endpoints like login or signup, rate limit by IP. For
sensitive endpoints, use both.

### Is this solution production-ready?

The examples work and have been tested, but still adapt error handling, configuration, and fallback behavior to your
environment before deploying.

### What are the performance characteristics?

How fast it runs depends on request volume and infrastructure. The examples prioritize clarity, so for high throughput
you can add connection pooling, Redis pipelining, and caching wherever it helps.

### How do I debug issues with this approach?

Start with the minimal example and add logging at each step. Run a few requests first, then increase the load. Step
through edge cases with a debugger.
