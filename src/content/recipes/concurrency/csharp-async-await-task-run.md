---
contentType: recipes
slug: csharp-async-await-task-run
title: "Build Async Pipelines with C# async/await and Task.Run"
description: "Build async pipelines in C# using async/await, Task.Run, Task.WhenAll, Task.WhenAny, CancellationTokenSource, Channels, and Parallel.ForEachAsync for concurrent I/O and CPU work."
metaDescription: "Build async pipelines in C# with async/await, Task.Run, Task.WhenAll, CancellationTokenSource, Channels, and Parallel.ForEachAsync for concurrent I/O and CPU work."
difficulty: intermediate
topics:
  - concurrency
  - performance
  - architecture
tags:
  - csharp
  - dotnet
  - async-await
  - task
  - concurrency
relatedResources:
  - /recipes/concurrency/java-completable-future-composition
  - /recipes/concurrency/python-asyncio-gather-task-groups
  - /guides/concurrency-patterns-guide
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build async pipelines in C# with async/await, Task.Run, Task.WhenAll, CancellationTokenSource, Channels, and Parallel.ForEachAsync for concurrent I/O and CPU work."
  keywords:
    - csharp async await
    - c# task.run
    - c# task.whenall
    - c# cancellation token
    - c# channels concurrency
---

## Overview

C#'s `async`/`await` model provides a compiler-based state machine that transforms async methods into callbacks. `Task` and `Task<T>` represent async operations. The following demonstrates how to `async`/`await` basics, `Task.WhenAll` for parallel execution, `Task.WhenAny` for first-to-complete, `CancellationTokenSource` for cancellation, `System.Threading.Channels` for producer-consumer, and `Parallel.ForEachAsync` for bounded parallel I/O.

## When to Use This

- Async I/O operations (HTTP calls, database queries, file I/O)
- Concurrent API calls with result aggregation
- Long-running operations with cancellation support
- Producer-consumer pipelines with backpressure

## Prerequisites

- .NET 8+
- `System.Threading.Channels` package (included in .NET 8+)

## Solution

### 1. Basic async/await

```csharp
using System.Diagnostics;

public class BasicAsync
{
    public static async Task<string> FetchDataAsync(string url)
    {
        using var client = new HttpClient();
        var response = await client.GetStringAsync(url);
        return response;
    }

    public static async Task RunAsync()
    {
        var sw = Stopwatch.StartNew();

        // Sequential — 2s total
        var data1 = await FetchDataAsync("https://httpbin.org/delay/1");
        var data2 = await FetchDataAsync("https://httpbin.org/delay/1");

        sw.Stop();
        Console.WriteLine($"Sequential: {sw.ElapsedMilliseconds}ms");
    }
}
```

### 2. Task.WhenAll — Parallel Execution

```csharp
using System.Diagnostics;

public class ParallelAsync
{
    public static async Task<string> FetchDataAsync(string url)
    {
        using var client = new HttpClient();
        return await client.GetStringAsync(url);
    }

    public static async Task RunWhenAllAsync()
    {
        var sw = Stopwatch.StartNew();

        var urls = new[]
        {
            "https://httpbin.org/delay/1",
            "https://httpbin.org/delay/1",
            "https://httpbin.org/delay/1",
            "https://httpbin.org/delay/1",
            "https://httpbin.org/delay/1"
        };

        // Parallel — ~1s total instead of 5s
        var tasks = urls.Select(FetchDataAsync);
        var results = await Task.WhenAll(tasks);

        sw.Stop();
        Console.WriteLine($"Parallel: {sw.ElapsedMilliseconds}ms");
        Console.WriteLine($"Fetched {results.Length} responses");
    }
}
```

### 3. Task.WhenAny — First to Complete

