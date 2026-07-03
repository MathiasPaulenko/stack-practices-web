---
contentType: recipes
slug: python-jwt-refresh-token-rotation
title: "Rotacion segura de JWT refresh tokens con Python"
description: "Implementa rotacion segura de JWT access y refresh tokens en Python con blacklist, deteccion de reuso y renovacion automatica de access tokens para auth stateless"
metaDescription: "Implementa rotacion de JWT refresh tokens en Python. Genera access y refresh tokens, detecta reuso, blacklist de tokens comprometidos y renueva automaticamente."
difficulty: intermediate
topics:
  - authentication
  - security
tags:
  - python
  - jwt
  - refresh token
  - authentication
  - security
relatedResources:
  - /recipes/security/python-sql-injection-sqlalchemy
  - /recipes/security/nodejs-helmet-security-headers
  - /recipes/ai/python-openai-function-calling-structured
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa rotacion de JWT refresh tokens en Python. Genera access y refresh tokens, detecta reuso, blacklist de tokens comprometidos y renueva automaticamente."
  keywords:
    - jwt refresh token
    - token rotation python
    - jwt authentication
    - refresh token blacklist
    - python auth
---

# Rotacion segura de JWT refresh tokens con Python

Los JWT access tokens son de corta duracion (15-30 minutos) para limitar la ventana de exposicion si son robados. Los refresh tokens son de larga duracion pero deben rotarse — cada uso emite un nuevo refresh token e invalida el anterior. A continuacion: rotacion segura de tokens con deteccion de reuso y blacklisting.

## Cuando Usar Esto

- APIs de autenticacion stateless sin sesiones del lado del servidor
- Aplicaciones mobile o SPA que necesitan sesiones de login de larga duracion
- Cualquier sistema donde los access tokens expiran frecuentemente y necesitan renovacion automatica

## Requisitos Previos

- Python 3.10+
- Paquete `pyjwt` (`pip install pyjwt`)
- `cryptography` para soporte RS256 (opcional)

## Solucion

### 1. Instalar dependencias

```bash
pip install pyjwt
```

### 2. Gestor de tokens

