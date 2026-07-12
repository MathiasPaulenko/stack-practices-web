---
contentType: recipes
slug: python-encrypt-decrypt-aes
title: "Encripta y Desencripta Datos con AES-GCM en Python"
description: "Encripta datos sensibles usando AES-GCM con la librería cryptography. Cubre derivación de claves, generación de nonces, encriptación autenticada y encriptación de archivos."
metaDescription: "Encripta y desencripta datos con AES-GCM en Python usando cryptography. Derivación de claves con PBKDF2, nonces, encriptación autenticada y encriptación de archivos."
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
  metaDescription: "Encripta y desencripta datos con AES-GCM en Python usando cryptography. Derivación de claves con PBKDF2, nonces, encriptación autenticada y encriptación de archivos."
  keywords:
    - python aes gcm encryption
    - python cryptography library
    - aes 256 encrypt decrypt python
    - pbkdf2 key derivation python
    - authenticated encryption python
    - file encryption python
---

## Visión General

AES-GCM (Advanced Encryption Standard con Galois/Counter Mode) proporciona encriptación autenticada: encripta datos y verifica integridad en una sola operación. A diferencia de AES-CBC, GCM no requiere padding y detecta manipulación. Esta recipe usa la librería `cryptography` para encriptar strings, archivos y datos binarios con AES-256-GCM.

## Cuándo Usar

- Necesitas encriptar datos sensibles en reposo (campos de base de datos, archivos, secrets de config)
- Necesitas encriptación autenticada (confidencialidad + integridad)
- Almacenas passwords de usuario o API keys de forma encriptada
- Encriptas archivos antes de subir a almacenamiento cloud

## Solución

### Instalar la librería cryptography

```bash
pip install cryptography
```

### AES-256-GCM básico: encriptar y desencriptar

```python
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def generate_key() -> bytes:
    """Generar una clave AES aleatoria de 256 bits."""
    return AESGCM.generate_key(bit_length=256)

def encrypt(key: bytes, plaintext: bytes, associated_data: bytes = b"") -> tuple[bytes, bytes, bytes]:
    """Encriptar plaintext con AES-GCM. Retorna (nonce, ciphertext, tag embebido)."""
    nonce = os.urandom(12)  # Nonce de 96 bits
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, plaintext, associated_data)
    return nonce, ciphertext

def decrypt(key: bytes, nonce: bytes, ciphertext: bytes, associated_data: bytes = b"") -> bytes:
    """Desencriptar ciphertext con AES-GCM. Lanza InvalidTag si fue manipulado."""
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, associated_data)

# Uso
key = generate_key()
nonce, ciphertext = encrypt(key, b"Sensitive data here")

decrypted = decrypt(key, nonce, ciphertext)
print(decrypted.decode())  # "Sensitive data here"
```

### Derivación de clave desde un password (PBKDF2)

```python
import os
import base64
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

def derive_key(password: str, salt: bytes = None) -> tuple[bytes, bytes]:
    """Derivar una clave de 256 bits desde un password usando PBKDF2."""
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
    """Encriptar datos usando una clave derivada de password."""
    key, salt = derive_key(password)
    nonce, ciphertext = encrypt(key, plaintext)
    return {
        "salt": base64.b64encode(salt).decode(),
        "nonce": base64.b64encode(nonce).decode(),
        "ciphertext": base64.b64encode(ciphertext).decode(),
    }

def decrypt_with_password(password: str, data: dict) -> bytes:
    """Desencriptar datos usando una clave derivada de password."""
    salt = base64.b64decode(data["salt"])
    key, _ = derive_key(password, salt)
    nonce = base64.b64decode(data["nonce"])
    ciphertext = base64.b64decode(data["ciphertext"])
    return decrypt(key, nonce, ciphertext)

# Uso
encrypted = encrypt_with_password("my-password", b"Secret message")
decrypted = decrypt_with_password("my-password", encrypted)
print(decrypted.decode())  # "Secret message"
```

