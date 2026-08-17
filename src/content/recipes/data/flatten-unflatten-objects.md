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
  - java
  - parsing
  - json
  - csv
  - recursion
relatedResources:
  - /recipes/parse-json
  - /recipes/url-encoding
  - /recipes/regular-expressions
  - /recipes/deep-clone-javascript
  - /recipes/merge-json-files
  - /recipes/serialize-deserialize-data
lastUpdated: "2026-08-17"
publishedAt: "2026-06-12"
author: Mathias Paulenko
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

Flattening turns a deeply nested object into a single-level dictionary with dot-notation keys like `user.address.city = "London"`. Unflattening rebuilds the original structure from those flat keys. Use it for form libraries, document updates, query strings, and converting NoSQL documents into flat table columns. The examples below run in Python, JavaScript, and Java, and cover custom separators, bracketed array indices, and round-trip fidelity.

## When to Use

Reach for this when:

- Converting nested form data into flat key-value pairs for [HTTP query strings](/recipes/url-encoding/) or CSV export.
- Patching only specific deeply nested fields in a MongoDB or Elasticsearch document.
- Normalizing [JSON API responses](/recipes/parse-json/) into a flat relational structure for analytics.
- Building live configuration systems where dot-notation paths access nested settings.

## Solution

### Python

```python
import re
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

def _set(node, parts, value):
    for i, part in enumerate(parts[:-1]):
        next_is_index = parts[i + 1].isdigit()
        if isinstance(node, list):
            index = int(part)
            while len(node) <= index:
                node.append(None)
            if node[index] is None:
                node[index] = [] if next_is_index else {}
            node = node[index]
        else:
            if part not in node:
                node[part] = [] if next_is_index else {}
            node = node[part]

    last = parts[-1]
    if isinstance(node, list):
        index = int(last)
        while len(node) <= index:
            node.append(None)
        node[index] = value
    else:
        node[last] = value

def unflatten(flat: dict, separator: str = ".") -> Any:
    result = {}
    split_re = re.compile(re.escape(separator) + r"|\[|\]")
    for key, value in flat.items():
        parts = [p for p in split_re.split(key) if p]
        _set(result, parts, value)
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

function _set(node, parts, value) {
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const nextIsIndex = /^\d+$/.test(parts[i + 1]);
    if (Array.isArray(node)) {
      const index = Number(part);
      while (node.length <= index) node.push(null);
      if (node[index] === null) {
        node[index] = nextIsIndex ? [] : {};
      }
      node = node[index];
    } else {
      if (!(part in node)) {
        node[part] = nextIsIndex ? [] : {};
      }
      node = node[part];
    }
  }

  const last = parts[parts.length - 1];
  if (Array.isArray(node)) {
    const index = Number(last);
    while (node.length <= index) node.push(null);
    node[index] = value;
  } else {
    node[last] = value;
  }
}

function unflatten(flat, separator = ".") {
  const result = {};
  const esc = separator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const splitRe = new RegExp(`${esc}|[\\[\\]]`, "g");

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(splitRe).filter(Boolean);
    _set(result, parts, value);
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
import java.util.regex.Pattern;

public class FlattenUtil {

  public static Map<String, Object> flatten(Map<String, Object> map) {
    Map<String, Object> result = new LinkedHashMap<>();
    flattenHelper(map, ".", "", result);
    return result;
  }

  private static void flattenHelper(Object obj, String separator, String prefix, Map<String, Object> result) {
    if (obj instanceof Map) {
      Map<?, ?> map = (Map<?, ?>) obj;
      for (Map.Entry<?, ?> entry : map.entrySet()) {
        String key = prefix.isEmpty() ? entry.getKey().toString()
                                      : prefix + separator + entry.getKey();
        flattenHelper(entry.getValue(), separator, key, result);
      }
    } else if (obj instanceof List) {
      List<?> list = (List<?>) obj;
      for (int i = 0; i < list.size(); i++) {
        String key = prefix + "[" + i + "]";
        flattenHelper(list.get(i), separator, key, result);
      }
    } else {
      result.put(prefix, obj);
    }
  }

  public static Map<String, Object> unflatten(Map<String, Object> flat) {
    return unflatten(flat, ".");
  }

  public static Map<String, Object> unflatten(Map<String, Object> flat, String separator) {
    Map<String, Object> result = new LinkedHashMap<>();
    String splitRegex = Pattern.quote(separator) + "|\\[|\\]";

    for (Map.Entry<String, Object> entry : flat.entrySet()) {
      String[] rawParts = entry.getKey().split(splitRegex);
      List<String> parts = new ArrayList<>();
      for (String p : rawParts) {
        if (!p.isEmpty()) parts.add(p);
      }
      build(result, parts, 0, entry.getValue());
    }

    return result;
  }

  @SuppressWarnings("unchecked")
  private static void build(Object node, List<String> parts, int index, Object value) {
    if (index == parts.size() - 1) {
      String part = parts.get(index);
      if (node instanceof List) {
        int i = Integer.parseInt(part);
        List<Object> list = (List<Object>) node;
        while (list.size() <= i) list.add(null);
        list.set(i, value);
      } else {
        ((Map<String, Object>) node).put(part, value);
      }
      return;
    }

    String part = parts.get(index);
    boolean nextIsIndex = parts.get(index + 1).matches("\\d+");

    if (node instanceof List) {
      int i = Integer.parseInt(part);
      List<Object> list = (List<Object>) node;
      while (list.size() <= i) list.add(null);
      Object child = list.get(i);
      if (child == null) {
        child = nextIsIndex ? new ArrayList<>() : new LinkedHashMap<>();
        list.set(i, child);
      }
      build(child, parts, index + 1, value);
    } else {
      Map<String, Object> map = (Map<String, Object>) node;
      if (!map.containsKey(part)) {
        map.put(part, nextIsIndex ? new ArrayList<>() : new LinkedHashMap<>());
      }
      build(map.get(part), parts, index + 1, value);
    }
  }

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
    Map<String, Object> restoredUser = (Map<String, Object>) restored.get("user");
    Map<String, Object> restoredAddress = (Map<String, Object>) restoredUser.get("address");
    System.out.println(restoredAddress.get("city")); // London
  }
}
```

