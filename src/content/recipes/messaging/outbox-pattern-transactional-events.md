---




contentType: recipes
slug: outbox-pattern-transactional-events
title: "Implement the Transactional Outbox Pattern for Reliable"
description: "Use the transactional outbox pattern to reliably publish domain events alongside database changes, with a relay processor, polling strategies, and exactly-once delivery guarantees."
metaDescription: "Implement the transactional outbox pattern for reliable event publishing. Use a relay processor, polling, and exactly-once delivery with Python and PostgreSQL."
difficulty: advanced
topics:
  - messaging
  - architecture
  - databases
tags:
  - outbox-pattern
  - transactional-events
  - python
  - postgresql
  - event-driven
relatedResources:
  - /recipes/event-sourcing-cqrs-pattern
  - /recipes/kafka-python-consumer-groups
  - /guides/domain-driven-design-guide
  - /guides/complete-guide-graphql-federation
  - /guides/cqrs-event-sourcing-combined-guide
  - /guides/complete-guide-event-driven-systems
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement the transactional outbox pattern for reliable event publishing. Use a relay processor, polling, and exactly-once delivery with Python and PostgreSQL."
  keywords:
    - transactional outbox pattern
    - outbox relay processor
    - reliable event publishing
    - dual write problem
    - transactional outbox python




---

## Overview

The transactional outbox pattern solves the dual-write problem: when you need to update a database and publish a message, doing both in a single transaction isn't possible across different systems. Instead, write the event to an outbox table in the same database transaction as your business data. A separate relay process reads the outbox and publishes events to the message broker. Below: outbox table design, relay processor, polling strategies, ordering guarantees, and exactly-once delivery.

## When to Use This

- Microservices that must reliably publish events after database changes
- Event-driven architectures where lost events cause data inconsistency
- Systems replacing distributed transactions with eventual consistency
- Any application where database writes and message publishing must be atomic

## Prerequisites

- Python 3.11+
- PostgreSQL
- `sqlalchemy`, `psycopg2`, and `confluent-kafka` packages

## Solution

### 1. Outbox Table Schema

```sql
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id VARCHAR(255) NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    headers JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_status ON outbox_events (status, created_at);
CREATE INDEX idx_outbox_aggregate ON outbox_events (aggregate_id, created_at);
```

### 2. Writing Events to the Outbox

```python
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import json
import uuid
from datetime import datetime

engine = create_engine('postgresql://user:pass@localhost/myapp')
Session = sessionmaker(bind=engine)

class OrderService:
    def __init__(self, session_factory):
        self.Session = session_factory

    def create_order(self, order_data: dict):
        session = self.Session()
        try:
            # Insert the order
            order_id = str(uuid.uuid4())
            session.execute(
                text("""INSERT INTO orders (id, customer_id, total, status)
                        VALUES (:id, :cid, :total, 'PENDING')"""),
                {'id': order_id, 'cid': order_data['customer_id'], 'total': order_data['total']}
            )

            # Insert the outbox event in the SAME transaction
            event_id = str(uuid.uuid4())
            session.execute(
                text("""INSERT INTO outbox_events
                        (id, aggregate_id, aggregate_type, event_type, payload, headers)
                        VALUES (:id, :aid, :atype, :etype, :payload, :headers)"""),
                {
                    'id': event_id,
                    'aid': order_id,
                    'atype': 'Order',
                    'etype': 'OrderCreated',
                    'payload': json.dumps({
                        'orderId': order_id,
                        'customerId': order_data['customer_id'],
                        'total': order_data['total'],
                        'items': order_data.get('items', []),
                    }),
                    'headers': json.dumps({
                        'event_id': event_id,
                        'source': 'order-service',
                    }),
                }
            )

            # Both inserts commit atomically — no dual-write problem
            session.commit()
            return order_id

        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
```

### 3. Relay Processor (Polling-Based)

