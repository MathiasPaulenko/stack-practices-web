---
contentType: guides
slug: complete-guide-encryption-at-rest
title: "Encryption at Rest: AES-256, KMS, Envelope Encryption"
description: "Master encryption at rest: AES-256-GCM, key management services, envelope encryption, key rotation, database encryption, field-level encryption, and production security patterns."
metaDescription: "Master encryption at rest: AES-256-GCM, KMS, envelope encryption, key rotation, database encryption, field-level encryption, and production security patterns."
difficulty: advanced
topics:
  - security
tags:
  - guide
  - encryption
  - aes-256
  - kms
  - envelope-encryption
  - key-rotation
  - security
  - cryptography
relatedResources:
  - /guides/security/complete-guide-oauth2-oidc-production
  - /guides/security/complete-guide-content-security-policy
  - /recipes/security/encryption-at-rest
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 22
seo:
  metaDescription: "Master encryption at rest: AES-256-GCM, KMS, envelope encryption, key rotation, database encryption, field-level encryption, and production security patterns."
  keywords:
    - encryption at rest
    - aes-256-gcm
    - key management service
    - envelope encryption
    - key rotation
    - field-level encryption
    - database encryption
---

## Introduction

Encryption at rest protects stored data from unauthorized access. If an attacker gains access to the storage layer (disk, backup, snapshot), encrypted data is unreadable without the key. Here is a hands-on guide to AES-256-GCM, key management services (KMS), envelope encryption, key rotation, database encryption, field-level encryption, and production patterns.

## Encryption Layers

```
Application Layer
  └── Field-level encryption (encrypt specific columns)
        └── Database-level encryption (transparent database encryption)
              └── Volume-level encryption (encrypted EBS volumes)
                    └── Hardware-level encryption (self-encrypting drives)

Each layer protects against different threat models:
  Field-level: protects against DB admin reading sensitive data
  Database-level: protects against stolen disk/snapshot
  Volume-level: protects against physical disk theft
  Hardware-level: protects against data center access
```

## AES-256-GCM

AES-256-GCM is the standard algorithm for encryption at rest. GCM (Galois/Counter Mode) provides both confidentiality and integrity (authenticated encryption).

```typescript
// crypto/aesGcm.ts — AES-256-GCM encryption and decryption
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV for GCM (recommended)
const TAG_LENGTH = 16; // 128-bit auth tag

export interface EncryptedData {
  ciphertext: string;   // base64
  iv: string;           // base64
  tag: string;          // base64
  keyVersion: number;   // for key rotation
}

export function encrypt(plaintext: string, key: Buffer, keyVersion: number = 1): EncryptedData {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    keyVersion,
  };
}

export function decrypt(data: EncryptedData, key: Buffer): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(data.iv, 'base64'),
  );

  decipher.setAuthTag(Buffer.from(data.tag, 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(data.ciphertext, 'base64')),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}
```

## Key Management Service (KMS)

Never store encryption keys alongside encrypted data. Use a KMS (AWS KMS, Google Cloud KMS, HashiCorp Vault) to manage keys.

```typescript
// kms/KmsClient.ts — Abstract KMS interface
interface KmsClient {
  encrypt(dataKey: Buffer): Promise<{ ciphertext: string; keyVersion: number }>;
  decrypt(ciphertext: string, keyVersion: number): Promise<Buffer>;
  rotateKey(): Promise<void>;
}

// AWS KMS implementation
import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';

class AwsKmsClient implements KmsClient {
  private client = new KMSClient({ region: 'us-east-1' });
  private keyId = process.env.KMS_KEY_ID!;

  async encrypt(dataKey: Buffer): Promise<{ ciphertext: string; keyVersion: number }> {
    const command = new EncryptCommand({
      KeyId: this.keyId,
      Plaintext: dataKey,
    });
    const response = await this.client.send(command);
    return {
      ciphertext: Buffer.from(response.CiphertextBlob!).toString('base64'),
      keyVersion: 1, // KMS tracks version internally
    };
  }

  async decrypt(ciphertext: string, _keyVersion: number): Promise<Buffer> {
    const command = new DecryptCommand({
      CiphertextBlob: Buffer.from(ciphertext, 'base64'),
    });
    const response = await this.client.send(command);
    return Buffer.from(response.Plaintext!);
  }

  async rotateKey(): Promise<void> {
    // AWS KMS auto-rotates keys annually when enabled
    // Manual rotation creates a new key version
  }
}
```

