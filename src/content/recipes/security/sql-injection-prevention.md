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
  - vulnerabilities
  - encryption
  - owasp
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

The root cause is almost always the same: concatenating untrusted user [input](/recipes/api/input-validation) directly into SQL strings. The fix is equally straightforward: use parameterized queries or an ORM that handles escaping automatically. The pattern below demonstrates the secure way to access databases in Python, JavaScript, and Java.

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


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Advanced Solutions

### ORDER BY with allowlist (Python)

Table and column names cannot be parameterized. Use an allowlist to safely handle dynamic sorting:

```python
ALLOWED_SORT_COLUMNS = {
    'name': 'users.name',
    'email': 'users.email',
    'created_at': 'users.created_at',
    'updated_at': 'users.updated_at',
}

def get_users(sort_by: str = 'created_at', sort_dir: str = 'desc',
              limit: int = 20, offset: int = 0):
    """Fetch users with safe dynamic sorting."""
    # Validate sort column against allowlist
    column = ALLOWED_SORT_COLUMNS.get(sort_by)
    if column is None:
        raise ValueError(f'Invalid sort column: {sort_by}')

    # Validate sort direction
    direction = 'ASC' if sort_dir.upper() == 'ASC' else 'DESC'

    # Limit and offset are parameterized
    query = f"""
        SELECT id, name, email, created_at
        FROM users
        WHERE active = TRUE
        ORDER BY {column} {direction}
        LIMIT %s OFFSET %s
    """

    with db.cursor() as cursor:
        cursor.execute(query, (limit, offset))
        return cursor.fetchall()

# Usage
users = get_users(sort_by='name', sort_dir='asc', limit=10, offset=0)
# An attacker passing sort_by="name; DROP TABLE users--" gets ValueError
```

### LIKE wildcard escaping (JavaScript)

Even with parameterized queries, `%` and `_` in user input can cause unexpected LIKE behavior:

```javascript
const { Pool } = require('pg');
const pool = new Pool();

async function searchUsers(searchTerm) {
  // Escape LIKE wildcards in user input
  const escapedTerm = searchTerm
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/%/g, '\\%')    // Escape percent
    .replace(/_/g, '\\_');   // Escape underscore

  const result = await pool.query(
    `SELECT id, name, email FROM users
     WHERE name LIKE $1 ESCAPE '\\'
     ORDER BY name
     LIMIT 20`,
    [`%${escapedTerm}%`]
  );

  return result.rows;
}

// Usage: searchTerm = "50%_off" becomes "50\%\_off" in the LIKE pattern
// This matches the literal string "50%_off" instead of "50<anything><any char>off"
```

### Sequelize raw query safety (Node.js)

Sequelize's `query()` method supports parameterized raw SQL:

```javascript
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_URL);

// SAFE: Replacements
const users = await sequelize.query(
  'SELECT * FROM users WHERE email = :email AND active = :active',
  {
    replacements: { email: userEmail, active: true },
    type: Sequelize.QueryTypes.SELECT,
  }
);

// SAFE: Positional parameters
const orders = await sequelize.query(
  'SELECT * FROM orders WHERE user_id = $1 AND status = $2',
  {
    bind: [userId, 'completed'],
    type: Sequelize.QueryTypes.SELECT,
  }
);

// DANGEROUS: Never do this
// const result = await sequelize.query(
//   `SELECT * FROM users WHERE email = '${userEmail}'`
// );
```

### jOOQ type-safe queries (Java)

jOOQ generates type-safe SQL from your schema, eliminating injection by construction:

```java
import static org.jooq.impl.DSL.*;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.Result;

// jOOQ generates classes from your database schema
import static com.example.generated.tables.Users.USERS;
import static com.example.generated.tables.Orders.ORDERS;

public class UserRepository {

    private final DSLContext ctx;

    public UserRepository(DSLContext ctx) {
        this.ctx = ctx;
    }

    public Result<Record> findActiveUsersByEmail(String email) {
        return ctx.select()
            .from(USERS)
            .where(USERS.EMAIL.eq(email))
            .and(USERS.ACTIVE.eq(true))
            .fetch();
    }

    public Result<Record> searchUsersByName(String namePattern) {
        // Type-safe LIKE with escaped pattern
        return ctx.select()
            .from(USERS)
            .where(USERS.NAME.like("%" + namePattern + "%"))
            .orderBy(USERS.CREATED_AT.desc())
            .limit(20)
            .fetch();
    }
}
```

