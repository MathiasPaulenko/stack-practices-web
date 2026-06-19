---
contentType: recipes
slug: hmac-request-signing
title: "HMAC Request Signing"
description: "Secure API requests with HMAC-SHA256 signatures to ensure integrity and authenticity."
metaDescription: "Implement HMAC-SHA256 request signing for secure API authentication. Protect message integrity and prevent replay attacks in service-to-service communication."
difficulty: intermediate
topics:
  - security
tags:
  - hmac
  - security
  - api
  - authentication
relatedResources:
  - /guides/api-security-checklist-guide
  - /guides/security-best-practices-guide
  - /guides/web-application-security-guide
  - /recipes/websocket-authentication
  - /recipes/csrf-protection
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Implement HMAC-SHA256 request signing for secure API authentication. Protect message integrity and prevent replay attacks in service-to-service communication."
  keywords:
    - hmac
    - security
    - api
    - authentication
---
## Overview

HMAC (Hash-based Message Authentication Code) is the industry standard for signing API requests. By combining a shared secret with the request payload and a cryptographic hash, both sender and receiver can verify message integrity and authenticity without transmitting the secret over the wire.

## When to Use

Use this resource when:
- Authenticating service-to-service API calls
- Ensuring [webhook](/recipes/serverless/event-driven-functions) payloads have not been tampered with
- Implementing API key authentication without OAuth complexity
- Verifying request integrity across untrusted networks

## Solution

### HMAC-SHA256 Signing (Node.js)

```javascript
const crypto = require('crypto');

function signRequest(method, path, body, timestamp, secret) {
  const payload = method.toUpperCase() + path + timestamp + JSON.stringify(body);
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verifyRequest(method, path, body, timestamp, signature, secret) {
  const expected = signRequest(method, path, body, timestamp, secret);
  // Constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}
```

### Client-Server Example (Python)

```python
import hmac
import hashlib
import time

def sign_request(method: str, path: str, body: bytes, secret: str) -> str:
    timestamp = str(int(time.time()))
    message = f"{method.upper()}{path}{timestamp}{body.decode()}"
    signature = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return signature, timestamp

# Client
signature, ts = sign_request("POST", "/api/orders", b'{"id":1}', "my-secret")
headers = {"X-Signature": signature, "X-Timestamp": ts}

# Server
def verify(signature: str, timestamp: str, method, path, body, secret):
    # Reject old requests (replay protection)
    if abs(int(time.time()) - int(timestamp)) > 300:
        return False
    expected, _ = sign_request(method, path, body, secret)
    return hmac.compare_digest(signature, expected)
```

## Explanation

HMAC security relies on three properties:

1. **Secret key**: Never transmitted; shared out-of-band during onboarding
2. **Message coverage**: The signature must cover method, path, timestamp, and body
3. **Replay protection**: Timestamp windows prevent attackers from reusing old requests

**Why not plain SHA-256?**
SHA-256 without HMAC is vulnerable to length-extension attacks. HMAC uses two nested hash passes that prevent this.

## Variants

| Algorithm | Hash | Strength | Notes |
|-----------|------|----------|-------|
| HMAC-SHA256 | SHA-256 | 128-bit | Recommended default |
| HMAC-SHA384 | SHA-384 | 192-bit | Higher security margin |
| HMAC-SHA512 | SHA-512 | 256-bit | Slower; use for high-security contexts |
| HMAC-Blake3 | Blake3 | 256-bit | Fast; modern alternative |

## Best Practices

- **Include timestamp**: Reject requests older than 5 minutes to prevent replay attacks
- **Sign the entire request**: Method + path + timestamp + body (sorted headers if included)
- **Use constant-time comparison**: timingSafeEqual prevents timing attacks
- **Rotate secrets regularly**: Use key versioning (v1, v2) in the signature header
- **Never log the secret**: Log signatures and keys, never the raw secret

## Common Mistakes

1. **Signing only the body**: An attacker can replay a valid body with a different endpoint
2. **Missing replay protection**: Without timestamps, intercepted requests are valid forever
3. **Using MD5 or SHA-1**: Cryptographically broken; use SHA-256 minimum
4. **String comparison instead of timingSafeEqual**: Vulnerable to timing attacks
5. **Storing secrets in environment variables without encryption**: Use a [secret manager](/recipes/security/vault-dynamic-credentials)

## Frequently Asked Questions

**Q: Is HMAC better than JWT for service-to-service auth?**
A: HMAC is simpler and stateless for internal services. JWT is better when you need identity claims and third-party verification. For a full API security overview, see the [API security checklist](/guides/security/api-security-checklist-guide).

**Q: How do I handle clock skew between services?**
A: Allow a 5-minute window and synchronize with NTP. Reject requests outside the window.

**Q: Can I use the same secret for multiple clients?**
A: No. Each client should have a unique secret so you can revoke one without affecting others.
