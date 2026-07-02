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
  - /guides/security-guide
  - /patterns/encryption-at-rest-pattern
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
- Usar claves de 256 bits para sistemas nuevos. 128 bits es aceptable pero menos future-proof.
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
