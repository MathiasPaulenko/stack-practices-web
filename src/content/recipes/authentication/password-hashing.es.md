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
  - authentication
  - bcrypt
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/handle-errors
  - /patterns/design/singleton-pattern
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
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

Las consecuencias de hacer esto mal son severas. Las filtraciones de datos que involucran contraseñas en texto plano o hashes débiles exponen millones de cuentas de usuario a ataques de credential stuffing, donde los atacantes prueban contraseñas filtradas en otros servicios. Filtraciones de alto perfil han demostrado que incluso organizaciones grandes son víctimas de almacenamiento incorrecto de contraseñas. El hashing no es una decoración opcional — es un control de seguridad fundamental que protege a tus usuarios incluso cuando tu base de datos es comprometida.

Esta receta cubre los tres ecosistemas de lenguaje más comunes y explica cómo elegir el algoritmo correcto para tu modelo de amenazas.

## Cuándo usarlo

Usa esta recipe cuando:

- Almacenas credenciales de usuario en una base de datos o directorio de usuarios
- Implementas sistemas de autenticación con flujos de usuario y contraseña
- Migras sistemas legacy desde hashes rápidos (MD5, SHA-1) a almacenamiento moderno de contraseñas
- Validas contraseñas durante el login y los flujos de reset de contraseña
- Cumples con estándares de seguridad (PCI-DSS, SOC 2, GDPR) que mandatan protección adecuada de credenciales
- Construyes paneles de administración o herramientas CLI que crean cuentas de servicio con contraseñas

## Solución

### Python

La librería `bcrypt` de Python maneja generación de salt, hashing y verificación en una sola llamada. La función `gensalt` crea un salt aleatorio y embebe el factor de trabajo para que futuras verificaciones puedan usar los mismos parámetros.

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

El paquete npm `bcrypt` proporciona una API async que siempre debe usarse en producción. Las variantes síncronas bloquean el event loop y anulan los beneficios de rendimiento de la arquitectura non-blocking de Node.

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

El `BCryptPasswordEncoder` de Spring Security envuelve la implementación subyacente de bcrypt y maneja la generación de salt de forma transparente. El parámetro de strength (12) controla el factor de trabajo logarítmico.

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

- **Salt**: Un valor aleatorio agregado a la contraseña antes de hashear. Incluso contraseñas idénticas producen hashes diferentes cuando están salteadas, haciendo inútiles los ataques de tablas arcoíris precomputadas. bcrypt embebe el salt en el string de output, por lo que no se necesita almacenamiento separado.
- **Factor de trabajo (rounds)**: Controla la velocidad de hashing logarítmicamente. Mayor = más lento = más seguro. 12 es un default moderno que produce un hash en aproximadamente 250ms en hardware contemporáneo. A medida que las computadoras se vuelven más rápidas, deberías aumentar este valor.
- **bcrypt**: Función de hash adaptativa basada en el cifrado Blowfish. Manejo de salt incorporado y factor de trabajo ajustable lo hacen la opción moderna más ampliamente soportada.
- **Argon2**: Ganador del Password Hashing Competition de 2015. Proporciona resistencia contra ataques GPU y ASIC al ser memory-hard, haciéndolo la mejor opción para sistemas nuevos sin restricciones legacy.
- **PBKDF2**: Aprobado por NIST y compatible con FIPS. Más lento que bcrypt pero ampliamente soportado en entornos empresariales y gubernamentales donde el cumplimiento lo manda.
- **scrypt**: Función memory-hard similar a Argon2. Fue el predecesor de Argon2 y sigue siendo una opción sólida si las librerías de Argon2 no están disponibles en tu stack.

## Variantes

| Algoritmo | Fortaleza | Velocidad | Mejor para |
|-----------|-----------|-----------|------------|
| bcrypt | Buena | Moderada | Uso general, ampliamente soportado |
| Argon2 | Excelente | Ajustable | Nuevas aplicaciones, máxima seguridad |
| PBKDF2 | Buena | Lenta | Cumplimiento NIST/FIPS |
| scrypt | Buena | Memory-hard | Resiste ataques GPU/ASIC |

## Mejores prácticas