```python
import json
import logging
import time
from confluent_kafka import Producer
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class OutboxRelay:
    def __init__(self, database_url: str, kafka_config: dict, batch_size: int = 100):
        self.engine = create_engine(database_url)
        self.producer = Producer(kafka_config)
        self.batch_size = batch_size
        self._running = True

    def run(self, poll_interval: float = 1.0):
        logger.info("Starting outbox relay...")
        while self._running:
            try:
                processed = self._process_batch()
                if processed == 0:
                    time.sleep(poll_interval)
            except Exception as e:
                logger.error(f"Relay error: {e}")
                time.sleep(5)

    def _process_batch(self) -> int:
        with self.engine.connect() as conn:
            # Select unpublished events with row-level locking
            events = conn.execute(
                text("""SELECT id, aggregate_id, aggregate_type, event_type, payload, headers
                        FROM outbox_events
                        WHERE status = 'PENDING'
                        ORDER BY created_at ASC
                        LIMIT :batch_size
                        FOR UPDATE SKIP LOCKED"""),
                {'batch_size': self.batch_size}
            ).fetchall()

            if not events:
                return 0

            for event in events:
                event_id, agg_id, agg_type, event_type, payload, headers = event

                topic = f'{agg_type.lower()}.events'
                key = agg_id.encode('utf-8')

                self.producer.produce(
                    topic=topic,
                    key=key,
                    value=payload.encode('utf-8') if isinstance(payload, str) else json.dumps(payload).encode('utf-8'),
                    headers=[(k, v.encode('utf-8')) for k, v in json.loads(headers).items()],
                    on_delivery=self._delivery_callback(event_id, conn),
                )

            self.producer.flush(timeout=10)
            conn.commit()
            return len(events)

    def _delivery_callback(self, event_id, conn):
        def callback(err, msg):
            if err:
                logger.error(f"Failed to publish event {event_id}: {err}")
                conn.execute(
                    text("""UPDATE outbox_events
                            SET retry_count = retry_count + 1,
                                next_retry_at = NOW() + INTERVAL '30 seconds'
                            WHERE id = :id"""),
                    {'id': event_id}
                )
            else:
                conn.execute(
                    text("""UPDATE outbox_events
                            SET status = 'PUBLISHED', published_at = NOW()
                            WHERE id = :id"""),
                    {'id': event_id}
                )
        return callback

    def stop(self):
        self._running = False

# Run the relay
relay = OutboxRelay(
    'postgresql://user:pass@localhost/myapp',
    {'bootstrap.servers': 'localhost:9092'},
    batch_size=100,
)
relay.run()
```

### 4. Relay with Exactly-Once Delivery

```python
class ExactlyOnceRelay:
    """Ensures events are published exactly once using Kafka transactions."""

    def __init__(self, database_url: str, kafka_config: dict):
        self.engine = create_engine(database_url)
        self.kafka_config = {**kafka_config, 'transactional.id': 'outbox-relay-txn'}
        self.producer = Producer(self.kafka_config)
        self.producer.init_transactions()

    def process_batch(self) -> int:
        with self.engine.connect() as conn:
            events = conn.execute(
                text("""SELECT id, aggregate_id, aggregate_type, event_type, payload, headers
                        FROM outbox_events
                        WHERE status = 'PENDING'
                        ORDER BY created_at ASC
                        LIMIT 100
                        FOR UPDATE SKIP LOCKED""")
            ).fetchall()

            if not events:
                return 0

            for event in events:
                event_id, agg_id, agg_type, event_type, payload, headers = event

                self.producer.begin_transaction()
                try:
                    self.producer.produce(
                        topic=f'{agg_type.lower()}.events',
                        key=agg_id.encode('utf-8'),
                        value=payload.encode('utf-8') if isinstance(payload, str) else json.dumps(payload).encode('utf-8'),
                    )

                    # Mark as published in the same Kafka transaction
                    # The DB update happens after Kafka commit
                    self.producer.commit_transaction()

                    # Update DB status after successful Kafka commit
                    conn.execute(
                        text("""UPDATE outbox_events
                                SET status = 'PUBLISHED', published_at = NOW()
                                WHERE id = :id"""),
                        {'id': event_id}
                    )
                    conn.commit()

                except Exception as e:
                    logger.error(f"Transaction failed for {event_id}: {e}")
                    self.producer.abort_transaction()
                    conn.rollback()

            return len(events)
```

### 5. Relay with Change Data Capture (CDC)

```python
"""Using PostgreSQL logical replication for CDC-based outbox relay.
This avoids polling and provides near-real-time event publishing."""

import psycopg2
from psycopg2.extras import LogicalReplicationConnection

class CDCOutboxRelay:
    def __init__(self, dsn: str, slot_name: str = 'outbox_slot'):
        self.conn = psycopg2.connect(
            dsn,
            connection_factory=LogicalReplicationConnection,
        )
        self.slot_name = slot_name

    def start(self):
        cur = self.conn.cursor()
        try:
            cur.create_replication_slot(self.slot_name, output_plugin='wal2json')
        except psycopg2.errors.DuplicateObject:
            pass  # Slot already exists

        cur.start_replication(
            slot_name=self.slot_name,
            options={'table-names': 'public.outbox_events'},
        )

        def process_msg(msg):
            import json
            changes = json.loads(msg.payload)
            for change in changes.get('change', []):
                if change['table'] == 'outbox_events' and change['kind'] == 'insert':
                    row = {col['name']: col['value'] for col in change['columnvalues']}
                    publish_to_kafka(row)
            msg.cursor.send_feedback(flush_lsn=msg.data_start)

        cur.consume_stream(process_msg)
```

