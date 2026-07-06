---
contentType: recipes
slug: optimistic-locking
title: "Implement Optimistic Locking with Versioning"
description: "How to implement optimistic locking with versioning to prevent lost updates in concurrent database access"
metaDescription: "Implement optimistic locking with versioning to prevent lost updates. Use row versioning in PostgreSQL, MySQL, and JPA/Hibernate with examples."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - concurrency
  - databases
  - sql
  - postgresql
relatedResources:
  - /recipes/database-deadlocks-retries
  - /recipes/database-read-replicas
  - /recipes/database-views-materialized
  - /recipes/sql-joins
  - /guides/sql-performance-tuning-guide
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement optimistic locking with versioning to prevent lost updates. Use row versioning in PostgreSQL, MySQL, and JPA/Hibernate with examples."
  keywords:
    - optimistic-locking
    - concurrency
    - versioning
    - database
    - postgresql
    - mysql
    - jpa
---
## Overview

Optimistic locking prevents lost updates in concurrent environments by checking whether a record has been modified since it was last read. Each row carries a version number or timestamp. When updating, the application includes the original version in the `WHERE` clause; if the version has changed, the update fails and the application retries or reports a conflict. This avoids the performance cost of holding database locks during user think-time.

Below is an implementation of optimistic locking with integer versioning in PostgreSQL, MySQL, and JPA/Hibernate.

## When to Use

Use this resource when:
- Multiple users or processes may edit the same record concurrently. See [Database Transactions](/recipes/databases/database-transactions) for ACID patterns.
- You want to avoid pessimistic locks that hurt throughput and can deadlock
- Your application has a read-modify-write pattern with gaps between read and write
- You need conflict detection in [REST APIs](/recipes/api/call-rest-api), offline-first apps, or distributed systems

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
2. Implement [exponential backoff retry](/recipes/architecture/retry-backoff) (1–3 attempts) for transient conflicts in automated processes
3. Use integer `version` over timestamps; clocks are unreliable across nodes and timezones
4. Keep transactions short; the gap between read and write is your vulnerability window
5. Log version conflicts at `INFO` level to monitor contention hotspots without alarming on every retry

## Common Mistakes

1. **Not exposing version to API consumers** — clients cannot send it back if they never received it
2. **Infinite retry loops** — always cap retries and surface persistent conflicts to the user
3. **Updating the version in application code** — let the database or ORM increment it atomically
4. **Using pessimistic locking for everything** — kills throughput; reserve `FOR UPDATE` for true inventory or banking scenarios. See [Locks and Mutexes](/recipes/concurrency/locks-and-mutexes) for lock patterns.
5. **Ignoring the conflict in UI** — users need clear feedback that their data is stale and must be refreshed

## Frequently Asked Questions

### Should I use optimistic or pessimistic locking?

Optimistic for most read-heavy workloads with infrequent writes. Pessimistic when contention is high and retry logic is impractical (e.g., seat reservations, inventory allocation).

### What HTTP status should I return on a conflict?

`409 Conflict` is the standard. Include the current resource state in the response body so the client can merge or retry without a second request.

### How do I handle optimistic locking in a microservices architecture?

Use event sourcing or sagas where each service owns its aggregate. If cross-service consistency is needed, prefer idempotent operations with conditional updates rather than distributed locking. Compensating transactions (undo) are often safer than distributed locks. See [Circuit Breaker](/patterns/design/circuit-breaker-pattern) for resilience patterns.

### Retry Logic with Exponential Backoff

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

### MongoDB Optimistic Locking with `findAndModify`

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

### DynamoDB Conditional Writes

```python
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('products')

def update_price_optimistic(product_id, new_price, expected_version):
    response = table.put_item(
        Item={
            'product_id': product_id,
            'price': new_price,
            'version': expected_version + 1,
        },
        ConditionExpression='product_id = :pid AND version = :expected',
        ExpressionAttributeValues={
            ':pid': product_id,
            ':expected': expected_version,
        }
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

### Batch Optimistic Locking

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

### Conflict Resolution Strategies

```python
def merge_update(conn, user_id, client_changes, expected_version):
    """Three-way merge: base version, current version, client changes."""
    with conn.cursor() as cur:
        # Get current version
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        current = cur.fetchone()
        if not current:
            raise ValueError("User not found")

        if current['version'] == expected_version:
            # No conflict: apply directly
            cur.execute("""
                UPDATE users SET email = %s, name = %s, version = version + 1
                WHERE id = %s AND version = %s
            """, (client_changes['email'], client_changes['name'], user_id, expected_version))
            conn.commit()
            return cur.fetchone()

        # Conflict: merge non-overlapping fields
        # If client changed email but not name, and server changed name but not email,
        # apply both changes
        merged = {}
        for field in ['email', 'name']:
            if field in client_changes:
                merged[field] = client_changes[field]
            else:
                merged[field] = current[field]

        cur.execute("""
            UPDATE users SET email = %s, name = %s, version = version + 1
            WHERE id = %s
        """, (merged['email'], merged['name'], user_id))
        conn.commit()
        return cur.fetchone()
