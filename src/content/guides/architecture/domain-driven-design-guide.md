---
contentType: guides
slug: domain-driven-design-guide
title: "Domain-Driven Design (DDD) — A Practical Guide"
description: "Learn DDD fundamentals: bounded contexts, entities, value objects, aggregates, and how to model complex business domains in code."
metaDescription: "Domain-Driven Design guide: bounded contexts, entities, value objects, aggregates, and repositories. Practical DDD for complex business domains."
difficulty: advanced
topics:
  - architecture
  - design
tags:
  - architecture
  - domain-driven-design
  - guide
  - design
  - patterns
relatedResources:
  - /guides/architecture/software-architecture-guide
  - /guides/design/design-patterns-guide
  - /patterns/design/repository-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Domain-Driven Design guide: bounded contexts, entities, value objects, aggregates, and repositories. Practical DDD for complex business domains."
  keywords:
    - domain driven design
    - ddd tutorial
    - bounded context
    - aggregate root
    - entity vs value object
    - ddd architecture
---

# Domain-Driven Design (DDD)

## Introduction

Domain-Driven Design is an approach to software development where the structure and language of the code closely match the business domain. It is most valuable for complex domains where the business logic is the primary source of complexity.

## Core Concepts

### Ubiquitous Language

The team (developers, domain experts, product managers) agrees on a shared vocabulary that is used consistently in conversations, documentation, and code.

**Example:**
- ❌ `createUser()` — generic
- ✅ `onboardCustomer()` — domain-specific
- ❌ `orderStatus` = `1` — meaningless
- ✅ `orderStatus` = `PaymentPending` — self-documenting

### Bounded Context

A bounded context is a logical boundary within which a particular domain model applies. Terms and rules are consistent inside a context but may differ across contexts.

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Sales Context   │  │ Inventory Context│  │ Shipping Context│
│  ─────────────   │  │ ───────────────  │  │ ───────────────  │
│  Customer        │  │ Product          │  │ Delivery         │
│  Order           │  │ StockItem        │  │ Shipment         │
│  Payment         │  │ Warehouse        │  │ Carrier          │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

**Same term, different meaning:**
- In Sales, a `Customer` is someone who places orders
- In Support, a `Customer` is someone who opens tickets
- They are different models in different contexts

### Entities

Objects with a distinct identity that persists over time and state changes.

```python
class Order:
    def __init__(self, order_id: str):
        self.order_id = order_id  # Identity
        self.items = []
        self.status = "pending"

    def add_item(self, product, qty):
        self.items.append(OrderLine(product, qty))

    def confirm(self):
        self.status = "confirmed"
```

**Key trait:** Two orders with the same `order_id` are the same entity, even if their contents differ.

### Value Objects

Objects defined by their attributes, with no conceptual identity.

```python
@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str

@dataclass(frozen=True)
class Address:
    street: str
    city: str
    postal_code: str
```

**Key traits:**
- Immutable (changing attributes creates a new value object)
- Interchangeable if attributes match (`$5 == $5`)
- No lifecycle; can be freely created and discarded

### Aggregates

A cluster of entities and value objects treated as a single unit for data changes. The aggregate root is the only entity outside code can reference directly.

```python
class Order(AggregateRoot):
    def __init__(self, order_id: str):
        self.order_id = order_id
        self._lines: List[OrderLine] = []
        self._status = OrderStatus.PENDING

    def add_line(self, product_id: str, qty: int, unit_price: Money):
        if self._status != OrderStatus.PENDING:
            raise InvalidOperation("Cannot modify a confirmed order")
        self._lines.append(OrderLine(product_id, qty, unit_price))

    def total(self) -> Money:
        return sum(line.total() for line in self._lines)
```

**Rules:**
- All modifications go through the aggregate root
- The aggregate root controls invariants (business rules)
- One transaction = one aggregate update

### Repositories

Repositories mediate between the domain and data mapping layers, acting like an in-memory collection of aggregates.

```python
class OrderRepository:
    def get(self, order_id: str) -> Order:
        ...

    def save(self, order: Order):
        ...

    def find_by_customer(self, customer_id: str) -> List[Order]:
        ...
```

### Domain Events

Events that capture something important happening in the domain.

```python
@dataclass
class OrderConfirmed:
    order_id: str
    customer_id: str
    total: Money
    confirmed_at: datetime
```

Domain events enable loose coupling between bounded contexts. See [event-driven architecture](/guides/architecture/event-driven-architecture-guide).

## Strategic DDD vs. Tactical DDD

| | Strategic DDD | Tactical DDD |
|---|---------------|--------------|
| **Focus** | Big picture, team organization | Implementation patterns |
| **Output** | Bounded contexts, context maps | Entities, aggregates, repositories |
| **When** | Early in project, during discovery | During implementation |
| **Who** | Architects, tech leads, domain experts | Development teams |

## When to Use DDD

Use DDD when:
- The domain is complex and changes frequently
- Business rules are central to the application
- The team includes domain experts who can collaborate
- The project is large enough to justify the overhead

**Avoid DDD when:**
- The domain is simple CRUD with few business rules
- The team lacks access to domain experts
- The project is small and short-lived

## What Works

- **Start with the ubiquitous language**, not the database schema
- **Keep aggregates small** — large aggregates hurt [concurrency](/guides/concurrency/concurrency-patterns-guide)
- **Prefer value objects** over entities where possible (simpler, immutable)
- **One transaction per aggregate** — don't update multiple aggregates in one transaction. See [database design](/guides/databases/database-design-guide).
- **Use domain events** for cross-aggregate communication
- **Don't over-engineer** — not every project needs full DDD

