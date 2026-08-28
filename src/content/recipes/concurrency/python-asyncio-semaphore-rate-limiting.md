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
lastUpdated: "2026-08-28"
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

`asyncio.Semaphore` puts a cap on how many async operations can run at the same time. That cap keeps you from overwhelming an API, draining a connection pool, or tripping a rate limit. I reach for it whenever I see code that fans out to dozens or hundreds of concurrent requests and the remote service starts pushing back with 429s or timeouts. Below you will find basic semaphore usage, rate-limited API calls, connection pool management, dynamic concurrency adjustment, a token bucket, and a combination with timeouts. For more on combining this with task coordination, see [Concurrent Async Tasks with asyncio.gather and Task Groups](/recipes/python-asyncio-gather-task-groups/).

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

```mermaid
flowchart LR
    A[Task calls acquire] --> B{Counter > 0?}
    B -->|Yes| C[Counter decrements]
    C --> D[Task runs work]
    D --> E[Task calls release]
    E --> F[Counter increments]
    B -->|No| G[Task waits in queue]
    G --> F
    F --> H{Queue has waiters?}
    H -->|Yes| I[Wake next waiter]
    I --> C
    H -->|No| J[Done]
```

A semaphore starts as a counter set to the limit you choose. When a task calls [acquire](https://docs.python.org/3/library/asyncio-sync.html#asyncio.Semaphore.acquire), the counter goes down by one. When it calls release, the counter goes back up. Once the counter reaches zero, any new caller has to wait until another task releases a slot. The [Python asyncio documentation](https://docs.python.org/3/library/asyncio-sync.html) describes this as a classic counting semaphore.

The safest way to hold a slot is to use the context manager. Python takes the slot when the block starts and returns it when the block ends, including when the task raises an exception. You never have to call the release method by hand. I learned this the hard way early on — a bare `acquire()` followed by a network call that timed out left the semaphore permanently short one slot, and the whole pipeline ground to a halt after a few hours.

A token bucket works differently. Instead of capping how many tasks run at the same time, it caps how fast you can start them. Tokens refill at a fixed rate, and every request spends one. A short burst can exceed the steady rate as long as it fits in the bucket, but the long-term average stays below the limit. Libraries like [aiolimiter](https://github.com/mjpieters/aiolimiter) implement this pattern so you don't have to roll your own.

When you're hitting many different hosts, each one tends to have its own tolerance for load. A dictionary that maps hostnames to separate semaphores keeps each host under its own cap, so one slow host doesn't block the others. This matters more than people think — I once debugged a scraper that was stuck for minutes on a single slow API because all 50 concurrent slots were shared across hosts, and the slow endpoint had monopolized every one of them.

An adaptive semaphore watches success and failure rates and moves the limit up or down. If failures pile up, it lowers the limit to give the service room to recover. When things are going well, it nudges the limit up to pull in more throughput. The [aiohttp](https://docs.aiohttp.org/) client has its own connector limit, which you can combine with a semaphore for layered control.

One edge case worth knowing: `asyncio.Semaphore` isn't thread-safe. If you mix threads and asyncio (for example, with [run_in_executor](https://docs.python.org/3/library/asyncio-eventloop.html#asyncio.loop.run_in_executor)), you need a separate synchronization primitive for the thread side. The [asyncio.Lock](https://docs.python.org/3/library/asyncio-sync.html#asyncio.Lock) and Semaphore are designed for single-threaded coroutine scheduling, not for cross-thread coordination.

If you want a broader view of concurrency patterns, the [Concurrency Patterns Guide](/guides/concurrency-patterns-guide/) goes deeper. For HTTP-specific patterns, see [Async HTTP Requests in Python](/recipes/python-async-http-requests/).

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

I always pick a limit that matches the resource. For HTTP calls, 10–20 tasks is a reasonable first guess. For databases, I stay close to the connection pool size. Then I keep an eye on response times and error rates, and move the limit up or down from there.

The context manager is your default — don't fight it. That way the slot is released even if the task raises, so a crash can't leak it. I've seen production bugs where a bare `acquire()` without a `try/finally` slowly drained the semaphore over hours — don't repeat that mistake.

I give each service its own cap instead of sharing one semaphore everywhere. Different APIs and hosts tolerate different loads, so their limits should be separate.

Add a timeout alongside the semaphore. Without one, a slow call can park a slot forever and stop the queue. I always pair `asyncio.timeout()` with the semaphore context manager — the timeout fires, the exception propagates, and the `async with` block releases the slot cleanly.

If tasks spend most of their time waiting for the semaphore, the limit is too low. If the remote service returns errors or starts timing out, the limit is too high.

If the rule is "N requests per second" rather than "N at once", use a token bucket or a leaky bucket instead of a plain semaphore. [aiolimiter](https://github.com/mjpieters/aiolimiter) is a solid library that handles this for you.

## Common Mistakes

It's tempting to reuse the same semaphore for every API, but that backfires more often than not. One limit either starves the fast APIs or drowns the slow ones. I made this mistake once with a pipeline that hit three different APIs — the slowest one held all the slots and the fast ones waited behind it for no reason.

Calling the acquire and release methods by hand is risky. If an exception pops up between the two calls, the slot is gone for good. Use the context manager so release happens automatically.

Sending 100 requests at once to a rate-limited API usually gets most of them rejected. Start close to the limit the API publishes. If the docs say "10 requests per second", don't open 50 concurrent connections and hope for the best.

It's easy to mix up concurrency and rate. A semaphore means "run at most N at once", not "send at most N per second", so don't confuse the two. The latter needs a token bucket or a leaky bucket.

If high-priority tasks keep waiting behind low-priority ones, a plain semaphore isn't enough. I ran into this with a job queue where urgent tasks sat behind batch imports — adding a priority queue fixed it, but it took a while to diagnose because the semaphore itself looked healthy.

## When Not to Use This Approach

A semaphore isn't always the right answer. I skip it in a few situations:

- **You already have a connection pool.** [asyncpg](https://magicstack.github.io/asyncpg/) and [SQLAlchemy async](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html) both manage their own pool size. Adding a semaphore on top is redundant and can deadlock if the pool waits for a slot that the semaphore is holding.

- **The API enforces rate limits server-side.** If the server returns 429 with a `Retry-After` header, you should handle retries with backoff rather than guessing a concurrency limit. The [aiohttp-retry](https://github.com/inyutin/aiohttp_retry) library handles this well.

- **The workload is CPU-bound.** Semaphores control async concurrency, not parallelism. For CPU-bound work, use [ProcessPoolExecutor](https://docs.python.org/3/library/concurrent.futures.html#concurrent.futures.ProcessPoolExecutor) or a process pool, not an async semaphore.

- **You've got fewer than 5 concurrent tasks.** The overhead of creating and managing a semaphore isn't worth it for tiny batches. Just fire them all at once.

- **You need strict per-second rate limiting.** A semaphore caps concurrency, not rate. If the API says "exactly 5 per second", use a token bucket or a leaky bucket — the [aiolimiter](https://github.com/mjpieters/aiolimiter) library is purpose-built for this.

## Tooling and Ecosystem

| Tool | What it does | When to use it |
| --- | --- | --- |
| [asyncio.Semaphore](https://docs.python.org/3/library/asyncio-sync.html#asyncio.Semaphore) | Built-in counting semaphore | Basic concurrency limiting |
| [aiolimiter](https://github.com/mjpieters/aiolimiter) | Async token bucket rate limiter | When you need "N per second" instead of "N at once" |
| [aiohttp](https://docs.aiohttp.org/) | Async HTTP client with connector limits | HTTP requests with built-in concurrency control |
| [asyncpg](https://magicstack.github.io/asyncpg/) | Async PostgreSQL driver with pool | Database queries with connection pooling |
| [httpx](https://www.python-httpx.org/) | Async HTTP client (alternative to aiohttp) | When you need sync/async dual mode |
| [tenacity](https://github.com/jd/tenacity) | Retry library with backoff | Combining retries with semaphore-limited calls |

I use `asyncio.Semaphore` for quick scripts and internal tools. For production HTTP workloads, I lean on aiohttp's `TCPConnector(limit=N)` because it handles connection reuse and limits in one place. For database work, asyncpg's pool is usually enough on its own.

## Performance Notes

The overhead of a semaphore is small but not zero. Each `acquire` and `release` involves a coroutine suspension point and a deque operation. In benchmarks I've run, the overhead is under 1 microsecond per acquire/release pair on CPython 3.11, which is negligible compared to any real I/O operation.

The bigger performance concern is choosing the wrong limit. A limit that's too low leaves throughput on the table — if your API can handle 50 concurrent requests and you set the semaphore to 10, you're getting 20% of the possible throughput. A limit that's too high triggers rate limiting, retries, and backoff, which can actually reduce throughput below what a lower limit would achieve.

I measure throughput empirically rather than guessing. My approach: start with 10 concurrent, measure total time for a fixed batch of 100 requests, then try 20, 50, and 100. The throughput curve usually has a clear knee where it stops improving or starts degrading.

For adaptive concurrency, the `AdaptiveSemaphore` pattern in the examples above works, but production systems often use more sophisticated algorithms like [AIMD](https://en.wikipedia.org/wiki/Additive_increase/multiplicative_decrease) (additive increase, multiplicative decrease) or the [concurrency-limits](https://github.com/Netflix/concurrency-limits) library from Netflix, which uses gradient-based concurrency control.

## Key Takeaways

- A semaphore limits **concurrency** (how many at once), not **rate** (how many per second). Use a token bucket for rate limiting.
- Always reach for the context manager (`async with semaphore:`) — that way you don't leak slots when exceptions fire.
- Give each host or API its own semaphore — sharing one across services causes head-of-line blocking.
- Pair every semaphore with a timeout so a stuck call can't hold a slot forever.
- Connection pools (asyncpg, SQLAlchemy) already limit concurrency, so an extra semaphore is usually redundant for database work.
- For production HTTP workloads, aiohttp's `TCPConnector(limit=N)` can replace a manual semaphore and handles connection reuse too.

## See Also

- [Python asyncio.Semaphore documentation](https://docs.python.org/3/library/asyncio-sync.html#asyncio.Semaphore) — official reference for the Semaphore class
- [aiolimiter](https://github.com/mjpieters/aiolimiter) — async rate limiter using the leaky bucket algorithm
- [aiohttp documentation](https://docs.aiohttp.org/) — async HTTP client with connector-level concurrency control
- [asyncpg documentation](https://magicstack.github.io/asyncpg/) — async PostgreSQL driver with built-in connection pooling
- [Netflix concurrency-limits](https://github.com/Netflix/concurrency-limits) — gradient-based adaptive concurrency control
- [Concurrent Async Tasks with asyncio.gather](/recipes/python-asyncio-gather-task-groups/) — coordinating several async tasks
- [Async HTTP Requests in Python](/recipes/python-async-http-requests/) — HTTP client patterns for async Python
- [Concurrency Patterns Guide](/guides/concurrency-patterns-guide/) — broader guide to concurrency patterns

## FAQ

### How is a semaphore different from a lock?

A lock lets only one task through at a time, while a semaphore lets N through. That makes a lock just a semaphore with the limit set to 1.

### How do I pick a good concurrency limit?

For HTTP calls, 10 concurrent tasks is a sensible starting point. Watch both the error rate and the response time as you go. If both stay healthy, raise the limit; if errors climb or latency spikes, lower it. The API documentation usually lists the rate limit you should respect.

### Can the semaphore limit change while the program runs?

The standard library class doesn't let you resize on the fly. You can build a wrapper that adds slots by calling `release()` or removes them by calling `acquire()`. Alternatively, replace the whole semaphore with a new one that starts with a different limit.

### Do I need a semaphore if I already have a connection pool?

For databases, the connection pool already limits how many connections are open, so an extra semaphore is usually redundant. HTTP clients and anything else that doesn't ship with its own pool — those are the cases where I reach for a semaphore.

### What if a task holds a slot and never finishes?

Everything behind that task backs up and waits. Throw a timeout on it with `asyncio.wait_for` or `asyncio.timeout()`. If the work drags on too long, the timeout triggers, the slot goes back into the pool, and the remaining tasks keep moving.
