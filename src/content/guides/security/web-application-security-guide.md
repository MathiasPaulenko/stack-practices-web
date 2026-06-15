---
contentType: guides
slug: web-application-security-guide
title: "Web Application Security (OWASP Top 10)"
description: "A developer-focused guide to the OWASP Top 10: injection, broken access control, XSS, insecure design, and how to prevent each vulnerability with code examples."
metaDescription: "OWASP Top 10 security guide for developers. Prevent injection, XSS, broken access control, insecure design with practical code examples and checklists."
difficulty: intermediate
topics:
  - security
  - api
tags:
  - owasp-top-10
  - web-security
  - xss
  - injection
  - access-control
  - guide
relatedResources:
  - /guides/security/api-security-checklist-guide
  - /guides/security/security-best-practices-guide
  - /recipes/authentication/jwt-authentication
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "OWASP Top 10 security guide for developers. Prevent injection, XSS, broken access control, insecure design with practical code examples and checklists."
  keywords:
    - owasp top 10
    - web application security
    - prevent xss
    - sql injection prevention
    - broken access control
    - secure coding
---

# Web Application Security (OWASP Top 10)

## Introduction

The OWASP Top 10 is a standard awareness document for web application security risks. This guide translates each risk into practical prevention techniques with code examples.

## 1. Broken Access Control

**Risk:** Users access resources or perform actions outside their permissions.

### Prevention

```python
# Bad: trusting a client-provided user ID
@app.route("/api/orders/<order_id>")
def get_order(order_id):
    order = db.query(f"SELECT * FROM orders WHERE id = {order_id}")
    return jsonify(order)  # any user can see any order!

# Good: verify the authenticated user owns the resource
@app.route("/api/orders/<order_id>")
@login_required
def get_order(order_id):
    order = Order.query.filter_by(
        id=order_id,
        user_id=current_user.id  # enforce ownership
    ).first_or_404()
    return jsonify(order.to_dict())
```

### Checklist

- [ ] Deny by default — return 403 unless explicitly allowed
- [ ] Validate resource ownership on every request
- [ ] Disable directory listing and server-side path traversal
- [ ] Rate limit API access to prevent automated enumeration

## 2. Cryptographic Failures

**Risk:** Sensitive data is exposed through weak or missing encryption.

### Prevention

```python
# Bad: plaintext storage
user = {"ssn": "123-45-6789", "password": "abc123"}

# Good: hash passwords, encrypt PII
from bcrypt import hashpw, gensalt
from cryptography.fernet import Fernet

hashed_password = hashpw("user_password".encode(), gensalt())

cipher = Fernet(ENCRYPTION_KEY)
encrypted_ssn = cipher.encrypt("123-45-6789".encode())
```

### Checklist

- [ ] Hash passwords with bcrypt, Argon2, or PBKDF2
- [ ] Encrypt sensitive data at rest (PII, health data, financial data)
- [ ] Use TLS 1.2+ for all data in transit
- [ ] Don't cache sensitive data in client storage (localStorage for tokens)

## 3. Injection

**Risk:** Untrusted data is sent to an interpreter as part of a command or query.

### SQL Injection Prevention

```python
# Bad: string interpolation
query = f"SELECT * FROM users WHERE name = '{user_input}'"

# Good: parameterized queries
cursor.execute("SELECT * FROM users WHERE name = %s", (user_input,))
```

### Command Injection Prevention

```python
# Bad
os.system(f"convert {user_filename} output.png")

# Good: validate and whitelist
import subprocess
allowed_extensions = {".png", ".jpg", ".jpeg"}
if not any(user_filename.endswith(ext) for ext in allowed_extensions):
    raise ValueError("Invalid file type")
subprocess.run(["convert", user_filename, "output.png"], check=True)
```

### Checklist

- [ ] Use parameterized queries for all database access
- [ ] Escape special characters in LDAP, XML, and OS commands
- [ ] Validate and whitelist user input before using it in commands

## 4. Insecure Design

**Risk:** Missing or ineffective security controls in the application architecture.

### Prevention

- Design with threat modeling from the start
- Validate business logic, not just syntax
- Implement anti-automation for sensitive flows (signup, password reset)
- Maintain a secure development lifecycle

```python
# Anti-automation on password reset
def request_password_reset(email):
    if rate_limiter.is_limited(f"reset:{email}"):
        raise TooManyRequests("Try again later")
    send_reset_email(email)
    rate_limiter.increment(f"reset:{email}")
```

## 5. Security Misconfiguration

**Risk:** Incomplete or ad-hoc configurations, default accounts, unnecessary features.

### Prevention Checklist

