---
contentType: patterns
slug: distributed-lock-pattern
title: "Distributed Lock Pattern with Redis, ZooKeeper, and etcd"
description: "Coordinate exclusive access to shared resources across distributed nodes using Redis, ZooKeeper, or etcd. Includes TTLs, fencing tokens, and Redlock examples."
metaDescription: "Learn the Distributed Lock Pattern with Redis and ZooKeeper. See Python, Java, and JavaScript examples using Redlock, TTLs, and fencing tokens."
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
  - etcd
  - coordination
relatedResources:
  - /patterns/saga-pattern
  - /patterns/idempotent-consumer-pattern
  - /patterns/leader-election-pattern
  - /patterns/lock-free-queue-pattern
  - /recipes/redis-distributed-lock
  - /patterns/sequential-convoy-pattern
lastUpdated: "2026-08-23"
publishedAt: "2026-06-25"
author: Mathias Paulenko
seo:
  metaDescription: "Learn the Distributed Lock Pattern with Redis and ZooKeeper. See Python, Java, and JavaScript examples using Redlock, TTLs, and fencing tokens."
  keywords:
    - distributed lock
    - design pattern
    - concurrency
    - redis
    - zookeeper
    - etcd
    - redlock
    - fencing token
---

## Overview

The Distributed Lock Pattern gives mutually exclusive access to a shared resource when many nodes
are involved. It's useful when a single process, a database row, a task queue entry, or a
configuration value must be touched by only one node at a time. Without it, race conditions,
duplicate processing, and data corruption become likely as soon as you scale past one process.

A local mutex works inside one process, but a distributed lock has to survive network partitions,
process crashes, and clock skew. It needs a consensus or a centralized store that every node can
reach atomically. Redis, ZooKeeper, etcd, Consul, and database advisory locks are the usual choices.

## When to Use

Use this pattern when more than one node may modify the same shared resource at once, when a scheduled
task must run only once across the cluster, when a resource can only be touched by one process and the
storage has no compare-and-swap, or when you need short-lived leader election.

## When to Avoid

Skip it when everything runs on a single machine, when the storage already gives you an atomic
compare-and-swap or conditional write, when eventual consistency with optimistic concurrency is enough,
or when the lock store would become a single point of failure.

## Solution

### Python (Redis SET NX with a token)

```python
import time
import uuid
import redis
from typing import Optional


class RedisDistributedLock:
    """Distributed lock using Redis with automatic TTL and a fencing token."""

    def __init__(self, redis_client: redis.Redis, lock_key: str,
                 ttl_seconds: int = 30, retry_delay: float = 0.1):
        self.redis = redis_client
        self.lock_key = f"distlock:{lock_key}"
        self.ttl = ttl_seconds
        self.retry_delay = retry_delay
        self.token = None
        self._acquired = False

    def acquire(self, blocking: bool = True, timeout: Optional[float] = None) -> bool:
        """Acquire the lock with an optional blocking timeout."""
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
        """Release the lock only if we still own it (compare token)."""
        if not self._acquired:
            return False

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
        """Extend the lock TTL if we still own it."""
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


# Usage: scheduled task deduplication across cluster nodes
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)


def process_daily_report():
    """Only one node in the cluster should run this daily."""
    lock = RedisDistributedLock(redis_client, "daily-report", ttl_seconds=60)

    if not lock.acquire(blocking=False):
        print("Another node is processing the daily report. Skipping.")
        return

    try:
        print(f"Processing daily report (token: {lock.token})")
        time.sleep(2)
        print("Daily report complete")
    finally:
        lock.release()


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

### JavaScript (Redlock with three Redis nodes)

```javascript
const Redis = require('ioredis');
const Redlock = require('redlock');

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
      lock = await redlock.acquire(`locks:${lockKey}`, ttl);
      console.log(`Lock acquired: ${lock.value}`);

      const result = await task(lock.value);

      // Extend the lock if the task is still running
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

