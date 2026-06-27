---
contentType: guides
slug: database-replication-guide
title: "Database Replication — Master-Slave, Multi-Master, and Beyond"
description: "A practical guide to database replication strategies: master-slave, multi-master, synchronous vs asynchronous, and how to handle failover and conflict resolution."
metaDescription: "Learn database replication: master-slave, multi-master, synchronous vs async, failover, and conflict resolution. Practical guide for scalable systems."
difficulty: intermediate
topics:
  - databases
  - infrastructure
  - devops
tags:
  - database-replication
  - master-slave
  - multi-master
  - failover
  - conflict-resolution
  - high-availability
  - guide
relatedResources:
  - /guides/database-denormalization-guide
  - /guides/acid-vs-base-guide
  - /guides/indexing-strategies-guide
  - /guides/read-replica-guide
  - /recipes/databases/connect-to-postgresql
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Learn database replication: master-slave, multi-master, synchronous vs async, failover, and conflict resolution. Practical guide for scalable systems."
  keywords:
    - database-replication
    - master-slave
    - multi-master
    - failover
    - conflict-resolution
    - high-availability
    - guide
---

## Overview

Database replication is the process of copying and maintaining data across multiple database nodes. It provides high availability, read scaling, and disaster recovery. But replication introduces complexity: lag, conflicts, split-brain scenarios, and consistency trade-offs. This guide covers the replication strategies used in production, from simple master-slave setups to multi-master clusters.

## When to Use

- You need read scaling beyond what a single node can handle
- High availability requires automatic failover
- Disaster recovery needs off-site data copies
- You want to run analytics without impacting transactional workloads

## Master-Slave Replication

One primary node handles writes; replicas handle reads. The simplest and most common topology.

```
┌─────────┐     write     ┌─────────┐
│ Master  │───────────────▶│  Slave  │
│  (R+W)  │                │  (R)    │
└─────────┘                └─────────┘
      │                          │
      │         read             │
      └──────────────────────────┘
```

### Asynchronous Replication

The master commits locally, then sends changes to slaves. Low latency but potential data loss if master fails before slaves catch up.

```sql
-- MySQL
CHANGE MASTER TO
  MASTER_HOST='master_host',
  MASTER_USER='replica',
  MASTER_PASSWORD='password';
START SLAVE;

-- PostgreSQL (streaming replication)
-- Primary: wal_level = replica, max_wal_senders = 3
-- Standby: primary_conninfo = 'host=primary_host port=5432'
```

### Semi-Synchronous Replication

The master waits for at least one slave to acknowledge receipt before committing. Balances safety and performance.

```sql
-- MySQL
SET GLOBAL rpl_semi_sync_master_enabled = 1;
SET GLOBAL rpl_semi_sync_master_timeout = 10000;  -- 10 seconds
```

### Synchronous Replication

Master waits for all slaves to confirm the write. No data loss but higher latency.

```sql
-- PostgreSQL synchronous_commit
SET synchronous_commit = 'remote_apply';
SET synchronous_standby_names = 'replica1, replica2';
```

## Replication Lag

Lag is the delay between a write on the master and its appearance on replicas. Causes and mitigations:

| Cause | Mitigation |
|-------|------------|
| Network latency | Use nearby regions, compression |
| High write volume | Shard writes, add replicas |
| Large transactions | Break into smaller batches |
| Slow replica hardware | Match replica specs to master |
| Replica reads competing | Dedicated read replicas |

### Detecting Lag

```sql
-- PostgreSQL
SELECT
  now() - pg_last_xact_replay_timestamp() AS lag;

-- MySQL
SHOW SLAVE STATUS\G
-- Seconds_Behind_Master
```

## Multi-Master Replication

Multiple nodes accept writes. Complex but enables writes scaling and geographic distribution.

```
┌─────────┐◀──────────▶┌─────────┐
│ Master A│            │ Master B│
└─────────┘            └─────────┘
      │                      │
      ▼                      ▼
┌─────────┐            ┌─────────┐
│  Slave  │            │  Slave  │
└─────────┘            └─────────┘
```

### Conflict Scenarios

| Scenario | Conflict |
|----------|----------|
| Same key inserted | Primary key violation |
| Same row updated | Last-write-wins or merge |
| Row deleted on A, updated on B | Update wins or conflict flag |
| Auto-increment IDs | Duplicate IDs across masters |

### Conflict Resolution Strategies

1. **Last-write-wins** — timestamp or vector clock decides
2. **Merge** — application-specific logic combines changes
3. **Manual resolution** — flag conflicts for human review
4. **Avoidance** — partition data so each row has one master

## Failover

Switching to a replica when the master fails. Manual vs automatic:

### Manual Failover

```bash
# PostgreSQL: promote standby
pg_ctl promote -D /var/lib/postgresql/data

# MySQL: stop slave, reset, start
STOP SLAVE;
RESET SLAVE ALL;
```

### Automatic Failover (Patroni)

```yaml
# patroni.yml
scope: mycluster
restapi:
  listen: 0.0.0.0:8008
  connect_address: 10.0.0.1:8008
etcd:
  hosts: 10.0.0.10:2379,10.0.0.11:2379,10.0.0.12:2379
postgresql:
  data_dir: /var/lib/postgresql/data
  pg_hba:
    - host replication replicator 10.0.0.0/24 md5
```

## Read Replicas for Scaling

Route reads to replicas, writes to master. Application must handle replication lag.

```typescript
class DatabaseRouter {
  private master: Pool;
  private replicas: Pool[];
  private currentReplica = 0;

  getWritePool(): Pool {
    return this.master;
  }

  getReadPool(): Pool {
    // Round-robin across replicas
    const pool = this.replicas[this.currentReplica];
    this.currentReplica = (this.currentReplica + 1) % this.replicas.length;
    return pool;
  }
}

// Usage
const db = new DatabaseRouter();
await db.getWritePool().query('INSERT INTO ...');
const result = await db.getReadPool().query('SELECT ...');
```

## Common Mistakes

- **Ignoring replication lag** — reading immediately after writing sees stale data
- **Writing to replicas** — causes split-brain and data inconsistency
- **No failover automation** — minutes of manual work become hours of downtime
- **Monitoring only Seconds_Behind_Master** — lag can be zero while slave is still processing
- **Under-provisioned replicas** — replicas that cannot keep up with master throughput

## FAQ

**Does replication replace backups?**
No. Replication handles node failure, not data corruption, ransomware, or accidental deletion. Maintain separate backups.

**How do I handle schema changes?**
Use online schema change tools (pt-online-schema-change, gh-ost, or native online DDL) to avoid locking replicas.

**Can I replicate across cloud providers?**
Yes, but latency and egress costs increase. Consider logical replication for selective table sync.
