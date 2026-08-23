---
contentType: recipes
slug: send-emails-smtp
title: "Send Transactional Emails with SMTP in Python, Node.js, Java"
description: "Learn to send transactional and bulk emails via SMTP with Python, Node.js, and Java. Covers auth, templates, attachments, rate limiting, and deliverability."
metaDescription: "Send transactional and bulk emails with SMTP in Python, Node.js, and Java. Use smtplib, nodemailer, and Jakarta Mail with TLS, templates, and attachments."
difficulty: intermediate
topics:
  - messaging
  - api
tags:
  - email
  - smtp
  - python
  - javascript
  - java
  - deliverability
relatedResources:
  - /recipes/call-rest-api
  - /recipes/input-validation
  - /recipes/secret-management
  - /recipes/rate-limiting
  - /recipes/handle-errors
  - /recipes/logging
lastUpdated: "2026-08-23"
publishedAt: "2026-06-11"
author: Mathias Paulenko
seo:
  metaDescription: "Send transactional and bulk emails with SMTP in Python, Node.js, and Java. Use smtplib, nodemailer, and Jakarta Mail with TLS, templates, and attachments."
  keywords:
    - smtp
    - email
    - transactional email
    - nodemailer
    - smtplib
    - jakarta mail
    - attachments
    - deliverability
---

## Overview

Most apps still fall back on email for password resets, order confirmations, newsletters, and
alerts. SMTP (Simple Mail Transfer Protocol) is what moves those messages from your app to the
recipient's inbox. Using it directly keeps you portable between providers and gives you full control
over templates, attachments, and sender reputation. This recipe covers production-ready patterns in
Python, Node.js, and Java, with TLS, plain + HTML bodies, attachments, and rate throttling.

## When to Use

- Your app sends transactional email and you want to swap providers without a rewrite.
- You want live data in your templates, or you prefer to keep email logic in your own code.
- You need to attach invoices, reports, or exports to outgoing messages.
- You already run a message queue or worker pool and want SMTP senders to pull jobs from it.
- You're combining email with [rate limiting](/recipes/rate-limiting) and [secret
  management](/recipes/secret-management) best practices.

## When to Avoid

- Your volume is millions of marketing emails per month. Dedicated platforms like Mailchimp, Brevo,
  and Mailgun handle list hygiene and unsubscribe compliance far better.
- Your team can't keep up with DNS records (SPF, DKIM, DMARC), bounce handling, and sender
  reputation.
- In-app notifications need low latency. Push notifications or WebSockets fit those cases better.

## Solution

### Python

```python
import mimetypes
import smtplib
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from string import Template

SMTP_HOST = "smtp.example.com"
SMTP_PORT = 587
SMTP_USER = "user@example.com"
SMTP_PASS = "app-password"


def build_message(from_addr, to, subject, text, html=None, attachments=None):
    """Build a multipart email with plain text, optional HTML, and attachments."""
    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to

    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(text, "plain"))
    if html:
        alt.attach(MIMEText(html, "html"))
    msg.attach(alt)

    if attachments:
        for path in attachments:
            ctype, _ = mimetypes.guess_type(path)
            if ctype is None:
                ctype = "application/octet-stream"
            maintype, subtype = ctype.split("/", 1)

            with open(path, "rb") as f:
                part = MIMEBase(maintype, subtype)
                part.set_payload(f.read())
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                "attachment",
                filename=Path(path).name,
            )
            msg.attach(part)

    return msg


def send_template_email(to, subject, template_text, template_html, context):
    text = Template(template_text).substitute(context)
    html = Template(template_html).substitute(context) if template_html else None
    msg = build_message(SMTP_USER, to, subject, text, html)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)


# Usage
text_template = "Hi $name, your order $order_id is confirmed."
html_template = "<p>Hi $name, your order <b>$order_id</b> is confirmed.</p>"
send_template_email(
    to="user@example.com",
    subject="Order #12345 confirmed",
    template_text=text_template,
    template_html=html_template,
    context={"name": "Alice", "order_id": "12345"},
)
```

### JavaScript (Node.js)

```javascript
const fs = require('fs');
const nodemailer = require('nodemailer');
const path = require('path');

const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  auth: { user: 'user@example.com', pass: 'app-password' },
  tls: { rejectUnauthorized: true },
});

async function sendEmail(to, subject, text, html = null, attachments = []) {
  await transporter.sendMail({
    from: '"StackPractices" <noreply@example.com>',
    to,
    subject,
    text,
    html,
    attachments: attachments.map((file) => ({
      path: file,
      filename: path.basename(file),
    })),
  });
}

async function sendOrderConfirmation(to, context) {
  const text = `Hi ${context.name}, your order ${context.orderId} is confirmed.`;
  const html = `<p>Hi ${context.name}, your order <b>${context.orderId}</b> is confirmed.</p>`;
  await sendEmail(to, `Order #${context.orderId} confirmed`, text, html);
}

// Usage
sendOrderConfirmation('user@example.com', { name: 'Alice', orderId: '12345' });
```

### Java

```java
import jakarta.activation.DataHandler;
import jakarta.activation.DataSource;
import jakarta.activation.FileDataSource;
import jakarta.mail.*;
import jakarta.mail.internet.*;
import java.io.File;
import java.util.Properties;

