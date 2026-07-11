---
contentType: patterns
slug: serverless-db-connection-pooling-pattern
title: "Serverless DB Connection Pooling Pattern"
description: "Manage database connections across serverless invocations by using external connection poolers, connection reuse, and lightweight clients to avoid connection exhaustion."
metaDescription: "Manage database connections in serverless functions using external poolers like PgBouncer. Avoid connection exhaustion from concurrent Lambda invocations."
difficulty: intermediate
topics:
  - serverless
  - databases
  - infrastructure
tags:
  - serverless-db-pooling
  - pattern
  - design-pattern
  - connection-pooling
  - pgbouncer
  - rds-proxy
  - lambda
relatedResources:
  - /patterns/design/serverless-throttling-pattern
  - /patterns/design/serverless-warm-pool-pattern
  - /patterns/design/serverless-function-composition-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Manage database connections in serverless functions using external poolers like PgBouncer. Avoid connection exhaustion from concurrent Lambda invocations."
  keywords:
    - serverless database connection pooling
    - pgbouncer lambda
    - rds proxy
    - connection pool serverless
    - pattern design
---

## Overview

Serverless functions scale horizontally by spawning many concurrent instances. Each instance may open its own database connection, and during traffic spikes you can have hundreds of simultaneous connections. Most databases cap connections at a few hundred or thousand. When you exceed that limit, new connections fail and the entire system degrades.

The Serverless DB Connection Pooling pattern solves this by placing an external connection pooler between your functions and the database. The pooler maintains a small set of persistent connections to the database and multiplexes function requests across them.

## When to Use

- You run serverless functions (Lambda, Cloud Functions, Azure Functions) that connect to a relational database
- You see `connection refused` or `too many connections` errors during traffic spikes
- Your database connection count scales linearly with concurrent invocations
- You use PostgreSQL or MySQL with AWS RDS, Aurora, Cloud SQL, or similar managed databases

## Solution

### Python (AWS Lambda + PgBouncer)

```python
import os
import psycopg2
from contextlib import contextmanager

# Connect through PgBouncer (transaction pooling mode)
# PgBouncer runs as a sidecar or managed service (RDS Proxy)
DB_HOST = os.environ.get("DB_HOST", "pgbouncer.internal")
DB_PORT = int(os.environ.get("DB_PORT", 6432))
DB_NAME = os.environ.get("DB_NAME", "appdb")
DB_USER = os.environ.get("DB_USER", "appuser")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "secret")

# Reuse connection across warm invocations
_connection = None

def get_connection():
    global _connection
    if _connection is None or _connection.closed:
        _connection = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            connect_timeout=3,
            application_name="lambda",
        )
    return _connection

@contextmanager
def db_cursor():
    conn = get_connection()
    try:
        cur = conn.cursor()
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()

def handler(event, context):
    with db_cursor() as cur:
        cur.execute("SELECT id, name FROM users WHERE active = TRUE LIMIT 10")
        rows = cur.fetchall()
    return {"statusCode": 200, "body": str(rows)}
```

### JavaScript (AWS Lambda + RDS Proxy)

```javascript
import pg from "pg";

const { Pool } = pg;

// RDS Proxy endpoint handles pooling automatically
// Set max to 1 per Lambda instance — RDS Proxy multiplexes
const pool = new Pool({
  host: process.env.DB_HOST, // RDS Proxy endpoint
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 1, // One connection per Lambda container
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

export const handler = async (event) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, name FROM users WHERE active = TRUE LIMIT 10"
    );
    return { statusCode: 200, body: JSON.stringify(result.rows) };
  } finally {
    client.release();
  }
};
```

