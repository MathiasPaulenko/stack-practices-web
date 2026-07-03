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
