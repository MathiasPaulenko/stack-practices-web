---
contentType: recipes
slug: encryption-at-rest
title: "Implement Encryption at Rest for Databases and File Storage"
description: "How to encrypt sensitive data before storing it in databases, object storage, and backups using AES-256-GCM, envelope encryption, and key management services."
metaDescription: "Learn encryption at rest for databases and storage. Encrypt sensitive data using AES-256-GCM, envelope encryption, and key management services before storing."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - compliance
  - database-encryption
relatedResources:
  - /recipes/secret-management
  - /recipes/api-security-headers
  - /recipes/password-hashing
  - /recipes/csrf-protection
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn encryption at rest for databases and storage. Encrypt sensitive data using AES-256-GCM, envelope encryption, and key management services before storing."
  keywords:
    - encryption at rest
    - aes 256 encryption
    - database encryption
    - kms key management
    - envelope encryption
---

## Overview

Encryption at rest protects data when it is stored on disk, in backups, or in object storage. Even if an attacker gains physical access to a hard drive, steals a database backup, or compromises a cloud storage bucket, encrypted data remains unreadable without the corresponding decryption key. This is a fundamental requirement for compliance frameworks like GDPR, HIPAA, PCI-DSS, and SOC 2.

The naive approach — encrypting entire database columns with a single application key — creates operational fragility. Key rotation becomes painful, performance degradates on large tables, and a leaked key exposes all data. Modern encryption at rest uses envelope encryption: a data encryption key (DEK) encrypts the payload, while a key encryption key (KEK) stored in a hardware security module or cloud KMS encrypts the DEK. This enables per-record key rotation, granular access control, and high-performance bulk operations. This recipe covers AES-256-GCM encryption, envelope encryption patterns, and integration with AWS KMS, Azure Key Vault, and HashiCorp Vault.

## When to use it

Use this recipe when:

- Storing personally identifiable information (PII), health records, or financial data
- Building multi-tenant SaaS applications where each tenant requires isolated encryption
- Complying with GDPR Article 32, HIPAA Security Rule, or PCI-DSS requirement 3.4
- Encrypting database backups before transferring them to cold storage
- Protecting API keys, credentials, and configuration files in object storage

## Solution

### Envelope Encryption with AWS KMS (Python / Boto3)

```python
import boto3
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import base64
import os

kms = boto3.client('kms')

def encrypt_field(plaintext: str, kms_key_id: str) -> dict:
    # Generate a unique data encryption key (DEK) for this record
    dek = AESGCM.generate_key(bit_length=256)
    aesgcm = AESGCM(dek)

    # Encrypt the payload with the DEK
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)

    # Encrypt the DEK with KMS master key (KEK)
    dek_response = kms.encrypt(
        KeyId=kms_key_id,
        Plaintext=dek
    )
    encrypted_dek = base64.b64encode(dek_response['CiphertextBlob']).decode()

    return {
        "ciphertext": base64.b64encode(ciphertext).decode(),
        "nonce": base64.b64encode(nonce).decode(),
        "encrypted_dek": encrypted_dek,
        "algorithm": "AES256-GCM",
    }

def decrypt_field(encrypted_package: dict, kms_key_id: str) -> str:
    # Decrypt the DEK using KMS
    encrypted_dek = base64.b64decode(encrypted_package['encrypted_dek'])
    dek_response = kms.decrypt(CiphertextBlob=encrypted_dek)
    dek = dek_response['Plaintext']

    # Decrypt the payload using the DEK
    aesgcm = AESGCM(dek)
    ciphertext = base64.b64decode(encrypted_package['ciphertext'])
    nonce = base64.b64decode(encrypted_package['nonce'])

    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return plaintext.decode()
```

### Database-Level Encryption (PostgreSQL pgcrypto)

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt before insert
INSERT INTO users (email, ssn)
VALUES (
    'user@example.com',
    pgp_sym_encrypt('123-45-6789', current_setting('app.encryption_key'))
);

-- Decrypt on select
SELECT email,
       pgp_sym_decrypt(ssn, current_setting('app.encryption_key')) as ssn
FROM users
WHERE id = 1;
```

### Application-Level Encryption with Key Derivation (Node.js)

```javascript
const crypto = require('crypto');

class FieldEncryption {
  constructor(masterKey) {
    this.masterKey = Buffer.from(masterKey, 'hex');
  }

  deriveKey(recordId) {
    // Derive a unique DEK per record using HKDF
    return crypto.hkdfSync('sha256', this.masterKey, Buffer.from(recordId), 'field-encryption', 32);
  }

