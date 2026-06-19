---
contentType: recipes
slug: magic-link-authentication
title: "Implement Passwordless Login with Magic Links"
description: "How to build secure passwordless authentication using time-limited magic links sent via email, with token generation, validation, and replay attack prevention."
metaDescription: "Learn passwordless login with magic links. Build secure authentication using time-limited links sent via email, with token generation, validation, and replay prevention."
difficulty: intermediate
topics:
  - authentication
tags:
  - authentication
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/session-management
  - /recipes/oauth2-login
  - /recipes/two-factor-authentication
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn passwordless login with magic links. Build secure authentication using time-limited links sent via email, with token generation, validation, and replay prevention."
  keywords:
    - magic links
    - passwordless authentication
    - email login
    - one time link
    - secure token
---

## Overview

Password fatigue is real. Users forget passwords, reuse them across sites, fall for phishing attacks, or abandon registration flows when asked to create yet another complex credential. Magic link authentication eliminates passwords entirely by sending a time-limited, single-use URL to the user's email address. Clicking the link authenticates the user instantly, creating a seamless login experience without ever requiring a password.

The security model of magic links relies on the assumption that the user's email account is secure. If an attacker gains access to the user's inbox, they can intercept magic links just as they could intercept password reset emails. The defense is to keep tokens short-lived (5-15 minutes), single-use, cryptographically random, and transmitted exclusively over HTTPS. This recipe covers token generation, email delivery, validation logic, and hardening against replay attacks.

## When to use it

Use this recipe when:

- Reducing friction in user onboarding and login flows
- Building applications where users log in infrequently (weekly or monthly)
- Serving users who struggle with password managers or complex requirements
- Complementing social login (Google, GitHub) with an email-based alternative
- Creating internal tools or B2B products where email is the primary identity

## Solution

### Generating Magic Links (Python / FastAPI)

```python
import secrets
import hashlib
from datetime import datetime, timedelta
from itsdangerous import URLSafeTimedSerializer

serializer = URLSafeTimedSerializer(secret_key="your-app-secret")

def generate_magic_link(email: str, redirect_url: str) -> str:
    # One-time nonce for replay protection
    nonce = secrets.token_urlsafe(32)

    # Hash the email + nonce to create the token
    token_data = f"{email}:{nonce}"
    token = serializer.dumps(token_data)

    # Store token metadata in database
    db.execute(
        """INSERT INTO magic_tokens (email, nonce, token_hash, expires_at, used)
           VALUES (:email, :nonce, :token_hash, :expires, FALSE)""",
        {
            "email": email.lower().strip(),
            "nonce": nonce,
            "token_hash": hashlib.sha256(token.encode()).hexdigest(),
            "expires": datetime.utcnow() + timedelta(minutes=15),
        }
    )
    db.commit()

    return f"https://app.example.com/auth/verify?token={token}"
```

### Validating Magic Links (Python / FastAPI)

```python
from fastapi import HTTPException

def verify_magic_link(token: str) -> dict:
    try:
        token_data = serializer.loads(token, max_age=900)  # 15 minutes
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired link")

    email, nonce = token_data.split(":", 1)
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    # Check database for token existence and usage
    row = db.execute(
        "SELECT * FROM magic_tokens WHERE token_hash = :hash AND used = FALSE",
        {"hash": token_hash}
    ).fetchone()

    if not row:
        raise HTTPException(status_code=400, detail="Link already used or invalid")

    if row["expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Link expired")

    # Mark as used immediately to prevent replay
    db.execute(
        "UPDATE magic_tokens SET used = TRUE, used_at = :now WHERE id = :id",
        {"now": datetime.utcnow(), "id": row["id"]}
    )
    db.commit()

    # Create user session or JWT
    user = get_or_create_user(email)
    session = create_session(user.id)

    return {"user": user, "session": session}
```

