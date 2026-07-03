---
contentType: patterns
slug: type-object-pattern
title: "Patrón Type Object"
description: "Define tipos de entidades de juego como datos en runtime en lugar de codificarlos como clases, permitiendo a los diseñadores crear nuevas variantes sin recompilar el código."
metaDescription: "Aprende el Patrón Type Object para entidades de juego en runtime. Ejemplos en Python, Java y JavaScript con tipos, stats y flyweight."
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
  metaDescription: "Aprende el Patrón Type Object para entidades de juego en runtime. Ejemplos en Python, Java y JavaScript con tipos, stats y flyweight."
  keywords:
    - type object pattern
    - design pattern
    - game dev
    - data driven
    - flyweight
---

# Patrón Type Object

## Descripción General

El Patrón Type Object define tipos de entidades de juego (monstruos, items, hechizos) como datos en runtime en lugar de codificarlos como clases. Cada tipo es representado por un objeto de datos compartido, y las instancias individuales simplemente referencian su tipo. Esto permite a los diseñadores crear nuevas variantes de entidades (ej. una nueva raza de monstruo) editando archivos de datos o bases de datos sin recompilar el codebase.

Este patrón cierra la brecha entre jerarquías de clases orientadas a objetos y diseño basado en datos. En lugar de `Goblin extends Monster` y `Dragon extends Monster`, tienes una única clase `Monster` con una referencia `MonsterType` que define comportamiento, stats y apariencia.

## Cuándo Usar

Usa el Patrón Type Object cuando:
- Los tipos de entidad son definidos por datos (stats, apariencia) en lugar de comportamiento único
- Los diseñadores necesitan crear nuevas variantes sin intervención de programadores
- Quieres evitar la explosión combinatoria de subclases para cada variante de entidad
- Las instancias de entidad deberían compartir datos a nivel de tipo para reducir uso de memoria

## Cuándo Evitar

- Cada tipo de entidad tiene comportamiento fundamentalmente diferente que requiere paths de código únicos
- Una simple jerarquía de clases con pocos tipos basta
- El overhead de indirección (lookup de tipo) es inaceptable en paths críticos de performance
- El sistema tiene muy pocos tipos de entidad sin necesidad de creación en runtime

## Solución

### Python

```python
from dataclasses import dataclass
from typing import Dict, List
import json

@dataclass
class MonsterType:
    """Datos compartidos definiendo una raza de monstruo — el 'Type Object'"""
    name: str
    base_hp: int
    base_attack: int
    base_defense: int
    sprite: str
    abilities: List[str]


class Monster:
    """Instancia individual de monstruo referenciando un MonsterType compartido"""
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
            return f"{self.monster_type.name} usa {self.monster_type.abilities[index]}!"
        return "Sin habilidad"


# Registro de tipos — cargado desde archivos de datos o base de datos
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


# Uso
registry = MonsterTypeRegistry()
registry.register(MonsterType("Goblin", 30, 8, 4, "goblin.png", ["slash", "flee"]))
registry.register(MonsterType("Dragon", 200, 25, 15, "dragon.png", ["fire_breath", "tail_whip", "fly"]))
registry.register(MonsterType("Slime", 10, 2, 1, "slime.png", ["bounce"]))

# Spawnear instancias desde datos de tipo
goblin1 = Monster(registry.get("goblin"), level=3)
goblin2 = Monster(registry.get("goblin"), level=1)
dragon = Monster(registry.get("dragon"), level=5)

print(goblin1.describe())  # Lv3 Goblin (HP:50, ATK:12, DEF:6)
print(goblin2.describe())  # Lv1 Goblin (HP:30, ATK:8, DEF:4)
print(dragon.describe())   # Lv5 Dragon (HP:240, ATK:33, DEF:19)
print(goblin1.use_ability(0))  # Goblin usa slash!
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
            return type.getName() + " usa " + type.getAbilities().get(index) + "!";
        }
        return "Sin habilidad";
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

// Uso
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
      return `${this.monsterType.name} usa ${this.monsterType.abilities[index]}!`;
    }
    return 'Sin habilidad';
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

// Uso
const registry = new MonsterTypeRegistry();
registry.register(new MonsterType('Goblin', 30, 8, 4, 'goblin.png', ['slash', 'flee']));
registry.register(new MonsterType('Dragon', 200, 25, 15, 'dragon.png', ['fire_breath', 'tail_whip', 'fly']));

const goblin = new Monster(registry.get('goblin'), 3);
const dragon = new Monster(registry.get('dragon'), 5);
console.log(goblin.describe());
console.log(dragon.describe());
```

