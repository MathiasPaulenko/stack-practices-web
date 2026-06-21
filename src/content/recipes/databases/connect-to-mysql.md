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

MySQL remains one of the most widely deployed relational databases. Whether running locally, on AWS RDS, or in a managed cluster, connecting securely and efficiently is critical. This recipe covers MySQL connections with connection pooling, SSL, and prepared statements in Python, JavaScript, and Java.

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

## Best Practices

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
