---
contentType: patterns
slug: producer-consumer-pattern
title: "Producer-Consumer Pattern"
description: "Decouple production and consumption with a shared queue. Producers generate items at their own pace; consumers process them independently through a bounded or unbounded buffer."
metaDescription: "Decouple production and consumption with a shared queue. Producers generate items at their own pace; consumers process them independently via a buffer."
difficulty: intermediate
topics:
  - concurrency
  - architecture
tags:
  - producer-consumer
  - pattern
  - design-pattern
  - concurrency
  - queue
  - decoupling
  - buffering
relatedResources:
  - /patterns/design/thread-pool-pattern
  - /patterns/design/message-queue-load-leveling-pattern
  - /patterns/design/actor-model-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Decouple production and consumption with a shared queue. Producers generate items at their own pace; consumers process them independently via a buffer."
  keywords:
    - producer consumer pattern
    - decouple production consumption
    - bounded buffer concurrency
    - pattern design
---

## Overview

When one part of a system produces data and another part consumes it, they often run at different speeds. A producer might generate 1000 items per second while a consumer processes 100. Without a buffer between them, the producer must wait for the consumer (slow) or drop items (lossy). The Producer-Consumer pattern places a queue between them. Producers push items into the queue; consumers pull items from it. Both run at their own pace.

## When to Use

- A producer and consumer run at different speeds and you need to smooth the mismatch
- You want to decouple the producer from the consumer (they do not need to know about each other)
- You need to process items concurrently with multiple producers or multiple consumers
- You want to buffer items temporarily during bursts

## Solution

### Python (queue.Queue with threads)

```python
import threading
import queue
import time
import random

buffer = queue.Queue(maxsize=10)  # Bounded buffer

def producer(name, count):
    for i in range(count):
        item = f"{name}-item-{i}"
        buffer.put(item)  # Blocks if buffer is full
        print(f"[{name}] Produced {item}")
        time.sleep(random.uniform(0.01, 0.05))
    buffer.put(None)  # Sentinel: signal completion

def consumer(name):
    while True:
        item = buffer.get()  # Blocks if buffer is empty
        if item is None:
            buffer.put(None)  # Pass sentinel to other consumers
            break
        print(f"[{name}] Consumed {item}")
        time.sleep(random.uniform(0.05, 0.15))  # Consumer is slower
        buffer.task_done()

# 2 producers, 3 consumers
producers = [
    threading.Thread(target=producer, args=("P1", 20)),
    threading.Thread(target=producer, args=("P2", 20)),
]
consumers = [
    threading.Thread(target=consumer, args=("C1",)),
    threading.Thread(target=consumer, args=("C2",)),
    threading.Thread(target=consumer, args=("C3",)),
]

for p in producers: p.start()
for c in consumers: c.start()
for p in producers: p.join()
for c in consumers: c.join()
print("All done")
```

### JavaScript (async queue with workers)

```javascript
import { EventEmitter } from "events";

class AsyncQueue {
  constructor(maxsize = Infinity) {
    this.items = [];
    this.maxsize = maxsize;
    this.notFull = new EventEmitter();
    this.notEmpty = new EventEmitter();
    this.closed = false;
  }

  async put(item) {
    while (this.items.length >= this.maxsize) {
      await new Promise((resolve) => this.notFull.once("drain", resolve));
    }
    this.items.push(item);
    this.notEmpty.emit("data");
  }

  async get() {
    while (this.items.length === 0) {
      if (this.closed) return null;
      await new Promise((resolve) => this.notEmpty.once("data", resolve));
    }
    const item = this.items.shift();
    this.notFull.emit("drain");
    return item;
  }

  close() {
    this.closed = true;
    this.notEmpty.emit("data");
  }
}

async function producer(queue, name, count) {
  for (let i = 0; i < count; i++) {
    const item = `${name}-item-${i}`;
    await queue.put(item);
    console.log(`[${name}] Produced ${item}`);
    await new Promise((r) => setTimeout(r, Math.random() * 40));
  }
}

async function consumer(queue, name) {
  while (true) {
    const item = await queue.get();
    if (item === null) break;
    console.log(`[${name}] Consumed ${item}`);
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
  }
}

async function main() {
  const queue = new AsyncQueue(10);

  const producers = [
    producer(queue, "P1", 20),
    producer(queue, "P2", 20),
  ];
  const consumers = [
    consumer(queue, "C1"),
    consumer(queue, "C2"),
    consumer(queue, "C3"),
  ];

  await Promise.all(producers);
  queue.close();
  await Promise.all(consumers);
  console.log("All done");
}

main();
```

### Java (BlockingQueue)

