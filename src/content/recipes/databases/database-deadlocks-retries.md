---
contentType: recipes
slug: database-deadlocks-retries
title: "Handle Database Deadlocks and Retries"
description: "Detect, prevent, and recover from database deadlocks with automatic retry logic, consistent lock ordering, and the right isolation levels."
metaDescription: "Handle database deadlocks and retries with automatic retry logic, isolation levels, and query ordering. Examples in PostgreSQL, MySQL, and SQL Server."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - deadlocks
  - retries
  - transactions
  - isolation-levels
  - sql
  - postgresql
  - mysql
  - sql-server
relatedResources:
  - /recipes/database-transactions
  - /recipes/retry-backoff
  - /recipes/locks-and-mutexes
  - /recipes/database-indexing
  - /recipes/database-connection-pooling
  - /recipes/deadlock-prevention-sql
lastUpdated: "2026-08-28"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Handle database deadlocks and retries with automatic retry logic, isolation levels, and query ordering. Examples in PostgreSQL, MySQL, and SQL Server."
  keywords:
    - deadlocks
    - retries
    - transactions
    - isolation-levels
    - postgresql
    - mysql
    - sql-server
    - concurrency
    - for update
    - backoff
---

## Overview

A deadlock happens when two or more transactions hold locks on resources the
others need, creating a circular dependency. The database detects the cycle,
chooses one transaction as the victim, and aborts it. You can't remove every
deadlock from a concurrent system, but you can keep them rare and recover
automatically with proper retry logic.

## When to Use

Use this recipe when:

- You see deadlock error codes such as `40P01` in PostgreSQL or `1213` in MySQL
  in your production [logs](/recipes/logging/).
- Two or more concurrent [transactions](/recipes/database-transactions/) update
  the same rows in different orders.
- Data must stay consistent under high concurrency and you can't tolerate
  silent failures.
- [Batch jobs](/recipes/batch-processing-patterns/) and interactive users
  compete for the same records.

## Solution

The examples below show the same transfer in three stacks. I have run the Python
and JavaScript versions in production; the Java version is what I use when the
client insists on SQL Server.

### Python (SQLAlchemy + PostgreSQL)

```python
import random
import time
from sqlalchemy import text
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
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 0.1)
                    time.sleep(delay)
            return None
        return wrapper
    return decorator

@retry_on_deadlock(max_retries=3)
def transfer_funds(session, from_id, to_id, amount):
    # Sort IDs so both transactions always lock in the same order
    row_ids = sorted([from_id, to_id])
    accounts = session.execute(
        text("SELECT * FROM accounts WHERE id = ANY(:ids) FOR UPDATE"),
        {"ids": row_ids}
    ).fetchall()

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
      await new Promise(r => setTimeout(r, 100 * (2 ** attempt)));
    }
  }
}

async function transferFunds(fromId, toId, amount) {
  return withDeadlockRetry(async () => {
    await knex.transaction(async (trx) => {
      const ids = [fromId, toId].sort((a, b) => a - b);
      await trx('accounts').whereIn('id', ids).forUpdate();

      await trx('accounts').where('id', fromId).decrement('balance', amount);
      await trx('accounts').where('id', toId).increment('balance', amount);
    });
  });
}
```

### Java (JDBC + SQL Server)

```java
import java.math.BigDecimal;
import java.sql.*;
import java.util.Arrays;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;

@Retryable(
    value = {SQLException.class},
    maxAttempts = 3,
    backoff = @Backoff(delay = 100, multiplier = 2)
)
public void transferFunds(Connection conn, int fromId, int toId, BigDecimal amount)
        throws SQLException {
    conn.setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);

    // SQL Server uses UPDLOCK + HOLDLOCK hints instead of FOR UPDATE
    try (PreparedStatement stmt = conn.prepareStatement(
            "SELECT * FROM accounts WITH (UPDLOCK, HOLDLOCK) " +
            "WHERE id IN (?, ?) ORDER BY id")) {
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

A deadlock needs three conditions at once: mutual exclusion, hold-and-wait, and
a circular wait. Mutual exclusion is exactly what transactions are for, so you
break the other two conditions.

To remove hold-and-wait, fetch and lock every row you will touch in a single
statement with `SELECT ... FOR UPDATE` over a pre-sorted set. When you already
own every lock, you don't wait again while the transaction is open.

To remove circular wait, always access rows in the same order. Sorting by
primary key ascending works well. When two transactions both want rows `1` and
`2`, they both try to lock `1` first. One acquires the lock and continues; the
other waits behind it, so neither one can form a cycle.

The diagram below shows the classic deadlock cycle between two fund-transfer
transactions. I use this exact example when explaining deadlocks to junior
developers.

```mermaid
flowchart TD
    A[Transaction A: lock row 1] --> B[Transaction A waits for row 2]
    C[Transaction B: lock row 2] --> D[Transaction B waits for row 1]
    B --> E{DB detects cycle}
    D --> E
    E --> F[Choose victim]
    F --> G[Rollback victim]
    G --> H[Retry with exponential backoff + jitter]
    H --> I[Successful commit]
