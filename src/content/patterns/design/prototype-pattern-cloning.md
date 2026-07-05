---
contentType: patterns
slug: prototype-pattern-cloning
title: "Prototype Pattern for Object Cloning and Configuration Templates"
description: "Create new objects by copying existing ones, allowing pre-configured templates and avoiding subclass explosion when object creation is expensive"
metaDescription: "Prototype pattern for object cloning. Create objects by copying existing ones with pre-configured templates to avoid expensive initialization and subclass explosion."
difficulty: intermediate
topics:
  - design
tags:
  - prototype
  - creational-patterns
  - typescript
  - design-pattern
  - design-patterns
relatedResources:
  - /patterns/design/builder-pattern
  - /patterns/design/abstract-factory-cross-platform
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Prototype pattern for object cloning. Create objects by copying existing ones with pre-configured templates to avoid expensive initialization and subclass explosion."
  keywords:
    - prototype pattern
    - object cloning
    - configuration templates
    - creational patterns
    - deep copy
---

# Prototype Pattern for Object Cloning and Configuration Templates

The [Prototype](/patterns/design/prototype-pattern) pattern creates new objects by copying existing ones. Instead of building objects from scratch with constructors, you clone a prototype and optionally customize it. This is capable when object initialization is expensive, when many similar configurations exist, or when the exact type of object is not known until runtime.

## When to Use This

- Object creation is costly (database connections, parsed configurations). See [Factory Pattern](/patterns/design/factory-pattern) for creation patterns.
- Many similar object variants exist that differ only slightly. See [Builder Pattern](/patterns/design/builder-pattern) for configurable objects.
- The concrete class to instantiate is determined at runtime. See [Strategy Pattern](/patterns/design/strategy-pattern) for runtime selection.

## Problem

A game spawns hundreds of enemy units with the same base stats but slight variations. Creating each unit from scratch requires reloading assets and parsing configurations repeatedly.

## Solution

```typescript
// prototype/Cloneable.ts
interface Cloneable<T> {
  clone(): T;
}

class EnemyUnit implements Cloneable<EnemyUnit> {
  private health: number;
  private speed: number;
  private weapon: string;
  private abilities: string[];

  constructor(
    health: number,
    speed: number,
    weapon: string,
    abilities: string[]
  ) {
    this.health = health;
    this.speed = speed;
    this.weapon = weapon;
    // Deep copy to prevent shared mutable state
    this.abilities = [...abilities];
  }

  clone(): EnemyUnit {
    return new EnemyUnit(
      this.health,
      this.speed,
      this.weapon,
      [...this.abilities]
    );
  }

  setHealth(health: number): EnemyUnit {
    this.health = health;
    return this;
  }

  addAbility(ability: string): EnemyUnit {
    this.abilities.push(ability);
    return this;
  }

  describe(): string {
    return `${this.health}HP, ${this.speed}SPD, ${this.weapon}, [${this.abilities.join(', ')}]`;
  }
}

// Pre-configured prototypes
const goblinPrototype = new EnemyUnit(30, 8, 'dagger', ['sneak']);
const orcPrototype = new EnemyUnit(80, 4, 'axe', ['rage', 'charge']);

// Clone and customize
const goblinScout = goblinPrototype.clone().setHealth(25).addAbility('scout');
const goblinBoss = goblinPrototype.clone().setHealth(60).addAbility('command');
const orcBerserker = orcPrototype.clone().setHealth(100);

console.log(goblinScout.describe());
console.log(goblinBoss.describe());
console.log(orcBerserker.describe());
```

## Variation: Configuration Template Registry

```typescript
// prototype/TemplateRegistry.ts
class DocumentTemplate implements Cloneable<DocumentTemplate> {
  private content = '';
  private styles: Record<string, string> = {};
  private metadata: Record<string, unknown> = {};

  constructor() {}

  setContent(content: string): DocumentTemplate {
    this.content = content;
    return this;
  }

  setStyles(styles: Record<string, string>): DocumentTemplate {
    this.styles = { ...styles };
    return this;
  }

  setMetadata(metadata: Record<string, unknown>): DocumentTemplate {
    this.metadata = { ...metadata };
    return this;
  }

  clone(): DocumentTemplate {
    return new DocumentTemplate()
      .setContent(this.content)
      .setStyles({ ...this.styles })
      .setMetadata({ ...this.metadata });
  }
}

class TemplateRegistry {
  private templates = new Map<string, DocumentTemplate>();

  register(name: string, template: DocumentTemplate): void {
    this.templates.set(name, template);
  }

  create(name: string): DocumentTemplate {
    const template = this.templates.get(name);
    if (!template) throw new Error(`Unknown template: ${name}`);
    return template.clone();
  }
}

// Usage
const registry = new TemplateRegistry();
registry.register('report', new DocumentTemplate()
  .setContent('## Report\n\nDate: {{date}}')
  .setStyles({ font: 'Arial', size: '12pt' }));

registry.register('invoice', new DocumentTemplate()
  .setContent('## Invoice #{{id}}\n\nTotal: {{total}}')
  .setStyles({ font: 'Times', size: '10pt' }));

const report = registry.create('report');
```

## How It Works

1. **Prototype** declares a `clone` method
2. **Concrete Prototype** implements deep cloning to avoid shared mutable state
3. **Client** clones prototypes and optionally customizes the copy
4. **Registry** (optional) holds named prototypes for convenient access

## Production Considerations

- Always deep-clone nested objects and arrays to prevent accidental sharing
- Use `structuredClone` in modern JavaScript for deep copies of plain objects
- For circular references, implement custom cloning logic

## Common Mistakes

- Shallow cloning mutable nested state, causing side effects across instances
- Not implementing `clone` in subclasses, breaking the pattern chain
- Using Prototype when a simple constructor or Factory Method is cleaner

## FAQ

**Q: How is this different from Factory Method?**
A: [Factory Method](/patterns/design/factory-pattern) creates objects through a factory class. Prototype creates objects by copying an existing instance, preserving its state.

**Q: Can I use this with JSON?**
A: Yes. `JSON.parse(JSON.stringify(obj))` is a crude prototype clone for plain objects, but `structuredClone` is preferred for modern runtimes.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
