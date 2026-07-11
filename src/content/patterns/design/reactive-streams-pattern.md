---
contentType: patterns
slug: reactive-streams-pattern
title: "Reactive Streams Pattern"
description: "Process asynchronous data streams with backpressure. Subscribers request N items at a time, preventing fast producers from overwhelming slow consumers."
metaDescription: "Process async data streams with backpressure. Subscribers request N items at a time, preventing fast producers from overwhelming slow consumers."
difficulty: advanced
topics:
  - concurrency
  - architecture
tags:
  - reactive-streams
  - pattern
  - design-pattern
  - backpressure
  - async-stream
  - publisher-subscriber
  - flow-control
relatedResources:
  - /patterns/design/async-generator-pattern
  - /patterns/design/producer-consumer-pattern
  - /patterns/design/publish-subscribe-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Process async data streams with backpressure. Subscribers request N items at a time, preventing fast producers from overwhelming slow consumers."
  keywords:
    - reactive streams pattern
    - backpressure flow control
    - publisher subscriber async
    - pattern design
---

## Overview

In a push-based streaming model, the producer sends data as fast as it can. If the consumer is slower, items buffer in memory until it runs out. Reactive Streams solves this with a pull-based protocol: the subscriber requests a specific number of items, and the publisher sends only that many. This is called backpressure. The publisher cannot push more than the subscriber requested, preventing memory overflow and allowing the consumer to control the flow.

## When to Use

- A fast producer streams data to a slower consumer and you need flow control
- You process large or infinite data streams with bounded memory
- You need to compose stream operations (map, filter, merge) with backpressure
- You want a standard protocol for async stream processing across libraries

## Solution

### Python (asyncio + manual backpressure)

```python
import asyncio

class Publisher:
    def __init__(self, data):
        self.data = data
        self.index = 0

    def request(self, n):
        """Subscriber requests n items. Returns up to n items."""
        items = []
        for _ in range(n):
            if self.index >= len(self.data):
                break
            items.append(self.data[self.index])
            self.index += 1
        return items

class Subscriber:
    def __init__(self, publisher, batch_size=5):
        self.publisher = publisher
        self.batch_size = batch_size
        self.processed = 0

    async def consume(self):
        while True:
            # Request only batch_size items: backpressure
            items = self.publisher.request(self.batch_size)
            if not items:
                break
            for item in items:
                await self.process(item)
                self.processed += 1
        print(f"Total processed: {self.processed}")

    async def process(self, item):
        await asyncio.sleep(0.01)  # Simulate slow processing
        print(f"Processed: {item}")

async def main():
    data = list(range(100))
    publisher = Publisher(data)
    subscriber = Subscriber(publisher, batch_size=5)
    await subscriber.consume()

asyncio.run(main())
```

### JavaScript (ReadableStream + backpressure)

```javascript
// Create a readable stream with backpressure-aware producer
function createNumberStream(max) {
  let current = 0;
  return new ReadableStream({
    start(controller) {
      function push() {
        if (current >= max) {
          controller.close();
          return;
        }
        // desiredSize tells us how many items the consumer can accept
        // When negative, the consumer is behind: stop pushing
        if (controller.desiredSize > 0) {
          controller.enqueue(current++);
          push();
        }
      }
      push();
    },
  });
}

async function consume(stream, batchSize = 5) {
  const reader = stream.getReader();
  let processed = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Simulate slow processing
    await new Promise((r) => setTimeout(r, 10));
    processed++;
    console.log(`Processed: ${value}`);
  }
  console.log(`Total processed: ${processed}`);
}

// Producer generates 0-99, consumer processes with backpressure
consume(createNumberStream(100));
```

### Java (Project Reactor Flux)

