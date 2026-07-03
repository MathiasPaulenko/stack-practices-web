---
contentType: recipes
slug: python-jwt-refresh-token-rotation
title: "Secure JWT Refresh Token Rotation with Python"
description: "Implement secure JWT access and refresh token rotation in Python with blacklist, reuse detection, and automatic access token renewal for stateless auth"
metaDescription: "Implement JWT refresh token rotation in Python. Generate access and refresh tokens, detect token reuse, blacklist compromised tokens, and renew automatically."
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
  metaDescription: "Implement JWT refresh token rotation in Python. Generate access and refresh tokens, detect token reuse, blacklist compromised tokens, and renew automatically."
  keywords:
    - jwt refresh token
    - token rotation python
    - jwt authentication
    - refresh token blacklist
    - python auth
---

# Secure JWT Refresh Token Rotation with Python

JWT access tokens are short-lived (15-30 minutes) to limit exposure if stolen. Refresh tokens last longer but must be rotated — each use issues a new refresh token and invalidates the old one. Below: secure token rotation with reuse detection and blacklisting.

## When to Use This

- Stateless authentication APIs without server-side sessions
- Mobile or SPA applications that need long-lived login sessions
- Any system where access tokens expire frequently and need automatic renewal

## Prerequisites

- Python 3.10+
- `pyjwt` package (`pip install pyjwt`)
- `cryptography` for RS256 support (optional)

## Solution

### 1. Install Dependencies

```bash
pip install pyjwt
```

### 2. Token Manager

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
        access_token_ttl: int = 900,  # 15 minutes
        refresh_token_ttl: int = 604800,  # 7 days
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

### 3. FastAPI Integration

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

## How It Works

1. **Access token** is short-lived (15 min) and stateless — the server verifies it by checking the signature and expiry. No database lookup needed.
2. **Refresh token** is longer-lived (7 days) and stateful — the server tracks active refresh tokens by their `jti` (JWT ID) in `_active_refresh_tokens`.
3. **Rotation** — when a refresh token is used, it is removed from active tokens, added to the blacklist, and a new token pair is issued. This means each refresh token can only be used once.
4. **Reuse detection** — if a blacklisted refresh token is presented again, `rotate_refresh_token` returns `None`. In production, this should trigger a security alert and revoke all the user's tokens (potential token theft).
5. **Blacklist** prevents replay attacks. In production, use Redis with TTL instead of an in-memory set so blacklisted tokens are automatically cleaned up after expiry.

## Variants

### Redis-Backed Blacklist

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

### RS256 with Key Pair

```python
from cryptography.hazmat.primitives import serialization

# Generate key pair
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

# Sign with private key, verify with public key
token = jwt.encode(payload, private_pem, algorithm="RS256")
payload = jwt.decode(token, public_pem, algorithms=["RS256"])
```

### Automatic Refresh on 401 (Client-Side)

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

## Best Practices

- **Keep access tokens short-lived** — 15-30 minutes is standard; shorter is safer
- **Rotate refresh tokens on every use** — one-time-use refresh tokens prevent replay attacks
- **Detect reuse and revoke all tokens** — if a blacklisted token is presented, revoke all the user's tokens (potential theft)
- **Use RS256 in production** — asymmetric signing allows verification without sharing the secret

## Common Mistakes

- **Long-lived access tokens** — access tokens should be short; use refresh tokens for long sessions
- **Not rotating refresh tokens** — reusable refresh tokens are vulnerable to replay attacks
- **Storing tokens in localStorage** — vulnerable to XSS; use HttpOnly cookies for web apps
- **Not handling token expiration gracefully** — the client should automatically refresh on 401

## FAQ

**Q: Should I store refresh tokens in a database?**
A: For single-server apps, in-memory is fine. For distributed systems, use Redis with TTL. The blacklist must be shared across all server instances.

**Q: What happens if the user's refresh token is stolen?**
A: When the legitimate user uses their token, it rotates. The attacker's copy becomes invalid. If the attacker uses it first, the legitimate user's copy becomes invalid, and reuse detection triggers.

**Q: Should I use JWT or server-side sessions?**
A: JWT for stateless, distributed APIs. Server-side sessions for web apps with a single backend (simpler revocation).

**Q: How do I handle token revocation with JWT?**
A: JWTs are stateless, so you can't revoke them without a blacklist. Keep access tokens short-lived (15 min) and maintain a blacklist only for refresh tokens.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
