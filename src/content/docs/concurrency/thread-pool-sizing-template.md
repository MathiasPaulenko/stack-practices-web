---
contentType: docs
slug: thread-pool-sizing-template
templateType: guideline
title: "Thread Pool Sizing Template"
description: "Template for documenting thread pool configuration per service: pool type selection, sizing formulas, CPU vs I/O bound tuning, queue strategies, rejection policies, monitoring metrics, and tuning examples for Java, Python, Go, and Node.js."
metaDescription: "Thread pool sizing template: pool types, sizing formulas, CPU vs I/O tuning, queue strategies, rejection policies, monitoring for Java, Python, Go, Node.js."
difficulty: intermediate
topics:
  - concurrency
tags:
  - thread-pool
  - concurrency
  - performance
  - tuning
  - java
  - python
  - go
relatedResources:
  - /docs/concurrency/async-task-cancellation-runbook
  - /docs/concurrency/race-condition-debugging-checklist
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Thread pool sizing template: pool types, sizing formulas, CPU vs I/O tuning, queue strategies, rejection policies, monitoring for Java, Python, Go, Node.js."
  keywords:
    - thread pool sizing
    - thread pool configuration
    - cpu bound thread pool
    - io bound thread pool
    - rejection policy
    - thread pool monitoring
    - concurrency tuning
---

## Overview

This template documents thread pool configuration for a service. Proper thread pool sizing prevents resource exhaustion, reduces latency under load, and maximizes throughput. This document covers pool type selection, sizing formulas, CPU vs I/O bound tuning, queue strategies, rejection policies, and monitoring metrics.

---

## 1. Pool Type Selection

### 1.1 Pool Types

```text
Pool type              | Best for                    | Drawbacks
───────────────────────┼─────────────────────────────┼──────────────────────────────
Fixed                  | Known, stable workload      | No flexibility for spikes
Cached                 | Short-lived, bursty tasks   | Unbounded threads risk
Scheduled              | Periodic / delayed tasks    | Not for high throughput
ForkJoin               | Recursive, divide-conquer   | Complex, work-stealing overhead
Virtual (Java 21+)     | Massive I/O concurrency     | Not for CPU-bound work
```

### 1.2 Decision Matrix

```text
Workload characteristic | Recommended pool type
────────────────────────┼──────────────────────────────
CPU-bound, stable       | Fixed (cores = N)
CPU-bound, bursty       | Fixed (cores = N) + queue
I/O-bound, stable       | Fixed (N * 2-4)
I/O-bound, bursty       | Cached or Fixed (N * 4-8)
Short-lived tasks       | Cached
Long-running tasks      | Fixed
Periodic tasks          | Scheduled
Recursive tasks         | ForkJoin
Massive I/O (10K+)      | Virtual threads (Java 21+)
```

---

## 2. Sizing Formulas

### 2.1 CPU-Bound Workloads

```text
Formula: threads = N_cpu

Where:
  N_cpu = number of logical CPU cores

Rationale:
  - CPU-bound tasks are limited by processor speed
  - More threads than cores causes context switching overhead
  - Each thread competes for CPU time
  - Optimal: 1 thread per core (or N_cpu + 1 for slight over-subscription)

Example:
  Server with 8 CPU cores
  threads = 8
  Pool: FixedThreadPool(8)
```

### 2.2 I/O-Bound Workloads

```text
Formula: threads = N_cpu * (1 + W/C)

Where:
  N_cpu = number of logical CPU cores
  W     = wait time (I/O, network, DB)
  C     = compute time

Rationale:
  - While one thread waits for I/O, another can use the CPU
  - The ratio of wait to compute determines optimal threads
  - More I/O wait = more threads needed to keep CPU busy

Example:
  Server with 8 CPU cores
  Request takes 200ms total: 50ms compute, 150ms I/O wait
  W/C = 150/50 = 3
  threads = 8 * (1 + 3) = 32
  Pool: FixedThreadPool(32)
```

### 2.3 Little's Law for Queue Sizing

