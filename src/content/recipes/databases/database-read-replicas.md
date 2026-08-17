---
contentType: recipes
slug: database-read-replicas
title: "Set Up Database Read Replicas for Scaling"
description: "Scale read-heavy workloads with database read replicas, replication lag monitoring, and read/write splitting across primary and replica instances."
metaDescription: "Set up database read replicas for scaling. Replication lag monitoring, read/write splitting, and load balancing across primary and replicas."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - sql
  - postgresql
  - mysql
relatedResources:
  - /recipes/database-deadlocks-retries
  - /docs/database-migration-runbook-template
  - /guides/cap-theorem-guide
  - /recipes/optimistic-locking
  - /recipes/database-views-materialized
  - /recipes/event-sourcing-relational
lastUpdated: "2026-08-18"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Set up database read replicas for scaling. Replication lag monitoring, read/write splitting, and load balancing across primary and replicas."
  keywords:
    - read-replicas
    - replication
    - scaling
    - postgresql
    - mysql
    - load-balancing
---
## Overview

Read replicas are copies of your primary database that handle read-only traffic,
offloading the primary instance. They're the most common scaling strategy for
read-heavy workloads — analytics dashboards, search queries, and API reads can all
be directed to replicas while writes go to the primary.

This recipe walks through setting up read replicas, splitting reads from writes,
monitoring replication lag, and handling stale reads in PostgreSQL, MySQL, and
cloud-managed databases.

## When to Use

Reach for this recipe when your primary database CPU or I/O is saturated by read
queries, when you need to run analytical reports without slowing production
writes, when you want geographic read locality by placing replicas near users, or
when your workload is read-heavy (more than 80% reads) with moderate write
volume.

- If your primary is saturated by read queries, tune the queries first with
  [PostgreSQL Query Optimization](/recipes/postgres-query-optimization/).
- For analytics that shouldn't impact production writes, read replicas keep
  reporting work away from the primary.
- To get geographic read locality, place replicas close to your
  users.
- When your workload is mostly reads with moderate writes, replicas are usually
  the fastest scaling win.

## Solution

### Python (SQLAlchemy with read/write splitting)

```python
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import random

# Primary for writes, replicas for reads
primary_engine = create_engine("postgresql://user:pass@primary:5432/app")
replica_engines = [
    create_engine("postgresql://user:pass@replica1:5432/app"),
    create_engine("postgresql://user:pass@replica2:5432/app"),
]

class RoutingSession:
    def __init__(self):
        self._write_session = sessionmaker(bind=primary_engine)()
        self._replica = random.choice(replica_engines)
        self._read_session = sessionmaker(bind=self._replica)()

    def execute_write(self, query, params=None):
        return self._write_session.execute(text(query), params or {})

    def execute_read(self, query, params=None):
        return self._read_session.execute(text(query), params or {})

    def commit(self):
        self._write_session.commit()

# Usage
session = RoutingSession()
users = session.execute_read("SELECT * FROM users WHERE active = true")
session.execute_write(
    "UPDATE users SET last_login = NOW() WHERE id = :id", {"id": 1}
)
session.commit()
```

### JavaScript (Prisma with read replicas)

```javascript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL, // primary
    },
  },
});

// Prisma extension for read replicas (preview feature)
const prismaWithReplicas = prisma.$extends({
  query: {
    $allModels: {
      async findUnique({ model, operation, args, query }) {
        // Route reads to replica
        return query(args);
      },
    },
  },
});

// For raw query splitting
async function executeRead(sql) {
  // Connect to replica pool
  const replicaPool = new Pool({ connectionString: process.env.REPLICA_URL });
  return replicaPool.query(sql);
}

async function executeWrite(sql, params) {
  return prisma.$executeRawUnsafe(sql, ...params);
}
```

### Java (Spring Boot with AbstractRoutingDataSource)

