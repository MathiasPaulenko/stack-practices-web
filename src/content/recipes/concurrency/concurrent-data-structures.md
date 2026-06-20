---
contentType: recipes
slug: concurrent-data-structures
title: "Use Concurrent Data Structures for Thread-Safe Collections"
description: "How to safely share collections between threads using blocking queues, concurrent maps, copy-on-write lists, and atomic counters in Java, Python, and C++."
metaDescription: "Learn concurrent data structures for thread safety. Use blocking queues, concurrent maps, copy-on-write lists, and atomic counters in Java, Python, and C++."
difficulty: intermediate
topics:
  - concurrency
tags:
  - concurrency
  - atomic-operations
relatedResources:
  - /recipes/locks-and-mutexes
  - /recipes/thread-pools
  - /recipes/async-patterns
  - /recipes/microservices-patterns
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn concurrent data structures for thread safety. Use blocking queues, concurrent maps, copy-on-write lists, and atomic counters in Java, Python, and C++."
  keywords:
    - concurrent data structures
    - thread safe collections
    - blocking queue
    - concurrent hash map
    - producer consumer
---

## Overview

Sharing a standard `ArrayList` between threads is dangerous. Thread A reads index 0 while thread B removes index 0 — `ConcurrentModificationException`. Thread A and B both call `map.put("key", value)` simultaneously on a `HashMap` — the internal linked list can become circular, causing an infinite loop during iteration. These failures are non-deterministic: they may pass thousands of tests and fail only under production load.

Standard collections (`ArrayList`, `HashMap`, `LinkedList`) are not thread-safe. Wrapping every access in `synchronized` works but serializes all operations, defeating parallelism. Concurrent data structures are collections designed for multi-threaded access: they use fine-grained locks, lock-free algorithms, or immutability to allow safe concurrent reads and writes with minimal contention. This recipe covers blocking queues, concurrent maps, copy-on-write collections, and atomic counters with practical examples.

## When to use it

Use this recipe when:

- Multiple threads read and write the same collection
- Implementing producer-consumer patterns with backpressure
- Building caches, job queues, or [connection pools](/recipes/performance/connection-pooling) shared by thread pools
- Replacing `synchronized(list)` or `Collections.synchronizedMap()` with higher-performance alternatives
- Ensuring visibility of writes across threads without explicit memory barriers

## Solution

### Blocking Queue (Java)

```java
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

class OrderProcessor {
    private final BlockingQueue<Order> queue = new ArrayBlockingQueue<>(100);

    public void submit(Order order) throws InterruptedException {
        queue.put(order); // blocks if queue is full
    }

    public Order take() throws InterruptedException {
        return queue.take(); // blocks if queue is empty
    }
}

// Producer thread
OrderProcessor processor = new OrderProcessor();
Thread producer = new Thread(() -> {
    for (int i = 0; i < 1000; i++) {
        processor.submit(new Order(i));
    }
});

// Consumer thread pool
for (int i = 0; i < 4; i++) {
    new Thread(() -> {
        while (true) {
            try {
                Order order = processor.take();
                process(order);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }).start();
}
```

### Concurrent Map (Java)

```java
import java.util.concurrent.ConcurrentHashMap;

class InMemoryCache {
    private final ConcurrentHashMap<String, CachedValue> cache = new ConcurrentHashMap<>();

    public String get(String key, Supplier<String> loader) {
        return cache.computeIfAbsent(key, k -> {
            String value = loader.get();
            return new CachedValue(value, System.currentTimeMillis());
        }).value;
    }

    public void invalidate(String key) {
        cache.remove(key);
    }

    private record CachedValue(String value, long timestamp) {}
}
```

### Python Queue (Thread-Safe)

```python
from queue import Queue
from threading import Thread

class TaskQueue:
    def __init__(self, maxsize=100):
        self.queue = Queue(maxsize=maxsize)

    def submit(self, task):
        self.queue.put(task)  # blocks if full

    def worker(self):
        while True:
            task = self.queue.get()  # blocks if empty
            if task is None:
                break
            self.process(task)
            self.queue.task_done()

tq = TaskQueue()

# Producer
Thread(target=lambda: [tq.submit(i) for i in range(1000)]).start()

# Consumers
for _ in range(4):
    Thread(target=tq.worker).start()
```

### Copy-on-Write List (Java)

```java
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

class EventDispatcher {
    private final CopyOnWriteArrayList<Consumer<Event>> listeners = new CopyOnWriteArrayList<>();

    public void addListener(Consumer<Event> listener) {
        listeners.add(listener);
    }

    public void removeListener(Consumer<Event> listener) {
        listeners.remove(listener);
    }

    public void dispatch(Event event) {
        for (Consumer<Event> listener : listeners) {
            listener.accept(event);
        }
    }
}
```

## Explanation

