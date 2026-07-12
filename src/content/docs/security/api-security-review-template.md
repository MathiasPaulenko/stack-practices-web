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
  - /recipes/bash-ssh-key-manager
  - /docs/network-segmentation-policy-template
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


- For alternatives, see [API Security Checklist — Authentication to Encryption](/guides/api-security-checklist-guide/).

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

## API Security Review Checklist

```text
=== Authentication and Authorization ===

[ ] Authentication required on all endpoints (except health/public)
[ ] JWT validated: signature, expiration, issuer, audience
[ ] Refresh tokens: rotation, revocation, short expiration
[ ] OAuth2/OIDC: state validation, PKCE, redirect URI allowlist
[ ] RBAC or ABAC implemented and tested
[ ] No auth bypass via path traversal or HTTP method override
[ ] Rate limiting applied per user and per IP
[ ] MFA available and required for sensitive operations

=== Input Validation ===

[ ] All parameters validated (type, length, format, range)
[ ] SQL injection: parameterized queries, ORMs, no string concat
[ ] XSS: output encoding, Content-Security-Policy header
[ ] Command injection: no shell exec with user input
[ ] Path traversal: path validation, no user input in file paths
[ ] SSRF: domain allowlist for outbound requests
[ ] XML/JSON: size and depth limits (DoS prevention)
[ ] Content-Type validation on uploads

=== Data and Responses ===

[ ] No sensitive data in responses (passwords, tokens, unnecessary PII)
[ ] Encryption in transit (TLS 1.2+, HSTS header)
[ ] No secrets in URLs (tokens in headers, not query params)
[ ] Logging does not contain sensitive data (redact PII, tokens)
[ ] Error messages do not reveal internal info (stack traces, SQL)
[ ] CORS configured correctly (no wildcard in production)
[ ] Security headers: X-Content-Type-Options, X-Frame-Options, etc.
```


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


### How do we handle rate limiting and abuse prevention?

Implement rate limiting at multiple layers: per IP (Nginx, CloudFlare) to prevent DDoS, per user/token (API gateway) to prevent account abuse, and per endpoint (app-level) to protect expensive operations. Use the token bucket algorithm for flexibility or sliding window for precision. Configure differentiated limits: read endpoints can have higher limits than write endpoints. For public APIs: document the limits and return rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After). Monitor abuse patterns: a user consistently near the limit may be a bot. For abuse prevention: add CAPTCHA for signups, bot detection, and behavioral analysis.

### What security headers are mandatory for APIs?

Mandatory headers: Strict-Transport-Security (HSTS) — enforce HTTPS, minimum 1 year with preload. X-Content-Type-Options: nosniff — prevents MIME sniffing. X-Frame-Options: DENY or SAMEORIGIN — prevents clickjacking. Content-Security-Policy — prevents XSS (for APIs serving HTML). Access-Control-Allow-Origin — configured to specific domains, not wildcard. Cache-Control: no-store for responses with sensitive data. X-Request-ID — for request correlation in logs. For REST APIs: add X-API-Version for explicit versioning. Test headers with tools like securityheaders.com or OWASP ZAP.

### How do we review webhook security?

Webhooks are exposed endpoints that receive data from third parties. To secure them: validate the webhook signature (HMAC or asymmetric signature) — never process a webhook without verifying the signature. Use a shared secret rotated regularly. Validate the timestamp to prevent replay attacks (reject webhooks with timestamp > 5 minutes old). Implement idempotency — the same webhook sent twice must not cause duplicate effects. Rate limit your own webhook endpoint. Return 200 quickly and process async — the sender may timeout if processing takes too long. Log all received webhooks for audit. If webhook processing fails, implement retry with exponential backoff on the sender side.

### How do we handle API versioning from a security perspective?

API versioning has security implications: old versions may have known vulnerabilities. Document the lifecycle of each version: GA, deprecation, sunset. Monitor usage of old versions — if a version has low usage, accelerate sunset. For deprecated versions: add deprecation headers (Sunset, Deprecation) and notify users. Do not apply security fixes to deprecated versions — migrate users to the current version. If a Critical vulnerability affects a deprecated version: apply the fix but accelerate sunset. Document the support model: how long each version is supported, what fixes are applied.

### How do we test API security before deployment?

Integrate security testing into CI/CD: SAST for source code (Semgrep, SonarQube), DAST for runtime testing (OWASP ZAP, Burp Suite), dependency scanning (Snyk, Dependabot), and contract testing to verify API spec compliance. Run automated security scans on every PR. Conduct manual penetration testing before major releases. Use API fuzzing tools (Burp Intruder, ffuf) to test for unexpected inputs. Test authentication and authorization with negative tests (access without token, access with wrong role). Test rate limiting by sending burst requests. Test error handling for information disclosure. Security testing should be automated, repeatable, and fast.



































































End of document. Review and update quarterly.