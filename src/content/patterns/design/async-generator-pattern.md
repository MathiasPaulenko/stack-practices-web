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
  - /patterns/design/reactive-streams-pattern
  - /patterns/design/producer-consumer-pattern
  - /patterns/design/thread-pool-pattern
lastUpdated: "2026-07-04"
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

## FAQ

### How is an async generator different from a regular generator?

A regular generator (`yield`) produces values synchronously. An async generator (`async yield`) can await inside the generator body, making it suitable for I/O-bound data sources like APIs, databases, and files.

### Can I use async generators with threading?

Async generators run on a single event loop. For CPU-bound processing of yielded values, use `run_in_executor` (Python) or worker threads (Node.js) to offload computation while keeping I/O async.

### What is the difference between async generators and reactive streams?

Async generators are pull-based: the consumer requests the next value. Reactive streams (RxJS, Project Reactor) are push-based: the producer pushes values and the consumer applies backpressure. Async generators are simpler; reactive streams offer richer composition operators.

### How do I handle errors in an async generator?

Exceptions raised inside the generator propagate to the consumer. Wrap the `async for` loop in `try/except` (Python) or `try/catch` (JavaScript). The generator is automatically closed when an exception propagates.

### Can async generators be infinite?

Yes. A generator that never returns and keeps yielding values is valid. The consumer controls when to stop iterating. This is useful for continuous streams like WebSocket messages or sensor data.
