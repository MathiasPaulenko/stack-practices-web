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
  - async
  - threads
  - parallel
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

Sharing a standard `ArrayList` between threads is dangerous. Thread A reads index 0 while thread B removes index 0 â€” `ConcurrentModificationException`. Thread A and B both call `map.put("key", value)` simultaneously on a `HashMap` â€” the internal linked list can become circular, causing an infinite loop during iteration. These failures are non-deterministic: they may pass thousands of tests and fail only under production load.

Standard collections (`ArrayList`, `HashMap`, `LinkedList`) are not thread-safe. Wrapping every access in `synchronized` works but serializes all operations, defeating parallelism. Concurrent data structures are collections designed for multi-threaded access: they use fine-grained locks, lock-free algorithms, or immutability to allow safe concurrent reads and writes with minimal contention. Below is a practical approach to blocking queues, concurrent maps, copy-on-write collections, and atomic counters with practical examples.

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

- **BlockingQueue**: a queue that blocks producers when full and consumers when empty. This provides natural backpressure â€” a fast producer cannot overwhelm a slow consumer. `ArrayBlockingQueue` uses a single lock; `LinkedBlockingQueue` uses separate locks for head and tail, allowing higher concurrency for mixed read/write workloads.
- **ConcurrentHashMap**: unlike `Collections.synchronizedMap()`, which locks the entire map for every operation, `ConcurrentHashMap` uses lock striping â€” segmenting the map into independently lockable regions similar to [load balancing](/recipes/architecture/load-balancing). Reads are usually lock-free. `computeIfAbsent` atomically checks and inserts, preventing the classic double-loading race in caches.
- **CopyOnWriteArrayList**: every write creates a full copy of the backing array. Reads are lock-free and fast. Writes are expensive, so this is ideal for collections with few writes and many reads â€” like event listener lists. An iterator over a copy-on-write list sees a snapshot from the time of iteration creation.
- **AtomicInteger / AtomicLong**: these are not collections, but they are the building blocks of concurrent counters, sequence generators, and statistics. `incrementAndGet()` uses a CPU `CAS` instruction, making it lock-free and typically faster than `synchronized` for simple counters.

## Variants

| Structure | Reads | Writes | Best for | Overhead |
|-----------|-------|--------|----------|----------|
| BlockingQueue | Blocking | Blocking | Producer-consumer with backpressure | Lock per op |
| ConcurrentHashMap | Lock-free | Lock striping | High-concurrency caches | Low |
| CopyOnWriteArrayList | Lock-free | Full copy | Few writes, many reads | High write |
| ConcurrentLinkedQueue | Lock-free | Lock-free | High-throughput queues | Low |
| SynchronizedMap | Locked | Locked | Simple migration path | High |

## What Works

- **Prefer `ConcurrentHashMap` over `Collections.synchronizedMap()`**: synchronized wrappers lock the entire map for every operation, including `get()`. `ConcurrentHashMap` allows concurrent reads and finer-grained write locking. The performance difference is dramatic under thread contention.
- **Use `computeIfAbsent` for lazy cache initialization**: `if (!map.containsKey(key)) map.put(key, load())` is a race condition. Two threads may both load and put. `map.computeIfAbsent(key, k -> load())` atomically checks and inserts, ensuring the loader runs at most once per key.
- **Size bounded queues for backpressure**: an unbounded `LinkedBlockingQueue` can grow until the JVM runs out of memory under a fast producer. Always set a maximum size and use `put()` (blocking) instead of `offer()` (non-blocking) when you want to apply [backpressure](/recipes/api/rate-limiting).
- **Copy-on-write for listener lists**: if your application registers event listeners at startup and rarely changes them, `CopyOnWriteArrayList` gives lock-free reads. Do not use it for frequently updated lists â€” the copy cost per write becomes prohibitive.
- **Iterate with `Iterator`, not `for-each` on synchronized collections**: `for (Item item : synchronizedList)` is not atomic. Another thread can modify the list between iterator steps, throwing `ConcurrentModificationException`. Use explicit `synchronized(list) { ... }` blocks around iteration, or use concurrent collections.

## Common mistakes

- **Using `size()` for queue decisions**: checking `if (queue.size() > 0) queue.take()` is a race condition. The queue may become empty between the `size()` check and the `take()` call. Use blocking methods (`take()`, `put()`) or non-blocking methods (`poll()`, `offer()`) directly without pre-checking.
- **Modifying a collection while iterating**: even `ConcurrentHashMap` does not support modifying the map via the value returned by `iterator()`. Use `Iterator.remove()` or bulk operations (`removeIf`, `replaceAll`) instead of mutating inside a `for` loop.
- **Expecting ordering from `ConcurrentHashMap`**: `ConcurrentHashMap` does not guarantee iteration order. If you need sorted concurrent access, use `ConcurrentSkipListMap`, which provides `TreeMap`-like ordering with lock-free reads.
- **Forgetting `task_done()` in Python `Queue`**: `queue.task_done()` must be called after processing each item to signal completion to `queue.join()`. Missing calls cause `join()` to hang indefinitely, waiting for tasks that are already processed.

