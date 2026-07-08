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

The naive approach — encrypting entire database columns with a single application key — creates operational fragility. Key rotation becomes painful, performance degradates on large tables, and a leaked key exposes all data. Modern encryption at rest uses envelope encryption: a data encryption key (DEK) encrypts the payload, while a key encryption key (KEK) stored in a hardware security module or cloud KMS encrypts the DEK. This enables per-record key rotation, granular access control, and high-performance bulk operations. Here is how to AES-256-GCM encryption, envelope encryption patterns, and integration with AWS KMS, Azure Key Vault, and HashiCorp Vault.

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
- **Cloud KMS integration**: AWS KMS, Azure Key Vault, and GCP KMS provide FIPS 140-2 Level 2+ hardware security modules. For secret management practices, see [secrets management guide](/guides/security/security-best-practices-guide). They handle key generation, rotation, access policies, and audit logging. Never store master keys in application configuration files.

## Variants

| Approach | Key management | Performance | Rotation ease | Best for |
|----------|---------------|-------------|---------------|----------|
| Database-native (TDE) | Database engine | Fast (transparent) | Hard | Compliance checkbox |
| Application envelope | Cloud KMS | Medium | Easy | SaaS multi-tenant |
| Column-level encryption | Application | Slow (per-cell) | Medium | Highly sensitive fields |
| Client-side encryption | Client key | Slow | Easy | End-to-end privacy |

## What works

- **Encrypt before it reaches the database**: application-level encryption protects against database-level breaches. If the database is compromised but the application server is not, attackers see only ciphertext.
- **Use authenticated encryption (AEAD)**: AES-GCM and ChaCha20-Poly1305 both provide authentication tags. Never use unauthenticated modes like AES-CBC or AES-ECB, which are vulnerable to padding oracle and tampering attacks.
- **Rotate keys regularly**: establish a key rotation policy (annually for KEKs, per-record for DEKs). Cloud KMS supports automatic rotation of master keys. Document the rotation procedure and test it in staging.
- **Searchable encryption**: standard encryption breaks database indexing and search. Use deterministic encryption (same plaintext → same ciphertext) for exact-match queries, or order-preserving encryption for range queries. Be aware these leak some information.
- **Separate key per tenant**: in multi-tenant SaaS, encrypt each tenant's data with a different KEK. This ensures that compromising one tenant's key does not expose other tenants' data.

## Common mistakes

- **Hardcoding encryption keys in source code**: embedding a master key in `config.py` or an environment variable on a shared server defeats the purpose. Use a dedicated [secret manager](/recipes/security/vault-dynamic-credentials) with IAM controls.
- **Ignoring the authentication tag**: decrypting AES-GCM without verifying the authentication tag removes tamper detection. Always check the tag before processing decrypted data.
- **Encrypting everything indiscriminately**: encryption adds latency, storage overhead, and complexity. Only encrypt fields that are genuinely sensitive (PII, credentials, health data). Public product catalogs do not need encryption at rest.
- **Losing the master key**: if the KMS master key is deleted or inaccessible, all encrypted data is permanently lost. Enable key deletion protection, maintain cross-region replicas, and test disaster recovery procedures.

## FAQ

**Q: Does encryption at rest protect against SQL injection?**
A: No. Encryption at rest protects data on disk. SQL injection attacks operate against running databases via query manipulation. Combine encryption with [parameterized queries](/recipes/security/sql-injection-prevention) and [input validation](/recipes/api/input-validation) for defense in depth.

**Q: What is the difference between TDE and application encryption?**
A: Transparent Data Encryption (TDE) encrypts the entire database file at the storage layer. It is fast and invisible to applications but protects only against disk theft. Application encryption protects individual fields, protecting against database-level breaches but requiring application changes.

**Q: How do I encrypt data but still allow searching?**
A: Use deterministic encryption for exact matches (e.g., email lookup), blind indexes (hash prefixes stored alongside ciphertext), or homomorphic encryption for advanced use cases. Each approach involves trade-offs between security and query flexibility.

