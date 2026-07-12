---





contentType: docs
slug: race-condition-debugging-checklist
templateType: guideline
title: "Race Condition Debugging Checklist"
description: "Checklist for identifying and fixing race conditions in concurrent code: symptom identification, reproduction strategies, debugging tools, common patterns, fixes using locks, atomics, channels, and prevention techniques with code examples."
metaDescription: "Race condition debugging checklist: symptoms, reproduction, tools, common patterns, fixes with locks, atomics, channels, prevention for Python, Java, Go."
difficulty: advanced
topics:
  - concurrency
tags:
  - race-condition
  - concurrency
  - debugging
  - locks
  - atomics
  - channels
  - synchronization
relatedResources:
  - /docs/async-task-cancellation-runbook
  - /docs/thread-pool-sizing-template
  - /guides/complete-guide-go-concurrency
  - /guides/complete-guide-java-concurrency
  - /recipes/csp-communication
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Race condition debugging checklist: symptoms, reproduction, tools, common patterns, fixes with locks, atomics, channels, prevention for Python, Java, Go."
  keywords:
    - race condition
    - concurrency debugging
    - data race
    - thread safety
    - synchronization
    - mutex
    - atomic operations





---

## Overview

This checklist guides engineers through identifying, reproducing, and fixing race conditions in concurrent code. Race conditions occur when multiple threads access shared state without proper synchronization, leading to non-deterministic bugs that are hard to reproduce and debug. This document covers symptom identification, reproduction strategies, debugging tools, common patterns, and fixes.

---

## 1. Symptom Identification

### 1.1 Common Symptoms

```text
Symptom                          | Likely cause
─────────────────────────────────┼──────────────────────────────────────
Intermittent test failures       | Non-deterministic thread scheduling
Corrupted data / wrong values    | Lost updates or torn reads
Deadlocks / hangs                | Lock ordering inconsistency
High CPU with no progress        | Livelock or spin-wait
Memory corruption                | Unsynchronized writes to shared struct
Random crashes / segfaults       | Dangling pointer + concurrent free
Stale data in cache              | Missing memory barrier / visibility
Counter off by N                 | Non-atomic read-modify-write
```

### 1.2 Initial Triage Questions

```text
- [ ] Does the bug reproduce intermittently (not every run)?
- [ ] Does it reproduce more under load?
- [ ] Does it disappear when you add logging?
- [ ] Does it disappear when you run single-threaded?
- [ ] Are there shared mutable variables accessed from multiple threads?
- [ ] Are there lazy initialization patterns (double-checked locking)?
- [ ] Are there compound operations (check-then-act) on shared state?
- [ ] Is there a global/static mutable variable?
- [ ] Are locks acquired in different orders in different code paths?
- [ ] Are there callbacks or event handlers that run on different threads?
```

---

## 2. Reproduction Strategies

### 2.1 Stress Testing

```python
import threading
import pytest

class Counter:
    def __init__(self):
        self.value = 0

    def increment(self):
        self.value += 1  # RACE CONDITION: read-modify-write is not atomic

def test_race_condition():
    counter = Counter()
    threads = []

    # High concurrency to trigger race
    for _ in range(100):
        t = threading.Thread(target=lambda: [counter.increment() for _ in range(1000)])
        threads.append(t)

    for t in threads:
        t.start()
    for t in threads:
        t.join()

    # If race condition exists, counter.value < 100000
    assert counter.value == 100000, f"Race detected: {counter.value} != 100000"
```

### 2.2 Controlled Reproduction with Barriers

```python
import threading

def reproduce_race():
    shared = {}
    barrier = threading.Barrier(2)

    def writer():
        barrier.wait()  # Ensure both threads start simultaneously
        shared['key'] = 'value'

    def reader():
        barrier.wait()  # Ensure both threads start simultaneously
        return shared.get('key')  # May not see the write

    t1 = threading.Thread(target=writer)
    t2 = threading.Thread(target=reader)
    t1.start()
    t2.start()
    t1.join()
    t2.join()
```

### 2.3 Java Concurrency Tests with jcstress

```java
import org.openjdk.jcstress.annotations.*;
import org.openjdk.jcstress.infra.results.II_Result;

@JCStressTest
@Outcome(id = "1, 1", expect = Expect.ACCEPTABLE, desc = "Sequential")
@Outcome(id = "0, 1", expect = Expect.ACCEPTABLE, desc = "Writer first")
@Outcome(id = "1, 0", expect = Expect.ACCEPTABLE, desc = "Reader first")
@Outcome(id = "0, 0", expect = Expect.FORBIDDEN, desc = "Race condition")
@State
public class RaceConditionTest {
    int x = 0;
    int y = 0;

    @Actor
    public void actor1() {
        x = 1;
        y = 1;
    }

    @Actor
    public void actor2(II_Result r) {
        r.r1 = y;
        r.r2 = x;
    }
}
```

---

## 3. Debugging Tools

### 3.1 Tool Selection

