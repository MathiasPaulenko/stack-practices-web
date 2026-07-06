---
contentType: recipes
slug: docker-secrets-management
title: "Docker Secrets Management Without Hardcoding Credentials"
description: "Inject secrets into containers using Docker secrets, env files, and external secret managers without hardcoding them in images."
metaDescription: "Manage Docker secrets securely with Docker Swarm secrets, .env files, external secret managers. Avoid hardcoding credentials in images and compose files."
difficulty: intermediate
topics:
  - devops
  - security
tags:
  - docker
  - secrets
  - security
  - credentials
  - docker-swarm
  - env-files
relatedResources:
  - /recipes/devops/docker-network-isolation
  - /recipes/devops/docker-health-check-configuration
  - /recipes/devops/docker-compose-dev-prod-split
  - /guides/webhook-security-guide
  - /patterns/sidecar-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Manage Docker secrets securely with Docker Swarm secrets, .env files, external secret managers. Avoid hardcoding credentials in images and compose files."
  keywords:
    - docker secrets management
    - docker swarm secrets
    - docker env file secrets
    - docker credentials security
    - docker secret injection
    - avoid hardcoding secrets docker
---

## Overview

Hardcoding secrets (passwords, API keys, tokens) in Docker images or Compose files is a critical security risk. Images are shared, cached, and inspected — anyone with access to the image can extract secrets. Below is the idiomatic way to secure patterns for injecting secrets into containers at runtime.

## When to Use

- You need to pass database passwords, API keys, or TLS certificates to containers
- You want to avoid committing secrets to version control
- You use Docker Swarm or Compose in production
- You need to rotate secrets without rebuilding images

## Solution

### Docker Swarm secrets (most secure)

```bash
# Create a secret from a file
echo "my-super-secret-password" | docker secret create db_password -

# Create a secret from stdin
printf "AKIAIOSFODNN7EXAMPLE" | docker secret create aws_access_key -

# List secrets
docker secret ls

# Use in a Swarm service
docker service create \
    --name api \
    --secret db_password \
    --secret aws_access_key \
    -e DB_PASSWORD_FILE=/run/secrets/db_password \
    -e AWS_KEY_FILE=/run/secrets/aws_access_key \
    my-api:latest
```

Docker mounts secrets as files at `/run/secrets/<secret_name>`. They are never exposed as environment variables and are encrypted in transit.

### Reading secrets from files in your app

```python
import os

def get_secret(name: str) -> str:
    """Read a secret from a file (Docker Swarm pattern)."""
    file_path = os.environ.get(f"{name}_FILE")
    if file_path:
        with open(file_path, "r") as f:
            return f.read().strip()
    # Fallback to env var for local dev
    return os.environ.get(name, "")
```

```javascript
const fs = require("fs");

function getSecret(name) {
    const filePath = process.env[`${name}_FILE`];
    if (filePath) {
        return fs.readFileSync(filePath, "utf8").trim();
    }
    return process.env[name] || "";
}
```

### Docker Compose with secrets

```yaml
# docker-compose.yml
services:
    api:
        build: .
        secrets:
            - db_password
            - api_key
        environment:
            - DB_PASSWORD_FILE=/run/secrets/db_password
            - API_KEY_FILE=/run/secrets/api_key

    db:
        image: postgres:16-alpine
        environment:
            POSTGRES_PASSWORD_FILE: /run/secrets/db_password
        secrets:
            - db_password

secrets:
    db_password:
        file: ./secrets/db_password.txt
    api_key:
        file: ./secrets/api_key.txt
```

### .env file (development only)

```bash
# .env (NEVER commit this — add to .gitignore)
DB_PASSWORD=my-dev-password
API_KEY=dev-api-key-12345
JWT_SECRET=dev-jwt-secret
```

```yaml
# docker-compose.dev.yml
services:
    api:
        build: .
        env_file:
            - .env
        environment:
            - NODE_ENV=development
```

```bash
# .gitignore
.env
.env.*
secrets/
```

### External secret manager (HashiCorp Vault)

```yaml
# docker-compose.yml
services:
    api:
        build: .
        environment:
            - VAULT_ADDR=https://vault.internal:8200
            - VAULT_TOKEN_FILE=/run/secrets/vault_token
        secrets:
            - vault_token
        command: ["./wait-for-vault.sh", "node", "server.js"]

    vault:
        image: hashicorp/vault:1.15
        ports:
            - "8200:8200"
        environment:
            VAULT_DEV_ROOT_TOKEN_ID: root
        cap_add:
            - IPC_LOCK

secrets:
    vault_token:
        file: ./secrets/vault_token.txt
```

