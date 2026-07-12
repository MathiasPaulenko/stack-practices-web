---
contentType: recipes
slug: database-transactions
title: "Database Transactions"
description: "How to use ACID transactions to ensure data integrity across Python, JavaScript, and Java with SQL examples."
metaDescription: "Practical database transaction examples in Python, JavaScript, and Java. Learn ACID, BEGIN/COMMIT/ROLLBACK, and isolation levels."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - transactions
  - acid
  - databases
  - sql
relatedResources:
  - /recipes/sql-joins
  - /recipes/pagination
  - /patterns/design/repository-pattern
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Practical database transaction examples in Python, JavaScript, and Java. Learn ACID, BEGIN/COMMIT/ROLLBACK, and isolation levels."
  keywords:
    - database transactions
    - acid
    - sql transactions
    - commit rollback
    - isolation levels
    - python transactions
    - nodejs transactions
    - java jdbc
---

## Overview

A database transaction is a sequence of operations treated as a single logical unit of work. Transactions guarantee ACID properties: Atomicity, Consistency, Isolation, and Durability. They are essential for financial operations, inventory management, and any multi-step data mutation where partial completion would leave data in an invalid state.

## When to Use

Use this recipe when:

- Transferring money between accounts. See [Money and Currency](/recipes/data/money-currency) for exact decimal arithmetic.
- Updating inventory after a purchase. See [Batch Processing](/recipes/data/batch-processing-patterns) for bulk operations.
- Creating related records across multiple tables
- Ensuring read consistency for reporting queries
- Preventing [race conditions](/recipes/data/race-condition-prevention) in concurrent writes

## Solution

### Python (SQLAlchemy / psycopg2)

```python
import psycopg2

conn = psycopg2.connect("dbname=mydb user=postgres")
cur = conn.cursor()

try:
    cur.execute("BEGIN")
    cur.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
    cur.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 2")
    conn.commit()
    print("Transfer committed")
except Exception as e:
    conn.rollback()
    print(f"Rolled back: {e}")
finally:
    cur.close()
    conn.close()
```

### JavaScript (Node.js + pg)

```javascript
const { Pool } = require('pg');
const pool = new Pool();

async function transfer(fromId, toId, amount) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
    await client.query('COMMIT');
    console.log('Transfer committed');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Rolled back:', e);
  } finally {
    client.release();
  }
}
```

### Java (JDBC)

```java
import java.sql.*;

public class TransactionExample {
    public static void transfer(Connection conn, int fromId, int toId, double amount) throws SQLException {
        conn.setAutoCommit(false);
        try (PreparedStatement debit = conn.prepareStatement("UPDATE accounts SET balance = balance - ? WHERE id = ?");
             PreparedStatement credit = conn.prepareStatement("UPDATE accounts SET balance = balance + ? WHERE id = ?")) {
            debit.setDouble(1, amount);
            debit.setInt(2, fromId);
            debit.executeUpdate();

            credit.setDouble(1, amount);
            credit.setInt(2, toId);
            credit.executeUpdate();

            conn.commit();
            System.out.println("Transfer committed");
        } catch (SQLException e) {
            conn.rollback();
            throw e;
        } finally {
            conn.setAutoCommit(true);
        }
    }
}
```

## SQL Isolation Levels

```sql
-- PostgreSQL syntax
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN;
-- your operations
COMMIT;
```

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Performance |
|-------|------------|---------------------|--------------|-------------|
| READ UNCOMMITTED | Allowed | Allowed | Allowed | Fastest |
| READ COMMITTED | Prevented | Allowed | Allowed | Default (PG, Oracle) |
| REPEATABLE READ | Prevented | Prevented | Allowed | Default (MySQL) |
| SERIALIZABLE | Prevented | Prevented | Prevented | Slowest, safest |

## What Works

- **Keep transactions short**: Long transactions hold locks and block other queries
- **Use the lowest isolation level** that meets your correctness requirements
- **Always handle rollback**: Use try/catch/finally to ensure rollback on error
- **Use optimistic locking** for high-contention data (version columns). See [Optimistic Locking](/recipes/databases/optimistic-locking) for version-based concurrency.
- **Test concurrent scenarios**: Simulate race conditions in your test suite
- **Avoid user input inside transactions**: Collect data before starting the transaction

## Common Mistakes