```java
import java.util.concurrent.*;

public class ProducerConsumerExample {

    public static void main(String[] args) throws InterruptedException {
        BlockingQueue<String> buffer = new ArrayBlockingQueue<>(10);

        // Producer
        Runnable producer = () -> {
            for (int i = 0; i < 20; i++) {
                try {
                    String item = "item-" + i;
                    buffer.put(item); // Blocks if buffer is full
                    System.out.println("[Producer] Produced " + item);
                    Thread.sleep((long) (Math.random() * 40));
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
            try {
                buffer.put("POISON"); // Sentinel
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        };

        // Consumer
        Runnable consumer = () -> {
            while (true) {
                try {
                    String item = buffer.take(); // Blocks if buffer is empty
                    if ("POISON".equals(item)) {
                        buffer.put("POISON"); // Pass to other consumers
                        break;
                    }
                    System.out.println("[Consumer] Consumed " + item);
                    Thread.sleep(50 + (long) (Math.random() * 100));
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        };

        ExecutorService pool = Executors.newFixedThreadPool(4);
        pool.submit(producer);
        pool.submit(producer);
        pool.submit(consumer);
        pool.submit(consumer);
        pool.submit(consumer);

        pool.shutdown();
        pool.awaitTermination(10, TimeUnit.SECONDS);
        System.out.println("All done");
    }
}
```

## Explanation

The queue acts as a buffer between producers and consumers. Producers add items to the queue without waiting for consumers. Consumers remove items from the queue at their own pace. If the queue is bounded and full, producers block until space is available. If the queue is empty, consumers block until items arrive.

A **bounded buffer** provides backpressure: when the buffer is full, producers slow down. This prevents producers from overwhelming consumers and running out of memory. An **unbounded buffer** has no backpressure: producers never block, but memory can grow without limit if producers are consistently faster.

Multiple producers and consumers can share the same queue. The queue is thread-safe (using locks or lock-free algorithms internally). Each consumer gets a distinct item; no item is processed twice.

## Variants

| Variant | Buffer Type | Use Case | Tradeoff |
|---------|-------------|----------|----------|
| **Bounded Buffer** | Fixed-size queue | Backpressure, memory-safe | Producers block when full |
| **Unbounded Buffer** | Growing queue | Maximum throughput | Memory can grow without limit |
| **Priority Queue** | Priority-based | Some items are urgent | Starvation of low-priority items |
| **Ring Buffer** | Circular array | Low-latency, fixed memory | Overwrites old data if not careful |
| **Work Stealing** | Per-consumer queues | Load balancing | More complex, overhead for stealing |

## What Works

- Use a bounded buffer when memory is constrained or producers are consistently faster
- Use sentinels (poison pills) to signal consumers to stop gracefully
- Make consumers idempotent in case of redelivery after failures
- Monitor queue depth: a consistently growing queue means consumers are too slow
- Size the buffer to absorb expected bursts without blocking producers
- Use multiple consumers to scale processing throughput
- Name producer and consumer threads for debugging and thread dump analysis

## Common Mistakes

- **Unbounded buffer with fast producer**: Memory grows until OOM. Always consider a bound.
- **Single consumer bottleneck**: One consumer cannot keep up with multiple producers. Scale consumers.
- **Not handling consumer failures**: If a consumer crashes after taking an item, the item is lost. Use acknowledgments or transactions.
- **Busy-waiting instead of blocking**: Polling the queue in a loop wastes CPU. Use blocking operations (`put`, `take`, `get`, `await`).
- **Forgetting to stop consumers**: Without a sentinel or close signal, consumers wait forever for the next item.
- **Locking the queue externally**: The queue is already thread-safe. External locks cause deadlocks.

## FAQ

### How is this different from a message queue like RabbitMQ?

The Producer-Consumer pattern is an in-process pattern using a shared queue in memory. RabbitMQ is a broker that distributes messages across processes and machines. Use Producer-Consumer for single-process concurrency; use a message broker for distributed systems.

### Should I use a bounded or unbounded buffer?

Start with bounded. A bounded buffer protects against memory exhaustion and provides natural backpressure. Use unbounded only when you are certain producers will not consistently outpace consumers, or when buffering is more important than memory safety.

### How many consumers should I use?

For CPU-bound work: one consumer per CPU core. For I/O-bound work: more consumers than cores since they spend time waiting. Monitor queue depth to determine if you need more or fewer consumers.

### What is a poison pill?

A sentinel value (like `None`, `null`, or a special object) placed in the queue to signal consumers to stop. When a consumer sees the poison pill, it knows no more items will arrive and exits. If multiple consumers share the queue, the pill must be re-queued for the next consumer.

### Can producers and consumers be on different machines?

