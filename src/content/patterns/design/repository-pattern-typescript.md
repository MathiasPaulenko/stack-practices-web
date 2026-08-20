---
contentType: patterns
slug: repository-pattern-typescript
title: "Repository Pattern with TypeScript Generics"
description: "Implement a type-safe repository pattern in TypeScript that decouples data access logic from domain services using generics and interfaces."
metaDescription: "Repository pattern in TypeScript with generics. Decouple data access from domain logic with type-safe repositories, interfaces, and clean dependency injection."
difficulty: intermediate
topics:
  - design
  - databases
tags:
  - repository
  - typescript
  - architecture
  - design-pattern
relatedResources:
  - /patterns/repository-pattern
  - /patterns/active-record-pattern
  - /patterns/dependency-injection-pattern
  - /patterns/adapter-pattern-api
  - /recipes/database-indexing
  - /guides/database-design-guide
lastUpdated: "2026-08-19"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Repository pattern in TypeScript with generics. Decouple data access from domain logic with type-safe repositories, interfaces, and clean dependency injection."
  keywords:
    - repository pattern
    - typescript generics
    - data access layer
    - architecture pattern
    - clean architecture
---

## Overview

The [Repository Pattern](/patterns/repository-pattern/) mediates between the
domain and data mapping layers. It acts like an in-memory collection of domain
objects, abstracting persistence details so services stay focused on business
logic.

This version uses TypeScript generics so a single interface can describe
repositories for any entity and id type.

## When to Use

- You want to swap database technologies without changing business logic.
- Unit tests must run without a real database.
- Several services share similar query patterns.
- You need to keep persistence concerns out of services.

### When to avoid

- Simple CRUD applications where an ORM active-record style is enough.
- Prototypes that don’t need test doubles or storage swaps.

## Solution

### Repository interface

```typescript
interface Repository<T, ID> {
  findById(id: ID): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(entity: Omit<T, "id">): Promise<T>;
  update(id: ID, entity: Partial<T>): Promise<T | null>;
  delete(id: ID): Promise<boolean>;
}
```

### Mongoose implementation

```typescript
import { Model } from "mongoose";

class MongooseRepository<T extends { id: string }> implements Repository<T, string> {
  constructor(private model: Model<any>) {}

  async findById(id: string): Promise<T | null> {
    const doc = await this.model.findById(id).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async findAll(filter: Record<string, any> = {}): Promise<T[]> {
    const docs = await this.model.find(filter).lean();
    return docs.map((doc) => this.toEntity(doc));
  }

  async create(data: Omit<T, "id">): Promise<T> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject());
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const doc = await this.model.findByIdAndUpdate(id, data, { new: true }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id);
    return !!result;
  }

  private toEntity(doc: any): T {
    const { _id, __v, ...rest } = doc;
    return { id: _id.toString(), ...rest } as T;
  }
}
```

### In-memory implementation for tests

```typescript
class InMemoryRepository<T extends { id: string }> implements Repository<T, string> {
  private items: Map<string, T> = new Map();

  async findById(id: string): Promise<T | null> {
    return this.items.get(id) ?? null;
  }

  async findAll(filter?: Partial<T>): Promise<T[]> {
    const all = Array.from(this.items.values());
    if (!filter) return all;

    return all.filter((item) =>
      Object.entries(filter).every(([key, value]) => (item as any)[key] === value)
    );
  }

  async create(data: Omit<T, "id">): Promise<T> {
    const id = crypto.randomUUID();
    const item = { id, ...data } as T;
    this.items.set(id, item);
    return item;
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const existing = this.items.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...data, id } as T;
    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}
```

### Domain entity and service

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

class UserService {
  constructor(private userRepo: Repository<User, string>) {}

  async promoteToAdmin(userId: string): Promise<User | null> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error("User not found");
    return this.userRepo.update(userId, { role: "admin" });
  }
}
```

### Usage

```typescript
const userRepo = new MongooseRepository<User>(UserModel);
const userService = new UserService(userRepo);

// In tests
const testService = new UserService(new InMemoryRepository<User>());
```

## Explanation

The generic `Repository<T, ID>` interface defines the contract. Concrete
implementations handle persistence, while services depend only on the interface.

`MongooseRepository` maps database documents to domain entities. This keeps
Mongoose-specific details out of the service. `InMemoryRepository` lets you test
services without a database.

The `Repository<User, string>` parameter on `UserService` makes the dependency
explicit and swappable. See
[Dependency Injection](/patterns/dependency-injection-pattern/) for wiring
strategies.

## Variants

| Variant | Purpose |
| --- | --- |
| In-memory repository | Fast unit tests with Map-backed storage |
| Specification pattern | Compose reusable query objects |
| Unit of Work | Batch several operations in one transaction |
| Read/write split | Separate query and command repositories for CQRS |

## Best Practices

- Return domain entities, not database documents, from repository methods.
- Keep repositories focused on persistence; business rules belong in services.
- Inject the repository interface, not the concrete implementation.
- Add pagination for large `findAll` results.
- Use transactions for multi-step operations.
- Handle connection and constraint errors in the repository and translate them
  to domain exceptions.

## Common Mistakes

- Leaking ORM queries into service methods.
- Returning raw database documents instead of mapped entities.
- Putting transaction management inside the repository instead of the service.
- Creating repositories that are so generic they lose type safety.
- Not handling database errors or exposing driver-specific exceptions.
- Ignoring pagination for large result sets.
- Mixing business logic with data access logic.

## FAQ

### Is the repository pattern overkill for small projects?

For simple CRUD apps, active record is often enough. Use repositories when you
need testability, several data sources, or storage swaps. See
[Active Record Pattern](/patterns/active-record-pattern/) for the alternative.

### How does this compare to active record?

Active record mixes data access and domain logic. The repository pattern
separates them, making the domain layer independent from persistence.

### Should I use one repository per entity or per aggregate root?

Use one repository per aggregate root, not per entity. This follows Domain-Driven
Design and keeps consistency within the aggregate.

### How do I test repositories without a database?

Create an in-memory implementation of the repository interface and use it in
service tests. This avoids database setup and makes tests deterministic.

### How do I handle pagination?

Add `limit` and `offset` (or `page` and `size`) parameters to `findAll`, and
return a paginated result with metadata such as total count.

### Should repositories return DTOs or domain entities?

Return domain entities from repositories. DTOs are for API responses and should
be mapped from entities in the service or API layer.
