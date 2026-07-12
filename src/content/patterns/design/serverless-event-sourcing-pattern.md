---


contentType: patterns
slug: serverless-event-sourcing-pattern
title: "Serverless Event Sourcing Pattern"
description: "Store function state as an append-only event log so workflows can be replayed, audited, and recovered without a persistent database."
metaDescription: "Serverless event sourcing: store function state as append-only events. Replay, audit, and recover serverless workflows with DynamoDB and EventBridge."
difficulty: advanced
topics:
  - serverless
  - design
tags:
  - serverless
  - event-sourcing
  - pattern
  - eventbridge
  - dynamodb
  - audit-log
  - python
  - typescript
relatedResources:
  - /patterns/serverless-function-composition-pattern
  - /patterns/serverless-fanout-pattern
  - /recipes/serverless-dynamodb-single-table
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Serverless event sourcing: store function state as append-only events. Replay, audit, and recover serverless workflows with DynamoDB and EventBridge."
  keywords:
    - serverless event sourcing
    - event log serverless
    - dynamodb event store
    - eventbridge event sourcing
    - serverless audit log
    - event replay lambda


---

# Serverless Event Sourcing Pattern

## Overview

Event sourcing stores application state as a sequence of immutable events. Instead of updating a current-state record, you append each state change as an event to a log. The current state is derived by replaying the event log. In serverless, this fits naturally: events flow through EventBridge or SNS, and DynamoDB or S3 stores the event log.

This pattern provides a complete audit trail, enables replay for recovery, and decouples state changes from downstream consumers. Each Lambda invocation appends an event and optionally projects the current state to a read model.

## When to Use

- You need a full audit trail of all state changes (financial transactions, compliance)
- Recovery requires replaying events to rebuild state after a failure
- Multiple consumers need to react to the same state change independently
- You want to decouple write logic from read models (CQRS)
- Temporal queries are needed (what was the state at time T?)

## Solution

### Python with DynamoDB as Event Store

```python
import boto3
import json
import time
import uuid
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
event_table = dynamodb.Table('event_store')
projection_table = dynamodb.Table('order_projection')

class EventStore:
    def __init__(self, table):
        self.table = table

    def append(self, aggregate_id: str, event_type: str, data: dict, expected_version: int = None):
        event = {
            "aggregateId": aggregate_id,
            "eventId": str(uuid.uuid4()),
            "eventType": event_type,
            "data": json.dumps(data),
            "timestamp": int(time.time() * 1000),
            "version": self._get_next_version(aggregate_id),
        }

        # Optimistic concurrency control
        if expected_version is not None:
            response = self.table.put_item(
                Item=event,
                ConditionExpression="attribute_not_exists(aggregateId) OR version = :expected",
                ExpressionAttributeValues={":expected": expected_version}
            )
        else:
            self.table.put_item(Item=event)

        return event

    def get_events(self, aggregate_id: str, from_version: int = 0) -> list[dict]:
        response = self.table.query(
            KeyConditionExpression=Key("aggregateId").eq(aggregate_id) & Key("version").gte(from_version),
            ScanIndexForward=True  # Ascending order
        )
        return response.get("Items", [])

    def _get_next_version(self, aggregate_id: str) -> int:
        response = self.table.query(
            KeyConditionExpression=Key("aggregateId").eq(aggregate_id),
            ScanIndexForward=False,
            Limit=1
        )
        items = response.get("Items", [])
        return (int(items[0]["version"]) + 1) if items else 1


event_store = EventStore(event_table)

# Append events
def create_order(order_id: str, customer_id: str, items: list):
    event_store.append(order_id, "OrderCreated", {
        "customerId": customer_id,
        "items": items,
        "status": "PENDING"
    })

def confirm_order(order_id: str):
    events = event_store.get_events(order_id)
    current_version = max(int(e["version"]) for e in events)
    event_store.append(order_id, "OrderConfirmed", {
        "status": "CONFIRMED"
    }, expected_version=current_version)

# Replay events to rebuild state
def get_order_state(order_id: str) -> dict:
    events = event_store.get_events(order_id)
    state = {}
    for event in events:
        data = json.loads(event["data"])
        state.update(data)
        state["version"] = int(event["version"])
    return state
```

### Projecting to a Read Model

```python
def project_order_state(order_id: str):
    state = get_order_state(order_id)

    projection_table.put_item(Item={
        "orderId": order_id,
        "customerId": state.get("customerId"),
        "status": state.get("status"),
        "items": state.get("items", []),
        "version": state.get("version", 0),
        "updatedAt": int(time.time() * 1000),
    })

# Lambda handler triggered by DynamoDB stream
def projection_handler(event, context):
    for record in event["Records"]:
        if record["eventName"] == "INSERT":
            new_image = record["dynamodb"]["NewImage"]
            aggregate_id = new_image["aggregateId"]["S"]
            project_order_state(aggregate_id)
```

### TypeScript with EventBridge

