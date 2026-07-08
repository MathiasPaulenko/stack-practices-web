---
contentType: recipes
slug: event-driven-architecture
title: "Design Event-Driven Systems with Event Buses and Brokers"
description: "How to build loosely coupled systems using events, event buses, message brokers, and event sourcing for growth-ready asynchronous communication between services."
metaDescription: "Learn event-driven architecture with event buses and brokers. Build loosely coupled systems using events, message brokers, and event sourcing for async communication."
difficulty: intermediate
topics:
  - architecture
tags:
  - architecture
  - event-driven
  - design
  - patterns
  - scalability
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

Event-driven architecture inverts this relationship. Services communicate by publishing events to a message broker rather than calling each other directly. An "OrderPlaced" event is published once. The inventory service subscribes and decrements stock. The billing service subscribes and creates an invoice. The shipping service subscribes and prepares a label. Each service operates independently — if billing is slow, orders and shipping continue unaffected. Below is a practical approach to event patterns, broker selection, and implementation with Kafka, RabbitMQ, and AWS EventBridge.

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

## What Works

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


### Event Sourcing with Kafka Streams (Java)

```java
public class OrderEventStore {

    private final KafkaStreams streams;

    public OrderEventStore() {
        StreamsBuilder builder = new StreamsBuilder();

        // Event store: aggregate events by order ID
        KStream<String, OrderEvent> eventStream = builder.stream(
            "orders",
            Consumed.with(Serdes.String(), new OrderEventSerde())
        );

        // Materialize current state from event history
        KTable<String, OrderState> orderState = eventStream
            .groupByKey()
            .aggregate(
                OrderState::new,
                (key, event, state) -> state.apply(event),
                Materialized.as("order-state-store")
            );

        // Project to a read model topic
        orderState.toStream().to("order-read-model",
            Produced.with(Serdes.String(), new OrderStateSerde()));

        streams = new KafkaStreams(builder.build(), getStreamsConfig());
    }

    public void start() {
        streams.start();
    }

    public OrderState getOrder(String orderId) {
        ReadOnlyKeyValueStore<String, OrderState> store =
            streams.store(StoreQueryParameters.fromNameAndType(
                "order-state-store",
                QueryableStoreTypes.keyValueStore()
            ));
        return store.get(orderId);
    }
}

// Apply events to reconstruct state
class OrderState {
    private String status;
    private BigDecimal total;
    private List<String> items = new ArrayList<>();

    public OrderState apply(OrderEvent event) {
        switch (event.getType()) {
            case "OrderPlaced":
                this.status = "placed";
                this.total = event.getTotal();
                this.items = event.getItemIds();
                break;
            case "OrderPaid":
                this.status = "paid";
                break;
            case "OrderShipped":
                this.status = "shipped";
                break;
            case "OrderCancelled":
                this.status = "cancelled";
                break;
        }
        return this;
    }
}
```

### Schema Registry with Avro (Python)

```python
from confluent_kafka import Producer, SerializingProducer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer
from dataclasses import dataclass, asdict
import uuid

schema_registry_client = SchemaRegistryClient({
    'url': 'http://schema-registry:8081'
})

order_event_schema_str = """
{
  "type": "record",
  "name": "OrderEvent",
  "namespace": "com.stackpractices.events",
  "fields": [
    {"name": "event_id", "type": "string"},
    {"name": "event_type", "type": "string"},
    {"name": "aggregate_id", "type": "string"},
    {"name": "customer_id", "type": "string"},
    {"name": "total", "type": "double"},
    {"name": "items", "type": {"type": "array", "items": "string"}},
    {"name": "occurred_at", "type": "string"}
  ]
}
"""

avro_serializer = AvroSerializer(
    schema_registry_client,
    order_event_schema_str,
    lambda obj, ctx: asdict(obj)
)

@dataclass
class OrderEvent:
    event_id: str
    event_type: str
    aggregate_id: str
    customer_id: str
    total: float
    items: list
    occurred_at: str

producer = SerializingProducer({
    'bootstrap.servers': 'kafka:9092',
    'value.serializer': avro_serializer,
})

def publish_order_event(order):
    event = OrderEvent(
        event_id=str(uuid.uuid4()),
        event_type='OrderPlaced',
        aggregate_id=order.id,
        customer_id=order.customer_id,
        total=order.total(),
        items=[item.id for item in order.items],
        occurred_at=order.created_at.isoformat(),
    )
    producer.produce(
        topic='orders',
        key=order.id.encode(),
        value=event,
        on_delivery=delivery_report,
    )
    producer.flush()
```

