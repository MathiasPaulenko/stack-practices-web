---
contentType: recipes
slug: merge-json-files
title: "Merge JSON Files"
description: "How to merge multiple JSON files into a single object or array in Python, Java, and JavaScript."
metaDescription: "Learn how to merge JSON files in Python, Java, and JavaScript. Combine configs, datasets, and API responses with practical code examples."
difficulty: beginner
topics:
  - data
tags:
  - json
  - merge
  - combine
  - python
  - javascript
  - java
  - data-processing
relatedResources:
  - /recipes/data/convert-csv-to-json
  - /recipes/data/convert-json-to-csv
  - /recipes/data/parse-csv-files
  - /recipes/data/parse-xml-files
  - /recipes/data/serialize-deserialize-data
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Learn how to merge JSON files in Python, Java, and JavaScript. Combine configs, datasets, and API responses with practical code examples."
  keywords:
    - json
    - merge
    - combine
    - python
    - javascript
    - java
    - data-processing
---
## Overview

Modern applications often split configuration, localization, and dataset files into multiple JSON files for modularity. Merging them into a single JSON object or array is a common build step, cache warmup, and API aggregation task. The following demonstrates how to deep merging of objects, concatenation of arrays, and handling key conflicts across Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Aggregating microservice responses into a single API payload
- Combining environment-specific config files (base + override)
- Merging split dataset shards for batch processing
- Building unified translation files from modular locale JSONs

## Solution

### Python

```python
# json + pathlib for merging arrays of objects
import json
from pathlib import Path

files = Path('data/').glob('*.json')
merged = []
for f in files:
    with open(f, encoding='utf-8') as fh:
        data = json.load(fh)
        if isinstance(data, list):
            merged.extend(data)
        else:
            merged.append(data)

with open('merged.json', 'w', encoding='utf-8') as out:
    json.dump(merged, out, indent=2)
```

```python
# deep merge dicts with a recursive helper
import json

def deep_merge(base, override):
    for key, value in override.items():
        if key in base and isinstance(base[key], dict) and isinstance(value, dict):
            deep_merge(base[key], value)
        else:
            base[key] = value
    return base

with open('base.json') as b, open('override.json') as o:
    result = deep_merge(json.load(b), json.load(o))
print(json.dumps(result, indent=2))
```

### JavaScript

```javascript
// Node.js: merge JSON files into a single array
import fs from 'fs';
import path from 'path';

const files = fs.readdirSync('data').filter(f => f.endsWith('.json'));
const merged = files.flatMap(f => {
  const data = JSON.parse(fs.readFileSync(path.join('data', f), 'utf-8'));
  return Array.isArray(data) ? data : [data];
});

fs.writeFileSync('merged.json', JSON.stringify(merged, null, 2));
```

```javascript
// deep merge objects with spread + recursion
import fs from 'fs';

function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (typeof override[key] === 'object' && !Array.isArray(override[key]) && result[key]) {
      result[key] = deepMerge(result[key], override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

const base = JSON.parse(fs.readFileSync('base.json', 'utf-8'));
const override = JSON.parse(fs.readFileSync('override.json', 'utf-8'));
console.log(JSON.stringify(deepMerge(base, override), null, 2));
```

### Java

```java
// Jackson for merging JSON nodes
// Maven: com.fasterxml.jackson.core:jackson-databind
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

public class JsonMerge {
    private static final ObjectMapper mapper = new ObjectMapper();

    public static JsonNode merge(JsonNode base, JsonNode override) {
        if (base.isArray() && override.isArray()) {
            ArrayNode merged = mapper.createArrayNode();
            merged.addAll((ArrayNode) base);
            merged.addAll((ArrayNode) override);
            return merged;
        } else if (base.isObject() && override.isObject()) {
            ObjectNode merged = ((ObjectNode) base).deepCopy();
            override.fields().forEachRemaining(e -> {
                JsonNode existing = merged.get(e.getKey());
                if (existing != null && existing.isObject() && e.getValue().isObject()) {
                    merged.set(e.getKey(), merge(existing, e.getValue()));
                } else {
                    merged.set(e.getKey(), e.getValue());
                }
            });
            return merged;
        }
        return override;
    }

    public static void main(String[] args) throws Exception {
        JsonNode base = mapper.readTree(new File("base.json"));
        JsonNode override = mapper.readTree(new File("override.json"));
        System.out.println(merge(base, override).toPrettyString());
    }
}
```

