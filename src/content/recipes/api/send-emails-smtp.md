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

Email remains the backbone of user communication: password resets, order confirmations, newsletters, and alerts. Sending email via SMTP gives you full control over deliverability, templating, and tracking. This recipe covers sending plain text, HTML, and templated emails with attachments using Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Your application needs to send transactional emails (sign-up, password reset, receipts)
- You want to avoid vendor lock-in from email SaaS platforms
- You need custom email templates with dynamic data
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

For high volume, consider a **message queue** (Redis, RabbitMQ) that feeds into a worker pool of SMTP senders. This decouples your API from email latency and failures.

## Variants

| Technology | Library | Template Engine | Best For |
|------------|---------|-----------------|----------|
| Python | smtplib + email | Jinja2 / string.Template | Simple scripts, microservices |
| Node.js | nodemailer | Handlebars / EJS | Full-stack apps, SSR |
| Java | Jakarta Mail | Thymeleaf / FreeMarker | Enterprise, Spring Boot |
| Go | net/smtp | html/template | Microservices, low latency |
| Ruby | Action Mailer | ERB | Rails apps |

## Best Practices

- **Use app passwords or OAuth2**: Never hardcode your personal email password.
- **Set SPF, DKIM, and DMARC**: These DNS records dramatically improve deliverability.
- **Throttle sends**: Most SMTP providers limit to ~100 emails/minute.
- **Use a dedicated sending domain**: Prevents your main domain reputation from suffering.
- **Handle bounces asynchronously**: Parse SMTP replies and webhook events to clean your list.

## Common Mistakes

- **Sending from localhost without SPF**: Your emails will land in spam folders.
- **No HTML + plain text fallback**: Some clients (watch, CLI) only render text.
- **Embedding secrets in code**: Use environment variables or a secrets manager.
- **Ignoring SMTP rate limits**: You'll get temporarily blocked or blacklisted.
- **Synchronous sending in requests**: Use a background worker to avoid HTTP timeouts.

## Frequently Asked Questions

### Should I use SMTP or a transactional email API?

Use SMTP when you need portability and control (switch providers easily). Use an API (SendGrid, Mailgun, Postmark) when you need analytics, templates managed via UI, and webhook events out of the box. Many APIs also offer SMTP endpoints for the best of both worlds.

### How do I prevent emails from going to spam?

Authenticate with SPF, DKIM, and DMARC. Use a consistent "From" address. Avoid spammy words in subject lines. Keep your HTML simple and mobile-friendly. Monitor your sender reputation with Google Postmaster Tools.

### Can I send bulk newsletters via SMTP?

Yes, but SMTP is not optimized for bulk. For newsletters (10k+ recipients), use a dedicated email marketing platform (Mailchimp, ConvertKit, Brevo). For transactional + small bulk, SMTP works fine with queue-based throttling.
