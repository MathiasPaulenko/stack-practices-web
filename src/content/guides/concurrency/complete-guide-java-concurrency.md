---
contentType: guides
slug: complete-guide-java-concurrency
title: "Complete Guide to Java Concurrency"
description: "Master Java concurrency in production. Covers threads, locks, CompletableFuture, virtual threads, executors, concurrent collections, memory model, and patterns for high-throughput parallel applications."
metaDescription: "Master Java concurrency. Covers threads, locks, CompletableFuture, virtual threads, executors, concurrent collections, and memory model."
difficulty: advanced
topics:
  - concurrency
  - performance
  - testing
tags:
  - java
  - concurrency
  - guide
  - threads
  - completablefuture
  - virtual-threads
  - executors
  - locks
relatedResources:
  - /guides/concurrency/complete-guide-python-asyncio-production
  - /patterns/concurrency/async-generator-pattern
  - /patterns/resilience/bulkhead-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Master Java concurrency. Covers threads, locks, CompletableFuture, virtual threads, executors, concurrent collections, and memory model."
  keywords:
    - java concurrency
    - java threads
    - completablefuture
    - virtual threads java
    - java executors
    - java locks
    - concurrent collections
    - java memory model
---

## Introduction

Java has the most mature concurrency toolkit of any mainstream language. From basic threads to virtual threads (JEP 444), from `synchronized` to `StampedLock`, from `ExecutorService` to `CompletableFuture`, the options are vast. Choosing the right tool for each scenario is what separates working code from production-grade code. The following guide covers the full spectrum of Java concurrency with practical patterns for building high-throughput parallel applications.

## Thread Fundamentals

### Creating Threads

```java
import java.lang.Thread;

// Method 1: Extend Thread
class Worker extends Thread {
    @Override
    public void run() {
        System.out.println("Working in: " + Thread.currentThread().getName());
    }
}
new Worker().start();

// Method 2: Implement Runnable
Thread thread = new Thread(() -> {
    System.out.println("Working in: " + Thread.currentThread().getName());
});
thread.start();

// Method 3: ExecutorService (recommended for production)
import java.util.concurrent.*;

ExecutorService executor = Executors.newFixedThreadPool(8);
executor.submit(() -> {
    System.out.println("Working in: " + Thread.currentThread().getName());
});
executor.shutdown();
```

### Thread Lifecycle

```text
NEW → RUNNABLE → (BLOCKED / WAITING / TIMED_WAITING) → TERMINATED

NEW: Thread created, not started
RUNNABLE: Running or ready to run
BLOCKED: Waiting for a monitor lock
WAITING: Waiting indefinitely for another thread
TIMED_WAITING: Waiting for a specified duration
TERMINATED: Thread completed execution
```

### Thread Properties

```java
Thread thread = new Thread(() -> {
    try {
        Thread.sleep(1000);
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt(); // Restore interrupt flag
        return;
    }
});

thread.setName("worker-1");
thread.setPriority(Thread.NORM_PRIORITY); // 1-10, default 5
thread.setDaemon(false); // Daemon threads don't prevent JVM shutdown
thread.start();

// Wait for completion
thread.join(5000); // Wait up to 5 seconds
System.out.println("Thread alive: " + thread.isAlive());
```

## ExecutorService

### Choosing a Thread Pool

```java
import java.util.concurrent.*;

// Fixed pool: predictable resource usage
ExecutorService fixed = Executors.newFixedThreadPool(8);

// Cached pool: grows on demand, shrinks when idle (60s timeout)
ExecutorService cached = Executors.newCachedThreadPool();

// Single thread: sequential execution with queueing
ExecutorService single = Executors.newSingleThreadExecutor();

// Scheduled: delayed and recurring tasks
ScheduledExecutorService scheduled = Executors.newScheduledThreadPool(4);
scheduled.scheduleAtFixedRate(() -> heartbeat(), 0, 10, TimeUnit.SECONDS);
scheduled.scheduleWithFixedDelay(() -> cleanup(), 0, 60, TimeUnit.SECONDS);

// Work stealing: adaptive parallelism (good for ForkJoinTask)
ExecutorService workStealing = Executors.newWorkStealingPool();
```

### Custom Thread Pool with ThreadPoolExecutor

