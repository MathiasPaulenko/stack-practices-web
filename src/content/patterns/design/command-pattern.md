---
contentType: patterns
slug: command-pattern
title: "Command Pattern"
description: "Encapsulate a request as an object, letting you parameterize clients with queues, logs, and undoable operations. A behavioral design pattern."
metaDescription: "Learn the Command Pattern with practical examples in Python, Java, and JavaScript. Behavioral design pattern for encapsulating requests as objects."
difficulty: intermediate
topics:
  - design
tags:
  - command
  - pattern
  - design-pattern
  - behavioral
  - undo
  - queue
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/observer-pattern
  - /patterns/design/strategy-pattern
  - /recipes/testing/unit-testing
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Command Pattern with practical examples in Python, Java, and JavaScript. Behavioral design pattern for encapsulating requests as objects."
  keywords:
    - command pattern
    - design pattern
    - behavioral pattern
    - undo redo
    - request encapsulation
    - python command
    - java command
    - javascript command
---

# Command Pattern

## Overview

The Command Pattern is a behavioral design pattern that turns a request into a stand-alone object containing all information about the request. This lets you parameterize methods with different requests, delay or queue execution, and support undoable operations.

It is the basis for [undo/redo](/patterns/design/command-pattern-undo) systems, job queues, macro recording, and transactional operations.

## When to Use

Use the Command Pattern when:
- You need to parameterize objects with operations to execute
- You want to queue, schedule, or execute operations remotely
- You need undo/redo functionality
- You want to log changes for replay or audit purposes
- You need transactional behavior (execute all or roll back)

## Solution

### Python

```python
from abc import ABC, abstractmethod

class Command(ABC):
    @abstractmethod
    def execute(self):
        pass

    @abstractmethod
    def undo(self):
        pass

class Light:
    def __init__(self):
        self.is_on = False

    def turn_on(self):
        self.is_on = True
        print("Light is on")

    def turn_off(self):
        self.is_on = False
        print("Light is off")

class TurnOnCommand(Command):
    def __init__(self, light: Light):
        self.light = light

    def execute(self):
        self.light.turn_on()

    def undo(self):
        self.light.turn_off()

# Usage
light = Light()
cmd = TurnOnCommand(light)
cmd.execute()  # Light is on
cmd.undo()     # Light is off
```

### JavaScript

```javascript
class Light {
  constructor() {
    this.isOn = false;
  }
  turnOn() {
    this.isOn = true;
    console.log("Light is on");
  }
  turnOff() {
    this.isOn = false;
    console.log("Light is off");
  }
}

class TurnOnCommand {
  constructor(light) {
    this.light = light;
  }
  execute() {
    this.light.turnOn();
  }
  undo() {
    this.light.turnOff();
  }
}

// Usage
const light = new Light();
const cmd = new TurnOnCommand(light);
cmd.execute(); // Light is on
cmd.undo();    // Light is off
```

### Java

```java
interface Command {
    void execute();
    void undo();
}

class Light {
    boolean isOn = false;
    void turnOn() { isOn = true; System.out.println("Light is on"); }
    void turnOff() { isOn = false; System.out.println("Light is off"); }
}

class TurnOnCommand implements Command {
    private final Light light;
    TurnOnCommand(Light light) { this.light = light; }
    public void execute() { light.turnOn(); }
    public void undo() { light.turnOff(); }
}

// Usage
Light light = new Light();
Command cmd = new TurnOnCommand(light);
cmd.execute(); // Light is on
cmd.undo();    // Light is off
```

## Explanation

The Command Pattern separates action invocation from execution:

- **Command Interface**: Declares `execute()` and optionally `undo()`
- **Concrete Command** (`TurnOnCommand`): Binds a receiver (`Light`) to an action (`turnOn`)
- **Receiver** (`Light`): The object that performs the actual work
- **Invoker**: Calls `execute()` on commands (e.g., a button, scheduler, or remote control)

By encapsulating requests as objects, you gain the ability to queue, log, and reverse operations.

## Variants

| Variant | Use Case | Trade-off |
|---------|----------|-----------|
| **Simple Command** | Direct action with no undo | Easy to implement, limited flexibility |
| **Undoable Command** | Operations that can be reversed | Requires maintaining state for reversal |
| **Macro Command** | Composite of multiple commands | capable, but harder to undo atomically |

## What Works

- **Implement `undo()` for every command** if your system supports undo
- **Keep commands stateless when possible**: Store receiver state, not command state
- **Use a command history** (stack) to support multi-level undo/redo
- **Document side effects**: Commands that affect external systems are harder to undo
- **Consider immutability**: Once configured, a command should not change its target

## Common Mistakes

- **Forgetting undo state**: Commands that cannot be reversed break the undo stack
- **Tight coupling**: Commands that depend on global state instead of a specific receiver
- **Over-engineering**: Using Command for trivial, one-off operations that never need queuing or undo
- **Synchronous assumptions**: Not considering that commands may be executed asynchronously
- **Missing idempotency**: Running the same command twice produces different results

## Frequently Asked Questions

**Q: What is the difference between Command and Strategy?**
A: [Strategy](/patterns/design/strategy-pattern) encapsulates interchangeable algorithms. Command encapsulates a request to perform an action, often with support for undo, queuing, and logging.

**Q: Can Command be used without undo?**
A: Yes. The undo capability is optional. Many systems use Command solely for queuing and decoupling invokers from receivers.

**Q: How do I implement multi-level undo?**
A: Maintain a stack of executed commands. Undo pops the stack and calls `undo()`. See [Command with Undo/Redo](/patterns/design/command-pattern-undo) for a full implementation. Redo pushes the command back and calls `execute()`.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
