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

## Best Practices

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
