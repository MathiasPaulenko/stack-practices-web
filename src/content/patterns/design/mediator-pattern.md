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
  - /patterns/observer-pattern
  - /patterns/state-pattern
  - /patterns/singleton-pattern
  - /patterns/event-bus-pattern
  - /patterns/facade-pattern
  - /guides/vertical-slice-architecture-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
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

The [Mediator](/patterns/design/mediator-pattern-components) Pattern is a behavioral design pattern that defines an object that encapsulates how a set of objects interact. Instead of objects referring to each other directly, they communicate through a central mediator. This reduces the number of direct connections between components and centralizes complex coordination logic.

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

## What Works

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
A: Related but different. [Observer](/patterns/design/observer-pattern) is a one-to-many dependency where subjects notify observers. Mediator centralizes many-to-many communication. An event bus can serve as both.

**Q: What is the difference between Mediator and Facade?**
A: [Facade](/patterns/design/adapter-pattern) provides a simplified interface to a subsystem. Mediator coordinates communication between peer objects. Facade is about simplifying access; Mediator is about decoupling peers.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.


## Advanced Topics

### Scenario: Mediator for Multi-Step Wizard Form

```typescript
// Mediator: coordinate wizard steps without coupling
interface WizardMediator {
  notify(sender: string, event: string, data?: unknown): void;
}

abstract class WizardStep {
  constructor(protected mediator: WizardMediator, public name: string) {}
  abstract render(): string;
  abstract validate(): boolean;
}

class PersonalInfoStep extends WizardStep {
  private data = { name: "", email: "" };
  render() { return `<input name="name" /><input name="email" />`; }
  validate() {
    if (!this.data.name || !this.data.email) return false;
    this.mediator.notify(this.name, "valid", this.data);
    return true;
  }
}

class AddressStep extends WizardStep {
  private data = { street: "", city: "" };
  render() { return `<input name="street" /><input name="city" />`; }
  validate() {
    if (!this.data.street || !this.data.city) return false;
    this.mediator.notify(this.name, "valid", this.data);
    return true;
  }
}

class PaymentStep extends WizardStep {
  private data = { card: "", cvv: "" };
  render() { return `<input name="card" /><input name="cvv" />`; }
  validate() {
    if (this.data.card.length < 16) return false;
    this.mediator.notify(this.name, "valid", this.data);
    return true;
  }
}

// Concrete mediator
class CheckoutWizard implements WizardMediator {
  private steps: WizardStep[] = [];
  private currentStep = 0;
  private collectedData: Record<string, unknown> = {};

  constructor() {
    this.steps = [
      new PersonalInfoStep(this, "personal"),
      new AddressStep(this, "address"),
      new PaymentStep(this, "payment"),
    ];
  }

  notify(sender: string, event: string, data?: unknown) {
    if (event === "valid") {
      this.collectedData[sender] = data;
      this.next();
    }
  }

  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.renderCurrent();
    } else {
      this.complete();
    }
  }

  back() {
    if (this.currentStep > 0) { this.currentStep--; this.renderCurrent(); }
  }

  renderCurrent(): string { return this.steps[this.currentStep].render(); }
  validateCurrent(): boolean { return this.steps[this.currentStep].validate(); }
  complete() { console.log("Wizard complete:", this.collectedData); }
}

// Usage: steps do not know each other
const wizard = new CheckoutWizard();
wizard.renderCurrent(); // Step 1: PersonalInfo
wizard.validateCurrent(); // -> notify -> next()
wizard.renderCurrent(); // Step 2: Address
```

Lessons:
  - Mediator coordinates wizard steps without coupling
  - Each step only knows the mediator, not other steps
  - Adding new step = new class + register in mediator
  - The mediator controls flow: next, back, complete
  - Data is centralized in the mediator
```

### Mediator vs Observer in forms?

Use Mediator in multi-step forms: the mediator controls flow (next, back, validate). Use Observer in reactive forms: the field notifies changes to observers (live validation, field dependencies). Mediator is centralized: the mediator decides. Observer is decentralized: each component reacts. For wizards, Mediator. For reactive forms, Observer.
