---
contentType: patterns
slug: data-access-object-pattern
title: "Data Access Object (DAO) Pattern"
description: "Abstract and encapsulate all access to a data source by exposing a clean interface while hiding persistence details from business logic."
metaDescription: "Learn the DAO Pattern for abstracting database access. Examples in Python, Java, and JavaScript with clean separation between persistence and business logic."
difficulty: beginner
topics:
  - design
tags:
  - data-access-object
  - pattern
  - design-pattern
  - structural
  - persistence
  - database
  - repository
  - abstraction
relatedResources:
  - /patterns/design/repository-pattern
  - /patterns/design/active-record-pattern
  - /patterns/design/data-mapper-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the DAO Pattern for abstracting database access. Examples in Python, Java, and JavaScript with clean separation between persistence and business logic."
  keywords:
    - data access object
    - dao pattern
    - design pattern
    - persistence
    - database abstraction
---

# Data Access Object (DAO) Pattern

## Overview

The Data Access Object (DAO) Pattern separates low-level data access operations from high-level business logic. A DAO provides a clean interface for creating, reading, updating, and deleting entities, while encapsulating the details of the underlying database or storage mechanism.

This pattern is the foundation of clean architecture: business code calls `userDao.findById(42)` without knowing whether the data comes from PostgreSQL, MongoDB, or an in-memory cache.

## When to Use

Use the DAO Pattern when:
- You want to isolate persistence logic from business logic
- The data source might change (SQL today, NoSQL tomorrow)
- Multiple parts of the application need the same CRUD operations
- You need to centralize query construction and connection management

## When to Avoid

- The application is a small script where direct SQL is simpler
- You are using a full ORM that already provides DAO-like abstractions
- The abstraction adds more boilerplate than value

## Solution

### Python

```python
from dataclasses import dataclass
from typing import Optional, List
import sqlite3

@dataclass
class User:
    id: int
    name: str
    email: str

class UserDao:
    def __init__(self, db_path: str):
        self.db_path = db_path

    def _connect(self):
        return sqlite3.connect(self.db_path)

    def find_by_id(self, user_id: int) -> Optional[User]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT id, name, email FROM users WHERE id = ?", (user_id,)
            ).fetchone()
            return User(*row) if row else None

    def find_all(self) -> List[User]:
        with self._connect() as conn:
            rows = conn.execute("SELECT id, name, email FROM users").fetchall()
            return [User(*row) for row in rows]

    def save(self, user: User) -> User:
        with self._connect() as conn:
            cursor = conn.execute(
                "INSERT INTO users (name, email) VALUES (?, ?)",
                (user.name, user.email)
            )
            user.id = cursor.lastrowid
            conn.commit()
            return user

    def delete(self, user_id: int):
        with self._connect() as conn:
            conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
            conn.commit()


# Usage
dao = UserDao("app.db")
user = dao.save(User(id=0, name="Alice", email="alice@example.com"))
found = dao.find_by_id(user.id)
print(found)
```

### Java

```java
import java.sql.*;
import java.util.*;

public record User(int id, String name, String email) {}

public interface UserDao {
    Optional<User> findById(int id);
    List<User> findAll();
    User save(User user);
    void delete(int id);
}

public class SqlUserDao implements UserDao {
    private final Connection conn;

    public SqlUserDao(Connection conn) {
        this.conn = conn;
    }

    public Optional<User> findById(int id) {
        try (PreparedStatement ps = conn.prepareStatement(
            "SELECT id, name, email FROM users WHERE id = ?")) {
            ps.setInt(1, id);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return Optional.of(new User(rs.getInt(1), rs.getString(2), rs.getString(3)));
            }
        } catch (SQLException e) { throw new RuntimeException(e); }
        return Optional.empty();
    }

    public List<User> findAll() {
        List<User> users = new ArrayList<>();
        try (Statement st = conn.createStatement()) {
            ResultSet rs = st.executeQuery("SELECT id, name, email FROM users");
            while (rs.next()) {
                users.add(new User(rs.getInt(1), rs.getString(2), rs.getString(3)));
            }
        } catch (SQLException e) { throw new RuntimeException(e); }
        return users;
    }

    public User save(User user) {
        try (PreparedStatement ps = conn.prepareStatement(
            "INSERT INTO users (name, email) VALUES (?, ?)", Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, user.name());
            ps.setString(2, user.email());
            ps.executeUpdate();
            ResultSet keys = ps.getGeneratedKeys();
            keys.next();
            return new User(keys.getInt(1), user.name(), user.email());
        } catch (SQLException e) { throw new RuntimeException(e); }
    }

    public void delete(int id) {
        try (PreparedStatement ps = conn.prepareStatement(
            "DELETE FROM users WHERE id = ?")) {
            ps.setInt(1, id);
            ps.executeUpdate();
        } catch (SQLException e) { throw new RuntimeException(e); }
    }
}

// Usage
UserDao dao = new SqlUserDao(conn);
User saved = dao.save(new User(0, "Alice", "alice@example.com"));
System.out.println(dao.findById(saved.id()).orElseThrow());
```

