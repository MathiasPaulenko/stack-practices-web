---
contentType: docs
slug: compliance-gap-analysis-template
title: "Compliance Gap Analysis Template"
description: "A template for mapping current security controls to compliance frameworks like SOC 2, ISO 27001, and PCI-DSS."
metaDescription: "Map security controls to compliance frameworks with this gap analysis template. Covers requirements, evidence, gaps, and remediation plans."
difficulty: intermediate
topics:
  - security
  - devops
tags:
  - compliance
  - gap-analysis
  - soc2
  - iso27001
  - audit
relatedResources:
  - /docs/devops/access-control-review-template
  - /docs/devops/rbac-policy-template
  - /docs/devops/network-segmentation-policy-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Map security controls to compliance frameworks with this gap analysis template. Covers requirements, evidence, gaps, and remediation plans."
  keywords:
    - compliance gap analysis
    - soc2 gap analysis
    - iso 27001 gap analysis
    - audit readiness
    - control mapping
---

## Overview

A Compliance Gap Analysis compares your current security controls against the requirements of a target framework, such as SOC 2, ISO 27001, PCI-DSS, or GDPR. This template captures the requirement, the control that satisfies it, the evidence you have, any missing pieces, and a plan to close the gaps. It is a standard input for audit readiness and certification roadmaps.

## When to Use

- Preparing for a first-time audit or certification.
- Renewing a certification and identifying changes since the last audit.
- Merging companies or integrating new business units.
- After a major change in architecture, processes, or vendors.
- Building a security roadmap tied to compliance obligations.

## Prerequisites

- The target framework and version, such as SOC 2 Trust Services Criteria 2017.
- An inventory of security policies, controls, and processes.
- Access to evidence repositories, ticket systems, and cloud consoles.
- A cross-functional team from security, engineering, legal, and HR.

## Solution

### Template

#### 1. Engagement Overview

| Field | Description | Value |
|-------|-------------|-------|
| Framework | Target compliance standard | SOC 2 Type II |
| Version | Specific version or criteria | Trust Services Criteria 2017 |
| Scope | Systems, teams, or locations covered | Production cloud environment |
| Assessment date | When the gap analysis was performed | 2026-06-27 |
| Owner | Person responsible for the analysis | Compliance manager |
| Target audit date | Planned certification or audit | 2027-03-31 |

#### 2. Control Mapping

| Requirement ID | Control Objective | Current Control | Evidence | Status | Gap | Owner | Due Date |
|----------------|-------------------|-----------------|----------|--------|-----|-------|----------|
| CC6.1 | Logical access | RBAC policy enforced | RBAC policy doc, IAM config | Partial | MFA not enforced for all admin roles | IAM team | 2026-08-15 |
| CC6.6 | System monitoring | Logs centralized in SIEM | SIEM dashboard, retention policy | Met | None | Security team | N/A |
| CC7.1 | Vulnerability management | Quarterly scans | Scanner report | Partial | No SLA for remediation | Vuln management team | 2026-09-01 |
| A.12.3.1 | Information backup | Backup policy exists | Backup policy, restore test | Met | None | DevOps team | N/A |
| A.9.2.3 | Access rights | Access review process | Quarterly access reviews | Partial | Reviews not documented | Engineering managers | 2026-07-30 |

#### 3. Gap Summary

| Category | Total | Met | Partial | Not Met | Risk |
|----------|-------|-----|---------|---------|------|
| Access control | 12 | 7 | 4 | 1 | High |
| Monitoring | 8 | 6 | 2 | 0 | Medium |
| Change management | 6 | 3 | 2 | 1 | High |
| Vendor management | 5 | 2 | 2 | 1 | Medium |
| Incident response | 7 | 5 | 1 | 1 | High |
| Overall | 38 | 23 | 11 | 4 | High |

#### 4. Remediation Plan

| Gap ID | Description | Action | Owner | Due Date | Priority | Evidence Needed |
|--------|-------------|--------|-------|----------|----------|-----------------|
| GAP-01 | MFA missing for admin roles | Enforce MFA on all privileged accounts | IAM team | 2026-08-15 | High | MFA enrollment report |
| GAP-02 | No vulnerability remediation SLA | Define and approve SLA by severity | Security team | 2026-09-01 | High | SLA document |
| GAP-03 | Access reviews not documented | Use quarterly access review template | Engineering managers | 2026-07-30 | Medium | Signed attestations |
| GAP-04 | No formal vendor assessment | Adopt vendor assessment template | Procurement | 2026-10-01 | Medium | Completed assessments |

#### 5. Evidence Tracking

| Requirement ID | Evidence Location | Last Updated | Reviewer | Notes |
|----------------|-------------------|--------------|----------|-------|
| CC6.1 | /policies/rbac-policy | 2026-06-01 | Security lead | Approved and published |
| CC6.6 | /siem/retention-config | 2026-05-15 | SOC analyst | 12-month retention confirmed |
| A.12.3.1 | /runbooks/backup-restore-test | 2026-06-20 | DevOps lead | Quarterly restore test passed |

## Explanation

Gap analysis turns compliance from a vague checklist into a useful project. By mapping each requirement to a control, evidence, and status, you can prioritize work based on risk and audit timeline. The remediation plan becomes the roadmap that drives engineering, security, and legal tasks toward certification.

## Variants

- **SOC 2 readiness assessment**: Focused on Trust Services Criteria with common controls and evidence.
- **ISO 27001 gap analysis**: Mapped to Annex A controls and risk treatment plans.
- **PCI-DSS gap analysis**: Centered on cardholder data environment, encryption, and access.
- **GDPR compliance mapping**: Tracks data subject rights, processing records, and consent.
- **Multi-framework mapping**: A unified matrix showing coverage across SOC 2, ISO 27001, and PCI-DSS.

## What Works

- Use the official framework version to avoid outdated requirements.
- Involve control owners, not just the compliance team, in the assessment.
- Collect evidence during the analysis, not after.
- Rate gaps by risk and audit readiness, not just by volume.
- Track remediation like a project with owners, dates, and deliverables.
- Re-run the analysis quarterly or after major changes.
- Maintain a single source of truth for evidence locations.

## Common Mistakes

- Treating compliance as a one-time project instead of a continuous program.
- Mapping controls to requirements without reviewing actual evidence.
- Assigning remediation to teams without capacity or authority.
- Using outdated framework versions.
- Over-documenting trivial controls while missing critical gaps.
- Not linking gap analysis to incident history or risk assessments.

## FAQs

### How long does a gap analysis take?

A focused framework assessment for one standard typically takes 2 to 4 weeks, depending on scope, maturity, and evidence availability. Multi-framework mappings take longer.

### Who should own the gap analysis?

A compliance or risk manager usually owns the document, but each requirement must have a control owner who validates the evidence and commits to remediation.

### What counts as evidence?

Policies, configuration screenshots, audit logs, ticket records, signed attestations, training completion records, test results, and third-party reports. Evidence must be dated and attributable.
