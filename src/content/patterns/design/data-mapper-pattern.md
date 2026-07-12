---





contentType: patterns
slug: data-mapper-pattern
title: "Data Mapper Pattern"
description: "Separate in-memory domain objects from the database by delegating persistence to a dedicated mapper layer, keeping models framework-agnostic."
metaDescription: "Learn the Data Mapper Pattern for clean ORM architecture. Examples in Python, Java, and JavaScript with mappers, repositories, and domain models."
difficulty: intermediate
topics:
  - design
  - databases
tags:
  - data-mapper
  - pattern
  - design-pattern
  - structural
  - orm
  - persistence
  - databases
relatedResources:
  - /patterns/active-record-pattern
  - /patterns/data-access-object-pattern
  - /patterns/unit-of-work-pattern
  - /patterns/composite-entity-pattern
  - /patterns/eager-loading-pattern
  - /patterns/identity-map-pattern
  - /patterns/specification-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Data Mapper Pattern for clean ORM architecture. Examples in Python, Java, and JavaScript with mappers, repositories, and domain models."
  keywords:
    - data mapper
    - design pattern
    - orm
    - persistence
    - databases





---

# Data Mapper Pattern

## Overview

The Data Mapper Pattern separates in-memory domain objects from the database by delegating all persistence logic to a dedicated mapper layer. The domain model knows nothing about the database — no SQL, no ORM decorators, no `save()` methods. A separate Data Mapper object handles the translation between the domain model and database records.

This is the pattern behind Hibernate (JPA), SQLAlchemy's classical mapping, and the Repository pattern when used with ORMs. It provides the cleanest separation of concerns for complex domains but requires more boilerplate than Active Record.

## When to Use

Use the Data Mapper Pattern when:
- The domain model is rich and should remain independent of the database
- You need to map the same domain object to multiple database schemas
- Testing domain logic without hitting the database is important
- The persistence mechanism may change (SQL now, NoSQL later)

## When to Avoid

- Simple CRUD applications where Active Record is sufficient
- When the overhead of an extra mapping layer is not justified
- Prototypes or internal tools where speed of development matters more than purity

## Solution

### Python

```python
from dataclasses import dataclass
from typing import Optional, Dict, List

# Domain Model — knows nothing about the database
@dataclass
class User:
    id: Optional[int] = None
    name: str = ""
    email: str = ""

    def update_email(self, new_email: str):
        if "@" not in new_email:
            raise ValueError("Invalid email")
        self.email = new_email


# Data Mapper — handles all persistence logic
class UserMapper:
    def __init__(self, connection):
        self._conn = connection

    def find_by_id(self, user_id: int) -> Optional[User]:
        row = self._conn.execute(
            "SELECT id, name, email FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        if row:
            return User(id=row["id"], name=row["name"], email=row["email"])
        return None

    def find_all(self) -> List[User]:
        rows = self._conn.execute("SELECT id, name, email FROM users").fetchall()
        return [User(id=r["id"], name=r["name"], email=r["email"]) for r in rows]

    def insert(self, user: User):
        cursor = self._conn.execute(
            "INSERT INTO users (name, email) VALUES (?, ?)",
            (user.name, user.email)
        )
        user.id = cursor.lastrowid

    def update(self, user: User):
        self._conn.execute(
            "UPDATE users SET name = ?, email = ? WHERE id = ?",
            (user.name, user.email, user.id)
        )

    def delete(self, user_id: int):
        self._conn.execute("DELETE FROM users WHERE id = ?", (user_id,))


# Usage
import sqlite3
conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)")

mapper = UserMapper(conn)
user = User(name="Alice", email="alice@example.com")
mapper.insert(user)
print(f"Inserted user with ID: {user.id}")

loaded = mapper.find_by_id(user.id)
print(loaded.name, loaded.email)
```

### Java

```java
import java.sql.*;
import java.util.*;

public class User {
    private Integer id;
    private String name;
    private String email;

    public User() {}
    public User(String name, String email) {
        this.name = name;
        this.email = email;
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public void updateEmail(String newEmail) {
        if (!newEmail.contains("@")) throw new IllegalArgumentException("Invalid email");
        this.email = newEmail;
    }
}

class UserMapper {
    private final Connection conn;

    public UserMapper(Connection conn) { this.conn = conn; }

    public User findById(int id) throws SQLException {
        try (PreparedStatement stmt = conn.prepareStatement(
                "SELECT id, name, email FROM users WHERE id = ?")) {
            stmt.setInt(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    User user = new User();
                    user.setId(rs.getInt("id"));
                    user.setName(rs.getString("name"));
                    user.setEmail(rs.getString("email"));
                    return user;
                }
            }
        }
        return null;
    }

    public List<User> findAll() throws SQLException {
        List<User> users = new ArrayList<>();
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT id, name, email FROM users")) {
            while (rs.next()) {
                User user = new User();
                user.setId(rs.getInt("id"));
                user.setName(rs.getString("name"));
                user.setEmail(rs.getString("email"));
                users.add(user);
            }
        }
        return users;
    }

    public void insert(User user) throws SQLException {
        try (PreparedStatement stmt = conn.prepareStatement(
                "INSERT INTO users (name, email) VALUES (?, ?)", Statement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, user.getName());
            stmt.setString(2, user.getEmail());
            stmt.executeUpdate();
            try (ResultSet keys = stmt.getGeneratedKeys()) {
                if (keys.next()) user.setId(keys.getInt(1));
            }
        }
    }

    public void update(User user) throws SQLException {
        try (PreparedStatement stmt = conn.prepareStatement(
                "UPDATE users SET name = ?, email = ? WHERE id = ?")) {
            stmt.setString(1, user.getName());
            stmt.setString(2, user.getEmail());
            stmt.setInt(3, user.getId());
            stmt.executeUpdate();
        }
    }
}

// Usage
Connection conn = DriverManager.getConnection("jdbc:sqlite::memory:");
conn.createStatement().execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)");

UserMapper mapper = new UserMapper(conn);
User user = new User("Alice", "alice@example.com");
mapper.insert(user);
```

