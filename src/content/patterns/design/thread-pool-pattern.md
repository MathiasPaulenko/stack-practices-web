---




contentType: patterns
slug: thread-pool-pattern
title: "Thread Pool Pattern"
description: "Reuse a fixed set of threads for short-lived tasks instead of creating a new thread per task. Reduces overhead and bounds resource usage under load."
metaDescription: "Reuse a fixed set of threads for short-lived tasks. Reduces creation overhead and bounds resource usage under load with a thread pool."
difficulty: intermediate
topics:
  - concurrency
  - architecture
tags:
  - thread-pool
  - pattern
  - design-pattern
  - concurrency
  - thread-reuse
  - resource-bounding
  - executor
relatedResources:
  - /patterns/producer-consumer-pattern
  - /patterns/actor-model-pattern
  - /patterns/reactive-streams-pattern
  - /patterns/async-generator-pattern
  - /patterns/lock-free-queue-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Reuse a fixed set of threads for short-lived tasks. Reduces creation overhead and bounds resource usage under load with a thread pool."
  keywords:
    - thread pool pattern
    - thread reuse concurrency
    - executor service pattern
    - pattern design




---

## Overview

Creating a thread is expensive. Each thread allocates a stack (typically 1MB), requires kernel-level setup, and adds scheduling overhead. When tasks are short-lived and frequent, creating a thread per task wastes resources and can exhaust memory under load. The Thread Pool pattern maintains a fixed set of worker threads that pick up tasks from a queue. Tasks are submitted to the pool and executed by the next available thread.

## When to Use


- For alternatives, see [Actor Model Pattern](/patterns/actor-model-pattern/).

- You have many short-lived tasks that run concurrently
- Creating a thread per task is too expensive (high throughput, short duration)
- You need to bound the number of concurrent threads to protect resources
- You want to control queueing behavior when all threads are busy

## Solution

### Python (concurrent.futures)

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import requests

def fetch_url(url):
    response = requests.get(url, timeout=5)
    return {"url": url, "status": response.status_code, "length": len(response.content)}

urls = [
    "https://httpbin.org/delay/1",
    "https://httpbin.org/delay/2",
    "https://httpbin.org/delay/1",
    "https://httpbin.org/delay/3",
    "https://httpbin.org/delay/1",
]

# Pool with 3 threads: at most 3 requests run concurrently
with ThreadPoolExecutor(max_workers=3) as executor:
    futures = {executor.submit(fetch_url, url): url for url in urls}

    for future in as_completed(futures):
        url = futures[future]
        try:
            result = future.result()
            print(f"{result['url']}: {result['status']} ({result['length']} bytes)")
        except Exception as e:
            print(f"{url}: FAILED - {e}")
```

### JavaScript (workerpool — Node.js)

```javascript
import workerpool from "workerpool";

// worker.js — runs in a separate thread
workerpool.worker({
  fetchUrl(url) {
    return fetch(url)
      .then((res) => res.text())
      .then((text) => ({ url, length: text.length }));
  },
});

// main.js
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);

const pool = workerpool.pool(path.join(path.dirname(__filename), "worker.js"), {
  minWorkers: 2,
  maxWorkers: 4,
});

const urls = [
  "https://httpbin.org/delay/1",
  "https://httpbin.org/delay/2",
  "https://httpbin.org/delay/1",
  "https://httpbin.org/delay/3",
  "https://httpbin.org/delay/1",
];

async function fetchAll() {
  const promises = urls.map((url) => pool.exec("fetchUrl", [url]));
  const results = await Promise.all(promises);
  results.forEach((r) => console.log(`${r.url}: ${r.length} bytes`));
  await pool.terminate();
}

fetchAll();
```

### Java (ExecutorService)

```java
import java.util.concurrent.*;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.URI;
import java.net.http.HttpResponse;

public class ThreadPoolExample {

    private static final HttpClient client = HttpClient.newHttpClient();

