---
contentType: patterns
slug: dependency-injection-typescript
title: "Dependency Injection Container in TypeScript"
description: "Build a lightweight DI container that resolves class dependencies automatically, enabling testable, loosely-coupled applications without frameworks like Angular or InversifyJS"
metaDescription: "Build a lightweight DI container in TypeScript. Resolve class dependencies automatically for testable, loosely-coupled applications without heavy frameworks."
difficulty: intermediate
topics:
  - design
tags:
  - dependency-injection
  - typescript
  - design-pattern
  - testing
  - design-patterns
relatedResources:
  - /patterns/design/singleton-pattern
  - /patterns/design/factory-pattern
  - /recipes/testing/unit-testing-mocking
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build a lightweight DI container in TypeScript. Resolve class dependencies automatically for testable, loosely-coupled applications without heavy frameworks."
  keywords:
    - dependency injection
    - di container
    - typescript
    - inversion of control
    - testable code
---

# Dependency Injection Container in TypeScript

Implement a lightweight [dependency injection](/patterns/design/dependency-injection-pattern) container in TypeScript that resolves class dependencies automatically through decorators or constructor metadata. This pattern decouples object creation from business logic, making code testable, modular, and easier to refactor without heavy frameworks.

## When to Use This

- Classes have deep dependency chains that make manual construction tedious
- You need to swap implementations for testing (mocks, stubs)
- Application lifecycle management requires singletons, scoped instances, and disposal

## Problem

A service depends on a repository, which depends on a database connection, which depends on a config loader. See [Dependency Injection Pattern](/patterns/design/dependency-injection-pattern) for language-agnostic examples. Creating objects manually creates brittle, hard-to-test code.

## Solution

### 1. Container with Token Registration

```typescript
// di/Container.ts
type Constructor<T> = new (...args: unknown[]) => T;

class Container {
  private registry = new Map<symbol, { impl: Constructor<unknown>; singleton?: unknown }>();

  register<T>(token: symbol, impl: Constructor<T>): this {
    this.registry.set(token, { impl });
    return this;
  }

  resolve<T>(token: symbol): T {
    const entry = this.registry.get(token);
    if (!entry) throw new Error(`No registration for token: ${token.toString()}`);

    // Return cached singleton if available
    if (entry.singleton) return entry.singleton as T;

    // Resolve dependencies recursively
    const params = Reflect.getMetadata('design:paramtypes', entry.impl) || [];
    const deps = params.map((param: symbol) => this.resolve(param));

    const instance = new (entry.impl as Constructor<T>)(...deps);
    entry.singleton = instance;
    return instance;
  }
}
```

### 2. Injectable Decorator with Metadata

```typescript
// di/Injectable.ts
import 'reflect-metadata';

const INJECTABLE_KEY = Symbol('injectable');

function Injectable<T extends Constructor<unknown>>(target: T): T {
  Reflect.defineMetadata(INJECTABLE_KEY, true, target);
  return target;
}

function Inject(token: symbol) {
  return function (target: unknown, _propertyKey: string | symbol, parameterIndex: number) {
    const existing = Reflect.getMetadata('design:paramtypes', target) || [];
    existing[parameterIndex] = token;
    Reflect.defineMetadata('design:paramtypes', existing, target);
  };
}
```

### 3. Service Definitions

```typescript
// services/Database.ts
const DB_TOKEN = Symbol('Database');

@Injectable
class Database {
  private connection: unknown;

  connect(): void {
    this.connection = { status: 'connected' };
  }

  query(sql: string): unknown[] {
    return [{ id: 1, name: 'Alice' }];
  }
}

// services/UserRepository.ts
const REPO_TOKEN = Symbol('UserRepository');

@Injectable
class UserRepository {
  constructor(@Inject(DB_TOKEN) private db: Database) {}

  findAll(): unknown[] {
    return this.db.query('SELECT * FROM users');
  }
}

// services/UserService.ts
const SERVICE_TOKEN = Symbol('UserService');

@Injectable
class UserService {
  constructor(@Inject(REPO_TOKEN) private repo: UserRepository) {}

  getUsers(): unknown[] {
    return this.repo.findAll();
  }
}
```

### 4. Bootstrap Application

```typescript
// main.ts
const container = new Container();

container.register(DB_TOKEN, Database);
container.register(REPO_TOKEN, UserRepository);
container.register(SERVICE_TOKEN, UserService);

const userService = container.resolve<UserService>(SERVICE_TOKEN);
console.log(userService.getUsers());
```

