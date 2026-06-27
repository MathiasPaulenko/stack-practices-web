---
contentType: patterns
slug: distributed-lock-pattern
title: "Distributed Lock Pattern"
description: "Coordinate mutually exclusive access to shared resources across distributed nodes using a consensus-based lock service, preventing race conditions in scaled-out systems."
metaDescription: "Learn the Distributed Lock Pattern for coordinating nodes with Redis and ZooKeeper. Examples in Python, Java, and JavaScript with Redlock, leases, and fencing tokens."
difficulty: intermediate
topics:
  - design
  - architecture
  - concurrency
tags:
  - distributed-lock
  - pattern
  - design-pattern
  - concurrency
  - redis
  - zookeeper
  - coordination
  - consensus
relatedResources:
  - /patterns/design/saga-pattern
  - /patterns/design/idempotent-consumer-pattern
  - /patterns/leader-election-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Distributed Lock Pattern for coordinating nodes with Redis and ZooKeeper. Examples in Python, Java, and JavaScript with Redlock, leases, and fencing tokens."
  keywords:
    - distributed lock
    - design pattern
    - concurrency
    - redis
    - zookeeper
    - coordination
---

# Distributed Lock Pattern

## Overview

The Distributed Lock Pattern coordinates mutually exclusive access to shared resources across multiple nodes in a distributed system. When multiple processes or services compete for the same resource — a file, a database row, a task queue entry, or a configuration value — a distributed lock ensures that only one node holds the lock at a time, preventing race conditions, duplicate processing, and data corruption.

Unlike a local mutex (which works within a single process), a distributed lock must function across network boundaries, process crashes, and clock skew. It requires a consensus mechanism or centralized store that all nodes can access atomically. Common implementations use Redis, ZooKeeper, etcd, Consul, or database advisory locks.

## When to Use

Use the Distributed Lock Pattern when:
- Multiple nodes may concurrently modify the same shared resource
- You need to prevent duplicate execution of scheduled tasks across a cluster
- A resource can only be safely accessed by one process at a time
- Leader election is needed for singleton services in a cluster

## When to Avoid

- The system runs on a single node (a local mutex is simpler and faster)
- The shared resource supports atomic compare-and-swap operations natively
- Eventual consistency is acceptable and optimistic concurrency suffices
- The lock service itself becomes a single point of failure or bottleneck

## Solution

### Python (Redis Redlock)

```python
import time
import uuid
import redis
from typing import Optional

class RedisDistributedLock:
    """Distributed lock using Redis with automatic lease renewal and fencing token"""
    def __init__(self, redis_client: redis.Redis, lock_key: str,
                 ttl_seconds: int = 30, retry_delay: float = 0.1):
        self.redis = redis_client
        self.lock_key = f"distlock:{lock_key}"
        self.ttl = ttl_seconds
        self.retry_delay = retry_delay
        self.token = None
        self._acquired = False

    def acquire(self, blocking: bool = True, timeout: Optional[float] = None) -> bool:
        """Acquire the lock with an optional blocking timeout"""
        self.token = str(uuid.uuid4())
        start_time = time.time()

        while True:
            # SET key value NX EX ttl — atomic acquire
            acquired = self.redis.set(
                self.lock_key, self.token, nx=True, ex=self.ttl
            )
            if acquired:
                self._acquired = True
                return True

            if not blocking:
                return False

            if timeout and (time.time() - start_time) >= timeout:
                return False

            time.sleep(self.retry_delay)

    def release(self) -> bool:
        """Release the lock only if we still own it (compare token)"""
        if not self._acquired:
            return False

        # Lua script for atomic check-and-delete
        lua_script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """
        result = self.redis.eval(lua_script, 1, self.lock_key, self.token)
        self._acquired = False
        return result == 1

    def extend(self, additional_ttl: int) -> bool:
        """Extend the lock TTL if we still own it"""
        if not self._acquired:
            return False

        lua_script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("expire", KEYS[1], ARGV[2])
        else
            return 0
        end
        """
        result = self.redis.eval(
            lua_script, 1, self.lock_key, self.token, additional_ttl
        )
        return result == 1

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()


# ============================================================================
# USAGE: Scheduled task deduplication across cluster nodes
# ============================================================================

redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def process_daily_report():
    """Only one node in the cluster should run this daily"""
    lock = RedisDistributedLock(redis_client, "daily-report", ttl_seconds=60)

    if not lock.acquire(blocking=False):
        print("Another node is processing the daily report. Skipping.")
        return

    try:
        print(f"Processing daily report (token: {lock.token})")
        # Simulate long-running work
        time.sleep(2)
        print("Daily report complete")
    finally:
        lock.release()

# Safe context manager usage
def process_with_context():
    with RedisDistributedLock(redis_client, "critical-section", ttl_seconds=30):
        print("Inside critical section")
        time.sleep(1)

process_daily_report()
process_with_context()
```

