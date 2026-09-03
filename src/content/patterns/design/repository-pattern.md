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
  - repository
  - design-pattern
  - architecture
  - data-access
  - python
  - java
  - javascript
relatedResources:
  - /patterns/repository-pattern-typescript
  - /patterns/factory-pattern
  - /patterns/dependency-injection-pattern
  - /guides/vertical-slice-architecture-guide
  - /guides/layered-architecture-guide
  - /recipes/soft-deletes
lastUpdated: "2026-08-31"
publishedAt: "2026-06-10"
author: Mathias Paulenko
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

## Overview

The Repository Pattern is an architectural design pattern that mediates between
the domain and data mapping layers. It gives you a collection-like interface for
accessing domain objects and hides the details of data storage and retrieval.

It's a foundation of Clean Architecture and Domain-Driven Design (DDD), and is
used in frameworks such as Spring Data JPA, Entity Framework, and Django ORM.

## When to Use

- You need to decouple business logic from data access implementation.
- You want to swap data sources (database, API, cache, file) without changing
  business code.
- You need testable data layers that can be mocked or replaced with in-memory
  stores.
- Data access logic is scattered and needs centralization.
- You want to apply caching, logging, or transaction management uniformly.

### When to avoid

- Small CRUD applications with a single data source and no test-doubling needs.
- Prototypes where the extra layer adds more friction than value.

## Solution

### Python

```python
from abc import ABC, abstractmethod
from typing import Optional

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
    return this.users.get(id) ?? null;
  }
  save(user) {
    this.users.set(user.id, user);
  }
}

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

UserRepository repo = new InMemoryUserRepository();
repo.save(new User(1, "Alice"));
System.out.println(repo.getById(1).map(u -> u.name).orElse("Unknown")); // Alice
```

## Explanation

The pattern splits data access into two layers:

- **Repository Interface**: defines what operations are available — such as
  `find`, `save`, and `delete` — without exposing how they're implemented.
- **Concrete Repository**: uses a specific storage
  mechanism, such as SQL, MongoDB, a REST API, or an in-memory Map, to implement the interface.

Business logic depends only on the interface. This lets you swap an in-memory
implementation for tests and a PostgreSQL or MongoDB implementation for
production without touching business code. See
[Dependency Injection](/patterns/dependency-injection-pattern/) for common
wiring strategies.

## Variants

| Variant | Use case | Trade-off |
| --- | --- | --- |
| [Generic Repository](/patterns/repository-pattern-typescript/) | CRUD for any entity with TypeScript generics | Less duplication, but less room for query optimization |
| Specification Pattern | Compose complex queries from reusable objects | Flexible, but harder to optimize at the database level |
| Unit of Work | Batch several operations into a single transaction | Adds complexity, but keeps data integrity |

## Best Practices

- Return domain objects, not raw rows or ORM-specific types.
- Use interfaces so repositories are testable and swappable.
- Keep repositories focused on data access; business logic belongs in services.
- Return `Optional` or nullable types for missing data instead of throwing.
- Add pagination for `findAll` operations to avoid loading huge datasets.
- Use transactions when several repository operations must be atomic.

## Common Mistakes

- Leaking ORM details into services by returning database-specific objects.
- Putting business logic inside repositories.
- Creating god repositories that handle unrelated entity types.
- Ignoring transactions across several operations that should be atomic.
- Eager loading more data than needed because the abstraction hides the cost.

## FAQ

### Is Repository the same as DAO?

Similar, but a DAO is usually lower-level and closer to tables. A Repository is
higher-level and works with domain aggregates. In practice the terms are often
used interchangeably.

### Do I still need Repository if I use an ORM?

Yes. ORMs handle mapping; repositories add a semantic layer that makes the
intent of data access explicit and testable.

### Can I use Repository with NoSQL databases?

Yes. The pattern is storage-agnostic. You can have `MongoUserRepository`,
`RedisUserRepository`, and `PostgresUserRepository` implementing the same
interface.

### Is this pattern suitable for small projects?

For small projects with few components it may add unnecessary complexity. Start
simple and introduce the pattern when you feel the pain it solves.

### Repository vs DAO: which do I use?

Use Repository when you think in domain terms (User, Order) and want to abstract
storage entirely. Use DAO when you map directly to tables and need specific
queries. Repository is domain-centric; DAO is table-centric.
