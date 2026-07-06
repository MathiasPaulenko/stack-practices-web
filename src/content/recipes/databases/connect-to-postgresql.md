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
