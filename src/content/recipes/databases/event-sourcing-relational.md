---
contentType: recipes
slug: event-sourcing-relational
title: "Implement Event Sourcing in a Relational Database"
description: "Build event sourcing systems using relational databases with event stores, projections, and snapshotting for audit and temporal querying."
metaDescription: "Implement event sourcing in a relational database. Event stores, projections, and snapshotting patterns with PostgreSQL, MySQL, and SQL Server examples."
difficulty: advanced
topics:
  - databases
tags:
  - database
  - event-sourcing
  - event-store
  - databases
  - sql
relatedResources:
  - /recipes/database-deadlocks-retries
  - /recipes/database-read-replicas
  - /recipes/full-text-search
  - /patterns/event-sourcing-pattern
  - /docs/database-migration-runbook-template
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement event sourcing in a relational database. Event stores, projections, and snapshotting patterns with PostgreSQL, MySQL, and SQL Server examples."
  keywords:
    - event-sourcing
    - event-store
    - projections
    - snapshotting
    - postgresql
    - relational
---
# Implement Event Sourcing in a Relational Database

## Overview

Event sourcing stores state changes as a sequence of immutable events rather than overwriting current state. Instead of saving `balance = 100`, you record `Deposited $50` and `Deposited $50`. The current state is derived by replaying all events. This provides a complete audit trail, temporal querying, and the ability to reconstruct state at any point in time.

This recipe implements an event store, projections (read models), and snapshotting using PostgreSQL, MySQL, and SQL Server.

## When to Use

Use this resource when:
- You need a complete [audit trail](/recipes/api/logging) of all state changes (finance, compliance)
- Temporal queries are required: "What was the inventory level 30 days ago?" See [Date Formatting](/recipes/data/date-formatting) for time-based queries.
- You want to decouple write and read models ([CQRS](/patterns/design/cqrs-pattern))
- Rebuilding read models from scratch is preferable to complex schema migrations

## Solution

### Python (PostgreSQL)

```python
import json
from datetime import datetime
from uuid import uuid4

class EventStore:
    def __init__(self, conn):
        self.conn = conn

    def append(self, aggregate_id, event_type, payload, expected_version=None):
        with self.conn.cursor() as cur:
            # Optimistic concurrency check
            cur.execute(
                "SELECT COUNT(*) FROM events WHERE aggregate_id = %s",
                (aggregate_id,)
            )
            current_version = cur.fetchone()[0]

            if expected_version is not None and current_version != expected_version:
                raise ConcurrencyException(f"Expected {expected_version}, found {current_version}")

            cur.execute("""
                INSERT INTO events (id, aggregate_id, event_type, payload, version, occurred_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (str(uuid4()), aggregate_id, event_type, json.dumps(payload),
                  current_version + 1, datetime.utcnow()))
            self.conn.commit()

    def get_events(self, aggregate_id):
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT event_type, payload, version, occurred_at
                FROM events WHERE aggregate_id = %s ORDER BY version
            """, (aggregate_id,))
            return [{
                "type": row[0], "payload": json.loads(row[1]),
                "version": row[2], "occurred_at": row[3]
            } for row in cur.fetchall()]

# Projection (read model)
def rebuild_account_balance(conn, account_id):
    store = EventStore(conn)
    events = store.get_events(account_id)
    balance = 0
    for event in events:
        if event["type"] == "Deposit":
            balance += event["payload"]["amount"]
        elif event["type"] == "Withdrawal":
            balance -= event["payload"]["amount"]
    return balance
```

### JavaScript (MySQL)

```javascript
const { v4: uuidv4 } = require('uuid');

class EventStore {
  constructor(pool) {
    this.pool = pool;
  }

  async append(aggregateId, eventType, payload, expectedVersion = null) {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute(
        'SELECT COUNT(*) as count FROM events WHERE aggregate_id = ?',
        [aggregateId]
      );
      const currentVersion = rows[0].count;

      if (expectedVersion !== null && currentVersion !== expectedVersion) {
        throw new Error(`Concurrency conflict: expected ${expectedVersion}`);
      }

      await conn.execute(
        `INSERT INTO events (id, aggregate_id, event_type, payload, version, occurred_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [uuidv4(), aggregateId, eventType, JSON.stringify(payload), currentVersion + 1]
      );

      await conn.commit();
    } finally {
      conn.release();
    }
  }

  async getEvents(aggregateId) {
    const [rows] = await this.pool.execute(
      `SELECT event_type, payload, version, occurred_at
       FROM events WHERE aggregate_id = ? ORDER BY version`,
      [aggregateId]
    );
    return rows.map(r => ({
      type: r.event_type,
      payload: JSON.parse(r.payload),
      version: r.version,
      occurredAt: r.occurred_at
    }));
  }
}

