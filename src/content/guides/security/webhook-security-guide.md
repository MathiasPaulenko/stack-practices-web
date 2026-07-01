---
contentType: guides
slug: webhook-security-guide
title: "Webhook Security — Delivery, Verification, and Protection"
description: "A practical guide to securing webhooks: signature verification, replay attack prevention, payload encryption, and endpoint hardening for reliable delivery."
metaDescription: "Learn how to secure webhooks with signature verification, replay protection, payload encryption, and endpoint hardening. Practical security guide for developers."
difficulty: intermediate
topics:
  - security
  - api
tags:
  - webhook
  - security
  - api
  - signature-verification
  - replay-attacks
  - encryption
  - guide
relatedResources:
  - /guides/api-security-checklist-guide
  - /guides/web-application-security-guide
  - /recipes/api-rate-limiting-redis
  - /recipes/websocket-authentication
  - /recipes/data-validation-zod
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Learn how to secure webhooks with signature verification, replay protection, payload encryption, and endpoint hardening. Practical security guide for developers."
  keywords:
    - webhook
    - security
    - api
    - signature-verification
    - replay-attacks
    - encryption
    - guide
---
## Overview

Webhooks are the duct tape of the internet: every SaaS product sends them, every integration consumes them, and almost nobody secures them properly. An unprotected webhook endpoint is an open door — anyone who discovers the URL can POST data to your system and trigger actions. This guide covers the essential security controls for webhook producers and consumers: signature verification, replay attack prevention, payload encryption, endpoint hardening, and delivery reliability.

## When to Use

Use this guide when:
- You are building a SaaS product that sends webhooks to customer endpoints
- You are consuming webhooks from third-party services (Stripe, GitHub, Slack, etc.)
- You have experienced webhook spoofing, replay attacks, or payload tampering

## Solution

### Signature Verification (Producer Side)

```python
import hmac
import hashlib
import json

WEBHOOK_SECRET = "whsec_..."  # store in vault, not code

def sign_payload(payload: dict) -> str:
    """Sign a webhook payload with HMAC-SHA256."""
    payload_bytes = json.dumps(payload, separators=(',', ':')).encode()
    signature = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload_bytes,
        hashlib.sha256
    ).hexdigest()
    return f"v1={signature}"

# Send webhook
headers = {
    "X-Webhook-Signature": sign_payload(payload),
    "X-Webhook-ID": str(uuid.uuid4()),
    "X-Webhook-Timestamp": str(int(time.time()))
}
requests.post(customer_url, json=payload, headers=headers)
```

### Signature Verification (Consumer Side)

```python
import hmac
import hashlib
import time

WEBHOOK_SECRET = "whsec_..."
MAX_AGE_SECONDS = 300  # 5 minutes

def verify_webhook(headers: dict, body: bytes) -> bool:
    """Verify webhook signature and prevent replay attacks."""
    # 1. Extract signature
    sig_header = headers.get("X-Webhook-Signature", "")
    if not sig_header.startswith("v1="):
        return False
    expected_sig = sig_header.split("=")[1]

    # 2. Compute signature
    computed = hmac.new(
        WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256
    ).hexdigest()

    # 3. Constant-time comparison
    if not hmac.compare_digest(computed, expected_sig):
        return False

    # 4. Check timestamp (replay protection)
    timestamp = int(headers.get("X-Webhook-Timestamp", 0))
    if abs(time.time() - timestamp) > MAX_AGE_SECONDS:
        return False

    # 5. Check unique ID (idempotency / replay)
    webhook_id = headers.get("X-Webhook-ID")
    if is_duplicate_id(webhook_id):
        return False

    return True
```

### Endpoint Hardening Checklist

```python
# Flask example with security hardening
from flask import Flask, request, abort

app = Flask(__name__)

@app.route('/webhooks/stripe', methods=['POST'])
def handle_stripe_webhook():
    # 1. Reject non-POST methods at the edge
    if request.method != 'POST':
        abort(405)

    # 2. Validate Content-Type
    if request.content_type != 'application/json':
        abort(415)

    # 3. Size limit
    if request.content_length > 1_000_000:  # 1MB
        abort(413)

    # 4. IP allowlist (if provider publishes IPs)
    if request.remote_addr not in STRIPE_IPS:
        abort(403)

    # 5. Signature verification
    payload = request.get_data()
    sig = request.headers.get('Stripe-Signature')
    if not verify_stripe_signature(payload, sig):
        abort(400)

    # 6. Process asynchronously
    process_webhook_async.delay(payload)
    return '', 200
```

