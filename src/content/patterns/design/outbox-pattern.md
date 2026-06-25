---
contentType: patterns
slug: outbox-pattern
title: "Outbox Pattern"
description: "Reliably publish domain events by persisting them in an outbox table within the same database transaction as the business operation."
metaDescription: "Learn the Outbox Pattern for reliable event publishing in distributed systems. Examples in Python, Java, and SQL for exactly-once delivery."
difficulty: advanced
topics:
  - design
tags:
  - outbox
  - pattern
  - design-pattern
  - behavioral
  - microservices
  - messaging
  - reliability
  - distributed-systems
relatedResources:
  - /patterns/design/event-bus-pattern
  - /patterns/design/saga-pattern
  - /patterns/design/inbox-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Outbox Pattern for reliable event publishing in distributed systems. Examples in Python, Java, and SQL for exactly-once delivery."
  keywords:
    - outbox pattern
    - design pattern
    - microservices
    - event publishing
    - distributed systems
---

# Outbox Pattern

## Overview

The Outbox Pattern guarantees reliable delivery of domain events in distributed systems by writing events to an "outbox" database table within the same transaction as the business operation. A separate relay process reads unpublished events from the outbox and forwards them to a message broker.

Without the outbox, a service might update its database, crash before publishing the event, and leave downstream systems permanently out of sync. The outbox ensures atomicity: either both the business data and the event are committed, or neither is.

## When to Use

Use the Outbox Pattern when:
- A microservice must publish events after a database update
- You need at-least-once delivery guarantees to message brokers
- The message broker is unreliable or temporarily unavailable
- You cannot use a distributed transaction coordinator (2PC)
- Eventual consistency is acceptable, but lost events are not

## When to Avoid

- Synchronous event delivery is required (outbox is inherently asynchronous)
- The system is a single monolith with a shared database
- The database does not support transactions
- Event ordering across aggregates is strictly required (consider event sourcing instead)

## Solution

### SQL Schema

```sql
-- Outbox table: stores events before they are published
CREATE TABLE outbox (
    id BIGSERIAL PRIMARY KEY,
    aggregate_type VARCHAR(255) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    published_at TIMESTAMP,
    retry_count INT DEFAULT 0
);

CREATE INDEX idx_outbox_unpublished ON outbox(published_at) WHERE published_at IS NULL;
```

### Python

```python
import json
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
import psycopg2

@dataclass
class DomainEvent:
    event_type: str
    aggregate_type: str
    aggregate_id: str
    payload: dict

class OutboxPublisher:
    def __init__(self, db_connection):
        self.conn = db_connection

    def publish(self, event: DomainEvent):
        """Write event to outbox table within caller's transaction."""
        with self.conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
                VALUES (%s, %s, %s, %s)
                """,
                (event.aggregate_type, event.aggregate_id,
                 event.event_type, json.dumps(event.payload))
            )

class OrderService:
    def __init__(self, db_connection, outbox: OutboxPublisher):
        self.conn = db_connection
        self.outbox = outbox

    def place_order(self, user_id: str, product_id: str, amount: float):
        with self.conn:
            with self.conn.cursor() as cur:
                # Business operation
                cur.execute(
                    "INSERT INTO orders (user_id, product_id, amount) VALUES (%s, %s, %s) RETURNING id",
                    (user_id, product_id, amount)
                )
                order_id = cur.fetchone()[0]

                # Event written in same transaction
                self.outbox.publish(DomainEvent(
                    event_type="OrderPlaced",
                    aggregate_type="Order",
                    aggregate_id=str(order_id),
                    payload={"user_id": user_id, "product_id": product_id, "amount": amount}
                ))

class OutboxRelay:
    def __init__(self, db_connection, message_broker):
        self.conn = db_connection
        self.broker = message_broker

    def run(self):
        with self.conn:
            with self.conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, aggregate_type, aggregate_id, event_type, payload
                    FROM outbox
                    WHERE published_at IS NULL
                    ORDER BY id
                    LIMIT 100
                    FOR UPDATE SKIP LOCKED
                    """
                )
                rows = cur.fetchall()

                for row in rows:
                    event_id, agg_type, agg_id, event_type, payload = row
                    try:
                        self.broker.publish(event_type, {
                            "aggregate_type": agg_type,
                            "aggregate_id": agg_id,
                            "payload": payload
                        })
                        cur.execute(
                            "UPDATE outbox SET published_at = NOW() WHERE id = %s",
                            (event_id,)
                        )
                    except Exception:
                        cur.execute(
                            "UPDATE outbox SET retry_count = retry_count + 1 WHERE id = %s",
                            (event_id,)
                        )
```

### Java

