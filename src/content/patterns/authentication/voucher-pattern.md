---


contentType: patterns
slug: voucher-pattern
title: "Voucher Pattern"
description: "Validate claims and delegate access using signed vouchers without exposing sensitive data. A security pattern for token-based authorization between services."
metaDescription: "Learn the Voucher Pattern in Python, Java, and JavaScript. Validate signed claims between services without exposing sensitive data or credentials."
difficulty: advanced
topics:
  - authentication
  - security
tags:
  - voucher
  - pattern
  - design-pattern
  - security
  - token-based-auth
  - claims
  - delegation
  - python
  - javascript
  - java
relatedResources:
  - /patterns/federated-identity-pattern
  - /patterns/circuit-breaker-pattern
  - /patterns/ambassador-pattern
  - /patterns/multi-tenant-data-isolation-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Learn the Voucher Pattern in Python, Java, and JavaScript. Validate signed claims between services without exposing sensitive data or credentials."
  keywords:
    - voucher pattern
    - design pattern
    - security pattern
    - token based authorization
    - claims validation
    - python voucher pattern
    - java voucher pattern
    - javascript voucher pattern


---

# Voucher Pattern

## Overview

The [Voucher](/patterns/authentication/voucher-pattern) Pattern issues signed, short-lived tokens (vouchers) that prove a claim without revealing the underlying sensitive data. A service can issue a voucher asserting "this user is authenticated" or "this request is authorized" and pass it to downstream services. Downstream services verify the voucher signature and trust the claim — they never need access to the original credentials or data store.

## When to Use

Use the Voucher Pattern when:
- A service needs to prove a claim to another service without sharing sensitive data
- You want to avoid passing credentials through multiple service hops
- Downstream services need to verify authorization without querying a central database
- You need short-lived, scoped delegation tokens between microservices
- You want to reduce coupling between services and the identity store

## Solution

### Python

```python
import hmac
import hashlib
import json
import time
import base64
from dataclasses import dataclass, asdict

SECRET_KEY = b"shared-secret-key-between-services"

@dataclass
class Voucher:
    issuer: str
    subject: str
    claims: dict
    issued_at: float
    expires_at: float

    def to_dict(self) -> dict:
        return asdict(self)

    def is_expired(self) -> bool:
        return time.time() > self.expires_at


def sign_voucher(voucher: Voucher) -> str:
    payload = json.dumps(voucher.to_dict(), sort_keys=True).encode()
    signature = hmac.new(SECRET_KEY, payload, hashlib.sha256).digest()
    token = base64.urlsafe_b64encode(payload) + b"." + base64.urlsafe_b64encode(signature)
    return token.decode()


def verify_voucher(token: str) -> Voucher | None:
    try:
        payload_b64, sig_b64 = token.rsplit(".", 1)
        payload = base64.urlsafe_b64decode(payload_b64)
        expected_sig = hmac.new(SECRET_KEY, payload, hashlib.sha256).digest()
        actual_sig = base64.urlsafe_b64decode(sig_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        data = json.loads(payload)
        voucher = Voucher(**data)
        if voucher.is_expired():
            return None
        return voucher
    except (ValueError, json.JSONDecodeError, KeyError):
        return None


# Service A: Issue a voucher after authenticating a user
def issue_voucher(user_id: str, permissions: list[str]) -> str:
    voucher = Voucher(
        issuer="auth-service",
        subject=user_id,
        claims={"permissions": permissions, "tenant": "acme"},
        issued_at=time.time(),
        expires_at=time.time() + 300,  # 5 minutes
    )
    return sign_voucher(voucher)


# Service B: Verify the voucher without accessing the auth database
def handle_request(auth_header: str):
    token = auth_header.replace("Bearer ", "")
    voucher = verify_voucher(token)
    if not voucher:
        raise PermissionError("Invalid or expired voucher")
    if "read:reports" not in voucher.claims.get("permissions", []):
        raise PermissionError("Insufficient permissions")
    return f"Report delivered to {voucher.subject}"


# Usage
token = issue_voucher("user-123", ["read:reports", "write:reports"])
result = handle_request(f"Bearer {token}")
print(result)
```

### JavaScript

```javascript
const crypto = require("crypto");

const SECRET_KEY = "shared-secret-key-between-services";

function signVoucher(voucher) {
    const payload = JSON.stringify(voucher);
    const signature = crypto
        .createHmac("sha256", SECRET_KEY)
        .update(payload)
        .digest("base64url");
    return Buffer.from(payload).toString("base64url") + "." + signature;
}

function verifyVoucher(token) {
    try {
        const [payloadB64, sig] = token.split(".");
        const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());

        const expectedSig = crypto
            .createHmac("sha256", SECRET_KEY)
            .update(Buffer.from(payloadB64, "base64url"))
            .digest("base64url");

        if (!crypto.timingSafeEqual(
            Buffer.from(sig),
            Buffer.from(expectedSig)
        )) {
            return null;
        }

        if (Date.now() / 1000 > payload.expires_at) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

// Service A: Issue voucher
function issueVoucher(userId, permissions) {
    const voucher = {
        issuer: "auth-service",
        subject: userId,
        claims: { permissions, tenant: "acme" },
        issued_at: Date.now() / 1000,
        expires_at: Date.now() / 1000 + 300,
    };
    return signVoucher(voucher);
}

// Service B: Verify voucher
function handleRequest(authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const voucher = verifyVoucher(token);
    if (!voucher) {
        throw new Error("Invalid or expired voucher");
    }
    if (!voucher.claims.permissions.includes("read:reports")) {
        throw new Error("Insufficient permissions");
    }
    return `Report delivered to ${voucher.subject}`;
}

// Usage
const token = issueVoucher("user-123", ["read:reports", "write:reports"]);
console.log(handleRequest(`Bearer ${token}`));
```

