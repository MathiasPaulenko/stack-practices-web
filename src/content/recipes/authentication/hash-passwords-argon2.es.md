---
contentType: recipes
slug: hash-passwords-argon2
title: "Hash de Contraseñas con Argon2"
description: "Cómo hashear y verificar contraseñas de forma segura con Argon2id, ganador del Password Hashing Competition, con tuning correcto de parámetros y estrategias de migración desde bcrypt."
metaDescription: "Hashea y verifica contraseñas de forma segura con Argon2id, con tuning correcto de parámetros y estrategias de migración desde bcrypt."
difficulty: beginner
topics:
  - authentication
tags:
  - authentication
  - argon2
  - password-hashing
  - bcrypt
  - security
  - cryptography
  - recipe
relatedResources:
  - /recipes/authentication/implement-rbac
  - /recipes/authentication/implement-sso-saml
  - /guides/security/secrets-management-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Hashea y verifica contraseñas de forma segura con Argon2id, con tuning correcto de parámetros y estrategias de migración desde bcrypt."
  keywords:
    - authentication
    - argon2
    - password-hashing
    - bcrypt
    - security
    - cryptography
    - recipe
---

## Descripción General

Argon2 ganó el Password Hashing Competition de 2015 y es el algoritmo recomendado por OWASP, NIST e IETF. Resiste cracking basado en GPU mediante computación memory-hard, haciendo los ataques de fuerza bruta miles de veces más costosos que con SHA-256 o incluso bcrypt. Argon2id combina las fortalezas de Argon2d (resistencia GPU) y Argon2i (resistencia a side-channels), siendo la recomendación por defecto para todos los sistemas nuevos.

## Cuándo Usar

- Almacenar contraseñas para cualquier sistema donde la resistencia a fuerza bruta importe
- Reemplazar bcrypt, PBKDF2 o scrypt en sistemas existentes
- Construir un sistema de autenticación desde cero
- Cumplir con estándares de seguridad modernos (OWASP ASVS, NIST 800-63B)
- Migrar desde algoritmos legacy (MD5, SHA-1) que ya no son seguros

## Cuándo NO Usar

- Ya usas bcrypt con factor de costo ≥ 12 y no hay mandato de compliance para migrar — bcrypt sigue siendo seguro
- Necesitas hashear contraseñas en un dispositivo embebido con memoria limitada — Argon2 es intensivo en memoria

## Implementación Paso a Paso

### Python (argon2-cffi)

```bash
pip install argon2-cffi
```

```python
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

# Parámetros recomendados (OWASP 2023)
ph = PasswordHasher(
    time_cost=3,         # iteraciones
    memory_cost=65536,  # 64 MiB
    parallelism=4,       # threads
    hash_len=32,
    salt_len=16
)

def hash_password(password: str) -> str:
    return ph.hash(password)

def verify_password(password: str, hash_str: str) -> bool:
    try:
        ph.verify(hash_str, password)
        return True
    except VerifyMismatchError:
        return False

def verify_and_rehash(password: str, hash_str: str) -> tuple[bool, str | None]:
    try:
        ph.verify(hash_str, password)
        if ph.check_needs_rehash(hash_str):
            return True, ph.hash(password)
        return True, None
    except VerifyMismatchError:
        return False, None

hashed = hash_password("user_password_123")
valid, new_hash = verify_and_rehash("user_password_123", hashed)
if valid and new_hash:
    update_stored_hash_in_db(new_hash)
```

### Node.js (argon2)

```bash
npm install argon2
```

```javascript
import argon2 from 'argon2';

async function hashPassword(password) {
    return argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536, timeCost: 3, parallelism: 4,
        hashLength: 32, saltLength: 16
    });
}

async function verifyPassword(password, hash) {
    try { return await argon2.verify(hash, password); }
    catch { return false; }
}

async function verifyAndRehash(password, hash) {
    const valid = await verifyPassword(password, hash);
    if (!valid) return { valid: false, newHash: null };
    const needsRehash = argon2.needsRehash(hash, { memoryCost: 65536, timeCost: 3, parallelism: 4 });
    return { valid: true, newHash: needsRehash ? await hashPassword(password) : null };
}

// Express middleware
app.post('/login', async (req, res) => {
    const user = await db.users.findOne({ email: req.body.email });
    if (!user) {
        await argon2.hash('dummy');  // timing constante
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const { valid, newHash } = await verifyAndRehash(req.body.password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    if (newHash) await db.users.updateOne({ _id: user._id }, { $set: { password_hash: newHash } });
    req.session.userId = user._id;
    res.json({ success: true });
});
```

### Java (Spring Security + Bouncy Castle)

```xml
<dependency>
    <groupId>org.bouncycastle</groupId>
    <artifactId>bcprov-jdk18on</artifactId>
    <version>1.77</version>
</dependency>
```