### Payload Encryption (Sensitive Data)

```python
from cryptography.fernet import Fernet

# Pre-shared key exchanged out-of-band
ENCRYPTION_KEY = Fernet.generate_key()
fernet = Fernet(ENCRYPTION_KEY)

# Encrypt before sending (producer)
encrypted_payload = fernet.encrypt(json.dumps(payload).encode())

# Decrypt after verification (consumer)
if verify_signature(headers, encrypted_payload):
    decrypted = fernet.decrypt(encrypted_payload)
    payload = json.loads(decrypted)
```

## Explanation

Webhook security rests on three pillars: **authenticity** (did this really come from the sender?), **freshness** (is this a replay of an old message?), and **integrity** (was the payload modified in transit?).

**HMAC-SHA256 signature verification** solves authenticity and integrity. The sender computes a hash using a shared secret; the receiver recomputes it and compares. Crucially, use `hmac.compare_digest()` instead of `==` to prevent timing attacks. The secret must never be in URLs, query parameters, or client-side code — it belongs in a vault.

**Replay protection** requires two mechanisms: a timestamp check (reject messages older than 5 minutes) and an idempotency check (store webhook IDs for 24 hours and reject duplicates). Timestamps alone are insufficient because an attacker could replay within the window. ID storage alone is insufficient because your storage could fail. Use both.

**Endpoint hardening** is about reducing attack surface. Webhook endpoints should reject non-POST methods, validate content types, enforce size limits, and verify source IPs if the provider publishes them. Process webhooks asynchronously to prevent slowloris attacks from exhausting your workers.

## Variants

| Provider | Signature Header | Timestamp Header | Key Format | Notes |
|----------|-----------------|------------------|------------|-------|
| **Stripe** | `Stripe-Signature` | Included in signature payload | `whsec_` | Tolerance configurable |
| **GitHub** | `X-Hub-Signature-256` | None | Webhook secret | No timestamp; use delivery ID for replay |
| **Slack** | `X-Slack-Signature` | `X-Slack-Request-Timestamp` | Signing secret | Versioned signature scheme |
| **Custom** | `X-Webhook-Signature` | `X-Webhook-Timestamp` | Raw HMAC key | Full control over scheme |

## What Works

1. **Rotate webhook secrets** every 90 days or after any security incident
2. **Use HTTPS only**; HTTP webhooks expose payloads to passive network sniffing
3. **Implement exponential backoff** for delivery retries; don't hammer failing endpoints
4. **Log every webhook** (ID, timestamp, result) for at least 30 days for debugging
5. **Version your webhook schema**; never break existing consumers with payload changes

## Common Mistakes

1. **Verifying signatures with `==`** instead of constant-time comparison; vulnerable to timing attacks
2. **Storing the webhook secret** in environment variables without encryption at rest
3. **Processing webhooks synchronously**; a burst of webhooks can DDoS your own service
4. **Not checking Content-Type**; attackers can send crafted multipart requests to exploit parsers
5. **Ignoring failed deliveries**; if your endpoint returns 500, the provider will retry — potentially amplifying damage

## Frequently Asked Questions

### What if my webhook provider doesn't sign payloads?

If the provider doesn't support signatures, you have three options: (1) **IP allowlisting** — restrict the endpoint to the provider's published IP ranges, (2) **Shared secret in a custom header** — negotiate a secret and require it in a header, (3) **TLS client certificates** — use mutual TLS if the provider supports it. If none of these are available, treat the webhook as untrusted input and validate every field aggressively. Do not trigger irreversible actions (payments, deletions) based on unsigned webhooks.

### How do I handle webhook retries and idempotency?

Store processed webhook IDs in a deduplication store (Redis with TTL, or a database with unique constraints). When a webhook arrives, check the ID before processing. Design your actions to be idempotent: charging a payment with the same IDempotency-Key should not create a duplicate charge. Return 200 for duplicates — don't return 409, because the provider may interpret that as a failure and retry. Return 200 for valid webhooks even if you queue them for async processing.

### Should I expose one webhook endpoint or multiple?

**Multiple endpoints** are better for security and reliability. A dedicated `/webhooks/stripe` endpoint can have Stripe-specific IP allowlisting, signature verification, and payload parsing. If you use one generic `/webhooks` endpoint, a bug in the parser for one provider could expose data from another provider. Multiple endpoints also make monitoring and alerting more granular. The only case for a single endpoint is if you have dozens of providers and need a generic webhook ingestion pipeline — but even then, route by path or header to provider-specific handlers.
