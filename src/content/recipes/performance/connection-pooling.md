---
contentType: recipes
slug: connection-pooling
title: "Set Up Connection Pooling for Databases and HTTP Clients"
description: "How to set up connection pooling for databases and HTTP clients to improve performance and reliability"
metaDescription: "Set up connection pooling for PostgreSQL, MySQL, Redis, and HTTP clients. Improve throughput, reduce latency, and prevent connection exhaustion."
difficulty: intermediate
topics:
  - performance
tags:
  - connection-pooling
  - database
  - postgresql
  - redis
  - http-client
  - performance
relatedResources:
  - /guides/sql-performance-tuning-guide
  - /guides/performance-optimization-guide
  - /recipes/cdn-edge-caching
  - /recipes/debounce-throttle
  - /patterns/cache-aside-pattern
lastUpdated: "2026-06-12"
author: "StackPractices"
seo:
  metaDescription: "Set up connection pooling for PostgreSQL, MySQL, Redis, and HTTP clients. Improve throughput, reduce latency, and prevent connection exhaustion."
  keywords:
    - connection-pooling
    - database
    - postgresql
    - redis
    - http-client
    - performance
---
## Overview

Opening a new database or HTTP connection for every request is expensive. Connection pooling maintains a reusable set of established connections, dramatically reducing latency and preventing resource exhaustion under load. Most production incidents related to "too many connections" are solved by proper pool configuration.

This recipe covers database connection pooling with PostgreSQL, MySQL, and Redis, plus HTTP client pooling for outbound API calls.

## When to Use

Use this resource when:
- Your application opens a new connection per request and throughput is lagging
- You hit "too many connections" errors under load
- You make frequent outbound HTTP API calls and want to reuse TCP connections
- You need to tune concurrency limits for a web service or worker

## Solution

### Python

```python
import psycopg2
from psycopg2 import pool
import requests
from requests.adapters import HTTPAdapter

# PostgreSQL connection pool
pg_pool = psycopg2.pool.ThreadedConnectionPool(
    minconn=5,
    maxconn=20,
    host="localhost",
    database="app",
    user="app",
    password="secret"
)

def get_user(user_id: int):
    conn = pg_pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            return cur.fetchone()
    finally:
        pg_pool.putconn(conn)

# HTTP client connection pooling
session = requests.Session()
adapter = HTTPAdapter(pool_connections=10, pool_maxsize=20)
session.mount("https://", adapter)
session.mount("http://", adapter)

resp = session.get("https://api.example.com/data")
```

### JavaScript

```javascript
const { Pool } = require('pg');
const axios = require('axios');

// PostgreSQL connection pool
const pgPool = new Pool({
  host: 'localhost',
  database: 'app',
  user: 'app',
  password: 'secret',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function getUser(userId) {
  const client = await pgPool.connect();
  try {
    const result = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0];
  } finally {
    client.release();
  }
}

// HTTP client with keep-alive
const httpAgent = new (require('http').Agent)({ keepAlive: true, maxSockets: 20 });
const httpsAgent = new (require('https').Agent)({ keepAlive: true, maxSockets: 20 });

const api = axios.create({ httpAgent, httpsAgent });
```

### Java

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.*;

// HikariCP — the gold standard for JVM connection pooling
HikariConfig config = new HikariConfig();
config.setJdbcUrl("jdbc:postgresql://localhost/app");
config.setUsername("app");
config.setPassword("secret");
config.setMaximumPoolSize(20);
config.setMinimumIdle(5);
config.setConnectionTimeout(2000);
config.setIdleTimeout(30000);
config.addDataSourceProperty("cachePrepStmts", "true");

HikariDataSource ds = new HikariDataSource(config);

try (Connection conn = ds.getConnection();
     PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE id = ?")) {
    ps.setInt(1, userId);
    ResultSet rs = ps.executeQuery();
    while (rs.next()) {
        System.out.println(rs.getString("name"));
    }
}

// HTTP client with connection pooling (Java 11+)
HttpClient client = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(5))
    .build();
```

## Explanation

Connection pooling works by maintaining a bounded queue of already-established TCP connections. When your code requests a connection, the pool hands out an idle one instead of opening a new socket. When the operation completes, the connection is returned to the pool rather than closed.

**Key pool parameters:**
- **min connections**: Pre-warmed connections ready at startup
- **max connections**: Hard ceiling to protect the database or remote server
- **connection timeout**: How long to wait for an available connection before failing
- **idle timeout**: How long to keep an unused connection open before closing

For HTTP clients, `keep-alive` reuses the underlying TCP connection across multiple requests to the same host, eliminating the TLS handshake overhead on every call.

## Variants

| Technology | Approach | Notes |
|------------|----------|-------|
| PostgreSQL | psycopg2.pool / pg / HikariCP | ThreadedConnectionPool for threads, AsyncConnectionPool for asyncio |
| MySQL | mysql-connector-python / mysql2 / HikariCP | Same pool concepts, watch for `wait_timeout` server setting |
| Redis | redis-py connection pool / ioredis / Lettuce | Redis is fast, but pool still matters at high concurrency |
| HTTP (Python) | requests Session + HTTPAdapter | `pool_maxsize` controls per-host connections |
| HTTP (Node) | axios + http.Agent | `maxSockets` controls parallel connections |
| HTTP (Java) | Apache HttpClient / OkHttp | Built-in connection managers with per-route limits |

## Best Practices

1. Set `max pool size` to roughly the number of concurrent workers (threads, processes, or event loop concurrency)
2. Always `release()` or `putconn()` connections in a `finally` block to prevent leaks
3. Set `connectionTimeout` lower than your application's overall request timeout
4. Monitor pool metrics: active, idle, waiting, and total connections
5. Use prepared statement caching at the pool level when available (e.g., HikariCP `cachePrepStmts`)

## Common Mistakes

1. **Not releasing connections** — always return connections to the pool, even on exceptions
2. **Pool size = 1** — serializes all database access and kills throughput
3. **Pool too large** — can overwhelm the database with `max_connections` limits
4. **Ignoring idle timeouts** — stale connections cause silent failures or half-open sockets
5. **No HTTP keep-alive** — reopening TLS for every outbound request wastes milliseconds

## Frequently Asked Questions

### What is the optimal pool size?

A good starting point is `(core_count * 2) + effective_spindle_count` for OLTP workloads. For cloud databases, match pool size to application concurrency, not CPU cores. Monitor `waiting` metrics and increase only if connections queue up.

### Should I use one pool or many?

One pool per database per application instance is standard. Creating multiple pools to the same database fragments resources and reduces efficiency. For microservices, each service manages its own pool.

### How do I handle pool exhaustion?

Set a reasonable `connectionTimeout` so requests fail fast instead of hanging indefinitely. Add circuit breakers or retries with backoff. Monitor pool saturation and scale the database or application workers before exhaustion becomes critical.
