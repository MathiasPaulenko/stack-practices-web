---





contentType: guides
slug: complete-guide-database-sharding
title: "Referencia Detallada de Database Sharding"
description: "database sharding. Cubre range-based, hash-based y directory-based partitioning strategies, consistent hashing, shard key selection, cross-shard queries, resharding, Vitess, Citus y cuando shardar vs escalar verticalmente con ejemplos practicos."
metaDescription: "Master database sharding. Covers range, hash, directory partitioning, consistent hashing, shard keys, cross-shard queries, resharding, Vitess."
difficulty: advanced
topics:
  - databases
  - architecture
  - infrastructure
tags:
  - sharding
  - databases
  - guia
  - partitioning
  - scaling
  - vitess
  - citus
  - consistent-hashing
relatedResources:
  - /guides/complete-guide-postgresql-replication
  - /guides/complete-guide-mongodb-indexing
  - /guides/complete-guide-sql-query-optimization
  - /guides/complete-guide-elasticsearch-cluster-setup
  - /guides/complete-guide-serverless-databases
  - /guides/complete-guide-redis-production
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

## Introducción

Sharding splitea un database en smaller pieces (shards) distributed across multiple servers. Cada shard holda un subset del data. A continuacion se cubre partitioning strategies, shard key selection, consistent hashing, cross-shard queries, resharding, y tools como Vitess y Citus.

## When to Shard

```text
Shardea cuando:
  - Data no fittea en una single machine (disk o memory)
  - Write throughput excede una single server's capacity
  - Query latency aumenta a medida que data grows
  - Necesitas geographic data distribution

NO shardea cuando:
  - Data fittea en una single machine con headroom
  - Podes scalear verticalmente (bigger server, mas RAM, SSD)
  - Application logic no puede handle cross-shard complexity
  - Necesitas ACID transactions across shards

Sharding adda:
  - Operational complexity (mas servers para manage)
  - Application complexity (routing queries a shards)
  - Cross-shard query limitations
  - Resharding difficulty cuando el shard key cambia

Rule: shardea last, despues de vertical scaling, read replicas, y caching.
```

## Partitioning Strategies

### Range-Based Sharding

Range-based sharding assigna data a shards basado en value ranges del shard key.

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

# Pros: range queries son efficient (scan un shard)
# Cons: hot spots — recent users van al last shard
#       uneven distribution si keys no son uniform
```

### Hash-Based Sharding

Hash-based sharding aplica un hash function al shard key para determinar el shard.

```python
import hashlib

def get_shard(user_id: str, num_shards: int = 4) -> int:
    hash_value = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
    return hash_value % num_shards

# Pros: even distribution, no hot spots
# Cons: range queries requieren scanning all shards
#       resharding es expensive (all data debe ser redistributed)

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

Un lookup table mapea shard keys a shards. Un dedicated service maneja el mapping.

```python
import redis

# Shard directory stored en Redis
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

# Pros: flexible — podes move data entre shards sin cambiar el hash function
# Cons: lookup adda latency, directory es un single point of failure
#       requiere un highly available directory service
```

## Consistent Hashing

Consistent hashing minimiza data movement cuando adding o removing shards.

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

# Addear un node solo mueve un fraction de keys
ring.add_node("shard4.example.com")
# Solo ~25% de keys mueven al new node
```

```text
Consistent hashing benefits:
  - Addear un node: solo K/N keys mueven (K = total keys, N = nodes)
  - Remove un node: solo K/N keys mueven
  - Virtual nodes mejoran distribution uniformity
  - No need de rehashear all keys cuando topology cambia

Used by: Cassandra, DynamoDB, Redis Cluster, Memcached clients
```

## Shard Key Selection

```text
Good shard key properties:
  - High cardinality — many distinct values para even distribution
  - Low frequency — ningun single value domina (avoids hot spots)
  - Non-monotonic — no siempre increase (avoids all new data en un shard)
  - Query-relevant — most queries incluyen el shard key (avoids scatter)