```typescript
import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient({ region: 'us-east-1' });
const eventBridge = new EventBridgeClient({ region: 'us-east-1' });

interface DomainEvent {
  aggregateId: string;
  eventId: string;
  eventType: string;
  data: Record<string, any>;
  timestamp: number;
  version: number;
}

class EventStore {
  private tableName = 'event_store';

  async append(aggregateId: string, eventType: string, data: Record<string, any>): Promise<DomainEvent> {
    const version = await this.getNextVersion(aggregateId);
    const event: DomainEvent = {
      aggregateId,
      eventId: crypto.randomUUID(),
      eventType,
      data,
      timestamp: Date.now(),
      version,
    };

    // Store event
    await ddb.send(new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(event),
    }));

    // Publish to EventBridge for downstream consumers
    await eventBridge.send(new PutEventsCommand({
      Entries: [{
        EventBusName: 'default',
        Source: 'order.service',
        DetailType: eventType,
        Detail: JSON.stringify(event),
      }],
    }));

    return event;
  }

  async getEvents(aggregateId: string, fromVersion = 0): Promise<DomainEvent[]> {
    const response = await ddb.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'aggregateId = :id AND version >= :v',
      ExpressionAttributeValues: marshall({ ':id': aggregateId, ':v': fromVersion }),
      ScanIndexForward: true,
    }));

    return (response.Items || []).map(item => unmarshall(item) as DomainEvent);
  }

  private async getNextVersion(aggregateId: string): Promise<number> {
    const response = await ddb.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'aggregateId = :id',
      ExpressionAttributeValues: marshall({ ':id': aggregateId }),
      ScanIndexForward: false,
      Limit: 1,
    }));

    const items = response.Items || [];
    return items.length > 0 ? unmarshall(items[0]).version + 1 : 1;
  }
}

const store = new EventStore();

// Rebuild state from events
function replayEvents(events: DomainEvent[]): Record<string, any> {
  return events.reduce((state, event) => ({
    ...state,
    ...event.data,
    version: event.version,
  }), {});
}
```

## Explanation

Event sourcing inverts the traditional state model:

1. **Append events** — each state change is recorded as an immutable event. Events are never modified or deleted. The event log is the source of truth.

2. **Derive state** — the current state is computed by replaying all events for an aggregate. Each event updates the state incrementally. This is the "projection" step.

3. **Project to read models** — for query performance, project the derived state to a read-optimized table (DynamoDB, Elasticsearch). The read model is disposable: it can always be rebuilt from the event log.

4. **Publish events** — when an event is appended, publish it to EventBridge or SNS. Downstream consumers react independently without coupling to the write side.

## Variants

| Approach | Event Store | Best For |
|----------|-------------|----------|
| DynamoDB event store | DynamoDB with sort key = version | AWS-native, moderate event volume |
| S3 event log | S3 objects per event | High volume, low cost, append-only |
| EventBridge + DynamoDB | EventBridge for routing, DynamoDB for storage | Decoupled consumers |
| Aurora event store | SQL table with event log | SQL ecosystem, ACID guarantees |
| Kafka event store | Kafka topic as event log | High throughput, streaming consumers |

## Best Practices


- For a deeper guide, see [Serverless Fanout Pattern](/patterns/serverless-fanout-pattern/).

- **Events are immutable** — never modify or delete an event. If a mistake was made, append a compensating event. This preserves the audit trail.
- **Use optimistic concurrency** — check the expected version before appending. If another event was appended concurrently, reject the write. This prevents lost updates.
- **Keep events small** — events should contain only the data that changed, not the full aggregate. Large events increase storage cost and replay time.
- **Version events** — use a version field as the sort key. This enables querying events in order and detecting concurrent modifications.
- **Separate write and read models** — the event log is optimized for appends. Read models are optimized for queries. Do not query the event log for current state in production; use a projection.

## Common Mistakes

- **Updating events** — modifying an event breaks the audit trail and makes replay non-deterministic. Always append compensating events.
- **Querying the event log for reads** — scanning the event log to get current state is slow. Project to a read model and query that.
- **No versioning** — without version-based optimistic concurrency, concurrent writes can lose events. Always include a version check.
- **Large events** — storing the full aggregate in each event wastes space. Store only the delta (changed fields).
- **Not handling schema evolution** — event schemas change over time. Use upcasters or versioned event types to handle old events during replay.

## Frequently Asked Questions

### What is an aggregate in event sourcing?

An aggregate is a cluster of domain objects treated as a single unit for data changes. All events for an aggregate share the same aggregate ID. For example, an order and its line items form one aggregate. Events are appended per aggregate.

### How do I handle schema changes in events?

Use event versioning: include a `schemaVersion` field in each event. When replaying, apply upcasters that transform old-format events to the new format. This allows evolving the schema without breaking replay.

### What is the difference between event sourcing and CQRS?

Event sourcing is about how state is stored (as events). CQRS is about separating read and write models. They are often used together: events are the write model, projections are the read model. You can use CQRS without event sourcing and vice versa.

### How do I rebuild a read model from the event log?

Scan all events for the aggregate, replay them to compute the current state, and write the result to the read model table. In serverless, use a Lambda that processes the event log in batches and updates the projection. Trigger it manually or via a DynamoDB stream.
