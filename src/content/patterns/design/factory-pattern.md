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
  - /recipes/api/call-rest-api
  - /recipes/data/parse-json
  - /guides/api/rest-api-design-guide
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
| **Abstract Factory** | Families of related objects | Complex, but handles product families |

## Best Practices

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
A: Factory Method lets subclasses decide which class to instantiate. Abstract Factory creates families of related objects (e.g., UI components for Windows vs. Mac).

**Q: Is the Factory Pattern the same as dependency injection?**
A: No. DI is about who provides the dependency; Factory is about how the dependency is created. They often work together.

**Q: When should I avoid the Factory Pattern?**
A: Avoid it when object creation is trivial (a simple `new Class()`) and there is only one implementation.
