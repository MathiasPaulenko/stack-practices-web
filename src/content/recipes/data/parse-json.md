---
contentType: recipes
slug: parse-json
title: "Parse JSON"
description: "How to parse JSON strings into native data structures across multiple programming languages."
metaDescription: "Practical JSON parsing examples in Python, JavaScript, and Java with code snippets, edge cases, and best practices for developers."
difficulty: beginner
topics:
  - data
tags:
  - data
  - java
  - javascript
  - json
  - parsing
  - python
relatedResources:
  - /recipes/call-rest-api
  - /recipes/read-write-file
  - /recipes/regular-expressions
lastUpdated: "2026-06-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Practical JSON parsing examples in Python, JavaScript, and Java with code snippets, edge cases, and best practices for developers."
  keywords:
    - json
    - parsing
    - python
    - javascript
    - java
---
## Overview

JSON is the de-facto data interchange format for modern APIs, configuration files, and inter-service communication. Parsing JSON means converting a JSON-formatted string into a native data structure your language can work with (objects, dictionaries, arrays).

Every mainstream language ships with first-class JSON support, either built in or through a well-established library. This recipe shows the idiomatic way to parse JSON in Python, JavaScript, and Java.

## When to Use

Use this recipe when:

- Consuming a REST API that returns a JSON payload
- Reading configuration or data files stored as `.json`
- Deserializing webhook bodies or message-queue events
- Converting a JSON string into typed objects in your domain model

## Solution

### Python

```python
import json

raw = '{"name": "Ada", "age": 36, "skills": ["math", "code"]}'
data = json.loads(raw)

print(data["name"])      # "Ada"
print(data["skills"][0])  # "math"
```

### JavaScript

```javascript
const raw = '{"name": "Ada", "age": 36, "skills": ["math", "code"]}';
const data = JSON.parse(raw);

console.log(data.name);       // "Ada"
console.log(data.skills[0]);  // "math"
```

### Java

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

ObjectMapper mapper = new ObjectMapper();
JsonNode node = mapper.readTree(
    "{\"name\": \"Ada\", \"age\": 36}");

String name = node.get("name").asText(); // "Ada"
int age = node.get("age").asInt();        // 36
```

## Explanation

Each language takes a slightly different approach:

- **Python** uses the built-in `json` module. `json.loads()` parses a string; `json.load()` parses from a file object. It returns native `dict` and `list` structures.
- **JavaScript** uses the built-in `JSON.parse()`. It returns plain objects and arrays. Never use `eval()` to parse JSON — it is a security risk.
- **Java** has no built-in parser, so you add a library such as [Jackson](https://github.com/FasterXML/jackson) or Gson. `readTree()` gives you a navigable tree; `readValue()` maps directly onto typed POJOs.

Once you have the parsed data, see [Call a REST API](/recipes/call-rest-api) to fetch JSON over HTTP, or [Read and Write Files](/recipes/read-write-file) to load it from disk.

## Variants

| Language | Tool | Returns | Parse from file |
|----------|------|---------|-----------------|
| Python | `json` (stdlib) | `dict` / `list` | `json.load(f)` |
| JavaScript | `JSON.parse()` (builtin) | `Object` / `Array` | read file, then parse |
| Java | Jackson / Gson | `JsonNode` / POJO | `mapper.readValue(file, T.class)` |

## Best Practices

- **Always handle parse errors**: wrap parsing in `try/except` (Python) or `try/catch` (JS/Java) — external JSON is untrusted.
- **Prefer typed models in Java**: map onto POJOs with `readValue()` instead of navigating `JsonNode` by string keys.
- **Never use `eval()` in JavaScript**: it executes arbitrary code; always use `JSON.parse()`.
- **Stream large payloads**: use `ijson` (Python) or Jackson's streaming `JsonParser` to avoid loading huge files into memory.
- **Validate against a schema**: for APIs you own, validate with JSON Schema before trusting the structure.

## Common Mistakes

- **Ignoring encoding**: JSON is UTF-8; reading a file with the wrong encoding corrupts characters.
- **Catching nothing**: malformed JSON throws — silently crashing the request handler is worse than a clear 400 response.
- **Number precision in JavaScript**: integers beyond `Number.MAX_SAFE_INTEGER` lose precision; parse large IDs as strings.
- **Confusing `loads` and `load`**: in Python, `loads` takes a string, `load` takes a file object.
- **Trusting key case**: JSON keys are case-sensitive; `Name` and `name` are different fields.

## Frequently Asked Questions

**Q: How do I parse JSON from a file in Python?**
A: Use `json.load(f)` (note `load`, not `loads`), passing an open file object: `with open("data.json") as f: data = json.load(f)`.

**Q: What is the Java equivalent of Python's `json.loads`?**
A: `ObjectMapper.readValue(String, Class<T>)` to map onto a typed object, or `readTree(String)` for an untyped tree.

**Q: Should I validate JSON before parsing it?**
A: For APIs you control, validate with JSON Schema. For external sources, defensive parsing with try/catch is usually enough.
