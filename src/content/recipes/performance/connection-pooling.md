---
contentType: recipes
slug: connection-pooling
title: "Set Up Connection Pooling for Databases and HTTP Clients"
description: "Set up connection pooling for PostgreSQL, MySQL, Redis, and HTTP clients in Python, JavaScript, and Java. Reduce latency and avoid connection exhaustion."
metaDescription: "Set up connection pooling for PostgreSQL, MySQL, Redis, and HTTP clients in Python, JavaScript, and Java. Reduce latency and avoid connection exhaustion."
difficulty: intermediate
topics:
  - performance
tags:
  - performance
  - database
  - connection-pooling
  - postgresql
  - redis
  - http-client
  - optimization
relatedResources:
  - /guides/sql-performance-tuning-guide
  - /guides/performance-optimization-guide
  - /recipes/database-indexing
  - /recipes/query-optimization
  - /patterns/cache-aside-pattern
  - /recipes/redis-cache-patterns
lastUpdated: "2026-08-23"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Set up connection pooling for PostgreSQL, MySQL, Redis, and HTTP clients in Python, JavaScript, and Java. Reduce latency and avoid connection exhaustion."
  keywords:
    - connection pooling
    - postgresql
    - hikari
    - redis
    - http client
    - performance
---

## Overview

Opening a new database or HTTP connection for every request is expensive. The TCP handshake, TLS
negotiation, and database authentication add latency and burn CPU on both sides. Connection pooling keeps
a reusable set of already established connections so your code borrows one, runs a query or API call, and
returns it. The payoff is lower latency, higher throughput, and far fewer "too many connections" errors.

We cover database pools for PostgreSQL, MySQL, and Redis, plus HTTP client pooling in Python, JavaScript,
and Java.

## When to Use

Use connection pooling when your application opens a new connection per request and throughput is lagging,
when you're hitting "too many connections" errors under load, when you make frequent outbound HTTP calls
and want to reuse TCP, or when you need to cap concurrency to protect a database or remote service.

## When to Avoid

Skip it when a short-lived script runs one query and exits, because the pool overhead isn't worth it.
Also skip it if your driver or HTTP client already manages persistent connections transparently, or if
you're on a serverless platform with strict connection lifetime limits.

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
const http = require('http');
const https = require('https');

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 20 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 20 });

const api = axios.create({ httpAgent, httpsAgent });

api.get('https://api.example.com/data')
  .then(res => console.log(res.data));
```

### Java

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.*;
import okhttp3.ConnectionPool;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import java.util.concurrent.TimeUnit;

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

int userId = 1;
try (Connection conn = ds.getConnection();
     PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE id = ?")) {
    ps.setInt(1, userId);
    ResultSet rs = ps.executeQuery();
    while (rs.next()) {
        System.out.println(rs.getString("name"));
    }
}

// HTTP client with a bounded connection pool
OkHttpClient httpClient = new OkHttpClient.Builder()
    .connectionPool(new ConnectionPool(20, 5, TimeUnit.MINUTES))
    .connectTimeout(5, TimeUnit.SECONDS)
    .build();

Request request = new Request.Builder()
    .url("https://api.example.com/data")
    .build();

httpClient.newCall(request).execute();
```

## Explanation

A connection pool is a bounded queue of established TCP connections. When your code asks for one, the pool
hands over an idle connection instead of opening a new socket. When the work is done, the connection goes
back to the pool instead of being closed, so most operations skip the handshake and authentication cost.

A few levers matter. The minimum size keeps connections warm so the first request isn't slow. The maximum
size is the ceiling that stops the pool from overwhelming the database or remote server. The connection
timeout decides how long a caller waits before giving up. The idle timeout closes unused connections after
they sit around. The max lifetime caps how old a connection can get before it's replaced, which avoids
stale sockets and makes credential rotation easier.

For HTTP clients, `keep-alive` reuses the underlying TCP connection across requests to the same host, saving
the TLS handshake on every call. If the database is still the bottleneck after tuning the pool, the next
steps are usually query and schema work. See [database indexing](/recipes/database-indexing/) and
[query optimization](/recipes/query-optimization/).

## Variants

| Technology | Approach | Notes |
| ------------ | ---------- | ------- |
| **PostgreSQL** | `psycopg2.pool` / `pg` / HikariCP | Threaded or async pools; match size to concurrency |
| **MySQL** | `mysql-connector-python` / `mysql2` / HikariCP | Watch `wait_timeout` and `max_connections` |
| **Redis** | `redis-py` connection pool / `ioredis` / Lettuce | Fast, but pool still matters at high concurrency |
| **HTTP (Python)** | `requests.Session` + `HTTPAdapter` | `pool_maxsize` controls per-host connections |
| **HTTP (Node)** | `axios` + `http.Agent` | `maxSockets` controls parallel connections |
| **HTTP (Java)** | OkHttp `ConnectionPool` / Apache HttpClient | Built-in managers with per-route limits |

## Best Practices

Size the pool to your actual concurrency, not the number of CPU cores. Start with the number of concurrent
workers plus a small buffer and adjust from there. Always release connections in a `finally` block so they go
back to the pool even when an exception is thrown. Keep `connectionTimeout` lower than your application's
end-to-end request timeout so you fail fast instead of hanging. Monitor active, idle, waiting, and total
connections; queueing usually means the pool is too small or the database is saturated. Enable prepared
statement caching at the pool level when available, such as HikariCP `cachePrepStmts`. Use TLS for database
and service-to-service HTTP connections, but keep a reasonable idle timeout to close stale sockets. For a
broader performance strategy, see the
[performance optimization guide](/guides/performance-optimization-guide/).

## Common Mistakes

Not releasing connections is the biggest one: a leaked connection eventually empties the pool and blocks every
request. A pool size of 1 serializes all database access and kills throughput. A pool that's too large can
overwhelm the database `max_connections` limit and waste memory. Ignoring idle timeouts leads to stale
connections and silent failures. Disabling HTTP keep-alive wastes milliseconds and CPU by reopening TLS for
every outbound request. Sharing one pool across unrelated databases couples traffic and makes tuning
impossible; use one pool per database and per application instance.

## FAQ

### What is the optimal pool size?

For OLTP workloads, start with `(core_count * 2) + effective_spindle_count`. In cloud or containerized
environments, match the pool size to application concurrency instead of CPU cores. Watch `waiting` metrics
and bump the size only when connections start queueing.

### Should I use one pool or many?

One pool per database per application instance is the usual approach. Several pools to the same database
fragment resources and reduce efficiency. In a microservices setup, each service owns its own pool.

### How do I handle pool exhaustion?

Keep `connectionTimeout` short so requests fail fast instead of hanging forever. Add circuit breakers or
retries with backoff. Monitor pool saturation and scale the database or application workers before
exhaustion becomes critical.

### What about HTTP connection pooling?

HTTP keep-alive and bounded connection pools let you reuse TLS connections to the same host. It pays off
when your service keeps calling the same few downstream APIs. Set `pool_maxsize` or `maxSockets` high
enough for your concurrency, but not so high that you exhaust ephemeral ports.
