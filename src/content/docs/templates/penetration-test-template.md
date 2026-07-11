---
contentType: docs
slug: penetration-test-template
templateType: guideline
title: "Penetration Test Report Template"
description: "A penetration test report template for documenting findings, risk ratings, reproduction steps, and remediation guidance for security assessments."
metaDescription: "Penetration test report template: document findings, risk ratings, reproduction steps, and remediation guidance for security assessments."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - template
  - vulnerabilities
  - encryption
  - owasp
relatedResources:
  - /guides/security/web-application-security-guide
  - /docs/templates/security-incident-response-template
  - /docs/templates/bug-report-template
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Penetration test report template: document findings, risk ratings, reproduction steps, and remediation guidance for security assessments."
  keywords:
    - penetration test report template
    - pentest report format
    - security assessment template
    - vulnerability report template
    - security findings documentation
---

# Penetration Test Report Template

Use this template to document security assessment findings clearly and actionably. See [Web Application Security Guide](/guides/security/web-application-security-guide) for broader security practices.

## Template

```markdown
# Penetration Test Report

## Executive Summary

| Field | Value |
|-------|-------|
| **Target** | [application / network / API] |
| **Scope** | [in-scope and out-of-scope URLs / IPs] |
| **Test period** | [YYYY-MM-DD to YYYY-MM-DD] |
| **Tester** | [internal team / vendor] |
| **Overall risk** | [Critical / High / Medium / Low] |

## Risk Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | [N] | [open / remediated] |
| High | [N] | [open / remediated] |
| Medium | [N] | [open / remediated] |
| Low | [N] | [open / remediated] |
| Informational | [N] | [open / remediated] |

## Finding Template

### [FINDING-001] [Title]

| Field | Value |
|-------|-------|
| **Severity** | [Critical / High / Medium / Low / Info] |
| **CVSS** | [score] |
| **Category** | [OWASP category] |
| **Status** | [open / remediated / accepted risk] |

#### Description
What the vulnerability is and why it matters.

#### Affected Resources
- URL: `https://example.com/api/v1/users`
- Parameter: `id`
- Component: User controller

#### Proof of Concept
```bash
curl "https://example.com/api/v1/users?id=1 OR 1=1"
# Returns all users — SQL injection confirmed
```

#### Impact
What an attacker could do with this vulnerability.

#### Remediation
Specific steps to fix. Include code examples if applicable.

#### References
- OWASP: [link]
- CVE: [if applicable]
```

## Remediation Tracking

| ID | Finding | Owner | Due Date | Status |
|----|---------|-------|----------|--------|
| 001 | SQL Injection | Backend team | +7 days | In progress |
| 002 | XSS | Frontend team | +14 days | Open |

## Risk Rating Matrix

| Likelihood \ Impact | Low | Medium | High |
|---------------------|-----|--------|------|
| High | Medium | High | Critical |
| Medium | Low | Medium | High |
| Low | Info | Low | Medium |
```

## What Works

- **Include proof of concept** — without reproduction steps, developers cannot fix it
- **Rate risk in business context** — a theoretically critical bug on an internal-only admin page may be medium risk
- **Provide code-level remediation** — "fix the injection" is not enough; show parameterized query syntax. See [Web Application Security Guide](/guides/security/web-application-security-guide) for code examples.
- **Track remediation like a sprint** — assign owners and due dates

## Common Mistakes

- Vague findings — "the app has XSS" without URL or parameter
- No screenshots or PoC — developers waste time reproducing
- Missing retest date — remediation without verification is incomplete. Track follow-ups with the [Security Incident Response Template](/docs/templates/security-incident-response-template).
- Scoring by CVSS alone — business context matters more than formula

## Frequently Asked Questions

### How do I prioritize findings when everything seems critical?

Use the risk matrix: likelihood × impact. Consult the [Web Application Security Guide](/guides/security/web-application-security-guide) for threat modeling context. A SQL injection on a public login form is critical. The same bug on an internal read-only report may be medium. Consider exploitability and data sensitivity.

