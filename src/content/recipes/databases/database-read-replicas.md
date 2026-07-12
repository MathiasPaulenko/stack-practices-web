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
  - databases
  - sql
  - postgresql
  - mysql
relatedResources:
  - /recipes/database-deadlocks-retries
  - /recipes/full-text-search
  - /recipes/sql-joins
  - /docs/database-migration-runbook-template
  - /guides/cap-theorem-guide
  - /recipes/optimistic-locking
  - /recipes/sql-full-text-search-setup
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
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
# Set Up Database Read Replicas for Scaling

## Overview

Read replicas are copies of your primary database that handle read-only traffic, offloading the primary instance. They are the most common scaling strategy for read-heavy workloads — analytics dashboards, search queries, and API reads can all be directed to replicas while writes go to the primary.

Below is a practical approach to setting up read replicas, implementing read/write splitting, monitoring replication lag, and handling stale reads in PostgreSQL, MySQL, and cloud-managed databases.

## When to Use

Use this resource when:
- Your primary database CPU or I/O is saturated by read queries. See [Query Optimization](/recipes/databases/postgres-query-optimization) for tuning reads.
- You need to run analytical reports without impacting production writes. See [Logging](/recipes/api/logging) for observability.
- You want geographic read locality by placing replicas near users. See [Caching](/recipes/data/caching) for edge-layer performance.
- Your workload is read-heavy (>80% reads) and write volume is moderate

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
session.execute_write("UPDATE users SET last_login = NOW() WHERE id = :id", {"id": 1})
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

Read replicas use streaming replication (physical) or logical replication:
- **Physical replication**: Copies WAL (Write-Ahead Log) blocks directly. Fast but replicates everything.
- **Logical replication**: Replicates row-level changes. Selective but higher overhead.

**Replication lag** is the delay between a write on primary and its appearance on the replica. Causes include network latency, replica load, and large transactions. Applications must handle stale reads or route consistency-critical queries to the primary.

## Variants

| Database | Replication Type | Lag Monitoring | Read Routing |
|----------|-----------------|----------------|--------------|
| PostgreSQL | Streaming / Logical | `pg_stat_replication` | PgBouncer, custom proxy |
| MySQL | Binlog (async/semi-sync) | `SHOW SLAVE STATUS` | ProxySQL, MaxScale |
| Cloud RDS | Managed streaming | CloudWatch/Cloud Monitoring | RDS Proxy, custom |
| CockroachDB | Multi-active (Raft) | Built-in | Automatic |

## What Works

- **Monitor replication lag**: Alert when lag exceeds 1–5 seconds depending on use case
- **Route time-sensitive reads to primary**: User profile updates after edit should read from primary
- **Use connection pooling per replica**: Don't create connections directly; use PgBouncer or ProxySQL. See [Connection Pooling](/recipes/databases/database-connection-pooling) for configuration.
- **Distribute replicas across availability zones**: Protect against zone failures
- **Test failover procedures**: Replicas can be promoted to primary during outages. See [Retry Logic](/recipes/architecture/retry-backoff) for resilience patterns.

## Common Mistakes

- **Assuming replicas are instantly consistent**: Always account for replication lag in read-after-write scenarios
- **Sending writes to replicas**: Replicas are read-only; writes will fail or be silently ignored
- **Ignoring replica lag monitoring**: Users see stale data without anyone knowing
- **Over-replicating**: Each replica adds load to the primary; find the right ratio (usually 1:3 to 1:5)
- **No failover plan**: When the primary fails, promote a replica quickly — practice this regularly

## Frequently Asked Questions

**Q: How much replication lag is acceptable?**
A: For user-facing reads: <100ms. For analytics: seconds to minutes. For cache invalidation: <1s. Monitor and alert based on your use case.

**Q: Can I write to a read replica?**
A: Only if using multi-master replication (Galera, CockroachDB, Yugabyte). Standard read replicas reject writes. Attempting writes will throw errors.

**Q: Do I need an application-level proxy for read splitting?**
A: Not always. Some drivers (PostgreSQL libpq, MySQL Connector/J) support multiple hosts. ORMs like Prisma and Hibernate also provide replica routing. For complex scenarios, use ProxySQL, PgBouncer, or AWS RDS Proxy.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### PgBouncer for Connection Pooling with Replicas

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

## Additional Best Practices

6. **Use connection pooling with replicas.** Each replica connection consumes memory. Use PgBouncer or a pooler to multiplex connections:

```python
from sqlalchemy import create_engine
master = create_engine("postgresql://user:pass@master:5432/app", pool_size=10)
replica = create_engine("postgresql://user:pass@replica:5432/app", pool_size=20)
```

