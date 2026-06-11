---
contentType: recipes
slug: parse-config-files
title: "Parse and Validate YAML/JSON Configuration"
description: "How to parse and validate application configuration files using YAML and JSON schemas."
metaDescription: "Learn to parse and validate YAML and JSON config files in Python, JavaScript, and Java. Covers schema validation, environment-specific configs, and secrets management."
difficulty: beginner
topics:
  - devops
tags:
  - config
  - yaml
  - json
  - validation
  - schema
  - python
  - javascript
  - java
relatedResources:
  - /recipes/input-validation
  - /recipes/background-jobs
  - /recipes/cli-tool-argument-parsing
  - /recipes/environment-variables
  - /recipes/health-check-endpoint
lastUpdated: "2026-06-11"
author: "StackPractices"
seo:
  metaDescription: "Learn to parse and validate YAML and JSON config files in Python, JavaScript, and Java. Covers schema validation, environment-specific configs, and secrets management."
  keywords:
    - config
    - yaml
    - json
    - validation
    - schema
    - python
    - javascript
    - java
---
## Overview

Most applications need external configuration to adapt behavior across environments (dev, staging, production) without code changes. YAML and JSON are the dominant formats, but parsing alone is not enough — invalid configs cause runtime failures. This recipe covers robust parsing, schema validation, and environment-specific overrides in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Loading database credentials, API keys, or feature flags from external files
- Supporting multiple deployment environments with different settings
- Validating user-supplied configuration to fail fast on startup
- Migrating from hard-coded constants to file-based configuration

## Solution

### Python

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

# Usage
try:
    config = load_config("config.yaml")
    print(config.database.host)
except ValidationError as e:
    print("Config validation failed:", e)
```

### JavaScript

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

// Usage
try {
  const config = loadConfig("config.yaml");
  console.log(config.database.host);
} catch (err) {
  console.error("Config validation failed:", err.errors);
}
```

### Java

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
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

  public static AppConfig load(String path) throws Exception {
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

## Explanation

- **Parsing** converts raw text into native data structures. YAML is human-friendly; JSON is strict and widely supported.
- **Schema validation** catches missing fields, wrong types, and invalid ranges before the app starts serving traffic.
- **Pydantic** (Python) and **Zod** (JavaScript) provide declarative, type-safe schemas with excellent error messages.
- **Jakarta Validation** (Java) uses annotations on records or classes and integrates with Jackson for seamless YAML/JSON deserialization.
- **Fail fast** is the key principle: validate at startup so misconfigurations surface immediately rather than during runtime.

## Variants

| Format | Library | Best For |
|--------|---------|----------|
| TOML | `toml` (Python), `@iarna/toml` (JS), `toml4j` (Java) | Rust/Cargo-style configs, simpler than YAML |
| INI | `configparser` (Python), `ini` (JS), `ini4j` (Java) | Simple key-value configs, Windows-style |
| HOCON | `pyhocon` (Python), Lightbend Config (Java) | Complex configs with includes and variable substitution |
| Environment Variables | `python-dotenv`, `dotenv` (JS), Spring `@Value` | Secrets and per-env overrides without files |

## Best Practices

1. **Validate at startup** — never use raw config without schema validation.
2. **Separate secrets** — store credentials in environment variables or secret managers, never commit them to config files.
3. **Provide defaults** — use schema defaults for non-critical values to minimize required config.
4. **Fail with clear errors** — show the exact path and expected type when validation fails.
5. **Version your schemas** — document breaking changes when config structure evolves.

## Common Mistakes

1. Committing secrets directly into YAML/JSON files in version control.
2. Ignoring parsing errors and falling back to empty or null values silently.
3. Using complex nested YAML without validation, leading to cryptic runtime errors.
4. Not reloading configs after deployment changes, requiring restarts for trivial updates.
5. Mixing configuration logic with application code instead of a dedicated config layer.

## Frequently Asked Questions

### Should I use YAML or JSON for configuration?

YAML is more readable for humans and supports comments. JSON is simpler to parse and strictly typed. Use YAML for hand-edited files and JSON for machine-generated configs.

### How do I handle secrets in config files?

Never store secrets in plain config files. Use environment variables (`${DB_PASSWORD}`), secret managers (AWS Secrets Manager, Vault), or encrypted files decrypted at runtime.

### Can I reload configuration without restarting the application?

Yes, but carefully. Watch the file for changes and re-parse into an immutable config object. Ensure thread-safe replacement and validation on reload to avoid partial updates.
