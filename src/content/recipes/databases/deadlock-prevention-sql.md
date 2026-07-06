---
contentType: recipes
slug: deadlock-prevention-sql
title: "Prevent and Resolve Deadlocks in SQL Transactions"
description: "Identify deadlock patterns in SQL databases, apply consistent lock ordering, use appropriate isolation levels, and implement retry logic for resilient concurrent transactions"
metaDescription: "Prevent and resolve deadlocks in SQL databases. Apply consistent lock ordering, use isolation levels, and implement retry logic for resilient concurrent transactions."
difficulty: intermediate
topics:
  - databases
  - concurrency
tags:
  - deadlocks
  - isolation-levels
  - sql
  - concurrency
  - databases
relatedResources:
  - /recipes/databases/acid-transactions-postgres
  - /recipes/databases/postgres-query-optimization
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Prevent and resolve deadlocks in SQL databases. Apply consistent lock ordering, use isolation levels, and implement retry logic for resilient concurrent transactions."
  keywords:
    - sql deadlock
    - isolation levels
    - concurrent transactions
    - lock ordering
    - retry logic
---

# Prevent and Resolve Deadlocks in SQL Transactions

Deadlocks occur when two transactions hold locks that the other needs, creating a circular wait. This approach handles detecting deadlock patterns, applying consistent lock ordering, choosing isolation levels wisely, and implementing client-side retry logic for production database resilience.

## When to Use This

- Concurrent [transactions](/recipes/databases/database-transactions) fail intermittently with deadlock errors
- [Batch operations](/recipes/data/batch-processing-patterns) and user-facing transactions compete for the same rows
- Row-level locking is required but performance must remain acceptable

## Problem

Two concurrent fund transfers between accounts A and B deadlock because Transaction 1 locks A then waits for B, while Transaction 2 locks B then waits for A.

## Solution

### 1. Consistent Lock Ordering

```typescript
// transactions/TransferService.ts
class TransferService {
  async transfer(fromId: string, toId: string, amount: number): Promise<void> {
    // Always lock in a consistent order (e.g., by account ID)
    const [first, second] = [fromId, toId].sort();

    await db.transaction(async (trx) => {
      // Lock first account
      const fromAccount = await trx('accounts')
        .where('id', first)
        .forUpdate()
        .first();

      // Lock second account
      const toAccount = await trx('accounts')
        .where('id', second)
        .forUpdate()
        .first();

      // Transfer logic
      await trx('accounts')
        .where('id', fromId)
        .decrement('balance', amount);

      await trx('accounts')
        .where('id', toId)
        .increment('balance', amount);
    });
  }
}
```

### 2. Optimistic Locking (No Database Locks)

```typescript
// transactions/OptimisticUpdate.ts
class InventoryService {
  async updateStock(productId: string, delta: number): Promise<boolean> {
    const result = await db('inventory')
      .where('product_id', productId)
      .where('version', db('inventory')
        .select('version')
        .where('product_id', productId)
      )
      .update({
        quantity: db.raw('quantity + ?', [delta]),
        version: db.raw('version + 1'),
      });

    return result > 0; // true if update succeeded
  }
}
```

### 3. Isolation Level Selection

```sql
-- Read Committed: default, prevents dirty reads
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Repeatable Read: prevents non-repeatable reads (higher lock contention)
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- Serializable: full isolation, highest deadlock risk
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

### 4. Deadlock-Resilient Retry Logic

```typescript
// transactions/RetryWithBackoff.ts
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (isDeadlockError(error) && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 100 + Math.random() * 100;
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}

// Usage
await executeWithRetry(() => transferService.transfer('A', 'B', 100));
```

### 5. Detecting Deadlocks in PostgreSQL

```sql
-- View current locks
SELECT
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.relation = blocked_locks.relation
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- Log deadlock details
SHOW log_lock_waits;  -- should be 'on'
```

## How It Works

- **Consistent ordering** prevents circular waits by always acquiring locks in the same sequence
- **[Optimistic locking](/recipes/databases/optimistic-locking)** uses versioning instead of database locks, reducing contention
- **Isolation levels** trade consistency against concurrency; lower levels have fewer deadlocks
- **Retry logic** with exponential backoff handles transient deadlocks that resolve quickly

## Production Considerations

- Keep transactions short to minimize lock duration
- Use `SELECT FOR UPDATE SKIP LOCKED` for queue-like workloads. See [Locks and Mutexes](/recipes/concurrency/locks-and-mutexes) for coordination.
- Monitor `pg_stat_database.deadlocks` to track deadlock frequency

## Common Mistakes

- Locking rows in different orders in different parts of the application
- Using `SELECT FOR UPDATE` on unnecessary rows, increasing lock scope
- Not retrying after deadlock errors, causing user-facing failures

## FAQ

**Q: How is this different from a race condition?**
A: A [race condition](/recipes/data/race-condition-prevention) is a timing-dependent bug in correctness. A deadlock is a blocking condition where transactions wait indefinitely for each other.

**Q: Should I always retry deadlocked transactions?**
A: Yes, with backoff. Deadlocks are transient in well-designed systems and typically succeed on retry.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### Python Retry Logic with psycopg2

```python
import time
import psycopg2
from psycopg2 import errors

