---
contentType: patterns
slug: back-pressure-pattern
title: "Back-Pressure Pattern"
description: "Prevent upstream systems from overwhelming downstream consumers by propagating flow-control signals backward through the pipeline, ensuring stable throughput under load."
metaDescription: "Learn the Back-Pressure Pattern for flow control in streaming. Examples in Python, Java, and JavaScript with reactive streams, bounded queues, and rate limiters."
difficulty: intermediate
topics:
  - design
  - architecture
  - performance
tags:
  - back-pressure
  - pattern
  - design-pattern
  - streaming
  - reactive
  - flow-control
  - resilience
relatedResources:
  - /patterns/design/throttling-pattern
  - /patterns/design/circuit-breaker-pattern
  - /patterns/design/queue-based-load-leveling-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Back-Pressure Pattern for flow control in streaming. Examples in Python, Java, and JavaScript with reactive streams, bounded queues, and rate limiters."
  keywords:
    - back pressure
    - design pattern
    - streaming
    - reactive
    - flow control
    - resilience
---

# Back-Pressure Pattern

## Overview

The Back-Pressure Pattern prevents an upstream producer from overwhelming a downstream consumer by propagating flow-control signals backward through a data pipeline. When the consumer cannot keep up, it signals the producer to slow down or pause, preventing unbounded memory growth, timeouts, and cascading failures.

Without back-pressure, fast producers and slow consumers lead to:
- **Out-of-memory errors** from unbounded buffers
- **Latency spikes** as queues grow
- **Dropped messages** when buffers overflow
- **Cascading failures** as downstream services collapse under load

Back-pressure is fundamental in reactive systems, stream processing (Kafka, Flink), and async I/O frameworks (Node.js streams, ReactiveX).

## When to Use

Use the Back-Pressure Pattern when:
- Producers and consumers operate at different speeds in a sustained way
- You need bounded memory usage in streaming or async pipelines
- Downstream services have hard capacity limits (database write rates, API quotas)
- The system must remain stable under unpredictable load spikes

## When to Avoid

- All stages process data at roughly the same rate (synchronous pipelining suffices)
- Latency is more important than throughput (back-pressure adds delay)
- A simple fixed-size buffer with drop-newest/drop-oldest policy is acceptable
- The consumer is infinitely scalable (serverless auto-scaling) and buffering is cheaper

## Solution

### Python

```python
import queue
import threading
import time
from typing import Callable, Optional

class BackPressuredQueue:
    """Bounded queue with blocking put that exerts back-pressure on producers"""
    def __init__(self, max_size: int = 10):
        self._queue = queue.Queue(maxsize=max_size)
        self._shutdown = False

    def produce(self, item) -> bool:
        """Blocks if queue is full, exerting back-pressure on caller"""
        if self._shutdown:
            return False
        try:
            self._queue.put(item, block=True, timeout=1.0)
            return True
        except queue.Full:
            return False

    def consume(self) -> Optional:
        """Returns item or None if shutdown"""
        if self._shutdown and self._queue.empty():
            return None
        try:
            return self._queue.get(block=True, timeout=0.5)
        except queue.Empty:
            return None

    def mark_done(self):
        self._queue.task_done()

    def shutdown(self):
        self._shutdown = True


class DataPipeline:
    """Pipeline with back-pressure between producer and consumer"""
    def __init__(self, buffer_size: int = 5):
        self.buffer = BackPressuredQueue(max_size=buffer_size)
        self.producer_thread: Optional[threading.Thread] = None
        self.consumer_thread: Optional[threading.Thread] = None

    def start(self, producer_fn: Callable, consumer_fn: Callable):
        self.producer_thread = threading.Thread(
            target=self._run_producer, args=(producer_fn,)
        )
        self.consumer_thread = threading.Thread(
            target=self._run_consumer, args=(consumer_fn,)
        )
        self.producer_thread.start()
        self.consumer_thread.start()

    def _run_producer(self, producer_fn):
        for item in producer_fn():
            if not self.buffer.produce(item):
                print("Producer: back-pressure applied, dropping item")
        self.buffer.shutdown()

    def _run_consumer(self, consumer_fn):
        while True:
            item = self.buffer.consume()
            if item is None:
                break
            consumer_fn(item)
            self.buffer.mark_done()

    def join(self):
        self.producer_thread.join()
        self.consumer_thread.join()


# Usage
def fast_producer():
    for i in range(20):
        print(f"Producing {i}")
        yield f"data-{i}"
        time.sleep(0.1)  # Fast: 10 items/sec

def slow_consumer(item):
    print(f"Consuming {item}")
    time.sleep(0.5)  # Slow: 2 items/sec

pipeline = DataPipeline(buffer_size=3)
pipeline.start(fast_producer, slow_consumer)
pipeline.join()
```

