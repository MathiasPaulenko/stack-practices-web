---
contentType: patterns
slug: circuit-breaker-pattern
title: "Circuit Breaker Pattern"
description: "Prevent cascading failures by stopping requests to failing services. An architectural pattern for resilient distributed systems."
metaDescription: "Learn the Circuit Breaker Pattern in Python, Java, and JavaScript. Architectural pattern for resilient microservices and fault tolerance."
difficulty: intermediate
topics:
  - design
tags:
  - circuit-breaker
  - pattern
  - architecture-pattern
  - resilience
  - microservices
  - fault-tolerance
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/proxy-pattern
  - /patterns/design/observer-pattern
  - /patterns/design/strategy-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Circuit Breaker Pattern in Python, Java, and JavaScript. Architectural pattern for resilient microservices and fault tolerance."
  keywords:
    - circuit breaker pattern
    - architecture pattern
    - resilience pattern
    - microservices
    - fault tolerance
    - python circuit breaker
    - java resilience4j
    - javascript circuit breaker
---

# Circuit Breaker Pattern

## Overview

The Circuit Breaker Pattern is an architectural pattern that prevents an application from repeatedly trying to execute an operation that is likely to fail. When a service is down or struggling, the circuit breaker "trips" and stops sending requests, giving the service time to recover. This prevents cascading failures and resource exhaustion in distributed systems.

## When to Use

Use the Circuit Breaker Pattern when:
- A service call to a remote dependency may fail or timeout
- You want to prevent cascading failures across services
- You need to degrade gracefully when a service is unavailable
- You want to avoid overwhelming a failing service with retries
- You need fast failure for calls to unhealthy downstream services

## Solution

### Python

```python
import time
from enum import Enum, auto

class CircuitState(Enum):
    CLOSED = auto()      # Normal operation
    OPEN = auto()        # Failing fast
    HALF_OPEN = auto()   # Testing recovery

class CircuitBreaker:
    def __init__(self, failure_threshold=3, recovery_timeout=5):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.state = CircuitState.CLOSED
        self.failures = 0
        self.last_failure_time = None

    def call(self, func, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time >= self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
            else:
                raise Exception("Circuit breaker is OPEN")

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e

    def _on_success(self):
        self.failures = 0
        self.state = CircuitState.CLOSED

    def _on_failure(self):
        self.failures += 1
        self.last_failure_time = time.time()
        if self.failures >= self.failure_threshold:
            self.state = CircuitState.OPEN

# Usage
def fetch_data():
    # Simulated flaky service
    import random
    if random.random() < 0.7:
        raise Exception("Service error")
    return "Data"

breaker = CircuitBreaker(failure_threshold=2, recovery_timeout=3)

for i in range(5):
    try:
        print(breaker.call(fetch_data))
    except Exception as e:
        print(f"Call {i+1}: {e}")
```

### JavaScript

```javascript
class CircuitBreaker {
  constructor(failureThreshold = 3, recoveryTimeout = 5000) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeout;
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = null;
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (e) {
      this.onFailure();
      throw e;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

// Usage
async function fetchData() {
  if (Math.random() < 0.7) throw new Error('Service error');
  return 'Data';
}

const breaker = new CircuitBreaker(2, 3000);

(async () => {
  for (let i = 0; i < 5; i++) {
    try {
      const result = await breaker.call(fetchData);
      console.log(`Call ${i + 1}:`, result);
    } catch (e) {
      console.log(`Call ${i + 1}:`, e.message);
    }
  }
})();
```

### Java

