---
contentType: patterns
slug: observer-pattern
title: "Observer Pattern"
description: "Define a subscription mechanism to notify multiple objects about events. A behavioral design pattern for event-driven communication."
metaDescription: "Learn the Observer Pattern with practical examples in Python, Java, and JavaScript. Behavioral design pattern for event-driven systems."
difficulty: beginner
topics:
  - design
tags:
  - observer
  - pattern
  - design-pattern
  - behavioral
  - event-driven
  - python
  - javascript
  - java
relatedResources:
  - /recipes/api/call-rest-api
  - /patterns/design/singleton-pattern
  - /patterns/design/strategy-pattern
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Observer Pattern with practical examples in Python, Java, and JavaScript. Behavioral design pattern for event-driven systems."
  keywords:
    - observer pattern
    - design pattern
    - behavioral pattern
    - event driven
    - pub sub
    - python observer
    - java observer
    - javascript observer
---

# Observer Pattern

## Overview

The Observer Pattern is a behavioral design pattern that defines a subscription mechanism to notify multiple objects about events happening to the object they are observing. It establishes a one-to-many dependency between objects.

It is the foundation of event-driven architectures, reactive programming, and the Model-View architecture in UI frameworks.

## When to Use

Use the Observer Pattern when:
- Changes to one object require updating an unknown number of dependent objects. See [Mediator Pattern](/patterns/design/mediator-pattern) for centralized routing.
- You need a publish-subscribe communication model. See [CQRS Pattern](/recipes/cqrs-pattern-recipe) for event-driven architectures.
- An object should notify others without knowing who they are
- You want loose coupling between event producers and consumers
- Building reactive UI components or real-time data feeds. See [API REST](/recipes/api/call-rest-api) for real-time data fetching.

## Solution

### Python

```python
class Subject:
    def __init__(self):
        self._observers = []

    def attach(self, observer):
        self._observers.append(observer)

    def notify(self, data):
        for observer in self._observers:
            observer.update(data)

class Observer:
    def update(self, data):
        print(f"Received: {data}")

# Usage
subject = Subject()
subject.attach(Observer())
subject.attach(Observer())
subject.notify("Hello observers!")
```

### JavaScript

```javascript
class Subject {
  constructor() {
    this.observers = [];
  }

  subscribe(fn) {
    this.observers.push(fn);
  }

  notify(data) {
    this.observers.forEach((fn) => fn(data));
  }
}

// Usage
const subject = new Subject();
subject.subscribe((data) => console.log("A:", data));
subject.subscribe((data) => console.log("B:", data));
subject.notify("Hello observers!");
```

### Java

```java
import java.util.ArrayList;
import java.util.List;

interface Observer {
    void update(String data);
}

class Subject {
    private final List<Observer> observers = new ArrayList<>();

    void attach(Observer o) {
        observers.add(o);
    }

    void notifyObservers(String data) {
        for (Observer o : observers) {
            o.update(data);
        }
    }
}

// Usage
Subject subject = new Subject();
subject.attach(data -> System.out.println("Received: " + data));
subject.notifyObservers("Hello observers!");
```

## Explanation

The Observer Pattern consists of two core roles:

- **Subject (Publisher)**: Maintains a list of observers and sends notifications
- **Observer (Subscriber)**: Defines an interface for objects that should be notified of changes

When the Subject's state changes, it iterates over its observers and calls their `update` method. Observers can subscribe or unsubscribe dynamically without the Subject knowing concrete classes.

## Variants

| Variant | Use Case | Trade-off |
|---------|----------|-----------|
| **Push model** | Subject sends full data to observers | Simple, but may send unnecessary data |
| **Pull model** | Subject notifies; observers query for details | More efficient, but adds round-trips |
| **Event bus** | Central dispatcher decouples subjects and observers | More flexible, adds indirection |

## What Works

- **Unsubscribe observers** when they are destroyed to prevent memory leaks
- **Avoid circular updates** where observers trigger changes back to the subject
- **Use weak references** in languages that support them (e.g., Java) for automatic cleanup
- **Keep notification logic simple** and avoid heavy computations in the notify loop
- **Document event payloads** so observers know what data to expect

## Common Mistakes

- **Memory leaks**: Forgetting to detach observers when they are no longer needed
- **Unexpected update order**: Observers may run in an undefined order; do not rely on it
- **Infinite loops**: An observer that modifies the subject can trigger cascading updates
- **Tight coupling**: Giving observers access to the full subject instead of just the data they need
- **Synchronous blocking**: Running slow observers in the main notification thread

## Frequently Asked Questions

**Q: What is the difference between Observer and Pub/Sub?**
A: Observer is a direct subject-observer relationship. Pub/Sub adds an event broker ([Mediator](/patterns/design/mediator-pattern)) that decouples publishers from subscribers completely.

**Q: Is the Observer Pattern still relevant with modern reactive frameworks?**
A: Yes. React hooks, RxJS, and Vue's reactivity system are all built on Observer concepts. For singleton event brokers, see [Singleton](/patterns/design/singleton-pattern).

**Q: How do I prevent memory leaks with observers?**
A: Always provide an unsubscribe mechanism and call it in cleanup handlers or destructors.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.


## Advanced Topics

### Scenario: Event System with Observer Pattern

```typescript
// Observer pattern for notification system
interface Observer {
  update(event: string, data: unknown): void;
}

class EventEmitter {
  private observers: Map<string, Set<Observer>> = new Map();

  subscribe(event: string, observer: Observer): void {
    if (!this.observers.has(event)) {
      this.observers.set(event, new Set());
    }
    this.observers.get(event)!.add(observer);
  }

  unsubscribe(event: string, observer: Observer): void {
    this.observers.get(event)?.delete(observer);
  }

  emit(event: string, data: unknown): void {
    this.observers.get(event)?.forEach(obs => {
      try {
        obs.update(event, data);
      } catch (err) {
        console.error(`Observer error: ${err}`);
      }
    });
  }
}

// Usage: e-commerce system
const emitter = new EventEmitter();

// Observers
class EmailNotifier implements Observer {
  update(event: string, data: unknown): void {
    if (event === "order.created") {
      sendEmail((data as Order).userEmail, "Order confirmed");
    }
  }
}

class InventoryUpdater implements Observer {
  update(event: string, data: unknown): void {
    if (event === "order.created") {
      decrementStock((data as Order).items);
    }
  }
}

class AnalyticsTracker implements Observer {
  update(event: string, data: unknown): void {
    trackEvent(event, data);
  }
}

// Subscribe
emitter.subscribe("order.created", new EmailNotifier());
emitter.subscribe("order.created", new InventoryUpdater());
emitter.subscribe("order.created", new AnalyticsTracker());

// Emit
emitter.emit("order.created", { id: "123", userEmail: "user@example.com", items: [...] });
// Result: email sent, stock updated, analytics tracked
```

Lessons:
  - Observer decouples emitter from receivers
  - Each observer is independent: failure in one does not affect others
  - Use Set to avoid duplicates
  - Try-catch in emit: a broken observer does not break the event
  - For distributed systems, use a message broker (RabbitMQ, Kafka)
  - Memory leak: unsubscribe when the observer is no longer needed
```

### How do I prevent memory leaks with observers?

Always call unsubscribe when the observer is no longer needed. In React, use useEffect cleanup: subscribe on mount, unsubscribe on unmount. In Node.js, use WeakRef or clean up explicitly on shutdown. If observers grow without limit, use a Map with TTL or a max observers per event.


























End of document. Review and update quarterly.