---
contentType: patterns
slug: memento-pattern-state
title: "Memento Pattern for State Snapshot and Restoration"
description: "Capture and externalize an object's internal state without violating encapsulation, enabling undo, serialization, and state rollback in applications"
metaDescription: "Memento pattern for state snapshots. Capture and restore object state without breaking encapsulation for undo, serialization, and rollback functionality."
difficulty: intermediate
topics:
  - design
tags:
  - memento
  - behavioral-patterns
  - typescript
  - design-pattern
relatedResources:
  - /patterns/design/command-pattern-undo
  - /patterns/design/prototype-pattern-cloning
  - /guides/clean-code-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Memento pattern for state snapshots. Capture and restore object state without breaking encapsulation for undo, serialization, and rollback functionality."
  keywords:
    - memento pattern
    - state snapshot
    - undo restore
    - behavioral patterns
    - serialization
---

# Memento Pattern for State Snapshot and Restoration

The [Memento](/patterns/design/memento-pattern) pattern captures and externalizes an object's internal state so the object can be restored to this state later, without violating encapsulation. Unlike [Command](/patterns/design/command-pattern), which stores operations, Memento stores the entire state snapshot. It is the foundation for undo systems, checkpoints in games, and draft saving in editors.

## When to Use This

- You need full state restoration, not just operation reversal
- The object's internal structure is complex and should remain hidden
- Snapshots must be persisted to disk or transmitted over a network

## Problem

A drawing application needs undo functionality, but exposing internal shape coordinates and styles violates encapsulation. Storing operations is insufficient because shapes can be modified by external tools.

## Solution

```typescript
// memento/EditorMemento.ts
interface EditorMemento {
  getState(): string;
}

class TextEditor {
  private content = '';
  private cursorPosition = 0;
  private selectionRange: [number, number] = [0, 0];

  type(text: string): void {
    const before = this.content.slice(0, this.cursorPosition);
    const after = this.content.slice(this.cursorPosition);
    this.content = before + text + after;
    this.cursorPosition += text.length;
    this.selectionRange = [this.cursorPosition, this.cursorPosition];
  }

  delete(): void {
    const [start, end] = this.selectionRange;
    if (start === end && start > 0) {
      this.content = this.content.slice(0, start - 1) + this.content.slice(start);
      this.cursorPosition = start - 1;
    } else {
      this.content = this.content.slice(0, start) + this.content.slice(end);
      this.cursorPosition = start;
    }
    this.selectionRange = [this.cursorPosition, this.cursorPosition];
  }

  // Create snapshot
  save(): EditorMemento {
    return new EditorSnapshot(
      this.content,
      this.cursorPosition,
      this.selectionRange
    );
  }

  // Restore from snapshot
  restore(memento: EditorMemento): void {
    const snapshot = memento as EditorSnapshot;
    this.content = snapshot.getContent();
    this.cursorPosition = snapshot.getCursor();
    this.selectionRange = snapshot.getSelection();
  }

  getContent(): string {
    return this.content;
  }
}

// Memento implementation (opaque to clients)
class EditorSnapshot implements EditorMemento {
  constructor(
    private content: string,
    private cursor: number,
    private selection: [number, number]
  ) {}

  getState(): string {
    return JSON.stringify({ content: this.content, cursor: this.cursor, selection: this.selection });
  }

  getContent(): string { return this.content; }
  getCursor(): number { return this.cursor; }
  getSelection(): [number, number] { return this.selection; }
}

// Caretaker manages history
class EditorHistory {
  private history: EditorMemento[] = [];
  private currentIndex = -1;

  backup(editor: TextEditor): void {
    this.history = this.history.slice(0, this.currentIndex + 1);
    this.history.push(editor.save());
    this.currentIndex++;
  }

  undo(editor: TextEditor): void {
    if (this.currentIndex <= 0) return;
    this.currentIndex--;
    editor.restore(this.history[this.currentIndex]);
  }

  redo(editor: TextEditor): void {
    if (this.currentIndex >= this.history.length - 1) return;
    this.currentIndex++;
    editor.restore(this.history[this.currentIndex]);
  }
}

// Usage
const editor = new TextEditor();
const history = new EditorHistory();

history.backup(editor);
editor.type('Hello');
history.backup(editor);
editor.type(' World');

console.log(editor.getContent()); // "Hello World"

history.undo(editor);
console.log(editor.getContent()); // "Hello"

history.redo(editor);
console.log(editor.getContent()); // "Hello World"
```

## Variation: Game Checkpoint System

```typescript
// memento/GameCheckpoint.ts
class GameState {
  private level = 1;
  private health = 100;
  private inventory: string[] = [];

  createCheckpoint(): GameCheckpoint {
    return new GameCheckpoint(this.level, this.health, [...this.inventory]);
  }

  loadCheckpoint(checkpoint: GameCheckpoint): void {
    this.level = checkpoint.getLevel();
    this.health = checkpoint.getHealth();
    this.inventory = checkpoint.getInventory();
  }
}

class GameCheckpoint implements EditorMemento {
  constructor(
    private level: number,
    private health: number,
    private inventory: string[]
  ) {}

  getState(): string {
    return JSON.stringify({ level: this.level, health: this.health });
  }

  getLevel(): number { return this.level; }
  getHealth(): number { return this.health; }
  getInventory(): string[] { return [...this.inventory]; }
}
```

## How It Works

1. **Originator** creates and restores mementos of its own state
2. **Memento** stores the state snapshot; only the Originator can read it
3. **Caretaker** manages the history of mementos without accessing their contents
4. **Client** requests backups and triggers undo/redo through the Caretaker

## Production Considerations

- Use structural sharing or delta encoding for large states to reduce memory
- Limit history depth to prevent unbounded growth
- Serialize mementos to JSON for persistence across sessions

## Common Mistakes

- Allowing mementos to be modified after creation, corrupting history
- Storing references to mutable objects instead of deep copies
- Breaking encapsulation by exposing memento internals to the Caretaker

## FAQ

**Q: How is this different from Command?**
A: [Command](/patterns/design/command-pattern) stores operations to reverse. Memento stores complete state snapshots. Mementos are larger but simpler to implement for complex objects.

**Q: Can I use this with Redux?**
A: Redux time-travel is essentially a memento history over immutable state. Redux DevTools implements this pattern.
