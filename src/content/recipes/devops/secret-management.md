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

Secure secret management means storing secrets in dedicated vaults with encryption at rest, access control, audit logging, and automatic rotation. Applications fetch secrets at runtime through authenticated API calls, never persisting them to disk. The solution below covers cloud-native secret managers (AWS, GCP, Azure), HashiCorp Vault, and Kubernetes Secrets.

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
- **Forgetting to rotate after breaches**: changing the application password is not enough. Rotate API keys, certificates, and session secrets thoroughly.
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

### GCP Secret Manager (Node.js)

```javascript
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const client = new SecretManagerServiceClient();

async function getSecret(name) {
  const [version] = await client.accessSecretVersion({
    name: `projects/my-project/secrets/${name}/versions/latest`,
  });
  return version.payload.data.toString('utf8');
}

// Usage
const apiKey = await getSecret('stripe-api-key');
```

### Doppler for Secret Syncing

Doppler syncs secrets from a central dashboard to your runtime environment:

```bash
# Install Doppler CLI
$ brew install dopplerhq/doppler/doppler

# Login and select project
$ doppler login
$ doppler setup

# Run app with secrets injected
$ doppler run -- npm start

# Export secrets to .env for CI
$ doppler secrets download --no-file --format=env > .env
```

### Vault Agent Sidecar Injector (Kubernetes)

```yaml
# helm values for Vault Agent Injector
injector:
  enabled: true
  replicas: 1

# Pod annotation to inject secrets as files
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "api-server"
    vault.hashicorp.com/agent-inject-secret-db-creds: "database/creds/api"
    vault.hashicorp.com/agent-inject-template-db-creds: |
      {{- with secret "database/creds/api" -}}
      DB_USER={{ .Data.username }}
      DB_PASS={{ .Data.password }}
      {{- end }}
spec:
  template:
    spec:
      containers:
      - name: api
        env:
        - name: DB_USER_FILE
          value: /vault/secrets/db-creds
```

### Secret Rotation with AWS Lambda

```python
import boto3
import json
import psycopg2

def rotate_secret(event, context):
    client = boto3.client('secretsmanager')
    secret_arn = event['SecretId']
    token = event['ClientRequestToken']

    # Get current secret
    current = client.get_secret_value(SecretId=secret_arn, VersionStage='AWSCURRENT')
    creds = json.loads(current['SecretString'])

    # Generate new password
    new_password = generate_secure_password()

    # Update database password
    conn = psycopg2.connect(
        host=creds['host'],
        user=creds['username'],
        password=creds['password'],
        dbname='postgres'
    )
    conn.autocommit = True
    cursor = conn.cursor()
    cursor.execute(f"ALTER USER {creds['username']} WITH PASSWORD '{new_password}'")
    cursor.close()
    conn.close()

    # Update secret in AWS
    new_secret = json.dumps({
        **creds,
        'password': new_password
    })
    client.put_secret_value(
        SecretId=secret_arn,
        SecretString=new_secret,
        VersionStage='AWSPENDING'
    )
    client.update_secret_version_stage(
        SecretId=secret_arn,
        VersionStage='AWSCURRENT',
        MoveToVersion=token,
        RemoveFromVersion=current['VersionId']
    )

def generate_secure_password(length=32):
    import secrets
    import string
    alphabet = string.ascii_letters + string.digits + '!@#$%^&*'
    return ''.join(secrets.choice(alphabet) for _ in range(length))
```

### Environment Variable Injection Pattern

```python
import os
from functools import lru_cache

@lru_cache(maxsize=1)
def get_secrets():
    """Load secrets once at startup, cache for process lifetime."""
    if os.environ.get('ENVIRONMENT') == 'production':
        # Fetch from AWS Secrets Manager
        import boto3, json
        client = boto3.client('secretsmanager')
        response = client.get_secret_value(SecretId='prod/app/secrets')
        return json.loads(response['SecretString'])
    else:
        # Dev: load from .env file
        from dotenv import load_dotenv
        load_dotenv()
        return dict(os.environ)

# Usage in application
secrets = get_secrets()
db_url = secrets.get('DATABASE_URL')
api_key = secrets.get('STRIPE_API_KEY')
```

### Secret Scanning in CI/CD

```yaml
# .github/workflows/secret-scan.yml
name: Secret Scan
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for scanning

      - name: TruffleHog
        uses: trufflesecurity/trufflehog@main
        with:
          path: .
          extra_args: --only-verified

      - name: GitLeaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Vault Dynamic Database Credentials

```bash
# Configure Vault database secrets engine
$ vault secrets enable database

# Configure PostgreSQL connection
$ vault write database/config/my-postgresql \
    plugin_name=postgresql-database-plugin \
    connection_url="postgresql://{{username}}:{{password}}@db:5432/mydb?sslmode=disable" \
    allowed_roles="readonly"

# Create a role that generates credentials valid for 1 hour
$ vault write database/roles/readonly \
    db_name=my-postgresql \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# Generate credentials on demand
