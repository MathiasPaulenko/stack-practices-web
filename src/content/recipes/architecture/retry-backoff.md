---
contentType: recipes
slug: retry-backoff
title: "Retry with Exponential Backoff"
description: "Implement resilient retry strategies with exponential backoff, jitter, and circuit breaker integration for transient failure recovery."
metaDescription: "Retry patterns with exponential backoff and jitter: implement resilient HTTP clients, avoid thundering herds, and integrate with circuit breakers."
difficulty: intermediate
topics:
  - architecture
tags:
  - resilience
  - architecture
  - distributed-systems
  - design
  - patterns
relatedResources:
  - /guides/microservices-architecture-guide
  - /guides/system-design-interview-guide
  - /guides/cap-theorem-guide
  - /recipes/microservices-communication
  - /recipes/workflow-engine
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Retry patterns with exponential backoff and jitter: implement resilient HTTP clients, avoid thundering herds, and integrate with circuit breakers."
  keywords:
    - retry-backoff
    - resilience
    - architecture
    - distributed-systems
---
## Overview

Retry with exponential backoff is the foundational pattern for handling transient failures in [distributed systems](/guides/architecture/microservices-architecture-guide). Instead of immediately failing when a network hiccup or temporary overload occurs, the client waits progressively longer between attempts. Adding jitter prevents synchronized retries from creating a thundering herd that overwhelms the recovering service.

## When to Use

Use this resource when:
- Calling external APIs or services over unreliable networks
- [Database connections](/recipes/performance/connection-pooling) occasionally timeout under load
- You need to distinguish transient errors (retryable) from permanent failures
- Integrating with cloud services that throttle or have regional outages

## Solution

### Exponential Backoff with Jitter (Python)

```python
import random
import time
from functools import wraps

def retry(max_attempts=5, base_delay=1, max_delay=60, exceptions=(Exception,)):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts:
                        raise
                    
                    # Exponential backoff with full jitter
                    delay = min(base_delay * (2 ** (attempt - 1)), max_delay)
                    jitter = random.uniform(0, delay)
                    time.sleep(jitter)
        return wrapper
    return decorator

@retry(max_attempts=5, base_delay=1, exceptions=(ConnectionError,))
def fetch_data(url):
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    return response.json()
```

### Resilience4j Circuit Breaker + Retry (Java)

```java
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;

@Service
public class PaymentService {

    @Retry(name = "paymentRetry", fallbackMethod = "fallback")
    @CircuitBreaker(name = "paymentCircuit")
    public PaymentResult charge(PaymentRequest request) {
        return paymentClient.charge(request);
    }

    private PaymentResult fallback(PaymentRequest request, Exception ex) {
        return PaymentResult.declined("Service temporarily unavailable");
    }
}

// application.yml
resilience4j:
  retry:
    configs:
      default:
        maxAttempts: 5
        waitDuration: 1s
        exponentialBackoffMultiplier: 2
        retryExceptions:
          - java.net.ConnectException
          - java.net.SocketTimeoutException
```

### Polly Retry Policy (C#)

```csharp
using Polly;

var retryPolicy = Policy
    .Handle<HttpRequestException>(ex => 
        ex.StatusCode == HttpStatusCode.ServiceUnavailable ||
        ex.StatusCode == HttpStatusCode.TooManyRequests)
    .WaitAndRetryAsync(
        retryCount: 5,
        sleepDurationProvider: retryAttempt => 
            TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)) 
            + TimeSpan.FromMilliseconds(new Random().Next(0, 1000)),
        onRetry: (exception, timeSpan, retryCount, context) =>
        {
            logger.LogWarning($"Retry {retryCount} after {timeSpan}s due to {exception.Message}");
        });

var result = await retryPolicy.ExecuteAsync(() => httpClient.GetAsync(url));
```

## Explanation

**Backoff strategies**:

