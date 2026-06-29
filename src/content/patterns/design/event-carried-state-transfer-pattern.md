---
contentType: patterns
slug: event-carried-state-transfer-pattern
title: "Event-Carried State Transfer Pattern"
description: "Replicate state changes across services by publishing events that carry the full updated entity state, enabling consumers to maintain their own local copies without querying the source."
metaDescription: "Learn the Event-Carried State Transfer Pattern for state replication via events. Examples in Python, Java, and JavaScript with Kafka and local projections."
difficulty: intermediate
topics:
  - design
  - architecture
  - messaging
tags:
  - event-carried-state-transfer
  - pattern
  - design-pattern
  - event-driven
  - state-replication
  - kafka
  - microservices
relatedResources:
  - /patterns/design/event-sourcing-pattern
  - /patterns/design/cqrs-pattern
  - /patterns/design/database-per-service-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Event-Carried State Transfer Pattern for state replication via events. Examples in Python, Java, and JavaScript with Kafka and local projections."
  keywords:
    - event carried state transfer
    - design pattern
    - event driven
    - state replication
    - kafka
    - microservices
---

# Event-Carried State Transfer Pattern

## Overview

The Event-Carried State Transfer (ECST) Pattern replicates state changes across distributed services by publishing events that carry the full updated entity state. When a service modifies an entity, it emits an event containing the complete new state of that entity. Consuming services store this state locally, eliminating the need to query the source service for reads.

Unlike Event Sourcing (which stores a sequence of domain events as the source of truth), ECST uses events purely as a distribution mechanism. The event itself is a snapshot: `CustomerUpdated` carries the full customer object, not just the fields that changed. Consumers treat this as a replacement of their local copy.

This pattern is particularly valuable in microservices architectures where services need read-only access to data owned by other services. Instead of synchronous API calls (which create coupling and latency), consumers maintain eventually consistent local replicas fed by the event stream.

## When to Use

Use the Event-Carried State Transfer Pattern when:
- Multiple services need read access to data owned by another service
- Read latency must be low and predictable (no cross-service calls)
- The source service's availability should not affect read operations
- Data changes relatively infrequently compared to read volume

## When to Avoid

- Data changes extremely frequently (high write volume creates event storm)
- Strong consistency is required between source and replicas (ECST is eventually consistent)
- The data is too large to fit efficiently in events (use Claim Check instead)
- A simple API call on read is sufficient and caching handles the load

## Solution

### Python (Kafka + Local Projections)

