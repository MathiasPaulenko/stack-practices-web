---
contentType: patterns
slug: event-sourcing-pattern
title: "Event Sourcing Pattern"
description: "Store the state of an application as a sequence of events rather than storing only the current state. An architectural pattern for audit-friendly systems."
metaDescription: "Learn the Event Sourcing Pattern in Python, Java, and JavaScript. Architectural pattern for audit-friendly state management via event streams."
difficulty: advanced
topics:
  - design
tags:
  - event-sourcing
  - pattern
  - design-pattern
  - architectural
  - audit
  - event-store
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/cqrs-pattern
  - /patterns/design/saga-pattern
  - /patterns/design/observer-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Event Sourcing Pattern in Python, Java, and JavaScript. Architectural pattern for audit-friendly state management via event streams."
  keywords:
    - event sourcing pattern
    - design pattern
    - architectural pattern
    - audit trail
    - event store
    - python event sourcing
    - java event sourcing
    - javascript event sourcing
---

# Event Sourcing Pattern

## Overview

The Event Sourcing Pattern stores the state of an application as a sequence of events rather than storing only the current state. Instead of updating a record in place, you append an event describing what happened. The current state is derived by replaying all events for an entity. This provides a complete audit trail, temporal queries, and the ability to rebuild state at any point in time.

## When to Use

Use the Event Sourcing Pattern when:
- You need a complete audit trail of every state change (finance, healthcare, compliance)
- You want to reconstruct historical states or debug by replaying events
- Event-driven architectures already exist, making event stores a natural fit
- CQRS is in use, and read models can be built from event projections
- You need to compensate for failures by replaying or reversing events
- Examples: banking ledgers, inventory systems, order tracking, collaborative editing

## Solution

### Python

```python
from dataclasses import dataclass, asdict
from typing import List, Dict, Callable
from datetime import datetime
import json

@dataclass
class Event:
    type: str
    entity_id: str
    payload: dict
    timestamp: str = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()

class EventStore:
    def __init__(self):
        self.streams: Dict[str, List[Event]] = {}

    def append(self, entity_id: str, event: Event):
        self.streams.setdefault(entity_id, []).append(event)

    def get_stream(self, entity_id: str) -> List[Event]:
        return list(self.streams.get(entity_id, []))

# Entity: rebuild state from events
class BankAccount:
    def __init__(self, account_id: str):
        self.account_id = account_id
        self.balance = 0
        self.version = 0

    def apply(self, event: Event):
        if event.type == "Deposited":
            self.balance += event.payload["amount"]
        elif event.type == "Withdrawn":
            self.balance -= event.payload["amount"]
        self.version += 1

    @classmethod
    def rehydrate(cls, account_id: str, events: List[Event]):
        account = cls(account_id)
        for e in events:
            account.apply(e)
        return account

# Usage
store = EventStore()
account_id = "ACC-123"

store.append(account_id, Event("Deposited", account_id, {"amount": 100}))
store.append(account_id, Event("Withdrawn", account_id, {"amount": 30}))
store.append(account_id, Event("Deposited", account_id, {"amount": 50}))

# Rebuild state
account = BankAccount.rehydrate(account_id, store.get_stream(account_id))
print(f"Balance: {account.balance}")  # 120

# Full audit trail
for e in store.get_stream(account_id):
    print(f"{e.timestamp}: {e.type} {e.payload}")
```

### JavaScript

```javascript
class Event {
  constructor(type, entityId, payload) {
    this.type = type;
    this.entityId = entityId;
    this.payload = payload;
    this.timestamp = new Date().toISOString();
  }
}

class EventStore {
  constructor() {
    this.streams = new Map();
  }

  append(entityId, event) {
    if (!this.streams.has(entityId)) this.streams.set(entityId, []);
    this.streams.get(entityId).push(event);
  }

  getStream(entityId) {
    return this.streams.get(entityId) || [];
  }
}

class BankAccount {
  constructor(accountId) {
    this.accountId = accountId;
    this.balance = 0;
    this.version = 0;
  }

  apply(event) {
    if (event.type === "Deposited") this.balance += event.payload.amount;
    if (event.type === "Withdrawn") this.balance -= event.payload.amount;
    this.version++;
  }

  static rehydrate(accountId, events) {
    const account = new BankAccount(accountId);
    events.forEach(e => account.apply(e));
    return account;
  }
}

// Usage
const store = new EventStore();
const accountId = "ACC-123";

store.append(accountId, new Event("Deposited", accountId, { amount: 100 }));
store.append(accountId, new Event("Withdrawn", accountId, { amount: 30 }));
store.append(accountId, new Event("Deposited", accountId, { amount: 50 }));

const account = BankAccount.rehydrate(accountId, store.getStream(accountId));
console.log("Balance:", account.balance); // 120

// Audit trail
store.getStream(accountId).forEach(e =>
  console.log(`${e.timestamp}: ${e.type}`, e.payload)
);
```

