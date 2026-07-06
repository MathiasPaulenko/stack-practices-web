---
contentType: docs
slug: security-audit-checklist
title: "Checklist de Auditoría de Seguridad"
description: "Un checklist para auditorías de seguridad cubriendo network security, application security, data protection, access control, monitoring y compliance."
metaDescription: "Usá este checklist de auditoría de seguridad para verificar network security, application security, data protection, access control, monitoring y compliance."
difficulty: intermediate
topics:
  - testing
tags:
  - security
  - audit
  - checklist
  - compliance
  - vulnerability
  - review
  - infrastructure
relatedResources:
  - /docs/security/access-control-policy-template
  - /docs/security/incident-response-plan-template
  - /docs/security/vulnerability-management-process-template
  - /docs/data-engineering/data-governance-policy-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usá este checklist de auditoría de seguridad para verificar network security, application security, data protection, access control, monitoring y compliance."
  keywords:
    - security audit
    - checklist
    - compliance
    - vulnerability
    - network security
    - application security
    - review
---

## Overview

Un security audit checklist provee un systematic way para verify que security controls están en place y funcionando. Coverea network security, application security, data protection, access control, monitoring, incident response y compliance. El checklist ensure que audits son consistent, repeatable y coverean all critical areas.

## When to Use

- Conductiendo internal security audits
- Preparándote para external compliance audits (SOC 2, ISO 27001)
- Onboardéando new systems o services
- Post-incident security review
- Annual security assessment
- Vendor security evaluation

## Solution

