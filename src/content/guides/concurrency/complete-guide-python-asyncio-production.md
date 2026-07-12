---






contentType: guides
slug: complete-guide-python-asyncio-production
title: "Complete Guide to Python Asyncio in Production"
description: "Run Python asyncio in production with confidence. Covers event loops, task management, debugging, cancellation, timeouts, backpressure, and patterns for high-concurrency async applications."
metaDescription: "Run Python asyncio in production. Covers event loops, task management, debugging, cancellation, timeouts, backpressure, and async patterns."
difficulty: advanced
topics:
  - concurrency
  - performance
  - testing
tags:
  - python
  - asyncio
  - guide
  - concurrency
  - event-loop
  - async
  - cancellation
  - backpressure
relatedResources:
  - /guides/complete-guide-event-driven-systems
  - /patterns/async-generator-pattern
  - /patterns/circuit-breaker-pattern
  - /guides/complete-guide-go-concurrency
  - /recipes/python-schedule-periodic-tasks
  - /recipes/python-async-gather-concurrent-requests
  - /guides/complete-guide-llm-application-architecture
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Run Python asyncio in production. Covers event loops, task management, debugging, cancellation, timeouts, backpressure, and async patterns."
  keywords:
    - python asyncio production
    - asyncio event loop
    - asyncio task management
    - asyncio debugging
    - asyncio cancellation
    - asyncio timeouts
    - async backpressure
    - python async patterns






---

## Introduction

Python's asyncio is a concurrency framework for writing single-threaded concurrent code using coroutines, event loops, and I/O multiplexing. It handles thousands of concurrent I/O operations without thread overhead. Running asyncio in production requires understanding event loop internals, task lifecycle, cancellation semantics, debugging tools, and common pitfalls. Here is a hands-on guide to everything you need to build reliable high-concurrency async applications.

## Event Loop Fundamentals

### How the Event Loop Works

```text
Event Loop Cycle:
1. Run ready callbacks (coroutines resumed by I/O readiness)
2. Poll for I/O events (with timeout based on next scheduled callback)
3. Process I/O events (schedule callbacks for ready file descriptors)
4. Run scheduled callbacks (call_later, call_at)
5. Repeat
```

The event loop runs on a single thread. Coroutines yield control back to the loop at `await` points. The loop multiplexes I/O using `select`, `poll`, `epoll`, or `kqueue` depending on the platform.

### Choosing an Event Loop

```python
import asyncio

# Default event loop (uvloop on Linux if installed, otherwise selector)
loop = asyncio.new_event_loop()

# uvloop: 2-4x faster, drop-in replacement (Linux/macOS only)
# pip install uvloop
try:
    import uvloop
    asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
except ImportError:
    pass

# Production setup with uvloop
async def main():
    await asyncio.gather(
        handle_requests(),
        background_worker()
    )

if __name__ == "__main__":
    asyncio.run(main())
```

### Running the Event Loop

```python
import asyncio

# asyncio.run() — recommended for production
# Creates a new event loop, runs the coroutine, closes the loop
async def app():
    server = await asyncio.start_server(handle_client, "0.0.0.0", 8080)
    async with server:
        await server.serve_forever()

asyncio.run(app())

# Long-running application with graceful shutdown
async def main():
    stop_event = asyncio.Event()
    
    # Start background tasks
    tasks = [
        asyncio.create_task(web_server()),
        asyncio.create_task(worker_pool()),
        asyncio.create_task(monitoring())
    ]
    
    # Wait for shutdown signal
    await stop_event.wait()
    
    # Cancel all tasks
    for task in tasks:
        task.cancel()
    
    await asyncio.gather(*tasks, return_exceptions=True)

asyncio.run(main())
```

## Task Management

### Creating and Awaiting Tasks

```python
import asyncio

async def fetch_data(url):
    await asyncio.sleep(1)  # Simulate I/O
    return {"url": url, "data": "response"}

async def main():
    # create_task schedules the coroutine immediately
    task1 = asyncio.create_task(fetch_data("https://api1.example.com"))
    task2 = asyncio.create_task(fetch_data("https://api2.example.com"))
    
    # Both run concurrently
    result1, result2 = await asyncio.gather(task1, task2)
    print(f"Results: {result1}, {result2}")

asyncio.run(main())
```

