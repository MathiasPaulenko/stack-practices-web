---




contentType: docs
slug: owasp-top-10-remediation-checklist
templateType: guideline
title: "OWASP Top 10 Remediation Checklist"
description: "Checklist for tracking OWASP Top 10 vulnerability remediation per application: risk assessment, fix priority, code-level remediation steps, verification testing, and compliance reporting with examples for each OWASP category."
metaDescription: "OWASP Top 10 remediation checklist: risk assessment, fix priority, code-level fixes, verification testing, compliance reporting for each OWASP category."
difficulty: intermediate
topics:
  - security
tags:
  - owasp
  - security
  - vulnerability
  - remediation
  - compliance
  - web-security
relatedResources:
  - /docs/secrets-rotation-runbook
  - /docs/dependency-vulnerability-triage-template
  - /docs/api-authentication-design-template
  - /docs/penetration-test-remediation-template
  - /docs/security-review-checklist-for-prs
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "OWASP Top 10 remediation checklist: risk assessment, fix priority, code-level fixes, verification testing, compliance reporting for each OWASP category."
  keywords:
    - owasp top 10
    - vulnerability remediation
    - web security
    - security checklist
    - injection prevention
    - xss prevention
    - broken authentication




---

## Overview

This checklist tracks remediation of the OWASP Top 10 security risks for web applications. Each category includes risk assessment criteria, fix priority, code-level remediation steps, and verification testing. Use this checklist during security audits, penetration test follow-ups, and compliance reviews.

---

## 1. A01:2021 — Broken Access Control

### Risk Assessment

```text
Factor              | Value
────────────────────┼──────────────────────────
Likelihood          | High
Impact              | Severe (data breach, privilege escalation)
CVSS range          | 7.5 - 9.8
Fix priority        | P0 — immediate
Common vectors      | Path traversal, IDOR, missing function-level checks
```

### Remediation Checklist

```text
- [ ] Implement deny-by-default access control
- [ ] Enforce server-side authorization on every request
- [ ] Verify ownership before allowing resource access (IDOR check)
- [ ] Use UUIDs instead of sequential IDs for public resources
- [ ] Invalidate session tokens on logout and timeout
- [ ] Implement rate limiting on API endpoints
- [ ] Log all access control failures with user context
- [ ] Disable directory listing on web servers
- [ ] Validate redirect URLs against allowlist
- [ ] Enforce CORS policy with explicit allowed origins
```

### Code Example — Server-Side Authorization

```python
from functools import wraps
from flask import request, g, abort

def require_permission(permission: str):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            user = g.current_user
            if not user or not user.has_permission(permission):
                log_access_denial(user, request.path, permission)
                abort(403)
            return f(*args, **kwargs)
        return wrapped
    return decorator

@app.route('/api/orders/<order_id>', methods=['DELETE'])
@require_permission('orders:delete')
def delete_order(order_id):
    order = Order.query.get(order_id)
    # IDOR check — verify the user owns this resource
    if order.user_id != g.current_user.id and not g.current_user.is_admin:
        abort(403)
    order.delete()
    return '', 204
```

### Verification Testing

```python
# Test: unauthenticated user cannot access protected endpoint
def test_unauthenticated_access_denied(client):
    response = client.delete('/api/orders/123')
    assert response.status_code == 401

# Test: regular user cannot delete another user's order (IDOR)
def test_idor_prevention(client, auth_headers, other_user_order):
    response = client.delete(f'/api/orders/{other_user_order.id}', headers=auth_headers)
    assert response.status_code == 403
```

---

## 2. A02:2021 — Cryptographic Failures

### Risk Assessment

```text
Factor              | Value
────────────────────┼──────────────────────────
Likelihood          | Medium
Impact              | Severe (data exposure)
Fix priority        | P1 — high
Common vectors      | Weak ciphers, plaintext storage, hardcoded keys
```

### Remediation Checklist

