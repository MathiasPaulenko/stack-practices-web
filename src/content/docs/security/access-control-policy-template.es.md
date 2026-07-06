---
contentType: docs
slug: access-control-policy-template
title: "Plantilla de Política de Control de Acceso"
description: "Una plantilla para definir autenticación, autorización, RBAC, ABAC, MFA, políticas de contraseñas, gestión de sesiones y revisiones de acceso."
metaDescription: "Usá esta plantilla de política de control de acceso para definir autenticación, autorización, RBAC, MFA, contraseñas, sesiones y revisiones."
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
  metaDescription: "Usá esta plantilla de política de control de acceso para definir autenticación, autorización, RBAC, MFA, contraseñas, sesiones y revisiones."
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

Un access control policy define cómo users y services se autentican, qué pueden acceder y cómo access se review y revoke. Coverea authentication methods, authorization models, password standards, MFA requirements, session management y access review procedures. Sin un policy, access crece unchecked y se vuelve un security liability.

## When to Use

- Estableciendo access control para un new organization
- Preparándote para compliance audits (SOC 2, ISO 27001, HIPAA)
- Definiendo role-based access para applications
- Reviewéando y tightening existing access controls
- Onboardéando new systems o services

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
| Password + MFA | User login (all) | Yes (TOTP o hardware key) | Default para all users |
| SSO (SAML/OIDC) | Enterprise apps | Yes (via IdP) | Okta como IdP |
| API keys | Service-to-service | N/A | Rotated every 90 days |
| OAuth 2.0 | Third-party integrations | N/A | Scoped tokens, 1-hour expiry |
| SSH keys | Server access | Yes (MFA en jump host) | Ed25519 keys only |
| Client certificates | mTLS services | N/A | Issued por internal CA |

### Password Policy

| Requirement | Value | Rationale |
|-------------|-------|-----------|
| Minimum length | 14 characters | Resistance a brute force |
| Character classes | 3 de 4 (upper, lower, digit, special) | Complexity sin complexity rules |
| Password history | Last 24 passwords | Prevenir reuse |
| Password age | No maximum (NIST guidance) | Frequent changes causan weaker passwords |
| Breach check | Check contra Have I Been Pwned | Prevenir use de breached passwords |
| Lockout threshold | 10 failed attempts | Account lockout después de 10 tries |
| Lockout duration | 15 minutes | Auto-unlock después de 15 min |
| Storage | Argon2id hash | Memory-hard, slow cracking |

### Multi-Factor Authentication (MFA)

| User Group | MFA Method | Enforcement | Recovery |
|-------------|------------|-------------|----------|
| All employees | TOTP (Google Authenticator) | Required at login | Backup codes |
| Administrators | Hardware key (YubiKey) | Required at login | Backup hardware key |
| Developers | TOTP o hardware key | Required para prod access | Backup codes |
| Service accounts | No MFA (API key) | N/A | Key rotation |
| Contractors | TOTP | Required at login | Sponsor-managed |

### MFA Enrollment Process

| Step | Action | Responsible | Duration |
|------|--------|-------------|----------|
| 1 | User requestea MFA enrollment | User | — |
| 2 | IT verify identity | IT Support | 1 business day |
| 3 | User install authenticator app | User | 15 minutes |
| 4 | User scan QR code | User + IT | 5 minutes |
| 5 | User verify con test code | User | 2 minutes |
| 6 | User save backup codes | User | 5 minutes |
| 7 | IT enable MFA enforcement | IT Support | Same day |

## 2. Authorization

### Role-Based Access Control (RBAC)

| Role | Description | Permissions | Assignment |
|------|-------------|-------------|------------|
| Viewer | Read-only access | View dashboards, reports | Auto-assigned a all employees |
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

| Attribute | Values | Effect en Access |
|-----------|--------|------------------|
| Department | Engineering, Finance, HR, Sales | Restringe a department resources |
| Location | Office, Remote, VPN | Remote require VPN para prod |
| Time | Business hours, Off-hours | Prod deploy solo en business hours |
| Device | Managed, Unmanaged | Unmanaged devices blocked desde prod |
| Risk score | Low, Medium, High | High risk require step-up auth |

### Privileged Access Management (PAM)

| Privilege | Access Method | Approval | Duration | Logging |
|-----------|--------------|----------|----------|---------|
| Production SSH | Jump host con MFA | Manager approval | 4 hours | Full session recording |
| Database admin | Bastion con MFA | Manager + DBA approval | 2 hours | Query logging |
| Cloud console | Break-glass account | CISO approval | 1 hour | Full audit trail |
| Kubernetes admin | kubectl via jump host | Manager approval | 4 hours | Command logging |
| Root/sudo | Just-in-time elevation | Manager + CISO approval | 1 hour | Command logging |

