---




contentType: patterns
slug: entity-component-system-pattern
title: "Patrón Entity-Component-System (ECS)"
description: "Compón entidades a partir de componentes de datos puros y procésalos con sistemas, habilitando arquitectura de objetos de juego flexible y de alto rendimiento sin herencia profunda."
metaDescription: "Aprende el Patrón ECS para arquitectura de juegos y simulaciones. Ejemplos en Python, Java y JavaScript con entidades, componentes y sistemas."
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
  metaDescription: "Aprende el Patrón ECS para arquitectura de juegos y simulaciones. Ejemplos en Python, Java y JavaScript con entidades, componentes y sistemas."
  keywords:
    - entity component system
    - ecs pattern
    - design pattern
    - game dev
    - composition




---

# Patrón Entity-Component-System (ECS)

## Descripción General

El Patrón Entity-Component-System (ECS) es un patrón arquitectónico usado principalmente en desarrollo de juegos y simulaciones. Separa los objetos en tres conceptos: **Entities** (IDs livianos que representan objetos), **Components** (contenedores de datos puros sin comportamiento) y **Systems** (procesos que operan sobre entidades con componentes específicos).

ECS favorece la composición sobre la herencia. En lugar de una jerarquía de clases profunda como `Monster extends Creature extends Actor`, un monstruo es simplemente una entidad con `PositionComponent`, `HealthComponent` y `RenderComponent`. Los Systems procesan todas las entidades que tienen los componentes requeridos.

Esta arquitectura habilita layouts de datos cache-friendly, serialización fácil y modificación en vivo de comportamiento en runtime.

## Cuándo Usar


- For alternatives, see [Eager Loading Pattern](/es/patterns/eager-loading-pattern/).

Usa el Patrón ECS cuando:
- Las entidades tienen muchas propiedades ortogonales que no encajan en un árbol de herencia limpio
- Necesitas consultar y procesar grupos de entidades por sus capacidades
- El performance es crítico y layouts de datos cache-friendly importan
- El comportamiento necesita agregarse y removerse en vivo en runtime

## Cuándo Evitar

- Aplicaciones simples donde objetos y métodos comunes son suficientes
- Cuando el overhead de lookups de componentes e iteración de sistemas excede el beneficio
- Proyectos donde el equipo no está familiarizado con diseño orientado a datos
- Aplicaciones de UI donde MVC/MVVM es más apropiado

## Solución

### Python

```python
from dataclasses import dataclass, field
from typing import Dict, List, Set, Type, Any
from uuid import uuid4

# Components (datos puros)
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

# Entity es solo un ID
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


# Uso
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

// Uso
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

// Uso
const world = new World();
world.addSystem(new MovementSystem());

const player = world.createEntity();
world.addComponent(player, new PositionComponent(0, 0));
world.addComponent(player, new VelocityComponent(5, 0));
world.addComponent(player, new HealthComponent(100, 100));

world.update(1.0);
```

## Explicación

La arquitectura ECS invierte la OOP tradicional:

- **Entity**: Un identificador puro (UUID o entero). No tiene datos ni métodos.
- **Component**: Una bolsa de datos tipo struct. `PositionComponent` tiene `x` e `y`. Sin lógica.
- **System**: Contiene todo el comportamiento. El `MovementSystem` itera todas las entidades con tanto `Position` como `Velocity` y actualiza sus posiciones.

Esta separación habilita:
- **Localidad de caché**: Los sistemas iteran arrays homogéneos de componentes
- **Flexibilidad**: Agrega `FlyingComponent` a cualquier entidad en runtime
- **Serialización**: Los componentes son datos planos, fáciles de guardar y cargar
- **Paralelismo**: Sistemas independientes pueden correr en threads separados

## Variantes

| Variante | Almacenamiento | Caso de Uso |
|----------|----------------|-------------|
| **Sparse Set** | Hash maps por tipo de componente | ECS en vivo con agregaciones/eliminaciones frecuentes |
| **Archetype** | Agrupa entidades por conjunto de componentes | Unity DOTS, alto rendimiento con millones de entidades |
| **Chunk-based** | Arrays contiguos por tipo de componente | Motor Bevy, optimal cache locality |
| **Event-driven** | Sistemas se comunican vía eventos | Sistemas desacoplados con loose coupling |

## Lo que funciona

- **Los componentes son datos puros.** Sin métodos, sin constructores con side effects.
- **Los sistemas no tienen estado.** Leen y escriben componentes durante su update loop.
- **Usa archetypes para performance.** Agrupar entidades por signature de componente elimina lookups hash por entidad.
- **Mantén sistemas independientes.** Un sistema no debería depender del estado interno de otro sistema.
- **Prefiere composición.** Un enemigo con espada es una entidad + `EnemyTag` + `WeaponComponent`, no una jerarquía de clases.

## Errores Comunes

- **Poner lógica en componentes.** Los componentes son datos. El comportamiento pertenece a los sistemas.
- **Entity como clase con métodos.** Una entidad debería ser nada más que un ID.
- **Dependencias sistema-a-sistema.** Los sistemas deberían comunicarse a través de datos de componentes, no llamadas directas.
- **Almacenamiento naive.** Guardar componentes en hash maps por entidad mata la localidad de caché. Usa archetypes o SoA.
- **Over-engineering juegos simples.** Un platformer con 10 objetos no necesita ECS.

## Ejemplos del Mundo Real

### Unity DOTS

El Data-Oriented Tech Stack (DOTS) de Unity usa ECS basado en archetypes para procesar millones de entidades con layouts de memoria cache-friendly.

### Bevy Engine

Motor de juegos en Rust construido enteramente sobre ECS. Los sistemas son funciones Rust con queries de componentes como parámetros.

### Flecs

Un framework ECS C/C++ enfocado en performance y crecimiento. Usado en juegos y simulaciones que requieren millones de entidades.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre ECS y OOP tradicional?**
A: OOP agrupa datos y comportamiento en clases. ECS los separa enteramente: datos en componentes, comportamiento en sistemas, identidad en entidades.

**Q: Puede ECS usarse fuera del desarrollo de juegos?**
A: Sí. Simulaciones, herramientas CAD y pipelines de datos se benefician de ECS cuando las entidades tienen muchas propiedades ortogonales y el procesamiento batch es importante.

**Q: Cómo se comunican los sistemas entre sí?**
A: A través del estado de componentes (un sistema escribe, otro lee) o a través de una cola de eventos donde los sistemas publican y se suscriben a eventos.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
