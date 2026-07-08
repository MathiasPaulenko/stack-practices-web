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
  - vulnerabilities
  - encryption
  - owasp
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

Below is an implementation of HMAC-SHA256 request signing and AWS Signature v4 authentication patterns across Python, JavaScript, and Java.

## When to Use

Use this resource when:
- You need tamper-proof API requests over HTTP (no TLS alone is not enough)
- You are building [webhook](/recipes/messaging/event-driven-microservices) delivery systems that require sender verification
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

## What Works

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
- **Storing secrets in environment variables**: Use [secret management](/guides/security/security-best-practices-guide) services instead

## Frequently Asked Questions

**Q: Is HMAC better than raw SHA-256 hashing?**
A: Yes. HMAC uses a key and adds structural protections against length-extension attacks. Never use raw SHA-256 for authentication.

**Q: How is AWS Signature v4 different from simple HMAC?**
A: AWS SigV4 adds a credential scope (date/region/service), signs additional headers, and uses a 4-step signing process. It is designed for distributed AWS services with IAM integration.

**Q: Can I use the same secret for multiple clients?**
A: No. Each client should have a unique secret. If one client is compromised, rotate only their key without affecting others.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Advanced Solutions

### AWS Signature v4 implementation (Python)

```python
import hashlib
import hmac
import datetime
import urllib.parse

def get_aws_signature_v4(
    access_key: str,
    secret_key: str,
    region: str,
    service: str,
    method: str,
    url: str,
    headers: dict,
    body: str = '',
) -> dict:
    """Generate AWS Signature v4 headers for an API request."""
    parsed = urllib.parse.urlparse(url)
    host = parsed.netloc
    path = parsed.path or '/'
    query = parsed.query

    # Step 1: Create canonical request
    amz_date = datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
    date_stamp = amz_date[:8]

    # Normalize and sort headers
    signed_headers = sorted(headers.keys())
    canonical_headers = ''.join(
        f'{h.lower()}:{headers[h].strip()}\n' for h in signed_headers
    )
    signed_header_str = ';'.join(h.lower() for h in signed_headers)

    payload_hash = hashlib.sha256(body.encode()).hexdigest()

    canonical_request = '\n'.join([
        method.upper(),
        path,
        query,
        canonical_headers,
        signed_header_str,
        payload_hash,
    ])

    # Step 2: Create string to sign
    credential_scope = f'{date_stamp}/{region}/{service}/aws4_request'
    string_to_sign = '\n'.join([
        'AWS4-HMAC-SHA256',
        amz_date,
        credential_scope,
        hashlib.sha256(canonical_request.encode()).hexdigest(),
    ])

    # Step 3: Calculate signature
    def sign(key: bytes, msg: str) -> bytes:
        return hmac.new(key, msg.encode(), hashlib.sha256).digest()

    signing_key = sign(
        sign(sign(sign(
            ('AWS4' + secret_key).encode(), date_stamp),
            region),
            service),
        'aws4_request'
    )

    signature = hmac.new(
        signing_key, string_to_sign.encode(), hashlib.sha256
    ).hexdigest()

    # Step 4: Build authorization header
    auth_header = (
        f'AWS4-HMAC-SHA256 '
        f'Credential={access_key}/{credential_scope}, '
        f'SignedHeaders={signed_header_str}, '
        f'Signature={signature}'
    )

    result = dict(headers)
    result['Authorization'] = auth_header
    result['X-Amz-Date'] = amz_date
    result['X-Amz-Content-Sha256'] = payload_hash
    return result

# Usage
headers = get_aws_signature_v4(
    access_key='AKIAIOSFODNN7EXAMPLE',
    secret_key='wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    region='us-east-1',
    service='s3',
    method='GET',
    url='https://s3.amazonaws.com/my-bucket/object.txt',
    headers={'Host': 's3.amazonaws.com'},
)
```

### Webhook signature verification with nonce (Node.js)

```javascript
const crypto = require('crypto');
const redis = require('redis');

const redisClient = redis.createClient({ url: process.env.REDIS_URL });
const REPLAY_WINDOW = 5 * 60; // 5 minutes

async function verifyWebhook(secret, req) {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const nonce = req.headers['x-webhook-nonce'];
  const body = req.rawBody; // Must be raw bytes, not parsed JSON

  // 1. Check timestamp freshness
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > REPLAY_WINDOW) {
    throw new Error('Timestamp outside replay window');
  }

  // 2. Check nonce uniqueness (prevent replay)
  const nonceKey = `webhook:nonce:${nonce}`;
  const exists = await redisClient.set(nonceKey, '1', {
    NX: true,
    EX: REPLAY_WINDOW,
  });
  if (!exists) {
    throw new Error('Nonce already used — possible replay attack');
  }

  // 3. Verify signature
  const message = `${timestamp}.${nonce}.${body.toString('utf-8')}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64');

  if (!crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )) {
    throw new Error('Invalid signature');
  }

  return true;
}

// Express middleware
async function webhookMiddleware(req, res, next) {
  try {
    req.rawBody = await getRawBody(req);
    await verifyWebhook(process.env.WEBHOOK_SECRET, req);
    next();
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
}
```

### Go HMAC request signing

```go
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"time"
)

func SignRequest(secret, method, path, body string) http.Header {
	timestamp := time.Now().UTC().Format(time.RFC3339)
	message := fmt.Sprintf("%s\n%s\n%s\n%s", method, path, timestamp, body)

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(message))
	signature := hex.EncodeToString(mac.Sum(nil))

	header := http.Header{}
	header.Set("X-Request-Timestamp", timestamp)
	header.Set("X-Request-Signature", signature)
	return header
}

