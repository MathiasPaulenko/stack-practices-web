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
  - vulnerabilities
  - encryption
  - owasp
relatedResources:
  - /recipes/secret-management
  - /recipes/api-security-headers
  - /recipes/password-hashing
  - /recipes/csrf-protection
  - /recipes/data-privacy-gdpr
  - /recipes/request-signing-hmac
lastUpdated: "2026-08-22"
publishedAt: "2026-06-14"
author: Mathias Paulenko
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

Encryption at rest is what keeps data safe when it's sitting on disk, in a backup, or in object storage.
Without it, a lost laptop, a misconfigured S3 bucket, or a stolen backup can turn into a full data breach. If
someone walks off with a drive, a backup tape, or a cloud bucket, the data is still just noise to them without
the right decryption key. That's why frameworks like GDPR, HIPAA, PCI-DSS, and SOC 2 all expect it.

The naive way is to encrypt whole database columns with a single application key. That quickly becomes
painful: key rotation is slow, big tables slow down, and one leaked key exposes everything. The better
approach is envelope encryption. A data encryption key (DEK) encrypts the actual payload, and a key
encryption key (KEK) — held in a hardware security module or cloud KMS — encrypts the DEK. Splitting the
keys like that means you can rotate keys per record, control access more finely, and run bulk operations
without killing performance. This recipe walks through AES-256-GCM, envelope patterns, and how to integrate
with AWS
KMS, Azure Key Vault, and HashiCorp Vault.

## When to Use

Reach for this recipe when your data includes personally identifiable information (PII), health records, or
financial information. It also fits multi-tenant SaaS applications where each tenant needs its own
encryption, and any time you're working to comply with GDPR Article 32, the HIPAA Security Rule, or PCI-DSS
requirement 3.4. Encrypting database backups before moving them to cold storage, and protecting API keys,
credentials, and configuration files in object storage, are other common cases.

## When NOT to Use

Don't add encryption at rest to data that's already public or non-sensitive, such as product
catalogs, marketing assets, or anonymous analytics. The added latency, key management, and operational
overhead isn't worth it for information that carries no risk if exposed.

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

Here's the trick with envelope encryption: each record gets its own data encryption key (DEK), and that DEK
is wrapped by a key encryption key (KEK) stored in a KMS. Because the two keys are separate, you can rotate
the KEK without re-encrypting the whole dataset, and you can revoke access to a single record by removing
its DEK.

When it comes to the algorithm, go with AES-256-GCM. You get both confidentiality and integrity in one
operation through an authentication tag, so always verify that tag before decrypting. Otherwise you lose tamper
detection.

Key derivation is another way to handle DEKs. Using HKDF, you can derive a DEK deterministically from a
master key and a record ID. That removes the need to store each DEK, but it makes rotation harder: changing
the master key means re-encrypting every record.

Cloud KMS integration — whether AWS KMS, Azure Key Vault, or GCP KMS — gives you FIPS 140-2 Level 2+
hardware security modules and takes care of key generation, rotation, access policies, and audit logging.
Never store master keys in application configuration files.

## Variants

| Approach | Key management | Performance | Rotation ease | Best for |
| --- | --- | --- | --- | --- |
| Database-native (TDE) | Database engine | Fast (transparent) | Hard | Compliance checkbox |
| Application envelope | Cloud KMS | Medium | Easy | SaaS multi-tenant |
| Column-level encryption | Application | Slow (per-cell) | Medium | Highly sensitive fields |
| Client-side encryption | Client key | Slow | Easy | End-to-end privacy |

## Best Practices

Keep encryption in the application layer when the data really matters. If the database is breached but the
application server isn't, attackers only see ciphertext. For the algorithm, stick with authenticated
encryption (AEAD) such as AES-GCM or ChaCha20-Poly1305, and skip unauthenticated modes like AES-CBC or
AES-ECB, which are open to padding oracle and tampering attacks.

Rotate keys on a schedule. Plan on rotating KEKs at least once a year and DEKs per record when needed. Cloud
KMS can automate master-key rotation, but you should still document and test the procedure in staging.

Think about search before you encrypt, because standard encryption breaks indexing. Use deterministic
encryption for exact-match queries, blind indexes, or order-preserving encryption for ranges. Each of these
leaks a little information, so pick the one that matches your threat model. In multi-tenant SaaS, give each
tenant its own KEK so a compromised key only exposes one tenant's data.

## Common Mistakes

Hardcoding encryption keys in source code is the obvious one. Embedding a master key in `config.py` or in an
environment variable on a shared server defeats the purpose, so use a dedicated [secret manager](/recipes/vault-dynamic-credentials/)
with IAM controls instead. Never ignore the authentication tag — decrypting AES-GCM without checking it
removes tamper detection. Don’t encrypt every field just because you can. Encryption adds latency, storage
overhead, and complexity, so only encrypt genuinely sensitive fields like PII, credentials, and health data.
Public product catalogs
don’t need to be encrypted at rest.

