---





contentType: patterns
slug: geode-pattern
title: "Geode Pattern"
description: "Distribute data across nodes with partitioning so each node owns a shard. Horizontal scaling without shared state, with locality and fault isolation per partition."
metaDescription: "Distribute data across nodes with partitioning so each node owns a shard. Scale horizontally without shared state, with locality and fault isolation per partition."
difficulty: advanced
topics:
  - architecture
  - databases
tags:
  - geode
  - pattern
  - design-pattern
  - data-partitioning
  - sharding
  - horizontal-scaling
  - distributed-systems
relatedResources:
  - /patterns/circuit-breaker-pattern
  - /patterns/graceful-degradation-pattern
  - /patterns/shed-load-pattern
  - /patterns/multi-tenant-data-isolation-pattern
  - /patterns/database-per-service-pattern
  - /patterns/sharding-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Distribute data across nodes with partitioning so each node owns a shard. Scale horizontally without shared state, with locality and fault isolation per partition."
  keywords:
    - geode pattern
    - data partitioning
    - sharding pattern
    - design pattern
    - horizontal scaling
    - distributed systems
    - fault isolation





---

# Geode Pattern

## Overview

The Geode Pattern partitions data across multiple nodes so that each node owns a non-overlapping shard. A request for a specific data item routes to the node that owns it. There is no shared database, no shared cache, no shared state. Each node is self-contained: it holds its data, processes requests for that data, and fails independently.

The name comes from geodes: rocks that look ordinary on the outside but contain crystal-lined cavities inside. Each node is a self-contained cavity with its own data crystals. The system as a whole is a collection of independent geodes.

This pattern solves the shared-state bottleneck. When all nodes read and write to the same database, that database becomes the scalability ceiling. By partitioning data, each node handles only its fraction of the load. Adding more nodes adds more capacity linearly.

## When to Use


- For alternatives, see [Sharding Pattern](/patterns/sharding-pattern/).

Use the Geode Pattern when:
- A shared database or cache is the scalability bottleneck
- Data can be partitioned by a natural key (user ID, tenant ID, geographic region)
- You need fault isolation: one partition failing should not affect others
- You need horizontal scaling without distributed transactions
- Examples: multi-tenant SaaS, gaming servers, IoT data ingestion, regional content delivery

## Solution

### Python

```python
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Callable
import hashlib
import json

@dataclass
class GeodeNode:
    node_id: str
    shard_range: tuple
    data: Dict[str, Any] = field(default_factory=dict)
    healthy: bool = True

    def owns_key(self, key: str) -> bool:
        h = int(hashlib.md5(key.encode()).hexdigest(), 16)
        shard_start, shard_end = self.shard_range
        return shard_start <= h % 10000 <= shard_end

    def get(self, key: str) -> Optional[Any]:
        if not self.healthy:
            raise RuntimeError(f"Node {self.node_id} is down")
        return self.data.get(key)

    def put(self, key: str, value: Any) -> None:
        if not self.healthy:
            raise RuntimeError(f"Node {self.node_id} is down")
        self.data[key] = value

class GeodeCluster:
    def __init__(self, num_nodes: int = 4):
        self.nodes: List[GeodeNode] = []
        shard_size = 10000 // num_nodes
        for i in range(num_nodes):
            start = i * shard_size
            end = start + shard_size - 1 if i < num_nodes - 1 else 9999
            self.nodes.append(GeodeNode(node_id=f"node-{i}", shard_range=(start, end)))

    def _hash_key(self, key: str) -> int:
        return int(hashlib.md5(key.encode()).hexdigest(), 16) % 10000

    def find_node(self, key: str) -> Optional[GeodeNode]:
        h = self._hash_key(key)
        for node in self.nodes:
            start, end = node.shard_range
            if start <= h <= end:
                return node
        return None

    def get(self, key: str) -> Optional[Any]:
        node = self.find_node(key)
        if node is None:
            raise KeyError(f"No node owns key: {key}")
        return node.get(key)

    def put(self, key: str, value: Any) -> None:
        node = self.find_node(key)
        if node is None:
            raise KeyError(f"No node owns key: {key}")
        node.put(key, value)

    def fail_node(self, node_id: str) -> None:
        for node in self.nodes:
            if node.node_id == node_id:
                node.healthy = False

    def restore_node(self, node_id: str) -> None:
        for node in self.nodes:
            if node.node_id == node_id:
                node.healthy = True

    def stats(self) -> List[dict]:
        return [{"node_id": n.node_id, "keys": len(n.data), "healthy": n.healthy,
                 "range": n.shard_range} for n in self.nodes]

# Usage
cluster = GeodeCluster(num_nodes=4)

users = ["alice", "bob", "carol", "dave", "eve", "frank", "grace", "heidi"]
for user in users:
    cluster.put(user, {"email": f"{user}@example.com", "score": hash(user) % 100})

print("=== Cluster Stats ===")
for s in cluster.stats():
    print(f"  {s}")

print("\n=== Reads ===")
for user in users:
    node = cluster.find_node(user)
    data = cluster.get(user)
    print(f"  {user} -> {node.node_id}: {data}")

print("\n=== Simulate node-2 failure ===")
cluster.fail_node("node-2")
for user in users:
    node = cluster.find_node(user)
    try:
        data = cluster.get(user)
        print(f"  {user} -> {node.node_id}: OK")
    except RuntimeError as e:
        print(f"  {user} -> {node.node_id}: FAILED ({e})")
```

