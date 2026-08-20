---
contentType: patterns
slug: async-generator-pattern
title: "Async Generator Pattern for Lazy Streaming"
description: "Stream data lazily with async generators. Yield values one at a time as they become available, enabling memory-efficient processing of large or infinite data sequences."
metaDescription: "Stream data lazily with async generators in Python, JavaScript and Java. Yield values as they arrive for memory-efficient processing of large or infinite data sequences."
difficulty: intermediate
topics:
  - concurrency
  - architecture
tags:
  - async
  - pattern
  - design-pattern
  - streaming
  - backpressure
  - python
  - javascript
  - java
relatedResources:
  - /patterns/reactive-streams-pattern
  - /patterns/producer-consumer-pattern
  - /patterns/thread-pool-pattern
  - /guides/complete-guide-python-asyncio-production
  - /guides/complete-guide-java-concurrency
  - /guides/complete-guide-go-concurrency
lastUpdated: "2026-08-19"
publishedAt: "2026-07-05"
author: Mathias Paulenko
seo:
  metaDescription: "Stream data lazily with async generators in Python, JavaScript and Java. Yield values as they arrive for memory-efficient processing of large or infinite data sequences."
  keywords:
    - async generator pattern
    - lazy async iteration
    - streaming data python
    - pattern design
---

## Overview

Loading an entire dataset into memory causes out-of-memory errors and high
latency. The Async Generator pattern produces values lazily: the consumer asks
for the next value and the generator yields it only when it's ready. This makes
it possible to process infinite sequences, large files, or slow I/O sources with
constant memory usage.

## When to Use

- Processing files or datasets that don't fit in memory.
- Consuming continuous data streams, such as WebSocket messages, SSE events, or
  log tails.
- Fetching paginated APIs through a clean iteration interface.
- You need backpressure: the consumer controls the producer's pace.
- Streaming database results without loading the full result set.

### When to avoid

- CPU-bound processing. Async generators run on a single event loop, so heavy
  computation blocks it. Use worker threads or processes instead.
- Complex stream composition. Filtering, mapping, merging, and splitting are
  easier with reactive streams like RxJS or Project Reactor.
- The data source is already in memory. Use a regular generator or a `for` loop.
- The consumer needs random access. Generators are sequential.

## Solution

### Python

```python
import asyncio
import aiohttp

async def fetch_pages(base_url, total_pages, page_size=100):
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
    async for page in fetch_pages("https://api.example.com/items", 10000):
        for item in page:
            total += item["price"]
        print(f"Processed page, running total: {total}")

    print(f"Final total: {total}")

asyncio.run(process_all())
```

### JavaScript

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

### Java (lazy Stream)

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import java.util.stream.Stream;
import com.fasterxml.jackson.databind.ObjectMapper;

public class LazyStream {

    private static final HttpClient client = HttpClient.newHttpClient();
    private static final ObjectMapper mapper = new ObjectMapper();

    public static Stream<Item[]> fetchPages(String baseUrl, int totalPages, int pageSize) {
        return Stream.iterate(0, offset -> offset < totalPages, offset -> offset + pageSize)
            .map(offset -> {
                try {
                    String url = baseUrl + "?offset=" + offset + "&limit=" + pageSize;
                    HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).build();
                    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                    return mapper.readValue(response.body(), Item[].class);
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            })
            .takeWhile(items -> items.length > 0);
    }
}
```

Java Streams are lazy but not truly async. For non-blocking async iteration, use
[Project Reactor](https://projectreactor.io/) `Flux`.

## Explanation

An async generator pauses execution at each `yield` and resumes when the consumer
asks for the next value. The consumer drives the flow with `async for` in Python
or `for await` in JavaScript. This creates a **pull-based model**: data is
produced only when requested.

The main benefit is **constant memory usage**. Whether you process 100 items or
10 million, the generator holds only the current value or batch. It also
gives you natural **backpressure**: if the consumer is slow, the generator simply
waits.

## Variants

| Variant | Language | Use case | Tradeoff |
| --- | --- | --- | --- |
| Async generator | Python `async def` + `yield` | Native async I/O iteration | Single event loop |
| Async generator | JavaScript `async function*` | Browser/Node.js streams | Single event loop |
| Lazy `Stream` | Java `Stream` | Lazy sequential I/O | Blocking by default |
| `Flux` | Project Reactor | Backpressure-aware async streams | Extra dependency |
| Batches | Python/JS `yield` lists | Reduce per-item overhead | Higher latency per batch |

## Best Practices

- Yield batches instead of individual items to reduce context-switching overhead.
- Clean up resources in `finally` blocks or context managers so sessions and
  cursors close even if the consumer breaks early.
- Set timeouts on every I/O `await` to avoid a hung call blocking the generator.
- Handle cancellation explicitly. In Python, `await gen.aclose()`; in JavaScript,
  call `gen.return()`.
- Prefer `async for` over manual `__anext__` or `.next()` calls.
- Log progress for long-running generators, but not on every yield.
- Use bounded queues or a producer-consumer setup when you need parallel
  processing, because `asyncio.gather` on yielded values breaks backpressure.

## Common Mistakes

- Collecting all values into a list with `list(async_generator())`. This loads
  everything into memory and defeats the purpose.
- Not closing the generator when breaking out of the loop early, which can leak
  sessions or connections.
- Using blocking I/O inside the generator, such as Python `requests.get()`
  instead of `aiohttp`.
- Mixing sync and async iteration. Use `async for` / `for await`, not a regular
  `for`.
- Ignoring backpressure by pre-fetching pages ahead of the consumer.
- Running CPU-heavy work inside the generator and blocking the event loop.

## FAQ

### How is an async generator different from a regular generator?

A regular generator uses `yield` synchronously. An async generator uses `async
def` and `yield` and can `await` I/O, making it suitable for APIs, databases,
and files.

### Can async generators be infinite?

Yes. A generator that never returns keeps yielding. The consumer controls when
to stop with `break` or by closing the generator. This is useful for WebSocket
messages or sensor streams.

### How do I cancel an async generator mid-iteration?

In Python, use `await gen.aclose()`. In JavaScript, call `await gen.return()`.
Both run cleanup code in `finally` blocks.

### What is the difference between async generators and reactive streams?

Async generators are pull-based: the consumer requests each value. Reactive
streams are push-based: the producer pushes values and the consumer applies
backpressure. Generators are simpler; reactive streams offer richer composition
and buffering.

### How do I handle errors inside the generator?

Exceptions raised inside the generator propagate to the consumer. Wrap the
`async for` loop in `try/except` or `try/catch`. The generator closes
automatically when an exception propagates.

### How do I compose multiple generators?

In Python, use `yield from another_async_gen()`. In JavaScript, use `yield*
anotherAsyncGen()`. This chains generators while preserving the pull-based model.

### How do I test async generators?

Consume the generator with `async for` or `for await` and collect a small number
of results. Test early termination by breaking out of the loop and verifying that
resources are released.