### Java (Curator Framework + ZooKeeper)

```java
import org.apache.curator.framework.CuratorFramework;
import org.apache.curator.framework.CuratorFrameworkFactory;
import org.apache.curator.framework.recipes.locks.InterProcessMutex;
import org.apache.curator.retry.ExponentialBackoffRetry;
import java.util.concurrent.TimeUnit;

public class ZooKeeperDistributedLock {
    private final CuratorFramework client;
    private final String lockPath;

    public ZooKeeperDistributedLock(String zkConnectionString, String lockPath) {
        this.lockPath = lockPath;
        this.client = CuratorFrameworkFactory.newClient(
            zkConnectionString,
            new ExponentialBackoffRetry(1000, 3)
        );
        this.client.start();
    }

    public void executeWithLock(Runnable task) throws Exception {
        InterProcessMutex mutex = new InterProcessMutex(client, lockPath);

        // Acquire lock with timeout
        if (mutex.acquire(10, TimeUnit.SECONDS)) {
            try {
                System.out.println("Lock acquired, executing task");
                task.run();
            } finally {
                mutex.release();
                System.out.println("Lock released");
            }
        } else {
            System.out.println("Could not acquire lock within timeout");
        }
    }

    public void close() {
        client.close();
    }

    public static void main(String[] args) throws Exception {
        ZooKeeperDistributedLock lock = new ZooKeeperDistributedLock(
            "localhost:2181", "/locks/daily-report"
        );

        lock.executeWithLock(() -> {
            System.out.println("Processing daily report...");
            try { Thread.sleep(2000); } catch (InterruptedException e) {}
            System.out.println("Report processing complete");
        });

        lock.close();
    }
}
```

### JavaScript (Redlock + Redis)

```javascript
const Redis = require('ioredis');
const Redlock = require('redlock');

// Create Redis clients for Redlock (multiple for quorum)
const redisA = new Redis({ host: 'redis-a', port: 6379 });
const redisB = new Redis({ host: 'redis-b', port: 6379 });
const redisC = new Redis({ host: 'redis-c', port: 6379 });

const redlock = new Redlock([redisA, redisB, redisC], {
  driftFactor: 0.01,
  retryCount: 10,
  retryDelay: 200,
  retryJitter: 200
});

class DistributedTaskScheduler {
  async executeExclusive(lockKey, ttl, task) {
    let lock = null;
    try {
      // Acquire lock with Redlock algorithm (majority of Redis nodes)
      lock = await redlock.acquire(`locks:${lockKey}`, ttl);
      console.log(`Lock acquired: ${lock.value}`);

      // Execute the protected task
      const result = await task(lock.value);

      // Extend lock if task is still running
      lock = await lock.extend(ttl);

      return result;
    } catch (err) {
      if (err.name === 'LockError') {
        console.log(`Could not acquire lock for ${lockKey}: ${err.message}`);
        return null;
      }
      throw err;
    } finally {
      if (lock) {
        await lock.release();
        console.log(`Lock released: ${lock.value}`);
      }
    }
  }
}

// Usage
const scheduler = new DistributedTaskScheduler();

async function processDailyReport() {
  return scheduler.executeExclusive('daily-report', 30000, async (fencingToken) => {
    console.log(`Processing report with fencing token: ${fencingToken}`);
    // Write to database with token to prevent delayed writes
    await saveToDatabase({ report: 'daily', token: fencingToken });
    return { status: 'completed' };
  });
}

async function saveToDatabase(data) {
  // In production: store token and verify before writes to handle clock skew
  console.log('Saving:', data);
}

processDailyReport().catch(console.error);
```

