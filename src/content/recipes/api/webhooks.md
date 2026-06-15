---
contentType: recipes
slug: webhooks
title: "Webhooks"
description: "How to create and consume webhook endpoints for real-time event-driven integrations."
metaDescription: "Learn to implement webhooks in Python, JavaScript, and Java. Includes signature verification, retries, idempotency, and event schema design."
difficulty: intermediate
topics:
  - api
tags:
  - webhooks
  - events
  - real-time
  - integration
  - python
  - javascript
  - java
relatedResources:
  - /recipes/call-rest-api
  - /recipes/handle-errors
  - /recipes/input-validation
  - /recipes/logging
  - /recipes/middleware
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn to implement webhooks in Python, JavaScript, and Java. Includes signature verification, retries, idempotency, and event schema design."
  keywords:
    - webhooks
    - events
    - real-time
    - integration
    - python
    - javascript
    - java
---
## Overview

Webhooks are HTTP callbacks that enable real-time, event-driven communication between systems. Instead of polling an API every few minutes, a webhook pushes data to your endpoint the moment an event occurs. This recipe covers implementing secure webhook endpoints with signature verification, retry logic, and idempotency in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Integrating with third-party services that emit events (Stripe, GitHub, Slack)
- Building a SaaS platform that notifies customers of state changes
- You need real-time updates without the latency and cost of polling
- Designing an event-driven microservices architecture

## Solution

### Python (Flask + HMAC Verification)

```python
import hmac
import hashlib
import json
from flask import Flask, request, abort

app = Flask(__name__)
WEBHOOK_SECRET = "whsec_xxxxxxxxxxxxxxxx"

def verify_signature(payload, signature):
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)

@app.route("/webhooks", methods=["POST"])
def receive_webhook():
    payload = request.get_data()
    sig = request.headers.get("X-Webhook-Signature", "")

    if not verify_signature(payload, sig):
        abort(400, "Invalid signature")

    event = json.loads(payload)
    event_type = event.get("type")

    # Idempotency: check event_id before processing
    if is_duplicate(event["id"]):
        return {"status": "duplicate"}, 200

    if event_type == "payment.succeeded":
        process_payment(event["data"])
    elif event_type == "user.created":
        provision_account(event["data"])

    return {"status": "ok"}, 200

def is_duplicate(event_id):
    # Check Redis or DB for processed event IDs
    return False

def process_payment(data):
    pass

def provision_account(data):
    pass
```

### JavaScript (Express + Raw Body)

```javascript
const express = require("express");
const crypto = require("crypto");

const app = express();
const WEBHOOK_SECRET = "whsec_xxxxxxxxxxxxxxxx";

// Must use raw body for signature verification
app.use("/webhooks", express.raw({ type: "application/json" }));

app.post("/webhooks", (req, res) => {
  const sig = req.headers["x-webhook-signature"] || "";
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(req.body)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(`sha256=${expected}`))) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  const event = JSON.parse(req.body);

  // Idempotency check
  if (isDuplicate(event.id)) {
    return res.json({ status: "duplicate" });
  }

  switch (event.type) {
    case "payment.succeeded":
      processPayment(event.data);
      break;
    case "user.created":
      provisionAccount(event.data);
      break;
  }

  res.json({ status: "ok" });
});
```

### Java (Spring Boot + Filter)

```java
import org.springframework.web.bind.annotation.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@RestController
public class WebhookController {
    private static final String SECRET = "whsec_xxxxxxxxxxxxxxxx";

    @PostMapping("/webhooks")
    public Response receive(@RequestBody String payload,
                            @RequestHeader("X-Webhook-Signature") String signature) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] expected = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        String expectedBase64 = Base64.getEncoder().encodeToString(expected);

        if (!MessageDigest.isEqual(signature.getBytes(), expectedBase64.getBytes())) {
            throw new SecurityException("Invalid signature");
        }

        // Process event with idempotency check
        return new Response("ok");
    }

    record Response(String status) {}
}
```

## Explanation

Webhooks invert the traditional request-response model:

1. **Event occurs** in the source system (payment completed, user registered).
2. **Source system** POSTs a JSON payload to your registered URL.
3. **Your endpoint** verifies authenticity, checks idempotency, and processes the event.
4. **Your endpoint** returns HTTP 200 to acknowledge receipt.

If your endpoint fails or times out, the source system will **retry** with exponential backoff. This is why idempotency is critical — the same event may be delivered multiple times.

## Variants

| Concern | Technique | Notes |
|---------|-----------|-------|
| Authentication | HMAC-SHA256 signature | Industry standard (Stripe, GitHub) |
| Authentication | mTLS | Mutual TLS for enterprise integrations |
| Authentication | API Key in header | Simpler but less secure than HMAC |
| Idempotency | Event ID deduplication | Store processed IDs for 24-72h |
| Retry Handling | Exponential backoff | 3, 6, 12, 24... minutes |
| Retry Handling | Dead letter queue | After max retries, park for manual review |

## Best Practices

- **Verify signatures before any processing**: Reject forged payloads immediately.
- **Return 200 quickly**: Do heavy processing asynchronously to avoid timeouts.
- **Implement idempotency keys**: Use the event ID to prevent duplicate side effects.
- **Log every webhook**: Include event ID, timestamp, and HTTP status for debugging.
- **Version your event schema**: Add a `version` field to payloads for backward compatibility.

## Common Mistakes

- **Not verifying signatures**: Anyone can POST to your endpoint and fake events.
- **Parsing JSON before verification**: The signature must be computed over the raw body.
- **No idempotency**: Duplicate deliveries cause double charges, double emails, etc.
- **Synchronous heavy processing**: Webhooks time out in ~5-30s. Queue the work.
- **Ignoring retry storms**: A failing endpoint can be hit hundreds of times by retries.

## Frequently Asked Questions

### How do I handle webhook delivery failures?

Return a non-2xx status code. Most webhook providers will retry with exponential backoff (e.g., Stripe retries up to 3 days). For your own webhooks, implement a retry queue with jitter to avoid thundering herd.

### Can I use webhooks for bidirectional communication?

Not recommended. Webhooks are one-way push. For bidirectional, use WebSockets, Server-Sent Events, or a message queue. Never have two services synchronously call each other's webhooks — this creates a distributed deadlock risk.

### How do I test webhooks locally?

Use a tunneling service like ngrok or Cloudflare Tunnel to expose your localhost to the internet. Alternatively, capture real payloads and replay them in unit tests. Some providers (Stripe CLI) offer built-in forwarding.
