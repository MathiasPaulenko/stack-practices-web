---
contentType: recipes
slug: python-async-http-requests
title: "Make Concurrent HTTP Requests with Python and aiohttp"
description: "Fetch multiple APIs concurrently using asyncio and aiohttp. Covers connection pooling, rate limiting, retries, and batch processing."
metaDescription: "Make concurrent HTTP requests in Python with asyncio and aiohttp. Connection pooling, rate limiting, retries, batch processing and error handling."
difficulty: intermediate
topics:
  - concurrency
  - api
tags:
  - python
  - asyncio
  - aiohttp
  - async
  - http
  - concurrency
relatedResources:
  - /recipes/api/javascript-fetch-retry-logic
  - /recipes/api/nodejs-websocket-realtime
  - /guides/async-programming-guide
  - /patterns/circuit-breaker-pattern
  - /patterns/rate-limiter-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Make concurrent HTTP requests in Python with asyncio and aiohttp. Connection pooling, rate limiting, retries, batch processing and error handling."
  keywords:
    - python async http requests
    - aiohttp concurrent requests
    - asyncio http client
    - python async api calls
    - aiohttp session pooling
    - python async batch requests
---

## Overview

Making HTTP requests one at a time is slow when you need to fetch from multiple APIs or endpoints. `asyncio` with `aiohttp` lets you run many requests concurrently, reducing total time from the sum of all request times to the longest single request. This recipe covers concurrent fetching, connection pooling, rate limiting, retries, and batch processing.

## When to Use

- You need to fetch data from multiple APIs or endpoints simultaneously
- You are building a web scraper that fetches many pages
- You need to call multiple microservices and aggregate results
- Sequential HTTP requests are too slow for your use case

## Solution

### Install aiohttp

```bash
pip install aiohttp
```

### Basic concurrent requests

```python
import asyncio
import aiohttp

async def fetch(session: aiohttp.ClientSession, url: str) -> dict:
    async with session.get(url) as response:
        response.raise_for_status()
        return await response.json()

async def fetch_all(urls: list[str]) -> list[dict]:
    async with aiohttp.ClientSession() as session:
        tasks = [fetch(session, url) for url in urls]
        results = await asyncio.gather(*tasks)
        return results

# Usage
urls = [
    "https://api.github.com/users/octocat",
    "https://api.github.com/users/torvalds",
    "https://api.github.com/users/gvanrossum",
]

results = asyncio.run(fetch_all(urls))
for r in results:
    print(r["login"])
```

### Connection pooling with ClientSession

```python
import asyncio
import aiohttp

async def fetch_with_pool(urls: list[str]) -> list[dict]:
    # Reuse a single session for all requests — connection pooling
    connector = aiohttp.TCPConnector(
        limit=100,          # Max total connections
        limit_per_host=10,  # Max connections per host
        ttl_dns_cache=300,  # DNS cache TTL in seconds
    )
    timeout = aiohttp.ClientTimeout(total=30, connect=10)

    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        tasks = [fetch(session, url) for url in urls]
        return await asyncio.gather(*tasks)
```

### Rate limiting with a semaphore

```python
import asyncio
import aiohttp

async def rate_limited_fetch(urls: list[str], max_concurrent: int = 10) -> list[dict]:
    semaphore = asyncio.Semaphore(max_concurrent)

    async def fetch_limited(session: aiohttp.ClientSession, url: str) -> dict:
        async with semaphore:
            async with session.get(url) as response:
                response.raise_for_status()
                return await response.json()

    async with aiohttp.ClientSession() as session:
        tasks = [fetch_limited(session, url) for url in urls]
        return await asyncio.gather(*tasks)

# Limit to 5 concurrent requests
results = asyncio.run(rate_limited_fetch(urls, max_concurrent=5))
```

### Retries with exponential backoff

```python
import asyncio
import aiohttp
import logging

logger = logging.getLogger(__name__)

async def fetch_with_retry(
    session: aiohttp.ClientSession,
    url: str,
    max_retries: int = 3,
    backoff_factor: float = 0.5
) -> dict:
    for attempt in range(max_retries):
        try:
            async with session.get(url) as response:
                if response.status == 429:
                    retry_after = int(response.headers.get("Retry-After", backoff_factor * (2 ** attempt)))
                    logger.warning(f"Rate limited, retrying in {retry_after}s")
                    await asyncio.sleep(retry_after)
                    continue
                response.raise_for_status()
                return await response.json()
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            if attempt == max_retries - 1:
                raise
            wait = backoff_factor * (2 ** attempt)
            logger.warning(f"Attempt {attempt + 1} failed: {e}, retrying in {wait}s")
            await asyncio.sleep(wait)

async def fetch_all_with_retry(urls: list[str]) -> list[dict]:
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_with_retry(session, url) for url in urls]
        return await asyncio.gather(*tasks)
```

### Batch processing with return_exceptions

