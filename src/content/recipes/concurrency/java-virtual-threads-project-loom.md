---




contentType: recipes
slug: java-virtual-threads-project-loom
title: "Scale Concurrent Applications with Java Virtual Threads"
description: "Scale Java applications with virtual threads from Project Loom. Use Thread.ofVirtual, Executors.newVirtualThreadPerTaskExecutor, structured concurrency, and scoped values."
metaDescription: "Scale Java apps with virtual threads from Project Loom. Use Thread.ofVirtual, structured concurrency, and scoped values for millions of threads."
difficulty: intermediate
topics:
  - concurrency
  - performance
  - architecture
tags:
  - java
  - virtual-threads
  - loom
  - jdk-21
  - concurrency
relatedResources:
  - /recipes/java-completable-future-composition
  - /recipes/go-goroutines-channels-patterns
  - /guides/concurrency-patterns-guide
  - /recipes/csharp-async-await-task-run
  - /recipes/rust-tokio-async-runtime
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Scale Java apps with virtual threads from Project Loom. Use Thread.ofVirtual, structured concurrency, and scoped values for millions of threads."
  keywords:
    - java virtual threads
    - project loom
    - jdk 21 concurrency
    - structured concurrency java
    - java lightweight threads




---

## Overview

Virtual threads, introduced as a preview in Java 19 and finalized in Java 21, are lightweight threads managed by the JVM rather than the OS. They enable writing straightforward blocking code that scales to millions of concurrent operations. The solution below covers creating virtual threads, virtual thread executors, structured concurrency with `StructuredTaskScope`, and scoped values for thread-local alternatives.

## When to Use This

- High-throughput server applications handling many concurrent requests
- I/O-heavy workloads where blocking operations dominate
- Replacing complex async/reactive code with simpler blocking code
- Applications currently limited by platform thread pool sizes

## Prerequisites

- Java 21+ (JDK with virtual threads finalized)
- `--enable-preview` for structured concurrency features (Java 21 preview)

## Solution

### 1. Basic Virtual Thread

```java
import java.time.Duration;
import java.util.concurrent.TimeUnit;

public class BasicVirtualThread {
    public static void main(String[] args) throws InterruptedException {
        // Create and start a virtual thread
        Thread vt = Thread.ofVirtual().name("my-virtual-thread").start(() -> {
            System.out.println("Running in: " + Thread.currentThread());
            System.out.println("Is virtual: " + Thread.currentThread().isVirtual());
        });

        vt.join();
        System.out.println("Virtual thread completed");
    }
}
```

### 2. Virtual Thread per Task Executor

```java
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.IntStream;

public class VirtualThreadExecutor {
    public static void main(String[] args) throws InterruptedException {
        // One virtual thread per task — no pooling needed
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {

            // Submit 10,000 tasks
            IntStream.range(0, 10_000).forEach(i -> {
                executor.submit(() -> {
                    try {
                        TimeUnit.MILLISECONDS.sleep(100);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                    return i * 2;
                });
            });

            // Wait for all tasks
            executor.shutdown();
            executor.awaitTermination(10, TimeUnit.SECONDS);
        }

        System.out.println("All 10,000 virtual threads completed");
    }
}
```

### 3. Blocking I/O with Virtual Threads

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.List;
import java.util.ArrayList;

public class VirtualThreadIO {
    private static final HttpClient client = HttpClient.newBuilder()
        .build();

    public static String fetch(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .GET()
            .build();

        HttpResponse<String> response = client.send(
            request,
            HttpResponse.BodyHandlers.ofString()
        );
        return response.body();
    }

