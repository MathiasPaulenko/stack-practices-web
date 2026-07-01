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

This recipe implements optimistic locking with integer versioning in PostgreSQL, MySQL, and JPA/Hibernate.

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
