---
contentType: recipes
slug: parse-toml-files
title: "Parse TOML Files"
description: "How to parse TOML configuration files in Python, Java, and JavaScript."
metaDescription: "Learn how to parse TOML configuration files in Python, Java, and JavaScript. Read app configs with practical code examples."
difficulty: beginner
topics:
  - data
tags:
  - toml
  - parsing
  - config
  - python
  - javascript
  - java
relatedResources:
  - /recipes/data/parse-yaml-files
  - /recipes/data/parse-json
  - /recipes/data/validate-json-schema
  - /recipes/data/serialize-deserialize-data
  - /recipes/data/parse-xml-files
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Learn how to parse TOML configuration files in Python, Java, and JavaScript. Read app configs with practical code examples."
  keywords:
    - toml
    - parsing
    - config
    - python
    - javascript
    - java
---

## Overview

TOML (Tom's Obvious, Minimal Language) is a configuration file format designed to be more readable than JSON and simpler than YAML. It is the standard for Rust `Cargo.toml`, Python `pyproject.toml`, and many modern tools. Parsing TOML programmatically enables automated configuration management, environment-specific overrides, and tooling for package managers.

## When to Use

Use this resource when:
- Reading `pyproject.toml`, `Cargo.toml`, or `config.toml` in build scripts or CI/CD pipelines
- Building developer tools that need to parse project configuration files
- Migrating from INI or JSON to a more expressive config format
- Validating tool configuration before execution

## Solution

### Python

```python
# tomllib is included in Python 3.11+ standard library
# For Python < 3.11: pip install tomli
import tomllib

with open('pyproject.toml', 'rb') as f:
    config = tomllib.load(f)

print(config['project']['name'])
print(config['tool']['pytest']['ini_options'])
```

```python
# Writing TOML requires the third-party `tomli-w` package
# pip install tomli-w
import tomli_w

data = {'project': {'name': 'myapp', 'version': '1.0.0'}}
with open('output.toml', 'wb') as f:
    tomli_w.dump(data, f)
```

### JavaScript

```javascript
// @iarna/toml is a reliable TOML parser for Node.js
// npm install @iarna/toml
import toml from '@iarna/toml';
import fs from 'fs';

const doc = toml.parse(fs.readFileSync('config.toml', 'utf8'));
console.log(doc.database.host);
```

```javascript
// Dump objects to TOML
import toml from '@iarna/toml';

const data = { app: { name: 'myapp', debug: false } };
console.log(toml.stringify(data));
```

### Java

```java
// tomlj is a modern TOML parser for Java
// Maven: org.tomlj:tomlj
import org.tomlj.Toml;
import org.tomlj.TomlTable;

public class TomlParser {
    public static void main(String[] args) throws Exception {
        TomlTable table = Toml.parse("config.toml");
        String host = table.getString("database.host");
        System.out.println(host);
    }
}
```

## Explanation

TOML uses a strict, unambiguous grammar: key-value pairs, arrays, inline tables, and standard table/header sections (`[section]` / `[[array-of-tables]]`). Unlike YAML, TOML does not rely on indentation, making it less error-prone for manual editing. Dates and times use ISO 8601 format, and strings support both literal (`'...'`) and basic (`"..."`) forms with different escaping rules.

Python 3.11 added `tomllib` to the standard library, eliminating the need for external packages for parsing. For writing TOML, `tomli-w` remains the standard. JavaScript and Java ecosystems require third-party libraries because TOML is not natively supported.

## Variants

| Technology | Library | Approach | Notes |
|------------|---------|----------|-------|
| Python | `tomllib` | `load()` | Standard library since 3.11, read-only |
| Python | `tomli` | `load()` | Backport for < 3.11, identical API |
| Python | `tomli-w` | `dump()` | Standard for writing TOML |
| JavaScript | `@iarna/toml` | `parse()` / `stringify()` | Fast, spec-compliant |
| Java | `tomlj` | `Toml.parse()` | Modern, supports dotted key access |
| Java | `toml4j` | `Toml.read()` | Older but widely used |

## What Works

- **Use `tomllib` in Python 3.11+** instead of deprecated `toml` or `tomli` packages for reading
- **Quote strings with special characters** to avoid ambiguity in TOML parsers
- **Use dotted keys** (`database.host`) instead of nested tables when possible for flatter config
- **Keep arrays of tables (`[[...]]`) simple**: Deep nesting makes files hard to read
- **Version your `pyproject.toml`** carefully because it affects package resolution

## Common Mistakes

- **Using `tomllib` to write TOML**: It is read-only; use `tomli-w` for serialization
- **Forgetting `rb` mode in Python**: `tomllib.load()` requires binary mode, not text mode
- **Mixing dotted keys with table headers**: `key = 1` under `[section]` and `[section.key]` are different
- **Assuming TOML preserves key order**: The spec guarantees order for arrays but not necessarily for tables in all parsers
- **Not escaping backslashes in basic strings**: Use literal strings (`'...'`) for Windows paths and regex patterns

## Frequently Asked Questions

### Should I use TOML or YAML for my project configuration?

Use TOML when the config is flat, simple, and edited by developers (e.g., `pyproject.toml`, tool configs). Use YAML when you need complex nested structures, anchors, or extensive documentation in comments. Use JSON for machine-generated configs and API contracts.

### Can I validate TOML against a JSON Schema?

TOML parses into the same data structures as JSON (maps, arrays, scalars). After parsing, validate the resulting object against a JSON Schema using the same validators you use for JSON. There is no native "TOML Schema" equivalent, though the TOML spec itself enforces syntax rules.

### How do I merge multiple TOML files?

Parse each file independently, then deep-merge the resulting dictionaries/maps. Python `deepmerge`, JavaScript `lodash.merge`, and Java `Map.merge()` can combine configs. Implement override rules (e.g., `local.toml` overrides `base.toml`) explicitly in your application logic.
