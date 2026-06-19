---
contentType: guides
slug: database-sharding-partitioning-guide
title: "Database Sharding and Partitioning Strategies"
description: "A practical guide to horizontal partitioning (sharding), vertical partitioning, and range vs hash strategies. Scale databases without downtime."
metaDescription: "Database sharding and partitioning strategies: range, hash, and list sharding. Scale databases horizontally without downtime or hotspots."
difficulty: advanced
topics:
  - databases
tags:
  - database
  - guide
  - scalability
  - sharding
relatedResources:
  - /guides/databases/sql-performance-tuning-guide
  - /guides/databases/nosql-database-selection-guide
  - /guides/architecture/system-design-interview-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Database sharding and partitioning strategies: range, hash, and list sharding. Scale databases horizontally without downtime or hotspots."
  keywords:
    - database sharding
    - horizontal partitioning
    - range vs hash sharding
    - database scaling strategy
    - partition key selection
---

# Database Sharding and Partitioning Strategies

## Introduction

When a single database server cannot handle the load, you have three options: buy a bigger machine (vertical scaling), add read replicas (horizontal read scaling), or split the data across multiple servers (sharding). Sharding is the hardest but the only option for unlimited horizontal scaling. This guide covers strategies, trade-offs, and operational considerations.

## Partitioning vs Sharding

| Term | Definition | Scope |
|------|-----------|-------|
| **Partitioning** | Splitting a single table into smaller pieces within one database | Single node |
| **Sharding** | Distributing partitions across multiple database servers | Multi-node |
| **Horizontal** | Splitting rows by partition key | Rows distributed |
| **Vertical** | Splitting columns into separate tables | Columns separated |

## Vertical Partitioning

Split columns of a wide table into separate tables, typically by access pattern.

```sql
-- Before: single wide table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100),
    profile_json JSONB,
    avatar_url VARCHAR(500),
    preferences_json JSONB,
    created_at TIMESTAMP
);

-- After: frequently accessed columns in users, rarely accessed in user_profiles
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100),
    created_at TIMESTAMP
);

CREATE TABLE user_profiles (
    user_id INT PRIMARY KEY REFERENCES users(id),
    profile_json JSONB,
    avatar_url VARCHAR(500),
    preferences_json JSONB
);
```

**When to use:** When some columns are accessed 100x more often than others. Reduces I/O for common queries.

## Horizontal Partitioning (Table Partitioning)

Split rows of a single table within the same database server.

```sql
-- PostgreSQL declarative partitioning by range
CREATE TABLE events (
    id BIGSERIAL,
    event_type VARCHAR(50),
    created_at TIMESTAMP NOT NULL,
    data JSONB
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2024_01 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE events_2024_02 PARTITION OF events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

**Benefits:** Query pruning (only scans relevant partitions), easier archival (detach old partitions), faster vacuum/analyze.

## Sharding Strategies

### 1. Range Sharding

Split data by contiguous ranges of the shard key.

```
Shard 1: user_id 1 - 1,000,000
Shard 2: user_id 1,000,001 - 2,000,000
Shard 3: user_id 2,000,001 - 3,000,000
```

| Pros | Cons |
|------|------|
| Range queries are efficient | Hotspots if data is skewed (e.g., recent data is hotter) |
| Easy to understand | Rebalancing requires moving large contiguous blocks |
| Natural for time-series | |

**Best for:** Time-series data, date-based partitioning, append-only workloads.

### 2. Hash Sharding

Apply a hash function to the shard key and map to a shard.

```python
def get_shard(user_id, num_shards=4):
    return hash(user_id) % num_shards

# user_id=123 → hash(123) % 4 → shard 3
# user_id=456 → hash(456) % 4 → shard 0
```

| Pros | Cons |
|------|------|
| Even distribution (no hotspots from skew) | Range queries require scanning all shards |
| Adding shards requires rehashing (expensive) | Cross-shard transactions are hard |

**Best for:** Uniformly distributed keys, OLTP workloads with point lookups.

### 3. Consistent Hashing

A variant of hash sharding that minimizes rebalancing when adding/removing shards.

```
Key space (0-360):  Node A: 0-120, Node B: 120-240, Node C: 240-360
Add Node D:         Node A: 0-90,  Node B: 90-180, Node C: 180-270, Node D: 270-360
```

Only 1/4 of keys move when adding a 4th node (vs 1/2 with simple hash).

### 4. Directory-Based Sharding

Maintain a lookup table (directory) that maps keys to shards. Allows flexible, manual shard assignment.

```sql
CREATE TABLE shard_directory (
    tenant_id INT PRIMARY KEY,
    shard_id INT NOT NULL,
    region VARCHAR(20)
);

