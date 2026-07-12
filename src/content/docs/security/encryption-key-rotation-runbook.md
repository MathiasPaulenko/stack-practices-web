---



contentType: docs
slug: encryption-key-rotation-runbook
title: "Encryption Key Rotation Runbook"
description: "A runbook for encryption key rotation covering key types, rotation schedules, zero-downtime procedures, dual-key migration, verification, and rollback."
metaDescription: "Use this encryption key rotation runbook to define key types, rotation schedules, zero-downtime dual-key migration, verification, and rollback procedures."
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
  metaDescription: "Use this encryption key rotation runbook to define key types, rotation schedules, zero-downtime dual-key migration, verification, and rollback procedures."
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

An encryption key rotation runbook defines how to rotate encryption keys without service disruption. It covers key types, rotation schedules, dual-key migration procedures, verification steps, and rollback plans. Key rotation limits the blast radius of a compromised key and is a requirement for most compliance frameworks.

## When to Use


- For alternatives, see [Encryption at Rest: AES-256, KMS, Envelope Encryption](/guides/complete-guide-encryption-at-rest/).

- Performing scheduled key rotation (quarterly, annual)
- Rotating keys after a suspected compromise
- Setting up key rotation procedures for a new system
- Preparing for compliance audits (SOC 2, PCI-DSS, HIPAA)
- Rotating keys after personnel with key access depart

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
| Data Encryption Key (DEK) | Encrypts data at rest | AES-256-GCM | 90 days | AWS KMS | Application IAM role |
| Key Encryption Key (KEK) | Encrypts DEKs | AES-256-GCM | 12 months | AWS KMS | KMS admin role |
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
| Scheduled rotation | Follow this runbook | Per schedule |
| Key compromise | Emergency rotation | Within 4 hours |
| Personnel departure | Rotate keys they had access to | Within 24 hours |
| Compliance audit finding | Rotate flagged keys | Per audit deadline |
| Security incident | Rotate potentially exposed keys | Per incident response plan |
| Algorithm deprecation | Migrate to new algorithm | Before deprecation date |

## 3. Pre-Rotation Checklist

| Check | Action | Responsible | Status |
|-------|--------|-------------|--------|
| Key identified | Confirm key ID and type | Security | ✅/❌ |
| Backup current key | Export encrypted key material | Security | ✅/❌ |
| Notify stakeholders | Email affected teams 48h before | Security | ✅/❌ |
| Schedule maintenance window | If required (non-zero-downtime keys) | DevOps | ✅/❌ |
| Verify new key creation | New key created in KMS/Vault | Security | ✅/❌ |
| Test in staging | Rotate key in staging first | Engineering | ✅/❌ |
| Prepare rollback plan | Document rollback steps | Security | ✅/❌ |
| Verify monitoring | Key rotation alerts configured | DevOps | ✅/❌ |

## 4. Zero-Downtime Rotation: Dual-Key Strategy

### Dual-Key Migration Process

| Step | Action | Duration | Verification | Rollback |
|------|--------|----------|--------------|----------|
| 1 | Create new key in KMS | 5 min | Key exists, ARN confirmed | Delete new key |
| 2 | Deploy code that supports both keys | 30 min | Deployment successful | Revert deployment |
| 3 | Enable dual-key mode (read both, write new) | 5 min | Config updated, service healthy | Revert config |
| 4 | Monitor for 1 hour | 1 hour | No errors, no decryption failures | Revert config |
| 5 | Migrate existing data to new key | Variable | Data migration complete | Re-run with old key |
| 6 | Switch to write-only new key | 5 min | Config updated, service healthy | Re-enable dual mode |
| 7 | Monitor for 24 hours | 24 hours | No errors, no decryption failures | Re-enable dual mode |
| 8 | Remove old key access | 5 min | Old key disabled | Re-enable old key |
| 9 | Schedule old key deletion | 5 min | Deletion scheduled (30-day wait) | Cancel deletion |
| 10 | Document rotation | 15 min | Runbook updated | N/A |

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
| 2 | Update application config with new key ARN | 5 min |
| 3 | Deploy updated config | 10 min |
| 4 | Verify encryption with new key | 5 min |
| 5 | `aws kms disable-key --key-id <old-key-id>` | 5 min |
| 6 | `aws kms schedule-key-deletion --key-id <old-key-id> --pending-window-in-days 30` | 5 min |

