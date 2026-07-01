---
contentType: recipes
slug: nodejs-oauth2-github-login
title: "Login con OAuth2 de GitHub en Node.js con Express"
description: "Implementa el flujo de login OAuth2 de GitHub en Node.js con Express y Passport."
metaDescription: "Implementa login OAuth2 de GitHub en Node.js con Express y Passport. Cubre authorization code flow, parámetro state, intercambio de tokens y gestión de sesiones."
difficulty: intermediate
topics:
  - authentication
tags:
  - nodejs
  - oauth2
  - github
  - express
  - passport
  - authentication
  - security
relatedResources:
  - /recipes/oauth2-login
  - /recipes/nodejs-jwt-authentication
  - /recipes/oauth2-pkce-spa
  - /docs/api-security-checklist-template
  - /guides/authentication-and-authorization
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Implementa login OAuth2 de GitHub en Node.js con Express y Passport. Cubre authorization code flow, parámetro state, intercambio de tokens y gestión de sesiones."
  keywords:
    - nodejs oauth2 github
    - github login express
    - passport github strategy
    - oauth2 authorization code
    - nodejs social login
    - github oauth flow
---

## Visión General

El login OAuth2 de GitHub permite a los usuarios autenticarse con su cuenta de GitHub en vez de crear una nueva contraseña. Esta recipe cubre el authorization code flow con Passport.js, implementación manual sin Passport, el parámetro state para protección CSRF y gestión de sesiones en Express.

## Cuándo Usar

- Quieres que los usuarios inicien sesión con GitHub en vez de gestionar contraseñas
- Estás construyendo una herramienta para desarrolladores donde los usuarios ya tienen cuentas de GitHub
- Necesitas acceso a datos de la API de GitHub en nombre del usuario
- Quieres social login para reducir la fricción de registro

## Solución

### GitHub OAuth2 con Passport.js

```javascript
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;

const app = express();

app.use(session({
    secret: process.env.SESSION_SECRET || "session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production", httpOnly: true }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/github/callback",
    scope: ["user:email"]
}, (accessToken, refreshToken, profile, done) => {
    const user = {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        email: profile.emails?.[0]?.value,
        avatar: profile.photos?.[0]?.value,
        accessToken: accessToken
    };
    return done(null, user);
}));

app.get("/auth/github", passport.authenticate("github"));

app.get("/auth/github/callback",
    passport.authenticate("github", { failureRedirect: "/login" }),
    (req, res) => {
        res.redirect("/profile");
    }
);

app.get("/auth/logout", (req, res) => {
    req.logout(() => {
        res.redirect("/");
    });
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/login");
}

app.get("/profile", ensureAuthenticated, (req, res) => {
    res.json({ user: req.user });
});

app.listen(3000, () => console.log("Server running on port 3000"));
```

### Flujo OAuth2 manual sin Passport

```javascript
const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const session = require("express-session");

const app = express();

app.use(session({
    secret: process.env.SESSION_SECRET || "session-secret",
    resave: false,
    saveUninitialized: false
}));

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/auth/github/callback";

app.get("/auth/github", (req, res) => {
    const state = crypto.randomUUID();
    req.session.oauthState = state;

    const params = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        scope: "user:email",
        state: state
    });

    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

app.get("/auth/github/callback", async (req, res) => {
    const { code, state } = req.query;

    if (!state || state !== req.session.oauthState) {
        return res.status(403).json({ error: "Invalid state parameter" });
    }

    delete req.session.oauthState;

    try {
        const tokenResponse = await axios.post(
            "https://github.com/login/oauth/access_token",
            {
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code: code,
                redirect_uri: REDIRECT_URI
            },
            {
                headers: { Accept: "application/json" }
            }
        );

        const accessToken = tokenResponse.data.access_token;

        const userResponse = await axios.get("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const emailsResponse = await axios.get("https://api.github.com/user/emails", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const primaryEmail = emailsResponse.data.find(e => e.primary)?.email;

        req.session.user = {
            id: userResponse.data.id,
            username: userResponse.data.login,
            name: userResponse.data.name,
            email: primaryEmail,
            avatar: userResponse.data.avatar_url
        };

        res.redirect("/profile");
    } catch (err) {
        res.status(500).json({ error: "OAuth callback failed" });
    }
});

app.get("/auth/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

app.get("/profile", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    res.json({ user: req.session.user });
});

app.listen(3000);
```

### OAuth2 con tokens JWT (stateless)

```javascript
const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/auth/github/callback";
const JWT_SECRET = process.env.JWT_SECRET || "jwt-secret";

app.get("/auth/github", (req, res) => {
    const state = crypto.randomUUID();

    const params = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        scope: "user:email",
        state: state
    });

    res.redirect(`https://github.com/login/oauth/authorize?${params}&state=${state}`);
});

app.get("/auth/github/callback", async (req, res) => {
    const { code, state } = req.query;

    try {
        const tokenResponse = await axios.post(
            "https://github.com/login/oauth/access_token",
            {
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code: code
            },
            { headers: { Accept: "application/json" } }
        );

        const accessToken = tokenResponse.data.access_token;

        const userResponse = await axios.get("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const githubUser = userResponse.data;

        const token = jwt.sign(
            {
                userId: githubUser.id,
                username: githubUser.login,
                provider: "github"
            },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        const refreshToken = jwt.sign(
            { userId: githubUser.id, provider: "github" },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ accessToken: token, refreshToken: refreshToken });
    } catch (err) {
        res.status(500).json({ error: "OAuth authentication failed" });
    }
});

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ error: "Invalid or expired token" });
    }
}

