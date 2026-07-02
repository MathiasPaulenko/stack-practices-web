---
contentType: recipes
slug: python-encrypt-decrypt-aes
title: "Encrypt and Decrypt Data with AES-GCM in Python"
description: "Encrypt sensitive data using AES-GCM with the cryptography library. Covers key derivation, nonce generation, authenticated encryption, and file encryption."
metaDescription: "Encrypt and decrypt data with AES-GCM in Python using cryptography library. Key derivation with PBKDF2, nonce generation, authenticated encryption and file encryption."
difficulty: intermediate
topics:
  - security
tags:
  - python
  - cryptography
  - aes-gcm
  - encryption
  - security
  - pbkdf2
relatedResources:
  - /recipes/devops/docker-secrets-management
  - /recipes/devops/docker-network-isolation
  - /guides/security-guide
  - /patterns/encryption-at-rest-pattern
  - /guides/secrets-management-guide
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Encrypt and decrypt data with AES-GCM in Python using cryptography library. Key derivation with PBKDF2, nonce generation, authenticated encryption and file encryption."
  keywords:
    - python aes gcm encryption
    - python cryptography library
    - aes 256 encrypt decrypt python
    - pbkdf2 key derivation python
    - authenticated encryption python
    - file encryption python
---

## Overview

AES-GCM (Advanced Encryption Standard with Galois/Counter Mode) provides authenticated encryption: it encrypts data and verifies integrity in a single operation. Unlike AES-CBC, GCM does not require padding and detects tampering. This recipe uses the `cryptography` library to encrypt strings, files, and binary data with AES-256-GCM.

## When to Use

- You need to encrypt sensitive data at rest (database fields, files, config secrets)
- You need authenticated encryption (confidentiality + integrity)
- You store user passwords or API keys in an encrypted form
- You encrypt files before uploading to cloud storage

## Solution

### Install the cryptography library

```bash
pip install cryptography
```

### Basic AES-256-GCM encrypt and decrypt

```python
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def generate_key() -> bytes:
    """Generate a random 256-bit AES key."""
    return AESGCM.generate_key(bit_length=256)

def encrypt(key: bytes, plaintext: bytes, associated_data: bytes = b"") -> tuple[bytes, bytes, bytes]:
    """Encrypt plaintext with AES-GCM. Returns (nonce, ciphertext, tag is embedded)."""
    nonce = os.urandom(12)  # 96-bit nonce
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, plaintext, associated_data)
    return nonce, ciphertext

def decrypt(key: bytes, nonce: bytes, ciphertext: bytes, associated_data: bytes = b"") -> bytes:
    """Decrypt ciphertext with AES-GCM. Raises InvalidTag if tampered."""
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, associated_data)

# Usage
key = generate_key()
nonce, ciphertext = encrypt(key, b"Sensitive data here")

decrypted = decrypt(key, nonce, ciphertext)
print(decrypted.decode())  # "Sensitive data here"
```

### Key derivation from a password (PBKDF2)

```python
import os
import base64
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

def derive_key(password: str, salt: bytes = None) -> tuple[bytes, bytes]:
    """Derive a 256-bit key from a password using PBKDF2."""
    if salt is None:
        salt = os.urandom(16)
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=600_000,
    )
    key = kdf.derive(password.encode())
    return key, salt

def encrypt_with_password(password: str, plaintext: bytes) -> dict:
    """Encrypt data using a password-derived key."""
    key, salt = derive_key(password)
    nonce, ciphertext = encrypt(key, plaintext)
    return {
        "salt": base64.b64encode(salt).decode(),
        "nonce": base64.b64encode(nonce).decode(),
        "ciphertext": base64.b64encode(ciphertext).decode(),
    }

def decrypt_with_password(password: str, data: dict) -> bytes:
    """Decrypt data using a password-derived key."""
    salt = base64.b64decode(data["salt"])
    key, _ = derive_key(password, salt)
    nonce = base64.b64decode(data["nonce"])
    ciphertext = base64.b64decode(data["ciphertext"])
    return decrypt(key, nonce, ciphertext)

# Usage
encrypted = encrypt_with_password("my-password", b"Secret message")
decrypted = decrypt_with_password("my-password", encrypted)
print(decrypted.decode())  # "Secret message"
```

### File encryption

```python
import os
import struct
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def encrypt_file(key: bytes, input_path: str, output_path: str) -> None:
    """Encrypt a file with AES-GCM. Format: [nonce(12)][ciphertext]."""
    nonce = os.urandom(12)
    aesgcm = AESGCM(key)

    with open(input_path, "rb") as f:
        plaintext = f.read()

    ciphertext = aesgcm.encrypt(nonce, plaintext, None)

    with open(output_path, "wb") as f:
        f.write(nonce)
        f.write(ciphertext)

def decrypt_file(key: bytes, input_path: str, output_path: str) -> None:
    """Decrypt a file encrypted with encrypt_file."""
    with open(input_path, "rb") as f:
        nonce = f.read(12)
        ciphertext = f.read()

    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)

    with open(output_path, "wb") as f:
        f.write(plaintext)

# Usage
key = AESGCM.generate_key(bit_length=256)
encrypt_file(key, "document.pdf", "document.pdf.enc")
decrypt_file(key, "document.pdf.enc", "document_decrypted.pdf")
```

### Large file encryption in chunks

