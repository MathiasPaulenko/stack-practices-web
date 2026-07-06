---
contentType: recipes
slug: deep-clone-javascript
title: "Deep Clone de Objetos en JavaScript"
description: "Cómo crear copias profundas de objetos y arrays en JavaScript correctamente, manejando referencias circulares, Dates, Maps, Sets y clases custom."
metaDescription: "Aprende deep cloning en JavaScript con structuredClone, lodash, recursión manual y JSON.parse. Cubre referencias circulares, typed arrays y lo que funciona."
difficulty: intermediate
topics:
  - data
tags:
  - data
  - deep-clone
  - javascript
  - parsing
  - json
relatedResources:
  - /recipes/caching
  - /recipes/date-formatting
  - /recipes/money-currency
  - /recipes/parse-json
  - /recipes/regular-expressions
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende deep cloning en JavaScript con structuredClone, lodash, recursión manual y JSON.parse. Cubre referencias circulares, typed arrays y lo que funciona."
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

El deep cloning crea una copia completamente independiente de un objeto donde objetos anidados, arrays y tipos especiales se duplican en lugar de compartirse por referencia. En JavaScript, `=` solo copia la referencia, así que mutaciones en una "copia" afectan al original. El siguiente enfoque cubre `structuredClone`, `JSON.parse/stringify`, `lodash.cloneDeep`, y una implementación recursiva manual, con manejo de referencias circulares, Dates, Maps, Sets, typed arrays y clases custom.

## Cuándo Usar

Usa este recurso cuando:
- Necesites mutar una copia de estado anidado sin afectar el original (Redux, manejo de formularios). Consulta [Caching](/recipes/data/caching) para patrones de memoización.
- Serialices objetos para `postMessage`, IndexedDB o Web Workers. Consulta [Parse JSON](/recipes/data/parse-json) para serialización.
- Implementes stacks de undo/redo que requieren snapshots inmutables
- Hagas copias defensivas de argumentos de funciones o respuestas de API antes de transformarlas

## Solución

### JavaScript (structuredClone — Recomendado)

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

// Las referencias circulares funcionan
circular.self = circular;
const circularClone = structuredClone(circular);
```

### JavaScript (JSON.parse — Rápido pero Limitado)

```javascript
function jsonClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Funciona para: objetos planos, arrays, strings, números, booleans, null
// Pierde: Dates (se convierten a strings), Functions, undefined, Maps, Sets, RegExp, refs circulares, typed arrays
const limited = jsonClone({ a: 1, b: [2, 3], c: { d: 4 } });
```

### JavaScript (Recursivo Manual con Soporte de Referencias Circulares)

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

  // Typed Arrays
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

  // Plain Object
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
console.log(cloned.b === obj.b);     // false
console.log(cloned.circular === obj); // false
console.log(cloned.circular === cloned); // true
```

### JavaScript (Lodash — Producción)

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
// Maneja refs circulares, Dates, Maps, Sets, typed arrays, RegExp, objetos planos, arrays
```

### Python (Equivalente Deep Copy)

```python
import copy
from datetime import datetime

original = {
    "name": "Alice",
    "dates": [datetime(2024, 1, 1), datetime(2024, 6, 1)],
    "nested": {"a": 1, "b": {"c": 2}}
}

# Deep copy
cloned = copy.deepcopy(original)

# Las mutaciones no afectan el original
cloned["nested"]["b"]["c"] = 999
print(original["nested"]["b"]["c"])  # 2

# Soporte de clases custom
class Person:
    def __init__(self, name):
        self.name = name
        self.friend = None

alice = Person("Alice")
bob = Person("Bob")
alice.friend = bob

cloned_alice = copy.deepcopy(alice)
print(cloned_alice.friend is bob)      # False
print(cloned_alice.friend.name)        # "Bob"
```

### Java (Equivalente Deep Copy)

```java
import java.io.*;
import java.util.*;

// Deep copy vía serialización de byte array
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

// Uso
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

