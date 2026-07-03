---
contentType: recipes
slug: java-completable-future-composition
title: "Compose Asynchronous Pipelines with Java CompletableFuture"
description: "Build non-blocking async pipelines in Java using CompletableFuture with thenCompose, thenCombine, allOf, anyOf, exception handling, timeouts, and custom thread pools."
metaDescription: "Build async pipelines in Java with CompletableFuture. Use thenCompose, thenCombine, allOf, anyOf, error handling, timeouts, and custom executors."
difficulty: advanced
topics:
  - concurrency
  - performance
  - api
tags:
  - java
  - completable-future
  - async
  - concurrency
  - composition
relatedResources:
  - /recipes/concurrency/python-asyncio-gather-task-groups
  - /recipes/concurrency/python-thread-pool-executor
  - /guides/concurrency-patterns-guide
  - /guides/complete-guide-graphql-federation
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build async pipelines in Java with CompletableFuture. Use thenCompose, thenCombine, allOf, anyOf, error handling, timeouts, and custom executors."
  keywords:
    - java completablefuture
    - completablefuture thenCompose
    - java async pipeline
    - completablefuture allOf
    - java non-blocking composition
---

## Overview

`CompletableFuture` is Java's composable async primitive. It chains operations, combines multiple futures, handles errors declaratively, and runs on configurable thread pools. Below: sequential composition with `thenCompose`, parallel combination with `thenCombine` and `allOf`, error recovery with `exceptionally` and `handle`, timeouts, and custom executors.

## When to Use This

- API calls to multiple services that need aggregation
- Multi-step async pipelines (fetch → transform → persist)
- Parallel data loading for dashboard or report views
- Replacing callback-based async with composable pipelines

## Prerequisites

- Java 17+
- `java.net.http.HttpClient` (Java 11+)

## Solution

### 1. Basic CompletableFuture

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.concurrent.CompletableFuture;

public class AsyncApiClient {
    private static final HttpClient client = HttpClient.newHttpClient();

    public static CompletableFuture<String> fetchAsync(String url) {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .GET()
            .build();

        return client.sendAsync(request, HttpResponse.BodyHandlers.ofString())
            .thenApply(HttpResponse::body);
    }

    public static void main(String[] args) {
        // Non-blocking — runs on the HttpClient's executor
        CompletableFuture<String> future = fetchAsync("https://api.example.com/users");

        // Do other work while the request is in flight...

        // Block only when you need the result
        String result = future.join();
        System.out.println(result);
    }
}
```

### 2. Sequential Composition with thenCompose

```java
import java.util.concurrent.CompletableFuture;

public class SequentialPipeline {

    public static CompletableFuture<User> fetchUser(String userId) {
        return fetchAsync("https://api.example.com/users/" + userId)
            .thenApply(json -> parseUser(json));
    }

    public static CompletableFuture<List<Order>> fetchOrders(String userId) {
        return fetchAsync("https://api.example.com/users/" + userId + "/orders")
            .thenApply(json -> parseOrders(json));
    }

    public static CompletableFuture<UserProfile> buildProfile(String userId) {
        // thenCompose chains futures — each step waits for the previous
        return fetchUser(userId)
            .thenCompose(user -> fetchOrders(user.getId())
                .thenApply(orders -> new UserProfile(user, orders)));
    }

    public static void main(String[] args) {
        UserProfile profile = buildProfile("123").join();
        System.out.println(profile);
    }
}
```

### 3. Parallel Combination with thenCombine

```java
import java.util.concurrent.CompletableFuture;

public class ParallelCombination {

    public static CompletableFuture<Dashboard> buildDashboard(String userId) {
        // All three fetches run in parallel
        CompletableFuture<User> userFuture = fetchUser(userId);
        CompletableFuture<List<Order>> ordersFuture = fetchOrders(userId);
        CompletableFuture<List<Notification>> notifsFuture = fetchNotifications(userId);

        // thenCombine merges two futures — runs after both complete
        return userFuture
            .thenCombine(ordersFuture, (user, orders) ->
                new PartialDashboard(user, orders))
            .thenCombine(notifsFuture, (partial, notifs) ->
                new Dashboard(partial.getUser(), partial.getOrders(), notifs));
    }

