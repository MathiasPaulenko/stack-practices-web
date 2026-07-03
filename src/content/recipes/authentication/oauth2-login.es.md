---
contentType: recipes
slug: oauth2-login
title: "Inicio de Sesión OAuth 2.0"
description: "Cómo implementar autenticación OAuth 2.0 con Google, GitHub y otros proveedores."
metaDescription: "Aprende a implementar inicio de sesión OAuth 2.0 en Python, JavaScript y Java. Cubre flujo de código de autorización, PKCE, parámetro state y refresh de tokens."
difficulty: intermediate
topics:
  - authentication
tags:
  - authentication
  - oauth2
  - security
  - oauth
  - jwt
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/password-hashing
  - /recipes/middleware
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a implementar inicio de sesión OAuth 2.0 en Python, JavaScript y Java. Cubre flujo de código de autorización, PKCE, parámetro state y refresh de tokens."
  keywords:
    - oauth2 login tutorial
    - iniciar sesion con google
    - passport js oauth
    - spring security oauth2
    - pkce oauth2
---
## Visión General

OAuth 2.0 es el estándar de la industria para autorización delegada. Permite que los usuarios inicien sesión con cuentas existentes (Google, GitHub, Microsoft) sin exponer sus contraseñas a tu aplicación. Esta receta implementa el flujo de Código de Autorización con PKCE en Python, JavaScript y Java, incluyendo validación de state y refresh de tokens.

## Cuándo Usar

Usa este recurso cuando:
- Quieras ofrecer "Iniciar sesión con Google / GitHub" en tu plataforma. Consulta [Magic Links](/recipes/authentication/magic-link-authentication) para alternativas sin contraseña.
- Necesites acceder a datos de usuarios desde APIs de terceros en su nombre
- Quieras reducir fatiga de contraseñas y mejorar seguridad
- Construyas una SaaS con requisitos de SSO enterprise

## Solución

### Python (Flask + Authlib)

```python
from flask import Flask, redirect, session, url_for
from authlib.integrations.flask_client import OAuth
import secrets

app = Flask(__name__)
app.secret_key = "dev-secret"
oauth = OAuth(app)

google = oauth.register(
    name="google",
    client_id="GOOGLE_CLIENT_ID",
    client_secret="GOOGLE_CLIENT_SECRET",
    access_token_url="https://oauth2.googleapis.com/token",
    authorize_url="https://accounts.google.com/o/oauth2/auth",
    api_base_url="https://www.googleapis.com/oauth2/v1/",
    client_kwargs={"scope": "openid email profile"},
)

@app.route("/login")
def login():
    redirect_uri = url_for("callback", _external=True)
    return google.authorize_redirect(redirect_uri)

@app.route("/callback")
def callback():
    token = google.authorize_access_token()
    user = google.get("userinfo").json()
    session["user"] = user
    return redirect("/dashboard")
```

### JavaScript (Express + Passport)

```javascript
const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      // Encontrar o crear usuario en DB
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

const app = express();
app.use(passport.initialize());
app.use(passport.session());

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => res.redirect("/dashboard")
);
```

### Java (Spring Security + OAuth2 Client)

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/login").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .defaultSuccessUrl("/dashboard", true)
            )
            .logout(logout -> logout
                .logoutSuccessUrl("/")
            );
        return http.build();
    }
}
```

## Explicación

El **flujo de Código de Autorización** funciona en cuatro pasos:

1. **Redirección**: Tu app redirige al usuario a la URL de autorización del proveedor con `client_id`, `redirect_uri`, `scope` y un parámetro `state` aleatorio.
2. **Consentimiento**: El usuario inicia sesión en el proveedor y acepta los scopes solicitados.
3. **Callback**: El proveedor redirige de vuelta a tu app con un `code` de autorización.
4. **Intercambio de Token**: Tu backend intercambia el `code` por un `access_token` e `id_token` usando tu `client_secret`.

**PKCE** (Proof Key for Code Exchange) agrega un verificador secreto para prevenir ataques de interceptación en apps móviles y SPAs. **State** previene [CSRF](/recipes/authentication/session-management) vinculando el callback a la solicitud original.

## Variantes

| Flujo | Caso de Uso | Client Secret? | PKCE? |
|-------|-------------|----------------|-------|
| Código de Autorización | Apps web server-side | Sí | Opcional |
| Código de Autorización + PKCE | SPAs, apps móviles | No | Requerido |
| Implicit (obsoleto) | SPAs legacy | No | No |
| Client Credentials | Máquina a máquina | Sí | No |
| Device Code | TVs, herramientas CLI | No | No |

## Lo que funciona

- **Usa PKCE incluso para apps server**: Es una adición de una línea y elimina el riesgo de interceptación de código.
- **Valida el parámetro `state`**: Siempre compara el state en el callback con el almacenado en la sesión del usuario.
- **Almacena tokens encriptados**: Access tokens y refresh tokens son tan sensibles como contraseñas.
- **Implementa refresh de tokens**: Los access tokens expiran rápidamente; usa refresh tokens para mantener sesiones.
- **Scope mínimo**: Solo solicita permisos que tu app realmente necesita.

## Errores Comunes

- **Omitir validación de state**: Abre tu app a ataques de CSRF en login.
- **Guardar tokens en localStorage**: XSS puede robarlos. Usa [cookies httpOnly](/recipes/authentication/session-management).
- **No manejar revocación de tokens**: Los usuarios esperan que "Cerrar sesión en todos lados" funcione.
- **Hardcodear redirect URIs**: Deben coincidir exactamente con las URIs registradas en el proveedor.
- **Ignorar branding de pantalla de consentimiento**: Una pantalla de consentimiento OAuth genérica reduce tasas de conversión.

## Preguntas Frecuentes

### Puedo usar OAuth 2.0 para autenticación máquina a máquina?

Sí, con el flujo de **Client Credentials**. El cliente se autentica directamente con su ID y secreto (o JWT de aserción de cliente) para obtener un access token. No hay interacción de usuario. Es ideal para servicios backend, cron jobs y microservicios.

### Cómo soporto múltiples proveedores (Google, GitHub, Microsoft)?

Usa una librería que abstraiga diferencias de proveedores (Passport.js, Authlib, Spring Security). Consulta [Autenticación con API Keys](/recipes/authentication/api-key-authentication) para auth máquina a máquina. Almacena campos específicos del proveedor (`provider`, `provider_user_id`) en tu tabla de usuarios. Normaliza campos de email/nombre entre proveedores para crear un perfil de usuario unificado.

### Cuál es la diferencia entre OAuth 2.0 y OpenID Connect?

OAuth 2.0 es un framework de **autorización** ("Puede esta app acceder a mis datos?"). OpenID Connect (OIDC) es una capa de **autenticación** construida sobre OAuth 2.0 que estandariza claims de identidad (`id_token`, `/userinfo`). Si solo necesitas login (quién es este usuario?), OIDC es suficiente. Si necesitas acceso a APIs, necesitas scopes de OAuth 2.0.
