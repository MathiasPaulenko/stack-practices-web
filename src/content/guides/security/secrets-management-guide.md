---
contentType: guides
slug: secrets-management-guide
title: "Secrets Management: Vault, Cloud Managers"
description: "A practical guide to secrets management: HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, and GCP Secret Manager with rotation, access control, and CI/CD integration."
metaDescription: "Learn secrets management with Vault, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager. Rotation, access control, and CI/CD integration guide."
difficulty: intermediate
topics:
  - security
  - devops
  - infrastructure
tags:
  - secrets-management
  - hashicorp-vault
  - aws-secrets-manager
  - azure-key-vault
  - gcp-secret-manager
  - secret-rotation
  - guide
relatedResources:
  - /guides/secure-coding-guide
  - /guides/cryptography-basics-guide
  - /guides/zero-trust-architecture-guide
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Learn secrets management with Vault, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager. Rotation, access control, and CI/CD integration guide."
  keywords:
    - secrets-management
    - hashicorp-vault
    - aws-secrets-manager
    - azure-key-vault
    - gcp-secret-manager
    - secret-rotation
    - guide
---

## Overview

Secrets — passwords, API keys, tokens, certificates — are the keys to your kingdom. Storing them in source code, configuration files, or environment variables is a common source of breaches. Proper secrets management ensures credentials are encrypted, rotated, audited, and accessible only to authorized services and users. The following walks through the leading secret management solutions and the practices that make them useful.

## When to Use

- You have credentials, API keys, or certificates to protect
- You need to share secrets across teams or services
- You want to audit who accessed what secret and when
- You are building a CI/CD pipeline that needs runtime secrets

## What Not to Do

| Anti-Pattern | Why It Fails | What to Do Instead |
|--------------|-------------|-------------------|
| Hardcode secrets in source | Commits to Git are forever; history leaks | Use secret references |
| Store secrets in env vars | Visible in process dumps, `/proc`, and debug endpoints | Use secret managers with runtime injection |
| Share one password across services | Blast radius is entire infrastructure | Service-specific credentials |
| Never rotate secrets | Compromised keys remain valid indefinitely | Automate rotation |
| Send secrets in Slack/email | Unencrypted, unlogged, uncontrolled | Use approved secret sharing tools |

## HashiCorp Vault

The open-source standard for secrets management.

### Core Concepts

| Component | Purpose |
|-----------|---------|
| Secrets Engine | Stores or generates secrets (KV, database, PKI, AWS) |
| Auth Method | How users/services authenticate (Kubernetes, OIDC, AppRole) |
| Policy | Fine-grained access control (ACL) |
| On-demand Secret | Short-lived, automatically revoked credentials |

### On-demand Database Credentials

```bash
# Enable database secrets engine
vault secrets enable database

# Configure PostgreSQL connection
vault write database/config/my-postgresql \
  plugin_name=postgresql-database-plugin \
  allowed_roles="app" \
  connection_url="postgresql://{{username}}:{{password}}@db:5432/mydb" \
  username="vaultadmin" \
  password="vaultpass"

# Create a role that generates 1-hour leases
vault write database/roles/app \
  db_name=my-postgresql \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';" \
  default_ttl="1h" \
  max_ttl="24h"
```

### Reading Secrets in Applications

```python
import hvac

client = hvac.Client(url='https://vault.example.com')
client.auth.kubernetes.login(role='my-app', jwt=service_account_token)

# Read a static secret
secret = client.secrets.kv.v2.read_secret_version(path='my-app/config')
api_key = secret['data']['data']['api_key']

# Generate on-demand database credentials
db_creds = client.secrets.database.generate_credentials(name='app')
username = db_creds['data']['username']
password = db_creds['data']['password']
```

## AWS Secrets Manager

Fully managed secret rotation for AWS workloads.

```bash
# Create a secret
aws secretsmanager create-secret \
  --name prod/database/password \
  --secret-string '{"username":"admin","password":"supersecret"}'

# Retrieve a secret
aws secretsmanager get-secret-value --secret-id prod/database/password

# Configure automatic rotation
aws secretsmanager rotate-secret \
  --secret-id prod/database/password \
  --rotation-lambda-arn arn:aws:lambda:...:function:rotation \
  --automatically-after-days 30
```

### IAM Policy for Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:*:*:secret:prod/*",
      "Condition": {
        "StringEquals": {
          "aws:SourceVpc": "vpc-12345"
        }
      }
    }
  ]
}
```

## Azure Key Vault

Integrated with Azure AD and Microsoft ecosystems.

```bash
# Create a Key Vault
az keyvault create --name myvault --resource-group mygroup --location eastus

# Store a secret
az keyvault secret set --vault-name myvault --name db-password --value secret123

# Retrieve a secret
az keyvault secret show --vault-name myvault --name db-password
```

### Managed Identity Access

```python
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

