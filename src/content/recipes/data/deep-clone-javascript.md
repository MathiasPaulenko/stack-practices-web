---
contentType: recipes
slug: deep-clone-javascript
title: "Deep Clone Objects in JavaScript"
description: "Create fully independent copies of JavaScript objects and arrays, handling circular references, Dates, Maps, Sets, typed arrays, and custom classes."
metaDescription: "Deep clone in JavaScript with structuredClone, lodash, manual recursion, and JSON.parse. Covers circular references, typed arrays, and when to pick each approach."
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
  metaDescription: "Deep clone in JavaScript with structuredClone, lodash, manual recursion, and JSON.parse. Covers circular references, typed arrays, and when to pick each approach."
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

A deep clone is a separate copy of an object or array, fully independent of the
original. Nested objects, arrays, and special types get duplicated rather
than being shared by reference. In JavaScript, `=` only copies the reference, so
changes to a "copy" also change the original. This recipe shows how to clone with
`structuredClone`, `JSON.parse/stringify`, Lodash, and a manual recursive
implementation, and covers circular references, `Date`, `Map`, `Set`, typed
arrays, and custom classes.

## When to Use

- You want to change a nested state copy without touching the original, for
  example in Redux reducers or form handling.
- You're serializing objects to pass through `postMessage`, IndexedDB, or Web
  Workers.
- You're building undo/redo stacks and need immutable snapshots.
- You need a defensive copy of function arguments or API responses before
  transforming them. See [Call REST API](/recipes/call-rest-api/) for related
  patterns.

## Solution

### `structuredClone` (recommended)

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

// Mutations don't affect the original
clone.nested.b.c = 999;
clone.dates[0] = new Date("2025-01-01");
console.log(original.nested.b.c); // 2
console.log(original.dates[0]);   // 2024-01-01

// Circular references also work
const circular = { name: "self" };
circular.self = circular;
const circularClone = structuredClone(circular);
```

### `JSON.parse` (quick but limited)

```javascript
function jsonClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Works for: plain objects, arrays, strings, numbers, booleans, null
// Loses: Dates (become strings), Functions, undefined, Maps, Sets, RegExp,
// circular references, and typed arrays
const limited = jsonClone({ a: 1, b: [2, 3], c: { d: 4 } });
```

### Manual recursive clone with circular reference support

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

  // Plain object (preserves prototype)
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
// Handles circular refs, Dates, Maps, Sets, typed arrays, RegExp, plain objects, arrays
```

### Python equivalent

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

### Java equivalent

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
// cloned is fully independent; mutations don't affect original
```

## Explanation

- Start with **`structuredClone`** when you want a built-in answer. It runs in
  modern browsers, Node 17+, Deno, and Bun, and it handles circular references,
  `Date`, `Map`, `Set`, typed arrays, and most built-in types. Functions, DOM
  nodes, and prototype chains won't clone.
- **`JSON.parse(JSON.stringify(...))`** is fast, though it loses data along the way.
  It turns `Date` into strings, drops `undefined`, functions, `Map`, `Set`,
  `RegExp`, typed arrays, and circular references. Reserve it for plain objects
  and arrays.
- A manual recursive clone that uses a `WeakMap` cache is the most flexible. That
  freedom means you can decide the exact way to handle each type. Use `WeakMap`
  (not `Map`) for the cache so circular references don't prevent garbage
  collection.
- **Lodash `cloneDeep`** is battle-tested in real code and covers edge cases you
  might miss. The cost is bundle size: about 17 KB gzipped for all of Lodash
  or about 4 KB for
  `lodash.cloneDeep` alone.
- **Java serialization** and **Python `copy.deepcopy`** use the same idea: walk
  the object graph, create new instances, and reuse already-copied
  references.

## Variants

| Approach | Circular refs | Special types | Performance | Environment |
| --- | --- | --- | --- | --- |
| `structuredClone` | Yes | Dates, Maps, Sets, typed arrays | Fast | Modern browsers, Node 17+ |
| `JSON.parse/stringify` | No | None (Dates become strings) | Fastest | All environments |
| Manual recursion | Yes | Configurable | Medium | All environments |
| Lodash `cloneDeep` | Yes | Dates, Maps, Sets, RegExp, etc. | Medium | All environments (requires dependency) |
| Java serialization | Yes | All `Serializable` types | Slow | Java JVM |
| Python `copy.deepcopy` | Yes | Most built-in types | Medium | Python |

## Best Practices

- Prefer `structuredClone` in modern environments. It's native, fast, and
  handles circular references and most special types.
- Use Lodash when you still need to support older browsers or Node versions
  where `structuredClone` isn't available.
- Keep `JSON.parse/stringify` away from complex objects; it silently corrupts
  Dates, functions, `undefined`, `Map`, `Set`, and circular references.
- Clone defensively at API boundaries. Copy external API or state-store data
  before mutating it, so you don't introduce accidental side effects.
- With very large immutable trees, libraries like Immer use structural sharing
  instead of copying the whole tree on every update.

## Common Mistakes

- Using spread (`{...obj}`) or `Object.assign` and expecting a deep copy. Only
  the top level gets copied, so nested objects are still shared by reference.
- Running `JSON.parse/stringify` on objects that contain `Date` values and then
  being surprised when they come back as strings.
- Writing a manual deep clone without a cache and getting infinite recursion or
  a stack overflow with circular references.
- Calling `structuredClone` on functions or DOM nodes. Non-serializable types
  trigger a `DataCloneError`.
- Running a deep clone on a huge object on every render. That creates performance
  bottlenecks; use memoization or structural sharing instead.

## FAQ

### Why does `{...obj}` not create a deep copy?

Spread syntax creates a shallow copy. It copies all enumerable own properties
from `obj` into a new object, yet nested objects and arrays still point to the
original values. Use `structuredClone`, Lodash, or manual recursion for a true
deep copy.

### Does `structuredClone` preserve class instances?

No. It strips prototype chains, so custom class instances become plain objects.
To keep class behavior, write a custom clone that rebuilds instances with
`new MyClass(...)` or use a Lodash customizer.

### How do I deep clone in Node.js without dependencies?

Node 17.0 and later expose `structuredClone` globally. On older versions, use
`v8.deserialize(v8.serialize(obj))`, which uses Node's internal
algorithm. Only reach for `JSON.parse/stringify` with simple plain objects.

### How do I clone objects with getters and setters?

Neither `structuredClone` nor `JSON.parse/stringify` keeps getters and setters.
They evaluate the getter and copy the resulting value. To keep property
descriptors, use `Object.getOwnPropertyDescriptors` with `Object.create` to
rebuild the prototype chain. Lodash `cloneDeep` preserves
accessors by default.