### JavaScript

```javascript
class UserDao {
  constructor(db) {
    this.db = db;
  }

  async findById(userId) {
    const row = await this.db.get(
      'SELECT id, name, email FROM users WHERE id = ?', userId
    );
    return row || null;
  }

  async findAll() {
    return this.db.all('SELECT id, name, email FROM users');
  }

  async save(user) {
    const result = await this.db.run(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      user.name, user.email
    );
    return { id: result.lastID, name: user.name, email: user.email };
  }

  async delete(userId) {
    await this.db.run('DELETE FROM users WHERE id = ?', userId);
  }
}

// Usage
const dao = new UserDao(db);
const saved = await dao.save({ name: 'Alice', email: 'alice@example.com' });
const found = await dao.findById(saved.id);
console.log(found);
```

## Explanation

The DAO Pattern separates concerns by:

- **Interface**: Defines the contract for CRUD operations in domain terms
- **Implementation**: Handles SQL, connection management, and mapping
- **Consumer**: Business logic that depends only on the interface

If the database changes from MySQL to MongoDB, only the DAO implementation changes. Business code remains untouched.

## Variants

| Variant | Abstraction Level | Use Case |
|---------|------------------|----------|
| **Table DAO** | One DAO per table | Simple CRUD applications |
| **Generic DAO** | `BaseDao<T>` | Reduces boilerplate with generics |
| **Repository** | Domain-driven queries | `findByEmail`, `findActiveSince` |
| **Active Record** | Entity knows its DAO | Simple models with built-in persistence |

## What Works

- **Return domain objects, not raw result sets.** Map database rows to entity classes at the DAO boundary.
- **Use an interface.** This enables mocking for tests and swapping implementations.
- **Centralize transactions.** The DAO layer should handle connection lifecycle, not callers.
- **Do not leak SQL exceptions.** Wrap checked SQL exceptions in domain-specific runtime exceptions.
- **Batch operations** when inserting or updating many rows to reduce round trips.

## Common Mistakes

- **SQL scattered across business logic** defeats the purpose. All query construction belongs in the DAO.
- **Returning ResultSets** from DAO methods leaks the persistence mechanism and makes callers hard to test.
- **No interface** means every consumer is tightly coupled to a specific database.
- **DAO as a God class** with 50 methods is a sign of poor domain modeling. Split into focused DAOs.
- **Managing connections per query** instead of reusing or pooling them kills performance.

## Real-World Examples

### JDBC

Java's JDBC is a low-level DAO toolkit. `PreparedStatement`, `ResultSet`, and `Connection` are the building blocks that most Java DAOs use internally.

### Django ORM

Django's ORM abstracts table access through Model managers. `User.objects.filter(email="alice@example.com")` is a DAO-style query.

### Node.js Knex.js

Knex provides a query builder that acts as a DAO layer. `knex('users').where({ id: 42 }).first()` abstracts raw SQL.

## Frequently Asked Questions

**Q: What is the difference between DAO and Repository?**
A: DAO is persistence-centric (one per table, CRUD-focused). [Repository](/patterns/design/repository-pattern) is domain-centric (one per aggregate, query-focused).

**Q: Should every table have its own DAO?**
A: Usually yes, but for small applications a generic `BaseDao<T>` reduces boilerplate.