### Sending Magic Link Emails (Node.js / Nodemailer)

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendMagicLink(email, magicLink) {
  await transporter.sendMail({
    from: '"App Name" <login@app.example.com>',
    to: email,
    subject: 'Your login link',
    html: `
      <p>Click the link below to log in. It expires in 15 minutes.</p>
      <a href="${magicLink}" style="padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px;">
        Log in to App
      </a>
      <p>If you didn't request this, ignore this email.</p>
    `,
    text: `Log in: ${magicLink}\n\nExpires in 15 minutes.`,
  });
}
```

## Explanation

- **Token generation**: magic link tokens must be unpredictable. Use `secrets.token_urlsafe(32)` or a signed serializer like `itsdangerous` to generate tokens that are both random and integrity-protected.
- **Single-use enforcement**: the core security property. Each token is marked `used = TRUE` immediately upon first validation. Any subsequent attempt with the same token fails, preventing replay attacks where an intercepted link is reused.
- **Time limits**: tokens expire after 15 minutes by default. This limits the window of opportunity for an attacker who intercepts an email. Do not make tokens valid for hours or days.
- **Email normalization**: normalize email addresses to lowercase and trim whitespace before storage and lookup. This prevents `User@Example.com` and `user@example.com` from being treated as different identities.

## Variants

| Approach | Token storage | Expiration | UX | Best for |
|----------|--------------|------------|-----|----------|
| Database-backed | SQL table | 15 min | Link click | Standard web apps |
| Signed JWT | Stateless | 5-10 min | Link click | High-scale, short-lived |
| SMS code | In-memory/Redis | 5 min | Code entry | Mobile-first apps |
| Push notification | Stateless | 1 min | Tap approve | Banking, high-security |

## Best practices

- **Send from a dedicated subdomain**: use `auth@login.yourapp.com` or similar. This helps users recognize legitimate emails and allows you to implement DMARC, DKIM, and SPF policies specifically for authentication emails.
- **Include plain text fallback**: always provide a plain-text version of the magic link alongside HTML. Some email clients disable HTML or render it poorly. The link must be clickable or copyable in text form.
- **Invalidate on new request**: if a user requests a second magic link before using the first, invalidate the previous token. This prevents confusion from multiple valid links and limits the attack surface.
- **Log suspicious patterns**: alert when multiple magic link requests target different emails from the same IP address, or when a single email receives dozens of requests in a short window. Both may indicate enumeration attacks.
- **Combine with device trust**: for additional security, require email verification on new devices or browsers. Store a device fingerprint cookie after first successful login and prompt for re-verification on unrecognized devices.

## Common mistakes

- **Allowing token reuse**: a magic link that can be clicked twice is as dangerous as a reusable password. Always mark tokens as consumed on first use and reject subsequent attempts with the same hash.
- **Sending tokens in URL parameters on HTTP**: magic links must use `https://` exclusively. A token sent over HTTP is exposed to network sniffers, DNS poisoning, and man-in-the-middle attacks.
- **Not rate-limiting link requests**: without rate limiting, an attacker can flood a victim's inbox with thousands of login emails, constituting harassment and potentially masking a real attack. Limit to 3-5 requests per email per hour.
- **Storing raw tokens in logs**: never log the full magic link URL. Log only the email address, timestamp, and a success/failure flag. If logs leak, raw tokens grant immediate access.

## FAQ

**Q: Are magic links less secure than passwords?**
A: They have different threat models. Magic links rely on email security; passwords rely on user memory and hashing. For most consumer applications, magic links are as secure or more secure than weak user-chosen passwords, and they eliminate credential stuffing attacks entirely.

**Q: What happens if a user's email is compromised?**
A: The attacker can log in by intercepting magic links. This is equivalent to a password reset flow compromise. Mitigate with device trust, suspicious login alerts, and optional MFA for sensitive actions after login.

**Q: Can I use magic links for mobile apps?**
A: Yes, using deep links or universal links. The magic link opens the app directly via a registered URL scheme (`yourapp://auth/verify?token=...`). Ensure the app validates the token server-side, not just in the client.

**Q: Should I offer both magic links and passwords?**
A: Most modern applications choose one primary method. Offering both creates confusion and increases attack surface. If you need a fallback, use social login (Google, Apple) rather than maintaining a separate password system.

