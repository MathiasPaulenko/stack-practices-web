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
lastUpdated: "2026-07-09"
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

## Advanced: Environment-Specific Config Merging

```python
import tomllib
from pathlib import Path

def load_config(env: str = 'dev') -> dict:
    base = tomllib.loads(Path('config/base.toml').read_text())
    env_file = Path(f'config/{env}.toml')
    if env_file.exists():
        override = tomllib.loads(env_file.read_bytes())
        return deep_merge(base, override)
    return base

def deep_merge(base: dict, override: dict) -> dict:
    result = base.copy()
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result
```

Load a base config file, then overlay environment-specific overrides. This pattern supports `base.toml` for shared settings and `prod.toml` / `staging.toml` for environment differences. Deep-merge nested tables so overrides only replace the keys they specify.

## Advanced: TOML Validation with Pydantic

```python
import tomllib
from pydantic import BaseModel, ValidationError

class DatabaseConfig(BaseModel):
    host: str
    port: int = 5432
    password: str

class AppConfig(BaseModel):
    app_name: str
    debug: bool = False
    database: DatabaseConfig

with open('config.toml', 'rb') as f:
    raw = tomllib.load(f)

try:
    config = AppConfig(**raw)
except ValidationError as e:
    print(f"Config validation failed: {e}")
    raise
```

Parse TOML into a Pydantic model to get type checking, default values, and validation. This catches missing required fields, type mismatches, and invalid values at startup rather than at runtime. Use `model_config = ConfigDict(extra='forbid')` to reject unknown fields.

## Advanced: TOML Dotted Keys vs Nested Tables

```toml
# These two are equivalent

# Dotted keys
[database]
server.host = "localhost"
server.port = 5432

# Nested table
[database.server]
host = "localhost"
port = 5432
```

Dotted keys produce the same structure as nested tables but are more compact. Use dotted keys for shallow nesting (2-3 levels). Switch to explicit `[section]` headers when nesting goes deeper or when the section has many keys. Mixing both in the same section is valid but can confuse readers.

## Advanced: Writing TOML Files

```python
import tomli_w

config = {
    'app': {
        'name': 'myapp',
        'version': '2.1.0',
        'debug': False
    },
    'database': {
        'host': 'localhost',
        'port': 5432,
        'pool_size': 10
    },
    'features': ['auth', 'logging', 'metrics']
}

with open('config.toml', 'wb') as f:
    tomli_w.dump(config, f)
```

Python's `tomllib` is read-only. Use `tomli-w` to write TOML files. The `dump()` function accepts a dictionary and a binary file handle. For string output, use `tomli_w.dumps()` which returns a string. Note that `tomli-w` does not preserve comments or formatting from the original file — it generates TOML from the data structure.

## Advanced: TOML Arrays of Tables

```toml
[[servers]]
name = "web-1"
ip = "10.0.0.1"
port = 8080

[[servers]]
name = "web-2"
ip = "10.0.0.2"
port = 8080

[[servers]]
name = "db-1"
ip = "10.0.0.10"
port = 5432
```

Arrays of tables use `[[table_name]]` syntax to define multiple entries with the same structure. This is useful for server lists, feature flags, and database connection pools. In Python, these parse to a list of dictionaries under the `servers` key. In JavaScript with `@iarna/toml`, they become an array of objects.

## When to Avoid

- **Machine-generated configs**: JSON is better for configs written by tools and APIs
- **Deeply nested structures**: YAML handles 5+ levels of nesting more naturally than TOML
- **Large data files**: TOML is for configuration, not data storage; use JSON or a database for large datasets
- **Legacy systems**: If your toolchain only supports INI or JSON, adding TOML support may not be worth the migration cost

## Frequently Asked Questions

### Should I use TOML or YAML for my project configuration?

Use TOML when the config is flat, simple, and edited by developers (e.g., `pyproject.toml`, tool configs). Use YAML when you need complex nested structures, anchors, or extensive documentation in comments. Use JSON for machine-generated configs and API contracts.

### Can I validate TOML against a JSON Schema?

TOML parses into the same data structures as JSON (maps, arrays, scalars). After parsing, validate the resulting object against a JSON Schema using the same validators you use for JSON. There is no native "TOML Schema" equivalent, though the TOML spec itself enforces syntax rules.

### How do I merge multiple TOML files?

Parse each file independently, then deep-merge the resulting dictionaries/maps. Python `deepmerge`, JavaScript `lodash.merge`, and Java `Map.merge()` can combine configs. Implement override rules (e.g., `local.toml` overrides `base.toml`) explicitly in your application logic.

### Does TOML support comments?

Yes, TOML supports inline comments with `#`. Comments can appear on their own line or at the end of any line. This makes TOML more readable than JSON for human-edited configs. Unlike YAML, TOML comments are preserved by some parsers (e.g., `tomli-w` does not preserve comments, but `taplo` CLI tool does).

### How do I handle dates and times in TOML?

TOML has native date and time types using ISO 8601: `2026-07-09` (date), `07:30:00` (time), `2026-07-09T07:30:00Z` (datetime). Python's `tomllib` parses these into `datetime.date`, `datetime.time`, and `datetime.datetime` objects. Use these for scheduling configs, expiry dates, and version timestamps.

### What is the difference between TOML 1.0 and TOML 1.0.0-rc.1?

TOML 1.0 was finalized in November 2021. The rc.1 release candidate had minor differences in array trailing comma rules and multiline string behavior. Most parsers now target TOML 1.0. If you use features like heterogeneous arrays (arrays with mixed types), check your parser's version support — some parsers reject mixed-type arrays.

### Can I use TOML for Kubernetes manifests?

No. Kubernetes uses YAML for manifests because it supports multi-document files (`---` separator), complex nesting, and anchors. TOML lacks multi-document support and handles deep nesting less naturally. Use TOML for application configs and tool configs (`pyproject.toml`, `Cargo.toml`), not infrastructure manifests.

### How do I convert between TOML and JSON?

Parse the TOML file to a dictionary, then serialize to JSON. In Python: `json.dumps(tomllib.load(f))`. In JavaScript: `JSON.stringify(TOML.parse(content), null, 2)`. The reverse works too — parse JSON and write with `tomli_w.dump()`. This is useful for tooling that expects JSON input but your config is in TOML.