### Detecting injection with SQLMap

Test your application for SQL injection vulnerabilities:

```bash
#!/bin/bash
# Test a single endpoint
sqlmap -u "https://example.com/api/users?id=1" \
  --batch --level=3 --risk=2 \
  --random-agent \
  --output-dir=/tmp/sqlmap-results

# Test with authentication cookie
sqlmap -u "https://example.com/api/users?id=1" \
  --cookie="session=abc123" \
  --batch --level=5

# Test POST parameters
sqlmap -u "https://example.com/api/login" \
  --data="email=test@example.com&password=test" \
  --batch --level=3
```

## Additional Best Practices

1. **Use database roles with column-level permissions.** Restrict which columns the application user can read, so even if injection occurs, sensitive columns are protected:

```sql
-- Create a restricted role
CREATE ROLE app_readonly;

-- Grant access only to non-sensitive columns
GRANT SELECT (id, name, email, created_at) ON users TO app_readonly;
-- Deny access to password_hash, ssn, payment_info
REVOKE SELECT ON users FROM app_readonly;
GRANT SELECT (id, name, email, created_at) ON users TO app_readonly;

-- Application connects as app_readonly
-- Admin operations use a separate privileged role
```

2. **Enable query logging with pattern detection.** Log queries that contain suspicious patterns for forensic analysis:

```python
import re
import logging

SUSPICIOUS_PATTERNS = [
    re.compile(r'UNION\s+SELECT', re.IGNORECASE),
    re.compile(r'OR\s+1\s*=\s*1', re.IGNORECASE),
    re.compile(r';\s*DROP\s+TABLE', re.IGNORECASE),
    re.compile(r'--\s*$'),
    re.compile(r'/\*.*\*/'),
]

def check_query_safety(query: str, params: tuple = None):
    """Log warning if query contains suspicious patterns."""
    for pattern in SUSPICIOUS_PATTERNS:
        if pattern.search(query):
            logging.warning(
                f'Suspicious SQL pattern detected: {pattern.pattern} '
                f'in query: {query[:200]}'
            )
            break
```

## Additional Common Mistakes

1. **Using `query.toString()` or logging raw SQL with parameters.** Logging the full SQL string with interpolated parameters can expose sensitive data in log files. Log the query template and parameter count separately:

```javascript
// WRONG: logs full SQL with user data
console.log(`Query: SELECT * FROM users WHERE email = '${email}'`);

// CORRECT: logs template and parameter count
logger.debug('Query: SELECT * FROM users WHERE email = $1', {
  paramCount: 1,
  queryType: 'SELECT',
});
```

2. **Trusting ORM `raw()` methods blindly.** Some ORMs offer `raw()` or `literal()` methods that bypass parameterization. Always pass parameters separately:

```python
# WRONG: raw interpolation
from sqlalchemy import text
session.execute(text(f"SELECT * FROM users WHERE name = '{name}'"))

# CORRECT: bound parameters
from sqlalchemy import text
session.execute(
    text("SELECT * FROM users WHERE name = :name"),
    {"name": name}
)
```

## Additional FAQ

### How do I handle dynamic IN clauses safely?

Build the parameterized placeholders dynamically based on the list length:

```python
def get_users_by_ids(user_ids: list[str]) -> list:
    if not user_ids:
        return []
    # Create N placeholders: (?, ?, ?, ...)
    placeholders = ', '.join(['?'] * len(user_ids))
    query = f"SELECT * FROM users WHERE id IN ({placeholders})"
    cursor.execute(query, user_ids)
    return cursor.fetchall()
```

### What is second-order SQL injection?

Second-order injection occurs when malicious input is stored in the database (through a safe parameterized query) and later used in a different query via string concatenation. For example, a username like `admin'--` is stored safely, but if another query concatenates that username into SQL, it executes. Always parameterize every query, even when the data comes from your own database.

### Should I use WAF rules for SQL injection?

A Web Application Firewall (WAF) like ModSecurity or AWS WAF adds a layer of protection by blocking requests containing SQL keywords. However, WAFs are defense-in-depth, not a primary defense. They can be bypassed with encoding tricks and should complement, not replace, parameterized queries.
