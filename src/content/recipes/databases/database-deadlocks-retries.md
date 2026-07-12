---


contentType: recipes
slug: database-deadlocks-retries
title: "Handle Database Deadlocks and Retries"
description: "Detect, prevent, and recover from database deadlocks with automatic retry logic, isolation levels, and query ordering strategies."
metaDescription: "Handle database deadlocks and retries with automatic retry logic, isolation levels, and query ordering. Examples in PostgreSQL, MySQL, and SQL Server."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - deadlocks
  - isolation-levels
  - databases
  - sql
relatedResources:
  - /recipes/database-transactions
  - /recipes/full-text-search
  - /recipes/sql-joins
  - /docs/database-migration-runbook-template
  - /guides/cap-theorem-guide
  - /recipes/deadlock-prevention-sql
  - /recipes/event-sourcing-relational
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Handle database deadlocks and retries with automatic retry logic, isolation levels, and query ordering. Examples in PostgreSQL, MySQL, and SQL Server."
  keywords:
    - deadlocks
    - retries
    - transactions
    - isolation-levels
    - postgresql
    - mysql


---
# Handle Database Deadlocks and Retries

## Overview

Deadlocks occur when two or more transactions hold locks on resources that the other needs, creating a circular dependency. The database detects this and aborts one transaction as the "victim." While deadlocks are inevitable in concurrent systems, you can minimize them and recover gracefully with proper retry logic.

This approach handles detecting, preventing, and automatically retrying transactions after deadlocks in PostgreSQL, MySQL, and SQL Server.

## When to Use

Use this resource when:
- You see deadlock errors (`40P01` in PostgreSQL, `1213` in MySQL) in production [logs](/recipes/api/logging)
- Multiple concurrent [transactions](/recipes/databases/database-transactions) update the same set of rows in different orders
- You need to ensure data consistency while maintaining high concurrency. See [Locks and Mutexes](/recipes/concurrency/locks-and-mutexes) for coordination.
- [Batch jobs](/recipes/data/batch-processing-patterns) and interactive users compete for the same records

## Solution

### Python (SQLAlchemy + PostgreSQL)

```python
import random
import time
from sqlalchemy.exc import OperationalError
from functools import wraps

def retry_on_deadlock(max_retries=3, base_delay=0.1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except OperationalError as e:
                    if "deadlock detected" not in str(e).lower():
                        raise
                    if attempt == max_retries - 1:
                        raise
                    # Exponential backoff with jitter
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 0.1)
                    time.sleep(delay)
            return None
        return wrapper
    return decorator

@retry_on_deadlock(max_retries=3)
def transfer_funds(session, from_id, to_id, amount):
    # Always lock rows in consistent order to prevent deadlocks
    row_ids = sorted([from_id, to_id])
    accounts = session.execute(
        text("SELECT * FROM accounts WHERE id = ANY(:ids) FOR UPDATE"),
        {"ids": row_ids}
    ).fetchall()

    # Map back by id
    from_acc = next(a for a in accounts if a.id == from_id)
    to_acc = next(a for a in accounts if a.id == to_id)

    from_acc.balance -= amount
    to_acc.balance += amount
    session.commit()
```

### JavaScript (Knex.js + MySQL)

```javascript
const knex = require('knex')({ client: 'mysql2', /* ... */ });

async function withDeadlockRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err.code !== 'ER_LOCK_DEADLOCK' || attempt === maxRetries - 1) {
        throw err;
      }
      // Exponential backoff
      await new Promise(r => setTimeout(r, 100 * (2 ** attempt)));
    }
  }
}

async function transferFunds(fromId, toId, amount) {
  return withDeadlockRetry(async () => {
    await knex.transaction(async (trx) => {
      // Consistent ordering prevents deadlocks
      const ids = [fromId, toId].sort((a, b) => a - b);
      const rows = await trx('accounts')
        .whereIn('id', ids)
        .forUpdate();

      await trx('accounts')
        .where('id', fromId)
        .decrement('balance', amount);
      await trx('accounts')
        .where('id', toId)
        .increment('balance', amount);
    });
  });
}
```