## Explanation

A distributed lock must satisfy four properties:

1. **Mutual exclusion**: Only one node can hold the lock at a time
2. **No deadlock**: If a node crashes, the lock eventually expires and becomes available
3. **Fault tolerance**: The lock service itself must remain available (Redis Cluster, ZooKeeper ensemble)
4. **Fencing token**: A monotonic token prevents delayed writes from a former lock holder (Martin Kleppmann's insight)

The **Redlock algorithm** (Redis) acquires locks on multiple independent Redis instances and considers the lock held if a majority is acquired within a timeout. **ZooKeeper** uses ephemeral sequential nodes where the lowest sequence number holds the lock; if the holder dies, the ephemeral node is automatically deleted.

## Variants

| Variant | Backend | Characteristics |
|---------|---------|-----------------|
| **Redis SET NX** | Single Redis | Simple, fast, single point of failure |
| **Redlock** | Multiple Redis nodes | Fault-tolerant, more complex, debated correctness |
| **ZooKeeper** | ZK ensemble | Strong consistency, watches for notifications |
| **etcd** | etcd cluster | Lightweight, Kubernetes-native, TTL leases |
| **Database advisory lock** | PostgreSQL/MySQL | No additional infrastructure, but couples to DB |
| **Consul** | Consul sessions | Service mesh integration, health-check integration |

## Best Practices

- **Always use a TTL/lease.** A crashed process must not hold a lock forever.
- **Use fencing tokens for writes.** Include the token in writes to storage to reject stale operations.
- **Keep lock duration short.** Acquire the lock, do the minimum work, release immediately.
- **Implement lock renewal.** For long tasks, extend the TTL periodically (like a heartbeat).
- **Handle lock service failures.** If the lock service is unavailable, fail safe (don't proceed without the lock).

## Common Mistakes

- **No TTL on locks.** A crashed node creates a permanent deadlock.
- **Releasing someone else's lock.** A check-and-delete (compare token) must be atomic.
- **Ignoring clock skew.** In distributed systems, clocks drift. Use monotonic tokens, not timestamps.
- **Long-held locks.** The longer a lock is held, the higher the chance of failure and contention.
- **Not testing failure scenarios.** Test what happens when the lock holder dies mid-operation.

## Real-World Examples

### Kubernetes

Kubernetes uses etcd for all distributed coordination, including leader election for controllers. The scheduler and controller-manager use etcd leases to ensure only one instance is active.

### Stripe

Stripe uses Redis-based distributed locks to prevent duplicate charge processing. A lock on `(customer_id, amount, timestamp)` prevents double-charging during network retries.

### Airbnb

Airbnb's Spinaltap CDC system uses ZooKeeper distributed locks to coordinate MySQL binlog readers across a cluster, ensuring exactly one reader processes each partition.

## Frequently Asked Questions

**Q: Is Redlock safe?**
A: Martin Kleppmann argued that Redlock is not strictly safe under arbitrary clock skew. For most practical cases with proper fencing tokens and reasonable TTLs, it works well. For strong correctness guarantees, use ZooKeeper or etcd.

**Q: What is a fencing token?**
A: A monotonically increasing number or UUID associated with each lock acquisition. When writing to shared storage, the writer includes its token; the storage layer rejects writes with stale tokens.

**Q: How is this different from leader election?**
A: Distributed locks are typically short-lived and released quickly. Leader election is a special case where the "lock" is held indefinitely until the leader fails or steps down.

**Q: Can I use a database instead of Redis/ZooKeeper?**
A: Yes. PostgreSQL advisory locks (`pg_advisory_lock`) and MySQL `GET_LOCK()` work but couple your locking to your database availability and may not scale as well as dedicated lock services.
