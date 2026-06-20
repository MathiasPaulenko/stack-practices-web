---
contentType: recipes
slug: serialize-deserialize-data
title: "Serialize and Deserialize Data"
description: "How to serialize and deserialize data in JSON, XML, and YAML across Python, Java, and JavaScript."
metaDescription: "Learn data serialization and deserialization in Python, Java, and JavaScript. Convert objects to JSON, XML, and YAML with code examples."
difficulty: beginner
topics:
  - data
tags:
  - serialization
  - json
  - xml
  - yaml
  - python
  - javascript
  - java
relatedResources:
  - /recipes/data/parse-json
  - /recipes/data/parse-xml-files
  - /recipes/data/parse-yaml-files
  - /recipes/data/validate-json-schema
  - /recipes/data/convert-json-to-csv
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Learn data serialization and deserialization in Python, Java, and JavaScript. Convert objects to JSON, XML, and YAML with code examples."
  keywords:
    - serialization
    - json
    - xml
    - yaml
    - python
    - javascript
    - java
---

## Overview

Serialization converts in-memory objects to a format that can be stored or transmitted. Deserialization reverses the process, reconstructing objects from bytes or text. These operations are essential for APIs, caching, message queues, configuration files, and session persistence. This recipe covers JSON, XML, and YAML serialization across Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Sending data over HTTP APIs or message brokers
- Saving application state to disk or caching layers
- Converting between configuration formats (JSON, YAML, XML)
- Implementing distributed systems that exchange typed messages

## Solution

### Python

```python
import json

# Serialize (object -> JSON string)
data = {'name': 'Alice', 'age': 30, 'active': True}
json_str = json.dumps(data, indent=2)
print(json_str)

# Deserialize (JSON string -> object)
parsed = json.loads(json_str)
print(parsed['name'])
```

```python
# YAML serialization with PyYAML
import yaml

yaml_str = yaml.safe_dump(data, default_flow_style=False)
parsed_yaml = yaml.safe_load(yaml_str)
```

### JavaScript

```javascript
// JSON is native to JavaScript
const data = { name: 'Alice', age: 30, active: true };

// Serialize
const jsonStr = JSON.stringify(data, null, 2);
console.log(jsonStr);

// Deserialize
const parsed = JSON.parse(jsonStr);
console.log(parsed.name);
```

```javascript
// YAML serialization with js-yaml
// npm install js-yaml
import yaml from 'js-yaml';

const yamlStr = yaml.dump(data);
const parsedYaml = yaml.load(yamlStr);
```

### Java

```java
// Jackson is the standard for JSON in Java
// Maven: com.fasterxml.jackson.core:jackson-databind
import com.fasterxml.jackson.databind.ObjectMapper;

public class SerializationDemo {
    public static void main(String[] args) throws Exception {
        ObjectMapper mapper = new ObjectMapper();

        User user = new User("Alice", 30, true);

        // Serialize
        String json = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(user);
        System.out.println(json);

        // Deserialize
        User parsed = mapper.readValue(json, User.class);
        System.out.println(parsed.getName());
    }
}

class User {
    private String name;
    private int age;
    private boolean active;

    public User() {}
    public User(String name, int age, boolean active) {
        this.name = name; this.age = age; this.active = active;
    }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public int getAge() { return age; }
    public void setAge(int age) { this.age = age; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
```

## Explanation

JSON is the dominant interchange format due to its simplicity and native support in JavaScript and modern languages. It maps cleanly to dictionaries/objects, arrays, strings, numbers, booleans, and null. XML remains relevant in enterprise SOAP services, configuration files (Spring, Android), and document-centric workflows. YAML is preferred for human-edited configs because it supports comments and complex nesting with minimal syntax.

Jackson (Java) uses reflection to bind JSON fields to POJO properties via getters/setters or public fields. Python `json` works with any JSON-serializable type (dicts, lists, primitives). JavaScript `JSON.stringify` handles cycles poorly (throws `TypeError`) unless a replacer is provided.

## Variants

| Technology | Format | Library | Approach | Notes |
|------------|--------|---------|----------|-------|
| Python | JSON | `json` (stdlib) | `dumps()` / `loads()` | Handles basic types, custom encoder support |
| Python | YAML | `PyYAML` | `safe_dump()` / `safe_load()` | Supports custom tags and anchors |
| Python | XML | `xml.etree.ElementTree` | `tostring()` / `fromstring()` | Standard library, no schema validation |
| JavaScript | JSON | Native | `JSON.stringify()` / `JSON.parse()` | Zero dependencies, supports reviver/replacer |
| JavaScript | YAML | `js-yaml` | `dump()` / `load()` | Fast, safe by default |
| Java | JSON | `Jackson` | `writeValueAsString()` / `readValue()` | POJO binding, streaming, tree model |
| Java | XML | `JAXB` / `Jackson XML` | Annotation-driven | JAXB is deprecated; prefer Jackson XML |

## Best Practices

- **Use `safe_load` for YAML** in untrusted contexts to prevent arbitrary code execution
- **Validate JSON Schema** after deserialization to ensure structural correctness before business logic
- **Handle circular references** explicitly in `JSON.stringify` with a replacer or library like `flatted`
- **Version your serialized data** by adding a `schema_version` field for backward-compatible evolution
- **Prefer JSON for APIs** and YAML for configs; avoid XML unless integrating with legacy systems

## Common Mistakes

- **Not handling `undefined` in JavaScript**: `JSON.stringify({x: undefined})` drops the key silently
- **Forgetting default constructors in Java**: Jackson requires a no-arg constructor for deserialization
- **Using `float` for monetary values**: Serialization can introduce precision errors; use `Decimal` / `BigDecimal`
- **Not setting content-type headers**: APIs should send `application/json`, not `text/plain`
- **Ignoring encoding issues**: Always specify UTF-8 when reading/writing serialized text files

## Frequently Asked Questions

### Which serialization format should I choose for microservices?

Use Protocol Buffers (protobuf) or MessagePack for internal service-to-service communication because they are compact and strongly typed. Use JSON for external APIs and human-facing endpoints because it is self-describing and universally supported.

### How do I handle custom object serialization in Python?

Implement a custom `JSONEncoder` subclass or provide a `default` callable to `json.dumps()` that converts your object to a serializable dict. For deserialization, pass an `object_hook` to `json.loads()` to reconstruct custom types from dicts.

### Can I serialize Java objects without getters and setters?

Yes. Jackson can serialize public fields directly if configured with `ObjectMapper.setVisibility(PropertyAccessor.FIELD, Visibility.ANY)`. However, using getters/setters is the standard Java convention and ensures encapsulation. Alternatively, use records (Java 14+) which generate canonical constructors and accessor methods automatically.
