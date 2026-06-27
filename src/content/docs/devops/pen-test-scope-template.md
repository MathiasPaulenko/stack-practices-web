---
contentType: docs
slug: pen-test-scope-template
title: "Penetration Test Scope Template"
description: "A template for defining the boundaries, targets, rules, and deliverables for a penetration testing engagement."
metaDescription: "Define penetration testing boundaries with this scope template. Covers targets, exclusions, rules of engagement, deliverables, and schedule."
difficulty: intermediate
topics:
  - security
  - testing
tags:
  - penetration-test
  - security-assessment
  - scope
  - red-team
  - compliance
relatedResources:
  - /docs/devops/container-security-baseline-template
  - /docs/devops/network-segmentation-policy-template
  - /docs/devops/compliance-gap-analysis-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Define penetration testing boundaries with this scope template. Covers targets, exclusions, rules of engagement, deliverables, and schedule."
  keywords:
    - penetration test scope
    - security assessment
    - rules of engagement
    - pen test template
    - vulnerability assessment
---

## Overview

A Penetration Test Scope Template defines what will be tested, what will not be tested, how the testing will be conducted, and what the organization expects to receive. A clear scope protects the organization from unintended disruption, prevents legal issues for testers, and ensures the engagement delivers actionable value.

## When to Use

- Hiring an external security firm for a penetration test.
- Running an internal red-team or purple-team exercise.
- Meeting compliance requirements for annual testing.
- After a major architecture change or product launch.
- Scoping a bug bounty or crowdsourced testing program.

## Prerequisites

- An inventory of systems, applications, and network ranges.
- Legal and compliance approval for testing.
- A contact list for emergency escalation.
- An understanding of the testing methodology, such as OWASP or PTES.

## Solution

### Template

#### 1. Engagement Details

| Field | Description | Value |
|-------|-------------|-------|
| Organization | Entity being tested | Acme Corp |
| Engagement type | Black box, gray box, or white box | Gray box |
| Start date | When testing begins | 2026-07-01 |
| End date | When testing ends | 2026-07-15 |
| Testing window | Allowed hours | 08:00 - 18:00 UTC |
| Emergency contact | 24/7 contact for critical findings | security@example.com |
| Report due date | When findings are delivered | 2026-07-22 |

#### 2. Targets In Scope

| Target | Type | Environment | URL / IP Range | Notes |
|--------|------|-------------|----------------|-------|
| app.example.com | Web application | Production | 203.0.113.10 | Public-facing |
| api.example.com | API | Production | 203.0.113.11 | OAuth2 protected |
| k8s cluster | Cloud infrastructure | Staging | 10.0.0.0/16 | Read-only credentials provided |
| Admin portal | Web application | Production | admin.example.com | MFA enabled |

#### 3. Out-of-Scope Items

| Item | Reason |
|------|--------|
| Third-party SaaS providers | Outside organizational control |
| Physical security | Not included in this engagement |
| Social engineering | Excluded per legal request |
| Denial-of-service attacks | Risk to production uptime |
| Employee personal devices | Privacy and legal boundaries |
| Production database writes | Could corrupt customer data |

#### 4. Rules of Engagement

| Rule | Description |
|------|-------------|
| Authorized testing | Only listed targets may be tested |
| Communication | Critical findings reported immediately |
| Data handling | No customer data exfiltration unless approved |
| Tooling | Commercial and open-source tools allowed; no auto-exploitation on production |
| Evidence | Screenshots and logs required for all findings |
| Confidentiality | Results stored encrypted and shared only with named recipients |
| Clean-up | Tester must remove any persistence or accounts created during testing |

#### 5. Testing Methodology

| Phase | Activities | Deliverable |
|-------|------------|-------------|
| Reconnaissance | Collect public information and map targets | Target inventory |
| Scanning | Vulnerability and configuration scanning | Scan output |
| Exploitation | Attempt to validate vulnerabilities | Exploitation evidence |
| Post-exploitation | Assess impact and lateral movement | Impact analysis |
| Reporting | Document findings, risk, and remediation | Final report |
| Retest | Verify fixes after remediation | Retest report |

#### 6. Success Criteria

| Criterion | Target |
|-----------|--------|
| Coverage | 100% of in-scope targets tested |
| Critical findings | Reported within 24 hours of discovery |
| Report quality | Includes risk rating, evidence, and remediation steps |
| Retest | All high and critical findings remediated and retested |
| Debrief | Executive and technical sessions delivered |

## Explanation

The scope template aligns the organization and testers before any traffic is sent. It reduces legal risk, prevents production outages, and ensures the findings are relevant. Rules of engagement are especially important because they separate authorized testing from criminal activity under computer fraud laws.

## Variants

- **Web application penetration test**: Focuses on OWASP Top 10 testing for a single app.
- **Cloud penetration test**: Targets AWS, Azure, or GCP configurations and IAM.
- **Red team exercise**: Broader scope with stealth objectives and longer duration.
- **Bug bounty scope**: Public-facing targets with safe harbor language and reward rules.
- **Internal network test**: Assumes an insider or compromised endpoint perspective.

## Best Practices

- Get written authorization before any testing begins.
- Include both technical and business owners in scope definition.
- Define emergency contacts and escalation paths.
- Exclude third-party systems unless explicit permission is obtained.
- Require proof-of-concept evidence for every finding.
- Schedule retesting to validate remediation.
- Store findings securely and limit distribution.

## Common Mistakes

- Defining a scope that is too narrow to find real risks.
- Forgetting to include APIs, microservices, and mobile backends.
- Not providing test credentials for authenticated testing.
- Allowing testing on production without a rollback plan.
- Skipping retest and assuming fixes are complete.
- Not informing SOC or NOC that testing will occur.

## FAQs

### What is a gray box test?

A gray box test provides the tester with some internal knowledge, such as credentials, architecture diagrams, or source code, while still simulating an attacker with limited access.

### Can we test production systems?

Production testing is allowed if explicitly included in the scope, during agreed windows, and with rollback plans. Many organizations prefer testing staging first.

### What should a report include?

At minimum: executive summary, methodology, scope, risk-rated findings, evidence, impact, remediation steps, and retest results. Include timelines and CVSS scores where applicable.