```java
@Configuration
public class DataSourceConfig {
    @Bean
    public DataSource routingDataSource(
            @Qualifier("primaryDataSource") DataSource primary,
            @Qualifier("replicaDataSource") DataSource replica) {

        AbstractRoutingDataSource routing = new AbstractRoutingDataSource() {
            @Override
            protected Object determineCurrentLookupKey() {
                return TransactionSynchronizationManager.isCurrentTransactionReadOnly()
                    ? "replica" : "primary";
            }
        };

        Map<Object, Object> targets = new HashMap<>();
        targets.put("primary", primary);
        targets.put("replica", replica);
        routing.setTargetDataSources(targets);
        routing.setDefaultTargetDataSource(primary);
        return routing;
    }
}

@Service
public class UserService {
    @Transactional(readOnly = true)
    public List<User> findAll() {
        // Automatically routed to replica
        return userRepository.findAll();
    }

    @Transactional
    public User save(User user) {
        // Routed to primary
        return userRepository.save(user);
    }
}
```

## Explanation

Read replicas rely on streaming replication. Physical replication copies WAL
(Write-Ahead Log) blocks directly; it's fast but replicates the whole database.
Logical replication replicates row-level changes; it's selective but carries more
overhead.

**Replication lag** is the time between a write on the primary and that same
change appearing on the replica. Network latency, replica load, and large
transactions all add to it. Your application has to either handle stale reads or
route consistency-critical queries back to the primary.

## Variants

Different stacks approach read replicas in slightly different ways. The table
below compares replication types, lag monitoring, and read-routing options.

| Database | Replication Type | Lag Monitoring | Read Routing |
| --- | --- | --- | --- |
| PostgreSQL | Streaming / Logical | `pg_stat_replication` | PgBouncer, custom proxy |
| MySQL | Binlog (async/semi-sync) | `SHOW SLAVE STATUS` | ProxySQL, MaxScale |
| Cloud RDS | Managed streaming | CloudWatch/Cloud Monitoring | RDS Proxy, custom |
| CockroachDB | Multi-active (Raft) | Built-in | Automatic |

Choose PostgreSQL or MySQL if you want full control. Use cloud-managed services if
you prefer operational simplicity, or CockroachDB if you want automatic
multi-active replicas.

## Best Practices

- Monitor replication lag and alert when it exceeds 1–5 seconds for your use case.
- Route time-sensitive reads to the primary. When a user updates their profile,
  read it back from the primary.
- Use connection pooling per replica instead of opening direct connections;
  PgBouncer or ProxySQL work well. See [Connection Pooling](/recipes/database-connection-pooling/)
  for a sample configuration.
- Distribute replicas across availability zones so a single zone failure doesn't
  take down your reads.
- Test failover procedures regularly. Replicas can be promoted to primary during
  outages, so make sure the process actually works. See [Retry Logic](/recipes/retry-backoff/)
  for resilience patterns.

## Common Mistakes

- **Assuming replicas are instantly consistent**: Always account for replication
  lag in read-after-write scenarios
- **Sending writes to replicas**: Replicas are read-only; writes will fail or be
  silently ignored
- **Ignoring replica lag monitoring**: Users see stale data without anyone knowing
- **Over-replicating**: Each replica adds load to the primary; find the right
  ratio (usually 1:3 to 1:5)
- **No failover plan**: When the primary fails, promote a replica quickly —
  practice this regularly

## FAQ

### How much replication lag is acceptable?

For user-facing reads, aim for under 100ms. For analytics, anything from a few
seconds to a few minutes is usually fine. For cache invalidation, keep it under
one second. Set the alert threshold to the tightest requirement your use case
allows.

### Can I write to a read replica?

Only if you're using multi-master replication, such as Galera, CockroachDB, or
Yugabyte. Standard read replicas are read-only, so any write attempt will fail.

### Do I need an application-level proxy for read splitting?

Not always. Drivers such as libpq for PostgreSQL and Connector/J for MySQL accept
more than one host, and many ORMs can route read operations to a replica. For
complex routing rules, add ProxySQL, PgBouncer, or AWS RDS Proxy.

### Why did my read-after-write still return the old value?

Replication lag. The replica hadn't caught up to the primary when the read
happened. If a user writes data and immediately reads it back, send that read to
the primary or wait until the replica lag drops below your threshold.

### How many replicas should I run?

Start with one or two replicas. Most workloads get a good return with a 1:3 to
1:5 primary-to-replica ratio, so add more only if monitoring shows the existing
replicas aren't keeping up.

