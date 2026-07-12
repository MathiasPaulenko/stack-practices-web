---




contentType: docs
slug: secrets-rotation-runbook
templateType: runbook
title: "Runbook de Rotacion de Secrets"
description: "Runbook para rotar secrets sin downtime: secret inventory, rotation schedule, zero-downtime rotation strategies, dual-key periods, automated rotation con AWS Secrets Manager y HashiCorp Vault y emergency rotation procedures."
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

Este runbook cubre procedures para rotar secrets sin downtime. Secrets incluyen API keys, database passwords, TLS certificates, JWT signing keys y encryption keys. Stale secrets increasean el risk de credential compromise. Este documento cubre secret inventory, rotation schedule, zero-downtime strategies, automated rotation y emergency procedures.

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
  - Genera new secret (v2)
  - Storea v2 en secrets manager alongside v1
  - Deployea application con support para both v1 y v2
  - Application readea v2 para new operations, acceptea v1 para existing

Phase 2 — Switch a new secret
  - Deployea application para usar v2 como primary
  - Monitora para errors y authentication failures
  - Wait 24-48 hours para stability

Phase 3 — Remove old secret
  - Verifica que no service estea usando v1
  - Deletea v1 del secrets manager
  - Loggea rotation completion en audit trail
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

    # Step 2: Genera new password
    new_password = generate_secure_password(length=32)

    # Step 3: Conecta a database con current credentials
    conn = psycopg2.connect(
        host=current_creds['host'],
        user=current_creds['username'],
        password=current_creds['password'],
        database=current_creds['dbname'],
    )

    # Step 4: Updatea password en database (ALTER USER)
    with conn.cursor() as cur:
        cur.execute(f"ALTER USER {current_creds['username']} WITH PASSWORD %s", (new_password,))
    conn.commit()
    conn.close()

    # Step 5: Updatea secret en Secrets Manager
    new_creds = current_creds.copy()
    new_creds['password'] = new_password
    client.put_secret_value(
        SecretId=secret_id,
        SecretString=json.dumps(new_creds),
    )

    # Step 6: Verifica que new credentials funcionen
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

# Enablea automatic rotation — every 90 days
client.rotate_secret(
    SecretId='prod/payment-service/db-credentials',
    RotationLambdaARN='arn:aws:lambda:us-east-1:123456789012:function:secrets-rotation',
    RotationRules={
        'AutomaticallyAfterDays': 90,
    },
)

# Triggerea immediate rotation (para testing o emergency)
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
        # Genera new secret version
        current = json.loads(client.get_secret_value(SecretId=secret_arn)['SecretString'])
        new_password = generate_secure_password(32)
        new_secret = {**current, 'password': new_password}
        client.put_secret_value(
            SecretId=secret_arn,
            ClientRequestToken=token,
            SecretString=json.dumps(new_secret),
        )

    elif step == 'setSecret':
        # Updatea database con new password
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
        # Testea new credentials
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
        # Promotea pending a current
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
# Enablea database secrets engine
vault secrets enable database

# Configura PostgreSQL connection
vault write database/config/payment-postgres \
    plugin_name=postgresql-database-plugin \
    connection_url="postgresql://{{username}}:{{password}}@db-prod:5432/payment?sslmode=require" \
    allowed_roles="payment-service" \
    username="vault-admin" \
    password="admin-password"

# Crea role con rotation
vault write database/roles/payment-service \
    db_name=payment-postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# Application requestea credentials (auto-rotated)
vault read database/creds/payment-service
# Returns: username=v-token-payment-123, password=auto-generated, lease_duration=1h
```

### 4.2 Transit Key Rotation

```bash
# Crea encryption key
vault write -f transit/keys/payments

# Rotea el key (crea new version, old version still decrypta)
vault write -f transit/keys/payments/rotate

# Lista key versions
vault read transit/keys/payments
# latest_version: 2

# Encrypta con latest version
vault write transit/encrypt/payments plaintext=$(base64 <<< "sensitive data")

# Decrypta (automaticamente usa correct version)
vault write transit/decrypt/payments ciphertext=vault:v2:...
```

---

## 5. JWT Signing Key Rotation

### 5.1 Dual-Key Strategy

```python
import jwt
from datetime import datetime, timedelta

# Current y new signing keys
SIGNING_KEYS = {
    'v1': load_private_key('jwt-signing-v1'),
    'v2': load_private_key('jwt-signing-v2'),
}
CURRENT_VERSION = 'v2'

