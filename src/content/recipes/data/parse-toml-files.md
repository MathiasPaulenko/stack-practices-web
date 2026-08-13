---
contentType: recipes
slug: parse-toml-files
title: "Parse and Write TOML in Python, Java & JavaScript"
description: "How to parse and write TOML configuration files in Python, Java, and JavaScript."
metaDescription: "Learn to parse TOML config files in Python, Java and JavaScript. Read, write and validate TOML with practical code examples for real-world configuration."
difficulty: beginner
topics:
  - data
tags:
  - data
  - parsing
  - config
  - python
  - javascript
  - java
  - toml
  - tomli
relatedResources:
  - /recipes/parse-yaml-files
  - /recipes/parse-json
  - /recipes/validate-json-schema
  - /recipes/serialize-deserialize-data
  - /recipes/parse-xml-files
  - /recipes/parse-command-line-arguments
lastUpdated: "2026-08-13"
publishedAt: "2026-04-02"
author: Mathias Paulenko
seo:
  metaDescription: "Learn to parse TOML config files in Python, Java and JavaScript. Read, write and validate TOML with practical code examples for real-world configuration."
  keywords:
    - toml
    - parse toml
    - toml config
    - python
    - javascript
    - java
---

## Overview

TOML is the config format behind pyproject.toml, Cargo.toml and a growing pile of tool configs. It sits somewhere between JSON's rigidity and YAML's whitespace anxiety: you get comments, nested tables and typed values without worrying about indentation. I’ll walk through examples in Python, JavaScript and Java that cover both reading and writing. I’ll also share a few patterns that stop config files from turning into a mess.

## When to Use

Use this recipe when:

- you're reading pyproject.toml, Cargo.toml or config.toml in build scripts or CI/CD pipelines
- you're building a tool that needs to parse project configuration files
- you're migrating from INI or JSON to a format that supports comments and nested tables
- you want to validate tool configuration before your application starts

If your config is mostly machine-generated, JSON is still the safer bet. For deeply nested trees with anchors, YAML is usually less awkward. TOML's sweet spot is human-edited config that needs types and comments. If YAML might fit better, see [Parse YAML Files](/recipes/parse-yaml-files/).

## Solution

### Python

```python
# tomllib is in the standard library for Python 3.11+
# For older versions: pip install tomli
import tomllib

with open('pyproject.toml', 'rb') as f:
    config = tomllib.load(f)

print(config['project']['name'])
print(config['tool']['pytest']['ini_options'])
```

```python
# Writing TOML needs the third-party `tomli-w` package
# pip install tomli-w
import tomli_w

data = {'project': {'name': 'myapp', 'version': '1.0.0'}}
with open('output.toml', 'wb') as f:
    tomli_w.dump(data, f)
```

### JavaScript

```javascript
// @iarna/toml is a solid TOML parser for Node.js
// npm install @iarna/toml
import toml from '@iarna/toml';
import fs from 'fs';

const doc = toml.parse(fs.readFileSync('config.toml', 'utf8'));
console.log(doc.database.host);
```

```javascript
// Convert an object back to TOML
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

TOML files contain key-value pairs, arrays and tables. You mark a single table with a header in brackets and a list of tables with a header in double brackets, as the code below shows. It doesn't use indentation, so an accidental tab won't blow up your file the way it can in YAML. Dates and times are ISO 8601, and strings can be single-quoted literals or double-quoted basics with different escaping rules.

Python 3.11 ships with tomllib, so you don't need an external package to read TOML. For writing, reach for tomli-w. JavaScript and Java don't ship with TOML support, so you reach for @iarna/toml and tomlj. All three parse into the same maps, lists and scalars you'd get from JSON, which means you can validate TOML with the same schemas you already use for JSON.

## Variants

| Technology | Library | Approach | Notes |
| --- | --- | --- | --- |
| Python | tomllib | load() | Standard library since 3.11, read-only |
| Python | tomli | load() | Backport for Python < 3.11, same API |
| Python | tomli-w | dump() | The standard choice for writing TOML |
| JavaScript | @iarna/toml | parse() / stringify() | Fast and spec-compliant |
| Java | tomlj | Toml.parse() | Modern, supports dotted key access |
| Java | toml4j | Toml.read() | Older but still common |

## What Works

- If you're on Python 3.11 or later, read with tomllib and ignore the older toml package.
- If a string has quotes or backslashes, wrap it in double quotes and escape the tricky characters. The parser will trip otherwise.
- Prefer dotted keys like database.host over deeply nested tables when you can.
- Keep arrays of tables shallow; too much nesting makes files hard to scan.
- Pin pyproject.toml versions carefully, because they drive package resolution.

## Common Mistakes

People often try to write TOML with tomllib, but that module is read-only. For output, you need a different library: tomli-w.

Open a TOML file in text mode and the parser will choke or misread bytes, so always use mode 'rb'.

Don't mix dotted keys and table headers in the same section. Once you open a table with a bracketed header, a dotted key like server.host belongs inside it. Adding a nested header for the same path later is an error.

TOML parsers aren't required to preserve key order for tables, so don't rely on it. Arrays keep their order, which is why arrays of tables are safer for ordered lists.

Paths and regexes with lots of backslashes are easier in literal strings; single quotes let you skip the escaping dance.

## Advanced: Environment-Specific Config Merging

```python
import tomllib
from pathlib import Path

def load_config(env: str = 'dev') -> dict:
    base = tomllib.loads(Path('config/base.toml').read_text())
    env_file = Path(f'config/{env}.toml')
    if env_file.exists():
        override = tomllib.loads(env_file.read_text())
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

