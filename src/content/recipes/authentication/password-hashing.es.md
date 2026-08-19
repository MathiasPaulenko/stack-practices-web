---
contentType: recipes
slug: password-hashing
title: "Cómo hashear contraseñas (Python, JavaScript, Java)"
description: "Aprendé a hashear y verificar contraseñas con bcrypt, Argon2 y PBKDF2. Ejemplos prácticos en Python, JavaScript y Java."
metaDescription: "Ejemplos de hashing seguro de contraseñas en Python, JavaScript y Java. Compará bcrypt, Argon2 y PBKDF2 con salt y aprendé a verificar contraseñas."
difficulty: intermediate
topics:
  - authentication
  - security
tags:
  - authentication
  - bcrypt
  - argon2
  - pbkdf2
  - security
  - password-hashing
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/session-management
  - /recipes/two-factor-authentication
  - /recipes/encryption-at-rest
  - /recipes/oauth2-login
  - /guides/security-best-practices-guide
lastUpdated: "2026-08-19"
publishedAt: "2026-06-10"
author: Mathias Paulenko
seo:
  metaDescription: "Ejemplos de hashing seguro de contraseñas en Python, JavaScript y Java. Compará bcrypt, Argon2 y PBKDF2 con salt y aprendé a verificar contraseñas."
  keywords:
    - hashing de contraseñas
    - bcrypt
    - argon2
    - pbkdf2
    - salt
    - verificación de contraseñas
    - contraseñas seguras
---

## Visión General

Las contraseñas son un riesgo desde el momento en que las almacenás. Si tu base de
datos se expone, el texto plano o hashes rápidos como SHA-256 permiten a un
atacante probar millones de intentos por segundo. El hashing de contraseñas
convierte la contraseña en una cadena lenta e irreversible con un salt único, así
que una base de datos filtrada sigue siendo cara de romper.

Más abajo hay ejemplos para hashear y verificar contraseñas en Python,
JavaScript y Java con bcrypt, Argon2 y PBKDF2.

## Cuándo Usarlo

- Almacenás credenciales de usuario con nombre de usuario y contraseña. Mirá
  [Session Management](/recipes/session-management/) y
  [JWT Authentication](/recipes/jwt-authentication/) para el flujo completo.
- Estás migrando desde MD5, SHA-1 o SHA-256 plano para almacenar contraseñas.
- Necesitás verificación de login o reset de contraseña en una web app, API o
  herramienta CLI.
- Tu marco de compliance (PCI-DSS, SOC 2, GDPR, NIST) exige proteger
  credenciales. Consultá [Checklist de Seguridad de APIs](/guides/api-security-checklist-guide/)
  para controles relacionados.

### Cuándo evitarlo

- El sistema no tiene usuarios humanos (tráfico machine-to-machine). Usá
  [API Key Authentication](/recipes/api-key-authentication/) o
  [OAuth2 Login](/recipes/oauth2-login/).
- Solo necesitás un token de un solo uso. Usá un token firmado, no un hash de
  contraseña.
- Te tentó armar tu propio esquema de hashing. Usá una biblioteca probada.

## Solución

### Python con bcrypt

```python
import bcrypt

password = b"supersecret"
salt = bcrypt.gensalt(rounds=12)
hashed = bcrypt.hashpw(password, salt)

if bcrypt.checkpw(password, hashed):
    print("ok")
```

### JavaScript (Node.js) con bcrypt

```javascript
const bcrypt = require('bcrypt');

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

hashPassword('supersecret')
  .then(hash => verifyPassword('supersecret', hash))
  .then(ok => console.log(ok));
```

### Java con BCryptPasswordEncoder

```java
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
String hashed = encoder.encode("supersecret");
boolean ok = encoder.matches("supersecret", hashed);
```

### Argon2 (Python)

```python
from argon2 import PasswordHasher

ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=1)
hash = ph.hash("supersecret")
ph.verify(hash, "supersecret")
```

### PBKDF2 (Python)

```python
import hashlib, secrets

password = b"supersecret"
salt = secrets.token_bytes(16)
iterations = 600_000
key = hashlib.pbkdf2_hmac("sha256", password, salt, iterations, dklen=32)
```

## Explicación

- **bcrypt** es un hash adaptativo basado en Blowfish. Embebe el salt y el factor
  de trabajo en el output, así que el almacenamiento es un solo string. Es el
  default más seguro para la mayoría de las aplicaciones porque hay bibliotecas en
  todos los lenguajes.
- **Argon2** se convirtió en el recomendado después de ganar el Password Hashing
  Competition de 2015. Es memory-hard, lo que encarece los ataques con GPU y ASIC
  respecto a bcrypt. Elegilo cuando el sistema sea nuevo y pueda usar una
  biblioteca más reciente.
- **PBKDF2** cuenta con aprobación NIST y compatibilidad FIPS-140. Es CPU-bound y
  ajustable mediante la cantidad de iteraciones. Usalo cuando un estándar o
  auditor lo exija.
