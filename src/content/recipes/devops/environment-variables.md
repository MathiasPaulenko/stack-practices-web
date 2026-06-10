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
  - env-vars
  - environment
  - configuration
  - dotenv
  - python
  - javascript
  - java
  - 12-factor-app
relatedResources:
  - /recipes/docker-basics
  - /recipes/jwt-authentication
  - /recipes/password-hashing
lastUpdated: "2026-06-10"
author: "StackPractices"
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

## When to Use

Use this recipe when:

- Configuring apps per environment (dev, staging, prod)
- Storing secrets like API keys and database credentials
- Enabling or disabling features with feature flags
- Managing containerized application configuration
- Avoiding hard-coded values in source code

## Solution

### Python

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

```javascript
require('dotenv').config(); // Load .env file

const apiKey = process.env.API_KEY;
const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/default';
const port = parseInt(process.env.PORT || '8080', 10);
const debug = process.env.DEBUG === 'true';

console.log(`API_KEY=${apiKey}, PORT=${port}, DEBUG=${debug}`);
```

### Java

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

- **`os.environ` / `process.env` / `System.getenv()`**: Runtime access to environment variables
- **`load_dotenv()` / `require('dotenv').config()`**: Load variables from a `.env` file in development
- **Defaults**: Always provide sensible defaults for non-sensitive values
- **Type coercion**: Environment variables are strings — cast to int/boolean explicitly

## Best Practices

- **Never commit secrets**: Add `.env` to `.gitignore` immediately
- **Use a `.env.example`**: Document required variables without real values
- **Validate on startup**: Fail fast if required variables are missing
- **Scope variables per environment**: `.env.development`, `.env.production`
- **Use a secrets manager in production**: AWS Secrets Manager, Azure Key Vault, HashiCorp Vault
- **Log config (not secrets)**: Print loaded config for debugging, redact sensitive keys

## Common Mistakes

- Committing `.env` files with real secrets to GitHub
- Assuming environment variables exist without defaults
- Not validating required variables at application startup
- Using environment variables for complex structured data (use config files instead)
- Confusing build-time and runtime variables in frontend bundlers

## Frequently Asked Questions

**Q: Can I use environment variables in the browser?**
A: Only at build time via bundler substitution. Never expose server secrets in client-side code. Use public variables prefixed with your framework's convention (e.g., `VITE_`, `NEXT_PUBLIC_`, `REACT_APP_`).

**Q: What is the 12-Factor App config principle?**
A: Store config in environment variables. This keeps code and config separate, making the app deployable to any environment without code changes.

**Q: How do I manage secrets in a Docker container?**
A: Pass them at runtime with `-e` flags, Docker secrets, or mount them as files. Never bake secrets into the image.
