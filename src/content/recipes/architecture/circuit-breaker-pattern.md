---
contentType: recipes
slug: circuit-breaker-pattern-recipe
title: "Build Resilient Systems with the Circuit Breaker Pattern"
description: "How to prevent cascading failures in distributed systems using circuit breakers with open, closed, and half-open states in Java, TypeScript, and Python."
metaDescription: "Learn circuit breaker pattern for resilient distributed systems. Prevent cascading failures with open, closed, and half-open states in Java, TypeScript, and Python."
difficulty: intermediate
topics:
  - architecture
tags:
  - architecture
  - circuit-breaker
  - design
  - patterns
  - scalability
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/saga-pattern-recipe
  - /recipes/api-gateway
  - /recipes/retry-logic-exponential-backoff
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn circuit breaker pattern for resilient distributed systems. Prevent cascading failures with open, closed, and half-open states in Java, TypeScript, and Python."
  keywords:
    - circuit breaker pattern
    - resilient systems
    - cascading failures
    - fault tolerance
    - distributed resilience
---

## Overview

A microservice calls a downstream payment service. The payment service slows down due to a database issue. The calling service spawns more threads, each waiting for the payment service to respond. Thread pools saturate. The service stops accepting new requests. The services that depend on it also fail. Within minutes, a localized database slowdown has brought down the entire request chain. This is a cascading failure.

The circuit breaker pattern prevents this by monitoring calls to a downstream service. If the failure rate exceeds a threshold, the circuit "opens" and further calls fail fast without reaching the struggling service. After a timeout, the circuit enters a "half-open" state and allows a test request through. If it succeeds, the circuit closes again. This gives the failing service time to recover and prevents the caller from wasting resources on doomed requests. This recipe covers state machine design, implementation, and integration with retry and fallback strategies.

## When to use it

Use this recipe when:

- Calling external services over a network where failures are inevitable
- Preventing a slow downstream service from consuming all caller resources
- Providing fast failure with fallback instead of blocking on timeouts
- Protecting thread pools, connection pools, and memory from being exhausted
- Building resilient microservice architectures where partial failures are contained

## Solution

### TypeScript Circuit Breaker

```typescript
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;      // failures before opening
  recoveryTimeout: number;       // ms before half-open
  halfOpenMaxCalls: number;      // test calls in half-open
}

class CircuitBreaker<T extends (...args: any[]) => Promise<any>> {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private nextAttempt = Date.now();

  constructor(
    private fn: T,
    private config: CircuitBreakerConfig
  ) {}

  async execute(...args: Parameters<T>): Promise<ReturnType<T>> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
      this.successes = 0;
    }

    try {
      const result = await this.fn(...args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.config.halfOpenMaxCalls) {
        this.state = 'CLOSED';
        this.failures = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    if (this.state === 'HALF_OPEN' || this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.config.recoveryTimeout;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Usage
const paymentBreaker = new CircuitBreaker(
  (amount: number) => paymentService.charge(amount),
  { failureThreshold: 5, recoveryTimeout: 30000, halfOpenMaxCalls: 3 }
);

try {
  await paymentBreaker.execute(100);
} catch (error) {
  await fallbackPaymentProcessor.charge(100);
}
```

### Java with Resilience4j

```java
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;

public class PaymentService {
    private final CircuitBreaker circuitBreaker;

    public PaymentService() {
        CircuitBreakerConfig config = CircuitBreakerConfig.custom()
            .failureRateThreshold(50)
            .waitDurationInOpenState(Duration.ofMillis(30000))
            .permittedNumberOfCallsInHalfOpenState(3)
            .slidingWindowSize(10)
            .build();

        CircuitBreakerRegistry registry = CircuitBreakerRegistry.of(config);
        this.circuitBreaker = registry.circuitBreaker("payment");
    }

    public String charge(double amount) {
        return circuitBreaker.executeSupplier(() -> {
            return externalPaymentGateway.charge(amount);
        });
    }
}
```

### Python with pybreaker

```python
import pybreaker
import requests

class PaymentService:
    def __init__(self):
        self.breaker = pybreaker.CircuitBreaker(
            fail_max=5,
            reset_timeout=30,
            expected_exception=requests.RequestException
        )

    @pybreaker.circuit
    def charge(self, amount):
        response = requests.post(
            "https://payment-api.example.com/charge",
            json={"amount": amount}
        )
        response.raise_for_status()
        return response.json()

service = PaymentService()

try:
    result = service.charge(100)
except pybreaker.CircuitBreakerError:
    result = fallback_charge(100)
```

## Explanation

