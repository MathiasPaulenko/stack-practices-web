---
contentType: patterns
slug: identity-map-pattern
title: "Identity Map Pattern"
description: "Ensure each object is loaded only once per transaction by caching instances by their primary key, preventing duplicate in-memory representations of the same database row."
metaDescription: "Learn the Identity Map Pattern to prevent duplicate object instances. Examples in Python, Java, and JavaScript with per-transaction object caching by primary key."
difficulty: intermediate
topics:
  - design
  - databases
tags:
  - identity-map
  - pattern
  - design-pattern
  - structural
  - caching
  - databases
  - orm
relatedResources:
  - /patterns/design/data-mapper-pattern
  - /patterns/design/unit-of-work-pattern
  - /patterns/design/data-access-object-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Identity Map Pattern to prevent duplicate object instances. Examples in Python, Java, and JavaScript with per-transaction object caching by primary key."
  keywords:
    - identity map
    - design pattern
    - caching
    - databases
    - orm
---

# Identity Map Pattern

## Overview

The Identity Map Pattern ensures that each object is loaded only once per transaction by maintaining a cache of all objects that have been read from the database in a single unit of work. When an object is requested by ID, the Identity Map checks if an instance already exists in memory before hitting the database again.

Without this pattern, loading the same database row twice within a transaction results in two different object instances. Modifying one instance and saving it can overwrite changes made to the other, causing lost updates. The Identity Map guarantees object identity: `row_id=42` always maps to the same in-memory object.

## When to Use

Use the Identity Map Pattern when:
- The same database row may be loaded multiple times during a single transaction
- Object identity equality (`is` / `==`) matters for business logic
- You want to prevent inconsistent in-memory state across the transaction
- The Unit of Work or Data Mapper needs to track which objects are already loaded

## When to Avoid

- Read-only queries where duplicate instances do not matter
- Stateless APIs where each request starts fresh and does not reuse objects
- When the memory overhead of caching all loaded objects is unacceptable
- Long-running transactions where cached objects become stale

## Solution

### Python

```python
from typing import Dict, Optional, Type, Any

class User:
    def __init__(self, user_id: int, name: str, email: str):
        self.id = user_id
        self.name = name
        self.email = email

    def __repr__(self):
        return f"User(id={self.id}, name='{self.name}')"


class IdentityMap:
    def __init__(self):
        self._map: Dict[Type, Dict[Any, Any]] = {}

    def add(self, entity):
        entity_type = type(entity)
        if entity_type not in self._map:
            self._map[entity_type] = {}
        key = self._extract_key(entity)
        self._map[entity_type][key] = entity

    def get(self, entity_type: Type, key: Any) -> Optional[Any]:
        return self._map.get(entity_type, {}).get(key)

    def has(self, entity_type: Type, key: Any) -> bool:
        return key in self._map.get(entity_type, {})

    def remove(self, entity_type: Type, key: Any):
        type_map = self._map.get(entity_type)
        if type_map:
            type_map.pop(key, None)

    def _extract_key(self, entity) -> Any:
        return getattr(entity, 'id', None)


class UserMapper:
    def __init__(self, connection, identity_map: IdentityMap):
        self._conn = connection
        self._identity_map = identity_map

    def find_by_id(self, user_id: int) -> Optional[User]:
        # Check identity map first
        cached = self._identity_map.get(User, user_id)
        if cached:
            return cached

        row = self._conn.execute(
            "SELECT id, name, email FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        if row:
            user = User(user_id=row["id"], name=row["name"], email=row["email"])
            self._identity_map.add(user)
            return user
        return None

    def find_all(self):
        rows = self._conn.execute("SELECT id, name, email FROM users").fetchall()
        users = []
        for row in rows:
            user = self._identity_map.get(User, row["id"])
            if not user:
                user = User(user_id=row["id"], name=row["name"], email=row["email"])
                self._identity_map.add(user)
            users.append(user)
        return users


# Usage
import sqlite3
conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)")
conn.execute("INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')")

identity_map = IdentityMap()
mapper = UserMapper(conn, identity_map)

user1 = mapper.find_by_id(1)
user2 = mapper.find_by_id(1)

print(user1 is user2)  # True — same object instance
```

### Java

