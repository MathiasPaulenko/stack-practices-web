---
contentType: recipes
slug: python-thread-pool-executor
title: "Parallelize CPU and I/O Work with ThreadPoolExecutor"
description: "Use Python's ThreadPoolExecutor for parallel I/O operations, thread-safe result collection, Future callbacks, error handling, and mixing threads with asyncio for blocking work."
metaDescription: "Parallelize I/O work in Python with ThreadPoolExecutor. Use Future callbacks, thread-safe results, error handling, and mix threads with asyncio."
difficulty: intermediate
topics:
  - concurrency
  - performance
tags:
  - python
  - threading
  - thread-pool
  - parallelism
  - concurrent-futures
relatedResources:
  - /recipes/concurrency/python-asyncio-gather-task-groups
  - /recipes/concurrency/python-asyncio-semaphore-rate-limiting
  - /guides/concurrency-patterns-guide
  - /guides/complete-guide-python-asyncio
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Parallelize I/O work in Python with ThreadPoolExecutor. Use Future callbacks, thread-safe results, error handling, and mix threads with asyncio."
  keywords:
    - python threadpool executor
    - concurrent futures python
    - python thread pool
    - python parallel io
    - future callback python
---

## Overview

`ThreadPoolExecutor` from `concurrent.futures` provides a simple API for running functions in parallel threads. It's ideal for I/O-bound work (HTTP requests, file operations, database queries) where the GIL is released. Below: basic parallel execution, `map` vs `submit`, Future callbacks, error handling, context manager usage, and mixing threads with asyncio.

## When to Use This

- I/O-bound parallel work (HTTP requests, file downloads, database queries)
- Calling blocking libraries from async code
- Parallel execution of independent functions without async support
- Background tasks that don't need the event loop

## Prerequisites

- Python 3.10+

## Solution

### 1. Basic ThreadPoolExecutor

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
import time

def fetch_url(url: str) -> dict:
    response = requests.get(url, timeout=10)
    return {'url': url, 'status': response.status_code, 'size': len(response.content)}

urls = [
    'https://api.example.com/users',
    'https://api.example.com/orders',
    'https://api.example.com/products',
    'https://api.example.com/inventory',
]

# Using context manager — pool is automatically shut down
start = time.time()
with ThreadPoolExecutor(max_workers=4) as executor:
    futures = {executor.submit(fetch_url, url): url for url in urls}

    for future in as_completed(futures):
        url = futures[future]
        try:
            result = future.result()
            print(f"{url}: {result['status']} ({result['size']} bytes)")
        except Exception as e:
            print(f"{url} failed: {e}")

print(f"Total time: {time.time() - start:.2f}s")
```

### 2. Using executor.map (Ordered Results)

```python
from concurrent.futures import ThreadPoolExecutor

def process_item(item: int) -> int:
    import time
    time.sleep(0.5)
    return item * 2

items = list(range(10))

with ThreadPoolExecutor(max_workers=5) as executor:
    # map returns results in the SAME ORDER as input — unlike as_completed
    results = list(executor.map(process_item, items))

print(results)  # [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
```

### 3. Future Callbacks

```python
from concurrent.futures import ThreadPoolExecutor
import threading

def long_task(task_id: int) -> str:
    import time
    time.sleep(1)
    return f"Result of task {task_id}"

def on_complete(future):
    try:
        result = future.result()
        print(f"[Thread {threading.current_thread().name}] Callback: {result}")
    except Exception as e:
        print(f"Callback error: {e}")

with ThreadPoolExecutor(max_workers=3) as executor:
    futures = []
    for i in range(5):
        future = executor.submit(long_task, i)
        future.add_done_callback(on_complete)
        futures.append(future)

    # Wait for all to complete
    for future in futures:
        future.result()
```

### 4. Error Handling

```python
from concurrent.futures import ThreadPoolExecutor, as_completed

def risky_task(task_id: int) -> str:
    if task_id == 2:
        raise ValueError(f"Task {task_id} intentionally failed")
    import time
    time.sleep(0.1)
    return f"Task {task_id} succeeded"

with ThreadPoolExecutor(max_workers=5) as executor:
    futures = {executor.submit(risky_task, i): i for i in range(5)}

    for future in as_completed(futures):
        task_id = futures[future]
        try:
            result = future.result(timeout=5)
            print(f"Success: {result}")
        except ValueError as e:
            print(f"Task {task_id} ValueError: {e}")
        except TimeoutError:
            print(f"Task {task_id} timed out")
        except Exception as e:
            print(f"Task {task_id} unexpected error: {type(e).__name__}: {e}")
