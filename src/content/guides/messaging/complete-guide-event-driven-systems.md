---





contentType: guides
slug: complete-guide-event-driven-systems
title: "Complete Guide to Event-Driven Systems"
description: "Design and operate event-driven backends. Covers event sourcing, CQRS, sagas, outbox pattern, idempotency, eventual consistency, and production patterns for reliable event-driven architectures."
metaDescription: "Design event-driven backends. Covers event sourcing, CQRS, sagas, outbox pattern, idempotency, eventual consistency, and production patterns."
difficulty: advanced
topics:
  - messaging
  - architecture
  - infrastructure
tags:
  - event-driven
  - messaging
  - guide
  - event-sourcing
  - cqrs
  - sagas
  - outbox-pattern
  - eventual-consistency
relatedResources:
  - /guides/complete-guide-kafka-production
  - /guides/complete-guide-rabbitmq-architecture
  - /patterns/circuit-breaker-pattern
  - /guides/message-queue-guide
  - /recipes/kafka-spring-boot-stream-listener
  - /recipes/outbox-pattern-transactional-events
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Design event-driven backends. Covers event sourcing, CQRS, sagas, outbox pattern, idempotency, eventual consistency, and production patterns."
  keywords:
    - event driven architecture
    - event sourcing
    - cqrs
    - saga pattern
    - outbox pattern
    - idempotency
    - eventual consistency
    - event driven production





---

## Introduction

Event-driven architecture (EDA) decouples services by communicating through events rather than direct calls. Producers emit events when state changes. Consumers react to events asynchronously. This enables loose coupling, independent scaling, and extensibility. It also introduces challenges: eventual consistency, debugging complexity, ordering guarantees, and idempotency. The following walks through the patterns and practices for building reliable event-driven systems in production.

## Core Concepts

### Events vs Commands vs Queries

```text
Command: "CreateOrder" → Intent, sent to a specific handler, expects response
Event:   "OrderCreated" → Fact, broadcast to anyone interested, no response expected
Query:   "GetOrder"     → Request for data, synchronous, expects response
```

- **Command**: Expresses intent. Sent to one handler. Can be rejected.
- **Event**: Expresses a fact that happened. Broadcast to multiple consumers. Cannot be rejected.
- **Query**: Requests data. Synchronous. Returns a response.

### Event Structure

```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_type": "OrderCreated",
  "aggregate_id": "order-123",
  "aggregate_type": "Order",
  "timestamp": "2026-07-04T12:00:00.000Z",
  "version": 1,
  "metadata": {
    "correlation_id": "req-abc-123",
    "causation_id": "cmd-create-order-456",
    "user_id": "user-789",
    "source": "api-gateway"
  },
  "data": {
    "order_id": "order-123",
    "customer_id": "cust-456",
    "items": [
      {"product_id": "prod-1", "quantity": 2, "price": 29.99}
    ],
    "total": 59.98,
    "currency": "USD"
  }
}
```

## Event Sourcing

Event sourcing stores events as the source of truth instead of mutable state. Each state change is an appended event. Current state is derived by replaying events.

### Basic Event Store

```python
import json
from datetime import datetime
from uuid import uuid4

class EventStore:
    def __init__(self, db):
        self.db = db
    
    def append(self, aggregate_id, event_type, data, metadata=None):
        event = {
            "event_id": str(uuid4()),
            "event_type": event_type,
            "aggregate_id": aggregate_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "data": data,
            "metadata": metadata or {}
        }
        self.db.events.insert_one(event)
        return event
    
    def get_events(self, aggregate_id, from_version=0):
        cursor = self.db.events.find(
            {"aggregate_id": aggregate_id},
            sort=[("timestamp", 1)]
        )
        return list(cursor)[from_version:]
```

### Replaying Events to Build State

```python
class OrderAggregate:
    def __init__(self):
        self.id = None
        self.status = "new"
        self.items = []
        self.total = 0
        self.version = 0
    
    def apply(self, event):
        if event["event_type"] == "OrderCreated":
            self.id = event["data"]["order_id"]
            self.items = event["data"]["items"]
            self.total = event["data"]["total"]
            self.status = "created"
        
        elif event["event_type"] == "OrderPaid":
            self.status = "paid"
        
        elif event["event_type"] == "OrderShipped":
            self.status = "shipped"
        
        elif event["event_type"] == "OrderCancelled":
            self.status = "cancelled"
        
        self.version += 1
    
    @classmethod
    def from_events(cls, events):
        order = cls()
        for event in events:
            order.apply(event)
        return order

# Rebuild order state from events
events = event_store.get_events("order-123")
order = OrderAggregate.from_events(events)
print(f"Order {order.id}: status={order.status}, total={order.total}")
```

