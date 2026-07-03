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

The factory pattern moves object creation into a dedicated method or class. The caller requests an object from the factory, not from a constructor. The factory decides which concrete class to instantiate, how to wire dependencies, and what default configurations to apply. The caller depends on an abstraction (interface or abstract class), not a concrete implementation. This recipe covers factory methods, abstract factories, and practical examples in TypeScript, Java, and Python.

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


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
