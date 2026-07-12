---
contentType: guides
slug: complete-guide-postgresql-replication
title: "Referencia Detallada de PostgreSQL Replication"
description: "PostgreSQL replication. Cubre streaming replication, logical replication, cascading replicas, synchronous commit, failover con Patroni, monitoring lag, slot management y disaster recovery con ejemplos practicos de configuracion."
metaDescription: "Master PostgreSQL replication. Covers streaming, logical, cascading replicas, synchronous commit, Patroni failover, lag monitoring, slots, DR."
difficulty: advanced
topics:
  - databases
  - infrastructure
  - devops
tags:
  - postgresql
  - databases
  - guia
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

## Introducción

PostgreSQL replication copia data de un primary server a uno o mas replica servers. Streaming replication manda WAL records en real time. Logical replication decodes WAL en logical changes y los publica a subscribers. Aqui se presenta una guia sobre ambos modos, cascading replicas, failover, monitoring, y disaster recovery.

## Streaming Replication

Streaming replication manda WAL (Write-Ahead Log) records del primary a replicas en real time. Replicas aplican WAL records para stayear in sync.

### Primary Configuration

```bash
# postgresql.conf (primary)
listen_addresses = '*'
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
wal_keep_size = 1024        # MB de WAL a retain
hot_standby = on

# Synchronous replication (opcional)
synchronous_standby_names = 'replica1'
synchronous_commit = on
```

```sql
-- Crear replication role
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'secure_password';

-- Allow replication connections en pg_hba.conf
-- host replication replicator 192.168.1.0/24 md5
```

```bash
# pg_hba.conf (primary)
host replication replicator 192.168.1.0/24 md5
host all all 192.168.1.0/24 md5
```

### Replica Setup

```bash
# 1. Stop PostgreSQL en replica
pg_ctl stop -D /var/lib/postgresql/data

# 2. Clear data directory
rm -rf /var/lib/postgresql/data/*

# 3. Base backup desde primary
pg_basebackup \
  -h primary.example.com \
  -U replicator \
  -D /var/lib/postgresql/data \
  -Fp -Xs -P -R

# El -R flag crea standby.signal y configura primary_conninfo

# 4. Start PostgreSQL en replica
pg_ctl start -D /var/lib/postgresql/data
```

```bash
# postgresql.conf (replica)
hot_standby = on
primary_conninfo = 'host=primary.example.com port=5432 user=replicator password=secure_password'
restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
archive_cleanup_command = 'pg_archivecleanup /var/lib/postgresql/wal_archive %p'

# Opcional: replication slot para prevenir WAL removal
primary_slot_name = 'replica1_slot'
```

```sql
-- Crear replication slot en primary (opcional pero recommended)
SELECT pg_create_physical_replication_slot('replica1_slot');
```

### Verify Replication

```sql
-- En primary: check replication status
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

-- En replica: check receiver status
SELECT
  pid,
  status,
  receive_start_lsn,
  receive_start_tli,
  latest_end_lsn,
  latest_end_time
FROM pg_stat_wal_receiver;

-- En replica: check si esta in recovery
SELECT pg_is_in_recovery();
```

## Cascading Replication

Cascading replicas conectan a otro replica en vez del primary. Esto reduce load en el primary cuando tenes many replicas.

```text
Primary
  ├── Replica 1 (upstream)
  │     ├── Replica 2 (cascading desde Replica 1)
  │     └── Replica 3 (cascading desde Replica 1)
  └── Replica 4 (direct)
```

```bash
# postgresql.conf en Replica 1 — allow cascading
wal_level = replica
max_wal_senders = 5

# pg_hba.conf en Replica 1 — allow replication connections
host replication replicator 192.168.1.0/24 md5

# postgresql.conf en Replica 2 — connect a Replica 1
primary_conninfo = 'host=replica1.example.com port=5432 user=replicator password=secure_password'
```

```sql
-- En Replica 1: check cascading status
SELECT * FROM pg_stat_replication;
-- Shows Replica 2 y Replica 3 connected a Replica 1
```

## Logical Replication

Logical replication decodes WAL records en logical change events (INSERT, UPDATE, DELETE). Permite selective table replication, cross-version replication, y replication entre different databases.

### Publisher Configuration