### Encriptación de archivos

```python
import os
import struct
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def encrypt_file(key: bytes, input_path: str, output_path: str) -> None:
    """Encriptar un archivo con AES-GCM. Formato: [nonce(12)][ciphertext]."""
    nonce = os.urandom(12)
    aesgcm = AESGCM(key)

    with open(input_path, "rb") as f:
        plaintext = f.read()

    ciphertext = aesgcm.encrypt(nonce, plaintext, None)

    with open(output_path, "wb") as f:
        f.write(nonce)
        f.write(ciphertext)

def decrypt_file(key: bytes, input_path: str, output_path: str) -> None:
    """Desencriptar un archivo encriptado con encrypt_file."""
    with open(input_path, "rb") as f:
        nonce = f.read(12)
        ciphertext = f.read()

    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)

    with open(output_path, "wb") as f:
        f.write(plaintext)

# Uso
key = AESGCM.generate_key(bit_length=256)
encrypt_file(key, "document.pdf", "document.pdf.enc")
decrypt_file(key, "document.pdf.enc", "document_decrypted.pdf")
```

### Encriptación de archivos grandes en chunks

```python
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def encrypt_file_stream(key: bytes, input_path: str, output_path: str, chunk_size: int = 64 * 1024) -> None:
    """Encriptar un archivo grande en chunks usando nonces separados por chunk."""
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
    """Desencriptar un archivo encriptado con encrypt_file_stream."""
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

### Associated Data (AAD) para binding de contexto

```python
# Vincular ciphertext a un contexto específico (user ID, record ID)
key = AESGCM.generate_key(bit_length=256)
user_id = "user-12345"
associated_data = user_id.encode()

nonce, ciphertext = encrypt(key, b"SSN: 123-45-6789", associated_data)

# Desencriptar con contexto correcto — funciona
decrypted = decrypt(key, nonce, ciphertext, associated_data)

# Desencriptar con contexto incorrecto — lanza InvalidTag
try:
    decrypt(key, nonce, ciphertext, b"user-99999")
except Exception as e:
    print(f"Decryption failed: {e}")  # Manipulación detectada
