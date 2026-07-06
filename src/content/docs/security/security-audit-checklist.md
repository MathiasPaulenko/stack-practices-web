---
contentType: docs
slug: security-audit-checklist
title: "Security Audit Checklist"
description: "A checklist for security audits covering network security, application security, data protection, access control, monitoring, incident response, and compliance."
metaDescription: "Use this security audit checklist to verify network security, application security, data protection, access control, monitoring, and compliance controls."
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
  metaDescription: "Use this security audit checklist to verify network security, application security, data protection, access control, monitoring, and compliance controls."
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

A security audit checklist provides a systematic way to verify that security controls are in place and functioning. It covers network security, application security, data protection, access control, monitoring, incident response, and compliance. The checklist ensures audits are consistent, repeatable, and cover all critical areas.

## When to Use

- Conducting internal security audits
- Preparing for external compliance audits (SOC 2, ISO 27001)
- Onboarding new systems or services
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
| Firewall rules documented | ✅ | All rules in version control |
| Default deny policy | ✅ | Deny all, allow by exception |
| No any-any rules | ✅ | All rules have specific source/dest |
| Firewall rules reviewed | ✅ | Reviewed quarterly, last: 2026-06-01 |
| No unused rules | ✅ | Stale rules removed in last review |
| Management access restricted | ✅ | Firewall admin via VPN only |
| Firewall logs enabled | ✅ | Logs sent to SIEM |
| Firewall firmware current | ✅ | Updated 2026-06-15 |

### Network Segmentation

| Check | Status | Notes |
|-------|--------|-------|
| DMZ configured | ✅ | Public services in DMZ |
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
| DNS filtering | ✅ | Blocks known malicious domains |
| DNS logging | ✅ | All DNS queries logged |
| DNS over TLS | ✅ | Internal resolvers support DoT |

### DDoS Protection

| Check | Status | Notes |
|-------|--------|-------|
| DDoS mitigation | ✅ | Cloudflare in front of all services |
| Rate limiting | ✅ | API: 1000 req/min, Web: 100 req/min |
| SYN flood protection | ✅ | TCP SYN cookies enabled |
| Traffic monitoring | ✅ | Anomaly detection via SIEM |

## 2. Application Security

### Authentication

| Check | Status | Notes |
|-------|--------|-------|
| MFA enforced | ✅ | All users, TOTP or hardware key |
| Password policy | ✅ | 14+ chars, breach check, Argon2id |
| Session management | ✅ | 30 min idle, 8 hour active, Secure cookies |
| Account lockout | ✅ | 10 failed attempts, 15 min lockout |
| Password reset | ✅ | Token-based, 1-hour expiry, notify user |

### Authorization

| Check | Status | Notes |
|-------|--------|-------|
| RBAC implemented | ✅ | Role-based permissions |
| Least privilege | ✅ | Users have minimum required access |
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
| SSRF prevention | ✅ | Allowlist for outbound requests |

### API Security

| Check | Status | Notes |
|-------|--------|-------|
| Authentication required | ✅ | All endpoints require auth |
| Rate limiting | ✅ | Per-user and per-IP limits |
| Input validation | ✅ | Schema validation on all inputs |
| Output encoding | ✅ | JSON encoding, no HTML in API |
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
| Dependency scan in CI | ✅ | npm audit + Snyk on every PR |
| Vulnerability threshold | ✅ | 0 critical, 0 high allowed |
| Dependency pinning | ✅ | Exact versions in lockfile |
| License compliance | ✅ | No GPL-3.0, checked in CI |
| SBOM generated | ✅ | CycloneDX SBOM per release |
| Container scan | ✅ | Trivy scan on every image build |

## 3. Data Protection

### Encryption

| Check | Status | Notes |
|-------|--------|-------|
| TLS 1.2+ for all traffic | ✅ | TLS 1.3 where supported |
| No SSL/TLS deprecated versions | ✅ | SSLv3, TLS 1.0/1.1 disabled |
| Certificate management | ✅ | ACM auto-renewal, 90-day expiry |
| Encryption at rest (databases) | ✅ | AES-256, AWS KMS |
| Encryption at rest (S3) | ✅ | SSE-KMS on all buckets |
| Encryption at rest (EBS) | ✅ | All volumes encrypted |
| Field-level encryption (PII) | ✅ | Application-level encryption for PII |
| Key rotation | ✅ | KMS keys rotated annually |

### Data Handling

