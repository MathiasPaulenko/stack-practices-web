---
contentType: guides
slug: nosql-database-selection-guide
title: "NoSQL Database Selection — MongoDB, DynamoDB, Cassandra"
description: "A practical guide to choosing the right NoSQL database. Compare document, key-value, wide-column, and graph stores with selection criteria and migration tips."
metaDescription: "NoSQL database selection guide: compare MongoDB, DynamoDB, Cassandra, Redis. Choose the right document, key-value, or wide-column store for your workload."
difficulty: intermediate
topics:
  - databases
tags:
  - cassandra
  - database
  - dynamodb
  - guide
  - mongodb
  - nosql
  - redis
relatedResources:
  - /guides/databases/database-design-guide
  - /guides/databases/sql-performance-tuning-guide
  - /guides/architecture/system-design-interview-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "NoSQL database selection guide: compare MongoDB, DynamoDB, Cassandra, Redis. Choose the right document, key-value, or wide-column store for your workload."
  keywords:
    - nosql database selection
    - mongodb vs dynamodb
    - cassandra vs mongodb
    - document store vs key value
    - choosing nosql database
---

# NoSQL Database Selection

## Introduction

NoSQL databases trade the strict consistency and relational model of SQL for flexibility, horizontal growth, and specialized access patterns. Choosing the right one means matching your data shape, query patterns, and consistency requirements to the right store.

## The Four NoSQL Families

| Family | Structure | Best For | Examples |
|--------|-----------|----------|----------|
| **Document** | JSON-like documents with nested structures | Content management, user profiles, catalogs | MongoDB, Firestore, Couchbase |
| **Key-Value** | Simple key → value lookups | Sessions, caching, feature flags | Redis, DynamoDB, Riak |
| **Wide-Column** | Column families with rows as sparse maps | Time-series, high-write telemetry, messaging | Cassandra, HBase, ScyllaDB |
| **Graph** | Nodes and relationships with properties | Social networks, recommendation engines, fraud detection | Neo4j, Amazon Neptune |

## Document Stores: MongoDB

### When to Choose

- Rich, nested data structures with arrays and subdocuments
- Flexible schema that evolves over time
- Need for secondary indexes and aggregation pipelines
- Queries that look like JavaScript object matching

### Example

```javascript
// A product document with nested reviews and variants
db.products.insertOne({
  sku: "SHOE-001",
  name: "Trail Runner",
  price: 89.99,
  attributes: { color: "red", size: 42 },
  reviews: [
    { user_id: 42, rating: 5, comment: "Great grip!" }
  ],
  tags: ["running", "trail", "waterproof"]
})

// Flexible query with nested matching
db.products.find({ "reviews.rating": { $gte: 4 }, tags: "trail" })
```

### Trade-offs

| Pro | Con |
|-----|-----|
| Flexible schema | Schema validation must be configured explicitly |
| Rich query language | Joins are expensive and limited |
| Secondary indexes | Indexes consume RAM and slow writes |
| Horizontal scaling (sharding) | Sharding adds operational complexity |

## Key-Value Stores: DynamoDB and Redis

### DynamoDB (AWS)

Best for: predictable latency at any scale, simple read/write patterns, serverless architectures.

```python
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Users')

# Get by partition key (single-digit ms latency)
table.get_item(Key={'user_id': 'user-123'})

# Query by partition + sort key
table.query(
    KeyConditionExpression=Key('user_id').eq('user-123') &
                           Key('timestamp').gt('2024-01-01')
)
```

**Critical design constraint:** Access patterns must be known upfront. DynamoDB is optimized for known query paths, not ad-hoc exploration.

### Redis

Best for: caching, real-time leaderboards, [rate limiting](/recipes/api/rate-limiting), session stores.

```bash
# Cache a computed value for 5 minutes
SET user:123:profile '{"name":"Alice"}' EX 300

# Atomic increment for rate limiting
INCR rate_limit:ip:192.168.1.1
EXPIRE rate_limit:ip:192.168.1.1 60
```

**Critical constraint:** All data must fit in RAM. Redis is not a primary data store for large datasets.

## Wide-Column Stores: Cassandra

### When to Choose

- Write-heavy workloads (time-series, IoT, messaging)
- Need linear growth across commodity hardware
- Tolerance for eventual consistency and CQL (Cassandra Query Language)

### Data Model

```sql
-- Time-series sensor data
CREATE TABLE sensor_readings (
    sensor_id UUID,
    day TEXT,        -- partition key component
    timestamp TIMESTAMP,
    temperature DOUBLE,
    humidity DOUBLE,
    PRIMARY KEY ((sensor_id, day), timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC);

-- Query: last 100 readings for a sensor today
SELECT * FROM sensor_readings
WHERE sensor_id = ? AND day = '2024-06-12'
LIMIT 100;
```

**Cassandra is query-first:** tables are designed around specific read queries, not normalized entities.

### Trade-offs

| Pro | Con |
|-----|-----|
| Massive write throughput | No JOINs, no subqueries, no aggregations across partitions |
| Linear growth | Operational complexity (gossip, repairs, compaction) |
| Multi-datacenter replication | Eventual consistency by default |
| Tunable consistency | CQL is limited compared to SQL |

## Decision Matrix

| Requirement | Best Choice | Why |
|-------------|-------------|-----|
| Flexible, nested JSON documents | MongoDB | Native document model, rich query language |
| Predictable low-latency key lookups at scale | DynamoDB | Single-digit ms, auto-scaling, serverless |
| High-throughput time-series writes | Cassandra | Log-structured storage, excellent write performance |
| Caching and ephemeral data | Redis | In-memory speed, rich data structures |
| Complex relationship traversal | Neo4j | Optimized graph traversals |
| Multi-item ACID transactions | PostgreSQL | NoSQL stores typically lack cross-document transactions |

