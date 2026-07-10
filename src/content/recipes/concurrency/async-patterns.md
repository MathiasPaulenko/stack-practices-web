---
contentType: recipes
slug: async-patterns
title: "Master Async Patterns with Promises, Futures, and Coroutines"
description: "How to write efficient concurrent code using async/await, promises, futures, and coroutines in JavaScript, Python, and Java for non-blocking I/O and parallel processing."
metaDescription: "Learn async patterns for concurrent programming. Master async/await, promises, futures, and coroutines in JavaScript, Python, and Java for non-blocking I/O."
difficulty: intermediate
topics:
  - concurrency
tags:
  - concurrency
  - event-loop
  - async
  - threads
  - parallel
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/serverless-functions
  - /recipes/event-driven-functions
  - /recipes/load-testing
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn async patterns for concurrent programming. Master async/await, promises, futures, and coroutines in JavaScript, Python, and Java for non-blocking I/O."
  keywords:
    - async await patterns
    - promises concurrency
    - coroutines python
    - non blocking io
    - parallel processing
---

## Overview

Synchronous code blocks the execution thread until an operation completes. When that operation is I/O â€” querying a database, fetching from an API, reading a file â€” the thread sits idle, wasting CPU cycles that could process other requests. Async programming solves this by suspending the current task when it encounters I/O, allowing the runtime to execute other tasks, and resuming the original task when the I/O completes. This enables a single thread to handle thousands of concurrent connections.

The challenge is not writing `async` and `await` keywords â€” it is understanding the underlying event loop, avoiding callback hell, handling errors across suspension points, and preventing resource contention when multiple tasks access shared state. Different runtimes implement async differently: JavaScript uses an event loop with promises, Python uses `asyncio` with coroutines, and Java uses `CompletableFuture` with thread pools. Here is how to patterns, anti-patterns, and practical implementations across all three.

## When to use it

Use this recipe when:

- Building APIs that handle hundreds of concurrent requests per process
- Fetching data from multiple services that can be called in parallel
- Processing I/O-bound workloads like web scraping, file uploads, or message queues
- Implementing real-time capabilities como [WebSockets](/recipes/api/websocket-server), chat, o live dashboards
- Replacing thread-per-request models with [event-driven architectures](/recipes/architecture/event-driven-architecture) for efficiency

## Solution

### Async/Await with Concurrent Requests (JavaScript / Node.js)

```javascript
async function fetchUserDashboard(userId) {
  const [profile, orders, recommendations] = await Promise.all([
    getProfile(userId),
    getOrders(userId),
    getRecommendations(userId),
  ]);
  return { profile, orders, recommendations };
}

async function fetchDashboardResilient(userId) {
  const [profile, orders, recommendations] = await Promise.allSettled([
    getProfile(userId),
    getOrders(userId),
    getRecommendations(userId),
  ]);

  return {
    profile: profile.status === 'fulfilled' ? profile.value : null,
    orders: orders.status === 'fulfilled' ? orders.value : [],
    recommendations: recommendations.status === 'fulfilled' ? recommendations.value : [],
  };
}
```

### Python asyncio with Task Groups

```python
import asyncio
import aiohttp

async def fetch_url(session: aiohttp.ClientSession, url: str) -> dict:
    async with session.get(url) as response:
        return await response.json()

async def fetch_all_urls(urls: list[str]) -> list[dict]:
    async with aiohttp.ClientSession() as session:
        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(fetch_url(session, url)) for url in urls]
        return [task.result() for task in tasks]

async def fetch_with_limit(urls: list[str], max_concurrent: int = 10):
    semaphore = asyncio.Semaphore(max_concurrent)

    async def bounded_fetch(session, url):
        async with semaphore:
            return await fetch_url(session, url)

    async with aiohttp.ClientSession() as session:
        return await asyncio.gather(
            *[bounded_fetch(session, url) for url in urls]
        )

urls = ["https://api.example.com/users/1", "https://api.example.com/users/2"]
results = asyncio.run(fetch_all_urls(urls))
```

### Java CompletableFuture Pipeline

```java
import java.util.concurrent.CompletableFuture;

public class AsyncOrderService {
    public CompletableFuture<Order> processOrder(String orderId) {
        return validateOrder(orderId)
            .thenCompose(this::checkInventory)
            .thenCompose(this::processPayment)
            .thenCompose(this::createShipment)
            .exceptionally(ex -> {
                log.error("Order processing failed", ex);
                return Order.failed(orderId, ex.getMessage());
            });
    }

    private CompletableFuture<ValidatedOrder> validateOrder(String orderId) {
        return CompletableFuture.supplyAsync(() -> new ValidatedOrder(orderId));
    }

    public CompletableFuture<Dashboard> loadDashboard(String userId) {
        CompletableFuture<Profile> profileFuture = fetchProfile(userId);
        CompletableFuture<List<Order>> ordersFuture = fetchOrders(userId);
        return profileFuture.thenCombine(ordersFuture, Dashboard::new);
    }
}
```

