---
contentType: recipes
slug: singleton-pattern-recipe
title: "Ensure a Single Instance with the Singleton Pattern"
description: "How to guarantee exactly one instance of a class exists in an application using lazy initialization, thread-safe creation, and registry-based singletons."
metaDescription: "Learn singleton pattern for single instances. Use lazy initialization, thread-safe creation, and registry-based singletons to ensure one instance per app."
difficulty: beginner
topics:
  - design
tags:
  - design
  - singleton-pattern
  - creational-patterns
  - design-patterns
  - patterns
relatedResources:
  - /recipes/factory-pattern-recipe
  - /recipes/hexagonal-architecture
  - /recipes/unit-testing-mocking
  - /recipes/locks-and-mutexes
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn singleton pattern for single instances. Use lazy initialization, thread-safe creation, and registry-based singletons to ensure one instance per app."
  keywords:
    - singleton pattern
    - single instance
    - lazy initialization
    - thread safe singleton
    - global state
---

## Overview

Some resources are inherently singular within an application scope: a database connection pool, a configuration manager, a logging framework, or an in-memory cache. Creating multiple instances of these resources wastes memory, causes state inconsistency, and can exhaust system limits (e.g., too many database connections). The singleton pattern ensures that a class has exactly one instance and provides a global point of access to it.

The naive implementation — a static field initialized at class load — works for simple cases but breaks under concurrency and makes testing difficult. A test that mutates the singleton's state leaks that mutation to subsequent tests. Modern implementations use lazy initialization, dependency injection, or registries to balance performance, thread safety, and testability. The following demonstrates how to the evolution from basic to production-ready singletons.

## When to use it

Use this recipe when:

- A class manages a resource that must be unique within the application (connection pool, cache, config). See [Factory Pattern](/recipes/factory-pattern-recipe) for creation patterns.
- Multiple instances would cause conflicts or resource exhaustion. See [Database Connection Pooling](/recipes/databases/database-connection-pooling) for shared resources.
- You need lazy initialization to avoid expensive setup during application startup
- The singleton is stateless or read-only after initialization (avoid mutable global state). See [Locks and Mutexes](/recipes/concurrency/locks-and-mutexes) for thread-safe access.

## Solution

### Thread-Safe Singleton (Java)

```java
public class DatabaseConnectionPool {
    private static volatile DatabaseConnectionPool instance;
    private static final Object lock = new Object();

    private final HikariDataSource dataSource;

    private DatabaseConnectionPool() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(System.getenv("DATABASE_URL"));
        config.setMaximumPoolSize(10);
        this.dataSource = new HikariDataSource(config);
    }

    public static DatabaseConnectionPool getInstance() {
        if (instance == null) {
            synchronized (lock) {
                if (instance == null) {
                    instance = new DatabaseConnectionPool();
                }
            }
        }
        return instance;
    }

    public Connection getConnection() throws SQLException {
        return dataSource.getConnection();
    }
}
```

### Python Module-Level Singleton

```python
# connection_pool.py
from psycopg2 import pool

class DatabaseConnectionPool:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        self.pool = pool.ThreadedConnectionPool(
            minconn=2,
            maxconn=10,
            dsn="postgresql://user:pass@localhost/db"
        )

    def get_connection(self):
        return self.pool.getconn()

    def release_connection(self, conn):
        self.pool.putconn(conn)

# Usage: importing the module gives the same instance everywhere
from connection_pool import DatabaseConnectionPool
pool = DatabaseConnectionPool()
```

### Registry-Based Singleton (TypeScript)

```typescript
class SingletonRegistry {
  private static instances: Map<string, unknown> = new Map();

  static get<T>(key: string, factory: () => T): T {
    if (!SingletonRegistry.instances.has(key)) {
      SingletonRegistry.instances.set(key, factory());
    }
    return SingletonRegistry.instances.get(key) as T;
  }

  static reset(key: string): void {
    SingletonRegistry.instances.delete(key);
  }

  static clear(): void {
    SingletonRegistry.instances.clear();
  }
}

// Usage
const pool = SingletonRegistry.get('db-pool', () => new ConnectionPool());

// For testing: reset between tests
SingletonRegistry.reset('db-pool');
```

### Singleton with DI Container (C# / .NET)

```csharp
// Program.cs
builder.Services.AddSingleton<IDatabaseConnectionPool, DatabaseConnectionPool>();

// The DI container ensures only one instance exists
// and injects it wherever IDatabaseConnectionPool is requested
public class OrderService {
    private readonly IDatabaseConnectionPool _pool;

    public OrderService(IDatabaseConnectionPool pool) {
        _pool = pool;
    }

    public async Task<Order> GetOrder(int id) {
        await using var conn = await _pool.GetConnectionAsync();
        // ...
    }
}
```