```

## Explicación

AES-GCM combina encriptación AES en modo counter con autenticación Galois Mode. Proporciona:

- **Confidencialidad**: Los datos se encriptan con una clave simétrica.
- **Integridad**: Un tag GCM verifica que el ciphertext no fue modificado.
- **Encriptación autenticada**: Confidencialidad e integridad en una operación.

Conceptos clave:

- **Key**: 128, 192, o 256 bits. Usar 256 bits para máxima seguridad. Nunca hardcodear claves — derivar de passwords o cargar desde un secret manager.
- **Nonce**: Un valor de 96 bits que debe ser único para cada encriptación con la misma clave. Usar `os.urandom(12)` para nonces aleatorios. Reusar un nonce con la misma clave rompe la seguridad completamente.
- **Associated Data (AAD)**: Datos opcionales que se autentican pero no se encriptan. Usar para vincular ciphertext a contexto (user IDs, record IDs) para prevenir ataques de intercambio de ciphertext.
- **PBKDF2**: Función de derivación de claves que convierte un password en una clave criptográfica. Usa un salt y muchas iteraciones para ralentizar ataques de fuerza bruta. Usar 600,000+ iteraciones con SHA-256.
- **InvalidTag**: Excepción lanzada cuando la desencriptación falla debido a clave incorrecta, ciphertext manipulado, o AAD no coincidente.

## Variantes

| Método | Auth | Padding | Usar Cuando |
|--------|------|---------|----------|
| AES-GCM | Sí | Ninguno | Elección por defecto, encriptación autenticada |
| AES-CBC + HMAC | Sí | PKCS7 | Sistemas legacy, sin soporte GCM |
| AES-CBC | No | PKCS7 | No recomendado (sin integridad) |
| ChaCha20-Poly1305 | Sí | Ninguno | Alternativa a AES-GCM, más rápido en software |

## Pautas

- Siempre usar AES-GCM o ChaCha20-Poly1305. Nunca usar AES-CBC sin un MAC separado.
- Generar un nonce aleatorio fresco para cada encriptación. Nunca reusar un nonce con la misma clave.
- Usar claves de 256 bits para sistemas nuevos. 128 bits es aceptable pero menos adaptable.
- Derivar claves desde passwords con PBKDF2 (600,000+ iteraciones) o Argon2.
- Almacenar el salt y nonce junto al ciphertext. No son secrets.
- Usar AAD para vincular ciphertext a contexto y prevenir intercambio de ciphertext.
- Nunca hardcodear claves de encriptación en código fuente. Cargar desde entorno o secret manager.
- Usar `os.urandom()` para aleatoriedad criptográfica. Nunca usar `random.random()`.
- Para archivos grandes, encriptar en chunks con un nonce único por chunk.

## Errores Comunes

- Reusar un nonce con la misma clave. Esto rompe completamente la seguridad de GCM.
- Usar `random.random()` en lugar de `os.urandom()`. El módulo `random` no es criptográficamente seguro.
- Hardcodear claves en código fuente. Las claves en historial de Git están comprometidas permanentemente.
- No autenticar datos con AAD. Sin AAD, un atacante puede intercambiar ciphertexts entre registros.
- Usar muy pocas iteraciones de PBKDF2. 1,000 iteraciones es trivialmente brute-forced. Usar 600,000+.
- Almacenar la clave y ciphertext juntos. Si un atacante obtiene el archivo, obtiene la clave también.
- No manejar excepciones `InvalidTag`. Una desencriptación fallida no debería crashear la app silenciosamente.

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre AES-GCM y AES-CBC?

AES-CBC solo proporciona confidencialidad (encriptación). AES-GCM proporciona confidencialidad e integridad (encriptación autenticada). GCM tampoco requiere padding. Siempre preferir GCM sobre CBC.

### ¿Cómo almaceno los datos encriptados?

Almacenar el salt, nonce y ciphertext juntos. No son secrets. Solo la clave es secret. Un formato común es JSON con campos base64-encoded, o un archivo binario con `[salt][nonce][ciphertext]`.

### ¿Es AES-256 mejor que AES-128?

AES-256 proporciona un espacio de clave más grande pero es ligeramente más lento. Para la mayoría de aplicaciones, AES-128 es suficiente. Usar AES-256 si quieres un margen de seguridad contra ataques cuánticos futuros o si el compliance lo requiere.

### ¿Puedo usar la misma clave para múltiples encriptaciones?

Sí, siempre y cuando cada encriptación use un nonce único. Generar un nonce aleatorio de 12 bytes para cada operación. Nunca reusar un nonce con la misma clave.

## Soluciones Avanzadas

### ChaCha20-Poly1305 como alternativa a AES-GCM

ChaCha20-Poly1305 es un cifrador AEAD que es más rápido que AES-GCM en sistemas sin aceleración AES por hardware (dispositivos móviles, servidores ARM). La librería `cryptography` lo soporta nativamente:

```python
import os
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305

def generate_chacha_key() -> bytes:
    """Generar una clave ChaCha20 aleatoria de 256 bits."""
    return ChaCha20Poly1305.generate_key()

def encrypt_chacha(
    key: bytes, plaintext: bytes, aad: bytes = b""
) -> tuple[bytes, bytes]:
    """Encriptar con ChaCha20-Poly1305. Retorna (nonce, ciphertext)."""
    nonce = os.urandom(12)  # Nonce de 96 bits
    chacha = ChaCha20Poly1305(key)
    ciphertext = chacha.encrypt(nonce, plaintext, aad)
    return nonce, ciphertext

