---
contentType: recipes
slug: python-api-rate-limiting
title: "Python API Rate Limiting with Token Bucket"
description: "Implement token bucket rate limiting in Flask and FastAPI with Redis support"
metaDescription: "Implement token bucket rate limiting in Python Flask and FastAPI. Includes Redis-backed distributed limits, sliding window, and middleware patterns."
difficulty: intermediate
topics:
  - api
tags:
  - python
  - flask
  - fastapi
  - rate-limiting
  - token-bucket
  - redis
  - middleware
relatedResources:
  - /recipes/api-rate-limiting
  - /recipes/api-rate-limiting-redis
  - /recipes/nodejs-caching-redis
  - /docs/api-security-checklist-template
  - /guides/api-design-best-practices
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Implement token bucket rate limiting in Python Flask and FastAPI. Includes Redis-backed distributed limits, sliding window, and middleware patterns."
  keywords:
    - python rate limiting
    - flask rate limit
    - fastapi rate limit
    - token bucket python
    - redis rate limiter
    - api throttling python
---

## Overview

Rate limiting protects APIs from abuse, prevents DoS attacks, and ensures fair resource allocation. The token bucket algorithm is one of the most common approaches: it allows bursts of traffic while maintaining a steady average rate. This recipe covers implementing token bucket rate limiting in Flask and FastAPI, with both in-memory and Redis-backed distributed variants.

## When to Use

- You are building a public API and need to prevent abuse
- You have different pricing tiers with different rate limits
- You need distributed rate limiting across multiple server instances
- You want to throttle specific endpoints differently

## Solution

### Token bucket with Flask (in-memory)

```python
import time
from collections import defaultdict
from functools import wraps
from flask import Flask, request, jsonify

app = Flask(__name__)

class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = capacity
        self.last_refill = time.monotonic()

    def consume(self, tokens: int = 1) -> bool:
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False


buckets: dict[str, TokenBucket] = defaultdict(lambda: TokenBucket(capacity=10, refill_rate=1.0))

def rate_limit(capacity: int = 10, refill_rate: float = 1.0):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            client_ip = request.remote_addr
            bucket = buckets[client_ip]

            if not bucket.consume():
                return jsonify({
                    "error": "Rate limit exceeded",
                    "retry_after": round(bucket.capacity / bucket.refill_rate, 1)
                }), 429

            return func(*args, **kwargs)
        return wrapper
    return decorator

@app.route("/api/data")
@rate_limit(capacity=10, refill_rate=1.0)
def get_data():
    return jsonify({"data": "success"})

if __name__ == "__main__":
    app.run(debug=True)
```

### Token bucket with FastAPI (in-memory)

```python
import time
from collections import defaultdict
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI()

class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = capacity
        self.last_refill = time.monotonic()

    def consume(self, tokens: int = 1) -> bool:
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False


buckets: dict[str, TokenBucket] = {}

def get_bucket(key: str, capacity: int, refill_rate: float) -> TokenBucket:
    if key not in buckets:
        buckets[key] = TokenBucket(capacity, refill_rate)
    return buckets[key]

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        client_ip = request.client.host
        bucket = get_bucket(client_ip, capacity=100, refill_rate=10.0)

        if not bucket.consume():
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "retry_after": round(bucket.capacity / bucket.refill_rate, 1)
                }
            )

    return await call_next(request)

@app.get("/api/data")
async def get_data():
    return {"data": "success"}
```

### Redis-backed distributed rate limiting

```python
import time
import redis
from functools import wraps
from flask import Flask, request, jsonify

app = Flask(__name__)
r = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

def redis_token_bucket(key: str, capacity: int, refill_rate: float) -> bool:
    lua_script = """
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        local requested = tonumber(ARGV[4])

        local bucket = redis.call("HMGET", key, "tokens", "last_refill")
        local tokens = tonumber(bucket[1])
        local last_refill = tonumber(bucket[2])

        if tokens == nil then
            tokens = capacity
            last_refill = now
        end

        local elapsed = now - last_refill
        tokens = math.min(capacity, tokens + elapsed * refill_rate)

        if tokens >= requested then
            tokens = tokens - requested
            redis.call("HMSET", key, "tokens", tokens, "last_refill", now)
            redis.call("EXPIRE", key, math.ceil(capacity / refill_rate))
            return 1
        else
            redis.call("HMSET", key, "tokens", tokens, "last_refill", now)
            redis.call("EXPIRE", key, math.ceil(capacity / refill_rate))
            return 0
        end
    """

    now = time.time()
    result = r.eval(lua_script, 1, key, capacity, refill_rate, now, 1)
    return bool(result)

def rate_limit(capacity: int = 10, refill_rate: float = 1.0):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            client_ip = request.remote_addr
            key = f"rate_limit:{func.__name__}:{client_ip}"

            if not redis_token_bucket(key, capacity, refill_rate):
                return jsonify({
                    "error": "Rate limit exceeded",
                    "retry_after": round(capacity / refill_rate, 1)
                }), 429

            return func(*args, **kwargs)
        return wrapper
    return decorator

@app.route("/api/expensive")
@rate_limit(capacity=5, refill_rate=0.5)
def expensive_operation():
    return jsonify({"result": "computed"})
```

### Sliding window rate limiter with FastAPI

