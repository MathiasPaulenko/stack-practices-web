---
contentType: guides
slug: cap-theorem-guide
title: "CAP Theorem and Database Trade-offs"
description: "A practical guide to the CAP theorem: consistency, availability, and partition tolerance. Learn how to choose the right trade-offs for your application."
metaDescription: "CAP theorem guide: consistency, availability, partition tolerance. Choose the right database trade-offs for your application's requirements."
difficulty: intermediate
topics:
  - databases
  - architecture
tags:
  - cap-theorem
  - consistency
  - availability
  - partition-tolerance
  - distributed-systems
  - database-tradeoffs
  - guide
relatedResources:
  - /guides/databases/nosql-database-selection-guide
  - /guides/databases/database-sharding-partitioning-guide
  - /guides/architecture/microservices-architecture-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "CAP theorem guide: consistency, availability, partition tolerance. Choose the right database trade-offs for your application's requirements."
  keywords:
    - cap theorem explained
    - consistency availability partition tolerance
    - database trade offs
    - acid vs base
    - eventual consistency
---

# CAP Theorem and Database Trade-offs

## Introduction

The CAP theorem states that a distributed data store can guarantee at most two of these three properties: Consistency, Availability, and Partition Tolerance. Since network partitions are inevitable, you are really choosing between CP (Consistency + Partition Tolerance) and AP (Availability + Partition Tolerance) systems. This guide explains what each property means and how to choose the right trade-off.

## The Three Properties

### Consistency (C)

Every read receives the most recent write or an error. All nodes see the same data at the same time.

```
Client writes X=10 to Node A
Client reads X from Node B → must get 10 (or error)
```

**Examples:** PostgreSQL, MongoDB (with majority write concern), etcd, ZooKeeper.

### Availability (A)

Every request receives a non-error response, without the guarantee that it contains the most recent write.

```
Client writes X=10 to Node A (partitioned from Node B)
Client reads X from Node B → gets stale value (e.g., X=5)
```

**Examples:** Cassandra, DynamoDB, Riak, Couchbase.

### Partition Tolerance (P)

The system continues to operate despite network partitions (nodes cannot communicate).

```
Node A and Node B cannot talk to each other
System still responds to requests on both nodes
```

**Reality check:** Partition tolerance is not optional in distributed systems. Networks fail. You must choose CP or AP.

## CP vs AP in Practice

### CP Systems (Choose Consistency)

| When to Choose | Examples |
|---------------|----------|
| Financial transactions | Bank account balances, stock trades |
| Inventory management | E-commerce stock counts |
| Configuration stores | Service discovery, feature flags |
| Leader election | Distributed locks, cluster coordination |

**Trade-off:** If a partition occurs, the system may refuse writes (sacrificing availability) to maintain consistency.

### AP Systems (Choose Availability)

| When to Choose | Examples |
|---------------|----------|
| Social media feeds | Twitter timeline, Facebook feed |
| Analytics and metrics | Time-series data, click tracking |
| Session stores | User session caching |
| Content delivery | CDN caches, read replicas |

**Trade-off:** If a partition occurs, the system accepts writes on both sides of the partition, creating temporary inconsistency that is resolved later.

## PACELC: Extending CAP

CAP only discusses behavior during a partition. PACELC adds behavior when there is no partition:

| System | Partition Behavior | Normal Operation |
|--------|-------------------|-----------------|
| **PA/EL** | Available | Latency-optimized (eventual consistency) |
| **PA/EC** | Available | Consistency-optimized |
| **PC/EL** | Consistent | Latency-optimized |
| **PC/EC** | Consistent | Consistency-optimized |

**Example:** DynamoDB is PA/EL — available during partitions, latency-optimized when healthy (eventual consistency by default).

## Consistency Models

Not all consistency is created equal. There is a spectrum.

| Model | Description | Example |
|-------|-------------|---------|
| **Strong** | All reads see the latest write | PostgreSQL, etcd |
| **Causal** | Reads respect causal relationships | COPS database |
| **Session** | Reads in a session see prior writes | DynamoDB session consistency |
| **Bounded staleness** | Reads are at most X seconds stale | Azure Cosmos DB |
| **Eventual** | Reads will eventually converge | Cassandra, S3 |

```python
# Cassandra tunable consistency
session.execute(
    "SELECT * FROM users WHERE id = %s",
    (user_id,),
    ConsistencyLevel.QUORUM  # strong for this read
)

session.execute(
    "SELECT count(*) FROM events",
    consistency_level=ConsistencyLevel.ONE  # eventual, fast
)
```

## Real-World Examples

### E-Commerce Checkout

| Operation | Required Consistency | System Choice |
|-----------|---------------------|---------------|
| Check stock | Strong (do not oversell) | CP — query primary node |
| Add to cart | Session | AP — cache with session affinity |
| View recommendations | Eventual | AP — read from cache |
| Process payment | Strong | CP — ACID transaction |

### Social Media Feed

| Operation | Required Consistency | System Choice |
|-----------|---------------------|---------------|
| Post a tweet | Eventual | AP — accept write, propagate async |
| View feed | Eventual | AP — cached, may be seconds stale |
| Like a post | Eventual | AP — increment counter, reconcile later |
| Delete account | Strong | CP — ensure all replicas delete |

## Best Practices

- **Do not default to strong consistency everywhere** — it costs latency and availability
- **Identify your consistency requirements per operation** — not all data needs the same guarantees
- **Use saga patterns for distributed transactions** — do not try to force ACID across services
- **Design for idempotency** — eventual consistency means retries, and retries mean duplicates
- **Monitor replication lag** — lag is the distance between "written" and "visible everywhere"

## Common Mistakes

- Treating all data as if it needs strong consistency — most application data is fine with eventual
- Building distributed systems without understanding the trade-offs — leads to unpredictable failures
- Assuming "distributed" means "more consistent" — the opposite is usually true
- Using a CP database for an AP workload (or vice versa) — match the tool to the requirement
- Ignoring replication lag in read-after-write scenarios — users may not see their own writes immediately

## Frequently Asked Questions

### Is it possible to have all three CAP properties?

No. The theorem is a mathematical proof: in the presence of a network partition, you must choose between consistency and availability. No distributed system can guarantee all three simultaneously.

### Does CAP mean I cannot have consistency and availability at all?

No. When there is no partition, you can have both. The trade-off only applies during a partition. Many systems are CA (consistent and available) under normal conditions and become CP or AP only during failures.

### How do I choose between CP and AP?

Ask: "What hurts more — a failed write or stale data?" If failed writes are unacceptable (payments, inventory), choose CP. If stale data is acceptable (feeds, analytics), choose AP. Most systems use a mix: CP for critical paths, AP for everything else.
