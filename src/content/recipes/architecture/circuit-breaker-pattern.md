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
  - /recipes/multi-tenancy
  - /recipes/service-discovery
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

The circuit breaker pattern prevents this by monitoring calls to a downstream service. If the failure rate exceeds a threshold, the circuit "opens" and further calls fail fast without reaching the struggling service. After a timeout, the circuit enters a "half-open" state and allows a test request through. If it succeeds, the circuit closes again. This gives the failing service time to recover and prevents the caller from wasting resources on doomed requests. Here is how to state machine design, implementation, and integration with retry and fallback strategies.

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


### Go with gobreaker

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/sony/gobreaker"
)

type PaymentClient struct {
    cb *gobreaker.CircuitBreaker
}

func NewPaymentClient() *PaymentClient {
    settings := gobreaker.Settings{
        Name:        "payment-service",
        MaxRequests: 3,                              // half-open max calls
        Interval:    60 * time.Second,               // sliding window interval
        Timeout:     30 * time.Second,               // open state duration
        ReadyToTrip: func(counts gobreaker.Counts) bool {
            // Open when failure ratio > 60%
            failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
            return counts.Requests > 5 && failureRatio > 0.6
        },
        OnStateChange: func(name string, from, to gobreaker.State) {
            log.Printf("Circuit %s: %s -> %s", name, from, to)
        },
    }

    return &PaymentClient{
        cb: gobreaker.NewCircuitBreaker(settings),
    }
}

func (c *PaymentClient) Charge(ctx context.Context, amount float64) (string, error) {
    result, err := c.cb.Execute(func() (interface{}, error) {
        return c.callPaymentService(ctx, amount)
    })
    if err != nil {
        return "", err
    }
    return result.(string), nil
}

func (c *PaymentClient) callPaymentService(ctx context.Context, amount float64) (string, error) {
    // HTTP call to payment service
    return fmt.Sprintf("charged %.2f", amount), nil
}
```

### C# with Polly

```csharp
using Polly;
using Polly.CircuitBreaker;
using System.Net.Http;

public class PaymentService
{
    private readonly AsyncCircuitBreakerPolicy<HttpResponseMessage> _circuitBreaker;
    private readonly HttpClient _httpClient;

    public PaymentService(HttpClient httpClient)
    {
        _httpClient = httpClient;

        _circuitBreaker = Policy<HttpResponseMessage>
            .Handle<HttpRequestException>()
            .OrResult(r => r.IsSuccessStatusCode == false)
            .CircuitBreakerAsync(
                handledEventsAllowedBeforeBreaking: 5,
                durationOfBreak: TimeSpan.FromSeconds(30),
                onBreak: (exception, duration) =>
                {
                    Console.WriteLine($"Circuit opened for {duration.TotalSeconds}s");
                },
                onReset: () => Console.WriteLine("Circuit closed"),
                onHalfOpen: () => Console.WriteLine("Circuit half-open")
            );
    }

    public async Task<string> ChargeAsync(decimal amount)
    {
        return await _circuitBreaker.ExecuteAsync(async () =>
        {
            var response = await _httpClient.PostAsJsonAsync(
                "https://payment-api.example.com/charge",
                new { Amount = amount }
            );
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        });
    }
}
```

### Prometheus Metrics for Circuit Breaker

```typescript
import { Counter, Gauge, Histogram } from 'prom-client';

const circuitState = new Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state: 0=closed, 1=open, 2=half-open',
  labelNames: ['circuit_name'],
});

const circuitFailures = new Counter({
  name: 'circuit_breaker_failures_total',
  help: 'Total failures counted by circuit breaker',
  labelNames: ['circuit_name'],
});

