---
contentType: guides
slug: complete-guide-secrets-management
title: "Referencia Detallada de Gestión de Secrets"
description: "Gestionar secrets de aplicaciones de forma segura en produccion. Cubre HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, Doppler, rotacion de secrets, environment variables, rotacion zero-downtime y secrets en CI/CD pipelines con ejemplos de codigo."
metaDescription: "Gestionar secrets de forma segura. Cubre HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, Doppler, rotacion, CI/CD."
difficulty: advanced
topics:
  - security
  - devops
  - infrastructure
tags:
  - secrets-management
  - security
  - guia
  - vault
  - aws-secrets-manager
  - azure-key-vault
  - doppler
  - secret-rotation
relatedResources:
  - /guides/security/complete-guide-owasp-top-10-2025
  - /guides/security/complete-guide-api-security
  - /guides/security/complete-guide-authentication-patterns
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Gestionar secrets de forma segura. Cubre HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, Doppler, rotacion, CI/CD."
  keywords:
    - gestion de secrets
    - hashicorp vault
    - aws secrets manager
    - azure key vault
    - gcp secret manager
    - doppler
    - rotacion de secrets
    - secrets en ci cd
---

## Introducción

Hardcoded secrets en source code son la causa numero uno de data breaches. API keys, database passwords, encryption keys, y OAuth tokens nunca deben vivir en code. A continuacion se cubre tools y patterns para managear secrets across environments, rotarlos sin downtime, e integrarlos en CI/CD pipelines.

## Por Qué No Environment Variables?

```text
Environment variables son mejores que hardcoded secrets, pero tienen problemas:

1. Leakage: Visibles en /proc/<pid>/environ, process listings, crash dumps
2. Inheritance: Child processes heredan todas las env vars automaticamente
3. No rotation: Cambiar un secret requires restartear la aplicacion
4. No audit: No log de quien accedio cual secret y cuando
5. No access control: Cualquier process puede leer cualquier env var
6. Persistence: A menudo storeadas en .env files que se commitean a git

Usa un dedicated secrets manager. Environment variables estan fine para
non-sensitive configuration (log levels, feature flags, port numbers).
```

## HashiCorp Vault

### Setup y Authentication

```python
import hvac

# Connectar a Vault
client = hvac.Client(
    url="https://vault.internal:8200",
    token=os.environ.get("VAULT_TOKEN")  # Bootstrap token only
)

# Authenticate con AppRole (recommended para services)
def authenticate_approle(role_id: str, secret_id: str) -> str:
    client.auth.approle.login(
        role_id=role_id,
        secret_id=secret_id
    )
    return client.token

# Authenticate con Kubernetes service account
def authenticate_k8s(role: str, jwt: str) -> str:
    response = client.auth.kubernetes.login(
        role=role,
        jwt=jwt,
        use_token=True
    )
    return response["auth"]["client_token"]
```

### Storear y Leer Secrets

```python
# Storear un secret
def store_secret(path: str, data: dict):
    client.secrets.kv.v2.create_or_update_secret(
        path=path,
        secret=data,
        mount_point="secret"
    )

# Ejemplo: Storear database credentials
store_secret("database/prod", {
    "username": "app_user",
    "password": "super_secret_password",
    "host": "db.internal",
    "port": "5432"
})

# Leer un secret
def read_secret(path: str) -> dict:
    response = client.secrets.kv.v2.read_secret_version(
        path=path,
        mount_point="secret"
    )
    return response["data"]["data"]

# Ejemplo: Leer database credentials
creds = read_secret("database/prod")
db_url = f"postgresql://{creds['username']}:{creds['password']}@{creds['host']}:{creds['port']}/mydb"

# Leer specific version
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
# Generar dynamic database credentials (Vault crea un temporary user)
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

# Renew un lease
def renew_lease(lease_id: str) -> bool:
    try:
        client.sys.renew_lease(lease_id=lease_id)
        return True
    except Exception:
        return False

# Revoke un lease (cleanup)
def revoke_lease(lease_id: str):
    client.sys.revoke_lease(lease_id=lease_id)

# Uso con auto-renewal
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
            self._generate()  # Generate new si renewal fails
    
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

# Uso
aws_sm = AWSSecretsManager()

# Storear API key
aws_sm.create_secret("prod/stripe-api-key", {
    "api_key": "sk_live_xxx",
    "webhook_secret": "whsec_xxx"
})

# Retrieve API key
stripe_creds = aws_sm.get_secret("prod/stripe-api-key")
stripe.api_key = stripe_creds["api_key"]
```

### Automatic Rotation con Lambda

```python
# Lambda function para secret rotation
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
        # Create new version con new password
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
        # Update el database con new credentials
        # (implementation depende del database type)
        pass
    
    elif step == "testSecret":
        # Test new credentials
        # (implementation depende del database type)
        pass
    
    elif step == "finishSecret":
        # Promote pending a current
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

# Uso
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

# Uso
gcp_sm = GCPSecretManager("my-project-id")
gcp_sm.create_secret("api-key")
gcp_sm.add_secret_version("api-key", "sk_live_xxx")
api_key = gcp_sm.get_secret("api-key")
```