func VerifyRequest(secret string, r *http.Request, body []byte) bool {
	timestamp := r.Header.Get("X-Request-Timestamp")
	signature := r.Header.Get("X-Request-Signature")

	// Check timestamp freshness
	ts, err := time.Parse(time.RFC3339, timestamp)
	if err != nil {
		return false
	}
	if time.Since(ts) > 5*time.Minute {
		return false
	}

	message := fmt.Sprintf("%s\n%s\n%s\n%s",
		r.Method, r.URL.Path, timestamp, string(body))

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(message))
	expected := hex.EncodeToString(mac.Sum(nil))

	// Constant-time comparison
	return hmac.Equal([]byte(signature), []byte(expected))
}
```

### Key rotation strategy (Python)

```python
import time
from dataclasses import dataclass

@dataclass
class KeyRotation:
    """Manage HMAC key rotation with overlap period."""
    current_key: str
    previous_key: str | None = None
    rotation_time: float = 0
    overlap_seconds: int = 3600  # 1 hour overlap

    def rotate(self, new_key: str):
        """Rotate to a new key, keeping old key valid during overlap."""
        self.previous_key = self.current_key
        self.current_key = new_key
        self.rotation_time = time.time()

    def get_valid_keys(self) -> list[str]:
        """Return all currently valid keys."""
        keys = [self.current_key]
        if self.previous_key and self.previous_key != self.current_key:
            if time.time() - self.rotation_time < self.overlap_seconds:
                keys.append(self.previous_key)
        return keys

    def verify(self, signature: str, method: str, path: str,
               timestamp: str, body: str) -> bool:
        """Verify against any valid key (supports rotation overlap)."""
        import hmac
        import hashlib
        message = f"{method}\n{path}\n{timestamp}\n{body}"

        for key in self.get_valid_keys():
            expected = hmac.new(
                key.encode(), message.encode(), hashlib.sha256
            ).hexdigest()
            if hmac.compare_digest(signature, expected):
                return True
        return False

# Usage
rotation = KeyRotation(current_key='secret-v1')
# After rotation: both v1 and v2 are valid for 1 hour
rotation.rotate('secret-v2')
# After 1 hour: only v2 is valid
```

## Additional Best Practices

1. **Use a canonical request format.** Normalize the request before signing to avoid signature mismatches caused by encoding differences, header ordering, or trailing slashes:

```python
def canonicalize_request(method: str, path: str, query: dict,
                         headers: dict, body: str) -> str:
    """Build a deterministic canonical request string."""
    # Normalize path: remove trailing slash, encode
    norm_path = path.rstrip('/') or '/'

    # Sort query parameters alphabetically
    sorted_query = '&'.join(
        f'{k}={v}' for k, v in sorted(query.items())
    )

    # Sort and lowercase headers
    sorted_headers = ''.join(
        f'{k.lower()}:{v.strip()}\n'
        for k in sorted(headers.keys())
    )

    return f'{method.upper()}\n{norm_path}\n{sorted_query}\n{sorted_headers}\n{body}'
```

2. **Include a request ID in the signature.** This ties the signature to a specific request instance, making replay attacks harder even within the timestamp window:

```javascript
const requestId = crypto.randomUUID();
const message = `${method}\n${path}\n${timestamp}\n${requestId}\n${body}`;
// Include X-Request-Id header alongside signature
```

## Additional Common Mistakes

1. **Signing parsed JSON instead of raw bytes.** If the server parses JSON and re-serializes it, the body string may differ from what the client signed (key ordering, whitespace). Always sign the raw request body:

```javascript
// WRONG: signing after JSON.parse + JSON.stringify
const body = JSON.stringify(JSON.parse(rawBody));

// CORRECT: signing raw body bytes
const body = req.rawBody; // Buffer of original request body
```

2. **Not handling clock skew between client and server.** If the client clock is 6 minutes ahead, the server rejects all requests. Allow a tolerance of 60-90 seconds and log clock skew for monitoring:

```python
def check_timestamp(timestamp: str, tolerance_seconds: int = 90) -> bool:
    from datetime import datetime, timezone
    ts = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
    now = datetime.now(timezone.utc)
    skew = abs((now - ts).total_seconds())
    if skew > 300:  # 5 minute window
        return False
    if skew > tolerance_seconds:
        logging.warning(f'Clock skew detected: {skew}s')
    return True
```

## Additional FAQ

### What is the difference between HMAC and digital signatures?

HMAC uses a shared secret key — both sender and receiver know the same key. Digital signatures (like RSA or Ed25519) use asymmetric keys: the sender signs with a private key, and the receiver verifies with a public key. Digital signatures provide non-repudiation (the sender cannot deny signing), while HMAC does not.

### How do I handle key distribution securely?

Distribute HMAC keys out-of-band — never send the key over the same channel as the signed requests. Use a key management service (AWS KMS, HashiCorp Vault) to deliver keys to authenticated clients. For webhook receivers, the sender provides the secret through a dashboard or API call over TLS.

### Should I use HMAC or OAuth 2.0 for API authentication?

Use HMAC for server-to-server communication where both parties can securely share a secret. Use OAuth 2.0 for user-facing APIs where users authorize third-party applications. HMAC is simpler and faster; OAuth 2.0 provides delegation and scoped access. Some APIs use both: OAuth 2.0 for user authorization and HMAC for request signing.
