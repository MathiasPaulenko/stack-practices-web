---
contentType: recipes
slug: concurrent-data-structures
title: "Concurrent Data Structures for Thread-Safe Collections"
description: "How to safely share collections between threads using concurrent data structures—blocking queues, maps, lists, and atomic counters—in Java, Python, and C++."
metaDescription: "Concurrent data structures for thread-safe collections in Java, Python, and C++: blocking queues, concurrent maps, and atomic counters—no hand-written locks."
difficulty: intermediate
topics:
  - concurrency
tags:
  - concurrency
  - atomic-operations
  - threads
  - parallel
  - java
  - python
  - cpp
relatedResources:
  - /recipes/locks-and-mutexes
  - /recipes/thread-pools
  - /recipes/python-thread-pool-executor
  - /recipes/race-condition-prevention
  - /recipes/csp-communication
  - /recipes/async-patterns
lastUpdated: "2026-08-16"
publishedAt: "2026-06-14"
author: Mathias Paulenko
seo:
  metaDescription: "Concurrent data structures for thread-safe collections in Java, Python, and C++: blocking queues, concurrent maps, and atomic counters—no hand-written locks."
  keywords:
    - concurrent data structures
    - thread-safe collections
    - blocking queue
    - concurrent hash map
    - atomic counter
    - producer-consumer
    - copy-on-write
---

## Overview

Sharing a plain `ArrayList` or `HashMap` across threads is asking for silent corruption. One thread can read index 0 while another removes it, throwing `ConcurrentModificationException` or, worse, leaving the internal bucket list in an inconsistent state. These bugs often pass every unit test and surface only under real load.

That's the job concurrent collections are built for. They use fine-grained locks, lock-free algorithms, or snapshots so more than one thread can read and write safely without wrapping every call in `synchronized`. Java, Python, and C++ versions are shown below.

## When to Use

Reach for a concurrent collection when more than one thread reads and writes the same data. That includes producer-consumer pipelines, shared caches, job queues, or [thread pool](/recipes/thread-pools)-bound connection pools. They're also a good drop-in replacement for synchronized maps or synchronized lists when you want less lock contention, and they give you the happens-before visibility you'd otherwise have to build by hand.

## When NOT to Use

Skip them when only one thread touches the data, because the extra coordination is pure overhead. Avoid copy-on-write lists if writes are frequent — each write copies the whole array. Don't expect a stable iteration order from a concurrent hash map; use a concurrent skip list map if you need sorted access. If the data is written once and then only read, an immutable snapshot or a volatile reference is usually simpler and faster. In Python, keep the threading queue out of asyncio coroutines; use the asyncio queue there.

## Solution

### Blocking Queue (Java)

```java
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

record Order(int id) {}

class OrderProcessor {
    private final BlockingQueue<Order> queue = new ArrayBlockingQueue<>(100);

    public void submit(Order order) throws InterruptedException {
        queue.put(order); // blocks if full
    }

    public Order take() throws InterruptedException {
        return queue.take(); // blocks if empty
    }

    public void process(Order order) {
        System.out.println("Processing " + order.id());
    }

    public void start() {
        Thread producer = new Thread(() -> {
            try {
                for (int i = 0; i < 1000; i++) {
                    submit(new Order(i));
                }
                for (int i = 0; i < 4; i++) {
                    submit(new Order(-1)); // sentinel to stop each consumer
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });

        for (int i = 0; i < 4; i++) {
            new Thread(() -> {
                while (!Thread.currentThread().isInterrupted()) {
                    try {
                        Order order = take();
                        if (order.id() == -1) break;
                        process(order);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }).start();
        }

        producer.start();
    }

    public static void main(String[] args) {
        new OrderProcessor().start();
    }
}
```

### Concurrent Map (Java)

