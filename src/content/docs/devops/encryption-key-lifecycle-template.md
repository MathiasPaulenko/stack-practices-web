---


contentType: docs
slug: encryption-key-lifecycle-template
title: "Encryption Key Lifecycle Template"
description: "A template for managing the creation, distribution, rotation, and destruction of encryption keys across applications and services."
metaDescription: "Manage encryption keys with this lifecycle template. Covers key generation, storage, rotation, access control, and destruction procedures."
difficulty: intermediate
topics:
  - security
  - infrastructure
tags:
  - encryption
  - key-management
  - kms
  - cryptography
  - compliance
relatedResources:
  - /docs/secret-rotation-schedule-template
  - /docs/ci-cd-pipeline-security-template
  - /docs/data-breach-response-playbook
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Manage encryption keys with this lifecycle template. Covers key generation, storage, rotation, access control, and destruction procedures."
  keywords:
    - encryption key lifecycle
    - key management
    - KMS
    - key rotation
    - cryptography policy


---

## Overview

Encryption key lifecycle management defines how keys are created, stored, used, rotated, and retired. Poor key management can undermine encryption entirely by exposing keys, keeping them too long, or failing to revoke them when no longer needed. This template provides policies, procedures, and roles for managing symmetric and asymmetric keys across applications, databases, backups, and cloud services.

## When to Use


- For alternatives, see [Data Retention Policy Template](/docs/data-retention-policy-template/).

- Designing a key management strategy for a new application or platform.
- Selecting or configuring a key management service (KMS) or hardware security module (HSM).
- Establishing a key rotation policy for compliance or risk reduction.
- Responding to a key compromise or suspected unauthorized key access.
- Offboarding a system or retiring a service that holds encrypted data.

## Prerequisites

- A key management service such as AWS KMS, Azure Key Vault, Google Cloud KMS, HashiCorp Vault, or an HSM.
- A classification of data that requires encryption at rest, in transit, or in use.
- A list of systems and services that generate or use encryption keys.
- Defined roles for key custodians, users, and auditors.

## Solution

### Template

#### 1. Key Classification

| Key Type | Purpose | Example | Protection Level |
|----------|---------|---------|------------------|
| Data encryption key (DEK) | Encrypts data at rest | AES-256 database key | High |
| Key encryption key (KEK) | Encrypts DEKs | RSA key in KMS | Critical |
| Transport key | Encrypts data in transit | TLS private key | High |
| Signing key | Signs code or artifacts | ECDSA code signing key | Critical |
| API key | Authenticates API calls | HMAC secret | Medium |
| Backup key | Encrypts backups | AES-256 backup key | High |

#### 2. Key Lifecycle Stages

| Stage | Activities | Owner | Artifacts |
|-------|------------|-------|-----------|
| Generation | Create key with approved algorithm and length | Platform team | Key metadata, algorithm |
| Distribution | Securely deliver key to authorized systems | Security team | Access log, key alias |
| Storage | Store in KMS, HSM, or vault | Platform team | Key location, policy |
| Usage | Enforce least-privilege and audit all operations | Application team | Access policy, audit logs |
| Rotation | Replace key periodically or after incident | Security team | Rotation schedule, new key |
| Compromise | Revoke, rotate, and assess impact | Security team | Incident report, new key |
| Destruction | Securely delete key when no longer needed | Platform team | Destruction certificate |
| Archive | Retain key metadata for compliance without key material | Compliance team | Retention record |

#### 3. Key Rotation Policy

| Key Type | Rotation Frequency | Trigger | Automatic |
|----------|-------------------|---------|-----------|
| KEK / KMS key | 2 years | Scheduled | Yes |
| TLS certificate key | 1 year | Certificate expiry | Yes |
| Database DEK | 1 year | Scheduled | No, planned maintenance |
| Signing key | 1 year | Scheduled or suspected compromise | Semi-automatic |
| API HMAC secret | 90 days | Scheduled or credential leak | Yes |
| Backup key | 1 year | Scheduled | No |

#### 4. Access Control Matrix

| Role | Generate | Use | Rotate | Destroy | Audit |
|------|----------|-----|--------|---------|-------|
| Application service | No | Yes | No | No | No |
| Platform engineer | Yes | No | Yes | No | Yes |
| Security engineer | No | No | Yes | No | Yes |
| Key custodian | Yes | No | Yes | No | Yes |
| Auditor | No | No | No | No | Yes |
| Compliance officer | No | No | No | Yes with approval | Yes |

#### 5. Compromise Response Procedure