  encrypt(plaintext, recordId) {
    const key = this.deriveKey(recordId);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  decrypt(encrypted, recordId) {
    const key = this.deriveKey(recordId);
    const iv = Buffer.from(encrypted.iv, 'base64');
    const authTag = Buffer.from(encrypted.authTag, 'base64');
    const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }
}
```

## Explanation

- **Envelope encryption**: each record is encrypted with a unique data encryption key (DEK). The DEK itself is encrypted by a key encryption key (KEK) managed in a KMS. This means you can rotate the KEK without re-encrypting all data, and you can revoke access to a single record by deleting its DEK.
- **AES-256-GCM**: the industry standard for authenticated encryption. GCM mode provides confidentiality (encryption) and integrity (authentication tag) in a single operation. Always verify the authentication tag before decrypting to detect tampering.
- **Key derivation**: instead of storing DEKs separately, derive them deterministically from a master key and record ID using HKDF. This eliminates DEK storage but makes key rotation more complex — changing the master key requires re-encrypting all records.
- **Cloud KMS integration**: AWS KMS, Azure Key Vault, and GCP KMS provide FIPS 140-2 Level 2+ hardware security modules. They handle key generation, rotation, access policies, and audit logging. Never store master keys in application configuration files.

## Variants

| Approach | Key management | Performance | Rotation ease | Best for |
|----------|---------------|-------------|---------------|----------|
| Database-native (TDE) | Database engine | Fast (transparent) | Hard | Compliance checkbox |
| Application envelope | Cloud KMS | Medium | Easy | SaaS multi-tenant |
| Column-level encryption | Application | Slow (per-cell) | Medium | Highly sensitive fields |
| Client-side encryption | Client key | Slow | Easy | End-to-end privacy |

## Best practices

- **Encrypt before it reaches the database**: application-level encryption protects against database-level breaches. If the database is compromised but the application server is not, attackers see only ciphertext.
- **Use authenticated encryption (AEAD)**: AES-GCM and ChaCha20-Poly1305 both provide authentication tags. Never use unauthenticated modes like AES-CBC or AES-ECB, which are vulnerable to padding oracle and tampering attacks.
- **Rotate keys regularly**: establish a key rotation policy (annually for KEKs, per-record for DEKs). Cloud KMS supports automatic rotation of master keys. Document the rotation procedure and test it in staging.
- **Searchable encryption**: standard encryption breaks database indexing and search. Use deterministic encryption (same plaintext → same ciphertext) for exact-match queries, or order-preserving encryption for range queries. Be aware these leak some information.
- **Separate key per tenant**: in multi-tenant SaaS, encrypt each tenant's data with a different KEK. This ensures that compromising one tenant's key does not expose other tenants' data.

## Common mistakes

- **Hardcoding encryption keys in source code**: embedding a master key in `config.py` or an environment variable on a shared server defeats the purpose. Use a dedicated secret manager with IAM controls.
- **Ignoring the authentication tag**: decrypting AES-GCM without verifying the authentication tag removes tamper detection. Always check the tag before processing decrypted data.
- **Encrypting everything indiscriminately**: encryption adds latency, storage overhead, and complexity. Only encrypt fields that are genuinely sensitive (PII, credentials, health data). Public product catalogs do not need encryption at rest.
- **Losing the master key**: if the KMS master key is deleted or inaccessible, all encrypted data is permanently lost. Enable key deletion protection, maintain cross-region replicas, and test disaster recovery procedures.

## FAQ

**Q: Does encryption at rest protect against SQL injection?**
A: No. Encryption at rest protects data on disk. SQL injection attacks operate against running databases via query manipulation. Combine encryption with parameterized queries and input validation for defense in depth.

**Q: What is the difference between TDE and application encryption?**
A: Transparent Data Encryption (TDE) encrypts the entire database file at the storage layer. It is fast and invisible to applications but protects only against disk theft. Application encryption protects individual fields, protecting against database-level breaches but requiring application changes.

**Q: How do I encrypt data but still allow searching?**
A: Use deterministic encryption for exact matches (e.g., email lookup), blind indexes (hash prefixes stored alongside ciphertext), or homomorphic encryption for advanced use cases. Each approach involves trade-offs between security and query flexibility.

**Q: Should I encrypt backups separately?**
A: Yes. Database backups should be encrypted with a key distinct from the production encryption key. Store backup encryption keys in a separate vault. Test backup decryption quarterly as part of your disaster recovery plan.

