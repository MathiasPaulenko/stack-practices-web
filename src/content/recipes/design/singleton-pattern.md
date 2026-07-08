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


### Bill Pugh Holder Idiom (Java)

```java
public class ConfigManager {
    private ConfigManager() {
        // Load config from environment or file
    }

    // Inner static class — loaded only when getInstance() is called
    private static class Holder {
        static final ConfigManager INSTANCE = new ConfigManager();
    }

    public static ConfigManager getInstance() {
        return Holder.INSTANCE;
    }

    public String get(String key) {
        // ...
        return "";
    }
}
```

The JVM guarantees that a class is initialized exactly once, and the holder class is not loaded until `getInstance()` is first called. This gives lazy initialization with no synchronization overhead — the JVM handles thread safety.

### Enum Singleton (Java)

```java
public enum DatabaseType {
    INSTANCE;

    private final Map<String, String> properties;

    DatabaseType() {
        this.properties = loadProperties();
    }

    public String getProperty(String key) {
        return properties.get(key);
    }

    private Map<String, String> loadProperties() {
        // Load from file or env
        return Map.of("driver", "postgresql");
    }
}

// Usage
String driver = DatabaseType.INSTANCE.getProperty("driver");
```

Enum singletons are guaranteed by the JVM to be single instances, even across serialization and reflection. This is the most robust Java singleton form.

### Testing Singleton Code

```typescript
// Testable singleton via registry — reset between tests
describe('OrderService with singleton pool', () => {
  afterEach(() => {
    SingletonRegistry.clear();
  });

  it('uses shared connection pool', () => {
    const pool = SingletonRegistry.get('pool', () => new InMemoryConnectionPool());
    const service = new OrderService(pool);

    service.process({ id: '1', items: [] });

    expect(pool.getConnectionsUsed()).toBe(1);
  });

  it('isolates state between tests', () => {
    // Registry was cleared — new pool instance
    const pool = SingletonRegistry.get('pool', () => new InMemoryConnectionPool());
    expect(pool.getConnectionsUsed()).toBe(0);
  });
});
```

```java
// Java — test with DI container
@Test
void testOrderServiceWithMockPool() {
    var container = new DIContainer();
    container.bind(IDatabaseConnectionPool.class, MockConnectionPool.class, Scope.SINGLETON);

    var service = container.resolve(OrderService.class);
    service.process(new Order("1", List.of()));

    var mockPool = container.resolve(IDatabaseConnectionPool.class);
    verify(mockPool, times(1)).getConnection();
}
```

## Additional Best Practices

1. **Use scoped singletons in web frameworks.** Request-scoped singletons in ASP.NET or Spring are not true singletons — they exist once per request:

```csharp
// One instance per HTTP request, not per app
builder.Services.AddScoped<IRequestContext, RequestContext>();
```

2. **Avoid reflection-based singleton breaking.** In Java, reflection can access private constructors. Enum singletons prevent this. For class-based singletons, add a guard in the constructor:

```java
private DatabaseConnectionPool() {
    if (instance != null) {
        throw new IllegalStateException("Use getInstance()");
    }
    // ...
}
```

3. **Prefer monostate over singleton for configuration.** All instances share state but the class can be instantiated freely:

```typescript
class AppConfig {
  private static _values: Record<string, string> = {};

  constructor() {}

  get(key: string): string {
    return AppConfig._values[key];
  }

  set(key: string, value: string): void {
    AppConfig._values[key] = value;
  }
}
```

## Additional Common Mistakes

1. **Using singleton to share state between microservices.** Each microservice has its own JVM/process — a singleton in one is not visible to another. Use a distributed cache (Redis) or shared database instead.

2. **Singleton with mutable collections without synchronization.** A singleton holding a `HashMap` that multiple threads read and write will corrupt. Use `ConcurrentHashMap` or synchronize access:

```java
// Bad: race condition on HashMap
private Map<String, User> cache = new HashMap<>();

// Good: thread-safe
private Map<String, User> cache = new ConcurrentHashMap<>();
```

3. **Forgetting to close singleton resources on shutdown.** Connection pools and thread executors leak if not closed:

```java
// Runtime shutdown hook
Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    DatabaseConnectionPool.getInstance().close();
}));
```

## Additional FAQ

### How do I handle serialization with singletons?

In Java, implement `readResolve()` to return the existing instance instead of creating a new one during deserialization:

```java
protected Object readResolve() {
    return getInstance();
}
```

Enum singletons handle this automatically — the JVM ensures only one enum constant exists.

### What is the difference between monostate and singleton?

A singleton enforces one instance. A monostate allows multiple instances but all share the same static state. Monostate is more flexible — you can create instances freely, pass them as parameters, and mock them in tests. Use monostate when you want shared state without restricting instantiation.

### Is this solution production-ready?

Yes. The Java double-checked locking, Bill Pugh holder, and enum singleton patterns are all production-proven. The TypeScript registry pattern is used in production codebases. The C# DI container approach is the standard in ASP.NET applications.

### What are the performance characteristics?

Eager static initialization has zero runtime cost after class load. Double-checked locking has one volatile read on the fast path. Bill Pugh holder has zero overhead — the JVM handles it. Registry lookups are O(1) Map operations. DI container resolution involves a dictionary lookup, typically nanoseconds.

### How do I debug issues with this approach?

If a singleton appears to have multiple instances, check: (1) classloader hierarchy in Java EE/application servers, (2) serialization creating new instances, (3) reflection bypassing the private constructor. Add logging in the constructor to trace creation. Use `System.identityHashCode(instance)` to verify object identity.