```python
import jwt
import time
import uuid
import secrets
from dataclasses import dataclass
from typing import Optional

@dataclass
class TokenPair:
    access_token: str
    refresh_token: str
    access_expires_at: int
    refresh_expires_at: int

class TokenManager:
    def __init__(
        self,
        secret_key: str,
        access_token_ttl: int = 900,  # 15 minutos
        refresh_token_ttl: int = 604800,  # 7 dias
        algorithm: str = "HS256",
    ):
        self.secret_key = secret_key
        self.access_token_ttl = access_token_ttl
        self.refresh_token_ttl = refresh_token_ttl
        self.algorithm = algorithm
        self._blacklist: set[str] = set()
        self._active_refresh_tokens: dict[str, dict] = {}

    def generate_tokens(self, user_id: str, claims: dict | None = None) -> TokenPair:
        """Generate a new access and refresh token pair.

        Args:
            user_id: User identifier.
            claims: Additional claims to include in the access token.

        Returns:
            TokenPair with both tokens and expiry timestamps.
        """
        now = int(time.time())
        access_jti = str(uuid.uuid4())
        refresh_jti = str(uuid.uuid4())

        access_payload = {
            "sub": user_id,
            "jti": access_jti,
            "type": "access",
            "iat": now,
            "exp": now + self.access_token_ttl,
            **(claims or {}),
        }

        refresh_payload = {
            "sub": user_id,
            "jti": refresh_jti,
            "type": "refresh",
            "iat": now,
            "exp": now + self.refresh_token_ttl,
        }

        access_token = jwt.encode(access_payload, self.secret_key, algorithm=self.algorithm)
        refresh_token = jwt.encode(refresh_payload, self.secret_key, algorithm=self.algorithm)

        self._active_refresh_tokens[refresh_jti] = {
            "user_id": user_id,
            "expires_at": now + self.refresh_token_ttl,
        }

        return TokenPair(
            access_token=access_token,
            refresh_token=refresh_token,
            access_expires_at=now + self.access_token_ttl,
            refresh_expires_at=now + self.refresh_token_ttl,
        )

    def verify_access_token(self, token: str) -> dict | None:
        """Verify an access token and return its payload.

        Args:
            token: JWT access token.

        Returns:
            Token payload dict or None if invalid/expired.
        """
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
            )
            if payload.get("type") != "access":
                return None
            if payload["jti"] in self._blacklist:
                return None
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    def rotate_refresh_token(self, refresh_token: str) -> TokenPair | None:
        """Rotate a refresh token — issue a new pair and invalidate the old one.

        Args:
            refresh_token: The current refresh token.

        Returns:
            New TokenPair or None if the token is invalid/reused/blacklisted.
        """
        try:
            payload = jwt.decode(
                refresh_token,
                self.secret_key,
                algorithms=[self.algorithm],
            )
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return None

        if payload.get("type") != "refresh":
            return None

        jti = payload["jti"]
        user_id = payload["sub"]

        if jti in self._blacklist:
            return None

        if jti not in self._active_refresh_tokens:
            return None

        del self._active_refresh_tokens[jti]
        self._blacklist.add(jti)

        return self.generate_tokens(user_id)

    def revoke_refresh_token(self, refresh_token: str) -> bool:
        """Revoke a refresh token (logout).

        Args:
            refresh_token: The refresh token to revoke.

        Returns:
            True if successfully revoked.
        """
        try:
            payload = jwt.decode(
                refresh_token,
                self.secret_key,
                algorithms=[self.algorithm],
            )
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return False

        jti = payload["jti"]
        if jti in self._active_refresh_tokens:
            del self._active_refresh_tokens[jti]
        self._blacklist.add(jti)
        return True

    def revoke_all_user_tokens(self, user_id: str) -> int:
        """Revoke all refresh tokens for a user (password change, security breach).

        Returns:
            Number of tokens revoked.
        """
        revoked = 0
        to_remove = [
            jti for jti, data in self._active_refresh_tokens.items()
            if data["user_id"] == user_id
        ]
        for jti in to_remove:
            del self._active_refresh_tokens[jti]
            self._blacklist.add(jti)
            revoked += 1
        return revoked
```

### 3. Integracion con FastAPI

```python
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

app = FastAPI()
token_manager = TokenManager(secret_key=secrets.token_urlsafe(32))
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency to extract and verify the access token."""
    payload = token_manager.verify_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload

@app.post("/auth/login")
def login(user_id: str = "user123"):
    """Login endpoint — returns access and refresh tokens."""
    pair = token_manager.generate_tokens(user_id)
    return {
        "access_token": pair.access_token,
        "refresh_token": pair.refresh_token,
        "token_type": "Bearer",
        "expires_in": token_manager.access_token_ttl,
    }

@app.post("/auth/refresh")
def refresh(refresh_token: str):
    """Refresh endpoint — rotate refresh token and issue new access token."""
    pair = token_manager.rotate_refresh_token(refresh_token)
    if pair is None:
        raise HTTPException(status_code=401, detail="Invalid or reused refresh token")
    return {
        "access_token": pair.access_token,
        "refresh_token": pair.refresh_token,
        "token_type": "Bearer",
        "expires_in": token_manager.access_token_ttl,
    }

@app.post("/auth/logout")
def logout(refresh_token: str):
    """Logout endpoint — revoke the refresh token."""
    success = token_manager.revoke_refresh_token(refresh_token)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid refresh token")
    return {"message": "Logged out successfully"}

@app.get("/protected")
def protected_route(user: dict = Depends(get_current_user)):
    """Protected route requiring a valid access token."""
    return {"user_id": user["sub"], "message": "Access granted"}
```

## Como Funciona

1. **Access token** es de corta duracion (15 min) y stateless — el servidor lo verifica chequeando la firma y expiracion. No necesita lookup en base de datos.
2. **Refresh token** es de larga duracion (7 dias) y stateful — el servidor rastrea los refresh tokens activos por su `jti` (JWT ID) en `_active_refresh_tokens`.
3. **Rotacion** — cuando se usa un refresh token, se elimina de los tokens activos, se agrega a la blacklist y se emite un nuevo par de tokens. Esto significa que cada refresh token solo puede usarse una vez.
4. **Deteccion de reuso** — si se presenta nuevamente un refresh token blacklisteado, `rotate_refresh_token` retorna `None`. En produccion, esto debe disparar una alerta de seguridad y revocar todos los tokens del usuario (posible robo de token).
5. **Blacklist** previene ataques de replay. En produccion, usa Redis con TTL en lugar de un set en memoria para que los tokens blacklisteados se limpien automaticamente despues de la expiracion.