## Common Mistakes

- Designing the [database schema](/guides/databases/database-design-guide) first, then forcing DDD patterns on top
- Making every object an entity instead of using value objects
- Creating giant aggregates that span half the domain
- Using DDD for simple CRUD applications
- Ignoring the bounded context boundaries, creating a "big ball of mud"
- Confusing application services with domain services

## Frequently Asked Questions

**Q: What is the difference between an entity and an aggregate root?**
A: An aggregate root is a special entity that works as the entry point to an aggregate. All external references to the aggregate go through the root, and all modifications are done via the root's methods.

**Q: Can I use DDD with microservices?**
A: Yes. Each [microservice](/guides/architecture/microservices-architecture-guide) typically aligns with a bounded context. The service boundary enforces the context boundary, and services communicate via domain events or APIs.

**Q: How do I identify bounded contexts?**
A: Look for areas where terminology changes, different teams have ownership, or where business capabilities are independent. [Event Storming](/guides/architecture/event-driven-architecture-guide) workshops are a common technique.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Detailed Scenario: Domain Modeling for E-commerce

```text
Project: E-commerce platform (Java + Spring Boot)
Domain: Sales, Inventory, Shipping, Support
Team: 12 developers split by bounded context

Step 1: Event Storming (2-day workshop)
  Participants: 2 domain experts, 1 product manager, 4 developers
  Output: 340 event stickies, 47 commands, 12 aggregates identified

  Key events discovered:
    - CartAbandoned, CartConverted
    - OrderCreated, OrderConfirmed, OrderCancelled
    - PaymentProcessed, PaymentRejected, RefundIssued
    - StockReserved, StockReleased, StockDepleted
    - ShipmentCreated, ShipmentDispatched, ShipmentDelivered

Step 2: Identify bounded contexts
  | Context | Responsibility | Team |
  |---------|---------------|------|
  | Sales | Cart, orders, checkout | 4 devs |
  | Payments | Processing, refunds | 2 devs |
  | Inventory | Stock, reservations, restocking | 3 devs |
  | Shipping | Logistics, carriers, tracking | 3 devs |

  Context map:
    Sales -> Payments: Customer/Supplier (ACL in Sales)
    Sales -> Inventory: Customer/Supplier (ACL in Sales)
    Inventory -> Shipping: Shared Kernel (shipping model shared)
    Support -> Sales: Conformist (Support conforms to Sales)

Step 3: Model aggregates (Sales context)

  Aggregate: Order (root)
    - OrderId (identity)
    - CustomerId (value object)
    - List<OrderLine> (entities within aggregate)
    - OrderStatus (value object: PENDING, CONFIRMED, SHIPPED, CANCELLED)
    - Money total (value object)

  Aggregate invariants:
    - Cannot add items to a confirmed order
    - Total must be > 0 to confirm
    - A cancelled order cannot change state
    - Max 50 items per order (business rule)

  // Order.java (aggregate root)
  public class Order extends AggregateRoot {
      private OrderId id;
      private CustomerId customerId;
      private List<OrderLine> lines = new ArrayList<>();
      private OrderStatus status = OrderStatus.PENDING;
      private Money total = Money.ZERO;

      public void addLine(ProductId productId, int quantity, Money unitPrice) {
          if (status != OrderStatus.PENDING)
              throw new DomainException("Cannot modify confirmed order");
          if (lines.size() >= 50)
              throw new DomainException("Max 50 items per order");
          if (quantity <= 0)
              throw new DomainException("Quantity must be positive");
          lines.add(new OrderLine(productId, quantity, unitPrice));
          total = total.add(unitPrice.multiply(quantity));
      }

      public void confirm() {
          if (lines.isEmpty())
              throw new DomainException("Cannot confirm empty order");
          if (total.isZero())
              throw new DomainException("Total must be positive");
          status = OrderStatus.CONFIRMED;
          registerEvent(new OrderConfirmed(id, customerId, total));
      }
  }

Step 4: Domain events for cross-context integration

  OrderConfirmed (published by Sales):
    - Payments listens -> processes payment
    - Inventory listens -> reserves stock
    - Notifications listens -> sends confirmation to customer

  Integration via Kafka (events as Avro):
    topic: orders.confirmed
    schema: OrderConfirmed.avsc
    partitions: 12 (by order_id)

Step 5: Anti-Corruption Layer (ACL)
  Sales needs data from Inventory but does not want to couple
  to the Inventory model. Uses an ACL:

  // In the Sales context
  public interface InventoryService {
      boolean isAvailable(ProductId productId, int quantity);
  }

  // ACL implementation (adapter)
  public class InventoryServiceACL implements InventoryService {
      private InventoryApiClient client; // calls Inventory API

      public boolean isAvailable(ProductId productId, int quantity) {
          // Translate from Sales model to Inventory model
          var request = new CheckStockRequest(productId.value(), quantity);
          var response = client.checkStock(request);
          return response.available();
      }
  }

Lessons learned:
  - Event Storming revealed events the team had not considered
  - Bounded contexts aligned with team structure
  - Small aggregates enabled concurrency without conflicts
  - Domain events decoupled Sales from Payments and Inventory
  - ACL protected Sales from changes in the Inventory model
```

### How do I handle consistency across bounded contexts?

Use eventual consistency with domain events. Within a bounded context, use ACID transactions to maintain aggregate invariants. Across bounded contexts, publish domain events and let each context react independently. If you need strong cross-context consistency, reconsider the boundaries: they may belong in the same context. For multi-step processes, use the Saga pattern with compensations.
