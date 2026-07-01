---
contentType: patterns
slug: type-object-pattern
title: "Type Object Pattern"
description: "Define game object types as runtime data rather than hard-coding them as classes, enabling designers to create new entity variants without recompiling the codebase."
metaDescription: "Learn the Type Object Pattern for runtime entity types in games. Examples in Python, Java and JavaScript with monster definitions, stats tables, and flyweight reuse."
difficulty: intermediate
topics:
  - design
  - architecture
tags:
  - type-object
  - pattern
  - design-pattern
  - structural
  - game-dev
  - data-driven
  - flyweight
relatedResources:
  - /patterns/design/flyweight-pattern
  - /patterns/design/prototype-pattern
  - /patterns/design/entity-component-system-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Type Object Pattern for runtime entity types in games. Examples in Python, Java and JavaScript with monster definitions, stats tables, and flyweight reuse."
  keywords:
    - type object pattern
    - design pattern
    - game dev
    - data driven
    - flyweight
---

# Type Object Pattern

## Overview

The Type Object Pattern defines game entity types (monsters, items, spells) as runtime data rather than hard-coding them as classes. Each type is represented by a shared data object, and individual instances simply reference their type. This enables designers to create new entity variants (e.g., a new monster breed) by editing data files or databases without recompiling the codebase.

This pattern bridges the gap between object-oriented class hierarchies and data-driven design. Instead of `Goblin extends Monster` and `Dragon extends Monster`, you have a single `Monster` class with a `MonsterType` reference that defines behavior, stats, and appearance.

## When to Use

Use the Type Object Pattern when:
- Entity types are defined by data (stats, appearance) rather than unique behavior
- Designers need to create new entity variants without programmer intervention
- You want to avoid combinatorial explosion of subclasses for every entity variant
- Entity instances should share type-level data to reduce memory footprint

## When to Avoid

- Each entity type has fundamentally different behavior requiring unique code paths
- A simple class hierarchy with a few types suffices
- Overhead of indirection (type lookup) is unacceptable in performance-critical paths
- The system has very few entity types with no need for runtime creation

## Solution

### Python

```python
from dataclasses import dataclass
from typing import Dict, List
import json

@dataclass
class MonsterType:
    """Shared data defining a monster breed — the 'Type Object'"""
    name: str
    base_hp: int
    base_attack: int
    base_defense: int
    sprite: str
    abilities: List[str]


class Monster:
    """Individual monster instance referencing a shared MonsterType"""
    def __init__(self, monster_type: MonsterType, level: int = 1):
        self.monster_type = monster_type
        self.level = level
        self.hp = monster_type.base_hp + (level - 1) * 10
        self.attack = monster_type.base_attack + (level - 1) * 2
        self.defense = monster_type.base_defense + (level - 1) * 1

    def describe(self) -> str:
        return f"Lv{self.level} {self.monster_type.name} (HP:{self.hp}, ATK:{self.attack}, DEF:{self.defense})"

    def use_ability(self, index: int) -> str:
        if 0 <= index < len(self.monster_type.abilities):
            return f"{self.monster_type.name} uses {self.monster_type.abilities[index]}!"
        return "No ability"


# Type registry — loaded from data files or database
class MonsterTypeRegistry:
    def __init__(self):
        self._types: Dict[str, MonsterType] = {}

    def register(self, monster_type: MonsterType):
        self._types[monster_type.name.lower()] = monster_type

    def get(self, name: str) -> MonsterType:
        return self._types.get(name.lower())

    def load_from_json(self, path: str):
        with open(path) as f:
            data = json.load(f)
        for entry in data["monsters"]:
            self.register(MonsterType(**entry))


# Usage
registry = MonsterTypeRegistry()
registry.register(MonsterType("Goblin", 30, 8, 4, "goblin.png", ["slash", "flee"]))
registry.register(MonsterType("Dragon", 200, 25, 15, "dragon.png", ["fire_breath", "tail_whip", "fly"]))
registry.register(MonsterType("Slime", 10, 2, 1, "slime.png", ["bounce"]))

# Spawn instances from type data
goblin1 = Monster(registry.get("goblin"), level=3)
goblin2 = Monster(registry.get("goblin"), level=1)
dragon = Monster(registry.get("dragon"), level=5)

print(goblin1.describe())  # Lv3 Goblin (HP:50, ATK:12, DEF:6)
print(goblin2.describe())  # Lv1 Goblin (HP:30, ATK:8, DEF:4)
print(dragon.describe())   # Lv5 Dragon (HP:240, ATK:33, DEF:19)
print(goblin1.use_ability(0))  # Goblin uses slash!
```