### JavaScript

```javascript
class User {
  constructor(name, email) {
    this.id = null;
    this.name = name;
    this.email = email;
  }

  updateEmail(newEmail) {
    if (!newEmail.includes('@')) throw new Error('Invalid email');
    this.email = newEmail;
  }
}

class UserMapper {
  constructor(db) {
    this.db = db;
  }

  async findById(id) {
    const row = await this.db.get('SELECT id, name, email FROM users WHERE id = ?', id);
    if (!row) return null;
    const user = new User(row.name, row.email);
    user.id = row.id;
    return user;
  }

  async findAll() {
    const rows = await this.db.all('SELECT id, name, email FROM users');
    return rows.map(r => {
      const user = new User(r.name, r.email);
      user.id = r.id;
      return user;
    });
  }

  async insert(user) {
    const result = await this.db.run(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      [user.name, user.email]
    );
    user.id = result.lastID;
  }

  async update(user) {
    await this.db.run(
      'UPDATE users SET name = ?, email = ? WHERE id = ?',
      [user.name, user.email, user.id]
    );
  }

  async delete(id) {
    await this.db.run('DELETE FROM users WHERE id = ?', id);
  }
}

// Usage
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');
// db would need promisify wrapper for async/await
```

## Explanation

Data Mapper separates concerns into distinct layers:

- **Domain Model**: Pure business logic. No database imports, no annotations, no `save()`.
- **Data Mapper**: Knows how to convert domain objects to SQL and back. No business logic.
- **Database**: The persistence store, completely hidden from the domain model.

This separation makes the domain model portable across frameworks and databases.

## Variants

| Variant | Approach | Use Case |
|---------|----------|----------|
| **Identity Map** | Cache loaded objects by ID | Prevent duplicate object instances |
| **Unit of Work** | Track changes and commit as a batch | Transactional consistency |
| **Query Object** | Encapsulate SQL in an object | Composable database queries |
| **Repository** | Mediate between domain and data | Abstract away mapper details from app |

## What Works

- **Keep the domain model pure.** No framework dependencies, no persistence methods.
- **One mapper per domain class.** Do not let one mapper handle multiple unrelated types.
- **Use lazy loading carefully.** It is convenient but can cause N+1 queries.
- **Identity Map prevents duplicates.** Track loaded objects to avoid creating multiple instances for the same row.
- **Return immutable snapshots** when exposing domain data to prevent accidental mutation.

## Common Mistakes

- **Leaking SQL into the domain model.** If the model knows about the database, it is not Data Mapper.
- **Mapper as a God class.** One class handling 20 domain types becomes unmaintainable.
- **Ignoring transactions.** Individual mapper operations need to be composable into transactions.
- **Deep object graphs without lazy loading.** Eagerly loading a tree can pull the entire database.
- **Treating mappers as repositories.** The mapper is about persistence. The repository is about collection semantics.

## Real-World Examples

### Hibernate (JPA)

Hibernate uses XML or annotation-based mapping to separate entities from tables. The `Session` acts as a data mapper, translating between object state and SQL.

### SQLAlchemy Classical Mapping

SQLAlchemy supports declarative (Active Record-like) and classical (Data Mapper) styles. Classical mapping uses `mapper(User, user_table)` to separate the class from the table definition.

### Doctrine ORM

PHP's Doctrine ORM uses Data Mapper with XML/YAML/annotation mappings to separate entity classes from persistence details.

## Frequently Asked Questions

**Q: What is the difference between Data Mapper and Active Record?**
A: [Active Record](/patterns/design/active-record-pattern) bundles data and persistence in the same class. Data Mapper separates them into a distinct mapper object.

**Q: Is Data Mapper slower than Active Record?**
A: Slightly more overhead due to the extra abstraction layer, but the difference is negligible compared to database round-trips.

**Q: Can I use Data Mapper with NoSQL databases?**
A: Yes. The mapper translates between domain objects and the document/key-value format of the database.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
