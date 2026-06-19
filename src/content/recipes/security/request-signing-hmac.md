---
contentType: recipes
slug: request-signing-hmac
title: "Implement Request Signing with HMAC"
description: "Secure API requests with HMAC signatures and AWS Signature v4 authentication for tamper-proof message integrity."
metaDescription: "Implement request signing with HMAC and AWS Signature v4. Secure API authentication with message integrity in Python, JavaScript, and Java."
difficulty: advanced
topics:
  - security
tags:
  - security
  - api-security
relatedResources:
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
  - /patterns/ambassador-pattern
  - /patterns/bridge-pattern
  - /patterns/builder-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement request signing with HMAC and AWS Signature v4. Secure API authentication with message integrity in Python, JavaScript, and Java."
  keywords:
    - hmac
    - request-signing
    - aws-signature
    - api-security
    - cryptography
    - python
    - javascript
    - java
---
# Implement Request Signing with HMAC

## Overview

HMAC (Hash-based Message Authentication Code) provides message integrity and authentication. By signing API requests with a shared secret, the server can verify the request was not tampered with in transit and originated from a trusted client.

This recipe implements HMAC-SHA256 request signing and AWS Signature v4 authentication patterns across Python, JavaScript, and Java.

## When to Use

Use this resource when:
- You need tamper-proof API requests over HTTP (no TLS alone is not enough)
- You are building [webhook](/recipes/serverless/event-driven-functions) delivery systems that require sender verification
- You are implementing AWS-compatible API authentication
- You need stateless authentication without session storage

## Solution

### Python

```python
import hmac
import hashlib
import base64
from datetime import datetime

def sign_request(secret: str, method: str, path: str, body: str = "") -> dict:
    timestamp = datetime.utcnow().isoformat()
    message = f"{method}\n{path}\n{timestamp}\n{body}"
    signature = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()

    return {
        "X-Request-Timestamp": timestamp,
        "X-Request-Signature": signature,
    }

# Client usage
headers = sign_request("my-secret-key", "POST", "/api/orders", '{"item": "book"}')
requests.post("https://api.example.com/api/orders",
              headers=headers, data='{"item": "book"}')
```

### JavaScript

```javascript
const crypto = require('crypto');

function signRequest(secret, method, path, body = '') {
  const timestamp = new Date().toISOString();
  const message = `${method}\n${path}\n${timestamp}\n${body}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  return {
    'X-Request-Timestamp': timestamp,
    'X-Request-Signature': signature,
  };
}

// Server verification
function verifyRequest(secret, headers, method, path, body) {
  const expected = signRequest(secret, method, path, body);
  return crypto.timingSafeEqual(
    Buffer.from(headers['x-request-signature']),
    Buffer.from(expected['X-Request-Signature'])
  );
}
```

### Java

```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

public class RequestSigner {
    private static final String HMAC_ALGO = "HmacSHA256";

    public static String sign(String secret, String method, String path, String body) throws Exception {
        String timestamp = Instant.now().toString();
        String message = String.join("\n", method, path, timestamp, body);

        Mac mac = Mac.getInstance(HMAC_ALGO);
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGO));
        byte[] signature = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));

        return Base64.getEncoder().encodeToString(signature);
    }
}
```

## Explanation

HMAC combines a cryptographic hash function (SHA-256) with a secret key:
1. **Canonicalize**: Build a string from method, path, timestamp, and body
2. **Hash**: Compute HMAC-SHA256 with the shared secret
3. **Attach**: Send signature and timestamp in headers
4. **Verify**: Server recreates the signature and compares with timing-safe equality

AWS Signature v4 extends this with credential scopes, signed headers, and region/service identifiers. It is more complex but provides additional security boundaries.

## Variants

| Algorithm | Key Type | Strength | Use Case |
|-----------|----------|----------|----------|
| HMAC-SHA256 | Shared secret | 256-bit | API authentication, webhooks |
| AWS SigV4 | IAM credentials | 256-bit | AWS service compatibility |
| Ed25519 | Asymmetric | 128-bit | Public/private key verification |
| RSA-SHA256 | Asymmetric | 2048+ bit | Enterprise PKI integration |

## Best Practices

- **Use timing-safe comparison**: `crypto.timingSafeEqual()` prevents timing attacks
- **Include timestamps**: Reject requests older than 5 minutes to prevent replay attacks
- **Rotate secrets regularly**: Implement graceful rotation with dual-key acceptance periods
- **Sign the body, not just headers**: Tampering with the payload must invalidate the signature
- **Store secrets in vaults**: Never hardcode secrets; use [HashiCorp Vault](/recipes/security/vault-dynamic-credentials) or AWS Secrets Manager

## Common Mistakes

- **Using MD5 or SHA1**: Both are cryptographically broken; use SHA-256 minimum
- **Simple string comparison**: `==` comparison leaks timing information — always use constant-time comparison
- **Missing body in signature**: An attacker can modify the payload without detection
- **No replay protection**: Without timestamps, captured requests can be replayed indefinitely
- **Storing secrets in environment variables**: Use [secret management](/guides/devops/secrets-management-guide) services instead

## Frequently Asked Questions

**Q: Is HMAC better than raw SHA-256 hashing?**
A: Yes. HMAC uses a key and adds structural protections against length-extension attacks. Never use raw SHA-256 for authentication.

**Q: How is AWS Signature v4 different from simple HMAC?**
A: AWS SigV4 adds a credential scope (date/region/service), signs additional headers, and uses a 4-step signing process. It is designed for distributed AWS services with IAM integration.

**Q: Can I use the same secret for multiple clients?**
A: No. Each client should have a unique secret. If one client is compromised, rotate only their key without affecting others.
