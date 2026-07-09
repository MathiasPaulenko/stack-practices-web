---
contentType: recipes
slug: parse-json
title: "Parse JSON"
description: "How to parse JSON strings into native data structures across multiple programming languages."
metaDescription: "Practical JSON parsing examples in Python, JavaScript, and Java with code snippets, edge cases, and what works for developers."
difficulty: beginner
topics:
  - data
tags:
  - data
  - java
  - javascript
  - parsing
  - json
relatedResources:
  - /recipes/call-rest-api
  - /recipes/read-write-file
  - /recipes/regular-expressions
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Practical JSON parsing examples in Python, JavaScript, and Java with code snippets, edge cases, and what works for developers."
  keywords:
    - json
    - parsing
    - python
    - javascript
    - java
---
## Overview

JSON is the de-facto data interchange format for modern APIs, configuration files, and inter-service communication. Parsing JSON means converting a JSON-formatted string into a native data structure your language can work with (objects, dictionaries, arrays).

Every mainstream language ships with first-class JSON support, either built in or through a well-established library. This recipe shows the idiomatic way to parse JSON in Python, JavaScript, and Java, plus error handling, streaming for large payloads, and schema validation.

## When to Use

Use this recipe when:

- Consuming a REST API that returns a JSON payload
- Reading configuration or data files stored as `.json`
- Deserializing webhook bodies or message-queue events
- Converting a JSON string into typed objects in your domain model. See [Data Validation Zod](/recipes/security/data-validation-zod) for schema-based parsing.

## When to Avoid

- **YAML or TOML for human-edited config**: JSON lacks comments and multi-line strings. Use TOML or YAML for hand-authored configuration.
- **Binary data**: JSON encodes binary as base64, inflating size by 33%. Use Protobuf, MessagePack, or CBOR for binary-heavy payloads.
- **Huge files that do not fit in memory**: use streaming parsers (see Advanced section) instead of `json.loads` / `JSON.parse`.

## Solution

### Python

```python
import json

raw = '{"name": "Ada", "age": 36, "skills": ["math", "code"]}'
data = json.loads(raw)

print(data["name"])      # "Ada"
print(data["skills"][0])  # "math"
```

Parse from a file:

```python
import json

with open("data.json", encoding="utf-8") as f:
    data = json.load(f)
```

Parse with error handling:

```python
import json

try:
    data = json.loads(raw)
except json.JSONDecodeError as e:
    print(f"Invalid JSON at line {e.lineno}, col {e.colno}: {e.msg}")
    raise
```

### JavaScript

```javascript
const raw = '{"name": "Ada", "age": 36, "skills": ["math", "code"]}';
const data = JSON.parse(raw);

console.log(data.name);       // "Ada"
console.log(data.skills[0]);  // "math"
```

Parse with a reviver function to transform values during parsing:

```javascript
const raw = '{"date": "2026-01-15", "count": "42"}';
const data = JSON.parse(raw, (key, value) => {
  if (key === 'count') return Number(value);
  if (key === 'date') return new Date(value);
  return value;
});
// data.date is a Date object, data.count is a number
```

Parse with error handling:

```javascript
try {
  const data = JSON.parse(raw);
} catch (e) {
  if (e instanceof SyntaxError) {
    console.error('Invalid JSON:', e.message);
  }
  throw e;
}
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

Map directly to a typed POJO:

```java
public class User {
    public String name;
    public int age;
    public List<String> skills;
}

User user = mapper.readValue(jsonString, User.class);
```

Parse with error handling:

```java
try {
    User user = mapper.readValue(json, User.class);
} catch (JsonProcessingException e) {
    log.error("Invalid JSON: {}", e.getOriginalMessage());
    throw new IllegalArgumentException("Bad request", e);
}
```

## Explanation

Each language takes a slightly different approach:

- **Python** uses the built-in `json` module. `json.loads()` parses a string; `json.load()` parses from a file object. It returns native `dict` and `list` structures.
- **JavaScript** uses the built-in `JSON.parse()`. It returns plain objects and arrays. Never use `eval()` to parse JSON — it is a security risk.
- **Java** has no built-in parser, so you add a library such as [Jackson](https://github.com/FasterXML/jackson) or Gson. `readTree()` gives you a navigable tree; `readValue()` maps directly onto typed POJOs.

Once you have the parsed data, see [Call a REST API](/recipes/api/call-rest-api) to fetch JSON over HTTP, or [Read and Write Files](/recipes/file-handling/read-write-file) to load it from disk.

## Variants

| Language | Tool | Returns | Parse from file |
|----------|------|---------|-----------------|
| Python | `json` (stdlib) | `dict` / `list` | `json.load(f)` |
| JavaScript | `JSON.parse()` (builtin) | `Object` / `Array` | read file, then parse |
| Java | Jackson / Gson | `JsonNode` / POJO | `mapper.readValue(file, T.class)` |
| Go | `encoding/json` (stdlib) | `map[string]interface{}` / struct | `json.NewDecoder(r).Decode(&v)` |
| Rust | `serde_json` crate | `Value` / struct | `serde_json::from_reader(r)` |
| C# | `System.Text.Json` (stdlib) | `JsonElement` / class | `JsonSerializer.Deserialize<T>(stream)` |

## Advanced: Streaming Large JSON Files

When JSON files are too large to fit in memory (GBs of data), use streaming parsers that process the file incrementally.

### Python with ijson

```python
import ijson

