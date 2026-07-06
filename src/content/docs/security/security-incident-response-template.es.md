---
contentType: docs
slug: security-incident-response-template
title: "Plantilla de Respuesta a Incidentes de Seguridad"
description: "Una plantilla para respuesta a incidentes de seguridad cubriendo detección, clasificación, contención, erradicación, recuperación, comunicación y revisión post-incidente."
metaDescription: "Usá esta plantilla de respuesta a incidentes de seguridad para definir detección, clasificación, contención, erradicación, recuperación, comunicación y revisión."
difficulty: intermediate
topics:
  - testing
tags:
  - security
  - incident-response
  - template
  - playbook
  - containment
  - recovery
  - infrastructure
relatedResources:
  - /docs/security/incident-response-plan-template
  - /docs/security/security-audit-checklist
  - /docs/security/access-control-policy-template
  - /docs/security/vulnerability-management-process-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usá esta plantilla de respuesta a incidentes de seguridad para definir detección, clasificación, contención, erradicación, recuperación, comunicación y revisión."
  keywords:
    - security incident
    - incident response
    - playbook
    - template
    - containment
    - eradication
    - recovery
---

## Overview

Un security incident response template provee un structured playbook para responder a security events. Cubre detection, classification, containment, eradication, recovery, communication y post-incident review. El template define specific actions, decision points y escalation criteria para cada phase del response.

## When to Use

- Respondiendo a un active security incident
- Preparando incident response playbooks para different attack types
- Entrenando incident response team members
- Conductiendo tabletop exercises
- Documentando incident response procedures para compliance

## Solution