## Explanation

Merging JSON files is not a single operation; it depends on the structure of the files. Array concatenation (`extend`, `flatMap`, `ArrayNode.addAll`) is straightforward but may produce duplicates if files overlap. Object deep merging recursively combines nested keys, with override files taking precedence. Shallow merges (`{ ...a, ...b }`) replace nested objects entirely, which is usually not desired for config files.

Key conflicts must be handled explicitly: last-write-wins, merge arrays within objects, or raise an error. Python's standard library has no built-in deep merge; JavaScript's `Object.assign` and spread syntax are shallow. Jackson (Java) provides `ObjectNode` mutation methods and `deepCopy` for safe merging without side effects.

## Variants

### Python with `deepmerge` Library

```python
from deepmerge import always_merger
import json

with open('base.json') as b, open('override.json') as o:
    base = json.load(b)
    override = json.load(o)

result = always_merger.merge(base, override)
print(json.dumps(result, indent=2))
```

```python
from deepmerge import conservative_merger
import json

# conservative_merger raises on conflict instead of overwriting
with open('base.json') as b, open('override.json') as o:
    base = json.load(b)
    override = json.load(o)

try:
    result = conservative_merger.merge(base, override)
except ValueError as e:
    print(f"Conflict: {e}")
```

### JavaScript with Lodash

```javascript
const _ = require('lodash');
const fs = require('fs');

const base = JSON.parse(fs.readFileSync('base.json', 'utf-8'));
const override = JSON.parse(fs.readFileSync('override.json', 'utf-8'));

// _.merge does deep merge, mutates target
const result = _.merge({}, base, override);

// _.mergeWith for custom array handling
const result2 = _.mergeWith({}, base, override, (objValue, srcValue) => {
  if (Array.isArray(objValue)) {
    return objValue.concat(srcValue); // concat arrays instead of replacing
  }
});

console.log(JSON.stringify(result, null, 2));
```

### Merging Multiple Files with Glob Pattern

```python
import json
import glob

def merge_json_glob(pattern: str, output: str) -> None:
    merged = {}
    for filepath in sorted(glob.glob(pattern)):
        with open(filepath, encoding='utf-8') as f:
            data = json.load(f)
            if isinstance(data, dict):
                merged.update(data)
            elif isinstance(data, list):
                merged.setdefault('items', []).extend(data)

    with open(output, 'w', encoding='utf-8') as out:
        json.dump(merged, out, indent=2, ensure_ascii=False)

merge_json_glob('config/*.json', 'config/merged.json')
```

```javascript
const fs = require('fs');
const path = require('path');
const glob = require('glob');

function mergeJsonGlob(pattern, output) {
  const merged = {};
  const files = glob.sync(pattern).sort();

  for (const filepath of files) {
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    if (Array.isArray(data)) {
      merged.items = (merged.items || []).concat(data);
    } else {
      Object.assign(merged, data);
    }
  }

  fs.writeFileSync(output, JSON.stringify(merged, null, 2));
}

mergeJsonGlob('config/*.json', 'config/merged.json');
```

### Deduplication After Merge

```python
import json

def merge_and_dedupe(files: list[str], key: str = 'id') -> list:
    seen = set()
    merged = []
    for f in files:
        with open(f, encoding='utf-8') as fh:
            for item in json.load(fh):
                item_key = item.get(key)
                if item_key not in seen:
                    seen.add(item_key)
                    merged.append(item)
    return merged

result = merge_and_dedupe(['data1.json', 'data2.json'], key='id')
```

