---
contentType: patterns
slug: domain-event-pattern
title: "Domain Event Pattern"
description: "Capture and publish major occurrences within a domain model to decouple side effects from core business logic and enable reactive workflows."
metaDescription: "Learn the Domain Event Pattern for decoupling business logic from side effects. Examples in Python, Java, and JavaScript with event sourcing."
difficulty: intermediate
topics:
  - design
tags:
  - domain-event
  - pattern
  - design-pattern
  - behavioral
  - ddd
  - event-driven
  - decoupling
  - messaging
relatedResources:
  - /patterns/design/aggregate-pattern
  - /patterns/design/outbox-pattern
  - /patterns/design/event-bus-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Domain Event Pattern for decoupling business logic from side effects. Examples in Python, Java, and JavaScript with event sourcing."
  keywords:
    - domain event
    - design pattern
    - event driven
    - ddd
    - decoupling
---

# Domain Event Pattern

## Overview

The Domain Event Pattern captures major business occurrences within a domain model as first-class objects. When something meaningful happens — an order is placed, a user is registered, a payment fails — the domain emits an event. Other parts of the system react to these events rather than being called directly.

This decouples core business logic from side effects like sending emails, updating analytics, or notifying downstream services. Domain events also enable event sourcing, where the state of an aggregate is reconstructed by replaying its event history.

## When to Use

Use the Domain Event Pattern when:
- Side effects should not be triggered directly by business logic
- Multiple subsystems need to react to the same business occurrence
- You need an audit trail of what happened in the system and when
- Eventual consistency between bounded contexts is acceptable
- You want to enable event sourcing for aggregates

## When to Avoid

- Simple CRUD applications where direct method calls are sufficient
- Synchronous operations where immediate feedback is required
- Debugging event chains becomes difficult in large systems
- Over-abstraction: not every setter needs to emit an event

## Solution

### Python

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Callable
from uuid import UUID, uuid4


@dataclass(frozen=True)
class DomainEvent:
    event_id: UUID = field(default_factory=uuid4)
    occurred_at: datetime = field(default_factory=datetime.now)
    aggregate_id: str = ""
    event_type: str = ""
    payload: dict = field(default_factory=dict)


class EventPublisher:
    _handlers: List[Callable] = []

    @classmethod
    def subscribe(cls, handler: Callable):
        cls._handlers.append(handler)

    @classmethod
    def publish(cls, event: DomainEvent):
        for handler in cls._handlers:
            handler(event)


class Order:
    def __init__(self, customer_id: str):
        self.id = str(uuid4())
        self.customer_id = customer_id
        self.lines = []
        self.status = "pending"
        self._events: List[DomainEvent] = []

    def add_line(self, product_id: str, quantity: int, price: float):
        self.lines.append({"product_id": product_id, "quantity": quantity, "price": price})

    def submit(self):
        if not self.lines:
            raise ValueError("Cannot submit empty order")
        self.status = "submitted"
        self._events.append(DomainEvent(
            aggregate_id=self.id,
            event_type="OrderSubmitted",
            payload={"customer_id": self.customer_id, "line_count": len(self.lines)}
        ))

    def clear_events(self):
        events = list(self._events)
        self._events.clear()
        return events


# Usage
order = Order("cust-123")
order.add_line("prod-1", 2, 9.99)
order.submit()

for event in order.clear_events():
    EventPublisher.publish(event)
```

### Java

```java
import java.time.Instant;
import java.util.*;

public record DomainEvent(
    UUID eventId,
    Instant occurredAt,
    String aggregateId,
    String eventType,
    Map<String, Object> payload
) {
    public DomainEvent(String aggregateId, String eventType, Map<String, Object> payload) {
        this(UUID.randomUUID(), Instant.now(), aggregateId, eventType, payload);
    }
}

class EventPublisher {
    private static final List<java.util.function.Consumer<DomainEvent>> handlers = new ArrayList<>();

    public static void subscribe(java.util.function.Consumer<DomainEvent> handler) {
        handlers.add(handler);
    }

    public static void publish(DomainEvent event) {
        handlers.forEach(h -> h.accept(event));
    }
}

class Order {
    private final UUID id = UUID.randomUUID();
    private final String customerId;
    private final List<Map<String, Object>> lines = new ArrayList<>();
    private String status = "pending";
    private final List<DomainEvent> events = new ArrayList<>();

    public Order(String customerId) {
        this.customerId = customerId;
    }

    public void addLine(String productId, int quantity, double price) {
        lines.add(Map.of("product_id", productId, "quantity", quantity, "price", price));
    }