```markdown
# Security Audit — `<System/Organization Name>`

## Audit Overview

| Field | Value |
|-------|-------|
| Audit Scope | Example Corp Infrastructure + Applications |
| Audit Type | Internal |
| Auditor | Security Team |
| Audit Date | 2026-07-05 |
| Last Audit | 2026-01-10 |
| Audit Period | Jan 2026 - Jun 2026 |
| Compliance Frameworks | SOC 2, ISO 27001, GDPR |
| Overall Risk Rating | Medium |

## 1. Network Security

### Firewall Configuration

| Check | Status | Notes |
|-------|--------|-------|
| Firewall rules documented | ✅ | All rules en version control |
| Default deny policy | ✅ | Deny all, allow by exception |
| No any-any rules | ✅ | All rules tienen specific source/dest |
| Firewall rules reviewed | ✅ | Reviewed quarterly, last: 2026-06-01 |
| No unused rules | ✅ | Stale rules removed en last review |
| Management access restricted | ✅ | Firewall admin via VPN only |
| Firewall logs enabled | ✅ | Logs sent a SIEM |
| Firewall firmware current | ✅ | Updated 2026-06-15 |

### Network Segmentation

| Check | Status | Notes |
|-------|--------|-------|
| DMZ configured | ✅ | Public services en DMZ |
| Internal network segmented | ✅ | VLANs per department |
| Production network isolated | ✅ | Separate VPC, no direct internet |
| Database network isolated | ✅ | Private subnets only |
| Management network isolated | ✅ | Jump host required |
| Network policies (K8s) | ✅ | Default deny between namespaces |
| Service mesh (mTLS) | ✅ | Istio mTLS between services |

### DNS Security

| Check | Status | Notes |
|-------|--------|-------|
| DNSSEC enabled | ✅ | On all public zones |
| DNS filtering | ✅ | Blockea known malicious domains |
| DNS logging | ✅ | All DNS queries logged |
| DNS over TLS | ✅ | Internal resolvers soportan DoT |

### DDoS Protection

| Check | Status | Notes |
|-------|--------|-------|
| DDoS mitigation | ✅ | Cloudflare en front de all services |
| Rate limiting | ✅ | API: 1000 req/min, Web: 100 req/min |
| SYN flood protection | ✅ | TCP SYN cookies enabled |
| Traffic monitoring | ✅ | Anomaly detection via SIEM |

## 2. Application Security

### Authentication

| Check | Status | Notes |
|-------|--------|-------|
| MFA enforced | ✅ | All users, TOTP o hardware key |
| Password policy | ✅ | 14+ chars, breach check, Argon2id |
| Session management | ✅ | 30 min idle, 8 hour active, Secure cookies |
| Account lockout | ✅ | 10 failed attempts, 15 min lockout |
| Password reset | ✅ | Token-based, 1-hour expiry, notify user |

### Authorization

| Check | Status | Notes |
|-------|--------|-------|
| RBAC implemented | ✅ | Role-based permissions |
| Least privilege | ✅ | Users tienen minimum required access |
| Access reviews | ✅ | Quarterly, last: 2026-06-15 |
| Privileged access managed | ✅ | JIT access, session recording |
| API authorization | ✅ | Scoped tokens, per-endpoint checks |

### Input Validation

| Check | Status | Notes |
|-------|--------|-------|
| SQL injection prevention | ✅ | Parameterized queries everywhere |
| XSS prevention | ✅ | Output encoding, CSP headers |
| CSRF protection | ✅ | SameSite cookies + CSRF tokens |
| Command injection prevention | ✅ | No shell exec, input sanitization |
| Path traversal prevention | ✅ | Input validation, chroot |
| File upload validation | ✅ | Type check, size limit, virus scan |
| SSRF prevention | ✅ | Allowlist para outbound requests |

### API Security

| Check | Status | Notes |
|-------|--------|-------|
| Authentication required | ✅ | All endpoints require auth |
| Rate limiting | ✅ | Per-user y per-IP limits |
| Input validation | ✅ | Schema validation en all inputs |
| Output encoding | ✅ | JSON encoding, no HTML en API |
| API versioning | ✅ | Versioned endpoints, deprecation policy |
| API documentation | ✅ | OpenAPI spec, kept current |
| GraphQL depth limiting | ✅ | Max query depth: 10 |
| GraphQL cost analysis | ✅ | Max query cost: 1000 |

### Security Headers

| Header | Value | Status |
|--------|-------|--------|
| Content-Security-Policy | default-src 'self' | ✅ |
| X-Content-Type-Options | nosniff | ✅ |
| X-Frame-Options | DENY | ✅ |
| Strict-Transport-Security | max-age=31536000; includeSubDomains | ✅ |
| Referrer-Policy | strict-origin-when-cross-origin | ✅ |
| Permissions-Policy | geolocation=(), microphone=(), camera=() | ✅ |
| X-XSS-Protection | 0 (deprecated, CSP used instead) | ✅ |

### Dependency Security

| Check | Status | Notes |
|-------|--------|-------|
| Dependency scan en CI | ✅ | npm audit + Snyk en every PR |
| Vulnerability threshold | ✅ | 0 critical, 0 high allowed |
| Dependency pinning | ✅ | Exact versions en lockfile |
| License compliance | ✅ | No GPL-3.0, checked en CI |
| SBOM generated | ✅ | CycloneDX SBOM per release |
| Container scan | ✅ | Trivy scan en every image build |

## 3. Data Protection

### Encryption

| Check | Status | Notes |
|-------|--------|-------|
| TLS 1.2+ para all traffic | ✅ | TLS 1.3 where supported |
| No SSL/TLS deprecated versions | ✅ | SSLv3, TLS 1.0/1.1 disabled |
| Certificate management | ✅ | ACM auto-renewal, 90-day expiry |
| Encryption at rest (databases) | ✅ | AES-256, AWS KMS |
| Encryption at rest (S3) | ✅ | SSE-KMS en all buckets |
| Encryption at rest (EBS) | ✅ | All volumes encrypted |
| Field-level encryption (PII) | ✅ | Application-level encryption para PII |
| Key rotation | ✅ | KMS keys rotated annually |

### Data Handling

| Check | Status | Notes |
|-------|--------|-------|
| Data classification | ✅ | L1-L4 classification en place |
| PII identified y tagged | ✅ | All PII fields documented |
| Data retention policy | ✅ | Per data category, automated enforcement |
| Data deletion procedure | ✅ | Secure deletion, verified quarterly |
| Backup encryption | ✅ | All backups encrypted |
| Backup testing | ✅ | Monthly restore test |
| Data residency | ✅ | EU data en EU region, US data en US region |

### Secrets Management

| Check | Status | Notes |
|-------|--------|-------|
| No secrets en source code | ✅ | GitLeaks scan en CI |
| No secrets en environment files | ✅ | .env files en .gitignore |
| Secrets stored en vault | ✅ | HashiCorp Vault para all secrets |
| Secret rotation | ✅ | Automated rotation every 90 days |
| Secret access logging | ✅ | All Vault access logged |
| Secret access control | ✅ | RBAC en Vault paths |

## 4. Infrastructure Security

### Cloud Security

| Check | Status | Notes |
|-------|--------|-------|
| CIS benchmarks applied | ✅ | CIS AWS Foundation, 95% compliant |
| No public S3 buckets | ✅ | All buckets private, verified by script |
| No public RDS instances | ✅ | All databases en private subnets |
| Security groups minimal | ✅ | Least privilege, reviewed monthly |
| IAM least privilege | ✅ | No wildcard permissions en production |
| CloudTrail enabled | ✅ | All regions, log file integrity |
| Config rules enabled | ✅ | Compliance rules, auto-remediation |
| GuardDuty enabled | ✅ | Threat detection en all regions |

### Kubernetes Security

| Check | Status | Notes |
|-------|--------|-------|
| Pod Security Standards | ✅ | Restricted profile enforced |
| No privileged containers | ✅ | Checked por Kyverno policy |
| No root containers | ✅ | runAsNonRoot: true |
| Read-only root filesystem | ✅ | readOnlyRootFilesystem: true |
| Network policies | ✅ | Default deny, allow by namespace |
| RBAC enabled | ✅ | Least privilege per service account |
| API server access restricted | ✅ | Private endpoint, no public access |
| etcd encryption | ✅ | Encryption at rest enabled |
| Admission controllers | ✅ | Kyverno + OPA Gatekeeper |

### Server Hardening

| Check | Status | Notes |
|-------|--------|-------|
| OS baseline hardened | ✅ | CIS benchmark, Ansible playbook |
| Unnecessary services disabled | ✅ | Minimal install, no GUI |
| SSH key-only auth | ✅ | Password auth disabled |
| SSH root login disabled | ✅ | PermitRootLogin no |
| Fail2ban installed | ✅ | SSH brute force protection |
| Automatic security updates | ✅ | Unattended-upgrades para critical |
| File integrity monitoring | ✅ | AIDE en all production servers |
| Host-based IDS | ✅ | Wazuh agent en all servers |

## 5. Monitoring and Logging

### Log Collection

| Log Source | Collected | Retention | SIEM Integration |
|------------|-----------|-----------|------------------|
| Application logs | ✅ | 90 days | ✅ Splunk |
| Access logs | ✅ | 1 year | ✅ Splunk |
| Audit logs | ✅ | 3 years | ✅ Splunk |
| Firewall logs | ✅ | 90 days | ✅ Splunk |
| CloudTrail | ✅ | 1 year | ✅ Splunk |
| Kubernetes audit | ✅ | 90 days | ✅ Splunk |
| Database audit | ✅ | 1 year | ✅ Splunk |
| Authentication | ✅ | 1 year | ✅ Splunk |

### Alerting

| Alert | Condition | Severity | Response |
|-------|-----------|----------|----------|
| Failed login spike | > 50 failures en 5 min | High | Investigá brute force |
| Privilege escalation | New admin role assigned | High | Verify approval |
| Unusual API access | New IP o user agent | Medium | Verify con user |
| Data exfiltration | Large export desde DB | Critical | Immediate investigation |
| Malware detection | EDR alert en any host | Critical | Isolate host, investigá |
| Configuration change | Security group modified | Medium | Verify change ticket |
| Certificate expiry | < 14 days a expiry | High | Auto-renew o manual |

### SIEM Configuration

| Check | Status | Notes |
|-------|--------|-------|
| Log ingestion working | ✅ | All sources sending logs |
| Correlation rules | ✅ | 25 rules, tested quarterly |
| Alert tuning | ✅ | False positive rate < 5% |
| Dashboards | ✅ | Security operations dashboard |
| Threat intelligence | ✅ | Feed integrated, auto-blocking |
| Incident tracking | ✅ | All alerts tracked en Jira |

## 6. Incident Response

### Incident Response Plan

| Check | Status | Notes |
|-------|--------|-------|
| IR plan documented | ✅ | Last updated 2026-06-01 |
| IR team defined | ✅ | 5 members, 24/7 on-call |
| Contact list current | ✅ | Updated monthly |
| Escalation procedure | ✅ | Defined para all severity levels |
| Tabletop exercise | ✅ | Last: 2026-05-15, next: 2026-08-15 |
| Post-incident review | ✅ | Process defined, blameless |
| Communication plan | ✅ | Internal y external templates |

### Incident Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Mean time to detect (MTTD) | < 15 min | 8 min | ✅ |
| Mean time to respond (MTTR) | < 30 min | 22 min | ✅ |
| Mean time to contain | < 4 hours | 2.5 hours | ✅ |
| Mean time to recover | < 24 hours | 18 hours | ✅ |
| Incidents this period | — | 3 | — |
| Critical incidents | 0 | 0 | ✅ |
| Post-incident reviews completed | 100% | 100% | ✅ |

## 7. Compliance

### SOC 2

| Control | Status | Evidence |
|---------|--------|----------|
| CC6.1 Logical access controls | ✅ | Access control policy, RBAC config |
| CC6.6 Boundary protection | ✅ | Firewall rules, network segmentation |
| CC7.1 System monitoring | ✅ | SIEM dashboards, alerting rules |
| CC7.2 Anomaly detection | ✅ | GuardDuty, SIEM correlation |
| CC7.3 Incident response | ✅ | IR plan, tabletop results |
| CC8.1 Change management | ✅ | CI/CD pipeline, approval records |

### GDPR

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Data processing records (ROPA) | ✅ | ROPA document, updated quarterly |
| Consent management | ✅ | CMP en place, audit logs |
| Data subject rights | ✅ | DSR portal, 30-day SLA |
| Data breach notification | ✅ | 72-hour notification procedure |
| Privacy by design | ✅ | Privacy review en design phase |
| Data Protection Officer | ✅ | DPO appointed, reports a board |

### ISO 27001

| Control | Status | Evidence |
|---------|--------|----------|
| A.5 Information security policies | ✅ | Policy library, approved |
| A.6 Organization of security | ✅ | Security team, roles defined |
| A.8 Asset management | ✅ | Asset inventory, classification |
| A.9 Access control | ✅ | Access control policy, reviews |
| A.10 Cryptography | ✅ | Encryption policy, key management |
| A.12 Operations security | ✅ | Hardening, monitoring, logging |
| A.16 Incident management | ✅ | IR plan, incident records |
```

