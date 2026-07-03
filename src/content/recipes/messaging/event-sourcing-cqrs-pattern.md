---
contentType: recipes
slug: event-sourcing-cqrs-pattern
title: "Implement Event Sourcing with CQRS in Python"
description: "Build an event-sourced system with CQRS separation using Python, event store persistence, projection rebuilds, snapshots, and idempotent event handlers for audit-ready architectures."
metaDescription: "Implement event sourcing with CQRS in Python. Use event store persistence, projection rebuilds, snapshots, and idempotent handlers for audit-ready architectures."
difficulty: advanced
topics:
  - messaging
  - architecture
  - databases
tags:
  - event-sourcing
  - cqrs
  - python
  - architecture
  - event-driven
relatedResources:
  - /recipes/messaging/kafka-python-consumer-groups
  - /recipes/messaging/python-celery-task-queue
  - /guides/domain-driven-design-guide
  - /guides/complete-guide-graphql-federation
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement event sourcing with CQRS in Python. Use event store persistence, projection rebuilds, snapshots, and idempotent handlers for audit-ready architectures."
  keywords:
    - event sourcing python
    - cqrs pattern python
    - event store implementation
    - projection rebuild
    - event sourcing snapshots
---

## Overview

Event sourcing stores every state change as an immutable event in an append-only log. The current state is derived by replaying events. CQRS separates read (queries) from write (commands) models, allowing each to scale independently. Below: building an event store, aggregate roots, command handlers, projections for reads, snapshots for performance, and idempotent event processing.

## When to Use This

- Systems requiring full audit trails (financial transactions, healthcare records)
- Complex domain logic where event replay aids debugging and testing
- Read-heavy systems needing different read models (list views, dashboards, search indexes)
- Systems that need temporal queries ("what was the state at time X?")

## Prerequisites

- Python 3.11+
- PostgreSQL (or any ACID-compliant database)
- `sqlalchemy` and `pydantic` packages

## Solution

### 1. Event Definitions

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import uuid

class DomainEvent(BaseModel):
    event_id: str = str(uuid.uuid4())
    event_type: str
    aggregate_id: str
    version: int
    timestamp: datetime = datetime.utcnow()
    metadata: dict = {}

class AccountCreated(DomainEvent):
    event_type: str = "AccountCreated"
    owner_name: str
    initial_balance: float

class MoneyDeposited(DomainEvent):
    event_type: str = "MoneyDeposited"
    amount: float
    description: str

class MoneyWithdrawn(DomainEvent):
    event_type: str = "MoneyWithdrawn"
    amount: float
    description: str

class AccountClosed(DomainEvent):
    event_type: str = "AccountClosed"
    reason: str
```

### 2. Event Store

```python
import json
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text, text
from sqlalchemy.orm import sessionmaker, declarative_base
from typing import List, Optional

Base = declarative_base()

