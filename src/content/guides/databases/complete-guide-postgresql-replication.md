---
contentType: guides
slug: complete-guide-postgresql-replication
title: "Complete Guide to PostgreSQL Replication"
description: "Master PostgreSQL replication. Covers streaming replication, logical replication, cascading replicas, synchronous commit, failover with Patroni, monitoring lag, slot management, and disaster recovery with practical configuration examples."
metaDescription: "Master PostgreSQL replication. Covers streaming, logical, cascading replicas, synchronous commit, Patroni failover, lag monitoring, slots, DR."
difficulty: advanced
topics:
  - databases
  - infrastructure
  - devops
tags:
  - postgresql
  - databases
  - guide
  - replication
  - streaming-replication
  - logical-replication
  - patroni
  - failover
relatedResources:
  - /guides/databases/complete-guide-sql-query-optimization
  - /guides/databases/complete-guide-database-sharding
  - /guides/databases/complete-guide-redis-production
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Master PostgreSQL replication. Covers streaming, logical, cascading replicas, synchronous commit, Patroni failover, lag monitoring, slots, DR."
  keywords:
    - postgresql replication
    - streaming replication
    - logical replication
    - cascading replicas
    - patroni failover
    - replication slots
    - synchronous commit
    - disaster recovery
---

## Introduction

PostgreSQL replication copies data from a primary server to one or more replica servers. Streaming replication sends WAL records in real time. Logical replication decodes WAL into logical changes and publishes them to subscribers. The following guide covers both modes, cascading replicas, failover, monitoring, and disaster recovery.

## Streaming Replication

Streaming replication sends WAL (Write-Ahead Log) records from the primary to replicas in real time. Replicas apply WAL records to stay in sync.

### Primary Configuration

```bash
# postgresql.conf (primary)
listen_addresses = '*'
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
wal_keep_size = 1024        # MB of WAL to retain
hot_standby = on

# Synchronous replication (optional)
synchronous_standby_names = 'replica1'
synchronous_commit = on
```

```sql
-- Create replication role
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'secure_password';

-- Allow replication connections in pg_hba.conf
-- host replication replicator 192.168.1.0/24 md5
```

```bash
# pg_hba.conf (primary)
host replication replicator 192.168.1.0/24 md5
host all all 192.168.1.0/24 md5
```

### Replica Setup

```bash
# 1. Stop PostgreSQL on replica
pg_ctl stop -D /var/lib/postgresql/data

# 2. Clear data directory
rm -rf /var/lib/postgresql/data/*

# 3. Base backup from primary
pg_basebackup \
  -h primary.example.com \
  -U replicator \
  -D /var/lib/postgresql/data \
  -Fp -Xs -P -R

# The -R flag creates standby.signal and configures primary_conninfo

# 4. Start PostgreSQL on replica
pg_ctl start -D /var/lib/postgresql/data
```

```bash
# postgresql.conf (replica)
hot_standby = on
primary_conninfo = 'host=primary.example.com port=5432 user=replicator password=secure_password'
restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
archive_cleanup_command = 'pg_archivecleanup /var/lib/postgresql/wal_archive %p'

# Optional: replication slot to prevent WAL removal
primary_slot_name = 'replica1_slot'
```

```sql
-- Create replication slot on primary (optional but recommended)
SELECT pg_create_physical_replication_slot('replica1_slot');
```

### Verify Replication

```sql
-- On primary: check replication status
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  sync_state,
  sent_lsn,
  write_lsn,
  flush_lsn,
  replay_lsn,
  sent_lsn - replay_lsn AS replication_lag
FROM pg_stat_replication;

-- On replica: check receiver status
SELECT
  pid,
  status,
  receive_start_lsn,
  receive_start_tli,
  latest_end_lsn,
  latest_end_time
FROM pg_stat_wal_receiver;

-- On replica: check if in recovery
SELECT pg_is_in_recovery();
```

