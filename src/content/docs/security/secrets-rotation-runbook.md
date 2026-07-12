---




contentType: docs
slug: secrets-rotation-runbook
templateType: runbook
title: "Secrets Rotation Runbook"
description: "Runbook for rotating secrets without downtime: secret inventory, rotation schedule, zero-downtime rotation strategies, dual-key periods, automated rotation with AWS Secrets Manager and HashiCorp Vault, and emergency rotation procedures."
metaDescription: "Secrets rotation runbook: inventory, schedule, zero-downtime rotation, dual-key periods, AWS Secrets Manager, HashiCorp Vault, emergency rotation."
difficulty: intermediate
topics:
  - security
tags:
  - secrets
  - rotation
  - security
  - vault
  - aws-secrets-manager
  - zero-downtime
relatedResources:
  - /docs/owasp-top-10-remediation-checklist
  - /docs/dependency-vulnerability-triage-template
  - /docs/api-authentication-design-template
  - /docs/secrets-rotation-template
  - /docs/security-review-checklist-for-prs
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Secrets rotation runbook: inventory, schedule, zero-downtime rotation, dual-key periods, AWS Secrets Manager, HashiCorp Vault, emergency rotation."
  keywords:
    - secrets rotation
    - zero-downtime rotation
    - aws secrets manager
    - hashicorp vault
    - secret management
    - key rotation
    - security operations




---

## Overview

This runbook covers procedures for rotating secrets without downtime. Secrets include API keys, database passwords, TLS certificates, JWT signing keys, and encryption keys. Stale secrets increase the risk of credential compromise. This document covers secret inventory, rotation schedule, zero-downtime strategies, automated rotation, and emergency procedures.

---

## 1. Secret Inventory

### 1.1 Secret Types

```text
Secret type              | Rotation frequency | Storage
─────────────────────────┼───────────────────┼──────────────────────────
Database passwords       | 90 days            | Secrets Manager / Vault
API keys (third-party)   | 90 days            | Secrets Manager / Vault
JWT signing keys         | 30 days            | Secrets Manager / Vault
TLS certificates         | 90 days before exp | ACM / cert-manager
Encryption keys (KMS)    | 365 days           | AWS KMS / Vault Transit
Service account tokens   | 30 days            | Secrets Manager / Vault
SSH keys                 | 180 days           | Vault SSH CA
OAuth client secrets     | 90 days            | Secrets Manager / Vault
```

### 1.2 Inventory Template

```text
Secret ID    | Type        | Service         | Owner       | Last rotated | Next due
─────────────┼─────────────┼─────────────────┼─────────────┼──────────────┼──────────
db-prod-pg01 | DB password | payment-service | team-payments| 2026-04-01   | 2026-07-01
api-stripe   | API key     | billing-service | team-billing | 2026-05-15   | 2026-08-15
jwt-signing  | JWT key     | auth-service    | team-auth    | 2026-06-01   | 2026-07-01
tls-api-prod | TLS cert    | api-gateway     | team-infra   | 2026-03-01   | 2026-06-01
```

---

## 2. Zero-Downtime Rotation Strategy

### 2.1 Dual-Key Rotation

```text
Phase 1 — Add new secret (no removal)
  - Generate new secret (v2)
  - Store v2 in secrets manager alongside v1
  - Deploy application with support for both v1 and v2
  - Application reads v2 for new operations, accepts v1 for existing

Phase 2 — Switch to new secret
  - Deploy application to use v2 as primary
  - Monitor for errors and authentication failures
  - Wait 24-48 hours for stability

Phase 3 — Remove old secret
  - Verify no service is using v1
  - Delete v1 from secrets manager
  - Log rotation completion in audit trail
```

### 2.2 Database Password Rotation

```python
import boto3
import psycopg2
from datetime import datetime

def rotate_database_password(secret_id: str):
    client = boto3.client('secretsmanager')

    # Step 1: Get current secret
    current = client.get_secret_value(SecretId=secret_id)
    current_creds = json.loads(current['SecretString'])

    # Step 2: Generate new password
    new_password = generate_secure_password(length=32)

    # Step 3: Connect to database with current credentials
    conn = psycopg2.connect(
        host=current_creds['host'],
        user=current_creds['username'],
        password=current_creds['password'],
        database=current_creds['dbname'],
    )

    # Step 4: Update password in database (ALTER USER)
    with conn.cursor() as cur:
        cur.execute(f"ALTER USER {current_creds['username']} WITH PASSWORD %s", (new_password,))
    conn.commit()
    conn.close()

    # Step 5: Update secret in Secrets Manager
    new_creds = current_creds.copy()
    new_creds['password'] = new_password
    client.put_secret_value(
        SecretId=secret_id,
        SecretString=json.dumps(new_creds),
    )

    # Step 6: Verify new credentials work
    conn = psycopg2.connect(
        host=new_creds['host'],
        user=new_creds['username'],
        password=new_password,
        database=new_creds['dbname'],
    )
    conn.close()

    print(f"Rotation complete for {secret_id} at {datetime.utcnow()}")
```