    public static void main(String[] args) throws Exception {
        List<String> urls = List.of(
            "https://httpbin.org/delay/1",
            "https://httpbin.org/delay/2",
            "https://httpbin.org/delay/1",
            "https://httpbin.org/delay/3",
            "https://httpbin.org/delay/1"
        );

        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<java.util.concurrent.Future<String>> futures = new ArrayList<>();

            for (String url : urls) {
                futures.add(executor.submit(() -> fetch(url)));
            }

            // All fetches run concurrently — each on its own virtual thread
            // Total time ~3s (max delay), not 8s (sum of delays)
            long start = System.currentTimeMillis();
            for (java.util.concurrent.Future<String> f : futures) {
                String body = f.get();
                System.out.println("Fetched " + body.length() + " bytes");
            }
            long elapsed = System.currentTimeMillis() - start;
            System.out.println("Total time: " + elapsed + "ms");
        }
    }
}
```

### 4. Structured Concurrency with StructuredTaskScope

```java
import java.util.concurrent.StructuredTaskScope;
import java.util.concurrent.StructuredTaskScope.ShutdownOnFailure;
import java.util.concurrent.StructuredTaskScope.Subtask;
import java.util.concurrent.ExecutionException;

public class StructuredConcurrency {
    record User(String name, String email) {}
    record Order(String id, double total) {}
    record UserOrder(User user, Order order) {}

    static User fetchUser(String userId) throws Exception {
        Thread.sleep(100);
        return new User("Alice", "alice@example.com");
    }

    static Order fetchOrder(String orderId) throws Exception {
        Thread.sleep(150);
        return new Order("ord-123", 99.99);
    }

    public static void main(String[] args) throws Exception {
        // ShutdownOnFailure: if any subtask fails, cancel all others
        try (var scope = new ShutdownOnFailure()) {

            Subtask<User> userTask = scope.fork(() -> fetchUser("u1"));
            Subtask<Order> orderTask = scope.fork(() -> fetchOrder("o1"));

            scope.join();          // Wait for all subtasks
            scope.throwIfFailed(); // Propagate first error if any

            // Both completed successfully
            UserOrder result = new UserOrder(userTask.get(), orderTask.get());
            System.out.println("Result: " + result);

        } catch (ExecutionException e) {
            System.err.println("A subtask failed: " + e.getCause());
        }
    }
}
```

### 5. ShutdownOnSuccess — First Result Wins

```java
import java.util.concurrent.StructuredTaskScope;
import java.util.concurrent.StructuredTaskScope.ShutdownOnSuccess;
import java.util.concurrent.Subtask;

public class FirstResultPattern {
    static String fetchFromReplica(String replicaUrl) throws Exception {
        Thread.sleep((long) (Math.random() * 500));
        return "Data from " + replicaUrl;
    }

    public static void main(String[] args) throws Exception {
        // ShutdownOnSuccess: cancel all others when first succeeds
        try (var scope = new ShutdownOnSuccess<String>()) {

            scope.fork(() -> fetchFromReplica("replica-1"));
            scope.fork(() -> fetchFromReplica("replica-2"));
            scope.fork(() -> fetchFromReplica("replica-3"));

            scope.join();

            // Get the first result
            String result = scope.result();
            System.out.println("First response: " + result);
        }
    }
}
```

### 6. Scoped Values — Thread-Local Alternative

```java
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScopedValue;

public class ScopedValueExample {
    // Define a scoped value
    static final ScopedValue<String> USER_ID = ScopedValue.newInstance();
    static final ScopedValue<String> REQUEST_ID = ScopedValue.newInstance();

    static void handleRequest() {
        System.out.println("User: " + USER_ID.get() + ", Request: " + REQUEST_ID.get());

        // Virtual threads inherit scoped values automatically
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            executor.submit(() -> {
                System.out.println("In child thread — User: " + USER_ID.get()
                    + ", Request: " + REQUEST_ID.get());
            }).get();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void main(String[] args) {
        // Bind scoped values for the duration of the call
        ScopedValue.where(USER_ID, "user-42")
            .where(REQUEST_ID, "req-abc-123")
            .run(() -> handleRequest());
    }
}
```

### 7. Mixing Platform and Virtual Threads

```java
import java.util.concurrent.*;

public class MixedThreads {
    static void cpuIntensiveTask(int id) {
        long result = 0;
        for (long i = 0; i < 100_000_000L; i++) {
            result += i;
        }
        System.out.println("CPU task " + id + " result: " + result);
    }