    // Total time = max(fetchUser, fetchOrders, fetchNotifications), not sum
    public static void main(String[] args) {
        Dashboard dashboard = buildDashboard("123").join();
        System.out.println(dashboard);
    }
}
```

### 4. allOf — Wait for All Futures

```java
import java.util.concurrent.CompletableFuture;
import java.util.List;
import java.util.stream.Collectors;

public class AllOfPattern {

    public static CompletableFuture<List<String>> fetchAllUrls(List<String> urls) {
        // Start all fetches in parallel
        List<CompletableFuture<String>> futures = urls.stream()
            .map(AsyncApiClient::fetchAsync)
            .collect(Collectors.toList());

        // allOf returns a CompletableFuture<Void> — completes when all complete
        CompletableFuture<Void> allDone = CompletableFuture.allOf(
            futures.toArray(new CompletableFuture[0])
        );

        // After all complete, collect results
        return allDone.thenApply(v ->
            futures.stream()
                .map(CompletableFuture::join)  // Safe — all are complete
                .collect(Collectors.toList())
        );
    }

    public static void main(String[] args) {
        List<String> urls = List.of(
            "https://api.example.com/data/1",
            "https://api.example.com/data/2",
            "https://api.example.com/data/3"
        );

        List<String> results = fetchAllUrls(urls).join();
        results.forEach(System.out::println);
    }
}
```

### 5. anyOf — First to Complete

```java
import java.util.concurrent.CompletableFuture;

public class AnyOfPattern {

    // Returns the first successful response — useful for racing replicas
    public static CompletableFuture<String> fetchFirstAvailable(List<String> urls) {
        CompletableFuture<?>[] futures = urls.stream()
            .map(AsyncApiClient::fetchAsync)
            .toArray(CompletableFuture[]::new);

        // anyOf completes when the first future completes
        return CompletableFuture.anyOf(futures)
            .thenApply(obj -> (String) obj);
    }

    public static void main(String[] args) {
        List<String> replicaUrls = List.of(
            "https://replica1.example.com/data",
            "https://replica2.example.com/data",
            "https://replica3.example.com/data"
        );

        String result = fetchFirstAvailable(replicaUrls).join();
        System.out.println("First response: " + result);
    }
}
```

### 6. Error Handling

```java
import java.util.concurrent.CompletableFuture;

public class ErrorHandling {

    public static CompletableFuture<String> fetchWithFallback(String url, String fallback) {
        return fetchAsync(url)
            // exceptionally — handle errors, provide fallback
            .exceptionally(ex -> {
                System.err.println("Fetch failed: " + ex.getMessage());
                return fallback;
            });
    }

    public static CompletableFuture<String> fetchWithRetry(String url, int maxRetries) {
        return fetchAsync(url)
            .handle((result, ex) -> {
                if (ex != null) {
                    if (maxRetries > 0) {
                        System.err.println("Retrying (" + maxRetries + " left): " + ex.getMessage());
                        return fetchWithRetry(url, maxRetries - 1);
                    }
                    throw new RuntimeException("Max retries exceeded", ex);
                }
                return CompletableFuture.completedFuture(result);
            })
            .thenCompose(f -> f);  // Flatten nested CompletableFuture
    }

