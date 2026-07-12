---


contentType: patterns
slug: timeout-pattern
title: "Timeout Pattern"
description: "Prevent operations from hanging indefinitely by enforcing a maximum execution time. A resilience pattern for predictable response times."
metaDescription: "Learn the Timeout Pattern in Python, Java, and JavaScript. Resilience pattern for avoiding hanging operations with enforced time limits."
difficulty: beginner
topics:
  - design
tags:
  - timeout
  - pattern
  - design-pattern
  - resilience
  - deadlines
  - hanging-operations
  - python
  - javascript
  - java
relatedResources:
  - /patterns/retry-pattern
  - /patterns/circuit-breaker-pattern
  - /patterns/bulkhead-pattern
  - /patterns/graceful-degradation-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Timeout Pattern in Python, Java, and JavaScript. Resilience pattern for avoiding hanging operations with enforced time limits."
  keywords:
    - timeout pattern
    - design pattern
    - resilience pattern
    - deadlines
    - hanging operations
    - python timeout
    - java timeout
    - javascript timeout


---

# Timeout Pattern

## Overview

The Timeout Pattern is a resilience pattern that prevents operations from hanging indefinitely by enforcing a maximum execution time. Without timeouts, a single slow downstream service can hold up threads, connections, and user requests indefinitely, causing cascading failures across the system.

## When to Use

Use the Timeout Pattern when:
- You call external services, databases, or APIs that may become unresponsive
- You need to guarantee maximum response times to users or upstream callers
- Hanging operations could exhaust thread pools, connection pools, or memory
- You want to fail fast rather than wait indefinitely for a response
- Always combine with [Retry](/patterns/design/retry-pattern) for transient issues, and [Circuit Breaker](/patterns/design/circuit-breaker-pattern) for chronic failures

## Solution

### Python

```python
import signal
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout

def with_timeout(seconds: float):
    def decorator(func):
        def wrapper(*args, **kwargs):
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(func, *args, **kwargs)
                try:
                    return future.result(timeout=seconds)
                except FutureTimeout:
                    raise TimeoutError(f"Operation timed out after {seconds}s")
        return wrapper
    return decorator

@with_timeout(seconds=2.0)
def fetch_slow_data():
    import time
    time.sleep(5)
    return "data"

# Usage
try:
    result = fetch_slow_data()
    print(result)
except TimeoutError as e:
    print(f"Failed: {e}")
```

### JavaScript

```javascript
function withTimeout(fn, timeoutMs) {
  return function(...args) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      Promise.resolve(fn(...args))
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  };
}

async function fetchSlowData() {
  await new Promise(r => setTimeout(r, 5000));
  return "data";
}

const timedFetch = withTimeout(fetchSlowData, 2000);

// Usage
timedFetch()
  .then(console.log)
  .catch(e => console.log("Failed:", e.message));
```

### Java

```java
import java.util.concurrent.*;

public class Timeout {
    public static <T> T execute(Callable<T> task, long timeoutMs) throws Exception {
        ExecutorService executor = Executors.newSingleThreadExecutor();
        try {
            Future<T> future = executor.submit(task);
            return future.get(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            throw new RuntimeException("Operation timed out after " + timeoutMs + "ms");
        } finally {
            executor.shutdownNow();
        }
    }

    public static void main(String[] args) {
        try {
            String result = execute(() -> {
                Thread.sleep(5000);
                return "data";
            }, 2000);
            System.out.println(result);
        } catch (Exception e) {
            System.out.println("Failed: " + e.getMessage());
        }
    }
}
```

## Explanation

The Timeout Pattern enforces a hard deadline on operations:

- **Deadline**: The maximum time an operation is allowed to run
- **Cancellation**: When the deadline expires, the operation is interrupted or abandoned
- **Propagation**: Timeouts should propagate through call chains — if an API call has 5s, and it calls a DB that takes 4s, the DB call should use a shorter timeout (e.g., 3s) to leave margin

