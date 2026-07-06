---
contentType: docs
slug: access-control-policy-template
title: "Access Control Policy Template"
description: "A template for defining authentication, authorization, RBAC, ABAC, MFA, password policies, session management, and access review procedures."
metaDescription: "Use this access control policy template to define authentication, authorization, RBAC, MFA, password policies, session management, and access reviews."
difficulty: intermediate
topics:
  - testing
tags:
  - security
  - access-control
  - authentication
  - authorization
  - rbac
  - policy
  - template
relatedResources:
  - /docs/security/security-audit-checklist
  - /docs/security/incident-response-plan-template
  - /docs/security/vulnerability-management-process-template
  - /docs/data-engineering/data-governance-policy-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use this access control policy template to define authentication, authorization, RBAC, MFA, password policies, session management, and access reviews."
  keywords:
    - access control
    - authentication
    - authorization
    - rbac
    - mfa
    - policy template
    - security
---

## Overview

An access control policy defines how users and services authenticate, what they can access, and how access is reviewed and revoked. It covers authentication methods, authorization models, password standards, MFA requirements, session management, and access review procedures. Without a policy, access grows unchecked and becomes a security liability.

## When to Use

- Establishing access control for a new organization
- Preparing for compliance audits (SOC 2, ISO 27001, HIPAA)
- Defining role-based access for applications
- Reviewing and tightening existing access controls
- Onboarding new systems or services

## Solution