## Envelope Encryption

Envelope encryption uses a data encryption key (DEK) to encrypt data and a key encryption key (KEK) managed by KMS to encrypt the DEK. The encrypted DEK is stored alongside the encrypted data.

```
Data → encrypted with DEK (AES-256-GCM)
DEK  → encrypted with KEK (KMS)
KEK  → managed by KMS (never leaves KMS)

Stored: { ciphertext, iv, tag, encryptedDek, keyVersion }
```

```typescript
// crypto/EnvelopeEncryption.ts — Envelope encryption pattern
class EnvelopeEncryption {
  constructor(private readonly kms: KmsClient) {}

  async encrypt(plaintext: string): Promise<EnvelopeEncryptedData> {
    // 1. Generate a data encryption key (DEK)
    const dek = crypto.randomBytes(32); // 256-bit DEK

    // 2. Encrypt the data with the DEK
    const encrypted = encrypt(plaintext, dek);

    // 3. Encrypt the DEK with the KMS (KEK)
    const encryptedDek = await this.kms.encrypt(dek);

    // 4. Zero out the DEK from memory
    dek.fill(0);

    return {
      ...encrypted,
      encryptedDek: encryptedDek.ciphertext,
      dekKeyVersion: encryptedDek.keyVersion,
    };
  }

  async decrypt(data: EnvelopeEncryptedData): Promise<string> {
    // 1. Decrypt the DEK using KMS
    const dek = await this.kms.decrypt(data.encryptedDek, data.dekKeyVersion);

    // 2. Decrypt the data with the DEK
    const plaintext = decrypt(
      { ciphertext: data.ciphertext, iv: data.iv, tag: data.tag, keyVersion: data.keyVersion },
      dek,
    );

    // 3. Zero out the DEK
    dek.fill(0);

    return plaintext;
  }
}

interface EnvelopeEncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
  keyVersion: number;
  encryptedDek: string;
  dekKeyVersion: number;
}
```

## Database Encryption

### PostgreSQL column-level encryption

```sql
-- Store encrypted data in columns
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    encrypted_ssn BYTEA,        -- encrypted social security number
    encrypted_phone BYTEA,      -- encrypted phone number
    encryption_metadata JSONB   -- { iv, tag, keyVersion, encryptedDek }
);

-- Insert encrypted data
INSERT INTO users (email, encrypted_ssn, encrypted_phone, encryption_metadata)
VALUES (
    'user@example.com',
    '\x' || encode(encrypted_ssn_bytes, 'hex'),
    '\x' || encode(encrypted_phone_bytes, 'hex'),
    '{"iv": "...", "tag": "...", "keyVersion": 1, "encryptedDek": "..."}'::jsonb
);
```

### Application-level field encryption

```typescript
// db/EncryptedField.ts — Transparent field encryption in the ORM layer
class EncryptedField {
  constructor(private readonly envelopeEncryption: EnvelopeEncryption) {}

  async encryptField(value: string): Promise<string> {
    const encrypted = await this.envelopeEncryption.encrypt(value);
    return JSON.stringify(encrypted);
  }

  async decryptField(storedValue: string): Promise<string> {
    const data = JSON.parse(storedValue) as EnvelopeEncryptedData;
    return this.envelopeEncryption.decrypt(data);
  }
}

// Repository with transparent encryption
class UserRepository {
  constructor(
    private readonly db: Database,
    private readonly encryptedField: EncryptedField,
  ) {}

  async createUser(data: CreateUserInput): Promise<User> {
    const encryptedSsn = await this.encryptedField.encryptField(data.ssn);
    const encryptedPhone = await this.encryptedField.encryptField(data.phone);

    const result = await this.db.query(
      `INSERT INTO users (email, encrypted_ssn, encrypted_phone, encryption_metadata)
       VALUES ($1, $2, $3, $4) RETURNING id, email`,
      [data.email, encryptedSsn, encryptedPhone, null],
    );

    return result.rows[0];
  }

  async getUser(id: string): Promise<User> {
    const result = await this.db.query(
      `SELECT * FROM users WHERE id = $1`,
      [id],
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      ssn: await this.encryptedField.decryptField(row.encrypted_ssn),
      phone: await this.encryptedField.decryptField(row.encrypted_phone),
    };
  }
}
```