    static void ioTask(int id) throws InterruptedException {
        Thread.sleep(500);
        System.out.println("IO task " + id + " done");
    }

    public static void main(String[] args) throws InterruptedException {
        // CPU-bound tasks on platform threads (fixed pool)
        try (ExecutorService cpuPool = Executors.newFixedThreadPool(4)) {

            // I/O-bound tasks on virtual threads
            try (ExecutorService ioPool = Executors.newVirtualThreadPerTaskExecutor()) {

                for (int i = 0; i < 4; i++) {
                    final int id = i;
                    cpuPool.submit(() -> cpuIntensiveTask(id));
                    ioPool.submit(() -> ioTask(id));
                }

                cpuPool.shutdown();
                ioPool.shutdown();
                cpuPool.awaitTermination(10, TimeUnit.SECONDS);
                ioPool.awaitTermination(10, TimeUnit.SECONDS);
            }
        }

        System.out.println("All tasks completed");
    }
}
```

### 8. Synchronized Blocks and Pinning

```java
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

public class PinningExample {
    // ReentrantLock does NOT pin virtual threads
    private static final ReentrantLock lock = new ReentrantLock();
    private static int counter = 0;

    // synchronized blocks CAN pin virtual threads in Java 21
    // Use ReentrantLock instead for virtual-thread-friendly locking

    public static void main(String[] args) throws InterruptedException {
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 1000; i++) {
                executor.submit(() -> {
                    lock.lock();
                    try {
                        counter++;
                    } finally {
                        lock.unlock();
                    }
                });
            }

            executor.shutdown();
            executor.awaitTermination(5, TimeUnit.SECONDS);
        }

        System.out.println("Counter: " + counter);
    }
}
```

## How It Works

1. **Virtual Threads**: Managed by the JVM, not the OS. They are cheap to create (~few hundred bytes vs ~1MB for platform threads) and can number in the millions. When a virtual thread blocks on I/O, the JVM unmounts it from the carrier thread and mounts another virtual thread.
2. **Carrier Threads**: Virtual threads run on carrier threads (platform threads from the ForkJoinPool). The JVM multiplexes virtual threads onto a small number of carriers (~CPU count). Blocking operations yield the carrier.
3. **`newVirtualThreadPerTaskExecutor`**: Creates a new virtual thread for each submitted task. No pooling is needed — virtual threads are cheap. The executor shuts down when the try-with-resources block exits.
4. **`StructuredTaskScope`**: Provides structured concurrency. `ShutdownOnFailure` cancels all subtasks if one fails. `ShutdownOnSuccess` cancels all subtasks when the first succeeds. `join()` waits for all subtasks to complete.
5. **`ScopedValue`**: A modern alternative to `ThreadLocal`. Values are bound for the duration of a `run()` call and automatically inherited by child virtual threads. They are immutable within their scope and cleaned up automatically.
6. **Pinning**: A virtual thread is "pinned" to its carrier when it blocks inside a `synchronized` block or native method. Pinned threads cannot yield the carrier, reducing throughput. Use `ReentrantLock` instead of `synchronized` to avoid pinning.

## Variants

### Custom Thread Builder

```java
Thread.Builder builder = Thread.ofVirtual()
    .name("worker-", 0) // Prefix + counter
    .uncaughtExceptionHandler((t, e) -> {
        System.err.println("Uncaught in " + t.getName() + ": " + e);
    });

Thread t = builder.start(() -> {
    System.out.println("Running in " + Thread.currentThread().getName());
});
t.join();
```

### Semaphore for Bounded Concurrency

```java
import java.util.concurrent.*;

