---
contentType: docs
slug: security-incident-response-template
title: "Security Incident Response Template"
description: "A template for security incident response covering detection, classification, containment, eradication, recovery, communication, and post-incident review."
metaDescription: "Use this security incident response template to define detection, classification, containment, eradication, recovery, communication, and post-incident review."
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
  metaDescription: "Use this security incident response template to define detection, classification, containment, eradication, recovery, communication, and post-incident review."
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

A security incident response template provides a structured playbook for responding to security events. It covers detection, classification, containment, eradication, recovery, communication, and post-incident review. The template defines specific actions, decision points, and escalation criteria for each phase of the response.

## When to Use

- Responding to an active security incident
- Preparing incident response playbooks for different attack types
- Training incident response team members
- Conducting tabletop exercises
- Documenting incident response procedures for compliance

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
| Data Breach | Unauthorized access to or exfiltration of sensitive data | SEV-0 | CEO, CISO, Legal, PR |
| Malware / Ransomware | Malicious software on organization systems | SEV-0/SEV-1 | CISO, VP Eng, IT |
| Phishing | Deceptive attempts to obtain credentials or data | SEV-2 | Security Lead |
| DDoS Attack | Distributed denial of service | SEV-1 | DevOps, CISO |
| Unauthorized Access | Unauthorized entry to systems or data | SEV-1 | CISO, VP Eng |
| Insider Threat | Malicious activity by authorized personnel | SEV-1 | CISO, HR, Legal |
| Web Application Attack | Attack targeting web app vulnerabilities | SEV-1 | Security Lead, Dev Lead |
| API Abuse | Abuse or exploitation of API endpoints | SEV-2 | Security Lead, API Lead |
| Supply Chain Attack | Compromise via third-party vendor or dependency | SEV-0 | CEO, CISO, Legal |
| Physical Security | Unauthorized physical access to facilities | SEV-2 | Security, Facilities |

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
| WAF alert | SQL injection or XSS pattern matched | Auto-page on-call | 15 min |
| Endpoint EDR | Malware detected on workstation | Auto-page on-call | 15 min |
| User report | User reports suspicious email or activity | Help desk ticket | 1 hour |
| External report | Security researcher or vendor notification | Email to security@ | 4 hours |
| Threat intel feed | IOCs matched against internal traffic | SIEM auto-alert | 30 min |
| Cloud security alert | AWS GuardDuty / Azure Sentinel alert | Auto-page on-call | 15 min |

### Initial Assessment Checklist

| Check | Question | Action if Yes | Action if No |
|-------|----------|---------------|--------------|
| Is this a real security event? | Does the alert indicate actual malicious activity? | Classify incident type | Close as false positive |
| Is the threat active? | Is the attacker still in the system? | Begin containment | Investigate timeline |
| Is sensitive data involved? | Could PII, PHI, or financial data be exposed? | Notify Legal + CISO | Continue investigation |
| Is production affected? | Are production systems impacted? | Notify VP Engineering | Continue investigation |
| Is this a known attack pattern? | Has this attack type been seen before? | Apply known playbook | Investigate from scratch |

## 3. Containment Procedures

### Immediate Containment Actions