### JavaScript

```javascript
const crypto = require('crypto');

class GeodeNode {
  constructor(nodeId, shardStart, shardEnd) {
    this.nodeId = nodeId;
    this.shardRange = [shardStart, shardEnd];
    this.data = new Map();
    this.healthy = true;
  }

  ownsKey(key) {
    const h = parseInt(crypto.createHash('md5').update(key).digest('hex'), 16) % 10000;
    return h >= this.shardRange[0] && h <= this.shardRange[1];
  }

  get(key) {
    if (!this.healthy) throw new Error(`Node ${this.nodeId} is down`);
    return this.data.get(key);
  }

  put(key, value) {
    if (!this.healthy) throw new Error(`Node ${this.nodeId} is down`);
    this.data.set(key, value);
  }
}

class GeodeCluster {
  constructor(numNodes = 4) {
    this.nodes = [];
    const shardSize = Math.floor(10000 / numNodes);
    for (let i = 0; i < numNodes; i++) {
      const start = i * shardSize;
      const end = i < numNodes - 1 ? start + shardSize - 1 : 9999;
      this.nodes.push(new GeodeNode(`node-${i}`, start, end));
    }
  }

  _hashKey(key) {
    return parseInt(crypto.createHash('md5').update(key).digest('hex'), 16) % 10000;
  }

  findNode(key) {
    const h = this._hashKey(key);
    return this.nodes.find(n => h >= n.shardRange[0] && h <= n.shardRange[1]) || null;
  }

  get(key) {
    const node = this.findNode(key);
    if (!node) throw new Error(`No node owns key: ${key}`);
    return node.get(key);
  }

  put(key, value) {
    const node = this.findNode(key);
    if (!node) throw new Error(`No node owns key: ${key}`);
    node.put(key, value);
  }

  failNode(nodeId) {
    const node = this.nodes.find(n => n.nodeId === nodeId);
    if (node) node.healthy = false;
  }

  stats() {
    return this.nodes.map(n => ({
      nodeId: n.nodeId, keys: n.data.size, healthy: n.healthy, range: n.shardRange,
    }));
  }
}

// Usage
const cluster = new GeodeCluster(4);
const users = ["alice", "bob", "carol", "dave", "eve", "frank", "grace", "heidi"];
users.forEach(u => cluster.put(u, { email: `${u}@example.com`, score: u.length * 10 }));

console.log("=== Cluster Stats ===");
cluster.stats().forEach(s => console.log("  ", s));

console.log("\n=== Reads ===");
users.forEach(u => {
  const node = cluster.findNode(u);
  console.log(`  ${u} -> ${node.nodeId}: ${JSON.stringify(cluster.get(u))}`);
});

console.log("\n=== Simulate node-2 failure ===");
cluster.failNode("node-2");
users.forEach(u => {
  const node = cluster.findNode(u);
  try { cluster.get(u); console.log(`  ${u} -> ${node.nodeId}: OK`); }
  catch (e) { console.log(`  ${u} -> ${node.nodeId}: FAILED (${e.message})`); }
});
```

### Java