```text
- [ ] Encrypt all data in transit (TLS 1.2+ minimum, prefer 1.3)
- [ ] Encrypt sensitive data at rest (AES-256-GCM)
- [ ] Never store passwords in plaintext — use bcrypt/argon2
- [ ] Never hardcode secrets in source code
- [ ] Use a secrets manager (AWS Secrets Manager, HashiCorp Vault)
- [ ] Disable weak TLS versions (SSLv3, TLS 1.0, TLS 1.1)
- [ ] Use HSTS header with preload
- [ ] Hash sensitive data with salt (not just encryption)
- [ ] Rotate encryption keys regularly
- [ ] Disable certificate revocation checking bypass
```

### Code Example — Password Hashing

```python
import argon2

hasher = argon2.PasswordHasher(
    time_cost=3,        # iterations
    memory_cost=65536,  # 64 MB
    parallelism=4,      # threads
    hash_len=32,        # output length
    salt_len=16,        # salt length
)

def hash_password(password: str) -> str:
    return hasher.hash(password)

def verify_password(password: str, hash: str) -> bool:
    try:
        return hasher.verify(hash, password)
    except argon2.exceptions.VerifyMismatchError:
        return False
```

---

## 3. A03:2021 — Injection

### Risk Assessment

```text
Factor              | Value
────────────────────┼──────────────────────────
Likelihood          | High
Impact              | Severe (data exfiltration, RCE)
Fix priority        | P0 — immediate
Common vectors      | SQL injection, NoSQL injection, command injection, LDAP
```

### Remediation Checklist

```text
- [ ] Use parameterized queries / prepared statements everywhere
- [ ] Use ORM with parameterized queries (never string concatenation)
- [ ] Validate and sanitize all user input (allowlist, not blocklist)
- [ ] Use LIMIT and OFFSET to prevent full table dumps
- [ ] Escape special characters in dynamic SQL (last resort)
- [ ] Use shell=False for subprocess calls (never shell=True)
- [ ] Validate file paths against traversal (../) attacks
- [ ] Use stored procedures with parameter binding
- [ ] Implement input length limits
- [ ] Log and alert on SQL syntax errors in production
```

### Code Example — Parameterized Queries

```python
# BAD: SQL injection vulnerability
def get_user_bad(username):
    query = f"SELECT * FROM users WHERE username = '{username}'"
    return db.execute(query)

# GOOD: parameterized query
def get_user_safe(username):
    query = "SELECT * FROM users WHERE username = %s"
    return db.execute(query, (username,))

# GOOD: ORM with parameterized queries
def get_user_orm(username):
    return User.query.filter_by(username=username).first()
```

---

## 4. A04:2021 — Insecure Design

### Risk Assessment

```text
Factor              | Value
────────────────────┼──────────────────────────
Likelihood          | Medium
Impact              | High
Fix priority        | P1 — high
Common vectors      | Missing threat modeling, no rate limiting, no abuse cases
```

### Remediation Checklist

```text
- [ ] Conduct threat modeling for new features (STRIDE methodology)
- [ ] Implement rate limiting on all public endpoints
- [ ] Design for failure — graceful degradation, circuit breakers
- [ ] Implement separation of concerns between tenant data
- [ ] Use capability-based security (least privilege by default)
- [ ] Define abuse cases and test against them
- [ ] Implement CAPTCHA for high-risk actions (signup, password reset)
- [ ] Design audit trails for all state-changing operations
- [ ] Use secure defaults (secure-by-default configuration)
- [ ] Conduct security design reviews before implementation
```

---

## 5. A05:2021 — Security Misconfiguration

### Risk Assessment

```text
Factor              | Value
────────────────────┼──────────────────────────
Likelihood          | High
Impact              | High
Fix priority        | P1 — high
Common vectors      | Default credentials, verbose errors, open S3 buckets
```

### Remediation Checklist

