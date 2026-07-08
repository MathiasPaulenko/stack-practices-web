---
contentType: patterns
slug: aggregate-pattern
title: "Aggregate Pattern"
description: "Encapsulate a cluster of domain objects treated as a single unit for data changes. An Aggregate Root controls access to its internal entities and value objects."
metaDescription: "Learn the Aggregate Pattern in Domain-Driven Design. Examples in Python, Java, and JavaScript for enforcing invariants across entity clusters."
difficulty: advanced
topics:
  - design
tags:
  - aggregate
  - pattern
  - design-pattern
  - behavioral
  - ddd
  - entity
  - domain-driven-design
relatedResources:
  - /patterns/design/value-object-pattern
  - /patterns/design/repository-pattern
  - /patterns/design/outbox-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Aggregate Pattern in Domain-Driven Design. Examples in Python, Java, and JavaScript for enforcing invariants across entity clusters."
  keywords:
    - aggregate pattern
    - design pattern
    - domain driven design
    - aggregate root
    - ddd
---

# Aggregate Pattern

## Overview

The Aggregate Pattern is a core building block of Domain-Driven Design (DDD). An aggregate is a cluster of associated objects treated as a single unit for data changes. Every aggregate has a root entity — the Aggregate Root — that controls access to its internal members.

External code can only reference the aggregate root directly. Internal entities and value objects cannot be modified independently; all changes must go through the root. This boundary enforces invariants (business rules) that span multiple objects within the aggregate.

## When to Use

Use the Aggregate Pattern when:
- A business rule involves consistency across multiple related objects
- You need to enforce invariants that span a cluster of entities
- Changes to internal objects must be controlled and validated
- The domain model has natural transactional boundaries

## When to Avoid

- Simple CRUD on independent entities does not need aggregate boundaries
- Overly large aggregates cause concurrency bottlenecks (avoid "god aggregates")
- The system uses event sourcing exclusively (aggregates may be modeled differently)

## Solution

### Python

```python
from dataclasses import dataclass, field
from typing import List
from datetime import datetime
import uuid

@dataclass(frozen=True)
class OrderLine:
    product_id: str
    quantity: int
    unit_price: float

    def total(self) -> float:
        return self.quantity * self.unit_price


class Order:
    def __init__(self, customer_id: str):
        self.id = str(uuid.uuid4())
        self.customer_id = customer_id
        self.lines: List[OrderLine] = []
        self.status = "pending"
        self.created_at = datetime.now()
        self.version = 0

    def add_line(self, product_id: str, quantity: int, unit_price: float):
        if quantity <= 0:
            raise ValueError("Quantity must be positive")
        if self.status != "pending":
            raise ValueError("Cannot modify a non-pending order")

        self.lines.append(OrderLine(product_id, quantity, unit_price))
        self.version += 1

    def remove_line(self, product_id: str):
        if self.status != "pending":
            raise ValueError("Cannot modify a non-pending order")

        self.lines = [line for line in self.lines if line.product_id != product_id]
        self.version += 1

    def total(self) -> float:
        return sum(line.total() for line in self.lines)

    def submit(self):
        if not self.lines:
            raise ValueError("Cannot submit an empty order")
        self.status = "submitted"
        self.version += 1


# Usage
order = Order(customer_id="cust-123")
order.add_line("prod-1", 2, 9.99)
order.add_line("prod-2", 1, 19.99)
print(f"Total: {order.total():.2f}")  # Total: 39.97
order.submit()
```

### Java

```java
import java.time.Instant;
import java.util.*;

public class Order {
    private final UUID id;
    private final String customerId;
    private final List<OrderLine> lines = new ArrayList<>();
    private String status = "pending";
    private final Instant createdAt;
    private int version = 0;

    public Order(String customerId) {
        this.id = UUID.randomUUID();
        this.customerId = customerId;
        this.createdAt = Instant.now();
    }

    public void addLine(String productId, int quantity, double unitPrice) {
        if (quantity <= 0) throw new IllegalArgumentException("Quantity must be positive");
        if (!"pending".equals(status)) throw new IllegalStateException("Cannot modify submitted order");
        lines.add(new OrderLine(productId, quantity, unitPrice));
        version++;
    }

    public void removeLine(String productId) {
        if (!"pending".equals(status)) throw new IllegalStateException("Cannot modify submitted order");
        lines.removeIf(line -> line.productId().equals(productId));
        version++;
    }

    public double total() {
        return lines.stream().mapToDouble(OrderLine::total).sum();
    }

    public void submit() {
        if (lines.isEmpty()) throw new IllegalStateException("Cannot submit empty order");
        status = "submitted";
        version++;
    }

    public UUID getId() { return id; }
    public String getStatus() { return status; }
    public int getVersion() { return version; }
}

record OrderLine(String productId, int quantity, double unitPrice) {
    public double total() { return quantity * unitPrice; }
}
```

### JavaScript