---

## 3. AWS Secrets Manager Automatic Rotation

### 3.1 Configure Rotation

```python
import boto3

client = boto3.client('secretsmanager')

# Enable automatic rotation — every 90 days
client.rotate_secret(
    SecretId='prod/payment-service/db-credentials',
    RotationLambdaARN='arn:aws:lambda:us-east-1:123456789012:function:secrets-rotation',
    RotationRules={
        'AutomaticallyAfterDays': 90,
    },
)

# Trigger immediate rotation (for testing or emergency)
client.rotate_secret(
    SecretId='prod/payment-service/db-credentials',
    RotateImmediately=True,
)
```

### 3.2 Lambda Rotation Function

```python
import boto3
import json
import psycopg2

def lambda_handler(event, context):
    secret_arn = event['SecretId']
    token = event['ClientRequestToken']
    step = event['Step']

    client = boto3.client('secretsmanager')

    if step == 'createSecret':
        # Generate new secret version
        current = json.loads(client.get_secret_value(SecretId=secret_arn)['SecretString'])
        new_password = generate_secure_password(32)
        new_secret = {**current, 'password': new_password}
        client.put_secret_value(
            SecretId=secret_arn,
            ClientRequestToken=token,
            SecretString=json.dumps(new_secret),
        )

    elif step == 'setSecret':
        # Update database with new password
        pending = client.get_secret_value(
            SecretId=secret_arn,
            VersionStage='AWSPENDING',
            VersionId=token,
        )
        pending_creds = json.loads(pending['SecretString'])
        current = json.loads(client.get_secret_value(SecretId=secret_arn)['SecretString'])

        conn = psycopg2.connect(
            host=current['host'],
            user=current['username'],
            password=current['password'],
        )
        with conn.cursor() as cur:
            cur.execute(f"ALTER USER {pending_creds['username']} WITH PASSWORD %s",
                       (pending_creds['password'],))
        conn.commit()
        conn.close()

    elif step == 'testSecret':
        # Test new credentials
        pending = client.get_secret_value(
            SecretId=secret_arn,
            VersionStage='AWSPENDING',
            VersionId=token,
        )
        creds = json.loads(pending['SecretString'])
        conn = psycopg2.connect(
            host=creds['host'],
            user=creds['username'],
            password=creds['password'],
        )
        conn.close()

    elif step == 'finishSecret':
        # Promote pending to current
        client.update_secret_version_stage(
            SecretId=secret_arn,
            VersionStage='AWSCURRENT',
            MoveToVersionId=token,
            RemoveFromVersionId=event['CurrentVersionId'],
        )
```

---

## 4. HashiCorp Vault Rotation

### 4.1 Database Secrets Engine

```bash
# Enable database secrets engine
vault secrets enable database

# Configure PostgreSQL connection
vault write database/config/payment-postgres \
    plugin_name=postgresql-database-plugin \
    connection_url="postgresql://{{username}}:{{password}}@db-prod:5432/payment?sslmode=require" \
    allowed_roles="payment-service" \
    username="vault-admin" \
    password="admin-password"

# Create role with rotation
vault write database/roles/payment-service \
    db_name=payment-postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# Application requests credentials (auto-rotated)
vault read database/creds/payment-service
# Returns: username=v-token-payment-123, password=auto-generated, lease_duration=1h
```

### 4.2 Transit Key Rotation

```bash
# Create encryption key
vault write -f transit/keys/payments

# Rotate the key (creates new version, old version still decrypts)
vault write -f transit/keys/payments/rotate

# List key versions
vault read transit/keys/payments
# latest_version: 2

# Encrypt with latest version
vault write transit/encrypt/payments plaintext=$(base64 <<< "sensitive data")

# Decrypt (automatically uses correct version)
vault write transit/decrypt/payments ciphertext=vault:v2:...
```

---

## 5. JWT Signing Key Rotation

### 5.1 Dual-Key Strategy

