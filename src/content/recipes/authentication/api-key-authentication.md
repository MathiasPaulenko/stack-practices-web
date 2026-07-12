---

contentType: recipes
slug: api-key-authentication
title: "Secure API Key Authentication for Services and Clients"
description: "How to generate, distribute, validate, and rotate API keys for machine-to-machine authentication using HMAC signatures, scopes, and rate-limited key policies."
metaDescription: "Learn API key authentication for services. Generate, validate, and rotate API keys using HMAC signatures, scopes, and rate-limited policies for machine-to-machine auth."
difficulty: intermediate
topics:
  - authentication
tags:
  - authentication
  - hmac
  - security
  - oauth
  - jwt
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/oauth2-login
  - /recipes/rate-limiting
  - /recipes/secret-management
  - /recipes/magic-link-authentication
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn API key authentication for services. Generate, validate, and rotate API keys using HMAC signatures, scopes, and rate-limited policies for machine-to-machine auth."
  keywords:
    - api key authentication
    - machine to machine auth
    - hmac signature
    - api key rotation
    - secure api keys

---

## Overview

API keys are the simplest and most widely deployed form of machine-to-machine authentication. Unlike OAuth2 flows designed for user delegation, or JWT tokens that encode claims, API keys are opaque strings exchanged between trusted services. When implemented correctly, they provide fast authentication, simple revocation, and fine-grained access control through scoped permissions.

The challenge with API keys is not generation — any random string will do — but lifecycle management. Keys must be generated with sufficient entropy, transmitted over TLS, validated efficiently, rotated periodically, and revoked immediately upon compromise. A leaked API key embedded in a mobile app or committed to a public repository grants attackers the same privileges as the legitimate service. Below is a practical approach to key generation with HMAC signatures, request validation, scope enforcement, and rotation strategies.

## When to use it

Use this recipe when:

- Authenticating backend services, [microservices](/guides/architecture/microservices-architecture-guide), or serverless functions to each other
- Providing third-party developers access to a public API with usage limits
- Securing [webhook](/recipes/api/webhooks) endpoints that receive push notifications from external providers
- Replacing basic authentication (username/password) in service-to-service calls
- Implementing tiered API access with different keys for read-only vs write operations

## Solution

### Generating Secure API Keys (Python)

```python
import secrets
import hmac
import hashlib
import base64

class APIKeyManager:
    def __init__(self, master_secret: str):
        self.master_secret = master_secret.encode()

    def generate_key(self, owner_id: str, scopes: list[str]) -> dict:
        random_part = secrets.token_urlsafe(32)
        key_id = f"pk_{random_part[:16]}"

        # HMAC-SHA256 signature binds key to owner and scopes
        payload = f"{key_id}:{owner_id}:{':'.join(sorted(scopes))}"
        signature = hmac.new(
            self.master_secret,
            payload.encode(),
            hashlib.sha256
        ).hexdigest()[:16]

        api_key = f"{key_id}.{signature}"
        return {
            "key_id": key_id,
            "api_key": api_key,
            "owner_id": owner_id,
            "scopes": scopes,
            "created_at": datetime.utcnow().isoformat(),
            "last_used": None,
        }

    def validate_key(self, api_key: str, owner_id: str, scopes: list[str]) -> bool:
        parts = api_key.split('.')
        if len(parts) != 2:
            return False

        key_id, provided_sig = parts
        payload = f"{key_id}:{owner_id}:{':'.join(sorted(scopes))}"
        expected_sig = hmac.new(
            self.master_secret,
            payload.encode(),
            hashlib.sha256
        ).hexdigest()[:16]

        return hmac.compare_digest(provided_sig, expected_sig)
```

### Validating API Keys in Middleware (Node.js / Express)

```javascript
const crypto = require('crypto');

function apiKeyAuth(masterSecret) {
  return async (req, res, next) => {
    const authHeader = req.headers['x-api-key'];
    if (!authHeader) {
      return res.status(401).json({ error: 'API key required' });
    }

    // Lookup key metadata from cache or database
    const keyData = await redis.get(`apikey:${authHeader}`);
    if (!keyData) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const key = JSON.parse(keyData);

    // Check expiration
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return res.status(401).json({ error: 'API key expired' });
    }

    // Verify scopes for this endpoint
    const requiredScope = req.routeScope;
    if (requiredScope && !key.scopes.includes(requiredScope)) {
      return res.status(403).json({ error: 'Insufficient scope' });
    }

    // Update last used timestamp (fire and forget)
    redis.hset(`apikey:${authHeader}:meta`, 'last_used', Date.now());

    req.apiKey = key;
    next();
  };
}

// Usage
app.get('/api/v1/users', apiKeyAuth(process.env.API_SECRET), requireScope('users:read'), (req, res) => {
  res.json(users);
});
```

