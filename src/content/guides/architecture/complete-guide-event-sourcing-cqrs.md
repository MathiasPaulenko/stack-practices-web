---





contentType: guides
slug: complete-guide-event-sourcing-cqrs
title: "Event Sourcing and CQRS: Event Store, Projections"
description: "Master event sourcing and CQRS: event store design, aggregate roots, projections, read models, snapshots, sagas, and production patterns for event-driven systems."
metaDescription: "Master event sourcing and CQRS: event store design, aggregate roots, projections, read models, snapshots, sagas, and production patterns for event-driven systems."
difficulty: advanced
topics:
  - architecture
tags:
  - guide
  - event-sourcing
  - cqrs
  - event-store
  - projections
  - read-models
  - ddd
relatedResources:
  - /guides/complete-guide-modular-monolith
  - /guides/complete-guide-api-gateway-pattern
  - /patterns/event-sourcing-pattern
  - /guides/cqrs-event-sourcing-combined-guide
  - /guides/cqrs-guide
  - /guides/event-sourcing-guide
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 24
seo:
  metaDescription: "Master event sourcing and CQRS: event store design, aggregate roots, projections, read models, snapshots, sagas, and production patterns for event-driven systems."
  keywords:
    - event sourcing
    - cqrs
    - event store
    - aggregate root
    - projections
    - read models
    - snapshots
    - sagas





---

## Introduction

Event sourcing stores state changes as a sequence of events rather than mutable current state. CQRS separates read and write models — commands modify state, queries read from optimized projections. Together they provide an auditable, replayable, and scalable architecture for complex domains. The following walks through event store design, aggregate roots, projections, read models, snapshots, sagas, and production patterns.

## Core Concepts

```
Command → Aggregate → Event → Event Store → Projection → Read Model → Query

Write Side (Command):
  Client → Command Handler → Aggregate Root → Event → Event Store

Read Side (Query):
  Event Store → Projection → Read Model → Query Handler → Client
```

## Event Store

### Event schema

```sql
CREATE TABLE events (
    event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type      VARCHAR(100) NOT NULL,
    aggregate_id    UUID NOT NULL,
    aggregate_type  VARCHAR(50) NOT NULL,
    event_data      JSONB NOT NULL,
    metadata        JSONB NOT NULL DEFAULT '{}',
    version         INTEGER NOT NULL,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(aggregate_id, version)
);

CREATE INDEX idx_events_aggregate ON events(aggregate_id, version);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_timestamp ON events(timestamp);
```

### Event store implementation

```typescript
// eventstore/EventStore.ts — Append-only event storage
interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  data: Record<string, any>;
  metadata: Record<string, any>;
  version: number;
  timestamp: Date;
}

class PostgresEventStore {
  constructor(private readonly pool: Pool) {}

  async append(
    aggregateId: string,
    events: DomainEvent[],
    expectedVersion: number,
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Optimistic concurrency control
      const currentVersion = await this.getCurrentVersion(client, aggregateId);
      if (currentVersion !== expectedVersion) {
        throw new ConcurrencyError(
          `Expected version ${expectedVersion}, got ${currentVersion}`,
        );
      }

      // Append events
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        event.version = expectedVersion + i + 1;

        await client.query(
          `INSERT INTO events (event_id, event_type, aggregate_id, aggregate_type, event_data, metadata, version, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            event.eventId,
            event.eventType,
            event.aggregateId,
            event.aggregateType,
            JSON.stringify(event.data),
            JSON.stringify(event.metadata),
            event.version,
            event.timestamp,
          ],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getEvents(
    aggregateId: string,
    fromVersion: number = 0,
  ): Promise<DomainEvent[]> {
    const result = await this.pool.query(
      `SELECT * FROM events WHERE aggregate_id = $1 AND version > $2 ORDER BY version ASC`,
      [aggregateId, fromVersion],
    );

    return result.rows.map(this.mapRowToEvent);
  }

  async getEventsByType(
    eventType: string,
    fromTimestamp: Date = new Date(0),
  ): Promise<DomainEvent[]> {
    const result = await this.pool.query(
      `SELECT * FROM events WHERE event_type = $1 AND timestamp > $2 ORDER BY timestamp ASC`,
      [eventType, fromTimestamp],
    );

    return result.rows.map(this.mapRowToEvent);
  }

  private async getCurrentVersion(
    client: PoolClient,
    aggregateId: string,
  ): Promise<number> {
    const result = await client.query(
      `SELECT COALESCE(MAX(version), 0) as version FROM events WHERE aggregate_id = $1`,
      [aggregateId],
    );
    return result.rows[0].version;
  }

  private mapRowToEvent(row: any): DomainEvent {
    return {
      eventId: row.event_id,
      eventType: row.event_type,
      aggregateId: row.aggregate_id,
      aggregateType: row.aggregate_type,
      data: row.event_data,
      metadata: row.metadata,
      version: row.version,
      timestamp: row.timestamp,
    };
  }
}
```

## Aggregate Root

```typescript
// domain/OrderAggregate.ts — Aggregate root that applies events
abstract class AggregateRoot {
  protected id: string;
  protected version: number = 0;
  protected uncommittedEvents: DomainEvent[] = [];

