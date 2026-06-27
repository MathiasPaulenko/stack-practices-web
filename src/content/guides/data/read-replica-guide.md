---
contentType: guides
slug: read-replica-guide
title: "Read Replicas — Scale Reads Without Changing Application Logic"
description: "A practical guide to read replicas: setting up replication, routing read queries, handling replication lag, and scaling read-heavy workloads with PostgreSQL, MySQL, and cloud-managed replicas."
metaDescription: "Learn read replicas: setup replication, route read queries, handle replication lag, and scale read-heavy workloads with PostgreSQL, MySQL, and cloud replicas."
difficulty: intermediate
topics:
  - databases
  - performance
  - infrastructure
tags:
  - read-replicas
  - replication
  - postgresql
  - mysql
  - scaling
  - performance
  - guide
relatedResources:
  - /guides/data/database-sharding-implementation-guide
  - /guides/data/connection-pooling-deep-dive-guide
  - /guides/data/caching-strategies-guide
  - /guides/observability/metrics-and-dashboards-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn read replicas: setup replication, route read queries, handle replication lag, and scale read-heavy workloads with PostgreSQL, MySQL, and cloud replicas."
  keywords:
    - read-replicas
    - replication
    - postgresql
    - mysql
    - scaling
    - performance
    - guide
---

## Overview

Read replicas are copies of your primary database that handle read-only queries. They are the simplest and most cost-effective way to scale read-heavy database workloads. By offloading SELECT queries to replicas, you reduce load on the primary, improve response times, and increase availability.

This guide covers replication setup, query routing, replication lag management, and operational best practices.

## When to Use

- Read queries exceed 80% of your database workload
- Analytical queries (reports, aggregations) slow down transactional writes
- You need read scaling beyond what a single instance can provide
- You want geographic read distribution (replicas in multiple regions)
- You need a hot standby for failover without dedicated standby hardware
- Your working set fits in memory but query volume exceeds CPU capacity

## When NOT to Use

- Your workload is write-heavy (>50% writes) — replicas do not help write scaling
- You require strongly consistent reads immediately after writes — replication lag may violate this
- Your queries are already CPU-bound on the replica — adding more replicas is better than bigger ones
- You have not optimized queries and indexes on the primary — fix those first

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Primary (Master)** | The database instance that accepts writes |
| **Replica (Slave)** | A database instance that replicates data from the primary |
| **Replication Lag** | Delay between a write on the primary and its appearance on the replica |
| **Streaming Replication** | Continuous transfer of WAL (PostgreSQL) or binlog (MySQL) |
| **Logical Replication** | Row-level replication with filtering (PostgreSQL 10+) |
| **Promotion** | Converting a replica into the new primary during failover |

## Read Replica Architecture

```
         Writes + Critical Reads
              │
         ┌────▼────┐
         │ Primary │
         │  (R/W)  │
         └────┬────┘
              │ WAL / Binlog
      ┌───────┼───────┐
      │       │       │
   ┌──▼──┐ ┌─▼───┐ ┌─▼───┐
   │Repl │ │Repl │ │Repl │
   │  1  │ │  2  │ │  3  │
   └──┬──┘ └──┬──┘ └──┬──┘
      │       │       │
      └───────┼───────┘
              │
         Read Queries
```

## Step-by-Step Read Replica Setup

### 1. Configure Streaming Replication

Set up physical streaming replication for near-real-time copies:

```ini
# postgresql.conf (Primary)
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/archive/%f'
hot_standby = on
```

```ini
# postgresql.conf (Replica)
hot_standby = on
hot_standby_feedback = on
max_standby_streaming_delay = 30s
```

```bash
# pg_hba.conf (Primary): Allow replication connections
host replication replicator 192.168.1.0/24 scram-sha-256
```

```bash
# Initialize replica with base backup
pg_basebackup -h primary-host -D /var/lib/postgresql/data -U replicator -P -v -R
```

```ini
# my.cnf (MySQL Primary)
[mysqld]
server-id = 1
log_bin = /var/log/mysql/mysql-bin
binlog_format = ROW
expire_logs_days = 7
max_binlog_size = 500M
```

```ini
# my.cnf (MySQL Replica)
[mysqld]
server-id = 2
relay_log = /var/log/mysql/mysql-relay-bin
log_bin = /var/log/mysql/mysql-bin
read_only = 1
```

