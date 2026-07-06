---
contentType: guides
slug: complete-guide-database-sharding
title: "Complete Guide to Database Sharding"
description: "Master database sharding. Covers range-based, hash-based, and directory-based partitioning strategies, consistent hashing, shard key selection, cross-shard queries, resharding, Vitess, Citus, and when to shard vs scale vertically with practical examples."
metaDescription: "Master database sharding. Covers range, hash, directory partitioning, consistent hashing, shard keys, cross-shard queries, resharding, Vitess."
difficulty: advanced
topics:
  - databases
  - architecture
  - infrastructure
tags:
  - sharding
  - databases
  - guide
  - partitioning
  - scaling
  - vitess
  - citus
  - consistent-hashing
relatedResources:
  - /guides/databases/complete-guide-postgresql-replication
  - /guides/databases/complete-guide-mongodb-indexing
  - /guides/databases/complete-guide-sql-query-optimization
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Master database sharding. Covers range, hash, directory partitioning, consistent hashing, shard keys, cross-shard queries, resharding, Vitess."
  keywords:
    - database sharding
    - horizontal partitioning
    - shard key
    - consistent hashing
    - range based sharding
    - hash based sharding
    - vitess
    - citus
---

## Introduction

Sharding splits a database into smaller pieces (shards) distributed across multiple servers. Each shard holds a subset of the data. This guide walks through partitioning strategies, shard key selection, consistent hashing, cross-shard queries, resharding, and tools like Vitess and Citus.

## When to Shard

```text
Shard when:
  - Data does not fit on a single machine (disk or memory)
  - Write throughput exceeds a single server's capacity
  - Query latency increases as data grows
  - You need geographic data distribution

Do NOT shard when:
  - Data fits on a single machine with headroom
  - You can scale vertically (bigger server, more RAM, SSD)
  - Application logic cannot handle cross-shard complexity
  - You need ACID transactions across shards

Sharding adds:
  - Operational complexity (more servers to manage)
  - Application complexity (routing queries to shards)
  - Cross-shard query limitations
  - Resharding difficulty when the shard key changes

Rule: shard last, after vertical scaling, read replicas, and caching.
```

## Partitioning Strategies

### Range-Based Sharding

Range-based sharding assigns data to shards based on value ranges of the shard key.

```text
Shard 1: user_id 1 - 1,000,000
Shard 2: user_id 1,000,001 - 2,000,000
Shard 3: user_id 2,000,001 - 3,000,000
```

```python
def get_shard(user_id: int) -> int:
    if user_id <= 1_000_000:
        return 1
    elif user_id <= 2_000_000:
        return 2
    else:
        return 3

# Pros: range queries are efficient (scan one shard)
# Cons: hot spots — recent users go to the last shard
#       uneven distribution if keys are not uniform
```

### Hash-Based Sharding

Hash-based sharding applies a hash function to the shard key to determine the shard.

```python
import hashlib

def get_shard(user_id: str, num_shards: int = 4) -> int:
    hash_value = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
    return hash_value % num_shards

# Pros: even distribution, no hot spots
# Cons: range queries require scanning all shards
#       resharding is expensive (all data must be redistributed)

# Example distribution
users = ["alice", "bob", "charlie", "diana", "eve", "frank"]
for user in users:
    print(f"{user}: shard {get_shard(user)}")
# alice: shard 2
# bob: shard 0
# charlie: shard 3
# diana: shard 1
# eve: shard 2
# frank: shard 0
```

### Directory-Based Sharding

A lookup table maps shard keys to shards. A dedicated service manages the mapping.

```python
import redis

# Shard directory stored in Redis
r = redis.Redis(host="localhost", port=6379)

# Initialize shard mapping
shard_mapping = {
    "us-east": "shard1.example.com",
    "us-west": "shard2.example.com",
    "eu-central": "shard3.example.com",
    "asia-pacific": "shard4.example.com",
}

for region, host in shard_mapping.items():
    r.hset("shard_directory", region, host)

def get_shard_connection(region: str) -> str:
    host = r.hget("shard_directory", region)
    if not host:
        raise ValueError(f"Unknown region: {region}")
    return host.decode()

# Pros: flexible — can move data between shards without changing the hash function
# Cons: lookup adds latency, directory is a single point of failure
#       requires a highly available directory service
```

## Consistent Hashing

Consistent hashing minimizes data movement when adding or removing shards.

