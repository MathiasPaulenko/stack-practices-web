---
contentType: recipes
slug: retry-logic-exponential-backoff
title: "Retry Logic with Exponential Backoff"
description: "How to implement resilient retry logic with exponential backoff and jitter for transient failures in network and API calls."
metaDescription: "Learn retry logic with exponential backoff in Python, JavaScript, and Java. Covers jitter, circuit breakers, max retries, and idempotency for resilient systems."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - circuit-breaker
  - exponential-backoff
  - ci-cd
  - automation
relatedResources:
  - /recipes/background-jobs
  - /recipes/cli-tool-argument-parsing
  - /recipes/environment-variables
  - /recipes/feature-flags
  - /recipes/health-check-endpoint
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn retry logic with exponential backoff in Python, JavaScript, and Java. Covers jitter, circuit breakers, max retries, and idempotency for resilient systems."
  keywords:
    - retry
    - exponential-backoff
    - jitter
    - resilience
    - circuit-breaker
    - python
    - javascript
    - java
---
## Overview

Transient failures — network timeouts, rate limits, temporary service outages — are inevitable in distributed systems. Naively retrying immediately can overload struggling services. Exponential backoff spaces out retries exponentially (1s, 2s, 4s, 8s...) while jitter randomizes wait times to prevent thundering herds. This recipe covers building a reliable retry decorator with configurable backoff strategies, circuit breaker integration, and idempotency awareness in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Calling external APIs that may rate-limit or experience temporary outages. See [Call REST API](/recipes/api/call-rest-api) for API client patterns.
- Publishing messages to queues or event buses that may be temporarily unavailable. See [RabbitMQ Task Queue](/recipes/messaging/rabbitmq-task-queue) for message broker resilience.
- Performing database operations that might hit deadlock or connection timeouts. See [Connection Pooling](/recipes/databases/database-connection-pooling) for managing DB connections.
- Building microservices that need resilience against downstream service degradation. See [Event-Driven Microservices](/recipes/messaging/event-driven-microservices) for resilient architecture.

## Solution

### Python

```python
import time
import random
from functools import wraps
from typing import Callable, TypeVar, Tuple

T = TypeVar("T")

def retry(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exceptions: Tuple[type, ...] = (Exception,),
    jitter: bool = True,
    on_retry: Callable[[Exception, int, float], None] = None
):
    def decorator(fn: Callable[..., T]) -> Callable[..., T]:
        @wraps(fn)
        def wrapper(*args, **kwargs) -> T:
            for attempt in range(max_retries + 1):
                try:
                    return fn(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_retries:
                        raise
                    delay = min(base_delay * (2 ** attempt), max_delay)
                    if jitter:
                        delay = random.uniform(0, delay)
                    if on_retry:
                        on_retry(e, attempt + 1, delay)
                    time.sleep(delay)
        return wrapper
    return decorator

# Usage
@retry(max_retries=3, base_delay=1.0, exceptions=(ConnectionError, TimeoutError))
def fetch_data(url: str) -> dict:
    import requests
    response = requests.get(url, timeout=5)
    response.raise_for_status()
    return response.json()

# With idempotency key
import uuid

def call_api_with_retry():
    idempotency_key = str(uuid.uuid4())
    headers = {"Idempotency-Key": idempotency_key}
    return fetch_data("https://api.example.com/data")
```

### JavaScript

```javascript
async function retry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 60000,
    jitter = true,
    shouldRetry = () => true,
    onRetry = () => {},
  } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      let delay = Math.min(baseDelay * (2 ** attempt), maxDelay);
      if (jitter) {
        delay = Math.random() * delay;
      }
      onRetry(error, attempt + 1, delay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// Usage
async function fetchWithRetry(url) {
  return retry(
    () => fetch(url).then((r) => r.json()),
    {
      maxRetries: 3,
      baseDelay: 1000,
      shouldRetry: (err) => err.status >= 500 || err.code === "ETIMEDOUT",
      onRetry: (err, attempt, delay) => {
        console.warn(`Retry ${attempt} after ${delay}ms: ${err.message}`);
      },
    }
  );
}

// Decorator-style with idempotency
function withRetry(fn, options) {
  return (...args) => retry(() => fn(...args), options);
}
```

### Java

