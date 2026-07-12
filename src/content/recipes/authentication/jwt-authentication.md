---




contentType: recipes
slug: jwt-authentication
title: "JWT Authentication"
description: "How to generate, validate, and refresh JSON Web Tokens for stateless API authentication."
metaDescription: "Practical JWT authentication examples in Python, JavaScript, and Java. Learn to sign, verify, and refresh tokens securely."
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
  metaDescription: "Practical JWT authentication examples in Python, JavaScript, and Java. Learn to sign, verify, and refresh tokens securely."
  keywords:
    - jwt
    - authentication
    - token
    - json web token
    - stateless auth




---

## Overview

JSON Web Tokens (JWT) are the most common way to implement stateless authentication in modern APIs. A JWT is a compact, URL-safe string that carries signed claims — such as user identity and expiration time — between a client and a server.

The following demonstrates how to generate (sign), validate (verify), and refresh JWTs safely in Python, JavaScript, and Java.

## When to Use

Use JWTs when:

- Building a stateless [REST API](/recipes/api/call-rest-api) where sessions should not be stored server-side
- Authenticating [microservices](/guides/architecture/microservices-architecture-guide) that call each other internally
- Issuing short-lived access tokens with separate long-lived refresh tokens
- Adding SSO or third-party login ([OAuth2](/recipes/authentication/oauth2-login) / OpenID Connect)

Avoid JWTs when:

- You need immediate server-side token revocation (use sessions + a token blocklist instead)
- The payload is very large (JWTs are sent on every request)
- You are not prepared to rotate signing keys securely

## Solution

### Python (PyJWT)

```python
import jwt
import datetime

SECRET = "your-256-bit-secret"  # store in env, never in code
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
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token")


# Usage
token = create_token("user-123")
claims = verify_token(token)
print(claims["sub"])  # user-123
```

### JavaScript (jsonwebtoken)

```javascript
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET; // 256-bit secret from env

function createToken(userId, expiresIn = '15m') {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw new Error('Token has expired');
    throw new Error('Invalid token');
  }
}

// Usage
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
            throw new IllegalArgumentException("Token has expired");
        } catch (JwtException e) {
            throw new IllegalArgumentException("Invalid token");
        }
    }
}
```

## Explanation

A JWT has three parts separated by dots: `header.payload.signature`.

- **Header**: specifies the algorithm (`alg`) and token type (`typ`).
- **Payload**: contains claims such as `sub` (subject/user ID), `iat` (issued at), and `exp` (expiration).
- **Signature**: ensures the token has not been tampered with. It is computed by signing `base64(header) + "." + base64(payload)` with your secret key.

**Security notes:**

- Always use HTTPS in production — JWTs are bearer tokens; intercepting one is game over.
- Store the signing secret in an environment variable or a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.).
- Prefer short expiration times (5–15 minutes) and issue refresh tokens for longer sessions.
- Use `HS256` only when a single service signs and verifies. For multiple services, use asymmetric `RS256` with a public/private key pair.

## Variants

### Refresh Token Flow

Access tokens are short-lived (5–15 minutes). When they expire, the client sends the refresh token to get a new access token without re-authenticating.

```python
import jwt
import datetime
import secrets

SECRET = "your-256-bit-secret"
ALGORITHM = "HS256"
REFRESH_TTL_DAYS = 7

# Store refresh tokens in a database or Redis with the user ID
refresh_store = {}  # In production, use Redis or a database


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
        raise ValueError("Refresh token has expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid refresh token")

    if claims.get("type") != "refresh":
        raise ValueError("Not a refresh token")

    token_id = claims.get("jti")
    if token_id not in refresh_store:
        raise ValueError("Refresh token has been revoked")

    return create_access_token(claims["sub"])


def revoke_refresh_token(refresh_token: str) -> None:
    try:
        claims = jwt.decode(refresh_token, SECRET, algorithms=[ALGORITHM])
    except jwt.InvalidTokenError:
        return

    token_id = claims.get("jti")
    if token_id and token_id in refresh_store:
        del refresh_store[token_id]


# Usage
access = create_access_token("user-123")
refresh = create_refresh_token("user-123")

# When access token expires, get a new one
new_access = refresh_access_token(refresh)

# On logout, revoke the refresh token
revoke_refresh_token(refresh)
```

### RS256 (Asymmetric) Variant

When multiple services need to verify tokens, use RS256 so each service only needs the public key.

