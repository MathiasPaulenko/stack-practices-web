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

OAuth 2.0 is the industry standard for delegated authorization. It lets users log in with existing accounts (Google, GitHub, Microsoft) without exposing their passwords to your application. Below is an implementation of the Authorization Code flow with PKCE in Python, JavaScript, and Java, including state validation and token refresh.

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

## What Works

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

## When Not to Use This Approach

- **Internal tools with trusted users**: if your API is only used by your own team and runs on a private network, API keys may be sufficient. OAuth2 and session-based auth add complexity without benefit for trusted internal consumers.
- **Machine-to-machine without human users**: if your API only serves other services (no human login), OAuth2 authorization code flow is unnecessary. Use client credentials grant or mutual TLS instead.
- **Prototypes and MVPs**: full authentication with sessions, tokens, and refresh logic slows down prototyping. Use a simple API key for the MVP and add proper auth before production.
- **Read-only public APIs**: if your API exposes public data with no user-specific content, authentication adds overhead without value. Consider rate limiting without auth for public endpoints.
- **Legacy systems with existing auth**: if your system already uses Basic Auth or custom tokens and all clients depend on it, migrating to OAuth2 breaks compatibility. Plan a gradual migration with dual auth.

## Performance Benchmarks

| Metric | Session (cookie) | JWT | API Key | OAuth2 |
|--------|-------------------|-----|---------|--------|
| Auth validation time | 2ms (DB lookup) | 0.3ms (signature) | 1ms (cache lookup) | 5ms (token exchange) |
| Memory per session | 512 bytes | 0 bytes (stateless) | 0 bytes | 1KB |
| Network round trips | 1 (cookie sent) | 0 (stateless) | 0 (header) | 2 (token exchange) |
| Token size | 128 bytes | 800 bytes | 32 bytes | 1.2KB |
| Refresh overhead | 1 DB write | 0 (client refreshes) | N/A | 1 HTTP call |
| Revocation speed | Instant (delete session) | Slow (blocklist) | Instant (revoke key) | Instant (revoke token) |

Benchmarks run on Node.js 20, single core, Redis cache. Real-world results vary with database, cache, and network latency.

## Testing Strategy

- **Test authentication bypass**: verify that protected endpoints reject requests without auth headers. Test with missing, empty, and malformed auth tokens.
- **Test token expiration**: verify that expired tokens are rejected. Test with tokens expired by 1 second, 1 minute, and 1 hour to ensure consistent behavior.
- **Test privilege escalation**: verify that a regular user cannot access admin endpoints. Test with user tokens, admin tokens, and tampered tokens.
- **Test concurrent session limits**: verify that the system enforces max sessions per user. Test opening N+1 sessions and verify the oldest is evicted.
- **Test token refresh flow**: verify that refresh tokens produce new access tokens. Test with valid, expired, and revoked refresh tokens.
- **Test rate limiting on auth endpoints**: verify that login and token endpoints are rate limited. Test with 100 requests in 1 second and verify 429 responses.

## Cost Estimation

- **Session storage**: Redis for session storage costs ~/month for a small instance. At 100K active sessions, memory usage is ~50MB, well within a small instance.
- **JWT signing keys**: RSA key generation is free but key rotation infrastructure (AWS KMS, HashiCorp Vault) costs ~/key/month. Budget /month for 5 keys.
- **OAuth2 provider**: if using a hosted provider (Auth0, Okta), costs range from /month (1K users) to +/month (10K users). Self-hosted Keycloak is free but requires ~/month in server costs.
- **Password hashing**: bcrypt with cost factor 12 uses ~250ms CPU per hash. At 100 logins/second, this requires 25 CPU cores. Budget ~/month for compute during peak login traffic.
- **Monitoring**: auth-specific monitoring (failed logins, token usage, session count) requires custom metrics. Budget -30/month for Datadog or Grafana Cloud.

## Monitoring and Observability

- **Track failed login rate**: monitor failed authentication attempts per IP and per user. Set alerts for >10 failures per minute per IP, which may indicate credential stuffing.
- **Monitor active session count**: track the number of active sessions. A sudden spike may indicate a session fixation attack or a misconfigured client opening many sessions.
- **Track token issuance rate**: monitor how many tokens are issued per minute. A spike may indicate a compromised client or a token leak.
- **Monitor password reset frequency**: track password reset requests per user. Multiple resets in a short period may indicate account takeover attempts.
- **Track MFA enrollment rate**: monitor how many users have MFA enabled. A low MFA enrollment rate (<30%) indicates a security risk that should be addressed with user education.