**Q: How do I handle transactions with DAOs?**
A: Use a unit of work pattern or pass a transaction context to DAO methods so multiple DAOs share the same connection.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.

## Advanced Solutions

### Generic DAO with TypeScript for reduced boilerplate

A generic base DAO eliminates repetitive CRUD code across multiple entities:

```typescript
import { Pool } from 'pg';

export interface Entity {
  id: number;
}

export abstract class BaseDao<T extends Entity> {
  constructor(
    protected pool: Pool,
    protected tableName: string,
    protected columns: string[]
  ) {}

  async findById(id: number): Promise<T | null> {
    const result = await this.pool.query(
      `SELECT ${this.columns.join(', ')} FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findAll(): Promise<T[]> {
    const result = await this.pool.query(
      `SELECT ${this.columns.join(', ')} FROM ${this.tableName}`
    );
    return result.rows;
  }

  async save(entity: Omit<T, 'id'>): Promise<T> {
    const columns = Object.keys(entity);
    const values = Object.values(entity);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const result = await this.pool.query(
      `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async update(id: number, updates: Partial<T>): Promise<T> {
    const setClause = Object.keys(updates)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');
    const values = [...Object.values(updates), id];

    const result = await this.pool.query(
      `UPDATE ${this.tableName} SET ${setClause} WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async delete(id: number): Promise<void> {
    await this.pool.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
  }
}

// Concrete DAO for User entity
interface User extends Entity {
  name: string;
  email: string;
  created_at: Date;
}

class UserDao extends BaseDao<User> {
  constructor(pool: Pool) {
    super(pool, 'users', ['id', 'name', 'email', 'created_at']);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT id, name, email, created_at FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }
}

// Usage
const pool = new Pool({ connectionString: 'postgres://localhost/app' });
const userDao = new UserDao(pool);
const user = await userDao.save({ name: 'Alice', email: 'alice@example.com', created_at: new Date() });
```

### DAO with connection pooling and transaction support

Production DAOs need connection pooling and transaction management for performance and data consistency:

```python
import psycopg2
from psycopg2 import pool
from contextlib import contextmanager
from typing import Optional, List, Callable, Any
from dataclasses import dataclass

@dataclass
class User:
    id: int
    name: str
    email: str

class UserDao:
    def __init__(self, min_conn: int = 1, max_conn: int = 10):
        self.connection_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=min_conn,
            maxconn=max_conn,
            dsn="postgresql://user:pass@localhost/app"
        )

    @contextmanager
    def _get_connection(self):
        """Context manager for connection lifecycle."""
        conn = self.connection_pool.getconn()
        try:
            yield conn
        finally:
            self.connection_pool.putconn(conn)

    def find_by_id(self, user_id: int) -> Optional[User]:
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, name, email FROM users WHERE id = %s",
                    (user_id,)
                )
                row = cur.fetchone()
                return User(*row) if row else None

    def find_all(self) -> List[User]:
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name, email FROM users")
                return [User(*row) for row in cur.fetchall()]

    def save(self, user: User) -> User:
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO users (name, email) VALUES (%s, %s) RETURNING id",
                    (user.name, user.email)
                )
                user.id = cur.fetchone()[0]
                conn.commit()
                return user

    def transaction(self, operations: Callable[[Any], Any]):
        """Execute multiple operations in a single transaction."""
        with self._get_connection() as conn:
            try:
                with conn.cursor() as cur:
                    operations(cur)
                conn.commit()
            except Exception:
                conn.rollback()
                raise

# Usage with transaction
dao = UserDao()

def transfer_user_data(cur):
    """Transfer user data between tables in one transaction."""
    cur.execute("INSERT INTO users_archive SELECT * FROM users WHERE id = %s", (42,))
    cur.execute("DELETE FROM users WHERE id = %s", (42,))

dao.transaction(transfer_user_data)
```

### DAO with caching layer for read-heavy workloads

Add a caching layer to the DAO to reduce database load for frequently accessed data:

```python
from functools import lru_cache
from typing import Optional
import hashlib
import json