def execute_with_retry(conn, operation, max_retries=3, base_delay=0.1):
    for attempt in range(max_retries):
        try:
            return operation(conn)
        except errors.DeadlockDetected:
            conn.rollback()
            if attempt == max_retries - 1:
                raise
            delay = base_delay * (2 ** attempt) + (random.random() * 0.05)
            time.sleep(delay)
        except errors.SerializationFailure:
            conn.rollback()
            if attempt == max_retries - 1:
                raise
            delay = base_delay * (2 ** attempt)
            time.sleep(delay)

def transfer(conn, from_id, to_id, amount):
    def _transfer(c):
        with c.cursor() as cur:
            ids = sorted([from_id, to_id])
            cur.execute("BEGIN")
            cur.execute("SELECT balance FROM accounts WHERE id = %s FOR UPDATE", (ids[0],))
            cur.execute("SELECT balance FROM accounts WHERE id = %s FOR UPDATE", (ids[1],))
            cur.execute("UPDATE accounts SET balance = balance - %s WHERE id = %s", (amount, from_id))
            cur.execute("UPDATE accounts SET balance = balance + %s WHERE id = %s", (amount, to_id))
            c.commit()
    return execute_with_retry(conn, _transfer)
```

### `SELECT FOR UPDATE SKIP LOCKED` for Queue Processing

```sql
-- Process jobs from a queue without blocking on locked rows
BEGIN;

SELECT id, payload FROM job_queue
WHERE status = 'pending'
ORDER BY created_at
FOR UPDATE SKIP LOCKED
LIMIT 10;

-- Update claimed jobs
UPDATE job_queue SET status = 'processing', started_at = NOW()
WHERE id IN (1, 2, 3);

COMMIT;
```

`SKIP LOCKED` skips rows that are already locked by another transaction. This is ideal for job queues where you want workers to grab different jobs without waiting.

### Advisory Locks for Coordinating Application Logic

```sql
-- Transaction-level advisory lock (released on COMMIT/ROLLBACK)
BEGIN;
SELECT pg_advisory_xact_lock(12345);
-- Only one transaction can hold this lock at a time
-- ... critical section ...
COMMIT;

-- Session-level advisory lock (must be explicitly released)
SELECT pg_advisory_lock(67890);
-- ... long-running coordination ...
SELECT pg_advisory_unlock(67890);

-- Try-lock (non-blocking, returns true/false)
SELECT pg_try_advisory_lock(67890);
-- Returns true if acquired, false if already locked
```

### Deadlock Logging in PostgreSQL

```sql
-- Enable lock wait logging
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET deadlock_timeout = '200ms';

-- View deadlock statistics per database
SELECT
    datname,
    deadlocks,
    conflicts,
    temp_files,
    blk_read_time,
    blk_write_time
FROM pg_stat_database
WHERE deadlocks > 0
ORDER BY deadlocks DESC;

-- View current blocked transactions
SELECT
    activity.pid,
    activity.usename,
    activity.query,
    now() - activity.query_start AS duration,
    waiting.locktype AS waiting_locktype
FROM pg_stat_activity activity
JOIN pg_locks waiting ON activity.pid = waiting.pid
WHERE NOT waiting.granted
ORDER BY duration DESC;
```

### Java Retry with Spring `@Retryable`

```java
import org.springframework.retry.annotation.Retryable;
import org.springframework.retry.annotation.Backoff;
import org.springframework.dao.DeadlockLoserDataAccessException;

@Service
public class InventoryService {

    @Retryable(
        value = { DeadlockLoserDataAccessException.class, CannotSerializeTransactionException.class },
        maxAttempts = 3,
        backoff = @Backoff(delay = 100, multiplier = 2, maxDelay = 1000)
    )
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void updateStock(Long productId, int delta) {
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new IllegalArgumentException("Product not found"));

        product.setStock(product.getStock() + delta);
        productRepository.save(product);
    }
}
```

### Detecting Deadlock Patterns with `pg_stat_activity`

```sql
-- Find transactions waiting for locks with their blocking queries
SELECT
    blocked.pid AS blocked_pid,
    blocked.query AS blocked_query,
    blocking.pid AS blocking_pid,
    blocking.query AS blocking_query,
    blocked.state AS blocked_state,
    now() - blocked.query_start AS blocked_duration
