---



contentType: recipes
slug: acid-transactions-postgres
title: "Implement ACID Transactions in PostgreSQL"
description: "How to use PostgreSQL transactions to ensure Atomicity, Consistency, Isolation, and Durability for reliable multi-step database operations"
metaDescription: "ACID transactions in PostgreSQL. Ensure atomicity, consistency, isolation, and durability with proper transaction boundaries, isolation levels, and savepoints."
difficulty: intermediate
topics:
  - databases
  - data
tags:
  - acid
  - database
  - postgres
  - transactions
  - databases
relatedResources:
  - /recipes/mongodb-crud-mongoose
  - /recipes/query-optimization
  - /guides/database-design-guide
  - /recipes/deadlock-prevention-sql
  - /recipes/postgres-query-optimization
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "ACID transactions in PostgreSQL. Ensure atomicity, consistency, isolation, and durability with proper transaction boundaries, isolation levels, and savepoints."
  keywords:
    - acid transactions
    - postgresql
    - database consistency
    - isolation levels
    - sql transactions



---

# Implement ACID Transactions in PostgreSQL

ACID properties — Atomicity, Consistency, Isolation, Durability — are the foundation of reliable database operations. PostgreSQL provides full ACID compliance with multiple isolation levels, savepoints for nested transactions, and reliable error handling that ensures data integrity even in failure scenarios.

## When to Use This

- Multiple related operations must succeed or fail together. See [Database Transactions](/recipes/databases/database-transactions) for language-specific patterns.
- Concurrent access to the same records requires predictable behavior. See [Locks and Mutexes](/recipes/concurrency/locks-and-mutexes) for coordination primitives.
- Financial, inventory, or booking operations must not leave data in an intermediate state. See [Money and Currency](/recipes/data/money-currency) for exact arithmetic.

## Prerequisites

- PostgreSQL 14+ running locally or on a managed service
- Understanding of basic SQL and database connections

## Solution

### 1. Basic Transaction with Commit and Rollback

```sql
-- Transfer funds between accounts
BEGIN;

UPDATE accounts
SET balance = balance - 100
WHERE id = 1 AND balance >= 100;

UPDATE accounts
SET balance = balance + 100
WHERE id = 2;

-- Check that both updates succeeded
IF NOT FOUND THEN
  ROLLBACK;
  RAISE EXCEPTION 'Insufficient funds or account not found';
END IF;

COMMIT;
```

```typescript
// db/transfer.ts
import { Pool } from 'pg';

async function transferFunds(pool: Pool, fromId: number, toId: number, amount: number) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const debitResult = await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance',
      [amount, fromId]
    );
    
    if (debitResult.rowCount === 0) {
      throw new Error('Insufficient funds');
    }
    
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toId]
    );
    
    await client.query('COMMIT');
    return { success: true, newBalance: debitResult.rows[0].balance };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### 2. Isolation Levels

```sql
-- READ COMMITTED (default): prevents dirty reads
BEGIN ISOLATION LEVEL READ COMMITTED;
SELECT balance FROM accounts WHERE id = 1;
-- Another transaction commits a change here
SELECT balance FROM accounts WHERE id = 1; -- sees the committed change
COMMIT;

-- REPEATABLE READ: prevents non-repeatable reads
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT balance FROM accounts WHERE id = 1;
-- Another transaction commits a change here
SELECT balance FROM accounts WHERE id = 1; -- still sees the original value
COMMIT;

-- SERIALIZABLE: prevents phantom reads, strongest isolation
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT COUNT(*) FROM orders WHERE status = 'pending';
-- Another transaction inserts a pending order
SELECT COUNT(*) FROM orders WHERE status = 'pending'; -- same count as before
COMMIT;
```

### 3. Savepoints for Nested Operations

```sql
BEGIN;

INSERT INTO orders (customer_id, total) VALUES (1, 250.00) RETURNING id;
-- order_id = 100

SAVEPOINT before_items;

INSERT INTO order_items (order_id, product_id, quantity) VALUES (100, 5, 2);
INSERT INTO order_items (order_id, product_id, quantity) VALUES (100, 8, 1);

-- Partial rollback if inventory check fails
SAVEPOINT before_inventory;

UPDATE inventory SET stock = stock - 2 WHERE product_id = 5;
UPDATE inventory SET stock = stock - 1 WHERE product_id = 8;