- **`structuredClone`** (API nativa, disponible en navegadores modernos, Node 17+, Deno, Bun) es el método nativo más simple y confiable. Maneja referencias circulares, Dates, Maps, Sets, typed arrays y la mayoría de tipos built-in. NO clona funciones, nodos DOM ni cadenas de prototipo.
- **`JSON.parse(JSON.stringify(...))`** es rápido y simple pero descarta Dates (serializa a strings ISO), elimina `undefined`, funciones, Maps, Sets, RegExp, typed arrays y referencias circulares. Úsalo solo para objetos planos simples y arrays.
- **Recursión manual** con cache `WeakMap` es el enfoque más flexible. Te permite controlar qué tipos clonar y cómo. Usa `WeakMap` (no `Map`) para el cache para que las referencias circulares no impidan la garbage collection.
- **Lodash `cloneDeep`** está probado en batalla, maneja casos edge que podrías omitir, y funciona en todos los entornos. La contrapartida es el tamaño del bundle (~17KB gzipped para lodash completo, ~4KB para `cloneDeep` solo vía `lodash.cloneDeep`).
- **Serialización en Java** y **`copy.deepcopy` en Python** son equivalentes nativos del lenguaje que aplican los mismos principios: recorrer el grafo de objetos, crear nuevas instancias, y preservar referencias a objetos ya copiados.

## Variantes

| Enfoque | Referencias Circulares | Tipos Especiales | Performance | Entorno |
|---------|----------------------|------------------|-------------|---------|
| `structuredClone` | Sí | Dates, Maps, Sets, TypedArrays | Rápido | Navegadores modernos, Node 17+ |
| `JSON.parse/stringify` | No | Ninguno (Dates→strings) | Más rápido | Todos los entornos |
| Recursión manual | Sí | Configurable | Media | Todos los entornos |
| Lodash `cloneDeep` | Sí | Dates, Maps, Sets, RegExp, etc. | Media | Todos los entornos (requiere dependencia) |
| Serialización Java | Sí | Todos los tipos `Serializable` | Lenta | Java JVM |
| `copy.deepcopy` Python | Sí | La mayoría de tipos built-in | Media | Python |

## Lo que funciona

1. **Prefiere `structuredClone` para entornos modernos** — es nativo, rápido, maneja referencias circulares y soporta Maps, Sets y typed arrays. No requiere dependencia.
2. **Usa Lodash cuando soportes navegadores antiguos** — si targeteas IE11 o Node < 17, `structuredClone` no está disponible y Lodash provee comportamiento consistente.
3. **Nunca uses `JSON.parse/stringify` para objetos complejos** — funciona para objetos de configuración simples, pero corrompe silenciosamente Dates, funciones, `undefined`, Maps, Sets y referencias circulares.
4. **Clona defensivamente en límites de API** — cuando recibes objetos de [APIs externas](/recipes/api/call-rest-api) o pasas estado a componentes hijos, clona antes de mutar para prevenir efectos secundarios accidentales.
5. **Considera sharing estructural para árboles grandes** — para estructuras de datos inmutables muy grandes, librerías como Immer usan sharing estructural para evitar costos de copia O(n) en cada actualización. Consulta [Flatten/Unflatten Objects](/recipes/data/flatten-unflatten-objects) para manipulación de datos anidados.

## Errores Comunes

1. Usar spread syntax (`{...obj}`) u `Object.assign` esperando un deep copy — solo hacen shallow-copy del primer nivel; los objetos anidados siguen compartiendo referencia.
2. Usar `JSON.parse/stringify` en objetos que contienen Dates, y luego preguntarse por qué se convirtieron en strings.
3. Implementar deep clone manual sin cache, causando recursión infinita o stack overflow en referencias circulares.
4. Clonar elementos DOM o funciones con `structuredClone` — lanza `DataCloneError` para tipos no serializables.
5. Hacer deep clone innecesariamente de objetos grandes en cada render, causando cuellos de botella de performance. Usa memoization o sharing estructural en su lugar.

## Preguntas Frecuentes

### ¿Por qué `{...obj}` no crea un deep copy?

Spread syntax realiza un shallow copy: copia todas las propiedades own enumerables de `obj` a un nuevo objeto, pero objetos anidados y arrays siguen siendo referencias a los originales. Usa `structuredClone`, Lodash o recursión manual para deep copies verdaderos.

### ¿`structuredClone` preserva instancias de clases?

No. `structuredClone` elimina cadenas de prototipo, así que instancias de clases custom se convierten en objetos planos. Si necesitas preservar el comportamiento de clase, usa clonado manual que reconstruye instancias con `new MyClass(...)` o Lodash con funciones customizer.

### ¿Cómo hago deep clone en Node.js sin dependencias?

En Node 17.0+, usa `structuredClone` (disponible globalmente). En versiones anteriores de Node, usa `v8.deserialize(v8.serialize(obj))` que es el algoritmo interno de structured clone de Node. Evita `JSON.parse/stringify` para cualquier cosa más allá de objetos planos simples.
