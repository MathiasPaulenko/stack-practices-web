---






contentType: guides
slug: complete-guide-secrets-management
title: "Complete Guide to Secrets Management"
description: "Manage application secrets securely in production. Covers HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, Doppler, secret rotation, environment variables, zero-downtime rotation, and secrets in CI/CD pipelines with practical code examples."
metaDescription: "Manage secrets securely. Covers HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, Doppler, rotation, CI/CD pipelines."
difficulty: advanced
topics:
  - security
  - devops
  - infrastructure
tags:
  - secrets-management
  - security
  - guide
  - vault
  - aws-secrets-manager
  - azure-key-vault
  - doppler
  - secret-rotation
relatedResources:
  - /guides/complete-guide-owasp-top-10-2025
  - /guides/complete-guide-api-security
  - /guides/complete-guide-authentication-patterns
  - /guides/ci-cd-security-guide
  - /recipes/python-secrets-management-vault
  - /docs/vulnerability-management-template
  - /guides/complete-guide-terraform-production
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Manage secrets securely. Covers HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, Doppler, rotation, CI/CD pipelines."
  keywords:
    - secrets management
    - hashicorp vault
    - aws secrets manager
    - azure key vault
    - gcp secret manager
    - doppler
    - secret rotation
    - secrets in ci cd






---

## Introduction

Hardcoded secrets in source code are the number one cause of data breaches. API keys, database passwords, encryption keys, and OAuth tokens must never live in code. Below is a practical guide to tools and patterns for managing secrets across environments, rotating them without downtime, and integrating them into CI/CD pipelines.

## Why Not Environment Variables?

```text
Environment variables are better than hardcoded secrets, but they have problems:

1. Leakage: Visible in /proc/<pid>/environ, process listings, crash dumps
2. Inheritance: Child processes inherit all env vars automatically
3. No rotation: Changing a secret requires restarting the application
4. No audit: No log of who accessed which secret and when
5. No access control: Any process can read any env var
6. Persistence: Often stored in .env files that get committed to git

Use a dedicated secrets manager instead. Environment variables are fine for
non-sensitive configuration (log levels, feature flags, port numbers).
```

## HashiCorp Vault

### Setup and Authentication

```python
import hvac

# Connect to Vault
client = hvac.Client(
    url="https://vault.internal:8200",
    token=os.environ.get("VAULT_TOKEN")  # Bootstrap token only
)

# Authenticate with AppRole (recommended for services)
def authenticate_approle(role_id: str, secret_id: str) -> str:
    client.auth.approle.login(
        role_id=role_id,
        secret_id=secret_id
    )
    return client.token

# Authenticate with Kubernetes service account
def authenticate_k8s(role: str, jwt: str) -> str:
    response = client.auth.kubernetes.login(
        role=role,
        jwt=jwt,
        use_token=True
    )
    return response["auth"]["client_token"]
```

### Storing and Reading Secrets

```python
# Store a secret
def store_secret(path: str, data: dict):
    client.secrets.kv.v2.create_or_update_secret(
        path=path,
        secret=data,
        mount_point="secret"
    )

# Example: Store database credentials
store_secret("database/prod", {
    "username": "app_user",
    "password": "super_secret_password",
    "host": "db.internal",
    "port": "5432"
})

# Read a secret
def read_secret(path: str) -> dict:
    response = client.secrets.kv.v2.read_secret_version(
        path=path,
        mount_point="secret"
    )
    return response["data"]["data"]

# Example: Read database credentials
creds = read_secret("database/prod")
db_url = f"postgresql://{creds['username']}:{creds['password']}@{creds['host']}:{creds['port']}/mydb"

# Read specific version
def read_secret_version(path: str, version: int) -> dict:
    response = client.secrets.kv.v2.read_secret_version(
        path=path,
        version=version,
        mount_point="secret"
    )
    return response["data"]["data"]
```

### Dynamic Secrets