- **Nunca inventes tu propia criptografía**: Usa librerías establecidas (bcrypt, argon2, passlib). La criptografía es notoriamente fácil de hacer mal de formas sutiles que solo se hacen evidentes bajo ataque.
- **Usa siempre salt**: Único por contraseña, manejado automáticamente por bcrypt. Sin salt, dos usuarios con la misma contraseña tendrán hashes idénticos, filtrando esa relación a cualquiera con acceso a la base de datos.
- **Usa un factor de trabajo suficiente**: 12+ rounds para bcrypt, ajusta según el hardware. Haz benchmark de tu duración objetivo (~250ms) y aumenta el factor cada 2-3 años a medida que los CPUs se vuelven más rápidos.
- **Re-hashea en login**: Actualiza gradualmente los factores de trabajo cuando los usuarios se autentican. Almacena el nuevo hash y marca la cuenta como actualizada para no re-hashear de nuevo en el próximo login.
- **Nunca compares en texto plano**: Usa siempre funciones de verificación de la librería. Estas realizan comparación en tiempo constante para prevenir ataques de timing que podrían filtrar información sobre la contraseña.
- **Hashea antes de cualquier otra transformación**: No apliques lowercase, trim u otra normalización antes de hashear. Algunos usuarios intencionalmente incluyen mayúsculas y espacios en passphrases.
- **Almacena hashes en una columna dedicada**: Nunca almacenes el salt separado del hash. bcrypt y Argon2 codifican el salt dentro del string de hash por esta razón.

## Errores comunes

- **Almacenar contraseñas en texto plano o encriptación reversible**: Si tu base de datos es filtrada, los atacantes obtienen acceso inmediato a cada cuenta. El hashing es irreversible por diseño.
- **Usar hashes rápidos como MD5, SHA-1 o SHA-256 para contraseñas**: Estos están diseñados para ser rápidos, lo que beneficia a los atacantes ejecutando ataques de fuerza bruta. Una GPU moderna puede probar miles de millones de hashes SHA-256 por segundo.
- **Reutilizar salts entre múltiples usuarios**: Anula el propósito principal del salting. Si dos usuarios comparten la misma contraseña y el mismo salt, sus hashes serán idénticos.
- **Hard-codear salts en el código fuente**: El código fuente a menudo se almacena en control de versiones. Un salt hard-codeado es tan malo como no tener salt, ya que los atacantes lo encontrarán en el repositorio.
- **Usar factores de trabajo insuficientes (ej. bcrypt con <10 rounds)**: Hashes más rápidos significan que los atacantes pueden probar más contraseñas por segundo. Un factor de trabajo de 10 completa en ~100ms; 12 completa en ~250ms. Ese delay extra agrega protección masiva a un costo de usuario negligible.
- **Almacenar el hash sin el identificador de algoritmo**: Almacena siempre el string de output completo de bcrypt/Argon2 que incluye el algoritmo, costo, salt y hash. Esto asegura que puedas re-verificar correctamente incluso si cambias de algoritmo más adelante.
- **Enviar contraseñas sobre conexiones no encriptadas**: El hashing protege las contraseñas almacenadas, pero la contraseña debe viajar de forma segura a tu servidor primero. Usa siempre TLS para formularios de login y endpoints de API.

## Preguntas frecuentes

**P: ¿Debería usar SHA-256 para hashear contraseñas?**
R: No. SHA-256 está diseñado para ser rápido. El hashing de contraseñas debe ser intencionalmente lento para resistir fuerza bruta. Usa bcrypt, Argon2 o PBKDF2 en su lugar.

**P: ¿Cómo migro usuarios de hashes MD5 antiguos?**
R: Re-hashea los hashes MD5 existentes con bcrypt en el próximo login, luego reemplaza el hash viejo en tu base de datos. Marca las cuentas migradas para no intentar re-hashearlas de nuevo. Hasta que un usuario haga login, su hash legacy permanece en su lugar como medida provisional.

**P: ¿Qué factor de trabajo debo usar para bcrypt?**
R: Empieza con 12. Haz benchmarking para que el hashing tarde ~250ms en tu hardware de producción. Aumenta el factor cada 2-3 años a medida que los CPUs se vuelven más rápidos. El cuarto de segundo extra es imperceptible para los usuarios pero aumenta dramáticamente el costo del ataque.

**P: ¿Es Argon2 mejor que bcrypt?**
R: Sí, para sistemas nuevos. Argon2 es memory-hard, haciendo los ataques GPU y ASIC mucho más caros. Sin embargo, bcrypt sigue siendo perfectamente seguro para la mayoría de aplicaciones y tiene soporte de librerías más amplio. Si no tienes datos legacy, prefiere Argon2.

**P: ¿Puedo usar el mismo hash tanto para autenticación como para tokens de API?**
R: No. Los hashes de autenticación son lentos por diseño. Los tokens de API deberían usar hashes rápidos y deterministas (como HMAC-SHA-256) porque se verifican en cada petición y no deben agregar latencia a cada llamada de API.
