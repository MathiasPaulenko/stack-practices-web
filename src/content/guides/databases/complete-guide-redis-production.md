---


contentType: guides
slug: complete-guide-redis-production
title: "Complete Guide to Redis in Production"
description: "Run Redis in production. Covers persistence (RDB, AOF), clustering, sentinel for HA, failover handling, memory management, eviction policies, pipelining, Lua scripting, monitoring, security hardening, and backup strategies with practical examples."
metaDescription: "Run Redis in production. Covers persistence RDB AOF, clustering, sentinel, failover, memory management, eviction, pipelining, Lua, monitoring."
difficulty: advanced
topics:
  - databases
  - caching
  - infrastructure
tags:
  - redis
  - databases
  - guide
  - caching
  - redis-cluster
  - sentinel
  - persistence
  - failover
relatedResources:
  - /guides/complete-guide-postgresql-replication
  - /guides/complete-guide-mongodb-indexing
  - /guides/complete-guide-database-sharding
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Run Redis in production. Covers persistence RDB AOF, clustering, sentinel, failover, memory management, eviction, pipelining, Lua, monitoring."
  keywords:
    - redis production
    - redis persistence
    - redis cluster
    - redis sentinel
    - redis failover
    - redis memory management
    - redis eviction policy
    - redis monitoring


---

## Introduction

Redis is an in-memory data store used for caching, sessions, queues, and real-time analytics. Running Redis in production requires persistence, high availability, memory management, monitoring, and security. This guide walks through RDB and AOF persistence, clustering, sentinel, failover, eviction policies, pipelining, Lua scripting, and backup strategies.

## Persistence

### RDB (Redis Database) Snapshots

RDB takes point-in-time snapshots of your dataset. It is compact and fast for recovery but can lose data between snapshots.

```bash
# redis.conf
save 900 1      # Save if at least 1 key changed in 900s
save 300 10     # Save if at least 10 keys changed in 300s
save 60 10000   # Save if at least 10000 keys changed in 60s

# Disable RDB (for pure cache)
# save ""

# RDB file name and location
dbfilename dump.rdb
dir /var/lib/redis

# Compression
rdbcompression yes
rdbchecksum yes
```

```bash
# Manual snapshot
redis-cli BGSAVE

# Check last save time
redis-cli LASTSAVE

# RDB file info
redis-cli --rdb /tmp/dump.rdb
```

### AOF (Append-Only File)

AOF logs every write command. It provides better durability than RDB but uses more disk space.

```bash
# redis.conf
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec    # Options: always, everysec, no

# appendfsync options:
# always   — fsync after every write (safest, slowest)
# everysec — fsync once per second (good balance, default)
# no       — let OS decide (fastest, can lose up to 30s of data)

# AOF rewrite — compact the file
auto-aof-rewrite-percentage 100  # Rewrite when file doubles in size
auto-aof-rewrite-min-size 64mb   # Minimum size to trigger rewrite
```

```bash
# Manual AOF rewrite
redis-cli BGREWRITEAOF

# Check AOF status
redis-cli INFO persistence
```

### Combining RDB and AOF

```bash
# Use both for maximum durability
save 900 1
save 300 10
appendonly yes
appendfsync everysec

# On restart, Redis loads AOF first (more complete)
# RDB acts as a backup and for faster full recovery

# AOF with RDB preamble (Redis 4.0+)
aof-use-rdb-preamble yes
# AOF file starts with RDB snapshot, then appends incremental commands
```

## Clustering

Redis Cluster provides horizontal scaling and automatic failover across multiple nodes.

```text
Redis Cluster topology (6 nodes, 3 masters + 3 replicas):

  Slot range 0-5460:     Master A ← Replica A'
  Slot range 5461-10922: Master B ← Replica B'
  Slot range 10923-16383: Master C ← Replica C'

  16384 hash slots total
  Keys are distributed by CRC16(key) % 16384
```

```bash
# redis.conf for cluster mode
port 7000
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
cluster-announce-ip 192.168.1.10
cluster-announce-port 7000
cluster-announce-bus-port 17000

appendonly yes
```

