---
contentType: recipes
slug: environment-variables
title: "Environment Variables"
description: "How to read, set, and manage environment variables securely across Python, JavaScript, and Java."
metaDescription: "Practical environment variable examples in Python, JavaScript, and Java. Learn dotenv, process.env, System.getenv, and 12-factor app configuration."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - ci-cd
  - automation
  - deployment
  - infrastructure
relatedResources:
  - /recipes/docker-basics
  - /recipes/jwt-authentication
  - /recipes/password-hashing
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Practical environment variable examples in Python, JavaScript, and Java. Learn dotenv, process.env, System.getenv, and 12-factor app configuration."
  keywords:
    - environment variables
    - env vars
    - configuration management
    - dotenv
    - 12 factor app
    - process.env
    - System.getenv
    - os.environ
    - secrets management
---

## Overview

Environment variables are key-value pairs set outside your application code, used to configure behavior without changing source files. They are the cornerstone of the 12-Factor App methodology and the standard way to manage secrets, API keys, database URLs, and feature flags.

Separating config from code makes applications portable across environments (dev, staging, production) and prevents sensitive data from being committed to version control.

Before environment variables became the standard, configuration was often embedded directly in source code or stored in XML files checked into repositories. This made deployments fragile: a database password change required a code commit, rebuild, and redeploy. Environment variables solve this by externalizing all environment-specific settings, allowing the same compiled artifact to run in development, staging, and production without modification. This principle — known as "build once, deploy many" — is essential for modern CI/CD pipelines and containerized architectures.

## When to Use

Use this recipe when:

- Configuring apps per environment (dev, staging, prod). See [Docker Basics](/recipes/devops/docker-basics) for containerized app config.
- Storing secrets like API keys and database credentials. See [JWT Authentication](/recipes/authentication/jwt-authentication) for secure token handling.
- Enabling or disabling capabilities with feature flags. See [Feature Flags](/recipes/devops/feature-flags) for toggle management.
- Managing containerized application configuration in Docker and Kubernetes. See [Docker Compose Local Dev](/recipes/devops/docker-compose-local-dev) for local container orchestration.
- Avoiding hard-coded values in source code
- Sharing configuration across microservices without a central config server
- Switching database endpoints between primary and replica for read scaling
- Enabling debug logging or profiling only in specific environments

## Solution

### Python

Python's `os.getenv` reads environment variables with an optional default. The `python-dotenv` package loads variables from a `.env` file in development, which is convenient for local testing without polluting your shell environment.

```python
import os
from dotenv import load_dotenv

# Load from .env file (dev only)
load_dotenv()

# Read variables
api_key = os.getenv('API_KEY')
db_url = os.getenv('DATABASE_URL', 'sqlite:///default.db')  # with default
port = int(os.getenv('PORT', '8080'))
debug = os.getenv('DEBUG', 'false').lower() == 'true'

print(f"API_KEY={api_key}, PORT={port}, DEBUG={debug}")
```

### JavaScript (Node.js)

Node.js exposes environment variables through `process.env`. The `dotenv` package loads a `.env` file at application startup, but it only works in Node — browser environments do not have access to `process.env` at runtime.

```javascript
require('dotenv').config(); // Load .env file

const apiKey = process.env.API_KEY;
const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/default';
const port = parseInt(process.env.PORT || '8080', 10);
const debug = process.env.DEBUG === 'true';

console.log(`API_KEY=${apiKey}, PORT=${port}, DEBUG=${debug}`);
```

### Java

Java's `System.getenv()` returns an immutable map of the process environment. Use `getOrDefault` to supply fallback values for optional configuration, and parse strings to the appropriate types explicitly.

```java
public class Config {
    public static void main(String[] args) {
        String apiKey = System.getenv("API_KEY");
        String dbUrl = System.getenv().getOrDefault("DATABASE_URL", "jdbc:mysql://localhost/default");
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        boolean debug = Boolean.parseBoolean(System.getenv().getOrDefault("DEBUG", "false"));

        System.out.println("API_KEY=" + apiKey + ", PORT=" + port + ", DEBUG=" + debug);
    }
}
```