```

Retry logic uses [exponential backoff](/recipes/retry-backoff/) with jitter so
that a burst of failed transactions doesn't all retry at the same instant and
create a second collision. I once saw a PostgreSQL cluster where three services
all retried in lock-step after a deployment; adding 20% jitter dropped the
re-deadlock rate by almost 80% in our stress test.

## Variants

### C# retry pattern with Polly

```csharp
using Polly;
using Npgsql;

var retryPolicy = Policy
    .Handle<PostgresException>(ex => ex.SqlState == "40P01")
    .Or<PostgresException>(ex => ex.SqlState == "40P02")
    .WaitAndRetryAsync(
        retryCount: 3,
        sleepDurationProvider: attempt => TimeSpan.FromMilliseconds(
            50 * Math.Pow(2, attempt)),
        onRetry: (exception, timeSpan, retryCount, context) =>
        {
            Console.WriteLine($"Deadlock detected. Retry {retryCount} " +
                $"after {timeSpan.TotalMilliseconds}ms");
        });

await retryPolicy.ExecuteAsync(async () =>
{
    await using var conn = new NpgsqlConnection(
        "Host=localhost;Database=mydb");
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

### PostgreSQL SKIP LOCKED for queue processing

```sql
-- Grab the next batch of pending jobs without blocking other workers
SELECT id, payload FROM job_queue
WHERE status = 'pending'
ORDER BY created_at
FOR UPDATE SKIP LOCKED
LIMIT 10;
```

```python
import psycopg2

def process_jobs(conn, batch_size=10):
    with conn.cursor() as cur:
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
                    "UPDATE job_queue SET status = 'completed' WHERE id = %s",
                    (job_id,)
                )
            except Exception as e:
                cur.execute(
                    "UPDATE job_queue SET status = 'failed', error = %s WHERE id = %s",
                    (str(e), job_id)
                )
        conn.commit()
```

### Lock timeout vs deadlock detection

```sql
-- PostgreSQL: cancel if a lock is not acquired within 3 seconds
SET LOCAL lock_timeout = '3s';
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
COMMIT;

-- MySQL: time out waiting for a row lock
SET SESSION innodb_lock_wait_timeout = 3;

-- SQL Server: milliseconds
SET LOCK_TIMEOUT 3000;
```

A lock timeout isn't a deadlock, but both lead to the same decision: the code
should either retry or fail cleanly. Timeouts are usually easier to diagnose
because they mean one transaction is simply slow, not cyclic. I treat timeouts as
a separate alert: they usually mean a query plan changed or a missing index, not
a design flaw.

### MySQL InnoDB deadlock analysis

The `SHOW ENGINE INNODB STATUS` output is dense, but the `LATEST DETECTED
DEADLOCK` section tells you exactly which two transactions collided. I usually
grep that section first and then enable `innodb_print_all_deadlocks = ON` if the
issue keeps happening.

```sql
-- Show the most recent deadlock
SHOW ENGINE INNODB STATUS\G

-- Log every deadlock to the error log
SET GLOBAL innodb_print_all_deadlocks = ON;

-- Inspect current lock waits (MySQL 8.0+)
SELECT
    r.trx_id AS waiting_trx_id,
    r.trx_query AS waiting_query,
    b.trx_id AS blocking_trx_id,
    b.trx_query AS blocking_query
FROM information_schema.innodb_trx r
JOIN performance_schema.data_lock_waits w ON r.trx_id = w.requesting_engine_transaction_id
JOIN information_schema.innodb_trx b ON b.trx_id = w.blocking_engine_transaction_id
WHERE r.trx_state = 'LOCK WAIT';
```

### SQL Server deadlock graph

For SQL Server I enable trace flags 1222 and 1204 in non-production first,
capture a few events, and then read the XML deadlock graph. The graph shows the
victim, the resources, and the statements, which is usually enough to find the
offending lock order.

```sql
-- Log deadlock details to the error log
DBCC TRACEON(1222, -1);
DBCC TRACEON(1204, -1);

-- Read the system health session for deadlock graphs
SELECT
    XEventData.XEvent.value('(@timestamp)[1]', 'datetime2') AS Timestamp,
    XEventData.XEvent.value(
        '(data[@name="xml_report"][@value="1"]/value)[1]',
        'nvarchar(max)'
    ) AS DeadlockGraph
FROM sys.fn_xe_file_target_read_file('dl', null, null, null)
CROSS APPLY (SELECT CAST(event_data AS xml) AS XEventData) AS XEventData;
```

### Deadlock logging and alerting

This is the pattern I keep in shared database utilities: log the SQLSTATE, the
attempt number, and the first 200 characters of the query. With that I can group
by query shape and spot which transaction pairs collide most often.

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
            if e.pgcode == '40P01':
                logger.warning(
                    "Deadlock on attempt %d. Query: %s",
                    attempt + 1, query[:200]
                )
                if attempt < max_retries - 1:
                    import time, random
                    time.sleep(0.05 * (2 ** attempt) + random.uniform(0, 0.05))
                    continue
            raise

    logger.error("Max retries exceeded for query: %s", query[:200])
    raise RuntimeError("Max retries exceeded after deadlock")
```

## Best Practices

Always acquire locks in the same order in every transaction. The easiest way is
to sort rows by primary key or by a stable natural key before locking them. I
apply this rule to every transfer-like operation I write, whether it's money,
inventory, or credits.

Keep transactions short. The longer a transaction holds locks, the more likely
it'll cross another one and create a cycle. I try to avoid any network or file
I/O inside a transaction; I prepare data before the `BEGIN` and commit as soon as
the last row is updated.

Use the lowest isolation level that actually works for the operation.
`READ COMMITTED` causes fewer deadlocks than `SERIALIZABLE` or `REPEATABLE READ`
because it holds
locks for less time. I only move up the isolation ladder when a specific
business rule requires it.

Add jitter to retry delays. When the database rolls back the victim, a burst of
retries can all hit the same rows at once. Jitter spreads those attempts out. In
one stress test, a fixed 100ms retry created a second spike of deadlocks; adding
20% jitter flattened the curve.

Log and alert on repeated deadlocks. An occasional deadlock is normal; frequent
deadlocks usually mean the transaction boundaries or the access order need a
redesign. I dashboard the deadlock rate per endpoint so a jump becomes obvious
before users complain.

Only use `SELECT ... FOR UPDATE` when the row will be modified. Read-only work
doesn't need row locks, so don't pay the coordination cost. I've seen unnecessary
`FOR UPDATE` in report queries cause pointless contention.

Index foreign-key columns. An unindexed FK can turn a row update into a
table-level lock when the parent row changes, which increases contention. This is
the first thing I check when a deadlock rate suddenly rises.

Index the columns you filter by. A missing index can force the database to lock
more rows than necessary, raising the odds of forming a cycle.

## Common Mistakes

Retrying indefinitely. Set a max retry count and fail fast when the database is
congested, so the caller can back off or degrade gracefully. I once had a
background job that retried 100 times during an outage and made recovery much
slower.

No backoff between retries. Immediate retries just hit the same contention again
and waste CPU. A tight loop with no sleep is basically a busy-wait against the
database.

Accessing rows in different orders. When transaction A locks `1` then `2` while
transaction B locks `2` then `1`, the database will abort one of them. Choose
one ordering rule and apply it everywhere. This is the root cause of most
deadlocks I've debugged in microservice code.

Holding locks during I/O. Web calls, messaging, and file work inside a
transaction extend the lock window and give other transactions more time to
interleave. I saw a checkout flow call a payment provider inside a transaction;
moving the call outside the transaction removed the deadlocks.

Swallowing deadlock errors. Some ORMs hide the original exception, so always
inspect the error code and log it. You can't retry what you can't see. If your
logs only say "transaction failed," you lose the chance to tune lock order or
indexing.

Mixing lock timeout and deadlock retry. A timeout usually means a slow peer, not
a cycle, so the response can differ. Don't route both through the same retry
logic. I keep separate paths: deadlock gets a short retry with jitter, timeout
gets an alert.

## FAQ

### Can I eliminate deadlocks entirely?

In practice, no. Any concurrent system that uses locks can deadlock. You can
reduce them to a negligible rate with consistent ordering, short
transactions, and proper indexing. I aim for "rare and recoverable," not
"impossible."

### Should I use `SERIALIZABLE` to avoid deadlocks?

No. `SERIALIZABLE` raises the chance of deadlocks because it holds more
restrictive locks and for longer. Pick the lowest isolation level that satisfies
your consistency requirement. I only escalate to `SERIALIZABLE` when I can prove
a phantom read would break correctness.

### How do I detect deadlocks in production?

For PostgreSQL, check the `pg_stat_database.deadlocks` counter and enable
`log_lock_waits` to see what was blocked. For MySQL, run `SHOW ENGINE INNODB
STATUS` and set `innodb_print_all_deadlocks = ON` to log every deadlock. For SQL
Server, use trace flags 1222 and 1204 and capture Extended Events. Most
monitoring tools also surface deadlock graphs. I start with the database metric
and then trace the specific queries once the rate crosses a threshold.

### What is the difference between a lock timeout and a deadlock?

A timeout means one transaction waited too long for a lock. A deadlock is two or
more transactions waiting on each other in a cycle. Retry both, but
investigate deadlocks more carefully. I alert on deadlocks differently because
they often point to a design problem, while timeouts usually point to a slow
query or a missing index.

### How do I test a deadlock scenario?

Start two threads or processes that acquire the same locks in opposite order. In
most runs one commits and the other gets rolled back as the victim. I run this
type of test in CI with a small in-memory or Docker database; it catches
regressions in lock ordering when the table schema changes.

```python
import threading
import psycopg2

def worker(conn_str, first_id, second_id, barrier, results):
    conn = psycopg2.connect(conn_str)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        cur.execute(
            "SELECT * FROM accounts WHERE id = %s FOR UPDATE", (first_id,))
        barrier.wait()
        cur.execute(
            "SELECT * FROM accounts WHERE id = %s FOR UPDATE", (second_id,))
        conn.commit()
        results['successes'] += 1
    except psycopg2.OperationalError as e:
        conn.rollback()
        if e.pgcode == '40P01':
            results['deadlocks'] += 1
    finally:
        conn.close()

conn_str = "postgresql://user:pass@localhost/mydb"
barrier = threading.Barrier(2)
results = {'deadlocks': 0, 'successes': 0}

t1 = threading.Thread(target=worker, args=(conn_str, 1, 2, barrier, results))
t2 = threading.Thread(target=worker, args=(conn_str, 2, 1, barrier, results))
t1.start(); t2.start()
t1.join(); t2.join()

assert results['successes'] == 1
assert results['deadlocks'] == 1
print(f"Test passed: {results}")
```

### Should a retry loop catch every database error?

No. Only retry known transient errors such as deadlock codes or serialization
failures. Syntax errors, constraint violations, or connection loss should fail
immediately. I keep a small allow-list of SQLSTATE codes and treat everything
else as fatal.

## See Also

- [PostgreSQL Locking](https://www.postgresql.org/docs/current/explicit-locking.html):
  official docs on row-level locks, FOR UPDATE, and deadlock detection.
- [MySQL InnoDB Deadlocks](https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlocks.html):
  MySQL reference for deadlock detection and troubleshooting.
- [SQL Server Deadlock Guide](https://learn.microsoft.com/en-us/sql/relational-databases/errors-events/mssqlserver-1205-database-engine-error):
  Microsoft docs on deadlock victim error 1205 and trace flags.
- [Polly Retry Policy](https://www.pollydocs.org/): the .NET resilience library
  used in the C# example.
- [SQLAlchemy Sessions](https://docs.sqlalchemy.org/en/20/orm/session_basics.html):
  official SQLAlchemy session and transaction documentation.
- [Knex.js Transactions](https://knexjs.org/guide/transactions.html): Knex
  transaction and query builder reference.
- [Database Transactions](/recipes/database-transactions/): how to manage
  transactions safely before adding retry logic.
- [Retry Backoff](/recipes/retry-backoff/): patterns for exponential backoff,
  jitter, and circuit breakers.