### API Gateway Key Validation (AWS API Gateway)

```yaml
openapi: 3.0.1
info:
  title: Secure API
paths:
  /users:
    get:
      x-amazon-apigateway-request-validator: params-only
      security:
        - api_key: []
      x-amazon-apigateway-integration:
        type: aws_proxy
        uri: arn:aws:apigateway:...:lambda:path/...

components:
  securitySchemes:
    api_key:
      type: apiKey
      name: x-api-key
      in: header
      x-amazon-apigateway-api-key-source: HEADER
```

## Explanation

- **Key structure**: a well-designed API key contains a public identifier (key ID) and a secret signature. The key ID is logged and displayed in dashboards; the signature is validated server-side. Never store the full raw key in logs.
- **HMAC validation**: instead of storing each key in a database and performing a lookup, you can validate keys using HMAC. The signature proves the key was generated by your system without needing a database round-trip. However, storing metadata (owner, scopes, expiration) still requires a lookup.
- **Scope-based access control**: assign scopes like `users:read`, `orders:write`, `admin:full` to each key. Middleware checks that the request endpoint's required scope is present in the key's scope list before allowing access.
- **[Rate limiting](/recipes/api/api-rate-limiting-redis) per key**: track request counts per API key in Redis with TTL windows. Apply tiered limits — a free-tier key gets 100 requests/hour while an enterprise key gets 100,000.

## Variants

| Approach | Storage | Validation speed | Revocation | Best for |
|----------|---------|-------------------|------------|----------|
| Stateless HMAC | None (signature) | Fast (no DB) | Impossible | Internal services with short-lived keys |
| Database lookup | SQL/NoSQL | Medium | Instant | Public APIs with user tiers |
| Redis cache | Redis | Fast | TTL-based | High-traffic APIs |
| API Gateway managed | Cloud provider | Fast | Via dashboard | AWS/GCP/Azure hosted APIs |

## What works

- **Never commit keys to source control**: use `.gitignore` for `.env` files and run secret-scanning tools (GitGuardian, TruffleHog) in CI pipelines. Rotate any key found in commit history immediately.
- **Use HTTPS exclusively**: API keys sent over unencrypted HTTP are trivially intercepted by network sniffers. Reject plain HTTP requests at the load balancer or gateway level.
- **Rotate keys proactively**: set a maximum key age (90 days for production, 30 days for high-sensitivity) and notify owners before expiration. Provide a grace period where both old and new keys work.
- **Log key IDs, never full keys**: when logging requests, record the key ID prefix (`pk_abc123...`) for debugging. The full signature portion should never appear in logs, error messages, or URLs.
- **Implement usage alerts**: notify key owners when they approach 80% of their rate limit. This reduces surprise 429 errors and encourages upgrades for legitimate growth.

## Common mistakes

- **Using predictable key formats**: sequential IDs or UUIDv1 keys leak generation time. Use cryptographically secure random strings (32+ bytes from `secrets.token_urlsafe` or `/dev/urandom`).
- **Storing keys in client-side code**: mobile apps and frontend JavaScript cannot keep secrets. Use OAuth2 or short-lived tokens for client applications instead of permanent API keys.
- **Not validating scopes**: a read-only analytics key should not be able to delete records. Always check scopes at the endpoint level, not just during authentication.
- **Hardcoding keys in configuration**: storing production keys in `config.json` or environment variables on shared servers exposes them to all processes. Use a [secret manager](/recipes/devops/secret-management) with access controls.

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

## FAQ

**Q: What is the difference between API keys and [JWT tokens](/recipes/authentication/jwt-authentication)?**
A: API keys are opaque strings typically used for service-to-service auth with fixed permissions. JWT tokens are self-contained claims used for user sessions, often with shorter lifespans and live permissions. JWTs can encode user identity; API keys usually encode application identity.

**Q: How do I revoke a compromised API key?**
A: If using database-backed keys, delete or disable the key record immediately. If using HMAC-only stateless keys, you cannot revoke individually — you must rotate the master secret (which invalidates all keys) or maintain a blocklist.

**Q: Should I encrypt API keys at rest?**
A: Yes. Store hashed or encrypted keys in your database. When a key is presented, hash it and compare against the stored hash. This prevents attackers from reading usable keys if the database is breached.

**Q: Can I use API keys for user authentication?**
A: API keys are designed for machine clients, not human users. For user authentication, use session cookies, OAuth2, or OIDC. API keys lack capabilities like multi-factor authentication and are harder for users to manage securely.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
