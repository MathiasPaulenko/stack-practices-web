---
contentType: docs
slug: penetration-test-report-template
title: "Penetration Test Report Template"
description: "A template for penetration test reports covering scope, methodology, findings, severity ratings, evidence, and remediation recommendations."
metaDescription: "Use this penetration test report template to document scope, methodology, findings, CVSS severity, evidence, and remediation recommendations."
difficulty: intermediate
topics:
  - testing
tags:
  - security
  - penetration-testing
  - report
  - template
  - remediation
  - vulnerability
  - infrastructure
relatedResources:
  - /docs/security/security-audit-checklist
  - /docs/security/vulnerability-management-process-template
  - /docs/security/incident-response-plan-template
  - /docs/security/access-control-policy-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use this penetration test report template to document scope, methodology, findings, CVSS severity, evidence, and remediation recommendations."
  keywords:
    - penetration test
    - pentest report
    - security testing
    - vulnerability assessment
    - CVSS
    - remediation
    - template
---

## Overview

A penetration test report documents the findings of a security assessment. It defines the scope, methodology, vulnerabilities discovered, severity ratings, evidence, and remediation recommendations. The report serves as both a technical reference for engineering teams and a compliance artifact for auditors.

## When to Use

- Documenting results of a penetration test engagement
- Providing evidence for compliance audits (PCI-DSS, SOC 2, ISO 27001)
- Communicating security findings to engineering teams
- Tracking remediation progress over time
- Comparing security posture across test cycles

## Solution

```markdown
# Penetration Test Report — `<Organization Name>`

## Report Metadata

| Field | Value |
|-------|-------|
| Organization | Example Corp |
| Report Version | 1.0 |
| Test Date | 2026-06-15 to 2026-06-19 |
| Report Date | 2026-06-26 |
| Classification | Confidential |
| Prepared By | Security Team / External Tester |
| Approved By | CISO |
| Distribution | Engineering Leads, CISO, Auditors |

## 1. Executive Summary

### Assessment Overview

| Field | Value |
|-------|-------|
| Test type | Black-box external + Grey-box internal |
| Duration | 5 business days |
| Testers | 2 senior penetration testers |
| Scope | 3 web apps, 2 APIs, 1 mobile app, internal network |
| Findings | 14 total (2 critical, 4 high, 5 medium, 3 low) |
| Overall risk | High |
| Previous test | 2025-12-10 (12 findings, 8 remediated) |

### Risk Summary

| Severity | Count | Remediated | Open | Trend |
|----------|-------|------------|------|-------|
| Critical | 2 | 0 | 2 | +1 |
| High | 4 | 0 | 4 | +2 |
| Medium | 5 | 0 | 5 | -1 |
| Low | 3 | 0 | 3 | 0 |
| Informational | 0 | 0 | 0 | 0 |
| Total | 14 | 0 | 14 | +2 |

### Key Findings

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| PT-001 | SQL injection in login endpoint | Critical | Open |
| PT-002 | Hardcoded credentials in API repository | Critical | Open |
| PT-003 | Broken access control in admin panel | High | Open |
| PT-004 | Insecure deserialization in payment API | High | Open |
| PT-005 | Missing rate limiting on authentication | High | Open |
| PT-006 | Outdated TLS configuration on load balancer | High | Open |

## 2. Scope and Methodology

### Scope

| Asset | Type | Environment | Testing Access |
|-------|------|-------------|----------------|
| app.example.com | Web application | Production | Black-box |
| api.example.com | REST API | Production | Black-box |
| admin.example.com | Web application | Production | Grey-box (test account) |
| mobile app | iOS/Android | Production | Binary provided |
| Internal network | Network | Corporate | Internal access |

### Out of Scope

| Item | Reason |
|------|--------|
| Third-party SaaS | Not owned by organization |
| Legacy systems (EOL) | Scheduled for decommission |
| Physical security | Separate assessment |
| Social engineering | Separate engagement |
| DoS/DDoS | Agreed exclusion |

### Testing Methodology

| Phase | Activities | Duration | Tools |
|-------|-----------|----------|-------|
| Reconnaissance | DNS, subdomain enumeration, port scanning | 0.5 day | Amass, Nmap, Subfinder |
| Enumeration | Service fingerprinting, content discovery | 1 day | Nmap, Gobuster, ffuf |
| Vulnerability assessment | Automated + manual testing | 1.5 days | Burp Suite, OWASP ZAP, nuclei |
| Exploitation | Proof-of-concept development | 1.5 days | Burp Suite, sqlmap, Metasploit |
| Post-exploitation | Lateral movement, privilege escalation | 0.5 day | LinPEAS, WinPEAS, Mimikatz |
| Reporting | Documentation and evidence collection | Ongoing | Custom scripts |

### Testing Standards

| Standard | Coverage |
|----------|----------|
| OWASP Testing Guide v4.2 | Web application tests |
| OWASP API Security Top 10 | API tests |
| PTES (Penetration Testing Execution Standard) | Overall methodology |
| NIST SP 800-115 | Technical guide to testing |
| MITRE ATT&CK | Post-exploitation mapping |

## 3. Findings

### Finding Template

```
Finding ID: PT-XXX
Title: <short descriptive title>
Severity: <Critical/High/Medium/Low/Informational>
CVSS: <CVSS v3.1 vector and score>
CWE: <CWE ID and name>
OWASP: <OWASP category>
Status: <Open/Remediated/Accepted Risk>
Affected asset: <URL, host, component>
Affected versions: <version or "all">
Discovered by: <tester name>
Date discovered: <YYYY-MM-DD>
```

### PT-001: SQL Injection in Login Endpoint

| Field | Value |
|------|-------|
| Severity | Critical |
| CVSS | 9.8 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| CWE | CWE-89: SQL Injection |
| OWASP | A03:2021 — Injection |
| Status | Open |
| Affected asset | https://app.example.com/api/login |
| Discovered by | Tester A |
| Date | 2026-06-16 |

#### Description

The login endpoint at `/api/login` accepts a JSON payload with `username` and `password` fields. The `username` field is concatenated directly into a SQL query without parameterization. An attacker can inject SQL commands to bypass authentication, extract database contents, or execute administrative operations.

#### Proof of Concept

```http
POST /api/login HTTP/1.1
Host: app.example.com
Content-Type: application/json

