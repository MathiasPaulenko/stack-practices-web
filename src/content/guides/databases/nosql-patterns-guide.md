---
contentType: guides
slug: nosql-patterns-guide
title: "NoSQL Data Modeling Patterns — Document, Key-Value, Wide-Column, Graph"
description: "A practical guide to NoSQL data modeling: embedding vs referencing, access pattern-driven design, and patterns for MongoDB, DynamoDB, Cassandra, and Redis."
metaDescription: "Learn NoSQL data modeling: embedding vs referencing, access pattern-driven design. Patterns for MongoDB, DynamoDB, Cassandra, and Redis with examples."
difficulty: intermediate
topics:
  - databases
  - data
tags:
  - nosql
  - mongodb
  - dynamodb
  - cassandra
  - redis
  - data-modeling
  - embedding
  - referencing
  - guide
relatedResources:
  - /guides/database-design-guide
  - /guides/time-series-database-guide
  - /guides/graph-database-guide
  - /recipes/databases/model-data-mongodb
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn NoSQL data modeling: embedding vs referencing, access pattern-driven design. Patterns for MongoDB, DynamoDB, Cassandra, and Redis with examples."
  keywords:
    - nosql
    - mongodb
    - dynamodb
    - cassandra
    - redis
    - data-modeling
    - embedding
    - guide
---

## Overview

NoSQL databases abandon the rigid table-row model in favor of flexible schemas optimized for specific access patterns. Document stores (MongoDB), key-value stores (Redis), wide-column stores (Cassandra, DynamoDB), and graph databases (Neo4j) each have different data modeling principles. The key rule: model for your queries, not for normalized entities. Start with the read and write patterns your application needs, then design the schema to support them efficiently.

## When to Use

- Schema evolves frequently and cannot be migrated easily
- Read patterns are well-known and should be served in a single query
- Horizontal scaling is required beyond what relational databases provide
- Data is naturally hierarchical or graph-shaped
- Extreme throughput or low-latency needs justify specialized stores

## Embedding vs Referencing

| Approach | Best For | Trade-off |
|----------|----------|-----------|
| **Embedding** | One-to-few, data read together, rarely updated independently | Larger documents, duplication on update |
| **Referencing** | One-to-many, unbounded growth, independent updates | Requires application-level joins |

```javascript
// MongoDB: Embedded (order with items)
{
    _id: "order-001",
    customerId: "cust-123",
    items: [
        { productId: "p1", name: "Widget", qty: 2, price: 10.00 },
        { productId: "p2", name: "Gadget", qty: 1, price: 25.00 }
    ],
    total: 45.00
}

// MongoDB: Referenced (separate collections)
// orders collection
{ _id: "order-001", customerId: "cust-123", itemIds: ["li-1", "li-2"] }
// line_items collection
{ _id: "li-1", productId: "p1", name: "Widget", qty: 2, price: 10.00 }
{ _id: "li-2", productId: "p2", name: "Gadget", qty: 1, price: 25.00 }
```

## DynamoDB Single-Table Design

```json
// DynamoDB: Single table with overloaded GSI
{
    "PK": "USER#123",
    "SK": "PROFILE",
    "name": "Alice",
    "email": "alice@example.com"
}
{
    "PK": "USER#123",
    "SK": "ORDER#001",
    "total": 45.00,
    "status": "shipped"
}
{
    "PK": "ORDER#001",
    "SK": "DETAIL",
    "items": [...]
}

// Query all orders for a user
Query PK = "USER#123" AND begins_with(SK, "ORDER#")

// Query order details
Query PK = "ORDER#001"
```

## Cassandra Wide-Row Pattern

```sql
-- Time-series data: one row per sensor, columns for time buckets
CREATE TABLE sensor_readings (
    sensor_id UUID,
    day DATE,
    hour INT,
    minute INT,
    temperature DOUBLE,
    humidity DOUBLE,
    PRIMARY KEY ((sensor_id, day), hour, minute)
) WITH CLUSTERING ORDER BY (hour DESC, minute DESC);

-- Query: last 24 hours for a sensor
SELECT * FROM sensor_readings
WHERE sensor_id = ? AND day >= ?;
```

## Redis Patterns

```python
# Leaderboard with sorted sets
import redis
r = redis.Redis()

r.zadd('leaderboard:2024', {'alice': 1500, 'bob': 1200, 'charlie': 1800})
top_players = r.zrevrange('leaderboard:2024', 0, 9, withscores=True)

# Rate limiter with sliding window
pipe = r.pipeline()
pipe.zremrangebyscore('rate:user:123', 0, time.time() - 60)
pipe.zcard('rate:user:123')
current_count = pipe.execute()[1]
if current_count < 100:
    r.zadd('rate:user:123', {str(time.time()): time.time()})
```

## Common Mistakes

- **Applying relational modeling to NoSQL** — normalize for consistency in SQL; denormalize for reads in NoSQL
- **Unbounded arrays** — embedding a list that grows forever causes document/column bloat
- **Ignoring access patterns** — NoSQL schemas should be driven by queries, not entities
- **No pagination strategy** — large result sets need cursor-based or keyset pagination
- **Treating all NoSQL databases the same** — MongoDB embedding, DynamoDB single-table, and Cassandra wide-rows are fundamentally different approaches

## FAQ

**When should I use a document store vs a relational database?**
Use documents when schema flexibility, hierarchical data, and read-heavy workloads dominate. Use relational when ACID transactions, complex joins, and strict schema enforcement are required.

**Can I enforce referential integrity in NoSQL?**
Generally no, not at the database level. Applications must enforce constraints, or use eventual consistency patterns like saga transactions.

**How do I migrate schema in NoSQL?**
Use lazy migration: update application code to handle both old and new formats, and migrate data on read or in background jobs.