```python
import hashlib
import bisect

class ConsistentHashRing:
    def __init__(self, virtual_nodes: int = 150):
        self.virtual_nodes = virtual_nodes
        self.ring: list[tuple[int, str]] = []
        self.sorted_keys: list[int] = []
    
    def _hash(self, key: str) -> int:
        return int(hashlib.md5(key.encode()).hexdigest(), 16)
    
    def add_node(self, node: str) -> None:
        for i in range(self.virtual_nodes):
            hash_val = self._hash(f"{node}:{i}")
            bisect.insort(self.sorted_keys, hash_val)
            self.ring.insert(
                bisect.bisect_left(self.sorted_keys, hash_val),
                (hash_val, node)
            )
    
    def remove_node(self, node: str) -> None:
        self.ring = [(h, n) for h, n in self.ring if n != node]
        self.sorted_keys = [h for h, n in self.ring]
    
    def get_node(self, key: str) -> str:
        if not self.sorted_keys:
            raise ValueError("No nodes in ring")
        hash_val = self._hash(key)
        idx = bisect.bisect_right(self.sorted_keys, hash_val)
        if idx == len(self.sorted_keys):
            idx = 0
        return self.ring[idx][1]

# Usage
ring = ConsistentHashRing(virtual_nodes=150)
ring.add_node("shard1.example.com")
ring.add_node("shard2.example.com")
ring.add_node("shard3.example.com")

print(ring.get_node("user:12345"))  # shard2.example.com
print(ring.get_node("user:67890"))  # shard1.example.com

# Adding a node only moves a fraction of keys
ring.add_node("shard4.example.com")
# Only ~25% of keys move to the new node
```

```text
Consistent hashing benefits:
  - Adding a node: only K/N keys move (K = total keys, N = nodes)
  - Removing a node: only K/N keys move
  - Virtual nodes improve distribution uniformity
  - No need to rehash all keys when topology changes

Used by: Cassandra, DynamoDB, Redis Cluster, Memcached clients
```

## Shard Key Selection

```text
Good shard key properties:
  - High cardinality — many distinct values for even distribution
  - Low frequency — no single value dominates (avoids hot spots)
  - Non-monotonic — does not always increase (avoids all new data on one shard)
  - Query-relevant — most queries include the shard key (avoids scatter)

Bad shard keys:
  - Auto-increment ID — monotonic, all new data goes to the last shard
  - Timestamp — recent data concentrated on one shard
  - Low cardinality field (e.g., country with 3 values) — uneven distribution
  - Field not in queries — every query scans all shards

Good shard keys:
  - User ID (UUID) — high cardinality, included in most queries
  - Hash of (user_id + timestamp) — non-monotonic, high cardinality
  - Composite key (user_id, created_at) — supports range queries per user
```

```python
# Example: choosing a shard key for a multi-tenant app
# Bad: shard by tenant_id — one large tenant overwhelms a shard
# Good: shard by (tenant_id, user_id) — distributes within a tenant

def get_shard_key(tenant_id: str, user_id: str) -> str:
    return f"{tenant_id}:{user_id}"

# Most queries include tenant_id and user_id
# SELECT * FROM orders WHERE tenant_id = 'acme' AND user_id = 'u123'
# Routes to a single shard
```

## Cross-Shard Queries

```sql
-- Single-shard query (efficient — includes shard key)
SELECT * FROM orders WHERE user_id = 123 AND created_at > '2026-01-01';

-- Cross-shard query (scatter-gather — query all shards)
SELECT * FROM orders WHERE status = 'pending';
-- Router sends query to all shards, merges results

-- Cross-shard aggregation (expensive)
SELECT COUNT(*) FROM orders WHERE created_at > '2026-01-01';
-- Each shard counts, router sums the counts

-- Cross-shard join (very expensive — avoid)
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.status = 'shipped';
-- Requires fetching data from multiple shards and joining in memory
```

```python
# Scatter-gather pattern in application code
import concurrent.futures

def scatter_gather(query: str, shards: list[str]) -> list[dict]:
    results = []
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(shards)) as executor:
        futures = {
            executor.submit(execute_on_shard, shard, query): shard
            for shard in shards
        }
        
        for future in concurrent.futures.as_completed(futures):
            shard = futures[future]
            try:
                shard_results = future.result()
                results.extend(shard_results)
            except Exception as e:
                print(f"Error on {shard}: {e}")
    
    return results

def execute_on_shard(shard: str, query: str) -> list[dict]:
    # Connect to shard and execute query
    conn = connect_to_shard(shard)
    return conn.execute(query).fetchall()
```

## Resharding

```text
When to reshard:
  - Data grows beyond current shard capacity
  - Hot shard (uneven distribution)
  - Adding or removing shards

Resharding strategies:
  1. Dual-write: write to both old and new shards, backfill, then switch reads
  2. Capture-change: stream changes from old shards to new, then switch
  3. Offline: stop writes, migrate data, restart (downtime)

Dual-write process:
  1. Add new shards alongside old ones
  2. Write to both old and new (dual-write)
  3. Backfill existing data from old to new
  4. Verify data consistency
  5. Switch reads to new shards
  6. Stop writes to old shards
  7. Decommission old shards
```

```python
# Dual-write example
class DualWriteRouter:
    def __init__(self, old_shards, new_shards):
        self.old_shards = old_shards
        self.new_shards = new_shards
        self.read_from = "old"  # Switch to "new" after verification
    
    def write(self, shard_key: str, data: dict):
        # Write to both old and new
        old_shard = self.get_shard(shard_key, self.old_shards)
        new_shard = self.get_shard(shard_key, self.new_shards)
        
        old_shard.insert(data)
        new_shard.insert(data)
    
    def read(self, shard_key: str, query: str):
        if self.read_from == "old":
            return self.get_shard(shard_key, self.old_shards).query(query)
        else:
            return self.get_shard(shard_key, self.new_shards).query(query)
    
    def get_shard(self, key: str, shards: list) -> object:
        idx = hash(key) % len(shards)
        return shards[idx]
```

