---
contentType: guides
slug: design-patterns-guide
title: "Practical Design Patterns Guide"
description: "A guide to selecting and applying the right design pattern for common software engineering problems."
metaDescription: "Learn when and how to use design patterns: Singleton, Factory, Observer, Strategy, Repository, and more. Practical examples with selection criteria."
difficulty: intermediate
topics:
  - design
  - architecture
tags:
  - architecture
  - behavioral
  - creational
  - design-patterns
  - factory
  - observer
  - singleton
  - strategy
  - structural
relatedResources:
  - /patterns/design/singleton-pattern
  - /patterns/design/observer-pattern
  - /patterns/design/strategy-pattern
  - /patterns/design/repository-pattern
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn when and how to use design patterns: Singleton, Factory, Observer, Strategy, Repository, and more. Practical examples with selection criteria."
  keywords:
    - design patterns
    - software patterns
    - creational patterns
    - structural patterns
    - behavioral patterns
---

## Introduction

Design patterns are reusable solutions to common software design problems. Knowing *when* to apply a pattern is as important as knowing *how*. This guide helps you choose the right pattern for the right situation.

## Creational Patterns

Creational patterns deal with object creation mechanisms.

### Factory Method

Use when: You need to create objects without specifying the exact class.

```python
from abc import ABC, abstractmethod

class Notification(ABC):
    @abstractmethod
    def send(self, message: str): pass

class EmailNotification(Notification):
    def send(self, message: str):
        print(f"Email: {message}")

class SMSNotification(Notification):
    def send(self, message: str):
        print(f"SMS: {message}")

class NotificationFactory:
    @staticmethod
    def create(type: str) -> Notification:
        if type == "email": return EmailNotification()
        if type == "sms": return SMSNotification()
        raise ValueError(f"Unknown type: {type}")

# Usage
notifier = NotificationFactory.create("email")
notifier.send("Hello!")
```

**When to use**: Multiple implementations of an interface, chosen at runtime.

### Builder

Use when: You need to construct complex objects step by step.

```typescript
class QueryBuilder {
  private parts: string[] = [];

  select(columns: string[]): this {
    this.parts.push(`SELECT ${columns.join(', ')}`);
    return this;
  }

  from(table: string): this {
    this.parts.push(`FROM ${table}`);
    return this;
  }

  where(condition: string): this {
    this.parts.push(`WHERE ${condition}`);
    return this;
  }

  build(): string {
    return this.parts.join(' ') + ';';
  }
}

// Usage
const query = new QueryBuilder()
  .select(['id', 'name', 'email'])
  .from('users')
  .where('active = true')
  .build();
```

**When to use**: Objects with many optional parameters, or complex construction logic.

## Structural Patterns

Structural patterns deal with object composition.

### Adapter

Use when: You need to make incompatible interfaces work together.

```python
class OldPrinter:
    def old_print(self, text):
        print(f"OLD: {text}")

class PrinterAdapter:
    def __init__(self, old_printer):
        self._printer = old_printer

    def print(self, text):
        self._printer.old_print(text)

# Usage
adapter = PrinterAdapter(OldPrinter())
adapter.print("Hello")  # Works with new interface
```

**When to use**: Integrating legacy code, third-party libraries, or APIs with different interfaces.

### Decorator

Use when: You need to add responsibilities to objects dynamically.

```python
from functools import wraps

def timing(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        import time
        start = time.time()
        result = func(*args, **kwargs)
        print(f"{func.__name__} took {time.time() - start:.2f}s")
        return result
    return wrapper

@timing
def fetch_data():
    # ... slow operation
    return data
```

**When to use**: Extending functionality without subclassing (logging, caching, validation, retries).

## Behavioral Patterns

Behavioral patterns focus on communication between objects.

### Observer

Use when: You need a publish-subscribe mechanism.

```typescript
class EventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(callback);
  }

  emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

// Usage
const emitter = new EventEmitter();
emitter.on('user:login', (user) => console.log(`${user.name} logged in`));
emitter.emit('user:login', { name: 'Alice' });
```

**When to use**: Event-driven architectures, real-time updates, decoupled systems.

### Strategy

Use when: You need interchangeable algorithms.

```python
from abc import ABC, abstractmethod

class PaymentStrategy(ABC):
    @abstractmethod
    def pay(self, amount: float): pass

class CreditCardPayment(PaymentStrategy):
    def pay(self, amount: float):
        print(f"Paid ${amount} with credit card")

class PayPalPayment(PaymentStrategy):
    def pay(self, amount: float):
        print(f"Paid ${amount} with PayPal")

class ShoppingCart:
    def __init__(self, strategy: PaymentStrategy):
        self.strategy = strategy

    def checkout(self, amount: float):
        self.strategy.pay(amount)

# Usage
cart = ShoppingCart(PayPalPayment())
cart.checkout(99.99)
```

**When to use**: Different algorithms for the same task (sorting, payment, validation rules).

## Pattern Selection Cheat Sheet