    public static String fetchUrl(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .timeout(Duration.ofSeconds(5))
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        return url + ": " + response.statusCode() + " (" + response.body().length() + " bytes)";
    }

    public static void main(String[] args) throws Exception {
        String[] urls = {
            "https://httpbin.org/delay/1",
            "https://httpbin.org/delay/2",
            "https://httpbin.org/delay/1",
            "https://httpbin.org/delay/3",
            "https://httpbin.org/delay/1"
        };

        // Pool with 3 threads
        ExecutorService pool = Executors.newFixedThreadPool(3);
        List<Future<String>> futures = new ArrayList<>();

        for (String url : urls) {
            futures.add(pool.submit(() -> fetchUrl(url)));
        }

        for (Future<String> future : futures) {
            try {
                System.out.println(future.get(10, TimeUnit.SECONDS));
            } catch (Exception e) {
                System.out.println("FAILED: " + e.getMessage());
            }
        }

        pool.shutdown();
    }
}
```

## Explanation

The thread pool pre-creates a fixed number of worker threads. When a task is submitted, it goes into a work queue. Each idle worker thread picks the next task from the queue and executes it. When the task completes, the thread returns to the pool and picks the next task.

This gives three benefits:
1. **No thread creation overhead**: Threads are created once at pool startup and reused
2. **Bounded resources**: The pool size limits how many threads run concurrently, preventing memory exhaustion
3. **Backpressure**: When all threads are busy, new tasks queue up instead of spawning unbounded threads

The pool size is the key tuning parameter. CPU-bound tasks should have roughly as many threads as CPU cores. I/O-bound tasks can have more threads since they spend time waiting.

## Variants

| Variant | Pool Type | Use Case | Tradeoff |
|---------|-----------|----------|----------|
| **Fixed Pool** | N threads, unbounded queue | Predictable load | Queue can grow without limit |
| **Cached Pool** | 0 to N threads, SynchronousQueue | Short-lived many tasks | Unbounded thread creation |
| **Scheduled Pool** | N threads, delayed queue | Periodic and delayed tasks | More complex scheduling |
| **Bounded Pool** | N threads, bounded queue | Memory-safe under load | Rejection when queue full |
| **Work Stealing** | Per-thread queues with stealing | Fork-join recursive tasks | More overhead, complex |

## What Works

- Size the pool to the workload: CPU-bound = core count, I/O-bound = higher
- Use a bounded queue to prevent memory exhaustion under load
- Set a rejection policy (abort, caller-runs, discard) for when the queue is full
- Name pool threads for debugging and thread dump analysis
- Always shut down the pool in finally blocks or try-with-resources
- Monitor pool metrics: active threads, queue depth, task latency
- Use a single shared pool for the application rather than creating pools per request

## Common Mistakes

- **Pool too large**: Too many threads cause context-switching overhead and memory waste. More threads does not mean faster.
- **Pool too small**: Tasks queue up and latency increases. For I/O tasks, a small pool limits throughput.
- **Unbounded queue**: Tasks pile up in memory when producers are faster than consumers. Use a bounded queue.
- **Blocking tasks in the pool**: A task that blocks indefinitely (infinite loop, deadlock) occupies a thread forever. Set timeouts.
- **Not shutting down the pool**: Threads keep running and the JVM does not exit. Always call `shutdown()`.
- **Using pool threads for long-running tasks**: Long tasks starve other tasks. Move them to a separate pool.

## FAQ

### How do I choose the right pool size?

For CPU-bound tasks: `poolSize = Runtime.getRuntime().availableProcessors()`. For I/O-bound tasks: `poolSize = N * U * (1 + W/C)` where N = cores, U = target utilization, W = wait time, C = compute time. In practice, 2-10x cores for I/O tasks.

### What happens when the queue is full?

With an unbounded queue (default in Java's `Executors.newFixedThreadPool`), tasks accumulate until memory runs out. With a bounded queue, the rejection policy activates: `AbortPolicy` throws an exception, `CallerRunsPolicy` runs the task on the calling thread, `DiscardPolicy` silently drops it.

### Should I use a thread pool or virtual threads?

Java 21+ virtual threads are ideal for I/O-bound tasks with high concurrency. They do not need pooling because they are cheap to create. Use a thread pool for CPU-bound tasks where you need to bound parallelism.

### Can I share a thread pool across components?

Yes, and it is recommended. Creating pools per request or per component wastes resources. Use a single application-wide pool or a small number of purpose-specific pools (e.g., one for CPU tasks, one for I/O tasks).

### How do I handle exceptions in pool tasks?

Exceptions thrown by tasks are caught by the pool and wrapped in the `Future`. Call `future.get()` to retrieve the exception. For fire-and-forget tasks, install an `UncaughtExceptionHandler` or use `afterExecute` on a custom `ThreadPoolExecutor`.


## Advanced Topics

### Scenario: Thread Pool for CPU-Intensive Tasks

```typescript
// Thread pool pattern: reuse threads for CPU-intensive work
import { Worker } from "worker_threads";
import { EventEmitter } from "events";

