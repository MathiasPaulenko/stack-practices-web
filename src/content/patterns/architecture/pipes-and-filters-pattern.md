---
contentType: patterns
slug: pipes-and-filters-pattern
title: "Pipes and Filters Pattern"
description: "Chain processing steps with independent filters connected by pipes. A pattern for data transformation pipelines where each step is reusable and composable."
metaDescription: "Learn the Pipes and Filters Pattern in Python, Java, and JavaScript. Chain independent processing steps with composable data transformation pipelines."
difficulty: intermediate
topics:
  - architecture
  - design
tags:
  - design-pattern
  - pipeline
  - data-processing
  - composability
  - python
  - javascript
  - java
relatedResources:
  - /patterns/chain-of-responsibility-pattern
  - /patterns/observer-pattern
  - /patterns/back-pressure-pattern
  - /patterns/marker-interface-pattern
  - /guides/complete-guide-kafka-stream-processing
  - /patterns/static-content-hosting-pattern
lastUpdated: "2026-08-19"
publishedAt: "2026-07-02"
author: Mathias Paulenko
seo:
  metaDescription: "Learn the Pipes and Filters Pattern in Python, Java, and JavaScript. Chain independent processing steps with composable data transformation pipelines."
  keywords:
    - pipes and filters pattern
    - design pattern
    - pipeline pattern
    - data transformation
    - composable filters
    - python pipeline
    - java pipeline
    - javascript pipeline
---

## Overview

The [Pipes and Filters](/patterns/pipes-and-filters-pattern/) Pattern breaks a complex processing
task into a sequence of smaller, independent steps (filters) connected by channels (pipes). Each
filter receives input, performs a transformation, and passes output to the next pipe. Filters are
reusable, composable, and testable in isolation. This pattern is ideal for data processing
pipelines, ETL workflows, and request/response transformation chains.

## When to Use

- A complex task can be broken into sequential, independent steps.
- You need to reorder, add, or remove processing steps without rewriting code.
- Steps are reusable across different pipelines.
- You want to test each transformation in isolation.
- You're building ETL, data processing, or request/response transformation pipelines.

## When NOT to Use

- A fixed sequence of 2-3 simple steps that never changes — a plain function is enough.
- Steps are tightly coupled and can't be separated into clean inputs and outputs.
- You need a handler to decide whether to stop processing — [Chain of
  Responsibility](/patterns/chain-of-responsibility-pattern/) fits better.

## Solution

### Python

```python
from typing import Callable, Any
from dataclasses import dataclass

Filter = Callable[[Any], Any]

def pipe(*filters: Filter) -> Filter:
    def pipeline(data: Any) -> Any:
        result = data
        for f in filters:
            result = f(result)
        return result
    return pipeline

# Filters — each is a pure function
def parse_csv(raw: str) -> list[dict]:
    lines = raw.strip().split("\n")
    headers = lines[0].split(",")
    return [
        dict(zip(headers, line.split(",")))
        for line in lines[1:]
    ]

def filter_active(records: list[dict]) -> list[dict]:
    return [r for r in records if r.get("status") == "active"]

def normalize_emails(records: list[dict]) -> list[dict]:
    for r in records:
        r["email"] = r.get("email", "").lower().strip()
    return records

def deduplicate(records: list[dict]) -> list[dict]:
    seen = set()
    result = []
    for r in records:
        key = r.get("email")
        if key not in seen:
            seen.add(key)
            result.append(r)
    return result

def to_json(records: list[dict]) -> str:
    import json
    return json.dumps(records, indent=2)

# Compose a pipeline
process_users = pipe(
    parse_csv,
    filter_active,
    normalize_emails,
    deduplicate,
    to_json,
)

# Usage
raw_data = """name,email,status
Alice,ALICE@Example.COM,active
Bob,bob@example.com,inactive
Charlie,CHARLIE@example.com,active
Alice,alice@example.com,active"""

result = process_users(raw_data)
print(result)
```

### JavaScript

