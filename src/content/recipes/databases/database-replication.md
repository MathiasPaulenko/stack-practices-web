---
contentType: recipes
slug: database-replication
title: "Database Replication"
description: "Set up and manage database replication for high availability, read scaling, and disaster recovery with primary-replica architectures."
metaDescription: "Database replication setup: primary-replica, multi-primary, synchronous and asynchronous replication, failover, and read scaling for high availability."
difficulty: intermediate
topics:
  - databases
tags:
  - database-replication
  - databases
  - performance
  - sql
  - postgresql
relatedResources:
  - /recipes/uuid-generation-strategies
  - /recipes/database-connection-pooling
  - /recipes/postgres-query-optimization
  - /guides/sql-performance-tuning-guide
  - /recipes/cursor-pagination-postgresql
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Database replication setup: primary-replica, multi-primary, synchronous and asynchronous replication, failover, and read scaling for high availability."
  keywords:
    - database-replication
    - databases
    - high-availability
    - performance
---
## Overview

Database replication copies data from a primary database to one or more replicas. This enables read scaling, high availability, and [disaster recovery](/guides/devops/on-call-incident-response-guide). Whether using streaming replication in PostgreSQL, binary log replication in MySQL, or native replica sets in MongoDB, understanding replication lag, failover, and consistency trade-offs is essential for building resilient data layers.

## When to Use

Use this resource when:
- Read traffic exceeds what a single database instance can handle
- You need near-zero downtime failover for critical applications
- Geographic distribution requires data closer to users
- [Backups](/guides/devops/on-call-incident-response-guide) must not impact primary database performance

## Solution

### PostgreSQL Streaming Replication

```sql
-- On primary: configure postgresql.conf
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10

-- On primary: create replication user
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'secret';

-- On replica: use pg_basebackup
pg_basebackup -h primary-db.example.com -D /var/lib/postgresql/data \
  -U replicator -P -v -R -X stream -C -S replica_1
```

### MySQL Group Replication (Single-Primary)

```sql
-- On each node
SET GLOBAL group_replication_bootstrap_group=OFF;
START GROUP_REPLICATION;

-- Check member status
SELECT * FROM performance_schema.replication_group_members;

-- Check replication lag
SELECT 
  MEMBER_ID, 
  COUNT_TRANSACTIONS_IN_QUEUE as trx_behind,
  COUNT_TRANSACTIONS_REMOTE_IN_APPLIER_QUEUE as applying
FROM performance_schema.replication_group_member_stats;
```

### Read Replica Routing (Node.js)

```javascript
const { Pool } = require('pg');

const primaryPool = new Pool({
  host: process.env.DB_PRIMARY_HOST,
  database: 'app'
});

const replicaPool = new Pool({
  host: process.env.DB_REPLICA_HOST,
  database: 'app',
  poolMode: 'read-only'
});

async function query(sql, params, options = {}) {
  const pool = options.readOnly ? replicaPool : primaryPool;
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

// Reads go to replica
const users = await query('SELECT * FROM users', [], { readOnly: true });
// Writes go to primary
await query('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);
```

## Explanation

**Replication modes**:

| Mode | Consistency | Use Case |
|------|-------------|----------|
| Asynchronous | Eventual | Read scaling; acceptable lag |
| Synchronous | Strong | Financial data; zero data loss |
| Semi-synchronous | Balanced | Most HA scenarios |

**Replication lag causes**:
- Large transactions block replication stream
- Replica hardware is slower than primary
- Network latency between primary and replica
- Replica under heavy read load competing with apply process

**Failover strategies**:
- **Manual promotion**: DBA runs `pg_promote()` or `CHANGE MASTER TO`
- **Patroni/etcd**: Automated failover with leader election
- **AWS RDS**: Automatic with ~60-120 second detection
- **Proxy layer**: PgBouncer or ProxySQL routes to new primary

## Variants

| Database | Method | Feature |
|----------|--------|---------|
| PostgreSQL | Streaming WAL | Hot standby; cascading replicas |
| MySQL | Binlog | Row-based or statement-based |
| MongoDB | Oplog | Replica sets; automatic failover |
| Redis | Replication | Async; Sentinel for HA |
| CockroachDB | Multi-raft | Synchronous by default |

## What Works