credential = DefaultAzureCredential()
client = SecretClient(vault_url="https://myvault.vault.azure.net/", credential=credential)

secret = client.get_secret("db-password")
print(secret.value)
```

## GCP Secret Manager

Native integration with GCP IAM and Cloud Run.

```bash
# Create a secret
echo -n "supersecret" | gcloud secrets create db-password --data-file=-

# Add a version
echo -n "newsecret" | gcloud secrets versions add db-password --data-file=-

# Access from Cloud Run (no code changes needed)
gcloud run deploy my-app --set-secrets=DB_PASSWORD=db-password:latest
```

## CI/CD Integration

### GitHub Actions with OIDC

```yaml
jobs:
  deploy:
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/GitHubActionsRole
          aws-region: us-east-1
      - run: |
          DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id db-password --query SecretString --output text)
          echo "DB_PASSWORD=$DB_PASSWORD" >> $GITHUB_ENV
```

### Secrets Scanning in Pipelines

```bash
# Detect secrets before merge
 trufflehog filesystem --directory=.
 gitleaks detect --source .
 detect-secrets scan
```

## Rotation Strategies

| Strategy | Best For | Complexity |
|----------|----------|------------|
| Manual | Ad-hoc, small teams | Low |
| Lambda/Function | AWS RDS, standard databases | Medium |
| Vault On-demand | Microservices, multi-cloud | High |
| Certificate Auto | TLS certificates (Let's Encrypt, ACM) | Low |

## Common Mistakes

- **Using one secret for all environments** — separate prod, staging, and dev secrets
- **No audit logging** — you cannot investigate breaches without access logs
- **Overly permissive policies** — a compromised CI/CD token should not access production secrets
- **Ignoring secret sprawl** — old API keys in environment variables, logs, and backups
- **No revocation plan** — when a secret leaks, how quickly can you rotate it?

## FAQ

**Should I use Vault or a cloud-native manager?**
Use Vault for multi-cloud, complex workflows, or on-demand secrets. Use cloud-native managers (AWS, Azure, GCP) for simplicity and tight integration with that cloud.

**How often should I rotate secrets?**
- Database credentials: 30-90 days
- API keys: 90 days or on employee departure
- TLS certificates: before expiry (typically annually)
- Emergency: immediately on suspected compromise

**Can I prevent developers from seeing secrets?**
Yes. Grant `read` but not `list` or `update`. Use live credentials so developers get temporary, limited permissions without seeing the root password.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Scenario: Secrets Management for Microservices

```text
System: 10 microservices on K8s, AWS
Stack: AWS Secrets Manager + External Secrets Operator

Architecture:
  Developer -> GitHub (secret in repo: NEVER)
  Developer -> AWS Secrets Manager (manual or CLI)
  Secrets Manager -> External Secrets Operator (K8s)
  ESO -> creates Kubernetes Secret
  Pod -> mounts Secret as env var or volume

Secret rules:
  | Rule | Reason |
  |------|--------|
  | Never in code | Git history is permanent |
  | Never in .env in prod | Plaintext file on disk |
  | Never in logs | Logs are accessible |
  | Never in error messages | Exposes to client |
  | Automatic rotation | Minimizes leak impact |
  | Least privilege | Each service only accesses its secrets |
  | Audit log | Who accessed which secret and when |

```yaml
# External Secrets Operator - ExternalSecret
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: payment-service-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretsmanager
    kind: ClusterSecretStore
  target:
    name: payment-service-secrets
    creationPolicy: Owner
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: production/payment-service/database-url
    - secretKey: STRIPE_SECRET_KEY
      remoteRef:
        key: production/payment-service/stripe-key
    - secretKey: JWT_PRIVATE_KEY
      remoteRef:
        key: production/payment-service/jwt-private
```

Automatic rotation (Secrets Manager):
  - Database: rotate every 30 days (Lambda function)
  - Stripe: manual rotation (API does not support auto-rotation)
  - JWT: rotate every 90 days (deploy new key, keep old 7 days)
  - API keys: rotate every 60 days

Leak detection:
  - git-secrets: pre-commit hook blocks commits with patterns
  - TruffleHog: scans git history
  - GitHub Secret Scanning: automatic alerts
  - AWS CloudTrail: audit log of Secrets Manager access

Lessons:
  - External Secrets Operator syncs secrets without manual K8s secrets
  - Automatic rotation minimizes leak impact
  - git-secrets in pre-commit is the first line of defense
  - Each service should have its own secrets (no sharing)
  - Audit log of secret access is mandatory for SOC2
```

### How do I rotate secrets without downtime?

Use the dual-secret pattern: configure the new secret while the old one is still active. Deploy the app with the new secret. Verify it works. After confirming, invalidate the old one. For JWT, accept both keys during a transition period (7 days). For DB, rotate the password via Secrets Manager with a Lambda that updates the password and refreshes the pods.