```java
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

public class ReactiveStreamsExample {

    public static void main(String[] args) throws InterruptedException {
        // Publisher: emit 0 to 99
        Flux<Integer> publisher = Flux.range(0, 100);

        // Subscriber with backpressure: request 5 at a time
        publisher
            .publishOn(Schedulers.parallel())
            .doOnNext(item -> {
                // Simulate slow processing
                try {
                    Thread.sleep(10);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                System.out.println("Processed: " + item);
            })
            .doOnComplete(() -> System.out.println("Done"))
            // Limit prefetch: backpressure buffer size
            .subscribeOn(Schedulers.parallel())
            .blockLast(); // Wait for completion

        System.out.println("All done");
    }
}
```

## Explanation

The Reactive Streams protocol defines four interfaces:

- **Publisher**: Produces items and sends them to subscribers. Respects demand.
- **Subscriber**: Consumes items. Calls `request(n)` to signal demand for n items.
- **Subscription**: Represents the link between publisher and subscriber. Used to request items or cancel.
- **Processor**: Acts as both publisher and subscriber (for intermediate stages).

The key rule: **the publisher must not send more items than requested**. If the subscriber requests 5, the publisher sends at most 5. The subscriber processes them, then requests 5 more. This creates a pull-based flow where the consumer controls the pace.

Backpressure is the mechanism that prevents a fast producer from overwhelming a slow consumer. Instead of unbounded buffering, the publisher waits for the subscriber to request more items. Memory usage stays bounded regardless of the stream length.

## Variants

| Variant | Implementation | Use Case | Tradeoff |
|---------|----------------|----------|----------|
| **Project Reactor** | Java (Spring) | Enterprise, Spring WebFlux | Steep learning curve |
| **RxJava** | Java | Rich operator set | Large API surface |
| **Akka Streams** | Scala/Java | Actor-based streams | Akka dependency |
| **ReadableStream** | Web Streams API | Browser/Node.js | Limited operators |
| **Manual backpressure** | asyncio + request | Simple, no framework | No composition operators |

## What Works

- Start with a small request size (e.g., 5-10) and tune based on throughput
- Use bounded buffers for operators like `buffer`, `window` to prevent memory growth
- Always handle `onError`: streams can fail, and unhandled errors silently drop the subscription
- Use `subscribeOn` and `publishOn` to control which thread produces and consumes
- Cancel subscriptions when done to release resources and stop the publisher
- Monitor demand: if the subscriber never requests more, the stream stalls
- Use `onBackpressureBuffer`, `onBackpressureDrop`, or `onBackpressureLatest` to handle overflow

## Common Mistakes

- **Requesting unbounded demand**: Calling `request(Long.MAX_VALUE)` disables backpressure, reverting to push-based. Only do this when the consumer is always faster.
- **Blocking in the subscriber**: A blocking call in `onNext` blocks the publisher thread. Offload to a separate scheduler.
- **Not handling errors**: If `onError` is not implemented, exceptions are swallowed and the stream stops silently.
- **Ignoring cancellation**: If the consumer is done but does not cancel, the publisher keeps producing and wasting resources.
- **Mixing push and pull**: Calling `onNext` without a corresponding `request` violates the protocol and can cause protocol errors.
- **Large request sizes**: Requesting too many items at once reduces backpressure effectiveness and can cause memory spikes.

## FAQ

### How is this different from pub/sub?

Pub/sub broadcasts messages to all subscribers without flow control. Reactive Streams has a single subscriber per subscription with explicit backpressure. Pub/sub is for event broadcasting; Reactive Streams is for stream processing with flow control.

### How is this different from async generators?

Async generators are pull-based (consumer requests next). Reactive Streams are also pull-based but with a standardized protocol, composition operators, and multi-thread support. Async generators are simpler; Reactive Streams are richer.

### What happens when the subscriber is much slower?

The subscriber requests fewer items per batch, or requests one at a time. The publisher waits. Memory stays bounded. If the subscriber is too slow, you can use `onBackpressureDrop` to discard items or `onBackpressureLatest` to keep only the most recent.

### Should I use Reactive Streams or simple async/await?