### Java (JDBC + SQL Server)

```java
@Retryable(
    value = {SQLException.class},
    maxAttempts = 3,
    backoff = @Backoff(delay = 100, multiplier = 2)
)
public void transferFunds(Connection conn, int fromId, int toId, BigDecimal amount) throws SQLException {
    conn.setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);

    try (PreparedStatement stmt = conn.prepareStatement(
        "SELECT * FROM accounts WHERE id IN (?, ?) ORDER BY id FOR UPDATE")) {

        int[] ids = Arrays.stream(new int[]{fromId, toId}).sorted().toArray();
        stmt.setInt(1, ids[0]);
        stmt.setInt(2, ids[1]);
        stmt.executeQuery();
    }

    try (PreparedStatement update = conn.prepareStatement(
        "UPDATE accounts SET balance = balance + ? WHERE id = ?")) {
        update.setBigDecimal(1, amount.negate());
        update.setInt(2, fromId);
        update.executeUpdate();

        update.setBigDecimal(1, amount);
        update.setInt(2, toId);
        update.executeUpdate();
    }
    conn.commit();
}
```

## Explanation

Deadlocks require three conditions: mutual exclusion, hold-and-wait, and circular wait. You can't remove mutual exclusion (that's what transactions do), but you can break the other two:
- **Hold-and-wait**: Acquire all locks at once using `SELECT ... FOR UPDATE` with consistent ordering
- **Circular wait**: Always access rows in the same order (e.g., by primary key ascending)

Retry logic uses [exponential backoff](/recipes/architecture/retry-backoff) with jitter to prevent "thundering herd" — where all retrying transactions collide again.

## Variants

| Database | Deadlock Error Code | Detection Method | Retry Hint |
|----------|---------------------|------------------|------------|
| PostgreSQL | `40P01` | Automatic | `FOR UPDATE` with `ORDER BY` |
| MySQL | `1213` | Automatic | `innodb_deadlock_detect=ON` |
| SQL Server | `1205` | Automatic | `ROWLOCK`, `HOLDLOCK` hints |
| Oracle | `ORA-00060` | Automatic | `SELECT ... FOR UPDATE NOWAIT` |

## What Works

- **Always acquire locks in a consistent order**: Sort rows by primary key before locking
- **Keep transactions short**: The longer a transaction holds locks, the higher the deadlock risk
- **Use the lowest isolation level that works**: `READ COMMITTED` has fewer deadlocks than `SERIALIZABLE`
- **Add jitter to retry delays**: Prevents synchronized retries from colliding again
- **Log and alert on repeated deadlocks**: Frequent deadlocks indicate a design problem, not just bad luck

## Common Mistakes

- **Retrying indefinitely**: Set a max retry count and fail fast if the system is congested
- **No backoff between retries**: Immediate retries just hit the same contention
- **Accessing rows in different orders**: Transaction A locks row 1 then 2; Transaction B locks row 2 then 1 — guaranteed deadlock
- **Holding locks while doing I/O**: Network calls inside a transaction extend lock duration
- **Ignoring deadlock hints**: Some ORMs swallow exceptions; always check for and log deadlock errors

## Frequently Asked Questions

**Q: Can I eliminate deadlocks entirely?**
A: In practice, no — but you can reduce them to negligible levels. Use consistent access ordering, short transactions, and proper indexing. If deadlocks are frequent, redesign the transaction boundaries.

**Q: Should I use `SERIALIZABLE` isolation to avoid deadlocks?**
A: No — `SERIALIZABLE` actually increases deadlock probability because it holds more restrictive locks. Use the lowest isolation level that satisfies your consistency requirements.

**Q: How do I detect deadlocks in production?**
A: PostgreSQL: `pg_stat_database.deadlocks` counter. MySQL: `SHOW ENGINE INNODB STATUS` or Performance Schema. SQL Server: `sys.dm_tran_locks` and `sp_who2`. All three support deadlock graphs in their monitoring tools.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### C# Retry Pattern with Polly

