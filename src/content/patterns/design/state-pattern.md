---
contentType: patterns
slug: state-pattern
title: "State Pattern"
description: "Allow an object to alter its behavior when its internal state changes. A behavioral design pattern for finite state machines."
metaDescription: "Learn the State Pattern in Python, Java, and JavaScript. Behavioral design pattern for finite state machines and state-dependent behavior."
difficulty: intermediate
topics:
  - design
tags:
  - state
  - pattern
  - design-pattern
  - behavioral
  - finite-state-machine
  - fsm
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/strategy-pattern
  - /patterns/design/command-pattern
  - /patterns/design/observer-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the State Pattern in Python, Java, and JavaScript. Behavioral design pattern for finite state machines and state-dependent behavior."
  keywords:
    - state pattern
    - design pattern
    - behavioral pattern
    - finite state machine
    - python state
    - java state machine
    - javascript state
---

# State Pattern

## Overview

The State Pattern is a behavioral design pattern that lets an object alter its behavior when its internal state changes. Instead of large switch statements, each state is encapsulated in its own class with state-specific behavior.

## When to Use

Use the State Pattern when:
- An object's behavior depends on its state and must change at runtime
- You have large conditional statements that switch behavior based on state
- States have complex transitions with entry/exit actions
- You want to add new states without modifying existing state classes

## Solution

### Python

```python
from abc import ABC, abstractmethod

class OrderState(ABC):
    @abstractmethod
    def pay(self, order):
        pass

    @abstractmethod
    def ship(self, order):
        pass

    @abstractmethod
    def cancel(self, order):
        pass

class PendingState(OrderState):
    def pay(self, order):
        print("Processing payment...")
        order.transition_to(PaidState())
    def ship(self, order):
        print("Cannot ship: payment pending")
    def cancel(self, order):
        print("Order cancelled")
        order.transition_to(CancelledState())

class PaidState(OrderState):
    def pay(self, order):
        print("Already paid")
    def ship(self, order):
        print("Shipping order...")
        order.transition_to(ShippedState())
    def cancel(self, order):
        print("Issuing refund...")
        order.transition_to(CancelledState())

class ShippedState(OrderState):
    def pay(self, order):
        print("Already paid")
    def ship(self, order):
        print("Already shipped")
    def cancel(self, order):
        print("Cannot cancel: already shipped")

class CancelledState(OrderState):
    def pay(self, order):
        print("Cannot pay: order cancelled")
    def ship(self, order):
        print("Cannot ship: order cancelled")
    def cancel(self, order):
        print("Already cancelled")

class Order:
    def __init__(self):
        self._state = PendingState()

    def transition_to(self, state):
        self._state = state

    def pay(self):
        self._state.pay(self)

    def ship(self):
        self._state.ship(self)

    def cancel(self):
        self._state.cancel(self)

# Usage
order = Order()
order.pay()
order.ship()
order.cancel()  # Cannot cancel: already shipped
```

### JavaScript

```javascript
class Order {
  constructor() { this.state = new PendingState(this); }
  transitionTo(state) { this.state = state; }
  pay() { this.state.pay(); }
  ship() { this.state.ship(); }
  cancel() { this.state.cancel(); }
}

class PendingState {
  constructor(order) { this.order = order; }
  pay() {
    console.log("Processing payment...");
    this.order.transitionTo(new PaidState(this.order));
  }
  ship() { console.log("Cannot ship: payment pending"); }
  cancel() {
    console.log("Order cancelled");
    this.order.transitionTo(new CancelledState(this.order));
  }
}

class PaidState {
  constructor(order) { this.order = order; }
  pay() { console.log("Already paid"); }
  ship() {
    console.log("Shipping order...");
    this.order.transitionTo(new ShippedState(this.order));
  }
  cancel() {
    console.log("Issuing refund...");
    this.order.transitionTo(new CancelledState(this.order));
  }
}

class ShippedState {
  constructor(order) { this.order = order; }
  pay() { console.log("Already paid"); }
  ship() { console.log("Already shipped"); }
  cancel() { console.log("Cannot cancel: already shipped"); }
}

class CancelledState {
  constructor(order) { this.order = order; }
  pay() { console.log("Cannot pay: order cancelled"); }
  ship() { console.log("Cannot ship: order cancelled"); }
  cancel() { console.log("Already cancelled"); }
}

const order = new Order();
order.pay();
order.ship();
order.cancel(); // Cannot cancel: already shipped
```

