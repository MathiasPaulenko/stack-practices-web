---
contentType: guides
slug: complete-guide-event-sourcing-cqrs
title: "Guía Completa de Event Sourcing y CQRS: Event Store, Projections"
description: "Dominá event sourcing y CQRS: event store design, aggregate roots, projections, read models, snapshots, sagas y patrones de producción para event-driven systems."
metaDescription: "Dominá event sourcing y CQRS: event store, aggregate roots, projections, read models, snapshots, sagas y patrones de producción para event-driven systems."
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
  - /guides/architecture/complete-guide-modular-monolith
  - /guides/architecture/complete-guide-api-gateway-pattern
  - /patterns/architecture/event-sourcing-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 24
seo:
  metaDescription: "Dominá event sourcing y CQRS: event store, aggregate roots, projections, read models, snapshots, sagas y patrones de producción para event-driven systems."
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

## Introducción

Event sourcing storea state changes como una secuencia de events en vez de mutable current state. CQRS separa read y write models — commands modifican state, queries leen desde optimized projections. Juntos proveen una auditable, replayable y scalable architecture para complex domains. A continuación: event store design, aggregate roots, projections, read models, snapshots, sagas y production patterns.

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

      // Appendéa events
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
// domain/OrderAggregate.ts — Aggregate root que aplica events
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

  // Aplicá events para rebuildear state
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
// application/OrderCommandHandler.ts — Processá commands, saveéa events
class OrderCommandHandler {
  constructor(
    private readonly eventStore: PostgresEventStore,
    private readonly eventBus: EventBus,
  ) {}

  async handlePlaceOrder(command: PlaceOrderCommand): Promise<string> {
    const orderId = crypto.randomUUID();

    // Creá aggregate y aplicá command
    const order = OrderAggregate.place(
      orderId,
      command.customerId,
      command.items,
    );

    // Persistí events
    await this.eventStore.append(
      orderId,
      order.getUncommittedEvents(),
      0,  // expected version para new aggregate
    );

    // Publicá events al bus para projections
    for (const event of order.getUncommittedEvents()) {
      await this.eventBus.publish(event);
    }

    order.markEventsAsCommitted();
    return orderId;
  }

  async handleCancelOrder(command: CancelOrderCommand): Promise<void> {
    // Loadeá aggregate from history
    const events = await this.eventStore.getEvents(command.orderId);
    if (events.length === 0) {
      throw new Error('Order not found');
    }

    const order = new OrderAggregate();
    order.loadFromHistory(events);

    // Aplicá command
    order.cancel(command.reason);

    // Persistí new events
    const currentVersion = order.getVersion() - order.getUncommittedEvents().length;
    await this.eventStore.append(
      command.orderId,
      order.getUncommittedEvents(),
      currentVersion,
    );

    // Publicá events
    for (const event of order.getUncommittedEvents()) {
      await this.eventBus.publish(event);
    }

    order.markEventsAsCommitted();
  }
}
```

## Projections and Read Models

```typescript
// projections/OrderProjection.ts — Buildeá read model from events
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

        // Insertá order items
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

// Wireéa projection a event bus
eventBus.subscribe('OrderPlaced', orderProjection);
eventBus.subscribe('OrderCancelled', orderProjection);
eventBus.subscribe('OrderShipped', orderProjection);
eventBus.subscribe('OrderCompleted', orderProjection);
```

## Query Handler

```typescript
// application/OrderQueryHandler.ts — Leé desde optimized read models
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
// snapshots/SnapshotStore.ts — Optimizá aggregate loading para long event streams
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

// Loadeá aggregate con snapshot optimization
class OrderRepository {
  constructor(
    private readonly eventStore: PostgresEventStore,
    private readonly snapshotStore: SnapshotStore,
  ) {
    this.snapshotInterval = 100;  // Saveéa snapshot every 100 events
  }

  async load(orderId: string): Promise<OrderAggregate> {
    // Trateá loading from snapshot first
    const snapshot = await this.snapshotStore.getLatest(orderId);

    let order = new OrderAggregate();
    let fromVersion = 0;

    if (snapshot) {
      order = Object.assign(new OrderAggregate(), snapshot.state);
      fromVersion = snapshot.version;
    }

    // Loadeá remaining events después del snapshot
    const events = await this.eventStore.getEvents(orderId, fromVersion);
    order.loadFromHistory(events);

    return order;
  }

  async save(order: OrderAggregate): Promise<void> {
    const events = order.getUncommittedEvents();
    const baseVersion = order.getVersion() - events.length;

    await this.eventStore.append(order.id, events, baseVersion);

    // Saveéa snapshot si interval reached
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

- Hacé events immutable y append-only — nunca updatees o deletees events
- Usá optimistic concurrency control — version numbers prevent conflicting writes
- Mantené events small y focused — un event per state change, no un batch
- Usá snapshots para long-lived aggregates — loading thousands de events es slow
- Hacé projections idempotent — replaying events debería producir el same read model
- Usá separate databases para write y read sides — scaleá independientemente
- Versioná tus events — schema evolution requiere upcasters para old events
- Usá metadata para tracing — correlation IDs, causation IDs, user IDs
- No expongas events en el API — events son internal, exponé read models
- Testeá projections replayando events — verificá read model consistency

## Common Mistakes

- **Updatear o deletear events**: events son el source of truth. Corrections son compensating events, no edits.
- **No optimistic concurrency**: concurrent commands corrompen state. Usá version-based conflict detection.
- **Projections no idempotent**: replaying events crea duplicates. Usá upserts o event ID tracking.
- **Loading full event stream sin snapshots**: aggregates con thousands de events son slow. Usá snapshots.
- **Business logic en projections**: projections solo deberían translate events a read models. No domain rules.
- **Sharing database entre write y read**: defeats el purpose de CQRS. Usá separate stores.

## FAQ

### ¿Qué es event sourcing?

Una architecture donde state changes se storean como una secuencia de immutable events. El current state se deriva replayando events. Esto provee un full audit trail, habilita time-travel queries y soporta event replay para rebuildear read models.

### ¿Qué es CQRS?

Command Query Responsibility Segregation. Write operations (commands) y read operations (queries) usan separate models. Commands van through el aggregate root y event store. Queries leen desde optimized projections. Esto permite independent scaling y optimization.

### ¿Qué es una projection?

Un handler que escucha domain events y updatea un read model. Projections translate el event stream en query-optimized tables/documents. Multiple projections pueden buildear different read models desde el same events.

### ¿Qué es un snapshot?

Una saved copy de un aggregate's state en un specific version. Snapshots evitan loading el full event stream cuando rebuildéas un aggregate. Típicamente saved every N events (ej. every 100). El aggregate loadea desde el latest snapshot plus any events después de it.

### ¿Cuándo debería usar event sourcing?

Cuando necesitás un full audit trail, temporal queries (cuál era el state en time X), complex domain logic con invariants, o event-driven integration con other systems. Evitalo para simple CRUD applications donde el overhead outweighs los benefits.
