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
  - penetration-test
  - pentest
  - security-assessment
  - vulnerability-report
  - template
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

Use this template to document security assessment findings clearly and actionably.

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

## Best Practices

- **Include proof of concept** — without reproduction steps, developers cannot fix it
- **Rate risk in business context** — a theoretically critical bug on an internal-only admin page may be medium risk
- **Provide code-level remediation** — "fix the injection" is not enough; show parameterized query syntax
- **Track remediation like a sprint** — assign owners and due dates

## Common Mistakes

- Vague findings — "the app has XSS" without URL or parameter
- No screenshots or PoC — developers waste time reproducing
- Missing retest date — remediation without verification is incomplete
- Scoring by CVSS alone — business context matters more than formula

## Frequently Asked Questions

### How do I prioritize findings when everything seems critical?

Use the risk matrix: likelihood × impact. A SQL injection on a public login form is critical. The same bug on an internal read-only report may be medium. Consider exploitability and data sensitivity.

### Should every finding be fixed?

No. Some risks may be accepted if the cost of fixing exceeds the impact and compensating controls exist. Document accepted risks with executive sign-off and review dates.

### Who should receive the full report?

Security team, engineering leads, and executive leadership (executive summary only). Share detailed findings on a need-to-know basis to prevent weaponization.