```java
public class Argon2PasswordHasher {
    private static final int SALT_LEN = 16, HASH_LEN = 32;
    private static final int ITERATIONS = 3, MEMORY = 65536, PARALLELISM = 4;
    private final SecureRandom random = new SecureRandom();

    public String hash(String password) {
        byte[] salt = new byte[SALT_LEN];
        random.nextBytes(salt);
        Argon2Parameters params = new Argon2Parameters.Builder()
            .withSalt(salt).withParallelism(PARALLELISM)
            .withMemoryAsKB(MEMORY).withIterations(ITERATIONS)
            .withVersion(Argon2Parameters.ARGON2_VERSION_13).build();
        Argon2BytesGenerator gen = new Argon2BytesGenerator();
        gen.init(params);
        byte[] result = new byte[HASH_LEN];
        gen.generateBytes(password.toCharArray(), result);
        return String.format("$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s",
            MEMORY, ITERATIONS, PARALLELISM,
            Base64.toBase64String(salt), Base64.toBase64String(result));
    }

    public boolean verify(String password, String encoded) {
        String[] parts = encoded.split("\\$");
        int memory = Integer.parseInt(parts[3].split(",")[0].split("=")[1]);
        int iterations = Integer.parseInt(parts[3].split(",")[1].split("=")[1]);
        int parallelism = Integer.parseInt(parts[3].split(",")[2].split("=")[1]);
        byte[] salt = Base64.decode(parts[4]);

        Argon2BytesGenerator gen = new Argon2BytesGenerator();
        gen.init(new Argon2Parameters.Builder().withSalt(salt)
            .withParallelism(parallelism).withMemoryAsKB(memory)
            .withIterations(iterations).withVersion(Argon2Parameters.ARGON2_VERSION_13).build());
        byte[] expected = new byte[HASH_LEN];
        gen.generateBytes(password.toCharArray(), expected);
        return Arrays.equals(expected, Base64.decode(parts[5]));
    }
}
```

## Selección de Parámetros

| Parámetro | Mínimo OWASP 2023 | Racional |
|-----------|------------------|----------|
| **Memoria** | 64 MiB (65536 KiB) | Suficiente para exceder cache de GPU, baja para capacidad del servidor |
| **Iteraciones** | 3 | Balancea costo de CPU sin latencia excesiva (>250ms por hash es aceptable) |
| **Paralelismo** | 4 | Coincide con conteo típico de cores de servidor |
| **Salt length** | 16 bytes | Previene rainbow tables; entropía de 128-bit es suficiente |
| **Hash length** | 32 bytes | Output de 256-bit; más largo no mejora seguridad contra fuerza bruta |

## Migrando desde bcrypt

```python
def verify_password(password: str, hash_str: str) -> bool:
    if hash_str.startswith("$2"):
        import bcrypt
        return bcrypt.checkpw(password.encode(), hash_str.encode())
    elif hash_str.startswith("$argon2"):
        return verify_argon2(password, hash_str)
    return False

async def login(email, password):
    user = await get_user(email)
    if verify_password(password, user.hash):
        if user.hash.startswith("$2"):
            await update_hash(user.id, hash_password(password))
        return create_session(user)
    return None
```

## Mejores Prácticas

- **Nunca implementes tu propio hash de contraseñas.** Usa librerías bien auditadas. Implementaciones custom introducen ataques de timing y bugs de memory safety.
- **Siempre usa Argon2id, no Argon2d o Argon2i.** Argon2id es la variante recomendada que balancea resistencia GPU y protección contra side-channels.
- **Ajusta parámetros a tu hardware.** El hashing debería tardar 250-500ms en hardware de producción. Perfiliza con valores de `time_cost` hasta alcanzar este objetivo.
- **Usa comparación en tiempo constante para todo el path de verificación.** Incluso el path "usuario no encontrado" debería realizar un hash dummy para prevenir timing attacks.
- **Almacena hashes, no contraseñas, no contraseñas encriptadas.** El hashing es unidireccional; la encriptación es reversible.

## Errores Comunes

- **Usar SHA-256, MD5 o SHA-1 para contraseñas.** Diseñados para velocidad, son triviales de fuerza bruta en GPUs (miles de millones de intentos por segundo).
- **Salting con una constante global.** Un salt único por usuario es obligatorio. Reusar salt entre usuarios permite ataques de rainbow table.
- **Olvidar manejar encoding consistentemente.** UTF-8, Latin-1 y ASCII producen diferentes secuencias de bytes. Estandariza en UTF-8.
- **Configurar memoria demasiado alta.** Argon2 con 1 GiB puede causar OOM kills bajo carga. Comienza con 64 MiB.
- **No actualizar parámetros con el tiempo.** El hardware mejora. Programa revisiones anuales y rehashea contraseñas en login.