    public void submit() {
        if (lines.isEmpty()) throw new IllegalStateException("Cannot submit empty order");
        status = "submitted";
        events.add(new DomainEvent(
            id.toString(), "OrderSubmitted",
            Map.of("customer_id", customerId, "line_count", lines.size())
        ));
    }

    public List<DomainEvent> clearEvents() {
        List<DomainEvent> result = new ArrayList<>(events);
        events.clear();
        return result;
    }
}

// Usage
EventPublisher.subscribe(event -> System.out.println("Received: " + event.eventType()));
Order order = new Order("cust-123");
order.addLine("prod-1", 2, 9.99);
order.submit();
order.clearEvents().forEach(EventPublisher::publish);
```

### JavaScript

```javascript
class DomainEvent {
  constructor(aggregateId, eventType, payload = {}) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date().toISOString();
    this.aggregateId = aggregateId;
    this.eventType = eventType;
    this.payload = payload;
  }
}

class EventPublisher {
  static handlers = [];

  static subscribe(handler) {
    this.handlers.push(handler);
  }

  static publish(event) {
    this.handlers.forEach(h => h(event));
  }
}

class Order {
  constructor(customerId) {
    this.id = crypto.randomUUID();
    this.customerId = customerId;
    this.lines = [];
    this.status = 'pending';
    this._events = [];
  }

  addLine(productId, quantity, price) {
    this.lines.push({ productId, quantity, price });
  }

  submit() {
    if (this.lines.length === 0) throw new Error('Cannot submit empty order');
    this.status = 'submitted';
    this._events.push(new DomainEvent(
      this.id, 'OrderSubmitted',
      { customer_id: this.customerId, line_count: this.lines.length }
    ));
  }

  clearEvents() {
    const events = [...this._events];
    this._events = [];
    return events;
  }
}

// Usage
EventPublisher.subscribe(event => console.log('Received:', event.eventType));
const order = new Order('cust-123');
order.addLine('prod-1', 2, 9.99);
order.submit();
order.clearEvents().forEach(e => EventPublisher.publish(e));
```

## Explanation

A Domain Event is:

- **Immutable**: Once created, it never changes. It represents something that already happened.
- **Named in past tense**: `OrderSubmitted`, `PaymentFailed`, `UserRegistered`.
- **Rich in context**: Includes the aggregate ID, timestamp, and relevant payload data.
- **Published after state changes**: The aggregate changes state first, then emits events describing what changed.

## Variants

| Variant | Delivery | Use Case |
|---------|----------|----------|
| **In-memory** | Synchronous within process | Simple decoupling inside a monolith |
| **Outbox** | Async via database table | Reliable cross-service delivery |
| **Event Sourcing** | Events are the source of truth | Full audit trail and temporal queries |
| **CQRS** | Read model projections | Separate read and write models |

## What Works

- **Name events in past tense.** `OrderPlaced`, not `PlaceOrder`. Events describe things that already happened.
- **Keep events small.** Include only the data needed for consumers. Do not include full aggregate state.
- **Use UUIDs for event IDs.** This enables idempotency and traceability across services.
- **Include timestamps.** `occurred_at` helps with ordering, debugging, and analytics.
- **Clear events after publishing.** Aggregates should not accumulate unbounded event lists in memory.

## Common Mistakes

- **Emitting events before state changes.** If the state change fails, the event has already been published, causing inconsistency.
- **Forgetting to clear events** causes memory leaks and duplicate publishing on subsequent operations.
- **Putting too much data in payloads** bloats the event bus and couples consumers to internal structures.
- **Treating commands as events.** `PlaceOrder` is a command; `OrderPlaced` is an event. Do not confuse them.
- **Missing event versioning.** As the payload schema evolves, old consumers break. Version your events.

## Real-World Examples

### Axon Framework

Java framework built around domain events and event sourcing. Aggregates emit events; event handlers build read models.

### EventStoreDB

A database designed for event sourcing. Streams of domain events are persisted as the primary data model.

### Stripe Webhooks

Stripe publishes `charge.succeeded`, `invoice.paid`, and other domain events to webhooks. Your application reacts to them asynchronously.

## Frequently Asked Questions

**Q: What is the difference between a Domain Event and an Integration Event?**
A: Domain events stay within a bounded context. Integration events cross service boundaries and are usually published via a message broker.

**Q: Should I store domain events in a database?**
A: Yes, if you use event sourcing or the outbox pattern. For simple in-memory decoupling, storage is optional.

**Q: Can I modify a domain event after creating it?**
A: No. Events represent immutable facts. If you need to correct something, publish a compensating event like `OrderCancelled`.