| Check | Status | Notes |
|-------|--------|-------|
| Data classification | ✅ | L1-L4 classification in place |
| PII identified and tagged | ✅ | All PII fields documented |
| Data retention policy | ✅ | Per data category, automated enforcement |
| Data deletion procedure | ✅ | Secure deletion, verified quarterly |
| Backup encryption | ✅ | All backups encrypted |
| Backup testing | ✅ | Monthly restore test |
| Data residency | ✅ | EU data in EU region, US data in US region |

### Secrets Management

| Check | Status | Notes |
|-------|--------|-------|
| No secrets in source code | ✅ | GitLeaks scan in CI |
| No secrets in environment files | ✅ | .env files in .gitignore |
| Secrets stored in vault | ✅ | HashiCorp Vault for all secrets |
| Secret rotation | ✅ | Automated rotation every 90 days |
| Secret access logging | ✅ | All Vault access logged |
| Secret access control | ✅ | RBAC on Vault paths |

## 4. Infrastructure Security

### Cloud Security

| Check | Status | Notes |
|-------|--------|-------|
| CIS benchmarks applied | ✅ | CIS AWS Foundation, 95% compliant |
| No public S3 buckets | ✅ | All buckets private, verified by script |
| No public RDS instances | ✅ | All databases in private subnets |
| Security groups minimal | ✅ | Least privilege, reviewed monthly |
| IAM least privilege | ✅ | No wildcard permissions in production |
| CloudTrail enabled | ✅ | All regions, log file integrity |
| Config rules enabled | ✅ | Compliance rules, auto-remediation |
| GuardDuty enabled | ✅ | Threat detection in all regions |

### Kubernetes Security

| Check | Status | Notes |
|-------|--------|-------|
| Pod Security Standards | ✅ | Restricted profile enforced |
| No privileged containers | ✅ | Checked by Kyverno policy |
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
| Automatic security updates | ✅ | Unattended-upgrades for critical |
| File integrity monitoring | ✅ | AIDE on all production servers |
| Host-based IDS | ✅ | Wazuh agent on all servers |

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
| Failed login spike | > 50 failures in 5 min | High | Investigate brute force |
| Privilege escalation | New admin role assigned | High | Verify approval |
| Unusual API access | New IP or user agent | Medium | Verify with user |
| Data exfiltration | Large export from DB | Critical | Immediate investigation |
| Malware detection | EDR alert on any host | Critical | Isolate host, investigate |
| Configuration change | Security group modified | Medium | Verify change ticket |
| Certificate expiry | < 14 days to expiry | High | Auto-renew or manual |

### SIEM Configuration

| Check | Status | Notes |
|-------|--------|-------|
| Log ingestion working | ✅ | All sources sending logs |
| Correlation rules | ✅ | 25 rules, tested quarterly |
| Alert tuning | ✅ | False positive rate < 5% |
| Dashboards | ✅ | Security operations dashboard |
| Threat intelligence | ✅ | Feed integrated, auto-blocking |
| Incident tracking | ✅ | All alerts tracked in Jira |

## 6. Incident Response

### Incident Response Plan

| Check | Status | Notes |
|-------|--------|-------|
| IR plan documented | ✅ | Last updated 2026-06-01 |
| IR team defined | ✅ | 5 members, 24/7 on-call |
| Contact list current | ✅ | Updated monthly |
| Escalation procedure | ✅ | Defined for all severity levels |
| Tabletop exercise | ✅ | Last: 2026-05-15, next: 2026-08-15 |
| Post-incident review | ✅ | Process defined, blameless |
| Communication plan | ✅ | Internal and external templates |

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
| Consent management | ✅ | CMP in place, audit logs |
| Data subject rights | ✅ | DSR portal, 30-day SLA |
| Data breach notification | ✅ | 72-hour notification procedure |
| Privacy by design | ✅ | Privacy review in design phase |
| Data Protection Officer | ✅ | DPO appointed, reports to board |

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

A security audit checklist covers seven domains: network security, application security, data protection, infrastructure security, monitoring, incident response, and compliance. Each domain has specific controls that can be verified through configuration review, log analysis, or testing.

Network security verifies that the network perimeter is defended. Firewalls must have a default deny policy with specific allow rules. Network segmentation isolates production, databases, and management networks. DDoS protection and DNS security defend against external attacks. Without these controls, attackers can reach internal services directly.

