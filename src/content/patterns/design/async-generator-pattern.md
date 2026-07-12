---





contentType: patterns
slug: async-generator-pattern
title: "Async Generator Pattern"
description: "Stream data lazily with async generators. Yield values one at a time as they become available, enabling memory-efficient processing of large or infinite data sequences."
metaDescription: "Stream data lazily with async generators. Yield values as they arrive, enabling memory-efficient processing of large or infinite data sequences."
difficulty: intermediate
topics:
  - concurrency
  - architecture
tags:
  - async-generator
  - pattern
  - design-pattern
  - streaming
  - lazy-evaluation
  - async-iteration
  - backpressure
relatedResources:
  - /patterns/reactive-streams-pattern
  - /patterns/producer-consumer-pattern
  - /patterns/thread-pool-pattern
  - /guides/complete-guide-go-concurrency
  - /guides/complete-guide-java-concurrency
  - /guides/complete-guide-python-asyncio-production
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Stream data lazily with async generators. Yield values as they arrive, enabling memory-efficient processing of large or infinite data sequences."
  keywords:
    - async generator pattern
    - lazy async iteration
    - streaming data python
    - pattern design





---

## Overview

Processing large datasets or continuous streams by loading everything into memory causes OOM errors and high latency. The Async Generator pattern produces values lazily: the consumer requests the next value and the generator yields it only when ready. This enables processing of infinite sequences, large files, or slow I/O sources with constant memory usage.

## When to Use

- Processing large files or datasets that do not fit in memory
- Consuming continuous data streams (WebSocket messages, SSE events, log tails)
- Paginated API fetching where you want a clean iteration interface
- You need backpressure: the consumer controls the pace of production
- Streaming database query results without loading the entire result set
- Processing real-time event streams from IoT devices or sensors
- You want a simpler alternative to reactive streams for basic async iteration

## When to Avoid

- **CPU-bound data processing.** Async generators run on a single event loop. CPU-heavy work blocks the loop. Use threads or processes instead.
- **You need complex stream composition.** Filtering, mapping, merging, and splitting streams is easier with reactive streams (RxJS, Project Reactor).
- **The data source is already in memory.** If you have an array, a regular generator or `for` loop is simpler and faster.
- **You need push-based delivery.** If the producer must push data to the consumer immediately (e.g., real-time alerts), use callbacks or reactive streams.
- **The consumer needs random access.** Generators are sequential — you cannot skip ahead or go back. Use an array or indexed data structure.

## Solution

### Python (async generators)

```python
import asyncio
import aiohttp

async def fetch_pages(base_url, total_pages, page_size=100):
    """Async generator that yields pages lazily."""
    async with aiohttp.ClientSession() as session:
        for offset in range(0, total_pages, page_size):
            url = f"{base_url}?offset={offset}&limit={page_size}"
            async with session.get(url) as response:
                data = await response.json()
                if not data:
                    break
                yield data

async def process_all():
    total = 0
    # Consumer controls the pace: each page is fetched only when iterated
    async for page in fetch_pages("https://api.example.com/items", 10000):
        for item in page:
            total += item["price"]
        print(f"Processed page, running total: {total}")

    print(f"Final total: {total}")

asyncio.run(process_all())
```

### JavaScript (async generators)

```javascript
async function* fetchPages(baseUrl, totalPages, pageSize = 100) {
  for (let offset = 0; offset < totalPages; offset += pageSize) {
    const url = `${baseUrl}?offset=${offset}&limit=${pageSize}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.length === 0) break;
    yield data;
  }
}

async function processAll() {
  let total = 0;
  // Consumer controls the pace: each page is fetched only when iterated
  for await (const page of fetchPages("https://api.example.com/items", 10000)) {
    for (const item of page) {
      total += item.price;
    }
    console.log(`Processed page, running total: ${total}`);
  }
  console.log(`Final total: ${total}`);
}

processAll();
```

### Java (Stream + reactive)

```java
import java.util.stream.Stream;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.URI;
import java.net.http.HttpResponse;
import com.fasterxml.jackson.databind.ObjectMapper;

