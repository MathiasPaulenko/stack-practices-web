---



contentType: docs
slug: encryption-key-rotation-runbook
title: "Runbook de Rotación de Claves de Cifrado"
description: "Un runbook para rotación de claves de cifrado cubriendo tipos de clave, schedules de rotación, migración dual-key sin downtime, verificación y rollback."
metaDescription: "Usá este runbook de rotación de claves de cifrado para definir tipos, schedules, migración dual-key sin downtime, verificación y procedimientos de rollback."
difficulty: advanced
topics:
  - testing
tags:
  - security
  - encryption
  - key-rotation
  - runbook
  - kms
  - cryptography
  - infrastructure
relatedResources:
  - /docs/access-control-policy-template
  - /docs/security-audit-checklist
  - /docs/vulnerability-management-process-template
  - /docs/incident-response-plan-template
  - /docs/penetration-test-report-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usá este runbook de rotación de claves de cifrado para definir tipos, schedules, migración dual-key sin downtime, verificación y procedimientos de rollback."
  keywords:
    - encryption key rotation
    - key management
    - kms
    - runbook
    - zero downtime
    - cryptography
    - security



---

## Overview

Un encryption key rotation runbook define cómo rotatear encryption keys sin service disruption. Cubre key types, rotation schedules, dual-key migration procedures, verification steps y rollback plans. Key rotation limita el blast radius de un compromised key y es un requirement para most compliance frameworks.

## When to Use


- For alternatives, see [Encryption at Rest: AES-256, KMS, Envelope Encryption](/es/guides/complete-guide-encryption-at-rest/).

- Performiendo scheduled key rotation (quarterly, annual)
- Rotateando keys después de un suspected compromise
- Setteando up key rotation procedures para un new system
- Preparando para compliance audits (SOC 2, PCI-DSS, HIPAA)
- Rotateando keys después de que personnel con key access partan

## Solution

