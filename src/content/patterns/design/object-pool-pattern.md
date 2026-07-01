---
contentType: patterns
slug: object-pool-pattern
title: "Object Pool Pattern"
description: "Reuse expensive objects instead of creating and destroying them repeatedly. A creational pattern for managing scarce resources efficiently."
metaDescription: "Learn the Object Pool Pattern to reuse expensive objects efficiently. Examples in Python, Java, and JavaScript for connection and thread pools."
difficulty: intermediate
topics:
  - design
tags:
  - object-pool
  - pattern
  - design-pattern
  - creational
  - performance
  - resource-management
relatedResources:
  - /patterns/design/singleton-pattern
  - /patterns/design/factory-pattern
  - /guides/connection-pooling-deep-dive-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Object Pool Pattern to reuse expensive objects efficiently. Examples in Python, Java, and JavaScript for connection and thread pools."
  keywords:
    - object pool
    - design pattern
    - creational pattern
    - connection pool
    - resource reuse
    - performance
---

# Object Pool Pattern

## Overview

The Object Pool Pattern reuses expensive-to-create objects instead of instantiating and destroying them on demand. Objects are checked out from a pre-initialized pool, used, and returned for future reuse. This pattern is essential when object creation is costly in time or memory, such as database connections, threads, or large bitmaps.

Without a pool, every request creates a new connection, executes a query, and closes it. Under load, this exhausts the database's connection limit and degrades performance. A connection pool maintains a fixed set of reusable connections, dramatically reducing overhead.

## When to Use

Use the Object Pool Pattern when:
- Object creation is expensive (network connections, threads, large buffers)
- Objects are frequently created and destroyed in a short lifecycle
- There is a hard limit on the number of instances (database connections, file handles)
- You need predictable resource usage instead of unbounded growth
- Initialization time dominates the actual work time of the object

## When to Avoid

- Object creation is cheap and fast (simple data objects)
- Objects hold mutable state that is hard to reset between uses
- The pool itself becomes a bottleneck or source of memory leaks
- You need deterministic cleanup timing (pooled objects may stay alive longer)

## Solution

### Python

```python
import queue
import threading

class DatabaseConnection:
    _id_counter = 0
    _lock = threading.Lock()

    def __init__(self):
        with DatabaseConnection._lock:
            DatabaseConnection._id_counter += 1
            self.id = DatabaseConnection._id_counter
        self.active = False
        print(f"Created connection {self.id} (expensive)")

    def open(self):
        self.active = True
        return self

    def close(self):
        self.active = False

    def query(self, sql):
        if not self.active:
            raise RuntimeError("Connection not open")
        return f"Result for: {sql}"


class ConnectionPool:
    def __init__(self, max_size=5):
        self.max_size = max_size
        self._available = queue.Queue()
        self._in_use = set()
        self._lock = threading.Lock()

        # Pre-warm the pool
        for _ in range(max_size):
            self._available.put(DatabaseConnection())

    def acquire(self):
        conn = self._available.get(timeout=5)
        with self._lock:
            self._in_use.add(conn)
        conn.open()
        return conn

    def release(self, conn):
        conn.close()
        with self._lock:
            self._in_use.discard(conn)
        self._available.put(conn)

    def size(self):
        return self._available.qsize() + len(self._in_use)


# Usage
pool = ConnectionPool(max_size=3)
conn = pool.acquire()
result = conn.query("SELECT * FROM users")
print(result)
pool.release(conn)
```

### Java

```java
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

class DatabaseConnection {
    private static int counter = 0;
    private final int id;
    private boolean active = false;

    public DatabaseConnection() {
        this.id = ++counter;
        System.out.println("Created connection " + id + " (expensive)");
    }

    public void open() { this.active = true; }
    public void close() { this.active = false; }
    public String query(String sql) {
        if (!active) throw new IllegalStateException("Not open");
        return "Result for: " + sql;
    }
}

class ConnectionPool {
    private final BlockingQueue<DatabaseConnection> available;

    public ConnectionPool(int size) {
        available = new ArrayBlockingQueue<>(size);
        for (int i = 0; i < size; i++) {
            available.offer(new DatabaseConnection());
        }
    }

    public DatabaseConnection acquire() throws InterruptedException {
        DatabaseConnection conn = available.take();
        conn.open();
        return conn;
    }

    public void release(DatabaseConnection conn) {
        conn.close();
        available.offer(conn);
    }
}

// Usage
ConnectionPool pool = new ConnectionPool(3);
DatabaseConnection conn = pool.acquire();
System.out.println(conn.query("SELECT * FROM users"));
pool.release(conn);
```