    // whenComplete — side effects without changing the result
    public static CompletableFuture<String> fetchWithLogging(String url) {
        return fetchAsync(url)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Request to {} failed: {}", url, ex.getMessage());
                } else {
                    log.info("Request to {} succeeded ({} bytes)", url, result.length());
                }
            });
    }

    public static void main(String[] args) {
        String result = fetchWithFallback(
            "https://api.example.com/maybe-down",
            "{\"status\": \"fallback\"}"
        ).join();
        System.out.println(result);
    }
}
```

### 7. Custom Thread Pool

```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class CustomExecutorExample {

    // Use a dedicated pool — don't rely on the common ForkJoinPool
    private static final ExecutorService executor = Executors.newFixedThreadPool(
        Runtime.getRuntime().availableProcessors(),
        r -> {
            Thread t = new Thread(r);
            t.setName("async-worker-" + t.getId());
            t.setDaemon(true);
            return t;
        }
    );

    public static CompletableFuture<String> fetchWithCustomPool(String url) {
        // supplyAsync runs on the specified executor
        return CompletableFuture.supplyAsync(() -> {
            // Blocking call runs on a worker thread, not the main thread
            return blockingFetch(url);
        }, executor);
    }

    public static CompletableFuture<UserProfile> buildProfileWithPool(String userId) {
        return fetchUserWithPool(userId)
            .thenComposeAsync(user -> fetchOrdersWithPool(user.getId()), executor)
            .thenApplyAsync(orders -> new UserProfile(orders), executor);
    }

    public static void main(String[] args) {
        try {
            UserProfile profile = buildProfileWithPool("123").join();
            System.out.println(profile);
        } finally {
            executor.shutdown();
        }
    }
}
```

### 8. Timeouts (Java 9+)

```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

public class TimeoutExample {

    public static CompletableFuture<String> fetchWithTimeout(String url) {
        return fetchAsync(url)
            .orTimeout(5, TimeUnit.SECONDS)  // Complete exceptionally with TimeoutException
            .exceptionally(ex -> {
                if (ex instanceof java.util.concurrent.TimeoutException) {
                    return "{\"error\": \"request timed out\"}";
                }
                return "{\"error\": \"" + ex.getMessage() + "\"}";
            });
    }

    // completeOnTimeout — provide a default value instead of an exception
    public static CompletableFuture<String> fetchWithDefault(String url, String defaultValue) {
        return fetchAsync(url)
            .completeOnTimeout(defaultValue, 3, TimeUnit.SECONDS);
    }

