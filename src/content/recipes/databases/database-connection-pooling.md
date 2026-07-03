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
  - /recipes/databases/postgres-query-optimization
  - /recipes/databases/database-transactions
  - /guides/databases/database-normalization-guide
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