## Migration Tips from SQL

| SQL Habit | NoSQL Adaptation |
|-----------|-----------------|
| Normalized tables | Embed related data when accessed together; reference when accessed separately |
| JOINs everywhere | Design tables/collections around query patterns, not entities |
| Auto-increment IDs | Use [UUIDs](/recipes/data/uuid-generation) or composite keys (user_id + timestamp) |
| Ad-hoc analytics | Use [change data capture](/guides/architecture/event-driven-architecture-guide) to stream to a data warehouse |
| Single source of truth | Accept that different stores may have different views of truth (CQRS) |

## What Works

- **Model for your reads, not your writes** — NoSQL performance is access-pattern dependent
- **Avoid hot partitions** — distribute writes evenly across partition keys (use random suffixes or time bucketing)
- **Set TTLs where appropriate** — expire old data automatically instead of running cleanup jobs
- **Test with production-like data volumes** — behavior at 1K rows is not predictive of behavior at 1B rows
- **Have a migration path** — data gravity is real; choose carefully because migrating later is expensive

## Common Mistakes

- Using MongoDB as a cache (Redis is cheaper and faster)
- Using DynamoDB for ad-hoc analytics (Athena/BigQuery are better suited)
- Using Cassandra for OLTP with complex queries (Cassandra excels at simple, partition-scoped queries)
- Treating NoSQL as "grows better SQL" — the data model is fundamentally different
- Ignoring operational complexity — Cassandra and sharded MongoDB require dedicated operational expertise

## Frequently Asked Questions

### Should I migrate from PostgreSQL to MongoDB for flexibility?

Not for flexibility alone. PostgreSQL has JSONB, which gives you document flexibility while keeping ACID transactions. Migrate to MongoDB when you need horizontal sharding or a document-native query language.

### Can I use multiple NoSQL databases in one application?

Yes, and it is common. Use Redis for cache/sessions, DynamoDB for user profiles, and Elasticsearch for search. This is polyglot persistence. The trade-off is operational complexity.

### How do I handle transactions across NoSQL databases?

Most NoSQL stores do not support cross-document or cross-table ACID transactions. Use [sagas](/guides/architecture/event-driven-architecture-guide), outbox patterns, or [idempotent operations](/recipes/messaging/message-idempotency) with at-least-once delivery to achieve eventual consistency.


## Advanced Topics

### Scenario: Polyglot Persistence for Social Platform

```text
System: 50M users, 200M posts, 2B interactions/day
Stores: 6 databases, each optimized for its workload

Store selection:
  | Data | Store | Why | Access Pattern |
  |------|-------|-----|----------------|
  | Profiles | MongoDB | Flexible schema | Point reads by user_id |
  | Posts | Cassandra | High write volume | Partition by user_id |
  | Graph | Neo4j | Relationship traversal | Friend-of-friend |
  | Feed | Redis | Low-latency sorted sets | ZREVRANGE |
  | Search | Elasticsearch | Full-text, faceted | Multi-field search |
  | Analytics | ClickHouse | Columnar OLAP | Aggregations |

Data flow:
  User creates post
    -> Write to Cassandra (durable)
    -> Publish event to Kafka
    -> Consumers:
       a. Feed: ZADD to Redis (fan-out to followers)
       b. Search: Index in Elasticsearch
       c. Analytics: Insert into ClickHouse
       d. Graph: Update Neo4j relationships

  Cassandra schema:
    CREATE TABLE posts_by_user (
        user_id UUID, post_id TIMEUUID, content TEXT,
        media_urls LIST<TEXT>, created_at TIMESTAMP,
        PRIMARY KEY ((user_id), post_id)
    ) WITH CLUSTERING ORDER BY (post_id DESC);

  Redis timeline (fan-out on write):
    ZADD feed:user:{follower_id} {timestamp} {post_id}
    EXPIRE feed:user:{follower_id} 86400
    ZREVRANGE feed:user:{user_id} 0 49 WITHSCORES

  Neo4j social graph:
    MATCH (me:User {id: "user-123"})-[:FOLLOWS]->(:User)
          -[:FOLLOWS]->(rec:User)
    WHERE NOT (me)-[:FOLLOWS]->(rec) AND me <> rec
    RETURN rec.id, rec.name, count(*) AS mutual_friends
    ORDER BY mutual_friends DESC LIMIT 10;

  ClickHouse analytics:
    CREATE TABLE interactions (
        event_date Date, user_id UInt64, post_id UInt64,
        event_type Enum8("like"=1,"comment"=2,"share"=3,"view"=4),
        timestamp DateTime
    ) ENGINE = MergeTree()
    PARTITION BY toYYYYMM(event_date)
    ORDER BY (event_type, timestamp);

Operational complexity:
  | Challenge | Mitigation |
  |-----------|------------|
  | 6 databases | Dedicated team per store |
  | Cross-store consistency | Outbox + Kafka events |
  | Schema evolution | Versioned events |
  | Data duplication | Accept; each store optimized |
  | Monitoring | Unified dashboard per store |

Lessons:
  - Polyglot persistence is capable but expensive
  - Start with 1-2 stores, add more when patterns diverge
  - Event-driven sync (Kafka) is the glue
  - Each store owns a specific access pattern
  - Data duplication is acceptable; manage via events
```

### How do I handle schema evolution across stores?

Version your events and schemas. Use schema registry for compatibility. Apply backward-compatible changes first (add fields, never remove). Consumers handle missing fields with defaults. For breaking changes, publish new event type and migrate consumers gradually.











End of document. Review and update quarterly.