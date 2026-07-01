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