```java
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

public class GeodeCluster {

    static class GeodeNode {
        final String nodeId;
        final int shardStart, shardEnd;
        final Map<String, Object> data = new HashMap<>();
        boolean healthy = true;

        GeodeNode(String nodeId, int shardStart, int shardEnd) {
            this.nodeId = nodeId; this.shardStart = shardStart; this.shardEnd = shardEnd;
        }

        boolean ownsKey(String key) {
            int h = hashKey(key);
            return h >= shardStart && h <= shardEnd;
        }

        Object get(String key) {
            if (!healthy) throw new RuntimeException("Node " + nodeId + " is down");
            return data.get(key);
        }

        void put(String key, Object value) {
            if (!healthy) throw new RuntimeException("Node " + nodeId + " is down");
            data.put(key, value);
        }
    }

    final List<GeodeNode> nodes = new ArrayList<>();

    public GeodeCluster(int numNodes) {
        int shardSize = 10000 / numNodes;
        for (int i = 0; i < numNodes; i++) {
            int start = i * shardSize;
            int end = (i < numNodes - 1) ? start + shardSize - 1 : 9999;
            nodes.add(new GeodeNode("node-" + i, start, end));
        }
    }

    static int hashKey(String key) {
        try {
            byte[] digest = MessageDigest.getInstance("MD5").digest(key.getBytes(StandardCharsets.UTF_8));
            int h = 0;
            for (int i = 0; i < 4; i++) h = (h << 8) | (digest[i] & 0xFF);
            return Math.abs(h) % 10000;
        } catch (Exception e) { return key.hashCode() % 10000; }
    }

    GeodeNode findNode(String key) {
        int h = hashKey(key);
        return nodes.stream().filter(n -> h >= n.shardStart && h <= n.shardEnd).findFirst().orElse(null);
    }

    Object get(String key) {
        GeodeNode node = findNode(key);
        if (node == null) throw new RuntimeException("No node owns key: " + key);
        return node.get(key);
    }

    void put(String key, Object value) {
        GeodeNode node = findNode(key);
        if (node == null) throw new RuntimeException("No node owns key: " + key);
        node.put(key, value);
    }

    void failNode(String nodeId) {
        nodes.stream().filter(n -> n.nodeId.equals(nodeId)).forEach(n -> n.healthy = false);
    }

    public static void main(String[] args) {
        var cluster = new GeodeCluster(4);
        String[] users = {"alice", "bob", "carol", "dave", "eve", "frank", "grace", "heidi"};
        for (String u : users) cluster.put(u, Map.of("email", u + "@example.com", "score", u.length() * 10));

        System.out.println("=== Reads ===");
        for (String u : users) {
            var node = cluster.findNode(u);
            System.out.printf("  %s -> %s: %s%n", u, node.nodeId, cluster.get(u));
        }

        System.out.println("\n=== Simulate node-2 failure ===");
        cluster.failNode("node-2");
        for (String u : users) {
            var node = cluster.findNode(u);
            try { cluster.get(u); System.out.printf("  %s -> %s: OK%n", u, node.nodeId); }
            catch (Exception e) { System.out.printf("  %s -> %s: FAILED (%s)%n", u, node.nodeId, e.getMessage()); }
        }
    }
}
```

## Explanation

The cluster works in three steps:

1. **Hash-based partitioning**: Each key is hashed (MD5, SHA-256, or consistent hashing) and mapped to a numeric range. Each node owns a non-overlapping range. The hash distributes keys uniformly across nodes.
2. **Routing**: When a request arrives, the cluster hashes the key and finds the node that owns the corresponding range. The request goes directly to that node, which processes it using its local data store.
3. **Fault isolation**: If a node goes down, only the keys in its shard are affected. Other nodes continue serving their shards independently. A replica or recovery node can take over the failed shard.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Consistent hashing** | Use a ring instead of fixed ranges for easier rebalancing | Dynamic clusters where nodes join/leave frequently |
| **Replicated geodes** | Each shard has a replica on another node for failover | High availability without shared state |
| **Geographic geodes** | Partition by region, each region in its own datacenter | Latency-sensitive global apps |
| **Virtual nodes** | One physical node owns multiple non-contiguous ranges | Better load distribution with few physical nodes |

## What Works

- **Partition by a natural key** (user ID, tenant ID) so related data stays on the same node
- **Use consistent hashing** to minimize data movement when adding or removing nodes
- **Keep shards independent** so a node failure does not cascade to other shards
- **Monitor shard balance** and rebalance if one shard grows disproportionately
- **Route at the edge** so the client does not need to know which node owns the data
- **Replicate critical shards** for failover, but keep replicas read-only to avoid coordination

## Common Mistakes

- Partitioning by a key with uneven distribution, causing hot shards
- Using distributed transactions across shards, defeating the purpose of partitioning
- Not having a failover plan for when a shard node goes down
- Requiring cross-shard joins, which need scatter-gather and add latency
- Not monitoring shard size, letting one shard grow until it runs out of disk
- Using random partitioning instead of a natural key, losing data locality

## Frequently Asked Questions

**Q: How is the Geode Pattern different from standard database sharding?**
A: Database sharding partitions a single logical database across multiple instances. The Geode Pattern goes further: each node is fully independent with its own storage, no shared database backend. There is no central coordinator or shared storage layer.

**Q: What happens when a node fails?**
A: Only the keys on that node are affected. If you have replicas, traffic fails over to the replica. If not, those keys are unavailable until the node recovers. Other nodes continue serving their shards.

**Q: How do I handle queries that span multiple shards?**
A: Scatter-gather: send the query to all nodes in parallel and merge results. This works for read-only queries but is slower than a single-node query. For writes, avoid cross-shard transactions by designing your partition key so related data stays on the same node.

**Q: When should I not use the Geode Pattern?**
A: When your data model requires frequent cross-partition joins or distributed transactions. If most operations touch multiple partitions, the coordination overhead negates the benefits of partitioning.