| Incident Type | Action | Command/Procedure | Approval | Duration |
|---------------|--------|-------------------|---------|----------|
| Data Breach | Isolate affected systems | `kubectl cordon <node>; kubectl drain <node>` | Tech Lead | 5 min |
| Data Breach | Block exfiltration IP | Update WAF / firewall rules | Tech Lead | 5 min |
| Malware | Isolate infected host | Network isolation via VLAN change | Tech Lead | 10 min |
| Malware | Disable affected user account | `aws iam update-access-key --status Inactive` | Tech Lead | 5 min |
| Ransomware | Disconnect affected shares | Disable SMB shares, isolate network segment | IC | 10 min |
| Phishing | Disable phishing URLs | Add URLs to blocklist, WAF rules | Tech Lead | 15 min |
| Phishing | Revoke compromised tokens | Force re-auth via IdP | Tech Lead | 10 min |
| DDoS | Enable DDoS protection | Enable AWS Shield Advanced / Cloudflare | DevOps | 5 min |
| DDoS | Rate limit incoming traffic | Update load balancer / WAF rules | DevOps | 10 min |
| Unauthorized Access | Revoke session tokens | Force logout via IdP admin API | Tech Lead | 5 min |
| Unauthorized Access | Reset compromised passwords | Force password reset via IdP | Tech Lead | 10 min |
| Insider Threat | Suspend user access | Disable AD account, revoke tokens | IC + HR | 15 min |
| Insider Threat | Preserve evidence | Capture disk image, memory dump | Tech Lead | 30 min |
| Web App Attack | Block attacking IP | WAF rule: deny IP | Tech Lead | 5 min |
| Web App Attack | Disable vulnerable endpoint | `kubectl scale deployment <name> --replicas=0` | IC | 5 min |
| API Abuse | Apply rate limiting | Update API gateway throttling rules | Tech Lead | 10 min |
| API Abuse | Revoke abused API keys | Delete or rotate API keys | Tech Lead | 10 min |
| Supply Chain | Disable affected dependency | Revert to previous version, pin dependency | DevOps | 30 min |
| Supply Chain | Revoke CI/CD credentials | Rotate all pipeline credentials | DevOps | 1 hour |

### Evidence Preservation

| Evidence Type | Collection Method | Storage | Retention |
|---------------|-------------------|---------|-----------|
| System logs | Export to secure bucket | S3 with legal hold | 7 years |
| Network traffic | PCAP capture | S3 with legal hold | 90 days |
| Disk image | `dd` or snapshot | Encrypted S3 | 7 years |
| Memory dump | Volatility / LiME | Encrypted S3 | 90 days |
| Application logs | Export from logging system | S3 with legal hold | 7 years |
| Access logs | Export from IdP / cloud | S3 with legal hold | 7 years |
| Communication records | Export emails, chat logs | S3 with legal hold | 7 years |

### Containment Decision Log

| Time | Decision | Rationale | Approved By | Impact |
|------|----------|-----------|-------------|--------|
| 14:05 | Isolated web-server-03 | Confirmed malware beaconing to C2 | Tech Lead | Web app offline |
| 14:10 | Blocked 185.220.101.5 | C2 IP from threat intel | Tech Lead | No impact |
| 14:15 | Disabled user jsmith | Account used for lateral movement | IC + HR | User locked out |
| 14:20 | Rotated all CI/CD tokens | Potential token exposure | DevOps | Pipeline paused |

## 4. Eradication Procedures

### Eradication Steps by Incident Type

| Incident Type | Step 1 | Step 2 | Step 3 | Step 4 |
|---------------|--------|--------|--------|--------|
| Data Breach | Identify entry point | Patch exploited vulnerability | Remove attacker tools/backdoors | Rotate all credentials |
| Malware | Run full anti-malware scan | Remove malicious files | Patch infection vector | Rebuild affected systems |
| Ransomware | Identify ransomware strain | Remove from all systems | Restore from clean backups | Patch infection vector |
| Phishing | Identify all phishing emails | Remove from mailboxes | Reset compromised credentials | Deploy email security rules |
| DDoS | Identify attack vector | Implement permanent DDoS protection | Optimize network configuration | Monitor for recurrence |
| Unauthorized Access | Identify access method | Close access vector | Audit all changes by attacker | Rotate all potentially exposed credentials |
| Insider Threat | Identify access scope | Revoke all access | Audit all actions taken | Coordinate with HR/Legal |
| Web App Attack | Identify exploited vulnerability | Deploy fix | Remove attacker web shells | Audit for persistence |
| API Abuse | Identify abused endpoint | Implement proper rate limiting | Audit API access logs | Rotate abused keys |
| Supply Chain | Identify compromised component | Replace with clean version | Audit all systems using component | Implement dependency scanning |

### Eradication Verification