```markdown
# Encryption Key Rotation Runbook — `<Organization Name>`

## Runbook Metadata

| Field | Value |
|-------|-------|
| Organization | Example Corp |
| Runbook Version | 2.0 |
| Last Updated | 2026-07-05 |
| Runbook Owner | Security Team |
| Approved By | CISO |
| Review Cycle | Quarterly |
| KMS Provider | AWS KMS |
| Key Store | HashiCorp Vault (for application keys) |

## 1. Key Inventory

### Key Types

| Key Type | Purpose | Algorithm | Rotation Frequency | Storage | Access |
|----------|---------|-----------|-------------------|---------|--------|
| Data Encryption Key (DEK) | Encrypta data at rest | AES-256-GCM | 90 days | AWS KMS | Application IAM role |
| Key Encryption Key (KEK) | Encrypta DEKs | AES-256-GCM | 12 months | AWS KMS | KMS admin role |
| TLS Certificate | HTTPS termination | RSA-2048 / ECDSA P-256 | 12 months | ACM | Load balancer |
| JWT Signing Key | API token signing | RS256 (RSA-2048) | 6 months | Vault | Auth service |
| API Signing Key | API request signing | HMAC-SHA256 | 90 days | Vault | API gateway |
| Database TDEK | Database transparent encryption | AES-256 | 12 months | AWS KMS | Database IAM role |
| S3 Bucket Key | Object encryption | AES-256 | 12 months | AWS KMS | S3 service role |
| Secrets Encryption Key | Vault auto-unseal | AES-256-GCM | 12 months | AWS KMS | Vault IAM role |
| SSH CA Key | SSH certificate signing | Ed25519 | 12 months | Vault | SSH CA admin |
| Code Signing Key | Binary/artifact signing | RSA-4096 | 24 months | HSM | Release engineering |

### Key Registry

| Key ID | Type | Environment | Created | Last Rotated | Next Rotation | Owner |
|--------|------|-------------|---------|--------------|---------------|-------|
| KMS-DEK-001 | DEK | production | 2025-10-01 | 2026-04-01 | 2026-07-01 | DevOps |
| KMS-KEK-001 | KEK | production | 2024-01-15 | 2025-01-15 | 2026-01-15 | Security |
| TLS-WEB-001 | TLS | production | 2025-06-01 | 2025-06-01 | 2026-06-01 | DevOps |
| JWT-SIGN-001 | JWT | production | 2025-11-01 | 2026-02-01 | 2026-08-01 | Auth Team |
| API-SIGN-001 | API | production | 2026-01-15 | 2026-04-15 | 2026-07-15 | API Team |
| DB-TDEK-001 | Database | production | 2024-06-01 | 2025-06-01 | 2026-06-01 | Database Team |
| S3-KEY-001 | S3 | production | 2024-03-01 | 2025-03-01 | 2026-03-01 | DevOps |

## 2. Rotation Schedule

### Rotation Calendar

| Month | Keys to Rotate | Owner | Estimated Duration |
|-------|---------------|-------|-------------------|
| January | KEK-001, S3-KEY-001 | Security, DevOps | 4 hours |
| February | JWT-SIGN-001 | Auth Team | 2 hours |
| March | S3-KEY-001 (if due) | DevOps | 1 hour |
| April | DEK-001, API-SIGN-001 | DevOps, API Team | 3 hours |
| May | — | — | — |
| June | TLS-WEB-001, DB-TDEK-001 | DevOps, Database Team | 4 hours |
| July | DEK-001 | DevOps | 2 hours |
| August | JWT-SIGN-001 | Auth Team | 2 hours |
| September | — | — | — |
| October | DEK-001 | DevOps | 2 hours |
| November | JWT-SIGN-001 | Auth Team | 2 hours |
| December | — | — | — |

### Rotation Triggers

| Trigger | Action | Timeline |
|---------|--------|----------|
| Scheduled rotation | Seguí este runbook | Per schedule |
| Key compromise | Emergency rotation | Within 4 hours |
| Personnel departure | Rotateá keys que tenían access a | Within 24 hours |
| Compliance audit finding | Rotateá flagged keys | Per audit deadline |
| Security incident | Rotateá potentially exposed keys | Per incident response plan |
| Algorithm deprecation | Migrateá a new algorithm | Before deprecation date |

## 3. Pre-Rotation Checklist

| Check | Action | Responsible | Status |
|-------|--------|-------------|--------|
| Key identified | Confirmá key ID y type | Security | ✅/❌ |
| Backup current key | Exportá encrypted key material | Security | ✅/❌ |
| Notify stakeholders | Emailé affected teams 48h before | Security | ✅/❌ |
| Schedule maintenance window | Si required (non-zero-downtime keys) | DevOps | ✅/❌ |
| Verify new key creation | New key created en KMS/Vault | Security | ✅/❌ |
| Test in staging | Rotateá key en staging first | Engineering | ✅/❌ |
| Prepare rollback plan | Documentá rollback steps | Security | ✅/❌ |
| Verify monitoring | Key rotation alerts configured | DevOps | ✅/❌ |

## 4. Zero-Downtime Rotation: Dual-Key Strategy

### Dual-Key Migration Process

| Step | Action | Duration | Verification | Rollback |
|------|--------|----------|--------------|----------|
| 1 | Createá new key en KMS | 5 min | Key exists, ARN confirmed | Deleteá new key |
| 2 | Deployeá code que supporta both keys | 30 min | Deployment successful | Reverteá deployment |
| 3 | Enableá dual-key mode (read both, write new) | 5 min | Config updated, service healthy | Reverteá config |
| 4 | Monitoreá por 1 hour | 1 hour | No errors, no decryption failures | Reverteá config |
| 5 | Migrateá existing data a new key | Variable | Data migration complete | Re-run con old key |
| 6 | Switcheá a write-only new key | 5 min | Config updated, service healthy | Re-enableá dual mode |
| 7 | Monitoreá por 24 hours | 24 hours | No errors, no decryption failures | Re-enableá dual mode |
| 8 | Removeá old key access | 5 min | Old key disabled | Re-enableá old key |
| 9 | Scheduleá old key deletion | 5 min | Deletion scheduled (30-day wait) | Cancelá deletion |
| 10 | Documentá rotation | 15 min | Runbook updated | N/A |

### Dual-Key Configuration

```yaml
# Application configuration for dual-key mode
encryption:
  mode: dual-key
  current_key:
    kms_key_id: "arn:aws:kms:us-east-1:123:key/old-key-id"
    status: "read-only"
  new_key:
    kms_key_id: "arn:aws:kms:us-east-1:123:key/new-key-id"
    status: "read-write"
  migration:
    batch_size: 1000
    parallelism: 4
    rate_limit: 100  # records per second
```

### Data Migration Script

```python
import boto3
from concurrent.futures import ThreadPoolExecutor

kms = boto3.client('kms')
old_key_id = "arn:aws:kms:us-east-1:123:key/old-key-id"
new_key_id = "arn:aws:kms:us-east-1:123:key/new-key-id"