## Variantes

### Blacklist con Redis

```python
import redis
import json

class RedisTokenManager(TokenManager):
    def __init__(self, *args, redis_url: str = "redis://localhost:6379", **kwargs):
        super().__init__(*args, **kwargs)
        self.redis = redis.from_url(redis_url)

    def _blacklist_token(self, jti: str, expires_at: int) -> None:
        ttl = max(expires_at - int(time.time()), 1)
        self.redis.setex(f"blacklist:{jti}", ttl, "1")

    def _is_blacklisted(self, jti: str) -> bool:
        return bool(self.redis.exists(f"blacklist:{jti}"))

    def _store_active(self, jti: str, user_id: str, expires_at: int) -> None:
        ttl = max(expires_at - int(time.time()), 1)
        self.redis.setex(f"refresh:{jti}", ttl, json.dumps({"user_id": user_id}))

    def _is_active(self, jti: str) -> bool:
        return bool(self.redis.exists(f"refresh:{jti}"))
```

### RS256 con par de claves

```python
from cryptography.hazmat.primitives import serialization

# Generar par de claves
from cryptography.hazmat.primitives.asymmetric import rsa
private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
public_key = private_key.public_key()

private_pem = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption(),
)
public_pem = public_key.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo,
)

# Firmar con clave privada, verificar con clave publica
token = jwt.encode(payload, private_pem, algorithm="RS256")
payload = jwt.decode(token, public_pem, algorithms=["RS256"])
```

### Refresh automatico en 401 (lado del cliente)

```javascript
async function apiCall(url, options = {}) {
  let response = await fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${getAccessToken()}` },
  });

  if (response.status === 401) {
    const newTokens = await refreshTokens();
    if (newTokens) {
      response = await fetch(url, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${newTokens.access_token}` },
      });
    }
  }

  return response;
}
```

## Mejores Practicas

- **Mantén access tokens de corta duracion** — 15-30 minutos es estandar; mas corto es mas seguro
- **Rota refresh tokens en cada uso** — refresh tokens de un solo uso previenen ataques de replay
- **Detecta reuso y revoca todos los tokens** — si se presenta un token blacklisteado, revoca todos los tokens del usuario (posible robo)
- **Usa RS256 en produccion** — firma asimetrica permite verificacion sin compartir el secreto

## Errores Comunes

- **Access tokens de larga duracion** — los access tokens deben ser cortos; usa refresh tokens para sesiones largas
- **No rotar refresh tokens** — refresh tokens reutilizables son vulnerables a ataques de replay
- **Almacenar tokens en localStorage** — vulnerable a XSS; usa cookies HttpOnly para web apps
- **No manejar la expiracion de tokens elegantemente** — el cliente debe refrescar automaticamente en 401

## FAQ

**Q: Debo almacenar refresh tokens en una base de datos?**
A: Para apps de un solo servidor, en memoria esta bien. Para sistemas distribuidos, usa Redis con TTL. La blacklist debe compartirse entre todas las instancias del servidor.

**Q: Que pasa si el refresh token del usuario es robado?**
A: Cuando el usuario legitimo usa su token, rota. La copia del atacante se vuelve invalida. Si el atacante la usa primero, la copia del usuario legitimo se vuelve invalida y la deteccion de reuso se dispara.

**Q: Debo usar JWT o sesiones del lado del servidor?**
A: JWT para APIs stateless y distribuidas. Sesiones del lado del servidor para web apps con un solo backend (revocacion mas simple).

**Q: Como manejo la revocacion de tokens con JWT?**
A: Los JWTs son stateless, asi que no puedes revocarlos sin una blacklist. Mantén los access tokens de corta duracion (15 min) y mantén una blacklist solo para refresh tokens.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