## Key Rotation

```typescript
// crypto/KeyRotation.ts — Rotate encryption keys
class KeyRotationService {
  constructor(
    private readonly kms: KmsClient,
    private readonly db: Database,
  ) {}

  async rotateKeys(): Promise<void> {
    // 1. Find all records with old key version
    const records = await this.db.query(
      `SELECT id, encrypted_data FROM sensitive_data WHERE key_version = $1`,
      [1], // old key version
    );

    for (const record of records.rows) {
      // 2. Decrypt with old key
      const plaintext = await this.decrypt(record.encrypted_data, 1);

      // 3. Re-encrypt with new key
      const reencrypted = await this.encrypt(plaintext, 2); // new key version

      // 4. Update record
      await this.db.query(
        `UPDATE sensitive_data SET encrypted_data = $1, key_version = $2 WHERE id = $3`,
        [reencrypted, 2, record.id],
      );
    }

    console.log(`Rotated ${records.rows.length} records to key version 2`);
  }
}
```

## Best Practices

- Use AES-256-GCM for data encryption — authenticated encryption prevents tampering
- Never store encryption keys with encrypted data — use a KMS
- Use envelope encryption for performance — KMS calls are slow, DEKs are fast
- Use unique IVs for every encryption operation — never reuse IVs with the same key
- Rotate keys regularly — annually or after a security incident
- Encrypt at multiple layers — field-level for sensitive columns, volume-level for the disk
- Zero out keys from memory after use — prevent memory dump attacks
- Use separate keys per tenant in multi-tenant systems — limits blast radius
- Log key usage to KMS — audit trail for compliance
- Test decryption before deleting old keys — verify rotation succeeded
- Use HSM-backed KMS when possible — hardware security modules protect keys
- Don't encrypt data you need to search on — encrypted fields can't be indexed or searched

## Common Mistakes

- **Reusing IVs with the same key**: catastrophic security failure in GCM mode. Generate a random IV for every encryption.
- **Storing keys in environment variables**: environment variables can be dumped. Use KMS or Vault.
- **Not using authenticated encryption**: AES-CBC without HMAC allows bit-flipping attacks. Use GCM or CBC+HMAC.
- **Encrypting everything**: encrypting non-sensitive data adds overhead and complexity. Encrypt only what needs protection.
- **No key rotation plan**: keys compromised in an incident remain valid forever. Rotate regularly.
- **Using the same key for all tenants**: one compromised key exposes all tenant data. Use per-tenant keys.

## FAQ

### What is encryption at rest?

Encrypting data when it is stored (disk, database, backup). The data is encrypted with a key, and the key is stored separately (in a KMS). If the storage is compromised, the data is unreadable without the key.

### What is envelope encryption?

A pattern where a data encryption key (DEK) encrypts the data, and a key encryption key (KEK) encrypts the DEK. The KEK never leaves the KMS. The encrypted DEK is stored with the data. This minimizes KMS calls — only one call per encrypt/decrypt operation.

### What is AES-256-GCM?

AES-256 in Galois/Counter Mode. AES-256 provides 256-bit key encryption. GCM provides authenticated encryption — it detects if ciphertext has been tampered with. It is the recommended mode for encryption at rest.

### How does key rotation work?

New data is encrypted with the new key. Old data is decrypted with the old key and re-encrypted with the new key. The old key is kept until all data is migrated, then retired. Some KMS (AWS KMS) handle key versioning automatically.

### Should I encrypt at the database level or application level?

Database-level encryption (TDE) protects the disk but the database admin can read plaintext. Application-level (field-level) encryption protects against DB admins too. Use field-level for highly sensitive data (SSN, credit cards) and database-level for everything else.
