---



contentType: recipes
slug: connect-to-postgresql
title: "Connect to PostgreSQL"
description: "How to connect to PostgreSQL databases in Python, JavaScript, and Java."
metaDescription: "Learn how to connect to PostgreSQL databases using Python psycopg2, Node.js pg, and Java JDBC with practical code examples."
difficulty: beginner
topics:
  - databases
tags:
  - databases
  - postgresql
  - python
  - javascript
  - java
  - jdbc
relatedResources:
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
  - /patterns/ambassador-pattern
  - /patterns/bridge-pattern
  - /patterns/builder-pattern
  - /recipes/connect-to-mysql
  - /recipes/connect-to-redis
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Learn how to connect to PostgreSQL databases using Python psycopg2, Node.js pg, and Java JDBC with practical code examples."
  keywords:
    - databases
    - postgresql
    - python
    - javascript
    - java
    - jdbc



---
## Overview

PostgreSQL is the most popular open-source relational database. Connecting to it reliably requires handling connection strings, SSL, and connection pooling. Below is the idiomatic way to how to connect and query PostgreSQL in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Building web applications that persist data to PostgreSQL
- Migrating from SQLite or MySQL to PostgreSQL
- Setting up data pipelines that read from or write to PostgreSQL

## Solution

### Python

```python
import psycopg2
from psycopg2.extras import RealDictCursor

# Basic connection
conn = psycopg2.connect(
    host="localhost",
    database="mydb",
    user="user",
    password="pass",
    sslmode="require"
)

cursor = conn.cursor(cursor_factory=RealDictCursor)
cursor.execute("SELECT * FROM users WHERE id = %s", (1,))
row = cursor.fetchone()
cursor.close()
conn.close()
```

### JavaScript

```javascript
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    database: 'mydb',
    user: 'user',
    password: 'pass',
    ssl: { rejectUnauthorized: false },
    max: 20
});

async function getUser(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
}
```

### Java

```java
import java.sql.*;

public class PostgresConnect {
    public Connection connect() throws SQLException {
        String url = "jdbc:postgresql://localhost:5432/mydb?sslmode=require";
        return DriverManager.getConnection(url, "user", "pass");
    }

    public void queryUser(int id) throws SQLException {
        try (Connection conn = connect();
             PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE id = ?")) {
            stmt.setInt(1, id);
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                System.out.println(rs.getString("email"));
            }
        }
    }
}
```

## Explanation

All three examples use **prepared statements** (parameterized queries) to prevent SQL injection. The **Python** example uses `psycopg2`, the standard PostgreSQL adapter. The **JavaScript** example uses `pg` with a connection pool, which reuses connections across requests. The **Java** example uses JDBC, the standard Java database API, with `try-with-resources` to ensure connections close automatically.

## Variants

| Technology | Approach | Notes |
|------------|----------|-------|
| Python | `asyncpg` | Async PostgreSQL driver for asyncio |
| JavaScript | `pg-promise` | Helper library with transactions and tasks |
| Java | `HikariCP` | High-performance JDBC connection pool |

## What Works

1. Always use connection pools in production rather than creating connections per request
2. Store credentials in environment variables or secret managers, never in code
3. Use SSL (`sslmode=require`) for all production connections
4. Prefer prepared statements over string concatenation for live values
5. Close cursors and connections explicitly or use context managers

## Common Mistakes

1. Hardcoding database credentials in source code
2. Creating a new connection for every query instead of using a pool
3. Forgetting to close connections, causing "too many connections" errors
4. Disabling SSL verification in production (`sslmode=disable`)
5. Using Python f-strings or JS template literals for SQL queries

## Frequently Asked Questions

### What is the difference between psycopg2 and psycopg3?

`psycopg2` is the mature, stable driver. `psycopg3` (now just `psycopg`) adds async support, better type handling, and is the recommended choice for new projects.

### How many connections should my pool have?

A good starting point is `(2 x CPU cores) + effective_spindle_count` for the database, divided by the number of app instances. Monitor `pg_stat_activity` and adjust.

### Should I use `sslmode=require` or `verify-full`?

Use `verify-full` when you have the CA certificate and want to verify the server identity. Use `require` when you need encryption but do not have or trust the CA chain.

### Python with context manager and connection pool

```python
import psycopg2
from psycopg2 import pool
from contextlib import contextmanager

# Create a connection pool
pg_pool = pool.SimpleConnectionPool(
    minconn=1,
    maxconn=10,
    host="localhost",
    database="mydb",
    user="user",
    password="pass",
    sslmode="require"
)

@contextmanager
def get_db_cursor():
    conn = pg_pool.getconn()
    try:
        cursor = conn.cursor()
        yield cursor
        conn.commit()
        cursor.close()
    except Exception:
        conn.rollback()
        raise
    finally:
        pg_pool.putconn(conn)

# Usage
with get_db_cursor() as cur:
    cur.execute("SELECT * FROM users WHERE active = %s", (True,))
    rows = cur.fetchall()
    for row in rows:
        print(row)
```

### Python async with asyncpg