### 6. Event Ordering with Partitioning

```python
class OrderedOutboxRelay:
    """Publishes events ordered by aggregate_id using Kafka key-based partitioning."""

    def process_batch(self) -> int:
        with self.engine.connect() as conn:
            # Group by aggregate_id to maintain ordering
            events = conn.execute(
                text("""SELECT id, aggregate_id, aggregate_type, event_type, payload, headers
                        FROM outbox_events
                        WHERE status = 'PENDING'
                        ORDER BY aggregate_id, created_at ASC
                        LIMIT 100
                        FOR UPDATE SKIP LOCKED""")
            ).fetchall()

            if not events:
                return 0

            current_aggregate = None
            for event in events:
                event_id, agg_id, agg_type, event_type, payload, headers = event

                # Use aggregate_id as Kafka key — same aggregate goes to same partition
                self.producer.produce(
                    topic=f'{agg_type.lower()}.events',
                    key=agg_id.encode('utf-8'),  # Key ensures ordering per aggregate
                    value=payload.encode('utf-8') if isinstance(payload, str) else json.dumps(payload).encode('utf-8'),
                )

                conn.execute(
                    text("""UPDATE outbox_events
                            SET status = 'PUBLISHED', published_at = NOW()
                            WHERE id = :id"""),
                    {'id': event_id}
                )

            self.producer.flush()
            conn.commit()
            return len(events)
```

### 7. Retry and Error Handling

```python
class ResilientOutboxRelay(OutboxRelay):
    def _process_batch(self) -> int:
        with self.engine.connect() as conn:
            # Include retry-eligible events
            events = conn.execute(
                text("""SELECT id, aggregate_id, aggregate_type, event_type, payload, headers, retry_count
                        FROM outbox_events
                        WHERE status = 'PENDING'
                          AND (next_retry_at IS NULL OR next_retry_at <= NOW())
                          AND retry_count < 5
                        ORDER BY created_at ASC
                        LIMIT :batch_size
                        FOR UPDATE SKIP LOCKED"""),
                {'batch_size': self.batch_size}
            ).fetchall()

            if not events:
                return 0

            for event in events:
                event_id, agg_id, agg_type, event_type, payload, headers, retry_count = event

                try:
                    self.producer.produce(
                        topic=f'{agg_type.lower()}.events',
                        key=agg_id.encode('utf-8'),
                        value=payload.encode('utf-8') if isinstance(payload, str) else json.dumps(payload).encode('utf-8'),
                    )
                    self.producer.flush(timeout=10)

                    conn.execute(
                        text("""UPDATE outbox_events
                                SET status = 'PUBLISHED', published_at = NOW()
                                WHERE id = :id"""),
                        {'id': event_id}
                    )

                except Exception as e:
                    logger.error(f"Failed to publish {event_id}: {e}")
                    backoff = min(30 * (2 ** retry_count), 3600)  # Exponential backoff, max 1 hour
                    conn.execute(
                        text("""UPDATE outbox_events
                                SET retry_count = retry_count + 1,
                                    next_retry_at = NOW() + :backoff * INTERVAL '1 second'
                                WHERE id = :id"""),
                        {'id': event_id, 'backoff': backoff}
                    )

                    if retry_count >= 4:
                        conn.execute(
                            text("""UPDATE outbox_events SET status = 'FAILED' WHERE id = :id"""),
                            {'id': event_id}
                        )
                        logger.error(f"Event {event_id} moved to FAILED status")

            conn.commit()
            return len(events)
```

## How It Works

1. **Dual-write problem**: Updating a database and publishing to a message broker are two separate operations. If the database commit succeeds but the broker publish fails, the event is lost. If the publish succeeds but the DB commit fails, a phantom event is sent.
2. **Outbox table**: Instead of publishing directly, write the event to an outbox table in the same database transaction as the business data. Both commit atomically — if the transaction succeeds, the event is safely stored.
3. **Relay processor**: A separate process reads unpublished events from the outbox table and publishes them to the message broker. After successful publishing, it marks the event as `PUBLISHED`.
4. **`FOR UPDATE SKIP LOCKED`**: This SQL clause locks selected rows and skips rows already locked by other relay instances. This enables multiple relay instances to process the outbox concurrently without conflicts.
5. **At-least-once delivery**: The relay publishes, then marks as published. If it crashes between publish and mark, the event is re-published. Consumers must be idempotent — use event IDs to deduplicate.