```java
import java.time.Duration;
import java.util.Random;
import java.util.concurrent.Callable;
import java.util.function.BiConsumer;
import java.util.function.Predicate;

public class RetryExecutor {
  private final int maxRetries;
  private final Duration baseDelay;
  private final Duration maxDelay;
  private final boolean jitter;
  private final Predicate<Throwable> shouldRetry;
  private final BiConsumer<Throwable, Integer> onRetry;
  private final Random random = new Random();

  public RetryExecutor(int maxRetries, Duration baseDelay, Duration maxDelay,
                       boolean jitter, Predicate<Throwable> shouldRetry,
                       BiConsumer<Throwable, Integer> onRetry) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
    this.jitter = jitter;
    this.shouldRetry = shouldRetry;
    this.onRetry = onRetry;
  }

  public <T> T execute(Callable<T> action) throws Exception {
    for (int attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return action.call();
      } catch (Exception e) {
        Throwable cause = e instanceof java.util.concurrent.ExecutionException
          ? e.getCause() : e;
        if (attempt == maxRetries || !shouldRetry.test(cause)) {
          throw e;
        }
        long delayMs = Math.min(
          baseDelay.toMillis() * (1L << attempt),
          maxDelay.toMillis()
        );
        if (jitter) {
          delayMs = (long) (random.nextDouble() * delayMs);
        }
        onRetry.accept(cause, attempt + 1);
        Thread.sleep(delayMs);
      }
    }
    throw new IllegalStateException("Unreachable");
  }

  // Usage
  public static void main(String[] args) throws Exception {
    RetryExecutor retry = new RetryExecutor(
      3, Duration.ofSeconds(1), Duration.ofSeconds(60),
      true,
      t -> t instanceof java.net.ConnectException,
      (err, attempt) -> System.out.println("Retry " + attempt + ": " + err.getMessage())
    );

    String result = retry.execute(() -> {
      // Simulated flaky call
      if (Math.random() < 0.7) throw new java.net.ConnectException("timeout");
      return "success";
    });
  }
}
```

## Explanation

- **Exponential backoff** doubles the wait time after each failure: 1s → 2s → 4s → 8s. This gives recovering services breathing room while still retrying promptly.
- **Jitter** adds randomness (`random * delay`) to prevent synchronized retries from many clients simultaneously hitting a recovering server (thundering herd problem).
- **Max delay cap** prevents unbounded waits — essential for user-facing operations where latency matters.
- **Exception filtering** ensures you only retry transient errors (timeouts, 5xx, connection refused), not permanent ones (4xx client errors, validation failures).
- **Idempotency keys** (UUID sent as header) guarantee that retried requests don't create duplicate side effects. The server uses the key to deduplicate.

## Variants

| Strategy | Backoff Formula | Best For |
|----------|-----------------|----------|
| Fixed | `delay` constant | Predictable retry intervals, debugging |
| Linear | `delay * attempt` | Moderate load on recovering services |
| Exponential | `delay * 2^attempt` | Most common, good balance of persistence vs load |
| Exponential + Jitter | `random * exponential` | Production APIs, prevents thundering herd |
| Circuit Breaker | Fail-fast after N errors | Cascading failure protection |

## What Works

1. **Always add jitter in production** — without it, coordinated retries from thousands of clients can DDoS a recovering service.
2. **Only retry idempotent operations** — POST without idempotency key or non-transactional writes can create duplicates on retry.
3. **Set a max delay and total timeout** — a user waiting 60+ seconds for a retry cascade is worse than failing fast with a clear error.
4. **Log every retry** — include attempt number, delay, and exception type for debugging intermittent issues.
5. **Consider circuit breakers for downstream dependencies** — if a service fails consistently, stop retrying for a cooldown period instead of hammering it.

## Common Mistakes

1. Retrying immediately (0 delay), amplifying load on an already struggling service.
2. Retrying non-idempotent operations like payments or inventory decrements without deduplication keys.
3. Not capping max delay, causing requests to hang for minutes before the user sees an error.
4. Retrying all exceptions indiscriminately, including 4xx client errors that will never succeed.
5. Omitting jitter, leading to thundering herd problems during service recovery.

## Frequently Asked Questions

### Should I always use exponential backoff?

No. For internal services with low latency and high reliability, a short fixed retry (e.g., 100ms × 3) may suffice. Exponential backoff with jitter is essential for public APIs, distributed systems, and high-traffic scenarios where many clients might retry simultaneously.

### What's the difference between retry and circuit breaker?

Retry attempts the same operation again after a transient failure, hoping it succeeds next time. Circuit breaker stops calling a failing service entirely after a threshold of errors, preventing cascading failures and giving the downstream service time to recover. They work well together: retry for transient blips, circuit breaker for sustained outages.

### How do I make a non-idempotent operation safe to retry?

Generate a unique idempotency key (UUID) before the first attempt and send it with every retry. The server stores processed keys and ignores duplicates. For database operations, use transactions with optimistic locking or UPSERT patterns that are naturally idempotent.
