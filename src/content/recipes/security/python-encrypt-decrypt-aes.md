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
  - /guides/webhook-security-guide
  - /patterns/encryption-at-rest
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

## Advanced Solutions

### ChaCha20-Poly1305 as an alternative to AES-GCM

ChaCha20-Poly1305 is an AEAD cipher that is faster than AES-GCM on systems without hardware AES acceleration (mobile devices, ARM servers). The `cryptography` library supports it natively:

```python
import os
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305

def generate_chacha_key() -> bytes:
    """Generate a random 256-bit ChaCha20 key."""
    return ChaCha20Poly1305.generate_key()

def encrypt_chacha(
    key: bytes, plaintext: bytes, aad: bytes = b""
) -> tuple[bytes, bytes]:
    """Encrypt with ChaCha20-Poly1305. Returns (nonce, ciphertext)."""
    nonce = os.urandom(12)  # 96-bit nonce
    chacha = ChaCha20Poly1305(key)
    ciphertext = chacha.encrypt(nonce, plaintext, aad)
    return nonce, ciphertext

def decrypt_chacha(
    key: bytes, nonce: bytes, ciphertext: bytes, aad: bytes = b""
) -> bytes:
    """Decrypt with ChaCha20-Poly1305."""
    chacha = ChaCha20Poly1305(key)
    return chacha.decrypt(nonce, ciphertext, aad)

# Usage
key = generate_chacha_key()
nonce, ciphertext = encrypt_chacha(key, b"Sensitive data", b"user-12345")
decrypted = decrypt_chacha(key, nonce, ciphertext, b"user-12345")
print(decrypted.decode())
```

### Envelope encryption with AWS KMS

Encrypt data with a data encryption key (DEK), then encrypt the DEK with a KMS master key. The DEK is never stored in plaintext:

```python
import boto3
import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

class KmsEnvelopeEncryption:
    """Envelope encryption using AWS KMS for key management."""

    def __init__(self, kms_key_id: str, region: str = "us-east-1"):
        self.kms = boto3.client("kms", region_name=region)
        self.kms_key_id = kms_key_id

    def encrypt(self, plaintext: bytes, context: dict = None) -> dict:
        """Encrypt data using envelope encryption."""
        # Generate DEK locally
        dek = AESGCM.generate_key(bit_length=256)
        nonce = os.urandom(12)
        aesgcm = AESGCM(dek)

        aad = str(context).encode() if context else b""
        ciphertext = aesgcm.encrypt(nonce, plaintext, aad)

        # Encrypt DEK with KMS master key
        response = self.kms.encrypt(
            KeyId=self.kms_key_id,
            Plaintext=dek,
            EncryptionContext=context or {},
        )

        return {
            "ciphertext": base64.b64encode(ciphertext).decode(),
            "nonce": base64.b64encode(nonce).decode(),
            "encrypted_dek": base64.b64encode(response["CiphertextBlob"]).decode(),
            "context": context,
        }

    def decrypt(self, encrypted_package: dict) -> bytes:
        """Decrypt data using envelope encryption."""
        encrypted_dek = base64.b64decode(encrypted_package["encrypted_dek"])
        context = encrypted_package.get("context", {})

        # Decrypt DEK via KMS
        response = self.kms.decrypt(
            CiphertextBlob=encrypted_dek,
            EncryptionContext=context,
        )
        dek = response["Plaintext"]

        # Decrypt data with DEK
        aesgcm = AESGCM(dek)
        nonce = base64.b64decode(encrypted_package["nonce"])
        ciphertext = base64.b64decode(encrypted_package["ciphertext"])
        aad = str(context).encode() if context else b""

        return aesgcm.decrypt(nonce, ciphertext, aad)

# Usage
enc = KmsEnvelopeEncryption("arn:aws:kms:us-east-1:123:key/abc-123")
encrypted = enc.encrypt(b"Top secret data", context={"app": "billing", "env": "prod"})
decrypted = enc.decrypt(encrypted)
```

### Key rotation with versioned encryption

Rotate encryption keys without re-encrypting all data at once. Each encrypted record stores a key version identifier:

```python
import os
import json
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

class KeyRotationManager:
    """Manage multiple encryption key versions with rotation."""

    def __init__(self):
        self._keys: dict[int, bytes] = {}
        self._current_version = 0

    def add_key(self, key: bytes = None) -> int:
        """Add a new key version. Returns the version number."""
        self._current_version += 1
        self._keys[self._current_version] = key or AESGCM.generate_key(bit_length=256)
        return self._current_version

    def encrypt(self, plaintext: bytes, aad: bytes = b"") -> str:
        """Encrypt with the current key version."""
        version = self._current_version
        key = self._keys[version]
        nonce = os.urandom(12)
        aesgcm = AESGCM(key)
        ciphertext = aesgcm.encrypt(nonce, plaintext, aad)

        return json.dumps({
            "v": version,
            "n": nonce.hex(),
            "c": ciphertext.hex(),
        })

    def decrypt(self, encrypted_str: str, aad: bytes = b"") -> bytes:
        """Decrypt using the key version from the payload."""
        data = json.loads(encrypted_str)
        version = data["v"]
        key = self._keys[version]
        nonce = bytes.fromhex(data["n"])
        ciphertext = bytes.fromhex(data["c"])
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ciphertext, aad)

    def rotate(self, old_records: list[str]) -> list[str]:
        """Re-encrypt records with the latest key version."""
        new_records = []
        for record in old_records:
            plaintext = self.decrypt(record)
            new_record = self.encrypt(plaintext)
            new_records.append(new_record)
        return new_records

# Usage
mgr = KeyRotationManager()
v1 = mgr.add_key()  # Version 1
encrypted_v1 = mgr.encrypt(b"Sensitive data")

v2 = mgr.add_key()  # Version 2 (rotation)
# New data uses v2 automatically
encrypted_v2 = mgr.encrypt(b"New sensitive data")

# Old data still decrypts with v1
assert mgr.decrypt(encrypted_v1) == b"Sensitive data"

# Re-encrypt old data with v2
re_encrypted = mgr.rotate([encrypted_v1])
assert mgr.decrypt(re_encrypted[0]) == b"Sensitive data"
```

