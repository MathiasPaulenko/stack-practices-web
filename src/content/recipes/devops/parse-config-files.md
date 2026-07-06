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
  - devops
  - java
  - ci-cd
  - automation
  - deployment
relatedResources:
  - /recipes/input-validation
  - /recipes/background-jobs
  - /recipes/cli-tool-argument-parsing
  - /recipes/environment-variables
  - /recipes/health-check-endpoint
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
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

Most applications need external configuration to adapt behavior across environments (dev, staging, production) without code changes. YAML and JSON are the dominant formats, but parsing alone is not enough — invalid configs cause runtime failures. Here is how to reliable parsing, schema validation, and environment-specific overrides in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Loading database credentials, API keys, or feature flags from external files. See [Environment Variables](/recipes/devops/environment-variables) for runtime secret injection.
- Supporting multiple deployment environments with different settings. See [Docker Compose Local Dev](/recipes/devops/docker-compose-local-dev) for local environment parity.
- Validating user-supplied configuration to fail fast on startup. See [Input Validation](/recipes/api/input-validation) for validation patterns.
- Migrating from hard-coded constants to file-based configuration. See [Bash Scripting Automation](/recipes/devops/bash-scripting-automation) for migration scripting.

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
- **Jakarta Validation** (Java) uses annotations on records or classes and integrates with Jackson for smooth YAML/JSON deserialization.
- **Fail fast** is the key principle: validate at startup so misconfigurations surface immediately rather than during runtime.

## Variants

| Format | Library | Best For |
|--------|---------|----------|
| TOML | `toml` (Python), `@iarna/toml` (JS), `toml4j` (Java) | Rust/Cargo-style configs, simpler than YAML |
| INI | `configparser` (Python), `ini` (JS), `ini4j` (Java) | Simple key-value configs, Windows-style |
| HOCON | `pyhocon` (Python), Lightbend Config (Java) | Complex configs with includes and variable substitution |
| Environment Variables | `python-dotenv`, `dotenv` (JS), Spring `@Value` | Secrets and per-env overrides without files |

## What Works

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

    if config.Database.Host == "" {
        return nil, fmt.Errorf("database.host is required")
    }
    return &config, nil
}

func main() {
    config, err := loadConfig("config.yaml")
    if err != nil {
        fmt.Printf("Config error: %v\n", err)
        os.Exit(1)
    }
    fmt.Printf("App: %s, DB: %s:%d\n", config.AppName, config.Database.Host, config.Database.Port)
}
```

### Environment Variable Substitution in Config Files

```yaml
# config.yaml — use env var placeholders
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

### Hot Reload Configuration

```python
import os
import time
import threading
from pathlib import Path

class HotReloader:
    def __init__(self, config_path: str, loader_func):
        self.path = Path(config_path)
        self.loader = loader_func
        self._config = None
        self._mtime = 0
        self._lock = threading.Lock()
        self._load()

    def _load(self):
        with self._lock:
            self._config = self.loader(str(self.path))
            self._mtime = self.path.stat().st_mtime

    def get(self):
        current_mtime = self.path.stat().st_mtime
        if current_mtime != self._mtime:
            self._load()
        return self._config

    def watch(self, interval: float = 5.0):
        def _watch():
            while True:
                time.sleep(interval)
                try:
                    self.get()
                except Exception as e:
                    print(f"Config reload error: {e}")
        t = threading.Thread(target=_watch, daemon=True)
        t.start()
```

### Config Merging with Layered Overrides

```javascript
const { readFileSync } = require("fs");
const { parse } = require("yaml");

function loadLayeredConfig(basePath, envOverridePath) {
  const base = parse(readFileSync(basePath, "utf-8"));
  try {
    const override = parse(readFileSync(envOverridePath, "utf-8"));
    return deepMerge(base, override);
  } catch {
    return base;
  }
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (typeof source[key] === "object" && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// Usage: base config + environment override
const config = loadLayeredConfig("config.base.yaml", "config.production.yaml");
```

## Additional Best Practices

6. **Use layered configs.** Start with a base config and override per environment:

```
config.base.yaml      # Shared defaults
config.staging.yaml   # Staging overrides
config.production.yaml # Production overrides
```

7. **Encrypt secrets at rest.** If secrets must be in config files, encrypt them:

```bash
# SOPS (Secrets OPerationS) for encrypted config files
$ sops --encrypt --pgp FINGERPRINT config.secrets.yaml > config.secrets.enc.yaml
$ sops --decrypt config.secrets.enc.yaml | kubectl apply -f -
```

8. **Validate config in CI.** Add a config validation step to your CI pipeline:

```yaml
# .github/workflows/validate-config.yml
- name: Validate config files
  run: |
    python -c "
    from config_loader import load_config
    import glob
    for f in glob.glob('config/*.yaml'):
        load_config(f)
        print(f'Validated: {f}')
    "
```

## Additional Common Mistakes

6. **Not handling config file encoding.** Always specify UTF-8 when reading:

```python
# Bad: platform-dependent encoding
content = open("config.yaml").read()

# Good: explicit encoding
content = Path("config.yaml").read_text(encoding="utf-8")
```

7. **Allowing arbitrary code execution in config.** Never use `yaml.load()` (unsafe). Always use `yaml.safe_load()`:

```python
# Dangerous: allows arbitrary Python object construction
data = yaml.load(content, Loader=yaml.Loader)

# Safe: only standard YAML types
data = yaml.safe_load(content)
```

## Additional FAQ

### How do I handle secrets in config files?

Never store secrets in plain config files. Use environment variable substitution (`${DB_PASSWORD}`), secret managers (AWS Secrets Manager, Vault), or encrypted files decrypted at runtime with tools like SOPS or sealed-secrets.

### What is the difference between YAML and TOML?

YAML supports complex nesting, anchors, and multi-line strings. TOML is simpler, stricter, and avoids the security issues of YAML. Use TOML for simple configs (Rust, Python `pyproject.toml`) and YAML for complex configs (Kubernetes, CI/CD).

## Performance Tips

1. **Cache parsed config.** Parsing YAML/JSON on every request is wasteful. Parse once, share the instance:

```python
_config = None

def get_config():
    global _config
    if _config is None:
        _config = load_config("config.yaml")
    return _config
```

2. **Use JSON for machine-generated configs.** JSON parsing is 2-5x faster than YAML:

```python
# Benchmark: json.loads vs yaml.safe_load on 10KB file
# json.loads: 0.1ms
# yaml.safe_load: 0.5ms
```

3. **Lazy-load config sections.** For large configs, load sections on demand:

```python
class LazyConfig:
    def __init__(self, path):
        self._path = path
        self._data = None

    def _ensure_loaded(self):
        if self._data is None:
            self._data = yaml.safe_load(open(self._path))

    def get(self, key, default=None):
        self._ensure_loaded()
        return self._data.get(key, default)
```
