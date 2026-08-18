---
contentType: recipes
slug: deep-clone-javascript
title: "Deep Clone de Objetos en JavaScript"
description: "Creá copias completamente independientes de objetos y arrays en JavaScript, manejando referencias circulares, Dates, Maps, Sets, typed arrays y clases custom."
metaDescription: "Deep clone en JavaScript con structuredClone, lodash, recursión manual y JSON.parse. Cubre referencias circulares, typed arrays y cuándo usar cada enfoque."
difficulty: intermediate
topics:
  - data
tags:
  - data
  - deep-clone
  - javascript
  - parsing
  - json
  - structuredclone
  - lodash
relatedResources:
  - /recipes/caching
  - /recipes/parse-json
  - /recipes/flatten-unflatten-objects
  - /recipes/call-rest-api
  - /recipes/date-formatting
  - /recipes/money-currency
lastUpdated: "2026-08-18"
publishedAt: "2026-06-11"
author: Mathias Paulenko
seo:
  metaDescription: "Deep clone en JavaScript con structuredClone, lodash, recursión manual y JSON.parse. Cubre referencias circulares, typed arrays y cuándo usar cada enfoque."
  keywords:
    - deep-clone
    - javascript
    - objetos
    - structuredclone
    - lodash
    - serializacion
    - performance
---

## Visión General

Un deep clone es una copia separada de un objeto o array, completamente
independiente del original. Los objetos anidados, arrays y tipos especiales se duplican en vez de
compartirse por referencia. En JavaScript, `=` solo copia
la referencia, así que cambios en una "copia" también afectan al original. Esta
receta muestra cómo clonar con `structuredClone`, `JSON.parse/stringify`,
Lodash y una implementación recursiva manual, y cubre referencias circulares,
`Date`, `Map`, `Set`, typed arrays y clases custom.

## Cuándo Usar

- Querés modificar una copia de estado anidado sin tocar el original, por
  ejemplo en reducers de Redux o manejo de formularios.
- Estás serializando objetos para pasarlos por `postMessage`, IndexedDB o Web
  Workers.
- Estás construyendo stacks de undo/redo y necesitás snapshots inmutables.
- Necesitás una copia defensiva de argumentos de funciones o respuestas de API
  antes de transformarlas. Consultá [Llamar REST API](/recipes/call-rest-api/) para
  patrones relacionados.

## Solución

### `structuredClone` (recomendado)

```javascript
const original = {
  name: "Alice",
  dates: [new Date("2024-01-01"), new Date("2024-06-01")],
  map: new Map([["key", "value"]]),
  set: new Set([1, 2, 3]),
  buffer: new Uint8Array([1, 2, 3]),
  nested: { a: 1, b: { c: 2 } }
};

const clone = structuredClone(original);

// Las mutaciones no afectan el original
clone.nested.b.c = 999;
clone.dates[0] = new Date("2025-01-01");
console.log(original.nested.b.c); // 2
console.log(original.dates[0]);   // 2024-01-01

// Las referencias circulares también funcionan
const circular = { name: "self" };
circular.self = circular;
const circularClone = structuredClone(circular);
```

### `JSON.parse` (rápido pero limitado)

```javascript
function jsonClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Funciona para: objetos planos, arrays, strings, números, booleans, null
// Pierde: Dates (se convierten a strings), Functions, undefined, Maps, Sets,
// RegExp, referencias circulares y typed arrays
const limited = jsonClone({ a: 1, b: [2, 3], c: { d: 4 } });
```

### Clone recursivo manual con soporte para referencias circulares