app.get("/api/me", authMiddleware, (req, res) => {
    res.json({ user: req.user });
});

app.listen(3000);
```

### Uso del access token de GitHub para llamadas a la API

```javascript
const axios = require("axios");

async function getGitHubRepos(accessToken) {
    const response = await axios.get("https://api.github.com/user/repos", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json"
        },
        params: {
            sort: "updated",
            per_page: 10
        }
    });
    return response.data;
}

async function getGitHubOrganizations(accessToken) {
    const response = await axios.get("https://api.github.com/user/orgs", {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
}

app.get("/api/my-repos", ensureAuthenticated, async (req, res) => {
    try {
        const repos = await getGitHubRepos(req.user.accessToken);
        res.json(repos.map(r => ({
            name: r.name,
            url: r.html_url,
            stars: r.stargazers_count
        })));
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch repos" });
    }
});
```

## Explicación

El authorization code flow de GitHub OAuth2 funciona en tres pasos:

1. **Redirect a GitHub**: El usuario es redirigido a `https://github.com/login/oauth/authorize` con tu client ID, los scopes solicitados y un parámetro state. El parámetro state previene ataques CSRF asegurando que el callback vino de una petición que tú iniciaste.

2. **Callback con code**: Después de que el usuario autoriza, GitHub redirige de vuelta a tu callback URL con un code temporal. Verificas que el parámetro state coincida con el que enviaste.

3. **Intercambiar code por token**: Tu servidor envía el code más el client secret al token endpoint de GitHub. GitHub retorna un access token. Usas este token para llamar a la API de GitHub y obtener los datos del usuario.

Conceptos clave:

- **Scopes**: Definen a qué datos puede acceder tu app. `user:email` otorga acceso al email del usuario. `repo` otorga acceso a sus repositorios.
- **Parámetro state**: Un string aleatorio que generas. Guárdalo en la sesión antes de redirigir. En el callback, verifica que coincida. Esto previene login CSRF.
- **Access token**: Usado para autenticar peticiones a la API de GitHub. Guárdalo de forma segura. Expira cuando el usuario revoca el acceso o cambia su contraseña.
- **Client secret**: Nunca lo expongas en código del lado del cliente. Siempre mantenlo en el servidor.

## Variantes

| Enfoque | Librería | Sesión | Usar Cuando |
|---------|---------|---------|-------------|
| Passport.js | passport-github2 | Sesión del servidor | Setup rápido, Express estándar |
| Flujo manual | axios | Sesión del servidor | Flujo custom, sin dependencia de Passport |
| Basado en JWT | axios + jsonwebtoken | Stateless | Solo API, sin sesiones de servidor |
| Flujo PKCE | manual | SPA / mobile | Clientes públicos sin secret |

## Pautas

- Siempre usa el parámetro state para prevenir ataques CSRF.
- Almacena el access token encriptado si lo persistes en la base de datos.
- Solicita solo los scopes que necesitas. Los usuarios ven qué permisos están otorgando.
- Setea `secure: true` en las cookies de sesión en producción.
- Usa cookies `httpOnly` para prevenir que XSS robe los session tokens.
- Redirige a una página específica después del login, no a la homepage.
- Maneja el caso donde el usuario niega la autorización (GitHub envía `error=access_denied`).

## Errores Comunes

- No verificar el parámetro state. Los atacantes pueden forjar peticiones de callback.
- Exponer el client secret en código frontend. Debe quedarse en el servidor.
- Solicitar demasiados scopes. Los usuarios pueden rechazar la autorización si se les pide demasiado.
- No manejar el caso de denegación. GitHub redirige de vuelta con `error=access_denied`.
- Almacenar access tokens en localStorage. Ataques XSS pueden robarlos. Usa cookies httpOnly o sesiones del lado del servidor.

## Preguntas Frecuentes

### ¿Cómo obtengo un client ID y client secret de GitHub OAuth?

Ve a GitHub Settings > Developer settings > OAuth Apps > New OAuth App. Completa el nombre de la aplicación, homepage URL y authorization callback URL. GitHub provee un client ID y un client secret.

### ¿Cómo refresco un token OAuth de GitHub?

Los tokens OAuth de GitHub no expiran automáticamente. Permanecen válidos hasta que el usuario revoca la autorización o un admin revoca el token. Puedes verificar si un token sigue válido llamando `GET https://api.github.com/user` con el token.

### ¿Puedo usar GitHub OAuth para una SPA sin backend?

No. El client secret no debe exponerse en código frontend. Para SPAs, usa el flujo PKCE con un proxy backend que intercambie el code por un token, o usa una serverless function para el paso de intercambio de token.

### ¿Cómo revoco un token OAuth de GitHub?

Llama `DELETE https://api.github.com/applications/{client_id}/token` con basic auth (client ID y secret) y el access token en el body:

```javascript
await axios.delete(
    `https://api.github.com/applications/${CLIENT_ID}/token`,
    {
        auth: { username: CLIENT_ID, password: CLIENT_SECRET },
        data: { access_token: accessToken }
    }
);
```
