---
contentType: guides
slug: api-security-checklist-guide
title: "API Security Checklist — Authentication to Encryption"
description: "A thorough security checklist for APIs: authentication, authorization, input validation, rate limiting, encryption, logging, and deployment hardening."
metaDescription: "API security checklist: authentication, authorization, rate limiting, encryption, input validation, logging. Secure REST and GraphQL APIs step by step."
difficulty: intermediate
topics:
  - security
  - api
tags:
  - api
  - api-security
  - authentication
  - authorization
  - encryption
  - guide
  - owasp
  - rate-limiting
  - security
relatedResources:
  - /guides/security/security-best-practices-guide
  - /guides/security/web-application-security-guide
  - /guides/api/rest-api-design-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "API security checklist: authentication, authorization, rate limiting, encryption, input validation, logging. Secure REST and GraphQL APIs step by step."
  keywords:
    - api security checklist
    - secure rest api
    - api authentication
    - api authorization
    - rate limiting api
    - api encryption
---

# API Security Checklist

## Introduction

APIs are the backbone of modern applications — and a primary attack surface. This checklist covers the essential security controls every API should implement, from authentication to deployment hardening.

## 1. Authentication

### Use Strong Token-Based Authentication

```python
# Bad: API keys passed in query strings (logged by proxies)
GET /data?api_key=abc123

# Good: Bearer tokens in Authorization header
GET /data
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Implement JWT Securely

```python
import jwt
from datetime import datetime, timedelta

def create_access_token(user_id, secret, algorithm="HS256"):
    payload = {
        "sub": str(user_id),
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(minutes=15),
        "jti": str(uuid.uuid4())  # unique token ID for revocation
    }
    return jwt.encode(payload, secret, algorithm=algorithm)
```

### Requirements Checklist

- [ ] Use HTTPS everywhere (no HTTP fallback)
- [ ] Tokens expire in **15 minutes or less** (access tokens)
- [ ] Refresh tokens expire in **7-30 days** with rotation
- [ ] Store tokens securely (HttpOnly cookies for browser clients)
- [ ] Reject tokens with weak signatures (none, none256)

## 2. Authorization

### Enforce Least Privilege

```python
# Bad: admin check is missing
def delete_user(user_id):
    db.execute("DELETE FROM users WHERE id = %s", user_id)

# Good: verify authorization before action
def delete_user(requesting_user, target_user_id):
    if not requesting_user.has_role("admin"):
        raise Forbidden("Admin role required")
    if requesting_user.id == target_user_id:
        raise BadRequest("Cannot delete yourself")
    db.execute("DELETE FROM users WHERE id = %s", target_user_id)
```

### Checklist

- [ ] Authenticate **before** authorizing (no auth bypass)
- [ ] Validate resource ownership (user A cannot access user B's data)
- [ ] Role-based access control (RBAC) or attribute-based (ABAC)
- [ ] Deny by default — explicitly allow, don't implicitly trust

## 3. Input Validation

### Validate Everything

```python
from pydantic import BaseModel, Field, validator

class CreateUserRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=254)
    password: str = Field(..., min_length=12, max_length=128)

    @validator("email")
    def validate_email(cls, v):
        if "@" not in v:
            raise ValueError("Invalid email format")
        return v.lower().strip()
```

### Checklist

- [ ] Validate **type, length, format, and range** for every input
- [ ] Reject unexpected fields (strict schema validation)
- [ ] Sanitize [file uploads](/recipes/file-handling/file-upload-validation) (extension, MIME type, size limits)
- [ ] Use [parameterized queries](/recipes/security/sql-injection-prevention) (prevent SQL injection)
- [ ] Encode output to prevent [XSS](/recipes/security/xss-prevention)

## 4. Rate Limiting

### Prevent Abuse

```python
from flask_limiter import Limiter

limiter = Limiter(
    key_func=lambda: request.headers.get("Authorization"),
    default_limits=["100 per minute"]
)

