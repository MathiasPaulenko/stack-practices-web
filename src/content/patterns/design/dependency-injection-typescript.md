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
