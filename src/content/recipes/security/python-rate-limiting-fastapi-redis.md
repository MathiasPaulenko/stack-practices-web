---




contentType: recipes
slug: python-rate-limiting-fastapi-redis
title: "Distributed Rate Limiting with FastAPI and Redis"
description: "Implement distributed rate limiting in FastAPI using Redis sliding window and token bucket algorithms with per-user, per-IP, and per-endpoint limits"
metaDescription: "Implement distributed rate limiting in FastAPI with Redis. Use sliding window and token bucket algorithms for per-user, per-IP, and per-endpoint rate limits."
difficulty: intermediate
topics:
  - security
  - performance
tags:
  - python
  - fastapi
  - redis
  - rate limiting
  - middleware
relatedResources:
  - /recipes/python-jwt-refresh-token-rotation
  - /recipes/redis-rate-limiting-token-bucket
  - /recipes/python-sql-injection-sqlalchemy
  - /recipes/python-async-gather-concurrent-requests
  - /recipes/python-secrets-management-vault
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement distributed rate limiting in FastAPI with Redis. Use sliding window and token bucket algorithms for per-user, per-IP, and per-endpoint rate limits."
  keywords:
    - rate limiting fastapi
    - redis rate limit
    - distributed rate limiting
    - sliding window
    - token bucket python




---

# Distributed Rate Limiting with FastAPI and Redis

Rate limiting protects APIs from abuse, DDoS, and resource exhaustion. In distributed deployments with multiple server instances, in-memory rate limiters don't work — each instance has its own counter. Redis provides a shared, atomic counter across all instances. Below: sliding window and token bucket algorithms in FastAPI with Redis.

## When to Use This

- APIs with multiple server instances behind a load balancer
- Public APIs that need per-user or per-IP rate limits
- Endpoints with different rate limits (e.g., auth: 5/min, search: 100/min)

## Prerequisites

- Python 3.10+
- `fastapi`, `redis` packages
- A Redis server running

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

## How It Works

1. **Sliding window** uses a Redis sorted set (`ZSET`) where each request is a member with its timestamp as the score. Before each request, we remove entries older than the window, count remaining entries, and add the new request.
2. **Pipeline** executes all Redis commands atomically in a single round-trip, preventing race conditions between counting and adding.
3. **TTL** on the Redis key ensures cleanup after the window expires — no manual garbage collection needed.
4. **Per-endpoint limits** use different key prefixes (`rate_limit:/auth/login:...` vs `rate_limit:/search:...`), so limits are independent per endpoint.
5. **Rate limit headers** (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) follow the IETF draft standard, allowing clients to handle limits gracefully.

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


- For a deeper guide, see [Cache Database Query Results with Redis and Python](/recipes/database-query-result-caching/).

- **Use sliding window for accuracy** — fixed window allows 2x bursts at window boundaries
- **Set meaningful Retry-After headers** — clients can back off gracefully
- **Use per-user limits, not just per-IP** — multiple users behind NAT share an IP
- **Monitor rate limit hits** — frequent 429s may indicate a misconfigured limit or an attack

## Common Mistakes

- **Using in-memory rate limiting in distributed deployments** — each instance has its own counter; use Redis
- **Not setting TTL on Redis keys** — keys accumulate forever, consuming memory
- **Rate limiting too aggressively** — legitimate users get blocked; start generous and tighten
- **Not handling 429 in the client** — clients should implement exponential backoff on 429

## FAQ

**Q: Sliding window vs. token bucket — which should I use?**
A: Sliding window for strict limits (e.g., 100 req/min, no bursts). Token bucket for burst-tolerant limits (e.g., allow 100 instant requests, then refill at 10/sec).

**Q: How much Redis memory does rate limiting use?**
A: Sliding window stores one ZSET entry per request. For 1000 users at 100 req/min, that's ~100K entries with 60s TTL — negligible.

**Q: What happens if Redis is down?**
A: Rate limiting fails. Implement a fallback (allow all, or use a local in-memory limiter as backup).

**Q: Should I rate limit by IP or by user?**
A: By user for authenticated endpoints. By IP for public endpoints (login, signup). Use both for sensitive endpoints.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
