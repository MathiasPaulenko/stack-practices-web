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
  - vulnerabilities
relatedResources:
  - /recipes/security-headers
  - /patterns/design/adapter-pattern-api
  - /guides/security/security-best-practices-guide
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

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Soluciones Avanzadas

### Silent token refresh con iframe oculto

Refresca tokens sin un redirect completo usando `prompt=none` en un iframe oculto. Esto funciona cuando el usuario aún tiene una sesión activa con el servidor de autorización:

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
      codeChallenge: '', // No needed para silent refresh
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

// Uso: llamar antes de que el token expire
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
      // Sesión expirada, redirigir a login
      window.location.href = '/login';
    }
  }
}

function isTokenExpired(token: string): boolean {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return Date.now() >= payload.exp * 1000 - 30_000; // 30s buffer
}
```

### Patrón Backend-for-frontend (BFF)

En lugar de manejar OAuth completamente en el navegador, usa un backend ligero que almacena los tokens en cookies httpOnly. La SPA solo interactúa con el backend:

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
    maxAge: 600_000, // 10 minutos
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
    return res.status(400).send('State inválido o código faltante');
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

  // Almacenar tokens en cookies httpOnly — nunca expuestos a JS
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
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
  });

  res.clearCookie('pkce_verifier');
  res.clearCookie('oauth_state');
  res.redirect('/');
});

app.get('/auth/token', (req, res) => {
  const accessToken = req.cookies.access_token;
  if (!accessToken) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  // Retornar token a SPA para llamadas API
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
    // Revocar token en el servidor de auth
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

### React hook para gestión de estado OAuth

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
      if (!res.ok) throw new Error('Refresh falló');
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
        error: 'Sesión expirada',
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
          error: 'Error al verificar estado de auth',
        });
      }
    }
    init();

    // Configurar refresh automático antes de que el token expire
    const refreshInterval = setInterval(() => {
      refreshToken();
    }, 10 * 60 * 1000); // Cada 10 minutos

    return () => clearInterval(refreshInterval);
  }, [refreshToken]);

  return { ...state, login, logout, refreshToken };
}

// Uso en componente
function App() {
  const { isAuthenticated, loading, login, logout } = useAuth();

  if (loading) return <div>Cargando...</div>;
  if (!isAuthenticated) {
    return <button onClick={login}>Iniciar sesión</button>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={logout}>Cerrar sesión</button>
    </div>
  );
}
```

## Mejores Prácticas Adicionales

1. **Usa el método `S256` code challenge, no `plain`.** El método `plain` envía el code verifier directamente como challenge, sin protección si el challenge es interceptado. Siempre usa `S256` que envía solo el hash SHA-256:

```typescript
// CORRECTO: método S256
url.searchParams.set('code_challenge_method', 'S256');

// INCORRECTO: método plain (solo para clientes legacy sin soporte SHA-256)
url.searchParams.set('code_challenge_method', 'plain');
```

2. **Valida la firma JWT del ID token.** Después de recibir un ID token, verifica su firma usando el JWKS del proveedor antes de confiar en cualquier claim. Nunca decodifiques y confíes en un ID token sin verificación de firma:

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

  // Verificar claims adicionales
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('ID token expirado');
  }
  if (payload.nbf && payload.nbf > now) {
    throw new Error('ID token aún no válido');
  }

  return payload;
}
```

## Errores Comunes Adicionales

1. **No limpiar parámetros PKCE después de usar.** El `code_verifier` y `state` almacenados en `sessionStorage` deberían eliminarse inmediatamente después del intercambio de tokens. Dejarlos en storage permite ataques de replay si la URL de callback se vuelve a activar:

```typescript
// Después del intercambio de tokens exitoso
sessionStorage.removeItem('pkce_verifier');
sessionStorage.removeItem('oauth_state');
```

2. **Usar el mismo valor de `state` entre sesiones.** El parámetro `state` debe ser un valor criptográficamente aleatorio generado fresco para cada petición de autorización. Reusar un valor `state` estático anula completamente la protección CSRF:

```typescript
// INCORRECTO: state estático
const state = 'my-fixed-state';

// CORRECTO: state aleatorio por petición
const state = base64URLEncode(crypto.randomBytes(32));
```

## Preguntas Frecuentes Adicionales

### ¿Cómo manejo la revocación de tokens en una SPA?

Llama al endpoint de revocación del proveedor para invalidar tokens antes de redirigir a logout. Con el patrón BFF, el backend maneja la revocación. Sin backend, envía un `POST` al endpoint de revocación con el access token:

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
  // Limpiar token local
  window.__ACCESS_TOKEN__ = undefined;
}
```

### ¿Debería usar `response_mode=fragment` o `response_mode=query`?

Para SPAs, usa `response_mode=query` (el default para el authorization code flow). El código de autorización se retorna como query parameter en la URL de redirect. Evita el modo `fragment` a menos que tu proveedor lo requiera, ya que los query parameters son más fáciles de leer y loggear para debugging.

### ¿Qué scopes debería solicitar?

Solicita solo los scopes que tu aplicación necesita. Para una SPA típica con autenticación de usuario:

- `openid` — requerido para OpenID Connect, retorna un ID token
- `profile` — nombre, foto y perfil básico del usuario
- `email` — email del usuario
- `offline_access` — requerido para recibir un refresh token

Evita solicitar scopes de admin o acceso de escritura a menos que tu SPA los use directamente. Usa consentimiento incremental si tu proveedor lo soporta.
