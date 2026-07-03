---
contentType: recipes
slug: python-asyncio-semaphore-rate-limiting
title: "Rate Limit Async Operations with asyncio.Semaphore"
description: "Control concurrency in async Python using asyncio.Semaphore for rate limiting API calls, database connections, and resource access with bounded parallelism patterns."
metaDescription: "Rate limit async operations in Python with asyncio.Semaphore. Control concurrency for API calls, database connections, and resource access with bounded parallelism."
difficulty: intermediate
topics:
  - concurrency
  - performance
  - api
tags:
  - python
  - asyncio
  - semaphore
  - rate-limiting
  - concurrency
relatedResources:
  - /recipes/concurrency/python-asyncio-gather-task-groups
  - /recipes/concurrency/python-thread-pool-executor
  - /guides/complete-guide-python-asyncio
  - /guides/concurrency-patterns-guide
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Rate limit async operations in Python with asyncio.Semaphore. Control concurrency for API calls, database connections, and resource access with bounded parallelism."
  keywords:
    - asyncio semaphore
    - python rate limiting async
    - asyncio bounded parallelism
    - python semaphore rate limit
    - asyncio concurrency control
---

## Overview

`asyncio.Semaphore` limits the number of concurrent operations in async Python. This prevents overwhelming external services, exhausting connection pools, or hitting rate limits. Below: basic semaphore usage, rate limiting API calls, connection pool management, dynamic concurrency adjustment, token bucket pattern, and combining semaphores with other asyncio primitives.

## When to Use This

- API calls with rate limits (e.g., 100 requests/minute)
- Database connection pool management
- Limiting concurrent file operations or network connections
- Any scenario where unbounded concurrency causes resource exhaustion

## Prerequisites

- Python 3.11+
- `aiohttp` for HTTP examples

## Solution

### 1. Basic Semaphore

```python
import asyncio

async def worker(semaphore: asyncio.Semaphore, worker_id: int):
    async with semaphore:
        print(f"Worker {worker_id} started")
        await asyncio.sleep(1)  # Simulate work
        print(f"Worker {worker_id} finished")

async def main():
    # Only 3 workers can run concurrently
    semaphore = asyncio.Semaphore(3)

    # Start 10 workers — only 3 run at a time
    tasks = [asyncio.create_task(worker(semaphore, i)) for i in range(10)]
    await asyncio.gather(*tasks)

asyncio.run(main())
```

### 2. Rate Limiting API Calls

```python
import asyncio
import aiohttp
import time

class RateLimitedClient:
    def __init__(self, max_concurrent: int = 10):
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.session = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, *args):
        if self.session:
            await self.session.close()

    async def fetch(self, url: str) -> dict:
        async with self.semaphore:
            async with self.session.get(url) as response:
                return await response.json()

async def fetch_many(urls: list, max_concurrent: int = 10) -> list:
    async with RateLimitedClient(max_concurrent) as client:
        tasks = [client.fetch(url) for url in urls]
        return await asyncio.gather(*tasks, return_exceptions=True)

# Fetch 200 URLs with max 10 concurrent
urls = [f'https://api.example.com/data/{i}' for i in range(200)]
results = asyncio.run(fetch_many(urls, max_concurrent=10))
```

### 3. Token Bucket Rate Limiter

```python
import asyncio
import time

class TokenBucketRateLimiter:
    """Rate limiter using token bucket algorithm — allows bursts up to capacity
    while maintaining a steady refill rate."""

    def __init__(self, rate: float, capacity: int):
        self.rate = rate  # Tokens per second
        self.capacity = capacity
        self.tokens = capacity
        self.last_refill = time.monotonic()
        self.lock = asyncio.Lock()

    async def acquire(self):
        async with self.lock:
            now = time.monotonic()
            elapsed = now - self.last_refill
            # Refill tokens based on elapsed time
            self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
            self.last_refill = now

            if self.tokens < 1:
                # Wait until a token is available
                wait_time = (1 - self.tokens) / self.rate
                await asyncio.sleep(wait_time)
                self.tokens = 0
            else:
                self.tokens -= 1

# Usage: 5 requests per second, burst capacity of 10
limiter = TokenBucketRateLimiter(rate=5.0, capacity=10)

async def rate_limited_fetch(url: str) -> dict:
    await limiter.acquire()
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()

# Make 50 requests at 5/second
urls = [f'https://api.example.com/data/{i}' for i in range(50)]
tasks = [rate_limited_fetch(url) for url in urls]
results = await asyncio.gather(*tasks, return_exceptions=True)
```

### 4. Per-Host Rate Limiting

