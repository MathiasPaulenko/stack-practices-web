---
contentType: recipes
slug: connect-to-mysql
title: "Connect to MySQL"
description: "How to connect to MySQL databases in Python, JavaScript, and Java."
metaDescription: "Learn how to connect to MySQL databases using Python mysql-connector, Node.js mysql2, and Java JDBC with practical code examples."
difficulty: beginner
topics:
  - databases
tags:
  - databases
  - mysql
  - python
  - javascript
  - java
  - jdbc
relatedResources:
  - /recipes/connect-to-postgresql
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
  - /patterns/ambassador-pattern
  - /patterns/bridge-pattern
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Learn how to connect to MySQL databases using Python mysql-connector, Node.js mysql2, and Java JDBC with practical code examples."
  keywords:
    - databases
    - mysql
    - python
    - javascript
    - java
    - jdbc
---
## Overview

MySQL remains one of the most widely deployed relational databases. Whether running locally, on AWS RDS, or in a managed cluster, connecting securely and efficiently is critical. Below is a practical approach to MySQL connections with connection pooling, SSL, and prepared statements in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Developing applications that use MySQL as the primary data store
- Migrating from MariaDB or switching from PostgreSQL to MySQL
- Writing scripts that import or export data from MySQL databases

## Solution

### Python

```python
import mysql.connector
from mysql.connector import Error

# Basic connection
conn = mysql.connector.connect(
    host="localhost",
    database="mydb",
    user="user",
    password="pass",
    ssl_ca="ca.pem",
    ssl_verify_cert=True
)

cursor = conn.cursor(dictionary=True)
cursor.execute("SELECT * FROM users WHERE id = %s", (1,))
row = cursor.fetchone()
cursor.close()
conn.close()
```

### JavaScript

```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    database: 'mydb',
    user: 'user',
    password: 'pass',
    ssl: { ca: require('fs').readFileSync('ca.pem') },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function getUser(id) {
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
}
```

### Java

```java
import java.sql.*;

public class MySQLConnect {
    public Connection connect() throws SQLException {
        String url = "jdbc:mysql://localhost:3306/mydb?sslMode=VERIFY_CA&serverTimezone=UTC";
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

MySQL uses **prepared statements** through protocol-level placeholders (`%s` in Python, `?` in Java, `?` in mysql2). **Connection pooling** is essential because MySQL connections are relatively expensive to establish. The **JavaScript** `mysql2/promise` pool handles queuing when all connections are in use. The **Java** example uses the modern `com.mysql.cj.jdbc.Driver` (MySQL Connector/J) with timezone and SSL verification settings in the JDBC URL.

## Variants

| Technology | Approach | Notes |
|------------|----------|-------|
| Python | `PyMySQL` | Pure Python implementation, no C dependencies |
| JavaScript | `mysql` (non-promise) | Callback-based legacy driver |
| Java | `HikariCP` + MySQL Connector/J | Industry-standard pooling for Spring Boot |

## What Works

1. Use connection pooling with a limit appropriate to your database's `max_connections`
2. Enable SSL with certificate verification in production environments
3. Set explicit connection timeouts and idle timeouts to prevent stale connections
4. Use `execute()` (prepared statements) instead of `query()` for user-supplied values
5. Store connection strings in environment variables and use IAM authentication when on AWS RDS

## Common Mistakes

1. Using the deprecated `mysql` package in Node.js instead of `mysql2`
2. Forgetting to set `serverTimezone` in JDBC URLs, causing timezone shift bugs
3. Not handling connection errors, leading to unhandled promise rejections or crashes
4. Using `SELECT *` in production without considering column count and network overhead
5. Opening connections in loops instead of reusing pooled connections

## Frequently Asked Questions

### Should I use `mysql-connector-python` or `PyMySQL`?

`mysql-connector-python` is the official Oracle driver with better performance. `PyMySQL` is a pure-Python alternative useful when C extensions cannot be installed.

### How do I handle connection timeouts in mysql2?

Set `connectTimeout`, `acquireTimeout`, and `timeout` in pool options. Also configure `enableKeepAlive` for long-running connections.

### What is the difference between `query()` and `execute()` in mysql2?

`query()` sends the SQL as a plain string. `execute()` sends a prepared statement with bound parameters, which is safe against SQL injection and can improve performance for repeated queries.

### Python with connection pool and context manager

```python
import mysql.connector
from mysql.connector import pooling
from contextlib import contextmanager

# Create a connection pool
mysql_pool = pooling.MySQLConnectionPool(
    pool_name="mypool",
    pool_size=10,
    host="localhost",
    database="mydb",
    user="user",
    password="pass",
    ssl_ca="ca.pem",
    ssl_verify_cert=True
)

@contextmanager
def get_db_cursor():
    conn = mysql_pool.get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        yield cursor
        conn.commit()
        cursor.close()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

# Usage
with get_db_cursor() as cur:
    cur.execute("SELECT * FROM users WHERE active = %s", (True,))
    rows = cur.fetchall()
    for row in rows:
        print(row)
