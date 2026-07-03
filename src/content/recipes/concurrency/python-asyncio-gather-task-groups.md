---
contentType: recipes
slug: python-asyncio-gather-task-groups
title: "Run Concurrent Async Tasks with asyncio.gather and Task Groups"
description: "Execute multiple async operations concurrently in Python using asyncio.gather, asyncio.TaskGroup, error handling with return_exceptions, timeouts, and semaphores for rate limiting."
metaDescription: "Run concurrent async tasks in Python with asyncio.gather and TaskGroup. Handle errors, timeouts, semaphores for rate limiting, and structured concurrency patterns."
difficulty: intermediate
topics:
  - concurrency
  - performance
  - api
tags:
  - python
  - asyncio
  - concurrency
  - async
  - task-groups
relatedResources:
  - /recipes/concurrency/python-asyncio-semaphore-rate-limiting
  - /recipes/concurrency/python-thread-pool-executor
  - /guides/complete-guide-python-asyncio
  - /guides/concurrency-patterns-guide
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Run concurrent async tasks in Python with asyncio.gather and TaskGroup. Handle errors, timeouts, semaphores for rate limiting, and structured concurrency patterns."
  keywords:
    - python asyncio gather
    - asyncio taskgroup
    - python concurrent async
    - asyncio return_exceptions
    - python structured concurrency
---

## Overview

`asyncio.gather` and `asyncio.TaskGroup` (Python 3.11+) let you run multiple async operations concurrently, reducing total wait time from the sum of all operations to the longest single operation. Below: concurrent HTTP requests, error handling strategies, timeouts, rate limiting with semaphores, and structured concurrency with TaskGroup.

## When to Use This

- Fetching data from multiple APIs simultaneously
- Parallel database queries across shards or services
- Batch processing I/O-bound operations (file reads, network calls)
- Any scenario where independent async operations can run in parallel

## Prerequisites

- Python 3.11+
- `aiohttp` for HTTP examples

## Solution

### 1. Basic asyncio.gather

```python
import asyncio
import aiohttp
import time

async def fetch_url(session: aiohttp.ClientSession, url: str) -> dict:
    async with session.get(url) as response:
        data = await response.json()
        return {'url': url, 'status': response.status, 'data': data}

async def fetch_all(urls: list) -> list:
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        # All tasks run concurrently — total time = slowest request
        results = await asyncio.gather(*tasks)
        return results

# Usage
urls = [
    'https://api.example.com/users',
    'https://api.example.com/orders',
    'https://api.example.com/products',
]

start = time.time()
results = asyncio.run(fetch_all(urls))
print(f"Fetched {len(results)} URLs in {time.time() - start:.2f}s")
```

### 2. Error Handling with return_exceptions

```python
import asyncio

async def risky_operation(task_id: int) -> str:
    await asyncio.sleep(0.1)
    if task_id == 2:
        raise ValueError(f"Task {task_id} failed")
    return f"Task {task_id} succeeded"

async def main():
    # return_exceptions=True — failed tasks return the exception instead of raising
    results = await asyncio.gather(
        risky_operation(1),
        risky_operation(2),
        risky_operation(3),
        return_exceptions=True,
    )

    for result in results:
        if isinstance(result, Exception):
            print(f"Error: {result}")
        else:
            print(f"Success: {result}")

asyncio.run(main())
# Output:
# Success: Task 1 succeeded
# Error: Task 2 failed
# Success: Task 3 succeeded
```

### 3. asyncio.TaskGroup (Python 3.11+)

```python
import asyncio
import aiohttp

async def fetch_with_task_group(urls: list) -> list:
    results = []

    async with aiohttp.ClientSession() as session:
        async with asyncio.TaskGroup() as tg:
            for url in urls:
                task = tg.create_task(fetch_url(session, url))
                # Store task objects to retrieve results later
                task.add_done_callback(lambda t: results.append(t.result()))

    # TaskGroup guarantees all tasks complete (or raise) before exiting
    return results

async def fetch_url(session, url):
    async with session.get(url) as response:
        return await response.json()

# TaskGroup raises ExceptionGroup if any task fails
async def main():
    try:
        results = await fetch_with_task_group(urls)
    except ExceptionGroup as eg:
        for exc in eg.exceptions:
            print(f"Task failed: {exc}")
```

### 4. Timeouts with asyncio.wait_for