{
  "username": "admin' OR '1'='1'--",
  "password": "anything"
}
```

Response:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": "admin",
  "role": "administrator"
}
```

#### Impact

An unauthenticated attacker can:
- Bypass authentication and log in as any user
- Extract the entire database including PII, credentials, and session tokens
- Modify or delete database records
- Potentially achieve remote code execution via `xp_cmdshell` or similar

#### Reproduction Steps

1. Navigate to `https://app.example.com/login`
2. Enter `admin' OR '1'='1'--` in the username field
3. Enter any value in the password field
4. Click "Login"
5. Observe successful authentication as administrator

#### Remediation

| Step | Action | Priority |
|------|--------|----------|
| 1 | Replace string concatenation with parameterized queries | Immediate |
| 2 | Use ORM or query builder with prepared statements | Immediate |
| 3 | Implement input validation for all user inputs | High |
| 4 | Apply least privilege to database user account | High |
| 5 | Deploy WAF rule as temporary mitigation | Immediate |
| 6 | Conduct code review for other SQL injection points | High |

```python
# Vulnerable code
query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
cursor.execute(query)

# Remediated code
query = "SELECT * FROM users WHERE username = %s AND password = %s"
cursor.execute(query, (username, password))
```

#### References

| Resource | URL |
|----------|-----|
| OWASP SQL Injection | https://owasp.org/www-community/attacks/SQL_Injection |
| CWE-89 | https://cwe.mitre.org/data/definitions/89.html |
| PortSwigger Guide | https://portswigger.net/web-security/sql-injection |

### PT-002: Hardcoded Credentials in API Repository

| Field | Value |
|------|-------|
| Severity | Critical |
| CVSS | 9.1 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N) |
| CWE | CWE-798: Use of Hard-coded Credentials |
| OWASP | A07:2021 — Identification and Authentication Failures |
| Status | Open |
| Affected asset | https://github.com/example/api (public repo) |
| Discovered by | Tester B |
| Date | 2026-06-16 |

#### Description

The API source code repository contains hardcoded AWS access keys and database credentials in the source files. The repository is public, allowing anyone to extract these credentials and access production infrastructure.

#### Evidence

```
File: src/config/database.js (line 12)
const DB_PASSWORD = "Sup3rS3cr3tP@ss!";

File: src/config/aws.js (line 8)
const AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE";
const AWS_SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
```

#### Impact

An attacker with access to the public repository can:
- Connect to the production database with full credentials
- Use AWS access keys to access S3 buckets, Lambda functions, and other cloud resources
- Pivot to other services using the same credentials
- Modify or delete production data

#### Remediation

| Step | Action | Priority |
|------|--------|----------|
| 1 | Rotate all exposed credentials immediately | Immediate |
| 2 | Move credentials to environment variables or secrets manager | Immediate |
| 3 | Scan git history for all leaked secrets and purge | Immediate |
| 4 | Enable GitLeaks pre-commit hook | High |
| 5 | Audit AWS CloudTrail for unauthorized access | High |
| 6 | Implement IAM role-based access instead of long-lived keys | High |

### PT-003: Broken Access Control in Admin Panel

