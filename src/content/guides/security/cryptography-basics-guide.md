---
contentType: guides
slug: cryptography-basics-guide
title: "Cryptography Basics — Encryption, Hashing, and Signing"
description: "A developer's guide to cryptography: symmetric and asymmetric encryption, hashing, digital signatures, and key management with practical code examples."
metaDescription: "Learn cryptography basics: symmetric/asymmetric encryption, hashing, digital signatures, and key management. Practical guide with code examples."
difficulty: intermediate
topics:
  - security
tags:
  - cryptography
  - encryption
  - hashing
  - digital-signatures
  - key-management
  - aes
  - rsa
  - guide
relatedResources:
  - /guides/secrets-management-guide
  - /guides/owasp-top-10-guide
  - /guides/secure-coding-guide
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Learn cryptography basics: symmetric/asymmetric encryption, hashing, digital signatures, and key management. Practical guide with code examples."
  keywords:
    - cryptography
    - encryption
    - hashing
    - digital-signatures
    - key-management
    - aes
    - rsa
    - guide
---

## Overview

Cryptography is the foundation of digital security. Whether you are storing passwords, transmitting data over TLS, or signing API requests, you are using cryptography. Understanding the primitives — encryption, hashing, and signing — and when to use each prevents a class of vulnerabilities that no framework can protect against. This guide walks through the essential concepts every developer needs without requiring a mathematics degree.

## When to Use

- You need to protect data at rest or in transit
- You are implementing authentication or authorization
- You need to verify the integrity or origin of data
- You are choosing between cryptographic libraries or algorithms

## Symmetric Encryption

The same key encrypts and decrypts. Fast and suitable for bulk data.

### AES (Advanced Encryption Standard)

```python
from cryptography.fernet import Fernet

# Generate a key
key = Fernet.generate_key()
cipher = Fernet(key)

# Encrypt
token = cipher.encrypt(b"sensitive data")

# Decrypt
data = cipher.decrypt(token)
```

| Mode | Use Case | Security |
|------|----------|----------|
| AES-GCM | Most applications | Authenticated encryption |
| AES-CBC | Legacy compatibility | Needs HMAC for integrity |
| AES-CTR | Streaming data | Needs careful IV handling |

### Key Management

- Never hardcode keys; use a key management service (KMS)
- Rotate keys periodically (annually or on suspected compromise)
- Separate keys by environment and purpose

## Asymmetric Encryption

Two keys: a public key encrypts, a private key decrypts. Used for key exchange and digital signatures.

### RSA

```python
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes

# Generate key pair
private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
public_key = private_key.public_key()

# Encrypt with public key
encrypted = public_key.encrypt(
    b"secret message",
    padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None)
)

# Decrypt with private key
decrypted = private_key.decrypt(
    encrypted,
    padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None)
)
```

### Elliptic Curve (ECDH/ECDSA)

Faster and smaller keys than RSA at equivalent security.

```python
from cryptography.hazmat.primitives.asymmetric import ec

private_key = ec.generate_private_key(ec.SECP256R1())
public_key = private_key.public_key()
```

## Hashing

One-way functions that produce a fixed-size fingerprint. Used for passwords, data integrity, and checksums.

### Secure Hashing Algorithms

| Algorithm | Output Size | Status |
|-----------|-------------|--------|
| SHA-256 | 256 bits | Recommended |
| SHA-3 | Variable | Recommended |
| BLAKE3 | 256 bits | Fast, modern |
| MD5 | 128 bits | Broken, do not use |
| SHA-1 | 160 bits | Broken, do not use |

```python
import hashlib

# SHA-256
digest = hashlib.sha256(b"data").hexdigest()

# For passwords: use Argon2id, bcrypt, or scrypt — not SHA-256
```

### Password Hashing

```python
import bcrypt

hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))
```

## Digital Signatures

Prove authenticity and integrity of a message.

```python
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives import hashes, serialization

# Sign
signature = private_key.sign(
    message,
    padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
    hashes.SHA256()
)

# Verify
public_key.verify(
    signature,
    message,
    padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
    hashes.SHA256()
)
```

## Transport Layer Security (TLS)

TLS uses asymmetric encryption for key exchange, then symmetric encryption for the session.