### Command Handler with Event Sourcing

```python
class OrderCommandHandler:
    def __init__(self, event_store):
        self.event_store = event_store
    
    def handle_create_order(self, command):
        # Check if order already exists (idempotency)
        existing = self.event_store.get_events(command["order_id"])
        if existing:
            return {"status": "already_exists"}
        
        # Validate command
        if not command.get("items"):
            raise ValueError("Order must have items")
        
        # Append event
        self.event_store.append(
            aggregate_id=command["order_id"],
            event_type="OrderCreated",
            data={
                "order_id": command["order_id"],
                "customer_id": command["customer_id"],
                "items": command["items"],
                "total": sum(i["price"] * i["quantity"] for i in command["items"])
            },
            metadata={"correlation_id": command.get("correlation_id")}
        )
    
    def handle_pay_order(self, command):
        events = self.event_store.get_events(command["order_id"])
        order = OrderAggregate.from_events(events)
        
        if order.status != "created":
            raise ValueError(f"Cannot pay order in status: {order.status}")
        
        self.event_store.append(
            aggregate_id=command["order_id"],
            event_type="OrderPaid",
            data={"order_id": command["order_id"], "payment_method": command["method"]},
            metadata={"correlation_id": command.get("correlation_id")}
        )
```

## CQRS (Command Query Responsibility Segregation)

CQRS separates write models (commands) from read models (queries). Commands modify state. Queries read from optimized projections.

```text
Write Side:                    Read Side:
Command → CommandHandler       Query → ReadModel
              ↓                      ↑
         EventStore → Event → Projector → ReadDatabase
```

### Projection Builder

```python
class OrderProjection:
    def __init__(self, db):
        self.db = db
    
    def handle(self, event):
        if event["event_type"] == "OrderCreated":
            self.db.order_summary.insert_one({
                "order_id": event["data"]["order_id"],
                "customer_id": event["data"]["customer_id"],
                "total": event["data"]["total"],
                "status": "created",
                "item_count": len(event["data"]["items"]),
                "created_at": event["timestamp"]
            })
        
        elif event["event_type"] == "OrderPaid":
            self.db.order_summary.update_one(
                {"order_id": event["data"]["order_id"]},
                {"$set": {"status": "paid", "paid_at": event["timestamp"]}}
            )
        
        elif event["event_type"] == "OrderShipped":
            self.db.order_summary.update_one(
                {"order_id": event["data"]["order_id"]},
                {"$set": {"status": "shipped", "shipped_at": event["timestamp"]}}
            )
        
        elif event["event_type"] == "OrderCancelled":
            self.db.order_summary.update_one(
                {"order_id": event["data"]["order_id"]},
                {"$set": {"status": "cancelled", "cancelled_at": event["timestamp"]}}
            )

# Projection consumes events from event store
def build_projections(event_store, projections):
    last_processed = get_last_processed_position()
    
    for event in event_store.get_all_events(from_position=last_processed):
        for projection in projections:
            projection.handle(event)
        save_processed_position(event["event_id"])
```

### Read Model Queries

```python
# Optimized read model: get order summary by customer
def get_customer_orders(customer_id, limit=20):
    return db.order_summary.find(
        {"customer_id": customer_id},
        sort=[("created_at", -1)],
        limit=limit
    )

# Optimized read model: get revenue by date range
def get_revenue_by_date(start_date, end_date):
    return db.order_summary.aggregate([
        {"$match": {
            "status": {"$in": ["paid", "shipped"]},
            "created_at": {"$gte": start_date, "$lt": end_date}
        }},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "revenue": {"$sum": "$total"},
            "order_count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ])
```

## Saga Pattern

Sagas coordinate multi-step business transactions across services. Each step has a compensating action for rollback.

### Choreography-Based Saga

No central coordinator. Each service reacts to events and emits new events.

```text
Step 1: Order Service → OrderCreated event
Step 2: Payment Service reacts → PaymentProcessed event (or PaymentFailed)
Step 3: Inventory Service reacts → InventoryReserved event (or InventoryFailed)
Step 4: Shipping Service reacts → OrderShipped event

If any step fails, compensating events undo previous steps:
PaymentFailed → Order Service cancels order → Inventory Service releases reservation
```

