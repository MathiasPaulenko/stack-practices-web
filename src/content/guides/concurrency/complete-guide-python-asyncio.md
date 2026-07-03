---
contentType: guides
slug: complete-guide-python-asyncio
title: "Complete Guide to Python Asyncio"
description: "Master asynchronous Python programming with asyncio. Covers coroutines, tasks, event loops, async/await, gather, semaphores, queues, HTTP clients, websockets, and debugging async code."
metaDescription: "Complete guide to Python asyncio. Master coroutines, tasks, event loops, async/await, gather, semaphores, queues, HTTP clients, websockets and debugging async code."
difficulty: advanced
topics:
  - concurrency
  - performance
tags:
  - python
  - asyncio
  - async
  - concurrency
  - coroutines
  - event-loop
  - guide
  - concurrency
relatedResources:
  - /guides/architecture/complete-guide-kafka-stream-processing
  - /guides/performance/performance-optimization-guide
  - /guides/concurrency/concurrency-patterns-guide
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Complete guide to Python asyncio. Master coroutines, tasks, event loops, async/await, gather, semaphores, queues, HTTP clients, websockets and debugging async code."
  keywords:
    - python asyncio
    - async python
    - coroutines
    - event loop
    - async await
    - asyncio gather
    - async http client
    - python concurrency
---

# Complete Guide to Python Asyncio

## Introduction

Asyncio is Python's framework for writing concurrent code using async/await syntax. It uses a single-threaded event loop to manage multiple coroutines, making it ideal for I/O-bound workloads like HTTP requests, database queries, and websocket connections. This guide covers coroutines, tasks, the event loop, concurrency primitives, async HTTP clients, websockets, and debugging.

## Coroutines and async/await

### Basic coroutine

```python
import asyncio

async def fetch_data(url: str) -> str:
    print(f"Fetching {url}")
    await asyncio.sleep(1)  # Simulate I/O
    return f"Data from {url}"

async def main():
    result = await fetch_data("https://example.com")
    print(result)

asyncio.run(main())
```

### Running multiple coroutines sequentially

```python
async def main():
    start = asyncio.get_event_loop().time()

    result1 = await fetch_data("https://api1.example.com")
    result2 = await fetch_data("https://api2.example.com")
    result3 = await fetch_data("https://api3.example.com")

    elapsed = asyncio.get_event_loop().time() - start
    print(f"Sequential: {elapsed:.2f}s")  # ~3.0s
```

### Running concurrently with asyncio.gather

```python
async def main():
    start = asyncio.get_event_loop().time()

    results = await asyncio.gather(
        fetch_data("https://api1.example.com"),
        fetch_data("https://api2.example.com"),
        fetch_data("https://api3.example.com"),
    )

    elapsed = asyncio.get_event_loop().time() - start
    print(f"Concurrent: {elapsed:.2f}s")  # ~1.0s
    print(results)
```

### Error handling with gather

```python
async def fetch_with_error(url: str) -> str:
    if "error" in url:
        raise ValueError(f"Failed to fetch {url}")
    await asyncio.sleep(0.5)
    return f"Data from {url}"

async def main():
    # return_exceptions=True keeps errors as results instead of raising
    results = await asyncio.gather(
        fetch_with_error("https://good.example.com"),
        fetch_with_error("https://error.example.com"),
        fetch_with_error("https://good2.example.com"),
        return_exceptions=True,
    )

    for result in results:
        if isinstance(result, Exception):
            print(f"Error: {result}")
        else:
            print(f"Success: {result}")
```

## Tasks

### Creating tasks manually

```python
async def main():
    # Schedule coroutines as tasks — they start running immediately
    task1 = asyncio.create_task(fetch_data("https://api1.example.com"))
    task2 = asyncio.create_task(fetch_data("https://api2.example.com"))

    # Do other work while tasks run
    print("Tasks started, doing other work...")
    await asyncio.sleep(0.5)

    # Await tasks when you need results
    result1 = await task1
    result2 = await task2
    print(result1, result2)
```

### Task cancellation

```python
async def long_running():
    try:
        while True:
            print("Working...")
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        print("Task cancelled, cleaning up...")
        raise  # Re-raise to propagate cancellation

async def main():
    task = asyncio.create_task(long_running())
    await asyncio.sleep(3.5)
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        print("Task was cancelled")
```

### Task groups (Python 3.11+)

