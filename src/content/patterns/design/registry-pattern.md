---
contentType: patterns
slug: registry-pattern
title: "Registry Pattern"
description: "Centralize access to shared services and objects via a lookup table. A structural pattern that decouples consumers from concrete implementations."
metaDescription: "Learn the Registry Pattern for centralized service lookup. Examples in Python, Java, and JavaScript for decoupled dependency resolution."
difficulty: intermediate
topics:
  - design
tags:
  - registry
  - pattern
  - design-pattern
  - structural
  - service-locator
  - decoupling
  - lookup
relatedResources:
  - /patterns/design/multiton-pattern
  - /patterns/design/dependency-injection-pattern
  - /patterns/design/singleton-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Registry Pattern for centralized service lookup. Examples in Python, Java, and JavaScript for decoupled dependency resolution."
  keywords:
    - registry pattern
    - design pattern
    - service locator
    - dependency lookup
    - structural pattern
---

# Registry Pattern

## Overview

The Registry Pattern provides a centralized lookup mechanism for shared services, configurations, or objects. Instead of passing dependencies through long chains of constructors, components request what they need from a registry. This decouples consumers from the concrete implementations they use.

While similar to a Service Locator, the Registry Pattern is broader: it can store anything from database connections to feature flags, not just services. It is a pragmatic alternative to full dependency injection when DI frameworks are unavailable.

## When to Use

Use the Registry Pattern when:
- Multiple components need access to the same shared resource
- Constructor injection would create excessively long parameter lists
- You need runtime lookup based on configuration or context
- A lightweight alternative to a full DI container is preferred

## When to Avoid

- The codebase has a proper DI framework (Spring, Angular, Dagger)
- Registry lookups hide dependencies and make testing harder
- The registry becomes a global state dumping ground
- You need compile-time type safety for all dependencies

## Solution

### Python

```python
from typing import Dict, Any, Callable, TypeVar

T = TypeVar('T')

class Registry:
    _store: Dict[str, Any] = {}
    _factories: Dict[str, Callable[[], Any]] = {}

    @classmethod
    def register(cls, name: str, instance: Any):
        cls._store[name] = instance

    @classmethod
    def register_factory(cls, name: str, factory: Callable[[], Any]):
        cls._factories[name] = factory

    @classmethod
    def get(cls, name: str) -> Any:
        if name in cls._store:
            return cls._store[name]
        if name in cls._factories:
            instance = cls._factories[name]()
            cls._store[name] = instance
            return instance
        raise KeyError(f"No registration found for: {name}")

    @classmethod
    def has(cls, name: str) -> bool:
        return name in cls._store or name in cls._factories


# Usage
class DatabaseConnection:
    def query(self, sql: str):
        return f"Result: {sql}"

class CacheClient:
    def get(self, key: str):
        return f"cached-{key}"

Registry.register("db", DatabaseConnection())
Registry.register_factory("cache", lambda: CacheClient())

db = Registry.get("db")
cache = Registry.get("cache")
print(db.query("SELECT 1"))
print(cache.get("users"))
```

### Java

```java
import java.util.*;
import java.util.function.Supplier;

public class Registry {
    private static final Map<String, Object> instances = new HashMap<>();
    private static final Map<String, Supplier<?>> factories = new HashMap<>();

    public static void register(String name, Object instance) {
        instances.put(name, instance);
    }

    public static void registerFactory(String name, Supplier<?> factory) {
        factories.put(name, factory);
    }

    @SuppressWarnings("unchecked")
    public static <T> T get(String name) {
        if (instances.containsKey(name)) {
            return (T) instances.get(name);
        }
        if (factories.containsKey(name)) {
            T instance = (T) factories.get(name).get();
            instances.put(name, instance);
            return instance;
        }
        throw new IllegalArgumentException("No registration for: " + name);
    }

    public static boolean has(String name) {
        return instances.containsKey(name) || factories.containsKey(name);
    }
}

// Usage
class DatabaseConnection {
    String query(String sql) { return "Result: " + sql; }
}

class CacheClient {
    String get(String key) { return "cached-" + key; }
}

Registry.register("db", new DatabaseConnection());
Registry.registerFactory("cache", CacheClient::new);

DatabaseConnection db = Registry.get("db");
CacheClient cache = Registry.get("cache");
```