# Issue tokens con current key
def issue_token(user_id: str) -> str:
    payload = {
        'sub': user_id,
        'exp': datetime.utcnow() + timedelta(hours=1),
        'iat': datetime.utcnow(),
        'kid': CURRENT_VERSION,  # Key ID header
    }
    return jwt.encode(payload, SIGNING_KEYS[CURRENT_VERSION], algorithm='RS256', headers={'kid': CURRENT_VERSION})

# Verify tokens — acceptea both v1 y v2 durante transition
def verify_token(token: str) -> dict:
    # Try decodear sin verification para get kid
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
Secret committed to git              | Rotea immediately, scan git history | < 1 hour
Secret exposed en logs               | Rotea immediately, purge logs       | < 1 hour
Secret shared via email/chat         | Rotea immediately                   | < 1 hour
Suspected breach                     | Rotea all secrets en blast radius    | < 4 hours
Employee departure con access        | Rotea dentro de 24 hours            | < 24 hours
Third-party breach notification      | Rotea affected API keys             | < 24 hours
```

### 6.2 Emergency Rotation Procedure

```text
1. Identifica compromised secret(s) y blast radius
2. Genera new secret(s) immediately
3. Updatea secrets manager con new value(s)
4. Triggerea application reload / restart para pick up new secrets
5. Verifica all services estan usando new secret(s)
6. Revokea / invalida old secret(s) en el source (DB, API provider)
7. Audita access logs para misuse de old secret(s)
8. Documenta incident en security incident log
9. Notifica affected teams y stakeholders
10. Schedulea post-incident review dentro de 48 hours
```

## Preguntas Frecuentes

### ¿Con qué frecuencia deberia rotar secrets?

Rotea database passwords y API keys every 90 days. Rotea JWT signing keys every 30 days. Rotea TLS certificates al menos 90 days antes de expiration. Rotea encryption keys annually. Estos son minimums — rotea mas frecuentemente para high-value secrets. Automatiza rotation donde sea possible para avoid human error. Trackea rotation dates en un central inventory y alerta cuando secrets se acercan a su rotation deadline.

### ¿Qué es zero-downtime rotation y por qué es importante?

Zero-downtime rotation significa updatear un secret sin interruptir service. Esto se hace supporteando both old y new secrets simultaneamente durante un transition period. El application acceptea both keys, switchea al new key y luego removea el old key despues de confirmar stability. Sin zero-downtime rotation, debes restartear services durante rotation, causando brief outages. Esto es unacceptable para production services con high availability requirements.

### ¿Cómo roto secrets que estan hardcoded en application code?

Primero, migrates a un secrets manager (AWS Secrets Manager, HashiCorp Vault). Lee secrets al startup o desde el secrets manager API at runtime. Una vez que all hardcoded secrets estan externalized, rotelos through el secrets manager. Nunca dejes secrets en source code — usa environment variables o secrets manager references. Scanea tu codebase regularmente con tools como GitLeaks o TruffleHog para detectar hardcoded secrets.

### ¿Qué deberia hacer si un secret se committed accidentalmente a git?

Rotea el secret immediately — asume que esta compromised. Incluso si removees el commit con `git filter-branch` o BFG, el secret estuvo en el git history y puede haber sido cloned. Genera un new secret, updatealo en el secrets manager y verifica que all services estan usando el new value. Revokea el old secret en su source (database, API provider). Scanea el full git history para otros exposed secrets. Add el secret pattern a tus pre-commit hooks para prevenir recurrence.

### ¿Cómo verifico que all services pickearon el new secret?

Most secrets managers proveen version tracking. Checkea que el current version matchee el newly rotated version. Monitora application logs para authentication errors o connection failures despues de rotation. Usa health checks que verifiquen database connectivity con current credentials. Para distributed systems, ensurea que all instances hayan reloaded — triggerea un rolling restart si el application no supporta hot-reload de secrets. Setea alerts para services still usando old secret versions.

## See Also

- [Complete Guide to Secrets Management](/es/guides/complete-guide-secrets-management/)
- [Secrets Rotation Template](/es/docs/secrets-rotation-template/)
- [Security Best Practices Guide](/es/guides/security-best-practices-guide/)
- [Docker Secrets Management Without Hardcoding Credentials](/es/recipes/docker-secrets-management/)
- [Live Database Credentials with HashiCorp Vault](/es/recipes/vault-dynamic-credentials/)

