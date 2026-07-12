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
  - pipes-and-filters
  - pattern
  - design-pattern
  - pipeline
  - data-transformation
  - composable
  - python
  - javascript
  - java
relatedResources:
  - /patterns/chain-of-responsibility-pattern
  - /patterns/observer-pattern
  - /patterns/back-pressure-pattern
  - /patterns/multi-tenant-data-isolation-pattern
  - /patterns/marker-interface-pattern
  - /guides/complete-guide-kafka-stream-processing
  - /guides/complete-guide-microservices-communication
lastUpdated: "2026-07-02"
author: "StackPractices"
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

# Pipes and Filters Pattern

## Overview

The [Pipes and Filters](/patterns/architecture/pipes-and-filters-pattern) Pattern breaks a complex processing task into a sequence of smaller, independent steps (filters) connected by channels (pipes). Each filter receives input, performs a transformation, and passes output to the next pipe. Filters are reusable, composable, and testable in isolation. This pattern is ideal for data processing pipelines, ETL workflows, and request transformation chains.

## When to Use

Use the Pipes and Filters Pattern when:
- A complex task can be broken into sequential, independent steps
- You need to reorder, add, or remove processing steps without rewriting code
- Steps are reusable across different pipelines
- You want to test each transformation in isolation
- You are building ETL, data processing, or request/response transformation pipelines

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

### Async Pipeline (Python)

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

- **Filter**: A processing step that receives input, transforms it, and produces output. Filters are pure functions — no side effects, no shared state.
- **Pipe**: The connector between filters. In the simplest form, it is function composition. In more complex systems, it can be a queue, channel, or stream.
- **Pipeline**: A sequence of filters connected by pipes. The pipeline is itself a filter — it can be composed into larger pipelines.
- **Composability**: Filters can be reordered, added, or removed. New pipelines can be built by combining existing filters in different orders.

## Variants

| Variant | Execution | Use Case |
|---------|-----------|----------|
| **Synchronous Pipeline** | Sequential, blocking | Simple data transformation |
| **Async Pipeline** | Non-blocking, concurrent | I/O-bound processing (HTTP, DB) |
| **Parallel Pipeline** | Filters run in parallel | CPU-bound transformations |
| **Streaming Pipeline** | Event-driven, continuous | Real-time data streams |
| **Batch Pipeline** | Process in chunks | ETL, scheduled data processing |

## What Works

- **Keep filters pure** — no side effects, no shared mutable state. This makes them testable and composable.
- **Make filters single-responsibility** — each filter does one transformation. Small filters are easier to reuse.
- **Use type signatures** — input and output types document the contract. Mismatches are caught at composition time.
- **Handle errors at the pipeline level** — wrap the pipeline in error handling, not each filter.
- **Add filters conditionally** — use a builder pattern to construct pipelines dynamically based on configuration.
- **Test filters in isolation** — each filter is a pure function, so unit testing is trivial.
- **Log between filters** — insert logging filters for debugging without modifying processing filters.

## Common Mistakes

- Making filters stateful — breaks composability and makes testing harder
- Filters with side effects (writing to DB, calling APIs) — violates purity, makes pipeline non-deterministic
- Not handling errors — one filter failure crashes the entire pipeline with no recovery
- Hardcoding filter order — use a builder or configuration to allow reordering
- Filters that do too much — a filter should do one transformation, not five
- Not typing filter inputs/outputs — runtime errors from type mismatches are hard to debug
- Ignoring backpressure in streaming pipelines — slow filters cause memory buildup in pipes

## Frequently Asked Questions

**Q: How is this different from Chain of Responsibility?**
A: In Chain of Responsibility, each handler decides whether to pass the request along or stop. In Pipes and Filters, every filter processes the data and passes it to the next. Pipes and Filters is about transformation; Chain of Responsibility is about handling.

**Q: Should I use this or a simple function?**
A: Use Pipes and Filters when you need to reorder steps, reuse filters across pipelines, or test steps in isolation. For a fixed sequence of 2-3 steps that never changes, a simple function is simpler and sufficient.

**Q: How do I handle branching in a pipeline?**
A: Use a router filter that sends data to different sub-pipelines based on a condition. The router is itself a filter — it receives input, evaluates a condition, and routes to the appropriate sub-pipeline.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