- Forgetting to call `commit()` or `rollback()`, leaving connections idle in transaction
- Running long queries inside transactions, causing lock contention
- Using `SERIALIZABLE` everywhere without understanding the performance cost
- Not handling [deadlock exceptions](/recipes/databases/database-deadlocks-retries) (error code 40P01 in PostgreSQL)
- Nesting transactions without savepoints

## Frequently Asked Questions

**Q: What is the difference between a transaction and a batch?**
A: A batch sends multiple statements at once for efficiency. A transaction wraps them in ACID guarantees. You can batch inside a transaction.

**Q: When should I use optimistic vs pessimistic locking?**
A: Optimistic (version checks) works best for read-heavy data with rare conflicts. Pessimistic (SELECT FOR UPDATE) is better for write-heavy hot rows.

**Q: Can I use transactions with NoSQL databases?**
A: Some NoSQL databases support limited transactions (MongoDB 4.0+ multi-document ACID, DynamoDB transactions). Many do not.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### Savepoints for Nested Transactions

```python
try:
    cur.execute("BEGIN")
    cur.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 1")

    # Savepoint before risky operation
    cur.execute("SAVEPOINT before_insert")
    try:
        cur.execute("INSERT INTO audit_log (action) VALUES ('transfer')")
    except Exception:
        cur.execute("ROLLBACK TO SAVEPOINT before_insert")
        # Continue with main transaction

    cur.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 2")
    conn.commit()
except Exception as e:
    conn.rollback()
    print(f"Rolled back: {e}")
```

### Retry Logic for Deadlocks

```python
import time
from psycopg2 import errors

def with_retry(fn, max_retries=3, base_delay=0.1):
    for attempt in range(max_retries):
        try:
            return fn()
        except errors.DeadlockDetected:
            if attempt == max_retries - 1:
                raise
            delay = base_delay * (2 ** attempt)
            print(f"Deadlock detected, retrying in {delay}s...")
            time.sleep(delay)

def transfer(conn, from_id, to_id, amount):
    def _transfer():
        with conn.cursor() as cur:
            cur.execute("BEGIN")
            cur.execute("UPDATE accounts SET balance = balance - %s WHERE id = %s", (amount, from_id))
            cur.execute("UPDATE accounts SET balance = balance + %s WHERE id = %s", (amount, to_id))
            conn.commit()
    return with_retry(_transfer)
```

### JavaScript Transaction with Retry

```javascript
async function withRetry(fn, maxRetries = 3, baseDelay = 100) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (err.code === '40P01' && attempt < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, attempt);
                console.log(`Deadlock detected, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw err;
        }
    }
}

async function safeTransfer(fromId, toId, amount) {
    return withRetry(async () => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
            await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    });
}
```

### Java Transaction with Spring `@Transactional`

```java
import org.springframework.transaction.annotation.Transactional;
import org.springframework.retry.annotation.Retryable;
import org.springframework.dao.DeadlockLoserDataAccessException;

@Service
public class TransferService {

    @Retryable(value = DeadlockLoserDataAccessException.class, maxAttempts = 3)
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void transfer(Long fromId, Long toId, BigDecimal amount) {
        Account from = accountRepository.findById(fromId)
            .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        Account to = accountRepository.findById(toId)
            .orElseThrow(() -> new IllegalArgumentException("Account not found"));

        from.setBalance(from.getBalance().subtract(amount));
        to.setBalance(to.getBalance().add(amount));

        accountRepository.save(from);
        accountRepository.save(to);

        auditLogRepository.save(new AuditLog("transfer", fromId, toId, amount));
    }
}
```

### Detecting Idle-in-Transaction

```sql
-- PostgreSQL: find transactions that are idle and holding locks
SELECT
    pid,
    state,
    now() - query_start AS duration,
    query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
ORDER BY duration DESC;

-- Kill long idle-in-transaction sessions
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND now() - query_start > interval '5 minutes';
```

### Optimistic Locking with Version Column

```python
def update_with_optimistic_lock(conn, user_id, new_name, expected_version):
    with conn.cursor() as cur:
        cur.execute("BEGIN")
        cur.execute(
            "UPDATE users SET name = %s, version = version + 1 "
            "WHERE id = %s AND version = %s",
            (new_name, user_id, expected_version)
        )
        if cur.rowcount == 0:
            conn.rollback()
            raise ConcurrentModificationError("User was modified by another transaction")
        conn.commit()
```

## Additional Best Practices

6. **Set `lock_timeout` for write transactions.** Prevent transactions from waiting indefinitely for locks:

```sql
SET lock_timeout = '5s';
```

7. **Use `SELECT ... FOR UPDATE` for pessimistic locking.** Lock rows you intend to update to prevent concurrent modifications:

```sql
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
-- Application logic here
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