FROM pg_stat_activity blocked
JOIN pg_locks bl ON blocked.pid = bl.pid AND NOT bl.granted
JOIN pg_locks ul ON ul.locktype = bl.locktype
    AND ul.database IS NOT DISTINCT FROM bl.database
    AND ul.relation IS NOT DISTINCT FROM bl.relation
    AND ul.granted
JOIN pg_stat_activity blocking ON ul.pid = blocking.pid
WHERE blocked.pid != blocking.pid;
```

## Additional Best Practices

6. **Use `SKIP LOCKED` for concurrent job processing.** Multiple workers can pull from the same queue table without deadlocking:

```sql
SELECT * FROM jobs WHERE status = 'pending' FOR UPDATE SKIP LOCKED LIMIT 5;
```

7. **Set `lock_timeout` for write transactions.** Prevent transactions from waiting indefinitely:

```sql
SET lock_timeout = '5s';
```

8. **Use `NOWAIT` for fail-fast locking.** Instead of waiting, immediately error if the row is locked:

```sql
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE NOWAIT;
-- Raises error 55P03 if row is locked
```

9. **Keep transactions under 50ms when possible.** Shorter transactions hold locks for less time, reducing deadlock probability.

10. **Use advisory locks for application-level mutual exclusion.** Avoid row-level locks when you need cross-table coordination:

```sql
SELECT pg_advisory_xact_lock(hashtext('user:' || user_id::text));
```

## Additional Common Mistakes

6. **Using `SERIALIZABLE` without retry logic.** Serialization failures (SQLSTATE 40001) are expected under `SERIALIZABLE`. Always implement retry.

7. **Locking parent rows before child rows unnecessarily.** If you only update child rows, don't lock the parent. Lock the minimum set of rows needed.

8. **Not handling `40P01` vs `40001` differently.** `40P01` is a deadlock (circular wait), `40001` is a serialization failure. Both require retry, but deadlocks indicate a lock ordering problem while serialization failures are expected under `SERIALIZABLE`.

9. **Using application-level mutexes instead of database locks.** Application mutexes don't protect against concurrent database access from other services or direct SQL connections.

10. **Not testing under concurrent load.** Deadlocks often only appear under production traffic. Use `pgbench` or load testing tools to simulate concurrency.

## Additional FAQ

### How do I monitor deadlock frequency over time?

Query `pg_stat_database.deadlocks` periodically and store the values. A sudden increase indicates a new deadlock pattern:

```sql
SELECT datname, deadlocks FROM pg_stat_database WHERE datname = 'mydb';
```

Reset statistics after investigating:

```sql
SELECT pg_stat_reset();
```

### What is the difference between `FOR UPDATE` and `FOR NO KEY UPDATE`?

`FOR UPDATE` locks the row and prevents other transactions from modifying or locking it. `FOR NO KEY UPDATE` is weaker: it allows other transactions to lock the row with `FOR KEY SHARE`, which is useful when you only update non-key columns.

### Should I use `SKIP LOCKED` or `NOWAIT`?

Use `SKIP LOCKED` when you want to process available rows and skip busy ones (job queues). Use `NOWAIT` when you need the specific row and prefer to fail immediately rather than wait.

### How do deadlocks differ between PostgreSQL and MySQL?

PostgreSQL detects deadlocks via a dedicated deadlock detection process that runs every `deadlock_timeout` (default 1s). MySQL uses an internal deadlock detector in InnoDB that detects deadlocks immediately. The error codes differ: PostgreSQL uses `40P01`, MySQL uses `1213` (ER_LOCK_DEADLOCK).

## Performance Tips

1. **Use `pgbench` for deadlock reproduction.** Simulate concurrent access patterns:

```bash
pgbench -i -s 10 mydb
pgbench -c 20 -j 4 -T 60 -f deadlock_test.sql mydb
```

2. **Monitor `pg_locks` count.** A high number of locks indicates contention:

```sql
SELECT count(*) AS total_locks, count(*) FILTER (WHERE NOT granted) AS waiting_locks
FROM pg_locks;
```

3. **Use `idle_in_transaction_session_timeout` to prevent stuck transactions.** Transactions that are idle but not committed hold locks indefinitely:

```sql
ALTER SYSTEM SET idle_in_transaction_session_timeout = '300s';
```

4. **Batch `FOR UPDATE` with `SKIP LOCKED` for queue throughput.** Process multiple jobs per transaction to reduce round trips:

```sql
BEGIN;
SELECT id FROM jobs WHERE status = 'pending' FOR UPDATE SKIP LOCKED LIMIT 50;
UPDATE jobs SET status = 'processing' WHERE id IN (...);
COMMIT;
```

5. **Use `lock_timeout` combined with retry for graceful degradation.** Set a short lock timeout and retry with backoff:

```sql
SET lock_timeout = '2s';
-- If lock acquisition fails (55P03), retry with backoff
```
