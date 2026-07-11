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

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.


## Advanced Topics

### Scenario: Multiton for Multi-tenant Connections

```typescript
// Multiton: singleton with key, one instance per key
class TenantDatabase {
  private static instances = new Map<string, TenantDatabase>();
  private pool: Pool;

  private constructor(private tenantId: string, config: DBConfig) {
    this.pool = createPool({
      host: config.host,
      port: config.port,
      database: `tenant_${tenantId}`,
      max: 10,
    });
  }

  static getInstance(tenantId: string, config?: DBConfig): TenantDatabase {
    if (!this.instances.has(tenantId)) {
      if (!config) throw new Error(`Config required for new tenant: ${tenantId}`);
      this.instances.set(tenantId, new TenantDatabase(tenantId, config));
    }
    return this.instances.get(tenantId)!;
  }

  async query(sql: string, params: unknown[]) {
    return this.pool.query(sql, params);
  }

  static async closeAll(): Promise<void> {
    for (const instance of this.instances.values()) {
      await instance.pool.end();
    }
    this.instances.clear();
  }

  static getActiveTenants(): string[] {
    return [...this.instances.keys()];
  }
}

// Usage: one DB connection per tenant
const tenantA = TenantDatabase.getInstance("tenant-a", { host: "localhost", port: 5432 });
const tenantB = TenantDatabase.getInstance("tenant-b", { host: "localhost", port: 5432 });
const tenantA2 = TenantDatabase.getInstance("tenant-a"); // same instance

console.log(tenantA === tenantA2); // true
console.log(tenantA === tenantB); // false
console.log(TenantDatabase.getActiveTenants()); // ["tenant-a", "tenant-b"]

// Comparison: Singleton vs Multiton
  | Pattern | Instances | Key | Use case |
  |---------|-----------|-----|----------|
  | Singleton | 1 global | N/A | Logger, config |
  | Multiton | N per key | string/enum | Multi-tenant, multi-DB |
  | Factory | N unlimited | N/A | Create varied objects |
  | Object Pool | N limited | N/A | Reuse expensive objects |
```

Lessons:
  - Multiton is Singleton with key: one instance per key
  - Ideal for multi-tenant: one DB connection per tenant
  - closeAll() to clean up at shutdown
  - Map to store instances: O(1) lookup
  - In tests, always reset with closeAll() between suites
```

### How do I prevent memory leaks with Multiton?

Call closeAll() or removeInstance(key) when a tenant is no longer active. Implement a TTL or LRU eviction: if there are more than N active tenants, close the least recently used. In K8s, pods get recycled, but in long-running processes, inactive tenants can accumulate. Monitor getActiveTenants() and alert if it grows without bound.


End of document. Review and update quarterly.