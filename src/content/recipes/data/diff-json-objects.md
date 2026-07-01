---
contentType: recipes
slug: diff-json-objects
title: "Diff JSON Objects"
description: "How to compare two JSON objects and find differences in Python, Java, and JavaScript."
metaDescription: "Learn how to diff JSON objects in Python, Java, and JavaScript. Find added, removed, and changed keys with practical code examples."
difficulty: beginner
topics:
  - data
tags:
  - json
  - diff
  - comparison
  - merge
  - python
  - javascript
  - java
relatedResources:
  - /recipes/data/merge-json-files
  - /recipes/data/convert-csv-to-json
  - /recipes/data/convert-json-to-csv
  - /recipes/data/serialize-deserialize-data
  - /recipes/data/validate-json-schema
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Learn how to diff JSON objects in Python, Java, and JavaScript. Find added, removed, and changed keys with practical code examples."
  keywords:
    - json
    - diff
    - comparison
    - merge
    - python
    - javascript
    - java
---
## Overview

Comparing JSON objects is essential for testing, configuration drift detection, API response validation, and database migration audits. A proper diff reveals added keys, removed keys, type changes, and value mutations at arbitrary nesting levels. This recipe covers deep JSON diffing with structured output across Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Validating that a REST API response matches an expected schema snapshot
- Detecting configuration drift between environment files
- Auditing database migrations by diffing before/after row exports
- Writing snapshot tests for JSON-serialized domain objects

## Solution

### Python

```python
# deepdiff compares arbitrary Python objects recursively
# pip install deepdiff
from deepdiff import DeepDiff

old = {"user": {"name": "Alice", "age": 30}, "roles": ["admin"]}
new = {"user": {"name": "Alice", "age": 31}, "roles": ["admin", "editor"]}

diff = DeepDiff(old, new)
print(diff)
# {'values_changed': {...}, 'iterable_item_added': {...}}
```

```python
# Standard library alternative with json.dumps comparison
import json

old_json = json.dumps(old, sort_keys=True)
new_json = json.dumps(new, sort_keys=True)
print(old_json == new_json)
```

### JavaScript

```javascript
// fast-json-patch generates RFC 6902 patches
// npm install fast-json-patch
import * as jsonpatch from 'fast-json-patch';

const oldDoc = { user: { name: 'Alice', age: 30 }, roles: ['admin'] };
const newDoc = { user: { name: 'Alice', age: 31 }, roles: ['admin', 'editor'] };

const patch = jsonpatch.compare(oldDoc, newDoc);
console.log(patch);
// [{ op: 'replace', path: '/user/age', value: 31 }, ...]
```

```javascript
// deep-object-diff for simple added/changed/deleted reports
// npm install deep-object-diff
import { detailedDiff } from 'deep-object-diff';

console.log(detailedDiff(oldDoc, newDoc));
// { added: {}, deleted: {}, updated: { user: { age: 31 }, roles: [...] } }
```

### Java

```java
// zjsonpatch generates RFC 6902 JSON Patch
// Maven: com.flipkart.zjsonpatch:zjsonpatch
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flipkart.zjsonpatch.JsonDiff;

public class JsonDiffExample {
    public static void main(String[] args) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode oldNode = mapper.readTree("{\"user\":{\"name\":\"Alice\",\"age\":30}}");
        JsonNode newNode = mapper.readTree("{\"user\":{\"name\":\"Alice\",\"age\":31}}");
        JsonNode patch = JsonDiff.asJson(oldNode, newNode);
        System.out.println(patch.toPrettyString());
    }
}
```

```java
// Jackson readTree + custom visitor for deep comparison
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

public class CustomDiff {
    public static Map<String, Object> diff(JsonNode a, JsonNode b, String path) {
        Map<String, Object> changes = new LinkedHashMap<>();
        if (!a.equals(b)) {
            changes.put(path, Map.of("old", a, "new", b));
        }
        return changes;
    }
}
```

## Explanation

JSON diffing is fundamentally tree traversal. Two JSON trees are compared node by node: object keys are checked for presence in both sides, array elements are compared by index (or by value if order-independent), and scalar values are tested for equality. The output format depends on the library: `DeepDiff` (Python) produces a categorized report of changes; `fast-json-patch` (JS) and `zjsonpatch` (Java) emit RFC 6902 patches that can be replayed with `applyPatch`.

For configuration drift detection, a structural diff is sufficient. For snapshot testing, a full deep diff with path tracking is needed. For API sync operations, RFC 6902 patches are ideal because they are compact and reversible.

## Variants

| Technology | Library | Approach | Notes |
|------------|---------|----------|-------|
| Python | `deepdiff` | `DeepDiff(old, new)` | Categorized changes, ignores order, highly configurable |
| Python | `json` (stdlib) | `json.dumps(sort_keys=True)` | Quick equality check, no path reporting |
| JavaScript | `fast-json-patch` | `compare(old, new)` | RFC 6902 patches, reversible, compact |
| JavaScript | `deep-object-diff` | `detailedDiff(old, new)` | Simple added/updated/deleted split |
| Java | `zjsonpatch` | `JsonDiff.asJson(old, new)` | RFC 6902 via Jackson, battle-tested |
| Java | `Jackson` | Custom recursive visitor | Full control over comparison logic |

## What Works

- **Normalize before diffing**: Sort object keys and arrays if order is irrelevant; use `ignore_order=True` in DeepDiff
- **Use RFC 6902 patches for API operations**: They are standard, compact, and can be applied/reverted
- **Exclude volatile fields**: Timestamps, random IDs, and request counts should be excluded from comparison
- **Diff at the right granularity**: Deep diffs on 10MB JSONs are slow; compare subtrees or hashes for large objects
- **Store golden snapshots in version control**: Snapshot tests need baseline files committed alongside code

## Common Mistakes

- **Comparing floats directly**: Floating-point serialization differences (`1.0` vs `1.00`) trigger false positives; round before diffing
- **Ignoring array order**: `[1, 2]` and `[2, 1]` are different JSONs; decide if order matters for your use case
- **Diffing stringified JSON**: `JSON.stringify` key order is insertion-dependent; always sort keys or use canonical forms
- **Not handling null vs missing**: `{"a": null}` and `{}` are semantically different; ensure your diff library distinguishes them
- **Storing huge diffs in logs**: A full structural diff of a 5MB config file produces unreadable logs; summarize or hash instead

## Frequently Asked Questions

### How do I ignore specific fields when diffing JSON?

Use exclusion rules. `DeepDiff` supports `exclude_paths` and `exclude_regex_paths`. `fast-json-patch` does not filter natively; preprocess the objects by deleting ignored keys before comparison. In Java, walk the Jackson tree and prune excluded paths before calling `JsonDiff`.

### Can I diff JSON files while ignoring array order?

Yes. `DeepDiff` has `ignore_order=True`. For JS, convert arrays to sets or sort them before diffing if the order is irrelevant. In Java, sort `ArrayNode` elements with a custom comparator before comparison, or use a library that supports unordered comparison.

### How do I generate a human-readable diff report?

Convert the machine-readable diff into sentences. `DeepDiff`'s `pretty()` method produces readable output. For RFC 6902 patches, map operation codes to verbs: `replace` → "changed", `add` → "added", `remove` → "removed". In Java, iterate over the `JsonNode` patch array and format each operation with its path and values.