```java
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

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

    def process(self, task):
        print(f"Processing {task}")

    def producer(self):
        for i in range(1000):
            self.submit(i)
        for _ in range(4):
            self.queue.put(None)  # sentinel to stop each worker

    def worker(self):
        while True:
            task = self.queue.get()  # blocks if empty
            if task is None:
                self.queue.task_done()
                break
            self.process(task)
            self.queue.task_done()

    def start(self):
        workers = [Thread(target=self.worker) for _ in range(4)]
        for w in workers:
            w.start()
        producer = Thread(target=self.producer)
        producer.start()
        producer.join()
        self.queue.join()

TaskQueue().start()
```

### Copy-on-Write List (Java)

```java
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

record Event(String type) {}

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

### Python Counter (Atomic)

```python
import threading

class AtomicCounter:
    def __init__(self):
        self._value = 0
        self._lock = threading.Lock()

    def increment(self):
        with self._lock:
            self._value += 1
            return self._value

    def value(self):
        with self._lock:
            return self._value

counter = AtomicCounter()

def worker():
    for _ in range(100_000):
        counter.increment()

threads = [threading.Thread(target=worker) for _ in range(4)]
for t in threads:
    t.start()
for t in threads:
    t.join()

print(counter.value())
```

### C++ Atomic Counter

```cpp
#include <atomic>
#include <iostream>
#include <thread>

std::atomic<int> counter{0};

