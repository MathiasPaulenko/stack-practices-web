---
contentType: recipes
slug: python-async-gather-concurrent-requests
title: "Concurrent HTTP Requests with asyncio.gather and aiohttp"
description: "Fetch multiple HTTP endpoints concurrently using asyncio.gather and aiohttp with error handling, rate limiting, timeouts, and connection pooling"
metaDescription: "Make concurrent HTTP requests with asyncio.gather and aiohttp. Handle errors, set timeouts, limit concurrency with semaphores, and reuse connections."
difficulty: intermediate
topics:
  - performance
  - concurrency
tags:
  - python
  - asyncio
  - aiohttp
  - concurrent requests
  - performance
relatedResources:
  - /recipes/security/python-rate-limiting-fastapi-redis
  - /recipes/ai/python-llm-streaming-responses
  - /recipes/caching/redis-rate-limiting-token-bucket
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Make concurrent HTTP requests with asyncio.gather and aiohttp. Handle errors, set timeouts, limit concurrency with semaphores, and reuse connections."
  keywords:
    - asyncio gather
    - aiohttp concurrent
    - python async http
    - concurrent requests python
    - async performance
---

# Concurrent HTTP Requests with asyncio.gather and aiohttp

Fetching 100 endpoints sequentially takes 100x the latency of a single request. `asyncio.gather` runs them concurrently, cutting total time to the slowest request. Below: concurrent fetching with `aiohttp`, error handling, semaphores for rate limiting, timeouts, and connection pooling.

## When to Use This

- Fetching data from multiple APIs simultaneously
- Web scraping with concurrent page downloads
- Batch processing of HTTP-based tasks (e.g., calling 100 LLM endpoints)
- Any I/O-bound workload where requests are independent

## Prerequisites

- Python 3.10+
- `aiohttp` package (`pip install aiohttp`)

## Solution

### 1. Install Dependencies

```bash
pip install aiohttp
```

### 2. Basic Concurrent Fetch

```python
import asyncio
import aiohttp
import time

async def fetch_url(session: aiohttp.ClientSession, url: str) -> dict:
    """Fetch a single URL and return status + content.

    Args:
        session: aiohttp client session.
        url: URL to fetch.

    Returns:
        Dict with url, status, and text.
    """
    async with session.get(url) as response:
        return {
            "url": url,
            "status": response.status,
            "text": await response.text(),
        }

async def fetch_all(urls: list[str]) -> list[dict]:
    """Fetch all URLs concurrently.

    Args:
        urls: List of URLs to fetch.

    Returns:
        List of result dicts in the same order as input URLs.
    """
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        results = await asyncio.gather(*tasks)
        return results

# Usage
urls = [
    "https://httpbin.org/delay/1",
    "https://httpbin.org/delay/1",
    "https://httpbin.org/delay/1",
    "https://httpbin.org/delay/1",
    "https://httpbin.org/delay/1",
]

start = time.time()
results = asyncio.run(fetch_all(urls))
elapsed = time.time() - start

print(f"Fetched {len(urls)} URLs in {elapsed:.2f}s (concurrent)")
# ~1.2s instead of ~5s sequential
```

### 3. Error Handling with return_exceptions

```python
async def fetch_all_safe(urls: list[str]) -> list[dict | Exception]:
    """Fetch all URLs, capturing exceptions instead of failing.

    Args:
        urls: List of URLs.

    Returns:
        List of results or Exception objects.
    """
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        # return_exceptions=True prevents one failure from canceling all
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results

# Process results — handle exceptions
results = asyncio.run(fetch_all_safe(urls))
for i, result in enumerate(results):
    if isinstance(result, Exception):
        print(f"URL {i} failed: {result}")
    else:
        print(f"URL {i}: status {result['status']}")
```

### 4. Concurrency Limiting with Semaphore