```text
Formula: L = lambda * W

Where:
  L      = average number of items in system (queue + active)
  lambda  = arrival rate (requests per second)
  W      = average time in system (seconds)

Example:
  1000 requests/sec arrival rate
  0.5 sec average response time
  L = 1000 * 0.5 = 500 items in system

  With 32 active threads:
  Queue size = 500 - 32 = 468
  Set queue to 500 for headroom
```

---

## 3. Java Configuration

### 3.1 ThreadPoolExecutor

```java
import java.util.concurrent.*;

int corePoolSize = 32;
int maxPoolSize = 64;
long keepAliveTime = 60L;
TimeUnit unit = TimeUnit.SECONDS;
BlockingQueue<Runnable> workQueue = new ArrayBlockingQueue<>(500);
ThreadFactory threadFactory = Executors.defaultThreadFactory();
RejectedExecutionHandler handler = new ThreadPoolExecutor.CallerRunsPolicy();

ThreadPoolExecutor executor = new ThreadPoolExecutor(
    corePoolSize,
    maxPoolSize,
    keepAliveTime,
    unit,
    workQueue,
    threadFactory,
    handler
);

// Submit tasks
executor.submit(() -> processRequest(request));
```

### 3.2 Rejection Policies

```text
Policy              | Behavior when queue full + threads at max
────────────────────┼──────────────────────────────────────────────
AbortPolicy         | Throws RejectedExecutionException (default)
CallerRunsPolicy    | Runs task in the calling thread (backpressure)
DiscardPolicy       | Silently discards the task
DiscardOldestPolicy | Discards oldest queued task, retries new one
```

### 3.3 Virtual Threads (Java 21+)

```java
// Virtual threads for massive I/O concurrency
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<String>> futures = new ArrayList<>();
    for (int i = 0; i < 10000; i++) {
        futures.add(executor.submit(() -> fetchFromApi(i)));
    }
    for (var f : futures) {
        System.out.println(f.get());
    }
}
// No pool sizing needed — virtual threads are cheap
// Each task gets its own virtual thread
// JVM manages carrier threads (typically ForkJoinPool)
```

---

## 4. Python Configuration

### 4.1 ThreadPoolExecutor

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import multiprocessing

# CPU-bound: use process pool instead
# I/O-bound: use thread pool
cpu_count = multiprocessing.cpu_count()

# I/O-bound pool (4x CPU cores)
with ThreadPoolExecutor(max_workers=cpu_count * 4) as executor:
    futures = [executor.submit(fetch_url, url) for url in urls]
    for future in as_completed(futures):
        result = future.result()
        process_result(result)
```

### 4.2 ProcessPoolExecutor (CPU-Bound)

```python
from concurrent.futures import ProcessPoolExecutor
import multiprocessing

# CPU-bound: one process per core
with ProcessPoolExecutor(max_workers=multiprocessing.cpu_count()) as executor:
    futures = [executor.submit(cpu_intensive_task, data) for data in dataset]
    results = [f.result() for f in as_completed(futures)]
```

---

## 5. Go Configuration

### 5.1 Worker Pool Pattern

```go
func workerPool(numWorkers int, jobs <-chan Job, results chan<- Result) {
    var wg sync.WaitGroup
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                results <- processJob(job)
            }
        }()
    }
    wg.Wait()
    close(results)
}

// Usage
jobs := make(chan Job, 100)       // buffered queue
results := make(chan Result, 100)

