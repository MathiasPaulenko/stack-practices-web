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

TOML used to look like a bad idea to me. INI with brackets. Then pyproject.toml and Cargo.toml showed up, and now I can't get away from the stuff. Honestly, it grew on me. JSON is too stiff. YAML makes me paranoid about whitespace. TOML sits in the middle: comments, nested tables, typed values, and none of the indentation meltdowns. Below is how I read and write it in Python, JavaScript, and Java. Plus the mess I made. So you don't have to.

TOML stands for Tom's Obvious, Minimal Language. Tom Preston-Werner wrote the spec. That's why it's opinionated.

## When to Use

I reach for TOML when I'm dealing with pyproject.toml, Cargo.toml, or a config.toml inside build scripts and CI/CD. Also when I'm building a tool that parses project config. Or when I move away from INI or JSON and want comments and nested tables in one file. Validating a tool's config before startup? Parse TOML first. Easy win.

Machine-generated config? I stick with JSON. Deep trees with anchors? YAML is less awkward. TOML shines for human-edited config that needs types and comments. YAML person? I usually send them to [Parse YAML Files](/recipes/parse-yaml-files/).

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

TOML is basically key-value pairs, arrays, and tables. One table gets a bracketed header. A list of tables uses double brackets. The code above shows it. It doesn't care about indentation, so one accidental tab won't blow up the file like in YAML. Dates and times follow ISO 8601, and strings can be single-quoted literals or double-quoted basics with different escaping rules. Different escaping rules for no reason. That's the spec.

Python 3.11 ships with tomllib, so I don't need another package just to read TOML. For writing, I grab tomli-w. JavaScript and Java don't have TOML support out of the box, so I use @iarna/toml and tomlj. All three give me maps, lists, and scalars that look a lot like JSON, which means I can validate TOML with the same schemas I use for JSON.

## Variants

| Technology | Library | Approach | Notes |
| --- | --- | --- | --- |
| Python | tomllib | load() | Read-only. Don't write with it. |
| Python | tomli | load() | Backport. Same API. |
| Python | tomli-w | dump() | The one I use for writing. |
| JavaScript | @iarna/toml | parse() / stringify() | Fast and spec-compliant. |
| Java | tomlj | Toml.parse() | Modern. Likes dotted keys. |
| Java | toml4j | Toml.read() | Older. Still around. |

## What Works

On Python 3.11 or later, I use tomllib and ignore the older toml package. If a string has quotes or backslashes inside, I wrap it in double quotes and escape the tricky bits; otherwise the parser trips. I prefer dotted keys like database.host over deeply nested tables whenever I can. Arrays of tables should stay shallow, because too much nesting makes a file hard to scan. pyproject.toml versions matter more than they look, since they drive package resolution. Boring. But if you get it wrong, it ruins your afternoon.

## Common Mistakes

I've tried writing TOML with tomllib. It doesn't write. Read-only. For output, use tomli-w. I once spent an hour debugging a parse error. Then I remembered I opened the file in text mode. The parser chokes or misreads bytes, so I always open in binary mode.

Don't mix dotted keys and table headers in the same section. Once a table has a bracketed header, a dotted key like server.host belongs inside it. A nested header for the same path later is an error. TOML parsers aren't required to keep table key order, so I don't rely on it. Arrays keep their order, which is why arrays of tables feel safer for ordered lists. Paths or regexes with backslashes? Throw them in literal strings with single quotes. Skip the escape dance.

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

I start with a base config. Then I pile environment-specific overrides on top. base.toml for shared settings. prod.toml or staging.toml for the differences. The deep merge keeps nested tables intact, so an override only replaces the keys it explicitly sets. If a merge gives me a weird value, it's usually because it replaced a whole table when only one key should change. Classic.

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

Parse a file into a Pydantic model and you get type checking, defaults, and validation in one shot. It catches missing fields, bad types, and values that make no sense before the app starts. The Pydantic model in this example also rejects unknown keys, which I like because it screams at me when a config file has drifted away from the expected schema.

Pydantic isn't the only option. If I need a language-agnostic schema, I [validate the parsed TOML with JSON Schema](/recipes/validate-json-schema/) instead.

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

Dotted keys and nested tables produce the same data structure, but dotted keys keep the file flatter. I use them when I'm only two or three levels deep. I switch to explicit bracketed headers when the nesting gets deeper. You can mix both styles in one section, but the next person reading the file will probably want a word with you. I try to avoid it.

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

Python's tomllib only reads, so for writing I reach for tomli-w. dump for files, dumps for strings. It won't keep comments or formatting from an existing file because it generates the TOML from the parsed data from scratch. I always forget that the first time.

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