```csharp
public class FirstResultAsync
{
    public static async Task<string> FetchWithTimeoutAsync(string url, TimeSpan timeout)
    {
        using var client = new HttpClient();
        var fetchTask = client.GetStringAsync(url);
        var timeoutTask = Task.Delay(timeout);

        // Returns when either completes
        var completedTask = await Task.WhenAny(fetchTask, timeoutTask);

        if (completedTask == timeoutTask)
        {
            throw new TimeoutException($"Request to {url} timed out after {timeout}");
        }

        return await fetchTask;
    }

    public static async Task RunWhenAnyAsync()
    {
        try
        {
            var result = await FetchWithTimeoutAsync(
                "https://httpbin.org/delay/5",
                TimeSpan.FromSeconds(2)
            );
            Console.WriteLine(result);
        }
        catch (TimeoutException ex)
        {
            Console.WriteLine(ex.Message);
        }
    }
}
```

### 4. CancellationToken — Cooperative Cancellation

```csharp
using System.Threading;

public class CancellationAsync
{
    public static async Task ProcessWithCancellationAsync(
        CancellationToken cancellationToken)
    {
        for (int i = 0; i < 100; i++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            await Task.Delay(100, cancellationToken);
            Console.WriteLine($"Processing item {i}");
        }
    }

    public static async Task RunCancellationAsync()
    {
        using var cts = new CancellationTokenSource();

        // Cancel after 500ms
        cts.CancelAfter(TimeSpan.FromMilliseconds(500));

        try
        {
            await ProcessWithCancellationAsync(cts.Token);
        }
        catch (OperationCanceledException)
        {
            Console.WriteLine("Operation was cancelled");
        }
    }
}
```

### 5. Task.Run for CPU-Bound Work

```csharp
public class CpuBoundAsync
{
    public static long ComputeSum(long start, long end)
    {
        long sum = 0;
        for (long i = start; i < end; i++)
        {
            sum += i;
        }
        return sum;
    }

    public static async Task RunCpuBoundAsync()
    {
        var sw = Stopwatch.StartNew();

        // Run CPU-bound work on thread pool — don't block the async state machine
        var task1 = Task.Run(() => ComputeSum(0, 50_000_000));
        var task2 = Task.Run(() => ComputeSum(50_000_000, 100_000_000));

        var results = await Task.WhenAll(task1, task2);

        sw.Stop();
        Console.WriteLine($"Sum: {results[0] + results[1]}");
        Console.WriteLine($"Time: {sw.ElapsedMilliseconds}ms");
    }
}
```

### 6. System.Threading.Channels — Producer-Consumer

```csharp
using System.Threading.Channels;

public class ChannelExample
{
    public static async Task RunChannelAsync()
    {
        // Bounded channel with capacity 10
        var channel = Channel.CreateBounded<int>(10);

        // Producer
        async Task ProduceAsync()
        {
            for (int i = 0; i < 100; i++)
            {
                await channel.Writer.WriteAsync(i);
                Console.WriteLine($"Produced: {i}");
            }
            channel.Writer.Complete();
        }

        // Consumer
        async Task ConsumeAsync(int workerId)
        {
            await foreach (var item in channel.Reader.ReadAllAsync())
            {
                await Task.Delay(50); // Simulate processing
                Console.WriteLine($"Worker {workerId} consumed: {item}");
            }
        }

        // Start 3 consumers and 1 producer
        var consumers = Enumerable.Range(0, 3)
            .Select(id => ConsumeAsync(id));
        var producer = ProduceAsync();

        await Task.WhenAll(
            Task.WhenAll(consumers),
            producer
        );

        Console.WriteLine("Channel processing complete");
    }
}
```

### 7. Parallel.ForEachAsync — Bounded Parallel I/O

