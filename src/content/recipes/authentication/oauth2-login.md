---
contentType: recipes
slug: oauth2-login
title: "OAuth 2.0 Login"
description: "How to implement OAuth 2.0 authentication with Google, GitHub, and other providers."
metaDescription: "Learn to implement OAuth 2.0 login in Python, JavaScript, and Java. Covers authorization code flow, PKCE, state parameter, and token refresh."
difficulty: intermediate
topics:
  - authentication
tags:
  - authentication
  - oauth2
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/password-hashing
  - /recipes/middleware
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn to implement OAuth 2.0 login in Python, JavaScript, and Java. Covers authorization code flow, PKCE, state parameter, and token refresh."
  keywords:
    - oauth2
    - authentication
    - google
    - github
    - sso
    - python
    - javascript
    - java
---
## Overview

OAuth 2.0 is the industry standard for delegated authorization. It lets users log in with existing accounts (Google, GitHub, Microsoft) without exposing their passwords to your application. This recipe implements the Authorization Code flow with PKCE in Python, JavaScript, and Java, including state validation and token refresh.

## When to Use

Use this resource when:
- You want to offer "Sign in with Google / GitHub" on your platform. See [Magic Links](/recipes/authentication/magic-link-authentication) for passwordless alternatives.
- You need to access user data from third-party APIs on their behalf
- You want to reduce password fatigue and improve security
- You're building a SaaS with enterprise SSO requirements

## Solution

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
      // Find or create user in DB
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

## Explanation

The **Authorization Code flow** works in four steps:

1. **Redirect**: Your app redirects the user to the provider's authorization URL with `client_id`, `redirect_uri`, `scope`, and a random `state` parameter.
2. **Consent**: The user logs in to the provider and consents to the requested scopes.
3. **Callback**: The provider redirects back to your app with an authorization `code`.
4. **Token Exchange**: Your backend exchanges the `code` for an `access_token` and `id_token` using your `client_secret`.

**PKCE** (Proof Key for Code Exchange) adds a secret verifier to prevent interception attacks on mobile and SPA apps. **State** prevents [CSRF](/recipes/authentication/session-management) by binding the callback to the original request.

## Variants

| Flow | Use Case | Client Secret? | PKCE? |
|------|----------|----------------|-------|
| Authorization Code | Server-side web apps | Yes | Optional |
| Authorization Code + PKCE | SPAs, mobile apps | No | Required |
| Implicit (deprecated) | Legacy SPAs | No | No |
| Client Credentials | Machine-to-machine | Yes | No |
| Device Code | TVs, CLI tools | No | No |

## Best Practices

- **Use PKCE even for server apps**: It's a one-line addition and eliminates code interception risk.
- **Validate the `state` parameter**: Always compare the state in the callback with the one stored in the user's session.
- **Store tokens encrypted**: Access tokens and refresh tokens are as sensitive as passwords.
- **Implement token refresh**: Access tokens expire quickly; use refresh tokens to maintain sessions.
- **Scope minimally**: Only request permissions your app actually needs.

## Common Mistakes

- **Skipping state validation**: Opens your app to CSRF login attacks.
- **Storing tokens in localStorage**: XSS can steal them. Use [httpOnly cookies](/recipes/authentication/session-management).
- **Not handling token revocation**: Users expect "Log out everywhere" to work.
- **Hardcoding redirect URIs**: Must match the provider's registered URIs exactly.
- **Ignoring consent screen branding**: A generic OAuth consent screen reduces conversion rates.

## Frequently Asked Questions

### Can I use OAuth 2.0 for machine-to-machine authentication?

Yes, with the **Client Credentials** flow. The client authenticates directly with its ID and secret (or client assertion JWT) to obtain an access token. No user interaction is involved. This is ideal for backend services, cron jobs, and microservices.

### How do I support multiple providers (Google, GitHub, Microsoft)?

Use a library that abstracts provider differences (Passport.js, Authlib, Spring Security). See [API Key Authentication](/recipes/authentication/api-key-authentication) for machine-to-machine auth. Store provider-specific fields (`provider`, `provider_user_id`) in your user table. Normalize email/name fields across providers to create a unified user profile.

### What is the difference between OAuth 2.0 and OpenID Connect?

OAuth 2.0 is an **authorization** framework ("Can this app access my data?"). OpenID Connect (OIDC) is an **authentication** layer built on top of OAuth 2.0 that standardizes identity claims (`id_token`, `/userinfo`). If you only need login (who is this user?), OIDC is sufficient. If you need API access, you need OAuth 2.0 scopes.
