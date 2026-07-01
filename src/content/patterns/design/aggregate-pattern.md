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