```java
import java.sql.*;
import java.util.*;

public class User {
    private final int id;
    private String name;
    private String email;

    public User(int id, String name, String email) {
        this.id = id; this.name = name; this.email = email;
    }
    public int getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}

class IdentityMap {
    private final Map<Class<?>, Map<Object, Object>> map = new HashMap<>();

    @SuppressWarnings("unchecked")
    public <T> T get(Class<T> type, Object key) {
        return (T) map.getOrDefault(type, Collections.emptyMap()).get(key);
    }

    public <T> void add(Class<T> type, Object key, T entity) {
        map.computeIfAbsent(type, k -> new HashMap<>()).put(key, entity);
    }

    public <T> boolean has(Class<T> type, Object key) {
        return map.getOrDefault(type, Collections.emptyMap()).containsKey(key);
    }
}

class UserMapper {
    private final Connection conn;
    private final IdentityMap identityMap;

    public UserMapper(Connection conn, IdentityMap identityMap) {
        this.conn = conn; this.identityMap = identityMap;
    }

    public User findById(int id) throws SQLException {
        User cached = identityMap.get(User.class, id);
        if (cached != null) return cached;

        try (PreparedStatement stmt = conn.prepareStatement(
                "SELECT id, name, email FROM users WHERE id = ?")) {
            stmt.setInt(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    User user = new User(rs.getInt("id"), rs.getString("name"), rs.getString("email"));
                    identityMap.add(User.class, id, user);
                    return user;
                }
            }
        }
        return null;
    }
}

// Usage
Connection conn = DriverManager.getConnection("jdbc:sqlite::memory:");
conn.createStatement().execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)");
conn.createStatement().execute("INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')");

IdentityMap im = new IdentityMap();
UserMapper mapper = new UserMapper(conn, im);

User user1 = mapper.findById(1);
User user2 = mapper.findById(1);
System.out.println(user1 == user2); // true
```

### JavaScript

```javascript
class User {
  constructor(id, name, email) {
    this.id = id;
    this.name = name;
    this.email = email;
  }
}

class IdentityMap {
  constructor() {
    this.map = new Map();
  }

  get(type, key) {
    const typeMap = this.map.get(type);
    return typeMap ? typeMap.get(key) : undefined;
  }

  add(type, key, entity) {
    if (!this.map.has(type)) {
      this.map.set(type, new Map());
    }
    this.map.get(type).set(key, entity);
  }

  has(type, key) {
    const typeMap = this.map.get(type);
    return typeMap ? typeMap.has(key) : false;
  }
}

class UserMapper {
  constructor(db, identityMap) {
    this.db = db;
    this.identityMap = identityMap;
  }

  async findById(id) {
    const cached = this.identityMap.get(User, id);
    if (cached) return cached;

    const row = await this.db.get('SELECT id, name, email FROM users WHERE id = ?', id);
    if (!row) return null;

    const user = new User(row.id, row.name, row.email);
    this.identityMap.add(User, id, user);
    return user;
  }

  async findAll() {
    const rows = await this.db.all('SELECT id, name, email FROM users');
    const users = [];
    for (const row of rows) {
      let user = this.identityMap.get(User, row.id);
      if (!user) {
        user = new User(row.id, row.name, row.email);
        this.identityMap.add(User, row.id, user);
      }
      users.push(user);
    }
    return users;
  }
}

// Usage
// const im = new IdentityMap();
// const mapper = new UserMapper(db, im);
// const u1 = await mapper.findById(1);
// const u2 = await mapper.findById(1);
// console.log(u1 === u2); // true
```

## Explanation

The Identity Map sits between the database and the application:

1. **Load request** comes in for `User(id=5)`
2. **Identity Map checks** if `User:5` is already in memory
3. **Cache hit**: Returns the existing instance
4. **Cache miss**: Loads from DB, adds to map, returns the new instance

This guarantees that `find_by_id(5)` called three times in one transaction returns the exact same object.

## Variants

| Variant | Scope | Use Case |
|---------|-------|----------|
| **Transaction-scoped** | Lives for one Unit of Work | Default ORM behavior |
| **Session-scoped** | Lives for a user session | Web apps with long sessions |
| **Process-scoped** | Lives for the app lifetime | Read-heavy reference data |
| **Distributed** | Shared across services | Microservices with shared caches |

## What Works

- **Scope the Identity Map to the transaction.** Long-lived maps cause stale data.
- **Use alongside Unit of Work.** The two patterns complement each other perfectly.
- **Include in find_all() too.** Iterating a collection should reuse existing instances.
- **Clear on rollback.** Do not leave half-committed objects in the map.
- **Use weak references for long-lived maps.** Allows garbage collection if memory is tight.

## Common Mistakes

- **Identity Map lives too long.** Stale objects cause data inconsistencies.
- **Not using it in collection queries.** `find_all()` should still check the map.
- **Forgetting to remove deleted entities.** A deleted object should not be returned from the map.
- **Thread safety issues.** Maps shared across threads need synchronization.
- **Key mismatch.** Using the wrong field as the key causes collisions or misses.

## Real-World Examples

### Hibernate First-Level Cache

Hibernate's session-level cache is an Identity Map. `session.get(User.class, 5)` returns the same object on repeated calls within the same session.

### Entity Framework Core

EF Core tracks entities by key within a `DbContext` instance. Querying the same key twice returns the same tracked entity.

### SQLAlchemy Session

SQLAlchemy's `Session` maintains an identity map. Loading the same row twice yields identical Python objects (`user1 is user2` is `True`).

## Frequently Asked Questions

**Q: What is the difference between Identity Map and a general cache?**
A: A general cache stores data for performance. An Identity Map preserves object identity within a transaction scope. Its primary goal is correctness, not speed.

**Q: Can I use Identity Map without Unit of Work?**
A: Yes, but they are usually paired. The Identity Map prevents duplicates, while the Unit of Work coordinates writes.

**Q: What happens if the database changes while objects are in the Identity Map?**
A: The objects become stale. This is why Identity Maps should be transaction-scoped, not application-scoped.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