### JavaScript

```javascript
class DatabaseConnection {
  static #counter = 0;

  constructor() {
    this.id = ++DatabaseConnection.#counter;
    this.active = false;
    console.log(`Created connection ${this.id} (expensive)`);
  }

  open() { this.active = true; return this; }
  close() { this.active = false; }
  query(sql) {
    if (!this.active) throw new Error('Not open');
    return `Result for: ${sql}`;
  }
}

class ConnectionPool {
  constructor(maxSize = 5) {
    this.maxSize = maxSize;
    this.available = [];
    this.inUse = new Set();

    for (let i = 0; i < maxSize; i++) {
      this.available.push(new DatabaseConnection());
    }
  }

  acquire() {
    if (this.available.length === 0) {
      throw new Error('Pool exhausted');
    }
    const conn = this.available.pop();
    this.inUse.add(conn);
    return conn.open();
  }

  release(conn) {
    conn.close();
    this.inUse.delete(conn);
    this.available.push(conn);
  }
}

// Usage
const pool = new ConnectionPool(3);
const conn = pool.acquire();
console.log(conn.query('SELECT * FROM users'));
pool.release(conn);
```

## Explanation

The Object Pool Pattern involves four key components:

- **Pooled Object** (`DatabaseConnection`): The expensive resource being reused
- **Pool** (`ConnectionPool`): Manages available and in-use objects
- **Acquire**: Checks out an object from the pool, initializing it if needed
- **Release**: Returns the object to the pool after resetting its state

By pre-creating objects and reusing them, the pool eliminates repeated allocation overhead and caps total resource consumption.

## Variants

| Variant | Use Case | Trade-off |
|---------|----------|-----------|
| **Fixed-size pool** | Predictable memory usage | May block or fail under peak load |
| **Expandable pool** | Bursty traffic | Unbounded growth risk without limits |
| **Lazy pool** | Rarely used resources | First request pays creation cost |
| **Borrow-and-return** | Short-lived operations | Requires discipline to release objects |

## What Works

- **Set pool size based on actual limits.** A database connection pool should not exceed the database's `max_connections` minus administrative overhead.
- **Validate objects on checkout.** A pooled connection may have been closed by the server; verify with a lightweight health check before returning it.
- **Reset object state on return.** Clear buffers, reset counters, and close file handles to prevent data leaking between consumers.
- **Use timeouts on acquire.** An indefinite wait when the pool is exhausted causes requests to hang forever. Fail fast with a clear error.
- **Monitor pool metrics.** Track pool utilization, wait times, and object lifetime to tune size and detect leaks.

## Common Mistakes

- **Never releasing objects** causes pool exhaustion and application deadlock. Always use try-finally or language equivalents.
- **Oversized pools** waste memory and may overwhelm downstream systems. Start small and scale based on metrics.
- **Not handling invalid objects** returned to the pool causes cascading failures. Validate and evict stale connections.
- **Sharing mutable state** across pooled objects leads to race conditions. Each checkout should present a clean slate.
- **Using pools for cheap objects** adds unnecessary complexity. Pools only pay off when creation cost exceeds management overhead.

## Real-World Examples

### JDBC Connection Pool

Java applications use HikariCP or C3P0 to maintain a pool of database connections. Creating a TCP connection to PostgreSQL takes ~50ms; reusing one from HikariCP takes <1ms.

### Thread Pools

`Executors.newFixedThreadPool()` in Java and `ThreadPoolExecutor` in Python maintain worker threads instead of spawning new ones per task, avoiding OS thread creation overhead.

### Graphics Buffers

Game engines pool vertex buffers and texture objects on the GPU. Uploading a texture to VRAM is slow; rendering reuses pooled buffers across frames.

## Frequently Asked Questions

**Q: Is Object Pool the same as Singleton?**
A: No. A [Singleton](/patterns/design/singleton-pattern) ensures one instance exists globally. An Object Pool manages multiple instances, reusing them among many consumers.

**Q: How do I choose the pool size?**
A: Size = (peak concurrent requests × average hold time) / average request duration. Monitor actual usage and tune. For DB pools, stay below `max_connections - 5`.

**Q: What happens when the pool is exhausted?**
A: Options: block and wait (with timeout), create a temporary object, or reject the request. Choose based on your latency and capacity requirements.

**Q: Should I pool objects in a garbage-collected language?**
A: Yes, for expensive resources. GC handles memory, but network sockets and threads are OS resources that GC does not manage efficiently.