def migrate_record(record_id):
    # 1. Decrypt with old key
    encrypted_data = db.get_encrypted_field(record_id)
    plaintext = kms.decrypt(
        CiphertextBlob=encrypted_data,
        KeyId=old_key_id
    )['Plaintext']

    # 2. Re-encrypt with new key
    new_ciphertext = kms.encrypt(
        Plaintext=plaintext,
        KeyId=new_key_id
    )['CiphertextBlob']

    # 3. Update record
    db.update_encrypted_field(record_id, new_ciphertext)
    return record_id

# Migrate in batches
batch_size = 1000
record_ids = db.get_all_record_ids()

for i in range(0, len(record_ids), batch_size):
    batch = record_ids[i:i + batch_size]
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(migrate_record, batch))
    print(f"Migrated {len(results)} records ({i + len(batch)}/{len(record_ids)})")
```

## 5. Key-Specific Rotation Procedures

### AWS KMS Key Rotation

| Step | Command | Duration |
|------|---------|----------|
| 1 | `aws kms create-key --description "DEK-v2" --key-spec SYMMETRIC_DEFAULT` | 5 min |
| 2 | Updateá application config con new key ARN | 5 min |
| 3 | Deployeá updated config | 10 min |
| 4 | Verifyá encryption con new key | 5 min |
| 5 | `aws kms disable-key --key-id <old-key-id>` | 5 min |
| 6 | `aws kms schedule-key-deletion --key-id <old-key-id> --pending-window-in-days 30` | 5 min |

### TLS Certificate Rotation (ACM)

| Step | Command | Duration |
|------|---------|----------|
| 1 | `aws acm request-certificate --domain-name "*.example.com" --validation-method DNS` | 5 min |
| 2 | Addeá DNS validation record | 10 min |
| 3 | Wait for validation (automated) | 5-30 min |
| 4 | Updateá load balancer listener para usar new certificate | 5 min |
| 5 | Verifyá HTTPS con new certificate | 5 min |
| 6 | Deleteá old certificate después de 7 days | 5 min |

### JWT Signing Key Rotation

| Step | Action | Duration |
|------|--------|----------|
| 1 | Generateá new key pair en Vault | 5 min |
| 2 | Addeá new public key a JWKS endpoint | 5 min |
| 3 | Deployeá code que signea con new key | 10 min |
| 4 | Wait for old tokens a expire (max token lifetime) | Per token TTL |
| 5 | Removeá old public key from JWKS | 5 min |
| 6 | Revokeá old key en Vault | 5 min |

```javascript
// JWKS endpoint supporting dual keys during rotation
const jwks = {
  keys: [
    {
      kty: "RSA",
      kid: "jwt-key-v1",
      use: "sig",
      alg: "RS256",
      n: "...",
      e: "AQAB"
    },
    {
      kty: "RSA",
      kid: "jwt-key-v2",
      use: "sig",
      alg: "RS256",
      n: "...",
      e: "AQAB"
    }
  ]
};
```

### Database TDEK Rotation

| Step | Action | Duration | Downtime |
|------|--------|----------|----------|
| 1 | Createá new KMS key para database | 5 min | None |
| 2 | Updateá database config con new key ARN | 5 min | None |
| 3 | Triggereá re-encryption de database | Variable | None (online) |
| 4 | Monitoreá re-encryption progress | Variable | None |
| 5 | Verifyá all data encrypted con new key | 5 min | None |
| 6 | Disableá old key | 5 min | None |

### API Signing Key Rotation

| Step | Action | Duration |
|------|--------|----------|
| 1 | Generateá new HMAC key en Vault | 5 min |
| 2 | Distributeá new key a API consumers | Variable |
| 3 | Deployeá code accepteando both keys | 10 min |
| 4 | Monitoreá por authentication failures | 24 hours |
| 5 | Removeá old key acceptance | 5 min |
| 6 | Revokeá old key en Vault | 5 min |

## 6. Verification

### Post-Rotation Verification Checklist

| Check | Method | Pass Criteria | Responsible |
|-------|--------|---------------|-------------|
| New key active | KMS API: `describe-key` | KeyState: Enabled | Security |
| Encryption works | Encrypt/decrypt test | Success con new key | Engineering |
| Decryption works | Decrypt existing data | Success con old key (dual mode) | Engineering |
| No errors in logs | Check application logs | 0 encryption errors por 1 hour | DevOps |
| Monitoring alerts | Check dashboards | No anomaly alerts | DevOps |
| Performance normal | Compareá a baseline | Within 5% de baseline | DevOps |
| Data migration complete | Verify all records | 100% encrypted con new key | Engineering |
| Old key disabled | KMS API: `describe-key` | KeyState: Disabled | Security |
| Documentation updated | Review runbook | Rotation logged | Security |

### Verification Script

```bash
#!/bin/bash
# Verify key rotation completion