| Step | Action | Owner | Timeline |
|------|--------|-------|----------|
| 1 | Revoke or disable the compromised key | Security team | Within 1 hour |
| 2 | Identify all systems and data protected by the key | Security team | Within 4 hours |
| 3 | Rotate to a new key and re-encrypt data | Platform team | Within 24 hours |
| 4 | Notify stakeholders and customers if required | Incident commander | Within 24 hours |
| 5 | Preserve audit logs and evidence | Security team | Immediate |
| 6 | Update incident report and lessons learned | Security team | Within 1 week |

#### 6. Destruction Checklist

- [ ] Key is no longer used by any application or service.
- [ ] Encrypted data has been decrypted with the new key or securely deleted.
- [ ] All backups and replicas containing the key are identified.
- [ ] Key material is deleted from KMS, HSM, or vault.
- [ ] Destruction is logged and signed by key custodian and compliance officer.
- [ ] Retention period for metadata is documented and enforced.

## Explanation

Encryption is only as strong as the keys that protect it. The lifecycle template ensures that keys are generated with strong algorithms, stored in approved services, accessed with least privilege, rotated regularly, and destroyed securely when no longer needed. Separating duties between key custodians, users, and auditors prevents any single person from controlling the entire lifecycle.

## AWS KMS Key Rotation Policy

```yaml
# AWS KMS key with automatic rotation
Resources:
  EncryptionKey:
    Type: AWS::KMS::Key
    Properties:
      Description: Application data encryption key
      EnableKeyRotation: true
      KeyPolicy:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:role/app-role'
            Action:
              - kms:Encrypt
              - kms:Decrypt
              - kms:ReEncrypt*
              - kms:GenerateDataKey*
              - kms:DescribeKey
            Resource: '*'
          - Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:root'
            Action:
              - kms:CreateAlias
              - kms:DeleteAlias
              - kms:UpdateAlias
              - kms:ScheduleKeyDeletion
              - kms:EnableKeyRotation
            Resource: '*'
      PendingWindowInDays: 30
```

## Key Rotation Automation Script

```bash
#!/bin/bash
# Check and report key rotation status across AWS KMS
set -euo pipefail

REGION="us-east-1"
ALERT_DAYS=7

for key_id in $(aws kms list-keys --region $REGION --query 'Keys[*].KeyId' --output text); do
  rotation_status=$(aws kms get-key-rotation-status --key-id $key_id --region $REGION --query 'KeyRotationEnabled' --output text 2>/dev/null || echo "N/A")
  key_desc=$(aws kms describe-key --key-id $key_id --region $REGION --query 'KeyMetadata.Description' --output text 2>/dev/null || echo "N/A")
  creation_date=$(aws kms describe-key --key-id $key_id --region $REGION --query 'KeyMetadata.CreationDate' --output text 2>/dev/null || echo "N/A")

  echo "Key: $key_id | Description: $key_desc | Rotation: $rotation_status | Created: $creation_date"

  if [ "$rotation_status" = "False" ]; then
    echo "WARNING: Key $key_id does not have automatic rotation enabled"
  fi
done
```

## Key Compromise Response Runbook

```text
=== Key Compromise Response ===

1. CONTAIN (immediate, 0-15 min)
   - Disable the compromised key in KMS/HSM
   - Revoke all access policies for the key
   - Identify all data encrypted with the compromised key

2. ASSESS (15-60 min)
   - Determine scope: which services, databases, backups affected
   - Check access logs for unauthorized key usage
   - Notify security team and key custodian

3. REPLACE (1-4 hours)
   - Create new key with same policy
   - Re-encrypt all affected data with new key
   - Update application configurations to use new key ARN/ID
   - Deploy updated configurations

4. DESTROY (after verification)
   - Schedule deletion of compromised key
   - Verify all data uses new key
   - Document incident and update key inventory

5. POST-INCIDENT (within 1 week)
   - Review root cause of compromise
   - Update access policies and monitoring
   - Conduct full key inventory audit
   - Update key lifecycle documentation
```


## Variants

- **Cloud KMS key lifecycle**: Uses AWS KMS, Azure Key Vault, or Google Cloud KMS with automatic rotation and IAM policies.
- **HSM-backed key lifecycle**: Adds physical or cloud HSM protection for high-assurance keys.
- **Application-level key lifecycle**: Focuses on keys generated and managed within a single application or service.
- **Database encryption key lifecycle**: Covers transparent data encryption (TDE) and column-level keys.
- **Backup encryption key lifecycle**: Ensures long-term keys can be recovered for archive retention while remaining secure.

## What Works

