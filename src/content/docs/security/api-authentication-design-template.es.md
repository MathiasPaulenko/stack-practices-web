---
contentType: docs
slug: api-authentication-design-template
templateType: guideline
title: "Plantilla de Diseno de API Authentication"
description: "Plantilla para documentar API authentication flows y token lifecycle: auth scheme selection, token types, issuance, validation, refresh, revocation, MFA, OAuth2 flows, JWT configuration y security best practices con ejemplos de codigo."
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

Esta plantilla documenta el authentication design para un API. Cubre auth scheme selection, token types, issuance, validation, refresh, revocation, MFA integration y security best practices. Usa esta plantilla cuando disenes un new API authentication system o reviewees uno existing.

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
Service-to-service         | mTLS o API key
Third-party integration    | OAuth2 client credentials
Machine-to-machine         | OAuth2 client credentials
Legacy system              | API key (con IP allowlist)
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
1. User autentica (username/password + MFA)
       │
       ▼
2. Server valida credentials
       │
       ▼
3. Server issuea access token (JWT) + refresh token
       │
       ├── Access token → client memory (nunca localStorage)
       └── Refresh token → HttpOnly, Secure, SameSite=Strict cookie
       │
       ▼
4. Client sendea access token en Authorization header
       │
       ▼
5. Server valida token (signature, expiry, issuer, audience)
       │
       ▼
6. Access token expira → client sendea refresh token
       │
       ▼
7. Server valida refresh token → issuea new access token
       │
       ▼
8. User loguea out → server revokea refresh token
       │
       ▼
9. Refresh token expira o se revoked → user debe re-autenticar
```

---

## 3. JWT Configuration

### 3.1 JWT Structure

```text
Header:
{
  "alg": "RS256",     # Signing algorithm (nunca none o HS256 para distributed)
  "typ": "JWT",
  "kid": "key-v2"     # Key ID para key rotation
}

