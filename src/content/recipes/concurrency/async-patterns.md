---
contentType: recipes
slug: async-patterns
title: "Master Async Patterns with Promises, Futures, and Coroutines"
description: "How to write efficient concurrent code using async/await, promises, futures, and coroutines in JavaScript, Python, and Java for non-blocking I/O and parallel processing."
metaDescription: "Learn async patterns for concurrent programming. Master async/await, promises, futures, and coroutines in JavaScript, Python, and Java for non-blocking I/O."
difficulty: intermediate
topics:
  - concurrency
tags:
  - concurrency
  - event-loop
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/serverless-functions
  - /recipes/event-driven-functions
  - /recipes/load-testing
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn async patterns for concurrent programming. Master async/await, promises, futures, and coroutines in JavaScript, Python, and Java for non-blocking I/O."
  keywords:
    - async await patterns
    - promises concurrency
    - coroutines python
    - non blocking io
    - parallel processing
---

## Overview

Synchronous code blocks the execution thread until an operation completes. When that operation is I/O — querying a database, fetching from an API, reading a file — the thread sits idle, wasting CPU cycles that could process other requests. Async programming solves this by suspending the current task when it encounters I/O, allowing the runtime to execute other tasks, and resuming the original task when the I/O completes. This enables a single thread to handle thousands of concurrent connections.

The challenge is not writing `async` and `await` keywords — it is understanding the underlying event loop, avoiding callback hell, handling errors across suspension points, and preventing resource contention when multiple tasks access shared state. Different runtimes implement async differently: JavaScript uses an event loop with promises, Python uses `asyncio` with coroutines, and Java uses `CompletableFuture` with thread pools. This recipe covers patterns, anti-patterns, and practical implementations across all three.

## When to use it

Use this recipe when:

- Building APIs that handle hundreds of concurrent requests per process
- Fetching data from multiple services that can be called in parallel
- Processing I/O-bound workloads like web scraping, file uploads, or message queues
- Implementing real-time capabilities como [WebSockets](/recipes/api/websocket-server), chat, o live dashboards
- Replacing thread-per-request models with [event-driven architectures](/recipes/architecture/event-driven-architecture) for efficiency

## Solution

### Async/Await with Concurrent Requests (JavaScript / Node.js)

```javascript
async function fetchUserDashboard(userId) {
  const [profile, orders, recommendations] = await Promise.all([
    getProfile(userId),
    getOrders(userId),
    getRecommendations(userId),
  ]);
  return { profile, orders, recommendations };
}

async function fetchDashboardResilient(userId) {
  const [profile, orders, recommendations] = await Promise.allSettled([
    getProfile(userId),
    getOrders(userId),
    getRecommendations(userId),
  ]);

  return {
    profile: profile.status === 'fulfilled' ? profile.value : null,
    orders: orders.status === 'fulfilled' ? orders.value : [],
    recommendations: recommendations.status === 'fulfilled' ? recommendations.value : [],
  };
}
```

### Python asyncio with Task Groups

```python
import asyncio
import aiohttp

async def fetch_url(session: aiohttp.ClientSession, url: str) -> dict:
    async with session.get(url) as response:
        return await response.json()

async def fetch_all_urls(urls: list[str]) -> list[dict]:
    async with aiohttp.ClientSession() as session:
        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(fetch_url(session, url)) for url in urls]
        return [task.result() for task in tasks]

async def fetch_with_limit(urls: list[str], max_concurrent: int = 10):
    semaphore = asyncio.Semaphore(max_concurrent)

    async def bounded_fetch(session, url):
        async with semaphore:
            return await fetch_url(session, url)

    async with aiohttp.ClientSession() as session:
        return await asyncio.gather(
            *[bounded_fetch(session, url) for url in urls]
        )

urls = ["https://api.example.com/users/1", "https://api.example.com/users/2"]
results = asyncio.run(fetch_all_urls(urls))
```

### Java CompletableFuture Pipeline

```java
import java.util.concurrent.CompletableFuture;

public class AsyncOrderService {
    public CompletableFuture<Order> processOrder(String orderId) {
        return validateOrder(orderId)
            .thenCompose(this::checkInventory)
            .thenCompose(this::processPayment)
            .thenCompose(this::createShipment)
            .exceptionally(ex -> {
                log.error("Order processing failed", ex);
                return Order.failed(orderId, ex.getMessage());
            });
    }

    private CompletableFuture<ValidatedOrder> validateOrder(String orderId) {
        return CompletableFuture.supplyAsync(() -> new ValidatedOrder(orderId));
    }

    public CompletableFuture<Dashboard> loadDashboard(String userId) {
        CompletableFuture<Profile> profileFuture = fetchProfile(userId);
        CompletableFuture<List<Order>> ordersFuture = fetchOrders(userId);
        return profileFuture.thenCombine(ordersFuture, Dashboard::new);
    }
}
```

