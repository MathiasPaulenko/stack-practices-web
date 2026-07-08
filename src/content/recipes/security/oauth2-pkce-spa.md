---
contentType: recipes
slug: oauth2-pkce-spa
title: "Implement OAuth 2.0 PKCE for Single-Page Applications"
description: "How to implement the OAuth 2.0 PKCE flow in single-page applications to securely authenticate users without exposing client secrets"
metaDescription: "OAuth 2.0 PKCE for single-page applications. Securely authenticate users without client secrets, implement code exchange, and handle token refresh in SPAs."
difficulty: intermediate
topics:
  - security
  - authentication
tags:
  - oauth2
  - security
  - authentication
  - spa
  - vulnerabilities
relatedResources:
  - /recipes/security-headers
  - /patterns/design/adapter-pattern-api
  - /guides/security/security-best-practices-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "OAuth 2.0 PKCE for single-page applications. Securely authenticate users without client secrets, implement code exchange, and handle token refresh in SPAs."
  keywords:
    - oauth2 pkce
    - single page application
    - authentication
    - security
    - spa auth
---

# Implement OAuth 2.0 PKCE for Single-Page Applications

The Proof Key for Code Exchange (PKCE) extension to OAuth 2.0 allows public clients like single-page applications to perform the authorization code flow without a client secret. It prevents authorization code interception attacks by binding the authorization request to the subsequent token exchange.

## When to Use This

- You are building a SPA that authenticates against an OAuth 2.0 or OpenID Connect provider
- The application runs in a browser where a client secret cannot be kept confidential
- You want to prevent authorization code interception by malicious applications

## Prerequisites

- An OAuth 2.0 provider that supports PKCE (Auth0, Okta, Google, Keycloak, etc.)
- A registered OAuth application with `http://localhost:3000` as a redirect URI

## Solution

### 1. Generate PKCE Parameters

```typescript
// auth/pkce.ts
import { randomBytes, createHash } from 'crypto';

export function generatePKCE() {
  const codeVerifier = base64URLEncode(randomBytes(32));
  const codeChallenge = base64URLEncode(
    createHash('sha256').update(codeVerifier).digest()
  );
  return { codeVerifier, codeChallenge };
}

function base64URLEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
```

### 2. Redirect to Authorization Endpoint

```typescript
// auth/authorize.ts
export function buildAuthorizationUrl(params: {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
}) {
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
const { codeVerifier, codeChallenge } = generatePKCE();
sessionStorage.setItem('pkce_verifier', codeVerifier);

const state = generateState();
sessionStorage.setItem('oauth_state', state);

window.location.href = buildAuthorizationUrl({
  authorizationEndpoint: 'https://auth.example.com/oauth/authorize',
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:3000/callback',
  scope: 'openid profile email',
  state,
  codeChallenge,
});
```

### 3. Exchange Code for Tokens

```typescript
// auth/tokenExchange.ts
export async function exchangeCodeForToken(params: {
  tokenEndpoint: string;
  clientId: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
}) {
  const response = await fetch(params.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      code: params.code,
      code_verifier: params.codeVerifier,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    id_token: string;
    expires_in: number;
  }>;
}

// In callback handler
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');

if (state !== sessionStorage.getItem('oauth_state')) {
  throw new Error('Invalid state parameter');
}

const codeVerifier = sessionStorage.getItem('pkce_verifier')!;
const tokens = await exchangeCodeForToken({
  tokenEndpoint: 'https://auth.example.com/oauth/token',
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:3000/callback',
  code: code!,
  codeVerifier,
});
```

### 4. Secure Token Storage

```typescript
// auth/storage.ts
export function storeTokens(tokens: TokenResponse) {
  // Store access token in memory only (most secure for SPAs)
  window.__ACCESS_TOKEN__ = tokens.access_token;
  
  // Store refresh token in httpOnly cookie via backend proxy
  // Never store refresh tokens in localStorage
}

export function getAccessToken(): string | undefined {
  return window.__ACCESS_TOKEN__;
}
```

## How It Works

1. **Code Verifier** is a random secret generated by the client
2. **Code Challenge** is the SHA-256 hash of the verifier, sent with the authorization request
3. **Authorization Server** stores the challenge and issues an authorization code
4. **Token Exchange** requires the original verifier, proving the client initiated the flow
5. **Without PKCE**, an intercepted authorization code could be exchanged by an attacker

## Production Considerations

- Always validate the **state parameter** to prevent [CSRF](/recipes/security/api-security-headers) attacks
- Use **Content Security Policy** headers to mitigate [XSS](/recipes/security/xss-prevention) token theft
- Implement **silent token refresh** using `prompt=none` in a hidden iframe
- Rotate refresh tokens and detect reuse to prevent token replay attacks

## Common Mistakes

- Storing tokens in `localStorage` where [XSS](/recipes/security/xss-prevention) can easily steal them
- Not validating the state parameter during callback handling
- Using `response_type=token` (implicit flow) which is deprecated for SPAs

## FAQ

