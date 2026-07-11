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

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Detailed Scenario: CQRS for an E-commerce Order System

```text
System: E-commerce order management (TypeScript + Node.js)
Write model: PostgreSQL (normalized, ACID)
Read model: Elasticsearch (denormalized, search-optimized)
Event bus: Kafka (event-driven projections)

Write side (command handlers):
  POST /api/orders -> CreateOrderCommand -> Order aggregate -> OrderCreated event
  PUT /api/orders/:id/confirm -> ConfirmOrderCommand -> Order aggregate -> OrderConfirmed event
  PUT /api/orders/:id/cancel -> CancelOrderCommand -> Order aggregate -> OrderCancelled event

  // Command handler
  class CreateOrderHandler {
    async handle(cmd: CreateOrderCommand): Promise<OrderId> {
      const order = Order.create(cmd.customerId, cmd.items);
      await this.orderRepo.save(order); // PostgreSQL
      // Events dispatched after save
      return order.id;
    }
  }

  // Aggregate enforces invariants
  class Order extends AggregateRoot {
    static create(customerId: string, items: OrderItem[]): Order {
      if (items.length === 0) throw new Error("Empty order");
      if (items.length > 50) throw new Error("Max 50 items");
      const order = new Order(OrderId.generate(), customerId);
      order.status = OrderStatus.PENDING;
      order.items = items;
      order.total = items.reduce((s, i) => s + i.price * i.qty, 0);
      order.raiseEvent(new OrderCreated(order.id, customerId, items, order.total));
      return order;
    }
  }

Event flow:
  OrderCreated event -> Kafka topic orders.events -> Projection handler
  OrderConfirmed event -> Kafka topic orders.events -> Projection handler
  OrderCancelled event -> Kafka topic orders.events -> Projection handler

Read side (projection handlers):
  class OrderProjection {
    async handle(event: DomainEvent): Promise<void> {
      switch (event.type) {
        case "OrderCreated":
          await this.es.index({
            index: "orders",
            id: event.orderId,
            body: {
              orderId: event.orderId,
              customerId: event.customerId,
              status: "pending",
              total: event.total,
              itemCount: event.items.length,
              items: event.items, // Denormalized for read
              createdAt: event.timestamp
            }
          });
          break;
        case "OrderConfirmed":
          await this.es.update({
            index: "orders",
            id: event.orderId,
            body: { doc: { status: "confirmed", confirmedAt: event.timestamp } }
          });
          break;
        case "OrderCancelled":
          await this.es.update({
            index: "orders",
            id: event.orderId,
            body: { doc: { status: "cancelled", cancelledAt: event.timestamp } }
          });
          break;
      }
    }
  }

Read side (query handlers):
  GET /api/orders/search?q=laptop -> Elasticsearch query
  GET /api/orders?status=pending&customerId=123 -> Elasticsearch filter
  GET /api/orders/:id -> Elasticsearch GET by ID

  class OrderQueryHandler {
    async searchOrders(query: string, page: number): Promise<OrderListItem[]> {
      const result = await this.es.search({
        index: "orders",
        body: {
          query: { multi_match: { query, fields: ["items.name", "orderId"] } },
          from: (page - 1) * 20,
          size: 20
        }
      });
      return result.hits.hits.map(h => h._source);
    }
  }

Read-your-writes consistency:
  - When a user creates an order, return the order ID immediately
  - Frontend shows optimistic order in the list (from local state)
  - Poll GET /api/orders/:id until status appears in Elasticsearch
  - Typical lag: 50-200ms (Kafka + projection)
  - Timeout: if not visible in 5s, fallback to write model query

Scaling:
  Write side: 2 PostgreSQL instances (master + replica)
  Read side: 3 Elasticsearch nodes (sharded by orderId)
  Projection: 4 consumer instances (Kafka consumer group)
  Event bus: Kafka with 12 partitions

Metrics:
  | Metric | Target |
  |--------|--------|
  | Write latency p95 | < 50ms |
  | Read latency p95 | < 20ms |
  | Projection lag | < 500ms |
  | Read availability | 99.95% |
  | Write availability | 99.99% |
```

### How do I rebuild a read model from scratch?

If the read model is corrupted or needs a schema change, replay events from the event store. Stop the projection consumers, truncate the read model, and replay all events from the beginning. For large event stores, use snapshot-based replay: process events in batches of 10,000 with checkpoints. Alternatively, run a "shadow projection" alongside the existing one, verify data consistency, then switch the query handlers to the new read model.