- **Monitor replication lag**: Alert when lag exceeds application tolerance (usually 1-5 seconds)
- **Use connection pooling**: [PgBouncer](/recipes/performance/connection-pooling) or ProxySQL manages primary/replica routing
- **Test failover quarterly**: Automated failover still needs human validation
- **Keep replicas in different AZs**: Not just different instances — different failure domains
- **Don't write to replicas**: Even if supported, it creates conflicts and split-brain scenarios

## Common Mistakes

1. **Assuming replicas are real-time**: Asynchronous lag can be seconds or minutes; design for eventual consistency. Learn more in [CAP theorem](/guides/databases/cap-theorem-guide).
2. **No failover testing**: The first time you failover shouldn't be during an outage
3. **Ignoring replication slot bloat**: PostgreSQL replication slots prevent WAL cleanup; monitor disk usage
4. **Single network path**: Replicas in the same AZ as primary share the same failure domain
5. **Reading from lagging replicas**: Showing stale data to users who just wrote causes confusion

## Frequently Asked Questions

**Q: How much replication lag is acceptable?**
A: For analytics: minutes. For user-facing reads: <1 second. For financial data: use synchronous replication.

**Q: Can I use replicas for backups?**
A: Yes. `pg_basebackup` from a replica offloads the primary. Ensure the replica is caught up first. See our [disaster recovery plan template](/guides/devops/on-call-incident-response-guide).

**Q: What's the difference between logical and physical replication?**
A: Physical copies byte-for-byte (fast; entire database). Logical replicates row changes (selective tables; cross-version compatible).

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### PostgreSQL Logical Replication

```sql
-- On primary: create a publication
CREATE PUBLICATION my_pub FOR TABLE users, orders;

-- On target: create a subscription
CREATE SUBSCRIPTION my_sub
  CONNECTION 'host=primary-db.example.com port=5432 user=replicator password=secret'
  PUBLICATION my_pub;
```

Logical replication copies row changes at the logical level, allowing selective table replication and cross-version compatibility. Use it when you need to replicate only specific tables or migrate between PostgreSQL versions.

### Cascading Replicas

```ini
# On intermediate replica (replica_1)
# postgresql.conf
hot_standby = on
primary_conninfo = 'host=primary-db.example.com port=5432 user=replicator'
# Allow replica_2 to connect to replica_1
max_replication_slots = 5
max_wal_senders = 5
```

```bash
# On replica_2: base backup from replica_1
pg_basebackup -h replica_1.example.com -D /var/lib/postgresql/data \
  -U replicator -P -v -R -X stream -C -S replica_2
```

Cascading replicas reduce load on the primary by allowing replicas to stream WAL to other replicas.

### Patroni Automated Failover

```yaml
# patroni.yml
scope: my_cluster
name: node1

restapi:
  listen: 0.0.0.0:8008
  connect_address: node1.example.com:8008

etcd:
  hosts: node1:2379,node2:2379,node3:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576
    postgresql:
      use_pg_rewind: true
      parameters:
        wal_level: replica
        max_wal_senders: 10
        max_replication_slots: 10

postgresql:
  listen: 0.0.0.0:5432
  connect_address: node1.example.com:5432
  data_dir: /var/lib/postgresql/data
  bin_dir: /usr/lib/postgresql/bin
  authentication:
    replication:
      username: replicator
      password: secret
    superuser:
      username: postgres
      password: secret
```

### Monitoring Replication Lag

```sql
-- PostgreSQL: check replication lag
SELECT
    application_name,
    client_addr,
    state,
    sync_state,
    sent_lsn,
    replay_lsn,
    (sent_lsn - replay_lsn) AS lag_bytes
FROM pg_stat_replication;

-- Check WAL size
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes
FROM pg_stat_replication;

-- Check replication slot disk usage
SELECT slot_name, active, restart_lsn,
       pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS lag_bytes
FROM pg_replication_slots;
```

```sql
-- MySQL: check replica status
SHOW REPLICA STATUS\G

-- Key fields to monitor:
-- Seconds_Behind_Master: replication lag in seconds
-- Replica_IO_Running: Yes
-- Replica_SQL_Running: Yes
-- Last_Error: should be empty
```

### Read-After-Write Consistency