### Java

```java
import java.util.concurrent.*;
import java.util.function.Consumer;
import java.util.function.Supplier;

public class BackPressuredPipeline<T> {
    private final BlockingQueue<T> queue;
    private final ExecutorService executor = Executors.newFixedThreadPool(2);

    public BackPressuredPipeline(int capacity) {
        this.queue = new ArrayBlockingQueue<>(capacity);
    }

    public void run(Supplier<T> producer, Consumer<T> consumer) {
        Future<?> producerTask = executor.submit(() -> {
            while (true) {
                T item = producer.get();
                if (item == null) break;
                try {
                    queue.put(item); // Blocks when full — back-pressure
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        });

        Future<?> consumerTask = executor.submit(() -> {
            while (true) {
                try {
                    T item = queue.poll(1, TimeUnit.SECONDS);
                    if (item == null && producerTask.isDone()) break;
                    if (item != null) consumer.accept(item);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        });

        try {
            producerTask.get();
            consumerTask.get();
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            executor.shutdown();
        }
    }

    // Usage
    public static void main(String[] args) {
        BackPressuredPipeline<String> pipeline = new BackPressuredPipeline<>(5);

        pipeline.run(
            () -> {
                try {
                    Thread.sleep(100);
                    return "item-" + System.currentTimeMillis();
                } catch (InterruptedException e) {
                    return null;
                }
            },
            item -> {
                System.out.println("Consumed: " + item);
                try { Thread.sleep(500); } catch (InterruptedException e) {}
            }
        );
    }
}
```

### JavaScript

```javascript
const { Transform } = require('stream');

// Back-pressured transform stream in Node.js
const slowTransform = new Transform({
  highWaterMark: 3, // Small buffer to exert back-pressure quickly
  transform(chunk, encoding, callback) {
    console.log(`Processing: ${chunk.toString().trim()}`);
    // Simulate slow processing
    setTimeout(() => {
      callback(null, chunk);
    }, 500);
  }
});

// Fast producer (stdin or generator)
process.stdin.pipe(slowTransform).pipe(process.stdout);

// Or with async generators and manual back-pressure
class BackPressuredChannel {
  constructor(capacity = 5) {
    this.buffer = [];
    this.capacity = capacity;
    this.waitingConsumers = [];
    this.waitingProducers = [];
    this.closed = false;
  }

  async send(value) {
    if (this.closed) throw new Error('Channel closed');
    while (this.buffer.length >= this.capacity) {
      await new Promise(resolve => this.waitingProducers.push(resolve));
    }
    this.buffer.push(value);
    const waiter = this.waitingConsumers.shift();
    if (waiter) waiter();
  }

  async receive() {
    while (this.buffer.length === 0 && !this.closed) {
      await new Promise(resolve => this.waitingConsumers.push(resolve));
    }
    if (this.buffer.length === 0) return undefined; // closed and empty
    const value = this.buffer.shift();
    const waiter = this.waitingProducers.shift();
    if (waiter) waiter();
    return value;
  }

  close() {
    this.closed = true;
    this.waitingConsumers.forEach(w => w());
  }
}

// Usage
async function demo() {
  const channel = new BackPressuredChannel(3);

  // Producer
  (async () => {
    for (let i = 0; i < 10; i++) {
      console.log(`Sending ${i}`);
      await channel.send(i);
    }
    channel.close();
  })();

  // Consumer
  for await (const value of (async function* () {
    while (true) {
      const v = await channel.receive();
      if (v === undefined) break;
      yield v;
    }
  })()) {
    console.log(`Received ${value}`);
    await new Promise(r => setTimeout(r, 800));
  }
}

demo().catch(console.error);
```

