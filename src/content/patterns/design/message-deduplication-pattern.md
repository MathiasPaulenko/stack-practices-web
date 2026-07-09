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
lastUpdated: "2026-07-09"
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
- You process webhooks from third-party services that may retry on network failures
- You consume from multiple queues and need cross-queue deduplication

## When to Avoid

- **Your broker provides exactly-once delivery natively.** Kafka transactions and SQS FIFO with content-based dedup already handle this. Adding application-level dedup is redundant.
- **Messages are idempotent by nature.** If processing twice has no side effects (e.g., updating a last-seen timestamp), dedup adds overhead without value.
- **Throughput is critical and every millisecond counts.** Redis dedup adds ~0.5ms per message. For ultra-low-latency systems, rely on broker guarantees instead.
- **You cannot afford a dedup store dependency.** If Redis downtime is unacceptable and you cannot fall back to idempotent processing, reconsider the architecture.
- **Messages have no natural unique ID.** Generating content hashes for every message adds CPU overhead and may dedup incorrectly for same-payload-different-intent cases.

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

## How It Works

1. **Message arrives with unique ID**: Each message carries a deduplication key — either a producer-assigned UUID or a content hash. The consumer extracts this key before processing.
2. **Atomic check-and-set**: The consumer attempts `SET NX EX` on the dedup key in a shared store (Redis). If the key does not exist, the consumer sets it and proceeds. If it exists, the message was already processed — skip it.
3. **Process the message**: Only the consumer that successfully set the key processes the message. Concurrent consumers with the same message ID fail the `SET NX` and skip.
4. **TTL expiry**: After the configured TTL, the key expires. This prevents the store from growing indefinitely. The TTL must exceed the broker's maximum redelivery window.

The atomicity of `SET NX` is critical: without it, two consumers could both check, both see no key, and both process the same message.

## Best Practices

- **Use producer-assigned IDs over content hashes.** Content hashes dedup identical payloads, which may be wrong if the same payload represents different logical operations. Producer-assigned IDs dedup by identity, not content.
- **Log skipped duplicates.** When a consumer skips a duplicate, log the message ID and timestamp. This helps debug redelivery issues and measure duplicate rates.
- **Monitor dedup hit rate.** If 50% of messages are duplicates, something is wrong upstream — the producer is retrying too aggressively or the consumer is too slow to acknowledge.
- **Use FIFO queues when available.** SQS FIFO and Kafka partition keys provide ordering and dedup at the broker level, reducing the need for application-level dedup.
- **Graceful degradation on dedup store failure.** If Redis is down, decide between processing with idempotency or rejecting. Document the choice and alert on it.

## Real-World Examples

### Stripe Payment Webhooks

Stripe sends webhooks for payment events. Network failures cause Stripe to retry, delivering the same webhook multiple times. Stripe recommends using event IDs for deduplication: check the event ID in a store before processing. Without dedup, a single payment could trigger multiple order fulfillments.

### SQS + Lambda Order Processing

An e-commerce platform uses SQS to trigger Lambda for order processing. SQS may redeliver messages if Lambda fails to acknowledge in time. The platform uses Redis `SET NX` with the order ID as the dedup key. Duplicate deliveries are skipped, preventing double-charging or double-shipping.

### Kafka Consumer with Redis Dedup

A streaming pipeline consumes events from Kafka and writes to a database. Kafka's at-least-once delivery means the same event may be consumed twice. The consumer checks Redis before writing to the database. This provides exactly-once semantics without Kafka transactions.

## FAQ

**Q: Is deduplication the same as idempotency?**
A: No. Deduplication prevents a message from being processed twice. Idempotency means processing a message twice has the same effect as once. Both are needed: deduplication as the first line of defense, idempotency as the safety net.

**Q: Should I use content hashing or producer-assigned IDs?**
A: Producer-assigned IDs are better when the same logical message should always be deduped. Content hashing dedupes identical payloads, which may be wrong if the same payload is sent for different logical operations.

**Q: What if Redis goes down?**
A: Your consumer cannot check for duplicates. Options: (1) fail fast and retry later, (2) process anyway and rely on idempotency, (3) use a fallback store. Most teams choose option 2 with idempotent consumers.

**Q: Does Kafka support deduplication natively?**
A: Kafka supports idempotent producers (prevents duplicate messages at the producer level) and transactions (exactly-once semantics within Kafka). For cross-system exactly-once, you still need consumer-side deduplication.

**Q: How do I choose the right TTL for dedup keys?**
A: Set TTL to at least 2x your broker's maximum redelivery window. SQS retains messages up to 14 days, so use 172800 seconds (48 hours). For RabbitMQ, check the queue's message TTL and set dedup TTL higher.