```text
Language    | Tool                    | What it detects
────────────┼─────────────────────────┼──────────────────────────────
Java        | Thread Sanitizer (TSan) | Data races, deadlocks
Java        | jstack                  | Thread dumps, deadlock detection
Java        | jconsole / VisualVM     | Live thread monitoring
Java        | jcstress                | Concurrency correctness tests
Python      | threading.debug         | Thread state inspection
Python      | pytest-repeat           | Flaky test detection
Go          | -race flag              | Data races at runtime
Go          | pprof                   | Goroutine profiling
C/C++       | Thread Sanitizer (TSan) | Data races, tsan compile flag
Rust        | -Z sanitizer=thread     | Data races (nightly)
```

### 3.2 Go Race Detector

```bash
# Run tests with race detector
go test -race ./...

# Run binary with race detector
go run -race main.go

# Build with race detector
go build -race -o myapp
```

```go
// Example: Go race detector output
// ==================
// WARNING: DATA RACE
// Read at 0x00c00001e0c0 by goroutine 7:
//   main.increment()
//       /app/main.go:12 +0x44
//
// Previous write at 0x00c00001e0c0 by goroutine 6:
//   main.increment()
//       /app/main.go:12 +0x64
// ==================
```

### 3.3 Java Thread Dump Analysis

```bash
# Take a thread dump
jstack <pid> > thread_dump.txt

# Detect deadlock
jstack <pid> | grep -A 5 "Found .* deadlock"

# Find waiting threads
jstack <pid> | grep "waiting to lock"
```

---

## 4. Common Race Condition Patterns

### 4.1 Check-Then-Act

```python
# BAD: check-then-act race
if cache.get(key) is None:  # Thread A checks
    # Thread B also checks here — both see None
    value = expensive_computation(key)
    cache.set(key, value)  # Both threads compute and set

# FIX: use lock or atomic operation
lock = threading.Lock()
def get_or_compute(key):
    with lock:
        if cache.get(key) is None:
            value = expensive_computation(key)
            cache.set(key, value)
        return cache.get(key)
```

### 4.2 Lost Update (Read-Modify-Write)

```java
// BAD: lost update
class Counter {
    private int count = 0;
    public void increment() {
        count++;  // Not atomic: read, add 1, write
    }
}

// FIX 1: synchronized
class Counter {
    private int count = 0;
    public synchronized void increment() {
        count++;
    }
}

// FIX 2: AtomicInteger (better performance)
import java.util.concurrent.atomic.AtomicInteger;
class Counter {
    private final AtomicInteger count = new AtomicInteger(0);
    public void increment() {
        count.incrementAndGet();
    }
}
```

### 4.3 Lazy Initialization (Double-Checked Locking)

```java
// BAD: broken double-checked locking (Java < 5)
private static Singleton instance;
public static Singleton getInstance() {
    if (instance == null) {                    // Check 1 (no lock)
        synchronized (Singleton.class) {
            if (instance == null) {            // Check 2 (with lock)
                instance = new Singleton();    // Not visible to other threads
            }
        }
    }
    return instance;
}

// FIX: volatile keyword (Java 5+)
private static volatile Singleton instance;
public static Singleton getInstance() {
    if (instance == null) {
        synchronized (Singleton.class) {
            if (instance == null) {
                instance = new Singleton();
            }
        }
    }
    return instance;
}

// BETTER: use holder idiom (no synchronization needed)
private static class Holder {
    static final Singleton INSTANCE = new Singleton();
}
public static Singleton getInstance() {
    return Holder.INSTANCE;
}
```

### 4.4 Non-Atomic Compound Operations

```go
// BAD: non-atomic check-and-set
var balance int
func withdraw(amount int) bool {
    if balance >= amount {        // Check
        balance -= amount         // Act — another goroutine can modify balance here
        return true
    }
    return false
}

// FIX: mutex
var mu sync.Mutex
var balance int
func withdraw(amount int) bool {
    mu.Lock()
    defer mu.Unlock()
    if balance >= amount {
        balance -= amount
        return true
    }
    return false
}

// FIX: atomic compare-and-swap
import "sync/atomic"
var balance int64
func withdraw(amount int64) bool {
    for {
        current := atomic.LoadInt64(&balance)
        if current < amount {
            return false
        }
        if atomic.CompareAndSwapInt64(&balance, current, current-amount) {
            return true
        }
        // Retry if CAS failed (another goroutine modified balance)
    }
}
```

---

## 5. Fixes by Pattern

### 5.1 Locks (Mutex)

```python
import threading

class SafeCounter:
    def __init__(self):
        self._value = 0
        self._lock = threading.Lock()

    def increment(self):
        with self._lock:
            self._value += 1

    def get(self):
        with self._lock:
            return self._value
```

### 5.2 Atomics