- **Salt** es un valor aleatorio agregado a cada contraseña antes de hashear. Hace
  inútiles las tablas arcoíris y evita que contraseñas idénticas produzcan el
  mismo hash.
- **Factor de trabajo** controla la velocidad de hashing. Para bcrypt, 12 es un
  punto de partida razonable y toma unos 250ms en hardware moderno. Aumentalo a
  medida que los CPUs mejoran. Para PBKDF2, 600.000 iteraciones es la
  recomendación actual de OWASP.

## Variantes

Los tres algoritmos se diferencian en unos pocos criterios prácticos que resume
la tabla.

| Algoritmo | Cuándo elegirlo | Compromiso |
| --- | ----------------- | ------------ |
| bcrypt | Default, amplio soporte de bibliotecas | Uso moderado de memoria, no es memory-hard |
| Argon2 | Aplicaciones nuevas, máxima resistencia a ataques por hardware | Requiere biblioteca dedicada, es memory-hard |
| PBKDF2 | Requisitos de compliance NIST/FIPS | CPU-bound, más lento que bcrypt |

## Mejores Prácticas

- Hasheá del lado del servidor; nunca confíes en un hash enviado por el cliente.
  El hashing cliente-servidor puede eludirse enviando un valor precomputado.
- Usá un salt aleatorio distinto para cada contraseña. Las bibliotecas lo hacen
  automáticamente, pero verificá que no estés reutilizando ni hard-codeando un
  salt.
- Elegí un factor de trabajo que tarde al menos 100-250ms en tu hardware de
  producción, y volvé a hacer benchmark cada año. Lento es el objetivo.
- Almacená el string de hash completo, incluyendo el identificador de algoritmo,
  costo, salt y hash. No lo dividas en columnas separadas.
- Re-hasheá en el login cuando el factor de trabajo o algoritmo esté desactualizado.
  Marcá la cuenta como migrada para no hashear dos veces.
- Devolvé errores genéricos para usuario o contraseña inválidos. Si el tiempo o el
  mensaje difieren, filtran si la cuenta existe.

## Errores Comunes

- Usar SHA-256, MD5 o SHA-1 para hashear contraseñas. Están diseñados para ser
  rápidos; una GPU moderna puede probar miles de millones por segundo.
- Almacenar contraseñas en texto plano o encriptación reversible. Una filtración de
  clave expone todas las contraseñas.
- Hard-codear un salt en el código fuente. Es tan malo como no usar salt si el
  repositorio se hace público.
- Reutilizar el mismo salt entre usuarios. Las contraseñas idénticas generan hashes
  idénticos.
- Usar factores de trabajo menores a 10 para bcrypt o menos de 600.000 iteraciones
  para PBKDF2. Los atacantes pueden seguir el ritmo.
- Comparar hashes con `==` en lugar de la función verify de la biblioteca. Los
  ataques de timing pueden filtrar prefijos del hash.
- Hashear después de normalizar con `lower()` o `trim()`. Algunas passphrases
  dependen de mayúsculas y espacios.
- Dejar que bcrypt corte a 72 bytes. bcrypt ignora los bytes después de 72, así
  que dos contraseñas largas con el mismo prefijo coincidirían. Pre-hasheá con
  SHA-256 solo si realmente necesitás permitir contraseñas más largas.

## Preguntas Frecuentes

### ¿Debería usar SHA-256 para contraseñas?

No. SHA-256 es rápido y no está diseñado para resistir fuerza bruta. Usá bcrypt,
Argon2 o PBKDF2.

### ¿Cómo migro usuarios de hashes MD5 o SHA-1?

Re-hasheá el hash existente con bcrypt en el próximo login exitoso, y luego
reemplazá el valor almacenado. Marcá la cuenta para no volver a hashearla. Para
usuarios que nunca loguean, forzá un reset de contraseña.

### ¿Qué factor de costo de bcrypt debería usar?

Empezá con 12. Hacé benchmark en tu hardware de producción para que el hashing
 tarde unos 250ms. Vas a tener que volver a subir el costo a medida que los CPUs
 mejoran.

### ¿Argon2 es mejor que bcrypt?

Para sistemas nuevos, sí. Argon2 es memory-hard, lo que encarece los ataques con
GPU y ASIC. bcrypt sigue siendo seguro y más ampliamente soportado. Preferí
Argon2 si podés usar una biblioteca moderna.

### ¿Puedo usar un hash de contraseña como token de API?

No. Los hashes de contraseña son lentos. Los tokens de API necesitan verificación
rápida, como HMAC-SHA-256.

### ¿Debería agregar un pepper a la contraseña?

Un pepper es un secreto del servidor que se agrega antes de hashear. Ayuda si la
base de datos se filtra sin el secreto de la aplicación, pero complica la
rotación y el manejo de claves. Es un extra opcional, no un reemplazo de un
algoritmo fuerte.
