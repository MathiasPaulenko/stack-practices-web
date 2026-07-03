---
contentType: guides
slug: event-sourcing-guide
title: "Event Sourcing — State as a Sequence of Events"
description: "A deep dive into Event Sourcing: persist state changes as events, reconstruct aggregates from history, and build audit trails by design."
metaDescription: "Learn Event Sourcing with aggregate reconstruction, event stores, snapshots, and projections. Complete guide for auditable, event-driven systems."
difficulty: advanced
topics:
  - architecture
  - design
tags:
  - event-sourcing
  - cqrs
  - event-store
  - audit-trail
  - domain-events
  - event-driven
  - guide
relatedResources:
  - /guides/cqrs-guide
  - /guides/cqrs-event-sourcing-combined-guide
  - /guides/hexagonal-architecture-guide
  - /patterns/design/event-bus-pattern
  - /patterns/design/outbox-pattern
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Learn Event Sourcing with aggregate reconstruction, event stores, snapshots, and projections. Complete guide for auditable, event-driven systems."
  keywords:
    - event-sourcing
    - cqrs
    - event-store
    - audit-trail
    - domain-events
    - event-driven
    - guide
---

## Overview

Event Sourcing is an architectural pattern where the state of an application is stored not as a current snapshot, but as a sequence of immutable events. Instead of updating a row in a database, you append an event describing what happened. The current state is derived by replaying all events for an aggregate. This approach provides a complete audit trail, enables temporal queries, and naturally supports event-driven architectures.

## When to Use

- Audit requirements demand knowing exactly how every state change occurred
- You need to reconstruct past states for debugging or compliance
- Event-driven communication between bounded contexts is already planned
- Temporal queries ("what did the account look like last Tuesday?") are common
- You want to decouple write and read models with projections

## When NOT to Use

- Simple CRUD with no audit or temporal query needs
- Teams unfamiliar with eventual consistency and distributed systems
- Domains where events are hard to define or change frequently
- High-frequency writes where event replay would be too slow without snapshots

## Core Concepts

### Events

Events are immutable, past-tense facts that describe something that happened in the domain.

```typescript
interface DomainEvent {
  eventId: string;
  aggregateId: string;
  eventType: string;
  version: number;
  occurredAt: Date;
  payload: Record<string, unknown>;
}

interface OrderCreatedEvent extends DomainEvent {
  eventType: 'OrderCreated';
  payload: {
    customerId: string;
    items: { productId: string; quantity: number; price: number }[];
    shippingAddress: Address;
  };
}

interface OrderConfirmedEvent extends DomainEvent {
  eventType: 'OrderConfirmed';
  payload: {
    confirmedAt: Date;
    paymentReference: string;
  };
}
```

### Aggregates

Aggregates are the consistency boundaries that emit and apply events. They reconstruct their state by folding events.

```typescript
class Order {
  private events: DomainEvent[] = [];
  private status: OrderStatus = OrderStatus.PENDING;
  private items: OrderItem[] = [];

  static create(data: CreateOrderData): Order {
    const order = new Order();
    order.apply(new OrderCreatedEvent({
      aggregateId: generateId(),
      eventId: generateId(),
      version: 1,
      occurredAt: new Date(),
      payload: data
    }));
    return order;
  }

  confirm(paymentRef: string): void {
    if (this.status !== OrderStatus.PENDING) {
      throw new DomainError('Only pending orders can be confirmed');
    }
    this.apply(new OrderConfirmedEvent({
      aggregateId: this.id,
      eventId: generateId(),
      version: this.version + 1,
      occurredAt: new Date(),
      payload: { confirmedAt: new Date(), paymentReference: paymentRef }
    }));
  }

  private apply(event: DomainEvent): void {
    this.events.push(event);
    this.when(event);
  }

  private when(event: DomainEvent): void {
    switch (event.eventType) {
      case 'OrderCreated':
        this.id = event.aggregateId;
        this.items = event.payload.items.map(i => new OrderItem(i));
        break;
      case 'OrderConfirmed':
        this.status = OrderStatus.CONFIRMED;
        break;
    }
  }

  // Reconstruct from history
  static fromHistory(events: DomainEvent[]): Order {
    const order = new Order();
    for (const event of events.sort((a, b) => a.version - b.version)) {
      order.when(event);
      order.version = event.version;
    }
    return order;
  }

  getUncommittedEvents(): DomainEvent[] {
    return [...this.events];
  }
}
```

