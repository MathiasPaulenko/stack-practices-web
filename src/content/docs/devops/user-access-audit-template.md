---
contentType: docs
slug: user-access-audit-template
title: "User Access Audit Template"
description: "A template for reviewing and certifying user access rights across systems, applications, and data repositories."
metaDescription: "Review and certify user access with this audit template. Covers identity inventory, role mapping, certifications, orphan accounts, and remediation."
difficulty: beginner
topics:
  - security
  - devops
tags:
  - access-audit
  - user-access-review
  - identity-governance
  - rbac
  - compliance
relatedResources:
  - /docs/devops/rbac-policy-template
  - /docs/devops/access-control-review-template
  - /docs/devops/secret-rotation-schedule-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Review and certify user access with this audit template. Covers identity inventory, role mapping, certifications, orphan accounts, and remediation."
  keywords:
    - user access audit
    - access certification
    - identity governance
    - orphan account
    - access review template
---

## Overview

A user access audit verifies that every user has the right level of access to systems, applications, and data. It is a core control for identity governance, least privilege, and compliance with standards like SOC 2, ISO 27001, and PCI-DSS. This template provides a structured way to collect access data, review permissions, certify access, and remediate findings.

## When to Use

- Performing quarterly or annual access reviews.
- Preparing for a compliance audit or certification.
- After a role change, reorganization, or merger.
- When privileged access is suspected to be excessive.
- After offboarding a user or removing a contractor.

## Prerequisites

- An identity source such as an SSO provider or identity management system.
- A list of applications, systems, and data repositories under review.
- Owners or managers for each application who can certify access.
- A defined access review schedule and escalation process.

## Solution

### Template

#### 1. Audit Scope

| Scope Item | Description |
|------------|-------------|
| Period | 2026-Q2 |
| Systems reviewed | AWS, GitHub, Jira, Confluence, Slack, VPN, Google Workspace |
| Population | Employees, contractors, service accounts, privileged admin roles |
| Reviewers | Application owners, managers, security team |
| Due date | 2026-07-15 |
| Exceptions allowed | Yes, with risk acceptance and expiration |

#### 2. Identity Inventory

| User ID | Name | Type | Department | Status | Last Reviewed |
|---------|------|------|------------|--------|---------------|
| `alice@example.com` | Alice Chen | Employee | Engineering | Active | 2026-03-31 |
| `bob@example.com` | Bob Smith | Contractor | Finance | Active | 2026-03-31 |
| svc-api-prod | API Service | Service account | Platform | Active | 2026-05-15 |
| `carol@example.com` | Carol Jones | Employee | Marketing | Inactive | 2026-01-31 |

#### 3. Access Mapping

| User | System | Role / Permission | Business Justification | Reviewer | Decision |
|------|--------|-------------------|--------------------------|----------|----------|
| `alice@example.com` | AWS | PowerUser | Manages infrastructure | Platform lead | Keep |
| `bob@example.com` | GitHub | Read | Reviews pull requests | Engineering manager | Keep |
| `alice@example.com` | Jira | Admin | Configures workflows | IT lead | Revoke |
| svc-api-prod | AWS | S3 read-only | Application reads reports | Platform lead | Keep |
| `carol@example.com` | Slack | Member | Left company | HR | Revoke |

#### 4. Privileged Access Review

| User | System | Privileged Role | Justification | Risk | Reviewer | Decision |
|------|--------|-----------------|---------------|------|----------|----------|
| `alice@example.com` | AWS | Root access | Emergency break-glass | High | CISO | Keep with MFA |
| `dave@example.com` | GitHub | Organization owner | Manages repositories | High | CTO | Keep |
| `eve@example.com` | VPN | Full tunnel | Remote admin access | High | Security lead | Revoke |

#### 5. Certification Log

| Application | Reviewer | Status | Date | Notes |
|-------------|----------|--------|------|-------|
| AWS | Platform lead | Certified | 2026-07-10 | 2 revocations pending |
| GitHub | CTO | Certified | 2026-07-08 | 1 orphan account removed |
| Jira | IT lead | In progress | 2026-07-05 | Admin role under review |
| Slack | HR | Certified | 2026-07-09 | 3 inactive accounts revoked |

#### 6. Remediation Plan

| Finding | Action | Owner | Due Date | Status |
|---------|--------|-------|----------|--------|
| Excessive admin rights in Jira | Downgrade to user | IT lead | 2026-07-20 | Open |
| Inactive Slack account | Deactivate | HR | 2026-07-12 | Done |
| Orphaned service account | Investigate and disable | Platform team | 2026-07-18 | Open |
| Missing MFA on privileged users | Enforce MFA | IAM team | 2026-07-15 | In progress |

## Explanation

The template connects identities to permissions, business justification, and accountable reviewers. Without this structure, organizations accumulate stale accounts and over-privileged users, increasing both insider risk and external attack surface. Regular access reviews are required by most security frameworks and are a practical way to enforce least privilege.

## Variants

- **Application-specific access review**: Focuses on one system, such as AWS IAM or GitHub organization access.
- **Privileged access review**: Only reviews admin, root, or emergency access accounts.
- **Service account audit**: Reviews non-human identities and their API keys or credentials.
- **Contractor access review**: Time-bound review for external users with temporary access.
- **Data access audit**: Focuses on users who can access sensitive databases, data lakes, or analytics tools.

## Best Practices

- Automate identity collection from the SSO or identity provider.
- Send reminders to reviewers before the due date.
- Require business justification for every privileged role.
- Revoke access immediately when a user changes role or leaves.
- Schedule quarterly reviews for privileged access and annual reviews for general access.
- Document risk acceptance for necessary exceptions.
- Track remediation until every finding is closed.

## Common Mistakes

- Reviewing access only once a year without follow-up.
- Letting managers keep access for employees who changed roles.
- Ignoring service accounts and shared credentials.
- Skipping privileged access or emergency break-glass accounts.
- Not linking access decisions to business justification.
- Failing to verify that revocations actually happened.
- Storing review evidence in scattered emails or documents.

## FAQs

### Who should certify access?

The system owner or the user's direct manager is the best reviewer. For sensitive systems, the security team or data owner may also approve.

### What is an orphan account?

An orphan account is an active account no longer associated with a known user or owner, often after offboarding or team changes. These should be disabled or reclaimed.

### How do we make access reviews less tedious?

Use identity governance tools that pull access data automatically, provide reviewer-friendly dashboards, and auto-revoke low-risk inactive accounts after approval.