```python
async def fetch_with_limit(
    urls: list[str],
    max_concurrent: int = 10,
) -> list[dict | Exception]:
    """Fetch URLs with a concurrency limit to avoid overwhelming servers.

    Args:
        urls: List of URLs.
        max_concurrent: Maximum simultaneous requests.

    Returns:
        List of results or exceptions.
    """
    semaphore = asyncio.Semaphore(max_concurrent)

    async def bounded_fetch(session: aiohttp.ClientSession, url: str) -> dict:
        async with semaphore:
            return await fetch_url(session, url)

    async with aiohttp.ClientSession() as session:
        tasks = [bounded_fetch(session, url) for url in urls]
        return await asyncio.gather(*tasks, return_exceptions=True)

# Limit to 10 concurrent requests
results = asyncio.run(fetch_with_limit(urls, max_concurrent=10))
```

### 5. Timeouts

```python
import aiohttp

async def fetch_with_timeout(
    session: aiohttp.ClientSession,
    url: str,
    timeout_seconds: float = 10.0,
) -> dict:
    """Fetch with a per-request timeout.

    Args:
        session: aiohttp session.
        url: URL to fetch.
        timeout_seconds: Timeout in seconds.

    Returns:
        Result dict or timeout error.
    """
    timeout = aiohttp.ClientTimeout(total=timeout_seconds)
    try:
        async with session.get(url, timeout=timeout) as response:
            return {
                "url": url,
                "status": response.status,
                "text": await response.text(),
            }
    except asyncio.TimeoutError:
        return {"url": url, "status": 0, "error": "timeout"}
    except aiohttp.ClientError as e:
        return {"url": url, "status": 0, "error": str(e)}

async def fetch_all_with_timeouts(urls: list[str], timeout: float = 10.0) -> list[dict]:
    """Fetch all URLs with timeouts."""
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_with_timeout(session, url, timeout) for url in urls]
        return await asyncio.gather(*tasks)
```

### 6. Connection Pooling with Session Config

```python
async def fetch_with_pool(
    urls: list[str],
    max_concurrent: int = 20,
) -> list[dict | Exception]:
    """Fetch with optimized connection pool settings.

    Args:
        urls: List of URLs.
        max_concurrent: Max concurrent requests.

    Returns:
        List of results.
    """
    # Configure connection pool
    connector = aiohttp.TCPConnector(
        limit=max_concurrent,       # Total connection limit
        limit_per_host=5,           # Per-host limit
        ttl_dns_cache=300,          # DNS cache TTL in seconds
        enable_cleanup_closed=True,
    )

    timeout = aiohttp.ClientTimeout(
        total=30,      # Total timeout
        connect=10,    # Connection timeout
        sock_read=10,  # Socket read timeout
    )

    semaphore = asyncio.Semaphore(max_concurrent)

    async def bounded_fetch(session, url):
        async with semaphore:
            return await fetch_url(session, url)

    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        tasks = [bounded_fetch(session, url) for url in urls]
        return await asyncio.gather(*tasks, return_exceptions=True)
```

### 7. Progress Tracking

```python
async def fetch_with_progress(urls: list[str]) -> list[dict | Exception]:
    """Fetch URLs with real-time progress tracking."""
    results = [None] * len(urls)
    completed = 0

    async def fetch_and_track(session: aiohttp.ClientSession, index: int, url: str):
        nonlocal completed
        try:
            result = await fetch_url(session, url)
            results[index] = result
        except Exception as e:
            results[index] = e
        finally:
            completed += 1
            print(f"\rProgress: {completed}/{len(urls)}", end="", flush=True)

    async with aiohttp.ClientSession() as session:
        tasks = [fetch_and_track(session, i, url) for i, url in enumerate(urls)]
        await asyncio.gather(*tasks)

    print()  # New line after progress
    return results
```

## How It Works

1. **`asyncio.gather(*tasks)`** schedules all coroutines concurrently. The event loop runs them in parallel, switching between tasks at `await` points (I/O operations).
2. **`aiohttp.ClientSession`** manages a connection pool. Reusing a session across requests avoids creating new TCP connections for each request, reducing overhead.
3. **`asyncio.Semaphore`** limits the number of concurrent operations. When `max_concurrent` tasks are running, additional tasks wait until a slot is released.
4. **`return_exceptions=True`** makes `gather` return exceptions as values instead of raising them. This prevents one failed request from canceling all other in-flight requests.
5. **`ClientTimeout`** sets per-request deadlines. `total` is the overall timeout; `connect` is the TCP connection timeout; `sock_read` is the timeout for reading response data.