## Event Store

The event store is an append-only log of all domain events. It must support:

- Appending events atomically per aggregate
- Reading all events for an aggregate in order
- Optimistic concurrency control (version check)
- Optional: global ordering for projections

```sql
CREATE TABLE events (
  event_id UUID PRIMARY KEY,
  aggregate_id UUID NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,
  event_type VARCHAR(200) NOT NULL,
  version INTEGER NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE (aggregate_id, version)
);

CREATE INDEX idx_events_aggregate ON events(aggregate_id, version);
CREATE INDEX idx_events_occurred ON events(occurred_at);
```

## Snapshots

For aggregates with thousands of events, replaying from event 1 is slow. Snapshots cache state at a specific version.

```typescript
interface Snapshot {
  aggregateId: string;
  aggregateType: string;
  version: number;
  state: SerializedState;
  createdAt: Date;
}

class AggregateRepository<T> {
  constructor(
    private eventStore: EventStore,
    private snapshotStore: SnapshotStore,
    private snapshotFrequency: number = 100
  ) {}

  async findById(id: string): Promise<T | null> {
    const snapshot = await this.snapshotStore.getLatest(id);
    const fromVersion = snapshot ? snapshot.version : 0;

    const events = await this.eventStore.getEvents(id, fromVersion + 1);
    if (events.length === 0 && !snapshot) return null;

    const aggregate = snapshot
      ? this.hydrateFromSnapshot(snapshot, events)
      : this.hydrateFromEvents(events);

    return aggregate;
  }

  async save(aggregate: T): Promise<void> {
    const events = aggregate.getUncommittedEvents();
    await this.eventStore.append(events);

    if (aggregate.version % this.snapshotFrequency === 0) {
      await this.snapshotStore.save(aggregate.toSnapshot());
    }
  }
}
```

## Projections

Projections build read models by listening to events and updating query-optimized stores.

```typescript
class OrderSummaryProjection {
  constructor(private readDb: ReadDatabase) {}

  async handle(event: DomainEvent): Promise<void> {
    switch (event.eventType) {
      case 'OrderCreated':
        await this.readDb.orderSummaries.insert({
          orderId: event.aggregateId,
          customerId: event.payload.customerId,
          total: event.payload.items.reduce((s, i) => s + i.price * i.quantity, 0),
          itemCount: event.payload.items.length,
          status: 'pending',
          createdAt: event.occurredAt
        });
        break;

      case 'OrderConfirmed':
        await this.readDb.orderSummaries.update(
          { orderId: event.aggregateId },
          { status: 'confirmed', confirmedAt: event.payload.confirmedAt }
        );
        break;
    }
  }
}
```

## Common Pitfalls

- **Schema evolution** — events are immutable contracts; plan migration strategies early
- **Event explosion** — not every field change needs an event; model meaningful domain events
- **Snapshot neglect** — forgetting snapshots makes reconstruction unbearably slow
- **Projection inconsistency** — projections must be idempotent and handle out-of-order events

## FAQ

**How do I delete data under GDPR?**
Use cryptographic erasure (delete the encryption key for sensitive payloads) or model explicit `DataAnonymized` events.

**Can I use a relational database as an event store?**
Yes, PostgreSQL with JSONB works well for moderate scale. For high throughput, use specialized stores like EventStoreDB.

**How do I test event-sourced aggregates?**
Assert on emitted events, not on state. Given a sequence of events, when a command runs, then specific events should be emitted.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.
