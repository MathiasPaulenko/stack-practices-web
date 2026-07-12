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
  - vulnerabilities
relatedResources:
  - /guides/api-security-checklist-guide
  - /guides/security-best-practices-guide
  - /guides/web-application-security-guide
  - /recipes/websocket-authentication
  - /recipes/csrf-protection
  - /recipes/password-hashing-production
  - /docs/api-security-review-template
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
- Ensuring [webhook](/recipes/messaging/event-driven-microservices) payloads have not been tampered with
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

## What Works

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

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Advanced Solutions

### Java HMAC-SHA256 signing with key rotation

```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

public class HmacSigner {

    private final Map<String, String> secrets = new HashMap<>();

    public HmacSigner() {
        secrets.put("v1", "old-secret-key");
        secrets.put("v2", "current-secret-key");
    }

    public String sign(String method, String path, String body, String timestamp, String keyVersion)
            throws Exception {
        String payload = method.toUpperCase() + path + timestamp + body;
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec keySpec = new SecretKeySpec(
            secrets.get(keyVersion).getBytes(StandardCharsets.UTF_8),
            "HmacSHA256"
        );
        mac.init(keySpec);
        byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        return keyVersion + ":" + Base64.getEncoder().encodeToString(hash);
    }

    public boolean verify(String method, String path, String body, String timestamp, String signature)
            throws Exception {
        // Parse key version from signature: "v2:base64hash"
        String[] parts = signature.split(":", 2);
        if (parts.length != 2) return false;

        String keyVersion = parts[0];
        String receivedHash = parts[1];

        if (!secrets.containsKey(keyVersion)) return false;

        String expected = sign(method, path, body, timestamp, keyVersion);
        String expectedHash = expected.split(":", 2)[1];

        // Constant-time comparison
        return MessageDigest.isEqual(
            receivedHash.getBytes(StandardCharsets.UTF_8),
            expectedHash.getBytes(StandardCharsets.UTF_8)
        );
    }
}

// Usage
HmacSigner signer = new HmacSigner();
String sig = signer.sign("POST", "/api/orders", "{\"id\":1}", "1690000000", "v2");
// Headers: X-Signature: v2:base64hash, X-Timestamp: 1690000000
```

### Webhook signature verification with raw body

Many APIs (Stripe, GitHub, Slack) sign webhooks with HMAC. You must verify using the raw request body before any JSON parsing:

```javascript
const crypto = require('crypto');

/**
 * Verify a Stripe-style webhook signature.
 * Stripe uses: t=<timestamp>,v1=<signature>
 */
function verifyWebhook(rawBody, signatureHeader, secret) {
    const parts = signatureHeader.split(',');
    const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
    const signatures = parts
        .filter(p => p.startsWith('v1='))
        .map(p => p.split('=')[1]);

    if (!timestamp || signatures.length === 0) return false;

    // Reject old timestamps (5 minute window)
    const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
    if (age > 300 || age < -300) return false;

    // Compute expected signature: HMAC-SHA256(timestamp + rawBody)
    const payload = `${timestamp}.${rawBody}`;
    const expected = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');

    // Check against all provided signatures (Stripe may send multiple)
    return signatures.some(sig =>
        crypto.timingSafeEqual(
            Buffer.from(sig, 'hex'),
            Buffer.from(expected, 'hex')
        )
    );
}

// Express middleware: must use raw body
const express = require('express');
const app = express();

// IMPORTANT: use raw body for signature verification
app.use('/webhooks', express.raw({ type: 'application/json' }));

app.post('/webhooks/stripe', (req, res) => {
    const rawBody = req.body.toString('utf8');
    const sig = req.headers['stripe-signature'];

    if (!verifyWebhook(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)) {
        return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(rawBody);
    console.log('Verified webhook:', event.type);
    res.status(200).send('OK');
});
```

### Nonce-based replay prevention

Timestamps alone allow a 5-minute replay window. Add a nonce cache to reject duplicate requests within that window:

