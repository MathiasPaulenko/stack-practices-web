---


contentType: guides
slug: complete-guide-redis-production
title: "Referencia Detallada de Redis en Producción"
description: "Correr Redis en produccion. Cubre persistence (RDB, AOF), clustering, sentinel para HA, failover handling, memory management, eviction policies, pipelining, Lua scripting, monitoring, security hardening y backup strategies con ejemplos practicos."
metaDescription: "Run Redis in production. Covers persistence RDB AOF, clustering, sentinel, failover, memory management, eviction, pipelining, Lua, monitoring."
difficulty: advanced
topics:
  - databases
  - caching
  - infrastructure
tags:
  - redis
  - databases
  - guia
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

## Introducción

Redis es un in-memory data store usado para caching, sessions, queues, y real-time analytics. Correr Redis en production requiere persistence, high availability, memory management, monitoring, y security. Esta guia recorre RDB y AOF persistence, clustering, sentinel, failover, eviction policies, pipelining, Lua scripting, y backup strategies.

## Persistence

### RDB (Redis Database) Snapshots

RDB toma point-in-time snapshots de tu dataset. Es compact y fast para recovery pero puede lose data entre snapshots.

```bash
# redis.conf
save 900 1      # Save si al menos 1 key cambio en 900s
save 300 10     # Save si al menos 10 keys cambiaron en 300s
save 60 10000   # Save si al menos 10000 keys cambiaron en 60s

# Disable RDB (para pure cache)
# save ""

# RDB file name y location
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

AOF loggea every write command. Provee better durability que RDB pero usa mas disk space.

```bash
# redis.conf
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec    # Options: always, everysec, no

# appendfsync options:
# always   — fsync despues de every write (safest, slowest)
# everysec — fsync once per second (good balance, default)
# no       — let OS decide (fastest, puede lose hasta 30s de data)

# AOF rewrite — compacta el file
auto-aof-rewrite-percentage 100  # Rewrite cuando el file doubles in size
auto-aof-rewrite-min-size 64mb   # Minimum size para trigger rewrite
```

```bash
# Manual AOF rewrite
redis-cli BGREWRITEAOF

# Check AOF status
redis-cli INFO persistence
```

### Combinando RDB y AOF

```bash
# Usa ambos para maximum durability
save 900 1
save 300 10
appendonly yes
appendfsync everysec

# On restart, Redis loadea AOF first (mas complete)
# RDB actua como un backup y para faster full recovery

# AOF con RDB preamble (Redis 4.0+)
aof-use-rdb-preamble yes
# AOF file empieza con RDB snapshot, luego appendea incremental commands
```

## Clustering

Redis Cluster provee horizontal scaling y automatic failover across multiple nodes.

```text
Redis Cluster topology (6 nodes, 3 masters + 3 replicas):

  Slot range 0-5460:     Master A ← Replica A'
  Slot range 5461-10922: Master B ← Replica B'
  Slot range 10923-16383: Master C ← Replica C'

  16384 hash slots total
  Keys son distributed by CRC16(key) % 16384
```

```bash
# redis.conf para cluster mode
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
# Crear un cluster con 3 masters y 3 replicas
redis-cli --cluster create \
  192.168.1.10:7000 192.168.1.11:7000 192.168.1.12:7000 \
  192.168.1.13:7000 192.168.1.14:7000 192.168.1.15:7000 \
  --cluster-replicas 1

# Check cluster status
redis-cli -c -p 7000 cluster info
redis-cli -c -p 7000 cluster nodes

# Add un new node
redis-cli --cluster add-node 192.168.1.16:7000 192.168.1.10:7000

# Reshard slots
redis-cli --cluster reshard 192.168.1.10:7000

# Remove un node
redis-cli --cluster del-node 192.168.1.10:7000 <node-id>
```

```python
# Python client con cluster support
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

Redis Sentinel provee high availability para standalone Redis (no cluster). Monitorea master y replicas, y performa automatic failover.

```bash
# sentinel.conf
port 26379
sentinel monitor mymaster 192.168.1.10 6379 2
# Monitor master en 192.168.1.10:6379, quorum = 2 sentinels

sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1

# Correr sentinel
redis-sentinel /etc/redis/sentinel.conf
```

```text
Sentinel architecture:

  Sentinel 1 ─┐
  Sentinel 2 ─┼── Monitor ── Master (192.168.1.10:6379)
  Sentinel 3 ─┘                  │
                                 └── Replica (192.168.1.11:6379)

  Si master goes down:
  1. Sentinels detect master es unreachable (down-after-milliseconds)
  2. Sentinels votan (quorum needed)
  3. Sentinel promotea replica a master
  4. Clients son notified del new master
```