## Variants

### Batch Processing with Chunks

```python
async def fetch_in_batches(
    urls: list[str],
    batch_size: int = 50,
) -> list[dict | Exception]:
    """Fetch URLs in batches to control memory and rate."""
    results = []

    for i in range(0, len(urls), batch_size):
        batch = urls[i:i + batch_size]
        batch_results = await fetch_all_safe(batch)
        results.extend(batch_results)
        print(f"Completed batch {i // batch_size + 1}")

    return results
```

### Retry with Exponential Backoff

```python
async def fetch_with_retry(
    session: aiohttp.ClientSession,
    url: str,
    max_retries: int = 3,
    base_delay: float = 1.0,
) -> dict:
    """Fetch with retry and exponential backoff."""
    for attempt in range(max_retries):
        try:
            async with session.get(url) as response:
                if response.status == 429:
                    raise aiohttp.ClientError("Rate limited")
                return {
                    "url": url,
                    "status": response.status,
                    "text": await response.text(),
                }
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            if attempt == max_retries - 1:
                return {"url": url, "error": str(e), "attempts": attempt + 1}
            delay = base_delay * (2 ** attempt)
            print(f"Retry {attempt + 1}/{max_retries} for {url} in {delay}s")
            await asyncio.sleep(delay)

async def fetch_all_with_retry(urls: list[str]) -> list[dict]:
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_with_retry(session, url) for url in urls]
        return await asyncio.gather(*tasks)
```

### POST Requests with JSON

```python
async def post_json(
    session: aiohttp.ClientSession,
    url: str,
    data: dict,
) -> dict:
    """Send a POST request with JSON body."""
    async with session.post(url, json=data) as response:
        return {
            "url": url,
            "status": response.status,
            "json": await response.json(),
        }

async def post_all(
    url: str,
    payloads: list[dict],
) -> list[dict]:
    """Send multiple POST requests concurrently."""
    async with aiohttp.ClientSession() as session:
        tasks = [post_json(session, url, payload) for payload in payloads]
        return await asyncio.gather(*tasks)
```

### Using httpx (Alternative to aiohttp)

```python
import httpx
import asyncio

async def fetch_httpx(urls: list[str]) -> list[dict]:
    """Concurrent fetch using httpx (syncs with requests API)."""
    async with httpx.AsyncClient() as client:
        tasks = [client.get(url) for url in urls]
        responses = await asyncio.gather(*tasks)
        return [
            {"url": str(r.url), "status": r.status_code, "text": r.text}
            for r in responses
        ]
```

## Best Practices

- **Reuse `ClientSession`** — creating a new session per request wastes TCP connections
- **Set `limit_per_host`** — avoid overwhelming a single server with too many connections
- **Use semaphores for rate limiting** — respect API rate limits and server capacity
- **Always set timeouts** — without timeouts, a slow server can block your entire application

## Common Mistakes

- **Creating a new `ClientSession` per request** — defeats connection pooling; create one session and reuse it
- **Not using `return_exceptions=True`** — one failed request cancels all others in the batch
- **No concurrency limit** — fetching 10,000 URLs simultaneously overwhelms both your machine and the server
- **Using `asyncio.run()` inside an existing event loop** — raises `RuntimeError`; use `await` instead

## FAQ

**Q: How many concurrent requests should I make?**
A: Start with 10-50. For APIs with rate limits, match the limit (e.g., 10 for a 10 req/s API). For your own servers, 100+ is fine.

**Q: asyncio.gather vs. asyncio.TaskGroup — which to use?**
A: `TaskGroup` (Python 3.11+) is the modern approach with better error handling. Use `gather` for simpler cases and backward compatibility.

**Q: aiohttp vs. httpx — which should I use?**
A: Both work well. `aiohttp` is more mature for async. `httpx` has a cleaner API and supports both sync and async. Choose based on your preference.

**Q: Can I use `requests` with asyncio?**
A: No — `requests` is synchronous and blocks the event loop. Use `aiohttp` or `httpx` for async HTTP.
