---



contentType: patterns
slug: active-record-pattern
title: "Active Record Pattern"
description: "Wrap a database table or view in a class where an instance is tied to a single row, and the class provides methods for CRUD operations directly on the object."
metaDescription: "Learn the Active Record Pattern for object-relational mapping. Examples in Python, Java, and JavaScript with built-in persistence methods on domain objects."
difficulty: beginner
topics:
  - design
tags:
  - active-record
  - pattern
  - design-pattern
  - structural
  - orm
  - persistence
  - database
relatedResources:
  - /patterns/data-access-object-pattern
  - /patterns/data-mapper-pattern
  - /patterns/repository-pattern
  - /patterns/composite-entity-pattern
  - /patterns/unit-of-work-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Active Record Pattern for object-relational mapping. Examples in Python, Java, and JavaScript with built-in persistence methods on domain objects."
  keywords:
    - active record
    - design pattern
    - orm
    - persistence
    - database



---

# Active Record Pattern

## Overview

The Active Record Pattern wraps a database table in a class where each instance represents a single row. The object carries both data (attributes) and behavior (CRUD methods). Calling `user.save()` persists the object directly to the database without a separate data access layer.

This pattern is the simplest way to bridge objects and relational databases. Ruby on Rails, Django ORM, and Laravel Eloquent are all built on Active Record. It reduces boilerplate but couples domain logic to persistence.

## When to Use

Use the Active Record Pattern when:
- The domain model closely maps to database tables
- You want minimal boilerplate for CRUD operations
- Rapid prototyping is more important than architectural purity
- The application is small to medium and does not need complex domain logic

## When to Avoid

- Complex domain logic should be isolated from persistence (use Data Mapper or Repository)
- The same entity needs to be persisted to multiple data sources
- Unit testing without a database is difficult because the object depends on it
- The application grows large and Active Record objects become bloated

## Solution

### Python

```python
import sqlite3
from typing import Optional, List

class User:
    _db_path = "app.db"

    def __init__(self, id: int = None, name: str = "", email: str = ""):
        self.id = id
        self.name = name
        self.email = email

    @classmethod
    def _connect(cls):
        return sqlite3.connect(cls._db_path)

    def save(self):
        with self._connect() as conn:
            if self.id is None:
                cursor = conn.execute(
                    "INSERT INTO users (name, email) VALUES (?, ?)",
                    (self.name, self.email)
                )
                self.id = cursor.lastrowid
            else:
                conn.execute(
                    "UPDATE users SET name = ?, email = ? WHERE id = ?",
                    (self.name, self.email, self.id)
                )
            conn.commit()
        return self

    def delete(self):
        with self._connect() as conn:
            conn.execute("DELETE FROM users WHERE id = ?", (self.id,))
            conn.commit()

    @classmethod
    def find_by_id(cls, user_id: int) -> Optional["User"]:
        with cls._connect() as conn:
            row = conn.execute(
                "SELECT id, name, email FROM users WHERE id = ?", (user_id,)
            ).fetchone()
            return cls(*row) if row else None

    @classmethod
    def find_all(cls) -> List["User"]:
        with cls._connect() as conn:
            rows = conn.execute("SELECT id, name, email FROM users").fetchall()
            return [cls(*row) for row in rows]


# Usage
user = User(name="Alice", email="alice@example.com")
user.save()
print(User.find_by_id(user.id))
```

### Java

```java
import java.sql.*;
import java.util.*;

public class User {
    private static String dbUrl = "jdbc:sqlite:app.db";

    private int id;
    private String name;
    private String email;

    public User() {}

    public User(int id, String name, String email) {
        this.id = id;
        this.name = name;
        this.email = email;
    }

    public void save() {
        try (Connection conn = DriverManager.getConnection(dbUrl)) {
            if (id == 0) {
                PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO users (name, email) VALUES (?, ?)", Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, name);
                ps.setString(2, email);
                ps.executeUpdate();
                ResultSet keys = ps.getGeneratedKeys();
                keys.next();
                id = keys.getInt(1);
            } else {
                PreparedStatement ps = conn.prepareStatement(
                    "UPDATE users SET name = ?, email = ? WHERE id = ?");
                ps.setString(1, name);
                ps.setString(2, email);
                ps.setInt(3, id);
                ps.executeUpdate();
            }
        } catch (SQLException e) { throw new RuntimeException(e); }
    }

    public void delete() {
        try (Connection conn = DriverManager.getConnection(dbUrl)) {
            PreparedStatement ps = conn.prepareStatement("DELETE FROM users WHERE id = ?");
            ps.setInt(1, id);
            ps.executeUpdate();
        } catch (SQLException e) { throw new RuntimeException(e); }
    }

    public static User findById(int id) {
        try (Connection conn = DriverManager.getConnection(dbUrl)) {
            PreparedStatement ps = conn.prepareStatement("SELECT id, name, email FROM users WHERE id = ?");
            ps.setInt(1, id);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) return new User(rs.getInt(1), rs.getString(2), rs.getString(3));
        } catch (SQLException e) { throw new RuntimeException(e); }
        return null;
    }

    public static List<User> findAll() {
        List<User> users = new ArrayList<>();
        try (Connection conn = DriverManager.getConnection(dbUrl)) {
            Statement st = conn.createStatement();
            ResultSet rs = st.executeQuery("SELECT id, name, email FROM users");
            while (rs.next()) {
                users.add(new User(rs.getInt(1), rs.getString(2), rs.getString(3)));
            }
        } catch (SQLException e) { throw new RuntimeException(e); }
        return users;
    }

    public int getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}

// Usage
User user = new User();
user.setName("Alice");
user.save();
System.out.println(User.findById(user.getId()));
```

