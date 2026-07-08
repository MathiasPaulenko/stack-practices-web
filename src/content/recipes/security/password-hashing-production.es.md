---
contentType: recipes
slug: password-hashing-production
title: "Hashing de Contraseñas en Producción"
description: "Hashea y verifica contraseñas de forma segura usando bcrypt, scrypt y Argon2 con lo que funciona."
metaDescription: "Guía de hashing de contraseñas para producción con bcrypt, scrypt y Argon2. Lo que funciona para almacenamiento seguro de credenciales en apps web."
difficulty: intermediate
topics:
  - security
tags:
  - bcrypt
  - security
  - authentication
  - nodejs
  - vulnerabilities
relatedResources:
  - /guides/api-security-checklist-guide
  - /guides/security-best-practices-guide
  - /recipes/websocket-authentication
  - /recipes/csrf-protection
  - /recipes/oauth2-pkce-spa
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Guía de hashing de contraseñas para producción con bcrypt, scrypt y Argon2. Lo que funciona para almacenamiento seguro de credenciales en apps web."
  keywords:
    - bcrypt
    - security
    - authentication
    - nodejs
---
## Visión General

Almacenar contraseñas de forma segura es una de las responsabilidades más críticas de cualquier aplicación. Los algoritmos modernos de hashing como bcrypt, scrypt y Argon2 están diseñados para ser lentos e intensivos en memoria, haciendo que los ataques de fuerza bruta sean computacionalmente inviables incluso si la base de datos es comprometida.

## Cuándo Usar

Usa este recurso cuando:
- Implementas autenticación de usuarios desde cero
- Migras de hashing legacy (MD5, SHA-1) a algoritmos modernos
- Eliges parámetros para bcrypt, scrypt o Argon2
- Auditas un sistema de autenticación existente

## Solución

### bcrypt (Node.js)

```javascript
const bcrypt = require('bcrypt');

async function hashPassword(password) {
  const saltRounds = 12; // Ajusta según hardware (10-14 típico)
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
```

### Argon2 (Python)

```python
import argon2

ph = argon2.PasswordHasher(
    time_cost=3,      # Iteraciones
    memory_cost=65536, # 64 MB en KiB
    parallelism=4     # Hilos
)

def hash_password(password: str) -> str:
    return ph.hash(password)

def verify_password(password: str, hash: str) -> bool:
    try:
        ph.verify(hash, password)
        return True
    except argon2.exceptions.VerifyMismatchError:
        return False
```

### scrypt (Go)

```go
package main

import (
    "golang.org/x/crypto/scrypt"
    "crypto/rand"
    "encoding/base64"
)

func hashPassword(password string) (string, error) {
    salt := make([]byte, 16)
    rand.Read(salt)
    hash, err := scrypt.Key([]byte(password), salt, 32768, 8, 1, 32)
    if err != nil { return "", err }
    return base64.StdEncoding.EncodeToString(salt) + "$" + base64.StdEncoding.EncodeToString(hash), nil
}
```

## Explicación

| Algoritmo | Intensivo en Memoria | Configurable | Recomendado Para |
|-----------|---------------------|--------------|------------------|
| bcrypt | No | Solo factor de costo | Uso general, amplio soporte de librerías |
| scrypt | Sí | Costo + memoria + paralelismo | Embebido, proyectos Go |
| Argon2 | Sí (ganador de PHC) | Tiempo + memoria + paralelismo | Nuevos proyectos, máxima seguridad |

**Reglas críticas**:
- Nunca inventes tu propia criptografía. Usa librerías bien validadas. Sigue [lo que funciona para seguridad](/guides/security/security-best-practices-guide).
- El salt debe ser único por contraseña y almacenado junto al hash.
- El pepper (secreto del lado del servidor) agrega defensa en profundidad pero no sustituye el hashing. Almacena peppers en un [secret manager](/recipes/security/vault-dynamic-credentials).
- Re-hashear en login si los parámetros de costo aumentan.

## Variantes

