---

contentType: patterns
slug: retry-with-jitter-pattern
title: "Patrón Retry with Jitter"
description: "Cómo retryar failed operations con exponential backoff y random jitter. Cubre full jitter, equal jitter, decorrelated jitter, retry budgets, e idempotency."
metaDescription: "Retryá failed operations con exponential backoff y random jitter. Aprende full jitter, equal jitter, decorrelated jitter, retry budgets, e idempotency requirements."
difficulty: intermediate
topics:
  - architecture
tags:
  - architecture
  - resilience
  - retry
  - backoff
  - pattern
category: behavioral
relatedResources:
  - /patterns/bulkhead-pattern
  - /patterns/circuit-breaker-half-open-pattern
  - /patterns/rate-limiter-token-bucket-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Retryá failed operations con exponential backoff y random jitter. Aprende full jitter, equal jitter, decorrelated jitter, retry budgets, e idempotency requirements."
  keywords:
    - architecture
    - resilience
    - retry
    - backoff
    - pattern

---

## Overview

El retry with jitter pattern retryéa failed operations con exponentially increasing delays más random jitter. Sin jitter, todos los clients retryéan en los mismos intervals, creando synchronized retry storms que overwhelméan el recovering service. Jitter spreadéa retry attempts across time, smootheando el load. El pattern combina exponential backoff (delay doubles cada retry) con random jitter (delay varía randomly within un range). Esto previene thundering herd problems y le da al downstream service time para recover entre waves de retries.

## When to Use

- Transient failures: network timeouts, 503 responses, connection resets
- Cloud API calls que occasionally falleán debido a rate limiting
- Database connection drops que recoverán dentro de seconds
- Message queue operations que temporalmente fallan
- Cualquier operation donde el failure es likely temporary

## When NOT to Use

- Non-idempotent operations (POST que crea resources) sin un dedup key
- Permanent failures (400 Bad Request, 404 Not Found) — retryando no va a ayudar
- Real-time systems donde retry latency excede el SLA
- Operations donde el side effect no es reversible

## Solution

### Basic exponential backoff con jitter (Python)

```python
# retry/exponential_backoff.py — Exponential backoff con full jitter
import random
import time
from functools import wraps

class RetryWithJitter:
    """Retry con exponential backoff y jitter.
    Full jitter: delay = random.uniform(0, base * 2^attempt)"""

    def __init__(self, max_retries=5, base_delay=1.0, max_delay=60.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay

    def full_jitter(self, attempt):
        """Full jitter: random entre 0 y exponential backoff."""
        ceiling = min(self.base_delay * (2 ** attempt), self.max_delay)
        return random.uniform(0, ceiling)

    def equal_jitter(self, attempt):
        """Equal jitter: half fixed, half random."""
        ceiling = min(self.base_delay * (2 ** attempt), self.max_delay)
        return ceiling / 2 + random.uniform(0, ceiling / 2)

    def decorrelated_jitter(self, prev_delay):
        """Decorrelated jitter: basado en previous delay, no attempt count."""
        ceiling = min(self.base_delay * 3, self.max_delay)
        return random.uniform(self.base_delay, prev_delay * 3)

    def retry(self, fn, *args, **kwargs):
        """Ejecutá fn con retry. Raiseéa last exception si todos los retries fallan."""
        last_exception = None
        prev_delay = self.base_delay

        for attempt in range(self.max_retries + 1):
            try:
                return fn(*args, **kwargs)
            except Exception as e:
                last_exception = e
                if attempt == self.max_retries:
                    break

                # Calculá delay con full jitter
                delay = self.full_jitter(attempt)
                print(f"Attempt {attempt + 1} failed: {e}. "
                      f"Retrying in {delay:.2f}s...")
                time.sleep(delay)

        raise last_exception

    def __call__(self, fn):
        """Decorator que wrapea un function con retry logic."""
        @wraps(fn)
        def wrapper(*args, **kwargs):
            return self.retry(fn, *args, **kwargs)
        return wrapper


# Usage
retry = RetryWithJitter(max_retries=5, base_delay=1.0, max_delay=60.0)

@retry
def call_api(endpoint):
    import requests
    resp = requests.get(endpoint, timeout=5)
    resp.raise_for_status()
    return resp.json()
```