```
Client                           Server
  │                                 │
  │ ─────── Client Hello ───────▶ │
  │ ◀────── Server Hello ─────── │
  │ ◀──── Certificate + Key Exchange
  │ ───── Client Key Exchange ───▶ │
  │ ───── [Encrypted Handshake]──▶│
  │                                 │
  │ ←──── Symmetric Session ─────▶ │
```

What works:
- Use TLS 1.3; disable TLS 1.0 and 1.1
- Enable HSTS (HTTP Strict Transport Security)
- Use certificate pinning for mobile apps
- Monitor certificate expiry (30, 14, 7 days before)

## Common Mistakes

- **Rolling your own crypto** — use well-vetted libraries (libsodium, OpenSSL, Bouncy Castle)
- **Using ECB mode** — patterns in plaintext leak through ciphertext
- **Reusing IVs/nonces** — destroys confidentiality in stream modes
- **Storing keys with data** — keys should be in a separate trust boundary
- **Ignoring side-channel attacks** — timing and power analysis can leak keys

## FAQ

**What is the difference between encryption and hashing?**
Encryption is reversible (two-way); hashing is one-way. You encrypt data you need to read later; you hash data you only need to compare (passwords).

**Should I use AES-256 or AES-128?**
AES-128 is secure for most purposes. AES-256 adds a margin of safety against quantum computing advances but is slightly slower.

**What is authenticated encryption?**
Authenticated encryption (like AES-GCM) provides both confidentiality and integrity. Without it, attackers can tamper with ciphertext.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Scenario: Data Encryption in a Fintech App

```text
System: Fintech app, handles transactions and PII
Requirements: Encryption in transit + at rest + field-level

Encryption layers:
  | Layer | Technology | Purpose |
  |-------|-----------|---------|
  | Transit | TLS 1.3 | Encrypt network communication |
  | At rest (DB) | AES-256-GCM | Encrypt disk/volume |
  | Field-level | AES-256-GCM + envelope | Encrypt sensitive fields |
  | Backups | AES-256 + KMS | Encrypt backups |
  | Secrets | KMS + rotation | Rotate keys automatically |

Envelope encryption (field-level):
  1. Generate random Data Encryption Key (DEK) (256 bits)
  2. Encrypt sensitive field with DEK (AES-256-GCM)
  3. Encrypt DEK with Key Encryption Key (KEK) via KMS
  4. Store: ciphertext + encrypted DEK
  5. To decrypt: ask KMS to decrypt DEK, then decrypt field

```javascript
// Envelope encryption with AWS KMS (Node.js)
const { KMSClient, EncryptCommand, DecryptCommand } = require("@aws-sdk/client-kms");
const crypto = require("crypto");

async function encryptField(plaintext, kmsKeyId) {
  // 1. Generate DEK
  const dek = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);

  // 2. Encrypt data with DEK (AES-256-GCM)
  const cipher = crypto.createCipheriv("aes-256-gcm", dek, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // 3. Encrypt DEK with KMS (KEK)
  const kms = new KMSClient();
  const response = await kms.send(new EncryptCommand({
    KeyId: kmsKeyId,
    Plaintext: dek,
  }));

  // 4. Store: encrypted DEK + IV + authTag + ciphertext
  return {
    encryptedDek: response.CiphertextBlob.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

async function decryptField(encrypted) {
  // 1. Decrypt DEK via KMS
  const kms = new KMSClient();
  const response = await kms.send(new DecryptCommand({
    CiphertextBlob: Buffer.from(encrypted.encryptedDek, "base64"),
  }));
  const dek = response.Plaintext;

  // 2. Decrypt data with DEK
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm", dek, Buffer.from(encrypted.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final()
  ]);
  return plaintext.toString("utf8");
}
```

Lessons:
  - Never use the same key for everything
  - Envelope encryption: DEK for data, KEK for DEK
  - KMS rotates KEKs automatically
  - AES-256-GCM: authenticated encryption (confidentiality + integrity)
  - Never store DEK in plaintext
  - IV must be unique per encryption (never reuse)
```

### When do I use symmetric vs asymmetric encryption?

Use symmetric (AES) for encrypting data at rest and large volumes: it is fast and secure. Use asymmetric (RSA, ECC) for key exchange, digital signatures, and authentication: it does not require sharing a secret key. In practice, they are combined: asymmetric to exchange DEK, symmetric to encrypt data (envelope encryption).
