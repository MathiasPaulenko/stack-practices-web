---
contentType: patterns
slug: message-deduplication-pattern
title: "Message Deduplication Pattern"
description: "Prevent duplicate processing by tracking message IDs with idempotency keys. Consumers check a store before processing to skip messages already handled."
metaDescription: "Prevent duplicate message processing with idempotency keys. Track message IDs in a store and skip already-handled messages in consumers."
difficulty: intermediate
topics:
  - messaging
  - architecture
tags:
  - message-deduplication
  - pattern
  - design-pattern
  - idempotency
  - exactly-once
  - deduplication
  - message-queue
relatedResources:
  - /patterns/design/message-queue-load-leveling-pattern
  - /patterns/design/dead-letter-channel-pattern
  - /patterns/design/publish-subscribe-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Prevent duplicate message processing with idempotency keys. Track message IDs in a store and skip already-handled messages in consumers."
  keywords:
    - message deduplication pattern
    - idempotency key
    - exactly once processing
    - pattern design
---

## Overview

Message brokers guarantee at-least-once delivery, which means consumers may receive the same message more than once. Network retries, consumer crashes during processing, and broker redelivery all cause duplicates. Without deduplication, a payment might be processed twice or a notification sent multiple times.

The Message Deduplication pattern tracks message IDs in a store. Before processing, the consumer checks if the message ID has already been handled. If yes, it skips processing. If no, it processes the message and records the ID.

## When to Use

- Your message broker provides at-least-once delivery (most do: SQS, RabbitMQ, Kafka)
- Processing a message twice causes side effects (payments, emails, inventory changes)
- You need exactly-once processing semantics without a broker that supports it natively
- Consumer crashes happen and messages get redelivered

## Solution

### Python (Redis + SQS)

```python
import redis
import json
import hashlib

r = redis.Redis(host="localhost", port=6379, db=0)
DEDUP_TTL = 86400  # 24 hours

def process_message(message_id, payload):
    # Check if already processed
    dedup_key = f"dedup:{message_id}"
    if r.exists(dedup_key):
        print(f"Skipping duplicate message {message_id}")
        return

    # Process the message
    result = handle_order(payload)

    # Mark as processed with TTL
    r.setex(dedup_key, DEDUP_TTL, "1")
    print(f"Processed message {message_id}")

def handle_order(payload):
    order = json.loads(payload)
    print(f"Charging payment for order {order['order_id']}")
    return {"status": "charged"}

# Simulate duplicate delivery
process_message("msg-001", '{"order_id": 42}')
process_message("msg-001", '{"order_id": 42}')  # Skipped
```

### JavaScript (Redis + BullMQ)

```javascript
import Redis from "ioredis";
import { Worker } from "bullmq";

const redis = new Redis({ host: "localhost", port: 6379 });
const DEDUP_TTL = 86400; // 24 hours

async function isDuplicate(messageId) {
  const key = `dedup:${messageId}`;
  const result = await redis.set(key, "1", "EX", DEDUP_TTL, "NX");
  // result is "OK" if the key was set (first time), null if it already existed
  return result === null;
}

const worker = new Worker(
  "orders",
  async (job) => {
    const messageId = job.data.messageId;
    const payload = job.data.payload;

    if (await isDuplicate(messageId)) {
      console.log(`Skipping duplicate message ${messageId}`);
      return { status: "skipped" };
    }

    // Process the message
    console.log(`Charging payment for order ${payload.orderId}`);
    return { status: "processed" };
  },
  { connection: { host: "localhost", port: 6379 } }
);
```

### Java (Redis + Spring)

```java
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import java.util.concurrent.TimeUnit;

@Component
public class DeduplicatingConsumer {

    private final StringRedisTemplate redis;
    private static final int DEDUP_TTL = 86400; // 24 hours

    public DeduplicatingConsumer(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public void processMessage(String messageId, String payload) {
        String dedupKey = "dedup:" + messageId;

        // Atomic check-and-set: returns true if key was set (first time)
        Boolean wasSet = redis.opsForValue()
            .setIfAbsent(dedupKey, "1", DEDUP_TTL, TimeUnit.SECONDS);

        if (Boolean.FALSE.equals(wasSet)) {
            System.out.println("Skipping duplicate message " + messageId);
            return;
        }

        // Process the message
        System.out.println("Processing message " + messageId + ": " + payload);
        handleOrder(payload);
    }

    private void handleOrder(String payload) {
        // Business logic here
    }
}
```

## Explanation

The pattern uses an atomic check-and-set operation (Redis `SET NX EX`) to determine if a message has been processed. The operation is atomic: only one consumer can set the key, so concurrent consumers processing the same message will not both proceed.

The TTL on the deduplication key prevents the store from growing indefinitely. After the TTL expires, the same message ID could be processed again. Choose a TTL longer than your maximum redelivery window (typically 24 hours for SQS, or the queue's retention period).

For the deduplication to work, each message must carry a unique identifier. This can be a content hash (for deduplication based on payload) or a producer-assigned ID (for deduplication based on identity).

## Variants

| Variant | Store | Use Case | Tradeoff |
|---------|-------|----------|----------|
| **Redis SET NX** | Redis | Fast, shared across consumers | External dependency, TTL-based expiry |
| **Database Unique Constraint** | SQL DB | Durable, transactional | Slower, adds DB load |
| **Content Hashing** | Any store | Dedup by payload content | Same payload always deduped, even if different intent |
| **Broker Native** | SQS FIFO | Built-in dedup | Only with FIFO queues, limited throughput |
| **In-Memory Set** | Process memory | Single consumer, fast | Lost on restart, not shared across instances |

## What Works

- Use atomic check-and-set (Redis `SET NX EX`) to avoid race conditions between concurrent consumers
- Set TTL longer than your broker's redelivery window
- Use content hashes when messages lack explicit IDs
- Make consumers idempotent as a second layer of defense: even if dedup fails, processing twice should not cause harm
- Log skipped duplicates for debugging and monitoring
- Use FIFO queues with content-based deduplication when the broker supports it (SQS FIFO)

## Common Mistakes

- **Check-then-set without atomicity**: Two consumers check simultaneously, both see no key, both process. Always use atomic `SET NX`.
- **TTL too short**: If the TTL expires before the broker stops redelivering, duplicates slip through. Set TTL to at least 2x the redelivery window.
- **Using process memory for dedup**: Lost on restart, not shared across consumer instances. Use an external store.
- **Not handling dedup store failures**: If Redis is down, dedup fails. Decide whether to process (risk duplicates) or reject (lose messages).
- **Dedup key based on mutable fields**: If the key includes fields that change, the same logical message gets different keys and is processed twice.

## FAQ

### Is deduplication the same as idempotency?

No. Deduplication prevents a message from being processed twice. Idempotency means processing a message twice has the same effect as once. Both are needed: deduplication as the first line of defense, idempotency as the safety net.

### Should I use content hashing or producer-assigned IDs?

Producer-assigned IDs are better when the same logical message should always be deduped. Content hashing dedupes identical payloads, which may be wrong if the same payload is sent for different logical operations.

### What if Redis goes down?

Your consumer cannot check for duplicates. Options: (1) fail fast and retry later, (2) process anyway and rely on idempotency, (3) use a fallback store. Most teams choose option 2 with idempotent consumers.

### Does Kafka support deduplication natively?

Kafka supports idempotent producers (prevents duplicate messages at the producer level) and transactions (exactly-once semantics within Kafka). For cross-system exactly-once, you still need consumer-side deduplication.