### JavaScript

```javascript
class Registry {
  static #instances = new Map();
  static #factories = new Map();

  static register(name, instance) {
    Registry.#instances.set(name, instance);
  }

  static registerFactory(name, factory) {
    Registry.#factories.set(name, factory);
  }

  static get(name) {
    if (Registry.#instances.has(name)) {
      return Registry.#instances.get(name);
    }
    if (Registry.#factories.has(name)) {
      const instance = Registry.#factories.get(name)();
      Registry.#instances.set(name, instance);
      return instance;
    }
    throw new Error(`No registration found for: ${name}`);
  }

  static has(name) {
    return Registry.#instances.has(name) || Registry.#factories.has(name);
  }
}

// Usage
class DatabaseConnection {
  query(sql) { return `Result: ${sql}`; }
}

class CacheClient {
  get(key) { return `cached-${key}`; }
}

Registry.register('db', new DatabaseConnection());
Registry.registerFactory('cache', () => new CacheClient());

const db = Registry.get('db');
const cache = Registry.get('cache');
console.log(db.query('SELECT 1'));
```

## Explanation

The Registry Pattern has three roles:

- **Registry**: The central map that holds instances and factory functions
- **Registration**: Code that adds services to the registry at startup
- **Lookup**: Code that requests services from the registry at runtime

Instances can be registered directly or lazily created via factories on first access.

## Variants

| Variant | Lookup Style | Use Case |
|---------|-------------|----------|
| **Class Registry** | `Registry.get("name")` | Simple string-based lookup |
| **Typed Registry** | `registry.get(DatabaseConnection.class)` | Type-safe with generics |
| **Hierarchical Registry** | Parent fallback chain | Child registries override parent defaults |
| **Event Registry** | `on(event, handler)` | Event bus / pub-sub systems |

## What Works

- **Register at startup, not during requests.** Runtime registration causes race conditions and unpredictable behavior.
- **Use factory registration for expensive objects.** Lazy creation avoids startup delays for services that may not be used.
- **Document registry entries.** A shared registry without documentation becomes a mystery box.
- **Prefer DI for new code.** Registries are pragmatic; DI frameworks are cleaner for large codebases.
- **Avoid runtime mutation.** Unregistering or re-registering during operation causes subtle bugs.

## Common Mistakes

- **Registry as global variable** makes testing difficult. Inject the registry or use a testable wrapper.
- **String-typed lookups** are brittle. Rename a service key and every consumer breaks silently.
- **Circular dependencies** in the registry cause stack overflows during factory resolution.
- **Storing mutable state** in registry entries turns the registry into a hidden global variable.
- **No cleanup on shutdown** leaves database connections and file handles open.

## Real-World Examples

### Django Settings

Django's `settings` object is a registry of configuration values. Modules import `from django.conf import settings` instead of passing config through every function.

### WordPress Plugin API

`add_action` and `add_filter` register callbacks in a global registry. Themes and plugins hook into WordPress without modifying core files.

### JDBC DriverManager

`DriverManager.getConnection(url)` is a registry that looks up the appropriate database driver based on the URL prefix.

## Frequently Asked Questions

**Q: What is the difference between Registry and Service Locator?**
A: Service Locator is a specific type of registry focused on resolving service dependencies. Registry is broader and can store any shared object.

**Q: Is Registry an anti-pattern?**
A: Some consider it a lighter anti-pattern than global variables, but it shares the same risks. Use it sparingly and prefer DI for new code.

**Q: How do I test code that uses a Registry?**
A: Clear the registry before each test, register mocks, and run the test. Better yet, refactor to accept dependencies via constructor injection.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