| Field | Value |
|------|-------|
| Severity | High |
| CVSS | 8.1 (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N) |
| CWE | CWE-284: Improper Access Control |
| OWASP | A01:2021 — Broken Access Control |
| Status | Open |
| Affected asset | https://admin.example.com/users |
| Discovered by | Tester A |
| Date | 2026-06-17 |

#### Description

The admin panel performs authorization checks only on the frontend. A regular user can access admin endpoints by directly calling the API with their session token. The server does not validate the user's role before returning admin-only data.

#### Proof of Concept

```http
GET /api/admin/users HTTP/1.1
Host: admin.example.com
Authorization: Bearer <regular_user_token>
```

Response:
```http
HTTP/1.1 200 OK
Content-Type: application/json

[
  {"id": 1, "username": "admin", "email": "admin@example.com", "role": "admin"},
  {"id": 2, "username": "user1", "email": "user1@example.com", "role": "user"}
]
```

#### Remediation

| Step | Action | Priority |
|------|--------|----------|
| 1 | Implement server-side role checks on all admin endpoints | Immediate |
| 2 | Use middleware for authorization verification | High |
| 3 | Deny by default — allow only explicitly permitted actions | High |
| 4 | Add automated tests for access control | Medium |

## 4. Severity Rating Methodology

### CVSS v3.1 Scoring

| CVSS Score | Severity | Color |
|------------|----------|-------|
| 9.0 - 10.0 | Critical | Red |
| 7.0 - 8.9 | High | Orange |
| 4.0 - 6.9 | Medium | Yellow |
| 0.1 - 3.9 | Low | Blue |
| 0.0 | Informational | Green |

### Risk Matrix

| Impact \ Likelihood | Low | Medium | High |
|---------------------|-----|--------|------|
| High | Medium | High | Critical |
| Medium | Low | Medium | High |
| Low | Low | Low | Medium |

### Likelihood Factors

| Factor | Low | Medium | High |
|--------|-----|--------|------|
| Attack complexity | Advanced | Moderate | Low |
| Authentication required | Admin | User | None |
| Network access | Local | Adjacent | Network |
| Public exploit | No | Theoretical | Available |

## 5. Remediation Summary

### Remediation Priority

| Priority | Severity | SLA | Owner |
|----------|----------|-----|-------|
| P0 | Critical | 24 hours | Engineering Lead |
| P1 | High | 7 days | Engineering Lead |
| P2 | Medium | 30 days | Team Lead |
| P3 | Low | 90 days | Developer |

### Remediation Tracker

| ID | Title | Severity | Owner | Due Date | Status |
|----|-------|----------|-------|----------|--------|
| PT-001 | SQL injection in login | Critical | Backend Lead | 2026-06-17 | Open |
| PT-002 | Hardcoded credentials | Critical | DevOps Lead | 2026-06-17 | Open |
| PT-003 | Broken access control | High | Backend Lead | 2026-06-24 | Open |
| PT-004 | Insecure deserialization | High | Backend Lead | 2026-06-24 | Open |
| PT-005 | Missing rate limiting | High | DevOps Lead | 2026-06-24 | Open |
| PT-006 | Outdated TLS config | High | DevOps Lead | 2026-06-24 | Open |

## 6. Appendix

### Tools Used

| Tool | Version | Purpose |
|------|---------|---------|
| Burp Suite Professional | 2026.5 | Web proxy, scanning, exploitation |
| OWASP ZAP | 2.15 | Automated web scanning |
| Nmap | 7.95 | Network scanning |
| sqlmap | 1.8 | SQL injection automation |
| Gobuster | 3.6 | Directory enumeration |
| Amass | 4.2 | Subdomain enumeration |
| nuclei | 3.3 | Template-based scanning |
| LinPEAS | 20240412 | Linux privilege escalation |
| GitLeaks | 8.21 | Secret scanning |

### Test Coverage

| Asset | Tests Run | Tests Passed | Tests Failed | Coverage |
|-------|-----------|--------------|--------------|----------|
| app.example.com | 142 | 138 | 4 | 97% |
| api.example.com | 98 | 95 | 3 | 97% |
| admin.example.com | 87 | 83 | 4 | 95% |
| mobile app | 56 | 54 | 2 | 96% |
| internal network | 72 | 69 | 3 | 96% |
| Total | 455 | 439 | 16 | 96% |

### OWASP Top 10 Coverage