```python
async def main():
    async with asyncio.TaskGroup() as tg:
        task1 = tg.create_task(fetch_data("https://api1.example.com"))
        task2 = tg.create_task(fetch_data("https://api2.example.com"))
        task3 = tg.create_task(fetch_data("https://api3.example.com"))

    # All tasks complete when the context manager exits
    print(task1.result(), task2.result(), task3.result())
```

## The Event Loop

### Running the event loop

```python
# asyncio.run() — recommended for top-level entry point
asyncio.run(main())

# Manual loop control (for advanced use cases)
async def main():
    loop = asyncio.get_running_loop()
    print(f"Running on: {loop}")

# Run in background thread (for mixing sync/async code)
import asyncio
from threading import Thread

class AsyncRunner:
    def __init__(self):
        self.loop = asyncio.new_event_loop()
        self.thread = Thread(target=self.loop.run_forever, daemon=True)
        self.thread.start()

    def submit(self, coro):
        return asyncio.run_coroutine_threadsafe(coro, self.loop).result()

runner = AsyncRunner()
result = runner.submit(fetch_data("https://example.com"))
```

## Semaphores (Limiting Concurrency)

```python
async def fetch_with_limit(url: str, semaphore: asyncio.Semaphore) -> str:
    async with semaphore:
        await asyncio.sleep(0.5)
        return f"Data from {url}"

async def main():
    semaphore = asyncio.Semaphore(10)  # Max 10 concurrent

    urls = [f"https://api{i}.example.com" for i in range(100)]
    tasks = [fetch_with_limit(url, semaphore) for url in urls]

    results = await asyncio.gather(*tasks)
    print(f"Fetched {len(results)} URLs")
```

## Queues

### Producer-consumer pattern

```python
async def producer(queue: asyncio.Queue, items: list):
    for item in items:
        await queue.put(item)
        print(f"Produced: {item}")
    await queue.put(None)  # Sentinel

async def consumer(queue: asyncio.Queue, consumer_id: int):
    while True:
        item = await queue.get()
        if item is None:
            await queue.put(None)  # Pass sentinel to next consumer
            break
        await asyncio.sleep(0.5)
        print(f"Consumer {consumer_id} processed: {item}")
        queue.task_done()

async def main():
    queue = asyncio.Queue(maxsize=10)
    items = list(range(20))

    producers = [asyncio.create_task(producer(queue, items))]
    consumers = [asyncio.create_task(consumer(queue, i)) for i in range(3)]

    await asyncio.gather(*producers)
    await queue.join()
    for c in consumers:
        c.cancel()
```

## Async HTTP Clients

### aiohttp

```python
import aiohttp
import asyncio

async def fetch_url(session: aiohttp.ClientSession, url: str) -> dict:
    async with session.get(url) as response:
        return await response.json()

async def fetch_many(urls: list) -> list:
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        return await asyncio.gather(*tasks)

async def main():
    urls = [f"https://api.example.com/users/{i}" for i in range(50)]
    results = await fetch_many(urls)
    print(f"Fetched {len(results)} users")

asyncio.run(main())
```

### httpx (sync + async)

```python
import httpx
import asyncio

async def fetch_with_httpx(urls: list) -> list:
    async with httpx.AsyncClient(timeout=30, limits=httpx.Limits(max_connections=20)) as client:
        tasks = [client.get(url) for url in urls]
        responses = await asyncio.gather(*tasks)
        return [r.json() for r in responses]

async def main():
    urls = [f"https://api.example.com/items/{i}" for i in range(100)]
    results = await fetch_with_httpx(urls)
    print(f"Got {len(results)} items")
```

### Retry with tenacity

```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import httpx

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.RequestError)),
)
async def fetch_with_retry(url: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.json()
```

## Websockets

### Server

```python
import asyncio
import websockets

connected = set()

async def handler(websocket):
    connected.add(websocket)
    try:
        async for message in websocket:
            # Broadcast to all connected clients
            websockets.broadcast(connected, message)
    finally:
        connected.remove(websocket)

async def main():
    async with websockets.serve(handler, "localhost", 8765):
        await asyncio.Future()  # Run forever

asyncio.run(main())
```

### Client

```python
import asyncio
import websockets

async def client():
    uri = "ws://localhost:8765"
    async with websockets.connect(uri) as ws:
        await ws.send("Hello, server!")
        response = await ws.recv()
        print(f"Received: {response}")

asyncio.run(client())
```

## Mixing Sync and Async Code

### asyncio.to_thread (Python 3.9+)

