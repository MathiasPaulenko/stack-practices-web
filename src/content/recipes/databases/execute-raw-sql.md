---
contentType: recipes
slug: execute-raw-sql
title: "Execute Raw SQL"
description: "How to execute raw SQL queries safely with parameterized statements."
metaDescription: "Learn to execute raw SQL queries safely in Python, JavaScript, and Java using parameterized statements to prevent SQL injection."
difficulty: beginner
topics:
  - databases
tags:
  - databases
  - sql
  - security
  - python
  - javascript
  - java
relatedResources:
  - /recipes/connect-to-mysql
  - /recipes/connect-to-postgresql
  - /recipes/connect-to-redis
  - /recipes/escape-html-entities
  - /recipes/sanitize-user-input
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Learn to execute raw SQL queries safely in Python, JavaScript, and Java using parameterized statements to prevent SQL injection."
  keywords:
    - databases
    - sql
    - security
    - python
    - javascript
    - java
---
## Overview

Even with ORMs, raw SQL is sometimes necessary for complex queries, migrations, or performance optimization. However, executing raw SQL without safeguards is a primary cause of SQL injection vulnerabilities. This recipe demonstrates how to execute raw SQL safely using parameterized queries in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Writing complex analytics queries that ORMs cannot express efficiently
- Executing database migrations or administrative commands
- Optimizing performance with database-specific SQL capabilities

## Solution

### Python

```python
import psycopg2

conn = psycopg2.connect(host="localhost", database="mydb", user="user", password="pass")
cursor = conn.cursor()

# Safe parameterized query
cursor.execute("SELECT * FROM users WHERE email = %s AND active = %s", (email, True))
rows = cursor.fetchall()

# Safe insert with RETURNING
cursor.execute(
    "INSERT INTO users (email, role) VALUES (%s, %s) RETURNING id",
    (email, role)
)
user_id = cursor.fetchone()[0]
conn.commit()
cursor.close()
conn.close()
```

### JavaScript

```javascript
const { Pool } = require('pg');
const pool = new Pool({ /* config */ });

// Safe parameterized query
async function findUser(email) {
    const result = await pool.query(
        'SELECT * FROM users WHERE email = $1 AND active = $2',
        [email, true]
    );
    return result.rows;
}

// Safe insert with RETURNING
async function createUser(email, role) {
    const result = await pool.query(
        'INSERT INTO users (email, role) VALUES ($1, $2) RETURNING id',
        [email, role]
    );
    return result.rows[0].id;
}
```

### Java

```java
import java.sql.*;

public class RawSQL {
    public void findUser(Connection conn, String email) throws SQLException {
        String sql = "SELECT * FROM users WHERE email = ? AND active = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, email);
            stmt.setBoolean(2, true);
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                System.out.println(rs.getString("name"));
            }
        }
    }

    public int createUser(Connection conn, String email, String role) throws SQLException {
        String sql = "INSERT INTO users (email, role) VALUES (?, ?) RETURNING id";
        try (PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, email);
            stmt.setString(2, role);
            stmt.executeUpdate();
            try (ResultSet keys = stmt.getGeneratedKeys()) {
                keys.next();
                return keys.getInt(1);
            }
        }
    }
}
```

## Explanation

**Parameterized queries** (prepared statements) separate SQL logic from data. The database compiles the SQL template once and binds values at execution time, making injection impossible. In **Python**, `%s` is a placeholder, not a format string. In **JavaScript**, `$1`, `$2` are positional parameters. In **Java**, `?` is the JDBC placeholder. None of these concatenate user input into the SQL string.

## Variants

| Technology | Approach | Notes |
|------------|----------|-------|
| Python | `SQLAlchemy text()` | Raw SQL within ORM with bound parameters |
| JavaScript | `knex.raw()` | Query builder with raw SQL and bindings |
| Java | `Jdbi` | Fluent API over JDBC with parameter binding |

## What Works

1. Never concatenate user input into SQL strings; always use parameterized queries
2. Use `RETURNING` (PostgreSQL) or `getGeneratedKeys()` (JDBC) instead of separate `SELECT MAX(id)`
3. Wrap multiple statements in transactions with proper rollback on error
4. Validate and whitelist table/column names when they must be live
5. Log SQL execution times to detect slow queries and N+1 patterns

## Common Mistakes

1. Using Python f-strings, JS template literals, or Java `+` concatenation for SQL
2. Assuming ORMs are always safe; `.query("..." + input)` is still vulnerable
3. Sanitizing input with regex instead of using parameterized queries
4. Forgetting to commit transactions, leaving data in an inconsistent state
5. Using `Statement` instead of `PreparedStatement` in Java

## Frequently Asked Questions

### Is `cursor.execute(f"SELECT * FROM {table}")` safe?

No. Table and column names cannot be parameterized in most drivers. If live table names are required, whitelist them against a known set of valid names.

### Can I use parameterized queries for `IN` clauses?

Most drivers do not support `IN (%s)` with a list. Use driver-specific extensions: `ANY($1)` in PostgreSQL, generate placeholders dynamically in Python/Java, or use `find_in_set` in MySQL.

### Should I avoid raw SQL entirely and only use ORMs?

Not necessarily. ORMs excel at CRUD but struggle with complex aggregations, window functions, and database-specific optimizations. Use raw SQL for these cases, but always parameterize inputs.