## Explanation

Un security audit checklist coverea seven domains: network security, application security, data protection, infrastructure security, monitoring, incident response y compliance. Cada domain tiene specific controls que se pueden verify through configuration review, log analysis o testing.

Network security verify que el network perimeter está defended. Firewalls deben tener un default deny policy con specific allow rules. Network segmentation aísla production, databases y management networks. DDoS protection y DNS security defienden contra external attacks. Sin estos controls, attackers pueden reach internal services directly.

Application security verify que el application defiende contra common attacks. Authentication debe usar MFA y strong password policies. Authorization debe enforce least privilege. Input validation previene injection attacks (SQL, XSS, CSRF, command, path traversal). Security headers addean browser-level protections. Dependency scanning catchea known vulnerabilities en third-party libraries.

Data protection verify que data está encrypted y handled properly. Encryption debe cover data in transit (TLS 1.2+) y at rest (AES-256). PII debe estar identified, tagged y encrypted at el field level. Secrets no deben estar en source code — usá un vault con automated rotation. Data retention y deletion deben enforced automáticamente.

Infrastructure security verify cloud y server hardening. CIS benchmarks proveen un baseline. No public S3 buckets, no public databases, minimal security groups. Kubernetes debe enforce pod security standards, network policies y RBAC. Servers deben hardenarse con key-only SSH, automatic updates y host-based IDS.