NEW_KEY_ID="arn:aws:kms:us-east-1:123:key/new-key-id"
OLD_KEY_ID="arn:aws:kms:us-east-1:123:key/old-key-id"

# 1. Verify new key is enabled
NEW_KEY_STATE=$(aws kms describe-key --key-id $NEW_KEY_ID --query 'KeyMetadata.KeyState' --output text)
if [ "$NEW_KEY_STATE" != "Enabled" ]; then
    echo "FAIL: New key is not enabled (state: $NEW_KEY_STATE)"
    exit 1
fi
echo "OK: New key is enabled"

# 2. Verify old key is disabled
OLD_KEY_STATE=$(aws kms describe-key --key-id $OLD_KEY_ID --query 'KeyMetadata.KeyState' --output text)
if [ "$OLD_KEY_STATE" != "Disabled" ]; then
    echo "FAIL: Old key is not disabled (state: $OLD_KEY_STATE)"
    exit 1
fi
echo "OK: Old key is disabled"

# 3. Test encryption with new key
TEST_DATA="rotation-test-$(date +%s)"
ENCRYPTED=$(aws kms encrypt --key-id $NEW_KEY_ID --plaintext "$TEST_DATA" --output text --query CiphertextBlob)
DECRYPTED=$(aws kms decrypt --ciphertext-blob fileb://<(echo "$ENCRYPTED" | base64 --decode) --output text --query Plaintext | base64 --decode)
if [ "$DECRYPTED" != "$TEST_DATA" ]; then
    echo "FAIL: Encryption/decryption test failed"
    exit 1
fi
echo "OK: Encryption/decryption test passed"

echo "All verification checks passed."
```

## 7. Rollback Plan

### Rollback Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| Decryption failures | > 1% de requests fail | Re-enableá old key, reverteá a dual-key mode |
| Service outage | Application down | Re-enableá old key, reverteá config |
| Data corruption | Migration corrompe data | Stopá migration, restoreá from backup |
| Performance degradation | > 20% slower | Pauseá migration, investigá |
| Monitoring alerts | Critical alerts durante rotation | Pauseá rotation, investigá |

### Rollback Steps

| Step | Action | Duration |
|------|--------|----------|
| 1 | Re-enableá old key en KMS | 5 min |
| 2 | Reverteá application config a old key | 5 min |
| 3 | Deployeá reverted config | 10 min |
| 4 | Verifyá service health | 5 min |
| 5 | Investigá failure cause | Variable |
| 6 | Fixeá issue y retry rotation | Variable |

## 8. Emergency Rotation

### Emergency Rotation Procedure

| Step | Action | Duration | Notes |
|------|--------|----------|-------|
| 1 | Createá new key | 5 min | KMS create-key |
| 2 | Updateá all services para usar new key | 30 min | Parallel deployment |
| 3 | Re-encrypteá all data | Variable | Batch migration |
| 4 | Revokeá old key | 5 min | Disable + schedule deletion |
| 5 | Rotateá all credentials que tenían key access | 1 hour | IAM, Vault, CI/CD |
| 6 | Auditá CloudTrail para unauthorized use | 2 hours | Check old key usage |
| 7 | Documentá incident | 1 hour | Incident report |
| 8 | Notifyá stakeholders | 30 min | Security, legal, compliance |

### Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Security Lead | Jane Doe | +1-555-0101 | jane@example.com |
| DevOps Lead | John Smith | +1-555-0102 | john@example.com |
| CISO | Robert Chen | +1-555-0103 | robert@example.com |
| AWS Support | Enterprise support | +1-555-0104 | support@aws.amazon.com |
```

## Explanation

Key rotation limita el impact de un compromised key. Si un attacker obtiene un key, solo puede decrypt data por el period que el key estuvo active. Rotateando keys every 90 days significa que un compromised key expone at most 90 days de data. Sin rotation, un single compromised key expone all data ever encrypted con it.

El dual-key strategy enablea zero-downtime rotation. En vez de switcheando de old key a new key instantáneamente, el system supporta both keys simultaneamente. Durante migration, el application readea con both keys (old data usa old key, new data usa new key) y writeea con el new key. Una vez que all data se migrated, el old key se remove. Este approach handlea large datasets que no podés re-encryptar instantáneamente.

Different key types tienen different rotation procedures. AWS KMS keys se rotatean creando un new key y updateando el application configuration. TLS certificates se rotatean through ACM con DNS validation. JWT signing keys requiren un JWKS endpoint que servea both old y new public keys hasta que old tokens expiren. Database encryption keys usan online re-encryption. API signing keys requiren coordination con consumers para distribute el new key.

Verification confirma que el rotation worked. El new key debe estar active y functional. El old key debe estar disabled. Data debe estar encrypted con el new key. Application logs deben show 0 encryption errors. Monitoring debe show normal performance. Sin verification, un rotation might appear complete mientras some data todavía está encrypted con el old key o el application está silently failing.

Rollback plans son essential. Si decryption failures occurren después de rotation, el system debe poder revert al old key quickly. Rollback triggers definen cuándo revertir: decryption failures above 1%, service outage, data corruption o performance degradation. El rollback procedure re-enablea el old key y revertea el configuration.

Emergency rotation sigue un compressed timeline. Cuando un key se suspected compromised, un new key se created, all services se updated, data se re-encrypted y el old key se revoked — todo within hours. Emergency rotation también require rotatear all credentials que tenían access al key, auditar para unauthorized use y documentar el incident.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| AWS KMS | Managed key rotation | Automatic annual rotation available |
| Azure Key Vault | Managed key rotation | Azure Key Vault rotation policies |
| Google Cloud KMS | Managed key rotation | Automatic rotation per schedule |
| HashiCorp Vault | Self-managed keys | Vault transit engine for encryption |
| On-premises HSM | Manual rotation | Thales/Gemalto HSM procedures |
| Multi-cloud | Cloud-specific + Vault | Centralized key management |
| Air-gapped | Offline HSM | Physical key management procedures |

## What Works

1. Usá dual-key strategy para zero-downtime — no service disruption
2. Rotateá en staging first — catch issues antes de production
3. Migrateá data en batches — avoid overwhelming el database
4. Monitoreá por 24 hours después de rotation — detect delayed issues
5. Keepé old key por 30 days antes de deletion — safety margin
6. Documentá every rotation — audit trail para compliance
7. Automateá where possible — reduce human error

## Common Mistakes

1. Rotatear sin dual-key support — causa downtime o data loss
2. No rollback plan — stuck si rotation fail
3. No verification — rotation appears complete pero no lo está
4. Deletear old key too soon — data todavía encrypted con old key se vuelve unreadable
5. No staging test — production rotation es el first test
6. No rotatear keys después de personnel departure — departed employee todavía tiene key access
7. No monitoring durante rotation — issues detected days later

## Frequently Asked Questions

### ¿Qué es envelope encryption y cómo se relaciona con key rotation?

Envelope encryption usa un Key Encryption Key (KEK) para encryptar Data Encryption Keys (DEKs). El DEK encrypta el actual data. Cuando rotateás, solo necesitás re-encryptar el DEK con el new KEK — el underlying data no necesita re-encryption. Esto hace rotation faster porque estás re-encrypteando un small key, no el entire dataset. AWS KMS usa envelope encryption por default.

### ¿Cómo rotateamos keys para data que es too large para re-encryptar?

Usá el dual-key strategy. Keepé el old key para reading existing data y usá el new key para writing new data. Gradualmente re-encryptá old data en batches durante off-peak hours. Para very large datasets, considerá un lazy migration approach: re-encryptá data solo cuando se next accessed o modified. Esto spreadea el migration over un longer period sin impacting performance.

### ¿Cuál es la difference entre automatic y manual key rotation?

AWS KMS ofrece automatic key rotation para managed keys, que rotatea el key material annually sin changing el key ARN. El application no necesita any changes. Manual rotation createa un new key con un new ARN, requireiendo application configuration updates. Automatic rotation es simpler pero less flexible — no podés controlar el timing o forzar un emergency rotation. Manual rotation da full control pero require más operational work.

### ¿Deberíamos usar el same key across environments?

No. Usá separate keys para development, staging y production. Un compromised development key no debería affect production data. Separate keys también allow different rotation schedules — development keys might rotate less frequently ya que el data no es sensitive. Usá KMS key policies o Vault namespaces para enforce environment isolation.

### ¿Cómo handleamos key rotation para third-party integrations?

Coordinateá con el third party antes de rotatear. Shareá el new key through un secure channel (no email). Maintainé un transition period donde both old y new keys se accept. Monitoreá por authentication failures durante el transition. Seteá un deadline para el third party switchear al new key. Después del deadline, revokeá el old key. Documentá el coordination process para audit purposes.