```

### 5. Thread-Safe Result Collection

```python
from concurrent.futures import ThreadPoolExecutor
from threading import Lock
import requests

class ThreadSafeResults:
    def __init__(self):
        self._results = []
        self._lock = Lock()
        self._errors = []

    def add_result(self, result):
        with self._lock:
            self._results.append(result)

    def add_error(self, error):
        with self._lock:
            self._errors.append(error)

    @property
    def results(self):
        with self._lock:
            return list(self._results)

    @property
    def errors(self):
        with self._lock:
            return list(self._errors)

def fetch_and_store(url: str, storage: ThreadSafeResults):
    try:
        response = requests.get(url, timeout=10)
        storage.add_result({'url': url, 'status': response.status_code})
    except Exception as e:
        storage.add_error({'url': url, 'error': str(e)})

storage = ThreadSafeResults()
urls = [f'https://api.example.com/data/{i}' for i in range(50)]

with ThreadPoolExecutor(max_workers=10) as executor:
    executor.map(lambda url: fetch_and_store(url, storage), urls)

print(f"Successes: {len(storage.results)}")
print(f"Failures: {len(storage.errors)}")
```

### 6. Mixing Threads with asyncio

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor
import requests

def blocking_fetch(url: str) -> dict:
    """Synchronous function that blocks — runs in a thread."""
    response = requests.get(url, timeout=10)
    return response.json()

async def fetch_all(urls: list) -> list:
    loop = asyncio.get_event_loop()

    # Run blocking function in thread pool — doesn't block the event loop
    with ThreadPoolExecutor(max_workers=10) as executor:
        tasks = [
            loop.run_in_executor(executor, blocking_fetch, url)
            for url in urls
        ]
        return await asyncio.gather(*tasks, return_exceptions=True)

# Or use asyncio.to_thread (Python 3.9+) for simpler cases
async def fetch_one(url: str) -> dict:
    return await asyncio.to_thread(blocking_fetch, url)

urls = [f'https://api.example.com/data/{i}' for i in range(20)]
results = asyncio.run(fetch_all(urls))
```

### 7. Chunked Processing

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

def process_chunk(chunk: list) -> list:
    """Process a chunk of URLs sequentially within one thread."""
    results = []
    for url in chunk:
        try:
            response = requests.get(url, timeout=10)
            results.append({'url': url, 'status': response.status_code})
        except Exception as e:
            results.append({'url': url, 'error': str(e)})
    return results

def process_in_chunks(urls: list, num_workers: int = 5) -> list:
    # Split URLs into chunks — one per worker
    chunk_size = (len(urls) + num_workers - 1) // num_workers
    chunks = [urls[i:i + chunk_size] for i in range(0, len(urls), chunk_size)]

    all_results = []
    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        futures = {executor.submit(process_chunk, chunk): chunk for chunk in chunks}

        for future in as_completed(futures):
            all_results.extend(future.result())

    return all_results

urls = [f'https://api.example.com/data/{i}' for i in range(100)]
results = process_in_chunks(urls, num_workers=10)
```

### 8. ProcessPoolExecutor for CPU-Bound Work

```python
from concurrent.futures import ProcessPoolExecutor
import math

def is_prime(n: int) -> bool:
    if n < 2:
        return False
    for i in range(2, int(math.sqrt(n)) + 1):
        if n % i == 0:
            return False
    return True

def count_primes(start: int, end: int) -> int:
    return sum(1 for n in range(start, end) if is_prime(n))

# Use ProcessPoolExecutor for CPU-bound work — bypasses the GIL
ranges = [(0, 100000), (100000, 200000), (200000, 300000), (300000, 400000)]

with ProcessPoolExecutor(max_workers=4) as executor:
    futures = [executor.submit(count_primes, start, end) for start, end in ranges]
    total = sum(f.result() for f in futures)

print(f"Total primes: {total}")
```

## How It Works

1. **ThreadPoolExecutor**: Manages a pool of worker threads. `submit()` schedules a function to run in a thread and returns a `Future`. The pool reuses threads, avoiding the overhead of creating a thread per task.
2. **`submit` vs `map`**: `submit` returns a `Future` immediately — results arrive in completion order with `as_completed`. `map` returns an iterator that yields results in input order, blocking until each is ready.
3. **Future**: Represents the eventual result of an asynchronous operation. `future.result()` blocks until the operation completes and returns the result (or raises the exception).
4. **GIL**: Python's Global Interpreter Lock prevents multiple threads from executing Python bytecode simultaneously. However, I/O operations (network, file, sleep) release the GIL, allowing true parallelism for I/O-bound work.
5. **ProcessPoolExecutor**: For CPU-bound work, use processes instead of threads. Each process has its own GIL, enabling true parallelism for computation.

## Variants

### Reusable Executor

```python
from concurrent.futures import ThreadPoolExecutor

