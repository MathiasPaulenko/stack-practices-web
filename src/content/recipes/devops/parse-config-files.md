---
contentType: recipes
slug: parse-config-files
title: "Parse and Validate YAML/JSON Configuration"
description: "How to parse and validate application configuration files in YAML and JSON across Python, JavaScript, Java, and Go."
metaDescription: "Parse and validate YAML and JSON config files in Python, JavaScript, Java, and Go. Covers schema validation, environment overrides, and safe defaults."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - yaml
  - json
  - config
  - validation
  - python
  - javascript
  - java
  - go
relatedResources:
  - /recipes/input-validation
  - /recipes/environment-variables
  - /recipes/cli-tool-argument-parsing
  - /recipes/feature-flags
  - /recipes/docker-compose-local-dev
  - /recipes/health-check-endpoint
lastUpdated: "2026-08-19"
publishedAt: "2026-06-11"
author: Mathias Paulenko
seo:
  metaDescription: "Parse and validate YAML and JSON config files in Python, JavaScript, Java, and Go. Covers schema validation, environment overrides, and safe defaults."
  keywords:
    - config
    - yaml
    - json
    - validation
    - schema
    - python
    - javascript
    - java
    - go
---

## Overview

Most apps need external configuration to behave differently across environments without
rebuilding. YAML and JSON are the dominant formats, but parsing alone isn't enough.
Invalid configs cause runtime failures. This recipe shows how to parse a file and
validate it before the app starts.

## When to Use

- Loading database credentials, API keys, or feature flags from external files.
- Supporting several deployment environments with different settings.
- Validating user-supplied configuration to fail fast on startup.
- Migrating from hard-coded constants to file-based configuration.

## When NOT to Use

- For secrets that should never touch disk: use environment variables or a secret
  manager.
- When a single environment variable is enough; don't add a config file for one value.

## Solution

### Python with Pydantic

```python
import json
import yaml
from pydantic import BaseModel, Field, ValidationError
from pathlib import Path

class DatabaseConfig(BaseModel):
    host: str
    port: int = Field(default=5432, ge=1, le=65535)
    username: str
    password: str

class AppConfig(BaseModel):
    app_name: str
    debug: bool = False
    database: DatabaseConfig

def load_config(path: str) -> AppConfig:
    file_path = Path(path)
    raw = file_path.read_text(encoding="utf-8")

    if file_path.suffix in (".yaml", ".yml"):
        data = yaml.safe_load(raw)
    elif file_path.suffix == ".json":
        data = json.loads(raw)
    else:
        raise ValueError(f"Unsupported config format: {file_path.suffix}")

    return AppConfig.model_validate(data)

try:
    config = load_config("config.yaml")
    print(config.database.host)
except ValidationError as e:
    print("Config validation failed:", e)
```

### JavaScript with Zod

```javascript
import { readFileSync } from "fs";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

const dbSchema = z.object({
  host: z.string(),
  port: z.number().int().min(1).max(65535).default(5432),
  username: z.string(),
  password: z.string().min(8),
});

const appSchema = z.object({
  appName: z.string(),
  debug: z.boolean().default(false),
  database: dbSchema,
});

function loadConfig(path) {
  const raw = readFileSync(path, "utf-8");
  const ext = path.split(".").pop();
  const data = ext === "json" ? JSON.parse(raw) : parseYaml(raw);
  return appSchema.parse(data);
}

try {
  const config = loadConfig("config.yaml");
  console.log(config.database.host);
} catch (err) {
  console.error("Config validation failed:", err.errors);
}
```

### Java with Jackson and Jakarta Validation

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import jakarta.validation.*;
import jakarta.validation.constraints.*;
import java.io.File;
import java.util.Set;

public class ConfigLoader {

  public record DatabaseConfig(
    @NotBlank String host,
    @Min(1) @Max(65535) int port,
    @NotBlank String username,
    @NotBlank String password
  ) {}

  public record AppConfig(
    @NotBlank String appName,
    boolean debug,
    @NotNull @Valid DatabaseConfig database
  ) {}

  public static AppConfig load(String path) {
    ObjectMapper mapper = path.endsWith(".yaml") || path.endsWith(".yml")
      ? new ObjectMapper(new YAMLFactory())
      : new ObjectMapper();

    AppConfig config = mapper.readValue(new File(path), AppConfig.class);

    Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
    Set<ConstraintViolation<AppConfig>> violations = validator.validate(config);
    if (!violations.isEmpty()) {
      throw new IllegalArgumentException("Config validation failed: " + violations);
    }
    return config;
  }
}
```

### Go

```go
package main