### PgBouncer Connection Pooling with Replicas

```ini
# pgbouncer.ini
[databases]
master = host=master.db.internal port=5432 dbname=app
replica1 = host=replica1.db.internal port=5432 dbname=app
replica2 = host=replica2.db.internal port=5432 dbname=app

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

```python
import psycopg2

# Write to master via PgBouncer
write_conn = psycopg2.connect("postgresql://user:pass@pgbouncer:6432/master")

# Read from replica via PgBouncer
read_conn = psycopg2.connect("postgresql://user:pass@pgbouncer:6432/replica1")

# Application-level routing
def get_connection(is_write=False):
    if is_write:
        return psycopg2.connect("postgresql://user:pass@pgbouncer:6432/master")
    # Round-robin replicas
    import random
    replica = random.choice(['replica1', 'replica2'])
    return psycopg2.connect(f"postgresql://user:pass@pgbouncer:6432/{replica}")
```

### ProxySQL for MySQL Read/Write Splitting

```sql
-- Configure ProxySQL with backend servers
INSERT INTO mysql_servers(hostgroup_id, hostname, port) VALUES
  (0, 'master.db.internal', 3306),   -- hostgroup 0: writes
  (1, 'replica1.db.internal', 3306),  -- hostgroup 1: reads
  (1, 'replica2.db.internal', 3306);  -- hostgroup 1: reads

-- Routing rules: SELECT goes to replicas, everything else to master
INSERT INTO mysql_query_rules(rule_id, active, match_digest, destination_hostgroup, apply)
VALUES
  (1, 1, '^SELECT.*FOR UPDATE', 0, 1),  -- Locking reads to master
  (2, 1, '^SELECT', 1, 1);               -- Regular reads to replicas

LOAD MYSQL SERVERS TO RUNTIME;
SAVE MYSQL SERVERS TO DISK;
LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

### AWS RDS Proxy Configuration

```yaml
# AWS CloudFormation snippet for RDS Proxy with read/write splitting
Resources:
  ReadWriteProxy:
    Type: AWS::RDS::DBProxy
    Properties:
      DBProxyName: app-proxy
      EngineFamily: POSTGRESQL
      RoleArn: !GetAtt ProxyRole.Arn
      Auth:
        - AuthScheme: SECRETS
          SecretArn: !Ref DBSecretArn
      TargetGroupName: default
      Targets:
        - RdsInstanceId: !Ref MasterInstance
        - RdsInstanceId: !Ref ReplicaInstance1
      ConnectionPoolConfiguration:
        MaxConnectionsPercent: 80
        IdleClientTimeout: 1800
```

### Go SQL Driver with Read/Write Splitting

```go
package db

import (
    "database/sql"
    "math/rand"
    "time"
    _ "github.com/lib/pq"
)

type DBRouter struct {
    master   *sql.DB
    replicas []*sql.DB
    rng      *rand.Rand
}

func NewDBRouter(masterURL string, replicaURLs []string) (*DBRouter, error) {
    master, err := sql.Open("postgres", masterURL)
    if err != nil {
        return nil, err
    }
    master.SetMaxOpenConns(20)

    replicas := make([]*sql.DB, len(replicaURLs))
    for i, url := range replicaURLs {
        replica, err := sql.Open("postgres", url)
        if err != nil {
            return nil, err
        }
        replica.SetMaxOpenConns(10)
        replicas[i] = replica
    }

    return &DBRouter{
        master:   master,
        replicas: replicas,
        rng:      rand.New(rand.NewSource(time.Now().UnixNano())),
    }, nil
}

func (r *DBRouter) Read() *sql.DB {
    if len(r.replicas) == 0 {
        return r.master
    }
    return r.replicas[r.rng.Intn(len(r.replicas))]
}

func (r *DBRouter) Write() *sql.DB {
    return r.master
}

// Usage
func (r *DBRouter) GetUser(id int) (*User, error) {
    var user User
    err := r.Read().QueryRow(
        "SELECT id, email FROM users WHERE id = $1", id,
    ).Scan(&user.ID, &user.Email)
    return &user, err
}

func (r *DBRouter) CreateUser(email string) error {
    _, err := r.Write().Exec(
        "INSERT INTO users (email) VALUES ($1)", email,
    )
    return err
}
```

