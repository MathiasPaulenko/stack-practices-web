---



contentType: recipes
slug: factory-pattern-recipe
title: "Create Objects Flexibly with the Factory Pattern"
description: "How to use factory methods, abstract factories, and dependency injection containers to decouple object creation from usage and improve testability."
metaDescription: "Learn factory pattern for flexible object creation. Use factory methods, abstract factories, and DI containers to decouple creation from usage and improve testability."
difficulty: beginner
topics:
  - design
tags:
  - design
  - factory-pattern
  - creational-patterns
  - design-patterns
  - patterns
relatedResources:
  - /recipes/hexagonal-architecture
  - /recipes/domain-driven-design
  - /recipes/unit-testing-mocking
  - /recipes/api-gateway
  - /recipes/adapter-pattern-recipe
  - /recipes/observer-pattern-recipe
  - /recipes/singleton-pattern-recipe
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn factory pattern for flexible object creation. Use factory methods, abstract factories, and DI containers to decouple creation from usage and improve testability."
  keywords:
    - factory pattern
    - factory method
    - abstract factory
    - object creation
    - dependency injection



---

## Overview

Creating objects directly with `new` is the simplest approach: `new DatabaseConnection("postgres://...")`. It is also the most rigid. The caller knows the exact class, the constructor signature, and the dependencies required. If the database driver changes, every call site must be updated. If the connection needs a connection pool instead of a direct connection, every `new` statement breaks. If you want to test the caller with a mock database, you cannot — the `new` keyword hardcodes the concrete class.

The factory pattern moves object creation into a dedicated method or class. The caller requests an object from the factory, not from a constructor. The factory decides which concrete class to instantiate, how to wire dependencies, and what default configurations to apply. The caller depends on an abstraction (interface or abstract class), not a concrete implementation. Here is how to factory methods, abstract factories, and practical examples in TypeScript, Java, and Python.

## When to use it

Use this recipe when:

- The exact class of object is determined at runtime based on configuration or input
- Object creation involves complex initialization logic (connection pools, caches, event listeners). See [Singleton Pattern](/recipes/singleton-pattern-recipe) for managing shared instances.
- Testing requires substituting real implementations with mocks or stubs. See [Input Validation](/recipes/api/input-validation) for boundary testing.
- Creating objects directly violates dependency inversion (high-level modules depend on low-level details). See [Hexagonal Architecture](/recipes/design/hexagonal-architecture) for dependency inversion.
- Building frameworks or libraries where users provide their own implementations

## Solution

### Factory Method (TypeScript)

```typescript
interface Notifier {
  send(message: string, recipient: string): Promise<void>;
}

class EmailNotifier implements Notifier {
  constructor(private smtpHost: string, private from: string) {}

  async send(message: string, recipient: string): Promise<void> {
    // SMTP implementation
    console.log(`Email to ${recipient}: ${message}`);
  }
}

class SmsNotifier implements Notifier {
  constructor(private twilioSid: string) {}

  async send(message: string, recipient: string): Promise<void> {
    // Twilio implementation
    console.log(`SMS to ${recipient}: ${message}`);
  }
}

abstract class NotificationFactory {
  abstract createNotifier(): Notifier;

  async notifyUser(message: string, recipient: string): Promise<void> {
    const notifier = this.createNotifier();
    await notifier.send(message, recipient);
  }
}

class EmailNotificationFactory extends NotificationFactory {
  createNotifier(): Notifier {
    return new EmailNotifier(process.env.SMTP_HOST!, 'noreply@example.com');
  }
}

class SmsNotificationFactory extends NotificationFactory {
  createNotifier(): Notifier {
    return new SmsNotifier(process.env.TWILIO_SID!);
  }
}

// Usage
const factory: NotificationFactory = process.env.NOTIFY_BY === 'sms'
  ? new SmsNotificationFactory()
  : new EmailNotificationFactory();

await factory.notifyUser('Your order has shipped!', 'user@example.com');
```

### Abstract Factory (Java)

```java
// Abstract product interfaces
interface Button {
    void render();
}

interface Checkbox {
    void check();
}

// Concrete products for Windows
class WindowsButton implements Button {
    public void render() { System.out.println("Rendering Windows button"); }
}

class WindowsCheckbox implements Checkbox {
    public void check() { System.out.println("Checking Windows checkbox"); }
}

// Concrete products for macOS
class MacButton implements Button {
    public void render() { System.out.println("Rendering Mac button"); }
}

class MacCheckbox implements Checkbox {
    public void check() { System.out.println("Checking Mac checkbox"); }
}

// Abstract factory
interface UIFactory {
    Button createButton();
    Checkbox createCheckbox();
}

// Concrete factories
class WindowsUIFactory implements UIFactory {
    public Button createButton() { return new WindowsButton(); }
    public Checkbox createCheckbox() { return new WindowsCheckbox(); }
}

class MacUIFactory implements UIFactory {
    public Button createButton() { return new MacButton(); }
    public Checkbox createCheckbox() { return new MacCheckbox(); }
}

// Application
class Application {
    private final Button button;
    private final Checkbox checkbox;

    Application(UIFactory factory) {
        this.button = factory.createButton();
        this.checkbox = factory.createCheckbox();
    }

    void renderUI() {
        button.render();
        checkbox.check();
    }
}

// Usage
UIFactory factory = System.getProperty("os.name").contains("Windows")
    ? new WindowsUIFactory()
    : new MacUIFactory();
new Application(factory).renderUI();
```

