---



contentType: recipes
slug: javascript-fetch-retry-logic
title: "JavaScript Fetch Retry Logic with Exponential Backoff"
description: "Retry failed HTTP requests in JavaScript with exponential backoff"
metaDescription: "Retry failed fetch requests with exponential backoff, jitter, AbortController timeout, and circuit breaker in JavaScript."
difficulty: intermediate
topics:
  - api
tags:
  - javascript
  - fetch
  - retry
  - exponential-backoff
  - error-handling
  - http
relatedResources:
  - /recipes/retry-backoff
  - /recipes/retry-logic-exponential-backoff
  - /recipes/nodejs-websocket-realtime
  - /guides/rest-api-design-guide
  - /patterns/circuit-breaker-pattern
  - /recipes/python-async-http-requests
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Retry failed fetch requests with exponential backoff, jitter, AbortController timeout, and circuit breaker in JavaScript."
  keywords:
    - javascript fetch retry
    - exponential backoff javascript
    - retry failed requests js
    - fetch abortcontroller timeout
    - javascript http retry
    - fetch error handling



---

## Overview

Network requests fail for many reasons: timeouts, server errors, rate limiting, or temporary connectivity loss. Retrying with exponential backoff gives transient failures time to resolve without overwhelming the server. Below is a practical approach to a fetch retry wrapper, jitter to avoid thundering herd, timeout with AbortController, and a simple circuit breaker.

## When to Use


- For alternatives, see [Handle Errors in APIs](/recipes/handle-errors/).

- You call external APIs that occasionally return 5xx or time out
- You need resilient HTTP requests in browser or Node.js
- You want automatic retry without adding a heavy dependency
- You need to handle rate-limited responses (429) with Retry-After headers

## Solution

### Basic retry with exponential backoff

```javascript
async function fetchWithRetry(url, options = {}, retries = 3, baseDelay = 1000) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, options);

            if (response.ok) {
                return response;
            }

            if (response.status >= 500 && attempt < retries) {
                const delay = baseDelay * Math.pow(2, attempt);
                await sleep(delay);
                continue;
            }

            return response;
        } catch (err) {
            if (attempt < retries) {
                const delay = baseDelay * Math.pow(2, attempt);
                await sleep(delay);
                continue;
            }
            throw err;
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Usage
const res = await fetchWithRetry("https://api.example.com/data");
const data = await res.json();
```

### Retry with jitter and timeout

```javascript
async function fetchWithRetry(url, options = {}, config = {}) {
    const {
        retries = 3,
        baseDelay = 1000,
        maxDelay = 30000,
        timeoutMs = 10000
    } = config;

    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                ...options,
                signal: options.signal || controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                return response;
            }

            if (response.status === 429) {
                const retryAfter = parseInt(response.headers.get("Retry-After") || "0", 10);
                if (attempt < retries) {
                    const wait = retryAfter > 0 ? retryAfter * 1000 : getDelay(attempt, baseDelay, maxDelay);
                    await sleep(wait);
                    continue;
                }
            }

            if (response.status >= 500 && attempt < retries) {
                await sleep(getDelay(attempt, baseDelay, maxDelay));
                continue;
            }

            return response;
        } catch (err) {
            clearTimeout(timeoutId);

            if (attempt < retries) {
                await sleep(getDelay(attempt, baseDelay, maxDelay));
                continue;
            }

            throw err;
        }
    }
}

function getDelay(attempt, baseDelay, maxDelay) {
    const exponential = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * baseDelay;
    return Math.min(exponential + jitter, maxDelay);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Retry wrapper class with circuit breaker

```javascript
class CircuitBreaker {
    constructor(threshold = 5, resetTimeout = 60000) {
        this.threshold = threshold;
        this.resetTimeout = resetTimeout;
        this.failures = 0;
        this.lastFailureTime = null;
        this.state = "closed";
    }

    recordFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= this.threshold) {
            this.state = "open";
        }
    }

    recordSuccess() {
        this.failures = 0;
        this.state = "closed";
    }

    canExecute() {
        if (this.state === "open") {
            const elapsed = Date.now() - this.lastFailureTime;
            if (elapsed > this.resetTimeout) {
                this.state = "half-open";
                return true;
            }
            return false;
        }
        return true;
    }
}

class FetchWithRetry {
    constructor(config = {}) {
        this.retries = config.retries ?? 3;
        this.baseDelay = config.baseDelay ?? 1000;
        this.maxDelay = config.maxDelay ?? 30000;
        this.timeoutMs = config.timeoutMs ?? 10000;
        this.breaker = new CircuitBreaker(
            config.breakerThreshold ?? 5,
            config.breakerResetTimeout ?? 60000
        );
    }