| Lenguaje | Librería | Algoritmo | Notas |
|----------|----------|-----------|-------|
| Node.js | bcrypt | bcrypt | Más popular; bindings nativos |
| Python | argon2-cffi | Argon2 | Ganador del Password Hashing Competition |
| Go | golang.org/x/crypto | scrypt, bcrypt, Argon2 | Extensiones de librería estándar |
| Java | spring-security-crypto | bcrypt, Argon2 | Abstracción de Spring |
| Rust | argon2 | Argon2 | Soporte zeroize para limpieza de memoria |

## Lo que funciona

- **Usa Argon2id para proyectos nuevos**: Ganó el Password Hashing Competition (PHC)
- **Apunta a 250ms de tiempo de verificación**: Ajusta factores de costo a tu hardware
- **Almacena salts con hashes**: El salt no es secreto; prepéndelo al hash
- **Agrega un pepper**: Un secreto del lado del servidor agregado a la contraseña antes de hashear
- **Re-hashea en login**: Actualiza hashes legacy transparentemente cuando los usuarios inician sesión

## Errores Comunes

1. **Usar SHA-256 o MD5 para contraseñas**: Algoritmos rápidos son triviales de atacar con GPUs. Sigue [lo que funciona para seguridad](/guides/security/security-best-practices-guide) al almacenar credenciales.
2. **Codificar salts en duro**: Cada contraseña necesita un salt aleatorio único
3. **Ignorar ataques de timing**: Usa comparación en tiempo constante (incluido en librerías modernas)
4. **Olvidar actualizar factores de costo**: El hardware mejora; reajusta anualmente
5. **Almacenar contraseñas en texto plano**: Incluso "temporalmente" es un riesgo catastrófico. Consulta [lo que funciona para seguridad](/guides/security/security-best-practices-guide).

## Preguntas Frecuentes

**P: ¿Qué algoritmo debería elegir en 2025?**
R: Argon2id es la elección recomendada para sistemas nuevos. bcrypt es aceptable si las librerías de Argon2 no están disponibles.

**P: ¿Cómo migro usuarios de MD5 a Argon2?**
R: Re-hashea en el próximo login: verifica con MD5, luego hashea con Argon2 y reemplaza. Marca la migración en la base de datos.

**P: ¿Debería hashear del lado del cliente antes de enviar?**
R: No. El hashing del lado del cliente no ofrece beneficio de seguridad sobre HTTPS y elimina protección del lado del servidor.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Soluciones Avanzadas

### Argon2id con pepper (Node.js)

Un pepper es un secreto del lado del servidor agregado a la contraseña antes de hashear. A diferencia del salt, el pepper es el mismo para todos los usuarios y se almacena separado de la base de datos:

```javascript
const argon2 = require('argon2');
const crypto = require('crypto');

// Pepper almacenado en variable de entorno, NO en la base de datos
const PEPPER = process.env.PASSWORD_PEPPER;

async function hashPassword(password) {
  // Agregar pepper antes de hashear
  const pepperedPassword = password + PEPPER;
  const hash = await argon2.hash(pepperedPassword, {
    type: argon2.argon2id,
    timeCost: 3,       // Iteraciones
    memoryCost: 65536,  // 64 MB
    parallelism: 4,     // Hilos
    saltLength: 16,     // Bytes
  });
  return hash;
}

async function verifyPassword(password, hash) {
  const pepperedPassword = password + PEPPER;
  try {
    return await argon2.verify(hash, pepperedPassword);
  } catch (err) {
    if (err.code === argon2.errorCodes.VERIFY_MISMATCH_ERROR) {
      return false;
    }
    throw err; // Re-lanzar errores inesperados
  }
}

// Uso
async function registerUser(email, password) {
  const hash = await hashPassword(password);
  // Almacenar: email, hash en base de datos
  // El pepper NO se almacena en la base de datos
}

async function loginUser(email, password) {
  const user = await db.findUserByEmail(email);
  if (!user) return false;
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return false;
  // Verificar si el hash necesita actualización
  if (argon2.needsRehash(user.password_hash, {
    type: argon2.argon2id,
    timeCost: 3,
    memoryCost: 65536,
    parallelism: 4,
  })) {
    const newHash = await hashPassword(password);
    await db.updateUserPassword(user.id, newHash);
  }
  return true;
}
```