```java
import java.util.concurrent.*;

ThreadPoolExecutor executor = new ThreadPoolExecutor(
    4,                          // Core pool size
    16,                         // Max pool size
    60L, TimeUnit.SECONDS,      // Keep-alive for idle threads
    new LinkedBlockingQueue<>(100),  // Work queue with capacity
    new ThreadFactory() {
        private int count = 0;
        @Override
        public Thread newThread(Runnable r) {
            Thread t = new Thread(r, "pool-worker-" + count++);
            t.setDaemon(true);
            return t;
        }
    },
    new ThreadPoolExecutor.CallerRunsPolicy()  // Rejection policy
);

// Rejection policies:
// AbortPolicy: throw RejectedExecutionException (default)
// CallerRunsPolicy: run in the calling thread (backpressure)
// DiscardPolicy: silently discard
// DiscardOldestPolicy: discard oldest queued task
```

### Graceful Shutdown

```java
ExecutorService executor = Executors.newFixedThreadPool(8);

// Submit tasks
for (int i = 0; i < 100; i++) {
    executor.submit(() -> processItem(i));
}

// Graceful shutdown
executor.shutdown(); // Stop accepting new tasks
try {
    if (!executor.awaitTermination(60, TimeUnit.SECONDS)) {
        executor.shutdownNow(); // Force shutdown
        if (!executor.awaitTermination(10, TimeUnit.SECONDS)) {
            System.err.println("Pool did not terminate");
        }
    }
} catch (InterruptedException e) {
    executor.shutdownNow();
    Thread.currentThread().interrupt();
}
```

## Locks

### synchronized vs ReentrantLock

```java
// synchronized: simple, JVM-managed, cannot timeout
public synchronized void incrementSync() {
    count++;
}

// ReentrantLock: flexible, can timeout, can be fair
import java.util.concurrent.locks.*;

private final ReentrantLock lock = new ReentrantLock(true); // Fair lock

public void incrementLock() {
    lock.lock();
    try {
        count++;
    } finally {
        lock.unlock(); // MUST be in finally
    }
}

// Try with timeout
public boolean tryIncrement(long timeout, TimeUnit unit) {
    try {
        if (lock.tryLock(timeout, unit)) {
            try {
                count++;
                return true;
            } finally {
                lock.unlock();
            }
        }
        return false; // Could not acquire lock
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        return false;
    }
}
```

### ReadWriteLock

```java
import java.util.concurrent.locks.*;

private final ReentrantReadWriteLock rwLock = new ReentrantReadWriteLock();
private final Map<String, String> cache = new HashMap<>();

public String get(String key) {
    rwLock.readLock().lock();
    try {
        return cache.get(key);
    } finally {
        rwLock.readLock().unlock();
    }
}

public void put(String key, String value) {
    rwLock.writeLock().lock();
    try {
        cache.put(key, value);
    } finally {
        rwLock.writeLock().unlock();
    }
}
```

### StampedLock

```java
import java.util.concurrent.locks.*;

private final StampedLock stampedLock = new StampedLock();
private double x, y;

// Optimistic read: no lock, validate after
public double distanceFromOrigin() {
    long stamp = stampedLock.tryOptimisticRead();
    double currentX = x, currentY = y;
    if (!stampedLock.validate(stamp)) {
        // Optimistic read failed, upgrade to read lock
        stamp = stampedLock.readLock();
        try {
            currentX = x;
            currentY = y;
        } finally {
            stampedLock.unlockRead(stamp);
        }
    }
    return Math.sqrt(currentX * currentX + currentY * currentY);
}

public void move(double deltaX, double deltaY) {
    long stamp = stampedLock.writeLock();
    try {
        x += deltaX;
        y += deltaY;
    } finally {
        stampedLock.unlockWrite(stamp);
    }
}
```

## CompletableFuture

### Basic Composition

```java
import java.util.concurrent.*;

CompletableFuture<String> future = CompletableFuture
    .supplyAsync(() -> {
        // Async computation
        return fetchUser(123);
    })
    .thenApply(user -> {
        // Transform result
        return user.getName();
    })
    .thenApply(name -> {
        // Chain another transformation
        return name.toUpperCase();
    })
    .thenAccept(name -> {
        // Consume result (no return)
        System.out.println("Name: " + name);
    })
    .thenRun(() -> {
        // Run after completion
        System.out.println("Done");
    });

future.join(); // Block and get result
```

### Combining Multiple Futures