```python
import asyncio

async def slow_api_call(endpoint: str) -> dict:
    await asyncio.sleep(10)  # Simulates slow API
    return {'endpoint': endpoint, 'data': 'result'}

async def fetch_with_timeout(url: str, timeout: float = 5.0) -> dict:
    try:
        result = await asyncio.wait_for(slow_api_call(url), timeout=timeout)
        return result
    except asyncio.TimeoutError:
        return {'endpoint': url, 'error': 'timeout'}

async def fetch_all_with_timeout(urls: list, timeout: float = 5.0) -> list:
    tasks = [fetch_with_timeout(url, timeout) for url in urls]
    return await asyncio.gather(*tasks)

results = asyncio.run(fetch_all_with_timeout(['api1', 'api2', 'api3'], timeout=3.0))
```

### 5. Semaphore for Rate Limiting

```python
import asyncio
import aiohttp

async def fetch_with_limit(
    session: aiohttp.ClientSession,
    url: str,
    semaphore: asyncio.Semaphore,
) -> dict:
    async with semaphore:  # Limits concurrent requests
        async with session.get(url) as response:
            return await response.json()

async def fetch_all_rate_limited(urls: list, max_concurrent: int = 10) -> list:
    semaphore = asyncio.Semaphore(max_concurrent)

    async with aiohttp.ClientSession() as session:
        tasks = [fetch_with_limit(session, url, semaphore) for url in urls]
        return await asyncio.gather(*tasks)

# Process 100 URLs with max 10 concurrent requests
urls = [f'https://api.example.com/page/{i}' for i in range(100)]
results = asyncio.run(fetch_all_rate_limited(urls, max_concurrent=10))
```

### 6. as_completed for Progressive Results

```python
import asyncio

async def process_as_completed(urls: list) -> None:
    async with aiohttp.ClientSession() as session:
        tasks = {asyncio.create_task(fetch_url(session, url)): url for url in urls}

        # Results arrive as they complete — not in submission order
        for coro in asyncio.as_completed(tasks.keys()):
            try:
                result = await coro
                url = tasks[coro]
                print(f"Completed: {url} -> {result['status']}")
            except Exception as e:
                print(f"Failed: {e}")

asyncio.run(process_as_completed(urls))
```

### 7. Bounded Parallelism with Batches

```python
import asyncio
import aiohttp

async def fetch_in_batches(urls: list, batch_size: int = 20) -> list:
    """Process URLs in batches to avoid overwhelming the server."""
    results = []

    async with aiohttp.ClientSession() as session:
        for i in range(0, len(urls), batch_size):
            batch = urls[i:i + batch_size]
            tasks = [fetch_url(session, url) for url in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            results.extend(batch_results)
            print(f"Processed batch {i // batch_size + 1}")

    return results

# Process 1000 URLs in batches of 20
urls = [f'https://api.example.com/item/{i}' for i in range(1000)]
results = asyncio.run(fetch_in_batches(urls, batch_size=20))
```

### 8. Combining Results from Different Sources

```python
import asyncio

async def fetch_users() -> list:
    await asyncio.sleep(0.5)
    return [{'id': 1, 'name': 'Alice'}, {'id': 2, 'name': 'Bob'}]

async def fetch_orders() -> list:
    await asyncio.sleep(0.3)
    return [{'id': 101, 'userId': 1, 'total': 50}]

async def fetch_products() -> list:
    await asyncio.sleep(0.4)
    return [{'id': 201, 'name': 'Widget', 'price': 10}]

async def fetch_dashboard_data() -> dict:
    # All three fetches run concurrently
    users, orders, products = await asyncio.gather(
        fetch_users(),
        fetch_orders(),
        fetch_products(),
    )
    return {'users': users, 'orders': orders, 'products': products}

# Total time = max(0.5, 0.3, 0.4) = 0.5s, not 0.5 + 0.3 + 0.4 = 1.2s
data = asyncio.run(fetch_dashboard_data())
```

## How It Works

1. **`asyncio.gather`**: Takes multiple coroutines, schedules them all on the event loop, and returns a future that resolves when all complete. Results are returned in the same order as the input coroutines.
2. **`return_exceptions=True`**: By default, `gather` raises the first exception encountered. With `return_exceptions=True`, exceptions are returned as results — useful when partial success is acceptable.
3. **`asyncio.TaskGroup`**: Introduced in Python 3.11, provides structured concurrency. All tasks in the group are guaranteed to complete before the context manager exits. If any task fails, all remaining tasks are cancelled.
4. **`asyncio.wait_for`**: Wraps a coroutine with a timeout. If the timeout expires, the coroutine is cancelled and `asyncio.TimeoutError` is raised.
5. **`asyncio.Semaphore`**: Limits the number of concurrent operations. Each `async with semaphore` acquires a slot; releasing it allows the next waiting task to proceed.

