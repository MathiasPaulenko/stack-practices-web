---
contentType: patterns
slug: composite-pattern
title: "Composite Pattern"
description: "Compose objects into tree structures to represent part-whole hierarchies. A structural design pattern for treating individual objects and compositions uniformly."
metaDescription: "Learn the Composite Pattern in Python, Java, and JavaScript. Structural design pattern for tree structures and part-whole hierarchies."
difficulty: intermediate
topics:
  - design
tags:
  - composite
  - design-pattern
  - java
  - javascript
  - pattern
  - python
  - structural
relatedResources:
  - /patterns/design/decorator-pattern
  - /patterns/design/chain-of-responsibility-pattern
  - /patterns/design/strategy-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Composite Pattern in Python, Java, and JavaScript. Structural design pattern for tree structures and part-whole hierarchies."
  keywords:
    - composite pattern
    - design pattern
    - structural pattern
    - tree structure
    - part-whole hierarchy
    - python composite
    - java composite
    - javascript composite
---

# Composite Pattern

## Overview

The Composite Pattern is a structural design pattern that lets you compose objects into tree structures and then work with those structures as if they were individual objects. It is ideal when you need to treat individual items and groups of items uniformly — such as [UI components](/patterns/design/composite-pattern-ui), file systems, or organization charts.

## When to Use

Use the Composite Pattern when:
- You need to represent part-whole hierarchies of objects. See [Visitor Pattern](/patterns/design/visitor-pattern) for operations on tree structures.
- Clients should ignore the difference between compositions of objects and individual objects
- You want to perform operations recursively over a tree structure. See [Visitor Pattern](/patterns/design/visitor-pattern) for traversal operations.
- The structure is naturally hierarchical (UI, file systems, org charts, expressions). See [Flyweight Pattern](/patterns/design/flyweight-pattern) for optimizing many similar nodes.

## Solution

### Python

```python
from abc import ABC, abstractmethod

class FileSystemComponent(ABC):
    @abstractmethod
    def get_size(self) -> int:
        pass

    @abstractmethod
    def display(self, indent: int = 0):
        pass

class File(FileSystemComponent):
    def __init__(self, name: str, size: int):
        self.name = name
        self.size = size

    def get_size(self) -> int:
        return self.size

    def display(self, indent: int = 0):
        print("  " * indent + f"📄 {self.name} ({self.size} bytes)")

class Folder(FileSystemComponent):
    def __init__(self, name: str):
        self.name = name
        self.children: list[FileSystemComponent] = []

    def add(self, component: FileSystemComponent):
        self.children.append(component)

    def get_size(self) -> int:
        return sum(child.get_size() for child in self.children)

    def display(self, indent: int = 0):
        print("  " * indent + f"📁 {self.name}")
        for child in self.children:
            child.display(indent + 1)

# Build a tree
root = Folder("root")
root.add(File("readme.txt", 100))

src = Folder("src")
src.add(File("main.py", 500))
src.add(File("utils.py", 300))
root.add(src)

root.display()
print(f"Total size: {root.get_size()} bytes")
```

### JavaScript

```javascript
class FileSystemComponent {
  getSize() { throw new Error("Not implemented"); }
  display(indent = 0) { throw new Error("Not implemented"); }
}

class File extends FileSystemComponent {
  constructor(name, size) {
    super();
    this.name = name;
    this.size = size;
  }

  getSize() { return this.size; }

  display(indent = 0) {
    console.log("  ".repeat(indent) + `📄 ${this.name} (${this.size} bytes)`);
  }
}

class Folder extends FileSystemComponent {
  constructor(name) {
    super();
    this.name = name;
    this.children = [];
  }

  add(component) { this.children.push(component); }

  getSize() {
    return this.children.reduce((sum, c) => sum + c.getSize(), 0);
  }

  display(indent = 0) {
    console.log("  ".repeat(indent) + `📁 ${this.name}`);
    this.children.forEach(c => c.display(indent + 1));
  }
}

// Build a tree
const root = new Folder("root");
root.add(new File("readme.txt", 100));

const src = new Folder("src");
src.add(new File("main.js", 500));
src.add(new File("utils.js", 300));
root.add(src);

root.display();
console.log(`Total size: ${root.getSize()} bytes`);
```

### Java

```java
public interface FileSystemComponent {
    int getSize();
    void display(int indent);
}

public class File implements FileSystemComponent {
    private final String name;
    private final int size;

    public File(String name, int size) {
        this.name = name;
        this.size = size;
    }

    public int getSize() { return size; }

    public void display(int indent) {
        System.out.println("  ".repeat(indent) + "📄 " + name + " (" + size + " bytes)");
    }
}

public class Folder implements FileSystemComponent {
    private final String name;
    private final java.util.List<FileSystemComponent> children = new java.util.ArrayList<>();

    public Folder(String name) {
        this.name = name;
    }

    public void add(FileSystemComponent component) {
        children.add(component);
    }

    public int getSize() {
        return children.stream().mapToInt(FileSystemComponent::getSize).sum();
    }

    public void display(int indent) {
        System.out.println("  ".repeat(indent) + "📁 " + name);
        for (FileSystemComponent child : children) {
            child.display(indent + 1);
        }
    }
}

// Usage
Folder root = new Folder("root");
root.add(new File("readme.txt", 100));

Folder src = new Folder("src");
src.add(new File("Main.java", 500));
src.add(new File("Utils.java", 300));
root.add(src);

root.display(0);
System.out.println("Total size: " + root.getSize() + " bytes");
```

## Explanation

The Composite Pattern has three roles:

- **Component** (`FileSystemComponent`): The common interface for both leaf and composite objects
- **Leaf** (`File`): Represents individual objects with no children
- **Composite** (`Folder`): Represents containers that can hold leaves and other composites

Clients interact with all objects through the Component interface, making the tree structure transparent.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Transparent** | Component interface exposes child management | Uniform treatment, but leaves must implement empty methods |
| **Safe** | Child management only on Composite | Type safety, but clients must distinguish leaf vs. composite |
| **Weight-based** | Composite computes aggregate values from children | File sizes, pricing, totals |

## What Works

- **Keep the component interface lean** — too many methods make leaves complex
- **Document whether null/empty returns are valid** for leaf child operations
- **Prefer immutable trees** when the structure does not change frequently
- **Add traversal helpers** (find, filter, map) for common tree operations
- **Validate tree integrity** in composite `add()` methods (e.g., prevent cycles)

## Common Mistakes

- Adding too many child-management methods to the component interface, forcing leaves to implement no-ops
- Allowing cycles in the tree structure, causing infinite recursion
- Exposing the internal collection of children, breaking encapsulation
- Forgetting to handle the edge case of empty composites in recursive operations
- Mixing composite logic with domain logic, making the pattern hard to test

## Frequently Asked Questions

**Q: When should I use Composite instead of a flat list?**
A: Use Composite when your data is naturally hierarchical and you need to perform recursive operations. For flat or shallow structures, a simple list with grouping is usually sufficient. If you need to add behavior to individual objects without tree semantics, use [Decorator](/patterns/design/decorator-pattern) instead.

**Q: How do I prevent cycles in a Composite tree?**
A: In the `add()` method of the composite, check that the component being added is not already an ancestor in the tree. Maintain a parent reference if needed.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