```java
// Run two futures in parallel and combine results
CompletableFuture<User> userFuture = CompletableFuture.supplyAsync(() -> fetchUser(123));
CompletableFuture<Orders> ordersFuture = CompletableFuture.supplyAsync(() -> fetchOrders(123));

CompletableFuture<UserProfile> profileFuture = userFuture
    .thenCombine(ordersFuture, (user, orders) -> new UserProfile(user, orders));

// Wait for all to complete
CompletableFuture<Void> all = CompletableFuture.allOf(
    CompletableFuture.supplyAsync(() -> fetchUser(1)),
    CompletableFuture.supplyAsync(() -> fetchUser(2)),
    CompletableFuture.supplyAsync(() -> fetchUser(3))
);
all.join();

// Wait for any to complete
CompletableFuture<Object> any = CompletableFuture.anyOf(
    CompletableFuture.supplyAsync(() -> fetchFromPrimary()),
    CompletableFuture.supplyAsync(() -> fetchFromSecondary())
);
Object result = any.join();
```

### Error Handling

```java
CompletableFuture<String> future = CompletableFuture
    .supplyAsync(() -> {
        if (Math.random() > 0.5) {
            throw new RuntimeException("Fetch failed");
        }
        return "success";
    })
    .exceptionally(ex -> {
        // Handle exception, return fallback
        return "fallback";
    })
    .handle((result, ex) -> {
        // Handle both success and exception
        if (ex != null) {
            return "recovered: " + ex.getMessage();
        }
        return result;
    });

// Retry pattern with CompletableFuture
public CompletableFuture<String> fetchWithRetry(String url, int maxRetries) {
    CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> fetch(url));
    for (int i = 0; i < maxRetries; i++) {
        future = future.exceptionallyCompose(ex -> {
            System.err.println("Retry " + (i + 1) + ": " + ex.getMessage());
            return CompletableFuture.supplyAsync(() -> fetch(url));
        });
    }
    return future;
}
```

### Timeout Handling

```java
import java.util.concurrent.*;

CompletableFuture<String> future = CompletableFuture
    .supplyAsync(() -> slowFetch())
    .orTimeout(5, TimeUnit.SECONDS) // Timeout after 5s (Java 9+)
    .exceptionally(ex -> {
        if (ex instanceof TimeoutException) {
            return "timeout fallback";
        }
        return "error fallback";
    });

// Complete with default value after timeout
CompletableFuture<String> withDefault = CompletableFuture
    .supplyAsync(() -> slowFetch())
    .completeOnTimeout("default", 5, TimeUnit.SECONDS);
```

## Virtual Threads (Java 21+)

Virtual threads are lightweight threads managed by the JVM, not the OS. Millions of virtual threads can run on a few platform threads.

```java
import java.util.concurrent.*;

// Create a virtual thread
Thread vt = Thread.ofVirtual().start(() -> {
    System.out.println("Running in virtual thread");
});

// Virtual thread per task executor
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<String>> futures = new ArrayList<>();
    
    for (int i = 0; i < 10_000; i++) {
        final int id = i;
        futures.add(executor.submit(() -> {
            Thread.sleep(Duration.ofSeconds(1)); // Blocking call is fine!
            return "Result " + id;
        }));
    }
    
    // All 10,000 tasks complete in ~1 second
    for (Future<String> f : futures) {
        System.out.println(f.get());
    }
}

// Structured concurrency (preview in Java 21)
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    Subtask<User> user = scope.fork(() -> fetchUser(123));
    Subtask<Orders> orders = scope.fork(() -> fetchOrders(123));
    
    scope.join();           // Wait for all
    scope.throwIfFailed();  // Propagate exception if any failed
    
    UserProfile profile = new UserProfile(user.get(), orders.get());
}
```

### When to Use Virtual Threads

```text
Use virtual threads when:
- I/O-bound work (HTTP calls, database queries, file I/O)
- High number of concurrent tasks (thousands to millions)
- You want simple blocking-code style without callbacks

Do NOT use virtual threads when:
- CPU-bound work (use platform threads or ForkJoinPool)
- You need pinning-sensitive operations (synchronized blocks pin virtual threads)
- Thread-local variables are heavily used (each virtual thread has its own scope)
```

## Concurrent Collections

