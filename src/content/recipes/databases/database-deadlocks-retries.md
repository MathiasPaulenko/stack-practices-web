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
relatedResources:
  - /recipes/database-transactions
  - /recipes/full-text-search
  - /recipes/sql-joins
  - /docs/database-migration-runbook-template
  - /guides/cap-theorem-guide
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

This recipe covers detecting, preventing, and automatically retrying transactions after deadlocks in PostgreSQL, MySQL, and SQL Server.

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