class ThreadPool {
  private workers: Worker[] = [];
  private taskQueue: { task: Function; resolve: Function; reject: Function }[] = [];
  private idleWorkers: number[] = [];
  private busy = new Set<number>();

  constructor(private size: number, private workerFile: string) {
    for (let i = 0; i < size; i++) {
      const worker = new Worker(workerFile);
      const workerId = i;
      worker.on("message", (result) => {
        const task = this.busy.has(workerId) ? this.taskQueue.shift() : null;
        this.busy.delete(workerId);
        this.idleWorkers.push(workerId);
        if (task) task.resolve(result);
        this.processQueue();
      });
      worker.on("error", (err) => {
        this.busy.delete(workerId);
        this.idleWorkers.push(workerId);
        this.processQueue();
      });
      this.workers.push(worker);
      this.idleWorkers.push(i);
    }
  }

  submit<T>(task: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  private processQueue() {
    while (this.idleWorkers.length > 0 && this.taskQueue.length > 0) {
      const workerId = this.idleWorkers.shift()!;
      const { task, reject } = this.taskQueue.shift()!;
      this.busy.add(workerId);
      this.workers[workerId].postMessage(task);
    }
  }

  async shutdown() {
    await Promise.all(this.workers.map(w => w.terminate()));
  }
}

// Usage: image processing with 4 workers
const pool = new ThreadPool(4, "./image-worker.js");
const results = await Promise.all([
  pool.submit({ file: "img1.png", op: "resize", w: 800 }),
  pool.submit({ file: "img2.png", op: "resize", w: 800 }),
  pool.submit({ file: "img3.png", op: "resize", w: 800 }),
]);
await pool.shutdown();

// Pool size tuning
  | Workload | Pool size | Rationale |
  |----------|-----------|-----------|
  | CPU-heavy | CPU cores | One thread per core |
  | I/O-heavy | 2x CPU cores | Threads wait on I/O |
  | Mixed | CPU cores + 2 | Balance CPU and I/O |
  | Image processing | CPU cores | CPU-bound |
  | File parsing | 2x CPU cores | I/O + CPU |
```

Lessons:
  - Thread pool reuses threads: avoids creation overhead
  - Task queue buffers work when all threads are busy
  - Pool size: CPU cores for CPU-heavy, 2x for I/O-heavy
  - Always shutdown the pool to avoid resource leaks
  - In Node.js, use worker_threads for CPU-intensive tasks
  - For I/O tasks, use async/await: event loop is sufficient
```

### When do I use threads vs async in Node.js?

Use worker_threads for CPU-intensive tasks (image processing, crypto, compression, parsing large files). The event loop is single-threaded: CPU work blocks it. Use async/await for I/O tasks (DB, HTTP, file reads): the event loop handles I/O efficiently without threads. If your task takes < 10ms, keep it on the event loop. If it takes > 100ms of CPU time, offload to a worker.
