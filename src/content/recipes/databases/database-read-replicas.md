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
lastUpdated: "2026-08-28"
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
read-heavy workloads: analytics dashboards, search queries, and API reads can all
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

```mermaid
flowchart LR
    A[Client Request] --> B{Read or Write?}
    B -->|Write| C[Primary DB]
    B -->|Read| D[Load Balancer]
    D --> E[Replica 1]
    D --> F[Replica 2]
    D --> G[Replica 3]
    C --> H[WAL / Binlog Stream]
    H --> E
    H --> F
    H --> G
    C --> I[Response]
    E --> J[Response]
    F --> J
    G --> J
```

| Database | Replication Type | Lag Monitoring | Read Routing |
| --- | --- | --- | --- |
| PostgreSQL | Streaming / Logical | `pg_stat_replication` | PgBouncer, custom proxy |
| MySQL | Binlog (async/semi-sync) | `SHOW SLAVE STATUS` | ProxySQL, MaxScale |
| Cloud RDS | Managed streaming | CloudWatch/Cloud Monitoring | RDS Proxy, custom |
| CockroachDB | Multi-active (Raft) | Built-in | Automatic |

Choose PostgreSQL or MySQL if you want full control. Use cloud-managed services if
you prefer operational simplicity, or CockroachDB if you want automatic
multi-active replicas. I've used PostgreSQL streaming replication in production for
years and it's been rock solid once you get the monitoring right.

## When Not to Use

- **Write-heavy workloads**: If your workload is more than 50% writes, replicas
  won't help. Each write goes to the primary anyway, and replicas add overhead
  without offloading anything. I learned this the hard way on a logging service
  that was 70% writes; adding replicas just increased primary load.
- **Strong consistency requirements**: If your app needs read-after-write
  consistency on every query, replicas introduce stale-read risk. Use the primary
  for everything or switch to CockroachDB/Yugabyte for distributed strong
  consistency.
- **Small datasets**: If your database fits in RAM and queries are fast, scaling
  vertically (more CPU, more RAM) is simpler and cheaper than adding replicas.
- **Budget constraints**: Each replica roughly doubles the database cost. On AWS
  RDS, a db.r6g.large replica costs the same as the primary. If budget is tight,
  tune queries and add indexes first.
- **Operational complexity**: Replicas add failover procedures, monitoring
  dashboards, and connection routing logic. If your team is small, the operational
  overhead might not be worth it.

## Best Practices

I always monitor replication lag and alert when it exceeds my use case threshold
(1 to 5 seconds for user-facing reads, up to 60 seconds for analytics). Route
time-sensitive reads to the primary. When a user updates their profile, I read it
back from the primary to avoid stale data. Use connection pooling per replica
instead of opening direct connections; [PgBouncer](https://www.pgbouncer.org/) or
[ProxySQL](https://proxysql.com/) work well. See
[Connection Pooling](/recipes/database-connection-pooling/) for a sample
configuration. I distribute replicas across availability zones so a single zone
failure doesn't take down my reads. Test failover procedures regularly. Replicas
can be promoted to primary during outages, so make sure the process actually
works. See [Retry Logic](/recipes/retry-backoff/) for resilience patterns.

## Common Mistakes

- **Assuming replicas are instantly consistent**: I've been bitten by this one.
  Always account for replication lag in read-after-write scenarios. The replica
  might be 200ms behind and your user sees stale data.
- **Sending writes to replicas**: Replicas are read-only; writes will fail or be
  silently ignored. I once saw a junior dev route a migration to a replica and
  wondered why the schema changes didn't stick.
- **Ignoring replica lag monitoring**: Users see stale data without anyone knowing.
  Set up alerts on lag before you need them, not after.
- **Over-replicating**: Each replica adds load to the primary. I've seen teams
  spin up 10 replicas and wonder why the primary is now CPU-bound. Find the right
  ratio (usually 1:3 to 1:5).
- **No failover plan**: When the primary fails, promote a replica quickly.
  Practice this regularly. I run failover drills monthly and they've saved me
  during real outages.

## FAQ

### How much replication lag is acceptable?

I target under 100ms for user-facing reads. For analytics, a few seconds to a few
minutes is usually fine. For cache invalidation, keep it under one second. Set the
alert threshold to whichever requirement is tightest for your use case.

### Can I write to a read replica?

Not with standard read replicas. You'd need multi-master replication like Galera,
CockroachDB, or Yugabyte. Standard read replicas reject writes outright.

### Do I need an application-level proxy for read splitting?

Not always. Drivers such as libpq for PostgreSQL and Connector/J for MySQL accept
more than one host, and many ORMs can route read operations to a replica. For
complex routing rules, add ProxySQL, PgBouncer, or AWS RDS Proxy.

### Why did my read-after-write still return the old value?

Replication lag. The replica hadn't caught up to the primary when the read
happened. If a user writes data and immediately reads it back, send that read to
the primary or wait until the replica lag drops below your threshold.

### How many replicas should I run?

I start with one or two. Most workloads get a good return with a 1:3 to 1:5
primary-to-replica ratio. Add more only if monitoring shows the existing replicas
aren't keeping up.

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

## Key Takeaways

- Start with one replica and scale based on monitoring. I've never needed more
  than 5 replicas even for high-traffic apps, and most workloads are fine with 2-3.
- Monitor replication lag from day one. I use `pg_stat_replication` on PostgreSQL
  and `SHOW REPLICA STATUS` on MySQL. Without monitoring, you're flying blind.
- Route read-after-write queries to the primary. This is the most common bug I see
  in production: a user updates data, reads it back, and sees the old value because
  the read hit a replica that hasn't caught up yet.
- Use connection pooling (PgBouncer, ProxySQL) per replica. Direct connections
  exhaust the replica's max_connections quickly under load.
- Practice failover drills monthly. When the primary fails at 3am, you want muscle
  memory, not a wiki page you've never tested.

## See Also

- [PostgreSQL streaming replication docs](https://www.postgresql.org/docs/current/warm-standby.html) - official documentation for streaming replication setup.
- [MySQL replication docs](https://dev.mysql.com/doc/refman/8.0/en/replication.html) - official MySQL replication guide covering binlog, async, and semi-sync modes.
- [PgBouncer documentation](https://www.pgbouncer.org/config.html) - connection pooling configuration for PostgreSQL with replica support.
- [ProxySQL documentation](https://proxysql.com/documentation/) - read/write splitting and query routing for MySQL.
- [AWS RDS Read Replicas](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html) - managed read replicas in AWS RDS.
- [CockroachDB architecture](https://www.cockroachlabs.com/docs/stable/architecture/overview.html) - multi-active replicas with Raft consensus.
- [Database Deadlocks and Retries](/recipes/database-deadlocks-retries/) - handling concurrent access issues in replicated setups.
- [Connection Pooling](/recipes/database-connection-pooling/) - pool configuration for primary and replica connections.