```java
import java.util.concurrent.atomic.*;

// Atomic integer
AtomicInteger counter = new AtomicInteger(0);
counter.incrementAndGet();
counter.compareAndSet(0, 1);

// Atomic reference
AtomicReference<String> ref = new AtomicReference<>("initial");
ref.compareAndSet("initial", "updated");

// LongAdder for high-contention counters
LongAdder adder = new LongAdder();
adder.increment();
adder.sum();
```

### 5.3 Channels (Go)

```go
// Instead of sharing a variable, communicate through a channel
func counter(incrementCh chan struct{}, resultCh chan int, done chan struct{}) {
    count := 0
    for {
        select {
        case <-incrementCh:
            count++
        case resultCh <- count:
            // Send current count
        case <-done:
            return
        }
    }
}

// Usage
inc := make(chan struct{})
res := make(chan int)
done := make(chan struct{})
go counter(inc, res, done)

inc <- struct{}{}
fmt.Println(<-res) // 1
```

### 5.4 Thread-Local Storage

```python
import threading

local_data = threading.local()

def process_request(request):
    local_data.request_id = request.id
    local_data.user = request.user
    # Each thread has its own copy — no race
    handle_request()
```

---

## 6. Prevention Checklist

```text
Design phase:
  - [ ] Identify all shared mutable state
  - [ ] Prefer immutability where possible
  - [ ] Use thread-safe data structures (ConcurrentHashMap, etc.)
  - [ ] Minimize lock scope — lock only what you need
  - [ ] Define lock ordering to prevent deadlocks
  - [ ] Document thread-safety guarantees of each class

Implementation:
  - [ ] Use language-provided synchronization (not custom spinlocks)
  - [ ] Prefer atomics over locks for single-variable operations
  - [ ] Prefer channels/message-passing over shared memory (Go)
  - [ ] Use final/const/readonly for immutable fields
  - [ ] Avoid lazy initialization unless necessary
  - [ ] Use volatile/atomic for visibility guarantees

Testing:
  - [ ] Run concurrency stress tests in CI
  - [ ] Run with race detector (-race, TSan)
  - [ ] Run tests with high thread count and iterations
  - [ ] Use jcstress for Java memory model verification
  - [ ] Test on multi-core machines (not single-core CI)

Code review:
  - [ ] Check for shared mutable state in new code
  - [ ] Verify lock scope is minimal
  - [ ] Check for nested locks (deadlock risk)
  - [ ] Verify compound operations are atomic
  - [ ] Check for proper error handling inside locks
```

## FAQ

### What is the difference between a race condition and a data race?

A race condition is a logic flaw where the outcome depends on the timing of thread execution. A data race is a specific type of race condition where two threads access the same memory location concurrently, at least one is a write, and there is no synchronization. All data races are race conditions, but not all race conditions are data races. For example, a check-then-act pattern can be a race condition without a data race if both accesses are reads but the logic depends on ordering.

### How do I reproduce a race condition that only happens in production?

Start by collecting as much context as possible from production logs — thread dumps, timestamps, request traces. Build a stress test that simulates the production load and concurrency level. Use barriers or countdown latches to force threads to execute at the same time. Run the test thousands of times in a loop. Use a race detector (Go -race, Java TSan) to catch races at runtime. If the race involves specific data patterns, use production data snapshots in your test.

### When should I use locks vs atomics vs channels?

Use atomics for single-variable operations (counters, flags, simple state) — they are faster than locks and avoid deadlock risk. Use locks (mutex) for multi-variable operations or compound actions that must be atomic. Use channels (Go) when you want to communicate between goroutines without sharing memory — channels make the data flow explicit. In Go, prefer channels for orchestration and mutex for protecting shared state. In Java, prefer atomics for counters and locks for complex critical sections.

### How do I prevent deadlocks when using multiple locks?

Always acquire locks in a consistent global order. If thread A acquires lock1 then lock2, thread B must also acquire lock1 before lock2. Never acquire a lock while holding another lock unless following the global order. Use `tryLock` with a timeout to detect and recover from potential deadlocks. Keep lock scope as small as possible — acquire late, release early. Consider using a single coarse-grained lock if contention is low, and split into fine-grained locks only when profiling shows contention.

### What is a memory barrier and why does it matter?

A memory barrier (fence) is a CPU instruction that enforces ordering of memory operations. Without barriers, CPUs and compilers can reorder reads and writes for optimization, which can break concurrent code. The `volatile` keyword in Java inserts memory barriers, ensuring that writes are visible to other threads. In Go, channel operations and sync primitives insert barriers automatically. In C/C++, you must use atomic operations or explicit barriers. Missing memory barriers cause stale reads and invisible writes — classic race condition symptoms.

## See Also

- [Complete Guide to Go Concurrency](/guides/complete-guide-go-concurrency/)
- [Complete Guide to Java Concurrency](/guides/complete-guide-java-concurrency/)
- [Complete Guide to Python Asyncio](/guides/complete-guide-python-asyncio/)
- [Coordinate Concurrent Tasks with Communicating](/recipes/csp-communication/)
- [Concurrent Patterns with Go Goroutines and Channels](/recipes/go-goroutines-channels-patterns/)

