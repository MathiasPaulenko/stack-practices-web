---
contentType: guides
slug: event-driven-architecture-guide
title: "Event-Driven Architecture — Queues, Topics, and Streams"
description: "A practical guide to event-driven architecture: events vs commands, message brokers, patterns like CQRS and Saga, and when to choose async over sync."
metaDescription: "Event-driven architecture guide: events vs commands, message brokers, CQRS, Saga pattern. Learn when to use queues, topics, and streams in distributed systems."
difficulty: advanced
topics:
  - architecture
  - devops
tags:
  - architecture
  - cqrs
  - devops
  - event-driven
  - guide
  - saga
relatedResources:
  - /guides/architecture/microservices-architecture-guide
  - /guides/architecture/domain-driven-design-guide
  - /guides/devops/docker-for-developers-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Event-driven architecture guide: events vs commands, message brokers, CQRS, Saga pattern. Learn when to use queues, topics, and streams in distributed systems."
  keywords:
    - event driven architecture
    - message brokers kafka
    - cqrs pattern
    - saga pattern
    - event sourcing
    - asynchronous communication
---

# Event-Driven Architecture

## Introduction

Event-driven architecture (EDA) is a pattern where services communicate by producing and consuming events rather than direct calls. It decouples producers from consumers, enables scalability, and naturally supports temporal decoupling — consumers do not need to be online when events are produced.

## Events vs Commands

Understanding the difference is fundamental to designing EDA correctly.

| | Event | Command |
|---|-------|---------|
| **Intent** | Something happened | Do something |
| **Direction** | Broadcast (many may listen) | Directed (one handler) |
| **Example** | `OrderPlaced` | `ChargeCustomer` |
| **Failure handling** | Consumers handle their own retries | Sender must know if it failed |
| **Coupling** | Loose | Tighter |

```python
# Event: the order service announces an order was placed
def publish_order_placed(order):
    bus.publish("orders.placed", {
        "order_id": order.id,
        "user_id": order.user_id,
        "total": order.total
    })

# Command: the order service tells the payment service to charge
# (Do this only when the payment service MUST process it)
def charge_customer(payment_request):
    payment_service.charge(payment_request)  # synchronous or command queue
```

**Rule of thumb:** Prefer events. Use commands only when the action must happen and the caller needs to know the result.

## Message Broker Types

### Queues (Point-to-Point)

One message → one consumer. Good for distributing work.

```python
import pika

# Producer
channel.basic_publish(exchange='', routing_key='email_queue', body=message)

# Consumer (one of many workers)
channel.basic_consume(queue='email_queue', on_message_callback=process_email)
```

**Use for:** background jobs, task queues, load leveling.

### Topics (Publish-Subscribe)

One message → many consumers. Good for broadcasting.

```python
# Kafka: one event, multiple consumer groups
producer.send('orders', order_event)

# Consumer group A: sends confirmation email
consumer_a.subscribe(['orders'])

# Consumer group B: updates analytics warehouse
consumer_b.subscribe(['orders'])
```

**Use for:** fan-out, event sourcing, cross-service notifications.

### Streams

Ordered, replayable, durable log of events.

| Feature | Queue | Topic | Stream |
|---------|-------|-------|--------|
| Durability | Until consumed | Until all groups consume | Retained by policy (days) |
| Ordering | Within queue | Within partition | Within partition |
| Replay | No | No | Yes |
| Parallelism | Multiple consumers | Consumer groups | Consumer groups |

**Use streams when:** you need replay, ordering guarantees, or event sourcing.

## Core Patterns

### 1. Event Notification

The simplest pattern: one service notifies others that something happened.

```
Order Service ──OrderPlaced──> Email Service (send confirmation)
               ──OrderPlaced──> Analytics Service (record metrics)
               ──OrderPlaced──> Inventory Service (reserve stock)
```