```markdown
# Access Control Policy — `<Organization Name>`

## Policy Overview

| Field | Value |
|-------|-------|
| Organization | Example Corp |
| Policy Version | 2.0 |
| Last Updated | 2026-07-05 |
| Policy Owner | CISO |
| Approved By | Executive Committee |
| Review Cycle | Annual |
| Next Review | 2027-07-05 |
| Compliance Frameworks | SOC 2, ISO 27001, HIPAA |
| Access Model | RBAC + ABAC (hybrid) |

## 1. Authentication

### Authentication Methods

| Method | Use Case | MFA Required | Notes |
|--------|----------|--------------|-------|
| Password + MFA | User login (all) | Yes (TOTP or hardware key) | Default for all users |
| SSO (SAML/OIDC) | Enterprise apps | Yes (via IdP) | Okta as IdP |
| API keys | Service-to-service | N/A | Rotated every 90 days |
| OAuth 2.0 | Third-party integrations | N/A | Scoped tokens, 1-hour expiry |
| SSH keys | Server access | Yes (MFA on jump host) | Ed25519 keys only |
| Client certificates | mTLS services | N/A | Issued by internal CA |

### Password Policy

| Requirement | Value | Rationale |
|-------------|-------|-----------|
| Minimum length | 14 characters | Resistance to brute force |
| Character classes | 3 of 4 (upper, lower, digit, special) | Complexity without complexity rules |
| Password history | Last 24 passwords | Prevent reuse |
| Password age | No maximum (NIST guidance) | Frequent changes cause weaker passwords |
| Breach check | Check against Have I Been Pwned | Prevent use of breached passwords |
| Lockout threshold | 10 failed attempts | Account lockout after 10 tries |
| Lockout duration | 15 minutes | Auto-unlock after 15 min |
| Storage | Argon2id hash | Memory-hard, slow cracking |

### Multi-Factor Authentication (MFA)

| User Group | MFA Method | Enforcement | Recovery |
|-------------|------------|-------------|----------|
| All employees | TOTP (Google Authenticator) | Required at login | Backup codes |
| Administrators | Hardware key (YubiKey) | Required at login | Backup hardware key |
| Developers | TOTP or hardware key | Required for prod access | Backup codes |
| Service accounts | No MFA (API key) | N/A | Key rotation |
| Contractors | TOTP | Required at login | Sponsor-managed |

### MFA Enrollment Process

| Step | Action | Responsible | Duration |
|------|--------|-------------|----------|
| 1 | User requests MFA enrollment | User | — |
| 2 | IT verifies identity | IT Support | 1 business day |
| 3 | User installs authenticator app | User | 15 minutes |
| 4 | User scans QR code | User + IT | 5 minutes |
| 5 | User verifies with test code | User | 2 minutes |
| 6 | User saves backup codes | User | 5 minutes |
| 7 | IT enables MFA enforcement | IT Support | Same day |

## 2. Authorization

### Role-Based Access Control (RBAC)

| Role | Description | Permissions | Assignment |
|------|-------------|-------------|------------|
| Viewer | Read-only access | View dashboards, reports | Auto-assigned to all employees |
| Developer | Development access | Code repos, CI/CD, staging | Manager approval |
| Senior Developer | Development + review | Code repos, CI/CD, staging, prod read | Manager + tech lead approval |
| DevOps Engineer | Infrastructure access | All infrastructure, prod deploy | Manager + CISO approval |
| Administrator | Full system access | All systems, user management | Manager + CISO + CEO approval |
| Auditor | Read-only audit access | Access logs, audit reports | CISO approval |
| Service Account | Automated access | Specific API endpoints | Technical owner approval |

### Permission Matrix

| Resource | Viewer | Developer | Senior Dev | DevOps | Admin | Auditor |
|----------|--------|-----------|------------|--------|-------|---------|
| Dashboards | ✅ Read | ✅ Read | ✅ Read | ✅ Read | ✅ Read | ✅ Read |
| Code repos | ❌ | ✅ Read/Write | ✅ Read/Write | ✅ Read | ✅ Read/Write | ✅ Read |
| CI/CD pipelines | ❌ | ✅ Trigger | ✅ Trigger | ✅ Configure | ✅ Configure | ✅ Read |
| Staging environment | ❌ | ✅ Deploy | ✅ Deploy | ✅ Deploy | ✅ Deploy | ✅ Read |
| Production environment | ❌ | ❌ | ✅ Read | ✅ Deploy | ✅ Deploy | ✅ Read |
| User management | ❌ | ❌ | ❌ | ❌ | ✅ Manage | ✅ Read |
| Audit logs | ❌ | ❌ | ❌ | ✅ Read | ✅ Read | ✅ Read |
| Security settings | ❌ | ❌ | ❌ | ✅ Read | ✅ Manage | ✅ Read |

### Attribute-Based Access Control (ABAC)

| Attribute | Values | Effect on Access |
|-----------|--------|------------------|
| Department | Engineering, Finance, HR, Sales | Restricts to department resources |
| Location | Office, Remote, VPN | Remote requires VPN for prod |
| Time | Business hours, Off-hours | Prod deploy only in business hours |
| Device | Managed, Unmanaged | Unmanaged devices blocked from prod |
| Risk score | Low, Medium, High | High risk requires step-up auth |

### Privileged Access Management (PAM)

| Privilege | Access Method | Approval | Duration | Logging |
|-----------|--------------|----------|----------|---------|
| Production SSH | Jump host with MFA | Manager approval | 4 hours | Full session recording |
| Database admin | Bastion with MFA | Manager + DBA approval | 2 hours | Query logging |
| Cloud console | Break-glass account | CISO approval | 1 hour | Full audit trail |
| Kubernetes admin | kubectl via jump host | Manager approval | 4 hours | Command logging |
| Root/sudo | Just-in-time elevation | Manager + CISO approval | 1 hour | Command logging |

## 3. Session Management

### Session Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Session timeout (active) | 8 hours | Workday without re-auth |
| Session timeout (idle) | 30 minutes | Auto-logout on inactivity |
| Session timeout (privileged) | 1 hour | Shorter for admin sessions |
| Concurrent sessions | 3 max | Prevent session sharing |
| Session storage | HTTP-only, Secure cookies | Prevent XSS theft |
| CSRF protection | SameSite=Strict cookies | Prevent CSRF attacks |
| Session invalidation | On password change | Force re-auth after change |
| Token expiry (API) | 1 hour access, 30 days refresh | Short-lived access tokens |

### Session Security

| Check | Implementation | Verification |
|-------|----------------|--------------|
| Tokens signed | JWT with RS256 | Verify signature on every request |
| Tokens encrypted | JWE for sensitive claims | Decrypt server-side only |
| Refresh token rotation | New refresh token each use | Detect token theft |
| Device binding | Token bound to device fingerprint | Reject from other devices |
| IP binding | Token bound to IP range | Reject from unexpected IPs |
| Session revocation | Revocation list checked | Immediate logout |

## 4. Access Provisioning

### Onboarding Process

| Step | Action | Responsible | SLA |
|------|--------|-------------|-----|
| 1 | HR creates employee record | HR | Before start date |
| 2 | IT creates accounts | IT | 1 business day |
| 3 | Manager requests access | Manager | 1 business day |
| 4 | Access approved | Data Owner | 2 business days |
| 5 | Access provisioned | IT | 1 business day |
| 6 | User notified | IT | Same day |
| 7 | Access recorded | Compliance | 1 business day |

### Offboarding Process

| Step | Action | Responsible | SLA |
|------|--------|-------------|-----|
| 1 | HR notifies departure | HR | On departure date |
| 2 | Manager confirms last day | Manager | Same day |
| 3 | Access revoked | IT | Within 24 hours |
| 4 | Devices returned | IT | Within 3 days |
| 5 | Accounts deactivated | IT | Within 24 hours |
| 6 | Access recorded | Compliance | 1 business day |
| 7 | Final access review | Compliance | 1 week |

### Access Change Process

| Trigger | Action | Approver | SLA |
|---------|--------|----------|-----|
| Role change | Review and update access | New manager | 3 business days |
| Team transfer | Remove old team access, add new | New manager | 3 business days |
| Promotion | Add new role permissions | Manager + CISO | 5 business days |
| Demotion | Remove elevated access | Manager | 1 business day |
| Temporary access | Grant with expiry date | Manager + Data Owner | 1 business day |

## 5. Access Reviews

### Review Schedule

| Scope | Frequency | Reviewer | Action |
|-------|-----------|----------|--------|
| All user access | Quarterly | Manager | Remove unused access |
| Privileged access | Monthly | CISO | Verify need-to-know |
| Service accounts | Quarterly | Technical Owner | Verify still needed |
| External access | Monthly | Sponsor | Verify contract active |
| Dormant accounts | Monthly | IT | Disable after 30 days inactive |
| Orphaned accounts | Monthly | IT | Remove accounts with no owner |

### Review Checklist

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| User still employed | Cross-reference with HR | All users have active HR record |
| Access matches role | Compare permissions to role definition | No excessive permissions |
| No shared accounts | Verify unique user per account | Each account has one user |
| MFA enabled | Check IdP MFA enrollment | 100% enrollment |
| No dormant accounts | Check last login date | No accounts inactive > 30 days |
| Service accounts documented | Check service account registry | All accounts have owner and purpose |
| Temporary access expired | Check expiry dates | No expired temporary access |

## 6. API and Service Access

### API Authentication

| API Type | Authentication | Token Lifetime | Scope | Rate Limit |
|----------|---------------|----------------|-------|------------|
| Public API | OAuth 2.0 (PKCE) | 1 hour access | Per-client scope | 1000 req/min |
| Internal API | mTLS | Certificate lifetime | Service identity | 5000 req/min |
| Service-to-service | JWT (RS256) | 1 hour | Service scope | 10000 req/min |
| Webhook | HMAC signature | Per-request | N/A | 100 req/min |
| Admin API | API key + MFA | 90 days rotation | Admin scope | 100 req/min |

### API Key Management

| Requirement | Implementation | Verification |
|-------------|----------------|--------------|
| Key generation | Cryptographically random, 256-bit | Verify entropy |
| Key storage | Hashed at rest (bcrypt) | Verify hash, not plaintext |
| Key transmission | TLS 1.2+ only | Verify no HTTP |
| Key rotation | Every 90 days | Automated rotation pipeline |
| Key revocation | Immediate via revocation list | Verify revocation propagation |
| Key scope | Least privilege per key | Audit scopes quarterly |
| Key logging | Never log key values | Grep logs for key patterns |
```

