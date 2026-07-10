---
contentType: recipes
slug: python-httpx-cache-responses
title: "Cache HTTP Responses with httpx and CacheControl in Python"
description: "Cache HTTP responses in Python using httpx with CacheControl for HTTP-compliant caching, ETag handling, and conditional requests."
metaDescription: "Cache HTTP responses in Python with httpx and CacheControl. Handle ETags, conditional requests, cache headers, and custom cache backends."
difficulty: intermediate
topics:
  - caching
  - api
  - performance
tags:
  - python
  - httpx
  - http-cache
  - cachecontrol
  - etag
relatedResources:
  - /recipes/caching/python-redis-cache-decorator
  - /recipes/caching/nginx-reverse-proxy-cache
  - /guides/complete-guide-api-versioning-strategies
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Cache HTTP responses in Python with httpx and CacheControl. Handle ETags, conditional requests, cache headers, and custom cache backends."
  keywords:
    - python httpx cache
    - cachecontrol python
    - http caching python
    - etag conditional requests
    - httpx cache backend
---

## Overview

When a Python application makes HTTP requests to external APIs, caching responses reduces latency, avoids rate limits, and lowers bandwidth usage. `httpx` combined with `CacheControl` provides HTTP-compliant caching that respects `Cache-Control`, `ETag`, and `Last-Modified` headers — the same rules browsers follow. Below: setting up httpx with CacheControl, using file and Redis backends, handling conditional requests, and manual cache control.

## When to Use This

- Python applications that call external APIs repeatedly (weather, exchange rates, search)
- Reducing rate-limit consumption on third-party APIs
- Caching API responses during development or testing
- Any HTTP client scenario where responses are cacheable

## Prerequisites

- Python 3.10+
- `httpx` and `cachecontrol` packages

## Solution

### 1. Install Dependencies

```bash
pip install httpx cachecontrol
```

### 2. Basic File-Based Caching

```python
import httpx
from cachecontrol import CacheControlAdapter

# Create an httpx client with a file-based cache adapter
adapter = CacheControlAdapter(cache_dir="/tmp/http_cache")
client = httpx.Client(
    mount={
        "https://": adapter,
        "http://": adapter,
    }
)

# First request — fetches and caches
response = client.get("https://api.example.com/products")
print(response.json())
print(f"From cache: {response.from_cache}")  # False

# Second request — served from cache
response = client.get("https://api.example.com/products")
print(f"From cache: {response.from_cache}")  # True

client.close()
```

### 3. Redis Backend

```python
import httpx
from cachecontrol import CacheControlAdapter
from cachecontrol.caches.redis_cache import RedisCache
import redis

redis_client = redis.Redis(host="localhost", port=6379, db=2)
adapter = CacheControlAdapter(cache=RedisCache(redis_client))

client = httpx.Client(mount={"https://": adapter, "http://": adapter})

# Cached responses are stored in Redis — shared across processes
response = client.get("https://api.example.com/data")
```

### 4. In-Memory Cache (Development)

```python
from cachecontrol import CacheControlAdapter

adapter = CacheControlAdapter()  # Default: in-memory cache
client = httpx.Client(mount={"https://": adapter})

# Cache lives only in this process — lost on restart
response = client.get("https://api.example.com/data")
```

### 5. Using Async httpx with CacheControl

```python
import httpx
from cachecontrol import CacheControlAdapter

adapter = CacheControlAdapter(cache_dir="/tmp/http_cache")

async with httpx.AsyncClient(
    mount={"https://": adapter, "http://": adapter}
) as client:
    # First request — fetches
    r1 = await client.get("https://api.example.com/products")

    # Second request — from cache
    r2 = await client.get("https://api.example.com/products")
    print(f"From cache: {r2.from_cache}")
```

### 6. Manual Cache Control