```javascript
function deepClone(obj, cache = new WeakMap()) {
  // Primitivos y funciones
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Function) return obj; // o throw

  // Referencia circular
  if (cache.has(obj)) return cache.get(obj);

  // Date
  if (obj instanceof Date) return new Date(obj.getTime());

  // RegExp
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);

  // Map
  if (obj instanceof Map) {
    const copy = new Map();
    cache.set(obj, copy);
    obj.forEach((v, k) => copy.set(deepClone(k, cache), deepClone(v, cache)));
    return copy;
  }

  // Set
  if (obj instanceof Set) {
    const copy = new Set();
    cache.set(obj, copy);
    obj.forEach(v => copy.add(deepClone(v, cache)));
    return copy;
  }

  // Typed arrays
  if (ArrayBuffer.isView(obj)) {
    const Constructor = obj.constructor;
    return new Constructor(obj);
  }

  // Array
  if (Array.isArray(obj)) {
    const copy = [];
    cache.set(obj, copy);
    obj.forEach((v, i) => copy[i] = deepClone(v, cache));
    return copy;
  }

  // Plain object (preserva prototipo)
  const copy = Object.create(Object.getPrototypeOf(obj));
  cache.set(obj, copy);
  Object.keys(obj).forEach(k => copy[k] = deepClone(obj[k], cache));
  Object.getOwnPropertySymbols(obj).forEach(s => copy[s] = deepClone(obj[s], cache));

  return copy;
}

// Uso
const obj = {
  a: 1,
  b: { c: 2 },
  d: new Date("2024-01-01"),
  e: new Map([["x", { y: 3 }]]),
  f: [1, 2, { z: 4 }]
};
obj.circular = obj;

const cloned = deepClone(obj);
console.log(cloned.b === obj.b);         // false
console.log(cloned.circular === obj);    // false
console.log(cloned.circular === cloned); // true
```

### Lodash

```javascript
import cloneDeep from "lodash/cloneDeep.js";

const obj = {
  a: 1,
  b: { c: 2 },
  d: new Date(),
  e: new Map([["key", "value"]]),
  f: new Uint8Array([1, 2, 3])
};

const cloned = cloneDeep(obj);
// Maneja referencias circulares, Dates, Maps, Sets, typed arrays, RegExp,
// objetos planos y arrays
```

### Equivalente en Python

```python
import copy
from datetime import datetime

original = {
    "name": "Alice",
    "dates": [datetime(2024, 1, 1), datetime(2024, 6, 1)],
    "nested": {"a": 1, "b": {"c": 2}}
}

cloned = copy.deepcopy(original)

cloned["nested"]["b"]["c"] = 999
print(original["nested"]["b"]["c"])  # 2

class Person:
    def __init__(self, name):
        self.name = name
        self.friend = None

alice = Person("Alice")
bob = Person("Bob")
alice.friend = bob

cloned_alice = copy.deepcopy(alice)
print(cloned_alice.friend is bob)  # False
print(cloned_alice.friend.name)    # "Bob"
```

### Equivalente en Java

```java
import java.io.*;
import java.util.*;

public class DeepCopyUtil {
  @SuppressWarnings("unchecked")
  public static <T extends Serializable> T deepCopy(T obj) {
    try {
      ByteArrayOutputStream baos = new ByteArrayOutputStream();
      ObjectOutputStream oos = new ObjectOutputStream(baos);
      oos.writeObject(obj);
      oos.close();

      ByteArrayInputStream bais = new ByteArrayInputStream(baos.toByteArray());
      ObjectInputStream ois = new ObjectInputStream(bais);
      T copy = (T) ois.readObject();
      ois.close();
      return copy;
    } catch (IOException | ClassNotFoundException e) {
      throw new RuntimeException("Deep copy failed", e);
    }
  }
}

public record Person(String name, List<Date> dates, Map<String, Object> metadata)
  implements Serializable {}

Person original = new Person(
  "Alice",
  List.of(new Date(1704067200000L)),
  new HashMap<>(Map.of("role", "admin"))
);

Person cloned = DeepCopyUtil.deepCopy(original);
// cloned es completamente independiente; las mutaciones no afectan el original
```

## Explicación

- Empezá con **`structuredClone`** si querés una respuesta nativa. Corre en
  navegadores modernos, Node 17+, Deno y Bun, y maneja referencias circulares,
  `Date`, `Map`, `Set`, typed arrays y la mayoría de tipos built-in. Funciones,
  nodos DOM y cadenas de prototipo no se clonan.
- **`JSON.parse(JSON.stringify(...))`** es rápido, aunque se pierden datos en el
  camino. Convierte `Date` a strings, elimina `undefined`, funciones, `Map`,
  `Set`, `RegExp`, typed arrays y referencias circulares. Reservá `JSON.parse/stringify` para
  objetos planos y arrays.
- Un clone recursivo manual que use un cache `WeakMap` es el más flexible. Esa
  libertad te deja decidir exactamente cómo manejar cada tipo. Usá `WeakMap` (no
  `Map`) para el cache, así las referencias circulares no impiden la garbage
  collection.
