---
contentType: patterns
slug: bulkhead-pattern
title: "Bulkhead Pattern"
description: "Isolate different parts of an application into pools so that a failure in one does not cascade to others. A resilience pattern for fault containment."
metaDescription: "Learn the Bulkhead Pattern in Python, Java, and JavaScript. Resilience pattern for isolating failing components and preventing cascading failures."
difficulty: intermediate
topics:
  - design
tags:
  - bulkhead
  - design-pattern
  - java
  - javascript
  - pattern
  - python
  - resilience
relatedResources:
  - /patterns/design/circuit-breaker-pattern
  - /patterns/design/retry-pattern
  - /patterns/design/timeout-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Bulkhead Pattern in Python, Java, and JavaScript. Resilience pattern for isolating failing components and preventing cascading failures."
  keywords:
    - bulkhead pattern
    - design pattern
    - resilience pattern
    - isolation
    - fault containment
    - python bulkhead
    - java bulkhead
    - javascript bulkhead
---

# Bulkhead Pattern

## Overview

The Bulkhead Pattern is a resilience pattern that isolates different parts of an application into separate pools, ensuring that a failure in one part does not cascade to others. Named after the watertight compartments (bulkheads) in ships, this pattern limits the scope of failures by allocating dedicated resources to different components or clients.

## When to Use

Use the Bulkhead Pattern when:
- You have multiple independent components that share a thread pool or connection pool
- A slow or failing component should not consume all available resources
- You need to ensure critical operations always have dedicated capacity
- You want to degrade gracefully by isolating failures to specific subsystems
- Examples: microservices with different SLAs, API gateways, multi-tenant systems

## Solution

### Python

```python
import threading
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from queue import Queue

class Bulkhead:
    def __init__(self, name: str, max_workers: int, queue_size: int = 10):
        self.name = name
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.queue = Queue(maxsize=queue_size)

    def execute(self, func, timeout: float = 5.0):
        if self.queue.full():
            raise RuntimeError(f"Bulkhead '{self.name}' queue full — rejecting request")
        self.queue.put(1)
        try:
            future = self.executor.submit(func)
            return future.result(timeout=timeout)
        finally:
            self.queue.get()

# Usage: separate bulkheads for critical and non-critical operations
critical = Bulkhead("critical", max_workers=4)
background = Bulkhead("background", max_workers=2)

def slow_operation():
    time.sleep(3)
    return "done"

# Critical ops always have capacity
try:
    result = critical.execute(slow_operation, timeout=5)
    print(result)
except FutureTimeout:
    print("Critical operation timed out")

# Background ops are limited — won't starve critical pool
try:
    result = background.execute(slow_operation, timeout=5)
    print(result)
except RuntimeError as e:
    print(e)
```

### JavaScript

```javascript
class Bulkhead {
  constructor(name, maxConcurrent) {
    this.name = name;
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }

  async execute(fn, timeoutMs = 5000) {
    if (this.running >= this.maxConcurrent) {
      throw new Error(`Bulkhead '${this.name}' at capacity — rejecting request`);
    }

    this.running++;
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), timeoutMs)
      );
      return await Promise.race([fn(), timeout]);
    } finally {
      this.running--;
    }
  }
}

// Usage
const critical = new Bulkhead("critical", 4);
const background = new Bulkhead("background", 2);

async function slowOperation() {
  await new Promise(r => setTimeout(r, 3000));
  return "done";
}

// Critical ops
async function runCritical() {
  try {
    const result = await critical.execute(slowOperation, 5000);
    console.log(result);
  } catch (e) {
    console.log("Critical failed:", e.message);
  }
}

runCritical();
```

### Java

```java
import java.util.concurrent.*;

public class Bulkhead {
    private final String name;
    private final Semaphore semaphore;

    public Bulkhead(String name, int maxConcurrent) {
        this.name = name;
        this.semaphore = new Semaphore(maxConcurrent);
    }

    public <T> T execute(Callable<T> task, long timeoutMs) throws Exception {
        if (!semaphore.tryAcquire(timeoutMs, TimeUnit.MILLISECONDS)) {
            throw new RuntimeException("Bulkhead '" + name + "' at capacity — rejecting request");
        }
        try {
            return task.call();
        } finally {
            semaphore.release();
        }
    }
}

// Usage
Bulkhead critical = new Bulkhead("critical", 4);
Bulkhead background = new Bulkhead("background", 2);

String result = critical.execute(() -> {
    Thread.sleep(3000);
    return "done";
}, 5000);
```

## Explanation

The Bulkhead Pattern separates resources into isolated pools:

- **Thread/Connection Pools**: Each component gets its own pool instead of sharing one
- **Semaphores/Queues**: Limit concurrent operations per component
- **Rejection**: When a pool is exhausted, new requests are rejected rather than queued indefinitely

This ensures that a runaway consumer (e.g., a background job) cannot consume all threads, leaving nothing for critical operations (e.g., user-facing API calls).

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Thread Pool Isolation** | Separate thread pools per component | Hystrix-style command isolation |
| **Connection Pool Isolation** | Separate DB/cache connections per service | Multi-tenant databases |
| **Semaphore Isolation** | Lightweight, same-thread isolation | When thread overhead is too high |
| **Process Isolation** | Separate OS processes or containers | Maximum fault containment |

## Best Practices

- **Always reserve capacity for critical paths** — don't let background jobs starve user requests
- **Monitor pool saturation** — track how often each bulkhead rejects or times out
- **Combine with Circuit Breaker** — if a bulkhead is constantly saturated, the breaker should trip
- **Use semaphores instead of thread pools** when thread creation is expensive or limited
- **Document and enforce SLAs** per bulkhead so teams know the capacity boundaries

## Common Mistakes

- Using a single shared pool for everything, allowing one slow component to freeze the app
- Setting pool sizes too small, causing unnecessary rejections under normal load
- Not monitoring or alerting on bulkhead saturation
- Isolating too granularly, creating resource fragmentation
- Forgetting that queueing also consumes memory — bounded queues are essential

## Frequently Asked Questions

**Q: What is the difference between Bulkhead and Circuit Breaker?**
A: Bulkhead isolates resources to prevent one failure from affecting others. Circuit Breaker stops sending requests to a failing service. They complement each other: Bulkhead contains the blast radius, Circuit Breaker stops the bleeding.

**Q: Should I use thread pools or semaphores for bulkheads?**
A: Thread pools provide the strongest isolation but have higher overhead. Semaphores are lighter and run on the calling thread — use them when you need many concurrent bulkheads or want to avoid thread starvation.