## 3. Session Management

### Session Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Session timeout (active) | 8 hours | Workday sin re-auth |
| Session timeout (idle) | 30 minutes | Auto-logout on inactivity |
| Session timeout (privileged) | 1 hour | Shorter para admin sessions |
| Concurrent sessions | 3 max | Prevenir session sharing |
| Session storage | HTTP-only, Secure cookies | Prevenir XSS theft |
| CSRF protection | SameSite=Strict cookies | Prevenir CSRF attacks |
| Session invalidation | On password change | Force re-auth después de change |
| Token expiry (API) | 1 hour access, 30 days refresh | Short-lived access tokens |

### Session Security

| Check | Implementation | Verification |
|-------|----------------|--------------|
| Tokens signed | JWT con RS256 | Verify signature en every request |
| Tokens encrypted | JWE para sensitive claims | Decrypt server-side only |
| Refresh token rotation | New refresh token each use | Detect token theft |
| Device binding | Token bound a device fingerprint | Reject desde other devices |
| IP binding | Token bound a IP range | Reject desde unexpected IPs |
| Session revocation | Revocation list checked | Immediate logout |

## 4. Access Provisioning

### Onboarding Process

| Step | Action | Responsible | SLA |
|------|--------|-------------|-----|
| 1 | HR crea employee record | HR | Before start date |
| 2 | IT crea accounts | IT | 1 business day |
| 3 | Manager requestea access | Manager | 1 business day |
| 4 | Access approved | Data Owner | 2 business days |
| 5 | Access provisioned | IT | 1 business day |
| 6 | User notified | IT | Same day |
| 7 | Access recorded | Compliance | 1 business day |

### Offboarding Process

| Step | Action | Responsible | SLA |
|------|--------|-------------|-----|
| 1 | HR notifica departure | HR | On departure date |
| 2 | Manager confirma last day | Manager | Same day |
| 3 | Access revoked | IT | Within 24 hours |
| 4 | Devices returned | IT | Within 3 days |
| 5 | Accounts deactivated | IT | Within 24 hours |
| 6 | Access recorded | Compliance | 1 business day |
| 7 | Final access review | Compliance | 1 week |

### Access Change Process

| Trigger | Action | Approver | SLA |
|---------|--------|----------|-----|
| Role change | Review y update access | New manager | 3 business days |
| Team transfer | Removeá old team access, add new | New manager | 3 business days |
| Promotion | Addé new role permissions | Manager + CISO | 5 business days |
| Demotion | Removeá elevated access | Manager | 1 business day |
| Temporary access | Grant con expiry date | Manager + Data Owner | 1 business day |

## 5. Access Reviews

### Review Schedule

| Scope | Frequency | Reviewer | Action |
|-------|-----------|----------|--------|
| All user access | Quarterly | Manager | Removeá unused access |
| Privileged access | Monthly | CISO | Verify need-to-know |
| Service accounts | Quarterly | Technical Owner | Verify still needed |
| External access | Monthly | Sponsor | Verify contract active |
| Dormant accounts | Monthly | IT | Disable después de 30 days inactive |
| Orphaned accounts | Monthly | IT | Removeá accounts con no owner |