```markdown
# Security Incident Response Template — `<Organization Name>`

## Incident Metadata

| Field | Value |
|-------|-------|
| Incident ID | SEC-INC-2026-001 |
| Incident Type | <Data Breach / Malware / Phishing / DDoS / Insider / Unauthorized Access> |
| Severity | <SEV-0 / SEV-1 / SEV-2 / SEV-3> |
| Status | <Detected / Investigating / Contained / Eradicated / Recovered / Closed> |
| Detected | <YYYY-MM-DD HH:MM TZ> |
| Reported by | <name / system> |
| Incident Commander | <name> |
| Technical Lead | <name> |
| Affected systems | <list> |
| Affected users | <count or "unknown"> |
| Data involved | <type, classification, volume> |

## 1. Incident Classification

### Incident Type Matrix

| Type | Description | Default Severity | Escalation |
|------|-------------|------------------|------------|
| Data Breach | Unauthorized access a o exfiltration de sensitive data | SEV-0 | CEO, CISO, Legal, PR |
| Malware / Ransomware | Malicious software en organization systems | SEV-0/SEV-1 | CISO, VP Eng, IT |
| Phishing | Deceptive attempts para obtain credentials o data | SEV-2 | Security Lead |
| DDoS Attack | Distributed denial of service | SEV-1 | DevOps, CISO |
| Unauthorized Access | Unauthorized entry a systems o data | SEV-1 | CISO, VP Eng |
| Insider Threat | Malicious activity por authorized personnel | SEV-1 | CISO, HR, Legal |
| Web Application Attack | Attack targeting web app vulnerabilities | SEV-1 | Security Lead, Dev Lead |
| API Abuse | Abuse o exploitation de API endpoints | SEV-2 | Security Lead, API Lead |
| Supply Chain Attack | Compromise via third-party vendor o dependency | SEV-0 | CEO, CISO, Legal |
| Physical Security | Unauthorized physical access a facilities | SEV-2 | Security, Facilities |

### Severity Assessment

| Factor | SEV-0 (Critical) | SEV-1 (High) | SEV-2 (Medium) | SEV-3 (Low) |
|--------|------------------|--------------|----------------|-------------|
| Data sensitivity | PII/PHI/financial | Internal confidential | Internal non-sensitive | Public data |
| Systems affected | Production critical | Production non-critical | Staging | Development |
| Users affected | All users | Multiple teams | Single team | Single user |
| Active exploitation | Confirmed active | Likely active | Suspected | No evidence |
| Business impact | Total outage | Major degradation | Minor degradation | No impact |

## 2. Detection and Initial Assessment

### Detection Sources

| Source | Signal | Alert Method | Response Time |
|--------|--------|--------------|---------------|
| SIEM correlation | Multiple failed logins + successful login from new IP | Auto-page on-call | 15 min |
| IDS/IPS alert | Known attack signature detected | Auto-page on-call | 15 min |
| WAF alert | SQL injection o XSS pattern matched | Auto-page on-call | 15 min |
| Endpoint EDR | Malware detected on workstation | Auto-page on-call | 15 min |
| User report | User reports suspicious email o activity | Help desk ticket | 1 hour |
| External report | Security researcher o vendor notification | Email a security@ | 4 hours |
| Threat intel feed | IOCs matched contra internal traffic | SIEM auto-alert | 30 min |
| Cloud security alert | AWS GuardDuty / Azure Sentinel alert | Auto-page on-call | 15 min |

### Initial Assessment Checklist

| Check | Question | Action if Yes | Action if No |
|-------|----------|---------------|--------------|
| Es un real security event? | Indica el alert actual malicious activity? | Classificá incident type | Closeá como false positive |
| Está el threat active? | Está el attacker still en el system? | Empezá containment | Investigá timeline |
| Hay sensitive data involved? | Podría PII, PHI o financial data estar exposed? | Notifyá Legal + CISO | Continuá investigation |
| Está production affected? | Están production systems impacted? | Notifyá VP Engineering | Continuá investigation |
| Es un known attack pattern? | Se ha visto este attack type before? | Aplicá known playbook | Investigá from scratch |

## 3. Containment Procedures

### Immediate Containment Actions

| Incident Type | Action | Command/Procedure | Approval | Duration |
|---------------|--------|-------------------|---------|----------|
| Data Breach | Isolateá affected systems | `kubectl cordon <node>; kubectl drain <node>` | Tech Lead | 5 min |
| Data Breach | Blockeá exfiltration IP | Updateá WAF / firewall rules | Tech Lead | 5 min |
| Malware | Isolateá infected host | Network isolation via VLAN change | Tech Lead | 10 min |
| Malware | Disableá affected user account | `aws iam update-access-key --status Inactive` | Tech Lead | 5 min |
| Ransomware | Disconnectéa affected shares | Disableá SMB shares, isolateá network segment | IC | 10 min |
| Phishing | Disableá phishing URLs | Addé URLs a blocklist, WAF rules | Tech Lead | 15 min |
| Phishing | Revokeá compromised tokens | Forceá re-auth via IdP | Tech Lead | 10 min |
| DDoS | Enableá DDoS protection | Enableá AWS Shield Advanced / Cloudflare | DevOps | 5 min |
| DDoS | Rate limit incoming traffic | Updateá load balancer / WAF rules | DevOps | 10 min |
| Unauthorized Access | Revokeá session tokens | Forceá logout via IdP admin API | Tech Lead | 5 min |
| Unauthorized Access | Resetéa compromised passwords | Forceá password reset via IdP | Tech Lead | 10 min |
| Insider Threat | Suspendéa user access | Disableá AD account, revokeá tokens | IC + HR | 15 min |
| Insider Threat | Preserveá evidence | Captureá disk image, memory dump | Tech Lead | 30 min |
| Web App Attack | Blockeá attacking IP | WAF rule: deny IP | Tech Lead | 5 min |
| Web App Attack | Disableá vulnerable endpoint | `kubectl scale deployment <name> --replicas=0` | IC | 5 min |
| API Abuse | Aplicá rate limiting | Updateá API gateway throttling rules | Tech Lead | 10 min |
| API Abuse | Revokeá abused API keys | Deleteá o rotateá API keys | Tech Lead | 10 min |
| Supply Chain | Disableá affected dependency | Reverteá a previous version, pinéa dependency | DevOps | 30 min |
| Supply Chain | Revokeá CI/CD credentials | Rotateá all pipeline credentials | DevOps | 1 hour |

### Evidence Preservation

| Evidence Type | Collection Method | Storage | Retention |
|---------------|-------------------|---------|-----------|
| System logs | Exportá a secure bucket | S3 con legal hold | 7 years |
| Network traffic | PCAP capture | S3 con legal hold | 90 days |
| Disk image | `dd` o snapshot | Encrypted S3 | 7 years |
| Memory dump | Volatility / LiME | Encrypted S3 | 90 days |
| Application logs | Exportá from logging system | S3 con legal hold | 7 years |
| Access logs | Exportá from IdP / cloud | S3 con legal hold | 7 years |
| Communication records | Exportá emails, chat logs | S3 con legal hold | 7 years |

### Containment Decision Log

| Time | Decision | Rationale | Approved By | Impact |
|------|----------|-----------|-------------|--------|
| 14:05 | Isolated web-server-03 | Confirmed malware beaconing a C2 | Tech Lead | Web app offline |
| 14:10 | Blocked 185.220.101.5 | C2 IP from threat intel | Tech Lead | No impact |
| 14:15 | Disabled user jsmith | Account used para lateral movement | IC + HR | User locked out |
| 14:20 | Rotated all CI/CD tokens | Potential token exposure | DevOps | Pipeline paused |

## 4. Eradication Procedures

### Eradication Steps by Incident Type

| Incident Type | Step 1 | Step 2 | Step 3 | Step 4 |
|---------------|--------|--------|--------|--------|
| Data Breach | Identificá entry point | Patcheá exploited vulnerability | Removeá attacker tools/backdoors | Rotateá all credentials |
| Malware | Corré full anti-malware scan | Removeá malicious files | Patcheá infection vector | Rebuildeá affected systems |
| Ransomware | Identificá ransomware strain | Removeá from all systems | Restoreá from clean backups | Patcheá infection vector |
| Phishing | Identificá all phishing emails | Removeá from mailboxes | Resetéa compromised credentials | Deployéa email security rules |
| DDoS | Identificá attack vector | Implementá permanent DDoS protection | Optimizá network configuration | Monitoreá por recurrence |
| Unauthorized Access | Identificá access method | Closeá access vector | Auditá all changes by attacker | Rotateá all potentially exposed credentials |
| Insider Threat | Identificá access scope | Revokeá all access | Auditá all actions taken | Coordinateá con HR/Legal |
| Web App Attack | Identificá exploited vulnerability | Deployeá fix | Removeá attacker web shells | Auditá por persistence |
| API Abuse | Identificá abused endpoint | Implementá proper rate limiting | Auditá API access logs | Rotateá abused keys |
| Supply Chain | Identificá compromised component | Reemplazá con clean version | Auditá all systems usando component | Implementá dependency scanning |

### Eradication Verification

| Check | Method | Pass Criteria | Responsible |
|-------|--------|---------------|-------------|
| No active malware | Full system scan con EDR | 0 threats detected | Security |
| No unauthorized access | Audit access logs | No anomalies en 72 hours | Security |
| No backdoors | Port scan + process audit | No unexpected services | Security |
| No C2 communication | Network traffic analysis | No beaconing detected | Security |
| Vulnerabilities patched | Re-scan affected systems | 0 critical/high findings | Security |
| Credentials rotated | Verify all credentials changed | All credentials updated | DevOps |
| Clean system state | Compareá a known-good baseline | Matches baseline | DevOps |

## 5. Recovery Procedures

### Recovery Steps

| Step | Action | Verification | Duration | Approval |
|------|--------|--------------|----------|----------|
| 1 | Restoreá from clean backup | Backup integrity verified | 1-4 hours | IC |
| 2 | Rebuildeá affected systems | Configuration matches baseline | 2-12 hours | DevOps |
| 3 | Deployeá patched versions | Smoke tests pass | 1-2 hours | Dev Lead |
| 4 | Gradual traffic restore | Health checks pass, monitoring normal | 30 min - 2 hours | IC |
| 5 | User communication | Users notified de restoration | 30 min | Comms Lead |
| 6 | Enhanced monitoring 72h | No anomalies detected | 72 hours | Security |
| 7 | Full service restoration | All services operational | Después de 72h clean | IC |

### Recovery Validation

| Check | Method | Pass Criteria | Responsible |
|-------|--------|---------------|-------------|
| All services online | Health check endpoints | 100% healthy | DevOps |
| Performance normal | Compareá a baseline metrics | Within 10% de baseline | DevOps |
| No data loss | Data integrity check | All records intact | Database Lead |
| User access restored | Authentication test | All users pueden log in | DevOps |
| Monitoring active | Verify all alerts configured | All monitors active | Security |
| Backups current | Verify backup completed | Backup within 24 hours | DevOps |

## 6. Communication Plan

### Internal Communication

| Audience | Channel | Frequency | Content | Owner |
|----------|---------|-----------|---------|-------|
| IR Team | Slack incident channel | Real-time | Technical updates | Scribe |
| Engineering | Slack #incidents | Every 30 min | Status, impact | Comms Lead |
| All employees | Email | Every 2 hours | High-level status | Comms Lead |
| Executive team | Phone / Slack | Every 1 hour | Business impact, risk | IC |
| Board | Email via CEO | Within 24 hours | Summary, actions taken | CEO |

### External Communication

| Audience | Channel | Timing | Content | Approval |
|----------|---------|--------|---------|----------|
| Customers | Status page | Within 30 min | Service impact | IC + Comms |
| Customers | Email | Within 24 hours | Detailed notification | IC + Legal |
| Regulatory bodies | Official notification | Per regulation | Required disclosure | Legal |
| Law enforcement | Phone / email | If criminal activity | Incident report | Legal |
| Media | Press release | If publicly visible | Approved statement | CEO + Comms |

### Communication Templates

#### Initial Status Page

```
[INVESTIGATING] We are investigating a security incident affecting <service>.
Impact: <description of impact>.
Started: <timestamp>.
We are working to identify the cause and will update within 30 minutes.
```

#### Containment Update

```
[IDENTIFIED] We have identified the cause of the security incident and are implementing containment measures.
Cause: <brief description>.
Impact: <current impact>.
Next update: <time>.
```

#### Resolution Update

```
[RESOLVED] The security incident has been resolved.
Duration: <start> to <end>.
Root cause: <brief description>.
Actions taken: <summary>.
A detailed post-incident report will be published within 2 weeks.
```

## 7. Regulatory Notification

| Regulation | Deadline | Recipient | Trigger | Owner |
|------------|----------|-----------|---------|-------|
| GDPR | 72 hours | Supervisory authority | Personal data breach | Legal |
| GDPR | Without undue delay | Data subjects | High risk to rights | Legal |
| CCPA | Without unreasonable delay | Affected consumers | PII breach | Legal |
| HIPAA | 60 days | HHS Secretary | PHI breach (500+) | Legal |
| HIPAA | 60 days | Affected individuals | PHI breach | Legal |
| PCI-DSS | Immediately | Card brands / acquirer | Card data breach | Legal |
| SOC 2 | Per agreement | Clients | Security incident | Account Mgr |
| State laws | 1-90 days (varies) | State AG + residents | Per state law | Legal |

## 8. Post-Incident Review

### Review Process

| Step | Action | Responsible | Duration |
|------|--------|-------------|----------|
| 1 | Scheduleá review meeting | IC | Within 5 days |
| 2 | Collecteá all evidence | Scribe | Before meeting |
| 3 | Escribí incident timeline | Scribe | Before meeting |
| 4 | Conductí blameless review | All stakeholders | 1-2 hours |
| 5 | Identificá root cause | Technical Lead | During review |
| 6 | Definí corrective actions | Team | During review |
| 7 | Assigná action items | IC | During review |
| 8 | Publishá post-mortem | Scribe | Within 2 weeks |
| 9 | Trackeá action items | IC | Until completion |

### Incident Timeline Template

| Time | Event | Source | Action Taken |
|------|-------|--------|--------------|
| 14:00 | SIEM alert: brute force from 185.220.101.5 | SIEM | Auto-page on-call |
| 14:05 | On-call acknowledges alert | On-call | Begin investigation |
| 14:10 | Confirmed unauthorized access to web-server-03 | On-call | Classify as SEV-1 |
| 14:15 | Incident Commander assigned | IC | Create incident channel |
| 14:20 | Affected system isolated | Tech Lead | kubectl cordon + drain |
| 14:30 | Attacker IP blocked in WAF | Tech Lead | WAF rule update |
| 14:45 | Forensic image captured | Tech Lead | dd to encrypted S3 |
| 15:00 | Root cause: unpatched RCE vulnerability | Tech Lead | Document finding |
| 15:30 | Patch deployed to all systems | DevOps | kubectl rollout restart |
| 16:00 | Systems verified clean | Security | Full scan, 0 findings |
| 16:30 | Services restored | DevOps | Health checks pass |
| 17:00 | Enhanced monitoring activated | Security | 72-hour watch |

### Corrective Actions Template

| ID | Action | Priority | Owner | Due Date | Status |
|----|--------|----------|-------|----------|--------|
| CA-001 | Patchéa RCE vulnerability across all servers | P0 | DevOps | 2026-06-17 | Open |
| CA-002 | Implementá automated patch management | P1 | DevOps | 2026-07-01 | Open |
| CA-003 | Addeá WAF rule para attack pattern | P1 | Security | 2026-06-20 | Open |
| CA-004 | Updateá SIEM correlation rules | P2 | Security | 2026-06-30 | Open |
| CA-005 | Conductí security training para dev team | P2 | Security | 2026-07-15 | Open |
```

