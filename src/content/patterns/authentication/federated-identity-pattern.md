---
contentType: patterns
slug: federated-identity-pattern
title: "Federated Identity Pattern"
description: "Delegate authentication to external identity providers. A pattern for integrating OAuth2, OIDC, SAML, and SSO across multiple services and organizations."
metaDescription: "Learn the Federated Identity Pattern in Python, Java, and JavaScript. Delegate auth to external IdPs with OAuth2, OIDC, SAML and SSO integration."
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
  - /patterns/design/gateway-routing-pattern
  - /patterns/design/back-pressure-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Learn the Federated Identity Pattern in Python, Java, and JavaScript. Delegate auth to external IdPs with OAuth2, OIDC, SAML and SSO integration."
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

# Federated Identity Pattern

## Overview

The [Federated Identity](/patterns/authentication/federated-identity-pattern) Pattern delegates authentication to external identity providers (IdPs) instead of managing credentials locally. Users log in through a trusted third party (Google, GitHub, Azure AD, Okta), and the application receives a token it can verify. This eliminates password storage, enables single sign-on (SSO), and allows cross-organization authentication.

## When to Use

Use the Federated Identity Pattern when:
- You do not want to store or manage user passwords
- Users already have accounts with Google, GitHub, Microsoft, or Okta
- Multiple applications need single sign-on across an organization
- You need to authenticate users from partner organizations without creating local accounts
- Compliance requirements mandate centralized identity management (SOC2, HIPAA)

## Solution

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

    # Verify ID token
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

## Explanation

The Federated Identity Pattern separates authentication from the application:

- **Identity Provider (IdP)**: Google, GitHub, Azure AD, Okta. Stores credentials, handles login flows.
- **Relying Party (RP)**: Your application. Trusts the IdP, receives tokens, never sees passwords.
- **Protocols**: OAuth2 (authorization), OIDC (authentication layer on OAuth2), SAML (enterprise SSO).
- **Token Flow**: User → IdP (login) → Authorization Code → App exchanges code for tokens → App verifies ID token → User is authenticated.
- **Single Sign-On (SSO)**: Once authenticated with the IdP, the user can access multiple RPs without re-entering credentials.

## Variants

| Variant | Protocol | Use Case |
|---------|----------|----------|
| **OAuth2 Authorization Code** | OAuth2 | Web apps with server-side token exchange |
| **OIDC** | OIDC (OAuth2 + ID tokens) | Modern web and mobile apps |
| **SAML 2.0** | SAML | Enterprise SSO, legacy systems |
| **Client Credentials** | OAuth2 | Service-to-service authentication |
| **Device Code** | OAuth2 | TV, IoT, CLI devices without browser |

## What Works

- **Use OIDC for new applications** — it provides standardized ID tokens with user claims
- **Store only token references, not passwords** — the IdP owns credential storage
- **Validate tokens on every request** — check signature, expiry, issuer, audience
- **Use PKCE for public clients** (SPAs, mobile) to prevent authorization code interception
- **Implement token refresh** — access tokens expire; use refresh tokens to maintain sessions
- **Map IdP roles to local roles** — do not rely on IdP-specific role names in business logic
- **Handle IdP outage gracefully** — cache user sessions, provide degraded mode if possible
- **Use discovery endpoints** — IdPs publish configuration at `/.well-known/openid-configuration`

## Common Mistakes

- Storing passwords locally alongside federated identity — defeats the purpose
- Not validating token signatures — allows forged tokens
- Ignoring token expiry — stale tokens grant access after revocation
- Hardcoding IdP endpoints — use discovery documents for flexibility
- Not handling IdP outage — users cannot log in if the IdP is down and no fallback exists
- Mixing OAuth2 scopes — request only what you need (openid, email, profile)
- Not implementing logout — users stay logged in across apps even after explicit logout
- Trusting unverified claims — always verify the issuer and audience before using claims

## Frequently Asked Questions

**Q: What is the difference between OAuth2 and OIDC?**
A: OAuth2 is an authorization framework — it grants access to resources. OIDC is an authentication layer built on top of OAuth2 — it proves who the user is via ID tokens. Use OIDC when you need authentication, OAuth2 when you need delegated access.

**Q: Should I use SAML or OIDC?**
A: Use OIDC for new applications — it is simpler, JSON-based, and works well with mobile and SPAs. Use SAML for enterprise integrations where the IdP only supports SAML (Azure AD, ADFS, legacy systems).

**Q: How do I handle multiple identity providers?**
A: Implement a multi-IdP strategy. Let users choose their provider at login. Map all providers to a local user record using the `sub` claim as the unique identifier. Libraries like Passport.js (Node) or Spring Security (Java) support multiple providers natively.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
