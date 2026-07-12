---


contentType: patterns
slug: inbox-pattern
title: "Inbox Pattern"
description: "Use a dedicated inbox table or queue to record incoming events or requests, ensuring reliable delivery, deduplication, and idempotent processing even when downstream systems fail."
metaDescription: "Learn the Inbox Pattern for idempotent event processing. Examples in Python, Java and JavaScript with inbox tables, deduplication, and at-least-once delivery."
difficulty: intermediate
topics:
  - design
  - messaging
  - architecture
tags:
  - inbox
  - pattern
  - design-pattern
  - messaging
  - idempotency
  - reliability
  - event-driven
relatedResources:
  - /patterns/outbox-pattern
  - /patterns/saga-pattern
  - /patterns/event-sourcing-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Inbox Pattern for idempotent event processing. Examples in Python, Java and JavaScript with inbox tables, deduplication, and at-least-once delivery."
  keywords:
    - inbox pattern
    - design pattern
    - idempotency
    - reliability
    - event driven


---

# Inbox Pattern

## Overview

The Inbox Pattern uses a dedicated inbox table or queue to record incoming events, webhooks, or requests before processing them. Instead of handling a message directly upon receipt, the consumer first persists it to an inbox with a unique identifier, then processes it in a background job. If processing fails, the message remains in the inbox for retry; if the same message arrives twice, deduplication prevents double processing.

This pattern is the consumer-side counterpart to the Outbox Pattern. While Outbox ensures reliable publishing, Inbox ensures reliable consumption. Together they provide end-to-end exactly-once processing semantics in distributed systems.

Common use cases include processing payment webhooks, handling external event streams, and integrating with third-party APIs that may redeliver messages.

## When to Use


- For alternatives, see [Idempotent Consumer Pattern](/patterns/idempotent-consumer-pattern/).

Use the Inbox Pattern when:
- You need to process external events reliably with at-least-once delivery guarantees
- Duplicate message delivery is possible and must be prevented
- Processing a message involves multiple steps that should be atomic
- You need visibility into pending, failed, and processed messages

## When to Avoid

- Message volume is extremely high and a database write per message is too expensive
- The message broker already provides exactly-once semantics natively
- The consumer is a simple stateless service with no durability requirements
- Adding a database dependency introduces unacceptable latency

## Solution

### Python

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List
import hashlib
import json
import sqlite3

@dataclass
class InboxMessage:
    id: int
    message_id: str
    payload: str
    status: str  # 'pending', 'processing', 'completed', 'failed'
    created_at: datetime
    processed_at: Optional[datetime] = None
    retry_count: int = 0