### gather vs TaskGroup

```python
import asyncio

# asyncio.gather — fire and forget, manual error handling
async def gather_pattern():
    results = await asyncio.gather(
        fetch_data("url1"),
        fetch_data("url2"),
        fetch_data("url3"),
        return_exceptions=True  # Don't propagate exceptions
    )
    for result in results:
        if isinstance(result, Exception):
            print(f"Task failed: {result}")
        else:
            print(f"Result: {result}")

# asyncio.TaskGroup — Python 3.11+, structured concurrency
async def taskgroup_pattern():
    async with asyncio.TaskGroup() as tg:
        t1 = tg.create_task(fetch_data("url1"))
        t2 = tg.create_task(fetch_data("url2"))
        t3 = tg.create_task(fetch_data("url3"))
    
    # All tasks complete before exiting the block
    # If any task fails, all others are cancelled
    print(f"Results: {t1.result()}, {t2.result()}, {t3.result()}")

asyncio.run(taskgroup_pattern())
```

### Waiting with Timeouts

```python
import asyncio

async def fetch_with_timeout(url, timeout=5.0):
    try:
        result = await asyncio.wait_for(
            fetch_data(url),
            timeout=timeout
        )
        return result
    except asyncio.TimeoutError:
        return {"url": url, "error": "timeout"}

# asyncio.timeout — Python 3.11+ (cancellation-safe)
async def fetch_with_timeout_v2(url, timeout=5.0):
    try:
        async with asyncio.timeout(timeout):
            result = await fetch_data(url)
            return result
    except TimeoutError:
        return {"url": url, "error": "timeout"}

# Wait for first to complete
async def fetch_first_successful(urls):
    tasks = [asyncio.create_task(fetch_data(url)) for url in urls]
    
    done, pending = await asyncio.wait(
        tasks,
        return_when=asyncio.FIRST_COMPLETED
    )
    
    # Cancel remaining tasks
    for task in pending:
        task.cancel()
    
    # Get the first successful result
    for task in done:
        if not task.exception():
            return task.result()
    
    raise RuntimeError("All tasks failed")
```

## Cancellation

### Cancellation Semantics

When a task is cancelled, `CancelledError` is raised at the next `await` point. Coroutines should handle cleanup in `finally` blocks.

```python
import asyncio

async def long_running_operation():
    try:
        while True:
            data = await fetch_data()
            process(data)
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        # Cleanup resources
        await cleanup_resources()
        raise  # Re-raise to propagate cancellation

async def main():
    task = asyncio.create_task(long_running_operation())
    
    await asyncio.sleep(5)
    task.cancel()
    
    try:
        await task
    except asyncio.CancelledError:
        print("Task was cancelled")
```

### Shielding from Cancellation

```python
import asyncio

async def critical_operation():
    # Shield prevents cancellation during this await
    result = await asyncio.shield(
        save_to_database()
    )
    return result

async def main():
    task = asyncio.create_task(critical_operation())
    
    await asyncio.sleep(0.1)
    task.cancel()
    
    try:
        await task
    except asyncio.CancelledError:
        # The task was cancelled, but save_to_database() continues
        # The shielded operation is not interrupted
        print("Task cancelled, but DB save continues")
```

### Graceful Shutdown

```python
import asyncio
import signal

class Application:
    def __init__(self):
        self.shutdown_event = asyncio.Event()
        self.tasks = []
    
    async def start(self):
        # Register signal handlers
        loop = asyncio.get_event_loop()
        loop.add_signal_handler(signal.SIGINT, self.shutdown_event.set)
        loop.add_signal_handler(signal.SIGTERM, self.shutdown_event.set)
        
        # Start workers
        for i in range(4):
            task = asyncio.create_task(self.worker(i))
            self.tasks.append(task)
        
        # Wait for shutdown
        await self.shutdown_event.wait()
        
        # Cancel workers
        for task in self.tasks:
            task.cancel()
        
        # Wait for cleanup with timeout
        await asyncio.wait_for(
            asyncio.gather(*self.tasks, return_exceptions=True),
            timeout=10.0
        )
    
    async def worker(self, worker_id):
        try:
            while not self.shutdown_event.is_set():
                job = await self.fetch_job()
                await self.process_job(job)
        except asyncio.CancelledError:
            print(f"Worker {worker_id} shutting down")
            await self.flush_state()
            raise

asyncio.run(Application().start())
```