@app.route("/api/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    ...
```

### Checklist

- [ ] Different [limits per endpoint](/recipes/api/rate-limiting) (stricter for auth, looser for read)
- [ ] Per-user and per-IP rate limits
- [ ] Return `429 Too Many Requests` with `Retry-After` header
- [ ] Log and alert on repeated violations

## 5. Encryption

### Data in Transit

- TLS 1.2+ only
- Strong cipher suites (no RC4, DES, MD5)
- HSTS header to prevent downgrade attacks
- Certificate pinning for mobile clients

### Data at Rest

```python
from cryptography.fernet import Fernet

key = Fernet.generate_key()
cipher = Fernet(key)

# Encrypt sensitive fields
encrypted_ssn = cipher.encrypt(b"123-45-6789")
decrypted = cipher.decrypt(encrypted_ssn)
```

### Checklist

- [ ] TLS 1.2+ for all API communication
- [ ] Encrypt sensitive data at rest (PII, credentials, tokens)
- [ ] Hash passwords with bcrypt/Argon2 (never MD5 or SHA1)
- [ ] Secure key management (KMS, HSM, or [vault](/recipes/security/vault-dynamic-credentials) — not in code)

## 6. Error Handling

### Don't Leak Information

```python
# Bad: exposes internal details
except DatabaseError as e:
    return {"error": str(e)}  # reveals schema, query structure

# Good: generic message, log details server-side
except DatabaseError as e:
    logger.error("Database error", exc_info=e, extra={"request_id": request.id})
    return {"error": "Internal server error"}, 500
```

### Checklist

- [ ] Generic error messages to clients
- [ ] Detailed logs server-side (with correlation IDs)
- [ ] Consistent error format (RFC 7807 Problem Details)
- [ ] Don't expose stack traces, file paths, or system info

## 7. Logging and Monitoring

### What to Log

| Event | Data to Log | Data to Avoid |
|-------|-------------|---------------|
| Authentication | Success/failure, timestamp, IP | Passwords, tokens |
| Authorization failures | Resource, action, user | Sensitive payload |
| Rate limit hits | User/IP, endpoint | Full request body |
| Errors | Error type, request ID, endpoint | Stack traces in client logs |

### Checklist

- [ ] Log all authentication attempts (success and failure)
- [ ] Alert on anomalous patterns (unusual IPs, volume spikes)
- [ ] Retain logs for incident investigation (30-90 days)
- [ ] Centralized log aggregation (SIEM or equivalent)

## 8. CORS and Headers

```python
# Strict CORS policy
from flask_cors import CORS

CORS(app, origins=["https://app.example.com"], supports_credentials=True)

# Security headers
@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    response.headers["Strict-Transport-Security"] = "max-age=31536000"
    return response
```

### Checklist

- [ ] Restrict CORS to known origins (no `*` with credentials)
- [ ] Set security headers on all responses
- [ ] Disable server version banners (nginx, Apache, framework)

## 9. Deployment Hardening

- [ ] Run API in isolated network (VPC, private subnets)
- [ ] Use a Web Application Firewall (WAF)
- [ ] Keep dependencies updated (automated vulnerability scanning)
- [ ] Disable unused endpoints and HTTP methods
- [ ] Run with least-privilege OS user (not root)

## Common Mistakes

- Trusting client-side validation (always validate server-side)
- Storing secrets in environment variables without rotation
- Using predictable IDs (`/user/1`, `/user/2`) without authorization checks
- Missing pagination limits (DoS via huge `?limit=999999`)
- CORS set to `*` in production

## Frequently Asked Questions

**Q: Should I use OAuth 2.0 or API keys for my API?**
A: OAuth 2.0 for user-facing APIs with third-party integrations. API keys are fine for server-to-server where the key is kept secret.

**Q: How often should I rotate signing keys?**
A: At least annually, or immediately if compromised. Use key versioning to rotate without downtime.

**Q: Is GraphQL less secure than REST?**
A: Not inherently, but it requires different controls: query depth limits, complexity analysis, and field-level authorization to prevent resource exhaustion.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Scenario: REST API Hardening for Production

```text
System: REST API Node.js, 50 endpoints, 100K users
Goal: Complete API security checklist

API security checklist (40 items):
  Authentication:
  [x] JWT with RS256 (not HS256)
  [x] Token expiry: 15 min access, 7 days refresh
  [x] Refresh token rotation
  [x] MFA for admin endpoints
  [x] Rate limiting on login: 5 attempts -> lock 15 min
  [x] No token in URL
  [x] Logout invalidates token (Redis blacklist)
  [x] Password policy: min 12 chars, complexity

  Authorization:
  [x] RBAC: roles user/admin/super_admin
  [x] Verify ownership on every request (anti-IDOR)
  [x] Scope per resource: user only accesses their data
  [x] Deny by default, allow explicitly
  [x] No auto-increment IDs (use UUID)

  Input:
  [x] Schema validation (Zod) on every endpoint
  [x] Payload size limit (max 1MB)
  [x] String sanitization (no HTML injection)
  [x] Parameterized queries (anti-SQL injection)
  [x] No eval/exec with user input
  [x] File upload: validate type, size, content

  Output:
  [x] No stack traces in prod
  [x] DTO mapping: no internal fields exposed
  [x] Headers: X-Content-Type-Options, X-Frame-Options, CSP, HSTS
  [x] No server/framework version exposed
  [x] Global rate limiting: 100 req/min per user

  Transport:
  [x] TLS 1.3 mandatory (no TLS 1.0/1.1)
  [x] Redirect HTTP -> HTTPS
  [x] HSTS: max-age=31536000; includeSubDomains
  [x] Certificate pinning (mobile apps)

  Configuration:
  [x] CORS: strict origin, no wildcard
  [x] NODE_ENV=production
  [x] Secrets in Secrets Manager (no .env in prod)
  [x] Helmet() configured
  [x] Compression with Brotli (not gzip to avoid BREACH)

  Logging and monitoring:
  [x] Audit log of critical actions
  [x] No logging secrets, passwords, tokens, PII
  [x] Alerts for failed auth attempts
  [x] Alerts for rate limit exceeded
  [x] SIEM integration (ELK + alerting)

  Dependencies:
  [x] npm audit in CI (--audit-level=high)
  [x] Dependabot/Snyk configured
  [x] Lockfile in repo (package-lock.json)
  [x] License check in CI

  CI/CD:
  [x] SAST (semgrep) in pipeline
  [x] DAST (OWASP ZAP) on staging
  [x] Container scan (Trivy) in build
  [x] Secret scan (git-secrets) in pre-commit
  [x] Code review mandatory (1 approver min)

Lessons:
  - 40 items is the minimum for production
  - IDOR is #1: verify ownership always
  - Schema validation on every endpoint, no exceptions
  - Audit log + alerting = early detection
  - SAST + DAST + secret scan in CI is mandatory
```

### How do I prioritize if I have limited time?

Start with authentication (secure JWT + rate limiting), authorization (verify ownership), input validation (Zod on every endpoint), and TLS. These 4 cover 80% of vulnerabilities. Then add headers (helmet), audit log, and dependency scanning. Finally, SAST/DAST in CI. Security is a continuous process, not a one-time project.