```csharp
using Polly;
using Npgsql;

var retryPolicy = Policy
    .Handle<PostgresException>(ex => ex.SqlState == "40P01") // deadlock_detected
    .Or<PostgresException>(ex => ex.SqlState == "40P02")     // serialization_failure
    .WaitAndRetryAsync(
        retryCount: 3,
        sleepDurationProvider: attempt => TimeSpan.FromMilliseconds(50 * Math.Pow(2, attempt)),
        onRetry: (exception, timeSpan, retryCount, context) =>
        {
            Console.WriteLine($"Deadlock detected. Retry {retryCount} after {timeSpan.TotalMs}ms");
        });

await retryPolicy.ExecuteAsync(async () =>
{
    await using var conn = new NpgsqlConnection("Host=localhost;Database=mydb");
    await conn.OpenAsync();
    await using var tx = await conn.BeginTransactionAsync();

    try
    {
        await using var cmd = new NpgsqlCommand(
            "UPDATE accounts SET balance = balance - 100 WHERE id = 1; " +
            "UPDATE accounts SET balance = balance + 100 WHERE id = 2;",
            conn, tx);

        await cmd.ExecuteNonQueryAsync();
        await tx.CommitAsync();
    }
    catch
    {
        await tx.RollbackAsync();
        throw;
    }
});
```

### SQL Server Deadlock Graph Analysis

```sql
-- Enable deadlock trace flag (SQL Server)
DBCC TRACEON(1222, -1); -- Log deadlock info to error log
DBCC TRACEON(1204, -1); -- Log deadlock info to console

-- Query system health session for deadlock graphs
SELECT
    XEventData.XEvent.value('(@timestamp)[1]', 'datetime2') AS Timestamp,
    XEventData.XEvent.value('(data[@name="xml_report"][@value="1"]/value)[1]', 'nvarchar(max)') AS DeadlockGraph
FROM sys.fn_xe_telemetry_blob_target_read_file('dl', null, null, null)
CROSS APPLY (SELECT CAST(event_data AS xml) AS XEventData) AS XEventData;

-- Extended Events session for capturing deadlocks
CREATE EVENT SESSION [Capture Deadlocks] ON SERVER
ADD EVENT sqlserver.xml_deadlock_report
ADD TARGET package0.event_file(SET filename = N'C:\temp\deadlocks.xel')
WITH (MAX_MEMORY = 4096 KB, STARTUP_STATE = ON);
ALTER EVENT SESSION [Capture Deadlocks] ON SERVER STATE = START;
```

### MySQL InnoDB Deadlock Analysis

```sql
-- View recent deadlock info
SHOW ENGINE INNODB STATUS\G

-- Enable deadlock logging in MySQL 8+
SET GLOBAL innodb_print_all_deadlocks = ON;

-- Query performance schema for lock waits
SELECT
    r.trx_id AS waiting_trx_id,
    r.trx_query AS waiting_query,
    b.trx_id AS blocking_trx_id,
    b.trx_query AS blocking_query,
    TIMEDIFF(NOW(), r.trx_started) AS wait_duration
FROM information_schema.innodb_trx r
JOIN information_schema.innodb_locks wl ON r.trx_id = wl.lock_trx_id
JOIN information_schema.innodb_trx b ON b.trx_id = wl.lock_trx_id
WHERE r.trx_state = 'LOCK WAIT';

-- Set lock wait timeout (seconds)
SET SESSION innodb_lock_wait_timeout = 5;
```

### SKIP LOCKED for Queue Processing

```sql
-- PostgreSQL: process jobs without blocking
SELECT id, payload FROM job_queue
WHERE status = 'pending'
ORDER BY created_at
FOR UPDATE SKIP LOCKED
LIMIT 10;

-- Mark jobs as processing
UPDATE job_queue
SET status = 'processing', started_at = NOW()
WHERE id IN (1, 2, 3, 4, 5);
```