### Decorrelated jitter retry (Python)

```python
# retry/decorrelated.py — Decorrelated jitter (AWS recommended)
import random
import time

class DecorrelatedJitterRetry:
    """AWS-recommended decorrelated jitter.
    Más effective que equal jitter para spreadear retries.
    delay = min(cap, random.uniform(base, prev_delay * 3))"""

    def __init__(self, max_retries=5, base_delay=1.0, cap=60.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.cap = cap

    def retry(self, fn, *args, **kwargs):
        last_exception = None
        delay = self.base_delay

        for attempt in range(self.max_retries + 1):
            try:
                return fn(*args, **kwargs)
            except Exception as e:
                last_exception = e
                if attempt == self.max_retries:
                    break

                # Decorrelated jitter
                delay = min(self.cap, random.uniform(self.base_delay, delay * 3))
                print(f"Attempt {attempt + 1} failed: {e}. "
                      f"Retrying in {delay:.2f}s...")
                time.sleep(delay)

        raise last_exception
```


- [Bulkhead Pattern: Isolate Resources to Limit Blast Radius](/es/patterns/bulkhead-pattern/)
- [Circuit Breaker Half-Open](/es/patterns/circuit-breaker-half-open-pattern/)
- [Fallover: Switch to Standby on Primary Failure Detection](/es/patterns/fallover-pattern/)
- [Graceful Shutdown: Drain In-Flight Requests Before Exit](/es/patterns/graceful-shutdown-pattern/)
- [Token Bucket Rate Limiter: Smooth Traffic with Token Buckets](/es/patterns/rate-limiter-token-bucket-pattern/)

### Java retry con resilience4j

```java
// RetryConfig.java — Java retry con resilience4j
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.core.IntervalFunction;
import java.time.Duration;

public class ServiceRetry {

    private final Retry retry;

    public ServiceRetry() {
        // Exponential backoff con jitter
        IntervalFunction intervalFn = IntervalFunction
            .ofExponentialRandomBackoff(
                Duration.ofSeconds(1),  // initial interval
                2.0,                     // multiplier
                0.5,                     // randomization factor
                Duration.ofSeconds(60)   // max interval
            );

        RetryConfig config = RetryConfig.custom()
            .maxAttempts(5)
            .intervalFunction(intervalFn)
            .retryOnException(e -> isRetryable(e))
            .retryOnResult(result ->
                result instanceof HttpResponse &&
                ((HttpResponse) result).statusCode() >= 500
            )
            .build();

        this.retry = Retry.of("apiCall", config);
    }

    private boolean isRetryable(Throwable e) {
        if (e instanceof java.net.SocketTimeoutException) return true;
        if (e instanceof java.net.ConnectException) return true;
        if (e instanceof HttpException) {
            return ((HttpException) e).statusCode() >= 500;
        }
        return false;
    }

    public String callApi(String endpoint) {
        return Retry.decorateSupplier(retry, () -> {
            var response = httpClient.send(
                HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .build(),
                HttpResponse.BodyHandlers.ofString()
            );
            if (response.statusCode() >= 500) {
                throw new HttpException("Server error: " + response.statusCode());
            }
            return response.body();
        }).get();
    }
}
```

### Retry con circuit breaker (Python)

