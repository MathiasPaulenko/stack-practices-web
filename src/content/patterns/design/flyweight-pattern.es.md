---
contentType: patterns
slug: flyweight-pattern
title: "Patrón Flyweight"
description: "Comparte objetos para soportar eficientemente grandes cantidades de objetos de grano fino. Un patrón estructural para optimización de memoria."
metaDescription: "Aprende el Patrón Flyweight en Python, Java y JavaScript. Patrón estructural para optimización de memoria mediante compartición de objetos."
difficulty: intermediate
topics:
  - design
tags:
  - flyweight
  - patron
  - patron-de-diseno
  - estructural
  - optimizacion-de-memoria
  - caching
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/proxy-pattern
  - /patterns/design/singleton-pattern
  - /patterns/design/composite-pattern
lastUpdated: "2026-06-12"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Flyweight en Python, Java y JavaScript. Patrón estructural para optimización de memoria mediante compartición de objetos."
  keywords:
    - patron flyweight
    - patron de diseno
    - patron estructural
    - optimizacion de memoria
    - comparticion de objetos
    - python flyweight
    - java flyweight
    - javascript flyweight
---

# Patrón Flyweight

## Visión General

El Patrón Flyweight es un patrón de diseño estructural que minimiza el uso de memoria compartiendo la mayor cantidad de datos posible entre objetos similares. En lugar de almacenar estado redundante en cada instancia, separas el estado intrínseco (compartido) del estado extrínseco (único por contexto) y reutilizas objetos flyweight a través de múltiples contextos.

## Cuándo Usarlo

Usa el Patrón Flyweight cuando:
- Tu aplicación usa un gran número de objetos que comparten estado común
- Los costos de almacenamiento de objetos son altos debido a duplicación masiva
- La mayor parte del estado de un objeto puede hacerse extrínseco (computado o pasado)
- Necesitas soportar muchos objetos granulares sin agotar la memoria
- Ejemplos: caracteres en un documento, baldosas en un mapa de juego, íconos en una UI

## Solución

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
        print(f"Renderizando {self.species} en ({x}, {y}) "
              f"con color={self.color}, textura={self.texture}")

class Tree:
    def __init__(self, x: int, y: int, tree_type: TreeType):
        self.x = x
        self.y = y
        self.tree_type = tree_type

    def render(self):
        self.tree_type.render(self.x, self.y)

# Uso: miles de árboles, solo unos pocos tipos compartidos
for i in range(1000):
    t = Tree(i, i, TreeType.get("Oak", "green", "bark.png"))
    t.render()

print(f"Tipos de árbol únicos: {len(TreeType._cache)}")  # 1, no 1000
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
    console.log(`Renderizando ${this.species} en (${x}, ${y}) color=${this.color}`);
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

// Uso
for (let i = 0; i < 1000; i++) {
  const t = new Tree(i, i, TreeType.get("Oak", "green", "bark.png"));
  t.render();
}

console.log(`Tipos de árbol únicos: ${TreeType.cache.size}`); // 1, no 1000
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
        System.out.println("Renderizando " + species + " en (" + x + ", " + y + ")");
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

// Uso
for (int i = 0; i < 1000; i++) {
    new Tree(i, i, TreeType.get("Oak", "green", "bark.png")).render();
}
System.out.println("Tipos de árbol únicos: " + TreeType.cache.size());
```

## Explicación

El Patrón Flyweight separa el estado en dos categorías:

- **Estado intrínseco** (`species`, `color`, `texture`): Compartido entre muchos objetos, almacenado dentro del flyweight
- **Estado extrínseco** (`x`, `y`): Único para cada contexto, pasado cuando se usa el flyweight

La **Fábrica Flyweight** (`TreeType.get()`) gestiona un cache de instancias flyweight compartidas. En lugar de crear un nuevo objeto por cada árbol, recuperas (o creas) un tipo compartido y lo usas a través de muchas instancias de árbol.

## Variantes

| Variante | Descripción | Caso de Uso |
|----------|-------------|-------------|
| **Flyweight Simple** | Un solo objeto compartido por estado intrínseco único | Glifos de caracteres, íconos |
| **Flyweight No Compartido** | Algunas instancias no se cachean | Raramente usado, pero permite flexibilidad |
| **Flyweight Compuesto** | Flyweights compuestos de otros flyweights | Elementos UI complejos |
| **Internamiento de Strings** | Característica incorporada del lenguaje | `String.intern()` de Java, internamiento de Python |

## Buenas Prácticas

- **Aplica solo cuando la presión de memoria sea real** — la optimización prematura agrega complejidad
- **Haz los flyweights inmutables** para prevenir corrupción de estado compartido
- **Usa referencias débiles** para caches si los flyweights son grandes y pueden ser recolectados
- **Perfila antes y después** para verificar que los ahorros de memoria justifiquen la complejidad
- **Considera la fábrica como un cache** con políticas de evicción opcionales (LRU, TTL)

## Errores Comunes

- Usar flyweights cuando la división intrínseca/extrínseca no está clara, llevando a código frágil
- Hacer flyweights mutables, causando corrupción de estado compartido entre contextos
- Olvidar la seguridad de hilos en el cache de la fábrica cuando se accede concurrentemente
- Sobre-ingeniería de la fábrica con lógica de evicción compleja para conjuntos pequeños
- Almacenar estado extrínseco dentro del flyweight, derrotando el propósito

## Preguntas Frecuentes

**P: ¿Es Flyweight lo mismo que Singleton?**
R: No. Singleton fuerza exactamente una instancia de una clase. Flyweight crea una instancia por combinación única de estado intrínseco. Un singleton es un caso especial donde todo el estado es compartido.

**P: ¿Cuándo no debería usar Flyweight?**
R: Evítalo cuando los objetos sean pocos, el estado sea mayoritariamente único, o los ahorros de memoria no justifiquen la complejidad añadida. Mide primero, optimiza después.

**P: ¿Cómo se diferencia Flyweight del Pool de Objetos?**
R: El Pool de Objetos reutiliza objetos para evitar overhead de asignación. Flyweight comparte objetos para reducir el uso de memoria. Los objetos del pool son típicamente mutables y devueltos al pool; los flyweights se comparten simultáneamente entre contextos.
