---




contentType: recipes
slug: database-connection-pooling
title: "Database Connection Pooling"
description: "Configure and tune database connection pools to maximize throughput while preventing connection exhaustion."
metaDescription: "Database connection pooling: configure, tune, and monitor pools for PostgreSQL, MySQL, and Redis to prevent exhaustion and improve throughput."
difficulty: intermediate
topics:
  - databases
tags:
  - connection-pooling
  - databases
  - postgresql
  - performance
  - mysql
  - jdbc
relatedResources:
  - /recipes/postgres-query-optimization
  - /recipes/database-transactions
  - /guides/database-normalization-guide
  - /recipes/database-replication
  - /recipes/schema-evolution
lastUpdated: "2026-07-03"
author: "StackPractices"
seo:
  metaDescription: "Database connection pooling: configure, tune, and monitor pools for PostgreSQL, MySQL, and Redis to prevent exhaustion and improve throughput."
  keywords:
    - connection-pooling
    - databases
    - postgresql
    - performance




---
## Overview

Connection pooling reuses established database connections instead of creating a new one per request. Each new connection requires a TCP handshake, TLS negotiation, and authentication, adding 20-100ms of overhead. Under load, creating connections per request exhausts the database's connection limit and causes cascading failures.

## When to Use

Use this resource when:
- Your application opens too many connections and the database rejects new requests
- Latency spikes occur because establishing a TCP + TLS + auth handshake on every request is expensive
- You need to tune connection limits for serverless or high-concurrency architectures

## Solution

### Python (psycopg2 + psycopg2.pool)

```python
from psycopg2 import pool

# Create a connection pool with min and max connections
pg_pool = pool.ThreadedConnectionPool(
    minconn=5,
    maxconn=20,
    host='localhost',
    port=5432,
    dbname='myapp',
    user='postgres',
    password='secret'
)

def query_db(sql, params=None):
    conn = pg_pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchall()
    finally:
        pg_pool.putconn(conn)

# Always return connections to the pool
results = query_db("SELECT * FROM users WHERE active = %s", (True,))
```

### JavaScript (pg Pool)

```javascript
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'postgres',
  password: 'secret',
  max: 20,              // max connections
  min: 5,               // min connections kept ready
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function queryDb(sql, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

const users = await queryDb('SELECT * FROM users WHERE active = $1', [true]);
```

### Java (HikariCP)

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

HikariConfig config = new HikariConfig();
config.setJdbcUrl("jdbc:postgresql://localhost:5432/myapp");
config.setUsername("postgres");
config.setPassword("secret");
config.setMaximumPoolSize(20);
config.setMinimumIdle(5);
config.setIdleTimeout(30000);
config.setConnectionTimeout(2000);
config.setMaxLifetime(1800000);

HikariDataSource ds = new HikariDataSource(config);

try (Connection conn = ds.getConnection();
     PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE active = ?")) {
    stmt.setBoolean(1, true);
    try (ResultSet rs = stmt.executeQuery()) {
        while (rs.next()) {
            System.out.println(rs.getString("name"));
        }
    }
}
```

## Explanation

A connection pool maintains a set of open database connections. When a request needs a connection, it borrows one from the pool, uses it, and returns it. This eliminates the per-request connection overhead.

**Pool sizing** is the most critical tuning parameter. Too few connections cause requests to queue. Too many connections overwhelm the database. A common formula: `pool_size = (core_count * 2) + effective_spindle_count`.

**Idle timeout** closes connections that haven't been used for a while, freeing database resources during low traffic. **Max lifetime** prevents long-lived connections from accumulating stale state or hitting database-side timeouts.

## Variants

| Pool Library | Language | Key Feature |
|-------------|----------|-------------|
| psycopg2.pool | Python | ThreadedConnectionPool for multi-threaded apps |
| pg Pool | Node.js | Built-in promise support, auto-reconnect |
| HikariCP | Java | Fastest JDBC pool, metrics via Micrometer |
| PgBouncer | External | Server-side pooler, multiplexes connections |

## What Works

1. Size pools based on database capacity, not application thread count
2. Set idle timeout to close unused connections during low traffic periods
3. Monitor pool metrics: active, idle, and waiting connections
4. Use a server-side pooler like PgBouncer for serverless or many small clients
5. Always return connections in a finally block to prevent leaks

## Common Mistakes

1. Setting max pool size too high, overwhelming the database with connections
2. Not returning connections to the pool, causing connection leaks
3. Using the same pool for transactional and read-only queries
4. Not monitoring wait times, letting slow queries block the entire pool
5. Forgetting to set max lifetime, causing stale connections after database restarts

## Frequently Asked Questions

### How many connections should my pool have?

Start with `((core_count * 2) + disk_spindles)` and tune from there. For PostgreSQL, the default `max_connections` is 100. If multiple services connect, divide that budget across them. PgBouncer can multiplex thousands of clients onto a small pool.

### Should I use PgBouncer instead of application-level pooling?

Use both. PgBouncer multiplexes application connections to a smaller set of database connections, which helps with serverless and many small services. Application-level pooling reduces connection latency and gives you per-request metrics.

### How do I detect connection leaks?

Monitor the pool's active count. If it steadily increases and never drops, connections are not being returned. In Java, HikariCP logs leaks after `leakDetectionThreshold` (default 0, set to 60000ms). In Node.js, track `pool.totalCount` vs `pool.idleCount`.

### SQLAlchemy Connection Pool (Python)

```python
from sqlalchemy import create_engine

engine = create_engine(
    "postgresql://user:pass@localhost/mydb",
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True
)

with engine.connect() as conn:
    result = conn.execute("SELECT 1")
    print(result.scalar())
