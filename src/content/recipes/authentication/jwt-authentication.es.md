---
contentType: recipes
slug: jwt-authentication
title: "Autenticación JWT"
description: "Cómo generar, validar y refrescar JSON Web Tokens para autenticación de APIs sin estado."
metaDescription: "Ejemplos prácticos de autenticación JWT en Python, JavaScript y Java. Aprende a firmar, verificar y refrescar tokens de forma segura."
difficulty: intermediate
topics:
  - authentication
tags:
  - jwt
  - authentication
  - security
  - token
  - python
  - javascript
  - java
relatedResources:
  - /recipes/handle-errors
  - /recipes/call-rest-api
lastUpdated: "2026-06-10"
author: "StackPractices"
seo:
  metaDescription: "Ejemplos prácticos de autenticación JWT en Python, JavaScript y Java. Aprende a firmar, verificar y refrescar tokens de forma segura."
  keywords:
    - jwt
    - autenticación
    - token
    - json web token
    - auth sin estado
---

## Overview

Los JSON Web Tokens (JWT) son la forma más común de implementar autenticación sin estado en APIs modernas. Un JWT es una cadena compacta y segura para URLs que transporta claims firmados — como la identidad del usuario y el tiempo de expiración — entre un cliente y un servidor.

Esta receta muestra cómo generar (firmar), validar (verificar) y refrescar JWTs de forma segura en Python, JavaScript y Java.

## When to Use

Usa JWTs cuando:

- Construyas una API REST sin estado donde las sesiones no deben almacenarse del lado del servidor
- Autentiques microservicios que se llaman entre sí internamente
- Emitas tokens de acceso de corta duración con tokens de refresco de mayor duración
- Agregues SSO o login de terceros (OAuth2 / OpenID Connect)

Evita JWTs cuando:

- Necesites revocación inmediata de tokens del lado del servidor (usa sesiones + una lista de bloqueo)
- El payload sea muy grande (los JWTs se envían en cada solicitud)
- No estés preparado para rotar claves de firma de forma segura

## Solution

### Python (PyJWT)

```python
import jwt
import datetime

SECRET = "your-256-bit-secret"  # almacenar en env, nunca en código
ALGORITHM = "HS256"


def create_token(user_id: str, expires_minutes: int = 15) -> str:
    payload = {
        "sub": user_id,
        "iat": datetime.datetime.utcnow(),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise ValueError("El token ha expirado")
    except jwt.InvalidTokenError:
        raise ValueError("Token inválido")


# Uso
token = create_token("user-123")
claims = verify_token(token)
print(claims["sub"])  # user-123
```

### JavaScript (jsonwebtoken)

```javascript
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET; // secreto de 256 bits desde env

function createToken(userId, expiresIn = '15m') {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw new Error('El token ha expirado');
    throw new Error('Token inválido');
  }
}

// Uso
const token = createToken('user-123');
const claims = verifyToken(token);
console.log(claims.sub); // user-123
```

### Java (JJWT)

```java
import io.jsonwebtoken.*;
import java.util.Date;

public class JwtUtil {
    private static final String SECRET = System.getenv("JWT_SECRET");
    private static final long ACCESS_TTL = 15 * 60 * 1000; // 15 min

    public String createToken(String userId) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + ACCESS_TTL);
        return Jwts.builder()
            .subject(userId)
            .issuedAt(now)
            .expiration(expiry)
            .signWith(SignatureAlgorithm.HS256, SECRET)
            .compact();
    }

    public Claims verifyToken(String token) {
        try {
            return Jwts.parser()
                .setSigningKey(SECRET)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        } catch (ExpiredJwtException e) {
            throw new IllegalArgumentException("El token ha expirado");
        } catch (JwtException e) {
            throw new IllegalArgumentException("Token inválido");
        }
    }
}
```

## Explanation

Un JWT tiene tres partes separadas por puntos: `header.payload.signature`.

- **Header**: especifica el algoritmo (`alg`) y tipo de token (`typ`).
- **Payload**: contiene claims como `sub` (sujeto/ID de usuario), `iat` (emitido en) y `exp` (expiración).
- **Signature**: asegura que el token no haya sido alterado. Se calcula firmando `base64(header) + "." + base64(payload)` con tu clave secreta.

**Notas de seguridad:**

- Siempre usa HTTPS en producción — los JWTs son tokens bearer; interceptar uno es catastrófico.
- Almacena la clave de firma en una variable de entorno o gestor de secretos (AWS Secrets Manager, HashiCorp Vault, etc.).
- Prefiere tiempos de expiración cortos (5–15 minutos) y emite tokens de refresco para sesiones más largas.
- Usa `HS256` solo cuando un solo servicio firme y verifique. Para múltiples servicios, usa `RS256` asimétrico con un par de claves pública/privada.

## Variants

| Tarea | Python | JavaScript | Java |
|-------|--------|------------|------|
| Firmar | `jwt.encode()` | `jwt.sign()` | `Jwts.builder().signWith()` |
| Verificar | `jwt.decode()` | `jwt.verify()` | `parser.parseSignedClaims()` |
| Refrescar | Re-emitir con nuevo `exp` | Re-emitir con nuevo `exp` | Re-emitir con nuevo `exp` |
| Asimétrico | `jwt.encode(key=private_key)` | `jwt.sign({}, privateKey, {algorithm: 'RS256'})` | `signWith(privateKey, RS256)` |

## Best Practices

- **Rota claves regularmente**: implementa una versión de clave (`kid` en el header) para poder rotar sin invalidar todos los tokens activos.
- **Usa tokens de refresco**: almacénalos en cookies `HttpOnly`, `Secure`, `SameSite=Strict`. Mantén los tokens de acceso solo en memoria.
- **Valida el algoritmo**: lista explícitamente `algorithms=['HS256']` para prevenir ataques de cambio de algoritmo.
- **Nunca pongas secretos en el payload**: los JWTs están codificados en base64, no encriptados. Cualquiera puede leer el payload.
- **Loguea IDs de token, no tokens**: si registras eventos de autenticación, loguea `jti` (ID de token) o `sub`, nunca la cadena completa del token.

## Common Mistakes

- **Almacenar secretos en el payload del JWT**: los datos sensibles son legibles por quien intercepte el token.
- **Ignorar la validación del algoritmo**: aceptar `alg: none` o cambiar algoritmos puede permitir tokens falsificados.
- **Tokens de vida infinita**: tokens sin `exp` son peligrosos — si se filtran, son válidos para siempre.
- **Usar secretos débiles**: un secreto corto hace factible la fuerza bruta de la firma HMAC.
- **Confiar en que el cliente elimine tokens**: siempre enforce la expiración del lado del servidor; los clientes pueden ser comprometidos.

## Frequently Asked Questions

**Q: ¿Debería almacenar JWTs en localStorage o cookies?**
A: Los tokens de acceso deben vivir en memoria (variables). Los tokens de refresco deben almacenarse en cookies `HttpOnly`, `Secure`, `SameSite=Strict` para prevenir robo por XSS.

**Q: ¿Cómo revoco un JWT antes de que expire?**
A: Mantén una lista de bloqueo de tokens (ej. Redis con TTL igual a la expiración del token) y verifícala en cada validación. Alternativamente, mantén sesiones del lado del servidor.

**Q: ¿Cuál es la diferencia entre HS256 y RS256?**
A: `HS256` es simétrico: un solo secreto firma y verifica. `RS256` es asimétrico: una clave privada firma y cualquier servicio con la clave pública puede verificar. Usa `RS256` cuando múltiples servicios necesiten verificar tokens independientemente.