### TLS Certificate Rotation (ACM)

| Step | Command | Duration |
|------|---------|----------|
| 1 | `aws acm request-certificate --domain-name "*.example.com" --validation-method DNS` | 5 min |
| 2 | Add DNS validation record | 10 min |
| 3 | Wait for validation (automated) | 5-30 min |
| 4 | Update load balancer listener to use new certificate | 5 min |
| 5 | Verify HTTPS with new certificate | 5 min |
| 6 | Delete old certificate after 7 days | 5 min |

### JWT Signing Key Rotation

| Step | Action | Duration |
|------|--------|----------|
| 1 | Generate new key pair in Vault | 5 min |
| 2 | Add new public key to JWKS endpoint | 5 min |
| 3 | Deploy code that signs with new key | 10 min |
| 4 | Wait for old tokens to expire (max token lifetime) | Per token TTL |
| 5 | Remove old public key from JWKS | 5 min |
| 6 | Revoke old key in Vault | 5 min |

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
| 1 | Create new KMS key for database | 5 min | None |
| 2 | Update database config with new key ARN | 5 min | None |
| 3 | Trigger re-encryption of database | Variable | None (online) |
| 4 | Monitor re-encryption progress | Variable | None |
| 5 | Verify all data encrypted with new key | 5 min | None |
| 6 | Disable old key | 5 min | None |

### API Signing Key Rotation

| Step | Action | Duration |
|------|--------|----------|
| 1 | Generate new HMAC key in Vault | 5 min |
| 2 | Distribute new key to API consumers | Variable |
| 3 | Deploy code accepting both keys | 10 min |
| 4 | Monitor for authentication failures | 24 hours |
| 5 | Remove old key acceptance | 5 min |
| 6 | Revoke old key in Vault | 5 min |

## 6. Verification

### Post-Rotation Verification Checklist

| Check | Method | Pass Criteria | Responsible |
|-------|--------|---------------|-------------|
| New key active | KMS API: `describe-key` | KeyState: Enabled | Security |
| Encryption works | Encrypt/decrypt test | Success with new key | Engineering |
| Decryption works | Decrypt existing data | Success with old key (dual mode) | Engineering |
| No errors in logs | Check application logs | 0 encryption errors for 1 hour | DevOps |
| Monitoring alerts | Check dashboards | No anomaly alerts | DevOps |
| Performance normal | Compare to baseline | Within 5% of baseline | DevOps |
| Data migration complete | Verify all records | 100% encrypted with new key | Engineering |
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
| Decryption failures | > 1% of requests fail | Re-enable old key, revert to dual-key mode |
| Service outage | Application down | Re-enable old key, revert config |
| Data corruption | Migration corrupts data | Stop migration, restore from backup |
| Performance degradation | > 20% slower | Pause migration, investigate |
| Monitoring alerts | Critical alerts during rotation | Pause rotation, investigate |

### Rollback Steps

| Step | Action | Duration |
|------|--------|----------|
| 1 | Re-enable old key in KMS | 5 min |
| 2 | Revert application config to old key | 5 min |
| 3 | Deploy reverted config | 10 min |
| 4 | Verify service health | 5 min |
| 5 | Investigate failure cause | Variable |
| 6 | Fix issue and retry rotation | Variable |

## 8. Emergency Rotation

### Emergency Rotation Procedure

| Step | Action | Duration | Notes |
|------|--------|----------|-------|
| 1 | Create new key | 5 min | KMS create-key |
| 2 | Update all services to use new key | 30 min | Parallel deployment |
| 3 | Re-encrypt all data | Variable | Batch migration |
| 4 | Revoke old key | 5 min | Disable + schedule deletion |
| 5 | Rotate all credentials that had key access | 1 hour | IAM, Vault, CI/CD |
| 6 | Audit CloudTrail for unauthorized use | 2 hours | Check old key usage |
| 7 | Document incident | 1 hour | Incident report |
| 8 | Notify stakeholders | 30 min | Security, legal, compliance |

### Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Security Lead | Jane Doe | +1-555-0101 | jane@example.com |
| DevOps Lead | John Smith | +1-555-0102 | john@example.com |
| CISO | Robert Chen | +1-555-0103 | robert@example.com |
| AWS Support | Enterprise support | +1-555-0104 | support@aws.amazon.com |
```

## Explanation

Key rotation limits the impact of a compromised key. If an attacker obtains a key, they can only decrypt data for the period that key was active. Rotating keys every 90 days means a compromised key exposes at most 90 days of data. Without rotation, a single compromised key exposes all data ever encrypted with it.

The dual-key strategy enables zero-downtime rotation. Instead of switching from old key to new key instantly, the system supports both keys simultaneously. During migration, the application reads with both keys (old data uses old key, new data uses new key) and writes with the new key. Once all data is migrated, the old key is removed. This approach handles large datasets that can't be re-encrypted instantly.

Different key types have different rotation procedures. AWS KMS keys are rotated by creating a new key and updating the application configuration. TLS certificates are rotated through ACM with DNS validation. JWT signing keys require a JWKS endpoint that serves both old and new public keys until old tokens expire. Database encryption keys use online re-encryption. API signing keys require coordination with consumers to distribute the new key.

Verification confirms the rotation worked. The new key must be active and functional. The old key must be disabled. Data must be encrypted with the new key. Application logs must show no encryption errors. Monitoring must show normal performance. Without verification, a rotation might appear complete while some data is still encrypted with the old key or the application is silently failing.

Rollback plans are essential. If decryption failures occur after rotation, the system must be able to revert to the old key quickly. Rollback triggers define when to revert: decryption failures above 1%, service outage, data corruption, or performance degradation. The rollback procedure re-enables the old key and reverts the configuration.

Emergency rotation follows a compressed timeline. When a key is suspected compromised, a new key is created, all services are updated, data is re-encrypted, and the old key is revoked — all within hours. Emergency rotation also requires rotating all credentials that had access to the key, auditing for unauthorized use, and documenting the incident.

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

1. Use dual-key strategy for zero-downtime — no service disruption
2. Rotate in staging first — catch issues before production
3. Migrate data in batches — avoid overwhelming the database
4. Monitor for 24 hours after rotation — detect delayed issues
5. Keep old key for 30 days before deletion — safety margin
6. Document every rotation — audit trail for compliance
7. Automate where possible — reduce human error

## Common Mistakes

1. Rotating without dual-key support — causes downtime or data loss
2. No rollback plan — stuck if rotation fails
3. No verification — rotation appears complete but isn't
4. Deleting old key too soon — data still encrypted with old key becomes unreadable
5. No staging test — production rotation is the first test
6. Not rotating keys after personnel departure — departed employee still has key access
7. No monitoring during rotation — issues detected days later

## Frequently Asked Questions

### What is envelope encryption and how does it relate to key rotation?

Envelope encryption uses a Key Encryption Key (KEK) to encrypt Data Encryption Keys (DEKs). The DEK encrypts the actual data. When rotating, you only need to re-encrypt the DEK with the new KEK — the underlying data doesn't need re-encryption. This makes rotation faster because you're re-encrypting a small key, not the entire dataset. AWS KMS uses envelope encryption by default.

### How do we rotate keys for data that is too large to re-encrypt?

Use the dual-key strategy. Keep the old key for reading existing data and use the new key for writing new data. Gradually re-encrypt old data in batches during off-peak hours. For very large datasets, consider a lazy migration approach: re-encrypt data only when it's next accessed or modified. This spreads the migration over a longer period without impacting performance.

### What is the difference between automatic and manual key rotation?

AWS KMS offers automatic key rotation for managed keys, which rotates the key material annually without changing the key ARN. The application doesn't need any changes. Manual rotation creates a new key with a new ARN, requiring application configuration updates. Automatic rotation is simpler but less flexible — you can't control the timing or force an emergency rotation. Manual rotation gives full control but requires more operational work.

### Should we use the same key across environments?

No. Use separate keys for development, staging, and production. A compromised development key should not affect production data. Separate keys also allow different rotation schedules — development keys might rotate less frequently since the data isn't sensitive. Use KMS key policies or Vault namespaces to enforce environment isolation.

### How do we handle key rotation for third-party integrations?

Coordinate with the third party before rotating. Share the new key through a secure channel (not email). Maintain a transition period where both old and new keys are accepted. Monitor for authentication failures during the transition. Set a deadline for the third party to switch to the new key. After the deadline, revoke the old key. Document the coordination process for audit purposes.