```sql
-- En publisher (source database)
-- Setear wal_level a logical
ALTER SYSTEM SET wal_level = 'logical';
ALTER SYSTEM SET max_replication_slots = 10;
ALTER SYSTEM SET max_logical_replication_workers = 4;
-- Reload configuration
SELECT pg_reload_conf();

-- Crear publication
CREATE PUBLICATION my_publication FOR TABLE users, orders, products;

-- Publication con all tables
CREATE PUBLICATION all_tables FOR ALL TABLES;

-- Publication con specific operations
CREATE PUBLICATION insert_only FOR TABLE users WITH (publish = 'insert');

-- Add o remove tables de publication
ALTER PUBLICATION my_publication ADD TABLE new_table;
ALTER PUBLICATION my_publication DROP TABLE old_table;
```

### Subscriber Configuration

```sql
-- En subscriber (target database)
-- Tables deben existir con same schema
CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT, email TEXT);
CREATE TABLE orders (id SERIAL PRIMARY KEY, user_id INT, total DECIMAL);

-- Crear subscription
CREATE SUBSCRIPTION my_subscription
  CONNECTION 'host=publisher.example.com port=5432 user=replicator password=secure_password dbname=mydb'
  PUBLICATION my_publication;

-- Con specific options
CREATE SUBSCRIPTION my_subscription
  CONNECTION 'host=publisher.example.com port=5432 user=replicator password=secure_password dbname=mydb'
  PUBLICATION my_publication
  WITH (
    copy_data = true,           -- Copy existing data on start
    create_slot = true,         -- Crear replication slot
    slot_name = 'my_sub_slot',
    synchronous_commit = off    -- Async para better performance
  );

-- Refresh subscription (pick up new tables)
ALTER SUBSCRIPTION my_subscription REFRESH PUBLICATION;
```

### Logical Replication Limitations

```text
Que logical replication NO replica:
  - Schema changes (DDL) — deben ser applied manually en ambos sides
  - Sequences — pueden causar primary key conflicts
  - TRUNCATE operations (a menos que explicitly published)
  - Large objects (bytea esta fine, pero lo_* functions no son replicated)
  - TEMPORARY tables
  - System catalog changes

Common gotchas:
  - Primary key required en all replicated tables
  - No replication de data types sin un binary send/recv function
  - Conflict resolution es manual — subscriber stops on conflict
  - DDL debe ser coordinated manually entre publisher y subscriber
```

## Synchronous Replication

Synchronous replication asegura que un transaction es confirmed solo despues de que el replica ha escrito el WAL record. Esto guarantees no data loss on failover.

```bash
# postgresql.conf (primary)
synchronous_standby_names = 'FIRST 2 (replica1, replica2, replica3)'
# Wait para al menos 2 replicas confirmar

synchronous_standby_names = 'ANY 2 (replica1, replica2, replica3)'
# Wait para any 2 de las listed replicas

synchronous_standby_names = 'replica1'
# Wait para replica1 specifically

synchronous_commit = on
# Options: on, off, local, remote_write, remote_apply
```

```text
synchronous_commit options:
  off          — No sync, fastest, possible data loss
  local        — Sync a local WAL only
  on           — Sync a local WAL + wait para replica flush
  remote_write — Wait para replica write (no flush) WAL
  remote_apply — Wait para replica apply WAL (slowest, most consistent)
```

## Failover con Patroni

Patroni maneja automatic failover para PostgreSQL clusters. Usa etcd o Consul para distributed configuration.

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
# Start Patroni en cada node
patroni /etc/patroni/patroni.yml

# Check cluster status
patronictl list
# + Cluster: my_cluster (700123) --+---------+----+-----------+
# | Member | Host          | Role    | State   | TL | Lag in MB |
# |--------|---------------|---------|---------|----|-----------|
# | node1  | 192.168.1.10  | Leader  | running |  5 |           |
# | node2  | 192.168.1.11  | Replica | streaming|  5 |         0 |
# | node3  | 192.168.1.12  | Replica | streaming|  5 |         0 |

# Manual switover
patronictl switchover my_cluster

# Manual failover
patronictl failover my_cluster

# Reinitialize un failed node
patronictl reinit my_cluster node2
```

## Monitoring Replication Lag

```sql
-- Check replication lag en bytes
SELECT
  client_addr,
  state,
  sent_lsn,
  replay_lsn,
  pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes,
  pg_wal_lsn_diff(sent_lsn, replay_lsn) / 1024 / 1024 AS lag_mb
FROM pg_stat_replication;

-- Check replication lag en seconds
SELECT
  client_addr,
  EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) AS lag_seconds
