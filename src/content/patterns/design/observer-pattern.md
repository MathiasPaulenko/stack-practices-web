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
author: "StackPractices"
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
- Changes to one object require updating an unknown number of dependent objects
- You need a publish-subscribe communication model
- An object should notify others without knowing who they are
- You want loose coupling between event producers and consumers
- Building reactive UI components or real-time data feeds

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

## Best Practices

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
A: Observer is a direct subject-observer relationship. Pub/Sub adds an event broker (event bus) that decouples publishers from subscribers completely.

**Q: Is the Observer Pattern still relevant with modern reactive frameworks?**
A: Yes. React hooks, RxJS, and Vue's reactivity system are all built on Observer concepts.

**Q: How do I prevent memory leaks with observers?**
A: Always provide an unsubscribe mechanism and call it in cleanup handlers or destructors.