## .env File Example

```bash
# .env — never commit this file to version control
DATABASE_URL=postgres://user:pass@localhost:5432/mydb
API_KEY=sk-live-xxxxxxxxxxxx
PORT=3000
DEBUG=true
```

Add `.env` to `.gitignore`:

```gitignore
.env
.env.local
.env.*.local
```

## Explanation

- **`os.environ` / `process.env` / `System.getenv()`**: Runtime access to environment variables. These are inherited from the parent process (shell, systemd, Docker) and cannot be modified by child processes in a way that affects the parent.
- **`load_dotenv()` / `require('dotenv').config()`**: Load variables from a `.env` file in development. This file should never be committed — it is a convenience for local development only.
- **Defaults**: Always provide sensible defaults for non-sensitive values. Missing required variables should cause the application to fail fast at startup with a clear error message.
- **Type coercion**: Environment variables are always strings — cast to int/boolean explicitly. A value of `"false"` is truthy in JavaScript if you do not compare it properly.
- **Scope**: Variables set in the shell are available to the current process and its children. Use `export` in Bash or `setx` in Windows to persist them across sessions.

## What Works

- **Never commit secrets**: Add `.env` to `.gitignore` immediately. A single committed `.env` file with production credentials is a permanent security liability, even if you delete it later — Git history retains it forever.
- **Use a `.env.example`**: Document required variables without real values. New developers can copy this file to `.env` and fill in their own credentials.
- **Validate on startup**: Fail fast if required variables are missing. Do not let your application run in a partially configured state that produces cryptic errors hours later.
- **Scope variables per environment**: `.env.development`, `.env.production`. Some frameworks load these automatically based on `NODE_ENV` or equivalent.
- **Use a secrets manager in production**: AWS Secrets Manager, Azure Key Vault, HashiCorp Vault. These provide rotation, audit logging, and fine-grained access control that `.env` files cannot match.
- **Log config (not secrets)**: Print loaded config for debugging, but redact sensitive keys. A log line like `DATABASE_URL=***` tells you the variable is set without exposing credentials.
- **Prefix public variables in frontend**: Frameworks like Vite, Next.js, and Create React App only expose `VITE_*`, `NEXT_PUBLIC_*`, or `REACT_APP_*` variables to the browser. Everything else stays server-side.
- **Rotate secrets regularly**: even the best storage can be compromised. Set a calendar reminder to rotate API keys and database passwords quarterly.

## Common Mistakes

- **Committing `.env` files with real secrets to GitHub**: Even if you delete the file later, it remains in Git history forever. Use `git filter-repo` or BFG Repo-Cleaner to scrub it if you have already committed secrets.
- **Assuming environment variables exist without defaults**: Your application will crash with confusing errors. Always validate required variables and provide sensible defaults for optional ones.
- **Not validating required variables at application startup**: Missing configuration often causes failures deep in the call stack that are hard to trace back to a missing environment variable.
- **Using environment variables for complex structured data**: Environment variables are flat key-value strings. Use JSON or YAML config files for nested configuration, and load them from a path specified by an environment variable.
- **Confusing build-time and runtime variables in frontend bundlers**: Variables referenced in frontend code are embedded at build time, not read at runtime. Changing an environment variable after building has no effect on the client bundle.
- **Printing secrets in error messages**: Stack traces and error responses should never include database passwords or API keys. Attackers scan logs and public error pages for exactly this mistake.
- **Using the same secrets across all environments**: Development and production should use different credentials. A leaked dev database password should not grant access to production.

## Frequently Asked Questions

**Q: Can I use environment variables in the browser?**
A: Only at build time via bundler substitution. Never expose server secrets in client-side code. Use public variables prefixed with your framework's convention (e.g., `VITE_`, `NEXT_PUBLIC_`, `REACT_APP_`). The browser has no access to the server's environment.

**Q: What is the 12-Factor App config principle?**
A: Store config in environment variables. This keeps code and config separate, making the app deployable to any environment without code changes. The same Docker image can run in dev, staging, and prod with different variables.

