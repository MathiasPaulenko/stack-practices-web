---
contentType: patterns
slug: sharding-pattern
title: "Sharding Pattern"
description: "Split a large dataset into smaller partitions (shards) distributed across multiple servers to improve scalability, performance, and availability beyond single-node limits."
metaDescription: "Learn the Sharding Pattern for horizontal data partitioning. Examples in Python, Java, and JavaScript with hash, range, and directory sharding strategies."
difficulty: advanced
topics:
  - design
  - architecture
  - databases
tags:
  - sharding
  - pattern
  - design-pattern
  - databases
  - scalability
  - partitioning
  - horizontal-scaling
relatedResources:
  - /patterns/design/database-per-service-pattern
  - /patterns/design/materialized-view-pattern
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Learn the Sharding Pattern for horizontal data partitioning. Examples in Python, Java, and JavaScript with hash, range, and directory sharding strategies."
  keywords:
    - sharding
    - design pattern
    - databases
    - scalability
    - partitioning
    - horizontal scaling
    - data partitioning
---

# Sharding Pattern

## Overview

The Sharding Pattern divides a large dataset into smaller, manageable chunks called **shards** and distributes them across multiple servers or database instances. Instead of a single monolithic database handling all read and write traffic, each shard manages a subset of the data, allowing the system to scale horizontally by adding more shard nodes.

This pattern is essential when a single database server can no longer handle the volume of data, query throughput, or concurrent connections. By distributing data, sharding reduces the load on any individual node and enables near-linear scalability.

## When to Use

- Dataset exceeds the storage capacity of a single database node
- Query throughput exceeds the CPU/IOPS limits of a single server
- Need to reduce latency by placing data geographically closer to users
- Write throughput creates lock contention or replication lag on a single node
- Horizontal scaling is preferred over expensive vertical scaling

## When to Avoid

- Dataset fits comfortably on a single server with headroom for growth
- Cross-shard queries (joins, aggregations) are frequent and complex
- Operational complexity of managing multiple nodes exceeds team capacity
- Strong transactional consistency across shards is required (ACID across shards is hard)
- Simple read-heavy workloads where read replicas suffice

## Solution

### Python (Hash-Based Sharding with Redis)

```python
import hashlib
import redis
from typing import List, Dict

class ShardManager:
    """Manages hash-based sharding across multiple Redis instances"""

    def __init__(self, shards: List[redis.Redis]):
        self.shards = shards
        self.num_shards = len(shards)

    def _get_shard_index(self, key: str) -> int:
        """Determine which shard owns a key using consistent hashing"""
        hash_value = int(hashlib.md5(key.encode()).hexdigest(), 16)
        return hash_value % self.num_shards

    def get(self, key: str):
        shard = self.shards[self._get_shard_index(key)]
        return shard.get(key)

    def set(self, key: str, value: str):
        shard = self.shards[self._get_shard_index(key)]
        return shard.set(key, value)

    def delete(self, key: str):
        shard = self.shards[self._get_shard_index(key)]
        return shard.delete(key)

    def mget(self, keys: List[str]) -> Dict[str, any]:
        """Batch get across multiple shards"""
        shard_keys: Dict[int, List[str]] = {}
        for key in keys:
            idx = self._get_shard_index(key)
            shard_keys.setdefault(idx, []).append(key)

        results = {}
        for idx, keys in shard_keys.items():
            values = self.shards[idx].mget(keys)
            results.update(dict(zip(keys, values)))
        return results

# Usage
shards = [
    redis.Redis(host='redis-1', port=6379, db=0),
    redis.Redis(host='redis-2', port=6379, db=0),
    redis.Redis(host='redis-3', port=6379, db=0),
]

manager = ShardManager(shards)

# Data automatically distributed across shards
manager.set('user:1001', json.dumps({'name': 'Alice', 'region': 'US'}))
manager.set('user:1002', json.dumps({'name': 'Bob', 'region': 'EU'}))
manager.set('user:1003', json.dumps({'name': 'Carol', 'region': 'APAC'}))

# Retrieve from correct shard transparently
user = manager.get('user:1001')
```

### Java (Range-Based Sharding with Spring)

```java
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.List;
import java.util.Map;

@Component
public class RangeShardRouter {

    private final List<DataSource> shards;
    private final List<Long> rangeBoundaries;

    // Shard 0: IDs 1-1,000,000
    // Shard 1: IDs 1,000,001-2,000,000
    // Shard 2: IDs 2,000,001+
    public RangeShardRouter(List<DataSource> shards, List<Long> boundaries) {
        this.shards = shards;
        this.rangeBoundaries = boundaries;
    }

    public JdbcTemplate getShardForId(Long id) {
        int shardIndex = 0;
        for (Long boundary : rangeBoundaries) {
            if (id <= boundary) break;
            shardIndex++;
        }
        return new JdbcTemplate(shards.get(shardIndex));
    }

    public void insertOrder(Long orderId, Long customerId, Double amount) {
        JdbcTemplate shard = getShardForId(orderId);
        shard.update(
            "INSERT INTO orders (id, customer_id, amount) VALUES (?, ?, ?)",
            orderId, customerId, amount
        );
    }

    public Map<String, Object> getOrder(Long orderId) {
        JdbcTemplate shard = getShardForId(orderId);
        return shard.queryForMap(
            "SELECT * FROM orders WHERE id = ?",
            orderId
        );
    }
}
```

### JavaScript (Directory-Based Sharding)