```python
from dataclasses import dataclass, asdict
from typing import Dict, Optional, List
import json
import sqlite3
from datetime import datetime

# ============================================================================
# DOMAIN EVENTS (carrying full entity state)
# ============================================================================

@dataclass
class CustomerStateTransferEvent:
    event_id: str
    event_type: str  # "CUSTOMER_CREATED" or "CUSTOMER_UPDATED"
    customer_id: str
    payload: dict    # Full customer state
    timestamp: str
    version: int     # Sequence number for ordering


# ============================================================================
# SOURCE SERVICE: Publishes state transfer events
# ============================================================================

class CustomerService:
    """Owns customer data and publishes state transfer events"""
    def __init__(self, event_publisher):
        self.customers: Dict[str, dict] = {}
        self.event_publisher = event_publisher
        self.version_counter = 0

    def create_customer(self, customer_id: str, name: str, email: str,
                        tier: str = "basic") -> dict:
        customer = {
            "customer_id": customer_id,
            "name": name,
            "email": email,
            "tier": tier,
            "loyalty_points": 0,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        self.customers[customer_id] = customer

        event = CustomerStateTransferEvent(
            event_id=f"evt-{self.version_counter}",
            event_type="CUSTOMER_CREATED",
            customer_id=customer_id,
            payload=customer.copy(),
            timestamp=datetime.now().isoformat(),
            version=self.version_counter
        )
        self.version_counter += 1
        self.event_publisher.publish(event)
        return customer

    def update_customer_tier(self, customer_id: str, new_tier: str) -> Optional[dict]:
        customer = self.customers.get(customer_id)
        if not customer:
            return None

        customer["tier"] = new_tier
        customer["updated_at"] = datetime.now().isoformat()

        event = CustomerStateTransferEvent(
            event_id=f"evt-{self.version_counter}",
            event_type="CUSTOMER_UPDATED",
            customer_id=customer_id,
            payload=customer.copy(),
            timestamp=datetime.now().isoformat(),
            version=self.version_counter
        )
        self.version_counter += 1
        self.event_publisher.publish(event)
        return customer


# ============================================================================
# EVENT BUS (simulating Kafka/RabbitMQ)
# ============================================================================

class EventBus:
    def __init__(self):
        self.topics: Dict[str, List[callable]] = {}

    def subscribe(self, topic: str, handler: callable):
        self.topics.setdefault(topic, []).append(handler)

    def publish(self, event: CustomerStateTransferEvent):
        topic = f"customer.{event.event_type.lower()}"
        for handler in self.topics.get(topic, []):
            handler(event)


# ============================================================================
# CONSUMER SERVICE: Maintains local replica
# ============================================================================

class OrderServiceConsumer:
    """Maintains a local read-only copy of customer data for order processing"""
    def __init__(self):
        self.conn = sqlite3.connect(":memory:")
        self._init_schema()

    def _init_schema(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS customer_replicas (
                customer_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                tier TEXT NOT NULL,
                loyalty_points INTEGER DEFAULT 0,
                version INTEGER NOT NULL,
                updated_at TIMESTAMP
            )
        """)
        self.conn.commit()

    def on_customer_event(self, event: CustomerStateTransferEvent):
        """Apply state transfer event to local replica"""
        payload = event.payload
        self.conn.execute("""
            INSERT OR REPLACE INTO customer_replicas
            (customer_id, name, email, tier, loyalty_points, version, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            payload["customer_id"], payload["name"], payload["email"],
            payload["tier"], payload.get("loyalty_points", 0),
            event.version, payload["updated_at"]
        ))
        self.conn.commit()
        print(f"[OrderService] Replicated customer {payload['customer_id']} (v{event.version})")

    def get_customer_for_order(self, customer_id: str) -> Optional[dict]:
        """Read from local replica — no cross-service call needed"""
        cursor = self.conn.execute(
            "SELECT * FROM customer_replicas WHERE customer_id = ?", (customer_id,)
        )
        row = cursor.fetchone()
        if row:
            return {
                "customer_id": row[0], "name": row[1], "email": row[2],
                "tier": row[3], "loyalty_points": row[4], "version": row[5]
            }
        return None


# ============================================================================
# USAGE
# ============================================================================

bus = EventBus()
customer_service = CustomerService(bus)
order_service = OrderServiceConsumer()

# Subscribe order service to customer events
bus.subscribe("customer.customer_created", order_service.on_customer_event)
bus.subscribe("customer.customer_updated", order_service.on_customer_event)

# Create customer in source service
customer_service.create_customer("C-001", "Alice Johnson", "alice@example.com", "premium")

# Order service reads from local replica instantly
customer = order_service.get_customer_for_order("C-001")
print(f"Order service sees: {customer}")

# Update in source service
customer_service.update_customer_tier("C-001", "gold")

# Local replica is updated via event
customer = order_service.get_customer_for_order("C-001")
print(f"After update: {customer}")
```

### Java (Spring Cloud Stream + Kafka)