### Java

```java
import java.util.*;

class MonsterType {
    private final String name;
    private final int baseHp, baseAttack, baseDefense;
    private final String sprite;
    private final List<String> abilities;

    public MonsterType(String name, int baseHp, int baseAttack, int baseDefense,
                       String sprite, List<String> abilities) {
        this.name = name; this.baseHp = baseHp; this.baseAttack = baseAttack;
        this.baseDefense = baseDefense; this.sprite = sprite; this.abilities = abilities;
    }

    public String getName() { return name; }
    public int getBaseHp() { return baseHp; }
    public int getBaseAttack() { return baseAttack; }
    public int getBaseDefense() { return baseDefense; }
    public String getSprite() { return sprite; }
    public List<String> getAbilities() { return abilities; }
}

class Monster {
    private final MonsterType type;
    private final int level;
    private final int hp, attack, defense;

    public Monster(MonsterType type, int level) {
        this.type = type; this.level = level;
        this.hp = type.getBaseHp() + (level - 1) * 10;
        this.attack = type.getBaseAttack() + (level - 1) * 2;
        this.defense = type.getBaseDefense() + (level - 1) * 1;
    }

    public String describe() {
        return String.format("Lv%d %s (HP:%d, ATK:%d, DEF:%d)",
            level, type.getName(), hp, attack, defense);
    }

    public String useAbility(int index) {
        if (index >= 0 && index < type.getAbilities().size()) {
            return type.getName() + " uses " + type.getAbilities().get(index) + "!";
        }
        return "No ability";
    }
}

class MonsterTypeRegistry {
    private final Map<String, MonsterType> types = new HashMap<>();

    public void register(MonsterType type) {
        types.put(type.getName().toLowerCase(), type);
    }

    public MonsterType get(String name) {
        return types.get(name.toLowerCase());
    }
}

// Usage
MonsterTypeRegistry registry = new MonsterTypeRegistry();
registry.register(new MonsterType("Goblin", 30, 8, 4, "goblin.png",
    List.of("slash", "flee")));
registry.register(new MonsterType("Dragon", 200, 25, 15, "dragon.png",
    List.of("fire_breath", "tail_whip", "fly")));

Monster goblin = new Monster(registry.get("goblin"), 3);
Monster dragon = new Monster(registry.get("dragon"), 5);
System.out.println(goblin.describe());
System.out.println(dragon.describe());
```

### JavaScript