## Explanation

Un security incident response template provee un structured playbook para responder a security events. Cubre six phases: detection, classification, containment, eradication, recovery y post-incident review. Cada phase tiene specific actions, decision points y escalation criteria.

Classification determina el response. Un data breach involving PII triggerea SEV-0 con full escalation including CEO, CISO, Legal y PR. Un phishing email targeting un single user es SEV-2 handled por el security team. El classification matrix usa data sensitivity, systems affected, user impact y active exploitation status para determine severity.

Containment stop el bleeding. Immediate actions aíslan affected systems, blockean attacker IPs, disablean compromised accounts y revokean active sessions. Cada incident type tiene specific containment procedures — malware require host isolation, DDoS require traffic filtering, insider threats require discreet access revocation. Evidence preservation pasa durante containment — disk images, memory dumps y log exports se capturen antes de que systems se rebuildden.

Eradication remove el threat completamente. Esto involve identificar el entry point, patchear exploited vulnerabilities, remove attacker tools y backdoors y rotate all potentially exposed credentials. Cada incident type tiene specific eradication steps. Verification confirma que el threat se fue through full system scans, network traffic analysis y configuration audits.

Recovery restore service a normal. Systems se rebuildden desde clean backups, patched versions se deployean, traffic se gradually restore con health checks y enhanced monitoring watchea por recurrence por 72 hours. Recovery no es complete hasta que el system ha estado stable bajo enhanced monitoring.