```javascript
class Order {
  constructor(customerId) {
    this.id = crypto.randomUUID();
    this.customerId = customerId;
    this.lines = [];
    this.status = 'pending';
    this.createdAt = new Date();
    this.version = 0;
  }

  addLine(productId, quantity, unitPrice) {
    if (quantity <= 0) throw new Error('Quantity must be positive');
    if (this.status !== 'pending') throw new Error('Cannot modify submitted order');

    this.lines.push({ productId, quantity, unitPrice });
    this.version++;
  }

  removeLine(productId) {
    if (this.status !== 'pending') throw new Error('Cannot modify submitted order');

    this.lines = this.lines.filter(line => line.productId !== productId);
    this.version++;
  }

  total() {
    return this.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  }

  submit() {
    if (this.lines.length === 0) throw new Error('Cannot submit empty order');
    this.status = 'submitted';
    this.version++;
  }
}

// Usage
const order = new Order('cust-123');
order.addLine('prod-1', 2, 9.99);
order.addLine('prod-2', 1, 19.99);
console.log(order.total().toFixed(2)); // 39.97
order.submit();
```

## Explanation

An aggregate has three boundaries:

- **Aggregate Root**: The top-level entity that external code references. It has a global identity.
- **Internal Entities**: Objects with identity meaningful only within the aggregate (e.g., `OrderLine` identified by product ID inside an order).
- **Value Objects**: Immutable objects within the aggregate that have no identity (e.g., `Money`, `Address`).

All modifications flow through the root. This ensures invariants like "an order must have at least one line to be submitted" are always enforced.

## Variants

| Variant | Scope | Use Case |
|---------|-------|----------|
| **Standard Aggregate** | Root + entities + value objects | Order with lines, customer with addresses |
| **Large Aggregate** | Root with many levels | Product catalog with categories, variants, prices |
| **Event-Sourced Aggregate** | Rehydrated from event stream | Bank account rebuilt from `Deposit` / `Withdraw` events |

## What Works

- **Keep aggregates small.** A good aggregate fits in memory and loads in a single database query. Large aggregates hurt performance.
- **Reference other aggregates by ID.** Do not hold direct object references to other aggregate roots. This prevents loading the entire graph.
- **One transaction per aggregate.** Do not modify two aggregates in the same transaction. Use eventual consistency and domain events for cross-aggregate coordination.
- **Version aggregates for optimistic locking.** Increment a version field on every change to detect concurrent modifications.
- **Validate invariants inside the aggregate.** Business rules belong in the domain model, not in application services.

## Common Mistakes

- **God aggregates** that load hundreds of objects cause database and memory issues. Split into smaller aggregates.
- **Direct modification of internal entities** breaks encapsulation. All changes must go through the root.
- **Transaction across aggregates** creates coupling and locks contention. Publish a domain event instead.
- **Anemic domain models** where aggregates are just data bags with getters and setters. Put behavior in the aggregate.
- **Ignoring eventual consistency** between aggregates. Accept that separate aggregates may be temporarily inconsistent.

## Real-World Examples

### E-Commerce Order

An `Order` aggregate contains `OrderLines`, a `ShippingAddress` value object, and `Payment` references. The order root enforces that totals match line sums and that submitted orders cannot be modified.

### Banking Account

An `Account` aggregate contains `Transaction` entities. The root ensures the balance never goes below zero (overdraft rules) and that transactions are immutable once posted.

### Shopping Cart

A `Cart` aggregate holds `CartItem` entities. Adding an item for an existing product increments quantity instead of adding a duplicate line.

## Frequently Asked Questions

**Q: How large should an aggregate be?**
A: As small as possible while still protecting invariants. If two objects can be changed independently, they belong in separate aggregates.

**Q: Can I reference another aggregate inside an aggregate?**
A: Only by ID, not by direct object reference. This keeps aggregates loosely coupled and independently loadable.

**Q: How does an aggregate enforce rules across aggregates?**
A: It does not. Cross-aggregate consistency is achieved via asynchronous domain events and eventual consistency, not transactions.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.

## Advanced Solutions

### Event-sourced aggregate with domain events

Rebuild aggregate state from a stream of events instead of storing current state:

```python
from dataclasses import dataclass
from typing import List
from datetime import datetime
import uuid

@dataclass(frozen=True)
class DomainEvent:
    event_id: str
    aggregate_id: str
    event_type: str
    occurred_at: datetime
    data: dict

@dataclass(frozen=True)
class OrderCreated(DomainEvent):
    pass

@dataclass(frozen=True)
class OrderLineAdded(DomainEvent):
    pass

class OrderAggregate:
    def __init__(self, customer_id: str):
        self.id = str(uuid.uuid4())
        self.customer_id = customer_id
        self.lines = []
        self.status = "pending"
        self.version = 0
        self._uncommitted_events: List[DomainEvent] = []

    def add_line(self, product_id: str, quantity: int, unit_price: float):
        if self.status != "pending":
            raise ValueError("Cannot modify submitted order")
        
        event = OrderLineAdded(
            event_id=str(uuid.uuid4()),
            aggregate_id=self.id,
            event_type="OrderLineAdded",
            occurred_at=datetime.now(),
            data={"product_id": product_id, "quantity": quantity, "unit_price": unit_price}
        )
        self._apply_event(event)
        self._uncommitted_events.append(event)
        self.version += 1

    def _apply_event(self, event: DomainEvent):
        """Rebuild state from event."""
        if event.event_type == "OrderLineAdded":
            self.lines.append((event.data["product_id"], event.data["quantity"], event.data["unit_price"]))

    def get_uncommitted_events(self) -> List[DomainEvent]:
        """Return events not yet persisted."""
        return self._uncommitted_events.copy()

    def mark_events_as_committed(self):
        """Clear uncommitted events after persistence."""
        self._uncommitted_events.clear()

    @classmethod
    def rebuild_from_events(cls, events: List[DomainEvent]) -> "OrderAggregate":
        """Rehydrate aggregate from event stream."""
        # Find OrderCreated event to initialize
        created = next(e for e in events if e.event_type == "OrderCreated")
        aggregate = cls(created.data["customer_id"])
        aggregate.id = created.aggregate_id
        
        # Apply all events in order
        for event in events:
            if event.event_type != "OrderCreated":
                aggregate._apply_event(event)
                aggregate.version += 1
        
        return aggregate
```

