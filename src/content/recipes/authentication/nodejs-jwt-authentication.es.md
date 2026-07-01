---
contentType: recipes
slug: nodejs-jwt-authentication
title: "Autenticación JWT en Node.js: Verificar y Refrescar Tokens"
description: "Implementa autenticación JWT en Node.js con access y refresh tokens."
metaDescription: "Implementa autenticación JWT en Node.js con access tokens, refresh tokens, rotación de tokens y verificación segura usando jsonwebtoken y Express."
difficulty: intermediate
topics:
  - authentication
tags:
  - nodejs
  - jwt
  - authentication
  - express
  - jsonwebtoken
  - security
  - tokens
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/nodejs-oauth2-github-login
  - /docs/api-security-checklist-template
  - /guides/authentication-and-authorization
  - /patterns/token-refresh-rotation
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Implementa autenticación JWT en Node.js con access tokens, refresh tokens, rotación de tokens y verificación segura usando jsonwebtoken y Express."
  keywords:
    - nodejs jwt autenticación
    - refresh token nodejs
    - jsonwebtoken express
    - rotación de tokens
    - jwt verify nodejs
    - RS256 nodejs
---

## Visión General

JWT (JSON Web Tokens) proveen autenticación stateless para APIs. Un token firmado contiene claims del usuario y se verifica sin storage de sesión en el servidor. Esta recipe cubre generar access tokens, refresh tokens, rotación de tokens y proteger rutas Express con verificación JWT.

## Cuándo Usar

- Estás construyendo una API stateless y necesitas autenticación sin sesiones del lado del servidor
- Quieres access tokens de corta duración con refresh tokens de larga duración
- Necesitas implementar rotación de tokens para seguridad mejorada
- Estás construyendo una arquitectura de microservicios donde los servicios verifican tokens independientemente

## Solución

### Generación y verificación básica de JWT

```javascript
const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || "access-secret-change-me";
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || "refresh-secret-change-me";

function generateAccessToken(payload) {
    return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
        expiresIn: "15m",
        issuer: "my-api",
        audience: "my-api-users"
    });
}

function generateRefreshToken(payload) {
    return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
        expiresIn: "7d",
        issuer: "my-api",
        audience: "my-api-users"
    });
}

function verifyAccessToken(token) {
    try {
        return jwt.verify(token, ACCESS_TOKEN_SECRET, {
            issuer: "my-api",
            audience: "my-api-users"
        });
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return { error: "token_expired" };
        }
        return { error: "invalid_token" };
    }
}

// Usage
const user = { userId: 123, role: "admin" };
const accessToken = generateAccessToken(user);
const decoded = verifyAccessToken(accessToken);
console.log(decoded);
```

### Middleware de Express para autenticación JWT

```javascript
const express = require("express");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || "access-secret";

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET, {
            issuer: "my-api",
            audience: "my-api-users"
        });
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token expired", code: "token_expired" });
        }
        return res.status(401).json({ error: "Invalid token", code: "invalid_token" });
    }
}

function requireRole(role) {
    return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({ error: "Insufficient permissions" });
        }
        next();
    };
}

app.get("/api/public", (req, res) => {
    res.json({ message: "public endpoint" });
});

app.get("/api/profile", authMiddleware, (req, res) => {
    res.json({ user: req.user });
});

app.get("/api/admin", authMiddleware, requireRole("admin"), (req, res) => {
    res.json({ message: "admin only" });
});

app.listen(3000, () => console.log("Server running on port 3000"));
```

### Flujo de login y refresh token

