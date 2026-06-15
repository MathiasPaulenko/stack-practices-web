---
contentType: recipes
slug: locks-and-mutexes
title: "Coordinate Shared Access with Locks, Mutexes, and Semaphores"
description: "How to prevent race conditions in concurrent programs using mutexes, read-write locks, semaphores, and atomic operations in Java, Python, and C++."
metaDescription: "Learn lock coordination for concurrent programs. Prevent race conditions using mutexes, read-write locks, semaphores, and atomic operations in Java, Python, C++."
difficulty: intermediate
topics:
  - concurrency
tags:
  - mutex
  - semaphore
  - read-write-lock
  - race-condition
  - synchronization
  - atomic-operations
  - concurrency
  - thread-safety
relatedResources:
  - /recipes/async-patterns
  - /recipes/thread-pools
  - /recipes/microservices-patterns
  - /recipes/database-transactions
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn lock coordination for concurrent programs. Prevent race conditions using mutexes, read-write locks, semaphores, and atomic operations in Java, Python, C++."
  keywords:
    - mutex
    - semaphore
    - read write lock
    - race condition
    - thread synchronization
---

## Overview

When multiple threads access shared data simultaneously, the result depends on the exact timing of their execution — a race condition. Thread A reads a bank balance of $100, Thread B reads the same $100, both add $50, and both write back $150. The correct result is $200, but the actual result is $150. The lost $50 is a data race caused by uncoordinated access.

Locks solve this by ensuring that only one thread accesses critical data at a time. A mutex (mutual exclusion lock) allows one thread to enter a critical section. A read-write lock allows many readers simultaneously but only one writer. A semaphore controls access to a finite pool of resources (e.g., 10 database connections). Atomic operations provide lock-free updates for simple counters. This recipe covers when and how to use each mechanism.

## When to use it

Use this recipe when:

- Multiple threads read and write the same mutable state
- Protecting in-memory caches, counters, or configuration shared across threads
- Limiting concurrent access to external resources (APIs, databases, file handles)
- Implementing thread-safe data structures (queues, maps, pools)
- Avoiding data races without redesigning the entire architecture to be lock-free

## Solution

### Mutex (Java)

```java
import java.util.concurrent.locks.ReentrantLock;

class BankAccount {
    private double balance;
    private final ReentrantLock lock = new ReentrantLock();

    public void deposit(double amount) {
        lock.lock();
        try {
            balance += amount;
        } finally {
            lock.unlock();
        }
    }

    public double getBalance() {
        lock.lock();
        try {
            return balance;
        } finally {
            lock.unlock();
        }
    }
}

// Or using synchronized
class SynchronizedAccount {
    private double balance;

    public synchronized void deposit(double amount) {
        balance += amount;
    }

    public synchronized double getBalance() {
        return balance;
    }
}
```

### Read-Write Lock (Java)

```java
import java.util.concurrent.locks.ReentrantReadWriteLock;

class CachedData {
    private String data;
    private boolean cacheValid;
    private final ReentrantReadWriteLock rwl = new ReentrantReadWriteLock();

    public String processData() {
        rwl.readLock().lock();
        if (cacheValid) {
            String result = data;
            rwl.readLock().unlock();
            return result;
        }
        rwl.readLock().unlock();

        rwl.writeLock().lock();
        try {
            if (!cacheValid) {
                data = fetchFromDatabase();
                cacheValid = true;
            }
            return data;
        } finally {
            rwl.writeLock().unlock();
        }
    }
}
```

### Semaphore (Python)

```python
from threading import Semaphore, Thread
import time

class ConnectionPool:
    def __init__(self, max_connections):
        self.semaphore = Semaphore(max_connections)
        self.connections = [f"conn-{i}" for i in range(max_connections)]

    def acquire(self):
        self.semaphore.acquire()
        return self.connections.pop()

    def release(self, conn):
        self.connections.append(conn)
        self.semaphore.release()

pool = ConnectionPool(3)

def worker(worker_id):
    conn = pool.acquire()
    print(f"Worker {worker_id} using {conn}")
    time.sleep(1)
    pool.release(conn)
    print(f"Worker {worker_id} released {conn}")

threads = [Thread(target=worker, args=(i,)) for i in range(5)]
for t in threads:
    t.start()
for t in threads:
    t.join()
```

### Atomic Operations (C++)

```cpp
#include <atomic>
#include <thread>
#include <vector>
#include <iostream>

std::atomic<int> counter{0};

void increment() {
    for (int i = 0; i < 100000; ++i) {
        counter.fetch_add(1, std::memory_order_relaxed);
    }
}

int main() {
    std::vector<std::thread> threads;
    for (int i = 0; i < 4; ++i) {
        threads.emplace_back(increment);
    }
    for (auto& t : threads) {
        t.join();
    }
    std::cout << "Counter: " << counter.load() << std::endl; // 400000
}
```

