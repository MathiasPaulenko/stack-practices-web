---
contentType: recipes
slug: thread-pools
title: "Manage Concurrent Work with Thread Pools and Executors"
description: "How to efficiently manage worker threads using thread pools, executors, and rejection policies in Java, Python, and C# for CPU-bound and I/O-bound workloads."
metaDescription: "Learn thread pool patterns for concurrent work. Manage worker threads with executors and rejection policies in Java, Python, and C# for CPU and I/O workloads."
difficulty: intermediate
topics:
  - concurrency
tags:
  - concurrency
  - cpu-bound
  - executors
relatedResources:
  - /recipes/async-patterns
  - /recipes/microservices-patterns
  - /recipes/load-balancing
  - /recipes/serverless-functions
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn thread pool patterns for concurrent work. Manage worker threads with executors and rejection policies in Java, Python, and C# for CPU and I/O workloads."
  keywords:
    - thread pools
    - java executors
    - worker threads
    - concurrent processing
    - thread pool size
---

## Overview

Creating a new thread for every concurrent task is expensive. Each thread consumes memory for its stack (typically 1MB), requires OS scheduling, and adds context-switching overhead. At high concurrency, thread creation becomes a bottleneck — the system spends more time managing threads than doing useful work. Thread pools solve this by maintaining a fixed set of reusable worker threads. Tasks are submitted to a queue; idle workers pick them up. When all workers are busy, tasks wait in the queue instead of spawning new threads.

The challenge is sizing the pool correctly and handling overload. A CPU-bound task on an 8-core machine benefits from 8 threads — more threads just compete for cores. An I/O-bound task benefits from more threads than cores because threads spend most of their time waiting for disk or network. When the queue fills, the pool must decide whether to reject tasks, block the submitter, or run them in the calling thread. This recipe covers pool sizing, executor patterns, and rejection strategies across Java, Python, and C#.

## When to use it

Use this recipe when:

- Processing a high volume of independent tasks concurrently
- Running CPU-bound computations (image processing, data transformation, ML inference)
- Executing I/O-bound operations where threads spend time waiting (API calls, file reads)
- Limiting resource usage to prevent thread exhaustion or memory pressure
- Building worker queues where tasks must execute asynchronously from the submitter

## Solution

### Java Executors (Fixed Thread Pool)

```java
import java.util.concurrent.*;

public class ImageProcessor {
    private final ExecutorService executor;

    public ImageProcessor(int poolSize) {
        this.executor = Executors.newFixedThreadPool(poolSize);
    }

    public CompletableFuture<String> processAsync(String imageId) {
        return CompletableFuture.supplyAsync(() -> {
            // CPU-intensive image processing
            return processImage(imageId);
        }, executor);
    }

    public void shutdown() {
        executor.shutdown();
        try {
            if (!executor.awaitTermination(60, TimeUnit.SECONDS)) {
                executor.shutdownNow();
            }
        } catch (InterruptedException e) {
            executor.shutdownNow();
        }
    }
}

// Custom thread factory for named threads
ExecutorService executor = new ThreadPoolExecutor(
    4,                      // core pool size
    8,                      // maximum pool size
    30L,                    // keep-alive time
    TimeUnit.SECONDS,
    new LinkedBlockingQueue<>(100),  // queue with bounded capacity
    new ThreadFactory() {
        private final AtomicInteger counter = new AtomicInteger(0);
        public Thread newThread(Runnable r) {
            return new Thread(r, "worker-" + counter.incrementAndGet());
        }
    },
    new ThreadPoolExecutor.CallerRunsPolicy()  // run in caller thread if full
);
```

### Python concurrent.futures

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

def fetch_url(url):
    response = requests.get(url, timeout=10)
    return response.json()

urls = [
    "https://api.example.com/users/1",
    "https://api.example.com/users/2",
    "https://api.example.com/users/3",
]

# I/O-bound: more threads than cores
with ThreadPoolExecutor(max_workers=20) as executor:
    futures = {executor.submit(fetch_url, url): url for url in urls}

    for future in as_completed(futures):
        url = futures[future]
        try:
            data = future.result()
            print(f"Fetched {url}: {data}")
        except Exception as e:
            print(f"Failed {url}: {e}")

# CPU-bound: use ProcessPoolExecutor instead
from concurrent.futures import ProcessPoolExecutor

def process_data(chunk):
    # Heavy computation
    return sum(x ** 2 for x in chunk)

data = [range(0, 1000000), range(1000000, 2000000)]
with ProcessPoolExecutor(max_workers=4) as executor:
    results = list(executor.map(process_data, data))
```

### C# Task Parallel Library

```csharp
using System.Threading.Tasks;

public class WorkerPool
{
    private readonly TaskFactory _factory;

    public WorkerPool(int maxConcurrency)
    {
        var options = new ParallelOptions
        {
            MaxDegreeOfParallelism = maxConcurrency
        };
    }

    public async Task ProcessBatchAsync(IEnumerable<string> items)
    {
        var semaphore = new SemaphoreSlim(10); // max 10 concurrent

        var tasks = items.Select(async item =>
        {
            await semaphore.WaitAsync();
            try
            {
                return await ProcessItemAsync(item);
            }
            finally
            {
                semaphore.Release();
            }
        });

        var results = await Task.WhenAll(tasks);
    }

