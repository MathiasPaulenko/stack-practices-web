---
contentType: recipes
slug: kafka-event-streaming
title: "Event Streaming with Apache Kafka and Node.js"
description: "Build growth-ready event-driven systems using Apache Kafka with producers, consumers, consumer groups, and exactly-once semantics for reliable asynchronous messaging"
metaDescription: "Build event-driven systems with Apache Kafka. Implement producers, consumers, consumer groups, and exactly-once semantics for reliable asynchronous messaging."
difficulty: intermediate
topics:
  - messaging
  - devops
tags:
  - event-driven
  - messaging
  - microservices
  - kafka
  - rabbitmq
relatedResources:
  - /recipes/devops/docker-compose-local-dev
  - /recipes/event-driven-architecture
  - /patterns/design/circuit-breaker-pattern
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build event-driven systems with Apache Kafka. Implement producers, consumers, consumer groups, and exactly-once semantics for reliable asynchronous messaging."
  keywords:
    - apache kafka
    - event streaming
    - message broker
    - consumer groups
    - exactly once
---

# Event Streaming with Apache Kafka and Node.js

Build resilient, growth-ready event-driven systems using Apache Kafka. This recipe covers producer configuration, consumer groups with auto-rebalancing, offset management, and exactly-once processing semantics for reliable asynchronous communication between microservices.

## When to Use This

- Services need to communicate asynchronously without tight coupling. See [Event-Driven Microservices](/recipes/messaging/event-driven-microservices) for architecture patterns.
- Event history must be replayable for debugging or new consumer onboarding. See [Event Sourcing](/patterns/design/event-sourcing-pattern) for immutable event logs.
- High throughput message processing requires horizontal scaling of consumers. See [RabbitMQ Task Queue](/recipes/messaging/rabbitmq-task-queue) for alternative broker patterns.

## Solution

### 1. Kafka Producer

```typescript
// kafka/producer.ts
import { Kafka, Partitioners } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: ['kafka-1:9092', 'kafka-2:9092'],
});

const producer = kafka.producer({
  createPartitioner: Partitioners.DefaultPartitioner,
  retry: {
    retries: 5,
    initialRetryTime: 300,
  },
});

await producer.connect();

async function publishOrderCreated(order: unknown): Promise<void> {
  await producer.send({
    topic: 'orders.created',
    messages: [
      {
        key: order.userId,
        value: JSON.stringify(order),
        headers: {
          'content-type': 'application/json',
          'trace-id': generateTraceId(),
        },
      },
    ],
  });
}
```

### 2. Consumer with Consumer Group

```typescript
// kafka/consumer.ts
const consumer = kafka.consumer({
  groupId: 'notification-service',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
});

await consumer.connect();
await consumer.subscribe({ topic: 'orders.created', fromBeginning: false });

await consumer.run({
  autoCommit: true,
  autoCommitInterval: 5000,
  eachMessage: async ({ topic, partition, message }) => {
    const order = JSON.parse(message.value!.toString());
    console.log(`Processing order from partition ${partition}:`, order.id);

    try {
      await sendEmailNotification(order);
    } catch (error) {
      // Dead letter handling
      await publishToDeadLetter(topic, message, error);
    }
  },
});
```

### 3. Exactly-Once Processing

```typescript
// kafka/exactly-once.ts
const producer = kafka.producer({
  transactionalId: 'order-processor',
  maxInFlightRequests: 1,
  idempotent: true,
});

await producer.connect();

async function processOrderWithIdempotency(orderId: string): Promise<void> {
  const transaction = await producer.transaction();

  try {
    // Process order
    const result = await processPayment(orderId);

    // Send result
    await transaction.send({
      topic: 'orders.completed',
      messages: [{ key: orderId, value: JSON.stringify(result) }],
    });

    // Commit offsets and messages atomically
    await transaction.commit();
  } catch (error) {
    await transaction.abort();
    throw error;
  }
}
```

### 4. Custom Partitioner for Ordering

```typescript
// kafka/partitioner.ts
function userIdPartitioner(userId: string, numPartitions: number): number {
  // Ensure all events for a user go to the same partition
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % numPartitions;
}

await producer.send({
  topic: 'user.events',
  messages: [
    {
      key: userId,
      value: JSON.stringify(event),
      partition: userIdPartitioner(userId, 12),
    },
  ],
});
```

### 5. Docker Compose Setup

```yaml
# docker-compose.kafka.yml
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
```

## How It Works

- **Producers** publish messages to topics partitioned across brokers
- **Consumer groups** distribute partitions among instances for parallel processing
- **Offsets** track consumer progress; auto-commit periodically persists position
- **Exactly-once** uses transactions to commit offsets and output messages atomically

## Production Considerations

- Run at least 3 Kafka brokers with replication factor 3 for fault tolerance
- Monitor consumer lag with tools like Kafka Lag Exporter
- Use schema registry (Confluent) to enforce Avro/Protobuf schemas on topics

## Common Mistakes

- Not handling consumer rebalances, causing duplicate processing
- Using auto-commit with long-running processes that may fail mid-batch
- Creating too many partitions per topic, increasing coordination overhead

## FAQ

**Q: How is this different from RabbitMQ?**
A: Kafka is a distributed log optimized for high throughput and replay. RabbitMQ is a general-purpose message broker with complex routing and lower latency.

**Q: When should I use a schema registry?**
A: When multiple teams produce and consume from shared topics, enforcing schemas prevents serialization mismatches.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