Load a base config, then layer environment-specific overrides on top. This pattern supports base.toml for shared settings and prod.toml or staging.toml for the differences. The deep merge keeps nested tables intact so an override only replaces the keys it explicitly sets.

## Advanced: TOML Validation with Pydantic

```python
import tomllib
from pydantic import BaseModel, ConfigDict, ValidationError

class DatabaseConfig(BaseModel):
    host: str
    port: int = 5432
    password: str

class AppConfig(BaseModel):
    model_config = ConfigDict(extra='forbid')
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

Parse the file into a Pydantic model and you get type checking, defaults and validation in one step. It flags missing fields, wrong types and values that just don't make sense. Those mistakes get caught before the app starts. The Pydantic model in the example also rejects unknown keys, which is useful when a config file has drifted from the expected schema.

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

Dotted keys and nested tables produce the same data structure, but dotted keys keep the file flatter. I use them when I'm only going two or three levels deep, and I switch to explicit bracketed headers when the nesting gets deeper. You can mix both styles in one section, but the next person who reads the file will probably be confused.

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

Python's tomllib can only read, so for writing you reach for tomli-w. Use dump() for files and dumps() for strings. It won't preserve comments or formatting from an existing file, because it generates TOML from your data structure from scratch.

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

For an array of tables, wrap the table name in double brackets. Every entry shares the same shape, so they work well for server lists, feature flags or database connection pools. In Python, you get a list of dictionaries under the table key. With @iarna/toml, JavaScript gives you an array of objects.

## When to Avoid

If a tool generates the config, JSON is usually less surprising because every language can read it without an extra dependency. YAML is the better choice once you hit five or more levels of nesting. TOML is meant for configuration, not data storage, so large datasets belong in JSON or a database. And if your toolchain only supports INI or JSON, adding TOML might not be worth the migration cost.

## Troubleshooting

If tomllib throws a TOMLDecodeError, the file probably has a duplicate key, a trailing comma in an array, or a dotted key that conflicts with a table header. Run python -m tomllib on the file or use the taplo CLI to pin down the line.

If JavaScript gives you undefined for a nested key, check whether you used dotted key syntax in the file. @iarna/toml parses dotted keys correctly, but a typo like databse.host instead of database.host won't raise; it just gives you undefined.

Losing comments when tomli-w rewrites a file is expected. The library doesn't preserve formatting; it rebuilds the document from the parsed data. Keep a template or version the file in git.

If an environment merge gives you a value you didn't expect, check that it isn't replacing whole tables when only one key should change. Log the base and override dictionaries while you debug.

## Further Reading

- For the exact syntax and data types, the [TOML specification](https://toml.io/en/v1.0.0) has the final word.
- The [Python tomllib docs](https://docs.python.org/3/library/tomllib.html) cover the standard library API and TOML 1.0 support.
- The [tomli-w repository](https://github.com/hukkin/tomli-w) has examples for writing TOML from Python.
- The [tomlj documentation](https://github.com/tomlj/tomlj) explains the Java parser and dotted key access.

## Production Notes

Pin parser versions in your requirements.txt or package.json. tomllib is tied to the Python version, but third-party libraries can ship breaking changes. Lint TOML files in CI with taplo or toml-test to catch duplicate keys and invalid dates before deploy. Store environment-specific TOML outside the repository if it contains secrets, or inject sensitive values through environment variables. If you generate TOML from source data, regenerate it rather than editing by hand, so comments and ordering stay consistent.

## Key Takeaways

TOML is a config format that humans can read and that Python, JavaScript and Java can parse with small, focused libraries. Read with tomllib, @iarna/toml or tomlj; write with tomli-w or toml.stringify. Validate the parsed data with Pydantic or JSON Schema to catch mistakes early. Use dotted keys and arrays of tables to keep files readable, and merge environment-specific overrides with a deep merge.

## FAQ

### Should I use TOML or YAML for my project configuration?

If the config is flat, edited by developers and needs comments, TOML is a good fit. Choose YAML for deep nesting, anchors or multi-document files. JSON is still the usual default when a machine generates the config.

### Can I validate TOML against a JSON Schema?

Yes. Parse the TOML file to a dictionary, then validate the result with any JSON Schema validator. TOML has no native schema language, so a schema after parsing is the usual approach.

### How do I merge more than one TOML file?

Parse each file on its own, then deep-merge the maps. In Python, deepmerge does the job; in JavaScript, lodash.merge or a hand-rolled recursive function; in Java, merge Map instances. Decide override rules explicitly, such as local.toml winning over base.toml.

### Does TOML support comments?

Yes. Comments start with # and can sit on their own line or at the end of a value line. That makes TOML more readable than JSON for hand-edited config.

### How do I handle dates and times in TOML?

TOML has native date, time and datetime types, all in ISO 8601. This means you can put real timestamps in a config file without wrapping them in strings.

```toml
started = 2026-08-13T07:30:00Z
expires = 2026-08-13
daily = 07:30:00
```

Python's tomllib converts them into real datetime objects, so you can compare them or pass them to other code without extra parsing. Use them for expiry dates, schedules and version timestamps.

### How do I convert between TOML and JSON?

Parse the TOML to a dictionary, then serialize it as JSON. In Python, hand the parsed dictionary to json.dumps. In JavaScript, feed the parsed object to JSON.stringify. The reverse also works: parse JSON and write it with tomli_w.dump().
