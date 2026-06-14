---
contentType: recipes
slug: domain-driven-design
title: "Model Complex Business Domains with Domain-Driven Design"
description: "How to structure code around business concepts using bounded contexts, aggregates, entities, value objects, and domain events to manage complexity in large applications."
metaDescription: "Learn Domain-Driven Design for complex business domains. Use bounded contexts, aggregates, entities, value objects, and domain events to manage application complexity."
difficulty: advanced
topics:
  - design
tags:
  - domain-driven-design
  - ddd
  - bounded-context
  - aggregates
  - entities
  - value-objects
  - domain-events
  - clean-architecture
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/event-driven-functions
  - /recipes/api-contract-testing
  - /recipes/database-migrations
lastUpdated: "2026-06-14"
author: "StackPractices"
seo:
  metaDescription: "Learn Domain-Driven Design for complex business domains. Use bounded contexts, aggregates, entities, value objects, and domain events to manage application complexity."
  keywords:
    - domain driven design
    - bounded contexts
    - aggregates ddd
    - value objects
    - domain events
---

## Overview

Domain-Driven Design (DDD) is an approach to software development where the primary focus is on the core business domain and its logic. Rather than organizing code around technical layers (controllers, services, repositories) or data structures (tables, documents), DDD structures code around business concepts: orders, payments, inventory, shipments. The goal is to make the code an accurate model of how the business actually works, so that business rules are explicit, testable, and resistant to the drift that occurs when technical implementation diverges from business reality.

The central insight of DDD is that large domains are too complex to model as a single unified system. Instead, the domain is divided into bounded contexts — autonomous areas with their own ubiquitous language, models, and rules. Within each context, aggregates group related entities and value objects into consistency boundaries. Domain events communicate changes across contexts without tight coupling. This recipe covers the tactical patterns of DDD with implementation examples in Python, TypeScript, and Java.

## When to use it

Use this recipe when:

- Building applications where business rules are complex, changing frequently, or poorly understood
- Working with domain experts who use precise terminology that should be reflected in code
- Decomposing a monolith where different departments have conflicting models of the same concept
- Implementing event-sourced systems where the domain model drives persistence
- Refactoring legacy code where business logic is scattered across layers and frameworks

## Solution

### Value Object (TypeScript)

```typescript
class Money {
  constructor(
    private readonly amount: number,
    private readonly currency: string
  ) {
    if (amount < 0) throw new Error("Amount cannot be negative");
    if (!currency || currency.length !== 3) throw new Error("Invalid currency code");
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error("Cannot add different currencies");
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  toString(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }
}

// Usage
const price = new Money(100, "USD");
const tax = new Money(8, "USD");
const total = price.add(tax); // USD 108.00
```

### Aggregate with Domain Events (Python)

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import List
from uuid import UUID, uuid4

class DomainEvent:
    pass

@dataclass
class OrderItem:
    product_id: UUID
    quantity: int
    unit_price: float

    def total(self) -> float:
        return self.quantity * self.unit_price

@dataclass
class OrderPlaced(DomainEvent):
    order_id: UUID
    customer_id: UUID
    total: float
    occurred_at: datetime

class Order:
    def __init__(self, customer_id: UUID):
        self.id = uuid4()
        self.customer_id = customer_id
        self.items: List[OrderItem] = []
        self.status = "pending"
        self.domain_events: List[DomainEvent] = []

    def add_item(self, product_id: UUID, quantity: int, unit_price: float):
        if quantity <= 0:
            raise ValueError("Quantity must be positive")
        if self.status != "pending":
            raise ValueError("Cannot modify a submitted order")

        self.items.append(OrderItem(product_id, quantity, unit_price))

    def submit(self):
        if not self.items:
            raise ValueError("Cannot submit an empty order")
        if self.status != "pending":
            raise ValueError("Order already submitted")

        self.status = "submitted"
        total = sum(item.total() for item in self.items)

        event = OrderPlaced(
            order_id=self.id,
            customer_id=self.customer_id,
            total=total,
            occurred_at=datetime.utcnow()
        )
        self.domain_events.append(event)

    def clear_events(self):
        self.domain_events.clear()
```

### Bounded Context with Anti-Corruption Layer (Java)

```java
// Order context
public class Order {
    private OrderId id;
    private CustomerId customerId;
    private List<OrderLine> lines;
    private OrderStatus status;

    public void submit() {
        if (lines.isEmpty()) throw new IllegalStateException("Empty order");
        this.status = OrderStatus.SUBMITTED;
        registerEvent(new OrderSubmittedEvent(id, customerId));
    }
}

// Shipping context — different model of the same concept
public class Shipment {
    private ShipmentId id;
    private DeliveryAddress address;
    private List<Package> packages;
}