### AWS EventBridge Consumer (TypeScript)

```typescript
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

const eventBridge = new EventBridgeClient({ region: 'us-east-1' });
const sqs = new SQSClient({ region: 'us-east-1' });

// Publishing to EventBridge
async function publishOrderEvent(order: Order): Promise<void> {
  const command = new PutEventsCommand({
    Entries: [{
      EventBusName: 'stackpractices-events',
      Source: 'order-service',
      DetailType: 'OrderPlaced',
      Detail: JSON.stringify({
        orderId: order.id,
        customerId: order.customerId,
        total: order.total,
        items: order.items,
      }),
    }],
  });
  await eventBridge.send(command);
}

// Consuming from SQS (EventBridge target)
async function processOrderEvents(): Promise<void> {
  const result = await sqs.send(new ReceiveMessageCommand({
    QueueUrl: process.env.INVENTORY_QUEUE_URL!,
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 20,
  }));

  for (const message of result.Messages || []) {
    try {
      const event = JSON.parse(message.Body!);
      const detail = JSON.parse(event.detail);

      await reserveInventory(detail.items);
      await sqs.send(new DeleteMessageCommand({
        QueueUrl: process.env.INVENTORY_QUEUE_URL!,
        ReceiptHandle: message.ReceiptHandle!,
      }));
    } catch (error) {
      // Message will become visible again after visibility timeout
      // After max retries, it moves to DLQ
      console.error('Failed to process order event:', error);
    }
  }
}
```

## Additional Best Practices

1. **Use correlation IDs for end-to-end tracing.** Every event should carry a correlation ID that links it to the original request. This allows tracing the full event chain across services:

```typescript
import { randomUUID } from 'crypto';

interface EventEnvelope {
  event_id: string;
  correlation_id: string;
  causation_id: string | null;
  event_type: string;
  aggregate_id: string;
  payload: any;
  occurred_at: string;
}

function createEvent(type: string, aggregateId: string, payload: any, correlationId?: string): EventEnvelope {
  return {
    event_id: randomUUID(),
    correlation_id: correlationId || randomUUID(),
    causation_id: correlationId || null,
    event_type: type,
    aggregate_id: aggregateId,
    payload,
    occurred_at: new Date().toISOString(),
  };
}
```

2. **Implement event versioning from day one.** Events live forever in logs. Add a `schema_version` field to every event. Consumers handle multiple versions; publishers always write the latest:

```python
class EventV1:
    schema_version: int = 1
    order_id: str
    total: float

class EventV2:
    schema_version: int = 2
    order_id: str
    total: float
    currency: str  # new field
    tax: float     # new field

def handle_order_event(event: dict):
    version = event.get('schema_version', 1)
    if version == 1:
        # Migrate v1 to v2
        event['currency'] = 'USD'
        event['tax'] = event['total'] * 0.08
    process_order(event)
```

3. **Use outbox pattern for reliable event publishing.** Writing to the database and publishing to the broker in a single transaction is impossible without distributed transactions. The outbox pattern solves this:

```typescript
// Step 1: Save order + outbox event in same DB transaction
async function placeOrderWithOutbox(orderData: OrderData): Promise<Order> {
  return await db.transaction(async (trx) => {
    const order = await trx.insert(ordersTable, orderData);
    await trx.insert(outboxTable, {
      aggregate_id: order.id,
      event_type: 'OrderPlaced',
      payload: JSON.stringify(order),
      created_at: new Date(),
      published: false,
    });
    return order;
  });
}

// Step 2: Relay process publishes outbox events to Kafka
async function relayOutboxEvents(): Promise<void> {
  const pending = await db.query(outboxTable, { published: false }, { limit: 100 });
  for (const event of pending) {
    await kafkaProducer.send({
      topic: 'orders',
      key: event.aggregate_id,
      value: event.payload,
    });
    await db.update(outboxTable, { id: event.id }, { published: true });
  }
}
```