### Password-based file encryption CLI tool

A complete command-line tool for encrypting/decrypting files with a password:

```python
#!/usr/bin/env python3
"""AES-256-GCM file encryption tool with password-based key derivation."""
import argparse
import base64
import json
import os
import sys
from getpass import getpass

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def derive_key(password: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=600_000,
    )
    return kdf.derive(password.encode())


def encrypt_file(password: str, input_path: str, output_path: str) -> None:
    salt = os.urandom(16)
    key = derive_key(password, salt)
    nonce = os.urandom(12)
    aesgcm = AESGCM(key)

    with open(input_path, "rb") as f:
        plaintext = f.read()

    ciphertext = aesgcm.encrypt(nonce, plaintext, None)

    payload = {
        "version": 1,
        "algorithm": "AES-256-GCM",
        "kdf": "PBKDF2-SHA256",
        "iterations": 600_000,
        "salt": base64.b64encode(salt).decode(),
        "nonce": base64.b64encode(nonce).decode(),
        "ciphertext": base64.b64encode(ciphertext).decode(),
    }

    with open(output_path, "w") as f:
        json.dump(payload, f, indent=2)

    print(f"Encrypted: {output_path}")


def decrypt_file(password: str, input_path: str, output_path: str) -> None:
    with open(input_path, "r") as f:
        payload = json.load(f)

    salt = base64.b64decode(payload["salt"])
    nonce = base64.b64decode(payload["nonce"])
    ciphertext = base64.b64decode(payload["ciphertext"])

    key = derive_key(password, salt)
    aesgcm = AESGCM(key)

    try:
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    except Exception:
        print("Error: wrong password or corrupted file", file=sys.stderr)
        sys.exit(1)

    with open(output_path, "wb") as f:
        f.write(plaintext)

    print(f"Decrypted: {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AES-256-GCM file encryption")
    subparsers = parser.add_subparsers(dest="command", required=True)

    enc = subparsers.add_parser("encrypt", help="Encrypt a file")
    enc.add_argument("input")
    enc.add_argument("output")

    dec = subparsers.add_parser("decrypt", help="Decrypt a file")
    dec.add_argument("input")
    dec.add_argument("output")

    args = parser.parse_args()
    password = getpass("Password: ")

    if args.command == "encrypt":
        encrypt_file(password, args.input, args.output)
    else:
        decrypt_file(password, args.input, args.output)
```

## Additional Best Practices

1. **Use Argon2id instead of PBKDF2 when available.** Argon2id is the winner of the Password Hashing Competition and provides better resistance against GPU-based attacks:

```python
# pip install argon2-cffi
from argon2.low_level import hash_secret_raw, Type

def derive_key_argon2(password: str, salt: bytes) -> bytes:
    return hash_secret_raw(
        secret=password.encode(),
        salt=salt,
        time_cost=3,       # iterations
        memory_cost=65536,  # 64 MB
        parallelism=4,
        hash_len=32,
        type=Type.ID,
    )
```

2. **Separate encryption keys by purpose.** Never use the same key for encryption and signing. Derive separate keys using HKDF with different info strings:

```python
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

def derive_purpose_keys(master_key: bytes) -> tuple[bytes, bytes]:
    """Derive separate encryption and signing keys from a master key."""
    enc_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b"encryption-key-v1",
    ).derive(master_key)

    sig_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b"signing-key-v1",
    ).derive(master_key)

    return enc_key, sig_key
```

## Additional Common Mistakes

1. **Using a deterministic nonce.** Some implementations derive the nonce from the plaintext or a counter without ensuring uniqueness across processes. Always use `os.urandom(12)` for random nonces:

```python
# Bad: deterministic nonce
nonce = hashlib.sha256(plaintext).digest()[:12]

# Good: random nonce
nonce = os.urandom(12)
```

2. **Ignoring `InvalidTag` exceptions.** A failed decryption indicates tampering or wrong key. Handle it explicitly instead of letting it crash:

```python
from cryptography.exceptions import InvalidTag

try:
    plaintext = aesgcm.decrypt(nonce, ciphertext, aad)
except InvalidTag:
    # Log the incident, return error, do NOT return partial data
    logger.warning("Decryption failed: possible tampering detected")
    raise ValueError("Data integrity check failed")
```

## Additional Frequently Asked Questions

### How do I share encrypted data with a third party?

Use hybrid encryption: generate a random AES key, encrypt the data with it, then encrypt the AES key with the recipient's RSA public key:

```python
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes

# Encrypt AES key with recipient's RSA public key
encrypted_key = recipient_public_key.encrypt(
    aes_key,
    padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()),
        algorithm=hashes.SHA256(),
        label=None,
    ),
)
# Send (encrypted_key, nonce, ciphertext) to recipient
```

### Should I compress data before or after encryption?

Compress before encryption. Encrypted data is indistinguishable from random bytes, so compression after encryption is ineffective. Compression before encryption reduces ciphertext size but can leak information about plaintext length in some scenarios (CRIME/BREACH attacks). For sensitive data where length matters, use fixed-length padding before encryption.