## Explanation

- **Double-checked locking**: the Java example checks `instance == null` twice — once without locking (fast path) and once with locking (slow path). After the first check succeeds, another thread might have initialized the instance between the check and the lock, so the second check inside the synchronized block is necessary. `volatile` ensures visibility across threads.
- **Module-level singleton (Python)**: Python modules are imported once and cached in `sys.modules`. A class defined in a module and instantiated at module level behaves as a singleton. All imports reference the same object. This is simpler than `__new__` but less explicit.
- **Registry pattern**: instead of hardcoding `getInstance()` in every class, a central registry maps keys to singleton instances. This decouples creation from the class, supports parameterized singletons, and enables easy reset for testing. The registry itself is a singleton.
- **DI container singleton**: modern frameworks (Spring, ASP.NET, Angular) manage singleton lifecycle. You declare a binding as singleton scope, and the container creates one instance and injects it everywhere. This is the most testable approach — tests use a separate container with mock bindings.

## Variants

| Approach | Thread-safe | Lazy | Testable | Best for |
|----------|------------|------|----------|----------|
| Eager static | Yes | No | Poor | Simple, always-needed resources |
| Double-checked lock | Yes | Yes | Poor | Performance-critical lazy init |
| Bill Pugh (holder) | Yes | Yes | Poor | Java preferred approach |
| Enum singleton | Yes | No | Poor | Java enum-based singleton |
| Module-level | Yes* | Yes | Poor | Python simple cases |
| Registry | Yes | Yes | Good | Multiple named singletons |
| DI container | Yes | Yes | Excellent | Modern applications |

## What Works

- **Prefer DI over manual singletons**: a dependency injection container manages singletons declaratively. You configure `services.AddSingleton<IConfig, AppConfig>()` and the container handles creation, caching, and disposal. This makes dependencies explicit and testing trivial.
- **Make singletons stateless or immutable**: a mutable singleton is global state, and global state is the enemy of testing and concurrency. See [Race Condition Prevention](/recipes/data/race-condition-prevention) for concurrent safety. If the singleton must hold state, make it thread-safe (use locks or atomic operations) and document thread-safety guarantees.
- **Avoid singletons for business logic**: a `UserService` should not be a singleton. Business rules change per request (different users, different contexts). Reserve singletons for infrastructure: connection pools, caches, loggers, configuration readers.
- **Implement IDisposable / Closeable**: a singleton often holds resources (connections, threads, file handles). Implement cleanup methods and call them during application shutdown. In Spring or ASP.NET, register disposal hooks with the container.
- **Document thread-safety**: if the singleton is not thread-safe, document it clearly. Consumers must synchronize externally. If it is thread-safe, document which operations are atomic and which are not.

## Common mistakes

- **Testing with mutable singletons**: a test that calls `Config.setDebug(true)` leaks that setting to all subsequent tests. Use a registry with reset capability, or better, avoid singleton configuration objects entirely. Pass configuration as constructor parameters.
- **Lazy initialization in multithreaded code without synchronization**: two threads calling `getInstance()` simultaneously may create two instances before either assigns to the static field. Always synchronize lazy initialization or use a thread-safe initialization-on-demand holder.
- **Singletons holding request-scoped state**: a singleton cache that stores per-user data is a memory leak. Use request-scoped or session-scoped objects for user-specific state. Singletons should hold only application-scoped data.
- **Circular dependencies in singletons**: if `ConnectionPool` is a singleton that depends on `ConfigManager`, and `ConfigManager` is a singleton that depends on `ConnectionPool`, neither can be constructed. DI containers detect this and throw, but manual singletons deadlock during static initialization.

## FAQ

**Q: Is the singleton pattern an anti-pattern?**
A: It is often misused. Singletons for global mutable state make testing and reasoning difficult. But singletons for immutable configuration, connection pools, and thread-safe caches are legitimate and necessary. The anti-pattern is global state, not single instances.

**Q: How do I test code that uses a singleton?**
A: If using a registry, call `reset()` before each test. If using DI, configure the test container with mock singletons. If using `getInstance()`, refactor to accept the dependency via constructor injection. Static `getInstance()` is the hardest to test.

**Q: Can I have multiple singletons of the same class?**
A: The classic pattern forbids this, but registries and DI containers support named or scoped singletons. `services.AddSingleton<IQueue, PriorityQueue>("orders")` and `services.AddSingleton<IQueue, FifoQueue>("events")` both implement `IQueue` as separate singletons.

**Q: What is the difference between singleton and static class?**
A: A singleton is an object — it can implement interfaces, be passed as a parameter, and be mocked. A static class is just a namespace for functions — it cannot be polymorphic, instantiated, or injected. Prefer singleton objects over static classes.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
