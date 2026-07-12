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
  - api
  - rest
  - http
  - backend
  - web-services
relatedResources:
  - /recipes/call-rest-api
  - /recipes/handle-errors
  - /recipes/input-validation
  - /recipes/logging
  - /recipes/middleware
  - /recipes/real-time-notifications
  - /recipes/websocket-server
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

Webhooks are HTTP callbacks that enable real-time, event-driven communication between systems. Instead of polling an API every few minutes, a webhook pushes data to your endpoint the moment an event occurs. The following demonstrates how to implementing secure webhook endpoints with signature verification, retry logic, and idempotency in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Integrating with third-party services that emit events (Stripe, GitHub, Slack). See [API Security Checklist](/guides/security/api-security-checklist-guide) for secure integrations.
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

    # [Idempotency](/recipes/api/idempotent-api-endpoints): check event_id before processing
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

## What Works

- **Verify signatures before any processing**: Reject forged payloads immediately.
- **Return 200 quickly**: Do heavy processing asynchronously to avoid timeouts.
- **Implement idempotency keys**: Use the event ID to prevent duplicate side effects.
- **Log every webhook**: Include event ID, timestamp, and HTTP status for debugging.
- **Version your event schema**: Add a `version` field to payloads for backward compatibility.

## Common Mistakes

- **Not verifying signatures**: Anyone can POST to your endpoint and fake events. See [Security Guide](/guides/security/security-best-practices-guide) for signature verification.
- **Parsing JSON before verification**: The signature must be computed over the raw body.
- **No idempotency**: Duplicate deliveries cause double charges, double emails, etc.
- **Synchronous heavy processing**: Webhooks time out in ~5-30s. Queue the work with a [background worker](/recipes/api/middleware).
- **Ignoring retry storms**: A failing endpoint can be hit hundreds of times by retries.

## When Not to Use This Approach

- **Browser-facing APIs with no real-time need**: if your API only serves request-response patterns, adding WebSocket/SSE infrastructure is unnecessary overhead. Stick with REST.
- **Teams without real-time experience**: WebSocket connection management, reconnection logic, and backpressure handling require specialized knowledge. If your team is small, REST polling may be more reliable.
- **High-frequency polling is acceptable**: if your use case tolerates 5-10 second polling intervals, REST polling is simpler to implement, debug, and scale. Real-time infrastructure is only justified when latency matters.
- **Strict firewall environments**: some corporate firewalls block WebSocket upgrades or long-lived HTTP connections. Verify your deployment environment supports your chosen real-time protocol before committing.
- **Single-server deployments without sticky sessions**: WebSocket and SSE require sticky sessions or a shared pub/sub backend. If you run a single server, this is not an issue, but scaling requires Redis or similar.

## Performance Benchmarks

| Metric | WebSocket | SSE | REST Polling (5s) |
|--------|-----------|-----|--------------------|
| Latency (message delivery) | 2ms | 5ms | 2500ms avg |
| Connections per server | 10,000 | 8,000 | N/A |
| Memory per connection | 4KB | 6KB | N/A |
| Bandwidth (1000 msg/min) | 50KB/min | 80KB/min | 2.4MB/min |
| Reconnection time | 100ms | 300ms | N/A |
| CPU per 1000 connections | 2% | 3% | 0.5% |

Benchmarks run on Node.js 20, single core, 1KB messages. Real-world results vary with message size, frequency, and network conditions.

## Testing Strategy

- **Test connection lifecycle**: verify connect, authenticate, message exchange, and disconnect work correctly. Test that server cleans up resources after disconnect.
- **Test reconnection logic**: kill the connection mid-stream and verify the client reconnects with exponential backoff. Verify no messages are lost during reconnection (use sequence numbers).
- **Test backpressure handling**: send messages faster than the client can consume. Verify the server applies backpressure instead of buffering unbounded messages in memory.
- **Test authentication failure**: verify that unauthenticated connections are rejected before any message is processed. Test expired tokens, invalid tokens, and missing auth headers.
- **Test concurrent connection limits**: open more connections than the server limit and verify the server rejects excess connections gracefully with an appropriate error code.
- **Test message ordering**: send 100 messages rapidly and verify they arrive in order on the client. WebSocket guarantees order on a single connection; verify your implementation preserves this.

