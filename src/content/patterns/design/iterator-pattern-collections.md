---
contentType: patterns
slug: iterator-pattern-collections
title: "Iterator Pattern for Custom Collection Traversal in TypeScript"
description: "Provide a way to access elements of an aggregate object sequentially without exposing its underlying representation using the Iterator pattern"
metaDescription: "Iterator pattern for custom collections. Access aggregate elements sequentially without exposing underlying representation for trees, graphs, and streams."
difficulty: intermediate
topics:
  - design
tags:
  - iterator
  - behavioral-patterns
  - typescript
  - design-pattern
  - design-patterns
relatedResources:
  - /patterns/design/composite-pattern-ui
  - /patterns/design/abstract-factory-cross-platform
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Iterator pattern for custom collections. Access aggregate elements sequentially without exposing underlying representation for trees, graphs, and streams."
  keywords:
    - iterator pattern
    - collection traversal
    - behavioral patterns
    - typescript
    - tree traversal
---

# Iterator Pattern for Custom Collection Traversal in TypeScript

The [Iterator](/patterns/design/iterator-pattern) pattern provides a way to access elements of an aggregate object sequentially without exposing its underlying representation. It separates the traversal algorithm from the collection structure, allowing you to iterate over arrays, trees, graphs, or streams with the same interface.

## When to Use This

- You need to traverse a collection without exposing its internal structure
- Multiple traversal algorithms (pre-order, post-order, level-order) are needed for the same collection
- You want uniform iteration across different collection types

## Problem

A [tree](/patterns/design/composite-pattern) structure requires different traversal orders for different use cases, but each traversal is tightly coupled to the tree's node implementation.

## Solution

```typescript
// iterator/Iterator.ts
interface Iterator<T> {
  next(): T | null;
  hasNext(): boolean;
  reset(): void;
}

interface IterableCollection<T> {
  createIterator(): Iterator<T>;
}

// Tree Node
class TreeNode<T> {
  children: TreeNode<T>[] = [];

  constructor(public value: T) {}

  addChild(child: TreeNode<T>): void {
    this.children.push(child);
  }
}

// Depth-First Iterator (pre-order)
class PreOrderIterator<T> implements Iterator<T> {
  private stack: TreeNode<T>[] = [];

  constructor(root: TreeNode<T>) {
    this.stack.push(root);
  }

  next(): T | null {
    if (!this.hasNext()) return null;

    const node = this.stack.pop()!;
    // Push children in reverse order for left-to-right traversal
    for (let i = node.children.length - 1; i >= 0; i--) {
      this.stack.push(node.children[i]);
    }

    return node.value;
  }

  hasNext(): boolean {
    return this.stack.length > 0;
  }

  reset(): void {
    this.stack = [];
  }
}

// Breadth-First Iterator
class LevelOrderIterator<T> implements Iterator<T> {
  private queue: TreeNode<T>[] = [];

  constructor(root: TreeNode<T>) {
    this.queue.push(root);
  }

  next(): T | null {
    if (!this.hasNext()) return null;

    const node = this.queue.shift()!;
    this.queue.push(...node.children);

    return node.value;
  }

  hasNext(): boolean {
    return this.queue.length > 0;
  }

  reset(): void {
    this.queue = [];
  }
}

// File system with iterator
class FileSystem implements IterableCollection<string> {
  private root = new TreeNode<string>('root');

  addNode(parentPath: string, name: string): void {
    const parent = this.findNode(parentPath);
    if (parent) {
      parent.addChild(new TreeNode<string>(name));
    }
  }

  private findNode(path: string): TreeNode<string> | null {
    // Simplified path lookup
    return this.root;
  }

  createIterator(type: 'pre-order' | 'level-order' = 'pre-order'): Iterator<string> {
    if (type === 'level-order') {
      return new LevelOrderIterator(this.root);
    }
    return new PreOrderIterator(this.root);
  }
}

// Usage
const fs = new FileSystem();
fs.addNode('root', 'src');
fs.addNode('root', 'dist');

const preOrder = fs.createIterator('pre-order');
console.log('Pre-order:');
while (preOrder.hasNext()) {
  console.log(preOrder.next());
}

const levelOrder = fs.createIterator('level-order');
console.log('Level-order:');
while (levelOrder.hasNext()) {
  console.log(levelOrder.next());
}
```

## Variation: Async Iterator for Streams

```typescript
// iterator/AsyncStreamIterator.ts
interface AsyncIterator<T> {
  next(): Promise<T | null>;
  hasNext(): boolean;
}

class DatabaseQueryIterator implements AsyncIterator<Record<string, unknown>> {
  private currentPage: Record<string, unknown>[] = [];
  private pageIndex = 0;
  private offset = 0;
  private hasMore = true;

  constructor(
    private query: string,
    private pageSize: number = 100,
    private db: { query: (sql: string, params: unknown[]) => Promise<Record<string, unknown>[]> }
  ) {}

  async next(): Promise<Record<string, unknown> | null> {
    if (this.pageIndex >= this.currentPage.length) {
      if (!this.hasMore) return null;
      await this.loadNextPage();
    }

    if (this.pageIndex >= this.currentPage.length) return null;
    return this.currentPage[this.pageIndex++];
  }

  hasNext(): boolean {
    return this.hasMore || this.pageIndex < this.currentPage.length;
  }

  private async loadNextPage(): Promise<void> {
    this.currentPage = await this.db.query(
      `${this.query} LIMIT ${this.pageSize} OFFSET ${this.offset}`,
      []
    );
    this.offset += this.pageSize;
    this.pageIndex = 0;
    this.hasMore = this.currentPage.length === this.pageSize;
  }
}
```

## How It Works

1. **Iterator** declares the interface for traversal with `next()`, `hasNext()`, and `reset()`
2. **Concrete Iterator** implements traversal logic for a specific collection structure
3. **Aggregate** declares the factory method for creating iterators
4. **Concrete Aggregate** returns a new iterator instance configured for its structure

## Production Considerations

- Implement `Symbol.iterator` for native `for...of` loop support in TypeScript
- Use generators (`function*`) for concise iterator implementation
- Consider async iterators for paginated APIs and streaming data

## Common Mistakes

- Exposing the internal collection index, allowing clients to modify it
- Not handling concurrent modification during iteration
- Implementing only one traversal when multiple are needed

## FAQ

**Q: How is this different from a simple `for` loop?**
A: Iterator separates traversal from the collection, allowing multiple algorithms and hiding internal structure. A `for` loop exposes indices and array details.

**Q: Can I use this with built-in JavaScript iterators?**
A: Yes. Implement `[Symbol.iterator]` and use generators to integrate with `for...of`, spread syntax, and destructuring.

**Q: When should I use async iterators?**
A: For paginated [database queries](/recipes/databases/sql-joins), streaming file reads, or any collection where elements arrive asynchronously.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