```javascript
const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const app = express();
app.use(express.json());

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || "access-secret";
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || "refresh-secret";

// In-memory refresh token store (use Redis in production)
const refreshTokens = new Map();

// Mock user database
const users = [
    { id: 1, username: "admin", password: "$2a$10$hashedpassword", role: "admin" }
];

app.post("/auth/login", (req, res) => {
    const { username, password } = req.body;

    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password (use bcrypt in production)
    // if (!bcrypt.compareSync(password, user.password)) { ... }

    const payload = { userId: user.id, role: user.role };
    const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

    const tokenId = crypto.randomUUID();
    refreshTokens.set(tokenId, { refreshToken, userId: user.id });

    res.json({
        accessToken,
        refreshToken,
        expiresIn: 900
    });
});

app.post("/auth/refresh", (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token required" });
    }

    try {
        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

        // Check if token is in store (not revoked)
        const stored = [...refreshTokens.values()].find(t => t.refreshToken === refreshToken);
        if (!stored) {
            return res.status(401).json({ error: "Token revoked" });
        }

        // Generate new access token
        const newAccessToken = jwt.sign(
            { userId: decoded.userId, role: decoded.role },
            ACCESS_TOKEN_SECRET,
            { expiresIn: "15m" }
        );

        res.json({ accessToken: newAccessToken, expiresIn: 900 });
    } catch (err) {
        return res.status(401).json({ error: "Invalid refresh token" });
    }
});

app.post("/auth/logout", (req, res) => {
    const { refreshToken } = req.body;

    // Remove from store
    for (const [tokenId, data] of refreshTokens.entries()) {
        if (data.refreshToken === refreshToken) {
            refreshTokens.delete(tokenId);
            break;
        }
    }

    res.json({ message: "Logged out" });
});

app.listen(3000);
```

### Rotación de tokens con detección de reuso

```javascript
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || "refresh-secret";

// Store: { jti: { userId, token, family, createdAt } }
const tokenStore = new Map();

function generateRotatedRefreshToken(userId, family) {
    const jti = crypto.randomUUID();
    const token = jwt.sign({ userId, jti, family }, REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

    tokenStore.set(jti, { userId, token, family, createdAt: Date.now() });

    return token;
}

function rotateRefreshToken(oldToken) {
    let decoded;
    try {
        decoded = jwt.verify(oldToken, REFRESH_TOKEN_SECRET);
    } catch (err) {
        throw new Error("invalid_token");
    }

    const stored = tokenStore.get(decoded.jti);

    if (!stored) {
        // Token was already used — possible reuse attack
        // Revoke entire family
        for (const [jti, data] of tokenStore.entries()) {
            if (data.family === decoded.family) {
                tokenStore.delete(jti);
            }
        }
        throw new Error("reuse_detected");
    }

    if (stored.token !== oldToken) {
        throw new Error("invalid_token");
    }

    // Delete old token
    tokenStore.delete(decoded.jti);

    // Issue new token in same family
    return generateRotatedRefreshToken(decoded.userId, decoded.family);
}

// Usage in Express route
app.post("/auth/refresh", (req, res) => {
    try {
        const newRefreshToken = rotateRefreshToken(req.body.refreshToken);
        const decoded = jwt.verify(newRefreshToken, REFRESH_TOKEN_SECRET);
        const accessToken = jwt.sign(
            { userId: decoded.userId },
            ACCESS_TOKEN_SECRET,
            { expiresIn: "15m" }
        );

        res.json({ accessToken, refreshToken: newRefreshToken });
    } catch (err) {
        if (err.message === "reuse_detected") {
            return res.status(401).json({
                error: "Token reuse detected. All sessions revoked.",
                code: "reuse_detected"
            });
        }
        return res.status(401).json({ error: "Invalid refresh token" });
    }
});
```

### Tokens asimétricos RS256

```javascript
const fs = require("fs");
const jwt = require("jsonwebtoken");

const privateKey = fs.readFileSync("private.key", "utf8");
const publicKey = fs.readFileSync("public.key", "utf8");

function signToken(payload) {
    return jwt.sign(payload, privateKey, {
        algorithm: "RS256",
        expiresIn: "15m"
    });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, publicKey, { algorithms: ["RS256"] });
    } catch (err) {
        return { error: err.message };
    }
}
```

## Explicación