- [ ] Remove default accounts and credentials
- [ ] Disable unnecessary features, ports, and HTTP methods
- [ ] Send security headers (HSTS, X-Frame-Options, CSP)
- [ ] Keep all frameworks, libraries, and OS patches current
- [ ] Run in minimal privilege mode (not root)

## 6. Vulnerable and Outdated Components

**Risk:** Using components with known vulnerabilities.

### Prevention

```bash
# Scan dependencies for known CVEs
npm audit
pip-audit
snyk test

# Pin versions and automate updates
# package.json
"dependencies": {
  "express": "4.19.2"  // exact version, not ^4.0.0
}
```

### Checklist

- [ ] Maintain a software bill of materials (SBOM)
- [ ] Subscribe to security advisories for critical dependencies
- [ ] Remove unused dependencies (reduces attack surface)
- [ ] Test updates in staging before production

## 7. Identification and Authentication Failures

**Risk:** Authentication weaknesses allow credential stuffing, brute force, or session hijacking.

### Prevention

```python
# Multi-factor authentication
@app.route("/login", methods=["POST"])
def login():
    user = authenticate(request.json)
    if not user:
        # Generic error to prevent user enumeration
        raise Unauthorized("Invalid credentials")

    if user.mfa_enabled:
        session["pending_user_id"] = user.id
        return {"mfa_required": True}

    create_session(user)
    return {"token": generate_jwt(user)}
```

### Checklist

- [ ] Implement multi-factor authentication (MFA)
- [ ] Enforce strong password policies (length > 12)
- [ ] Rate limit login attempts
- [ ] Use secure session tokens (random, long, HttpOnly cookies)
- [ ] Invalidate sessions on password change

## 8. Software and Data Integrity Failures

**Risk:** Insecure deserialization, untrusted CI/CD pipelines, auto-updates without verification.

### Prevention

```python
# Bad: deserializing untrusted data with pickle
import pickle
data = pickle.loads(user_input)  # arbitrary code execution!

# Good: use JSON with schema validation
import json
from marshmallow import Schema, fields

data = json.loads(user_input)
schema = UserSchema()
result = schema.load(data)  # validates structure
```

### Checklist

- [ ] Sign and verify serialized data integrity
- [ ] Verify CI/CD pipeline integrity (signed commits, immutable tags)
- [ ] Don't auto-update without cryptographic verification

## 9. Security Logging and Monitoring Failures

**Risk:** Insufficient logging allows attackers to remain undetected.

### Prevention

```python
import logging
import structlog

logger = structlog.get_logger()

# Log security events with context
logger.info(
    "user_login",
    user_id=user.id,
    ip_address=request.remote_addr,
    user_agent=request.headers.get("User-Agent"),
    success=True
)
```

### Checklist

- [ ] Log all authentication events (success and failure)
- [ ] Log access control failures
- [ ] Log input validation errors
- [ ] Send alerts on suspicious patterns
- [ ] Ensure logs are tamper-resistant (append-only, centralized)

## 10. Server-Side Request Forgery (SSRF)

**Risk:** The server makes requests to unintended destinations based on user input.

### Prevention

```python
# Bad: user controls the URL
url = request.json.get("webhook_url")
requests.post(url, data=sensitive_data)

# Good: validate URL against allowlist
from urllib.parse import urlparse

ALLOWED_HOSTS = {"api.example.com", "hooks.slack.com"}

def safe_webhook_call(user_url, data):
    parsed = urlparse(user_url)
    if parsed.hostname not in ALLOWED_HOSTS:
        raise ValueError("URL not in allowlist")
    return requests.post(user_url, json=data)
```

### Checklist

- [ ] Validate and whitelist outgoing request destinations
- [ ] Disable URL schemas you don't need (file://, ftp://, gopher://)
- [ ] Use internal DNS resolvers that don't expose internal services

## Common Mistakes

- Thinking security is "done" after a single audit — it requires continuous effort
- Trusting user input for URL construction or file paths
- Storing secrets in source code or logs
- Ignoring security headers because "they're just headers"
- Not logging authentication failures (missed brute-force detection)

## Frequently Asked Questions

**Q: Should I fix all OWASP Top 10 items before shipping?**
A: Address critical items (Access Control, Injection, Cryptographic Failures) before launch. Others can be phased in based on risk assessment.

**Q: How often should I review the OWASP Top 10?**
A: The list updates every 3-4 years, but threats evolve continuously. Review your security posture quarterly.

**Q: Is the OWASP Top 10 enough for compliance?**
A: It's a starting point, not a complete security program. Add threat modeling, penetration testing, and secure coding training.
