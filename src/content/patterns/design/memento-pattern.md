---
contentType: patterns
slug: memento-pattern
title: "Memento Pattern"
description: "Capture and restore an object's internal state without violating encapsulation. A behavioral design pattern for undo/redo."
metaDescription: "Learn the Memento Pattern in Python, Java, and JavaScript. Behavioral design pattern for state snapshots and undo functionality."
difficulty: intermediate
topics:
  - design
tags:
  - memento
  - pattern
  - design-pattern
  - behavioral
  - undo
  - state-snapshot
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/command-pattern
  - /patterns/design/state-pattern
  - /patterns/design/prototype-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Memento Pattern in Python, Java, and JavaScript. Behavioral design pattern for state snapshots and undo functionality."
  keywords:
    - memento pattern
    - design pattern
    - behavioral pattern
    - undo redo
    - state snapshot
    - python memento
    - java memento
    - javascript memento
---

# Memento Pattern

## Overview

The [Memento](/patterns/design/memento-pattern-state) Pattern is a behavioral design pattern that lets you save and restore the previous state of an object without revealing its internal structure. It is the foundation of undo/redo functionality in applications like text editors, drawing programs, and game state management.

## When to Use

Use the Memento Pattern when:
- You need to implement undo and redo functionality
- You want to save checkpoints of an object's state
- You must preserve encapsulation and not expose internal state directly
- State restoration should be possible without the client knowing the object's internals

## Solution

### Python

```python
class EditorMemento:
    def __init__(self, content: str, cursor: int):
        self._content = content
        self._cursor = cursor

    @property
    def content(self) -> str:
        return self._content

    @property
    def cursor(self) -> int:
        return self._cursor

class TextEditor:
    def __init__(self):
        self._content = ""
        self._cursor = 0

    def type(self, text: str):
        self._content = self._content[:self._cursor] + text
        self._cursor += len(text)

    def save(self) -> EditorMemento:
        return EditorMemento(self._content, self._cursor)

    def restore(self, memento: EditorMemento):
        self._content = memento.content
        self._cursor = memento.cursor

    @property
    def content(self) -> str:
        return self._content

# Usage with history
class History:
    def __init__(self):
        self._history = []

    def push(self, memento):
        self._history.append(memento)

    def pop(self):
        if not self._history:
            return None
        return self._history.pop()

editor = TextEditor()
history = History()

history.push(editor.save())
editor.type("Hello ")
history.push(editor.save())
editor.type("World!")

print(editor.content)  # Hello World!

editor.restore(history.pop())
print(editor.content)  # Hello

editor.restore(history.pop())
print(editor.content)  # (empty)
```

### JavaScript

```javascript
class EditorMemento {
  constructor(content, cursor) {
    this.content = content;
    this.cursor = cursor;
  }
}

class TextEditor {
  constructor() {
    this._content = "";
    this._cursor = 0;
  }

  type(text) {
    this._content = this._content.slice(0, this._cursor) + text;
    this._cursor += text.length;
  }

  save() {
    return new EditorMemento(this._content, this._cursor);
  }

  restore(memento) {
    this._content = memento.content;
    this._cursor = memento.cursor;
  }

  get content() {
    return this._content;
  }
}

// Usage
class History {
  constructor() {
    this.history = [];
  }

  push(memento) {
    this.history.push(memento);
  }

  pop() {
    return this.history.pop();
  }
}

const editor = new TextEditor();
const history = new History();

history.push(editor.save());
editor.type("Hello ");
history.push(editor.save());
editor.type("World!");

console.log(editor.content); // Hello World!

editor.restore(history.pop());
console.log(editor.content); // Hello
```

### Java

```java
public class EditorMemento {
    private final String content;
    private final int cursor;

    public EditorMemento(String content, int cursor) {
        this.content = content;
        this.cursor = cursor;
    }

    public String getContent() { return content; }
    public int getCursor() { return cursor; }
}

public class TextEditor {
    private String content = "";
    private int cursor = 0;

    public void type(String text) {
        content = content.substring(0, cursor) + text;
        cursor += text.length();
    }

    public EditorMemento save() {
        return new EditorMemento(content, cursor);
    }

    public void restore(EditorMemento memento) {
        this.content = memento.getContent();
        this.cursor = memento.getCursor();
    }

    public String getContent() { return content; }
}

// Usage with history
import java.util.ArrayDeque;
import java.util.Deque;

public class History {
    private final Deque<EditorMemento> stack = new ArrayDeque<>();

    public void push(EditorMemento memento) {
        stack.push(memento);
    }

    public EditorMemento pop() {
        return stack.isEmpty() ? null : stack.pop();
    }
}

// Demo
TextEditor editor = new TextEditor();
History history = new History();

history.push(editor.save());
editor.type("Hello ");
history.push(editor.save());
editor.type("World!");

System.out.println(editor.getContent());

editor.restore(history.pop());
System.out.println(editor.getContent());
```

## Explanation

The Memento Pattern has three roles:

- **Originator** (`TextEditor`): The object whose state needs to be saved
- **Memento** (`EditorMemento`): An immutable snapshot of the originator's state
- **Caretaker** (`History`): Manages mementos (when to save, when to restore) without accessing their contents

The key benefit is that the memento's internal state is opaque to the caretaker, preserving encapsulation.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Full Snapshot** | Stores entire object state | Small objects, infrequent snapshots |
| **Delta/Incremental** | Stores only changed fields | Large objects, frequent snapshots |
| **Serializable Memento** | Uses serialization for deep copying | Complex object graphs |
| **[Command](/patterns/design/command-pattern) + Memento** | Commands store mementos for undo | Transaction systems, editors |

## What Works

- **Keep mementos immutable** after creation to prevent accidental tampering
- **Limit memento lifetime** — large histories consume significant memory
- **Consider serialization** for complex object graphs, but be aware of performance costs
- **Implement a memento interface** that only exposes state restoration methods to the originator
- **Use delta mementos** for large objects where only a few fields change

## Common Mistakes

- Exposing the memento's internal state to the caretaker, breaking encapsulation
- Storing too many full snapshots, causing excessive memory usage
- Not handling memento versioning when the originator's structure changes over time
- Forgetting to validate mementos before restoration (corrupted or incompatible snapshots)
- Allowing originators to modify mementos after creation, causing unpredictable undo behavior

## Frequently Asked Questions

**Q: How is Memento different from Prototype?**
A: [Prototype](/patterns/design/prototype-pattern) creates a new object by copying an existing one. Memento saves an object's state so it can be restored later. Prototype is about duplication; Memento is about time-travel.

**Q: Can I use serialization instead of Memento?**
A: Yes, but serialization is often slower and less controlled. Memento gives you fine-grained control over what state is saved and how it is restored.
