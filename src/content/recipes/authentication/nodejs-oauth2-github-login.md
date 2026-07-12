---

contentType: recipes
slug: nodejs-oauth2-github-login
title: "Node.js OAuth2 GitHub Login with Express"
description: "Implement GitHub OAuth2 login flow in Node.js with Express and Passport"
metaDescription: "Implement GitHub OAuth2 login in Node.js with Express and Passport. Covers authorization code flow, state parameter, token exchange, and session management."
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
  - /docs/endpoint-security-checklist-template
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Implement GitHub OAuth2 login in Node.js with Express and Passport. Covers authorization code flow, state parameter, token exchange, and session management."
  keywords:
    - nodejs oauth2 github
    - github login express
    - passport github strategy
    - oauth2 authorization code
    - nodejs social login
    - github oauth flow

---

## Overview

OAuth2 GitHub login lets users authenticate with their GitHub account instead of creating a new password. The solution below covers the authorization code flow with Passport.js, manual implementation without Passport, state parameter for CSRF protection, and session management in Express.

## When to Use


- For alternatives, see [Node.js JWT Authentication: Verify and Refresh Tokens](/recipes/nodejs-jwt-authentication/).

- You want to let users log in with GitHub instead of managing passwords
- You are building a developer tool where users already have GitHub accounts
- You need access to GitHub API data on behalf of the user
- You want social login to reduce signup friction

## Solution

### GitHub OAuth2 with Passport.js

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
    // Here you would find or create user in your database
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

### Manual OAuth2 flow without Passport

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

### OAuth2 with JWT tokens (stateless)

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

    // Encode state in the redirect URL to verify on callback
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

### Using GitHub access token for API calls

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

// Usage in a protected route
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

## Explanation

The GitHub OAuth2 authorization code flow works in three steps:

1. **Redirect to GitHub**: The user is redirected to `https://github.com/login/oauth/authorize` with your client ID, requested scopes, and a state parameter. The state parameter prevents CSRF attacks by ensuring the callback came from a request you initiated.

2. **Callback with code**: After the user authorizes, GitHub redirects back to your callback URL with a temporary code. You verify the state parameter matches what you sent.

3. **Exchange code for token**: Your server sends the code plus client secret to GitHub's token endpoint. GitHub returns an access token. You use this token to call GitHub's API and fetch user data.

Key concepts:

- **Scopes**: Define what data your app can access. `user:email` grants access to the user's email. `repo` grants access to their repositories.
- **State parameter**: A random string you generate. Store it in the session before redirecting. On callback, verify it matches. This prevents login CSRF.
- **Access token**: Used to authenticate API requests to GitHub. Store it securely. It expires when the user revokes access or changes password.
- **Client secret**: Never expose in client-side code. Always keep it on the server.

## Variants

| Approach | Library | Session | Use When |
|---------|---------|---------|----------|
| Passport.js | passport-github2 | Server session | Quick setup, standard Express |
| Manual flow | axios | Server session | Custom flow, no Passport dependency |
| JWT-based | axios + jsonwebtoken | Stateless | API-only, no server sessions |
| PKCE flow | manual | SPA / mobile | Public clients without secret |

## Guidelines

- Always use the state parameter to prevent CSRF attacks.
- Store the access token encrypted if you persist it in the database.
- Request only the scopes you need. Users see what permissions they are granting.
- Set `secure: true` on session cookies in production.
- Use `httpOnly` cookies to prevent XSS from stealing session tokens.
- Redirect to a specific page after login, not the homepage.
- Handle the case where the user denies authorization (GitHub sends `error=access_denied`).

## Common Mistakes

- Not verifying the state parameter. Attackers can forge callback requests.
- Exposing the client secret in frontend code. It must stay on the server.
- Requesting too many scopes. Users may decline authorization if asked for too much.
- Not handling the denial case. GitHub redirects back with `error=access_denied`.
- Storing access tokens in localStorage. XSS attacks can steal them. Use httpOnly cookies or server-side sessions.

## Frequently Asked Questions

### How do I get a GitHub OAuth client ID and secret?

Go to GitHub Settings > Developer settings > OAuth Apps > New OAuth App. Fill in the application name, homepage URL, and authorization callback URL. GitHub provides a client ID and client secret.

### How do I refresh a GitHub OAuth token?

GitHub OAuth tokens do not expire automatically. They remain valid until the user revokes authorization or an admin revokes the token. You can check if a token is still valid by calling `GET https://api.github.com/user` with the token.

### Can I use GitHub OAuth for a SPA without a backend?

No. The client secret must not be exposed in frontend code. For SPAs, use the PKCE flow with a backend proxy that exchanges the code for a token, or use a serverless function for the token exchange step.

### How do I revoke a GitHub OAuth token?

Call `DELETE https://api.github.com/applications/{client_id}/token` with basic auth (client ID and secret) and the access token in the body:

```javascript
await axios.delete(
    `https://api.github.com/applications/${CLIENT_ID}/token`,
    {
        auth: { username: CLIENT_ID, password: CLIENT_SECRET },
        data: { access_token: accessToken }
    }
);
```