```

### JavaScript with transaction handling

```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    database: 'mydb',
    user: 'user',
    password: 'pass',
    ssl: { ca: require('fs').readFileSync('ca.pem') },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

async function transferBalance(fromId, toId, amount) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        await conn.execute(
            'UPDATE accounts SET balance = balance - ? WHERE id = ?',
            [amount, fromId]
        );

        await conn.execute(
            'UPDATE accounts SET balance = balance + ? WHERE id = ?',
            [amount, toId]
        );

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}
```

### Java with HikariCP connection pool

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.*;

public class MySQLPool {
    private static final HikariDataSource ds;

    static {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:mysql://localhost:3306/mydb?sslMode=VERIFY_CA&serverTimezone=UTC");
        config.setUsername("user");
        config.setPassword("pass");
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

### Python with PyMySQL (pure Python alternative)

```python
import pymysql
from contextlib import contextmanager

@contextmanager
def get_db():
    conn = pymysql.connect(
        host="localhost",
        database="mydb",
        user="user",
        password="pass",
        ssl={"ca": "ca.pem"},
        cursorclass=pymysql.cursors.DictCursor
    )
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

# Usage
with get_db() as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM users WHERE id = %s", (1,))
        row = cur.fetchone()
        print(row)
```

## Additional Variants

| Technology | Driver | Async | Pooling | Notes |
|------------|--------|-------|---------|-------|
| Python | `mysql-connector-python` | No | `MySQLConnectionPool` | Official Oracle driver |
| Python | `PyMySQL` | No | Manual | Pure Python, no C deps |
| Python | `aiomysql` | Yes | Built-in | Async MySQL for asyncio |
| JavaScript | `mysql2` | Yes (Promise) | `createPool` | Recommended for Node.js |
| JavaScript | `mysql` | No (callback) | `createPool` | Legacy, avoid for new code |
| Java | JDBC + HikariCP | No | HikariCP | Industry standard |
| Go | `go-sql-driver/mysql` | Yes | `database/sql` | Standard Go driver |

## Additional Best Practices

6. **Set `enableKeepAlive` in mysql2.** This prevents idle connections from being dropped by network infrastructure or MySQL's `wait_timeout`:

```javascript
const pool = mysql.createPool({
    // ... other options
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});
```

7. **Use `LOAD DATA INFILE` for bulk inserts.** This is 20-100x faster than individual `INSERT` statements for large datasets:

```sql
LOAD DATA INFILE '/tmp/users.csv'
INTO TABLE users
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(id, email, name);
```

8. **Set `wait_timeout` and `interactive_timeout` on the server.** Tune these to recycle idle connections before they become stale:

```sql
SET GLOBAL wait_timeout = 300;
SET GLOBAL interactive_timeout = 300;
```

9. **Use IAM authentication on AWS RDS.** Avoid storing passwords by using IAM database authentication:

```bash
aws rds generate-db-auth-token \
  --hostname mydb.abc123.us-east-1.rds.amazonaws.com \
  --port 3306 \
  --username myuser
```

10. **Monitor `SHOW PROCESSLIST` for long-running queries.** Identify and kill queries that block others:

```sql
SHOW PROCESSLIST;
KILL <thread_id>;
```

## Additional Common Mistakes

6. **Not handling connection drops.** Network issues or MySQL restarts invalidate connections. Use retry logic or a pool with health checks.
7. **Using `SELECT *` in production code.** Explicit column lists prevent breakage when schema changes and reduce network overhead.
8. **Not setting `connectionLimit` correctly.** Set it based on MySQL's `max_connections` and the number of application instances. Formula: `max_connections / app_instances - safety_margin`.
9. **Ignoring `SHOW STATUS LIKE 'Threads_connected'`.** Monitor active connections to detect connection leaks early.
10. **Using autocommit for multi-statement operations.** Without explicit transactions, partial failures leave data in an inconsistent state.

## Additional FAQ

### How do I handle connection failures gracefully?

Implement retry logic with exponential backoff. In Python, use `tenacity`. In Node.js, use `p-retry`. Always set a maximum retry count:

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
def query_with_retry(sql, params):
    with get_db_cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()
```

### How do I enable query logging for debugging?

Enable the slow query log in MySQL to identify queries that take longer than a threshold:

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 0.1;
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
```

### What is connection multiplexing for MySQL?

MySQL connection multiplexing is provided by ProxySQL or MySQL Router. These proxies pool connections from multiple application instances and multiplex them to a smaller set of database connections. Use `transaction_persistent=0` in ProxySQL for most applications.

### How do I use SSL with MySQL on AWS RDS?

Download the RDS CA bundle and use it in your connection:

```python
conn = mysql.connector.connect(
    host="mydb.abc123.us-east-1.rds.amazonaws.com",
    database="mydb",
    user="user",
    password="pass",
    ssl_ca="rds-ca-2019-root.pem",
    ssl_verify_cert=True
)
```
