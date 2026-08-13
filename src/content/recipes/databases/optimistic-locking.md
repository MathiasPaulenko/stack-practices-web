---
contentType: recipes
slug: optimistic-locking
title: Optimistic Locking in Databases
description: Implement optimistic locking with versioning to prevent lost updates. Examples in SQL, Node.js, Java/JPA, MongoDB, DynamoDB and HTTP ETags.
metaDescription: Implement optimistic locking with versioning to prevent lost updates. Examples in SQL, Node.js, Java/JPA, MongoDB, DynamoDB and HTTP ETags.
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - concurrency
  - sql
  - postgresql
relatedResources:
  - /recipes/database-deadlocks-retries
  - /recipes/database-read-replicas
  - /recipes/sql-joins
  - /guides/sql-performance-tuning-guide
  - /recipes/deadlock-prevention-sql
  - /recipes/concurrent-data-structures
lastUpdated: "2026-08-13"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: Implement optimistic locking with versioning to prevent lost updates. Examples in SQL, Node.js, Java/JPA, MongoDB, DynamoDB and HTTP ETags.
  keywords:
    - optimistic locking
    - database versioning
    - jpa optimistic locking
    - concurrency control
    - lost updates
    - sql
    - hibernate
---
## Overview

Optimistic locking prevents lost updates in concurrent environments by checking whether a record has been modified since it was last read. Each row carries a version number or timestamp. When updating, the application includes the original version in the `WHERE` clause; if the version has changed, the update fails and the application retries or reports a conflict. This avoids the performance cost of holding database locks during user think-time.

Below is an implementation of optimistic locking with integer versioning in PostgreSQL, MySQL, and JPA/Hibernate.

## When to Use

Use this resource when:
- Multiple users or processes may edit the same record concurrently. See [Database Transactions](/recipes/database-transactions/) for ACID patterns.
- You want to avoid pessimistic locks that hurt throughput and can deadlock
- Your application has a read-modify-write pattern with gaps between read and write
- You need conflict detection in [REST APIs](/recipes/call-rest-api/), offline-first apps, or distributed systems

Do **not** use it when:

- Contention is so high that retries become expensive or impractical. For those cases, prefer [pessimistic locks](/recipes/locks-and-mutexes/) or atomic operations such as `SELECT FOR UPDATE`.
- You can redesign the flow to avoid the read-modify-write pattern entirely, for example by appending events or using CRDTs.
- You expect the same record to be updated many times per second from different sources. Pessimistic locking or queueing may be simpler.
- Your database already supports serializable isolation (e.g., PostgreSQL `SERIALIZABLE`) and the workload tolerates its overhead.

## Solution

### Python

```python
import psycopg2
from psycopg2.extras import RealDictCursor

def update_user_email(conn, user_id: int, new_email: str, expected_version: int):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            UPDATE users
            SET email = %s, version = version + 1
            WHERE id = %s AND version = %s
            RETURNING id, version;
        """, (new_email, user_id, expected_version))

        updated = cur.fetchone()
        if not updated:
            raise ValueError(
                f"Conflict: user {user_id} was modified by another transaction. "
                "Please refresh and retry."
            )
        conn.commit()
        return updated

# Usage
try:
    result = update_user_email(conn, user_id=42, new_email="new@example.com", expected_version=3)
    print(f"Updated to version {result['version']}")
except ValueError as e:
    print(e)  # Trigger retry logic in the API layer
```

### JavaScript

```javascript
const { Pool } = require('pg');
const pool = new Pool({ /* config */ });

async function updateProductPrice(productId, newPrice, expectedVersion) {
  const result = await pool.query(
    `UPDATE products
     SET price = $1, version = version + 1, updated_at = NOW()
     WHERE id = $2 AND version = $3
     RETURNING id, version;`,
    [newPrice, productId, expectedVersion]
  );

  if (result.rowCount === 0) {
    const current = await pool.query('SELECT version FROM products WHERE id = $1', [productId]);
    throw new Error(
      `Version conflict: expected ${expectedVersion}, found ${current.rows[0]?.version}. Please retry.`
    );
  }

  return result.rows[0];
}

// Express route with retry
app.put('/products/:id', async (req, res) => {
  try {
    const product = await updateProductPrice(req.params.id, req.body.price, req.body.version);
    res.json(product);
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});
```

### Java

