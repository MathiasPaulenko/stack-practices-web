---
contentType: recipes
slug: oauth2-pkce-spa
title: "Implementa OAuth 2.0 PKCE para Aplicaciones de Una Sola Pagina"
description: "Como implementar el flujo OAuth 2.0 PKCE en aplicaciones de una sola pagina para autenticar usuarios de forma segura sin exponer secretos de cliente"
metaDescription: "OAuth 2.0 PKCE para SPAs. Autentica usuarios sin secretos de cliente, implementa intercambio de codigo y maneja refresh de tokens."
difficulty: intermediate
topics:
  - security
  - authentication
tags:
  - oauth2
  - security
  - authentication
  - spa
relatedResources:
  - /recipes/security-headers
  - /patterns/design/adapter-pattern-api
  - /guides/security-best-practices
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "OAuth 2.0 PKCE para SPAs. Autentica usuarios sin secretos de cliente, implementa intercambio de codigo y maneja refresh de tokens."
  keywords:
    - oauth2 pkce
    - single page application
    - authentication
    - security
    - spa auth
---

# Implementa OAuth 2.0 PKCE para Aplicaciones de Una Sola Pagina

La extension Proof Key for Code Exchange (PKCE) de OAuth 2.0 permite que clientes publicos como aplicaciones de una sola pagina ejecuten el flujo de codigo de autorizacion sin un secreto de cliente. Previene ataques de interceptacion de codigo de autorizacion al vincular la peticion de autorizacion al posterior intercambio de token.

## Cuando Usar Esto

- Estas construyendo una SPA que se autentica contra un proveedor OAuth 2.0 u OpenID Connect
- La aplicacion ejecuta en un navegador donde un secreto de cliente no puede mantenerse confidencial
- Quieres prevenir interceptacion de codigo de autorizacion por aplicaciones maliciosas

## Requisitos Previos

- Un proveedor OAuth 2.0 que soporte PKCE (Auth0, Okta, Google, Keycloak, etc.)
- Una aplicacion OAuth registrada con `http://localhost:3000` como redirect URI

## Solucion

### 1. Generar Parametros PKCE

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

### 2. Redirigir al Endpoint de Autorizacion

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

// Uso
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

### 3. Intercambiar Codigo por Tokens

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

// En callback handler
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');

if (state !== sessionStorage.getItem('oauth_state')) {
  throw new Error('Parametro state invalido');
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

### 4. Almacenamiento Seguro de Tokens

```typescript
// auth/storage.ts
export function storeTokens(tokens: TokenResponse) {
  // Almacena access token solo en memoria (mas seguro para SPAs)
  window.__ACCESS_TOKEN__ = tokens.access_token;
  
  // Almacena refresh token en cookie httpOnly via backend proxy
  // Nunca almacenes refresh tokens en localStorage
}

export function getAccessToken(): string | undefined {
  return window.__ACCESS_TOKEN__;
}
```

## Como Funciona

1. **Code Verifier** es un secreto aleatorio generado por el cliente
2. **Code Challenge** es el hash SHA-256 del verifier, enviado con la peticion de autorizacion
3. **Servidor de Autorizacion** almacena el challenge y emite un codigo de autorizacion
4. **Intercambio de Token** requiere el verifier original, probando que el cliente inicio el flujo
5. **Sin PKCE**, un codigo de autorizacion interceptado podria ser intercambiado por un atacante

## Consideraciones de Produccion

- Valida siempre el **parametro state** para prevenir ataques [CSRF](/recipes/security/api-security-headers)
- Usa **Content Security Policy** headers para mitigar robo de tokens por [XSS](/recipes/security/xss-prevention)
- Implementa **silent token refresh** usando `prompt=none` en un iframe oculto
- Rota refresh tokens y detecta reutilizacion para prevenir ataques de replay

## Errores Comunes

- Almacenar tokens en `localStorage` donde [XSS](/recipes/security/xss-prevention) puede robarlos facilmente
- No validar el parametro state durante el manejo del callback
- Usar `response_type=token` (flujo implicito) que esta deprecado para SPAs

## FAQ

**P: PKCE es requerido para todas las SPAs?**
R: Si. La OAuth 2.0 Security Best Current Practice recomienda PKCE para todos los clientes OAuth, incluyendo los confidenciales.

**P: Puedo usar PKCE con un backend que maneja el intercambio de tokens?**
R: Si. Esto es de hecho mas seguro. El backend almacena el refresh token en una cookie httpOnly mientras la SPA solo recibe un access token de corta duracion.

**P: Que pasa si el proveedor no soporta PKCE?**
R: Usa un patron backend-for-frontend (BFF) donde tu [backend maneja el flujo OAuth](/recipes/security/oauth2-pkce-spa) y la SPA se autentica via cookies de sesion.