Bad shard keys:
  - Auto-increment ID — monotonic, all new data va al last shard
  - Timestamp — recent data concentrated en un shard
  - Low cardinality field (e.g., country con 3 values) — uneven distribution
  - Field no en queries — every query scannea all shards

Good shard keys:
  - User ID (UUID) — high cardinality, included en most queries
  - Hash de (user_id + timestamp) — non-monotonic, high cardinality
  - Composite key (user_id, created_at) — soporta range queries per user
```

```python
# Example: elegir un shard key para un multi-tenant app
# Bad: shard por tenant_id — un large tenant overwhelma un shard
# Good: shard por (tenant_id, user_id) — distribute dentro de un tenant

def get_shard_key(tenant_id: str, user_id: str) -> str:
    return f"{tenant_id}:{user_id}"

# Most queries incluyen tenant_id y user_id
# SELECT * FROM orders WHERE tenant_id = 'acme' AND user_id = 'u123'
# Routea a un single shard
```

## Cross-Shard Queries

```sql
-- Single-shard query (efficient — incluye shard key)
SELECT * FROM orders WHERE user_id = 123 AND created_at > '2026-01-01';

-- Cross-shard query (scatter-gather — query all shards)
SELECT * FROM orders WHERE status = 'pending';
-- Router manda query a all shards, mergea results

-- Cross-shard aggregation (expensive)
SELECT COUNT(*) FROM orders WHERE created_at > '2026-01-01';
-- Cada shard countea, router summa los counts

-- Cross-shard join (very expensive — avoid)
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.status = 'shipped';
-- Requiree fetchar data desde multiple shards y joinear in memory
```

```python
# Scatter-gather pattern en application code
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
    # Connect a shard y execute query
    conn = connect_to_shard(shard)
    return conn.execute(query).fetchall()
```

## Resharding

```text
Cuando reshard:
  - Data grows beyond current shard capacity
  - Hot shard (uneven distribution)
  - Adding o removing shards

Resharding strategies:
  1. Dual-write: write a both old y new shards, backfill, luego switch reads
  2. Capture-change: stream changes desde old shards a new, luego switch
  3. Offline: stop writes, migrate data, restart (downtime)

Dual-write process:
  1. Add new shards alongside old ones
  2. Write a both old y new (dual-write)
  3. Backfill existing data desde old a new
  4. Verify data consistency
  5. Switch reads a new shards
  6. Stop writes a old shards
  7. Decommission old shards
```

```python
# Dual-write example
class DualWriteRouter:
    def __init__(self, old_shards, new_shards):
        self.old_shards = old_shards
        self.new_shards = new_shards
        self.read_from = "old"  # Switch a "new" despues de verification
    
    def write(self, shard_key: str, data: dict):
        # Write a both old y new
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

Vitess es un database clustering system para horizontal scaling de MySQL.

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
-- Vitess usa VSchema para cross-shard queries
-- VSchema define como tables son sharded

-- Sharded table (by user_id)
CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  total DECIMAL(10,2),
  created_at TIMESTAMP
);

-- VSchema: orders es sharded by user_id (vindex)
-- "hash" vindex usa consistent hashing

-- Unsharded table (lookup table)
CREATE TABLE products (
  id BIGINT PRIMARY KEY,
  name VARCHAR(255),
  price DECIMAL(10,2)
);

-- VSchema: products es unsharded (en un single shard)

-- Cross-shard query (Vitess handlea scatter-gather)
SELECT * FROM orders WHERE total > 100;
-- Vitess routea a all shards y mergea results
```

## Citus

Citus es un PostgreSQL extension que distribute data across multiple nodes.

```sql
-- Install Citus extension
CREATE EXTENSION citus;

-- Crear distributed table (sharded by user_id)
SELECT create_distributed_table('orders', 'user_id');

-- Citus automaticamente shardea el table
-- Default: 32 shards, hash-based distribution

-- Query con shard key (routea a single shard)
SELECT * FROM orders WHERE user_id = 123;

-- Cross-shard query (scatter-gather)
SELECT count(*), status FROM orders GROUP BY status;

-- Reference table (replicated a all nodes)
SELECT create_reference_table('products');

