---
contentType: recipes
slug: redis-distributed-lock
title: "Distributed Locking with Redis and Redlock"
description: "Implement distributed locks with Redis for mutual exclusion across processes, using SET NX with TTL and the Redlock algorithm for reliability"
metaDescription: "Implement distributed locks with Redis using SET NX and Redlock. Ensure mutual exclusion across processes with TTL-based locks and safe release."
difficulty: advanced
topics:
  - caching
  - concurrency
tags:
  - redis
  - distributed lock
  - redlock
  - concurrency
  - mutual exclusion
relatedResources:
  - /recipes/caching/redis-cache-aside-pattern
  - /recipes/caching/redis-rate-limiting-token-bucket
  - /patterns/concurrency/distributed-lock-pattern
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement distributed locks with Redis using SET NX and Redlock. Ensure mutual exclusion across processes with TTL-based locks and safe release."
  keywords:
    - redis distributed lock
    - redlock algorithm
    - redis set nx
    - distributed mutex
    - redis concurrency
---

# Distributed Locking with Redis and Redlock

Distributed locks ensure only one process can access a resource at a time across multiple server instances. Redis makes this possible with `SET key value NX PX ttl` — an atomic operation that sets a key only if it does not exist, with an expiration. This implementation provides a safe distributed lock with automatic release, lock renewal, and the Redlock algorithm for multi-node reliability.

## When to Use This

- Cron jobs or scheduled tasks that must run on only one instance
- Updating shared resources where concurrent writes cause corruption
- Rate-limited external API calls where only one process should call at a time
- Leader election for a temporary single-leader task

## Prerequisites

- Python 3.10+
- `redis` package (`pip install redis`)

## Solution

### 1. Install Dependencies

```bash
pip install redis
```

### 2. Implement a Safe Distributed Lock

```python
import time
import uuid
import logging
from redis import Redis

logger = logging.getLogger(__name__)

RELEASE_LOCK_SCRIPT = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""


class DistributedLock:
    def __init__(self, redis_client: Redis, lock_name: str, ttl: int = 30):
        self.redis = redis_client
        self.lock_name = f"lock:{lock_name}"
        self.ttl = ttl
        self.token = str(uuid.uuid4())
        self._acquired = False
        self._release_script = redis_client.register_script(RELEASE_LOCK_SCRIPT)

    def acquire(self, timeout: float = 10.0, retry_interval: float = 0.1) -> bool:
        """Try to acquire the lock, retrying until timeout.

        Args:
            timeout: Maximum time to wait in seconds.
            retry_interval: Time between retries in seconds.

        Returns:
            True if lock was acquired, False if timed out.
        """
        deadline = time.time() + timeout

        while time.time() < deadline:
            acquired = self.redis.set(
                self.lock_name,
                self.token,
                nx=True,
                px=self.ttl * 1000,
            )
            if acquired:
                self._acquired = True
                logger.info("Lock acquired: %s", self.lock_name)
                return True

            time.sleep(retry_interval)

        logger.warning("Lock acquisition timed out: %s", self.lock_name)
        return False

    def release(self) -> bool:
        """Release the lock if we still own it.

        Returns:
            True if lock was released, False if we did not own it.
        """
        if not self._acquired:
            return False

        result = self._release_script(
            keys=[self.lock_name],
            args=[self.token],
        )
        self._acquired = False

        if result:
            logger.info("Lock released: %s", self.lock_name)
            return True
        else:
            logger.warning("Lock already expired or stolen: %s", self.lock_name)
            return False

    def renew(self, ttl: int | None = None) -> bool:
        """Extend the lock's TTL if we still own it.

        Args:
            ttl: New TTL in seconds. Defaults to original TTL.

        Returns:
            True if renewed, False if lock was lost.
        """
        if not self._acquired:
            return False

        script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("pexpire", KEYS[1], ARGV[2])
        else
            return 0
        end
        """
        result = self.redis.eval(
            script, 1, self.lock_name, self.token, (ttl or self.ttl) * 1000
        )
        return bool(result)

    def __enter__(self):
        if not self.acquire():
            raise TimeoutError(f"Could not acquire lock: {self.lock_name}")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()
        return False
```

### 3. Use the Lock

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# As a context manager
def process_job(job_id: str):
    with DistributedLock(r, f"job:{job_id}", ttl=30) as lock:
        # Only one process executes this at a time
        job = fetch_job(job_id)
        result = execute_job(job)
        save_result(job_id, result)
        # Lock auto-releases on exit

# Manual acquire/release
lock = DistributedLock(r, "cron:cleanup", ttl=60)
if lock.acquire(timeout=5):
    try:
        run_cleanup()
    finally:
        lock.release()
else:
    print("Another instance is running cleanup")
```

### 4. Lock Renewal for Long Tasks

```python
import threading

class RenewableLock(DistributedLock):
    def __init__(self, redis_client: Redis, lock_name: str, ttl: int = 30):
        super().__init__(redis_client, lock_name, ttl)
        self._renewal_thread: threading.Thread | None = None
        self._stop_renewal = threading.Event()

    def acquire(self, timeout: float = 10.0, retry_interval: float = 0.1) -> bool:
        acquired = super().acquire(timeout, retry_interval)
        if acquired:
            self._start_renewal()
        return acquired

    def _start_renewal(self):
        self._stop_renewal.clear()
        self._renewal_thread = threading.Thread(
            target=self._renewal_loop, daemon=True
        )
        self._renewal_thread.start()

    def _renewal_loop(self):
        interval = self.ttl * 0.3  # Renew at 30% of TTL
        while not self._stop_renewal.wait(interval):
            if not self.renew():
                logger.error("Lock lost during renewal: %s", self.lock_name)
                break

    def release(self) -> bool:
        self._stop_renewal.set()
        if self._renewal_thread:
            self._renewal_thread.join(timeout=5)
        return super().release()