Monitoring y logging verify que security events se capturen y alerten. All log sources deben feed a un SIEM. Correlation rules detectan patterns across log sources. Alerting debe tunearse para minimize false positives. Threat intelligence feeds enhance detection. Sin monitoring, attacks van undetected.

Incident response verify que el organization puede responder a security incidents. Un IR plan define roles, escalation y communication. Tabletop exercises testean el plan. Metrics (MTTD, MTTR) measure effectiveness. Post-incident reviews identify improvements. Sin un IR plan, incidents son chaotic y slow.

Compliance verify que controls meet regulatory requirements. SOC 2, GDPR y ISO 27001 cada uno tienen specific controls. El checklist mapea cada control a evidence (policies, configurations, logs). Esta evidence es lo que auditors reviewean durante un external audit.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Startup | Focused checklist: auth, encryption, monitoring | Priorizá critical controls |
| Enterprise | Full checklist con all domains | Incluí compliance mapping |
| Healthcare | Addeá HIPAA controls | PHI handling, BAA agreements |
| Financial | Addeá PCI-DSS controls | Card data handling, network isolation |
| Cloud-native | Focus en cloud y K8s security | Less server hardening |
| Air-gapped | Focus en physical y network security | No external DDoS, no cloud controls |

## What Works

1. Automatizá checks where possible — CIS benchmarks, dependency scans, secret scanning
2. Revieweá quarterly — security drift pasa fast
3. Mapeá controls a compliance frameworks — un audit coverea multiple frameworks
4. Trackeá metrics — MTTD y MTTR muestran si security está improving
5. Testeá incident response — untested plans failan under pressure
6. Documentá everything — auditors necesitan evidence, no assertions
7. Priorizá by risk — fixeá critical findings antes que low findings

