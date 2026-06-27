---
contentType: recipes
slug: event-driven-architecture
title: "Design Event-Driven Systems with Event Buses and Brokers"
description: "How to build loosely coupled systems using events, event buses, message brokers, and event sourcing for scalable asynchronous communication between services."
metaDescription: "Learn event-driven architecture with event buses and brokers. Build loosely coupled systems using events, message brokers, and event sourcing for async communication."
difficulty: intermediate
topics:
  - architecture
tags:
  - architecture
  - event-driven
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/cqrs-pattern-recipe
  - /recipes/serverless-functions
  - /recipes/async-patterns
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn event-driven architecture with event buses and brokers. Build loosely coupled systems using events, message brokers, and event sourcing for async communication."
  keywords:
    - event driven architecture
    - message broker
    - event bus
    - kafka events
    - pub sub pattern
---

## Overview

Synchronous service-to-service calls create tight coupling. The caller must know the callee's location, wait for a response, and handle failures directly. When the callee is slow or down, the caller suffers. As systems grow, this web of direct dependencies becomes a tangled mess where any change ripples across multiple services.

Event-driven architecture inverts this relationship. Services communicate by publishing events to a message broker rather than calling each other directly. An "OrderPlaced" event is published once. The inventory service subscribes and decrements stock. The billing service subscribes and creates an invoice. The shipping service subscribes and prepares a label. Each service operates independently — if billing is slow, orders and shipping continue unaffected. This recipe covers event patterns, broker selection, and implementation with Kafka, RabbitMQ, and AWS EventBridge.

## When to use it

Use this recipe when:

- Multiple services must react to the same business event
- Workloads are bursty and need buffering to smooth traffic spikes
- Services have different availability requirements and cannot block on each other
- Building audit trails where every state change must be recorded
- Implementing event sourcing for temporal queries and state reconstruction. See [CQRS Pattern](/patterns/design/cqrs-pattern) for read/write separation.

## Solution

### Publishing Events (Python / Kafka)

```python
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers=['kafka:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    acks='all',
    retries=3,
)

def place_order(order_data):
    # Save order to database
    order = save_order(order_data)

    # Publish event
    event = {
        'type': 'OrderPlaced',
        'aggregate_id': order.id,
        'payload': {
            'customer_id': order.customer_id,
            'items': [item.to_dict() for item in order.items],
            'total': order.total(),
        },
        'occurred_at': order.created_at.isoformat(),
    }

    producer.send('orders', key=order.id.encode(), value=event)
    producer.flush()

    return order
```

### Consuming Events (Node.js / RabbitMQ)

```javascript
const amqp = require('amqplib');

async function startInventoryConsumer() {
  const connection = await amqp.connect('amqp://rabbitmq');
  const channel = await connection.createChannel();

  const queue = 'inventory_updates';
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, 'orders', 'OrderPlaced');

  channel.consume(queue, async (msg) => {
    if (msg !== null) {
      const event = JSON.parse(msg.content.toString());
      console.log(`Processing ${event.type} for order ${event.aggregate_id}`);

      try {
        await reserveInventory(event.payload.items);
        channel.ack(msg); // Confirm processing
      } catch (error) {
        channel.nack(msg, false, false); // Dead-letter, don't requeue
      }
    }
  });
}

startInventoryConsumer();
```

### AWS EventBridge Event Bus (Terraform)

```hcl
resource "aws_cloudwatch_event_bus" "main" {
  name = "stackpractices-events"
}

resource "aws_cloudwatch_event_rule" "order_placed" {
  name        = "order-placed-rule"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    source      = ["order-service"]
    detail-type = ["OrderPlaced"]
  })
}

resource "aws_cloudwatch_event_target" "inventory_target" {
  rule           = aws_cloudwatch_event_rule.order_placed.name
  event_bus_name = aws_cloudwatch_event_bus.main.name
  arn            = aws_sqs_queue.inventory_queue.arn
}

resource "aws_cloudwatch_event_target" "billing_target" {
  rule           = aws_cloudwatch_event_rule.order_placed.name
  event_bus_name = aws_cloudwatch_event_bus.main.name
  arn            = aws_lambda_function.billing_processor.arn
}
```

## Explanation

