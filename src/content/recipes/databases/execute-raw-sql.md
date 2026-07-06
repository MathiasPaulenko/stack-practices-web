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

### Python with SQLAlchemy `text()`

```python
from sqlalchemy import create_engine, text

engine = create_engine("postgresql://user:pass@localhost/mydb")

with engine.connect() as conn:
    # Parameterized raw SQL within SQLAlchemy
    result = conn.execute(
        text("SELECT * FROM users WHERE email = :email AND active = :active"),
        {"email": "alice@example.com", "active": True}
    )
    for row in result:
        print(row.name, row.email)

    # Transaction with raw SQL
    conn.execute(
        text("INSERT INTO audit_log (action, user_id) VALUES (:action, :user_id)"),
        {"action": "login", "user_id": 1}
    )
    conn.commit()
```

### JavaScript with `knex.raw()`

```javascript
const knex = require('knex')({
    client: 'pg',
    connection: 'postgresql://user:pass@localhost/mydb'
});

// Raw SQL with bindings
const users = await knex.raw(
    'SELECT * FROM users WHERE email = ? AND active = ?',
    ['alice@example.com', true]
);

// Raw SQL in a query builder chain
const activeUsers = await knex('users')
    .whereRaw('created_at > NOW() - INTERVAL ? DAYS', [30])
    .select('id', 'email');
```

### Handling `IN` clauses safely

```python
# Python: generate placeholders dynamically
emails = ['alice@example.com', 'bob@example.com']
placeholders = ','.join(['%s'] * len(emails))
cursor.execute(
    f"SELECT * FROM users WHERE email IN ({placeholders})",
    emails
)

# PostgreSQL: use ANY() with an array
cursor.execute(
    "SELECT * FROM users WHERE email = ANY(%s)",
    (emails,)
)
```

```javascript
// JavaScript: use ANY() in PostgreSQL
const result = await pool.query(
    'SELECT * FROM users WHERE email = ANY($1::text[])',
    [emails]
);
```

```java
// Java: build PreparedStatement with dynamic placeholders
List<String> emails = List.of("alice@example.com", "bob@example.com");
String placeholders = String.join(",", Collections.nCopies(emails.size(), "?"));
String sql = "SELECT * FROM users WHERE email IN (" + placeholders + ")";
try (PreparedStatement stmt = conn.prepareStatement(sql)) {
    for (int i = 0; i < emails.size(); i++) {
        stmt.setString(i + 1, emails.get(i));
    }
    ResultSet rs = stmt.executeQuery();
}
```

### Whitelisting table/column names

```python
ALLOWED_TABLES = {"users", "orders", "products"}
ALLOWED_COLUMNS = {"id", "name", "email", "amount", "status"}

def safe_query(table_name, column_name, value):
    if table_name not in ALLOWED_TABLES:
        raise ValueError(f"Invalid table: {table_name}")
    if column_name not in ALLOWED_COLUMNS:
        raise ValueError(f"Invalid column: {column_name}")

    cursor.execute(
        f"SELECT * FROM {table_name} WHERE {column_name} = %s",
        (value,)
    )
    return cursor.fetchall()
```

## Additional Best Practices

6. **Use `EXPLAIN ANALYZE` to validate query plans.** Raw SQL bypasses ORM optimizations. Always check the execution plan for large tables.

7. **Set `statement_timeout` for raw queries.** Prevents runaway queries from consuming resources:

```sql
SET statement_timeout = '30s';
```

8. **Log slow queries.** Track execution time for raw SQL to identify performance regressions:

```python
import time

start = time.monotonic()
cursor.execute("SELECT * FROM large_table WHERE ...")
elapsed = time.monotonic() - start
if elapsed > 0.5:
    logger.warning(f"Slow query took {elapsed:.2f}s")
```

9. **Use connection pools for raw SQL.** Creating a new connection per query is expensive. Use `psycopg2.pool` or SQLAlchemy's built-in pooling.

10. **Quote identifiers when needed.** Use `psycopg2.sql` module for safe identifier quoting:

```python
from psycopg2 import sql

query = sql.SQL("SELECT * FROM {} WHERE {} = %s").format(
    sql.Identifier("users"),
    sql.Identifier("email")
)
cursor.execute(query, ("alice@example.com",))
```

## Additional Common Mistakes

6. **Using `executemany()` for bulk inserts without testing.** Some drivers execute individual statements, making it no faster than a loop. Use `COPY` in PostgreSQL or batch inserts with `VALUES` lists.

7. **Not closing cursors and connections.** Use context managers (`with` blocks) to ensure resources are released.

8. **Ignoring result set size.** Fetching millions of rows into memory causes OOM. Use server-side cursors or pagination:

```python
cursor.execute("SELECT * FROM large_table")
while True:
    rows = cursor.fetchmany(1000)
    if not rows:
        break
    process(rows)
```

9. **Mixing parameterized and string-formatted SQL.** Even one `f-string` interpolation in a parameterized query introduces injection risk.

10. **Not handling `NULL` in parameterized queries.** `WHERE col = %s` with `None` returns no rows. Use `IS DISTINCT FROM` or `IS NULL` for NULL-safe comparisons.

## Additional FAQ

### How do I execute a multi-statement raw SQL script?

Use `cursor.execute()` for single statements. For scripts with multiple statements, split them or use `psycopg2`'s `execute()` with the full script (it handles semicolons). In Java, use `Statement.execute()` which supports multiple statements.

### What is the difference between `execute()` and `executemany()`?

`execute()` runs one query with one set of parameters. `executemany()` runs the same query with multiple parameter sets. For bulk inserts in PostgreSQL, `COPY` or `execute_values` from `psycopg2.extras` is faster.

### How do I safely use dynamic `ORDER BY` clauses?

Column names cannot be parameterized. Whitelist allowed columns and validate sort direction:

```python
SORTABLE_COLUMNS = {"name", "email", "created_at"}
SORT_DIRECTIONS = {"ASC", "DESC"}

def safe_sort(column, direction):
    if column not in SORTABLE_COLUMNS:
        raise ValueError(f"Invalid sort column: {column}")
    if direction.upper() not in SORT_DIRECTIONS:
        raise ValueError(f"Invalid sort direction: {direction}")
    return f"ORDER BY {column} {direction.upper()}"
```

## Performance Tips

1. **Use `COPY` for bulk inserts in PostgreSQL.** It is 10-100x faster than individual `INSERT` statements.

2. **Use `execute_values` for batch inserts in Python.** Reduces round-trips by sending multiple rows in one statement:

```python
from psycopg2.extras import execute_values

execute_values(
    cursor,
    "INSERT INTO users (email, name) VALUES %s",
    [("alice@example.com", "Alice"), ("bob@example.com", "Bob")]
)
```

3. **Use server-side cursors for large result sets.** Avoid loading millions of rows into memory:

```python
cursor = conn.cursor("server_side_cursor")
cursor.execute("SELECT * FROM large_table")
for row in cursor:
    process(row)
cursor.close()
```

4. **Prefer `EXISTS` over `COUNT(*)` for existence checks.** `EXISTS` stops scanning as soon as a match is found:

```sql
SELECT EXISTS(SELECT 1 FROM users WHERE email = 'alice@example.com');
```

5. **Use `PREPARE` for frequently repeated queries.** PostgreSQL caches the query plan, reducing parse overhead for repeated executions.