```java
import java.util.concurrent.*;
import java.util.*;

// ConcurrentHashMap: thread-safe HashMap
ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
map.put("key", 1);
map.computeIfAbsent("key", k -> expensiveCompute(k));
map.merge("counter", 1, Integer::sum); // Atomic increment

// CopyOnWriteArrayList: thread-safe List, copies on write
CopyOnWriteArrayList<String> list = new CopyOnWriteArrayList<>();
list.add("item"); // Creates a new copy

// ConcurrentLinkedQueue: non-blocking queue
ConcurrentLinkedQueue<String> queue = new ConcurrentLinkedQueue<>();
queue.offer("item");
String item = queue.poll();

// BlockingQueue: producer-consumer pattern
BlockingQueue<String> blockingQueue = new LinkedBlockingQueue<>(100);
blockingQueue.put("item");  // Blocks if full
String item = blockingQueue.take();  // Blocks if empty

// ArrayBlockingQueue: bounded, array-backed
BlockingQueue<String> bounded = new ArrayBlockingQueue<>(1000);

// DelayQueue: elements become available after a delay
class DelayedTask implements Delayed {
    private final long startTime;
    private final String name;
    
    public DelayedTask(String name, long delayMs) {
        this.name = name;
        this.startTime = System.currentTimeMillis() + delayMs;
    }
    
    @Override
    public long getDelay(TimeUnit unit) {
        return unit.convert(startTime - System.currentTimeMillis(), TimeUnit.MILLISECONDS);
    }
    
    @Override
    public int compareTo(Delayed o) {
        return Long.compare(startTime, ((DelayedTask) o).startTime);
    }
}
```

## Atomic Variables

```java
import java.util.concurrent.atomic.*;

AtomicInteger counter = new AtomicInteger(0);
counter.incrementAndGet();     // ++i
counter.getAndIncrement();     // i++
counter.compareAndSet(0, 1);   // CAS: if 0, set to 1
counter.updateAndGet(x -> x * 2); // Atomic update

AtomicLong longCounter = new AtomicLong(0);
AtomicBoolean flag = new AtomicBoolean(false);
AtomicReference<String> ref = new AtomicReference<>("initial");

// LongAdder: better for high-contention counters
LongAdder adder = new LongAdder();
adder.increment();
adder.add(10);
long sum = adder.sum(); // Not atomic, but fast for counting

// LongAccumulator: custom accumulation function
LongAccumulator max = new LongAccumulator(Long::max, Long.MIN_VALUE);
max.accumulate(42);
max.accumulate(17);
long result = max.get(); // 42
```

## Java Memory Model

### Happens-Before Relationship

```java
// The happens-before relationship guarantees visibility:
// 1. Thread A writes to a volatile variable
// 2. Thread B reads the same volatile variable
// → Everything A did before the write is visible to B

private volatile boolean running = true;

public void stop() {
    running = false; // Write to volatile — visible to other threads
}

public void run() {
    while (running) { // Read volatile — sees the latest value
        doWork();
    }
}
```

### Safe Publication

```java
// Unsafe: another thread might see partially constructed object
private SomeObject instance; // NOT volatile

// Safe: volatile ensures safe publication
private volatile SomeObject instance;

// Safe: final fields are visible after construction
class ImmutableValue {
    private final int x;
    private final int y;
    
    public ImmutableValue(int x, int y) {
        this.x = x;
        this.y = y;
    }
}

// Safe: synchronized block establishes happens-before
private SomeObject instance;
private final Object lock = new Object();

public SomeObject getInstance() {
    synchronized (lock) {
        if (instance == null) {
            instance = new SomeObject();
        }
        return instance;
    }
}
```

## Production Patterns

### Circuit Breaker with CompletableFuture

```java
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

class CircuitBreaker {
    private final AtomicReference<State> state = new AtomicReference<>(State.CLOSED);
    private final AtomicInteger failureCount = new AtomicInteger(0);
    private final int threshold;
    private final long timeoutMs;
    private volatile long lastFailureTime;
    
    enum State { CLOSED, OPEN, HALF_OPEN }
    
    public CircuitBreaker(int threshold, long timeoutMs) {
        this.threshold = threshold;
        this.timeoutMs = timeoutMs;
    }
    
    public <T> CompletableFuture<T> execute(java.util.function.Supplier<T> supplier) {
        if (state.get() == State.OPEN) {
            if (System.currentTimeMillis() - lastFailureTime > timeoutMs) {
                state.set(State.HALF_OPEN);
            } else {
                return CompletableFuture.failedFuture(new RuntimeException("Circuit open"));
            }
        }
        
        return CompletableFuture.supplyAsync(supplier)
            .handle((result, ex) -> {
                if (ex != null) {
                    if (failureCount.incrementAndGet() >= threshold) {
                        state.set(State.OPEN);
                        lastFailureTime = System.currentTimeMillis();
                    }
                    throw new CompletionException(ex);
                }
                failureCount.set(0);
                state.set(State.CLOSED);
                return result;
            });
    }
}
```