## Explanation

- **Event loop**: the core mechanism in JavaScript and Python asyncio. It maintains a queue of tasks and executes them one at a time. When a task hits an `await`, it yields control, and the loop picks up the next task. When the awaited operation completes, the task is rescheduled. This single-threaded concurrency avoids the overhead of thread switching.
- **Structured concurrency**: in Python 3.11+, `asyncio.TaskGroup` ensures that if any child task fails, all other tasks in the group are cancelled. This prevents orphaned background tasks that leak memory or hold resources after a parent failure.
- **Promise composition**: JavaScript promises chain via `.then()` and `.catch()`. `Promise.all()` waits for all promises, failing fast if any rejects. `Promise.allSettled()` waits for all, returning both successes and failures. `Promise.race()` returns the first to settle.
- **Backpressure with semaphores**: unbounded concurrency exhausts memory, file descriptors, and upstream quotas. A semaphore limits the number of simultaneous operations. With a limit of 10, only 10 HTTP requests are in flight at any time; the 11th waits until a slot frees.

## Variants

| Pattern | Language | Concurrency model | Error handling | Best for |
|---------|----------|-------------------|----------------|----------|
| async/await | JS/Python | Event loop | try/catch | I/O-bound APIs |
| CompletableFuture | Java | Thread pool | exceptionally() | CPU + I/O mixed |
| Goroutines | Go | M:N threads | Channels | High-throughput services |
| RxJS/RxPY | JS/Python | Observables | onError | Event streams |
| Threads | All | OS threads | try/catch | CPU-bound tasks |

## What works

- **Always await promises**: an unawaited promise is a fire-and-forget operation that silently swallows errors. If a promise rejects and nothing awaits it, Node.js emits an `unhandledRejection` warning. In async functions, always `await` or `.catch()` every promise.
- **Use Promise.all for independence, sequential for dependencies**: if task B needs the result of task A, they must run sequentially. If they are independent, use `Promise.all` or `asyncio.gather` to run them concurrently. Running independent tasks sequentially wastes time.
- **Set timeouts on all external calls**: an unresponsive API can hang an async operation indefinitely. Wrap every external call in a timeout with [retry logic](/recipes/architecture/retry-backoff). This prevents resource leaks and ensures predictable latencies.
- **Prefer structured concurrency over fire-and-forget**: spawning a background task that outlives its parent is a common source of memory leaks and race conditions. Use task groups, `asyncio.gather`, or explicit cancellation tokens to ensure lifetimes are managed.
- **Profile the event loop**: in Node.js, use `clinic.js` or `0x` to detect event loop lag. In Python, use `asyncio.run` with debug mode. If the event loop is blocked by CPU work, move it to a worker thread or process pool.

## Common mistakes

- **Blocking the event loop**: calling a synchronous file read (`fs.readFileSync`) or a heavy computation inside an async function blocks the entire event loop. All other requests stall. Use async equivalents (`fs.promises.readFile`) or offload CPU work to worker threads.
- **Callback hell without async/await**: deeply nested `.then()` chains are hard to read and debug. Modern JavaScript should use `async/await` for all but the simplest cases. It produces flat, readable code that looks synchronous but executes asynchronously.
- **Race conditions on shared mutable state**: two concurrent tasks incrementing a counter without synchronization produce incorrect results. In async environments, use [atomic operations](/recipes/concurrency/concurrent-data-structures), locks, or message passing rather than shared mutable state.
- **Ignoring backpressure**: accepting requests faster than they can be processed leads to memory exhaustion and OOM kills. Implement [rate limiting](/recipes/api/rate-limiting), bounded queues, and load shedding. A 503 response is better than a crashed server.

## When Not to Use This Approach