```python
# retry/with_circuit_breaker.py — Retry combinado con circuit breaker
import random
import time
import threading

class RetryWithCircuitBreaker:
    """Retry solo si el circuit breaker está closed.
    Si el service está consistentemente failing, pará de retryar entirely."""

    def __init__(self, max_retries=3, base_delay=1.0, max_delay=30.0,
                 failure_threshold=10, recovery_timeout=60):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self._failures = 0
        self._circuit_open = False
        self._last_failure_time = 0
        self._lock = threading.Lock()

    def _check_circuit(self):
        with self._lock:
            if self._circuit_open:
                if time.time() - self._last_failure_time > self.recovery_timeout:
                    self._circuit_open = False
                    self._failures = 0
                    print("Circuit breaker: attempting recovery")
                else:
                    raise CircuitBreakerOpenError("Circuit is open — service unavailable")

    def _record_failure(self):
        with self._lock:
            self._failures += 1
            self._last_failure_time = time.time()
            if self._failures >= self.failure_threshold:
                self._circuit_open = True
                print(f"Circuit breaker opened after {self._failures} failures")

    def _record_success(self):
        with self._lock:
            self._failures = 0
            self._circuit_open = False

    def retry(self, fn, *args, **kwargs):
        self._check_circuit()

        last_exception = None
        for attempt in range(self.max_retries + 1):
            try:
                result = fn(*args, **kwargs)
                self._record_success()
                return result
            except Exception as e:
                last_exception = e
                self._record_failure()
                if attempt == self.max_retries:
                    break

                delay = min(self.base_delay * (2 ** attempt), self.max_delay)
                jitter = random.uniform(0, delay)
                print(f"Attempt {attempt + 1} failed: {e}. "
                      f"Retrying in {jitter:.2f}s...")
                time.sleep(jitter)

        raise last_exception


class CircuitBreakerOpenError(Exception):
    pass
```

### Retry budget (Python)

```python
# retry/retry_budget.py — Limitá total retries para prevenir retry storms
import time
from collections import deque

class RetryBudget:
    """Limiteéa el rate de retries across todas las operations.
    Previene retry storms de overwhelming un recovering service."""

    def __init__(self, budget_percentage=0.2, window_seconds=10):
        self.budget_percentage = budget_percentage
        self.window = window_seconds
        self._total_requests = deque()
        self._total_retries = deque()

    def _prune(self, now):
        cutoff = now - self.window
        while self._total_requests and self._total_requests[0][0] < cutoff:
            self._total_requests.popleft()
        while self._total_retries and self._total_retries[0][0] < cutoff:
            self._total_retries.popleft()

    def can_retry(self):
        """Checkeá si estamos dentro del retry budget."""
        now = time.time()
        self._prune(now)

        total_req = len(self._total_requests)
        total_ret = len(self._total_retries)

        if total_req == 0:
            return True

        retry_ratio = total_ret / total_req
        return retry_ratio < self.budget_percentage

    def record_request(self):
        self._total_requests.append((time.time(),))

    def record_retry(self):
        self._total_retries.append((time.time(),))


# Usage
budget = RetryBudget(budget_percentage=0.2, window_seconds=10)

def call_with_budget(fn, *args, **kwargs):
    budget.record_request()
    for attempt in range(5):
        try:
            return fn(*args, **kwargs)
        except Exception:
            if attempt == 4 or not budget.can_retry():
                raise
            budget.record_retry()
            time.sleep(2 ** attempt)
```

### Async retry (JavaScript)

```javascript
// retry/async-retry.js — Async retry con jitter para Node.js
const { setTimeout: sleep } = require("timers/promises");

class AsyncRetryWithJitter {
    constructor(maxRetries = 5, baseDelay = 1000, maxDelay = 60000) {
        this.maxRetries = maxRetries;
        this.baseDelay = baseDelay;
        this.maxDelay = maxDelay;
    }

    fullJitter(attempt) {
        const ceiling = Math.min(this.baseDelay * Math.pow(2, attempt), this.maxDelay);
        return Math.random() * ceiling;
    }

    async retry(fn, ...args) {
        let lastError;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                return await fn(...args);
            } catch (error) {
                lastError = error;
                if (attempt === this.maxRetries) break;

                const delay = this.fullJitter(attempt);
                console.error(`Attempt ${attempt + 1} failed: ${error.message}. ` +
                              `Retrying in ${(delay / 1000).toFixed(2)}s...`);
                await sleep(delay);
            }
        }
        throw lastError;
    }
}

// Usage
const retry = new AsyncRetryWithJitter(5, 1000, 60000);

async function fetchWithRetry(url) {
    return retry.retry(async () => {
        const response = await fetch(url);
        if (response.status >= 500) {
            throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
    }, url);
}
```

## Variants

### Retry con deadline