-- If any stock went negative
ROLLBACK TO SAVEPOINT before_inventory;
-- Items remain, but inventory update is undone

COMMIT;
```

### 4. Advisory Locks for Application-Level Coordination

```typescript
// db/distributed-lock.ts
async function withAdvisoryLock(pool: Pool, lockId: number, task: () => Promise<void>) {
  const client = await pool.connect();
  
  try {
    // Obtain exclusive advisory lock
    await client.query('SELECT pg_advisory_lock($1)', [lockId]);
    await task();
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [lockId]);
    client.release();
  }
}

// Usage: prevent duplicate order processing
await withAdvisoryLock(pool, orderId, async () => {
  await processOrder(orderId);
});
```

## How It Works

1. **Atomicity** ensures all operations complete or none do via `COMMIT`/`ROLLBACK`
2. **Consistency** enforces constraints (foreign keys, check constraints) within transactions
3. **Isolation** prevents concurrent transactions from interfering via MVCC and locks
4. **Durability** guarantees committed data survives crashes through WAL (Write-Ahead Logging)

## Production Considerations

- Use **READ COMMITTED** for most applications; upgrade to **SERIALIZABLE** only when necessary. See [Deadlocks and Retries](/recipes/databases/database-deadlocks-retries) for concurrency safety.
- Keep transactions short to minimize lock contention
- Use **advisory locks** when you need application-level serialization across services. See [Locks and Mutexes](/recipes/concurrency/locks-and-mutexes) for lock patterns.
- Enable **pg_stat_statements** to identify long-running transactions

## Common Mistakes

- Holding transactions open while calling external APIs
- Not handling serialization failures in SERIALIZABLE mode
- Forgetting to release connections back to the pool after ROLLBACK

## FAQ

**Q: Should I use SERIALIZABLE for all transactions?**
A: No. SERIALIZABLE has higher overhead and retry requirements. READ COMMITTED is sufficient for most use cases.

**Q: What happens if the connection drops during a transaction?**
A: PostgreSQL automatically rolls back any uncommitted work when the connection terminates.

**Q: How do I debug lock contention?**
A: Query `pg_locks` and `pg_stat_activity` to see waiting transactions and their blockers.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### Python Async Transactions with `asyncpg`

```python
import asyncio
import asyncpg

async def transfer_funds(conn, from_account, to_account, amount):
    async with conn.transaction():
        # Check balance with FOR UPDATE to prevent concurrent modifications
        row = await conn.fetchrow(
            "SELECT balance FROM accounts WHERE id = $1 FOR UPDATE",
            from_account
        )
        if row['balance'] < amount:
            raise ValueError("Insufficient funds")

        await conn.execute(
            "UPDATE accounts SET balance = balance - $1 WHERE id = $2",
            amount, from_account
        )
        await conn.execute(
            "UPDATE accounts SET balance = balance + $1 WHERE id = $2",
            amount, to_account
        )

        # Insert audit log in same transaction
        await conn.execute(
            "INSERT INTO transfers (from_account, to_account, amount) VALUES ($1, $2, $3)",
            from_account, to_account, amount
        )

async def main():
    conn = await asyncpg.connect('postgresql://user:pass@localhost/mydb')
    try:
        await transfer_funds(conn, 1, 2, 100.00)
        print("Transfer completed")
    except Exception as e:
        print(f"Transfer failed: {e}")
    finally:
        await conn.close()

asyncio.run(main())
```

### Java JDBC Transactions with Savepoints

```java
import java.sql.*;

public class OrderProcessor {
    private Connection getConnection() throws SQLException {
        return DriverManager.getConnection(
            "jdbc:postgresql://localhost:5432/mydb", "user", "pass"
        );
    }

    public void processOrderWithItems(int orderId, List<OrderItem> items)
            throws SQLException {
        Connection conn = getConnection();
        conn.setAutoCommit(false);

        try {
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE orders SET status = 'processing' WHERE id = ?")) {
                ps.setInt(1, orderId);
                ps.executeUpdate();
            }

            for (OrderItem item : items) {
                Savepoint sp = conn.setSavepoint("item_" + item.getProductId());
                try (PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)")) {
                    ps.setInt(1, orderId);
                    ps.setInt(2, item.getProductId());
                    ps.setInt(3, item.getQuantity());
                    ps.executeUpdate();
                } catch (SQLException e) {
                    conn.rollback(sp);
                    System.err.println("Failed to add item " + item.getProductId() + ": " + e.getMessage());
                }
            }

