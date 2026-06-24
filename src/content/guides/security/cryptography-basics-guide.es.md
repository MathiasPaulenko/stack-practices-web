---
contentType: guides
slug: cryptography-basics-guide
title: "Bases de Criptografía — Encriptación, Hashing y Firmas"
description: "Guía de criptografía para desarrolladores: encriptación simétrica y asimétrica, hashing, firmas digitales y gestión de claves con ejemplos de código prácticos."
metaDescription: "Aprende bases de criptografía: encriptación simétrica/asimétrica, hashing, firmas digitales y gestión de claves. Guía práctica con ejemplos de código."
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
  - guia
relatedResources:
  - /guides/secrets-management-guide
  - /guides/owasp-top-10-guide
  - /guides/secure-coding-guide
  - /recipes/security/hash-passwords-bcrypt
  - /recipes/security/generate-secure-tokens
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Aprende bases de criptografía: encriptación simétrica/asimétrica, hashing, firmas digitales y gestión de claves. Guía práctica con ejemplos de código."
  keywords:
    - cryptography
    - encryption
    - hashing
    - digital-signatures
    - key-management
    - aes
    - rsa
    - guia
---

## Overview

La criptografía es la base de la seguridad digital. Ya sea que estés almacenando contraseñas, transmitiendo datos por TLS o firmando solicitudes de API, estás usando criptografía. Entender las primitivas — encriptación, hashing y firmas — y cuándo usar cada una previene una clase de vulnerabilidades que ningún framework puede proteger. Esta guía cubre los conceptos esenciales que todo desarrollador necesita sin requerir un título en matemáticas.

## When to Use

- Necesitas proteger datos en reposo o en tránsito
- Estás implementando autenticación o autorización
- Necesitas verificar la integridad o origen de datos
- Estás eligiendo entre librerías o algoritmos criptográficos

## Encriptación Simétrica

La misma clave encripta y desencripta. Rápida y adecuada para datos en volumen.

### AES (Advanced Encryption Standard)

```python
from cryptography.fernet import Fernet

# Generar una clave
key = Fernet.generate_key()
cipher = Fernet(key)

# Encriptar
token = cipher.encrypt(b"datos sensibles")

# Desencriptar
data = cipher.decrypt(token)
```

| Modo | Caso de Uso | Seguridad |
|------|-------------|-----------|
| AES-GCM | La mayoría de aplicaciones | Encriptación autenticada |
| AES-CBC | Compatibilidad legacy | Necesita HMAC para integridad |
| AES-CTR | Datos en streaming | Necesita manejo cuidadoso de IV |

### Gestión de Claves

- Nunca hardcodees claves; usa un servicio de gestión de claves (KMS)
- Rota claves periódicamente (anualmente o ante sospecha de compromiso)
- Separa claves por ambiente y propósito

## Encriptación Asimétrica

Dos claves: una clave pública encripta, una privada desencripta. Usada para intercambio de claves y firmas digitales.

### RSA

```python
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes

# Generar par de claves
private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
public_key = private_key.public_key()

# Encriptar con clave pública
encrypted = public_key.encrypt(
    b"mensaje secreto",
    padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None)
)

# Desencriptar con clave privada
decrypted = private_key.decrypt(
    encrypted,
    padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None)
)
```

### Curva Elíptica (ECDH/ECDSA)

Más rápida y claves más pequeñas que RSA a seguridad equivalente.

```python
from cryptography.hazmat.primitives.asymmetric import ec

private_key = ec.generate_private_key(ec.SECP256R1())
public_key = private_key.public_key()
```

## Hashing

Funciones unidireccionales que producen una huella de tamaño fijo. Usadas para contraseñas, integridad de datos y checksums.

### Algoritmos de Hashing Seguros

| Algoritmo | Tamaño de Salida | Estado |
|-----------|-----------------|--------|
| SHA-256 | 256 bits | Recomendado |
| SHA-3 | Variable | Recomendado |
| BLAKE3 | 256 bits | Rápido, moderno |
| MD5 | 128 bits | Roto, no usar |
| SHA-1 | 160 bits | Roto, no usar |

```python
import hashlib

# SHA-256
digest = hashlib.sha256(b"datos").hexdigest()

# Para contraseñas: usar Argon2id, bcrypt o scrypt — no SHA-256
```

### Hashing de Contraseñas

```python
import bcrypt

hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))
```

## Firmas Digitales

Prueban autenticidad e integridad de un mensaje.

```python
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives import hashes, serialization

# Firmar
signature = private_key.sign(
    message,
    padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
    hashes.SHA256()
)

# Verificar
public_key.verify(
    signature,
    message,
    padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
    hashes.SHA256()
)
```

## Transport Layer Security (TLS)

TLS usa encriptación asimétrica para intercambio de claves, luego encriptación simétrica para la sesión.

```
Cliente                         Servidor
  │                               │
  │ ─────── Client Hello ───────▶ │
  │ ◀────── Server Hello ─────── │
  │ ◀──── Certificado + Intercambio de Clave
  │ ───── Intercambio de Clave Cliente ───▶ │
  │ ───── [Handshake Encriptado]──▶│
  │                               │
  │ ←──── Sesión Simétrica ─────▶ │
```

Mejores prácticas:
- Usar TLS 1.3; desactivar TLS 1.0 y 1.1
- Habilitar HSTS (HTTP Strict Transport Security)
- Usar certificate pinning para aplicaciones móviles
- Monitorear vencimiento de certificados (30, 14, 7 días antes)

## Errores Comunes

- **Inventar tu propia criptografía** — usa librerías bien validadas (libsodium, OpenSSL, Bouncy Castle)
- **Usar modo ECB** — los patrones en plaintext se filtran a través del ciphertext
- **Reusar IVs/nonces** — destruye la confidencialidad en modos de stream
- **Almacenar claves con los datos** — las claves deben estar en un límite de confianza separado
- **Ignorar ataques de side-channel** — análisis de tiempo y potencia pueden filtrar claves

## FAQ

**¿Cuál es la diferencia entre encriptación y hashing?**
La encriptación es reversible (bidireccional); el hashing es unidireccional. Encriptas datos que necesitas leer después; hasheas datos que solo necesitas comparar (contraseñas).

**¿Debería usar AES-256 o AES-128?**
AES-128 es seguro para la mayoría de propósitos. AES-256 agrega un margen de seguridad contra avances en computación cuántica pero es ligeramente más lento.

**¿Qué es encriptación autenticada?**
La encriptación autenticada (como AES-GCM) provee confidencialidad e integridad. Sin ella, los atacantes pueden alterar el ciphertext.