## Explicación

El Patrón Type Object desacopla identidad de entidad de datos de entidad:

- **MonsterType**: Datos inmutables compartidos definiendo una raza (stats, sprite, habilidades)
- **Monster**: Instancia individual con estado en runtime (nivel, HP actual, posición)
- **Registry**: Factory/lookup para tipos, a menudo cargado desde JSON/DB al inicio

Todos los monstruos `Goblin` comparten el mismo objeto `MonsterType`, reduciendo drásticamente el uso de memoria comparado con almacenar stats duplicados en cada instancia.

## Variantes

| Variante | Ubicación de datos de tipo | Caso de uso |
|----------|---------------------------|-------------|
| **JSON-defined** | Archivos externos | Soporte de mods, herramientas de diseñador |
| **Database-driven** | SQL/NoSQL | MMOs, juegos de servicio en vivo |
| **Scripted** | Scripts Lua/Python | Comportamiento complejo por tipo |
| **Hybrid ECS** | Tipo como Component archetype | Unity DOTS, motores modernos |

## Lo que funciona

- **Mantén los tipos inmutables.** Modificar un tipo compartido afecta a todas las instancias inesperadamente.
- **Separa estado de instancia de datos de tipo.** El HP actual y posición pertenecen a instancias; los stats base pertenecen a los tipos.
- **Usa un registry/factory.** Centraliza la carga de tipos y creación de instancias.
- **Cachea lookups de tipo.** Evita búsquedas repetidas de map string-to-type en paths hot.
- **Versiona tus datos de tipo.** Las migraciones de schema son comunes en juegos de larga vida.

## Errores Comunes

- **Mutar datos de tipo compartidos.** Cambiar el `base_hp` de un tipo buffea/nerfea retroactivamente todas las instancias existentes.
- **Almacenar estado de instancia en el tipo.** El HP actual de un monstruo individual no debería vivir en `MonsterType`.
- **No usar tipos en absoluto.** Cada variante se convierte en subclase, creando pesadillas de mantenimiento.
- **Sobre-normalizar datos de tipo.** Demasiados objetos de tipo pequeños crean overhead de indirección.
- **Codificar nombres de tipo en hardcode.** Usa IDs o enums en lugar de literales de string para referencias de tipo.

## Ejemplos del Mundo Real

### Sistemas de Entidades RPG

Juegos como Pokemon almacenan especies de criaturas (Bulbasaur, Charmander) como objetos `Species` con stats base, tipos y learnsets. Las instancias individuales de Pokemon referencian su especie.

### Minecraft

Bloques e items son definidos por IDs numéricos referenciando registries. Nuevos tipos de bloque son registrados al inicio con propiedades compartidas, mientras que las entidades de bloque retienen estado específico de instancia.

### Unity ScriptableObjects

Los `ScriptableObject` de Unity están diseñados explícitamente para datos de tipo object. Los diseñadores de juegos crean archivos de asset definiendo stats de armas, configuraciones de enemigos y parámetros de quests que las instancias referencian.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Type Object y Prototype?**
A: Prototype crea instancias clonando un objeto template. Type Object separa datos de tipo (compartidos) de datos de instancia (únicos). Un Prototype goblin es una instancia goblin que clonas; un Type Object goblin referencia datos goblin compartidos.

**Q: Cómo se relaciona esto con ECS?**
A: En ECS, los archetypes sirven un propósito similar a los type objects, agrupando entidades con la misma composición de componentes. Type Object es el precursor OOP de los archetypes de ECS.

**Q: Pueden los tipos tener comportamiento o solo datos?**
A: Típicamente solo datos. El comportamiento vive en sistemas (ECS) o métodos en la clase de instancia que usan datos de tipo. Incrustar comportamiento en el tipo crea acoplamiento similar a herencia.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