### JavaScript

```javascript
class User {
  static db = null; // Injected database connection

  constructor({ id = null, name = '', email = '' } = {}) {
    this.id = id;
    this.name = name;
    this.email = email;
  }

  async save() {
    if (this.id === null) {
      const result = await User.db.run(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        this.name, this.email
      );
      this.id = result.lastID;
    } else {
      await User.db.run(
        'UPDATE users SET name = ?, email = ? WHERE id = ?',
        this.name, this.email, this.id
      );
    }
    return this;
  }

  async delete() {
    await User.db.run('DELETE FROM users WHERE id = ?', this.id);
  }

  static async findById(userId) {
    const row = await User.db.get('SELECT id, name, email FROM users WHERE id = ?', userId);
    return row ? new User(row) : null;
  }

  static async findAll() {
    const rows = await User.db.all('SELECT id, name, email FROM users');
    return rows.map(row => new User(row));
  }
}

// Usage
const user = new User({ name: 'Alice', email: 'alice@example.com' });
await user.save();
const found = await User.findById(user.id);
console.log(found);
```

## Explanation

An Active Record object combines:

- **Domain data**: Fields that map to database columns
- **Persistence logic**: Methods like `save()`, `delete()`, and `find()` that execute SQL
- **Validation**: Business rules checked before persistence

The class is both a domain model and a gateway to the database. This simplicity is its strength and weakness.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Classic Active Record** | Object owns its persistence | Rails, Django ORM |
| **Data Mapper** | Separate mapper class handles persistence | Hibernate, SQLAlchemy |
| **Repository** | Collection-like abstraction over persistence | DDD aggregates |
| **Table Data Gateway** | Static methods on a class, not instances | Simple CRUD utilities |

## What Works

- **Keep validations in the model.** Check constraints before saving and raise meaningful errors.
- **Use callbacks sparingly.** `before_save` and `after_create` hooks create invisible control flow.
- **Scope queries.** `User.where(active=True)` is safer than raw SQL in business logic.
- **Lazy load associations.** Load related records only when accessed, not on every fetch.
- **Avoid business logic in the database.** Stored procedures couple your code to the DB vendor.

## Common Mistakes

- **Fat models** with 500 lines of code. Split business logic into service objects.
- **N+1 queries** when iterating over associations. Use eager loading (`select_related`, `includes`).
- **Database access in unit tests.** Active Record makes this hard. Use in-memory SQLite or mocks.
- **Validation in controllers** instead of the model. The model is the authoritative place for rules.
- **Mutating during iteration.** Modifying a collection while iterating causes undefined behavior.

## Real-World Examples

### Ruby on Rails

`User.create(name: "Alice")` creates a record, validates it, and persists in one call. Associations like `user.posts` are lazily loaded.

### Django ORM

`user.save()` and `User.objects.get(id=1)` are Active Record operations. Django adds managers (`objects`) for collection queries.

### Laravel Eloquent

`User::find(1)` and `$user->save()` follow Active Record. Eloquent also supports relationships, scopes, and query builders.

## Frequently Asked Questions

**Q: What is the difference between Active Record and Data Mapper?**
A: Active Record puts persistence methods on the domain object. [Data Mapper](/patterns/design/data-mapper-pattern) uses a separate class to map objects to the database, keeping the domain model pure.

**Q: Is Active Record an anti-pattern?**
A: No, but it is a poor fit for complex domains. It excels in CRUD-heavy applications and rapid prototyping.

**Q: How do I test Active Record objects without a database?**
A: Use an in-memory SQLite database for tests, or refactor persistence into a separate layer that can be mocked.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