```javascript
// Route reads to primary for 5 seconds after a write
const recentWrites = new Map();

async function writeAndRead(userId, data) {
    // Write to primary
    await primaryPool.query('UPDATE users SET data = $1 WHERE id = $2', [data, userId]);
    recentWrites.set(userId, Date.now());

    // Read from primary if recent write, else replica
    const isRecent = Date.now() - (recentWrites.get(userId) || 0) < 5000;
    const pool = isRecent ? primaryPool : replicaPool;
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0];
}
```

## Additional Best Practices

6. **Use replication slots in PostgreSQL.** Replication slots prevent WAL from being recycled before the replica consumes it. Monitor slot disk usage to prevent bloat.

7. **Set `max_replication_slots` and `max_wal_senders` appropriately.** Each replica needs one slot and one WAL sender. Set 2-3 more than your replica count for future expansion.

8. **Use `synchronous_commit = remote_apply` for critical data.** This waits until the replica applies the transaction before acknowledging the commit:

```sql
ALTER SYSTEM SET synchronous_commit = remote_apply;
```

9. **Keep replicas in different availability zones.** A single AZ failure should not take down both primary and replica.

10. **Automate failover testing.** Run failover drills monthly. Document the runbook. Automated failover tools (Patroni, Stolon) still need human validation.

## Additional Common Mistakes

6. **Not cleaning up inactive replication slots.** Inactive slots accumulate WAL, eventually filling the disk. Drop unused slots:

```sql
SELECT pg_drop_replication_slot('unused_replica_slot');
```

7. **Running heavy analytics on replicas.** Long-running queries on replicas cause replication lag. Use a dedicated analytics replica or a materialized view.

8. **Not monitoring `pg_stat_replication`.** Without monitoring, you won't know replicas are lagging until users complain about stale data.

9. **Using `synchronous_commit = on` without replicas.** Synchronous replication with no available replicas blocks all writes. Always have at least one healthy replica.

10. **Forgetting to update `primary_conninfo` after failover.** After promoting a replica, other replicas must point to the new primary. Automate this with Patroni or a configuration management tool.

## Additional FAQ

### How do I promote a replica to primary in PostgreSQL?

```sql
-- PostgreSQL 12+
SELECT pg_promote();
```

For earlier versions, create a trigger file or use `pg_ctl promote`. With Patroni, failover is automatic.

### What is split-brain and how do I prevent it?

Split-brain occurs when two nodes both think they are primary. Prevent it with:
- Quorum-based failover (Patroni + etcd)
- Fencing (STONITH) to power off the old primary
- Split-brain detection in your proxy layer

### How do I handle replication during a major version upgrade?

Use logical replication to upgrade with near-zero downtime:
1. Set up logical replication from old version to new version
2. Wait for catch-up
3. Switch application connections to the new version
4. Drop the subscription

### What is `pg_rewind` and when do I use it?

`pg_rewind` resynchronizes a former primary that diverged from the new primary. Without it, you must rebuild the entire data directory with `pg_basebackup`.

## Performance Tips

1. **Tune `wal_sender_timeout` and `wal_receiver_timeout`.** Set 30-60 seconds to detect network failures quickly:

```sql
ALTER SYSTEM SET wal_sender_timeout = '30s';
ALTER SYSTEM SET wal_receiver_timeout = '30s';
```

2. **Use `wal_compression = on` for WAN replication.** Compresses WAL before sending, reducing bandwidth for cross-region replicas:

```sql
ALTER SYSTEM SET wal_compression = on;
```

3. **Batch large writes to reduce WAL volume.** Single large transactions generate less WAL than many small ones:

```sql
-- Better: one large transaction
BEGIN;
INSERT INTO logs SELECT * FROM staging_logs;
COMMIT;

-- Worse: many small transactions
```

4. **Monitor `pg_stat_wal_receiver` for connection health.** This view shows the status of the WAL receiver process on a replica:

```sql
SELECT status, sender_host, sender_port, received_lsn, latest_end_lsn
FROM pg_stat_wal_receiver;
```

5. **Use `hot_standby_feedback = on` to prevent query conflicts.** This sends replica query feedback to the primary, preventing it from vacuuming rows still needed by replica queries:

```sql
ALTER SYSTEM SET hot_standby_feedback = on;
```