const circuitDuration = new Histogram({
  name: 'circuit_breaker_call_duration_seconds',
  help: 'Call duration through circuit breaker',
  labelNames: ['circuit_name', 'outcome'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

class InstrumentedCircuitBreaker<T extends (...args: any[]) => Promise<any>> {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private nextAttempt = Date.now();

  constructor(
    private fn: T,
    private config: CircuitBreakerConfig,
    private name: string
  ) {
    circuitState.set({ circuit_name: this.name }, 0);
  }

  async execute(...args: Parameters<T>): Promise<ReturnType<T>> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        circuitState.set({ circuit_name: this.name }, 1);
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
      circuitState.set({ circuit_name: this.name }, 2);
      this.successes = 0;
    }

    const start = Date.now();
    try {
      const result = await this.fn(...args);
      const duration = (Date.now() - start) / 1000;
      circuitDuration.observe(
        { circuit_name: this.name, outcome: 'success' },
        duration
      );
      this.onSuccess();
      return result;
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      circuitDuration.observe(
        { circuit_name: this.name, outcome: 'failure' },
        duration
      );
      circuitFailures.inc({ circuit_name: this.name });
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.config.halfOpenMaxCalls) {
        this.state = 'CLOSED';
        circuitState.set({ circuit_name: this.name }, 0);
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
      circuitState.set({ circuit_name: this.name }, 1);
      this.nextAttempt = Date.now() + this.config.recoveryTimeout;
    }
  }
}
```

## Additional Best Practices

1. **Combine circuit breakers with bulkheads.** A circuit breaker prevents calling a failing service, but a bulkhead limits how many concurrent calls you make. Together they prevent resource exhaustion:

```java
import io.github.resilience4j.bulkhead.Bulkhead;
import io.github.resilience4j.bulkhead.BulkheadConfig;

BulkheadConfig bulkheadConfig = BulkheadConfig.custom()
    .maxConcurrentCalls(20)
    .maxWaitDuration(Duration.ofMillis(500))
    .build();

Bulkhead bulkhead = Bulkhead.of("payment", bulkheadConfig);

// Combine: circuit breaker + bulkhead + retry
Supplier<String> supplier = Supplier.of(() -> gateway.charge(amount));
Supplier<String> protected = Decorators.ofSupplier(supplier)
    .withCircuitBreaker(circuitBreaker)
    .withBulkhead(bulkhead)
    .withRetry(retry)
    .decorate();
```

2. **Use separate circuit breakers per downstream service.** A single circuit breaker for all downstream calls means one failing service opens the circuit for all. Use one circuit breaker per downstream dependency:

```typescript
const breakers = new Map<string, CircuitBreaker>();

function getBreaker(serviceName: string): CircuitBreaker {
  if (!breakers.has(serviceName)) {
    breakers.set(serviceName, new CircuitBreaker(
      (args: any[]) => callService(serviceName, args),
      { failureThreshold: 5, recoveryTimeout: 30000, halfOpenMaxCalls: 3 }
    ));
  }
  return breakers.get(serviceName)!;
}
```

3. **Implement graceful degradation in fallbacks.** The fallback should provide a meaningful response, not just re-throw. For read operations, serve cached data. For write operations, queue for later:

```python
from datetime import datetime, timedelta
import redis

cache = redis.Redis(host='localhost', port=6379)

def get_product_with_fallback(product_id):
    try:
        return product_breaker.call(get_product_from_api, product_id)
    except CircuitBreakerError:
        cached = cache.get(f"product:{product_id}")
        if cached:
            data = json.loads(cached)
            data["_stale"] = True
            data["_cached_at"] = datetime.utcnow().isoformat()
            return data
        return {"error": "product temporarily unavailable", "retry_after": 30}
```

## Additional Common Mistakes

1. **Sharing circuit breaker state across services.** If multiple services share a single circuit breaker instance, one service's failures open the circuit for all. Each downstream dependency needs its own circuit breaker with its own failure tracking:

```typescript
// Bad: shared breaker for all downstream calls
const sharedBreaker = new CircuitBreaker(callAnyService, config);

// Good: separate breaker per service
const paymentBreaker = new CircuitBreaker(callPayment, paymentConfig);
const inventoryBreaker = new CircuitBreaker(callInventory, inventoryConfig);
const shippingBreaker = new CircuitBreaker(callShipping, shippingConfig);
```

2. **Not testing the fallback path.** If the fallback fails too, you get an unhandled error. Test fallbacks in isolation — verify they return valid data, handle null cases, and do not throw. Include fallback testing in your CI pipeline:

```java
@Test
void testFallbackWhenCircuitIsOpen() {
    // Force circuit open
    when(paymentGateway.charge(anyDouble()))
        .thenThrow(new RuntimeException("connection refused"));

    // Call enough times to open circuit
    for (int i = 0; i < 5; i++) {
        assertThrows(RuntimeException.class, () -> service.charge(100));
    }

    // Circuit should be open, fallback should work
    String result = service.chargeWithFallback(100);
    assertEquals("payment queued", result);
}
```

3. **Opening on business logic errors.** A 404 (not found) or 400 (bad request) is not a downstream health issue. Only open on infrastructure failures: 5xx, timeouts, connection refused, DNS errors. Configure `recordExceptions` carefully:

```java
CircuitBreakerConfig config = CircuitBreakerConfig.custom()
    .recordExceptions(IOException.class, TimeoutException.class)
    .ignoreExceptions(BusinessException.class, NotFoundException.class)
    .recordResult(result -> result.getStatusCode() >= 500)
    .build();
```

## Additional FAQ

### How do I test circuit breaker configuration?

Use chaos engineering to inject failures. In integration tests, use a mock server that returns 503s after N requests. Verify the circuit opens at the configured threshold. In production, use fault injection (e.g., delay or abort in Istio) to simulate downstream failures. Monitor circuit state transitions via metrics. For half-open testing, wait for the recovery timeout and verify the circuit allows test calls. For fallback testing, force the circuit open and verify the fallback returns valid data. Test flapping scenarios by alternating success and failure to verify the circuit does not oscillate.

### Is this solution production-ready?

Yes. Resilience4j is used in production by Spring Boot applications at scale. Netflix Hystrix (predecessor pattern) was used across Netflix's entire microservice architecture. gobreaker is used in Go microservices at Uber and Twitch. Polly is used in .NET applications at Microsoft and Stack Overflow. The circuit breaker pattern is a standard resilience pattern documented in the Microsoft Azure Architecture Center and Google SRE book.

### What are the performance characteristics?

A circuit breaker adds 0.01-0.1ms overhead per call for state tracking. In the open state, calls fail in under 0.01ms (no network call). The sliding window uses O(1) memory for count-based and O(n) for time-based windows. Prometheus metrics add 0.01ms per call for metric recording. The bulkhead adds 0.01ms for semaphore acquire/release. Fallback execution time depends on the fallback strategy — cache lookups add 0.1-1ms, queue writes add 1-5ms. The total overhead of circuit breaker + bulkhead + retry + metrics is typically under 0.5ms per call.

### How do I debug issues with this approach?

Log every state transition with the circuit name, previous state, new state, failure count, and last error. Export `circuit_breaker_state` as a Prometheus gauge and alert when it stays open for more than 5 minutes. For flapping circuits, check if the recovery timeout is too short or if the downstream service is oscillating. For circuits that never open, verify the failure threshold and sliding window size match your traffic volume. For circuits that open too frequently, check if you are recording business errors (4xx) as failures. Use distributed tracing (Jaeger, Zipkin) to see which calls are being blocked by the circuit breaker.
