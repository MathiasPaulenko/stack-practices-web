---


contentType: docs
slug: security-review-checklist-for-prs
templateType: guideline
title: "Checklist de Security Review para PRs"
description: "Checklist para security checks durante pull request review: input validation, authentication, authorization, secrets, dependencies, injection, XSS, CSRF, logging y automated tooling integration con ejemplos de codigo para secure patterns."
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
  - /docs/owasp-top-10-remediation-checklist
  - /docs/secrets-rotation-runbook
  - /docs/api-authentication-design-template
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

Este checklist provee security review guidelines para pull requests. Cada PR que modifique application code, configuration o infrastructure debe pasar un security review antes de mergeear. Este documento cubre input validation, authentication, authorization, secrets management, dependency changes, injection prevention, XSS, CSRF, logging y automated tooling integration.

---

## 1. Input Validation

### 1.1 Checklist

```text
- [ ] All user input se valida en el server side
- [ ] Input validation usa allowlist (no blocklist) approach
- [ ] Input length esta bounded (max length enforced)
- [ ] Input type se verifica (string, int, UUID, etc.)
- [ ] Input format se valida (regex para emails, URLs, dates)
- [ ] File uploads checkean MIME type y file extension
- [ ] File uploads limitan maximum file size
- [ ] SQL queries usan parameterized statements (no string concatenation)
- [ ] NoSQL queries previenen operator injection (e.g., $where, $expr)
- [ ] Command execution usa shell=False (no shell=True)
- [ ] XML parsing disablea external entity expansion (XXE)
- [ ] JSON parsing limita depth y key count
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
        # Additional check para SQL keywords (defense in depth)
        blocked = {'select', 'insert', 'update', 'delete', 'drop', 'union'}
        if any(kw in v.lower() for kw in blocked):
            raise ValueError('Username contains reserved word')
        return v

# Usage — invalid input raisea ValidationError
try:
    user = CreateUserRequest(**request.json())
except ValidationError as e:
    return jsonify({'error': 'Invalid input', 'details': e.errors()}), 400
```

---

## 2. Authentication and Authorization

### 2.1 Checklist

```text
- [ ] New endpoints requireeen authentication (no unauthenticated access a menos que explicit)
- [ ] Authorization checks se enforcean server-side (no solo client-side)
- [ ] Resource ownership se verifica (IDOR check)
- [ ] Permission checks usan deny-by-default
- [ ] Role changes requireen admin authorization
- [ ] Session tokens se rotan despues de privilege change
- [ ] Password changes requireen current password verification
- [ ] API endpoints enforcean rate limiting
- [ ] Sensitive operations requireen MFA re-verification
- [ ] JWT tokens se validan (signature, expiry, issuer, audience)
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

            # Checkea permission
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
    # IDOR check — verifica ownership
    if order.user_id != g.current_user.id and not g.current_user.has_role('admin'):
        abort(403)
    order.update(request.json())
    return jsonify(order.to_dict())
```

---

## 3. Secrets Management

### 3.1 Checklist

```text
- [ ] No secrets, API keys o passwords en source code
- [ ] No secrets en configuration files committed a git
- [ ] Secrets se loadean desde environment variables o secrets manager
- [ ] .env files estan en .gitignore
- [ ] No secrets en log statements o error messages
- [ ] No secrets en URL parameters o query strings
- [ ] CI/CD pipeline usa secret variables (no hardcoded)
- [ ] Docker images no contienen secrets (usa build args o runtime env)
- [ ] Secret scanning tool (GitLeaks, TruffleHog) esta en pre-commit hook
- [ ] No secrets en comments o documentation
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
- [ ] New dependencies son de trusted sources (official registries)
- [ ] New dependencies no tienen known critical vulnerabilities
- [ ] Dependency versions estan pinned (no wildcards o ranges)
- [ ] License compatibility se verifica (no GPL en commercial projects)
- [ ] Dependency esta actively maintained (last commit < 1 year)
- [ ] No unnecessary dependencies added (justifica cada new dep)
- [ ] Dependency scan (Dependabot, Snyk) pasa
- [ ] Transitive dependencies reviewed para known issues
- [ ] Lock file esta updated (package-lock.json, poetry.lock, etc.)
- [ ] No dev dependencies moved a production dependencies
```

### 4.2 Automated Dependency Check en CI

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
- [ ] SQL queries usan parameterized statements o ORM
- [ ] No string concatenation para SQL queries
- [ ] No uso de eval() o Function() con user input
- [ ] No uso de innerHTML con user input (usa textContent)
- [ ] No uso de document.write() con user input
- [ ] Template engines usan auto-escaping (Jinja2, Twig, etc.)
- [ ] Shell commands usan argument arrays (no string concatenation)
- [ ] LDAP queries escapean special characters
- [ ] XPath queries usan parameterized expressions
- [ ] NoSQL queries sanitizean $ operators
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

# BAD: XSS en JavaScript
document.getElementById('output').innerHTML = userInput;

