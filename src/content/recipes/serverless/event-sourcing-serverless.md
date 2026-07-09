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
lastUpdated: "2026-07-09"
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

### Is event sourcing more complex than CRUD?

Yes. It adds concepts (aggregates, projections, event versioning) and infrastructure (event stores, stream processors). Use it only when the benefits (audit, temporal queries, rebuild capability) justify the complexity. For simple CRUD without audit requirements, traditional state storage is sufficient.

### How do I delete data under GDPR if events are immutable?

Implement crypto-shredding: encrypt event payloads with a key per user. To "delete" a user's data, delete their encryption key. The events remain but are unreadable. Alternatively, store PII in a separate mutable store and reference it from events.

### Can I use event sourcing with relational databases?

Yes — use the outbox pattern. Write events to an `outbox` table in the same transaction as business data changes. A CDC (change data capture) process polls the outbox and publishes events. This gives you ACID guarantees with event sourcing semantics.

### How do I query across aggregates?

You do not query the event store directly for cross-aggregate queries. Build read-model projections that denormalize data for query efficiency. The event store is the write model; projections are the read model. This separation is CQRS.

### How do I handle event schema evolution?

Version events explicitly: include a `version` field in every event. Use upcasters (transformers that convert old event versions to new) when reading events from the store. Never modify existing event classes — create a new version and write an upcaster. For protobuf, use `reserved` fields and add new fields with new numbers. For JSON events, use `json-schema` evolution with additive-only changes.

### How do I handle duplicate events in serverless?

Use idempotency keys: include a unique event ID (UUID) and track processed IDs in a deduplication table. In AWS Lambda, use DynamoDB conditional writes to atomically mark an event as processed. Set a TTL on the deduplication table (e.g., 7 days) to limit storage. For Kinesis, use the sequence number as the deduplication key. Process events idempotently so reprocessing the same event produces the same result.

### How do I replay events to rebuild read models?

Read all events from the event store in order, apply each to the projection handler, and write the updated read model. Use a checkpoint table to track the last processed event sequence number. For large event stores, replay in batches (e.g., 1000 events at a time) to avoid memory pressure. Run the replay as a separate Lambda function or batch job. Pause the real-time projection handler during replay to avoid conflicts, then resume from the checkpoint.

### How do I test event sourcing systems?

Test aggregates by replaying events and asserting on the resulting state. Test projections by feeding a known event sequence and asserting on the read model output. Use event fixtures: a list of events that produce a known aggregate state. For integration tests, use an in-memory event store and verify the full cycle: command → events → projection. Test event versioning by replaying old-version events through upcasters and asserting the upcasted payload matches the new schema.

### How do I handle concurrent writes to the same aggregate?

Use optimistic concurrency control. Include the expected version number in the write request. The event store rejects the write if the current version does not match the expected version. In DynamoDB, use a conditional expression: `attribute_not_exists(version) OR version = :expected_version`. On conflict, retry by loading the latest events, reapplying the command, and writing again. For high-contention aggregates, consider using a saga or process manager to serialize writes. Do not use pessimistic locking in serverless — Lambda functions are stateless and cannot hold locks.

### How do I implement snapshots for aggregates with long event histories?

Periodically save the full aggregate state as a snapshot. Store snapshots in a separate table with the aggregate ID and version number. On load, fetch the latest snapshot and replay only events after the snapshot version. Take snapshots every N events (e.g., every 100) or after a time interval. In DynamoDB, store snapshots in a separate partition: `PK = AGGREGATE#123, SK = SNAPSHOT#42`. Snapshot creation should be async — do not block the write path. If a snapshot fails, the system continues working by replaying from the beginning.

### How do I handle event ordering in serverless?

Use sequence numbers from the event store (DynamoDB stream ARN + sequence number, Kinesis sequence number). Process events in order per aggregate by keying on aggregate ID. In Lambda, use the partition key to ensure all events for the same aggregate go to the same shard. Do not rely on event timestamps for ordering — clock skew between producers can cause misordering. For cross-aggregate ordering, use a global sequence (DynamoDB atomic counter or Snowflake ID) and process events in sequence order in the projection.

### How do I handle event store growth in production?

Set a retention policy: keep all events for recent aggregates (e.g., 90 days), then archive older events to cold storage (S3 Glacier). For audit requirements that mandate keeping all events, compress old events and move to S3 with lifecycle policies. Implement a compaction strategy: for aggregates with no future replay needs, create a final snapshot and delete the individual events. In DynamoDB, use TTL on old event records or archive to S3 via DynamoDB export. Monitor event store size and alert when growth exceeds projections. Partition the event store by time (monthly tables) to make archival and deletion manageable.