| Check | Method | Pass Criteria | Responsible |
|-------|--------|---------------|-------------|
| No active malware | Full system scan with EDR | 0 threats detected | Security |
| No unauthorized access | Audit access logs | No anomalies in 72 hours | Security |
| No backdoors | Port scan + process audit | No unexpected services | Security |
| No C2 communication | Network traffic analysis | No beaconing detected | Security |
| Vulnerabilities patched | Re-scan affected systems | 0 critical/high findings | Security |
| Credentials rotated | Verify all credentials changed | All credentials updated | DevOps |
| Clean system state | Compare to known-good baseline | Matches baseline | DevOps |

## 5. Recovery Procedures

### Recovery Steps

| Step | Action | Verification | Duration | Approval |
|------|--------|--------------|----------|----------|
| 1 | Restore from clean backup | Backup integrity verified | 1-4 hours | IC |
| 2 | Rebuild affected systems | Configuration matches baseline | 2-12 hours | DevOps |
| 3 | Deploy patched versions | Smoke tests pass | 1-2 hours | Dev Lead |
| 4 | Gradual traffic restore | Health checks pass, monitoring normal | 30 min - 2 hours | IC |
| 5 | User communication | Users notified of restoration | 30 min | Comms Lead |
| 6 | Enhanced monitoring 72h | No anomalies detected | 72 hours | Security |
| 7 | Full service restoration | All services operational | After 72h clean | IC |

### Recovery Validation

