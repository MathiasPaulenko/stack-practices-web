---
contentType: recipes
slug: hexagonal-architecture
title: "Build Maintainable Applications with Hexagonal Architecture"
description: "How to structure applications using ports and adapters to isolate business logic from frameworks, databases, and external services for testability and flexibility."
metaDescription: "Learn hexagonal architecture for maintainable apps. Use ports and adapters to isolate business logic from frameworks, databases, and external services."
difficulty: intermediate
topics:
  - design
tags:
  - design
  - hexagonal-architecture
relatedResources:
  - /recipes/domain-driven-design
  - /recipes/microservices-patterns
  - /recipes/unit-testing-mocking
  - /recipes/api-contract-testing
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn hexagonal architecture for maintainable apps. Use ports and adapters to isolate business logic from frameworks, databases, and external services."
  keywords:
    - hexagonal architecture
    - ports and adapters
    - clean architecture
    - domain logic isolation
    - testable applications
---

## Overview

Traditional layered architecture organizes code into horizontal layers: controllers call services, services call repositories, repositories query databases. The problem is that dependencies flow downward, coupling business logic to frameworks and infrastructure. If you switch from PostgreSQL to MongoDB, the service layer changes. If you replace Express with Fastify, the controller layer changes. Business rules — the most valuable and stable code — are contaminated by volatile technical details.

Hexagonal architecture (also called ports and adapters) inverts this. The domain sits at the center, depending on nothing. It defines ports — interfaces describing what capabilities it needs (e.g., `UserRepository`, `PaymentGateway`). Adapters implement these ports for specific technologies (PostgreSQLUserRepository, StripePaymentGateway). The domain does not know whether it is talking to a database or an in-memory array. This makes the core trivially testable without databases, frameworks, or external services.

## When to use it

Use this recipe when:

- Business rules are complex and change less frequently than frameworks
- You need to test core logic without spinning up databases or HTTP servers
- Migrating between infrastructure technologies (ORMs, message brokers, cloud providers)
- Working with multiple client interfaces (REST API, CLI, message queue) that share the same core
- Building libraries or frameworks where the core must remain independent of consumers

## Solution

### Core Domain with Ports (TypeScript)

```typescript
// Domain — no external dependencies
interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

interface EmailService {
  send(user: User, subject: string, body: string): Promise<void>;
}

class User {
  constructor(
    public readonly id: string,
    public email: string,
    public name: string,
    public isVerified: boolean = false
  ) {}

  verify() {
    this.isVerified = true;
  }
}

class UserRegistrationService {
  constructor(
    private users: UserRepository,
    private email: EmailService
  ) {}

  async register(email: string, name: string): Promise<User> {
    const existing = await this.users.findById(email);
    if (existing) throw new Error("User already exists");

    const user = new User(crypto.randomUUID(), email, name);
    await this.users.save(user);
    await this.email.send(user, "Welcome", `Hello ${name}, welcome aboard!`);

    return user;
  }

  async verifyEmail(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new Error("User not found");

    user.verify();
    await this.users.save(user);
  }
}
```

### Adapters (Infrastructure)

```typescript
// PostgreSQL adapter
class PostgresUserRepository implements UserRepository {
  constructor(private db: Pool) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return new User(row.id, row.email, row.name, row.is_verified);
  }

  async save(user: User): Promise<void> {
    await this.db.query(
      `INSERT INTO users (id, email, name, is_verified)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET email = $2, name = $3, is_verified = $4`,
      [user.id, user.email, user.name, user.isVerified]
    );
  }
}

// In-memory adapter for testing
class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }
}

// SMTP email adapter
class SmtpEmailService implements EmailService {
  async send(user: User, subject: string, body: string): Promise<void> {
    // SMTP implementation
  }
}

// Mock email adapter for testing
class MockEmailService implements EmailService {
  sentEmails: Array<{ user: User; subject: string; body: string }> = [];

  async send(user: User, subject: string, body: string): Promise<void> {
    this.sentEmails.push({ user, subject, body });
  }
}
```

### Application Bootstrap

```typescript
// Composition root — the only place with framework dependencies
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const userRepository = new PostgresUserRepository(pool);
const emailService = new SmtpEmailService();

const registrationService = new UserRegistrationService(userRepository, emailService);

// Express route (adapter for HTTP)
app.post('/users', async (req, res) => {
  try {
    const user = await registrationService.register(req.body.email, req.body.name);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
```