    async request(url, options = {}) {
        if (!this.breaker.canExecute()) {
            throw new Error("Circuit breaker is open — requests temporarily blocked");
        }

        for (let attempt = 0; attempt <= this.retries; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

            try {
                const response = await fetch(url, {
                    ...options,
                    signal: options.signal || controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    this.breaker.recordSuccess();
                    return response;
                }

                if (this.shouldRetry(response.status) && attempt < this.retries) {
                    this.breaker.recordFailure();
                    await this.delay(attempt);
                    continue;
                }

                this.breaker.recordFailure();
                return response;
            } catch (err) {
                clearTimeout(timeoutId);
                this.breaker.recordFailure();

                if (attempt < this.retries) {
                    await this.delay(attempt);
                    continue;
                }
                throw err;
            }
        }
    }

    shouldRetry(status) {
        return status >= 500 || status === 429;
    }

    delay(attempt) {
        const exponential = this.baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * this.baseDelay;
        const ms = Math.min(exponential + jitter, this.maxDelay);
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

const client = new FetchWithRetry({
    retries: 4,
    baseDelay: 500,
    timeoutMs: 8000,
    breakerThreshold: 5,
    breakerResetTimeout: 30000
});

const res = await client.request("https://api.example.com/users");
const data = await res.json();
```

### Retry with custom retry condition and callbacks

```javascript
async function fetchRetry(url, options = {}, config = {}) {
    const {
        retries = 3,
        delay = 1000,
        retryOn = (response) => response.status >= 500,
        onRetry = (attempt, error) => console.log(`Retry ${attempt}: ${error?.message}`)
    } = config;

    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, options);

            if (response.ok || !retryOn(response)) {
                return response;
            }

            lastError = new Error(`HTTP ${response.status}`);

            if (attempt < retries) {
                onRetry(attempt + 1, lastError);
                await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt)));
            }
        } catch (err) {
            lastError = err;

            if (attempt < retries) {
                onRetry(attempt + 1, err);
                await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt)));
                continue;
            }
        }
    }

    throw lastError;
}

// Usage: retry only on 503
const res = await fetchRetry(
    "https://api.example.com/data",
    { method: "GET" },
    {
        retries: 5,
        delay: 500,
        retryOn: (res) => res.status === 503,
        onRetry: (n, err) => console.warn(`Attempt ${n} failed: ${err.message}`)
    }
);
```

## Explanation

The retry pattern works by catching transient failures and re-attempting the request after a delay:

- **Exponential backoff**: Each retry waits longer than the previous one. `delay = baseDelay * 2^attempt`. This gives the server time to recover without overwhelming it.
- **Jitter**: Adding randomness (`Math.random() * baseDelay`) prevents the thundering herd problem where many clients retry simultaneously.
- **AbortController timeout**: Creates a deadline for each request. If the server does not respond within `timeoutMs`, the request is aborted and retried.
- **Circuit breaker**: Tracks consecutive failures. After `threshold` failures, it opens and blocks all requests for `resetTimeout` milliseconds. This prevents cascading failures when a downstream service is down.
- **Retry-After header**: When a server returns 429 (Too Many Requests), it may include a `Retry-After` header indicating how long to wait. Respecting this header is better than using exponential backoff.
- **Idempotency**: Only retry safe methods (GET, HEAD, PUT, DELETE). Retrying POST can create duplicate resources.

## Variants

| Approach | Complexity | Features | Use When |
|----------|-----------|----------|----------|
| Basic retry | Low | Exponential backoff | Simple scripts, few endpoints |
| Jitter + timeout | Medium | Random delay, AbortController | Production browser apps |
| Circuit breaker class | High | State tracking, auto-recovery | Critical API dependencies |
| Custom retry condition | Medium | Per-response retry logic | Selective retry (e.g., only 503) |

## Guidelines

- Only retry idempotent methods (GET, PUT, DELETE). POST may create duplicates.
- Always use a maximum retry count. Infinite retries can hang your application.
- Respect the `Retry-After` header when present on 429 responses.
- Add jitter to prevent synchronized retry storms.
- Use AbortController for timeouts. Default fetch has no timeout.
- Log retry attempts for debugging intermittent issues.
- Set a max delay cap to avoid excessively long waits.
- Combine with a circuit breaker for critical downstream services.

## Common Mistakes

- Retrying POST requests. This can create duplicate orders, payments, or registrations.
- Not using a timeout. A hanging server will block all retries indefinitely.
- Retrying 4xx errors. These are client errors (bad request, unauthorized) that will not succeed on retry.
- Using fixed delays without backoff. Retrying every 1 second puts constant load on a struggling server.
- Not adding jitter. When many clients retry at the same time, the server gets overwhelmed again.
- Forgetting to clear the timeout on success. This causes memory leaks and false aborts.

## Frequently Asked Questions

### Should I retry 4xx errors?

No. 4xx errors (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found) are client errors. Retrying the same request will produce the same result. Only retry 5xx server errors and 429 rate limit responses.

### How do I test retry logic?

Use a mock server that returns failures for the first N requests, then succeeds. Libraries like MSW (Mock Service Worker) or nock can simulate this. Test that retries happen, delays are applied, and the circuit breaker opens after threshold failures.

### What is the difference between exponential backoff and linear backoff?

Exponential backoff doubles the delay each time (1s, 2s, 4s, 8s). Linear backoff adds a fixed amount (1s, 2s, 3s, 4s). Exponential is better for transient failures because it backs off faster, reducing load on the server.

### Can I use this with axios instead of fetch?

Yes. Replace `fetch()` with `axios()` and check `error.response.status` instead of `response.status`. Axios throws on non-2xx by default, so you handle errors in the catch block instead of checking `response.ok`.
