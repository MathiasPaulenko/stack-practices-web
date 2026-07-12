---

contentType: recipes
slug: deep-clone-javascript
title: "Deep Clone Objects in JavaScript"
description: "How to create deep copies of JavaScript objects and arrays correctly, handling circular references, Dates, Maps, Sets, and custom classes."
metaDescription: "Learn deep cloning in JavaScript with structuredClone, lodash, manual recursion, and JSON.parse. Covers circular references, typed arrays, and what works for cloning."
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
  - /recipes/batch-processing-patterns
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn deep cloning in JavaScript with structuredClone, lodash, manual recursion, and JSON.parse. Covers circular references, typed arrays, and what works for cloning."
  keywords:
    - deep-clone
    - javascript
    - objects
    - structuredclone
    - lodash
    - serialization
    - performance

---
## Overview

Deep cloning creates a fully independent copy of an object where nested objects, arrays, and special types are duplicated rather than shared by reference. In JavaScript, `=` only copies the reference, so mutations to a "copy" affect the original. Below is a practical approach to `structuredClone`, `JSON.parse/stringify`, `lodash.cloneDeep`, and a manual recursive implementation, with handling for circular references, Dates, Maps, Sets, typed arrays, and custom classes.

## When to Use

Use this resource when:
- You need to mutate a copy of nested state without affecting the original (Redux, form handling). See [Caching](/recipes/data/caching) for memoization patterns.
- Serializing objects for `postMessage`, IndexedDB, or Web Workers. See [Parse JSON](/recipes/data/parse-json) for serialization.
- Implementing undo/redo stacks that require immutable snapshots
- Defensive copying of function arguments or API responses before transformation

## Solution

### JavaScript (structuredClone — Recommended)

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

// Mutations don't affect original
clone.nested.b.c = 999;
clone.dates[0] = new Date("2025-01-01");
console.log(original.nested.b.c); // 2
console.log(original.dates[0]);   // 2024-01-01

// Circular references work
circular.self = circular;
const circularClone = structuredClone(circular);
```

### JavaScript (JSON.parse — Quick but Limited)

```javascript
function jsonClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Works for: plain objects, arrays, strings, numbers, booleans, null
// Loses: Dates (become strings), Functions, undefined, Maps, Sets, RegExp, circular refs, typed arrays
const limited = jsonClone({ a: 1, b: [2, 3], c: { d: 4 } });
```

### JavaScript (Manual Recursive with Circular Ref Support)

```javascript
function deepClone(obj, cache = new WeakMap()) {
  // Primitives and functions
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Function) return obj; // or throw

  // Circular reference
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

// Usage
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

### JavaScript (Lodash — Production-Ready)

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
// Handles circular refs, Dates, Maps, Sets, typed arrays, RegExp, plain objects, arrays
```

### Python (Equivalent Deep Copy)

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

# Mutations don't affect original
cloned["nested"]["b"]["c"] = 999
print(original["nested"]["b"]["c"])  # 2

# Custom class support
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

### Java (Equivalent Deep Copy)

```java
import java.io.*;
import java.util.*;

// Serializable deep copy via byte array serialization
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

// Usage
public record Person(String name, List<Date> dates, Map<String, Object> metadata)
  implements Serializable {}

Person original = new Person(
  "Alice",
  List.of(new Date(1704067200000L)),
  new HashMap<>(Map.of("role", "admin"))
);