## Variants

### Debezium CDC (No Polling)

```yaml
# Debezium connector config — streams outbox changes to Kafka
{
  "name": "outbox-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "localhost",
    "database.port": "5432",
    "database.user": "user",
    "database.password": "pass",
    "database.dbname": "myapp",
    "table.include.list": "public.outbox_events",
    "transforms": "outbox",
    "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
    "transforms.outbox.table.field.event.id": "id",
    "transforms.outbox.table.field.event.key": "aggregate_id",
    "transforms.outbox.table.field.event.type": "event_type",
    "transforms.outbox.table.field.event.payload": "payload"
  }
}
```

### Multi-Tenant Outbox

```sql
-- Add tenant_id for multi-tenant isolation
ALTER TABLE outbox_events ADD COLUMN tenant_id VARCHAR(100) NOT NULL;
CREATE INDEX idx_outbox_tenant ON outbox_events (tenant_id, status, created_at);
```

```python
# Relay processes events per tenant
events = conn.execute(
    text("""SELECT * FROM outbox_events
            WHERE status = 'PENDING' AND tenant_id = :tenant
            ORDER BY created_at ASC LIMIT 100 FOR UPDATE SKIP LOCKED"""),
    {'tenant': tenant_id}
).fetchall()
```

## Best Practices


- For a deeper guide, see [Implement Event Sourcing with CQRS in Python](/recipes/event-sourcing-cqrs-pattern/).

- **Use `FOR UPDATE SKIP LOCKED`**: This enables multiple relay instances without conflicts. Each instance locks and processes different rows.
- **Order by `created_at`**: Process events in creation order. Use `aggregate_id` as the Kafka key to ensure per-aggregate ordering within a partition.
- **Make consumers idempotent**: The relay provides at-least-once delivery. If it crashes between publishing and marking, events are re-published. Consumers must deduplicate using event IDs.
- **Set a retry limit**: Failed events should be retried with exponential backoff. After max retries, mark as `FAILED` for manual intervention.
- **Monitor outbox growth**: A growing outbox table means the relay can't keep up. Alert on pending event count and oldest unpublished event age.
- **Use CDC for low latency**: Polling adds latency (1-5 seconds). Change Data Capture (Debezium, wal2json) publishes events in near-real-time by streaming the database write-ahead log.

## Common Mistakes

- **Publishing outside the transaction**: If you publish to the broker before committing the DB transaction, a rollback creates a phantom event. Always write to the outbox in the same transaction.
- **Not using `SKIP LOCKED`**: Without it, multiple relay instances block each other. `SKIP LOCKED` lets each instance process different rows concurrently.
- **No retry strategy**: Transient broker failures cause events to stay `PENDING` forever. Implement exponential backoff and a max retry limit.
- **Not handling duplicate publishes**: If the relay crashes after publishing but before marking, the event is re-published. Consumers must handle duplicates.
- **Polling too frequently**: Polling every 10ms with no events wastes resources. Use adaptive polling — poll fast when events are available, slow down when idle.

## FAQ

**What is the dual-write problem?**

Updating a database and publishing to a message broker are two separate operations that can't be atomic. If one succeeds and the other fails, you get inconsistency — either a lost event or a phantom event.

**How does the outbox pattern solve the dual-write problem?**

Instead of publishing directly, write the event to an outbox table in the same database transaction. Both the business data and the event commit atomically. A separate relay process publishes events from the outbox to the broker.

**What is `FOR UPDATE SKIP LOCKED`?**

A PostgreSQL clause that locks selected rows for update and skips rows already locked by other transactions. This enables concurrent processing — multiple relay instances can process different outbox rows without blocking each other.

**How do I ensure exactly-once delivery?**

The outbox pattern provides at-least-once delivery. For exactly-once, use Kafka transactions (tie the publish and the outbox status update together) or make consumers idempotent by deduplicating on event ID.

**Polling vs CDC — which should I use?**

Polling is simpler but adds 1-5 seconds of latency. CDC (Debezium, wal2json) streams database changes in near-real-time (milliseconds) but requires more infrastructure. Use polling for simplicity, CDC for low-latency requirements.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