Communication es critical durante every phase. Internal stakeholders necesitan regular updates — el IR team get real-time technical updates, engineering get status every 30 minutes, executives get business impact every hour. External communication sigue regulatory requirements — GDPR require 72-hour notification, HIPAA require 60-day notification. Pre-approved templates speedeup communication cuando time es critical.

Post-incident review es donde learning pasa. Un blameless review identify qué pasó, por qué pasó y cómo prevenirlo. El timeline documentea every event y action. Corrective actions se assignan con owners y deadlines. El post-mortem se publish para que el organization pueda learn del incident.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Small team | Simplified playbook, shared roles | 2-3 person IR team |
| Enterprise | Full playbook con dedicated SOC | 24/7 monitoring, automated response |
| Healthcare | Addeá HIPAA breach notification | 60-day notification, HHS reporting |
| Financial | Addeá PCI-DSS y regulatory notification | Card brand notification, state banking regulators |
| Cloud-native | Focus en cloud containment | Isolateá VPC, revokeá IAM roles, rotateá cloud credentials |
| Retail | Addeá PCI-DSS response | Card data isolation, forensic investigation |
| Government | Addeá mandatory reporting | CISA notification (US), GCHQ (UK) |

## What Works

1. Classificá early — severity drivea el entire response
2. Containé antes de investigar — stop el bleeding first
3. Preserveá evidence durante containment — no podés forensically analyze un rebuilt system
4. Communicateá frequently — silence breed panic y rumors
5. Usá pre-approved templates — save time durante el incident
6. Conductí blameless post-incident reviews — focus en systems, no people
7. Trackeá corrective actions a completion — lessons sin action son wasted