```bash
# Create a cluster with 3 masters and 3 replicas
redis-cli --cluster create \
  192.168.1.10:7000 192.168.1.11:7000 192.168.1.12:7000 \
  192.168.1.13:7000 192.168.1.14:7000 192.168.1.15:7000 \
  --cluster-replicas 1

# Check cluster status
redis-cli -c -p 7000 cluster info
redis-cli -c -p 7000 cluster nodes

# Add a new node
redis-cli --cluster add-node 192.168.1.16:7000 192.168.1.10:7000

# Reshard slots
redis-cli --cluster reshard 192.168.1.10:7000

# Remove a node
redis-cli --cluster del-node 192.168.1.10:7000 <node-id>
```

```python
# Python client with cluster support
from redis.cluster import RedisCluster

rc = RedisCluster(
    startup_nodes=[{"host": "192.168.1.10", "port": 7000}],
    decode_responses=True,
    max_connections=50,
)

rc.set("user:1", "Alice")
rc.set("user:2", "Bob")

print(rc.get("user:1"))  # Alice
```

## Sentinel

Redis Sentinel provides high availability for standalone Redis (not cluster). It monitors master and replicas, and performs automatic failover.

```bash
# sentinel.conf
port 26379
sentinel monitor mymaster 192.168.1.10 6379 2
# Monitor master at 192.168.1.10:6379, quorum = 2 sentinels

sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1

# Run sentinel
redis-sentinel /etc/redis/sentinel.conf
```

```text
Sentinel architecture:

  Sentinel 1 ─┐
  Sentinel 2 ─┼── Monitor ── Master (192.168.1.10:6379)
  Sentinel 3 ─┘                  │
                                 └── Replica (192.168.1.11:6379)

  If master goes down:
  1. Sentinels detect master is unreachable (down-after-milliseconds)
  2. Sentinels vote (quorum needed)
  3. Sentinel promotes replica to master
  4. Clients are notified of the new master
```

```python
# Python client with sentinel support
from redis.sentinel import Sentinel

sentinel = Sentinel([
    ("192.168.1.20", 26379),
    ("192.168.1.21", 26379),
    ("192.168.1.22", 26379),
])

# Get master connection
master = sentinel.master_for("mymaster", socket_timeout=0.5)
master.set("key", "value")

# Get replica connection (for read scaling)
replica = sentinel.slave_for("mymaster", socket_timeout=0.5)
print(replica.get("key"))
```

## Memory Management

```bash
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru

# Eviction policies:
# noeviction       — Return errors when memory is full
# allkeys-lru      — Evict least recently used keys (any key)
# allkeys-lfu      — Evict least frequently used keys (any key)
# volatile-lru     — Evict LRU among keys with TTL set
# volatile-lfu     — Evict LFU among keys with TTL set
# volatile-ttl     — Evict keys with shortest TTL
# volatile-random  — Evict random keys with TTL
# allkeys-random   — Evict random keys (any key)
```

```bash
# Check memory usage
redis-cli INFO memory

# Key fields:
# used_memory: Total bytes allocated by Redis
# used_memory_rss: RSS as seen by the OS
# mem_fragmentation_ratio: rss / used_memory (>1.5 = fragmentation)
# maxmemory: Configured memory limit
# evicted_keys: Number of keys evicted

# Check individual key memory
redis-cli MEMORY USAGE user:1

# Analyze memory by key pattern
redis-cli --memkeys --memkeys-samples 1000

# Reset maxmemory dynamically
CONFIG SET maxmemory 4gb
```

```bash
# Memory optimization
# Use hash for small objects (ziplist encoding)
hash-max-listpack-entries 128
hash-max-listpack-value 64

# Use sorted set efficiently
zset-max-listpack-entries 128
zset-max-listpack-value 64

# Use list efficiently
list-max-listpack-size -2

# Check encoding of a key
redis-cli OBJECT ENCODING user:1
# "ziplist" (compact) vs "hashtable" (standard)
```

## Pipelining

Pipelining sends multiple commands in a single network round trip.

