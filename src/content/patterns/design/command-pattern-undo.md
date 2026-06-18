---
contentType: patterns
slug: command-pattern-undo
title: "Command Pattern with Undo/Redo in TypeScript"
description: "Implement the Command pattern to encapsulate requests as objects, enabling undo/redo operations, request queuing, and operation logging"
metaDescription: "Command pattern with undo/redo in TypeScript. Encapsulate requests as objects for operation queuing, logging, and reversible actions in interactive applications."
difficulty: intermediate
topics:
  - design
tags:
  - command
  - behavioral-patterns
  - typescript
  - design-pattern
relatedResources:
  - /patterns/design/memento-pattern-state
  - /patterns/design/observer-pattern-events
  - /guides/clean-code-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Command pattern with undo/redo in TypeScript. Encapsulate requests as objects for operation queuing, logging, and reversible actions in interactive applications."
  keywords:
    - command pattern
    - undo redo
    - typescript
    - behavioral patterns
    - operation queue
---

# Command Pattern with Undo/Redo in TypeScript

The Command pattern turns a request into a stand-alone object containing all information about the request. This decoupling allows you to parameterize methods with different requests, delay or queue execution, and implement undo/redo operations — essential for interactive applications like editors, drawing tools, and form builders.

## When to Use This

- You need undo/redo functionality in a user interface
- Operations must be queued, logged, or executed remotely
- The invoker should not know which receiver handles a request

## Problem

A text editor directly calls methods on a document object. Adding undo requires exposing internal state, and adding macros requires duplicating logic across the UI layer.

## Solution

```typescript
// commands/Command.ts
interface Command {
  execute(): void;
  undo(): void;
  getName(): string;
}

// Receiver
class TextDocument {
  private content = '';
  private history: string[] = [''];

  insert(text: string, position: number): void {
    this.content = this.content.slice(0, position) + text + this.content.slice(position);
    this.saveState();
  }

  delete(position: number, length: number): string {
    const removed = this.content.slice(position, position + length);
    this.content = this.content.slice(0, position) + this.content.slice(position + length);
    this.saveState();
    return removed;
  }

  getContent(): string {
    return this.content;
  }

  private saveState(): void {
    this.history.push(this.content);
  }

  restoreState(index: number): void {
    this.content = this.history[index] ?? this.content;
  }
}

// Concrete Commands
class InsertCommand implements Command {
  private previousLength: number;

  constructor(
    private document: TextDocument,
    private text: string,
    private position: number
  ) {
    this.previousLength = document.getContent().length;
  }

  execute(): void {
    this.document.insert(this.text, this.position);
  }

  undo(): void {
    this.document.delete(this.position, this.text.length);
  }

  getName(): string {
    return `Insert "${this.text}"`;
  }
}

class DeleteCommand implements Command {
  private deletedText: string = '';

  constructor(
    private document: TextDocument,
    private position: number,
    private length: number
  ) {}

  execute(): void {
    this.deletedText = this.document.delete(this.position, this.length);
  }

  undo(): void {
    this.document.insert(this.deletedText, this.position);
  }

  getName(): string {
    return `Delete ${this.length} chars`;
  }
}

// Invoker
class CommandHistory {
  private history: Command[] = [];
  private currentIndex = -1;

  execute(command: Command): void {
    command.execute();
    
    // Remove any redo commands
    this.history = this.history.slice(0, this.currentIndex + 1);
    this.history.push(command);
    this.currentIndex++;
  }

  undo(): void {
    if (this.currentIndex < 0) return;
    this.history[this.currentIndex].undo();
    this.currentIndex--;
  }

  redo(): void {
    if (this.currentIndex >= this.history.length - 1) return;
    this.currentIndex++;
    this.history[this.currentIndex].execute();
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }
}

// Usage
const doc = new TextDocument();
const history = new CommandHistory();

history.execute(new InsertCommand(doc, 'Hello', 0));
history.execute(new InsertCommand(doc, ' World', 5));
console.log(doc.getContent()); // "Hello World"

history.undo();
console.log(doc.getContent()); // "Hello"

history.redo();
console.log(doc.getContent()); // "Hello World"
```

## Variations

- **Macro Command** executes multiple commands as a single unit
- **Async Command** returns a Promise for long-running operations
- **Composite Command** treats a batch of commands as one undoable action

## Production Considerations

- Limit history size to prevent memory exhaustion in long sessions
- Serialize commands to JSON for crash recovery and collaborative editing
- Use immutable document states for simpler undo logic in functional architectures

## Common Mistakes

- Storing entire document snapshots instead of inverse operations
- Not handling concurrent command execution in multi-user scenarios
- Forgetting to clear redo stack when a new command is executed after undo

## FAQ

**Q: How is this different from the Memento pattern?**
A: Command stores the operation to reverse. Memento stores the state snapshot. Commands are smaller but harder to implement; Mementos are simpler but use more memory.

**Q: Can I use this for API request logging?**
A: Yes. Wrap HTTP requests as commands to replay sequences for debugging or testing.