public class SmtpSender {

    public static void send(String host, int port, String user, String pass,
                            String to, String subject, String text, String html,
                            File[] attachments) throws Exception {
        Properties props = new Properties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.host", host);
        props.put("mail.smtp.port", port);

        Session session = Session.getInstance(props, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(user, pass);
            }
        });

        Message msg = new MimeMessage(session);
        msg.setFrom(new InternetAddress(user));
        msg.setRecipients(Message.RecipientType.TO, InternetAddress.parse(to));
        msg.setSubject(subject);

        Multipart mixed = new MimeMultipart("mixed");
        Multipart alt = new MimeMultipart("alternative");

        MimeBodyPart textPart = new MimeBodyPart();
        textPart.setText(text);
        alt.addBodyPart(textPart);

        if (html != null) {
            MimeBodyPart htmlPart = new MimeBodyPart();
            htmlPart.setContent(html, "text/html; charset=utf-8");
            alt.addBodyPart(htmlPart);
        }

        MimeBodyPart wrapper = new MimeBodyPart();
        wrapper.setContent(alt);
        mixed.addBodyPart(wrapper);

        if (attachments != null) {
            for (File f : attachments) {
                MimeBodyPart att = new MimeBodyPart();
                DataSource source = new FileDataSource(f);
                att.setDataHandler(new DataHandler(source));
                att.setFileName(f.getName());
                mixed.addBodyPart(att);
            }
        }

        msg.setContent(mixed);
        Transport.send(msg);
    }

    public static void main(String[] args) throws Exception {
        send(
            "smtp.example.com",
            587,
            "user@example.com",
            "app-password",
            "user@example.com",
            "Order #12345 confirmed",
            "Hi Alice, your order 12345 is confirmed.",
            "<p>Hi Alice, your order <b>12345</b> is confirmed.</p>",
            null
        );
    }
}
```

## Explanation

SMTP works like a short negotiation between your client and the mail server. The client opens a
connection on port 587 (startTLS) or 465 (SSL/TLS), logs in with a username and app password or an
OAuth2 token, then builds and sends a MIME message. The actual delivery uses the sequence `MAIL
FROM` → `RCPT TO` → `DATA`. After that, the server replies with status codes; your job is to handle
bounces, retries, and rate limits on the side.

High-volume sending shouldn't happen inside an HTTP handler. That path couples your API to the
speed of the mail server and can cause timeouts. A better design is to hand messages off to a queue
and let workers handle delivery. This keeps response times low and gives you a clean place to retry
transient failures.

## Variants

For Python, pair `smtplib` with the `email` package when you need custom MIME handling. Node.js
tends to default to `nodemailer` for full-stack apps, SSR, and quick attachment support. Java
projects usually pick `Jakarta Mail` for enterprise or Spring Boot codebases.

Go and C# are also solid choices. Go's `net/smtp` and the `jordan-wright/email` package work well for
low-latency services, while .NET developers usually reach for `MailKit`.

## Best Practices

Start with the basics: use app passwords or OAuth2 tokens, and never commit them to version control.
Store them in a secret manager and rotate them on a schedule. Next, add SPF, DKIM, and DMARC DNS
records to your sending domain. No other change moves the needle on deliverability as much as these
records.

Always send a plain text fallback with your HTML messages. Some clients, especially watches and
terminal readers, only render text. Throttle your sends because most providers cap you at a few
hundred emails per minute. A dedicated sending domain is also worth it: if a campaign damages
its reputation, your main domain stays clean.

On the operational side, handle bounces and spam complaints asynchronously. Read SMTP responses and
webhook events to keep your list clean. Finally, sanitize any user input that lands in a template or
subject line; header injection and malicious links are real risks.

## Common Mistakes

- Sending from localhost or a shared server without valid SPF/DKIM records. Your messages land in spam.
- Embedding production credentials in source code or in environment files that get checked into
  version control.
- Skipping recipient address validation before queuing. See [input
  validation](/recipes/input-validation) for safe patterns.
- Sending mail synchronously inside HTTP handlers, where it can time out under load.
- Ignoring rate limits and retries, which leads to temporary blocks or blacklisting.
- Using `To` or `Cc` for bulk sends. Use `Bcc` or individual messages to protect recipients.
- Running without any logs or monitoring. Without them, you only notice delivery problems when users
  complain.

## FAQ

### Should I use SMTP or a transactional email API?

SMTP makes sense when you care about portability and might switch providers later. A transactional
email API like SendGrid, Mailgun, or Postmark is better when you want managed
templates, analytics, and bounce webhooks out of the box. Most providers give you both options, so
the choice isn't always forced.

### How do I stop emails from landing in spam?

The first step is to authenticate with SPF, DKIM, and DMARC. Send from a consistent address, keep the
HTML clean and mobile-friendly, avoid spammy subject words, and watch your sender reputation with
Google Postmaster Tools. Engagement also matters, so clean out inactive recipients from your list
regularly.

### Can I send bulk newsletters via SMTP?

Technically you can, but large newsletters aren't what SMTP is built for. It handles transactional
email and small batches well. For tens of thousands of recipients, use a dedicated email
marketing platform and connect it to your app through its API or list imports.