```python
import asyncio
import aiohttp

async def fetch_all_safe(urls: list[str]) -> list:
    async with aiohttp.ClientSession() as session:
        tasks = [fetch(session, url) for url in urls]
        # return_exceptions=True prevents one failure from canceling all
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results

# Usage — handle partial failures
results = asyncio.run(fetch_all_safe(urls))
for i, result in enumerate(results):
    if isinstance(result, Exception):
        print(f"URL {i} failed: {result}")
    else:
        print(f"URL {i}: {result.get('login', 'unknown')}")
```

### Processing results as they complete

```python
import asyncio
import aiohttp

async def fetch_progressive(urls: list[str]) -> None:
    async with aiohttp.ClientSession() as session:
        tasks = {asyncio.create_task(fetch(session, url)): url for url in urls}

        for completed in asyncio.as_completed(tasks):
            url = tasks[completed]
            try:
                result = await completed
                print(f"Done: {url} -> {result.get('login', 'unknown')}")
            except Exception as e:
                print(f"Failed: {url} -> {e}")

asyncio.run(fetch_progressive(urls))
```

### POST requests with JSON body

```python
import asyncio
import aiohttp

async def post_data(session: aiohttp.ClientSession, url: str, data: dict) -> dict:
    async with session.post(url, json=data) as response:
        response.raise_for_status()
        return await response.json()

async def create_users(users: list[dict]) -> list[dict]:
    async with aiohttp.ClientSession() as session:
        tasks = [post_data(session, "https://httpbin.org/post", user) for user in users]
        return await asyncio.gather(*tasks)

users = [{"name": "Alice"}, {"name": "Bob"}, {"name": "Charlie"}]
results = asyncio.run(create_users(users))
```

### Custom headers and authentication

```python
import asyncio
import aiohttp

async def fetch_authenticated(urls: list[str], token: str) -> list[dict]:
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "User-Agent": "MyApp/1.0",
    }

    async with aiohttp.ClientSession(headers=headers) as session:
        tasks = [fetch(session, url) for url in urls]
        return await asyncio.gather(*tasks)
```

## Explanation

`asyncio` is Python's async I/O framework. It runs tasks concurrently on a single thread using an event loop. `aiohttp` is an async HTTP client/server that integrates with `asyncio`.

Key concepts:

- **ClientSession**: The equivalent of `requests.Session`. Reuses TCP connections across requests. Always use a single session for all requests in a workflow.
- **asyncio.gather**: Runs multiple coroutines concurrently and returns results in order. If one fails, all fail unless `return_exceptions=True`.
- **Semaphore**: Limits concurrent operations. Use to avoid overwhelming the server or hitting rate limits.
- **as_completed**: Returns results as they finish, not in submission order. Useful for progress reporting.
- **TCPConnector**: Controls connection pooling. `limit` sets max total connections, `limit_per_host` sets max per host.

## Variants

| Approach | Concurrency | Library | Use When |
|----------|-------------|---------|----------|
| asyncio + aiohttp | Async | aiohttp | High concurrency, I/O bound |
| httpx async | Async | httpx | Need sync + async in one library |
| ThreadPoolExecutor | Threads | requests | Simple, blocking library |
| httpx sync | None | httpx | Simple, sequential |

## Guidelines

- Always reuse a single `ClientSession` for all requests. Creating a session per request defeats connection pooling.
- Use a `Semaphore` to limit concurrency. Too many parallel requests can overwhelm the server or trigger rate limits.
- Set timeouts with `ClientTimeout`. Default has no total timeout — a hung request blocks forever.
- Use `return_exceptions=True` with `gather` when partial failures are acceptable.
- Implement retries with exponential backoff for transient failures (429, 500, timeouts).
- Use `as_completed` when you need results as soon as they are available.
- Close sessions properly with `async with` context manager.
- Set a reasonable `limit_per_host` to avoid overwhelming a single server.

## Common Mistakes

- Creating a new `ClientSession` per request. This is slow and wastes connections.
- Not setting a timeout. A hung request blocks the event loop indefinitely.
- Using `requests` inside async code. `requests` is blocking and freezes the event loop.
- Not limiting concurrency. Thousands of parallel requests can exhaust file descriptors or trigger bans.
- Forgetting `await` on `response.json()` or `response.text()`. Returns a coroutine instead of data.
- Not handling `return_exceptions=True` results. Exceptions are returned as values, not raised.
- Using `asyncio.run()` multiple times in the same script. Create one event loop.

## Frequently Asked Questions

### Can I use requests with asyncio?

No. `requests` is a synchronous library. Using it inside async code blocks the event loop. Use `aiohttp` or `httpx` with async support instead.

### What is the difference between gather and as_completed?

`gather` runs all tasks and returns results in submission order. `as_completed` yields results as they finish, not in order. Use `gather` when you need all results together. Use `as_completed` for progress reporting or streaming results.

### How many concurrent requests should I make?

It depends on the server. Start with 10-50 concurrent requests. Check the API's rate limit documentation. Use a `Semaphore` to control the number. Monitor for 429 (Too Many Requests) responses.

### How do I test async HTTP code?

Use `aioresponses` to mock aiohttp requests in tests. Write tests as `async def` and run with `pytest-asyncio`.