// Anti-corruption layer translates between contexts
public class OrderToShipmentAdapter {
    public ShipmentRequest adapt(OrderSubmittedEvent event, Order order) {
        return new ShipmentRequest(
            event.getOrderId().toString(),
            order.getShippingAddress(),
            order.getLines().stream()
                .map(line -> new PackageSpec(line.getProductId(), line.getQuantity()))
                .collect(Collectors.toList())
        );
    }
}
```

## Explanation

- **Bounded context**: a logical boundary within which a domain model is consistent. The term "customer" means something different in billing (payment profile) than in support (ticket history). Each context has its own model, language, and database schema. Contexts integrate via APIs, events, or anti-corruption layers.
- **Aggregate**: a cluster of entities and value objects treated as a single unit for data changes. The aggregate root is the only entity that outside code can reference directly. All changes within the aggregate must go through the root, ensuring invariants are enforced. Example: an `Order` aggregate contains `OrderLine` value objects.
- **Value object**: an immutable object defined by its attributes, not identity. Two `Money` objects with amount 100 and currency USD are equal and interchangeable. Value objects embed business rules (e.g., currency must be 3-letter ISO code) and prevent invalid states.
- **Domain event**: a notification that something significant happened in the domain. `OrderPlaced` is published when an order is submitted. Other contexts subscribe to these events to react — inventory decreases stock, billing creates an invoice, shipping prepares a package.

## Variants

| Pattern | Focus | Mutability | Identity | Example |
|---------|-------|------------|----------|---------|
| Entity | Business identity | Mutable | Yes | Customer, Order |
| Value object | Attributes | Immutable | No | Money, Address, DateRange |
| Aggregate | Consistency boundary | Mutable | Root has ID | Order + OrderLines |
| Domain service | Cross-aggregate logic | Stateless | N/A | PricingEngine |
| Repository | Persistence abstraction | Stateless | N/A | OrderRepository |

## Best practices

- **Keep aggregates small**: an aggregate should fit comfortably in memory and be writable in a single transaction. If loading an order requires joining 50 tables, your aggregate is too large. Split into smaller aggregates and use eventual consistency via domain events.
- **Design for invariants, not CRUD**: instead of generic `create`, `update`, `delete` methods, expose behavior-focused methods like `add_item`, `submit`, `cancel`. These methods enforce business rules (e.g., "cannot cancel a shipped order") at the domain layer.
- **Use the ubiquitous language**: name classes, methods, and variables using the same terms domain experts use. If accountants say "post a journal entry," your code should have `journal.post_entry()`, not `create_transaction_record()`. This bridges the gap between code and conversation.
- **Publish domain events before persistence**: the pattern is — mutate aggregate, collect events, persist aggregate, publish events. If persistence fails, the events were never published, maintaining consistency. Never publish events before the transaction commits.
- **Avoid anemic domain models**: an anemic model has entities with only getters and setters, while all logic lives in service classes. This is just a database schema in code. Push business rules into entities and value objects where they belong.

## Common mistakes

- **One giant bounded context**: modeling an entire enterprise as a single context creates a tangled mess. If two teams frequently conflict over the definition of a term, they need separate contexts. Merge contexts only when the cost of translation exceeds the cost of coordination.
- **Leaking persistence into the domain**: aggregates should not know about ORM annotations, SQL queries, or document schemas. The domain layer defines repositories as interfaces; infrastructure implements them. This allows testing business logic without a database.
- **Over-engineering simple domains**: DDD is powerful but expensive. A CRUD admin panel for a 10-entity catalog does not need aggregates, domain events, and context maps. Use DDD when business complexity justifies the abstraction cost.
- **Missing anti-corruption layers**: when integrating with external systems, directly using their data models pollutes your domain. Create an anti-corruption layer that translates external concepts into your ubiquitous language, protecting your model from external changes.

## FAQ

**Q: How do I know if my aggregate boundary is correct?**
A: An aggregate should protect an invariant that must remain consistent in a single transaction. If changing an order line must immediately update the order total, they belong in the same aggregate. If inventory stock can be updated asynchronously, it belongs in a different aggregate.

**Q: Can I use DDD with a relational database?**
A: Yes. Aggregates map to tables, entities map to rows, value objects can be embedded columns or JSON. The repository pattern abstracts persistence so the domain model does not depend on SQL or ORM specifics.

**Q: What is the difference between a domain service and an application service?**
A: A domain service contains business logic that does not belong to any entity (e.g., calculating shipping cost across multiple carriers). An application service orchestrates use cases, calling repositories and domain services, without containing business rules itself.

**Q: Should every project use event sourcing with DDD?**
A: No. Event sourcing stores state as a sequence of events. It is powerful for audit-heavy domains but adds significant complexity. Start with standard persistence and domain events. Only adopt event sourcing if you genuinely need complete audit trails, temporal queries, or event replay capabilities.

