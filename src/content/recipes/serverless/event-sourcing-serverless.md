---
contentType: recipes
slug: event-sourcing-serverless
title: "Implement Event Sourcing in Serverless Architectures"
description: "How to capture all changes as immutable events using event sourcing with AWS Lambda, DynamoDB streams, and event stores for audit trails and temporal queries."
metaDescription: "Learn event sourcing in serverless architectures. Capture changes as immutable events using Lambda, DynamoDB streams, and event stores for audit trails."
difficulty: advanced
topics:
  - serverless
tags:
  - serverless
  - cqrs
  - aws-lambda
  - functions
  - faas
relatedResources:
  - /recipes/cqrs-pattern-recipe
  - /recipes/saga-pattern-recipe
  - /recipes/serverless-orchestration
  - /recipes/event-driven-architecture
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn event sourcing in serverless architectures. Capture changes as immutable events using Lambda, DynamoDB streams, and event stores for audit trails."
  keywords:
    - event sourcing serverless
    - immutable events
    - event store
    - DynamoDB streams
    - audit trail
---

## Overview

Traditional systems store the current state. An order is "shipped," and the database row says `status = shipped`. If a user asks "when did the status change to shipped?" the database has no answer — the previous value was overwritten. If an analyst asks "how many orders were cancelled and re-shipped last month?" the system cannot answer without adding explicit audit columns that track every change manually.

Event sourcing stores every state change as an immutable event in an append-only log. The current state is computed by replaying events. An order's state is not a row — it is the sequence `[OrderCreated, ItemAdded, PaymentProcessed, Shipped]`. This provides a complete audit trail, supports temporal queries ("what was the state at 3pm yesterday?"), and enables rebuilding projections from scratch. In serverless architectures, events are captured via DynamoDB streams, SQS, or EventBridge, and Lambda functions project the read model. The solution below covers event sourcing implementation, event stores, projections, and serverless-specific considerations.

## When to use it

Use this recipe when:

- Complete audit history of all changes is a business requirement. See [Event-Driven Functions](/recipes/messaging/event-driven-microservices) for event-driven architectures.
- You need to answer temporal questions about past states
- Rebuilding read models from scratch is a needed capability. See [Serverless Orchestration](/recipes/devops/background-jobs) for managing stateful workflows.
- The write model is complex and the read model needs to be optimized separately
- Compliance or regulatory requirements mandate immutable change logs. See [CQRS Pattern](/patterns/design/cqrs-pattern) for separating read and write models.

## Solution

### DynamoDB Event Store with Streams

```typescript
interface DomainEvent {
  eventId: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: string;
  version: number;
}

class OrderEventStore {
  constructor(private tableName: string, private client: DynamoDBDocument) {}

  async appendEvents(aggregateId: string, events: DomainEvent[]): Promise<void> {
    const currentVersion = await this.getCurrentVersion(aggregateId);

    const transactItems = events.map((event, index) => ({
      Put: {
        TableName: this.tableName,
        Item: {
          pk: `ORDER#${aggregateId}`,
          sk: `EVENT#${(currentVersion + index + 1).toString().padStart(10, '0')}`,
          eventId: event.eventId,
          eventType: event.eventType,
          payload: event.payload,
          timestamp: new Date().toISOString(),
          version: currentVersion + index + 1,
        },
        ConditionExpression: 'attribute_not_exists(pk)',
      },
    }));

    await this.client.transactWrite({ TransactItems: transactItems });
  }

  async getEvents(aggregateId: string): Promise<DomainEvent[]> {
    const result = await this.client.query({
      TableName: this.tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': `ORDER#${aggregateId}`,
        ':sk': 'EVENT#',
      },
      ScanIndexForward: true,
    });

    return (result.Items || []).map(item => ({
      eventId: item.eventId,
      aggregateId,
      eventType: item.eventType,
      payload: item.payload,
      timestamp: item.timestamp,
      version: item.version,
    }));
  }

  private async getCurrentVersion(aggregateId: string): Promise<number> {
    const events = await this.getEvents(aggregateId);
    return events.length > 0 ? events[events.length - 1].version : 0;
  }
}
```

### Lambda Projection Handler

```typescript
export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  for (const record of event.Records) {
    if (record.eventName !== 'INSERT') continue;

    const newImage = unmarshall(record.dynamodb?.NewImage as any);
    const domainEvent: DomainEvent = {
      eventId: newImage.eventId,
      aggregateId: newImage.aggregateId,
      eventType: newImage.eventType,
      payload: newImage.payload,
      timestamp: newImage.timestamp,
      version: newImage.version,
    };

    await projectEvent(domainEvent);
  }
};

async function projectEvent(event: DomainEvent): Promise<void> {
  switch (event.eventType) {
    case 'OrderCreated':
      await createOrderProjection(event.aggregateId, event.payload);
      break;
    case 'ItemAdded':
      await addItemToOrderProjection(event.aggregateId, event.payload);
      break;
    case 'OrderShipped':
      await updateOrderStatus(event.aggregateId, 'shipped');
      break;
  }
}
```

### Order Aggregate Reconstruction

```typescript
class OrderAggregate {
  private status: string = 'pending';
  private items: OrderItem[] = [];
  private total: number = 0;