For simple cases (one producer, one consumer, no composition), async/await is simpler. For complex pipelines (map, filter, merge, retry, debounce), Reactive Streams libraries provide operators that would require significant manual code.

### Can I have multiple subscribers?

Yes, but each gets its own subscription with independent demand. A `publish` operator shares a single upstream subscription among multiple subscribers. A ` multicast` operator buffers items for late subscribers.


## Advanced Topics

### Scenario: Reactive Streams for Event Processing

```typescript
// Reactive Streams: Publisher, Subscriber, Subscription
interface Publisher<T> {
  subscribe(subscriber: Subscriber<T>): void;
}

interface Subscriber<T> {
  onNext(value: T): void;
  onError(err: Error): void;
  onComplete(): void;
}

// Publisher: emits data
class EventPublisher<T> implements Publisher<T> {
  private subscribers: Subscriber<T>[] = [];
  private buffer: T[] = [];
  private maxBuffer = 1000;

  subscribe(sub: Subscriber<T>) { this.subscribers.push(sub); }

  emit(value: T) {
    this.buffer.push(value);
    if (this.buffer.length > this.maxBuffer) {
      this.buffer.shift(); // discard oldest
    }
    this.subscribers.forEach(s => {
      try { s.onNext(value); }
      catch (err) { s.onError(err); }
    });
  }

  complete() {
    this.subscribers.forEach(s => s.onComplete());
    this.subscribers = [];
  }
}

// Subscriber: processes data with backpressure
class BatchProcessor<T> implements Subscriber<T> {
  private batch: T[] = [];
  private batchSize: number;
  private processFn: (batch: T[]) => Promise<void>;

  constructor(batchSize: number, processFn: (batch: T[]) => Promise<void>) {
    this.batchSize = batchSize;
    this.processFn = processFn;
  }

  async onNext(value: T) {
    this.batch.push(value);
    if (this.batch.length >= this.batchSize) {
      const batch = this.batch.splice(0, this.batchSize);
      await this.processFn(batch);
    }
  }
  onError(err: Error) { console.error("[REACTIVE] Error:", err); }
  async onComplete() {
    if (this.batch.length > 0) await this.processFn(this.batch);
    console.log("[REACTIVE] Stream complete");
  }
}

// Usage: process click events in batches of 100
const publisher = new EventPublisher<ClickEvent>();
const processor = new BatchProcessor(100, async (batch) => {
  await fetch("/api/analytics", { method: "POST", body: JSON.stringify(batch) });
});
publisher.subscribe(processor);

// Simulate events
for (let i = 0; i < 350; i++) {
  publisher.emit({ x: i, y: i * 2, timestamp: Date.now() });
}
publisher.complete(); // process final batch of 50

// Comparison: RxJS vs Reactive Streams
  | Aspect | Reactive Streams | RxJS |
  |--------|-----------------|------|
  | Standard | Reactive Streams spec | Library |
  | Backpressure | Explicit (Subscription) | Buffer/lossy |
  | Operators | Basic | 100+ operators |
  | Typing | Generics | Native TypeScript |
  | Use case | Event-driven systems | UI, transformations |
```

Lessons:
  - Reactive Streams standardizes pub/sub with backpressure
  - Publisher emits, Subscriber consumes, Subscription controls
  - Backpressure: the subscriber controls the consumption rate
  - Batching reduces overhead: process 100 events per HTTP request
  - In Node.js, use RxJS or most.js for reactive programming
  - For pure event-driven systems, use Reactive Streams
```

### How do I handle backpressure in reactive streams?

Backpressure is when the publisher emits faster than the subscriber can process. Strategies: 1) Buffer: store up to a limit (can cause OOM). 2) Drop: discard new events. 3) Latest: keep only the most recent. 4) Throttle: limit emission rate. 5) Request(n): the subscriber asks the publisher for N items (pull-based). The best strategy depends on the use case: for analytics, drop is acceptable. For payments, buffer with persistence.
