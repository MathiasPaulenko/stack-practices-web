---

contentType: recipes
slug: dependency-injection
title: "Dependency Injection"
description: "Implement dependency injection to write testable, decoupled code across languages and frameworks."
metaDescription: "Dependency injection patterns in TypeScript, Python, Java, and C#. Write testable, decoupled, maintainable code with DI containers and manual injection."
difficulty: intermediate
topics:
  - architecture
tags:
  - dependency-injection
  - architecture
  - typescript
  - java
  - python
relatedResources:
  - /patterns/mvc-pattern
  - /patterns/repository-pattern
  - /patterns/dependency-injection-pattern
  - /docs/adr-template
  - /docs/database-schema-documentation-template
  - /patterns/multi-tenant-data-isolation-pattern
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Dependency injection patterns in TypeScript, Python, Java, and C#. Write testable, decoupled, maintainable code with DI containers and manual injection."
  keywords:
    - dependency-injection
    - architecture
    - typescript
    - java
    - python

---
## Overview

Dependency Injection (DI) is a design pattern where objects receive their dependencies from external sources rather than creating them internally. It decouples components, makes code testable without mocks, and enables flexible composition of services.

## When to Use

Use this resource when:
- Writing unit tests that require substituting real services with test doubles
- Building modular applications where components should not know about concrete implementations
- Managing complex object graphs with transitive dependencies
- Implementing plugin architectures or [strategy patterns](/patterns/design/strategy-pattern)

## Solution

### Constructor Injection (TypeScript)

```typescript
interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

class UserService {
  constructor(
    private emailService: EmailService,
    private userRepository: UserRepository
  ) {}

  async register(email: string, password: string) {
    const user = await this.userRepository.create({ email, password });
    await this.emailService.send(email, 'Welcome', 'Thanks for signing up!');
    return user;
  }
}

// Production wiring
const userService = new UserService(
  new SendGridEmailService(),
  new PostgresUserRepository()
);

// Test wiring
const userServiceTest = new UserService(
  new FakeEmailService(),
  new InMemoryUserRepository()
);
```

### Property Injection (Python)

```python
from typing import Protocol

class Logger(Protocol):
    def log(self, message: str) -> None: ...

class ConsoleLogger:
    def log(self, message: str) -> None:
        print(f"[LOG] {message}")

class OrderProcessor:
    logger: Logger = ConsoleLogger()  # Default

    def process(self, order: dict) -> None:
        self.logger.log(f"Processing order {order['id']}")
        # ...
```

### DI Container (Java with Spring)

```java
@Service
public class PaymentService {
    private final PaymentGateway gateway;
    private final FraudChecker fraudChecker;

    public PaymentService(PaymentGateway gateway, FraudChecker fraudChecker) {
        this.gateway = gateway;
        this.fraudChecker = fraudChecker;
    }
}

@Configuration
public class AppConfig {
    @Bean
    public PaymentGateway paymentGateway() {
        return new StripeGateway();
    }
}
```

## Explanation

DI inverts control: instead of components finding or creating their dependencies, the container or caller provides them. This enables:

1. **Testability**: Swap real services for fakes or stubs without modifying code
2. **Flexibility**: Change implementations without touching consumers
3. **Lifecycle management**: Containers can manage singletons, scoped instances, and disposal
4. **AOP support**: Decorators and interceptors can be injected transparently

## Variants

| Approach | Use Case | Trade-off |
|----------|----------|-----------|
| Constructor | Mandatory dependencies | Most explicit; best for testing |
| Property/Setter | Optional dependencies | Can create partially initialized objects |
| Method | Per-call dependencies | Verbose; used for strategy injection |
| Service Locator | Legacy code | Hides dependencies; harder to test |

## What Works

- **Prefer constructor injection**: Makes dependencies explicit and immutable
- **Avoid service locators**: They hide dependencies and make testing harder
- **Use interfaces/protocols**: Depend on abstractions, not concrete types. See [Factory Pattern](/patterns/design/factory-pattern) for object creation abstractions.
- **Keep composition roots shallow**: Wire dependencies at the application entry point
- **Avoid primitive obsession**: Wrap config values in value objects (e.g., ApiKey, Timeout)

## Common Mistakes

1. **Constructor explosion**: More than 5 parameters signals a missing abstraction
2. **Leaking container**: Passing the DI container into services defeats the purpose
3. **Tight coupling to framework**: Use standard annotations (@Inject) when possible
4. **Ignoring lifecycle**: Scoped services resolved as singletons cause memory leaks
5. **Circular dependencies**: Refactor into events or a [mediator](/patterns/design/mediator-pattern) if A depends on B and B on A

## Frequently Asked Questions

**Q: Is DI only for object-oriented languages?**
A: No. Functional languages achieve similar decoupling via higher-order functions and partial application.