```

- `pool_size`: base number of connections
- `max_overflow`: additional connections allowed beyond `pool_size`
- `pool_timeout`: seconds to wait for a connection before raising an error
- `pool_recycle`: seconds before a connection is recycled (prevents stale connections)
- `pool_pre_ping`: tests connection validity before use (adds slight overhead)

### PgBouncer Server-Side Pooling

```ini
; pgbouncer.ini
[databases]
myapp = host=127.0.0.1 port=5432 dbname=myapp

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3
server_idle_timeout = 600
server_lifetime = 3600
```

```bash
# Start PgBouncer
pgbouncer -d /etc/pgbouncer/pgbouncer.ini

# Connect through PgBouncer (port 6432 instead of 5432)
psql -h localhost -p 6432 -U postgres myapp
```

**Pool modes:**
- `session`: one server connection per client session (default)
- `transaction`: server connection assigned per transaction (recommended for most apps)
- `statement`: server connection assigned per statement (no multi-statement transactions)

### Monitoring Pool Health

```python
# Python: monitor psycopg2 pool
print(f"Current connections: {pg_pool._used}")
print(f"Available: {pg_pool._pool}")
```

```javascript
// Node.js: monitor pg Pool
console.log({
  total: pool.totalCount,
  idle: pool.idleCount,
  waiting: pool.waitingCount
});
```

```java
// Java: monitor HikariCP
HikariPoolMXBean poolProxy = ds.getHikariPoolMXBean();
System.out.println("Active: " + poolProxy.getActiveConnections());
System.out.println("Idle: " + poolProxy.getIdleConnections());
System.out.println("Waiting: " + poolProxy.getThreadsAwaitingConnection());
```

### Pool Sizing Formula

```
pool_size = (core_count * 2) + effective_spindle_count
```

For SSD-only setups with no spinning disks:
```
pool_size = core_count * 2
```

For PostgreSQL with `max_connections = 100` and 4 services:
```
per_service_pool = 100 / 4 = 25 connections
```

## Additional Best Practices


- For a deeper guide, see [Complete Guide to PostgreSQL Tuning](/guides/complete-guide-postgresql-tuning/).

6. **Use `pool_pre_ping` for long-lived connections.** Database restarts or network blips leave stale connections. Pre-ping validates the connection before use, adding ~1ms overhead but preventing errors.

7. **Set `max_lifetime` shorter than database-side timeout.** If the database or firewall kills idle connections at 30 minutes, set `max_lifetime` to 25 minutes:

```python
engine = create_engine(
    "...",
    pool_recycle=1500  # 25 minutes
)
```

8. **Use separate pools for reads and writes.** Route read-only queries to replica pools and writes to the primary pool. This prevents read queries from blocking write transactions.

9. **Configure `statement_timeout` per connection.** Prevent slow queries from holding pool connections indefinitely:

```sql
SET statement_timeout = '30s';
```

10. **Use connection validation queries.** Some pools support validation queries. Use a lightweight query like `SELECT 1` to check connection health:

```java
config.setConnectionTestQuery("SELECT 1");
```

## Additional Common Mistakes

6. **Not configuring `connectionTimeout`.** Without a timeout, requests block indefinitely when the pool is exhausted. Set 2-5 seconds.

7. **Sharing a single pool across async and sync code.** Mixing async frameworks (asyncio, Node.js) with sync pool libraries causes deadlocks. Use async-compatible pools.

8. **Creating multiple pool instances.** Each pool opens its own connections. Multiple pools in one process multiply the connection count and can exceed `max_connections`.

9. **Not draining pools on shutdown.** Failing to close pools on application exit leaves orphaned connections on the database server.

10. **Using `pool_mode = session` in PgBouncer for serverless.** Serverless functions open and close connections rapidly. Use `transaction` mode to multiplex.

## Additional FAQ

### How does PgBouncer transaction pooling affect prepared statements?

Transaction-mode PgBouncer does not support session-level prepared statements. Use `prepared_statement_cache_size = 0` in your driver or switch to `session` mode. PostgreSQL 16+ supports protocol-level prepared statements that work with transaction pooling.

### What is the difference between `pool_size` and `max_overflow` in SQLAlchemy?

`pool_size` is the number of persistent connections. `max_overflow` allows temporary connections beyond `pool_size` under load. When traffic drops, overflow connections are closed first.

### How do I handle connection pooling in serverless environments?

Use PgBouncer or a managed proxy (AWS RDS Proxy, PlanetScale Proxy). Serverless functions scale to hundreds of concurrent instances, each needing a connection. A server-side pooler multiplexes these onto a small fixed pool.

### Should I set `min_idle` connections?

Yes, for latency-sensitive applications. Keeping 2-5 idle connections warm eliminates the 20-100ms connection setup cost for the first requests after idle periods.

## Performance Tips

1. **Monitor `pg_stat_activity` for connection counts.** Track how many connections each application uses:

```sql
SELECT application_name, state, COUNT(*)
FROM pg_stat_activity
GROUP BY application_name, state
ORDER BY count DESC;
```

2. **Use `pg_stat_statements` to find queries holding connections.** Long-running queries occupy pool connections. Identify them:

```sql
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

3. **Benchmark pool sizes with load testing.** Use `pgbench` or `wrk` to find the optimal pool size for your workload:

```bash
pgbench -c 20 -j 4 -T 60 -h localhost -p 5432 mydb
```

4. **Use `LISTEN/NOTIFY` with a dedicated connection.** PostgreSQL `LISTEN` holds a connection. Use a separate pool or a single dedicated connection for event listeners.

5. **Tune `work_mem` per connection.** Each connection allocates `work_mem` for sorts and hashes. With 20 connections and `work_mem = 64MB`, that's 1.28GB just for sort memory.
