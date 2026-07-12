---




contentType: patterns
slug: entity-component-system-pattern
title: "Entity-Component-System (ECS) Pattern"
description: "Compose entities from pure data components and process them with systems, enabling high-performance and flexible game object architecture without deep inheritance."
metaDescription: "Learn the ECS Pattern for flexible game and simulation architecture. Examples in Python, Java, and JavaScript with entities, components, and systems."
difficulty: advanced
topics:
  - design
tags:
  - entity-component-system
  - pattern
  - design-pattern
  - structural
  - ecs
  - game-dev
  - composition
  - performance
relatedResources:
  - /patterns/mixin-pattern
  - /patterns/composite-pattern
  - /patterns/facade-pattern
  - /patterns/type-object-pattern
  - /patterns/value-object-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the ECS Pattern for flexible game and simulation architecture. Examples in Python, Java, and JavaScript with entities, components, and systems."
  keywords:
    - entity component system
    - ecs pattern
    - design pattern
    - game dev
    - composition




---

# Entity-Component-System (ECS) Pattern

## Overview

The Entity-Component-System (ECS) Pattern is an architectural pattern used primarily in game development and simulations. It separates objects into three concepts: **Entities** (lightweight IDs that represent objects), **Components** (pure data containers with no behavior), and **Systems** (processes that operate on entities with specific components).

ECS favors composition over inheritance. Instead of a deep class hierarchy like `Monster extends Creature extends Actor`, a monster is simply an entity with a `PositionComponent`, a `HealthComponent`, and a `RenderComponent`. Systems then process all entities that have the required components.

This architecture enables cache-friendly data layouts, easy serialization, and live behavior modification at runtime.

## When to Use


- For alternatives, see [Eager Loading Pattern](/patterns/eager-loading-pattern/).

Use the ECS Pattern when:
- Entities have many orthogonal properties that do not fit a clean inheritance tree
- You need to query and process groups of entities by their capabilities
- Performance is critical and cache-friendly data layouts matter
- Behavior needs to be added and removed live at runtime

## When to Avoid

- Simple applications where plain objects and methods are sufficient
- When the overhead of component lookups and system iteration exceeds the benefit
- Projects where the team is unfamiliar with data-oriented design
- UI applications where traditional MVC/MVVM is more appropriate

## Solution

### Python

```python
from dataclasses import dataclass, field
from typing import Dict, List, Set, Type, Any
from uuid import uuid4

# Components (pure data)
@dataclass
class PositionComponent:
    x: float = 0.0
    y: float = 0.0

@dataclass
class VelocityComponent:
    vx: float = 0.0
    vy: float = 0.0

@dataclass
class HealthComponent:
    hp: int = 100
    max_hp: int = 100

# Entity is just an ID
EntityId = str

class World:
    def __init__(self):
        self._entities: Dict[EntityId, Dict[Type, Any]] = {}
        self._systems: List['System'] = []

    def create_entity(self) -> EntityId:
        eid = str(uuid4())
        self._entities[eid] = {}
        return eid

    def add_component(self, entity: EntityId, component: Any):
        self._entities[entity][type(component)] = component

    def get_component(self, entity: EntityId, component_type: Type) -> Any:
        return self._entities[entity].get(component_type)

    def query(self, *component_types: Type) -> List[EntityId]:
        return [
            eid for eid, comps in self._entities.items()
            if all(ct in comps for ct in component_types)
        ]

    def add_system(self, system: 'System'):
        self._systems.append(system)

    def update(self, dt: float):
        for system in self._systems:
            system.update(self, dt)


class System:
    def update(self, world: World, dt: float):
        raise NotImplementedError

class MovementSystem(System):
    def update(self, world: World, dt: float):
        for eid in world.query(PositionComponent, VelocityComponent):
            pos = world.get_component(eid, PositionComponent)
            vel = world.get_component(eid, VelocityComponent)
            pos.x += vel.vx * dt
            pos.y += vel.vy * dt

class DamageSystem(System):
    def update(self, world: World, dt: float):
        for eid in world.query(HealthComponent):
            health = world.get_component(eid, HealthComponent)
            if health.hp <= 0:
                print(f"Entity {eid} destroyed")


# Usage
world = World()
world.add_system(MovementSystem())
world.add_system(DamageSystem())

player = world.create_entity()
world.add_component(player, PositionComponent(0, 0))
world.add_component(player, VelocityComponent(5, 0))
world.add_component(player, HealthComponent(100, 100))

world.update(1.0)
```

### Java

```java
import java.util.*;

class PositionComponent {
    float x, y;
    PositionComponent(float x, float y) { this.x = x; this.y = y; }
}

class VelocityComponent {
    float vx, vy;
    VelocityComponent(float vx, float vy) { this.vx = vx; this.vy = vy; }
}

class HealthComponent {
    int hp, maxHp;
    HealthComponent(int hp, int maxHp) { this.hp = hp; this.maxHp = maxHp; }
}

class World {
    private final Map<UUID, Map<Class<?>, Object>> entities = new HashMap<>();
    private final List<System> systems = new ArrayList<>();

    public UUID createEntity() {
        UUID id = UUID.randomUUID();
        entities.put(id, new HashMap<>());
        return id;
    }

    public void addComponent(UUID entity, Object component) {
        entities.get(entity).put(component.getClass(), component);
    }

    @SuppressWarnings("unchecked")
    public <T> T getComponent(UUID entity, Class<T> type) {
        return (T) entities.get(entity).get(type);
    }

    public List<UUID> query(Class<?>... types) {
        List<UUID> result = new ArrayList<>();
        for (Map.Entry<UUID, Map<Class<?>, Object>> entry : entities.entrySet()) {
            boolean hasAll = true;
            for (Class<?> type : types) {
                if (!entry.getValue().containsKey(type)) {
                    hasAll = false;
                    break;
                }
            }
            if (hasAll) result.add(entry.getKey());
        }
        return result;
    }

    public void addSystem(System system) { systems.add(system); }

    public void update(float dt) {
        for (System system : systems) system.update(this, dt);
    }
}

abstract class System {
    abstract void update(World world, float dt);
}

class MovementSystem extends System {
    void update(World world, float dt) {
        for (UUID eid : world.query(PositionComponent.class, VelocityComponent.class)) {
            PositionComponent pos = world.getComponent(eid, PositionComponent.class);
            VelocityComponent vel = world.getComponent(eid, VelocityComponent.class);
            pos.x += vel.vx * dt;
            pos.y += vel.vy * dt;
        }
    }
}

// Usage
World world = new World();
world.addSystem(new MovementSystem());

UUID player = world.createEntity();
world.addComponent(player, new PositionComponent(0, 0));
world.addComponent(player, new VelocityComponent(5, 0));
world.addComponent(player, new HealthComponent(100, 100));

world.update(1.0f);
```