# GOOD: textContent
document.getElementById('output').textContent = userInput;
```

---

## 6. XSS and CSRF Prevention

### 6.1 XSS Checklist

```text
- [ ] Output encoding applied a all user-generated content
- [ ] Content-Security-Policy header esta seteado (no unsafe-inline)
- [ ] X-XSS-Protection header esta seteado
- [ ] X-Content-Type-Options: nosniff esta seteado
- [ ] Cookies son HttpOnly y Secure
- [ ] Framework auto-escaping esta enabled
- [ ] No uso de dangerouslySetInnerHTML (React) o [innerHTML] (Angular)
- [ ] User input en URLs se encodea (encodeURIComponent)
- [ ] SVG uploads se sanitizean (remove script tags)
- [ ] Markdown rendering sanitizea HTML (no raw HTML)
```

### 6.2 CSRF Checklist

```text
- [ ] CSRF token se incluye en all state-changing forms
- [ ] CSRF token se valida en el server side
- [ ] Cookies usan SameSite=Strict o SameSite=Lax
- [ ] API endpoints usan custom headers (no solo cookies)
- [ ] Origin/Referer header se valida en state-changing requests
- [ ] CORS policy es restrictive (no wildcard origins)
- [ ] Login endpoint esta CSRF-protected (login CSRF)
- [ ] Logout endpoint esta CSRF-protected
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
- [ ] No sensitive data en log messages (passwords, tokens, PII)
- [ ] Error messages no exponen internal details a users
- [ ] Stack traces se loggean server-side, no se muestran a clients
- [ ] Security events se loggean (login, access denied, input validation)
- [ ] Logs incluyen user ID, timestamp, source IP y action
- [ ] Log injection se previene (sanitize log input)
- [ ] Error handling no swallowea exceptions silently
- [ ] Debug mode esta disabled en production
- [ ] Custom error pages no leakean server information
- [ ] Audit trail para all state-changing operations
```

### 7.2 Code Example — Safe Logging

```python
import logging
import re

logger = logging.getLogger(__name__)

# Sanitizea log input para prevenir log injection
def sanitize_for_log(value: str) -> str:
    # Removee newlines y carriage returns
    return re.sub(r'[\r\n]', '', str(value))[:200]

def log_security_event(user_id: str, action: str, resource: str, ip: str):
    logger.info(
        "Security event: user=%s action=%s resource=%s ip=%s",
        sanitize_for_log(user_id),
        sanitize_for_log(action),
        sanitize_for_log(resource),
        sanitize_for_log(ip),
    )

# BAD: loggeando sensitive data
logger.info(f"User logged in with password: {password}")  # NUNCA HAGAS ESTO

# GOOD: loggea sin sensitive data
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

## Preguntas Frecuentes

### ¿Cuando deberia requestear un security review?

Requestea un security review para cualquier PR que: adda authentication o authorization logic, handlee user input, modifique security configuration, adda new dependencies, cambie data access patterns, implemente crypto o token handling, modifique CI/CD pipelines o toque infrastructure configuration. Para routine changes (UI styling, documentation, test additions), un self-review contra este checklist es sufficient. Cuando dudes, requestea un review — es cheaper que un security incident.

### ¿Cuánto deberia tomar un security review?

Un security review para un typical PR (100-500 lines changed) deberia tomar 30-60 minutes. Para larger PRs o security-sensitive changes (auth, crypto, payment), allow 2-4 hours. El reviewer deberia correr automated tools first (SAST, dependency scan), luego manualmente reviewear los checklist items. Si el PR introducea significant security risk, schedulea un dedicated review session con el security team en vez de hacerlo inline.

### ¿Qué deberia hacer si encuentro un security issue durante review?

Si el issue es critical (remote code execution, authentication bypass, data exposure), blockea el PR y notifica al security team immediately. No mergees hasta que el issue se fixee. Si el issue es high severity (SQL injection, XSS, access control), requestea changes y explica el fix needed. Si el issue es medium o low, add un comment con el recommendation y deja al author decidir si fixea en este PR o un follow-up. Nunca approves un PR con known critical o high security issues.

### ¿Cómo balanceo security review con development speed?

Automatiza as much as possible — SAST, dependency scanning y secret scanning deberian correr automaticamente en CI y blockear PRs con critical findings. Esto catchea los most common issues sin manual review. Para manual review, focusa en los high-risk areas: authentication, authorization, input validation y secrets. Usa este checklist como quick reference — no reviewees every line para every item. Prioritiza basado en el PR's risk profile. Un PR que adda un new API endpoint necesita mas security review que uno que cambia button colors.

### ¿Qué tools deberian estar en mi security CI pipeline?

At minimum: SAST (Semgrep o SonarQube), dependency scanning (Snyk o Dependabot) y secret scanning (GitLeaks). Add DAST (OWASP ZAP) para staging environments. Add container scanning (Trivy) si buildeas Docker images. Add license checking (license-checker) para compliance. Configura all tools para failear el CI build on high-severity findings. Corre SAST y secret scanning en every PR. Corre dependency scanning en every PR y nightly. Corre DAST nightly contra staging. Reviewa tool findings weekly para tunear false positives.

## See Also

- [Detect Bugs in Java with SpotBugs Static Analysis](/es/recipes/java-spotbugs-static-analysis/)
- [Enforce Security Rules in Node.js with](/es/recipes/nodejs-eslint-security-plugin/)
- [Find Security Issues in Python Code with Bandit](/es/recipes/python-bandit-static-analysis/)
- [Strict Type Checking in Python with mypy](/es/recipes/python-mypy-strict-type-checking/)
- [Strict TypeScript ESLint Configuration for Production](/es/recipes/typescript-eslint-strict-config/)

