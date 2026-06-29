---
contentType: recipes
slug: sql-injection-prevention
title: "Prevent SQL Injection Attacks"
description: "How to write parameterized queries and use ORMs to eliminate SQL injection vulnerabilities across Python, JavaScript, and Java."
metaDescription: "Learn SQL injection prevention techniques. Use parameterized queries, prepared statements, and ORMs to secure database access in Python, JavaScript, and Java."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - database
relatedResources:
  - /recipes/database-transactions
  - /recipes/input-validation
  - /recipes/handle-errors
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn SQL injection prevention techniques. Use parameterized queries, prepared statements, and ORMs to secure database access in Python, JavaScript, and Java."
  keywords:
    - sql injection prevention
    - parameterized queries
    - prepared statements
    - orm security
    - database security
    - sql injection examples
    - input sanitization
    - secure coding
---

## Overview

SQL injection is one of the most common and dangerous web application vulnerabilities. It occurs when an attacker injects malicious SQL code into application queries through user input, potentially exposing, modifying, or deleting entire databases. Injection attacks consistently rank in the [OWASP Top 10](/guides/security/security-best-practices-guide) because they are easy to exploit and devastating in impact.

The root cause is almost always the same: concatenating untrusted user [input](/recipes/api/input-validation) directly into SQL strings. The fix is equally straightforward: use parameterized queries or an ORM that handles escaping automatically. This recipe shows the secure way to access databases in Python, JavaScript, and Java.

## When to Use

Use this recipe when:

- Writing any code that executes SQL queries with live values
- Migrating legacy code that uses string concatenation for SQL
- Auditing existing applications for injection vulnerabilities
- Training developers on secure database access patterns
- Setting up code review checklists for database-related changes

## Solution

### Python

```python
import sqlite3

# VULNERABLE — never do this
# query = f"SELECT * FROM users WHERE email = '{user_input}'"

# SAFE — parameterized query
conn = sqlite3.connect("app.db")
cursor = conn.cursor()

cursor.execute(
    "SELECT * FROM users WHERE email = ? AND active = ?",
    (email, True)
)
rows = cursor.fetchall()
```

### JavaScript (Node.js with pg)

```javascript
const { Pool } = require('pg');
const pool = new Pool();

// VULNERABLE — never do this
// const query = `SELECT * FROM users WHERE email = '${email}'`;

// SAFE — parameterized query
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1 AND active = $2',
  [email, true]
);
const rows = result.rows;
```

### Java (JDBC)

```java
import java.sql.*;

// SAFE — PreparedStatement
String sql = "SELECT * FROM users WHERE email = ? AND active = ?";
try (Connection conn = dataSource.getConnection();
     PreparedStatement stmt = conn.prepareStatement(sql)) {

    stmt.setString(1, email);
    stmt.setBoolean(2, true);

    try (ResultSet rs = stmt.executeQuery()) {
        while (rs.next()) {
            System.out.println(rs.getString("name"));
        }
    }
}
```

### Using an ORM (Python/SQLAlchemy)

```python
from sqlalchemy.orm import Session
from models import User

with Session(engine) as session:
    users = session.query(User).filter_by(
        email=email,
        active=True
    ).all()
```

## Explanation

- **Parameterized queries**: The database driver treats user input as data, not as executable SQL. Placeholders (`?`, `$1`, `:name`) are replaced safely by the driver, preventing any injected SQL from being interpreted as commands.
- **Prepared statements**: The database compiles the query plan once and executes it with different parameters. This is both a security and performance win.
- **ORMs**: Object-relational mappers like SQLAlchemy, Sequelize, and Hibernate automatically parameterize queries. They are the safest choice for most applications because they abstract SQL entirely.
- **Stored procedures**: Can add a layer of abstraction, but they do not prevent injection if they themselves concatenate input inside live SQL.

## Variants

| Approach | Security | Flexibility | Best For |
|----------|----------|-------------|----------|
| Raw parameterized queries | Excellent | High | Complex queries, reporting |
| ORM | Excellent | Medium | CRUD-heavy applications |
| Stored procedures | Good | Low | Legacy systems, strict DBAs |
| Query builders (Knex, jOOQ) | Good | High | Live query construction |

## What Works

- **Never concatenate user input into SQL strings**: not even for `ORDER BY` columns or table names. Use allowlists if live identifiers are unavoidable.
- **Use an ORM by default**: it eliminates entire categories of injection bugs with minimal performance cost.
- **Validate input before it reaches the database**: [input validation](/recipes/api/input-validation) and parameterized queries are complementary defenses.
- **Use least-privilege database accounts**: the application user should not have `DROP TABLE` or `GRANT` permissions.
- **Log and monitor for injection attempts**: failed queries containing SQL keywords or unusual characters can signal probing.
- **Keep database drivers updated**: security patches for drivers and ORMs fix known bypasses.

## Common Mistakes

- **Using `f`-strings or template literals for SQL**: this is the most common cause of SQL injection in modern code.
- **Partial parameterization**: parameterizing the `WHERE` clause but concatenating `ORDER BY` columns or table names.
- **Trusting client-side validation**: attackers bypass frontend validation entirely. All validation must be server-side.
- **Using `LIKE` without escaping wildcards**: `%` and `_` in user input can cause unexpected matches even in parameterized queries.
- **Assuming stored procedures are safe**: procedures that build live SQL internally are still vulnerable unless they use parameterized queries themselves.

## Frequently Asked Questions

**Q: Is it safe to use string formatting for table names or column names?**
A: No. Table and column names are identifiers, not data values, and cannot be parameterized. Use an allowlist of permitted identifiers and reject anything else.

**Q: Do ORMs completely prevent SQL injection?**
A: Yes, for standard operations. However, raw SQL methods like `sequelize.query()` or `session.execute()` still require manual parameterization.

**Q: What about NoSQL databases like MongoDB?**
A: [NoSQL injection](/guides/databases/nosql-database-selection-guide) exists too. Use parameterized queries or driver methods that accept objects, not string concatenation. Never pass raw user input to `eval()` or `$where` clauses.

**Q: Can prepared statements hurt performance?**
A: No. They usually improve performance because the database caches the execution plan. The overhead is negligible compared to the security benefit.