```javascript
class DirectoryShardManager {
    constructor() {
        // Lookup table mapping entity IDs to shard assignments
        this.directory = new Map();
        this.shards = new Map();
    }

    registerShard(shardId, connection) {
        this.shards.set(shardId, connection);
    }

    assignToShard(entityId, shardId) {
        this.directory.set(entityId, shardId);
    }

    getShardForEntity(entityId) {
        const shardId = this.directory.get(entityId);
        if (!shardId) throw new Error(`No shard assigned for ${entityId}`);
        return this.shards.get(shardId);
    }

    async queryEntity(entityId, query, params) {
        const shard = this.getShardForEntity(entityId);
        return await shard.query(query, params);
    }

    // Migration: move entity from one shard to another
    async migrateEntity(entityId, fromShardId, toShardId) {
        const fromShard = this.shards.get(fromShardId);
        const toShard = this.shards.get(toShardId);

        // 1. Read from source
        const data = await fromShard.query('SELECT * FROM entities WHERE id = ?', [entityId]);

        // 2. Write to destination
        await toShard.query('INSERT INTO entities VALUES (?, ?, ?)', [
            data.id, data.name, data.metadata
        ]);

        // 3. Update directory
        this.directory.set(entityId, toShardId);

        // 4. Delete from source (after verification)
        await fromShard.query('DELETE FROM entities WHERE id = ?', [entityId]);
    }
}

// Usage with geographic sharding
const manager = new DirectoryShardManager();

manager.registerShard('us-east', usEastPool);
manager.registerShard('eu-west', euWestPool);
manager.registerShard('ap-south', apSouthPool);

// Assign users to shards based on location
manager.assignToShard('user-1001', 'us-east');
manager.assignToShard('user-1002', 'eu-west');
manager.assignToShard('user-1003', 'ap-south');

// Queries automatically route to the correct shard
const result = await manager.queryEntity('user-1001',
    'SELECT * FROM users WHERE id = ?', ['user-1001']
);
```

## Explanation

Sharding works by applying a **shard function** that maps each data key to a specific shard:

- **Hash-based:** `shard = hash(key) % num_shards` — evenly distributes data but makes range queries expensive.
- **Range-based:** Assigns contiguous key ranges to shards — efficient for range queries but may create hotspots.
- **Directory-based:** Maintains an explicit lookup table — flexible but adds a lookup hop and complexity.

The key challenge is the **rebalancing problem:** when adding or removing shards, data must be migrated without downtime. Consistent hashing mitigates this by minimizing the number of keys that change shards.

## Variants

| Variant | Strategy | Best For |
|---------|----------|----------|
| **Hash-based** | `hash(key) % N` | Even distribution, simple implementation |
| **Range-based** | Key range boundaries | Range queries, time-series data |
| **Directory-based** | Lookup table | Geographic sharding, flexible reassignment |
| **Consistent hashing** | Ring-based mapping | Minimizing rebalancing on shard changes |
| **Entity-based** | One entity per shard | Multi-tenant SaaS with tenant isolation |

## Best Practices

- **Choose the right shard key.** A poor key creates hotspots (e.g., sharding by country when 90% of users are from one country).
- **Monitor shard balance.** Uneven distribution negates the benefits — track data size and query load per shard.
- **Plan for rebalancing.** Adding shards requires data migration. Use consistent hashing or directory-based routing to minimize disruption.
- **Avoid cross-shard transactions.** Distributed transactions are slow and complex. Design the data model to keep transactions within a single shard.
- **Replicate shards for availability.** Each shard should have replicas to prevent data loss if a node fails.

## Common Mistakes

- **Poor shard key choice.** A key with low cardinality creates hotspots. A key with high correlation (e.g., timestamp) creates time-based hotspots.
- **Ignoring cross-shard queries.** Aggregations across shards require querying all shards and merging results — expensive and complex.
- **No rebalancing strategy.** Adding shards without migrating data leaves new shards empty and old shards overloaded.
- **Assuming linear scalability.** Coordination overhead (directory lookups, cross-shard merges) means adding shards yields diminishing returns.
- **Forgetting about joins.** Tables that were joined when unsharded may end up on different shards, requiring application-level joins.

## Real-World Examples

### MongoDB

MongoDB uses sharding natively. A `shard key` determines document distribution across shard nodes. The cluster balancer automatically migrates chunks between shards to maintain balance. MongoDB supports both hashed and ranged shard keys.

### Instagram

Instagram shards its PostgreSQL database by user ID. Each user's data (photos, likes, comments) lives on a single shard. Cross-user interactions (e.g., following) are handled via a separate federation layer that queries multiple shards.

### Discord

Discord shards its massive message store by server (guild) ID. Each Discord server has a shard assignment, and messages for that server are stored on that shard. This keeps message history queries fast and localized.

## Frequently Asked Questions

**Q: How is sharding different from partitioning?**
A: Partitioning splits data within a single database instance. Sharding distributes partitions across multiple independent servers, each capable of operating autonomously.

**Q: What makes a good shard key?**
A: High cardinality (many distinct values), even distribution, and alignment with query patterns. Avoid monotonically increasing keys (timestamps) unless using hash-based sharding.

**Q: How do I add a new shard without downtime?**
A: Use consistent hashing (minimal key remapping) or directory-based routing (update the lookup table). For hash-based, you must reshard — recompute `hash(key) % new_count` and migrate data.

**Q: Can I do JOINs across shards?**
A: Not natively in most databases. Application-level joins query both shards and merge in code, or denormalize data to avoid cross-shard joins.

**Q: How do I handle auto-incrementing IDs with sharding?**
A: Use UUIDs, snowflake IDs (Twitter-style), or a central ID allocator. Auto-increment per shard creates conflicts and complicates global ordering.
