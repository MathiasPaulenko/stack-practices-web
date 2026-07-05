---
contentType: docs
slug: security-review-checklist-for-prs
templateType: guideline
title: "Security Review Checklist for PRs"
description: "Checklist for security checks during pull request review: input validation, authentication, authorization, secrets, dependencies, injection, XSS, CSRF, logging, and automated tooling integration with code examples for secure patterns."
metaDescription: "Security review checklist for PRs: input validation, auth, secrets, dependencies, injection, XSS, CSRF, logging, automated tooling, secure code patterns."
difficulty: intermediate
topics:
  - security
tags:
  - security-review
  - code-review
  - pull-request
  - security
  - sast
  - code-quality
relatedResources:
  - /docs/security/owasp-top-10-remediation-checklist
  - /docs/security/secrets-rotation-runbook
  - /docs/security/api-authentication-design-template
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Security review checklist for PRs: input validation, auth, secrets, dependencies, injection, XSS, CSRF, logging, automated tooling, secure code patterns."
  keywords:
    - security review
    - pull request security
    - code review checklist
    - sast
    - input validation
    - secure coding
    - pr security
---

## Overview

This checklist provides security review guidelines for pull requests. Every PR that modifies application code, configuration, or infrastructure must pass a security review before merging. This document covers input validation, authentication, authorization, secrets management, dependency changes, injection prevention, XSS, CSRF, logging, and automated tooling integration.

---

## 1. Input Validation

### 1.1 Checklist

```text
- [ ] All user input is validated on the server side
- [ ] Input validation uses allowlist (not blocklist) approach
- [ ] Input length is bounded (max length enforced)
- [ ] Input type is verified (string, int, UUID, etc.)
- [ ] Input format is validated (regex for emails, URLs, dates)
- [ ] File uploads check MIME type and file extension
- [ ] File uploads limit maximum file size
- [ ] SQL queries use parameterized statements (no string concatenation)
- [ ] NoSQL queries prevent operator injection (e.g., $where, $expr)
- [ ] Command execution uses shell=False (no shell=True)
- [ ] XML parsing disables external entity expansion (XXE)
- [ ] JSON parsing limits depth and key count
```

### 1.2 Code Example — Input Validation

```python
from pydantic import BaseModel, validator, constr, conint
from typing import Optional
import uuid

class CreateUserRequest(BaseModel):
    username: constr(min_length=3, max_length=32, pattern=r'^[a-zA-Z0-9_]+$')
    email: constr(min_length=5, max_length=254, pattern=r'^[^@]+@[^@]+\.[^@]+$')
    age: conint(ge=13, le=120)
    bio: Optional[constr(max_length=500)] = None

    @validator('username')
    def no_sql_keywords(cls, v):
        # Additional check for SQL keywords (defense in depth)
        blocked = {'select', 'insert', 'update', 'delete', 'drop', 'union'}
        if any(kw in v.lower() for kw in blocked):
            raise ValueError('Username contains reserved word')
        return v

# Usage — invalid input raises ValidationError
try:
    user = CreateUserRequest(**request.json())
except ValidationError as e:
    return jsonify({'error': 'Invalid input', 'details': e.errors()}), 400
```

---

## 2. Authentication and Authorization

### 2.1 Checklist

```text
- [ ] New endpoints require authentication (no unauthenticated access unless explicit)
- [ ] Authorization checks are enforced server-side (not just client-side)
- [ ] Resource ownership is verified (IDOR check)
- [ ] Permission checks use deny-by-default
- [ ] Role changes require admin authorization
- [ ] Session tokens are rotated after privilege change
- [ ] Password changes require current password verification
- [ ] API endpoints enforce rate limiting
- [ ] Sensitive operations require MFA re-verification
- [ ] JWT tokens are validated (signature, expiry, issuer, audience)
```

### 2.2 Code Example — Authorization Check

```python
from functools import wraps

def authorize(action: str, resource_type: str = None):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            user = g.current_user
            resource_id = kwargs.get('id')

            # Check permission
            if not user.can(action, resource_type, resource_id):
                log_denial(user, action, resource_type, resource_id)
                abort(403)

            return f(*args, **kwargs)
        return wrapped
    return decorator

@app.route('/api/orders/<uuid:order_id>', methods=['PUT'])
@authenticate
@authorize('update', 'order')
def update_order(order_id):
    order = Order.query.get_or_404(order_id)
    # IDOR check — verify ownership
    if order.user_id != g.current_user.id and not g.current_user.has_role('admin'):
        abort(403)
    order.update(request.json)
    return jsonify(order.to_dict())
```

---

## 3. Secrets Management

### 3.1 Checklist