```python
# retry/with_deadline.py — Retry con overall deadline
import time
import random

class RetryWithDeadline:
    """Retryéa hasta que un overall deadline expire.
    Previene indefinite retrying cuando el deadline es strict."""

    def __init__(self, max_retries=5, base_delay=1.0, deadline=30.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.deadline = deadline

    def retry(self, fn, *args, **kwargs):
        start = time.time()
        last_exception = None

        for attempt in range(self.max_retries):
            try:
                return fn(*args, **kwargs)
            except Exception as e:
                last_exception = e
                elapsed = time.time() - start
                if elapsed >= self.deadline:
                    print(f"Deadline exceeded after {elapsed:.1f}s")
                    break

                delay = random.uniform(0, min(self.base_delay * 2 ** attempt,
                                              self.deadline - elapsed))
                time.sleep(delay)

        raise last_exception
```

### Conditional retry (solo retryable errors)

```python
# retry/conditional.py — Solo retryá specific error types
import time
import random

class ConditionalRetry:
    """Retryéa solo en specific, retryable exceptions.
    Non-retryable errors falleán immediately."""

    RETRYABLE_EXCEPTIONS = (
        ConnectionError,
        TimeoutError,
    )
    RETRYABLE_STATUS_CODES = {502, 503, 504, 429}

    def __init__(self, max_retries=5, base_delay=1.0):
        self.max_retries = max_retries
        self.base_delay = base_delay

    def is_retryable(self, exception):
        if isinstance(exception, self.RETRYABLE_EXCEPTIONS):
            return True
        if hasattr(exception, "status_code"):
            return exception.status_code in self.RETRYABLE_STATUS_CODES
        return False

    def retry(self, fn, *args, **kwargs):
        for attempt in range(self.max_retries + 1):
            try:
                return fn(*args, **kwargs)
            except Exception as e:
                if not self.is_retryable(e) or attempt == self.max_retries:
                    raise

                delay = random.uniform(0, self.base_delay * 2 ** attempt)
                print(f"Retryable error: {e}. Retrying in {delay:.2f}s...")
                time.sleep(delay)
```

## Best Practices

- Siempre usá jitter — sin él, retries synchronize y crean thundering herds
- Usá full jitter para simplicity, decorrelated jitter para better distribution
- Seteá un max delay cap — exponential backoff sin cap puede waitear hours
- Solo retryá idempotent operations — GET, PUT, DELETE son safe; POST necesita idempotency keys
- Usá retry budgets — limitá total retries para prevenir retry storms
- Combiná con circuit breakers — pará de retryar cuando el service está down
- Seteá per-attempt timeouts — un single attempt no debería hangear indefinitely
- Logeá retry attempts — trackeá retry rate para detectar chronic issues

## Common Mistakes

- **No jitter**: todos los clients retryéan al mismo time, overwhelming el recovering service.
- **Retryando non-idempotent operations**: retryando POST crea duplicate resources.
- **No max delay cap**: exponential backoff reachéa hours, excediendo cualquier reasonable deadline.
- **Retryando 4xx errors**: client errors (400, 401, 403, 404) no van a succeed en retry.
- **No retry budget**: cada failure triggerea retries, multiplicando load durante outages.

## FAQ

### ¿Qué es jitter en retry?

Random variation agregada al retry delay. En vez de todos los clients retryando en exactamente 1s, 2s, 4s, retryéan en random intervals dentro de ese range. Esto spreadéa el load over time y previene thundering herd problems.

### ¿Qué es full jitter vs equal jitter?

Full jitter: `delay = random(0, base * 2^attempt)`. Equal jitter: `delay = base * 2^attempt / 2 + random(0, base * 2^attempt / 2)`. Full jitter provee más spread; equal jitter avoidéa very short delays. AWS recomienda decorrelated jitter para best results.

### ¿Cuándo no debería retryar?

No retryéees en client errors (4xx), en non-idempotent operations sin dedup keys, o cuando el deadline es too short para otro attempt. No retryéees si el circuit breaker está open — el service está known que está down.

### ¿Qué es un retry budget?

Un limit en el total number de retries dentro de un time window. Si 20% de requests son retries, pará de retryar hasta que el ratio baje. Esto previene retry storms durante outages donde cada request triggerea 5 retries.

### ¿Cuántos retries debería hacer?

Típicamente 3-5 para transient failures. Más retries aumentan el total wait time y load en el downstream service. Combiná con exponential backoff y un max delay cap para que 5 retries tomen 30-60 seconds, no hours.