```python
# Generate dynamic database credentials (Vault creates a temporary user)
def get_dynamic_db_credentials():
    response = client.secrets.database.generate_credentials(
        name="postgres-role",
        mount_point="database"
    )
    return {
        "username": response["data"]["username"],
        "password": response["data"]["password"],
        "lease_id": response["lease_id"],
        "lease_duration": response["lease_duration"],
        "renewable": response["renewable"]
    }

# Renew a lease
def renew_lease(lease_id: str) -> bool:
    try:
        client.sys.renew_lease(lease_id=lease_id)
        return True
    except Exception:
        return False

# Revoke a lease (cleanup)
def revoke_lease(lease_id: str):
    client.sys.revoke_lease(lease_id=lease_id)

# Usage with auto-renewal
import threading
import time

class DynamicSecretManager:
    def __init__(self, vault_client):
        self.client = vault_client
        self.current_creds = None
        self.lease_id = None
        self.renewal_thread = None
    
    def get_credentials(self) -> dict:
        if not self.current_creds:
            self._generate()
        return self.current_creds
    
    def _generate(self):
        creds = get_dynamic_db_credentials()
        self.current_creds = creds
        self.lease_id = creds["lease_id"]
        
        # Start renewal thread
        if self.renewal_thread:
            self.renewal_thread.cancel()
        
        renew_before = creds["lease_duration"] * 0.8
        self.renewal_thread = threading.Timer(renew_before, self._renew)
        self.renewal_thread.daemon = True
        self.renewal_thread.start()
    
    def _renew(self):
        if renew_lease(self.lease_id):
            creds = get_dynamic_db_credentials()
            self.current_creds = creds
            self.lease_id = creds["lease_id"]
            renew_before = creds["lease_duration"] * 0.8
            self.renewal_thread = threading.Timer(renew_before, self._renew)
            self.renewal_thread.daemon = True
            self.renewal_thread.start()
        else:
            self._generate()  # Generate new if renewal fails
    
    def cleanup(self):
        if self.renewal_thread:
            self.renewal_thread.cancel()
        if self.lease_id:
            revoke_lease(self.lease_id)
```

## AWS Secrets Manager

```python
import boto3
import json

class AWSSecretsManager:
    def __init__(self, region: str = "us-east-1"):
        self.client = boto3.client("secretsmanager", region_name=region)
    
    def create_secret(self, name: str, secret_data: dict) -> str:
        response = self.client.create_secret(
            Name=name,
            SecretString=json.dumps(secret_data),
            Description=f"Secret for {name}",
            Tags=[
                {"Key": "Environment", "Value": "production"},
                {"Key": "Application", "Value": "myapp"}
            ]
        )
        return response["ARN"]
    
    def get_secret(self, name: str) -> dict:
        response = self.client.get_secret_value(SecretId=name)
        return json.loads(response["SecretString"])
    
    def update_secret(self, name: str, secret_data: dict):
        self.client.put_secret_value(
            SecretId=name,
            SecretString=json.dumps(secret_data)
        )
    
    def delete_secret(self, name: str, recovery_window: int = 7):
        self.client.delete_secret(
            SecretId=name,
            RecoveryWindowInDays=recovery_window
        )
    
    def list_secrets(self) -> list:
        response = self.client.list_secrets()
        return response["SecretList"]

# Usage
aws_sm = AWSSecretsManager()

# Store API key
aws_sm.create_secret("prod/stripe-api-key", {
    "api_key": "sk_live_xxx",
    "webhook_secret": "whsec_xxx"
})

# Retrieve API key
stripe_creds = aws_sm.get_secret("prod/stripe-api-key")
stripe.api_key = stripe_creds["api_key"]
```

### Automatic Rotation with Lambda

```python
# Lambda function for secret rotation
import boto3
import json

def lambda_handler(event, context):
    secret_arn = event["SecretId"]
    token = event["ClientRequestToken"]
    step = event["Step"]
    
    sm = boto3.client("secretsmanager")
    
    # Get current secret
    response = sm.get_secret_value(
        SecretId=secret_arn,
        VersionStage="AWSCURRENT"
    )
    current_secret = json.loads(response["SecretString"])
    
    if step == "createSecret":
        # Create new version with new password
        import secrets
        import string
        new_password = ''.join(secrets.choice(
            string.ascii_letters + string.digits + "!@#$%^&*"
        ) for _ in range(32))
        
        new_secret = current_secret.copy()
        new_secret["password"] = new_password
        
        sm.put_secret_value(
            SecretId=secret_arn,
            ClientRequestToken=token,
            SecretString=json.dumps(new_secret),
            VersionStages=["AWSPENDING"]
        )
    
    elif step == "setSecret":
        # Update the database with new credentials
        # (implementation depends on database type)
        pass
    
    elif step == "testSecret":
        # Test new credentials
        # (implementation depends on database type)
        pass
    
    elif step == "finishSecret":
        # Promote pending to current
        sm.update_secret_version_stage(
            SecretId=secret_arn,
            VersionStage="AWSCURRENT",
            MoveToVersionId=token,
            RemoveFromVersionId=response["VersionId"]
        )
    
    return {"status": "success"}
```

## Azure Key Vault

