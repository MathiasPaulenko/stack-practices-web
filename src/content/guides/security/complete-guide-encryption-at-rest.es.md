---




contentType: guides
slug: complete-guide-encryption-at-rest
title: "Encryption at Rest: AES-256, KMS, Envelope Encryption"
description: "Dominá encryption at rest: AES-256-GCM, key management services, envelope encryption, key rotation, database encryption, field-level encryption y patrones de producción."
metaDescription: "Dominá encryption at rest: AES-256-GCM, KMS, envelope encryption, key rotation, database encryption, field-level encryption y patrones de producción."
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
  - /guides/complete-guide-oauth2-oidc-production
  - /guides/complete-guide-content-security-policy
  - /recipes/encryption-at-rest
  - /docs/encryption-key-rotation-runbook
  - /recipes/python-encrypt-decrypt-aes
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 22
seo:
  metaDescription: "Dominá encryption at rest: AES-256-GCM, KMS, envelope encryption, key rotation, database encryption, field-level encryption y patrones de producción."
  keywords:
    - encryption at rest
    - aes-256-gcm
    - key management service
    - envelope encryption
    - key rotation
    - field-level encryption
    - database encryption




---

## Introducción

Encryption at rest protege stored data de unauthorized access. Si un attacker gana access al storage layer (disk, backup, snapshot), encrypted data es unreadable sin el key. A continuación: AES-256-GCM, key management services (KMS), envelope encryption, key rotation, database encryption, field-level encryption y production patterns.

## Encryption Layers

```
Application Layer
  └── Field-level encryption (encryptá specific columns)
        └── Database-level encryption (transparent database encryption)
              └── Volume-level encryption (encrypted EBS volumes)
                    └── Hardware-level encryption (self-encrypting drives)

Cada layer protege contra different threat models:
  Field-level: protege contra DB admin leyendo sensitive data
  Database-level: protege contra stolen disk/snapshot
  Volume-level: protege contra physical disk theft
  Hardware-level: protege contra data center access
```

## AES-256-GCM

AES-256-GCM es el standard algorithm para encryption at rest. GCM (Galois/Counter Mode) provee both confidentiality y integrity (authenticated encryption).

```typescript
// crypto/aesGcm.ts — AES-256-GCM encryption y decryption
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV para GCM (recommended)
const TAG_LENGTH = 16; // 128-bit auth tag

export interface EncryptedData {
  ciphertext: string;   // base64
  iv: string;           // base64
  tag: string;          // base64
  keyVersion: number;   // para key rotation
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

Nunca storees encryption keys junto a encrypted data. Usá un KMS (AWS KMS, Google Cloud KMS, HashiCorp Vault) para manejar keys.

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
      keyVersion: 1, // KMS trackea version internally
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
    // AWS KMS auto-rota keys annually cuando enabled
    // Manual rotation crea un new key version
  }
}
```

## Envelope Encryption

Envelope encryption usa un data encryption key (DEK) para encrypt data y un key encryption key (KEK) managed por KMS para encrypt el DEK. El encrypted DEK se storea junto al encrypted data.

```
Data → encrypted con DEK (AES-256-GCM)
DEK  → encrypted con KEK (KMS)
KEK  → managed por KMS (nunca deja KMS)

Stored: { ciphertext, iv, tag, encryptedDek, keyVersion }
```