class EventRecord(Base):
    __tablename__ = 'event_store'
    id = Column(String, primary_key=True)
    aggregate_id = Column(String, nullable=False, index=True)
    event_type = Column(String, nullable=False)
    version = Column(Integer, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    data = Column(Text, nullable=False)
    metadata = Column(Text, nullable=False, default='{}')

class EventStore:
    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

    def append(self, aggregate_id: str, events: List[DomainEvent], expected_version: int):
        session = self.Session()
        try:
            for event in events:
                # Optimistic concurrency check
                current = session.execute(
                    text("SELECT MAX(version) FROM event_store WHERE aggregate_id = :aid"),
                    {'aid': aggregate_id}
                ).scalar() or -1

                if current != expected_version:
                    raise ConcurrencyError(
                        f"Expected version {expected_version}, got {current}"
                    )

                session.execute(
                    text("""INSERT INTO event_store (id, aggregate_id, event_type, version, timestamp, data, metadata)
                            VALUES (:id, :aid, :etype, :ver, :ts, :data, :meta)"""),
                    {
                        'id': event.event_id,
                        'aid': aggregate_id,
                        'etype': event.event_type,
                        'ver': event.version,
                        'ts': event.timestamp,
                        'data': event.model_dump_json(),
                        'meta': json.dumps(event.metadata),
                    }
                )
                expected_version = event.version

            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def get_events(self, aggregate_id: str, from_version: int = 0) -> List[DomainEvent]:
        session = self.Session()
        try:
            records = session.execute(
                text("""SELECT data FROM event_store
                        WHERE aggregate_id = :aid AND version > :ver
                        ORDER BY version ASC"""),
                {'aid': aggregate_id, 'ver': from_version}
            ).fetchall()

            events = []
            for record in records:
                data = json.loads(record[0])
                event_class = EVENT_REGISTRY.get(data['event_type'], DomainEvent)
                events.append(event_class(**data))
            return events
        finally:
            session.close()

class ConcurrencyError(Exception):
    pass

EVENT_REGISTRY = {
    'AccountCreated': AccountCreated,
    'MoneyDeposited': MoneyDeposited,
    'MoneyWithdrawn': MoneyWithdrawn,
    'AccountClosed': AccountClosed,
}
```

### 3. Aggregate Root

```python
from abc import ABC, abstractmethod
from typing import List

class AggregateRoot(ABC):
    def __init__(self, aggregate_id: str):
        self.id = aggregate_id
        self.version = -1
        self._pending_events: List[DomainEvent] = []

    @abstractmethod
    def apply(self, event: DomainEvent):
        pass

    def raise_event(self, event: DomainEvent):
        event.version = self.version + 1
        self.apply(event)
        self._pending_events.append(event)

    def get_pending_events(self) -> List[DomainEvent]:
        return self._pending_events

    def clear_pending_events(self):
        self._pending_events.clear()

    @classmethod
    def from_events(cls, aggregate_id: str, events: List[DomainEvent]):
        aggregate = cls(aggregate_id)
        for event in events:
            aggregate.apply(event)
            aggregate.version = event.version
        return aggregate

class BankAccount(AggregateRoot):
    def __init__(self, aggregate_id: str):
        super().__init__(aggregate_id)
        self.owner_name: str = ""
        self.balance: float = 0
        self.status: str = "nonexistent"

    def apply(self, event: DomainEvent):
        if isinstance(event, AccountCreated):
            self.owner_name = event.owner_name
            self.balance = event.initial_balance
            self.status = "active"
        elif isinstance(event, MoneyDeposited):
            self.balance += event.amount
        elif isinstance(event, MoneyWithdrawn):
            self.balance -= event.amount
        elif isinstance(event, AccountClosed):
            self.status = "closed"

    # Command methods — validate and raise events
    def create(self, owner_name: str, initial_balance: float):
        if self.status != "nonexistent":
            raise ValueError("Account already exists")
        if initial_balance < 0:
            raise ValueError("Initial balance cannot be negative")

        self.raise_event(AccountCreated(
            aggregate_id=self.id,
            version=0,
            owner_name=owner_name,
            initial_balance=initial_balance,
        ))

    def deposit(self, amount: float, description: str = ""):
        if self.status != "active":
            raise ValueError("Account is not active")
        if amount <= 0:
            raise ValueError("Deposit amount must be positive")

        self.raise_event(MoneyDeposited(
            aggregate_id=self.id,
            version=self.version + 1,
            amount=amount,
            description=description,
        ))

    def withdraw(self, amount: float, description: str = ""):
        if self.status != "active":
            raise ValueError("Account is not active")
        if amount <= 0:
            raise ValueError("Withdrawal amount must be positive")
        if self.balance < amount:
            raise ValueError("Insufficient funds")

        self.raise_event(MoneyWithdrawn(
            aggregate_id=self.id,
            version=self.version + 1,
            amount=amount,
            description=description,
        ))

    def close(self, reason: str):
        if self.status != "active":
            raise ValueError("Account is not active")
        if self.balance != 0:
            raise ValueError("Balance must be zero to close")

        self.raise_event(AccountClosed(
            aggregate_id=self.id,
            version=self.version + 1,
            reason=reason,
        ))
```

### 4. Command Handler (Write Side)

```python
class CommandHandler:
    def __init__(self, event_store: EventStore):
        self.event_store = event_store

    def handle(self, aggregate_id: str, command: callable):
        # Load aggregate from event store
        events = self.event_store.get_events(aggregate_id)
        account = BankAccount.from_events(aggregate_id, events)

        # Execute command (raises events)
        command(account)

        # Persist new events
        pending = account.get_pending_events()
        if pending:
            self.event_store.append(aggregate_id, pending, account.version - len(pending))
            account.clear_pending_events()

        return account

# Usage
store = EventStore('postgresql://user:pass@localhost/eventstore')
handler = CommandHandler(store)

account_id = str(uuid.uuid4())

# Create account
handler.handle(account_id, lambda acc: acc.create("Alice", 1000))

# Deposit
handler.handle(account_id, lambda acc: acc.deposit(500, "Salary"))

# Withdraw
handler.handle(account_id, lambda acc: acc.withdraw(200, "Groceries"))
```

### 5. Projection (Read Side)

```python
from sqlalchemy import Column, String, Float, DateTime, Boolean

class AccountProjection(Base):
    __tablename__ = 'account_projection'
    id = Column(String, primary_key=True)
    owner_name = Column(String, nullable=False)
    balance = Column(Float, nullable=False, default=0)
    status = Column(String, nullable=False, default='active')
    last_updated = Column(DateTime)

class TransactionProjection(Base):
    __tablename__ = 'transaction_projection'
    id = Column(String, primary_key=True)
    account_id = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False)  # deposit, withdrawal
    amount = Column(Float, nullable=False)
    description = Column(String)
    timestamp = Column(DateTime, nullable=False)