Los tokens JWT tienen tres partes: header, payload y signature, separadas por puntos. El header especifica el algoritmo. El payload contiene claims como `userId`, `role`, `exp` (expiración), `iat` (issued at), `iss` (issuer) y `aud` (audience). La signature asegura que el token no ha sido modificado.

Conceptos clave:

- **Access tokens**: Corta duración (15 minutos). Enviados con cada petición de API. Sin necesidad de storage del lado del servidor.
- **Refresh tokens**: Larga duración (7 días). Usados solo para obtener nuevos access tokens. Deben almacenarse del lado del servidor para permitir revocación.
- **Rotación de tokens**: Cada refresh produce un nuevo refresh token. El viejo se invalida. Si se detecta un token reusado, la familia entera de tokens se revoca.
- **HS256 vs RS256**: HS256 usa un shared secret. RS256 usa un par de llaves privada/pública. El servidor firma con la privada; otros servicios verifican con la pública.

## Variantes

| Enfoque | Algoritmo | Storage | Usar Cuando |
|---------|-----------|---------|-------------|
| HS256 | Simétrico | Shared secret | Servidor único, setup simple |
| RS256 | Asimétrico | Par de llaves | Microservicios, múltiples verificadores |
| ES256 | Asimétrico | EC key pair | Apps móviles, dispositivos restringidos |
| Redis-backed | HS256 | Redis | Store distribuido de refresh tokens |
| Database-backed | HS256 | SQL | Cuando Redis no está disponible |

## Pautas

- Usa secrets separados para access y refresh tokens.
- Setea expiración corta en access tokens (15 minutos). Usa refresh tokens para sesiones largas.
- Almacena refresh tokens del lado del servidor para habilitar revocación.
- Implementa rotación de tokens con detección de reuso para capturar robo de tokens.
- Usa RS256 en microservicios para que los servicios puedan verificar tokens con la llave pública sin la llave privada.
- Setea claims `issuer` y `audience` para prevenir confusion de tokens across servicios.
- Nunca almacenes tokens en localStorage para apps de browser. Usa httpOnly cookies.

## Errores Comunes

- Usar el mismo secret para access y refresh tokens. Si uno se compromete, ambos lo están.
- No validar `issuer` y `audience`. Tokens de otros servicios pueden ser aceptados.
- Almacenar tokens en localStorage. Ataques XSS pueden robarlos. Usa httpOnly cookies.
- No implementar revocación de refresh tokens. Los usuarios no pueden cerrar sesión si los tokens son solo stateless.
- Setear expiración larga en access tokens. Si son robados, el atacante tiene acceso por toda la duración.

## Preguntas Frecuentes

### ¿Debo usar JWT o sesiones del lado del servidor?

JWT funciona mejor para APIs stateless y microservicios donde los servicios verifican tokens independientemente. Las sesiones del lado del servidor son más simples para apps monolíticas y ofrecen revocación más fácil. Usa JWT cuando necesitas escalado horizontal sin shared session storage.

### ¿Cómo revoco un JWT antes de que expire?

Los access tokens no pueden revocarse sin tracking del lado del servidor. Opciones: mantener una blacklist de IDs de tokens revocados (jti), o mantener la expiración muy corta (15 minutos). Los refresh tokens siempre deben almacenarse del lado del servidor para poder revocarlos inmediatamente.

### ¿Cuál es la diferencia entre HS256 y RS256?

HS256 usa un único shared secret tanto para firmar como para verificar. RS256 usa una llave privada para firmar y una pública para verificar. RS256 es más seguro en microservicios: cada servicio solo necesita la llave pública, así que un servicio comprometido no puede forjar tokens.

### ¿Cómo manejo la expiración de tokens elegantemente?

Retorna un código de error específico (`token_expired`) para que el cliente sepa usar el refresh token. El cliente debería refrescar y reintentar la petición fallida de forma transparente:

```javascript
if (error.response.status === 401 && error.response.data.code === "token_expired") {
    const newToken = await refreshToken();
    retryOriginalRequest(newToken);
}
```