```java
import java.sql.*;
import java.time.Instant;

public class OutboxPublisher {
    private final Connection conn;

    public OutboxPublisher(Connection conn) {
        this.conn = conn;
    }

    public void publish(String aggregateType, String aggregateId,
                        String eventType, String payload) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
            "INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload) VALUES (?, ?, ?, ?)")) {
            ps.setString(1, aggregateType);
            ps.setString(2, aggregateId);
            ps.setString(3, eventType);
            ps.setString(4, payload);
            ps.executeUpdate();
        }
    }
}

public class OrderService {
    private final Connection conn;
    private final OutboxPublisher outbox;

    public OrderService(Connection conn, OutboxPublisher outbox) {
        this.conn = conn;
        this.outbox = outbox;
    }

    public void placeOrder(String userId, String productId, double amount) throws SQLException {
        conn.setAutoCommit(false);
        try {
            long orderId;
            try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO orders (user_id, product_id, amount) VALUES (?, ?, ?)", Statement.RETURN_GENERATED_KEYS)) {
                ps.setString(1, userId);
                ps.setString(2, productId);
                ps.setDouble(3, amount);
                ps.executeUpdate();
                ResultSet rs = ps.getGeneratedKeys();
                rs.next();
                orderId = rs.getLong(1);
            }

            outbox.publish("Order", String.valueOf(orderId), "OrderPlaced",
                String.format("{\"user_id\":\"%s\",\"product_id\":\"%s\",\"amount\":%f}", userId, productId, amount));

            conn.commit();
        } catch (Exception e) {
            conn.rollback();
            throw e;
        }
    }
}
```

### JavaScript

```javascript
class OutboxPublisher {
  constructor(db) {
    this.db = db;
  }

  async publish(aggregateType, aggregateId, eventType, payload) {
    await this.db.query(
      `INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
       VALUES ($1, $2, $3, $4)`,
      [aggregateType, aggregateId, eventType, JSON.stringify(payload)]
    );
  }
}

class OrderService {
  constructor(db, outbox) {
    this.db = db;
    this.outbox = outbox;
  }

  async placeOrder(userId, productId, amount) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'INSERT INTO orders (user_id, product_id, amount) VALUES ($1, $2, $3) RETURNING id',
        [userId, productId, amount]
      );
      const orderId = result.rows[0].id;

      await this.outbox.publish('Order', String(orderId), 'OrderPlaced', {
        user_id: userId, product_id: productId, amount
      });

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

class OutboxRelay {
  constructor(db, broker) {
    this.db = db;
    this.broker = broker;
  }

  async run() {
    const result = await this.db.query(
      `SELECT id, event_type, payload FROM outbox
       WHERE published_at IS NULL ORDER BY id LIMIT 100`
    );

    for (const row of result.rows) {
      try {
        await this.broker.publish(row.event_type, row.payload);
        await this.db.query(
          'UPDATE outbox SET published_at = NOW() WHERE id = $1',
          [row.id]
        );
      } catch (err) {
        await this.db.query(
          'UPDATE outbox SET retry_count = retry_count + 1 WHERE id = $1',
          [row.id]
        );
      }
    }
  }
}
```

## Explanation

The Outbox Pattern works in two phases:

1. **Write phase**: The business operation and the event are written to the database in a single ACID transaction. The event lands in the `outbox` table.
2. **Relay phase**: A background process polls the outbox, publishes events to the message broker, and marks them as published.

This guarantees at-least-once delivery. The message broker may receive duplicates if the relay crashes after publishing but before updating the row. Consumers must be idempotent.

## Variants

| Variant | Relay Strategy | Use Case |
|---------|---------------|----------|
| **Polling relay** | Cron job queries every N seconds | Simple, works with any database |
| **CDC relay** | Reads database WAL / binlog | Near real-time, no polling overhead |
| **Transactional outbox** | Relay runs in same app process | Fewer moving parts, but couples relay to app |

## Best Practices

- **Use `FOR UPDATE SKIP LOCKED`** so multiple relay instances can run in parallel without contention.
- **Keep payloads small.** The outbox is not a message queue. Store references, not full documents.
- **Monitor retry counts.** Events that fail repeatedly need manual inspection or a dead-letter queue.
- **Archive published events.** Outbox tables grow indefinitely. Move old rows to a history table or delete them.
- **Make consumers idempotent.** At-least-once delivery means the same event may be processed multiple times.

## Common Mistakes

- **Publishing the event in a separate transaction** defeats the purpose. The database update and outbox insert must be atomic.
- **No retry logic** means transient broker failures permanently stall event delivery.
- **Forgetting to clear published rows** fills the database and slows down the relay.
- **Assuming exactly-once delivery.** The pattern provides at-least-once; idempotent consumers are mandatory.
- **Including sensitive data in payloads** that flow through multiple systems. Use references and encrypt where needed.

## Real-World Examples

### Debezium

Debezium reads PostgreSQL's write-ahead log (WAL) to stream changes out of an outbox table to Kafka without polling.

### Netflix's Maestro

Netflix uses outbox tables to reliably publish workflow events from their task engine to downstream analytics systems.

### E-Commerce Order Systems

Most order services use an outbox to publish `OrderPlaced` events. Payment, inventory, and shipping services consume these events independently.

## Frequently Asked Questions

**Q: What is the difference between Outbox and Inbox?**
A: [Outbox](/patterns/design/outbox-pattern) stores events your service publishes. [Inbox](/patterns/design/inbox-pattern) stores incoming events from other services to prevent duplicate processing.

**Q: How do I handle ordering of events?**
A: Events within the same aggregate are ordered by `id` or `created_at`. Ordering across aggregates is not guaranteed by the outbox itself.

**Q: Can I delete published outbox rows immediately?**
A: Yes, but keep them for a retention period (e.g., 7 days) for debugging and audit purposes.