Not with the basic pattern. The shared queue is in-process memory. For cross-machine producer-consumer, use a message broker (RabbitMQ, Kafka, SQS) which provides the queue as a network-accessible service.

## Advanced Solutions

### Work-stealing queue for load balancing

Each consumer has its own local queue. When a consumer's queue is empty, it steals items from other consumers' queues:

```python
import threading
import random

class WorkStealingQueue:
    def __init__(self, num_workers):
        self.queues = [threading.Queue() for _ in range(num_workers)]
        self.num_workers = num_workers
        self.lock = threading.Lock()
        self.random = random.Random()

    def push(self, item):
        """Push to a random queue for load distribution."""
        with self.lock:
            idx = self.random.randint(0, self.num_workers - 1)
            self.queues[idx].put(item)

    def pop(self, worker_id):
        """Pop from local queue first, then steal from others."""
        # Try local queue
        try:
            return self.queues[worker_id].get_nowait()
        except:
            pass

        # Steal from other queues
        for i in range(self.num_workers):
            if i == worker_id:
                continue
            try:
                return self.queues[i].get_nowait()
            except:
                continue

        return None  # All queues empty
```

### Producer-consumer with acknowledgment and retry

Ensure items are not lost if a consumer fails:

```python
import threading
import queue

class ReliableQueue:
    def __init__(self, maxsize=10):
        self.pending = queue.Queue(maxsize)
        self.ack = queue.Queue()
        self.lock = threading.Lock()

    def put(self, item):
        """Put item into pending queue."""
        self.pending.put(item)

    def get(self):
        """Get item from pending queue."""
        return self.pending.get()

    def ack(self, item):
        """Acknowledge successful processing."""
        self.ack.put(item)

    def get_unacked(self):
        """Return items that were not acknowledged."""
        with self.lock:
            unacked = []
            while not self.pending.empty():
                item = self.pending.get()
                unacked.append(item)
            return unacked

def consumer(queue, name):
    while True:
        item = queue.get()
        if item is None:
            break
        try:
            process(item)
            queue.ack(item)
        except Exception as e:
            print(f"Consumer {name} failed on {item}: {e}")
            # Item remains in pending queue for retry
```

### Priority queue for urgent items

Process urgent items before regular items:

```python
import heapq
import threading

class PriorityQueue:
    def __init__(self):
        self.heap = []
        self.lock = threading.Lock()
        self.not_empty = threading.Condition(self.lock)

    def put(self, item, priority):
        with self.lock:
            heapq.heappush(self.heap, (priority, item))
            self.not_empty.notify()

    def get(self):
        with self.lock:
        while not self.heap:
            self.not_empty.wait()
        return heapq.heappop(self.heap)[1]

# Usage: put urgent items with lower priority value
queue.put("urgent_task", 0)  # High priority
queue.put("regular_task", 10)  # Lower priority
```

## Additional Best Practices

1. **Monitor queue metrics.** Track queue depth, producer throughput, consumer throughput, and latency. Set alerts for queue depth exceeding thresholds. A growing queue indicates consumers are too slow or producers are too fast.

2. **Handle shutdown gracefully.** Use a shutdown flag or poison pill to signal producers and consumers to stop. Flush the queue before shutdown or save pending items to persistent storage for recovery.

```python
class GracefulQueue:
    def __init__(self):
        self.queue = queue.Queue()
        self.shutdown_flag = False

    def shutdown(self):
        self.shutdown_flag = True
        # Wake up waiting consumers
        for _ in range(10):
            self.queue.put(None)

    def is_shutdown(self):
        return self.shutdown_flag
```

## Additional Common Mistakes

1. **Ignoring queue overflow.** When a bounded queue is full, producers block or items are dropped. Monitor queue depth and implement overflow handling: drop oldest items, reject new items, or scale consumers.

2. **Not handling poison pill for multiple consumers.** A single poison pill stops only one consumer. For multiple consumers, either send one poison pill per consumer or use a shutdown flag that all consumers check.

## Additional Frequently Asked Questions

### How do I handle backpressure in an unbounded queue?

Unbounded queues have no natural backpressure. Implement backpressure manually by monitoring queue depth and throttling producers when depth exceeds a threshold. Alternatively, switch to a bounded queue.

### What is the difference between work stealing and work distribution?

Work distribution assigns items to consumers upfront (e.g., round-robin). Work stealing lets consumers take items from their local queue first and steal from others when idle. Work stealing reduces contention and improves load balance for variable workloads.

### How do I ensure exactly-once processing?

Exactly-once requires idempotent consumers and acknowledgments. Assign a unique ID to each item. The consumer checks if the ID was already processed before processing. After successful processing, acknowledge the item. If the consumer fails, the item is retried but will be skipped due to the ID check.
