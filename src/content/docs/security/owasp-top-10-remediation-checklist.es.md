---
contentType: docs
slug: owasp-top-10-remediation-checklist
templateType: guideline
title: "Checklist de Remediacion OWASP Top 10"
description: "Checklist para trackear remediacion de OWASP Top 10 vulnerabilities per application: risk assessment, fix priority, code-level remediation steps, verification testing y compliance reporting con ejemplos para cada OWASP category."
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
  - /docs/security/secrets-rotation-runbook
  - /docs/security/dependency-vulnerability-triage-template
  - /docs/security/api-authentication-design-template
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

Este checklist trackea remediacion de las OWASP Top 10 security risks para web applications. Cada category incluye risk assessment criteria, fix priority, code-level remediation steps y verification testing. Usa este checklist durante security audits, penetration test follow-ups y compliance reviews.

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
- [ ] Implementa deny-by-default access control
- [ ] Enforcea server-side authorization en every request
- [ ] Verifica ownership antes de allowear resource access (IDOR check)
- [ ] Usa UUIDs en vez de sequential IDs para public resources
- [ ] Invalida session tokens en logout y timeout
- [ ] Implementa rate limiting en API endpoints
- [ ] Loggea all access control failures con user context
- [ ] Disablea directory listing en web servers
- [ ] Valida redirect URLs contra allowlist
- [ ] Enforcea CORS policy con explicit allowed origins
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
    # IDOR check — verifica que el user owna este resource
    if order.user_id != g.current_user.id and not g.current_user.is_admin:
        abort(403)
    order.delete()
    return '', 204
```

### Verification Testing

```python
# Test: unauthenticated user no puede acceder protected endpoint
def test_unauthenticated_access_denied(client):
    response = client.delete('/api/orders/123')
    assert response.status_code == 401

# Test: regular user no puede deletear otro user's order (IDOR)
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
- [ ] Encripta all data in transit (TLS 1.2+ minimum, prefer 1.3)
- [ ] Encripta sensitive data at rest (AES-256-GCM)
- [ ] Nunca storees passwords en plaintext — usa bcrypt/argon2
- [ ] Nunca harcodees secrets en source code
- [ ] Usa un secrets manager (AWS Secrets Manager, HashiCorp Vault)
- [ ] Disablea weak TLS versions (SSLv3, TLS 1.0, TLS 1.1)
- [ ] Usa HSTS header con preload
- [ ] Hashea sensitive data con salt (no solo encryption)
- [ ] Rotea encryption keys regularmente
- [ ] Disablea certificate revocation checking bypass
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
- [ ] Usa parameterized queries / prepared statements everywhere
- [ ] Usa ORM con parameterized queries (nunca string concatenation)
- [ ] Valida y sanitizea all user input (allowlist, no blocklist)
- [ ] Usa LIMIT y OFFSET para prevenir full table dumps
- [ ] Escapea special characters en dynamic SQL (last resort)
- [ ] Usa shell=False para subprocess calls (nunca shell=True)
- [ ] Valida file paths contra traversal (../) attacks
- [ ] Usa stored procedures con parameter binding
- [ ] Implementa input length limits
- [ ] Loggea y alerta en SQL syntax errors en production
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