**Q: How do I manage secrets in a Docker container?**
A: Pass them at runtime with `-e` flags, Docker secrets, or mount them as files. Never bake secrets into the image. A compromised image registry would expose every secret embedded during build.

**Q: What is the difference between `.env` and shell exports?**
A: `.env` files are loaded by application code at startup and only affect that process. Shell exports (`export VAR=value`) affect the current shell session and all child processes. Use `.env` for per-project settings and shell exports for global tooling.

**Q: Should I validate environment variables in code or use a schema library?**
A: Both approaches work. For small projects, manual validation at startup is fine. For larger applications, schema libraries like `envalid` (Node), `pydantic-settings` (Python), or Spring's `@ConfigurationProperties` (Java) provide type safety, defaults, and automatic validation.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### Go

Go's `os.Getenv` returns a string and an empty string if the key is not present. Use `os.LookupEnv` to distinguish between unset and empty:

```go
package main

import (
    "fmt"
    "os"
    "strconv"
)

func getEnv(key, fallback string) string {
    if val, ok := os.LookupEnv(key); ok {
        return val
    }
    return fallback
}

func main() {
    apiKey := os.Getenv("API_KEY")
    dbURL := getEnv("DATABASE_URL", "postgres://localhost:5432/default")
    port, _ := strconv.Atoi(getEnv("PORT", "8080"))
    debug := getEnv("DEBUG", "false") == "true"

    fmt.Printf("API_KEY=%s, DB=%s, PORT=%d, DEBUG=%v\n", apiKey, dbURL, port, debug)
}
```

### Bash

```bash
#!/bin/bash
# Source .env file if it exists
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Read variables with defaults
API_KEY="${API_KEY:-default-key}"
DB_URL="${DATABASE_URL:-postgres://localhost:5432/default}"
PORT="${PORT:-8080}"
DEBUG="${DEBUG:-false}"

echo "API_KEY=$API_KEY, PORT=$PORT, DEBUG=$DEBUG"

# Validate required variables
if [ -z "$API_KEY" ]; then
  echo "ERROR: API_KEY is required" >&2
  exit 1
fi
```

### Docker Environment Variables

```dockerfile
# Dockerfile — set defaults at build time
ENV NODE_ENV=production
ENV PORT=3000
# Override at runtime: docker run -e PORT=8080 myapp

# Use ARG for build-time only variables
ARG BUILD_VERSION=latest
ENV APP_VERSION=$BUILD_VERSION
```

```bash
# Pass env vars at runtime
$ docker run -e DATABASE_URL=postgres://prod-db:5432/myapp -e API_KEY=sk-live-xxx myapp:v1

# Load from file
$ docker run --env-file .env.production myapp:v1

# Docker Compose
$ docker compose --env-file .env.production up
```

```yaml
# docker-compose.yml
services:
  app:
    image: myapp:v1
    environment:
      - DATABASE_URL=postgres://db:5432/myapp
      - API_KEY=${API_KEY}
      - PORT=3000
    env_file:
      - .env.production
```

### Kubernetes ConfigMap and Secrets

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DATABASE_URL: postgres://db-svc:5432/myapp
  PORT: "8080"
  DEBUG: "false"
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  API_KEY: sk-live-xxxxxxxxxxxx
  DB_PASSWORD: super-secret-password
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    spec:
      containers:
      - name: api
        image: myapp:v1
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
```

### Schema Validation with pydantic-settings (Python)

```python
from pydantic_settings import BaseSettings
from pydantic import Field, ValidationError