### How do I implement sagas with event sourcing in serverless?

A saga is a sequence of local transactions coordinated by events. Each step publishes an event that triggers the next step. In serverless, implement each saga step as a separate Lambda function triggered by events. Use a saga state table (DynamoDB) to track the current step and compensate on failure. For compensating actions, publish a compensation event that reverses the effect of a previous step. Do not implement sagas as a single long-running Lambda — Lambda has a 15-minute timeout. Use Step Functions for orchestration if you need visual workflow management, or use pure event-driven choreography for simpler sagas.

### How do I migrate from CRUD to event sourcing incrementally?

Start with a single aggregate. Wrap the existing CRUD operations in an event-sourcing adapter: on write, publish an event in addition to updating the database. On read, continue using the existing database. Once the event store is reliable, switch reads to projections built from events. Run both systems in parallel (dual write) and compare results. Once confident, remove the CRUD write path and rely solely on events. Do not attempt a big-bang migration — the risk of data loss is too high. Migrate one aggregate at a time, with full rollback capability at each step.

### How do I handle event schema evolution in production?

Version events with a `version` field in the event payload. When the schema changes, write an upcaster function that transforms old-version events to the new schema during replay. Store upcasters in a registry keyed by event type and version. For example, `UserCreatedV1` with `fullName` becomes `UserCreatedV2` with `firstName` and `lastName` by splitting the full name. Never modify existing events in the store — always upcast at read time. Test upcasters with event fixtures from production (anonymized). Document breaking changes in a changelog so projection developers can update their handlers.

### How do I test event-sourced systems in serverless?

Test aggregates by replaying events and asserting on the resulting state. Use given-when-then style: given a list of prior events, when a command is executed, then specific events should be produced. Test projections by feeding events and asserting on the materialized view. For Lambda functions, use `aws-sdk-client-mock` to mock DynamoDB and EventBridge. Test idempotency by replaying the same event twice and verifying no duplicate side effects. Test event ordering by sending events out of order and verifying the projection handles them correctly. Use LocalStack for integration tests with real AWS APIs locally.

### How do I handle GDPR right-to-be-forgotten with event sourcing?

Use crypto-shredding: encrypt sensitive fields with a per-user key, and delete the key when the user requests deletion. Store the encrypted key reference in the event payload, not the key itself. When the key is deleted, the encrypted data becomes unreadable. Store per-user encryption keys in a separate key management service (AWS KMS, HashiCorp Vault). For events that contain plain-text PII, implement a redaction projection that replaces PII with hashed placeholders. Do not modify historical events — the event store is immutable. Document the deletion process in your privacy policy and verify compliance with legal counsel.

### How do I handle event replay and projection rebuilding?

To rebuild a projection, create a new Lambda function that reads events from the beginning of the stream and feeds them to the projection handler. Use DynamoDB Scan with pagination or EventBridge replay to reprocess historical events. For large event stores, parallelize replay by partitioning by aggregate ID. Track replay progress in a DynamoDB table to support resumption. During replay, disable the projection's write path to avoid duplicate writes — use an idempotency key (event ID) to handle duplicates safely. Test replay on a staging projection first to verify correctness. Monitor replay throughput and estimate completion time based on event count and processing rate.

### How do I handle backpressure and throttling in Lambda consumers?

Lambda scales concurrently based on the number of events in the stream. If the projection cannot process events as fast as they arrive, DynamoDB Streams or EventBridge accumulate events. Configure `BatchSize` and `MaximumBatchingWindowInSeconds` to control how many events Lambda processes per invocation. Set `MaximumRecordAgeInSeconds` to discard old events if the consumer cannot keep up. Use an `OnFailure` destination (SQS or SNS) to capture events that failed after all retries. Monitor `IteratorAge` in CloudWatch — if it exceeds 60 seconds, the consumer is falling behind. Consider increasing Lambda concurrency or partitioning the stream to parallelize processing.

### How do I handle eventual consistency in projections?

Projections are eventually consistent by nature — there is a lag between the event write and the projection update. For reads that require strong consistency, read from the aggregate directly via replay instead of the projection. For UIs, display "last updated" timestamps based on the last processed event. Use CQRS with separate read/write models: the write model validates commands against the aggregate, the read model serves from projections. If the lag is unacceptable, consider updating the projection synchronously within the command handler, but this increases write latency.