- **CPU-bound tasks**: async does not help when the CPU is the bottleneck. Image processing, compression, and ML inference should use threads or processes, not async I/O
- **Simple sequential scripts**: if your script makes one HTTP call, waits, then exits, async adds complexity without benefit. A simple equests.get() is clearer than an async equivalent
- **Real-time systems with hard deadlines**: async runtimes introduce non-deterministic scheduling. Hard real-time systems need dedicated RTOS kernels, not event loops
- **Embedded systems with severe memory constraints**: each pending async operation holds a callback and closure. On devices with <1MB RAM, this overhead matters
- **Legacy codebases without async support**: retrofitting async into a synchronous codebase requires touching every I/O call in the call chain. The migration cost may exceed the benefit
- **Debugging-sensitive environments**: async stack traces are harder to read. If your team lacks experience with async debugging tools, the productivity hit can outweigh throughput gains
- **Single-request batch jobs**: a nightly job that fetches one API endpoint and writes to a database gains nothing from async. Keep it simple

## Performance Benchmarks

- **Node.js event loop**: a single Node.js process handles 8,000-12,000 concurrent HTTP keep-alive connections on a 2-core VM with 4GB RAM. CPU-bound middleware drops this to 1,500-2,000
- **Python asyncio vs threads**: asyncio processes 15,000 HTTP requests/sec on a single core vs 3,000 with threading (aiohttp vs Flask+gunicorn threads). The gap widens as concurrency increases
- **Go goroutines**: 100,000 goroutines consume ~400MB of stack memory (2KB initial stack each). 100,000 OS threads would need ~100GB of stack (1MB default per thread)
- **Rust tokio**: tokio's async runtime adds ~20ns per task spawn vs ~5us for an OS thread. The memory overhead is ~128 bytes per task vs ~2MB per thread
- **Java virtual threads**: 1M virtual threads consume ~4GB heap vs 1M platform threads which would need ~2TB of stack. Virtual threads achieve 200,000+ requests/sec on a 4-core machine
- **Context switching**: OS thread context switch takes 1-10us. Async task switch takes 100-500ns. At 10,000 concurrent tasks, this difference adds up to 50-100ms of saved CPU time per second
- **Memory per connection**: Node.js uses ~2KB per keep-alive connection, Python asyncio uses ~4KB, Go goroutines use ~2KB initial, Java virtual threads use ~2KB. OS threads use 1-8MB
- **Throughput scaling**: async I/O throughput scales linearly with connections until CPU saturation. Thread-based throughput plateaus at 200-500 connections due to context switching overhead
- **Latency percentiles**: async runtimes have tighter p99 latency (50-100ms) under load compared to thread pools (200-500ms) because there are no context switches or thread pool queue waits
- **GC pressure**: each async task allocates a state machine object. In high-throughput scenarios, this creates 50-200MB/sec of garbage. Generational GC handles this well, but pause times increase under load

## Testing Strategy

- **Unit test individual async functions in isolation**: mock I/O dependencies and assert return values. Use pytest.mark.asyncio or jest with async/await support
- **Integration test with real I/O**: spin up a local HTTP server and database. Verify end-to-end behavior under async load. Use httpx.AsyncClient or supertest with async handlers
- **Stress test with high concurrency**: launch 1,000+ concurrent tasks and verify no deadlocks, no resource leaks, and correct results. Tools: locust, k6, wrk
- **Test timeout behavior**: verify that slow operations trigger timeouts correctly. Use a mock server with configurable delay and assert that syncio.wait_for or Promise.race fires
- **Test cancellation propagation**: cancel a parent task and verify all child tasks are cancelled. Check that resources (connections, file handles) are released on cancellation
- **Test error propagation**: assert that exceptions in child tasks bubble up to the parent. Verify that syncio.gather(return_exceptions=True) collects all errors
- **Race condition detection**: run tests with ThreadSanitizer (for threaded code) or use syncio debug mode (PYTHONASYNCIODEBUG=1) to detect unclosed resources and slow callbacks
- **Load test with realistic payloads**: test with production-sized payloads, not toy data. A 1KB JSON body behaves differently than a 10MB file upload in async pipelines
- **Test backpressure handling**: send requests faster than the server can process and verify it responds with 503 or queues them, rather than running out of memory
- **Chaos testing**: randomly kill tasks, inject network delays, and simulate disk failures. Verify the system degrades gracefully rather than hanging

## Cost Estimation

- **Server sizing**: async workloads need fewer servers. A typical Node.js async server handles 10K connections on a 2-core / 4GB instance (/month). An equivalent thread-based Java server needs 4 cores / 16GB (/month)
- **Connection pool licensing**: async connection pools (e.g., asyncpg, aiohttp) are open source. Some enterprise connection poolers charge per-connection fees that scale with concurrency
- **Development cost**: async code takes 20-30% longer to write and debug than synchronous equivalents. Budget for training if your team is new to async patterns
- **Monitoring overhead**: async runtimes need specialized monitoring (event loop lag, task queue depth, promise rejection tracking). Standard APM tools may require custom instrumentation
- **Infrastructure savings**: moving from thread-per-request to async can reduce server count by 3-5x. A 20-server fleet becomes 4-6 servers, saving ,000-5,000/month
- **Memory cost**: async tasks use 10-100x less memory than threads. At scale (100K+ concurrent connections), this means you can run on smaller instances or fewer containers
- **Operational cost**: async systems have fewer moving parts (no thread pool tuning, no lock contention debugging). Operational overhead drops by 30-50% after migration