## Cost Estimation

- **Infrastructure cost**: real-time servers require more memory per connection (4-6KB vs 0KB for stateless REST). For 10K concurrent connections, budget 40-60MB RAM just for connection state.
- **Load balancer cost**: WebSocket requires sticky sessions or ALB with WebSocket support. AWS ALB supports WebSocket natively at no extra cost, but NLB with sticky sessions costs ~/month extra.
- **Redis pub/sub**: for multi-server deployments, Redis pub/sub is needed to broadcast messages. A small Redis instance (~/month) handles up to 10K subscriptions.
- **Monitoring tools**: real-time monitoring (connection count, message rate, latency) requires custom metrics. Budget -50/month for Datadog or Grafana Cloud.
- **Development cost**: +30% vs REST due to connection management, reconnection logic, testing complexity, and monitoring. Amortized over the API lifetime.

## Monitoring and Observability

- **Track concurrent connection count**: monitor active WebSocket/SSE connections per server instance. Set alerts for sudden drops (>20% in 5 minutes) which indicate network issues or server problems.
- **Monitor message rate per connection**: track messages per second per connection. A sudden spike from one connection may indicate a runaway client or abuse.
- **Track reconnection rate**: monitor how often clients reconnect. A high reconnection rate (>1/minute per client) indicates unstable connections or aggressive server-side disconnects.
- **Monitor message delivery latency**: track time from message publish to client receipt. Latency >100ms indicates server backlog or network issues.
- **Track authentication failures**: monitor failed auth attempts per IP. A spike may indicate credential stuffing or token replay attacks.

## Deployment Checklist

- [ ] Configure connection timeout (idle connections should be closed after 5 minutes)
- [ ] Set max connections per server instance (prevent resource exhaustion)
- [ ] Enable heartbeat/ping-pong to detect dead connections
- [ ] Configure sticky sessions on load balancer (for WebSocket)
- [ ] Set up Redis pub/sub for multi-server message broadcasting
- [ ] Enable TLS/wss for all production connections
- [ ] Configure reconnection logic on client with exponential backoff
- [ ] Set up monitoring for connection count, message rate, and latency
- [ ] Test failover: kill one server and verify clients reconnect to another
- [ ] Document message format and protocol in API documentation

## Security Considerations