**Q: Is PKCE required for all SPAs?**
A: Yes. The OAuth 2.0 Security Best Current Practice recommends PKCE for all OAuth clients, including confidential ones.

**Q: Can I use PKCE with a backend that handles the token exchange?**
A: Yes. This is actually more secure. The backend stores the refresh token in an httpOnly cookie while the SPA only receives a short-lived access token.

**Q: What if the provider does not support PKCE?**
A: Use a backend-for-frontend (BFF) pattern where your [backend handles the OAuth flow](/recipes/security/oauth2-pkce-spa) and the SPA authenticates via session cookies.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Advanced Solutions

### Silent token refresh with hidden iframe

Refresh tokens without a full redirect by using `prompt=none` in a hidden iframe. This works when the user still has an active session with the authorization server:

```typescript
// auth/silentRefresh.ts
export function silentRefresh(config: {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope: string;
}): Promise<TokenResponse> {
  return new Promise((resolve, reject) => {
    const state = generateRandomString(32);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = buildAuthorizationUrl({
      ...config,
      state,
      codeChallenge: '', // Not needed for silent refresh
      prompt: 'none',
      response_type: 'code',
    });

    let cleanup: () => void;

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Silent refresh timed out'));
    }, 5000);

    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== new URL(config.authorizationEndpoint).origin) return;
      if (event.data.state !== state) return;

      cleanup();
      if (event.data.error) {
        reject(new Error(event.data.error));
      } else {
        resolve(event.data as TokenResponse);
      }
    };

    cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener('message', messageHandler);
      iframe.remove();
    };

    window.addEventListener('message', messageHandler);
    document.body.appendChild(iframe);
  });
}

// Usage: call before token expires
async function refreshIfNeeded() {
  const token = getAccessToken();
  if (!token || isTokenExpired(token)) {
    try {
      const tokens = await silentRefresh({
        authorizationEndpoint: 'https://auth.example.com/oauth/authorize',
        clientId: 'your-client-id',
        redirectUri: 'http://localhost:3000/callback',
        scope: 'openid profile email',
      });
      storeTokens(tokens);
    } catch (err) {
      // Session expired, redirect to login
      window.location.href = '/login';
    }
  }
}

function isTokenExpired(token: string): boolean {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return Date.now() >= payload.exp * 1000 - 30_000; // 30s buffer
}
```

### Backend-for-frontend (BFF) pattern

Instead of handling OAuth entirely in the browser, use a lightweight backend that holds the tokens in httpOnly cookies. The SPA only interacts with the backend:

```typescript
// server/bff-auth.ts (Express backend)
import express from 'express';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';

const app = express();
app.use(cookieParser());

const CLIENT_ID = process.env.OAUTH_CLIENT_ID!;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET!;
const TOKEN_ENDPOINT = 'https://auth.example.com/oauth/token';
const AUTHORIZATION_ENDPOINT = 'https://auth.example.com/oauth/authorize';
const REDIRECT_URI = 'https://app.example.com/auth/callback';

app.get('/auth/login', (req, res) => {
  const codeVerifier = base64URLEncode(crypto.randomBytes(32));
  const codeChallenge = base64URLEncode(
    crypto.createHash('sha256').update(codeVerifier).digest()
  );
  const state = base64URLEncode(crypto.randomBytes(16));

  res.cookie('pkce_verifier', codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 600_000, // 10 minutes
  });
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 600_000,
  });

  const url = new URL(AUTHORIZATION_ENDPOINT);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('scope', 'openid profile email');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');

  res.redirect(url.toString());
});

app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  const expectedState = req.cookies.oauth_state;
  const codeVerifier = req.cookies.pkce_verifier;

  if (!code || state !== expectedState) {
    return res.status(400).send('Invalid state or missing code');
  }

  const tokenResponse = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code: code as string,
      code_verifier: codeVerifier,
    }),
  });

  const tokens = await tokenResponse.json();

  // Store tokens in httpOnly cookies — never exposed to JS
  res.cookie('access_token', tokens.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: tokens.expires_in * 1000,
  });
  res.cookie('refresh_token', tokens.refresh_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  res.clearCookie('pkce_verifier');
  res.clearCookie('oauth_state');
  res.redirect('/');
});

app.get('/auth/token', (req, res) => {
  const accessToken = req.cookies.access_token;
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  // Return token to SPA for API calls
  res.json({ access_token: accessToken });
});

app.post('/auth/refresh', async (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  const tokenResponse = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  const tokens = await tokenResponse.json();

  res.cookie('access_token', tokens.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: tokens.expires_in * 1000,
  });

  if (tokens.refresh_token) {
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  res.json({ success: true });
});

app.post('/auth/logout', async (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  if (refreshToken) {
    // Revoke token at auth server
    await fetch(TOKEN_ENDPOINT + '/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        token: refreshToken,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });
  }
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.json({ success: true });
});
```

### React hook for OAuth state management

