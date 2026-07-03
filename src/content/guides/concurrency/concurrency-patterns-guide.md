---
contentType: guides
slug: concurrency-patterns-guide
title: "Concurrency Patterns Guide"
description: "A guide to common concurrency patterns and what works for writing safe, efficient concurrent code."
metaDescription: "Learn concurrency patterns: thread pools, async/await, futures, semaphores, and race condition prevention. Practical examples in multiple languages."
difficulty: advanced
topics:
  - concurrency
  - architecture
tags:
  - architecture
  - concurrency
  - async
  - threads
  - parallel
relatedResources:
  - /recipes/caching
  - /patterns/design/singleton-pattern
  - /guides/software-architecture-guide
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn concurrency patterns: thread pools, async/await, futures, semaphores, and race condition prevention. Practical examples in multiple languages."
  keywords:
    - concurrency
    - async programming
    - thread pools
    - parallelism
    - race conditions
    - synchronization
---

## Introduction

Concurrency enables programs to handle multiple tasks simultaneously. Used correctly, it improves throughput and responsiveness. Used incorrectly, it introduces race conditions, deadlocks, and subtle bugs that are hard to reproduce.

## When to Use Concurrency

| Use Case | Approach |
|----------|----------|
| I/O-bound tasks (HTTP calls, DB queries) | Async/await, coroutines |
| CPU-bound tasks (data processing, ML) | Thread pools, multiprocessing |
| Real-time streaming | Event loops, reactive streams |
| Background jobs | Task queues (Celery, Bull, Sidekiq) |

## The Thread Pool Pattern

Instead of creating threads per task, reuse a fixed pool.

### Python

```python
from concurrent.futures import ThreadPoolExecutor
import requests

def fetch(url):
    return requests.get(url, timeout=10).status_code

urls = ["https://api.example.com/1", "https://api.example.com/2"]

with ThreadPoolExecutor(max_workers=5) as executor:
    results = list(executor.map(fetch, urls))
```

### Java

```java
ExecutorService executor = Executors.newFixedThreadPool(4);
List<Future<Integer>> futures = urls.stream()
    .map(url -> executor.submit(() -> fetch(url)))
    .toList();

for (Future<Integer> f : futures) {
    System.out.println(f.get());
}
executor.shutdown();
```

**Rule of thumb**: Pool size ~ number of CPU cores for CPU-bound tasks, higher for I/O-bound.

## Async/Await Pattern

Non-blocking I/O without threads.

### JavaScript (Node.js)

```javascript
async function fetchAll(urls) {
  const promises = urls.map(url => fetch(url));
  const responses = await Promise.all(promises);
  return responses.map(r => r.status);
}
```

### Python

```python
import asyncio
import aiohttp

async def fetch(session, url):
    async with session.get(url) as response:
        return response.status

async def fetch_all(urls):
    async with aiohttp.ClientSession() as session:
        tasks = [fetch(session, url) for url in urls]
        return await asyncio.gather(*tasks)
```

## Producer-Consumer Pattern

Decouple work generation from work processing.

```python
import asyncio
from asyncio import Queue

async def producer(queue: Queue, items: list):
    for item in items:
        await queue.put(item)
        print(f"Produced: {item}")
    await queue.put(None)

async def consumer(queue: Queue, worker_id: int):
    while True:
        item = await queue.get()
        if item is None:
            queue.put_nowait(None)
            break
        print(f"Consumer {worker_id} processing: {item}")
        await asyncio.sleep(0.1)
        queue.task_done()

# Usage
queue = asyncio.Queue(maxsize=10)
items = list(range(20))

await asyncio.gather(
    producer(queue, items),
    consumer(queue, 1),
    consumer(queue, 2),
)
```

## Semaphore for [Rate Limiting](/recipes/api/rate-limiting)

Control access to limited resources.

```python
import asyncio

class RateLimitedClient:
    def __init__(self, max_concurrent: int = 5):
        self.semaphore = asyncio.Semaphore(max_concurrent)

    async def request(self, url: str):
        async with self.semaphore:
            return await fetch(url)
```

## Avoiding Race Conditions

### Immutable Data

The best synchronization is no synchronization.

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Point:
    x: float
    y: float

# frozen=True makes instances immutable and thread-safe
```

### Atomic Operations

```python
import threading

class SafeCounter:
    def __init__(self):
        self._value = 0
        self._lock = threading.Lock()

    def increment(self):
        with self._lock:
            self._value += 1
```

### Read-Write Lock

```java
import java.util.concurrent.locks.ReentrantReadWriteLock;

class CachedData {
    private String data;
    private final ReentrantReadWriteLock rwl = new ReentrantReadWriteLock();

    String read() {
        rwl.readLock().lock();
        try { return data; }
        finally { rwl.readLock().unlock(); }
    }

    void write(String newData) {
        rwl.writeLock().lock();
        try { this.data = newData; }
        finally { rwl.writeLock().unlock(); }
    }
}
```

## Common Pitfalls

| Problem | Symptom | Solution |
|---------|---------|----------|
| **Race condition** | Intermittent wrong results | Locks, atomic operations, or immutability |
| **Deadlock** | Threads freeze waiting for each other | Consistent lock ordering, timeouts |
| **Starvation** | Some threads never execute | Fair locks, priority queues |
| **Thread leak** | Memory grows over time | Use thread pools, always shutdown |
| **Context switching** | High CPU, low throughput | Reduce thread count, use async I/O |

## What Works

- **Share nothing**: Prefer message passing over shared state
- **Use thread-safe collections**: `ConcurrentHashMap`, `Queue`, `AtomicInteger`
- **Keep critical sections small**: Hold locks for the minimum time
- **Never call external APIs while holding a lock** — see [retry with backoff](/recipes/architecture/retry-backoff) for resilient external calls
- **Test with ThreadSanitizer** or Helgrind for race detection

## Language Quick Reference

| Language | Threading | Async I/O | Notable APIs |
|----------|-----------|-----------|-------------|
| **Python** | `threading`, `multiprocessing` | `asyncio`, `aiohttp` | `ThreadPoolExecutor`, `Semaphore` |
| **JavaScript** | Web Workers | `Promise`, `async/await` | `Promise.all`, `Atomics` |
| **Java** | `java.util.concurrent` | `CompletableFuture` | `ExecutorService`, `CountDownLatch` |
| **Go** | Goroutines | Built-in channels | `sync.WaitGroup`, `select` |
| **Rust** | `std::thread` | `tokio` | `Arc<Mutex<T>>`, `mpsc` |

## Frequently Asked Questions

### When should I use async/await vs threads?

Use async/await for I/O-bound tasks ([HTTP calls](/guides/api/rest-api-design-guide), [file system](/recipes/file-handling/read-write-file), databases). Use threads or processes for CPU-bound work (calculations, data processing) that needs parallel execution.

### How do I avoid deadlocks?

Always acquire locks in the same order across your codebase. Use timeouts on lock acquisition. Prefer lock-free data structures when possible. The simplest fix is often to reduce shared state.

### What is the difference between concurrency and parallelism?

Concurrency is about structuring a program to handle multiple tasks (interleaving). Parallelism is about executing multiple tasks simultaneously (truly at the same time). Async I/O is concurrent; multithreading on multiple cores is parallel.

