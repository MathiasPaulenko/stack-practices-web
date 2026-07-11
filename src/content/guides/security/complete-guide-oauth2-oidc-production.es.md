---
contentType: guides
slug: complete-guide-oauth2-oidc-production
title: "OAuth2 y OIDC: Authorization Code, PKCE, Token Validation"
description: "Dominá OAuth2 y OpenID Connect para producción: authorization code flow con PKCE, token validation, refresh tokens, scopes, JWT verification y security best practices."
metaDescription: "Dominá OAuth2 y OIDC para producción: auth code flow con PKCE, token validation, refresh tokens, scopes, JWT verification y security best practices."
difficulty: advanced
topics:
  - security
  - authentication
tags:
  - guide
  - oauth2
  - oidc
  - authentication
  - pkce
  - jwt
  - authorization
  - security
relatedResources:
  - /guides/security/complete-guide-cors-security
  - /guides/security/complete-guide-content-security-policy
  - /recipes/security/oauth2-pkce-spa
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 24
seo:
  metaDescription: "Dominá OAuth2 y OIDC para producción: auth code flow con PKCE, token validation, refresh tokens, scopes, JWT verification y security best practices."
  keywords:
    - oauth2
    - oidc
    - authorization code flow
    - pkce
    - token validation
    - jwt
    - refresh tokens
    - scopes
---

## Introducción

OAuth2 es un authorization framework que deja a los users grantear a third-party applications acceso a sus resources sin sharing credentials. OpenID Connect (OIDC) agrega un identity layer on top, proveyendo authentication y user info. A continuación: el authorization code flow con PKCE, token validation, refresh tokens, scopes, JWT verification y production security patterns.

## OAuth2 Roles

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Client   │────►│ Authorization │────►│ Resource     │
│  (App)    │     │ Server        │     │ Owner (User) │
└──────────┘     └──────────────┘     └──────────────┘
     │                                    │
     │         ┌──────────────┐           │
     └────────►│  Resource    │◄──────────┘
               │  Server (API)│
               └──────────────┘
```

- **Resource Owner**: el user que posee los data
- **Client**: el application que pide access
- **Authorization Server**: issueéa tokens (ej. Auth0, Keycloak)
- **Resource Server**: el API que protege user resources

## Authorization Code Flow con PKCE

PKCE (Proof Key for Code Exchange) prevente authorization code interception. Es mandatory para SPAs y mobile apps.

### Step 1: Generá PKCE verifier y challenge

```typescript
// auth/pkce.ts — Generá PKCE pair
import crypto from 'crypto';

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = base64UrlEncode(crypto.randomBytes(32));
  const challenge = base64UrlEncode(
    crypto.createHash('sha256').update(verifier).digest(),
  );
  return { verifier, challenge };
}
```

### Step 2: Redirigí user a authorization endpoint

```typescript
// auth/authorize.ts — Buildeá authorization URL
export function buildAuthUrl(params: {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(params.authorizationEndpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('scope', params.scope);
  url.searchParams.set('state', params.state);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

// Usage
const { verifier, challenge } = generatePkcePair();
const state = crypto.randomUUID();

// Storeéa verifier y state en session
session.pkceVerifier = verifier;
session.oauthState = state;

const authUrl = buildAuthUrl({
  authorizationEndpoint: 'https://auth.example.com/authorize',
  clientId: 'my-client-id',
  redirectUri: 'https://app.example.com/callback',
  scope: 'openid profile email read:orders',
  state,
  codeChallenge: challenge,
});

// Redirigí user
res.redirect(authUrl);
```

### Step 3: Handleá callback y exchangeá code por tokens

```typescript
// auth/callback.ts — Exchangeéa authorization code por tokens
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  // Validá state para prevenir CSRF
  if (state !== session.oauthState) {
    return res.status(400).send('Invalid state parameter');
  }

  // Exchangeéa code por tokens
  const tokenResponse = await fetch('https://auth.example.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.OAUTH_CLIENT_ID,
      client_secret: process.env.OAUTH_CLIENT_SECRET, // omití para public clients
      code,
      redirect_uri: 'https://app.example.com/callback',
      code_verifier: session.pkceVerifier, // PKCE verifier del step 1
    }),
  });

  const tokens = await tokenResponse.json();

  // Storeéa tokens
  session.accessToken = tokens.access_token;
  session.idToken = tokens.id_token;
  session.refreshToken = tokens.refresh_token;
  session.expiresAt = Date.now() + tokens.expires_in * 1000;

  res.redirect('/dashboard');
});
```

## Token Response

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "dGhpcyBpcyBhIHJlZnJl...",
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "scope": "openid profile email read:orders"
}
```