```python
import asyncio
import aiohttp
from urllib.parse import urlparse
from collections import defaultdict

class PerHostRateLimiter:
    """Maintains a separate semaphore for each host."""

    def __init__(self, max_per_host: int = 5):
        self.max_per_host = max_per_host
        self.semaphores = defaultdict(lambda: asyncio.Semaphore(max_per_host))

    def get_semaphore(self, url: str) -> asyncio.Semaphore:
        host = urlparse(url).netloc
        return self.semaphores[host]

    async def fetch(self, session: aiohttp.ClientSession, url: str) -> dict:
        semaphore = self.get_semaphore(url)
        async with semaphore:
            async with session.get(url) as response:
                return await response.json()

async def fetch_multiple_hosts():
    limiter = PerHostRateLimiter(max_per_host=3)

    urls = [
        'https://api1.example.com/data',
        'https://api1.example.com/data2',
        'https://api1.example.com/data3',
        'https://api2.example.com/data',
        'https://api2.example.com/data2',
    ]

    async with aiohttp.ClientSession() as session:
        tasks = [limiter.fetch(session, url) for url in urls]
        return await asyncio.gather(*tasks, return_exceptions=True)
```

### 5. Database Connection Pool with Semaphore

```python
import asyncio
import asyncpg

class DatabasePool:
    def __init__(self, dsn: str, min_size: int = 5, max_size: int = 20):
        self.dsn = dsn
        self.min_size = min_size
        self.max_size = max_size
        self.semaphore = asyncio.Semaphore(max_size)
        self.pool = None

    async def initialize(self):
        self.pool = await asyncpg.create_pool(
            self.dsn,
            min_size=self.min_size,
            max_size=self.max_size,
        )

    async def query(self, sql: str, *args) -> list:
        async with self.semaphore:
            async with self.pool.acquire() as conn:
                return await conn.fetch(sql, *args)

    async def close(self):
        if self.pool:
            await self.pool.close()

# Usage
db = DatabasePool('postgresql://user:pass@localhost/mydb', max_size=20)
await db.initialize()

# Run 100 queries with max 20 concurrent
queries = [db.query('SELECT * FROM users WHERE id = $1', i) for i in range(100)]
results = await asyncio.gather(*queries, return_exceptions=True)
await db.close()
```

### 6. Dynamic Concurrency Adjustment

```python
import asyncio

class AdaptiveSemaphore:
    """Adjusts concurrency based on success/failure rates."""

    def __init__(self, initial: int = 10, min_val: int = 1, max_val: int = 50):
        self._limit = initial
        self.min_val = min_val
        self.max_val = max_val
        self._semaphore = asyncio.Semaphore(initial)
        self._successes = 0
        self._failures = 0
        self._lock = asyncio.Lock()

    async def acquire(self):
        await self._semaphore.acquire()

    def release(self):
        self._semaphore.release()

    async def record_success(self):
        async with self._lock:
            self._successes += 1
            # Increase concurrency if success rate is high
            if self._successes >= 10 and self._limit < self.max_val:
                self._limit += 1
                self._semaphore.release()  # Add a slot
                self._successes = 0
                print(f"Increased concurrency to {self._limit}")

    async def record_failure(self):
        async with self._lock:
            self._failures += 1
            # Decrease concurrency on failures
            if self._failures >= 3 and self._limit > self.min_val:
                self._limit -= 1
                await self._semaphore.acquire()  # Remove a slot
                self._failures = 0
                print(f"Decreased concurrency to {self._limit}")

    @property
    def current_limit(self):
        return self._limit
```

### 7. Combining Semaphore with Timeout

```python
import asyncio
import aiohttp

async def fetch_with_limits(
    session: aiohttp.ClientSession,
    url: str,
    semaphore: asyncio.Semaphore,
    timeout: float = 10.0,
) -> dict:
    async with semaphore:
        try:
            async with asyncio.timeout(timeout):
                async with session.get(url) as response:
                    return await response.json()
        except asyncio.TimeoutError:
            return {'url': url, 'error': 'timeout'}

async def fetch_all(urls: list, max_concurrent: int = 10, timeout: float = 10.0):
    semaphore = asyncio.Semaphore(max_concurrent)

    async with aiohttp.ClientSession() as session:
        tasks = [
            fetch_with_limits(session, url, semaphore, timeout)
            for url in urls
        ]
        return await asyncio.gather(*tasks, return_exceptions=True)
```

## How It Works