import (
    "encoding/json"
    "fmt"
    "os"
    "gopkg.in/yaml.v3"
)

type DatabaseConfig struct {
    Host     string `json:"host" yaml:"host"`
    Port     int    `json:"port" yaml:"port"`
    Username string `json:"username" yaml:"username"`
    Password string `json:"password" yaml:"password"`
}

type AppConfig struct {
    AppName  string         `json:"appName" yaml:"appName"`
    Debug    bool           `json:"debug" yaml:"debug"`
    Database DatabaseConfig `json:"database" yaml:"database"`
}

func loadConfig(path string) (*AppConfig, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("read file: %w", err)
    }

    var config AppConfig
    if path[len(path)-5:] == ".json" {
        err = json.Unmarshal(data, &config)
    } else {
        err = yaml.Unmarshal(data, &config)
    }
    if err != nil {
        return nil, fmt.Errorf("parse: %w", err)
    }

    if config.Database.Host == "" || config.Database.Port == 0 {
        return nil, fmt.Errorf("database.host and database.port are required")
    }
    return &config, nil
}
```

### Environment variable substitution

```yaml
app_name: "my-service"
debug: ${DEBUG:false}
database:
  host: ${DB_HOST:localhost}
  port: ${DB_PORT:5432}
  username: ${DB_USER:postgres}
  password: ${DB_PASSWORD}
```

```python
import os
import re
import yaml

def substitute_env_vars(content: str) -> str:
    pattern = re.compile(r'\$\{(\w+)(?::([^}]*))?\}')
    def replacer(match):
        var_name = match.group(1)
        default = match.group(2)
        return os.getenv(var_name, default if default is not None else "")
    return pattern.sub(replacer, content)

def load_config_with_env(path: str) -> dict:
    with open(path) as f:
        content = f.read()
    return yaml.safe_load(substitute_env_vars(content))
```

## Explanation

Every example follows the same three steps: read the file, parse it as YAML or JSON, then
validate the structure and values against a schema.

**Pydantic** (Python), **Zod** (JavaScript), and **Jakarta Validation** (Java) give you
declarative, type-safe schemas with clear error messages. In Go, you can use struct tags
and manual checks.

The point is to fail fast: validate at startup so bad config shows up immediately,
instead of failing later in production.

## Variants

|Format|Library|Best for|
|------|-------|--------|
|TOML|`toml` (Python), `@iarna/toml` (JS), `toml4j` (Java)|Rust/Cargo-style configs, simpler than YAML|
|INI|`configparser` (Python), `ini` (JS), `ini4j` (Java)|Simple key-value configs, Windows style|
|HOCON|`pyhocon` (Python), Lightbend Config (Java)|Complex configs with includes and substitution|
|Environment variables|`python-dotenv`, `dotenv` (JS), Spring `@Value`|Secrets and per-env overrides without files|

## Best Practices

- Validate at startup; don't use raw config without a schema.
- Keep credentials in environment variables or secret managers, not in config files.
- Provide sensible defaults to reduce required config.
- Fail with a clear message that shows the bad path and expected type.
- Version your config schema and document breaking changes.
- Cache the parsed config after startup; don't re-parse on every request.
- Prefer JSON for machine-generated configs; it parses faster than YAML.

## Common Mistakes

- Committing secrets into YAML/JSON files in version control.
- Ignoring parse errors and silently falling back to empty or null values.
- Using complex nested YAML without validation, leading to cryptic runtime errors.
- Not reloading configs after deployment changes, requiring restarts for minor updates.
- Mixing configuration logic with application code instead of a dedicated layer.

## FAQ

### Should I use YAML or JSON for configuration?

YAML is more readable for humans and supports comments. JSON is simpler to parse and
strictly typed. Use YAML for hand-edited files and JSON for machine-generated configs.

### How do I handle secrets in config files?

Don't store secrets in plain config files. Use environment variables, secret managers,
or encrypted files decrypted at runtime.

### Can I reload configuration without restarting?

Yes, but carefully. Watch the file for changes and re-parse into an immutable config
object. Ensure thread-safe replacement and validation on reload to avoid partial
updates.

### Can I merge a base config with environment overrides?

Yes. Load a base file, then load an environment-specific file and merge it with a deep
merge. The environment values take precedence.

### Do I need a schema if the format is valid YAML/JSON?

Yes. Valid syntax doesn't mean valid values. A missing field or wrong type can still
crash the app at runtime.