## JWT Validation

### Verificá access token

```typescript
// auth/jwt.ts — Validá JWT tokens
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: 'https://auth.example.com/.well-known/jwks.json',
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

export function verifyAccessToken(token: string): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      algorithms: ['RS256'],
      audience: 'my-api',
      issuer: 'https://auth.example.com/',
    }, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded as JwtPayload);
    });
  });
}

// Middleware
async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = await verifyAccessToken(token);

    // Checkeá token expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return res.status(401).json({ error: 'Token expired' });
    }

    // Inyectá user context
    req.user = {
      id: payload.sub,
      scopes: payload.scope?.split(' ') || [],
      email: payload.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### Validá ID token (OIDC)

```typescript
// auth/oidc.ts — Validá OIDC ID token
export function verifyIdToken(idToken: string, expectedNonce: string): OidcPayload {
  const payload = jwt.verify(idToken, getKey, {
    algorithms: ['RS256'],
    audience: process.env.OAUTH_CLIENT_ID,
    issuer: 'https://auth.example.com/',
  }) as OidcPayload;

  // Verificá nonce para prevenir replay attacks
  if (payload.nonce !== expectedNonce) {
    throw new Error('Nonce mismatch — possible replay attack');
  }

  // Verificá required OIDC claims
  if (!payload.sub) throw new Error('Missing sub claim');
  if (!payload.iss) throw new Error('Missing iss claim');
  if (!payload.aud) throw new Error('Missing aud claim');
  if (!payload.exp) throw new Error('Missing exp claim');
  if (!payload.iat) throw new Error('Missing iat claim');

  return payload;
}
```

## Refresh Token Flow

```typescript
// auth/refresh.ts — Refresheá expired access tokens
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch('https://auth.example.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.OAUTH_CLIENT_ID,
      client_secret: process.env.OAUTH_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Refresh failed: ${error.error_description}`);
  }

  return response.json();
}

// Auto-refresh middleware
async function ensureValidToken(req: Request, res: Response, next: NextFunction) {
  if (Date.now() >= session.expiresAt - 60000) { // Refresheá 60s antes de expiry
    try {
      const tokens = await refreshAccessToken(session.refreshToken);
      session.accessToken = tokens.access_token;
      session.expiresAt = Date.now() + tokens.expires_in * 1000;
      if (tokens.refresh_token) {
        session.refreshToken = tokens.refresh_token;
      }
    } catch (error) {
      // Refresh failed — redirigí a login
      return res.redirect('/login');
    }
  }
  next();
}
```

## Scope-Based Authorization

```typescript
// auth/scopes.ts — Checkeá scopes para API endpoints
function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.scopes.includes(scope)) {
      return res.status(403).json({
        error: 'insufficient_scope',
        required: scope,
        granted: req.user?.scopes,
      });
    }
    next();
  };
}

// Usage
app.get('/api/orders', authMiddleware, requireScope('read:orders'), getOrders);
app.post('/api/orders', authMiddleware, requireScope('write:orders'), createOrder);
app.delete('/api/orders/:id', authMiddleware, requireScope('delete:orders'), deleteOrder);
```

## OIDC Discovery

```typescript
// auth/discovery.ts — Fetcheá OIDC endpoints desde discovery document
export async function getOidcConfig(issuer: string): Promise<OidcConfig> {
  const response = await fetch(`${issuer}/.well-known/openid-configuration`);
  return response.json();
}

// Example discovery document
// {
//   "issuer": "https://auth.example.com",
//   "authorization_endpoint": "https://auth.example.com/authorize",
//   "token_endpoint": "https://auth.example.com/oauth/token",
//   "userinfo_endpoint": "https://auth.example.com/userinfo",
//   "jwks_uri": "https://auth.example.com/.well-known/jwks.json",
//   "end_session_endpoint": "https://auth.example.com/logout",
//   "scopes_supported": ["openid", "profile", "email", "offline_access"],
//   "response_types_supported": ["code", "token", "id_token"],
//   "grant_types_supported": ["authorization_code", "refresh_token", "client_credentials"],
//   "subject_types_supported": ["public"],
//   "id_token_signing_alg_values_supported": ["RS256"],
//   "token_endpoint_auth_methods_supported": ["client_secret_basic", "client_secret_post", "private_key_jwt"]
// }
```

## Client Credentials Flow (Server-to-Server)

```typescript
// auth/clientCredentials.ts — Machine-to-machine authentication
export async function getClientCredentialsToken(
  clientId: string,
  clientSecret: string,
  scope: string,
): Promise<TokenResponse> {
  const response = await fetch('https://auth.example.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope,
    }),
  });

  return response.json();
}

// Usage: service-to-service calls
const token = await getClientCredentialsToken(
  process.env.M2M_CLIENT_ID,
  process.env.M2M_CLIENT_SECRET,
  'read:orders write:orders',
);

const orders = await fetch('https://api.example.com/orders', {
  headers: { Authorization: `Bearer ${token.access_token}` },
});
```

## Best Practices

- Siempre usá PKCE para public clients (SPAs, mobile apps) — prevente code interception
- Validá JWT signatures usando JWKS — no hardcodees keys, rotan
- Verificá issuer, audience y expiration — rejecteá tokens de wrong sources
- Usá short-lived access tokens (15-60 minutes) — limitá damage de token theft
- Usá refresh tokens con rotation — issueéa un new refresh token en cada use, revocá el old one
- Storeéa tokens securely — HttpOnly cookies para web, secure storage para mobile
- Usá el `state` parameter — prevente CSRF attacks en el callback
- Usá el `nonce` parameter en OIDC — prevente replay attacks en ID tokens
- Validá scopes en every request — no trusts en el client para checkear
- Usá el discovery endpoint — no hardcodees authorization/token URLs
- Implementá proper logout — calléa el end_session_endpoint para clear server-side session
- Usá `private_key_jwt` para confidential clients — más secure que `client_secret_post`

## Common Mistakes

- **Storear tokens en localStorage**: JavaScript puede leerlos, haciendo XSS attacks catastrophic. Usá HttpOnly cookies.
- **No usar PKCE para SPAs**: el authorization code puede ser intercepted. PKCE hace el code useless sin el verifier.
- **No validar JWT signature**: un attacker puede forge tokens. Siempre verificá con el JWKS public key.
- **Long-lived access tokens**: si stolen, son valid por mucho time. Mantenelos short-lived con refresh rotation.
- **No checkear token audience**: un token issued para otro API pasa validation. Siempre checkeá `aud`.
- **Missing state validation**: CSRF attacks pueden injectar attacker's authorization code. Siempre validá `state`.

## FAQ

### ¿Cuál es la diferencia entre OAuth2 y OIDC?

OAuth2 es un authorization framework — handlea qué el client está allowed a hacer (scopes). OIDC es un authentication layer built on OAuth2 — handlea quién es el user (ID token, userinfo). OIDC siempre incluye OAuth2, pero OAuth2 puede ser usado sin OIDC.

### ¿Qué es PKCE y por qué es needed?

PKCE (Proof Key for Code Exchange) agrega un cryptographic challenge al authorization code flow. El client genera un verifier, envía un hash (challenge) al authorization server, y prueba que tiene el verifier cuando exchangeéa el code. Esto prevente que un attacker use un intercepted code.

### ¿Cuál es la diferencia entre access token e ID token?

Access tokens son para APIs — autorizan access a resources. Son opaque o JWT y se envían al resource server. ID tokens son para el client — contienen user identity claims (email, name, sub). Son JWT y son consumed por el client, nunca enviados a APIs.

### ¿Cuándo debería usar client credentials flow?

Para server-to-server communication donde no hay user involved. El client autentica con sus own credentials (ID + secret o private key) y obtiene un token con sus own scopes. No user context, no refresh token.

### ¿Cómo handleo token revocation?

Calléa el revocation endpoint: `POST /oauth/revoke` con el token y token type. El authorization server invalida el token. Para refresh token rotation, el old refresh token se revoca automáticamente cuando un new one es issued.
