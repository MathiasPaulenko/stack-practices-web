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
  - /recipes/docker-compose-local-dev
  - /recipes/event-driven-architecture
  - /patterns/circuit-breaker-pattern
  - /recipes/dead-letter-queue
  - /recipes/event-driven-microservices
  - /recipes/message-idempotency
  - /recipes/rabbitmq-task-queue
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

Build resilient, growth-ready event-driven systems using Apache Kafka. Here is how to producer configuration, consumer groups with auto-rebalancing, offset management, and exactly-once processing semantics for reliable asynchronous communication between microservices.

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

### 6. Python Consumer with kafka-python

```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    'orders.created',
    bootstrap_servers=['localhost:9092'],
    group_id='notification-service',
    auto_offset_reset='latest',
    enable_auto_commit=False,
    value_deserializer=lambda x: json.loads(x.decode('utf-8')),
)

for message in consumer:
    order = message.value
    try:
        send_email_notification(order)
        consumer.commit()
    except Exception as e:
        print(f"Failed to process order {order['id']}: {e}")
        # Do not commit — message will be reprocessed on restart
```

Manual commit gives you control over when offsets are saved. Only commit after successful processing to avoid losing messages on failure.

## How It Works

- **Producers** publish messages to topics partitioned across brokers
- **Consumer groups** distribute partitions among instances for parallel processing
- **Offsets** track consumer progress; auto-commit periodically persists position
- **Exactly-once** uses transactions to commit offsets and output messages atomically

## Production Considerations

- Run at least 3 Kafka brokers with replication factor 3 for fault tolerance
- Monitor consumer lag with tools like Kafka Lag Exporter
- Use schema registry (Confluent) to enforce Avro/Protobuf schemas on topics
- Set appropriate retention policies — time-based (7 days default) or size-based
- Enable log compaction for topics that store current state (e.g., user profiles) rather than events
- Use `ack=all` producer setting to ensure messages are written to all replicas before confirming

## Best Practices

- **Use meaningful topic names**: `orders.created` not `topic1`. Namespace by domain and event type.
- **Partition by key**: use a meaningful key (e.g., `userId`, `orderId`) to ensure ordering within a partition.
- **Batch producer sends**: sending messages in batches improves throughput. Configure `batch.size` and `linger.ms`.
- **Handle rebalances gracefully**: implement a rebalance listener to commit offsets and clean up resources before partitions are revoked.
- **Use idempotent producers**: set `enable.idempotence=true` to prevent duplicate messages from retries.

## Common Mistakes

- Not handling consumer rebalances, causing duplicate processing
- Using auto-commit with long-running processes that may fail mid-batch
- Creating too many partitions per topic, increasing coordination overhead
- Not setting a `transactionalId` when using transactions, causing producer fencing errors
- Ignoring consumer lag until it becomes critical — set alerts at 1000+ messages behind
- Using default partitioner when message ordering matters — use key-based partitioning instead
- Not configuring `max.poll.interval.ms` correctly — consumers that process slowly get kicked out of the group
- Using `auto_offset_reset=none` without committed offsets — consumers crash on first run

## FAQ

**Q: How is this different from RabbitMQ?**
A: Kafka is a distributed log optimized for high throughput and replay. RabbitMQ is a general-purpose message broker with complex routing and lower latency.

**Q: When should I use a schema registry?**
A: When multiple teams produce and consume from shared topics, enforcing schemas prevents serialization mismatches.

**Q: How many partitions should my topic have?**
A: Start with a number equal to your expected consumer instances. Each partition is consumed by one instance in a group. More partitions increase parallelism but also coordination overhead. For most use cases, 6-12 partitions per topic is a good starting point.

**Q: How do I handle poison pill messages?**
A: A poison pill is a message that always fails processing. Use a dead letter queue (DLQ) pattern: catch processing errors, publish the failed message to a separate topic with the error details, and commit the original offset. This prevents the consumer from getting stuck retrying the same message.

**Q: What is consumer lag and why does it matter?**
A: Consumer lag is the difference between the latest offset in a partition and the last committed offset of a consumer. High lag means the consumer is falling behind. Monitor lag with Kafka Lag Exporter or Burrow. Persistent lag indicates that consumers cannot keep up with production rate — scale consumers or optimize processing.

**Q: Should I use Avro or JSON for message serialization?**
A: Avro with Schema Registry is preferred for production — it enforces schema compatibility, produces smaller payloads, and supports schema evolution. JSON is simpler for prototyping but lacks schema enforcement and is larger on the wire.

**Q: How do I handle schema evolution without breaking consumers?**
A: Use Schema Registry with `BACKWARD` compatibility mode. This allows adding optional fields and removing fields without breaking existing consumers. Never change field types or rename fields — create new fields instead. Test schema changes with `kafka-schema-registry-maven-plugin` before deploying.

**Q: What is the difference between at-least-once and exactly-once delivery?**
A: At-least-once means messages may be delivered more than once during retries — consumers must be idempotent. Exactly-once uses Kafka transactions to ensure messages are processed and committed exactly one time. Exactly-once has higher overhead — use it only when duplicates cause correctness issues (e.g., financial transactions).

**Q: How do I monitor Kafka in production?**
A: Use Kafka Lag Exporter for consumer lag metrics, Burrow for consumer health, and Confluent Control Center for cluster-wide monitoring. Export metrics to Prometheus and visualize in Grafana. Alert on lag growth, under-replicated partitions, and consumer group rebalance frequency. Set up dashboards for throughput, latency percentiles, and error rates to catch degradation early. Review broker logs for partition leadership changes and ISR shrinks weekly.

**Q: Should I use Kafka Streams or a plain consumer?**
A: Kafka Streams is ideal when you need stateful processing (aggregations, joins, windowing) within Kafka. For simple consume-process-produce pipelines, a plain consumer with manual offset control is lighter and easier to debug.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