```text
- [ ] No secrets, API keys, or passwords in source code
- [ ] No secrets in configuration files committed to git
- [ ] Secrets are loaded from environment variables or secrets manager
- [ ] .env files are in .gitignore
- [ ] No secrets in log statements or error messages
- [ ] No secrets in URL parameters or query strings
- [ ] CI/CD pipeline uses secret variables (not hardcoded)
- [ ] Docker images don't contain secrets (use build args or runtime env)
- [ ] Secret scanning tool (GitLeaks, TruffleHog) is in pre-commit hook
- [ ] No secrets in comments or documentation
```

### 3.2 Pre-Commit Secret Scanning

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
        args: ['--config', '.gitleaks.toml']

  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.5.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

---

## 4. Dependency Changes

### 4.1 Checklist

```text
- [ ] New dependencies are from trusted sources (official registries)
- [ ] New dependencies have no known critical vulnerabilities
- [ ] Dependency versions are pinned (no wildcards or ranges)
- [ ] License compatibility is verified (no GPL in commercial projects)
- [ ] Dependency is actively maintained (last commit < 1 year)
- [ ] No unnecessary dependencies added (justify each new dep)
- [ ] Dependency scan (Dependabot, Snyk) passes
- [ ] Transitive dependencies reviewed for known issues
- [ ] Lock file is updated (package-lock.json, poetry.lock, etc.)
- [ ] No dev dependencies moved to production dependencies
```

### 4.2 Automated Dependency Check in CI

```yaml
# GitHub Actions — dependency security check
name: Dependency Security
on: [pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: npm audit
        run: npm audit --audit-level=high --omit=dev
        continue-on-error: false

      - name: Snyk scan
        uses: snyk/actions/node@master
        with:
          command: test
          args: --severity-threshold=high --fail-on=issues
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: License check
        run: npx license-checker --production --failOn 'GPL-3.0;AGPL-3.0'
```

---

## 5. Injection Prevention

### 5.1 Checklist

```text
- [ ] SQL queries use parameterized statements or ORM
- [ ] No string concatenation for SQL queries
- [ ] No use of eval() or Function() with user input
- [ ] No use of innerHTML with user input (use textContent)
- [ ] No use of document.write() with user input
- [ ] Template engines use auto-escaping (Jinja2, Twig, etc.)
- [ ] Shell commands use argument arrays (not string concatenation)
- [ ] LDAP queries escape special characters
- [ ] XPath queries use parameterized expressions
- [ ] NoSQL queries sanitize $ operators
```

### 5.2 Code Examples

```python
# BAD: SQL injection
cursor.execute(f"SELECT * FROM users WHERE name = '{name}'")

# GOOD: parameterized query
cursor.execute("SELECT * FROM users WHERE name = %s", (name,))

# BAD: command injection
import subprocess
subprocess.run(f"ls {user_dir}", shell=True)

# GOOD: argument array
subprocess.run(["ls", user_dir], shell=False)

# BAD: XSS in JavaScript
document.getElementById('output').innerHTML = userInput;

# GOOD: textContent
document.getElementById('output').textContent = userInput;
```

---

## 6. XSS and CSRF Prevention

### 6.1 XSS Checklist

```text
- [ ] Output encoding applied to all user-generated content
- [ ] Content-Security-Policy header is set (no unsafe-inline)
- [ ] X-XSS-Protection header is set
- [ ] X-Content-Type-Options: nosniff is set
- [ ] Cookies are HttpOnly and Secure
- [ ] Framework auto-escaping is enabled
- [ ] No use of dangerouslySetInnerHTML (React) or [innerHTML] (Angular)
- [ ] User input in URLs is encoded (encodeURIComponent)
- [ ] SVG uploads are sanitized (remove script tags)
- [ ] Markdown rendering sanitizes HTML (no raw HTML)
```

### 6.2 CSRF Checklist

```text
- [ ] CSRF token is included in all state-changing forms
- [ ] CSRF token is validated on the server side
- [ ] Cookies use SameSite=Strict or SameSite=Lax
- [ ] API endpoints use custom headers (not just cookies)
- [ ] Origin/Referer header is validated on state-changing requests
- [ ] CORS policy is restrictive (no wildcard origins)
- [ ] Login endpoint is CSRF-protected (login CSRF)
- [ ] Logout endpoint is CSRF-protected
```

### 6.3 Code Example — CSRF Protection

```python
from flask import session
import secrets

def generate_csrf_token():
    if 'csrf_token' not in session:
        session['csrf_token'] = secrets.token_hex(32)
    return session['csrf_token']

@app.before_request
def validate_csrf():
    if request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
        token = request.headers.get('X-CSRF-Token') or request.form.get('csrf_token')
        if not token or token != session.get('csrf_token'):
            abort(403, description='CSRF token validation failed')
```

---

## 7. Logging and Error Handling

### 7.1 Checklist