### Simple Factory (Python)

```python
from typing import Protocol

class PaymentProcessor(Protocol):
    def charge(self, amount: float, currency: str) -> dict:
        ...

class StripeProcessor:
    def __init__(self, api_key: str):
        self.api_key = api_key

    def charge(self, amount: float, currency: str) -> dict:
        return {"provider": "stripe", "status": "success", "amount": amount}

class PayPalProcessor:
    def __init__(self, client_id: str, secret: str):
        self.client_id = client_id
        self.secret = secret

    def charge(self, amount: float, currency: str) -> dict:
        return {"provider": "paypal", "status": "success", "amount": amount}

class PaymentProcessorFactory:
    def create(self, provider: str) -> PaymentProcessor:
        if provider == "stripe":
            return StripeProcessor(api_key="sk_test_xxx")
        elif provider == "paypal":
            return PayPalProcessor(client_id="xxx", secret="yyy")
        else:
            raise ValueError(f"Unknown provider: {provider}")

# Usage
factory = PaymentProcessorFactory()
processor = factory.create("stripe")
result = processor.charge(99.99, "USD")
```

## Explanation

- **Factory method**: a method in a class that subclasses override to instantiate objects. The base class defines the algorithm (`notifyUser`); the subclass decides which concrete notifier to create. The base class depends on the `Notifier` interface, not `EmailNotifier` or `SmsNotifier`.
- **Abstract factory**: a family of related factories. `WindowsUIFactory` creates a `WindowsButton` and `WindowsCheckbox` that share a visual theme. Switching themes means switching factories, not individual object instantiations. This ensures consistency across related products.
- **Simple factory**: a single function or class that creates objects based on a parameter. It is not a GoF pattern but is commonly used in practice. It centralizes creation logic but does not invert dependency as strongly as factory method or abstract factory.
- **Dependency injection**: at scale, factories themselves are created by a DI container (Spring, Angular, InversifyJS). You configure bindings (`Notifier` → `EmailNotifier`) in one place. The container resolves dependencies automatically. Factories become configuration, not application code.

## Variants

| Pattern | Level of abstraction | Best for | Complexity |
|---------|---------------------|----------|------------|
| Simple factory | Low | Single creator with runtime type | Low |
| Factory method | Medium | Template method with customizable creation | Medium |
| Abstract factory | High | Families of related objects | Medium-High |
| Builder | High | Complex objects with many optional parameters | Medium |
| DI container | Highest | Enterprise applications with deep dependency graphs | High |

## What Works

- **Return abstractions, not concretions**: a factory method should return `Notifier`, not `EmailNotifier`. This allows callers to treat all products uniformly and enables substitution. If the return type is concrete, the factory provides no decoupling.
- **Keep factories stateless**: a factory should not maintain application state. It creates and returns objects — nothing more. Stateful factories are hard to test and obscure object lifetimes. Pass configuration as parameters.
- **Use DI containers for complex graphs**: when a service requires a repository, which requires a connection pool, which requires a config loader, manual factory wiring becomes tedious. Use a DI container to declaratively bind interfaces to implementations and resolve transitive dependencies.
- **Do not overuse for trivial objects**: a factory for a `Date` object or a `Point` with two coordinates is over-engineering. Use `new` for simple value objects. Reserve factories for objects with dependencies, configuration, or runtime polymorphism.
- **Document factory contracts**: consumers of a factory need to know what the returned object does, not how it was created. Document the interface contract (methods, invariants, thread safety) rather than the factory implementation.

## Common mistakes

- **God factory**: a single factory that creates every object in the application. It grows to hundreds of lines and violates the single responsibility principle. Split factories by domain or layer — `NotificationFactory`, `PaymentFactory`, `RepositoryFactory`.
- **Factory that does business logic**: a factory should create objects, not validate business rules, trigger side effects, or orchestrate workflows. If your factory checks whether the user has permission before creating a notifier, that logic belongs in a service, not the factory.
- **Ignoring disposal lifecycle**: factories create objects but often do not manage their destruction. If the factory holds references to created objects, it becomes a memory leak. Use dependency scopes (singleton, request, transient) and ensure cleanup on shutdown.
- **Hardcoding configuration in factories**: `new DatabaseConnection("postgres://localhost")` embeds config in code. Inject configuration into the factory so the same factory code works in development, staging, and production without modification.

