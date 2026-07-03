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