```

### 5. Redlock Algorithm (Multi-Node)

For higher reliability, use multiple Redis instances. The lock is acquired if a majority of instances grant it:

```python
import time
import uuid

class Redlock:
    def __init__(self, redis_nodes: list[Redis], retry_count: int = 3, retry_delay: float = 0.2):
        self.nodes = redis_nodes
        self.retry_count = retry_count
        self.retry_delay = retry_delay
        self.quorum = len(redis_nodes) // 2 + 1

    def acquire(self, lock_name: str, ttl: int = 30) -> str | None:
        """Acquire a lock across multiple Redis instances.

        Returns:
            Lock token if acquired, None if failed.
        """
        token = str(uuid.uuid4())
        lock_key = f"lock:{lock_name}"

        for attempt in range(self.retry_count):
            start = time.time()
            granted = 0

            for node in self.nodes:
                try:
                    if node.set(lock_key, token, nx=True, px=ttl * 1000):
                        granted += 1
                except Exception as e:
                    logger.warning("Redis node error: %s", e)

            elapsed = (time.time() - start) * 1000
            if granted >= self.quorum and elapsed < ttl * 1000:
                return token

            # Failed — clean up any partial locks
            self._release_all(lock_key, token)
            time.sleep(self.retry_delay)

        return None

    def release(self, lock_name: str, token: str) -> None:
        lock_key = f"lock:{lock_name}"
        self._release_all(lock_key, token)

    def _release_all(self, lock_key: str, token: str) -> None:
        for node in self.nodes:
            try:
                node.eval(
                    RELEASE_LOCK_SCRIPT, 1, lock_key, token
                )
            except Exception:
                pass
```

## How It Works

1. **`SET NX PX`** atomically sets a key only if it does not exist, with a TTL in milliseconds. This is the core of the lock — if the key exists, another process holds the lock.
2. **Token-based ownership** — each lock holder generates a unique UUID token. When releasing, a Lua script checks that the token matches before deleting, preventing a process from releasing a lock it no longer owns.
3. **TTL** ensures the lock auto-expires if the holder crashes or becomes unresponsive. Without it, a crashed process would hold the lock forever.
4. **Renewal** extends the TTL periodically, allowing long-running tasks to hold the lock safely. A background thread renews at 30% of the TTL interval.
5. **Redlock** acquires the lock on multiple independent Redis instances. If a majority grant the lock, it is considered acquired. This survives a single Redis node failure.

## Variants

### Fair Lock with Queue

```python
def acquire_fair_lock(redis_client: Redis, lock_name: str, ttl: int = 30) -> str | None:
    """Acquire lock with FIFO ordering using a sorted set queue."""
    token = str(uuid.uuid4())
    queue_key = f"lock_queue:{lock_name}"
    lock_key = f"lock:{lock_name}"

    # Add to queue with timestamp
    score = time.time()
    redis_client.zadd(queue_key, {token: score})

    # Wait until we are first in queue and lock is free
    while True:
        first = redis_client.zrange(queue_key, 0, 0, withscores=True)
        if first and first[0][0] == token:
            if redis_client.set(lock_key, token, nx=True, px=ttl * 1000):
                redis_client.zrem(queue_key, token)
                return token

        time.sleep(0.1)
```

### Lock with Fencing Token

```python
def acquire_with_fencing(redis_client: Redis, lock_name: str, ttl: int = 30) -> tuple[str, int] | None:
    """Acquire lock and return a fencing token for ordering."""
    token = str(uuid.uuid4())
    lock_key = f"lock:{lock_name}"
    counter_key = f"lock_counter:{lock_name}"

    if redis_client.set(lock_key, token, nx=True, px=ttl * 1000):
        fencing = redis_client.incr(counter_key)
        return token, fencing

    return None

# The fencing token prevents stale lock holders from corrupting state
# Storage layer rejects writes with fencing tokens lower than the last seen
```

## Best Practices

- **Always set a TTL** — prevents deadlocks if a process crashes while holding the lock
- **Use a unique token per lock holder** — prevents accidentally releasing another process's lock
- **Release locks in a `finally` block** — ensures release even if an exception occurs
- **Use Redlock for critical sections** — single-instance Redis is a single point of failure for locks

## Common Mistakes

- **Not using a Lua script for release** — `get` + `del` is not atomic; another process could acquire the lock between the check and delete
- **Setting TTL too short** — if the task takes longer than the TTL, the lock expires and another process starts concurrently
- **Not handling lock acquisition failure** — if `acquire` returns `False`, the code proceeds anyway, defeating the purpose of the lock
- **Using `DEL` directly** — deletes the lock regardless of ownership, potentially removing another process's lock

## FAQ

**Q: Is Redlock safe?**
A: Redlock is debated in the distributed systems community. For most applications, it is sufficient. For strict correctness requirements (e.g., financial transactions), use a consensus system like etcd or Zookeeper.

**Q: What TTL should I use?**
A: Set it to the maximum expected task duration plus a safety margin (2x). Use renewal for tasks with unpredictable duration.

**Q: Can I use Redis Cluster for locks?**
A: Yes, but use hash tags (`lock:{job_id}`) to ensure the lock key and any related keys are on the same shard.

**Q: What happens if the lock holder pauses (GC pause)?**
A: The TTL may expire during the pause, allowing another process to acquire the lock. Use fencing tokens to prevent stale holders from corrupting state.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
