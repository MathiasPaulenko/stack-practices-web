---
contentType: docs
slug: api-security-review-template
title: "API Security Review Template"
description: "A checklist template for reviewing API authentication, rate limiting, and OWASP compliance."
metaDescription: "Use this API security review template to audit authentication, authorization, rate limiting, input validation, and OWASP Top 10 risks."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - api
  - owasp
  - authentication
  - rate-limiting
  - template
relatedResources:
  - /guides/api-security-checklist-guide
  - /guides/security-best-practices-guide
  - /recipes/hmac-request-signing
  - /docs/incident-response-playbook-template
  - /docs/data-retention-policy-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this API security review template to audit authentication, authorization, rate limiting, input validation, and OWASP Top 10 risks."
  keywords:
    - security
    - api
    - owasp
    - authentication
    - rate-limiting
    - template
---
## Overview

APIs are the front door to your application. A single missing authorization check or unvalidated input can expose customer data, allow account takeover, or enable Denial of Service attacks. This checklist template provides a systematic review process covering authentication, authorization, input validation, rate limiting, and OWASP Top 10 risks.

## When to Use

Use this resource when:
- Releasing a new public or internal API to production
- Performing a quarterly security audit of existing APIs
- Onboarding a new service that consumes or exposes APIs

## Solution

```markdown
# API Security Review: `<API Name>`

## 1. Metadata

| Field | Value |
|-------|-------|
| API Name | `name` |
| Exposure | `Internal / Partner / Public` |
| Auth Type | `OAuth2 / API Key / mTLS / None` |
| Reviewer | `@security-team` |
| Date | `YYYY-MM-DD` |

## 2. Authentication & Authorization

### 2.1. Authentication

- [ ] All endpoints require authentication except explicitly documented public ones
- [ ] API keys are rotated every 90 days and stored in a secrets manager
- [ ] OAuth2 tokens use short expiration (max 1 hour) with refresh tokens
- [ ] JWT tokens are validated (signature, expiry, issuer, audience)
- [ ] mTLS is enforced for service-to-service communication in production
- [ ] Credentials are never logged, returned in errors, or stored in URLs

### 2.2. Authorization

- [ ] Access control checks the resource owner, not just authentication status
- [ ] Horizontal access control: User A cannot access User B's `/users/{id}` data
- [ ] Vertical access control: Admin endpoints reject non-admin tokens
- [ ] Role/permission claims are validated server-side, never trusted from client
- [ ] Sub-resources inherit parent permissions (e.g., `/orders/{id}/items`)

## 3. Input Validation & Output Encoding

### 3.1. Request Validation

- [ ] All inputs validated against a strict schema (JSON Schema, OpenAPI)
- [ ] Max payload size enforced at gateway (e.g., 1 MB)
- [ ] Content-Type header checked and unexpected types rejected
- [ ] Path parameters validated against expected patterns (UUID, slug, numeric)
- [ ] Query parameters have max length and allowed character sets
- [ ] File uploads scanned for malware and restricted to safe extensions

### 3.2. OWASP Top 10 Checks

| Risk | Check | Status |
|------|-------|--------|
| A01 Broken Access Control | Owner checks on all resource endpoints | Pass / Fail |
| A02 Cryptographic Failures | TLS 1.2+, no weak ciphers | Pass / Fail |
| A03 Injection | Parameterized queries only | Pass / Fail |
| A04 Insecure Design | Rate limits on all public endpoints | Pass / Fail |
| A05 Security Misconfiguration | Default credentials removed | Pass / Fail |
| A06 Vulnerable Components | Dependency scan within 30 days | Pass / Fail |
| A07 Auth Failures | Brute-force protection on login | Pass / Fail |
| A08 Data Integrity | Response signatures for sensitive data | Pass / Fail |
| A09 Logging Failures | Security events logged (no secrets) | Pass / Fail |
| A10 SSRF | URL inputs validated against allowlist | Pass / Fail |

## 4. Rate Limiting & Abuse Prevention

- [ ] Rate limits defined per consumer and per endpoint
- [ ] Burst limits documented and tested
- [ ] Rate limit headers returned (`X-RateLimit-Limit`, `X-RateLimit-Remaining`)
- [ ] DDoS protection enabled at CDN / WAF layer
- [ ] Slowloris and large payload attacks mitigated at gateway
- [ ] Account lockout after N failed authentication attempts

## 5. Data Protection

- [ ] PII masked or tokenized in logs
- [ ] Sensitive data encrypted at rest (AES-256) and in transit (TLS)
- [ ] Response filtering removes fields based on user role
- [ ] CORS policy is explicit and does not allow `*` for credentials
- [ ] Cache headers prevent sensitive data caching (`Cache-Control: no-store`)

## 6. Error Handling & Logging

- [ ] Error messages do not leak stack traces, SQL, or internal paths
- [ ] Error responses use generic messages for auth failures (prevent user enumeration)
- [ ] All security events (auth success/failure, access denied) logged
- [ ] Logs forwarded to a SIEM with tamper protection
- [ ] Log retention policy documented and enforced (min 90 days)
```

## Explanation

The checklist follows a **defense-in-depth** model: authentication at the edge, authorization at the service, validation at every layer. The OWASP Top 10 table maps each risk to a verifiable check so auditors can trace compliance. Owner checks (horizontal access control) are the most commonly missed item in API reviews. Input validation at the gateway prevents malformed requests from reaching application code. Rate limiting protects against both abuse and accidental cascading failures.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Internal APIs | Light review, focus on auth | Skip DDoS and CORS if behind VPN |
| Partner APIs | Contract + review | Require security questionnaire from partner |
| Public SaaS APIs | Full review + pen test | Engage third-party penetration testing annually |

## What Works

1. Run the checklist before every production release, not just annually
2. Automate what you can: dependency scans, secret detection, schema validation
3. Store completed reviews in a shared location for auditors
4. Require two reviewers for public-facing APIs (one security, one engineering)
5. Retest within 30 days of any security incident or breach disclosure

## Common Mistakes

1. Assuming internal APIs are safe because they are behind a firewall
2. Validating inputs only at the frontend and trusting the API client
3. Returning detailed error messages that reveal database structure
4. Forgetting to validate the `audience` claim in JWT tokens
5. Rate limiting by IP only, ignoring authenticated consumer IDs

## Frequently Asked Questions

### How often should I review my APIs?

Quarterly for public APIs, biannually for internal APIs. Also review after every major dependency upgrade, infrastructure change, or security incident.

### Should I review third-party APIs I consume?

Yes. Document their security posture (SOC 2, pen test reports), validate TLS certificates, and audit what data you send them. Never forward PII to a third party without a Data Processing Agreement.

### What tools can automate parts of this checklist?

- **SAST**: SonarQube, Semgrep for code-level issues
- **DAST**: OWASP ZAP, Burp Suite for runtime testing
- **Dependency scanning**: Snyk, Dependabot
- **Secret scanning**: GitLeaks, TruffleHog
- **API security**: 42Crunch, StackHawk for OpenAPI validation
