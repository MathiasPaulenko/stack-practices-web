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
  - api-keys
  - hmac
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/oauth2-login
  - /recipes/rate-limiting
  - /recipes/secret-management
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

The challenge with API keys is not generation — any random string will do — but lifecycle management. Keys must be generated with sufficient entropy, transmitted over TLS, validated efficiently, rotated periodically, and revoked immediately upon compromise. A leaked API key embedded in a mobile app or committed to a public repository grants attackers the same privileges as the legitimate service. This recipe covers key generation with HMAC signatures, request validation, scope enforcement, and rotation strategies.

## When to use it

Use this recipe when:

- Authenticating backend services, microservices, or serverless functions to each other
- Providing third-party developers access to a public API with usage limits
- Securing webhook endpoints that receive push notifications from external providers
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
- **Rate limiting per key**: track request counts per API key in Redis with TTL windows. Apply tiered limits — a free-tier key gets 100 requests/hour while an enterprise key gets 100,000.

## Variants

| Approach | Storage | Validation speed | Revocation | Best for |
|----------|---------|-------------------|------------|----------|
| Stateless HMAC | None (signature) | Fast (no DB) | Impossible | Internal services with short-lived keys |
| Database lookup | SQL/NoSQL | Medium | Instant | Public APIs with user tiers |
| Redis cache | Redis | Fast | TTL-based | High-traffic APIs |
| API Gateway managed | Cloud provider | Fast | Via dashboard | AWS/GCP/Azure hosted APIs |

## Best practices

- **Never commit keys to source control**: use `.gitignore` for `.env` files and run secret-scanning tools (GitGuardian, TruffleHog) in CI pipelines. Rotate any key found in commit history immediately.
- **Use HTTPS exclusively**: API keys sent over unencrypted HTTP are trivially intercepted by network sniffers. Reject plain HTTP requests at the load balancer or gateway level.
- **Rotate keys proactively**: set a maximum key age (90 days for production, 30 days for high-sensitivity) and notify owners before expiration. Provide a grace period where both old and new keys work.
- **Log key IDs, never full keys**: when logging requests, record the key ID prefix (`pk_abc123...`) for debugging. The full signature portion should never appear in logs, error messages, or URLs.
- **Implement usage alerts**: notify key owners when they approach 80% of their rate limit. This reduces surprise 429 errors and encourages upgrades for legitimate growth.

## Common mistakes

- **Using predictable key formats**: sequential IDs or UUIDv1 keys leak generation time. Use cryptographically secure random strings (32+ bytes from `secrets.token_urlsafe` or `/dev/urandom`).
- **Storing keys in client-side code**: mobile apps and frontend JavaScript cannot keep secrets. Use OAuth2 or short-lived tokens for client applications instead of permanent API keys.
- **Not validating scopes**: a read-only analytics key should not be able to delete records. Always check scopes at the endpoint level, not just during authentication.
- **Hardcoding keys in configuration**: storing production keys in `config.json` or environment variables on shared servers exposes them to all processes. Use a secret manager with access controls.

## FAQ

**Q: What is the difference between API keys and JWT tokens?**
A: API keys are opaque strings typically used for service-to-service auth with fixed permissions. JWT tokens are self-contained claims used for user sessions, often with shorter lifespans and dynamic permissions. JWTs can encode user identity; API keys usually encode application identity.

**Q: How do I revoke a compromised API key?**
A: If using database-backed keys, delete or disable the key record immediately. If using HMAC-only stateless keys, you cannot revoke individually — you must rotate the master secret (which invalidates all keys) or maintain a blocklist.

**Q: Should I encrypt API keys at rest?**
A: Yes. Store hashed or encrypted keys in your database. When a key is presented, hash it and compare against the stored hash. This prevents attackers from reading usable keys if the database is breached.

**Q: Can I use API keys for user authentication?**
A: API keys are designed for machine clients, not human users. For user authentication, use session cookies, OAuth2, or OIDC. API keys lack features like multi-factor authentication and are harder for users to manage securely.