| OWASP Category | Tested | Findings |
|----------------|--------|----------|
| A01: Broken Access Control | ✅ | 2 |
| A02: Cryptographic Failures | ✅ | 1 |
| A03: Injection | ✅ | 1 |
| A04: Insecure Design | ✅ | 0 |
| A05: Security Misconfiguration | ✅ | 2 |
| A06: Vulnerable Components | ✅ | 1 |
| A07: Auth Failures | ✅ | 2 |
| A08: Software/Data Integrity | ✅ | 1 |
| A09: Logging/Monitoring Failures | ✅ | 1 |
| A10: SSRF | ✅ | 0 |
```

## Explanation

A penetration test report has three audiences: engineers who fix the vulnerabilities, executives who need risk visibility, and auditors who need compliance evidence. The report structure serves all three.

The executive summary provides a high-level view for non-technical stakeholders. It includes the total number of findings, severity distribution, trend compared to previous tests, and the top critical findings. Executives need to understand the risk level and whether it's improving.

The scope and methodology section defines what was tested and how. This is critical for auditors who need to verify that the test met compliance requirements. The scope explicitly lists what was in and out of scope. The methodology references industry standards (OWASP, PTES, NIST) to demonstrate rigor.

Each finding follows a consistent template: ID, title, severity, CVSS score, CWE mapping, description, proof of concept, impact, reproduction steps, and remediation. The CVSS score provides an objective severity rating. The CWE mapping connects the finding to a recognized vulnerability category. The proof of concept demonstrates that the vulnerability is real and exploitable, not theoretical.

Evidence is critical. Every finding includes the exact HTTP request, response, or command that demonstrates the vulnerability. This allows engineers to reproduce the issue and verify their fix. Without evidence, findings are dismissed as theoretical.

Remediation recommendations are specific and actionable. Instead of "fix the SQL injection," the recommendation says "replace string concatenation with parameterized queries" and provides code examples. Each remediation step has a priority level matching the severity SLA.

The remediation tracker assigns owners and due dates. This transforms the report from a document into an action plan. Without ownership and deadlines, findings remain open indefinitely.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| External black-box | No internal access, full recon | Tests real-world attack surface |
| Internal grey-box | Test account provided, some knowledge | Tests deeper application logic |
| White-box | Source code provided | Code review + dynamic testing |
| API-only | Focus on REST/GraphQL endpoints | OWASP API Security Top 10 |
| Mobile | iOS/Android binary testing | OWASP MASVS |
| Network | Internal network penetration | PTES network methodology |
| Cloud | AWS/Azure/GCP penetration | Cloud-specific attack vectors |

## What Works

1. Include evidence for every finding — screenshots, HTTP requests, commands
2. Map findings to OWASP Top 10 and CWE — helps with compliance
3. Provide specific remediation with code examples — not just "fix it"
4. Assign owners and due dates — accountability drives remediation
5. Compare to previous test results — shows trends and progress
6. Include both automated and manual testing — automated finds low-hanging fruit, manual finds logic flaws
7. Rate severity with CVSS — objective, industry-standard scoring

## Common Mistakes

1. No evidence — findings are dismissed as theoretical
2. Vague remediation — "fix the vulnerability" without specifics
3. No owner assignment — nobody is responsible for fixing
4. Testing only automated tools — misses business logic flaws
5. No scope definition — leads to testing things that don't matter
6. No comparison to previous tests — can't measure improvement
7. Over-rating severity — loses credibility with engineering teams

## Frequently Asked Questions

### What is the difference between a penetration test and a vulnerability scan?

A vulnerability scan is automated and identifies known vulnerabilities by checking for signatures and version numbers. A penetration test is manual (or semi-automated) and attempts to exploit vulnerabilities to determine real-world impact. A scan might find that a library has a known CVE. A penetration test determines whether that CVE is actually exploitable in your specific configuration and what an attacker could do if exploited.

### How often should we conduct penetration tests?

At minimum annually. For high-risk industries (financial, healthcare), quarterly or bi-annually. After major changes (new features, architecture changes, infrastructure migrations), conduct a targeted test of the changed components. Compliance frameworks may dictate frequency: PCI-DSS requires annual testing, SOC 2 recommends it, HIPAA requires it for significant changes.

### Should we use internal testers or external consultants?

Both have value. External consultants bring fresh perspective and test what you don't know about. Internal testers understand the system deeply and can test business logic that external testers would miss. A common approach is external annual test + internal quarterly tests. If using external testers, rotate vendors every 2-3 years to get different perspectives.

### What should we do if we disagree with a finding's severity?

Discuss with the tester during the report review meeting. Provide context they may have missed (compensating controls, network segmentation, data classification). If the tester agrees, they update the severity. If not, document your rationale in the remediation tracker as a risk acceptance with management approval. Don't just ignore findings you disagree with — document the disagreement.

### How do we verify that remediation actually fixed the vulnerability?

Re-test the specific finding after remediation. The tester attempts the same exploit against the patched system. If the exploit no longer works, the finding is marked as remediated. Include re-test results in an addendum to the original report. Some engagements include re-testing as part of the original scope; others require a separate engagement.
