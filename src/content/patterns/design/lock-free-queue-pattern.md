---
contentType: patterns
slug: lock-free-queue-pattern
title: "Lock-Free Queue Pattern"
description: "Build high-throughput queues using atomic operations instead of locks. Multiple threads can enqueue and dequeue concurrently without blocking or context-switching overhead."
metaDescription: "Build high-throughput queues with atomic operations instead of locks. Threads enqueue and dequeue concurrently without blocking or context-switch overhead."
difficulty: advanced
topics:
  - concurrency
  - architecture
tags:
  - lock-free
  - pattern
  - design-pattern
  - concurrency
  - atomic-operations
  - cas
  - ring-buffer
relatedResources:
  - /patterns/design/producer-consumer-pattern
  - /patterns/design/thread-pool-pattern
  - /patterns/design/reactive-streams-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build high-throughput queues with atomic operations instead of locks. Threads enqueue and dequeue concurrently without blocking or context-switch overhead."
  keywords:
    - lock free queue pattern
    - atomic operations concurrency
    - cas compare and swap queue
    - pattern design
---

## Overview

Lock-based queues suffer from two problems under high contention: thread blocking (waiting threads consume CPU and memory) and priority inversion (a low-priority thread holding a lock blocks a high-priority thread). Lock-free queues use atomic compare-and-swap (CAS) operations to update the queue without locks. Multiple threads can enqueue and dequeue simultaneously. If a CAS fails because another thread won the race, the thread retries. No thread ever blocks waiting for a lock.

## When to Use

- Multiple threads need to enqueue and dequeue at high frequency
- Lock contention is causing throughput degradation or latency spikes
- You need predictable latency without thread blocking or context-switching
- You are building a high-performance messaging or event-dispatch system

## Solution

### Python (queue with atomic operations via threading)

```python
import threading
import time
import random

class LockFreeRingBuffer:
    """Single-producer, single-consumer lock-free ring buffer.
    Uses atomic index increments. Works because only one thread
    modifies each index."""

    def __init__(self, capacity):
        self.capacity = capacity
        self.buffer = [None] * capacity
        self.head = 0  # Write index (producer only)
        self.tail = 0  # Read index (consumer only)
        self.count = 0

    def enqueue(self, item):
        while self.count >= self.capacity:
            pass  # Spin: buffer full
        self.buffer[self.head] = item
        self.head = (self.head + 1) % self.capacity
        self.count += 1

    def dequeue(self):
        while self.count == 0:
            pass  # Spin: buffer empty
        item = self.buffer[self.tail]
        self.tail = (self.tail + 1) % self.capacity
        self.count -= 1
        return item

buffer = LockFreeRingBuffer(100)

def producer(count):
    for i in range(count):
        buffer.enqueue(f"item-{i}")
        time.sleep(random.uniform(0, 0.001))

def consumer(count):
    processed = 0
    for _ in range(count):
        item = buffer.dequeue()
        processed += 1
        if processed % 1000 == 0:
            print(f"Processed {processed} items, last: {item}")

p = threading.Thread(target=producer, args=(10000,))
c = threading.Thread(target=consumer, args=(10000,))
p.start()
c.start()
p.join()
c.join()
print("All done")
```

### JavaScript (Atomics + SharedArrayBuffer)

