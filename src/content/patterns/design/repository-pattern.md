---
contentType: patterns
slug: repository-pattern
title: "Repository Pattern"
description: "Abstract data access logic behind a clean interface. An architectural design pattern for testable, maintainable data layers."
metaDescription: "Learn the Repository Pattern with practical examples in Python, Java, and JavaScript. Architectural pattern for clean, testable data access."
difficulty: intermediate
topics:
  - architecture
tags:
  - architectural
  - architecture
  - data-access
  - design-pattern
  - java
  - javascript
  - pattern
  - python
  - repository
relatedResources:
  - /patterns/design/mvc-pattern
  - /recipes/databases/sql-joins
  - /patterns/design/factory-pattern
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Repository Pattern with practical examples in Python, Java, and JavaScript. Architectural pattern for clean, testable data access."
  keywords:
    - repository pattern
    - design pattern
    - architectural pattern
    - data access
    - persistence
    - python repository
    - java repository
    - javascript repository
---

# Repository Pattern

## Overview

The [Repository](/patterns/design/repository-pattern-typescript) Pattern is an architectural design pattern that mediates between the domain and data mapping layers using a collection-like interface for accessing domain objects. It abstracts the details of data storage and retrieval.

It is the foundation of clean architecture, Domain-Driven Design (DDD), and is heavily used in frameworks like Spring Data JPA, Entity Framework, and Django ORM.

## When to Use

Use the Repository Pattern when:
- You need to decouple business logic from data access implementation
- You want to swap data sources (database, API, cache, file) without changing business code
- You need testable data layers that can be mocked
- Your data access logic is scattered across the codebase and needs centralization
- You want to apply caching, logging, or transaction management uniformly

## Solution

### Python

```python
from abc import ABC, abstractmethod
from typing import List, Optional

class User:
    def __init__(self, id: int, name: str):
        self.id = id
        self.name = name

class UserRepository(ABC):
    @abstractmethod
    def get_by_id(self, id: int) -> Optional[User]:
        pass

    @abstractmethod
    def save(self, user: User) -> None:
        pass

class InMemoryUserRepository(UserRepository):
    def __init__(self):
        self._users = {}

    def get_by_id(self, id: int) -> Optional[User]:
        return self._users.get(id)

    def save(self, user: User) -> None:
        self._users[user.id] = user

# Usage
repo = InMemoryUserRepository()
repo.save(User(1, "Alice"))
print(repo.get_by_id(1).name)  # Alice
```

### JavaScript

```javascript
class User {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
}

class UserRepository {
  getById(id) {
    throw new Error("Not implemented");
  }
  save(user) {
    throw new Error("Not implemented");
  }
}

class InMemoryUserRepository extends UserRepository {
  constructor() {
    super();
    this.users = new Map();
  }
  getById(id) {
    return this.users.get(id);
  }
  save(user) {
    this.users.set(user.id, user);
  }
}

// Usage
const repo = new InMemoryUserRepository();
repo.save(new User(1, "Alice"));
console.log(repo.getById(1).name); // Alice
```

### Java

```java
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

class User {
    int id;
    String name;
    User(int id, String name) { this.id = id; this.name = name; }
}

interface UserRepository {
    Optional<User> getById(int id);
    void save(User user);
}

class InMemoryUserRepository implements UserRepository {
    private final Map<Integer, User> users = new HashMap<>();

    public Optional<User> getById(int id) {
        return Optional.ofNullable(users.get(id));
    }

    public void save(User user) {
        users.put(user.id, user);
    }
}

// Usage
UserRepository repo = new InMemoryUserRepository();
repo.save(new User(1, "Alice"));
System.out.println(repo.getById(1).map(u -> u.name).orElse("Unknown")); // Alice
```

## Explanation

The Repository Pattern separates data access into two layers:

- **Repository Interface**: Defines what operations are available (find, save, delete) without exposing how they are implemented
- **Concrete Repository**: Implements the interface for a specific storage mechanism (SQL database, in-memory, REST API)

Business logic depends only on the interface, so you can swap implementations for testing (in-memory) or production (PostgreSQL, MongoDB) without touching business code.

## Variants

| Variant | Use Case | Trade-off |
|---------|----------|-----------|
| **[Generic Repository](/patterns/design/repository-pattern-typescript)** | CRUD for any entity type | Less code duplication, but less specific query optimization |
| **Specification Pattern** | Complex query composition | Very flexible, but harder to optimize at the database level |
| **Unit of Work** | Batch multiple operations into a single transaction | Adds complexity, but essential for data integrity |

## What Works