# GOOD: ORM con parameterized queries
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
- [ ] Conducta threat modeling para new features (STRIDE methodology)
- [ ] Implementa rate limiting en all public endpoints
- [ ] Designa para failure — graceful degradation, circuit breakers
- [ ] Implementa separation of concerns entre tenant data
- [ ] Usa capability-based security (least privilege by default)
- [ ] Define abuse cases y testea contra ellos
- [ ] Implementa CAPTCHA para high-risk actions (signup, password reset)
- [ ] Designa audit trails para all state-changing operations
- [ ] Usa secure defaults (secure-by-default configuration)
- [ ] Conducta security design reviews antes de implementation
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
- [ ] Removea default credentials y changea all default passwords
- [ ] Disablea debug mode y verbose error messages en production
- [ ] Removea unused features, endpoints y dependencies
- [ ] Setea security headers (CSP, X-Frame-Options, X-Content-Type-Options)
- [ ] Disablea directory browsing y auto-indexing
- [ ] Configura CORS con explicit allowed origins (nunca *)
- [ ] Patchea y updatea all components regularmente
- [ ] Securea cloud storage (no public S3 buckets, proper IAM)
- [ ] Usa environment-specific configuration (dev/staging/prod)
- [ ] Corre automated configuration scanners (Scout Suite, Prowler)
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
Common vectors      | Known CVEs en dependencies, outdated frameworks
```

### Remediation Checklist

```text
- [ ] Inventory all dependencies (SBOM — Software Bill of Materials)
- [ ] Corre dependency scanning en CI (Snyk, Dependabot, OWASP Dependency-Check)
- [ ] Removea unused dependencies
- [ ] Pinea dependency versions (no wildcards)
- [ ] Subscribete a security advisories para critical dependencies
- [ ] Updatea dependencies dentro de 30 days de patch release
- [ ] Reviewa transitive dependencies para known vulnerabilities
- [ ] Usa solo trusted package registries
- [ ] Verifica package integrity (checksums, signatures)
- [ ] Monitora para end-of-life announcements
```

---

## 7. A07:2021 — Identification and Authentication Failures

### Remediation Checklist

```text
- [ ] Implementa MFA para all user accounts
- [ ] Enforcea strong password policy (min 12 chars, no common passwords)
- [ ] Usa secure session management (random, long, unpredictable tokens)
- [ ] Implementa account lockout despues de failed attempts (5 tries, 15 min)
- [ ] Usa bcrypt/argon2 para password hashing
- [ ] Implementa secure password reset flow (token-based, time-limited)
- [ ] Rotea session tokens despues de login
- [ ] Setea session timeout (30 min idle, 8 hours absolute)
- [ ] Previene session fixation (regenerate session ID on auth)
- [ ] Loggea all authentication events (login, logout, failed attempts)
```

---

## 8. A08:2021 — Software and Data Integrity Failures

### Remediation Checklist

```text
- [ ] Verifica integrity de CI/CD pipeline (signed commits, protected branches)
- [ ] Usa signed packages y verifica signatures on install
- [ ] Implementa subresource integrity (SRI) para external scripts
- [ ] Valida serialized data antes de deserialization
- [ ] Usa code signing para mobile y desktop applications
- [ ] Verifica webhook signatures antes de processear
- [ ] Usa immutable container images (signed y verified)
- [ ] Implementa supply chain security (Sigstore, SLSA framework)
```

---

## 9. A09:2021 — Security Logging and Monitoring Failures

### Remediation Checklist

```text
- [ ] Loggea all security events (login, access control, input validation)
- [ ] Sendea logs a centralized logging system (ELK, Splunk, Datadog)
- [ ] Setea alerts para suspicious activity (brute force, privilege escalation)
- [ ] Implementa audit trail para all state-changing operations
- [ ] Ensurea logs contengan user ID, timestamp, source IP, action
- [ ] Protectea logs de tampering (append-only, WORM storage)
- [ ] Setea log retention policy (minimum 90 days para security logs)
- [ ] Monitora para log injection attacks (sanitize log input)
- [ ] Implementa incident response plan con defined escalation
- [ ] Conducta regular log review (weekly automated, monthly manual)
```

---

## 10. A10:2021 — Server-Side Request Forgery (SSRF)

### Remediation Checklist

```text
- [ ] Valida y sanitizea all user-supplied URLs
- [ ] Usa allowlist para permitted domains y IP ranges
- [ ] Blockea requests a internal IP ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x)
- [ ] Blockea requests a localhost y link-local addresses
- [ ] Disablea HTTP redirects en server-side requests
- [ ] Usa un separate network segment para outbound requests
- [ ] Implementa DNS pinning para prevenir DNS rebinding attacks
- [ ] Loggea all outbound requests con destination y user context
- [ ] Usa un dedicated egress proxy con filtering
- [ ] Testea con SSRF payloads (169.254.169.254, localhost, file://)
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
        # Resolve hostname y checkea contra blocked ranges
        ip = socket.gethostbyname(hostname)
        ip_addr = ipaddress.ip_address(ip)
        for blocked in BLOCKED_RANGES:
            if ip_addr in blocked:
                return False
    except socket.gaierror:
        return False

    return True
```

## Preguntas Frecuentes

### ¿Con qué frecuencia deberia correr este checklist?

Corre el full checklist al menos quarterly para production applications. Correlo despues de cualquier major feature release, architecture change o new dependency addition. Corre individual sections cuando un related vulnerability se discovers (e.g., corre A03 despues de un SQL injection finding). Integra el checklist en tu security sprint — assigna cada category a un team member y trackea progress en tu issue tracker.

### ¿Cuál es la diferencia entre OWASP Top 10 y ASVS?

El OWASP Top 10 lista las most critical security risks — es awareness-level guidance. El Application Security Verification Standard (ASVS) es un detailed verification standard con three levels de security requirements. ASVS va mas deep en specific controls para cada risk area. Usa el Top 10 para prioritization y awareness. Usa ASVS para detailed implementation y verification. ASVS Level 1 mapea roughly al Top 10, mientras Level 2 y 3 van beyond.

### ¿Cómo priorizo fixes cuando todo es P0?

Empieza con el risk que tiene el highest likelihood de exploitation y el highest impact. Injection (A03) y Broken Access Control (A01) son tipicamente P0 porque leadean directamente a data breaches. Dentro de cada category, fixea internet-facing endpoints first, luego internal endpoints. Fixea authentication issues next (A07), luego configuration issues (A05). Usa CVSS scores para break ties — higher CVSS first. Si dos items tienen el same CVSS, fixea el que tiene mas affected users.

### ¿Deberia usar SAST, DAST o IAST para verification?

Usa los three. SAST (Static Analysis) catchea issues at code level antes de deployment — correlo en CI en every pull request. DAST (Dynamic Analysis) testea el running application desde outside — correlo weekly contra staging. IAST (Interactive Analysis) combina ambos instrumentando el running app — usalo en QA y staging environments. SAST encuentra mas issues early pero tiene false positives. DAST encuentra real exploitable issues pero missa code-level problems. IAST tiene el best accuracy pero requiere runtime instrumentation.

### ¿Qué tools deberia usar para automated scanning?

Para dependency scanning: Dependabot (GitHub), Snyk, o OWASP Dependency-Check. Para SAST: SonarQube, Semgrep, o CodeQL. Para DAST: OWASP ZAP o Burp Suite. Para infrastructure scanning: Scout Suite (AWS), Prowler (AWS), o Trivy (containers). Para secrets scanning: GitLeaks o TruffleHog. Integra all en CI/CD con quality gates que blockeen deployment on critical findings. Corre infrastructure scans daily y reviewa results weekly.
