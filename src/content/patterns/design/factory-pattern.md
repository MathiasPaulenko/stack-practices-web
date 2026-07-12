---





contentType: patterns
slug: factory-pattern
title: "Factory Pattern"
description: "Create objects without specifying the exact class to instantiate. A creational design pattern for flexible object creation."
metaDescription: "Learn the Factory Pattern with practical examples in Python, Java, and JavaScript. Creational design pattern for flexible object creation."
difficulty: beginner
topics:
  - design
tags:
  - factory
  - pattern
  - design-pattern
  - creational
  - python
  - javascript
  - java
relatedResources:
  - /recipes/call-rest-api
  - /recipes/parse-json
  - /guides/rest-api-design-guide
  - /patterns/abstract-factory-pattern
  - /patterns/builder-pattern
  - /patterns/dependency-injection-pattern
  - /patterns/dependency-injection-typescript
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Factory Pattern with practical examples in Python, Java, and JavaScript. Creational design pattern for flexible object creation."
  keywords:
    - factory pattern
    - design pattern
    - creational pattern
    - object creation
    - python factory
    - java factory
    - javascript factory





---

# Factory Pattern

## Overview

The Factory Pattern is a creational design pattern that provides an interface for creating objects without specifying their exact classes. Instead of calling a constructor directly, you call a factory method that returns a new instance based on input parameters.

This pattern is essential when the creation logic is complex, needs to be centralized, or must vary at runtime.

## When to Use

Use the Factory Pattern when:
- The exact type of object to create is determined at runtime
- Object creation involves complex setup or configuration
- You want to decouple object creation from usage
- You need to support multiple implementations of an interface
- Testing requires easy substitution of mock objects

## Solution

### Python

```python
from abc import ABC, abstractmethod

class Notification(ABC):
    @abstractmethod
    def send(self, message: str) -> str:
        pass

class EmailNotification(Notification):
    def send(self, message: str) -> str:
        return f"Sending email: {message}"

class SmsNotification(Notification):
    def send(self, message: str) -> str:
        return f"Sending SMS: {message}"

class NotificationFactory:
    @staticmethod
    def create(channel: str) -> Notification:
        if channel == "email":
            return EmailNotification()
        if channel == "sms":
            return SmsNotification()
        raise ValueError(f"Unknown channel: {channel}")

# Usage
notifier = NotificationFactory.create("email")
print(notifier.send("Hello!"))  # Sending email: Hello!
```

### JavaScript

```javascript
class Notification {
  send(message) {
    throw new Error("Not implemented");
  }
}

class EmailNotification extends Notification {
  send(message) {
    return `Sending email: ${message}`;
  }
}

class SmsNotification extends Notification {
  send(message) {
    return `Sending SMS: ${message}`;
  }
}

class NotificationFactory {
  static create(channel) {
    switch (channel) {
      case "email": return new EmailNotification();
      case "sms": return new SmsNotification();
      default: throw new Error(`Unknown channel: ${channel}`);
    }
  }
}

const notifier = NotificationFactory.create("email");
console.log(notifier.send("Hello!")); // Sending email: Hello!
```

### Java

```java
public interface Notification {
    String send(String message);
}

public class EmailNotification implements Notification {
    public String send(String message) {
        return "Sending email: " + message;
    }
}

public class SmsNotification implements Notification {
    public String send(String message) {
        return "Sending SMS: " + message;
    }
}

public class NotificationFactory {
    public static Notification create(String channel) {
        switch (channel) {
            case "email": return new EmailNotification();
            case "sms": return new SmsNotification();
            default: throw new IllegalArgumentException("Unknown: " + channel);
        }
    }
}

// Usage
Notification notifier = NotificationFactory.create("email");
System.out.println(notifier.send("Hello!"));
```

## Explanation

The Factory Pattern decouples object creation from usage through three roles:

- **Product Interface** (`Notification`): Defines the contract all created objects must follow
- **Concrete Products** (`EmailNotification`, `SmsNotification`): The actual implementations
- **Factory** (`NotificationFactory`): Centralizes creation logic and returns the correct instance

This structure lets you add new notification channels (e.g., Push, Slack) without modifying the code that uses notifications.

## Variants

| Variant | Use Case | Trade-off |
|---------|----------|-----------|
| **Simple Factory** | Single method with conditional logic | Easy to start, hard to scale |
| **Factory Method** | Subclasses override creation | More flexible, more classes |
| **[Abstract Factory](/patterns/design/abstract-factory-pattern)** | Families of related objects | Complex, but handles product families |

## What Works