- **Return domain objects, not raw data rows**: Map database results to rich domain objects
- **Use interfaces for repositories**: This is what makes them testable and swappable. See [Dependency Injection](/patterns/design/dependency-injection-pattern) for wiring strategies.
- **Keep repositories focused on data access**: Business logic belongs in services, not repositories
- **Return `Optional` or nullable types** instead of throwing exceptions for missing data
- **Consider pagination** for `findAll` operations to prevent loading massive datasets

## Common Mistakes

- **Leaking ORM details**: Returning ORM-specific objects instead of plain domain objects
- **Business logic in repositories**: Repositories should only fetch and persist; logic belongs in services
- **God repositories**: A single repository handling unrelated entity types
- **Ignoring transactions**: Multiple repository operations that should be atomic but are not wrapped in a transaction
- **Eager loading everything**: Fetching more data than needed because the abstraction hides the query cost

## Frequently Asked Questions

**Q: Is Repository the same as DAO (Data Access Object)?**
A: Similar, but DAO is typically lower-level and closer to the database. Repository is higher-level and works with domain aggregates. In practice, the terms are often used interchangeably.

**Q: Do I need Repository if I use an ORM?**
A: Yes. ORMs handle mapping, but repositories add a semantic layer that makes the intent of data access explicit and testable.

**Q: Can I use Repository with NoSQL databases?**
A: Absolutely. The pattern is storage-agnostic. You can have `MongoUserRepository`, `RedisUserRepository`, and `PostgresUserRepository` all implementing the same interface.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.


## Advanced Topics

### Scenario: Repository for Multi-DB with TypeORM

```typescript
// Repository pattern: abstract data access
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(opts: QueryOpts): Promise<User[]>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}

// PostgreSQL implementation
class PostgresUserRepository implements UserRepository {
  constructor(private pool: Pool) {}
  async findById(id: string): Promise<User | null> {
    const res = await this.pool.query("SELECT * FROM users WHERE id = $1", [id]);
    return res.rows[0] || null;
  }
  async findByEmail(email: string): Promise<User | null> {
    const res = await this.pool.query("SELECT * FROM users WHERE email = $1", [email]);
    return res.rows[0] || null;
  }
  async findAll(opts: QueryOpts): Promise<User[]> {
    const limit = opts.limit || 50;
    const offset = opts.offset || 0;
    const res = await this.pool.query("SELECT * FROM users LIMIT $1 OFFSET $2", [limit, offset]);
    return res.rows;
  }
  async save(user: User): Promise<User> {
    if (user.id) {
      const res = await this.pool.query(
        "UPDATE users SET name=$1, email=$2 WHERE id=$3 RETURNING *",
        [user.name, user.email, user.id]
      );
      return res.rows[0];
    }
    const res = await this.pool.query(
      "INSERT INTO users (id, name, email) VALUES ($1, $2, $3) RETURNING *",
      [crypto.randomUUID(), user.name, user.email]
    );
    return res.rows[0];
  }
  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM users WHERE id = $1", [id]);
  }
}

// MongoDB implementation
class MongoUserRepository implements UserRepository {
  constructor(private collection: Collection) {}
  async findById(id: string): Promise<User | null> {
    return this.collection.findOne({ _id: new ObjectId(id) });
  }
  async save(user: User): Promise<User> {
    if (user._id) {
      await this.collection.updateOne({ _id: user._id }, { $set: user });
      return user;
    }
    const res = await this.collection.insertOne(user);
    return { ...user, _id: res.insertedId };
  }
}

// Usage: the service does not know which DB is used
class UserService {
  constructor(private repo: UserRepository) {}
  async getUser(id: string) { return this.repo.findById(id); }
  async createUser(data: NewUser) { return this.repo.save(data); }
}

// In tests: use mock repository
class MockUserRepository implements UserRepository {
  private users = new Map<string, User>();
  async findById(id: string) { return this.users.get(id) || null; }
  async save(user: User) { this.users.set(user.id, user); return user; }
}
```

Lessons:
  - Repository abstracts data access from the domain
  - The service does not know SQL, MongoDB or storage details
  - Switching DB only requires a new repository implementation
  - In tests, use mock or in-memory repository
  - Repository vs DAO: repository is domain-centric, DAO is table-centric
```

### Repository vs DAO: which do I use?

Use Repository when you think in domain terms (User, Order) and want to abstract storage entirely. Use DAO when you map directly to tables and need specific queries. Repository returns domain aggregates; DAO returns rows. Repository is higher level; DAO is lower level. For microservices, Repository is preferable: the domain should not know SQL.
