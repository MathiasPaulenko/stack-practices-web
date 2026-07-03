---
contentType: patterns
slug: unit-of-work-pattern
title: "Unit of Work Pattern"
description: "Track changes to in-memory objects during a business transaction and commit all updates atomically to the database, ensuring consistency."
metaDescription: "Learn the Unit of Work Pattern for atomic transactions. Examples in Python, Java, and JavaScript with change tracking and batch commit."
difficulty: intermediate
topics:
  - design
  - databases
tags:
  - unit-of-work
  - pattern
  - design-pattern
  - structural
  - transactions
  - databases
  - orm
relatedResources:
  - /patterns/design/data-mapper-pattern
  - /patterns/design/data-access-object-pattern
  - /patterns/design/active-record-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Unit of Work Pattern for atomic transactions. Examples in Python, Java, and JavaScript with change tracking and batch commit."
  keywords:
    - unit of work
    - design pattern
    - transactions
    - databases
    - orm
---

# Unit of Work Pattern

## Overview

The Unit of Work Pattern maintains a list of objects affected by a business transaction and coordinates writing out changes to the database as a single atomic operation. Rather than saving each entity change immediately, the Unit of Work tracks insertions, updates, and deletions, then commits them all together — or rolls them all back on failure.

This pattern is essential for transactional consistency. It prevents partial updates where one object is saved and another fails, leaving the database in an inconsistent state. ORMs like Hibernate's `Session` and Entity Framework's `DbContext` are implementations of Unit of Work.

## When to Use

Use the Unit of Work Pattern when:
- Multiple objects must be updated atomically within a single business transaction
- You need to batch database operations for performance
- Changes span multiple repositories or mappers
- Consistency is more important than immediate persistence

## When to Avoid

- Single-object updates where immediate persistence is simpler
- Read-only transactions (no changes to track)
- When the transaction boundary is unclear and the unit of work grows too large
- Eventual consistency models where asynchronous processing is preferred

## Solution

### Python

```python
from typing import List, Dict, Set, Any, Optional
from dataclasses import dataclass
from enum import Enum, auto

class ChangeAction(Enum):
    INSERT = auto()
    UPDATE = auto()
    DELETE = auto()

@dataclass
class Change:
    entity: Any
    action: ChangeAction

class UnitOfWork:
    def __init__(self, connection):
        self._conn = connection
        self._changes: List[Change] = []
        self._identity_map: Dict[Any, Any] = {}
        self._committed = False

    def register_new(self, entity):
        self._changes.append(Change(entity, ChangeAction.INSERT))

    def register_dirty(self, entity):
        # Avoid duplicate dirty tracking
        if not any(c.entity is entity and c.action == ChangeAction.UPDATE for c in self._changes):
            self._changes.append(Change(entity, ChangeAction.UPDATE))

    def register_deleted(self, entity):
        self._changes.append(Change(entity, ChangeAction.DELETE))

    def commit(self):
        if self._committed:
            raise RuntimeError("Already committed")
        try:
            for change in self._changes:
                if change.action == ChangeAction.INSERT:
                    self._insert(change.entity)
                elif change.action == ChangeAction.UPDATE:
                    self._update(change.entity)
                elif change.action == ChangeAction.DELETE:
                    self._delete(change.entity)
            self._conn.commit()
            self._committed = True
        except Exception:
            self._conn.rollback()
            raise

    def _insert(self, entity):
        cursor = self._conn.execute(
            "INSERT INTO users (name, email) VALUES (?, ?)",
            (entity.name, entity.email)
        )
        entity.id = cursor.lastrowid

    def _update(self, entity):
        self._conn.execute(
            "UPDATE users SET name = ?, email = ? WHERE id = ?",
            (entity.name, entity.email, entity.id)
        )

    def _delete(self, entity):
        self._conn.execute("DELETE FROM users WHERE id = ?", (entity.id,))


# Domain model
class User:
    def __init__(self, name: str, email: str):
        self.id = None
        self.name = name
        self.email = email


# Usage
import sqlite3
conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)")

uow = UnitOfWork(conn)
user1 = User("Alice", "alice@example.com")
user2 = User("Bob", "bob@example.com")

uow.register_new(user1)
uow.register_new(user2)
user2.email = "bob2@example.com"
uow.register_dirty(user2)

uow.commit()
print(f"Alice ID: {user1.id}, Bob ID: {user2.id}")
```

### Java