Application security verifies that the application defends against common attacks. Authentication must use MFA and strong password policies. Authorization must enforce least privilege. Input validation prevents injection attacks (SQL, XSS, CSRF, command, path traversal). Security headers add browser-level protections. Dependency scanning catches known vulnerabilities in third-party libraries.

Data protection verifies that data is encrypted and handled properly. Encryption must cover data in transit (TLS 1.2+) and at rest (AES-256). PII must be identified, tagged, and encrypted at the field level. Secrets must not be in source code — use a vault with automated rotation. Data retention and deletion must be enforced automatically.

Infrastructure security verifies cloud and server hardening. CIS benchmarks provide a baseline. No public S3 buckets, no public databases, minimal security groups. Kubernetes must enforce pod security standards, network policies, and RBAC. Servers must be hardened with key-only SSH, automatic updates, and host-based IDS.

Monitoring and logging verify that security events are captured and alerted. All log sources must feed into a SIEM. Correlation rules detect patterns across log sources. Alerting must be tuned to minimize false positives. Threat intelligence feeds enhance detection. Without monitoring, attacks go undetected.

Incident response verifies that the organization can respond to security incidents. An IR plan defines roles, escalation, and communication. Tabletop exercises test the plan. Metrics (MTTD, MTTR) measure effectiveness. Post-incident reviews identify improvements. Without an IR plan, incidents are chaotic and slow.

Compliance verifies that controls meet regulatory requirements. SOC 2, GDPR, and ISO 27001 each have specific controls. The checklist maps each control to evidence (policies, configurations, logs). This evidence is what auditors review during an external audit.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Startup | Focused checklist: auth, encryption, monitoring | Prioritize critical controls |
| Enterprise | Full checklist with all domains | Include compliance mapping |
| Healthcare | Add HIPAA controls | PHI handling, BAA agreements |
| Financial | Add PCI-DSS controls | Card data handling, network isolation |
| Cloud-native | Focus on cloud and K8s security | Less server hardening |
| Air-gapped | Focus on physical and network security | No external DDoS, no cloud controls |

## What Works

1. Automate checks where possible — CIS benchmarks, dependency scans, secret scanning
2. Review quarterly — security drift happens fast
3. Map controls to compliance frameworks — one audit covers multiple frameworks
4. Track metrics — MTTD and MTTR show if security is improving
5. Test incident response — untested plans fail under pressure
6. Document everything — auditors need evidence, not assertions
7. Prioritize by risk — fix critical findings before low findings

## Common Mistakes

1. Checklist too long — auditors can't complete it, checks get skipped
2. No automation — manual checks are inconsistent and slow
3. No follow-up — findings identified but not remediated
4. No evidence — controls claimed but not demonstrated
5. One-time audit — security changes, audits must be recurring
6. Scope too narrow — missing cloud, K8s, or application security
7. No risk rating — all findings treated equally, critical issues lost

## Frequently Asked Questions

### How often should we conduct security audits?

Internal audits should be quarterly. External compliance audits are typically annual. Critical infrastructure or high-risk environments may require monthly audits. The key is consistency: a quarterly audit catches drift before it becomes a problem. Annual-only audits leave 11 months of unmonitored changes.

### What is the difference between a security audit and a penetration test?

A security audit verifies that controls are in place and configured correctly — it's a configuration review. A penetration test attempts to bypass controls by simulating attacks — it's a control effectiveness test. Audits answer "are the controls there?" Penetration tests answer "do the controls work?" Both are needed.

### How do we prioritize audit findings?

Use a risk-based approach. Critical findings (exposed PII, unpatched critical vulnerabilities, no MFA) are fixed immediately. High findings (weak encryption, missing monitoring) are fixed within 30 days. Medium findings (missing documentation, stale access reviews) are fixed within 90 days. Low findings (minor hardening) are tracked and fixed opportunistically.

### Should we use automated security scanning tools?

Yes, for repetitive checks. Automated tools (CIS benchmarks, dependency scanners, secret scanners, container scanners) can run continuously in CI/CD. This frees auditors to focus on areas that require judgment: access reviews, policy compliance, incident response readiness. Automation catches configuration drift; humans catch design flaws.

### What evidence do auditors need?

Auditors need evidence that controls exist and operate effectively. Evidence includes: policy documents, configuration screenshots, log exports, access review records, incident reports, and test results. The checklist should reference where evidence is stored (wiki, ticketing system, SIEM) so auditors can find it quickly.