## Vitess

Vitess is a database clustering system for horizontal scaling of MySQL.

```yaml
# vttablet configuration
tablet:
  keyspace: commerce
  shard: 0
  tablet_alias: zone1-0000000100

db:
  host: localhost
  port: 3306
  user: vt_app
  password: vt_password
  dbname: vt_commerce
```

```sql
-- Vitess uses VSchema for cross-shard queries
-- VSchema defines how tables are sharded

-- Sharded table (by user_id)
CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  total DECIMAL(10,2),
  created_at TIMESTAMP
);

-- VSchema: orders is sharded by user_id (vindex)
-- "hash" vindex uses consistent hashing

-- Unsharded table (lookup table)
CREATE TABLE products (
  id BIGINT PRIMARY KEY,
  name VARCHAR(255),
  price DECIMAL(10,2)
);

-- VSchema: products is unsharded (in a single shard)

-- Cross-shard query (Vitess handles scatter-gather)
SELECT * FROM orders WHERE total > 100;
-- Vitess routes to all shards and merges results
```

## Citus

Citus is a PostgreSQL extension that distributes data across multiple nodes.

```sql
-- Install Citus extension
CREATE EXTENSION citus;

-- Create distributed table (sharded by user_id)
SELECT create_distributed_table('orders', 'user_id');

-- Citus automatically shards the table
-- Default: 32 shards, hash-based distribution

-- Query with shard key (routes to single shard)
SELECT * FROM orders WHERE user_id = 123;

-- Cross-shard query (scatter-gather)
SELECT count(*), status FROM orders GROUP BY status;

-- Reference table (replicated to all nodes)
SELECT create_reference_table('products');

-- Join distributed table with reference table
SELECT o.id, p.name, o.total
FROM orders o
JOIN products p ON o.product_id = p.id
WHERE o.user_id = 123;
-- Reference table is local on each node, join is efficient

-- Colocated tables (same shard key, same shards)
SELECT create_distributed_table('order_items', 'user_id');
-- orders and order_items are colocated by user_id
-- Joins on user_id are single-shard and efficient

SELECT o.id, oi.product_id, oi.quantity
FROM orders o
JOIN order_items oi ON o.id = oi.order_id AND o.user_id = oi.user_id
WHERE o.user_id = 123;
```

## FAQ

### What is the difference between sharding and partitioning?

Partitioning divides a table within a single database into smaller pieces. It can be horizontal (row-based) or vertical (column-based). Sharding distributes data across multiple database servers. Sharding is horizontal partitioning across machines. Partitioning stays on one server — it improves query performance and manageability. Sharding adds network communication and distributed query complexity. Use partitioning first; shard only when one server cannot handle the data.

### How do I choose a shard key?

Choose a shard key with high cardinality (many distinct values), even distribution (no hot spots), and that appears in most queries (avoids scatter-gather). Avoid monotonic keys like auto-increment IDs or timestamps — they concentrate new data on one shard. Avoid low-cardinality fields like status or country. Good choices: UUIDs, composite keys like (tenant_id, user_id), or hashes of natural keys. Test with real data distribution before committing — changing the shard key later requires resharding.

### What is consistent hashing and why does it matter?

Consistent hashing maps both data keys and server nodes to the same hash ring. When a node is added or removed, only the keys on that node's portion of the ring move. This minimizes data redistribution — typically K/N keys move where K is total keys and N is node count. Without consistent hashing, adding a node with modulo hashing requires redistributing all keys. Consistent hashing is used by Cassandra, DynamoDB, Redis Cluster, and most distributed caches.

### Can I do ACID transactions across shards?

Most sharded databases do not support cross-shard ACID transactions. Each shard is independent — a transaction on one shard cannot lock rows on another. Workarounds: use two-phase commit (slow and complex), saga pattern (compensating transactions), or design your schema so transactions stay within a single shard. If your application requires cross-shard transactions, consider whether sharding is the right choice — a single server with vertical scaling may be better.

### When should I use Vitess or Citus?

Use Vitess when you have a MySQL-based application that needs horizontal scaling. Vitess provides connection pooling, query routing, and online schema migrations. It is used by YouTube, Slack, and GitHub. Use Citus when you have a PostgreSQL application that needs horizontal scaling. Citus extends PostgreSQL with distributed tables, reference tables, and colocated joins. It is a PostgreSQL extension, so you keep full SQL compatibility. Both tools handle sharding transparently — your application sees a single database.

### How do I handle joins across shards?

Cross-shard joins are expensive — the router must fetch data from multiple shards and join in memory. Avoid them by: (1) colocating tables with the same shard key on the same shards, (2) using reference tables (replicated to all shards), (3) denormalizing data to avoid joins, or (4) doing joins in application code after fetching from shards. Citus handles colocated joins efficiently — if two tables share the same shard key, joins on that key are single-shard. Vitess supports VSchema for similar optimization.