```javascript
function pipe(...filters) {
    return (data) => filters.reduce((acc, fn) => fn(acc), data);
}

// Filters — each is a pure function
function parseCsv(raw) {
    const lines = raw.trim().split("\n");
    const headers = lines[0].split(",");
    return lines.slice(1).map((line) => {
        const values = line.split(",");
        return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    });
}

function filterActive(records) {
    return records.filter((r) => r.status === "active");
}

function normalizeEmails(records) {
    return records.map((r) => ({
        ...r,
        email: (r.email || "").toLowerCase().trim(),
    }));
}

function deduplicate(records) {
    const seen = new Set();
    return records.filter((r) => {
        if (seen.has(r.email)) return false;
        seen.add(r.email);
        return true;
    });
}

function toJson(records) {
    return JSON.stringify(records, null, 2);
}

// Compose a pipeline
const processUsers = pipe(
    parseCsv,
    filterActive,
    normalizeEmails,
    deduplicate,
    toJson
);

// Usage
const rawData = `name,email,status
Alice,ALICE@Example.COM,active
Bob,bob@example.com,inactive
Charlie,CHARLIE@example.com,active
Alice,alice@example.com,active`;

console.log(processUsers(rawData));
```

### Java

```java
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

public class PipesAndFilters {

    @FunctionalInterface
    interface Filter<T, R> extends Function<T, R> {}

    static <T> Filter<T, T> pipe(Filter<T, T>... filters) {
        return data -> {
            T result = data;
            for (Filter<T, T> f : filters) {
                result = f.apply(result);
            }
            return result;
        };
    }

    // Filters
    static Filter<String, List<Map<String, String>>> parseCsv = raw -> {
        String[] lines = raw.trim().split("\n");
        String[] headers = lines[0].split(",");
        return Arrays.stream(lines, 1, lines.length)
            .map(line -> {
                String[] values = line.split(",");
                Map<String, String> record = new LinkedHashMap<>();
                for (int i = 0; i < headers.length; i++) {
                    record.put(headers[i], values[i]);
                }
                return record;
            })
            .collect(Collectors.toList());
    };

    static Filter<List<Map<String, String>>, List<Map<String, String>>> filterActive =
        records -> records.stream()
            .filter(r -> "active".equals(r.get("status")))
            .collect(Collectors.toList());

    static Filter<List<Map<String, String>>, List<Map<String, String>>> normalizeEmails =
        records -> records.stream()
            .map(r -> {
                r.put("email", r.get("email").toLowerCase().trim());
                return r;
            })
            .collect(Collectors.toList());

    static Filter<List<Map<String, String>>, List<Map<String, String>>> deduplicate =
        records -> {
            Set<String> seen = new HashSet<>();
            return records.stream()
                .filter(r -> seen.add(r.get("email")))
                .collect(Collectors.toList());
        };

    public static void main(String[] args) {
        String rawData = "name,email,status\n" +
            "Alice,ALICE@Example.COM,active\n" +
            "Bob,bob@example.com,inactive\n" +
            "Charlie,CHARLIE@example.com,active";

        var pipeline = pipe(parseCsv, filterActive, normalizeEmails, deduplicate);

        List<Map<String, String>> result = pipeline.apply(rawData);
        result.forEach(System.out::println);
    }
}
```

### Async pipeline (Python)

```python
import asyncio
from typing import Any, Callable, Awaitable

AsyncFilter = Callable[[Any], Awaitable[Any]]

async def async_pipe(*filters: AsyncFilter) -> AsyncFilter:
    async def pipeline(data: Any) -> Any:
        result = data
        for f in filters:
            result = await f(result)
        return result
    return pipeline

async def fetch_data(url: str) -> dict:
    await asyncio.sleep(0.1)  # simulate HTTP
    return {"url": url, "status": 200, "body": "raw data"}

async def parse_data(raw: dict) -> dict:
    await asyncio.sleep(0.05)
    raw["parsed"] = raw["body"].upper()
    return raw

async def validate_data(data: dict) -> dict:
    await asyncio.sleep(0.05)
    if data["status"] != 200:
        raise ValueError(f"Bad status: {data['status']}")
    data["valid"] = True
    return data

async def enrich_data(data: dict) -> dict:
    await asyncio.sleep(0.05)
    data["enriched"] = f"ENRICHED:{data['parsed']}"
    return data

async def main():
    pipeline = await async_pipe(fetch_data, parse_data, validate_data, enrich_data)
    result = await pipeline("https://api.example.com/data")
    print(result)

asyncio.run(main())
```