## FAQ

**Q: When should I use a factory vs a DI container?**
A: Use a factory for localized object creation within a module. Use a DI container for application-wide dependency graphs. Most modern frameworks combine both: the container uses factory providers to create objects.

**Q: Is the factory pattern still relevant with DI frameworks?**
A: Yes. DI frameworks use [factories](/recipes/factory-pattern-recipe) internally. You still write factory methods when object creation requires custom logic (e.g., choosing a database shard based on the user ID). DI handles the wiring; factories handle the creation decisions.

**Q: How do I test code that uses factories?**
A: Mock the factory itself. If `OrderService` depends on `PaymentProcessorFactory`, inject a mock factory that returns a stub processor. Alternatively, use DI to inject the processor directly, bypassing the factory in tests.

**Q: Can I combine factory with builder?**
A: Yes, and it is common. A factory decides which class to instantiate; a builder configures the instance after creation. `factory.create("email").withTimeout(30).withRetries(3)`.


### DI Container with Factory Providers (TypeScript)

```typescript
interface Container {
  bind<T>(token: string, factory: () => T): void;
  resolve<T>(token: string): T;
}

class SimpleContainer implements Container {
  private bindings: Map<string, () => unknown> = new Map();
  private instances: Map<string, unknown> = new Map();

  bind<T>(token: string, factory: () => T): void {
    this.bindings.set(token, factory);
  }

  resolve<T>(token: string): T {
    if (this.instances.has(token)) {
      return this.instances.get(token) as T;
    }
    const factory = this.bindings.get(token);
    if (!factory) throw new Error(`No binding for ${token}`);
    const instance = factory() as T;
    this.instances.set(token, instance);
    return instance;
  }
}

// Configuration
const container = new SimpleContainer();

container.bind('Logger', () => new ConsoleLogger());
container.bind('Database', () => new PostgresConnection(process.env.DATABASE_URL));
container.bind('UserRepository', () => {
  const db = container.resolve<PostgresConnection>('Database');
  const logger = container.resolve<ConsoleLogger>('Logger');
  return new UserRepository(db, logger);
});
container.bind('UserService', () => {
  const repo = container.resolve<UserRepository>('UserRepository');
  return new UserService(repo);
});

// Usage — resolve dependencies anywhere
const userService = container.resolve<UserService>('UserService');
await userService.createUser({ email: 'user@example.com', name: 'Alice' });
```

### Factory with Builder Pattern (TypeScript)

```typescript
class NotificationBuilder {
  private channel: 'email' | 'sms' | 'push' = 'email';
  private timeout: number = 30;
  private retries: number = 3;
  private priority: 'low' | 'normal' | 'high' = 'normal';

  withChannel(channel: 'email' | 'sms' | 'push'): this {
    this.channel = channel;
    return this;
  }

  withTimeout(seconds: number): this {
    this.timeout = seconds;
    return this;
  }

  withRetries(count: number): this {
    this.retries = count;
    return this;
  }

  withPriority(priority: 'low' | 'normal' | 'high'): this {
    this.priority = priority;
    return this;
  }

  build(): Notifier {
    const base = this.channel === 'email'
      ? new EmailNotifier(process.env.SMTP_HOST!, 'noreply@example.com')
      : this.channel === 'sms'
      ? new SmsNotifier(process.env.TWILIO_SID!)
      : new PushNotifier(process.env.FCM_KEY!);

    return new ResilientNotifier(base, this.timeout, this.retries, this.priority);
  }
}

// Usage — factory decides which class, builder configures it
const notifier = new NotificationBuilder()
  .withChannel('sms')
  .withTimeout(10)
  .withRetries(5)
  .withPriority('high')
  .build();

await notifier.send('Server down!', 'admin@example.com');
```

### Async Factory with Connection Pooling (Python)

```python
import asyncio
from typing import Optional

class DatabaseConnectionFactory:
    _pool: Optional[asyncpg.Pool] = None
    _lock = asyncio.Lock()

    @classmethod
    async def create(cls, config: dict) -> 'DatabaseConnection':
        if cls._pool is None:
            async with cls._lock:
                if cls._pool is None:
                    cls._pool = await asyncpg.create_pool(
                        dsn=config['url'],
                        min_size=config.get('min_pool', 5),
                        max_size=config.get('max_pool', 20),
                        command_timeout=config.get('timeout', 30),
                    )
        return DatabaseConnection(await cls._pool.acquire())

    @classmethod
    async def close(cls) -> None:
        if cls._pool:
            await cls._pool.close()
            cls._pool = None

class DatabaseConnection:
    def __init__(self, conn):
        self._conn = conn

    async def query(self, sql: str, *args) -> list:
        return await self._conn.fetch(sql, *args)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self._conn.close()

# Usage — async factory with connection pooling
async def main():
    config = {'url': 'postgresql://localhost/mydb', 'max_pool': 10}
    async with await DatabaseConnectionFactory.create(config) as db:
        users = await db.query('SELECT * FROM users WHERE active = $1', True)
    await DatabaseConnectionFactory.close()
```

