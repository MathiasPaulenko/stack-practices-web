---
contentType: patterns
slug: repository-pattern-typescript
title: "Repository Pattern with TypeScript Generics"
description: "Implement a type-safe repository pattern in TypeScript that decouples data access logic from domain services using generics and interfaces"
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
  - /patterns/design/adapter-pattern-api
  - /recipes/database-indexing
  - /guides/database-design-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Repository pattern in TypeScript with generics. Decouple data access from domain logic with type-safe repositories, interfaces, and clean dependency injection."
  keywords:
    - repository pattern
    - typescript generics
    - data access layer
    - architecture pattern
    - clean architecture
---

# Repository Pattern with TypeScript Generics

The Repository pattern mediates between the domain and data mapping layers. It acts like an in-memory collection of domain objects, abstracting away persistence details so your services remain focused on business logic.

## When to Use This

- You want to swap database technologies without touching business logic
- Unit tests must run without a real database
- Multiple domain services share similar query patterns

## Problem

Direct database queries scattered across services make testing impossible, migrations risky, and query optimization a hunt across the codebase.

## Solution

```typescript
// repositories/Repository.ts
interface Repository<T, ID> {
  findById(id: ID): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: ID, entity: Partial<T>): Promise<T | null>;
  delete(id: ID): Promise<boolean>;
}

// repositories/MongooseRepository.ts
import { Model, Types } from 'mongoose';

class MongooseRepository<T extends { id: string }> implements Repository<T, string> {
  constructor(private model: Model<any>) {}

  async findById(id: string): Promise<T | null> {
    const doc = await this.model.findById(id).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async findAll(filter: Record<string, any> = {}): Promise<T[]> {
    const docs = await this.model.find(filter).lean();
    return docs.map(this.toEntity);
  }

  async create(data: Omit<T, 'id'>): Promise<T> {
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

// domain/User.ts
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

// services/UserService.ts
class UserService {
  constructor(private userRepo: Repository<User, string>) {}

  async promoteToAdmin(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error('User not found');
    return this.userRepo.update(userId, { role: 'admin' });
  }
}
```

## Usage

```typescript
const userRepo = new MongooseRepository<User>(UserModel);
const userService = new UserService(userRepo);
```

## Variations

- **In-Memory Repository**: For unit testing with a Map-backed implementation
- **Specification Pattern**: Compose query filters as reusable specification objects
- **Unit of Work**: Batch multiple repository operations into a single transaction

## Best Practices

- Return domain entities, not database documents, from repository methods
- Keep repositories focused on persistence; business rules belong in services
- Inject the repository interface, not the concrete implementation

## Common Mistakes

- Leaking ORM queries into service methods
- Returning raw database documents instead of mapped entities
- Putting transaction management inside the repository instead of the service layer

## FAQ

**Q: Is Repository pattern overkill for small projects?**
A: For simple CRUD apps, active record is fine. Use repositories when you need testability, multiple data sources, or complex query logic.

**Q: How does this compare to the Active Record pattern?**
A: Active Record mixes data access and domain logic. Repository separates them, making the domain layer independent from persistence.
