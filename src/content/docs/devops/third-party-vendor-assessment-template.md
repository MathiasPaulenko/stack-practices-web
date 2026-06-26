---
contentType: docs
slug: third-party-vendor-assessment-template
title: "Third-Party Vendor Assessment Template"
description: "A structured template for evaluating the security, compliance, and operational posture of third-party vendors before onboarding or renewal."
metaDescription: "Evaluate third-party vendors with this assessment template. Covers security posture, compliance, SLA commitments, and risk scoring."
difficulty: intermediate
topics:
  - security
  - devops
tags:
  - vendor-assessment
  - third-party-risk
  - security
  - compliance
  - due-diligence
relatedResources:
  - /docs/devops/data-breach-response-playbook
  - /docs/devops/access-control-review-template
  - /docs/devops/rbac-policy-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Evaluate third-party vendors with this assessment template. Covers security posture, compliance, SLA commitments, and risk scoring."
  keywords:
    - vendor assessment
    - third party risk
    - security questionnaire
    - vendor due diligence
    - compliance review
---

## Overview

A Third-Party Vendor Assessment Template standardizes how your organization evaluates external service providers before contract signing, integration, or renewal. It gathers evidence about a vendor's security controls, compliance certifications, operational practices, and business continuity posture so teams can make informed risk decisions.

## When to Use

- Before onboarding a new SaaS, cloud, or infrastructure vendor.
- During annual security reviews or contract renewals.
- After a vendor experiences a security incident or breach.
- When procurement requires a documented risk acceptance process.
- To compare multiple vendors against the same security criteria.

## Prerequisites

- A defined risk appetite and acceptable control baselines.
- Legal or procurement support for contract review.
- Access to the vendor's security documentation, SOC 2 reports, or penetration test summaries.
- A stakeholder from engineering, security, and legal for scoring.

## Solution

### Template

#### 1. Vendor Identification

| Field | Description | Example |
|-------|-------------|---------|
| Vendor name | Legal entity name | Acme Cloud Services |
| Service description | What the vendor provides | Managed Kubernetes hosting |
| Data access | Data the vendor will process or store | Customer email addresses, logs |
| Integration type | How the vendor connects to your systems | API, OAuth, SSO |
| Renewal date | Contract expiration | 2027-12-31 |

#### 2. Security Posture

| Control Area | Vendor Response | Evidence Requested | Score (1-5) |
|--------------|-----------------|-------------------|-------------|
| Encryption in transit | TLS 1.2+ | Certificate scan | |
| Encryption at rest | AES-256 | Architecture doc | |
| Identity and access management | SSO + MFA | Configuration screenshot | |
| Logging and monitoring | SIEM + alerts | Policy document | |
| Incident response | 24/7 response team | Runbook or contract clause | |
| Vulnerability management | Monthly scans | Scan report | |

#### 3. Compliance and Certifications

| Certification | Status | Expiration | Notes |
|---------------|--------|------------|-------|
| SOC 2 Type II | Current | 2026-09-30 | Report reviewed |
| ISO 27001 | Current | 2027-03-15 | Certificate attached |
| GDPR / privacy | Compliant | N/A | DPA signed |
| HIPAA | N/A | N/A | No health data |

#### 4. Operational Resilience

| Topic | Question | Answer |
|-------|----------|--------|
| Uptime SLA | What is the guaranteed availability? | 99.95% monthly |
| Support response | Response time for critical issues | 1 hour |
| Data residency | Where is data stored? | EU, US-East |
| Backup and recovery | RPO / RTO targets | 1 hour / 4 hours |
| Exit strategy | How is data returned or deleted on termination? | Encrypted export within 30 days |

#### 5. Risk Scoring Summary

| Risk Category | Weight | Score | Weighted Score |
|---------------|--------|-------|----------------|
| Security | 30% | 4 | 1.2 |
| Compliance | 25% | 5 | 1.25 |
| Operational | 25% | 3 | 0.75 |
| Financial | 10% | 4 | 0.4 |
| Reputational | 10% | 3 | 0.3 |
| **Total** | 100% | | **3.9** |

#### 6. Decision

| Outcome | Condition |
|---------|-----------|
| Approve | Total score >= 4.0 and no critical gaps |
| Approve with conditions | Score 3.0 - 3.9 and gaps can be remediated |
| Reject | Score < 3.0 or critical unmitigated risk |

## Explanation

The template collects consistent evidence across vendors, which makes it easier to compare risk and justify decisions. Scoring converts qualitative answers into numbers that can be tracked over time and escalated to leadership. The decision section removes ambiguity about whether a vendor can proceed.

## Variants

- **Lightweight vendor review**: A shorter 10-question checklist for low-risk vendors such as analytics or marketing tools.
- **Critical infrastructure review**: A deeper assessment with architectural diagrams, source-code review rights, and on-site audits.
- **AI/ML vendor assessment**: Adds questions about model training data, bias, output ownership, and explainability.
- **Renewal-only review**: Skips basic onboarding questions and focuses on changes since the last assessment.

## Best Practices

- Reuse the same template for every vendor to keep comparisons fair.
- Request evidence, not just yes/no answers.
- Define a minimum score and mandatory controls before starting the review.
- Store completed assessments in a central repository for audit trails.
- Re-evaluate high-risk vendors annually or after major incidents.
- Include right-to-audit clauses in contracts when risk is high.

## Common Mistakes

- Accepting vendor-provided marketing slides as evidence.
- Skipping re-assessment during renewals.
- Failing to track remediation commitments after conditional approval.
- Assigning scoring to a single person without peer review.
- Ignoring subcontractors or fourth-party dependencies used by the vendor.

## FAQs

### What if a vendor refuses to share a SOC 2 report?

Request a summary of controls or a compliance questionnaire. If they still refuse, escalate the risk and consider requiring a contractual right-to-audit or additional security controls.

### How often should vendors be reassessed?

Annually for high-risk vendors, and at every renewal or major service change for others. Incident-triggered reviews are also recommended.

### Who should own the assessment process?

Security or risk teams usually own the process, but procurement, legal, and engineering must provide input. Final approval should involve the data owner.
