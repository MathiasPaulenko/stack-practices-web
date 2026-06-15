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
  - /recipes/password-hashing
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

This recipe shows how to generate (sign), validate (verify), and refresh JWTs safely in Python, JavaScript, and Java.

## When to Use

Use JWTs when:

- Building a stateless REST API where sessions should not be stored server-side
- Authenticating microservices that call each other internally
- Issuing short-lived access tokens with separate long-lived refresh tokens
- Adding SSO or third-party login (OAuth2 / OpenID Connect)

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

| Task | Python | JavaScript | Java |
|------|--------|------------|------|
| Sign | `jwt.encode()` | `jwt.sign()` | `Jwts.builder().signWith()` |
| Verify | `jwt.decode()` | `jwt.verify()` | `parser.parseSignedClaims()` |
| Refresh | Re-issue with new `exp` | Re-issue with new `exp` | Re-issue with new `exp` |
| Asymmetric | `jwt.encode(key=private_key)` | `jwt.sign({}, privateKey, {algorithm: 'RS256'})` | `signWith(privateKey, RS256)` |

## Best Practices

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
A: Maintain a token blocklist (e.g., Redis with TTL matching token expiry) and check it on every verification. Alternatively, keep sessions server-side.

**Q: What is the difference between HS256 and RS256?**
A: `HS256` is symmetric: one secret signs and verifies. `RS256` is asymmetric: a private key signs, and any service with the public key can verify. Use `RS256` when multiple services need to verify tokens independently.