- **Use enums for channel/types** instead of raw strings to avoid typos
- **Throw explicit errors** for unsupported types instead of returning null
- **Keep the factory stateless** when possible for thread safety
- **Register types dynamically** in large systems (e.g., dependency injection containers)
- **Prefer interfaces over inheritance** for the product contract

## Common Mistakes

- **Over-engineering**: Using Abstract Factory when Simple Factory is enough
- **String-based dispatch**: Typo-prone and hard to refactor; use enums or constants
- **Stateful factories**: Can cause thread-safety issues in multi-threaded environments
- **Null returns**: Returning `null` instead of throwing makes bugs harder to trace
- **Tight coupling**: Factory depending on concrete classes instead of abstractions

## Frequently Asked Questions

**Q: What is the difference between Factory Method and Abstract Factory?**
A: [Factory Method](/patterns/design/factory-pattern) lets subclasses decide which class to instantiate. [Abstract Factory](/patterns/design/abstract-factory-pattern) creates families of related objects (e.g., UI components for Windows vs. Mac).

**Q: Is the Factory Pattern the same as dependency injection?**
A: No. [DI](/patterns/design/dependency-injection-pattern) is about who provides the dependency; Factory is about how the dependency is created. They often work together.

**Q: When should I avoid the Factory Pattern?**
A: Avoid it when object creation is trivial (a simple `new Class()`) and there is only one implementation.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.


## Advanced Topics

### Scenario: Factory for Multi-DB Connections

```typescript
// Factory pattern: create objects without exposing creation logic
interface DatabaseConnection {
  connect(): Promise<void>;
  query(sql: string): Promise<unknown[]>;
  close(): Promise<void>;
}

class PostgreSQLConnection implements DatabaseConnection {
  constructor(private config: PGConfig) {}
  async connect() { /* pg.connect() */ }
  async query(sql: string) { /* pg.query(sql) */ return []; }
  async close() { /* pg.end() */ }
}

class MySQLConnection implements DatabaseConnection {
  constructor(private config: MySQLConfig) {}
  async connect() { /* mysql.connect() */ }
  async query(sql: string) { /* mysql.query(sql) */ return []; }
  async close() { /* mysql.end() */ }
}

class MongoDBConnection implements DatabaseConnection {
  constructor(private config: MongoConfig) {}
  async connect() { /* mongo.connect() */ }
  async query(sql: string) { /* mongo.find() */ return []; }
  async close() { /* mongo.close() */ }
}

// Factory
class DatabaseFactory {
  static create(type: "postgres" | "mysql" | "mongo", config: unknown): DatabaseConnection {
    switch (type) {
      case "postgres": return new PostgreSQLConnection(config as PGConfig);
      case "mysql": return new MySQLConnection(config as MySQLConfig);
      case "mongo": return new MongoDBConnection(config as MongoConfig);
      default: throw new Error(`Unknown DB type: ${type}`);
    }
  }
}

// Usage: client does not know which DB is used
const db = DatabaseFactory.create("postgres", {
  host: "localhost",
  port: 5432,
  database: "myapp",
});
await db.connect();
const results = await db.query("SELECT * FROM users");
await db.close();

// Factory with registry (plugin pattern)
class PluginDatabaseFactory {
  private static registry = new Map<string, (config: unknown) => DatabaseConnection>();

  static register(type: string, creator: (config: unknown) => DatabaseConnection) {
    this.registry.set(type, creator);
  }

  static create(type: string, config: unknown): DatabaseConnection {
    const creator = this.registry.get(type);
    if (!creator) throw new Error(`Unknown DB type: ${type}`);
    return creator(config);
  }
}

// Register plugins
PluginDatabaseFactory.register("postgres", (cfg) => new PostgreSQLConnection(cfg as PGConfig));
PluginDatabaseFactory.register("mysql", (cfg) => new MySQLConnection(cfg as MySQLConfig));
```

Lessons:
  - Factory encapsulates creation: client does not know concrete class
  - Adding new DB type only requires modifying the factory
  - Plugin factory allows registering types without modifying factory
  - Factory vs Abstract Factory: one class vs family of products
  - Factory vs DI: factory is explicit, DI is automatic
```

### Factory vs Abstract Factory: which do I use?

Use Factory when you need to create one type of object with variants (e.g: DatabaseConnection with postgres/mysql/mongo). Use Abstract Factory when you need to create a family of related objects (e.g: UI toolkit that creates Button + Input + Modal, all from the same theme). Factory has one create method; Abstract Factory has multiple create methods for related products.


End of document. Review and update quarterly.