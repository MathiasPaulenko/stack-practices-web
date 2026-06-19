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

Database replication copies data from a primary database to one or more replicas. This enables read scaling, high availability, and disaster recovery. Whether using streaming replication in PostgreSQL, binary log replication in MySQL, or native replica sets in MongoDB, understanding replication lag, failover, and consistency trade-offs is essential for building resilient data layers.

## When to Use

Use this resource when:
- Read traffic exceeds what a single database instance can handle
- You need near-zero downtime failover for critical applications
- Geographic distribution requires data closer to users
- Backups must not impact primary database performance

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

## Best Practices

- **Monitor replication lag**: Alert when lag exceeds application tolerance (usually 1-5 seconds)
- **Use connection pooling**: PgBouncer or ProxySQL manages primary/replica routing
- **Test failover quarterly**: Automated failover still needs human validation
- **Keep replicas in different AZs**: Not just different instances — different failure domains
- **Don't write to replicas**: Even if supported, it creates conflicts and split-brain scenarios

## Common Mistakes

1. **Assuming replicas are real-time**: Asynchronous lag can be seconds or minutes; design for eventual consistency
2. **No failover testing**: The first time you failover shouldn't be during an outage
3. **Ignoring replication slot bloat**: PostgreSQL replication slots prevent WAL cleanup; monitor disk usage
4. **Single network path**: Replicas in the same AZ as primary share the same failure domain
5. **Reading from lagging replicas**: Showing stale data to users who just wrote causes confusion

## Frequently Asked Questions

**Q: How much replication lag is acceptable?**
A: For analytics: minutes. For user-facing reads: <1 second. For financial data: use synchronous replication.

**Q: Can I use replicas for backups?**
A: Yes. `pg_basebackup` from a replica offloads the primary. Ensure the replica is caught up first.

**Q: What's the difference between logical and physical replication?**
A: Physical copies byte-for-byte (fast; entire database). Logical replicates row changes (selective tables; cross-version compatible).
