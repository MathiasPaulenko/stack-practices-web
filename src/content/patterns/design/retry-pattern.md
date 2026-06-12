---
contentType: patterns
slug: retry-pattern
title: "Retry Pattern"
description: "Retry an operation that has failed with transient errors, using configurable strategies like fixed delay, exponential backoff, or circuit breaker integration."
metaDescription: "Learn the Retry Pattern in Python, Java, and JavaScript. Resilience pattern for handling transient failures with backoff strategies."
difficulty: intermediate
topics:
  - design
tags:
  - retry
  - pattern
  - design-pattern
  - resilience
  - transient-failures
  - exponential-backoff
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/circuit-breaker-pattern
  - /patterns/design/timeout-pattern
  - /patterns/design/bulkhead-pattern
lastUpdated: "2026-06-12"
author: "StackPractices"
seo:
  metaDescription: "Learn the Retry Pattern in Python, Java, and JavaScript. Resilience pattern for handling transient failures with backoff strategies."
  keywords:
    - retry pattern
    - design pattern
    - resilience pattern
    - transient failures
    - exponential backoff
    - python retry
    - java retry
    - javascript retry
---

# Retry Pattern

## Overview

The Retry Pattern is a resilience pattern that handles transient failures by retrying a failed operation. Transient failures are typically caused by temporary conditions such as network congestion, temporary service unavailability, or timeouts. The pattern uses configurable strategies — fixed delay, linear, or exponential backoff — to avoid overwhelming the target system.

## When to Use

Use the Retry Pattern when:
- Errors are transient and likely to resolve on retry (network timeouts, 503 Service Unavailable)
- The operation is idempotent or can be safely repeated
- You want to improve perceived reliability without user intervention
- You need configurable backoff to avoid thundering herd problems
- Combine with Circuit Breaker to avoid retrying when a service is clearly down

## Solution

### Python

```python
import time
from functools import wraps

def retry(max_attempts=3, delay=1, backoff=2, exceptions=(Exception,)):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            attempt = 1
            current_delay = delay
            while attempt <= max_attempts:
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts:
                        raise
                    print(f"Attempt {attempt} failed: {e}. Retrying in {current_delay}s...")
                    time.sleep(current_delay)
                    current_delay *= backoff
                    attempt += 1
            return None
        return wrapper
    return decorator

@retry(max_attempts=3, delay=1, backoff=2, exceptions=(ConnectionError,))
def fetch_data(url: str):
    import random
    if random.random() < 0.7:
        raise ConnectionError("Network error")
    return f"Data from {url}"

# Usage
try:
    result = fetch_data("https://api.example.com")
    print(result)
except ConnectionError:
    print("All retry attempts exhausted")
```

### JavaScript

```javascript
function retry(fn, { maxAttempts = 3, delay = 1000, backoff = 2, exceptions = [Error] } = {}) {
  return async function(...args) {
    let attempt = 1;
    let currentDelay = delay;

    while (attempt <= maxAttempts) {
      try {
        return await fn(...args);
      } catch (e) {
        const isRetryable = exceptions.some(ex => e instanceof ex);
        if (!isRetryable || attempt === maxAttempts) throw e;

        console.log(`Attempt ${attempt} failed: ${e.message}. Retrying in ${currentDelay}ms...`);
        await new Promise(r => setTimeout(r, currentDelay));
        currentDelay *= backoff;
        attempt++;
      }
    }
  };
}

async function fetchData(url) {
  if (Math.random() < 0.7) throw new Error("Network error");
  return `Data from ${url}`;
}

const retryFetch = retry(fetchData, { maxAttempts: 3, delay: 1000, backoff: 2 });

// Usage
retryFetch("https://api.example.com")
  .then(console.log)
  .catch(e => console.log("All retry attempts exhausted:", e.message));
```

### Java

```java
import java.util.function.Supplier;

public class Retry {
    public static <T> T execute(Supplier<T> action, int maxAttempts, long delayMs, double backoff) {
        int attempt = 1;
        long currentDelay = delayMs;

        while (attempt <= maxAttempts) {
            try {
                return action.get();
            } catch (Exception e) {
                if (attempt == maxAttempts) throw new RuntimeException("All retries exhausted", e);
                System.out.println("Attempt " + attempt + " failed. Retrying in " + currentDelay + "ms...");
                try {
                    Thread.sleep(currentDelay);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Interrupted during retry delay", ie);
                }
                currentDelay = (long)(currentDelay * backoff);
                attempt++;
            }
        }
        throw new IllegalStateException("Unreachable");
    }
}

// Usage
String result = Retry.execute(() -> {
    if (Math.random() < 0.7) throw new RuntimeException("Network error");
    return "Data fetched";
}, 3, 1000, 2.0);
```

## Explanation

The Retry Pattern has three configurable dimensions:

- **Max Attempts**: How many times to try before giving up (including the initial attempt)
- **Delay**: The initial wait time between retries
- **Backoff Strategy**: How the delay grows:
  - **Fixed**: Same delay every time
  - **Linear**: Delay increases by a fixed amount
  - **Exponential**: Delay doubles (or multiplies) each time — best for most scenarios
- **Exception Filter**: Which exceptions are considered retryable

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Fixed Delay** | Constant wait between retries | Predictable load on target |
| **Exponential Backoff** | Delay doubles each retry | Avoids overwhelming recovering services |
| **Jitter** | Adds randomness to backoff | Prevents thundering herd after recovery |
| **Circuit Breaker + Retry** | Skip retries when breaker is open | Prevents wasted retry attempts |

## Best Practices

- **Make operations idempotent** before applying retries — retries can cause duplicate side effects
- **Use exponential backoff with jitter** for distributed systems to avoid synchronized retries
- **Set a max total duration** (deadline) in addition to max attempts
- **Log every retry attempt** with context for debugging
- **Combine with Circuit Breaker** — don't retry when the target is clearly down

## Common Mistakes

- Retrying non-idempotent operations without deduplication mechanisms
- Using linear or no backoff, overwhelming a recovering service
- Not setting a max retry limit, causing infinite loops
- Retrying on non-transient errors (e.g., 400 Bad Request, authentication failures)
- Ignoring retry storms — many clients retrying simultaneously after a brief outage

## Frequently Asked Questions

**Q: What is the difference between Retry and Circuit Breaker?**
A: Retry handles individual transient failures. Circuit Breaker prevents cascading failures by stopping requests to a failing service. They work best together: Retry handles temporary blips, Circuit Breaker handles prolonged outages.

**Q: Should I retry 500 Internal Server Errors?**
A: It depends. 500 may indicate a transient server issue worth retrying, but 502/503/504 are more clearly transient. Never retry 4xx client errors (400, 401, 403, 404) without fixing the request first.