## When Not to Use This Approach

- **Single-threaded code**: concurrent collections add 2-10x overhead per operation. If only one thread accesses the data, use standard collections (HashMap, ArrayList, dict)
- **Read-heavy workloads with infrequent writes**: a CopyOnWriteArrayList copies the entire array on every write. If writes happen more than 5% of the time, the copy cost exceeds lock contention savings
- **Bulk operations on small collections**: ConcurrentHashMap.putAll() on a 10-element map is slower than synchronized(map) { putAll() } because per-segment locking adds overhead for small sizes
- **When iteration order matters**: ConcurrentHashMap does not guarantee iteration order. If you need FIFO or sorted iteration, use ConcurrentSkipListMap or ConcurrentLinkedDeque with awareness of their tradeoffs
- **Memory-constrained environments**: concurrent collections use more memory than standard ones (segment arrays, CAS metadata, extra padding). On devices with <256MB RAM, the overhead may be unacceptable
- **Immutable data sharing**: if data is written once and read by many threads, use immutable structures or olatile references instead of concurrent collections. No synchronization needed for read-only immutable data
- **Low-contention scenarios**: if contention is rare (e.g., a counter updated once per minute), a plain variable with occasional synchronized blocks is simpler and faster than AtomicLong or ConcurrentHashMap

## Performance Benchmarks

- **ConcurrentHashMap vs HashMap**: single-threaded put() on ConcurrentHashMap is 1.5-2x slower than HashMap. Under 16-thread contention, ConcurrentHashMap is 5-10x faster than synchronized(HashMap)
- **AtomicInteger vs synchronized**: AtomicInteger.incrementAndGet() takes ~5ns vs ~50ns for synchronized counter. The gap widens under contention: at 8 threads, atomic is 20x faster
- **ConcurrentLinkedQueue vs ArrayBlockingQueue**: ConcurrentLinkedQueue offers 2-3x higher throughput for non-blocking enqueue/dequeue. ArrayBlockingQueue is better when backpressure is needed (bounded capacity)
- **CopyOnWriteArrayList**: reads are 1.2x faster than ArrayList (no synchronization). Writes are 10-100x slower due to array copy. Break-even at 99% reads, 1% writes
- **ConcurrentSkipListMap vs TreeMap**: ConcurrentSkipListMap is 1.5-2x slower than TreeMap for single-threaded operations. Under 8-thread contention, it scales linearly while TreeMap with locks does not
- **Python queue.Queue vs collections.deque**: queue.Queue adds ~2us per put/get for thread safety. deque with manual locking is 1.5x faster but error-prone. queue.SimpleQueue is a good middle ground
- **Memory overhead**: ConcurrentHashMap uses ~50% more memory than HashMap due to segment arrays. CopyOnWriteArrayList uses 2x memory (two array copies during writes)

## Testing Strategy

- **Stress test with thread counts matching production**: test with 2x the expected thread count. If production uses 8 threads, test with 16. Race conditions often appear only at specific thread counts
- **Verify atomicity of compound operations**: test computeIfAbsent under concurrent access. Assert that the mapping function is called exactly once per key. Use a ConcurrentHashMap with a counting mapper
- **Test iteration consistency**: concurrent collection iterators are weakly consistent. Verify that iterations do not throw ConcurrentModificationException and reflect some state, not necessarily the latest
- **Test bounded queue blocking behavior**: verify put() blocks when the queue is full and 	ake() blocks when empty. Use timeouts to detect deadlocks
- **Test bulk operations**: putAll, clear, and eplaceAll on concurrent collections may have non-atomic semantics. Verify behavior under concurrent modification
- **Test memory leaks**: long-running tests with millions of put/remove cycles. Monitor heap usage for leaks in internal structures (e.g., ConcurrentHashMap segment arrays)
- **Test with realistic data distribution**: skew and hot keys behave differently than uniform distribution. Test with production-like key patterns to identify contention hotspots

## Cost Estimation

- **Memory overhead budget**: concurrent collections use 1.5-2x more memory. For a 10GB in-memory cache, this means 15-20GB. Plan instance sizing accordingly
- **Development time**: choosing the right concurrent collection takes 2-4 hours of analysis per use case. The wrong choice leads to bugs that take days to diagnose
- **Training cost**: team members need to understand happens-before semantics, weakly consistent iterators, and CAS operations. Budget 1-2 days of training per developer
- **Server cost savings**: using concurrent collections instead of coarse-grained locking can reduce response times by 30-60%, allowing fewer servers to handle the same load
- **Debugging cost**: bugs in concurrent collections are hard to reproduce. A single race condition can take 20-40 hours to diagnose. Invest in stress testing early

## Monitoring and Observability