def process_large_json(file_path):
    with open(file_path, 'rb') as f:
        for item in ijson.items(f, 'items.item'):
            process(item)
```

### Java with Jackson Streaming

```java
try (JsonParser parser = mapper.getFactory().createParser(new File("large.json"))) {
    while (parser.nextToken() != JsonToken.END_OBJECT) {
        String fieldName = parser.getCurrentName();
        if ("items".equals(fieldName)) {
            parser.nextToken(); // START_ARRAY
            while (parser.nextToken() != JsonToken.END_ARRAY) {
                Item item = parser.readValueAs(Item.class);
                process(item);
            }
        }
    }
}
```

### JavaScript with stream-json

```javascript
const fs = require('fs');
const streamJson = require('stream-json');

const pipeline = fs.createReadStream('large.json')
  .pipe(streamJson.parser());

pipeline.on('data', (data) => {
  if (data.name === 'startArray') {
    // handle array start
  }
});
```

## Advanced: JSON Schema Validation

Validate JSON structure before trusting it:

```python
import jsonschema

schema = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "age": {"type": "integer", "minimum": 0},
    },
    "required": ["name"],
}

jsonschema.validate(data, schema)  # raises ValidationError if invalid
```

```javascript
const Ajv = require('ajv');
const ajv = new Ajv();
const validate = ajv.compile(schema);

if (!validate(data)) {
  console.error(validate.errors);
}
```

## What Works

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

### How do I parse JSON from a file in Python?

Use `json.load(f)` (note `load`, not `loads`), passing an open file object: `with open("data.json") as f: data = json.load(f)`. Always specify `encoding="utf-8"` since JSON is UTF-8 by spec.

### What is the Java equivalent of Python's `json.loads`?

`ObjectMapper.readValue(String, Class<T>)` to map onto a typed object, or `readTree(String)` for an untyped tree. Jackson also supports `readValue(File, Class)` and `readValue(InputStream, Class)` for file and stream sources.

### Should I validate JSON before parsing it?

For APIs you control, validate with JSON Schema after parsing. For external sources, defensive parsing with try/catch is the minimum. If the structure is critical (e.g., financial data), use schema validation regardless of source.

### How do I handle large integers in JavaScript JSON?

JavaScript numbers are 64-bit floats, so integers beyond `Number.MAX_SAFE_INTEGER` (2^53 - 1) lose precision. Use a reviver function to parse large numbers as strings: `JSON.parse(raw, (k, v) => typeof v === 'number' && v > Number.MAX_SAFE_INTEGER ? String(v) : v)`. Or use `BigInt` with a custom parser.

### How do I parse JSON with comments (JSONC)?

Standard JSON does not allow comments. Use a JSONC parser: `jsonc-parser` (npm), `json5` (Python/JS), or strip comments before parsing. In VS Code settings, JSONC is common. Do not use `eval()` as a workaround.

### What is the difference between `JSON.parse` and `JSON.stringify`?

`JSON.parse` converts a JSON string into a JavaScript value. `JSON.stringify` does the reverse: converts a JavaScript value into a JSON string. They are inverses, but `stringify` drops `undefined` values and functions.

### How do I parse JSON streams (NDJSON)?

NDJSON (newline-delimited JSON) has one JSON object per line. In Python, split lines and parse each: `[json.loads(line) for line in f if line.strip()]`. In Node.js, use `readline` with `JSON.parse`. In Java, use `ObjectMapper.readValues()` with a line-delimited reader.

### How do I handle circular references when serializing to JSON?

You cannot serialize circular references with standard `JSON.stringify` — it throws `TypeError`. Use a custom replacer function that tracks seen objects, or use libraries like `flatted` or `circular-json` that encode circular references with path references.

### What is JSON5 and should I use it?

JSON5 is a superset of JSON that allows comments, trailing commas, unquoted keys, and multi-line strings. It is useful for human-authored config files. Use `json5` library to parse. Do not use JSON5 for API payloads — stick to standard JSON for interoperability.

### How do I parse JSON in Go?

Use `encoding/json` from the stdlib: `var v MyStruct; err := json.Unmarshal([]byte(raw), &v)`. For streaming, use `json.NewDecoder(r).Decode(&v)`. Go requires exported struct fields with `json:"fieldName"` tags for mapping.

### How do I pretty-print JSON?

Python: `json.dumps(data, indent=2)`. JavaScript: `JSON.stringify(data, null, 2)`. Java: `mapper.writerWithDefaultPrettyPrinter().writeValueAsString(obj)`. Go: `json.MarshalIndent(v, "", "  ")`.

### What is the maximum JSON string size?

There is no spec limit. Practical limits depend on your parser and memory. Python's `json` handles strings up to available memory. JavaScript's `JSON.parse` is limited by the JS heap (typically 2-4 GB). For files larger than 1 GB, use streaming parsers.