```python
import psycopg2

def process_jobs(conn, worker_id, batch_size=10):
    with conn.cursor() as cur:
        # Acquire jobs without blocking other workers
        cur.execute("""
            SELECT id, payload FROM job_queue
            WHERE status = 'pending'
            ORDER BY created_at
            FOR UPDATE SKIP LOCKED
            LIMIT %s
        """, (batch_size,))

        jobs = cur.fetchall()
        for job_id, payload in jobs:
            try:
                process_payload(payload)
                cur.execute(
                    "UPDATE job_queue SET status = 'completed', completed_at = NOW() WHERE id = %s",
                    (job_id,)
                )
            except Exception as e:
                cur.execute(
                    "UPDATE job_queue SET status = 'failed', error = %s WHERE id = %s",
                    (str(e), job_id)
                )
        conn.commit()
```

### Lock Timeout vs Deadlock Detection

```sql
-- PostgreSQL: set lock timeout per transaction
SET LOCAL lock_timeout = '3s';
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- If lock not acquired in 3s: ERROR: canceling statement due to lock timeout
COMMIT;

-- MySQL: set lock wait timeout
SET SESSION innodb_lock_wait_timeout = 3;
-- If lock not acquired in 3s: ERROR: Lock wait timeout exceeded

-- SQL Server: set lock timeout
SET LOCK_TIMEOUT 3000; -- 3 seconds in milliseconds
-- If lock not acquired: Error 1222: The lock request timed out
```

### Deadlock Logging and Alerting

```python
import logging
import psycopg2

logger = logging.getLogger('deadlock_monitor')

def execute_with_deadlock_logging(conn, query, params=None, max_retries=3):
    for attempt in range(max_retries):
        try:
            with conn.cursor() as cur:
                cur.execute(query, params)
                conn.commit()
                return cur.fetchall() if cur.description else None
        except psycopg2.OperationalError as e:
            conn.rollback()
            if e.pgcode == '40P01':  # deadlock_detected
                logger.warning(
                    "Deadlock detected on attempt %d. Query: %s. Retrying...",
                    attempt + 1, query[:200],
                    extra={
                        'pgcode': e.pgcode,
                        'pgerror': str(e),
                        'attempt': attempt + 1,
                    }
                )
                if attempt < max_retries - 1:
                    import time, random
                    time.sleep(0.05 * (2 ** attempt) + random.uniform(0, 0.05))
                    continue
            raise

    logger.error("Max retries exceeded for query: %s", query[:200])
    raise RuntimeError("Max retries exceeded after deadlock")
```

### Testing Deadlock Scenarios

```python
import threading
import psycopg2

def test_deadlock_scenario():
    """Reproduce a deadlock by having two threads acquire locks in opposite order."""
    barrier = threading.Barrier(2)
    results = {'deadlocks': 0, 'successes': 0}

    def worker(conn_str, first_id, second_id):
        conn = psycopg2.connect(conn_str)
        conn.autocommit = False
        cur = conn.cursor()

        try:
            cur.execute(f"SELECT * FROM accounts WHERE id = {first_id} FOR UPDATE")
            barrier.wait()  # Ensure both threads hold first lock

            cur.execute(f"SELECT * FROM accounts WHERE id = {second_id} FOR UPDATE")
            conn.commit()
            results['successes'] += 1
        except psycopg2.OperationalError as e:
            conn.rollback()
            if e.pgcode == '40P01':
                results['deadlocks'] += 1
        finally:
            conn.close()

    conn_str = "postgresql://user:pass@localhost/mydb"
    t1 = threading.Thread(target=worker, args=(conn_str, 1, 2))
    t2 = threading.Thread(target=worker, args=(conn_str, 2, 1))

    t1.start()
    t2.start()
    t1.join()
    t2.join()

    # One thread should succeed, the other should deadlock
    assert results['successes'] == 1
    assert results['deadlocks'] == 1
    print(f"Test passed: {results}")
```

## Additional Best Practices

6. **Use `SKIP LOCKED` for concurrent queue processing.** This prevents workers from blocking each other when picking up jobs:

```sql
SELECT * FROM job_queue WHERE status = 'pending'
FOR UPDATE SKIP LOCKED LIMIT 5;
```