## Explanation

Recursive traversal walks every key-value pair in the nested structure. Each nested object triggers another call with an updated prefix. For arrays, the function appends `[index]` to preserve positional data.

Dot-notation keys (`parent.child.key`) are human-readable and compatible with most query string parsers, lodash `get/set`, and MongoDB dot notation.

Unflattening splits dot-notation and bracket-index keys and builds nested objects level by level. Detecting array indices (numeric strings) lets it reconstruct arrays instead of objects with numeric keys.

Round-trip fidelity holds as long as no key contains the separator. If keys contain dots, switch to a custom separator like `→` or `__`, or escape the separator.

## Variants

| Approach | Separator | Array Handling | Best For |
| --- | --- | --- | --- |
| Dot-notation | `.` | `[index]` suffix | MongoDB, lodash, query strings |
| Bracket-notation | `.` | `.0`, `.1` | PHP-style form data |
| Custom separator | `__` | `__0` | Keys that contain dots |
| Lodash `_.set` | `.` | Auto-detection | Quick one-liners with library dependency |
| JSON Pointer | `/` | `/0` | JSON Patch, RFC 6901 compliance |

## Best Practices

The safest approach is to treat the separator as a reserved character. If your data might contain dots (for example, domain names like example.com), switch to a double underscore or an arrow symbol so the separator never clashes with the key itself.

Always keep array indices in the flat key (`tags[0]`). If you drop them, unflatten turns the array into an object whose keys are numeric strings, which breaks the round-trip.

Leave `null` values intact, and decide up front whether to keep or drop empty objects. The round-trip won't know what your application expected, so make the rule explicit.

Flattening can't preserve Dates, Maps, Sets, or typed arrays. If you need those types back, [serialize them first](/recipes/serialize-deserialize-data/) and unflatten around the string representation.

For untrusted input, cap the recursion depth and track visited objects with a `WeakSet` so a malicious payload can't blow the stack or loop forever.

## Common Mistakes

1. Using dots as separators when the keys themselves contain dots, which produces ambiguous paths.
2. Flattening arrays without preserving their indices means you can't reconstruct the original structure.
3. Not handling circular references, which cause infinite recursion. Track visited objects with a `WeakSet`.
4. Trying to unflatten keys that mix dots and underscore characters produces malformed output.
5. Treating all numeric string keys as array indices, which turns object keys like `"123"` into arrays unexpectedly.

## FAQ

### Can I flatten only to a specific depth?

Yes. Add a `maxDepth` parameter and stop recursing once `currentDepth >= maxDepth`. Everything below that depth stays nested under the current prefix. That works well for shallow updates where the first two levels are enough.

### How do I handle keys that contain the separator character?

Escape the separator in the keys before flattening (for example, replace `.` with `\.`), then unescape it during unflatten. Or choose a separator that can't show up in your data, like `→` or another Unicode character. Most libraries, including the flat package, let you set a custom separator.

### Does round-trip flatten → unflatten always produce identical output?

No. Sparse arrays, objects with a null prototype, and special types like Date, RegExp, and Map can change after a round-trip. If you need strict fidelity, store metadata about the original types alongside the flat data, or use a format like JSON Pointer that keeps structural information.

### How do I flatten objects with circular references?

Track visited objects with a `WeakSet`. When recursion finds a cycle, either drop the key or mark the object. If you want the reference to stay visible, use a placeholder such as `[Circular]`.

The circular link won't survive unflatten. If you need to keep it, use a library like `flatted` or `circular-json` that encodes cycles as indexed paths.

### What libraries handle flatten/unflatten in production?

In JavaScript, `flat` is widely used and supports custom separators, depth limits, and safe key handling. In Python, `flatten-dict` and `pandas.json_normalize` cover most cases. In Java, Jackson's `JsonPointer` and Gson's `JsonObject` traversal can flatten JSON trees. For database work, such as PostgreSQL JSON path queries, use the database's built-in functions instead of doing it in the application.

### How do I flatten TypeScript objects while preserving type information?

A generic type that builds keys recursively as ``${Prefix}.${Key}`` does the job. In TypeScript, that type is usually written as `Flatten<T>`. At runtime the function still produces plain string keys; the type only tells the compiler which keys to expect. Add `as const` assertions to the flattened output and validate untrusted input with a Zod schema.


