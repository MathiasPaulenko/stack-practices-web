---
contentType: docs
slug: api-authentication-design-template
templateType: guideline
title: "API Authentication Design Template"
description: "Template for documenting API authentication flows and token lifecycle: auth scheme selection, token types, issuance, validation, refresh, revocation, MFA, OAuth2 flows, JWT configuration, and security best practices with code examples."
metaDescription: "API authentication design template: auth schemes, token lifecycle, JWT config, OAuth2 flows, refresh, revocation, MFA, security best practices with code."
difficulty: advanced
topics:
  - security
tags:
  - authentication
  - api-security
  - jwt
  - oauth2
  - token-lifecycle
  - authorization
relatedResources:
  - /docs/security/owasp-top-10-remediation-checklist
  - /docs/security/secrets-rotation-runbook
  - /docs/security/security-review-checklist-for-prs
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "API authentication design template: auth schemes, token lifecycle, JWT config, OAuth2 flows, refresh, revocation, MFA, security best practices with code."
  keywords:
    - api authentication
    - jwt configuration
    - oauth2 flows
    - token lifecycle
    - api security
    - bearer token
    - mfa implementation
---

## Overview

This template documents the authentication design for an API. It covers auth scheme selection, token types, issuance, validation, refresh, revocation, MFA integration, and security best practices. Use this template when designing a new API authentication system or reviewing an existing one.

---

## 1. Auth Scheme Selection

### 1.1 Scheme Comparison

```text
Scheme              | Best for                    | Token lifetime | State
────────────────────┼─────────────────────────────┼────────────────┼──────────
Bearer JWT          | Stateless APIs, microservices| Short (15min)  | Stateless
Opaque token        | Stateful APIs, web apps     | Medium (1h)    | Stateful
API key             | Service-to-service, dev     | Long (90d)     | Stateful
OAuth2 access token | Third-party access          | Short (1h)     | Varies
mTLS                | Service mesh, zero-trust    | Connection     | Stateless
```

### 1.2 Decision Matrix

```text
Requirement                | Recommended scheme
───────────────────────────┼──────────────────────────────
Stateless microservices    | Bearer JWT (RS256)
Web application (SSR)      | Opaque token + session cookie
Mobile app                | OAuth2 + PKCE + refresh token
Service-to-service         | mTLS or API key
Third-party integration    | OAuth2 client credentials
Machine-to-machine         | OAuth2 client credentials
Legacy system              | API key (with IP allowlist)
High-security (banking)    | mTLS + JWT + MFA
```

---

## 2. Token Lifecycle

### 2.1 Token Types

```text
Token type         | Purpose              | Lifetime    | Storage
───────────────────┼──────────────────────┼─────────────┼──────────────────────
Access token       | API authorization    | 15 min      | Memory (client-side)
Refresh token      | Get new access token | 7-30 days   | HttpOnly cookie / secure
ID token           | User identity (OIDC) | 15 min      | Memory (client-side)
API key            | Service auth         | 90 days     | Secrets manager
Session token      | Web session          | 30 min idle | Server-side store
```

### 2.2 Lifecycle Diagram

```text
1. User authenticates (username/password + MFA)
       │
       ▼
2. Server validates credentials
       │
       ▼
3. Server issues access token (JWT) + refresh token
       │
       ├── Access token → client memory (never localStorage)
       └── Refresh token → HttpOnly, Secure, SameSite=Strict cookie
       │
       ▼
4. Client sends access token in Authorization header
       │
       ▼
5. Server validates token (signature, expiry, issuer, audience)
       │
       ▼
6. Access token expires → client sends refresh token
       │
       ▼
7. Server validates refresh token → issues new access token
       │
       ▼
8. User logs out → server revokes refresh token
       │
       ▼
9. Refresh token expires or revoked → user must re-authenticate
```

---

## 3. JWT Configuration

### 3.1 JWT Structure

```text
Header:
{
  "alg": "RS256",     # Signing algorithm (never none or HS256 for distributed)
  "typ": "JWT",
  "kid": "key-v2"     # Key ID for key rotation
}

Payload (claims):
{
  "iss": "https://auth.example.com",    # Issuer
  "sub": "user-12345",                   # Subject (user ID)
  "aud": ["api.example.com"],            # Audience
  "exp": 1719900000,                     # Expiration (Unix timestamp)
  "iat": 1719899100,                     # Issued at
  "nbf": 1719899100,                     # Not before
  "jti": "token-uuid-123",              # JWT ID (for revocation)
  "scope": "read:orders write:orders",  # Scopes/permissions
  "roles": ["user", "customer"],
  "ip": "192.168.1.100"                 # Binding (optional)
}

Signature:
RS256(header + "." + payload, private_key)
```

### 3.2 JWT Issuance (Python)