```java
// JPA / Hibernate with @Version
import jakarta.persistence.*;

@Entity
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private BigDecimal price;

    @Version
    private Integer version;  // Auto-incremented by Hibernate on every flush

    // Getters and setters...
}

// Service layer
@Service
@Transactional
public class ProductService {
    @Autowired
    private ProductRepository repo;

    public Product updatePrice(Long id, BigDecimal newPrice) {
        Product product = repo.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Product not found"));
        product.setPrice(newPrice);
        return repo.save(product);  // Version checked automatically on flush
    }
}

// Catching the optimistic lock exception
@ExceptionHandler(OptimisticLockingFailureException.class)
public ResponseEntity<Map<String, String>> handleConflict(OptimisticLockingFailureException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(Map.of("error", "Resource modified by another user. Please refresh and retry."));
}
```

## Explanation

Optimistic locking works on the assumption that conflicts are rare. The database does not lock the row during reading. Instead, the update is conditional:

```sql
UPDATE table SET ... WHERE id = ? AND version = ?
```

If `rowsAffected == 0`, the version changed between read and write. The application then handles the conflict: retry with fresh data, return HTTP 409, or merge changes.

**Trade-offs:**
- **Optimistic**: no locks during read; fast and growth-ready; requires retry logic on conflict
- **Pessimistic**: `SELECT FOR UPDATE` locks the row immediately; simpler logic but serializes access and risks deadlocks

For more concurrency patterns, see [Concurrent Data Structures](/recipes/concurrent-data-structures/).

## Variants

| Technology | Approach | Notes |
|------------|----------|-------|
| Integer version | `version` column incremented on every update | Most common; works across all relational databases |
| Timestamp | `updated_at` column compared at write time | Prone to clock skew issues; use database timestamps, not app clocks |
| Checksum / hash | Hash of row contents stored and compared | Detects any change, even if version was bypassed |
| JPA `@Version` | Automatic integer version | Hibernate handles increment and conflict detection transparently |
| DynamoDB | Conditional writes with `Expected` | No native versioning; use attribute_exists or value comparisons |
| MongoDB | `findAndModify` with query criteria | Include version in filter; retry if document was modified |

## What Works

1. Always return the current version to the client after every read so it can send it back on update
2. Implement [exponential backoff retry](/recipes/retry-backoff/) (1–3 attempts) for transient conflicts in automated processes
3. Use integer `version` over timestamps; clocks are unreliable across nodes and timezones
4. Keep transactions short; the gap between read and write is your vulnerability window
5. Log version conflicts at `INFO` level to monitor contention hotspots without alarming on every retry

## Common Mistakes

1. **Not exposing version to API consumers** — clients cannot send it back if they never received it
2. **Infinite retry loops** — always cap retries and surface persistent conflicts to the user
3. **Updating the version in application code** — let the database or ORM increment it atomically
4. **Using pessimistic locking for everything** — kills throughput; reserve `FOR UPDATE` for true inventory or banking scenarios. See [Locks and Mutexes](/recipes/locks-and-mutexes/) for lock patterns.
5. **Ignoring the conflict in UI** — users need clear feedback that their data is stale and must be refreshed

## FAQ

### Should I use optimistic or pessimistic locking?


Optimistic for most read-heavy workloads with infrequent writes. Pessimistic when contention is high and retry logic is impractical (e.g., seat reservations, inventory allocation).


### What HTTP status should I return on a conflict?


`409 Conflict` is the standard. Include the current resource state in the response body so the client can merge or retry without a second request.


### How do I handle optimistic locking in a microservices architecture?


Use event sourcing or sagas where each service owns its aggregate. If cross-service consistency is needed, prefer idempotent operations with conditional updates rather than distributed locking. Compensating transactions (undo) are often safer than distributed locks. See [Circuit Breaker](/patterns/circuit-breaker-pattern/) for resilience patterns.


### How do I retry a failed update?