```javascript
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";

// Lock-free SPSC ring buffer using Atomics
class LockFreeRingBuffer {
  constructor(capacity) {
    this.capacity = capacity;
    this.buffer = new SharedArrayBuffer(capacity * 4 + 8);
    this.data = new Int32Array(this.buffer, 0, capacity);
    this.indices = new Int32Array(this.buffer, capacity * 4, 2);
    // indices[0] = head (write), indices[1] = tail (read)
  }

  enqueue(value) {
    let head = Atomics.load(this.indices, 0);
    let tail = Atomics.load(this.indices, 1);
    while (head - tail >= this.capacity) {
      tail = Atomics.load(this.indices, 1); // Spin: buffer full
    }
    Atomics.store(this.data, head % this.capacity, value);
    Atomics.store(this.indices, 0, head + 1);
    return true;
  }

  dequeue() {
    let tail = Atomics.load(this.indices, 1);
    let head = Atomics.load(this.indices, 0);
    while (tail >= head) {
      head = Atomics.load(this.indices, 0); // Spin: buffer empty
    }
    const value = Atomics.load(this.data, tail % this.capacity);
    Atomics.store(this.indices, 1, tail + 1);
    return value;
  }
}

if (isMainThread) {
  const queue = new LockFreeRingBuffer(1000);
  const producer = new Worker(new URL(import.meta.url), {
    workerData: { role: "producer", buffer: queue.buffer, capacity: queue.capacity },
  });
  const consumer = new Worker(new URL(import.meta.url), {
    workerData: { role: "consumer", buffer: queue.buffer, capacity: queue.capacity },
  });

  producer.on("message", (msg) => console.log(`Producer: ${msg}`));
  consumer.on("message", (msg) => console.log(`Consumer: ${msg}`));
} else {
  const { role, buffer, capacity } = workerData;
  const data = new Int32Array(buffer, 0, capacity);
  const indices = new Int32Array(buffer, capacity * 4, 2);

  if (role === "producer") {
    for (let i = 0; i < 10000; i++) {
      let head = Atomics.load(indices, 0);
      let tail = Atomics.load(indices, 1);
      while (head - tail >= capacity) {
        tail = Atomics.load(indices, 1);
      }
      Atomics.store(data, head % capacity, i);
      Atomics.store(indices, 0, head + 1);
    }
    parentPort.postMessage("Done producing 10000 items");
  } else {
    let processed = 0;
    for (let i = 0; i < 10000; i++) {
      let tail = Atomics.load(indices, 1);
      let head = Atomics.load(indices, 0);
      while (tail >= head) {
        head = Atomics.load(indices, 0);
      }
      const value = Atomics.load(data, tail % capacity);
      Atomics.store(indices, 1, tail + 1);
      processed++;
    }
    parentPort.postMessage(`Done consuming ${processed} items`);
  }
}
```

### Java (java.util.concurrent.ConcurrentLinkedQueue)

```java
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class LockFreeQueueExample {

    public static void main(String[] args) throws InterruptedException {
        // ConcurrentLinkedQueue is a lock-free unbounded queue (Michael & Scott algorithm)
        ConcurrentLinkedQueue<Integer> queue = new ConcurrentLinkedQueue<>();
        AtomicInteger produced = new AtomicInteger(0);
        AtomicInteger consumed = new AtomicInteger(0);

        Runnable producer = () -> {
            for (int i = 0; i < 10000; i++) {
                queue.offer(i);
                produced.incrementAndGet();
            }
        };

        Runnable consumer = () -> {
            while (consumed.get() < 20000) {
                Integer item = queue.poll();
                if (item != null) {
                    consumed.incrementAndGet();
                }
            }
        };

        ExecutorService pool = Executors.newFixedThreadPool(4);
        pool.submit(producer);
        pool.submit(producer); // 2 producers, 20k total
        pool.submit(consumer);
        pool.submit(consumer); // 2 consumers

        pool.shutdown();
        pool.awaitTermination(10, java.util.concurrent.TimeUnit.SECONDS);
        System.out.println("Produced: " + produced.get() + ", Consumed: " + consumed.get());
    }
}
```

## Explanation

A lock-free queue uses atomic operations (compare-and-swap, fetch-and-add) to update the queue's head and tail pointers. When a thread wants to enqueue, it reads the current tail, prepares the new node, and tries to CAS the tail to the new node. If the CAS succeeds, the enqueue is done. If another thread won the race, the CAS fails and the thread retries with the updated tail.

The key insight: **no thread ever waits for a lock**. If a CAS fails, the thread immediately retries. Under low contention, CAS operations almost always succeed on the first try. Under high contention, threads may retry several times, but they never block or context-switch.

