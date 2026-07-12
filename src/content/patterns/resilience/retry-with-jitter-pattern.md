---

contentType: patterns
slug: retry-with-jitter-pattern
title: "Retry with Jitter: Exponential Backoff and Random Jitter"
description: "How to retry failed operations with exponential backoff and random jitter. Covers full jitter, equal jitter, decorrelated jitter, retry budgets, and idempotency."
metaDescription: "Retry failed operations with exponential backoff and random jitter. Learn full jitter, equal jitter, decorrelated jitter, retry budgets, and idempotency requirements."
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
  metaDescription: "Retry failed operations with exponential backoff and random jitter. Learn full jitter, equal jitter, decorrelated jitter, retry budgets, and idempotency requirements."
  keywords:
    - architecture
    - resilience
    - retry
    - backoff
    - pattern

---

## Overview

The retry with jitter pattern retries failed operations with exponentially increasing delays plus random jitter. Without jitter, all clients retry at the same intervals, creating synchronized retry storms that overwhelm the recovering service. Jitter spreads retry attempts across time, smoothing the load. The pattern combines exponential backoff (delay doubles each retry) with random jitter (delay varies randomly within a range). This prevents thundering herd problems and gives the downstream service time to recover between waves of retries.

## When to Use

- Transient failures: network timeouts, 503 responses, connection resets
- Cloud API calls that occasionally fail due to rate limiting
- Database connection drops that recover within seconds
- Message queue operations that temporarily fail
- Any operation where the failure is likely temporary

## When NOT to Use

- Non-idempotent operations (POST that creates resources) without a dedup key
- Permanent failures (400 Bad Request, 404 Not Found) — retrying won't help
- Real-time systems where retry latency exceeds the SLA
- Operations where the side effect is not reversible

## Solution

### Basic exponential backoff with jitter (Python)

```python
# retry/exponential_backoff.py — Exponential backoff with full jitter
import random
import time
from functools import wraps

class RetryWithJitter:
    """Retry with exponential backoff and jitter.
    Full jitter: delay = random.uniform(0, base * 2^attempt)"""

    def __init__(self, max_retries=5, base_delay=1.0, max_delay=60.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay

    def full_jitter(self, attempt):
        """Full jitter: random between 0 and exponential backoff."""
        ceiling = min(self.base_delay * (2 ** attempt), self.max_delay)
        return random.uniform(0, ceiling)

    def equal_jitter(self, attempt):
        """Equal jitter: half fixed, half random."""
        ceiling = min(self.base_delay * (2 ** attempt), self.max_delay)
        return ceiling / 2 + random.uniform(0, ceiling / 2)

    def decorrelated_jitter(self, prev_delay):
        """Decorrelated jitter: based on previous delay, not attempt count."""
        ceiling = min(self.base_delay * 3, self.max_delay)
        return random.uniform(self.base_delay, prev_delay * 3)

    def retry(self, fn, *args, **kwargs):
        """Execute fn with retry. Raises last exception if all retries fail."""
        last_exception = None
        prev_delay = self.base_delay

        for attempt in range(self.max_retries + 1):
            try:
                return fn(*args, **kwargs)
            except Exception as e:
                last_exception = e
                if attempt == self.max_retries:
                    break

                # Calculate delay with full jitter
                delay = self.full_jitter(attempt)
                print(f"Attempt {attempt + 1} failed: {e}. "
                      f"Retrying in {delay:.2f}s...")
                time.sleep(delay)

        raise last_exception

    def __call__(self, fn):
        """Decorator that wraps a function with retry logic."""
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
    More effective than equal jitter at spreading retries.
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


- [Bulkhead Pattern: Isolate Resources to Limit Blast Radius](/patterns/bulkhead-pattern/)
- [Circuit Breaker Half-Open](/patterns/circuit-breaker-half-open-pattern/)
- [Fallover: Switch to Standby on Primary Failure Detection](/patterns/fallover-pattern/)
- [Graceful Shutdown: Drain In-Flight Requests Before Exit](/patterns/graceful-shutdown-pattern/)
- [Token Bucket Rate Limiter: Smooth Traffic with Token Buckets](/patterns/rate-limiter-token-bucket-pattern/)

### Java retry with resilience4j

```java
// RetryConfig.java — Java retry with resilience4j
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.core.IntervalFunction;
import java.time.Duration;

public class ServiceRetry {

    private final Retry retry;

    public ServiceRetry() {
        // Exponential backoff with jitter
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

### Retry with circuit breaker (Python)

```python
# retry/with_circuit_breaker.py — Retry combined with circuit breaker
import random
import time
import threading

class RetryWithCircuitBreaker:
    """Retry only if the circuit breaker is closed.
    If the service is consistently failing, stop retrying entirely."""

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
# retry/retry_budget.py — Limit total retries to prevent retry storms
import time
from collections import deque

class RetryBudget:
    """Limits the rate of retries across all operations.
    Prevents retry storms from overwhelming a recovering service."""

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
        """Check if we're within the retry budget."""
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
// retry/async-retry.js — Async retry with jitter for Node.js
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

### Retry with deadline

```python
# retry/with_deadline.py — Retry with overall deadline
import time
import random

class RetryWithDeadline:
    """Retries until an overall deadline expires.
    Prevents indefinite retrying when the deadline is strict."""

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

### Conditional retry (only retryable errors)

```python
# retry/conditional.py — Only retry specific error types
import time
import random

class ConditionalRetry:
    """Retries only on specific, retryable exceptions.
    Non-retryable errors fail immediately."""

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

- Always use jitter — without it, retries synchronize and create thundering herds
- Use full jitter for simplicity, decorrelated jitter for better distribution
- Set a max delay cap — exponential backoff without a cap can wait hours
- Only retry idempotent operations — GET, PUT, DELETE are safe; POST needs idempotency keys
- Use retry budgets — limit total retries to prevent retry storms
- Combine with circuit breakers — stop retrying when the service is down
- Set per-attempt timeouts — a single attempt shouldn't hang indefinitely
- Log retry attempts — track retry rate to detect chronic issues

## Common Mistakes

- **No jitter**: all clients retry at the same time, overwhelming the recovering service.
- **Retrying non-idempotent operations**: retrying POST creates duplicate resources.
- **No max delay cap**: exponential backoff reaches hours, exceeding any reasonable deadline.
- **Retrying 4xx errors**: client errors (400, 401, 403, 404) won't succeed on retry.
- **No retry budget**: every failure triggers retries, multiplying load during outages.

## FAQ

### What is jitter in retry?

Random variation added to the retry delay. Instead of all clients retrying at exactly 1s, 2s, 4s, they retry at random intervals within that range. This spreads the load over time and prevents thundering herd problems.

### What is full jitter vs equal jitter?

Full jitter: `delay = random(0, base * 2^attempt)`. Equal jitter: `delay = base * 2^attempt / 2 + random(0, base * 2^attempt / 2)`. Full jitter provides more spread; equal jitter avoids very short delays. AWS recommends decorrelated jitter for best results.

### When should I not retry?

Don't retry on client errors (4xx), on non-idempotent operations without dedup keys, or when the deadline is too short for another attempt. Don't retry if the circuit breaker is open — the service is known to be down.

### What is a retry budget?

A limit on the total number of retries within a time window. If 20% of requests are retries, stop retrying until the ratio drops. This prevents retry storms during outages where every request triggers 5 retries.

### How many retries should I do?

Typically 3-5 for transient failures. More retries increase the total wait time and load on the downstream service. Combine with exponential backoff and a max delay cap so 5 retries take 30-60 seconds, not hours.