```sql
-- MySQL: Configure replication on replica
CHANGE REPLICATION SOURCE TO
    SOURCE_HOST='primary-host',
    SOURCE_USER='replicator',
    SOURCE_PASSWORD='password',
    SOURCE_LOG_FILE='mysql-bin.000001',
    SOURCE_LOG_POS=0;

START REPLICA;
```

### 2. Route Reads to Replicas

Direct read queries to replicas while keeping writes on the primary:

```python
# Example: Python with read/write splitting
import psycopg2
from contextlib import contextmanager

# Connection pools
primary_pool = psycopg2.pool.ThreadedConnectionPool(1, 10, dsn="dbname=app primary")
replica_pool = psycopg2.pool.ThreadedConnectionPool(1, 10, dsn="dbname=app replica")

@contextmanager
def get_db_connection(read_only=False):
    """Get connection: primary for writes, replica for reads."""
    pool = replica_pool if read_only else primary_pool
    conn = pool.getconn()
    try:
        yield conn
    finally:
        pool.putconn(conn)

# Usage
def get_user(user_id):
    with get_db_connection(read_only=True) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        return cursor.fetchone()

def update_user(user_id, data):
    with get_db_connection(read_only=False) as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET name = %s WHERE id = %s", (data['name'], user_id))
        conn.commit()
```

```java
// Example: Spring Boot with read/write routing
@Configuration
public class DataSourceConfig {
    
    @Bean
    public DataSource routingDataSource(
            @Qualifier("primaryDataSource") DataSource primary,
            @Qualifier("replicaDataSource") DataSource replica) {
        
        ReplicationRoutingDataSource routing = new ReplicationRoutingDataSource();
        Map<Object, Object> targets = new HashMap<>();
        targets.put("primary", primary);
        targets.put("replica", replica);
        routing.setTargetDataSources(targets);
        routing.setDefaultTargetDataSource(primary);
        return routing;
    }
}

// Transactional annotation determines routing
@Service
public class UserService {
    
    @Transactional(readOnly = true)
    public User getUser(String id) {
        return userRepository.findById(id).orElseThrow();
    }
    
    @Transactional
    public User updateUser(User user) {
        return userRepository.save(user);
    }
}
```

**Routing strategies:**

| Strategy | Implementation | Best For |
|----------|---------------|----------|
| **Connection pool splitting** | Separate pools for primary and replica | Simple applications |
| **Proxy-based** | PgBouncer, ProxySQL, HAProxy | Zero application changes |
| **ORM integration** | Django database routers, Spring AbstractRoutingDataSource | Framework-based apps |
| **DNS-based** | Separate endpoints (primary.db, replica.db) | Microservices |

### 3. Handle Replication Lag

Replication lag is the primary challenge with read replicas:

```python
# Example: Lag-aware routing
import time

class LagAwareRouter:
    def __init__(self, primary, replica, max_lag_seconds=5):
        self.primary = primary
        self.replica = replica
        self.max_lag = max_lag_seconds
    
    def get_replica_lag(self):
        """Check current replication lag in seconds."""
        cursor = self.replica.cursor()
        cursor.execute("""
            SELECT 
                EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))
            AS lag_seconds
        """)
        return cursor.fetchone()[0] or 0
    
    def route_query(self, query, requires_freshness=False):
        """Route to replica if lag is acceptable and freshness not required."""
        if requires_freshness:
            return self.primary
        
        lag = self.get_replica_lag()
        if lag > self.max_lag:
            # Fallback to primary if replica is too far behind
            return self.primary
        
        return self.replica

# Usage: Force primary for user-modified data
user = router.route_query("SELECT * FROM users WHERE id = %s", 
                          requires_freshness=True)
```

```sql
-- PostgreSQL: Monitor replication lag
SELECT 
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    pg_size_pretty(pg_wal_lsn_diff(sent_lsn, replay_lsn)) as lag
FROM pg_stat_replication;

-- MySQL: Monitor replication lag
SHOW REPLICA STATUS\G
-- Look for: Seconds_Behind_Source
```

**Strategies for handling lag:**

| Approach | How It Works | Trade-off |
|----------|--------------|-----------|
| **Session stickiness** | Read from primary after a write in the same session | Slightly more primary load |
| **Lag threshold** | Route to primary if lag exceeds X seconds | Simple, but can spike primary load |
| **Eventual consistency** | Accept stale reads, document it | Best performance, but user-facing inconsistency |
| **Read-after-write redirect** | Track recently modified keys, route those to primary | Complex, requires application logic |
| **Causal consistency** | Track LSN per session, wait for replica to catch up | PostgreSQL 14+ logical replication |