### Java

```java
interface OrderState {
    void pay(Order order);
    void ship(Order order);
    void cancel(Order order);
}

class PendingState implements OrderState {
    public void pay(Order order) {
        System.out.println("Processing payment...");
        order.transitionTo(new PaidState());
    }
    public void ship(Order order) {
        System.out.println("Cannot ship: payment pending");
    }
    public void cancel(Order order) {
        System.out.println("Order cancelled");
        order.transitionTo(new CancelledState());
    }
}

class PaidState implements OrderState {
    public void pay(Order order) {
        System.out.println("Already paid");
    }
    public void ship(Order order) {
        System.out.println("Shipping order...");
        order.transitionTo(new ShippedState());
    }
    public void cancel(Order order) {
        System.out.println("Issuing refund...");
        order.transitionTo(new CancelledState());
    }
}

class ShippedState implements OrderState {
    public void pay(Order order) {
        System.out.println("Already paid");
    }
    public void ship(Order order) {
        System.out.println("Already shipped");
    }
    public void cancel(Order order) {
        System.out.println("Cannot cancel: already shipped");
    }
}

class CancelledState implements OrderState {
    public void pay(Order order) {
        System.out.println("Cannot pay: order cancelled");
    }
    public void ship(Order order) {
        System.out.println("Cannot ship: order cancelled");
    }
    public void cancel(Order order) {
        System.out.println("Already cancelled");
    }
}

class Order {
    private OrderState state = new PendingState();

    public void transitionTo(OrderState state) {
        this.state = state;
    }

    public void pay() { state.pay(this); }
    public void ship() { state.ship(this); }
    public void cancel() { state.cancel(this); }
}

// Usage
Order order = new Order();
order.pay();
order.ship();
order.cancel(); // Cannot cancel: already shipped
```

## Explanation

The State Pattern involves two roles:

- **Context** (`Order`): Maintains a reference to the current state and delegates behavior to it
- **State Interface** (`OrderState`): Defines the contract for state-specific behavior
- **Concrete States** (`PendingState`, `PaidState`, etc.): Implement behavior specific to each state and handle transitions

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Simple State Machine** | States handle transitions | Small number of states |
| **Hierarchical State Machine** | States can have substates | Complex nested behavior |
| **State Table** | Transitions stored in a lookup table | Many states with predictable transitions |
| **Pushdown Automaton** | Stack-based state history | Undo/reversible state transitions |

## Best Practices

- **Delegate all state-dependent behavior** to state objects, keeping the context thin
- **Make state objects immutable** or recreate them on transition to avoid shared state bugs
- **Use enums for well-defined states** in languages that support them (Java, TypeScript)
- **Add entry/exit hooks** when transitions need side effects (logging, analytics)
- **Consider a transition table** when you have many states and transitions become hard to manage

## Common Mistakes

- Duplicating transition logic across multiple state classes instead of centralizing it
- Allowing the context to modify state directly instead of delegating to the current state
- Forgetting to handle invalid transitions gracefully, leading to runtime errors
- Creating circular state transitions that can cause infinite loops
- Mixing state logic with business logic, making the pattern hard to test

## Frequently Asked Questions

**Q: What is the difference between State and Strategy?**
A: Both encapsulate behavior in interchangeable objects. State is about changing behavior based on internal state transitions. Strategy is about selecting an algorithm from the outside. The intent differs: State manages lifecycle, Strategy provides options.

**Q: Should states know about each other?**
A: In the classic implementation, states trigger transitions to other states. An alternative is to let the context or a transition table manage transitions, keeping states decoupled.

**Q: Can I use enums instead of classes for simple state machines?**
A: Yes. For simple cases, an enum with a switch statement is sufficient. Use the full State Pattern when states have complex behavior or you expect frequent additions.