### Java

```java
import java.util.*;

class Event {
    String type;
    String entityId;
    Map<String, Object> payload;
    String timestamp;

    Event(String type, String entityId, Map<String, Object> payload) {
        this.type = type;
        this.entityId = entityId;
        this.payload = payload;
        this.timestamp = new Date().toString();
    }
}

class EventStore {
    private final Map<String, List<Event>> streams = new HashMap<>();

    void append(String entityId, Event event) {
        streams.computeIfAbsent(entityId, k -> new ArrayList<>()).add(event);
    }

    List<Event> getStream(String entityId) {
        return new ArrayList<>(streams.getOrDefault(entityId, List.of()));
    }
}

class BankAccount {
    String accountId;
    double balance = 0;
    int version = 0;

    BankAccount(String accountId) {
        this.accountId = accountId;
    }

    void apply(Event event) {
        switch (event.type) {
            case "Deposited" -> balance += (double) event.payload.get("amount");
            case "Withdrawn" -> balance -= (double) event.payload.get("amount");
        }
        version++;
    }

    static BankAccount rehydrate(String accountId, List<Event> events) {
        BankAccount account = new BankAccount(accountId);
        events.forEach(account::apply);
        return account;
    }
}

// Usage
EventStore store = new EventStore();
String accountId = "ACC-123";

store.append(accountId, new Event("Deposited", accountId, Map.of("amount", 100.0)));
store.append(accountId, new Event("Withdrawn", accountId, Map.of("amount", 30.0)));
store.append(accountId, new Event("Deposited", accountId, Map.of("amount", 50.0)));

BankAccount account = BankAccount.rehydrate(accountId, store.getStream(accountId));
System.out.println("Balance: " + account.balance); // 120.0
```

## Explanation

Event Sourcing replaces the traditional CRUD model with an append-only event log:

- **Event Store**: Append-only log of all domain events per entity
- **Events**: Immutable records describing what happened (e.g., `Deposited`, `Withdrawn`)
- **Entity Rehydration**: Rebuilding current state by replaying all events for an entity
- **Projections**: Creating read-optimized views by subscribing to the event stream
- **Snapshots**: Periodically saving the computed state to avoid replaying thousands of events

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Full Event Sourcing** | All state from events; no mutable DB | Maximum auditability; compliance |
| **Hybrid** | Events + current state snapshot | Performance; reduce replay cost |
| **Temporal Queries** | Query state at any point in time | Debugging; historical reporting |
| **Event Replay** | Replay events to rebuild or migrate | Schema migrations; bug recovery |

## Best Practices

- **Events should describe business intent** (e.g., `OrderPlaced`) not technical actions (`RowInserted`)
- **Never delete or mutate events** — the log is immutable
- **Use snapshots for long-lived entities** to avoid replaying thousands of events
- **Version your event schemas** for forward/backward compatibility
- **Idempotent consumers** — the same event should be safe to process multiple times
- **Encrypt sensitive payload fields** at the application level

## Common Mistakes

- Using events as a message bus instead of a state store (separate concerns)
- Mutating or deleting events, breaking the audit trail
- Forgetting to handle event schema evolution (breaking old replays)
- Replaying all events from the beginning of time without snapshots
- Storing large binary payloads inside events instead of references
- Not handling duplicate event delivery in distributed systems

## Frequently Asked Questions

**Q: How do I handle schema changes in events?**
A: Version your event types (`OrderPlaced_v1`, `OrderPlaced_v2`). During replay, use an upcaster that transforms old events into the current schema before applying them.

**Q: Can I delete data under GDPR with Event Sourcing?**
A: You cannot delete events, but you can encrypt them with a user-specific key and delete that key. Alternatively, append a `DataForgotten` event and filter it in projections.

**Q: How do snapshots work?**
A: After every N events, save the computed entity state. On rehydration, load the latest snapshot and replay only events after it. This keeps replay time constant.
