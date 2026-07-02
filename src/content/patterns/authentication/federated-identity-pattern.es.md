---
contentType: patterns
slug: federated-identity-pattern
title: "Patrón Federated Identity"
description: "Delega la autenticación a proveedores de identidad externos. Un patrón para integrar OAuth2, OIDC, SAML y SSO entre múltiples servicios y organizaciones."
metaDescription: "Aprende el patrón Federated Identity en Python, Java y JavaScript. Delega auth a IdPs externos con OAuth2, OIDC, SAML e integración SSO."
difficulty: advanced
topics:
  - authentication
  - security
tags:
  - federated-identity
  - pattern
  - design-pattern
  - authentication
  - sso
  - oauth2
  - oidc
  - saml
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/ambassador-pattern
  - /patterns/design/api-gateway-pattern
  - /patterns/design/back-pressure-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Aprende el patrón Federated Identity en Python, Java y JavaScript. Delega auth a IdPs externos con OAuth2, OIDC, SAML e integración SSO."
  keywords:
    - federated identity pattern
    - design pattern
    - authentication pattern
    - sso pattern
    - oauth2
    - oidc
    - saml
    - python federated identity
    - java federated identity
    - javascript federated identity
---

# Patrón Federated Identity

## Visión General

El patrón [Federated Identity](/patterns/authentication/federated-identity-pattern) delega la autenticación a proveedores de identidad externos (IdPs) en lugar de gestionar credenciales localmente. Los usuarios inician sesión a través de un tercero de confianza (Google, GitHub, Azure AD, Okta), y la aplicación recibe un token que puede verificar. Esto elimina el almacenamiento de contraseñas, habilita single sign-on (SSO) y permite autenticación cross-organization.

## Cuándo Usar

Usar el patrón Federated Identity cuando:
- No quieres almacenar ni gestionar contraseñas de usuarios
- Los usuarios ya tienen cuentas con Google, GitHub, Microsoft u Okta
- Múltiples aplicaciones necesitan single sign-on across una organización
- Necesitas autenticar usuarios de organizaciones partner sin crear cuentas locales
- Requisitos de compliance exigen gestión centralizada de identidad (SOC2, HIPAA)

## Solución

### Python (FastAPI + OAuth2/OIDC)

```python
from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import RedirectResponse
import httpx
import jwt
import time

app = FastAPI()

GOOGLE_CLIENT_ID = "your-client-id"
GOOGLE_CLIENT_SECRET = "your-client-secret"
GOOGLE_REDIRECT_URI = "http://localhost:8000/auth/callback"
GOOGLE_DISCOVERY = "https://accounts.google.com/.well-known/openid-configuration"

async def get_google_discovery():
    async with httpx.AsyncClient() as client:
        resp = await client.get(GOOGLE_DISCOVERY)
        return resp.json()

@app.get("/auth/login")
async def login():
    discovery = await get_google_discovery()
    auth_url = (
        f"{discovery['authorization_endpoint']}"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=openid email profile"
    )
    return RedirectResponse(auth_url)

@app.get("/auth/callback")
async def callback(code: str):
    discovery = await get_google_discovery()
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            discovery["token_endpoint"],
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        tokens = token_resp.json()

    # Verificar ID token
    id_token = tokens.get("id_token")
    decoded = jwt.decode(id_token, options={"verify_signature": False})

    return {
        "user": {
            "email": decoded["email"],
            "name": decoded["name"],
            "sub": decoded["sub"],
        },
        "access_token": tokens["access_token"],
    }

@app.get("/protected")
async def protected(authorization: str = Depends(extract_user)):
    return {"message": f"Hello {authorization['email']}"}

async def extract_user(authorization: str = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ")[1]
    try:
        decoded = jwt.decode(token, options={"verify_signature": False})
        if decoded["exp"] < time.time():
            raise HTTPException(status_code=401, detail="Token expired")
        return decoded
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### JavaScript (Express + OIDC)

```javascript
const express = require("express");
const { auth } = require("express-openid-connect");

const app = express();

app.use(
    auth({
        issuerBaseURL: "https://accounts.google.com",
        baseURL: "http://localhost:3000",
        clientID: "your-client-id",
        secret: "your-secret-key",
        authRequired: false,
        auth0Logout: true,
        routes: {
            login: "/auth/login",
            callback: "/auth/callback",
            logout: "/auth/logout",
        },
    })
);

app.get("/", (req, res) => {
    if (req.oidc.isAuthenticated()) {
        res.json({
            user: req.oidc.user,
            token: req.oidc.accessToken,
        });
    } else {
        res.json({ message: "Not authenticated. Visit /auth/login" });
    }
});

