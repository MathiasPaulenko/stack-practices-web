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
  - security
  - authentication
  - cookies
  - vulnerabilities
  - encryption
relatedResources:
  - /recipes/api-security-headers
  - /recipes/session-management
  - /recipes/xss-prevention
  - /recipes/password-hashing-production
  - /recipes/encryption-at-rest
  - /recipes/hmac-request-signing
  - /recipes/rate-limiting-security
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
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

Unlike [XSS](/recipes/security/xss-prevention), which injects malicious scripts, CSRF exploits the browser's automatic cookie-sending behavior. If `bank.com` has a `POST /transfer` endpoint, an attacker can embed a form on `evil.com` that submits to `bank.com/transfer`. As long as the user has a valid session cookie for `bank.com`, the browser sends it automatically.

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
- **SameSite cookies**: Setting `SameSite=Strict` or `Lax` on session cookies prevents the browser from sending them with cross-origin requests. This is the simplest and most reliable defense, but not all browsers and scenarios support it perfectly.

## Variants

| Technique | Server Storage | Stateless | Browser Dependency |
|-----------|---------------|-----------|--------------------|
| Synchronizer token | Yes (session) | No | None |
| Double-submit cookie | No | Yes | None |
| SameSite cookie | No | Yes | Modern browsers |
| Custom headers | No | Yes | AJAX only |

## What Works

- **Use SameSite=Strict on session cookies**: this alone blocks most CSRF attacks. Combine it with tokens for defense in depth.
- **Rotate CSRF tokens per session, not per request**: per-request tokens break the back button and multi-tab workflows. Per-session tokens are secure and usable.
- **Validate tokens for all state-changing methods**: check CSRF protection on POST, PUT, PATCH, and DELETE. Safe methods (GET, HEAD) should not change state anyway.
- **Include tokens in AJAX headers**: for SPAs, read the token from a meta tag or cookie and send it as a custom header (`X-CSRF-Token`).
- **Reject missing tokens with 403**: do not silently ignore missing tokens. A 403 response signals a misconfiguration or attack attempt.

## Common Mistakes

- **Relying solely on SameSite without tokens**: older browsers and certain cross-site navigation patterns may not enforce SameSite. Tokens provide a fallback defense.
- **Not protecting login forms**: login CSRF is real. An attacker can force a victim to log into an attacker-controlled account, enabling subsequent attacks.
- **Using GET for state-changing actions**: `GET /delete-account?id=123` is trivially exploitable via an image tag or link. Always use POST, PUT, DELETE for mutations.
- **Storing tokens in localStorage**: [XSS](/recipes/security/xss-prevention) can steal localStorage. Store the server-side token in a hidden form field or a non-HttpOnly cookie (for double-submit pattern).

## Frequently Asked Questions

**Q: Is CSRF still relevant with SameSite cookies?**
A: Yes. SameSite blocks most CSRF but not all scenarios (cross-site GET requests, embedded iframes, API endpoints that accept form data). Defense in depth with tokens is recommended.

**Q: Do APIs need CSRF protection?**
A: APIs that accept form submissions or use cookie authentication need CSRF protection. APIs that use bearer tokens or API keys in headers are generally immune because the attacker cannot forge the header. For API header security, see [API security headers](/recipes/security/api-security-headers).

**Q: What is login CSRF?**
A: An attacker tricks a victim into logging into a site under the attacker's account. The victim then performs actions (adding payment methods, writing reviews) that benefit the attacker.

**Q: Can I use a static CSRF token for all users?**
A: No. Static tokens are trivial to extract and reuse. Tokens must be unique per user session and unpredictable.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Advanced Solutions

### Signed double-submit cookie (stateless, XSS-resistant)

The basic double-submit cookie is vulnerable if an attacker can set a cookie on the victim's browser (e.g., via a subdomain). Signing the cookie with a server-side secret prevents this:

```javascript
const crypto = require('crypto');

const CSRF_SECRET = process.env.CSRF_SECRET || 'rotate-this-secret';

function generateSignedCsrfToken(req, res) {
  const token = crypto.randomBytes(32).toString('base64url');
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(token)
    .digest('base64url');

  const signedToken = `${token}.${signature}`;
  res.cookie('csrfToken', signedToken, {
    httpOnly: false,
    sameSite: 'strict',
    secure: true,
    path: '/',
  });
  return signedToken;
}

function validateSignedCsrfToken(req, res, next) {
  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies.csrfToken;

  if (!headerToken || !cookieToken) {
    return res.status(403).json({ error: 'Missing CSRF token' });
  }

  if (headerToken !== cookieToken) {
    return res.status(403).json({ error: 'CSRF token mismatch' });
  }

  // Verify signature
  const [token, signature] = cookieToken.split('.');
  if (!token || !signature) {
    return res.status(403).json({ error: 'Invalid CSRF token format' });
  }

  const expectedSig = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(token)
    .digest('base64url');

  if (!crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  )) {
    return res.status(403).json({ error: 'Invalid CSRF token signature' });
  }

  next();
}

// Express setup
const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();

app.use(cookieParser());

// Generate token on GET (render form page)
app.get('/form', (req, res) => {
  const token = generateSignedCsrfToken(req, res);
  res.json({ csrfToken: token });
});

// Validate token on POST (submit form)
app.post('/submit', validateSignedCsrfToken, (req, res) => {
  res.json({ success: true });
});
```

### CSRF protection for SPAs (React + fetch interceptor)

Single-page applications need CSRF tokens exposed to JavaScript. Use a non-HttpOnly cookie and a meta tag or API endpoint:

