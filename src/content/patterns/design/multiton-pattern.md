---
contentType: patterns
slug: multiton-pattern
title: "Multiton Pattern"
description: "Manage a map of named singleton instances, providing controlled access to a finite set of shared objects identified by keys."
metaDescription: "Learn the Multiton Pattern to manage named singleton instances. Examples in Python, Java, and JavaScript for keyed object registries."
difficulty: intermediate
topics:
  - design
tags:
  - multiton
  - pattern
  - design-pattern
  - creational
  - registry
  - singleton
relatedResources:
  - /patterns/design/singleton-pattern
  - /patterns/design/factory-pattern
  - /patterns/design/object-pool-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Multiton Pattern to manage named singleton instances. Examples in Python, Java, and JavaScript for keyed object registries."
  keywords:
    - multiton
    - design pattern
    - creational pattern
    - named singleton
    - registry
---

# Multiton Pattern

## Overview

The Multiton Pattern extends the Singleton concept to manage multiple named instances. Instead of a single global instance, a Multiton maintains a registry of instances keyed by name or identifier. Requesting the same key always returns the same instance, but different keys produce different instances.

This pattern is useful when you need a fixed set of related singletons — for example, database connection pools per tenant, logger instances per module, or theme configurations per client.

## When to Use

Use the Multiton Pattern when:
- You need a controlled set of singleton-like instances identified by keys
- Resources are expensive and should be shared per category, not globally
- You want to avoid creating instances for keys that are never used (lazy initialization)
- The number of possible keys is finite and known

## When to Avoid

- Keys are live or unbounded (use a generic cache or pool instead)
- Instances are lightweight and cheap to create (direct instantiation is simpler)
- You need lifecycle management per instance (use a factory with DI container)

## Solution

### Python

```python
import threading

class DatabaseConnectionPool:
    _instances = {}
    _lock = threading.Lock()

    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.connections = []
        print(f"Created pool for tenant {tenant_id}")

    @classmethod
    def get_instance(cls, tenant_id: str):
        if tenant_id not in cls._instances:
            with cls._lock:
                if tenant_id not in cls._instances:
                    cls._instances[tenant_id] = cls(tenant_id)
        return cls._instances[tenant_id]

    def query(self, sql: str):
        return f"[{self.tenant_id}] Result for: {sql}"


# Usage
pool_a = DatabaseConnectionPool.get_instance("tenant-a")
pool_b = DatabaseConnectionPool.get_instance("tenant-b")
pool_a2 = DatabaseConnectionPool.get_instance("tenant-a")

print(pool_a is pool_a2)  # True — same instance
print(pool_a is pool_b)   # False — different instance
```

### Java

```java
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

public class ThemeManager {
    private static final Map<String, ThemeManager> instances = new ConcurrentHashMap<>();
    private final String themeName;

    private ThemeManager(String themeName) {
        this.themeName = themeName;
        System.out.println("Created theme manager for " + themeName);
    }

    public static ThemeManager getInstance(String themeName) {
        return instances.computeIfAbsent(themeName, ThemeManager::new);
    }

    public String apply(String component) {
        return "[" + themeName + "] Styled " + component;
    }
}

// Usage
ThemeManager light = ThemeManager.getInstance("light");
ThemeManager dark = ThemeManager.getInstance("dark");
ThemeManager light2 = ThemeManager.getInstance("light");

System.out.println(light == light2); // true
System.out.println(light == dark);   // false
```

### JavaScript

```javascript
class Logger {
  static #instances = new Map();

  constructor(moduleName) {
    this.moduleName = moduleName;
    console.log(`Created logger for ${moduleName}`);
  }

  static getInstance(moduleName) {
    if (!Logger.#instances.has(moduleName)) {
      Logger.#instances.set(moduleName, new Logger(moduleName));
    }
    return Logger.#instances.get(moduleName);
  }

  log(message) {
    console.log(`[${this.moduleName}] ${message}`);
  }
}

// Usage
const dbLogger = Logger.getInstance('database');
const apiLogger = Logger.getInstance('api');
const dbLogger2 = Logger.getInstance('database');

console.log(dbLogger === dbLogger2); // true
console.log(dbLogger === apiLogger); // false
```

## Explanation

The Multiton Pattern involves:

- **Registry**: A map or dictionary storing instances keyed by identifier
- **Factory Method**: `getInstance(key)` creates or returns the existing instance for that key
- **Private Constructor**: Prevents direct instantiation outside the class
- **Thread Safety**: Synchronization or atomic operations prevent duplicate creation under concurrency

## Variants

| Variant | Behavior | Use Case |
|---------|----------|----------|
| **Lazy Multiton** | Creates on first access | Large key spaces where most keys are unused |
| **Eager Multiton** | Pre-creates all instances | Small, fixed set of keys (themes, environments) |
| **Bounded Multiton** | Evicts oldest when full | Memory-sensitive caches with max capacity |
| **Weak Multiton** | Allows GC when unreferenced | Temporary per-request resources |

## What Works

- **Use thread-safe registries.** Concurrent access to the instance map is the most common source of bugs.
- **Clean up unused instances.** For live keys, implement eviction or TTL to prevent unbounded growth.
- **Validate keys.** Reject unknown or malformed keys instead of creating instances for them.
- **Document the key namespace.** Multitons are hard to discover; document which keys are valid and what they represent.
- **Do not store mutable global state** in multiton instances unless it is the intended behavior.

## Common Mistakes

- **Unbounded key growth** causes memory leaks when keys are generated live (e.g., user IDs).
- **Race conditions** during instance creation under load lead to duplicate instances for the same key.
- **Hardcoding keys** in client code scatters configuration. Use constants or configuration-driven key selection.
- **Using Multiton as a cache** — caches need eviction policies; multitons are for permanent singleton families.
- **Exposing the internal registry** allows external code to modify or clear instances unpredictably.

## Real-World Examples

### Java Locale

`NumberFormat.getCurrencyInstance(Locale.US)` returns a shared formatter for US currency. Different locales return different singleton formatters.

### Logging Frameworks

Log4j and SLF4J maintain named loggers per class or module. `LoggerFactory.getLogger("com.myapp.db")` always returns the same logger instance.

### Connection Pools

Multi-tenant SaaS applications often maintain one database pool per tenant, accessed by `PoolManager.get(tenantId)`.

## Frequently Asked Questions

**Q: What is the difference between Multiton and a regular Map?**
A: A Multiton controls instance creation (private constructor) and guarantees the same instance for the same key. A Map just stores externally created objects.

**Q: Can I remove instances from a Multiton?**
A: Yes, but carefully. Provide a controlled `evict(key)` method for explicit cleanup rather than exposing the internal map.

**Q: Is Multiton an anti-pattern?**
A: Like Singleton, it is not inherently bad but is easily abused. It is appropriate for finite, well-defined sets of shared resources.