```python
import redis

r = redis.Redis(host="localhost", port=6379)

# Without pipelining — 1000 round trips
for i in range(1000):
    r.set(f"key:{i}", f"value:{i}")

# With pipelining — 1 round trip
pipe = r.pipeline()
for i in range(1000):
    pipe.set(f"key:{i}", f"value:{i}")
results = pipe.execute()

# Pipeline with transaction (MULTI/EXEC)
pipe = r.pipeline(transaction=True)
pipe.set("counter", 0)
pipe.incr("counter")
pipe.incr("counter")
results = pipe.execute()
# [True, 1, 2]
```

## Lua Scripting

Lua scripts run atomically on the Redis server. No other commands execute during the script.

```lua
-- Atomic compare-and-set
-- KEYS[1] = key, ARGV[1] = expected, ARGV[2] = new value
local current = redis.call("GET", KEYS[1])
if current == ARGV[1] then
  redis.call("SET", KEYS[1], ARGV[2])
  return 1
else
  return 0
end
```

```python
# Execute Lua script from Python
import redis

r = redis.Redis(host="localhost", port=6379)

cas_script = """
local current = redis.call("GET", KEYS[1])
if current == ARGV[1] then
  redis.call("SET", KEYS[1], ARGV[2])
  return 1
else
  return 0
end
"""

# Register script (SHA1 cached on server)
cas = r.register_script(cas_script)

result = cas(keys=["mykey"], args=["old_value", "new_value"])
print(result)  # 1 if set, 0 if not
```

```bash
# Execute Lua from CLI
redis-cli EVAL "return redis.call('SET', KEYS[1], ARGV[1])" 1 mykey myvalue

# Use cached script (EVALSHA)
redis-cli SCRIPT LOAD "return redis.call('GET', KEYS[1])"
# Returns SHA1: e0e1f9fabfc9d4800c8e9afbe9176740751f6f1f
redis-cli EVALSHA e0e1f9fabfc9d4800c8e9afbe9176740751f6f1f 1 mykey
```

## Monitoring

```bash
# Real-time command monitoring
redis-cli MONITOR
# Shows every command executed (use sparingly — impacts performance)

# Slow log
redis-cli SLOWLOG GET 10
# Shows last 10 slow commands

# Configure slow log threshold (microseconds)
CONFIG SET slowlog-log-slower-than 10000  # 10ms
CONFIG SET slowlog-max-len 128

# Latency monitoring
CONFIG SET latency-monitor-threshold 100  # 100ms
redis-cli LATENCY HISTORY event-loop
redis-cli LATENCY GRAPH event-loop

# Info command stats
redis-cli INFO commandstats
redis-cli INFO stats
redis-cli INFO clients
redis-cli INFO replication
```

```bash
# Big key detection
redis-cli --bigkeys

# Check keyspace hits/misses
redis-cli INFO stats | grep keyspace
# keyspace_hits: 1000000
# keyspace_misses: 5000
# Hit rate = hits / (hits + misses) = 99.5%
```

## Security

```bash
# redis.conf — security hardening
bind 127.0.0.1 192.168.1.10  # Only bind to specific interfaces
protected-mode yes            # Reject connections from untrusted networks
requirepass your_strong_password
port 0                       # Disable direct TCP (use Unix socket only)
unixsocket /var/run/redis/redis.sock
unixsocketperm 700

# Rename dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG "CONFIG_a1b2c3d4"
rename-command KEYS ""
rename-command DEBUG ""

# TLS (Redis 6.0+)
port 0
tls-port 6379
tls-cert-file /etc/redis/redis.crt
tls-key-file /etc/redis/redis.key
tls-ca-cert-file /etc/redis/ca.crt
tls-auth-clients yes
```

```bash
# ACL (Redis 6.0+)
# Create a user with limited access
ACL SETUSER app_user on >app_password ~app:* +get +set +del +expire
ACL SETUSER readonly_user on >ro_password ~cache:* +get

# List users
ACL LIST

# Delete a user
ACL DELUSER app_user
```

## Backup and Recovery