## Common Mistakes

1. Checklist too long — auditors no pueden complete it, checks se skipean
2. No automation — manual checks son inconsistent y slow
3. No follow-up — findings identified pero no remediated
4. No evidence — controls claimed pero no demonstrated
5. One-time audit — security cambia, audits deben ser recurring
6. Scope too narrow — missing cloud, K8s o application security
7. No risk rating — all findings treated equally, critical issues se pierden

## Frequently Asked Questions

### ¿Cuán seguido deberíamos conductir security audits?

Internal audits deberían ser quarterly. External compliance audits son típicamente annual. Critical infrastructure o high-risk environments pueden require monthly audits. El key es consistency: un quarterly audit catchea drift antes de que se vuelva un problem. Annual-only audits dejan 11 months de unmonitored changes.

### ¿Cuál es la difference entre un security audit y un penetration test?

Un security audit verify que controls están en place y configured correctly — es un configuration review. Un penetration test attempta bypass controls simulando attacks — es un control effectiveness test. Audits answer "están los controls ahí?" Penetration tests answer "funcionan los controls?" Ambos son needed.

### ¿Cómo priorizamos audit findings?

Usá un risk-based approach. Critical findings (exposed PII, unpatched critical vulnerabilities, no MFA) se fixean immediately. High findings (weak encryption, missing monitoring) se fixean within 30 days. Medium findings (missing documentation, stale access reviews) se fixean within 90 days. Low findings (minor hardening) se trackean y fixean opportunistically.

### ¿Deberíamos usar automated security scanning tools?

Sí, para repetitive checks. Automated tools (CIS benchmarks, dependency scanners, secret scanners, container scanners) pueden correr continuously en CI/CD. Esto free a auditors para focus en areas que require judgment: access reviews, policy compliance, incident response readiness. Automation catchea configuration drift; humans catchean design flaws.

### ¿Qué evidence necesitan auditors?

Auditors necesitan evidence que controls existen y operan effectively. Evidence incluye: policy documents, configuration screenshots, log exports, access review records, incident reports y test results. El checklist debería reference dónde evidence se storea (wiki, ticketing system, SIEM) para que auditors puedan find it quickly.
