---
contentType: patterns
slug: decorator-pattern
title: "Decorator Pattern"
description: "Add new functionality to objects dynamically by wrapping them. A structural design pattern for flexible behavior extension."
metaDescription: "Learn the Decorator Pattern with practical examples in Python, Java, and JavaScript. Structural design pattern for dynamic behavior extension."
difficulty: intermediate
topics:
  - design
tags:
  - decorator
  - design-pattern
  - java
  - javascript
  - pattern
  - python
  - structural
relatedResources:
  - /patterns/design/adapter-pattern
  - /patterns/design/strategy-pattern
  - /recipes/api/call-rest-api
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Decorator Pattern with practical examples in Python, Java, and JavaScript. Structural design pattern for dynamic behavior extension."
  keywords:
    - decorator pattern
    - design pattern
    - structural pattern
    - dynamic behavior
    - python decorator
    - java decorator
    - javascript decorator
---

# Decorator Pattern

## Overview

The Decorator Pattern is a structural design pattern that lets you attach new behaviors to objects by placing them inside wrapper objects that contain the behaviors. It provides a flexible alternative to subclassing for extending functionality.

It is widely used in I/O streams (Java), [middleware pipelines](/patterns/design/decorator-pattern-pipeline) (Express.js), and Python's `@decorator` syntax.

## When to Use

Use the Decorator Pattern when:
- You need to add responsibilities to objects dynamically and transparently
- Extension by subclassing is impractical or impossible (e.g., final classes)
- You want to combine multiple behaviors in various configurations
- You need to adhere to the Single Responsibility Principle by separating concerns
- You want to avoid a class explosion from subclassing every possible combination

## Solution

### Python

```python
from abc import ABC, abstractmethod

class Coffee(ABC):
    @abstractmethod
    def cost(self) -> float:
        pass

    @abstractmethod
    def description(self) -> str:
        pass

class SimpleCoffee(Coffee):
    def cost(self) -> float:
        return 2.0

    def description(self) -> str:
        return "Simple coffee"

class MilkDecorator(Coffee):
    def __init__(self, coffee: Coffee):
        self._coffee = coffee

    def cost(self) -> float:
        return self._coffee.cost() + 0.5

    def description(self) -> str:
        return self._coffee.description() + ", milk"

# Usage
coffee = MilkDecorator(SimpleCoffee())
print(coffee.description())  # Simple coffee, milk
print(coffee.cost())         # 2.5
```

### JavaScript

```javascript
class Coffee {
  cost() {
    return 2.0;
  }

  description() {
    return "Simple coffee";
  }
}

class MilkDecorator {
  constructor(coffee) {
    this.coffee = coffee;
  }

  cost() {
    return this.coffee.cost() + 0.5;
  }

  description() {
    return this.coffee.description() + ", milk";
  }
}

// Usage
const coffee = new MilkDecorator(new Coffee());
console.log(coffee.description()); // Simple coffee, milk
console.log(coffee.cost());        // 2.5
```

### Java

```java
interface Coffee {
    double cost();
    String description();
}

class SimpleCoffee implements Coffee {
    public double cost() { return 2.0; }
    public String description() { return "Simple coffee"; }
}

abstract class CoffeeDecorator implements Coffee {
    protected Coffee coffee;
    CoffeeDecorator(Coffee coffee) { this.coffee = coffee; }
}

class MilkDecorator extends CoffeeDecorator {
    MilkDecorator(Coffee coffee) { super(coffee); }
    public double cost() { return coffee.cost() + 0.5; }
    public String description() { return coffee.description() + ", milk"; }
}

// Usage
Coffee coffee = new MilkDecorator(new SimpleCoffee());
System.out.println(coffee.description()); // Simple coffee, milk
System.out.println(coffee.cost());        // 2.5
```

## Explanation

The Decorator Pattern relies on composition over inheritance:

- **Component Interface** (`Coffee`): Defines the contract for both concrete components and decorators
- **Concrete Component** (`SimpleCoffee`): The base object being wrapped
- **Decorator** (`MilkDecorator`): Implements the same interface and delegates to the wrapped object

Decorators can be nested arbitrarily. You can wrap a `MilkDecorator` with a `SugarDecorator`, then with a `WhipDecorator`, building behavior stacks at runtime.

## Variants

