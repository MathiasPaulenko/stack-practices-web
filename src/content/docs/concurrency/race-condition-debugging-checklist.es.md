---
contentType: docs
slug: race-condition-debugging-checklist
templateType: guideline
title: "Checklist de Debugging de Race Conditions"
description: "Checklist para identificar y fixear race conditions en concurrent code: symptom identification, reproduction strategies, debugging tools, common patterns, fixes usando locks, atomics, channels y prevention techniques con ejemplos de codigo."
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
  - /docs/concurrency/async-task-cancellation-runbook
  - /docs/concurrency/thread-pool-sizing-template
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

Este checklist guia a engineers through identificar, reproducir y fixear race conditions en concurrent code. Race conditions ocurren cuando multiple threads acceden shared state sin proper synchronization, llevando a non-deterministic bugs que son hard de reproducir y debuggear. Este documento cubre symptom identification, reproduction strategies, debugging tools, common patterns y fixes.

---

## 1. Symptom Identification

### 1.1 Common Symptoms

```text
Symptom                          | Likely cause
─────────────────────────────────┼──────────────────────────────────────
Intermittent test failures       | Non-deterministic thread scheduling
Corrupted data / wrong values    | Lost updates o torn reads
Deadlocks / hangs                | Lock ordering inconsistency
High CPU con no progress         | Livelock o spin-wait
Memory corruption                | Unsynchronized writes a shared struct
Random crashes / segfaults       | Dangling pointer + concurrent free
Stale data en cache              | Missing memory barrier / visibility
Counter off by N                 | Non-atomic read-modify-write
```

### 1.2 Initial Triage Questions

```text
- [ ] El bug reproduce intermittent (no every run)?
- [ ] Reproduce mas under load?
- [ ] Desaparece cuando addes logging?
- [ ] Desaparece cuando corres single-threaded?
- [ ] Hay shared mutable variables accessed de multiple threads?
- [ ] Hay lazy initialization patterns (double-checked locking)?
- [ ] Hay compound operations (check-then-act) en shared state?
- [ ] Hay un global/static mutable variable?
- [ ] Locks se adquieren en different orders en different code paths?
- [ ] Hay callbacks o event handlers que corren en different threads?
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
        self.value += 1  # RACE CONDITION: read-modify-write no es atomic

def test_race_condition():
    counter = Counter()
    threads = []

    # High concurrency para trigger race
    for _ in range(100):
        t = threading.Thread(target=lambda: [counter.increment() for _ in range(1000)])
        threads.append(t)

    for t in threads:
        t.start()
    for t in threads:
        t.join()

    # Si race condition existe, counter.value < 100000
    assert counter.value == 100000, f"Race detected: {counter.value} != 100000"
```

### 2.2 Controlled Reproduction con Barriers

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
        return shared.get('key')  # May not see el write

    t1 = threading.Thread(target=writer)
    t2 = threading.Thread(target=reader)
    t1.start()
    t2.start()
    t1.join()
    t2.join()
```

### 2.3 Java Concurrency Tests con jcstress

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
# Corre tests con race detector
go test -race ./...

# Corre binary con race detector
go run -race main.go

# Buildea con race detector
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
# Toma un thread dump
jstack <pid> > thread_dump.txt

# Detecta deadlock
jstack <pid> | grep -A 5 "Found .* deadlock"

# Find waiting threads
jstack <pid> | grep "waiting to lock"
```

---

## 4. Common Race Condition Patterns

### 4.1 Check-Then-Act

```python
# BAD: check-then-act race
if cache.get(key) is None:  # Thread A checkea
    # Thread B tambien checkea aqui — both ven None
    value = expensive_computation(key)
    cache.set(key, value)  # Both threads computean y setean

# FIX: usa lock o atomic operation
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

// FIX 2: AtomicInteger (mejor performance)
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
            if (instance == null) {            // Check 2 (con lock)
                instance = new Singleton();    // Not visible a other threads
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

// MEJOR: usa holder idiom (no synchronization needed)
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
        balance -= amount         // Act — otro goroutine puede modificar balance aqui
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
        // Retry si CAS fallo (otro goroutine modifico balance)
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

// LongAdder para high-contention counters
LongAdder adder = new LongAdder();
adder.increment();
adder.sum();
```

