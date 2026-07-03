---
contentType: patterns
slug: idempotent-consumer-pattern
title: "Idempotent Consumer Pattern"
description: "Process messages from a queue exactly once regardless of duplicates by using idempotent operations, unique identifiers, and deduplication strategies at the consumer level."
metaDescription: "Learn the Idempotent Consumer Pattern for exactly-once message processing. Examples in Python, Java, and JavaScript with deduplication and idempotency keys."
difficulty: intermediate
topics:
  - design
  - architecture
  - messaging
tags:
  - idempotent-consumer
  - pattern
  - design-pattern
  - messaging
  - kafka
  - deduplication
  - idempotency
  - event-driven
relatedResources:
  - /patterns/design/event-sourcing-pattern
  - /patterns/design/saga-pattern
  - /patterns/design/distributed-lock-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Idempotent Consumer Pattern for exactly-once message processing. Examples in Python, Java, and JavaScript with deduplication and idempotency keys."
  keywords:
    - idempotent consumer
    - design pattern
    - exactly once
    - messaging
    - kafka
    - deduplication
    - idempotency
    - event driven
---

# Idempotent Consumer Pattern

## Overview

The Idempotent Consumer Pattern ensures messages from a queue or event stream are processed exactly once, even if they are delivered multiple times due to network retries, consumer failures, or at-least-once delivery guarantees. Instead of relying on the messaging system for exactly-once semantics, the consumer itself is designed to be idempotent — processing the same message multiple times produces the same end result as processing it once.

Idempotency is achieved by tracking processed messages using unique identifiers, performing upserts instead of inserts, or using conditional updates that are safe to repeat. This pattern is essential in distributed systems where message brokers like Kafka, RabbitMQ, SQS, or Azure Service Bus only guarantee at-least-once delivery.

## When to Use

- Consuming messages from a queue or event stream where duplicates are possible
- Payment processing, order fulfillment, or inventory updates where duplicates would cause over-charging, double-shipping, or stock inconsistencies
- Integrating with third-party systems via webhooks or callbacks where retries are standard
- Using Kafka, SQS, or similar systems that only provide at-least-once delivery
- Implementing event-driven microservices where each event must be handled exactly once

## When to Avoid

- When the messaging system natively supports exactly-once semantics (e.g., Kafka transactions + EOS, Azure Service Bus sessions with de-duplication)
- For read-only operations where duplicates cause no harm
- When the overhead of deduplication tracking exceeds the cost of handling occasional duplicates
- Simple fire-and-forget notifications where duplicate delivery is acceptable

## Solution

### Python (Kafka Consumer with Deduplication)

```python
import json
import sqlite3
from datetime import datetime
from kafka import KafkaConsumer
from kafka.errors import KafkaError

class IdempotentConsumer:
    """Process Kafka messages exactly once using idempotent operations"""

    def __init__(self, bootstrap_servers, topic, db_path="processed.db"):
        self.consumer = KafkaConsumer(
            topic,
            bootstrap_servers=bootstrap_servers,
            auto_offset_reset='earliest',
            enable_auto_commit=False,
            group_id='idempotent-group'
        )
        self.db = sqlite3.connect(db_path)
        self._init_table()

    def _init_table(self):
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS processed (
                message_id TEXT PRIMARY KEY,
                processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.db.commit()

    def is_processed(self, message_id: str) -> bool:
        cursor = self.db.execute(
            "SELECT 1 FROM processed WHERE message_id = ?",
            (message_id,)
        )
        return cursor.fetchone() is not None

    def mark_processed(self, message_id: str):
        self.db.execute(
            "INSERT INTO processed (message_id) VALUES (?)",
            (message_id,)
        )
        self.db.commit()

    def process_message(self, message):
        """Idempotent processing: safe to retry"""
        event = json.loads(message.value)
        message_id = event['id']

        # Deduplication check
        if self.is_processed(message_id):
            print(f"Skipping duplicate: {message_id}")
            return

        # Idempotent operation: upsert into target database
        self._upsert_order(
            order_id=event['order_id'],
            amount=event['amount'],
            status=event['status']
        )

        # Mark as processed (after successful operation)
        self.mark_processed(message_id)

    def _upsert_order(self, order_id: str, amount: float, status: str):
        """Upsert ensures idempotency — safe to retry"""
        # In production, this connects to your application database
        print(f"Upserting order {order_id}: ${amount} ({status})")

    def run(self):
        for message in self.consumer:
            try:
                self.process_message(message)
                self.consumer.commit()
            except Exception as e:
                print(f"Error processing {message.offset}: {e}")
                # Don't commit — message will be redelivered
                continue

if __name__ == "__main__":
    consumer = IdempotentConsumer(
        bootstrap_servers=['localhost:9092'],
        topic='orders'
    )
    consumer.run()
```

