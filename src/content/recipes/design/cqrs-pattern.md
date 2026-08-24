---

contentType: recipes
slug: cqrs-pattern-recipe
title: "Scale Read and Write Workloads with CQRS"
description: "How to separate read and write models using Command Query Responsibility Segregation for optimized queries, event sourcing, and independent scaling of read and write paths."
metaDescription: "Learn CQRS to scale read and write workloads. Separate read and write models for optimized queries, event sourcing, and independent scaling of paths."
difficulty: advanced
topics:
  - design
tags:
  - design
  - cqrs
  - design-pattern
  - pattern
  - oop
relatedResources:
  - /recipes/domain-driven-design
  - /recipes/microservices-patterns
  - /recipes/event-driven-functions
  - /recipes/database-migrations
  - /recipes/observer-pattern-recipe
lastUpdated: "2026-06-14"
publishedAt: "2026-06-14"
author: Mathias Paulenko
seo:
  metaDescription: "Learn CQRS to scale read and write workloads. Separate read and write models for optimized queries, event sourcing, and independent scaling of paths."
  keywords:
    - cqrs pattern
    - command query responsibility segregation
    - read write model
    - event sourcing cqrs
    - scalable queries

---

## Overview

Traditional CRUD applications use a single data model for both reading and writing. A relational table serves `SELECT` queries for dashboards and `INSERT/UPDATE` operations for form submissions. This simplicity works for small domains but breaks down at scale. Write-optimized schemas (normalized, transactional) are slow for complex reads. Read-optimized schemas (denormalized, indexed) are expensive to update. As traffic grows, both workloads compete for the same database resources.

Command Query Responsibility Segregation (CQRS) splits the data model into two: a write model optimized for commands (create, update, delete) and a read model optimized for queries. Commands mutate state in the write model and publish events. Event handlers update read models — denormalized projections tailored for specific query patterns. The two models can use different databases, different schemas, and scale independently. This approach handles CQRS implementation with event sourcing and projection patterns. See also [Specification Pattern](/patterns/specification-pattern).

## When to use it

Use this recipe when:

- Read and write volumes differ considerably (100:1 read-heavy ratios are common). See [Database Read Replicas](/recipes/database-read-replicas/) for read scaling.
- Complex queries require joins across multiple aggregates, degrading write performance. See [SQL Joins](/recipes/sql-joins/) for query optimization.
- Building real-time dashboards, analytics, or search that needs data shaped differently than the transactional model
- Working with event-sourced systems where state is derived from a sequence of events. See [Event Sourcing](/recipes/event-sourcing-relational/) for event store patterns.
- Teams need to optimize read and write schemas independently without coordination

## Solution

### Command Handler with Event Publishing (TypeScript)

```typescript
interface Event {
  type: string;
  aggregateId: string;
  payload: unknown;
  occurredAt: Date;
}

interface EventStore {
  append(events: Event[]): Promise<void>;
  getEvents(aggregateId: string): Promise<Event[]>;
}

class OrderWriteModel {
  constructor(
    public id: string,
    public customerId: string,
    public items: Array<{ productId: string; quantity: number; price: number }>,
    public status: 'pending' | 'paid' | 'shipped' = 'pending'
  ) {}

  pay(paymentMethod: string): Event[] {
    if (this.status !== 'pending') throw new Error('Order already paid');
    return [{
      type: 'OrderPaid',
      aggregateId: this.id,
      payload: { paymentMethod, total: this.total() },
      occurredAt: new Date(),
    }];
  }

  total(): number {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
}

class PayOrderCommand {
  constructor(
    public orderId: string,
    public paymentMethod: string
  ) {}
}

class PayOrderHandler {
  constructor(private eventStore: EventStore) {}

  async handle(command: PayOrderCommand): Promise<void> {
    const events = await this.eventStore.getEvents(command.orderId);
    const order = this.rehydrate(events);

    const newEvents = order.pay(command.paymentMethod);
    await this.eventStore.append(newEvents);
  }

  private rehydrate(events: Event[]): OrderWriteModel {
    // Apply events to rebuild state
    const order = new OrderWriteModel(events[0].aggregateId, '', []);
    for (const event of events) {
      // Apply each event to mutate order state
    }
    return order;
  }
}
```

### Read Model Projection (SQL)

```sql
-- Denormalized read model for order summaries
CREATE TABLE order_summaries (
  order_id UUID PRIMARY KEY,
  customer_name VARCHAR(255),
  total_amount DECIMAL(10,2),
  item_count INT,
  status VARCHAR(20),
  last_updated TIMESTAMP
);

-- Projection handler updates read model when events occur
CREATE OR REPLACE FUNCTION project_order_paid()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE order_summaries
  SET status = 'paid', last_updated = NEW.occurred_at
  WHERE order_id = NEW.aggregate_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Event Handler Updating Read Model (Node.js)

```javascript
class OrderProjection {
  constructor(private readDb, private elasticsearch) {}

