---
contentType: recipes
slug: message-idempotency
title: "Message Processing Idempotency"
description: "Make message processing idempotent so duplicate deliveries don't trigger side effects in event-driven systems."
metaDescription: "Idempotent message processing with Redis, PostgreSQL and Kafka. Deduplication keys, exactly-once semantics and safe handling of duplicate deliveries."
difficulty: advanced
topics:
  - messaging
  - architecture
tags:
  - messaging
  - distributed-systems
  - kafka
  - rabbitmq
  - idempotency
  - event-driven
relatedResources:
  - /recipes/event-driven-microservices
  - /recipes/dead-letter-queue
  - /recipes/kafka-event-streaming
  - /recipes/rabbitmq-task-queue
  - /guides/microservices-architecture-guide
  - /guides/message-queue-guide
lastUpdated: "2026-08-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Idempotent message processing with Redis, PostgreSQL and Kafka. Deduplication keys, exactly-once semantics and safe handling of duplicate deliveries."
  keywords:
    - message-idempotency
    - deduplication
    - idempotency-key
    - kafka
    - rabbitmq
    - distributed-systems
---

## Overview

Most message brokers promise **at-least-once delivery**. Retries, consumer
rebalances and producer failures all create duplicates. Idempotency means
processing the same message twice leaves the system in the same state as
processing it once. This recipe shows how to do it with Redis, PostgreSQL and
Kafka.

## When to Use

- Your broker only guarantees at-least-once delivery.
- Producers retry failed publishes and may create duplicates.
- Consumer groups rebalance and reprocess earlier offsets.
- A duplicate charge, shipment or email would do real damage.

### When to avoid

- The consumer just sets a fixed value, such as `status = shipped`. That's
  naturally idempotent without extra work.
- Duplicate processing is harmless, such as refreshing a cache.
- Your broker already gives you exactly-once semantics for your use case.

## Solution

### Redis idempotency key (Node.js)

```javascript
const redis = require('redis');
const client = redis.createClient();

async function processPayment(message) {
  const key = `idempotency:${message.idempotencyKey || message.orderId}`;

  // SET NX EX: set only if not exists, with 24h expiry
  const locked = await client.set(key, 'processing', { NX: true, EX: 86400 });

  if (!locked) {
    console.log('Duplicate message ignored:', key);
    return { status: 'already_processed' };
  }

  try {
    const result = await chargeCustomer(message);
    await client.set(key, JSON.stringify(result), { EX: 86400 });
    return result;
  } catch (err) {
    // Remove the lock so the next retry can attempt again
    await client.del(key);
    throw err;
  }
}
```

### PostgreSQL deduplication table

```sql
-- Table stores processed message IDs and results
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
    END AS status;
```

### Kafka idempotent producer (Java)

```java
Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);

// Enables exactly-once semantics per partition
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
props.put(ProducerConfig.ACKS_CONFIG, "all");
props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);
props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);

Producer<String, String> producer = new KafkaProducer<>(props);
producer.send(new ProducerRecord<>("orders", orderId, payload));
```

## Explanation

A message is idempotent when processing it N times has the same effect as
processing it once. There are three ways to get there.

1. **Deduplication with an external store.** Look up a Redis or database key
   before doing work. Store the result so duplicates can return the same answer.
2. **Natural idempotency.** Design the operation itself to be safe when repeated.
   `UPDATE inventory SET quantity = 10 WHERE id = 1` sets a value instead of
   decrementing it, and `INSERT ... ON CONFLICT DO NOTHING` simply skips
   duplicates.
3. **Broker-level idempotency.** Kafka's idempotent producer deduplicates retries
   per partition, so the application needs fewer checks.

The key has to be **unique and stable**. Good sources are:

- A UUID the producer creates at publish time.
- A business key already in the message, such as `orderId` or `paymentId`.
- A hash of the message content, though collisions are possible.

## Variants

| Approach | Best for | Trade-off |
| --- | --- | --- |
| Redis `SET NX` | High-throughput checks | Data loss if Redis fails before persistence |
| Database unique index | Financial or critical data | Slower; needs a round-trip to the database |
| Natural idempotency | Simple state updates | Requires designing the operation to be safe |
| Kafka idempotent producer | Stream processing | Exactly-once per partition, not across partitions |
| Bloom filter | Memory-efficient pre-filter | False positives are possible |

## Best Practices

- Store the processing result, not just a flag. Returning the same result for
  duplicates makes the system predictable.
- TTL your deduplication store. Keep keys for 24–72 hours, which is longer than
  the broker's redelivery window.
- Use a business key whenever possible. `orderId` is easier to understand than a
  random message UUID.
- Handle the `processing` state. A key set without a result means the message
  crashed mid-flight; delete it or reprocess it carefully.
- Don't assume the broker gives you exactly-once delivery. Verify the same thing
  in your own code.
- Clean up expired deduplication records. TTLs or cron jobs prevent unbounded
  storage growth.

## Common Mistakes

- Keeping deduplication keys only in memory. A consumer restart wipes them out.
- Using non-unique fields, such as timestamps, as idempotency keys.
- Assuming the broker gives you exactly-once delivery without verification.
- Calling non-idempotent side effects, such as sending an email, inside the
  processing path.
- Growing the deduplication table forever and turning it into a bottleneck.
- Letting retries happen before the deduplication lock has been released.

## FAQ

### What's the difference between idempotency and deduplication?

Deduplication stops a message from being processed twice. Idempotency means that
processing the same message twice leaves the same final state as processing it
once. They work best together.

### Can I achieve exactly-once delivery?

True exactly-once delivery is impossible in distributed systems. In practice, you can
build **exactly-once processing** with idempotency, but not true exactly-once
delivery. Kafka's idempotent producer comes close, but only within a single
partition.

### How long should I keep deduplication keys?

Longer than your maximum redelivery window. For Kafka, use
`offsets.retention.minutes`. For SQS, use `visibility timeout × max retries +
buffer`.

### What makes a good idempotency key?

A stable, unique identifier. If the message already has a business key like
`orderId` or `paymentId`, use it. Otherwise generate a UUID at publish time.

### How do I handle idempotency across multiple services?

Use a centralized deduplication store, like Redis or DynamoDB, that every
consumer checks. Store the message ID and the result. Every service checks the
same key before acting.

### What is the overhead of idempotency checks?

Redis `SET NX` checks take less than one millisecond. Database checks take a few
milliseconds — small compared with duplicate charges, shipments or
notifications.