| Check | Method | Pass Criteria | Responsible |
|-------|--------|---------------|-------------|
| All services online | Health check endpoints | 100% healthy | DevOps |
| Performance normal | Compare to baseline metrics | Within 10% of baseline | DevOps |
| No data loss | Data integrity check | All records intact | Database Lead |
| User access restored | Authentication test | All users can log in | DevOps |
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
| 1 | Schedule review meeting | IC | Within 5 days |
| 2 | Collect all evidence | Scribe | Before meeting |
| 3 | Write incident timeline | Scribe | Before meeting |
| 4 | Conduct blameless review | All stakeholders | 1-2 hours |
| 5 | Identify root cause | Technical Lead | During review |
| 6 | Define corrective actions | Team | During review |
| 7 | Assign action items | IC | During review |
| 8 | Publish post-mortem | Scribe | Within 2 weeks |
| 9 | Track action items | IC | Until completion |

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
| CA-001 | Patch RCE vulnerability across all servers | P0 | DevOps | 2026-06-17 | Open |
| CA-002 | Implement automated patch management | P1 | DevOps | 2026-07-01 | Open |
| CA-003 | Add WAF rule for attack pattern | P1 | Security | 2026-06-20 | Open |
| CA-004 | Update SIEM correlation rules | P2 | Security | 2026-06-30 | Open |
| CA-005 | Conduct security training for dev team | P2 | Security | 2026-07-15 | Open |
```

## Explanation

A security incident response template provides a structured playbook for responding to security events. It covers six phases: detection, classification, containment, eradication, recovery, and post-incident review. Each phase has specific actions, decision points, and escalation criteria.

Classification determines the response. A data breach involving PII triggers SEV-0 with full escalation including CEO, CISO, Legal, and PR. A phishing email targeting a single user is SEV-2 handled by the security team. The classification matrix uses data sensitivity, systems affected, user impact, and active exploitation status to determine severity.

Containment stops the bleeding. Immediate actions isolate affected systems, block attacker IPs, disable compromised accounts, and revoke active sessions. Each incident type has specific containment procedures — malware requires host isolation, DDoS requires traffic filtering, insider threats require discreet access revocation. Evidence preservation happens during containment — disk images, memory dumps, and log exports are captured before systems are rebuilt.

Eradication removes the threat completely. This involves identifying the entry point, patching exploited vulnerabilities, removing attacker tools and backdoors, and rotating all potentially exposed credentials. Each incident type has specific eradication steps. Verification confirms the threat is gone through full system scans, network traffic analysis, and configuration audits.

Recovery restores service to normal. Systems are rebuilt from clean backups, patched versions are deployed, traffic is gradually restored with health checks, and enhanced monitoring watches for recurrence for 72 hours. Recovery isn't complete until the system has been stable under enhanced monitoring.

Communication is critical during every phase. Internal stakeholders need regular updates — the IR team gets real-time technical updates, engineering gets status every 30 minutes, executives get business impact every hour. External communication follows regulatory requirements — GDPR requires 72-hour notification, HIPAA requires 60-day notification. Pre-approved templates speed up communication when time is critical.

Post-incident review is where learning happens. A blameless review identifies what happened, why it happened, and how to prevent it. The timeline documents every event and action. Corrective actions are assigned with owners and deadlines. The post-mortem is published so the organization can learn from the incident.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Small team | Simplified playbook, shared roles | 2-3 person IR team |
| Enterprise | Full playbook with dedicated SOC | 24/7 monitoring, automated response |
| Healthcare | Add HIPAA breach notification | 60-day notification, HHS reporting |
| Financial | Add PCI-DSS and regulatory notification | Card brand notification, state banking regulators |
| Cloud-native | Focus on cloud containment | Isolate VPC, revoke IAM roles, rotate cloud credentials |
| Retail | Add PCI-DSS response | Card data isolation, forensic investigation |
| Government | Add mandatory reporting | CISA notification (US), GCHQ (UK) |

## What Works

1. Classify early — severity drives the entire response
2. Contain before investigating — stop the bleeding first
3. Preserve evidence during containment — you can't forensically analyze a rebuilt system
4. Communicate frequently — silence breeds panic and rumors
5. Use pre-approved templates — save time during the incident
6. Conduct blameless post-incident reviews — focus on systems, not people
7. Track corrective actions to completion — lessons without action are wasted

## Common Mistakes

1. Investigating before containing — the attacker keeps operating while you investigate
2. Destroying evidence during containment — rebuilding systems before capturing images
3. No communication plan — stakeholders learn about incidents from external sources
4. No regulatory notification tracking — missing GDPR 72-hour deadline means fines
5. No post-incident review — the same incident repeats
6. Blame-focused reviews — people hide issues instead of reporting them
7. Corrective actions not tracked — identified but never implemented

## Frequently Asked Questions

### What is the difference between an incident response plan and an incident response template?

An incident response plan defines the overall framework: roles, responsibilities, severity levels, communication procedures, and escalation criteria. An incident response template is the operational playbook used during a specific incident. The plan says "the Technical Lead contains the threat." The template says "for malware, isolate the host using kubectl cordon, capture a disk image, then run a full EDR scan."

### When should we involve law enforcement?

For incidents involving criminal activity — ransomware, data theft, fraud, or organized attacks — contact law enforcement early. Preserve evidence before containing, as shutting down systems may destroy forensic evidence. Consult legal counsel before involving law enforcement, as there are implications for ongoing operations and customer notifications. The FBI (US), NCA (UK), or local cybercrime units handle these cases.

### How do we handle an incident that spans multiple jurisdictions?

Different jurisdictions have different notification requirements. GDPR applies to EU residents' data regardless of where the incident occurs. US state laws vary by state. HIPAA applies to US healthcare data. Work with legal counsel to map all applicable regulations and their notification deadlines. Track each notification separately — missing a deadline in one jurisdiction can result in fines even if you met deadlines in others.

### What should we do if the attacker contacts us directly?

Do not engage with the attacker without consulting legal counsel and law enforcement. Document all communications. If the attacker demands ransom, do not pay without legal and law enforcement guidance — paying ransoms may violate sanctions laws in some jurisdictions. Route all attacker communications through a designated channel monitored by the IR team and legal counsel.

### How long should we retain incident evidence?

Retain evidence for at least 7 years or as required by your compliance frameworks. GDPR requires records of personal data breaches. HIPAA requires breach documentation for 6 years. Litigation may require evidence retention for the duration of legal proceedings plus the statute of limitations. Store evidence in encrypted storage with legal hold to prevent accidental deletion.