**Q: When should I use a DI container vs. manual wiring?**
A: Manual wiring for simple apps (<50 services). Containers for complex graphs, lifecycle management, or AOP.

**Q: Does DI hurt performance?**
A: Negligible overhead at runtime. Resolve dependencies at startup (composition root), not per-request.

### Lightweight DI Container (TypeScript)

```typescript
type Factory<T> = () => T;

class DIContainer {
  private factories: Map<string, Factory<any>> = new Map();
  private singletons: Map<string, any> = new Map();
  private scoped: Map<string, any> = new Map();

  registerTransient<T>(key: string, factory: Factory<T>): void {
    this.factories.set(key, factory);
  }

  registerSingleton<T>(key: string, factory: Factory<T>): void {
    this.factories.set(key, () => {
      if (!this.singletons.has(key)) {
        this.singletons.set(key, factory());
      }
      return this.singletons.get(key);
    });
  }

  registerScoped<T>(key: string, factory: Factory<T>): void {
    this.factories.set(key, () => {
      if (!this.scoped.has(key)) {
        this.scoped.set(key, factory());
      }
      return this.scoped.get(key);
    });
  }

  resolve<T>(key: string): T {
    const factory = this.factories.get(key);
    if (!factory) {
      throw new Error(`No service registered for key: ${key}`);
    }
    return factory();
  }

  beginScope(): void {
    this.scoped.clear();
  }

  endScope(): void {
    this.scoped.clear();
  }
}

// Registration at composition root
const container = new DIContainer();

container.registerSingleton('db', () => new PostgresPool({ connectionString: process.env.DB_URL }));
container.registerSingleton('emailService', () => new SendGridEmailService(process.env.SENDGRID_KEY));
container.registerScoped('userRepository', () => new PostgresUserRepository(container.resolve('db')));
container.registerScoped('userService', () =>
  new UserService(container.resolve('emailService'), container.resolve('userRepository'))
);

// Per-request usage
container.beginScope();
const userService = container.resolve<UserService>('userService');
await userService.register('user@example.com', 'password');
container.endScope();
```

### Scoped Lifecycle with Context Managers (Python)

```python
from contextlib import contextmanager
from typing import TypeVar, Callable, Dict

T = TypeVar('T')

class DIContainer:
    def __init__(self):
        self._factories: Dict[str, Callable] = {}
        self._singletons: Dict[str, object] = {}
        self._scoped: Dict[str, object] = {}

    def register_singleton(self, key: str, factory: Callable[[], T]) -> None:
        self._factories[key] = lambda: self._singletons.setdefault(key, factory())

    def register_scoped(self, key: str, factory: Callable[[], T]) -> None:
        self._factories[key] = lambda: self._scoped.setdefault(key, factory())

    def register_transient(self, key: str, factory: Callable[[], T]) -> None:
        self._factories[key] = factory

    def resolve(self, key: str) -> T:
        if key not in self._factories:
            raise KeyError(f'No service registered for: {key}')
        return self._factories[key]()

    @contextmanager
    def scope(self):
        """Context manager for scoped lifetime."""
        self._scoped.clear()
        try:
            yield self
        finally:
            self._scoped.clear()

# Usage — scoped per request
container = DIContainer()
container.register_singleton('db', lambda: create_engine('postgresql://localhost/app'))
container.register_scoped('session', lambda: Session(container.resolve('db')))
container.register_transient('user_service', lambda: UserService(container.resolve('session')))

with container.scope() as scoped:
    service = scoped.resolve('user_service')
    service.register('user@example.com', 'password')
```

### DI Testing Patterns (TypeScript)

```typescript
class TestContainer extends DIContainer {
  constructor() {
    super();
    // Override real services with fakes
    this.registerSingleton('db', () => new InMemoryDatabase());
    this.registerSingleton('emailService', () => new FakeEmailService());
    this.registerScoped('userRepository', () => new InMemoryUserRepository());
    this.registerScoped('userService', () =>
      new UserService(this.resolve('emailService'), this.resolve('userRepository'))
    );
  }
}

describe('UserService', () => {
  let container: TestContainer;
  let userService: UserService;
  let emailService: FakeEmailService;

  beforeEach(() => {
    container = new TestContainer();
    container.beginScope();
    userService = container.resolve('userService');
    emailService = container.resolve('emailService');
  });

  afterEach(() => {
    container.endScope();
  });

  it('sends welcome email on register', async () => {
    await userService.register('user@example.com', 'password');
    expect(emailService.sentEmails).toHaveLength(1);
    expect(emailService.sentEmails[0].to).toBe('user@example.com');
    expect(emailService.sentEmails[0].subject).toBe('Welcome');
  });

  it('persists user to repository', async () => {
    const user = await userService.register('user@example.com', 'password');
    const repo = container.resolve('userRepository') as InMemoryUserRepository;
    expect(repo.users).toHaveLength(1);
    expect(repo.users[0].email).toBe('user@example.com');
  });
});
```