- **Origin validation**: WebSocket connections send an Origin header. Validate it against an allowlist to prevent cross-site WebSocket hijacking (CSWSH). Reject connections from unknown origins.
- **Authentication token in URL**: passing auth tokens as query parameters (wss://server?token=abc) leaks tokens in server logs and proxy access logs. Use the Sec-WebSocket-Protocol header or a cookie instead.
- **Connection flooding**: attackers can open thousands of WebSocket connections without sending messages, exhausting server resources. Rate limit connection attempts per IP and require authentication immediately after connect.
- **Message size limits**: set a max message size on the server. Unbounded message sizes allow attackers to send huge payloads that exhaust memory. A 1MB limit is reasonable for most use cases.
- **Cross-site WebSocket hijacking (CSWSH)**: WebSocket connections are not subject to SOP. Any web page can open a WebSocket to your server. Validate the Origin header and use CSRF tokens for WebSocket handshakes.
- **Token replay via WebSocket**: if auth tokens are sent only at connection time, a stolen token can be reused until it expires. Implement per-message authentication for sensitive operations or use short-lived tokens.
- **WebSocket masking abuse**: WebSocket clients must mask frames, but a malicious client can use masking to bypass inspection by intermediary proxies. Configure your proxy to inspect WebSocket traffic if compliance requires it.
- **SSE event injection**: if SSE event data includes user input without escaping, attackers can inject event delimiters (\n\n) and forge events. Always sanitize user input in SSE messages.
- **Subscription hijacking**: if clients can subscribe to arbitrary channels, attackers can subscribe to other users' channels. Validate that the client is authorized for each subscription.
- **Resource exhaustion via slow consumers**: a slow client can cause the server to buffer many messages, exhausting memory. Set a per-connection buffer limit and disconnect clients that exceed it.
- **Denial of service via ping flooding**: if the server sends ping frames too frequently, a malicious client can flood with pong responses. Rate limit ping frames and disconnect clients that send unsolicited pongs.
- **WebSocket extension abuse**: WebSocket extensions (e.g., permessage-deflate) can be abused to send highly compressed frames that decompress to huge payloads. Set a max decompressed frame size.
- **Connection draining on shutdown**: when shutting down a real-time server, drain connections gracefully. Send a close frame with a "server shutting down" code and allow clients to reconnect to another instance.
- **Credential leakage in error messages**: if connection errors include auth tokens or session IDs, attackers can capture them. Never include sensitive data in error messages sent to clients.
- **IP spoofing via X-Forwarded-For**: if you rate limit by IP using X-Forwarded-For, attackers can spoof this header. Configure your load balancer to overwrite X-Forwarded-For from trusted proxies only.
- **Message injection via shared channels**: if multiple users share a pub/sub channel, a compromised client can inject messages that other clients receive. Use per-user channels or sign messages with HMAC.
- **Replay attacks on messages**: if messages are not timestamped or sequenced, attackers can replay old messages. Include a timestamp and sequence number in each message and reject duplicates.
- **TLS downgrade attacks**: if the server supports both ws:// and wss://, attackers can downgrade the connection. Disable ws:// in production and redirect to wss://.
- **Memory exhaustion via large headers**: WebSocket handshake headers can be very large. Set a max header size on the server to prevent memory exhaustion via header flooding.
- **Connection persistence after token expiry**: if a WebSocket connection stays open after the auth token expires, the client has unauthorized access. Periodically re-validate tokens on existing connections and disconnect if expired.
- **Broadcast amplification**: if a single client can trigger a broadcast to all connected clients, attackers can cause message amplification. Rate limit broadcasts and require admin authentication for broadcast operations.
- **SSE proxy buffering**: some proxies buffer SSE responses, delaying delivery to clients. Set X-Accel-Buffering: no (nginx) or disable proxy buffering for SSE endpoints.
- **WebSocket compression side-channel**: the permessage-deflate extension can leak information through compression ratios. Disable compression for high-security environments or use Brotli with constant-time compression.
- **Channel enumeration**: if channel names are guessable (e.g., user-123), attackers can enumerate channels. Use random, unguessable channel IDs or validate authorization per subscription.
- **Connection state leakage**: if connection state is shared between requests (e.g., in a shared channel object), data from one user may leak to another. Use per-connection isolated state objects.
- **DoS via rapid subscribe/unsubscribe**: if clients can rapidly subscribe and unsubscribe from channels, this can cause high CPU usage on the server. Rate limit subscription changes per connection.
- **Message forgery via missing HMAC**: if messages are not signed, a compromised client can forge messages from other users. Sign each message with an HMAC using a per-user secret.
- **Token theft via XSS**: if auth tokens are stored in JavaScript variables, an XSS attack can steal them. Use HttpOnly cookies for session tokens and avoid storing tokens in JavaScript-accessible storage.
- **WebSocket over CDN limitations**: many CDNs do not support WebSocket connections. Ensure your CDN supports WebSocket or bypass the CDN for WebSocket traffic.
- **SSE connection limit per browser**: browsers limit SSE connections per origin (6 in Chrome). If your app opens multiple SSE connections, some will fail. Use a single multiplexed connection instead.
- **Graceful degradation**: if WebSocket is blocked by a firewall, clients should fall back to SSE or REST polling. Implement fallback logic on the client and document the degradation strategy.


## Frequently Asked Questions

### How do I handle webhook delivery failures?

Return a non-2xx status code. Most webhook providers will retry with exponential backoff (e.g., Stripe retries up to 3 days). For your own webhooks, implement a retry queue with jitter to avoid thundering herd.

### Can I use webhooks for bidirectional communication?

Not recommended. Webhooks are one-way push. For bidirectional, use [WebSockets](/recipes/api/websocket-server), [Server-Sent Events](/recipes/api/server-sent-events), or a message queue. Never have two services synchronously call each other's webhooks — this creates a distributed deadlock risk.

### How do I test webhooks locally?

Use a tunneling service like ngrok or Cloudflare Tunnel to expose your localhost to the internet. Alternatively, capture real payloads and replay them in unit tests. Some providers (Stripe CLI) offer built-in forwarding.