## Cascading Replication

Cascading replicas connect to another replica instead of the primary. This reduces load on the primary when you have many replicas.

```text
Primary
  ├── Replica 1 (upstream)
  │     ├── Replica 2 (cascading from Replica 1)
  │     └── Replica 3 (cascading from Replica 1)
  └── Replica 4 (direct)
```

```bash
# postgresql.conf on Replica 1 — allow cascading
wal_level = replica
max_wal_senders = 5

# pg_hba.conf on Replica 1 — allow replication connections
host replication replicator 192.168.1.0/24 md5

# postgresql.conf on Replica 2 — connect to Replica 1
primary_conninfo = 'host=replica1.example.com port=5432 user=replicator password=secure_password'
```

```sql
-- On Replica 1: check cascading status
SELECT * FROM pg_stat_replication;
-- Shows Replica 2 and Replica 3 connected to Replica 1
```

## Logical Replication

Logical replication decodes WAL records into logical change events (INSERT, UPDATE, DELETE). It allows selective table replication, cross-version replication, and replication between different databases.

### Publisher Configuration

```sql
-- On publisher (source database)
-- Set wal_level to logical
ALTER SYSTEM SET wal_level = 'logical';
ALTER SYSTEM SET max_replication_slots = 10;
ALTER SYSTEM SET max_logical_replication_workers = 4;
-- Reload configuration
SELECT pg_reload_conf();

-- Create publication
CREATE PUBLICATION my_publication FOR TABLE users, orders, products;

-- Publication with all tables
CREATE PUBLICATION all_tables FOR ALL TABLES;

-- Publication with specific operations
CREATE PUBLICATION insert_only FOR TABLE users WITH (publish = 'insert');

-- Add or remove tables from publication
ALTER PUBLICATION my_publication ADD TABLE new_table;
ALTER PUBLICATION my_publication DROP TABLE old_table;
```

### Subscriber Configuration

```sql
-- On subscriber (target database)
-- Tables must exist with same schema
CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT, email TEXT);
CREATE TABLE orders (id SERIAL PRIMARY KEY, user_id INT, total DECIMAL);

-- Create subscription
CREATE SUBSCRIPTION my_subscription
  CONNECTION 'host=publisher.example.com port=5432 user=replicator password=secure_password dbname=mydb'
  PUBLICATION my_publication;

-- With specific options
CREATE SUBSCRIPTION my_subscription
  CONNECTION 'host=publisher.example.com port=5432 user=replicator password=secure_password dbname=mydb'
  PUBLICATION my_publication
  WITH (
    copy_data = true,           -- Copy existing data on start
    create_slot = true,         -- Create replication slot
    slot_name = 'my_sub_slot',
    synchronous_commit = off    -- Async for better performance
  );

-- Refresh subscription (pick up new tables)
ALTER SUBSCRIPTION my_subscription REFRESH PUBLICATION;
```

### Logical Replication Limitations

```text
What logical replication DOES NOT replicate:
  - Schema changes (DDL) — must be applied manually on both sides
  - Sequences — can cause primary key conflicts
  - TRUNCATE operations (unless explicitly published)
  - Large objects (bytea is fine, but lo_* functions are not replicated)
  - TEMPORARY tables
  - System catalog changes

Common gotchas:
  - Primary key required on all replicated tables
  - No replication of data types without a binary send/recv function
  - Conflict resolution is manual — subscriber stops on conflict
  - DDL must be coordinated manually between publisher and subscriber
```

## Synchronous Replication

Synchronous replication ensures a transaction is confirmed only after the replica has written the WAL record. This guarantees no data loss on failover.

```bash
# postgresql.conf (primary)
synchronous_standby_names = 'FIRST 2 (replica1, replica2, replica3)'
# Wait for at least 2 replicas to confirm

synchronous_standby_names = 'ANY 2 (replica1, replica2, replica3)'
# Wait for any 2 of the listed replicas

synchronous_standby_names = 'replica1'
# Wait for replica1 specifically

synchronous_commit = on
# Options: on, off, local, remote_write, remote_apply
```