## Additional Common Mistakes

1. **Events with too much payload.** Large events (over 1MB) slow down the broker and consumers. Include only essential data in the event payload. Consumers that need more can query the source service:

```python
# Bad: embedding full order with all item details
event = {
    'type': 'OrderPlaced',
    'payload': {
        'order': order.to_dict(),  # could be 500KB
        'customer': customer.to_dict(),
        'shipping_address': address.to_dict(),
    }
}

# Good: reference IDs, consumers fetch details if needed
event = {
    'type': 'OrderPlaced',
    'payload': {
        'order_id': order.id,
        'customer_id': order.customer_id,
        'total': order.total(),
        'item_count': len(order.items),
    }
}
```

2. **No backpressure handling.** When producers outpace consumers, messages pile up. Without backpressure, the broker runs out of disk or memory. Monitor consumer lag and implement rate limiting at the producer:

```typescript
class ProducerWithBackpressure {
  private maxInFlight: number = 1000;
  private currentInFlight: number = 0;

  async produce(topic: string, message: any): Promise<void> {
    while (this.currentInFlight >= this.maxInFlight) {
      await this.waitForSlot();
    }
    this.currentInFlight++;
    try {
      await this.kafkaProducer.send({ topic, value: message });
    } finally {
      this.currentInFlight--;
    }
  }

  private async waitForSlot(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

3. **Tight coupling through event payload structure.** When consumers depend on specific fields in the event payload, changing the event format breaks them. Use schema registry and only add fields (never remove or rename):

```python
# Bad: consumer depends on specific field names
def handle_event(event):
    customer_name = event['payload']['customer']['first_name']  # breaks if renamed

# Good: consumer accesses via accessor with fallback
def handle_event(event):
    payload = event.get('payload', {})
    customer = payload.get('customer', {})
    customer_name = customer.get('first_name') or customer.get('name', 'Unknown')
```

## Additional FAQ

### How do I test event-driven systems?

Use embedded Kafka or Testcontainers for integration tests. Publish events and assert consumer state changes. For unit tests, mock the broker and test handler logic in isolation. Test idempotency by sending the same event twice and verifying the state doesn't change. Test ordering by sending events out of sequence and checking the handler either reorders or handles gracefully. Test poison messages by sending malformed events and verifying they land in the DLQ.

### Is this solution production-ready?

Yes. Kafka is used in production by LinkedIn, Netflix, and Uber for event streaming. RabbitMQ is used in production by Reddit, Instagram, and Spotify. AWS EventBridge is used across thousands of AWS production workloads. The outbox pattern is documented in Microservices Patterns by Chris Richardson. Schema Registry is used in production by Confluent Platform users. Event sourcing with Kafka Streams is used by Uber's trip execution system.

### What are the performance characteristics?

Kafka handles 100K+ events per second per partition with sub-millisecond latency. RabbitMQ handles 20K-50K messages per second depending on routing complexity. EventBridge adds 50-200ms latency per event due to AWS API overhead. Schema Registry serialization adds 1-2ms per event for Avro. The outbox pattern adds one DB write per event — batch relay to reduce overhead. Consumer lag grows linearly with producer rate minus consumer rate. Backpressure adds queue delay but prevents system failure.

### How do I debug issues with this approach?

Use Kafka's `kafka-consumer-groups.sh` to check consumer lag. For RabbitMQ, use the management UI to see queue depth and consumer count. For EventBridge, use CloudWatch metrics for Invocations and FailedInvocations. Add correlation IDs to every event and log them at each consumer. Use distributed tracing (Jaeger, Zipkin) to follow event chains across services. For poison messages, inspect the DLQ and replay after fixing the handler. For ordering issues, check partition assignment and consumer group rebalances.