```text
- [ ] Remove default credentials and change all default passwords
- [ ] Disable debug mode and verbose error messages in production
- [ ] Remove unused features, endpoints, and dependencies
- [ ] Set security headers (CSP, X-Frame-Options, X-Content-Type-Options)
- [ ] Disable directory browsing and auto-indexing
- [ ] Configure CORS with explicit allowed origins (never *)
- [ ] Patch and update all components regularly
- [ ] Secure cloud storage (no public S3 buckets, proper IAM)
- [ ] Use environment-specific configuration (dev/staging/prod)
- [ ] Run automated configuration scanners (Scout Suite, Prowler)
```

### Code Example — Security Headers

```python
# Flask security headers
@app.after_request
def set_security_headers(response):
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'"
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response
```

---

## 6. A06:2021 — Vulnerable and Outdated Components

### Risk Assessment

```text
Factor              | Value
────────────────────┼──────────────────────────
Likelihood          | High
Impact              | High to Severe
Fix priority        | P1 — high
Common vectors      | Known CVEs in dependencies, outdated frameworks
```

### Remediation Checklist

```text
- [ ] Inventory all dependencies (SBOM — Software Bill of Materials)
- [ ] Run dependency scanning in CI (Snyk, Dependabot, OWASP Dependency-Check)
- [ ] Remove unused dependencies
- [ ] Pin dependency versions (no wildcards)
- [ ] Subscribe to security advisories for critical dependencies
- [ ] Update dependencies within 30 days of patch release
- [ ] Review transitive dependencies for known vulnerabilities
- [ ] Use only trusted package registries
- [ ] Verify package integrity (checksums, signatures)
- [ ] Monitor for end-of-life announcements
```

---

## 7. A07:2021 — Identification and Authentication Failures

### Remediation Checklist

```text
- [ ] Implement MFA for all user accounts
- [ ] Enforce strong password policy (min 12 chars, no common passwords)
- [ ] Use secure session management (random, long, unpredictable tokens)
- [ ] Implement account lockout after failed attempts (5 tries, 15 min)
- [ ] Use bcrypt/argon2 for password hashing
- [ ] Implement secure password reset flow (token-based, time-limited)
- [ ] Rotate session tokens after login
- [ ] Set session timeout (30 min idle, 8 hours absolute)
- [ ] Prevent session fixation (regenerate session ID on auth)
- [ ] Log all authentication events (login, logout, failed attempts)
```

---

## 8. A08:2021 — Software and Data Integrity Failures

### Remediation Checklist

```text
- [ ] Verify integrity of CI/CD pipeline (signed commits, protected branches)
- [ ] Use signed packages and verify signatures on install
- [ ] Implement subresource integrity (SRI) for external scripts
- [ ] Validate serialized data before deserialization
- [ ] Use code signing for mobile and desktop applications
- [ ] Verify webhook signatures before processing
- [ ] Use immutable container images (signed and verified)
- [ ] Implement supply chain security (Sigstore, SLSA framework)
```

---

## 9. A09:2021 — Security Logging and Monitoring Failures

### Remediation Checklist

```text
- [ ] Log all security events (login, access control, input validation)
- [ ] Send logs to centralized logging system (ELK, Splunk, Datadog)
- [ ] Set up alerts for suspicious activity (brute force, privilege escalation)
- [ ] Implement audit trail for all state-changing operations
- [ ] Ensure logs contain user ID, timestamp, source IP, action
- [ ] Protect logs from tampering (append-only, WORM storage)
- [ ] Set log retention policy (minimum 90 days for security logs)
- [ ] Monitor for log injection attacks (sanitize log input)
- [ ] Implement incident response plan with defined escalation
- [ ] Conduct regular log review (weekly automated, monthly manual)
```

---

## 10. A10:2021 — Server-Side Request Forgery (SSRF)

### Remediation Checklist