### 5.3 Channels (Go)

```go
// En vez de sharear un variable, communicatea through un channel
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
    # Cada thread tiene su own copy — no race
    handle_request()
```

---

## 6. Prevention Checklist

```text
Design phase:
  - [ ] Identifica all shared mutable state
  - [ ] Prefiere immutability donde possible
  - [ ] Usa thread-safe data structures (ConcurrentHashMap, etc.)
  - [ ] Minimiza lock scope — lockea solo lo que necesitas
  - [ ] Define lock ordering para prevenir deadlocks
  - [ ] Documenta thread-safety guarantees de cada class

Implementation:
  - [ ] Usa language-provided synchronization (no custom spinlocks)
  - [ ] Prefiere atomics sobre locks para single-variable operations
  - [ ] Prefiere channels/message-passing sobre shared memory (Go)
  - [ ] Usa final/const/readonly para immutable fields
  - [ ] Avoid lazy initialization a menos que necessary
  - [ ] Usa volatile/atomic para visibility guarantees

Testing:
  - [ ] Corre concurrency stress tests en CI
  - [ ] Corre con race detector (-race, TSan)
  - [ ] Corre tests con high thread count y iterations
  - [ ] Usa jcstress para Java memory model verification
  - [ ] Testea en multi-core machines (no single-core CI)

Code review:
  - [ ] Checkea shared mutable state en new code
  - [ ] Verifica lock scope es minimal
  - [ ] Checkea nested locks (deadlock risk)
  - [ ] Verifica compound operations son atomic
  - [ ] Checkea proper error handling dentro de locks
```

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre race condition y data race?

Un race condition es un logic flaw donde el outcome depende del timing de thread execution. Un data race es un specific type de race condition donde dos threads acceden el same memory location concurrently, al menos uno es un write, y no hay synchronization. All data races son race conditions, pero no all race conditions son data races. Por example, un check-then-act pattern puede ser un race condition sin un data race si both accesses son reads pero el logic depende de ordering.

### ¿Cómo reproduzco un race condition que solo pasa en production?

Empieza collectando as much context as possible de production logs — thread dumps, timestamps, request traces. Buildea un stress test que simulee el production load y concurrency level. Usa barriers o countdown latches para forzar threads a ejecutar al mismo time. Corre el test thousands de times en un loop. Usa un race detector (Go -race, Java TSan) para catchear races at runtime. Si el race involvea specific data patterns, usa production data snapshots en tu test.

### ¿Cuando deberia usar locks vs atomics vs channels?

Usa atomics para single-variable operations (counters, flags, simple state) — son faster que locks y avoid deadlock risk. Usa locks (mutex) para multi-variable operations o compound actions que deben ser atomic. Usa channels (Go) cuando quieres communicate entre goroutines sin sharear memory — channels hacen el data flow explicit. En Go, prefiere channels para orchestration y mutex para protectar shared state. En Java, prefiere atomics para counters y locks para complex critical sections.

### ¿Cómo prevengo deadlocks cuando uso multiple locks?

Siempre adquiere locks en un consistent global order. Si thread A adquiere lock1 then lock2, thread B tambien debe adquirir lock1 antes que lock2. Nunca adquieras un lock mientras holdeas otro a menos que sigas el global order. Usa `tryLock` con un timeout para detectar y recover de potential deadlocks. Keep lock scope tan small as possible — acquire late, release early. Considera usar un single coarse-grained lock si contention es low, y split en fine-grained locks solo cuando profiling muestre contention.

### ¿Qué es un memory barrier y por qué importa?

Un memory barrier (fence) es un CPU instruction que enforcea ordering de memory operations. Sin barriers, CPUs y compilers pueden reorder reads y writes para optimization, lo que puede breakear concurrent code. El `volatile` keyword en Java inserta memory barriers, ensureando que writes son visible a other threads. En Go, channel operations y sync primitives insertan barriers automatically. En C/C++, debes usar atomic operations o explicit barriers. Missing memory barriers causan stale reads y invisible writes — classic race condition symptoms.