## Explanation

Back-pressure works by making the **producer's send operation dependent on the consumer's capacity**:

1. **Bounded buffer**: The queue between producer and consumer has a maximum size
2. **Blocking send**: When the buffer is full, the producer blocks or receives a "slow down" signal
3. **Credit-based flow**: The consumer grants "credits" (permission to send N more items) to the producer
4. **Reactive pull**: The consumer requests items at its own pace (e.g., Reactive Streams `request(n)`)

In Reactive Streams (Java), this is formalized through the `Subscription.request(n)` mechanism. In Kafka, the consumer's `max.poll.records` and manual offset commits create implicit back-pressure.

## Variants

| Variant | Mechanism | Best For |
|---------|-----------|----------|
| **Blocking queue** | Thread blocks when full | Thread-based pipelines |
| **Reactive Streams** | `request(n)` credit-based | Composable async pipelines |
| **TCP windowing** | Sliding window protocol | Network flow control |
| **Token bucket** | Producer needs token to send | Rate-limited APIs |
| **Pause/resume** | Consumer sends pause signal | Batch processing systems |

## What Works

- **Use bounded buffers everywhere.** Unbounded queues are the root cause of most back-pressure failures.
- **Set buffer sizes based on p99 latency, not average.** A buffer sized for average load will overflow during spikes.
- **Monitor buffer depth.** Alert when buffers consistently run above 80% capacity.
- **Prefer reactive pull over push.** Let the consumer drive the rate, not the producer.
- **Handle back-pressure at every layer.** Database → service → API gateway → client.

## Common Mistakes

- **Unbounded queues.** `LinkedBlockingQueue` without a capacity silently consumes all available memory.
- **Ignoring back-pressure in async code.** `Promise.all()` with unbounded arrays creates the same problem.
- **Swallowing blocking exceptions.** Timeouts on `put()` should propagate or retry, not silently drop.
- **One-size-fits-all buffer.** Different pipeline stages need different buffer sizes.
- **Assuming consumers are always slower.** Back-pressure should be bidirectional if the pipeline has multiple stages.

## Real-World Examples

### Apache Kafka

Kafka consumers control back-pressure through `max.poll.records` and manual offset commits. A slow consumer simply commits fewer offsets, and the broker does not push more messages until the consumer is ready.

### gRPC Streaming

gRPC supports flow control via HTTP/2 windowing. When the receiver's buffer is full, the HTTP/2 window size decreases, signaling the sender to stop sending.

### Node.js Streams

Node.js `readable.pipe(writable)` automatically handles back-pressure. When the writable's buffer fills, `pipe()` pauses the readable until the writable drains.

### Akka Streams / Project Reactor

Reactive Streams implementations use explicit demand signaling. A downstream subscriber calls `request(n)`, granting the upstream permission to send `n` more elements.

## Frequently Asked Questions

**Q: What is the difference between back-pressure and throttling?**
A: Back-pressure is reactive: the consumer signals the producer to slow down. Throttling is proactive: the producer limits its own rate regardless of consumer capacity.

**Q: Can back-pressure work across network boundaries?**
A: Yes, protocols like TCP, HTTP/2, and gRPC implement flow control via windowing and credit-based mechanisms that work across networks.

**Q: What happens if the producer cannot slow down?**
A: Then you need a buffering, dropping, or load-shedding strategy. Back-pressure is a signal; if the producer ignores it, the system needs a fallback policy.

**Q: How does back-pressure relate to the Circuit Breaker?**
A: They solve different problems. Back-pressure manages flow rate. Circuit Breaker stops all flow when a service is failing. They complement each other in resilient pipelines.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