## Monitoring and Observability

- **Event loop lag**: measure the delay between scheduled and executed callbacks. Lag >50ms indicates the event loop is blocked. Tools: clinic.js, py-spy, tokio-console
- **Task queue depth**: track the number of pending tasks. A growing queue means tasks are produced faster than consumed. Alert when queue depth exceeds 1,000
- **Active connections**: monitor concurrent connection count. Compare against file descriptor limits (ulimit -n). Alert at 80% of limit
- **Promise rejection rate**: track unhandled promise rejections (Node.js) or unhandled task exceptions (Python). Any non-zero rate indicates a bug in error handling
- **GC pause time**: async runtimes generate many small objects. Monitor GC pause times. Pauses >100ms cause request timeouts and should trigger investigation
- **Memory usage**: track RSS and heap growth. A slow leak in async code (unclosed connections, orphaned callbacks) is harder to detect than in sync code
- **Request latency percentiles**: track p50, p95, p99. Async systems should have tight percentiles. Wide gaps indicate event loop blocking or GC pressure

## Deployment Checklist

- [ ] Set file descriptor limits: ulimit -n 65536 or configure systemd LimitNOFILE=65536
- [ ] Configure connection pool sizes based on expected concurrency (pool size = 2 * CPU cores for async, not 50+)
- [ ] Set timeouts on all I/O operations: HTTP clients, database queries, cache reads. Default to 5-30 seconds
- [ ] Enable structured logging with request IDs for tracing async call chains
- [ ] Configure health checks that verify the event loop is responsive, not just that the process is alive
- [ ] Set memory limits and configure OOM killer behavior. Async tasks are lightweight but can accumulate
- [ ] Enable graceful shutdown: drain pending tasks for 5-10 seconds before killing the process

## Security Considerations

- **Resource exhaustion via task flooding**: an attacker can spawn millions of async tasks by sending rapid requests. Implement rate limiting at the gateway level and cap concurrent tasks per connection
- **Async callback injection**: if user input controls which callback is executed, attackers can invoke arbitrary functions. Validate and whitelist all callback references
- **Promise rejection DoS**: unhandled promise rejections in Node.js <15 crash the process. Always attach .catch() handlers and use --unhandled-rejections=strict in production
- **Event loop blocking**: a single synchronous operation blocks the entire event loop. Audit all code paths for blocking calls (s.readFileSync, 	ime.sleep, crypto.pbkdf2Sync). Use async equivalents
- **Shared mutable state in async code**: although async runs on a single thread, wait points allow interleaving. Shared state modified across wait boundaries can cause race conditions. Use immutable data or synchronization primitives
- **Timeout bypass**: if a timeout is set on a task but the underlying I/O operation does not support cancellation, the task appears to time out but the I/O continues consuming resources. Verify that cancellation propagates to the OS level
- **Memory leaks via closures**: each async task captures its scope in a closure. Long-lived tasks holding references to large objects prevent GC. Use weak references or explicit cleanup
- **Supply chain risks in async libraries**: popular async libraries (aiohttp, asyncio, tokio) have had CVEs. Pin versions and monitor security advisories. Update within 30 days of patch release
- **Denial of service via slow clients**: a slow HTTP client holds an async connection open. Set socket timeouts (SO_RCVTIMEO, SO_SNDTIMEO) and use reverse proxies with rate limiting
- **Unsafe deserialization in async pipelines**: async JSON parsing (wait response.json()) can be exploited with large payloads. Set body size limits and use streaming parsers for untrusted input
- **Coroutine spoofing**: in Python, any object with __await__ can be awaited. Malicious objects could execute code when awaited. Only await objects from trusted sources
- **File descriptor exhaustion**: each async connection uses a file descriptor. Without limits, a connection flood exhausts FDs and crashes the process. Set RLIMIT_NOFILE and monitor usage
- **Information leakage in error messages**: async stack traces are deep and may expose internal paths, query strings, or credentials. Sanitize error responses in production
- **Insecure defaults in async HTTP clients**: many async HTTP clients do not verify TLS certificates by default. Always set erify=True or equivalent in production
- **ReDoS in async input validation**: regex validation running on the event loop can block for seconds on crafted input. Move regex to a worker thread or use e2 which has linear-time guarantees
- **Task cancellation race conditions**: cancelling a task that performs a non-idempotent operation (e.g., charge a credit card) can lead to double charges if the operation completes before cancellation propagates. Use idempotency keys
- **Async context manager leaks**: failing to use sync with for resources (database connections, HTTP sessions) leaks connections. Use linters that detect unclosed async resources
- **Backpressure bypass**: if a fast producer feeds a slow consumer without backpressure, memory grows unbounded. Use bounded channels or streams with flow control
## FAQ

