---
contentType: recipes
slug: message-idempotency
title: "Message Processing Idempotency"
description: "Design idempotent message processors that safely handle duplicate deliveries without side effects in async and event-driven systems."
metaDescription: "Idempotent message processing: deduplication strategies, idempotency keys, exactly-once semantics, and safe handling of duplicate deliveries."
difficulty: advanced
topics:
  - messaging
tags:
  - messaging
  - distributed-systems
  - architecture
relatedResources:
  - /recipes/event-driven-microservices
  - /recipes/dead-letter-queue
  - /recipes/kafka-event-streaming
  - /recipes/rabbitmq-task-queue
  - /guides/microservices-architecture-guide
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Idempotent message processing: deduplication strategies, idempotency keys, exactly-once semantics, and safe handling of duplicate deliveries."
  keywords:
    - message-idempotency
    - messaging
    - distributed-systems
    - architecture
---
## Overview

Idempotency ensures that processing the same message multiple times produces the same result as processing it once. In [async systems](/guides/architecture/event-driven-architecture-guide) where at-least-once delivery is the default, duplicate messages are inevitable — [network retries](/recipes/architecture/retry-backoff), consumer rebalances, and producer retries all create duplicates. Without idempotency, customers get charged twice, inventory gets decremented twice, and emails get sent twice.

## When to Use

Use this resource when:
- Using message brokers that guarantee at-least-once delivery (Kafka, RabbitMQ, SQS)
- Producers retry failed publishes, creating duplicate messages
- Consumer groups rebalance and reprocess messages from earlier offsets
- Exactly-once semantics are required but the broker doesn't natively support them

## Solution

### Idempotency Key with Redis (Node.js)

```javascript
const redis = require('redis');
const client = redis.createClient();

async function processPayment(message) {
  const idempotencyKey = message.idempotencyKey || message.orderId;
  const lockKey = `idempotency:${idempotencyKey}`;
  
  // SET NX EX: set only if not exists, with 24h expiry
  const locked = await client.set(lockKey, 'processing', {
    NX: true,
    EX: 86400
  });
  
  if (!locked) {
    console.log('Duplicate message ignored:', idempotencyKey);
    return { status: 'already_processed' };
  }
  
  try {
    const result = await chargeCustomer(message);
    await client.set(lockKey, JSON.stringify(result), { EX: 86400 });
    return result;
  } catch (err) {
    // Remove lock on failure so retry can attempt again
    await client.del(lockKey);
    throw err;
  }
}
```

### Database Deduplication with Unique Index (PostgreSQL)

```sql
-- Table stores processed message IDs
CREATE TABLE processed_messages (
    message_id UUID PRIMARY KEY,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    result JSONB
);

-- Consumer uses INSERT ... ON CONFLICT DO NOTHING
WITH inserted AS (
    INSERT INTO processed_messages (message_id, result)
    VALUES (
        'msg_abc123'::UUID,
        '{"status": "shipped"}'::JSONB
    )
    ON CONFLICT (message_id) DO NOTHING
    RETURNING message_id
)
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM inserted) THEN 'processed'
        ELSE 'duplicate'
    END as status;
```

### Kafka Exactly-Once Producer (Java)

```java
Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);

// Enable idempotent producer (exactly-once per partition)
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
props.put(ProducerConfig.ACKS_CONFIG, "all");
props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);
props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);

Producer<String, String> producer = new KafkaProducer<>(props);

producer.send(new ProducerRecord<>("orders", orderId, payload));
```

## Explanation

**Three deduplication strategies**:

| Strategy | Storage | Latency | Durability |
|----------|---------|---------|------------|
| External cache (Redis) | Memory | <1ms | Medium (TTL-based) |
| Database unique index | Disk | 5-20ms | High (transactional) |
| Natural idempotency | None | 0ms | Infinite (design-level) |

**Natural idempotency examples**:
- `UPDATE accounts SET balance = 100 WHERE id = 1` (sets value, not increments)
- `INSERT ... ON CONFLICT DO NOTHING` (ignores duplicates)
- `DELETE FROM carts WHERE user_id = 5` (idempotent even if run twice)

**Message ID sources**:
- Producer-generated UUID at publish time
- Business key (orderId, paymentId) already present in payload
- Hash of message content (deterministic but collisions possible)

## Variants

| Approach | Best For | Trade-off |
|----------|----------|-----------|
| Redis SET NX | High throughput | Data loss if Redis fails |
| DB unique constraint | Financial data | Slower; requires DB round-trip |
| Bloom filter | Memory-efficient check | False positives possible |
| Kafka transactional | Stream processing | Higher latency; exactly-once per partition |

## What Works

- **TTL your dedup store**: Keep keys for 24-72 hours; message brokers don't redeliver indefinitely
- **Include processing result**: Storing the result allows returning the same response for duplicates
- **Use business keys when possible**: `orderId` is more meaningful than a random UUID
- **Handle the "processing" state**: A key set but not completed indicates an in-flight message
- **Clean up expired keys**: Cron jobs or Redis TTL prevent unbounded storage growth

## Common Mistakes

1. **No deduplication window**: Checking for duplicates only in-memory means process restarts lose state
2. **Key collisions**: Using timestamps or non-unique fields creates false duplicates
3. **Ignoring the "at-least-once" contract**: Assuming the broker delivers exactly-once without verification
4. **Non-idempotent side effects**: Sending email inside the transaction means duplicates send multiple emails. For failed messages, use [dead letter queues](/recipes/messaging/dead-letter-queue).
5. **Forgetting to clean up**: Deduplication tables that grow forever become performance bottlenecks

## Frequently Asked Questions

**Q: What's the difference between idempotency and deduplication?**
A: Deduplication prevents processing the same message twice. Idempotency means processing twice produces the same outcome. They're often used together.

**Q: Can I achieve exactly-once delivery?**
A: In practice, exactly-once is actually exactly-once processing with idempotency. True exactly-once delivery is impossible in [distributed systems](/guides/architecture/microservices-architecture-guide).

**Q: How long should I keep deduplication keys?**
A: Longer than your maximum redelivery window. For Kafka: `offsets.retention.minutes`. For SQS: visibility timeout × max retries + buffer.