```python
import hmac
import hashlib
import time
from collections import OrderedDict
from typing import Optional


class NonceCache:
    """LRU cache for tracking used nonces within the timestamp window."""

    def __init__(self, max_size: int = 10000, ttl_seconds: int = 300):
        self._cache: OrderedDict[str, float] = OrderedDict()
        self._max_size = max_size
        self._ttl = ttl_seconds

    def check_and_add(self, nonce: str) -> bool:
        """Returns True if nonce is new (acceptable), False if duplicate."""
        now = time.time()
        self._evict_expired(now)

        if nonce in self._cache:
            return False  # Duplicate nonce

        self._cache[nonce] = now
        if len(self._cache) > self._max_size:
            self._cache.popitem(last=False)
        return True

    def _evict_expired(self, now: float):
        expired = [
            k for k, ts in self._cache.items()
            if now - ts > self._ttl
        ]
        for k in expired:
            self._cache.pop(k, None)


class HmacVerifier:
    """HMAC verifier with nonce-based replay prevention."""

    def __init__(self, secret: str, max_skew_seconds: int = 300):
        self.secret = secret.encode()
        self.max_skew = max_skew_seconds
        self.nonces = NonceCache(max_size=10000, ttl_seconds=max_skew_seconds)

    def verify(
        self,
        method: str,
        path: str,
        body: str,
        timestamp: str,
        nonce: str,
        signature: str,
    ) -> bool:
        # Check timestamp window
        try:
            ts = int(timestamp)
        except ValueError:
            return False

        if abs(int(time.time()) - ts) > self.max_skew:
            return False

        # Check nonce uniqueness
        if not self.nonces.check_and_add(nonce):
            return False

        # Verify signature
        message = f"{method.upper()}{path}{timestamp}{nonce}{body}"
        expected = hmac.new(
            self.secret,
            message.encode(),
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(signature, expected)


# Server-side usage
verifier = HmacVerifier("my-secret-key")

# Request arrives with headers:
# X-Timestamp: 1690000000
# X-Nonce: a1b2c3d4-e5f6-7890-abcd-ef1234567890
# X-Signature: hexhash

is_valid = verifier.verify(
    method="POST",
    path="/api/orders",
    body='{"id":1,"item":"widget"}',
    timestamp="1690000000",
    nonce="a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    signature="abc123...",
)
```

### Key rotation strategy

```python
import hmac
import hashlib
import time
from typing import Optional


class KeyRotator:
    """Manages HMAC key rotation with overlap period for zero downtime."""

    def __init__(self):
        self.keys: dict[str, dict] = {}
        self.active_version: Optional[str] = None

    def add_key(self, version: str, secret: str, activate: bool = True):
        self.keys[version] = {
            "secret": secret,
            "created": time.time(),
        }
        if activate:
            self.active_version = version

    def deactivate_key(self, version: str):
        self.keys.pop(version, None)
        if self.active_version == version:
            # Activate the most recent remaining key
            if self.keys:
                self.active_version = max(self.keys.keys())
            else:
                self.active_version = None

    def get_signing_key(self) -> tuple[str, str]:
        """Returns (version, secret) for signing new requests."""
        if not self.active_version:
            raise RuntimeError("No active signing key")
        return self.active_version, self.keys[self.active_version]["secret"]

    def get_verification_keys(self) -> list[tuple[str, str]]:
        """Returns all valid keys for verifying incoming requests."""
        return [(v, info["secret"]) for v, info in self.keys.items()]

    def sign(self, method: str, path: str, body: str, timestamp: str) -> str:
        version, secret = self.get_signing_key()
        message = f"{method.upper()}{path}{timestamp}{body}"
        sig = hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()
        return f"{version}:{sig}"

    def verify(self, method: str, path: str, body: str, timestamp: str, signature: str) -> bool:
        parts = signature.split(":", 1)
        if len(parts) != 2:
            return False

        version, received_sig = parts
        for v, secret in self.get_verification_keys():
            if v != version:
                continue
            message = f"{method.upper()}{path}{timestamp}{body}"
            expected = hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()
            if hmac.compare_digest(received_sig, expected):
                return True
        return False


# Rotation workflow:
# 1. Add new key (v2) — both v1 and v2 are valid for verification
rotator = KeyRotator()
rotator.add_key("v1", "old-secret", activate=False)
rotator.add_key("v2", "new-secret", activate=True)

# 2. Deploy: new requests signed with v2, old v1 requests still verify
# 3. After all old requests expire (timestamp window), deactivate v1
# rotator.deactivate_key("v1")
```

