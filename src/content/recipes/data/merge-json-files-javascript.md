---
contentType: recipes
slug: merge-json-files-javascript
title: "Merge JSON Files in JavaScript"
description: "Combine multiple JSON files with conflict resolution strategies using Node.js."
metaDescription: "Merge multiple JSON files in JavaScript with conflict resolution. Learn deep merge, shallow merge, and custom strategies with Node.js code examples."
difficulty: intermediate
topics:
  - data
tags:
  - json
  - javascript
  - nodejs
  - data-processing
  - merge
relatedResources:
  - /recipes/merge-json-files
  - /recipes/convert-csv-to-json
  - /recipes/convert-json-to-csv
  - /recipes/diff-json-objects
  - /recipes/parse-csv-files
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Merge multiple JSON files in JavaScript with conflict resolution. Learn deep merge, shallow merge, and custom strategies with Node.js code examples."
  keywords:
    - json
    - javascript
    - nodejs
    - data-processing
    - merge
---
## Overview

Merging JSON files is a common task when combining configuration, aggregating API responses, or building data pipelines. JavaScript offers several approaches, from a simple spread operator to recursive deep merge libraries. This recipe covers the main strategies and when to use each.

## When to Use

- You need to combine multiple JSON config files into one
- You are aggregating paginated API responses into a single payload
- You need to merge user settings with defaults without losing nested keys
- You are building a data pipeline that joins JSON from different sources

## Solution

### Shallow merge with spread operator

```javascript
const fileA = require("./config-a.json");
const fileB = require("./config-b.json");

const merged = { ...fileA, ...fileB };
// fileB values overwrite fileA at the top level only
```

### Reading and merging multiple files with fs

```javascript
const fs = require("fs");
const path = require("path");

function mergeJsonFiles(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const result = {};

  for (const file of files) {
    const content = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
    Object.assign(result, content);
  }

  return result;
}

const merged = mergeJsonFiles("./configs");
```

### Deep merge with a recursive function

```javascript
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      typeof source[key] === "object" &&
      source[key] !== null &&
      !Array.isArray(source[key])
    ) {
      target[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const defaults = { api: { timeout: 5000, retries: 3 }, log: { level: "info" } };
const user = { api: { timeout: 10000 }, log: { format: "json" } };

const merged = deepMerge({}, defaults);
deepMerge(merged, user);
// Result: { api: { timeout: 10000, retries: 3 }, log: { level: "info", format: "json" } }
```

### Using lodash for deep merge

```javascript
const _ = require("lodash");

const defaults = { api: { timeout: 5000, retries: 3 } };
const user = { api: { timeout: 10000 } };

const merged = _.merge({}, defaults, user);
// lodash merges nested objects without overwriting sibling keys
```

### Custom conflict resolution

```javascript
function mergeWithConflictResolution(sources, resolver) {
  const result = {};

  for (const source of sources) {
    for (const key of Object.keys(source)) {
      if (key in result && !deepEqual(result[key], source[key])) {
        result[key] = resolver(key, result[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }

  return result;
}

// Example: last value wins, but log the conflict
const merged = mergeWithConflictResolution(
  [fileA, fileB, fileC],
  (key, oldVal, newVal) => {
    console.warn(`Conflict on "${key}": using new value`);
    return newVal;
  }
);
```

## Explanation

Shallow merge (`{ ...a, ...b }`) only merges top-level keys. If both objects have a nested object at the same key, the second one replaces the first entirely. This is fine for flat configs.

Deep merge recursively walks nested objects, combining keys at every level. This is what you want when merging configs with nested sections (database settings, API options, etc.).

Arrays are tricky. Most deep merge implementations replace arrays rather than concatenating them. If you need array concatenation, use a custom resolver or lodash with `mergeWith` and a customizer.

## Variants

| Approach | Handles Nesting | Handles Arrays | Dependency |
|----------|----------------|----------------|------------|
| Spread operator | No (top level only) | Overwrites | None |
| Object.assign | No (top level only) | Overwrites | None |
| Custom deepMerge | Yes | Overwrites | None |
| lodash _.merge | Yes | Overwrites | lodash |
| lodash mergeWith | Yes | Customizable | lodash |

## Guidelines

- Use shallow merge for flat configs. It is simpler and faster.
- Use deep merge when configs have nested sections that should combine, not replace.
- Decide on array behavior explicitly. Default deep merge replaces arrays; you may want concatenation.
- Validate merged output with a schema (AJV, Joi) before using it in production.
- Log conflicts when merging from multiple untrusted sources.

## Common Mistakes

- Using spread operator for nested configs and losing keys silently. `{ ...a, ...b }` replaces `a.nested` entirely with `b.nested`.
- Mutating source objects. Always start with a fresh object: `deepMerge({}, source1, source2)`.
- Assuming arrays merge by concatenation. They do not. Most implementations overwrite.
- Not handling `null` values. `null` is an object in `typeof`, so deep merge may recurse into it.
- Forgetting that `JSON.parse` can throw. Wrap file reads in try/catch.

## Frequently Asked Questions

### How do I merge arrays instead of replacing them?

Use lodash `mergeWith` with a customizer that concatenates arrays:

```javascript
const merged = _.mergeWith({}, a, b, (objVal, srcVal) => {
  if (Array.isArray(objVal) && Array.isArray(srcVal)) {
    return objVal.concat(srcVal);
  }
});
```

### What is the difference between Object.assign and spread?

They are equivalent for plain objects. `{ ...a, ...b }` is syntactic sugar for `Object.assign({}, a, b)`. Both do shallow merge.

### How do I merge JSON files asynchronously?

Use `fs.promises.readFile` and `Promise.all`:

```javascript
const files = ["a.json", "b.json"];
const contents = await Promise.all(
  files.map((f) => fs.promises.readFile(f, "utf-8").then(JSON.parse))
);
const merged = contents.reduce((acc, obj) => deepMerge(acc, obj), {});
```

### Should I use a library or write my own deep merge?

Write your own only if the logic is simple and you want zero dependencies. For production code, lodash `_.merge` is well-tested and handles edge cases like `null`, arrays, and circular references.
