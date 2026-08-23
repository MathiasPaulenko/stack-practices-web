---
contentType: recipes
slug: event-sourcing-relational
title: "Implement Event Sourcing in a Relational Database"
description: "Build event sourcing in a relational database. Store immutable events, project read models, and use snapshots with PostgreSQL, MySQL, and SQL Server."
metaDescription: "Build event sourcing in a relational database. Store immutable events, project read models, and use snapshots with PostgreSQL, MySQL, and SQL Server."
difficulty: advanced
topics:
  - databases
tags:
  - database
  - event-sourcing
  - event-store
  - postgresql
  - mysql
  - sql
  - cqrs
relatedResources:
  - /recipes/database-deadlocks-retries
  - /recipes/database-read-replicas
  - /patterns/event-sourcing-pattern
  - /recipes/caching-redis
  - /recipes/database-migrations-safely
  - /recipes/database-transactions
lastUpdated: "2026-08-23"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Build event sourcing in a relational database. Store immutable events, project read models, and use snapshots with PostgreSQL, MySQL, and SQL Server."
  keywords:
    - event sourcing
    - event store
    - relational database
    - projections
    - snapshotting
    - postgresql
---

## Overview

Event sourcing stores state changes as a sequence of immutable events instead of overwriting current
state. Rather than saving `balance = 100`, you record `Deposited $50` and `Deposited $50`. You get the
current state by replaying those events. That gives you a full audit trail, temporal queries, and the
option to reconstruct state for any point in time.

Below you'll find examples for PostgreSQL, MySQL, and SQL Server that build an event store, projections,
and snapshotting.

## When to Use

Use event sourcing when you need a complete [audit trail](/recipes/logging/) of every state change, such as
in finance or compliance. It also helps when temporal queries matter, like "What was the inventory level 30
days ago?" It's a good fit if you want to decouple write and read models with [CQRS](/patterns/cqrs-pattern/),
or if rebuilding read models from scratch is simpler than maintaining complex schema migrations.

## When to Avoid

Skip it when your domain has simple CRUD needs and no audit or replay requirements. Avoid it if storage
cost is a hard constraint and you don't have an archiving or retention plan. It also isn't a great fit if
your team isn't ready to handle event schema evolution and eventual consistency in projections.

## Solution

### Python (PostgreSQL)

```python
import json
from datetime import datetime, timezone
from uuid import uuid4

class ConcurrencyException(Exception):
    pass

class EventStore:
    def __init__(self, conn):
        self.conn = conn

    def append(self, aggregate_id, event_type, payload, expected_version=None):
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM events WHERE aggregate_id = %s",
                (aggregate_id,)
            )
            current_version = cur.fetchone()[0]

            if expected_version is not None and current_version != expected_version:
                raise ConcurrencyException(
                    f"Expected {expected_version}, found {current_version}"
                )

            cur.execute("""
                INSERT INTO events (id, aggregate_id, event_type, payload, version, occurred_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (str(uuid4()), aggregate_id, event_type, json.dumps(payload),
                  current_version + 1, datetime.now(timezone.utc)))
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

class ConcurrencyException extends Error {}

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
        throw new ConcurrencyException(
          `Expected ${expectedVersion}, found ${currentVersion}`
        );
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
import jakarta.persistence.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

class ConcurrencyException extends RuntimeException {
    ConcurrencyException(String message) { super(message); }
}

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

    // getters and setters omitted for brevity
}

interface EventRepository {
    int countByAggregateId(UUID aggregateId);
    List<EventEntity> findByAggregateIdOrderByVersionAsc(UUID aggregateId);
}

@Service
public class EventStore {
    private final EventRepository repo;

    public EventStore(EventRepository repo) { this.repo = repo; }

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

class AccountState {
    private int balance;
    AccountState(int balance) { this.balance = balance; }
    public int getBalance() { return balance; }
    public void setBalance(int balance) { this.balance = balance; }
}

interface SnapshotRepository {
    Optional<Snapshot> findTopByAggregateIdOrderByVersionDesc(UUID aggregateId);
}

class Snapshot {
    private UUID aggregateId;
    private int version;
    private AccountState state;
    public int getVersion() { return version; }
    public AccountState getState() { return state; }
}

@Service
public class SnapshotService {
    private final EventStore eventStore;
    private final SnapshotRepository snapshotRepo;

    public SnapshotService(EventStore eventStore, SnapshotRepository snapshotRepo) {
        this.eventStore = eventStore;
        this.snapshotRepo = snapshotRepo;
    }

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

    private AccountState applyEvent(AccountState state, EventEntity event) {
        // apply event payload to state
        return state;
    }
}
```