This prevents thread pool exhaustion, connection leaks, and poor user experience from unresponsive dependencies.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Fixed Timeout** | Same timeout for all calls | Simple, predictable behavior |
| **Adaptive Timeout** | Timeout based on historical latencies (P99) | Dynamic response to service health |
| **Deadline Propagation** | Pass remaining time through the call chain | End-to-end request latency budgets |
| **Partial Results** | Return what was fetched before timeout | Streaming, search, aggregation |

## What Works

- **Always set timeouts on external calls** — network I/O, database queries, HTTP requests
- **Propagate deadlines** through your call chain (e.g., gRPC context, HTTP headers)
- **Set timeouts shorter at lower levels** — leave headroom for retries and fallbacks
- **Log timeout events** with the target service name for debugging
- **Combine with [Circuit Breaker](/patterns/design/circuit-breaker-pattern)** — if timeouts are frequent, stop calling the failing service
- **Use `Promise.race` in JavaScript** and `Future.get(timeout)` in Java for clean cancellation

## Common Mistakes

- Not setting any timeout, allowing operations to hang forever
- Setting timeouts too long, defeating the purpose of failing fast
- Setting timeouts too short, causing unnecessary failures during normal spikes
- Not canceling the underlying operation when the timeout fires (resource leaks)
- Ignoring timeout propagation, causing cascading deadline misses

## Frequently Asked Questions

**Q: What timeout value should I use?**
A: Base it on your SLA and the downstream service's P99 latency. If your API promises 500ms response time, and a DB call takes 100ms at P99, set the DB timeout to ~150ms to leave room for retries and processing.

**Q: Does timeout cancel the underlying operation?**
A: It depends on the implementation. Thread interruption signals cancellation but doesn't force it. With async frameworks (Java CompletableFuture, JavaScript AbortController), you can properly cancel the underlying I/O.

**Q: Should I retry after a timeout?**
A: Yes, if the operation is idempotent and the timeout might have been caused by a transient network issue. But if timeouts are frequent, combine with [Circuit Breaker](/patterns/design/circuit-breaker-pattern) to avoid wasting retries on a chronically slow service.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.


## Advanced Topics

### Scenario: Timeout on External API Calls

```typescript
// Timeout pattern with AbortController (Node.js 18+)
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// Usage: call external API with 5s timeout
try {
  const res = await fetchWithTimeout("https://api.stripe.com/v1/charges", 5000);
  const data = await res.json();
} catch (err) {
  if (err.message.includes("timeout")) {
    // Handle timeout: retry, fallback, or error to user
    console.error("Stripe API timeout, using fallback");
  }
}

// Timeout with retry and backoff
async function fetchWithRetry(
  url: string,
  timeoutMs: number,
  maxRetries: number
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetchWithTimeout(url, timeoutMs);
    } catch (err) {
      if (attempt < maxRetries - 1) {
        const backoff = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

// Timeout configuration per service
  | Service | Timeout | Retries | Backoff |
  |---------|---------|---------|---------|
  | Stripe API | 5s | 3 | Exponential |
  | DB query | 10s | 0 | N/A |
  | Redis | 1s | 2 | Fixed 500ms |
  | S3 upload | 30s | 2 | Exponential |
  | Internal API | 3s | 2 | Exponential |
  | Email service | 10s | 3 | Exponential |
```

Lessons:
  - AbortController is the modern standard for fetch timeout
  - Always configure timeout: a request without timeout can hang forever
  - Timeout + retry + backoff is the complete pattern
  - Different services need different timeouts
  - Measure p99 latency to set realistic timeouts
```

### How do I choose the right timeout value?

Measure the p99 latency of the service. Set timeout to 2-3x the p99. If Stripe p99 is 2s, 5s timeout is reasonable. For DB queries, measure the p99 of the slowest query and add 50%. Never use a timeout lower than p99: you will cause failures under normal conditions. Review timeouts quarterly: if latency improves, you can lower the timeout.















End of document. Review and update quarterly.