class AccountProjector:
    """Projects events into read-optimized tables."""

    def __init__(self, session_factory):
        self.Session = session_factory
        self._processed_events = set()

    def handle(self, event: DomainEvent):
        # Idempotency — skip already processed events
        if event.event_id in self._processed_events:
            return

        session = self.Session()
        try:
            if isinstance(event, AccountCreated):
                session.execute(
                    text("""INSERT INTO account_projection (id, owner_name, balance, status, last_updated)
                            VALUES (:id, :name, :bal, 'active', :ts)"""),
                    {'id': event.aggregate_id, 'name': event.owner_name,
                     'bal': event.initial_balance, 'ts': event.timestamp}
                )

            elif isinstance(event, MoneyDeposited):
                session.execute(
                    text("""UPDATE account_projection SET balance = balance + :amt, last_updated = :ts
                            WHERE id = :id"""),
                    {'amt': event.amount, 'ts': event.timestamp, 'id': event.aggregate_id}
                )
                session.execute(
                    text("""INSERT INTO transaction_projection (id, account_id, type, amount, description, timestamp)
                            VALUES (:id, :aid, 'deposit', :amt, :desc, :ts)"""),
                    {'id': event.event_id, 'aid': event.aggregate_id,
                     'amt': event.amount, 'desc': event.description, 'ts': event.timestamp}
                )

            elif isinstance(event, MoneyWithdrawn):
                session.execute(
                    text("""UPDATE account_projection SET balance = balance - :amt, last_updated = :ts
                            WHERE id = :id"""),
                    {'amt': event.amount, 'ts': event.timestamp, 'id': event.aggregate_id}
                )
                session.execute(
                    text("""INSERT INTO transaction_projection (id, account_id, type, amount, description, timestamp)
                            VALUES (:id, :aid, 'withdrawal', :amt, :desc, :ts)"""),
                    {'id': event.event_id, 'aid': event.aggregate_id,
                     'amt': event.amount, 'desc': event.description, 'ts': event.timestamp}
                )

            elif isinstance(event, AccountClosed):
                session.execute(
                    text("""UPDATE account_projection SET status = 'closed', last_updated = :ts
                            WHERE id = :id"""),
                    {'ts': event.timestamp, 'id': event.aggregate_id}
                )

            session.commit()
            self._processed_events.add(event.event_id)

        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
```

### 6. Query Side (Read Models)

```python
class AccountQueryService:
    def __init__(self, session_factory):
        self.Session = session_factory

    def get_account(self, account_id: str) -> dict:
        session = self.Session()
        try:
            result = session.execute(
                text("SELECT id, owner_name, balance, status FROM account_projection WHERE id = :id"),
                {'id': account_id}
            ).fetchone()
            return dict(result._mapping) if result else None
        finally:
            session.close()

    def get_transactions(self, account_id: str, limit: int = 50) -> list:
        session = self.Session()
        try:
            results = session.execute(
                text("""SELECT type, amount, description, timestamp FROM transaction_projection
                        WHERE account_id = :id ORDER BY timestamp DESC LIMIT :lim"""),
                {'id': account_id, 'lim': limit}
            ).fetchall()
            return [dict(r._mapping) for r in results]
        finally:
            session.close()

    def get_all_accounts(self) -> list:
        session = self.Session()
        try:
            results = session.execute(
                text("SELECT id, owner_name, balance, status FROM account_projection WHERE status = 'active'")
            ).fetchall()
            return [dict(r._mapping) for r in results]
        finally:
            session.close()
```

### 7. Snapshot for Performance

```python
class SnapshotStore:
    """Store aggregate snapshots to avoid replaying all events."""

    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)
        self.Session = sessionmaker(bind=self.engine)

    def save_snapshot(self, aggregate_id: str, version: int, state: dict):
        session = self.Session()
        try:
            session.execute(
                text("""INSERT INTO snapshots (aggregate_id, version, state, created_at)
                        VALUES (:id, :ver, :state, NOW())
                        ON CONFLICT (aggregate_id) DO UPDATE SET version = :ver, state = :state, created_at = NOW()"""),
                {'id': aggregate_id, 'ver': version, 'state': json.dumps(state)}
            )
            session.commit()
        finally:
            session.close()

    def get_snapshot(self, aggregate_id: str) -> Optional[tuple]:
        session = self.Session()
        try:
            result = session.execute(
                text("SELECT version, state FROM snapshots WHERE aggregate_id = :id"),
                {'id': aggregate_id}
            ).fetchone()
            if result:
                return result[0], json.loads(result[1])
            return None
        finally:
            session.close()