```csharp
public class ParallelForEachAsync
{
    public static async Task RunParallelForEachAsync()
    {
        var urls = Enumerable.Range(1, 20)
            .Select(i => $"https://httpbin.org/delay/1?page={i}")
            .ToList();

        using var client = new HttpClient();
        var options = new ParallelOptions
        {
            MaxDegreeOfParallelism = 5 // Max 5 concurrent
        };

        int successCount = 0;

        await Parallel.ForEachAsync(urls, options, async (url, ct) =>
        {
            try
            {
                var response = await client.GetStringAsync(url, ct);
                Interlocked.Increment(ref successCount);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed {url}: {ex.Message}");
            }
        });

        Console.WriteLine($"Successfully fetched {successCount}/{urls.Count}");
    }
}
```

### 8. SemaphoreSlim — Async Rate Limiting

```csharp
public class SemaphoreAsync
{
    private static readonly HttpClient client = new();

    public static async Task RunSemaphoreAsync()
    {
        var urls = Enumerable.Range(1, 50)
            .Select(i => $"https://httpbin.org/delay/1?id={i}")
            .ToList();

        using var semaphore = new SemaphoreSlim(5); // Max 5 concurrent
        var sw = Stopwatch.StartNew();

        var tasks = urls.Select(async url =>
        {
            await semaphore.WaitAsync();
            try
            {
                var response = await client.GetStringAsync(url);
                return response.Length;
            }
            finally
            {
                semaphore.Release();
            }
        });

        var results = await Task.WhenAll(tasks);

        sw.Stop();
        Console.WriteLine($"Fetched {results.Length} URLs in {sw.ElapsedMilliseconds}ms");
    }
}
```

### 9. IAsyncEnumerable — Async Streams

```csharp
public class AsyncStreamExample
{
    public static async IAsyncEnumerable<int> GenerateNumbersAsync(
        int count,
        [System.Runtime.CompilerServices.EnumeratorCancellation]
        CancellationToken cancellationToken = default)
    {
        for (int i = 0; i < count; i++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            await Task.Delay(100, cancellationToken);
            yield return i;
        }
    }

    public static async Task RunAsyncStreamAsync()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));

        try
        {
            await foreach (var num in GenerateNumbersAsync(100, cts.Token))
            {
                Console.WriteLine($"Received: {num}");
            }
        }
        catch (OperationCanceledException)
        {
            Console.WriteLine("Stream cancelled");
        }
    }
}
```

## How It Works

1. **`async`/`await`**: The C# compiler transforms an `async` method into a state machine. At each `await`, the method suspends and returns control to the caller. When the awaited task completes, the continuation resumes on a thread pool thread (or the synchronization context if one exists).
2. **`Task.WhenAll`**: Creates a task that completes when all input tasks complete. If any task throws, `WhenAll` re-throws the first exception. Tasks run concurrently on the thread pool.
3. **`Task.WhenAny`**: Returns the first task to complete (whether it succeeded, faulted, or was cancelled). Useful for timeouts and racing multiple sources.
4. **`CancellationTokenSource`**: Creates cancellation tokens that propagate to async operations. `Cancel()` triggers cancellation. `CancelAfter` auto-cancels after a delay. Async methods check `ThrowIfCancellationRequested()` or pass the token to downstream calls.
5. **`System.Threading.Channels`**: A thread-safe queue for async producer-consumer scenarios. `WriteAsync` blocks when the channel is full (bounded). `ReadAllAsync` returns an `IAsyncEnumerable` that yields items as they arrive.
6. **`Parallel.ForEachAsync`**: Introduced in .NET 6. Executes an async delegate for each item with bounded parallelism. `MaxDegreeOfParallelism` controls the concurrency limit.

## Variants

### TaskCompletionSource — Bridge Callbacks to Tasks

```csharp
public static Task<string> FromEventAsync()
{
    var tcs = new TaskCompletionSource<string>();

    // Some event-based API
    var timer = new System.Timers.Timer(1000);
    timer.Elapsed += (s, e) =>
    {
        timer.Dispose();
        tcs.SetResult("Timer fired");
    };
    timer.Start();

    return tcs.Task;
}

// Usage
var result = await FromEventAsync();
```

### ConfigureAwait(false)

