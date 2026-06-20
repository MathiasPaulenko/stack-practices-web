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

## Best Practices

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