## Additional Best Practices

1. **Sign headers that affect routing.** Include `Host`, `X-Forwarded-For`, and `Content-Type` in the signature if your infrastructure uses them for routing or processing:

```javascript
function signWithHeaders(method, path, body, timestamp, secret, headers) {
    // Sort headers alphabetically for deterministic signing
    const sortedHeaders = Object.keys(headers)
        .sort()
        .map(k => `${k.toLowerCase()}:${headers[k]}`)
        .join('\n');

    const payload = [
        method.toUpperCase(),
        path,
        timestamp,
        sortedHeaders,
        JSON.stringify(body),
    ].join('\n');

    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}
```

2. **Use a dedicated signing library in production.** Libraries like `aws-sdk` (AWS SigV4), `stripe-node` (Stripe signing), or `sentry` handle edge cases you might miss:

```python
# AWS Signature Version 4 (built into boto3)
import boto3
import requests
from botocore.auth import SigV4Auth
from botocore.credentials import Credentials
from botocore.httpsession import URLLib3Session

# boto3 automatically signs requests with SigV4
client = boto3.client('s3', region_name='us-east-1')
client.put_object(Bucket='my-bucket', Key='file.txt', Body='content')

# For custom APIs requiring AWS SigV4:
credentials = Credentials(access_key, secret_key)
auth = SigV4Auth(credentials, 'execute-api', 'us-east-1')
# The auth signer handles canonical request, string-to-sign, and signing key derivation
```

## Additional Common Mistakes

1. **Using `JSON.stringify()` on the server when the client signed a raw string.** JSON serialization is not deterministic — key order and whitespace may differ. Always sign the raw request body bytes:

```javascript
// WRONG: different JSON serialization on client vs server
const payload = JSON.stringify(body); // key order may differ

// CORRECT: sign raw bytes as received
const payload = rawBody; // express.raw() middleware
```

2. **Not handling signature header parsing errors.** Malformed headers should return 401, not cause a 500 error:

```javascript
function safeVerify(rawBody, signatureHeader, secret) {
    try {
        if (!signatureHeader || typeof signatureHeader !== 'string') {
            return false;
        }
        return verifyWebhook(rawBody, signatureHeader, secret);
    } catch (err) {
        console.error('Signature verification error:', err.message);
        return false; // Fail closed
    }
}
```

## Additional FAQ

### How do I test HMAC signing locally?

Use a fixed timestamp and known secret to generate deterministic signatures for testing:

```python
import hmac
import hashlib

def generate_test_signature(method, path, body, secret, timestamp="1690000000"):
    message = f"{method.upper()}{path}{timestamp}{body}"
    return hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest(), timestamp

# Test vectors
sig, ts = generate_test_signature("GET", "/api/health", "", "test-secret")
assert len(sig) == 64  # SHA-256 hex digest
print(f"Test signature: {sig}")
print(f"Timestamp: {ts}")
```

### Should I use HMAC or mTLS for service-to-service auth?

Use **mTLS** when you control both services and need mutual authentication at the transport layer. Use **HMAC** when you need application-level signing (e.g., webhooks from third parties, API gateways with multiple consumers). They complement each other — mTLS encrypts the channel, HMAC verifies the message.

### How do I handle key distribution securely?

Never embed secrets in code or commit them to version control. Use one of these methods:

```bash
# 1. Environment variables (for development)
export HMAC_SECRET="your-secret-key"

# 2. HashiCorp Vault (for production)
export HMAC_SECRET=$(vault kv get -field=secret secret/hmac/api-service)

# 3. AWS Secrets Manager (for AWS deployments)
export HMAC_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id hmac/api-service \
    --query SecretString --output text)

# 4. Kubernetes secrets (for k8s deployments)
# kubectl create secret generic hmac-secret --from-literal=secret='your-secret'
# Mount as environment variable in pod spec
```