// I/O-bound: 4x CPU cores
numWorkers := runtime.NumCPU() * 4
go workerPool(numWorkers, jobs, results)
```

### 5.2 Semaphore for Concurrency Limit

```go
func withConcurrencyLimit(tasks []func(), limit int) {
    sem := make(chan struct{}, limit)
    var wg sync.WaitGroup

    for _, task := range tasks {
        wg.Add(1)
        sem <- struct{}{} // acquire
        go func(t func()) {
            defer wg.Done()
            defer func() { <-sem }() // release
            t()
        }(task)
    }
    wg.Wait()
}
```

---

## 6. Monitoring

### 6.1 Key Metrics

```text
Metric                    | Alert threshold          | Description
──────────────────────────┼──────────────────────────┼──────────────────────
Active threads            | > 90% of max             | Pool exhausted
Queue size                | > 80% of capacity        | Backpressure building
Queue wait time           | > 1 second               | Tasks waiting too long
Task rejection rate       | > 0                      | Tasks being rejected
Task completion rate      | < arrival rate           | Pool can't keep up
Average task duration     | > baseline * 2           | Tasks taking too long
Thread starvation         | 0 active + queue > 0     | Deadlock or blocking
```

### 6.2 Java Monitoring (Micrometer)

```java
// Register pool metrics with Micrometer
@Bean
public ThreadPoolExecutor threadPool(MeterRegistry registry) {
    ThreadPoolExecutor executor = new ThreadPoolExecutor(
        32, 64, 60, TimeUnit.SECONDS,
        new ArrayBlockingQueue<>(500)
    );

    // Monitor via gauge
    registry.gauge("threadpool.active", executor, ThreadPoolExecutor::getActiveCount);
    registry.gauge("threadpool.queue.size", executor.getQueue(), Queue::size);
    registry.gauge("threadpool.pool.size", executor, ThreadPoolExecutor::getPoolSize);
    registry.gauge("threadpool.peak", executor, ThreadPoolExecutor::getLargestPoolSize);

    return executor;
}
```

### 6.3 Prometheus Alert Rules

```yaml
groups:
  - name: threadpool-alerts
    rules:
      - alert: ThreadPoolExhausted
        expr: threadpool_active / threadpool_max > 0.9
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Thread pool nearly exhausted: {{ $labels.name }}"

      - alert: ThreadPoolQueueBacklog
        expr: threadpool_queue_size / threadpool_queue_capacity > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Thread pool queue backlog: {{ $labels.name }}"

      - alert: ThreadPoolRejections
        expr: rate(threadpool_rejected_total[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Thread pool rejecting tasks: {{ $labels.name }}"
```

## FAQ

### How do I know if my workload is CPU-bound or I/O-bound?

Measure the ratio of compute time to wait time. If a request spends 80% of its time waiting for database, API, or file I/O, it is I/O-bound. If it spends 80% of its time computing (parsing, transforming, sorting), it is CPU-bound. Use a profiler (async-profiler for Java, py-spy for Python, pprof for Go) to measure. I/O-bound workloads benefit from more threads than CPU cores. CPU-bound workloads should have at most N+1 threads where N is the number of CPU cores.

### What queue type should I use?

Use `ArrayBlockingQueue` for a fixed-size queue with FIFO ordering — it prevents unbounded memory growth. Use `LinkedBlockingQueue` if you need an effectively unbounded queue (risky — can cause OOM). Use `SynchronousQueue` for direct hand-off (no queueing — each submit blocks until a thread is available). Use `PriorityBlockingQueue` if tasks have different priorities. For most services, `ArrayBlockingQueue` with a calculated size (from Little's Law) is the right choice.

### When should I use virtual threads instead of a thread pool?

Use virtual threads (Java 21+) when your workload is I/O-bound with high concurrency (thousands of concurrent tasks). Virtual threads are cheap — the JVM can create millions of them. They eliminate the need for pool sizing since each task gets its own thread. Do not use virtual threads for CPU-bound work — they still run on a small number of carrier threads (typically ForkJoinPool with N CPU cores). Use a regular thread pool for CPU-bound tasks.

### What happens if I set the pool size too high?

Too many threads cause excessive context switching — the CPU spends time switching between threads instead of doing work. This increases latency and reduces throughput. Symptoms include high CPU usage but low throughput, high system time vs user time, and high run queue depth. Monitor context switch rate (via `vmstat` on Linux) — if it exceeds 100K switches/sec, you likely have too many threads. Reduce pool size and re-measure.

### How do I handle bursty traffic with a fixed pool?

Set the core pool size to handle steady-state traffic and the max pool size to handle bursts. Use a bounded queue to absorb short bursts. When the queue fills, the pool grows toward max size. When the queue and max threads are both full, the rejection policy kicks in. Use `CallerRunsPolicy` for backpressure — it slows the producer by running tasks in the calling thread. This is better than dropping tasks or throwing exceptions. Monitor queue depth and alert before the pool reaches max.