    private async Task<string> ProcessItemAsync(string item)
    {
        await Task.Delay(100); // simulate work
        return $"Processed: {item}";
    }
}

// Dedicated thread pool for CPU work
ThreadPool.SetMinThreads(4, 4);
ThreadPool.SetMaxThreads(8, 8);
```

## Explanation

- **Core vs maximum pool size**: the core size is the number of threads kept alive even when idle. The maximum size is the upper bound. When tasks exceed core size, new threads are created up to the maximum. Threads above the core size are terminated after the keep-alive timeout if idle. This allows the pool to scale between a baseline and a peak.
- **Work queue**: tasks submitted when all threads are busy wait in a queue. An unbounded queue (`LinkedBlockingQueue`) accepts infinite tasks but risks `OutOfMemoryError`. A bounded queue limits memory but requires a rejection policy when full.
- **Rejection policies**: when the pool and queue are saturated, Java offers four policies. `AbortPolicy` (default) throws an exception. `CallerRunsPolicy` runs the task in the submitter's thread, slowing submission. `DiscardPolicy` silently drops the task. `DiscardOldestPolicy` drops the oldest queued task.
- **Thread-per-task vs pools**: creating a thread per task works for a few dozen concurrent operations. At hundreds or thousands, thread creation overhead dominates. Pools amortize creation cost across the application lifetime and provide bounded resource usage.

## Variants

| Pool type | Core threads | Max threads | Queue | Best for |
|-----------|-------------|-------------|-------|----------|
| Fixed | N | N | Unbounded | Steady-state CPU work |
| Cached | 0 | Unlimited | Synchronous | Burst I/O, short-lived tasks |
| Single | 1 | 1 | Unbounded | Ordered execution |
| Scheduled | N | N | Delayed queue | Timed/recurring tasks |
| Work stealing | CPU count | CPU count | Deque per thread | Fork-join parallelism |

## Best practices

- **Size CPU pools to core count**: for CPU-bound work, use `Runtime.getRuntime().availableProcessors()` or `os.cpu_count()`. Additional threads just compete for cores, causing context switches without throughput gains.
- **Size I/O pools higher than core count**: for I/O-bound work, threads block on network/disk. A thread waiting for a response is not using a core. Use 2x-4x core count for I/O pools, depending on latency. Measure to find the sweet spot.
- **Always shut down gracefully**: an unterminated executor leaks threads and prevents JVM/Python process exit. Call `shutdown()`, wait for termination, then `shutdownNow()` if needed. Use try-with-resources in Python (`with ThreadPoolExecutor`).
- **Use bounded queues with rejection policies**: unbounded queues hide backpressure. A system that accepts infinite tasks will eventually crash. Use bounded queues and handle rejection by shedding load (return 503) or slowing the submitter.
- **Name your threads**: debugging a thread dump of 50 unnamed threads is impossible. Use custom thread factories to name threads (`worker-1`, `worker-2`). This makes profiling, logging, and debugging trivial.

## Common mistakes

- **Blocking the caller with `Future.get()` without timeout**: `future.get()` waits indefinitely. If the worker thread hangs (infinite loop, deadlock), the caller hangs forever. Always use `future.get(timeout, TimeUnit.SECONDS)`.
- **Using threads for CPU-bound work in Python**: Python's GIL prevents true thread parallelism for CPU work. A `ThreadPoolExecutor` with 8 threads on an 8-core machine runs tasks sequentially, not in parallel. Use `ProcessPoolExecutor` for CPU-bound Python tasks.
- **Ignoring exceptions in fire-and-forget tasks**: submitting a task and ignoring the future swallows exceptions. The task fails silently. Always capture futures and check for exceptions, or use a completion callback.
- **Creating a new pool per request**: a web handler that creates a new `ExecutorService` for each incoming request defeats the purpose. Create one pool at application startup and reuse it. Pass it as a dependency to handlers.

## FAQ

**Q: How many threads should my pool have?**
A: For CPU-bound tasks: equal to core count. For I/O-bound tasks: `cores * (1 + wait_time / compute_time)`. If a task spends 50ms computing and 450ms waiting, use `cores * 10`. Measure and adjust based on throughput and latency.

**Q: What is the difference between a thread pool and a coroutine pool?**
A: Thread pools use OS threads — expensive but truly parallel. Coroutine pools (asyncio, Goroutines) use lightweight user-space threads — cheap but limited by the GIL in Python. Use threads for CPU parallelism and blocking I/O. Use coroutines for high-concurrency I/O with low per-task overhead.

**Q: Should I use `CallerRunsPolicy` or `AbortPolicy`?**
A: `CallerRunsPolicy` provides natural backpressure — the submitter slows down when the system is overloaded. `AbortPolicy` forces you to handle rejection explicitly. Use `CallerRunsPolicy` for batch processing where slowing down is acceptable. Use `AbortPolicy` for interactive systems where you need to return errors quickly.

**Q: Can I change the pool size at runtime?**
A: Yes — Java's `ThreadPoolExecutor` supports `setCorePoolSize()` and `setMaximumPoolSize()`. This is useful for dynamic scaling based on load metrics. However, growing the pool creates new threads (expensive), and shrinking does not interrupt active threads.