```text
- [ ] Validate and sanitize all user-supplied URLs
- [ ] Use allowlist for permitted domains and IP ranges
- [ ] Block requests to internal IP ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x)
- [ ] Block requests to localhost and link-local addresses
- [ ] Disable HTTP redirects on server-side requests
- [ ] Use a separate network segment for outbound requests
- [ ] Implement DNS pinning to prevent DNS rebinding attacks
- [ ] Log all outbound requests with destination and user context
- [ ] Use a dedicated egress proxy with filtering
- [ ] Test with SSRF payloads (169.254.169.254, localhost, file://)
```

### Code Example — SSRF Prevention

```python
import ipaddress
import socket
from urllib.parse import urlparse

BLOCKED_RANGES = [
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),
    ipaddress.ip_network('192.168.0.0/16'),
    ipaddress.ip_network('169.254.0.0/16'),
    ipaddress.ip_network('127.0.0.0/8'),
    ipaddress.ip_network('0.0.0.0/8'),
]

ALLOWED_SCHEMES = {'http', 'https'}

def validate_url(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in ALLOWED_SCHEMES:
        return False

    hostname = parsed.hostname
    if not hostname:
        return False

    try:
        # Resolve hostname and check against blocked ranges
        ip = socket.gethostbyname(hostname)
        ip_addr = ipaddress.ip_address(ip)
        for blocked in BLOCKED_RANGES:
            if ip_addr in blocked:
                return False
    except socket.gaierror:
        return False

    return True
```

## FAQ

### How often should I run through this checklist?

Run the full checklist at least quarterly for production applications. Run it after any major feature release, architecture change, or new dependency addition. Run individual sections when a related vulnerability is discovered (e.g., run A03 after a SQL injection finding). Integrate the checklist into your security sprint — assign each category to a team member and track progress in your issue tracker.

### What is the difference between OWASP Top 10 and ASVS?

The OWASP Top 10 lists the most critical security risks — it is awareness-level guidance. The Application Security Verification Standard (ASVS) is a detailed verification standard with three levels of security requirements. ASVS goes deeper into specific controls for each risk area. Use the Top 10 for prioritization and awareness. Use ASVS for detailed implementation and verification. ASVS Level 1 maps roughly to the Top 10, while Level 2 and 3 go beyond.

### How do I prioritize fixes when everything is P0?

Start with the risk that has the highest likelihood of exploitation and the highest impact. Injection (A03) and Broken Access Control (A01) are typically P0 because they lead directly to data breaches. Within each category, fix internet-facing endpoints first, then internal endpoints. Fix authentication issues next (A07), then configuration issues (A05). Use CVSS scores to break ties — higher CVSS first. If two items have the same CVSS, fix the one with more affected users.

### Should I use SAST, DAST, or IAST for verification?

Use all three. SAST (Static Analysis) catches issues at code level before deployment — run it in CI on every pull request. DAST (Dynamic Analysis) tests the running application from outside — run it weekly against staging. IAST (Interactive Analysis) combines both by instrumenting the running app — use it in QA and staging environments. SAST finds the most issues early but has false positives. DAST finds real exploitable issues but misses code-level problems. IAST has the best accuracy but requires runtime instrumentation.

### What tools should I use for automated scanning?

For dependency scanning: Dependabot (GitHub), Snyk, or OWASP Dependency-Check. For SAST: SonarQube, Semgrep, or CodeQL. For DAST: OWASP ZAP or Burp Suite. For infrastructure scanning: Scout Suite (AWS), Prowler (AWS), or Trivy (containers). For secrets scanning: GitLeaks or TruffleHog. Integrate all into CI/CD with quality gates that block deployment on critical findings. Run infrastructure scans daily and review results weekly.

## See Also

- [Complete Guide to OWASP Top 10 2025](/guides/complete-guide-owasp-top-10-2025/)
- [Penetration Test Remediation Template](/docs/penetration-test-remediation-template/)
- [Security Best Practices Guide](/guides/security-best-practices-guide/)
- [Implement Encryption at Rest for Databases and File Storage](/recipes/encryption-at-rest/)
- [API Security Checklist — Authentication to Encryption](/guides/api-security-checklist-guide/)