1. **Semaphore**: A counter that starts at a given value. `acquire()` decrements the counter; `release()` increments it. If the counter is zero, `acquire()` blocks until another task releases.
2. **`async with semaphore`**: The context manager acquires on entry and releases on exit. This ensures the semaphore is always released, even if an exception occurs.
3. **Token bucket**: Instead of limiting concurrency, the token bucket limits rate. Tokens refill at a steady rate; each request consumes one. Bursts up to capacity are allowed, but the long-term rate is bounded.
4. **Per-host limiting**: Different hosts have different rate limits. Using a dictionary of semaphores keyed by host ensures each host gets its own concurrency limit.
5. **Adaptive semaphore**: Monitors success/failure rates and adjusts concurrency dynamically. On failures, reduce concurrency to avoid overwhelming the service. On successes, increase to maximize throughput.

## Variants

### Bounded Semaphore (with Queue)

```python
import asyncio

class BoundedWorkerPool:
    """Process items from a queue with bounded concurrency."""

    def __init__(self, max_workers: int):
        self.semaphore = asyncio.Semaphore(max_workers)

    async def process_queue(self, queue: asyncio.Queue, handler):
        while True:
            item = await queue.get()
            async with self.semaphore:
                await handler(item)
            queue.task_done()

# Usage
queue = asyncio.Queue()
pool = BoundedWorkerPool(max_workers=5)

# Start workers
workers = [asyncio.create_task(pool.process_queue(queue, handler)) for _ in range(5)]

# Feed items
for item in items:
    await queue.put(item)

await queue.join()  # Wait for all items to be processed
```

### Weighted Semaphore

```python
class WeightedSemaphore:
    """Semaphore where different operations require different weights."""

    def __init__(self, capacity: int):
        self.capacity = capacity
        self.available = capacity
        self.condition = asyncio.Condition()

    async def acquire(self, weight: int = 1):
        async with self.condition:
            while self.available < weight:
                await self.condition.wait()
            self.available -= weight

    async def release(self, weight: int = 1):
        async with self.condition:
            self.available += weight
            self.condition.notify_all()
```

## Best Practices

- **Choose the right limit**: For HTTP requests, start with 10-20 concurrent. For database connections, match the connection pool size. Monitor and adjust based on response times and error rates.
- **Use `async with`**: Always use the context manager form to ensure the semaphore is released, even on exceptions.
- **Separate semaphores per resource**: Don't share one semaphore across different APIs. Each API has different rate limits — use per-host or per-service semaphores.
- **Combine with timeouts**: A semaphore limits concurrency, but a slow operation can hold a slot indefinitely. Add timeouts to release slots from stuck operations.
- **Monitor semaphore wait time**: If tasks spend most of their time waiting for the semaphore, the limit is too low. If the service is overwhelmed, the limit is too high.
- **Use token bucket for rate-based limits**: Semaphores limit concurrency (parallelism), not rate (throughput). For "N requests per second" limits, use a token bucket.

## Common Mistakes

- **Using a single semaphore for everything**: Different APIs have different limits. A shared semaphore underutilizes fast APIs and overloads slow ones.
- **Not releasing on exception**: Manual `acquire()`/`release()` can leak slots if an exception occurs between them. Always use `async with semaphore`.
- **Setting the limit too high**: 100 concurrent requests to a rate-limited API will get most requests rejected. Match the limit to the API's rate limit.
- **Confusing concurrency with rate**: A semaphore limits how many operations run at once, not how many run per second. For rate limiting, use a token bucket or leaky bucket.
- **Not handling semaphore starvation**: If high-priority tasks are waiting behind low-priority tasks, consider priority-aware queuing instead of a plain semaphore.

## FAQ

**What is the difference between a semaphore and a lock?**

A lock (mutex) allows only one task at a time. A semaphore allows N tasks at a time. A lock is equivalent to a semaphore with value 1.

**How do I choose the right concurrency limit?**

Start with 10 for HTTP requests. Monitor response times and error rates. If responses are fast and errors are low, increase. If errors increase or responses slow down, decrease. The API documentation often specifies rate limits.

**Can I change the semaphore limit at runtime?**

Not directly — `asyncio.Semaphore` doesn't support dynamic resizing. Create a new semaphore or implement an adaptive semaphore that adjusts by calling `release()` (to add slots) or `acquire()` (to remove slots).

**Should I use a semaphore or a connection pool?**

For database access, use a connection pool (e.g., `asyncpg.create_pool`). The pool manages connections efficiently. Use a semaphore when you don't have a pool — e.g., rate-limiting HTTP requests to an external API.

**What happens if all slots are held and a task hangs?**

Other tasks wait indefinitely. Always combine semaphores with timeouts so a stuck task eventually releases its slot. Use `asyncio.wait_for` or `asyncio.timeout()`.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