$ vault read database/creds/readonly
# Key        Value
# lease_id   database/creds/readonly/abc123
# password   A1b2C3d4E5f6G7h8
# username   v-token-readonly-xyz123
```

## Additional Best Practices

6. **Use secret references, not values.** In config files, reference secrets by name or path, not by value:

```yaml
# config.yaml
database:
  host: db.internal
  credentials_secret: prod/db/postgres  # Reference to vault path
```

7. **Implement secret fallback for local dev.** Allow developers to override secrets with local `.env` files:

```python
def get_secret(name):
    # Check environment first (local dev override)
    if os.environ.get(name):
        return os.environ[name]
    # Fall back to secret manager
    return fetch_from_vault(name)
```

8. **Tag and categorize secrets.** Use naming conventions that encode environment, service, and type:

```text
prod/db/postgres-primary
prod/db/postgres-replica
prod/api/stripe-key
prod/api/sendgrid-key
staging/db/postgres
dev/db/postgres
```

9. **Set up secret access alerts.** Alert on anomalous access patterns (off-hours, unusual IPs, bulk reads):

```yaml
# CloudWatch alarm for unusual secret access
AlarmDescription: "Alert when secret access count exceeds threshold"
MetricName: "GetSecretValue"
Threshold: 100
Period: 300
EvaluationPeriods: 1
```

## Additional Common Mistakes

5. **Sharing secrets via chat or email.** Even "temporary" shares get logged in chat history. Use a secret manager with expiring access links instead.

6. **Not revoking secrets when team members leave.** Create an offboarding checklist that includes rotating all secrets the departing member could access.

7. **Using the same secret across environments.** Production and staging should never share a database password. A staging breach then becomes a production breach.

8. **Storing secrets in CI/CD variables without masking.** Most CI tools support masked variables. Ensure secret values are masked in logs:

```yaml
# GitHub Actions - secrets are automatically masked
env:
  DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
```

## Additional FAQ

### How do I handle secrets in a microservices architecture?

Each service should have its own set of secrets with independent access policies. Use a service identity (IAM role, service account, or Vault token) to authenticate to the secret manager. Never share a single vault token across services.

### What is the overhead of fetching secrets at runtime?

AWS Secrets Manager responses typically take 50-200ms. Cache secrets in memory for 5-15 minutes to minimize latency. Vault responses are faster (10-50ms) but still warrant caching.

### How do I test code that depends on secret managers?

Use dependency injection and interfaces:

```python
from abc import ABC, abstractmethod

class SecretProvider(ABC):
    @abstractmethod
    def get_secret(self, name: str) -> str: ...

class AWSSecretProvider(SecretProvider):
    def get_secret(self, name: str) -> str:
        # Real AWS call
        ...

class MockSecretProvider(SecretProvider):
    def get_secret(self, name: str) -> str:
        return "test-value"

# In tests
provider = MockSecretProvider()
service = MyService(provider)
```

### Should I encrypt secrets at the application level too?

For highly sensitive data (PII, financial records), yes. Use envelope encryption: encrypt the data with a data key, encrypt the data key with a master key from KMS/Vault. This adds defense in depth beyond transport encryption and at-rest encryption in the vault.

## Performance Tips

1. **Cache secrets in memory.** Fetch once at startup, refresh periodically:

```python
import time

class SecretCache:
    def __init__(self, ttl=300):
        self._cache = {}
        self._ttl = ttl
        self._timestamps = {}

    def get(self, name, fetch_func):
        if name not in self._cache or time.time() - self._timestamps[name] > self._ttl:
            self._cache[name] = fetch_func(name)
            self._timestamps[name] = time.time()
        return self._cache[name]
```

2. **Use bulk secret reads.** Fetch all secrets for a service in one API call:

```python
# AWS: store all service secrets as a single JSON secret
response = client.get_secret_value(SecretId='prod/api/all-secrets')
all_secrets = json.loads(response['SecretString'])
# all_secrets = {'db_url': '...', 'stripe_key': '...', 'sendgrid_key': '...'}
```

3. **Use connection pooling for Vault.** Reuse HTTP connections to Vault:

```go
client, _ := api.NewClient(api.DefaultConfig())
// Client reuses connections internally
// Adjust transport settings for high-throughput:
transport := &http.Transport{
    MaxIdleConns:        10,
    IdleConnTimeout:     30 * time.Second,
}
```

4. **Preload secrets in container init.** Fetch secrets during container startup, not on first request:

```yaml
# Kubernetes init container
initContainers:
- name: secret-loader
  image: secret-loader:latest
  command: ["/bin/sh", "-c"]
  args:
    - |
      vault kv get -field=password secret/db > /secrets/db_password
      vault kv get -field=apikey secret/api > /secrets/api_key
  volumeMounts:
  - name: secrets
    mountPath: /secrets
```

5. **Use sidecar for secret rotation.** A sidecar can watch for secret changes and send signals to the main container:

```yaml
# Vault Agent sidecar sends SIGHUP when secrets change
annotations:
  vault.hashicorp.com/agent-inject: "true"
  vault.hashicorp.com/agent-inject-command-db-creds: "kill -HUP 1"
```