```text
- [ ] No sensitive data in log messages (passwords, tokens, PII)
- [ ] Error messages don't expose internal details to users
- [ ] Stack traces are logged server-side, not shown to clients
- [ ] Security events are logged (login, access denied, input validation)
- [ ] Logs include user ID, timestamp, source IP, and action
- [ ] Log injection is prevented (sanitize log input)
- [ ] Error handling doesn't swallow exceptions silently
- [ ] Debug mode is disabled in production
- [ ] Custom error pages don't leak server information
- [ ] Audit trail for all state-changing operations
```

### 7.2 Code Example — Safe Logging

```python
import logging
import re

logger = logging.getLogger(__name__)

# Sanitize log input to prevent log injection
def sanitize_for_log(value: str) -> str:
    # Remove newlines and carriage returns
    return re.sub(r'[\r\n]', '', str(value))[:200]

def log_security_event(user_id: str, action: str, resource: str, ip: str):
    logger.info(
        "Security event: user=%s action=%s resource=%s ip=%s",
        sanitize_for_log(user_id),
        sanitize_for_log(action),
        sanitize_for_log(resource),
        sanitize_for_log(ip),
    )

# BAD: logging sensitive data
logger.info(f"User logged in with password: {password}")  # NEVER DO THIS

# GOOD: log without sensitive data
logger.info(f"User {user_id} logged in from {ip}")
```

---

## 8. Automated Tooling

### 8.1 Required CI Checks

```text
Tool              | Purpose                    | When to run        | Block merge on
──────────────────┼────────────────────────────┼────────────────────┼──────────────────
SAST (Semgrep)    | Static security analysis   | Every PR            | High severity
Snyk / Dependabot | Dependency vulnerabilities | Every PR            | High severity
GitLeaks          | Secret scanning            | Every commit        | Any finding
ESLint security   | JS/TS security rules       | Every PR            | Error level
Bandit (Python)   | Python security linter     | Every PR            | High severity
Trivy             | Container image scan       | Image build         | High severity
OWASP ZAP         | DAST (dynamic scan)        | Nightly on staging  | Critical
```

### 8.2 Semgrep Configuration

```yaml
# semgrep.yml — custom security rules
rules:
  - id: no-hardcoded-secrets
    pattern: password = "..."
    message: "Hardcoded password detected"
    severity: ERROR
    languages: [python, javascript, java]

  - id: no-sql-injection
    pattern: cursor.execute(f"...")
    message: "Possible SQL injection — use parameterized queries"
    severity: ERROR
    languages: [python]

  - id: no-shell-true
    pattern: subprocess.run(..., shell=True)
    message: "shell=True is dangerous with user input"
    severity: WARNING
    languages: [python]

  - id: no-innerhtml
    pattern: $EL.innerHTML = $INPUT
    message: "innerHTML with user input causes XSS — use textContent"
    severity: ERROR
    languages: [javascript]
```

## FAQ

### When should I request a security review?

Request a security review for any PR that: adds authentication or authorization logic, handles user input, modifies security configuration, adds new dependencies, changes data access patterns, implements crypto or token handling, modifies CI/CD pipelines, or touches infrastructure configuration. For routine changes (UI styling, documentation, test additions), a self-review against this checklist is sufficient. When in doubt, request a review — it is cheaper than a security incident.

### How long should a security review take?

A security review for a typical PR (100-500 lines changed) should take 30-60 minutes. For larger PRs or security-sensitive changes (auth, crypto, payment), allow 2-4 hours. The reviewer should run automated tools first (SAST, dependency scan), then manually review the checklist items. If the PR introduces significant security risk, schedule a dedicated review session with the security team rather than doing it inline.

### What should I do if I find a security issue during review?

If the issue is critical (remote code execution, authentication bypass, data exposure), block the PR and notify the security team immediately. Do not merge until the issue is fixed. If the issue is high severity (SQL injection, XSS, access control), request changes and explain the fix needed. If the issue is medium or low, add a comment with the recommendation and let the author decide whether to fix in this PR or a follow-up. Never approve a PR with known critical or high security issues.

### How do I balance security review with development speed?

Automate as much as possible — SAST, dependency scanning, and secret scanning should run automatically in CI and block PRs with critical findings. This catches the most common issues without manual review. For manual review, focus on the high-risk areas: authentication, authorization, input validation, and secrets. Use this checklist as a quick reference — don't review every line for every item. Prioritize based on the PR's risk profile. A PR that adds a new API endpoint needs more security review than one that changes button colors.

### What tools should be in my security CI pipeline?

At minimum: SAST (Semgrep or SonarQube), dependency scanning (Snyk or Dependabot), and secret scanning (GitLeaks). Add DAST (OWASP ZAP) for staging environments. Add container scanning (Trivy) if you build Docker images. Add license checking (license-checker) for compliance. Configure all tools to fail the CI build on high-severity findings. Run SAST and secret scanning on every PR. Run dependency scanning on every PR and nightly. Run DAST nightly against staging. Review tool findings weekly to tune false positives.