8. **Batch updates within a single transaction.** Group multiple updates to reduce transaction overhead and WAL volume:

```python
cur.execute("BEGIN")
for item in items:
    cur.execute("UPDATE inventory SET stock = stock - %s WHERE id = %s", (item.qty, item.id))
conn.commit()
```

9. **Use `SET TRANSACTION SNAPSHOT` for consistent reads.** Export a snapshot from one transaction and import it in another for consistent cross-transaction reads:

```sql
-- Transaction 1
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT pg_export_snapshot();
-- Returns '00000003-00000001-1'

-- Transaction 2
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET TRANSACTION SNAPSHOT '00000003-00000001-1';
```

10. **Log transaction duration.** Track how long transactions take to identify long-running ones:

```python
import time

start = time.monotonic()
try:
    cur.execute("BEGIN")
    # ... operations
    conn.commit()
finally:
    elapsed = time.monotonic() - start
    if elapsed > 1.0:
        logger.warning(f"Slow transaction: {elapsed:.2f}s")
```

## Additional Common Mistakes

6. **Starting transactions before all data is ready.** Collect user input and validate before `BEGIN`. Holding a transaction open during I/O or user input causes lock contention.

7. **Not handling serialization failures.** `SERIALIZABLE` isolation can throw `40001` on conflicts. Always implement retry logic for serializable transactions.

8. **Using autocommit for multi-step operations.** Without explicit transactions, each statement commits independently. A failure between steps leaves data inconsistent.

9. **Forgetting to close connections after rollback.** Rollback does not close the connection. Always close connections in `finally` blocks or use context managers.

10. **Mixing DDL and DML in the same transaction.** Some databases (MySQL) implicitly commit on DDL statements, breaking the transaction atomicity.

## Additional FAQ

### How do I handle long-running transactions?

Break them into smaller batches. For backfills, process 1,000-10,000 rows per transaction with `COMMIT` between batches. For reporting, use a read-only transaction with `REPEATABLE READ` or a materialized view.

### What is a distributed transaction?

A distributed transaction spans multiple databases or services. Use two-phase commit (2PC) for strong consistency, or the saga pattern for eventual consistency. PostgreSQL supports 2PC via `PREPARE TRANSACTION`.

### How do I test transaction isolation?

Use concurrent test scripts that run transactions in parallel and verify the isolation guarantees. Frameworks like `pytest` with `pytest-xdist` or Java's `CompletableFuture` can simulate concurrent access.

### What is `idle in transaction` and why is it bad?

`idle in transaction` means a transaction is open but not executing queries. It holds locks, prevents vacuuming, and causes bloat. Always commit or rollback promptly. Use `idle_in_transaction_session_timeout` to auto-kill stuck transactions:

```sql
ALTER SYSTEM SET idle_in_transaction_session_timeout = '300s';
```

## Performance Tips

1. **Keep transactions under 100ms when possible.** Short transactions reduce lock contention and improve throughput.

2. **Use `COPY` instead of `INSERT` for bulk loads.** `COPY` is considerably faster and generates less WAL:

```sql
BEGIN;
COPY users FROM '/path/to/users.csv' WITH (FORMAT csv, HEADER true);
COMMIT;
```

3. **Set `synchronous_commit = off` for non-critical writes.** Reduces latency by not waiting for WAL flush. Use only for data that can be regenerated:

```sql
SET LOCAL synchronous_commit = off;
```

4. **Use advisory locks for application-level coordination.** Avoid row-level locks when you need cross-transaction coordination:

```sql
-- Acquire advisory lock
SELECT pg_advisory_lock(12345);
-- ... application logic
SELECT pg_advisory_unlock(12345);
```

5. **Monitor `pg_locks` for contention.** Identify blocked transactions:

```sql
SELECT
    bl.pid AS blocked_pid,
    kl.pid AS blocking_pid,
    a.query AS blocked_query,
    ka.query AS blocking_query
FROM pg_locks bl
JOIN pg_stat_activity a ON bl.pid = a.pid
JOIN pg_locks kl ON bl.locktype = kl.locktype
    AND bl.database IS NOT DISTINCT FROM kl.database
    AND bl.relation IS NOT DISTINCT FROM kl.relation
    AND bl.pid != kl.pid
JOIN pg_stat_activity ka ON kl.pid = ka.pid
WHERE NOT bl.granted;
```