class InboxProcessor:
    """Inbox pattern implementation with SQLite"""
    def __init__(self, db_path: str = "inbox.db"):
        self.conn = sqlite3.connect(db_path)
        self._create_table()

    def _create_table(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS inbox (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id TEXT UNIQUE NOT NULL,
                payload TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                processed_at TIMESTAMP,
                retry_count INTEGER DEFAULT 0
            )
        """)
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_status ON inbox(status)")
        self.conn.commit()

    def receive(self, raw_payload: dict) -> bool:
        """Store incoming message in inbox; returns False if duplicate"""
        message_id = self._generate_message_id(raw_payload)
        payload_json = json.dumps(raw_payload)

        try:
            self.conn.execute(
                "INSERT INTO inbox (message_id, payload) VALUES (?, ?)",
                (message_id, payload_json)
            )
            self.conn.commit()
            return True
        except sqlite3.IntegrityError:
            # Duplicate message_id — already processed or pending
            return False

    def _generate_message_id(self, payload: dict) -> str:
        """Generate deterministic message ID from payload + source ID"""
        content = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def process_pending(self, processor_func):
        """Fetch and process pending messages with retries"""
        cursor = self.conn.execute(
            "SELECT id, message_id, payload, retry_count FROM inbox WHERE status = 'pending'"
        )
        rows = cursor.fetchall()

        for row in rows:
            msg_id, message_id, payload, retries = row
            self.conn.execute(
                "UPDATE inbox SET status = 'processing' WHERE id = ?", (msg_id,)
            )
            self.conn.commit()

            try:
                result = processor_func(json.loads(payload))
                self.conn.execute(
                    """UPDATE inbox SET status = 'completed', processed_at = CURRENT_TIMESTAMP
                       WHERE id = ?""", (msg_id,)
                )
                self.conn.commit()
                print(f"Processed {message_id}: {result}")
            except Exception as e:
                new_retries = retries + 1
                status = 'failed' if new_retries >= 3 else 'pending'
                self.conn.execute(
                    """UPDATE inbox SET status = ?, retry_count = ? WHERE id = ?""",
                    (status, new_retries, msg_id)
                )
                self.conn.commit()
                print(f"Failed {message_id} (retry {new_retries}): {e}")

    def get_stats(self) -> dict:
        cursor = self.conn.execute(
            "SELECT status, COUNT(*) FROM inbox GROUP BY status"
        )
        return {row[0]: row[1] for row in cursor.fetchall()}


# Usage
def process_payment(payload: dict) -> str:
    order_id = payload["order_id"]
    amount = payload["amount"]
    # Process payment...
    return f"Payment of ${amount} for order {order_id} processed"

inbox = InboxProcessor()

# Simulate receiving webhook
event1 = {"order_id": "ORD-001", "amount": 99.99, "event": "payment.received"}
event2 = {"order_id": "ORD-001", "amount": 99.99, "event": "payment.received"}  # duplicate

print(f"Received event1: {inbox.receive(event1)}")  # True
print(f"Received event2: {inbox.receive(event2)}")  # False (duplicate)

# Process pending messages
inbox.process_pending(process_payment)
print(inbox.get_stats())
```

### Java

```java
import java.sql.*;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;

public class InboxProcessor {
    private final Connection conn;
    private final ObjectMapper mapper = new ObjectMapper();

    public InboxProcessor(String dbUrl) throws SQLException {
        this.conn = DriverManager.getConnection(dbUrl);
        createTable();
    }

    private void createTable() throws SQLException {
        conn.prepareStatement("""
            CREATE TABLE IF NOT EXISTS inbox (
                id SERIAL PRIMARY KEY,
                message_id VARCHAR(32) UNIQUE NOT NULL,
                payload TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                processed_at TIMESTAMP,
                retry_count INT DEFAULT 0
            )
        """).execute();
        conn.prepareStatement("CREATE INDEX IF NOT EXISTS idx_status ON inbox(status)").execute();
    }

    public boolean receive(Map<String, Object> payload) throws SQLException {
        String messageId = generateMessageId(payload);
        String payloadJson;
        try {
            payloadJson = mapper.writeValueAsString(payload);
        } catch (Exception e) { throw new RuntimeException(e); }

        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO inbox (message_id, payload) VALUES (?, ?)")) {
            ps.setString(1, messageId);
            ps.setString(2, payloadJson);
            ps.executeUpdate();
            return true;
        } catch (SQLIntegrityConstraintViolationException e) {
            return false; // Duplicate
        }
    }

    private String generateMessageId(Map<String, Object> payload) {
        // Simplified: use a hash of sorted JSON in production
        return UUID.nameUUIDFromBytes(payload.toString().getBytes()).toString().substring(0, 16);
    }

    public void processPending(MessageProcessor processor) throws SQLException {
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(
                 "SELECT id, message_id, payload, retry_count FROM inbox WHERE status = 'pending'")) {

            while (rs.next()) {
                int id = rs.getInt("id");
                String messageId = rs.getString("message_id");
                String payload = rs.getString("payload");
                int retries = rs.getInt("retry_count");

                markProcessing(id);
                try {
                    Map<String, Object> data = mapper.readValue(payload, Map.class);
                    String result = processor.process(data);
                    markCompleted(id);
                    System.out.println("Processed " + messageId + ": " + result);
                } catch (Exception e) {
                    int newRetries = retries + 1;
                    String status = newRetries >= 3 ? "failed" : "pending";
                    markFailed(id, status, newRetries);
                    System.out.println("Failed " + messageId + " (retry " + newRetries + "): " + e.getMessage());
                }
            }
        }
    }

    private void markProcessing(int id) throws SQLException {
        var ps = conn.prepareStatement("UPDATE inbox SET status = 'processing' WHERE id = ?");
        ps.setInt(1, id); ps.executeUpdate();
    }

    private void markCompleted(int id) throws SQLException {
        var ps = conn.prepareStatement(
            "UPDATE inbox SET status = 'completed', processed_at = CURRENT_TIMESTAMP WHERE id = ?");
        ps.setInt(1, id); ps.executeUpdate();
    }

    private void markFailed(int id, String status, int retries) throws SQLException {
        var ps = conn.prepareStatement("UPDATE inbox SET status = ?, retry_count = ? WHERE id = ?");
        ps.setString(1, status); ps.setInt(2, retries); ps.setInt(3, id); ps.executeUpdate();
    }
}

interface MessageProcessor {
    String process(Map<String, Object> payload);
}
```

### JavaScript

```javascript
const crypto = require('crypto');

class InboxProcessor {
  constructor(db) {
    this.db = db; // Assumes a SQLite/PostgreSQL wrapper with async methods
  }

  async init() {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS inbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT UNIQUE NOT NULL,
        payload TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME,
        retry_count INTEGER DEFAULT 0
      )
    `);
    await this.db.exec(`CREATE INDEX IF NOT EXISTS idx_status ON inbox(status)`);
  }

  generateMessageId(payload) {
    const content = JSON.stringify(payload, Object.keys(payload).sort());
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  async receive(payload) {
    const messageId = this.generateMessageId(payload);
    const payloadJson = JSON.stringify(payload);

    try {
      await this.db.run(
        'INSERT INTO inbox (message_id, payload) VALUES (?, ?)',
        [messageId, payloadJson]
      );
      return true;
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return false; // Duplicate
      }
      throw err;
    }
  }

  async processPending(processorFunc) {
    const rows = await this.db.all(
      "SELECT id, message_id, payload, retry_count FROM inbox WHERE status = 'pending'"
    );

    for (const row of rows) {
      await this.db.run("UPDATE inbox SET status = 'processing' WHERE id = ?", [row.id]);

      try {
        const payload = JSON.parse(row.payload);
        const result = await processorFunc(payload);
        await this.db.run(
          "UPDATE inbox SET status = 'completed', processed_at = CURRENT_TIMESTAMP WHERE id = ?",
          [row.id]
        );
        console.log(`Processed ${row.message_id}: ${result}`);
      } catch (err) {
        const newRetries = row.retry_count + 1;
        const status = newRetries >= 3 ? 'failed' : 'pending';
        await this.db.run(
          'UPDATE inbox SET status = ?, retry_count = ? WHERE id = ?',
          [status, newRetries, row.id]
        );
        console.log(`Failed ${row.message_id} (retry ${newRetries}): ${err.message}`);
      }
    }
  }

  async getStats() {
    const rows = await this.db.all('SELECT status, COUNT(*) as count FROM inbox GROUP BY status');
    return Object.fromEntries(rows.map(r => [r.status, r.count]));
  }
}

// Usage
async function main() {
  const sqlite3 = require('sqlite3').verbose();
  const { open } = require('sqlite');
  const db = await open({ filename: 'inbox.db', driver: sqlite3.Database });

  const inbox = new InboxProcessor(db);
  await inbox.init();

  const event1 = { order_id: 'ORD-001', amount: 99.99, event: 'payment.received' };
  const event2 = { order_id: 'ORD-001', amount: 99.99, event: 'payment.received' };

  console.log('Received event1:', await inbox.receive(event1)); // true
  console.log('Received event2:', await inbox.receive(event2)); // false

  await inbox.processPending(async (payload) => {
    return `Payment of $${payload.amount} for order ${payload.order_id} processed`;
  });

  console.log(await inbox.getStats());
}

main().catch(console.error);
```

## Explanation

The Inbox Pattern works in three stages:

1. **Receive**: Incoming messages are immediately persisted to the inbox with a deterministic `message_id`. This makes receipt idempotent — duplicates are rejected by the unique constraint.
2. **Process**: A background worker polls for `pending` messages, marks them as `processing`, and invokes the business logic. If processing succeeds, the message becomes `completed`; if it fails, it returns to `pending` for retry.
3. **Monitor**: The inbox table works as an audit log and operations dashboard, showing pending, failed, and completed message counts.

## Variants

| Variant | Storage | Characteristics |
|---------|---------|-----------------|
| **Database Inbox** | SQL table | ACID guarantees, easy querying, higher latency |
| **Redis Inbox** | Sorted set / stream | Lower latency, limited durability, good for high throughput |
| **Message Queue** | SQS, RabbitMQ | Native redelivery, may need external deduplication |
| **File-based** | Append-only log | Simple, no DB dependency, harder to query |

## What Works

- **Use deterministic message IDs.** Hash the payload + source identifier so duplicates are naturally deduplicated.
- **Keep processing idempotent.** Even with deduplication, design business logic to handle retries safely.
- **Implement exponential backoff.** Failed messages should not retry immediately; add a `next_retry_at` column.
- **Archive old messages.** Move completed messages to a history table to keep the inbox small and fast.
- **Monitor dead letters.** Messages that exhaust retries should alert operators, not disappear silently.

## Common Mistakes

- **Processing before persisting.** If the consumer crashes after handling the message but before acknowledging, the message is lost.
- **Non-deterministic message IDs.** Random UUIDs per delivery prevent deduplication of redelivered messages.
- **Infinite retry loops.** Without a max retry limit, a poison message blocks the queue forever.
- **No visibility timeout.** Multiple workers may pick up the same `processing` message simultaneously.
- **Large payloads in the inbox.** Store references to blob storage for payloads > 1KB; keep the inbox table lean.

## Real-World Examples

### Payment Webhook Processing

Stripe and PayPal webhooks may be delivered multiple times. The inbox pattern stores each webhook event, deduplicates by event ID, and processes payment confirmation exactly once.

### CQRS Event Consumers

In CQRS architectures, read models consume domain events from a bus. An inbox ensures events are applied reliably even if the read model database is temporarily unavailable.

### Third-Party API Integration

When polling external APIs for changes, an inbox stores the raw API response before transformation. This decouples fetching from processing and provides a replay log for debugging.

## Frequently Asked Questions

**Q: What is the difference between Inbox and Outbox?**
A: Inbox handles incoming messages reliably. Outbox handles outgoing messages reliably. Inbox prevents duplicate consumption; Outbox prevents lost publications.

**Q: Can I use a message queue instead of a database inbox?**
A: Message queues handle delivery but not deduplication natively (unless exactly-once is supported). An inbox adds the deduplication and audit layer on top of at-least-once delivery.

**Q: How do I handle message ordering?**
A: The inbox preserves insertion order if messages are processed sequentially by ID. For strict ordering, use a single worker per partition and process in sequence.

**Q: What about very high throughput?**
A: For >10K msg/s, consider Redis Streams or Kafka with idempotent consumers. Database inboxes excel at moderate volumes where queryability and ACID matter.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
