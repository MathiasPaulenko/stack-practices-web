---
contentType: patterns
slug: iterator-pattern
title: "Iterator Pattern"
description: "Provide a way to access elements of a collection sequentially without exposing its underlying representation. A behavioral design pattern for traversal."
metaDescription: "Learn the Iterator Pattern in Python, Java, and JavaScript. Behavioral design pattern for sequential traversal of collections."
difficulty: beginner
topics:
  - design
tags:
  - iterator
  - pattern
  - design-pattern
  - behavioral
  - traversal
  - collection
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/composite-pattern
  - /patterns/design/chain-of-responsibility-pattern
  - /patterns/design/strategy-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Iterator Pattern in Python, Java, and JavaScript. Behavioral design pattern for sequential traversal of collections."
  keywords:
    - iterator pattern
    - design pattern
    - behavioral pattern
    - collection traversal
    - python iterator
    - java iterator
    - javascript iterator
---

# Iterator Pattern

## Overview

The [Iterator](/patterns/design/iterator-pattern-collections) Pattern is a behavioral design pattern that provides a way to access elements of an aggregate object sequentially without exposing its underlying representation. It separates the traversal logic from the collection itself, allowing multiple simultaneous traversals and different traversal strategies.

## When to Use

Use the Iterator Pattern when:
- You need to traverse a collection without exposing its internal structure
- You want to support multiple traversal algorithms (forward, backward, filter)
- You need to allow traversal by multiple clients simultaneously
- You want a uniform interface for traversing different collection types
- The collection's internal representation may change

## Solution

### Python

```python
class BookCollection:
    def __init__(self):
        self._books = []

    def add(self, book: str):
        self._books.append(book)

    def __iter__(self):
        return iter(self._books)

    def reverse_iter(self):
        return reversed(self._books)

# Usage
collection = BookCollection()
collection.add("Design Patterns")
collection.add("Clean Code")
collection.add("Refactoring")

# Forward iteration (built-in iterator protocol)
for book in collection:
    print(book)

# Reverse iteration
for book in collection.reverse_iter():
    print(book)
```

### JavaScript

```javascript
class BookCollection {
  constructor() {
    this.books = [];
  }

  add(book) {
    this.books.push(book);
  }

  *[Symbol.iterator]() {
    for (const book of this.books) {
      yield book;
    }
  }

  *reverseIterator() {
    for (let i = this.books.length - 1; i >= 0; i--) {
      yield this.books[i];
    }
  }
}

// Usage
const collection = new BookCollection();
collection.add("Design Patterns");
collection.add("Clean Code");
collection.add("Refactoring");

// Forward
for (const book of collection) {
  console.log(book);
}

// Reverse
for (const book of collection.reverseIterator()) {
  console.log(book);
}
```

### Java

```java
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

public class BookCollection implements Iterable<String> {
    private final List<String> books = new ArrayList<>();

    public void add(String book) {
        books.add(book);
    }

    @Override
    public Iterator<String> iterator() {
        return books.iterator();
    }

    public Iterator<String> reverseIterator() {
        return new ReverseIterator<>(books);
    }
}

class ReverseIterator<T> implements Iterator<T> {
    private final List<T> list;
    private int index;

    public ReverseIterator(List<T> list) {
        this.list = list;
        this.index = list.size() - 1;
    }

    @Override
    public boolean hasNext() {
        return index >= 0;
    }

    @Override
    public T next() {
        return list.get(index--);
    }
}

// Usage
BookCollection collection = new BookCollection();
collection.add("Design Patterns");
collection.add("Clean Code");
collection.add("Refactoring");

for (String book : collection) {
    System.out.println(book);
}
```

## Explanation

The Iterator Pattern has two roles:

- **Aggregate** (`BookCollection`): The collection that holds elements
- **Iterator**: Provides sequential access to elements without exposing the collection's internals

Modern languages integrate iterators deeply — Python's `__iter__`, JavaScript's `Symbol.iterator`, and Java's `Iterable`/`Iterator` interfaces are all examples of this pattern.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **External Iterator** | Client controls traversal (`next()`, `hasNext()`) | Flexible, explicit control |
| **Internal Iterator** | Collection applies a function to each element (`forEach`) | Simpler client code |
| **Reverse Iterator** | Traverses in reverse order | Stacks, undo history |
| **Filtering Iterator** | Skips elements that don't match a predicate | Search, filtering |

