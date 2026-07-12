---
contentType: docs
slug: security-audit-checklist-template
title: "Security Audit Checklist"
description: "A thorough checklist for conducting security audits of applications and infrastructure."
metaDescription: "Use this security audit checklist to review authentication, authorization, data protection, infrastructure security, and compliance gaps."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - audit
  - checklist
  - compliance
  - infrastructure
relatedResources:
  - /docs/data-retention-policy-template
  - /recipes/encryption-at-rest
  - /docs/dependency-audit-template
  - /docs/penetration-test-template
  - /docs/security-incident-response-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this security audit checklist to review authentication, authorization, data protection, infrastructure security, and compliance gaps."
  keywords:
    - security
    - audit
    - checklist
    - compliance
    - infrastructure
---
## Overview

Security audits identify vulnerabilities before attackers do. A repeatable checklist ensures no critical area is overlooked, from authentication and authorization to infrastructure hardening and compliance. This template covers application-level and infrastructure-level security checks.

## When to Use

Use this resource when:
- Conducting a quarterly or annual security review
- Onboarding a new application or service to production
- Responding to a security incident with a post-incident review

## Solution

```markdown
# Security Audit Checklist

## 1. Authentication & Authorization

- [ ] All user-facing endpoints require authentication
- [ ] Passwords are hashed with bcrypt, Argon2, or PBKDF2 (not MD5/SHA1)
- [ ] Multi-factor authentication is enforced for admin / privileged roles
- [ ] Session tokens use cryptographically secure random generation
- [ ] Session expiration and refresh token rotation are configured
- [ ] Role-based access control (RBAC) is implemented and enforced server-side
- [ ] API keys are stored in a secrets manager, not in code or logs
- [ ] OAuth / OIDC flows use PKCE for public clients
- [ ] Rate limiting is applied to login, password reset, and registration endpoints

## 2. Data Protection

- [ ] Sensitive data is encrypted at rest (database, files, backups)
- [ ] TLS 1.2+ is enforced for all network communications
- [ ] PII is minimized, anonymized where possible, and subject to retention policies
- [ ] Database columns storing passwords or tokens use appropriate encryption
- [ ] Backups are encrypted and access is restricted to authorized roles
- [ ] Data deletion workflows comply with GDPR / CCPA "right to be forgotten"

## 3. Input Validation & Output Encoding

- [ ] All user inputs are validated on the server side (not just client side)
- [ ] Parameterized queries or ORMs are used for all database access
- [ ] HTML output is encoded to prevent XSS attacks
- [ ] File uploads are restricted by type, size, and scanned for malware
- [ ] Content Security Policy (CSP) headers are configured and enforced
- [ ] CSRF tokens protect state-changing operations

## 4. Infrastructure & Network

- [ ] Cloud resources use least-privilege IAM roles and policies
- [ ] Security groups / firewall rules allow only required ports and sources
- [ ] Public-facing services run behind a WAF or reverse proxy
- [ ] Container images are scanned for CVEs before deployment
- [ ] Secrets (DB passwords, API keys) are injected at runtime, not baked into images
- [ ] Log aggregation is centralized and tamper-protected
- [ ] DDoS protection is enabled at the edge (Cloudflare, AWS Shield)

## 5. Logging & Monitoring

- [ ] Authentication failures, access denials, and privilege escalations are logged
- [ ] Logs do not contain passwords, tokens, or credit card numbers
- [ ] Alerts exist for suspicious patterns: brute force, unusual data access, rate limit hits
- [ ] Audit logs are retained for at least 90 days and are immutable

## 6. Dependency & Supply Chain

- [ ] Dependency scanning tools (Snyk, Dependabot, OWASP DC) are active
- [ ] No high or critical CVEs in direct dependencies without a mitigation plan
- [ ] Container base images are from trusted sources and regularly updated
- [ ] Software Bill of Materials (SBOM) is generated for each release

## 7. Compliance & Documentation

- [ ] Security policies are documented and reviewed annually
- [ ] Incident response runbook exists and is tested with tabletop exercises
- [ ] Data classification labels (Public, Internal, Confidential, Restricted) are applied
- [ ] Third-party vendors with data access have signed DPA / BAA agreements
- [ ] Penetration tests are conducted annually by external firms
```

## Explanation

The checklist is organized by **security domain** so teams can divide work across specialties: backend engineers handle auth and input validation, DevOps secures infrastructure, and compliance teams validate documentation. Each item is a binary pass/fail to keep audits objective. The template can be copy-pasted into a ticketing system or run as an automated compliance scan.

## Security Audit Execution Guide

```text
=== Pre-Audit Preparation (1 week before) ===

[ ] Define audit scope (which services, environments, teams)
[ ] Notify teams of audit dates and required evidence
[ ] Gather existing security documentation (policies, procedures)
[ ] Review previous audit findings and remediation status
[ ] Prepare access to systems, repos, and infrastructure for auditor
[ ] Schedule interviews with team leads and security owners

=== During Audit ===

[ ] Walk through each checklist section with the responsible team
[ ] Capture evidence: screenshots, config files, policy links, tool output
[ ] Document findings: pass, fail, partial, not applicable
[ ] Assign severity to each finding: Critical, High, Medium, Low
[ ] Note remediation steps for each finding
[ ] Identify quick wins (fixable within 1 week)
[ ] Identify long-term items (require planning or budget)

=== Post-Audit (1 week after) ===

[ ] Compile audit report with findings and evidence
[ ] Share report with engineering leadership and security team
[ ] Create tickets for each finding with severity and due date
[ ] Schedule remediation review for 30/60/90 days
[ ] Update security policies based on audit learnings
[ ] Plan next audit date (quarterly for critical services)
```