```python
import jwt
from datetime import datetime, timedelta

# Current and new signing keys
SIGNING_KEYS = {
    'v1': load_private_key('jwt-signing-v1'),
    'v2': load_private_key('jwt-signing-v2'),
}
CURRENT_VERSION = 'v2'

# Issue tokens with current key
def issue_token(user_id: str) -> str:
    payload = {
        'sub': user_id,
        'exp': datetime.utcnow() + timedelta(hours=1),
        'iat': datetime.utcnow(),
        'kid': CURRENT_VERSION,  # Key ID header
    }
    return jwt.encode(payload, SIGNING_KEYS[CURRENT_VERSION], algorithm='RS256', headers={'kid': CURRENT_VERSION})

# Verify tokens — accept both v1 and v2 during transition
def verify_token(token: str) -> dict:
    # Try to decode without verification to get kid
    unverified = jwt.decode(token, options={'verify_signature': False})
    kid = unverified.get('kid', 'v1')

    if kid not in SIGNING_KEYS:
        raise ValueError(f"Unknown key ID: {kid}")

    public_key = get_public_key(SIGNING_KEYS[kid])
    return jwt.decode(token, public_key, algorithms=['RS256'])
```

---

## 6. Emergency Rotation

### 6.1 Emergency Triggers

```text
Trigger                              | Action                              | Timeline
─────────────────────────────────────┼─────────────────────────────────────┼──────────
Secret committed to git              | Rotate immediately, scan git history| < 1 hour
Secret exposed in logs               | Rotate immediately, purge logs      | < 1 hour
Secret shared via email/chat         | Rotate immediately                  | < 1 hour
Suspected breach                     | Rotate all secrets in blast radius   | < 4 hours
Employee departure with access       | Rotate within 24 hours              | < 24 hours
Third-party breach notification      | Rotate affected API keys            | < 24 hours
```

### 6.2 Emergency Rotation Procedure

```text
1. Identify compromised secret(s) and blast radius
2. Generate new secret(s) immediately
3. Update secrets manager with new value(s)
4. Trigger application reload / restart to pick up new secrets
5. Verify all services are using new secret(s)
6. Revoke / invalidate old secret(s) at the source (DB, API provider)
7. Audit access logs for misuse of old secret(s)
8. Document incident in security incident log
9. Notify affected teams and stakeholders
10. Schedule post-incident review within 48 hours
```

## FAQ

### How often should I rotate secrets?

Rotate database passwords and API keys every 90 days. Rotate JWT signing keys every 30 days. Rotate TLS certificates at least 90 days before expiration. Rotate encryption keys annually. These are minimums — rotate more frequently for high-value secrets. Automate rotation wherever possible to avoid human error. Track rotation dates in a central inventory and alert when secrets are approaching their rotation deadline.

### What is zero-downtime rotation and why is it important?

Zero-downtime rotation means updating a secret without interrupting service. This is done by supporting both old and new secrets simultaneously during a transition period. The application accepts both keys, switches to the new key, and then removes the old key after confirming stability. Without zero-downtime rotation, you must restart services during rotation, causing brief outages. This is unacceptable for production services with high availability requirements.

### How do I rotate secrets that are hardcoded in application code?

First, migrate them to a secrets manager (AWS Secrets Manager, HashiCorp Vault). Read secrets at startup or from the secrets manager API at runtime. Once all hardcoded secrets are externalized, rotate them through the secrets manager. Never leave secrets in source code — use environment variables or secrets manager references. Scan your codebase regularly with tools like GitLeaks or TruffleHog to detect hardcoded secrets.

### What should I do if a secret is accidentally committed to git?

Rotate the secret immediately — assume it is compromised. Even if you remove the commit with `git filter-branch` or BFG, the secret was in the git history and may have been cloned. Generate a new secret, update it in the secrets manager, and verify all services are using the new value. Revoke the old secret at its source (database, API provider). Scan the full git history for other exposed secrets. Add the secret pattern to your pre-commit hooks to prevent recurrence.

### How do I verify that all services picked up the new secret?

Most secrets managers provide version tracking. Check that the current version matches the newly rotated version. Monitor application logs for authentication errors or connection failures after rotation. Use health checks that verify database connectivity with current credentials. For distributed systems, ensure all instances have reloaded — trigger a rolling restart if the application doesn't support hot-reload of secrets. Set up alerts for services still using old secret versions.

## See Also

- [Complete Guide to Secrets Management](/guides/complete-guide-secrets-management/)
- [Secrets Rotation Template](/docs/secrets-rotation-template/)
- [Security Best Practices Guide](/guides/security-best-practices-guide/)
- [Docker Secrets Management Without Hardcoding Credentials](/recipes/docker-secrets-management/)
- [Live Database Credentials with HashiCorp Vault](/recipes/vault-dynamic-credentials/)

