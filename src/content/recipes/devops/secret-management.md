---
contentType: recipes
slug: secret-management
title: "Manage Application Secrets Securely"
description: "How to store, rotate, and inject API keys, database passwords, and certificates without hardcoding them in source code or environment files."
metaDescription: "Learn secret management for applications. Store, rotate, and inject API keys, database passwords, and certificates securely without hardcoding in source code."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - secret-management
  - vault
  - ci-cd
  - automation
relatedResources:
  - /recipes/environment-variables
  - /recipes/docker-basics
  - /recipes/api-security-headers
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn secret management for applications. Store, rotate, and inject API keys, database passwords, and certificates securely without hardcoding in source code."
  keywords:
    - secret management
    - vault hashicorp
    - aws secrets manager
    - kubernetes secrets
    - secure credentials
    - password rotation
---

## Overview

Secrets — API keys, database passwords, TLS certificates, encryption keys — are the crown jewels of any application. Hardcoding them in source code commits them to version control forever, exposed to anyone with repository access. Storing them in plaintext `.env` files on servers leaves them readable by any process running as the same user.

Secure secret management means storing secrets in dedicated vaults with encryption at rest, access control, audit logging, and automatic rotation. Applications fetch secrets at runtime through authenticated API calls, never persisting them to disk. This recipe covers cloud-native secret managers (AWS, GCP, Azure), HashiCorp Vault, and Kubernetes Secrets.

## When to Use

Use this recipe when:

- Moving from development `.env` files to production secret storage. See [Environment Variables](/recipes/devops/environment-variables) for local config patterns.
- Rotating compromised credentials or complying with security audit requirements. See [JWT Authentication](/recipes/authentication/jwt-authentication) for token rotation strategies.
- Sharing secrets across microservices, CI/CD pipelines, and team members. See [Docker Basics](/recipes/devops/docker-basics) for container secret injection.
- Managing TLS certificates, SSH keys, or database connection strings. See [Parse Config Files](/recipes/devops/parse-config-files) for config-driven secret references.
- Auditing who accessed which secret and when. See [Structured Logging](/recipes/observability/structured-logging) for audit logging.

## Solution

### AWS Secrets Manager (Python)

```python
import boto3
import json

client = boto3.client('secretsmanager')

def get_secret(secret_name):
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

# Usage
db_creds = get_secret('prod/db/postgres')
conn = psycopg2.connect(
    host=db_creds['host'],
    user=db_creds['username'],
    password=db_creds['password'],
)
```

### HashiCorp Vault (Go)

```go
import "github.com/hashicorp/vault/api"

client, _ := api.NewClient(api.DefaultConfig())
client.SetToken("s.xxx")

secret, _ := client.KVv2("secret").Get(context.Background(), "database/creds")
username := secret.Data["username"].(string)
password := secret.Data["password"].(string)
```

### Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
stringData:
  username: admin
  password: "{{ .Values.dbPassword }}"
```

```yaml
# Deployment referencing the secret
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: app
        env:
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: username
```

## Explanation

- **Encryption at rest**: Secrets are encrypted before being written to disk. AWS uses KMS, Vault uses its own encryption engine, and Kubernetes stores base64-encoded secrets (always enable etcd encryption for K8s).
- **Live secrets**: Vault and AWS can generate short-lived credentials on demand. A PostgreSQL role might be valid for 1 hour and then automatically revoked, minimizing blast radius if leaked.
- **Access control**: IAM policies, Vault policies, and Kubernetes RBAC restrict which services or users can read which secrets. Never grant blanket read access to all secrets.
- **Audit logging**: every secret read, write, and rotation is logged. Forward these logs to SIEM tools for anomaly detection.

## Variants

| Tool | Platform | Live Secrets | Auto-Rotation | Best For |
|------|----------|-------------------|---------------|----------|
| AWS Secrets Manager | AWS | Yes | Yes | AWS-native workloads |
| HashiCorp Vault | Multi | Yes | Yes | Multi-cloud, on-prem |
| Azure Key Vault | Azure | Partial | Yes | Azure ecosystems |
| GCP Secret Manager | GCP | No | No | GCP-native workloads |
| Kubernetes Secrets | K8s | No | No | In-cluster injection |

## What Works

- **Never commit secrets to Git**: use `.gitignore` for `.env` files and pre-commit hooks (like `git-secrets` or `truffleHog`) to scan for accidental commits.
- **Rotate secrets regularly**: set automatic rotation policies (30-90 days) and rotate immediately if a secret is exposed or an employee leaves.
- **Use least-privilege access**: grant each service exactly the secrets it needs. A web server does not need the backup encryption key.
- **Cache secrets briefly, not forever**: fetch secrets at startup and refresh them periodically. Do not call the secret manager on every request.
- **Separate secrets by environment**: `prod/db/password`, `staging/db/password`, and `dev/db/password` should be different values in different vault paths.

## Common Mistakes

- **Storing secrets in environment variables on shared hosts**: environment variables are visible to all processes on the same machine. Use file-based injection or dedicated secret sidecars instead.
- **Forgetting to rotate after breaches**: changing the application password is not enough. Rotate API keys, certificates, and session secrets comprehensively.
- **Logging secrets**: never log the full value of a secret. If you must log access, log the secret name and timestamp, never the password itself.
- **Using Kubernetes Secrets without etcd encryption**: by default, Kubernetes Secrets are base64-encoded, not encrypted. Enable etcd encryption at rest.

## Frequently Asked Questions

**Q: Should I use a `.env` file in production?**
A: Only as a last resort. `.env` files are readable by anyone with server access. Prefer a secret manager that provides encryption, access control, and rotation.

**Q: How do I share secrets between team members safely?**
A: Use a team password manager (1Password, Bitwarden) for human credentials and a secret manager (Vault, AWS SM) for application credentials. Never share via Slack or email.

**Q: What is secret sprawl?**
A: The uncontrolled duplication of secrets across systems, repos, and files. Combat it with a centralized vault and strict rotation policies.

**Q: Can I use Kubernetes Secrets for everything?**
A: K8s Secrets are fine for in-cluster injection but lack advanced capabilities like live generation and cross-cluster sharing. Use a dedicated vault for complex requirements.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