### JavaScript

```javascript
class PositionComponent {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
}

class VelocityComponent {
  constructor(vx = 0, vy = 0) {
    this.vx = vx;
    this.vy = vy;
  }
}

class HealthComponent {
  constructor(hp = 100, maxHp = 100) {
    this.hp = hp;
    this.maxHp = maxHp;
  }
}

class World {
  constructor() {
    this.entities = new Map();
    this.systems = [];
  }

  createEntity() {
    const id = crypto.randomUUID();
    this.entities.set(id, new Map());
    return id;
  }

  addComponent(entity, component) {
    this.entities.get(entity).set(component.constructor, component);
  }

  getComponent(entity, componentType) {
    return this.entities.get(entity).get(componentType);
  }

  query(...componentTypes) {
    const result = [];
    for (const [eid, components] of this.entities) {
      if (componentTypes.every(type => components.has(type))) {
        result.push(eid);
      }
    }
    return result;
  }

  addSystem(system) {
    this.systems.push(system);
  }

  update(dt) {
    for (const system of this.systems) {
      system.update(this, dt);
    }
  }
}

class MovementSystem {
  update(world, dt) {
    for (const eid of world.query(PositionComponent, VelocityComponent)) {
      const pos = world.getComponent(eid, PositionComponent);
      const vel = world.getComponent(eid, VelocityComponent);
      pos.x += vel.vx * dt;
      pos.y += vel.vy * dt;
    }
  }
}

// Usage
const world = new World();
world.addSystem(new MovementSystem());

const player = world.createEntity();
world.addComponent(player, new PositionComponent(0, 0));
world.addComponent(player, new VelocityComponent(5, 0));
world.addComponent(player, new HealthComponent(100, 100));

world.update(1.0);
```

## Explanation

ECS architecture inverts traditional OOP:

- **Entity**: A pure identifier (UUID or integer). It has no data and no methods.
- **Component**: A struct-like data bag. `PositionComponent` has `x` and `y`. No logic.
- **System**: Contains all behavior. The `MovementSystem` iterates all entities with both `Position` and `Velocity` and updates their positions.

This separation enables:
- **Cache locality**: Systems iterate homogeneous arrays of components
- **Flexibility**: Add `FlyingComponent` to any entity at runtime
- **Serialization**: Components are plain data, easy to save and load
- **Parallelism**: Independent systems can run on separate threads

## Variants

| Variant | Storage | Use Case |
|---------|---------|----------|
| **Sparse Set** | Hash maps per component type | Live ECS with frequent additions/removals |
| **Archetype** | Group entities by component set | Unity DOTS, high-performance with millions of entities |
| **Chunk-based** | Contiguous arrays per component type | Bevy engine, optimal cache locality |
| **Event-driven** | Systems communicate via events | Decoupled systems with loose coupling |

## What Works

- **Components are pure data.** No methods, no constructors with side effects.
- **Systems have no state.** They read and write components during their update loop.
- **Use archetypes for performance.** Grouping entities by component signature eliminates per-entity hash lookups.
- **Keep systems independent.** One system should not depend on another system's internal state.
- **Prefer composition.** An enemy with a sword is an entity + `EnemyTag` + `WeaponComponent`, not a class hierarchy.

## Common Mistakes

- **Putting logic in components.** Components are data. Behavior belongs in systems.
- **Entity as a class with methods.** An entity should be nothing more than an ID.
- **System-to-system dependencies.** Systems should communicate through component data, not direct calls.
- **Naive storage.** Storing components in per-entity hash maps kills cache locality. Use archetypes or SoA.
- **Over-engineering simple games.** A platformer with 10 objects does not need ECS.

## Real-World Examples

### Unity DOTS

Unity's Data-Oriented Tech Stack (DOTS) uses archetype-based ECS to process millions of entities with cache-friendly memory layouts.

### Bevy Engine

Rust game engine built entirely on ECS. Systems are Rust functions with component queries as parameters.

### Flecs

A C/C++ ECS framework focused on performance and growth. Used in games and simulations requiring millions of entities.

## Frequently Asked Questions

**Q: What is the difference between ECS and traditional OOP?**
A: OOP bundles data and behavior in classes. ECS separates them entirely: data in components, behavior in systems, identity in entities.

**Q: Can ECS be used outside game development?**
A: Yes. Simulations, CAD tools, and data pipelines benefit from ECS when entities have many orthogonal properties and batch processing is important.

**Q: How do systems communicate with each other?**
A: Through component state (one system writes, another reads) or through an event queue where systems publish and subscribe to events.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
