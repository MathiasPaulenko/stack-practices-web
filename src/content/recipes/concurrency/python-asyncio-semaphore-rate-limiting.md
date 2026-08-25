---



contentType: recipes
slug: python-asyncio-semaphore-rate-limiting
title: "asyncio.Semaphore: Limit Concurrent API Calls in Python"
description: "Use asyncio.Semaphore in Python to cap concurrent API calls, database queries, and resource access with practical rate-limiting patterns."
metaDescription: "Limit concurrent async calls in Python with asyncio.Semaphore. Bounded parallelism for API requests, database connections, and rate limiting with code examples."
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
  - /recipes/python-asyncio-gather-task-groups
  - /recipes/python-thread-pool-executor
  - /guides/complete-guide-python-asyncio
  - /guides/concurrency-patterns-guide
  - /recipes/python-async-gather-concurrent-requests
  - /recipes/python-async-http-requests
lastUpdated: "2026-08-25"
publishedAt: "2026-07-03"
author: Mathias Paulenko
seo:
  metaDescription: "Limit concurrent async calls in Python with asyncio.Semaphore. Bounded parallelism for API requests, database connections, and rate limiting with code examples."
  keywords:
    - asyncio semaphore
    - python rate limiting async
    - asyncio bounded parallelism
    - python semaphore rate limit
    - asyncio concurrency control



---

## Overview

`asyncio.Semaphore` puts a cap on how many async operations can run at the same time. That cap keeps you from overwhelming an API, draining a connection pool, or tripping a rate limit. Below you will find basic semaphore usage, rate-limited API calls, connection pool management, dynamic concurrency adjustment, a token bucket, and a combination with timeouts. For more on combining this with task coordination, see [Concurrent Async Tasks with asyncio.gather and Task Groups](/recipes/python-asyncio-gather-task-groups/).

## When to Use

- API calls with rate limits (e.g., 100 requests/minute)
- Database connection pool management
- Limiting concurrent file operations or network connections
- Any scenario where unbounded concurrency causes resource exhaustion

The examples use Python 3.11+ and `aiohttp` for the HTTP snippets.

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
import aiohttp

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

## Explanation

A semaphore starts as a counter set to the limit you choose. When a task calls acquire, the counter goes down by one. When it calls release, the counter goes back up. Once the counter reaches zero, any new caller has to wait until another task releases a slot.

The safest way to hold a slot is to use the context manager. Python takes the slot when the block starts and returns it when the block ends, including when the task raises an exception. You never have to call the release method by hand.

A token bucket is a different beast. Instead of capping how many tasks run at the same time, it caps how fast you can start them. Tokens refill at a fixed rate, and every request spends one. A short burst can exceed the steady rate as long as it fits in the bucket, but the long-term average stays below the limit.

When you call many different hosts, each one may have its own limit. A dictionary that maps hostnames to separate semaphores keeps each host under its own cap, so one slow host doesn't block the others.

An adaptive semaphore watches success and failure rates and moves the limit up or down. If failures pile up, it lowers the limit to give the service room to recover. When things are going well, it nudges the limit up to pull in more throughput.

If you want a broader view of concurrency patterns, the [Concurrency Patterns Guide](/guides/concurrency-patterns-guide/) goes deeper.

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
import asyncio

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

For a deeper guide, see [Concurrent Async Tasks with asyncio.gather and Task Groups](/recipes/python-asyncio-gather-task-groups/).

Pick a limit that matches the resource. For HTTP calls, 10–20 tasks is a reasonable first guess. For databases, stay close to the connection pool size. Then keep an eye on response times and error rates, and move the limit up or down from there.

The context manager should be your default. That way the slot is released even if the task raises, so a crash can't leak it.

Give each service its own cap instead of sharing one semaphore everywhere. Different APIs and hosts tolerate different loads, so their limits should be separate.

Add a timeout alongside the semaphore. Without one, a slow call can park a slot forever and stop the queue.

If tasks spend most of their time waiting for the semaphore, the limit is too low. If the remote service returns errors or starts timing out, the limit is too high.

If the rule is "N requests per second" rather than "N at once", use a token bucket or a leaky bucket instead of a plain semaphore.

## Common Mistakes

It's tempting to reuse the same semaphore for every API, but that usually backfires. One limit either starves the fast APIs or drowns the slow ones.

Calling the acquire and release methods by hand is risky. If an exception pops up between the two calls, the slot is gone for good. Use the context manager so release happens automatically.

Sending 100 requests at once to a rate-limited API usually gets most of them rejected. Start close to the limit the API publishes.

It's easy to mix up concurrency and rate. A semaphore means "run at most N at once", not "send at most N per second", so don't confuse the two. The latter needs a token bucket or a leaky bucket.

If high-priority tasks keep waiting behind low-priority ones, a plain semaphore isn't enough. Add priority-aware queuing or another scheduling strategy.

## FAQ

### How is a semaphore different from a lock?

A lock lets only one task through at a time, while a semaphore lets N through. That makes a lock a special case of a semaphore where the limit is 1.

### How do I pick a good concurrency limit?

For HTTP calls, 10 concurrent tasks is a sensible starting point. Keep an eye on both the error rate and the response time. If both stay healthy, raise the limit; if errors climb or latency spikes, lower it. The API documentation usually lists the rate limit you should respect.

### Can the semaphore limit change while the program runs?

The standard library class doesn't expose a resize method. You can build a wrapper that adds slots by calling `release()` or removes them by calling `acquire()`. Alternatively, replace the whole semaphore with a new one that starts with a different limit.

### Do I need a semaphore if I already have a connection pool?

For databases, the connection pool already limits how many connections are open, so an extra semaphore is usually redundant. HTTP clients and other clients that don't come with their own pool are good candidates for a semaphore.

### What if a task holds a slot and never finishes?

Everything behind that task backs up and waits. Add a timeout with `asyncio.wait_for` or `asyncio.timeout()`. If the work drags on too long, the timeout triggers, the slot goes back into the pool, and the remaining tasks keep moving.