    public static void main(String[] args) {
        String result = fetchWithTimeout("https://slow-api.example.com/data").join();
        System.out.println(result);
    }
}
```

## How It Works

1. **CompletableFuture**: Represents an async computation that will produce a result. It can be manually completed or completed by an async operation. Methods like `thenApply`, `thenCompose`, and `thenCombine` register callbacks that execute when the future completes.
2. **`thenApply` vs `thenCompose`**: `thenApply` takes a synchronous function (maps the result). `thenCompose` takes a function that returns another CompletableFuture (flattens nested futures — like `flatMap` in functional programming).
3. **`thenCombine`**: Merges two independent futures — the callback receives both results. Both futures run in parallel; the callback executes after both complete.
4. **`allOf` / `anyOf`**: `allOf` returns a future that completes when all input futures complete. `anyOf` completes when the first input future completes. Both return `CompletableFuture<Void>` / `CompletableFuture<Object>`.
5. **Async vs sync callbacks**: `thenApply` runs the callback on the thread that completed the future. `thenApplyAsync` runs it on a separate thread (from the executor). Use async variants for CPU-intensive callbacks.

## Variants

### Retry with Exponential Backoff

```java
public static CompletableFuture<String> fetchWithBackoff(
        String url, int maxAttempts, long initialDelayMs) {
    return fetchAsync(url)
        .handle((result, ex) -> {
            if (ex != null && maxAttempts > 0) {
                long delay = initialDelayMs * (long) Math.pow(2, maxAttempts - 1);
                return CompletableFuture.delayedExecutor(delay, TimeUnit.MILLISECONDS)
                    .supplyAsync(() -> fetchWithBackoff(url, maxAttempts - 1, initialDelayMs))
                    .thenCompose(f -> f);
            }
            return CompletableFuture.completedFuture(
                ex != null ? null : result
            );
        })
        .thenCompose(f -> f);
}
```

### Combining Results with Transformation

```java
public static CompletableFuture<AggregatedReport> buildReport(
        String userId, String dateRange) {
    CompletableFuture<SalesData> sales = fetchSales(userId, dateRange);
    CompletableFuture<TrafficData> traffic = fetchTraffic(userId, dateRange);
    CompletableFuture<RevenueData> revenue = fetchRevenue(userId, dateRange);

    return CompletableFuture.allOf(sales, traffic, revenue)
        .thenApply(v -> {
            // All three are complete — combine results
            return new AggregatedReport(
                sales.join(),
                traffic.join(),
                revenue.join()
            );
        });
}
```

## Best Practices

- **Always use custom executors**: By default, `CompletableFuture` runs on the `ForkJoinPool.commonPool()`. This pool is shared across the entire JVM — one slow operation can block others. Always pass a dedicated `Executor`.
- **Use `thenCompose` for async chaining**: `thenApply` with a `CompletableFuture` return type creates nested futures. Use `thenCompose` to flatten them.
- **Always handle exceptions**: Unhandled exceptions in `CompletableFuture` are silently swallowed. Use `exceptionally`, `handle`, or `whenComplete` to log and recover.
- **Set timeouts**: Without timeouts, a slow operation blocks `join()` indefinitely. Use `orTimeout()` (Java 9+) or `completeOnTimeout()`.
- **Use `allOf` for parallel fan-out**: Start all futures, then `allOf` to wait. This maximizes parallelism — total time is the slowest future, not the sum.
- **Avoid `join()` in async pipelines**: `join()` blocks the current thread. Use it only at the end of the pipeline. Within the pipeline, use `thenCompose` and `thenCombine`.

## Common Mistakes

- **Using the common ForkJoinPool**: `supplyAsync` without an executor uses the shared common pool. A blocking operation can starve other tasks. Always pass a custom executor.
- **Nesting `thenApply` with futures**: `thenApply(f -> fetchAsync(...))` creates `CompletableFuture<CompletableFuture<T>>`. Use `thenCompose` instead to flatten.
- **Not handling exceptions**: If a future completes exceptionally and nobody calls `exceptionally` or `handle`, the exception is lost. Always add error handling.
- **Blocking with `join()` in the pipeline**: `thenApply(f -> blockingCall())` blocks the callback thread. Use `thenApplyAsync` with a custom executor for blocking callbacks.
- **Not shutting down executors**: Custom executors keep threads alive. Always `shutdown()` them in a `finally` block or via a shutdown hook.

## FAQ

**What is the difference between `thenApply` and `thenCompose`?**

`thenApply` takes a `Function<T, R>` and returns `CompletableFuture<R>`. `thenCompose` takes a `Function<T, CompletableFuture<R>>` and returns `CompletableFuture<R>` — it flattens nested futures. Use `thenCompose` when the callback returns another future.

**Should I use `thenApply` or `thenApplyAsync`?**

`thenApply` runs the callback on the thread that completed the future (could be the caller's thread). `thenApplyAsync` runs it on a separate thread. Use async variants for CPU-intensive or blocking callbacks.

**How do I run multiple futures in parallel?**

Start all futures (they run concurrently), then use `allOf` to wait for all of them. `allOf` returns `CompletableFuture<Void>` — chain `thenApply` to collect results.

**What happens if one future in `allOf` fails?**

`allOf` completes exceptionally if any future fails. The exception is the first one encountered. Use `handle` on each future to prevent one failure from aborting the entire batch.

**How do I set a timeout on a CompletableFuture?**

Use `orTimeout(5, TimeUnit.SECONDS)` (Java 9+) — the future completes exceptionally with `TimeoutException`. Use `completeOnTimeout(defaultValue, 5, TimeUnit.SECONDS)` to provide a fallback value instead.