### Aggregate with snapshot optimization for event sourcing

Store periodic snapshots to avoid replaying all events:

```python
from dataclasses import dataclass
import json

@dataclass
class AggregateSnapshot:
    aggregate_id: str
    version: int
    state: dict

class OrderAggregate:
    # ... (previous code)
    
    def to_snapshot(self) -> AggregateSnapshot:
        """Create snapshot of current state."""
        return AggregateSnapshot(
            aggregate_id=self.id,
            version=self.version,
            state={
                "customer_id": self.customer_id,
                "lines": self.lines,
                "status": self.status
            }
        )

    @classmethod
    def from_snapshot(cls, snapshot: AggregateSnapshot, events: List[DomainEvent]) -> "OrderAggregate":
        """Rebuild from snapshot and events after snapshot."""
        aggregate = cls(snapshot.state["customer_id"])
        aggregate.id = snapshot.aggregate_id
        aggregate.lines = snapshot.state["lines"]
        aggregate.status = snapshot.state["status"]
        aggregate.version = snapshot.version
        
        # Apply only events after snapshot version
        for event in events:
            if event.event_type != "OrderCreated":
                aggregate._apply_event(event)
                aggregate.version += 1
        
        return aggregate
```

### Aggregate with optimistic concurrency control

Detect and handle concurrent modifications using version numbers:

```python
class ConcurrencyError(Exception):
    pass

class OrderAggregate:
    # ... (previous code with version field)
    
    def add_line(self, product_id: str, quantity: int, unit_price: float, expected_version: int):
        if self.version != expected_version:
            raise ConcurrencyError(f"Expected version {expected_version}, but current is {self.version}")
        
        if self.status != "pending":
            raise ValueError("Cannot modify submitted order")
        
        self.lines.append((product_id, quantity, unit_price))
        self.version += 1

# Usage in application service
try:
    order.add_line("prod-1", 2, 9.99, expected_version=order.version)
    repository.save(order)
except ConcurrencyError:
    # Handle conflict: reload aggregate, retry, or notify user
    pass
```

## Additional Best Practices

1. **Design aggregates around business invariants.** The aggregate boundary should align with transactional consistency requirements. If a business rule requires multiple objects to change atomically, they belong in the same aggregate.

2. **Use domain events to communicate state changes.** When an aggregate changes, emit a domain event to notify other aggregates or bounded contexts. This decouples aggregates while maintaining eventual consistency.

```python
class OrderAggregate:
    # ... (previous code)
    
    def submit(self):
        if not self.lines:
            raise ValueError("Cannot submit empty order")
        self.status = "submitted"
        self.version += 1
        
        # Emit domain event
        event = OrderSubmitted(
            event_id=str(uuid.uuid4()),
            aggregate_id=self.id,
            event_type="OrderSubmitted",
            occurred_at=datetime.now(),
            data={"customer_id": self.customer_id, "total": self.total()}
        )
        self._uncommitted_events.append(event)
```

## Additional Common Mistakes

1. **Mixing concerns in aggregates.** Aggregates should contain only domain logic. Infrastructure concerns like persistence, validation for external systems, or notification logic belong in application services, not in the aggregate.

2. **Holding references to other aggregates.** Direct object references between aggregates break the boundary and cause loading cascades. Always reference other aggregates by ID only. Load them lazily when needed.

## Additional Frequently Asked Questions

### How do I handle validation across aggregates?

Cross-aggregate validation is handled via domain events and eventual consistency. For example, to ensure a customer has sufficient credit before submitting an order, the order aggregate emits an `OrderSubmitted` event. A credit check bounded context listens for this event and approves or rejects the order asynchronously. The order status is updated via another event.

### Should aggregates be immutable?

No. Aggregates are mutable within their boundary. The aggregate root methods modify internal state. However, value objects within the aggregate should be immutable. This prevents shared references from causing unexpected side effects.

### How do I test aggregates?

Test aggregates by verifying that invariants are enforced and that business rules produce the expected state changes. Use unit tests that call aggregate methods and assert the resulting state or emitted events. Avoid testing persistence logic in aggregate tests; that belongs in repository tests.