Person cloned = DeepCopyUtil.deepCopy(original);
// cloned is fully independent; mutations don't affect original
```

## Explanation

- **`structuredClone`** (native API, available in modern browsers, Node 17+, Deno, Bun) is the simplest and most reliable built-in method. It handles circular references, Dates, Maps, Sets, typed arrays, and most built-in types. It does NOT clone functions, DOM nodes, or prototype chains.
- **`JSON.parse(JSON.stringify(...))`** is fast and simple but discards Dates (serializes to ISO strings), drops `undefined`, functions, Maps, Sets, RegExp, typed arrays, and circular references. Only use for simple plain objects and arrays.
- **Manual recursion** with a `WeakMap` cache is the most flexible approach. It lets you control which types to clone and how. Use `WeakMap` (not `Map`) for the cache so circular references don't prevent garbage collection.
- **Lodash `cloneDeep`** is battle-tested, handles edge cases you might miss, and works in all environments. The trade-off is bundle size (~17KB gzipped for full lodash, ~4KB for `cloneDeep` alone via `lodash.cloneDeep`).
- **Java serialization** and **Python `copy.deepcopy`** are language-native equivalents that apply the same principles: traverse the object graph, create new instances, and preserve references to already-copied objects.

## Variants

| Approach | Circular Refs | Special Types | Performance | Environment |
|----------|-------------|---------------|-------------|-------------|
| `structuredClone` | Yes | Dates, Maps, Sets, TypedArrays | Fast | Modern browsers, Node 17+ |
| `JSON.parse/stringify` | No | None (Dates→strings) | Fastest | All environments |
| Manual recursion | Yes | Configurable | Medium | All environments |
| Lodash `cloneDeep` | Yes | Dates, Maps, Sets, RegExp, etc. | Medium | All environments (requires dependency) |
| Java serialization | Yes | All `Serializable` types | Slow | Java JVM |
| Python `copy.deepcopy` | Yes | Most built-in types | Medium | Python |

## What Works

1. **Prefer `structuredClone` for modern environments** — it's native, fast, handles circular references, and supports Maps, Sets, and typed arrays. No dependency needed.
2. **Use Lodash when supporting older browsers** — if you target IE11 or Node < 17, `structuredClone` is unavailable and Lodash provides consistent behavior.
3. **Never use `JSON.parse/stringify` for complex objects** — it's fine for simple config objects, but silently corrupts Dates, functions, `undefined`, Maps, Sets, and circular references.
4. **Clone defensively at API boundaries** — when receiving objects from external [APIs](/recipes/api/call-rest-api) or passing state to child components, clone before mutation to prevent accidental side effects.
5. **Consider structural sharing for large trees** — for very large immutable data structures, libraries like Immer use structural sharing to avoid O(n) copy costs on every update. See [Flatten/Unflatten Objects](/recipes/data/flatten-unflatten-objects) for nested data manipulation.

## Common Mistakes

1. Using spread syntax (`{...obj}`) or `Object.assign` expecting a deep copy — these only shallow-copy the top level; nested objects are still shared by reference.
2. Using `JSON.parse/stringify` on objects containing Dates, then wondering why they became strings.
3. Implementing manual deep clone without a cache, causing infinite recursion or stack overflow on circular references.
4. Cloning DOM elements or functions with `structuredClone` — it throws a `DataCloneError` for non-serializable types.
5. Deep cloning unnecessarily large objects on every render, causing performance bottlenecks. Use memoization or structural sharing instead.

## Frequently Asked Questions

### Why does `{...obj}` not create a deep copy?

Spread syntax performs a shallow copy: it copies all enumerable own properties from `obj` to a new object, but nested objects and arrays are still references to the originals. Use `structuredClone`, Lodash, or manual recursion for true deep copies.

### Does `structuredClone` preserve class instances?

No. `structuredClone` strips prototype chains, so instances of custom classes become plain objects. If you need to preserve class behavior, use manual cloning that reconstructs instances with `new MyClass(...)` or Lodash with customizer functions.

### How do I deep clone in Node.js without dependencies?

In Node 17.0+, use `structuredClone` (available globally). In older Node versions, use `v8.deserialize(v8.serialize(obj))` which is Node's internal structured clone algorithm. Avoid `JSON.parse/stringify` for anything beyond simple plain objects.

### How do I deep clone objects with getters/setters?

`structuredClone` and `JSON.parse/stringify` do not preserve getters and setters — they evaluate the getter and copy the resulting value. To preserve property descriptors, use `Object.getOwnPropertyDescriptors` combined with `Object.create` to reconstruct the prototype chain. Libraries like Lodash `_.cloneDeep` preserve accessors by default. For class hierarchies with computed properties, write a custom clone method that copies descriptors explicitly.
