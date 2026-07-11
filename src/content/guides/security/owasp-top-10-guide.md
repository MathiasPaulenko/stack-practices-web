---
contentType: guides
slug: owasp-top-10-guide
title: "OWASP Top 10: Explained with Mitigations"
description: "A developer-focused guide to the OWASP Top 10 security risks: how each vulnerability works, real-world examples, and practical mitigations for web applications."
metaDescription: "Learn OWASP Top 10 security risks with mitigations. Understand injection, broken auth, XSS, insecure deserialization and how to prevent them in your apps."
difficulty: intermediate
topics:
  - security
  - frontend
tags:
  - owasp
  - owasp-top-10
  - web-security
  - vulnerability-mitigation
  - secure-coding
  - guide
relatedResources:
  - /guides/secure-coding-guide
  - /guides/threat-modeling-guide
  - /guides/cryptography-basics-guide
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Learn OWASP Top 10 security risks with mitigations. Understand injection, broken auth, XSS, insecure deserialization and how to prevent them in your apps."
  keywords:
    - owasp
    - owasp-top-10
    - web-security
    - vulnerability-mitigation
    - secure-coding
    - guide
---

## Overview

The OWASP Top 10 is a standard awareness document for developers and web application security. It represents a broad consensus about the most critical security risks to web applications. Understanding these risks, and more importantly how to prevent them, is a baseline skill for every developer shipping code to production.

## When to Use

- You are building or maintaining web applications
- You need to communicate security risks to stakeholders
- You are preparing for security audits or penetration tests
- You want to establish secure coding standards

## A01: Broken Access Control

Risk: Users can access resources or perform actions outside their intended permissions.

Example: An attacker changes the URL from `/account/123` to `/account/124` and views another user's data.

Mitigation:
- Deny by default; validate server-side on every request
- Use a single, reusable access control mechanism
- Implement proper CORS policies
- Rate-limit API endpoints to prevent automated abuse

```python
# Server-side authorization check
def get_account(account_id: str, user: User):
    account = db.get_account(account_id)
    if account.owner_id != user.id and not user.is_admin:
        raise Forbidden("Access denied")
    return account
```

## A02: Cryptographic Failures

Risk: Sensitive data is exposed through weak or missing encryption.

Example: Passwords stored in plaintext, or credit card numbers transmitted over HTTP.

Mitigation:
- Encrypt data at rest (AES-256) and in transit (TLS 1.3)
- Use strong password hashing: Argon2id, scrypt, or bcrypt
- Never store sensitive data you do not need (PCI DSS compliance)
- Use secure random generators for tokens and IDs

```python
import bcrypt

# Hash a password
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))

# Verify
if bcrypt.checkpw(password.encode(), hashed):
    # Authenticated
```

## A03: Injection

Risk: Untrusted data is sent to an interpreter as part of a command or query.

Example: SQL injection through unsanitized user input in a search field.

Mitigation:
- Use parameterized queries (prepared statements)
- Use ORMs that escape queries automatically
- Validate and sanitize all user input
- Use LIMIT in SQL queries to minimize injection damage

```python
# Safe: parameterized query
cursor.execute("SELECT * FROM users WHERE email = %s", (email,))

# Unsafe: string formatting
cursor.execute(f"SELECT * FROM users WHERE email = '{email}'")
```

## A04: Insecure Design

Risk: Flaws in application design that cannot be fixed by perfect implementation alone.

Example: A password reset flow that sends a predictable token in the URL.

Mitigation:
- Establish secure design patterns and threat modeling
- Use reference architectures with security baked in
- Segregate domains into bounded contexts with independent auth
- Implement unit and integration tests for security controls

## A05: Security Misconfiguration

Risk: Default configurations, incomplete setups, or overly permissive settings.

Example: Default admin credentials, exposed cloud storage, or unnecessary capabilities enabled.

Mitigation:
- Harden all environments (dev, staging, prod) equally
- Remove unused capabilities, dependencies, and documentation
- Segment application architecture (containers, serverless)
- Automate configuration validation in CI/CD pipelines

## A06: Vulnerable and Outdated Components