Finally, don’t lose the master key. If the KMS master key gets deleted or becomes inaccessible, your encrypted
data is gone for good. Enable key deletion protection, keep cross-region replicas, and test disaster recovery
procedures.

## FAQ

### Does encryption at rest protect against SQL injection?

No. Encryption at rest only protects data on disk. SQL injection attacks hit running databases through
query manipulation, so you still need [parameterized queries](/recipes/sql-injection-prevention/) and
[input validation](/recipes/input-validation/) if you want defense in depth.

### What's the difference between TDE and application encryption?

Transparent Data Encryption (TDE) encrypts the whole database file at the storage layer. It's fast and
invisible to the application, but it only protects against disk theft. Application encryption protects
individual fields, which helps against database-level breaches, though you've got to change the application
to make it work.

### How do I encrypt data but still allow searching?

Use deterministic encryption for exact matches, blind indexes based on hash prefixes, or homomorphic
encryption for advanced cases. Each of these trades some security for query flexibility, so choose based on
what you're actually trying to protect.

### Should I encrypt backups separately?

Yes. Back up with a key that's different from the production encryption key, and keep that backup key in a
separate [vault](/recipes/vault-dynamic-credentials/). Test backup decryption at least quarterly as part of
your disaster recovery plan.

### Are the examples production-ready?

They're tested starting points. Tighten up error handling, add logging that makes sense for you, and adjust the
configuration to your own environment before deploying.

### What about performance?

Performance depends on how much data you're encrypting and what's underneath. The examples here are written
for clarity, not to squeeze every last millisecond. In high-throughput systems, you'll probably want caching,
batching, and connection pooling.

### How do I debug issues?

Begin with the smallest working example and add logging at each step. Test with small inputs, then scale up,
and use your language's debugger to walk through edge cases.

## Advanced Variants

### Multi-tenant envelope encryption (Python)

Each tenant gets its own KMS key, ensuring cryptographic isolation between tenants:

```python
import boto3
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
import base64
import os
from typing import Optional

class MultiTenantEncryption:
    """Per-tenant envelope encryption with KMS-managed KEKs."""

    def __init__(self, region: str = 'us-east-1'):
        self.kms = boto3.client('kms', region_name=region)
        self._dek_cache: dict[str, tuple[bytes, bytes]] = {}

    def _get_tenant_kek_id(self, tenant_id: str) -> str:
        """Map tenant ID to its KMS key ARN."""
        return f'arn:aws:kms:us-east-1:123456789012:key/tenant-{tenant_id}'

    def encrypt(
        self,
        tenant_id: str,
        plaintext: str,
        context: Optional[dict] = None,
    ) -> dict:
        """Encrypt data for a specific tenant."""
        kek_id = self._get_tenant_kek_id(tenant_id)

        # Generate DEK locally
        dek = AESGCM.generate_key(bit_length=256)
        aesgcm = AESGCM(dek)
        nonce = os.urandom(12)

        # Optional associated data for additional context binding
        aad = tenant_id.encode() if context is None else str(context).encode()

        ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), aad)

        # Encrypt DEK with tenant-specific KEK
        dek_response = self.kms.encrypt(
            KeyId=kek_id,
            Plaintext=dek,
            EncryptionContext={'tenant': tenant_id},
        )

        return {
            'ciphertext': base64.b64encode(ciphertext).decode(),
            'nonce': base64.b64encode(nonce).decode(),
            'encrypted_dek': base64.b64encode(dek_response['CiphertextBlob']).decode(),
            'tenant_id': tenant_id,
            'algorithm': 'AES256-GCM',
        }

    def decrypt(self, encrypted_package: dict) -> str:
        """Decrypt data using the tenant's KMS key."""
        encrypted_dek = base64.b64decode(encrypted_package['encrypted_dek'])
        tenant_id = encrypted_package['tenant_id']

        # KMS automatically selects the correct key based on CiphertextBlob
        dek_response = self.kms.decrypt(
            CiphertextBlob=encrypted_dek,
            EncryptionContext={'tenant': tenant_id},
        )
        dek = dek_response['Plaintext']

        aesgcm = AESGCM(dek)
        ciphertext = base64.b64decode(encrypted_package['ciphertext'])
        nonce = base64.b64decode(encrypted_package['nonce'])
        aad = tenant_id.encode()

        plaintext = aesgcm.decrypt(nonce, ciphertext, aad)
        return plaintext.decode()

# Usage
enc = MultiTenantEncryption()
encrypted = enc.encrypt('tenant-001', 'sensitive-data')
# Only tenant-001's KMS key can decrypt this payload
decrypted = enc.decrypt(encrypted)
```

### Go AES-256-GCM with context binding