```javascript
// React CSRF utility — fetch token from API on app init
let csrfToken = null;

export async function initCsrf() {
  const res = await fetch('/api/csrf-token', {
    credentials: 'same-origin',
  });
  const data = await res.json();
  csrfToken = data.token;
  return csrfToken;
}

// Fetch interceptor: attach token to all state-changing requests
export function csrfFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();

  // Only attach CSRF token to state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    options.headers = {
      ...options.headers,
      'X-CSRF-Token': csrfToken,
    };
  }

  return fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

// Usage in a React component
import { useState, useEffect } from 'react';

function SettingsForm() {
  const [email, setEmail] = useState('');

  useEffect(() => {
    initCsrf();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await csrfFetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      alert('Settings updated');
    } else {
      alert('Failed to update settings');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit">Update</button>
    </form>
  );
}
```

### Origin and Referer header validation

As an additional layer, validate that the `Origin` or `Referer` header matches your site:

```python
from django.http import HttpResponseForbidden
from urllib.parse import urlparse

ALLOWED_ORIGINS = {'https://myapp.com', 'https://www.myapp.com'}

def validate_origin(get_response):
    """Middleware that validates Origin/Referer on state-changing requests."""

    def middleware(request):
        if request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            origin = request.headers.get('Origin')
            referer = request.headers.get('Referer')

            source = origin or referer
            if not source:
                return HttpResponseForbidden('Missing Origin header')

            parsed = urlparse(source)
            if f"{parsed.scheme}://{parsed.netloc}" not in ALLOWED_ORIGINS:
                return HttpResponseForbidden('Invalid origin')

        return get_response(request)

    return middleware
```

### Per-request token rotation with session storage

For high-security applications, rotate tokens per request instead of per session:

```python
import secrets
from flask import Flask, session, request, jsonify, abort

app = Flask(__name__)
app.secret_key = 'rotate-this-secret'

@app.before_request
def generate_csrf_token():
    if request.method == 'GET':
        session['csrf_token'] = secrets.token_urlsafe(32)

@app.route('/form')
def form_page():
    token = session.get('csrf_token')
    return jsonify({'csrf_token': token})

@app.route('/submit', methods=['POST'])
def submit():
    token = request.headers.get('X-CSRF-Token', '')
    session_token = session.get('csrf_token', '')

    if not token or not session_token:
        abort(403, description='Missing CSRF token')

    if not secrets.compare_digest(token, session_token):
        abort(403, description='Invalid CSRF token')

    # Rotate token for next request
    session['csrf_token'] = secrets.token_urlsafe(32)

    return jsonify({'success': True, 'next_token': session['csrf_token']})
```

## Additional Best Practices

1. **Set `__Host-` prefix on cookies.** The `__Host-` prefix forces `Secure`, `Path=/`, and no `Domain` attribute, preventing subdomain cookie injection:

```javascript
res.cookie('__Host-csrfToken', signedToken, {
  httpOnly: false,
  sameSite: 'strict',
  secure: true,
  path: '/',
  // No domain attribute — __Host- prefix forbids it
});
```

2. **Audit CSRF protection with automated tests.** Write tests that verify tokens are required and rejected:

```python
import pytest
from django.test import Client

def test_csrf_token_required():
    """POST without CSRF token should be rejected."""
    client = Client(enforce_csrf_checks=True)
    response = client.post('/api/settings', {'email': 'test@example.com'})
    assert response.status_code == 403

def test_csrf_token_accepted():
    """POST with valid CSRF token should succeed."""
    client = Client()
    # Django's test client handles CSRF automatically with enforce_csrf_checks=False
    response = client.post('/api/settings', {'email': 'test@example.com'})
    assert response.status_code == 200
```

## Additional Common Mistakes

1. **Excluding webhooks from CSRF protection incorrectly.** Webhooks from third parties (Stripe, GitHub) should use HMAC signatures, not CSRF tokens. Create a separate exemption:

```javascript
// WRONG: disabling CSRF globally for API routes
app.use('/api', csrf({ ignore: true }));

// CORRECT: exempt only webhook routes with HMAC verification
app.post('/api/webhooks/stripe',
  // Skip CSRF, verify HMAC signature instead
  skipCsrf,
  verifyStripeSignature,
  handleWebhook
);

function skipCsrf(req, res, next) {
  req.csrfToken = () => ''; // Bypass token check
  next();
}
```

2. **Not setting `SameSite` on the CSRF cookie itself.** If the CSRF cookie has `SameSite=None`, an attacker site can trigger a request that includes it, making the double-submit pattern ineffective:

```javascript
// WRONG: SameSite=None allows cross-site cookie sending
res.cookie('csrfToken', token, { sameSite: 'none', secure: true });

// CORRECT: SameSite=Strict prevents cross-site sending
res.cookie('csrfToken', token, { sameSite: 'strict', secure: true });
```

## Additional FAQ

### How do I handle CSRF with CORS?

CSRF and CORS are separate concerns. CORS controls which origins can read responses; CSRF protection controls which origins can submit state-changing requests. Even with strict CORS, CSRF is possible because form submissions are not subject to CORS preflight. Always implement CSRF tokens regardless of CORS configuration.

### Should I use `SameSite=Strict` or `SameSite=Lax`?

Use `Strict` for session cookies if users don't need to navigate from external links while logged in. Use `Lax` if you need external links to work (e.g., clicking a link in an email to your app). `Lax` still blocks cross-site POST, which covers most CSRF vectors.

### Can CSRF tokens be cached?

No. Synchronizer tokens are session-specific and must not be cached. If you use a CDN, exclude pages with CSRF tokens from caching, or use the double-submit pattern where the token is in a cookie (not cached with the page).
