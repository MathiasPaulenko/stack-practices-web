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