## Additional Best Practices

1. **Use module composition for large apps.** Split registrations into modules that can be composed at the composition root:

```typescript
interface DIModule {
  register(container: DIContainer): void;
}

class DatabaseModule implements DIModule {
  register(container: DIContainer): void {
    container.registerSingleton('db', () => new PostgresPool(getDbConfig()));
    container.registerScoped('session', () => container.resolve('db').createSession());
    container.registerScoped('userRepo', () => new UserRepository(container.resolve('session')));
  }
}

class EmailModule implements DIModule {
  register(container: DIContainer): void {
    container.registerSingleton('emailService', () => new SendGridEmailService(getEmailConfig()));
  }
}

// Composition root — compose modules
const container = new DIContainer();
[new DatabaseModule(), new EmailModule()].forEach(m => m.register(container));
```

2. **Dispose resources properly.** Services that hold resources (connections, file handles) need explicit disposal:

```typescript
interface Disposable {
  dispose(): Promise<void>;
}

class DIContainer {
  private disposables: Disposable[] = [];

  async disposeAll(): Promise<void> {
    await Promise.all(this.disposables.map(d => d.dispose()));
    this.disposables = [];
    this.singletons.clear();
    this.scoped.clear();
  }
}
```

3. **Validate the container at startup.** Eagerly resolve all singleton registrations to catch wiring errors before the first request:

```typescript
function validateContainer(container: DIContainer, keys: string[]): void {
  for (const key of keys) {
    try {
      container.resolve(key);
    } catch (e) {
      throw new Error(`Container validation failed for '${key}': ${(e as Error).message}`);
    }
  }
}

validateContainer(container, ['db', 'emailService', 'userService']);
```

## Additional Common Mistakes

1. **Captive dependencies.** A singleton that depends on a scoped service captures the scoped instance forever. The scoped service becomes an accidental singleton:

```typescript
// Bad: singleton captures scoped repository
container.registerSingleton('reportService', () =>
  new ReportService(container.resolve('userRepository')) // userRepository is scoped!
);

// Good: make reportService scoped too, or inject a factory
container.registerScoped('reportService', () =>
  new ReportService(container.resolve('userRepository'))
);
```

2. **Registering concrete types instead of interfaces.** When you register a concrete class, consumers are coupled to that implementation. Register against an interface key:

```typescript
// Bad: coupled to concrete type
container.registerTransient('emailService', () => new SendGridEmailService());

// Good: interface key, swappable implementation
container.registerTransient('EmailService', () => new SendGridEmailService());
// In tests: container.registerTransient('EmailService', () => new FakeEmailService());
```

3. **Resolving dependencies inside methods.** Resolving at runtime instead of construction time hides the dependency graph and makes testing harder:

```typescript
// Bad: hidden dependency
class OrderService {
  process(order: Order) {
    const paymentService = container.resolve('paymentService'); // hidden
    return paymentService.charge(order.total);
  }
}

// Good: explicit dependency
class OrderService {
  constructor(private paymentService: PaymentService) {}

  process(order: Order) {
    return this.paymentService.charge(order.total);
  }
}
```

## Additional FAQ

### How do I handle circular dependencies in DI?

Circular dependencies (A needs B, B needs A) indicate a design problem. Break the cycle by:
- Extracting the shared logic into a third service C that both A and B depend on
- Using events or a mediator pattern for one direction of the dependency
- Introducing a lazy resolution where one side receives a factory instead of the instance

```typescript
// Breaking a cycle with a factory
container.registerSingleton('serviceA', () => new ServiceA(container.resolve('serviceB')));
container.registerSingleton('serviceB', () => new ServiceB(() => container.resolve('serviceA')));
```

### Is this solution production-ready?

Yes. Constructor injection is the standard DI pattern in every modern framework (Spring, NestJS, ASP.NET Core, Dagger). The lightweight DI container mirrors how NestJS and InversifyJS work internally. The scoped lifecycle with context managers is the pattern SQLAlchemy and FastAPI use for request-scoped sessions. The testing patterns with a dedicated test container are standard in enterprise codebases.

### What are the performance characteristics?

Singleton resolution is a Map lookup after first creation — O(1), sub-microsecond. Transient resolution calls the factory each time — measure factory cost. Scoped resolution is a Map lookup within the scope. Container validation at startup adds a one-time cost proportional to the number of registrations. Avoid resolving per-request in hot paths; resolve once at the controller or handler level and pass instances down.

### How do I debug issues with this approach?

Log each resolution with the key and resulting type. For captive dependency detection, log the lifecycle (singleton/scoped/transient) alongside the key. For circular dependencies, most containers throw a specific error — inspect the dependency chain in the error message. Use container validation at startup to catch missing registrations before the first request. In tests, assert that the test container registers all keys the production container does.
