---
contentType: patterns
slug: flyweight-pattern
title: "Patrón Flyweight: Objetos Compartidos para Eficiencia de Memoria"
description: "Usá el patrón Flyweight para compartir estado de objetos y reducir memoria. Ejemplos en Python, JavaScript y Java, cache de fábrica y trade-offs reales."
metaDescription: "Usá el patrón Flyweight para compartir estado de objetos y reducir memoria. Ejemplos en Python, JavaScript y Java, cache de fábrica y trade-offs reales."
difficulty: intermediate
topics:
  - design
tags:
  - patron-de-diseno
  - flyweight
  - estructural
  - optimizacion
  - cache
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
  metaDescription: "Usá el patrón Flyweight para compartir estado de objetos y reducir memoria. Ejemplos en Python, JavaScript y Java, cache de fábrica y trade-offs reales."
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

## Visión General

Flyweight es un patrón estructural que reduce el uso de memoria compartiendo datos entre objetos similares. En
lugar de almacenar estado redundante en cada instancia, separás el estado en *intrínseco* (compartido, dentro del
flyweight) y *extrínseco* (único por contexto, pasado al usarlo). Unos pocos objetos flyweight alcanzan para una
gran cantidad de contextos.

## Cuándo Usarlo

Usá el patrón Flyweight cuando tu aplicación crea una gran cantidad de objetos que comparten el mismo estado
interno. También sirve cuando la presión de memoria es real y la podés medir, no solo suponer, y cuando la mayor
parte del estado se puede mover afuera y pasarlo al momento de uso. Ejemplos típicos: caracteres en un
documento, baldosas en un mapa de juego, íconos en una UI o SKUs de productos en un catálogo.

## Cuándo Evitarlo

Evitalo cuando los objetos sean pocos o mayoritariamente únicos. El overhead de la fábrica y la búsqueda se
come el ahorro. También evitalo cuando los objetos deban ser mutables por contexto; los flyweights están
pensados para compartirse, así que deberían mantenerse inmutables. Y no lo uses si los ahorros de memoria no
justifican la complejidad agregada. Medir primero.

## Solución

La implementación clásica usa una fábrica que cachea flyweights según su estado intrínseco.

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

for (int i = 0; i < 1000; i++) {
    new Tree(i, i, TreeType.get("Oak", "green", "bark.png")).render();
}
System.out.println("Tipos de árbol únicos: " + TreeType.cache.size());
```

## Explicación

Flyweight separa el estado del objeto en dos grupos. El estado intrínseco — valores como `species`, `color` y
`texture` — es compartido y se almacena dentro del flyweight; también hace las veces de clave del cache. El
estado extrínseco, como `x` e `y`, es específico del contexto y se pasa al usar el flyweight.

La **Fábrica Flyweight** (`TreeType.get()`) tiene un cache de instancias compartidas. En lugar de crear un
objeto nuevo por cada árbol, le pedís a la fábrica el tipo adecuado y lo reutilizás en muchos objetos `Tree`. Eso
hace que el uso de memoria quede más o menos proporcional a la cantidad de estados intrínsecos únicos, no a la
cantidad de objetos.

## Variantes

La forma más común es el flyweight simple: un objeto compartido por estado intrínseco único. Sirve para glifos
de caracteres, íconos de UI y entradas de catálogo de productos. El no compartido se saltea el cache para
instancias específicas, lo que deja lugar para casos borde. El compuesto agrupa otros flyweights en uno más
grande, útil para componentes UI complejos. El internamiento de strings es un ejemplo incorporado: `String.intern()`
de Java y el internamiento automático de Python aplican la misma idea al texto.

## Mejores Prácticas

Aplicá el patrón solo después de medir presión de memoria real. La optimización prematura agrega complejidad
sin beneficio. Mantené los flyweights inmutables para que un contexto no arruine el estado compartido para todos.
Si los flyweights son grandes y querés que el cache libere memoria, usá referencias débiles o agregá una política
de evicción como LRU o TTL. Corré el profiler antes y después para confirmar que el ahorro justifica el código
extra. Tratá
la fábrica como un cache, no como un service locator, y mantené su API enfocada en crear o recuperar
flyweights.

## Errores Comunes

Usar flyweights cuando la división intrínseca/extrínseca no está clara produce código frágil. Los flyweights
mutables causan corrupción de estado compartido entre contextos. Olvidar la seguridad de hilos en el cache de
la fábrica rompe el acceso concurrente. Sobre-ingeniería de la fábrica con lógica de evicción compleja para
conjuntos pequeños raramente vale la pena. Meter estado extrínseco adentro del flyweight arruina todo el
propósito.

## Preguntas Frecuentes

### ¿Es Flyweight lo mismo que Singleton?

No. [Singleton](/patterns/singleton-pattern/) fuerza a una clase a tener una sola instancia. Flyweight genera
una instancia por cada combinación particular de estado intrínseco. Singleton es el extremo donde todo el estado
es compartido.

### ¿Cuándo no debería usar Flyweight?

Evitalo cuando los objetos sean pocos, el estado sea mayoritariamente único o los ahorros de memoria no
justifiquen la complejidad agregada. Medir primero, optimizar después. Para renderizado de texto, consultá
[Flyweight para Texto](/patterns/flyweight-pattern-text/).

### ¿Cómo se diferencia Flyweight de un Object Pool?

Un [Object Pool](/patterns/object-pool-pattern/) reutiliza instancias para evitar el costo de asignación.
Flyweight busca reducir la huella de memoria compartiendo objetos. Los objetos del pool suelen ser mutables y
vuelven al pool; los flyweights se comparten simultáneamente entre contextos.

### ¿Puedo usar Flyweight con objetos mutables?

Solo si la parte mutable es extrínseca y se mantiene fuera del flyweight. Si el objeto compartido cambia,
podés corromper todos los contextos que lo usan. Mantené el flyweight inmutable.

### ¿Vale la pena Flyweight en proyectos pequeños?

Generalmente no. Con pocos objetos, el overhead de la fábrica puede superar el ahorro. Empezá simple e
introducí Flyweight cuando realmente sientas presión de memoria.
