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
lastUpdated: "2026-08-22"
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

The [Pipes and Filters](/patterns/pipes-and-filters-pattern/) Pattern takes a complex processing job
and breaks it into small, independent steps. The trick is that each step, called a filter, takes in
data, transforms it, and hands it off to the next one through a pipe. Pipes are just connectors — in
code, they
can be as simple as function composition or as complex as queues and streams. Filters end up
reusable,
composable, and easy to test in isolation. You'll see this pattern a lot in data processing
pipelines,
ETL workflows, and request/response transformation chains.

## When to Use

Pipes and Filters works well when a task naturally splits into sequential, independent steps that
you
might want to reorder, add, or remove without rewriting everything. It's a good choice when the same
transformation shows up in different pipelines, or when you want to unit test each step on its own.
ETL jobs, data enrichment, and request/response transformation chains are common fits.

## When NOT to Use

Don't reach for this pattern when the workflow is just two or three fixed steps that never change —
a
plain function is simpler. If the steps are tightly coupled and can't be separated into clean inputs
and outputs, Pipes and Filters will fight you. And if you need a handler to decide whether to stop
processing, [Chain of Responsibility](/patterns/chain-of-responsibility-pattern/) is usually a
better
fit.

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

The pattern decomposes a big job into self-contained components. Think of a filter as a single
processing step: it takes input, transforms it, and passes output along. The best filters are pure
functions with no
side
effects. A pipe is what connects one filter to the next. In simple cases it's just function
composition; in bigger
systems it can be a queue, channel, or stream. A pipeline is a chain of filters connected by pipes,
and
because a pipeline itself behaves like a filter, you can compose pipelines into larger pipelines.
That
composability also means you can reorder, add, or remove filters to build new pipelines without
touching
existing ones.

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

- Keep filters pure — no side effects and no shared mutable state — so they stay testable and
    composable.
- Make each filter do one thing. A filter that performs a single transformation is easier to read,
    test, and reuse.
- Use type signatures to document the contract between filters.
- Handle errors at the pipeline level rather than inside each filter, so failures don't get hidden.
- Build pipelines dynamically with a builder or configuration when the order isn't fixed.
- Test filters in isolation; pure functions are straightforward to unit test.
- Insert logging filters between processing steps for debugging without changing business logic.

## Common Mistakes

- **Making filters stateful**. Shared state breaks composability and makes tests harder.
- **Putting side effects in filters**. Writing to a database or calling an API from a filter makes
    the pipeline non-deterministic.
- **Ignoring errors**. One unhandled failure in a filter can crash the whole pipeline.
- **Hardcoding filter order**. Use a builder or configuration so the pipeline can evolve.
- **Overloading a filter**. When a filter tries to do several transformations, it becomes harder to
    test and reuse.
- **Skipping types on filter inputs/outputs**. Runtime type mismatches become painful to debug.
- **Forgetting backpressure in streaming pipelines**. Slow filters can cause memory to build up in
    pipes.

## FAQ

### How is this different from Chain of Responsibility?

In Chain of Responsibility, each handler decides whether to pass the request along or stop. In Pipes
and
Filters, every filter processes the data and passes it to the next. Pipes and Filters is about
transformation; Chain of Responsibility is about handling. See
[Chain of Responsibility Pattern](/patterns/chain-of-responsibility-pattern/) for the distinction.

### Should I use this or a simple function?

Use Pipes and Filters when the order may change, the same filters show up in more than one pipeline,
or
you need to test each step on its own. If the task is two or three fixed steps that never change, a
plain
function is usually enough.

### How do I handle branching in a pipeline?

Use a router filter that sends data to different sub-pipelines based on a condition. The router is
itself
a filter — it receives input, evaluates a condition, and routes to the right sub-pipeline.

### How do I handle errors in a pipeline?

Wrap the whole pipeline in a try/catch or use a result type such as `Result<T, E>`. Let the caller
decide
how to handle a failed step. Avoid catching errors inside individual filters, or you'll hide
failures.

### When should I use an async or parallel pipeline?

Use an async pipeline when filters wait on I/O. Use a parallel pipeline when filters are CPU-bound
and
can run independently. For real-time streams, use a streaming pipeline with backpressure handling.