- **Lodash `cloneDeep`** ya se probó en código real y cubre casos edge que
  fácilmente se pasan por alto. El costo es el tamaño del bundle: unos
  17 KB gzipped para todo Lodash o unos 4 KB para `lodash.cloneDeep` solo.
- **La serialización en Java** y **`copy.deepcopy` en Python** usan la misma
  idea: recorrer el grafo de objetos, crear nuevas instancias y
  reutilizar las
  referencias a objetos ya copiados.

## Variantes

| Enfoque | Referencias circulares | Tipos especiales | Performance | Entorno |
| --- | --- | --- | --- | --- |
| `structuredClone` | Sí | Dates, Maps, Sets, typed arrays | Rápido | Navegadores modernos, Node 17+ |
| `JSON.parse/stringify` | No | Ninguno (Dates se convierten a strings) | Más rápido | Todos los entornos |
| Recursión manual | Sí | Configurable | Media | Todos los entornos |
| Lodash `cloneDeep` | Sí | Dates, Maps, Sets, RegExp, etc. | Media | Todos los entornos (requiere dependencia) |
| Serialización Java | Sí | Todos los tipos `Serializable` | Lenta | Java JVM |
| `copy.deepcopy` Python | Sí | La mayoría de tipos built-in | Media | Python |

## Mejores Prácticas

- Preferí `structuredClone` en entornos modernos. Es nativo, rápido y maneja
  referencias circulares y la mayoría de tipos especiales.
- Usá Lodash cuando todavía necesités soportar navegadores o versiones de Node
  donde `structuredClone` no esté disponible.
- Mantené `JSON.parse/stringify` lejos de objetos complejos; corrompe
  silenciosamente Dates, funciones, `undefined`, `Map`, `Set` y referencias
  circulares.
- Cloná de forma defensiva en los límites de las APIs. Copiá los datos de una
  API externa o un store de estado antes de mutarlos, así no agregás efectos
  secundarios.
- Con árboles inmutables muy grandes, librerías como Immer usan structural
  sharing en lugar de copiar todo el árbol en cada actualización.

## Errores Comunes

- Usar spread (`{...obj}`) u `Object.assign` esperando un deep clone. Solo se
  copia el primer nivel, así que los objetos anidados siguen compartiendo
  referencia.
- Ejecutar `JSON.parse/stringify` sobre objetos que contienen `Date` y
  sorprenderse de que vuelvan como strings.
- Escribir un deep clone manual sin cache y caer en recursión infinita o en un
  stack overflow con referencias circulares.
- Llamar `structuredClone` sobre funciones o nodos DOM. Los tipos no
  serializables disparan un `DataCloneError`.
- Ejecutar un deep clone de un objeto muy grande en cada render. Eso genera
  cuellos de botella de performance; usá memoización o structural sharing en su
  lugar.

## Preguntas Frecuentes

### ¿Por qué `{...obj}` no crea un deep clone?

El spread crea un shallow copy. Copia todas las propiedades own
enumerables de `obj` a un nuevo objeto, pero los objetos anidados y arrays
siguen apuntando a los valores originales. Usá `structuredClone`, Lodash o recursión
manual para un deep clone verdadero.

### ¿`structuredClone` preserva instancias de clases?

No. Elimina las cadenas de prototipo, así que instancias de clases custom se
convierten en objetos planos. Para conservar el comportamiento de clase,
escribí un clone custom que reconstruya instancias con `new MyClass(...)` o usá
un customizer de Lodash.

### ¿Cómo hago deep clone en Node.js sin dependencias?

Node 17.0 o superior expone `structuredClone` globalmente. En versiones
anteriores, usá `v8.deserialize(v8.serialize(obj))`, que aprovecha el
structured clone de Node. Reservá `JSON.parse/stringify` para objetos planos
simples.

### ¿Cómo clono objetos con getters y setters?

Ni `structuredClone` ni `JSON.parse/stringify` mantienen getters y setters.
Evalúan el getter y copian el valor resultante. Para conservar los property
descriptors, usá `Object.getOwnPropertyDescriptors` con `Object.create`
para reconstruir la cadena de prototipo. Lodash `cloneDeep` preserva accessors
por defecto.