Risk: Using components with known vulnerabilities.

Example: Running Log4j 2.14.1 after the disclosure of CVE-2021-44228.

Mitigation:
- Maintain a software bill of materials (SBOM)
- Use dependency scanners (Snyk, OWASP Dependency-Check, npm audit)
- Subscribe to security advisories for your stack
- Have a patch SLA (critical: 24h, high: 7 days)

## A07: Identification and Authentication Failures

Risk: Authentication weaknesses allow credential stuffing, brute force, or session hijacking.

Example: No rate limiting on login, sessions that never expire, or weak password policies.

Mitigation:
- Implement multi-factor authentication (MFA)
- Use secure session management (httpOnly, secure, SameSite cookies)
- Enforce strong password policies or passwordless auth
- Detect and block credential stuffing attempts

```http
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict; Max-Age=3600
```

## A08: Software and Data Integrity Failures

Risk: Applications that rely on plugins, libraries, or modules from untrusted sources.

Example: A CI/CD pipeline that fetches dependencies without verifying signatures.

Mitigation:
- Verify digital signatures of packages and updates
- Use private repositories with strict access controls
- Ensure CI/CD pipelines have strong access controls and audit logging
- Do not auto-update production dependencies

## A09: Security Logging and Monitoring Failures

Risk: Insufficient logging prevents detection of breaches and slows incident response.

Example: A data exfiltration attack that goes unnoticed for months because logs were not collected.

Mitigation:
- Log all authentication, access control, and input validation failures
- Ensure logs are tamper-resistant and stored centrally
- Implement real-time alerting for suspicious patterns
- Practice incident response drills with your logs

## A10: Server-Side Request Forgery (SSRF)

Risk: An attacker forces the server to make requests to internal or restricted resources.

Example: A URL fetcher that follows redirects to `http://169.254.169.254/latest/meta-data/` on AWS.

Mitigation:
- Validate and sanitize all URLs (scheme, host, port)
- Use allowlists for outbound requests
- Disable URL following or validate the final destination
- Run fetch services in isolated network segments

## Summary Table

| Rank | Risk | Key Mitigation |
|------|------|---------------|
| A01 | Broken Access Control | Server-side authorization checks |
| A02 | Cryptographic Failures | Encrypt data at rest and in transit |
| A03 | Injection | Parameterized queries and input validation |
| A04 | Insecure Design | Threat modeling and secure patterns |
| A05 | Security Misconfiguration | Harden all environments equally |
| A06 | Vulnerable Components | Dependency scanning and patch SLAs |
| A07 | Auth Failures | MFA, secure sessions, rate limiting |
| A08 | Integrity Failures | Signature verification and supply chain security |
| A09 | Logging Failures | Centralized tamper-resistant logging |
| A10 | SSRF | URL validation and network segmentation |

## Common Mistakes

- Thinking the framework handles everything. Frameworks help, but you still need to configure them correctly
- Only testing for XSS and SQLi. Modern applications face supply chain, business logic, and SSRF risks
- Treating security as an afterthought. Build security into design, not as a pre-release checklist
- Ignoring mobile and API variants. OWASP has separate lists for mobile and API security

## FAQ

### How often does OWASP update the Top 10?

Approximately every 3-4 years. The current version is from 2021. Check `owasp.org` for updates.

### Is OWASP Top 10 enough for compliance?

It is a great starting point but not exhaustive. Consider OWASP ASVS (Application Security Verification Standard) for thorough requirements.

### How do I test for these vulnerabilities?

Use automated scanners (OWASP ZAP, Burp Suite) for a baseline, then follow with manual penetration testing and code review.


## Advanced Topics

### Scenario: OWASP Top 10 Mitigation in REST API