-- Route EU tenants to EU shards, US tenants to US shards
SELECT shard_id FROM shard_directory WHERE tenant_id = ?;
```

**Best for:** Multi-tenant SaaS where tenants need geographic isolation.

## Choosing a Shard Key

The shard key determines which rows live together. Choose poorly and you will have hot shards and cross-shard queries.

| Good Shard Key | Bad Shard Key |
|---------------|---------------|
| High cardinality (many unique values) | Low cardinality (e.g., country with 5 options) |
| Accessed together stays together | Frequently joined data lives on different shards |
| Even distribution | Skewed (e.g., 1% of users generate 50% of events) |
| Immutable (or rarely changes) | Changes frequently (causes data migration) |

**Example:** For an e-commerce app, `user_id` is usually a good shard key because orders, profiles, and preferences all relate to a user and are queried together.

## The Hotspot Problem

Even with hash sharding, hotspots occur when one key dominates writes.

```
Shard 1: 45% of writes (celebrity user with 10M followers)
Shard 2: 15% of writes
Shard 3: 20% of writes
Shard 4: 20% of writes
```

**Solutions:**
- **Sub-sharding:** Split the hot key further (e.g., by post_id within the celebrity)
- **Write splitting:** Fan out writes for the hot key across multiple queues/shards
- **Cache layer:** Absorb reads for the hot key in Redis

## Cross-Shard Queries and Transactions

### The Problem

```sql
-- If orders and payments are sharded by user_id, this is easy:
SELECT * FROM orders WHERE user_id = 123;

-- But this requires querying all shards:
SELECT * FROM orders WHERE created_at > '2024-01-01';
```

### Solutions

| Approach | Trade-off |
|----------|-----------|
| **Scatter-gather** | Query all shards, aggregate. Slow and resource-heavy. |
| **Global secondary index** | Maintain an index on a non-shard key. Adds write amplification. |
| **CQRS / read model** | Replicate data to an analytics store for cross-shard queries. See [event-driven architecture](/guides/event-driven-architecture-guide). |
| **Avoid cross-shard transactions** | Design around them. Use [sagas](/guides/event-driven-architecture-guide) for multi-shard operations. |

## Rebalancing

When shards become uneven, you must move data.

| Strategy | When to Use |
|----------|-------------|
| **Double writes + backfill** | Writes go to old and new shards; backfill historical data; then switch reads |
| **Consistent hashing** | Minimal data movement when adding nodes |
| **Planned migration window** | Accept downtime for simplicity (rarely acceptable in production) |

## Best Practices

- **Plan for rebalancing from day one** — data gravity is real; moving terabytes is slow
- **Keep transactions within a single shard** — cross-shard transactions are painful
- **Monitor shard-level metrics** — uneven CPU, memory, or disk usage signals a rebalance need
- **Use application-level routing first** — your app knows the shard key; don't rely solely on database proxies
- **Test with production-like data volumes** — hotspots and skew only appear at scale

## Common Mistakes

- Choosing a shard key with low cardinality (e.g., `country` with 5 values)
- Assuming hash sharding eliminates all hotspots (celebrity accounts still concentrate load)
- Cross-shard JOINs (they don't exist; you must do it in application code). See [database design](/guides/databases/database-design-guide).
- Not planning for rebalancing until a shard is 90% full
- Sharding too early (< 10M rows or < 1K writes/second). See [SQL performance tuning](/guides/databases/sql-performance-tuning-guide).

## Frequently Asked Questions

### When should I start sharding?

When you have exhausted vertical scaling and read replicas. Typical signals: single server CPU > 70% sustained, write throughput is the bottleneck (not reads), or you need geographic distribution. Most applications never need sharding. See [database design](/guides/databases/database-design-guide) first.

### What is the difference between partitioning and sharding?

Partitioning splits a table into smaller pieces on the same server. Sharding distributes those pieces across multiple servers. Partitioning is a database feature; sharding is an architectural decision.

### Can I change the shard key later?

Technically yes, practically no. Changing the shard key requires rewriting all data. Design your shard key as if it were immutable. If you must change it, use a double-write and migration strategy over weeks.
