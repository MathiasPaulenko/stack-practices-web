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
  - design-patterns
relatedResources:
  - /recipes/cache-invalidation
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

The [Flyweight](/patterns/design/flyweight-pattern) pattern minimizes memory usage by sharing as much data as possible between similar objects. When an application needs to create thousands of objects that share most of their state, Flyweight extracts the shared (intrinsic) state into a separate shared object, leaving only the unique (extrinsic) state in each instance.

## When to Use This

- An application uses a large number of objects with shared state. See [Singleton Pattern](/patterns/design/singleton-pattern) for managing single instances.
- Memory cost is high because of the sheer quantity of objects. See [Caching Strategies](/recipes/performance/caching-strategies) for reducing redundant storage.
- Most object state can be made extrinsic and computed on the fly. See [Object Pool](/patterns/design/abstract-factory-pattern) for reusable instance patterns.

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
A: Flyweight is a design-level decision about object structure. A [cache](/patterns/design/cache-aside-pattern) is an optimization for arbitrary data. Flyweights are part of the domain model.

**Q: When should I NOT use Flyweight?**
A: When the number of shared states approaches the number of instances, or when computing extrinsic state is more expensive than storing it directly.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.


## Advanced Topics

### Scenario: Flyweight for Text Rendering

```typescript
// Flyweight: share characters to reduce memory
interface CharacterFlyweight {
  char: string;
  font: string;
  size: number;
  render(x: number, y: number): string;
}

class Character implements CharacterFlyweight {
  constructor(
    public char: string,
    public font: string,
    public size: number
  ) {}

  render(x: number, y: number): string {
    return `<text x="${x}" y="${y}" font-family="${this.font}" font-size="${this.size}">${this.char}</text>`;
  }
}

// Flyweight Factory: caches shared characters
class CharacterFactory {
  private cache = new Map<string, CharacterFlyweight>();

  getCharacter(char: string, font: string, size: number): CharacterFlyweight {
    const key = `${char}|${font}|${size}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, new Character(char, font, size));
      console.log(`[FLYWEIGHT] Created: ${key}`);
    }
    return this.cache.get(key)!;
  }
  getCacheSize(): number { return this.cache.size; }
}

// Extrinsic context: position (not shared)
class TextRenderer {
  constructor(private factory: CharacterFactory) {}

  renderText(text: string, font: string, size: number, startX: number, y: number): string {
    let x = startX;
    let output = "";
    for (const char of text) {
      const flyweight = this.factory.getCharacter(char, font, size);
      output += flyweight.render(x, y) + "\n";
      x += size * 0.6; // approximate width
    }
    return output;
  }
}

// Usage: render 10000 characters
const factory = new CharacterFactory();
const renderer = new TextRenderer(factory);

// Without flyweight: 10000 Character objects
// With flyweight: ~30 objects (unique char+font+size)
const text = "Hello world ".repeat(1000);
const svg = renderer.renderText(text, "Arial", 12, 10, 50);
console.log(`Cache size: ${factory.getCacheSize()}`); // ~30 unique

// Estimated memory
  | Scenario | Objects | Memory |
  |----------|---------|--------|
  | Without flyweight | 12000 | 480KB |
  | With flyweight | 30 | 1.2KB |
  | Savings | 99.75% | |
```

Lessons:
  - Flyweight shares intrinsic state (char, font, size)
  - Extrinsic state (x, y) is not shared
  - The factory caches unique flyweights
  - Ideal for large quantities of similar objects
  - Use in text editors, games (tiles), SVG rendering
```

### When NOT to use flyweight?

Do not use flyweight when there are few objects (factory overhead exceeds savings), when objects are mutable (flyweight requires immutable objects), or when each object has unique state with no repetition. The factory overhead and cache Map only pay off when there is high repetition of the same intrinsic state.


End of document. Review and update quarterly.