```

## Additional Best Practices

6. **Return the new version in every API response.** Clients need the current version to send on the next update:

```javascript
// API response includes version
res.json({
  id: product.id,
  name: product.name,
  price: product.price,
  version: product.version,  // Client sends this back on next update
});
```

7. **Use `SELECT ... FOR UPDATE` as a fallback.** If optimistic conflicts exceed 5% of attempts, switch to pessimistic locking for that specific operation:

```python
# Detect high conflict rate and switch strategy
conflict_count = 0
attempt_count = 0

def update_with_adaptive_locking(conn, user_id, new_email):
    global conflict_count, attempt_count
    attempt_count += 1

    if conflict_count / max(attempt_count, 1) > 0.05:
        # Switch to pessimistic locking
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE id = %s FOR UPDATE", (user_id,))
            user = cur.fetchone()
            cur.execute("UPDATE users SET email = %s WHERE id = %s", (new_email, user_id))
            conn.commit()
            return user
    else:
        # Use optimistic locking
        try:
            return update_user_email(conn, user_id, new_email, get_current_version(user_id))
        except ValueError:
            conflict_count += 1
            raise
```

8. **Log conflict details for monitoring.** Track which entities have high conflict rates:

```python
import logging
logger = logging.getLogger('optimistic_locking')

def log_conflict(entity_type, entity_id, expected_version, actual_version):
    logger.info(
        "Optimistic lock conflict",
        extra={
            'entity_type': entity_type,
            'entity_id': entity_id,
            'expected_version': expected_version,
            'actual_version': actual_version,
        }
    )
```

9. **Use `updated_at` timestamp as a secondary check.** Combine version integer with timestamp for extra safety:

```sql
UPDATE products
SET price = $1, version = version + 1, updated_at = NOW()
WHERE id = $2 AND version = $3 AND updated_at = $4
RETURNING id, version, updated_at;
```

10. **Consider using `xmin` system column in PostgreSQL.** PostgreSQL tracks row versions internally. You can use `xmin` as an implicit version:

```sql
-- Read with xmin
SELECT id, email, xmin FROM users WHERE id = 42;

-- Update with xmin check
UPDATE users SET email = 'new@example.com'
WHERE id = 42 AND xmin = 1234567;
```

## Additional Common Mistakes

6. **Not refreshing data after a conflict.** After catching a conflict, you must re-read the current state before retrying. Retrying with the same stale version will always fail.

7. **Using application-level timestamps instead of database timestamps.** Application clocks drift across servers. Use `NOW()` in SQL or database-generated timestamps.

8. **Mixing optimistic and pessimistic locking on the same row.** This causes unpredictable behavior. Pick one strategy per entity or operation.

9. **Not handling the case where the row was deleted.** A version check returns 0 rows both when the version changed and when the row was deleted. Distinguish these cases:

```python
if not updated:
    cur.execute("SELECT 1 FROM users WHERE id = %s", (user_id,))
    if not cur.fetchone():
        raise NotFoundError("User was deleted")
    else:
        raise ConflictError("Version mismatch: please refresh and retry")
```

10. **Using `SELECT FOR UPDATE NOWAIT` and treating lock errors as conflicts.** `NOWAIT` throws a lock error, not a version conflict. These are different conditions requiring different handling.

## Additional FAQ

### How do I test optimistic locking?

Write tests that simulate concurrent updates:

```python
import threading

def test_concurrent_update():
    # Two threads read the same version
    results = []
    errors = []

    def update_thread():
        try:
            conn = get_connection()
            result = update_user_email(conn, 42, "new@example.com", expected_version=3)
            results.append(result)
        except ValueError as e:
            errors.append(str(e))

    t1 = threading.Thread(target=update_thread)
    t2 = threading.Thread(target=update_thread)
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    assert len(results) == 1  # One succeeds
    assert len(errors) == 1  # One gets conflict
```

### What is the difference between optimistic locking and CAS (Compare-And-Swap)?

They are the same concept. CAS is the term used in low-level concurrency (CPU instructions, Memcached). Optimistic locking is the database/ORM term. Both check a expected value before applying an update atomically.

### Can I use optimistic locking with batch operations?

Yes, but all updates in the batch must succeed or the entire transaction rolls back. If one row has a version conflict, none of the updates apply. This is usually the desired behavior for atomic batch updates.

## Performance Tips

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