## Additional Best Practices

1. **Use factory functions for simple cases.** Not every factory needs a class. A function is simpler and sufficient:

```typescript
function createNotifier(config: NotificationConfig): Notifier {
  switch (config.channel) {
    case 'email': return new EmailNotifier(config.smtpHost, config.from);
    case 'sms': return new SmsNotifier(config.twilioSid);
    case 'push': return new PushNotifier(config.fcmKey);
    default: throw new Error(`Unknown channel: ${config.channel}`);
  }
}
```

2. **Register factories by token.** Use string tokens or symbols for DI bindings to avoid importing concrete classes:

```typescript
const TOKENS = {
  Logger: Symbol('Logger'),
  Database: Symbol('Database'),
  UserRepository: Symbol('UserRepository'),
} as const;

container.bind(TOKENS.Logger, () => new ConsoleLogger());
container.bind(TOKENS.Database, () => new PostgresConnection(process.env.DATABASE_URL));

// Consumer resolves by token — no import of PostgresConnection
const db = container.resolve<DatabaseConnection>(TOKENS.Database);
```

3. **Use factory pools for expensive objects.** If object creation is costly (database connections, HTTP clients), pool them:

```typescript
class HttpClientPool {
  private pool: HttpClient[] = [];
  private inUse: Set<HttpClient> = new Set();

  acquire(): HttpClient {
    const available = this.pool.find(c => !this.inUse.has(c));
    if (available) {
      this.inUse.add(available);
      return available;
    }
    const client = new HttpClient({ timeout: 5000 });
    this.pool.push(client);
    this.inUse.add(client);
    return client;
  }

  release(client: HttpClient): void {
    this.inUse.delete(client);
  }
}
```

## Additional Common Mistakes

1. **Factory returning the wrong interface.** If the factory returns a concrete class, callers are coupled to it:

```typescript
// Bad: returns concrete class
class UserRepoFactory {
  create(): PostgresUserRepository {
    return new PostgresUserRepository(db);
  }
}

// Good: returns interface
class UserRepoFactory {
  create(): UserRepository {
    return new PostgresUserRepository(db);
  }
}
```

2. **Singleton factory holding mutable state.** A factory that caches instances and also stores per-request data is a race condition waiting to happen:

```typescript
// Bad: mutable state in factory
class OrderFactory {
  private currentOrder: Order | null = null;

  create(orderId: string): Order {
    this.currentOrder = new Order(orderId); // shared across requests!
    return this.currentOrder;
  }
}

// Good: no shared mutable state
class OrderFactory {
  create(orderId: string): Order {
    return new Order(orderId);
  }
}
```

3. **Not disposing factory-created resources.** If the factory creates objects that hold resources (connections, file handles), the caller must dispose them:

```typescript
class ConnectionFactory {
  create(): DatabaseConnection {
    return new DatabaseConnection(process.env.DATABASE_URL);
  }
}

// Caller must close
const conn = factory.create();
try {
  await conn.query('SELECT 1');
} finally {
  await conn.close();
}
```

## Additional FAQ

### How do I handle circular dependencies with factories?

Use lazy initialization or property injection instead of constructor injection. Resolve one dependency after construction:

```typescript
class OrderService {
  private _paymentService?: PaymentService;

  constructor(private container: Container) {}

  get paymentService(): PaymentService {
    if (!this._paymentService) {
      this._paymentService = this.container.resolve<PaymentService>('PaymentService');
    }
    return this._paymentService;
  }
}
```

### Is this solution production-ready?

Yes. The factory method, abstract factory, and DI container patterns are all production-proven. The DI container example mirrors InversifyJS and tsyringe patterns. The async factory with connection pooling is standard in Python async applications using asyncpg or aiomysql. The factory + builder combination is common in notification and messaging systems.

### What are the performance characteristics?

Factory method calls add one function call of overhead — negligible. DI container resolution is O(1) for cached singletons, O(n) for transitive dependencies on first resolution. The async factory with connection pooling amortizes connection cost across requests. Pool acquire/release is O(n) for small pools (typically 5-20 connections). For high-throughput systems, pre-warm the pool at startup.

### How do I debug issues with this approach?

Log every factory creation with the token and resolved type. For DI containers, log the dependency graph on startup to detect circular dependencies. For async factories, log pool stats (active, idle, waiting) on an interval. Use the container's `resolve` method in a REPL to inspect what bindings are configured.