- **BlockingQueue**: a queue that blocks producers when full and consumers when empty. This provides natural backpressure — a fast producer cannot overwhelm a slow consumer. `ArrayBlockingQueue` uses a single lock; `LinkedBlockingQueue` uses separate locks for head and tail, allowing higher concurrency for mixed read/write workloads.
- **ConcurrentHashMap**: unlike `Collections.synchronizedMap()`, which locks the entire map for every operation, `ConcurrentHashMap` uses lock striping — segmenting the map into independently lockable regions similar to [load balancing](/recipes/architecture/load-balancing). Reads are usually lock-free. `computeIfAbsent` atomically checks and inserts, preventing the classic double-loading race in caches.
- **CopyOnWriteArrayList**: every write creates a full copy of the backing array. Reads are lock-free and fast. Writes are expensive, so this is ideal for collections with few writes and many reads — like event listener lists. An iterator over a copy-on-write list sees a snapshot from the time of iteration creation.
- **AtomicInteger / AtomicLong**: these are not collections, but they are the building blocks of concurrent counters, sequence generators, and statistics. `incrementAndGet()` uses a CPU `CAS` instruction, making it lock-free and typically faster than `synchronized` for simple counters.

## Variants

| Structure | Reads | Writes | Best for | Overhead |
|-----------|-------|--------|----------|----------|
| BlockingQueue | Blocking | Blocking | Producer-consumer with backpressure | Lock per op |
| ConcurrentHashMap | Lock-free | Lock striping | High-concurrency caches | Low |
| CopyOnWriteArrayList | Lock-free | Full copy | Few writes, many reads | High write |
| ConcurrentLinkedQueue | Lock-free | Lock-free | High-throughput queues | Low |
| SynchronizedMap | Locked | Locked | Simple migration path | High |

## Best practices

- **Prefer `ConcurrentHashMap` over `Collections.synchronizedMap()`**: synchronized wrappers lock the entire map for every operation, including `get()`. `ConcurrentHashMap` allows concurrent reads and finer-grained write locking. The performance difference is dramatic under thread contention.
- **Use `computeIfAbsent` for lazy cache initialization**: `if (!map.containsKey(key)) map.put(key, load())` is a race condition. Two threads may both load and put. `map.computeIfAbsent(key, k -> load())` atomically checks and inserts, ensuring the loader runs at most once per key.
- **Size bounded queues for backpressure**: an unbounded `LinkedBlockingQueue` can grow until the JVM runs out of memory under a fast producer. Always set a maximum size and use `put()` (blocking) instead of `offer()` (non-blocking) when you want to apply [backpressure](/recipes/api/rate-limiting).
- **Copy-on-write for listener lists**: if your application registers event listeners at startup and rarely changes them, `CopyOnWriteArrayList` gives lock-free reads. Do not use it for frequently updated lists — the copy cost per write becomes prohibitive.
- **Iterate with `Iterator`, not `for-each` on synchronized collections**: `for (Item item : synchronizedList)` is not atomic. Another thread can modify the list between iterator steps, throwing `ConcurrentModificationException`. Use explicit `synchronized(list) { ... }` blocks around iteration, or use concurrent collections.

## Common mistakes

- **Using `size()` for queue decisions**: checking `if (queue.size() > 0) queue.take()` is a race condition. The queue may become empty between the `size()` check and the `take()` call. Use blocking methods (`take()`, `put()`) or non-blocking methods (`poll()`, `offer()`) directly without pre-checking.
- **Modifying a collection while iterating**: even `ConcurrentHashMap` does not support modifying the map via the value returned by `iterator()`. Use `Iterator.remove()` or bulk operations (`removeIf`, `replaceAll`) instead of mutating inside a `for` loop.
- **Expecting ordering from `ConcurrentHashMap`**: `ConcurrentHashMap` does not guarantee iteration order. If you need sorted concurrent access, use `ConcurrentSkipListMap`, which provides `TreeMap`-like ordering with lock-free reads.
- **Forgetting `task_done()` in Python `Queue`**: `queue.task_done()` must be called after processing each item to signal completion to `queue.join()`. Missing calls cause `join()` to hang indefinitely, waiting for tasks that are already processed.

## FAQ

**Q: Should I always use concurrent collections in multithreaded code?**
A: If the collection is shared, yes. If each thread has its own collection (e.g., a local buffer accumulated and merged at the end), standard collections are faster and simpler. Concurrent collections have overhead you do not need for thread-local data.

**Q: Is `ConcurrentHashMap` fully thread-safe?**
A: Individual operations (`get`, `put`, `computeIfAbsent`) are thread-safe. Compound operations (`if (!map.containsKey(k)) map.put(k, v)`) are not. Use `computeIfAbsent`, `merge`, or `compute` for atomic compound operations.

**Q: When should I use `CopyOnWriteArrayList` vs `Collections.synchronizedList`?**
A: Use `CopyOnWriteArrayList` when writes are rare (e.g., event listeners configured at startup) and reads are frequent. Use `Collections.synchronizedList` when writes are frequent and reads are occasional — though `ConcurrentLinkedQueue` is often better than both for queue-like access patterns.

**Q: Can I use concurrent collections from async/await code?**
A: Java concurrent collections work fine with virtual threads and `CompletableFuture`. In Python, `asyncio` has its own `asyncio.Queue` — mixing `threading.Queue` with `asyncio` requires bridging between thread and event loop contexts using `loop.call_soon_threadsafe()`.