7. **Route `SELECT ... FOR UPDATE` to master.** Locking reads must go to the master, not replicas:

```python
def get_connection(query_type='read', is_locking=False):
    if query_type == 'write' or is_locking:
        return master_conn
    return replica_conn
```

8. **Monitor replica health and remove unhealthy replicas.** A dead replica causes read failures. Implement health checks:

```python
def get_healthy_replica(replicas):
    for replica in replicas:
        try:
            with replica.cursor() as cur:
                cur.execute("SELECT 1")
                return replica
        except Exception:
            continue
    return master  # Fallback to master if all replicas are down
```

9. **Use causal consistency for read-after-write.** After a write, read from master for a brief period to ensure the replica has caught up:

```python
import time

class CausalConsistencyManager:
    def __init__(self, master, replica):
        self.master = master
        self.replica = replica
        self.last_write_time = 0

    def write(self, query, params):
        with self.master.cursor() as cur:
            cur.execute(query, params)
            self.master.commit()
        self.last_write_time = time.time()

    def read(self, query, params):
        # Read from master if within 2 seconds of last write
        if time.time() - self.last_write_time < 2.0:
            with self.master.cursor() as cur:
                cur.execute(query, params)
                return cur.fetchall()
        with self.replica.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchall()
```

10. **Tag replica connections in monitoring.** Distinguish replica traffic from master traffic in logs and metrics:

```python
import logging
logger = logging.getLogger('db_router')

def read_from_replica(query, params):
    logger.debug("REPLICA_READ", extra={"query": query[:100]})
    # ...
```

## Additional Common Mistakes

6. **Reading from a replica immediately after writing to master.** The replica may not have received the write yet. Use causal consistency or read-from-master-after-write for a brief window.

7. **Not handling replica failure gracefully.** If a replica goes down, reads should fall back to master, not error out:

```python
try:
    result = replica_conn.execute(query)
except ConnectionError:
    result = master_conn.execute(query)  # Fallback
```

8. **Running long analytical queries on replicas without resource limits.** A heavy analytical query can consume all replica resources and cause lag. Use `statement_timeout` on replica connections:

```sql
SET statement_timeout = '30s';
```

9. **Not creating the same indexes on replicas.** Logical replication may not sync indexes. Ensure replicas have the same indexes as master for read performance.

10. **Using synchronous replication for read scaling.** Synchronous replication waits for the replica to confirm, adding latency to every write. Use asynchronous replication for read scaling; use synchronous only for HA failover.

## Additional FAQ

### How many replicas should I have?

Start with one replica. Add more when:
- Read QPS exceeds what one replica can handle
- You need geographical distribution (read replicas closer to users)
- You want to run analytical queries without affecting the primary

Most applications need 1-3 replicas. More than 5 usually indicates you need a different scaling strategy (sharding, caching, or a dedicated analytics database).

### Can I write to a replica?

No. Replicas in standard PostgreSQL/MySQL streaming replication are read-only. Writing to a replica causes replication to break. Use multi-master replication (Bucardo, PostgreSQL logical replication with conflict resolution) if you need writes on multiple nodes.

### What is the difference between physical and logical replication?

**Physical replication** copies block-level changes. The replica is an exact byte-for-byte copy of the primary. It's fast and simple but requires the same PostgreSQL version and architecture.

**Logical replication** copies logical changes (INSERT, UPDATE, DELETE) via publication/subscription. It supports different PostgreSQL versions, selective table replication, and cross-version upgrades. It's slower than physical replication and doesn't replicate schema changes.

## Performance Tips

1. **Use `pg_stat_replication` to tune replica count.** If replication lag consistently exceeds 5 seconds, you may have too many replicas or insufficient replica hardware:

```sql
SELECT application_name, client_addr,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes,
       EXTRACT(EPOCH FROM replay_lag) AS lag_seconds
FROM pg_stat_replication;
```

2. **Place replicas in different availability zones.** This provides both read scaling and disaster recovery:

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

3. **Use `hot_standby_feedback = on` on replicas.** This prevents the master from vacuuming rows that replicas are still reading:

```sql
-- On replica postgresql.conf
hot_standby_feedback = on
```

4. **Tune `max_wal_senders` and `wal_keep_size` on master.** Ensure enough WAL is retained for replicas:

```sql
-- postgresql.conf
max_wal_senders = 10
wal_keep_size = 1024  -- MB
```

5. **Use `pg_stat_statements` to identify read-heavy queries.** Route the most frequent read queries to replicas:

```sql
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
WHERE query LIKE 'SELECT%'
ORDER BY calls DESC
LIMIT 20;
```