| Problem | Pattern |
|---------|---------|
| "I need exactly one instance" | Singleton |
| "I create objects based on a string/type" | Factory Method |
| "This object has 10 optional parameters" | Builder |
| "Legacy code doesn't match my interface" | Adapter |
| "I need to add logging to everything" | Decorator |
| "Components need to react to events" | Observer |
| "I want to swap algorithms at runtime" | Strategy |
| "I need to abstract database access" | Repository | See [database design](/guides/databases/database-design-guide).
| "I need to track and undo changes" | Command + Memento |

## What Works

- **Don't force patterns**: Not every problem needs a pattern
- **Start simple**: Refactor into a pattern when duplication appears. See [clean code](/guides/design/clean-code-principles-guide).
- **Name matters**: Use pattern names in class names (`UserRepository`, `EmailStrategy`)
- **Document intent**: Explain *why* you chose a pattern, not just *what* it does

## Common Mistakes

- Over-engineering: applying patterns to trivial problems
- Pattern explosion: using too many patterns in one module
- Ignoring language idioms: not all patterns fit all languages

## Frequently Asked Questions

### When should I use a design pattern?

Use a design pattern when you encounter a problem it solves, not before. Combine with [SOLID principles](/guides/design/solid-principles-guide). Start with simple code and refactor into a pattern when you see duplication, complexity, or coupling that a pattern would resolve.

### Are design patterns still relevant in modern languages?

Yes, but modern languages often absorb patterns into their standard libraries. For example, JavaScript's Promise is the Observer pattern, and Python's decorators implement the Decorator pattern natively.

### How many patterns should I use in one module?

Use as many as needed, but no more. Each pattern adds cognitive overhead. If a module uses more than 2-3 patterns, consider whether it is doing too much and should be split.



## Advanced Topics

### Scenario: Patterns in an Order Processing System

```text
System: E-commerce order processing
Patterns applied: Strategy, Factory, Observer, Decorator, Command

1. Strategy - Shipping calculation:
  interface ShippingStrategy {
    calculate(weight: number): number;
  }
  class StandardShipping implements ShippingStrategy {
    calculate(weight: number) { return weight * 0.5; }
  }
  class ExpressShipping implements ShippingStrategy {
    calculate(weight: number) { return weight * 1.5; }
  }
  class SameDayShipping implements ShippingStrategy {
    calculate(weight: number) { return weight * 3.0; }
  }

  // Usage: select strategy at runtime
  const shipping = strategies[order.shippingMethod];
  const cost = shipping.calculate(order.totalWeight);

2. Factory - Notification creation:
  class NotificationFactory {
    create(type: string): Notification {
      switch (type) {
        case "email": return new EmailNotification();
        case "sms": return new SMSNotification();
        case "push": return new PushNotification();
        default: throw new Error("Unsupported type");
      }
    }
  }

3. Observer - Order events:
  class OrderEventBus {
    private handlers: Map<string, Function[]> = new Map();
    on(event: string, handler: Function) {
      if (!this.handlers.has(event)) this.handlers.set(event, []);
      this.handlers.get(event).push(handler);
    }
    emit(event: string, data: any) {
      this.handlers.get(event)?.forEach(h => h(data));
    }
  }
  // Subscribers: inventory, email, analytics
  bus.on("order.created", updateInventory);
  bus.on("order.created", sendConfirmation);
  bus.on("order.created", trackAnalytics);

4. Decorator - Logging and cache:
  function withLogging(fn: Function) {
    return async (...args: any[]) => {
      console.log("Calling:", fn.name, args);
      const result = await fn(...args);
      console.log("Result:", result);
      return result;
    };
  }
  function withCache(fn: Function, ttl: number) {
    const cache = new Map();
    return async (...args: any[]) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) return cache.get(key);
      const result = await fn(...args);
      cache.set(key, result);
      setTimeout(() => cache.delete(key), ttl);
      return result;
    };
  }

  // Composition: logging + cache
  const cachedLoggedFetch = withCache(withLogging(fetchProduct), 60000);

5. Command - Order operations:
  interface Command { execute(): Promise<void>; }
  class CancelOrderCommand implements Command {
    constructor(private order: Order, private inventory: Inventory) {}
    async execute() {
      await this.inventory.release(this.order.items);
      await this.order.update({ status: "cancelled" });
    }
  }
  // Enables undo, queue, and operation logging

Anti-patterns to avoid:
  - Singleton for everything (global coupling)
  - Factory when a constructor suffices
  - Observer without unsubscribe (memory leaks)
  - Excessive decorator stacking (> 3 layers)
  - Command without undo (loses half the value)

Lessons:
  - Apply patterns when the problem requires it, not before
  - Modern languages absorb patterns into their stdlib
  - Composition > inheritance in most cases
  - Each pattern adds complexity: weigh against value
  - Refactor towards patterns, do not design them from the start
```

### How do patterns relate to SOLID?

Strategy implements Open/Closed (new strategies without changing existing code). Factory implements Single Responsibility (creation separated from usage). Observer implements Dependency Inversion (depends on abstraction, not concretion). Decorator implements Open/Closed (extends without modifying). Command implements Single Responsibility (each command one responsibility).