  abstract apply(event: DomainEvent): void;

  protected raise(event: DomainEvent): void {
    this.apply(event);
    this.uncommittedEvents.push(event);
  }

  getUncommittedEvents(): DomainEvent[] {
    return this.uncommittedEvents;
  }

  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  getVersion(): number {
    return this.version;
  }

  loadFromHistory(events: DomainEvent[]): void {
    for (const event of events) {
      this.apply(event);
      this.version = event.version;
    }
  }
}

class OrderAggregate extends AggregateRoot {
  private customerId: string | null = null;
  private items: OrderItem[] = [];
  private status: OrderStatus = 'non-existent';
  private totalAmount: number = 0;

  // Command: Place order
  static place(
    orderId: string,
    customerId: string,
    items: OrderItemInput[],
  ): OrderAggregate {
    const order = new OrderAggregate();
    order.id = orderId;

    if (items.length === 0) {
      throw new Error('Cannot place an empty order');
    }

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    order.raise({
      eventId: crypto.randomUUID(),
      eventType: 'OrderPlaced',
      aggregateId: orderId,
      aggregateType: 'Order',
      data: {
        customerId,
        items: items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          price: i.price,
        })),
        totalAmount: total,
      },
      metadata: { correlationId: crypto.randomUUID() },
      version: 0,
      timestamp: new Date(),
    });

    return order;
  }

  // Command: Cancel order
  cancel(reason: string): void {
    if (this.status !== 'pending' && this.status !== 'processing') {
      throw new Error(`Cannot cancel order in ${this.status} state`);
    }

    this.raise({
      eventId: crypto.randomUUID(),
      eventType: 'OrderCancelled',
      aggregateId: this.id,
      aggregateType: 'Order',
      data: { reason, previousStatus: this.status },
      metadata: {},
      version: this.version,
      timestamp: new Date(),
    });
  }

  // Command: Ship order
  ship(trackingNumber: string): void {
    if (this.status !== 'processing') {
      throw new Error(`Cannot ship order in ${this.status} state`);
    }

    this.raise({
      eventId: crypto.randomUUID(),
      eventType: 'OrderShipped',
      aggregateId: this.id,
      aggregateType: 'Order',
      data: { trackingNumber },
      metadata: {},
      version: this.version,
      timestamp: new Date(),
    });
  }

  // Apply events to rebuild state
  apply(event: DomainEvent): void {
    switch (event.eventType) {
      case 'OrderPlaced':
        this.customerId = event.data.customerId;
        this.items = event.data.items;
        this.status = 'pending';
        this.totalAmount = event.data.totalAmount;
        break;
      case 'OrderCancelled':
        this.status = 'cancelled';
        break;
      case 'OrderShipped':
        this.status = 'shipped';
        break;
      case 'OrderCompleted':
        this.status = 'completed';
        break;
    }
    this.version = event.version;
  }
}
```

## Command Handler

```typescript
// application/OrderCommandHandler.ts — Process commands, save events
class OrderCommandHandler {
  constructor(
    private readonly eventStore: PostgresEventStore,
    private readonly eventBus: EventBus,
  ) {}

