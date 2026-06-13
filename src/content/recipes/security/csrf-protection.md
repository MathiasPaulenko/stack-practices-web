---
contentType: recipes
slug: csrf-protection
title: "Protect Web Forms Against CSRF Attacks"
description: "How to prevent Cross-Site Request Forgery attacks using synchronizer tokens, SameSite cookies, and double-submit cookie patterns."
metaDescription: "Learn CSRF protection for web forms. Prevent Cross-Site Request Forgery using synchronizer tokens, SameSite cookies, and double-submit cookie patterns."
difficulty: beginner
topics:
  - security
tags:
  - csrf
  - security-headers
  - web-security
  - owasp
  - authentication
  - cookies
  - tokens
relatedResources:
  - /recipes/api-security-headers
  - /recipes/session-management
  - /recipes/xss-prevention
lastUpdated: "2026-06-13"
author: "StackPractices"
seo:
  metaDescription: "Learn CSRF protection for web forms. Prevent Cross-Site Request Forgery using synchronizer tokens, SameSite cookies, and double-submit cookie patterns."
  keywords:
    - csrf protection
    - cross site request forgery
    - synchronizer token
    - samesite cookies
    - web security
    - owasp
---

## Overview

Cross-Site Request Forgery (CSRF) tricks authenticated users into performing unwanted actions on a website they trust. An attacker crafts a malicious link or form that, when clicked by a logged-in user, submits a request to the victim site using the user's existing session cookie. The server sees a legitimate request from an authenticated user and executes the action — changing an email address, transferring funds, or deleting an account — without the user's knowledge.

Unlike XSS, which injects malicious scripts, CSRF exploits the browser's automatic cookie-sending behavior. If `bank.com` has a `POST /transfer` endpoint, an attacker can embed a form on `evil.com` that submits to `bank.com/transfer`. As long as the user has a valid session cookie for `bank.com`, the browser sends it automatically.

## When to Use

Use this recipe when:

- Building any web application with state-changing endpoints (POST, PUT, DELETE, PATCH)
- Implementing user account settings, payment flows, or administrative panels
- Auditing existing applications for CSRF vulnerabilities
- Choosing between synchronizer tokens, double-submit cookies, and SameSite-only protection

## Solution

### Synchronizer Token Pattern (Django/Python)

```python
from django.middleware.csrf import get_token

def render_form(request):
    context = {
        'csrf_token': get_token(request),
    }
    return render(request, 'form.html', context)

# Template
<form method="post" action="/settings/">
    {% csrf_token %}
    <input type="email" name="email" />
    <button type="submit">Update</button>
</form>
```

### Double-Submit Cookie (Node.js/Express)

```javascript
const crypto = require('crypto');

function generateCsrfToken(req, res) {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie('csrfToken', token, { httpOnly: false, sameSite: 'strict' });
  return token;
}

function validateCsrfToken(req, res, next) {
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  if (token !== req.cookies.csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
}
```

### SameSite Cookie (Spring Boot)

```java
@Configuration
public class CookieConfig implements WebMvcConfigurer {
    @Bean
    public CookieSerializer cookieSerializer() {
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        serializer.setSameSite("Strict");
        serializer.setUseSecureCookie(true);
        return serializer;
    }
}
```

## Explanation

- **Synchronizer tokens**: The server generates a random token per session (or per request) and embeds it in every form. The token is stored server-side and validated on submission. Because `evil.com` cannot read the token from `bank.com`'s DOM or cookies, it cannot forge valid requests.
- **Double-submit cookie**: A random token is set as a cookie and also sent in a form field or header. The server verifies both values match. This is stateless — no server-side storage required — but relies on the attacker not being able to read the cookie.
- **SameSite cookies**: Setting `SameSite=Strict` or `Lax` on session cookies prevents the browser from sending them with cross-origin requests. This is the simplest and most robust defense, but not all browsers and scenarios support it perfectly.

## Variants

| Technique | Server Storage | Stateless | Browser Dependency |
|-----------|---------------|-----------|--------------------|
| Synchronizer token | Yes (session) | No | None |
| Double-submit cookie | No | Yes | None |
| SameSite cookie | No | Yes | Modern browsers |
| Custom headers | No | Yes | AJAX only |

## Best Practices

- **Use SameSite=Strict on session cookies**: this alone blocks most CSRF attacks. Combine it with tokens for defense in depth.
- **Rotate CSRF tokens per session, not per request**: per-request tokens break the back button and multi-tab workflows. Per-session tokens are secure and usable.
- **Validate tokens for all state-changing methods**: check CSRF protection on POST, PUT, PATCH, and DELETE. Safe methods (GET, HEAD) should not change state anyway.
- **Include tokens in AJAX headers**: for SPAs, read the token from a meta tag or cookie and send it as a custom header (`X-CSRF-Token`).
- **Reject missing tokens with 403**: do not silently ignore missing tokens. A 403 response signals a misconfiguration or attack attempt.

## Common Mistakes

- **Relying solely on SameSite without tokens**: older browsers and certain cross-site navigation patterns may not enforce SameSite. Tokens provide a fallback defense.
- **Not protecting login forms**: login CSRF is real. An attacker can force a victim to log into an attacker-controlled account, enabling subsequent attacks.
- **Using GET for state-changing actions**: `GET /delete-account?id=123` is trivially exploitable via an image tag or link. Always use POST, PUT, DELETE for mutations.
- **Storing tokens in localStorage**: XSS can steal localStorage. Store the server-side token in a hidden form field or a non-HttpOnly cookie (for double-submit pattern).

## Frequently Asked Questions

**Q: Is CSRF still relevant with SameSite cookies?**
A: Yes. SameSite blocks most CSRF but not all scenarios (cross-site GET requests, embedded iframes, API endpoints that accept form data). Defense in depth with tokens is recommended.

**Q: Do APIs need CSRF protection?**
A: APIs that accept form submissions or use cookie authentication need CSRF protection. APIs that use bearer tokens or API keys in headers are generally immune because the attacker cannot forge the header.

**Q: What is login CSRF?**
A: An attacker tricks a victim into logging into a site under the attacker's account. The victim then performs actions (adding payment methods, writing reviews) that benefit the attacker.

**Q: Can I use a static CSRF token for all users?**
A: No. Static tokens are trivial to extract and reuse. Tokens must be unique per user session and unpredictable.