class WorkerPool:
    """Long-lived thread pool for repeated use."""
    def __init__(self, max_workers: int = 10):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)

    def submit(self, fn, *args, **kwargs):
        return self.executor.submit(fn, *args, **kwargs)

    def map(self, fn, *iterables):
        return self.executor.map(fn, *iterables)

    def shutdown(self):
        self.executor.shutdown(wait=True)

# Usage — keep the pool alive across multiple batches
pool = WorkerPool(max_workers=10)
results1 = list(pool.map(fetch_url, urls_batch1))
results2 = list(pool.map(fetch_url, urls_batch2))
pool.shutdown()
```

### Thread-Local Storage

```python
from concurrent.futures import ThreadPoolExecutor
import threading

thread_local = threading.local()

def init_session():
    if not hasattr(thread_local, 'session'):
        import requests
        thread_local.session = requests.Session()
    return thread_local.session

def fetch_with_reused_session(url: str) -> dict:
    session = init_session()  # Each thread gets its own session
    response = session.get(url, timeout=10)
    return {'url': url, 'status': response.status_code}

# Each thread reuses its own Session — connection pooling per thread
with ThreadPoolExecutor(max_workers=5) as executor:
    results = list(executor.map(fetch_with_reused_session, urls))
```

## Best Practices

- **Use threads for I/O, processes for CPU**: Threads are fine for HTTP requests and file I/O (GIL is released). For CPU-bound work, use `ProcessPoolExecutor` to bypass the GIL.
- **Set `max_workers` appropriately**: For I/O-bound work, 5-20 workers is typical. For CPU-bound work, match the number of CPU cores. Too many workers cause context-switching overhead.
- **Always use context manager**: `with ThreadPoolExecutor() as executor` ensures the pool is shut down even if exceptions occur.
- **Use `as_completed` for progress**: `as_completed` yields futures as they finish, allowing progressive result processing. Use `map` when order matters.
- **Handle exceptions per-future**: `future.result()` re-raises the original exception. Catch it per-future to handle failures without aborting the entire batch.
- **Use thread-local for per-thread resources**: Database connections and HTTP sessions should be per-thread to avoid sharing issues. Use `threading.local()`.

## Common Mistakes

- **Using threads for CPU-bound work**: The GIL prevents true parallelism for computation. Use `ProcessPoolExecutor` instead.
- **Not handling exceptions**: If a future raises and you don't call `future.result()`, the exception is silently swallowed. Always call `result()` or check `future.exception()`.
- **Sharing mutable state without locks**: Threads access shared memory. Use `threading.Lock` or thread-safe data structures to prevent race conditions.
- **Creating too many threads**: Each thread consumes ~8MB of stack space. 1000 threads = 8GB of stack. Use a bounded pool.
- **Not shutting down the executor**: Without the context manager, you must call `executor.shutdown()`. Leaked executors keep threads alive, preventing process exit.

## FAQ

**When should I use ThreadPoolExecutor vs asyncio?**

Use `ThreadPoolExecutor` for calling blocking libraries (requests, psycopg2) that don't have async equivalents. Use asyncio for new code where you control the I/O layer (aiohttp, asyncpg).

**How many workers should I use?**

For I/O-bound work: 5-20 is typical. For CPU-bound work: `os.cpu_count()`. More workers than necessary cause context-switching overhead. Monitor with `executor._work_queue.qsize()`.

**What is the GIL and how does it affect threads?**

The Global Interpreter Lock prevents multiple threads from executing Python bytecode simultaneously. I/O operations release the GIL, allowing threads to run in parallel during I/O. CPU-bound work doesn't release the GIL, so threads run sequentially.

**Can I cancel a submitted future?**

Yes. `future.cancel()` prevents the future from running if it hasn't started yet. If it's already running, cancellation fails. Check `future.cancelled()` to verify.

**What is the difference between `map` and `submit`?**

`map` returns results in input order and blocks until each result is ready. `submit` returns a `Future` immediately — use `as_completed` to process results as they finish. Use `map` for ordered results, `submit` for flexibility.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