### Java (Spring Kafka with Idempotency)

```java
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.concurrent.ConcurrentHashMap;

@Service
public class IdempotentOrderConsumer {

    private final ProcessedMessageRepository repository;
    private final OrderService orderService;

    // In-memory cache for fast deduplication (backed by database)
    private final Set<String> processedIds = ConcurrentHashMap.newKeySet();

    public IdempotentOrderConsumer(ProcessedMessageRepository repository,
                                   OrderService orderService) {
        this.repository = repository;
        this.orderService = orderService;
        // Load recent processed IDs into memory
        processedIds.addAll(repository.findRecentIds());
    }

    @KafkaListener(topics = "orders", groupId = "order-group")
    @Transactional
    public void consumeOrderEvent(
            OrderEvent event,
            @Header(KafkaHeaders.RECEIVED_MESSAGE_KEY) String messageKey) {

        String eventId = event.getEventId();

        // Fast in-memory check
        if (processedIds.contains(eventId)) {
            return;
        }

        // Database check (for events not in memory cache)
        if (repository.existsByEventId(eventId)) {
            processedIds.add(eventId);
            return;
        }

        // Idempotent business operation
        orderService.upsertOrder(
            event.getOrderId(),
            event.getAmount(),
            event.getStatus()
        );

        // Record event as processed
        repository.save(new ProcessedMessage(eventId));
        processedIds.add(eventId);
    }
}

// Entity to track processed messages
@Entity
public class ProcessedMessage {
    @Id
    private String eventId;
    private Instant processedAt = Instant.now();

    // constructor, getters...
}
```

### JavaScript (Node.js with Redis Deduplication)

