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
  - design-patterns
  - creational
  - structural
  - behavioral
  - singleton
  - factory
  - observer
  - strategy
relatedResources:
  - /patterns/design/singleton
  - /patterns/design/observer
  - /patterns/design/strategy
  - /patterns/design/repository
lastUpdated: "2026-06-11"
author: "StackPractices"
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
| "I need to abstract database access" | Repository |
| "I need to track and undo changes" | Command + Memento |

## Best Practices

- **Don't force patterns**: Not every problem needs a pattern
- **Start simple**: Refactor into a pattern when duplication appears
- **Name matters**: Use pattern names in class names (`UserRepository`, `EmailStrategy`)
- **Document intent**: Explain *why* you chose a pattern, not just *what* it does

## Common Mistakes

- Over-engineering: applying patterns to trivial problems
- Pattern explosion: using too many patterns in one module
- Ignoring language idioms: not all patterns fit all languages