```python
# Python client con sentinel support
from redis.sentinel import Sentinel

sentinel = Sentinel([
    ("192.168.1.20", 26379),
    ("192.168.1.21", 26379),
    ("192.168.1.22", 26379),
])

# Get master connection
master = sentinel.master_for("mymaster", socket_timeout=0.5)
master.set("key", "value")

# Get replica connection (para read scaling)
replica = sentinel.slave_for("mymaster", socket_timeout=0.5)
print(replica.get("key"))
```

## Memory Management

```bash
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru

# Eviction policies:
# noeviction       — Return errors cuando memory esta full
# allkeys-lru      — Evict least recently used keys (any key)
# allkeys-lfu      — Evict least frequently used keys (any key)
# volatile-lru     — Evict LRU entre keys con TTL set
# volatile-lfu     — Evict LFU entre keys con TTL set
# volatile-ttl     — Evict keys con shortest TTL
# volatile-random  — Evict random keys con TTL
# allkeys-random   — Evict random keys (any key)
```

```bash
# Check memory usage
redis-cli INFO memory

# Key fields:
# used_memory: Total bytes allocated por Redis
# used_memory_rss: RSS as seen por el OS
# mem_fragmentation_ratio: rss / used_memory (>1.5 = fragmentation)
# maxmemory: Configured memory limit
# evicted_keys: Number de keys evicted

# Check individual key memory
redis-cli MEMORY USAGE user:1

# Analyze memory por key pattern
redis-cli --memkeys --memkeys-samples 1000

# Reset maxmemory dinamicamente
CONFIG SET maxmemory 4gb
```

```bash
# Memory optimization
# Usa hash para small objects (ziplist encoding)
hash-max-listpack-entries 128
hash-max-listpack-value 64

# Usa sorted set eficientemente
zset-max-listpack-entries 128
zset-max-listpack-value 64

# Usa list eficientemente
list-max-listpack-size -2

# Check encoding de un key
redis-cli OBJECT ENCODING user:1
# "ziplist" (compact) vs "hashtable" (standard)
```

## Pipelining

Pipelining manda multiple commands en un single network round trip.

```python
import redis

r = redis.Redis(host="localhost", port=6379)

# Sin pipelining — 1000 round trips
for i in range(1000):
    r.set(f"key:{i}", f"value:{i}")

# Con pipelining — 1 round trip
pipe = r.pipeline()
for i in range(1000):
    pipe.set(f"key:{i}", f"value:{i}")
results = pipe.execute()

# Pipeline con transaction (MULTI/EXEC)
pipe = r.pipeline(transaction=True)
pipe.set("counter", 0)
pipe.incr("counter")
pipe.incr("counter")
results = pipe.execute()
# [True, 1, 2]
```

## Lua Scripting

Lua scripts corren atomicamente en el Redis server. Ningun otro command ejecuta durante el script.

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
# Ejecutar Lua script desde Python
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

# Register script (SHA1 cached en server)
cas = r.register_script(cas_script)

result = cas(keys=["mykey"], args=["old_value", "new_value"])
print(result)  # 1 si set, 0 si no
```

```bash
# Ejecutar Lua desde CLI
redis-cli EVAL "return redis.call('SET', KEYS[1], ARGV[1])" 1 mykey myvalue

# Usar cached script (EVALSHA)
redis-cli SCRIPT LOAD "return redis.call('GET', KEYS[1])"
# Returnea SHA1: e0e1f9fabfc9d4800c8e9afbe9176740751f6f1f
redis-cli EVALSHA e0e1f9fabfc9d4800c8e9afbe9176740751f6f1f 1 mykey
```

## Monitoring

```bash
# Real-time command monitoring
redis-cli MONITOR
# Shows every command executed (usa sparingly — impacts performance)

# Slow log
redis-cli SLOWLOG GET 10
# Shows last 10 slow commands

# Configurar slow log threshold (microseconds)
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
bind 127.0.0.1 192.168.1.10  # Solo bind a specific interfaces
protected-mode yes            # Reject connections desde untrusted networks
requirepass your_strong_password
port 0                       # Disable direct TCP (usa Unix socket only)
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
# Crear un user con limited access
ACL SETUSER app_user on >app_password ~app:* +get +set +del +expire
ACL SETUSER readonly_user on >ro_password ~cache:* +get

# List users
ACL LIST

# Delete un user
ACL DELUSER app_user
```

## Backup y Recovery

```bash
# Backup RDB file
cp /var/lib/redis/dump.rdb /backup/dump-$(date +%Y%m%d).rdb