## Security Audit Evidence Templates

```text
=== Evidence: Authentication Review ===

Service: [SERVICE_NAME]
Date: [DATE]
Reviewer: [NAME]

Authentication method: [OAuth2 / SAML / JWT / Session]
MFA enforced: [Yes / No]
Password policy: [Min length, complexity, rotation]
Session timeout: [Duration]
Failed login lockout: [Threshold and duration]
Evidence: [Screenshot of auth config / link to policy]

Finding: [Pass / Fail / Partial]
Notes: [OBSERVATIONS]
```


## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Startup | Lightweight subset | Focus on auth, input validation, and dependency scanning first |
| Enterprise | Full checklist + evidence | Require screenshots, policy links, and sign-offs per item |
| Cloud-native | Add container-specific items | Include pod security policies, RBAC, and network policies |

## What Works

1. Run this checklist before every production launch, not just annually
2. Assign each section to the team that owns the relevant systems
3. Track findings in a vulnerability management tool with severity and due dates
4. Re-test items after major infrastructure or application changes
5. Share results with leadership to justify security investment

## Common Mistakes

1. Treating security audits as a checkbox exercise without fixing findings
2. Skipping infrastructure checks because "the cloud provider handles it"
3. Relying solely on automated scanners and skipping manual review
4. Not updating the checklist as the threat space evolves
5. Keeping audit results in a silo instead of sharing with engineering teams

## Frequently Asked Questions

### How long should a security audit take?

A lightweight audit for a single application takes 2-4 hours. A thorough enterprise audit across infrastructure, applications, and compliance can take 1-2 weeks.

### Should external auditors be used?

Yes, at least annually. Internal teams know the system too well to find obvious blind spots. External auditors bring fresh perspective and industry benchmarks.

### What if an item fails but the fix is expensive?

Document the risk, create a mitigation plan (workarounds, monitoring, insurance), and assign a target date. Some risks are accepted with executive sign-off, but they must be revisited regularly.


### How do we prioritize security audit findings?

Prioritize by severity and exploitability: Critical findings (remote code execution, authentication bypass, data exposure) must be fixed immediately — within 24-48 hours. High findings (privilege escalation, SQL injection) within 1 week. Medium findings (missing encryption, weak password policy) within 30 days. Low findings (information disclosure, missing headers) within 90 days. Use the CVSS score as a baseline but adjust based on business context — a Critical finding on a public-facing service is more urgent than on an internal tool. Track all findings in a vulnerability management tool with due dates and owners.

### What tools should we use during a security audit?

Use a combination of automated and manual tools: SAST (Static Application Security Testing) — SonarQube, Semgrep, CodeQL for source code analysis. DAST (Dynamic Application Security Testing) — OWASP ZAP, Burp Suite for runtime testing. Dependency scanning — Snyk, Dependabot, OWASP Dependency-Check for vulnerable libraries. Infrastructure scanning — Terraform security scanning (tfsec), CIS benchmarks, cloud security posture management. Secrets scanning — GitLeaks, TruffleHog for hardcoded secrets. Manual review — code review, architecture review, and threat modeling. No single tool finds all issues — use multiple tools and manual review.

### How do we conduct a security audit for a microservices architecture?

For microservices: audit each service individually but also audit the inter-service communication. Per service: authentication, authorization, input validation, dependency scanning, and secrets management. Inter-service: mTLS between services, network policies, API gateway security, and service mesh configuration. Check for broken access control between services — a service with access to all databases is a risk. Review the API gateway for rate limiting, authentication, and request validation. Audit the CI/CD pipeline for each service — a compromised pipeline can inject malicious code. Document the service dependency graph and identify attack paths.

### What is the difference between a security audit and a penetration test?

A security audit is a detailed review of security controls, policies, and configurations — it answers "are our security measures adequate?" A penetration test is a simulated attack — it answers "can someone actually break in?" Audits are broader (policies, procedures, configurations) while pentests are deeper (exploiting specific vulnerabilities). Audits are typically internal or by a third-party assessor; pentests are by specialized security firms. Both are necessary: an audit identifies gaps in controls, a pentest validates that controls work under attack. Schedule audits quarterly and pentests annually or before major releases.

### How do we track remediation of audit findings?

Use a vulnerability management tool (Jira, GitHub Issues, dedicated tools like VulnerabilityManager or DefectDojo) to track each finding. Create a ticket with: finding description, severity, evidence, remediation steps, owner, and due date. Review open findings weekly in the security standup. Escalate overdue Critical and High findings to engineering leadership. Close findings only after verification — re-test the fix and document the evidence. Generate monthly reports on finding status (open, in progress, closed) for leadership. Conduct a remediation review at 30, 60, and 90 days post-audit to ensure fixes are sustained.











































































End of document. Review and update quarterly.