### Review Checklist

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| User still employed | Cross-reference con HR | All users tienen active HR record |
| Access matches role | Compare permissions a role definition | No excessive permissions |
| No shared accounts | Verify unique user per account | Cada account tiene one user |
| MFA enabled | Check IdP MFA enrollment | 100% enrollment |
| No dormant accounts | Check last login date | No accounts inactive > 30 days |
| Service accounts documented | Check service account registry | All accounts tienen owner y purpose |
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
| Key storage | Hashed at rest (bcrypt) | Verify hash, no plaintext |
| Key transmission | TLS 1.2+ only | Verify no HTTP |
| Key rotation | Every 90 days | Automated rotation pipeline |
| Key revocation | Immediate via revocation list | Verify revocation propagation |
| Key scope | Least privilege per key | Audit scopes quarterly |
| Key logging | Never log key values | Grep logs para key patterns |
```

## Explanation

Un access control policy gobierna quién puede acceder a qué y bajo qué conditions. Tiene three components: authentication (quién sos), authorization (qué podés hacer) y accountability (qué hiciste). Cada component tiene specific controls y procedures.

Authentication verify identity. Passwords siguen siendo el primary method, pero deben meet modern standards: 14+ characters, checked contra breach databases, stored con Argon2id. MFA es mandatory para all users — TOTP para regular users, hardware keys para administrators. El policy rejectea outdated practices como forced password rotation (NIST recommends against it) y complexity rules (leadan a predictable patterns).

Authorization determina qué puede hacer un authenticated user. RBAC assigna permissions through roles: viewers, developers, administrators. Cada role tiene un defined permission set. ABAC addea contextual attributes: department, location, device, time. El hybrid model handlea both structural access (roles) y contextual restrictions (attributes).

Privileged access management controla administrative access. Production SSH, database admin y cloud console access require approval, tienen time limits y están fully logged. Just-in-time elevation significa que administrators no tienen standing access — lo requestean cuando needed y expira automáticamente.

Session management controla cuánto time un user stay authenticated. Active sessions timeout después de 8 hours (un workday), idle sessions después de 30 minutes. Privileged sessions timeout después de 1 hour. Tokens son short-lived (1 hour) con refresh token rotation para detect theft. Sessions están bound a devices y IP ranges para prevenir token replay.

Access provisioning y deprovisioning son los most common audit findings. Onboarding debe provision access within days de hire. Offboarding debe revoke access within 24 hours de departure. Access changes (role changes, transfers) deben update access within 3 business days. Automated provisioning via HR system integration reduce errors.

Access reviews ensure que access stays current. Quarterly reviews por managers verify que users todavía necesitan su access. Monthly reviews de privileged access por el CISO verify need-to-know. Dormant accounts (inactive 30+ days) se disablean automáticamente. Sin reviews, access accumula — people cambian roles pero keep old access.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Zero trust | No implicit trust, verify every request | Device posture + user identity + context |
| Small team | Simplified RBAC, manual reviews | 2-3 roles, quarterly review |
| Enterprise | Full RBAC + ABAC + PAM | Automated provisioning, quarterly reviews |
| Healthcare | Addeá HIPAA-specific controls | PHI access logging, minimum necessary |
| Financial | Addeá SOX-specific controls | Segregation of duties, change approval |
| Remote-first | Device posture checks | Managed device required para prod access |

## What Works

1. Require MFA para everyone — es el single most effective control
2. Usá RBAC para structure, ABAC para context — hybrid model handlea both
3. Automatizá provisioning — manual provisioning es slow y error-prone
4. Revieweá access quarterly — stale access es el top audit finding
5. Usá just-in-time privileged access — no standing admin access
6. Logeá all access — accountability require audit trails
7. Disableá dormant accounts — inactive accounts son attack targets

## Common Mistakes

1. No MFA — single factor no es enough, even con strong passwords
2. Standing admin access — admins siempre tienen access, increase attack surface
3. No access reviews — access accumula indefinitely
4. Manual provisioning — slow, inconsistent, error-prone
5. Shared accounts — no individual accountability
6. No offboarding process — departed employees retain access
7. Overly broad permissions — users get more access que lo que necesitan

## Frequently Asked Questions

### ¿Cuál es la difference entre authentication y authorization?

Authentication verify quién sos (identity). Authorization determina qué podés hacer (permissions). Te autenticás con un password + MFA, luego authorization checkea tu role y permissions para decidir si podés acceder a un specific resource. Authentication answer "quién sos?" Authorization answer "qué tenés permitido hacer?"

### ¿Deberíamos usar RBAC o ABAC?

Empezá con RBAC. Es simpler y handlea most cases: assigná users a roles, roles tienen permissions. Addeá ABAC cuando necesitás contextual restrictions: "developers solo pueden acceder a production durante business hours desde un managed device." El hybrid model usa RBAC para structural access y ABAC para fine-grained contextual rules.

### ¿Cuán seguido deberíamos rotar API keys?

Every 90 days para most API keys. Para high-privilege keys (admin access), rotateá every 30 days. Automated rotation es better que manual — manual rotation es often delayed. Usá un key management service (AWS KMS, HashiCorp Vault) para automate rotation. Nunca hardcodees keys en source code o configuration files.

### ¿Qué es just-in-time access?

Just-in-time (JIT) access significa que users requestean elevated permissions cuando las necesitan, y las permissions expiran automáticamente después de un set time. En vez de siempre tener admin access, un admin lo requestea para un specific task, gets approval y access expira después de 1-4 hours. Esto reduce el attack surface — no hay standing admin access para steal.

### ¿Cómo handleamos service accounts?

Service accounts necesitan documented owners, specific purposes y scoped permissions. Creá un service account registry: account name, owner, purpose, permissions, last review date. Rotateá credentials every 90 days. Monitoreá usage — unexpected API calls pueden indicate compromise. Disableá service accounts cuando el service se decommissiona.