# Backup AOF file
cp /var/lib/redis/appendonly.aof /backup/appendonly-$(date +%Y%m%d).aof

# Online backup con BGSAVE
redis-cli BGSAVE
# Wait para save complete
while [ "$(redis-cli INFO persistence | grep rdb_bgsave_in_progress | tr -d '\r')" != "rdb_bgsave_in_progress:0" ]; do
  sleep 1
done
cp /var/lib/redis/dump.rdb /backup/dump-$(date +%Y%m%d).rdb

# Restore desde RDB
# 1. Stop Redis
# 2. Reemplaza dump.rdb en data directory
# 3. Start Redis

# Restore desde AOF
# 1. Stop Redis
# 2. Reemplaza appendonly.aof en data directory
# 3. Start Redis (AOF es replayed)
```

## Preguntas Frecuentes

### ¿Deberia usar RDB o AOF persistence?

Usa ambos. RDB es compact y fast para full recovery — good para backups y disaster recovery. AOF provee better durability — perdes at most 1 second de data con `everysec`. Usa `aof-use-rdb-preamble yes` para combinar ambos: el AOF file empieza con un RDB snapshot para fast recovery, luego appendea incremental commands. Para pure cache workloads donde data loss es acceptable, disablia persistence entirely (`save ""` y `appendonly no`).

### ¿Cuándo deberia usar Redis Cluster vs Sentinel?

Usa Redis Cluster cuando necesitas horizontal scaling — tu dataset es larger que una single machine's memory, o necesitas higher write throughput. Cluster shardea data across multiple nodes usando hash slots. Usa Sentinel cuando tu dataset fittea en una machine pero necesitas high availability. Sentinel monitorea un single master con replicas y performa automatic failover. Cluster es mas complex de set up y operate pero provee tanto scaling como HA.

### ¿Cómo elijo un eviction policy?

Usa `allkeys-lru` para general-purpose caching — evicta el least recently used keys regardless de TTL. Usa `volatile-lru` cuando algunos keys son permanent (sin TTL) y nunca deberian ser evicted. Usa `allkeys-lfu` (Redis 4.0+) cuando access frequency importa mas que recency. Usa `noeviction` cuando data loss es unacceptable — Redis returnea errors en vez de evicting. Para session storage, usa `volatile-lru` con TTLs en all sessions. Para pure cache, usa `allkeys-lru`.

### ¿Qué causa high memory fragmentation?

Memory fragmentation occurre cuando Redis allocatea y freea memory en un pattern que deja gaps. El OS ve higher RSS que Redis actually usa. Checkea `mem_fragmentation_ratio` en `INFO memory` — values arriba de 1.5 indican fragmentation. Causes: frequent key expiration y replacement, large value size changes, list/hash resizing. Solutions: restart Redis para reclaim memory, usa `MEMORY PURGE` (con jemalloc), o enablea `activedefrag yes` (Redis 4.0+) para automatic defragmentation.

### ¿Cómo handleo Redis failover en mi application?

Usa un client library que soporte failover. Para Sentinel, usa `redis-py`'s `Sentinel` class — automaticamente discovers el new master despues de failover. Para Cluster, usa `redis-py`'s `RedisCluster` — sigue MOVED y ASK redirections. Implementa retry logic para transient errors durante failover. Setea un connection timeout (e.g., 500ms) y un retry count (e.g., 3). Usa circuit breakers para fail fast cuando Redis es unavailable. Considera un local cache fallback para critical reads.

### ¿Cómo puedo reducir Redis memory usage?

Usa efficient data structures. Storea small objects en hashes (ziplist encoding usa less memory que individual keys). Usa `HSET` para user profiles en vez de separate string keys. Setea appropriate `hash-max-listpack-entries` y `hash-max-listpack-value` thresholds. Usa short key names. Setea TTLs en all cache keys. Usa `EXPIRE` o `SETEX` para prevenir unbounded growth. Corre `redis-cli --bigkeys` para findar oversized keys. Considera RedisJSON para JSON data en vez de storear serialized strings.

## See Also

- [Complete Guide to Redis Caching Strategies](/es/guides/complete-guide-redis-caching-strategies/)
- [Complete Guide to PostgreSQL Replication](/es/guides/complete-guide-postgresql-replication/)
- [Complete Guide to CDN Caching Strategy](/es/guides/complete-guide-cdn-caching-strategy/)
- [Complete Guide to Database Sharding](/es/guides/complete-guide-database-sharding/)
- [Complete Guide to Elasticsearch Cluster Setup](/es/guides/complete-guide-elasticsearch-cluster-setup/)