**Q: Can I use a database instead of Redis for dedup?**
A: Yes. Use a table with a unique constraint on the message ID. Insert before processing; if the insert fails with a duplicate key, skip the message. This is durable and transactional but slower than Redis and adds load to the database.

**Q: How do I handle dedup with multiple consumer instances?**
A: Use a shared store (Redis, database) so all instances check the same dedup keys. In-memory sets per instance do not work — each instance has its own set and cannot see what others have processed.

**Q: What is the performance impact of dedup?**
A: Redis `SET NX EX` is sub-millisecond. The overhead is negligible compared to message processing. Database-based dedup is 5-10ms per check. For high-throughput systems, Redis is the standard choice.

**Q: How do I test deduplication?**
A: Send the same message ID twice and verify only one is processed. Send messages with different IDs and verify both are processed. Test concurrent consumers with the same message ID. Test Redis failover to verify your fallback strategy.

**Q: Should I dedup before or after processing?**
A: Before. Check the dedup key, then process, then confirm the key. If you process first and the consumer crashes before setting the key, the message is redelivered and processed twice. Use atomic `SET NX` before processing for the strongest guarantee.

**Q: What about dedup in event sourcing?**
A: Event sourcing handles dedup at the aggregate level. Each event has a unique ID. The aggregate rejects events with duplicate IDs during replay. This is built into the event store, so you do not need a separate dedup store.

**Q: Can I use SQS FIFO dedup instead of Redis?**
A: Yes. SQS FIFO queues support content-based deduplication automatically. If you produce messages with a `MessageDeduplicationId`, SQS dedupes within a 5-minute window. This eliminates the need for Redis but limits throughput to 300 TPS.

**Q: How do I handle dedup with Kafka consumer groups?**
A: Kafka consumer groups rebalance partitions when consumers join or leave. During rebalancing, a consumer may reprocess messages from the last committed offset. Use Redis dedup with the topic-partition-offset as the key, or use Kafka transactions for exactly-once within Kafka.

**Q: What is the relationship between dedup and exactly-once semantics?**
A: Exactly-once requires three components: (1) idempotent producers (no duplicate messages at the source), (2) atomic consumer processing (process + commit offset in one transaction), (3) dedup as a safety net. Dedup alone does not guarantee exactly-once — it is one layer in the stack.

**Q: How do I clean up expired dedup keys?**
A: Redis TTL handles this automatically — keys expire after the configured time. For database-based dedup, run a periodic cleanup job that deletes rows older than the redelivery window. Do not delete keys manually — let TTL or scheduled jobs handle it.

**Q: Can I use dedup with batch consumers?**
A: Yes. Check all message IDs in the batch before processing any. Use Redis `MSETNX` for atomic multi-key check. Process only messages that were not duplicates. Acknowledge the entire batch only after all non-duplicate messages are processed.

**Q: How do I handle dedup across different environments (dev/staging/prod)?**
A: Use separate Redis namespaces or databases for each environment. A dedup key in dev should not block processing in prod. Prefix keys with the environment name: `dedup:prod:msg-001` vs `dedup:dev:msg-001`.

**Q: What is the cost of dedup at scale?**
A: Redis on a c5.large instance handles ~100,000 SET NX operations per second. For 10,000 messages/s, the dedup overhead is negligible. Memory usage: each key is ~50 bytes + overhead. 1M dedup keys per day = ~50MB. Set TTL to 48 hours to cap memory at ~100MB.

**Q: Should I use dedup for internal service-to-service communication?**
A: If both services are under your control and use a reliable transport (gRPC with retries, Kafka), dedup may be unnecessary. Use it when the producer is external (webhooks, third-party APIs) or when the broker does not guarantee exactly-once.

**Q: How do I handle dedup with AWS Lambda?**
A: Lambda may invoke multiple times for the same SQS message if the function times out or fails. Use Redis `SET NX` with the SQS message ID as the dedup key. Alternatively, use SQS FIFO with content-based deduplication to let AWS handle it. For DynamoDB-based dedup, use conditional writes with `attribute_not_exists(messageId)`.

**Q: What is the difference between at-least-once and at-most-once delivery?**
A: At-least-once means every message is delivered at least once, but may be delivered multiple times (requires dedup). At-most-once means every message is delivered zero or one times (messages may be lost). Exactly-once means every message is delivered exactly once (hardest to achieve). Most brokers provide at-least-once.

**Q: How do I handle dedup with HTTP idempotency keys?**
A: Use the `Idempotency-Key` HTTP header as the dedup key. Store it in Redis before processing the request. If a retry arrives with the same key, return the cached response instead of reprocessing. Stripe uses this pattern for payment APIs. The TTL should match the client's retry window.