```typescript
// crypto/EnvelopeEncryption.ts — Envelope encryption pattern
class EnvelopeEncryption {
  constructor(private readonly kms: KmsClient) {}

  async encrypt(plaintext: string): Promise<EnvelopeEncryptedData> {
    // 1. Generá un data encryption key (DEK)
    const dek = crypto.randomBytes(32); // 256-bit DEK

    // 2. Encryptá el data con el DEK
    const encrypted = encrypt(plaintext, dek);

    // 3. Encryptá el DEK con el KMS (KEK)
    const encryptedDek = await this.kms.encrypt(dek);

    // 4. Zero out el DEK de memory
    dek.fill(0);

    return {
      ...encrypted,
      encryptedDek: encryptedDek.ciphertext,
      dekKeyVersion: encryptedDek.keyVersion,
    };
  }

  async decrypt(data: EnvelopeEncryptedData): Promise<string> {
    // 1. Decryptá el DEK usando KMS
    const dek = await this.kms.decrypt(data.encryptedDek, data.dekKeyVersion);

    // 2. Decryptá el data con el DEK
    const plaintext = decrypt(
      { ciphertext: data.ciphertext, iv: data.iv, tag: data.tag, keyVersion: data.keyVersion },
      dek,
    );

    // 3. Zero out el DEK
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
-- Storeá encrypted data en columns
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    encrypted_ssn BYTEA,        -- encrypted social security number
    encrypted_phone BYTEA,      -- encrypted phone number
    encryption_metadata JSONB   -- { iv, tag, keyVersion, encryptedDek }
);

-- Insertá encrypted data
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
// db/EncryptedField.ts — Transparent field encryption en el ORM layer
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

// Repository con transparent encryption
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
// crypto/KeyRotation.ts — Rotá encryption keys
class KeyRotationService {
  constructor(
    private readonly kms: KmsClient,
    private readonly db: Database,
  ) {}

  async rotateKeys(): Promise<void> {
    // 1. Encontrá all records con old key version
    const records = await this.db.query(
      `SELECT id, encrypted_data FROM sensitive_data WHERE key_version = $1`,
      [1], // old key version
    );

    for (const record of records.rows) {
      // 2. Decryptá con old key
      const plaintext = await this.decrypt(record.encrypted_data, 1);

      // 3. Re-encryptá con new key
      const reencrypted = await this.encrypt(plaintext, 2); // new key version

      // 4. Updateá record
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


- For a deeper guide, see [API Security Checklist — Authentication to Encryption](/es/guides/api-security-checklist-guide/).

- Usá AES-256-GCM para data encryption — authenticated encryption prevente tampering
- Nunca storees encryption keys con encrypted data — usá un KMS
- Usá envelope encryption para performance — KMS calls son slow, DEKs son fast
- Usá unique IVs para every encryption operation — nunca reuses IVs con el same key
- Rotá keys regularmente — annually o después de un security incident
- Encryptá en multiple layers — field-level para sensitive columns, volume-level para el disk
- Zero out keys de memory después de use — preventí memory dump attacks
- Usá separate keys per tenant en multi-tenant systems — limitá blast radius
- Loggeá key usage a KMS — audit trail para compliance
- Testeá decryption antes de deletear old keys — verificá que rotation succeeded
- Usá HSM-backed KMS cuando sea possible — hardware security modules protegen keys
- No encryptes data que necesitás para search — encrypted fields no pueden ser indexed o searched

## Common Mistakes

- **Reusar IVs con el same key**: catastrophic security failure en GCM mode. Generá un random IV para every encryption.
- **Storear keys en environment variables**: environment variables pueden ser dumped. Usá KMS o Vault.
- **No usar authenticated encryption**: AES-CBC sin HMAC allowéa bit-flipping attacks. Usá GCM o CBC+HMAC.
- **Encryptar everything**: encryptar non-sensitive data addeá overhead y complexity. Encryptá solo lo que necesita protection.
- **No key rotation plan**: keys compromised en un incident quedan valid forever. Rotá regularmente.
- **Usar el same key para all tenants**: un compromised key expone all tenant data. Usá per-tenant keys.

## FAQ

### ¿Qué es encryption at rest?

Encryptar data cuando se storea (disk, database, backup). El data se encrypta con un key, y el key se storea separadamente (en un KMS). Si el storage se compromete, el data es unreadable sin el key.

### ¿Qué es envelope encryption?

Un pattern donde un data encryption key (DEK) encrypta el data, y un key encryption key (KEK) encrypta el DEK. El KEK nunca deja el KMS. El encrypted DEK se storea con el data. Esto minimiza KMS calls — solo un call per encrypt/decrypt operation.

### ¿Qué es AES-256-GCM?

AES-256 en Galois/Counter Mode. AES-256 provee 256-bit key encryption. GCM provee authenticated encryption — detecta si ciphertext fue tampered. Es el recommended mode para encryption at rest.

### ¿Cómo funciona key rotation?

New data se encrypta con el new key. Old data se decrypta con el old key y se re-encrypta con el new key. El old key se keepéa hasta que all data se migra, luego se retira. Algunos KMS (AWS KMS) handleán key versioning automáticamente.

### ¿Debería encryptar en database level o application level?

Database-level encryption (TDE) protege el disk pero el database admin puede leer plaintext. Application-level (field-level) encryption protege contra DB admins también. Usá field-level para highly sensitive data (SSN, credit cards) y database-level para everything else.
