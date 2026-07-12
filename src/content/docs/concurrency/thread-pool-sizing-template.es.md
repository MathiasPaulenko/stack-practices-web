---





contentType: docs
slug: thread-pool-sizing-template
templateType: guideline
title: "Plantilla de Sizing de Thread Pools"
description: "Plantilla para documentar thread pool configuration per service: pool type selection, sizing formulas, CPU vs I/O bound tuning, queue strategies, rejection policies, monitoring metrics y tuning examples para Java, Python, Go y Node.js."
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
  - /docs/async-task-cancellation-runbook
  - /docs/race-condition-debugging-checklist
  - /guides/complete-guide-go-concurrency
  - /guides/complete-guide-java-concurrency
  - /guides/complete-guide-python-asyncio-production
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

Esta plantilla documenta thread pool configuration para un service. Proper thread pool sizing previene resource exhaustion, reduce latency under load y maximizea throughput. Este documento cubre pool type selection, sizing formulas, CPU vs I/O bound tuning, queue strategies, rejection policies y monitoring metrics.

---

## 1. Pool Type Selection

### 1.1 Pool Types

```text
Pool type              | Best for                    | Drawbacks
───────────────────────┼─────────────────────────────┼──────────────────────────────
Fixed                  | Known, stable workload      | No flexibility para spikes
Cached                 | Short-lived, bursty tasks   | Unbounded threads risk
Scheduled              | Periodic / delayed tasks    | Not para high throughput
ForkJoin               | Recursive, divide-conquer   | Complex, work-stealing overhead
Virtual (Java 21+)     | Massive I/O concurrency     | Not para CPU-bound work
```

### 1.2 Decision Matrix

```text
Workload characteristic | Recommended pool type
────────────────────────┼──────────────────────────────
CPU-bound, stable       | Fixed (cores = N)
CPU-bound, bursty       | Fixed (cores = N) + queue
I/O-bound, stable       | Fixed (N * 2-4)
I/O-bound, bursty       | Cached o Fixed (N * 4-8)
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
  N_cpu = number de logical CPU cores

Rationale:
  - CPU-bound tasks son limited por processor speed
  - Mas threads que cores causan context switching overhead
  - Cada thread competea por CPU time
  - Optimal: 1 thread per core (o N_cpu + 1 para slight over-subscription)

Example:
  Server con 8 CPU cores
  threads = 8
  Pool: FixedThreadPool(8)
```

### 2.2 I/O-Bound Workloads

```text
Formula: threads = N_cpu * (1 + W/C)

Where:
  N_cpu = number de logical CPU cores
  W     = wait time (I/O, network, DB)
  C     = compute time

Rationale:
  - Mientras un thread waitea por I/O, otro puede usar el CPU
  - El ratio de wait a compute determina optimal threads
  - Mas I/O wait = mas threads needed para keep CPU busy

Example:
  Server con 8 CPU cores
  Request toma 200ms total: 50ms compute, 150ms I/O wait
  W/C = 150/50 = 3
  threads = 8 * (1 + 3) = 32
  Pool: FixedThreadPool(32)
```

### 2.3 Little's Law para Queue Sizing

```text
Formula: L = lambda * W

Where:
  L      = average number de items en system (queue + active)
  lambda  = arrival rate (requests per second)
  W      = average time en system (seconds)

Example:
  1000 requests/sec arrival rate
  0.5 sec average response time
  L = 1000 * 0.5 = 500 items en system

  Con 32 active threads:
  Queue size = 500 - 32 = 468
  Setea queue a 500 para headroom
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

// Submete tasks
executor.submit(() -> processRequest(request));
```

### 3.2 Rejection Policies

```text
Policy              | Behavior cuando queue full + threads at max
────────────────────┼──────────────────────────────────────────────
AbortPolicy         | Throwea RejectedExecutionException (default)
CallerRunsPolicy    | Corre task en el calling thread (backpressure)
DiscardPolicy       | Silently descarta el task
DiscardOldestPolicy | Descarta oldest queued task, retryea new one
```

### 3.3 Virtual Threads (Java 21+)