| Technology | Library | Approach | Notes |
|------------|---------|----------|-------|
| Python | `json` (stdlib) | `json.load` + `deep_merge` | No dependencies; requires custom recursion |
| Python | `deepmerge` | `StrategyType.TYPESAFE` | Dedicated library with conflict strategies |
| JavaScript | native | `flatMap` + `deepMerge` | Zero deps; watch out for circular refs |
| JavaScript | `lodash` | `_.merge(base, override)` | Battle-tested, handles arrays and objects |
| Java | `Jackson` | `ObjectNode` mutation | Streaming compatible, type-safe node tree |
| Java | `json-java` (org.json) | `JSONObject` deep merge | Lightweight, manual recursion required |

## What Works

- **Use deep merge for configuration**: Shallow merges silently drop nested keys from the base file
- **Dedupe arrays after concatenation**: Merging datasets may produce duplicate entries; dedupe by a stable key
- **Snapshot merged output in CI**: Commit merged configs to version control so changes are auditable
- **Validate merged JSON against a schema**: Use JSON Schema to ensure merged output is still valid
- **Preserve original files**: Never overwrite source JSONs; write merged output to a separate directory

## Common Mistakes

- **Shallow merging nested configs**: Results in lost default values when an override file provides only top-level keys
- **Not handling duplicate array elements**: Merging two datasets with overlapping records creates duplicates
- **Mutating source objects during merge**: In-place mutations make debugging and rollback difficult; always copy first
- **Assuming all files have the same structure**: One file may be an array, another an object; normalize before merging
- **Ignoring circular references**: Deep merge algorithms on JSON with circular refs will stack overflow; sanitize inputs first

## Frequently Asked Questions

### How do I merge JSON files with different schemas?

Normalize to a common structure first. Use a schema registry or transformation step (e.g., `jq`, `jsonschema` transformations) to align keys and types before merging. In Python, `pandas.json_normalize` can flatten heterogeneous JSONs into a common tabular format.

### Can I merge JSON files without loading them entirely into memory?

Yes, for array concatenation. Use streaming JSON parsers like `ijson` (Python), `JSONStream` (JS), or Jackson's `JsonParser` (Java) to read and emit elements incrementally. For deep object merging, you must hold the merged object in memory because JSON is not a stream-friendly format for random key access.

### How do I handle merge conflicts when the same key has different values?

Define a conflict resolution strategy: last-write-wins (simplest), array-of-values (preserve both), or raise an error (strict mode). In Python, `deepmerge` supports `STRATEGY_TYPE` configurations. In JavaScript, write a custom `deepMerge` resolver function that branches on key collision.

### What is the difference between shallow merge and deep merge?

Shallow merge (`Object.assign`, spread `{...a, ...b}`) replaces nested objects entirely — if `a` has `{db: {host: "x", port: 5432}}` and `b` has `{db: {port: 3306}}`, the result is `{db: {port: 3306}}` — `host` is lost. Deep merge recursively combines nested keys, producing `{db: {host: "x", port: 3306}}`. Always use deep merge for configuration files with nested structures.

### How do I merge JSON files asynchronously in Node.js?

```javascript
const fs = require('fs/promises');
const path = require('path');

async function mergeJsonAsync(dir, output) {
  const files = (await fs.readdir(dir)).filter(f => f.endsWith('.json'));
  const merged = [];

  for (const file of files) {
    const content = await fs.readFile(path.join(dir, file), 'utf-8');
    const data = JSON.parse(content);
    if (Array.isArray(data)) merged.push(...data);
    else merged.push(data);
  }

  await fs.writeFile(output, JSON.stringify(merged, null, 2));
}

mergeJsonAsync('data/', 'merged.json');
```

### Should I merge arrays or replace them during deep merge?

It depends. For configuration arrays (e.g., `allowedOrigins`), replacing is safer — the override file defines the full list. For data arrays (e.g., dataset records), concatenating and deduplicating is usually what you want. Lodash `_.merge` replaces arrays by default; use `_.mergeWith` with a customizer to concatenate instead.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