  async handlePlaceOrder(command: PlaceOrderCommand): Promise<string> {
    const orderId = crypto.randomUUID();

    // Create aggregate and apply command
    const order = OrderAggregate.place(
      orderId,
      command.customerId,
      command.items,
    );

    // Persist events
    await this.eventStore.append(
      orderId,
      order.getUncommittedEvents(),
      0,  // expected version for new aggregate
    );

    // Publish events to bus for projections
    for (const event of order.getUncommittedEvents()) {
      await this.eventBus.publish(event);
    }

    order.markEventsAsCommitted();
    return orderId;
  }

  async handleCancelOrder(command: CancelOrderCommand): Promise<void> {
    // Load aggregate from history
    const events = await this.eventStore.getEvents(command.orderId);
    if (events.length === 0) {
      throw new Error('Order not found');
    }

    const order = new OrderAggregate();
    order.loadFromHistory(events);

    // Apply command
    order.cancel(command.reason);

    // Persist new events
    const currentVersion = order.getVersion() - order.getUncommittedEvents().length;
    await this.eventStore.append(
      command.orderId,
      order.getUncommittedEvents(),
      currentVersion,
    );

    // Publish events
    for (const event of order.getUncommittedEvents()) {
      await this.eventBus.publish(event);
    }

    order.markEventsAsCommitted();
  }
}
```

## Projections and Read Models

```typescript
// projections/OrderProjection.ts — Build read model from events
class OrderProjection {
  constructor(private readonly readDb: ReadDatabase) {}

  async handle(event: DomainEvent): Promise<void> {
    switch (event.eventType) {
      case 'OrderPlaced':
        await this.readDb.execute(
          `INSERT INTO read_orders (id, customer_id, status, total_amount, item_count, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            event.aggregateId,
            event.data.customerId,
            'pending',
            event.data.totalAmount,
            event.data.items.length,
            event.timestamp,
          ],
        );

        // Insert order items
        for (const item of event.data.items) {
          await this.readDb.execute(
            `INSERT INTO read_order_items (order_id, product_id, quantity, price)
             VALUES ($1, $2, $3, $4)`,
            [event.aggregateId, item.productId, item.quantity, item.price],
          );
        }
        break;

      case 'OrderCancelled':
        await this.readDb.execute(
          `UPDATE read_orders SET status = $1, cancelled_at = $2 WHERE id = $3`,
          ['cancelled', event.timestamp, event.aggregateId],
        );
        break;

      case 'OrderShipped':
        await this.readDb.execute(
          `UPDATE read_orders SET status = $1, shipped_at = $2, tracking_number = $3 WHERE id = $4`,
          ['shipped', event.timestamp, event.data.trackingNumber, event.aggregateId],
        );
        break;

      case 'OrderCompleted':
        await this.readDb.execute(
          `UPDATE read_orders SET status = $1, completed_at = $2 WHERE id = $3`,
          ['completed', event.timestamp, event.aggregateId],
        );
        break;
    }
  }
}

// Wire projection to event bus
eventBus.subscribe('OrderPlaced', orderProjection);
eventBus.subscribe('OrderCancelled', orderProjection);
eventBus.subscribe('OrderShipped', orderProjection);
eventBus.subscribe('OrderCompleted', orderProjection);
```

## Query Handler

```typescript
// application/OrderQueryHandler.ts — Read from optimized read models
class OrderQueryHandler {
  constructor(private readonly readDb: ReadDatabase) {}

  async getOrderById(query: GetOrderByIdQuery): Promise<OrderView | null> {
    const result = await this.readDb.query(
      `SELECT * FROM read_orders WHERE id = $1`,
      [query.orderId],
    );
    return result.rows[0] || null;
  }

  async getOrdersByCustomer(query: GetOrdersByCustomerQuery): Promise<OrderView[]> {
    const result = await this.readDb.query(
      `SELECT * FROM read_orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [query.customerId, query.limit, query.offset],
    );
    return result.rows;
  }

  async getOrderStatistics(query: GetOrderStatisticsQuery): Promise<OrderStatistics> {
    const result = await this.readDb.query(
      `SELECT
         COUNT(*) as total_orders,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
         COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
         COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount END), 0) as revenue
       FROM read_orders
       WHERE created_at BETWEEN $1 AND $2`,
      [query.from, query.to],
    );
    return result.rows[0];
  }
}
```

## Snapshots

```typescript
// snapshots/SnapshotStore.ts — Optimize aggregate loading for long event streams
class SnapshotStore {
  constructor(private readonly db: Database) {}