```python
import hvac

def get_vault_secret(path: str) -> dict:
    """Fetch a secret from HashiCorp Vault."""
    client = hvac.Client(
        url=os.environ["VAULT_ADDR"],
        token=get_secret("VAULT_TOKEN")
    )
    result = client.secrets.kv.v2.read_secret_version(path=path)
    return result["data"]["data"]
```

### Build-time secrets with BuildKit

```dockerfile
# Dockerfile
# syntax=docker/dockerfile:1.6

FROM node:20-alpine

# Mount secret during build only — not stored in image layers
RUN --mount=type=secret,id=npm_token \
    npm config set //registry.npmjs.org/:_authToken=$(cat /run/secrets/npm_token) && \
    npm ci --omit=dev && \
    npm config delete //registry.npmjs.org/:_authToken
```

```bash
# Build with BuildKit secret
docker build --secret id=npm_token,source=$HOME/.npmrc -t my-api .
```

### Runtime secrets with environment variables (less secure)

```yaml
# docker-compose.prod.yml
services:
    api:
        build: .
        environment:
            - DB_PASSWORD=${DB_PASSWORD}  # From --env-file or shell
```

```bash
# Pass via shell (not visible in docker inspect after Compose v2)
export DB_PASSWORD=strong-prod-password
docker compose --env-file .env.prod up -d
```

## Explanation

Secret management patterns ranked by security:

- **Docker Swarm secrets**: Secrets are encrypted at rest and in transit. Mounted as read-only files at `/run/secrets/`. Never appear in environment variables or `docker inspect`. Best for Swarm deployments.
- **BuildKit mount secrets**: Secrets are available during build but not stored in image layers. The secret file is mounted temporarily and removed after the RUN command. Best for private npm/pip registries.
- **External secret managers (Vault, AWS Secrets Manager)**: Secrets are fetched at runtime from a central vault. Supports rotation, audit logging, and fine-grained access control. Best for enterprise production.
- **.env files**: Simple but risky. Secrets are in plaintext on disk. Use only for development. Never commit to version control.
- **Environment variables**: Visible in `docker inspect` and `docker exec env`. Least secure for production. Use only for non-sensitive configuration.

Key principles:
- Secrets should never be baked into image layers. `ENV` and `ARG` values are visible in image history.
- The `_FILE` suffix convention tells your app to read the secret from a file path instead of an environment variable value.
- Rotate secrets by updating the secret in the manager, not by rebuilding images.

## Variants

| Method | Security | Complexity | Use When |
|--------|----------|------------|----------|
| Swarm secrets | High | Low | Docker Swarm production |
| BuildKit mount | High | Medium | Private registries during build |
| Vault / Secrets Manager | High | High | Enterprise, rotation needed |
| .env file | Low | Low | Development only |
| Environment variables | Low | Low | Non-sensitive config |

## Guidelines

- Never hardcode secrets in Dockerfiles (`ENV`, `ARG`) or Compose files.
- Use Docker Swarm secrets for Swarm deployments.
- Use BuildKit `--mount=type=secret` for build-time credentials (npm, pip, apt).
- Read secrets from files using the `_FILE` suffix convention.
- Add `.env` and `secrets/` to `.gitignore`.
- Use external secret managers (Vault, AWS Secrets Manager) for enterprise production.
- Rotate secrets regularly without rebuilding images.
- Limit secret access to services that need them.
- Audit secret access with `docker secret ls` and Vault audit logs.

## Common Mistakes

- Using `ENV` in Dockerfiles for secrets. These are visible in `docker history` and image inspection.
- Committing `.env` files to Git. Always add to `.gitignore`.
- Passing secrets as command-line arguments. They appear in `docker inspect` and process listings.
- Not using the `_FILE` suffix convention. Apps that only read env vars cannot use Swarm secrets.
- Giving every service access to every secret. Follow least privilege.
- Not rotating secrets. Compromised secrets should be replaceable without downtime.
- Using the same secret across environments. Dev, staging, and prod should have different secrets.

## Frequently Asked Questions

### Are Docker Compose secrets as secure as Swarm secrets?

No. Compose secrets are mounted as files from the host filesystem. They are not encrypted at rest. Swarm secrets are encrypted and managed by the Swarm manager. Use Compose secrets for development and Swarm secrets for production.

### Can I use Docker secrets without Swarm?

Docker Compose supports secrets via the `secrets` key with `file:` source. This mounts the file into the container. It is less secure than Swarm secrets but better than environment variables.

### How do I rotate secrets without downtime?

In Swarm, update the secret and then update the service: `docker service update --secret-rm db_password --secret-add db_password=db_password_v2 api`. The service restarts with the new secret. For zero-downtime, use rolling updates.

### Why should I avoid environment variables for secrets?

Environment variables are visible in `docker inspect`, `docker exec env`, and `/proc/<pid>/environ` on the host. They can leak into logs and crash dumps. File-based secrets are more secure because they are only readable by the container process.