## Explanation

An access control policy governs who can access what and under what conditions. It has three components: authentication (who are you), authorization (what can you do), and accountability (what did you do). Each component has specific controls and procedures.

Authentication verifies identity. Passwords remain the primary method, but they must meet modern standards: 14+ characters, checked against breach databases, stored with Argon2id. MFA is mandatory for all users — TOTP for regular users, hardware keys for administrators. The policy rejects outdated practices like forced password rotation (NIST recommends against it) and complexity rules (they lead to predictable patterns).

Authorization determines what an authenticated user can do. RBAC assigns permissions through roles: viewers, developers, administrators. Each role has a defined permission set. ABAC adds contextual attributes: department, location, device, time. The hybrid model handles both structural access (roles) and contextual restrictions (attributes).

Privileged access management controls administrative access. Production SSH, database admin, and cloud console access require approval, have time limits, and are fully logged. Just-in-time elevation means administrators don't have standing access — they request it when needed and it expires automatically.

Session management controls how long a user stays authenticated. Active sessions timeout after 8 hours (a workday), idle sessions after 30 minutes. Privileged sessions timeout after 1 hour. Tokens are short-lived (1 hour) with refresh token rotation to detect theft. Sessions are bound to devices and IP ranges to prevent token replay.

Access provisioning and deprovisioning are the most common audit findings. Onboarding must provision access within days of hire. Offboarding must revoke access within 24 hours of departure. Access changes (role changes, transfers) must update access within 3 business days. Automated provisioning via HR system integration reduces errors.

