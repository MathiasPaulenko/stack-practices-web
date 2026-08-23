---
contentType: patterns
slug: flyweight-pattern
title: "Flyweight Pattern: Shared Objects for Memory Efficiency"
description: "Use the Flyweight pattern to share object state and cut memory usage. See Python, JavaScript, and Java examples with factory caching and real trade-offs."
metaDescription: "Use the Flyweight pattern to share object state and cut memory usage. See Python, JavaScript, and Java examples with factory caching and real trade-offs."
difficulty: intermediate
topics:
  - design
tags:
  - design-pattern
  - flyweight
  - structural
  - optimization
  - caching
  - python
  - javascript
  - java
relatedResources:
  - /patterns/proxy-pattern
  - /patterns/singleton-pattern
  - /patterns/composite-pattern
  - /patterns/type-object-pattern
  - /patterns/object-pool-pattern
  - /patterns/factory-pattern
lastUpdated: "2026-08-23"
publishedAt: "2026-06-12"
author: Mathias Paulenko
seo:
  metaDescription: "Use the Flyweight pattern to share object state and cut memory usage. See Python, JavaScript, and Java examples with factory caching and real trade-offs."
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

## Overview

Flyweight is a structural pattern that cuts memory usage by sharing data between similar objects. Rather than
storing redundant state in every instance, you split it into *intrinsic* state (shared, stored inside the
flyweight) and *extrinsic* state (unique to each context, passed in). A handful of flyweight objects then serves
a large number of contexts.

## When to Use

Reach for the Flyweight pattern when your application creates a huge number of objects that share the same
internal state. It also fits when memory pressure is real and you can measure it, not just assume it, and when
most of an object's state can be moved out and passed in at use time. Typical examples include characters in a
document, tiles in a game map, icons in a UI, or product SKUs in a catalog.

## When to Avoid

Skip it when objects are few or mostly unique. The factory and lookup overhead will eat your savings. Also
avoid it when objects must be mutable per context; flyweights are meant to be shared, so they should stay
immutable. Skip it if the memory savings aren't large enough to justify the added complexity. Measure first.

## Solution

The classic implementation uses a factory that caches flyweights by their intrinsic state.

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

for (int i = 0; i < 1000; i++) {
    new Tree(i, i, TreeType.get("Oak", "green", "bark.png")).render();
}
System.out.println("Unique tree types: " + TreeType.cache.size());
```

## Explanation

Flyweight splits object state into two groups. Intrinsic state — values such as `species`, `color`, and
`texture` — is shared and stored inside the flyweight, and it doubles as the cache key. Extrinsic state, such as
`x` and `y`, is context-specific and passed in when the flyweight is used.

The **Flyweight Factory** (`TreeType.get()`) owns a cache of shared flyweight instances. You don't need a new
object for each tree. Instead, ask the factory for the right type and reuse it across many tree objects. That
keeps memory usage roughly proportional to the number of unique intrinsic states, not the number of objects.

## Variants

The simple flyweight is the most common form: one shared object per unique intrinsic state. It fits character
glyphs, UI icons, and product catalog entries. An unshared flyweight isn't cached for every instance, which
leaves room for odd edge cases. A compound flyweight combines other flyweights into a larger one,
useful for complex UI components. String interning is a built-in example. Java's `String.intern()` and Python's
automatic string interning apply the same idea to text.

## Best Practices

Only apply this pattern after measuring real memory pressure. Premature optimization just adds complexity. Keep
flyweights immutable so one context can't mess up shared state for everyone. For large flyweights,
use weak references or an eviction policy such as LRU or TTL so the cache can release memory. Run the profiler
before and after to confirm the savings justify the extra code. Treat the factory as a cache, not a service
locator, and
keep its API focused on creating or retrieving flyweights.

## Common Mistakes

Using flyweights when the intrinsic/extrinsic split is unclear produces fragile code. Mutable flyweights cause
shared state corruption across contexts. Forgetting thread safety in the factory cache breaks concurrent access.
Over-engineering the factory with complex eviction logic for small datasets is usually not worth it. Putting
extrinsic state inside the flyweight defeats the whole purpose.

## FAQ

### Is Flyweight the same as a Singleton?

No. [Singleton](/patterns/singleton-pattern/) forces a class to have a single instance. Flyweight makes one
instance for each unique combination of intrinsic state. Singleton is the extreme case where every bit of state is
shared.

### When should I not use Flyweight?

Avoid it when objects are few, state is mostly unique, or the memory savings don't justify the added
complexity. Measure first, optimize second. Text rendering is a special case; see [Flyweight for Text](/patterns/flyweight-pattern-text/).

### How does Flyweight differ from an Object Pool?

An [Object Pool](/patterns/object-pool-pattern/) reuses instances to avoid the cost of allocation. Flyweight
tries to shrink the memory footprint by sharing objects. Pool objects are usually mutable and returned to the
pool; flyweights are shared simultaneously across contexts.

### Can I use Flyweight with mutable objects?

Only if the mutable part is extrinsic and kept outside the flyweight. If the shared object itself changes,
every context that uses it ends up in danger. Keep the flyweight immutable.

### Is Flyweight worth it for small projects?

Usually not. With only a few objects, the factory overhead can exceed the savings. Start simple and introduce
Flyweight when you actually feel memory pressure.