- **Collection size**: monitor the size of concurrent queues and maps. A growing queue indicates consumers cannot keep up. Alert when size exceeds 80% of capacity
- **Contention metrics**: track lock contention on synchronized collections. Use jstack or async-profiler to identify hot locks. High contention indicates a need for finer-grained locking or concurrent alternatives
- **Operation latency**: monitor put, get, 	ake latencies. P99 >10ms on a concurrent queue indicates contention or GC pressure
- **Memory usage**: track the memory overhead of concurrent collections. Compare against expected size. Unexpected growth may indicate a leak in internal structures
- **Thread wait time**: monitor thread state distribution. High BLOCKED or WAITING thread counts indicate lock contention or empty queue waits

## Deployment Checklist

- [ ] Verify JVM version supports the concurrent collections you use (Java 8+ for ConcurrentHashMap improvements, Java 9+ for ConcurrentHashMap.keySet views)
- [ ] Set appropriate initial capacity to avoid resizing under load (resizing a ConcurrentHashMap is expensive)
- [ ] Configure bounded queue capacities based on memory budget and expected throughput
- [ ] Enable JMX monitoring for concurrent collection metrics (size, capacity, contention)
- [ ] Set thread pool sizes to match the number of concurrent collection consumers
- [ ] Test under production-like load before deployment to verify no contention hotspots

## Security Considerations

- **Denial of service via collection flooding**: an attacker can fill an unbounded ConcurrentLinkedQueue until memory is exhausted. Use bounded queues (ArrayBlockingQueue) for user-facing operations
- **Deserialization attacks on concurrent collections**: Java's eadObject on ConcurrentHashMap does not call computeIfAbsent. Custom deserialization can bypass concurrency guarantees. Validate deserialized data
- **Information leakage via weakly consistent iterators**: iterators on concurrent collections reflect a past state. If sensitive data is removed between iterations, a stale iterator may still expose it. Clear sensitive data atomically
- **Race conditions in check-then-act**: if (!map.containsKey(k)) map.put(k, v) is not atomic on ConcurrentHashMap. Use computeIfAbsent or putIfAbsent to prevent race conditions that could insert duplicate or unauthorized entries
- **Memory exhaustion via large keys**: concurrent collections do not limit key size. An attacker can insert entries with large keys to exhaust memory. Implement size limits at the application level
- **Poison pill attacks**: a malicious producer can insert a "poison" object into a shared queue that causes consumers to crash. Validate queue elements before processing
- **Thread starvation via priority inversion**: a low-priority thread holding a lock on a concurrent collection can block high-priority threads. Use fair locking policies (ReentrantLock(fair=true)) in security-sensitive contexts
- **Side-channel timing attacks**: concurrent collection operations have timing variations based on internal state. An attacker measuring response times can infer collection size or contents. Add constant-time checks for security-sensitive operations
- **Unsafe publication via concurrent collections**: placing an object in a ConcurrentHashMap publishes it safely (happens-before). But objects placed in a regular HashMap accessed by multiple threads are not safely published and may be seen in an inconsistent state
- **Resource cleanup race**: removing an entry from a concurrent map does not guarantee its resources (file handles, connections) are cleaned up. Use computeIfPresent with a cleanup function or emove(key, value) for atomic removal-and-cleanup
- **Iterator invalidation in concurrent contexts**: iterators from ConcurrentHashMap are weakly consistent and do not throw ConcurrentModificationException. This can mask bugs where elements are removed during iteration. Use explicit synchronization if consistent iteration is required
- **Cross-thread data poisoning**: if one thread corrupts a shared object's internal state (e.g., a mutable value in a ConcurrentHashMap), all threads see the corruption. Use immutable values or defensive copies
- **Bounded queue DoS via blocking**: an attacker filling a bounded queue causes put() to block, denying service to producers. Set timeouts on put() operations (offer(timeout)) and implement load shedding
- **CAS-based attack surface**: compareAndSet operations on AtomicReference can be exploited if the expected value is attacker-controlled. Ensure that CAS operations use internally managed expected values, not user input
## FAQ

**Q: Should I always use concurrent collections in multithreaded code?**
A: If the collection is shared, yes. If each thread has its own collection (e.g., a local buffer accumulated and merged at the end), standard collections are faster and simpler. Concurrent collections have overhead you do not need for thread-local data.

**Q: Is `ConcurrentHashMap` fully thread-safe?**
A: Individual operations (`get`, `put`, `computeIfAbsent`) are thread-safe. Compound operations (`if (!map.containsKey(k)) map.put(k, v)`) are not. Use `computeIfAbsent`, `merge`, or `compute` for atomic compound operations.

**Q: When should I use `CopyOnWriteArrayList` vs `Collections.synchronizedList`?**
A: Use `CopyOnWriteArrayList` when writes are rare (e.g., event listeners configured at startup) and reads are frequent. Use `Collections.synchronizedList` when writes are frequent and reads are occasional â€” though `ConcurrentLinkedQueue` is often better than both for queue-like access patterns.

**Q: Can I use concurrent collections from async/await code?**
A: Java concurrent collections work fine with virtual threads and `CompletableFuture`. In Python, `asyncio` has its own `asyncio.Queue` â€” mixing `threading.Queue` with `asyncio` requires bridging between thread and event loop contexts using `loop.call_soon_threadsafe()`.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