```javascript
const { Kafka } = require('kafkajs');
const Redis = require('ioredis');

class IdempotentConsumer {
    constructor() {
        this.kafka = new Kafka({ brokers: ['localhost:9092'] });
        this.consumer = this.kafka.consumer({ groupId: 'order-group' });
        this.redis = new Redis();
    }

    async start() {
        await this.consumer.connect();
        await this.consumer.subscribe({ topic: 'orders', fromBeginning: false });

        await this.consumer.run({
            eachMessage: async ({ message }) => {
                const event = JSON.parse(message.value.toString());
                const eventId = event.id;

                // Redis deduplication with TTL
                const isProcessed = await this.redis.get(`processed:${eventId}`);
                if (isProcessed) {
                    console.log(`Skipping duplicate: ${eventId}`);
                    return;
                }

                try {
                    // Idempotent operation
                    await this.upsertOrder(event);

                    // Mark as processed (7-day TTL)
                    await this.redis.setex(`processed:${eventId}`, 604800, '1');
                } catch (error) {
                    console.error(`Failed to process ${eventId}:`, error);
                    throw error; // Triggers redelivery
                }
            }
        });
    }

    async upsertOrder(event) {
        // Idempotent database operation
        await db.query(`
            INSERT INTO orders (id, amount, status, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (id) DO UPDATE SET
                amount = EXCLUDED.amount,
                status = EXCLUDED.status,
                updated_at = NOW()
        `, [event.order_id, event.amount, event.status]);
    }
}

// Alternative: using idempotency keys for API calls
class IdempotentAPIClient {
    constructor(apiClient, idempotencyStore) {
        this.api = apiClient;
        this.store = idempotencyStore;
    }

    async chargePayment(paymentRequest) {
        const idempotencyKey = paymentRequest.orderId;

        // Check if already processed
        const cached = await this.store.get(idempotencyKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Execute with idempotency key header
        const result = await this.api.post('/charges', paymentRequest, {
            headers: { 'Idempotency-Key': idempotencyKey }
        });

        // Cache response for 24 hours
        await this.store.setex(idempotencyKey, 86400, JSON.stringify(result));
        return result;
    }
}
```

## Explanation

Idempotent consumers use a **deduplication window** to track processed messages. The window size depends on your delivery guarantees — for Kafka, it should exceed `retention.ms` of the topic. The key mechanism is:

1. **Extract a unique identifier** from each message (event ID, message key, or deterministic hash of payload + timestamp)
2. **Check the deduplication store** before processing (database table, Redis cache, or Bloom filter)
3. **Perform an idempotent operation** (upsert, conditional update, or state machine transition that is safe to repeat)
4. **Record the message as processed** only after successful completion
5. **Acknowledge/commit the offset** after recording success

If the consumer crashes between step 3 and 4, the message will be redelivered. Because step 3 is idempotent, reprocessing causes no harm.

## Variants

| Variant | Strategy | Best For |
|---------|----------|----------|
| **Database deduplication** | `processed_messages` table with unique constraint | Strong consistency required, moderate throughput |
| **Redis deduplication** | SETEX with TTL on processed IDs | High throughput, short deduplication windows |
| **Bloom filter** | Probabilistic membership check | Very high throughput, acceptable false positives |
| **Idempotency keys** | Client-generated key for API calls | Third-party integrations, payment APIs |
| **Natural idempotency** | Operations that are inherently safe to repeat | Update if newer timestamp, max() aggregations |

## What Works

- **Use deterministic message IDs.** Prefer event IDs assigned at creation over consumer-generated hashes.
- **Make the business operation idempotent.** Deduplication is a safety net — the operation itself should be safe to retry.
- **TTL your deduplication store.** Don't store processed IDs forever — size to your max redelivery window.
- **Separate deduplication from business logic.** Keep the deduplication layer independent for easier testing.
- **Monitor for duplicates.** Log skipped duplicates to detect broker or producer misconfigurations.

## Common Mistakes

- **Storing "processed" before the operation.** If the consumer crashes, the message is marked processed but never executed.
- **Non-deterministic message IDs.** Using `UUID.randomUUID()` on each retry defeats deduplication.
- **Ignoring ordering.** Deduplication with Kafka must account for partition ordering — an older event may arrive after a newer one.
- **Database transactions without isolation.** Two parallel consumers processing the same message may both pass the dedup check before either records success.
- **Infinite deduplication windows.** Storing every processed ID forever creates an unbounded table.

## Real-World Examples

### Stripe

Stripe's API uses **idempotency keys** for all mutation requests. Clients send a unique key with each request; Stripe stores the request/response pair for 24 hours. Duplicate requests with the same key return the cached response instead of re-executing the operation.

### Amazon SQS FIFO

SQS FIFO queues provide exactly-once processing via **deduplication IDs**. When a message is sent, a 5-minute deduplication interval ensures duplicate sends with the same ID are discarded by the queue itself — no consumer-side logic required.

### Uber's Kafka Consumers

Uber's Kafka consumer framework uses a **dual-write pattern**: consumers write processed offsets to both Kafka and a local Cassandra deduplication table. If a consumer restarts, it queries Cassandra to find its last processed position, preventing duplicate processing during rebalancing.

## Frequently Asked Questions

**Q: How is this different from Kafka's exactly-once semantics (EOS)?**
A: EOS provides exactly-once processing within Kafka Streams between Kafka topics. The Idempotent Consumer Pattern works for any consumer writing to any external system (database, API, file) and doesn't require Kafka transactions.

**Q: What deduplication window should I use?**
A: At minimum, longer than your max message redelivery window. For Kafka: `max(retention.ms, consumer_timeout)`. Typical: 7 days for business events, 24 hours for webhooks, 5 minutes for high-frequency metrics.

**Q: Should I use the database or Redis for deduplication?**
A: Redis for high-throughput, short windows. Database for strong consistency, audit trails, and longer windows. Many systems use Redis as a hot cache with database as the source of truth.

**Q: What if I can't modify the producer to add message IDs?**
A: Generate a deterministic ID from the message content: `hash(topic + partition + offset)` or `hash(payload + timestamp)`. Be careful — payload changes between retries invalidate the dedup.

**Q: How do I handle out-of-order messages with deduplication?**
A: Include a timestamp or sequence number in your deduplication logic. Only process if the message is newer than the last processed one for the same entity.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
