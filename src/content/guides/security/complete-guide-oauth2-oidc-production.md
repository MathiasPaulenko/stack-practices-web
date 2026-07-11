---
contentType: guides
slug: complete-guide-oauth2-oidc-production
title: "OAuth2 and OIDC: Authorization Code, PKCE, Token Validation"
description: "Master OAuth2 and OpenID Connect for production: authorization code flow with PKCE, token validation, refresh tokens, scopes, JWT verification, and security best practices."
metaDescription: "Master OAuth2 and OpenID Connect for production: auth code flow with PKCE, token validation, refresh tokens, scopes, JWT verification, and security best practices."
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
  metaDescription: "Master OAuth2 and OpenID Connect for production: auth code flow with PKCE, token validation, refresh tokens, scopes, JWT verification, and security best practices."
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

## Introduction

OAuth2 is an authorization framework that lets users grant third-party applications access to their resources without sharing credentials. OpenID Connect (OIDC) adds an identity layer on top, providing authentication and user info. This guide walks through the authorization code flow with PKCE, token validation, refresh tokens, scopes, JWT verification, and production security patterns.

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

- **Resource Owner**: the user who owns the data
- **Client**: the application requesting access
- **Authorization Server**: issues tokens (e.g., Auth0, Keycloak)
- **Resource Server**: the API protecting user resources

## Authorization Code Flow with PKCE

PKCE (Proof Key for Code Exchange) prevents authorization code interception. It is mandatory for SPAs and mobile apps.

### Step 1: Generate PKCE verifier and challenge

```typescript
// auth/pkce.ts — Generate PKCE pair
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

### Step 2: Redirect user to authorization endpoint

```typescript
// auth/authorize.ts — Build authorization URL
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

// Store verifier and state in session
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

// Redirect user
res.redirect(authUrl);
```

### Step 3: Handle callback and exchange code for tokens

```typescript
// auth/callback.ts — Exchange authorization code for tokens
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  // Validate state to prevent CSRF
  if (state !== session.oauthState) {
    return res.status(400).send('Invalid state parameter');
  }

  // Exchange code for tokens
  const tokenResponse = await fetch('https://auth.example.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.OAUTH_CLIENT_ID,
      client_secret: process.env.OAUTH_CLIENT_SECRET, // omit for public clients
      code,
      redirect_uri: 'https://app.example.com/callback',
      code_verifier: session.pkceVerifier, // PKCE verifier from step 1
    }),
  });

  const tokens = await tokenResponse.json();

  // Store tokens
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

### Verify access token

```typescript
// auth/jwt.ts — Validate JWT tokens
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

    // Check token expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return res.status(401).json({ error: 'Token expired' });
    }

    // Inject user context
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

### Validate ID token (OIDC)

```typescript
// auth/oidc.ts — Validate OIDC ID token
export function verifyIdToken(idToken: string, expectedNonce: string): OidcPayload {
  const payload = jwt.verify(idToken, getKey, {
    algorithms: ['RS256'],
    audience: process.env.OAUTH_CLIENT_ID,
    issuer: 'https://auth.example.com/',
  }) as OidcPayload;

  // Verify nonce to prevent replay attacks
  if (payload.nonce !== expectedNonce) {
    throw new Error('Nonce mismatch — possible replay attack');
  }

  // Verify required OIDC claims
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
// auth/refresh.ts — Refresh expired access tokens
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
  if (Date.now() >= session.expiresAt - 60000) { // Refresh 60s before expiry
    try {
      const tokens = await refreshAccessToken(session.refreshToken);
      session.accessToken = tokens.access_token;
      session.expiresAt = Date.now() + tokens.expires_in * 1000;
      if (tokens.refresh_token) {
        session.refreshToken = tokens.refresh_token;
      }
    } catch (error) {
      // Refresh failed — redirect to login
      return res.redirect('/login');
    }
  }
  next();
}
```

## Scope-Based Authorization

```typescript
// auth/scopes.ts — Check scopes for API endpoints
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
// auth/discovery.ts — Fetch OIDC endpoints from discovery document
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

- Always use PKCE for public clients (SPAs, mobile apps) — prevents code interception
- Validate JWT signatures using JWKS — don't hardcode keys, they rotate
- Verify issuer, audience, and expiration — reject tokens from wrong sources
- Use short-lived access tokens (15-60 minutes) — limit damage from token theft
- Use refresh tokens with rotation — issue a new refresh token on each use, revoke the old one
- Store tokens securely — HttpOnly cookies for web, secure storage for mobile
- Use the `state` parameter — prevents CSRF attacks in the callback
- Use the `nonce` parameter in OIDC — prevents replay attacks on ID tokens
- Validate scopes on every request — don't trust the client to check
- Use the discovery endpoint — don't hardcode authorization/token URLs
- Implement proper logout — call the end_session_endpoint to clear server-side session
- Use `private_key_jwt` for confidential clients — more secure than `client_secret_post`

## Common Mistakes

- **Storing tokens in localStorage**: JavaScript can read them, making XSS attacks catastrophic. Use HttpOnly cookies.
- **Not using PKCE for SPAs**: the authorization code can be intercepted. PKCE makes the code useless without the verifier.
- **Not validating JWT signature**: an attacker can forge tokens. Always verify with the JWKS public key.
- **Long-lived access tokens**: if stolen, they're valid for a long time. Keep them short-lived with refresh rotation.
- **Not checking token audience**: a token issued for another API passes validation. Always check `aud`.
- **Missing state validation**: CSRF attacks can inject attacker's authorization code. Always validate `state`.

## FAQ

### What is the difference between OAuth2 and OIDC?

OAuth2 is an authorization framework — it handles what the client is allowed to do (scopes). OIDC is an authentication layer built on OAuth2 — it handles who the user is (ID token, userinfo). OIDC always includes OAuth2, but OAuth2 can be used without OIDC.

### What is PKCE and why is it needed?

PKCE (Proof Key for Code Exchange) adds a cryptographic challenge to the authorization code flow. The client generates a verifier, sends a hash (challenge) to the authorization server, and proves it has the verifier when exchanging the code. This prevents an attacker from using an intercepted code.

### What is the difference between access token and ID token?

Access tokens are for APIs — they authorize access to resources. They are opaque or JWT and are sent to the resource server. ID tokens are for the client — they contain user identity claims (email, name, sub). They are JWT and are consumed by the client, never sent to APIs.

### When should I use client credentials flow?

For server-to-server communication where no user is involved. The client authenticates with its own credentials (ID + secret or private key) and gets a token with its own scopes. No user context, no refresh token.

### How do I handle token revocation?

Call the revocation endpoint: `POST /oauth/revoke` with the token and token type. The authorization server invalidates the token. For refresh token rotation, the old refresh token is automatically revoked when a new one is issued.