```python
# Order Service
def handle_create_order(command):
    order = create_order(command)
    event_store.append("OrderCreated", {"order_id": order.id, "total": order.total})
    publish_event("OrderCreated", {"order_id": order.id, "total": order.total})

# Payment Service
def on_order_created(event):
    try:
        result = process_payment(event["data"]["order_id"], event["data"]["total"])
        publish_event("PaymentProcessed", {"order_id": event["data"]["order_id"], "payment_id": result.id})
    except PaymentError:
        publish_event("PaymentFailed", {"order_id": event["data"]["order_id"], "reason": "declined"})

# Order Service (compensating)
def on_payment_failed(event):
    cancel_order(event["data"]["order_id"])
    publish_event("OrderCancelled", {"order_id": event["data"]["order_id"], "reason": "payment_failed"})
```

### Orchestration-Based Saga

A central orchestrator coordinates the steps and handles compensation.

```python
class OrderSagaOrchestrator:
    def __init__(self, event_store, message_bus):
        self.event_store = event_store
        self.message_bus = message_bus
    
    def start_saga(self, order_id, total):
        saga_id = str(uuid4())
        self.event_store.append("SagaStarted", {
            "saga_id": saga_id,
            "order_id": order_id,
            "total": total,
            "status": "processing_payment"
        })
        # Send command to payment service
        self.message_bus.send("ProcessPayment", {
            "saga_id": saga_id,
            "order_id": order_id,
            "amount": total
        })
        return saga_id
    
    def on_payment_processed(self, event):
        saga = self.load_saga(event["data"]["saga_id"])
        if saga["status"] != "processing_payment":
            return  # Already handled or stale
        
        self.event_store.append("SagaStepCompleted", {
            "saga_id": saga["saga_id"],
            "step": "payment"
        })
        
        # Next step: reserve inventory
        self.message_bus.send("ReserveInventory", {
            "saga_id": saga["saga_id"],
            "order_id": saga["order_id"],
            "items": saga["items"]
        })
        self.update_saga_status(saga["saga_id"], "reserving_inventory")
    
    def on_payment_failed(self, event):
        saga = self.load_saga(event["data"]["saga_id"])
        # Compensate: cancel order
        self.message_bus.send("CancelOrder", {"order_id": saga["order_id"]})
        self.update_saga_status(saga["saga_id"], "failed")
    
    def on_inventory_reserved(self, event):
        saga = self.load_saga(event["data"]["saga_id"])
        # Next step: ship order
        self.message_bus.send("ShipOrder", {
            "saga_id": saga["saga_id"],
            "order_id": saga["order_id"]
        })
        self.update_saga_status(saga["saga_id"], "shipping")
    
    def on_inventory_failed(self, event):
        saga = self.load_saga(event["data"]["saga_id"])
        # Compensate: refund payment
        self.message_bus.send("RefundPayment", {
            "saga_id": saga["saga_id"],
            "order_id": saga["order_id"]
        })
        self.update_saga_status(saga["saga_id"], "failed")
```

## Outbox Pattern

The outbox pattern ensures events are published reliably. Instead of publishing events directly (which can fail), events are written to the same database transaction as state changes. A separate process reads the outbox table and publishes events.

```python
import psycopg2
from uuid import uuid4

def create_order_with_outbox(conn, order_data):
    cursor = conn.cursor()
    
    try:
        # Start transaction
        cursor.execute("BEGIN")
        
        # Insert order
        cursor.execute(
            "INSERT INTO orders (id, customer_id, total, status) VALUES (%s, %s, %s, %s)",
            (order_data["id"], order_data["customer_id"], order_data["total"], "created")
        )
        
        # Insert outbox event in the same transaction
        cursor.execute(
            """INSERT INTO outbox (event_id, aggregate_id, event_type, data, created_at, published)
               VALUES (%s, %s, %s, %s, NOW(), FALSE)""",
            (
                str(uuid4()),
                order_data["id"],
                "OrderCreated",
                json.dumps(order_data),
            )
        )
        
        cursor.execute("COMMIT")
    except Exception:
        cursor.execute("ROLLBACK")
        raise
    finally:
        cursor.close()
```

### Outbox Publisher