```python
import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect(
        host="localhost",
        database="mydb",
        user="user",
        password="pass",
        ssl="require"
    )

    # Parameterized query
    row = await conn.fetchrow(
        "SELECT * FROM users WHERE id = $1", 1
    )
    print(row)

    # Batch insert
    await conn.executemany(
        "INSERT INTO logs (level, message) VALUES ($1, $2)",
        [("INFO", "startup"), ("WARN", "high latency")]
    )

    await conn.close()

asyncio.run(main())
```

### JavaScript with transaction handling

```javascript
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    database: 'mydb',
    user: 'user',
    password: 'pass',
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

async function transferBalance(fromId, toId, amount) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
            [amount, fromId]
        );

        await client.query(
            'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
            [amount, toId]
        );

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
```

### Java with HikariCP connection pool

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.*;

public class PostgresPool {
    private static final HikariDataSource ds;

    static {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:postgresql://localhost:5432/mydb");
        config.setUsername("user");
        config.setPassword("pass");
        config.addDataSourceProperty("sslmode", "require");
        config.setMaximumPoolSize(20);
        config.setMinimumIdle(5);
        config.setIdleTimeout(30000);
        config.setConnectionTimeout(5000);
        ds = new HikariDataSource(config);
    }

    public static Connection getConnection() throws SQLException {
        return ds.getConnection();
    }

    public static void batchInsert(List<String> emails) throws SQLException {
        try (Connection conn = getConnection();
             PreparedStatement stmt = conn.prepareStatement(
                 "INSERT INTO users (email) VALUES (?)")) {
            for (String email : emails) {
                stmt.setString(1, email);
                stmt.addBatch();
            }
            stmt.executeBatch();
        }
    }
}
```

## Additional Variants

| Technology | Driver | Async | Pooling | Notes |
|------------|--------|-------|---------|-------|
| Python | `psycopg2` | No | Manual or `SimpleConnectionPool` | Mature, stable |
| Python | `psycopg3` | Yes | Built-in | Recommended for new projects |
| Python | `asyncpg` | Yes | Built-in | Fastest async driver |
| JavaScript | `pg` | Yes (Promise) | `Pool` built-in | Standard Node.js driver |
| JavaScript | `pg-promise` | Yes | Built-in | Extra helpers for tasks |
| Java | JDBC | No | HikariCP | Industry standard |
| Go | `pgx` | Yes | `pgxpool` | High performance |

## Additional Best Practices


- For a deeper guide, see [Connect to MySQL](/recipes/connect-to-mysql/).

6. **Set `idle_timeout` on connections.** Idle connections can become stale after a database restart or network issue. Set a timeout to recycle them automatically.
7. **Use `application_name` for debugging.** Set `application_name` in the connection string to identify your application in `pg_stat_activity`:

```python
conn = psycopg2.connect(
    host="localhost",
    database="mydb",
    user="user",
    password="pass",
    application_name="my-api-server"
)
```

8. **Enable `statement_timeout` at the session level.** Prevent runaway queries from consuming resources:

```sql
SET statement_timeout = '10s';
```

9. **Use `COPY` for bulk inserts.** `COPY` is 10-100x faster than individual `INSERT` statements for large datasets:

```python
import io

buf = io.StringIO()
buf.write("1\talice@example.com\n")
buf.write("2\tbob@example.com\n")
buf.seek(0)

with psycopg2.connect(...) as conn:
    with conn.cursor() as cur:
        cur.copy_from(buf, "users", columns=("id", "email"))
```

10. **Monitor pool health.** Track active connections, waiting threads, and connection lifetime. In HikariCP, use `getHikariPoolMXBean()` to expose metrics.

## Additional Common Mistakes

6. **Not handling connection drops.** Network issues or database restarts can invalidate connections. Use retry logic or a pool with health checks.
7. **Using `SELECT *` in production code.** Explicit column lists prevent breakage when schema changes and reduce network overhead.
8. **Not setting `serverTimezone` or `timezone` parameters.** Timezone mismatches cause subtle bugs with `TIMESTAMPTZ` columns.
9. **Ignoring `pg_stat_activity`.** Long-idle connections waste resources. Monitor and kill idle connections that exceed your timeout.
10. **Using autocommit for multi-statement operations.** Without explicit transactions, partial failures leave data in an inconsistent state.

## Additional FAQ

### How do I handle connection failures gracefully?

Implement retry logic with exponential backoff. In Python, use `tenacity` or a similar library. In Node.js, use `p-retry`. Always set a maximum retry count to avoid infinite loops:

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
def query_with_retry(sql, params):
    with get_db_cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()
```

### What is connection multiplexing?

Connection multiplexing allows multiple logical sessions to share a single database connection. PgBouncer provides this for PostgreSQL. Use `transaction mode` for most applications, where each transaction gets a connection from the pool.

### How do I debug slow queries?

Enable `log_min_duration_statement` in PostgreSQL to log queries slower than a threshold:

```sql
ALTER SYSTEM SET log_min_duration_statement = '100ms';
SELECT pg_reload_conf();
```

Then check the PostgreSQL log file for slow query entries. Use `EXPLAIN ANALYZE` to inspect the query plan.
