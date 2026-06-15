---
contentType: patterns
slug: singleton-pattern
title: "Singleton Pattern"
description: "Ensure a class has only one instance and provide global access to it. A creational design pattern for controlled object creation."
metaDescription: "Learn the Singleton Pattern with practical examples in Python, Java, and JavaScript. Creational design pattern for single-instance control."
difficulty: beginner
topics:
  - design
tags:
  - singleton
  - pattern
  - design-pattern
  - creational
  - python
  - javascript
  - java
relatedResources:
  - /recipes/data/parse-json
  - /patterns/design/factory-pattern
  - /guides/api/rest-api-design-guide
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Singleton Pattern with practical examples in Python, Java, and JavaScript. Creational design pattern for single-instance control."
  keywords:
    - singleton pattern
    - design pattern
    - creational pattern
    - single instance
    - python singleton
    - java singleton
    - javascript singleton
---

# Singleton Pattern

## Overview

The Singleton Pattern is a creational design pattern that restricts a class to a single instance and provides a global point of access to it. It is useful when exactly one object is needed to coordinate actions across the system.

Common use cases include database connection pools, configuration managers, and logging services.

## When to Use

Use the Singleton Pattern when:
- Exactly one instance of a class must exist in the system
- A single shared resource needs controlled access (e.g., config, cache, connection pool)
- You need a global access point without polluting the namespace with global variables
- Lazy initialization is desired to avoid creating the instance until it is needed

## Solution

### Python

```python
class Singleton:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

# Usage
a = Singleton()
b = Singleton()
print(a is b)  # True
```

### JavaScript

```javascript
class Singleton {
  static #instance = null;

  static getInstance() {
    if (!Singleton.#instance) {
      Singleton.#instance = new Singleton();
    }
    return Singleton.#instance;
  }
}

// Usage
const a = Singleton.getInstance();
const b = Singleton.getInstance();
console.log(a === b); // true
```

### Java

```java
public class Singleton {
    private static Singleton instance;

    private Singleton() {}

    public static synchronized Singleton getInstance() {
        if (instance == null) {
            instance = new Singleton();
        }
        return instance;
    }
}

// Usage
Singleton a = Singleton.getInstance();
Singleton b = Singleton.getInstance();
System.out.println(a == b); // true
```

## Explanation

The Singleton Pattern guarantees a single instance through three mechanisms:

- **Private constructor**: Prevents direct instantiation from outside the class
- **Static instance field**: Holds the single shared instance
- **Global access method**: Provides a controlled way to retrieve the instance

In multi-threaded environments (like Java), use `synchronized` or eager initialization to prevent race conditions during instance creation.

## Variants

| Variant | Use Case | Trade-off |
|---------|----------|-----------|
| **Lazy initialization** | Instance created on first access | Thread-safety concerns |
| **Eager initialization** | Instance created at class load | No thread issues, may waste resources |
| **Double-checked locking** | High-performance lazy init | More complex, error-prone in some languages |

## Best Practices

- **Make the constructor private** to prevent accidental direct instantiation
- **Use lazy initialization** only when startup cost matters
- **Consider thread safety** in concurrent environments
- **Avoid overuse**: Singletons can make unit testing harder due to hidden global state
- **Document the singleton nature** so other developers do not try to create multiple instances

## Common Mistakes

- **Race conditions**: Two threads creating separate instances simultaneously
- **Testing difficulties**: Hidden global state makes tests order-dependent
- **Overuse**: Turning every shared service into a singleton increases coupling
- **Serialization issues**: Deserializing can create duplicate instances unless handled
- **Inheritance misuse**: Subclasses can break the single-instance guarantee

## Real-World Examples

### Database Connection Pool

Most database drivers (SQLAlchemy, JDBC connection pools) use a singleton-like pattern to manage a fixed pool of connections. Creating a new connection for every query would exhaust the database server.

### Configuration Manager

Applications load configuration from files or environment variables once at startup. A singleton config manager ensures all modules read from the same in-memory state without reloading from disk.

### Cache Layer

In-memory caches (Redis clients, local LRU caches) are typically shared across the application. A singleton guarantees cache consistency and avoids memory duplication.

### Logger Factory

Logging frameworks often use a registry of named loggers that behave as singletons. Retrieving `Logger.getLogger("my.module")` multiple times returns the same instance.

## Frequently Asked Questions

**Q: Is Singleton an anti-pattern?**
A: Not inherently, but overuse leads to tight coupling and hidden dependencies. Use it sparingly for true single-instance resources.

**Q: How do I make a Singleton thread-safe in Python?**
A: The `__new__` approach shown above is thread-safe in CPython due to the GIL. For stricter safety, use a lock or module-level variables.

**Q: Can a Singleton have subclasses?**
A: It is possible but tricky. Each subclass can end up with its own instance, which may or may not be the desired behavior.

**Q: How do I unit test code that uses a Singleton?**
A: Inject the singleton as a dependency rather than calling it directly, or provide a `reset()` method for tests. Alternatively, use a factory that returns the singleton by default but can be mocked in tests.

**Q: What are alternatives to Singleton?**
A: Dependency injection, service locators, or module-level variables in languages that support them (Python modules are natural singletons). These approaches make dependencies explicit and easier to test.
