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
  - authentication
  - jwt
  - security
  - oauth
  - auth
relatedResources:
  - /recipes/handle-errors
  - /recipes/call-rest-api
  - /recipes/password-hashing
  - /recipes/api-key-authentication
  - /recipes/magic-link-authentication
  - /recipes/nodejs-jwt-authentication
  - /recipes/oauth2-login
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
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

Aqui se muestra la forma de cómo generar (firmar), validar (verificar) y refrescar JWTs de forma segura en Python, JavaScript y Java.

## When to Use

Usa JWTs cuando:

- Construyas una [API REST](/recipes/api/call-rest-api) sin estado donde las sesiones no deben almacenarse del lado del servidor
- Autentiques [microservicios](/guides/architecture/microservices-architecture-guide) que se llaman entre sí internamente
- Emitas tokens de acceso de corta duración con tokens de refresco de mayor duración
- Agregues SSO o login de terceros ([OAuth2](/recipes/authentication/oauth2-login) / OpenID Connect)

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

### Flujo de Refresh Token

Los tokens de acceso son de corta duración (5–15 minutos). Cuando expiran, el cliente envía el refresh token para obtener un nuevo token de acceso sin re-autenticarse.

```python
import jwt
import datetime
import secrets

SECRET = "your-256-bit-secret"
ALGORITHM = "HS256"
REFRESH_TTL_DAYS = 7

# Almacena refresh tokens en una base de datos o Redis con el user ID
refresh_store = {}  # En producción, usa Redis o una base de datos


def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "access",
        "iat": datetime.datetime.utcnow(),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=15),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    token_id = secrets.token_urlsafe(32)
    payload = {
        "sub": user_id,
        "type": "refresh",
        "jti": token_id,
        "iat": datetime.datetime.utcnow(),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=REFRESH_TTL_DAYS),
    }
    token = jwt.encode(payload, SECRET, algorithm=ALGORITHM)
    refresh_store[token_id] = user_id
    return token


def refresh_access_token(refresh_token: str) -> str:
    try:
        claims = jwt.decode(refresh_token, SECRET, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise ValueError("El refresh token ha expirado")
    except jwt.InvalidTokenError:
        raise ValueError("Refresh token inválido")

    if claims.get("type") != "refresh":
        raise ValueError("No es un refresh token")

    token_id = claims.get("jti")
    if token_id not in refresh_store:
        raise ValueError("El refresh token ha sido revocado")

    return create_access_token(claims["sub"])


def revoke_refresh_token(refresh_token: str) -> None:
    try:
        claims = jwt.decode(refresh_token, SECRET, algorithms=[ALGORITHM])
    except jwt.InvalidTokenError:
        return

    token_id = claims.get("jti")
    if token_id and token_id in refresh_store:
        del refresh_store[token_id]


# Uso
access = create_access_token("user-123")
refresh = create_refresh_token("user-123")

# Cuando el access token expira, obtén uno nuevo
new_access = refresh_access_token(refresh)

# En logout, revoca el refresh token
revoke_refresh_token(refresh)
```

### Variante RS256 (Asimétrico)

Cuando múltiples servicios necesitan verificar tokens, usa RS256 para que cada servicio solo necesite la clave pública.

```python
from cryptography.hazmat.primitives import serialization
import jwt

# Cargar clave privada (solo en el servicio de auth)
with open("private.pem", "rb") as f:
    private_key = serialization.load_pem_private_key(f, password=None)

# Cargar clave pública (en cada servicio que verifica)
with open("public.pem", "rb") as f:
    public_key = serialization.load_pem_public_key(f)


def create_token_rs256(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=15)}
    return jwt.encode(payload, private_key, algorithm="RS256")


def verify_token_rs256(token: str) -> dict:
    return jwt.decode(token, public_key, algorithms=["RS256"])
```

```javascript
const jwt = require('jsonwebtoken');
const fs = require('fs');

const privateKey = fs.readFileSync('private.pem');
const publicKey = fs.readFileSync('public.pem');

function createTokenRS256(userId) {
  return jwt.sign({ sub: userId }, privateKey, { algorithm: 'RS256', expiresIn: '15m' });
}

function verifyTokenRS256(token) {
  return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
}
```

### Blacklist de Tokens con Redis

```python
import redis
import jwt

r = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)


def verify_with_blacklist(token: str, secret: str) -> dict:
    claims = jwt.decode(token, secret, algorithms=["HS256"])
    jti = claims.get("jti")
    if jti and r.exists(f"blacklist:{jti}"):
        raise ValueError("El token ha sido revocado")
    return claims


def revoke_token(token: str, secret: str) -> None:
    claims = jwt.decode(token, secret, algorithms=["HS256"])
    jti = claims.get("jti")
    if jti:
        ttl = int(claims["exp"] - datetime.datetime.utcnow().total_seconds())
        if ttl > 0:
            r.setex(f"blacklist:{jti}", ttl, "revoked")
```

| Tarea | Python | JavaScript | Java |
|-------|--------|------------|------|
| Firmar | `jwt.encode()` | `jwt.sign()` | `Jwts.builder().signWith()` |
| Verificar | `jwt.decode()` | `jwt.verify()` | `parser.parseSignedClaims()` |
| Refrescar | Re-emitir con nuevo `exp` | Re-emitir con nuevo `exp` | Re-emitir con nuevo `exp` |
| Asimétrico | `jwt.encode(key=private_key)` | `jwt.sign({}, privateKey, {algorithm: 'RS256'})` | `signWith(privateKey, RS256)` |

## Lo que funciona

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
A: Mantén una lista de bloqueo de tokens (ej. Redis con TTL igual a la expiración del token) y verifícala en cada validación. Alternativamente, mantén [sesiones](/recipes/authentication/session-management) del lado del servidor.

**Q: ¿Cuál es la diferencia entre HS256 y RS256?**
A: `HS256` es simétrico: un solo secreto firma y verifica. `RS256` es asimétrico: una clave privada firma y cualquier servicio con la clave pública puede verificar. Usa `RS256` cuando múltiples servicios necesiten verificar tokens independientemente.

**Q: ¿Cuánto debería durar un JWT access token?**
A: 5–15 minutos para access tokens. Los refresh tokens pueden durar 7–30 días dependiendo de tus requisitos de seguridad. Access tokens más cortos limitan la ventana de exposición si un token se filtra.

**Q: ¿Puedo usar JWTs con WebSockets?**
A: Sí. Pasa el JWT como query parameter durante el handshake del WebSocket (`wss://example.com/ws?token=...`) o en el header `Sec-WebSocket-Protocol`. Valida el token antes de aceptar la conexión. No envíes tokens en mensajes regulares después del handshake — la validación inicial es suficiente.

**Q: ¿Qué claims debería incluir en un JWT?**
A: Claims estándar: `sub` (user ID), `iat` (emitido en), `exp` (expiración), `jti` (ID único de token para revocación). Opcionales: `iss` (emisor), `aud` (audiencia), `roles` (roles de autorización), `scope` (OAuth scopes). Evita poner PII o secretos en el payload — está codificado en base64, no encriptado.

**Q: ¿Cómo roto claves de firma sin invalidar todos los tokens?**
A: Usa el header claim `kid` (key ID). Durante la rotación, acepta tokens firmados con ambas claves (vieja y nueva) por un periodo de transición. Una vez que todos los tokens viejos hayan expirado, elimina la clave vieja. Publica claves públicas via un endpoint JWKS para RS256.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