def decrypt_chacha(
    key: bytes, nonce: bytes, ciphertext: bytes, aad: bytes = b""
) -> bytes:
    """Desencriptar con ChaCha20-Poly1305."""
    chacha = ChaCha20Poly1305(key)
    return chacha.decrypt(nonce, ciphertext, aad)

# Uso
key = generate_chacha_key()
nonce, ciphertext = encrypt_chacha(key, b"Sensitive data", b"user-12345")
decrypted = decrypt_chacha(key, nonce, ciphertext, b"user-12345")
print(decrypted.decode())
```

### Encriptación de envelope con AWS KMS

Encripta datos con una clave de encriptación de datos (DEK), luego encripta la DEK con una clave maestra de KMS. La DEK nunca se almacena en texto plano:

```python
import boto3
import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

class KmsEnvelopeEncryption:
    """Encriptación de envelope usando AWS KMS para gestión de claves."""

    def __init__(self, kms_key_id: str, region: str = "us-east-1"):
        self.kms = boto3.client("kms", region_name=region)
        self.kms_key_id = kms_key_id

    def encrypt(self, plaintext: bytes, context: dict = None) -> dict:
        """Encriptar datos usando encriptación de envelope."""
        # Generar DEK localmente
        dek = AESGCM.generate_key(bit_length=256)
        nonce = os.urandom(12)
        aesgcm = AESGCM(dek)

        aad = str(context).encode() if context else b""
        ciphertext = aesgcm.encrypt(nonce, plaintext, aad)

        # Encriptar DEK con clave maestra KMS
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
        """Desencriptar datos usando encriptación de envelope."""
        encrypted_dek = base64.b64decode(encrypted_package["encrypted_dek"])
        context = encrypted_package.get("context", {})

        # Desencriptar DEK vía KMS
        response = self.kms.decrypt(
            CiphertextBlob=encrypted_dek,
            EncryptionContext=context,
        )
        dek = response["Plaintext"]

        # Desencriptar datos con DEK
        aesgcm = AESGCM(dek)
        nonce = base64.b64decode(encrypted_package["nonce"])
        ciphertext = base64.b64decode(encrypted_package["ciphertext"])
        aad = str(context).encode() if context else b""

        return aesgcm.decrypt(nonce, ciphertext, aad)

# Uso
enc = KmsEnvelopeEncryption("arn:aws:kms:us-east-1:123:key/abc-123")
encrypted = enc.encrypt(b"Top secret data", context={"app": "billing", "env": "prod"})
decrypted = enc.decrypt(encrypted)
```

### Rotación de claves con encriptación versionada

Rota claves de encriptación sin re-encriptar todos los datos a la vez. Cada registro encriptado almacena un identificador de versión de clave:

```python
import os
import json
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

class KeyRotationManager:
    """Gestionar múltiples versiones de claves de encriptación con rotación."""

    def __init__(self):
        self._keys: dict[int, bytes] = {}
        self._current_version = 0

    def add_key(self, key: bytes = None) -> int:
        """Agregar una nueva versión de clave. Retorna el número de versión."""
        self._current_version += 1
        self._keys[self._current_version] = key or AESGCM.generate_key(bit_length=256)
        return self._current_version

    def encrypt(self, plaintext: bytes, aad: bytes = b"") -> str:
        """Encriptar con la versión de clave actual."""
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
        """Desencriptar usando la versión de clave del payload."""
        data = json.loads(encrypted_str)
        version = data["v"]
        key = self._keys[version]
        nonce = bytes.fromhex(data["n"])
        ciphertext = bytes.fromhex(data["c"])
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ciphertext, aad)

    def rotate(self, old_records: list[str]) -> list[str]:
        """Re-encriptar registros con la última versión de clave."""
        new_records = []
        for record in old_records:
            plaintext = self.decrypt(record)
            new_record = self.encrypt(plaintext)
            new_records.append(new_record)
        return new_records