  async save(aggregateId: string, snapshot: AggregateSnapshot): Promise<void> {
    await this.db.query(
      `INSERT INTO snapshots (aggregate_id, aggregate_type, version, state, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (aggregate_id, version) DO NOTHING`,
      [
        aggregateId,
        snapshot.aggregateType,
        snapshot.version,
        JSON.stringify(snapshot.state),
        new Date(),
      ],
    );
  }

  async getLatest(aggregateId: string): Promise<AggregateSnapshot | null> {
    const result = await this.db.query(
      `SELECT * FROM snapshots WHERE aggregate_id = $1 ORDER BY version DESC LIMIT 1`,
      [aggregateId],
    );
    return result.rows[0] || null;
  }
}

// Load aggregate with snapshot optimization
class OrderRepository {
  constructor(
    private readonly eventStore: PostgresEventStore,
    private readonly snapshotStore: SnapshotStore,
  ) {
    this.snapshotInterval = 100;  // Save snapshot every 100 events
  }

  async load(orderId: string): Promise<OrderAggregate> {
    // Try loading from snapshot first
    const snapshot = await this.snapshotStore.getLatest(orderId);

    let order = new OrderAggregate();
    let fromVersion = 0;

    if (snapshot) {
      order = Object.assign(new OrderAggregate(), snapshot.state);
      fromVersion = snapshot.version;
    }

    // Load remaining events after snapshot
    const events = await this.eventStore.getEvents(orderId, fromVersion);
    order.loadFromHistory(events);

    return order;
  }

  async save(order: OrderAggregate): Promise<void> {
    const events = order.getUncommittedEvents();
    const baseVersion = order.getVersion() - events.length;

    await this.eventStore.append(order.id, events, baseVersion);

    // Save snapshot if interval reached
    if (order.getVersion() % this.snapshotInterval === 0) {
      await this.snapshotStore.save(order.id, {
        aggregateType: 'Order',
        version: order.getVersion(),
        state: { ...order },
      });
    }

    order.markEventsAsCommitted();
  }
}
```

## Best Practices


- For a deeper guide, see [CQRS + Event Sourcing — Combined Guide](/guides/cqrs-event-sourcing-combined-guide/).

- Make events immutable and append-only — never update or delete events
- Use optimistic concurrency control — version numbers prevent conflicting writes
- Keep events small and focused — one event per state change, not a batch
- Use snapshots for long-lived aggregates — loading thousands of events is slow
- Make projections idempotent — replaying events should produce the same read model
- Use separate databases for write and read sides — scale independently
- Version your events — schema evolution requires upcasters for old events
- Use metadata for tracing — correlation IDs, causation IDs, user IDs
- Don't expose events in the API — events are internal, expose read models
- Test projections by replaying events — verify read model consistency

## Common Mistakes

- **Updating or deleting events**: events are the source of truth. Corrections are compensating events, not edits.
- **No optimistic concurrency**: concurrent commands corrupt state. Use version-based conflict detection.
- **Projections not idempotent**: replaying events creates duplicates. Use upserts or event ID tracking.
- **Loading full event stream without snapshots**: aggregates with thousands of events are slow. Use snapshots.
- **Business logic in projections**: projections should only translate events to read models. No domain rules.
- **Sharing database between write and read**: defeats the purpose of CQRS. Use separate stores.

## FAQ

### What is event sourcing?

An architecture where state changes are stored as a sequence of immutable events. The current state is derived by replaying events. This provides a full audit trail, enables time-travel queries, and supports event replay for rebuilding read models.

### What is CQRS?

Command Query Responsibility Segregation. Write operations (commands) and read operations (queries) use separate models. Commands go through the aggregate root and event store. Queries read from optimized projections. This allows independent scaling and optimization.

### What is a projection?

A handler that listens to domain events and updates a read model. Projections translate the event stream into query-optimized tables/documents. Multiple projections can build different read models from the same events.

### What is a snapshot?

A saved copy of an aggregate's state at a specific version. Snapshots avoid loading the full event stream when rebuilding an aggregate. Typically saved every N events (e.g., every 100). The aggregate loads from the latest snapshot plus any events after it.

### When should I use event sourcing?

When you need a full audit trail, temporal queries (what was the state at time X), complex domain logic with invariants, or event-driven integration with other systems. Avoid it for simple CRUD applications where the overhead outweighs the benefits.
