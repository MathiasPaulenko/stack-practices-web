---
contentType: recipes
slug: flatten-unflatten-objects
title: "Flatten and Unflatten Nested Objects"
description: "How to convert nested objects to flat key-value pairs and back again, with dot-notation, bracket notation, and custom separator support."
metaDescription: "Learn flatten and unflatten operations in Python, JavaScript, and Java. Covers dot-notation, deep nesting, array handling, and round-trip conversion."
difficulty: intermediate
topics:
  - data
tags:
  - data
  - flatten
  - java
  - javascript
  - nested
  - objects
  - python
  - recursion
  - unflatten
relatedResources:
  - /recipes/caching
  - /recipes/date-formatting
  - /recipes/money-currency
  - /recipes/parse-json
  - /recipes/regular-expressions
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn flatten and unflatten operations in Python, JavaScript, and Java. Covers dot-notation, deep nesting, array handling, and round-trip conversion."
  keywords:
    - flatten
    - unflatten
    - objects
    - nested
    - recursion
    - python
    - javascript
    - java
---
## Overview

Flattening transforms a deeply nested object into a single-level dictionary using dot-notation keys (e.g., `user.address.city` → `"London"`). Unflattening reverses this, reconstructing the original nested structure. These operations are essential for form libraries, database document updates, query string serialization, and converting between NoSQL documents and flat table columns. This recipe covers recursive implementations with custom separators, array index preservation, and round-trip fidelity in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Converting nested form data into flat key-value pairs for HTTP query strings or CSV export
- Patching only specific deeply nested fields in a MongoDB/Elasticsearch document
- Normalizing JSON API responses into a flat relational structure for analytics
- Building dynamic configuration systems where dot-notation paths access nested settings

## Solution

### Python

```python
from typing import Any

def flatten(obj: Any, separator: str = ".", prefix: str = "") -> dict:
    result = {}
    if isinstance(obj, dict):
        for key, value in obj.items():
            new_key = f"{prefix}{separator}{key}" if prefix else key
            result.update(flatten(value, separator, new_key))
    elif isinstance(obj, list):
        for index, value in enumerate(obj):
            new_key = f"{prefix}[{index}]"
            result.update(flatten(value, separator, new_key))
    else:
        result[prefix] = obj
    return result

def unflatten(flat: dict, separator: str = ".") -> Any:
    result = {}
    for key, value in flat.items():
        parts = key.split(separator)
        target = result
        for part in parts[:-1]:
            if part not in target:
                target[part] = {}
            target = target[part]
        target[parts[-1]] = value
    return result

# Usage
nested = {
    "user": {
        "name": "Alice",
        "address": {"city": "London", "zip": "SW1A"},
        "tags": ["admin", "active"]
    },
    "version": 1
}

flat = flatten(nested)
print(flat)
# {
#   "user.name": "Alice",
#   "user.address.city": "London",
#   "user.address.zip": "SW1A",
#   "user.tags[0]": "admin",
#   "user.tags[1]": "active",
#   "version": 1
# }

restored = unflatten(flat)
print(restored["user"]["address"]["city"])  # "London"
```

### JavaScript

```javascript
function flatten(obj, separator = ".", prefix = "") {
  const result = {};

  if (obj !== null && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}${separator}${key}` : key;
      Object.assign(result, flatten(value, separator, newKey));
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((value, index) => {
      const newKey = `${prefix}[${index}]`;
      Object.assign(result, flatten(value, separator, newKey));
    });
  } else {
    result[prefix] = obj;
  }

  return result;
}

function unflatten(flat, separator = ".") {
  const result = {};

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(separator);
    let target = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in target)) {
        // Detect array index for next part
        const nextPart = parts[i + 1];
        target[part] = /^\d+$/.test(nextPart) ? [] : {};
      }
      target = target[part];
    }

    target[parts[parts.length - 1]] = value;
  }

  return result;
}

// Usage
const nested = {
  user: {
    name: "Alice",
    address: { city: "London", zip: "SW1A" },
    tags: ["admin", "active"]
  },
  version: 1
};

const flat = flatten(nested);
console.log(flat["user.address.city"]); // "London"

const restored = unflatten(flat);
console.log(restored.user.address.city); // "London"
```

### Java

```java
import java.util.*;

public class FlattenUtil {

  public static Map<String, Object> flatten(Map<String, Object> map) {
    Map<String, Object> result = new LinkedHashMap<>();
    flattenHelper(map, "", result);
    return result;
  }

  private static void flattenHelper(Object obj, String prefix, Map<String, Object> result) {
    if (obj instanceof Map) {
      Map<?, ?> map = (Map<?, ?>) obj;
      for (Map.Entry<?, ?> entry : map.entrySet()) {
        String key = prefix.isEmpty() ? entry.getKey().toString()
                                      : prefix + "." + entry.getKey();
        flattenHelper(entry.getValue(), key, result);
      }
    } else if (obj instanceof List) {
      List<?> list = (List<?>) obj;
      for (int i = 0; i < list.size(); i++) {
        String key = prefix + "[" + i + "]";
        flattenHelper(list.get(i), key, result);
      }
    } else {
      result.put(prefix, obj);
    }
  }