```javascript
class MonsterType {
  constructor(name, baseHp, baseAttack, baseDefense, sprite, abilities) {
    this.name = name;
    this.baseHp = baseHp;
    this.baseAttack = baseAttack;
    this.baseDefense = baseDefense;
    this.sprite = sprite;
    this.abilities = abilities;
  }
}

class Monster {
  constructor(monsterType, level = 1) {
    this.monsterType = monsterType;
    this.level = level;
    this.hp = monsterType.baseHp + (level - 1) * 10;
    this.attack = monsterType.baseAttack + (level - 1) * 2;
    this.defense = monsterType.baseDefense + (level - 1) * 1;
  }

  describe() {
    return `Lv${this.level} ${this.monsterType.name} (HP:${this.hp}, ATK:${this.attack}, DEF:${this.defense})`;
  }

  useAbility(index) {
    if (index >= 0 && index < this.monsterType.abilities.length) {
      return `${this.monsterType.name} uses ${this.monsterType.abilities[index]}!`;
    }
    return 'No ability';
  }
}

class MonsterTypeRegistry {
  constructor() {
    this.types = new Map();
  }

  register(monsterType) {
    this.types.set(monsterType.name.toLowerCase(), monsterType);
  }

  get(name) {
    return this.types.get(name.toLowerCase());
  }
}

// Usage
const registry = new MonsterTypeRegistry();
registry.register(new MonsterType('Goblin', 30, 8, 4, 'goblin.png', ['slash', 'flee']));
registry.register(new MonsterType('Dragon', 200, 25, 15, 'dragon.png', ['fire_breath', 'tail_whip', 'fly']));

const goblin = new Monster(registry.get('goblin'), 3);
const dragon = new Monster(registry.get('dragon'), 5);
console.log(goblin.describe());
console.log(dragon.describe());
```

## Explanation

The Type Object Pattern decouples entity identity from entity data:

- **MonsterType**: Immutable shared data defining a breed (stats, sprite, abilities)
- **Monster**: Individual instance with runtime state (level, current HP, position)
- **Registry**: Factory/lookup for types, often loaded from JSON/DB at startup

All `Goblin` monsters share the same `MonsterType` object, drastically reducing memory usage compared to storing duplicate stats in every instance.

## Variants

| Variant | Type data location | Use case |
|---------|-------------------|----------|
| **JSON-defined** | External files | Modding support, designer tools |
| **Database-driven** | SQL/NoSQL | MMOs, live service games |
| **Scripted** | Lua/Python scripts | Complex behavior per type |
| **Hybrid ECS** | Type as Component archetype | Unity DOTS, modern engines |

## What Works

- **Keep types immutable.** Modifying a shared type affects all instances unexpectedly.
- **Separate instance state from type data.** Current HP and position belong to instances; base stats belong to types.
- **Use a registry/factory.** Centralize type loading and instance creation.
- **Cache type lookups.** Avoid repeated string-to-type map lookups in hot paths.
- **Version your type data.** Schema migrations are common in long-lived games.

## Common Mistakes

- **Mutating shared type data.** Changing a type's `base_hp` retroactively buffs/nerfs all existing instances.
- **Storing instance state in the type.** An individual monster's current HP should not live in `MonsterType`.
- **Not using types at all.** Every variant becomes a subclass, creating maintenance nightmares.
- **Over-normalizing type data.** Too many tiny type objects create indirection overhead.
- **Hard-coding type names.** Use IDs or enums instead of string literals for type references.

## Real-World Examples

### RPG Entity Systems

Games like Pokemon store creature species (Bulbasaur, Charmander) as `Species` type objects with base stats, types, and learnsets. Individual Pokemon instances reference their species.

### Minecraft

Blocks and items are defined by numeric IDs referencing registries. New block types are registered at startup with shared properties, while block entities hold instance-specific state.

### Unity ScriptableObjects

Unity's `ScriptableObject` is explicitly designed for type object data. Game designers create asset files defining weapon stats, enemy configurations, and quest parameters that instances reference.

## Frequently Asked Questions

**Q: What is the difference between Type Object and Prototype?**
A: Prototype creates instances by cloning a template object. Type Object separates type data (shared) from instance data (unique). A Prototype goblin is a goblin instance you clone; a Type Object goblin references shared goblin data.

**Q: How does this relate to ECS?**
A: In ECS, archetypes serve a similar purpose to type objects, grouping entities with the same component composition. Type Object is the OOP precursor to ECS archetypes.

**Q: Can types have behavior or only data?**
A: Typically only data. Behavior lives in systems (ECS) or methods on the instance class that use type data. Embedding behavior in the type creates inheritance-like coupling.