### Java (AWS Lambda + HikariCP + PgBouncer)

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class DbHandler {
    private static HikariDataSource dataSource;

    static {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(
            "jdbc:postgresql://" + System.getenv("DB_HOST") + ":6432/appdb"
        );
        config.setUsername(System.getenv("DB_USER"));
        config.setPassword(System.getenv("DB_PASSWORD"));
        config.setMaximumPoolSize(1); // One per Lambda instance
        config.setConnectionTimeout(3000);
        config.setIdleTimeout(30000);
        // PgBouncer transaction pooling — disable prepared statements
        config.addDataSourceProperty("prepareThreshold", "0");
        dataSource = new HikariDataSource(config);
    }

    public String handleRequest(Object event, Object context) {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                 "SELECT id, name FROM users WHERE active = TRUE LIMIT 10")) {
            ResultSet rs = ps.executeQuery();
            StringBuilder sb = new StringBuilder();
            while (rs.next()) {
                sb.append(rs.getInt("id")).append(":").append(rs.getString("name")).append("\n");
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("DB query failed", e);
        }
    }
}
```

## Explanation

The core idea is to decouple connection count from invocation count. Without a pooler, 500 concurrent Lambda invocations create 500 database connections. With a pooler like PgBouncer or RDS Proxy, those 500 invocations share 20-50 pooled connections.

**PgBouncer** sits between your functions and the database. It accepts many client connections and routes their queries through a small pool of server connections. In **transaction pooling mode**, PgBouncer assigns a server connection only for the duration of a transaction, then returns it to the pool.

**AWS RDS Proxy** is a managed connection pooler that does the same thing without infrastructure management. It handles failover, connection reuse, and secret rotation automatically.

**Connection reuse across warm invocations**: Lambda reuses execution environments between invocations. By keeping a connection open at module scope, warm invocations skip the connection setup cost entirely. Cold starts still pay the full connection cost, but a pooler makes that connection cheap because it multiplexes.

## Variants

| Variant | Tool | Use Case | Tradeoff |
|---------|------|----------|----------|
| **External Pooler** | PgBouncer, Pgpool | Self-managed databases | Full control, requires ops |
| **Managed Proxy** | RDS Proxy, Aurora Serverless | AWS managed databases | Zero ops, AWS-only, extra cost |
| **HTTP Data API** | Aurora Data API, PlanetScale HTTP API | No persistent connections at all | No TCP connection needed, higher latency per query |
| **Connectionless** | DynamoDB, FaunaDB | NoSQL serverless-native | No pooling needed, different query model |

## What Works

- Set `max=1` connection per Lambda instance — the pooler handles multiplexing
- Use transaction pooling mode in PgBouncer for highest efficiency
- Disable prepared statement caching when using PgBouncer (it breaks in transaction mode)
- Keep connections at module scope to reuse across warm invocations
- Set aggressive connect timeouts (3-5 seconds) to fail fast
- Use RDS Proxy for managed databases to avoid running PgBouncer yourself
- Monitor database connection count and set alarms at 70% of max

## Common Mistakes

- **Opening a new connection per request**: Causes connection exhaustion under load. Reuse connections at module scope.
- **Using session pooling with PgBouncer**: Session pooling holds server connections for the entire client session, defeating the purpose. Use transaction pooling.
- **Forgetting to close connections on error**: Leaks connections. Always use try/finally or context managers.
- **Setting `max` too high in HikariCP**: Each Lambda container is a separate process. 100 containers × 10 connections = 1000 connections. Keep `max=1`.
- **Using prepared statements with PgBouncer transaction mode**: Prepared statements are session-scoped and break when PgBouncer reassigns server connections. Set `prepareThreshold=0`.
- **Not handling cold start connection latency**: Cold starts pay full connection cost. Use provisioned concurrency or accept the latency hit.

## FAQ

### Should I use RDS Proxy or PgBouncer?

RDS Proxy if you are on AWS and want zero ops. PgBouncer if you need more control, run outside AWS, or want to save on RDS Proxy costs.

### Can I use connection pooling with Aurora Serverless?

Aurora Serverless v2 supports the Data API, which is HTTP-based and needs no connection pooling. For standard JDBC/ODBC connections, use RDS Proxy.

### How many connections should my database allow?

A rough formula: `max_connections = (available_memory / (work_mem + overhead))`. For PostgreSQL on a db.r6g.large (16GB), 100-200 connections is reasonable. With a pooler, you need far fewer.

### Does this pattern apply to NoSQL databases?

DynamoDB and similar serverless-native databases use HTTP APIs and do not need connection pooling. MongoDB and Redis do benefit from pooling in serverless environments.


## Advanced Topics

### Scenario: Connection Pooling in AWS Lambda

```typescript
// Serverless DB pooling: reuse connections across invocations
// Problem: Lambda creates a new instance per cold start
// Solution: global pool reused across invocations

import { Pool } from "pg";

// Declare outside handler: persists across warm invocations
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 10,           // max connections per Lambda instance
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    console.log("[POOL] Created new pool");
  }
  return pool;
}

export const handler = async (event: APIGatewayEvent) => {
  const pool = getPool();
  try {
    const res = await pool.query("SELECT * FROM users WHERE id = $1", [event.pathParameters.id]);
    return { statusCode: 200, body: JSON.stringify(res.rows[0]) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

// Strategies for serverless
  | Strategy | Description | Pros | Cons |
  |----------|-------------|------|------|
  | Global pool | Pool outside handler | Reuses warm connections | Cold start creates pool |
  | RDS Proxy | AWS-managed proxy | Connection pooling, failover | Additional cost |
  | Data API | HTTP-based, no connections | No pooling needed | Aurora PostgreSQL/MySQL only |
  | PgBouncer | External proxy | Efficient pooling | Extra infra |
  | Prisma Data Proxy | Managed proxy | No direct connections | Requires Prisma |

// Recommended config per environment
  | Environment | Strategy | Max conns | Reason |
  |-------------|----------|-----------|--------|
  | Lambda + RDS | RDS Proxy | 50-100 | Avoid saturating DB |
  | Lambda + Aurora | Data API | N/A | HTTP, no pooling |
  | Lambda + PgBouncer | Global pool | 5-10 | Reuse warm |
  | ECS/Fargate | Global pool | 20-50 | Long-running process |
  | EC2 | Global pool | 50-100 | Persistent process |
```

Lessons:
  - In serverless, declare pool outside the handler
  - Warm invocations reuse the pool; cold starts create it
  - RDS Proxy is the managed solution for Lambda + RDS
  - Data API eliminates the problem: HTTP instead of TCP
  - Max conns per Lambda: 5-10 (do not saturate DB)
  - Monitor: connections, idle, waiting in RDS
```

### How do I diagnose connection exhaustion in serverless?

Symptoms: "too many connections" errors, query timeouts, Lambda errors. Diagnosis: check CloudWatch for active RDS connections. If there are N concurrent Lambdas with M conns each, total is N*M. Solution: RDS Proxy (manages global pool), reduce max conns per Lambda, or migrate to Data API. Set CloudWatch alarms for DatabaseConnections > 80% of max.