class Settings(BaseSettings):
    api_key: str = Field(..., min_length=10)
    database_url: str = Field(..., min_length=1)
    port: int = Field(default=8080, ge=1, le=65535)
    debug: bool = False
    allowed_origins: list[str] = ["localhost"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

try:
    settings = Settings()
    print(f"Loaded: port={settings.port}, debug={settings.debug}")
except ValidationError as e:
    print(f"Configuration error: {e}")
    raise SystemExit(1)
```

### Schema Validation with envalid (Node.js)

```javascript
const { cleanEnv, str, port, bool, email } = require("envalid");

const env = cleanEnv(process.env, {
  API_KEY: str({ minLength: 10 }),
  DATABASE_URL: str({ default: "postgres://localhost:5432/default" }),
  PORT: port({ default: 8080 }),
  DEBUG: bool({ default: false }),
  ADMIN_EMAIL: email({ default: "admin@example.com" }),
});

// env is now typed and validated
console.log(`API_KEY set: ${env.API_KEY.length > 0}`);
console.log(`PORT: ${env.PORT}`);
```

### Environment-Specific .env Files

```bash
# .env.development
DATABASE_URL=postgres://localhost:5432/dev_db
DEBUG=true
LOG_LEVEL=debug

# .env.staging
DATABASE_URL=postgres://staging-db:5432/staging_db
DEBUG=false
LOG_LEVEL=info

# .env.production
DATABASE_URL=postgres://prod-db:5432/prod_db
DEBUG=false
LOG_LEVEL=warning
```

```python
# Python: load environment-specific .env
import os
from dotenv import load_dotenv

env = os.getenv("APP_ENV", "development")
load_dotenv(f".env.{env}")
load_dotenv(".env", override=False)  # Fallback, don't override env-specific
```

```javascript
// Node.js: dotenv-flow for hierarchical .env loading
require("dotenv-flow").config();

// Loads in order: .env.{NODE_ENV}.local > .env.{NODE_ENV} > .env.local > .env
```

## Additional Best Practices

7. **Use typed config objects.** Wrap environment variables in a typed class or schema. This prevents string-typed bugs and centralizes defaults:

```python
class Config:
    PORT: int = int(os.getenv("PORT", "8080"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

config = Config()
```

8. **Never log full secrets.** Redact sensitive values in log output:

```python
import re

def redact(value, visible_chars=4):
    if not value:
        return "***"
    return value[:visible_chars] + "***"

def log_config(config):
    safe = {
        "DATABASE_URL": redact(config.database_url),
        "API_KEY": redact(config.api_key),
        "PORT": config.port,
    }
    print(f"Config: {safe}")
```

## Additional Common Mistakes

8. **Storing JSON or complex data in env vars.** Environment variables are flat strings. For structured config, use a file path in an env var and load the file:

```python
# Bad: complex JSON in env var
config = json.loads(os.getenv("APP_CONFIG"))  # Fragile, hard to debug

# Good: file path in env var
config_path = os.getenv("CONFIG_PATH", "config.json")
config = json.load(open(config_path))
```

9. **Not handling unset variables in Docker.** If a required env var is missing, the container starts with an empty string. Validate at startup:

```javascript
const required = ["API_KEY", "DATABASE_URL"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}
```

## Additional FAQ

### How do I rotate secrets without downtime?

Use a secrets manager that supports automatic rotation (AWS Secrets Manager, HashiCorp Vault). Your app should periodically re-fetch secrets or listen for rotation events. For zero-downtime rotation, use a connection pool that can gracefully reconnect with new credentials.

### What is the maximum size of an environment variable?

Most operating systems limit the total environment block to 32KB-128KB. Individual variables can be up to 8KB on Linux. Never store large payloads in env vars — use files or a config service instead.

### How do I share environment variables across Docker containers?

Use Docker Compose `env_file` or Kubernetes ConfigMaps/Secrets. For cross-service secret sharing, use a secrets manager like Vault or AWS Secrets Manager with IAM-based access control.

## Performance Tips

1. **Read env vars once at startup.** Repeated `os.getenv()` calls have minimal overhead, but caching in a config object is cleaner:

```python
# Read once
_config = Settings()

# Use everywhere
def get_db_url():
    return _config.database_url
```

2. **Avoid parsing complex values from env vars.** Parse once, cache the result:

```python
# Parse once
_allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")

# Use cached list
def is_origin_allowed(origin):
    return origin in _allowed_origins
```

3. **Use lazy loading for secrets.** Fetch secrets from AWS Secrets Manager on first use, then cache:

```python
import boto3
from functools import lru_cache

@lru_cache(maxsize=1)
def get_db_password():
    client = boto3.client("secretsmanager")
    response = client.get_secret_value(SecretId="prod/db/password")
    return response["SecretString"]
```