```java
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import java.util.*;

// State transfer event
record CustomerStateTransferEvent(
    String eventId,
    String eventType,
    String customerId,
    CustomerPayload payload,
    long timestamp,
    int version
) {}

record CustomerPayload(
    String customerId, String name, String email,
    String tier, int loyaltyPoints, String updatedAt
) {}

// Source service: publishes full state on every change
@Service
class CustomerService {
    private final KafkaTemplate<String, CustomerStateTransferEvent> kafka;
    private final Map<String, CustomerPayload> customers = new HashMap<>();
    private int versionCounter = 0;

    public CustomerService(KafkaTemplate<String, CustomerStateTransferEvent> kafka) {
        this.kafka = kafka;
    }

    public CustomerPayload createCustomer(String id, String name, String email) {
        CustomerPayload customer = new CustomerPayload(
            id, name, email, "basic", 0, new Date().toString()
        );
        customers.put(id, customer);
        publishEvent("CUSTOMER_CREATED", customer);
        return customer;
    }

    public CustomerPayload updateTier(String id, String tier) {
        CustomerPayload existing = customers.get(id);
        CustomerPayload updated = new CustomerPayload(
            existing.customerId(), existing.name(), existing.email(),
            tier, existing.loyaltyPoints(), new Date().toString()
        );
        customers.put(id, updated);
        publishEvent("CUSTOMER_UPDATED", updated);
        return updated;
    }

    private void publishEvent(String type, CustomerPayload payload) {
        CustomerStateTransferEvent event = new CustomerStateTransferEvent(
            "evt-" + versionCounter, type, payload.customerId(),
            payload, System.currentTimeMillis(), versionCounter++
        );
        kafka.send("customer.state-transfer", event);
    }
}

// Consumer service: maintains local replica
@Service
class OrderServiceCustomerProjection {
    private final Map<String, CustomerPayload> localReplica = new HashMap<>();

    @KafkaListener(topics = "customer.state-transfer", groupId = "order-service")
    public void onCustomerEvent(CustomerStateTransferEvent event) {
        localReplica.put(event.customerId(), event.payload());
        System.out.println("[OrderService] Replicated customer " + event.customerId());
    }

    public CustomerPayload getCustomerForOrder(String customerId) {
        return localReplica.get(customerId);
    }
}
```

### JavaScript (Node.js with Event Emitter / Redis Pub-Sub)

```javascript
const { EventEmitter } = require('events');

// State transfer event structure
class CustomerStateTransferEvent {
  constructor(eventType, customerId, payload, version) {
    this.eventId = `evt-${Date.now()}`;
    this.eventType = eventType;
    this.customerId = customerId;
    this.payload = payload;
    this.timestamp = new Date().toISOString();
    this.version = version;
  }
}

// Source service: Customer Service
class CustomerService {
  constructor(eventBus) {
    this.customers = new Map();
    this.eventBus = eventBus;
    this.versionCounter = 0;
  }

  createCustomer(customerId, name, email, tier = 'basic') {
    const customer = {
      customerId, name, email, tier,
      loyaltyPoints: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.customers.set(customerId, customer);

    const event = new CustomerStateTransferEvent(
      'CUSTOMER_CREATED', customerId, { ...customer }, this.versionCounter++
    );
    this.eventBus.emit('customer.state-transfer', event);
    return customer;
  }

  updateTier(customerId, newTier) {
    const customer = this.customers.get(customerId);
    if (!customer) return null;

    customer.tier = newTier;
    customer.updatedAt = new Date().toISOString();

    const event = new CustomerStateTransferEvent(
      'CUSTOMER_UPDATED', customerId, { ...customer }, this.versionCounter++
    );
    this.eventBus.emit('customer.state-transfer', event);
    return customer;
  }
}

// Consumer: Order Service maintains local replica
class OrderServiceProjection {
  constructor() {
    this.localReplica = new Map();
  }

  onCustomerEvent(event) {
    this.localReplica.set(event.customerId, event.payload);
    console.log(`[OrderService] Replicated customer ${event.customerId} (v${event.version})`);
  }

  getCustomerForOrder(customerId) {
    return this.localReplica.get(customerId);
  }
}

// Usage
const eventBus = new EventEmitter();
const customerService = new CustomerService(eventBus);
const orderService = new OrderServiceProjection();

eventBus.on('customer.state-transfer', (event) => {
  orderService.onCustomerEvent(event);
});

// Create and update customer
customerService.createCustomer('C-001', 'Alice', 'alice@example.com', 'premium');
console.log('Order service local copy:', orderService.getCustomerForOrder('C-001'));

customerService.updateTier('C-001', 'gold');
console.log('After update:', orderService.getCustomerForOrder('C-001'));
```