```python
from azure.keyvault.secrets import SecretClient
from azure.identity import DefaultAzureCredential

class AzureKeyVault:
    def __init__(self, vault_url: str):
        credential = DefaultAzureCredential()
        self.client = SecretClient(
            vault_url=vault_url,
            credential=credential
        )
    
    def set_secret(self, name: str, value: str):
        self.client.set_secret(name, value)
    
    def get_secret(self, name: str) -> str:
        secret = self.client.get_secret(name)
        return secret.value
    
    def list_secrets(self) -> list:
        return [s.name for s in self.client.list_properties_of_secrets()]
    
    def delete_secret(self, name: str):
        poller = self.client.begin_delete_secret(name)
        poller.wait()

# Usage
vault = AzureKeyVault("https://myvault.vault.azure.net")
vault.set_secret("database-password", "super_secret_123")
password = vault.get_secret("database-password")
```

## GCP Secret Manager

```python
from google.cloud import secretmanager

class GCPSecretManager:
    def __init__(self, project_id: str):
        self.client = secretmanager.SecretManagerServiceClient()
        self.project_id = project_id
    
    def create_secret(self, name: str) -> str:
        parent = f"projects/{self.project_id}"
        response = self.client.create_secret(
            request={
                "parent": parent,
                "secret_id": name,
                "secret": {"replication": {"automatic": {}}}
            }
        )
        return response.name
    
    def add_secret_version(self, name: str, data: str):
        parent = f"projects/{self.project_id}/secrets/{name}"
        self.client.add_secret_version(
            request={
                "parent": parent,
                "payload": {"data": data.encode()}
            }
        )
    
    def get_secret(self, name: str, version: str = "latest") -> str:
        secret_path = f"projects/{self.project_id}/secrets/{name}/versions/{version}"
        response = self.client.access_secret_version(request={"name": secret_path})
        return response.payload.data.decode()

# Usage
gcp_sm = GCPSecretManager("my-project-id")
gcp_sm.create_secret("api-key")
gcp_sm.add_secret_version("api-key", "sk_live_xxx")
api_key = gcp_sm.get_secret("api-key")
```

## Doppler (SaaS Secrets Management)

```bash
# Install Doppler CLI
brew install dopplerhq/cli/doppler

# Login and set up project
doppler login
doppler setup

# Run application with secrets injected
doppler run -- python app.py

# Export secrets as .env
doppler secrets download --format=env > .env

# Use in CI/CD
doppler secrets get DATABASE_URL --plain
```

```python
# Doppler with Python — secrets are injected as environment variables
import os

# Doppler injects these at runtime
db_url = os.environ.get("DATABASE_URL")
api_key = os.environ.get("STRIPE_API_KEY")
jwt_secret = os.environ.get("JWT_SECRET")

# No need to call any API — Doppler handles it
```

## Zero-Downtime Secret Rotation

```python
import threading
import time
from datetime import datetime, timedelta

class SecretRotationManager:
    def __init__(self, secrets_provider):
        self.provider = secrets_provider
        self.current_secret = None
        self.previous_secret = None
        self.last_rotation = None
        self.rotation_interval = timedelta(hours=24)
    
    def initialize(self, secret_name: str):
        self.current_secret = self.provider.get_secret(secret_name)
        self.last_rotation = datetime.now()
    
    def get_current(self) -> dict:
        return self.current_secret
    
    def rotate(self, secret_name: str) -> bool:
        """Rotate secret with zero downtime using dual-key strategy."""
        try:
            # Step 1: Generate new secret
            new_secret = self.provider.generate_new_secret(secret_name)
            
            # Step 2: Store as previous (keep old key valid)
            self.previous_secret = self.current_secret
            
            # Step 3: Update current to new
            self.current_secret = new_secret
            self.last_rotation = datetime.now()
            
            # Step 4: Keep both keys valid during transition
            # Application should accept both current and previous
            
            # Step 5: After grace period, revoke old key
            threading.Timer(
                3600,  # 1 hour grace period
                self._revoke_previous,
                args=[secret_name]
            ).start()
            
            return True
        except Exception as e:
            print(f"Rotation failed: {e}")
            return False
    
    def _revoke_previous(self, secret_name: str):
        if self.previous_secret:
            self.provider.revoke_secret(secret_name, self.previous_secret)
            self.previous_secret = None
    
    def should_rotate(self) -> bool:
        if not self.last_rotation:
            return True
        return datetime.now() - self.last_rotation >= self.rotation_interval

# Dual-key validation pattern
class DualKeyValidator:
    """Accept both current and previous keys during rotation."""
    
    def __init__(self, rotation_manager):
        self.rotation = rotation_manager
    
    def validate(self, provided_key: str) -> bool:
        current = self.rotation.get_current()
        
        # Check current key
        if provided_key == current.get("api_key"):
            return True
        
        # Check previous key (during grace period)
        if self.rotation.previous_secret:
            if provided_key == self.rotation.previous_secret.get("api_key"):
                return True
        
        return False
```