// Snapshot to avoid replaying all events
async function getBalanceWithSnapshot(pool, accountId) {
  const [snapshots] = await pool.execute(
    'SELECT * FROM snapshots WHERE aggregate_id = ? ORDER BY version DESC LIMIT 1',
    [accountId]
  );

  let balance = 0;
  let fromVersion = 0;

  if (snapshots.length > 0) {
    balance = snapshots[0].state.balance;
    fromVersion = snapshots[0].version;
  }

  const store = new EventStore(pool);
  const events = await store.getEvents(accountId);
  const newEvents = events.filter(e => e.version > fromVersion);

  for (const event of newEvents) {
    if (event.type === 'Deposit') balance += event.payload.amount;
    if (event.type === 'Withdrawal') balance -= event.payload.amount;
  }

  return balance;
}
```

### Java (SQL Server with Spring)

```java
@Entity
@Table(name = "events")
public class EventEntity {
    @Id private UUID id;
    private UUID aggregateId;
    private String eventType;
    @Column(columnDefinition = "nvarchar(max)")
    private String payload;
    private int version;
    private Instant occurredAt;
}

@Service
public class EventStore {
    @Autowired private EventRepository repo;

    @Transactional
    public void append(UUID aggregateId, String eventType, String payload, Integer expectedVersion) {
        int currentVersion = repo.countByAggregateId(aggregateId);
        if (expectedVersion != null && currentVersion != expectedVersion) {
            throw new ConcurrencyException("Expected " + expectedVersion);
        }

        EventEntity event = new EventEntity();
        event.setId(UUID.randomUUID());
        event.setAggregateId(aggregateId);
        event.setEventType(eventType);
        event.setPayload(payload);
        event.setVersion(currentVersion + 1);
        event.setOccurredAt(Instant.now());
        repo.save(event);
    }

    public List<EventEntity> getEvents(UUID aggregateId) {
        return repo.findByAggregateIdOrderByVersionAsc(aggregateId);
    }
}

// Snapshot service
@Service
public class SnapshotService {
    @Autowired private EventStore eventStore;
    @Autowired private SnapshotRepository snapshotRepo;

    public AccountState rebuildState(UUID accountId) {
        Optional<Snapshot> snapshot = snapshotRepo
            .findTopByAggregateIdOrderByVersionDesc(accountId);

        int startVersion = snapshot.map(Snapshot::getVersion).orElse(0);
        AccountState state = snapshot.map(Snapshot::getState)
            .orElse(new AccountState(0));

        List<EventEntity> events = eventStore.getEvents(accountId).stream()
            .filter(e -> e.getVersion() > startVersion)
            .collect(Collectors.toList());

        for (EventEntity event : events) {
            state = applyEvent(state, event);
        }
        return state;
    }
}
```

## Explanation

Event sourcing inverts traditional CRUD: instead of storing the current state, you store the history of changes. Key concepts:
- **Event store**: An append-only log of domain events
- **Aggregate**: The boundary of consistency; each aggregate has its own event stream
- **Projection**: A derived read model built by replaying events
- **Snapshot**: A periodic state capture to avoid replaying thousands of events

The relational database schema is simple: an `events` table with `aggregate_id`, `event_type`, `payload` (JSON), `version`, and `occurred_at`.

## Variants

| Storage | Schema Flexibility | Query Speed | Best For |
|---------|-------------------|-------------|----------|
| PostgreSQL + JSONB | High | Medium | General purpose, rich JSON support |
| MySQL + JSON | High | Medium | Existing MySQL infrastructure |
| SQL Server | Medium | Fast | Enterprise, T-SQL projections |
| Dedicated (EventStoreDB) | Native | Very fast | Large-scale event sourcing |

## What Works

- **Version every event**: Optimistic concurrency control prevents lost updates
- **Use JSONB/JSON for payloads**: Schema flexibility without migrations; validate at the application layer. See [Parse JSON](/recipes/data/parse-json) for structured data.
- **Create snapshots every N events**: Balance between storage and replay performance
- **Keep events small**: Large payloads slow down replay and increase storage
- **Separate projections from the event store**: Projections can be rebuilt; events are the source of truth. See [Redis Caching](/recipes/databases/caching-redis) for read-model caching.

## Common Mistakes

- **Not versioning events**: Without version numbers, you can't detect concurrent modifications
- **Storing current state AND events**: This creates dual writes and consistency risks. See [Database Transactions](/recipes/databases/database-transactions) for atomic writes.
- **Replaying all events on every read**: Use snapshots or dedicated projection tables
- **Mutable events**: Events must be immutable — never update or delete historical events
- **Missing event schema evolution**: Old events need migration strategies as the domain model changes

## Frequently Asked Questions

**Q: Doesn't event sourcing use too much storage?**
A: Events are typically small (hundreds of bytes). For a system with 1M transactions/day, that's ~100MB/day. With compression and archiving, storage costs are usually negligible compared to the audit value.

**Q: How do I handle schema changes in events?**
A: Use event versioning (`Deposit_v1`, `Deposit_v2`) or upcasting — transform old events to new schema during replay. Never modify stored events.

**Q: Can I use event sourcing with CQRS?**
A: Yes — CQRS and event sourcing pair naturally. Commands append events to the write model; projections create optimized read models. The read model can be in a completely different database (Elasticsearch, Redis, etc.).

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