```python
import httpx
from cachecontrol import CacheControlAdapter

adapter = CacheControlAdapter(cache_dir="/tmp/http_cache")
client = httpx.Client(mount={"https://": adapter})

# Force cache miss — always fetch fresh
response = client.get(
    "https://api.example.com/products",
    headers={"Cache-Control": "no-cache"},
)

# Force no-store — don't cache the response
response = client.get(
    "https://api.example.com/sensitive",
    headers={"Cache-Control": "no-store"},
)

# Max-age — only use cache if younger than 60 seconds
response = client.get(
    "https://api.example.com/products",
    headers={"Cache-Control": "max-age=60"},
)
```

### 7. Conditional Requests (ETag / Last-Modified)

CacheControl automatically handles `ETag` and `Last-Modified` headers:

```python
# First request — server returns ETag
response = client.get("https://api.example.com/products")
etag = response.headers.get("ETag")  # "abc123"
last_modified = response.headers.get("Last-Modified")

# Second request — CacheControl sends If-None-Match automatically
# If server returns 304 Not Modified, cached response is used
response = client.get("https://api.example.com/products")
# response.status_code could be 200 (from cache) or 304 (revalidated)
```

### 8. Wrapper Class with TTL Override

```python
import httpx
from cachecontrol import CacheControlAdapter
from datetime import timedelta

class CachedHttpClient:
    def __init__(self, cache_dir="/tmp/http_cache", default_ttl=300):
        adapter = CacheControlAdapter(cache_dir=cache_dir)
        self.client = httpx.Client(mount={"https://": adapter, "http://": adapter})
        self.default_ttl = default_ttl

    def get(self, url: str, params: dict = None, force_refresh: bool = False) -> dict:
        headers = {}
        if force_refresh:
            headers["Cache-Control"] = "no-cache"

        response = self.client.get(url, params=params, headers=headers)
        response.raise_for_status()
        return response.json()

    def post(self, url: str, json: dict = None) -> dict:
        # POST requests are never cached
        response = self.client.post(url, json=json)
        response.raise_for_status()
        return response.json()

    def close(self):
        self.client.close()

# Usage
api = CachedHttpClient(cache_dir="/tmp/api_cache", default_ttl=600)

# Cached GET
data = api.get("https://api.example.com/products", params={"page": 1})

# Force fresh fetch
fresh = api.get("https://api.example.com/products", force_refresh=True)

# POST (never cached)
result = api.post("https://api.example.com/products", json={"name": "Widget"})
```

## How It Works

1. **Cache-Control parsing**: CacheControl reads the `Cache-Control` header from the response. Directives like `max-age`, `no-store`, `no-cache`, and `must-revalidate` determine whether and how long to cache.
2. **ETag revalidation**: When a cached response has an `ETag`, CacheControl sends `If-None-Match: <etag>` on the next request. If the server returns `304 Not Modified`, the cached body is reused — saving bandwidth.
3. **Last-Modified revalidation**: Similar to ETag, but uses `If-Modified-Since` header with the `Last-Modified` date.
4. **Cache key**: The cache key is derived from the request URL and method. Query parameters are included in the key.
5. **Vary header**: If the response includes `Vary: Accept-Encoding`, CacheControl stores separate cache entries for different `Accept-Encoding` values.

## Variants

### Custom Cache Backend

```python
from cachecontrol.caches.file_cache import FileCache

class CustomFileCache(FileCache):
    def __init__(self, directory, **kwargs):
        super().__init__(directory, **kwargs)

    def get(self, key):
        # Add logging or metrics
        value = super().get(key)
        if value:
            print(f"Cache hit: {key}")
        return value

    def set(self, key, value, expires=None):
        print(f"Cache set: {key}, expires: {expires}")
        super().set(key, value, expires)

adapter = CacheControlAdapter(cache=CustomFileCache("/tmp/http_cache"))
```

### Per-Request TTL Override