### Migración transparente de bcrypt en login

Migra usuarios de hashes legacy a bcrypt sin forzar resets de contraseñas:

```python
import bcrypt
import hashlib
import re

def is_legacy_hash(stored_hash: str) -> bool:
    """Verificar si el hash almacenado es un hash legacy MD5 o SHA-256."""
    # MD5: 32 hex chars, SHA-256: 64 hex chars
    return bool(re.match(r'^[a-f0-9]{32}$', stored_hash) or
                re.match(r'^[a-f0-9]{64}$', stored_hash))

def verify_legacy(password: str, stored_hash: str) -> bool:
    """Verificar contra MD5 o SHA-256 legacy."""
    md5 = hashlib.md5(password.encode()).hexdigest()
    if md5 == stored_hash:
        return True
    sha256 = hashlib.sha256(password.encode()).hexdigest()
    return sha256 == stored_hash

def verify_and_migrate(password: str, stored_hash: str) -> tuple[bool, str | None]:
    """
    Verificar contraseña y migrar a bcrypt si es necesario.
    Retorna (is_valid, new_hash_or_none).
    """
    if stored_hash.startswith('$2b$') or stored_hash.startswith('$2a$'):
        # Ya es bcrypt — verificar normalmente
        if bcrypt.checkpw(password.encode(), stored_hash.encode()):
            # Verificar si el costo necesita actualización
            current_cost = bcrypt.get_rounds(stored_hash.encode())
            if current_cost < 12:
                new_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(12))
                return True, new_hash.decode()
            return True, None
        return False, None

    if is_legacy_hash(stored_hash):
        # Hash legacy — verificar luego migrar
        if verify_legacy(password, stored_hash):
            new_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(12))
            return True, new_hash.decode()
        return False, None

    # Formato de hash desconocido
    return False, None

# Ruta Flask
@app.route('/login', methods=['POST'])
def login():
    email = request.json.get('email')
    password = request.json.get('password')
    user = db.get_user_by_email(email)

    if not user:
        # Retornar el mismo error para prevenir enumeración de usuarios
        return jsonify({'error': 'Credenciales inválidas'}), 401

    valid, new_hash = verify_and_migrate(password, user.password_hash)
    if not valid:
        return jsonify({'error': 'Credenciales inválidas'}), 401

    if new_hash:
        db.update_password(user.id, new_hash)

    session['user_id'] = user.id
    return jsonify({'success': True})
```

### Java Spring Security password encoding

```java
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@Configuration
public class PasswordConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        // Argon2id con parámetros ajustados
        return new Argon2PasswordEncoder(
            16,      // saltLength (bytes)
            32,      // hashLength (bytes)
            4,       // parallelism (hilos)
            65536,   // memoryCost (KiB = 64 MB)
            3        // iterations
        );
    }
}

// Encoder de migración para hashes legacy
@Service
public class PasswordMigrationService {

    private final PasswordEncoder modernEncoder;
    private final LegacyPasswordEncoder legacyEncoder;

    public PasswordMigrationService(PasswordEncoder modernEncoder,
                                     LegacyPasswordEncoder legacyEncoder) {
        this.modernEncoder = modernEncoder;
        this.legacyEncoder = legacyEncoder;
    }

    public boolean verifyAndMigrate(String rawPassword, String storedHash,
                                     Consumer<String> hashUpdater) {
        // Verificar si ya es formato moderno
        if (storedHash.startsWith("$argon2")) {
            if (modernEncoder.matches(rawPassword, storedHash)) {
                // Verificar si necesita rehash
                if (!modernEncoder.upgradeEncoding(storedHash)) {
                    return true;
                }
            }
        } else if (legacyEncoder.matches(rawPassword, storedHash)) {
            // Migrar a hash moderno
            String newHash = modernEncoder.encode(rawPassword);
            hashUpdater.accept(newHash);
            return true;
        }
        return false;
    }
}
```

### Validación de fortaleza de contraseña

Valida la complejidad de la contraseña antes de hashear. Rechaza contraseñas débiles antes de almacenarlas:

```javascript
function validatePasswordStrength(password) {
  const errors = [];

  if (password.length < 12) {
    errors.push('La contraseña debe tener al menos 12 caracteres');
  }
  if (password.length > 128) {
    errors.push('La contraseña no debe exceder 128 caracteres');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('La contraseña debe contener letras minúsculas');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('La contraseña debe contener letras mayúsculas');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('La contraseña debe contener números');
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('La contraseña debe contener caracteres especiales');
  }

  // Verificar contra lista de contraseñas comunes
  const commonPasswords = [
    'password', '123456789', 'qwerty123', 'admin123',
    'welcome123', 'letmein', 'monkey123', 'password123',
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('La contraseña es demasiado común');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Uso en registro
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  const validation = validatePasswordStrength(password);
  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  const hash = await hashPassword(password);
  await db.createUser(email, hash);
  res.status(201).json({ success: true });
});
```

## Mejores Prácticas Adicionales

1. **Rate-limit en intentos de login.** Frena ataques de fuerza bruta a nivel aplicación, no solo a nivel hashing:

```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,                    // 5 intentos por ventana
  message: 'Demasiados intentos de login, intenta más tarde',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/login', loginLimiter, async (req, res) => {
  // Lógica de login aquí
});
```

2. **Usa comparación en tiempo constante para verificaciones de pepper.** Al comparar valores de pepper o verificar si un pepper coincide, usa comparación en tiempo constante para evitar ataques de timing:

```python
import hmac

def verify_pepper(provided_pepper: str, expected_pepper: str) -> bool:
    """Comparación de pepper en tiempo constante."""
    return hmac.compare_digest(
        provided_pepper.encode(),
        expected_pepper.encode()
    )
```

## Errores Comunes Adicionales

1. **Usar el mismo pepper para todos los entornos.** Desarrollo, staging y producción deben tener peppers únicos. Si el pepper de desarrollo se filtra, producción sigue segura:

```bash
# .env.development
PASSWORD_PEPPER="dev-only-pepper-not-used-in-prod"

# .env.production (cargado desde secret manager, no desde archivo)
PASSWORD_PEPPER="prod-secret-from-vault"
```

2. **Logear contraseñas durante debugging.** Incluso logear contraseñas temporalmente en modo debug crea un riesgo de seguridad. Siempre redacta campos de contraseña en logs:

```javascript
function redactPassword(obj) {
  const { password, ...rest } = obj;
  return { ...rest, password: '[REDACTED]' };
}

// En middleware de logging
app.use((req, res, next) => {
  if (req.body && req.body.password) {
    console.log('Request:', redactPassword(req.body));
  }
  next();
});
```

## Preguntas Frecuentes Adicionales

### ¿Cómo elijo los parámetros correctos de Argon2?

Empieza con los defaults recomendados por OWASP: `timeCost=3`, `memoryCost=65536` (64 MB), `parallelism=4`. Mide el tiempo de verificación en tu hardware de producción. Si es menor a 250ms, aumenta `timeCost` o `memoryCost`. Si es mayor a 500ms, disminuye los parámetros. El objetivo es hacer los ataques de fuerza bruta costosos manteniendo el login responsivo para los usuarios.

### ¿Cuál es la diferencia entre Argon2i, Argon2d y Argon2id?

- **Argon2i**: Optimizado contra ataques de side-channel. Usa acceso a memoria independiente de datos. Mejor para derivación de keys basada en contraseñas.
- **Argon2d**: Optimizado contra ataques de trade-off. Usa acceso a memoria dependiente de datos. Mejor para mining de criptomonedas.
- **Argon2id**: Modo híbrido. La primera mitad de las pasadas usa acceso independiente de datos, la segunda usa acceso dependiente. Recomendado para hashing de contraseñas por RFC 9106.

### ¿Debería usar un password manager o auth sin contraseñas?

Los password managers ayudan a los usuarios a generar y almacenar contraseñas fuertes, pero todavía necesitas hashear las contraseñas almacenadas del lado del servidor. La auth sin contraseñas (WebAuthn, passkeys) elimina las contraseñas almacenadas completamente y es la dirección a largo plazo. Hasta que migres completamente a passwordless, usa Argon2id para almacenamiento de contraseñas.
