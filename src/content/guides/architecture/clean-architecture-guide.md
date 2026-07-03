---
contentType: guides
slug: clean-architecture-guide
title: "Clean Architecture — The Dependency Rule and Layered Boundaries"
description: "A practical guide to Uncle Bob's Clean Architecture: organize code into layers so that frameworks, UI, and databases are details, not dependencies."
metaDescription: "Learn Clean Architecture with the Dependency Rule, layered boundaries, and practical examples. Build maintainable, testable applications."
difficulty: advanced
topics:
  - architecture
  - design
tags:
  - clean-architecture
  - dependency-rule
  - layered-architecture
  - testability
  - solid-principles
  - domain-driven-design
  - guide
relatedResources:
  - /guides/hexagonal-architecture-guide
  - /guides/onion-architecture-guide
  - /guides/layered-architecture-guide
  - /guides/solid-principles-guide
  - /patterns/design/dependency-injection-pattern
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Learn Clean Architecture with the Dependency Rule, layered boundaries, and practical examples. Build maintainable, testable applications."
  keywords:
    - clean-architecture
    - dependency-rule
    - layered-architecture
    - testability
    - solid-principles
    - domain-driven-design
    - guide
---

## Overview

Clean Architecture, introduced by Robert C. Martin (Uncle Bob), is a software design philosophy that organizes code into concentric layers. The central rule — the Dependency Rule — states that source code dependencies can only point inward. Nothing in an inner layer can know anything about something in an outer layer. This makes frameworks, databases, and UI replaceable details rather than core dependencies.

## The Four Layers

```
┌──────────────────────────────────────┐
│         Frameworks & Drivers         │
│    (Web, UI, External APIs, DB)      │
├──────────────────────────────────────┤
│         Interface Adapters           │
│  (Controllers, Presenters, Gateways) │
├──────────────────────────────────────┤
│       Application Business Rules     │
│    (Use Cases, Application Services) │
├──────────────────────────────────────┤
│         Enterprise Business Rules    │
│    (Entities, Domain Logic)         │
└──────────────────────────────────────┘
```

### Entities (Innermost)

Enterprise-wide business rules. They are the most general and reusable layer. In many applications, entities are simple data structures with behavior.

```typescript
export class User {
  private constructor(
    private readonly id: UserId,
    private email: Email,
    private status: UserStatus
  ) {}

  static create(email: Email): User {
    return new User(UserId.generate(), email, UserStatus.PENDING);
  }

  activate(): void {
    this.status = UserStatus.ACTIVE;
  }

  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }
}
```

### Use Cases

Application-specific business rules. They orchestrate entities and define the operations the application supports.

```typescript
export class RegisterUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService
  ) {}

  async execute(command: RegisterUserCommand): Promise<Result<User>> {
    const existing = await this.userRepository.findByEmail(command.email);
    if (existing) {
      return Result.failure('Email already registered');
    }

    const user = User.create(Email.create(command.email));
    await this.userRepository.save(user);
    await this.emailService.sendWelcome(user.email);

    return Result.success(user);
  }
}
```

### Interface Adapters

Convert data from the format most convenient for use cases and entities, to the format most convenient for frameworks and drivers.

```typescript
@RestController()
export class UserController {
  constructor(private registerUser: RegisterUserUseCase) {}

  @Post('/users')
  async register(@Body() dto: RegisterUserDto): Promise<UserResponse> {
    const result = await this.registerUser.execute(dto.toCommand());
    return result.isSuccess()
      ? UserResponse.from(result.value)
      : UserResponse.error(result.error);
  }
}
```

### Frameworks & Drivers

The outermost layer — web frameworks, databases, UI, external devices. This layer contains minimal code and should be easy to swap.

## The Dependency Rule

> Source code dependencies must point only inward, toward higher-level policies.

This means:
- The web framework imports the controller, not the other way around
- The database imports the repository interface, not the other way around
- The UI imports the presenter, not the other way around

## Crossing Boundaries

At each layer boundary, data crosses as simple structures (DTOs) to prevent leaking implementation details:

```typescript
// Domain layer — knows nothing about HTTP
interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  save(user: User): Promise<void>;
}

// Infrastructure layer — implements the interface
class PostgresUserRepository implements UserRepository {
  constructor(private db: Knex) {}

  async findById(id: UserId): Promise<User | null> {
    const row = await this.db('users').where('id', id.value).first();
    return row ? this.toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    await this.db('users').insert(this.toRow(user));
  }
}
```

## Testing Strategy

| Layer | Test Approach | Speed |
|-------|---------------|-------|
| Entities | Pure unit tests | < 10ms |
| Use Cases | Unit tests with in-memory repositories | < 50ms |
| Adapters | Integration tests with real DB | < 500ms |
| E2E | Full stack tests | seconds |

## Common Mistakes

- **Framework lock-in** — importing Spring or Express inside use cases
- **Leaky abstractions** — passing HTTP request objects into the domain
- **Anemic models** — treating entities as data bags with no behavior
- **Over-abstraction** — adding interfaces for things that never change

## When to Use

- Medium to large applications with long lifespans
- Applications where the domain logic is more complex than data access
- Teams that value testability and independent deployability
- Projects where framework churn is likely

## When NOT to Use

- Simple CRUD with no business rules
- Scripts, prototypes, or MVPs where speed matters more than structure
- Teams without the discipline to maintain boundaries

## FAQ

**Is Clean Architecture the same as Hexagonal?**
They share the same goal (domain isolation) but use different metaphors. Hexagonal uses ports and adapters; Clean uses layers and the Dependency Rule. Both work well together.

**How do I handle transactions across use cases?**
Use a Unit of Work pattern at the adapter layer, or wrap use cases in a transaction decorator that lives in the application layer.

**Can I use ORMs in the entities layer?**
No. ORM annotations belong in the infrastructure layer. Keep entities pure.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.