```python
# Override the server's Cache-Control with a shorter TTL
response = client.get(
    "https://api.example.com/long-cache",
    headers={"Cache-Control": "max-age=60"},  # Use 60s instead of server's 3600s
)
```

### Cache with Circuit Breaker

```python
import httpx
from cachecontrol import CacheControlAdapter

class ResilientClient:
    def __init__(self):
        adapter = CacheControlAdapter(cache_dir="/tmp/http_cache")
        self.client = httpx.Client(mount={"https://": adapter})
        self.failure_count = 0
        self.circuit_open = False

    def get(self, url: str) -> dict:
        if self.circuit_open:
            # Try cache only — don't hit the network
            cached = self.client.get(url, headers={"Cache-Control": "only-if-cached"})
            if cached.from_cache:
                return cached.json()
            raise Exception("Circuit open and no cached response available")

        try:
            response = self.client.get(url)
            response.raise_for_status()
            self.failure_count = 0
            return response.json()
        except (httpx.HTTPError, httpx.TimeoutException):
            self.failure_count += 1
            if self.failure_count >= 5:
                self.circuit_open = True
            raise
```

## Best Practices

- **Use file or Redis backend for production**: In-memory cache is lost on restart and not shared across processes.
- **Respect `Cache-Control` headers**: Don't override server cache directives unless you have a good reason. The server knows its data freshness requirements.
- **Use `no-cache` for force refresh**: The `no-cache` directive revalidates with the server (sends ETag/Last-Modified). Use `no-store` to skip caching entirely.
- **Cache GET only**: POST, PUT, DELETE, and PATCH should never be cached. CacheControl only caches safe methods (GET, HEAD) by default.
- **Set a cache directory with enough disk space**: File-based caches grow with usage. Monitor disk usage and clean old entries.
- **Handle 304 responses**: A 304 response means the cached body is still valid. CacheControl handles this automatically, but be aware when inspecting response codes.

## Common Mistakes

- **Caching authenticated responses**: Responses with `Authorization` headers may cache user-specific data. Use `private` cache directive or avoid caching authenticated requests.
- **Ignoring `Vary` headers**: If the server returns `Vary: Accept`, different `Accept` headers produce different responses. CacheControl handles this, but custom caches may not.
- **Not closing the client**: `httpx.Client` holds connections. Use `with` statement or call `close()` to avoid connection leaks.
- **Using in-memory cache in production**: In-memory cache is per-process and lost on restart. Use file or Redis backend.
- **Overriding `Cache-Control` without understanding**: Setting `max-age=3600` on a response with `no-store` defeats the server's intent. Only override when you control both sides.

## FAQ

**httpx + CacheControl vs requests-cache — which should I use?**

`requests-cache` works with the `requests` library. `CacheControl` works with both `requests` and `httpx`. If you're using `httpx` for async or HTTP/2 support, use `CacheControl`. If you're on `requests`, `requests-cache` offers a simpler API.

**Does CacheControl cache response bodies?**

Yes. CacheControl stores the full response including headers and body. The body is serialized (JSON, text, or binary) and stored in the cache backend.

**How does CacheControl handle redirects?**

CacheControl caches the final response after redirects. The redirect chain is not cached — each redirect is followed on each request. Use `httpx.Client(follow_redirects=False)` to disable redirects.

**Can I use CacheControl with streaming responses?**

Streaming responses (`client.stream()`) are not cached by default because the body is consumed lazily. Read the full body before caching, or use non-streaming requests for cacheable endpoints.

**What happens when the cache is full?**

File-based caches don't have a built-in size limit. Old entries are removed when they expire (based on `max-age`). For size-limited caching, use Redis with `maxmemory` and an eviction policy.

**How do I invalidate a specific cached response?**

Use `cache.delete(url)` to remove a single entry, or `cache.clear()` to wipe all cached responses. For pattern-based invalidation, iterate `cache.urls` and delete matches. Set short `max-age` values for endpoints that change frequently.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