### 4. Set Up Monitoring and Alerting

Track replica health and lag:

```yaml
# Example: Prometheus rules for replication monitoring
groups:
  - name: replication_alerts
    rules:
      - alert: HighReplicationLag
        expr: |
          pg_stat_replication_pg_wal_lsn_diff / 1024 / 1024 > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Replication lag exceeds 100MB"

      - alert: ReplicationStopped
        expr: |
          pg_stat_replication_state == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Replication has stopped"

      - alert: ReplicaLagSeconds
        expr: |
          mysql_slave_lag_seconds > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MySQL replica lag > 10 seconds"
```

**Key metrics to monitor:**
- **Lag in bytes/seconds:** How far behind is the replica?
- **Replication state:** Is replication running, paused, or stopped?
- **Lag trend:** Is lag increasing (indicates replica cannot keep up)?
- **Query latency on replica:** Are reads still fast?
- **Connection count:** Is the replica at connection capacity?

### 5. Plan for Failover

When the primary fails, promote a replica:

```bash
# PostgreSQL: Manual promotion
pg_ctl promote -D /var/lib/postgresql/data

# Or using repmgr (automated failover tool)
repmgr standby promote
```

```bash
# MySQL: Promote replica to primary
STOP REPLICA;
RESET REPLICA ALL;
SET GLOBAL read_only = OFF;
```

**Failover approaches:**

| Approach | RTO | Complexity | Best For |
|----------|-----|------------|----------|
| **Manual promotion** | 5-30 min | Low | Small teams, non-critical systems |
| **Automated tools** | 30-120s | Medium | repmgr, Patroni, orchestrator |
| **Managed service** | 0-60s | None | RDS Multi-AZ, Cloud SQL HA |
| **Synchronous replication** | 0s (no data loss) | High | Financial systems (trade latency for safety) |

## Best Practices

- **Start with one replica.** One well-configured replica solves 80% of read scaling needs.
- **Use replicas for reporting and analytics.** Isolate expensive queries from the primary.
- **Monitor lag relentlessly.** Lag that grows unchecked indicates the replica cannot keep up.
- **Test failover before you need it.** Promote a replica in staging quarterly.
- **Keep replica hardware equal to primary.** A slower replica creates lag during peak load.
- **Use connection pooling on replicas too.** Replicas have the same connection limits as primaries.

## Common Mistakes

- **Routing all reads to replicas.** Session state, recently modified data, and critical reads should stay on the primary.
- **Ignoring replication lag.** Users see stale data and report "bugs" that are actually lag.
- **Single replica with no failover plan.** If the replica fails, your read capacity drops to zero.
- **Running writes on replicas.** Accidental writes break replication and require re-initialization.
- **No lag monitoring.** You only discover lag problems when users complain.
- **Using replicas for write scaling.** Replicas only scale reads. For write scaling, consider sharding or partitioning.

## Variants

- **Cascade replication:** Replica → Replica → Replica for geographic distribution
- **Multi-primary (master-master):** Writes accepted on multiple nodes — complex, use with caution
- **Logical replication:** Selective table/column replication (PostgreSQL 10+, MySQL binlog filtering)
- **Read replicas in different regions:** Cloud provider managed replicas for global latency reduction
- **Delayed replica:** Replica intentionally lagging by hours for point-in-time recovery

## FAQ

**Q: How much lag is acceptable?**
For most applications, <1 second is ideal, <5 seconds is acceptable. Analytics workloads can tolerate minutes. Financial systems may require synchronous replication (zero lag).

**Q: Can I write to a read replica?**
No — replicas are read-only by design. Some systems (MySQL Group Replication, PostgreSQL multi-master extensions) allow multi-master writes, but they add significant complexity.

**Q: How many replicas can I have?**
PostgreSQL supports up to ~10 streaming replicas before WAL sender overhead becomes significant. For more, use cascading replicas (replica of a replica) or logical replication.

**Q: Do I need replicas if I use caching?**
Yes — caching and replicas complement each other. Cache handles hot data; replicas handle cache misses and analytical queries.

## Conclusion

Read replicas are the simplest way to scale database reads. By configuring streaming replication, routing queries intelligently, and monitoring lag, you can handle 10x read growth without changing your data model or application architecture significantly.