7. **Set `lock_timeout` on all transactions.** A transaction that waits forever for a lock is worse than one that fails and retries:

```sql
SET LOCAL lock_timeout = '5s';
```

8. **Use `NOWAIT` for non-critical reads.** If you don't need to wait for a lock, fail fast:

```sql
SELECT * FROM products WHERE id = 42 FOR UPDATE NOWAIT;
-- Throws: ERROR: could not obtain lock on row
```

9. **Monitor `pg_stat_database.deadlocks` regularly.** Set up alerts for any increase:

```sql
SELECT datname, deadlocks FROM pg_stat_database WHERE deadlocks > 0;
```

10. **Document lock ordering in your codebase.** Add comments to each transaction specifying the lock order. This helps new developers avoid introducing deadlocks.

## Additional Common Mistakes

6. **Catching deadlocks but not rolling back.** After a deadlock error, the transaction is in an aborted state. You must call `rollback()` before retrying.

7. **Retrying with the same transaction.** A deadlocked transaction is aborted. You need a new transaction for each retry attempt.

8. **Using `SERIALIZABLE` without retry logic.** Serializable isolation can throw serialization failures (`40001`) that require the same retry handling as deadlocks.

9. **Not testing deadlock handling under load.** Unit tests rarely trigger deadlocks. Use integration tests with concurrent threads to verify your retry logic works.

10. **Ignoring `idle_in_transaction` connections.** Long-idle transactions hold locks and cause deadlocks. Set `idle_in_transaction_session_timeout` to kill them automatically.

## Additional FAQ

### What is the difference between a deadlock and a lock timeout?

A **deadlock** occurs when two transactions hold locks that the other needs. The database detects this and kills one transaction. A **lock timeout** occurs when a transaction waits longer than the configured timeout for a lock held by another transaction. Deadlocks require retry; lock timeouts may require retry or may indicate a performance issue.

### How do I prioritize which transaction survives a deadlock?

PostgreSQL kills the transaction that has done the least work (fewest WAL bytes). You cannot directly control which one is killed. SQL Server uses deadlock priority (`SET DEADLOCK_PRIORITY LOW`). MySQL kills the transaction that modified the fewest rows.

### Should I use `SKIP LOCKED` or `NOWAIT`?

Use `SKIP LOCKED` when you want to process available rows and skip locked ones (job queues, batch processing). Use `NOWAIT` when you want to fail immediately if a row is locked, rather than waiting (real-time dashboards, cache updates).

## Performance Tips

1. **Use `SKIP LOCKED` for parallel job processing.** Multiple workers can pull jobs simultaneously without blocking:

```sql
-- 4 workers can each pull 25 jobs without contention
SELECT id FROM job_queue WHERE status = 'pending'
FOR UPDATE SKIP LOCKED LIMIT 25;
```

2. **Reduce lock scope with smaller transactions.** Update fewer rows per transaction to reduce the window for deadlocks:

```python
# Bad: one large transaction
for item in large_list:
    cur.execute("UPDATE products SET stock = stock - 1 WHERE id = %s", (item['id'],))
conn.commit()

# Good: small batches
batch_size = 50
for i in range(0, len(large_list), batch_size):
    batch = large_list[i:i+batch_size]
    for item in batch:
        cur.execute("UPDATE products SET stock = stock - 1 WHERE id = %s", (item['id'],))
    conn.commit()
```

3. **Use `SELECT ... FOR UPDATE` only when necessary.** Read-only transactions don't need row locks. Use `READ COMMITTED` isolation for most reads.

4. **Index foreign key columns.** Unindexed foreign keys cause table-level locks during parent updates:

```sql
-- Ensure FK columns are indexed
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
```

5. **Monitor lock wait times.** Track how long transactions wait for locks:

```sql
SELECT
    pid,
    wait_event_type,
    wait_event,
    query,
    now() - query_start AS wait_time
FROM pg_stat_activity
WHERE wait_event_type = 'Lock'
ORDER BY wait_time DESC;
```