```text
synchronous_commit options:
  off          — No sync, fastest, possible data loss
  local        — Sync to local WAL only
  on           — Sync to local WAL + wait for replica flush
  remote_write — Wait for replica to write (not flush) WAL
  remote_apply — Wait for replica to apply WAL (slowest, most consistent)
```

## Failover with Patroni

Patroni manages automatic failover for PostgreSQL clusters. It uses etcd or Consul for distributed configuration.

```yaml
# patroni.yml
scope: my_cluster
name: node1

restapi:
  listen: 0.0.0.0:8008
  connect_address: 192.168.1.10:8008

etcd:
  hosts: 192.168.1.100:2379,192.168.1.101:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576  # 1MB
    synchronous: true
    postgresql:
      use_pg_rewind: true
      parameters:
        wal_level: replica
        hot_standby: on
        max_wal_senders: 10
        max_replication_slots: 10
        wal_keep_size: 1024

postgresql:
  listen: 0.0.0.0:5432
  connect_address: 192.168.1.10:5432
  data_dir: /var/lib/postgresql/data
  bin_dir: /usr/lib/postgresql/bin
  authentication:
    replication:
      username: replicator
      password: secure_password
    superuser:
      username: postgres
      password: super_secure_password
  parameters:
    wal_level: replica
    hot_standby: on

tags:
  nofailover: false
  noloadbalance: false
  clonefrom: false
  nosync: false
```

```bash
# Start Patroni on each node
patroni /etc/patroni/patroni.yml

# Check cluster status
patronictl list
# + Cluster: my_cluster (700123) --+---------+----+-----------+
# | Member | Host          | Role    | State   | TL | Lag in MB |
# |--------|---------------|---------|---------|----|-----------|
# | node1  | 192.168.1.10  | Leader  | running |  5 |           |
# | node2  | 192.168.1.11  | Replica | streaming|  5 |         0 |
# | node3  | 192.168.1.12  | Replica | streaming|  5 |         0 |

# Manual switchover
patronictl switchover my_cluster

# Manual failover
patronictl failover my_cluster

# Reinitialize a failed node
patronictl reinit my_cluster node2
```

## Monitoring Replication Lag

```sql
-- Check replication lag in bytes
SELECT
  client_addr,
  state,
  sent_lsn,
  replay_lsn,
  pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes,
  pg_wal_lsn_diff(sent_lsn, replay_lsn) / 1024 / 1024 AS lag_mb
FROM pg_stat_replication;

-- Check replication lag in seconds
SELECT
  client_addr,
  EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) AS lag_seconds
FROM pg_stat_replication;

-- On replica: check last replayed WAL
SELECT pg_last_wal_replay_lsn();
SELECT pg_last_xact_replay_timestamp();

-- Check WAL receiver status
SELECT status, latest_end_lsn, latest_end_time FROM pg_stat_wal_receiver;

-- Check replication slots
SELECT
  slot_name,
  plugin,
  slot_type,
  active,
  restart_lsn,
  pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS retained_bytes
FROM pg_replication_slots;
```

```bash
# Monitor WAL generation rate
pg_waldump --stats /var/lib/postgresql/data/pg_wal/000000010000000000000003

# Check archive status
SELECT * FROM pg_stat_archiver;
```

## Replication Slot Management

Replication slots ensure the primary retains WAL until the replica has consumed it. Without slots, the primary may remove WAL that a slow replica still needs.