The most common lock-free queue algorithms are:
- **Michael & Scott**: Unbounded linked-list queue. Used by Java's `ConcurrentLinkedQueue`.
- **SPSC Ring Buffer**: Single-producer, single-consumer circular buffer. No CAS needed: producer writes head, consumer writes tail, no contention.
- **MPMC Ring Buffer**: Multi-producer, multi-consumer circular buffer. Uses CAS on head and tail.

## Variants

| Variant | Producers/Consumers | Implementation | Use Case | Tradeoff |
|---------|--------------------|--------------------|----------|----------|
| **SPSC Ring Buffer** | 1 / 1 | No atomics needed | Lowest latency | Single producer and consumer only |
| **MPMC Ring Buffer** | N / N | CAS on head and tail | General purpose | CAS contention under high load |
| **Michael & Scott** | N / N | CAS on linked list | Unbounded size | Memory allocation per node |
| **Disruptor** | N / N | Sequences + barriers | Ultra-low latency | Complex, fixed-size |
| **SkipList Queue** | N / N | CAS on skip list | Priority queue | Higher overhead |

## What Works

- Use SPSC ring buffers for single-producer, single-consumer: no atomics needed, lowest latency
- Pre-allocate ring buffer memory to avoid GC pressure and allocation latency
- Use `ConcurrentLinkedQueue` for unbounded lock-free queues in Java instead of building your own
- Measure contention: if CAS retries are high, consider sharding the queue (one queue per thread)
- Use `Memory.orderRelease` / `Memory.orderAcquire` (or equivalent) to ensure visibility without full fences
- Size the ring buffer to absorb bursts: too small causes spinning (wasted CPU)
- Consider the Disruptor pattern for ultra-low-latency scenarios (financial trading, gaming)

## Common Mistakes

- **Using lock-free when not needed**: Lock-based queues are simpler and fast enough for most cases. Lock-free adds complexity for marginal gains at moderate contention.
- **ABA problem**: A thread reads value A, another thread changes it to B then back to A. The first thread's CAS succeeds but the queue is corrupted. Use versioned pointers (tagged pointers) to detect the change.
- **Memory ordering bugs**: Using `store`/`load` without proper memory ordering causes visibility issues on weak memory models (ARM, POWER). Use acquire/release semantics.
- **Unbounded spinning**: If the queue is consistently full or empty, threads spin forever wasting CPU. Add backoff or yield.
- **Not handling the ABA in linked-list queues**: The Michael & Scott algorithm uses versioned CAS to prevent ABA. A naive linked-list queue without versioning will corrupt under ABA.
- **Assuming lock-free means wait-free**: Lock-free guarantees system-wide progress (some thread makes progress), but individual threads may starve. Wait-free guarantees per-thread progress but is harder to implement.

## FAQ

### What is the difference between lock-free and wait-free?

Lock-free guarantees that at least one thread makes progress. Individual threads may retry indefinitely under contention. Wait-free guarantees that every thread completes in a bounded number of steps. Wait-free is stronger but harder to implement and often slower due to more CAS operations.

### What is the ABA problem?

A thread reads value A from a shared variable. Another thread changes it to B, then back to A. The first thread's CAS succeeds (value is still A), but the queue state has changed in between. This can corrupt the queue. Solutions: versioned pointers (append a counter to the pointer), hazard pointers, or epoch-based reclamation.

### When should I use a lock-free queue instead of a lock-based one?

Use lock-free when contention is high enough that lock overhead (blocking, context-switching) dominates throughput. For low contention, lock-based queues are simpler and equally fast. Benchmark both before choosing.

### Is ConcurrentLinkedQueue in Java truly lock-free?

Yes. It uses the Michael & Scott algorithm with CAS operations on node pointers. No locks are used. However, it is unbounded: memory grows with the queue size. For bounded scenarios, use `ArrayBlockingQueue` (lock-based) or a lock-free ring buffer.

### What is the Disruptor pattern?

The Disruptor is a high-performance inter-thread messaging pattern using a pre-allocated ring buffer with sequence numbers. Producers claim sequence numbers, write data, and publish. Consumers wait for sequence numbers and read data. It achieves sub-microsecond latency by avoiding locks, false sharing, and memory allocation. Used in financial trading systems.