  public static Map<String, Object> unflatten(Map<String, Object> flat) {
    Map<String, Object> result = new LinkedHashMap<>();

    for (Map.Entry<String, Object> entry : flat.entrySet()) {
      String[] parts = entry.getKey().split("\\.");
      Map<String, Object> target = result;

      for (int i = 0; i < parts.length - 1; i++) {
        String part = parts[i];
        if (!target.containsKey(part)) {
          String nextPart = parts[i + 1];
          target.put(part, nextPart.matches("\\d+") ? new ArrayList<>() : new LinkedHashMap<>());
        }
        target = (Map<String, Object>) target.get(part);
      }

      target.put(parts[parts.length - 1], entry.getValue());
    }

    return result;
  }

  // Usage
  public static void main(String[] args) {
    Map<String, Object> nested = new LinkedHashMap<>();
    Map<String, Object> user = new LinkedHashMap<>();
    Map<String, Object> address = new LinkedHashMap<>();
    address.put("city", "London");
    address.put("zip", "SW1A");
    user.put("name", "Alice");
    user.put("address", address);
    user.put("tags", List.of("admin", "active"));
    nested.put("user", user);
    nested.put("version", 1);

    Map<String, Object> flat = flatten(nested);
    System.out.println(flat.get("user.address.city")); // London

    Map<String, Object> restored = unflatten(flat);
    System.out.println(((Map<?, ?>) ((Map<?, ?>) restored.get("user")).get("address")).get("city"));
  }
}
```

## Explanation

- **Recursive traversal** walks every key-value pair in the nested structure. For each nested object, the function recurses with an updated prefix. For arrays, it appends `[index]` to preserve positional data.
- **Dot-notation keys** (`parent.child.key`) are human-readable and compatible with most query string parsers, lodash `get/set`, and MongoDB dot notation.
- **Unflatten reconstruction** splits dot-notation keys and builds nested objects level by level. Detecting array indices (numeric strings) lets it reconstruct arrays instead of objects with numeric keys.
- **Round-trip fidelity** is preserved when flattening then unflattening, provided no key contains the separator character. If keys contain dots, use a custom separator (`→`, `__`) or escape the separator.

## Variants

| Approach | Separator | Array Handling | Best For |
|----------|-----------|---------------|----------|
| Dot-notation | `.` | `[index]` suffix | MongoDB, lodash, query strings |
| Bracket-notation | `.` | `.0`, `.1` | PHP-style form data |
| Custom separator | `__` | `__0` | Keys that contain dots |
| Lodash `_.set` | `.` | Auto-detection | Quick one-liners with library dependency |
| JSON Pointer | `/` | `/0` | JSON Patch, RFC 6901 compliance |

## Best Practices

1. **Validate separator choice** — if your data keys might contain dots (e.g., domain names like `example.com`), use a custom separator like `__` or `→` to avoid ambiguous paths.
2. **Preserve array indices explicitly** — always include array indices in the flattened key (`tags[0]`). Without them, arrays become objects with numeric string keys on unflatten.
3. **Handle null and empty objects** — `null` values should be preserved as-is. Empty objects `{}` should either be preserved or explicitly omitted based on your use case.
4. **Type fidelity on round-trip** — flattening loses type information for Dates, Maps, Sets, and typed arrays. Serialize these to strings before flattening if type recovery matters.
5. **Limit depth for safety** — on untrusted input, cap recursion depth to prevent stack overflow attacks from malicious deeply nested JSON.

## Common Mistakes

1. Using dot-notation when data keys themselves contain dots, causing ambiguous or incorrect paths.
2. Flattening arrays without preserving indices, making round-trip reconstruction impossible.
3. Not handling circular references, which cause infinite recursion. Use a `WeakSet` cache to detect cycles.
4. Attempting to unflatten keys with inconsistent separators (mixing `.` and `_`) leading to malformed output.
5. Treating all numeric string keys as array indices, which turns object keys like `"123"` into arrays unexpectedly.

## Frequently Asked Questions

### Can I flatten only to a specific depth?

Yes. Modify the recursive function to accept a `maxDepth` parameter and stop recursing when `currentDepth >= maxDepth`. Return the remaining nested value under the current prefix. This is useful for shallow updates where you only need the top two levels flattened.

### How do I handle keys that contain the separator character?

Escape the separator in keys before flattening (e.g., replace `.` with `\.`), then unescape during unflattening. Alternatively, choose a separator that cannot appear in your data, such as `→` or Unicode characters. Many libraries (like `flat`) support custom separators.

### Does round-trip flatten → unflatten always produce identical output?

Not always. Arrays with sparse indices, objects with `null` prototypes, and special types (Date, RegExp, Map) may differ after round-trip. For strict fidelity, record metadata about original types alongside flattened data, or use a serialization format like JSON Pointer that preserves structural information.
