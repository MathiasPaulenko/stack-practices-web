---
contentType: docs
slug: penetration-test-report-template
title: "Plantilla de Informe de Prueba de Penetración"
description: "Una plantilla para informes de pruebas de penetración cubriendo alcance, metodología, hallazgos, severidad, evidencia y recomendaciones de remediación."
metaDescription: "Usá esta plantilla de informe de pentest para documentar alcance, metodología, hallazgos, severidad CVSS, evidencia y recomendaciones de remediación."
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
  metaDescription: "Usá esta plantilla de informe de pentest para documentar alcance, metodología, hallazgos, severidad CVSS, evidencia y recomendaciones de remediación."
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

Un penetration test report documenta los findings de un security assessment. Define el scope, methodology, vulnerabilities discovered, severity ratings, evidence y remediation recommendations. El report sirve como both un technical reference para engineering teams y un compliance artifact para auditors.

## When to Use

- Documentando resultados de un penetration test engagement
- Proveyendo evidence para compliance audits (PCI-DSS, SOC 2, ISO 27001)
- Comunicando security findings a engineering teams
- Trackeando remediation progress over time
- Comparando security posture across test cycles

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

El login endpoint en `/api/login` accepta un JSON payload con `username` y `password` fields. El `username` field se concatena directamente en un SQL query sin parameterization. Un attacker puede inyectar SQL commands para bypass authentication, extract database contents o execute administrative operations.

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

Un unauthenticated attacker puede:
- Bypassear authentication y log in como cualquier user
- Extract el entire database including PII, credentials y session tokens
- Modify o delete database records
- Potencialmente achieve remote code execution via `xp_cmdshell` o similar

#### Reproduction Steps

1. Navigateá a `https://app.example.com/login`
2. Enterá `admin' OR '1'='1'--` en el username field
3. Enterá any value en el password field
4. Clickeá "Login"
5. Observá successful authentication as administrator

#### Remediation

| Step | Action | Priority |
|------|--------|----------|
| 1 | Reemplazá string concatenation con parameterized queries | Immediate |
| 2 | Usá ORM o query builder con prepared statements | Immediate |
| 3 | Implementá input validation para all user inputs | High |
| 4 | Applyá least privilege al database user account | High |
| 5 | Deployeá WAF rule como temporary mitigation | Immediate |
| 6 | Conductí code review para other SQL injection points | High |

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

El API source code repository contiene hardcoded AWS access keys y database credentials en los source files. El repository es public, allowiendo a anyone extract estos credentials y acceder a production infrastructure.

#### Evidence

```
File: src/config/database.js (line 12)
const DB_PASSWORD = "Sup3rS3cr3tP@ss!";

File: src/config/aws.js (line 8)
const AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE";
const AWS_SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
```

#### Impact

Un attacker con acceso al public repository puede:
- Connect al production database con full credentials
- Usar AWS access keys para acceder a S3 buckets, Lambda functions y other cloud resources
- Pivotear a other services usando el same credentials
- Modify o delete production data

#### Remediation

| Step | Action | Priority |
|------|--------|----------|
| 1 | Rotateá all exposed credentials immediately | Immediate |
| 2 | Moveé credentials a environment variables o secrets manager | Immediate |
| 3 | Scanneá git history para all leaked secrets y purgeá | Immediate |
| 4 | Enableá GitLeaks pre-commit hook | High |
| 5 | Auditá AWS CloudTrail para unauthorized access | High |
| 6 | Implementá IAM role-based access en vez de long-lived keys | High |

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

El admin panel performa authorization checks solo en el frontend. Un regular user puede acceder a admin endpoints llamando directamente el API con su session token. El server no valida el user's role antes de return admin-only data.

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
| 1 | Implementá server-side role checks en all admin endpoints | Immediate |
| 2 | Usá middleware para authorization verification | High |
| 3 | Deny by default — allow solo explicitly permitted actions | High |
| 4 | Addeá automated tests para access control | Medium |

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

Un penetration test report tiene three audiences: engineers que fixean las vulnerabilities, executives que necesitan risk visibility y auditors que necesitan compliance evidence. El report structure sirve a los three.

El executive summary provee un high-level view para non-technical stakeholders. Include el total number de findings, severity distribution, trend compared a previous tests y el top critical findings. Executives necesitan entender el risk level y si está improving.