```text
System: REST API Node.js + PostgreSQL, 50 endpoints
Goal: Mitigate all 10 OWASP vulnerabilities

A01: Broken Access Control
  | Vulnerability | Mitigation | Implementation |
  |--------------|------------|----------------|
  | IDOR in /api/users/:id | Verify ownership | JWT + scope check |
  | Admin without auth | Strict RBAC | middleware role("admin") |
  | API without rate limit | Rate limiting | express-rate-limit 100/min |

A02: Cryptographic Failures
  | Vulnerability | Mitigation | Implementation |
  |--------------|------------|----------------|
  | Password in MD5 | bcrypt + salt rounds 12 | bcrypt.hash(pw, 12) |
  | HTTP without TLS | TLS 1.3 mandatory | redirect HTTP -> HTTPS |
  | JWT with HS256 | RS256 + key rotation | jwt.sign(..., RS256) |
  | DB unencrypted | AES-256 at rest | AWS RDS encryption |

A03: Injection
  | Vulnerability | Mitigation | Implementation |
  |--------------|------------|----------------|
  | SQL injection | Parameterized queries | pool.query(..., [params]) |
  | NoSQL injection | Schema validation | Zod safeParse |
  | Command injection | No eval/exec | child_process with args array |
  | LDAP injection | Input sanitization | escapeLDAP filter |

A04: Insecure Design
  | Vulnerability | Mitigation | Implementation |
  |--------------|------------|----------------|
  | No threat modeling | STRIDE per feature | Threat model doc |
  | No rate limit on auth | Rate limit + lockout | 5 attempts -> lock 15min |
  | No audit log | Append-only log | Audit table + hash chain |

A05: Security Misconfiguration
  | Vulnerability | Mitigation | Implementation |
  |--------------|------------|----------------|
  | Missing headers | helmet() | X-Frame-Options, CSP, HSTS |
  | Open CORS | Strict origin | cors({ origin: [...] }) |
  | Debug in prod | NODE_ENV=production | app.set("env", "production") |
  | Errors with stack | Generic messages | error handler middleware |

A06: Vulnerable Components
  | Vulnerability | Mitigation | Implementation |
  |--------------|------------|----------------|
  | Outdated deps | npm audit in CI | npm audit --audit-level=high |
  | Unpatched CVE | Weekly renewal | Dependabot + Snyk |
  | Incompatible licenses | License check | license-checker in CI |

A07: Auth Failures
  | Vulnerability | Mitigation | Implementation |
  |--------------|------------|----------------|
  | Weak password | Min 12 chars + complexity | Zod password schema |
  | No MFA | TOTP + backup codes | speakeasy + qrcode |
  | Session no expiry | JWT 15min + refresh | Refresh token rotation |
  | Brute force | Rate limit + lockout | 5 attempts -> lock 15min |

A08: Data Integrity Failures
  | Vulnerability | Mitigation | Implementation |
  |--------------|------------|----------------|
  | JWT without verification | Verify signature + expiry | jwt.verify(token, key) |
  | Insecure deserialization | Schema validation | Zod safeParse |
  | Unsigned CI/CD | Sign artifacts | Cosign + Sigstore |

A09: Logging Failures
  | Vulnerability | Mitigation | Implementation |
  |--------------|------------|----------------|
  | No audit log | Log critical events | winston + audit table |
  | Logs without alerts | SIEM + alerting | ELK + alerting rules |
  | Logs with PII | Data masking | redact(email, phone) |

A10: SSRF
  | Vulnerability | Mitigation | Implementation |
  |--------------|------------|----------------|
  | User URL fetch | Domain allowlist | validateURL(url) |
  | Internal metadata | Block 169.254.169.254 | Network policy |
  | Redirect SSRF | No follow redirects | fetch(url, { redirect: "manual" }) |

Lessons:
  - OWASP Top 10 is the minimum, not the goal
  - Broken Access Control is #1: verify ownership on every request
  - Parameterized queries eliminate SQL injection
  - helmet() + strict CORS on every API
  - npm audit + Dependabot in CI for vulnerable deps
  - Immutable audit log for detection and response
```

### How do I integrate OWASP ZAP into CI/CD?

Use the ZAP Docker image in your pipeline: `docker run -t owasp/zap2docker-stable zap-baseline.py -t https://staging.example.com`. Configure baseline scan on PRs and full scan on merges to main. Save the report as an artifact. Fail the pipeline on HIGH or CRITICAL alerts. For APIs, use zap-api-scan with an OpenAPI spec.