## Explanation

- **Mutex**: ensures mutual exclusion — only one thread holds the lock at a time. Other threads block until the lock is released. Simple and effective, but can become a bottleneck if the critical section is large or frequently accessed.
- **Read-write lock**: allows multiple concurrent readers but only one writer. Ideal for read-heavy workloads where writes are rare. A reader does not block other readers, but a writer blocks everyone. Downgrading from write to read is supported in some implementations.
- **Semaphore**: a generalized lock with a counter. A mutex is a semaphore with count 1. A pool semaphore with count 10 allows 10 threads to enter simultaneously. Useful for resource pools, throttling, and backpressure.
- **Atomic operations**: lock-free updates using CPU instructions like `CAS` (compare-and-swap). Faster than locks for simple operations but limited in scope. Use for counters and flags. Complex updates still require locks.

## Variants

| Mechanism | Concurrent readers | Concurrent writers | Best for | Overhead |
|-----------|-------------------|--------------------|----------|----------|
| Mutex | No | No | General protection | Medium |
| Read-write lock | Yes | No | Read-heavy data | Medium |
| Semaphore | N (configurable) | N (configurable) | Resource pools | Medium |
| Spinlock | No | No | Very short critical sections | Low CPU |
| Atomic | N/A (no lock) | N/A | Counters, flags | Lowest |

## Best practices

- **Keep critical sections small**: the smaller the locked region, the less contention. Lock, update one variable, unlock. Do not perform I/O, calculations, or external calls while holding a lock. Long critical sections serialize threads and defeat the purpose of concurrency.
- **Always unlock in finally**: a thread that throws an exception while holding a lock will never release it, deadlocking other threads. Use try/finally (Java), `with` (Python), or RAII (C++ `std::lock_guard`) to ensure unlock happens even on exceptions.
- **Avoid nested locks**: acquiring lock A then lock B, while another thread acquires B then A, creates a classic deadlock. If nested locks are unavoidable, always acquire them in a consistent global order. Better yet, redesign to avoid nesting.
- **Prefer read-write locks for read-heavy data**: if 99% of accesses are reads, a mutex serializes 99% of operations unnecessarily. A read-write lock allows parallel reads, dramatically improving throughput on caches, configuration, and lookup tables.
- **Use atomics for simple counters**: an `AtomicInteger` or `std::atomic<int>` for a counter is faster than a mutex and eliminates deadlock risk. Do not use atomics for compound operations (e.g., "check balance then withdraw") — those require a lock.

## Common mistakes

- **Locking on mutable objects**: `synchronized(someList)` fails if the reference changes. Another thread may synchronize on a different object. Use a final private field as the lock monitor, never the data itself.
- **Forgetting to unlock after early return**: a method with multiple return paths may return without unlocking. This is why Java's `ReentrantLock` requires explicit `unlock()` — it forces you to think about every exit path. Use try/finally religiously.
- **Over-locking (locking too much)**: wrapping an entire method in `synchronized` may protect data but serializes all callers, making the code effectively single-threaded. Identify the exact shared state that needs protection and lock only that.
- **Testing without concurrency stress**: a race condition may not manifest with 2 threads on a development machine. Use stress tests with hundreds of threads, loop millions of iterations, and run on multi-core hardware. Tools like ThreadSanitizer detect data races at runtime.

## FAQ

**Q: Should I use synchronized or ReentrantLock in Java?**
A: Use `synchronized` for simple cases — it is less error-prone (unlock is automatic). Use `ReentrantLock` when you need try-lock (non-blocking), timed lock (timeout), lock interruption, or multiple condition variables.

**Q: Does Python have a GIL, making locks unnecessary?**
A: The GIL prevents true thread parallelism for CPU work, but locks are still necessary for thread safety. Two threads can still interleave operations on shared data between bytecode instructions. Use `threading.Lock` for shared mutable state.

**Q: What is lock contention and how do I reduce it?**
A: Contention occurs when multiple threads compete for the same lock. Reduce it by: (1) shrinking critical sections, (2) using read-write locks, (3) sharding data (each shard has its own lock), (4) using lock-free structures, or (5) reducing thread count.

**Q: Are semaphores and mutexes the same thing?**
A: A mutex is a binary semaphore (count = 1) with ownership semantics — only the thread that locked it can unlock it. A semaphore has a configurable count and no ownership. Use a mutex for exclusive access; a semaphore for resource pools.