```go
package main

import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "encoding/base64"
    "fmt"
    "io"
)

type EncryptedData struct {
    Ciphertext string `json:"ciphertext"`
    Nonce      string `json:"nonce"`
}

func encryptAESGCM(key []byte, plaintext, aad []byte) (*EncryptedData, error) {
    block, err := aes.NewCipher(key)
    if err != nil {
        return nil, fmt.Errorf("create cipher: %w", err)
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, fmt.Errorf("create GCM: %w", err)
    }

    nonce := make([]byte, gcm.NonceSize())
    if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
        return nil, fmt.Errorf("generate nonce: %w", err)
    }

    ciphertext := gcm.Seal(nil, nonce, plaintext, aad)

    return &EncryptedData{
        Ciphertext: base64.StdEncoding.EncodeToString(ciphertext),
        Nonce:      base64.StdEncoding.EncodeToString(nonce),
    }, nil
}

func decryptAESGCM(key []byte, data *EncryptedData, aad []byte) ([]byte, error) {
    ciphertext, err := base64.StdEncoding.DecodeString(data.Ciphertext)
    if err != nil {
        return nil, fmt.Errorf("decode ciphertext: %w", err)
    }

    nonce, err := base64.StdEncoding.DecodeString(data.Nonce)
    if err != nil {
        return nil, fmt.Errorf("decode nonce: %w", err)
    }

    block, err := aes.NewCipher(key)
    if err != nil {
        return nil, fmt.Errorf("create cipher: %w", err)
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, fmt.Errorf("create GCM: %w", err)
    }

    plaintext, err := gcm.Open(nil, nonce, ciphertext, aad)
    if err != nil {
        return nil, fmt.Errorf("decrypt: %w (possible tampering detected)", err)
    }

    return plaintext, nil
}
```

### Searchable encryption with blind index

Encrypt the sensitive value but store a separate HMAC-based blind index for lookups:

```python
import hmac
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os

class SearchableEncryption:
    """Encrypt data while supporting exact-match queries via blind index."""

    def __init__(self, encryption_key: bytes, index_key: bytes):
        self.encryption_key = encryption_key
        self.index_key = index_key

    def _blind_index(self, value: str) -> str:
        """Generate a deterministic blind index for exact-match search."""
        return hmac.new(
            self.index_key, value.encode(), hashlib.sha256
        ).hexdigest()

    def encrypt(self, plaintext: str) -> dict:
        aesgcm = AESGCM(self.encryption_key)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)

        return {
            'ciphertext': ciphertext.hex(),
            'nonce': nonce.hex(),
            'blind_index': self._blind_index(plaintext),
        }

    def decrypt(self, encrypted: dict) -> str:
        aesgcm = AESGCM(self.encryption_key)
        nonce = bytes.fromhex(encrypted['nonce'])
        ciphertext = bytes.fromhex(encrypted['ciphertext'])
        return aesgcm.decrypt(nonce, ciphertext, None).decode()

# Usage: store blind_index in a separate indexed column
# Query: WHERE blind_index = generate_blind_index('user@example.com')
# This enables lookups without decrypting every row
```

```sql
-- Schema for searchable encryption
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email_encrypted TEXT NOT NULL,      -- AES-256-GCM ciphertext
    email_nonce TEXT NOT NULL,          -- Nonce for decryption
    email_blind_index VARCHAR(64) NOT NULL  -- HMAC for exact-match queries
);

-- Create index on blind index for fast lookups
CREATE INDEX idx_users_email_blind ON users(email_blind_index);

-- Query by email without decrypting all rows
SELECT * FROM users
WHERE email_blind_index = 'a1b2c3d4e5f6...';
```

### Key rotation with re-encryption (Python)

Rotate the master key and re-encrypt data in batches without downtime:

```python
import boto3
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import base64
import os
from typing import Callable

class KeyRotation:
    """Rotate KMS master keys with zero-downtime re-encryption."""

    def __init__(self, old_key_id: str, new_key_id: str):
        self.kms = boto3.client('kms')
        self.old_key_id = old_key_id
        self.new_key_id = new_key_id

    def re_encrypt_record(self, encrypted_package: dict) -> dict:
        """Re-encrypt a single record's DEK with the new KEK."""
        encrypted_dek = base64.b64decode(encrypted_package['encrypted_dek'])

        # Decrypt DEK with old key, re-encrypt with new key
        response = self.kms.re_encrypt(
            CiphertextBlob=encrypted_dek,
            DestinationKeyId=self.new_key_id,
        )

        encrypted_package['encrypted_dek'] = base64.b64encode(
            response['CiphertextBlob']
        ).decode()
        return encrypted_package

    def batch_re_encrypt(
        self,
        fetch_fn: Callable[[int], list[dict]],
        save_fn: Callable[[dict], None],
        batch_size: int = 100,
    ):
        """Re-encrypt all records in batches."""
        offset = 0
        while True:
            records = fetch_fn(batch_size)
            if not records:
                break

            for record in records:
                re_encrypted = self.re_encrypt_record(record)
                save_fn(re_encrypted)

            offset += len(records)
            print(f'Re-encrypted {offset} records')

# Usage: run as a background job
rotation = KeyRotation(
    old_key_id='arn:aws:kms:us-east-1:123:key/old-key',
    new_key_id='arn:aws:kms:us-east-1:123:key/new-key',
)
# rotation.batch_re_encrypt(fetch_records, update_record, batch_size=500)
```