public class AsyncGeneratorExample {

    private static final HttpClient client = HttpClient.newHttpClient();
    private static final ObjectMapper mapper = new ObjectMapper();

    // Lazy stream that fetches pages on demand
    static Stream<Item[]> fetchPages(String baseUrl, int totalPages, int pageSize) {
        return Stream.iterate(0, offset -> offset < totalPages, offset -> offset + pageSize)
            .map(offset -> {
                try {
                    String url = baseUrl + "?offset=" + offset + "&limit=" + pageSize;
                    HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .build();
                    HttpResponse<String> response = client.send(
                        request, HttpResponse.BodyHandlers.ofString()
                    );
                    return mapper.readValue(response.body(), Item[].class);
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            })
            .takeWhile(items -> items.length > 0);
    }

    public static void main(String[] args) {
        double total = fetchPages("https://api.example.com/items", 10000, 100)
            .flatMap(Stream::of)
            .mapToDouble(Item::getPrice)
            .peek(item -> System.out.println("Processing item: " + item.getId()))
            .sum();

        System.out.println("Final total: " + total);
    }
}
```

## Explanation

An async generator is a function that can pause execution and yield values one at a time. When the consumer requests the next value (via `async for` in Python, `for await` in JavaScript), the generator resumes execution, produces the next value, and pauses again.

This creates a pull-based model: the consumer asks for data, and the generator produces it on demand. The key benefit is **constant memory usage** regardless of the total data size. Whether you process 100 items or 10 million, the generator only holds one page in memory at a time.

The pattern also provides natural **backpressure**. If the consumer is slow, it simply does not request the next value. The generator waits. No buffering, no memory pressure, no dropped data.

## Variants

| Variant | Language | Use Case | Tradeoff |
|---------|----------|----------|----------|
| **Python async generator** | Python `async def` + `yield` | Native async iteration | Single-threaded event loop |
| **JS async generator** | JS `async function*` | Browser/Node.js streams | Single-threaded event loop |
| **Java Stream (lazy)** | Java `Stream` | Lazy sequential processing | Not truly async, blocking I/O |
| **Reactive Flux** | Project Reactor | Backpressure-aware streams | Steeper learning curve |
| **Chunked async generator** | Yield batches | Reduce per-item overhead | Higher latency per item |

## What Works

- Yield batches instead of individual items to reduce per-item overhead
- Always clean up resources (close sessions, file handles) in `finally` or context managers
- Use `asyncio.aclose()` / `return()` to properly close generators when done early
- Handle cancellation: check for `CancelledError` and clean up gracefully
- Set timeouts on I/O operations inside the generator to avoid hanging
- Combine with `asyncio.gather` for concurrent processing of yielded values
- Log progress periodically for long-running generators

## Common Mistakes

- **Collecting all yielded values into a list**: `list(async_generator())` loads everything into memory, defeating the purpose. Process values as you iterate.
- **Not closing the generator**: If you break out of an async for loop early, the generator stays suspended. Use `aclose()` to clean up.
- **Blocking I/O inside the generator**: Using `requests.get()` instead of `aiohttp` blocks the event loop. Use async I/O libraries.
- **No timeout on yielded operations**: A slow API call hangs the generator forever. Set timeouts.
- **Mixing sync and async iteration**: Using `for item in async_gen` instead of `async for item in async_gen` raises a TypeError.
- **Ignoring backpressure signals**: If the consumer is slow, the generator should not pre-fetch. Let the pull-based model work.

## How It Works

1. **Consumer requests next value**: The consumer calls `__anext__()` (Python) or `.next()` (JavaScript) on the async generator object. This resumes the generator's execution.
2. **Generator runs until next yield**: The generator executes its body, performing any awaited I/O operations. When it hits a `yield`, it pauses and returns the yielded value to the consumer.
3. **Consumer processes the value**: The consumer handles the value — transforms it, writes it somewhere, accumulates a result. The generator remains paused, holding minimal state.
4. **Repeat or stop**: The consumer requests the next value, or stops iterating (via `break`, `aclose()`, or `return()`). When the generator function returns, `StopAsyncIteration` signals the end.

This pull-based model means the generator never produces data faster than the consumer can handle. Memory usage stays constant regardless of data volume.

## Best Practices


- For a deeper guide, see [Reactive Streams Pattern](/patterns/reactive-streams-pattern/).

- **Yield batches, not individual items.** If you fetch 100 items per API page, yield all 100 as a list. This reduces the number of async context switches and improves throughput.
- **Use context managers for resource cleanup.** Wrap HTTP sessions, database connections, and file handles in `async with` blocks. This guarantees cleanup even if the consumer breaks early.
- **Set per-operation timeouts.** Each `await` inside the generator should have a timeout. A hung API call blocks the entire generator and the consumer.
- **Handle `CancelledError` explicitly.** If the consumer cancels the generator, catch `CancelledError`, clean up resources, and re-raise. Do not swallow cancellation.
- **Prefer `async for` over manual `__anext__` calls.** The `async for` loop handles `StopAsyncIteration` automatically and is more readable.

## Real-World Examples

### Paginated API Consumption (Python)

A data pipeline fetches millions of records from a REST API with pagination. An async generator yields one page at a time. The consumer writes each page to a database. Memory stays flat at ~one page size regardless of total records. Without async generators, the pipeline would need to load all pages into memory or use complex callback patterns.

### Server-Sent Events Processing (JavaScript)

A browser app connects to a Server-Sent Events endpoint. An async generator wraps the EventSource, yielding each event as it arrives. The UI updates incrementally. The generator handles reconnection logic internally, transparent to the consumer.

### Log Stream Processing (Node.js)

A log analytics service tails log files using `fs.createReadStream` wrapped in an async generator. Each yielded chunk is parsed and sent to an analytics backend. The generator applies natural backpressure — it only reads more data when the analytics backend is ready for the next chunk.

## FAQ

**Q: How is an async generator different from a regular generator?**
A: A regular generator (`yield`) produces values synchronously. An async generator (`async yield`) can await inside the generator body, making it suitable for I/O-bound data sources like APIs, databases, and files.

**Q: Can I use async generators with threading?**
A: Async generators run on a single event loop. For CPU-bound processing of yielded values, use `run_in_executor` (Python) or worker threads (Node.js) to offload computation while keeping I/O async.

**Q: What is the difference between async generators and reactive streams?**
A: Async generators are pull-based: the consumer requests the next value. Reactive streams (RxJS, Project Reactor) are push-based: the producer pushes values and the consumer applies backpressure. Async generators are simpler; reactive streams offer richer composition operators.

**Q: How do I handle errors in an async generator?**
A: Exceptions raised inside the generator propagate to the consumer. Wrap the `async for` loop in `try/except` (Python) or `try/catch` (JavaScript). The generator is automatically closed when an exception propagates.

**Q: Can async generators be infinite?**
A: Yes. A generator that never returns and keeps yielding values is valid. The consumer controls when to stop iterating. This is useful for continuous streams like WebSocket messages or sensor data.

**Q: How do I compose multiple async generators?**
A: Chain them with `yield*` (Python) or `yield*` (JavaScript). Create a generator that iterates another generator and transforms each value. This is the async equivalent of function composition. For complex pipelines, consider reactive streams instead.

**Q: What is the memory overhead of an async generator?**
A: Minimal. The generator object holds its execution state (local variables, instruction pointer) — typically a few hundred bytes. Each yielded value is held only until the consumer processes it. No accumulation unless the consumer collects values.

**Q: How do I cancel an async generator mid-iteration?**
A: In Python, use `await gen.aclose()`. In JavaScript, call `gen.return()`. Both clean up resources and close the generator. If you break out of a `for await` loop, call `return()` explicitly to avoid resource leaks.

**Q: Can I parallelize async generator consumption?**
A: Yes, but carefully. Use `asyncio.gather` to process multiple yielded values concurrently. However, this breaks the pull-based backpressure model — you are buffering values. For true parallel processing, use a producer-consumer pattern with a bounded queue instead.

**Q: How do async generators work with database cursors?**
A: Wrap the cursor in an async generator. Each `yield` fetches a batch from the cursor. This streams large result sets without loading everything into memory. Close the cursor in a `finally` block or context manager.

**Q: What is the difference between async generators and Node.js streams?**
A: Node.js streams are push-based with backpressure via `pipe()`. Async generators are pull-based. Node.js streams have more built-in features (encoding, object mode, flushing). Async generators are simpler and more composable. In modern Node.js, `stream.Readable.from(asyncGenerator)` bridges the two.

**Q: How do I test async generators?**
A: Iterate the generator in a test and collect results. Use `async for` (Python) or `for await` (JavaScript) to consume all values. Test error cases by throwing inside the generator and verifying the exception propagates. Test early termination by breaking out of the loop and checking resources are cleaned up.

**Q: Can I use async generators with GraphQL subscriptions?**
A: Yes. GraphQL subscriptions return async iterables. An async generator can yield subscription events as they arrive. Apollo Server supports async iterators for subscriptions natively.

**Q: How do async generators interact with structured concurrency?**
A: In Python 3.11+, `asyncio.TaskGroup` manages concurrent tasks. You can spawn a task that consumes an async generator within a task group. If the generator raises an exception, the task group cancels other tasks. This provides structured error handling for async pipelines.

**Q: Can I use async generators for file uploads?**
A: Yes. Wrap the upload stream in an async generator that yields chunks. The consumer writes chunks to storage (S3, local disk). This handles large uploads without buffering the entire file in memory. Express.js and FastAPI support this pattern for multipart uploads.

**Q: How do I handle rate limiting inside an async generator?**
A: Track the time of the last API call. Before each `yield`, check if enough time has passed. If not, `await asyncio.sleep(remaining_time)`. This implements client-side rate limiting without buffering. For token bucket rate limiting, use a shared counter.

**Q: What is `aclose()` and when should I use it?**
A: `aclose()` is the async equivalent of `close()` for regular generators. It throws `GeneratorExit` into the generator, triggering any `finally` blocks for cleanup. Use it when you break out of an `async for` loop early, or when you want to cancel a generator that is waiting on I/O.

**Q: Can I use async generators with Python's `asyncio.Queue`?**
A: Yes. A generator can yield values from an `asyncio.Queue`: `while True: yield await queue.get()`. This combines the pull-based generator model with push-based queue insertion. The producer pushes to the queue, the consumer pulls via the generator.

**Q: How do I debug an async generator that hangs?**
A: Add logging before each `await` and `yield`. Set timeouts on all I/O operations. Use `asyncio.get_event_loop().debug = True` to enable debug mode, which logs slow callbacks. Check for blocking I/O — `requests.get()` instead of `aiohttp` is the most common cause.

**Q: Are async generators supported in all browsers?**
A: Async iteration (`for await...of`) is supported in all modern browsers (Chrome 63+, Firefox 57+, Safari 11+). For older browsers, use Babel with `@babel/plugin-proposal-async-iteration` to transpile to ES5 with regenerator runtime.

**Q: How do async generators handle backpressure compared to Node.js streams?**
A: Async generators have natural backpressure: the consumer pulls values at its own pace, so the generator never outpaces the consumer. Node.js streams use a push model with `highWaterMark` — the producer pushes until the buffer fills, then waits for `drain`. Async generators are simpler but lack the buffering and piping machinery of Node.js streams.

**Q: Can I use async generators with Python's `asyncio.timeout`?**
A: Yes, in Python 3.11+ use `async with asyncio.timeout(seconds)` around the `async for` loop. This cancels the generator if it takes too long. For older Python versions, use `asyncio.wait_for` to wrap each iteration. The generator receives `CancelledError` and can clean up resources in a `finally` block.

**Q: How do I compose async generators with `yield from`?**
A: In Python, `yield from` delegates to a sub-generator: `yield from another_async_gen()`. This chains generators without manual iteration. In JavaScript, use `yield*` with `async function*`: `yield* anotherAsyncGen()`. This is useful for wrapping a generator with logging or transformation logic while preserving the pull-based model.