### Java

```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;

public class VoucherPattern {

    static final String SECRET = "shared-secret-key-between-services";

    record Voucher(String issuer, String subject, Map<String, Object> claims,
                   long issuedAt, long expiresAt) {}

    static String signVoucher(Voucher v) throws Exception {
        String payload = String.format(
            "{\"issuer\":\"%s\",\"subject\":\"%s\",\"claims\":%s,\"issuedAt\":%d,\"expiresAt\":%d}",
            v.issuer(), v.subject(), v.claims().toString(), v.issuedAt(), v.expiresAt()
        );
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(), "HmacSHA256"));
        byte[] sig = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        String payloadB64 = Base64.getEncoder().encodeToString(payload.getBytes());
        String sigB64 = Base64.getEncoder().encodeToString(sig);
        return payloadB64 + "." + sigB64;
    }

    static boolean verifyVoucher(String token) throws Exception {
        String[] parts = token.split("\\.");
        if (parts.length != 2) return false;

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(), "HmacSHA256"));
        byte[] expectedSig = mac.doFinal(Base64.getDecoder().decode(parts[0]));
        byte[] actualSig = Base64.getDecoder().decode(parts[1]);

        return java.util.Arrays.equals(expectedSig, actualSig);
    }

    public static void main(String[] args) throws Exception {
        Voucher v = new Voucher(
            "auth-service", "user-123",
            Map.of("permissions", List.of("read:reports")),
            System.currentTimeMillis() / 1000,
            System.currentTimeMillis() / 1000 + 300
        );

        String token = signVoucher(v);
        System.out.println("Valid: " + verifyVoucher(token));
    }
}
```

## Explanation

The Voucher Pattern creates a trust chain between services without sharing sensitive data:

- **Issuer**: The service that authenticates the user or verifies the claim. Creates and signs the voucher.
- **Voucher**: A signed token containing claims (user ID, permissions, tenant), issuer, and expiry. Signed with an HMAC or asymmetric key.
- **Verifier**: The downstream service that receives the voucher. Verifies the signature and checks expiry. Trusts the claim without querying the identity store.
- **Short-lived**: Vouchers expire quickly (minutes, not hours). This limits the window of misuse if a voucher is intercepted.
- **Scoped**: Vouchers contain only the claims needed for the downstream operation. No passwords, no session tokens, no unnecessary data.

## Variants

| Variant | Signing Method | Use Case |
|---------|---------------|----------|
| **HMAC Voucher** | Shared secret (HMAC-SHA256) | Services that share a secret key |
| **JWT Voucher** | Asymmetric (RS256, ES256) | Public verification with private signing |
| **Capability Token** | Opaque token + lookup | When claims are too large for a token |
| **Delegation Token** | Signed by intermediate service | Chain of trust across multiple hops |

## What Works

- **Keep vouchers short-lived** — 5 minutes or less. Limit the damage of intercepted tokens.
- **Include only necessary claims** — do not embed user profiles or sensitive data in the voucher
- **Use asymmetric signing for cross-org** — RS256/ES256 lets verifiers check with public key only
- **Use HMAC for internal services** — simpler, faster, shared secret via secret manager
- **Verify signature and expiry on every request** — never skip verification for "trusted" callers
- **Rotate signing keys regularly** — compromise of the key compromises all vouchers
- **Include audience claim** — a voucher for Service B should not be accepted by Service C
- **Log voucher issuance** — track who issued what voucher for audit trails

## Common Mistakes

- Making vouchers long-lived — they become reusable session tokens, defeating the purpose
- Embedding sensitive data (passwords, PII) in voucher claims — vouchers may be logged
- Not verifying the signature — accepting unsigned or tampered vouchers
- Not checking expiry — stale vouchers grant access after they should have expired
- Using the same key for all services — one compromise breaks the entire chain
- Not including an audience claim — vouchers intended for one service are accepted by another
- Passing vouchers in URL query strings — URLs are logged by proxies and load balancers
- Not rotating keys — long-lived keys increase the blast radius of a compromise

## Frequently Asked Questions

**Q: How is the Voucher Pattern different from JWT?**
A: JWT is a specific token format (header.payload.signature). The Voucher Pattern is the architectural concept of issuing signed, short-lived claims between services. JWT is one implementation of the Voucher Pattern. You can use HMAC-signed tokens, opaque tokens, or any signed format.

**Q: Should vouchers be stored or stateless?**
A: Prefer stateless vouchers — the signature is the proof. If you need revocation before expiry, maintain a short-lived blocklist of revoked voucher IDs. Full server-side storage defeats the stateless advantage.

**Q: How do I rotate signing keys without downtime?**
A: Publish both the old and new key during a transition period. Verifiers accept tokens signed by either key. After all old vouchers have expired, remove the old key. This is called key rollover.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
