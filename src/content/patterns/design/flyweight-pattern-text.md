---
contentType: patterns
slug: flyweight-pattern-text
title: "Flyweight Pattern for Efficient Large-Scale Object Sharing"
description: "Use the Flyweight pattern to minimize memory usage by sharing as much data as possible between similar objects, essential for rendering large datasets"
metaDescription: "Flyweight pattern for memory efficiency. Share intrinsic state between similar objects to minimize memory usage when rendering large datasets and UI trees."
difficulty: intermediate
topics:
  - design
  - performance
tags:
  - flyweight
  - structural-patterns
  - typescript
  - design-pattern
relatedResources:
  - /patterns/design/singleton-pattern-services
  - /patterns/design/cache-invalidation
  - /guides/performance-optimization-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Flyweight pattern for memory efficiency. Share intrinsic state between similar objects to minimize memory usage when rendering large datasets and UI trees."
  keywords:
    - flyweight pattern
    - object sharing
    - memory optimization
    - structural patterns
    - large datasets
---

# Flyweight Pattern for Efficient Large-Scale Object Sharing

The Flyweight pattern minimizes memory usage by sharing as much data as possible between similar objects. When an application needs to create thousands of objects that share most of their state, Flyweight extracts the shared (intrinsic) state into a separate shared object, leaving only the unique (extrinsic) state in each instance.

## When to Use This

- An application uses a large number of objects with shared state
- Memory cost is high because of the sheer quantity of objects
- Most object state can be made extrinsic and computed on the fly

## Problem

A document editor with 100,000 characters creates 100,000 Character objects. Each stores font, size, color, and glyph data — even though only 200 unique character styles exist in the document.

## Solution

```typescript
// flyweight/CharacterStyle.ts
interface CharacterStyle {
  font: string;
  size: number;
  color: string;
  bold: boolean;
}

class StyleFactory {
  private styles = new Map<string, CharacterStyle>();

  getStyle(font: string, size: number, color: string, bold: boolean): CharacterStyle {
    const key = `${font}-${size}-${color}-${bold}`;

    if (!this.styles.has(key)) {
      this.styles.set(key, { font, size, color, bold });
    }

    return this.styles.get(key)!;
  }

  getStyleCount(): number {
    return this.styles.size;
  }
}

// Flyweight character with extrinsic position
class Character {
  constructor(
    private char: string,
    private style: CharacterStyle  // Shared intrinsic state
  ) {}

  render(position: number): string {
    // Extrinsic state: position passed at render time
    return `<span style="font: ${this.style.size}px ${this.style.font}; color: ${this.style.color}; ${this.style.bold ? 'font-weight: bold;' : ''}" data-position="${position}">${this.char}</span>`;
  }
}

// Document uses flyweights
class Document {
  private characters: { char: Character; position: number }[] = [];
  private styleFactory = new StyleFactory();

  insert(char: string, position: number, font: string, size: number, color: string, bold: boolean): void {
    const style = this.styleFactory.getStyle(font, size, color, bold);
    const character = new Character(char, style);
    this.characters.push({ char: character, position });
  }

  render(): string {
    return this.characters
      .map(c => c.char.render(c.position))
      .join('');
  }

  getMemoryStats(): { characters: number; uniqueStyles: number } {
    return {
      characters: this.characters.length,
      uniqueStyles: this.styleFactory.getStyleCount(),
    };
  }
}

// Usage
const doc = new Document();

// Insert 10,000 characters using only 3 unique styles
doc.insert('H', 0, 'Arial', 12, '#000', true);
doc.insert('e', 1, 'Arial', 12, '#000', true);

for (let i = 2; i < 10000; i++) {
  doc.insert('x', i, 'Arial', 12, '#000', false);
}

console.log(doc.getMemoryStats());
// { characters: 10000, uniqueStyles: 2 }
```

## Variation: Game Object Pool

```typescript
// flyweight/Tree.ts
interface TreeType {
  mesh: string;
  barkTexture: string;
  leafTexture: string;
}

class TreeTypeFactory {
  private types = new Map<string, TreeType>();

  getTreeType(mesh: string, bark: string, leaf: string): TreeType {
    const key = `${mesh}-${bark}-${leaf}`;
    if (!this.types.has(key)) {
      this.types.set(key, { mesh, barkTexture: bark, leafTexture: leaf });
    }
    return this.types.get(key)!;
  }
}

// Tree instance only stores position and type reference
class Tree {
  constructor(
    private x: number,
    private y: number,
    private type: TreeType  // Shared flyweight
  ) {}

  render(): void {
    console.log(`Render ${this.type.mesh} at (${this.x}, ${this.y})`);
  }
}

// Forest with thousands of trees using few types
class Forest {
  private trees: Tree[] = [];
  private typeFactory = new TreeTypeFactory();

  plantTree(x: number, y: number, mesh: string, bark: string, leaf: string): void {
    const type = this.typeFactory.getTreeType(mesh, bark, leaf);
    this.trees.push(new Tree(x, y, type));
  }
}
```

## How It Works

1. **Flyweight** stores the intrinsic (shared) state that belongs to many objects
2. **Context** stores the extrinsic (unique) state and references a Flyweight
3. **Flyweight Factory** creates and manages shared flyweight instances
4. **Client** computes extrinsic state and passes it to the flyweight's methods

## Production Considerations

- Flyweights must be immutable; never modify shared state after creation
- Thread safety is required when the factory is accessed concurrently
- Consider using WeakMap for automatic garbage collection of unused flyweights

## Common Mistakes

- Putting extrinsic state inside the Flyweight class, defeating the purpose
- Not using a factory, allowing duplicate flyweight instances
- Modifying shared flyweight state, corrupting all contexts using it

## FAQ

**Q: How is this different from a cache?**
A: Flyweight is a design-level decision about object structure. A cache is an optimization for arbitrary data. Flyweights are part of the domain model.

**Q: When should I NOT use Flyweight?**
A: When the number of shared states approaches the number of instances, or when computing extrinsic state is more expensive than storing it directly.