const scheduler = new DistributedTaskScheduler();

async function processDailyReport() {
  return scheduler.executeExclusive('daily-report', 30000, async (fencingToken) => {
    console.log(`Processing report with fencing token: ${fencingToken}`);
    await saveToDatabase({ report: 'daily', token: fencingToken });
    return { status: 'completed' };
  });
}

async function saveToDatabase(data) {
  // In production, store the token and verify it before writes
  console.log('Saving:', data);
}

processDailyReport().catch(console.error);
```

## Explanation

A distributed lock has to get four things right: only one node can hold it at a time; the lock must
expire and become available again if the holder crashes; the service must stay available through
replication or a consensus ensemble; and a monotonic token or UUID must block delayed writes from a
former holder.

Redlock tries to acquire the same lock on several independent Redis instances and treats it as held
when it gets a majority before a timeout. ZooKeeper uses ephemeral sequential nodes instead: the node
with the lowest sequence number wins the lock, and that node goes away automatically when the holder's
session ends. etcd does something similar with TTL leases.

In practice, this pattern shows up everywhere. Kubernetes uses etcd leases for controller leader
election. Stripe uses Redis-based locks to stop duplicate charge retries keyed on customer, amount, and
timestamp. Airbnb's Spinaltap uses ZooKeeper to make sure only one MySQL binlog reader handles each
partition. For a concrete Redis example, see the
[Redis distributed lock recipe](/recipes/redis-distributed-lock/). If the pattern you need is more about
long-lived leadership, the [leader election pattern](/patterns/leader-election-pattern/) is a better fit.

## Variants

| Variant | Backend | Trade-offs |
| --------- | --------- | ------------ |
| **Redis SET NX** | Single Redis | Simple and fast, but a single point of failure |
| **Redlock** | Several Redis nodes | More fault-tolerant; correctness is debated |
| **ZooKeeper** | ZK ensemble | Strong consistency and watches for notifications |
| **etcd** | etcd cluster | Lightweight, Kubernetes-native, TTL leases |
| **Database advisory lock** | PostgreSQL/MySQL | No new infrastructure, but couples you to the DB |
| **Consul** | Consul sessions | Fits service mesh and health-check workflows |

## Best Practices

- Set a TTL or lease so a crashed process can't block the resource forever.
- Send a fencing token with every write and reject any write that carries an old token.
- Keep the lock short: acquire it, do the minimum work, and release immediately.
- For long tasks, renew the lock with a heartbeat or periodic extension.
- Fail safely. If the lock service is down, stop instead of running unprotected.

## Common Mistakes

- Forgetting the TTL. A dead node then leaves a permanent deadlock behind.
- Releasing someone else's lock. The check-and-delete has to be atomic, usually with a Lua script.
- Ignoring clock skew. Rely on monotonic tokens rather than wall-clock timestamps.
- Holding the lock too long. The longer the hold, the more failures, contention, and slow recovery you
  risk.
- Not testing failure scenarios. Simulate a dead holder or a network partition before going live.

## FAQ

### Is Redlock safe?

Martin Kleppmann argued that Redlock isn't strictly safe under arbitrary clock skew. For most
production systems with fencing tokens and reasonable TTLs, it's good enough. For strong guarantees,
prefer ZooKeeper or etcd.

### What is a fencing token?

A fencing token is a monotonic number or UUID tied to each lock acquisition. A node sends its token
with every write to shared storage. The storage layer rejects any write that carries an old token,
which prevents a delayed process from overwriting a newer result.

### How is this different from leader election?

A distributed lock is short-lived and released as soon as the work is done. Leader election is
basically a long-lived lock: the same node stays in charge until it fails or steps down.

### Can I use a database instead of Redis or ZooKeeper?

Yes. PostgreSQL advisory locks (`pg_advisory_lock`) and MySQL `GET_LOCK()` work and require no extra
infrastructure, but they couple locking to your database and may not scale as well as a dedicated
lock service.