## Explanation

The Pipes and Filters Pattern decomposes processing into independent components:

- **Filter**: a processing step that receives input, transforms it, and produces output. The best
  filters are pure functions with no side effects.
- **Pipe**: the connector between filters. In its simplest form, it's function composition. In
  more complex systems, it can be a queue, channel, or stream.
- **Pipeline**: a sequence of filters connected by pipes. A pipeline is itself a filter, so it can
  be composed into larger pipelines.
- **Composability**: filters can be reordered, added, or removed. New pipelines are built by
  combining existing filters in different orders.

## Variants

| Variant | Execution | Use Case |
| --- | --- | --- |
| Synchronous pipeline | Sequential, blocking | Simple data transformation |
| Async pipeline | Non-blocking, concurrent | I/O-bound processing (HTTP, DB) |
| Parallel pipeline | Filters run in parallel | CPU-bound transformations |
| Streaming pipeline | Event-driven, continuous | Real-time data streams |
| Batch pipeline | Process in chunks | ETL, scheduled data processing |

For real-time streaming, watch out for slow filters. The [Back Pressure
Pattern](/patterns/back-pressure-pattern/) shows how to keep fast producers from overwhelming slow
consumers.

## Best Practices

- Keep filters pure — no side effects, no shared mutable state. This makes them testable and
  composable.
- Make filters single-responsibility — each filter does one transformation.
- Use type signatures — input and output types document the contract.
- Handle errors at the pipeline level — wrap the pipeline in error handling rather than each
  filter.
- Add filters conditionally — use a builder or configuration to construct pipelines dynamically.
- Test filters in isolation — pure functions are easy to unit test.
- Log between filters — insert logging filters for debugging without modifying processing filters.

## Common Mistakes

- Making filters stateful — breaks composability and makes testing harder.
- Filters with side effects (writing to a database, calling APIs) — makes the pipeline
  non-deterministic.
- Not handling errors — one filter failure can crash the entire pipeline.
- Hardcoding filter order — use a builder or configuration to allow reordering.
- Filters that do too much — a filter should do one transformation.
- Not typing filter inputs/outputs — runtime errors from type mismatches are hard to debug.
- Ignoring backpressure in streaming pipelines — slow filters cause memory buildup in pipes.

## FAQ

### How is this different from Chain of Responsibility?

In Chain of Responsibility, each handler decides whether to pass the request along or stop. In
Pipes and Filters, every filter processes the data and passes it to the next. Pipes and Filters is
about transformation; Chain of Responsibility is about handling. See
[Chain of Responsibility Pattern](/patterns/chain-of-responsibility-pattern/) for the distinction.

### Should I use this or a simple function?

Use Pipes and Filters when you need to reorder steps, reuse filters across pipelines, or test
steps in isolation. For a fixed sequence of two or three steps that never changes, a simple
function is enough.

### How do I handle branching in a pipeline?

Use a router filter that sends data to different sub-pipelines based on a condition. The router is
itself a filter — it receives input, evaluates a condition, and routes to the appropriate
sub-pipeline.

### How do I handle errors in a pipeline?

Wrap the whole pipeline in a try/catch or use a result type (e.g., `Result<T, E>`). Let the caller
decide how to handle a failed step. Avoid catching errors inside individual filters so you don't
hide failures.

### When should I use an async or parallel pipeline?

Use an async pipeline when filters wait on I/O. Use a parallel pipeline when filters are
CPU-bound and can run independently. For real-time streams, use a streaming pipeline with
backpressure handling.