El scope y methodology section define qué se testeó y cómo. Esto es critical para auditors que necesitan verify que el test metió compliance requirements. El scope explicitamente lista qué estuvo in y out de scope. El methodology references industry standards (OWASP, PTES, NIST) para demonstrate rigor.

Cada finding sigue un consistent template: ID, title, severity, CVSS score, CWE mapping, description, proof of concept, impact, reproduction steps y remediation. El CVSS score provee un objective severity rating. El CWE mapping connecta el finding a un recognized vulnerability category. El proof of concept demonstrate que el vulnerability es real y exploitable, no theoretical.

Evidence es critical. Cada finding include el exact HTTP request, response o command que demonstrate el vulnerability. Esto allow a engineers reproduce el issue y verify su fix. Sin evidence, findings se dismiss como theoretical.

Remediation recommendations son specific y actionable. En vez de "fix el SQL injection," el recommendation dice "reemplazá string concatenation con parameterized queries" y provee code examples. Cada remediation step tiene un priority level matching el severity SLA.

El remediation tracker assigna owners y due dates. Esto transform el report de un document en un action plan. Sin ownership y deadlines, findings quedan open indefinitely.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| External black-box | No internal access, full recon | Testea real-world attack surface |
| Internal grey-box | Test account provided, some knowledge | Testea deeper application logic |
| White-box | Source code provided | Code review + dynamic testing |
| API-only | Focus en REST/GraphQL endpoints | OWASP API Security Top 10 |
| Mobile | iOS/Android binary testing | OWASP MASVS |
| Network | Internal network penetration | PTES network methodology |
| Cloud | AWS/Azure/GCP penetration | Cloud-specific attack vectors |

## What Works

1. Incluí evidence para every finding — screenshots, HTTP requests, commands
2. Mapeá findings a OWASP Top 10 y CWE — helps con compliance
3. Proveé specific remediation con code examples — no solo "fix it"
4. Assigná owners y due dates — accountability drivea remediation
5. Compará con previous test results — muestra trends y progress
6. Incluí both automated y manual testing — automated find low-hanging fruit, manual find logic flaws
7. Rateá severity con CVSS — objective, industry-standard scoring

## Common Mistakes

1. No evidence — findings se dismiss como theoretical
2. Vague remediation — "fix el vulnerability" sin specifics
3. No owner assignment — nobody es responsible para fixear
4. Testing solo automated tools — misses business logic flaws
5. No scope definition — lead a testear things que no matter
6. No comparison a previous tests — no podés measure improvement
7. Over-rating severity — perdé credibility con engineering teams

## Frequently Asked Questions

### ¿Cuál es la difference entre un penetration test y un vulnerability scan?

Un vulnerability scan es automated y identify known vulnerabilities checkeando para signatures y version numbers. Un penetration test es manual (o semi-automated) y intenta exploit vulnerabilities para determine real-world impact. Un scan might find que un library tiene un known CVE. Un penetration test determina si ese CVE es actually exploitable en tu specific configuration y qué un attacker podría hacer si exploited.

### ¿Cuán seguido deberíamos conduct penetration tests?

Al minimum annually. Para high-risk industries (financial, healthcare), quarterly o bi-annually. Después de major changes (new features, architecture changes, infrastructure migrations), conductí un targeted test de los changed components. Compliance frameworks pueden dictate frequency: PCI-DSS require annual testing, SOC 2 lo recommend, HIPAA lo require para significant changes.

### ¿Deberíamos usar internal testers o external consultants?

Both tienen value. External consultants traen fresh perspective y testean lo que no conocés. Internal testers entienden el system deeply y pueden test business logic que external testers would miss. Un common approach es external annual test + internal quarterly tests. Si usás external testers, rotateá vendors every 2-3 years para get different perspectives.

### ¿Qué deberíamos hacer si disentimos con un finding's severity?

Discutí con el tester durante el report review meeting. Proveé context que might have missed (compensating controls, network segmentation, data classification). Si el tester agree, update el severity. Si no, documentá tu rationale en el remediation tracker como un risk acceptance con management approval. No just ignore findings que disentís — documentá el disagreement.

### ¿Cómo verifyamos que remediation actually fixeó el vulnerability?

Re-testeá el specific finding después de remediation. El tester intenta el same exploit contra el patched system. Si el exploit no longer worked, el finding se mark como remediated. Incluí re-test results en un addendum al original report. Algunos engagements include re-testing como part del original scope; otros requiren un separate engagement.