## Common Mistakes

1. Investigar antes de contener — el attacker sigue operating mientras investigás
2. Destroy evidence durante containment — rebuildding systems antes de capturar images
3. No communication plan — stakeholders learn sobre incidents desde external sources
4. No regulatory notification tracking — missing GDPR 72-hour deadline significa fines
5. No post-incident review — el same incident se repite
6. Blame-focused reviews — people hide issues en vez de reportearlos
7. Corrective actions no tracked — identified pero nunca implemented

## Frequently Asked Questions

### ¿Cuál es la difference entre un incident response plan y un incident response template?

Un incident response plan define el overall framework: roles, responsibilities, severity levels, communication procedures y escalation criteria. Un incident response template es el operational playbook usado durante un specific incident. El plan dice "el Technical Lead containea el threat." El template dice "para malware, isolateá el host usando kubectl cordon, captureá un disk image, luego corré un full EDR scan."

### ¿Cuándo deberíamos involve law enforcement?

Para incidents involving criminal activity — ransomware, data theft, fraud o organized attacks — contacteá law enforcement early. Preserveá evidence antes de contain, ya que shuttear systems puede destroy forensic evidence. Consultá legal counsel antes de involve law enforcement, ya que hay implications para ongoing operations y customer notifications. El FBI (US), NCA (UK) o local cybercrime units handle estos cases.

### ¿Cómo handleamos un incident que spannea multiple jurisdictions?

Different jurisdictions tienen different notification requirements. GDPR apply a EU residents' data regardless de dónde el incident occurred. US state laws varían por state. HIPAA apply a US healthcare data. Trabajá con legal counsel para mapear all applicable regulations y sus notification deadlines. Trackeá cada notification separately — missing un deadline en un jurisdiction puede result en fines incluso si meet deadlines en otros.

### ¿Qué deberíamos hacer si el attacker nos contacta directly?

No engaged con el attacker sin consultar legal counsel y law enforcement. Documentá all communications. Si el attacker demanda ransom, no pagues sin legal y law enforcement guidance — paying ransoms puede violate sanctions laws en some jurisdictions. Routeá all attacker communications through un designated channel monitored por el IR team y legal counsel.

### ¿Por cuánto deberíamos retain incident evidence?

Retain evidence por at least 7 years o como required por tu compliance frameworks. GDPR require records de personal data breaches. HIPAA require breach documentation por 6 years. Litigation puede require evidence retention por el duration de legal proceedings plus el statute de limitations. Storeá evidence en encrypted storage con legal hold para prevenir accidental deletion.