```python
import jwt
from datetime import datetime, timedelta, timezone
from cryptography.hazmat.primitives import serialization

def issue_access_token(user_id: str, scopes: list[str]) -> str:
    private_key = load_private_key()  # From secrets manager

    now = datetime.now(timezone.utc)
    payload = {
        'iss': 'https://auth.example.com',
        'sub': user_id,
        'aud': ['api.example.com'],
        'exp': now + timedelta(minutes=15),
        'iat': now,
        'nbf': now,
        'jti': str(uuid.uuid4()),
        'scope': ' '.join(scopes),
    }

    return jwt.encode(
        payload,
        private_key,
        algorithm='RS256',
        headers={'kid': 'key-v2'},
    )

def issue_refresh_token(user_id: str) -> str:
    # Refresh token is opaque (not JWT) — stored server-side
    token = secrets.token_urlsafe(48)
    store_refresh_token(token, user_id, expires_in=timedelta(days=7))
    return token
```

### 3.3 JWT Validation (Python)

```python
import jwt
from jwt import PyJWKClient

# Fetch public keys from JWKS endpoint
jwks_client = PyJWKClient('https://auth.example.com/.well-known/jwks.json')

def validate_access_token(token: str) -> dict:
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=['RS256'],
            audience='api.example.com',
            issuer='https://auth.example.com',
            options={
                'verify_exp': True,
                'verify_iat': True,
                'verify_aud': True,
                'verify_iss': True,
            },
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthError('Token expired')
    except jwt.InvalidAudienceError:
        raise AuthError('Invalid audience')
    except jwt.InvalidIssuerError:
        raise AuthError('Invalid issuer')
    except jwt.InvalidTokenError:
        raise AuthError('Invalid token')
```

---

## 4. OAuth2 Flows

### 4.1 Flow Selection

```text
Flow                    | Use case                    | Token returned via
────────────────────────┼─────────────────────────────┼──────────────────────
Authorization Code      | Web app (server-side)       | Code exchange
Authorization Code + PKCE| Mobile / SPA               | Code exchange + verifier
Client Credentials      | Service-to-service          | Direct (no user)
Resource Owner Password | Legacy (not recommended)    | Direct
Device Code             | TV, IoT, CLI                | Device polling
Implicit                | DEPRECATED                  | URL fragment
```

### 4.2 Authorization Code + PKCE (SPA/Mobile)

```javascript
// Step 1: Generate PKCE verifier and challenge
const verifier = generateRandomString(64);
const challenge = await sha256(verifier).then(base64urlEncode);
const state = generateRandomString(32);

// Step 2: Redirect to authorization endpoint
const authUrl = new URL('https://auth.example.com/authorize');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', 'my-client-id');
authUrl.searchParams.set('redirect_uri', 'https://app.example.com/callback');
authUrl.searchParams.set('scope', 'openid profile read:orders');
authUrl.searchParams.set('state', state);
authUrl.searchParams.set('code_challenge', challenge);
authUrl.searchParams.set('code_challenge_method', 'S256');

window.location.href = authUrl.toString();

// Step 3: Exchange code for tokens (in callback)
const response = await fetch('https://auth.example.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: 'my-client-id',
        code: authCode,
        redirect_uri: 'https://app.example.com/callback',
        code_verifier: verifier,  // PKCE verifier from step 1
    }),
});

const { access_token, refresh_token, id_token, expires_in } = await response.json();
```

### 4.3 Client Credentials (Service-to-Service)

```python
import requests

def get_service_token() -> str:
    response = requests.post('https://auth.example.com/token', data={
        'grant_type': 'client_credentials',
        'client_id': 'payment-service',
        'client_secret': get_secret('payment-service-secret'),
        'scope': 'read:orders write:orders',
    })
    token_data = response.json()
    return token_data['access_token']
```

---

## 5. Token Refresh

### 5.1 Refresh Flow

```python
from flask import request, response, jsonify

@app.route('/auth/refresh', methods=['POST'])
def refresh_token():
    refresh_token = request.cookies.get('refresh_token')
    if not refresh_token:
        return jsonify({'error': 'no refresh token'}), 401

    # Validate refresh token server-side
    stored = get_refresh_token(refresh_token)
    if not stored or stored.is_expired() or stored.is_revoked():
        return jsonify({'error': 'invalid refresh token'}), 401

    # Check token rotation — old token should be invalidated
    if stored.used:
        # Possible token theft — revoke all tokens for this user
        revoke_all_tokens(stored.user_id)
        return jsonify({'error': 'token reuse detected'}), 401

    # Issue new access token
    new_access = issue_access_token(stored.user_id, stored.scopes)

    # Rotate refresh token (issue new, revoke old)
    new_refresh = issue_refresh_token(stored.user_id)
    revoke_refresh_token(refresh_token)

    resp = jsonify({'access_token': new_access})
    resp.set_cookie(
        'refresh_token',
        new_refresh,
        httponly=True,
        secure=True,
        samesite='Strict',
        max_age=7 * 24 * 3600,
        path='/auth/refresh',
    )
    return resp
```

---

## 6. Token Revocation

### 6.1 Revocation Strategies

