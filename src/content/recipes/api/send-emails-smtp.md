---
contentType: recipes
slug: send-emails-smtp
title: "Send Emails with SMTP"
description: "How to send transactional and bulk emails securely using SMTP with template support."
metaDescription: "Learn to send emails with SMTP in Python, JavaScript, and Java. Includes templates, authentication, attachments, and error handling."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - email
  - java
  - rest
  - http
relatedResources:
  - /recipes/call-rest-api
  - /recipes/handle-errors
  - /recipes/input-validation
  - /recipes/logging
  - /recipes/middleware
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn to send emails with SMTP in Python, JavaScript, and Java. Includes templates, authentication, attachments, and error handling."
  keywords:
    - smtp
    - email
    - templates
    - python
    - javascript
    - java
    - notification
---
## Overview

Email remains the backbone of user communication: password resets, order confirmations, newsletters, and alerts. Sending email via SMTP gives you full control over deliverability, templating, and tracking. The solution below covers sending plain text, HTML, and templated emails with attachments using Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Your application needs to send transactional emails (sign-up, password reset, receipts). See [API Security Checklist](/guides/security/api-security-checklist-guide) for email security.
- You want to avoid vendor lock-in from email SaaS platforms
- You need custom email templates with live data
- You must send attachments (invoices, reports, exports)

## Solution

### Python

```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from string import Template

SMTP_HOST = "smtp.example.com"
SMTP_PORT = 587
SMTP_USER = "user@example.com"
SMTP_PASS = "app-password"

def send_template_email(to, subject, template_path, context):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_USER
    msg["To"] = to

    with open(template_path) as f:
        template = Template(f.read())
    html = template.substitute(context)

    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, to, msg.as_string())

# Usage
send_template_email(
    to="user@example.com",
    subject="Welcome to StackPractices",
    template_path="welcome.html",
    context={"name": "Alice", "login_url": "https://app.example.com/login"}
)
```

### JavaScript (Node.js)

```javascript
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const fs = require("fs");

const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  secure: false,
  auth: { user: "user@example.com", pass: "app-password" },
});

async function sendTemplateEmail(to, subject, templatePath, context) {
  const source = fs.readFileSync(templatePath, "utf8");
  const template = handlebars.compile(source);
  const html = template(context);

  await transporter.sendMail({
    from: "StackPractices <noreply@example.com>",
    to,
    subject,
    html,
  });
}

// Usage
sendTemplateEmail(
  "user@example.com",
  "Order Confirmation #12345",
  "order-confirmation.hbs",
  { name: "Alice", orderId: "12345", total: "$99.00" }
);
```

### Java (Spring Boot)

```java
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {
    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void send(String to, String subject, String htmlBody) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlBody, true);
        helper.setFrom("noreply@example.com");
        mailSender.send(message);
    }
}
```

## Explanation

SMTP (Simple Mail Transfer Protocol) is the standard protocol for sending email. The flow is:

1. **Connect** to the SMTP server (port 25, 587, or 465 for TLS).
2. **Authenticate** with username and password (or OAuth2).
3. **Build** the MIME message (plain text, HTML, multipart).
4. **Send** via `MAIL FROM` → `RCPT TO` → `DATA` commands.
5. **Handle** bounces, retries, and rate limits asynchronously.

For high volume, consider a **message queue** ([Kafka](/recipes/messaging/kafka-event-streaming), RabbitMQ) that feeds into a worker pool of SMTP senders. This decouples your API from email latency and failures.

## Variants

| Technology | Library | Template Engine | Best For |
|------------|---------|-----------------|----------|
| Python | smtplib + email | Jinja2 / string.Template | Simple scripts, microservices |
| Node.js | nodemailer | Handlebars / EJS | Full-stack apps, SSR |
| Java | Jakarta Mail | Thymeleaf / FreeMarker | Enterprise, Spring Boot |
| Go | net/smtp | html/template | Microservices, low latency |
| Ruby | Action Mailer | ERB | Rails apps |

## What Works

- **Use app passwords or OAuth2**: Never hardcode your personal email password.
- **Set SPF, DKIM, and DMARC**: These DNS records dramatically improve deliverability.
- **Throttle sends**: Most SMTP providers limit to ~100 emails/minute.
- **Use a dedicated sending domain**: Prevents your main domain reputation from suffering.
- **Handle bounces asynchronously**: Parse SMTP replies and webhook events to clean your list.

## Common Mistakes

- **Sending from localhost without SPF**: Your emails will land in spam folders.
- **No HTML + plain text fallback**: Some clients (watch, CLI) only render text.
- **Embedding secrets in code**: Use environment variables or a secrets manager. See [Security Guide](/guides/security/security-best-practices-guide) for secrets management.
- **Ignoring SMTP rate limits**: You'll get temporarily blocked or blacklisted.
- **Synchronous sending in requests**: Use a [background worker](/recipes/api/middleware) to avoid HTTP timeouts.

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

## Frequently Asked Questions

### Should I use SMTP or a transactional email API?

Use SMTP when you need portability and control (switch providers easily). Use an API (SendGrid, Mailgun, Postmark) when you need analytics, templates managed via UI, and webhook events out of the box. Many APIs also offer SMTP endpoints for the best of both worlds.

### How do I prevent emails from going to spam?

Authenticate with SPF, DKIM, and DMARC. Use a consistent "From" address. Avoid spammy words in subject lines. Keep your HTML simple and mobile-friendly. Monitor your sender reputation with Google Postmaster Tools.

### Can I send bulk newsletters via SMTP?

Yes, but SMTP is not optimized for bulk. For newsletters (10k+ recipients), use a dedicated email marketing platform (Mailchimp, ConvertKit, Brevo). For transactional + small bulk, SMTP works fine with queue-based throttling.
- **SMTP connection pooling**: reuse SMTP connections across email sends to avoid TCP+TLS handshake overhead. Set max pool size to 10 and idle timeout to 30 seconds.
- **Email template injection**: if email templates include user input without escaping, attackers can inject malicious content into emails. Always escape user input in email templates, even in plain text emails.
- **BCC leakage in bulk emails**: if bulk emails are sent with all recipients in To or Cc, recipients can see each other's addresses. Always use Bcc or individual messages for bulk sends.
- **SMTP timing attacks**: if email validation reveals whether an email was sent successfully, attackers can enumerate valid email addresses. Return the same response regardless of whether the email was sent.