```python
import time
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import redis

app = FastAPI()
r = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

def sliding_window_limit(key: str, limit: int, window: int) -> bool:
    lua_script = """
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])

        redis.call("ZREMRANGEBYSCORE", key, 0, now - window)
        local count = redis.call("ZCARD", key)

        if count < limit then
            redis.call("ZADD", key, now, now .. "-" .. math.random())
            redis.call("EXPIRE", key, window)
            return 1
        else
            return 0
        end
    """

    now = time.time()
    result = r.eval(lua_script, 1, key, limit, window, now)
    return bool(result)

@app.middleware("http")
async def sliding_window_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        client_ip = request.client.host
        key = f"sliding_window:{client_ip}"

        if not sliding_window_limit(key, limit=60, window=60):
            return JSONResponse(
                status_code=429,
                content={"error": "Too many requests", "window": "60 seconds", "limit": 60}
            )

    return await call_next(request)
```

### Per-endpoint rate limits with FastAPI dependency

```python
from fastapi import FastAPI, Depends, HTTPException, Request
import time

app = FastAPI()

class RateLimiter:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self._buckets: dict[str, tuple[float, float]] = {}

    def check(self, key: str) -> None:
        now = time.monotonic()
        if key in self._buckets:
            tokens, last_refill = self._buckets[key]
            elapsed = now - last_refill
            tokens = min(self.capacity, tokens + elapsed * self.refill_rate)
        else:
            tokens = self.capacity

        if tokens < 1:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Capacity: {self.capacity}, refill: {self.refill_rate}/s"
            )

        self._buckets[key] = (tokens - 1, now)

def create_limiter(capacity: int, refill_rate: float):
    limiter = RateLimiter(capacity, refill_rate)
    def dependency(request: Request):
        limiter.check(request.client.host)
    return Depends(dependency)

@app.get("/api/free")
async def free_endpoint():
    return {"message": "no rate limit"}

@app.get("/api/limited", dependencies=[create_limiter(capacity=10, refill_rate=1.0)])
async def limited_endpoint():
    return {"message": "rate limited"}

@app.get("/api/strict", dependencies=[create_limiter(capacity=3, refill_rate=0.5)])
async def strict_endpoint():
    return {"message": "strictly limited"}
```

## Explanation

The token bucket algorithm works by maintaining a bucket of tokens that refills at a constant rate. Each request consumes one token. If the bucket is empty, the request is rejected.

Key concepts:

- **Capacity**: Maximum burst size. A bucket with capacity 10 allows 10 requests in quick succession.
- **Refill rate**: Tokens added per second. A refill rate of 1.0 means 1 token per second.
- **Distributed**: Redis-backed implementations use Lua scripts for atomicity. The script reads, updates, and writes in a single Redis operation, preventing race conditions.
- **Sliding window**: Instead of fixed windows, the sliding window tracks individual request timestamps in a sorted set. It counts requests within the last N seconds, providing smoother limits.

The Lua script in the Redis variant is crucial: without atomic execution, concurrent requests could read the same token count and all pass the limit check.

## Variants

| Approach | Algorithm | Storage | Use When |
|----------|-----------|---------|----------|
| In-memory | Token bucket | Process memory | Single instance, low traffic |
| Redis | Token bucket | Redis | Multiple instances, distributed |
| Redis | Sliding window | Redis sorted set | Strict per-second limits |
| Redis | Fixed window | Redis INCR | Simple, approximate limits |
| Database | Token bucket | SQL/Postgres | When Redis is unavailable |

## Guidelines

- Use Redis-backed limits in production. In-memory limits do not work across multiple instances.
- Return `429 Too Many Requests` with a `Retry-After` header.
- Set different limits for different endpoints based on cost.
- Use API keys or user IDs as the bucket key, not just IP addresses.
- Monitor rate limit hits. A sudden spike may indicate a misconfigured client or an attack.
- Set `EXPIRE` on Redis keys to prevent memory growth from inactive clients.

## Common Mistakes

- Using IP address as the only key. Multiple users behind a NAT share one IP and hit limits unfairly.
- Not using atomic operations in Redis. Concurrent requests can race and bypass the limit.
- Setting capacity too low. Legitimate users get blocked during normal usage bursts.
- Not returning `Retry-After`. Clients cannot implement backoff without it.
- Forgetting to clean up Redis keys. Inactive client keys accumulate and consume memory.

## Frequently Asked Questions

### How do I test rate limiting locally?

Use a loop with `curl` or `httpie`:

```bash
for i in $(seq 1 20); do
    curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/api/data
done
```

You should see `200` for the first 10 requests and `429` after that.

### Should I use rate limiting middleware or decorators?

Middleware applies globally to all routes. Decorators (or FastAPI dependencies) allow per-endpoint configuration. Use middleware for a global default and decorators for endpoint-specific overrides.

### How do I handle rate limits for authenticated vs anonymous users?

Use different bucket keys:

```python
def get_key(request):
    user_id = get_user_id(request)  # your auth logic
    if user_id:
        return f"user:{user_id}"
    return f"ip:{request.remote_addr}"
```

Authenticated users get higher limits by using a different capacity parameter.

### What is the difference between token bucket and leaky bucket?

Token bucket allows bursts up to the capacity. Leaky bucket smooths traffic by processing at a fixed rate regardless of incoming burst size. Token bucket is more common for APIs because it handles legitimate bursts better.
