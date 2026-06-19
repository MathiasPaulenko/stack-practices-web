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
relatedResources:
  - /recipes/database-deadlocks-retries
  - /recipes/full-text-search
  - /recipes/sql-joins
  - /docs/database-migration-runbook-template
  - /guides/cap-theorem-guide
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

This recipe covers setting up read replicas, implementing read/write splitting, monitoring replication lag, and handling stale reads in PostgreSQL, MySQL, and cloud-managed databases.

## When to Use

Use this resource when:
- Your primary database CPU or I/O is saturated by read queries
- You need to run analytical reports without impacting production writes
- You want geographic read locality by placing replicas near users
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

## Best Practices

- **Monitor replication lag**: Alert when lag exceeds 1–5 seconds depending on use case
- **Route time-sensitive reads to primary**: User profile updates after edit should read from primary
- **Use connection pooling per replica**: Don't create connections directly; use PgBouncer or ProxySQL
- **Distribute replicas across availability zones**: Protect against zone failures
- **Test failover procedures**: Replicas can be promoted to primary during outages

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
