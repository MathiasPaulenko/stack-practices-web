---
contentType: guides
slug: cqrs-guide
title: "CQRS — Command Query Responsibility Segregation"
description: "A complete guide to CQRS: separate read and write models to optimize performance, scalability, and team autonomy in complex domains."
metaDescription: "Learn CQRS with command and query separation, event sourcing integration, and practical implementation patterns. Complete guide for scalable systems."
difficulty: advanced
topics:
  - architecture
  - design
tags:
  - cqrs
  - command-query-segregation
  - event-sourcing
  - read-model
  - write-model
  - scalability
  - domain-driven-design
  - guide
relatedResources:
  - /guides/event-sourcing-guide
  - /guides/cqrs-event-sourcing-combined-guide
  - /guides/hexagonal-architecture-guide
  - /guides/clean-architecture-guide
  - /patterns/design/event-bus-pattern
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Learn CQRS with command and query separation, event sourcing integration, and practical implementation patterns. Complete guide for scalable systems."
  keywords:
    - cqrs
    - command-query-segregation
    - event-sourcing
    - read-model
    - write-model
    - scalability
    - domain-driven-design
    - guide
---

## Overview

CQRS (Command Query Responsibility Segregation) is an architectural pattern that separates the models used for writing data from the models used for reading data. Instead of a single model handling both commands (writes) and queries (reads), CQRS splits them into distinct paths optimized for their respective purposes. This separation enables performance tuning, independent scaling, and simpler mental models for complex domains.

## When to Use

- Read and write workloads have fundamentally different requirements
- You need multiple read models for the same data (e.g., search, reports, APIs)
- Different teams own reads vs writes
- Event sourcing is already in use (natural pairing)
- You need to scale reads and writes independently

## When NOT to Use

- Simple CRUD with similar read/write patterns
- Small teams without the operational overhead
- Systems where eventual consistency is unacceptable everywhere

## Core Concepts

### Commands

Commands represent intentions to change state. They are named in the imperative and should fail fast if validation fails.

```typescript
interface CreateOrderCommand {
  customerId: string;
  items: OrderItem[];
  shippingAddress: Address;
}
```

### Queries

Queries return data without side effects. They are shaped by the UI or consumer needs, not by the domain model.

```typescript
interface OrderSummaryQuery {
  customerId: string;
  status?: OrderStatus;
  page: number;
  pageSize: number;
}

interface OrderSummary {
  orderId: string;
  total: Money;
  status: OrderStatus;
  placedAt: Date;
}
```

### Write Model

Optimized for consistency, validation, and business rules. Usually maps closely to the domain model.

### Read Model

Optimized for query performance. Often denormalized, projected, and stored in a different database.

## Simple CQRS (Single Database)

```
┌─────────────┐      ┌──────────────┐
│   Command   │─────▶│  Write Model │
│   Handler   │      │   (ORM)      │
└─────────────┘      └──────┬───────┘
                            │
                     ┌──────┴───────┐
                     │   Database   │
                     └──────┬───────┘
                            │
┌─────────────┐      ┌──────┴───────┐
│   Query     │─────▶│  Read Model  │
│   Handler   │      │  (DTO/View)  │
└─────────────┘      └──────────────┘
```

```typescript
// Write side — full domain model
class Order {
  private items: OrderItem[] = [];
  private status: OrderStatus = OrderStatus.PENDING;

  addItem(product: Product, quantity: number): void {
    if (quantity <= 0) throw new DomainError('Quantity must be positive');
    this.items.push(new OrderItem(product, quantity));
  }

  confirm(): void {
    if (this.items.length === 0) throw new DomainError('Cannot confirm empty order');
    this.status = OrderStatus.CONFIRMED;
  }
}

// Read side — flat DTO optimized for listing
interface OrderListItem {
  orderId: string;
  customerName: string;
  totalAmount: number;
  itemCount: number;
  status: string;
  placedAt: string;
}
```

## Advanced CQRS (Separate Read/Write Stores)

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Command   │─────▶│  Write Model │─────▶│  Event Store│
│   Handler   │      │  (Aggregate) │      │  (Events)   │
└─────────────┘      └──────────────┘      └──────┬────┘
                                                   │
                                              ┌────┴────┐
                                              │  Event  │
                                              │  Bus    │
                                              └───┬─────┘
                                                  │
┌─────────────┐      ┌──────────────┐      ┌─────┴────┐
│   Query     │─────▶│  Read Model  │◀─────│ Projection│
│   Handler   │      │   (NoSQL)    │      │  Handler  │
└─────────────┘      └──────────────┘      └───────────┘
```

### Projection Example

```typescript
class OrderProjectionHandler {
  constructor(private readDb: ReadDatabase) {}

  async handle(event: OrderEvent): Promise<void> {
    switch (event.type) {
      case 'OrderCreated':
        await this.readDb.orders.insert({
          orderId: event.orderId,
          customerId: event.customerId,
          total: event.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
          status: 'pending',
          createdAt: event.timestamp
        });
        break;

      case 'OrderConfirmed':
        await this.readDb.orders.update(
          { orderId: event.orderId },
          { status: 'confirmed', confirmedAt: event.timestamp }
        );
        break;
    }
  }
}
```

## Read Model Optimization Patterns

| Pattern | Use Case | Storage |
|---------|----------|---------|
| Materialized View | Pre-computed aggregates | Document DB |
| Search Index | Full-text search | Elasticsearch |
| Graph Projection | Relationship queries | Neo4j |
| Cache | Hot data | Redis |
| Event Stream | Real-time analytics | Kafka/Kinesis |

## Consistency Models

- **Strong consistency** — write and read from the same transaction (simple CQRS)
- **Eventual consistency** — read model updates asynchronously (separate stores)
- **Read-your-writes** — route recent reads to the write model temporarily

## Common Pitfalls

- **Premature separation** — adding CQRS to simple CRUD adds complexity with no benefit
- **Eventual consistency bugs** — users refreshing and not seeing their own writes
- **Read model explosion** — maintaining too many projections for every use case
- **Distributed transaction hell** — trying to make separate stores strongly consistent

## FAQ

**Does CQRS require Event Sourcing?**
No. You can use CQRS with a relational database for both reads and writes, or with separate databases. Event sourcing is a natural companion but not required.

**How do I handle the lag in read models?**
Use read-your-writes pattern, optimistic UI updates, or polling with version checks.

**Can I use CQRS with microservices?**
Yes. Each service can have its own read/write split. Be careful with cross-service queries — prefer API composition or materialized views.