| Strategy | Delay Pattern | Use Case |
|----------|---------------|----------|
| Fixed | 1s, 1s, 1s | Predictable retry intervals |
| Linear | 1s, 2s, 3s | Moderate increase |
| Exponential | 1s, 2s, 4s, 8s | Fast escape from overload |
| Decorrelated jitter | Random in [0, 2^n] | Prevents thundering herd |
| Equal jitter | (2^n)/2 + random | Balanced spread |

**When NOT to retry**:
- HTTP 400 (client error — retry won't fix)
- HTTP 401/403 (auth issues)
- HTTP 404 (resource doesn't exist)
- Business logic errors (insufficient funds, invalid input)

## Variants

| Library | Language | Notable |
|---------|----------|---------|
| Resilience4j | Java | Retry, CB, rate limiter, bulkhead |
| Polly | C# | Thorough; async support |
| tenacity | Python | Decorators; jitter support |
| cockroachdb/errors | Go | Structured errors; retry markers |
| axios-retry | JavaScript | Axios plugin; configurable |

## What Works

- **Set a maximum delay**: Without a cap, backoff can grow to hours
- **Use idempotency keys**: Retrying POST requests without them creates duplicates. See [message idempotency](/recipes/messaging/rabbitmq-task-queue).
- **Circuit breaker integration**: Stop retrying when the service is clearly down. Integrate with [circuit breaker](/patterns/design/circuit-breaker-pattern).
- **Log every retry**: Silent retries hide systemic issues
- **Respect Retry-After headers**: HTTP 429/503 often include recommended wait times

## Common Mistakes

1. **Retrying everything**: [Non-idempotent](/recipes/messaging/rabbitmq-task-queue) operations and client errors should fail fast
2. **No jitter**: Synchronized retries from multiple clients recreate the original overload
3. **Infinite retries**: A client that retries forever becomes a denial-of-service source
4. **Blocking the caller**: Synchronous retries in request handlers increase response times
5. **Retrying inside transactions**: Database transactions + retries = lock escalation

## Frequently Asked Questions

**Q: What's the right number of retries?**
A: Usually 3-5. More retries increase latency without considerably improving success rates.

**Q: Should I retry in the client or use a message queue?**
A: For synchronous APIs: retry in client. For background jobs: use a queue with built-in retry.

**Q: How do I handle idempotency for retries?**
A: Generate a unique `Idempotency-Key` header. The server checks if it has processed this key before. Learn more in [message idempotency](/recipes/messaging/rabbitmq-task-queue).

### Retry Budget with Token Bucket (Go)

```go
package main

import (
    "sync"
    "time"
)

type RetryBudget struct {
    mu         sync.Mutex
    tokens     float64
    maxTokens  float64
    refillRate float64 // tokens per second
    lastRefill time.Time
}

func NewRetryBudget(maxTokens, refillRate float64) *RetryBudget {
    return &RetryBudget{
        tokens:     maxTokens,
        maxTokens:  maxTokens,
        refillRate: refillRate,
        lastRefill: time.Now(),
    }
}

func (b *RetryBudget) TryAcquire() bool {
    b.mu.Lock()
    defer b.mu.Unlock()

    // Refill tokens based on elapsed time
    now := time.Now()
    elapsed := now.Sub(b.lastRefill).Seconds()
    b.tokens = min(b.maxTokens, b.tokens+elapsed*b.refillRate)
    b.lastRefill = now

    if b.tokens >= 1.0 {
        b.tokens -= 1.0
        return true
    }
    return false
}

// Usage: only retry if budget allows
func callWithBudget(client *Client, req *Request, budget *RetryBudget) (*Response, error) {
    for attempt := 0; attempt < 5; attempt++ {
        resp, err := client.Do(req)
        if err == nil {
            return resp, nil
        }
        if !isRetryable(err) {
            return nil, err
        }
        if !budget.TryAcquire() {
            return nil, fmt.Errorf("retry budget exhausted")
        }
        time.Sleep(backoff(attempt))
    }
    return nil, fmt.Errorf("max attempts exceeded")
}
```

### Hedged Requests with Cancellation (TypeScript)

```typescript
import { AbortController } from 'node:abort-controller';

async function hedgedRequest(
  url: string,
  options: RequestInit,
  hedgedDelay: number = 200
): Promise<Response> {
  const controller = new AbortController();

  // First request
  const firstPromise = fetch(url, { ...options, signal: controller.signal });

  // Hedged request after delay if first hasn't returned
  const hedgedPromise = new Promise<Response>((resolve) => {
    setTimeout(async () => {
      if (!controller.signal.aborted) {
        const response = await fetch(url, { ...options, signal: controller.signal });
        resolve(response);
      }
    }, hedgedDelay);
  });

  // Race: first to complete wins, cancel the other
  const response = await Promise.race([firstPromise, hedgedPromise]);
  controller.abort(); // cancel the loser

  return response;
}

// Usage: send hedged requests for tail latency reduction
const response = await hedgedRequest('https://api.example.com/data', {
  method: 'GET',
  headers: { 'Accept': 'application/json' },
}, 150);
```

### Context-Aware Retry with Deadline (Python)

```python
import time
from typing import Callable, Type, Tuple, Optional
from dataclasses import dataclass

@dataclass
class RetryConfig:
    max_attempts: int = 5
    base_delay: float = 1.0
    max_delay: float = 60.0
    deadline: Optional[float] = None  # seconds from start
    retryable_exceptions: Tuple[Type[Exception], ...] = (ConnectionError, TimeoutError)

def retry_with_deadline(config: RetryConfig):
    def decorator(func: Callable):
        def wrapper(*args, **kwargs):
            start_time = time.monotonic()
            last_error = None

            for attempt in range(1, config.max_attempts + 1):
                # Check deadline
                if config.deadline:
                    elapsed = time.monotonic() - start_time
                    if elapsed >= config.deadline:
                        raise TimeoutError(
                            f'Retry deadline exceeded after {elapsed:.1f}s '
                            f'(attempt {attempt}/{config.max_attempts})'
                        )

                try:
                    return func(*args, **kwargs)
                except config.retryable_exceptions as e:
                    last_error = e
                    if attempt == config.max_attempts:
                        raise

                    # Calculate delay with exponential backoff + full jitter
                    delay = min(
                        config.base_delay * (2 ** (attempt - 1)),
                        config.max_delay
                    )
                    # Don't delay past deadline
                    if config.deadline:
                        remaining = config.deadline - (time.monotonic() - start_time)
                        delay = min(delay, remaining * 0.5)

                    import random
                    jitter = random.uniform(0, delay)
                    time.sleep(jitter)

            raise last_error
        return wrapper
    return decorator

@retry_with_deadline(RetryConfig(
    max_attempts=5,
    base_delay=0.5,
    max_delay=30,
    deadline=10.0,
    retryable_exceptions=(ConnectionError, TimeoutError)
))
def fetch_with_deadline(url: str):
    response = requests.get(url, timeout=5)
    response.raise_for_status()
    return response.json()
```

## Additional Best Practices

1. **Use a retry budget across all callers.** A global retry budget prevents retry storms from cascading through service layers. Each service gets a token bucket; retries consume tokens; when empty, retries are rejected:

```typescript
class GlobalRetryBudget {
  private tokens: number;
  private readonly maxTokens: number = 100;
  private readonly refillPerSecond: number = 10;
  private lastRefill: number = Date.now();

  canRetry(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillPerSecond);
    this.lastRefill = now;
  }
}
```

2. **Distinguish retryable vs non-retryable errors explicitly.** Map HTTP status codes and exception types to retryable flags so retry logic doesn't waste attempts on permanent failures:

```python
RETRYABLE_STATUS_CODES = {408, 429, 500, 502, 503, 504}
RETRYABLE_EXCEPTIONS = (ConnectionError, TimeoutError, OSError)

def is_retryable(response=None, error=None):
    if error and isinstance(error, RETRYABLE_EXCEPTIONS):
        return True
    if response and response.status_code in RETRYABLE_STATUS_CODES:
        return True
    return False
```

3. **Log retry context for observability.** Include attempt number, delay, error type, and target URL in retry logs to identify patterns:

```typescript
function logRetry(context: {
  attempt: number;
  maxAttempts: number;
  delayMs: number;
  error: Error;
  url: string;
}): void {
  logger.warn('Retry attempt', {
    attempt: `${context.attempt}/${context.maxAttempts}`,
    delay: `${context.delayMs}ms`,
    error: context.error.name,
    message: context.error.message,
    url: context.url,
  });
}
```

## Additional Common Mistakes

1. **Retrying without checking Retry-After.** HTTP 429 and 503 responses often include a `Retry-After` header. Ignoring it and using your own backoff can cause you to retry too soon:

```python
import requests

def retry_with_retry_after(url, max_attempts=5):
    for attempt in range(max_attempts):
        response = requests.get(url, timeout=10)
        if response.status_code == 429:
            retry_after = int(response.headers.get('Retry-After', 60))
            time.sleep(retry_after)
            continue
        response.raise_for_status()
        return response
    raise Exception(f'Max attempts ({max_attempts}) exceeded')
```

2. **Retry amplification across service layers.** Service A retries 3 times, calls Service B which also retries 3 times, which calls Service C with 3 retries. A single request becomes 27 calls. Use retry budgets or disable retries at inner layers:

```typescript
// Outer service: retry enabled
const outerClient = new Client({ retry: { maxAttempts: 3 } });

// Inner service: no retry (outer handles it)
const innerClient = new Client({ retry: { maxAttempts: 0 } });
```

3. **Using sleep in async handlers.** Blocking the event loop with `time.sleep()` or `Thread.sleep()` in async handlers stalls all concurrent requests. Use async sleep:

```typescript
// Bad: blocks the event loop
function retrySync(fn: () => any, attempts: number) {
  for (let i = 0; i < attempts; i++) {
    try { return fn(); } catch (e) {
      if (i === attempts - 1) throw e;
      // Blocks the entire event loop!
      const start = Date.now();
      while (Date.now() - start < 1000 * Math.pow(2, i)) {}
    }
  }
}

// Good: async sleep
async function retryAsync(fn: () => Promise<any>, attempts: number) {
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (e) {
      if (i === attempts - 1) throw e;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

## Additional FAQ

### How do I test retry logic?

Use a mock server that returns configurable failures (WireMock, MockServer). Set up the mock to fail the first N requests, then succeed. Assert that your client retries the expected number of times and succeeds. Test edge cases: deadline exceeded mid-retry, retry budget exhausted, non-retryable errors fail immediately. For jitter, run the test 100 times and assert that delays fall within expected ranges.

### Is this solution production-ready?

Yes. The Python retry decorator with full jitter follows AWS's recommended retry pattern. Resilience4j with circuit breaker + retry is the standard Spring Boot resilience pattern. Polly is the standard .NET resilience library used in Microsoft's production services. The Go retry budget with token bucket is how gRPC clients implement retry budgets. Hedged requests are used by Google's internal RPC systems (HedgedRPC) to reduce tail latency.

### What are the performance characteristics?

Each retry attempt adds the backoff delay plus the request latency. With exponential backoff (1s, 2s, 4s, 8s, 16s), 5 attempts take up to 31s plus request time. Full jitter reduces average delay by 50% but spreads load. Retry budgets add a single integer check per retry — negligible overhead. Hedged requests double the request load but reduce P99 latency by 30-50% for slow responses. Circuit breaker integration adds a single state check per call. Token bucket refill is O(1) per acquisition.

### How do I debug issues with this approach?

Log every retry with attempt number, delay, error type, and target. Use distributed tracing (Jaeger, Zipkin) to see retry spans within a request. Monitor retry rate per service — if it exceeds 5%, investigate the downstream service. Track P99 latency with and without retries to understand retry impact. Set up alerts on retry budget exhaustion, circuit breaker open events, and hedged request rates. For retry storms, look for retry amplification across service layers in trace data.
