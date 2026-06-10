---
contentType: recipes
slug: password-hashing
title: "Hashing de Contraseñas"
description: "Cómo hashear y verificar contraseñas de forma segura usando algoritmos modernos en Python, JavaScript y Java."
metaDescription: "Ejemplos prácticos de hashing de contraseñas en Python, JavaScript y Java. Usa bcrypt, argon2 y PBKDF2 con salt para almacenar contraseñas de forma segura."
difficulty: intermediate
topics:
  - authentication
tags:
  - password
  - hashing
  - bcrypt
  - security
  - python
  - javascript
  - java
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/handle-errors
  - /patterns/design/singleton-pattern
lastUpdated: "2026-06-10"
author: "StackPractices"
seo:
  metaDescription: "Ejemplos prácticos de hashing de contraseñas en Python, JavaScript y Java. Usa bcrypt, argon2 y PBKDF2 con salt para almacenar contraseñas de forma segura."
  keywords:
    - hashing de contraseñas
    - bcrypt
    - argon2
    - pbkdf2
    - salt
    - contraseñas seguras
    - python bcrypt
    - node bcrypt
    - java password hashing
---

## Visión general

El hashing de contraseñas es el proceso de convertir una contraseña en texto plano en una cadena de longitud fija e irreversible usando una función criptográfica de una sola vía. Nunca almacenes contraseñas en texto plano. Hashea siempre con un salt único y un algoritmo lento diseñado para contraseñas.

Algoritmos modernos como bcrypt, Argon2 y PBKDF2 son intencionalmente lentos para resistir ataques de fuerza bruta y tablas arcoíris.

## Cuándo usarlo

Usa esta recipe cuando:

- Almacenas credenciales de usuario en una base de datos
- Implementas sistemas de autenticación
- Migras sistemas legacy a almacenamiento moderno de contraseñas
- Validas contraseñas durante el login

## Solución

### Python

```python
import bcrypt

# Hashear una contraseña
password = b"supersecret"
salt = bcrypt.gensalt(rounds=12)
hashed = bcrypt.hashpw(password, salt)

# Verificar una contraseña
if bcrypt.checkpw(password, hashed):
    print("Password matches")
else:
    print("Invalid password")
```

### JavaScript (Node.js)

```javascript
const bcrypt = require('bcrypt');

async function hashPassword(password) {
  const saltRounds = 12;
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

async function verifyPassword(password, hash) {
  const match = await bcrypt.compare(password, hash);
  return match;
}

// Uso
hashPassword('supersecret').then(hash => {
  verifyPassword('supersecret', hash).then(ok => console.log(ok));
});
```

### Java

```java
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

// Hash
String hashed = encoder.encode("supersecret");

// Verificar
boolean matches = encoder.matches("supersecret", hashed);
System.out.println(matches);
```

## Explicación

- **Salt**: Un valor aleatorio agregado a la contraseña antes de hashear. Previene ataques de tablas arcoíris.
- **Factor de trabajo (rounds)**: Controla la velocidad de hashing. Mayor = más lento = más seguro. 12 es un default moderno.
- **bcrypt**: Función de hash adaptativa basada en el cifrado Blowfish. Manejo de salt incorporado.
- **Argon2**: Ganador del Password Hashing Competition. Mejor opción para sistemas nuevos.
- **PBKDF2**: Aprobado por NIST. Más lento que bcrypt pero ampliamente soportado.

## Variantes

| Algoritmo | Fortaleza | Velocidad | Mejor para |
|-----------|-----------|-----------|------------|
| bcrypt | Buena | Moderada | Uso general, ampliamente soportado |
| Argon2 | Excelente | Ajustable | Nuevas aplicaciones, máxima seguridad |
| PBKDF2 | Buena | Lenta | Cumplimiento NIST/FIPS |
| scrypt | Buena | Memory-hard | Resiste ataques GPU/ASIC |

## Mejores prácticas

- **Nunca inventes tu propia criptografía**: Usa librerías establecidas (bcrypt, argon2, passlib)
- **Usa siempre salt**: Único por contraseña, manejado automáticamente por bcrypt
- **Usa un factor de trabajo suficiente**: 12+ rounds para bcrypt, ajusta según el hardware
- **Re-hashea en login**: Actualiza gradualmente los factores de trabajo cuando los usuarios se autentican
- **Nunca compares en texto plano**: Usa siempre funciones de verificación de la librería

## Errores comunes

- Almacenar contraseñas en texto plano o encriptación reversible
- Usar hashes rápidos como MD5, SHA-1 o SHA-256 para contraseñas
- Reutilizar salts entre múltiples usuarios
- Hard-codear salts en el código fuente
- Usar factores de trabajo insuficientes (ej. bcrypt con <10 rounds)

## Preguntas frecuentes

**P: ¿Debería usar SHA-256 para hashear contraseñas?**
R: No. SHA-256 está diseñado para ser rápido. El hashing de contraseñas debe ser lento para resistir fuerza bruta. Usa bcrypt, Argon2 o PBKDF2.

**P: ¿Cómo migro usuarios de hashes MD5 antiguos?**
R: Re-hashea los hashes MD5 existentes con bcrypt en el próximo login, luego reemplaza el hash viejo. Marca las cuentas migradas.

**P: ¿Qué factor de trabajo debo usar para bcrypt?**
R: Empieza con 12. Haz benchmarking para que el hashing tarde ~250ms en tu hardware de producción. Aumenta con el tiempo.
