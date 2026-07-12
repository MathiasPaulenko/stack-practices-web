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
  - design-patterns
relatedResources:
  - /patterns/memento-pattern-state
  - /patterns/abstract-factory-cross-platform
  - /patterns/dependency-injection-typescript
  - /patterns/interpreter-pattern-expressions
  - /patterns/visitor-pattern-operations
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

The [Command](/patterns/design/command-pattern) pattern turns a request into a stand-alone object containing all information about the request. This decoupling allows you to parameterize methods with different requests, delay or queue execution, and implement undo/redo operations — essential for interactive applications like editors, drawing tools, and form builders.

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
A: Command stores the operation to reverse. [Memento](/patterns/design/memento-pattern-state) stores the state snapshot. Commands are smaller but harder to implement; Mementos are simpler but use more memory.

**Q: Can I use this for API request logging?**
A: Yes. Wrap [HTTP requests](/recipes/api/call-rest-api) as commands to replay sequences for debugging or testing.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.


## Advanced Topics

### Scenario: Undo/Redo System for Text Editor

```typescript
// Command pattern: encapsulate operations as objects
interface Command {
  execute(): void;
  undo(): void;
  describe(): string;
}

// Receiver: the text editor
class TextEditor {
  private content = "";
  private selection = { start: 0, end: 0 };

  insert(text: string, pos: number) {
    this.content = this.content.slice(0, pos) + text + this.content.slice(pos);
  }
  delete(start: number, end: number) {
    this.content = this.content.slice(0, start) + this.content.slice(end);
  }
  getContent(): string { return this.content; }
}

// Concrete commands
class InsertCommand implements Command {
  constructor(private editor: TextEditor, private text: string, private pos: number) {}
  execute() { this.editor.insert(this.text, this.pos); }
  undo() { this.editor.delete(this.pos, this.pos + this.text.length); }
  describe() { return `Insert "${this.text}" at ${this.pos}`; }
}

class DeleteCommand implements Command {
  private deletedText = "";
  constructor(private editor: TextEditor, private start: number, private end: number) {}
  execute() {
    this.deletedText = this.editor.getContent().slice(this.start, this.end);
    this.editor.delete(this.start, this.end);
  }
  undo() { this.editor.insert(this.deletedText, this.start); }
  describe() { return `Delete ${this.start}-${this.end}`; }
}

// Invoker: command history
class CommandHistory {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistory = 100;

  execute(cmd: Command) {
    cmd.execute();
    this.undoStack.push(cmd);
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    this.redoStack = [];
  }
  undo(): Command | null {
    const cmd = this.undoStack.pop();
    if (cmd) { cmd.undo(); this.redoStack.push(cmd); }
    return cmd;
  }
  redo(): Command | null {
    const cmd = this.redoStack.pop();
    if (cmd) { cmd.execute(); this.undoStack.push(cmd); }
    return cmd;
  }
  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }
}

// Usage
const editor = new TextEditor();
const history = new CommandHistory();

history.execute(new InsertCommand(editor, "Hello", 0));
history.execute(new InsertCommand(editor, " World", 5));
console.log(editor.getContent()); // "Hello World"

history.undo();
console.log(editor.getContent()); // "Hello"

history.redo();
console.log(editor.getContent()); // "Hello World"
```

Lessons:
  - Command encapsulates operations as objects with execute and undo
  - The history handles undo/redo without knowing command details
  - Each command stores state needed to reverse itself
  - Limit history (100 commands) to avoid memory leaks
  - Macro command: group multiple commands into one
```

### How do I implement macros with Command?

Create a MacroCommand that contains a list of commands. Execute() calls execute() on each command in order. Undo() calls undo() in reverse order. This allows grouping atomic operations: for example, "format document" executes 20 individual commands, and a single undo reverses them all.