## Backpressure and Rate Limiting

### Semaphore-Based Concurrency Control

```python
import asyncio

async def fetch_with_concurrency_limit(urls, max_concurrent=10):
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def bounded_fetch(url):
        async with semaphore:
            return await fetch_data(url)
    
    tasks = [bounded_fetch(url) for url in urls]
    return await asyncio.gather(*tasks, return_exceptions=True)

# Producer-consumer with bounded queue
async def producer_consumer_pipeline():
    queue = asyncio.Queue(maxsize=100)  # Backpressure: blocks when full
    
    async def producer():
        for i in range(1000):
            await queue.put(i)  # Blocks if queue is full
        await queue.put(None)  # Sentinel
    
    async def consumer(worker_id):
        while True:
            item = await queue.get()
            if item is None:
                queue.task_done()
                break
            await process_item(item)
            queue.task_done()
    
    producers = [asyncio.create_task(producer())]
    consumers = [asyncio.create_task(consumer(i)) for i in range(4)]
    
    await asyncio.gather(*producers)
    await queue.join()
    
    for c in consumers:
        await queue.put(None)  # Send sentinel to each consumer
    await asyncio.gather(*consumers)
```

### Rate Limiting with Token Bucket

```python
import asyncio
import time

class AsyncTokenBucket:
    def __init__(self, rate, capacity):
        self.rate = rate
        self.capacity = capacity
        self.tokens = capacity
        self.last_refill = time.monotonic()
        self.lock = asyncio.Lock()
    
    async def acquire(self):
        async with self.lock:
            now = time.monotonic()
            elapsed = now - self.last_refill
            self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
            self.last_refill = now
            
            if self.tokens >= 1:
                self.tokens -= 1
                return True
            
            # Wait for next token
            wait_time = (1 - self.tokens) / self.rate
            await asyncio.sleep(wait_time)
            self.tokens = 0
            return True

# Usage
bucket = AsyncTokenBucket(rate=10, capacity=20)  # 10 req/s, burst of 20

async def rate_limited_fetch(url):
    await bucket.acquire()
    return await fetch_data(url)
```

## Mixing Sync and Async

### Running Blocking Code in Async Context

```python
import asyncio
import requests

async def fetch_sync_in_async(url):
    # to_thread runs blocking function in a thread pool
    # Python 3.9+
    result = await asyncio.to_thread(requests.get, url)
    return result.json()

# For Python < 3.9, use run_in_executor
async def fetch_sync_legacy(url):
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,  # Default thread pool
        requests.get,
        url
    )
    return result.json()

# Custom thread pool for CPU-bound work
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=4)

async def cpu_bound_in_thread(data):
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        executor,
        heavy_computation,
        data
    )
    return result
```

### Process Pool for CPU-Bound Work

```python
import asyncio
from concurrent.futures import ProcessPoolExecutor

def heavy_computation(data):
    # CPU-bound work runs in a separate process
    result = 0
    for i in range(10 ** 7):
        result += i * data
    return result

async def main():
    # Process pool bypasses GIL for true parallelism
    with ProcessPoolExecutor(max_workers=4) as pool:
        loop = asyncio.get_event_loop()
        
        tasks = [
            loop.run_in_executor(pool, heavy_computation, i)
            for i in range(8)
        ]
        
        results = await asyncio.gather(*tasks)
        print(f"Results: {results}")

asyncio.run(main())
```

## Error Handling

### Exception Propagation in Tasks