- Use a centralized KMS or HSM instead of storing keys in application code.
- Separate key encryption keys from data encryption keys.
- Rotate keys automatically when the service supports it.
- Log every key usage and administrative action.
- Limit key export to non-extractable keys unless required.
- Test rotation and destruction procedures before an incident.
- Maintain an inventory of all keys, owners, and rotation dates.
- Require multi-person approval for high-impact actions like destruction.

## Common Mistakes

- Hardcoding keys in source code or configuration files.
- Never rotating keys despite compliance requirements.
- Sharing keys across multiple applications or environments.
- Allowing key export without approval or audit.
- Not backing up key metadata or KEKs before destruction.
- Ignoring compromised key response procedures.
- Storing old keys indefinitely after rotation.

## FAQs

### What is the difference between a DEK and a KEK?

A data encryption key (DEK) encrypts the actual data. A key encryption key (KEK) encrypts the DEK, allowing the DEK to be stored safely while the KEK remains in a secure KMS or HSM.

### Should we rotate keys even if there is no compromise?

Yes. Scheduled rotation limits the exposure window if a key is compromised without detection and satisfies many compliance requirements.

### How do we rotate a key that protects a large database?

Use a two-key rotation: add the new key, re-encrypt data gradually or lazily, then retire the old key when all data is protected by the new key.


### What is envelope encryption and why should we use it?

Envelope encryption uses a KEK (Key Encryption Key) to encrypt DEKs (Data Encryption Keys). The DEK encrypts the actual data, and the KEK encrypts the DEK. This allows the DEK to be stored alongside the encrypted data while the KEK stays in a secure KMS. Benefits: the KMS only sees the DEK (not the data), reducing latency; the KEK can be rotated without re-encrypting all data; and access control is centralized at the KEK level.

### How do we manage keys across multiple cloud providers?

Use a cloud-agnostic KMS like HashiCorp Vault Transit engine, or maintain separate KMS per cloud with a centralized key inventory. For multi-cloud workloads, consider AWS KMS Multi-Region keys or a portable key format. Document which keys protect which data in each cloud. Never copy key material between providers unless using a BYOK (Bring Your Own Key) process with HSM-backed keys.

### What is BYOK and when should we use it?

BYOK (Bring Your Own Key) allows you to generate and own the key material in your own HSM, then import it into a cloud KMS. Use it when compliance requires key material to remain under your control, or when you need the same key across multiple cloud providers. Ensure the import process uses a secure wrapping key and that the cloud KMS supports key deletion with verification.

### How do we audit key usage?

Enable KMS access logging (AWS CloudTrail KMS events, Azure Key Vault diagnostics, GCP Cloud Audit Logs for KMS). Log every Encrypt, Decrypt, GenerateDataKey, and administrative action. Send logs to a SIEM for real-time alerting on unusual patterns (e.g., decrypt from a new IP, key deletion without approval). Review key usage reports monthly and compare against expected application patterns.

### What is crypto-shredding?

Crypto-shredding is the process of destroying encrypted data by destroying the encryption key. When the key is deleted, the data becomes permanently unrecoverable. This is useful for compliance with data deletion requests (GDPR right to erasure). Use per-tenant or per-customer keys so that deleting a single key destroys only that customer's data. Document the key-to-data mapping and the destruction process.


### How do we handle key rotation for TLS certificates?

TLS key rotation is handled by your certificate management system. For ACM, rotation is automatic. For self-managed certificates, generate a new key pair, create a CSR, obtain the new certificate, deploy it alongside the old one, then remove the old one after verification. Use a dual-certificate deployment during transition to avoid downtime. Automate this process with cert-manager in Kubernetes or Certbot for traditional servers.

### What is a key custodian and what are their responsibilities?

A key custodian is a designated person responsible for the lifecycle management of encryption keys. Their duties include: approving key creation and rotation, monitoring key usage logs, coordinating key destruction with compliance, maintaining the key inventory, and responding to key compromise incidents. The custodian should not be the same person who uses the keys in applications (separation of duties).

### What is HSM and when do we need it?

An HSM (Hardware Security Module) is a physical device that generates, stores, and manages cryptographic keys in tamper-resistant hardware. Use HSMs when compliance requires FIPS 140-2 Level 3 or higher (PCI DSS, government, healthcare), when keys must never leave hardware-protected memory, or for high-throughput cryptographic operations. Cloud HSM options: AWS CloudHSM, Azure Dedicated HSM, Google Cloud HSM.

Document the HSM failover procedure and test it quarterly. HSM availability is critical for any service that depends on keys stored in the HSM.

Test key recovery procedures annually. A key that cannot be recovered when needed can cause data loss as severe as a security breach.


End of document. Review and update quarterly.