```text
Strategy              | How it works                       | Tradeoff
──────────────────────┼────────────────────────────────────┼──────────────────────
Short expiry          | Token expires in 15 min            | Frequent refresh
Blocklist (jti)       | Store revoked jti in Redis         | Stateful, check on every request
Token versioning      | User has token_version, increment  | Invalidates all tokens at once
Refresh token revoke  | Revoke refresh, access expires soon| Delayed revocation
Session destroy       | Delete server-side session         | Immediate for session tokens
```

### 6.2 Blocklist Implementation

```python
import redis
import time

r = redis.Redis(host='redis', port=6379, db=0)

def revoke_token(jti: str, exp: int):
    # Store jti in Redis with TTL matching token expiry
    ttl = exp - int(time.time())
    if ttl > 0:
        r.setex(f'revoked:{jti}', ttl, '1')

def is_token_revoked(jti: str) -> bool:
    return r.exists(f'revoked:{jti}') > 0

# In token validation
def validate_access_token(token: str) -> dict:
    payload = decode_jwt(token)
    if is_token_revoked(payload['jti']):
        raise AuthError('Token revoked')
    return payload
```

---

## 7. Security Best Practices

### 7.1 Checklist

```text
Token storage:
  - [ ] Access tokens in memory only (never localStorage)
  - [ ] Refresh tokens in HttpOnly, Secure, SameSite cookie
  - [ ] Never store tokens in URL parameters
  - [ ] Clear tokens on logout

Token configuration:
  - [ ] Access token TTL: 15 minutes
  - [ ] Refresh token TTL: 7-30 days
  - [ ] Use RS256 or ES256 (asymmetric) for JWT signing
  - [ ] Never use 'none' algorithm
  - [ ] Set issuer, audience, and verify on validation
  - [ ] Include jti for revocation support
  - [ ] Rotate signing keys regularly

Transport security:
  - [ ] All token exchange over HTTPS only
  - [ ] Set HSTS header
  - [ ] Reject non-HTTPS redirects

Attack prevention:
  - [ ] Implement rate limiting on auth endpoints
  - [ ] Account lockout after failed attempts
  - [ ] CSRF protection on cookie-based endpoints
  - [ ] PKCE for all public clients (SPA, mobile)
  - [ ] Validate redirect_uri against allowlist
  - [ ] Use state parameter to prevent CSRF in OAuth2
  - [ ] Implement token rotation for refresh tokens
  - [ ] Detect refresh token reuse (revoke all on reuse)
```

## FAQ

### Should I use JWT or opaque tokens?

Use JWT for stateless APIs where you want to avoid a database lookup on every request — the token contains all claims and is verified by signature. Use opaque tokens (random strings stored server-side) for web applications where you need immediate revocation, session management, or don't want token contents exposed to the client. JWT is better for microservices and distributed systems. Opaque tokens are better for single-server applications and when you need real-time revocation. You can also combine both: use JWT as a short-lived access token and opaque tokens as long-lived refresh tokens.

### How do I revoke a JWT before it expires?

JWTs are stateless — once issued, they are valid until expiry. To support revocation, use a blocklist: store the JWT ID (jti) of revoked tokens in Redis with a TTL matching the token's remaining lifetime. Check the blocklist on every request. This adds a Redis lookup but enables immediate revocation. Alternatively, use short access token TTLs (5-15 minutes) and revoke the refresh token — the access token expires soon anyway. For full revocation, increment a user's token_version and include it in the JWT — any token with an old version is rejected.

### What is PKCE and why do I need it?

PKCE (Proof Key for Code Exchange) prevents authorization code interception attacks in OAuth2. The client generates a code verifier (random string) and sends its hash (code challenge) to the authorization server. When exchanging the code for tokens, the client sends the original verifier. The server validates that the verifier matches the challenge. This proves the token requester is the same as the one who started the flow. PKCE is mandatory for public clients (SPA, mobile apps) that cannot keep a client secret secure. Even for confidential clients, PKCE adds defense in depth.

### How should I store tokens on the client side?

Store access tokens in memory (JavaScript variable) — they are short-lived and lost on page refresh, which is acceptable. Store refresh tokens in an HttpOnly, Secure, SameSite=Strict cookie — this prevents JavaScript access (XSS protection) and cross-site request forgery (CSRF protection). Never store tokens in localStorage or sessionStorage — they are accessible to JavaScript and vulnerable to XSS attacks. Never put tokens in URL parameters — they can be logged by proxies and browsers. For mobile apps, use the platform's secure storage (Keychain on iOS, Keystore on Android).

### How do I implement MFA in my authentication flow?

After validating username and password, require a second factor before issuing tokens. Options: TOTP (Google Authenticator, Authy) — user enters a 6-digit code from their authenticator app. SMS OTP — send a code via SMS (less secure, SIM swapping risk). WebAuthn / FIDO2 — hardware key or biometric (most secure). Push notification — approve on a mobile device. After MFA verification, issue access and refresh tokens with an `mfa_verified: true` claim. Require re-verification for sensitive operations (password change, money transfer) even if the token has the claim. Store the MFA enrollment (secret key for TOTP, device token for push) encrypted at rest.