Use a small number of capped retries with exponential jitter. See the [retry implementation example](#implementation-examples) for Python and JavaScript.

### How do I implement optimistic locking in MongoDB?

Use `findOneAndUpdate` with the expected version in the filter and `$inc: { version: 1 }`. See the [MongoDB implementation example](#implementation-examples).

### How do I use conditional writes in DynamoDB?

Use `update_item` with a `ConditionExpression` on the version attribute. See the [DynamoDB implementation example](#implementation-examples).

### How do I implement optimistic locking with ETags in HTTP APIs?

Return an ETag on read and require `If-Match` on write, responding with 412 if the resource changed. See the [ETag implementation example](#implementation-examples).

### How do I update multiple rows with optimistic locking?

Loop over the updates in one transaction, rolling back if any row fails the version check. See the [batch update implementation example](#implementation-examples).

### How do I resolve conflicts without losing data?

Read the current version, merge non-overlapping fields, and write back with a fresh version check. See the [conflict resolution implementation example](#implementation-examples).

## Implementation Examples

### Retry logic with exponential backoff


```python
import random
import time
from functools import wraps

def retry_on_conflict(max_retries=3, base_delay=0.05):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except ValueError as e:
                    if "Conflict" not in str(e):
                        raise
                    if attempt == max_retries - 1:
                        raise
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 0.05)
                    time.sleep(delay)
            return None
        return wrapper
    return decorator

@retry_on_conflict(max_retries=3)
def update_user_with_retry(conn, user_id, new_email, expected_version):
    return update_user_email(conn, user_id, new_email, expected_version)
```

```javascript
async function withRetry(fn, maxRetries = 3, baseDelay = 50) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!err.message.includes('Version conflict') || attempt === maxRetries - 1) {
        throw err;
      }
      const delay = baseDelay * (2 ** attempt) + Math.random() * 50;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// Usage with automatic version refresh
async function updateProductWithRetry(productId, updateFn) {
  let product = await getProduct(productId);
  for (let attempt = 0; attempt < 3; attempt++) {
    const updated = updateFn(product);
    try {
      return await pool.query(
        'UPDATE products SET price = $1, version = version + 1 WHERE id = $2 AND version = $3 RETURNING *',
        [updated.price, productId, product.version]
      );
    } catch (err) {
      if (attempt === 2) throw err;
      product = await getProduct(productId); // Refresh and retry
    }
  }
}
```


### MongoDB optimistic locking with `findAndModify`


```javascript
const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.MONGO_URI);

async function updateProductOptimistic(db, productId, newPrice, expectedVersion) {
  const result = await db.collection('products').findOneAndUpdate(
    { _id: productId, version: expectedVersion },
    {
      $set: { price: newPrice },
      $inc: { version: 1 },
    },
    { returnDocument: 'after' }
  );

  if (!result) {
    const current = await db.collection('products').findOne({ _id: productId });
    throw new Error(
      `Version conflict: expected ${expectedVersion}, found ${current?.version}. Please retry.`
    );
  }

  return result;
}

// Mongoose plugin for automatic versioning
const optimisticLockPlugin = (schema) => {
  schema.add({ version: { type: Number, default: 0 } });

  schema.pre('findOneAndUpdate', function () {
    const filter = this.getFilter();
    const update = this.getUpdate();

    if (filter.version !== undefined && update.$inc) {
      update.$inc.version = (update.$inc.version || 0) + 1;
    } else if (filter.version !== undefined) {
      this.setUpdate({ ...update, $inc: { version: 1 } });
    }
  });
};

productSchema.plugin(optimisticLockPlugin);
```


### DynamoDB conditional writes


```python
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('products')

def update_price_optimistic(product_id, new_price, expected_version):
    response = table.update_item(
        Key={'product_id': product_id},
        UpdateExpression='SET price = :p, version = :new_v',
        ConditionExpression='version = :expected',
        ExpressionAttributeValues={
            ':p': new_price,
            ':new_v': expected_version + 1,
            ':expected': expected_version,
        },
        ReturnValues='ALL_NEW'
    )
    return response

# Handle conditional check failure
from botocore.exceptions import ClientError

try:
    update_price_optimistic('prod-42', 99.99, 3)
except ClientError as e:
    if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
        print("Version conflict: another process modified this item")
```


### ETag and If-Match for HTTP APIs


```javascript
// Express middleware for ETag-based optimistic locking
const crypto = require('crypto');

function generateETag(resource) {
  const hash = crypto.createHash('md5');
  hash.update(JSON.stringify(resource));
  return `"${hash.digest('hex')}"`;
}

app.put('/products/:id', async (req, res) => {
  const ifMatch = req.headers['if-match'];
  if (!ifMatch) {
    return res.status(428).json({ error: 'If-Match header required' });
  }

  const product = await getProduct(req.params.id);
  const currentETag = generateETag(product);

  if (ifMatch !== currentETag) {
    return res.status(412).json({
      error: 'Precondition failed: resource has been modified',
      currentETag,
    });
  }

  const updated = await updateProduct(req.params.id, req.body);
  res.set('ETag', generateETag(updated));
  res.json(updated);
});
```


### Batch optimistic locking


```python
def batch_update_with_versions(conn, updates):
    """Update multiple rows with optimistic locking in a single transaction."""
    results = []
    with conn.cursor() as cur:
        for item in updates:
            cur.execute("""
                UPDATE products
                SET price = %s, version = version + 1
                WHERE id = %s AND version = %s
                RETURNING id, version;
            """, (item['new_price'], item['id'], item['expected_version']))

            updated = cur.fetchone()
            if not updated:
                conn.rollback()
                raise ValueError(
                    f"Conflict on product {item['id']}: "
                    f"expected version {item['expected_version']}"
                )
            results.append(updated)
    conn.commit()
    return results

# Usage
try:
    results = batch_update_with_versions(conn, [
        {'id': 1, 'new_price': 19.99, 'expected_version': 5},
        {'id': 2, 'new_price': 29.99, 'expected_version': 3},
        {'id': 3, 'new_price': 39.99, 'expected_version': 7},
    ])
except ValueError as e:
    print(f"Batch failed: {e}")
    # All updates rolled back, client must refresh and retry
```


### Conflict resolution strategies


A common pattern is to merge non-overlapping fields. If the client changed the email and the server changed the name, you can keep both. The key is to read the current version, merge the changes, and write back with a fresh version check:

```python
def merge_update(conn, user_id, client_changes, expected_version):
    with conn.cursor() as cur:
        cur.execute("SELECT name, email, version FROM users WHERE id = %s", (user_id,))
        current = cur.fetchone()
        if not current:
            raise ValueError("User not found")

        merged = {
            'name': client_changes.get('name', current['name']),
            'email': client_changes.get('email', current['email']),
        }

        cur.execute("""
            UPDATE users
            SET name = %s, email = %s, version = version + 1
            WHERE id = %s AND version = %s
            RETURNING id, version;
        """, (merged['name'], merged['email'], user_id, current['version']))

        updated = cur.fetchone()
        if not updated:
            raise ValueError("Conflict: the record changed during the merge. Please retry.")
        conn.commit()
        return updated
```

If fields overlap, the right choice is domain-specific: show a diff to the user, pick a winner, or ask for confirmation.





## Production Notes

1. **Index the version column.** The `WHERE id = ? AND version = ?` clause needs an index on both columns:

```sql
CREATE INDEX idx_products_id_version ON products (id, version);
```

2. **Keep the read-modify-write gap short.** The longer the gap, the more likely conflicts occur. Avoid calling external APIs or doing heavy computation between read and write.

3. **Use `RETURNING` to avoid a second query.** Get the updated version in the same statement:

```sql
UPDATE products SET price = $1, version = version + 1
WHERE id = $2 AND version = $3
RETURNING id, version;
```

4. **Monitor conflict rates with `pg_stat_database`.** Track deadlocks and conflicts at the database level:

```sql
SELECT datname, deadlocks, conflicts, temp_files
FROM pg_stat_database
WHERE datname = current_database();
```

5. **Consider `SERIALIZABLE` isolation instead of manual versioning.** PostgreSQL's `SERIALIZABLE` handles conflicts automatically using SSI (Serializable Snapshot Isolation). It may be simpler than manual version management for complex transactions.

## Key Takeaways

- Optimistic locking avoids long-held database locks by making every update conditional on a version number.
- Use an integer `version` column rather than timestamps; increment it atomically in the database or ORM.
- Always return the current version on reads, and return a clear `409 Conflict` (or equivalent) when the version does not match.
- Keep the read-modify-write window short and cap retries to prevent thundering herds.
- Pessimistic locks, `SELECT FOR UPDATE`, and serializable isolation are valid alternatives when contention is high.

## Further Reading

- [PostgreSQL concurrency control](https://www.postgresql.org/docs/current/transaction-iso.html)
- [MySQL locking reads](https://dev.mysql.com/doc/refman/9.0/en/innodb-locking-reads.html)
- [Jakarta Persistence @Version](https://jakarta.ee/specifications/persistence/3.1/jakarta-persistence-spec-3.1#optimistic-locking)
- [Database Transactions](/recipes/database-transactions/) for ACID patterns
- [Retry Backoff](/recipes/retry-backoff/) for conflict retry logic
- [Locks and Mutexes](/recipes/locks-and-mutexes/) for pessimistic locking patterns
