---
contentType: recipes
slug: nodejs-jwt-authentication
title: "Node.js JWT Authentication: Verify and Refresh Tokens"
description: "Implement JWT authentication in Node.js with access and refresh tokens"
metaDescription: "Implement JWT authentication in Node.js with access tokens, refresh tokens, token rotation, and secure verification using jsonwebtoken and Express."
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
  - /docs/endpoint-security-checklist-template
  - /patterns/python-jwt-refresh-token-rotation
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Implement JWT authentication in Node.js with access tokens, refresh tokens, token rotation, and secure verification using jsonwebtoken and Express."
  keywords:
    - nodejs jwt
    - jwt authentication
    - refresh token nodejs
    - jsonwebtoken express
    - token rotation
    - jwt verify
---

## Overview

JWT (JSON Web Tokens) provide stateless authentication for APIs. A signed token contains user claims and is verified without server-side session storage. This approach handles generating access tokens, refresh tokens, token rotation, and protecting Express routes with JWT verification.

## When to Use

- You are building a stateless API and need authentication without server-side sessions
- You want short-lived access tokens with long-lived refresh tokens
- You need to implement token rotation for enhanced security
- You are building a microservices architecture where services verify tokens independently

## Solution

### Basic JWT generation and verification

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

### Express middleware for JWT authentication

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

### Login and refresh token flow

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

### Token rotation with refresh token reuse detection

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

### RS256 asymmetric tokens

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

## Explanation

JWT tokens have three parts: header, payload, and signature, separated by dots. The header specifies the algorithm. The payload contains claims like `userId`, `role`, `exp` (expiration), `iat` (issued at), `iss` (issuer), and `aud` (audience). The signature ensures the token has not been tampered with.

Key concepts:

- **Access tokens**: Short-lived (15 minutes). Sent with every API request. No server-side storage needed.
- **Refresh tokens**: Long-lived (7 days). Used only to get new access tokens. Must be stored server-side to allow revocation.
- **Token rotation**: Each refresh produces a new refresh token. The old one is invalidated. If a reused token is detected, the entire token family is revoked.
- **HS256 vs RS256**: HS256 uses a shared secret. RS256 uses a private/public key pair. The server signs with the private key; other services verify with the public key.

## Variants

| Approach | Algorithm | Storage | Use When |
|----------|-----------|---------|----------|
| HS256 | Symmetric | Shared secret | Single server, simple setup |
| RS256 | Asymmetric | Key pair | Microservices, multiple verifiers |
| ES256 | Asymmetric | EC key pair | Mobile apps, constrained devices |
| Redis-backed | HS256 | Redis | Distributed refresh token store |
| Database-backed | HS256 | SQL | When Redis is unavailable |

## Guidelines

- Use separate secrets for access and refresh tokens.
- Set short expiration on access tokens (15 minutes). Use refresh tokens for long sessions.
- Store refresh tokens server-side to enable revocation.
- Implement token rotation with reuse detection to catch token theft.
- Use RS256 in microservices so services can verify tokens with the public key without the private key.
- Set `issuer` and `audience` claims to prevent token confusion across services.
- Never store tokens in localStorage for browser apps. Use httpOnly cookies.

## Common Mistakes

- Using the same secret for access and refresh tokens. If one is compromised, both are.
- Not validating `issuer` and `audience`. Tokens from other services may be accepted.
- Storing tokens in localStorage. XSS attacks can steal them. Use httpOnly cookies.
- Not implementing refresh token revocation. Users cannot log out if tokens are only stateless.
- Setting long expiration on access tokens. If stolen, the attacker has access for the full duration.

## Frequently Asked Questions

### Should I use JWT or server-side sessions?

JWT works best for stateless APIs and microservices where services verify tokens independently. Server-side sessions are simpler for monolithic apps and offer easier revocation. Use JWT when you need horizontal scaling without shared session storage.

### How do I revoke a JWT before it expires?

Access tokens cannot be revoked without server-side tracking. Options: maintain a blacklist of revoked token IDs (jti), or keep expiration very short (15 minutes). Refresh tokens should always be stored server-side so they can be revoked immediately.

### What is the difference between HS256 and RS256?

HS256 uses a single shared secret for both signing and verifying. RS256 uses a private key to sign and a public key to verify. RS256 is safer in microservices: each service only needs the public key, so a compromised service cannot forge tokens.

### How do I handle token expiration gracefully?

Return a specific error code (`token_expired`) so the client knows to use the refresh token. The client should transparently refresh and retry the failed request:

```javascript
if (error.response.status === 401 && error.response.data.code === "token_expired") {
    const newToken = await refreshToken();
    retryOriginalRequest(newToken);
}
```