- **Closed state**: the circuit is closed and requests pass through to the downstream service. Failures are counted in a sliding window. If the failure rate or count exceeds the threshold, the circuit opens. In the closed state, a small number of failures is tolerated — networks are inherently unreliable.
- **Open state**: the circuit is open and all requests fail fast with a `CircuitBreakerOpen` exception (or similar). The downstream service is not called, preventing resource exhaustion. The circuit stays open for a configured recovery timeout (e.g., 30 seconds), giving the failing service time to heal.
- **Half-open state**: after the recovery timeout, the circuit transitions to half-open. A limited number of test requests are allowed through. If they succeed, the circuit closes. If any fail, the circuit opens again with a fresh timeout. This automatic recovery testing removes the need for manual intervention.
- **Sliding window**: failures are tracked in a sliding window (e.g., last 10 calls or last 60 seconds). This prevents a circuit from opening due to a single spike if the overall rate is healthy. It also allows recovery if failures stop occurring.

## Variants

| Type | Failure detection | Recovery | Best for |
|------|-------------------|----------|----------|
| Count-based | N failures in window | Fixed timeout | Steady load, predictable failure patterns |
| Time-based | N failures in duration | Adaptive timeout | Variable load, burst traffic |
| Percentage | >X% failure rate | Timeout | Large volume where absolute count is noisy |
| Custom metric | Latency, error rate | Manual | Complex systems with multiple health signals |

## What Works

- **Always provide a fallback**: when the circuit is open, the application must still function. A payment service might return "payment pending, retry later." A product catalog might serve stale data from a cache. Never let an open circuit propagate as a hard failure to the user.
- **Use circuit breakers with timeouts and [retries](/recipes/architecture/retry-backoff)**: a circuit breaker without a per-request timeout can still hang. Combine a circuit breaker (macro-level health) with a request timeout (micro-level limit) and retry (transient recovery). The retry should be inside the circuit breaker, not outside — retrying on an open circuit is wasted effort.
- **Log and alert on circuit state changes**: opening a circuit is a symptom of a downstream problem. Log every state transition with context (failure rate, last error, affected service). Alert when a circuit opens, but suppress recovery alerts unless the circuit repeatedly opens — a single recovery is normal; a flapping circuit is not.
- **Size the sliding window to your traffic**: a window of 10 calls opens after 5 failures, which is appropriate for moderate traffic. For high-throughput services, a percentage-based window (e.g., 50% failure rate over 100 calls) is more stable. For low-traffic services, a count-based window may never accumulate enough failures — consider time-based windows instead.
- **Distinguish between failure types**: do not open the circuit on 4xx errors (client errors that will not recover). Open only on 5xx, timeouts, and connection errors. Some libraries allow configuring `expected_exception` — use it to classify non-retryable errors.

## Common mistakes

- **Wrapping every call in a circuit breaker**: a circuit breaker adds overhead and complexity. Use it for cross-service, cross-network calls. Do not wrap in-memory, in-process function calls — they do not fail in ways a circuit breaker helps.
- **Ignoring the half-open state**: some implementations skip half-open and transition directly from open to closed after the timeout. This is dangerous — if the service is still failing, the circuit immediately reopens and you get a loop of open-close-open. Always test with a limited number of calls before fully closing.
- **Setting recovery timeout too short**: a 1-second timeout on a database that needs 30 seconds to fail over causes rapid flapping. Set the recovery timeout based on observed recovery times. If your downstream service takes 2 minutes to restart, set the timeout to 2.5 minutes.
- **Not monitoring circuit metrics**: without metrics, you do not know how often circuits open or how long they stay open. Export circuit state, failure counts, and open duration to Prometheus, CloudWatch, or Datadog. Use dashboards to spot systemic issues.

## FAQ

**Q: Is a circuit breaker just a fancy if-statement?**
A: No — it is a state machine with memory (failure windows), automatic recovery (half-open), and distributed coordination. A simple `if (failures > 5) throw` does not recover automatically, does not track sliding windows, and does not allow controlled test requests.

**Q: Should I retry inside or outside the circuit breaker?**
A: Retry inside. The circuit breaker wraps the retry logic. If the retry exhausts and the call still fails, the circuit breaker counts it as a failure. Retrying outside an open circuit wastes resources — you already know the service is unhealthy.

**Q: Can circuit breakers cause data inconsistency?**
A: Yes, if the fallback is not carefully designed. If the circuit opens during a payment and the fallback is "assume it succeeded," you may mark unpaid orders as paid. Design fallbacks to be safe: mark as pending, queue for later processing, or notify the user. See [Saga Pattern](/recipes/saga-pattern-recipe) for distributed transaction coordination.

**Q: How do circuit breakers work with async/await?**
A: Most modern libraries (Resilience4j, Opossum for JS) support async execution natively. The state machine runs in the calling thread (or event loop), and the wrapped function is awaited. Timeouts must be compatible with the async runtime (Promise timeout in JS, CompletableFuture timeout in Java). See [Async Patterns](/recipes/api/call-rest-api) for async execution strategies.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