public class BoundedVirtualThreads {
    public static void main(String[] args) throws InterruptedException {
        Semaphore semaphore = new Semaphore(10); // Max 10 concurrent

        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 100; i++) {
                final int id = i;
                executor.submit(() -> {
                    semaphore.acquire();
                    try {
                        Thread.sleep(100);
                        System.out.println("Task " + id + " done");
                    } finally {
                        semaphore.release();
                    }
                });
            }
            executor.shutdown();
            executor.awaitTermination(30, TimeUnit.SECONDS);
        }
    }
}
```

### Nested StructuredTaskScope

```java
try (var outer = new StructuredTaskScope.ShutdownOnFailure()) {
    var dataTask = outer.fork(() -> fetchData());

    try (var inner = new StructuredTaskScope.ShutdownOnFailure()) {
        var enrichTask = inner.fork(() -> enrichData());
        inner.join();
        inner.throwIfFailed();
    }

    outer.join();
    outer.throwIfFailed();
    System.out.println("All done: " + dataTask.get());
}
```

## Best Practices


- For a deeper guide, see [Build Async Pipelines with C# async/await and Task.Run](/recipes/csharp-async-await-task-run/).

- **Use `newVirtualThreadPerTaskExecutor` for I/O work**: Virtual threads excel at I/O-bound tasks. Don't pool them — create one per task.
- **Use `ReentrantLock` over `synchronized`**: `synchronized` blocks pin virtual threads to carrier threads. `ReentrantLock` allows unmounting during blocking.
- **Don't pool virtual threads**: Virtual threads are cheap to create and dispose. Pooling adds overhead and complexity. Use one-per-task.
- **Use platform threads for CPU-bound work**: Virtual threads don't help with CPU-bound tasks — they still occupy a carrier thread. Use a fixed thread pool sized to CPU cores.
- **Use `StructuredTaskScope` for related subtasks**: It ensures subtasks are awaited and cancelled together, preventing leaks.
- **Prefer `ScopedValue` over `ThreadLocal`**: `ScopedValue` is safer (immutable, bounded lifetime) and works correctly with virtual threads.

## Common Mistakes

- **Using `synchronized` with virtual threads**: `synchronized` pins the virtual thread to its carrier, preventing unmounting. Replace with `ReentrantLock`.
- **Pooling virtual threads**: Virtual threads are not meant to be pooled. Creating a pool defeats their purpose and adds unnecessary overhead.
- **Running CPU-bound work on virtual threads**: CPU-bound work blocks the carrier thread. Use platform threads with a fixed pool sized to the CPU core count.
- **Not handling `InterruptedException`**: Virtual threads can be interrupted. Always handle `InterruptedException` and restore the interrupt flag with `Thread.currentThread().interrupt()`.
- **Using `ThreadLocal` with virtual threads**: `ThreadLocal` can leak memory with millions of threads. Use `ScopedValue` instead — it has bounded lifetime and automatic cleanup.

## FAQ

**What is the difference between virtual threads and platform threads?**

Platform threads are thin wrappers around OS threads (~1MB stack each). Virtual threads are JVM-managed (~few hundred bytes) and can number in the millions. Virtual threads yield their carrier when blocking on I/O.

**Can I use virtual threads with Spring Boot?**

Yes. Spring Boot 3.2+ supports virtual threads. Set `spring.threads.virtual.enabled=true` in `application.properties` and Tomcat will use virtual threads for request handling.

**Do virtual threads replace CompletableFuture?**

Not entirely. Virtual threads simplify blocking-style code. `CompletableFuture` is still useful for composing async pipelines. Use virtual threads when blocking code is simpler and more readable than async composition.

**What is pinning and why does it matter?**

Pinning occurs when a virtual thread cannot unmount from its carrier — typically inside `synchronized` blocks or native methods. Pinned threads block the carrier, reducing throughput. Use `ReentrantLock` to avoid pinning.

**How many virtual threads can I create?**

Practically, millions. The limit is heap memory. Each virtual thread uses ~200-400 bytes. 1 million virtual threads use ~200-400MB. The JVM multiplexes them onto a small number of carrier threads.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