- **Event vs command**: an event states that something happened (`OrderPlaced`). It is immutable and broadcast. A command instructs an action (`PlaceOrder`). It is directed at a specific handler. Do not mix them — a service that receives a command should not publish it as an event without transformation.
- **Message broker patterns**: publish-subscribe (pub/sub) broadcasts to all subscribers. Point-to-point sends to one consumer. Competing consumers scale point-to-point by adding workers. Choose based on whether all services need the event or just one.
- **Event ordering**: brokers do not guarantee global ordering. If `OrderPlaced` and `OrderCancelled` arrive out of sequence, the inventory system may try to cancel stock that was never reserved. Use aggregate-scoped ordering (same order ID always routes to the same partition) or idempotent handlers.
- **Dead-letter queues**: failed event processing must not block the queue. After N retries, send the message to a dead-letter queue for manual inspection. Monitor DLQ depth as a critical alert — growing DLQs indicate systemic problems.

## Variants

| Broker | Pattern | Durability | Ordering | Scale | Best for |
|--------|---------|------------|----------|-------|----------|
| Kafka | Pub/sub, streams | High | Partition-scoped | Massive | Event sourcing, streaming |
| RabbitMQ | Pub/sub, queues | Medium | Queue-scoped | Medium | Complex routing, AMQP |
| NATS | Pub/sub, request/reply | Low | None | Very high | Low-latency, simple |
| AWS SNS/SQS | Pub/sub, queues | High | None | High | Cloud-native, serverless |
| Redis Streams | Pub/sub | Medium | Stream-scoped | Medium | Simple, existing Redis |

## Best practices

- **Design events, not messages**: an event should describe what happened, not what the consumer should do. See [Microservices Patterns](/guides/architecture/microservices-architecture-guide) for service communication strategies. `OrderPlaced` is correct. `DecrementInventory` is a command masquerading as an event. Events are facts; commands are instructions.
- **Use schema validation**: unvalidated events are a source of subtle bugs. Use Avro, JSON Schema, or Protobuf to define event contracts. Validate at the publisher and consumer boundaries. Version schemas and maintain backward compatibility.
- **Make consumers idempotent**: network retries and broker redeliveries mean the same event may be processed multiple times. See [Idempotent Endpoints](/recipes/api/idempotent-api-endpoints) for deduplication patterns. Design handlers so that processing the same event twice produces the same state. Use `UPSERT` or track processed event IDs in a deduplication table.
- **Monitor consumer lag**: lag is the number of unprocessed messages in a partition. High lag indicates the consumer is slower than the producer. Alert on lag thresholds. Scale consumers horizontally or optimize handler performance.
- **Publish domain events, not infrastructure events**: `PaymentProcessed` is a domain event with business meaning. `DatabaseRowInserted` is infrastructure noise. Consumers care about business state changes, not implementation details.

## Common mistakes

- **Choreography without visibility**: a request that fans out to 5 events, each triggering 3 more, creates an invisible workflow. When it fails, debugging requires checking 15 services. Add correlation IDs and distributed tracing to follow the chain.
- **Synchronous event processing**: a consumer that processes events synchronously within an HTTP request reintroduces the coupling the event bus was meant to eliminate. Events should be processed asynchronously, decoupled from the user-facing request.
- **No error handling for poison messages**: a malformed event that crashes the consumer will be redelivered indefinitely, blocking the queue. Implement a maximum retry count and a poison pill handler.
- **Storing state in the broker**: using the broker as a database (e.g., querying Kafka for current state) is an anti-pattern. Brokers are for transport, not storage. Use event sourcing or a read model for state queries.

## FAQ

**Q: Should I use Kafka or RabbitMQ?**
A: Kafka for high-throughput event streaming, event sourcing, and replay. RabbitMQ for complex routing, request-reply patterns, and AMQP compatibility. Kafka scales horizontally better; RabbitMQ is easier to operate at small scale.

**Q: How do I handle event ordering across services?**
A: You cannot guarantee global ordering across services. Ensure ordering within an aggregate (e.g., all events for `order-123` go to the same partition). Use [sagas](/recipes/saga-pattern-recipe) to compensate when cross-service ordering assumptions are violated.

**Q: What is the difference between event-driven and message-driven?**
A: Event-driven: services react to events they subscribe to. Message-driven: services send messages to specific queues. The terms overlap, but event-driven implies pub/sub and loose coupling, while message-driven includes point-to-point patterns.

**Q: Can I query events directly from Kafka?**
A: You can read a stream, but Kafka is not a query engine. For queries, materialize events into a database (read model) via a Kafka Streams or ksqlDB application. Query the database, not the broker.