```python
import asyncio

async def failing_task():
    await asyncio.sleep(0.1)
    raise ValueError("Something went wrong")

async def main():
    # If not awaited, exceptions are silently swallowed until GC
    task = asyncio.create_task(failing_task())
    
    try:
        await task
    except ValueError as e:
        print(f"Caught: {e}")
    
    # Check task state
    print(f"Task done: {task.done()}")
    print(f"Task cancelled: {task.cancelled()}")
    print(f"Task exception: {task.exception()}")

# gather with return_exceptions
async def gather_with_errors():
    results = await asyncio.gather(
        fetch_data("url1"),
        failing_task(),
        fetch_data("url3"),
        return_exceptions=True
    )
    
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            print(f"Task {i} failed: {result}")
        else:
            print(f"Task {i} succeeded: {result}")
```

### Custom Exception Handling

```python
import asyncio
import logging

logger = logging.getLogger(__name__)

def handle_task_exception(loop, context):
    msg = context.get("message", "Unhandled exception")
    exception = context.get("exception")
    task = context.get("task")
    
    logger.error(
        f"Unhandled exception in task: {msg}",
        exc_info=exception
    )
    
    # Custom recovery logic
    if task and not task.done():
        task.cancel()

async def main():
    loop = asyncio.get_event_loop()
    loop.set_exception_handler(handle_task_exception)
    
    # Tasks that might fail
    tasks = [asyncio.create_task(risky_operation()) for _ in range(10)]
    await asyncio.gather(*tasks, return_exceptions=True)

async def risky_operation():
    await asyncio.sleep(0.01)
    if hash(asyncio.current_task()) % 3 == 0:
        raise RuntimeError("Random failure")
```

## Debugging

### Debug Mode

```python
import asyncio

async def main():
    loop = asyncio.get_event_loop()
    loop.set_debug(True)
    
    # Enable slow callback warnings
    loop.slow_callback_duration = 0.1  # Warn if callback takes > 100ms
    
    await run_application()

# Environment variable
# PYTHONASYNCIODEBUG=1 python app.py
```

### Detecting Blocked Event Loop

```python
import asyncio
import time
import threading

def watchdog(loop, threshold=0.5):
    """Detect when the event loop is blocked."""
    last_tick = time.monotonic()
    
    def checker():
        nonlocal last_tick
        while True:
            now = time.monotonic()
            if now - last_tick > threshold:
                print(f"Event loop blocked for {now - last_tick:.2f}s")
            last_tick = now
            time.sleep(threshold / 2)
    
    thread = threading.Thread(target=checker, daemon=True)
    thread.start()

async def main():
    loop = asyncio.get_event_loop()
    watchdog(loop)
    
    # This will trigger the watchdog
    time.sleep(2)  # Blocking call — blocks the event loop!
```

### Logging with aiodebug

```python
import asyncio
import logging

# Log slow callbacks
def log_slow_callbacks(duration=0.1):
    loop = asyncio.get_event_loop()
    
    original_run_once = loop._run_once
    
    def instrumented_run_once():
        start = time.monotonic()
        original_run_once()
        elapsed = time.monotonic() - start
        if elapsed > duration:
            logging.getLogger("asyncio").warning(
                f"Callback took {elapsed:.3f}s"
            )
    
    loop._run_once = instrumented_run_once
```

## Testing Async Code

### pytest-asyncio

```python
import pytest
import asyncio

@pytest.mark.asyncio
async def test_fetch_data():
    result = await fetch_data("https://example.com")
    assert result["status"] == "ok"

@pytest.mark.asyncio
async def test_concurrent_fetch():
    results = await asyncio.gather(
        fetch_data("url1"),
        fetch_data("url2")
    )
    assert len(results) == 2

# Testing with mocks
@pytest.mark.asyncio
async def test_with_mock(mocker):
    mock_fetch = mocker.patch("__main__.fetch_data")
    mock_fetch.return_value = {"status": "ok"}
    
    result = await fetch_data("url1")
    assert result["status"] == "ok"
    mock_fetch.assert_called_once_with("url1")

# Testing timeouts
@pytest.mark.asyncio
async def test_timeout():
    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(slow_operation(), timeout=0.1)

# Testing cancellation
@pytest.mark.asyncio
async def test_cancellation():
    task = asyncio.create_task(long_running())
    await asyncio.sleep(0.01)
    task.cancel()
    
    with pytest.raises(asyncio.CancelledError):
        await task
```

