---


contentType: patterns
slug: flyweight-pattern
title: "Flyweight Pattern"
description: "Share objects to support large numbers of fine-grained objects efficiently. A structural design pattern for memory optimization."
metaDescription: "Learn the Flyweight Pattern in Python, Java, and JavaScript. Structural design pattern for memory optimization via object sharing."
difficulty: intermediate
topics:
  - design
tags:
  - caching
  - design-pattern
  - flyweight
  - java
  - javascript
  - pattern
  - python
  - structural
relatedResources:
  - /patterns/proxy-pattern
  - /patterns/singleton-pattern
  - /patterns/composite-pattern
  - /patterns/type-object-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Flyweight Pattern in Python, Java, and JavaScript. Structural design pattern for memory optimization via object sharing."
  keywords:
    - flyweight pattern
    - design pattern
    - structural pattern
    - memory optimization
    - object sharing
    - python flyweight
    - java flyweight
    - javascript flyweight


---

# Flyweight Pattern

## Overview

The Flyweight Pattern is a structural design pattern that minimizes memory usage by sharing as much data as possible between similar objects. Instead of storing redundant state in every instance, you separate intrinsic state (shared) from extrinsic state (unique per context) and reuse flyweight objects across multiple contexts.

## When to Use

Use the Flyweight Pattern when:
- Your application uses a large number of objects that share common state. See [Object Pool](/patterns/design/abstract-factory-pattern) for reusable instance management.
- Object storage costs are high due to massive duplication. See [Caching Strategies](/recipes/performance/caching-strategies) for reducing data duplication.
- Most of an object's state can be made extrinsic (computed or passed in)
- You need to support many granular objects without exhausting memory. See [Database Indexing](/recipes/performance/database-indexing) for storage optimization techniques.
- Examples: characters in a document, tiles in a game map, icons in a UI

## Solution

### Python

```python
class TreeType:
    _cache: dict = {}

    def __init__(self, species: str, color: str, texture: str):
        self.species = species
        self.color = color
        self.texture = texture

    @classmethod
    def get(cls, species: str, color: str, texture: str):
        key = (species, color, texture)
        if key not in cls._cache:
            cls._cache[key] = cls(species, color, texture)
        return cls._cache[key]

    def render(self, x: int, y: int):
        print(f"Rendering {self.species} at ({x}, {y}) "
              f"with color={self.color}, texture={self.texture}")

class Tree:
    def __init__(self, x: int, y: int, tree_type: TreeType):
        self.x = x
        self.y = y
        self.tree_type = tree_type

    def render(self):
        self.tree_type.render(self.x, self.y)

# Usage: thousands of trees, only a few shared types
for i in range(1000):
    t = Tree(i, i, TreeType.get("Oak", "green", "bark.png"))
    t.render()

print(f"Unique tree types: {len(TreeType._cache)}")  # 1, not 1000
```

### JavaScript

```javascript
class TreeType {
  static cache = new Map();

  constructor(species, color, texture) {
    this.species = species;
    this.color = color;
    this.texture = texture;
  }

  static get(species, color, texture) {
    const key = `${species}|${color}|${texture}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, new TreeType(species, color, texture));
    }
    return this.cache.get(key);
  }

  render(x, y) {
    console.log(`Rendering ${this.species} at (${x}, ${y}) color=${this.color}`);
  }
}

class Tree {
  constructor(x, y, treeType) {
    this.x = x;
    this.y = y;
    this.treeType = treeType;
  }

  render() {
    this.treeType.render(this.x, this.y);
  }
}

// Usage
for (let i = 0; i < 1000; i++) {
  const t = new Tree(i, i, TreeType.get("Oak", "green", "bark.png"));
  t.render();
}

console.log(`Unique tree types: ${TreeType.cache.size}`); // 1, not 1000
```

### Java

```java
import java.util.HashMap;
import java.util.Map;

public class TreeType {
    private static final Map<String, TreeType> cache = new HashMap<>();

    private final String species;
    private final String color;
    private final String texture;

    private TreeType(String species, String color, String texture) {
        this.species = species;
        this.color = color;
        this.texture = texture;
    }

    public static TreeType get(String species, String color, String texture) {
        String key = species + "|" + color + "|" + texture;
        return cache.computeIfAbsent(key, k -> new TreeType(species, color, texture));
    }

    public void render(int x, int y) {
        System.out.println("Rendering " + species + " at (" + x + ", " + y + ")");
    }
}

public class Tree {
    private final int x, y;
    private final TreeType type;

    public Tree(int x, int y, TreeType type) {
        this.x = x;
        this.y = y;
        this.type = type;
    }

    public void render() {
        type.render(x, y);
    }
}