### Django Database Routers

```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'app',
        'HOST': 'master.db.internal',
        'PORT': '5432',
    },
    'replica': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'app',
        'HOST': 'replica1.db.internal',
        'PORT': '5432',
    },
}

# routers.py
class ReadReplicaRouter:
    def db_for_read(self, model, **hints):
        return 'replica'

    def db_for_write(self, model, **hints):
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        return db == 'default'

DATABASE_ROUTERS = ['myapp.routers.ReadReplicaRouter']

# Usage: reads automatically go to replica, writes to master
users = User.objects.filter(role='admin')  # Goes to replica
user = User.objects.create(email='alice@example.com')  # Goes to master
```

### Replication Lag Monitoring Queries

```sql
-- PostgreSQL: check replication lag
SELECT
    client_addr,
    state,
    sent_lsn,
    replay_lsn,
    EXTRACT(EPOCH FROM (now() - replay_lag)) AS lag_seconds
FROM pg_stat_replication;

-- Check WAL receiver status on replica
SELECT status, receive_start_lsn, written_lsn, flushed_lsn
FROM pg_stat_wal_receiver;

-- Monitor slot lag (if using replication slots)
SELECT slot_name, restart_lsn,
       pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS lag_bytes
FROM pg_replication_slots;
```

```sql
-- MySQL: check replica lag
SHOW REPLICA STATUS\G

-- Key fields to monitor:
-- Seconds_Behind_Master: should be < 5
-- Replica_IO_Running: Yes
-- Replica_SQL_Running: Yes

-- Monitor via performance schema
SELECT
    channel_name,
    service_state,
    last_error_number,
    last_error_message
FROM performance_schema.replication_connection_status;
```

### Handling Replication Lag in Application Code

```python
import time
import psycopg2

def read_after_write(conn_master, conn_replica, query, params, max_wait=2.0):
    """Read from replica with fallback to master if lag is too high."""
    # Check replication lag
    with conn_master.cursor() as cur:
        cur.execute("""
            SELECT EXTRACT(EPOCH FROM (now() - replay_lag))::float
            FROM pg_stat_replication LIMIT 1
        """)
        lag = cur.fetchone()[0] or 0

    if lag > max_wait:
        # Replica is too far behind: read from master
        with conn_master.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchall()

    # Read from replica
    try:
        with conn_replica.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchall()
    except Exception:
        # Fallback to master on replica error
        with conn_master.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchall()
```

## Tuning

### Tune the replica count with pg_stat_replication

If replication lag consistently exceeds 5 seconds, you may have too many replicas
or insufficient replica hardware. Query `pg_stat_replication` to see the lag per
replica and decide.

```sql
SELECT application_name, client_addr,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes,
       EXTRACT(EPOCH FROM replay_lag) AS lag_seconds
FROM pg_stat_replication;
```

### Place replicas in different availability zones

This gives you both read scaling and disaster recovery:

```yaml
# AWS RDS: create read replicas in different AZs
ReadReplica1:
  Type: AWS::RDS::DBInstance
  Properties:
    SourceDBInstanceIdentifier: !Ref MasterInstance
    AvailabilityZone: us-east-1b
    DBInstanceClass: db.r6g.large

ReadReplica2:
  Type: AWS::RDS::DBInstance
  Properties:
    SourceDBInstanceIdentifier: !Ref MasterInstance
    AvailabilityZone: us-east-1c
    DBInstanceClass: db.r6g.large
```

### Enable hot_standby_feedback on replicas

This stops the master from vacuuming rows that the replicas are still reading:

```sql
-- On replica postgresql.conf
hot_standby_feedback = on
```

### Keep enough WAL on the master

Tune `max_wal_senders` and `wal_keep_size` so the primary retains enough WAL for
its replicas:

```sql
-- postgresql.conf
max_wal_senders = 10
wal_keep_size = 1024  -- MB
```

### Route read-heavy queries to replicas

Check `pg_stat_statements` for the most frequent read queries and send them to
replicas:

```sql
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
WHERE query LIKE 'SELECT%'
ORDER BY calls DESC
LIMIT 20;
```