-- Join distributed table con reference table
SELECT o.id, p.name, o.total
FROM orders o
JOIN products p ON o.product_id = p.id
WHERE o.user_id = 123;
-- Reference table es local en cada node, join es efficient

-- Colocated tables (same shard key, same shards)
SELECT create_distributed_table('order_items', 'user_id');
-- orders y order_items son colocated by user_id
-- Joins en user_id son single-shard y efficient

SELECT o.id, oi.product_id, oi.quantity
FROM orders o
JOIN order_items oi ON o.id = oi.order_id AND o.user_id = oi.user_id
WHERE o.user_id = 123;
```

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre sharding y partitioning?

Partitioning divide un table dentro de un single database en smaller pieces. Puede ser horizontal (row-based) o vertical (column-based). Sharding distribute data across multiple database servers. Sharding es horizontal partitioning across machines. Partitioning stays en un server — mejora query performance y manageability. Sharding adda network communication y distributed query complexity. Usa partitioning first; shardea solo cuando un server no puede handle la data.

### ¿Cómo elijo un shard key?

Elegi un shard key con high cardinality (many distinct values), even distribution (no hot spots), y que aparezca en most queries (avoids scatter-gather). Evita monotonic keys como auto-increment IDs o timestamps — concentran new data en un shard. Evita low-cardinality fields como status o country. Good choices: UUIDs, composite keys como (tenant_id, user_id), o hashes de natural keys. Testea con real data distribution antes de commiting — cambiar el shard key later requiere resharding.

### ¿Qué es consistent hashing y por que importa?

Consistent hashing mapea tanto data keys como server nodes al same hash ring. Cuando un node es added o removed, solo las keys en ese node's portion del ring mueven. Esto minimiza data redistribution — tipicamente K/N keys mueven donde K es total keys y N es node count. Sin consistent hashing, addear un node con modulo hashing requiere redistributing all keys. Consistent hashing es used por Cassandra, DynamoDB, Redis Cluster, y most distributed caches.

### ¿Puedo hacer ACID transactions across shards?

Most sharded databases no soportan cross-shard ACID transactions. Cada shard es independent — un transaction en un shard no puede lockar rows en otro. Workarounds: usa two-phase commit (slow y complex), saga pattern (compensating transactions), o diseniá tu schema para que transactions stayan dentro de un single shard. Si tu application require cross-shard transactions, considerá si sharding es el right choice — un single server con vertical scaling puede ser better.

### ¿Cuándo deberia usar Vitess o Citus?

Usa Vitess cuando tenes un MySQL-based application que necesita horizontal scaling. Vitess provee connection pooling, query routing, y online schema migrations. Es used por YouTube, Slack, y GitHub. Usa Citus cuando tenes un PostgreSQL application que necesita horizontal scaling. Citus extiende PostgreSQL con distributed tables, reference tables, y colocated joins. Es un PostgreSQL extension, asi que mantenes full SQL compatibility. Ambas tools handlean sharding transparently — tu application ve un single database.

### ¿Cómo handleo joins across shards?

Cross-shard joins son expensive — el router debe fetchar data desde multiple shards y joinear in memory. Evitalos por: (1) colocando tables con el same shard key en los same shards, (2) usando reference tables (replicated a all shards), (3) denormalizando data para avoid joins, o (4) haciendo joins en application code despues de fetch desde shards. Citus handlea colocated joins eficientemente — si dos tables share el same shard key, joins en ese key son single-shard. Vitess soporta VSchema para similar optimization.

## See Also

- [Database Sharding: Horizontal Partitioning in Practice](/es/guides/database-sharding-implementation-guide/)
- [Complete Guide to Elasticsearch Cluster Setup](/es/guides/complete-guide-elasticsearch-cluster-setup/)
- [Complete Guide to Serverless Databases](/es/guides/complete-guide-serverless-databases/)
- [Sharding Pattern](/es/patterns/sharding-pattern/)
- [Read Replicas: Scale Reads Without Changing Application](/es/guides/read-replica-guide/)

