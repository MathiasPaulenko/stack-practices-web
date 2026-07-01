---
contentType: recipes
slug: event-driven-microservices
title: "Event-Driven Microservices"
description: "Design event-driven microservices with message brokers, event sourcing, CQRS, and eventual consistency patterns."
metaDescription: "Event-driven microservices architecture: message brokers, event sourcing, CQRS, eventual consistency, saga patterns, and outbox pattern implementation."
difficulty: advanced
topics:
  - messaging
tags:
  - event-driven
  - microservices
  - messaging
  - architecture
relatedResources:
  - /recipes/kafka-event-streaming
  - /recipes/rabbitmq-task-queue
  - /guides/software-architecture-guide
  - /guides/event-driven-architecture-guide
  - /guides/microservices-architecture-guide
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Event-driven microservices architecture: message brokers, event sourcing, CQRS, eventual consistency, saga patterns, and outbox pattern implementation."
  keywords:
    - event-driven
    - microservices
    - messaging
    - architecture
---
## Overview

Event-driven microservices communicate asynchronously through events rather than direct API calls. This decouples services, improves resilience, and enables independent scaling. Patterns like event sourcing, CQRS, saga orchestration, and the outbox pattern solve common challenges: data consistency, message ordering, duplicate handling, and failure recovery.

## When to Use

Use this resource when:
- Services need to scale independently without tight coupling. See [Event-Driven Functions](/recipes/messaging/event-driven-microservices) for async messaging patterns.
- Handling long-running business processes across multiple domains. See [Serverless Orchestration](/recipes/devops/background-jobs) for workflow coordination.
- Ensuring data consistency without distributed transactions. See [Retry Logic](/recipes/architecture/retry-backoff) for handling transient failures.
- Building real-time notification, audit, or analytics pipelines. See [Kafka Event Streaming](/recipes/messaging/kafka-event-streaming) for high-throughput event processing.

## Solution

### Event Sourcing with PostgreSQL (Python)

```python
from dataclasses import dataclass
from typing import List
import json

@dataclass
class Event:
    aggregate_id: str
    event_type: str
    payload: dict
    version: int

class OrderAggregate:
    def __init__(self, order_id: str):
        self.order_id = order_id
        self.events: List[Event] = []
        self.status = "pending"
    
    def apply(self, event: Event):
        if event.event_type == "order_placed":
            self.status = "placed"
        elif event.event_type == "payment_received":
            self.status = "paid"
        self.events.append(event)
    
    def place_order(self, items: List[dict]):
        event = Event(
            aggregate_id=self.order_id,
            event_type="order_placed",
            payload={"items": items},
            version=len(self.events) + 1
        )
        self.apply(event)
        return event
```

### Outbox Pattern (Node.js + Kafka)

```javascript
// Within the same database transaction:
await db.transaction(async (trx) => {
  // 1. Update business data
  await trx('orders').insert({ id: orderId, status: 'placed' });
  
  // 2. Write to outbox table (same transaction)
  await trx('outbox').insert({
    topic: 'orders.events',
    key: orderId,
    payload: JSON.stringify({ event: 'order_placed', orderId, items })
  });
});

// Separate relay process polls outbox and publishes to Kafka
const pending = await db('outbox').where('sent', false).limit(100);
for (const msg of pending) {
  await kafka.producer.send({
    topic: msg.topic,
    messages: [{ key: msg.key, value: msg.payload }]
  });
  await db('outbox').where('id', msg.id).update({ sent: true });
}
```

### Saga Orchestration (TypeScript)

```typescript
interface SagaStep {
  name: string;
  execute: () => Promise<void>;
  compensate: () => Promise<void>;
}

class OrderSaga {
  private steps: SagaStep[] = [
    {
      name: 'reserve_inventory',
      execute: () => inventoryService.reserve(order.items),
      compensate: () => inventoryService.release(order.items)
    },
    {
      name: 'process_payment',
      execute: () => paymentService.charge(order.total),
      compensate: () => paymentService.refund(order.total)
    },
    {
      name: 'ship_order',
      execute: () => shippingService.createLabel(order),
      compensate: () => shippingService.cancelLabel(order)
    }
  ];
  
  async execute() {
    const completed: SagaStep[] = [];
    try {
      for (const step of this.steps) {
        await step.execute();
        completed.push(step);
      }
    } catch (err) {
      // Rollback completed steps in reverse order
      for (const step of completed.reverse()) {
        await step.compensate();
      }
      throw new Error(`Saga failed at step ${completed[0]?.name}`);
    }
  }
}
```

## Explanation

**Core patterns**:

| Pattern | Problem Solved | Trade-off |
|---------|----------------|-----------|
| Event Sourcing | Audit trail; temporal queries | Complex; requires CQRS for reads |
| CQRS | Optimize read/write models separately | Eventual consistency; more code |
| Saga | Distributed transactions without locks | Complex rollback; eventual consistency |
| Outbox | Atomic "DB update + message publish" | Requires relay process |
| Idempotent Consumer | Handle duplicate messages | Requires unique keys per message |

**Message ordering guarantees**:
- **Kafka**: Ordered per partition key (e.g., order_id)
- **RabbitMQ**: Ordered per queue but not across consumers
- **SQS**: No ordering (use FIFO queues for ordering)

## Variants

| Broker | Ordering | Delivery | Best For |
|--------|----------|----------|----------|
| Kafka | Per partition | At-least-once | High throughput; replayability |
| RabbitMQ | Queue-level | At-least-once | Complex routing; priority queues |
| NATS | Subject-level | At-most-once | Low latency; simplicity |
| Pulsar | Global | Exactly-once | Geo-replication; tiered storage |

## What Works

- **Design events as facts, not commands**: "OrderPlaced" not "PlaceOrder"
- **Include schema versions**: V1 events must be readable by V2 consumers
- **Handle duplicates gracefully**: Make consumers idempotent (upsert, not insert)
- **Monitor dead letter queues**: Failed messages need investigation, not silent dropping
- **Keep event payloads small**: Reference large data; don't embed blobs

## Common Mistakes

1. **Event-driven spaghetti**: 50 microservices subscribing to the same event creates invisible coupling
2. **Missing idempotency**: Processing the same payment event twice charges the customer twice
3. **Synchronous event chains**: Calling HTTP APIs inside event handlers defeats the purpose
4. **No dead letter handling**: Failed messages disappear; you lose business events
5. **Wrong ordering assumptions**: Assuming global ordering when only partition-level ordering exists

## Frequently Asked Questions

**Q: When should I use event sourcing vs. traditional CRUD?**
A: Use event sourcing for domains where audit history, temporal queries, or replay are critical (finance, logistics). Use CRUD for simple CRUD domains.

**Q: How do I handle schema evolution in events?**
A: Use schema registries (Confluent, AWS Glue). Add fields; never remove. Maintain backward compatibility for 2+ versions.

**Q: What's the difference between choreography and orchestration sagas?**
A: Choreography: services react to events independently. Orchestration: a central coordinator directs each step. Orchestration is easier to debug; choreography is more decoupled.