**Trade-off:** Consumers are responsible for fetching data they need. The event is a notification, not a payload.

### 2. Event-Carried State Transfer

The event carries the data consumers need, eliminating extra queries.

```json
{
  "event_type": "OrderPlaced",
  "order_id": "ord-123",
  "user_id": "usr-456",
  "items": [
    {"sku": "A1", "qty": 2, "price": 10.00}
  ],
  "total": 20.00,
  "timestamp": "2024-06-12T10:00:00Z"
}
```

**Trade-off:** Events are larger and may carry data consumers do not need. Versioning becomes important as schemas evolve.

### 3. CQRS (Command Query Responsibility Segregation)

Separate read and write models. Writes go to the command model; reads come from optimized read models populated by events. See [database design](/guides/databases/database-design-guide).

```
┌──────────────┐    OrderPlaced event     ┌──────────────┐
│  Command     │ ───────────────────────> │  Read Model  │
│  Model       │                          │  (Elastic)   │
│  (PostgreSQL)│                          │  for search  │
└──────────────┘                          └──────────────┘
```

**When to use:** Read and write patterns differ significantly (e.g., relational writes, search-optimized reads).

### 4. Saga Pattern

Manage distributed transactions using a sequence of local transactions, each publishing an event that triggers the next. Common in [microservices](/guides/architecture/microservices-architecture-guide).

```
Order Service: create order → publish OrderCreated
Payment Service: charge card → publish PaymentProcessed
Inventory Service: reserve stock → publish InventoryReserved
Shipping Service: create shipment → publish ShipmentCreated
```

**Compensating transactions** undo previous steps if a later step fails:

```python
def on_payment_failed(event):
    # Compensate: cancel the order
    order_service.cancel(event.order_id)
    inventory_service.release(event.order_id)
```

**When to use:** Long-running business processes that span multiple services.

## When to Choose Async Over Sync

| Sync (REST/gRPC) | Async (Events) |
|------------------|----------------|
| Real-time response needed | Eventual consistency acceptable |
| Tight coupling acceptable | Loose coupling required |
| Simple failure modes acceptable | Complex failure handling acceptable |
| Low latency critical | Throughput and resilience critical |

## Best Practices

- **Design events as facts, not instructions** — `OrderPlaced`, not `ProcessOrder`
- **Include correlation IDs** — [trace a request](/recipes/observability/distributed-tracing) across services and time
- **Make consumers idempotent** — at-least-once delivery means events may be processed twice. See [message idempotency](/recipes/messaging/message-idempotency).
- **Version your events** — `OrderPlacedV1`, `OrderPlacedV2` to support gradual migration
- **Monitor consumer lag** — lagging consumers are a sign of scaling or performance issues
- **Use dead letter queues** — failed messages should not block the queue. See [dead letter queues](/recipes/messaging/dead-letter-queue).

## Common Mistakes

- Treating events as commands — events announce facts; they do not demand action
- Not handling duplicate delivery — assume at-least-once and design for [idempotency](/recipes/messaging/message-idempotency)
- Ignoring consumer lag until it is a crisis — monitor and alert on lag metrics
- Building custom message brokers — use proven systems (Kafka, RabbitMQ, NATS, AWS SNS/SQS)
- Using events for simple request/response — adds unnecessary complexity

## Frequently Asked Questions

### How do I debug an event-driven system?

Use [distributed tracing](/recipes/observability/distributed-tracing) (OpenTelemetry, Jaeger) and correlation IDs. Log every event produced and consumed with the same trace ID. Build a "trace viewer" that shows the path of a request across services.

### What if a consumer is down when an event is published?

With durable message brokers (Kafka, persistent queues), events are retained. The consumer catches up when it comes back online. Set retention policies based on your recovery time objectives.

### Should every microservice communication be async?

No. Use sync for real-time queries and when the caller needs an immediate answer. Use async for background work, notifications, and decoupling. A healthy system uses both.