## Doppler (SaaS Secrets Management)

```bash
# Install Doppler CLI
brew install dopplerhq/cli/doppler

# Login y set up project
doppler login
doppler setup

# Run aplicacion con secrets injected
doppler run -- python app.py

# Export secrets como .env
doppler secrets download --format=env > .env

# Usar en CI/CD
doppler secrets get DATABASE_URL --plain
```

```python
# Doppler con Python — secrets son injected como environment variables
import os

# Doppler injects estos at runtime
db_url = os.environ.get("DATABASE_URL")
api_key = os.environ.get("STRIPE_API_KEY")
jwt_secret = os.environ.get("JWT_SECRET")

# No need de llamar ninguna API — Doppler lo handlea
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
        """Rotar secret con zero downtime usando dual-key strategy."""
        try:
            # Step 1: Generate new secret
            new_secret = self.provider.generate_new_secret(secret_name)
            
            # Step 2: Storear como previous (keep old key valid)
            self.previous_secret = self.current_secret
            
            # Step 3: Update current a new
            self.current_secret = new_secret
            self.last_rotation = datetime.now()
            
            # Step 4: Keep ambas keys valid durante transition
            # Application deberia accept ambas current y previous
            
            # Step 5: Despues de grace period, revoke old key
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
    """Accept ambas current y previous keys durante rotation."""
    
    def __init__(self, rotation_manager):
        self.rotation = rotation_manager
    
    def validate(self, provided_key: str) -> bool:
        current = self.rotation.get_current()
        
        # Check current key
        if provided_key == current.get("api_key"):
            return True
        
        # Check previous key (durante grace period)
        if self.rotation.previous_secret:
            if provided_key == self.rotation.previous_secret.get("api_key"):
                return True
        
        return False
```

## Secrets en CI/CD Pipelines

```yaml
# GitHub Actions: Usar GitHub Secrets con OIDC a cloud providers
name: Deploy
on:
  push:
    branches: [main]

permissions:
  id-token: write  # Required para OIDC
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
      
      # Fetch secrets desde AWS Secrets Manager
      - name: Fetch secrets
        run: |
          DB_PASSWORD=$(aws secretsmanager get-secret-value \
            --secret-id prod/db-password \
            --query SecretString --output text)
          echo "::add-mask::$DB_PASSWORD"
          echo "DB_PASSWORD=$DB_PASSWORD" >> $GITHUB_ENV
      
      - name: Deploy
        run: |
          # Secrets estan disponibles como env vars pero masked en logs
          npm run deploy
```

```python
# GitLab CI: Usar Vault integration
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

## Secret Scanning en Git

```bash
# Pre-commit hook para secret scanning
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

# GitHub Push Protection (enable en repo settings)
# GitGuardian (commercial, automated scanning)
# TruffleHog (open source, scanear git history)
trufflehog git https://github.com/myorg/myrepo.git
```

## Preguntas Frecuentes

### ¿Debería usar environment variables o un secrets manager?

Usa un secrets manager para todos los sensitive data (passwords, API keys, tokens, certificates). Environment variables son acceptable para non-sensitive configuration (log levels, feature flags, ports). Un secrets manager provee rotation, audit logs, access control, y dynamic credentials que environment variables no pueden.

### ¿Con qué frecuencia debería rotar secrets?

Rota database passwords cada 30-90 dias. Rota API keys cada 90 dias o inmediatamente despues de un suspected breach. Rota encryption keys anualmente. Usa dynamic secrets (Vault database engine) para short-lived credentials que expiran automaticamente. Automatiza rotation — manual rotation es error-prone y a menudo skipped.

### ¿Qué es la dual-key rotation strategy?

Durante rotation, generate un new key mientras keep el old key valid por un grace period (tipicamente 1 hora). La aplicacion accept ambas keys durante este window. Despues del grace period, revoke el old key. Esto ensure zero downtime — no requests fallan durante la transition porque ambas keys son valid.

### ¿Cómo prevengo que secrets leakeen a git?

Usa pre-commit hooks con detect-secrets o TruffleHog. Enable GitHub Push Protection. Add secret patterns a .gitignore. Nunca storees secrets en .env files en el repository. Usa un secrets manager en vez de files. Run periodic scans de git history con TruffleHog. Si un secret se commitea, rotalo inmediatamente — no solo deletes el commit.

### ¿Cuál es la diferencia entre Vault y AWS Secrets Manager?

HashiCorp Vault es self-hosted, soporta dynamic secrets, identity-based access, y funciona across clouds. AWS Secrets Manager es managed, integra nativamente con AWS services, soporta automatic rotation via Lambda, y es simpler si ya estas en AWS. Choose Vault para multi-cloud o advanced features. Choose AWS Secrets Manager para AWS-only deployments con simpler setup.

### ¿Cómo gestiono secrets en Kubernetes?

Usa External Secrets Operator para sync secrets desde Vault, AWS Secrets Manager, o Azure Key Vault a Kubernetes Secrets. Nunca storees raw secrets en Helm values o ConfigMaps. Usa Sealed Secrets para GitOps workflows. Usa service account tokens para Vault authentication. Enable etcd encryption at rest en tu cluster.
