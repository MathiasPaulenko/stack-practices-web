---
contentType: patterns
slug: mediator-pattern
title: "Mediator Pattern"
description: "Define an object that encapsulates how a set of objects interact. A behavioral design pattern for reducing chaotic dependencies."
metaDescription: "Learn the Mediator Pattern in Python, Java, and JavaScript. Behavioral design pattern for reducing coupling between components."
difficulty: intermediate
topics:
  - design
tags:
  - mediator
  - pattern
  - design-pattern
  - behavioral
  - decoupling
  - coordination
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/observer-pattern
  - /patterns/design/state-pattern
  - /patterns/design/singleton-pattern
lastUpdated: "2026-06-12"
author: "StackPractices"
seo:
  metaDescription: "Learn the Mediator Pattern in Python, Java, and JavaScript. Behavioral design pattern for reducing coupling between components."
  keywords:
    - mediator pattern
    - design pattern
    - behavioral pattern
    - decoupling
    - component coordination
    - python mediator
    - java mediator
    - javascript mediator
---

# Mediator Pattern

## Overview

The Mediator Pattern is a behavioral design pattern that defines an object that encapsulates how a set of objects interact. Instead of objects referring to each other directly, they communicate through a central mediator. This reduces the number of direct connections between components and centralizes complex coordination logic.

## When to Use

Use the Mediator Pattern when:
- You have many objects that need to communicate in complex ways
- The dependencies between objects create a tangled mess (spaghetti code)
- You want to centralize complex coordination logic
- Reusing an individual component is hard because it depends on many others
- A change in one component forces changes in many others

## Solution

### Python

```python
from abc import ABC, abstractmethod

class ChatMediator(ABC):
    @abstractmethod
    def send_message(self, message: str, sender):
        pass

    @abstractmethod
    def add_user(self, user):
        pass

class ChatRoom(ChatMediator):
    def __init__(self):
        self.users = []

    def add_user(self, user):
        self.users.append(user)

    def send_message(self, message: str, sender):
        for user in self.users:
            if user != sender:
                user.receive(message, sender.name)

class User:
    def __init__(self, name: str, mediator: ChatMediator):
        self.name = name
        self.mediator = mediator
        mediator.add_user(self)

    def send(self, message: str):
        print(f"{self.name} sends: {message}")
        self.mediator.send_message(message, self)

    def receive(self, message: str, from_name: str):
        print(f"{self.name} receives from {from_name}: {message}")

# Usage
room = ChatRoom()
alice = User("Alice", room)
bob = User("Bob", room)

alice.send("Hello everyone!")
```

### JavaScript

```javascript
class ChatRoom {
  constructor() {
    this.users = [];
  }

  addUser(user) {
    this.users.push(user);
  }

  sendMessage(message, sender) {
    for (const user of this.users) {
      if (user !== sender) {
        user.receive(message, sender.name);
      }
    }
  }
}

class User {
  constructor(name, mediator) {
    this.name = name;
    this.mediator = mediator;
    mediator.addUser(this);
  }

  send(message) {
    console.log(`${this.name} sends: ${message}`);
    this.mediator.sendMessage(message, this);
  }

  receive(message, fromName) {
    console.log(`${this.name} receives from ${fromName}: ${message}`);
  }
}

// Usage
const room = new ChatRoom();
const alice = new User("Alice", room);
const bob = new User("Bob", room);

alice.send("Hello everyone!");
```

### Java

```java
import java.util.ArrayList;
import java.util.List;

public interface ChatMediator {
    void sendMessage(String message, User sender);
    void addUser(User user);
}

public class ChatRoom implements ChatMediator {
    private final List<User> users = new ArrayList<>();

    public void addUser(User user) {
        users.add(user);
    }

    public void sendMessage(String message, User sender) {
        for (User user : users) {
            if (user != sender) {
                user.receive(message, sender.getName());
            }
        }
    }
}

public class User {
    private final String name;
    private final ChatMediator mediator;

    public User(String name, ChatMediator mediator) {
        this.name = name;
        this.mediator = mediator;
        mediator.addUser(this);
    }

    public String getName() { return name; }

    public void send(String message) {
        System.out.println(name + " sends: " + message);
        mediator.sendMessage(message, this);
    }

    public void receive(String message, String fromName) {
        System.out.println(name + " receives from " + fromName + ": " + message);
    }
}

// Usage
ChatRoom room = new ChatRoom();
User alice = new User("Alice", room);
User bob = new User("Bob", room);
alice.send("Hello everyone!");
```

## Explanation

The Mediator Pattern has two roles:

- **Mediator** (`ChatRoom`): Defines the interface for communication between components
- **Colleagues** (`User`): Objects that communicate through the mediator instead of directly

Without the mediator, each user would need a reference to every other user. With it, each user only needs a reference to the mediator.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Event Bus** | Decoupled pub/sub via a central channel | Large systems with many publishers/subscribers |
| **Command Bus** | Commands routed through a central handler | CQRS, task dispatching |
| **Dialog Director** | UI widgets coordinated by a dialog controller | Form validation, wizard flows |

## Best Practices

- **Keep the mediator focused** on coordination, not business logic
- **Avoid turning the mediator into a god object** — if it grows too large, split it
- **Document which events the mediator handles** so colleagues know what to expect
- **Consider an event bus** for very large systems where a single mediator would become a bottleneck
- **Make the mediator observable** so external systems can monitor interactions

## Common Mistakes

- Putting too much logic into the mediator, creating a "god class" that is hard to maintain
- Using a mediator when simple direct method calls would suffice (over-engineering)
- Making the mediator a bottleneck by centralizing all communication in a synchronous blocking fashion
- Not documenting the mediator's role, making it hard to understand why components don't communicate directly
- Allowing the mediator to leak colleague details to other colleagues

## Frequently Asked Questions

**Q: Is Mediator the same as Observer?**
A: Related but different. Observer is a one-to-many dependency where subjects notify observers. Mediator centralizes many-to-many communication. An event bus can serve as both.

**Q: What is the difference between Mediator and Facade?**
A: Facade provides a simplified interface to a subsystem. Mediator coordinates communication between peer objects. Facade is about simplifying access; Mediator is about decoupling peers.