```java
// Virtual threads para massive I/O concurrency
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<String>> futures = new ArrayList<>();
    for (int i = 0; i < 10000; i++) {
        futures.add(executor.submit(() -> fetchFromApi(i)));
    }
    for (var f : futures) {
        System.out.println(f.get());
    }
}
// No pool sizing needed — virtual threads son cheap
// Cada task obtiene su own virtual thread
// JVM managea carrier threads (tipicamente ForkJoinPool)
```

---

## 4. Python Configuration

### 4.1 ThreadPoolExecutor

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import multiprocessing

# CPU-bound: usa process pool en vez
# I/O-bound: usa thread pool
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

### 5.2 Semaphore para Concurrency Limit

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
Thread starvation         | 0 active + queue > 0     | Deadlock o blocking
```

### 6.2 Java Monitoring (Micrometer)

```java
// Registra pool metrics con Micrometer
@Bean
public ThreadPoolExecutor threadPool(MeterRegistry registry) {
    ThreadPoolExecutor executor = new ThreadPoolExecutor(
        32, 64, 60, TimeUnit.SECONDS,
        new ArrayBlockingQueue<>(500)
    );

    // Monitora via gauge
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

## Preguntas Frecuentes

### ¿Cómo se si mi workload es CPU-bound o I/O-bound?

Mide el ratio de compute time a wait time. Si un request gasta 80% de su time waiting por database, API o file I/O, es I/O-bound. Si gasta 80% de su time computing (parsing, transforming, sorting), es CPU-bound. Usa un profiler (async-profiler para Java, py-spy para Python, pprof para Go) para medir. I/O-bound workloads benefician de mas threads que CPU cores. CPU-bound workloads deberian tener at most N+1 threads donde N es el number de CPU cores.

### ¿Qué queue type deberia usar?

Usa `ArrayBlockingQueue` para un fixed-size queue con FIFO ordering — previene unbounded memory growth. Usa `LinkedBlockingQueue` si necesitas un effectively unbounded queue (risky — puede causar OOM). Usa `SynchronousQueue` para direct hand-off (no queueing — cada submit blockea hasta que un thread esta available). Usa `PriorityBlockingQueue` si tasks tienen different priorities. Para most services, `ArrayBlockingQueue` con un calculated size (de Little's Law) es el right choice.

### ¿Cuando deberia usar virtual threads en vez de un thread pool?

Usa virtual threads (Java 21+) cuando tu workload es I/O-bound con high concurrency (thousands de concurrent tasks). Virtual threads son cheap — el JVM puede crear millions de ellos. Eliminan la need para pool sizing ya que cada task obtiene su own thread. No uses virtual threads para CPU-bound work — siguen corriendo en un small number de carrier threads (tipicamente ForkJoinPool con N CPU cores). Usa un regular thread pool para CPU-bound tasks.

### ¿Qué pasa si seteo el pool size too high?

Too many threads causan excessive context switching — el CPU gasta time switching entre threads en vez de doing work. Esto increasea latency y reduce throughput. Symptoms incluyen high CPU usage pero low throughput, high system time vs user time y high run queue depth. Monitora context switch rate (via `vmstat` en Linux) — si excede 100K switches/sec, likely tienes too many threads. Reduce pool size y re-measurea.

### ¿Cómo handleo bursty traffic con un fixed pool?

Setea el core pool size para handlear steady-state traffic y el max pool size para handlear bursts. Usa un bounded queue para absorber short bursts. Cuando el queue fills, el pool grows hacia max size. Cuando el queue y max threads estan both full, el rejection policy kickea in. Usa `CallerRunsPolicy` para backpressure — slowea el producer corriendo tasks en el calling thread. Esto es mejor que dropping tasks o throwear exceptions. Monitora queue depth y alerta antes de que el pool reachee max.

## See Also

- [Complete Guide to Python Asyncio](/es/guides/complete-guide-python-asyncio/)
- [Complete Guide to Go Concurrency](/es/guides/complete-guide-go-concurrency/)
- [Complete Guide to Java Concurrency](/es/guides/complete-guide-java-concurrency/)
- [Complete Guide to Python Asyncio in Production](/es/guides/complete-guide-python-asyncio-production/)
- [Thread Pool Pattern](/es/patterns/thread-pool-pattern/)

