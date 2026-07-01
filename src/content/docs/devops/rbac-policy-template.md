---
contentType: docs
slug: rbac-policy-template
title: "RBAC Policy Template"
description: "A template for defining role-based access control policies, including roles, permissions, assignment rules, and review cadence."
metaDescription: "Define role-based access control policies with this RBAC template. Covers roles, permissions, assignment rules, and review cadence."
difficulty: intermediate
topics:
  - security
  - devops
tags:
  - rbac
  - access-control
  - authorization
  - policy
  - identity
relatedResources:
  - /docs/devops/access-control-review-template
  - /docs/devops/user-access-audit-template
  - /docs/devops/secret-rotation-schedule-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Define role-based access control policies with this RBAC template. Covers roles, permissions, assignment rules, and review cadence."
  keywords:
    - rbac policy
    - role based access control
    - authorization policy
    - role assignment
    - access governance
---

## Overview

A Role-Based Access Control (RBAC) Policy Template defines how access rights are granted through named roles. It documents roles, associated permissions, who can assign them, and how often they are reviewed. A clear RBAC policy reduces privilege creep, simplifies onboarding, and supports compliance audits.

## When to Use

- Designing access control for a new application or system.
- Standardizing permissions across multiple services or teams.
- Preparing for a security audit or certification.
- Reviewing or refactoring an existing access model.
- Onboarding employees with role-based provisioning.

## Prerequisites

- An inventory of system resources and actions.
- A list of current job functions or team responsibilities.
- Agreement on least-privilege principles.
- An identity provider or role management system.

## Solution

### Template

#### 1. Policy Statement

All access to systems, data, and infrastructure is granted based on predefined roles. Roles are aligned with job functions, least privilege, and separation of duties. Access must be approved, documented, and reviewed periodically.

#### 2. Role Definitions

| Role | Description | Permissions | Scope | Approval Required |
|------|-------------|-------------|-------|-------------------|
| viewer | Read-only access for reporting and investigation | read | All resources | Manager |
| editor | Can modify configuration and non-production data | read, write | Non-production | Manager |
| operator | Can deploy, restart, and monitor services | read, deploy, restart | Assigned services | Team lead |
| admin | Full access for break-glass and critical changes | full | Entire system | Security + manager |
| auditor | Read-only access to logs and compliance evidence | read | Logs and audit data | Compliance officer |

#### 3. Role Assignment Rules

| Rule | Description |
|------|-------------|
| Least privilege | Users receive the minimum role needed for their current duties. |
| Separation of duties | No single user holds roles that allow both committing and approving sensitive changes. |
| Time-bound | Temporary or elevated roles expire automatically. |
| Manager approval | Role assignment requires documented approval from the user's manager. |
| Revocation on change | Roles are revoked when a user changes teams or leaves the organization. |

#### 4. Access Request Workflow

| Step | Action | Owner | SLA |
|------|--------|-------|-----|
| 1 | User submits request with business justification | Requester | N/A |
| 2 | Manager reviews and approves | Manager | 2 business days |
| 3 | Role is provisioned by identity or platform team | IAM team | 1 business day |
| 4 | Assignment is logged in access register | IAM team | Same day |
| 5 | Access is reviewed during quarterly audit | System owner | Quarterly |

#### 5. Review and Compliance

| Activity | Frequency | Owner | Evidence |
|----------|-----------|-------|----------|
| Role inventory review | Annually | Security | Updated role matrix |
| Privileged access review | Quarterly | System owner | Attestation record |
| Orphan account cleanup | Quarterly | IAM team | Disabled account list |
| Exception approval | As needed | Risk committee | Risk acceptance form |

## Explanation

RBAC simplifies access management by grouping permissions into roles rather than assigning them directly to users. This template makes the role model explicit, enforceable, and auditable. When combined with automated provisioning, it reduces manual errors and accelerates onboarding and offboarding.

## Variants

- **ABAC policy**: Uses attributes such as department, project, or location to decide access dynamically.
- **Cloud IAM policy**: Maps roles to AWS IAM, Azure RBAC, or GCP IAM roles and policies.
- **Application-level RBAC**: Defines roles inside a single application, independent of corporate identity.
- **Customer-facing RBAC**: Models tenant, admin, and end-user roles in multi-tenant systems.

## What Works

- Start with a small number of roles and expand only when necessary.
- Avoid role names that match job titles; use functional names like `editor` or `operator`.
- Document the business justification for every role assignment.
- Use groups and roles, not individual permissions, for most users.
- Enforce MFA for all privileged roles.
- Automate role revocation when users change roles or leave.
- Review roles annually to remove unused or overly broad roles.

## Common Mistakes

- Creating too many roles, leading to role explosion and confusion.
- Granting direct permissions outside of defined roles.
- Allowing users to keep old roles after transferring to a new team.
- Failing to define separation of duties for sensitive operations.
- Using generic roles such as `admin` for everyday tasks.

## FAQs

### What is the difference between RBAC and ABAC?

RBAC grants access based on assigned roles. ABAC grants access based on attributes of the user, resource, and environment, such as `department=engineering` and `time=business-hours`.

### How many roles should a system have?

Most systems need between three and seven roles. More than ten roles usually indicates role explosion and should be refactored.

### Can a user have multiple roles?

Yes, but combined permissions should be reviewed to avoid unintended privilege escalation. Temporary and permanent roles should be tracked separately.
