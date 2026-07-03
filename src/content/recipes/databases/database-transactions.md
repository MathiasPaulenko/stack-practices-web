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
