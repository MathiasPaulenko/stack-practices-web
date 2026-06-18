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
relatedResources:
  - /recipes/databases/mongodb-crud-mongoose
  - /recipes/query-optimization
  - /guides/database-design-guide
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

ACID properties — Atomicity, Consistency, Isolation, Durability — are the foundation of reliable database operations. PostgreSQL provides full ACID compliance with multiple isolation levels, savepoints for nested transactions, and robust error handling that ensures data integrity even in failure scenarios.

## When to Use This

- Multiple related operations must succeed or fail together
- Concurrent access to the same records requires predictable behavior
- Financial, inventory, or booking operations must not leave data in an intermediate state

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

- Use **READ COMMITTED** for most applications; upgrade to **SERIALIZABLE** only when necessary
- Keep transactions short to minimize lock contention
- Use **advisory locks** when you need application-level serialization across services
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
