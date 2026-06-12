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
author: "StackPractices"
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

The Iterator Pattern is a behavioral design pattern that provides a way to access elements of an aggregate object sequentially without exposing its underlying representation. It separates the traversal logic from the collection itself, allowing multiple simultaneous traversals and different traversal strategies.

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

## Best Practices

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
A: Rarely. Most languages provide built-in iterator support. Only implement a custom iterator when you need a non-standard traversal (e.g., tree traversal, graph traversal, or filtered iteration).

**Q: What is the difference between Iterator and Visitor?**
A: Iterator traverses elements. Visitor performs operations on elements. They are often used together: an iterator walks the structure, and a visitor processes each element.