int main() {
    std::thread t1([] {
        for (int i = 0; i < 100000; ++i) {
            counter++;
        }
    });

    std::thread t2([] {
        for (int i = 0; i < 100000; ++i) {
            counter++;
        }
    });

    t1.join();
    t2.join();

    std::cout << counter << '\n';
}
```

## Explanation

A blocking queue blocks producers when the queue's full and consumers when it's empty. That built-in backpressure stops a fast producer from overwhelming a slow consumer. An array-backed blocking queue uses a single lock; a linked one uses separate locks for head and tail. That separation reduces contention when producers and consumers run at the same time.

A ConcurrentHashMap doesn't put a global lock on the whole map like a synchronized wrapper. It uses fine-grained bucket locking (per-bin lock striping), so reads are usually lock-free and writes hit only a small region. The map's computeIfAbsent method makes lazy cache loading atomic. If you're guarding a larger critical section, review [locks and mutexes](/recipes/locks-and-mutexes).

A copy-on-write list makes a fresh copy of its backing array on every write, so reads are lock-free and always see a stable snapshot. That's great when writes are rare, such as event listener lists or small configuration snapshots.

Python's queue uses a reentrant lock and two semaphores, so put, get, and task_done are safe from any thread. In asyncio, use asyncio.Queue instead of queue.Queue; the latter is built for threads, not coroutines.

An atomic counter in Python uses a single lock around the integer, while std::atomic in C++ uses hardware compare-and-swap. Both avoid explicit mutexes for simple counters. For larger state changes, review the [race condition prevention](/recipes/race-condition-prevention) recipe.

## Variants

| Structure | Reads | Writes | Best for | Overhead |
|-----------|-------|--------|----------|----------|
| `ArrayBlockingQueue` | Blocking | Blocking | Producer-consumer with backpressure | One lock |
| `LinkedBlockingQueue` | Blocking | Blocking | Higher producer-consumer throughput | Separate head/tail locks |
| `ConcurrentHashMap` | Lock-free | Per-bin lock striping | High-concurrency caches, maps | Low |
| `CopyOnWriteArrayList` | Lock-free | Full array copy | Few writes, many reads | High on writes |
| `ConcurrentLinkedQueue` | Lock-free | Lock-free | Non-blocking work queues | Low |
| `Collections.synchronizedMap` | Fully locked | Fully locked | Simple migration, low contention | High under contention |

## Best Practices

- Reach for a concurrent hash map instead of a fully synchronized map. Synchronized wrappers grab the whole map for every operation, even a get; the concurrent version lets many reads happen at once.
- Use computeIfAbsent for lazy cache loading instead of checking the key and then putting the value yourself. It runs the loader at most once per key and prevents two threads from loading and overwriting the same value.
- Cap your blocking queues and use a blocking put when you want backpressure. An unbounded linked blocking queue can grow until the JVM runs out of memory.
- Copy-on-write lists work well for listener lists and configuration snapshots that change rarely. Skip them when writes are common.
- Prefer the language's built-in concurrent collections over a hand-rolled synchronized wrapper. The built-in ones are tested, optimized, and the behavior is documented.

## Common Mistakes

- Checking the queue size before taking an item can fail if the queue empties between the size check and the `take`; that's a check-then-act race.
- Mutating a collection while you iterate over it isn't safe: even a concurrent hash map doesn't support changing the map inside a loop over its values, so collect keys first or remove through the iterator.
- Expecting a concurrent hash map to keep a stable order is a mistake; iteration order can change as the table resizes, so use a concurrent skip list map if you need sorted concurrent access.
- Forgetting to call task_done() after each item; the queue then never reports it's finished, so join() hangs the caller.
- An atomic counter protects the value it wraps and nothing else. Treating it as a fix for every shared-state problem is a mistake.

## Production Notes

- Set an initial capacity on the concurrent hash map to avoid expensive resizing under load. Growing it costs more than growing a plain hash map.
- Use an array-backed blocking queue when you want bounded backpressure with minimal allocation, and a linked one when you can trade a little memory for higher throughput.
- Keep an eye on queue size, cache hit rate, and listener list length; a growing queue, falling hit rate, or long listener list is an early warning of memory leaks or consumer lag.
- Stress-test with more threads and longer runs than you expect in production; race conditions often hide until the pressure is on.
- Make values immutable or copy them defensively before sharing; a thread-safe container only coordinates access to the container, not changes to the objects inside it.

## FAQ

### When is a BlockingQueue worth it?

Producers have to pause when the queue is full and consumers have to wait when it's empty; this built-in backpressure keeps the queue from growing without bound and avoids wasting CPU.

### Is every ConcurrentHashMap operation safe?

Single reads and writes are safe, but a containsKey-then-put sequence isn't. Let computeIfAbsent or merge handle that check-then-act logic.

### Can I iterate over a ConcurrentHashMap while other threads write to it?

Yes. The iterator is weakly consistent and shows the map at some point after it was created, so recent changes may not appear. It won't throw ConcurrentModificationException.

### When does CopyOnWriteArrayList hurt performance?

It gets expensive when writes are frequent, because every write copies the whole array. Use it when reads far outnumber writes, such as event listener lists.

### Do I still need locks with std::atomic?

No. A simple counter or flag only needs an atomic. It only protects the value it wraps. If several related fields change together, you still need a mutex or a higher-level design.

### Why not just use Collections.synchronizedList everywhere?

Every read or write locks the entire list. Once threads start contending, they queue up and throughput drops. Concurrent collections avoid that bottleneck.

## Key Takeaways

Match the structure to the reads and writes, not just to the language. A BlockingQueue fits producer-consumer pipelines, a ConcurrentHashMap fits shared caches, and a CopyOnWriteArrayList fits listener lists that barely change.

Atomic counters and thread-safe queues cover most of the locking, but they don't make your values immutable. A thread-safe container only coordinates access to itself, not the objects inside it. Keep values immutable or copy them before sharing.

## Further Reading

For Java, the package summary and [ConcurrentHashMap](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html) docs explain the API. For Python, the [queue](https://docs.python.org/3/library/queue.html) and [threading](https://docs.python.org/3/library/threading.html) modules are the references. For C++, the [std::atomic](https://en.cppreference.com/w/cpp/atomic/atomic) page has the details. Worth reading next: [Thread pools](/recipes/thread-pools), [Locks and mutexes](/recipes/locks-and-mutexes), and [Race condition prevention](/recipes/race-condition-prevention).
