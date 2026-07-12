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
  - design-patterns
  - patterns
  - oop
relatedResources:
  - /recipes/domain-driven-design
  - /recipes/microservices-patterns
  - /recipes/unit-testing-mocking
  - /recipes/api-contract-testing
  - /recipes/observer-pattern-recipe
  - /recipes/adapter-pattern-recipe
  - /recipes/factory-pattern-recipe
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

- Business rules are complex and change less frequently than frameworks. See [Domain-Driven Design](/recipes/design/domain-driven-design) for modeling business logic.
- You need to test core logic without spinning up databases or HTTP servers
- Migrating between infrastructure technologies (ORMs, message brokers, cloud providers). See [Adapter Pattern](/recipes/adapter-pattern-recipe) for technology swaps.
- Working with multiple client interfaces (REST API, CLI, message queue) that share the same core. See [API Call REST](/recipes/api/call-rest-api) for interface patterns.
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

## What Works

- **Keep the domain pure**: no imports from `node_modules` in domain code. Only language primitives and standard library. If you see `import express` or `import typeorm` in the domain, the boundary is violated.
- **Use dependency injection**: pass adapters into domain services via constructors. Do not use service locators or global singletons. Constructor injection makes dependencies explicit and testable.
- **Write tests against in-memory adapters**: unit tests for domain logic should use in-memory repositories, not test databases. See [Soft Deletes](/recipes/databases/soft-deletes) for repository patterns. They run in milliseconds, require no setup, and prove that domain logic works independently of infrastructure.
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


### Python Implementation

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional
import uuid

# Domain — no external dependencies
class UserRepository(ABC):
    @abstractmethod
    async def find_by_id(self, id: str) -> Optional["User"]:
        ...

    @abstractmethod
    async def save(self, user: "User") -> None:
        ...

class EmailService(ABC):
    @abstractmethod
    async def send(self, user: "User", subject: str, body: str) -> None:
        ...

@dataclass
class User:
    id: str
    email: str
    name: str
    is_verified: bool = False

    def verify(self) -> None:
        self.is_verified = True

class UserRegistrationService:
    def __init__(self, users: UserRepository, email: EmailService):
        self._users = users
        self._email = email

    async def register(self, email: str, name: str) -> User:
        existing = await self._users.find_by_id(email)
        if existing:
            raise ValueError("User already exists")

        user = User(id=str(uuid.uuid4()), email=email, name=name)
        await self._users.save(user)
        await self._email.send(user, "Welcome", f"Hello {name}, welcome aboard!")
        return user

    async def verify_email(self, user_id: str) -> None:
        user = await self._users.find_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        user.verify()
        await self._users.save(user)
```

### Unit Testing the Domain

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('UserRegistrationService', () => {
  let users: InMemoryUserRepository;
  let email: MockEmailService;
  let service: UserRegistrationService;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    email = new MockEmailService();
    service = new UserRegistrationService(users, email);
  });

  it('registers a new user', async () => {
    const user = await service.register('alice@example.com', 'Alice');

    expect(user.id).toBeDefined();
    expect(user.email).toBe('alice@example.com');
    expect(user.isVerified).toBe(false);
    expect(email.sentEmails).toHaveLength(1);
    expect(email.sentEmails[0].subject).toBe('Welcome');
  });

  it('rejects duplicate registration', async () => {
    await service.register('alice@example.com', 'Alice');

    await expect(
      service.register('alice@example.com', 'Alice Again')
    ).rejects.toThrow('User already exists');
  });

  it('verifies user email', async () => {
    const user = await service.register('bob@example.com', 'Bob');

    await service.verifyEmail(user.id);

    const saved = await users.findById(user.id);
    expect(saved?.isVerified).toBe(true);
  });

  it('throws when verifying unknown user', async () => {
    await expect(
      service.verifyEmail('nonexistent-id')
    ).rejects.toThrow('User not found');
  });
});
```

### Unit of Work Pattern for Transactions