```python
import asyncio
import time

def blocking_io(duration: float) -> str:
    time.sleep(duration)  # Blocking call
    return f"Slept for {duration}s"

async def main():
    # Run blocking function in a thread
    result = await asyncio.to_thread(blocking_io, 2.0)
    print(result)

asyncio.run(main())
```

### run_in_executor

```python
async def main():
    loop = asyncio.get_running_loop()

    # Use default thread pool
    result = await loop.run_in_executor(None, blocking_io, 2.0)

    # Use process pool for CPU-bound work
    from concurrent.futures import ProcessPoolExecutor
    with ProcessPoolExecutor() as pool:
        result = await loop.run_in_executor(pool, cpu_intensive_work, data)
```

## Debugging Async Code

### Enable debug mode

```python
import asyncio
import logging

logging.basicConfig(level=logging.DEBUG)

async def main():
    asyncio.get_running_loop().set_debug(True)

    # Log slow callbacks (> 100ms)
    asyncio.get_running_loop().slow_callback_duration = 0.1

    await some_operation()

asyncio.run(main(), debug=True)
```

### Common pitfalls

```python
# PITFALL 1: Forgetting await — coroutine never runs
async def bad():
    fetch_data("https://example.com")  # Missing await!
    # RuntimeWarning: coroutine 'fetch_data' was never awaited

# PITFALL 2: Blocking call in async code
async def bad():
    time.sleep(5)  # Blocks the entire event loop!

async def good():
    await asyncio.sleep(5)  # Non-blocking

# PITFALL 3: Creating coroutine without scheduling
async def bad():
    coro = fetch_data("https://example.com")
    # Never awaited, never scheduled

# PITFALL 4: Using requests (sync) in async code
import requests

async def bad():
    response = requests.get("https://example.com")  # Blocks event loop!

async def good():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://example.com")
```

## Best Practices

- **Use `asyncio.run()` as entry point** — creates and closes the event loop properly
- **Use `asyncio.gather()` for concurrent I/O** — runs coroutines concurrently, waits for all
- **Limit concurrency with semaphores** — prevent overwhelming external services
- **Use `asyncio.TaskGroup` (3.11+)** — better error handling than `gather`
- **Never call blocking functions in async code** — use `asyncio.to_thread()` instead
- **Use async HTTP clients** — `aiohttp` or `httpx`, never `requests`
- **Set timeouts** — `asyncio.wait_for()` or `asyncio.timeout()` to prevent hangs
- **Handle `CancelledError`** — clean up resources when tasks are cancelled
- **Use `return_exceptions=True`** when you want to handle errors per-task
- **Prefer `asyncio.Queue` over threading.Queue** — works with the event loop
- **Enable debug mode in development** — catches missing awaits and slow callbacks
- **Use type hints with `Coroutine`** — improve IDE support and catch type errors

## Common Mistakes

- Forgetting `await` — coroutine is created but never executed
- Calling `time.sleep()` instead of `await asyncio.sleep()` — blocks the event loop
- Using `requests` library in async code — it blocks the event loop
- Not limiting concurrency — thousands of simultaneous requests overwhelm servers
- Not handling `CancelledError` — resources leak when tasks are cancelled
- Mixing `asyncio.run()` calls — only one event loop should run per process
- Not setting timeouts — a slow response hangs the entire application
- Using `asyncio.get_event_loop()` in modern code — use `asyncio.get_running_loop()` or `asyncio.run()`
- Creating tasks without keeping references — garbage collector may cancel them
- Not using `async with` for resources — connections leak without proper cleanup

## Frequently Asked Questions

### When should I use asyncio vs threading vs multiprocessing?

Use **asyncio** for I/O-bound workloads (HTTP requests, database queries, file I/O) — it handles thousands of concurrent connections with a single thread. Use **threading** for I/O-bound code that uses blocking libraries (like `requests`). Use **multiprocessing** for CPU-bound work (data processing, computation) — asyncio and threading are limited by the GIL.

### Can I use asyncio with Flask?

Flask is synchronous by default. For async support, use Flask 2.0+ with `async def` route handlers, or switch to an async framework like FastAPI, Quart, or Starlette. FastAPI is the most popular choice — it uses Starlette's asyncio under the hood and supports async/await natively.

### How do I test async code?

Use `pytest-asyncio`:

```python
import pytest

@pytest.mark.asyncio
async def test_fetch_data():
    result = await fetch_data("https://example.com")
    assert "Data from" in result
```