FROM pg_stat_replication;

-- En replica: check last replayed WAL
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

Replication slots aseguran que el primary retiene WAL hasta que el replica lo haya consumido. Sin slots, el primary puede remove WAL que un slow replica todavia necesita.

```sql
-- Crear physical replication slot
SELECT pg_create_physical_replication_slot('replica1_slot');

-- Crear logical replication slot
SELECT pg_create_logical_replication_slot('my_slot', 'test_decoding');

-- Drop replication slot (debe estar inactive)
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

-- Advance un logical slot manually (skip transactions)
SELECT pg_replication_slot_advance('my_slot', '0/2000000');
```

```text
wal_status values:
  reserved  — WAL esta available, within wal_keep_size
  extended  — WAL esta siendo retained beyond wal_keep_size para este slot
  unreserved — WAL sera removed soon, slot puede fall behind
  lost      — WAL ha sido removed, slot esta broken y debe ser dropped
```

## Disaster Recovery

```bash
# Point-in-time recovery (PITR)
# postgresql.conf (primary)
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/wal_archive/%f && cp %p /var/lib/postgresql/wal_archive/%f'

# En recovery server
# recovery.signal file
touch /var/lib/postgresql/data/recovery.signal

# postgresql.conf o recovery.conf
restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
recovery_target_time = '2026-07-04 15:30:00'
recovery_target_action = 'promote'
recovery_target_inclusive = true
```

```sql
-- Despues de recovery, check timeline
SELECT timeline_id FROM pg_control_checkpoint();

-- Crear new timeline para avoid conflicts
-- Esto happens automaticamente cuando recovery_target_action = 'promote'
```

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre streaming y logical replication?

Streaming replication manda raw WAL bytes del primary al replica. El replica es un byte-for-byte copy del primary. Requiere el same PostgreSQL major version y OS architecture. Logical replication decodes WAL en logical change events (INSERT, UPDATE, DELETE) y los publica a subscribers. Soporta selective table replication, cross-version replication, y replication a different databases. Usa streaming para HA y read replicas. Usa logical para data integration, upgrades, y selective replication.

### ¿Cuándo deberia usar synchronous vs asynchronous replication?

Usa synchronous replication cuando data loss es unacceptable — financial systems, healthcare, critical applications. El trade-off es higher write latency porque cada transaction wait para replica confirmation. Usa asynchronous replication cuando performance es mas importante que zero data loss — analytics, reporting, caching layers. Con asynchronous, podes lose las last few transactions on failover. Configura con `synchronous_standby_names` y `synchronous_commit`.

### ¿Cómo handleo replication conflicts?

Replication conflicts occurren cuando un query en el replica conflicts con WAL replay. Common causes: long-running queries en replica mientras primary deletes o locks rows. Solutions: setea `max_standby_streaming_delay` para allow WAL replay wait, setea `max_standby_archive_delay` para archive recovery, o usa `hot_standby_feedback = on` para let el replica tell al primary about running queries. Para logical replication conflicts (primary key violations), tenes que manually resolve el conflicting row y restart el subscription.

### ¿Qué es un replication slot y por que lo necesito?

Un replication slot asegura que el primary retiene WAL files hasta que el replica los haya consumido. Sin un slot, el primary puede remove old WAL files para free disk space, causando que el replica fall behind y requiera un full base backup. Slots son especially important para replicas con intermittent connectivity o logical subscribers. Monitor `pg_replication_slots` para `wal_status = 'lost'` que significa que el slot esta broken. Dropea unused slots para prevenir WAL accumulation.

### ¿Cómo handlea Patroni failover?

Patroni monitorea el primary via el DCS (etcd/Consul). Si el primary se vuelve unreachable, Patroni updatea el DCS lock. El replica con el least replication lag es promoted a primary. Otros replicas reconnectan al new primary. El old primary, cuando recovers, es reconfigurado como replica. Patroni usa pg_rewind para resync el old primary sin un full base backup. El typical failover time es 10-30 seconds dependiendo de configuration y network.

### ¿Puedo replicar entre different PostgreSQL versions?

Para streaming replication, tanto primary como replica deben correr el same major version (e.g., ambos 16.x). No podes stream de 15 a 16. Para logical replication, podes replicar entre different major versions — este es el recommended approach para major version upgrades. Setea up logical replication del old version al new version, dejalos sync, luego switchea el application al new version. Esto se llama "logical replication upgrade" y tiene near-zero downtime.