app.get("/profile", (req, res) => {
    if (!req.oidc.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    res.json({ user: req.oidc.user });
});

app.listen(3000);
```

### Java (Spring Security + OAuth2)

```java
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.client.oidc.web.logout.OidcClientInitiatedLogoutSuccessHandler;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.context.annotation.Bean;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class FederatedIdentityApp {

    @GetMapping("/user")
    public String user(@AuthenticationPrincipal OidcUser principal) {
        if (principal == null) return "Not authenticated";
        return "Hello, " + principal.getFullName() + " (" + principal.getEmail() + ")";
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
            ClientRegistrationRepository repo) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/user").authenticated()
                .anyRequest().permitAll()
            )
            .oauth2Login(oauth -> {})
            .logout(logout -> logout
                .logoutSuccessHandler(
                    new OidcClientInitiatedLogoutSuccessHandler(repo)
                )
            );
        return http.build();
    }

    public static void main(String[] args) {
        SpringApplication.run(FederatedIdentityApp.class, args);
    }
}

// application.yml:
// spring.security.oauth2.client.registration.google.client-id=xxx
// spring.security.oauth2.client.registration.google.client-secret=xxx
```

## Explicación

El patrón Federated Identity separa la autenticación de la aplicación:

- **Identity Provider (IdP)**: Google, GitHub, Azure AD, Okta. Almacena credenciales, maneja login flows.
- **Relying Party (RP)**: Tu aplicación. Confía en el IdP, recibe tokens, nunca ve contraseñas.
- **Protocolos**: OAuth2 (autorización), OIDC (capa de autenticación sobre OAuth2), SAML (enterprise SSO).
- **Token Flow**: Usuario → IdP (login) → Authorization Code → App intercambia code por tokens → App verifica ID token → Usuario autenticado.
- **Single Sign-On (SSO)**: Una vez autenticado con el IdP, el usuario puede acceder a múltiples RPs sin re-ingresar credenciales.

## Variantes

| Variante | Protocolo | Caso de Uso |
|---------|----------|----------|
| **OAuth2 Authorization Code** | OAuth2 | Web apps con intercambio de token server-side |
| **OIDC** | OIDC (OAuth2 + ID tokens) | Web y mobile apps modernas |
| **SAML 2.0** | SAML | Enterprise SSO, sistemas legacy |
| **Client Credentials** | OAuth2 | Autenticación service-to-service |
| **Device Code** | OAuth2 | TV, IoT, CLI devices sin browser |

## Pautas

- **Usar OIDC para nuevas aplicaciones** — provee ID tokens estandarizados con claims de usuario
- **Almacenar solo referencias de tokens, no contraseñas** — el IdP es dueño del almacenamiento de credenciales
- **Validar tokens en cada petición** — verificar firma, expiración, issuer, audience
- **Usar PKCE para clientes públicos** (SPAs, mobile) para prevenir interceptación de authorization code
- **Implementar refresh de tokens** — los access tokens expiran; usar refresh tokens para mantener sesiones
- **Mapear roles del IdP a roles locales** — no depender de nombres de roles específicos del IdP en lógica de negocio
- **Manejar outage del IdP gracefulmente** — cachear sesiones de usuario, proveer modo degradado si es posible
- **Usar discovery endpoints** — los IdPs publican configuración en `/.well-known/openid-configuration`

## Errores Comunes

- Almacenar contraseñas localmente junto con federated identity — derrota el propósito
- No validar firmas de tokens — permite tokens forjados
- Ignorar expiración de tokens — tokens stale otorgan acceso después de revocación
- Hardcodear endpoints del IdP — usar discovery documents para flexibilidad
- No manejar outage del IdP — los usuarios no pueden log in si el IdP está down y no hay fallback
- Mezclar scopes de OAuth2 — solicitar solo lo necesario (openid, email, profile)
- No implementar logout — los usuarios se quedan logueados across apps incluso después de logout explícito
- Confiar en claims no verificados — siempre verificar issuer y audience antes de usar claims

## Preguntas Frecuentes

**P: ¿Cuál es la diferencia entre OAuth2 y OIDC?**
R: OAuth2 es un framework de autorización — otorga acceso a recursos. OIDC es una capa de autenticación construida sobre OAuth2 — prueba quién es el usuario vía ID tokens. Usar OIDC cuando necesitas autenticación, OAuth2 cuando necesitas acceso delegado.

**P: ¿Debo usar SAML u OIDC?**
R: Usar OIDC para nuevas aplicaciones — es más simple, basado en JSON, y funciona bien con mobile y SPAs. Usar SAML para integraciones enterprise donde el IdP solo soporta SAML (Azure AD, ADFS, sistemas legacy).

**P: ¿Cómo manejo múltiples proveedores de identidad?**
R: Implementar una estrategia multi-IdP. Dejar que los usuarios elijan su provider al login. Mapear todos los providers a un registro de usuario local usando el claim `sub` como identificador único. Librerías como Passport.js (Node) o Spring Security (Java) soportan múltiples providers nativamente.