Access reviews ensure access stays current. Quarterly reviews by managers verify that users still need their access. Monthly reviews of privileged access by the CISO verify need-to-know. Dormant accounts (inactive 30+ days) are disabled automatically. Without reviews, access accumulates — people change roles but keep old access.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Zero trust | No implicit trust, verify every request | Device posture + user identity + context |
| Small team | Simplified RBAC, manual reviews | 2-3 roles, quarterly review |
| Enterprise | Full RBAC + ABAC + PAM | Automated provisioning, quarterly reviews |
| Healthcare | Add HIPAA-specific controls | PHI access logging, minimum necessary |
| Financial | Add SOX-specific controls | Segregation of duties, change approval |
| Remote-first | Device posture checks | Managed device required for prod access |

## What Works

1. Require MFA for everyone — it's the single most effective control
2. Use RBAC for structure, ABAC for context — hybrid model handles both
3. Automate provisioning — manual provisioning is slow and error-prone
4. Review access quarterly — stale access is the top audit finding
5. Use just-in-time privileged access — no standing admin access
6. Log all access — accountability requires audit trails
7. Disable dormant accounts — inactive accounts are attack targets

## Common Mistakes

1. No MFA — single factor is not enough, even with strong passwords
2. Standing admin access — admins always have access, increasing attack surface
3. No access reviews — access accumulates indefinitely
4. Manual provisioning — slow, inconsistent, error-prone
5. Shared accounts — no individual accountability
6. No offboarding process — departed employees retain access
7. Overly broad permissions — users get more access than they need

## Frequently Asked Questions

### What is the difference between authentication and authorization?

Authentication verifies who you are (identity). Authorization determines what you can do (permissions). You authenticate with a password + MFA, then authorization checks your role and permissions to decide if you can access a specific resource. Authentication answers "who are you?" Authorization answers "what are you allowed to do?"

### Should we use RBAC or ABAC?

Start with RBAC. It's simpler and handles most cases: assign users to roles, roles have permissions. Add ABAC when you need contextual restrictions: "developers can only access production during business hours from a managed device." The hybrid model uses RBAC for structural access and ABAC for fine-grained contextual rules.

### How often should we rotate API keys?

Every 90 days for most API keys. For high-privilege keys (admin access), rotate every 30 days. Automated rotation is better than manual — manual rotation is often delayed. Use a key management service (AWS KMS, HashiCorp Vault) to automate rotation. Never hardcode keys in source code or configuration files.

### What is just-in-time access?

Just-in-time (JIT) access means users request elevated permissions when they need them, and the permissions expire automatically after a set time. Instead of always having admin access, an admin requests it for a specific task, gets approval, and access expires after 1-4 hours. This reduces the attack surface — there's no standing admin access to steal.

### How do we handle service accounts?

Service accounts need documented owners, specific purposes, and scoped permissions. Create a service account registry: account name, owner, purpose, permissions, last review date. Rotate credentials every 90 days. Monitor usage — unexpected API calls may indicate compromise. Disable service accounts when the service is decommissioned.
