---
contentType: patterns
slug: dependency-injection-pattern
title: "Dependency Injection Pattern"
description: "Supply dependencies from outside rather than creating them internally. An architectural pattern for decoupled, testable code."
metaDescription: "Learn the Dependency Injection Pattern in Python, Java, and JavaScript. Architectural pattern for decoupled, testable, and maintainable code."
difficulty: intermediate
topics:
  - design
tags:
  - architecture-pattern
  - decoupling
  - dependency-injection
  - java
  - javascript
  - pattern
  - python
relatedResources:
  - /patterns/design/factory-pattern
  - /patterns/design/singleton-pattern
  - /patterns/design/strategy-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Dependency Injection Pattern in Python, Java, and JavaScript. Architectural pattern for decoupled, testable, and maintainable code."
  keywords:
    - dependency injection
    - design pattern
    - architecture pattern
    - inversion of control
    - di container
    - python di
    - java spring
    - javascript di
---

# Dependency Injection Pattern

## Overview

The [Dependency Injection](/patterns/design/dependency-injection-typescript) Pattern is an architectural pattern where dependencies are supplied to a class from the outside rather than being created internally. This inverts control: the class declares what it needs, and an external mechanism provides it. The result is loosely coupled, highly testable code.

## When to Use

Use Dependency Injection when:
- Classes depend on other classes and you want to avoid tight coupling
- You need to substitute implementations for testing (mocks, stubs)
- You want to configure behavior at runtime or deployment time
- You are building a plugin or modular architecture
- You want to follow the Dependency Inversion Principle (SOLID)

## Solution

### Python

```python
from abc import ABC, abstractmethod

class PaymentProcessor(ABC):
    @abstractmethod
    def charge(self, amount: float) -> bool:
        pass

class StripeProcessor(PaymentProcessor):
    def charge(self, amount: float) -> bool:
        print(f"Charging ${amount} via Stripe")
        return True

class PayPalProcessor(PaymentProcessor):
    def charge(self, amount: float) -> bool:
        print(f"Charging ${amount} via PayPal")
        return True

class OrderService:
    def __init__(self, processor: PaymentProcessor):
        # Dependency injected via constructor
        self.processor = processor

    def checkout(self, amount: float) -> bool:
        return self.processor.charge(amount)

# Usage: swap implementations easily
stripe_service = OrderService(StripeProcessor())
stripe_service.checkout(100.0)

# Testing: inject a mock
class MockProcessor(PaymentProcessor):
    def charge(self, amount: float) -> bool:
        return True

test_service = OrderService(MockProcessor())
assert test_service.checkout(1.0)
```

### JavaScript

```javascript
class StripeProcessor {
  charge(amount) {
    console.log(`Charging $${amount} via Stripe`);
    return true;
  }
}

class PayPalProcessor {
  charge(amount) {
    console.log(`Charging $${amount} via PayPal`);
    return true;
  }
}

class OrderService {
  constructor(processor) {
    this.processor = processor;
  }

  checkout(amount) {
    return this.processor.charge(amount);
  }
}

// Usage
const stripeService = new OrderService(new StripeProcessor());
stripeService.checkout(100.0);

// Testing with mock
class MockProcessor {
  charge(amount) { return true; }
}
const testService = new OrderService(new MockProcessor());
console.assert(testService.checkout(1.0));
```

### Java

```java
public interface PaymentProcessor {
    boolean charge(double amount);
}

public class StripeProcessor implements PaymentProcessor {
    public boolean charge(double amount) {
        System.out.println("Charging $" + amount + " via Stripe");
        return true;
    }
}

public class PayPalProcessor implements PaymentProcessor {
    public boolean charge(double amount) {
        System.out.println("Charging $" + amount + " via PayPal");
        return true;
    }
}

public class OrderService {
    private final PaymentProcessor processor;

    // Constructor injection
    public OrderService(PaymentProcessor processor) {
        this.processor = processor;
    }

    public boolean checkout(double amount) {
        return processor.charge(amount);
    }
}

// Usage
OrderService stripeService = new OrderService(new StripeProcessor());
stripeService.checkout(100.0);
```

## Explanation

Dependency Injection has three common forms:

- **Constructor Injection** — dependencies passed via the constructor (most common, ensures the object is always fully initialized)
- **Setter Injection** — dependencies set via setter methods after construction (flexible, but object may be in incomplete state)
- **Interface Injection** — dependencies provided through an interface method (less common, used in frameworks)

The core idea is **Inversion of Control**: instead of a class creating its own dependencies, they are supplied externally.

## Variants

| Variant | Description | Best For |
|---------|-------------|----------|
| **Constructor Injection** | Dependencies passed at creation | Mandatory dependencies; immutable services |
| **Setter Injection** | Dependencies set after creation | Optional dependencies; reconfiguration at runtime |
| **Interface Injection** | Dependencies via interface method | Framework-managed lifecycle |
| **Service Locator** | Class asks a registry for dependencies | Legacy systems; avoid in new code |
| **[DI Container](/patterns/design/dependency-injection-typescript)** | Framework resolves and injects dependencies automatically | Large applications (Spring, Angular, .NET Core) |

## What Works

- **Prefer constructor injection** for required dependencies; it makes the class's needs explicit
- **Use interfaces or abstractions** as dependency types, not concrete classes
- **Avoid service locators** when possible; they hide dependencies and make testing harder
- **Keep DI configuration separate** from business logic (use modules, config files, or annotations)
- **Respect the Law of Demeter** — don't inject the container itself, only the specific dependencies needed

## Common Mistakes

- Injecting the DI container itself instead of specific dependencies, creating a service locator anti-pattern
- Using setter injection for required dependencies, allowing objects to exist in an incomplete state
- Over-engineering with a DI container for small projects where manual wiring is simpler
- Allowing circular dependencies between injected services, causing initialization failures
- Forgetting to register all dependencies in the container, leading to runtime resolution errors

## Frequently Asked Questions

**Q: Is DI the same as Inversion of Control?**
A: DI is a specific form of IoC. IoC is the broader principle of delegating control to external code. DI achieves IoC by injecting dependencies from outside.

**Q: Do I need a DI framework?**
A: No. For small projects, manual constructor injection is sufficient. See [DI Container in TypeScript](/patterns/design/dependency-injection-typescript) for a lightweight implementation. DI frameworks like Spring, Angular's injector, or InversifyJS shine in large applications with many interdependent services.

**Q: How does DI help with testing?**
A: By depending on abstractions (interfaces), you can inject mock or stub implementations during tests. See [unit testing](/recipes/testing/unit-testing) for testing patterns. This isolates the class under test from its real collaborators.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