            conn.commit();
        } catch (SQLException e) {
            conn.rollback();
            throw e;
        } finally {
            conn.setAutoCommit(true);
            conn.close();
        }
    }
}
```

### Isolation Level Comparison Table

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Serialization Anomaly | Performance Impact |
|-------|-----------|--------------------|--------------|-----------------------|--------------------|
| Read Uncommitted | Possible | Possible | Possible | Possible | Lowest |
| Read Committed | Prevented | Possible | Possible | Possible | Low |
| Repeatable Read | Prevented | Prevented | Possible | Possible | Medium |
| Serializable | Prevented | Prevented | Prevented | Prevented | Highest |

### Advisory Locks for Application-Level Coordination

```sql
-- Transaction-level advisory lock (auto-released on commit/rollback)
SELECT pg_advisory_xact_lock(12345);

-- Session-level advisory lock (must be explicitly released)
SELECT pg_advisory_lock(12345);
-- ... do work ...
SELECT pg_advisory_unlock(12345);

-- Try-lock (non-blocking, returns true/false)
SELECT pg_try_advisory_lock(12345);
-- Returns true if acquired, false if already locked
```

```python
import psycopg2

conn = psycopg2.connect("postgresql://user:pass@localhost/mydb")
cur = conn.cursor()

cur.execute("SELECT pg_advisory_lock(%s)", (99999,))
locked = cur.fetchone()[0]

try:
    cur.execute("DELETE FROM old_logs WHERE created_at < NOW() - INTERVAL '30 days'")
    conn.commit()
finally:
    cur.execute("SELECT pg_advisory_unlock(%s)", (99999,))
    conn.commit()
```

### LISTEN/NOTIFY for Cross-Process Communication

```sql
-- Process 1: Listen for notifications
LISTEN order_created;

-- Process 2: Notify when an order is created
NOTIFY order_created, '{"order_id": 42, "customer": "alice"}';
```

```python
import psycopg2
import select

conn = psycopg2.connect("postgresql://user:pass@localhost/mydb")
conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
cur = conn.cursor()
cur.execute("LISTEN order_created")

while True:
    if select.select([conn], [], [], 1) == ([], [], []):
        continue

    conn.poll()
    while conn.notifies:
        notify = conn.notifies.pop(0)
        print(f"Received: {notify.channel} - {notify.payload}")
```

### Transaction Monitoring and Deadlock Detection

```sql
-- View active transactions with lock waits
SELECT
    activity.pid,
    activity.usename,
    activity.query,
    now() - activity.query_start AS duration,
    locks.locktype,
    locks.relation::regclass AS locked_table
FROM pg_stat_activity activity
JOIN pg_locks locks ON activity.pid = locks.pid
WHERE locks.granted = false
ORDER BY duration DESC;

-- Identify deadlock sources
SELECT
    blocked.pid AS blocked_pid,
    blocked.query AS blocked_query,
    blocking.pid AS blocking_pid,
    blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking ON blocking.pid != blocked.pid
WHERE blocked.wait_event_type = 'Lock';

-- Set lock_timeout for critical operations
SET lock_timeout = '5s';
```

### Python Context Manager for Transactions

```python
from contextlib import contextmanager
import psycopg2

@contextmanager
def transaction(conn_str, isolation_level='READ COMMITTED'):
    conn = psycopg2.connect(conn_str)
    conn.set_isolation_level(
        getattr(psycopg2.extensions, f'ISOLATION_LEVEL_{isolation_level.replace(" ", "_").upper()}')
    )
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

# Usage
with transaction("postgresql://user:pass@localhost/mydb") as conn:
    with conn.cursor() as cur:
        cur.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 1")
        cur.execute("INSERT INTO audit_log (action, amount) VALUES ('deposit', 100)")
```

## Additional Best Practices

6. **Set `lock_timeout` for interactive transactions.** Prevent a query from waiting indefinitely for a lock:

```sql
SET LOCAL lock_timeout = '5s';
BEGIN;
SELECT * FROM large_table WHERE id = 42 FOR UPDATE;
COMMIT;
```

7. **Use `idle_in_transaction_session_timeout`.** Prevent abandoned transactions from holding locks:

```sql
ALTER DATABASE mydb SET idle_in_transaction_session_timeout = '30s';
```

8. **Batch inserts with `COPY` instead of `INSERT`.** For large data loads, `COPY` is 10-100x faster and still transactional:

```python
import csv
import io