### Rate Limiter with Semaphore

```java
import java.util.concurrent.*;

class RateLimiter {
    private final Semaphore permits;
    private final ScheduledExecutorService refiller;
    
    public RateLimiter(int maxPermits, long refillIntervalMs) {
        this.permits = new Semaphore(maxPermits);
        this.refiller = Executors.newSingleThreadScheduledExecutor();
        
        refiller.scheduleAtFixedRate(() -> {
            int available = permits.availablePermits();
            if (available < maxPermits) {
                permits.release(maxPermits - available);
            }
        }, 0, refillIntervalMs, TimeUnit.MILLISECONDS);
    }
    
    public boolean tryAcquire(long timeout, TimeUnit unit) throws InterruptedException {
        return permits.tryAcquire(timeout, unit);
    }
    
    public void shutdown() {
        refiller.shutdown();
    }
}
```

## Testing Concurrent Code

```java
import org.junit.jupiter.api.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

@Test
void testConcurrentIncrement() throws Exception {
    AtomicInteger counter = new AtomicInteger(0);
    int threads = 100;
    int incrementsPerThread = 1000;
    
    ExecutorService executor = Executors.newFixedThreadPool(threads);
    CountDownLatch latch = new CountDownLatch(threads);
    
    for (int i = 0; i < threads; i++) {
        executor.submit(() -> {
            for (int j = 0; j < incrementsPerThread; j++) {
                counter.incrementAndGet();
            }
            latch.countDown();
        });
    }
    
    latch.await(10, TimeUnit.SECONDS);
    executor.shutdown();
    
    assertEquals(threads * incrementsPerThread, counter.get());
}

@Test
void testCompletableFuture() throws Exception {
    CompletableFuture<String> future = CompletableFuture
        .supplyAsync(() -> "hello")
        .thenApply(String::toUpperCase)
        .thenApply(s -> s + " world");
    
    assertEquals("HELLO world", future.get(5, TimeUnit.SECONDS));
}
```

## FAQ

### Should I use virtual threads or platform threads?

Use virtual threads for I/O-bound work with high concurrency (thousands of concurrent HTTP calls, database queries). Use platform threads for CPU-bound work or when you need fine-grained control over thread scheduling. Virtual threads are not faster per-task — they allow more concurrent tasks by using fewer OS threads.

### What is the difference between thenApply and thenCompose?

`thenApply` takes a synchronous function and wraps the result in a new CompletableFuture. `thenCompose` takes a function that returns a CompletableFuture and flattens it (like `flatMap`). Use `thenCompose` when the next step is itself async.

### How do I choose between synchronized and ReentrantLock?

Use `synchronized` for simple cases — it is simpler and the JVM optimizes it well (biased locking, lock elision). Use `ReentrantLock` when you need tryLock with timeout, fairness, interruptibility, or non-block-structured locking. `synchronized` is always reentrant and cannot timeout.

### What is thread pinning in virtual threads?

Virtual threads are "pinned" to their carrier platform thread when executing `synchronized` blocks or native methods. While pinned, the carrier thread cannot run other virtual threads. Use `ReentrantLock` instead of `synchronized` in hot paths when using virtual threads to avoid pinning.

### How do I handle InterruptedException?

Catch it, restore the interrupt flag with `Thread.currentThread().interrupt()`, and exit gracefully. Do not swallow it. If you cannot handle it, rethrow it. Never catch `InterruptedException` and do nothing — it breaks cooperative cancellation.

### What is the best thread pool size?

For CPU-bound work: `N_threads = N_cores + 1`. For I/O-bound work: `N_threads = N_cores * (1 + wait_time / compute_time)`. For mixed workloads, use separate pools. With virtual threads, use `newVirtualThreadPerTaskExecutor()` and let the JVM manage scheduling.