## Explanation

- **Domain**: the center of the hexagon. Contains business entities, value objects, and domain services. It has zero dependencies on frameworks, databases, or external APIs. It only knows about ports — interfaces it needs to do its job.
- **Ports**: interfaces defined by the domain. `UserRepository` describes what persistence operations the domain needs. `EmailService` describes what notification capabilities it needs. The domain depends on abstractions, not implementations.
- **Adapters**: concrete implementations of ports. A PostgreSQL adapter implements `UserRepository` using SQL. An in-memory adapter implements the same interface using a Map. The domain does not distinguish between them. Adapters also adapt external concerns — HTTP controllers adapt incoming requests to domain method calls.
- **Dependency inversion**: the domain does not depend on PostgreSQL. PostgreSQL depends on the domain (via the `UserRepository` interface). This is the SOLID dependency inversion principle. The arrow of dependency points inward toward the domain.

## Variants

| Layer | Contents | Dependencies | Testability |
|-------|----------|--------------|-------------|
| Domain | Entities, value objects, domain services | None (only language) | Unit tests, no I/O |
| Application | Use cases, orchestration, ports | Domain | Unit tests with mocks |
| Adapters | Controllers, repositories, external clients | Domain + frameworks | Integration tests |
| Framework | HTTP server, database, message queue | Adapters | E2E tests |

## Best practices

- **Keep the domain pure**: no imports from `node_modules` in domain code. Only language primitives and standard library. If you see `import express` or `import typeorm` in the domain, the boundary is violated.
- **Use dependency injection**: pass adapters into domain services via constructors. Do not use service locators or global singletons. Constructor injection makes dependencies explicit and testable.
- **Write tests against in-memory adapters**: unit tests for domain logic should use in-memory repositories, not test databases. They run in milliseconds, require no setup, and prove that domain logic works independently of infrastructure.
- **One composition root**: the application bootstrap file (often `main.ts` or `index.js`) is the only place where adapters are instantiated and wired together. This is the only file that knows about PostgreSQL, Express, and SMTP. Everything else is technology-agnostic.
- **Do not leak framework types into the domain**: if your domain service accepts a `Request` object or returns a `Response`, it is coupled to HTTP. The domain should accept primitives and domain objects. Adapters extract data from HTTP requests and call domain methods.

## Common mistakes

- **Anemic domain model**: a domain with only getters and setters, where all logic lives in application services. This is just data transfer objects. Push behavior into entities — `order.submit()`, not `orderService.submit(order)`.
- **Leaking ORM entities into the domain**: using TypeORM or Prisma models directly as domain entities ties the domain to the database schema. Maintain separate domain entities and map between them in the repository adapter.
- **Over-engineering simple CRUD**: a todo list with create, read, update, delete does not need ports, adapters, and dependency inversion. Use hexagonal architecture when business complexity justifies the abstraction cost.
- **Circular dependencies**: the application layer orchestrates use cases by calling domain services and adapters. If the application layer imports an adapter, and the adapter imports the application layer, you have a circular dependency. Adapters must depend only on the domain.

## FAQ

**Q: Is hexagonal architecture the same as clean architecture?**
A: They share the same principle — protect the domain from frameworks. Clean architecture (Robert C. Martin) adds explicit layers: entities, use cases, interface adapters, frameworks. Hexagonal (Alistair Cockburn) uses the port/adapter metaphor. In practice, they produce similar structures.

**Q: How do I handle transactions across multiple ports?**
A: Transactions are an infrastructure concern. The application service calls a unit of work pattern or transaction manager adapter that coordinates commits across repositories. The domain does not know about transactions — it just calls `save()`.

**Q: Can I use hexagonal architecture with a serverless framework?**
A: Yes. The Lambda handler is an adapter. It deserializes the event, calls the domain service, and serializes the response. The domain remains pure and testable offline. Use dependency injection in the handler's initialization phase.

**Q: Do I need a separate adapter for every external service?**
A: Yes — each external dependency gets its own adapter implementing a domain-defined port. This isolates changes. If you switch from SendGrid to Mailgun, only the email adapter changes. The domain and application layers remain untouched.