## Variants

### Cancel on First Exception

```python
async def fetch_first_successful(urls: list) -> dict:
    """Return the first successful result, cancel the rest."""
    tasks = [asyncio.create_task(fetch_url(url)) for url in urls]

    done, pending = await asyncio.wait(
        tasks,
        return_when=asyncio.FIRST_COMPLETED,
    )

    # Cancel remaining tasks
    for task in pending:
        task.cancel()

    # Return first completed result
    for task in done:
        if not task.exception():
            return task.result()

    raise RuntimeError("All tasks failed")
```

### Dynamic Task Creation

```python
async def process_stream(stream, handler):
    """Dynamically create tasks as items arrive from a stream."""
    async with asyncio.TaskGroup() as tg:
        async for item in stream:
            tg.create_task(handler(item))
```

### Gather with Progress Tracking

```python
async def fetch_with_progress(urls: list) -> list:
    results = [None] * len(urls)
    progress = 0

    async def fetch_and_store(index, url):
        nonlocal progress
        results[index] = await fetch_url(url)
        progress += 1
        print(f"Progress: {progress}/{len(urls)}")

    await asyncio.gather(*[fetch_and_store(i, url) for i, url in enumerate(urls)])
    return results
```

## Best Practices

- **Use `TaskGroup` over `gather` in Python 3.11+**: TaskGroup provides structured concurrency — all tasks are guaranteed to complete or be cancelled before exit. It also provides better error messages via `ExceptionGroup`.
- **Set timeouts**: Without timeouts, a slow operation blocks `gather` indefinitely. Use `asyncio.wait_for` or `async.timeout()` (Python 3.11+).
- **Use semaphores for rate limiting**: Unbounded concurrency can overwhelm servers or hit connection limits. Use `asyncio.Semaphore` to cap concurrent operations.
- **Use `return_exceptions=True` for partial success**: When processing many independent items, don't let one failure abort the entire batch.
- **Reuse `aiohttp.ClientSession`**: Creating a session per request is expensive. Create one session and share it across all tasks.
- **Process in batches for very large lists**: 10,000 concurrent tasks can exhaust memory. Process in batches of 50-100.

## Common Mistakes

- **Forgetting `asyncio.run()`**: Coroutines don't execute until awaited or scheduled. Use `asyncio.run()` to execute the top-level coroutine.
- **Not handling exceptions**: By default, `gather` raises the first exception. If you need all results, use `return_exceptions=True`.
- **Creating too many concurrent tasks**: 10,000 simultaneous HTTP requests will overwhelm most servers. Use a semaphore or batch processing.
- **Mixing sync and async**: Blocking calls (`time.sleep`, `requests.get`) block the event loop. Use async equivalents (`asyncio.sleep`, `aiohttp`).
- **Not cancelling pending tasks**: With `asyncio.wait(FIRST_COMPLETED)`, pending tasks must be explicitly cancelled. Otherwise they keep running in the background.

## FAQ

**What is the difference between `gather` and `TaskGroup`?**

`gather` returns results in order and doesn't guarantee cleanup on error. `TaskGroup` (Python 3.11+) provides structured concurrency — all tasks complete or are cancelled before exit, and errors are collected in an `ExceptionGroup`.

**How many concurrent tasks should I run?**

Depends on the operation. For HTTP requests, 10-50 concurrent is typical. For CPU-bound work, use `ProcessPoolExecutor` instead. For I/O-bound work, 100-1000 may be fine with a semaphore.

**Does `gather` preserve order?**

Yes. Results are returned in the same order as the input coroutines, regardless of completion order. Use `as_completed` if you need results as they finish.

**What happens if a task in `TaskGroup` raises an exception?**

All other tasks in the group are cancelled. The exception is collected into an `ExceptionGroup` which is raised when the `async with TaskGroup()` block exits.

**Can I use `gather` with regular functions?**

No. `gather` requires coroutines (async functions). For synchronous functions, use `asyncio.to_thread()` to wrap them, or use `ThreadPoolExecutor` with `loop.run_in_executor()`.