## What Works

- **Use language-native iterator protocols** when available instead of custom classes
- **Throw exceptions on invalid `next()` calls** to fail fast
- **Support `remove()` only when semantically valid** and document clearly
- **Make iterators fail-fast** if the collection is modified during iteration
- **Document whether iteration order is guaranteed** or arbitrary

## Common Mistakes

- Exposing the internal collection directly instead of using an iterator
- Not handling concurrent modification during iteration, leading to undefined behavior
- Implementing complex iterator classes when a simple generator or comprehension suffices
- Creating iterators that don't implement the language's native iterator protocol
- Forgetting to reset iterator state, causing unexpected behavior on reuse

## Frequently Asked Questions

**Q: Do I need to implement the Iterator Pattern manually?**
A: Rarely. Most languages provide built-in iterator support. Only implement a custom iterator when you need a non-standard traversal (e.g., [tree traversal](/patterns/design/iterator-pattern-collections), graph traversal, or filtered iteration).

**Q: What is the difference between Iterator and Visitor?**
A: Iterator traverses elements. [Visitor](/patterns/design/visitor-pattern) performs operations on elements. They are often used together: an iterator walks the structure, and a visitor processes each element.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.


## Advanced Topics

### Scenario: Iterator for Binary Tree

```typescript
// Iterator pattern: traverse collections without exposing internals
interface Iterator<T> {
  next(): { value: T | null; done: boolean };
  hasNext(): boolean;
  reset(): void;
}

interface Iterable<T> {
  createIterator(): Iterator<T>;
}

// Binary tree
class TreeNode<T> {
  constructor(
    public value: T,
    public left: TreeNode<T> | null = null,
    public right: TreeNode<T> | null = null
  ) {}
}

// Iterator: In-order traversal (left, root, right)
class InOrderIterator<T> implements Iterator<T> {
  private stack: TreeNode<T>[] = [];
  private current: TreeNode<T> | null;

  constructor(root: TreeNode<T>) {
    this.current = root;
    this.pushLeft(root);
  }

  private pushLeft(node: TreeNode<T> | null) {
    while (node) {
      this.stack.push(node);
      node = node.left;
    }
  }

  hasNext(): boolean { return this.stack.length > 0; }

  next(): { value: T | null; done: boolean } {
    if (this.stack.length === 0) return { value: null, done: true };
    const node = this.stack.pop()!;
    this.pushLeft(node.right);
    return { value: node.value, done: false };
  }

  reset() {
    this.stack = [];
    if (this.current) this.pushLeft(this.current);
  }
}

// Iterator: BFS traversal
class BFSIterator<T> implements Iterator<T> {
  private queue: TreeNode<T>[] = [];
  constructor(root: TreeNode<T>) { this.queue.push(root); }
  hasNext(): boolean { return this.queue.length > 0; }
  next(): { value: T | null; done: boolean } {
    if (this.queue.length === 0) return { value: null, done: true };
    const node = this.queue.shift()!;
    if (node.left) this.queue.push(node.left);
    if (node.right) this.queue.push(node.right);
    return { value: node.value, done: false };
  }
  reset() {}
}

// Usage
const tree = new TreeNode(5,
  new TreeNode(3, new TreeNode(1), new TreeNode(4)),
  new TreeNode(7, new TreeNode(6), new TreeNode(8))
);

const inOrder = new InOrderIterator(tree);
while (inOrder.hasNext()) {
  console.log(inOrder.next().value); // 1, 3, 4, 5, 6, 7, 8
}

const bfs = new BFSIterator(tree);
while (bfs.hasNext()) {
  console.log(bfs.next().value); // 5, 3, 7, 1, 4, 6, 8
}
```

Lessons:
  - Iterator traverses collections without exposing their structure
  - Different iterators for different traversals (in-order, BFS, DFS)
  - The client does not know if it traverses an array, tree, or graph
  - Generator functions (yield*) are native iterators in JS
  - Symbol.iterator enables for...of on any iterable
```

### How do I use generators as iterators?

Use function* with yield to create native iterators. function* inOrder(node) { if (node.left) yield* inOrder(node.left); yield node.value; if (node.right) yield* inOrder(node.right); }. Then for (const v of inOrder(tree)) console.log(v). Generators are more concise than an Iterator class: state is managed automatically. Use Iterator classes when you need reset(), hasNext() or multiple simultaneous traversals.