```bash
# Backup RDB file
cp /var/lib/redis/dump.rdb /backup/dump-$(date +%Y%m%d).rdb

# Backup AOF file
cp /var/lib/redis/appendonly.aof /backup/appendonly-$(date +%Y%m%d).aof

# Online backup with BGSAVE
redis-cli BGSAVE
# Wait for save to complete
while [ "$(redis-cli INFO persistence | grep rdb_bgsave_in_progress | tr -d '\r')" != "rdb_bgsave_in_progress:0" ]; do
  sleep 1
done
cp /var/lib/redis/dump.rdb /backup/dump-$(date +%Y%m%d).rdb

# Restore from RDB
# 1. Stop Redis
# 2. Replace dump.rdb in data directory
# 3. Start Redis

# Restore from AOF
# 1. Stop Redis
# 2. Replace appendonly.aof in data directory
# 3. Start Redis (AOF is replayed)
```

## FAQ

### Should I use RDB or AOF persistence?

Use both. RDB is compact and fast for full recovery — good for backups and disaster recovery. AOF provides better durability — you lose at most 1 second of data with `everysec`. Use `aof-use-rdb-preamble yes` to combine both: the AOF file starts with an RDB snapshot for fast recovery, then appends incremental commands. For pure cache workloads where data loss is acceptable, disable persistence entirely (`save ""` and `appendonly no`).

### When should I use Redis Cluster vs Sentinel?

Use Redis Cluster when you need horizontal scaling — your dataset is larger than a single machine's memory, or you need higher write throughput. Cluster shards data across multiple nodes using hash slots. Use Sentinel when your dataset fits on one machine but you need high availability. Sentinel monitors a single master with replicas and performs automatic failover. Cluster is more complex to set up and operate but provides both scaling and HA.

### How do I choose an eviction policy?

Use `allkeys-lru` for general-purpose caching — evict the least recently used keys regardless of TTL. Use `volatile-lru` when some keys are permanent (no TTL) and should never be evicted. Use `allkeys-lfu` (Redis 4.0+) when access frequency matters more than recency. Use `noeviction` when data loss is unacceptable — Redis returns errors instead of evicting. For session storage, use `volatile-lru` with TTLs on all sessions. For pure cache, use `allkeys-lru`.

### What causes high memory fragmentation?

Memory fragmentation occurs when Redis allocates and frees memory in a pattern that leaves gaps. The OS sees higher RSS than Redis actually uses. Check `mem_fragmentation_ratio` in `INFO memory` — values above 1.5 indicate fragmentation. Causes: frequent key expiration and replacement, large value size changes, list/hash resizing. Solutions: restart Redis to reclaim memory, use `MEMORY PURGE` (with jemalloc), or enable `activedefrag yes` (Redis 4.0+) for automatic defragmentation.

### How do I handle Redis failover in my application?

Use a client library that supports failover. For Sentinel, use `redis-py`'s `Sentinel` class — it automatically discovers the new master after failover. For Cluster, use `redis-py`'s `RedisCluster` — it follows MOVED and ASK redirections. Implement retry logic for transient errors during failover. Set a connection timeout (e.g., 500ms) and a retry count (e.g., 3). Use circuit breakers to fail fast when Redis is unavailable. Consider a local cache fallback for critical reads.

### How can I reduce Redis memory usage?

Use efficient data structures. Store small objects in hashes (ziplist encoding uses less memory than individual keys). Use `HSET` for user profiles instead of separate string keys. Set appropriate `hash-max-listpack-entries` and `hash-max-listpack-value` thresholds. Use short key names. Set TTLs on all cache keys. Use `EXPIRE` or `SETEX` to prevent unbounded growth. Run `redis-cli --bigkeys` to find oversized keys. Consider RedisJSON for JSON data instead of storing serialized strings.

## See Also

- [Complete Guide to Redis Caching Strategies](/guides/complete-guide-redis-caching-strategies/)
- [Complete Guide to PostgreSQL Replication](/guides/complete-guide-postgresql-replication/)
- [Complete Guide to CDN Caching Strategy](/guides/complete-guide-cdn-caching-strategy/)
- [Complete Guide to Database Sharding](/guides/complete-guide-database-sharding/)
- [Complete Guide to Elasticsearch Cluster Setup](/guides/complete-guide-elasticsearch-cluster-setup/)