### Should every finding be fixed?

No. Some risks may be accepted if the cost of fixing exceeds the impact and compensating controls exist. Document accepted risks with executive sign-off and review dates.

### Who should receive the full report?

Security team, engineering leads, and executive leadership (executive summary only). Share detailed findings on a need-to-know basis to prevent weaponization.


## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Web app | OWASP Top 10 + ASVS | Focus on input validation and auth |
| REST API | OWASP API Security Top 10 | Focus on rate limiting and auth |
| Mobile app | OWASP MASVS | Include APK/IPA analysis |
| Cloud infrastructure | CIS Benchmarks + network pentest | Include IAM and network policies |
| Internal red team | No prior notification | Simulate real attacker |

## Pen-Test Plan Example

```text
=== Penetration Test Plan: payment-service ===

Objective: Assess the security posture of the payment service
Date: 2026-08-15 to 2026-08-19
Tester: Security Firm XYZ
SPOC: alice@company.com

Scope:
  In-scope URLs:
    - https://api.company.com/payments/*
    - https://api.company.com/orders/*
  Out-of-scope URLs:
    - https://api.company.com/auth/* (tested in previous pentest)
    - https://admin.company.com (out of scope this engagement)

  Test accounts:
    - test-user-1@company.com (role: customer)
    - test-user-2@company.com (role: merchant)
    - test-admin@company.com (role: admin)

  Data rules:
    - Synthetic test data only
    - No access to real production data
    - No modification of persistent data

Rules of Engagement:
  - Testing hours: 09:00-18:00 UTC-5
  - Rate limit: max 100 requests/second
  - No DoS-inducing exploits
  - No social engineering
  - No physical testing
  - Notify immediately if a Critical finding is discovered

Methodology:
  - OWASP Testing Guide v4.2
  - OWASP API Security Top 10
  - PTES (Penetration Testing Execution Standard)

Deliverables:
  - Executive report (for leadership)
  - Technical report (for engineering)
  - Findings in CSV format (for tracker import)
  - Debrief presentation (2-hour session)

Schedule:
  Day 1: Reconnaissance and attack surface mapping
  Day 2: Authentication and authorization testing
  Day 3: Business logic and payment flow testing
  Day 4: Infrastructure and configuration testing
  Day 5: Reporting and debrief
```

### How do we choose a penetration testing firm?

Evaluate firms by: certifications (OSCP, CEH, CISSP), experience in your industry (fintech, healthcare, e-commerce), references from previous clients, methodology (OWASP, PTES), and quality of previous reports. Request a sample anonymized report — report quality is as important as testing quality. Verify the firm has professional liability insurance. Ensure the firm signs an NDA before sharing any information. Compare prices but do not choose on price alone — a cheap pentest may miss critical findings. Maintain a continuous relationship with the firm — testers who know your system find deeper issues.

### How do we prepare the team for a pen-test?

Notify the team 2 weeks in advance: dates, scope, and SPOC. Ensure the SPOC has dedicated availability during the pen-test (not on-call for something else). Prepare test accounts with synthetic data. Prepare access to staging and production (if applicable). Document the current architecture and share with the tester. Configure extra monitoring during the pen-test to detect if testing causes impact. Schedule a kickoff call on day 1 and a debrief call on the last day. Ensure the team knows not to block tester traffic unless it causes real impact.

### What do we do after receiving the pen-test report?

Import all findings into the remediation tracker within 48 hours. Classify each finding by severity (Critical/High/Medium/Low/Informational). Assign an owner to each finding. Schedule remediation per SLAs: Critical 24-48h, High 1 week, Medium 30 days, Low 90 days. Schedule the retest window with the firm (30-90 days). Share sanitized findings with the rest of engineering — patterns repeat. Conduct a postmortem of the pen-test process: what worked, what did not, what to improve. Update the threat model with new findings. Add regression tests to CI/CD to prevent recurrence.



















































































End of document. Review and update quarterly.