# Uso
mgr = KeyRotationManager()
v1 = mgr.add_key()  # Versión 1
encrypted_v1 = mgr.encrypt(b"Sensitive data")

v2 = mgr.add_key()  # Versión 2 (rotación)
# Los datos nuevos usan v2 automáticamente
encrypted_v2 = mgr.encrypt(b"New sensitive data")

# Los datos viejos siguen desencriptando con v1
assert mgr.decrypt(encrypted_v1) == b"Sensitive data"

# Re-encriptar datos viejos con v2
re_encrypted = mgr.rotate([encrypted_v1])
assert mgr.decrypt(re_encrypted[0]) == b"Sensitive data"
```

### Herramienta CLI de encriptación de archivos con password

Una herramienta de línea de comandos completa para encriptar/desencriptar archivos con un password:

```python
#!/usr/bin/env python3
"""Herramienta de encriptación de archivos AES-256-GCM con derivación de clave por password."""
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

## Mejores Prácticas Adicionales

1. **Usa Argon2id en vez de PBKDF2 cuando esté disponible.** Argon2id es el ganador del Password Hashing Competition y provee mejor resistencia contra ataques basados en GPU:

```python
# pip install argon2-cffi
from argon2.low_level import hash_secret_raw, Type

def derive_key_argon2(password: str, salt: bytes) -> bytes:
    return hash_secret_raw(
        secret=password.encode(),
        salt=salt,
        time_cost=3,       # iteraciones
        memory_cost=65536,  # 64 MB
        parallelism=4,
        hash_len=32,
        type=Type.ID,
    )
```

2. **Separa claves de encriptación por propósito.** Nunca uses la misma clave para encriptación y firma. Deriva claves separadas usando HKDF con diferentes strings de info:

```python
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

def derive_purpose_keys(master_key: bytes) -> tuple[bytes, bytes]:
    """Derivar claves separadas de encriptación y firma desde una clave maestra."""
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

## Errores Comunes Adicionales

1. **Usar un nonce determinista.** Algunas implementaciones derivan el nonce del plaintext o de un contador sin asegurar unicidad entre procesos. Siempre usa `os.urandom(12)` para nonces aleatorios:

```python
# Mal: nonce determinista
nonce = hashlib.sha256(plaintext).digest()[:12]

# Bien: nonce aleatorio
nonce = os.urandom(12)
```

2. **Ignorar excepciones `InvalidTag`.** Una desencriptación fallida indica manipulación o clave incorrecta. Manéjala explícitamente en vez de dejar que crashee:

```python
from cryptography.exceptions import InvalidTag

try:
    plaintext = aesgcm.decrypt(nonce, ciphertext, aad)
except InvalidTag:
    # Loguear el incidente, retornar error, NO retornar datos parciales
    logger.warning("Decryption failed: possible tampering detected")
    raise ValueError("Data integrity check failed")
```

## Preguntas Frecuentes Adicionales

### ¿Cómo comparto datos encriptados con un tercero?

Usa encriptación híbrida: genera una clave AES aleatoria, encripta los datos con ella, luego encripta la clave AES con la llave pública RSA del destinatario:

```python
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes

# Encriptar clave AES con llave pública RSA del destinatario
encrypted_key = recipient_public_key.encrypt(
    aes_key,
    padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()),
        algorithm=hashes.SHA256(),
        label=None,
    ),
)
# Enviar (encrypted_key, nonce, ciphertext) al destinatario
```

### ¿Debería comprimir datos antes o después de encriptar?

Comprime antes de encriptar. Los datos encriptados son indistinguibles de bytes aleatorios, por lo que la compresión después de encriptar es inefectiva. La compresión antes de encriptar reduce el tamaño del ciphertext pero puede filtrar información sobre la longitud del plaintext en algunos escenarios (ataques CRIME/BREACH). Para datos sensibles donde la longitud importa, usa padding de longitud fija antes de encriptar.