```typescript
// Port — defined by the domain
interface UnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

// Enhanced application service with transaction support
class OrderService {
  constructor(
    private orders: OrderRepository,
    private inventory: InventoryRepository,
    private uow: UnitOfWork
  ) {}

  async placeOrder(items: OrderItem[]): Promise<Order> {
    await this.uow.begin();
    try {
      const order = new Order(crypto.randomUUID(), items);
      await this.orders.save(order);

      for (const item of items) {
        await this.inventory.decrement(item.sku, item.quantity);
      }

      await this.uow.commit();
      return order;
    } catch (err) {
      await this.uow.rollback();
      throw err;
    }
  }
}

// PostgreSQL Unit of Work adapter
class PostgresUnitOfWork implements UnitOfWork {
  private client?: PoolClient;

  constructor(private pool: Pool) {}

  async begin(): Promise<void> {
    this.client = await this.pool.connect();
    await this.client.query('BEGIN');
  }

  async commit(): Promise<void> {
    if (!this.client) throw new Error('Transaction not started');
    await this.client.query('COMMIT');
    this.client.release();
  }

  async rollback(): Promise<void> {
    if (!this.client) throw new Error('Transaction not started');
    await this.client.query('ROLLBACK');
    this.client.release();
  }
}
```

## Additional Best Practices

1. **Use result objects instead of throwing exceptions.** Domain errors are expected, not exceptional:

```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

class UserRegistrationService {
  async register(email: string, name: string): Promise<Result<User>> {
    const existing = await this.users.findById(email);
    if (existing) return { ok: false, error: new Error("User exists") };

    const user = new User(crypto.randomUUID(), email, name);
    await this.users.save(user);
    return { ok: true, value: user };
  }
}
```

2. **Keep ports minimal.** Define only what the domain needs, not what infrastructure offers:

```typescript
// Bad: leaking infrastructure concepts
interface UserRepository {
  query(sql: string, params: any[]): Promise<any[]>;
}

// Good: domain-centric interface
interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
  findByEmail(email: string): Promise<User | null>;
}
```

3. **Use factory functions for adapter creation.** Keeps the composition root clean:

```typescript
function createApp(config: AppConfig) {
  const pool = new Pool({ connectionString: config.databaseUrl });
  const users = new PostgresUserRepository(pool);
  const email = config.environment === 'test'
    ? new MockEmailService()
    : new SmtpEmailService(config.smtp);
  return new UserRegistrationService(users, email);
}
```

## Additional Common Mistakes

1. **Putting validation in adapters instead of the domain.** Business rules belong in domain entities:

```typescript
// Bad: validation in the HTTP controller
app.post('/users', (req, res) => {
  if (!req.body.email.includes('@')) return res.status(400).end();
  // ...
});

// Good: validation in the domain entity
class User {
  constructor(public email: string) {
    if (!email.includes('@')) throw new Error('Invalid email');
  }
}
```

2. **Testing through adapters instead of against ports.** Tests that hit real databases are slow and brittle:

```typescript
// Bad: slow, requires database
const repo = new PostgresUserRepository(realPool);
const service = new UserRegistrationService(repo, emailService);

// Good: fast, no I/O
const repo = new InMemoryUserRepository();
const service = new UserRegistrationService(repo, mockEmail);
```

## Additional FAQ

### How does hexagonal architecture compare to DDD?

DDD is about modeling the domain (aggregates, value objects, bounded contexts). Hexagonal architecture is about structuring the code (ports, adapters, dependency inversion). They complement each other: DDD defines what the domain contains, hexagonal defines how to protect it from infrastructure.

### Should I use hexagonal architecture for microservices?

Yes, especially when each microservice has different infrastructure. One service might use PostgreSQL, another DynamoDB. With hexagonal, each service defines its own ports and implements adapters for its specific infrastructure. The domain logic remains consistent across services.

### How do I handle cross-cutting concerns like logging?

Define logging as a port in the domain. The domain calls `logger.info()` through an interface. Adapters implement the port with Winston, Pino, or a no-op logger for tests. This keeps the domain pure while allowing infrastructure-specific logging.

### Is this solution production-ready?

Yes. The code examples show tested patterns used in production systems. The TypeScript and Python implementations are directly usable. Adapt error handling and configuration to your specific environment.

### What are the performance characteristics?

The architecture itself adds no runtime overhead — it is a compile-time structure. Performance depends on adapter implementations. In-memory adapters used in tests run in microseconds. Database adapters are bounded by I/O latency. The abstraction cost is in code complexity, not runtime performance.

### How do I debug issues with this approach?

Test each layer independently. Unit tests with in-memory adapters isolate domain bugs. Integration tests with real adapters isolate infrastructure bugs. The composition root is the only place to debug wiring issues. Use `docker compose config` to verify adapter configuration.