```python
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def encrypt_file_stream(key: bytes, input_path: str, output_path: str, chunk_size: int = 64 * 1024) -> None:
    """Encrypt a large file in chunks using separate nonces per chunk."""
    aesgcm = AESGCM(key)
    with open(input_path, "rb") as fin, open(output_path, "wb") as fout:
        chunk_index = 0
        while True:
            chunk = fin.read(chunk_size)
            if not chunk:
                break
            nonce = os.urandom(12)
            ciphertext = aesgcm.encrypt(nonce, chunk, str(chunk_index).encode())
            fout.write(struct.pack("<I", len(nonce) + len(ciphertext)))
            fout.write(nonce)
            fout.write(ciphertext)
            chunk_index += 1

def decrypt_file_stream(key: bytes, input_path: str, output_path: str) -> None:
    """Decrypt a file encrypted with encrypt_file_stream."""
    aesgcm = AESGCM(key)
    import struct
    with open(input_path, "rb") as fin, open(output_path, "wb") as fout:
        chunk_index = 0
        while True:
            size_bytes = fin.read(4)
            if not size_bytes or len(size_bytes) < 4:
                break
            size = struct.unpack("<I", size_bytes)[0]
            data = fin.read(size)
            nonce = data[:12]
            ciphertext = data[12:]
            plaintext = aesgcm.decrypt(nonce, ciphertext, str(chunk_index).encode())
            fout.write(plaintext)
            chunk_index += 1
```

### Associated data (AAD) for context binding

```python
# Bind ciphertext to a specific context (user ID, record ID)
key = AESGCM.generate_key(bit_length=256)
user_id = "user-12345"
associated_data = user_id.encode()

nonce, ciphertext = encrypt(key, b"SSN: 123-45-6789", associated_data)

# Decrypt with correct context — works
decrypted = decrypt(key, nonce, ciphertext, associated_data)

# Decrypt with wrong context — raises InvalidTag
try:
    decrypt(key, nonce, ciphertext, b"user-99999")
except Exception as e:
    print(f"Decryption failed: {e}")  # Tampering detected
```

## Explanation

AES-GCM combines AES counter mode encryption with Galois Mode authentication. It provides:

- **Confidentiality**: Data is encrypted with a symmetric key.
- **Integrity**: A GCM tag verifies the ciphertext was not modified.
- **Authenticated encryption**: Both confidentiality and integrity in one operation.

Key concepts:

- **Key**: 128, 192, or 256 bits. Use 256 bits for maximum security. Never hardcode keys — derive from passwords or load from a secret manager.
- **Nonce**: A 96-bit value that must be unique for each encryption with the same key. Use `os.urandom(12)` for random nonces. Reusing a nonce with the same key breaks security entirely.
- **Associated Data (AAD)**: Optional data that is authenticated but not encrypted. Use it to bind ciphertext to context (user IDs, record IDs) to prevent ciphertext swapping attacks.
- **PBKDF2**: Key derivation function that converts a password into a cryptographic key. Uses a salt and many iterations to slow down brute-force attacks. Use 600,000+ iterations with SHA-256.
- **InvalidTag**: Exception raised when decryption fails due to wrong key, tampered ciphertext, or mismatched AAD.

## Variants

| Method | Auth | Padding | Use When |
|--------|------|---------|----------|
| AES-GCM | Yes | None | Default choice, authenticated encryption |
| AES-CBC + HMAC | Yes | PKCS7 | Legacy systems, no GCM support |
| AES-CBC | No | PKCS7 | Not recommended (no integrity) |
| ChaCha20-Poly1305 | Yes | None | Alternative to AES-GCM, faster in software |

## Guidelines

- Always use AES-GCM or ChaCha20-Poly1305. Never use AES-CBC without a separate MAC.
- Generate a fresh random nonce for every encryption. Never reuse a nonce with the same key.
- Use 256-bit keys for new systems. 128-bit is acceptable but less future-proof.
- Derive keys from passwords with PBKDF2 (600,000+ iterations) or Argon2.
- Store the salt and nonce alongside the ciphertext. They are not secrets.
- Use AAD to bind ciphertext to context and prevent ciphertext swapping.
- Never hardcode encryption keys in source code. Load from environment or secret manager.
- Use `os.urandom()` for cryptographic randomness. Never use `random.random()`.
- For large files, encrypt in chunks with a unique nonce per chunk.

## Common Mistakes

- Reusing a nonce with the same key. This completely breaks GCM security.
- Using `random.random()` instead of `os.urandom()`. The `random` module is not cryptographically secure.
- Hardcoding keys in source code. Keys in Git history are permanently compromised.
- Not authenticating data with AAD. Without AAD, an attacker can swap ciphertexts between records.
- Using too few PBKDF2 iterations. 1,000 iterations is trivially brute-forced. Use 600,000+.
- Storing the key and ciphertext together. If an attacker gets the file, they get the key too.
- Not handling `InvalidTag` exceptions. A failed decryption should not crash the app silently.

## Frequently Asked Questions

### What is the difference between AES-GCM and AES-CBC?

AES-CBC only provides confidentiality (encryption). AES-GCM provides both confidentiality and integrity (authenticated encryption). GCM also does not require padding. Always prefer GCM over CBC.

### How do I store the encrypted data?

Store the salt, nonce, and ciphertext together. They are not secrets. Only the key is secret. A common format is JSON with base64-encoded fields, or a binary file with `[salt][nonce][ciphertext]`.

### Is AES-256 better than AES-128?

AES-256 provides a larger key space but is slightly slower. For most applications, AES-128 is sufficient. Use AES-256 if you want a security margin against future quantum attacks or if compliance requires it.

### Can I use the same key for multiple encryptions?

Yes, as long as each encryption uses a unique nonce. Generate a random 12-byte nonce for each operation. Never reuse a nonce with the same key.