For an array of tables, wrap the table name in double brackets. Every entry has the same shape. That's why these things work for server lists, feature flags, or database connection pools. In Python, that table key becomes a list of dicts. With @iarna/toml, you get an array of objects.

## When to Avoid

If a tool generates the config, [JSON](/recipes/parse-json/) is usually less surprising because every language can read it without an extra dependency. YAML is the better choice once you hit five or more levels of nesting. TOML is meant for configuration, not data storage, so large datasets belong in JSON or a database. And if your toolchain only speaks INI or JSON, migrating to TOML can be more trouble than it's worth. Sometimes "boring and works" beats "shiny and new".

## Troubleshooting

If tomllib throws a TOMLDecodeError, the file probably has a duplicate key, a trailing comma in an array, or a dotted key that conflicts with a table header. I usually run python -m tomllib on the file or use the taplo CLI. Find the exact line.

JavaScript gives you undefined for a nested key? Check whether you used dotted key syntax in the file. @iarna/toml handles dotted keys fine, but if you typo databse.host instead of database.host, it won't raise. It just returns undefined. No traceback. No hint. Nothing. Ask me how I know.

When tomli-w rewrites a file, comments disappear. Expected. Still annoying. The library doesn't preserve formatting; it rebuilds the document from the parsed data. I keep a template or version the file in git.

If an environment merge gives you a value you didn't expect, check that it's not replacing whole tables when only one key should change. Log the base and override dictionaries while you debug.

## Further Reading

I keep the [TOML specification](https://toml.io/en/v1.0.0) bookmarked. Too many hours lost to weird edge cases. It settles arguments about syntax and data types. For the Python API, the [Python tomllib docs](https://docs.python.org/3/library/tomllib.html) are where I end up. They cover the API and TOML 1.0 support. When I need to write TOML from Python, I peek at the [tomli-w repository](https://github.com/hukkin/tomli-w) for examples. And the [tomlj documentation](https://github.com/tomlj/tomlj) explains the Java parser and dotted key access. The feature I use most.

## Production Notes

I pin parser versions in requirements.txt or package.json. tomllib is tied to the Python version, but third-party libraries can ship breaking changes. I run taplo or toml-test in CI to catch duplicate keys and bad dates before they hit production. Not glamorous. It saves me from bad deploys. Environment-specific TOML with secrets stays out of the repo, or I inject sensitive values through environment variables. If I generate TOML from source data, I regenerate it. I don't edit by hand. Keeps comments and ordering consistent.

## Key Takeaways

TOML is a config format humans can read. Python, JavaScript, and Java can parse it with small, focused libraries. I read it with tomllib, @iarna/toml, or tomlj; I write it with tomli-w or toml.stringify. To catch mistakes early, I throw Pydantic or JSON Schema at the parsed data. Dotted keys and arrays of tables keep files readable, and a deep merge handles environment-specific overrides.

## FAQ

### Should I use TOML or YAML for my project configuration?

Flat config, edited by developers, and needs comments? TOML is a good fit. Deep nesting, anchors, or multi-document files? Choose YAML. A machine generates it? JSON is the usual default. I usually start with TOML unless I already know the config will grow deep roots.

### Can I validate TOML against a JSON Schema?

Yes. Parse the TOML file to a dictionary, then validate the result with any JSON Schema validator. TOML has no native schema language, so a schema after parsing is the usual approach. Not native, but it works.

### How do I merge more than one TOML file?

Parse each file on its own, then deep-merge the maps. In Python, deepmerge does the job; in JavaScript, lodash.merge or a hand-rolled recursive function; in Java, merge Map instances. Decide override rules explicitly, such as local.toml winning over base.toml. Otherwise you'll have a bad time.

### Does TOML support comments?

Yes. Comments start with # and can sit on their own line or at the end of a value line. That makes TOML more readable than JSON for hand-edited config. It doesn't do block comments, though. Annoying, but true.

### How do I handle dates and times in TOML?

TOML has native date, time, and datetime types, all in ISO 8601. That means real timestamps in a config file. No string wrapping needed.

```toml
started = 2026-08-13T07:30:00Z
expires = 2026-08-13
daily = 07:30:00
```

Python's tomllib turns them into real datetime objects, so you can compare them or pass them around without extra parsing. I mostly use them for expiry dates, schedules, and version timestamps. Handy.

### How do I convert between TOML and JSON?

Parse the TOML to a dictionary, then serialize it as JSON. In Python, pass the parsed dictionary to json.dumps. In JavaScript, feed the parsed object to JSON.stringify. The reverse also works: parse JSON and write it with tomli_w.dump().

For a fuller conversion workflow, see [Serialize and Deserialize Data](/recipes/serialize-deserialize-data/).