## Explanation

ECST works by treating events as **state snapshots** rather than change deltas:

1. **Source service** makes a change to an entity and emits the complete new state
2. **Message broker** (Kafka, RabbitMQ, Redis Streams) durably stores and distributes the event
3. **Consumer services** receive the event and replace their local copy with the new state
4. **Local reads** are fast and always available, even if the source service is down

This is fundamentally different from:
- **Event Sourcing**: Events are the source of truth, not snapshots for distribution
- **Change Data Capture (CDC)**: Database-level change events, not domain-level state snapshots
- **API polling**: Consumers actively query; ECST pushes state proactively

## Variants

| Variant | Payload | Use Case |
|---------|---------|----------|
| **Full state** | Complete entity snapshot | Small entities, high read needs |
| **Delta + snapshot** | Changed fields + latest snapshot | Large entities, bandwidth-sensitive |
| **Reference + API** | Event carries ID, consumer fetches if needed | Very large entities, selective reads |
| **Delete tombstones** | Null payload with `isDeleted` flag | Tracking deletions in replicas |

## What Works

- **Include a version/sequence number.** Consumers can detect out-of-order or duplicate events.
- **Make events immutable and additive.** Never modify an event after publishing.
- **Handle replays gracefully.** Consumers should be idempotent (same event twice = same result).
- **Set retention policies.** Kafka topics need enough retention for consumers to catch up after downtime.
- **Monitor replication lag.** Alert when a consumer falls significantly behind the producer.

## Common Mistakes

- **Publishing only deltas.** Consumers that start later cannot reconstruct state without the full history.
- **Forgetting delete events.** Without tombstones, deleted entities remain forever in consumer replicas.
- **Not handling schema evolution.** Add fields without breaking existing consumers (forward compatibility).
- **Using ECST for real-time needs.** Replication lag means data is seconds behind; don't use for strict consistency.
- **Oversharing events.** Not every service needs every entity. Use topic partitioning or filtering.

## Real-World Examples

### Uber

Uber's microservices use Kafka and Apache Flink to replicate state across services. A driver's location, a rider's profile, and trip state are all propagated via events that carry full snapshots, allowing each service to serve reads from local stores.

### Shopify

Shopify replicates merchant data (products, inventory, orders) to search services using event-carried state transfer. The search index is a local projection maintained by consuming state transfer events, enabling fast product search without hitting the primary database.

### LinkedIn

LinkedIn uses Brooklin (their data streaming platform) to replicate data between microservices. Member profiles, connection graphs, and activity feeds are all distributed as state transfer events to services that need read access.

## Frequently Asked Questions

**Q: What is the difference between ECST and Event Sourcing?**
A: In Event Sourcing, a sequence of domain events is the source of truth. In ECST, events are a distribution mechanism carrying full state snapshots. The database remains the source of truth in ECST.

**Q: How does this compare to CQRS?**
A: ECST is often used to implement CQRS. The write model emits state transfer events; the read model consumes them to build projections optimized for queries.

**Q: What if the event is larger than the message broker limit?**
A: Use the Claim Check Pattern: store the full payload in object storage and send a reference in the event.

**Q: How do I handle a consumer that has been down for days?**
A: Kafka consumers resume from their last committed offset. If retention has expired, implement a snapshot + catch-up pattern where the consumer first fetches the current state, then consumes from the latest offset.