// Usage
for (int i = 0; i < 1000; i++) {
    new Tree(i, i, TreeType.get("Oak", "green", "bark.png")).render();
}
System.out.println("Unique tree types: " + TreeType.cache.size());
```

## Explanation

The Flyweight Pattern separates state into two categories:

- **Intrinsic state** (`species`, `color`, `texture`): Shared across many objects, stored inside the flyweight
- **Extrinsic state** (`x`, `y`): Unique to each context, passed in when the flyweight is used

The **Flyweight Factory** (`TreeType.get()`) manages a cache of shared flyweight instances. Instead of creating a new object for every tree, you retrieve (or create) a shared type and use it across many tree instances.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Simple Flyweight** | Single shared object per unique intrinsic state | Character glyphs, icons |
| **Unshared Flyweight** | Some instances are not cached | Rarely used, but allows flexibility |
| **Compound Flyweight** | Flyweights composed of other flyweights | Complex UI elements |
| **String Interning** | Built-in language feature | Java `String.intern()`, Python string interning |

## What Works

- **Only apply when memory pressure is real** — premature optimization adds complexity
- **Make flyweights immutable** to prevent shared state corruption
- **Use weak references** for caches if the flyweights are large and may be garbage collected
- **Profile before and after** to verify memory savings justify the complexity
- **Consider the factory as a cache** with optional eviction policies (LRU, TTL)

## Common Mistakes

- Using flyweights when the intrinsic/extrinsic split isn't clear, leading to fragile code
- Making flyweights mutable, causing shared state corruption across contexts
- Forgetting thread safety in the factory cache when accessed concurrently
- Over-engineering the factory with complex eviction logic for small datasets
- Storing extrinsic state inside the flyweight, defeating the purpose

## Frequently Asked Questions

**Q: Is Flyweight the same as a Singleton?**
A: No. [Singleton](/patterns/design/singleton-pattern) enforces exactly one instance of a class. Flyweight creates one instance per unique intrinsic state combination. A singleton is a special case where all state is shared.

**Q: When should I not use Flyweight?**
A: Avoid it when objects are few, state is mostly unique, or the memory savings don't justify the added complexity. For text rendering, see [Flyweight for Text](/patterns/design/flyweight-pattern-text). Measure first, optimize second.

**Q: How does Flyweight differ from Object Pool?**
A: Object Pool reuses objects to avoid allocation overhead. Flyweight shares objects to reduce memory footprint. Object Pool objects are typically mutable and returned to the pool; flyweights are shared simultaneously across contexts.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.


## Advanced Topics

### Scenario: Flyweight for Game Tile Rendering

```typescript
// Flyweight: share tile data across map grid
interface TileFlyweight {
  terrain: string;
  color: string;
  movementCost: number;
  isWalkable: boolean;
}

class Tile implements TileFlyweight {
  constructor(
    public terrain: string,
    public color: string,
    public movementCost: number,
    public isWalkable: boolean
  ) {}
}

class TileFactory {
  private cache = new Map<string, TileFlyweight>();
  getTile(terrain: string): TileFlyweight {
    if (!this.cache.has(terrain)) {
      const configs: Record<string, [string, number, boolean]> = {
        grass: ["#4ade80", 1, true],
        water: ["#3b82f6", 5, false],
        mountain: ["#78716c", 3, true],
        forest: ["#166534", 2, true],
        desert: ["#fbbf24", 2, true],
      };
      const [color, cost, walkable] = configs[terrain];
      this.cache.set(terrain, new Tile(terrain, color, cost, walkable));
    }
    return this.cache.get(terrain)!;
  }
  getCacheSize(): number { return this.cache.size; }
}

// Extrinsic state: position (not shared)
class MapGrid {
  private tiles: { flyweight: TileFlyweight; x: number; y: number }[] = [];
  constructor(private factory: TileFactory, private width: number, private height: number) {
    // Generate 100x100 map = 10000 tiles
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const terrain = this.randomTerrain();
        const flyweight = factory.getTile(terrain);
        this.tiles.push({ flyweight, x, y });
      }
    }
  }
  private randomTerrain(): string {
    const terrains = ["grass", "water", "mountain", "forest", "desert"];
    return terrains[Math.floor(Math.random() * terrains.length)];
  }
  render(): string {
    return this.tiles.map(t =>
      `<div style="background:${t.flyweight.color};position:absolute;left:${t.x * 8}px;top:${t.y * 8}px;width:8px;height:8px"></div>`
    ).join("");
  }
}

// Usage: 10000 tiles, only 5 flyweight objects
const factory = new TileFactory();
const map = new MapGrid(factory, 100, 100);
console.log(`Cache: ${factory.getCacheSize()}`); // 5
console.log(`Tiles: ${map.tiles.length}`); // 10000
```

Lessons:
  - Flyweight shares intrinsic state (terrain, color, cost)
  - Extrinsic state (x, y position) is stored per-tile, not shared
  - 10000 tiles with 5 flyweights: 99.95% memory savings
  - Factory caches flyweights: O(1) lookup
  - Ideal for games, maps, particle systems, text editors
```

### When does flyweight NOT make sense?

Do not use flyweight when there are few objects (overhead exceeds savings), when each object has unique state (no sharing possible), or when objects are mutable (flyweight requires immutability). If you have 100 tiles with 90 unique terrains, the factory overhead is not worth it. Flyweight pays off when the ratio of objects to unique intrinsic states is high (e.g: 10000 tiles, 5 terrains).