## Explanation

- **Event loop**: the core mechanism in JavaScript and Python asyncio. It maintains a queue of tasks and executes them one at a time. When a task hits an `await`, it yields control, and the loop picks up the next task. When the awaited operation completes, the task is rescheduled. This single-threaded concurrency avoids the overhead of thread switching.
- **Structured concurrency**: in Python 3.11+, `asyncio.TaskGroup` ensures that if any child task fails, all other tasks in the group are cancelled. This prevents orphaned background tasks that leak memory or hold resources after a parent failure.
- **Promise composition**: JavaScript promises chain via `.then()` and `.catch()`. `Promise.all()` waits for all promises, failing fast if any rejects. `Promise.allSettled()` waits for all, returning both successes and failures. `Promise.race()` returns the first to settle.
- **Backpressure with semaphores**: unbounded concurrency exhausts memory, file descriptors, and upstream quotas. A semaphore limits the number of simultaneous operations. With a limit of 10, only 10 HTTP requests are in flight at any time; the 11th waits until a slot frees.

## Variants

| Pattern | Language | Concurrency model | Error handling | Best for |
|---------|----------|-------------------|----------------|----------|
| async/await | JS/Python | Event loop | try/catch | I/O-bound APIs |
| CompletableFuture | Java | Thread pool | exceptionally() | CPU + I/O mixed |
| Goroutines | Go | M:N threads | Channels | High-throughput services |
| RxJS/RxPY | JS/Python | Observables | onError | Event streams |
| Threads | All | OS threads | try/catch | CPU-bound tasks |

## What works

- **Always await promises**: an unawaited promise is a fire-and-forget operation that silently swallows errors. If a promise rejects and nothing awaits it, Node.js emits an `unhandledRejection` warning. In async functions, always `await` or `.catch()` every promise.
- **Use Promise.all for independence, sequential for dependencies**: if task B needs the result of task A, they must run sequentially. If they are independent, use `Promise.all` or `asyncio.gather` to run them concurrently. Running independent tasks sequentially wastes time.
- **Set timeouts on all external calls**: an unresponsive API can hang an async operation indefinitely. Wrap every external call in a timeout with [retry logic](/recipes/architecture/retry-backoff). This prevents resource leaks and ensures predictable latencies.
- **Prefer structured concurrency over fire-and-forget**: spawning a background task that outlives its parent is a common source of memory leaks and race conditions. Use task groups, `asyncio.gather`, or explicit cancellation tokens to ensure lifetimes are managed.
- **Profile the event loop**: in Node.js, use `clinic.js` or `0x` to detect event loop lag. In Python, use `asyncio.run` with debug mode. If the event loop is blocked by CPU work, move it to a worker thread or process pool.

## Common mistakes

- **Blocking the event loop**: calling a synchronous file read (`fs.readFileSync`) or a heavy computation inside an async function blocks the entire event loop. All other requests stall. Use async equivalents (`fs.promises.readFile`) or offload CPU work to worker threads.
- **Callback hell without async/await**: deeply nested `.then()` chains are hard to read and debug. Modern JavaScript should use `async/await` for all but the simplest cases. It produces flat, readable code that looks synchronous but executes asynchronously.
- **Race conditions on shared mutable state**: two concurrent tasks incrementing a counter without synchronization produce incorrect results. In async environments, use [atomic operations](/recipes/concurrency/concurrent-data-structures), locks, or message passing rather than shared mutable state.
- **Ignoring backpressure**: accepting requests faster than they can be processed leads to memory exhaustion and OOM kills. Implement [rate limiting](/recipes/api/rate-limiting), bounded queues, and load shedding. A 503 response is better than a crashed server.

## FAQ

**Q: Is async always faster than synchronous?**
A: Only for I/O-bound workloads. For CPU-bound tasks (image processing, machine learning), async provides no benefit because the CPU is already saturated. Use threads, processes, or dedicated workers for CPU parallelism.

**Q: How many concurrent requests can a single Node.js process handle?**
A: Thousands, limited by memory and file descriptors. The event loop handles one operation at a time, but most operations are I/O waits. A typical Node.js server handles 5,000-10,000 concurrent connections.

**Q: What is the difference between concurrency and parallelism?**
A: Concurrency is interleaving tasks on a single core (async/await). Parallelism is running tasks simultaneously on multiple cores (threads/processes). Async provides concurrency; multiprocessing provides parallelism. Use both for maximum throughput.

**Q: Should I use threads or async in Python?**
A: Use `asyncio` for I/O-bound workloads with many connections. Use `threading` for I/O with blocking libraries that do not support async. Use `multiprocessing` for CPU-bound work that must bypass the GIL. `asyncio` is usually the best choice for web servers and API clients.