```python
import psycopg2
import json
import requests

def publish_outbox_events(conn):
    cursor = conn.cursor()
    
    # Fetch unpublished events, lock them for update
    cursor.execute("""
        SELECT event_id, aggregate_id, event_type, data 
        FROM outbox 
        WHERE published = FALSE 
        ORDER BY created_at 
        LIMIT 100 
        FOR UPDATE SKIP LOCKED
    """)
    
    events = cursor.fetchall()
    
    for event_id, aggregate_id, event_type, data in events:
        try:
            # Publish to message broker
            publish_to_kafka(event_type, {
                "event_id": str(event_id),
                "aggregate_id": aggregate_id,
                "event_type": event_type,
                "data": json.loads(data)
            })
            
            # Mark as published
            cursor.execute(
                "UPDATE outbox SET published = TRUE, published_at = NOW() WHERE event_id = %s",
                (event_id,)
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Failed to publish event {event_id}: {e}")
            continue
    
    cursor.close()
```

## Idempotency

In event-driven systems, events can be delivered more than once. Consumers must handle duplicates gracefully.

### Idempotent Consumer with Deduplication

```python
import redis

r = redis.Redis(host="redis", port=6379)

def process_event_idempotent(event):
    event_id = event["event_id"]
    
    # Check if already processed (atomic operation)
    if not r.setnx(f"processed:{event_id}", "1"):
        # Already processed, skip
        return {"status": "duplicate"}
    
    # Set TTL on the dedup key (e.g., 24 hours)
    r.expire(f"processed:{event_id}", 86400)
    
    try:
        # Process the event
        result = handle_event(event)
        return {"status": "processed", "result": result}
    except Exception as e:
        # Remove the key so the event can be retried
        r.delete(f"processed:{event_id}")
        raise
```

### Idempotent Consumer with Database State Check

```python
def process_payment_event(event):
    order_id = event["data"]["order_id"]
    
    # Check current state in database
    order = db.orders.find_one({"id": order_id})
    if order and order.get("status") in ["paid", "shipped"]:
        # Already processed, skip
        return {"status": "already_paid"}
    
    # Process payment
    db.orders.update_one(
        {"id": order_id, "status": "created"},  # Conditional update
        {"$set": {"status": "paid", "paid_at": event["timestamp"]}}
    )
    
    return {"status": "processed"}
```

## Eventual Consistency

Event-driven systems are eventually consistent. State propagates asynchronously. This has implications for user experience and data integrity.

### Managing User Expectations

```python
# Problem: User creates order, but read model is not yet updated
# Solution: Use CQRS with synchronous read after write, or accept eventual consistency

# Option 1: Wait for projection to catch up
def create_order_and_wait(command):
    order_id = command_handler.handle(command)
    
    # Poll read model until order appears (with timeout)
    for _ in range(10):
        order = read_model.get_order(order_id)
        if order:
            return order
        time.sleep(0.1)
    
    # Fallback: return order from write model
    return write_model.get_order(order_id)

# Option 2: Accept eventual consistency, inform user
def create_order(command):
    order_id = command_handler.handle(command)
    return {
        "order_id": order_id,
        "status": "processing",
        "message": "Your order is being processed. Refresh in a moment."
    }
```

## Error Handling and Dead Letter Queues

```python
def consume_events_with_dlq(consumer, processor, dlq_producer, max_retries=3):
    for message in consumer:
        event = json.loads(message.value)
        retry_count = event.get("metadata", {}).get("retry_count", 0)
        
        try:
            processor.process(event)
            consumer.commit()
        except Exception as e:
            if retry_count < max_retries:
                # Increment retry count and requeue
                event["metadata"]["retry_count"] = retry_count + 1
                event["metadata"]["last_error"] = str(e)
                event["metadata"]["last_retry_at"] = datetime.utcnow().isoformat()
                
                # Send to retry topic with delay
                dlq_producer.send("retry-topic", value=json.dumps(event))
                consumer.commit()  # Ack original message
            else:
                # Send to dead letter topic for manual investigation
                event["metadata"]["final_error"] = str(e)
                event["metadata"]["failed_at"] = datetime.utcnow().isoformat()
                dlq_producer.send("dead-letter-topic", value=json.dumps(event))
                consumer.commit()  # Ack to prevent infinite loop
                logger.error(f"Event {event['event_id']} sent to DLQ after {max_retries} retries")
```

## Monitoring Event-Driven Systems

### Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Event lag | Time between event creation and processing | > 60 seconds |
| Event throughput | Events processed per second | Baseline + 100% |
| Error rate | Failed event processing percentage | > 5% |
| DLQ depth | Messages in dead letter queue | > 0 |
| Projection lag | Events not yet projected to read model | > 10,000 |
| Saga timeout | Sagas stuck in processing state | > 30 minutes |

### Distributed Tracing with Correlation IDs

```python
import json
from uuid import uuid4

class EventProcessor:
    def __init__(self, tracer):
        self.tracer = tracer
    
    def process(self, event):
        correlation_id = event.get("metadata", {}).get("correlation_id", str(uuid4()))
        causation_id = event.get("metadata", {}).get("causation_id")
        
        with self.tracer.start_span("process_event", correlation_id=correlation_id) as span:
            span.set_tag("event_type", event["event_type"])
            span.set_tag("aggregate_id", event["aggregate_id"])
            span.set_tag("causation_id", causation_id)
            
            try:
                result = self.handle(event)
                
                # Propagate correlation ID to downstream events
                if isinstance(result, dict) and "event_type" in result:
                    result["metadata"] = result.get("metadata", {})
                    result["metadata"]["correlation_id"] = correlation_id
                    result["metadata"]["causation_id"] = event["event_id"]
                
                return result
            except Exception as e:
                span.record_exception(e)
                raise
```

## Production Checklist

- [ ] Events have unique IDs and timestamps
- [ ] Correlation IDs propagated across all events
- [ ] Consumers are idempotent
- [ ] Outbox pattern for reliable event publishing
- [ ] Dead letter queue for failed events
- [ ] Retry with exponential backoff and max attempts
- [ ] Event schema versioning for backward compatibility
- [ ] Projections can be rebuilt from event store
- [ ] Monitoring for event lag, error rate, and DLQ depth
- [ ] Distributed tracing with correlation IDs
- [ ] Saga compensation logic tested
- [ ] Event store backup and retention policy
- [ ] Schema registry for event validation

## FAQ

### What is the difference between event sourcing and event-driven architecture?

Event-driven architecture is a communication pattern where services communicate via events. Event sourcing is a data storage pattern where events are the source of truth. You can use event-driven architecture without event sourcing (store mutable state, publish events on change). You can use event sourcing without event-driven architecture (replay events to build state, no inter-service communication).

### How do I handle schema evolution in events?

Use schema versioning. Include a `schema_version` field in each event. Use a schema registry (like Confluent Schema Registry) to validate and evolve schemas. Consumers should handle multiple schema versions. Use backward-compatible schema changes (add optional fields, do not remove fields).

### What is the outbox pattern and why do I need it?

The outbox pattern writes events to a database table (outbox) in the same transaction as state changes. A separate process reads the outbox and publishes events to a message broker. This ensures events are never lost, even if the broker is temporarily unavailable. Without the outbox, you risk inconsistent state between your database and the message broker.

### How do I debug event-driven systems?

Use correlation IDs to trace event flows across services. Implement distributed tracing (OpenTelemetry, Jaeger). Log every event received and produced with its correlation ID. Build a tool to replay events from the event store for debugging. Monitor event lag and DLQ depth to detect issues early.

### Should I use choreography or orchestration for sagas?

Use choreography for simple sagas with 2-3 steps. It is simpler to implement and has no single point of failure. Use orchestration for complex sagas with many steps, conditional logic, or when you need centralized monitoring and error handling. Orchestration is easier to debug but adds a central coordinator that must be highly available.

### How do I handle event ordering?

Within a single aggregate, events must be ordered. Use the aggregate ID as the partition key in Kafka to guarantee ordering within a partition. For cross-aggregate ordering, use a saga or orchestrator. Do not rely on global ordering across all events — it is expensive and usually unnecessary.

## See Also

- [Complete Guide to RabbitMQ Architecture](/guides/complete-guide-rabbitmq-architecture/)
- [CQRS + Event Sourcing — Combined Guide](/guides/cqrs-event-sourcing-combined-guide/)
- [Kafka Consumer Groups with Python for Scalable Streaming](/recipes/kafka-python-consumer-groups/)
- [Implement Redis Pub/Sub Messaging in Python](/recipes/redis-pub-sub-python/)
- [Implement Event Sourcing with CQRS in Python](/recipes/event-sourcing-cqrs-pattern/)