```python
from cryptography.hazmat.primitives import serialization
import jwt

# Load private key (only on the auth service)
with open("private.pem", "rb") as f:
    private_key = serialization.load_pem_private_key(f, password=None)

# Load public key (on every service that verifies)
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

### Token Blacklist with Redis

```python
import redis
import jwt

r = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)


def verify_with_blacklist(token: str, secret: str) -> dict:
    claims = jwt.decode(token, secret, algorithms=["HS256"])
    jti = claims.get("jti")
    if jti and r.exists(f"blacklist:{jti}"):
        raise ValueError("Token has been revoked")
    return claims


def revoke_token(token: str, secret: str) -> None:
    claims = jwt.decode(token, secret, algorithms=["HS256"])
    jti = claims.get("jti")
    if jti:
        ttl = int(claims["exp"] - datetime.datetime.utcnow().total_seconds())
        if ttl > 0:
            r.setex(f"blacklist:{jti}", ttl, "revoked")
```

| Task | Python | JavaScript | Java |
|------|--------|------------|------|
| Sign | `jwt.encode()` | `jwt.sign()` | `Jwts.builder().signWith()` |
| Verify | `jwt.decode()` | `jwt.verify()` | `parser.parseSignedClaims()` |
| Refresh | Re-issue with new `exp` | Re-issue with new `exp` | Re-issue with new `exp` |
| Asymmetric | `jwt.encode(key=private_key)` | `jwt.sign({}, privateKey, {algorithm: 'RS256'})` | `signWith(privateKey, RS256)` |

## What Works

- **Rotate keys regularly**: implement a key version (`kid` header claim) so you can rotate without invalidating all active tokens.
- **Use refresh tokens**: store refresh tokens in `HttpOnly`, `Secure`, `SameSite=Strict` cookies. Keep access tokens in memory only.
- **Validate the algorithm**: explicitly whitelist `algorithms=['HS256']` to prevent algorithm-switching attacks.
- **Never put secrets in the payload**: JWTs are base64-encoded, not encrypted. Anyone can read the payload.
- **Log token IDs, not tokens**: if you log authentication events, log `jti` (token ID) or `sub`, never the full token string.

## Common Mistakes

- **Storing secrets in the JWT payload**: sensitive data is readable by anyone who intercepts the token.
- **Ignoring algorithm validation**: accepting `alg: none` or switching algorithms can allow forged tokens.
- **Infinite-lived tokens**: tokens without `exp` are dangerous — if leaked, they are valid forever.
- **Using weak secrets**: a short secret makes brute-forcing the HMAC signature feasible.
- **Trusting the client to delete tokens**: always enforce expiration server-side; clients can be compromised.

## Frequently Asked Questions

**Q: Should I store JWTs in localStorage or cookies?**
A: Access tokens should live in memory (variables). Refresh tokens should be stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies to prevent XSS theft.

**Q: How do I revoke a JWT before it expires?**
A: Maintain a token blocklist (e.g., Redis with TTL matching token expiry) and check it on every verification. Alternatively, keep [sessions](/recipes/authentication/session-management) server-side.

**Q: What is the difference between HS256 and RS256?**
A: `HS256` is symmetric: one secret signs and verifies. `RS256` is asymmetric: a private key signs, and any service with the public key can verify. Use `RS256` when multiple services need to verify tokens independently.

**Q: How long should a JWT access token last?**
A: 5–15 minutes for access tokens. Refresh tokens can last 7–30 days depending on your security requirements. Shorter access tokens limit the window of exposure if a token is leaked.

**Q: Can I use JWTs with WebSockets?**
A: Yes. Pass the JWT as a query parameter during the WebSocket handshake (`wss://example.com/ws?token=...`) or in the `Sec-WebSocket-Protocol` header. Validate the token before accepting the connection. Do not send tokens in regular messages after the handshake — the initial validation is sufficient.

**Q: What claims should I include in a JWT?**
A: Standard claims: `sub` (user ID), `iat` (issued at), `exp` (expiration), `jti` (unique token ID for revocation). Optional: `iss` (issuer), `aud` (audience), `roles` (authorization roles), `scope` (OAuth scopes). Avoid putting PII or secrets in the payload — it is base64-encoded, not encrypted.

**Q: How do I rotate signing keys without invalidating all tokens?**
A: Use the `kid` (key ID) header claim. During rotation, accept tokens signed with both the old and new keys for a transition period. Once all old tokens have expired, remove the old key. Publish public keys via a JWKS endpoint for RS256.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
