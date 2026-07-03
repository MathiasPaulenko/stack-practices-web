---
contentType: guides
slug: acid-vs-base-guide
title: "ACID vs BASE — Consistency Models Explained"
description: "A practical guide comparing ACID and BASE consistency models: when to choose strong consistency, when to accept eventual consistency, and how each affects system design."
metaDescription: "Learn ACID vs BASE consistency models with examples. Understand strong vs eventual consistency, CAP theorem, and when to use each in distributed systems."
difficulty: intermediate
topics:
  - databases
  - architecture
tags:
  - acid
  - base
  - consistency-models
  - cap-theorem
  - distributed-systems
  - eventual-consistency
  - transactions
  - guide
relatedResources:
  - /guides/database-normalization-guide
  - /guides/database-replication-guide
  - /guides/nosql-patterns-guide
  - /guides/cqrs-guide
  - /patterns/design/distributed-lock-pattern
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Learn ACID vs BASE consistency models with examples. Understand strong vs eventual consistency, CAP theorem, and when to use each in distributed systems."
  keywords:
    - acid
    - base
    - consistency-models
    - cap-theorem
    - distributed-systems
    - eventual-consistency
    - guide
---

## Overview

ACID and BASE represent two philosophies for handling data consistency in databases. ACID guarantees strong consistency through transactions that are Atomic, Consistent, Isolated, and Durable. BASE prioritizes availability and partition tolerance, accepting that data may be temporarily inconsistent. Understanding when to use each model — and how to combine them — is essential for designing reliable distributed systems.

## ACID Properties

### Atomicity

All operations in a transaction complete successfully, or none do. There is no partial completion.

```sql
BEGIN TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 'A';
UPDATE accounts SET balance = balance + 100 WHERE id = 'B';
COMMIT;  -- Both succeed, or ROLLBACK cancels both
```

### Consistency

Transactions bring the database from one valid state to another, preserving all constraints and rules.

### Isolation

Concurrent transactions do not interfere with each other. The result is as if transactions ran sequentially.

### Durability

Once committed, changes survive system failures. Data is written to persistent storage.

## Isolation Levels

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Use Case |
|-------|------------|---------------------|--------------|----------|
| Read Uncommitted | Possible | Possible | Possible | Rare, analytics only |
| Read Committed | No | Possible | Possible | Default for most databases |
| Repeatable Read | No | No | Possible | Financial read operations |
| Serializable | No | No | No | Critical financial transactions |

## BASE Properties

### Basically Available

The system guarantees availability. Every request receives a response, but that response may be stale.

### Soft State

The state of the system may change over time, even without input, as data replicates and reconciles.

### Eventual Consistency

If no new updates are made, eventually all nodes will converge to the same value.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Write     │────▶│  Replica A  │────▶│  Replica B  │
│   X = 42    │     │   X = 42    │     │   X = null  │
└─────────────┘     └─────────────┘     └─────────────┘
                          │                     │
                          └───────sync──────────┘
                                         │
                                    X = 42 (eventual)
```

## ACID vs BASE Comparison

| Aspect | ACID | BASE |
|--------|------|------|
| Consistency | Strong (immediate) | Eventual (delayed) |
| Availability | May reject under load | Always responds |
| Partition Tolerance | Sacrificed if needed | Required |
| Best For | Financial, inventory, bookings | Social, analytics, caching |
| Complexity | Managed by database | Managed by application |
| Example | PostgreSQL, MySQL (InnoDB) | Cassandra, DynamoDB, Couchbase |

## CAP Theorem

The CAP theorem states that a distributed system can guarantee at most two of:

- **Consistency:** All nodes see the same data at the same time
- **Availability:** Every request receives a response
- **Partition Tolerance:** System continues despite network failures

In practice, partition tolerance is mandatory in distributed systems, so the real choice is CP (consistent) vs AP (available).

## Choosing Between ACID and BASE

### Choose ACID When

- Financial transactions (banking, payments, trading)
- Inventory management (prevent overselling)
- Booking systems (prevent double-booking)
- Regulatory compliance requires exact records
- The cost of inconsistency exceeds the cost of downtime

### Choose BASE When

- Social media feeds (stale data is acceptable)
- Analytics and metrics (approximate is sufficient)
- Shopping carts (temporary inconsistency is tolerable)
- Content delivery (CDN caches are inherently stale)
- Systems where uptime is more critical than perfect accuracy

## Hybrid Approaches

Modern systems often use both models in different parts:

```
┌─────────────────────────────────────────┐
│           Application Layer             │
└──────────────┬──────────────────────────┘
               │
      ┌────────┴────────┐
      │                 │
┌─────▼─────┐    ┌──────▼──────┐
│  ACID DB  │    │  BASE Store │
│PostgreSQL │    │  Cassandra  │
│  Orders   │    │  Analytics  │
│  Payments │    │  Sessions   │
└───────────┘    └─────────────┘
```

## Implementing BASE with Sagas

When you need BASE semantics but ACID-like reliability, use sagas:

```typescript
class OrderSaga {
  async execute(order: Order): Promise<void> {
    try {
      await this.inventoryService.reserve(order.items);
      await this.paymentService.charge(order.total);
      await this.shippingService.schedule(order);
    } catch (error) {
      await this.compensate(order);
    }
  }

  private async compensate(order: Order): Promise<void> {
    await this.inventoryService.release(order.items);
    await this.paymentService.refund(order.total);
  }
}
```

## Common Mistakes

- **Using ACID for everything** — adds unnecessary latency and complexity to non-critical data
- **Using BASE for financial data** — eventual consistency can cause double-spending or overselling
- **Ignoring the CAP choice** — pretending you can have all three in a distributed system
- **Not handling BASE read anomalies** — reading stale data and making decisions on it

## FAQ

**Can a database support both ACID and BASE?**
Yes. PostgreSQL with read replicas provides ACID on the primary and BASE on replicas. Some databases (e.g., Cosmos DB) let you choose consistency per request.

**How do I handle conflicts in BASE systems?**
Use vector clocks, last-write-wins with timestamps, or application-specific conflict resolution (e.g., merge shopping carts).

**Is BASE faster than ACID?**
Generally yes, because it avoids coordination overhead (locks, two-phase commit). But the speed difference depends on workload and implementation.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.
