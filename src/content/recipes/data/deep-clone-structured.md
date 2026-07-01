---
contentType: recipes
slug: deep-clone-structured
title: "Deep Clone Objects in JavaScript: Beyond JSON.parse"
description: "Compare deep clone strategies including JSON.parse, structuredClone, manual recursion, and library approaches for copying nested objects with circular references and special types"
metaDescription: "Compare deep clone strategies in JavaScript: JSON.parse, structuredClone, manual recursion, and libraries for copying nested objects with circular references."
difficulty: beginner
topics:
  - data
  - frontend
tags:
  - deep-clone
  - javascript
  - clone
  - duplication
relatedResources:
  - /patterns/design/prototype-pattern-cloning
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Compare deep clone strategies in JavaScript: JSON.parse, structuredClone, manual recursion, and libraries for copying nested objects with circular references."
  keywords:
    - deep clone
    - structuredclone
    - javascript
    - object copy
    - circular references
---

# Deep Clone Objects in JavaScript: Beyond JSON.parse

Copy nested JavaScript objects without shared references using modern and legacy approaches. This recipe compares `JSON.parse`, `structuredClone`, manual recursive cloning, and library solutions while handling edge cases like circular references, functions, and special object types.

## When to Use This

- State management requires immutable updates without mutating original data
- [API responses](/recipes/api/call-rest-api) are cached and must not be modified by consumers
- Configuration objects are passed to multiple modules that may modify them

## Solution

### 1. JSON.parse Approach (Limited)

```typescript
// clones/JsonClone.ts
function jsonClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Works for plain objects and arrays
const original = { a: 1, b: { c: 2 } };
const copy = jsonClone(original);

// Limitations
jsonClone({ date: new Date() });        // Date becomes string
jsonClone({ map: new Map() });           // Map becomes {}
jsonClone({ fn: () => 1 });             // Function becomes undefined
jsonClone({ a: {} }); copy.a = original; // Circular: throws
```

### 2. structuredClone (Modern Browsers and Node 17+)

```typescript
// clones/StructuredClone.ts
function modernClone<T>(obj: T): T {
  return structuredClone(obj);
}

// Supports more types
const original = {
  date: new Date(),
  map: new Map([['key', 'value']]),
  set: new Set([1, 2, 3]),
  arrayBuffer: new Uint8Array([1, 2, 3]).buffer,
  nested: { a: 1 },
};

const copy = modernClone(original);

// Limitations
modernClone({ fn: () => 1 });            // Function throws
modernClone({ el: document.body });     // DOM nodes throw
```

### 3. Manual Recursive Clone

```typescript
// clones/RecursiveClone.ts
function deepClone<T>(obj: T, cache = new WeakMap<object, unknown>()): T {
  // Handle primitives and null
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle circular references
  if (cache.has(obj)) {
    return cache.get(obj) as T;
  }

  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  // Handle Array
  if (Array.isArray(obj)) {
    const copy: unknown[] = [];
    cache.set(obj, copy);
    obj.forEach((item, index) => {
      copy[index] = deepClone(item, cache);
    });
    return copy as unknown as T;
  }

  // Handle Object
  const copy = Object.create(Object.getPrototypeOf(obj));
  cache.set(obj, copy);

  Object.entries(obj as Record<string, unknown>).forEach(([key, value]) => {
    copy[key] = deepClone(value, cache);
  });

  return copy;
}
```

### 4. Library-Based Cloning

```typescript
// clones/LibraryClone.ts
import cloneDeep from 'lodash/cloneDeep';
import { klona } from 'klona';

// Lodash: battle-tested, handles most cases
const lodashCopy = cloneDeep(original);

// Klona: smaller, faster, modern alternative
const klonaCopy = klona(original);

// Comparison
const obj = {
  date: new Date(),
  regex: /test/gi,
  nested: { a: 1 },
};

// All produce independent copies
lodashCopy.nested.a = 2; // obj.nested.a still 1
klonaCopy.nested.a = 3;  // obj.nested.a still 1
```

### 5. Performance Comparison

```typescript
// benchmarks/cloneBench.ts
const largeObject = {
  users: Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `User ${i}`,
    metadata: { created: new Date(), tags: ['a', 'b'] },
  })),
};

// Results for 1000 iterations (approximate):
// JSON.parse:     ~50ms  (fastest but limited)
// structuredClone: ~80ms (native, no functions)
// klona:         ~120ms (compact, modern)
// lodash:        ~200ms (most reliable)
// recursive:     ~250ms (customizable)
```

## How It Works

- **JSON.parse** serializes to string then parses, stripping non-JSON types
- **structuredClone** is a native API that supports more types but still excludes functions
- **Recursive cloning** traverses properties, preserving prototype chains and handling circular refs
- **Libraries** optimize hot paths and handle edge cases like descriptors and symbols

## Production Considerations

- Use `structuredClone` in modern environments for native performance
- Prefer `klona` over `lodash` if bundle size matters
- For React state, consider Immer for structural sharing instead of full cloning. See [Clean Code Guide](/guides/design/clean-code-principles-guide) for maintainable patterns.

## Common Mistakes

- Using `JSON.parse` for objects containing Dates, Maps, or functions
- Spreading nested objects (`{ ...obj }`) which only shallow-clones the first level. See [Deep Clone JavaScript](/recipes/data/deep-clone-javascript) for complete strategies.
- Not handling circular references, causing stack overflow in recursive solutions

## FAQ

**Q: Is `const copy = { ...original }` a deep clone?**
A: No. It creates a shallow copy. Nested objects are still shared references.

**Q: Can I deep clone class instances?**
A: `structuredClone` strips methods. Use manual recursion or libraries that preserve prototypes.