```sql
-- Create physical replication slot
SELECT pg_create_physical_replication_slot('replica1_slot');

-- Create logical replication slot
SELECT pg_create_logical_replication_slot('my_slot', 'test_decoding');

-- Drop replication slot (must be inactive)
SELECT pg_drop_replication_slot('replica1_slot');

-- Check slot status
SELECT
  slot_name,
  slot_type,
  active,
  restart_lsn,
  wal_status,
  pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS lag_bytes
FROM pg_replication_slots;

-- Advance a logical slot manually (skip transactions)
SELECT pg_replication_slot_advance('my_slot', '0/2000000');
```

```text
wal_status values:
  reserved  — WAL is available, within wal_keep_size
  extended  — WAL is being retained beyond wal_keep_size for this slot
  unreserved — WAL will be removed soon, slot may fall behind
  lost      — WAL has been removed, slot is broken and must be dropped
```

## Disaster Recovery

```bash
# Point-in-time recovery (PITR)
# postgresql.conf (primary)
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/wal_archive/%f && cp %p /var/lib/postgresql/wal_archive/%f'

# On recovery server
# recovery.signal file
touch /var/lib/postgresql/data/recovery.signal

# postgresql.conf or recovery.conf
restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
recovery_target_time = '2026-07-04 15:30:00'
recovery_target_action = 'promote'
recovery_target_inclusive = true
```

```sql
-- After recovery, check timeline
SELECT timeline_id FROM pg_control_checkpoint();

-- Create new timeline to avoid conflicts
-- This happens automatically when recovery_target_action = 'promote'
```

## FAQ

### What is the difference between streaming and logical replication?

Streaming replication sends raw WAL bytes from primary to replica. The replica is a byte-for-byte copy of the primary. It requires the same PostgreSQL major version and OS architecture. Logical replication decodes WAL into logical change events (INSERT, UPDATE, DELETE) and publishes them to subscribers. It supports selective table replication, cross-version replication, and replication to different databases. Use streaming for HA and read replicas. Use logical for data integration, upgrades, and selective replication.

### When should I use synchronous vs asynchronous replication?

Use synchronous replication when data loss is unacceptable — financial systems, healthcare, critical applications. The trade-off is higher write latency because each transaction waits for replica confirmation. Use asynchronous replication when performance is more important than zero data loss — analytics, reporting, caching layers. With asynchronous, you may lose the last few transactions on failover. Configure with `synchronous_standby_names` and `synchronous_commit`.

### How do I handle replication conflicts?

Replication conflicts occur when a query on the replica conflicts with WAL replay. Common causes: long-running queries on replica while primary deletes or locks rows. Solutions: set `max_standby_streaming_delay` to allow WAL replay to wait, set `max_standby_archive_delay` for archive recovery, or use `hot_standby_feedback = on` to let the replica tell the primary about running queries. For logical replication conflicts (primary key violations), you must manually resolve the conflicting row and restart the subscription.

### What is a replication slot and why do I need it?

A replication slot ensures the primary retains WAL files until the replica has consumed them. Without a slot, the primary may remove old WAL files to free disk space, causing the replica to fall behind and require a full base backup. Slots are especially important for replicas with intermittent connectivity or logical subscribers. Monitor `pg_replication_slots` for `wal_status = 'lost'` which means the slot is broken. Drop unused slots to prevent WAL accumulation.

### How does Patroni handle failover?

Patroni monitors the primary via the DCS (etcd/Consul). If the primary becomes unreachable, Patroni updates the DCS lock. The replica with the least replication lag is promoted to primary. Other replicas reconnect to the new primary. The old primary, when it recovers, is reconfigured as a replica. Patroni uses pg_rewind to resync the old primary without a full base backup. The typical failover time is 10-30 seconds depending on configuration and network.

### Can I replicate between different PostgreSQL versions?

For streaming replication, both primary and replica must run the same major version (e.g., both 16.x). You cannot stream from 15 to 16. For logical replication, you can replicate between different major versions — this is the recommended approach for major version upgrades. Set up logical replication from the old version to the new version, let them sync, then switch the application to the new version. This is called a "logical replication upgrade" and has near-zero downtime.