## Production Patterns

### Connection Pooling

```python
import asyncio
import aiohttp

class HttpClientPool:
    def __init__(self, pool_size=100, timeout=30):
        self.pool_size = pool_size
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self.session = None
        self.semaphore = asyncio.Semaphore(pool_size)
    
    async def start(self):
        connector = aiohttp.TCPConnector(
            limit=self.pool_size,
            limit_per_host=20,
            ttl_dns_cache=300
        )
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=self.timeout
        )
    
    async def fetch(self, url):
        async with self.semaphore:
            async with self.session.get(url) as response:
                return await response.json()
    
    async def close(self):
        if self.session:
            await self.session.close()

# Usage
pool = HttpClientPool(pool_size=50)
await pool.start()
try:
    results = await asyncio.gather(*[pool.fetch(url) for url in urls])
finally:
    await pool.close()
```

### Health Checks and Liveness

```python
import asyncio
from aiohttp import web

class HealthServer:
    def __init__(self, app):
        self.app = app
        self.healthy = True
    
    async def health_handler(self, request):
        if self.healthy:
            return web.json_response({"status": "healthy"})
        return web.json_response(
            {"status": "unhealthy"},
            status=503
        )
    
    async def liveness_handler(self, request):
        return web.json_response({"status": "alive"})
    
    async def start(self):
        web_app = web.Application()
        web_app.router.add_get("/health", self.health_handler)
        web_app.router.add_get("/live", self.liveness_handler)
        runner = web.AppRunner(web_app)
        await runner.setup()
        site = web.TCPSite(runner, "0.0.0.0", 8081)
        await site.start()
```

## FAQ

### When should I use asyncio vs threading vs multiprocessing?

Use asyncio for I/O-bound work (HTTP requests, database queries, file I/O). Use threading for I/O-bound work with libraries that don't support async. Use multiprocessing for CPU-bound work (computation, data processing). asyncio gives the best concurrency for I/O on a single thread.

### What happens if I call a blocking function in async code?

The event loop stops processing other tasks while the blocking function runs. This affects all concurrent coroutines. Use `asyncio.to_thread()` or `loop.run_in_executor()` to run blocking functions in a thread pool. Monitor with a watchdog to detect blocked loops.

### How do I handle CancelledError?

Catch `CancelledError` in a `try/finally` block, perform cleanup in `finally`, and re-raise the `CancelledError`. Do not swallow it. If you catch it without re-raising, the task will not be properly cancelled, which can break `asyncio.gather` and `TaskGroup` semantics.

### What is the difference between asyncio.gather and TaskGroup?

`asyncio.gather` is fire-and-forget: you manage error handling and cancellation manually. `TaskGroup` (Python 3.11+) provides structured concurrency: if any task fails, all others are automatically cancelled. Use `TaskGroup` for new code. Use `gather` when you need fine-grained control over error handling.

### How do I debug a slow async application?

Enable debug mode with `loop.set_debug(True)` or `PYTHONASYNCIODEBUG=1`. This enables slow callback warnings and detects unclosed resources. Use a watchdog thread to detect blocked event loops. Profile with `pyinstrument` or `aiomonitor`. Check for blocking calls, excessive `await` points, or slow callbacks.

### Can I use asyncio with Flask?

Flask is synchronous. For async web frameworks, use FastAPI, aiohttp, or Starlette. If you must use Flask, run async code with `asyncio.run()` inside route handlers, or use Flask 2.0+ which supports async route handlers with `async def` (runs them in a thread pool).

## See Also

- [Complete Guide to Python Asyncio](/guides/complete-guide-python-asyncio/)
- [Complete Guide to Go Concurrency](/guides/complete-guide-go-concurrency/)
- [Complete Guide to Java Concurrency](/guides/complete-guide-java-concurrency/)
- [Concurrent Async Tasks with asyncio.gather and Task Groups](/recipes/python-asyncio-gather-task-groups/)
- [Rate Limit Async Operations with asyncio.Semaphore](/recipes/python-asyncio-semaphore-rate-limiting/)