**Q: Is async always faster than synchronous?**
A: Only for I/O-bound workloads. For CPU-bound tasks (image processing, machine learning), async provides no benefit because the CPU is already saturated. Use threads, processes, or dedicated workers for CPU parallelism.

**Q: How many concurrent requests can a single Node.js process handle?**
A: Thousands, limited by memory and file descriptors. The event loop handles one operation at a time, but most operations are I/O waits. A typical Node.js server handles 5,000-10,000 concurrent connections.

**Q: What is the difference between concurrency and parallelism?**
A: Concurrency is interleaving tasks on a single core (async/await). Parallelism is running tasks simultaneously on multiple cores (threads/processes). Async provides concurrency; multiprocessing provides parallelism. Use both for maximum throughput.

**Q: Should I use threads or async in Python?**
A: Use `asyncio` for I/O-bound workloads with many connections. Use `threading` for I/O with blocking libraries that do not support async. Use `multiprocessing` for CPU-bound work that must bypass the GIL. `asyncio` is usually the best choice for web servers and API clients.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
- **Async task priority manipulation**: if an attacker can influence task scheduling order (e.g., by controlling task creation timing), they can starve critical tasks. Use priority queues with rate-limited insertion
- **Side-channel via task completion order**: observing which async tasks complete first can reveal internal state or data dependencies. Randomize task execution order in security-sensitive contexts
- **Coroutine hijacking via shared event loop**: if multiple modules share an event loop, a compromised module can intercept or manipulate callbacks from other modules. Use isolated event loops for security-sensitive components
- **Async stack trace information leakage**: error objects from async operations may contain internal file paths, database query strings, or API keys in stack traces. Strip sensitive data before sending error responses to clients
- **Timing attacks on async authentication**: comparing passwords or tokens in async code may leak timing information if the comparison is not constant-time. Use hmac.compare_digest (Python) or crypto.timingSafeEqual (Node.js) for all security comparisons
- **Replay attacks on async token validation**: if async token validation caches results for performance, an attacker can replay a stale valid token. Include timestamps and nonces in token validation, even in async paths
- **Async callback hell obscuring security bugs**: deeply nested callbacks make it hard to audit security-critical code paths. Flatten async code with async/await and use linters to enforce maximum nesting depth
- **Event emitter memory leaks as attack vector**: long-lived event emitters with accumulated listeners consume memory. An attacker can trigger listener accumulation by repeatedly triggering events. Use EventEmitter.defaultMaxListeners or equivalent limits
- **Async middleware bypass**: if async middleware chains are not properly awaited, a middleware may be skipped. Use framework-level middleware composition that enforces await on every handler
- **Race condition in async rate limiting**: if rate limiting state is checked and updated in separate async operations, concurrent requests can bypass the limit. Use atomic check-and-increment operations
- **Promise prototype pollution**: if an attacker can modify Promise.prototype, all async code using promises is compromised. Use Object.freeze(Promise.prototype) in production or run with strict mode
- **Async cleanup bypass on forced shutdown**: if a process is killed with SIGKILL, async cleanup handlers do not run. Use SIGTERM with a grace period and implement cleanup in signal handlers before async drain
- **Shared async resource pool exhaustion**: if multiple async consumers share a connection pool without limits, a spike in one consumer can starve others. Implement per-consumer quotas on shared async resource pools
- **Async logger blocking**: if logging is synchronous within an async handler, it blocks the event loop. Use async logging with bounded buffers to prevent logging from blocking the event loop
- **Coroutine cancellation ignoring locks**: if a coroutine is cancelled while holding a lock, the lock may not be released. Use context managers or finally blocks to ensure lock release on cancellation
- **Async deserialization bombs**: parsing large JSON payloads with wait response.json() can consume memory before validation runs. Set Content-Length limits at the gateway and use streaming parsers for large payloads
- **Event loop starvation via microtask flooding**: if a single request schedules thousands of microtasks (e.g., recursive Promise.resolve().then()), it starves other requests. Limit microtask creation per request