| Variant | Use Case | Trade-off |
|---------|----------|-----------|
| **Class-based** | Strongly typed languages (Java, C#) | Verbose but type-safe |
| **Function-based** | Python `@decorator` syntax | Concise, but less explicit composition |
| **[Middleware pipeline](/patterns/design/decorator-pattern-pipeline)** | Web frameworks (Express, Koa) | Great for request/response processing |

## What Works

- **Keep decorators transparent**: They should implement the exact same interface as the component
- **Delegate all methods**: Unless intentionally overriding, pass every call to the wrapped object
- **Avoid stateful decorators** when possible to reduce complexity
- **Document decorator order**: Some decorators may behave differently depending on wrapping order
- **Prefer composition over inheritance**: This is the core philosophy of the pattern

## Common Mistakes

- **Forgetting to delegate**: A decorator that does not forward calls breaks the chain
- **Leaky abstraction**: Decorators exposing methods not in the component interface
- **Order sensitivity**: Decorators that depend on being inner or outer can cause subtle bugs
- **Over-decoration**: Too many nested decorators make debugging and profiling difficult
- **State conflicts**: Multiple decorators holding conflicting state about the same component

## Frequently Asked Questions

**Q: What is the difference between Decorator and Proxy?**
A: Decorator adds responsibilities dynamically. [Proxy](/patterns/design/proxy-pattern) controls access to an object (lazy initialization, access control, logging). They have similar structure but different intent.

**Q: Can decorators be removed at runtime?**
A: Not easily in most implementations. If you need add/remove flexibility, consider the [Chain of Responsibility](/patterns/design/chain-of-responsibility-pattern) pattern instead.

**Q: Are Python's `@decorator` syntax and the Decorator Pattern the same?**
A: Python's `@decorator` is a language feature for wrapping functions. The Decorator Pattern is an OOP design pattern for wrapping objects. They share the concept but apply to different levels.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.


## Advanced Topics

### Scenario: Decorators for Logging and Cache

```typescript
// Decorator pattern to add behavior without modifying code
interface DataService {
  getData(key: string): Promise<unknown>;
}

class APIDataService implements DataService {
  async getData(key: string): Promise<unknown> {
    const res = await fetch(`/api/data/${key}`);
    return res.json();
  }
}

// Decorator: Logging
class LoggingDecorator implements DataService {
  constructor(private wrapped: DataService) {}

  async getData(key: string): Promise<unknown> {
    const start = Date.now();
    console.log(`[LOG] getData(${key}) started`);
    try {
      const result = await this.wrapped.getData(key);
      console.log(`[LOG] getData(${key}) OK in ${Date.now() - start}ms`);
      return result;
    } catch (err) {
      console.error(`[LOG] getData(${key}) FAILED: ${err}`);
      throw err;
    }
  }
}

// Decorator: Cache
class CacheDecorator implements DataService {
  private cache = new Map<string, { value: unknown; expiry: number }>();
  constructor(private wrapped: DataService, private ttlMs: number) {}

  async getData(key: string): Promise<unknown> {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      console.log(`[CACHE] HIT: ${key}`);
      return cached.value;
    }
    console.log(`[CACHE] MISS: ${key}`);
    const result = await this.wrapped.getData(key);
    this.cache.set(key, { value: result, expiry: Date.now() + this.ttlMs });
    return result;
  }
}

// Composition: API + Cache + Logging
const service = new LoggingDecorator(
  new CacheDecorator(
    new APIDataService(),
    60000  // 60s TTL
  )
);

// Result: each call goes through logging -> cache -> API
// Cache HIT: does not call API
// Cache MISS: calls API and stores in cache
```

Lessons:
  - Decorator adds behavior without modifying the original class
  - Decorators compose: cache + logging + retry
  - Order matters: cache outside logging to avoid logging hits
  - Maintains Open/Closed: open for extension, closed for modification
  - In TypeScript, use class decorators (@decorator) for metadata
```

### How do I order multiple decorators?

Order matters. Put the cheapest decorator outside (cache) and the most expensive inside (API). Logging outside cache: so you see both hits and misses. Retry inside logging but outside API: retries before failing. Typical order: logging -> cache -> retry -> API. Each decorator wraps the next, forming a chain of responsibility.












End of document. Review and update quarterly.