  async handleOrderPaid(event) {
    // Update relational read model
    await this.readDb.query(
      'UPDATE order_summaries SET status = $1, last_updated = $2 WHERE order_id = $3',
      ['paid', event.occurredAt, event.aggregateId]
    );

    // Update search index
    await this.elasticsearch.update({
      index: 'orders',
      id: event.aggregateId,
      doc: { status: 'paid', paidAt: event.occurredAt }
    });
  }

  async handleOrderCreated(event) {
    await this.readDb.query(
      `INSERT INTO order_summaries (order_id, customer_name, total_amount, item_count, status, last_updated)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [event.aggregateId, event.payload.customerName, event.payload.total,
       event.payload.items.length, 'pending', event.occurredAt]
    );
  }
}
```

## Explanation

- **Command model**: handles state changes. Each command is validated against invariants, mutates the write model, and produces domain events. The write model is normalized and transactional — it enforces business rules at the cost of query complexity.
- **Event sourcing**: instead of storing current state, store the sequence of events that led to it. The write model appends events to an event store. State is rehydrated by replaying events. This provides complete audit history and temporal querying.
- **Read model (projection)**: a denormalized, query-optimized view built from events. A `customer_orders` read model might flatten order items, customer names, and shipping status into a single table with appropriate indexes. It is built and updated asynchronously.
- **Eventual consistency**: when a command completes, the read model is not immediately updated. There is a brief window (milliseconds to seconds) where the write model reflects the change but the read model does not. This is eventual consistency — acceptable for most read-heavy systems.

## Variants

| Approach | Write model | Read model | Consistency | Best for |
|----------|-------------|------------|-------------|----------|
| Single DB, separate views | Relational | Materialized views | Strong | Simple CQRS |
| Dual DB | Relational | Document/Search | Eventual | High read scale |
| Event sourcing | Event store | Multiple projections | Eventual | Audit, temporal queries |
| Read replicas | Primary DB | Replica DB | Near-strong | Read scaling without complexity |

## What Works

- **Keep read models simple and disposable**: a read model is a cache, not a source of truth. If corrupted, rebuild it by replaying events from the beginning. Do not put business logic or write operations in read models.
- **Version your events**: as schemas evolve, older projections must still understand historical events. Include a version field in events and write handlers for each version. This allows gradual migration without downtime.
- **Use idempotent projections**: event handlers may run multiple times (at-least-once delivery). Design projections so that processing the same event twice produces the same result. Use `UPSERT` instead of `INSERT`.
- **Monitor projection lag**: the delay between write and read model updates must be bounded. Alert if projection lag exceeds your SLA (e.g., 5 seconds). Slow projections indicate backpressure or inefficient event handlers.
- **Start simple, evolve to CQRS**: do not build CQRS from day one on a greenfield project. Start with a single model. When read complexity or performance becomes a problem, extract a read model. Premature CQRS adds unnecessary complexity.

## Common mistakes

- **CQRS without a reason**: if your application has simple CRUD with equal read/write ratios, CQRS adds complexity with no benefit. Use it when read/write asymmetry or query complexity justifies the split.
- **Putting business rules in read models**: read models are for querying. If you find yourself validating or mutating state in a projection, you have violated the separation. Business rules belong in command handlers.
- **Ignoring eventual consistency in UX**: users may submit a form and immediately refresh, seeing stale data. Design the UI to handle this — show a success message, optimistically update, or redirect to a confirmation page rather than immediately querying the read model.
- **Replaying events from the beginning on every deploy**: in development, it is tempting to wipe the read model and rebuild from scratch. In production with billions of events, this takes days. Implement snapshotting — periodically save aggregate state so replays start from the snapshot, not event 1.

## FAQ

**Q: Is CQRS the same as event sourcing?**
A: No. CQRS separates reads and writes. [Event sourcing](/recipes/event-sourcing-relational/) stores state as events. They are often used together because event sourcing naturally produces events that can populate read models. But you can use CQRS without event sourcing (e.g., dual databases) and event sourcing without CQRS (single model rebuilt from events).

**Q: How do I handle queries that need real-time data?**
A: For truly real-time requirements (sub-second), query the write model directly. Accept the performance cost for the small subset of queries that need perfect freshness. Most dashboards and lists can tolerate eventual consistency.

**Q: What happens if a projection fails?**
A: Failed projections should not block the write path. Use a dead-letter queue for failed events. Fix the projection handler and replay from the failure point. The write model remains available throughout.

**Q: Can I use CQRS with a relational database?**
A: Yes. The write model can be a normalized relational schema. The read model can be a separate schema with denormalized views, or a different technology entirely (Elasticsearch, Redis, ClickHouse). Use whatever fits the query pattern.


### Python Implementation with Event Sourcing

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Any
from abc import ABC, abstractmethod
import uuid

@dataclass
class Event:
    type: str
    aggregate_id: str
    payload: Any
    occurred_at: datetime = field(default_factory=datetime.utcnow)

class EventStore(ABC):
    @abstractmethod
    async def append(self, events: List[Event]) -> None:
        ...

    @abstractmethod
    async def get_events(self, aggregate_id: str) -> List[Event]:
        ...

@dataclass
class OrderItem:
    product_id: str
    quantity: int
    price: float

class OrderWriteModel:
    def __init__(self, order_id: str, customer_id: str, items: List[OrderItem]):
        self.id = order_id
        self.customer_id = customer_id
        self.items = items
        self.status = 'pending'

    def pay(self, payment_method: str) -> List[Event]:
        if self.status != 'pending':
            raise ValueError('Order already paid')
        self.status = 'paid'
        return [Event(
            type='OrderPaid',
            aggregate_id=self.id,
            payload={'payment_method': payment_method, 'total': self.total()}
        )]

    def total(self) -> float:
        return sum(item.price * item.quantity for item in self.items)

class PayOrderHandler:
    def __init__(self, event_store: EventStore):
        self._event_store = event_store

    async def handle(self, order_id: str, payment_method: str) -> None:
        events = await self._event_store.get_events(order_id)
        order = self._rehydrate(events)
        new_events = order.pay(payment_method)
        await self._event_store.append(new_events)

    def _rehydrate(self, events: List[Event]) -> OrderWriteModel:
        if not events:
            raise ValueError('No events found for order')
        order = OrderWriteModel(events[0].aggregate_id, '', [])
        for event in events:
            if event.type == 'OrderCreated':
                order.customer_id = event.payload['customer_id']
                order.items = [OrderItem(**i) for i in event.payload['items']]
            elif event.type == 'OrderPaid':
                order.status = 'paid'
        return order
```

### Snapshotting for Large Event Streams

```typescript
interface Snapshot {
  aggregateId: string;
  version: number;
  state: unknown;
}

class SnapshotStore {
  async save(snapshot: Snapshot): Promise<void> {
    // Persist snapshot to database
  }

  async load(aggregateId: string): Promise<Snapshot | null> {
    // Load latest snapshot
    return null;
  }
}

class PayOrderHandlerWithSnapshots {
  constructor(
    private eventStore: EventStore,
    private snapshots: SnapshotStore
  ) {}

  async handle(command: PayOrderCommand): Promise<void> {
    const snapshot = await this.snapshots.load(command.orderId);
    let order: OrderWriteModel;
    let fromVersion = 0;

    if (snapshot) {
      order = snapshot.state as OrderWriteModel;
      fromVersion = snapshot.version;
    } else {
      const events = await this.eventStore.getEvents(command.orderId);
      order = this.rehydrate(events);
      fromVersion = events.length;
    }

    // Apply only events after snapshot
    const recentEvents = await this.eventStore.getEventsAfter(
      command.orderId, fromVersion
    );
    for (const event of recentEvents) {
      this.apply(order, event);
    }

    const newEvents = order.pay(command.paymentMethod);
    await this.eventStore.append(newEvents);

    // Save snapshot every 100 events
    if (fromVersion + recentEvents.length + newEvents.length >= 100) {
      await this.snapshots.save({
        aggregateId: command.orderId,
        version: fromVersion + recentEvents.length + newEvents.length,
        state: order,
      });
    }
  }

  private apply(order: OrderWriteModel, event: Event): void {
    // Apply event to order
  }

  private rehydrate(events: Event[]): OrderWriteModel {
    return new OrderWriteModel(events[0]?.aggregateId ?? '', '', []);
  }
}
```

### Separate Read Database with Redis

```typescript
class OrderReadModelRedis {
  constructor(private redis: RedisClient) {}

  async getOrderSummary(orderId: string): Promise<OrderSummary | null> {
    const data = await this.redis.hgetall(`order:${orderId}:summary`);
    if (!data || Object.keys(data).length === 0) return null;

    return {
      orderId,
      customerName: data.customerName,
      totalAmount: parseFloat(data.totalAmount),
      itemCount: parseInt(data.itemCount, 10),
      status: data.status,
    };
  }

  async handleOrderCreated(event: Event): Promise<void> {
    await this.redis.hset(`order:${event.aggregateId}:summary`, {
      customerName: event.payload.customerName,
      totalAmount: event.payload.total.toString(),
      itemCount: event.payload.items.length.toString(),
      status: 'pending',
    });
  }

  async handleOrderPaid(event: Event): Promise<void> {
    await this.redis.hset(`order:${event.aggregateId}:summary`, {
      status: 'paid',
    });
  }
}
```