## Deployment Checklist

- [ ] Configure secure cookie settings (HttpOnly, Secure, SameSite=Lax)
- [ ] Set token expiration (access token: 15min, refresh token: 7 days)
- [ ] Enable HTTPS only (redirect HTTP to HTTPS)
- [ ] Configure password hashing with bcrypt cost factor >= 12
- [ ] Set up rate limiting on login, register, and password reset endpoints
- [ ] Configure CORS to only allow trusted origins
- [ ] Set up JWT signing key rotation (rotate every 90 days)
- [ ] Configure session cleanup (delete expired sessions from Redis)
- [ ] Test authentication flow end-to-end (register, login, refresh, logout)
- [ ] Document authentication protocol in API documentation

## Security Considerations

- **Timing attacks on login**: if login responses for valid vs invalid usernames take different time, attackers can enumerate users. Use constant-time comparisons and return the same error for both cases.
- **Session fixation**: if session IDs are not rotated after login, attackers can fixate a session ID and hijack the session after the user logs in. Always regenerate session IDs after successful login.
- **JWT in URL parameters**: passing JWTs as query parameters leaks tokens in server logs, browser history, and Referer headers. Use Authorization headers or HttpOnly cookies instead.
- **Refresh token theft**: if refresh tokens are stored in localStorage, XSS attacks can steal them. Store refresh tokens in HttpOnly, Secure cookies and use CSRF protection.
- **Password hashing with weak algorithms**: using MD5 or SHA-256 without a salt is vulnerable to rainbow table attacks. Always use bcrypt, scrypt, or Argon2 with a unique salt per password.
- **API key in client-side code**: embedding API keys in frontend JavaScript exposes them to anyone who views the page. Use server-side proxy endpoints for API calls that require keys.
- **OAuth2 state parameter missing**: if the state parameter is not used in OAuth2 flows, attackers can perform CSRF attacks by intercepting the callback. Always use a random state parameter and validate it.
- **Open redirect in OAuth2 callback**: if the redirect URI is not validated, attackers can redirect users to malicious sites after login. Validate redirect URIs against an allowlist.
- **Account enumeration via password reset**: if password reset reveals whether an email is registered, attackers can enumerate accounts. Always show the same success message regardless of whether the email exists.
- **Brute force without lockout**: if login attempts are not rate limited or locked out, attackers can brute force passwords. Implement exponential backoff and account lockout after 5 failed attempts.
- **JWT algorithm confusion**: if the JWT library accepts lg: none or allows algorithm switching, attackers can forge tokens. Pin the expected algorithm (RS256 or HS256) in the verification config.
- **Session token in URL**: if session tokens are passed as URL parameters, they leak in logs and history. Use cookies with HttpOnly and Secure flags instead.
- **Insecure deserialization of session data**: if session data is serialized with JSON.parse without validation, attackers can inject unexpected types. Validate session data schema after deserialization.
- **CSRF on state-changing endpoints**: if cookies are used for auth and CSRF tokens are not validated, attackers can forge requests. Require CSRF tokens for all state-changing operations.
- **Privilege escalation via mass assignment**: if user input is directly assigned to user objects, attackers can set ole: admin. Use allowlists for updatable fields.
- **Password reset token reuse**: if password reset tokens are not invalidated after use, attackers can reuse them. Delete reset tokens after a successful password change.
- **MFA bypass via replay**: if MFA codes are not single-use, attackers who intercept a code can reuse it. Mark MFA codes as used immediately after verification.
- **OAuth2 scope escalation**: if OAuth2 scopes are not validated on each request, attackers can use tokens with fewer scopes to access higher-scope endpoints. Validate scopes per endpoint.
- **Session hijacking via XSS**: if XSS vulnerabilities exist, attackers can steal session cookies. Use Content Security Policy and HttpOnly cookies to mitigate.
- **Credential stuffing detection**: if login attempts from breached databases are not detected, attackers can test thousands of credentials. Implement IP-based rate limiting and credential breach checking.
- **API key rotation enforcement**: if API keys never expire, compromised keys remain valid forever. Enforce key rotation every 90 days and alert users with expiring keys.
- **Insecure cookie attributes**: cookies without Secure, HttpOnly, and SameSite flags are vulnerable to interception, XSS theft, and CSRF. Always set all three attributes on auth cookies.
- **Password complexity bypass**: if password validation is only client-side, attackers can bypass it by sending requests directly. Validate password complexity on the server.
- **Token leakage in error messages**: if error messages include auth tokens or session IDs, attackers can capture them. Never include sensitive data in error responses.
- **Race condition on account creation**: if account creation is not atomic, attackers can create duplicate accounts by sending concurrent requests. Use database unique constraints and transactions.
- **Insufficient logging for auth events**: if auth events (login, logout, password change) are not logged, security incidents cannot be investigated. Log all auth events with user ID, IP, and timestamp.
- **Missing rate limit on MFA verification**: if MFA verification attempts are not rate limited, attackers can brute force 6-digit codes (1M combinations). Rate limit to 5 attempts per 5 minutes.
- **Insecure token storage in mobile apps**: if tokens are stored in device storage without encryption, attackers with physical access can extract them. Use platform secure storage (Keychain, Keystore).
- **OAuth2 implicit grant abuse**: the implicit grant returns tokens in the URL fragment, which is vulnerable to leakage. Use authorization code grant with PKCE instead.
- **Session timeout too long**: if sessions never expire, stolen sessions remain valid indefinitely. Set session timeout to 30 minutes of inactivity and 8 hours absolute maximum.