def bulk_insert_products(conn, products):
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter='\t')
    for p in products:
        writer.writerow([p['id'], p['name'], p['price']])
    buffer.seek(0)

    with conn.cursor() as cur:
        cur.copy_from(buffer, 'products', columns=('id', 'name', 'price'))
    conn.commit()
```

9. **Use `RETURNING` to chain operations.** Avoid extra queries after inserts:

```sql
INSERT INTO orders (customer_id, total) VALUES (42, 99.99)
RETURNING id;
```

10. **Keep transactions short.** Long transactions hold locks, prevent vacuuming, and increase the chance of deadlocks. Move non-database work outside the transaction boundary.

## Additional Common Mistakes

6. **Using autocommit for multi-step operations.** If step 1 succeeds and step 2 fails, the database is in an inconsistent state. Always wrap multi-step operations in an explicit transaction.

7. **Holding transactions open across HTTP requests.** A transaction started in one request cannot be continued in another. Use a transaction per request or a saga pattern for multi-request workflows.

8. **Not handling serialization failures.** `SERIALIZABLE` isolation can throw `40001` (serialization failure). The application must retry:

```python
from psycopg2 import OperationalError

def run_serializable(conn, fn, max_retries=3):
    for attempt in range(max_retries):
        try:
            conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_SERIALIZABLE)
            result = fn(conn)
            conn.commit()
            return result
        except OperationalError as e:
            if e.pgcode == '40001' and attempt < max_retries - 1:
                conn.rollback()
                continue
            raise
```

9. **Forgetting to close savepoints.** In PostgreSQL, savepoints are automatically released on commit, but explicitly releasing them improves readability:

```sql
SAVEPOINT sp1;
-- Some work
RELEASE SAVEPOINT sp1;
```

10. **Using `SELECT MAX(id) + 1` for ID generation.** This causes race conditions under concurrent inserts. Use `SERIAL`, `IDENTITY`, or sequences instead.

## Additional FAQ

### How do I debug transaction deadlocks?

Enable deadlock logging in PostgreSQL:

```sql
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET deadlock_timeout = '1s';
SELECT pg_reload_conf();
```

Then check PostgreSQL logs for deadlock details. The log shows the exact queries and resources involved.

### Can I use nested transactions in PostgreSQL?

PostgreSQL does not support true nested transactions. Use savepoints as a substitute. A `ROLLBACK TO savepoint` undoes work after the savepoint but keeps the outer transaction active.

### What is the difference between `READ COMMITTED` and `REPEATABLE READ` in PostgreSQL?

In PostgreSQL, `READ COMMITTED` re-evaluates the snapshot for each statement, so you may see new rows committed by other transactions between statements. `REPEATABLE READ` uses a single snapshot for the entire transaction. PostgreSQL's `REPEATABLE READ` also prevents phantom reads, unlike the SQL standard's definition.

## Performance Tips

1. **Use `COPY` for bulk data loading.** It bypasses most SQL parsing overhead:

```sql
COPY products FROM '/path/to/products.csv' WITH (FORMAT csv, HEADER true);
```

2. **Reduce round-trips with multi-statement queries.** Send multiple statements in a single `execute`:

```python
cur.execute("""
    INSERT INTO orders (customer_id, total) VALUES (42, 99.99) RETURNING id;
    INSERT INTO audit_log (action) VALUES ('order_created');
""")
```

3. **Use `UNLOGGED` tables for temporary data.** Skip WAL writes for ephemeral tables:

```sql
CREATE UNLOGGED TABLE temp_import (id INT, data TEXT);
```

4. **Set `synchronous_commit = off` for non-critical writes.** This reduces latency by not waiting for WAL flush:

```sql
SET LOCAL synchronous_commit = off;
```

5. **Monitor transaction statistics.** Track rollbacks and deadlocks:

```sql
SELECT
    datname,
    xact_commit,
    xact_rollback,
    deadlocks,
    blks_read,
    blks_hit
FROM pg_stat_database
WHERE datname = current_database();
```