class CachedUserDao(UserDao):
    def __init__(self, db_path: str, cache_ttl: int = 300):
        super().__init__(db_path)
        self.cache_ttl = cache_ttl
        self._cache = {}

    def _cache_key(self, method: str, *args) -> str:
        """Generate a cache key from method name and arguments."""
        key_data = f"{method}:{args}"
        return hashlib.md5(key_data.encode()).hexdigest()

    def _get_from_cache(self, key: str) -> Optional[User]:
        """Retrieve from cache if not expired."""
        if key in self._cache:
            data, timestamp = self._cache[key]
            if time.time() - timestamp < self.cache_ttl:
                return data
            del self._cache[key]
        return None

    def _set_cache(self, key: str, user: User):
        """Store in cache with current timestamp."""
        self._cache[key] = (user, time.time())

    def find_by_id(self, user_id: int) -> Optional[User]:
        key = self._cache_key("find_by_id", user_id)
        cached = self._get_from_cache(key)
        if cached:
            return cached

        user = super().find_by_id(user_id)
        if user:
            self._set_cache(key, user)
        return user

    def save(self, user: User) -> User:
        """Invalidate cache on save."""
        saved = super().save(user)
        # Invalidate all user-related cache entries
        self._cache.clear()
        return saved

    def delete(self, user_id: int):
        """Invalidate cache on delete."""
        super().delete(user_id)
        self._cache.clear()
```

## Additional Best Practices

1. **Use query builders for complex queries.** Raw SQL strings become unmaintainable for joins, subqueries, and dynamic conditions. Libraries like SQLAlchemy (Python), jOOQ (Java), or Knex.js (JavaScript) build queries programmatically:

```python
# Using SQLAlchemy query builder
from sqlalchemy import select, and_

def find_active_users_since(self, since: datetime) -> List[User]:
    stmt = select(User).where(
        and_(
            User.created_at >= since,
            User.is_active == True
        )
    )
    with self._connect() as conn:
        return conn.execute(stmt).scalars().all()
```

2. **Implement pagination for large result sets.** Fetching all rows at once causes memory issues and slow responses:

```python
def find_paginated(self, page: int, page_size: int = 50) -> List[User]:
    offset = (page - 1) * page_size
    with self._connect() as conn:
        rows = conn.execute(
            "SELECT id, name, email FROM users LIMIT ? OFFSET ?",
            (page_size, offset)
        ).fetchall()
        return [User(*row) for row in rows]
```

## Additional Common Mistakes

1. **Not handling connection exhaustion.** Opening a new connection for every query exhausts the connection pool under load. Always use connection pooling and reuse connections. Monitor pool metrics (active connections, wait time) to identify exhaustion before it causes outages.

2. **N+1 query problem in DAO methods.** A DAO method that fetches a list of entities and then calls another DAO method for each entity causes N+1 queries. Use eager loading with joins or batch fetching to round-trip once:

```python
# Bad: N+1 queries
def find_users_with_orders(self):
    users = self.find_all()
    for user in users:
        user.orders = self.order_dao.find_by_user_id(user.id)  # N queries
    return users

# Good: Single query with join
def find_users_with_orders(self):
    with self._connect() as conn:
        rows = conn.execute("""
            SELECT u.id, u.name, u.email, o.id as order_id, o.total
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id
        """).fetchall()
        # Map to users with orders
```

## Additional Frequently Asked Questions

### How do I handle schema migrations with DAOs?

DAOs depend on database schema. When the schema changes, DAOs must be updated in sync. Use migration tools (Flyway for Java, Alembic for Python, Knex migrations for Node.js) to version schema changes. Run migrations as part of deployment. Keep DAOs in sync by testing against the migrated schema.

### Should DAOs handle validation?

No. Validation belongs in the domain layer or entity classes. DAOs should trust that the data they receive is valid. This keeps the DAO focused on persistence only. Validate before calling DAO methods, not inside them.

### How do I test DAOs without a real database?

Use an in-memory database (H2 for Java, SQLite for Python, better-sqlite3 for Node.js) in tests. Configure the DAO to use the in-memory database during test runs. This provides fast, isolated tests without requiring a real database instance. For integration tests, use Docker to spin up a real database.