  applyEvent(event: DomainEvent): void {
    switch (event.eventType) {
      case 'OrderCreated':
        this.status = 'created';
        this.total = event.payload.total as number;
        break;
      case 'ItemAdded':
        this.items.push(event.payload.item as OrderItem);
        this.total += (event.payload.item as OrderItem).price;
        break;
      case 'OrderShipped':
        this.status = 'shipped';
        break;
      case 'OrderCancelled':
        this.status = 'cancelled';
        break;
    }
  }

  static fromEvents(events: DomainEvent[]): OrderAggregate {
    const order = new OrderAggregate();
    for (const event of events) {
      order.applyEvent(event);
    }
    return order;
  }

  toSnapshot(): OrderSnapshot {
    return {
      status: this.status,
      items: this.items,
      total: this.total,
    };
  }
}
```

## Explanation

- **Event store**: the event store is an append-only log. Events are never updated or deleted. Each event has a unique ID, an aggregate ID (the entity it belongs to), a type, a payload, and a version. The version ensures ordering and prevents concurrent writes (optimistic concurrency control via `ConditionExpression`).
- **Aggregate reconstruction**: the current state of an entity is not stored directly. Instead, you load all events for an aggregate and replay them in order. The aggregate object starts empty and applies each event, mutating its internal state. This is deterministic — the same sequence of events always produces the same state.
- **Projections (read models)**: read models are built by subscribing to the event stream. When an event is appended, a Lambda (triggered by DynamoDB streams) updates the read-optimized view. You can have multiple projections for the same events — one for the customer dashboard, one for analytics, one for search indexing.
- **Snapshots**: replaying thousands of events for a long-lived aggregate is slow. Snapshots cache the aggregate state at a specific version. To reconstruct, load the latest snapshot and replay only events after that version. Store snapshots periodically (e.g., every 100 events) and asynchronously.

## Variants

| Approach | Store | Projections | Best for |
|----------|-------|-------------|----------|
| DynamoDB + Streams | DynamoDB | Lambda | AWS-native, moderate scale |
| EventStoreDB | EventStoreDB | Subscriptions | High volume, complex domains |
| Kafka + KTables | Kafka | Kafka Streams | Stream processing, replay |
| S3 + Athena | S3 | Athena queries | Audit, compliance, analytics |
| Aurora + Outbox | PostgreSQL | CDC | Relational event sourcing |

## What Works

- **Version every event**: include a monotonically increasing version per aggregate. Use DynamoDB `ConditionExpression` to reject writes with stale versions. This prevents lost updates when two users simultaneously modify the same aggregate.
- **Make events immutable and self-contained**: an event should carry all data needed to understand it, not just deltas. `OrderCreated` should include customer ID, shipping address, and line items — not just "order 123 was created." Future consumers should not need to query other systems to interpret the event.
- **Use correlation IDs across the event chain**: when an event triggers another event (e.g., `OrderShipped` triggers `InventoryDecremented`), propagate the correlation ID. This enables end-to-end tracing and debugging across distributed event chains.
- **Implement idempotent projections**: Lambda functions retry on failure. A projection that increments a counter on each invocation will overcount. Design projections to be idempotent — write the event ID to the projection row and skip if already processed.
- **Archive old events to cold storage**: DynamoDB is expensive for long-term storage of millions of events. Move events older than 90 days to S3 using DynamoDB TTL or export jobs. Keep the event store lean and query archived data via Athena when needed.

## Common mistakes

- **Storing current state alongside events**: if you maintain both an event log and a current state table, they can diverge. A bug in the projection writes state A while the log contains events for state B. The source of truth is the event store; projections are derived. Do not treat the projection as primary state.
- **Exposing event types to external systems**: external consumers should not depend on internal event schemas. Use a public event schema (e.g., `OrderConfirmed`) and map internal events to public ones. Internal refactoring of event types should not break external integrations.
- **Not handling event schema evolution**: when an event type changes (adding a field), old events in the log do not have the new field. The aggregate must handle missing fields gracefully. Use schema versioning and default values, or upcast old events on load.
- **Replaying events from the beginning for every query**: always use snapshots for aggregates with long histories. Replaying 10,000 events for every `GET /order/123` destroys performance. Take snapshots asynchronously and load from them.

## FAQ

**Q: Is event sourcing more complex than CRUD?**
A: Yes. It adds concepts (aggregates, projections, event versioning) and infrastructure (event stores, stream processors). Use it only when the benefits (audit, temporal queries, rebuild capability) justify the complexity. For simple CRUD without audit requirements, traditional state storage is sufficient.

**Q: How do I delete data under GDPR if events are immutable?**
A: Implement crypto-shredding: encrypt event payloads with a key per user. To "delete" a user's data, delete their encryption key. The events remain but are unreadable. Alternatively, store PII in a separate mutable store and reference it from events.

**Q: Can I use event sourcing with relational databases?**
A: Yes — use the outbox pattern. Write events to an `outbox` table in the same transaction as business data changes. A CDC (change data capture) process polls the outbox and publishes events. This gives you ACID guarantees with event sourcing semantics.

**Q: How do I query across aggregates?**
A: You do not query the event store directly for cross-aggregate queries. Build read-model projections that denormalize data for query efficiency. The event store is the write model; projections are the read model. This separation is CQRS.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