Payload (claims):
{
  "iss": "https://auth.example.com",    # Issuer
  "sub": "user-12345",                   # Subject (user ID)
  "aud": ["api.example.com"],            # Audience
  "exp": 1719900000,                     # Expiration (Unix timestamp)
  "iat": 1719899100,                     # Issued at
  "nbf": 1719899100,                     # Not before
  "jti": "token-uuid-123",              # JWT ID (para revocation)
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
    # Refresh token es opaque (no JWT) — storeado server-side
    token = secrets.token_urlsafe(48)
    store_refresh_token(token, user_id, expires_in=timedelta(days=7))
    return token
```

### 3.3 JWT Validation (Python)

```python
import jwt
from jwt import PyJWKClient

# Fetchea public keys desde JWKS endpoint
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
// Step 1: Genera PKCE verifier y challenge
const verifier = generateRandomString(64);
const challenge = await sha256(verifier).then(base64urlEncode);
const state = generateRandomString(32);

// Step 2: Redirect a authorization endpoint
const authUrl = new URL('https://auth.example.com/authorize');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', 'my-client-id');
authUrl.searchParams.set('redirect_uri', 'https://app.example.com/callback');
authUrl.searchParams.set('scope', 'openid profile read:orders');
authUrl.searchParams.set('state', state);
authUrl.searchParams.set('code_challenge', challenge);
authUrl.searchParams.set('code_challenge_method', 'S256');

window.location.href = authUrl.toString();

// Step 3: Exchangea code por tokens (en callback)
const response = await fetch('https://auth.example.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: 'my-client-id',
        code: authCode,
        redirect_uri: 'https://app.example.com/callback',
        code_verifier: verifier,  // PKCE verifier del step 1
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

    # Valida refresh token server-side
    stored = get_refresh_token(refresh_token)
    if not stored or stored.is_expired() or stored.is_revoked():
        return jsonify({'error': 'invalid refresh token'}), 401

    # Checkea token rotation — old token deberia estar invalidated
    if stored.used:
        # Possible token theft — revokea all tokens para este user
        revoke_all_tokens(stored.user_id)
        return jsonify({'error': 'token reuse detected'}), 401

    # Issuea new access token
    new_access = issue_access_token(stored.user_id, stored.scopes)

    # Rotea refresh token (issuea new, revokea old)
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
Strategy              | How funciona                       | Tradeoff
──────────────────────┼────────────────────────────────────┼──────────────────────
Short expiry          | Token expira en 15 min            | Frequent refresh
Blocklist (jti)       | Storea revoked jti en Redis        | Stateful, check en every request
Token versioning      | User tiene token_version, increment| Invalida all tokens at once
Refresh token revoke  | Revokea refresh, access expira soon| Delayed revocation
Session destroy       | Deletea server-side session        | Immediate para session tokens
```

### 6.2 Blocklist Implementation

```python
import redis
import time

r = redis.Redis(host='redis', port=6379, db=0)

def revoke_token(jti: str, exp: int):
    # Storea jti en Redis con TTL matching token expiry
    ttl = exp - int(time.time())
    if ttl > 0:
        r.setex(f'revoked:{jti}', ttl, '1')

def is_token_revoked(jti: str) -> bool:
    return r.exists(f'revoked:{jti}') > 0

# En token validation
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
  - [ ] Access tokens en memory only (nunca localStorage)
  - [ ] Refresh tokens en HttpOnly, Secure, SameSite cookie
  - [ ] Nunca storees tokens en URL parameters
  - [ ] Clearea tokens on logout

Token configuration:
  - [ ] Access token TTL: 15 minutes
  - [ ] Refresh token TTL: 7-30 days
  - [ ] Usa RS256 o ES256 (asymmetric) para JWT signing
  - [ ] Nunca uses 'none' algorithm
  - [ ] Setea issuer, audience y verify en validation
  - [ ] Incluye jti para revocation support
  - [ ] Rotea signing keys regularmente

Transport security:
  - [ ] All token exchange over HTTPS only
  - [ ] Setea HSTS header
  - [ ] Rejectea non-HTTPS redirects

Attack prevention:
  - [ ] Implementa rate limiting en auth endpoints
  - [ ] Account lockout despues de failed attempts
  - [ ] CSRF protection en cookie-based endpoints
  - [ ] PKCE para all public clients (SPA, mobile)
  - [ ] Valida redirect_uri contra allowlist
  - [ ] Usa state parameter para prevenir CSRF en OAuth2
  - [ ] Implementa token rotation para refresh tokens
  - [ ] Detecta refresh token reuse (revokea all on reuse)
```

## Preguntas Frecuentes

### ¿Deberia usar JWT o opaque tokens?

Usa JWT para stateless APIs donde quieres avoid un database lookup en every request — el token contiene all claims y se verifica por signature. Usa opaque tokens (random strings storeados server-side) para web applications donde necesitas immediate revocation, session management o no quieres token contents exposed al client. JWT es mejor para microservices y distributed systems. Opaque tokens son mejores para single-server applications y cuando necesitas real-time revocation. Tambien puedes combinar ambos: usa JWT como short-lived access token y opaque tokens como long-lived refresh tokens.

### ¿Cómo revoco un JWT antes de que expire?

JWTs son stateless — una vez issued, son valid hasta expiry. Para supportar revocation, usa un blocklist: storea el JWT ID (jti) de revoked tokens en Redis con un TTL matching el token's remaining lifetime. Checkea el blocklist en every request. Esto adda un Redis lookup pero enablea immediate revocation. Alternativamente, usa short access token TTLs (5-15 minutes) y revokea el refresh token — el access token expira soon anyway. Para full revocation, incrementa un user's token_version e incluyelo en el JWT — cualquier token con old version se rejected.

### ¿Qué es PKCE y por qué lo necesito?

PKCE (Proof Key for Code Exchange) previene authorization code interception attacks en OAuth2. El client genera un code verifier (random string) y sendea su hash (code challenge) al authorization server. Cuando exchangeando el code por tokens, el client sendea el original verifier. El server valida que el verifier matchee el challenge. Esto prueba que el token requester es el mismo que el que starteo el flow. PKCE es mandatory para public clients (SPA, mobile apps) que no pueden keep un client secret secure. Incluso para confidential clients, PKCE adda defense in depth.

### ¿Cómo deberia storeear tokens en el client side?

Storeea access tokens en memory (JavaScript variable) — son short-lived y se pierden on page refresh, lo cual es acceptable. Storeea refresh tokens en un HttpOnly, Secure, SameSite=Strict cookie — esto previene JavaScript access (XSS protection) y cross-site request forgery (CSRF protection). Nunca storees tokens en localStorage o sessionStorage — son accessible a JavaScript y vulnerable a XSS attacks. Nunca pongas tokens en URL parameters — pueden ser logged por proxies y browsers. Para mobile apps, usa el platform's secure storage (Keychain en iOS, Keystore en Android).

### ¿Cómo implemento MFA en mi authentication flow?

Despues de validar username y password, requiree un second factor antes de issuear tokens. Options: TOTP (Google Authenticator, Authy) — user entra un 6-digit code desde su authenticator app. SMS OTP — sendea un code via SMS (less secure, SIM swapping risk). WebAuthn / FIDO2 — hardware key o biometric (most secure). Push notification — approvea en un mobile device. Despues de MFA verification, issuea access y refresh tokens con un `mfa_verified: true` claim. Requiree re-verification para sensitive operations (password change, money transfer) incluso si el token tiene el claim. Storeea el MFA enrollment (secret key para TOTP, device token para push) encrypted at rest.