## Explanation

Event sourcing flips the usual CRUD model on its head. Rather than storing the latest state, you store the
history of changes. You get the current state by replaying that history.

The four core concepts are the **event store**, which is an append-only log of domain events; the
**aggregate**, which marks the consistency boundary and owns its own stream of events; the **projection**,
which is a read model built by replaying events; and the **snapshot**, which is a periodic state capture
that prevents replaying thousands of events.

The database schema stays intentionally simple. An `events` table holds `aggregate_id`, `event_type`, a JSON
`payload`, `version`, and `occurred_at`. The version column is what makes optimistic concurrency possible.
New events are appended, never updated or deleted. Projections read the stream and apply each event to
build a read model.
A snapshot captures state at a specific version, so the system only replays newer events.

## Variants

| Storage | Schema Flexibility | Query Speed | Best For |
| --------- | ------------------- | ------------- | ---------- |
| **PostgreSQL + JSONB** | High | Medium | General purpose, rich JSON support |
| **MySQL + JSON** | High | Medium | Existing MySQL infrastructure |
| **SQL Server** | Medium | Fast | Enterprise, T-SQL projections |
| **EventStoreDB** | Native | Very fast | Large-scale event sourcing |

## Best Practices

Version every event and use optimistic concurrency checks to prevent lost updates. Store payloads as JSONB
or JSON to keep schema flexibility and validate at the application layer. See
[parse JSON](/recipes/parse-json/) for working with structured payloads. Take snapshots every N events, or
when replay time starts to degrade, to balance storage and read performance. Keep each event small and
focused on one thing, because large payloads slow down replay and increase storage. Separate projections
from the event store and rebuild them when needed; events are the source of truth. Use
[Redis caching](/recipes/caching-redis/) for read-model caching. Apply every event inside a transaction when
you also write a projection, or keep projections asynchronous and eventual. See
[database transactions](/recipes/database-transactions/) for atomic writes.

## Common Mistakes

Not versioning events makes concurrent modifications impossible to detect. Storing current state alongside
events creates dual writes and consistency risks. Replaying every event on every read, without snapshots or
dedicated projection tables, kills read performance. Treating events as mutable is a mistake: historical
events should never be changed or deleted. Ignoring event schema evolution also hurts; older events need a
migration strategy as the domain model changes.

## FAQ

### Doesn't event sourcing use too much storage?

Individual events are usually small, often just a few hundred bytes. If you handle one million transactions
per day, that's roughly 100 MB per day. With compression and archiving, storage costs tend to be tiny next
to the audit value.

### How do I handle schema changes in events?

Use event versioning, such as `Deposit_v1` and `Deposit_v2`, or upcasting. Upcasting transforms old events
to the new schema during replay. Never modify stored events.

### Can I use event sourcing with CQRS?

Yes. CQRS and event sourcing pair naturally. Commands append events to the write model, while projections
build optimized read models. Those read models can live in a different database, such as Elasticsearch or
Redis.

### How do I choose snapshot frequency?

Take a snapshot when replaying an aggregate takes longer than your read model can tolerate. A common
starting point is every 100 or 1,000 events, tuned by measuring replay latency for your workload.