## Secrets in CI/CD Pipelines

```yaml
# GitHub Actions: Use GitHub Secrets with OIDC to cloud providers
name: Deploy
on:
  push:
    branches: [main]

permissions:
  id-token: write  # Required for OIDC
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # AWS credentials via OIDC (no long-lived keys)
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions
          aws-region: us-east-1
      
      # Fetch secrets from AWS Secrets Manager
      - name: Fetch secrets
        run: |
          DB_PASSWORD=$(aws secretsmanager get-secret-value \
            --secret-id prod/db-password \
            --query SecretString --output text)
          echo "::add-mask::$DB_PASSWORD"
          echo "DB_PASSWORD=$DB_PASSWORD" >> $GITHUB_ENV
      
      - name: Deploy
        run: |
          # Secrets are available as env vars but masked in logs
          npm run deploy
```

```python
# GitLab CI: Use Vault integration
"""
.gitlab-ci.yml

include:
  - template: HashiCorp/Vault.gitlab-ci.yml

variables:
  VAULT_SERVER_URL: "https://vault.internal:8200"
  VAULT_AUTH_ROLE: "gitlab-ci"

deploy:
  stage: deploy
  secrets:
    DATABASE_PASSWORD:
      vault: "database/prod/password@secret"
    API_KEY:
      vault: "api/stripe/key@secret"
  script:
    - python deploy.py
"""
```

## Secret Scanning in Git

```bash
# Pre-commit hook for secret scanning
pip install detect-secrets
detect-secrets scan > .secrets.baseline

# .pre-commit-config.yaml
"""
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.5.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
"""

# GitHub Push Protection (enable in repo settings)
# GitGuardian (commercial, automated scanning)
# TruffleHog (open source, scans git history)
trufflehog git https://github.com/myorg/myrepo.git
```

## FAQ

### Should I use environment variables or a secrets manager?

Use a secrets manager for all sensitive data (passwords, API keys, tokens, certificates). Environment variables are acceptable for non-sensitive configuration (log levels, feature flags, ports). A secrets manager provides rotation, audit logs, access control, and dynamic credentials that environment variables cannot.

### How often should I rotate secrets?

Rotate database passwords every 30-90 days. Rotate API keys every 90 days or immediately after a suspected breach. Rotate encryption keys annually. Use dynamic secrets (Vault database engine) for short-lived credentials that expire automatically. Automate rotation — manual rotation is error-prone and often skipped.

### What is the dual-key rotation strategy?

During rotation, generate a new key while keeping the old key valid for a grace period (typically 1 hour). The application accepts both keys during this window. After the grace period, revoke the old key. This ensures zero downtime — no requests fail during the transition because both keys are valid.

### How do I prevent secrets from leaking into git?

Use pre-commit hooks with detect-secrets or TruffleHog. Enable GitHub Push Protection. Add secret patterns to .gitignore. Never store secrets in .env files in the repository. Use a secrets manager instead of files. Run periodic scans of git history with TruffleHog. If a secret is committed, rotate it immediately — do not just delete the commit.

### What is the difference between Vault and AWS Secrets Manager?

HashiCorp Vault is self-hosted, supports dynamic secrets, identity-based access, and works across clouds. AWS Secrets Manager is managed, integrates natively with AWS services, supports automatic rotation via Lambda, and is simpler if you are already on AWS. Choose Vault for multi-cloud or advanced features. Choose AWS Secrets Manager for AWS-only deployments with simpler setup.

### How do I manage secrets in Kubernetes?

Use the External Secrets Operator to sync secrets from Vault, AWS Secrets Manager, or Azure Key Vault into Kubernetes Secrets. Never store raw secrets in Helm values or ConfigMaps. Use Sealed Secrets for GitOps workflows. Use service account tokens for Vault authentication. Enable etcd encryption at rest in your cluster.

## See Also

- [Secrets Management: Vault, Cloud Managers](/guides/secrets-management-guide/)
- [CI/CD Security: Harden Your Pipelines and Prevent Supply](/guides/ci-cd-security-guide/)
- [Complete Guide to Supply Chain Security](/guides/complete-guide-supply-chain-security/)
- [Complete Guide to Docker in Production](/guides/complete-guide-docker-production/)
- [Disaster Recovery: RTO, RPO, and Resilient Recovery Runbooks](/guides/disaster-recovery-guide/)