```csharp
// In library code, use ConfigureAwait(false) to avoid
// capturing the synchronization context (improves performance
// and prevents deadlocks in UI apps)

public static async Task<string> FetchAsync(string url)
{
    using var client = new HttpClient();
    var response = await client.GetAsync(url).ConfigureAwait(false);
    return await response.Content.ReadAsStringAsync().ConfigureAwait(false);
}
```

### Async Lazy Initialization

```csharp
public class AsyncLazy<T>
{
    private readonly Lazy<Task<T>> _lazy;

    public AsyncLazy(Func<Task<T>> factory)
    {
        _lazy = new Lazy<Task<T>>(() => Task.Run(factory));
    }

    public Task<T> Value => _lazy.Value;
}

// Usage
var lazyConfig = new AsyncLazy<string>(LoadConfigAsync);
var config = await lazyConfig.Value; // Loads once, caches result
```

## Best Practices

- **Use `async`/`await` over `.Result` and `.Wait()`**: Blocking on async code can cause deadlocks, especially in applications with a synchronization context (ASP.NET classic, WPF, WinForms).
- **Use `ConfigureAwait(false)` in library code**: Prevents capturing the synchronization context, improving performance and avoiding deadlocks.
- **Pass `CancellationToken` through the call chain**: Every async method should accept and propagate a `CancellationToken`. Check it with `ThrowIfCancellationRequested()` in loops.
- **Use `Task.Run` only for CPU-bound work**: Don't use `Task.Run` for I/O-bound async methods — they already yield the thread. Use it to offload CPU work to the thread pool.
- **Prefer `Task.WhenAll` over sequential awaits**: `await task1; await task2;` runs sequentially. `await Task.WhenAll(task1, task2)` runs concurrently.
- **Use `SemaphoreSlim` for async rate limiting**: `SemaphoreSlim.WaitAsync` is async-friendly. `Semaphore` (the sync version) blocks the thread.

## Common Mistakes

- **Using `.Result` or `.Wait()`**: Blocks the thread and can deadlock. Always `await` async operations.
- **Missing `ConfigureAwait(false)` in libraries**: Captures the synchronization context unnecessarily, causing performance issues and potential deadlocks.
- **Not propagating `CancellationToken`**: If you accept a token but don't pass it to downstream calls, cancellation won't work.
- **Using `async void`**: `async void` methods can't be awaited and exceptions crash the process. Use `async Task` instead. The only exception is event handlers.
- **Forgetting to `Complete()` channel writers**: If you don't call `Writer.Complete()`, `ReadAllAsync` hangs forever waiting for more items.

## FAQ

**What is the difference between `Task` and `Task<T>`?**

`Task` represents an async operation with no return value (like `void`). `Task<T>` represents an async operation that returns a value of type `T`. Use `Task` for fire-and-forget operations and `Task<T>` when you need the result.

**Should I use `Task.Run` for async I/O methods?**

No. Async I/O methods already yield the thread while waiting. `Task.Run` would just add an unnecessary thread pool hop. Use `Task.Run` only for CPU-bound work that would block the async state machine.

**What is `ConfigureAwait(false)` and when should I use it?**

`ConfigureAwait(false)` tells the awaiter not to capture the current synchronization context. Use it in library code to improve performance and avoid deadlocks. In UI applications (WPF, WinForms), the synchronization context is the UI thread — capturing it means continuations run on the UI thread, which may not be desirable.

**How do channels compare to `BlockingCollection`?**

`System.Threading.Channels` is async-friendly — `WriteAsync` and `ReadAllAsync` don't block threads. `BlockingCollection` blocks threads, which is wasteful in async applications. Use channels for async producer-consumer patterns.

**What is `IAsyncEnumerable` and how does it differ from `Task<IEnumerable>`?**

`IAsyncEnumerable<T>` yields items asynchronously as they become available. `Task<IEnumerable<T>>` returns all items at once when the task completes. Use `IAsyncEnumerable` for streaming data (e.g., database rows, real-time events).

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