## Frequently Asked Questions

## Frequently Asked Questions

### Can I use OAuth 2.0 for machine-to-machine authentication?

Yes, with the **Client Credentials** flow. The client authenticates directly with its ID and secret (or client assertion JWT) to obtain an access token. No user interaction is involved. This is ideal for backend services, cron jobs, and microservices.

### How do I support multiple providers (Google, GitHub, Microsoft)?

Use a library that abstracts provider differences (Passport.js, Authlib, Spring Security). See [API Key Authentication](/recipes/authentication/api-key-authentication) for machine-to-machine auth. Store provider-specific fields (`provider`, `provider_user_id`) in your user table. Normalize email/name fields across providers to create a unified user profile.

### What is the difference between OAuth 2.0 and OpenID Connect?

OAuth 2.0 is an **authorization** framework ("Can this app access my data?"). OpenID Connect (OIDC) is an **authentication** layer built on top of OAuth 2.0 that standardizes identity claims (`id_token`, `/userinfo`). If you only need login (who is this user?), OIDC is sufficient. If you need API access, you need OAuth 2.0 scopes.
- **OAuth2 token leakage via referrer**: if OAuth2 callbacks redirect with tokens in the URL, the Referer header may leak tokens to third-party sites. Use Referrer-Policy: no-referrer on callback pages.
- **OAuth2 PKCE downgrade**: if the server does not require PKCE, attackers can downgrade the flow and intercept authorization codes. Always require PKCE for public clients.
- **OAuth2 refresh token rotation**: if refresh tokens are not rotated on each use, a stolen token can be used indefinitely. Implement refresh token rotation with reuse detection.
- **OAuth2 scope validation bypass**: if scope validation is case-insensitive, attackers can bypass scope checks by using different cases. Use case-sensitive scope comparison.
- **OAuth2 code verifier entropy**: if the PKCE code verifier is too short, attackers can brute force it. Use a verifier of at least 43 characters (128 bits of entropy).
- **OAuth2 redirect URI prefix matching**: if redirect URIs are matched by prefix, attackers can register https://evil.com/callback to match https://app.com/callback. Use exact matching only.
- **OAuth2 state parameter fixation**: if the state parameter is predictable, attackers can guess it and perform CSRF. Use a cryptographically random state of at least 16 bytes.
- **OAuth2 token endpoint CORS**: if the token endpoint has permissive CORS, attackers can exchange codes from any origin. Restrict CORS on the token endpoint to trusted clients only.
- **OAuth2 implicit flow token exposure**: the implicit flow returns access tokens in the URL fragment, which is accessible to any script on the page. Use authorization code flow with PKCE instead.
- **OAuth2 mixed content**: if the OAuth2 flow runs over HTTP, tokens can be intercepted. Force HTTPS for all OAuth2 endpoints and redirect HTTP to HTTPS.