## How It Works

- **Container** stores registrations mapping tokens to implementations
- **Reflect Metadata** captures constructor parameter types at compile time
- **@Injectable** marks classes that the container can instantiate
- **@Inject** overrides parameter tokens for interfaces or abstract classes
- **resolve** creates instances recursively, caching singletons

## Variation: Scoped Lifetime

```typescript
// di/ScopedContainer.ts
class ScopedContainer {
  private parent: Container;
  private scoped = new Map<symbol, unknown>();

  resolve<T>(token: symbol): T {
    if (this.scoped.has(token)) return this.scoped.get(token) as T;

    const instance = this.parent.resolve<T>(token);
    this.scoped.set(token, instance);
    return instance;
  }
}
```

## Production Considerations

- Use `tsyringe` or `inversify` for production instead of a custom container
- Enable `emitDecoratorMetadata` in `tsconfig.json` for Reflect metadata
- Dispose scoped instances properly to prevent memory leaks in long-lived apps

## Common Mistakes

- Circular dependencies that cause infinite recursion during resolution
- Forgetting to call `connect()` or initialization methods after resolution
- Registering concrete classes when interfaces or abstractions are needed

## FAQ

**Q: How is this different from the Service Locator?**
A: Service Locator asks a global registry for dependencies. DI injects dependencies through constructors, making them explicit and testable. See [Dependency Injection Pattern](/patterns/design/dependency-injection-pattern) for broader coverage.

**Q: Can I use this without decorators?**
A: Yes. Use a factory function or manual registration with explicit dependency arrays: `container.register(UserService, { deps: [UserRepository] })`.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.


## Advanced Topics

### Scenario: DI Container for Microservice

```typescript
// Minimal DI container in TypeScript
type Constructor<T = unknown> = new (...args: unknown[]) => T;

class DIContainer {
  private services = new Map<string, { factory: () => unknown; singleton: boolean; instance?: unknown }>();

  registerTransient<T>(token: string, factory: () => T): void {
    this.services.set(token, { factory, singleton: false });
  }

  registerSingleton<T>(token: string, factory: () => T): void {
    this.services.set(token, { factory, singleton: true });
  }

  resolve<T>(token: string): T {
    const service = this.services.get(token);
    if (!service) throw new Error(`Service not found: ${token}`);
    if (service.singleton) {
      if (!service.instance) {
        service.instance = service.factory();
      }
      return service.instance as T;
    }
    return service.factory() as T;
  }
}

// Usage: register services
const container = new DIContainer();

// Singleton: one instance for the entire app
container.registerSingleton("Database", () => new PostgreSQLConnection({
  host: "localhost", port: 5432, max: 20
}));

// Singleton: shared logger
container.registerSingleton("Logger", () => new WinstonLogger({
  level: "info", format: "json"
}));

// Transient: new instance each time
container.registerTransient("UserRepository", () => {
  const db = container.resolve<DatabaseConnection>("Database");
  const logger = container.resolve<Logger>("Logger");
  return new UserRepository(db, logger);
});

// Transient: new instance per request
container.registerTransient("UserService", () => {
  const repo = container.resolve<UserRepository>("UserRepository");
  return new UserService(repo);
});

// Resolve in handler
app.get("/api/users/:id", (req, res) => {
  const userService = container.resolve<UserService>("UserService");
  const user = await userService.findById(req.params.id);
  res.json(user);
});

// DI types
  | Type | Description | Example |
  |------|-------------|---------|
  | Constructor | Deps in constructor | constructor(db: DB) |
  | Setter | Deps via setter | service.setDB(db) |
  | Interface | Deps via interface | @Injectable() |
  | Property | Deps in properties | @Inject() |
```

Lessons:
  - DI decouples dependency creation from usage
  - Singleton for shared resources (DB, logger, cache)
  - Transient for per-request objects (repos, services)
  - Constructor injection is safest (mandatory deps)
  - In tests, register mocks in the container
  - Frameworks: tsyringe, InversifyJS, NestJS DI
```

### How do I test with DI?

In tests, create a separate container and register mocks. Use registerSingleton to replace DB with a mock, Logger with a spy. Resolve the service under test: its dependencies will be the mocks. This enables unit testing without touching real DB. For integration tests, use the real container with Testcontainers for DB.