```java
import java.sql.*;
import java.util.*;

public class User {
    private Integer id;
    private String name;
    private String email;

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
}

enum ChangeAction { INSERT, UPDATE, DELETE }

record Change(User entity, ChangeAction action) {}

class UnitOfWork {
    private final Connection conn;
    private final List<Change> changes = new ArrayList<>();
    private boolean committed = false;

    public UnitOfWork(Connection conn) { this.conn = conn; }

    public void registerNew(User entity) { changes.add(new Change(entity, ChangeAction.INSERT)); }
    public void registerDirty(User entity) { changes.add(new Change(entity, ChangeAction.UPDATE)); }
    public void registerDeleted(User entity) { changes.add(new Change(entity, ChangeAction.DELETE)); }

    public void commit() throws SQLException {
        if (committed) throw new IllegalStateException("Already committed");
        try {
            for (Change change : changes) {
                switch (change.action()) {
                    case INSERT -> insert(change.entity());
                    case UPDATE -> update(change.entity());
                    case DELETE -> delete(change.entity());
                }
            }
            conn.commit();
            committed = true;
        } catch (SQLException e) {
            conn.rollback();
            throw e;
        }
    }

    private void insert(User user) throws SQLException {
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

    private void update(User user) throws SQLException {
        try (PreparedStatement stmt = conn.prepareStatement(
                "UPDATE users SET name = ?, email = ? WHERE id = ?")) {
            stmt.setString(1, user.getName());
            stmt.setString(2, user.getEmail());
            stmt.setInt(3, user.getId());
            stmt.executeUpdate();
        }
    }

    private void delete(User user) throws SQLException {
        try (PreparedStatement stmt = conn.prepareStatement("DELETE FROM users WHERE id = ?")) {
            stmt.setInt(1, user.getId());
            stmt.executeUpdate();
        }
    }
}

// Usage
Connection conn = DriverManager.getConnection("jdbc:sqlite::memory:");
conn.createStatement().execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)");

UnitOfWork uow = new UnitOfWork(conn);
User alice = new User("Alice", "alice@example.com");
User bob = new User("Bob", "bob@example.com");

uow.registerNew(alice);
uow.registerNew(bob);
uow.commit();
```

### JavaScript

```javascript
class User {
  constructor(name, email) {
    this.id = null;
    this.name = name;
    this.email = email;
  }
}

const ChangeAction = {
  INSERT: 'INSERT',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
};

class UnitOfWork {
  constructor(db) {
    this.db = db;
    this.changes = [];
    this.committed = false;
  }

  registerNew(entity) {
    this.changes.push({ entity, action: ChangeAction.INSERT });
  }

  registerDirty(entity) {
    this.changes.push({ entity, action: ChangeAction.UPDATE });
  }

  registerDeleted(entity) {
    this.changes.push({ entity, action: ChangeAction.DELETE });
  }

  async commit() {
    if (this.committed) throw new Error('Already committed');
    try {
      for (const change of this.changes) {
        if (change.action === ChangeAction.INSERT) await this.insert(change.entity);
        else if (change.action === ChangeAction.UPDATE) await this.update(change.entity);
        else if (change.action === ChangeAction.DELETE) await this.delete(change.entity);
      }
      this.committed = true;
    } catch (e) {
      throw e;
    }
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

  async delete(user) {
    await this.db.run('DELETE FROM users WHERE id = ?', [user.id]);
  }
}

// Usage
// const uow = new UnitOfWork(db);
// uow.registerNew(new User('Alice', 'alice@example.com'));
// await uow.commit();
```

## Explanation

Unit of Work solves two problems:

1. **Atomicity**: Either all changes succeed or none do. No partial updates.
2. **Change tracking**: The application modifies in-memory objects freely. The Unit of Work records what changed and writes it efficiently.

The pattern coordinates between:
- **Domain objects**: Modified freely during the transaction
- **Data mappers/repositories**: Deferred until commit
- **Database**: Receives batched operations inside a transaction

## Variants

| Variant | Tracking Method | Use Case |
|---------|-----------------|----------|
| **Caller registration** | App explicitly calls `registerDirty()` | Explicit control over what gets saved |
| **Object registration** | Domain object notifies UoW on change | Automatic dirty tracking |
| **Proxy-based** | Proxies intercept setters to track changes | Transparent to the domain model |
| **Snapshot** | Compare current state to loaded snapshot | Works with immutable objects |

## What Works

- **One Unit of Work per transaction.** Do not reuse a committed UoW.
- **Keep transactions short.** Long-running UoWs hold locks and accumulate state.
- **Use identity map alongside UoW.** Ensure the same row maps to one object instance.
- **Commit at the boundary.** Controller or service layer should own the transaction.
- **Rollback on any exception.** Never swallow errors without rolling back.

## Common Mistakes

- **Multiple UoWs in one transaction.** They cannot coordinate with each other.
- **Forgetting to call commit().** Changes stay in memory and are lost.
- **Modifying objects after commit.** They are detached from the transaction.
- **UoW as a global singleton.** Thread safety becomes a nightmare.
- **Including read-only queries in the UoW.** It should only track changes.

## Real-World Examples

### Hibernate Session

Hibernate's `Session` is a Unit of Work. Flushing writes all pending changes. `Transaction.commit()` delegates to the session.

### Entity Framework Core

`DbContext` tracks entity states (`Added`, `Modified`, `Deleted`). `SaveChanges()` commits everything atomically.

### Django ORM

Django does not have a classical Unit of Work, but atomic transactions via `transaction.atomic()` achieve the same goal.

## Frequently Asked Questions

**Q: What is the difference between Unit of Work and a database transaction?**
A: A database transaction is the ACID boundary at the DB level. Unit of Work is the application-level coordinator that tracks changes and drives the transaction.

**Q: Can Unit of Work span multiple databases?**
A: Yes, with distributed transactions (2PC) or saga patterns, but it adds considerable complexity.

**Q: How does Unit of Work relate to Repository?**
A: The Repository abstracts persistence. The Unit of Work tracks what the repositories changed and coordinates the commit.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