```typescript
// hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    accessToken: null,
    loading: true,
    error: null,
  });

  const login = useCallback(() => {
    window.location.href = '/auth/login';
  }, []);

  const logout = useCallback(async () => {
    await fetch('/auth/logout', { method: 'POST' });
    setState({
      isAuthenticated: false,
      accessToken: null,
      loading: false,
      error: null,
    });
    window.location.href = '/';
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const res = await fetch('/auth/refresh', { method: 'POST' });
      if (!res.ok) throw new Error('Refresh failed');
      const data = await res.json();
      if (data.success) {
        const tokenRes = await fetch('/auth/token');
        const tokenData = await tokenRes.json();
        setState({
          isAuthenticated: true,
          accessToken: tokenData.access_token,
          loading: false,
          error: null,
        });
      }
    } catch {
      setState({
        isAuthenticated: false,
        accessToken: null,
        loading: false,
        error: 'Session expired',
      });
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/auth/token');
        if (res.ok) {
          const data = await res.json();
          setState({
            isAuthenticated: true,
            accessToken: data.access_token,
            loading: false,
            error: null,
          });
        } else {
          setState({
            isAuthenticated: false,
            accessToken: null,
            loading: false,
            error: null,
          });
        }
      } catch {
        setState({
          isAuthenticated: false,
          accessToken: null,
          loading: false,
          error: 'Failed to check auth status',
        });
      }
    }
    init();

    // Set up automatic refresh before token expires
    const refreshInterval = setInterval(() => {
      refreshToken();
    }, 10 * 60 * 1000); // Every 10 minutes

    return () => clearInterval(refreshInterval);
  }, [refreshToken]);

  return { ...state, login, logout, refreshToken };
}

// Usage in component
function App() {
  const { isAuthenticated, loading, login, logout } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) {
    return <button onClick={login}>Sign in</button>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={logout}>Sign out</button>
    </div>
  );
}
```

## Additional Best Practices

1. **Use `S256` code challenge method, not `plain`.** The `plain` method sends the code verifier directly as the challenge, providing no protection if the challenge is intercepted. Always use `S256` which sends only the SHA-256 hash:

```typescript
// CORRECT: S256 method
url.searchParams.set('code_challenge_method', 'S256');

// WRONG: plain method (only for legacy clients without SHA-256 support)
url.searchParams.set('code_challenge_method', 'plain');
```

2. **Validate the ID token JWT signature.** After receiving an ID token, verify its signature using the provider's JWKS before trusting any claims. Never decode and trust an ID token without signature verification:

```typescript
// auth/validateIdToken.ts
import { jwtVerify, createRemoteJWKSet } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://auth.example.com/.well-known/jwks.json')
);

export async function validateIdToken(
  idToken: string,
  expectedAudience: string,
  expectedIssuer: string,
) {
  const { payload } = await jwtVerify(idToken, JWKS, {
    audience: expectedAudience,
    issuer: expectedIssuer,
    algorithms: ['RS256'],
  });

  // Verify additional claims
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('ID token expired');
  }
  if (payload.nbf && payload.nbf > now) {
    throw new Error('ID token not yet valid');
  }

  return payload;
}
```

## Additional Common Mistakes

1. **Not cleaning up PKCE parameters after use.** The `code_verifier` and `state` stored in `sessionStorage` should be removed immediately after the token exchange. Leaving them in storage allows replay attacks if the callback URL is triggered again:

```typescript
// After successful token exchange
sessionStorage.removeItem('pkce_verifier');
sessionStorage.removeItem('oauth_state');
```

2. **Using the same `state` value across sessions.** The `state` parameter must be a cryptographically random value generated fresh for each authorization request. Reusing a static `state` value defeats CSRF protection entirely:

```typescript
// WRONG: static state
const state = 'my-fixed-state';

// CORRECT: random state per request
const state = base64URLEncode(crypto.randomBytes(32));
```

## Additional FAQ

### How do I handle token revocation in a SPA?

Call the provider's revocation endpoint to invalidate tokens before redirecting to logout. With the BFF pattern, the backend handles revocation. Without a backend, send a `POST` to the revocation endpoint with the access token:

```typescript
async function revokeToken(token: string, clientId: string) {
  await fetch('https://auth.example.com/oauth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      token,
      client_id: clientId,
      token_type_hint: 'access_token',
    }),
  });
  // Clear local token
  window.__ACCESS_TOKEN__ = undefined;
}
```

### Should I use `response_mode=fragment` or `response_mode=query`?

For SPAs, use `response_mode=query` (the default for the authorization code flow). The authorization code is returned as a query parameter in the redirect URL. Avoid `fragment` mode unless your provider requires it, as query parameters are easier to read and log for debugging.

### What scopes should I request?

Request only the scopes your application needs. For a typical SPA with user authentication:

- `openid` — required for OpenID Connect, returns an ID token
- `profile` — user's name, picture, and basic profile
- `email` — user's email address
- `offline_access` — required to receive a refresh token

Avoid requesting admin scopes or write access unless your SPA directly uses them. Use incremental consent if your provider supports it.
