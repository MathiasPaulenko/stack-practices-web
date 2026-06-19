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
  - retry-backoff
  - resilience
  - architecture
  - distributed-systems
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

Retry with exponential backoff is the foundational pattern for handling transient failures in distributed systems. Instead of immediately failing when a network hiccup or temporary overload occurs, the client waits progressively longer between attempts. Adding jitter prevents synchronized retries from creating a thundering herd that overwhelms the recovering service.

## When to Use

Use this resource when:
- Calling external APIs or services over unreliable networks
- Database connections occasionally timeout under load
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
| Polly | C# | Comprehensive; async support |
| tenacity | Python | Decorators; jitter support |
| cockroachdb/errors | Go | Structured errors; retry markers |
| axios-retry | JavaScript | Axios plugin; configurable |

## Best Practices

- **Set a maximum delay**: Without a cap, backoff can grow to hours
- **Use idempotency keys**: Retrying POST requests without them creates duplicates
- **Circuit breaker integration**: Stop retrying when the service is clearly down
- **Log every retry**: Silent retries hide systemic issues
- **Respect Retry-After headers**: HTTP 429/503 often include recommended wait times

## Common Mistakes

1. **Retrying everything**: Non-idempotent operations and client errors should fail fast
2. **No jitter**: Synchronized retries from multiple clients recreate the original overload
3. **Infinite retries**: A client that retries forever becomes a denial-of-service source
4. **Blocking the caller**: Synchronous retries in request handlers increase response times
5. **Retrying inside transactions**: Database transactions + retries = lock escalation

## Frequently Asked Questions

**Q: What's the right number of retries?**
A: Usually 3-5. More retries increase latency without significantly improving success rates.

**Q: Should I retry in the client or use a message queue?**
A: For synchronous APIs: retry in client. For background jobs: use a queue with built-in retry.

**Q: How do I handle idempotency for retries?**
A: Generate a unique `Idempotency-Key` header. The server checks if it has processed this key before.