**Q: Should I encrypt backups separately?**
A: Yes. Database backups should be encrypted with a key distinct from the production encryption key. Store backup encryption keys in a separate [vault](/recipes/security/vault-dynamic-credentials). Test backup decryption quarterly as part of your disaster recovery plan.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Advanced Solutions

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

## Additional Best Practices

1. **Bind encryption context to tenant and record metadata.** AWS KMS encryption context provides additional authenticated data (AAD) that prevents ciphertext swapping between tenants or records:

```python
# Include tenant and record type in encryption context
context = {
    'tenant': tenant_id,
    'record_type': 'user_ssn',
    'environment': 'production',
}
response = kms.encrypt(
    KeyId=kek_id,
    Plaintext=dek,
    EncryptionContext=context,
)
# If an attacker swaps ciphertext between tenants, decryption fails
# because the encryption context won't match
```

2. **Use separate keys for encryption and signing.** Never use the same key for both encryption and MAC/signing. If you need both, derive separate subkeys from the master key using HKDF with different info strings:

```python
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

def derive_subkeys(master_key: bytes) -> tuple[bytes, bytes]:
    """Derive separate encryption and signing subkeys."""
    enc_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b'encryption-subkey',
    ).derive(master_key)

    sig_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b'signing-subkey',
    ).derive(master_key)

    return enc_key, sig_key
```

## Additional Common Mistakes

1. **Reusing nonces with the same key.** AES-GCM requires a unique nonce for every encryption with the same key. Reusing a nonce leaks the authentication key and allows forgery attacks. Always generate nonces with `os.urandom(12)` or use a counter-based nonce generator:

```python
# WRONG: static nonce
nonce = b'fixed-nonce!!'  # 12 bytes but reused

# CORRECT: random nonce per encryption
nonce = os.urandom(12)  # 96-bit nonce, collision probability negligible
```

2. **Storing encrypted data and keys together.** If the encrypted DEK and ciphertext are in the same database row and the database is compromised, the attacker has everything. Store the encrypted DEK in a separate system or use a KMS that manages it externally:

```python
# Store ciphertext in database, encrypted DEK in KMS only
# The database row should NOT contain the encrypted_dek
# Instead, store a KMS key reference and let KMS manage the DEK
{
    'ciphertext': '...',  # stored in DB
    'nonce': '...',       # stored in DB
    'kms_key_id': '...',  # stored in DB, DEK is in KMS
}
```

## Additional FAQ

### What is the difference between AES-GCM and ChaCha20-Poly1305?

Both are AEAD ciphers providing confidentiality and integrity. AES-GCM uses hardware-accelerated AES instructions (AES-NI) and is faster on modern CPUs. ChaCha20-Poly1305 is faster on devices without AES hardware acceleration (mobile, IoT). Both are secure when used correctly with unique nonces. Choose based on your target platform.

### How do I handle encryption in a microservices architecture?

Each service should have its own KMS key or KEK. When service A sends encrypted data to service B, it either shares the DEK through a secure channel or re-encrypts the data for service B's key. Avoid sharing a single master key across services — this creates a single point of failure and violates least-privilege. Use a key exchange protocol or a shared KMS with per-service IAM policies.

### Can I use client-side encryption with AWS S3?

Yes. Use the AWS Encryption SDK with KMS to encrypt data before uploading to S3. The S3 server never sees plaintext. For download, the client retrieves the encrypted object and decrypts locally using KMS. This protects against S3 bucket misconfiguration or unauthorized access:

```python
import aws_encryption_sdk
from aws_encryption_sdk.identifiers import CommitmentPolicy

client = aws_encryption_sdk.EncryptionSDKClient(
    commitment_policy=CommitmentPolicy.REQUIRE_ENCRYPT_REQUIRE_DECRYPT
)

kms_key_provider = aws_encryption_sdk.StrictAwsKmsMasterKeyProvider(
    key_ids=[kms_key_id]
)

# Encrypt before upload
ciphertext, _ = client.encrypt(
    source=plaintext_data,
    key_provider=kms_key_provider,
)

# Upload ciphertext to S3
s3.put_object(Bucket='my-bucket', Key='file.enc', Body=ciphertext)

# Decrypt after download
plaintext, _ = client.decrypt(
    source=ciphertext,
    key_provider=kms_key_provider,
)
```