```java
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

public class CircuitBreaker {
    private enum State { CLOSED, OPEN, HALF_OPEN }

    private final int failureThreshold;
    private final long recoveryTimeoutMs;
    private State state = State.CLOSED;
    private final AtomicInteger failures = new AtomicInteger(0);
    private volatile long lastFailureTime = 0;

    public CircuitBreaker(int failureThreshold, long recoveryTimeoutMs) {
        this.failureThreshold = failureThreshold;
        this.recoveryTimeoutMs = recoveryTimeoutMs;
    }

    public <T> T call(Supplier<T> supplier) throws Exception {
        if (state == State.OPEN) {
            if (System.currentTimeMillis() - lastFailureTime >= recoveryTimeoutMs) {
                state = State.HALF_OPEN;
            } else {
                throw new Exception("Circuit breaker is OPEN");
            }
        }

        try {
            T result = supplier.get();
            onSuccess();
            return result;
        } catch (Exception e) {
            onFailure();
            throw e;
        }
    }

    private void onSuccess() {
        failures.set(0);
        state = State.CLOSED;
    }

    private void onFailure() {
        int count = failures.incrementAndGet();
        lastFailureTime = System.currentTimeMillis();
        if (count >= failureThreshold) {
            state = State.OPEN;
        }
    }
}

// Usage
public class Main {
    public static void main(String[] args) {
        CircuitBreaker breaker = new CircuitBreaker(2, 3000);

        for (int i = 0; i < 5; i++) {
            try {
                String result = breaker.call(() -> {
                    if (Math.random() < 0.7) throw new RuntimeException("Service error");
                    return "Data";
                });
                System.out.println("Call " + (i + 1) + ": " + result);
            } catch (Exception e) {
                System.out.println("Call " + (i + 1) + ": " + e.getMessage());
            }
        }
    }
}
```

## Explanation

The Circuit Breaker Pattern has three states:

- **Closed** — Normal operation. Requests pass through to the service. Failures are counted.
- **Open** — The service is considered unhealthy. All requests fail fast immediately without calling the service.
- **Half-Open** — After a timeout, a limited number of test requests are allowed through to check if the service recovered.

This prevents resource exhaustion from repeated failed calls and gives failing services time to recover. Essential in [distributed systems](/guides/architecture/microservices-architecture-guide).

## Variants

| Variant | Behavior | Use Case |
|---------|----------|----------|
| **Count-based** | Trip after N failures | Simple, predictable behavior |
| **Time-based** | Trip if failure rate exceeds threshold in a time window | Adapts to varying load |
| **Weighted** | Different failure thresholds for different exception types | Distinguish transient vs. permanent failures |
| **[Custom Fallback](/patterns/design/cache-aside-pattern)** | Return a default value when open instead of throwing | Graceful degradation (cache, default response) |

## What Works

- **Configure recovery timeouts based on the service's typical restart time**
- **Log state transitions** for observability and alerting
- **Provide fallback behavior** when the circuit is open (cached data, default response)
- **Use separate circuit breakers** for different downstream services
- **Avoid sharing circuit breaker state** across unrelated operations

## Common Mistakes

- Setting the failure threshold too low, causing frequent false positives
- Setting the recovery timeout too short, not giving the service enough time to recover
- Using a single circuit breaker for all operations, causing unnecessary broad outages
- Not providing fallback behavior, leading to poor user experience when circuits are open
- Ignoring half-open state, never allowing recovery testing after a failure

## Frequently Asked Questions

**Q: How is Circuit Breaker different from Retry?**
A: [Retry](/patterns/design/retry-pattern) attempts the same operation multiple times. Circuit Breaker stops calling a failing service altogether. They work well together: retry for transient failures, circuit breaker for persistent outages.

**Q: Should I use a library or implement my own?**
A: For production systems, use established libraries: Resilience4j (Java), Polly (.NET), Opossum (JavaScript/Node). See also [Ambassador](/patterns/design/ambassador-pattern) for client-side resilience. Implement your own only for learning or very constrained environments.

**Q: How do I monitor circuit breaker health?**
A: Expose metrics for state transitions, failure rates, and open duration. Integrate with your monitoring stack (Prometheus, Grafana) to alert on frequent circuit trips.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
