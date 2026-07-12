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

Transient failures — network timeouts, rate limits, temporary service outages — are inevitable in distributed systems. Naively retrying immediately can overload struggling services. Exponential backoff spaces out retries exponentially (1s, 2s, 4s, 8s...) while jitter randomizes wait times to prevent thundering herds. This approach handles building a reliable retry decorator with configurable backoff strategies, circuit breaker integration, and idempotency awareness in Python, JavaScript, and Java.

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
- **Idempotency keys** (UUID sent as header) guarantee that retried requests don't create duplicate side effects. The server uses the way to deduplicate.

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

### Circuit Breaker Integration

```python
import time
from enum import Enum
from functools import wraps

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.state = CircuitState.CLOSED
        self.last_failure_time = None

    def __call__(self, fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if self.state == CircuitState.OPEN:
                if time.time() - self.last_failure_time > self.recovery_timeout:
                    self.state = CircuitState.HALF_OPEN
                else:
                    raise Exception("Circuit breaker is OPEN")

            try:
                result = fn(*args, **kwargs)
                if self.state == CircuitState.HALF_OPEN:
                    self.state = CircuitState.CLOSED
                    self.failure_count = 0
                return result
            except Exception as e:
                self.failure_count += 1
                self.last_failure_time = time.time()
                if self.failure_count >= self.failure_threshold:
                    self.state = CircuitState.OPEN
                raise
        return wrapper

# Usage: retry + circuit breaker
cb = CircuitBreaker(failure_threshold=5, recovery_timeout=30)

@retry(max_retries=3, base_delay=1.0)
@cb
def call_external_api():
    import requests
    return requests.get("https://api.example.com/data").json()
```

### Go with Standard Library

```go
package main

import (
    "context"
    "fmt"
    "math"
    "math/rand"
    "time"
)

func withRetry(ctx context.Context, fn func() error, maxRetries int, baseDelay time.Duration) error {
    for attempt := 0; attempt <= maxRetries; attempt++ {
        err := fn()
        if err == nil {
            return nil
        }
        if attempt == maxRetries {
            return fmt.Errorf("after %d retries: %w", maxRetries, err)
        }

        delay := float64(baseDelay) * math.Pow(2, float64(attempt))
        jitter := rand.Float64() * delay * 0.5
        select {
        case <-time.After(time.Duration(delay + jitter)):
        case <-ctx.Done():
            return ctx.Err()
        }
    }
    return nil
}

// Usage
func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    err := withRetry(ctx, func() error {
        // simulated flaky call
        return nil
    }, 5, time.Second)
    fmt.Println("Result:", err)
}
```

### Python with Tenacity Library

```python
from tenacity import (
    retry, stop_after_attempt, wait_exponential_jitter,
    retry_if_exception_type, before_sleep_log
)
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential_jitter(initial=1, max=60),
    retry=retry_if_exception_type((ConnectionError, TimeoutError)),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
def fetch_with_tenacity(url: str) -> dict:
    import requests
    response = requests.get(url, timeout=5)
    response.raise_for_status()
    return response.json()
```

## Additional Best Practices

1. **Use retry budgets.** Limit total retry attempts per time window to prevent retry storms:

```python
from collections import deque
import time

class RetryBudget:
    def __init__(self, max_retries=10, window_seconds=60):
        self.max_retries = max_retries
        self.window = window_seconds
        self.attempts = deque()

    def can_retry(self) -> bool:
        now = time.time()
        while self.attempts and self.attempts[0] < now - self.window:
            self.attempts.popleft()
        if len(self.attempts) < self.max_retries:
            self.attempts.append(now)
            return True
        return False
```

2. **Use context-aware timeouts.** Cancel retries if the parent context is cancelled:

```go
select {
case <-time.After(delay):
    // proceed with retry
case <-ctx.Done():
    return ctx.Err()  // respect parent timeout
}
```

3. **Distinguish retryable vs non-retryable errors.** 429 (rate limit) and 5xx are retryable; 4xx are not:

```python
def is_retryable(status_code: int) -> bool:
    return status_code == 429 or status_code >= 500
```

## Additional Common Mistakes

1. **Retrying 429 without reading Retry-After.** The server tells you exactly how long to wait:

```python
if response.status_code == 429:
    retry_after = int(response.headers.get("Retry-After", 60))
    time.sleep(retry_after)
```

2. **Not propagating context deadlines.** Each retry should respect the overall timeout, not just its own delay:

```python
import time
deadline = time.time() + 30  # 30s total budget
for attempt in range(max_retries):
    if time.time() >= deadline:
        raise TimeoutError("Overall deadline exceeded")
    # ... retry logic
```

3. **Using full jitter when decorrelated jitter is better.** Full jitter can produce near-zero delays. Decorrelated jitter is safer:

```python
# Decorrelated jitter (AWS recommended)
delay = min(max_delay, random.uniform(base_delay, delay * 3))
```

## Additional FAQ

### What is the AWS-recommended retry pattern?

AWS recommends decorrelated jitter: `sleep = min(cap, random_between(base, last_sleep * 3))`. This avoids both the thundering herd and the near-zero delay problem of full jitter.

### Should I retry at the HTTP client or application level?

Both, but at different levels. HTTP client retries handle transient network errors (timeouts, connection refused). Application-level retries handle business logic (database deadlocks, queue conflicts). Don't double-wrap — pick one layer per concern.

### How do I test retry logic?

Inject failures using a mock that fails N times before succeeding. Verify retry count, delays, and that the final result is correct:

```python
from unittest.mock import MagicMock

mock_fn = MagicMock(side_effect=[TimeoutError, TimeoutError, "success"])
result = retry(lambda: mock_fn(), max_retries=3, base_delay=0.01)
assert result == "success"
assert mock_fn.call_count == 3
```

## Performance Tips

1. **Use async retries for I/O-bound operations.** Don't block a thread while waiting:

```python
import asyncio

async def async_retry(fn, max_retries=3, base_delay=1.0):
    for attempt in range(max_retries + 1):
        try:
            return await fn()
        except Exception:
            if attempt == max_retries:
                raise
            await asyncio.sleep(base_delay * (2 ** attempt))
```

2. **Cache successful results.** If a retried call succeeds, cache the result to avoid future retries:

```python
from functools import lru_cache

@lru_cache(maxsize=128)
@retry(max_retries=3)
def fetch_config(key: str) -> str:
    return requests.get(f"https://config.example.com/{key}").text
```

3. **Use connection pooling with retries.** Reusing connections avoids the TCP handshake overhead on each retry:

```python
import requests
from requests.adapters import HTTPAdapter

session = requests.Session()
session.mount("https://", HTTPAdapter(pool_connections=10, pool_maxsize=100))
```
