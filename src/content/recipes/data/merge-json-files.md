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