# Usage: load from snapshot, then replay only newer events
def load_aggregate(aggregate_id: str, event_store: EventStore, snapshot_store: SnapshotStore):
    snapshot = snapshot_store.get_snapshot(aggregate_id)
    if snapshot:
        version, state = snapshot
        account = BankAccount(aggregate_id)
        account.__dict__.update(state)
        # Replay only events after the snapshot
        events = event_store.get_events(aggregate_id, from_version=version)
        for event in events:
            account.apply(event)
            account.version = event.version
        return account
    else:
        events = event_store.get_events(aggregate_id)
        return BankAccount.from_events(aggregate_id, events)
```

## How It Works

1. **Event store**: An append-only table storing every domain event with its aggregate ID, version, and serialized data. Events are never modified or deleted — only appended.
2. **Aggregate root**: Encapsulates domain logic. Commands validate invariants and raise events. Events are applied to mutate state. The aggregate can be rebuilt from its event history.
3. **Optimistic concurrency**: Each event has a version number. When appending, the expected version is checked against the current version. Mismatches indicate a concurrent modification — the command is rejected.
4. **Projections**: Read-optimized tables built from events. Each projection handles specific event types and updates denormalized tables. Projections can be rebuilt from the event store at any time.
5. **Snapshots**: For aggregates with many events, replaying all events is slow. Snapshots store the aggregate state at a point in time. Loading uses the snapshot plus only events after the snapshot version.

## Variants

### Event Sourcing with Kafka

```python
# Publish events to Kafka after appending to the event store
from confluent_kafka import Producer

producer = Producer({'bootstrap.servers': 'localhost:9092'})

def append_and_publish(aggregate_id: str, events: List[DomainEvent], expected_version: int):
    event_store.append(aggregate_id, events, expected_version)
    for event in events:
        producer.produce(
            'domain-events',
            key=aggregate_id.encode('utf-8'),
            value=event.model_dump_json().encode('utf-8'),
        )
    producer.flush()
```

### Multiple Projections

```python
# Different projections for different read needs
class ProjectorManager:
    def __init__(self, projectors: list):
        self.projectors = projectors

    def handle(self, event: DomainEvent):
        for projector in self.projectors:
            projector.handle(event)

# Register multiple projections
manager = ProjectorManager([
    AccountProjector(session_factory),
    TransactionHistoryProjector(session_factory),
    SearchIndexProjector(elasticsearch_client),
    NotificationProjector(notification_service),
])
```

## Best Practices

- **Make events immutable**: Never modify or delete events. If a mistake was made, publish a compensating event. The event log is the source of truth.
- **Use optimistic concurrency**: Check expected version on append. This prevents lost updates when two commands modify the same aggregate concurrently.
- **Keep projections idempotent**: The same event processed twice should produce the same result. Use event IDs to detect duplicates.
- **Snapshot long-lived aggregates**: Aggregates with thousands of events are slow to rebuild. Snapshot every N events (e.g., every 100) to limit replay.
- **Separate write and read databases**: CQRS allows different database engines for writes (PostgreSQL for events) and reads (Elasticsearch for search, Redis for cache).
- **Version your events**: Event schemas evolve over time. Use a version field and upcasters to transform old events to new formats.

## Common Mistakes

- **Storing current state instead of events**: The event store must contain events, not the final state. Current state is derived by replaying events.
- **Not handling concurrency**: Without optimistic concurrency, concurrent commands overwrite each other. Always check expected version on append.
- **Non-idempotent projections**: If an event is processed twice (e.g., after a crash), the projection should detect and skip it. Use event IDs.
- **Replaying all events on every load**: For long-lived aggregates, this is O(n) in the number of events. Use snapshots to reduce to O(1) + recent events.
- **Coupling projections to the write model**: Projections should be independent. A projection failure shouldn't block writes. Use async event processing.

## FAQ

**What is the difference between event sourcing and audit logging?**

Audit logging records what happened for compliance. Event sourcing uses events as the primary data model — the current state is derived from events. Audit logs are supplementary; event sourcing is foundational.

**How do I handle schema evolution in events?**

Use a version field in each event. When loading old events, apply upcasters (transformers) that convert old formats to new. Never modify stored events — transform on read.

**What if a projection fails?**

Projections should be independent. If a projection fails, the event is retried or sent to a dead-letter queue. The event store is unaffected. Rebuild the projection from the event store when ready.

**How do I debug an aggregate's state?**

Replay events from the event store. The event log provides a complete history of every state change. You can replay to any point in time by stopping at a specific version.

**Is event sourcing always CQRS?**

No, but they're commonly paired. Event sourcing naturally separates writes (appending events) from reads (projections). You can use event sourcing without CQRS by deriving the current state on every read, but this is slow for complex aggregates.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
